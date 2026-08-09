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

#[cfg(target_os = "macos")]
pub struct MacOsKeyStore;

#[cfg(target_os = "macos")]
impl MacOsKeyStore {
    const DATABASE_KEY_SERVICE: &'static str = "com.another-dimension.daemon.database-key";
    const PASSPHRASE_SERVICE: &'static str = "com.another-dimension.daemon.profile-passphrase";

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
    ) -> Result<Zeroizing<[u8; super::storage::KEY_BYTES]>, StorageError> {
        let account = Self::account(profile_id)?;
        let bytes = security_framework::passwords::get_generic_password(
            Self::DATABASE_KEY_SERVICE,
            account,
        )
        .map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        let key: [u8; super::storage::KEY_BYTES] = bytes
            .try_into()
            .map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        Ok(Zeroizing::new(key))
    }

    fn save_database_key(
        &self,
        profile_id: &str,
        key: &[u8; super::storage::KEY_BYTES],
    ) -> Result<(), StorageError> {
        let account = Self::account(profile_id)?;
        security_framework::passwords::set_generic_password(
            Self::DATABASE_KEY_SERVICE,
            account,
            key,
        )
        .map_err(|_| StorageError::OsKeyStoreUnavailable)
    }

    fn load_profile_passphrase(&self, profile_id: &str) -> Result<Zeroizing<String>, StorageError> {
        let account = Self::account(profile_id)?;
        let bytes =
            security_framework::passwords::get_generic_password(Self::PASSPHRASE_SERVICE, account)
                .map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        let value = String::from_utf8(bytes).map_err(|_| StorageError::OsKeyStoreUnavailable)?;
        Ok(Zeroizing::new(value))
    }

    fn save_profile_passphrase(
        &self,
        profile_id: &str,
        passphrase: &str,
    ) -> Result<(), StorageError> {
        let account = Self::account(profile_id)?;
        security_framework::passwords::set_generic_password(
            Self::PASSPHRASE_SERVICE,
            account,
            passphrase.as_bytes(),
        )
        .map_err(|_| StorageError::OsKeyStoreUnavailable)
    }

    fn delete_profile_passphrase(&self, profile_id: &str) -> Result<(), StorageError> {
        let account = Self::account(profile_id)?;
        security_framework::passwords::delete_generic_password(Self::PASSPHRASE_SERVICE, account)
            .map_err(|_| StorageError::OsKeyStoreUnavailable)
    }
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
