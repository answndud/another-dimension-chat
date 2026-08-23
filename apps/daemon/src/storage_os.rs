use super::storage::StorageError;
use zeroize::Zeroizing;

pub trait OsKeyStore {
    fn load_database_key(
        &self,
        _profile_id: &str,
    ) -> Result<Zeroizing<[u8; super::storage::KEY_BYTES]>, StorageError>;
    fn save_database_key(
        &self,
        _profile_id: &str,
        _key: &[u8; super::storage::KEY_BYTES],
    ) -> Result<(), StorageError>;

    fn load_profile_passphrase(
        &self,
        _profile_id: &str,
    ) -> Result<Zeroizing<String>, StorageError> {
        Err(StorageError::OsKeyStoreUnavailable)
    }

    fn save_profile_passphrase(
        &self,
        _profile_id: &str,
        _passphrase: &str,
    ) -> Result<(), StorageError> {
        Err(StorageError::OsKeyStoreUnavailable)
    }

    fn delete_profile_passphrase(&self, _profile_id: &str) -> Result<(), StorageError> {
        Err(StorageError::OsKeyStoreUnavailable)
    }
}

const DATABASE_KEY_SERVICE: &str = "com.another-dimension.daemon.database-key";
const PASSPHRASE_SERVICE: &str = "com.another-dimension.daemon.profile-passphrase";

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

fn entry(service: &str, profile_id: &str) -> Result<keyring::Entry, StorageError> {
    keyring::Entry::new(service, account(profile_id)?)
        .map_err(|_| StorageError::OsKeyStoreUnavailable)
}

pub struct PlatformKeyStore;

impl OsKeyStore for PlatformKeyStore {
    fn load_database_key(
        &self,
        profile_id: &str,
    ) -> Result<Zeroizing<[u8; super::storage::KEY_BYTES]>, StorageError> {
        let entry = entry(DATABASE_KEY_SERVICE, profile_id)?;
        let bytes = entry
            .get_password()
            .map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        let decoded = hex_decode_key(&bytes)?;
        let key: [u8; super::storage::KEY_BYTES] = decoded
            .try_into()
            .map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        Ok(Zeroizing::new(key))
    }

    fn save_database_key(
        &self,
        profile_id: &str,
        key: &[u8; super::storage::KEY_BYTES],
    ) -> Result<(), StorageError> {
        let entry = entry(DATABASE_KEY_SERVICE, profile_id)?;
        let encoded: String = key.iter().map(|byte| format!("{byte:02x}")).collect();
        entry
            .set_password(&encoded)
            .map_err(|_| StorageError::OsKeyStoreUnavailable)
    }

    fn load_profile_passphrase(&self, profile_id: &str) -> Result<Zeroizing<String>, StorageError> {
        let entry = entry(PASSPHRASE_SERVICE, profile_id)?;
        let value = entry
            .get_password()
            .map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        Ok(Zeroizing::new(value))
    }

    fn save_profile_passphrase(
        &self,
        profile_id: &str,
        passphrase: &str,
    ) -> Result<(), StorageError> {
        let entry = entry(PASSPHRASE_SERVICE, profile_id)?;
        entry
            .set_password(passphrase)
            .map_err(|_| StorageError::OsKeyStoreUnavailable)
    }

    fn delete_profile_passphrase(&self, profile_id: &str) -> Result<(), StorageError> {
        let entry = entry(PASSPHRASE_SERVICE, profile_id)?;
        entry
            .delete_credential()
            .map_err(|_| StorageError::OsKeyStoreUnavailable)
    }
}

fn hex_decode_key(hex: &str) -> Result<Vec<u8>, StorageError> {
    (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).map_err(|_| StorageError::InvalidPassphrase))
        .collect()
}

pub struct UnavailableOsKeyStore;

impl OsKeyStore for UnavailableOsKeyStore {
    fn load_database_key(
        &self,
        _profile_id: &str,
    ) -> Result<Zeroizing<[u8; super::storage::KEY_BYTES]>, StorageError> {
        Err(StorageError::OsKeyStoreUnavailable)
    }

    fn save_database_key(
        &self,
        _profile_id: &str,
        _key: &[u8; super::storage::KEY_BYTES],
    ) -> Result<(), StorageError> {
        Err(StorageError::OsKeyStoreUnavailable)
    }
}
