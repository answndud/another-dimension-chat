use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Algorithm, Argon2, Params, Version};
use getrandom::fill as secure_random;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fmt, fs,
    fs::OpenOptions,
    io::{self, Write},
    path::{Path, PathBuf},
};
use zeroize::{Zeroize, Zeroizing};

const FILE_MAGIC: &[u8; 8] = b"ADSTORE1";
const FILE_VERSION: u8 = 1;
const SALT_BYTES: usize = 16;
const NONCE_BYTES: usize = 12;
const KEY_BYTES: usize = 32;
pub const MAX_RECORDS: usize = 4096;
pub const RECOVERY_MAGIC: &[u8; 13] = b"ADRECOVERY2\0\0";
const MAX_RECOVERY_ARTIFACT_BYTES: usize = 64 * 1024 * 1024;
const MAX_KEY_BYTES: usize = 256;
const MAX_VALUE_BYTES: usize = 4 * 1024 * 1024;
const MAX_PASSPHRASE_CHARS: usize = 1024;
const KDF_MEMORY_KIB: u32 = 19_456;
const KDF_TIME_COST: u32 = 2;
const KDF_PARALLELISM: u32 = 1;

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum RecordClass {
    AccountRoot = 1,
    Device = 2,
    ProtocolSession = 3,
    Transcript = 4,
    Recovery = 5,
    Account = 6,
    Contact = 7,
    Conversation = 8,
    Message = 9,
    Outbox = 10,
    Inbox = 11,
    Attachment = 12,
    Seen = 13,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RecordMutation {
    Put(RecordClass, String, Vec<u8>),
    Delete(RecordClass, String),
}

impl RecordClass {
    fn from_byte(value: u8) -> Result<Self, StorageError> {
        match value {
            1 => Ok(Self::AccountRoot),
            2 => Ok(Self::Device),
            3 => Ok(Self::ProtocolSession),
            4 => Ok(Self::Transcript),
            5 => Ok(Self::Recovery),
            6 => Ok(Self::Account),
            7 => Ok(Self::Contact),
            8 => Ok(Self::Conversation),
            9 => Ok(Self::Message),
            10 => Ok(Self::Outbox),
            11 => Ok(Self::Inbox),
            12 => Ok(Self::Attachment),
            13 => Ok(Self::Seen),
            _ => Err(StorageError::CorruptStore),
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageError {
    Io,
    WeakPassphrase,
    InvalidPassphrase,
    CorruptStore,
    AuthenticationFailed,
    RollbackDetected,
    RecordTooLarge,
    TooManyRecords,
    OsKeyStoreUnavailable,
    Locked,
}

impl fmt::Display for StorageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Io => "storage I/O failed",
            Self::WeakPassphrase => "storage passphrase is too weak",
            Self::InvalidPassphrase => "storage passphrase is invalid",
            Self::CorruptStore => "encrypted storage is corrupt",
            Self::AuthenticationFailed => "encrypted storage authentication failed",
            Self::RollbackDetected => "encrypted storage rollback detected",
            Self::RecordTooLarge => "encrypted record is too large",
            Self::TooManyRecords => "encrypted record count limit reached",
            Self::OsKeyStoreUnavailable => {
                "OS key store is unavailable; refusing insecure fallback"
            }
            Self::Locked => "encrypted storage is locked",
        })
    }
}

impl std::error::Error for StorageError {}

impl From<io::Error> for StorageError {
    fn from(_: io::Error) -> Self {
        Self::Io
    }
}

/// OS-backed key storage boundary. Implementations must never expose a key in
/// command-line arguments, logs, or a non-encrypted file.
pub trait OsKeyStore {
    fn load_database_key(
        &self,
        _profile_id: &str,
    ) -> Result<Zeroizing<[u8; KEY_BYTES]>, StorageError>;
    fn save_database_key(
        &self,
        _profile_id: &str,
        _key: &[u8; KEY_BYTES],
    ) -> Result<(), StorageError>;
}

#[cfg(target_os = "macos")]
pub struct MacOsKeyStore;

#[cfg(target_os = "macos")]
impl MacOsKeyStore {
    const SERVICE: &'static str = "com.another-dimension.daemon.database-key";

    fn account(profile_id: &str) -> Result<&str, StorageError> {
        if profile_id.is_empty()
            || profile_id.len() > 128
            || !profile_id
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
        {
            return Err(StorageError::InvalidPassphrase);
        }
        Ok(profile_id)
    }
}

