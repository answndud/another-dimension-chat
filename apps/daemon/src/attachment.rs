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

/// The small object carried inside an MLS application message. Ciphertext is
/// deliberately omitted; it remains in the relay blob and only the nonce,
/// length, and file key travel through the authenticated conversation.
#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
pub struct AttachmentDescriptor {
    pub version: u8,
    pub blob_id: String,
    pub key: AttachmentKey,
    pub chunk_size: u32,
    pub original_size: u64,
    pub chunks: Vec<AttachmentChunkDescriptor>,
}

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
pub struct AttachmentChunkDescriptor {
    pub index: u32,
    pub nonce: String,
    pub ciphertext_size: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EncryptedAttachment {
    pub descriptor: AttachmentDescriptor,
    pub blob: Vec<u8>,
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

pub fn encrypt_for_blob(
    plaintext: &[u8],
    key: AttachmentKey,
    blob_id: &str,
) -> Result<EncryptedAttachment, AttachmentError> {
    if !valid_blob_id(blob_id) {
        return Err(AttachmentError::InvalidManifest);
    }
    let manifest = encrypt(plaintext, &key)?;
    let mut blob = Vec::new();
    let mut chunks = Vec::with_capacity(manifest.chunks.len());
    for chunk in &manifest.chunks {
        let ciphertext = decode_hex(&chunk.ciphertext).ok_or(AttachmentError::InvalidChunk)?;
        chunks.push(AttachmentChunkDescriptor {
            index: chunk.index,
            nonce: chunk.nonce.clone(),
            ciphertext_size: ciphertext.len() as u32,
        });
        blob.extend_from_slice(&ciphertext);
    }
    Ok(EncryptedAttachment {
        descriptor: AttachmentDescriptor {
            version: manifest.version,
            blob_id: blob_id.to_owned(),
            key,
            chunk_size: manifest.chunk_size,
            original_size: manifest.original_size,
            chunks,
        },
        blob,
    })
}

pub fn decrypt_blob(
    descriptor: &AttachmentDescriptor,
    blob: &[u8],
) -> Result<Vec<u8>, AttachmentError> {
    if !valid_blob_id(&descriptor.blob_id)
        || descriptor.version != ATTACHMENT_VERSION
        || descriptor.chunk_size as usize != CHUNK_SIZE
        || descriptor.original_size == 0
        || descriptor.original_size as usize > MAX_ATTACHMENT_BYTES
        || descriptor.chunks.is_empty()
        || descriptor.chunks.len() > MAX_ATTACHMENT_BYTES.div_ceil(CHUNK_SIZE)
    {
        return Err(AttachmentError::InvalidManifest);
    }
    let mut offset = 0usize;
    let mut chunks = Vec::with_capacity(descriptor.chunks.len());
    for (expected, chunk) in descriptor.chunks.iter().enumerate() {
        if chunk.index != expected as u32
            || chunk.ciphertext_size < 16
            || chunk.ciphertext_size as usize > CHUNK_SIZE + 16
            || offset.checked_add(chunk.ciphertext_size as usize).is_none()
        {
            return Err(AttachmentError::InvalidChunk);
        }
        let end = offset + chunk.ciphertext_size as usize;
        let ciphertext = blob.get(offset..end).ok_or(AttachmentError::InvalidChunk)?;
        chunks.push(AttachmentChunk {
            index: chunk.index,
            nonce: chunk.nonce.clone(),
            ciphertext: hex(ciphertext),
        });
        offset = end;
    }
    if offset != blob.len() {
        return Err(AttachmentError::InvalidManifest);
    }
    decrypt(
        &AttachmentManifest {
            version: descriptor.version,
            chunk_size: descriptor.chunk_size,
            original_size: descriptor.original_size,
            chunks,
        },
        &descriptor.key,
    )
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

fn valid_blob_id(value: &str) -> bool {
    (32..=128).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
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

    #[test]
    fn mls_descriptor_contains_key_and_nonce_but_not_blob_ciphertext() {
        let key = generate_key().unwrap();
        let package = encrypt_for_blob(b"secret attachment", key, &"b".repeat(32)).unwrap();
        let encoded = serde_json::to_string(&package.descriptor).unwrap();
        assert!(!encoded.contains("\"ciphertext\":"));
        assert_eq!(
            decrypt_blob(&package.descriptor, &package.blob).unwrap(),
            b"secret attachment"
        );
        assert_eq!(
            decrypt_blob(&package.descriptor, &package.blob[..3]),
            Err(AttachmentError::InvalidChunk)
        );
    }
}
