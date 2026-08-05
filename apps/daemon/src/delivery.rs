//! Metadata-minimized relay envelope owned by the daemon.
//!
//! The relay receives only an opaque mailbox, random envelope id, coarse
//! expiry, padded ciphertext, and padding. Identity, message type, filename,
//! and exact application timestamps remain inside the MLS ciphertext.

use crate::storage::{EncryptedStore, RecordClass, StorageError};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

const VERSION: u8 = 1;
const BLOCK_SIZE: usize = 256;
const MAX_CIPHERTEXT_BYTES: usize = 96 * 1024;
const MAX_MAILBOX_BYTES: usize = 128;
const EXPIRY_BUCKET_SECONDS: u64 = 300;

#[derive(Debug, Eq, PartialEq)]
pub enum EnvelopeError {
    InvalidMailbox,
    InvalidCiphertext,
    InvalidExpiry,
    InvalidWire,
    Expired,
    TooLarge,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RelayEnvelope {
    pub version: u8,
    pub mailbox: String,
    pub envelope_id: String,
    pub expires_at: u64,
    pub ciphertext: Vec<u8>,
    pub padding: Vec<u8>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub enum DeliveryState {
    Draft,
    Encrypted,
    Queued,
    RelayAccepted,
    RecipientReceived,
    Decrypted,
    Retryable,
    Failed,
}

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct DeliveryRecord {
    pub digest: String,
    pub state: DeliveryState,
    pub attempts: u8,
    pub next_retry_at: Option<u64>,
    #[serde(default)]
    pub relay_id: Option<String>,
}

#[derive(Default)]
pub struct DeliveryLedger {
    records: BTreeMap<String, DeliveryRecord>,
}

impl DeliveryLedger {
    pub fn register_encrypted(&mut self, digest: impl Into<String>) -> Result<(), EnvelopeError> {
        let digest = digest.into();
        if digest.is_empty() || self.records.contains_key(&digest) {
            return Err(EnvelopeError::InvalidWire);
        }
        self.records.insert(
            digest.clone(),
            DeliveryRecord {
                digest,
                state: DeliveryState::Encrypted,
                attempts: 0,
                next_retry_at: None,
                relay_id: None,
            },
        );
        Ok(())
    }

    pub fn transition(&mut self, digest: &str, state: DeliveryState) -> Result<(), EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        if !valid_transition(record.state, state) {
            return Err(EnvelopeError::InvalidWire);
        }
        record.state = state;
        record.next_retry_at = None;
        Ok(())
    }

    pub fn acknowledge_recipient(&mut self, digest: &str) -> Result<bool, EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        if matches!(
            record.state,
            DeliveryState::RecipientReceived | DeliveryState::Decrypted
        ) {
            return Ok(false);
        }
        if record.state != DeliveryState::RelayAccepted {
            return Err(EnvelopeError::InvalidWire);
        }
        record.state = DeliveryState::RecipientReceived;
        Ok(true)
    }

    pub fn bind_relay_id(
        &mut self,
        digest: &str,
        relay_id: impl Into<String>,
    ) -> Result<(), EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        record.relay_id = Some(relay_id.into());
        Ok(())
    }

    pub fn acknowledge_relay_ids(&mut self, ids: &[String]) -> usize {
        self.records
            .values_mut()
            .filter(|record| {
                record
                    .relay_id
                    .as_ref()
                    .is_some_and(|id| ids.iter().any(|candidate| candidate == id))
            })
            .filter_map(|record| {
                if record.state == DeliveryState::RelayAccepted {
                    record.state = DeliveryState::RecipientReceived;
                    Some(())
                } else {
                    None
                }
            })
            .count()
    }

    pub fn schedule_retry(&mut self, digest: &str, now: u64) -> Result<bool, EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        if matches!(
            record.state,
            DeliveryState::RecipientReceived | DeliveryState::Decrypted | DeliveryState::Failed
        ) {
            return Ok(false);
        }
        record.attempts = record.attempts.saturating_add(1);
        if record.attempts > 5 {
            record.state = DeliveryState::Failed;
            record.next_retry_at = None;
            return Ok(false);
        }
        record.state = DeliveryState::Retryable;
        let backoff = 5_u64
            .saturating_mul(2_u64.saturating_pow(u32::from(record.attempts - 1)))
            .min(3600);
        record.next_retry_at = Some(now.saturating_add(backoff));
        Ok(true)
    }

    pub fn get(&self, digest: &str) -> Option<&DeliveryRecord> {
        self.records.get(digest)
    }

    pub fn persist(&self, store: &mut EncryptedStore) -> Result<(), StorageError> {
        let bytes = serde_json::to_vec(&self.records).map_err(|_| StorageError::CorruptStore)?;
        store.put(RecordClass::Outbox, "delivery/ledger", &bytes)
    }

    pub fn restore(store: &EncryptedStore) -> Result<Self, StorageError> {
        let Some(bytes) = store.get(RecordClass::Outbox, "delivery/ledger") else {
            return Ok(Self::default());
        };
        let records = serde_json::from_slice(&bytes).map_err(|_| StorageError::CorruptStore)?;
        Ok(Self { records })
    }
}

