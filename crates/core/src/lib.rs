pub mod production {
    use another_dimension_crypto::production::NoisePrekeyBundle;
    use another_dimension_crypto::CryptoError;
    use another_dimension_identity::{PairwisePublicKeyScheme, PairwiseSignatureScheme};
    use another_dimension_pairing::{transcript, PairingError, PairingPayload};
    use sha2::{Digest, Sha256};

    const CANONICAL_DIALER_DOMAIN: &[u8] = b"AD-SESSION-CANONICAL-DIALER-V1";

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionSessionPlan {
        pub safety_transcript: String,
        pub local_role: SessionRole,
        pub canonical_dialer_public_key: String,
        pub local_noise_static_public_key: Vec<u8>,
        pub remote_noise_static_public_key: Vec<u8>,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionRole {
        CanonicalDialer,
        Responder,
    }

    #[derive(Debug, Eq, PartialEq)]
    pub enum ProductionSessionError {
        Pairing(PairingError),
        Crypto(CryptoError),
        NonProductionPairingPayload,
        SamePairwiseIdentity,
    }

    impl From<PairingError> for ProductionSessionError {
        fn from(value: PairingError) -> Self {
            Self::Pairing(value)
        }
    }

    impl From<CryptoError> for ProductionSessionError {
        fn from(value: CryptoError) -> Self {
            Self::Crypto(value)
        }
    }

    pub fn plan_session_from_verified_pairing_payloads(
        local: &PairingPayload,
        remote: &PairingPayload,
    ) -> Result<ProductionSessionPlan, ProductionSessionError> {
        require_verified_production_payload(local)?;
        require_verified_production_payload(remote)?;
        if local.pairwise_public_key == remote.pairwise_public_key {
            return Err(ProductionSessionError::SamePairwiseIdentity);
        }
        let local_prekey = NoisePrekeyBundle::decode(&local.prekey_bundle)?;
        let remote_prekey = NoisePrekeyBundle::decode(&remote.prekey_bundle)?;
        let safety_transcript = transcript(local, remote)?;
        let local_rank = canonical_dialer_rank(local);
        let remote_rank = canonical_dialer_rank(remote);
        let local_role = if local_rank < remote_rank {
            SessionRole::CanonicalDialer
        } else {
            SessionRole::Responder
        };
        let canonical_dialer_public_key = match local_role {
            SessionRole::CanonicalDialer => local.pairwise_public_key.as_str(),
            SessionRole::Responder => remote.pairwise_public_key.as_str(),
        }
        .to_string();
        Ok(ProductionSessionPlan {
            safety_transcript,
            local_role,
            canonical_dialer_public_key,
            local_noise_static_public_key: local_prekey.public_key().to_vec(),
            remote_noise_static_public_key: remote_prekey.public_key().to_vec(),
        })
    }

    fn require_verified_production_payload(
        payload: &PairingPayload,
    ) -> Result<(), ProductionSessionError> {
        if payload.pairwise_public_key.scheme().ok()
            != Some(PairwisePublicKeyScheme::Ed25519DalekV2)
            || payload.pairwise_signature.scheme().ok()
                != Some(PairwiseSignatureScheme::Ed25519DalekV2)
        {
            return Err(ProductionSessionError::NonProductionPairingPayload);
        }
        let encoded = payload.encode()?;
        let decoded = PairingPayload::decode(&encoded)?;
        if decoded != *payload {
            return Err(ProductionSessionError::Pairing(
                PairingError::InvalidPayload,
            ));
        }
        Ok(())
    }

    fn canonical_dialer_rank(payload: &PairingPayload) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(CANONICAL_DIALER_DOMAIN);
        hasher.update([0]);
        hasher.update(payload.pairwise_public_key.as_str().as_bytes());
        hasher.finalize().into()
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use another_dimension_crypto::production::generate_noise_static_keypair;
        use another_dimension_identity::{
            PairwisePublicKey, PairwiseSignature, ProductionPairwisePrivateKey, ProfileName,
        };
        use another_dimension_pairing::{
            production_pairing_payload_for, ProductionPairingPayloadParams, DEFAULT_TTL_SECONDS,
        };

        #[test]
        fn production_session_plan_is_order_stable() {
            let alice_prekey = noise_prekey_bundle();
            let bob_prekey = noise_prekey_bundle();
            let alice = production_payload("alice", [51_u8; 32], "alice.onion", &alice_prekey);
            let bob = production_payload("bob", [52_u8; 32], "bob.onion", &bob_prekey);

            let alice_view =
                plan_session_from_verified_pairing_payloads(&alice, &bob).expect("session plan");
            let bob_view =
                plan_session_from_verified_pairing_payloads(&bob, &alice).expect("session plan");

            assert_eq!(alice_view.safety_transcript, bob_view.safety_transcript);
            assert_eq!(
                alice_view.canonical_dialer_public_key,
                bob_view.canonical_dialer_public_key
            );
            assert_ne!(alice_view.local_role, bob_view.local_role);
            assert_eq!(
                alice_view.local_noise_static_public_key,
                bob_view.remote_noise_static_public_key
            );
            assert_eq!(
                alice_view.remote_noise_static_public_key,
                bob_view.local_noise_static_public_key
            );
        }

        #[test]
        fn production_session_plan_rejects_non_production_payload() {
            let alice =
                production_payload("alice", [51_u8; 32], "alice.onion", &noise_prekey_bundle());
            let dev_like = PairingPayload {
                owner_profile: ProfileName::new("bob").expect("valid profile"),
                pairing_nonce: "nonce".to_string(),
                pairwise_public_key: PairwisePublicKey::new("dev-pub-bob")
                    .expect("valid public key"),
                pairwise_signature: PairwiseSignature::new("dev-sign-v1-bob")
                    .expect("valid signature"),
                rendezvous_endpoint: "bob.onion".to_string(),
                endpoint_rotation_policy: "manual-v1".to_string(),
                protocol_capabilities: "prototype-production-pairing-v1".to_string(),
                prekey_bundle: noise_prekey_bundle(),
                issued_at_local_ms: 1_000,
                ttl_seconds: DEFAULT_TTL_SECONDS,
            };

            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &dev_like),
                Err(ProductionSessionError::NonProductionPairingPayload)
            );
        }

        #[test]
        fn production_session_plan_rejects_tampered_payload() {
            let alice =
                production_payload("alice", [51_u8; 32], "alice.onion", &noise_prekey_bundle());
            let mut bob =
                production_payload("bob", [52_u8; 32], "bob.onion", &noise_prekey_bundle());
            bob.rendezvous_endpoint = "bob-rotated.onion".to_string();

            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &bob),
                Err(ProductionSessionError::Pairing(
                    PairingError::InvalidPayload
                ))
            );
        }

        #[test]
        fn production_session_plan_rejects_invalid_noise_prekey_bundle() {
            let alice =
                production_payload("alice", [51_u8; 32], "alice.onion", &noise_prekey_bundle());
            let bob = production_payload("bob", [52_u8; 32], "bob.onion", "not-a-noise-prekey");

            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &bob),
                Err(ProductionSessionError::Crypto(
                    CryptoError::InvalidNoisePrekeyBundle
                ))
            );
        }

        fn noise_prekey_bundle() -> String {
            generate_noise_static_keypair()
                .expect("noise static key")
                .prekey_bundle()
                .expect("prekey bundle")
                .encode()
        }

        fn production_payload(
            owner: &str,
            seed: [u8; 32],
            endpoint: &str,
            prekey: &str,
        ) -> PairingPayload {
            let private_key =
                ProductionPairwisePrivateKey::from_ed25519_dalek_seed(seed).expect("valid seed");
            production_pairing_payload_for(
                &ProfileName::new(owner).expect("valid profile"),
                &private_key,
                ProductionPairingPayloadParams {
                    pairing_nonce: format!("{owner}-nonce"),
                    rendezvous_endpoint: endpoint.to_string(),
                    endpoint_rotation_policy: "manual-v1".to_string(),
                    protocol_capabilities: "prototype-production-pairing-v1".to_string(),
                    prekey_bundle: prekey.to_string(),
                    issued_at_local_ms: 1_000,
                    ttl_seconds: DEFAULT_TTL_SECONDS,
                },
            )
            .expect("payload signs")
        }
    }
}

