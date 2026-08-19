//! Metadata-minimized relay envelope owned by the daemon.
//!
//! The relay receives only an opaque mailbox, random envelope id, coarse
//! expiry, padded ciphertext, and padding. Identity, message type, filename,
//! and exact application timestamps remain inside the MLS ciphertext.

use crate::storage::{EncryptedStore, RecordClass, StorageError};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use zeroize::Zeroize;

const MAX_RECORDS: usize = crate::storage::MAX_RECORDS;
const VERSION: u8 = 1;
const BLOCK_SIZE: usize = 256;
const MAX_CIPHERTEXT_BYTES: usize = 96 * 1024;
const MAX_MAILBOX_BYTES: usize = 128;
const EXPIRY_BUCKET_SECONDS: u64 = 300;
const MAX_ENVELOPE_TTL_SECONDS: u64 = 7 * 24 * 60 * 60;
const MAX_DIGEST_BYTES: usize = 128;
const MAX_RELAY_ID_BYTES: usize = 256;
const MAX_WIRE_BYTES: usize = 256 * 1024;
const MAX_DESTINATION_BYTES: usize = 2 * 1024;

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
    /// The recipient daemon fetched the envelope and persisted its local
    /// delivery record. This is never a sender-side read receipt.
    RecipientReceived,
    Decrypted,
    Retryable,
    Failed,
    Cancelled,
}

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct DeliveryRecord {
    pub digest: String,
    pub state: DeliveryState,
    pub attempts: u8,
    pub next_retry_at: Option<u64>,
    #[serde(default)]
    pub relay_id: Option<String>,
    #[serde(default)]
    pub wire: Option<String>,
    #[serde(default)]
    pub expires_at: Option<u64>,
    /// The capability-bearing inbox URL is encrypted with the ledger at rest.
    /// Older ledgers omit it and remain manually retryable through the local API.
    #[serde(default)]
    pub destination: Option<String>,
}

#[derive(Clone, Default)]
pub struct DeliveryLedger {
    records: BTreeMap<String, DeliveryRecord>,
}

impl DeliveryLedger {
    pub fn wipe(&mut self) {
        for record in self.records.values_mut() {
            if let Some(wire) = record.wire.as_mut() {
                wire.zeroize();
            }
            if let Some(destination) = record.destination.as_mut() {
                destination.zeroize();
            }
        }
        self.records.clear();
    }
    pub fn register_encrypted(&mut self, digest: impl Into<String>) -> Result<(), EnvelopeError> {
        self.register_encrypted_with_wire(digest, None)
    }

    pub fn register_encrypted_with_wire(
        &mut self,
        digest: impl Into<String>,
        wire: Option<String>,
    ) -> Result<(), EnvelopeError> {
        self.register_encrypted_with_wire_and_expiry(digest, wire, None)
    }

    pub fn register_encrypted_with_wire_and_expiry(
        &mut self,
        digest: impl Into<String>,
        wire: Option<String>,
        expires_at: Option<u64>,
    ) -> Result<(), EnvelopeError> {
        self.register_encrypted_with_destination(digest, wire, expires_at, None)
    }

