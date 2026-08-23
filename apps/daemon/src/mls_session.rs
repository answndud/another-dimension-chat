//! Minimal real OpenMLS 1:1 session boundary.
//!
//! This module owns the OpenMLS objects and exposes only serialized messages
//! to the relay boundary. Session checkpoints are stored in the encrypted
//! daemon store; the browser never handles MLS state.

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
const MAX_MESSAGE_BYTES: usize = 64 * 1024;
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
    InvalidConversation,
    DuplicateConversation,
    UnknownConversation,
    Session(SessionError),
}

impl std::fmt::Display for SessionCatalogError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::InvalidConversation => "conversation identifier is invalid",
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
    device_private_signature_key: Option<Zeroizing<[u8; 32]>>,
}

pub type DeviceRemovalCommit = (String, Vec<u8>, Vec<u8>);

impl Default for MlsSessionCatalog {
    fn default() -> Self {
        Self::new()
    }
}

impl MlsSessionCatalog {
    pub fn new() -> Self {
        Self {
            sessions: BTreeMap::new(),
            device_private_signature_key: None,
        }
    }

    pub fn new_with_device_private_key(device_private_signature_key: [u8; 32]) -> Self {
        Self {
            sessions: BTreeMap::new(),
            device_private_signature_key: Some(Zeroizing::new(device_private_signature_key)),
        }
    }

    fn new_session(&self, identity: Vec<u8>) -> Result<MlsSession, SessionCatalogError> {
        match &self.device_private_signature_key {
            Some(key) => MlsSession::new_with_signature_key(identity, **key).map_err(Into::into),
            None => MlsSession::new(identity).map_err(Into::into),
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
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        if self.sessions.contains_key(conversation_id) {
            return Err(SessionCatalogError::DuplicateConversation);
        }
        let mut session = self.new_session(identity)?;
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
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        if let Some(session) = self.sessions.get_mut(conversation_id) {
            session.join_and_persist(welcome, store, conversation_id)?;
            return Ok(());
        }
        let mut session = self.new_session(identity)?;
        session.join_and_persist(welcome, store, conversation_id)?;
        self.sessions.insert(conversation_id.to_owned(), session);
        Ok(())
    }

    pub fn prepare(
        &mut self,
        conversation_id: &str,
        identity: Vec<u8>,
        store: &mut EncryptedStore,
    ) -> Result<Vec<u8>, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        if self.sessions.contains_key(conversation_id) {
            return Err(SessionCatalogError::DuplicateConversation);
        }
        let mut session = self.new_session(identity)?;
        // The KeyPackage's private HPKE state lives in the provider storage.
        // Persist it before returning the public package; otherwise a daemon
        // restart between pairing steps makes the received Welcome unusable.
        session.create_group()?;
        let key_package = session.key_package()?;
        session.persist_or_poison(store, conversation_id)?;
        self.sessions.insert(conversation_id.to_owned(), session);
        Ok(key_package)
    }

    pub fn restore(
        &mut self,
        conversation_id: &str,
        store: &EncryptedStore,
    ) -> Result<(), SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        if self.sessions.contains_key(conversation_id) {
            return Err(SessionCatalogError::DuplicateConversation);
        }
        let session = MlsSession::restore(store, conversation_id)?;
        if let Some(device_key) = &self.device_private_signature_key {
            if !session.signature_key_matches(device_key) {
                return Err(SessionCatalogError::Session(SessionError::Storage));
            }
        }
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

