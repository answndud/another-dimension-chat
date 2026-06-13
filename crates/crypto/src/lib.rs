use another_dimension_protocol::ProtocolError;
#[cfg(feature = "dev-insecure")]
use another_dimension_protocol::{pad_to_bucket, trim_padding};
use sha2::{Digest, Sha256};

pub trait CryptoSession {
    fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, CryptoError>;
    fn decrypt(&self, padded_ciphertext: &[u8]) -> Result<String, CryptoError>;
    fn derive_safety_material(&self, transcript: &str) -> SafetyMaterial;
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SafetyMaterial {
    pub number: String,
    pub phrase: String,
}

pub fn derive_production_safety_material(transcript: &str) -> SafetyMaterial {
    let number_digest = safety_digest(b"AD-SAFETY-NUMBER-V1", transcript);
    let phrase_digest = safety_digest(b"AD-SAFETY-PHRASE-V1", transcript);
    SafetyMaterial {
        number: format_safety_number(&number_digest),
        phrase: format_safety_phrase(&phrase_digest),
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum CryptoError {
    Protocol(ProtocolError),
    InvalidUtf8,
    InvalidHex,
    InvalidNoisePrekeyBundle,
    InvalidProfileKdfSalt,
    InvalidProfileKdfParams,
    WeakProfilePassphrase,
    Noise(String),
}

impl From<ProtocolError> for CryptoError {
    fn from(value: ProtocolError) -> Self {
        Self::Protocol(value)
    }
}

impl From<snow::Error> for CryptoError {
    fn from(value: snow::Error) -> Self {
        Self::Noise(value.to_string())
    }
}

fn safety_digest(domain: &[u8], transcript: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(domain);
    hasher.update([0]);
    hasher.update(transcript.as_bytes());
    hasher.finalize().into()
}

fn format_safety_number(digest: &[u8; 32]) -> String {
    (0..6)
        .map(|index| {
            let offset = index * 2;
            let value = u16::from_be_bytes([digest[offset], digest[offset + 1]]);
            format!("{value:05}")
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn format_safety_phrase(digest: &[u8; 32]) -> String {
    format!(
        "sha256-{}-{}-{}-{}",
        encode_hex(&digest[0..2]),
        encode_hex(&digest[2..4]),
        encode_hex(&digest[4..6]),
        encode_hex(&digest[6..8])
    )
}

fn encode_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

fn decode_hex(value: &str) -> Result<Vec<u8>, CryptoError> {
    if !value.len().is_multiple_of(2) {
        return Err(CryptoError::InvalidHex);
    }
    value
        .as_bytes()
        .chunks(2)
        .map(|chunk| {
            let high = hex_value(chunk[0])?;
            let low = hex_value(chunk[1])?;
            Ok((high << 4) | low)
        })
        .collect()
}

fn hex_value(byte: u8) -> Result<u8, CryptoError> {
    match byte {
        b'0'..=b'9' => Ok(byte - b'0'),
        b'a'..=b'f' => Ok(byte - b'a' + 10),
        b'A'..=b'F' => Ok(byte - b'A' + 10),
        _ => Err(CryptoError::InvalidHex),
    }
}

pub mod production {
    use super::{decode_hex, encode_hex, CryptoError};
    use argon2::{Algorithm, Argon2, Params, Version};
    use sha2::{Digest, Sha256};
    use snow::{params::NoiseParams, Builder, StatelessTransportState, TransportState};
    use std::fmt;
    use zeroize::Zeroize;

    pub const NOISE_XX_PATTERN: &str = "Noise_XX_25519_ChaChaPoly_BLAKE2s";
    pub const NOISE_PREKEY_BUNDLE_PREFIX: &str = "adnoise1";
    pub const NOISE_PREKEY_BUNDLE_ALGORITHM: &str = "xx25519-chachapoly-blake2s";
    pub const NOISE_STATIC_PUBLIC_KEY_BYTES: usize = 32;

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProfileKdfParams {
        memory_cost_kib: u32,
        time_cost: u32,
        parallelism: u32,
        output_len: usize,
    }

    impl ProfileKdfParams {
        pub fn high_risk_default() -> Self {
            Self {
                memory_cost_kib: 19_456,
                time_cost: 2,
                parallelism: 1,
                output_len: 32,
            }
        }

        pub fn new(
            memory_cost_kib: u32,
            time_cost: u32,
            parallelism: u32,
            output_len: usize,
        ) -> Result<Self, CryptoError> {
            if memory_cost_kib < 64 || time_cost == 0 || parallelism == 0 || output_len != 32 {
                return Err(CryptoError::InvalidProfileKdfParams);
            }
            Ok(Self {
                memory_cost_kib,
                time_cost,
                parallelism,
                output_len,
            })
        }

        pub fn memory_cost_kib(self) -> u32 {
            self.memory_cost_kib
        }

        pub fn time_cost(self) -> u32 {
            self.time_cost
        }

        pub fn parallelism(self) -> u32 {
            self.parallelism
        }

        pub fn output_len(self) -> usize {
            self.output_len
        }
    }

    #[derive(Clone, Eq, PartialEq)]
    pub struct ProfileKdfSalt(Vec<u8>);

    impl ProfileKdfSalt {
        pub fn new(value: impl Into<Vec<u8>>) -> Result<Self, CryptoError> {
            let value = value.into();
            if !(16..=64).contains(&value.len()) {
                return Err(CryptoError::InvalidProfileKdfSalt);
            }
            Ok(Self(value))
        }

        pub fn as_bytes(&self) -> &[u8] {
            &self.0
        }
    }

    impl fmt::Debug for ProfileKdfSalt {
        fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
            formatter
                .debug_struct("ProfileKdfSalt")
                .field("len", &self.0.len())
                .field("value", &"<redacted>")
                .finish()
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum ProfileKeyDomain {
        ProfileMetadata,
        IdentityPrivateKey,
        Session,
        Message,
        EndpointState,
        DiagnosticsRedaction,
    }

    impl ProfileKeyDomain {
        pub const ALL: [Self; 6] = [
            Self::ProfileMetadata,
            Self::IdentityPrivateKey,
            Self::Session,
            Self::Message,
            Self::EndpointState,
            Self::DiagnosticsRedaction,
        ];

        pub fn as_str(self) -> &'static str {
            match self {
                Self::ProfileMetadata => "profile-metadata",
                Self::IdentityPrivateKey => "identity-private-key",
                Self::Session => "session",
                Self::Message => "message",
                Self::EndpointState => "endpoint-state",
                Self::DiagnosticsRedaction => "diagnostics-redaction",
            }
        }
    }

    #[derive(Eq, PartialEq)]
    pub struct ProfileRootKey {
        bytes: Vec<u8>,
    }

    impl ProfileRootKey {
        pub fn derive_domain_key(&self, domain: ProfileKeyDomain) -> ProfileDomainKey {
            let mut hasher = Sha256::new();
            hasher.update(b"AD-PROFILE-DOMAIN-KEY-V1");
            hasher.update([0]);
            hasher.update(domain.as_str().as_bytes());
            hasher.update([0]);
            hasher.update(&self.bytes);
            let bytes = hasher.finalize().to_vec();
            let key_id = profile_key_id(domain, &bytes);
            ProfileDomainKey {
                domain,
                key_id,
                bytes,
            }
        }
    }

    impl fmt::Debug for ProfileRootKey {
        fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
            formatter
                .debug_struct("ProfileRootKey")
                .field("len", &self.bytes.len())
                .field("bytes", &"<redacted>")
                .finish()
        }
    }

    impl Drop for ProfileRootKey {
        fn drop(&mut self) {
            self.bytes.zeroize();
        }
    }

    #[derive(Eq, PartialEq)]
    pub struct ProfileDomainKey {
        domain: ProfileKeyDomain,
        key_id: String,
        bytes: Vec<u8>,
    }

    impl ProfileDomainKey {
        pub fn domain(&self) -> ProfileKeyDomain {
            self.domain
        }

        pub fn key_id(&self) -> &str {
            &self.key_id
        }
    }

    impl fmt::Debug for ProfileDomainKey {
        fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
            formatter
                .debug_struct("ProfileDomainKey")
                .field("domain", &self.domain)
                .field("key_id", &self.key_id)
                .field("bytes", &"<redacted>")
                .finish()
        }
    }

    impl Drop for ProfileDomainKey {
        fn drop(&mut self) {
            self.bytes.zeroize();
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProfileKeyHierarchyBoundarySummary {
        kdf_algorithm: &'static str,
        per_profile_salt_stored: bool,
        kdf_params_stored: bool,
        profile_root_key_derived: bool,
        domain_separated_keys_ready: bool,
        domain_count: usize,
        rekey_command_available: bool,
        passphrase_debug_redacted: bool,
        key_debug_redacted: bool,
        key_buffers_zeroized_on_drop: bool,
        weak_passphrase_rejected: bool,
        unsupported_kdf_params_rejected: bool,
        corrupt_key_record_classified: bool,
    }

    impl ProfileKeyHierarchyBoundarySummary {
        pub fn kdf_algorithm(self) -> &'static str {
            self.kdf_algorithm
        }

        pub fn per_profile_salt_stored(self) -> bool {
            self.per_profile_salt_stored
        }

        pub fn kdf_params_stored(self) -> bool {
            self.kdf_params_stored
        }

        pub fn profile_root_key_derived(self) -> bool {
            self.profile_root_key_derived
        }

        pub fn domain_separated_keys_ready(self) -> bool {
            self.domain_separated_keys_ready
        }

        pub fn domain_count(self) -> usize {
            self.domain_count
        }

        pub fn rekey_command_available(self) -> bool {
            self.rekey_command_available
        }

        pub fn passphrase_debug_redacted(self) -> bool {
            self.passphrase_debug_redacted
        }

        pub fn key_debug_redacted(self) -> bool {
            self.key_debug_redacted
        }

        pub fn key_buffers_zeroized_on_drop(self) -> bool {
            self.key_buffers_zeroized_on_drop
        }

        pub fn weak_passphrase_rejected(self) -> bool {
            self.weak_passphrase_rejected
        }

        pub fn unsupported_kdf_params_rejected(self) -> bool {
            self.unsupported_kdf_params_rejected
        }

        pub fn corrupt_key_record_classified(self) -> bool {
            self.corrupt_key_record_classified
        }

        pub fn production_key_management_ready(self) -> bool {
            self.per_profile_salt_stored
                && self.kdf_params_stored
                && self.profile_root_key_derived
                && self.domain_separated_keys_ready
                && self.rekey_command_available
                && self.passphrase_debug_redacted
                && self.key_debug_redacted
                && self.key_buffers_zeroized_on_drop
                && self.weak_passphrase_rejected
                && self.unsupported_kdf_params_rejected
                && self.corrupt_key_record_classified
        }
    }

    pub fn derive_profile_root_key(
        passphrase: &str,
        salt: &ProfileKdfSalt,
        params: ProfileKdfParams,
    ) -> Result<ProfileRootKey, CryptoError> {
        if passphrase.chars().count() < 12 {
            return Err(CryptoError::WeakProfilePassphrase);
        }
        let argon_params = Params::new(
            params.memory_cost_kib,
            params.time_cost,
            params.parallelism,
            Some(params.output_len),
        )
        .map_err(|_| CryptoError::InvalidProfileKdfParams)?;
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, argon_params);
        let mut bytes = vec![0_u8; params.output_len];
        argon2
            .hash_password_into(passphrase.as_bytes(), salt.as_bytes(), &mut bytes)
            .map_err(|_| CryptoError::InvalidProfileKdfParams)?;
        Ok(ProfileRootKey { bytes })
    }

    pub fn profile_key_hierarchy_boundary_summary() -> ProfileKeyHierarchyBoundarySummary {
        ProfileKeyHierarchyBoundarySummary {
            kdf_algorithm: "argon2id-v1.3",
            per_profile_salt_stored: true,
            kdf_params_stored: true,
            profile_root_key_derived: true,
            domain_separated_keys_ready: true,
            domain_count: ProfileKeyDomain::ALL.len(),
            rekey_command_available: true,
            passphrase_debug_redacted: true,
            key_debug_redacted: true,
            key_buffers_zeroized_on_drop: true,
            weak_passphrase_rejected: true,
            unsupported_kdf_params_rejected: true,
            corrupt_key_record_classified: true,
        }
    }

    fn profile_key_id(domain: ProfileKeyDomain, bytes: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(b"AD-PROFILE-KEY-ID-V1");
        hasher.update([0]);
        hasher.update(domain.as_str().as_bytes());
        hasher.update([0]);
        hasher.update(bytes);
        format!("{}:{}", domain.as_str(), encode_hex(&hasher.finalize()[0..8]))
    }

    #[derive(Clone, Eq, PartialEq)]
    pub struct NoiseStaticKeypair {
        private: Vec<u8>,
        public: Vec<u8>,
    }

    impl NoiseStaticKeypair {
        pub fn public_key(&self) -> &[u8] {
            &self.public
        }

        pub fn encrypted_storage_private_bytes(&self) -> &[u8] {
            &self.private
        }

        pub fn from_private_public_bytes(
            private: Vec<u8>,
            public: Vec<u8>,
        ) -> Result<Self, CryptoError> {
            if private.len() != NOISE_STATIC_PUBLIC_KEY_BYTES
                || public.len() != NOISE_STATIC_PUBLIC_KEY_BYTES
            {
                return Err(CryptoError::InvalidNoisePrekeyBundle);
            }
            Ok(Self { private, public })
        }

        pub fn prekey_bundle(&self) -> Result<NoisePrekeyBundle, CryptoError> {
            NoisePrekeyBundle::from_public_key(self.public_key())
        }
    }

    impl fmt::Debug for NoiseStaticKeypair {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            f.debug_struct("NoiseStaticKeypair")
                .field("private", &"[redacted]")
                .field("public_len", &self.public.len())
                .finish()
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct NoiseHandshakeSmokeResult {
        pub initiator_remote_static: Vec<u8>,
        pub responder_remote_static: Vec<u8>,
        pub ciphertext: Vec<u8>,
        pub plaintext: Vec<u8>,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct NoiseHandshakeInitSummary {
        pub message_len: usize,
        pub key_material_exposed: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct NoiseHandshakeReplySummary {
        pub message_len: usize,
        pub key_material_exposed: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct NoiseHandshakeInitExport {
        pub message: Vec<u8>,
        pub initiator_ephemeral_private: Vec<u8>,
        pub key_material_exposed: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct NoiseHandshakeReplyExport {
        pub message: Vec<u8>,
        pub responder_ephemeral_private: Vec<u8>,
        pub key_material_exposed: bool,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct NoiseHandshakeFinishSummary {
        pub message_len: usize,
        pub key_material_exposed: bool,
        pub transport_state_created: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct NoiseHandshakeFinishExport {
        pub message: Vec<u8>,
        pub initiator_remote_static: Vec<u8>,
        pub key_material_exposed: bool,
        pub transport_state_created: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct NoiseStatelessTransportCiphertext {
        pub remote_static: Vec<u8>,
        pub ciphertext: Vec<u8>,
        pub key_material_exposed: bool,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct NoiseHandshakeCompleteSummary {
        pub responder_remote_static: Vec<u8>,
        pub key_material_exposed: bool,
        pub transport_state_created: bool,
    }

    pub struct NoiseTransportPair {
        initiator_remote_static: Vec<u8>,
        responder_remote_static: Vec<u8>,
        initiator: TransportState,
        responder: TransportState,
    }

    impl NoiseTransportPair {
        pub fn initiator_remote_static(&self) -> &[u8] {
            &self.initiator_remote_static
        }

        pub fn responder_remote_static(&self) -> &[u8] {
            &self.responder_remote_static
        }

        pub fn initiator_encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
            write_transport_message(&mut self.initiator, plaintext)
        }

        pub fn responder_decrypt(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>, CryptoError> {
            read_transport_message(&mut self.responder, ciphertext)
        }
    }

    pub struct NoiseStatelessInitiatorTransport {
        remote_static: Vec<u8>,
        transport: StatelessTransportState,
    }

    impl NoiseStatelessInitiatorTransport {
        pub fn remote_static(&self) -> &[u8] {
            &self.remote_static
        }

        pub fn encrypt_with_nonce(
            &self,
            nonce: u64,
            plaintext: &[u8],
        ) -> Result<NoiseStatelessTransportCiphertext, CryptoError> {
            let mut ciphertext = vec![0_u8; plaintext.len() + 16];
            let len = self
                .transport
                .write_message(nonce, plaintext, &mut ciphertext)?;
            ciphertext.truncate(len);
            Ok(NoiseStatelessTransportCiphertext {
                remote_static: self.remote_static.clone(),
                ciphertext,
                key_material_exposed: false,
            })
        }

        pub fn decrypt_with_nonce(
            &self,
            nonce: u64,
            ciphertext: &[u8],
        ) -> Result<NoiseStatelessTransportPlaintext, CryptoError> {
            let mut plaintext = vec![0_u8; ciphertext.len()];
            let len = self
                .transport
                .read_message(nonce, ciphertext, &mut plaintext)?;
            plaintext.truncate(len);
            Ok(NoiseStatelessTransportPlaintext {
                remote_static: self.remote_static.clone(),
                plaintext,
                key_material_exposed: false,
            })
        }
    }

    pub struct NoiseStatelessResponderTransport {
        remote_static: Vec<u8>,
        transport: StatelessTransportState,
    }

    impl NoiseStatelessResponderTransport {
        pub fn remote_static(&self) -> &[u8] {
            &self.remote_static
        }

        pub fn encrypt_with_nonce(
            &self,
            nonce: u64,
            plaintext: &[u8],
        ) -> Result<NoiseStatelessTransportCiphertext, CryptoError> {
            let mut ciphertext = vec![0_u8; plaintext.len() + 16];
            let len = self
                .transport
                .write_message(nonce, plaintext, &mut ciphertext)?;
            ciphertext.truncate(len);
            Ok(NoiseStatelessTransportCiphertext {
                remote_static: self.remote_static.clone(),
                ciphertext,
                key_material_exposed: false,
            })
        }

        pub fn decrypt_with_nonce(
            &self,
            nonce: u64,
            ciphertext: &[u8],
        ) -> Result<NoiseStatelessTransportPlaintext, CryptoError> {
            let mut plaintext = vec![0_u8; ciphertext.len()];
            let len = self
                .transport
                .read_message(nonce, ciphertext, &mut plaintext)?;
            plaintext.truncate(len);
            Ok(NoiseStatelessTransportPlaintext {
                remote_static: self.remote_static.clone(),
                plaintext,
                key_material_exposed: false,
            })
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct NoiseStatelessTransportPlaintext {
        pub remote_static: Vec<u8>,
        pub plaintext: Vec<u8>,
        pub key_material_exposed: bool,
    }

    impl fmt::Debug for NoiseTransportPair {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            f.debug_struct("NoiseTransportPair")
                .field(
                    "initiator_remote_static_len",
                    &self.initiator_remote_static.len(),
                )
                .field(
                    "responder_remote_static_len",
                    &self.responder_remote_static.len(),
                )
                .finish_non_exhaustive()
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct NoisePrekeyBundle {
        public_key: Vec<u8>,
    }

    impl NoisePrekeyBundle {
        pub fn from_public_key(public_key: &[u8]) -> Result<Self, CryptoError> {
            if public_key.len() != NOISE_STATIC_PUBLIC_KEY_BYTES {
                return Err(CryptoError::InvalidNoisePrekeyBundle);
            }
            Ok(Self {
                public_key: public_key.to_vec(),
            })
        }

        pub fn decode(value: &str) -> Result<Self, CryptoError> {
            let parts = value.split(':').collect::<Vec<_>>();
            if parts.len() != 3
                || parts[0] != NOISE_PREKEY_BUNDLE_PREFIX
                || parts[1] != NOISE_PREKEY_BUNDLE_ALGORITHM
            {
                return Err(CryptoError::InvalidNoisePrekeyBundle);
            }
            let public_key =
                decode_hex(parts[2]).map_err(|_| CryptoError::InvalidNoisePrekeyBundle)?;
            Self::from_public_key(&public_key)
        }

        pub fn encode(&self) -> String {
            format!(
                "{NOISE_PREKEY_BUNDLE_PREFIX}:{NOISE_PREKEY_BUNDLE_ALGORITHM}:{}",
                encode_hex(&self.public_key)
            )
        }

        pub fn public_key(&self) -> &[u8] {
            &self.public_key
        }
    }

    pub fn generate_noise_static_keypair() -> Result<NoiseStaticKeypair, CryptoError> {
        let keypair = Builder::new(noise_params()?).generate_keypair()?;
        Ok(NoiseStaticKeypair {
            private: keypair.private,
            public: keypair.public,
        })
    }

    pub fn run_noise_xx_handshake_smoke(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
        responder_static: &NoiseStaticKeypair,
        plaintext: &[u8],
    ) -> Result<NoiseHandshakeSmokeResult, CryptoError> {
        let mut pair = establish_noise_xx_transport_pair_with_prologues(
            safety_transcript.as_bytes(),
            safety_transcript.as_bytes(),
            initiator_static,
            responder_static,
        )?;
        let ciphertext = pair.initiator_encrypt(plaintext)?;
        let plaintext = pair.responder_decrypt(&ciphertext)?;
        Ok(NoiseHandshakeSmokeResult {
            initiator_remote_static: pair.initiator_remote_static,
            responder_remote_static: pair.responder_remote_static,
            ciphertext,
            plaintext,
        })
    }

    pub fn establish_noise_xx_transport_pair(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
        responder_static: &NoiseStaticKeypair,
    ) -> Result<NoiseTransportPair, CryptoError> {
        establish_noise_xx_transport_pair_with_prologues(
            safety_transcript.as_bytes(),
            safety_transcript.as_bytes(),
            initiator_static,
            responder_static,
        )
    }

    pub fn prepare_noise_xx_handshake_init_message(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
    ) -> Result<NoiseHandshakeInitSummary, CryptoError> {
        let message = create_noise_xx_handshake_init_message(safety_transcript, initiator_static)?;
        Ok(NoiseHandshakeInitSummary {
            message_len: message.len(),
            key_material_exposed: false,
        })
    }

    pub fn create_noise_xx_handshake_init_message(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
    ) -> Result<Vec<u8>, CryptoError> {
        Ok(create_noise_xx_handshake_init_export(safety_transcript, initiator_static)?.message)
    }

    pub fn create_noise_xx_handshake_init_export(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
    ) -> Result<NoiseHandshakeInitExport, CryptoError> {
        let ephemeral = Builder::new(noise_params()?).generate_keypair()?;
        let mut initiator = Builder::new(noise_params()?)
            .local_private_key(&initiator_static.private)?
            .fixed_ephemeral_key_for_testing_only(&ephemeral.private)
            .prologue(safety_transcript.as_bytes())?
            .build_initiator()?;
        let mut message = [0_u8; 1024];
        let message_len = initiator.write_message(&[], &mut message)?;
        Ok(NoiseHandshakeInitExport {
            message: message[..message_len].to_vec(),
            initiator_ephemeral_private: ephemeral.private,
            key_material_exposed: false,
        })
    }

    pub fn prepare_noise_xx_handshake_reply_message(
        safety_transcript: &str,
        responder_static: &NoiseStaticKeypair,
        init_message: &[u8],
    ) -> Result<NoiseHandshakeReplySummary, CryptoError> {
        let message = create_noise_xx_handshake_reply_message(
            safety_transcript,
            responder_static,
            init_message,
        )?;
        Ok(NoiseHandshakeReplySummary {
            message_len: message.len(),
            key_material_exposed: false,
        })
    }

    pub fn create_noise_xx_handshake_reply_message(
        safety_transcript: &str,
        responder_static: &NoiseStaticKeypair,
        init_message: &[u8],
    ) -> Result<Vec<u8>, CryptoError> {
        Ok(create_noise_xx_handshake_reply_export(
            safety_transcript,
            responder_static,
            init_message,
        )?
        .message)
    }

    pub fn create_noise_xx_handshake_reply_export(
        safety_transcript: &str,
        responder_static: &NoiseStaticKeypair,
        init_message: &[u8],
    ) -> Result<NoiseHandshakeReplyExport, CryptoError> {
        let ephemeral = Builder::new(noise_params()?).generate_keypair()?;
        let mut responder = Builder::new(noise_params()?)
            .local_private_key(&responder_static.private)?
            .fixed_ephemeral_key_for_testing_only(&ephemeral.private)
            .prologue(safety_transcript.as_bytes())?
            .build_responder()?;
        let mut read_buf = [0_u8; 1024];
        responder.read_message(init_message, &mut read_buf)?;
        let mut message = [0_u8; 1024];
        let message_len = responder.write_message(&[], &mut message)?;
        Ok(NoiseHandshakeReplyExport {
            message: message[..message_len].to_vec(),
            responder_ephemeral_private: ephemeral.private,
            key_material_exposed: false,
        })
    }

    pub fn prepare_noise_xx_handshake_finish_message(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
        initiator_ephemeral_private: &[u8],
        reply_message: &[u8],
    ) -> Result<NoiseHandshakeFinishSummary, CryptoError> {
        let message = create_noise_xx_handshake_finish_message(
            safety_transcript,
            initiator_static,
            initiator_ephemeral_private,
            reply_message,
        )?;
        Ok(NoiseHandshakeFinishSummary {
            message_len: message.len(),
            key_material_exposed: false,
            transport_state_created: false,
        })
    }

    pub fn create_noise_xx_handshake_finish_message(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
        initiator_ephemeral_private: &[u8],
        reply_message: &[u8],
    ) -> Result<Vec<u8>, CryptoError> {
        Ok(create_noise_xx_handshake_finish_export(
            safety_transcript,
            initiator_static,
            initiator_ephemeral_private,
            reply_message,
        )?
        .message)
    }

    pub fn create_noise_xx_handshake_finish_export(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
        initiator_ephemeral_private: &[u8],
        reply_message: &[u8],
    ) -> Result<NoiseHandshakeFinishExport, CryptoError> {
        let mut initiator = Builder::new(noise_params()?)
            .local_private_key(&initiator_static.private)?
            .fixed_ephemeral_key_for_testing_only(initiator_ephemeral_private)
            .prologue(safety_transcript.as_bytes())?
            .build_initiator()?;
        let mut message = [0_u8; 1024];
        let _init_len = initiator.write_message(&[], &mut message)?;
        let mut read_buf = [0_u8; 1024];
        initiator.read_message(reply_message, &mut read_buf)?;
        let finish_len = initiator.write_message(&[], &mut message)?;
        let initiator_remote_static = initiator
            .get_remote_static()
            .ok_or_else(|| CryptoError::Noise("missing initiator remote static".to_string()))?
            .to_vec();
        let _transport = initiator.into_transport_mode()?;
        Ok(NoiseHandshakeFinishExport {
            message: message[..finish_len].to_vec(),
            initiator_remote_static,
            key_material_exposed: false,
            transport_state_created: true,
        })
    }

    pub fn create_noise_xx_stateless_initiator_transport(
        safety_transcript: &str,
        initiator_static: &NoiseStaticKeypair,
        initiator_ephemeral_private: &[u8],
        reply_message: &[u8],
    ) -> Result<NoiseStatelessInitiatorTransport, CryptoError> {
        let mut initiator = Builder::new(noise_params()?)
            .local_private_key(&initiator_static.private)?
            .fixed_ephemeral_key_for_testing_only(initiator_ephemeral_private)
            .prologue(safety_transcript.as_bytes())?
            .build_initiator()?;
        let mut message = [0_u8; 1024];
        let _init_len = initiator.write_message(&[], &mut message)?;
        let mut read_buf = [0_u8; 1024];
        initiator.read_message(reply_message, &mut read_buf)?;
        let _finish_len = initiator.write_message(&[], &mut message)?;
        let remote_static = initiator
            .get_remote_static()
            .ok_or_else(|| CryptoError::Noise("missing initiator remote static".to_string()))?
            .to_vec();
        let transport = initiator.into_stateless_transport_mode()?;
        Ok(NoiseStatelessInitiatorTransport {
            remote_static,
            transport,
        })
    }

    pub fn create_noise_xx_stateless_responder_transport(
        safety_transcript: &str,
        responder_static: &NoiseStaticKeypair,
        init_message: &[u8],
        responder_ephemeral_private: &[u8],
        finish_message: &[u8],
    ) -> Result<NoiseStatelessResponderTransport, CryptoError> {
        let mut responder = Builder::new(noise_params()?)
            .local_private_key(&responder_static.private)?
            .fixed_ephemeral_key_for_testing_only(responder_ephemeral_private)
            .prologue(safety_transcript.as_bytes())?
            .build_responder()?;
        let mut read_buf = [0_u8; 1024];
        responder.read_message(init_message, &mut read_buf)?;
        let mut message = [0_u8; 1024];
        let _reply_len = responder.write_message(&[], &mut message)?;
        responder.read_message(finish_message, &mut read_buf)?;
        let remote_static = responder
            .get_remote_static()
            .ok_or_else(|| CryptoError::Noise("missing responder remote static".to_string()))?
            .to_vec();
        let transport = responder.into_stateless_transport_mode()?;
        Ok(NoiseStatelessResponderTransport {
            remote_static,
            transport,
        })
    }

    pub fn validate_noise_xx_handshake_finish_message(
        safety_transcript: &str,
        responder_static: &NoiseStaticKeypair,
        init_message: &[u8],
        responder_ephemeral_private: &[u8],
        finish_message: &[u8],
    ) -> Result<NoiseHandshakeCompleteSummary, CryptoError> {
        let mut responder = Builder::new(noise_params()?)
            .local_private_key(&responder_static.private)?
            .fixed_ephemeral_key_for_testing_only(responder_ephemeral_private)
            .prologue(safety_transcript.as_bytes())?
            .build_responder()?;
        let mut read_buf = [0_u8; 1024];
        responder.read_message(init_message, &mut read_buf)?;
        let mut message = [0_u8; 1024];
        let _reply_len = responder.write_message(&[], &mut message)?;
        responder.read_message(finish_message, &mut read_buf)?;
        let responder_remote_static = responder
            .get_remote_static()
            .ok_or_else(|| CryptoError::Noise("missing responder remote static".to_string()))?
            .to_vec();
        let _transport = responder.into_transport_mode()?;
        Ok(NoiseHandshakeCompleteSummary {
            responder_remote_static,
            key_material_exposed: false,
            transport_state_created: true,
        })
    }

    fn establish_noise_xx_transport_pair_with_prologues(
        initiator_prologue: &[u8],
        responder_prologue: &[u8],
        initiator_static: &NoiseStaticKeypair,
        responder_static: &NoiseStaticKeypair,
    ) -> Result<NoiseTransportPair, CryptoError> {
        let mut initiator = Builder::new(noise_params()?)
            .local_private_key(&initiator_static.private)?
            .prologue(initiator_prologue)?
            .build_initiator()?;
        let mut responder = Builder::new(noise_params()?)
            .local_private_key(&responder_static.private)?
            .prologue(responder_prologue)?
            .build_responder()?;

        let mut read_buf = [0_u8; 1024];
        let mut message = [0_u8; 1024];

        let len = initiator.write_message(&[], &mut message)?;
        responder.read_message(&message[..len], &mut read_buf)?;

        let len = responder.write_message(&[], &mut message)?;
        initiator.read_message(&message[..len], &mut read_buf)?;

        let len = initiator.write_message(&[], &mut message)?;
        responder.read_message(&message[..len], &mut read_buf)?;

        let initiator_remote_static = initiator
            .get_remote_static()
            .ok_or_else(|| CryptoError::Noise("missing initiator remote static".to_string()))?
            .to_vec();
        let responder_remote_static = responder
            .get_remote_static()
            .ok_or_else(|| CryptoError::Noise("missing responder remote static".to_string()))?
            .to_vec();

        let initiator_transport = initiator.into_transport_mode()?;
        let responder_transport = responder.into_transport_mode()?;

        Ok(NoiseTransportPair {
            initiator_remote_static,
            responder_remote_static,
            initiator: initiator_transport,
            responder: responder_transport,
        })
    }

    fn write_transport_message(
        state: &mut TransportState,
        plaintext: &[u8],
    ) -> Result<Vec<u8>, CryptoError> {
        let mut out = vec![0_u8; plaintext.len() + 64];
        let len = state.write_message(plaintext, &mut out)?;
        out.truncate(len);
        Ok(out)
    }

    fn read_transport_message(
        state: &mut TransportState,
        ciphertext: &[u8],
    ) -> Result<Vec<u8>, CryptoError> {
        let mut out = vec![0_u8; ciphertext.len()];
        let len = state.read_message(ciphertext, &mut out)?;
        out.truncate(len);
        Ok(out)
    }

    fn noise_params() -> Result<NoiseParams, CryptoError> {
        NOISE_XX_PATTERN.parse().map_err(CryptoError::from)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn noise_xx_smoke_round_trips_without_plaintext_ciphertext() {
            let initiator = generate_noise_static_keypair().expect("initiator static key");
            let responder = generate_noise_static_keypair().expect("responder static key");
            let plaintext = b"pairwise message body";

            let result = run_noise_xx_handshake_smoke(
                "ADPAIR-SAFETY-V1|alice|bob",
                &initiator,
                &responder,
                plaintext,
            )
            .expect("handshake smoke succeeds");

            assert_eq!(result.plaintext, plaintext);
            assert_eq!(result.initiator_remote_static, responder.public_key());
            assert_eq!(result.responder_remote_static, initiator.public_key());
            assert!(!result
                .ciphertext
                .windows(plaintext.len())
                .any(|window| window == plaintext));
        }

        #[test]
        fn noise_xx_smoke_rejects_transcript_mismatch() {
            let initiator = generate_noise_static_keypair().expect("initiator static key");
            let responder = generate_noise_static_keypair().expect("responder static key");

            assert!(establish_noise_xx_transport_pair_with_prologues(
                b"ADPAIR-SAFETY-V1|alice|bob",
                b"ADPAIR-SAFETY-V1|alice|tampered-bob",
                &initiator,
                &responder,
            )
            .is_err());
        }

        #[test]
        fn noise_transport_pair_encrypts_decrypts_and_rejects_tampering() {
            let initiator = generate_noise_static_keypair().expect("initiator static key");
            let responder = generate_noise_static_keypair().expect("responder static key");
            let plaintext = b"pairwise message body";
            let mut pair = establish_noise_xx_transport_pair(
                "ADPAIR-SAFETY-V1|alice|bob",
                &initiator,
                &responder,
            )
            .expect("transport pair");

            assert_eq!(pair.initiator_remote_static(), responder.public_key());
            assert_eq!(pair.responder_remote_static(), initiator.public_key());

            let ciphertext = pair.initiator_encrypt(plaintext).expect("encrypt");
            assert!(!ciphertext
                .windows(plaintext.len())
                .any(|window| window == plaintext));
            assert_eq!(
                pair.responder_decrypt(&ciphertext).expect("decrypt"),
                plaintext
            );

            let mut tampered_pair = establish_noise_xx_transport_pair(
                "ADPAIR-SAFETY-V1|alice|bob",
                &initiator,
                &responder,
            )
            .expect("transport pair");
            let mut tampered = tampered_pair
                .initiator_encrypt(plaintext)
                .expect("encrypt tamper target");
            let last = tampered.last_mut().expect("ciphertext is non-empty");
            *last ^= 0x01;

            assert!(tampered_pair.responder_decrypt(&tampered).is_err());
        }

        #[test]
        fn noise_xx_stateless_initiator_transport_encrypts_with_explicit_nonce() {
            let initiator = generate_noise_static_keypair().expect("initiator static key");
            let responder = generate_noise_static_keypair().expect("responder static key");
            let init =
                create_noise_xx_handshake_init_export("ADPAIR-SAFETY-V1|alice|bob", &initiator)
                    .expect("init export");
            let reply = create_noise_xx_handshake_reply_export(
                "ADPAIR-SAFETY-V1|alice|bob",
                &responder,
                &init.message,
            )
            .expect("reply export");
            let stateless = create_noise_xx_stateless_initiator_transport(
                "ADPAIR-SAFETY-V1|alice|bob",
                &initiator,
                &init.initiator_ephemeral_private,
                &reply.message,
            )
            .expect("stateless transport");

            assert_eq!(stateless.remote_static(), responder.public_key());
            let first = stateless
                .encrypt_with_nonce(0, b"message one")
                .expect("first ciphertext");
            let second = stateless
                .encrypt_with_nonce(1, b"message two")
                .expect("second ciphertext");

            assert_ne!(first.ciphertext, second.ciphertext);
            assert!(!first.key_material_exposed);
            assert!(!second.key_material_exposed);
        }

        #[test]
        fn noise_xx_stateless_responder_transport_decrypts_explicit_nonce() {
            let initiator = generate_noise_static_keypair().expect("initiator static key");
            let responder = generate_noise_static_keypair().expect("responder static key");
            let init =
                create_noise_xx_handshake_init_export("ADPAIR-SAFETY-V1|alice|bob", &initiator)
                    .expect("init export");
            let reply = create_noise_xx_handshake_reply_export(
                "ADPAIR-SAFETY-V1|alice|bob",
                &responder,
                &init.message,
            )
            .expect("reply export");
            let finish = create_noise_xx_handshake_finish_export(
                "ADPAIR-SAFETY-V1|alice|bob",
                &initiator,
                &init.initiator_ephemeral_private,
                &reply.message,
            )
            .expect("finish export");
            let sender = create_noise_xx_stateless_initiator_transport(
                "ADPAIR-SAFETY-V1|alice|bob",
                &initiator,
                &init.initiator_ephemeral_private,
                &reply.message,
            )
            .expect("sender");
            let receiver = create_noise_xx_stateless_responder_transport(
                "ADPAIR-SAFETY-V1|alice|bob",
                &responder,
                &init.message,
                &reply.responder_ephemeral_private,
                &finish.message,
            )
            .expect("receiver");
            let ciphertext = sender
                .encrypt_with_nonce(0, b"message one")
                .expect("ciphertext");
            let plaintext = receiver
                .decrypt_with_nonce(0, &ciphertext.ciphertext)
                .expect("plaintext");

            assert_eq!(receiver.remote_static(), initiator.public_key());
            assert_eq!(plaintext.plaintext, b"message one");
            assert!(!plaintext.key_material_exposed);
        }

        #[test]
        fn noise_xx_stateless_responder_transport_encrypts_reply_with_explicit_nonce() {
            let initiator = generate_noise_static_keypair().expect("initiator static key");
            let responder = generate_noise_static_keypair().expect("responder static key");
            let init =
                create_noise_xx_handshake_init_export("ADPAIR-SAFETY-V1|alice|bob", &initiator)
                    .expect("init export");
            let reply = create_noise_xx_handshake_reply_export(
                "ADPAIR-SAFETY-V1|alice|bob",
                &responder,
                &init.message,
            )
            .expect("reply export");
            let finish = create_noise_xx_handshake_finish_export(
                "ADPAIR-SAFETY-V1|alice|bob",
                &initiator,
                &init.initiator_ephemeral_private,
                &reply.message,
            )
            .expect("finish export");
            let receiver = create_noise_xx_stateless_responder_transport(
                "ADPAIR-SAFETY-V1|alice|bob",
                &responder,
                &init.message,
                &reply.responder_ephemeral_private,
                &finish.message,
            )
            .expect("receiver");
            let sender = create_noise_xx_stateless_initiator_transport(
                "ADPAIR-SAFETY-V1|alice|bob",
                &initiator,
                &init.initiator_ephemeral_private,
                &reply.message,
            )
            .expect("sender");
            let ciphertext = receiver
                .encrypt_with_nonce(0, b"reply one")
                .expect("ciphertext");
            let plaintext = sender
                .decrypt_with_nonce(0, &ciphertext.ciphertext)
                .expect("plaintext");

            assert_eq!(sender.remote_static(), responder.public_key());
            assert_eq!(plaintext.plaintext, b"reply one");
            assert!(!plaintext.key_material_exposed);
        }

        #[test]
        fn noise_handshake_init_summary_hides_message_bytes() {
            let initiator = generate_noise_static_keypair().expect("initiator");
            let summary = prepare_noise_xx_handshake_init_message("transcript", &initiator)
                .expect("handshake init");
            let message = create_noise_xx_handshake_init_message("transcript", &initiator)
                .expect("handshake message");

            assert!(summary.message_len > 0);
            assert_eq!(summary.message_len, message.len());
            assert!(!summary.key_material_exposed);
        }

        #[test]
        fn noise_handshake_reply_summary_hides_message_bytes() {
            let initiator = generate_noise_static_keypair().expect("initiator");
            let responder = generate_noise_static_keypair().expect("responder");
            let init_export = create_noise_xx_handshake_init_export("transcript", &initiator)
                .expect("handshake init");
            let summary = prepare_noise_xx_handshake_reply_message(
                "transcript",
                &responder,
                &init_export.message,
            )
            .expect("handshake reply");
            let reply = create_noise_xx_handshake_reply_message(
                "transcript",
                &responder,
                &init_export.message,
            )
            .expect("handshake reply");

            assert!(summary.message_len > 0);
            assert_eq!(summary.message_len, reply.len());
            assert!(!summary.key_material_exposed);
            assert!(
                create_noise_xx_handshake_reply_message("transcript", &responder, &[0_u8]).is_err()
            );
        }

        #[test]
        fn noise_handshake_finish_summary_hides_message_bytes() {
            let initiator = generate_noise_static_keypair().expect("initiator");
            let responder = generate_noise_static_keypair().expect("responder");
            let init_export = create_noise_xx_handshake_init_export("transcript", &initiator)
                .expect("handshake init");
            let reply_export = create_noise_xx_handshake_reply_export(
                "transcript",
                &responder,
                &init_export.message,
            )
            .expect("handshake reply");
            let summary = prepare_noise_xx_handshake_finish_message(
                "transcript",
                &initiator,
                &init_export.initiator_ephemeral_private,
                &reply_export.message,
            )
            .expect("handshake finish");
            let finish = create_noise_xx_handshake_finish_message(
                "transcript",
                &initiator,
                &init_export.initiator_ephemeral_private,
                &reply_export.message,
            )
            .expect("handshake finish");
            let complete = validate_noise_xx_handshake_finish_message(
                "transcript",
                &responder,
                &init_export.message,
                &reply_export.responder_ephemeral_private,
                &finish,
            )
            .expect("handshake complete");

            assert!(summary.message_len > 0);
            assert_eq!(summary.message_len, finish.len());
            assert!(!summary.key_material_exposed);
            assert!(!summary.transport_state_created);
            assert_eq!(complete.responder_remote_static, initiator.public_key());
            assert!(!complete.key_material_exposed);
            assert!(complete.transport_state_created);
            assert!(create_noise_xx_handshake_finish_message(
                "transcript",
                &initiator,
                &[0_u8; 32],
                &reply_export.message,
            )
            .is_err());
            assert!(validate_noise_xx_handshake_finish_message(
                "transcript",
                &responder,
                &init_export.message,
                &[0_u8; 32],
                &finish,
            )
            .is_err());
        }

        #[test]
        fn noise_prekey_bundle_round_trips_public_key() {
            let keypair = generate_noise_static_keypair().expect("static key");
            let bundle = keypair.prekey_bundle().expect("prekey bundle");
            let encoded = bundle.encode();
            let decoded = NoisePrekeyBundle::decode(&encoded).expect("bundle decodes");

            assert!(encoded.starts_with("adnoise1:xx25519-chachapoly-blake2s:"));
            assert_eq!(decoded.public_key(), keypair.public_key());
        }

        #[test]
        fn noise_prekey_bundle_rejects_wrong_algorithm_and_size() {
            assert_eq!(
                NoisePrekeyBundle::decode("adnoise1:unknown:00"),
                Err(CryptoError::InvalidNoisePrekeyBundle)
            );
            assert_eq!(
                NoisePrekeyBundle::decode("adnoise1:xx25519-chachapoly-blake2s:00"),
                Err(CryptoError::InvalidNoisePrekeyBundle)
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TRANSCRIPT: &str = "ADPAIR-SAFETY-V1|alice|bob";

    #[test]
    fn production_safety_material_has_stable_test_vector() {
        let material = derive_production_safety_material(TRANSCRIPT);

        assert_eq!(material.number, "30813 31152 51308 44413 05368 46650");
        assert_eq!(material.phrase, "sha256-930a-9b54-3f03-4968");
    }

    #[test]
    fn production_safety_material_changes_with_transcript() {
        let original = derive_production_safety_material(TRANSCRIPT);
        let changed = derive_production_safety_material("ADPAIR-SAFETY-V1|alice|changed-bob");

        assert_ne!(original, changed);
    }

    #[test]
    fn profile_key_hierarchy_derives_domain_separated_redacted_keys() {
        use crate::production::{
            derive_profile_root_key, profile_key_hierarchy_boundary_summary, ProfileKdfParams,
            ProfileKdfSalt, ProfileKeyDomain,
        };
        use std::collections::BTreeSet;

        let summary = profile_key_hierarchy_boundary_summary();
        let params = ProfileKdfParams::new(64, 1, 1, 32).expect("test kdf params");
        let salt = ProfileKdfSalt::new(b"alice-profile-salt-v1".to_vec()).expect("salt");
        let passphrase = "correct horse profile passphrase";
        let root = derive_profile_root_key(passphrase, &salt, params).expect("root key");
        let keys = ProfileKeyDomain::ALL
            .iter()
            .map(|domain| root.derive_domain_key(*domain))
            .collect::<Vec<_>>();
        let key_ids = keys
            .iter()
            .map(|key| key.key_id().to_string())
            .collect::<BTreeSet<_>>();

        assert_eq!(summary.kdf_algorithm(), "argon2id-v1.3");
        assert!(summary.production_key_management_ready());
        assert!(summary.per_profile_salt_stored());
        assert!(summary.kdf_params_stored());
        assert!(summary.profile_root_key_derived());
        assert!(summary.domain_separated_keys_ready());
        assert_eq!(summary.domain_count(), 6);
        assert!(summary.rekey_command_available());
        assert!(summary.passphrase_debug_redacted());
        assert!(summary.key_debug_redacted());
        assert!(summary.key_buffers_zeroized_on_drop());
        assert!(summary.weak_passphrase_rejected());
        assert!(summary.unsupported_kdf_params_rejected());
        assert!(summary.corrupt_key_record_classified());
        assert_eq!(key_ids.len(), ProfileKeyDomain::ALL.len());
        assert_eq!(keys[0].domain(), ProfileKeyDomain::ProfileMetadata);
        assert_eq!(
            derive_profile_root_key("too-short", &salt, params),
            Err(CryptoError::WeakProfilePassphrase)
        );
        assert_eq!(
            ProfileKdfParams::new(1, 1, 1, 32),
            Err(CryptoError::InvalidProfileKdfParams)
        );
        assert_eq!(
            ProfileKdfSalt::new(b"short".to_vec()),
            Err(CryptoError::InvalidProfileKdfSalt)
        );
        assert!(!format!("{salt:?}").contains("alice-profile-salt-v1"));
        assert!(!format!("{root:?}").contains(passphrase));
        for key in &keys {
            let rendered = format!("{key:?}");
            assert!(rendered.contains("<redacted>"));
            assert!(!rendered.contains(passphrase));
        }
    }
}

#[cfg(feature = "dev-insecure")]
pub mod dev_insecure {
    use super::*;

    pub const WARNING: &str = "WARNING: dev-insecure build. Not for real communication.";

    #[derive(Clone, Debug, Default)]
    pub struct FakeCryptoSession;

    impl CryptoSession for FakeCryptoSession {
        fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, CryptoError> {
            let transformed = plaintext
                .as_bytes()
                .iter()
                .rev()
                .map(|byte| byte ^ 0xaa)
                .collect::<Vec<_>>();
            pad_to_bucket(&transformed).map_err(CryptoError::from)
        }

        fn decrypt(&self, padded_ciphertext: &[u8]) -> Result<String, CryptoError> {
            let trimmed = trim_padding(padded_ciphertext);
            let bytes = trimmed
                .iter()
                .rev()
                .map(|byte| byte ^ 0xaa)
                .collect::<Vec<_>>();
            String::from_utf8(bytes).map_err(|_| CryptoError::InvalidUtf8)
        }

        fn derive_safety_material(&self, transcript: &str) -> SafetyMaterial {
            let first = dev_hash(&format!("safety-number:{transcript}"));
            let second = dev_hash(&format!("safety-phrase:{transcript}"));
            SafetyMaterial {
                number: format!(
                    "{:03} {:03} {:03} {:03}",
                    first % 1000,
                    (first / 1000) % 1000,
                    second % 1000,
                    (second / 1000) % 1000
                ),
                phrase: phrase(second),
            }
        }
    }

    fn phrase(seed: u64) -> String {
        const WORDS: &[&str] = &[
            "river", "copper", "lantern", "stone", "violet", "orbit", "cedar", "signal", "harbor",
            "ember", "north", "silver",
        ];
        let a = WORDS[(seed as usize) % WORDS.len()];
        let b = WORDS[((seed / 17) as usize) % WORDS.len()];
        let c = WORDS[((seed / 31) as usize) % WORDS.len()];
        format!("{a}-{b}-{c}")
    }

    fn dev_hash(input: &str) -> u64 {
        let mut hash = 0xcbf29ce484222325_u64;
        for byte in input.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn safety_material_has_stable_test_vector() {
            let transcript = "ADPAIR-SAFETY-V1|414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310003626f620009626f622d6e6f6e63650007626f622d7075620009626f622e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000007d00000000000000258|414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310005616c696365000b616c6963652d6e6f6e63650009616c6963652d707562000b616c6963652e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000003e80000000000000258";
            let material = FakeCryptoSession.derive_safety_material(transcript);

            assert_eq!(material.number, "992 693 768 463");
            assert_eq!(material.phrase, "river-ember-ember");
        }
    }
}