    pub fn register_encrypted_with_destination(
        &mut self,
        digest: impl Into<String>,
        wire: Option<String>,
        expires_at: Option<u64>,
        destination: Option<String>,
    ) -> Result<(), EnvelopeError> {
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
                wire,
                expires_at,
                destination,
            },
        );
        Ok(())
    }

    pub fn register_queued_with_destination(
        &mut self,
        digest: impl Into<String>,
        wire: Option<String>,
        expires_at: Option<u64>,
        destination: Option<String>,
    ) -> Result<(), EnvelopeError> {
        let digest = digest.into();
        if digest.is_empty() || self.records.contains_key(&digest) {
            return Err(EnvelopeError::InvalidWire);
        }
        self.records.insert(
            digest.clone(),
            DeliveryRecord {
                digest,
                state: DeliveryState::Queued,
                attempts: 0,
                next_retry_at: None,
                relay_id: None,
                wire,
                expires_at,
                destination,
            },
        );
        Ok(())
    }

    pub fn discard_if_state(&mut self, digest: &str, expected_state: DeliveryState) -> bool {
        if self
            .records
            .get(digest)
            .is_some_and(|record| record.state == expected_state)
        {
            self.records.remove(digest);
            true
        } else {
            false
        }
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

    /// A relay ACK only confirms removal from the relay queue. It must never
    /// be promoted to a recipient receipt; only the authenticated recipient
    /// daemon can create `RecipientReceived`.
    pub fn acknowledge_relay_ids(&mut self, ids: &[String]) -> usize {
        self.records
            .values()
            .filter(|record| {
                record
                    .relay_id
                    .as_ref()
                    .is_some_and(|id| ids.iter().any(|candidate| candidate == id))
            })
            .filter(|record| record.state == DeliveryState::RelayAccepted)
            .count()
    }

    pub fn register_recipient_received(
        &mut self,
        digest: impl Into<String>,
        relay_id: impl Into<String>,
    ) -> Result<bool, EnvelopeError> {
        let digest = digest.into();
        if digest.is_empty() {
            return Err(EnvelopeError::InvalidWire);
        }
        if self.records.contains_key(&digest) {
            return Ok(false);
        }
        self.records.insert(
            digest.clone(),
            DeliveryRecord {
                digest,
                state: DeliveryState::RecipientReceived,
                attempts: 0,
                next_retry_at: None,
                relay_id: Some(relay_id.into()),
                wire: None,
                expires_at: None,
                destination: None,
            },
        );
        Ok(true)
    }

    pub fn mark_decrypted(&mut self, digest: &str) -> Result<bool, EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        if record.state == DeliveryState::Decrypted {
            return Ok(false);
        }
        if record.state != DeliveryState::RecipientReceived {
            return Err(EnvelopeError::InvalidWire);
        }
        record.state = DeliveryState::Decrypted;
        Ok(true)
    }

    pub fn cancel(&mut self, digest: &str) -> Result<bool, EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        if matches!(
            record.state,
            DeliveryState::RelayAccepted
                | DeliveryState::RecipientReceived
                | DeliveryState::Decrypted
                | DeliveryState::Failed
                | DeliveryState::Cancelled
        ) {
            return Ok(false);
        }
        record.state = DeliveryState::Cancelled;
        record.next_retry_at = None;
        record.wire = None;
        Ok(true)
    }

    pub fn expire_due(&mut self, now: u64) -> usize {
        let mut expired = 0;
        for record in self.records.values_mut() {
            if record
                .expires_at
                .is_some_and(|expires_at| expires_at <= now)
                && !matches!(
                    record.state,
                    DeliveryState::Decrypted | DeliveryState::Cancelled
                )
            {
                record.state = DeliveryState::Failed;
                record.next_retry_at = None;
                record.wire = None;
                expired += 1;
            }
        }
        expired
    }

    pub fn schedule_retry(&mut self, digest: &str, now: u64) -> Result<bool, EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        if matches!(
            record.state,
            DeliveryState::RecipientReceived
                | DeliveryState::Decrypted
                | DeliveryState::Failed
                | DeliveryState::Cancelled
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

    pub fn schedule_retry_if_current(
        &mut self,
        digest: &str,
        expected_state: DeliveryState,
        now: u64,
    ) -> Result<bool, EnvelopeError> {
        let Some(record) = self.records.get(digest) else {
            return Err(EnvelopeError::InvalidWire);
        };
        if record.state != expected_state {
            return Ok(false);
        }
        self.schedule_retry(digest, now)
    }

    pub fn mark_failed(&mut self, digest: &str) -> Result<bool, EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        if record.state == DeliveryState::Failed {
            return Ok(false);
        }
        record.state = DeliveryState::Failed;
        record.next_retry_at = None;
        record.wire = None;
        record.destination = None;
        Ok(true)
    }

    pub fn mark_failed_if_current(
        &mut self,
        digest: &str,
        expected_state: DeliveryState,
    ) -> Result<bool, EnvelopeError> {
        let Some(record) = self.records.get(digest) else {
            return Err(EnvelopeError::InvalidWire);
        };
        if record.state != expected_state {
            return Ok(false);
        }
        self.mark_failed(digest)
    }

    pub fn get(&self, digest: &str) -> Option<&DeliveryRecord> {
        self.records.get(digest)
    }

    pub fn due_retries(&self, now: u64) -> Vec<DeliveryRecord> {
        self.records
            .values()
            .filter(|record| {
                matches!(
                    record.state,
                    DeliveryState::Retryable | DeliveryState::Queued
                ) && record.next_retry_at.is_none_or(|retry_at| retry_at <= now)
                    && record.wire.is_some()
                    && record.destination.is_some()
            })
            .cloned()
            .collect()
    }

    /// Applies a relay acceptance only when the record still has the state
    /// observed before the network request. A cancelled record is also
    /// reconciled to `RelayAccepted` when the relay proves it accepted the
    /// envelope; a late failure leaves cancellation intact.
    pub fn accept_retry(
        &mut self,
        digest: &str,
        expected_state: DeliveryState,
        relay_id: String,
    ) -> Result<bool, EnvelopeError> {
        let record = self
            .records
            .get_mut(digest)
            .ok_or(EnvelopeError::InvalidWire)?;
        if record.state != expected_state && record.state != DeliveryState::Cancelled {
            return Ok(false);
        }
        record.relay_id = Some(relay_id);
        record.state = DeliveryState::RelayAccepted;
        record.next_retry_at = None;
        Ok(true)
    }

    pub fn persist(&self, store: &mut EncryptedStore) -> Result<(), StorageError> {
        let bytes = self.encoded_bytes()?;
        store.put(RecordClass::Outbox, "delivery/ledger", &bytes)
    }

    pub fn encoded_bytes(&self) -> Result<Vec<u8>, StorageError> {
        serde_json::to_vec(&self.records).map_err(|_| StorageError::CorruptStore)
    }

    pub fn restore(store: &EncryptedStore) -> Result<Self, StorageError> {
        let Some(bytes) = store.get(RecordClass::Outbox, "delivery/ledger") else {
            return Ok(Self::default());
        };
        let records: BTreeMap<String, DeliveryRecord> =
            serde_json::from_slice(&bytes).map_err(|_| StorageError::CorruptStore)?;
        if records.len() > MAX_RECORDS
            || records
                .iter()
                .any(|(key, record)| !valid_persisted_record(key, record))
        {
            return Err(StorageError::CorruptStore);
        }
        Ok(Self { records })
    }
}

