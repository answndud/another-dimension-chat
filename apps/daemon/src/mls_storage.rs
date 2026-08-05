use crate::storage::{EncryptedStore, RecordClass, RecordMutation, StorageError};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use sha2::{Digest, Sha256};

const PREFIX: &str = "mls/v1/";
const MAX_SERIALIZED_ENTITY_BYTES: usize = 4 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum GroupStateItem {
    JoinConfig,
    OwnLeafNodes,
    Tree,
    InterimTranscriptHash,
    Context,
    ConfirmationTag,
    GroupState,
    MessageSecrets,
    ResumptionPskStore,
    OwnLeafIndex,
    GroupEpochSecrets,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CryptoStateItem {
    SignatureKeyPair,
    EncryptionKeyPair,
    EncryptionEpochKeyPairs,
    KeyPackage,
    Psk,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum KeyPackageState {
    Available,
    Reserved,
    Consumed,
    Expired,
}

#[derive(Debug, Deserialize, Serialize)]
struct KeyPackageRecord {
    state: KeyPackageState,
    reservation_digest: Option<String>,
    #[serde(default)]
    not_before: Option<u64>,
    #[serde(default)]
    not_after: Option<u64>,
}

#[derive(Debug)]
pub enum KeyPackageError {
    Storage(StorageError),
    Codec(CodecError),
    AlreadyRegistered,
    NotAvailable,
    ReservationMismatch,
    InvalidLifetime,
}

impl std::fmt::Display for KeyPackageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Storage(_) => "key package storage failed",
            Self::Codec(_) => "key package state is invalid",
            Self::AlreadyRegistered => "key package is already registered",
            Self::NotAvailable => "key package is not available for reservation",
            Self::ReservationMismatch => "key package reservation does not match",
            Self::InvalidLifetime => "key package lifetime is invalid",
        })
    }
}

impl std::error::Error for KeyPackageError {}

impl From<StorageError> for KeyPackageError {
    fn from(error: StorageError) -> Self {
        Self::Storage(error)
    }
}

impl From<CodecError> for KeyPackageError {
    fn from(error: CodecError) -> Self {
        Self::Codec(error)
    }
}

impl CryptoStateItem {
    fn label(self) -> &'static str {
        match self {
            Self::SignatureKeyPair => "signature-key-pair",
            Self::EncryptionKeyPair => "encryption-key-pair",
            Self::EncryptionEpochKeyPairs => "encryption-epoch-key-pairs",
            Self::KeyPackage => "key-package",
            Self::Psk => "psk",
        }
    }
}

impl GroupStateItem {
    fn label(self) -> &'static str {
        match self {
            Self::JoinConfig => "join-config",
            Self::OwnLeafNodes => "own-leaf-nodes",
            Self::Tree => "tree",
            Self::InterimTranscriptHash => "interim-transcript-hash",
            Self::Context => "context",
            Self::ConfirmationTag => "confirmation-tag",
            Self::GroupState => "group-state",
            Self::MessageSecrets => "message-secrets",
            Self::ResumptionPskStore => "resumption-psk-store",
            Self::OwnLeafIndex => "own-leaf-index",
            Self::GroupEpochSecrets => "group-epoch-secrets",
        }
    }
}

#[derive(Debug)]
pub enum CodecError {
    Serialize,
    Deserialize,
    TooLarge,
}

impl std::fmt::Display for CodecError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Serialize => "MLS entity serialization failed",
            Self::Deserialize => "MLS entity deserialization failed",
            Self::TooLarge => "MLS entity exceeds the encrypted storage limit",
        })
    }
}

impl std::error::Error for CodecError {}

/// Bounded codec for OpenMLS Entity/Key values. The future StorageProvider
/// adapter must use this codec and then commit through the encrypted batch API.
pub fn encode_entity<T: Serialize>(value: &T) -> Result<Vec<u8>, CodecError> {
    let encoded = serde_json::to_vec(value).map_err(|_| CodecError::Serialize)?;
    if encoded.len() > MAX_SERIALIZED_ENTITY_BYTES {
        return Err(CodecError::TooLarge);
    }
    Ok(encoded)
}