#[cfg(target_os = "macos")]
impl OsKeyStore for MacOsKeyStore {
    fn load_database_key(
        &self,
        profile_id: &str,
    ) -> Result<Zeroizing<[u8; KEY_BYTES]>, StorageError> {
        let account = Self::account(profile_id)?;
        let bytes = security_framework::passwords::get_generic_password(Self::SERVICE, account)
            .map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        let key: [u8; KEY_BYTES] = bytes
            .try_into()
            .map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        Ok(Zeroizing::new(key))
    }

    fn save_database_key(
        &self,
        profile_id: &str,
        key: &[u8; KEY_BYTES],
    ) -> Result<(), StorageError> {
        let account = Self::account(profile_id)?;
        security_framework::passwords::set_generic_password(Self::SERVICE, account, key)
            .map_err(|_| StorageError::OsKeyStoreUnavailable)
    }
}

pub struct UnavailableOsKeyStore;

impl OsKeyStore for UnavailableOsKeyStore {
    fn load_database_key(
        &self,
        _profile_id: &str,
    ) -> Result<Zeroizing<[u8; KEY_BYTES]>, StorageError> {
        Err(StorageError::OsKeyStoreUnavailable)
    }

    fn save_database_key(
        &self,
        _profile_id: &str,
        _key: &[u8; KEY_BYTES],
    ) -> Result<(), StorageError> {
        Err(StorageError::OsKeyStoreUnavailable)
    }
}

pub struct EncryptedStore {
    path: PathBuf,
    marker_path: PathBuf,
    key: Zeroizing<[u8; KEY_BYTES]>,
    salt: [u8; SALT_BYTES],
    revision: u64,
    records: BTreeMap<(RecordClass, String), Vec<u8>>,
    locked: bool,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct RecoveryManifest {
    schema_version: u16,
    #[allow(dead_code)]
    created_at: u64,
    store_bytes: u64,
    revision_bytes: u64,
    store_sha256: String,
    revision_sha256: String,
}

impl fmt::Debug for EncryptedStore {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("EncryptedStore")
            .field("path", &self.path)
            .field("revision", &self.revision)
            .field("record_count", &self.records.len())
            .field("key", &"[redacted]")
            .finish()
    }
}

impl EncryptedStore {
    pub fn initialize(path: impl AsRef<Path>, passphrase: &str) -> Result<Self, StorageError> {
        validate_passphrase(passphrase)?;
        let path = path.as_ref();
        let mut salt = [0_u8; SALT_BYTES];
        secure_random(&mut salt).map_err(|_| StorageError::Io)?;
        let key = derive_key(passphrase, &salt)?;
        Self::initialize_with_key(path, key, salt)
    }

    pub fn initialize_with_database_key(
        path: impl AsRef<Path>,
        key: [u8; KEY_BYTES],
    ) -> Result<Self, StorageError> {
        let mut salt = [0_u8; SALT_BYTES];
        secure_random(&mut salt).map_err(|_| StorageError::Io)?;
        Self::initialize_with_key(path.as_ref(), Zeroizing::new(key), salt)
    }

    fn initialize_with_key(
        path: &Path,
        key: Zeroizing<[u8; KEY_BYTES]>,
        salt: [u8; SALT_BYTES],
    ) -> Result<Self, StorageError> {
        let path = path.to_path_buf();
        if path.exists() {
            return Err(StorageError::CorruptStore);
        }
        let marker_path = marker_path(&path);
        let mut store = Self {
            path,
            marker_path,
            key,
            salt,
            revision: 0,
            records: BTreeMap::new(),
            locked: false,
        };
        store.persist()?;
        Ok(store)
    }

    pub fn open(path: impl AsRef<Path>, passphrase: &str) -> Result<Self, StorageError> {
        validate_passphrase(passphrase)?;
        let path = path.as_ref();
        let bytes = fs::read(&path)?;
        let parsed = parse_file(&bytes)?;
        let key = derive_key(passphrase, &parsed.salt)?;
        Self::open_with_key(path, key, parsed)
    }

    pub fn open_with_database_key(
        path: impl AsRef<Path>,
        key: [u8; KEY_BYTES],
    ) -> Result<Self, StorageError> {
        let path = path.as_ref();
        let bytes = fs::read(path)?;
        let parsed = parse_file(&bytes)?;
        Self::open_with_key(path, Zeroizing::new(key), parsed)
    }

