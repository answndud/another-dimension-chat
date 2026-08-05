//! Durable local contact directory for multiple independent pairings.

use crate::storage::{EncryptedStore, RecordClass, StorageError};
use std::collections::BTreeMap;

const DIRECTORY_VERSION: u16 = 1;
const MAX_ALIAS_BYTES: usize = 128;

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct ContactRecord {
    pub account_id: String,
    pub device_id: String,
    pub relay_origin: String,
    pub alias: Option<String>,
    pub state: String,
    #[serde(default)]
    pub conversation_id: Option<String>,
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
        self.contacts.insert(
            account_id.clone(),
            ContactRecord {
                account_id: account_id.clone(),
                device_id,
                relay_origin: relay_origin.into(),
                alias,
                state: "verified".into(),
                conversation_id: self
                    .contacts
                    .get(&account_id)
                    .and_then(|item| item.conversation_id.clone()),
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

    pub fn persist(&self, store: &mut EncryptedStore) -> Result<(), StorageError> {
        let bytes = serde_json::to_vec(&DirectorySnapshot {
            version: DIRECTORY_VERSION,
            contacts: self.contacts.clone(),
        })
        .map_err(|_| StorageError::CorruptStore)?;
        store.put(RecordClass::Contact, "contacts/directory", &bytes)
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
        Ok(Self {
            contacts: snapshot.contacts,
        })
    }
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
    }
}