pub fn decode_entity<T: DeserializeOwned>(value: &[u8]) -> Result<T, CodecError> {
    if value.len() > MAX_SERIALIZED_ENTITY_BYTES {
        return Err(CodecError::TooLarge);
    }
    serde_json::from_slice(value).map_err(|_| CodecError::Deserialize)
}

/// Application-owned storage boundary for the future OpenMLS adapter.
/// It is intentionally not an OpenMLS trait implementation until the exact
/// dependency/provider version is approved.
pub struct MlsStateStore<'a> {
    store: &'a mut EncryptedStore,
}

impl<'a> MlsStateStore<'a> {
    pub fn new(store: &'a mut EncryptedStore) -> Self {
        Self { store }
    }

    pub fn read(&self, group_id: &str, item: &str) -> Option<Vec<u8>> {
        self.store
            .get(RecordClass::ProtocolSession, &key(group_id, item))
    }

    pub fn commit(
        &mut self,
        group_id: &str,
        changes: &[(&str, Option<&[u8]>)],
    ) -> Result<(), StorageError> {
        let mutations = changes
            .iter()
            .map(|(item, value)| match value {
                Some(value) => RecordMutation::Put(
                    RecordClass::ProtocolSession,
                    key(group_id, item),
                    value.to_vec(),
                ),
                None => RecordMutation::Delete(RecordClass::ProtocolSession, key(group_id, item)),
            })
            .collect::<Vec<_>>();
        self.store.apply_batch(&mutations)
    }

    pub fn write_group_item(
        &mut self,
        group_id: &str,
        item: GroupStateItem,
        value: &[u8],
    ) -> Result<(), StorageError> {
        self.store.apply_batch(&[RecordMutation::Put(
            RecordClass::ProtocolSession,
            group_key(group_id, item),
            value.to_vec(),
        )])
    }

    pub fn read_group_item(&self, group_id: &str, item: GroupStateItem) -> Option<Vec<u8>> {
        self.store
            .get(RecordClass::ProtocolSession, &group_key(group_id, item))
    }

    pub fn delete_group_item(
        &mut self,
        group_id: &str,
        item: GroupStateItem,
    ) -> Result<(), StorageError> {
        self.store.apply_batch(&[RecordMutation::Delete(
            RecordClass::ProtocolSession,
            group_key(group_id, item),
        )])
    }

    pub fn write_crypto_item(
        &mut self,
        item: CryptoStateItem,
        external_id: &[u8],
        value: &[u8],
    ) -> Result<(), StorageError> {
        self.store.apply_batch(&[RecordMutation::Put(
            RecordClass::ProtocolSession,
            crypto_key(item, external_id),
            value.to_vec(),
        )])
    }

    pub fn read_crypto_item(&self, item: CryptoStateItem, external_id: &[u8]) -> Option<Vec<u8>> {
        self.store
            .get(RecordClass::ProtocolSession, &crypto_key(item, external_id))
    }

    pub fn delete_crypto_item(
        &mut self,
        item: CryptoStateItem,
        external_id: &[u8],
    ) -> Result<(), StorageError> {
        self.store.apply_batch(&[RecordMutation::Delete(
            RecordClass::ProtocolSession,
            crypto_key(item, external_id),
        )])
    }

