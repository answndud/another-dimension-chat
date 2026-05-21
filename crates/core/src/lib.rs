pub mod production {
    use another_dimension_crypto::production::{
        establish_noise_xx_transport_pair, generate_noise_static_keypair,
        run_noise_xx_handshake_smoke, NoisePrekeyBundle, NoiseStaticKeypair, NoiseTransportPair,
    };
    use another_dimension_crypto::CryptoError;
    use another_dimension_identity::{
        ContactId, PairwisePublicKeyScheme, PairwiseSignatureScheme, ProfileName,
    };
    use another_dimension_pairing::{
        production_pairing_draft_with_defaults, transcript, PairingError, PairingPayload,
        ProductionPairingDraft,
    };
    use another_dimension_protocol::{
        encode_hex, Envelope, MessageType, ProtocolError, ReplayWindow,
    };
    use another_dimension_storage::production::{
        production_message_storage_boundary_summary, protection_for,
        require_encrypted_record_allowed, require_persistence_allowed, EncryptedRecord,
        EncryptedRecordId, EncryptedRecordScope, ProductionRecordKind, ProductionStorageError,
        ProductionStoragePolicyError, ReplayRollbackProtection, SqlCipherRecordStore,
        StorageProtection,
    };
    use another_dimension_transport::{
        EncryptedEndpointUpdateControlEnvelope, EndpointLifecycleError,
        EndpointUpdateControlPlaintext, OnionEnvelopeTransport, OnionServiceEndpoint,
        PairwiseEndpointUpdate, PairwiseRendezvousEndpoint, RendezvousEndpointIdentityBinding,
        RendezvousEndpointScope, TransportKind, TransportRoute,
    };
    use sha2::{Digest, Sha256};

    const CANONICAL_DIALER_DOMAIN: &[u8] = b"AD-SESSION-CANONICAL-DIALER-V1";
    const PRODUCTION_CHANNEL_DOMAIN: &[u8] = b"AD-PRODUCTION-CHANNEL-V1";
    const PRODUCTION_REPLAY_RECORD_DOMAIN: &[u8] = b"AD-PRODUCTION-REPLAY-RECORD-V1";
    const PRODUCTION_ENDPOINT_STATE_RECORD_DOMAIN: &[u8] =
        b"AD-PRODUCTION-ENDPOINT-STATE-RECORD-V1";
    #[cfg(test)]
    const PRODUCTION_MESSAGE_ENVELOPE_RECORD_DOMAIN: &[u8] =
        b"AD-PRODUCTION-MESSAGE-ENVELOPE-RECORD-V1";
    const PRODUCTION_LOCAL_MESSAGE_INDEX_RECORD_DOMAIN: &[u8] =
        b"AD-PRODUCTION-LOCAL-MESSAGE-INDEX-RECORD-V1";

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionSessionPlan {
        pub safety_transcript: String,
        pub local_role: SessionRole,
        pub canonical_dialer_public_key: String,
        pub local_rendezvous_endpoint: PairwiseRendezvousEndpoint,
        pub remote_rendezvous_endpoint: PairwiseRendezvousEndpoint,
        pub local_noise_static_public_key: Vec<u8>,
        pub remote_noise_static_public_key: Vec<u8>,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionRole {
        CanonicalDialer,
        Responder,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionConnectionDirection {
        Inbound,
        Outbound,
    }

    impl SessionConnectionDirection {
        pub fn opposite(self) -> Self {
            match self {
                Self::Inbound => Self::Outbound,
                Self::Outbound => Self::Inbound,
            }
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum CanonicalConnectionState {
        MissingOrUnauthenticated,
        AuthenticatedUnhealthy,
        AuthenticatedHealthy,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum DuplicateConnectionAction {
        KeepCanonicalConnection,
        WaitForCanonicalConnection,
        CloseDuplicateConnection,
    }

    #[derive(Debug, Eq, PartialEq)]
    pub struct ProductionSetupDraft {
        pub pairing: ProductionPairingDraft,
        pub noise_static: NoiseStaticKeypair,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct ProductionHandshakeSmokeResult {
        pub plan: ProductionSessionPlan,
        pub ciphertext: Vec<u8>,
        pub plaintext: Vec<u8>,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionSessionEvaluationSummary {
        protocol_candidate: &'static str,
        production_pairing_required: bool,
        safety_transcript_bound: bool,
        canonical_dialer_stable: bool,
        ciphertext_tamper_rejected: bool,
        replay_guard_before_decrypt: bool,
        session_state_in_memory_only: bool,
        production_e2ee_ready: bool,
        durable_session_persistence_ready: bool,
        tauri_production_messaging_command_ready: bool,
        usable_async_messaging_ready: bool,
    }

    impl ProductionSessionEvaluationSummary {
        pub fn protocol_candidate(self) -> &'static str {
            self.protocol_candidate
        }

        pub fn production_pairing_required(self) -> bool {
            self.production_pairing_required
        }

        pub fn safety_transcript_bound(self) -> bool {
            self.safety_transcript_bound
        }

        pub fn canonical_dialer_stable(self) -> bool {
            self.canonical_dialer_stable
        }

        pub fn ciphertext_tamper_rejected(self) -> bool {
            self.ciphertext_tamper_rejected
        }

        pub fn replay_guard_before_decrypt(self) -> bool {
            self.replay_guard_before_decrypt
        }

        pub fn session_state_in_memory_only(self) -> bool {
            self.session_state_in_memory_only
        }

        pub fn production_e2ee_ready(self) -> bool {
            self.production_e2ee_ready
        }

        pub fn durable_session_persistence_ready(self) -> bool {
            self.durable_session_persistence_ready
        }

        pub fn tauri_production_messaging_command_ready(self) -> bool {
            self.tauri_production_messaging_command_ready
        }

        pub fn usable_async_messaging_ready(self) -> bool {
            self.usable_async_messaging_ready
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionSkeletonPreflightSummary {
        session_pairing_required: bool,
        session_safety_transcript_bound: bool,
        session_e2ee_ready: bool,
        transport_route_kind: TransportKind,
        transport_route_allowed_by_policy: bool,
        transport_send_receive_available: bool,
        storage_message_envelope_protection: StorageProtection,
        storage_session_transport_protection: StorageProtection,
        storage_replay_commit_after_decrypt: bool,
        storage_rollback_protection: ReplayRollbackProtection,
        default_runtime_command_surface_closed: bool,
        production_messaging_ready: bool,
    }

    impl ProductionSkeletonPreflightSummary {
        pub fn session_pairing_required(self) -> bool {
            self.session_pairing_required
        }

        pub fn session_safety_transcript_bound(self) -> bool {
            self.session_safety_transcript_bound
        }

        pub fn session_e2ee_ready(self) -> bool {
            self.session_e2ee_ready
        }

        pub fn transport_route_kind(self) -> TransportKind {
            self.transport_route_kind
        }

        pub fn transport_route_allowed_by_policy(self) -> bool {
            self.transport_route_allowed_by_policy
        }

        pub fn transport_send_receive_available(self) -> bool {
            self.transport_send_receive_available
        }

        pub fn storage_message_envelope_protection(self) -> StorageProtection {
            self.storage_message_envelope_protection
        }

        pub fn storage_session_transport_protection(self) -> StorageProtection {
            self.storage_session_transport_protection
        }

        pub fn storage_replay_commit_after_decrypt(self) -> bool {
            self.storage_replay_commit_after_decrypt
        }

        pub fn storage_rollback_protection(self) -> ReplayRollbackProtection {
            self.storage_rollback_protection
        }

        pub fn default_runtime_command_surface_closed(self) -> bool {
            self.default_runtime_command_surface_closed
        }

        pub fn production_messaging_ready(self) -> bool {
            self.production_messaging_ready
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum ProductionSkeletonConnector {
        SessionProtocolAndStatePersistence,
        StorageKeyManagementAndRollback,
        TransportEnvelopeIo,
        RuntimeCommandSurface,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionSkeletonNextConnectorSelection {
        connector: ProductionSkeletonConnector,
        blocker: &'static str,
        required_gate: &'static str,
        opens_runtime_execution: bool,
        production_messaging_ready: bool,
    }

    impl ProductionSkeletonNextConnectorSelection {
        pub fn connector(self) -> ProductionSkeletonConnector {
            self.connector
        }

        pub fn blocker(self) -> &'static str {
            self.blocker
        }

        pub fn required_gate(self) -> &'static str {
            self.required_gate
        }

        pub fn opens_runtime_execution(self) -> bool {
            self.opens_runtime_execution
        }

        pub fn production_messaging_ready(self) -> bool {
            self.production_messaging_ready
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateConnectorGate {
        selected_connector: ProductionSkeletonConnector,
        pairwise_identity_private_key_storage: StorageProtection,
        noise_static_private_key_storage: StorageProtection,
        replay_window_storage: StorageProtection,
        session_transport_storage: StorageProtection,
        replay_commit_after_decrypt: bool,
        rollback_protection: ReplayRollbackProtection,
        opens_storage_unlock_command: bool,
        opens_transport_io: bool,
        opens_runtime_messaging: bool,
        connector_ready: bool,
    }

    impl SessionDurableStateConnectorGate {
        pub fn selected_connector(self) -> ProductionSkeletonConnector {
            self.selected_connector
        }

        pub fn pairwise_identity_private_key_storage(self) -> StorageProtection {
            self.pairwise_identity_private_key_storage
        }

        pub fn noise_static_private_key_storage(self) -> StorageProtection {
            self.noise_static_private_key_storage
        }

        pub fn replay_window_storage(self) -> StorageProtection {
            self.replay_window_storage
        }

        pub fn session_transport_storage(self) -> StorageProtection {
            self.session_transport_storage
        }

        pub fn replay_commit_after_decrypt(self) -> bool {
            self.replay_commit_after_decrypt
        }

        pub fn rollback_protection(self) -> ReplayRollbackProtection {
            self.rollback_protection
        }

        pub fn opens_storage_unlock_command(self) -> bool {
            self.opens_storage_unlock_command
        }

        pub fn opens_transport_io(self) -> bool {
            self.opens_transport_io
        }

        pub fn opens_runtime_messaging(self) -> bool {
            self.opens_runtime_messaging
        }

        pub fn connector_ready(self) -> bool {
            self.connector_ready
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateConnectorHarness {
        selected_connector: ProductionSkeletonConnector,
        pairwise_identity_private_key_encrypted_record_allowed: bool,
        noise_static_private_key_encrypted_record_allowed: bool,
        replay_window_encrypted_record_allowed: bool,
        session_transport_persistence_rejected: bool,
        rollback_protection_required_before_readiness: bool,
        opens_storage_unlock_command: bool,
        opens_transport_io: bool,
        opens_runtime_messaging: bool,
        harness_ready_for_connector_implementation: bool,
    }

    impl SessionDurableStateConnectorHarness {
        pub fn selected_connector(self) -> ProductionSkeletonConnector {
            self.selected_connector
        }

        pub fn pairwise_identity_private_key_encrypted_record_allowed(self) -> bool {
            self.pairwise_identity_private_key_encrypted_record_allowed
        }

        pub fn noise_static_private_key_encrypted_record_allowed(self) -> bool {
            self.noise_static_private_key_encrypted_record_allowed
        }

        pub fn replay_window_encrypted_record_allowed(self) -> bool {
            self.replay_window_encrypted_record_allowed
        }

        pub fn session_transport_persistence_rejected(self) -> bool {
            self.session_transport_persistence_rejected
        }

        pub fn rollback_protection_required_before_readiness(self) -> bool {
            self.rollback_protection_required_before_readiness
        }

        pub fn opens_storage_unlock_command(self) -> bool {
            self.opens_storage_unlock_command
        }

        pub fn opens_transport_io(self) -> bool {
            self.opens_transport_io
        }

        pub fn opens_runtime_messaging(self) -> bool {
            self.opens_runtime_messaging
        }

        pub fn harness_ready_for_connector_implementation(self) -> bool {
            self.harness_ready_for_connector_implementation
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum SessionDurableStateAdapterRecordKind {
        PairwiseIdentityPrivateKey,
        NoiseStaticPrivateKey,
        ReplayWindowState,
        SessionTransportState,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateAdapterRecordPolicy {
        kind: SessionDurableStateAdapterRecordKind,
        production_record_kind: ProductionRecordKind,
        storage_protection: StorageProtection,
        encrypted_record_allowed: bool,
        persistence_allowed: bool,
    }

    impl SessionDurableStateAdapterRecordPolicy {
        pub fn kind(self) -> SessionDurableStateAdapterRecordKind {
            self.kind
        }

        pub fn production_record_kind(self) -> ProductionRecordKind {
            self.production_record_kind
        }

        pub fn storage_protection(self) -> StorageProtection {
            self.storage_protection
        }

        pub fn encrypted_record_allowed(self) -> bool {
            self.encrypted_record_allowed
        }

        pub fn persistence_allowed(self) -> bool {
            self.persistence_allowed
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStatePersistenceAdapterSkeleton {
        selected_connector: ProductionSkeletonConnector,
        opens_storage_unlock_command: bool,
        opens_transport_io: bool,
        opens_runtime_messaging: bool,
        adapter_implementation_ready: bool,
        ready_for_encrypted_record_adapter_spike: bool,
    }

    impl SessionDurableStatePersistenceAdapterSkeleton {
        pub fn selected_connector(self) -> ProductionSkeletonConnector {
            self.selected_connector
        }

        pub fn opens_storage_unlock_command(self) -> bool {
            self.opens_storage_unlock_command
        }

        pub fn opens_transport_io(self) -> bool {
            self.opens_transport_io
        }

        pub fn opens_runtime_messaging(self) -> bool {
            self.opens_runtime_messaging
        }

        pub fn adapter_implementation_ready(self) -> bool {
            self.adapter_implementation_ready
        }

        pub fn ready_for_encrypted_record_adapter_spike(self) -> bool {
            self.ready_for_encrypted_record_adapter_spike
        }

        pub fn record_policy(
            self,
            kind: SessionDurableStateAdapterRecordKind,
        ) -> SessionDurableStateAdapterRecordPolicy {
            let production_record_kind = match kind {
                SessionDurableStateAdapterRecordKind::PairwiseIdentityPrivateKey => {
                    ProductionRecordKind::PairwiseIdentityPrivateKey
                }
                SessionDurableStateAdapterRecordKind::NoiseStaticPrivateKey => {
                    ProductionRecordKind::NoiseStaticPrivateKey
                }
                SessionDurableStateAdapterRecordKind::ReplayWindowState => {
                    ProductionRecordKind::ReplayWindowState
                }
                SessionDurableStateAdapterRecordKind::SessionTransportState => {
                    ProductionRecordKind::SessionTransportState
                }
            };

            SessionDurableStateAdapterRecordPolicy {
                kind,
                production_record_kind,
                storage_protection: protection_for(production_record_kind),
                encrypted_record_allowed: require_encrypted_record_allowed(production_record_kind)
                    .is_ok(),
                persistence_allowed: require_persistence_allowed(production_record_kind).is_ok(),
            }
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct SessionDurableStateEncryptedRecordAdapter {
        skeleton: SessionDurableStatePersistenceAdapterSkeleton,
    }

    impl SessionDurableStateEncryptedRecordAdapter {
        pub fn new(skeleton: SessionDurableStatePersistenceAdapterSkeleton) -> Self {
            Self { skeleton }
        }

        pub fn opens_storage_unlock_command(self) -> bool {
            false
        }

        pub fn opens_transport_io(self) -> bool {
            false
        }

        pub fn opens_runtime_messaging(self) -> bool {
            false
        }

        pub fn persists_records_to_store(self) -> bool {
            false
        }

        pub fn prepare_record(
            self,
            kind: SessionDurableStateAdapterRecordKind,
            scope: EncryptedRecordScope,
            nonce: Vec<u8>,
            sealed_body: Vec<u8>,
        ) -> Result<EncryptedRecord, ProductionSessionError> {
            let policy = self.skeleton.record_policy(kind);
            if !policy.encrypted_record_allowed() || !policy.persistence_allowed() {
                return Err(ProductionSessionError::from(ProductionStorageError::from(
                    ProductionStoragePolicyError::PersistenceForbidden {
                        kind: policy.production_record_kind(),
                    },
                )));
            }
            EncryptedRecord::new(policy.production_record_kind(), scope, nonce, sealed_body)
                .map_err(ProductionStorageError::from)
                .map_err(ProductionSessionError::from)
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct LocalMessageIndexEntry {
        contact_id: ContactId,
        message_number: u64,
        message_type: MessageType,
    }

    impl LocalMessageIndexEntry {
        pub fn new(
            contact_id: ContactId,
            message_number: u64,
            message_type: MessageType,
        ) -> Result<Self, ProductionSessionError> {
            if message_number == 0 {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            Ok(Self {
                contact_id,
                message_number,
                message_type,
            })
        }

        pub fn contact_id(&self) -> &ContactId {
            &self.contact_id
        }

        pub fn message_number(&self) -> u64 {
            self.message_number
        }

        pub fn message_type(&self) -> MessageType {
            self.message_type.clone()
        }

        fn encode(&self) -> String {
            format!(
                "ADMSGIDX1|{}|{}|{}",
                self.contact_id.as_str(),
                self.message_number,
                message_type_tag(&self.message_type)
            )
        }

        fn decode(value: &str) -> Result<Self, ProductionSessionError> {
            let parts = value.split('|').collect::<Vec<_>>();
            if parts.len() != 4 || parts[0] != "ADMSGIDX1" {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            let contact_id =
                ContactId::new(parts[1]).map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            let message_number = parts[2]
                .parse::<u64>()
                .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
            let message_type = parse_message_type_tag(parts[3])?;
            Self::new(contact_id, message_number, message_type)
        }
    }

    #[derive(Debug)]
    pub struct ProductionEnvelopeSession {
        plan: ProductionSessionPlan,
        channel_id: String,
        transport: NoiseTransportPair,
    }

    impl ProductionEnvelopeSession {
        pub fn plan(&self) -> &ProductionSessionPlan {
            &self.plan
        }

        pub fn channel_id(&self) -> &str {
            &self.channel_id
        }

        fn replay_record_id(&self) -> EncryptedRecordId {
            production_replay_record_id(&self.channel_id)
        }

        fn endpoint_state_record_id(&self, contact_id: &ContactId) -> EncryptedRecordId {
            production_endpoint_state_record_id(&self.channel_id, contact_id)
        }

        #[cfg(test)]
        fn message_envelope_record_id(
            &self,
            message_number: u64,
            message_type: MessageType,
        ) -> EncryptedRecordId {
            production_message_envelope_record_id(&self.channel_id, message_number, message_type)
        }

        fn local_message_index_record_id(
            &self,
            contact_id: &ContactId,
            message_number: u64,
        ) -> EncryptedRecordId {
            production_local_message_index_record_id(&self.channel_id, contact_id, message_number)
        }

        pub fn encrypt_from_canonical_dialer(
            &mut self,
            message_number: u64,
            plaintext: &[u8],
        ) -> Result<Envelope, ProductionSessionError> {
            self.encrypt_from_canonical_dialer_with_type(
                message_number,
                plaintext,
                MessageType::Data,
            )
        }

        pub fn encrypt_control_from_canonical_dialer(
            &mut self,
            message_number: u64,
            plaintext: &[u8],
        ) -> Result<Envelope, ProductionSessionError> {
            self.encrypt_from_canonical_dialer_with_type(
                message_number,
                plaintext,
                MessageType::Control,
            )
        }

        fn encrypt_from_canonical_dialer_with_type(
            &mut self,
            message_number: u64,
            plaintext: &[u8],
            message_type: MessageType,
        ) -> Result<Envelope, ProductionSessionError> {
            Ok(Envelope {
                protocol_version: 1,
                channel_id: self.channel_id.clone(),
                message_number,
                message_type,
                padded_ciphertext: self.transport.initiator_encrypt(plaintext)?,
            })
        }

        pub fn encrypt_endpoint_update_from_canonical_dialer(
            &mut self,
            update: &PairwiseEndpointUpdate,
            message_number: u64,
        ) -> Result<EncryptedEndpointUpdateControlEnvelope, ProductionSessionError> {
            let plaintext = EndpointUpdateControlPlaintext::from_pairwise_update(update);
            let envelope = self.encrypt_control_from_canonical_dialer(
                message_number,
                &plaintext.encode_padded()?,
            )?;
            EncryptedEndpointUpdateControlEnvelope::from_control_envelope(update, envelope)
                .map_err(ProductionSessionError::from)
        }

        pub fn decrypt_at_responder(
            &mut self,
            envelope: &Envelope,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            if envelope.channel_id != self.channel_id || envelope.message_type != MessageType::Data
            {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            self.transport
                .responder_decrypt(&envelope.padded_ciphertext)
                .map_err(ProductionSessionError::from)
        }

        pub fn decrypt_control_at_responder(
            &mut self,
            envelope: &Envelope,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            if envelope.channel_id != self.channel_id
                || envelope.message_type != MessageType::Control
            {
                return Err(ProductionSessionError::UnexpectedEnvelope);
            }
            self.transport
                .responder_decrypt(&envelope.padded_ciphertext)
                .map_err(ProductionSessionError::from)
        }

        pub fn decrypt_at_responder_with_replay(
            &mut self,
            envelope: &Envelope,
            replay_window: &mut ReplayWindow,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            let mut next_replay_window = replay_window.clone();
            next_replay_window.accept(envelope.message_number)?;
            let plaintext = self.decrypt_at_responder(envelope)?;
            *replay_window = next_replay_window;
            Ok(plaintext)
        }

        fn decrypt_at_responder_with_persistent_replay(
            &mut self,
            envelope: &Envelope,
            store: &SqlCipherRecordStore,
            replay_record_id: &EncryptedRecordId,
            replay_scope: EncryptedRecordScope,
            window_size: u64,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            let mut replay_window = store
                .load_replay_window(replay_record_id)?
                .map(Ok)
                .unwrap_or_else(|| ReplayWindow::new(window_size))?;
            let plaintext = self.decrypt_at_responder_with_replay(envelope, &mut replay_window)?;
            store.save_replay_window(replay_record_id, replay_scope, &replay_window)?;
            Ok(plaintext)
        }

        pub fn decrypt_at_responder_with_session_replay(
            &mut self,
            envelope: &Envelope,
            store: &SqlCipherRecordStore,
            replay_scope: EncryptedRecordScope,
            window_size: u64,
        ) -> Result<Vec<u8>, ProductionSessionError> {
            let replay_record_id = self.replay_record_id();
            self.decrypt_at_responder_with_persistent_replay(
                envelope,
                store,
                &replay_record_id,
                replay_scope,
                window_size,
            )
        }

        pub fn save_pairwise_endpoint_state(
            &self,
            store: &SqlCipherRecordStore,
            scope: EncryptedRecordScope,
            endpoint: &PairwiseRendezvousEndpoint,
        ) -> Result<EncryptedRecordId, ProductionSessionError> {
            if scope.contact_id() != Some(endpoint.contact_id()) {
                return Err(ProductionSessionError::EndpointScopeMismatch);
            }
            let record_id = self.endpoint_state_record_id(endpoint.contact_id());
            let record = EncryptedRecord::new(
                ProductionRecordKind::RendezvousEndpointState,
                scope,
                b"sqlcipher-page-encryption-v1".to_vec(),
                endpoint.encode_state().into_bytes(),
            )
            .map_err(ProductionStorageError::from)?;
            store.put(&record_id, &record)?;
            Ok(record_id)
        }

        pub fn load_pairwise_endpoint_state(
            &self,
            store: &SqlCipherRecordStore,
            contact_id: &ContactId,
        ) -> Result<Option<PairwiseRendezvousEndpoint>, ProductionSessionError> {
            let record_id = self.endpoint_state_record_id(contact_id);
            store
                .get(&record_id)?
                .map(|record| {
                    if record.kind != ProductionRecordKind::RendezvousEndpointState {
                        return Err(ProductionSessionError::UnexpectedEnvelope);
                    }
                    let state = String::from_utf8(record.sealed_body)
                        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                    let endpoint = PairwiseRendezvousEndpoint::decode_state(&state)?;
                    if endpoint.contact_id() != contact_id {
                        return Err(ProductionSessionError::EndpointScopeMismatch);
                    }
                    Ok(endpoint)
                })
                .transpose()
        }

        pub fn delete_pairwise_endpoint_state(
            &self,
            store: &SqlCipherRecordStore,
            contact_id: &ContactId,
        ) -> Result<(), ProductionSessionError> {
            let record_id = self.endpoint_state_record_id(contact_id);
            store.delete(&record_id)?;
            Ok(())
        }

        pub fn save_local_message_index(
            &self,
            store: &SqlCipherRecordStore,
            scope: EncryptedRecordScope,
            entry: &LocalMessageIndexEntry,
        ) -> Result<EncryptedRecordId, ProductionSessionError> {
            if scope.contact_id() != Some(entry.contact_id()) {
                return Err(ProductionSessionError::EndpointScopeMismatch);
            }
            let record_id =
                self.local_message_index_record_id(entry.contact_id(), entry.message_number());
            let record = EncryptedRecord::new(
                ProductionRecordKind::LocalMessageIndex,
                scope,
                b"sqlcipher-page-encryption-v1".to_vec(),
                entry.encode().into_bytes(),
            )
            .map_err(ProductionStorageError::from)?;
            store.put(&record_id, &record)?;
            Ok(record_id)
        }

        pub fn load_local_message_index(
            &self,
            store: &SqlCipherRecordStore,
            contact_id: &ContactId,
            message_number: u64,
        ) -> Result<Option<LocalMessageIndexEntry>, ProductionSessionError> {
            let record_id = self.local_message_index_record_id(contact_id, message_number);
            store
                .get(&record_id)?
                .map(|record| {
                    if record.kind != ProductionRecordKind::LocalMessageIndex {
                        return Err(ProductionSessionError::UnexpectedEnvelope);
                    }
                    let state = String::from_utf8(record.sealed_body)
                        .map_err(|_| ProductionSessionError::UnexpectedEnvelope)?;
                    let entry = LocalMessageIndexEntry::decode(&state)?;
                    if entry.contact_id() != contact_id || entry.message_number() != message_number
                    {
                        return Err(ProductionSessionError::EndpointScopeMismatch);
                    }
                    Ok(entry)
                })
                .transpose()
        }
    }

    #[derive(Debug, Eq, PartialEq)]
    pub enum ProductionSessionError {
        Pairing(PairingError),
        Crypto(CryptoError),
        Protocol(ProtocolError),
        Storage(ProductionStorageError),
        EndpointLifecycle(EndpointLifecycleError),
        NonProductionPairingPayload,
        SamePairwiseIdentity,
        SameRendezvousEndpoint,
        InvalidRendezvousEndpoint,
        NoiseStaticKeyMismatch,
        UnexpectedEnvelope,
        EndpointScopeMismatch,
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

    impl From<ProtocolError> for ProductionSessionError {
        fn from(value: ProtocolError) -> Self {
            Self::Protocol(value)
        }
    }

    impl From<ProductionStorageError> for ProductionSessionError {
        fn from(value: ProductionStorageError) -> Self {
            Self::Storage(value)
        }
    }

    impl From<EndpointLifecycleError> for ProductionSessionError {
        fn from(value: EndpointLifecycleError) -> Self {
            Self::EndpointLifecycle(value)
        }
    }

    impl ProductionSessionPlan {
        pub fn canonical_connection_direction(&self) -> SessionConnectionDirection {
            match self.local_role {
                SessionRole::CanonicalDialer => SessionConnectionDirection::Outbound,
                SessionRole::Responder => SessionConnectionDirection::Inbound,
            }
        }

        pub fn is_canonical_connection_direction(
            &self,
            observed_direction: SessionConnectionDirection,
        ) -> bool {
            observed_direction == self.canonical_connection_direction()
        }

        pub fn duplicate_connection_action(
            &self,
            observed_direction: SessionConnectionDirection,
            canonical_state: CanonicalConnectionState,
        ) -> DuplicateConnectionAction {
            if self.is_canonical_connection_direction(observed_direction) {
                return DuplicateConnectionAction::KeepCanonicalConnection;
            }
            if canonical_state == CanonicalConnectionState::AuthenticatedHealthy {
                DuplicateConnectionAction::CloseDuplicateConnection
            } else {
                DuplicateConnectionAction::WaitForCanonicalConnection
            }
        }
    }

    pub fn production_setup_draft_with_defaults(
        profile: &ProfileName,
        rendezvous_endpoint: impl Into<String>,
    ) -> Result<ProductionSetupDraft, ProductionSessionError> {
        let noise_static = generate_noise_static_keypair()?;
        let prekey_bundle = noise_static.prekey_bundle()?.encode();
        let pairing =
            production_pairing_draft_with_defaults(profile, rendezvous_endpoint, prekey_bundle)?;
        Ok(ProductionSetupDraft {
            pairing,
            noise_static,
        })
    }

    pub fn production_session_evaluation_summary() -> ProductionSessionEvaluationSummary {
        ProductionSessionEvaluationSummary {
            protocol_candidate: "snow Noise XX synchronous boundary",
            production_pairing_required: true,
            safety_transcript_bound: true,
            canonical_dialer_stable: true,
            ciphertext_tamper_rejected: true,
            replay_guard_before_decrypt: true,
            session_state_in_memory_only: true,
            production_e2ee_ready: false,
            durable_session_persistence_ready: false,
            tauri_production_messaging_command_ready: false,
            usable_async_messaging_ready: false,
        }
    }

    pub fn production_skeleton_preflight_summary() -> ProductionSkeletonPreflightSummary {
        let session = production_session_evaluation_summary();
        let transport = OnionEnvelopeTransport::fail_closed_high_risk();
        let route = TransportRoute::onion("preflight.onion")
            .expect("static onion preflight route is valid");
        let transport = transport.message_path_boundary_summary(&route);
        let storage = production_message_storage_boundary_summary();

        ProductionSkeletonPreflightSummary {
            session_pairing_required: session.production_pairing_required(),
            session_safety_transcript_bound: session.safety_transcript_bound(),
            session_e2ee_ready: session.production_e2ee_ready(),
            transport_route_kind: transport.route_kind(),
            transport_route_allowed_by_policy: transport.route_allowed_by_policy(),
            transport_send_receive_available: transport.send_receive_available(),
            storage_message_envelope_protection: storage.message_envelope_storage(),
            storage_session_transport_protection: storage.session_transport_storage(),
            storage_replay_commit_after_decrypt: storage.replay_commit_after_decrypt(),
            storage_rollback_protection: storage.rollback_protection(),
            default_runtime_command_surface_closed: true,
            production_messaging_ready: false,
        }
    }

    pub fn production_skeleton_next_connector_selection() -> ProductionSkeletonNextConnectorSelection
    {
        let preflight = production_skeleton_preflight_summary();

        if !preflight.session_e2ee_ready() {
            return ProductionSkeletonNextConnectorSelection {
                connector: ProductionSkeletonConnector::SessionProtocolAndStatePersistence,
                blocker: "production session E2EE and durable state are not complete",
                required_gate:
                    "reviewed session protocol decision plus durable state persistence plan",
                opens_runtime_execution: false,
                production_messaging_ready: false,
            };
        }

        if preflight.storage_rollback_protection() == ReplayRollbackProtection::NotProvided {
            return ProductionSkeletonNextConnectorSelection {
                connector: ProductionSkeletonConnector::StorageKeyManagementAndRollback,
                blocker: "storage rollback protection and key management are not complete",
                required_gate: "key management rollback backup exclusion and migration decision",
                opens_runtime_execution: false,
                production_messaging_ready: false,
            };
        }

        if !preflight.transport_send_receive_available() {
            return ProductionSkeletonNextConnectorSelection {
                connector: ProductionSkeletonConnector::TransportEnvelopeIo,
                blocker: "transport send receive envelope I/O is disabled",
                required_gate: "bounded Tor onion lifecycle adapter without direct fallback",
                opens_runtime_execution: false,
                production_messaging_ready: false,
            };
        }

        ProductionSkeletonNextConnectorSelection {
            connector: ProductionSkeletonConnector::RuntimeCommandSurface,
            blocker: "runtime command surface remains closed",
            required_gate:
                "Rust-owned runtime command review after session storage transport gates",
            opens_runtime_execution: false,
            production_messaging_ready: false,
        }
    }

    pub fn session_durable_state_connector_gate() -> SessionDurableStateConnectorGate {
        let selection = production_skeleton_next_connector_selection();
        let storage = production_message_storage_boundary_summary();

        SessionDurableStateConnectorGate {
            selected_connector: selection.connector(),
            pairwise_identity_private_key_storage: protection_for(
                ProductionRecordKind::PairwiseIdentityPrivateKey,
            ),
            noise_static_private_key_storage: protection_for(
                ProductionRecordKind::NoiseStaticPrivateKey,
            ),
            replay_window_storage: storage.replay_window_storage(),
            session_transport_storage: storage.session_transport_storage(),
            replay_commit_after_decrypt: storage.replay_commit_after_decrypt(),
            rollback_protection: storage.rollback_protection(),
            opens_storage_unlock_command: false,
            opens_transport_io: false,
            opens_runtime_messaging: false,
            connector_ready: false,
        }
    }

    pub fn session_durable_state_connector_test_harness() -> SessionDurableStateConnectorHarness {
        let gate = session_durable_state_connector_gate();
        let session_transport_persistence_rejected = matches!(
            require_persistence_allowed(ProductionRecordKind::SessionTransportState),
            Err(ProductionStoragePolicyError::PersistenceForbidden {
                kind: ProductionRecordKind::SessionTransportState
            })
        );

        SessionDurableStateConnectorHarness {
            selected_connector: gate.selected_connector(),
            pairwise_identity_private_key_encrypted_record_allowed:
                require_encrypted_record_allowed(ProductionRecordKind::PairwiseIdentityPrivateKey)
                    .is_ok(),
            noise_static_private_key_encrypted_record_allowed: require_encrypted_record_allowed(
                ProductionRecordKind::NoiseStaticPrivateKey,
            )
            .is_ok(),
            replay_window_encrypted_record_allowed: require_encrypted_record_allowed(
                ProductionRecordKind::ReplayWindowState,
            )
            .is_ok(),
            session_transport_persistence_rejected,
            rollback_protection_required_before_readiness: gate.rollback_protection()
                == ReplayRollbackProtection::NotProvided,
            opens_storage_unlock_command: false,
            opens_transport_io: false,
            opens_runtime_messaging: false,
            harness_ready_for_connector_implementation: true,
        }
    }

    pub fn session_durable_state_persistence_adapter_skeleton(
    ) -> SessionDurableStatePersistenceAdapterSkeleton {
        let harness = session_durable_state_connector_test_harness();

        SessionDurableStatePersistenceAdapterSkeleton {
            selected_connector: harness.selected_connector(),
            opens_storage_unlock_command: false,
            opens_transport_io: false,
            opens_runtime_messaging: false,
            adapter_implementation_ready: false,
            ready_for_encrypted_record_adapter_spike: harness
                .harness_ready_for_connector_implementation(),
        }
    }

    pub fn session_durable_state_encrypted_record_adapter_spike(
    ) -> SessionDurableStateEncryptedRecordAdapter {
        SessionDurableStateEncryptedRecordAdapter::new(
            session_durable_state_persistence_adapter_skeleton(),
        )
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
        if local.rendezvous_endpoint == remote.rendezvous_endpoint {
            return Err(ProductionSessionError::SameRendezvousEndpoint);
        }
        let local_rendezvous_endpoint = pairwise_rendezvous_endpoint_from_payload(local)?;
        let remote_rendezvous_endpoint = pairwise_rendezvous_endpoint_from_payload(remote)?;
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
            local_rendezvous_endpoint,
            remote_rendezvous_endpoint,
            local_noise_static_public_key: local_prekey.public_key().to_vec(),
            remote_noise_static_public_key: remote_prekey.public_key().to_vec(),
        })
    }

    pub fn run_setup_draft_handshake_smoke(
        local: &ProductionSetupDraft,
        remote: &ProductionSetupDraft,
        plaintext: &[u8],
    ) -> Result<ProductionHandshakeSmokeResult, ProductionSessionError> {
        let plan = plan_session_from_verified_pairing_payloads(
            &local.pairing.payload,
            &remote.pairing.payload,
        )?;
        require_matching_noise_static(&local.noise_static, &plan.local_noise_static_public_key)?;
        require_matching_noise_static(&remote.noise_static, &plan.remote_noise_static_public_key)?;

        let (initiator, responder) = match plan.local_role {
            SessionRole::CanonicalDialer => (&local.noise_static, &remote.noise_static),
            SessionRole::Responder => (&remote.noise_static, &local.noise_static),
        };
        let handshake =
            run_noise_xx_handshake_smoke(&plan.safety_transcript, initiator, responder, plaintext)?;
        let expected_initiator_remote = match plan.local_role {
            SessionRole::CanonicalDialer => &plan.remote_noise_static_public_key,
            SessionRole::Responder => &plan.local_noise_static_public_key,
        };
        let expected_responder_remote = match plan.local_role {
            SessionRole::CanonicalDialer => &plan.local_noise_static_public_key,
            SessionRole::Responder => &plan.remote_noise_static_public_key,
        };
        if handshake.initiator_remote_static != *expected_initiator_remote
            || handshake.responder_remote_static != *expected_responder_remote
        {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }

        Ok(ProductionHandshakeSmokeResult {
            plan,
            ciphertext: handshake.ciphertext,
            plaintext: handshake.plaintext,
        })
    }

    pub fn establish_envelope_session_from_setup_drafts(
        local: &ProductionSetupDraft,
        remote: &ProductionSetupDraft,
    ) -> Result<ProductionEnvelopeSession, ProductionSessionError> {
        let plan = plan_session_from_verified_pairing_payloads(
            &local.pairing.payload,
            &remote.pairing.payload,
        )?;
        require_matching_noise_static(&local.noise_static, &plan.local_noise_static_public_key)?;
        require_matching_noise_static(&remote.noise_static, &plan.remote_noise_static_public_key)?;
        let (initiator, responder) = match plan.local_role {
            SessionRole::CanonicalDialer => (&local.noise_static, &remote.noise_static),
            SessionRole::Responder => (&remote.noise_static, &local.noise_static),
        };
        let transport =
            establish_noise_xx_transport_pair(&plan.safety_transcript, initiator, responder)?;
        verify_transport_remote_static(&plan, &transport)?;
        let channel_id = production_channel_id(&plan);
        Ok(ProductionEnvelopeSession {
            plan,
            channel_id,
            transport,
        })
    }

    fn verify_transport_remote_static(
        plan: &ProductionSessionPlan,
        transport: &NoiseTransportPair,
    ) -> Result<(), ProductionSessionError> {
        let expected_initiator_remote = match plan.local_role {
            SessionRole::CanonicalDialer => &plan.remote_noise_static_public_key,
            SessionRole::Responder => &plan.local_noise_static_public_key,
        };
        let expected_responder_remote = match plan.local_role {
            SessionRole::CanonicalDialer => &plan.local_noise_static_public_key,
            SessionRole::Responder => &plan.remote_noise_static_public_key,
        };
        if transport.initiator_remote_static() != expected_initiator_remote
            || transport.responder_remote_static() != expected_responder_remote
        {
            return Err(ProductionSessionError::NoiseStaticKeyMismatch);
        }
        Ok(())
    }

    fn require_matching_noise_static(
        keypair: &NoiseStaticKeypair,
        expected_public_key: &[u8],
    ) -> Result<(), ProductionSessionError> {
        if keypair.public_key() == expected_public_key {
            Ok(())
        } else {
            Err(ProductionSessionError::NoiseStaticKeyMismatch)
        }
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

    fn pairwise_rendezvous_endpoint_from_payload(
        payload: &PairingPayload,
    ) -> Result<PairwiseRendezvousEndpoint, ProductionSessionError> {
        let contact_id = payload.contact_id()?;
        let endpoint = OnionServiceEndpoint::new(payload.rendezvous_endpoint.clone())
            .map_err(|_| ProductionSessionError::InvalidRendezvousEndpoint)?;
        PairwiseRendezvousEndpoint::new(
            contact_id,
            endpoint,
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .map_err(ProductionSessionError::from)
    }

    fn canonical_dialer_rank(payload: &PairingPayload) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(CANONICAL_DIALER_DOMAIN);
        hasher.update([0]);
        hasher.update(payload.pairwise_public_key.as_str().as_bytes());
        hasher.finalize().into()
    }

    fn production_channel_id(plan: &ProductionSessionPlan) -> String {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_CHANNEL_DOMAIN);
        hasher.update([0]);
        hasher.update(plan.safety_transcript.as_bytes());
        format!("adchan1:{}", encode_hex(&hasher.finalize()))
    }

    fn production_replay_record_id(channel_id: &str) -> EncryptedRecordId {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_REPLAY_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        EncryptedRecordId::new(format!("replay_{}", encode_hex(&hasher.finalize())))
            .expect("domain-separated replay record id is valid")
    }

    fn production_endpoint_state_record_id(
        channel_id: &str,
        contact_id: &ContactId,
    ) -> EncryptedRecordId {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_ENDPOINT_STATE_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        hasher.update([0]);
        hasher.update(contact_id.as_str().as_bytes());
        EncryptedRecordId::new(format!("endpoint_{}", encode_hex(&hasher.finalize())))
            .expect("domain-separated endpoint state record id is valid")
    }

    #[cfg(test)]
    fn production_message_envelope_record_id(
        channel_id: &str,
        message_number: u64,
        message_type: MessageType,
    ) -> EncryptedRecordId {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_MESSAGE_ENVELOPE_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        hasher.update([0]);
        hasher.update(message_number.to_be_bytes());
        hasher.update([0]);
        hasher.update(match message_type {
            MessageType::Data => b"data".as_slice(),
            MessageType::Ack => b"ack".as_slice(),
            MessageType::Control => b"control".as_slice(),
        });
        EncryptedRecordId::new(format!("message_{}", encode_hex(&hasher.finalize())))
            .expect("domain-separated message envelope record id is valid")
    }

    fn production_local_message_index_record_id(
        channel_id: &str,
        contact_id: &ContactId,
        message_number: u64,
    ) -> EncryptedRecordId {
        let mut hasher = Sha256::new();
        hasher.update(PRODUCTION_LOCAL_MESSAGE_INDEX_RECORD_DOMAIN);
        hasher.update([0]);
        hasher.update(channel_id.as_bytes());
        hasher.update([0]);
        hasher.update(contact_id.as_str().as_bytes());
        hasher.update([0]);
        hasher.update(message_number.to_be_bytes());
        EncryptedRecordId::new(format!("msgidx_{}", encode_hex(&hasher.finalize())))
            .expect("domain-separated local message index record id is valid")
    }

    fn message_type_tag(message_type: &MessageType) -> &'static str {
        match message_type {
            MessageType::Data => "data",
            MessageType::Ack => "ack",
            MessageType::Control => "control",
        }
    }

    fn parse_message_type_tag(value: &str) -> Result<MessageType, ProductionSessionError> {
        match value {
            "data" => Ok(MessageType::Data),
            "ack" => Ok(MessageType::Ack),
            "control" => Ok(MessageType::Control),
            _ => Err(ProductionSessionError::UnexpectedEnvelope),
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use another_dimension_identity::{
            ContactId, PairwisePublicKey, PairwiseSignature, ProductionPairwisePrivateKey,
            ProfileName,
        };
        use another_dimension_pairing::{
            production_pairing_payload_for, ProductionPairingPayloadParams, DEFAULT_TTL_SECONDS,
        };
        use another_dimension_protocol::trim_padding;
        use another_dimension_storage::production::{LockedProfileStore, ProfilePassphrase};
        use another_dimension_transport::{
            EndpointUpdateChannel, OnionServiceEndpoint, PairwiseRendezvousEndpoint,
            RendezvousEndpointIdentityBinding, RendezvousEndpointScope,
        };

        #[test]
        fn production_session_evaluation_summary_keeps_readiness_false() {
            let summary = production_session_evaluation_summary();

            assert_eq!(
                summary.protocol_candidate(),
                "snow Noise XX synchronous boundary"
            );
            assert!(summary.production_pairing_required());
            assert!(summary.safety_transcript_bound());
            assert!(summary.canonical_dialer_stable());
            assert!(summary.ciphertext_tamper_rejected());
            assert!(summary.replay_guard_before_decrypt());
            assert!(summary.session_state_in_memory_only());
            assert!(!summary.production_e2ee_ready());
            assert!(!summary.durable_session_persistence_ready());
            assert!(!summary.tauri_production_messaging_command_ready());
            assert!(!summary.usable_async_messaging_ready());
        }

        #[test]
        fn production_skeleton_preflight_aggregates_blockers_without_readiness() {
            let summary = production_skeleton_preflight_summary();

            assert!(summary.session_pairing_required());
            assert!(summary.session_safety_transcript_bound());
            assert!(!summary.session_e2ee_ready());
            assert_eq!(summary.transport_route_kind(), TransportKind::OnionService);
            assert!(summary.transport_route_allowed_by_policy());
            assert!(!summary.transport_send_receive_available());
            assert_eq!(
                summary.storage_message_envelope_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                summary.storage_session_transport_protection(),
                StorageProtection::InMemoryOnly
            );
            assert!(summary.storage_replay_commit_after_decrypt());
            assert_eq!(
                summary.storage_rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(summary.default_runtime_command_surface_closed());
            assert!(!summary.production_messaging_ready());
        }

        #[test]
        fn production_skeleton_next_connector_selects_session_gate_without_runtime() {
            let selection = production_skeleton_next_connector_selection();

            assert_eq!(
                selection.connector(),
                ProductionSkeletonConnector::SessionProtocolAndStatePersistence
            );
            assert_eq!(
                selection.blocker(),
                "production session E2EE and durable state are not complete"
            );
            assert_eq!(
                selection.required_gate(),
                "reviewed session protocol decision plus durable state persistence plan"
            );
            assert!(!selection.opens_runtime_execution());
            assert!(!selection.production_messaging_ready());
        }

        #[test]
        fn session_durable_state_connector_gate_keeps_runtime_closed() {
            let gate = session_durable_state_connector_gate();

            assert_eq!(
                gate.selected_connector(),
                ProductionSkeletonConnector::SessionProtocolAndStatePersistence
            );
            assert_eq!(
                gate.pairwise_identity_private_key_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                gate.noise_static_private_key_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                gate.replay_window_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                gate.session_transport_storage(),
                StorageProtection::InMemoryOnly
            );
            assert!(gate.replay_commit_after_decrypt());
            assert_eq!(
                gate.rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(!gate.opens_storage_unlock_command());
            assert!(!gate.opens_transport_io());
            assert!(!gate.opens_runtime_messaging());
            assert!(!gate.connector_ready());
        }

        #[test]
        fn session_durable_state_connector_harness_applies_storage_policy() {
            let harness = session_durable_state_connector_test_harness();

            assert_eq!(
                harness.selected_connector(),
                ProductionSkeletonConnector::SessionProtocolAndStatePersistence
            );
            assert!(harness.pairwise_identity_private_key_encrypted_record_allowed());
            assert!(harness.noise_static_private_key_encrypted_record_allowed());
            assert!(harness.replay_window_encrypted_record_allowed());
            assert!(harness.session_transport_persistence_rejected());
            assert!(harness.rollback_protection_required_before_readiness());
            assert!(!harness.opens_storage_unlock_command());
            assert!(!harness.opens_transport_io());
            assert!(!harness.opens_runtime_messaging());
            assert!(harness.harness_ready_for_connector_implementation());
        }

        #[test]
        fn session_durable_state_persistence_adapter_skeleton_maps_record_policies() {
            let skeleton = session_durable_state_persistence_adapter_skeleton();

            assert_eq!(
                skeleton.selected_connector(),
                ProductionSkeletonConnector::SessionProtocolAndStatePersistence
            );
            assert!(!skeleton.opens_storage_unlock_command());
            assert!(!skeleton.opens_transport_io());
            assert!(!skeleton.opens_runtime_messaging());
            assert!(!skeleton.adapter_implementation_ready());
            assert!(skeleton.ready_for_encrypted_record_adapter_spike());

            let pairwise_private = skeleton
                .record_policy(SessionDurableStateAdapterRecordKind::PairwiseIdentityPrivateKey);
            assert_eq!(
                pairwise_private.production_record_kind(),
                ProductionRecordKind::PairwiseIdentityPrivateKey
            );
            assert_eq!(
                pairwise_private.storage_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(pairwise_private.encrypted_record_allowed());
            assert!(pairwise_private.persistence_allowed());

            let noise_static =
                skeleton.record_policy(SessionDurableStateAdapterRecordKind::NoiseStaticPrivateKey);
            assert_eq!(
                noise_static.production_record_kind(),
                ProductionRecordKind::NoiseStaticPrivateKey
            );
            assert_eq!(
                noise_static.storage_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(noise_static.encrypted_record_allowed());
            assert!(noise_static.persistence_allowed());

            let replay =
                skeleton.record_policy(SessionDurableStateAdapterRecordKind::ReplayWindowState);
            assert_eq!(
                replay.production_record_kind(),
                ProductionRecordKind::ReplayWindowState
            );
            assert_eq!(
                replay.storage_protection(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(replay.encrypted_record_allowed());
            assert!(replay.persistence_allowed());

            let session_transport =
                skeleton.record_policy(SessionDurableStateAdapterRecordKind::SessionTransportState);
            assert_eq!(
                session_transport.production_record_kind(),
                ProductionRecordKind::SessionTransportState
            );
            assert_eq!(
                session_transport.storage_protection(),
                StorageProtection::InMemoryOnly
            );
            assert!(!session_transport.encrypted_record_allowed());
            assert!(!session_transport.persistence_allowed());
        }

        #[test]
        fn session_durable_state_encrypted_record_adapter_prepares_allowed_records_only() {
            let adapter = session_durable_state_encrypted_record_adapter_spike();
            assert!(!adapter.opens_storage_unlock_command());
            assert!(!adapter.opens_transport_io());
            assert!(!adapter.opens_runtime_messaging());
            assert!(!adapter.persists_records_to_store());

            let scope =
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("valid profile"));
            let record = adapter
                .prepare_record(
                    SessionDurableStateAdapterRecordKind::NoiseStaticPrivateKey,
                    scope.clone(),
                    b"adapter-spike-nonce".to_vec(),
                    b"sealed-noise-static-key-record".to_vec(),
                )
                .expect("noise static private key record can be prepared");
            assert_eq!(record.kind, ProductionRecordKind::NoiseStaticPrivateKey);
            assert_eq!(record.scope, scope);
            assert!(record
                .associated_data()
                .starts_with(b"AD-ENCRYPTED-RECORD-V1|noise-static-private-key|"));

            let rejected = adapter.prepare_record(
                SessionDurableStateAdapterRecordKind::SessionTransportState,
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("valid profile")),
                b"adapter-spike-nonce".to_vec(),
                b"sealed-session-transport-record".to_vec(),
            );
            assert!(matches!(
                rejected,
                Err(ProductionSessionError::Storage(
                    ProductionStorageError::Policy(
                        ProductionStoragePolicyError::PersistenceForbidden {
                            kind: ProductionRecordKind::SessionTransportState
                        }
                    )
                ))
            ));
        }

        #[test]
        fn production_setup_draft_signs_payload_with_noise_prekey_bundle() {
            let draft = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("setup draft");
            let decoded_payload =
                PairingPayload::decode(&draft.pairing.payload.encode().expect("payload encodes"))
                    .expect("payload decodes");
            let prekey =
                NoisePrekeyBundle::decode(&draft.pairing.payload.prekey_bundle).expect("prekey");

            assert_eq!(decoded_payload, draft.pairing.payload);
            assert_eq!(prekey.public_key(), draft.noise_static.public_key());
        }

        #[test]
        fn production_setup_drafts_can_plan_session() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");

            let plan = plan_session_from_verified_pairing_payloads(
                &alice.pairing.payload,
                &bob.pairing.payload,
            )
            .expect("session plan");

            assert_eq!(
                plan.local_noise_static_public_key,
                alice.noise_static.public_key()
            );
            assert_eq!(
                plan.remote_noise_static_public_key,
                bob.noise_static.public_key()
            );
        }

        #[test]
        fn production_setup_drafts_can_run_transcript_bound_handshake_smoke() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            let plaintext = b"session bootstrap message";

            let result =
                run_setup_draft_handshake_smoke(&alice, &bob, plaintext).expect("handshake smoke");

            assert_eq!(result.plaintext, plaintext);
            assert!(!result
                .ciphertext
                .windows(plaintext.len())
                .any(|window| window == plaintext));
        }

        #[test]
        fn production_setup_drafts_can_encrypt_and_decrypt_envelope() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            let plaintext = b"production envelope message";
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");

            let envelope = session
                .encrypt_from_canonical_dialer(1, plaintext)
                .expect("encrypt envelope");

            assert_eq!(envelope.protocol_version, 1);
            assert_eq!(envelope.channel_id, session.channel_id());
            assert_eq!(envelope.message_number, 1);
            assert_eq!(envelope.message_type, MessageType::Data);
            assert!(!envelope
                .padded_ciphertext
                .windows(plaintext.len())
                .any(|window| window == plaintext));
            assert_eq!(
                session
                    .decrypt_at_responder(&envelope)
                    .expect("decrypt envelope"),
                plaintext
            );
        }

        #[test]
        fn production_session_encrypts_endpoint_update_as_control_envelope() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            let current = PairwiseRendezvousEndpoint::new(
                ContactId::new("bob").expect("contact"),
                OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::TransportScoped,
            )
            .expect("current endpoint");
            let update = PairwiseEndpointUpdate::for_existing_encrypted_session(
                &current,
                OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
                EndpointUpdateChannel::ExistingEncryptedSession,
            )
            .expect("endpoint update");
            let plaintext = EndpointUpdateControlPlaintext::from_pairwise_update(&update);
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");

            let control = session
                .encrypt_endpoint_update_from_canonical_dialer(&update, 2)
                .expect("endpoint update control envelope");

            assert_eq!(control.contact_id(), current.contact_id());
            assert_eq!(control.envelope().protocol_version, 1);
            assert_eq!(control.envelope().channel_id, session.channel_id());
            assert_eq!(control.envelope().message_number, 2);
            assert_eq!(control.envelope().message_type, MessageType::Control);
            assert!(!control
                .envelope()
                .padded_ciphertext
                .windows("newsecret.onion".len())
                .any(|window| window == b"newsecret.onion"));

            let decrypted = session
                .decrypt_control_at_responder(control.envelope())
                .expect("decrypt endpoint update");
            assert_eq!(trim_padding(&decrypted), plaintext.encode().as_slice());

            let debug = format!("{control:?}");
            assert!(!debug.contains("bob"));
            assert!(!debug.contains("oldsecret.onion"));
            assert!(!debug.contains("newsecret.onion"));
        }

        #[test]
        fn production_envelope_session_rejects_tampered_ciphertext() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let mut envelope = session
                .encrypt_from_canonical_dialer(1, b"production envelope message")
                .expect("encrypt envelope");
            let last = envelope
                .padded_ciphertext
                .last_mut()
                .expect("ciphertext is non-empty");
            *last ^= 0x01;

            assert!(session.decrypt_at_responder(&envelope).is_err());
        }

        #[test]
        fn production_envelope_replay_window_rejects_duplicate_message() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let mut replay_window = ReplayWindow::new(4).expect("replay window");
            let envelope = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt envelope");

            assert_eq!(
                session
                    .decrypt_at_responder_with_replay(&envelope, &mut replay_window)
                    .expect("decrypt envelope"),
                b"message one"
            );
            assert_eq!(
                session.decrypt_at_responder_with_replay(&envelope, &mut replay_window),
                Err(ProductionSessionError::Protocol(
                    ProtocolError::ReplayMessage
                ))
            );
        }

        #[test]
        fn production_envelope_replay_window_rejects_old_message() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let mut replay_window = ReplayWindow::new(2).expect("replay window");
            let first = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt first");
            let second = session
                .encrypt_from_canonical_dialer(2, b"message two")
                .expect("encrypt second");
            let third = session
                .encrypt_from_canonical_dialer(3, b"message three")
                .expect("encrypt third");

            assert!(session
                .decrypt_at_responder_with_replay(&first, &mut replay_window)
                .is_ok());
            assert!(session
                .decrypt_at_responder_with_replay(&second, &mut replay_window)
                .is_ok());
            assert!(session
                .decrypt_at_responder_with_replay(&third, &mut replay_window)
                .is_ok());
            assert_eq!(
                session.decrypt_at_responder_with_replay(&first, &mut replay_window),
                Err(ProductionSessionError::Protocol(ProtocolError::OldMessage))
            );
        }

        #[test]
        fn production_envelope_tamper_does_not_advance_replay_window() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let mut replay_window = ReplayWindow::new(4).expect("replay window");
            let mut tampered = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt tampered");
            let last = tampered
                .padded_ciphertext
                .last_mut()
                .expect("ciphertext is non-empty");
            *last ^= 0x01;
            assert!(session
                .decrypt_at_responder_with_replay(&tampered, &mut replay_window)
                .is_err());

            let (alice, bob) = production_setup_pair();
            let mut fresh_session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("fresh envelope session");
            let valid = fresh_session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt valid");
            assert_eq!(replay_window.highest_seen(), 0);
            assert!(fresh_session
                .decrypt_at_responder_with_replay(&valid, &mut replay_window)
                .is_ok());
        }

        #[test]
        fn production_receive_persists_replay_after_successful_decrypt() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let (_dir, store) = production_test_store("persistent-replay-success");
            let record_id = session.replay_record_id();
            let scope = EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile"));
            let envelope = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt envelope");

            assert_eq!(
                session
                    .decrypt_at_responder_with_persistent_replay(
                        &envelope,
                        &store,
                        &record_id,
                        scope.clone(),
                        4,
                    )
                    .expect("decrypt envelope"),
                b"message one"
            );
            assert_eq!(
                store
                    .load_replay_window(&record_id)
                    .expect("load replay")
                    .expect("replay persisted")
                    .highest_seen(),
                1
            );
            assert_eq!(
                session.decrypt_at_responder_with_session_replay(&envelope, &store, scope, 4),
                Err(ProductionSessionError::Protocol(
                    ProtocolError::ReplayMessage
                ))
            );
        }

        #[test]
        fn production_receive_tamper_does_not_persist_replay_state() {
            let (alice, bob) = production_setup_pair();
            let mut session = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("envelope session");
            let (_dir, store) = production_test_store("persistent-replay-tamper");
            let record_id = session.replay_record_id();
            let scope = EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile"));
            let mut envelope = session
                .encrypt_from_canonical_dialer(1, b"message one")
                .expect("encrypt envelope");
            let last = envelope
                .padded_ciphertext
                .last_mut()
                .expect("ciphertext is non-empty");
            *last ^= 0x01;

            assert!(session
                .decrypt_at_responder_with_persistent_replay(
                    &envelope, &store, &record_id, scope, 4
                )
                .is_err());
            assert_eq!(
                store.load_replay_window(&record_id).expect("load replay"),
                None
            );
        }

        #[test]
        fn production_replay_record_id_is_session_scoped_and_opaque() {
            let (alice, bob) = production_setup_pair();
            let alice_bob = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("alice bob session");
            let (carol, dave) = production_setup_pair();
            let carol_dave = establish_envelope_session_from_setup_drafts(&carol, &dave)
                .expect("carol dave session");

            assert_eq!(alice_bob.replay_record_id(), alice_bob.replay_record_id());
            assert_ne!(alice_bob.replay_record_id(), carol_dave.replay_record_id());
            assert!(!format!("{:?}", alice_bob.replay_record_id()).contains("adchan1"));
            assert!(EncryptedRecordId::new(alice_bob.channel_id()).is_err());
        }

        #[test]
        fn production_message_record_ids_are_session_scoped_and_opaque() {
            let (alice, bob) = production_setup_pair();
            let alice_bob = establish_envelope_session_from_setup_drafts(&alice, &bob)
                .expect("alice bob session");
            let (carol, dave) = production_setup_pair();
            let carol_dave = establish_envelope_session_from_setup_drafts(&carol, &dave)
                .expect("carol dave session");
            let contact = ContactId::new("bob").expect("contact");

            let message_one = alice_bob.message_envelope_record_id(1, MessageType::Data);
            let message_two = alice_bob.message_envelope_record_id(2, MessageType::Data);
            let control_one = alice_bob.message_envelope_record_id(1, MessageType::Control);
            let other_session = carol_dave.message_envelope_record_id(1, MessageType::Data);
            let index_one = alice_bob.local_message_index_record_id(&contact, 1);
            let index_two = alice_bob.local_message_index_record_id(&contact, 2);

            assert_eq!(
                message_one,
                alice_bob.message_envelope_record_id(1, MessageType::Data)
            );
            assert_ne!(message_one, message_two);
            assert_ne!(message_one, control_one);
            assert_ne!(message_one, other_session);
            assert_ne!(index_one, index_two);
            for record_id in [message_one, control_one, index_one] {
                let debug = format!("{record_id:?}");
                assert!(!debug.contains("adchan1"));
                assert!(!debug.contains("bob"));
                assert!(!debug.contains(alice_bob.channel_id()));
            }
        }

        #[test]
        fn production_local_message_index_persists_through_encrypted_store() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let entry =
                LocalMessageIndexEntry::new(contact.clone(), 7, MessageType::Data).expect("entry");
            let (dir, store) = production_test_store("local-message-index");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                contact.clone(),
            );

            let record_id = session
                .save_local_message_index(&store, scope, &entry)
                .expect("save local message index");

            assert_eq!(
                session
                    .load_local_message_index(&store, &contact, 7)
                    .expect("load local message index"),
                Some(entry)
            );
            assert_eq!(
                record_id,
                session.local_message_index_record_id(&contact, 7)
            );
            let rendered_record_id = format!("{record_id:?}");
            assert!(!rendered_record_id.contains("alice"));
            assert!(!rendered_record_id.contains("bob"));
            assert!(!rendered_record_id.contains("adchan1"));

            let database_bytes = std::fs::read(dir.join("store.db")).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"ADMSGIDX1"));
            assert!(!contains_bytes(&database_bytes, b"bob"));
            assert!(!contains_bytes(&database_bytes, b"alice"));
        }

        #[test]
        fn production_local_message_index_rejects_scope_mismatch() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let entry = LocalMessageIndexEntry::new(
                ContactId::new("bob").expect("contact"),
                7,
                MessageType::Data,
            )
            .expect("entry");
            let (_dir, store) = production_test_store("local-message-index-scope-mismatch");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                ContactId::new("carol").expect("contact"),
            );

            assert_eq!(
                session.save_local_message_index(&store, scope, &entry),
                Err(ProductionSessionError::EndpointScopeMismatch)
            );
        }

        #[test]
        fn production_local_message_index_delete_uses_allocated_record_id() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let entry =
                LocalMessageIndexEntry::new(contact.clone(), 7, MessageType::Data).expect("entry");
            let (_dir, store) = production_test_store("local-message-index-delete");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                contact.clone(),
            );
            let record_id = session
                .save_local_message_index(&store, scope, &entry)
                .expect("save local message index");

            store
                .delete_local_message_index(&record_id)
                .expect("delete local message index");

            assert_eq!(
                session
                    .load_local_message_index(&store, &contact, 7)
                    .expect("load after delete"),
                None
            );
        }

        #[test]
        fn production_endpoint_state_persists_through_encrypted_store_with_opaque_record_id() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let endpoint = PairwiseRendezvousEndpoint::new(
                contact.clone(),
                OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint"),
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::TransportScoped,
            )
            .expect("pairwise endpoint");
            let (dir, store) = production_test_store("endpoint-state");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                contact.clone(),
            );

            let record_id = session
                .save_pairwise_endpoint_state(&store, scope, &endpoint)
                .expect("save endpoint state");

            assert_eq!(
                session
                    .load_pairwise_endpoint_state(&store, &contact)
                    .expect("load endpoint state"),
                Some(endpoint)
            );
            assert_eq!(record_id, session.endpoint_state_record_id(&contact));
            let rendered_record_id = format!("{record_id:?}");
            assert!(!rendered_record_id.contains("alice"));
            assert!(!rendered_record_id.contains("bob"));
            assert!(!rendered_record_id.contains("adchan1"));

            let database_bytes = std::fs::read(dir.join("store.db")).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"ADENDPOINTSTATE1"));
            assert!(!contains_bytes(&database_bytes, b"bobsecret.onion"));
            assert!(!contains_bytes(&database_bytes, b"alice"));
            assert!(!contains_bytes(&database_bytes, b"bob"));
        }

        #[test]
        fn production_endpoint_state_rejects_scope_mismatch() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let endpoint = PairwiseRendezvousEndpoint::new(
                ContactId::new("bob").expect("contact"),
                OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint"),
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::TransportScoped,
            )
            .expect("pairwise endpoint");
            let (_dir, store) = production_test_store("endpoint-state-scope-mismatch");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                ContactId::new("carol").expect("contact"),
            );

            assert_eq!(
                session.save_pairwise_endpoint_state(&store, scope, &endpoint),
                Err(ProductionSessionError::EndpointScopeMismatch)
            );
        }

        #[test]
        fn production_endpoint_state_delete_uses_opaque_record_id() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let endpoint = PairwiseRendezvousEndpoint::new(
                contact.clone(),
                OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint"),
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::TransportScoped,
            )
            .expect("pairwise endpoint");
            let (_dir, store) = production_test_store("endpoint-state-delete");
            let scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                contact.clone(),
            );

            session
                .save_pairwise_endpoint_state(&store, scope, &endpoint)
                .expect("save endpoint state");
            assert_eq!(
                session
                    .load_pairwise_endpoint_state(&store, &contact)
                    .expect("load endpoint state"),
                Some(endpoint)
            );

            session
                .delete_pairwise_endpoint_state(&store, &contact)
                .expect("delete endpoint state");

            assert_eq!(
                session
                    .load_pairwise_endpoint_state(&store, &contact)
                    .expect("load after delete"),
                None
            );
            let record_id = session.endpoint_state_record_id(&contact);
            let rendered_record_id = format!("{record_id:?}");
            assert!(!rendered_record_id.contains("bob"));
            assert!(!rendered_record_id.contains("adchan1"));
        }

        #[test]
        fn production_endpoint_state_delete_is_idempotent_for_missing_state() {
            let (alice, bob) = production_setup_pair();
            let session =
                establish_envelope_session_from_setup_drafts(&alice, &bob).expect("session");
            let contact = ContactId::new("bob").expect("contact");
            let (_dir, store) = production_test_store("endpoint-state-delete-missing");

            session
                .delete_pairwise_endpoint_state(&store, &contact)
                .expect("first delete endpoint state");
            session
                .delete_pairwise_endpoint_state(&store, &contact)
                .expect("second delete endpoint state");
            assert_eq!(
                session
                    .load_pairwise_endpoint_state(&store, &contact)
                    .expect("load missing endpoint state"),
                None
            );
        }

        fn production_setup_pair() -> (ProductionSetupDraft, ProductionSetupDraft) {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            (alice, bob)
        }

        fn production_test_store(test_name: &str) -> (std::path::PathBuf, SqlCipherRecordStore) {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-core-sqlcipher-{test_name}-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale test dir");
            }
            std::fs::create_dir_all(&dir).expect("create test dir");
            let locked = LockedProfileStore::new(dir.join("store.db"));
            let passphrase = ProfilePassphrase::new("test-passphrase").expect("passphrase");
            let store = locked.unlock(&passphrase).expect("unlock store");
            (dir, store)
        }

        fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
            haystack
                .windows(needle.len())
                .any(|window| window == needle)
        }

        #[test]
        fn production_setup_handshake_rejects_noise_static_key_mismatch() {
            let alice = production_setup_draft_with_defaults(
                &ProfileName::new("alice").expect("valid profile"),
                "alice.onion",
            )
            .expect("alice setup");
            let mut bob = production_setup_draft_with_defaults(
                &ProfileName::new("bob").expect("valid profile"),
                "bob.onion",
            )
            .expect("bob setup");
            bob.noise_static = generate_noise_static_keypair().expect("replacement keypair");

            assert_eq!(
                run_setup_draft_handshake_smoke(&alice, &bob, b"body"),
                Err(ProductionSessionError::NoiseStaticKeyMismatch)
            );
        }

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
                alice_view.local_rendezvous_endpoint.contact_id().as_str(),
                "alice"
            );
            assert_eq!(
                alice_view.local_rendezvous_endpoint.endpoint().as_str(),
                "alice.onion"
            );
            assert_eq!(
                alice_view.remote_rendezvous_endpoint.contact_id().as_str(),
                "bob"
            );
            assert_eq!(
                bob_view.local_rendezvous_endpoint.contact_id().as_str(),
                "bob"
            );
            assert_eq!(
                bob_view.remote_rendezvous_endpoint.contact_id().as_str(),
                "alice"
            );
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
        fn production_session_plan_resolves_duplicate_connections_without_timing_rules() {
            let alice_prekey = noise_prekey_bundle();
            let bob_prekey = noise_prekey_bundle();
            let alice = production_payload("alice", [51_u8; 32], "alice.onion", &alice_prekey);
            let bob = production_payload("bob", [52_u8; 32], "bob.onion", &bob_prekey);

            let alice_view =
                plan_session_from_verified_pairing_payloads(&alice, &bob).expect("session plan");
            let bob_view =
                plan_session_from_verified_pairing_payloads(&bob, &alice).expect("session plan");

            assert_eq!(
                alice_view.canonical_dialer_public_key,
                bob_view.canonical_dialer_public_key
            );
            assert_ne!(
                alice_view.canonical_connection_direction(),
                bob_view.canonical_connection_direction()
            );

            let duplicate_direction = alice_view.canonical_connection_direction().opposite();

            assert!(alice_view
                .is_canonical_connection_direction(alice_view.canonical_connection_direction()));
            assert!(!alice_view.is_canonical_connection_direction(duplicate_direction));
            assert_eq!(
                alice_view.duplicate_connection_action(
                    alice_view.canonical_connection_direction(),
                    CanonicalConnectionState::MissingOrUnauthenticated,
                ),
                DuplicateConnectionAction::KeepCanonicalConnection
            );
            assert_eq!(
                alice_view.duplicate_connection_action(
                    duplicate_direction,
                    CanonicalConnectionState::MissingOrUnauthenticated,
                ),
                DuplicateConnectionAction::WaitForCanonicalConnection
            );
            assert_eq!(
                alice_view.duplicate_connection_action(
                    duplicate_direction,
                    CanonicalConnectionState::AuthenticatedUnhealthy,
                ),
                DuplicateConnectionAction::WaitForCanonicalConnection
            );
            assert_eq!(
                alice_view.duplicate_connection_action(
                    duplicate_direction,
                    CanonicalConnectionState::AuthenticatedHealthy,
                ),
                DuplicateConnectionAction::CloseDuplicateConnection
            );
        }

        #[test]
        fn production_session_plan_rejects_invalid_or_shared_rendezvous_endpoint() {
            let alice =
                production_payload("alice", [51_u8; 32], "alice.onion", &noise_prekey_bundle());
            let invalid_endpoint =
                production_payload("bob", [52_u8; 32], "bob.example", &noise_prekey_bundle());
            let shared_endpoint =
                production_payload("bob", [53_u8; 32], "alice.onion", &noise_prekey_bundle());

            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &invalid_endpoint),
                Err(ProductionSessionError::InvalidRendezvousEndpoint)
            );
            assert_eq!(
                plan_session_from_verified_pairing_payloads(&alice, &shared_endpoint),
                Err(ProductionSessionError::SameRendezvousEndpoint)
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
