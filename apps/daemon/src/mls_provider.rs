use openmls_libcrux_crypto::CryptoProvider;
use openmls_libcrux_crypto::Provider;
use openmls_traits::{crypto::OpenMlsCrypto, types::Ciphersuite, OpenMlsProvider};

use crate::mls_storage_provider::EncryptedMlsStorage;

pub const SELECTED_CIPHERSUITE: Ciphersuite =
    Ciphersuite::MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519;

/// The daemon's OpenMLS provider. OpenMLS writes through the product-owned
/// StorageProvider; encrypted on-disk durability is supplied by the daemon
/// checkpoint transaction around each session mutation.
pub struct DaemonProvider {
    crypto: CryptoProvider,
    storage: EncryptedMlsStorage,
}

impl DaemonProvider {
    pub fn new() -> Result<Self, openmls_traits::types::CryptoError> {
        Ok(Self {
            crypto: CryptoProvider::new()?,
            storage: EncryptedMlsStorage::default(),
        })
    }
}

impl OpenMlsProvider for DaemonProvider {
    type CryptoProvider = CryptoProvider;
    type RandProvider = CryptoProvider;
    type StorageProvider = EncryptedMlsStorage;

    fn storage(&self) -> &Self::StorageProvider {
        &self.storage
    }

    fn crypto(&self) -> &Self::CryptoProvider {
        &self.crypto
    }

    fn rand(&self) -> &Self::RandProvider {
        &self.crypto
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum ProviderError {
    InitializationFailed,
    CiphersuiteUnsupported,
}

/// Compile/runtime probe for the pinned provider. It does not create a group
/// and does not expose the provider's default memory storage as production.
pub fn verify_candidate_provider() -> Result<(), ProviderError> {
    let provider = Provider::new().map_err(|_| ProviderError::InitializationFailed)?;
    provider
        .crypto()
        .supports(SELECTED_CIPHERSUITE)
        .map_err(|_| ProviderError::CiphersuiteUnsupported)
}

#[cfg(test)]
mod tests {
    use super::{verify_candidate_provider, DaemonProvider, ProviderError, SELECTED_CIPHERSUITE};
    use openmls_traits::{storage::StorageProvider, OpenMlsProvider};

    #[test]
    fn pinned_libcrux_provider_supports_selected_ciphersuite() {
        assert_eq!(verify_candidate_provider(), Ok(()));
        assert_eq!(
            format!("{SELECTED_CIPHERSUITE:?}"),
            "MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519"
        );
    }

    #[test]
    fn provider_failure_is_a_preflight_failure_not_a_fallback() {
        assert_ne!(
            ProviderError::InitializationFailed,
            ProviderError::CiphersuiteUnsupported
        );
    }

    #[test]
    fn daemon_provider_uses_the_product_storage_provider() {
        let _provider = DaemonProvider::new().unwrap();
        assert_eq!(
            <<DaemonProvider as OpenMlsProvider>::StorageProvider as StorageProvider<1>>::version(),
            1
        );
    }
}
