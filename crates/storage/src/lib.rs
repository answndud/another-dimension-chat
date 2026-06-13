#[cfg(feature = "dev-insecure")]
use another_dimension_identity::PairwisePrivateKey;
use another_dimension_identity::{ContactId, ProfileName};
#[cfg(feature = "dev-insecure")]
use another_dimension_pairing::{PairingPayload, PendingContact};
#[cfg(feature = "dev-insecure")]
use another_dimension_protocol::{Envelope, ReplayWindow};
use std::fmt;
#[cfg(feature = "dev-insecure")]
use std::fs;
use std::io;
#[cfg(feature = "dev-insecure")]
use std::path::{Path, PathBuf};

pub trait Store {
    fn create_profile(&self, profile: &ProfileName) -> Result<(), StorageError>;
    fn profile_exists(&self, profile: &ProfileName) -> bool;
}

#[derive(Debug)]
pub enum StorageError {
    Io(io::Error),
    InvalidRecord,
}

impl From<io::Error> for StorageError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

pub mod production {
    use super::*;
    use another_dimension_protocol::{decode_hex, encode_hex, ReplayWindow};
    use rusqlite::{params, Connection, OptionalExtension};
    use std::path::Path;

    pub const PRODUCTION_SCHEMA_VERSION: i64 = 1;

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum ProductionRecordKind {
        SchemaMarker,
        ProfileState,
        PairingPayload,
        PairwiseIdentityPrivateKey,
        OnionServiceKeyMaterial,
        NoiseStaticPrivateKey,
        ReplayWindowState,
        MessageEnvelope,
        SentMessage,
        ReceivedMessage,
        LocalMessageIndex,
        MessageCounter,
        KeyRotationMarker,
        RendezvousEndpointState,
        RendezvousEndpointStatus,
        SessionDraft,
        HandshakeState,
        SessionTransportState,
    }

    impl ProductionRecordKind {
        fn as_str(&self) -> &'static str {
            match self {
                Self::SchemaMarker => "schema-marker",
                Self::ProfileState => "profile-state",
                Self::PairingPayload => "pairing-payload",
                Self::PairwiseIdentityPrivateKey => "pairwise-identity-private-key",
                Self::OnionServiceKeyMaterial => "onion-service-key-material",
                Self::NoiseStaticPrivateKey => "noise-static-private-key",
                Self::ReplayWindowState => "replay-window-state",
                Self::MessageEnvelope => "message-envelope",
                Self::SentMessage => "sent-message",
                Self::ReceivedMessage => "received-message",
                Self::LocalMessageIndex => "local-message-index",
                Self::MessageCounter => "message-counter",
                Self::KeyRotationMarker => "key-rotation-marker",
                Self::RendezvousEndpointState => "rendezvous-endpoint-state",
                Self::RendezvousEndpointStatus => "rendezvous-endpoint-status",
                Self::SessionDraft => "session-draft",
                Self::HandshakeState => "handshake-state",
                Self::SessionTransportState => "session-transport-state",
            }
        }