    fn open_with_key(
        path: &Path,
        key: Zeroizing<[u8; KEY_BYTES]>,
        parsed: ParsedFile,
    ) -> Result<Self, StorageError> {
        let cipher = Aes256Gcm::new_from_slice(&*key).map_err(|_| StorageError::CorruptStore)?;
        let plaintext = cipher
            .decrypt(
                Nonce::from_slice(&parsed.nonce),
                aes_gcm::aead::Payload {
                    msg: &parsed.ciphertext,
                    aad: &associated_data(&parsed.salt, parsed.revision),
                },
            )
            .map_err(|_| StorageError::AuthenticationFailed)?;
        let records = decode_records(&plaintext)?;
        let marker_path = marker_path(&path);
        if let Some(marker) = read_marker(&marker_path)? {
            if parsed.revision < marker {
                return Err(StorageError::RollbackDetected);
            }
        }
        let store = Self {
            path: path.to_path_buf(),
            marker_path,
            key,
            salt: parsed.salt,
            revision: parsed.revision,
            records,
            locked: false,
        };
        if read_marker(&store.marker_path)?
            .map(|marker| marker < store.revision)
            .unwrap_or(true)
        {
            store.write_marker(store.revision)?;
        }
        Ok(store)
    }

    pub fn revision(&self) -> u64 {
        self.revision
    }

    /// Returns the encrypted store and rollback marker in the same format as
    /// the CLI recovery artifact. No plaintext records or database key leave
    /// this process.
    pub fn export_recovery_artifact(&self, created_at: u64) -> Result<Vec<u8>, StorageError> {
        if self.locked {
            return Err(StorageError::Locked);
        }
        let store = fs::read(&self.path)?;
        let revision = fs::read(&self.marker_path)?;
        let manifest = serde_json::json!({
            "schema_version": 2,
            "created_at": created_at,
            "store_bytes": store.len() as u64,
            "revision_bytes": revision.len() as u64,
            "store_sha256": hex_bytes(&Sha256::digest(&store)),
            "revision_sha256": hex_bytes(&Sha256::digest(&revision)),
        });
        let manifest = serde_json::to_vec(&manifest).map_err(|_| StorageError::Io)?;
        let mut artifact = Vec::with_capacity(
            RECOVERY_MAGIC.len() + 8 + manifest.len() + 8 + store.len() + 8 + revision.len(),
        );
        artifact.extend_from_slice(RECOVERY_MAGIC);
        append_blob(&mut artifact, &manifest);
        append_blob(&mut artifact, &store);
        append_blob(&mut artifact, &revision);
        Ok(artifact)
    }

    /// Validates and stages an encrypted recovery artifact for the next
    /// daemon start. The active store is not replaced by this method.
    pub fn stage_recovery_artifact(&self, artifact: &[u8]) -> Result<(), StorageError> {
        if self.locked {
            return Err(StorageError::Locked);
        }
        let _ = parse_recovery_artifact(artifact)?;
        atomic_write(&recovery_pending_path(&self.path), artifact)
    }

    pub fn lock(&mut self) {
        for value in self.records.values_mut() {
            value.zeroize();
        }
        self.records.clear();
        self.key.zeroize();
        self.locked = true;
    }

