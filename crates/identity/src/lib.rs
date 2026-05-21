use ed25519_dalek::{Signature as Ed25519Signature, Signer, SigningKey, VerifyingKey};
use std::fmt;
#[cfg(feature = "dev-insecure")]
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_PRODUCTION_KEY_MATERIAL_SIZE: usize = 4096;
const ED25519_KEY_SIZE: usize = 32;
const ED25519_SIGNATURE_SIZE: usize = 64;
const ED25519_DALEK_V2_PUBLIC_KEY_PREFIX: &str = "ed25519-dalek-v2:";
const ED25519_DALEK_V2_SIGNATURE_PREFIX: &str = "ed25519-dalek-v2:";
const DEV_PUBLIC_KEY_PREFIX: &str = "dev-pub-";
const DEV_SIGNATURE_PREFIX: &str = "dev-sign-v1-";

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct ProfileName(String);

impl ProfileName {
    pub fn new(value: impl Into<String>) -> Result<Self, IdentityError> {
        let value = value.into();
        if value.is_empty()
            || !value
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
        {
            return Err(IdentityError::InvalidProfileName);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ProfileName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct ContactId(String);

impl ContactId {
    pub fn new(value: impl Into<String>) -> Result<Self, IdentityError> {
        let value = value.into();
        if value.is_empty()
            || !value
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
        {
            return Err(IdentityError::InvalidContactId);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ContactId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PairwisePublicKey(String);

impl PairwisePublicKey {
    pub fn new(value: impl Into<String>) -> Result<Self, IdentityError> {
        let value = value.into();
        if value.is_empty() {
            return Err(IdentityError::InvalidKeyMaterial);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn scheme(&self) -> Result<PairwisePublicKeyScheme, IdentityError> {
        if self.0.starts_with(DEV_PUBLIC_KEY_PREFIX) {
            return Ok(PairwisePublicKeyScheme::DevInsecureV1);
        }
        if self.0.starts_with(ED25519_DALEK_V2_PUBLIC_KEY_PREFIX) {
            return Ok(PairwisePublicKeyScheme::Ed25519DalekV2);
        }
        Err(IdentityError::InvalidKeyMaterial)
    }

    pub fn verify_pairing_signature(&self, message: &[u8], signature: &PairwiseSignature) -> bool {
        signature.as_str()
            == dev_pairing_signature(self.as_str(), &private_for_public(self.as_str()), message)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PairwisePublicKeyScheme {
    DevInsecureV1,
    Ed25519DalekV2,
}

impl PairwisePublicKeyScheme {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DevInsecureV1 => "dev-insecure-v1",
            Self::Ed25519DalekV2 => "ed25519-dalek-v2",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PairwisePrivateKey(String);

impl PairwisePrivateKey {
    pub fn new(value: impl Into<String>) -> Result<Self, IdentityError> {
        let value = value.into();
        if value.is_empty() {
            return Err(IdentityError::InvalidKeyMaterial);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PairwiseSignature(String);

impl PairwiseSignature {
    pub fn new(value: impl Into<String>) -> Result<Self, IdentityError> {
        let value = value.into();
        if value.is_empty() {
            return Err(IdentityError::InvalidKeyMaterial);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn scheme(&self) -> Result<PairwiseSignatureScheme, IdentityError> {
        if self.0.starts_with(DEV_SIGNATURE_PREFIX) {
            return Ok(PairwiseSignatureScheme::DevInsecureV1);
        }
        if self.0.starts_with(ED25519_DALEK_V2_SIGNATURE_PREFIX) {
            return Ok(PairwiseSignatureScheme::Ed25519DalekV2);
        }
        Err(IdentityError::InvalidKeyMaterial)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PairwiseSignatureScheme {
    DevInsecureV1,
    Ed25519DalekV2,
}

impl PairwiseSignatureScheme {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DevInsecureV1 => "dev-insecure-v1",
            Self::Ed25519DalekV2 => "ed25519-dalek-v2",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProductionKeyAlgorithm {
    PendingReview,
    Ed25519DalekV2,
}

impl ProductionKeyAlgorithm {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::PendingReview => "pending-review",
            Self::Ed25519DalekV2 => "ed25519-dalek-v2",
        }
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct ProductionPairwisePublicKey {
    algorithm: ProductionKeyAlgorithm,
    bytes: Vec<u8>,
}

impl ProductionPairwisePublicKey {
    pub fn from_bytes(
        algorithm: ProductionKeyAlgorithm,
        bytes: impl Into<Vec<u8>>,
    ) -> Result<Self, IdentityError> {
        let bytes = bytes.into();
        validate_production_key_material(&bytes)?;
        Ok(Self { algorithm, bytes })
    }

    pub fn algorithm(&self) -> ProductionKeyAlgorithm {
        self.algorithm
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.bytes
    }

    pub fn from_ed25519_dalek_bytes(bytes: [u8; ED25519_KEY_SIZE]) -> Result<Self, IdentityError> {
        VerifyingKey::from_bytes(&bytes).map_err(|_| IdentityError::InvalidKeyMaterial)?;
        Self::from_bytes(ProductionKeyAlgorithm::Ed25519DalekV2, bytes)
    }

    pub fn to_pairwise_public_key(&self) -> Result<PairwisePublicKey, IdentityError> {
        match self.algorithm {
            ProductionKeyAlgorithm::Ed25519DalekV2 => {
                let public_bytes = <[u8; ED25519_KEY_SIZE]>::try_from(self.bytes.as_slice())
                    .map_err(|_| IdentityError::InvalidKeyMaterial)?;
                PairwisePublicKey::new(format!(
                    "{ED25519_DALEK_V2_PUBLIC_KEY_PREFIX}{}",
                    encode_hex(&public_bytes)
                ))
            }
            ProductionKeyAlgorithm::PendingReview => Err(IdentityError::InvalidKeyMaterial),
        }
    }

    pub fn from_pairwise_public_key(value: &PairwisePublicKey) -> Result<Self, IdentityError> {
        match value.scheme()? {
            PairwisePublicKeyScheme::Ed25519DalekV2 => {
                let encoded = value
                    .as_str()
                    .strip_prefix(ED25519_DALEK_V2_PUBLIC_KEY_PREFIX)
                    .ok_or(IdentityError::InvalidKeyMaterial)?;
                let bytes = decode_hex_array::<ED25519_KEY_SIZE>(encoded)?;
                Self::from_ed25519_dalek_bytes(bytes)
            }
            PairwisePublicKeyScheme::DevInsecureV1 => Err(IdentityError::InvalidKeyMaterial),
        }
    }

    pub fn verify_pairing_signature(
        &self,
        message: &[u8],
        signature: &ProductionPairwiseSignature,
    ) -> bool {
        if self.algorithm != signature.algorithm {
            return false;
        }
        match self.algorithm {
            ProductionKeyAlgorithm::Ed25519DalekV2 => self.verify_ed25519_dalek(message, signature),
            ProductionKeyAlgorithm::PendingReview => false,
        }
    }

    fn verify_ed25519_dalek(
        &self,
        message: &[u8],
        signature: &ProductionPairwiseSignature,
    ) -> bool {
        let Ok(public_bytes) = <[u8; ED25519_KEY_SIZE]>::try_from(self.bytes.as_slice()) else {
            return false;
        };
        let Ok(signature_bytes) =
            <[u8; ED25519_SIGNATURE_SIZE]>::try_from(signature.bytes.as_slice())
        else {
            return false;
        };
        let Ok(verifying_key) = VerifyingKey::from_bytes(&public_bytes) else {
            return false;
        };
        let signature = Ed25519Signature::from_bytes(&signature_bytes);
        verifying_key.verify_strict(message, &signature).is_ok()
    }
}

impl fmt::Debug for ProductionPairwisePublicKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProductionPairwisePublicKey")
            .field("algorithm", &self.algorithm.as_str())
            .field("length", &self.bytes.len())
            .finish()
    }
}

#[derive(Eq, PartialEq)]
pub struct ProductionPairwisePrivateKey {
    algorithm: ProductionKeyAlgorithm,
    bytes: Vec<u8>,
}

impl ProductionPairwisePrivateKey {
    pub fn from_bytes(
        algorithm: ProductionKeyAlgorithm,
        bytes: impl Into<Vec<u8>>,
    ) -> Result<Self, IdentityError> {
        let bytes = bytes.into();
        validate_production_key_material(&bytes)?;
        Ok(Self { algorithm, bytes })
    }

    pub fn algorithm(&self) -> ProductionKeyAlgorithm {
        self.algorithm
    }

    pub fn encrypted_storage_bytes(&self) -> &[u8] {
        &self.bytes
    }

    pub fn from_ed25519_dalek_seed(seed: [u8; ED25519_KEY_SIZE]) -> Result<Self, IdentityError> {
        Self::from_bytes(ProductionKeyAlgorithm::Ed25519DalekV2, seed)
    }

    pub fn generate_ed25519_dalek() -> Result<Self, IdentityError> {
        let mut seed = [0_u8; ED25519_KEY_SIZE];
        getrandom::fill(&mut seed).map_err(|_| IdentityError::RandomnessUnavailable)?;
        Self::from_ed25519_dalek_seed(seed)
    }

    pub fn public_key(&self) -> Result<ProductionPairwisePublicKey, IdentityError> {
        match self.algorithm {
            ProductionKeyAlgorithm::Ed25519DalekV2 => {
                let signing_key = self.ed25519_dalek_signing_key()?;
                ProductionPairwisePublicKey::from_bytes(
                    ProductionKeyAlgorithm::Ed25519DalekV2,
                    signing_key.verifying_key().to_bytes(),
                )
            }
            ProductionKeyAlgorithm::PendingReview => Err(IdentityError::InvalidKeyMaterial),
        }
    }

    pub fn sign_pairing_payload(
        &self,
        message: &[u8],
    ) -> Result<ProductionPairwiseSignature, IdentityError> {
        match self.algorithm {
            ProductionKeyAlgorithm::Ed25519DalekV2 => {
                let signing_key = self.ed25519_dalek_signing_key()?;
                let signature = signing_key.sign(message);
                ProductionPairwiseSignature::from_bytes(
                    ProductionKeyAlgorithm::Ed25519DalekV2,
                    signature.to_bytes(),
                )
            }
            ProductionKeyAlgorithm::PendingReview => Err(IdentityError::InvalidKeyMaterial),
        }
    }

    fn ed25519_dalek_signing_key(&self) -> Result<SigningKey, IdentityError> {
        let seed = <[u8; ED25519_KEY_SIZE]>::try_from(self.bytes.as_slice())
            .map_err(|_| IdentityError::InvalidKeyMaterial)?;
        Ok(SigningKey::from_bytes(&seed))
    }
}

impl fmt::Debug for ProductionPairwisePrivateKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProductionPairwisePrivateKey")
            .field("algorithm", &self.algorithm.as_str())
            .field("length", &self.bytes.len())
            .field("secret", &"[redacted]")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct ProductionPairwiseSignature {
    algorithm: ProductionKeyAlgorithm,
    bytes: Vec<u8>,
}

impl ProductionPairwiseSignature {
    pub fn from_bytes(
        algorithm: ProductionKeyAlgorithm,
        bytes: impl Into<Vec<u8>>,
    ) -> Result<Self, IdentityError> {
        let bytes = bytes.into();
        validate_production_key_material(&bytes)?;
        Ok(Self { algorithm, bytes })
    }

    pub fn algorithm(&self) -> ProductionKeyAlgorithm {
        self.algorithm
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.bytes
    }

    pub fn from_ed25519_dalek_bytes(
        bytes: [u8; ED25519_SIGNATURE_SIZE],
    ) -> Result<Self, IdentityError> {
        Self::from_bytes(ProductionKeyAlgorithm::Ed25519DalekV2, bytes)
    }

    pub fn to_pairwise_signature(&self) -> Result<PairwiseSignature, IdentityError> {
        match self.algorithm {
            ProductionKeyAlgorithm::Ed25519DalekV2 => {
                let signature_bytes =
                    <[u8; ED25519_SIGNATURE_SIZE]>::try_from(self.bytes.as_slice())
                        .map_err(|_| IdentityError::InvalidKeyMaterial)?;
                PairwiseSignature::new(format!(
                    "{ED25519_DALEK_V2_SIGNATURE_PREFIX}{}",
                    encode_hex(&signature_bytes)
                ))
            }
            ProductionKeyAlgorithm::PendingReview => Err(IdentityError::InvalidKeyMaterial),
        }
    }

    pub fn from_pairwise_signature(value: &PairwiseSignature) -> Result<Self, IdentityError> {
        match value.scheme()? {
            PairwiseSignatureScheme::Ed25519DalekV2 => {
                let encoded = value
                    .as_str()
                    .strip_prefix(ED25519_DALEK_V2_SIGNATURE_PREFIX)
                    .ok_or(IdentityError::InvalidKeyMaterial)?;
                let bytes = decode_hex_array::<ED25519_SIGNATURE_SIZE>(encoded)?;
                Self::from_ed25519_dalek_bytes(bytes)
            }
            PairwiseSignatureScheme::DevInsecureV1 => Err(IdentityError::InvalidKeyMaterial),
        }
    }
}

impl fmt::Debug for ProductionPairwiseSignature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProductionPairwiseSignature")
            .field("algorithm", &self.algorithm.as_str())
            .field("length", &self.bytes.len())
            .finish()
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PairwiseIdentity {
    public_key: PairwisePublicKey,
    private_key: PairwisePrivateKey,
}

impl PairwiseIdentity {
    pub fn new(
        public_key: PairwisePublicKey,
        private_key: PairwisePrivateKey,
    ) -> Result<Self, IdentityError> {
        if !private_key.as_str().ends_with(
            public_key
                .as_str()
                .strip_prefix("dev-pub-")
                .unwrap_or(public_key.as_str()),
        ) {
            return Err(IdentityError::InvalidKeyMaterial);
        }
        Ok(Self {
            public_key,
            private_key,
        })
    }

    pub fn public_key(&self) -> &PairwisePublicKey {
        &self.public_key
    }

    pub fn private_key(&self) -> &PairwisePrivateKey {
        &self.private_key
    }

    pub fn sign_pairing_payload(&self, message: &[u8]) -> PairwiseSignature {
        PairwiseSignature(dev_pairing_signature(
            self.public_key.as_str(),
            self.private_key.as_str(),
            message,
        ))
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum IdentityError {
    InvalidProfileName,
    InvalidContactId,
    InvalidKeyMaterial,
    RandomnessUnavailable,
}

fn validate_production_key_material(bytes: &[u8]) -> Result<(), IdentityError> {
    if bytes.is_empty() || bytes.len() > MAX_PRODUCTION_KEY_MATERIAL_SIZE {
        return Err(IdentityError::InvalidKeyMaterial);
    }
    for dev_prefix in [
        b"dev-pub-" as &[u8],
        b"dev-priv-" as &[u8],
        b"dev-sign-v1-" as &[u8],
    ] {
        if bytes.starts_with(dev_prefix) {
            return Err(IdentityError::InvalidKeyMaterial);
        }
    }
    Ok(())
}

fn private_for_public(public_key: &str) -> String {
    if let Some(seed) = public_key.strip_prefix("dev-pub-") {
        format!("dev-priv-{seed}")
    } else {
        format!("dev-priv-for-{public_key}")
    }
}

fn dev_pairing_signature(public_key: &str, private_key: &str, message: &[u8]) -> String {
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in b"AD-PAIRING-SIGNATURE-V1" {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    for byte in public_key
        .as_bytes()
        .iter()
        .chain(private_key.as_bytes())
        .chain(message)
    {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{DEV_SIGNATURE_PREFIX}{hash:016x}")
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

fn decode_hex_array<const N: usize>(value: &str) -> Result<[u8; N], IdentityError> {
    if value.len() != N * 2 {
        return Err(IdentityError::InvalidKeyMaterial);
    }
    let mut out = [0_u8; N];
    for (index, chunk) in value.as_bytes().chunks(2).enumerate() {
        let high = hex_value(chunk[0])?;
        let low = hex_value(chunk[1])?;
        out[index] = (high << 4) | low;
    }
    Ok(out)
}

fn hex_value(byte: u8) -> Result<u8, IdentityError> {
    match byte {
        b'0'..=b'9' => Ok(byte - b'0'),
        b'a'..=b'f' => Ok(byte - b'a' + 10),
        b'A'..=b'F' => Ok(byte - b'A' + 10),
        _ => Err(IdentityError::InvalidKeyMaterial),
    }
}

#[cfg(feature = "dev-insecure")]
pub fn generate_dev_pairwise_identity(label: &str) -> PairwiseIdentity {
    let seed = dev_seed(label);
    PairwiseIdentity {
        public_key: PairwisePublicKey(format!("dev-pub-{seed}")),
        private_key: PairwisePrivateKey(format!("dev-priv-{seed}")),
    }
}

#[cfg(feature = "dev-insecure")]
fn dev_seed(label: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!(
        "{:x}-{:x}",
        std::process::id(),
        dev_hash(&format!("{label}-{nanos}"))
    )
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pairwise_identity_signs_and_verifies_pairing_payload_bytes() {
        let identity = PairwiseIdentity::new(
            PairwisePublicKey::new("dev-pub-test-seed").expect("valid public key"),
            PairwisePrivateKey::new("dev-priv-test-seed").expect("valid private key"),
        )
        .expect("valid identity");
        let message = b"canonical pairing payload";
        let signature = identity.sign_pairing_payload(message);

        assert!(identity
            .public_key()
            .verify_pairing_signature(message, &signature));
        assert_eq!(
            identity.public_key().scheme(),
            Ok(PairwisePublicKeyScheme::DevInsecureV1)
        );
        assert_eq!(
            signature.scheme(),
            Ok(PairwiseSignatureScheme::DevInsecureV1)
        );
        assert!(!identity
            .public_key()
            .verify_pairing_signature(b"changed payload", &signature));
    }

    #[test]
    fn unknown_pairwise_signature_scheme_is_rejected_by_classifier() {
        let signature = PairwiseSignature::new("unsigned-test-signature").expect("signature");

        assert_eq!(signature.scheme(), Err(IdentityError::InvalidKeyMaterial));
    }

    #[test]
    fn unknown_pairwise_public_key_scheme_is_rejected_by_classifier() {
        let public_key = PairwisePublicKey::new("unsigned-test-key").expect("public key");

        assert_eq!(public_key.scheme(), Err(IdentityError::InvalidKeyMaterial));
    }

    #[test]
    fn production_key_wrappers_reject_dev_placeholder_material() {
        for bytes in [
            b"dev-pub-test-seed" as &[u8],
            b"dev-priv-test-seed" as &[u8],
            b"dev-sign-v1-0000000000000000" as &[u8],
        ] {
            assert_eq!(
                ProductionPairwisePublicKey::from_bytes(
                    ProductionKeyAlgorithm::PendingReview,
                    bytes
                ),
                Err(IdentityError::InvalidKeyMaterial)
            );
            assert_eq!(
                ProductionPairwisePrivateKey::from_bytes(
                    ProductionKeyAlgorithm::PendingReview,
                    bytes
                ),
                Err(IdentityError::InvalidKeyMaterial)
            );
            assert_eq!(
                ProductionPairwiseSignature::from_bytes(
                    ProductionKeyAlgorithm::PendingReview,
                    bytes
                ),
                Err(IdentityError::InvalidKeyMaterial)
            );
        }
    }

    #[test]
    fn production_private_key_debug_does_not_print_secret_bytes() {
        let private_key = ProductionPairwisePrivateKey::from_bytes(
            ProductionKeyAlgorithm::PendingReview,
            b"not-dev-secret-test-vector".to_vec(),
        )
        .expect("valid production key wrapper");
        let debug = format!("{private_key:?}");

        assert!(debug.contains("ProductionPairwisePrivateKey"));
        assert!(debug.contains("[redacted]"));
        assert!(!debug.contains("not-dev-secret-test-vector"));
    }

    #[test]
    fn production_public_key_and_signature_keep_algorithm_and_bytes() {
        let public_key = ProductionPairwisePublicKey::from_bytes(
            ProductionKeyAlgorithm::PendingReview,
            b"public-test-vector".to_vec(),
        )
        .expect("valid production public key wrapper");
        let signature = ProductionPairwiseSignature::from_bytes(
            ProductionKeyAlgorithm::PendingReview,
            b"signature-test-vector".to_vec(),
        )
        .expect("valid production signature wrapper");

        assert_eq!(
            public_key.algorithm(),
            ProductionKeyAlgorithm::PendingReview
        );
        assert_eq!(public_key.as_bytes(), b"public-test-vector");
        assert_eq!(signature.algorithm(), ProductionKeyAlgorithm::PendingReview);
        assert_eq!(signature.as_bytes(), b"signature-test-vector");
    }

    #[test]
    fn ed25519_dalek_signature_matches_rfc8032_test_vector() {
        let seed = hex_32("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60");
        let expected_public =
            hex_32("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a");
        let expected_signature = hex_64(
            "e5564300c360ac729086e2cc806e828a\
             84877f1eb8e5d974d873e06522490155\
             5fb8821590a33bacc61e39701cf9b46b\
             d25bf5f0595bbe24655141438e7a100b",
        );

        let private_key =
            ProductionPairwisePrivateKey::from_ed25519_dalek_seed(seed).expect("valid seed");
        let public_key = private_key.public_key().expect("public key");
        let signature = private_key
            .sign_pairing_payload(b"")
            .expect("signature should build");

        assert_eq!(
            private_key.algorithm(),
            ProductionKeyAlgorithm::Ed25519DalekV2
        );
        assert_eq!(
            public_key.algorithm(),
            ProductionKeyAlgorithm::Ed25519DalekV2
        );
        assert_eq!(public_key.as_bytes(), expected_public);
        assert_eq!(
            signature.algorithm(),
            ProductionKeyAlgorithm::Ed25519DalekV2
        );
        assert_eq!(signature.as_bytes(), expected_signature);
        assert!(public_key.verify_pairing_signature(b"", &signature));
    }

    #[test]
    fn generate_ed25519_dalek_private_key_uses_os_randomness_boundary() {
        let first =
            ProductionPairwisePrivateKey::generate_ed25519_dalek().expect("generated private key");
        let second =
            ProductionPairwisePrivateKey::generate_ed25519_dalek().expect("generated private key");

        assert_eq!(first.algorithm(), ProductionKeyAlgorithm::Ed25519DalekV2);
        assert_eq!(second.algorithm(), ProductionKeyAlgorithm::Ed25519DalekV2);
        assert_ne!(first, second);

        let first_public = first.public_key().expect("first public key");
        let first_signature = first
            .sign_pairing_payload(b"canonical pairing payload")
            .expect("signature");
        assert!(
            first_public.verify_pairing_signature(b"canonical pairing payload", &first_signature)
        );
    }

    #[test]
    fn ed25519_dalek_pairwise_signature_encoding_is_scheme_tagged() {
        let private_key =
            ProductionPairwisePrivateKey::from_ed25519_dalek_seed([11_u8; 32]).expect("valid seed");
        let production_signature = private_key
            .sign_pairing_payload(b"canonical pairing payload")
            .expect("signature should build");

        let pairwise_signature = production_signature
            .to_pairwise_signature()
            .expect("pairwise signature");
        let decoded = ProductionPairwiseSignature::from_pairwise_signature(&pairwise_signature)
            .expect("production signature");

        assert_eq!(
            pairwise_signature.scheme(),
            Ok(PairwiseSignatureScheme::Ed25519DalekV2)
        );
        assert!(pairwise_signature.as_str().starts_with("ed25519-dalek-v2:"));
        assert_eq!(decoded, production_signature);
    }

    #[test]
    fn ed25519_dalek_pairwise_public_key_encoding_is_scheme_tagged() {
        let private_key =
            ProductionPairwisePrivateKey::from_ed25519_dalek_seed([13_u8; 32]).expect("valid seed");
        let production_public_key = private_key.public_key().expect("public key");

        let pairwise_public_key = production_public_key
            .to_pairwise_public_key()
            .expect("pairwise public key");
        let decoded = ProductionPairwisePublicKey::from_pairwise_public_key(&pairwise_public_key)
            .expect("production public key");

        assert_eq!(
            pairwise_public_key.scheme(),
            Ok(PairwisePublicKeyScheme::Ed25519DalekV2)
        );
        assert!(pairwise_public_key
            .as_str()
            .starts_with("ed25519-dalek-v2:"));
        assert_eq!(decoded, production_public_key);
    }

    #[test]
    fn production_public_key_decoder_rejects_dev_public_key_scheme() {
        let dev_public_key =
            PairwisePublicKey::new("dev-pub-test-seed").expect("valid dev public key string");

        assert_eq!(
            ProductionPairwisePublicKey::from_pairwise_public_key(&dev_public_key),
            Err(IdentityError::InvalidKeyMaterial)
        );
    }

    #[test]
    fn production_public_key_decoder_rejects_malformed_ed25519_hex() {
        let malformed = PairwisePublicKey::new("ed25519-dalek-v2:not-hex").expect("public key");

        assert_eq!(
            ProductionPairwisePublicKey::from_pairwise_public_key(&malformed),
            Err(IdentityError::InvalidKeyMaterial)
        );
    }

    #[test]
    fn production_signature_decoder_rejects_dev_signature_scheme() {
        let dev_signature = PairwiseSignature::new("dev-sign-v1-0000000000000000")
            .expect("valid dev signature string");

        assert_eq!(
            ProductionPairwiseSignature::from_pairwise_signature(&dev_signature),
            Err(IdentityError::InvalidKeyMaterial)
        );
    }

    #[test]
    fn production_signature_decoder_rejects_malformed_ed25519_hex() {
        let malformed =
            PairwiseSignature::new("ed25519-dalek-v2:not-hex").expect("signature string");

        assert_eq!(
            ProductionPairwiseSignature::from_pairwise_signature(&malformed),
            Err(IdentityError::InvalidKeyMaterial)
        );
    }

    #[test]
    fn ed25519_dalek_signature_rejects_tampering_and_wrong_key() {
        let private_key =
            ProductionPairwisePrivateKey::from_ed25519_dalek_seed([7_u8; 32]).expect("valid seed");
        let wrong_private_key =
            ProductionPairwisePrivateKey::from_ed25519_dalek_seed([9_u8; 32]).expect("valid seed");
        let public_key = private_key.public_key().expect("public key");
        let wrong_public_key = wrong_private_key.public_key().expect("public key");
        let signature = private_key
            .sign_pairing_payload(b"canonical pairing payload")
            .expect("signature should build");

        assert!(public_key.verify_pairing_signature(b"canonical pairing payload", &signature));
        assert!(!public_key.verify_pairing_signature(b"changed payload", &signature));
        assert!(
            !wrong_public_key.verify_pairing_signature(b"canonical pairing payload", &signature)
        );
    }

    #[test]
    fn ed25519_dalek_wrong_length_public_key_does_not_verify() {
        let private_key =
            ProductionPairwisePrivateKey::from_ed25519_dalek_seed([3_u8; 32]).expect("valid seed");
        let signature = private_key
            .sign_pairing_payload(b"canonical pairing payload")
            .expect("signature should build");
        let malformed_public_key = ProductionPairwisePublicKey::from_bytes(
            ProductionKeyAlgorithm::Ed25519DalekV2,
            [1_u8; 31],
        )
        .expect("byte wrapper accepts deferred algorithm validation");

        assert!(!malformed_public_key
            .verify_pairing_signature(b"canonical pairing payload", &signature));
    }

    fn hex_32(value: &str) -> [u8; 32] {
        hex_array(value)
    }

    fn hex_64(value: &str) -> [u8; 64] {
        hex_array(value)
    }

    fn hex_array<const N: usize>(value: &str) -> [u8; N] {
        let value = value.replace(char::is_whitespace, "");
        assert_eq!(value.len(), N * 2);
        let mut out = [0_u8; N];
        for (index, chunk) in value.as_bytes().chunks(2).enumerate() {
            out[index] = (hex_value(chunk[0]) << 4) | hex_value(chunk[1]);
        }
        out
    }

    fn hex_value(byte: u8) -> u8 {
        match byte {
            b'0'..=b'9' => byte - b'0',
            b'a'..=b'f' => byte - b'a' + 10,
            b'A'..=b'F' => byte - b'A' + 10,
            _ => panic!("invalid hex byte"),
        }
    }
}
