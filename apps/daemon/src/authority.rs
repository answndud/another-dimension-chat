use super::*;
use crate::attachment::validate_descriptor;
use axum::http::Uri;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IdentityView {
    pub account_id: String,
    pub device_id: String,
    pub display_name: String,
}

pub(crate) fn mls_device_credential(account_id: &str, device_id: &str) -> Vec<u8> {
    format!("ADDEVICE1\n{account_id}\n{device_id}").into_bytes()
}

pub struct InviteAuthority {
    pub(crate) root: Option<AccountRootKey>,
    pub(crate) account_id: String,
    pub(crate) device_id: String,
    pub(crate) relay_origin: String,
    pub(crate) inbox_url: Option<String>,
    pub(crate) relay_public_key: Option<[u8; 32]>,
    pub(crate) relay_tls_pin: Option<TlsCertificatePin>,
    pub(crate) relay_trust: Option<RelayTrust>,
    pub(crate) pending: Option<([u8; 32], u64)>,
    pub(crate) pending_rendezvous_codes: Vec<String>,
    pub(crate) pending_conversation_id: Option<String>,
    pub(crate) pending_key_packages: Vec<Vec<u8>>,
    pub(crate) staged_peer: Option<VerifiedInvite>,
    pub(crate) pairing: PairingSession,
    pub(crate) contacts: ContactDirectory,
    pub(crate) device_registry: DeviceRegistry,
    pub(crate) attachment_jobs: std::collections::BTreeMap<String, AttachmentJob>,
    pub(crate) attachment_job_started_at: std::collections::BTreeMap<String, u64>,
    pub(crate) completed_attachments: std::collections::BTreeMap<String, EncryptedAttachment>,
    pub(crate) completed_attachment_created_at: std::collections::BTreeMap<String, u64>,
    pub(crate) received_attachments: std::collections::BTreeMap<String, AttachmentDescriptor>,
}

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct VerifiedInvite {
    pub account_id: String,
    pub device_id: String,
    pub expires_at: u64,
    pub relay_origin: String,
    #[serde(default)]
    pub inbox_url: Option<String>,
    #[serde(default)]
    pub conversation_id: Option<String>,
}

pub fn verify_signed_invite(code: &str, signed_invite: &str, now: u64) -> Option<VerifiedInvite> {
    verify_signed_invite_with_code(Some(code), signed_invite, now)
}

pub(crate) fn verify_signed_invite_unbound(
    signed_invite: &str,
    now: u64,
) -> Option<VerifiedInvite> {
    verify_signed_invite_with_code(None, signed_invite, now)
}

pub(crate) fn verify_signed_invite_with_code(
    expected_code: Option<&str>,
    signed_invite: &str,
    now: u64,
) -> Option<VerifiedInvite> {
    let mut parts = signed_invite.split('.');
    if parts.next()? != "ADDAINV1" {
        return None;
    }
    let payload = hex_decode(parts.next()?)?;
    let signature = hex_decode(parts.next()?)?;
    if parts.next().is_some() || signature.len() != 64 {
        return None;
    }
    let mut lines = std::str::from_utf8(&payload).ok()?.split('\n');
    if lines.next()? != "another-dimension/invite/v1" {
        return None;
    }
    let account_id = lines.next()?.to_owned();
    let device_id = lines.next()?.to_owned();
    let code_hash = lines.next()?;
    let expires_at = lines.next()?.parse::<u64>().ok()?;
    let relay_origin = lines.next()?.to_owned();
    let inbox_url = lines
        .next()
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    let conversation_id = lines
        .next()
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    if lines.next().is_some()
        || !account_id.starts_with("ad1pk")
        || now >= expires_at
        || expires_at > now.saturating_add(MAX_INVITE_TTL_SECONDS)
    {
        return None;
    }
    if conversation_id
        .as_deref()
        .is_some_and(|value| !value.starts_with("adconv") || value.len() > 80)
    {
        return None;
    }
    if let Some(inbox_url) = &inbox_url {
        validate_bound_inbox_url(&relay_origin, inbox_url).ok()?;
    }
    let public_key = hex_decode(account_id.strip_prefix("ad1pk")?)?;
    if public_key.len() != 32
        || !code_hash
            .chars()
            .all(|character| character.is_ascii_hexdigit())
        || code_hash.len() != 64
    {
        return None;
    }
    if let Some(code) = expected_code {
        if code.is_empty() {
            return None;
        }
        let normalized_code: String = code.chars().filter(|character| *character != '-').collect();
        let expected_hash: [u8; 32] = Sha256::digest(normalized_code.as_bytes()).into();
        if code_hash != hex_bytes(&expected_hash) {
            return None;
        }
    }
    let key_bytes: [u8; 32] = public_key.try_into().ok()?;
    let key = VerifyingKey::from_bytes(&key_bytes).ok()?;
    let signature_bytes: [u8; 64] = signature.try_into().ok()?;
    key.verify(&payload, &Signature::from_bytes(&signature_bytes))
        .ok()?;
    Some(VerifiedInvite {
        account_id,
        device_id,
        expires_at,
        relay_origin,
        inbox_url,
        conversation_id,
    })
}

