//! Durable local contact directory for multiple independent pairings.

use crate::protocol_gate::validate_protocol_identifier;
use crate::storage::{EncryptedStore, RecordClass, StorageError};
use std::collections::BTreeMap;

const DIRECTORY_VERSION: u16 = 1;
const MAX_ALIAS_BYTES: usize = 128;
const MAX_PREVIEW_BYTES: usize = 4 * 1024;
const MAX_CONTACTS: usize = crate::storage::MAX_RECORDS;

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct ContactRecord {
    pub account_id: String,
    pub device_id: String,
    pub relay_origin: String,
    #[serde(default)]
    pub inbox_url: Option<String>,
    pub alias: Option<String>,
    pub state: String,
    #[serde(default)]
    pub conversation_id: Option<String>,
    #[serde(default)]
    pub last_message_preview: Option<String>,
    pub last_message_at: Option<u64>,
    pub unread_count: u32,
}

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
struct DirectorySnapshot {
    version: u16,
    contacts: BTreeMap<String, ContactRecord>,
}

#[derive(Debug, Eq, PartialEq)]
pub enum ContactDirectoryError {
    DuplicateDevice,
    ContactNotFound,
    InvalidAlias,
    Corrupt,
    InvalidState,
}

pub struct ContactDirectory {
    contacts: BTreeMap<String, ContactRecord>,
}

impl Default for ContactDirectory {
    fn default() -> Self {
        Self::new()
    }
}

impl ContactDirectory {
    pub fn new() -> Self {
        Self {
            contacts: BTreeMap::new(),
        }
    }

    pub fn upsert_verified(
        &mut self,
        account_id: impl Into<String>,
        device_id: impl Into<String>,
        relay_origin: impl Into<String>,
        now: u64,
    ) -> Result<(), ContactDirectoryError> {
        self.upsert_verified_with_inbox(account_id, device_id, relay_origin, None, now)
    }

    pub fn upsert_verified_with_inbox(
        &mut self,
        account_id: impl Into<String>,
        device_id: impl Into<String>,
        relay_origin: impl Into<String>,
        inbox_url: Option<String>,
        now: u64,
    ) -> Result<(), ContactDirectoryError> {
        let account_id = account_id.into();
        let device_id = device_id.into();
        if let Some(existing) = self.contacts.get(&account_id) {
            if existing.device_id != device_id {
                return Err(ContactDirectoryError::DuplicateDevice);
            }
        }
        let alias = self
            .contacts
            .get(&account_id)
            .and_then(|item| item.alias.clone());
        let last_message_at = self
            .contacts
            .get(&account_id)
            .and_then(|item| item.last_message_at);
        let unread_count = self
            .contacts
            .get(&account_id)
            .map_or(0, |item| item.unread_count);
        let state = self
            .contacts
            .get(&account_id)
            .map_or_else(|| "verified".to_owned(), |item| item.state.clone());
        self.contacts.insert(
            account_id.clone(),
            ContactRecord {
                account_id: account_id.clone(),
                device_id,
                relay_origin: relay_origin.into(),
                inbox_url: inbox_url.or_else(|| {
                    self.contacts
                        .get(&account_id)
                        .and_then(|item| item.inbox_url.clone())
                }),
                alias,
                state,
                conversation_id: self
                    .contacts
                    .get(&account_id)
                    .and_then(|item| item.conversation_id.clone()),
                last_message_preview: self
                    .contacts
                    .get(&account_id)
                    .and_then(|item| item.last_message_preview.clone()),
                last_message_at,
                unread_count,
            },
        );
        if let Some(contact) = self.contacts.get_mut(&account_id) {
            contact.last_message_at.get_or_insert(now);
        }
        Ok(())
    }

    pub fn set_alias(
        &mut self,
        account_id: &str,
        alias: &str,
    ) -> Result<(), ContactDirectoryError> {
        if alias.len() > MAX_ALIAS_BYTES || alias.chars().any(char::is_control) {
            return Err(ContactDirectoryError::InvalidAlias);
        }
        let contact = self
            .contacts
            .get_mut(account_id)
            .ok_or(ContactDirectoryError::ContactNotFound)?;
        contact.alias = (!alias.trim().is_empty()).then(|| alias.trim().to_owned());
        Ok(())
    }

