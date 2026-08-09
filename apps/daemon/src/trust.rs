use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use sha2::{Digest, Sha256};
use std::{fs, path::Path};

const MAX_MANIFEST_BYTES: usize = 64 * 1024;
const MAX_TRUST_KEYS: usize = 256;

#[derive(Debug)]
pub enum TrustError {
    Io,
    Invalid,
}

/// A SHA-256 digest of the DER-encoded peer certificate. This is deliberately
/// parsed as an explicit value instead of accepting an arbitrary URL fragment
/// or silently falling back to a CA-only connection.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TlsCertificatePin(pub [u8; 32]);

impl TlsCertificatePin {
    pub fn parse(value: &str) -> Result<Self, TrustError> {
        let value = value
            .strip_prefix("sha256:")
            .or_else(|| value.strip_prefix("sha256/"))
            .ok_or(TrustError::Invalid)?;
        let bytes = decode(value, 32).ok_or(TrustError::Invalid)?;
        Ok(Self(bytes.try_into().map_err(|_| TrustError::Invalid)?))
    }

    pub const fn as_bytes(self) -> [u8; 32] {
        self.0
    }

    pub fn as_text(self) -> String {
        format!(
            "sha256:{}",
            self.0
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect::<String>()
        )
    }
}

pub fn relay_tls_pin_record_key(origin: &str) -> String {
    format!("relay-tls-pin/{origin}")
}

pub struct RelayTrust {
    allowed_key_ids: Vec<String>,
    revoked_key_ids: Vec<String>,
}

fn hex(input: &[u8]) -> String {
    input.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn decode(value: &str, expected: usize) -> Option<Vec<u8>> {
    if value.len() != expected * 2 || !value.as_bytes().iter().all(u8::is_ascii_hexdigit) {
        return None;
    }
    (0..value.len())
        .step_by(2)
        .map(|index| u8::from_str_radix(&value[index..index + 2], 16).ok())
        .collect()
}

fn field<'a>(lines: &mut impl Iterator<Item = &'a str>, name: &str) -> Option<String> {
    let value = lines.next()?;
    Some(value.strip_prefix(name)?.strip_suffix('\n')?.to_owned())
}