#[cfg(feature = "dev-insecure")]
pub mod dev_insecure {
    use another_dimension_crypto::dev_insecure::FakeCryptoSession;
    use another_dimension_crypto::CryptoSession;
    use another_dimension_identity::{ContactId, ProfileName};
    use another_dimension_pairing::{
        dev_pairing_material_for, transcript, PairingPayload, PendingContact,
    };
    use another_dimension_protocol::{Envelope, MessageType, ProtocolError};
    use another_dimension_storage::dev_insecure::DevFileStore;
    use another_dimension_storage::{StorageError, Store};
    use another_dimension_transport::dev_insecure::DevFileTransport;
    use another_dimension_transport::{Transport, TransportError};
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    const REPLAY_WINDOW_SIZE: u64 = 128;

    #[derive(Clone, Debug)]
    pub struct DevApp {
        store: DevFileStore,
        transport: DevFileTransport,
        crypto: FakeCryptoSession,
    }

    impl DevApp {
        pub fn new(root: impl Into<PathBuf>) -> Self {
            let store = DevFileStore::new(root);
            let transport = DevFileTransport::new(store.clone());
            Self {
                store,
                transport,
                crypto: FakeCryptoSession,
            }
        }

        pub fn init_profile(&self, profile: ProfileName) -> Result<String, CoreError> {
            self.store.create_profile(&profile)?;
            Ok(format!("profile initialized: {profile}"))
        }

