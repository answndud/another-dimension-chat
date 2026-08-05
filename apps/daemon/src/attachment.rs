//! Daemon-owned chunked attachment encryption.
//!
//! The relay must receive only the serialized encrypted blob. The file key is
//! generated locally and is intended to travel inside the authenticated MLS
//! message, never as relay metadata.

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use getrandom::fill as secure_random;

pub const ATTACHMENT_VERSION: u8 = 1;
pub const CHUNK_SIZE: usize = 64 * 1024;
pub const MAX_ATTACHMENT_BYTES: usize = 32 * 1024 * 1024;

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
pub struct AttachmentKey(pub [u8; 32]);

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
pub struct AttachmentChunk {
    pub index: u32,
    pub nonce: String,
    pub ciphertext: String,
}

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
pub struct AttachmentManifest {
    pub version: u8,
    pub chunk_size: u32,
    pub original_size: u64,
    pub chunks: Vec<AttachmentChunk>,
}

#[derive(Debug, Eq, PartialEq)]
pub enum AttachmentError {
    Empty,
    TooLarge,
    InvalidKey,
    InvalidManifest,
    InvalidChunk,
    AuthenticationFailed,
    RandomnessUnavailable,
    Serialization,
}

pub fn generate_key() -> Result<AttachmentKey, AttachmentError> {
    let mut key = [0_u8; 32];
    secure_random(&mut key).map_err(|_| AttachmentError::RandomnessUnavailable)?;
    Ok(AttachmentKey(key))
}

pub fn encrypt(
    plaintext: &[u8],
    key: &AttachmentKey,
) -> Result<AttachmentManifest, AttachmentError> {
    if plaintext.is_empty() {
        return Err(AttachmentError::Empty);
    }
    if plaintext.len() > MAX_ATTACHMENT_BYTES {
        return Err(AttachmentError::TooLarge);
    }
    let cipher = Aes256Gcm::new_from_slice(&key.0).map_err(|_| AttachmentError::InvalidKey)?;
    let chunks = plaintext
        .chunks(CHUNK_SIZE)
        .enumerate()
        .map(|(index, chunk)| {
            let mut nonce = [0_u8; 12];
            secure_random(&mut nonce).map_err(|_| AttachmentError::RandomnessUnavailable)?;
            let aad = aad(index as u32, plaintext.len() as u64);
            let ciphertext = cipher
                .encrypt(
                    Nonce::from_slice(&nonce),
                    aes_gcm::aead::Payload {
                        msg: chunk,
                        aad: &aad,
                    },
                )
                .map_err(|_| AttachmentError::AuthenticationFailed)?;
            Ok(AttachmentChunk {
                index: index as u32,
                nonce: hex(&nonce),
                ciphertext: hex(&ciphertext),
            })
        })
        .collect::<Result<Vec<_>, AttachmentError>>()?;
    Ok(AttachmentManifest {
        version: ATTACHMENT_VERSION,
        chunk_size: CHUNK_SIZE as u32,
        original_size: plaintext.len() as u64,
        chunks,
    })
}

