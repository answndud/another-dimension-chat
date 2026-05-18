use std::fmt;
#[cfg(feature = "dev-insecure")]
use std::time::{SystemTime, UNIX_EPOCH};

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
}