pub(crate) fn verify_relay_receipt(
    code: &str,
    signed_invite: &str,
    receipt: &str,
    invite: &VerifiedInvite,
    public_key: Option<[u8; 32]>,
    relay_trust: Option<&RelayTrust>,
    now: u64,
) -> bool {
    let parts: Vec<_> = receipt.split('.').collect();
    if parts.len() != 7 || parts[0] != "ADRECEIPT1" {
        return false;
    }
    let Some(public_key) = public_key else {
        return false;
    };
    if let Some(trust) = relay_trust {
        if !trust.allows(&public_key) {
            return false;
        }
    }
    let expected_key_id = Sha256::digest(public_key);
    let origin = String::from_utf8(hex_decode(parts[2]).unwrap_or_default()).ok();
    let normalized_code: String = code
        .chars()
        .filter(|character| *character != '-')
        .flat_map(char::to_uppercase)
        .collect();
    let code_hash: [u8; 32] = Sha256::digest(normalized_code.as_bytes()).into();
    let invite_digest: [u8; 32] = Sha256::digest(signed_invite.as_bytes()).into();
    let consumed_at = parts[5].parse::<u64>().ok();
    let signature = hex_decode(parts[6]).and_then(|value| value.try_into().ok());
    let verifying_key = ed25519_dalek::VerifyingKey::from_bytes(&public_key).ok();
    let signed_body = receipt.rsplit_once('.').map(|(body, _)| body);
    origin.as_deref() == Some(invite.relay_origin.as_str())
        && parts[1] == hex_bytes(&expected_key_id)
        && parts[3] == hex_bytes(&code_hash)
        && parts[4] == hex_bytes(&invite_digest)
        && consumed_at.is_some_and(|value| value <= now.saturating_add(300))
        && signature
            .zip(verifying_key)
            .zip(signed_body)
            .is_some_and(|((signature, key), body)| {
                key.verify_strict(
                    body.as_bytes(),
                    &ed25519_dalek::Signature::from_bytes(&signature),
                )
                .is_ok()
            })
}

pub(crate) fn validate_bound_inbox_url(relay_origin: &str, inbox_url: &str) -> Result<(), ()> {
    let uri: Uri = inbox_url.parse().map_err(|_| ())?;
    let scheme = uri.scheme_str().ok_or(())?;
    if scheme != "http" && scheme != "https" {
        return Err(());
    }
    let authority = uri.authority().ok_or(())?;
    if format!("{scheme}://{authority}") != relay_origin
        || uri.query().is_some()
        || !uri.path().starts_with("/api/v1/inbox/")
    {
        return Err(());
    }
    let capability = uri.path().rsplit('/').next().ok_or(())?;
    if capability.len() != 43
        || !capability
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
    {
        return Err(());
    }
    Ok(())
}