    pub fn remove(
        &mut self,
        conversation_id: &str,
        store: &mut EncryptedStore,
    ) -> Result<(), SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        if self.sessions.remove(conversation_id).is_none() {
            return Err(SessionCatalogError::UnknownConversation);
        }
        store
            .delete(
                RecordClass::ProtocolSession,
                &format!("mls/session/{conversation_id}"),
            )
            .map_err(|_| SessionError::Storage)?;
        Ok(())
    }

    pub fn lock(&mut self) {
        self.sessions.clear();
    }

    pub fn key_package(&self, conversation_id: &str) -> Result<Vec<u8>, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
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
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .add_member_and_persist(key_package, store, conversation_id)
            .map_err(Into::into)
    }

    pub fn add_members_batch(
        &mut self,
        conversation_id: &str,
        key_packages: &[Vec<u8>],
        store: &mut EncryptedStore,
    ) -> Result<Vec<Vec<u8>>, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        let session = self
            .sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?;
        let mut welcomes = Vec::with_capacity(key_packages.len());
        for key_package in key_packages {
            welcomes.push(
                session
                    .add_member_and_persist(key_package, store, conversation_id)
                    .map_err(SessionCatalogError::from)?,
            );
        }
        Ok(welcomes)
    }

    pub fn remove_group_member(
        &mut self,
        conversation_id: &str,
        device_credential: &[u8],
        store: &mut EncryptedStore,
    ) -> Result<Option<Vec<u8>>, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .remove_member_and_persist(device_credential, store, conversation_id)
            .map_err(Into::into)
    }

    /// Remove every matching device leaf without checkpointing it yet. The
    /// caller must atomically commit the returned checkpoints with the
    /// account device registry before delivering the commits.
    pub fn remove_device_unpersisted(
        &mut self,
        device_credential: &[u8],
    ) -> Result<Vec<DeviceRemovalCommit>, SessionCatalogError> {
        let mut commits = Vec::new();
        for (conversation_id, session) in &mut self.sessions {
            let Some(commit) = session.remove_member(device_credential)? else {
                continue;
            };
            let checkpoint = session.snapshot_bytes()?;
            commits.push((conversation_id.clone(), commit, checkpoint));
        }
        Ok(commits)
    }

    pub fn poison_all(&mut self) {
        for session in self.sessions.values_mut() {
            session.poisoned = true;
        }
    }

    pub fn send_unpersisted(
        &mut self,
        conversation_id: &str,
        plaintext: &[u8],
    ) -> Result<Vec<u8>, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .encrypt(plaintext)
            .map_err(Into::into)
    }

    /// Decrypt an inbound delivery without checkpointing it yet. Callers that
    /// also persist message metadata must commit the returned in-memory state
    /// together with those records, otherwise a storage failure could advance
    /// MLS while losing the plaintext transcript.
    pub fn receive_delivery_unpersisted(
        &mut self,
        conversation_id: &str,
        wire: &[u8],
    ) -> Result<Option<Vec<u8>>, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .decrypt_delivery(wire)
            .map_err(Into::into)
    }

    pub fn receive_attachment_unpersisted(
        &mut self,
        conversation_id: &str,
        wire: &[u8],
    ) -> Result<AttachmentDescriptor, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .decrypt_attachment(wire)
            .map_err(Into::into)
    }

    pub fn checkpoint_bytes(&self, conversation_id: &str) -> Result<Vec<u8>, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        self.sessions
            .get(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .snapshot_bytes()
            .map_err(Into::into)
    }

    pub fn poison(&mut self, conversation_id: &str) {
        if let Some(session) = self.sessions.get_mut(conversation_id) {
            session.poisoned = true;
        }
    }

    pub fn send_attachment_unpersisted(
        &mut self,
        conversation_id: &str,
        descriptor: &AttachmentDescriptor,
    ) -> Result<Vec<u8>, SessionCatalogError> {
        if !valid_conversation_id(conversation_id) {
            return Err(SessionCatalogError::InvalidConversation);
        }
        self.sessions
            .get_mut(conversation_id)
            .ok_or(SessionCatalogError::UnknownConversation)?
            .encrypt_attachment(descriptor)
            .map_err(Into::into)
    }
}

