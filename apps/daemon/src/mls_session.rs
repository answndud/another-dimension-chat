//! Minimal real OpenMLS 1:1 session boundary.
//!
//! This module deliberately owns the OpenMLS objects and exposes only
//! serialized messages to the relay boundary. Persistence is added by the
//! next storage slice; this first slice proves the cryptographic lifecycle
//! without allowing the browser to handle MLS state.

use openmls::prelude::{
    BasicCredential, CredentialWithKey, GroupId, KeyPackageIn, Lifetime, MlsGroup,
    MlsGroupCreateConfig, MlsGroupJoinConfig, MlsMessageBodyIn, MlsMessageIn,
    ProcessedMessageContent, ProtocolVersion, SignatureScheme, StagedWelcome,
};
use openmls_libcrux_crypto::CryptoProvider;
use openmls_traits::{
    crypto::OpenMlsCrypto,
    signatures::{Signer, SignerError},
    OpenMlsProvider,
};
use std::collections::BTreeMap;
use tls_codec::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::attachment::AttachmentDescriptor;
use crate::mls_provider::{DaemonProvider, SELECTED_CIPHERSUITE};
use crate::storage::{EncryptedStore, RecordClass};

const MAX_IDENTITY_BYTES: usize = 1024;
const MAX_MESSAGE_BYTES: usize = 1024 * 1024;
const MAX_WIRE_BYTES: usize = 4 * 1024 * 1024;
const ATTACHMENT_MESSAGE_PREFIX: &[u8] = b"ADATT1.";

pub fn attachment_descriptor_from_plaintext(plaintext: &[u8]) -> Option<AttachmentDescriptor> {
    plaintext
        .strip_prefix(ATTACHMENT_MESSAGE_PREFIX)
        .and_then(|encoded| serde_json::from_slice(encoded).ok())
}
const DEFAULT_KEY_PACKAGE_LIFETIME_SECONDS: u64 = 7 * 24 * 60 * 60;
const MAX_KEY_PACKAGE_LIFETIME_SECONDS: u64 = 7 * 24 * 60 * 60;

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
    Storage,
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
            Self::Storage => "MLS session checkpoint storage failed",
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
    provider: DaemonProvider,
    credential: CredentialWithKey,
    private_signature_key: Zeroizing<Vec<u8>>,
    group: Option<MlsGroup>,
    poisoned: bool,
}

#[derive(Debug, Eq, PartialEq)]
pub enum SessionCatalogError {
    DuplicateConversation,
    UnknownConversation,
    Session(SessionError),
}

impl std::fmt::Display for SessionCatalogError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::DuplicateConversation => "conversation already exists",
            Self::UnknownConversation => "conversation does not exist",
            Self::Session(_) => "conversation session operation failed",
        })
    }
}

impl std::error::Error for SessionCatalogError {}

impl From<SessionError> for SessionCatalogError {
    fn from(error: SessionError) -> Self {
        Self::Session(error)
    }
}

/// The daemon-owned conversation registry. The browser receives only
/// serialized KeyPackages, welcomes, ciphertexts, and decrypted text.
pub struct MlsSessionCatalog {
    sessions: BTreeMap<String, MlsSession>,
}

impl MlsSessionCatalog {
    pub fn new() -> Self {
        Self {
            sessions: BTreeMap::new(),
        }
    }

    pub fn conversation_ids(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }

    pub fn create(
        &mut self,
        conversation_id: &str,
        identity: Vec<u8>,
        store: &mut EncryptedStore,
    ) -> Result<(), SessionCatalogError> {
        if self.sessions.contains_key(conversation_id) {
            return Err(SessionCatalogError::DuplicateConversation);
        }
        let mut session = MlsSession::new(identity)?;
        session.create_group_and_persist(store, conversation_id)?;
        self.sessions.insert(conversation_id.to_owned(), session);
        Ok(())
    }

    pub fn join(
        &mut self,
        conversation_id: &str,
        identity: Vec<u8>,
        welcome: &[u8],
        store: &mut EncryptedStore,
    ) -> Result<(), SessionCatalogError> {
        if let Some(session) = self.sessions.get_mut(conversation_id) {
            session.join_and_persist(welcome, store, conversation_id)?;
            return Ok(());
        }
        let mut session = MlsSession::new(identity)?;
        session.join_and_persist(welcome, store, conversation_id)?;
        self.sessions.insert(conversation_id.to_owned(), session);
        Ok(())
    }