        pub fn pairing_start(&self, profile: ProfileName) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            let (payload, private_key) = dev_pairing_material_for(&profile);
            self.store
                .save_own_pairing_material(&profile, &payload, &private_key)?;
            payload.encode().map_err(CoreError::from)
        }

        pub fn pairing_scan(
            &self,
            profile: ProfileName,
            remote_payload: PairingPayload,
        ) -> Result<ScanResult, CoreError> {
            self.require_profile(&profile)?;
            if remote_payload.is_expired_at(now_ms()) {
                return Err(CoreError::Pairing(
                    another_dimension_pairing::PairingError::ExpiredPayload,
                ));
            }
            let contact_id = remote_payload.contact_id()?;
            if self.store.pending_contact_exists(&profile, &contact_id) {
                return Err(CoreError::PairingAlreadyPending(contact_id.to_string()));
            }
            if self.store.contact_exists(&profile, &contact_id) {
                return Err(CoreError::ContactAlreadyActive(contact_id.to_string()));
            }
            let local_payload = match self.store.latest_own_pairing(&profile) {
                Ok(payload) => payload,
                Err(_) => {
                    let (payload, private_key) = dev_pairing_material_for(&profile);
                    self.store
                        .save_own_pairing_material(&profile, &payload, &private_key)?;
                    payload
                }
            };
            let safety_transcript = transcript(&local_payload, &remote_payload)?;
            let safety = self.crypto.derive_safety_material(&safety_transcript);
            let pending = PendingContact {
                contact_id: contact_id.clone(),
                local_payload: local_payload.clone(),
                remote_payload,
                safety_number: safety.number.clone(),
                safety_phrase: safety.phrase.clone(),
            };
            self.store.save_pending_contact(&pending)?;
            Ok(ScanResult {
                response_payload: local_payload.encode().map_err(CoreError::from)?,
                contact_id,
                safety_number: safety.number,
                safety_phrase: safety.phrase,
            })
        }