        fn parse(value: &str) -> Result<Self, ProductionStoragePolicyError> {
            match value {
                "schema-marker" => Ok(Self::SchemaMarker),
                "profile-state" => Ok(Self::ProfileState),
                "pairing-payload" => Ok(Self::PairingPayload),
                "pairwise-identity-private-key" => Ok(Self::PairwiseIdentityPrivateKey),
                "onion-service-key-material" => Ok(Self::OnionServiceKeyMaterial),
                "noise-static-private-key" => Ok(Self::NoiseStaticPrivateKey),
                "replay-window-state" => Ok(Self::ReplayWindowState),
                "message-envelope" => Ok(Self::MessageEnvelope),
                "sent-message" => Ok(Self::SentMessage),
                "received-message" => Ok(Self::ReceivedMessage),
                "local-message-index" => Ok(Self::LocalMessageIndex),
                "message-counter" => Ok(Self::MessageCounter),
                "key-rotation-marker" => Ok(Self::KeyRotationMarker),
                "rendezvous-endpoint-state" => Ok(Self::RendezvousEndpointState),
                "rendezvous-endpoint-status" => Ok(Self::RendezvousEndpointStatus),
                "session-draft" => Ok(Self::SessionDraft),
                "handshake-state" => Ok(Self::HandshakeState),
                "session-transport-state" => Ok(Self::SessionTransportState),
                _ => Err(ProductionStoragePolicyError::InvalidEncryptedRecord),
            }
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum StorageProtection {
        PlaintextAllowed,
        EncryptedAtRestRequired,
        InMemoryOnly,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum ReplayRollbackProtection {
        NotProvided,
        RequiresExternalMonotonicState,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum StorageBackendKind {
        SqlCipherAdrec1Spike,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ReplayPersistenceGuarantees {
        pub at_rest_encrypted: bool,
        pub commit_after_decrypt: bool,
        pub rollback_protection: ReplayRollbackProtection,
    }

    pub fn replay_persistence_guarantees() -> ReplayPersistenceGuarantees {
        ReplayPersistenceGuarantees {
            at_rest_encrypted: true,
            commit_after_decrypt: true,
            rollback_protection: ReplayRollbackProtection::NotProvided,
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct StorageBackendIntegrationBoundarySummary {
        backend: StorageBackendKind,
        passphrase_first_unlock: bool,
        encrypted_record_body_store: bool,
        sqlcipher_passphrase_rekey_source_ready: bool,
        sqlcipher_passphrase_rotation_generation_source_ready: bool,
        key_rotation_marker_monotonic_write_enforced: bool,
        key_rotation_marker_scope_bound: bool,
        replay_window_scope_bound_loader_ready: bool,
        production_key_management_ready: bool,
        rollback_protection: ReplayRollbackProtection,
        secure_deletion_from_media: bool,
        session_transport_persistence_allowed: bool,
    }

    impl StorageBackendIntegrationBoundarySummary {
        pub fn backend(self) -> StorageBackendKind {
            self.backend
        }

        pub fn passphrase_first_unlock(self) -> bool {
            self.passphrase_first_unlock
        }

        pub fn encrypted_record_body_store(self) -> bool {
            self.encrypted_record_body_store
        }

        pub fn sqlcipher_passphrase_rekey_source_ready(self) -> bool {
            self.sqlcipher_passphrase_rekey_source_ready
        }

        pub fn sqlcipher_passphrase_rotation_generation_source_ready(self) -> bool {
            self.sqlcipher_passphrase_rotation_generation_source_ready
        }

        pub fn key_rotation_marker_monotonic_write_enforced(self) -> bool {
            self.key_rotation_marker_monotonic_write_enforced
        }

        pub fn key_rotation_marker_scope_bound(self) -> bool {
            self.key_rotation_marker_scope_bound
        }

        pub fn replay_window_scope_bound_loader_ready(self) -> bool {
            self.replay_window_scope_bound_loader_ready
        }

        pub fn production_key_management_ready(self) -> bool {
            self.production_key_management_ready
        }

        pub fn rollback_protection(self) -> ReplayRollbackProtection {
            self.rollback_protection
        }

        pub fn secure_deletion_from_media(self) -> bool {
            self.secure_deletion_from_media
        }

        pub fn session_transport_persistence_allowed(self) -> bool {
            self.session_transport_persistence_allowed
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProductionMessageStorageBoundarySummary {
        replay_window_storage: StorageProtection,
        message_envelope_storage: StorageProtection,
        local_message_index_storage: StorageProtection,
        endpoint_state_storage: StorageProtection,
        session_transport_storage: StorageProtection,
        replay_commit_after_decrypt: bool,
        rollback_protection: ReplayRollbackProtection,
        production_key_management_ready: bool,
        secure_deletion_from_media: bool,
        durable_session_transport_persistence_allowed: bool,
    }

    impl ProductionMessageStorageBoundarySummary {
        pub fn replay_window_storage(self) -> StorageProtection {
            self.replay_window_storage
        }

        pub fn message_envelope_storage(self) -> StorageProtection {
            self.message_envelope_storage
        }

        pub fn local_message_index_storage(self) -> StorageProtection {
            self.local_message_index_storage
        }

        pub fn endpoint_state_storage(self) -> StorageProtection {
            self.endpoint_state_storage
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

        pub fn production_key_management_ready(self) -> bool {
            self.production_key_management_ready
        }

        pub fn secure_deletion_from_media(self) -> bool {
            self.secure_deletion_from_media
        }

        pub fn durable_session_transport_persistence_allowed(self) -> bool {
            self.durable_session_transport_persistence_allowed
        }
    }

    pub fn storage_backend_integration_boundary_summary() -> StorageBackendIntegrationBoundarySummary
    {
        StorageBackendIntegrationBoundarySummary {
            backend: StorageBackendKind::SqlCipherAdrec1Spike,
            passphrase_first_unlock: true,
            encrypted_record_body_store: true,
            sqlcipher_passphrase_rekey_source_ready: true,
            sqlcipher_passphrase_rotation_generation_source_ready: true,
            key_rotation_marker_monotonic_write_enforced: true,
            key_rotation_marker_scope_bound: true,
            replay_window_scope_bound_loader_ready: true,
            production_key_management_ready: false,
            rollback_protection: replay_persistence_guarantees().rollback_protection,
            secure_deletion_from_media: false,
            session_transport_persistence_allowed: true,
        }
    }

    pub fn production_message_storage_boundary_summary() -> ProductionMessageStorageBoundarySummary
    {
        let replay = replay_persistence_guarantees();
        ProductionMessageStorageBoundarySummary {
            replay_window_storage: protection_for(ProductionRecordKind::ReplayWindowState),
            message_envelope_storage: protection_for(ProductionRecordKind::MessageEnvelope),
            local_message_index_storage: protection_for(ProductionRecordKind::LocalMessageIndex),
            endpoint_state_storage: protection_for(ProductionRecordKind::RendezvousEndpointState),
            session_transport_storage: protection_for(ProductionRecordKind::SessionTransportState),
            replay_commit_after_decrypt: replay.commit_after_decrypt,
            rollback_protection: replay.rollback_protection,
            production_key_management_ready: false,
            secure_deletion_from_media: false,
            durable_session_transport_persistence_allowed: true,
        }
    }

    #[derive(Debug, Eq, PartialEq)]
    pub enum ProductionStoragePolicyError {
        PlaintextForbidden {
            kind: ProductionRecordKind,
            required: StorageProtection,
        },
        EncryptedRecordForbidden {
            kind: ProductionRecordKind,
            protection: StorageProtection,
        },
        PersistenceForbidden {
            kind: ProductionRecordKind,
        },
        InvalidEncryptedRecord,
        InvalidRecordId,
        InvalidPassphrase,
        UnlockPolicyViolation,
    }

    #[derive(Debug, Eq, PartialEq)]
    pub enum ProductionStorageError {
        Policy(ProductionStoragePolicyError),
        Database(String),
        InvalidRecord,
        UnlockFailed,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum ProfileStoreUnlockFailureKind {
        WrongPassphrase,
        MissingStore,
        CorruptStore,
        MigrationNeeded,
        UnsupportedUnlockFactor,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct ProfileStoreUnlockRecoveryDecision {
        kind: ProfileStoreUnlockFailureKind,
        retry_with_passphrase_allowed: bool,
        create_new_profile_allowed: bool,
        migration_required: bool,
        passphrase_required: bool,
        os_keychain_only_supported: bool,
        raw_path_returned: bool,
        passphrase_returned: bool,
        key_material_exposed: bool,
        backup_recovery_claimed: bool,
        rollback_protection_claimed: bool,
        secure_media_deletion_claimed: bool,
        generic_error: bool,
        next_action: &'static str,
    }

    impl ProfileStoreUnlockRecoveryDecision {
        pub fn kind(self) -> ProfileStoreUnlockFailureKind {
            self.kind
        }

        pub fn retry_with_passphrase_allowed(self) -> bool {
            self.retry_with_passphrase_allowed
        }

        pub fn create_new_profile_allowed(self) -> bool {
            self.create_new_profile_allowed
        }

        pub fn migration_required(self) -> bool {
            self.migration_required
        }

        pub fn passphrase_required(self) -> bool {
            self.passphrase_required
        }

        pub fn os_keychain_only_supported(self) -> bool {
            self.os_keychain_only_supported
        }

        pub fn raw_path_returned(self) -> bool {
            self.raw_path_returned
        }

        pub fn passphrase_returned(self) -> bool {
            self.passphrase_returned
        }

        pub fn key_material_exposed(self) -> bool {
            self.key_material_exposed
        }

        pub fn backup_recovery_claimed(self) -> bool {
            self.backup_recovery_claimed
        }

        pub fn rollback_protection_claimed(self) -> bool {
            self.rollback_protection_claimed
        }

        pub fn secure_media_deletion_claimed(self) -> bool {
            self.secure_media_deletion_claimed
        }

        pub fn generic_error(self) -> bool {
            self.generic_error
        }

        pub fn next_action(self) -> &'static str {
            self.next_action
        }
    }

    pub fn profile_store_unlock_recovery_decision(
        kind: ProfileStoreUnlockFailureKind,
    ) -> ProfileStoreUnlockRecoveryDecision {
        let (
            retry_with_passphrase_allowed,
            create_new_profile_allowed,
            migration_required,
            next_action,
        ) = match kind {
            ProfileStoreUnlockFailureKind::WrongPassphrase => {
                (true, false, false, "retry-passphrase")
            }
            ProfileStoreUnlockFailureKind::MissingStore => {
                (false, true, false, "create-new-local-profile")
            }
            ProfileStoreUnlockFailureKind::CorruptStore => {
                (false, true, false, "inspect-local-store-or-create-new-profile")
            }
            ProfileStoreUnlockFailureKind::MigrationNeeded => {
                (false, false, true, "run-supported-local-store-migration")
            }
            ProfileStoreUnlockFailureKind::UnsupportedUnlockFactor => {
                (true, false, false, "unlock-with-profile-passphrase")
            }
        };

        ProfileStoreUnlockRecoveryDecision {
            kind,
            retry_with_passphrase_allowed,
            create_new_profile_allowed,
            migration_required,
            passphrase_required: true,
            os_keychain_only_supported: false,
            raw_path_returned: false,
            passphrase_returned: false,
            key_material_exposed: false,
            backup_recovery_claimed: false,
            rollback_protection_claimed: false,
            secure_media_deletion_claimed: false,
            generic_error: false,
            next_action,
        }
    }

    pub fn classify_profile_store_unlock_error(
        error: &ProductionStorageError,
        store_exists: bool,
        migration_needed: bool,
        corrupt_store_detected: bool,
    ) -> ProfileStoreUnlockFailureKind {
        if migration_needed {
            return ProfileStoreUnlockFailureKind::MigrationNeeded;
        }
        if corrupt_store_detected {
            return ProfileStoreUnlockFailureKind::CorruptStore;
        }
        if !store_exists {
            return ProfileStoreUnlockFailureKind::MissingStore;
        }
        match error {
            ProductionStorageError::UnlockFailed => ProfileStoreUnlockFailureKind::WrongPassphrase,
            ProductionStorageError::InvalidRecord => ProfileStoreUnlockFailureKind::MigrationNeeded,
            ProductionStorageError::Database(_) => ProfileStoreUnlockFailureKind::CorruptStore,
            ProductionStorageError::Policy(ProductionStoragePolicyError::InvalidPassphrase)
            | ProductionStorageError::Policy(ProductionStoragePolicyError::UnlockPolicyViolation) => {
                ProfileStoreUnlockFailureKind::UnsupportedUnlockFactor
            }
            ProductionStorageError::Policy(_) => ProfileStoreUnlockFailureKind::CorruptStore,
        }
    }

    impl From<ProductionStoragePolicyError> for ProductionStorageError {
        fn from(value: ProductionStoragePolicyError) -> Self {
            Self::Policy(value)
        }
    }

    impl From<rusqlite::Error> for ProductionStorageError {
        fn from(value: rusqlite::Error) -> Self {
            Self::Database(value.to_string())
        }
    }

    #[derive(Eq, PartialEq)]
    pub struct StorageDatabaseKey(String);

    impl fmt::Debug for StorageDatabaseKey {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            f.write_str("StorageDatabaseKey(<redacted>)")
        }
    }

    impl StorageDatabaseKey {
        #[cfg(test)]
        fn test_only(value: impl Into<String>) -> Self {
            Self(value.into())
        }

        fn expose_for_sqlcipher(&self) -> &str {
            &self.0
        }
    }

    #[derive(Eq, PartialEq)]
    pub struct ProfilePassphrase(String);

    impl fmt::Debug for ProfilePassphrase {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            f.write_str("ProfilePassphrase(<redacted>)")
        }
    }

    impl ProfilePassphrase {
        pub fn new(value: impl Into<String>) -> Result<Self, ProductionStoragePolicyError> {
            let value = value.into();
            if value.is_empty() {
                return Err(ProductionStoragePolicyError::InvalidPassphrase);
            }
            Ok(Self(value))
        }

        fn as_database_key(&self) -> StorageDatabaseKey {
            StorageDatabaseKey(self.0.clone())
        }
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum UnlockMode {
        HighRisk,
        Standard,
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum UnlockFactor {
        Passphrase,
        OsKeystoreWrappedKey,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct UnlockRequest {
        mode: UnlockMode,
        factors: Vec<UnlockFactor>,
    }

    impl UnlockRequest {
        pub fn new(mode: UnlockMode, factors: Vec<UnlockFactor>) -> Self {
            Self { mode, factors }
        }

        pub fn require_allowed(&self) -> Result<(), ProductionStoragePolicyError> {
            let has_passphrase = self.factors.contains(&UnlockFactor::Passphrase);
            if !has_passphrase {
                return Err(ProductionStoragePolicyError::UnlockPolicyViolation);
            }
            if self.mode == UnlockMode::HighRisk
                && self.factors == [UnlockFactor::OsKeystoreWrappedKey]
            {
                return Err(ProductionStoragePolicyError::UnlockPolicyViolation);
            }
            Ok(())
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct EncryptedRecordScope {
        profile: ProfileName,
        contact: Option<ContactId>,
    }

    impl EncryptedRecordScope {
        pub fn profile(profile: ProfileName) -> Self {
            Self {
                profile,
                contact: None,
            }
        }

        pub fn contact(profile: ProfileName, contact: ContactId) -> Self {
            Self {
                profile,
                contact: Some(contact),
            }
        }

        pub fn profile_name(&self) -> &ProfileName {
            &self.profile
        }

        pub fn contact_id(&self) -> Option<&ContactId> {
            self.contact.as_ref()
        }

        fn encode_scope(&self) -> String {
            match &self.contact {
                Some(contact) => format!("contact:{}", contact.as_str()),
                None => "profile".to_string(),
            }
        }

        fn decode_scope(profile: &str, scope: &str) -> Result<Self, ProductionStoragePolicyError> {
            let profile = ProfileName::new(profile)
                .map_err(|_| ProductionStoragePolicyError::InvalidEncryptedRecord)?;
            if scope == "profile" {
                return Ok(Self::profile(profile));
            }
            let contact = scope
                .strip_prefix("contact:")
                .ok_or(ProductionStoragePolicyError::InvalidEncryptedRecord)
                .and_then(|contact| {
                    ContactId::new(contact)
                        .map_err(|_| ProductionStoragePolicyError::InvalidEncryptedRecord)
                })?;
            Ok(Self::contact(profile, contact))
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct EncryptedRecord {
        pub kind: ProductionRecordKind,
        pub scope: EncryptedRecordScope,
        pub nonce: Vec<u8>,
        pub sealed_body: Vec<u8>,
    }

    impl EncryptedRecord {
        pub fn new(
            kind: ProductionRecordKind,
            scope: EncryptedRecordScope,
            nonce: Vec<u8>,
            sealed_body: Vec<u8>,
        ) -> Result<Self, ProductionStoragePolicyError> {
            require_encrypted_record_allowed(kind)?;
            if nonce.is_empty() || sealed_body.is_empty() {
                return Err(ProductionStoragePolicyError::InvalidEncryptedRecord);
            }
            Ok(Self {
                kind,
                scope,
                nonce,
                sealed_body,
            })
        }

        pub fn associated_data(&self) -> Vec<u8> {
            format!(
                "AD-ENCRYPTED-RECORD-V1|{}|{}|{}",
                self.kind.as_str(),
                self.scope.profile_name().as_str(),
                self.scope.encode_scope()
            )
            .into_bytes()
        }

        pub fn encode(&self) -> String {
            format!(
                "ADREC1|{}|{}|{}|{}|{}",
                self.kind.as_str(),
                self.scope.profile_name().as_str(),
                self.scope.encode_scope(),
                encode_hex(&self.nonce),
                encode_hex(&self.sealed_body)
            )
        }

        pub fn decode(value: &str) -> Result<Self, ProductionStoragePolicyError> {
            let parts = value.trim().split('|').collect::<Vec<_>>();
            if parts.len() != 6 || parts[0] != "ADREC1" {
                return Err(ProductionStoragePolicyError::InvalidEncryptedRecord);
            }
            let kind = ProductionRecordKind::parse(parts[1])?;
            let scope = EncryptedRecordScope::decode_scope(parts[2], parts[3])?;
            let nonce = decode_hex(parts[4])
                .map_err(|_| ProductionStoragePolicyError::InvalidEncryptedRecord)?;
            let sealed_body = decode_hex(parts[5])
                .map_err(|_| ProductionStoragePolicyError::InvalidEncryptedRecord)?;
            Self::new(kind, scope, nonce, sealed_body)
        }
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct EncryptedRecordId(String);

    impl EncryptedRecordId {
        pub fn new(value: impl Into<String>) -> Result<Self, ProductionStoragePolicyError> {
            let value = value.into();
            if value.is_empty()
                || value.len() > 128
                || !value
                    .chars()
                    .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
            {
                return Err(ProductionStoragePolicyError::InvalidRecordId);
            }
            Ok(Self(value))
        }

        pub fn as_str(&self) -> &str {
            &self.0
        }
    }

    pub struct SqlCipherRecordStore {
        connection: Connection,
    }

    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct LockedProfileStore {
        path: std::path::PathBuf,
    }

    impl LockedProfileStore {
        pub fn new(path: impl Into<std::path::PathBuf>) -> Self {
            Self { path: path.into() }
        }

        pub fn unlock(
            &self,
            passphrase: &ProfilePassphrase,
        ) -> Result<SqlCipherRecordStore, ProductionStorageError> {
            UnlockRequest::new(UnlockMode::HighRisk, vec![UnlockFactor::Passphrase])
                .require_allowed()?;
            SqlCipherRecordStore::unlock_with_passphrase(&self.path, passphrase)
        }
    }

    impl SqlCipherRecordStore {
        pub fn unlock_with_passphrase(
            path: impl AsRef<Path>,
            passphrase: &ProfilePassphrase,
        ) -> Result<Self, ProductionStorageError> {
            Self::open(path, &passphrase.as_database_key())
        }

        fn open(
            path: impl AsRef<Path>,
            key: &StorageDatabaseKey,
        ) -> Result<Self, ProductionStorageError> {
            let connection = Connection::open(path)?;
            connection.pragma_update(None, "key", key.expose_for_sqlcipher())?;
            verify_sqlcipher_key(&connection)?;
            apply_forward_only_schema_version(&connection)?;
            connection.execute_batch(
                "CREATE TABLE IF NOT EXISTS encrypted_records (
                    record_id TEXT PRIMARY KEY NOT NULL,
                    encoded_record TEXT NOT NULL
                ) STRICT;",
            )?;
            Ok(Self { connection })
        }

        pub fn schema_version(&self) -> Result<i64, ProductionStorageError> {
            self.connection
                .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
                .map_err(ProductionStorageError::from)
        }

        pub fn rekey_with_passphrase(
            &self,
            new_passphrase: &ProfilePassphrase,
        ) -> Result<(), ProductionStorageError> {
            let key = new_passphrase.as_database_key();
            self.connection
                .pragma_update(None, "rekey", key.expose_for_sqlcipher())?;
            verify_sqlcipher_key(&self.connection)
        }

        pub fn rekey_with_passphrase_rotation_generation(
            &self,
            new_passphrase: &ProfilePassphrase,
        ) -> Result<KeyRotationGeneration, ProductionStorageError> {
            let next_generation = self
                .load_key_rotation_generation()?
                .map(|generation| generation.next())
                .unwrap_or_else(KeyRotationGeneration::first);
            self.rekey_with_passphrase(new_passphrase)?;
            self.save_key_rotation_generation(next_generation)?;
            Ok(next_generation)
        }

        pub fn put(
            &self,
            record_id: &EncryptedRecordId,
            record: &EncryptedRecord,
        ) -> Result<(), ProductionStorageError> {
            require_encrypted_record_allowed(record.kind)?;
            self.connection.execute(
                "INSERT INTO encrypted_records (record_id, encoded_record)
                 VALUES (?1, ?2)
                 ON CONFLICT(record_id) DO UPDATE SET encoded_record = excluded.encoded_record",
                params![record_id.as_str(), record.encode()],
            )?;
            Ok(())
        }

        pub fn get(
            &self,
            record_id: &EncryptedRecordId,
        ) -> Result<Option<EncryptedRecord>, ProductionStorageError> {
            let encoded = self
                .connection
                .query_row(
                    "SELECT encoded_record FROM encrypted_records WHERE record_id = ?1",
                    params![record_id.as_str()],
                    |row| row.get::<_, String>(0),
                )
                .optional()?;
            encoded
                .map(|record| {
                    EncryptedRecord::decode(&record).map_err(ProductionStorageError::from)
                })
                .transpose()
        }

        pub fn delete(&self, record_id: &EncryptedRecordId) -> Result<(), ProductionStorageError> {
            self.connection.execute(
                "DELETE FROM encrypted_records WHERE record_id = ?1",
                params![record_id.as_str()],
            )?;
            Ok(())
        }

        pub fn records_with_id_prefix(
            &self,
            prefix: &str,
        ) -> Result<Vec<(EncryptedRecordId, EncryptedRecord)>, ProductionStorageError> {
            if prefix.is_empty()
                || !prefix
                    .chars()
                    .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
            {
                return Err(ProductionStorageError::InvalidRecord);
            }
            let mut statement = self.connection.prepare(
                "SELECT record_id, encoded_record FROM encrypted_records
                 WHERE substr(record_id, 1, ?2) = ?1
                 ORDER BY record_id",
            )?;
            let prefix_len =
                i64::try_from(prefix.len()).map_err(|_| ProductionStorageError::InvalidRecord)?;
            let rows = statement.query_map(params![prefix, prefix_len], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })?;
            let mut records = Vec::new();
            for row in rows {
                let (record_id, encoded_record) = row?;
                records.push((
                    EncryptedRecordId::new(record_id).map_err(ProductionStorageError::from)?,
                    EncryptedRecord::decode(&encoded_record)
                        .map_err(ProductionStorageError::from)?,
                ));
            }
            Ok(records)
        }

        pub fn put_profile_marker(
            &self,
            profile: ProfileName,
        ) -> Result<(), ProductionStorageError> {
            let record = EncryptedRecord::new(
                ProductionRecordKind::ProfileState,
                EncryptedRecordScope::profile(profile),
                b"sqlcipher-page-encryption-v1".to_vec(),
                b"profile-state-v1".to_vec(),
            )?;
            self.put(&profile_marker_record_id(), &record)
        }

        pub fn profile_marker_exists(
            &self,
            profile: &ProfileName,
        ) -> Result<bool, ProductionStorageError> {
            let Some(record) = self.get(&profile_marker_record_id())? else {
                return Ok(false);
            };
            Ok(record.kind == ProductionRecordKind::ProfileState
                && record.scope.profile_name() == profile
                && record.sealed_body == b"profile-state-v1")
        }

        fn save_key_rotation_generation(
            &self,
            generation: KeyRotationGeneration,
        ) -> Result<(), ProductionStorageError> {
            if let Some(current) = self.load_key_rotation_generation()? {
                if generation.value() <= current.value() {
                    return Err(ProductionStorageError::InvalidRecord);
                }
            }
            let record = EncryptedRecord::new(
                ProductionRecordKind::KeyRotationMarker,
                key_rotation_marker_scope()?,
                b"sqlcipher-page-encryption-v1".to_vec(),
                generation.encode().into_bytes(),
            )?;
            self.put(&key_rotation_marker_record_id(), &record)
        }

        pub fn load_key_rotation_generation(
            &self,
        ) -> Result<Option<KeyRotationGeneration>, ProductionStorageError> {
            self.get(&key_rotation_marker_record_id())?
                .map(|record| {
                    if record.kind != ProductionRecordKind::KeyRotationMarker {
                        return Err(ProductionStorageError::InvalidRecord);
                    }
                    if record.scope != key_rotation_marker_scope()? {
                        return Err(ProductionStorageError::InvalidRecord);
                    }
                    let state = String::from_utf8(record.sealed_body)
                        .map_err(|_| ProductionStorageError::InvalidRecord)?;
                    KeyRotationGeneration::decode(&state)
                })
                .transpose()
        }

        pub fn save_replay_window(
            &self,
            record_id: &EncryptedRecordId,
            scope: EncryptedRecordScope,
            replay_window: &ReplayWindow,
        ) -> Result<(), ProductionStorageError> {
            let record = EncryptedRecord::new(
                ProductionRecordKind::ReplayWindowState,
                scope,
                b"sqlcipher-page-encryption-v1".to_vec(),
                replay_window.encode_state().into_bytes(),
            )?;
            self.put(record_id, &record)
        }

        pub fn load_replay_window(
            &self,
            record_id: &EncryptedRecordId,
        ) -> Result<Option<ReplayWindow>, ProductionStorageError> {
            self.load_replay_window_with_scope(record_id, None)
        }

        pub fn load_replay_window_for_scope(
            &self,
            record_id: &EncryptedRecordId,
            expected_scope: &EncryptedRecordScope,
        ) -> Result<Option<ReplayWindow>, ProductionStorageError> {
            self.load_replay_window_with_scope(record_id, Some(expected_scope))
        }

        fn load_replay_window_with_scope(
            &self,
            record_id: &EncryptedRecordId,
            expected_scope: Option<&EncryptedRecordScope>,
        ) -> Result<Option<ReplayWindow>, ProductionStorageError> {
            self.get(record_id)?
                .map(|record| {
                    if record.kind != ProductionRecordKind::ReplayWindowState {
                        return Err(ProductionStorageError::InvalidRecord);
                    }
                    if let Some(scope) = expected_scope {
                        if &record.scope != scope {
                            return Err(ProductionStorageError::InvalidRecord);
                        }
                    }
                    let state = String::from_utf8(record.sealed_body)
                        .map_err(|_| ProductionStorageError::InvalidRecord)?;
                    ReplayWindow::decode_state(&state)
                        .map_err(|_| ProductionStorageError::InvalidRecord)
                })
                .transpose()
        }

        pub fn delete_replay_window(
            &self,
            record_id: &EncryptedRecordId,
        ) -> Result<(), ProductionStorageError> {
            self.delete(record_id)
        }

        pub fn delete_message_envelope(
            &self,
            record_id: &EncryptedRecordId,
        ) -> Result<(), ProductionStorageError> {
            self.delete(record_id)
        }

        pub fn delete_local_message_index(
            &self,
            record_id: &EncryptedRecordId,
        ) -> Result<(), ProductionStorageError> {
            self.delete(record_id)
        }
    }

    fn verify_sqlcipher_key(connection: &Connection) -> Result<(), ProductionStorageError> {
        connection
            .query_row("SELECT count(*) FROM sqlite_master", [], |_row| Ok(()))
            .map_err(|_| ProductionStorageError::UnlockFailed)
    }

    fn apply_forward_only_schema_version(
        connection: &Connection,
    ) -> Result<(), ProductionStorageError> {
        let version =
            connection.pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))?;
        if version > PRODUCTION_SCHEMA_VERSION {
            return Err(ProductionStorageError::InvalidRecord);
        }
        if version == 0 {
            connection.pragma_update(None, "user_version", PRODUCTION_SCHEMA_VERSION)?;
        }
        Ok(())
    }

    pub fn protection_for(kind: ProductionRecordKind) -> StorageProtection {
        match kind {
            ProductionRecordKind::SchemaMarker => StorageProtection::PlaintextAllowed,
            ProductionRecordKind::ProfileState
            | ProductionRecordKind::PairingPayload
            | ProductionRecordKind::PairwiseIdentityPrivateKey
            | ProductionRecordKind::OnionServiceKeyMaterial
            | ProductionRecordKind::NoiseStaticPrivateKey
            | ProductionRecordKind::ReplayWindowState
            | ProductionRecordKind::MessageEnvelope
            | ProductionRecordKind::SentMessage
            | ProductionRecordKind::ReceivedMessage
            | ProductionRecordKind::LocalMessageIndex
            | ProductionRecordKind::MessageCounter
            | ProductionRecordKind::KeyRotationMarker
            | ProductionRecordKind::RendezvousEndpointState
            | ProductionRecordKind::RendezvousEndpointStatus
            | ProductionRecordKind::HandshakeState
            | ProductionRecordKind::SessionDraft
            | ProductionRecordKind::SessionTransportState => {
                StorageProtection::EncryptedAtRestRequired
            }
        }
    }

    pub fn require_encrypted_record_allowed(
        kind: ProductionRecordKind,
    ) -> Result<(), ProductionStoragePolicyError> {
        match protection_for(kind) {
            StorageProtection::EncryptedAtRestRequired => Ok(()),
            protection => {
                Err(ProductionStoragePolicyError::EncryptedRecordForbidden { kind, protection })
            }
        }
    }

    pub fn require_plaintext_write_allowed(
        kind: ProductionRecordKind,
    ) -> Result<(), ProductionStoragePolicyError> {
        match protection_for(kind) {
            StorageProtection::PlaintextAllowed => Ok(()),
            required => Err(ProductionStoragePolicyError::PlaintextForbidden { kind, required }),
        }
    }

    pub fn require_persistence_allowed(
        kind: ProductionRecordKind,
    ) -> Result<(), ProductionStoragePolicyError> {
        match protection_for(kind) {
            StorageProtection::InMemoryOnly => {
                Err(ProductionStoragePolicyError::PersistenceForbidden { kind })
            }
            StorageProtection::PlaintextAllowed | StorageProtection::EncryptedAtRestRequired => {
                Ok(())
            }
        }
    }

    fn profile_marker_record_id() -> EncryptedRecordId {
        EncryptedRecordId::new("profile_state_v1")
            .expect("static production profile marker record id is valid")
    }

    fn key_rotation_marker_record_id() -> EncryptedRecordId {
        EncryptedRecordId::new("key_rotation_generation_v1")
            .expect("static production key rotation marker record id is valid")
    }

    fn key_rotation_marker_scope() -> Result<EncryptedRecordScope, ProductionStorageError> {
        Ok(EncryptedRecordScope::profile(
            ProfileName::new("local-key-lifecycle")
                .map_err(|_| ProductionStorageError::InvalidRecord)?,
        ))
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub struct KeyRotationGeneration(u64);

    impl KeyRotationGeneration {
        pub fn first() -> Self {
            Self(1)
        }

        pub fn value(self) -> u64 {
            self.0
        }

        pub fn next(self) -> Self {
            Self(self.0.saturating_add(1))
        }

        fn encode(self) -> String {
            format!("ADKEYROT1|{}", self.0)
        }

        fn decode(value: &str) -> Result<Self, ProductionStorageError> {
            let parts = value.trim().split('|').collect::<Vec<_>>();
            if parts.len() != 2 || parts[0] != "ADKEYROT1" {
                return Err(ProductionStorageError::InvalidRecord);
            }
            let generation = parts[1]
                .parse::<u64>()
                .map_err(|_| ProductionStorageError::InvalidRecord)?;
            if generation == 0 {
                return Err(ProductionStorageError::InvalidRecord);
            }
            Ok(Self(generation))
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn production_policy_allows_only_schema_marker_plaintext() {
            assert_eq!(
                require_plaintext_write_allowed(ProductionRecordKind::SchemaMarker),
                Ok(())
            );

            for kind in [
                ProductionRecordKind::PairingPayload,
                ProductionRecordKind::ProfileState,
                ProductionRecordKind::PairwiseIdentityPrivateKey,
                ProductionRecordKind::OnionServiceKeyMaterial,
                ProductionRecordKind::NoiseStaticPrivateKey,
                ProductionRecordKind::ReplayWindowState,
                ProductionRecordKind::MessageEnvelope,
                ProductionRecordKind::SentMessage,
                ProductionRecordKind::ReceivedMessage,
                ProductionRecordKind::LocalMessageIndex,
                ProductionRecordKind::MessageCounter,
                ProductionRecordKind::KeyRotationMarker,
                ProductionRecordKind::RendezvousEndpointState,
                ProductionRecordKind::RendezvousEndpointStatus,
                ProductionRecordKind::SessionDraft,
                ProductionRecordKind::HandshakeState,
                ProductionRecordKind::SessionTransportState,
            ] {
                assert!(matches!(
                    require_plaintext_write_allowed(kind),
                    Err(ProductionStoragePolicyError::PlaintextForbidden { .. })
                ));
            }
        }

        #[test]
        fn production_secret_and_metadata_records_require_encryption_at_rest() {
            for kind in [
                ProductionRecordKind::PairingPayload,
                ProductionRecordKind::ProfileState,
                ProductionRecordKind::PairwiseIdentityPrivateKey,
                ProductionRecordKind::OnionServiceKeyMaterial,
                ProductionRecordKind::NoiseStaticPrivateKey,
                ProductionRecordKind::ReplayWindowState,
                ProductionRecordKind::MessageEnvelope,
                ProductionRecordKind::SentMessage,
                ProductionRecordKind::ReceivedMessage,
                ProductionRecordKind::LocalMessageIndex,
                ProductionRecordKind::MessageCounter,
                ProductionRecordKind::KeyRotationMarker,
                ProductionRecordKind::RendezvousEndpointState,
                ProductionRecordKind::RendezvousEndpointStatus,
                ProductionRecordKind::SessionDraft,
                ProductionRecordKind::HandshakeState,
                ProductionRecordKind::SessionTransportState,
            ] {
                assert_eq!(
                    protection_for(kind),
                    StorageProtection::EncryptedAtRestRequired
                );
                assert_eq!(require_persistence_allowed(kind), Ok(()));
            }
        }

        #[test]
        fn production_session_transport_state_requires_encryption_at_rest() {
            assert_eq!(
                protection_for(ProductionRecordKind::SessionTransportState),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                require_persistence_allowed(ProductionRecordKind::SessionTransportState),
                Ok(())
            );
        }

        #[test]
        fn encrypted_record_round_trips_with_associated_data_scope() {
            let record = EncryptedRecord::new(
                ProductionRecordKind::MessageEnvelope,
                EncryptedRecordScope::contact(
                    ProfileName::new("alice").expect("profile"),
                    ContactId::new("bob").expect("contact"),
                ),
                vec![1, 2, 3],
                vec![4, 5, 6],
            )
            .expect("encrypted record");

            let decoded = EncryptedRecord::decode(&record.encode()).expect("decode");
            assert_eq!(decoded, record);
            assert_eq!(
                decoded.associated_data(),
                b"AD-ENCRYPTED-RECORD-V1|message-envelope|alice|contact:bob"
            );
        }

        #[test]
        fn encrypted_record_id_rejects_path_like_or_empty_identifiers() {
            assert!(EncryptedRecordId::new("record_0001").is_ok());
            for value in ["", "alice/bob/0001", "alice:bob", "bad id"] {
                assert_eq!(
                    EncryptedRecordId::new(value),
                    Err(ProductionStoragePolicyError::InvalidRecordId)
                );
            }
        }

        #[test]
        fn profile_passphrase_and_database_key_debug_are_redacted() {
            let passphrase =
                ProfilePassphrase::new("correct horse battery staple").expect("passphrase");
            let database_key = passphrase.as_database_key();

            assert_eq!(format!("{passphrase:?}"), "ProfilePassphrase(<redacted>)");
            assert_eq!(
                format!("{database_key:?}"),
                "StorageDatabaseKey(<redacted>)"
            );
            assert!(!format!("{passphrase:?}").contains("correct horse"));
            assert!(!format!("{database_key:?}").contains("correct horse"));
        }

        #[test]
        fn high_risk_unlock_rejects_os_keystore_only_auto_unlock() {
            let request = UnlockRequest::new(
                UnlockMode::HighRisk,
                vec![UnlockFactor::OsKeystoreWrappedKey],
            );

            assert_eq!(
                request.require_allowed(),
                Err(ProductionStoragePolicyError::UnlockPolicyViolation)
            );
        }

        #[test]
        fn profile_store_unlock_recovery_decision_separates_local_failures_without_secrets() {
            let cases = [
                (
                    ProfileStoreUnlockFailureKind::WrongPassphrase,
                    true,
                    false,
                    false,
                    "retry-passphrase",
                ),
                (
                    ProfileStoreUnlockFailureKind::MissingStore,
                    false,
                    true,
                    false,
                    "create-new-local-profile",
                ),
                (
                    ProfileStoreUnlockFailureKind::CorruptStore,
                    false,
                    true,
                    false,
                    "inspect-local-store-or-create-new-profile",
                ),
                (
                    ProfileStoreUnlockFailureKind::MigrationNeeded,
                    false,
                    false,
                    true,
                    "run-supported-local-store-migration",
                ),
                (
                    ProfileStoreUnlockFailureKind::UnsupportedUnlockFactor,
                    true,
                    false,
                    false,
                    "unlock-with-profile-passphrase",
                ),
            ];

            for (
                kind,
                retry_with_passphrase_allowed,
                create_new_profile_allowed,
                migration_required,
                next_action,
            ) in cases
            {
                let decision = profile_store_unlock_recovery_decision(kind);
                assert_eq!(decision.kind(), kind);
                assert_eq!(
                    decision.retry_with_passphrase_allowed(),
                    retry_with_passphrase_allowed
                );
                assert_eq!(decision.create_new_profile_allowed(), create_new_profile_allowed);
                assert_eq!(decision.migration_required(), migration_required);
                assert_eq!(decision.next_action(), next_action);
                assert!(decision.passphrase_required());
                assert!(!decision.os_keychain_only_supported());
                assert!(!decision.raw_path_returned());
                assert!(!decision.passphrase_returned());
                assert!(!decision.key_material_exposed());
                assert!(!decision.backup_recovery_claimed());
                assert!(!decision.rollback_protection_claimed());
                assert!(!decision.secure_media_deletion_claimed());
                assert!(!decision.generic_error());
            }

            assert_eq!(
                classify_profile_store_unlock_error(
                    &ProductionStorageError::UnlockFailed,
                    true,
                    false,
                    false
                ),
                ProfileStoreUnlockFailureKind::WrongPassphrase
            );
            assert_eq!(
                classify_profile_store_unlock_error(
                    &ProductionStorageError::UnlockFailed,
                    false,
                    false,
                    false
                ),
                ProfileStoreUnlockFailureKind::MissingStore
            );
            assert_eq!(
                classify_profile_store_unlock_error(
                    &ProductionStorageError::Database("database malformed".to_string()),
                    true,
                    false,
                    true
                ),
                ProfileStoreUnlockFailureKind::CorruptStore
            );
            assert_eq!(
                classify_profile_store_unlock_error(
                    &ProductionStorageError::InvalidRecord,
                    true,
                    true,
                    false
                ),
                ProfileStoreUnlockFailureKind::MigrationNeeded
            );
            assert_eq!(
                classify_profile_store_unlock_error(
                    &ProductionStorageError::Policy(
                        ProductionStoragePolicyError::UnlockPolicyViolation
                    ),
                    true,
                    false,
                    false
                ),
                ProfileStoreUnlockFailureKind::UnsupportedUnlockFactor
            );
        }

        #[test]
        fn unlock_policy_requires_passphrase_for_all_modes() {
            for mode in [UnlockMode::HighRisk, UnlockMode::Standard] {
                assert_eq!(
                    UnlockRequest::new(mode, Vec::new()).require_allowed(),
                    Err(ProductionStoragePolicyError::UnlockPolicyViolation)
                );
                assert_eq!(
                    UnlockRequest::new(mode, vec![UnlockFactor::OsKeystoreWrappedKey])
                        .require_allowed(),
                    Err(ProductionStoragePolicyError::UnlockPolicyViolation)
                );
                assert_eq!(
                    UnlockRequest::new(mode, vec![UnlockFactor::Passphrase]).require_allowed(),
                    Ok(())
                );
                assert_eq!(
                    UnlockRequest::new(
                        mode,
                        vec![UnlockFactor::Passphrase, UnlockFactor::OsKeystoreWrappedKey]
                    )
                    .require_allowed(),
                    Ok(())
                );
            }
        }

        #[test]
        fn encrypted_record_rejects_plaintext_allowed_and_in_memory_only_kinds() {
            assert!(matches!(
                EncryptedRecord::new(
                    ProductionRecordKind::SchemaMarker,
                    EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                    vec![1],
                    vec![2],
                ),
                Err(ProductionStoragePolicyError::EncryptedRecordForbidden { .. })
            ));
        }

        #[test]
        fn encrypted_record_decoder_rejects_malformed_records() {
            for record in [
                "",
                "ADREC1|message-envelope|alice|profile|01",
                "ADREC1|message-envelope|alice|profile|zz|02",
                "ADREC1|schema-marker|alice|profile|01|02",
                "ADREC1|message-envelope|bad profile|profile|01|02",
                "ADREC1|message-envelope|alice|contact:bad contact|01|02",
            ] {
                assert!(EncryptedRecord::decode(record).is_err());
            }
        }

        #[test]
        fn sqlcipher_store_round_trips_adrec1_without_plaintext_file_body() {
            let (_dir, path) = unique_test_database_path("round-trip");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            assert_eq!(
                store.schema_version().expect("schema version"),
                PRODUCTION_SCHEMA_VERSION
            );
            let record = EncryptedRecord::new(
                ProductionRecordKind::MessageEnvelope,
                EncryptedRecordScope::contact(
                    ProfileName::new("alice").expect("profile"),
                    ContactId::new("bob").expect("contact"),
                ),
                b"nonce-for-test".to_vec(),
                b"sealed-body-for-test".to_vec(),
            )
            .expect("record");

            let record_id = EncryptedRecordId::new("record_0001").expect("record id");
            store.put(&record_id, &record).expect("put");
            assert_eq!(store.get(&record_id).expect("get"), Some(record));
            let database_bytes = std::fs::read(&path).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"sealed-body-for-test"));
            assert!(!contains_bytes(&database_bytes, b"ADREC1"));
        }

        #[test]
        fn sqlcipher_store_rekey_rotates_passphrase_without_plaintext_exposure() {
            let (_dir, path) = unique_test_database_path("rekey-passphrase");
            let old_passphrase = ProfilePassphrase::new("old-passphrase").expect("passphrase");
            let new_passphrase = ProfilePassphrase::new("new-passphrase").expect("passphrase");
            let record_id = EncryptedRecordId::new("record_0001").expect("record id");
            let record = EncryptedRecord::new(
                ProductionRecordKind::MessageEnvelope,
                EncryptedRecordScope::contact(
                    ProfileName::new("alice").expect("profile"),
                    ContactId::new("bob").expect("contact"),
                ),
                b"nonce-for-test".to_vec(),
                b"sealed-body-for-test".to_vec(),
            )
            .expect("record");

            {
                let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &old_passphrase)
                    .expect("open with old passphrase");
                store.put(&record_id, &record).expect("put before rekey");
                store.rekey_with_passphrase(&new_passphrase).expect("rekey");
                assert_eq!(
                    store.get(&record_id).expect("read after rekey"),
                    Some(record.clone())
                );
            }

            assert_eq!(
                SqlCipherRecordStore::unlock_with_passphrase(&path, &old_passphrase)
                    .map(|store| store.get(&record_id)),
                Err(ProductionStorageError::UnlockFailed)
            );
            let reopened = SqlCipherRecordStore::unlock_with_passphrase(&path, &new_passphrase)
                .expect("open with new passphrase");
            assert_eq!(reopened.get(&record_id).expect("get"), Some(record));

            let database_bytes = std::fs::read(&path).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"sealed-body-for-test"));
            assert!(!contains_bytes(&database_bytes, b"ADREC1"));
        }

        #[test]
        fn sqlcipher_store_rekey_records_forward_rotation_generation_without_plaintext_marker() {
            let (_dir, path) = unique_test_database_path("rekey-generation");
            let old_passphrase = ProfilePassphrase::new("old-passphrase").expect("passphrase");
            let new_passphrase = ProfilePassphrase::new("new-passphrase").expect("passphrase");
            let second_passphrase =
                ProfilePassphrase::new("second-passphrase").expect("passphrase");

            {
                let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &old_passphrase)
                    .expect("open with old passphrase");
                assert_eq!(
                    store
                        .load_key_rotation_generation()
                        .expect("load generation"),
                    None
                );
                let generation = store
                    .rekey_with_passphrase_rotation_generation(&new_passphrase)
                    .expect("first rotation");
                assert_eq!(generation.value(), 1);
            }

            assert_eq!(
                SqlCipherRecordStore::unlock_with_passphrase(&path, &old_passphrase)
                    .map(|store| store.load_key_rotation_generation()),
                Err(ProductionStorageError::UnlockFailed)
            );

            {
                let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &new_passphrase)
                    .expect("open with new passphrase");
                assert_eq!(
                    store
                        .load_key_rotation_generation()
                        .expect("load generation"),
                    Some(KeyRotationGeneration::first())
                );
                let generation = store
                    .rekey_with_passphrase_rotation_generation(&second_passphrase)
                    .expect("second rotation");
                assert_eq!(generation.value(), 2);
            }

            let reopened = SqlCipherRecordStore::unlock_with_passphrase(&path, &second_passphrase)
                .expect("open with second passphrase");
            assert_eq!(
                reopened
                    .load_key_rotation_generation()
                    .expect("load generation"),
                Some(KeyRotationGeneration::first().next())
            );

            let database_bytes = std::fs::read(&path).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"ADKEYROT1"));
            assert!(!contains_bytes(&database_bytes, b"key-rotation-marker"));
        }

        #[test]
        fn sqlcipher_store_key_rotation_generation_marker_is_monotonic() {
            let (_dir, path) = unique_test_database_path("rekey-generation-monotonic");
            let passphrase = ProfilePassphrase::new("test-passphrase").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let first = KeyRotationGeneration::first();
            let second = first.next();

            store
                .save_key_rotation_generation(first)
                .expect("save first generation");
            assert_eq!(
                store
                    .save_key_rotation_generation(first)
                    .expect_err("duplicate generation must fail"),
                ProductionStorageError::InvalidRecord
            );
            store
                .save_key_rotation_generation(second)
                .expect("save second generation");
            assert_eq!(
                store
                    .save_key_rotation_generation(first)
                    .expect_err("downgrade generation must fail"),
                ProductionStorageError::InvalidRecord
            );
            assert_eq!(
                store
                    .load_key_rotation_generation()
                    .expect("load generation"),
                Some(second)
            );

            let database_bytes = std::fs::read(&path).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"ADKEYROT1"));
            assert!(!contains_bytes(&database_bytes, b"key-rotation-marker"));
        }

        #[test]
        fn sqlcipher_store_rejects_key_rotation_marker_scope_mismatch() {
            let (_dir, path) = unique_test_database_path("rekey-generation-scope");
            let passphrase = ProfilePassphrase::new("test-passphrase").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let wrong_scope_record = EncryptedRecord::new(
                ProductionRecordKind::KeyRotationMarker,
                EncryptedRecordScope::profile(ProfileName::new("wrong-profile").expect("profile")),
                b"sqlcipher-page-encryption-v1".to_vec(),
                KeyRotationGeneration::first().encode().into_bytes(),
            )
            .expect("wrong scope record");

            store
                .put(&key_rotation_marker_record_id(), &wrong_scope_record)
                .expect("write wrong scope marker");

            assert_eq!(
                store
                    .load_key_rotation_generation()
                    .expect_err("wrong marker scope must fail"),
                ProductionStorageError::InvalidRecord
            );
        }

        #[test]
        fn sqlcipher_store_schema_migration_is_forward_only() {
            let (_dir, path) = unique_test_database_path("schema-version");
            let key = StorageDatabaseKey::test_only("test-key");
            let store = SqlCipherRecordStore::open(&path, &key).expect("open v1 store");
            assert_eq!(
                store.schema_version().expect("schema version"),
                PRODUCTION_SCHEMA_VERSION
            );
            drop(store);

            let raw = Connection::open(&path).expect("open raw sqlite");
            raw.pragma_update(None, "key", key.expose_for_sqlcipher())
                .expect("set key");
            raw.pragma_update(None, "user_version", PRODUCTION_SCHEMA_VERSION + 1)
                .expect("set future version");
            drop(raw);

            assert!(matches!(
                SqlCipherRecordStore::open(&path, &key),
                Err(ProductionStorageError::InvalidRecord)
            ));
        }

        #[test]
        fn sqlcipher_store_persists_replay_window_without_plaintext_state_on_disk() {
            let (_dir, path) = unique_test_database_path("replay-window");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let mut replay_window = ReplayWindow::new(4).expect("replay window");
            replay_window.accept(1).expect("accept first");
            replay_window.accept(3).expect("accept third");
            let record_id = EncryptedRecordId::new("replay_0001").expect("record id");

            store
                .save_replay_window(
                    &record_id,
                    EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                    &replay_window,
                )
                .expect("save replay window");

            let encoded_replay_window = replay_window.encode_state();
            assert_eq!(
                store.load_replay_window(&record_id).expect("load"),
                Some(replay_window)
            );
            let database_bytes = std::fs::read(&path).expect("read database");
            assert!(!contains_bytes(&database_bytes, b"ADREPLAY1"));
            assert!(!contains_bytes(
                &database_bytes,
                encoded_replay_window.as_bytes()
            ));
        }

        #[test]
        fn sqlcipher_store_rejects_replay_state_missing_highest_seen_message() {
            let (_dir, path) = unique_test_database_path("replay-window-missing-highest");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let record_id = EncryptedRecordId::new("replay_0001").expect("record id");
            let record = EncryptedRecord::new(
                ProductionRecordKind::ReplayWindowState,
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                b"sqlcipher-page-encryption-v1".to_vec(),
                b"ADREPLAY1|4|6|4,5".to_vec(),
            )
            .expect("record");

            store.put(&record_id, &record).expect("put replay record");

            assert_eq!(
                store.load_replay_window(&record_id),
                Err(ProductionStorageError::InvalidRecord)
            );
        }

        #[test]
        fn sqlcipher_store_rejects_replay_window_scope_mismatch() {
            let (_dir, path) = unique_test_database_path("replay-window-scope");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let mut replay_window = ReplayWindow::new(4).expect("replay window");
            replay_window.accept(1).expect("accept first");
            let record_id = EncryptedRecordId::new("replay_scope_0001").expect("record id");
            let stored_scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                ContactId::new("bob").expect("contact"),
            );
            let wrong_scope = EncryptedRecordScope::contact(
                ProfileName::new("alice").expect("profile"),
                ContactId::new("mallory").expect("contact"),
            );

            store
                .save_replay_window(&record_id, stored_scope.clone(), &replay_window)
                .expect("save replay window");
            assert_eq!(
                store
                    .load_replay_window_for_scope(&record_id, &stored_scope)
                    .expect("load scoped replay"),
                Some(replay_window)
            );
            assert_eq!(
                store
                    .load_replay_window_for_scope(&record_id, &wrong_scope)
                    .expect_err("wrong replay scope must fail"),
                ProductionStorageError::InvalidRecord
            );
        }

        #[test]
        fn replay_persistence_guarantees_do_not_claim_rollback_protection() {
            assert_eq!(
                replay_persistence_guarantees(),
                ReplayPersistenceGuarantees {
                    at_rest_encrypted: true,
                    commit_after_decrypt: true,
                    rollback_protection: ReplayRollbackProtection::NotProvided,
                }
            );
        }

        #[test]
        fn storage_backend_integration_summary_keeps_non_ready_boundaries_explicit() {
            let summary = storage_backend_integration_boundary_summary();

            assert_eq!(summary.backend(), StorageBackendKind::SqlCipherAdrec1Spike);
            assert!(summary.passphrase_first_unlock());
            assert!(summary.encrypted_record_body_store());
            assert!(summary.sqlcipher_passphrase_rekey_source_ready());
            assert!(summary.sqlcipher_passphrase_rotation_generation_source_ready());
            assert!(summary.key_rotation_marker_monotonic_write_enforced());
            assert!(summary.key_rotation_marker_scope_bound());
            assert!(summary.replay_window_scope_bound_loader_ready());
            assert!(!summary.production_key_management_ready());
            assert_eq!(
                summary.rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(!summary.secure_deletion_from_media());
            assert!(summary.session_transport_persistence_allowed());
        }

        #[test]
        fn production_message_storage_summary_allows_encrypted_session_transport() {
            let summary = production_message_storage_boundary_summary();

            assert_eq!(
                summary.replay_window_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                summary.message_envelope_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                summary.local_message_index_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                summary.endpoint_state_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert_eq!(
                summary.session_transport_storage(),
                StorageProtection::EncryptedAtRestRequired
            );
            assert!(summary.replay_commit_after_decrypt());
            assert_eq!(
                summary.rollback_protection(),
                ReplayRollbackProtection::NotProvided
            );
            assert!(!summary.production_key_management_ready());
            assert!(!summary.secure_deletion_from_media());
            assert!(summary.durable_session_transport_persistence_allowed());
        }

        #[test]
        fn sqlcipher_store_returns_none_for_missing_replay_window() {
            let (_dir, path) = unique_test_database_path("missing-replay-window");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let record_id = EncryptedRecordId::new("missing_replay").expect("record id");

            assert_eq!(store.load_replay_window(&record_id).expect("load"), None);
        }

        #[test]
        fn sqlcipher_store_delete_replay_window_removes_replay_state() {
            let (_dir, path) = unique_test_database_path("delete-replay-window");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let mut replay_window = ReplayWindow::new(4).expect("replay window");
            replay_window.accept(1).expect("accept first");
            replay_window.accept(2).expect("accept second");
            let record_id = EncryptedRecordId::new("replay_delete_0001").expect("record id");

            store
                .save_replay_window(
                    &record_id,
                    EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                    &replay_window,
                )
                .expect("save replay window");
            assert_eq!(
                store.load_replay_window(&record_id).expect("load"),
                Some(replay_window)
            );

            store
                .delete_replay_window(&record_id)
                .expect("delete replay window");

            assert_eq!(
                store
                    .load_replay_window(&record_id)
                    .expect("load after delete"),
                None
            );
        }

        #[test]
        fn sqlcipher_store_delete_helpers_are_idempotent_for_missing_records() {
            let (_dir, path) = unique_test_database_path("delete-missing-typed-records");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let record_id = EncryptedRecordId::new("missing_replay_delete").expect("record id");

            store
                .delete_replay_window(&record_id)
                .expect("first delete replay");
            store
                .delete_replay_window(&record_id)
                .expect("second delete replay");
            store
                .delete_message_envelope(&record_id)
                .expect("delete message envelope");
            store
                .delete_local_message_index(&record_id)
                .expect("delete local index");
            store
                .delete_message_envelope(&record_id)
                .expect("second delete message envelope");
            store
                .delete_local_message_index(&record_id)
                .expect("second delete local index");

            assert_eq!(store.get(&record_id).expect("get missing"), None);
            assert_eq!(store.load_replay_window(&record_id).expect("load"), None);
        }

        #[test]
        fn sqlcipher_store_delete_removes_encrypted_record_by_opaque_id() {
            let (_dir, path) = unique_test_database_path("delete-record");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let record_id = EncryptedRecordId::new("record_delete_0001").expect("record id");
            let record = EncryptedRecord::new(
                ProductionRecordKind::MessageEnvelope,
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                b"nonce-for-test".to_vec(),
                b"sealed-body-for-test".to_vec(),
            )
            .expect("record");

            store.put(&record_id, &record).expect("put");
            assert_eq!(store.get(&record_id).expect("get"), Some(record));

            store.delete(&record_id).expect("delete");

            assert_eq!(store.get(&record_id).expect("get after delete"), None);
        }

        #[test]
        fn sqlcipher_store_delete_is_idempotent_for_missing_record() {
            let (_dir, path) = unique_test_database_path("delete-missing-record");
            let passphrase = ProfilePassphrase::new("test-key").expect("passphrase");
            let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &passphrase)
                .expect("open store");
            let record_id = EncryptedRecordId::new("missing_record").expect("record id");

            store.delete(&record_id).expect("first delete");
            store.delete(&record_id).expect("second delete");
            assert_eq!(store.get(&record_id).expect("get missing"), None);
        }

        #[test]
        fn sqlcipher_store_rejects_wrong_passphrase_before_returning_records() {
            let (_dir, path) = unique_test_database_path("wrong-passphrase");
            let record_id = EncryptedRecordId::new("record_0001").expect("record id");
            let record = EncryptedRecord::new(
                ProductionRecordKind::MessageEnvelope,
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                b"nonce-for-test".to_vec(),
                b"sealed-body-for-test".to_vec(),
            )
            .expect("record");

            {
                let correct = ProfilePassphrase::new("correct-passphrase").expect("passphrase");
                let store = SqlCipherRecordStore::unlock_with_passphrase(&path, &correct)
                    .expect("open store");
                store.put(&record_id, &record).expect("put");
            }

            let wrong = ProfilePassphrase::new("wrong-passphrase").expect("passphrase");
            assert_eq!(
                SqlCipherRecordStore::unlock_with_passphrase(&path, &wrong)
                    .map(|store| store.get(&record_id)),
                Err(ProductionStorageError::UnlockFailed)
            );
        }

        #[test]
        fn locked_profile_store_requires_explicit_unlock_before_reads() {
            let (_dir, path) = unique_test_database_path("locked-profile");
            let passphrase = ProfilePassphrase::new("correct-passphrase").expect("passphrase");
            let locked = LockedProfileStore::new(path);
            let record_id = EncryptedRecordId::new("record_0001").expect("record id");
            let record = EncryptedRecord::new(
                ProductionRecordKind::MessageEnvelope,
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                b"nonce-for-test".to_vec(),
                b"sealed-body-for-test".to_vec(),
            )
            .expect("record");

            {
                let unlocked = locked.unlock(&passphrase).expect("unlock");
                unlocked.put(&record_id, &record).expect("put");
            }

            let unlocked = locked.unlock(&passphrase).expect("unlock again");
            assert_eq!(unlocked.get(&record_id).expect("get"), Some(record));
        }

        #[test]
        fn production_profile_marker_persists_in_unlocked_store() {
            let (_dir, path) = unique_test_database_path("profile-marker");
            let passphrase = ProfilePassphrase::new("correct-passphrase").expect("passphrase");
            let profile = ProfileName::new("alice").expect("profile");

            {
                let locked = LockedProfileStore::new(&path);
                let unlocked = locked.unlock(&passphrase).expect("unlock");
                assert!(!unlocked
                    .profile_marker_exists(&profile)
                    .expect("profile marker check"));
                unlocked
                    .put_profile_marker(profile.clone())
                    .expect("put profile marker");
            }

            let unlocked = LockedProfileStore::new(&path)
                .unlock(&passphrase)
                .expect("unlock again");
            assert!(unlocked
                .profile_marker_exists(&profile)
                .expect("profile marker exists"));
        }

        #[test]
        fn sqlcipher_store_uses_opaque_record_ids() {
            let (_dir, path) = unique_test_database_path("empty-key");
            let store =
                SqlCipherRecordStore::open(&path, &StorageDatabaseKey::test_only("test-key"))
                    .expect("open store");
            let record = EncryptedRecord::new(
                ProductionRecordKind::ReplayWindowState,
                EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                vec![1],
                vec![2],
            )
            .expect("record");

            assert_eq!(
                EncryptedRecordId::new(""),
                Err(ProductionStoragePolicyError::InvalidRecordId)
            );
            let record_id = EncryptedRecordId::new("record_0001").expect("record id");
            store.put(&record_id, &record).expect("put");
        }

        fn unique_test_database_path(test_name: &str) -> (std::path::PathBuf, std::path::PathBuf) {
            let dir = std::env::temp_dir().join(format!(
                "another-dimension-sqlcipher-{test_name}-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            if dir.exists() {
                std::fs::remove_dir_all(&dir).expect("remove stale test dir");
            }
            std::fs::create_dir_all(&dir).expect("create test dir");
            let path = dir.join("store.db");
            (dir, path)
        }

        fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
            haystack
                .windows(needle.len())
                .any(|window| window == needle)
        }
    }
}

#[cfg(feature = "dev-insecure")]
pub mod dev_insecure {
    use super::*;

    #[derive(Clone, Debug)]
    pub struct DevFileStore {
        root: PathBuf,
    }

    impl DevFileStore {
        pub fn new(root: impl Into<PathBuf>) -> Self {
            Self { root: root.into() }
        }

        pub fn root(&self) -> &Path {
            &self.root
        }

        pub fn save_own_pairing(
            &self,
            profile: &ProfileName,
            payload: &PairingPayload,
        ) -> Result<(), StorageError> {
            let dir = self.profile_dir(profile).join("own_pairings");
            fs::create_dir_all(&dir)?;
            fs::write(
                dir.join(format!("{}.pair", payload.pairing_nonce)),
                payload.encode().map_err(|_| StorageError::InvalidRecord)?,
            )?;
            fs::write(
                self.profile_dir(profile).join("latest_own_pairing"),
                &payload.pairing_nonce,
            )?;
            Ok(())
        }

        pub fn save_own_pairing_material(
            &self,
            profile: &ProfileName,
            payload: &PairingPayload,
            private_key: &PairwisePrivateKey,
        ) -> Result<(), StorageError> {
            self.save_own_pairing(profile, payload)?;
            let keys_dir = self.profile_dir(profile).join("own_pairing_keys");
            fs::create_dir_all(&keys_dir)?;
            fs::write(
                self.own_pairing_key_path(profile, &payload.pairing_nonce),
                private_key.as_str(),
            )?;
            Ok(())
        }

        pub fn latest_own_pairing(
            &self,
            profile: &ProfileName,
        ) -> Result<PairingPayload, StorageError> {
            let nonce = fs::read_to_string(self.profile_dir(profile).join("latest_own_pairing"))?;
            let payload = fs::read_to_string(
                self.profile_dir(profile)
                    .join("own_pairings")
                    .join(format!("{}.pair", nonce.trim())),
            )?;
            PairingPayload::decode(&payload).map_err(|_| StorageError::InvalidRecord)
        }

        pub fn save_pending_contact(&self, pending: &PendingContact) -> Result<(), StorageError> {
            let profile = &pending.local_payload.owner_profile;
            let dir = self.profile_dir(profile).join("pending");
            fs::create_dir_all(&dir)?;
            let record = format!(
                "{}\n{}\n{}\n{}\n",
                pending
                    .local_payload
                    .encode()
                    .map_err(|_| StorageError::InvalidRecord)?,
                pending
                    .remote_payload
                    .encode()
                    .map_err(|_| StorageError::InvalidRecord)?,
                pending.safety_number,
                pending.safety_phrase
            );
            fs::write(
                dir.join(format!("{}.pending", pending.contact_id.as_str())),
                record,
            )?;
            self.copy_own_pairing_key_to_pending(profile, pending)?;
            self.remove_own_pairing_material(profile, &pending.local_payload.pairing_nonce)?;
            Ok(())
        }

        pub fn activate_contact(
            &self,
            profile: &ProfileName,
            contact: &ContactId,
        ) -> Result<(), StorageError> {
            let pending_path = self
                .profile_dir(profile)
                .join("pending")
                .join(format!("{}.pending", contact.as_str()));
            let record = fs::read_to_string(&pending_path)?;
            let contacts_dir = self.profile_dir(profile).join("contacts");
            fs::create_dir_all(&contacts_dir)?;
            fs::write(
                contacts_dir.join(format!("{}.contact", contact.as_str())),
                record,
            )?;
            self.move_pending_key_to_contact(profile, contact)?;
            fs::remove_file(pending_path)?;
            Ok(())
        }

        pub fn remove_pending_contact(
            &self,
            profile: &ProfileName,
            contact: &ContactId,
        ) -> Result<bool, StorageError> {
            let pending_path = self
                .profile_dir(profile)
                .join("pending")
                .join(format!("{}.pending", contact.as_str()));
            if pending_path.exists() {
                fs::remove_file(pending_path)?;
                self.remove_pending_key(profile, contact)?;
                Ok(true)
            } else {
                Ok(false)
            }
        }

        pub fn load_pending_contacts(
            &self,
            profile: &ProfileName,
        ) -> Result<Vec<PendingContact>, StorageError> {
            let pending_dir = self.profile_dir(profile).join("pending");
            if !pending_dir.exists() {
                return Ok(Vec::new());
            }
            let mut contacts = Vec::new();
            for entry in fs::read_dir(pending_dir)? {
                let path = entry?.path();
                if path.extension().and_then(|ext| ext.to_str()) == Some("pending") {
                    contacts.push(decode_pending_contact(&fs::read_to_string(path)?)?);
                }
            }
            contacts.sort_by(|left, right| left.contact_id.cmp(&right.contact_id));
            Ok(contacts)
        }

        pub fn pending_key_exists(&self, profile: &ProfileName, contact: &ContactId) -> bool {
            self.pending_key_path(profile, contact).exists()
        }

        pub fn contact_key_exists(&self, profile: &ProfileName, contact: &ContactId) -> bool {
            self.contact_key_path(profile, contact).exists()
        }

        pub fn own_pairing_material_exists(&self, profile: &ProfileName, nonce: &str) -> bool {
            self.own_pairing_path(profile, nonce).exists()
                || self.own_pairing_key_path(profile, nonce).exists()
        }

        pub fn pending_contact_exists(&self, profile: &ProfileName, contact: &ContactId) -> bool {
            self.profile_dir(profile)
                .join("pending")
                .join(format!("{}.pending", contact.as_str()))
                .exists()
        }

        pub fn contact_exists(&self, profile: &ProfileName, contact: &ContactId) -> bool {
            self.profile_dir(profile)
                .join("contacts")
                .join(format!("{}.contact", contact.as_str()))
                .exists()
        }

        pub fn save_inbox_envelope(
            &self,
            profile: &ProfileName,
            envelope: &Envelope,
        ) -> Result<(), StorageError> {
            let inbox = self.profile_dir(profile).join("inbox");
            fs::create_dir_all(&inbox)?;
            let path = inbox.join(format!(
                "{:020}-{}.env",
                envelope.message_number, envelope.channel_id
            ));
            fs::write(path, envelope.encode())?;
            Ok(())
        }

        pub fn load_inbox_envelopes(
            &self,
            profile: &ProfileName,
        ) -> Result<Vec<Envelope>, StorageError> {
            let inbox = self.profile_dir(profile).join("inbox");
            if !inbox.exists() {
                return Ok(Vec::new());
            }
            let mut envelopes = Vec::new();
            for entry in fs::read_dir(inbox)? {
                let path = entry?.path();
                if path.extension().and_then(|ext| ext.to_str()) == Some("env") {
                    let record = fs::read_to_string(path)?;
                    envelopes
                        .push(Envelope::decode(&record).map_err(|_| StorageError::InvalidRecord)?);
                }
            }
            envelopes.sort_by_key(|envelope| envelope.message_number);
            Ok(envelopes)
        }

        pub fn clear_inbox(&self, profile: &ProfileName) -> Result<usize, StorageError> {
            let inbox = self.profile_dir(profile).join("inbox");
            if !inbox.exists() {
                return Ok(0);
            }
            let mut count = 0;
            for entry in fs::read_dir(inbox)? {
                let path = entry?.path();
                if path.extension().and_then(|ext| ext.to_str()) == Some("env") {
                    fs::remove_file(path)?;
                    count += 1;
                }
            }
            Ok(count)
        }

        pub fn load_replay_window(
            &self,
            profile: &ProfileName,
            channel_id: &str,
            window_size: u64,
        ) -> Result<ReplayWindow, StorageError> {
            let path = self.replay_path(profile, channel_id);
            if !path.exists() {
                return ReplayWindow::new(window_size).map_err(|_| StorageError::InvalidRecord);
            }
            let record = fs::read_to_string(path)?;
            ReplayWindow::decode_state(&record).map_err(|_| StorageError::InvalidRecord)
        }

        pub fn save_replay_window(
            &self,
            profile: &ProfileName,
            channel_id: &str,
            window: &ReplayWindow,
        ) -> Result<(), StorageError> {
            let dir = self.profile_dir(profile).join("replay");
            fs::create_dir_all(&dir)?;
            fs::write(self.replay_path(profile, channel_id), window.encode_state())?;
            Ok(())
        }

        fn profile_dir(&self, profile: &ProfileName) -> PathBuf {
            self.root.join("profiles").join(profile.as_str())
        }

        fn remove_own_pairing_material(
            &self,
            profile: &ProfileName,
            nonce: &str,
        ) -> Result<(), StorageError> {
            let pairing_path = self.own_pairing_path(profile, nonce);
            if pairing_path.exists() {
                fs::remove_file(pairing_path)?;
            }
            let key_path = self.own_pairing_key_path(profile, nonce);
            if key_path.exists() {
                fs::remove_file(key_path)?;
            }
            let latest_path = self.profile_dir(profile).join("latest_own_pairing");
            if latest_path.exists()
                && fs::read_to_string(&latest_path)
                    .map(|latest| latest.trim() == nonce)
                    .unwrap_or(false)
            {
                fs::remove_file(latest_path)?;
            }
            Ok(())
        }

        fn own_pairing_path(&self, profile: &ProfileName, nonce: &str) -> PathBuf {
            self.profile_dir(profile)
                .join("own_pairings")
                .join(format!("{nonce}.pair"))
        }

        fn own_pairing_key_path(&self, profile: &ProfileName, nonce: &str) -> PathBuf {
            self.profile_dir(profile)
                .join("own_pairing_keys")
                .join(format!("{nonce}.key"))
        }

        fn replay_path(&self, profile: &ProfileName, channel_id: &str) -> PathBuf {
            self.profile_dir(profile)
                .join("replay")
                .join(format!("{}.state", safe_file_component(channel_id)))
        }

        fn copy_own_pairing_key_to_pending(
            &self,
            profile: &ProfileName,
            pending: &PendingContact,
        ) -> Result<(), StorageError> {
            let own_key = self.own_pairing_key_path(profile, &pending.local_payload.pairing_nonce);
            let key_material = fs::read_to_string(own_key)?;
            let pending_keys = self.profile_dir(profile).join("pending_keys");
            fs::create_dir_all(&pending_keys)?;
            fs::write(
                self.pending_key_path(profile, &pending.contact_id),
                key_material,
            )?;
            Ok(())
        }

        fn move_pending_key_to_contact(
            &self,
            profile: &ProfileName,
            contact: &ContactId,
        ) -> Result<(), StorageError> {
            let pending_key = self.pending_key_path(profile, contact);
            let key_material = fs::read_to_string(&pending_key)?;
            let contact_keys = self.profile_dir(profile).join("contact_keys");
            fs::create_dir_all(&contact_keys)?;
            fs::write(self.contact_key_path(profile, contact), key_material)?;
            fs::remove_file(pending_key)?;
            Ok(())
        }

        fn remove_pending_key(
            &self,
            profile: &ProfileName,
            contact: &ContactId,
        ) -> Result<(), StorageError> {
            let pending_key = self.pending_key_path(profile, contact);
            if pending_key.exists() {
                fs::remove_file(pending_key)?;
            }
            Ok(())
        }

        fn pending_key_path(&self, profile: &ProfileName, contact: &ContactId) -> PathBuf {
            self.profile_dir(profile)
                .join("pending_keys")
                .join(format!("{}.key", contact.as_str()))
        }

        fn contact_key_path(&self, profile: &ProfileName, contact: &ContactId) -> PathBuf {
            self.profile_dir(profile)
                .join("contact_keys")
                .join(format!("{}.key", contact.as_str()))
        }
    }

    fn safe_file_component(value: &str) -> String {
        value
            .chars()
            .map(|ch| {
                if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                    ch
                } else {
                    '_'
                }
            })
            .collect()
    }

    fn decode_pending_contact(record: &str) -> Result<PendingContact, StorageError> {
        let lines = record.lines().collect::<Vec<_>>();
        if lines.len() != 4 {
            return Err(StorageError::InvalidRecord);
        }
        let local_payload =
            PairingPayload::decode(lines[0]).map_err(|_| StorageError::InvalidRecord)?;
        let remote_payload =
            PairingPayload::decode(lines[1]).map_err(|_| StorageError::InvalidRecord)?;
        let contact_id = remote_payload
            .contact_id()
            .map_err(|_| StorageError::InvalidRecord)?;
        Ok(PendingContact {
            contact_id,
            local_payload,
            remote_payload,
            safety_number: lines[2].to_string(),
            safety_phrase: lines[3].to_string(),
        })
    }

    impl Store for DevFileStore {
        fn create_profile(&self, profile: &ProfileName) -> Result<(), StorageError> {
            let dir = self.profile_dir(profile);
            fs::create_dir_all(dir.join("pending"))?;
            fs::create_dir_all(dir.join("pending_keys"))?;
            fs::create_dir_all(dir.join("contacts"))?;
            fs::create_dir_all(dir.join("contact_keys"))?;
            fs::create_dir_all(dir.join("inbox"))?;
            fs::create_dir_all(dir.join("replay"))?;
            fs::create_dir_all(dir.join("own_pairing_keys"))?;
            fs::write(dir.join("profile"), profile.as_str())?;
            Ok(())
        }

        fn profile_exists(&self, profile: &ProfileName) -> bool {
            self.profile_dir(profile).join("profile").exists()
        }
    }
}