pub(crate) fn valid_conversation_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
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
        Self::from_signature_key(
            identity,
            provider,
            private_signature_key,
            public_signature_key,
        )
    }

    pub fn new_with_signature_key(
        identity: Vec<u8>,
        private_signature_key: [u8; 32],
    ) -> Result<Self, SessionError> {
        if identity.is_empty() || identity.len() > MAX_IDENTITY_BYTES {
            return Err(SessionError::IdentityTooLarge);
        }
        let provider = DaemonProvider::new().map_err(|_| SessionError::Provider)?;
        provider
            .crypto()
            .supports(SELECTED_CIPHERSUITE)
            .map_err(|_| SessionError::Provider)?;
        let public_signature_key = ed25519_dalek::SigningKey::from_bytes(&private_signature_key)
            .verifying_key()
            .to_bytes()
            .to_vec();
        Self::from_signature_key(
            identity,
            provider,
            private_signature_key.to_vec(),
            public_signature_key,
        )
    }

    fn from_signature_key(
        identity: Vec<u8>,
        provider: DaemonProvider,
        private_signature_key: Vec<u8>,
        public_signature_key: Vec<u8>,
    ) -> Result<Self, SessionError> {
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

    pub(crate) fn remove_member(&mut self, device_credential: &[u8]) -> Result<Option<Vec<u8>>, SessionError> {
        self.ensure_usable()?;
        let group = self.group.as_mut().ok_or(SessionError::NotJoined)?;
        let Some(member) = group
            .members()
            .find(|member| member.credential.serialized_content() == device_credential)
        else {
            return Ok(None);
        };
        let signer = SessionSigner {
            crypto: self.provider.crypto(),
            private_key: &self.private_signature_key,
        };
        let (commit, _, _) = group
            .remove_members(&self.provider, &signer, &[member.index])
            .map_err(|_| SessionError::OpenMls)?;
        group
            .merge_pending_commit(&self.provider)
            .map_err(|_| SessionError::OpenMls)?;
        Ok(Some(
            commit
                .tls_serialize_detached()
                .map_err(|_| SessionError::InvalidWire)?,
        ))
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
        self.decrypt_delivery(wire)?
            .ok_or(SessionError::UnsupportedMessage)
    }

    fn decrypt_delivery(&mut self, wire: &[u8]) -> Result<Option<Vec<u8>>, SessionError> {
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
            ProcessedMessageContent::ApplicationMessage(message) => Ok(Some(message.into_bytes())),
            ProcessedMessageContent::StagedCommitMessage(commit) => {
                group
                    .merge_staged_commit(&self.provider, *commit)
                    .map_err(|_| SessionError::OpenMls)?;
                Ok(None)
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
        let bytes = self.snapshot_bytes()?;
        store
            .put(
                RecordClass::ProtocolSession,
                &session_key(conversation_id),
                &bytes,
            )
            .map_err(|_| SessionError::Storage)
    }

    fn snapshot_bytes(&self) -> Result<Vec<u8>, SessionError> {
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
        Ok(bytes)
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

    pub(crate) fn remove_member_and_persist(
        &mut self,
        device_credential: &[u8],
        store: &mut EncryptedStore,
        conversation_id: &str,
    ) -> Result<Option<Vec<u8>>, SessionError> {
        let commit = self.remove_member(device_credential)?;
        if commit.is_some() {
            self.persist_or_poison(store, conversation_id)?;
        }
        Ok(commit)
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

    fn signature_key_matches(&self, private_signature_key: &[u8; 32]) -> bool {
        let expected = ed25519_dalek::SigningKey::from_bytes(private_signature_key)
            .verifying_key()
            .to_bytes();
        self.credential.signature_key.as_slice() == expected
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
        let private_signature_key: [u8; 32] = snapshot
            .private_signature_key
            .as_slice()
            .try_into()
            .map_err(|_| SessionError::Storage)?;
        let expected_public_key = ed25519_dalek::SigningKey::from_bytes(&private_signature_key)
            .verifying_key()
            .to_bytes();
        if snapshot.credential.signature_key.as_slice() != expected_public_key {
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
            private_signature_key: Zeroizing::new(private_signature_key.to_vec()),
            group: Some(group),
            poisoned: false,
        })
    }
}

fn session_key(conversation_id: &str) -> String {
    format!("mls/session/{conversation_id}")
}

pub(crate) fn session_checkpoint_key(conversation_id: &str) -> String {
    session_key(conversation_id)
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
    fn application_messages_allow_bounded_reordering_but_reject_replay() {
        let mut alice = MlsSession::new(b"alice-account".to_vec()).unwrap();
        let mut bob = MlsSession::new(b"bob-account".to_vec()).unwrap();
        alice.create_group().unwrap();
        let welcome = alice.add_member(&bob.key_package().unwrap()).unwrap();
        bob.join(&welcome).unwrap();

        let first = alice.encrypt(b"first").unwrap();
        let second = alice.encrypt(b"second").unwrap();
        assert_eq!(bob.decrypt(&second).unwrap(), b"second");
        assert_eq!(bob.decrypt(&first).unwrap(), b"first");
        assert_eq!(bob.decrypt(&second), Err(SessionError::OpenMls));
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
    fn linked_device_seed_can_sign_an_openmls_key_package() {
        let session =
            MlsSession::new_with_signature_key(b"linked-device".to_vec(), [79; 32]).unwrap();
        assert!(!session.key_package().unwrap().is_empty());
    }

    #[test]
    fn device_member_can_be_removed_with_an_authenticated_commit() {
        let mut alice = MlsSession::new(b"ADDEVICE1\nalice\nroot".to_vec()).unwrap();
        let mut bob = MlsSession::new(b"ADDEVICE1\nalice\nphone".to_vec()).unwrap();
        alice.create_group().unwrap();
        let welcome = alice.add_member(&bob.key_package().unwrap()).unwrap();
        bob.join(&welcome).unwrap();
        let commit = alice
            .remove_member(b"ADDEVICE1\nalice\nphone")
            .unwrap()
            .unwrap();
        assert_eq!(bob.decrypt(&commit), Err(SessionError::UnsupportedMessage));
        assert!(bob.encrypt(b"after removal").is_err());
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

        let snapshot = store
            .get(
                crate::storage::RecordClass::ProtocolSession,
                "mls/session/conversation-1",
            )
            .unwrap();
        let mut tampered: serde_json::Value = serde_json::from_slice(&snapshot).unwrap();
        tampered["private_signature_key"] = serde_json::json!(vec![0_u8; 32]);
        store
            .put(
                crate::storage::RecordClass::ProtocolSession,
                "mls/session/conversation-1",
                &serde_json::to_vec(&tampered).unwrap(),
            )
            .unwrap();
        assert!(matches!(
            MlsSession::restore(&store, "conversation-1"),
            Err(SessionError::Storage)
        ));

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
        let bob_key_package = bob
            .prepare("conversation-1", b"bob".to_vec(), &mut bob_store)
            .unwrap();
        drop(bob);
        let mut bob = MlsSessionCatalog::new();
        bob.restore("conversation-1", &bob_store).unwrap();
        let welcome = alice
            .add_member("conversation-1", &bob_key_package, &mut alice_store)
            .unwrap();
        bob.join("conversation-1", b"bob".to_vec(), &welcome, &mut bob_store)
            .unwrap();
        let wire = alice
            .send_unpersisted("conversation-1", b"catalog message")
            .unwrap();
        alice_store
            .put(
                crate::storage::RecordClass::ProtocolSession,
                "mls/session/conversation-1",
                &alice.checkpoint_bytes("conversation-1").unwrap(),
            )
            .unwrap();
        assert_eq!(
            bob.receive_delivery_unpersisted("conversation-1", &wire)
                .unwrap(),
            Some(b"catalog message".to_vec())
        );
        bob_store
            .put(
                crate::storage::RecordClass::ProtocolSession,
                "mls/session/conversation-1",
                &bob.checkpoint_bytes("conversation-1").unwrap(),
            )
            .unwrap();
        let wire = alice
            .send_unpersisted("conversation-1", b"transactional inbound")
            .unwrap();
        alice_store
            .put(
                crate::storage::RecordClass::ProtocolSession,
                "mls/session/conversation-1",
                &alice.checkpoint_bytes("conversation-1").unwrap(),
            )
            .unwrap();
        let before = bob_store
            .get(
                crate::storage::RecordClass::ProtocolSession,
                "mls/session/conversation-1",
            )
            .unwrap();
        assert_eq!(
            bob.receive_delivery_unpersisted("conversation-1", &wire)
                .unwrap(),
            Some(b"transactional inbound".to_vec())
        );
        assert_eq!(
            bob_store
                .get(
                    crate::storage::RecordClass::ProtocolSession,
                    "mls/session/conversation-1",
                )
                .unwrap(),
            before
        );
        bob_store
            .put(
                crate::storage::RecordClass::ProtocolSession,
                "mls/session/conversation-1",
                &bob.checkpoint_bytes("conversation-1").unwrap(),
            )
            .unwrap();

        let mut mismatched = MlsSessionCatalog::new_with_device_private_key([7; 32]);
        assert!(matches!(
            mismatched.restore("conversation-1", &alice_store),
            Err(super::SessionCatalogError::Session(SessionError::Storage))
        ));

        let mut restored = MlsSessionCatalog::new();
        restored.restore("conversation-1", &alice_store).unwrap();
        let wire = restored
            .send_unpersisted("conversation-1", b"after catalog restart")
            .unwrap();
        alice_store
            .put(
                crate::storage::RecordClass::ProtocolSession,
                "mls/session/conversation-1",
                &restored.checkpoint_bytes("conversation-1").unwrap(),
            )
            .unwrap();
        assert_eq!(
            bob.receive_delivery_unpersisted("conversation-1", &wire)
                .unwrap(),
            Some(b"after catalog restart".to_vec())
        );

        drop(alice_store);
        drop(bob_store);
        let _ = std::fs::remove_file(&alice_path);
        let _ = std::fs::remove_file(&bob_path);
        let _ = std::fs::remove_file(alice_path.with_extension("revision"));
        let _ = std::fs::remove_file(bob_path.with_extension("revision"));
    }
}