    pub fn list(&self) -> Vec<ContactRecord> {
        self.contacts.values().cloned().collect()
    }

    pub fn for_conversation(&self, conversation_id: &str) -> Option<ContactRecord> {
        self.contacts
            .values()
            .find(|contact| contact.conversation_id.as_deref() == Some(conversation_id))
            .cloned()
    }

    pub fn bind_conversation(
        &mut self,
        account_id: &str,
        conversation_id: &str,
    ) -> Result<(), ContactDirectoryError> {
        let contact = self
            .contacts
            .get_mut(account_id)
            .ok_or(ContactDirectoryError::ContactNotFound)?;
        if conversation_id.is_empty() || conversation_id.len() > 128 || !conversation_id.is_ascii()
        {
            return Err(ContactDirectoryError::InvalidAlias);
        }
        contact.conversation_id = Some(conversation_id.to_owned());
        Ok(())
    }

    pub fn mark_read(&mut self, account_id: &str) -> Result<(), ContactDirectoryError> {
        let contact = self
            .contacts
            .get_mut(account_id)
            .ok_or(ContactDirectoryError::ContactNotFound)?;
        contact.unread_count = 0;
        Ok(())
    }

    pub fn mark_unread(&mut self, account_id: &str, now: u64) -> Result<(), ContactDirectoryError> {
        let contact = self
            .contacts
            .get_mut(account_id)
            .ok_or(ContactDirectoryError::ContactNotFound)?;
        contact.unread_count = contact.unread_count.saturating_add(1);
        contact.last_message_at = Some(now);
        Ok(())
    }

    pub fn block(&mut self, account_id: &str) -> Result<(), ContactDirectoryError> {
        let contact = self
            .contacts
            .get_mut(account_id)
            .ok_or(ContactDirectoryError::ContactNotFound)?;
        contact.state = "blocked".into();
        Ok(())
    }

    pub fn unblock(&mut self, account_id: &str) -> Result<(), ContactDirectoryError> {
        let contact = self
            .contacts
            .get_mut(account_id)
            .ok_or(ContactDirectoryError::ContactNotFound)?;
        contact.state = "verified".into();
        Ok(())
    }

    pub fn remove(&mut self, account_id: &str) -> Result<ContactRecord, ContactDirectoryError> {
        self.contacts
            .remove(account_id)
            .ok_or(ContactDirectoryError::ContactNotFound)
    }

    pub fn is_blocked_conversation(&self, conversation_id: &str) -> bool {
        self.contacts.values().any(|contact| {
            contact.state == "blocked"
                && contact.conversation_id.as_deref() == Some(conversation_id)
        })
    }

    pub fn record_message(
        &mut self,
        conversation_id: &str,
        preview: &str,
        now: u64,
        background: bool,
    ) -> Result<(), ContactDirectoryError> {
        let contact = self
            .contacts
            .values_mut()
            .find(|item| item.conversation_id.as_deref() == Some(conversation_id))
            .ok_or(ContactDirectoryError::ContactNotFound)?;
        contact.last_message_at = Some(now);
        contact.last_message_preview = Some(preview.to_owned());
        if background {
            contact.unread_count = contact.unread_count.saturating_add(1);
        } else {
            contact.unread_count = 0;
        }
        Ok(())
    }

    pub fn persist(&self, store: &mut EncryptedStore) -> Result<(), StorageError> {
        let bytes = self.snapshot_bytes()?;
        store.put(RecordClass::Contact, "contacts/directory", &bytes)
    }

    pub fn snapshot_bytes(&self) -> Result<Vec<u8>, StorageError> {
        serde_json::to_vec(&DirectorySnapshot {
            version: DIRECTORY_VERSION,
            contacts: self.contacts.clone(),
        })
        .map_err(|_| StorageError::CorruptStore)
    }

    pub fn restore(store: &EncryptedStore) -> Result<Self, StorageError> {
        let Some(bytes) = store.get(RecordClass::Contact, "contacts/directory") else {
            return Ok(Self::new());
        };
        let snapshot: DirectorySnapshot =
            serde_json::from_slice(&bytes).map_err(|_| StorageError::CorruptStore)?;
        if snapshot.version != DIRECTORY_VERSION {
            return Err(StorageError::CorruptStore);
        }
        if snapshot.contacts.len() > MAX_CONTACTS
            || snapshot
                .contacts
                .iter()
                .any(|(key, contact)| !valid_persisted_contact(key, contact))
        {
            return Err(StorageError::CorruptStore);
        }
        Ok(Self {
            contacts: snapshot.contacts,
        })
    }
}

