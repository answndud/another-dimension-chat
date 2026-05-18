use another_dimension_identity::{
    ContactId, PairwisePublicKey, PairwisePublicKeyScheme, PairwiseSignature,
    PairwiseSignatureScheme, ProductionPairwisePublicKey, ProductionPairwiseSignature, ProfileName,
};
#[cfg(feature = "dev-insecure")]
use std::time::{SystemTime, UNIX_EPOCH};

pub const DEFAULT_TTL_SECONDS: u64 = 600;
pub const MAX_PAIRING_PAYLOAD_SIZE: usize = 1200;
const CANONICAL_MAGIC: &[u8] = b"ADPAIR2-CANONICAL\0";
const SAFETY_TRANSCRIPT_PREFIX: &str = "ADPAIR-SAFETY-V1";

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PairingPayload {
    pub owner_profile: ProfileName,
    pub pairing_nonce: String,
    pub pairwise_public_key: PairwisePublicKey,
    pub pairwise_signature: PairwiseSignature,
    pub rendezvous_endpoint: String,
    pub endpoint_rotation_policy: String,
    pub protocol_capabilities: String,
    pub prekey_bundle: String,
    pub issued_at_local_ms: u128,
    pub ttl_seconds: u64,
}

impl PairingPayload {
    pub fn encode(&self) -> Result<String, PairingError> {
        let canonical = self.canonical_bytes()?;
        let canonical_hex = encode_hex(&canonical);
        let encoded = format!(
            "ADPAIR2|{canonical_hex}|{}",
            self.pairwise_signature.as_str()
        );
        if encoded.len() > MAX_PAIRING_PAYLOAD_SIZE {
            return Err(PairingError::PayloadTooLarge);
        }
        Ok(encoded)
    }

    pub fn decode(value: &str) -> Result<Self, PairingError> {
        let value = value.trim();
        if value.len() > MAX_PAIRING_PAYLOAD_SIZE {
            return Err(PairingError::PayloadTooLarge);
        }
        let parts = value.split('|').collect::<Vec<_>>();
        if parts.len() != 3 || parts[0] != "ADPAIR2" {
            return Err(PairingError::InvalidPayload);
        }
        let canonical = decode_hex(parts[1])?;
        let signature =
            PairwiseSignature::new(parts[2]).map_err(|_| PairingError::InvalidPayload)?;
        let payload = Self::decode_canonical(&canonical, signature)?;
        if !verify_pairing_signature(&payload, &canonical)? {
            return Err(PairingError::InvalidPayload);
        }
        Ok(payload)
    }

    pub fn canonical_bytes(&self) -> Result<Vec<u8>, PairingError> {
        let mut out = Vec::new();
        out.extend_from_slice(CANONICAL_MAGIC);
        write_field(&mut out, "another-dimension")?;
        write_field(&mut out, "pairing-payload-v1")?;
        write_field(&mut out, self.owner_profile.as_str())?;
        write_field(&mut out, &self.pairing_nonce)?;
        write_field(&mut out, self.pairwise_public_key.as_str())?;
        write_field(&mut out, &self.rendezvous_endpoint)?;
        write_field(&mut out, &self.endpoint_rotation_policy)?;
        write_field(&mut out, &self.protocol_capabilities)?;
        write_field(&mut out, &self.prekey_bundle)?;
        out.extend_from_slice(&self.issued_at_local_ms.to_be_bytes());
        out.extend_from_slice(&self.ttl_seconds.to_be_bytes());
        Ok(out)
    }

