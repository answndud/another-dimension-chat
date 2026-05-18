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
    use another_dimension_protocol::{decode_hex, encode_hex};
    use rusqlite::{params, Connection, OptionalExtension};
    use std::path::Path;

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum ProductionRecordKind {
        SchemaMarker,
        PairingPayload,
        PairwiseIdentityPrivateKey,
        NoiseStaticPrivateKey,
        ReplayWindowState,
        MessageEnvelope,
        LocalMessageIndex,
        SessionTransportState,
    }

    impl ProductionRecordKind {
        fn as_str(&self) -> &'static str {
            match self {
                Self::SchemaMarker => "schema-marker",
                Self::PairingPayload => "pairing-payload",
                Self::PairwiseIdentityPrivateKey => "pairwise-identity-private-key",
                Self::NoiseStaticPrivateKey => "noise-static-private-key",
                Self::ReplayWindowState => "replay-window-state",
                Self::MessageEnvelope => "message-envelope",
                Self::LocalMessageIndex => "local-message-index",
                Self::SessionTransportState => "session-transport-state",
            }
        }

        fn parse(value: &str) -> Result<Self, ProductionStoragePolicyError> {
            match value {
                "schema-marker" => Ok(Self::SchemaMarker),
                "pairing-payload" => Ok(Self::PairingPayload),
                "pairwise-identity-private-key" => Ok(Self::PairwiseIdentityPrivateKey),
                "noise-static-private-key" => Ok(Self::NoiseStaticPrivateKey),
                "replay-window-state" => Ok(Self::ReplayWindowState),
                "message-envelope" => Ok(Self::MessageEnvelope),
                "local-message-index" => Ok(Self::LocalMessageIndex),
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
    }

    #[derive(Debug, Eq, PartialEq)]
    pub enum ProductionStorageError {
        Policy(ProductionStoragePolicyError),
        Database(String),
        InvalidRecord,
        UnlockFailed,
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

        fn as_str(&self) -> &str {
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

        pub fn open(
            path: impl AsRef<Path>,
            key: &StorageDatabaseKey,
        ) -> Result<Self, ProductionStorageError> {
            let connection = Connection::open(path)?;
            connection.pragma_update(None, "key", key.expose_for_sqlcipher())?;
            verify_sqlcipher_key(&connection)?;
            connection.execute_batch(
                "CREATE TABLE IF NOT EXISTS encrypted_records (
                    record_id TEXT PRIMARY KEY NOT NULL,
                    encoded_record TEXT NOT NULL
                ) STRICT;",
            )?;
            Ok(Self { connection })
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
    }

    fn verify_sqlcipher_key(connection: &Connection) -> Result<(), ProductionStorageError> {
        connection
            .query_row("SELECT count(*) FROM sqlite_master", [], |_row| Ok(()))
            .map_err(|_| ProductionStorageError::UnlockFailed)
    }

    pub fn protection_for(kind: ProductionRecordKind) -> StorageProtection {
        match kind {
            ProductionRecordKind::SchemaMarker => StorageProtection::PlaintextAllowed,
            ProductionRecordKind::PairingPayload
            | ProductionRecordKind::PairwiseIdentityPrivateKey
            | ProductionRecordKind::NoiseStaticPrivateKey
            | ProductionRecordKind::ReplayWindowState
            | ProductionRecordKind::MessageEnvelope
            | ProductionRecordKind::LocalMessageIndex => StorageProtection::EncryptedAtRestRequired,
            ProductionRecordKind::SessionTransportState => StorageProtection::InMemoryOnly,
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
                ProductionRecordKind::PairwiseIdentityPrivateKey,
                ProductionRecordKind::NoiseStaticPrivateKey,
                ProductionRecordKind::ReplayWindowState,
                ProductionRecordKind::MessageEnvelope,
                ProductionRecordKind::LocalMessageIndex,
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
                ProductionRecordKind::PairwiseIdentityPrivateKey,
                ProductionRecordKind::NoiseStaticPrivateKey,
                ProductionRecordKind::ReplayWindowState,
                ProductionRecordKind::MessageEnvelope,
                ProductionRecordKind::LocalMessageIndex,
            ] {
                assert_eq!(
                    protection_for(kind),
                    StorageProtection::EncryptedAtRestRequired
                );
                assert_eq!(require_persistence_allowed(kind), Ok(()));
            }
        }

        #[test]
        fn production_session_transport_state_is_in_memory_only() {
            assert_eq!(
                protection_for(ProductionRecordKind::SessionTransportState),
                StorageProtection::InMemoryOnly
            );
            assert_eq!(
                require_persistence_allowed(ProductionRecordKind::SessionTransportState),
                Err(ProductionStoragePolicyError::PersistenceForbidden {
                    kind: ProductionRecordKind::SessionTransportState
                })
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
        fn encrypted_record_rejects_plaintext_allowed_and_in_memory_only_kinds() {
            for kind in [
                ProductionRecordKind::SchemaMarker,
                ProductionRecordKind::SessionTransportState,
            ] {
                assert!(matches!(
                    EncryptedRecord::new(
                        kind,
                        EncryptedRecordScope::profile(ProfileName::new("alice").expect("profile")),
                        vec![1],
                        vec![2],
                    ),
                    Err(ProductionStoragePolicyError::EncryptedRecordForbidden { .. })
                ));
            }
        }

        #[test]
        fn encrypted_record_decoder_rejects_malformed_records() {
            for record in [
                "",
                "ADREC1|message-envelope|alice|profile|01",
                "ADREC1|message-envelope|alice|profile|zz|02",
                "ADREC1|schema-marker|alice|profile|01|02",
                "ADREC1|session-transport-state|alice|profile|01|02",
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
