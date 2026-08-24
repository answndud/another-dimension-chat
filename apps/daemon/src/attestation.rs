use ed25519_dalek::{Signature, Verifier, VerifyingKey};

const ATTESTATION_VERSION: u16 = 1;
const MAX_ATTESTATIONS_PER_PEER: usize = 8;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
pub struct PeerAttestation {
    pub version: u16,
    /// The attestor's account ID (who is vouching)
    pub attestor_account_id: String,
    /// The subject's account ID (whose key is being vouched for)
    pub subject_account_id: String,
    /// The subject's device public key (hex)
    pub subject_device_public_key: String,
    /// Unix timestamp when the attestation was created
    pub created_at: u64,
    /// Ed25519 signature over the transcript by the attestor
    pub signature: String,
}

impl PeerAttestation {
    /// Creates a new attestation signing a peer's identity.
    pub fn create(
        attestor_key: &crate::identity::AccountRootKey,
        subject_account_id: &str,
        subject_device_public_key_hex: &str,
        now: u64,
    ) -> Result<Self, AttestationError> {
        let device_key_bytes = decode_hex(subject_device_public_key_hex)
            .ok_or(AttestationError::InvalidPublicKey)?;
        if device_key_bytes.len() != 32 {
            return Err(AttestationError::InvalidPublicKey);
        }

        let transcript = Self::transcript(
            attestor_key.account_id().as_str(),
            subject_account_id,
            subject_device_public_key_hex,
            now,
        );
        let signature = attestor_key.sign(&transcript);

        Ok(Self {
            version: ATTESTATION_VERSION,
            attestor_account_id: attestor_key.account_id().as_str().to_owned(),
            subject_account_id: subject_account_id.to_owned(),
            subject_device_public_key: subject_device_public_key_hex.to_owned(),
            created_at: now,
            signature: hex_encode(&signature),
        })
    }

    /// Verifies an attestation against the attestor's known public key.
    pub fn verify(
        &self,
        attestor_public_key_hex: &str,
        expected_subject_account_id: &str,
        expected_subject_device_public_key_hex: &str,
    ) -> Result<(), AttestationError> {
        if self.version != ATTESTATION_VERSION {
            return Err(AttestationError::UnsupportedVersion);
        }
        if self.subject_account_id != expected_subject_account_id {
            return Err(AttestationError::SubjectMismatch);
        }
        if self.subject_device_public_key != expected_subject_device_public_key_hex {
            return Err(AttestationError::KeyMismatch);
        }
        let raw_pk = attestor_public_key_hex
            .strip_prefix("ad1pk")
            .unwrap_or(attestor_public_key_hex);
        let attestor_pk = decode_hex(raw_pk)
            .ok_or(AttestationError::InvalidPublicKey)?;
        let verifying_key = VerifyingKey::from_bytes(
            <&[u8; 32]>::try_from(attestor_pk.as_slice())
                .map_err(|_| AttestationError::InvalidPublicKey)?,
        )
        .map_err(|_| AttestationError::InvalidPublicKey)?;

        let transcript = Self::transcript(
            &self.attestor_account_id,
            &self.subject_account_id,
            &self.subject_device_public_key,
            self.created_at,
        );
        let sig_bytes =
            decode_hex(&self.signature).ok_or(AttestationError::InvalidSignature)?;
        let signature = Signature::from_slice(
            <&[u8; 64]>::try_from(sig_bytes.as_slice())
                .map_err(|_| AttestationError::InvalidSignature)?,
        )
        .map_err(|_| AttestationError::InvalidSignature)?;

        verifying_key
            .verify(&transcript, &signature)
            .map_err(|_| AttestationError::InvalidSignature)
    }

    fn transcript(
        attestor_id: &str,
        subject_id: &str,
        subject_device_key_hex: &str,
        created_at: u64,
    ) -> Vec<u8> {
        format!(
            "another-dimension/attestation/v{}\nattestor={}\nsubject={}\nsubject_device_key={}\ncreated_at={}\n",
            ATTESTATION_VERSION, attestor_id, subject_id, subject_device_key_hex, created_at
        )
        .into_bytes()
    }
}

#[derive(Debug)]
pub enum AttestationError {
    InvalidPublicKey,
    InvalidSignature,
    SubjectMismatch,
    KeyMismatch,
    UnsupportedVersion,
    Storage,
    RandomnessUnavailable,
}

