use std::fmt;
#[cfg(feature = "dev-insecure")]
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_PRODUCTION_KEY_MATERIAL_SIZE: usize = 4096;

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

    pub fn verify_pairing_signature(&self, message: &[u8], signature: &PairwiseSignature) -> bool {
        signature.as_str()
            == dev_pairing_signature(self.as_str(), &private_for_public(self.as_str()), message)
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
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProductionKeyAlgorithm {
    PendingReview,
}

impl ProductionKeyAlgorithm {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::PendingReview => "pending-review",
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
    format!("dev-sign-v1-{hash:016x}")
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
        assert!(!identity
            .public_key()
            .verify_pairing_signature(b"changed payload", &signature));
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
}