    pub fn wipe_files(&mut self) -> Result<(), StorageError> {
        self.lock();
        match fs::remove_file(&self.path) {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        match fs::remove_file(&self.marker_path) {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        Ok(())
    }

    /// Re-encrypts every record under a freshly derived key and salt without
    /// exposing plaintext outside this process. The destination must not
    /// exist; callers can atomically replace the active store afterwards.
    pub fn rekey_to(
        &self,
        destination: impl AsRef<Path>,
        new_passphrase: &str,
    ) -> Result<(), StorageError> {
        if self.locked {
            return Err(StorageError::Locked);
        }
        let mut replacement = Self::initialize(destination, new_passphrase)?;
        let mutations = self
            .records
            .iter()
            .map(|((class, key), value)| RecordMutation::Put(*class, key.clone(), value.clone()))
            .collect::<Vec<_>>();
        replacement.apply_batch(&mutations)
    }

    pub fn put(&mut self, class: RecordClass, key: &str, value: &[u8]) -> Result<(), StorageError> {
        if self.locked {
            return Err(StorageError::Locked);
        }
        validate_record_key(key)?;
        if value.len() > MAX_VALUE_BYTES {
            return Err(StorageError::RecordTooLarge);
        }
        let previous = self
            .records
            .insert((class, key.to_string()), value.to_vec());
        if let Err(error) = self.commit() {
            match previous {
                Some(old) => {
                    self.records.insert((class, key.to_string()), old);
                }
                None => {
                    self.records.remove(&(class, key.to_string()));
                }
            }
            return Err(error);
        }
        Ok(())
    }

    pub fn get(&self, class: RecordClass, key: &str) -> Option<Vec<u8>> {
        if self.locked {
            return None;
        }
        self.records.get(&(class, key.to_string())).cloned()
    }

    pub fn records_with_prefix(&self, class: RecordClass, prefix: &str) -> Vec<(String, Vec<u8>)> {
        self.records_with_prefix_page(class, prefix, 0, MAX_RECORDS)
    }

    pub fn records_with_prefix_page(
        &self,
        class: RecordClass,
        prefix: &str,
        offset: usize,
        limit: usize,
    ) -> Vec<(String, Vec<u8>)> {
        if self.locked {
            return Vec::new();
        }
        self.records
            .iter()
            .filter(|((record_class, key), _)| *record_class == class && key.starts_with(prefix))
            .skip(offset)
            .take(limit)
            .map(|((_, key), value)| (key.clone(), value.clone()))
            .collect()
    }

    pub const fn record_limit() -> usize {
        MAX_RECORDS
    }

    /// Applies a protocol-state batch as one encrypted store revision. This is
    /// the transaction boundary a future MLS StorageProvider adapter must use.
    pub fn apply_batch(&mut self, mutations: &[RecordMutation]) -> Result<(), StorageError> {
        if self.locked {
            return Err(StorageError::Locked);
        }
        let previous = self.records.clone();
        for mutation in mutations {
            match mutation {
                RecordMutation::Put(class, key, value) => {
                    validate_record_key(key)?;
                    if value.len() > MAX_VALUE_BYTES {
                        return Err(StorageError::RecordTooLarge);
                    }
                    self.records.insert((*class, key.clone()), value.clone());
                }
                RecordMutation::Delete(class, key) => {
                    validate_record_key(key)?;
                    self.records.remove(&(*class, key.clone()));
                }
            }
        }
        if let Err(error) = self.commit() {
            self.records = previous;
            return Err(error);
        }
        Ok(())
    }

    pub fn delete(&mut self, class: RecordClass, key: &str) -> Result<bool, StorageError> {
        if self.locked {
            return Err(StorageError::Locked);
        }
        let previous = self.records.remove(&(class, key.to_string()));
        if previous.is_none() {
            return Ok(false);
        }
        if let Err(error) = self.commit() {
            self.records
                .insert((class, key.to_string()), previous.expect("checked above"));
            return Err(error);
        }
        Ok(true)
    }

    pub fn record_count(&self) -> usize {
        if self.locked {
            return 0;
        }
        self.records.len()
    }

    fn commit(&mut self) -> Result<(), StorageError> {
        if self.locked {
            return Err(StorageError::Locked);
        }
        if self.records.len() > MAX_RECORDS {
            return Err(StorageError::TooManyRecords);
        }
        let next_revision = self
            .revision
            .checked_add(1)
            .ok_or(StorageError::RollbackDetected)?;
        let plaintext = encode_records(&self.records)?;
        let mut nonce = [0_u8; NONCE_BYTES];
        secure_random(&mut nonce).map_err(|_| StorageError::Io)?;
        let cipher =
            Aes256Gcm::new_from_slice(&*self.key).map_err(|_| StorageError::CorruptStore)?;
        let ciphertext = cipher
            .encrypt(
                Nonce::from_slice(&nonce),
                aes_gcm::aead::Payload {
                    msg: &plaintext,
                    aad: &associated_data(&self.salt, next_revision),
                },
            )
            .map_err(|_| StorageError::Io)?;
        let bytes = encode_file(&self.salt, next_revision, &nonce, &ciphertext);
        atomic_write(&self.path, &bytes)?;
        self.write_marker(next_revision)?;
        self.revision = next_revision;
        Ok(())
    }

    fn persist(&mut self) -> Result<(), StorageError> {
        let plaintext = encode_records(&self.records)?;
        let mut nonce = [0_u8; NONCE_BYTES];
        secure_random(&mut nonce).map_err(|_| StorageError::Io)?;
        let cipher =
            Aes256Gcm::new_from_slice(&*self.key).map_err(|_| StorageError::CorruptStore)?;
        let ciphertext = cipher
            .encrypt(
                Nonce::from_slice(&nonce),
                aes_gcm::aead::Payload {
                    msg: &plaintext,
                    aad: &associated_data(&self.salt, self.revision),
                },
            )
            .map_err(|_| StorageError::Io)?;
        atomic_write(
            &self.path,
            &encode_file(&self.salt, self.revision, &nonce, &ciphertext),
        )?;
        self.write_marker(self.revision)
    }

    fn write_marker(&self, revision: u64) -> Result<(), StorageError> {
        atomic_write(&self.marker_path, revision.to_string().as_bytes())
    }
}

impl Drop for EncryptedStore {
    fn drop(&mut self) {
        for value in self.records.values_mut() {
            value.zeroize();
        }
    }
}

struct ParsedFile {
    salt: [u8; SALT_BYTES],
    revision: u64,
    nonce: [u8; NONCE_BYTES],
    ciphertext: Vec<u8>,
}

fn validate_passphrase(passphrase: &str) -> Result<(), StorageError> {
    let length = passphrase.chars().count();
    if length < 12 {
        return Err(StorageError::WeakPassphrase);
    }
    if length > MAX_PASSPHRASE_CHARS {
        return Err(StorageError::InvalidPassphrase);
    }
    Ok(())
}

fn validate_record_key(key: &str) -> Result<(), StorageError> {
    if key.is_empty()
        || key.len() > MAX_KEY_BYTES
        || key.bytes().any(|byte| byte == 0 || byte.is_ascii_control())
    {
        return Err(StorageError::RecordTooLarge);
    }
    Ok(())
}

fn derive_key(
    passphrase: &str,
    salt: &[u8; SALT_BYTES],
) -> Result<Zeroizing<[u8; KEY_BYTES]>, StorageError> {
    let params = Params::new(
        KDF_MEMORY_KIB,
        KDF_TIME_COST,
        KDF_PARALLELISM,
        Some(KEY_BYTES),
    )
    .map_err(|_| StorageError::CorruptStore)?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = Zeroizing::new([0_u8; KEY_BYTES]);
    argon
        .hash_password_into(passphrase.as_bytes(), salt, key.as_mut())
        .map_err(|_| StorageError::AuthenticationFailed)?;
    Ok(key)
}

fn associated_data(salt: &[u8; SALT_BYTES], revision: u64) -> Vec<u8> {
    let mut data = Vec::with_capacity(8 + 1 + SALT_BYTES + 8);
    data.extend_from_slice(FILE_MAGIC);
    data.push(FILE_VERSION);
    data.extend_from_slice(salt);
    data.extend_from_slice(&revision.to_be_bytes());
    data
}

fn encode_file(
    salt: &[u8; SALT_BYTES],
    revision: u64,
    nonce: &[u8; NONCE_BYTES],
    ciphertext: &[u8],
) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(8 + 1 + SALT_BYTES + 8 + NONCE_BYTES + ciphertext.len());
    bytes.extend_from_slice(FILE_MAGIC);
    bytes.push(FILE_VERSION);
    bytes.extend_from_slice(salt);
    bytes.extend_from_slice(&revision.to_be_bytes());
    bytes.extend_from_slice(nonce);
    bytes.extend_from_slice(ciphertext);
    bytes
}

fn parse_file(bytes: &[u8]) -> Result<ParsedFile, StorageError> {
    let minimum = FILE_MAGIC.len() + 1 + SALT_BYTES + 8 + NONCE_BYTES + 16;
    if bytes.len() < minimum || &bytes[..8] != FILE_MAGIC || bytes[8] != FILE_VERSION {
        return Err(StorageError::CorruptStore);
    }
    let mut offset = 9;
    let mut salt = [0_u8; SALT_BYTES];
    salt.copy_from_slice(&bytes[offset..offset + SALT_BYTES]);
    offset += SALT_BYTES;
    let revision = u64::from_be_bytes(
        bytes[offset..offset + 8]
            .try_into()
            .map_err(|_| StorageError::CorruptStore)?,
    );
    offset += 8;
    let mut nonce = [0_u8; NONCE_BYTES];
    nonce.copy_from_slice(&bytes[offset..offset + NONCE_BYTES]);
    offset += NONCE_BYTES;
    Ok(ParsedFile {
        salt,
        revision,
        nonce,
        ciphertext: bytes[offset..].to_vec(),
    })
}

fn encode_records(
    records: &BTreeMap<(RecordClass, String), Vec<u8>>,
) -> Result<Vec<u8>, StorageError> {
    if records.len() > MAX_RECORDS {
        return Err(StorageError::TooManyRecords);
    }
    let mut bytes = Vec::new();
    bytes.extend_from_slice(b"ADPAY1");
    bytes.extend_from_slice(&(records.len() as u32).to_be_bytes());
    for ((class, key), value) in records {
        validate_record_key(key)?;
        if value.len() > MAX_VALUE_BYTES {
            return Err(StorageError::RecordTooLarge);
        }
        bytes.push(*class as u8);
        bytes.extend_from_slice(&(key.len() as u16).to_be_bytes());
        bytes.extend_from_slice(&(value.len() as u32).to_be_bytes());
        bytes.extend_from_slice(key.as_bytes());
        bytes.extend_from_slice(value);
    }
    Ok(bytes)
}

fn decode_records(bytes: &[u8]) -> Result<BTreeMap<(RecordClass, String), Vec<u8>>, StorageError> {
    if bytes.len() < 10 || &bytes[..6] != b"ADPAY1" {
        return Err(StorageError::CorruptStore);
    }
    let mut offset = 6;
    let count = u32::from_be_bytes(
        bytes[offset..offset + 4]
            .try_into()
            .map_err(|_| StorageError::CorruptStore)?,
    ) as usize;
    offset += 4;
    if count > MAX_RECORDS {
        return Err(StorageError::TooManyRecords);
    }
    let mut records = BTreeMap::new();
    for _ in 0..count {
        if bytes.len() < offset + 7 {
            return Err(StorageError::CorruptStore);
        }
        let class = RecordClass::from_byte(bytes[offset])?;
        offset += 1;
        let key_len = u16::from_be_bytes(
            bytes[offset..offset + 2]
                .try_into()
                .map_err(|_| StorageError::CorruptStore)?,
        ) as usize;
        offset += 2;
        let value_len = u32::from_be_bytes(
            bytes[offset..offset + 4]
                .try_into()
                .map_err(|_| StorageError::CorruptStore)?,
        ) as usize;
        offset += 4;
        if key_len > MAX_KEY_BYTES
            || value_len > MAX_VALUE_BYTES
            || bytes.len() < offset + key_len + value_len
        {
            return Err(StorageError::CorruptStore);
        }
        let key = String::from_utf8(bytes[offset..offset + key_len].to_vec())
            .map_err(|_| StorageError::CorruptStore)?;
        offset += key_len;
        validate_record_key(&key)?;
        let value = bytes[offset..offset + value_len].to_vec();
        offset += value_len;
        if records.insert((class, key), value).is_some() {
            return Err(StorageError::CorruptStore);
        }
    }
    if offset != bytes.len() {
        return Err(StorageError::CorruptStore);
    }
    Ok(records)
}

fn marker_path(path: &Path) -> PathBuf {
    PathBuf::from(format!("{}.revision", path.display()))
}

fn read_marker(path: &Path) -> Result<Option<u64>, StorageError> {
    match fs::read_to_string(path) {
        Ok(value) => value
            .trim()
            .parse::<u64>()
            .map(Some)
            .map_err(|_| StorageError::CorruptStore),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err(StorageError::Io),
    }
}

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), StorageError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut suffix = [0_u8; 8];
    secure_random(&mut suffix).map_err(|_| StorageError::Io)?;
    let temporary =
        path.with_extension(format!("tmp-{}-{}", std::process::id(), hex_bytes(&suffix)));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)?;
    file.write_all(contents)?;
    file.sync_all()?;
    let mut permissions = file.metadata()?.permissions();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        permissions.set_mode(0o600);
        file.set_permissions(permissions)?;
    }
    drop(file);
    fs::rename(&temporary, path).map_err(|_| StorageError::Io)?;
    #[cfg(unix)]
    if let Some(parent) = path.parent() {
        fs::File::open(parent)?.sync_all()?;
    }
    Ok(())
}