impl InviteAuthority {
    pub fn new(
        root: AccountRootKey,
        device_id: impl Into<String>,
        relay_origin: impl Into<String>,
        inbox_url: Option<String>,
        relay_public_key: Option<[u8; 32]>,
        relay_tls_pin: Option<TlsCertificatePin>,
        relay_trust: Option<RelayTrust>,
    ) -> Self {
        Self::new_internal(
            Some(root),
            device_id,
            relay_origin,
            inbox_url,
            relay_public_key,
            relay_tls_pin,
            relay_trust,
        )
    }

    pub fn new_rootless(
        account_public_key: [u8; 32],
        device_id: impl Into<String>,
        relay_origin: impl Into<String>,
        inbox_url: Option<String>,
        relay_public_key: Option<[u8; 32]>,
        relay_tls_pin: Option<TlsCertificatePin>,
        relay_trust: Option<RelayTrust>,
    ) -> Self {
        Self::new_internal(
            None,
            device_id,
            relay_origin,
            inbox_url,
            relay_public_key,
            relay_tls_pin,
            relay_trust,
        )
        .with_public_account_key(account_public_key)
    }

    pub(crate) fn new_internal(
        root: Option<AccountRootKey>,
        device_id: impl Into<String>,
        relay_origin: impl Into<String>,
        inbox_url: Option<String>,
        relay_public_key: Option<[u8; 32]>,
        relay_tls_pin: Option<TlsCertificatePin>,
        relay_trust: Option<RelayTrust>,
    ) -> Self {
        let device_id = device_id.into();
        let local_account_id = root
            .as_ref()
            .map(|value| value.account_id().as_str().to_owned())
            .unwrap_or_default();
        let device_registry = root
            .as_ref()
            .map(DeviceRegistry::new)
            .unwrap_or_else(|| DeviceRegistry::new_for_public_key([0; 32]));
        Self {
            root,
            account_id: local_account_id.clone(),
            device_id: device_id.clone(),
            relay_origin: relay_origin.into(),
            inbox_url,
            relay_public_key,
            relay_tls_pin,
            relay_trust,
            pending: None,
            pending_rendezvous_codes: Vec::new(),
            pending_conversation_id: None,
            pending_key_packages: Vec::new(),
            staged_peer: None,
            pairing: PairingSession::new(local_account_id, device_id),
            contacts: ContactDirectory::new(),
            device_registry,
            attachment_jobs: std::collections::BTreeMap::new(),
            attachment_job_started_at: std::collections::BTreeMap::new(),
            completed_attachments: std::collections::BTreeMap::new(),
            completed_attachment_created_at: std::collections::BTreeMap::new(),
            received_attachments: std::collections::BTreeMap::new(),
        }
    }

    pub(crate) fn with_public_account_key(mut self, account_public_key: [u8; 32]) -> Self {
        self.account_id = AccountRootKey::account_id_from_public_key(account_public_key)
            .as_str()
            .to_owned();
        self.pairing = PairingSession::new(self.account_id.clone(), self.device_id.clone());
        self.device_registry = DeviceRegistry::new_for_public_key(account_public_key);
        self
    }

    pub(crate) fn attachment_start(
        &mut self,
        blob_id: &str,
        total: usize,
        file_name: Option<&str>,
        media_type: Option<&str>,
        now: u64,
    ) -> Result<(), crate::attachment::AttachmentError> {
        if self.attachment_jobs.contains_key(blob_id) {
            return Err(crate::attachment::AttachmentError::InvalidManifest);
        }
        if !self.attachment_jobs.is_empty()
            || self.completed_attachments.len() >= MAX_COMPLETED_ATTACHMENT_COUNT
            || self
                .completed_attachments
                .values()
                .map(|item| item.blob.len())
                .sum::<usize>()
                .saturating_add(total)
                > MAX_COMPLETED_ATTACHMENT_BYTES
        {
            return Err(crate::attachment::AttachmentError::TooLarge);
        }
        self.attachment_jobs.insert(
            blob_id.to_owned(),
            AttachmentJob::start_with_metadata(blob_id, total, file_name, media_type)?,
        );
        self.attachment_job_started_at
            .insert(blob_id.to_owned(), now);
        Ok(())
    }