    pub fn prepare(
        &mut self,
        conversation_id: &str,
        identity: Vec<u8>,
    ) -> Result<Vec<u8>, SessionCatalogError> {
        if self.sessions.contains_key(conversation_id) {
            return Err(SessionCatalogError::DuplicateConversation);
        }
        let session = MlsSession::new(identity)?;
        let key_package = session.key_package()?;
        self.sessions.insert(conversation_id.to_owned(), session);
        Ok(key_package)
    }

    pub fn restore(
        &mut self,
        conversation_id: &str,
        store: &EncryptedStore,
    ) -> Result<(), SessionCatalogError> {
        if self.sessions.contains_key(conversation_id) {
            return Err(SessionCatalogError::DuplicateConversation);
        }
        let session = MlsSession::restore(store, conversation_id)?;
        self.sessions.insert(conversation_id.to_owned(), session);
        Ok(())
    }

    pub fn restore_all(&mut self, store: &EncryptedStore) -> Result<usize, SessionCatalogError> {
        let conversation_ids = store
            .records_with_prefix(RecordClass::ProtocolSession, "mls/session/")
            .into_iter()
            .filter_map(|(key, _)| key.strip_prefix("mls/session/").map(str::to_owned))
            .collect::<Vec<_>>();
        for conversation_id in &conversation_ids {
            self.restore(conversation_id, store)?;
        }
        Ok(conversation_ids.len())
    }

    pub fn lock(&mut self) {
        self.sessions.clear();
    }