impl RelayTrust {
    /// Signed, line-oriented manifest. The signed payload is deliberately opaque to the
    /// transport: fixed field order prevents parser ambiguity and avoids another runtime.
    ///
    /// ADRELAYTRUST1
    /// bootstrap=<32-byte hex>
    /// key=<64-byte key-id hex>,<32-byte public-key hex> (one or more)
    /// revoked=<64-byte key-id hex> (zero or more)
    /// payload-end
    /// signature=<64-byte hex over bytes from bootstrap= through payload-end\n>
    pub fn from_manifest(
        path: &Path,
        expected_bootstrap_key: [u8; 32],
    ) -> Result<Self, TrustError> {
        let raw = fs::read_to_string(path).map_err(|_| TrustError::Io)?;
        if raw.len() > MAX_MANIFEST_BYTES {
            return Err(TrustError::Invalid);
        }
        let mut lines = raw.split_inclusive('\n');
        if lines.next() != Some("ADRELAYTRUST1\n") {
            return Err(TrustError::Invalid);
        }
        let bootstrap = field(&mut lines, "bootstrap=").ok_or(TrustError::Invalid)?;
        if bootstrap != hex(&expected_bootstrap_key) {
            return Err(TrustError::Invalid);
        }

        let mut payload = String::new();
        payload.push_str(&format!("bootstrap={bootstrap}\n"));
        let mut allowed_key_ids = Vec::new();
        let mut revoked_key_ids = Vec::new();
        let mut saw_end = false;
        for line in &mut lines {
            payload.push_str(line);
            let trimmed = line.strip_suffix('\n').ok_or(TrustError::Invalid)?;
            if trimmed == "payload-end" {
                saw_end = true;
                break;
            }
            if let Some(value) = trimmed.strip_prefix("key=") {
                let (key_id, public_key) = value.split_once(',').ok_or(TrustError::Invalid)?;
                if decode(key_id, 32).is_none() || decode(public_key, 32).is_none() {
                    return Err(TrustError::Invalid);
                }
                let public_key_bytes = decode(public_key, 32).ok_or(TrustError::Invalid)?;
                if hex(&Sha256::digest(&public_key_bytes)) != key_id
                    || allowed_key_ids.iter().any(|id| id == key_id)
                {
                    return Err(TrustError::Invalid);
                }
                if allowed_key_ids.len() >= MAX_TRUST_KEYS {
                    return Err(TrustError::Invalid);
                }
                allowed_key_ids.push(key_id.to_owned());
            } else if let Some(key_id) = trimmed.strip_prefix("revoked=") {
                if decode(key_id, 32).is_none() {
                    return Err(TrustError::Invalid);
                }
                revoked_key_ids.push(key_id.to_owned());
            } else if trimmed != "payload-end" {
                return Err(TrustError::Invalid);
            }
        }
        if !saw_end || allowed_key_ids.is_empty() {
            return Err(TrustError::Invalid);
        }
        let signature_line = lines.next().ok_or(TrustError::Invalid)?;
        let signature = signature_line
            .strip_prefix("signature=")
            .and_then(|value| value.strip_suffix('\n'))
            .ok_or(TrustError::Invalid)?;
        if lines.next().is_some() || decode(signature, 64).is_none() {
            return Err(TrustError::Invalid);
        }
        let signature_bytes: [u8; 64] = decode(signature, 64)
            .ok_or(TrustError::Invalid)?
            .try_into()
            .map_err(|_| TrustError::Invalid)?;
        let bootstrap_key =
            VerifyingKey::from_bytes(&expected_bootstrap_key).map_err(|_| TrustError::Invalid)?;
        bootstrap_key
            .verify(payload.as_bytes(), &Signature::from_bytes(&signature_bytes))
            .map_err(|_| TrustError::Invalid)?;
        if revoked_key_ids
            .iter()
            .any(|id| !allowed_key_ids.iter().any(|allowed| allowed == id))
        {
            return Err(TrustError::Invalid);
        }
        Ok(Self {
            allowed_key_ids,
            revoked_key_ids,
        })
    }

    pub fn allows(&self, public_key: &[u8; 32]) -> bool {
        let key_id = hex(&Sha256::digest(public_key));
        self.allowed_key_ids.iter().any(|id| id == &key_id)
            && !self.revoked_key_ids.iter().any(|id| id == &key_id)
    }
}

#[cfg(test)]
mod tests {
    use super::{RelayTrust, TlsCertificatePin, TrustError};
    use ed25519_dalek::{Signer, SigningKey};
    use sha2::Digest;
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn hex(bytes: &[u8]) -> String {
        bytes.iter().map(|b| format!("{b:02x}")).collect()
    }

    #[test]
    fn signed_manifest_allows_only_non_revoked_keys() {
        let bootstrap = SigningKey::from_bytes(&[7; 32]);
        let relay = [9_u8; 32];
        let payload = format!(
            "bootstrap={}\nkey={},{}\npayload-end\n",
            hex(&bootstrap.verifying_key().to_bytes()),
            hex(&sha2::Sha256::digest(relay)),
            hex(&relay)
        );
        let raw = format!(
            "ADRELAYTRUST1\n{payload}signature={}\n",
            hex(&bootstrap.sign(payload.as_bytes()).to_bytes())
        );
        let path = std::env::temp_dir().join(format!(
            "another-dimension-trust-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::write(&path, raw).unwrap();
        let trust = RelayTrust::from_manifest(&path, bootstrap.verifying_key().to_bytes()).unwrap();
        assert!(trust.allows(&relay));
        assert!(!trust.allows(&[8; 32]));
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn tls_certificate_pin_requires_an_explicit_sha256_prefix() {
        let digest = "11".repeat(32);
        assert_eq!(
            TlsCertificatePin::parse(&format!("sha256:{digest}"))
                .unwrap()
                .as_bytes(),
            [0x11; 32]
        );
        assert!(matches!(
            TlsCertificatePin::parse(&digest),
            Err(TrustError::Invalid)
        ));
        assert!(matches!(
            TlsCertificatePin::parse("sha256:00"),
            Err(TrustError::Invalid)
        ));
    }
}
