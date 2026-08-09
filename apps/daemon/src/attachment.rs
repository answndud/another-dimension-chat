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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_type: Option<String>,
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

/// In-memory daemon job for streaming plaintext chunks from the local UI.
/// Restarting or locking the daemon drops the job; no plaintext is persisted.
#[derive(Debug)]
pub struct AttachmentJob {
    blob_id: String,
    key: AttachmentKey,
    total: usize,
    next_index: u32,
    received: usize,
    chunks: Vec<AttachmentChunkDescriptor>,
    blob: Vec<u8>,
    file_name: Option<String>,
    media_type: Option<String>,
}

impl AttachmentJob {
    pub fn start(blob_id: &str, total: usize) -> Result<Self, AttachmentError> {
        Self::start_with_metadata(blob_id, total, None, None)
    }

    pub fn start_with_metadata(
        blob_id: &str,
        total: usize,
        file_name: Option<&str>,
        media_type: Option<&str>,
    ) -> Result<Self, AttachmentError> {
        if !valid_blob_id(blob_id) {
            return Err(AttachmentError::InvalidManifest);
        }
        if total == 0 {
            return Err(AttachmentError::Empty);
        }
        if total > MAX_ATTACHMENT_BYTES {
            return Err(AttachmentError::TooLarge);
        }
        let file_name = sanitize_file_name(file_name)?;
        let media_type = sanitize_media_type(media_type)?;
        Ok(Self {
            blob_id: blob_id.to_owned(),
            key: generate_key()?,
            total,
            next_index: 0,
            received: 0,
            chunks: Vec::new(),
            blob: Vec::with_capacity(total),
            file_name,
            media_type,
        })
    }

    pub fn append(&mut self, index: u32, plaintext: &[u8]) -> Result<(), AttachmentError> {
        if index != self.next_index || plaintext.is_empty() || plaintext.len() > CHUNK_SIZE {
            return Err(AttachmentError::InvalidChunk);
        }
        let offset = self.received;
        if offset + plaintext.len() > self.total
            || (offset + plaintext.len() < self.total && plaintext.len() != CHUNK_SIZE)
        {
            return Err(AttachmentError::InvalidChunk);
        }
        let cipher =
            Aes256Gcm::new_from_slice(&self.key.0).map_err(|_| AttachmentError::InvalidKey)?;
        let mut nonce = [0_u8; 12];
        secure_random(&mut nonce).map_err(|_| AttachmentError::RandomnessUnavailable)?;
        let ciphertext = cipher
            .encrypt(
                Nonce::from_slice(&nonce),
                aes_gcm::aead::Payload {
                    msg: plaintext,
                    aad: &aad(index, self.total as u64),
                },
            )
            .map_err(|_| AttachmentError::AuthenticationFailed)?;
        self.blob.extend_from_slice(&ciphertext);
        self.chunks.push(AttachmentChunkDescriptor {
            index,
            nonce: hex(&nonce),
            ciphertext_size: ciphertext.len() as u32,
        });
        self.received += plaintext.len();
        self.next_index = self.next_index.saturating_add(1);
        Ok(())
    }

    pub fn finish(self) -> Result<EncryptedAttachment, AttachmentError> {
        if self.received != self.total || self.blob.is_empty() {
            return Err(AttachmentError::InvalidManifest);
        }
        let descriptor = AttachmentDescriptor {
            version: ATTACHMENT_VERSION,
            blob_id: self.blob_id,
            key: self.key,
            chunk_size: CHUNK_SIZE as u32,
            original_size: self.total as u64,
            chunks: self.chunks,
            file_name: self.file_name,
            media_type: self.media_type,
        };
        Ok(EncryptedAttachment {
            descriptor,
            blob: self.blob,
        })
    }
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
            file_name: None,
            media_type: None,
        },
        blob,
    })
}