    pub(crate) fn attachment_append(
        &mut self,
        blob_id: &str,
        index: u32,
        plaintext: &[u8],
    ) -> Result<(), crate::attachment::AttachmentError> {
        self.attachment_jobs
            .get_mut(blob_id)
            .ok_or(crate::attachment::AttachmentError::InvalidManifest)?
            .append(index, plaintext)
    }

    pub(crate) fn attachment_finish(
        &mut self,
        blob_id: &str,
        now: u64,
    ) -> Result<(), crate::attachment::AttachmentError> {
        let package = self
            .attachment_jobs
            .remove(blob_id)
            .ok_or(crate::attachment::AttachmentError::InvalidManifest)?
            .finish()?;
        self.attachment_job_started_at.remove(blob_id);
        self.completed_attachments
            .insert(blob_id.to_owned(), package);
        self.completed_attachment_created_at
            .insert(blob_id.to_owned(), now);
        Ok(())
    }

    pub(crate) fn take_completed_attachment(
        &mut self,
        blob_id: &str,
    ) -> Option<EncryptedAttachment> {
        self.completed_attachment_created_at.remove(blob_id);
        self.completed_attachments.remove(blob_id)
    }

    pub(crate) fn take_completed_attachment_if_equal(
        &mut self,
        blob_id: &str,
        expected: &EncryptedAttachment,
    ) -> bool {
        let Some(current) = self.completed_attachments.get(blob_id) else {
            return false;
        };
        if current != expected {
            return false;
        }
        self.take_completed_attachment(blob_id).is_some()
    }

    pub(crate) fn cancel_attachment(&mut self, blob_id: &str, store: &mut EncryptedStore) -> bool {
        let cancelled = self.attachment_jobs.remove(blob_id).is_some()
            || self.completed_attachments.remove(blob_id).is_some()
            || self.received_attachments.remove(blob_id).is_some();
        self.attachment_job_started_at.remove(blob_id);
        self.completed_attachment_created_at.remove(blob_id);
        if cancelled {
            let _ = store.delete(RecordClass::Attachment, &format!("received/{blob_id}"));
        }
        cancelled
    }

    pub(crate) fn stage_received_attachment(
        &mut self,
        attachment_id: &str,
        descriptor: AttachmentDescriptor,
    ) -> Result<Vec<u8>, StorageError> {
        let encoded = serde_json::to_vec(&descriptor).map_err(|_| StorageError::CorruptStore)?;
        self.received_attachments
            .insert(attachment_id.to_owned(), descriptor);
        Ok(encoded)
    }

    pub(crate) fn contacts_snapshot_bytes(&self) -> Result<Vec<u8>, StorageError> {
        self.contacts.snapshot_bytes()
    }

    pub(crate) fn received_attachment(&self, attachment_id: &str) -> Option<&AttachmentDescriptor> {
        self.received_attachments.get(attachment_id)
    }

    pub(crate) fn clear_attachment_state(&mut self) {
        self.attachment_jobs.clear();
        self.attachment_job_started_at.clear();
        self.completed_attachments.clear();
        self.completed_attachment_created_at.clear();
        self.received_attachments.clear();
    }

    pub(crate) fn purge_attachment_state(&mut self, now: u64) {
        let expired_jobs = self
            .attachment_job_started_at
            .iter()
            .filter_map(|(id, started)| {
                (now.saturating_sub(*started) > COMPLETED_ATTACHMENT_TTL_SECONDS)
                    .then_some(id.clone())
            })
            .collect::<Vec<_>>();
        for id in expired_jobs {
            self.attachment_job_started_at.remove(&id);
            self.attachment_jobs.remove(&id);
        }
        let expired_completed = self
            .completed_attachment_created_at
            .iter()
            .filter_map(|(id, created)| {
                (now.saturating_sub(*created) > COMPLETED_ATTACHMENT_TTL_SECONDS)
                    .then_some(id.clone())
            })
            .collect::<Vec<_>>();
        for id in expired_completed {
            self.completed_attachment_created_at.remove(&id);
            self.completed_attachments.remove(&id);
        }
    }