    fn decode_canonical(value: &[u8], signature: PairwiseSignature) -> Result<Self, PairingError> {
        if !value.starts_with(CANONICAL_MAGIC) {
            return Err(PairingError::InvalidPayload);
        }
        let mut cursor = CANONICAL_MAGIC.len();
        let app_id = read_field(value, &mut cursor)?;
        let payload_version = read_field(value, &mut cursor)?;
        if app_id != "another-dimension" || payload_version != "pairing-payload-v1" {
            return Err(PairingError::InvalidPayload);
        }
        let owner_profile = read_field(value, &mut cursor)?;
        let pairing_nonce = read_field(value, &mut cursor)?;
        let pairwise_public_key = read_field(value, &mut cursor)?;
        let rendezvous_endpoint = read_field(value, &mut cursor)?;
        let endpoint_rotation_policy = read_field(value, &mut cursor)?;
        let protocol_capabilities = read_field(value, &mut cursor)?;
        let prekey_bundle = read_field(value, &mut cursor)?;
        let issued_at_local_ms = read_u128(value, &mut cursor)?;
        let ttl_seconds = read_u64(value, &mut cursor)?;
        if cursor != value.len() {
            return Err(PairingError::InvalidPayload);
        }
        Ok(Self {
            owner_profile: ProfileName::new(owner_profile)
                .map_err(|_| PairingError::InvalidPayload)?,
            pairing_nonce,
            pairwise_public_key: PairwisePublicKey::new(pairwise_public_key)
                .map_err(|_| PairingError::InvalidPayload)?,
            pairwise_signature: signature,
            rendezvous_endpoint,
            endpoint_rotation_policy,
            protocol_capabilities,
            prekey_bundle,
            issued_at_local_ms,
            ttl_seconds,
        })
    }

    pub fn contact_id(&self) -> Result<ContactId, PairingError> {
        ContactId::new(self.owner_profile.as_str()).map_err(|_| PairingError::InvalidPayload)
    }

