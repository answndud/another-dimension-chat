//! Minimal real OpenMLS 1:1 session boundary.
//!
//! This module deliberately owns the OpenMLS objects and exposes only
//! serialized messages to the relay boundary. Persistence is added by the
//! next storage slice; this first slice proves the cryptographic lifecycle
//! without allowing the browser to handle MLS state.

use openmls::prelude::{
    BasicCredential, CredentialWithKey, KeyPackageIn, MlsGroup, MlsGroupCreateConfig,
    MlsGroupJoinConfig, MlsMessageBodyIn, MlsMessageIn, ProcessedMessageContent, ProtocolVersion,
    SignatureScheme, StagedWelcome,
};
use openmls_libcrux_crypto::{CryptoProvider, Provider};
use openmls_traits::{
    crypto::OpenMlsCrypto,
    signatures::{Signer, SignerError},
    OpenMlsProvider,
};
use tls_codec::{Deserialize, Serialize};

use crate::mls_provider::SELECTED_CIPHERSUITE;

const MAX_IDENTITY_BYTES: usize = 1024;
const MAX_MESSAGE_BYTES: usize = 1024 * 1024;
const MAX_WIRE_BYTES: usize = 4 * 1024 * 1024;

#[derive(Debug, Eq, PartialEq)]
pub enum SessionError {
    Provider,
    IdentityTooLarge,
    UnsupportedMessage,
    InvalidWire,
    TooLarge,
    Crypto,
    NotJoined,
    OpenMls,
}

impl std::fmt::Display for SessionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Provider => "MLS provider initialization failed",
            Self::IdentityTooLarge => "MLS identity is too large",
            Self::UnsupportedMessage => "MLS message type is not supported here",
            Self::InvalidWire => "MLS wire message is invalid",
            Self::TooLarge => "MLS message exceeds the daemon limit",
            Self::Crypto => "MLS cryptographic operation failed",
            Self::NotJoined => "MLS session has no active group",
            Self::OpenMls => "OpenMLS session operation failed",
        })
    }
}

impl std::error::Error for SessionError {}

struct SessionSigner<'a> {
    crypto: &'a CryptoProvider,
    private_key: &'a [u8],
}

impl Signer for SessionSigner<'_> {
    fn sign(&self, payload: &[u8]) -> Result<Vec<u8>, SignerError> {
        self.crypto
            .sign(SignatureScheme::ED25519, payload, self.private_key)
            .map_err(SignerError::CryptoError)
    }

    fn signature_scheme(&self) -> SignatureScheme {
        SignatureScheme::ED25519
    }
}

pub struct MlsSession {
    provider: Provider,
    credential: CredentialWithKey,
    private_signature_key: Vec<u8>,
    group: Option<MlsGroup>,
}

impl MlsSession {
    pub fn new(identity: Vec<u8>) -> Result<Self, SessionError> {
        if identity.is_empty() || identity.len() > MAX_IDENTITY_BYTES {
            return Err(SessionError::IdentityTooLarge);
        }
        let provider = Provider::new().map_err(|_| SessionError::Provider)?;
        provider
            .crypto()
            .supports(SELECTED_CIPHERSUITE)
            .map_err(|_| SessionError::Provider)?;
        let (private_signature_key, public_signature_key) = provider
            .crypto()
            .signature_key_gen(SignatureScheme::ED25519)
            .map_err(|_| SessionError::Crypto)?;
        let credential = CredentialWithKey {
            credential: BasicCredential::new(identity).into(),
            signature_key: public_signature_key.into(),
        };
        Ok(Self {
            provider,
            credential,
            private_signature_key,
            group: None,
        })
    }

    pub fn key_package(&self) -> Result<Vec<u8>, SessionError> {
        let signer = SessionSigner {
            crypto: self.provider.crypto(),
            private_key: &self.private_signature_key,
        };
        let bundle = openmls::prelude::KeyPackage::builder()
            .build(
                SELECTED_CIPHERSUITE,
                &self.provider,
                &signer,
                self.credential.clone(),
            )
            .map_err(|_| SessionError::OpenMls)?;
        bundle
            .key_package()
            .tls_serialize_detached()
            .map_err(|_| SessionError::InvalidWire)
    }

    pub fn create_group(&mut self) -> Result<(), SessionError> {
        if self.group.is_some() {
            return Err(SessionError::OpenMls);
        }
        let signer = SessionSigner {
            crypto: self.provider.crypto(),
            private_key: &self.private_signature_key,
        };
        let config = MlsGroupCreateConfig::builder()
            .ciphersuite(SELECTED_CIPHERSUITE)
            .use_ratchet_tree_extension(true)
            .build();
        self.group = Some(
            MlsGroup::new(&self.provider, &signer, &config, self.credential.clone())
                .map_err(|_| SessionError::OpenMls)?,
        );
        Ok(())
    }