    /// Registers an opaque OpenMLS KeyPackage and its one-way consumption state
    /// in a single encrypted revision. A consumed package is never reusable.
    pub fn register_key_package(
        &mut self,
        package_id: &[u8],
        package: &[u8],
    ) -> Result<(), KeyPackageError> {
        if self
            .read_crypto_item(CryptoStateItem::KeyPackage, package_id)
            .is_some()
            || self.read_key_package_record(package_id).is_some()
        {
            return Err(KeyPackageError::AlreadyRegistered);
        }
        let record = encode_entity(&KeyPackageRecord {
            state: KeyPackageState::Available,
            reservation_digest: None,
            not_before: None,
            not_after: None,
        })?;
        self.store.apply_batch(&[
            RecordMutation::Put(
                RecordClass::ProtocolSession,
                crypto_key(CryptoStateItem::KeyPackage, package_id),
                package.to_vec(),
            ),
            RecordMutation::Put(
                RecordClass::ProtocolSession,
                key_package_state_key(package_id),
                record,
            ),
        ])?;
        Ok(())
    }

    pub fn register_key_package_with_lifetime(
        &mut self,
        package_id: &[u8],
        package: &[u8],
        not_before: u64,
        not_after: u64,
    ) -> Result<(), KeyPackageError> {
        if not_before >= not_after || package.is_empty() {
            return Err(KeyPackageError::InvalidLifetime);
        }
        if self
            .read_crypto_item(CryptoStateItem::KeyPackage, package_id)
            .is_some()
            || self.read_key_package_record(package_id).is_some()
        {
            return Err(KeyPackageError::AlreadyRegistered);
        }
        let record = encode_entity(&KeyPackageRecord {
            state: KeyPackageState::Available,
            reservation_digest: None,
            not_before: Some(not_before),
            not_after: Some(not_after),
        })?;
        self.store.apply_batch(&[
            RecordMutation::Put(
                RecordClass::ProtocolSession,
                crypto_key(CryptoStateItem::KeyPackage, package_id),
                package.to_vec(),
            ),
            RecordMutation::Put(
                RecordClass::ProtocolSession,
                key_package_state_key(package_id),
                record,
            ),
        ])?;
        Ok(())
    }

    pub fn key_package_state(
        &self,
        package_id: &[u8],
    ) -> Result<Option<KeyPackageState>, KeyPackageError> {
        Ok(self
            .read_key_package_record(package_id)
            .map(|record| record.state))
    }

    pub fn key_package_state_at(
        &self,
        package_id: &[u8],
        now: u64,
    ) -> Result<Option<KeyPackageState>, KeyPackageError> {
        let Some(record) = self.read_key_package_record(package_id) else {
            return Ok(None);
        };
        if record.state == KeyPackageState::Available && record.is_expired(now) {
            return Ok(Some(KeyPackageState::Expired));
        }
        Ok(Some(record.state))
    }

    pub fn available_key_package_count(&self, now: u64) -> usize {
        self.store
            .records_with_prefix(
                RecordClass::ProtocolSession,
                &format!("{PREFIX}crypto/key-package-state/"),
            )
            .into_iter()
            .filter_map(|(_, value)| decode_entity::<KeyPackageRecord>(&value).ok())
            .filter(|record| record.state == KeyPackageState::Available && !record.is_expired(now))
            .count()
    }

    /// Atomically adds only as many generated packages as needed to reach the
    /// requested minimum. The caller must generate fresh package IDs and
    /// private-key bundles; an expired or malformed bundle is never stored.
    pub fn replenish_key_packages(
        &mut self,
        minimum: usize,
        now: u64,
        packages: &[(Vec<u8>, Vec<u8>, u64, u64)],
    ) -> Result<usize, KeyPackageError> {
        let current = self.available_key_package_count(now);
        let needed = minimum.saturating_sub(current);
        if needed == 0 {
            return Ok(0);
        }
        let mut mutations = Vec::new();
        let mut added = 0;
        for (package_id, package, not_before, not_after) in packages {
            if added == needed {
                break;
            }
            if *not_before >= *not_after || *not_after <= now || package.is_empty() {
                return Err(KeyPackageError::InvalidLifetime);
            }
            if self
                .read_crypto_item(CryptoStateItem::KeyPackage, package_id)
                .is_some()
                || self.read_key_package_record(package_id).is_some()
            {
                return Err(KeyPackageError::AlreadyRegistered);
            }
            let record = encode_entity(&KeyPackageRecord {
                state: KeyPackageState::Available,
                reservation_digest: None,
                not_before: Some(*not_before),
                not_after: Some(*not_after),
            })?;
            mutations.push(RecordMutation::Put(
                RecordClass::ProtocolSession,
                crypto_key(CryptoStateItem::KeyPackage, package_id),
                package.clone(),
            ));
            mutations.push(RecordMutation::Put(
                RecordClass::ProtocolSession,
                key_package_state_key(package_id),
                record,
            ));
            added += 1;
        }
        if added < needed {
            return Err(KeyPackageError::NotAvailable);
        }
        self.store.apply_batch(&mutations)?;
        Ok(added)
    }