pub fn decrypt_blob(
    descriptor: &AttachmentDescriptor,
    blob: &[u8],
) -> Result<Vec<u8>, AttachmentError> {
    validate_descriptor(descriptor)?;
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

pub fn decrypt_blob_chunk(
    descriptor: &AttachmentDescriptor,
    index: u32,
    ciphertext: &[u8],
) -> Result<Vec<u8>, AttachmentError> {
    validate_descriptor(descriptor)?;
    let chunk = descriptor
        .chunks
        .get(index as usize)
        .ok_or(AttachmentError::InvalidChunk)?;
    if chunk.index != index
        || chunk.ciphertext_size as usize != ciphertext.len()
        || ciphertext.len() < 16
        || ciphertext.len() > CHUNK_SIZE + 16
    {
        return Err(AttachmentError::InvalidChunk);
    }
    let nonce = decode_hex(&chunk.nonce).ok_or(AttachmentError::InvalidChunk)?;
    if nonce.len() != 12 {
        return Err(AttachmentError::InvalidChunk);
    }
    let cipher =
        Aes256Gcm::new_from_slice(&descriptor.key.0).map_err(|_| AttachmentError::InvalidKey)?;
    cipher
        .decrypt(
            Nonce::from_slice(&nonce),
            aes_gcm::aead::Payload {
                msg: ciphertext,
                aad: &aad(index, descriptor.original_size),
            },
        )
        .map_err(|_| AttachmentError::AuthenticationFailed)
}

/// Validate the authenticated descriptor before it is restored or used to
/// address a blob. This is structural validation only; AEAD verification
/// still happens when the ciphertext is decrypted.
pub fn validate_descriptor(descriptor: &AttachmentDescriptor) -> Result<(), AttachmentError> {
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
    sanitize_file_name(descriptor.file_name.as_deref())?;
    sanitize_media_type(descriptor.media_type.as_deref())?;
    let mut plaintext_size = 0_u64;
    for (expected, chunk) in descriptor.chunks.iter().enumerate() {
        if chunk.index != expected as u32
            || chunk.ciphertext_size < 16
            || chunk.ciphertext_size as usize > CHUNK_SIZE + 16
            || decode_hex(&chunk.nonce).is_none_or(|nonce| nonce.len() != 12)
        {
            return Err(AttachmentError::InvalidChunk);
        }
        plaintext_size = plaintext_size
            .checked_add(u64::from(chunk.ciphertext_size - 16))
            .ok_or(AttachmentError::TooLarge)?;
        if expected + 1 < descriptor.chunks.len()
            && chunk.ciphertext_size as usize != CHUNK_SIZE + 16
        {
            return Err(AttachmentError::InvalidChunk);
        }
    }
    if plaintext_size != descriptor.original_size {
        return Err(AttachmentError::InvalidManifest);
    }
    Ok(())
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
        || !value.len().is_multiple_of(2)
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

fn sanitize_file_name(value: Option<&str>) -> Result<Option<String>, AttachmentError> {
    let Some(value) = value.filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if value.len() > 255 || value.contains('/') || value.contains('\\') || value.contains('\0') {
        return Err(AttachmentError::InvalidManifest);
    }
    Ok(Some(value.to_owned()))
}

fn sanitize_media_type(value: Option<&str>) -> Result<Option<String>, AttachmentError> {
    let Some(value) = value.filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if value.len() > 128 || !value.is_ascii() || value.contains('\r') || value.contains('\n') {
        return Err(AttachmentError::InvalidManifest);
    }
    Ok(Some(value.to_owned()))
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

    #[test]
    fn streaming_job_encrypts_ordered_plaintext_without_persisting_it() {
        let mut job = AttachmentJob::start(&"d".repeat(32), CHUNK_SIZE + 4).unwrap();
        job.append(0, &vec![4_u8; CHUNK_SIZE]).unwrap();
        job.append(1, b"tail").unwrap();
        let package = job.finish().unwrap();
        assert_eq!(
            decrypt_blob(&package.descriptor, &package.blob).unwrap(),
            [vec![4_u8; CHUNK_SIZE], b"tail".to_vec()].concat()
        );
        assert_eq!(
            AttachmentJob::start(&"d".repeat(32), 0).unwrap_err(),
            AttachmentError::Empty
        );
    }

    #[test]
    fn individual_ciphertext_chunks_can_be_verified_and_decrypted() {
        let package =
            encrypt_for_blob(b"chunked", generate_key().unwrap(), &"e".repeat(32)).unwrap();
        let chunk = &package.blob;
        assert_eq!(
            decrypt_blob_chunk(&package.descriptor, 0, chunk).unwrap(),
            b"chunked"
        );
        assert_eq!(
            decrypt_blob_chunk(&package.descriptor, 0, b"tampered"),
            Err(AttachmentError::InvalidChunk)
        );
    }
}