    pub fn key_package(&self, conversation_id: &str) -> Result<Vec<u8>, SessionCatalogError> {
        self.sessions
            .get(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .key_package()
            .map_err(Into::into)
    }

    pub fn add_member(
        &mut self,
        conversation_id: &str,
        key_package: &[u8],
        store: &mut EncryptedStore,
    ) -> Result<Vec<u8>, SessionCatalogError> {
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .add_member_and_persist(key_package, store, conversation_id)
            .map_err(Into::into)
    }

    pub fn send(
        &mut self,
        conversation_id: &str,
        plaintext: &[u8],
        store: &mut EncryptedStore,
    ) -> Result<Vec<u8>, SessionCatalogError> {
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .encrypt_and_persist(plaintext, store, conversation_id)
            .map_err(Into::into)
    }

    pub fn receive(
        &mut self,
        conversation_id: &str,
        wire: &[u8],
        store: &mut EncryptedStore,
    ) -> Result<Vec<u8>, SessionCatalogError> {
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .decrypt_and_persist(wire, store, conversation_id)
            .map_err(Into::into)
    }

    pub fn send_attachment(
        &mut self,
        conversation_id: &str,
        descriptor: &AttachmentDescriptor,
        store: &mut EncryptedStore,
    ) -> Result<Vec<u8>, SessionCatalogError> {
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .encrypt_attachment_and_persist(descriptor, store, conversation_id)
            .map_err(Into::into)
    }

    pub fn receive_attachment(
        &mut self,
        conversation_id: &str,
        wire: &[u8],
        store: &mut EncryptedStore,
    ) -> Result<AttachmentDescriptor, SessionCatalogError> {
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .decrypt_attachment_and_persist(wire, store, conversation_id)
            .map_err(Into::into)
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
struct SessionSnapshot {
    credential: CredentialWithKey,
    private_signature_key: Vec<u8>,
    group_id: Vec<u8>,
    storage: Vec<SnapshotEntry>,
}

#[derive(serde::Deserialize, serde::Serialize)]
struct SnapshotEntry {
    key: Vec<u8>,
    value: Vec<u8>,
}

impl MlsSession {
    pub fn new(identity: Vec<u8>) -> Result<Self, SessionError> {
        if identity.is_empty() || identity.len() > MAX_IDENTITY_BYTES {
            return Err(SessionError::IdentityTooLarge);
        }
        let provider = DaemonProvider::new().map_err(|_| SessionError::Provider)?;
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
            private_signature_key: Zeroizing::new(private_signature_key),
            group: None,
            poisoned: false,
        })
    }

    pub fn key_package(&self) -> Result<Vec<u8>, SessionError> {
        self.ensure_usable()?;
        self.key_package_with_lifetime(DEFAULT_KEY_PACKAGE_LIFETIME_SECONDS)
    }

    /// Generate a bounded-lifetime package. Packages are intentionally
    /// short-lived so a leaked invitation cannot remain usable indefinitely.
    pub fn key_package_with_lifetime(
        &self,
        lifetime_seconds: u64,
    ) -> Result<Vec<u8>, SessionError> {
        self.ensure_usable()?;
        if lifetime_seconds == 0 || lifetime_seconds > MAX_KEY_PACKAGE_LIFETIME_SECONDS {
            return Err(SessionError::TooLarge);
        }
        let signer = SessionSigner {
            crypto: self.provider.crypto(),
            private_key: &self.private_signature_key,
        };
        let bundle = openmls::prelude::KeyPackage::builder()
            .key_package_lifetime(Lifetime::new(lifetime_seconds))
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
        self.ensure_usable()?;
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
        self.ensure_usable()?;
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
        self.ensure_usable()?;
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
        self.ensure_usable()?;
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
        self.ensure_usable()?;
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

    pub fn encrypt_attachment(
        &mut self,
        descriptor: &AttachmentDescriptor,
    ) -> Result<Vec<u8>, SessionError> {
        let encoded = serde_json::to_vec(descriptor).map_err(|_| SessionError::InvalidWire)?;
        let mut payload = Vec::with_capacity(ATTACHMENT_MESSAGE_PREFIX.len() + encoded.len());
        payload.extend_from_slice(ATTACHMENT_MESSAGE_PREFIX);
        payload.extend_from_slice(&encoded);
        self.encrypt(&payload)
    }

    pub fn decrypt_attachment(
        &mut self,
        wire: &[u8],
    ) -> Result<AttachmentDescriptor, SessionError> {
        let payload = self.decrypt(wire)?;
        let encoded = payload
            .strip_prefix(ATTACHMENT_MESSAGE_PREFIX)
            .ok_or(SessionError::UnsupportedMessage)?;
        serde_json::from_slice(encoded).map_err(|_| SessionError::InvalidWire)
    }

    /// Persist the complete OpenMLS memory provider checkpoint inside the
    /// authenticated encrypted daemon store. The browser never receives this
    /// payload and the signing key is covered by the store's AEAD.
    pub fn persist(
        &self,
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<(), SessionError> {
        self.ensure_usable()?;
        let group = self.group.as_ref().ok_or(SessionError::NotJoined)?;
        let storage = self
            .provider
            .storage()
            .values
            .read()
            .map_err(|_| SessionError::Storage)?
            .iter()
            .map(|(key, value)| SnapshotEntry {
                key: key.clone(),
                value: value.clone(),
            })
            .collect();
        let snapshot = SessionSnapshot {
            credential: self.credential.clone(),
            private_signature_key: self.private_signature_key.to_vec(),
            group_id: group
                .group_id()
                .tls_serialize_detached()
                .map_err(|_| SessionError::InvalidWire)?,
            storage,
        };
        let bytes = serde_json::to_vec(&snapshot).map_err(|_| SessionError::Storage)?;
        if bytes.len() > 4 * 1024 * 1024 {
            return Err(SessionError::TooLarge);
        }
        store
            .put(
                RecordClass::ProtocolSession,
                &session_key(conversation_id),
                &bytes,
            )
            .map_err(|_| SessionError::Storage)
    }

    pub fn create_group_and_persist(
        &mut self,
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<(), SessionError> {
        self.create_group()?;
        self.persist_or_poison(store, conversation_id)
    }

    pub fn add_member_and_persist(
        &mut self,
        key_package: &[u8],
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<Vec<u8>, SessionError> {
        let welcome = self.add_member(key_package)?;
        self.persist_or_poison(store, conversation_id)?;
        Ok(welcome)
    }

    pub fn join_and_persist(
        &mut self,
        welcome_wire: &[u8],
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<(), SessionError> {
        self.join(welcome_wire)?;
        self.persist_or_poison(store, conversation_id)
    }

    pub fn encrypt_and_persist(
        &mut self,
        plaintext: &[u8],
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<Vec<u8>, SessionError> {
        let wire = self.encrypt(plaintext)?;
        self.persist_or_poison(store, conversation_id)?;
        Ok(wire)
    }

    pub fn decrypt_and_persist(
        &mut self,
        wire: &[u8],
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<Vec<u8>, SessionError> {
        let plaintext = self.decrypt(wire)?;
        self.persist_or_poison(store, conversation_id)?;
        Ok(plaintext)
    }

    pub fn encrypt_attachment_and_persist(
        &mut self,
        descriptor: &AttachmentDescriptor,
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<Vec<u8>, SessionError> {
        let wire = self.encrypt_attachment(descriptor)?;
        self.persist_or_poison(store, conversation_id)?;
        Ok(wire)
    }

    pub fn decrypt_attachment_and_persist(
        &mut self,
        wire: &[u8],
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<AttachmentDescriptor, SessionError> {
        let descriptor = self.decrypt_attachment(wire)?;
        self.persist_or_poison(store, conversation_id)?;
        Ok(descriptor)
    }

    fn persist_or_poison(
        &mut self,
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<(), SessionError> {
        if let Err(error) = self.persist(store, conversation_id) {
            self.poisoned = true;
            return Err(error);
        }
        Ok(())
    }

    fn ensure_usable(&self) -> Result<(), SessionError> {
        if self.poisoned {
            Err(SessionError::Storage)
        } else {
            Ok(())
        }
    }

    pub fn restore(store: &EncryptedStore, conversation_id: &str) -> Result<Self, SessionError> {
        let bytes = store
            .get(RecordClass::ProtocolSession, &session_key(conversation_id))
            .ok_or(SessionError::Storage)?;
        if bytes.len() > 4 * 1024 * 1024 {
            return Err(SessionError::TooLarge);
        }
        let snapshot: SessionSnapshot =
            serde_json::from_slice(&bytes).map_err(|_| SessionError::Storage)?;
        if snapshot.private_signature_key.is_empty() {
            return Err(SessionError::Storage);
        }
        let provider = DaemonProvider::new().map_err(|_| SessionError::Provider)?;
        provider
            .crypto()
            .supports(SELECTED_CIPHERSUITE)
            .map_err(|_| SessionError::Provider)?;
        {
            let mut values = provider
                .storage()
                .values
                .write()
                .map_err(|_| SessionError::Storage)?;
            values.clear();
            for entry in snapshot.storage {
                values.insert(entry.key, entry.value);
            }
        }
        let group_id = GroupId::tls_deserialize_exact(&snapshot.group_id)
            .map_err(|_| SessionError::InvalidWire)?;
        let group = MlsGroup::load(provider.storage(), &group_id)
            .map_err(|_| SessionError::OpenMls)?
            .ok_or(SessionError::Storage)?;
        Ok(Self {
            provider,
            credential: snapshot.credential,
            private_signature_key: Zeroizing::new(snapshot.private_signature_key),
            group: Some(group),
            poisoned: false,
        })
    }
}

fn session_key(conversation_id: &str) -> String {
    format!("mls/session/{conversation_id}")
}

#[cfg(test)]
mod tests {
    use super::{MlsSession, MlsSessionCatalog, SessionError};

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
    fn attachment_descriptor_is_carried_inside_authenticated_mls_message() {
        let mut alice = MlsSession::new(b"alice-account".to_vec()).unwrap();
        let mut bob = MlsSession::new(b"bob-account".to_vec()).unwrap();
        alice.create_group().unwrap();
        let welcome = alice.add_member(&bob.key_package().unwrap()).unwrap();
        bob.join(&welcome).unwrap();
        let package = crate::attachment::encrypt_for_blob(
            b"private attachment",
            crate::attachment::generate_key().unwrap(),
            &"c".repeat(32),
        )
        .unwrap();
        let wire = alice.encrypt_attachment(&package.descriptor).unwrap();
        let descriptor = bob.decrypt_attachment(&wire).unwrap();
        assert_eq!(descriptor, package.descriptor);
        assert_eq!(
            crate::attachment::decrypt_blob(&descriptor, &package.blob).unwrap(),
            b"private attachment"
        );
    }

    #[test]
    fn session_rejects_oversized_inputs_before_openmls() {
        let mut alice = MlsSession::new(b"alice".to_vec()).unwrap();
        assert_eq!(
            alice.key_package_with_lifetime(0),
            Err(SessionError::TooLarge)
        );
        assert_eq!(
            alice.key_package_with_lifetime(7 * 24 * 60 * 60 + 1),
            Err(SessionError::TooLarge)
        );
        assert_eq!(
            alice.encrypt(&vec![0; 1024 * 1024 + 1]),
            Err(SessionError::TooLarge)
        );
        assert_eq!(
            alice.join(&vec![0; 4 * 1024 * 1024 + 1]),
            Err(SessionError::TooLarge)
        );
    }

    #[test]
    fn encrypted_checkpoint_restores_group_and_continues_ratchet() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-mls-checkpoint-{}",
            std::process::id()
        ));
        let mut store =
            crate::storage::EncryptedStore::initialize(&path, "correct horse battery staple")
                .unwrap();
        let mut alice = MlsSession::new(b"alice-account".to_vec()).unwrap();
        let mut bob = MlsSession::new(b"bob-account".to_vec()).unwrap();
        alice.create_group().unwrap();
        let welcome = alice.add_member(&bob.key_package().unwrap()).unwrap();
        bob.join(&welcome).unwrap();
        alice.persist(&mut store, "conversation-1").unwrap();

        let mut restored = MlsSession::restore(&store, "conversation-1").unwrap();
        let wire = restored.encrypt(b"after restart").unwrap();
        assert_eq!(bob.decrypt(&wire).unwrap(), b"after restart");

        drop(store);
        drop(alice);
        drop(bob);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(path.with_extension("revision"));
    }

    #[test]
    fn catalog_owns_create_join_send_receive_and_restore_flow() {
        let alice_path = std::env::temp_dir().join(format!(
            "another-dimension-catalog-alice-{}",
            std::process::id()
        ));
        let bob_path = std::env::temp_dir().join(format!(
            "another-dimension-catalog-bob-{}",
            std::process::id()
        ));
        let mut alice_store = crate::storage::EncryptedStore::initialize(
            &alice_path,
            "alice correct horse battery staple",
        )
        .unwrap();
        let mut bob_store = crate::storage::EncryptedStore::initialize(
            &bob_path,
            "bob correct horse battery staple",
        )
        .unwrap();
        let mut alice = MlsSessionCatalog::new();
        let mut bob = MlsSessionCatalog::new();
        alice
            .create("conversation-1", b"alice".to_vec(), &mut alice_store)
            .unwrap();
        let bob_key_package = bob.prepare("conversation-1", b"bob".to_vec()).unwrap();
        let welcome = alice
            .add_member("conversation-1", &bob_key_package, &mut alice_store)
            .unwrap();
        bob.join("conversation-1", b"bob".to_vec(), &welcome, &mut bob_store)
            .unwrap();
        let wire = alice
            .send("conversation-1", b"catalog message", &mut alice_store)
            .unwrap();
        assert_eq!(
            bob.receive("conversation-1", &wire, &mut bob_store)
                .unwrap(),
            b"catalog message"
        );

        let mut restored = MlsSessionCatalog::new();
        restored.restore("conversation-1", &alice_store).unwrap();
        let wire = restored
            .send("conversation-1", b"after catalog restart", &mut alice_store)
            .unwrap();
        assert_eq!(
            bob.receive("conversation-1", &wire, &mut bob_store)
                .unwrap(),
            b"after catalog restart"
        );

        drop(alice_store);
        drop(bob_store);
        let _ = std::fs::remove_file(&alice_path);
        let _ = std::fs::remove_file(&bob_path);
        let _ = std::fs::remove_file(alice_path.with_extension("revision"));
        let _ = std::fs::remove_file(bob_path.with_extension("revision"));
    }
}