    pub fn restore_contacts(&mut self, store: &EncryptedStore) -> Result<(), StorageError> {
        self.contacts = ContactDirectory::restore(store)?;
        Ok(())
    }

    pub fn restore_received_attachments(
        &mut self,
        store: &EncryptedStore,
    ) -> Result<(), StorageError> {
        self.received_attachments.clear();
        for (key, value) in store.records_with_prefix(RecordClass::Attachment, "received/") {
            let attachment_id = key
                .strip_prefix("received/")
                .ok_or(StorageError::CorruptStore)?;
            let descriptor: AttachmentDescriptor =
                serde_json::from_slice(&value).map_err(|_| StorageError::CorruptStore)?;
            validate_descriptor(&descriptor).map_err(|_| StorageError::CorruptStore)?;
            self.received_attachments
                .insert(attachment_id.to_owned(), descriptor);
        }
        Ok(())
    }

    pub(crate) fn register_approved_contact(
        &mut self,
        now: u64,
        store: &mut EncryptedStore,
    ) -> Result<(), ContactDirectoryError> {
        let peer = self
            .pairing
            .snapshot()
            .peer
            .ok_or(ContactDirectoryError::ContactNotFound)?;
        let conversation_id = peer.conversation_id.clone();
        let account_id = peer.account_id.clone();
        self.contacts.upsert_verified_with_inbox(
            peer.account_id,
            peer.device_id,
            peer.relay_origin,
            peer.inbox_url,
            now,
        )?;
        if let Some(conversation_id) = conversation_id {
            self.contacts
                .bind_conversation(&account_id, &conversation_id)?;
        }
        self.contacts
            .persist(store)
            .map_err(|_| ContactDirectoryError::Corrupt)
    }

    pub(crate) fn contacts(&self) -> Vec<crate::contacts::ContactRecord> {
        self.contacts.list()
    }

    pub(crate) fn set_contact_alias(
        &mut self,
        account_id: &str,
        alias: &str,
        store: &mut EncryptedStore,
    ) -> Result<(), ContactDirectoryError> {
        self.contacts.set_alias(account_id, alias)?;
        self.contacts
            .persist(store)
            .map_err(|_| ContactDirectoryError::Corrupt)
    }

    pub(crate) fn set_contact_blocked(
        &mut self,
        account_id: &str,
        blocked: bool,
        store: &mut EncryptedStore,
    ) -> Result<(), ContactDirectoryError> {
        if blocked {
            self.contacts.block(account_id)?;
        } else {
            self.contacts.unblock(account_id)?;
        }
        self.contacts
            .persist(store)
            .map_err(|_| ContactDirectoryError::Corrupt)
    }

    pub(crate) fn remove_contact(
        &mut self,
        account_id: &str,
        store: &mut EncryptedStore,
    ) -> Result<crate::contacts::ContactRecord, ContactDirectoryError> {
        let removed = self.contacts.remove(account_id)?;
        self.contacts
            .persist(store)
            .map_err(|_| ContactDirectoryError::Corrupt)?;
        Ok(removed)
    }

    pub(crate) fn bind_contact_conversation(
        &mut self,
        account_id: &str,
        conversation_id: &str,
        store: &mut EncryptedStore,
    ) -> Result<(), ContactDirectoryError> {
        self.contacts
            .bind_conversation(account_id, conversation_id)?;
        self.contacts
            .persist(store)
            .map_err(|_| ContactDirectoryError::Corrupt)
    }

    pub(crate) fn mark_contact_read(
        &mut self,
        account_id: &str,
        store: &mut EncryptedStore,
    ) -> Result<(), ContactDirectoryError> {
        self.contacts.mark_read(account_id)?;
        self.contacts
            .persist(store)
            .map_err(|_| ContactDirectoryError::Corrupt)
    }

