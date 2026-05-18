use another_dimension_protocol::ProtocolError;
#[cfg(feature = "dev-insecure")]
use another_dimension_protocol::{pad_to_bucket, trim_padding};

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