fn valid_transition(from: DeliveryState, to: DeliveryState) -> bool {
    matches!(
        (from, to),
        (DeliveryState::Encrypted, DeliveryState::Queued)
            | (DeliveryState::Queued, DeliveryState::RelayAccepted)
            | (
                DeliveryState::RelayAccepted,
                DeliveryState::RecipientReceived
            )
            | (DeliveryState::RecipientReceived, DeliveryState::Decrypted)
            | (DeliveryState::Retryable, DeliveryState::Queued)
    )
}

#[derive(serde::Deserialize, serde::Serialize)]
struct WireEnvelope<'a> {
    v: u8,
    m: &'a str,
    i: &'a str,
    e: u64,
    c: String,
    p: String,
}

#[derive(serde::Deserialize)]
struct OwnedWireEnvelope {
    v: u8,
    m: String,
    i: String,
    e: u64,
    c: String,
    p: String,
}

impl RelayEnvelope {
    pub fn create(
        mailbox: &str,
        ciphertext: &[u8],
        expires_at: u64,
        now: u64,
    ) -> Result<Self, EnvelopeError> {
        validate_mailbox(mailbox)?;
        if ciphertext.is_empty() {
            return Err(EnvelopeError::InvalidCiphertext);
        }
        if ciphertext.len() > MAX_CIPHERTEXT_BYTES {
            return Err(EnvelopeError::TooLarge);
        }
        if expires_at <= now {
            return Err(EnvelopeError::InvalidExpiry);
        }
        let padded_len = ciphertext.len().div_ceil(BLOCK_SIZE) * BLOCK_SIZE;
        let mut padding = vec![0_u8; padded_len - ciphertext.len()];
        getrandom::fill(&mut padding).map_err(|_| EnvelopeError::InvalidWire)?;
        let mut id = [0_u8; 16];
        getrandom::fill(&mut id).map_err(|_| EnvelopeError::InvalidWire)?;
        Ok(Self {
            version: VERSION,
            mailbox: mailbox.to_owned(),
            envelope_id: hex(&id),
            expires_at: expires_at.div_ceil(EXPIRY_BUCKET_SECONDS) * EXPIRY_BUCKET_SECONDS,
            ciphertext: ciphertext.to_vec(),
            padding,
        })
    }

    pub fn to_wire(&self) -> Result<String, EnvelopeError> {
        if self.version != VERSION
            || self.ciphertext.len() + self.padding.len() > MAX_CIPHERTEXT_BYTES + BLOCK_SIZE
        {
            return Err(EnvelopeError::InvalidWire);
        }
        serde_json::to_string(&WireEnvelope {
            v: self.version,
            m: &self.mailbox,
            i: &self.envelope_id,
            e: self.expires_at,
            c: hex(&self.ciphertext),
            p: hex(&self.padding),
        })
        .map_err(|_| EnvelopeError::InvalidWire)
    }

    pub fn from_wire(wire: &str, now: u64) -> Result<Self, EnvelopeError> {
        let parsed: OwnedWireEnvelope =
            serde_json::from_str(wire).map_err(|_| EnvelopeError::InvalidWire)?;
        if parsed.v != VERSION || parsed.e <= now {
            return Err(if parsed.e <= now {
                EnvelopeError::Expired
            } else {
                EnvelopeError::InvalidWire
            });
        }
        validate_mailbox(&parsed.m)?;
        if parsed.i.len() != 32 || !parsed.i.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err(EnvelopeError::InvalidWire);
        }
        let ciphertext = decode_hex(&parsed.c).ok_or(EnvelopeError::InvalidWire)?;
        let padding = decode_hex(&parsed.p).ok_or(EnvelopeError::InvalidWire)?;
        if ciphertext.is_empty()
            || ciphertext.len() > MAX_CIPHERTEXT_BYTES
            || ciphertext.len() + padding.len() > MAX_CIPHERTEXT_BYTES + BLOCK_SIZE
        {
            return Err(EnvelopeError::TooLarge);
        }
        if (ciphertext.len() + padding.len()) % BLOCK_SIZE != 0 {
            return Err(EnvelopeError::InvalidWire);
        }
        Ok(Self {
            version: parsed.v,
            mailbox: parsed.m,
            envelope_id: parsed.i,
            expires_at: parsed.e,
            ciphertext,
            padding,
        })
    }

    pub fn digest(&self) -> Result<String, EnvelopeError> {
        Ok(hex(&Sha256::digest(self.to_wire()?.as_bytes())))
    }
}