    pub(crate) fn stage_contact_message(
        &mut self,
        conversation_id: &str,
        plaintext: &[u8],
        now: u64,
        background: bool,
    ) -> Result<(), ContactDirectoryError> {
        let preview = String::from_utf8_lossy(plaintext)
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ");
        let preview = preview.chars().take(160).collect::<String>();
        self.contacts
            .record_message(conversation_id, &preview, now, background)?;
        Ok(())
    }

    pub(crate) fn create(
        &mut self,
        now: u64,
        conversation_id: Option<&str>,
    ) -> Option<(String, String)> {
        // A long-lived daemon must re-check the current device certificate at
        // every identity-bearing operation. Startup validation alone would
        // allow an expired or revoked device to keep creating invites.
        self.device_registry.authorize(&self.device_id, now).ok()?;
        let root = self.root.as_ref()?;
        let mut bytes = [0_u8; 32];
        getrandom::fill(&mut bytes).ok()?;
        let code = hex_bytes(&bytes).to_ascii_uppercase();
        let expires_at = now.saturating_add(600);
        let normalized_code: String = code
            .chars()
            .filter(|character| *character != '-')
            .flat_map(char::to_uppercase)
            .collect();
        let code_hash: [u8; 32] = Sha256::digest(normalized_code.as_bytes()).into();
        let payload = format!(
            "another-dimension/invite/v1\n{}\n{}\n{}\n{}\n{}\n{}\n{}",
            root.account_id().as_str(),
            self.device_id,
            hex_bytes(&code_hash),
            expires_at,
            self.relay_origin,
            self.inbox_url.as_deref().unwrap_or(""),
            conversation_id.unwrap_or("")
        );
        let signature = root.sign(payload.as_bytes());
        self.pending = Some((code_hash, expires_at));
        Some((
            code,
            format!(
                "ADDAINV1.{}.{}",
                hex_bytes(payload.as_bytes()),
                hex_bytes(&signature)
            ),
        ))
    }

    pub fn restore_pairing(&mut self, store: &EncryptedStore) -> Result<(), StorageError> {
        self.pairing =
            PairingSession::restore(self.account_id.clone(), self.device_id.clone(), store)?;
        Ok(())
    }

    pub(crate) fn mark_invite_created(
        &mut self,
        store: &mut EncryptedStore,
    ) -> Result<(), PairingError> {
        self.pairing.mark_invite_created()?;
        self.pairing
            .persist(store)
            .map_err(|_| PairingError::InvalidTransition)
    }

    pub(crate) fn stage_peer(
        &mut self,
        invite: VerifiedInvite,
        now: u64,
        store: &mut EncryptedStore,
    ) -> Result<(), PairingError> {
        self.pairing.verify_peer(invite.clone(), now)?;
        self.pairing
            .persist(store)
            .map_err(|_| PairingError::InvalidTransition)?;
        self.staged_peer = Some(invite);
        Ok(())
    }

    pub(crate) fn approve_pairing(
        &mut self,
        now: u64,
        store: &mut EncryptedStore,
    ) -> Result<(), PairingError> {
        self.pairing.approve(now)?;
        self.pairing
            .persist(store)
            .map_err(|_| PairingError::InvalidTransition)
    }

    pub(crate) fn confirm_safety(
        &mut self,
        value: &str,
        store: &mut EncryptedStore,
    ) -> Result<(), PairingError> {
        self.pairing.confirm_safety(value)?;
        self.pairing
            .persist(store)
            .map_err(|_| PairingError::InvalidTransition)
    }

    pub(crate) fn unverify_safety(
        &mut self,
        store: &mut EncryptedStore,
    ) -> Result<(), PairingError> {
        self.pairing.unverify_safety()?;
        self.pairing
            .persist(store)
            .map_err(|_| PairingError::InvalidTransition)
    }