pub fn decrypt(
    manifest: &AttachmentManifest,
    key: &AttachmentKey,
) -> Result<Vec<u8>, AttachmentError> {
    if manifest.version != ATTACHMENT_VERSION
        || manifest.chunk_size as usize != CHUNK_SIZE
        || manifest.original_size == 0
        || manifest.original_size as usize > MAX_ATTACHMENT_BYTES
        || manifest.chunks.is_empty()
    {
        return Err(AttachmentError::InvalidManifest);
    }
    if manifest.chunks.len() > MAX_ATTACHMENT_BYTES.div_ceil(CHUNK_SIZE) {
        return Err(AttachmentError::TooLarge);
    }
    let cipher = Aes256Gcm::new_from_slice(&key.0).map_err(|_| AttachmentError::InvalidKey)?;
    let mut plaintext = Vec::with_capacity(manifest.original_size as usize);
    for (expected, chunk) in manifest.chunks.iter().enumerate() {
        if chunk.index != expected as u32 {
            return Err(AttachmentError::InvalidChunk);
        }
        let nonce = decode_hex(&chunk.nonce).ok_or(AttachmentError::InvalidChunk)?;
        let ciphertext = decode_hex(&chunk.ciphertext).ok_or(AttachmentError::InvalidChunk)?;
        if nonce.len() != 12 || ciphertext.len() < 16 || ciphertext.len() > CHUNK_SIZE + 16 {
            return Err(AttachmentError::InvalidChunk);
        }
        let aad = aad(chunk.index, manifest.original_size);
        let chunk_plaintext = cipher
            .decrypt(
                Nonce::from_slice(&nonce),
                aes_gcm::aead::Payload {
                    msg: &ciphertext,
                    aad: &aad,
                },
            )
            .map_err(|_| AttachmentError::AuthenticationFailed)?;
        if chunk_plaintext.len() > CHUNK_SIZE
            || (expected + 1 < manifest.chunks.len() && chunk_plaintext.len() != CHUNK_SIZE)
        {
            return Err(AttachmentError::InvalidChunk);
        }
        plaintext.extend_from_slice(&chunk_plaintext);
    }
    if plaintext.len() != manifest.original_size as usize {
        return Err(AttachmentError::InvalidManifest);
    }
    Ok(plaintext)
}

pub fn serialize(manifest: &AttachmentManifest) -> Result<String, AttachmentError> {
    serde_json::to_string(manifest).map_err(|_| AttachmentError::Serialization)
}

pub fn deserialize(value: &str) -> Result<AttachmentManifest, AttachmentError> {
    serde_json::from_str(value).map_err(|_| AttachmentError::InvalidManifest)
}

fn aad(index: u32, original_size: u64) -> Vec<u8> {
    let mut value = b"another-dimension/attachment/v1".to_vec();
    value.extend_from_slice(&index.to_be_bytes());
    value.extend_from_slice(&original_size.to_be_bytes());
    value
}

fn hex(value: &[u8]) -> String {
    value.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn decode_hex(value: &str) -> Option<Vec<u8>> {
    if value.is_empty()
        || value.len() % 2 != 0
        || !value.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return None;
    }
    (0..value.len())
        .step_by(2)
        .map(|index| u8::from_str_radix(&value[index..index + 2], 16).ok())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chunked_attachment_round_trips_and_binds_order_and_size() {
        let key = generate_key().unwrap();
        let plaintext = vec![7_u8; CHUNK_SIZE + 19];
        let manifest = encrypt(&plaintext, &key).unwrap();
        assert_eq!(decrypt(&manifest, &key).unwrap(), plaintext);
        assert_eq!(manifest.chunks.len(), 2);
        assert_eq!(
            deserialize(&serialize(&manifest).unwrap()).unwrap(),
            manifest
        );
    }

    #[test]
    fn attachment_rejects_empty_oversized_tampered_and_reordered_data() {
        let key = generate_key().unwrap();
        assert_eq!(encrypt(&[], &key), Err(AttachmentError::Empty));
        assert_eq!(
            encrypt(&vec![0_u8; MAX_ATTACHMENT_BYTES + 1], &key),
            Err(AttachmentError::TooLarge)
        );
        let mut manifest = encrypt(b"secret", &key).unwrap();
        manifest.chunks[0].ciphertext.replace_range(0..2, "ff");
        assert_eq!(
            decrypt(&manifest, &key),
            Err(AttachmentError::AuthenticationFailed)
        );
        let mut reordered = encrypt(&vec![3_u8; CHUNK_SIZE * 2], &key).unwrap();
        reordered.chunks.swap(0, 1);
        assert_eq!(
            decrypt(&reordered, &key),
            Err(AttachmentError::InvalidChunk)
        );
    }
}
