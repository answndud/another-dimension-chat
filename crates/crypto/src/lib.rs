use another_dimension_protocol::ProtocolError;
#[cfg(feature = "dev-insecure")]
use another_dimension_protocol::{pad_to_bucket, trim_padding};
use sha2::{Digest, Sha256};

pub trait CryptoSession {
    fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, CryptoError>;
    fn decrypt(&self, padded_ciphertext: &[u8]) -> Result<String, CryptoError>;
    fn derive_safety_material(&self, transcript: &str) -> SafetyMaterial;
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SafetyMaterial {
    pub number: String,
    pub phrase: String,
}

pub fn derive_production_safety_material(transcript: &str) -> SafetyMaterial {
    let number_digest = safety_digest(b"AD-SAFETY-NUMBER-V1", transcript);
    let phrase_digest = safety_digest(b"AD-SAFETY-PHRASE-V1", transcript);
    SafetyMaterial {
        number: format_safety_number(&number_digest),
        phrase: format_safety_phrase(&phrase_digest),
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum CryptoError {
    Protocol(ProtocolError),
    InvalidUtf8,
}

impl From<ProtocolError> for CryptoError {
    fn from(value: ProtocolError) -> Self {
        Self::Protocol(value)
    }
}

fn safety_digest(domain: &[u8], transcript: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(domain);
    hasher.update([0]);
    hasher.update(transcript.as_bytes());
    hasher.finalize().into()
}

fn format_safety_number(digest: &[u8; 32]) -> String {
    (0..6)
        .map(|index| {
            let offset = index * 2;
            let value = u16::from_be_bytes([digest[offset], digest[offset + 1]]);
            format!("{value:05}")
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn format_safety_phrase(digest: &[u8; 32]) -> String {
    format!(
        "sha256-{}-{}-{}-{}",
        encode_hex(&digest[0..2]),
        encode_hex(&digest[2..4]),
        encode_hex(&digest[4..6]),
        encode_hex(&digest[6..8])
    )
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

#[cfg(test)]
mod tests {
    use super::*;

    const TRANSCRIPT: &str = "ADPAIR-SAFETY-V1|alice|bob";

    #[test]
    fn production_safety_material_has_stable_test_vector() {
        let material = derive_production_safety_material(TRANSCRIPT);

        assert_eq!(material.number, "30813 31152 51308 44413 05368 46650");
        assert_eq!(material.phrase, "sha256-930a-9b54-3f03-4968");
    }

    #[test]
    fn production_safety_material_changes_with_transcript() {
        let original = derive_production_safety_material(TRANSCRIPT);
        let changed = derive_production_safety_material("ADPAIR-SAFETY-V1|alice|changed-bob");

        assert_ne!(original, changed);
    }
}

#[cfg(feature = "dev-insecure")]
pub mod dev_insecure {
    use super::*;

    pub const WARNING: &str = "WARNING: dev-insecure build. Not for real communication.";

    #[derive(Clone, Debug, Default)]
    pub struct FakeCryptoSession;

    impl CryptoSession for FakeCryptoSession {
        fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, CryptoError> {
            let transformed = plaintext
                .as_bytes()
                .iter()
                .rev()
                .map(|byte| byte ^ 0xaa)
                .collect::<Vec<_>>();
            pad_to_bucket(&transformed).map_err(CryptoError::from)
        }

        fn decrypt(&self, padded_ciphertext: &[u8]) -> Result<String, CryptoError> {
            let trimmed = trim_padding(padded_ciphertext);
            let bytes = trimmed
                .iter()
                .rev()
                .map(|byte| byte ^ 0xaa)
                .collect::<Vec<_>>();
            String::from_utf8(bytes).map_err(|_| CryptoError::InvalidUtf8)
        }

        fn derive_safety_material(&self, transcript: &str) -> SafetyMaterial {
            let first = dev_hash(&format!("safety-number:{transcript}"));
            let second = dev_hash(&format!("safety-phrase:{transcript}"));
            SafetyMaterial {
                number: format!(
                    "{:03} {:03} {:03} {:03}",
                    first % 1000,
                    (first / 1000) % 1000,
                    second % 1000,
                    (second / 1000) % 1000
                ),
                phrase: phrase(second),
            }
        }
    }

    fn phrase(seed: u64) -> String {
        const WORDS: &[&str] = &[
            "river", "copper", "lantern", "stone", "violet", "orbit", "cedar", "signal", "harbor",
            "ember", "north", "silver",
        ];
        let a = WORDS[(seed as usize) % WORDS.len()];
        let b = WORDS[((seed / 17) as usize) % WORDS.len()];
        let c = WORDS[((seed / 31) as usize) % WORDS.len()];
        format!("{a}-{b}-{c}")
    }

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
        fn safety_material_has_stable_test_vector() {
            let transcript = "ADPAIR-SAFETY-V1|414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310003626f620009626f622d6e6f6e63650007626f622d7075620009626f622e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000007d00000000000000258|414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310005616c696365000b616c6963652d6e6f6e63650009616c6963652d707562000b616c6963652e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000003e80000000000000258";
            let material = FakeCryptoSession.derive_safety_material(transcript);

            assert_eq!(material.number, "992 693 768 463");
            assert_eq!(material.phrase, "river-ember-ember");
        }
    }
}