pub struct PeerAttestationStore {
    attestations: std::collections::BTreeMap<String, Vec<PeerAttestation>>,
}

impl Default for PeerAttestationStore {
    fn default() -> Self {
        Self::new()
    }
}

impl PeerAttestationStore {
    pub fn new() -> Self {
        Self {
            attestations: std::collections::BTreeMap::new(),
        }
    }

    /// Adds an attestation for a peer. Keeps at most MAX_ATTESTATIONS_PER_PEER per peer.
    pub fn add(&mut self, attestation: PeerAttestation) -> Result<(), AttestationError> {
        let list = self
            .attestations
            .entry(attestation.subject_account_id.clone())
            .or_default();
        if list.len() >= MAX_ATTESTATIONS_PER_PEER {
            list.remove(0);
        }
        if !list.contains(&attestation) {
            list.push(attestation);
        }
        Ok(())
    }

    /// Returns all attestations for a given subject account.
    pub fn for_peer(&self, account_id: &str) -> &[PeerAttestation] {
        self.attestations
            .get(account_id)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
    }

    /// Returns all stored attestations.
    pub fn all(&self) -> impl Iterator<Item = &PeerAttestation> {
        self.attestations.values().flatten()
    }

    pub fn encode(&self) -> Result<Vec<u8>, AttestationError> {
        serde_json::to_vec(&self.attestations).map_err(|_| AttestationError::Storage)
    }

    pub fn restore(bytes: &[u8]) -> Result<Self, AttestationError> {
        let attestations: std::collections::BTreeMap<String, Vec<PeerAttestation>> =
            serde_json::from_slice(bytes).map_err(|_| AttestationError::Storage)?;
        Ok(Self { attestations })
    }
}

fn decode_hex(value: &str) -> Option<Vec<u8>> {
    if !value.len().is_multiple_of(2) || value.is_empty() {
        return None;
    }
    (0..value.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&value[i..i + 2], 16).ok())
        .collect()
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::identity::AccountRootKey;

    #[test]
    fn attestation_roundtrip_sign_verify() {
        let alice = AccountRootKey::generate().unwrap();
        let bob = AccountRootKey::generate().unwrap();
        let bob_account_id = bob.account_id().as_str().to_owned();
        let bob_device_key = hex_encode(&bob.public_key());

        let attestation =
            PeerAttestation::create(&alice, &bob_account_id, &bob_device_key, 1000).unwrap();

        // Valid verification succeeds
        assert!(attestation
            .verify(alice.account_id().as_str(), &bob_account_id, &bob_device_key)
            .is_ok());

        // Wrong subject fails
        assert!(attestation
            .verify(alice.account_id().as_str(), "wrong-subject", &bob_device_key)
            .is_err());

        // Wrong key fails
        assert!(attestation
            .verify(alice.account_id().as_str(), &bob_account_id, "00".repeat(32).as_str())
            .is_err());
    }

    #[test]
    fn tampered_attestation_fails_verification() {
        let alice = AccountRootKey::generate().unwrap();
        let bob = AccountRootKey::generate().unwrap();
        let bob_account_id = bob.account_id().as_str().to_owned();
        let bob_device_key = hex_encode(&bob.public_key());

        let mut attestation =
            PeerAttestation::create(&alice, &bob_account_id, &bob_device_key, 1000).unwrap();

        // Tamper with the signature
        attestation.signature = "00".repeat(64);

        assert!(attestation
            .verify(alice.account_id().as_str(), &bob_account_id, &bob_device_key)
            .is_err());
    }

    #[test]
    fn store_persists_and_restores() {
        let alice = AccountRootKey::generate().unwrap();
        let bob = AccountRootKey::generate().unwrap();
        let bob_account_id = bob.account_id().as_str().to_owned();
        let bob_device_key = hex_encode(&bob.public_key());

        let attestation =
            PeerAttestation::create(&alice, &bob_account_id, &bob_device_key, 1000).unwrap();

        let mut store = PeerAttestationStore::new();
        store.add(attestation.clone()).unwrap();
        let encoded = store.encode().unwrap();

        let restored = PeerAttestationStore::restore(&encoded).unwrap();
        assert_eq!(restored.for_peer(&bob_account_id), &[attestation]);
    }
}