    /// Reserves a package for one handshake. Only the reservation digest is
    /// persisted; the caller retains the reservation secret.
    pub fn reserve_key_package(
        &mut self,
        package_id: &[u8],
        reservation: &[u8],
    ) -> Result<Vec<u8>, KeyPackageError> {
        self.reserve_key_package_at(package_id, reservation, current_time_seconds())
    }

    pub fn reserve_key_package_at(
        &mut self,
        package_id: &[u8],
        reservation: &[u8],
        now: u64,
    ) -> Result<Vec<u8>, KeyPackageError> {
        let mut record = self
            .read_key_package_record(package_id)
            .ok_or(KeyPackageError::NotAvailable)?;
        if record.state != KeyPackageState::Available || record.is_expired(now) {
            return Err(KeyPackageError::NotAvailable);
        }
        let digest = Sha256::digest(reservation).to_vec();
        record.state = KeyPackageState::Reserved;
        record.reservation_digest = Some(hex_digest(&digest));
        self.write_key_package_record(package_id, &record)?;
        Ok(digest)
    }

    /// Marks a reserved package permanently consumed after the handshake has
    /// committed. There is deliberately no release operation: an interrupted
    /// reservation must be reconciled explicitly rather than silently reused.
    pub fn consume_key_package(
        &mut self,
        package_id: &[u8],
        reservation: &[u8],
    ) -> Result<(), KeyPackageError> {
        let mut record = self
            .read_key_package_record(package_id)
            .ok_or(KeyPackageError::NotAvailable)?;
        let digest = hex_digest(&Sha256::digest(reservation));
        if record.state != KeyPackageState::Reserved
            || record.reservation_digest.as_deref() != Some(digest.as_str())
        {
            return Err(KeyPackageError::ReservationMismatch);
        }
        record.state = KeyPackageState::Consumed;
        record.reservation_digest = None;
        self.write_key_package_record(package_id, &record)
    }

    fn read_key_package_record(&self, package_id: &[u8]) -> Option<KeyPackageRecord> {
        self.store
            .get(
                RecordClass::ProtocolSession,
                &key_package_state_key(package_id),
            )
            .and_then(|value| decode_entity(&value).ok())
    }

    fn write_key_package_record(
        &mut self,
        package_id: &[u8],
        record: &KeyPackageRecord,
    ) -> Result<(), KeyPackageError> {
        let value = encode_entity(record)?;
        self.store.apply_batch(&[RecordMutation::Put(
            RecordClass::ProtocolSession,
            key_package_state_key(package_id),
            value,
        )])?;
        Ok(())
    }

    pub fn append_own_leaf(&mut self, group_id: &str, leaf: &[u8]) -> Result<(), StorageError> {
        let mut leaves = self
            .read_group_item(group_id, GroupStateItem::OwnLeafNodes)
            .and_then(|value| decode_entity::<Vec<Vec<u8>>>(&value).ok())
            .unwrap_or_default();
        leaves.push(leaf.to_vec());
        let encoded = encode_entity(&leaves).map_err(|_| StorageError::RecordTooLarge)?;
        self.write_group_item(group_id, GroupStateItem::OwnLeafNodes, &encoded)
    }