fn validate_mailbox(mailbox: &str) -> Result<(), EnvelopeError> {
    if mailbox.is_empty()
        || mailbox.len() > MAX_MAILBOX_BYTES
        || !mailbox
            .bytes()
            .all(|byte| byte.is_ascii_graphic() && byte != b'"' && byte != b'\\')
    {
        return Err(EnvelopeError::InvalidMailbox);
    }
    Ok(())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn decode_hex(value: &str) -> Option<Vec<u8>> {
    if value.len() % 2 != 0 || !value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return None;
    }
    (0..value.len())
        .step_by(2)
        .map(|index| u8::from_str_radix(&value[index..index + 2], 16).ok())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{EnvelopeError, RelayEnvelope};

    #[test]
    fn wire_contains_only_opaque_transport_fields_and_round_trips() {
        let envelope = RelayEnvelope::create("opaque-mailbox", b"ciphertext", 601, 1).unwrap();
        let wire = envelope.to_wire().unwrap();
        assert!(!wire.contains("account"));
        assert!(!wire.contains("filename"));
        assert!(!wire.contains("message_type"));
        assert_eq!(
            RelayEnvelope::from_wire(&wire, 1).unwrap().mailbox,
            "opaque-mailbox"
        );
        assert_eq!(envelope.digest().unwrap().len(), 64);
    }

    #[test]
    fn ciphertext_is_padded_to_a_fixed_block_and_expiry_is_coarse() {
        let envelope = RelayEnvelope::create("mailbox", &[7_u8; 257], 601, 1).unwrap();
        assert_eq!(
            (envelope.ciphertext.len() + envelope.padding.len()) % 256,
            0
        );
        assert_eq!(envelope.expires_at % 300, 0);
    }

    #[test]
    fn malformed_and_expired_wire_is_rejected() {
        assert_eq!(
            RelayEnvelope::create("", b"x", 10, 1),
            Err(EnvelopeError::InvalidMailbox)
        );
        let envelope = RelayEnvelope::create("mailbox", b"ciphertext", 601, 1).unwrap();
        let wire = envelope.to_wire().unwrap();
        assert_eq!(
            RelayEnvelope::from_wire(&wire, 900),
            Err(EnvelopeError::Expired)
        );
        assert_eq!(
            RelayEnvelope::from_wire("{\"v\":2}", 1),
            Err(EnvelopeError::InvalidWire)
        );
    }

    #[test]
    fn delivery_ledger_distinguishes_relay_acceptance_and_recipient_ack() {
        let mut ledger = super::DeliveryLedger::default();
        ledger.register_encrypted("digest-1").unwrap();
        ledger
            .transition("digest-1", super::DeliveryState::Queued)
            .unwrap();
        ledger
            .transition("digest-1", super::DeliveryState::RelayAccepted)
            .unwrap();
        assert_eq!(ledger.acknowledge_recipient("digest-1"), Ok(true));
        assert_eq!(ledger.acknowledge_recipient("digest-1"), Ok(false));
        ledger
            .transition("digest-1", super::DeliveryState::Decrypted)
            .unwrap();
        assert_eq!(
            ledger.get("digest-1").unwrap().state,
            super::DeliveryState::Decrypted
        );
    }

    #[test]
    fn delivery_ledger_bounds_retries_with_exponential_backoff() {
        let mut ledger = super::DeliveryLedger::default();
        ledger.register_encrypted("digest-2").unwrap();
        for attempt in 1..=5 {
            assert_eq!(ledger.schedule_retry("digest-2", 100), Ok(true));
            assert_eq!(
                ledger.get("digest-2").unwrap().next_retry_at,
                Some(100 + 5 * (1_u64 << (attempt - 1)))
            );
            ledger
                .transition("digest-2", super::DeliveryState::Queued)
                .unwrap();
        }
        assert_eq!(ledger.schedule_retry("digest-2", 100), Ok(false));
        assert_eq!(
            ledger.get("digest-2").unwrap().state,
            super::DeliveryState::Failed
        );
    }

    #[test]
    fn delivery_ledger_survives_encrypted_store_reload() {
        let path =
            std::env::temp_dir().join(format!("another-dimension-delivery-{}", std::process::id()));
        let mut store =
            crate::storage::EncryptedStore::initialize(&path, "correct horse battery staple")
                .unwrap();
        let mut ledger = super::DeliveryLedger::default();
        ledger.register_encrypted("digest-persisted").unwrap();
        ledger.persist(&mut store).unwrap();
        drop(store);
        let store =
            crate::storage::EncryptedStore::open(&path, "correct horse battery staple").unwrap();
        let restored = super::DeliveryLedger::restore(&store).unwrap();
        assert_eq!(
            restored.get("digest-persisted").unwrap().state,
            super::DeliveryState::Encrypted
        );
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(path.with_extension("revision"));
    }
}