    pub(crate) fn reject_pairing(
        &mut self,
        store: &mut EncryptedStore,
    ) -> Result<(), PairingError> {
        self.pairing.reject()?;
        self.pairing
            .persist(store)
            .map_err(|_| PairingError::InvalidTransition)
    }

    pub(crate) fn invalidate_relay_binding(
        &mut self,
        store: &mut EncryptedStore,
    ) -> Result<(), PairingError> {
        self.pairing.invalidate_binding()?;
        self.pairing
            .persist(store)
            .map_err(|_| PairingError::InvalidTransition)
    }

    pub fn set_device_registry(&mut self, registry: DeviceRegistry) {
        self.device_registry = registry;
    }

    pub(crate) fn restore_device_registry(
        &mut self,
        encoded: &[u8],
    ) -> Result<(), DeviceRegistryError> {
        self.device_registry = DeviceRegistry::decode(encoded)?;
        Ok(())
    }

    pub(crate) fn revoke_device_unpersisted(
        &mut self,
        device_id: &str,
        now: u64,
    ) -> Result<(Vec<u8>, Vec<u8>), DeviceActionError> {
        if device_id == self.device_id {
            return Err(DeviceActionError::CurrentDevice);
        }
        let previous = self
            .device_registry
            .encode()
            .map_err(|_| DeviceActionError::Registry(DeviceRegistryError::Corrupt))?;
        let root = self
            .root
            .as_ref()
            .ok_or(DeviceActionError::RootUnavailable)?;
        self.device_registry
            .revoke(root, device_id, now)
            .map_err(DeviceActionError::Registry)?;
        let encoded = self
            .device_registry
            .encode()
            .map_err(|_| DeviceActionError::Registry(DeviceRegistryError::Corrupt))?;
        Ok((previous, encoded))
    }

    pub(crate) fn approve_device_link(
        &mut self,
        request: &DeviceLinkRequest,
        code: &str,
        now: u64,
        store: &mut EncryptedStore,
    ) -> Result<String, DeviceActionError> {
        let root = self
            .root
            .as_ref()
            .ok_or(DeviceActionError::RootUnavailable)?;
        let approval = request
            .approve(code, root, now)
            .map_err(DeviceActionError::Link)?;
        let previous = self
            .device_registry
            .encode()
            .map_err(|_| DeviceActionError::Registry(DeviceRegistryError::Corrupt))?;
        self.device_registry
            .register(approval.certificate().clone(), now)
            .map_err(DeviceActionError::Registry)?;
        let encoded = self
            .device_registry
            .encode()
            .map_err(|_| DeviceActionError::Registry(DeviceRegistryError::Corrupt))?;
        if store
            .put(RecordClass::Device, "registry", &encoded)
            .is_err()
        {
            self.device_registry = DeviceRegistry::decode(&previous)
                .map_err(|_| DeviceActionError::Registry(DeviceRegistryError::Corrupt))?;
            return Err(DeviceActionError::Storage);
        }
        approval.encode().map_err(DeviceActionError::Link)
    }
}

#[cfg(test)]
mod tests {
    use super::InviteAuthority;
    use crate::{device::DeviceRegistry, identity::AccountRootKey};

    #[test]
    fn invite_creation_rechecks_current_device_certificate() {
        let root = AccountRootKey::from_seed([7; 32]);
        let device = root
            .issue_device("device-1", [0; 32], 1, 100)
            .expect("fixture device certificate");
        let mut registry = DeviceRegistry::new(&root);
        registry.register(device.certificate().clone(), 1).unwrap();

        let mut authority = InviteAuthority::new(
            root,
            "device-1",
            "http://127.0.0.1:1422",
            None,
            None,
            None,
            None,
        );
        authority.set_device_registry(registry);
        assert!(authority.create(10, None).is_some());

        let revoke_root = AccountRootKey::from_seed([7; 32]);
        authority
            .device_registry
            .revoke(&revoke_root, "device-1", 20)
            .unwrap();
        assert!(authority.create(20, None).is_none());
    }
}