    pub fn own_leaves(&self, group_id: &str) -> Vec<Vec<u8>> {
        self.read_group_item(group_id, GroupStateItem::OwnLeafNodes)
            .and_then(|value| decode_entity(&value).ok())
            .unwrap_or_default()
    }

    pub fn queue_proposal(
        &mut self,
        group_id: &str,
        proposal_ref: &[u8],
        proposal: &[u8],
    ) -> Result<(), StorageError> {
        let reference = proposal_ref_key(proposal_ref);
        let mut refs = self
            .read_raw_group(group_id, "proposal-refs")
            .and_then(|value| decode_entity::<Vec<String>>(&value).ok())
            .unwrap_or_default();
        if refs.iter().any(|item| item == &reference) {
            return Ok(());
        }
        refs.push(reference.clone());
        let refs_value = encode_entity(&refs).map_err(|_| StorageError::RecordTooLarge)?;
        let proposal_key = format!("proposal/{reference}");
        self.commit(
            group_id,
            &[
                ("proposal-refs", Some(refs_value.as_slice())),
                (proposal_key.as_str(), Some(proposal)),
            ],
        )
    }

    pub fn queued_proposal_refs(&self, group_id: &str) -> Vec<String> {
        self.read_raw_group(group_id, "proposal-refs")
            .and_then(|value| decode_entity(&value).ok())
            .unwrap_or_default()
    }

    pub fn queued_proposal(&self, group_id: &str, proposal_ref: &[u8]) -> Option<Vec<u8>> {
        let reference = proposal_ref_key(proposal_ref);
        self.read_raw_group(group_id, &format!("proposal/{reference}"))
    }

    pub fn remove_proposal(
        &mut self,
        group_id: &str,
        proposal_ref: &[u8],
    ) -> Result<(), StorageError> {
        let reference = proposal_ref_key(proposal_ref);
        let mut refs = self.queued_proposal_refs(group_id);
        refs.retain(|item| item != &reference);
        let refs_value = encode_entity(&refs).map_err(|_| StorageError::RecordTooLarge)?;
        self.commit(
            group_id,
            &[
                ("proposal-refs", Some(refs_value.as_slice())),
                (format!("proposal/{reference}").as_str(), None),
            ],
        )
    }

    pub fn clear_proposals(&mut self, group_id: &str) -> Result<(), StorageError> {
        let refs = self.queued_proposal_refs(group_id);
        let mut changes = vec![("proposal-refs".to_owned(), None)];
        changes.extend(
            refs.into_iter()
                .map(|reference| (format!("proposal/{reference}"), None)),
        );
        let changes = changes
            .iter()
            .map(|(key, value)| (key.as_str(), *value))
            .collect::<Vec<_>>();
        self.commit(group_id, &changes)
    }

    fn read_raw_group(&self, group_id: &str, item: &str) -> Option<Vec<u8>> {
        self.store
            .get(RecordClass::ProtocolSession, &key(group_id, item))
    }
}

fn key(group_id: &str, item: &str) -> String {
    format!("{PREFIX}{group_id}/{item}")
}

fn group_key(group_id: &str, item: GroupStateItem) -> String {
    key(group_id, item.label())
}

fn crypto_key(item: CryptoStateItem, external_id: &[u8]) -> String {
    let digest = Sha256::digest(external_id);
    format!("{PREFIX}crypto/{}/{digest:x}", item.label())
}

fn proposal_ref_key(proposal_ref: &[u8]) -> String {
    format!("{:x}", Sha256::digest(proposal_ref))
}

fn key_package_state_key(package_id: &[u8]) -> String {
    let digest = Sha256::digest(package_id);
    format!("{PREFIX}crypto/key-package-state/{digest:x}")
}

fn hex_digest(value: &[u8]) -> String {
    value.iter().map(|byte| format!("{byte:02x}")).collect()
}