fn valid_persisted_contact(key: &str, contact: &ContactRecord) -> bool {
    key == contact.account_id
        && validate_protocol_identifier(&contact.account_id).is_ok()
        && validate_protocol_identifier(&contact.device_id).is_ok()
        && valid_relay_origin(&contact.relay_origin)
        && contact
            .inbox_url
            .as_deref()
            .is_none_or(|value| valid_bound_inbox(&contact.relay_origin, value))
        && matches!(contact.state.as_str(), "verified" | "blocked")
        && contact.alias.as_deref().is_none_or(|value| {
            value.len() <= MAX_ALIAS_BYTES && !value.chars().any(char::is_control)
        })
        && contact
            .conversation_id
            .as_deref()
            .is_none_or(valid_conversation_id)
        && contact
            .last_message_preview
            .as_deref()
            .is_none_or(|value| value.len() <= MAX_PREVIEW_BYTES)
}

fn valid_bound_inbox(origin: &str, value: &str) -> bool {
    value.starts_with(&format!("{origin}/api/v1/inbox/"))
        && value.len() <= 2 * 1024
        && !value.contains('?')
        && value.rsplit('/').next().is_some_and(|capability| {
            capability.len() == 43
                && capability
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
        })
}

fn valid_relay_origin(value: &str) -> bool {
    let Some((scheme, authority)) = value.split_once("://") else {
        return false;
    };
    (scheme == "http" || scheme == "https")
        && !authority.is_empty()
        && authority.len() <= 2 * 1024
        && !authority.contains('/')
        && !authority.contains('@')
        && !authority.contains('?')
        && !authority.contains('#')
        && !authority
            .chars()
            .any(|character| character.is_whitespace() || character.is_control())
}

fn valid_conversation_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}

#[cfg(test)]
mod tests {
    use super::{ContactDirectory, ContactDirectoryError};

    #[test]
    fn directory_merges_same_device_and_rejects_second_device() {
        let mut directory = ContactDirectory::new();
        directory
            .upsert_verified("account-a", "device-a", "https://relay-a", 10)
            .unwrap();
        directory
            .upsert_verified_with_inbox(
                "account-a",
                "device-a",
                "https://relay-a",
                Some("https://relay-a/api/v1/inbox/capability".into()),
                15,
            )
            .unwrap();
        assert_eq!(
            directory.list()[0].inbox_url.as_deref(),
            Some("https://relay-a/api/v1/inbox/capability")
        );
        directory.set_alias("account-a", "Reporter").unwrap();
        directory
            .upsert_verified("account-a", "device-a", "https://relay-b", 20)
            .unwrap();
        assert_eq!(directory.list()[0].alias.as_deref(), Some("Reporter"));
        assert_eq!(directory.list()[0].relay_origin, "https://relay-b");
        assert_eq!(
            directory.upsert_verified("account-a", "device-b", "https://relay-b", 20),
            Err(ContactDirectoryError::DuplicateDevice)
        );
        directory
            .bind_conversation("account-a", "conversation-a")
            .unwrap();
        directory.mark_unread("account-a", 30).unwrap();
        assert_eq!(
            directory.list()[0].conversation_id.as_deref(),
            Some("conversation-a")
        );
        assert_eq!(directory.list()[0].unread_count, 1);
        directory.mark_read("account-a").unwrap();
        assert_eq!(directory.list()[0].unread_count, 0);
        directory.block("account-a").unwrap();
        assert!(directory.is_blocked_conversation("conversation-a"));
        directory
            .upsert_verified("account-a", "device-a", "https://relay-b", 40)
            .unwrap();
        assert_eq!(directory.list()[0].state, "blocked");
        directory.unblock("account-a").unwrap();
        assert!(!directory.is_blocked_conversation("conversation-a"));
        let removed = directory.remove("account-a").unwrap();
        assert_eq!(removed.account_id, "account-a");
    }
}