        pub fn pairing_confirm(
            &self,
            profile: ProfileName,
            contact: ContactId,
        ) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            self.store.activate_contact(&profile, &contact)?;
            Ok(format!("contact activated: {contact}"))
        }

        pub fn pairing_cancel(
            &self,
            profile: ProfileName,
            contact: ContactId,
        ) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            let removed = self.store.remove_pending_contact(&profile, &contact)?;
            if removed {
                Ok(format!("pending pairing cancelled: {contact}"))
            } else {
                Ok(format!("pending pairing not found: {contact}"))
            }
        }

        pub fn pairing_expire(&self, profile: ProfileName) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            let count = self.expire_pending_pairings_at(&profile, now_ms())?;
            Ok(format!("expired pending pairings: {count}"))
        }

        pub fn message_send(
            &self,
            sender: ProfileName,
            contact: ContactId,
            plaintext: String,
        ) -> Result<String, CoreError> {
            self.require_profile(&sender)?;
            if !self.store.contact_exists(&sender, &contact) {
                return Err(CoreError::ContactNotActive(contact.to_string()));
            }
            let recipient =
                ProfileName::new(contact.as_str()).map_err(|_| CoreError::InvalidInput)?;
            let envelope = Envelope {
                protocol_version: 1,
                channel_id: format!("dev-channel-{}-{}", sender, contact),
                message_number: now_ms() as u64,
                message_type: MessageType::Data,
                padded_ciphertext: self.crypto.encrypt(&plaintext)?,
            };
            self.transport.send_envelope(&recipient, &envelope)?;
            Ok(format!(
                "queued envelope for {recipient}: {} bytes",
                envelope.padded_ciphertext.len()
            ))
        }

        pub fn message_receive(&self, profile: ProfileName) -> Result<Vec<String>, CoreError> {
            self.require_profile(&profile)?;
            let envelopes = self.store.load_inbox_envelopes(&profile)?;
            let mut messages = Vec::new();
            for envelope in envelopes {
                let mut replay_window = self.store.load_replay_window(
                    &profile,
                    &envelope.channel_id,
                    REPLAY_WINDOW_SIZE,
                )?;
                match replay_window.accept(envelope.message_number) {
                    Ok(()) => {
                        self.store.save_replay_window(
                            &profile,
                            &envelope.channel_id,
                            &replay_window,
                        )?;
                        messages.push(self.crypto.decrypt(&envelope.padded_ciphertext)?);
                    }
                    Err(ProtocolError::ReplayMessage | ProtocolError::OldMessage) => {}
                    Err(error) => return Err(CoreError::Protocol(error)),
                }
            }
            Ok(messages)
        }

        pub fn message_expire(&self, profile: ProfileName) -> Result<String, CoreError> {
            self.require_profile(&profile)?;
            let count = self.store.clear_inbox(&profile)?;
            Ok(format!("expired envelopes: {count}"))
        }

        fn require_profile(&self, profile: &ProfileName) -> Result<(), CoreError> {
            if self.store.profile_exists(profile) {
                Ok(())
            } else {
                Err(CoreError::ProfileMissing(profile.to_string()))
            }
        }

        fn expire_pending_pairings_at(
            &self,
            profile: &ProfileName,
            observed_at_local_ms: u128,
        ) -> Result<usize, CoreError> {
            let pending_contacts = self.store.load_pending_contacts(profile)?;
            let mut count = 0;
            for pending in pending_contacts {
                let is_expired = pending.local_payload.is_expired_at(observed_at_local_ms)
                    || pending.remote_payload.is_expired_at(observed_at_local_ms);
                if is_expired
                    && self
                        .store
                        .remove_pending_contact(profile, &pending.contact_id)?
                {
                    count += 1;
                }
            }
            Ok(count)
        }
    }

    #[derive(Clone, Debug)]
    pub struct ScanResult {
        pub response_payload: String,
        pub contact_id: ContactId,
        pub safety_number: String,
        pub safety_phrase: String,
    }

    #[derive(Debug)]
    pub enum CoreError {
        Storage(StorageError),
        Transport(TransportError),
        Crypto(another_dimension_crypto::CryptoError),
        Pairing(another_dimension_pairing::PairingError),
        Protocol(ProtocolError),
        ProfileMissing(String),
        ContactNotActive(String),
        PairingAlreadyPending(String),
        ContactAlreadyActive(String),
        InvalidInput,
    }

    impl From<StorageError> for CoreError {
        fn from(value: StorageError) -> Self {
            Self::Storage(value)
        }
    }

    impl From<TransportError> for CoreError {
        fn from(value: TransportError) -> Self {
            Self::Transport(value)
        }
    }

    impl From<another_dimension_crypto::CryptoError> for CoreError {
        fn from(value: another_dimension_crypto::CryptoError) -> Self {
            Self::Crypto(value)
        }
    }

    impl From<another_dimension_pairing::PairingError> for CoreError {
        fn from(value: another_dimension_pairing::PairingError) -> Self {
            Self::Pairing(value)
        }
    }

    impl From<ProtocolError> for CoreError {
        fn from(value: ProtocolError) -> Self {
            Self::Protocol(value)
        }
    }

    fn now_ms() -> u128 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::fs;
        use std::path::Path;

        #[test]
        fn same_machine_pairing_requires_confirmation_before_send() {
            let root = temp_root("pairing_requires_confirmation");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");
            let alice_contact = ContactId::new("alice").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");

            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let alice_nonce = alice_payload.pairing_nonce.clone();
            assert!(app.store.own_pairing_material_exists(&alice, &alice_nonce));
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            assert!(app.store.own_pairing_material_exists(&alice, &alice_nonce));
            let alice_scan = app
                .pairing_scan(alice.clone(), bob_payload)
                .expect("alice scans bob");
            assert!(!app.store.own_pairing_material_exists(&alice, &alice_nonce));

            assert_eq!(alice_scan.safety_number, bob_scan.safety_number);
            assert!(matches!(
                app.message_send(alice.clone(), bob_contact.clone(), "blocked".to_string()),
                Err(CoreError::ContactNotActive(contact)) if contact == "bob"
            ));

            app.pairing_confirm(alice.clone(), bob_contact.clone())
                .expect("alice confirms bob");
            app.pairing_confirm(bob.clone(), alice_contact)
                .expect("bob confirms alice");
            let send_result = app
                .message_send(alice, bob_contact, "hello after confirm".to_string())
                .expect("send after confirm");

            assert!(send_result.contains("256 bytes"));
            let messages = app.message_receive(bob.clone()).expect("bob receives");
            assert_eq!(messages, vec!["hello after confirm".to_string()]);
            let replayed_messages = app.message_receive(bob).expect("bob receives again");
            assert!(replayed_messages.is_empty());
            assert!(!tree_contains(&root, "hello after confirm"));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn expired_pairing_payload_is_rejected() {
            let root = temp_root("expired_pairing_payload");
            let app = DevApp::new(&root);
            let bob = ProfileName::new("bob").expect("valid profile");
            app.init_profile(bob.clone()).expect("bob profile");

            let expired_payload = PairingPayload {
                owner_profile: ProfileName::new("alice").expect("valid profile"),
                pairing_nonce: "expired".to_string(),
                pairwise_public_key: another_dimension_identity::PairwisePublicKey::new(
                    "alice-pub",
                )
                .expect("valid public key"),
                pairwise_signature: another_dimension_identity::PairwiseSignature::new(
                    "unsigned-test-signature",
                )
                .expect("valid signature"),
                rendezvous_endpoint: "alice.onion".to_string(),
                endpoint_rotation_policy: "manual-v1".to_string(),
                protocol_capabilities: "prototype".to_string(),
                prekey_bundle: "PendingCryptoDesign".to_string(),
                issued_at_local_ms: 1,
                ttl_seconds: 1,
            };

            assert!(matches!(
                app.pairing_scan(bob, expired_payload),
                Err(CoreError::Pairing(
                    another_dimension_pairing::PairingError::ExpiredPayload
                ))
            ));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn cancelled_pending_pairing_cannot_be_confirmed() {
            let root = temp_root("cancelled_pending_pairing");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");
            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            app.pairing_scan(alice.clone(), bob_payload)
                .expect("alice scans bob");

            assert!(app.store.pending_contact_exists(&alice, &bob_contact));
            assert!(app.store.pending_key_exists(&alice, &bob_contact));
            app.pairing_cancel(alice.clone(), bob_contact.clone())
                .expect("cancel pending");
            assert!(!app.store.pending_contact_exists(&alice, &bob_contact));
            assert!(!app.store.pending_key_exists(&alice, &bob_contact));
            assert!(matches!(
                app.pairing_confirm(alice, bob_contact),
                Err(CoreError::Storage(_))
            ));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn confirmed_pairing_moves_pending_key_to_contact_key() {
            let root = temp_root("confirmed_pairing_moves_key");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");
            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            app.pairing_scan(alice.clone(), bob_payload)
                .expect("alice scans bob");

            assert!(app.store.pending_key_exists(&alice, &bob_contact));
            assert!(!app.store.contact_key_exists(&alice, &bob_contact));
            app.pairing_confirm(alice.clone(), bob_contact.clone())
                .expect("confirm pending");

            assert!(!app.store.pending_key_exists(&alice, &bob_contact));
            assert!(app.store.contact_key_exists(&alice, &bob_contact));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn expired_pending_pairing_cleanup_removes_record_and_key() {
            let root = temp_root("expired_pending_pairing_cleanup");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.pairing_start(alice.clone())
                .expect("alice pairing payload");
            let local_payload = app
                .store
                .latest_own_pairing(&alice)
                .expect("latest own pairing");
            let (mut remote_payload, remote_private_key) = dev_pairing_material_for(&bob);
            remote_payload.issued_at_local_ms = 1;
            remote_payload.ttl_seconds = 1;
            let remote_identity = another_dimension_identity::PairwiseIdentity::new(
                remote_payload.pairwise_public_key.clone(),
                remote_private_key,
            )
            .expect("valid identity");
            remote_payload.pairwise_signature = remote_identity.sign_pairing_payload(
                &remote_payload.canonical_bytes().expect("canonical payload"),
            );
            let pending = PendingContact {
                contact_id: bob_contact.clone(),
                local_payload,
                remote_payload,
                safety_number: "000 000 000 000".to_string(),
                safety_phrase: "river-river-river".to_string(),
            };
            app.store
                .save_pending_contact(&pending)
                .expect("save pending");

            assert!(app.store.pending_contact_exists(&alice, &bob_contact));
            assert!(app.store.pending_key_exists(&alice, &bob_contact));
            let count = app
                .expire_pending_pairings_at(&alice, 2_001)
                .expect("expire pending");

            assert_eq!(count, 1);
            assert!(!app.store.pending_contact_exists(&alice, &bob_contact));
            assert!(!app.store.pending_key_exists(&alice, &bob_contact));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn rescanning_pending_contact_does_not_create_new_pairing_material() {
            let root = temp_root("rescanning_pending_contact");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");
            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            app.pairing_scan(alice.clone(), bob_payload.clone())
                .expect("alice scans bob");

            assert!(app.store.pending_key_exists(&alice, &bob_contact));
            assert!(matches!(
                app.pairing_scan(alice, bob_payload),
                Err(CoreError::PairingAlreadyPending(contact)) if contact == "bob"
            ));

            let _ = fs::remove_dir_all(root);
        }

        #[test]
        fn rescanning_active_contact_is_rejected() {
            let root = temp_root("rescanning_active_contact");
            let app = DevApp::new(&root);
            let alice = ProfileName::new("alice").expect("valid profile");
            let bob = ProfileName::new("bob").expect("valid profile");
            let bob_contact = ContactId::new("bob").expect("valid contact");

            app.init_profile(alice.clone()).expect("alice profile");
            app.init_profile(bob.clone()).expect("bob profile");
            let alice_payload = PairingPayload::decode(
                &app.pairing_start(alice.clone())
                    .expect("alice pairing payload"),
            )
            .expect("valid alice payload");
            let bob_scan = app
                .pairing_scan(bob.clone(), alice_payload)
                .expect("bob scans alice");
            let bob_payload =
                PairingPayload::decode(&bob_scan.response_payload).expect("valid bob payload");
            app.pairing_scan(alice.clone(), bob_payload.clone())
                .expect("alice scans bob");
            app.pairing_confirm(alice.clone(), bob_contact)
                .expect("alice confirms bob");

            assert!(matches!(
                app.pairing_scan(alice, bob_payload),
                Err(CoreError::ContactAlreadyActive(contact)) if contact == "bob"
            ));

            let _ = fs::remove_dir_all(root);
        }

        fn temp_root(label: &str) -> PathBuf {
            let root = std::env::temp_dir().join(format!(
                "another-dimension-{label}-{}",
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|duration| duration.as_nanos())
                    .unwrap_or_default()
            ));
            let _ = fs::remove_dir_all(&root);
            root
        }

        fn tree_contains(root: &Path, needle: &str) -> bool {
            let Ok(entries) = fs::read_dir(root) else {
                return false;
            };
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if tree_contains(&path, needle) {
                        return true;
                    }
                } else if fs::read_to_string(&path)
                    .map(|content| content.contains(needle))
                    .unwrap_or(false)
                {
                    return true;
                }
            }
            false
        }
    }
}