impl KeyPackageRecord {
    fn is_expired(&self, now: u64) -> bool {
        self.not_after.is_some_and(|not_after| now >= not_after)
    }
}

fn current_time_seconds() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::{
        decode_entity, encode_entity, CryptoStateItem, GroupStateItem, KeyPackageError,
        KeyPackageState, MlsStateStore,
    };
    use crate::storage::EncryptedStore;

    #[test]
    fn protocol_state_is_namespaced_and_committed_as_a_batch() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-mls-store-{}",
            std::process::id()
        ));
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let mut adapter = MlsStateStore::new(&mut store);
        adapter
            .commit(
                "group-a",
                &[("epoch", Some(b"1")), ("tree", Some(b"opaque-tree"))],
            )
            .unwrap();
        assert_eq!(
            adapter.read("group-a", "epoch").as_deref(),
            Some(b"1".as_slice())
        );
        assert_eq!(adapter.read("group-b", "epoch"), None);
        drop(adapter);
        std::fs::remove_file(&path).unwrap();
        std::fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn entity_codec_is_bounded_and_round_trips_without_plaintext_store_access() {
        let encoded = encode_entity(&vec![1_u8, 2, 3]).unwrap();
        assert_eq!(decode_entity::<Vec<u8>>(&encoded).unwrap(), vec![1, 2, 3]);
        assert!(decode_entity::<Vec<u8>>(b"not-json").is_err());
    }

    #[test]
    fn group_state_items_are_explicitly_namespaced_and_deletable() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-group-state-{}",
            std::process::id()
        ));
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let mut adapter = MlsStateStore::new(&mut store);
        adapter
            .write_group_item("group-a", GroupStateItem::Tree, b"tree")
            .unwrap();
        adapter
            .write_group_item("group-a", GroupStateItem::Context, b"context")
            .unwrap();
        assert_eq!(
            adapter
                .read_group_item("group-a", GroupStateItem::Tree)
                .as_deref(),
            Some(b"tree".as_slice())
        );
        assert_eq!(
            adapter.read_group_item("group-b", GroupStateItem::Tree),
            None
        );
        adapter
            .delete_group_item("group-a", GroupStateItem::Tree)
            .unwrap();
        assert_eq!(
            adapter.read_group_item("group-a", GroupStateItem::Tree),
            None
        );
        assert_eq!(
            adapter
                .read_group_item("group-a", GroupStateItem::Context)
                .as_deref(),
            Some(b"context".as_slice())
        );
        drop(adapter);
        std::fs::remove_file(&path).unwrap();
        std::fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn crypto_items_are_hashed_and_separated_by_type() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-crypto-state-{}",
            std::process::id()
        ));
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let mut adapter = MlsStateStore::new(&mut store);
        adapter
            .write_crypto_item(
                CryptoStateItem::KeyPackage,
                b"public-hash",
                b"private-package",
            )
            .unwrap();
        adapter
            .write_crypto_item(CryptoStateItem::Psk, b"public-hash", b"private-psk")
            .unwrap();
        assert_eq!(
            adapter
                .read_crypto_item(CryptoStateItem::KeyPackage, b"public-hash")
                .as_deref(),
            Some(b"private-package".as_slice())
        );
        assert_eq!(
            adapter
                .read_crypto_item(CryptoStateItem::Psk, b"public-hash")
                .as_deref(),
            Some(b"private-psk".as_slice())
        );
        adapter
            .delete_crypto_item(CryptoStateItem::KeyPackage, b"public-hash")
            .unwrap();
        assert_eq!(
            adapter.read_crypto_item(CryptoStateItem::KeyPackage, b"public-hash"),
            None
        );
        assert_eq!(
            adapter
                .read_crypto_item(CryptoStateItem::Psk, b"public-hash")
                .as_deref(),
            Some(b"private-psk".as_slice())
        );
        drop(adapter);
        std::fs::remove_file(&path).unwrap();
        std::fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn proposal_queue_preserves_order_and_removes_body_atomically() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-proposals-{}",
            std::process::id()
        ));
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let mut adapter = MlsStateStore::new(&mut store);
        adapter
            .queue_proposal("group-a", b"one", b"proposal-1")
            .unwrap();
        adapter
            .queue_proposal("group-a", b"two", b"proposal-2")
            .unwrap();
        adapter
            .queue_proposal("group-a", b"one", b"ignored-duplicate")
            .unwrap();
        assert_eq!(adapter.queued_proposal_refs("group-a").len(), 2);
        assert_eq!(
            adapter.queued_proposal("group-a", b"one").as_deref(),
            Some(b"proposal-1".as_slice())
        );
        adapter.remove_proposal("group-a", b"one").unwrap();
        assert_eq!(adapter.queued_proposal("group-a", b"one"), None);
        assert_eq!(adapter.queued_proposal_refs("group-a").len(), 1);
        adapter.clear_proposals("group-a").unwrap();
        assert!(adapter.queued_proposal_refs("group-a").is_empty());
        drop(adapter);
        std::fs::remove_file(&path).unwrap();
        std::fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn key_package_lifecycle_is_one_way_and_reservation_bound() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-key-package-{}",
            std::process::id()
        ));
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let mut adapter = MlsStateStore::new(&mut store);
        adapter
            .register_key_package(b"package-1", b"opaque-package")
            .unwrap();
        assert_eq!(
            adapter.key_package_state(b"package-1").unwrap(),
            Some(KeyPackageState::Available)
        );
        assert!(matches!(
            adapter.register_key_package(b"package-1", b"replacement"),
            Err(KeyPackageError::AlreadyRegistered)
        ));
        adapter
            .reserve_key_package(b"package-1", b"reservation-a")
            .unwrap();
        assert_eq!(
            adapter.key_package_state(b"package-1").unwrap(),
            Some(KeyPackageState::Reserved)
        );
        assert!(matches!(
            adapter.consume_key_package(b"package-1", b"reservation-b"),
            Err(KeyPackageError::ReservationMismatch)
        ));
        adapter
            .consume_key_package(b"package-1", b"reservation-a")
            .unwrap();
        assert_eq!(
            adapter.key_package_state(b"package-1").unwrap(),
            Some(KeyPackageState::Consumed)
        );
        assert!(matches!(
            adapter.reserve_key_package(b"package-1", b"reservation-c"),
            Err(KeyPackageError::NotAvailable)
        ));
        drop(adapter);
        std::fs::remove_file(&path).unwrap();
        std::fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn key_package_replenishment_is_bounded_and_expiry_is_fail_closed() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-key-package-replenish-{}",
            std::process::id()
        ));
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let mut adapter = MlsStateStore::new(&mut store);
        let packages = vec![
            (b"package-a".to_vec(), b"opaque-a".to_vec(), 90, 200),
            (b"package-b".to_vec(), b"opaque-b".to_vec(), 90, 200),
        ];
        assert_eq!(
            adapter.replenish_key_packages(2, 100, &packages).unwrap(),
            2
        );
        assert_eq!(adapter.available_key_package_count(100), 2);
        assert_eq!(adapter.available_key_package_count(200), 0);
        assert_eq!(
            adapter.key_package_state_at(b"package-a", 200).unwrap(),
            Some(KeyPackageState::Expired)
        );
        assert!(matches!(
            adapter.reserve_key_package_at(b"package-a", b"reservation", 200),
            Err(KeyPackageError::NotAvailable)
        ));
        assert!(matches!(
            adapter.replenish_key_packages(
                3,
                100,
                &[(b"package-c".to_vec(), b"opaque-c".to_vec(), 90, 100)]
            ),
            Err(KeyPackageError::InvalidLifetime)
        ));
        drop(adapter);
        std::fs::remove_file(&path).unwrap();
        std::fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }
}