fn valid_persisted_record(key: &str, record: &DeliveryRecord) -> bool {
    if key.is_empty()
        || key.len() > MAX_DIGEST_BYTES
        || record.digest != key
        || record.attempts > 5
        || record
            .relay_id
            .as_ref()
            .is_some_and(|value| value.is_empty() || value.len() > MAX_RELAY_ID_BYTES)
        || record
            .wire
            .as_ref()
            .is_some_and(|value| value.is_empty() || value.len() > MAX_WIRE_BYTES)
        || record
            .destination
            .as_ref()
            .is_some_and(|value| value.is_empty() || value.len() > MAX_DESTINATION_BYTES)
    {
        return false;
    }

    match record.state {
        DeliveryState::Retryable => {
            record.attempts > 0 && record.next_retry_at.is_some() && record.wire.is_some()
        }
        DeliveryState::Queued => {
            record.next_retry_at.is_none() && record.wire.is_some() && record.destination.is_some()
        }
        _ => record.next_retry_at.is_none(),
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
#[serde(deny_unknown_fields)]
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
        if expires_at <= now || expires_at > now.saturating_add(MAX_ENVELOPE_TTL_SECONDS) {
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
        if parsed.v != VERSION
            || parsed.e <= now
            || parsed.e > now.saturating_add(MAX_ENVELOPE_TTL_SECONDS)
        {
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
    if !value.len().is_multiple_of(2) || !value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
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
        assert_eq!(
            RelayEnvelope::create("mailbox", b"x", 1 + 7 * 24 * 60 * 60 + 1, 1),
            Err(EnvelopeError::InvalidExpiry)
        );
    }

    #[test]
    fn unknown_wire_fields_are_rejected_instead_of_silently_downgrading() {
        let envelope = RelayEnvelope::create("mailbox", b"ciphertext", 601, 1).unwrap();
        let wire = envelope.to_wire().unwrap();
        let with_unknown = wire.trim_end_matches('}').to_owned() + ",\"future\":true}";
        assert_eq!(
            RelayEnvelope::from_wire(&with_unknown, 1),
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
    fn relay_ack_does_not_claim_recipient_received() {
        let mut ledger = super::DeliveryLedger::default();
        ledger.register_encrypted("relay-only").unwrap();
        ledger
            .transition("relay-only", super::DeliveryState::Queued)
            .unwrap();
        ledger
            .transition("relay-only", super::DeliveryState::RelayAccepted)
            .unwrap();
        ledger.bind_relay_id("relay-only", "relay-1").unwrap();
        assert_eq!(ledger.acknowledge_relay_ids(&["relay-1".into()]), 1);
        assert_eq!(
            ledger.get("relay-only").unwrap().state,
            super::DeliveryState::RelayAccepted
        );
    }

    #[test]
    fn delivery_ledger_can_cancel_before_relay_acceptance_and_expire_stale_wire() {
        let mut ledger = super::DeliveryLedger::default();
        ledger
            .register_encrypted_with_wire_and_expiry("draft-1", Some("wire".into()), Some(100))
            .unwrap();
        assert_eq!(ledger.cancel("draft-1"), Ok(true));
        assert_eq!(ledger.cancel("draft-1"), Ok(false));
        assert_eq!(
            ledger.get("draft-1").unwrap().state,
            super::DeliveryState::Cancelled
        );

        ledger
            .register_encrypted_with_wire_and_expiry("draft-2", Some("wire".into()), Some(100))
            .unwrap();
        assert_eq!(ledger.expire_due(100), 1);
        assert_eq!(
            ledger.get("draft-2").unwrap().state,
            super::DeliveryState::Failed
        );

        ledger
            .register_encrypted_with_wire("cancelled", Some("wire".into()))
            .unwrap();
        ledger.cancel("cancelled").unwrap();
        assert_eq!(ledger.schedule_retry("cancelled", 100), Ok(false));
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
    fn automatic_retry_candidates_require_a_persisted_destination() {
        let mut ledger = super::DeliveryLedger::default();
        ledger
            .register_encrypted_with_destination(
                "digest-due",
                Some("wire".into()),
                Some(10_000),
                Some("https://relay.example/api/v1/inbox/cap".into()),
            )
            .unwrap();
        ledger.schedule_retry("digest-due", 100).unwrap();
        assert!(ledger.due_retries(104).is_empty());
        assert_eq!(ledger.due_retries(105).len(), 1);
        assert_eq!(
            ledger.due_retries(105)[0].destination.as_deref(),
            Some("https://relay.example/api/v1/inbox/cap")
        );

        ledger.mark_failed("digest-due").unwrap();
        assert!(ledger.due_retries(u64::MAX).is_empty());
        assert!(ledger.get("digest-due").unwrap().wire.is_none());
    }

    #[test]
    fn queued_delivery_is_recoverable_after_crash_before_relay_acceptance() {
        let mut ledger = super::DeliveryLedger::default();
        ledger
            .register_encrypted_with_destination(
                "digest-queued",
                Some("wire".into()),
                Some(10_000),
                Some("https://relay.example/api/v1/inbox/cap".into()),
            )
            .unwrap();
        ledger
            .transition("digest-queued", super::DeliveryState::Queued)
            .unwrap();
        assert_eq!(ledger.due_retries(100).len(), 1);
    }

    #[test]
    fn late_retry_result_cannot_overwrite_a_changed_state() {
        let mut ledger = super::DeliveryLedger::default();
        ledger
            .register_encrypted_with_destination(
                "digest-race",
                Some("wire".into()),
                Some(10_000),
                Some("https://relay.example/api/v1/inbox/cap".into()),
            )
            .unwrap();
        ledger
            .transition("digest-race", super::DeliveryState::Queued)
            .unwrap();
        assert_eq!(
            ledger.accept_retry(
                "digest-race",
                super::DeliveryState::Retryable,
                "relay-id".into(),
            ),
            Ok(false)
        );
        assert_eq!(
            ledger.accept_retry(
                "digest-race",
                super::DeliveryState::Queued,
                "relay-id".into(),
            ),
            Ok(true)
        );
        assert_eq!(
            ledger.get("digest-race").unwrap().state,
            super::DeliveryState::RelayAccepted
        );

        ledger
            .register_queued_with_destination(
                "digest-cancel-race",
                Some("wire".into()),
                Some(10_000),
                Some("https://relay.example/api/v1/inbox/cap".into()),
            )
            .unwrap();
        ledger.cancel("digest-cancel-race").unwrap();
        assert_eq!(
            ledger.accept_retry(
                "digest-cancel-race",
                super::DeliveryState::Queued,
                "relay-id-2".into(),
            ),
            Ok(true)
        );
        assert_eq!(
            ledger.get("digest-cancel-race").unwrap().state,
            super::DeliveryState::RelayAccepted
        );
    }

    #[test]
    fn inbound_delivery_is_durable_and_idempotent() {
        let mut ledger = super::DeliveryLedger::default();
        assert_eq!(
            ledger.register_recipient_received("digest-in", "relay-1"),
            Ok(true)
        );
        assert_eq!(
            ledger.register_recipient_received("digest-in", "relay-1"),
            Ok(false)
        );
        assert_eq!(ledger.mark_decrypted("digest-in"), Ok(true));
        assert_eq!(ledger.mark_decrypted("digest-in"), Ok(false));
        assert_eq!(
            ledger.get("digest-in").unwrap().state,
            super::DeliveryState::Decrypted
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

    #[test]
    fn delivery_ledger_rejects_tampered_persisted_invariants() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-delivery-invalid-{}",
            std::process::id()
        ));
        let mut store =
            crate::storage::EncryptedStore::initialize(&path, "correct horse battery staple")
                .unwrap();
        let malformed = serde_json::json!({
            "digest-key": {
                "digest": "different-digest",
                "state": "Retryable",
                "attempts": 0,
                "next_retry_at": null,
                "relay_id": null,
                "wire": null,
                "expires_at": null,
                "destination": null
            }
        });
        store
            .put(
                crate::storage::RecordClass::Outbox,
                "delivery/ledger",
                &serde_json::to_vec(&malformed).unwrap(),
            )
            .unwrap();
        assert!(matches!(
            super::DeliveryLedger::restore(&store),
            Err(crate::storage::StorageError::CorruptStore)
        ));
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(path.with_extension("revision"));
    }
}