    pub fn add_member(&mut self, key_package: &[u8]) -> Result<Vec<u8>, SessionError> {
        let mut key_package_wire = key_package;
        let key_package = KeyPackageIn::tls_deserialize(&mut key_package_wire)
            .map_err(|_| SessionError::InvalidWire)?;
        if !key_package_wire.is_empty() {
            return Err(SessionError::InvalidWire);
        }
        let key_package = key_package
            .validate(self.provider.crypto(), ProtocolVersion::default())
            .map_err(|_| SessionError::InvalidWire)?;
        let group = self.group.as_mut().ok_or(SessionError::NotJoined)?;
        let signer = SessionSigner {
            crypto: self.provider.crypto(),
            private_key: &self.private_signature_key,
        };
        let (_, welcome, _) = group
            .add_members(&self.provider, &signer, &[key_package])
            .map_err(|_| SessionError::OpenMls)?;
        group
            .merge_pending_commit(&self.provider)
            .map_err(|_| SessionError::OpenMls)?;
        welcome
            .tls_serialize_detached()
            .map_err(|_| SessionError::InvalidWire)
    }

    pub fn join(&mut self, welcome_wire: &[u8]) -> Result<(), SessionError> {
        if welcome_wire.len() > MAX_WIRE_BYTES {
            return Err(SessionError::TooLarge);
        }
        let mut input = welcome_wire;
        let message =
            MlsMessageIn::tls_deserialize(&mut input).map_err(|_| SessionError::InvalidWire)?;
        if !input.is_empty() {
            return Err(SessionError::InvalidWire);
        }
        let welcome = match message.extract() {
            MlsMessageBodyIn::Welcome(welcome) => welcome,
            _ => return Err(SessionError::UnsupportedMessage),
        };
        let staged = StagedWelcome::new_from_welcome(
            &self.provider,
            &MlsGroupJoinConfig::builder()
                .use_ratchet_tree_extension(true)
                .build(),
            welcome,
            None,
        )
        .map_err(|_| SessionError::OpenMls)?;
        self.group = Some(
            staged
                .into_group(&self.provider)
                .map_err(|_| SessionError::OpenMls)?,
        );
        Ok(())
    }

    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, SessionError> {
        if plaintext.len() > MAX_MESSAGE_BYTES {
            return Err(SessionError::TooLarge);
        }
        let group = self.group.as_mut().ok_or(SessionError::NotJoined)?;
        let signer = SessionSigner {
            crypto: self.provider.crypto(),
            private_key: &self.private_signature_key,
        };
        group
            .create_message(&self.provider, &signer, plaintext)
            .map_err(|_| SessionError::OpenMls)?
            .tls_serialize_detached()
            .map_err(|_| SessionError::InvalidWire)
    }

    pub fn decrypt(&mut self, wire: &[u8]) -> Result<Vec<u8>, SessionError> {
        if wire.len() > MAX_WIRE_BYTES {
            return Err(SessionError::TooLarge);
        }
        let mut input = wire;
        let message = MlsMessageIn::tls_deserialize(&mut input)
            .map_err(|_| SessionError::InvalidWire)?
            .try_into_protocol_message()
            .map_err(|_| SessionError::InvalidWire)?;
        if !input.is_empty() {
            return Err(SessionError::InvalidWire);
        }
        let group = self.group.as_mut().ok_or(SessionError::NotJoined)?;
        let processed = group
            .process_message(&self.provider, message)
            .map_err(|_| SessionError::OpenMls)?;
        match processed.into_content() {
            ProcessedMessageContent::ApplicationMessage(message) => Ok(message.into_bytes()),
            ProcessedMessageContent::StagedCommitMessage(commit) => {
                group
                    .merge_staged_commit(&self.provider, *commit)
                    .map_err(|_| SessionError::OpenMls)?;
                Err(SessionError::UnsupportedMessage)
            }
            _ => Err(SessionError::UnsupportedMessage),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{MlsSession, SessionError};

    #[test]
    fn two_sessions_create_join_and_exchange_authenticated_messages() {
        let mut alice = MlsSession::new(b"alice-account".to_vec()).unwrap();
        let bob = MlsSession::new(b"bob-account".to_vec()).unwrap();
        let bob_key_package = bob.key_package().unwrap();
        alice.create_group().unwrap();
        let welcome = alice.add_member(&bob_key_package).unwrap();

        let mut bob = bob;
        bob.join(&welcome).unwrap();
        let wire = alice.encrypt(b"secret message").unwrap();
        assert_eq!(bob.decrypt(&wire).unwrap(), b"secret message");
        assert_eq!(bob.decrypt(&wire), Err(SessionError::OpenMls));
    }

    #[test]
    fn session_rejects_oversized_inputs_before_openmls() {
        let mut alice = MlsSession::new(b"alice".to_vec()).unwrap();
        assert_eq!(
            alice.encrypt(&vec![0; 1024 * 1024 + 1]),
            Err(SessionError::TooLarge)
        );
        assert_eq!(
            alice.join(&vec![0; 4 * 1024 * 1024 + 1]),
            Err(SessionError::TooLarge)
        );
    }
}
