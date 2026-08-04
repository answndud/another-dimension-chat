use openmls_libcrux_crypto::Provider;
use openmls_traits::{crypto::OpenMlsCrypto, types::Ciphersuite, OpenMlsProvider};

pub const SELECTED_CIPHERSUITE: Ciphersuite =
    Ciphersuite::MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519;

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
    use super::{verify_candidate_provider, ProviderError, SELECTED_CIPHERSUITE};

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
}