fn hex_bytes(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn append_blob(output: &mut Vec<u8>, value: &[u8]) {
    output.extend_from_slice(&(value.len() as u64).to_be_bytes());
    output.extend_from_slice(value);
}

pub fn recovery_pending_path(path: impl AsRef<Path>) -> PathBuf {
    path.as_ref().with_extension("recovery.pending")
}

pub fn parse_recovery_artifact(bytes: &[u8]) -> Result<(Vec<u8>, Vec<u8>), StorageError> {
    if bytes.len() > MAX_RECOVERY_ARTIFACT_BYTES || !bytes.starts_with(RECOVERY_MAGIC) {
        return Err(StorageError::CorruptStore);
    }
    let (manifest_bytes, offset) = read_blob(bytes, RECOVERY_MAGIC.len())?;
    let manifest: RecoveryManifest =
        serde_json::from_slice(manifest_bytes).map_err(|_| StorageError::CorruptStore)?;
    let (store, offset) = read_blob(bytes, offset)?;
    let (revision, end) = read_blob(bytes, offset)?;
    if end != bytes.len()
        || manifest.schema_version != 2
        || manifest.store_bytes != store.len() as u64
        || manifest.revision_bytes != revision.len() as u64
        || manifest.store_sha256 != hex_bytes(&Sha256::digest(store))
        || manifest.revision_sha256 != hex_bytes(&Sha256::digest(revision))
        || store.is_empty()
        || revision.is_empty()
    {
        return Err(StorageError::CorruptStore);
    }
    let parsed_store = parse_file(store)?;
    let marker_revision = std::str::from_utf8(revision)
        .map_err(|_| StorageError::CorruptStore)?
        .trim()
        .parse::<u64>()
        .map_err(|_| StorageError::CorruptStore)?;
    if parsed_store.revision != marker_revision {
        return Err(StorageError::CorruptStore);
    }
    Ok((store.to_vec(), revision.to_vec()))
}

fn read_blob(bytes: &[u8], offset: usize) -> Result<(&[u8], usize), StorageError> {
    let end_length = offset.checked_add(8).ok_or(StorageError::CorruptStore)?;
    if end_length > bytes.len() {
        return Err(StorageError::CorruptStore);
    }
    let length = u64::from_be_bytes(
        bytes[offset..end_length]
            .try_into()
            .map_err(|_| StorageError::CorruptStore)?,
    ) as usize;
    let end = end_length
        .checked_add(length)
        .ok_or(StorageError::CorruptStore)?;
    if end > bytes.len() {
        return Err(StorageError::CorruptStore);
    }
    Ok((&bytes[end_length..end], end))
}

#[cfg(test)]
mod tests {
    use super::{
        EncryptedStore, OsKeyStore, RecordClass, RecordMutation, StorageError,
        UnavailableOsKeyStore, RECOVERY_MAGIC,
    };
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_path(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "another-dimension-{label}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    #[test]
    fn encrypted_records_round_trip_and_wrong_passphrase_fails() {
        let path = temp_path("store");
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        store
            .put(RecordClass::AccountRoot, "root", b"private-root-material")
            .unwrap();
        assert_eq!(
            store.get(RecordClass::AccountRoot, "root").as_deref(),
            Some(b"private-root-material".as_slice())
        );
        drop(store);
        assert!(matches!(
            EncryptedStore::open(&path, "wrong horse battery staple"),
            Err(StorageError::AuthenticationFailed)
        ));
        let bytes = fs::read(&path).unwrap();
        assert!(!bytes
            .windows(b"private-root-material".len())
            .any(|window| window == b"private-root-material"));
        let artifact = EncryptedStore::open(&path, "correct horse battery staple")
            .unwrap()
            .export_recovery_artifact(42)
            .unwrap();
        assert!(artifact.starts_with(RECOVERY_MAGIC));
        assert!(!artifact
            .windows(b"private-root-material".len())
            .any(|window| window == b"private-root-material"));
        fs::remove_file(&path).unwrap();
        fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn lock_zeroizes_in_memory_records_and_refuses_further_mutation() {
        let path = temp_path("locked-store");
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        store
            .put(RecordClass::Message, "message-1", b"secret")
            .unwrap();
        store.lock();
        assert_eq!(store.get(RecordClass::Message, "message-1"), None);
        assert_eq!(store.record_count(), 0);
        assert_eq!(
            store.put(RecordClass::Message, "message-2", b"secret"),
            Err(StorageError::Locked)
        );
        drop(store);
        fs::remove_file(&path).unwrap();
        fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn database_key_boundary_round_trips_without_a_passphrase() {
        let path = temp_path("database-key");
        let key = [0x5a; 32];
        let mut store = EncryptedStore::initialize_with_database_key(&path, key).unwrap();
        store
            .put(RecordClass::Account, "profile", b"encrypted metadata")
            .unwrap();
        drop(store);
        let reopened = EncryptedStore::open_with_database_key(&path, key).unwrap();
        assert_eq!(
            reopened.get(RecordClass::Account, "profile").as_deref(),
            Some(b"encrypted metadata".as_slice())
        );
        assert!(matches!(
            EncryptedStore::open_with_database_key(&path, [0x6b; 32]),
            Err(StorageError::AuthenticationFailed)
        ));
        fs::remove_file(&path).unwrap();
        let marker = path.with_extension("revision");
        let _ = fs::remove_file(marker);
    }

    #[test]
    fn rollback_marker_rejects_an_old_snapshot() {
        let path = temp_path("rollback");
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        store.put(RecordClass::Transcript, "one", b"first").unwrap();
        let old = fs::read(&path).unwrap();
        store
            .put(RecordClass::Transcript, "two", b"second")
            .unwrap();
        fs::write(&path, old).unwrap();
        assert!(matches!(
            EncryptedStore::open(&path, "correct horse battery staple"),
            Err(StorageError::RollbackDetected)
        ));
        fs::remove_file(&path).unwrap();
        fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn authenticated_store_rejects_ciphertext_corruption() {
        let path = temp_path("corrupt-ciphertext");
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        store
            .put(RecordClass::Message, "message-1", b"sensitive message")
            .unwrap();
        drop(store);

        let mut bytes = fs::read(&path).unwrap();
        let last = bytes.len() - 1;
        bytes[last] ^= 0x01;
        fs::write(&path, bytes).unwrap();
        assert!(matches!(
            EncryptedStore::open(&path, "correct horse battery staple"),
            Err(StorageError::AuthenticationFailed | StorageError::CorruptStore)
        ));

        fs::remove_file(&path).unwrap();
        fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn deletion_is_persisted_and_os_key_store_does_not_fallback() {
        let path = temp_path("delete");
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        store
            .put(RecordClass::Device, "device-1", b"certificate")
            .unwrap();
        assert!(store.delete(RecordClass::Device, "device-1").unwrap());
        drop(store);
        let reopened = EncryptedStore::open(&path, "correct horse battery staple").unwrap();
        assert_eq!(reopened.get(RecordClass::Device, "device-1"), None);
        assert!(matches!(
            UnavailableOsKeyStore.load_database_key("profile"),
            Err(StorageError::OsKeyStoreUnavailable)
        ));
        fs::remove_file(&path).unwrap();
        fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn protocol_batch_commits_one_revision_and_rejects_invalid_batch_without_partial_state() {
        let path = temp_path("batch");
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let initial = store.revision();
        store
            .apply_batch(&[
                RecordMutation::Put(
                    RecordClass::ProtocolSession,
                    "mls/v1/group/state".into(),
                    b"state".to_vec(),
                ),
                RecordMutation::Put(
                    RecordClass::ProtocolSession,
                    "mls/v1/group/epoch".into(),
                    b"1".to_vec(),
                ),
            ])
            .unwrap();
        assert_eq!(store.revision(), initial + 1);
        assert_eq!(
            store
                .get(RecordClass::ProtocolSession, "mls/v1/group/state")
                .as_deref(),
            Some(b"state".as_slice())
        );
        let revision = store.revision();
        assert!(matches!(
            store.apply_batch(&[RecordMutation::Put(
                RecordClass::ProtocolSession,
                "bad\nkey".into(),
                b"leak".to_vec()
            )]),
            Err(StorageError::RecordTooLarge)
        ));
        assert_eq!(store.revision(), revision);
        assert_eq!(store.get(RecordClass::ProtocolSession, "bad\nkey"), None);
        fs::remove_file(&path).unwrap();
        fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }

    #[test]
    fn all_domain_record_classes_round_trip_without_plaintext_leak() {
        let path = temp_path("domain-records");
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let classes = [
            RecordClass::Account,
            RecordClass::Contact,
            RecordClass::Conversation,
            RecordClass::Message,
            RecordClass::Outbox,
            RecordClass::Inbox,
            RecordClass::Attachment,
            RecordClass::Seen,
        ];
        for (index, class) in classes.into_iter().enumerate() {
            store
                .put(class, &format!("record-{index}"), b"encrypted-domain-value")
                .unwrap();
        }
        drop(store);
        let reopened = EncryptedStore::open(&path, "correct horse battery staple").unwrap();
        for (index, class) in classes.into_iter().enumerate() {
            assert_eq!(
                reopened.get(class, &format!("record-{index}")).as_deref(),
                Some(b"encrypted-domain-value".as_slice())
            );
        }
        let bytes = fs::read(&path).unwrap();
        assert!(!bytes
            .windows(b"encrypted-domain-value".len())
            .any(|window| window == b"encrypted-domain-value"));
        fs::remove_file(&path).unwrap();
        fs::remove_file(format!("{}.revision", path.display())).unwrap();
    }
}