    pub fn is_expired_at(&self, observed_at_local_ms: u128) -> bool {
        let ttl_ms = u128::from(self.ttl_seconds) * 1000;
        observed_at_local_ms.saturating_sub(self.issued_at_local_ms) > ttl_ms
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingContact {
    pub contact_id: ContactId,
    pub local_payload: PairingPayload,
    pub remote_payload: PairingPayload,
    pub safety_number: String,
    pub safety_phrase: String,
}

impl PendingContact {
    pub fn transcript(&self) -> Result<String, PairingError> {
        transcript(&self.local_payload, &self.remote_payload)
    }
}

pub fn transcript(local: &PairingPayload, remote: &PairingPayload) -> Result<String, PairingError> {
    let mut fragments = [
        payload_transcript_fragment(local)?,
        payload_transcript_fragment(remote)?,
    ];
    fragments.sort();
    Ok(format!(
        "{SAFETY_TRANSCRIPT_PREFIX}|{}|{}",
        fragments[0], fragments[1]
    ))
}

fn payload_transcript_fragment(payload: &PairingPayload) -> Result<String, PairingError> {
    Ok(encode_hex(&payload.canonical_bytes()?))
}

fn verify_pairing_signature(
    payload: &PairingPayload,
    canonical: &[u8],
) -> Result<bool, PairingError> {
    let public_key_scheme = payload.pairwise_public_key.scheme().ok();
    let signature_scheme = payload.pairwise_signature.scheme().ok();
    match (public_key_scheme, signature_scheme) {
        (
            Some(PairwisePublicKeyScheme::DevInsecureV1),
            Some(PairwiseSignatureScheme::Ed25519DalekV2),
        )
        | (
            Some(PairwisePublicKeyScheme::Ed25519DalekV2),
            Some(PairwiseSignatureScheme::DevInsecureV1),
        ) => Ok(false),
        (
            Some(PairwisePublicKeyScheme::Ed25519DalekV2),
            Some(PairwiseSignatureScheme::Ed25519DalekV2),
        ) => {
            let public_key =
                ProductionPairwisePublicKey::from_pairwise_public_key(&payload.pairwise_public_key)
                    .map_err(|_| PairingError::InvalidPayload)?;
            let signature =
                ProductionPairwiseSignature::from_pairwise_signature(&payload.pairwise_signature)
                    .map_err(|_| PairingError::InvalidPayload)?;
            Ok(public_key.verify_pairing_signature(canonical, &signature))
        }
        _ => Ok(payload
            .pairwise_public_key
            .verify_pairing_signature(canonical, &payload.pairwise_signature)),
    }
}

fn write_field(out: &mut Vec<u8>, value: &str) -> Result<(), PairingError> {
    let len = u16::try_from(value.len()).map_err(|_| PairingError::PayloadTooLarge)?;
    out.extend_from_slice(&len.to_be_bytes());
    out.extend_from_slice(value.as_bytes());
    Ok(())
}

fn read_field(value: &[u8], cursor: &mut usize) -> Result<String, PairingError> {
    let len_bytes = value
        .get(*cursor..*cursor + 2)
        .ok_or(PairingError::InvalidPayload)?;
    let len = u16::from_be_bytes([len_bytes[0], len_bytes[1]]) as usize;
    *cursor += 2;
    let field = value
        .get(*cursor..*cursor + len)
        .ok_or(PairingError::InvalidPayload)?;
    *cursor += len;
    String::from_utf8(field.to_vec()).map_err(|_| PairingError::InvalidPayload)
}

fn read_u128(value: &[u8], cursor: &mut usize) -> Result<u128, PairingError> {
    let bytes = value
        .get(*cursor..*cursor + 16)
        .ok_or(PairingError::InvalidPayload)?;
    *cursor += 16;
    Ok(u128::from_be_bytes(
        bytes.try_into().map_err(|_| PairingError::InvalidPayload)?,
    ))
}

fn read_u64(value: &[u8], cursor: &mut usize) -> Result<u64, PairingError> {
    let bytes = value
        .get(*cursor..*cursor + 8)
        .ok_or(PairingError::InvalidPayload)?;
    *cursor += 8;
    Ok(u64::from_be_bytes(
        bytes.try_into().map_err(|_| PairingError::InvalidPayload)?,
    ))
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

fn decode_hex(value: &str) -> Result<Vec<u8>, PairingError> {
    if !value.len().is_multiple_of(2) {
        return Err(PairingError::InvalidPayload);
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

fn hex_value(byte: u8) -> Result<u8, PairingError> {
    match byte {
        b'0'..=b'9' => Ok(byte - b'0'),
        b'a'..=b'f' => Ok(byte - b'a' + 10),
        b'A'..=b'F' => Ok(byte - b'A' + 10),
        _ => Err(PairingError::InvalidPayload),
    }
}

#[cfg(feature = "dev-insecure")]
pub fn dev_payload_for(profile: &ProfileName) -> PairingPayload {
    dev_pairing_material_for(profile).0
}

#[cfg(feature = "dev-insecure")]
pub fn dev_pairing_material_for(
    profile: &ProfileName,
) -> (
    PairingPayload,
    another_dimension_identity::PairwisePrivateKey,
) {
    let identity = another_dimension_identity::generate_dev_pairwise_identity(profile.as_str());
    let nonce = dev_nonce(profile.as_str());
    let mut payload = PairingPayload {
        owner_profile: profile.clone(),
        pairing_nonce: nonce.clone(),
        pairwise_public_key: identity.public_key().clone(),
        pairwise_signature: PairwiseSignature::new("unsigned").expect("valid signature"),
        rendezvous_endpoint: format!("dev-rendezvous-{profile}-{nonce}.onion"),
        endpoint_rotation_policy: "manual-v1".to_string(),
        protocol_capabilities: "prototype-dev-insecure-v1".to_string(),
        prekey_bundle: "PendingCryptoDesign".to_string(),
        issued_at_local_ms: now_ms(),
        ttl_seconds: DEFAULT_TTL_SECONDS,
    };
    payload.pairwise_signature = identity.sign_pairing_payload(
        &payload
            .canonical_bytes()
            .expect("dev payload should fit canonical body"),
    );
    (payload, identity.private_key().clone())
}

#[cfg(feature = "dev-insecure")]
fn dev_nonce(label: &str) -> String {
    format!("{:x}", dev_hash(&format!("{label}:{}", now_ms())))
}

#[cfg(feature = "dev-insecure")]
fn dev_hash(input: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in input.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

#[cfg(feature = "dev-insecure")]
fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

#[derive(Debug, Eq, PartialEq)]
pub enum PairingError {
    InvalidPayload,
    PayloadTooLarge,
    ExpiredPayload,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payload_budget_is_enforced() {
        let payload = PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "x".repeat(MAX_PAIRING_PAYLOAD_SIZE),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 0,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        };

        assert_eq!(payload.encode(), Err(PairingError::PayloadTooLarge));
    }

    #[test]
    fn pairing_payload_uses_canonical_v2_envelope() {
        let payload = sign_payload(PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("alice-pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "dev-rendezvous-alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        });

        let encoded = payload.encode().expect("payload encodes");
        let decoded = PairingPayload::decode(&encoded).expect("payload decodes");

        assert!(encoded.starts_with("ADPAIR2|"));
        assert_eq!(decoded, payload);
    }

    #[test]
    fn pairing_payload_tamper_is_rejected() {
        let payload = sign_payload(PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("alice-pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "dev-rendezvous-alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        });
        let encoded = payload.encode().expect("payload encodes");
        let tampered = encoded.replacen("61", "62", 1);

        assert_eq!(
            PairingPayload::decode(&tampered),
            Err(PairingError::InvalidPayload)
        );
    }

    #[test]
    fn pairing_payload_signature_tamper_is_rejected() {
        let payload = sign_payload(PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("alice-pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "dev-rendezvous-alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        });
        let encoded = payload.encode().expect("payload encodes");
        let mut parts = encoded.split('|').collect::<Vec<_>>();
        parts[2] = "dev-sign-v1-0000000000000000";
        let tampered = parts.join("|");

        assert_eq!(
            PairingPayload::decode(&tampered),
            Err(PairingError::InvalidPayload)
        );
    }

    #[test]
    fn decode_rejects_dev_public_key_with_production_signature() {
        let mut payload = PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("dev-pub-alice").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "dev-rendezvous-alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        };
        let production_key =
            another_dimension_identity::ProductionPairwisePrivateKey::from_ed25519_dalek_seed(
                [5_u8; 32],
            )
            .expect("valid seed");
        payload.pairwise_signature = production_key
            .sign_pairing_payload(&payload.canonical_bytes().expect("canonical bytes"))
            .expect("production signature")
            .to_pairwise_signature()
            .expect("pairwise signature");

        assert_eq!(
            PairingPayload::decode(&payload.encode().expect("payload encodes")),
            Err(PairingError::InvalidPayload)
        );
    }

    #[test]
    fn decode_rejects_production_public_key_with_dev_signature() {
        let production_key =
            another_dimension_identity::ProductionPairwisePrivateKey::from_ed25519_dalek_seed(
                [6_u8; 32],
            )
            .expect("valid seed");
        let production_public_key = production_key
            .public_key()
            .expect("production public key")
            .to_pairwise_public_key()
            .expect("pairwise public key");
        let payload = sign_payload(PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: production_public_key,
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "dev-rendezvous-alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        });

        assert_eq!(
            PairingPayload::decode(&payload.encode().expect("payload encodes")),
            Err(PairingError::InvalidPayload)
        );
    }

    #[test]
    fn decode_accepts_production_public_key_with_production_signature() {
        let payload = production_signed_payload([7_u8; 32]);

        let decoded =
            PairingPayload::decode(&payload.encode().expect("payload encodes")).expect("decode");

        assert_eq!(decoded, payload);
    }

    #[test]
    fn decode_rejects_tampered_production_signed_payload() {
        let payload = production_signed_payload([8_u8; 32]);
        let encoded = payload.encode().expect("payload encodes");
        let tampered = encoded.replacen("6e6f6e6365", "6e6f6e6364", 1);

        assert_eq!(
            PairingPayload::decode(&tampered),
            Err(PairingError::InvalidPayload)
        );
    }

    #[test]
    fn decode_rejects_production_signature_from_wrong_key() {
        let signing_key =
            another_dimension_identity::ProductionPairwisePrivateKey::from_ed25519_dalek_seed(
                [9_u8; 32],
            )
            .expect("valid signing seed");
        let wrong_key =
            another_dimension_identity::ProductionPairwisePrivateKey::from_ed25519_dalek_seed(
                [10_u8; 32],
            )
            .expect("valid wrong seed");
        let wrong_public_key = wrong_key
            .public_key()
            .expect("wrong public key")
            .to_pairwise_public_key()
            .expect("pairwise public key");
        let mut payload = PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: wrong_public_key,
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        };
        payload.pairwise_signature = signing_key
            .sign_pairing_payload(&payload.canonical_bytes().expect("canonical bytes"))
            .expect("production signature")
            .to_pairwise_signature()
            .expect("pairwise signature");

        assert_eq!(
            PairingPayload::decode(&payload.encode().expect("payload encodes")),
            Err(PairingError::InvalidPayload)
        );
    }

    #[test]
    fn decode_rejects_oversized_input_before_parsing() {
        let oversized = format!("ADPAIR2|{}|signature", "a".repeat(MAX_PAIRING_PAYLOAD_SIZE));

        assert_eq!(
            PairingPayload::decode(&oversized),
            Err(PairingError::PayloadTooLarge)
        );
    }

    #[test]
    fn decode_rejects_malformed_adpair2_segments() {
        for malformed in [
            "",
            "ADPAIR2",
            "ADPAIR2|abcd",
            "ADPAIR2|abcd|sig|extra",
            "ADPAIR1|abcd|sig",
            " ADPAIR2 |abcd|sig",
        ] {
            assert_eq!(
                PairingPayload::decode(malformed),
                Err(PairingError::InvalidPayload),
                "malformed payload should fail: {malformed:?}"
            );
        }
    }

    #[test]
    fn decode_rejects_invalid_canonical_hex() {
        for malformed in ["ADPAIR2|a|sig", "ADPAIR2|zz|sig", "ADPAIR2|00xz|sig"] {
            assert_eq!(
                PairingPayload::decode(malformed),
                Err(PairingError::InvalidPayload),
                "malformed hex should fail: {malformed:?}"
            );
        }
    }

    #[test]
    fn decode_rejects_empty_signature() {
        let payload = sign_payload(PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("alice-pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "dev-rendezvous-alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        });
        let encoded = payload.encode().expect("payload encodes");
        let mut parts = encoded.split('|').collect::<Vec<_>>();
        parts[2] = "";
        let malformed = parts.join("|");

        assert_eq!(
            PairingPayload::decode(&malformed),
            Err(PairingError::InvalidPayload)
        );
    }

    #[test]
    fn decode_rejects_canonical_body_with_trailing_bytes() {
        let mut payload = sign_payload(PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("alice-pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "dev-rendezvous-alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        });
        let mut canonical = payload.canonical_bytes().expect("canonical body");
        canonical.push(0);
        let private_key = another_dimension_identity::PairwisePrivateKey::new(format!(
            "dev-priv-for-{}",
            payload.pairwise_public_key.as_str()
        ))
        .expect("valid private key");
        let identity = another_dimension_identity::PairwiseIdentity::new(
            payload.pairwise_public_key.clone(),
            private_key,
        )
        .expect("valid identity");
        payload.pairwise_signature = identity.sign_pairing_payload(&canonical);
        let malformed = format!(
            "ADPAIR2|{}|{}",
            encode_hex(&canonical),
            payload.pairwise_signature.as_str()
        );

        assert_eq!(
            PairingPayload::decode(&malformed),
            Err(PairingError::InvalidPayload)
        );
    }

    #[test]
    fn ttl_uses_local_observed_age() {
        let payload = PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "dev-rendezvous-alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: 10,
        };

        assert!(!payload.is_expired_at(11_000));
        assert!(payload.is_expired_at(11_001));
    }

    #[test]
    fn transcript_changes_when_endpoint_changes() {
        let mut alice = PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "alice-nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("alice-pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "alice-a.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 0,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        };
        let bob = PairingPayload {
            owner_profile: ProfileName::new("bob").expect("valid profile"),
            pairing_nonce: "bob-nonce".to_string(),
            pairwise_public_key: PairwisePublicKey::new("bob-pub").expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "bob.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 0,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        };

        let original = transcript(&alice, &bob).expect("transcript should build");
        alice.rendezvous_endpoint = "alice-b.onion".to_string();

        assert_ne!(
            original,
            transcript(&alice, &bob).expect("transcript should build")
        );
    }

    #[test]
    fn safety_transcript_has_stable_test_vector() {
        let alice = sample_payload("alice", "alice-nonce", "alice-pub", "alice.onion", 1_000);
        let bob = sample_payload("bob", "bob-nonce", "bob-pub", "bob.onion", 2_000);
        let expected = "ADPAIR-SAFETY-V1|414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310003626f620009626f622d6e6f6e63650007626f622d7075620009626f622e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000007d00000000000000258|414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310005616c696365000b616c6963652d6e6f6e63650009616c6963652d707562000b616c6963652e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000003e80000000000000258";

        assert_eq!(transcript(&alice, &bob).expect("transcript"), expected);
        assert_eq!(transcript(&bob, &alice).expect("transcript"), expected);
    }

    #[test]
    fn safety_transcript_changes_when_capability_or_prekey_changes() {
        let alice = sample_payload("alice", "alice-nonce", "alice-pub", "alice.onion", 1_000);
        let bob = sample_payload("bob", "bob-nonce", "bob-pub", "bob.onion", 2_000);
        let original = transcript(&alice, &bob).expect("transcript");

        let mut changed_capability = bob.clone();
        changed_capability.protocol_capabilities = "prototype-v2".to_string();
        assert_ne!(
            original,
            transcript(&alice, &changed_capability).expect("transcript")
        );

        let mut changed_prekey = bob;
        changed_prekey.prekey_bundle = "DifferentPrekeyCommitment".to_string();
        assert_ne!(
            original,
            transcript(&alice, &changed_prekey).expect("transcript")
        );
    }

    fn sample_payload(
        owner: &str,
        nonce: &str,
        public_key: &str,
        endpoint: &str,
        issued_at_local_ms: u128,
    ) -> PairingPayload {
        sign_payload(PairingPayload {
            owner_profile: ProfileName::new(owner).expect("valid profile"),
            pairing_nonce: nonce.to_string(),
            pairwise_public_key: PairwisePublicKey::new(public_key).expect("valid public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: endpoint.to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        })
    }

    fn sign_payload(mut payload: PairingPayload) -> PairingPayload {
        let private_key = another_dimension_identity::PairwisePrivateKey::new(format!(
            "dev-priv-for-{}",
            payload.pairwise_public_key.as_str()
        ))
        .expect("valid private key");
        let identity = another_dimension_identity::PairwiseIdentity::new(
            payload.pairwise_public_key.clone(),
            private_key,
        )
        .expect("valid identity");
        payload.pairwise_signature = identity.sign_pairing_payload(
            &payload
                .canonical_bytes()
                .expect("canonical payload should build"),
        );
        payload
    }

    fn production_signed_payload(seed: [u8; 32]) -> PairingPayload {
        let private_key =
            another_dimension_identity::ProductionPairwisePrivateKey::from_ed25519_dalek_seed(seed)
                .expect("valid production seed");
        let mut payload = PairingPayload {
            owner_profile: ProfileName::new("alice").expect("valid profile"),
            pairing_nonce: "nonce".to_string(),
            pairwise_public_key: private_key
                .public_key()
                .expect("production public key")
                .to_pairwise_public_key()
                .expect("pairwise public key"),
            pairwise_signature: test_signature(),
            rendezvous_endpoint: "alice.onion".to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: "prototype".to_string(),
            prekey_bundle: "PendingCryptoDesign".to_string(),
            issued_at_local_ms: 1_000,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        };
        payload.pairwise_signature = private_key
            .sign_pairing_payload(&payload.canonical_bytes().expect("canonical bytes"))
            .expect("production signature")
            .to_pairwise_signature()
            .expect("pairwise signature");
        payload
    }

    fn test_signature() -> PairwiseSignature {
        PairwiseSignature::new("unsigned-test-signature").expect("valid signature")
    }
}
