use another_dimension_identity::ProfileName;
#[cfg(feature = "dev-insecure")]
use another_dimension_identity::{ContactId, PairwisePrivateKey};
#[cfg(feature = "dev-insecure")]
use another_dimension_pairing::{PairingPayload, PendingContact};
#[cfg(feature = "dev-insecure")]
use another_dimension_protocol::{Envelope, ReplayWindow};
#[cfg(feature = "dev-insecure")]
use std::fs;
use std::io;
#[cfg(feature = "dev-insecure")]
use std::path::{Path, PathBuf};

pub trait Store {
    fn create_profile(&self, profile: &ProfileName) -> Result<(), StorageError>;
    fn profile_exists(&self, profile: &ProfileName) -> bool;
}

#[derive(Debug)]
pub enum StorageError {
    Io(io::Error),
    InvalidRecord,
}

impl From<io::Error> for StorageError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

#[cfg(feature = "dev-insecure")]
pub mod dev_insecure {
    use super::*;

    #[derive(Clone, Debug)]
    pub struct DevFileStore {
        root: PathBuf,
    }

    impl DevFileStore {
        pub fn new(root: impl Into<PathBuf>) -> Self {
            Self { root: root.into() }
        }

        pub fn root(&self) -> &Path {
            &self.root
        }

        pub fn save_own_pairing(
            &self,
            profile: &ProfileName,
            payload: &PairingPayload,
        ) -> Result<(), StorageError> {
            let dir = self.profile_dir(profile).join("own_pairings");
            fs::create_dir_all(&dir)?;
            fs::write(
                dir.join(format!("{}.pair", payload.pairing_nonce)),
                payload.encode().map_err(|_| StorageError::InvalidRecord)?,
            )?;
            fs::write(
                self.profile_dir(profile).join("latest_own_pairing"),
                &payload.pairing_nonce,
            )?;
            Ok(())
        }

        pub fn save_own_pairing_material(
            &self,
            profile: &ProfileName,
            payload: &PairingPayload,
            private_key: &PairwisePrivateKey,
        ) -> Result<(), StorageError> {
            self.save_own_pairing(profile, payload)?;
            let keys_dir = self.profile_dir(profile).join("own_pairing_keys");
            fs::create_dir_all(&keys_dir)?;
            fs::write(
                self.own_pairing_key_path(profile, &payload.pairing_nonce),
                private_key.as_str(),
            )?;
            Ok(())
        }

        pub fn latest_own_pairing(
            &self,
            profile: &ProfileName,
        ) -> Result<PairingPayload, StorageError> {
            let nonce = fs::read_to_string(self.profile_dir(profile).join("latest_own_pairing"))?;
            let payload = fs::read_to_string(
                self.profile_dir(profile)
                    .join("own_pairings")
                    .join(format!("{}.pair", nonce.trim())),
            )?;
            PairingPayload::decode(&payload).map_err(|_| StorageError::InvalidRecord)
        }

        pub fn save_pending_contact(&self, pending: &PendingContact) -> Result<(), StorageError> {
            let profile = &pending.local_payload.owner_profile;
            let dir = self.profile_dir(profile).join("pending");
            fs::create_dir_all(&dir)?;
            let record = format!(
                "{}\n{}\n{}\n{}\n",
                pending
                    .local_payload
                    .encode()
                    .map_err(|_| StorageError::InvalidRecord)?,
                pending
                    .remote_payload
                    .encode()
                    .map_err(|_| StorageError::InvalidRecord)?,
                pending.safety_number,
                pending.safety_phrase
            );
            fs::write(
                dir.join(format!("{}.pending", pending.contact_id.as_str())),
                record,
            )?;
            self.copy_own_pairing_key_to_pending(profile, pending)?;
            self.remove_own_pairing_material(profile, &pending.local_payload.pairing_nonce)?;
            Ok(())
        }

        pub fn activate_contact(
            &self,
            profile: &ProfileName,
            contact: &ContactId,
        ) -> Result<(), StorageError> {
            let pending_path = self
                .profile_dir(profile)
                .join("pending")
                .join(format!("{}.pending", contact.as_str()));
            let record = fs::read_to_string(&pending_path)?;
            let contacts_dir = self.profile_dir(profile).join("contacts");
            fs::create_dir_all(&contacts_dir)?;
            fs::write(
                contacts_dir.join(format!("{}.contact", contact.as_str())),
                record,
            )?;
            self.move_pending_key_to_contact(profile, contact)?;
            fs::remove_file(pending_path)?;
            Ok(())
        }

        pub fn remove_pending_contact(
            &self,
            profile: &ProfileName,
            contact: &ContactId,
        ) -> Result<bool, StorageError> {
            let pending_path = self
                .profile_dir(profile)
                .join("pending")
                .join(format!("{}.pending", contact.as_str()));
            if pending_path.exists() {
                fs::remove_file(pending_path)?;
                self.remove_pending_key(profile, contact)?;
                Ok(true)
            } else {
                Ok(false)
            }
        }

        pub fn load_pending_contacts(
            &self,
            profile: &ProfileName,
        ) -> Result<Vec<PendingContact>, StorageError> {
            let pending_dir = self.profile_dir(profile).join("pending");
            if !pending_dir.exists() {
                return Ok(Vec::new());
            }
            let mut contacts = Vec::new();
            for entry in fs::read_dir(pending_dir)? {
                let path = entry?.path();
                if path.extension().and_then(|ext| ext.to_str()) == Some("pending") {
                    contacts.push(decode_pending_contact(&fs::read_to_string(path)?)?);
                }
            }
            contacts.sort_by(|left, right| left.contact_id.cmp(&right.contact_id));
            Ok(contacts)
        }

        pub fn pending_key_exists(&self, profile: &ProfileName, contact: &ContactId) -> bool {
            self.pending_key_path(profile, contact).exists()
        }

        pub fn contact_key_exists(&self, profile: &ProfileName, contact: &ContactId) -> bool {
            self.contact_key_path(profile, contact).exists()
        }

        pub fn own_pairing_material_exists(&self, profile: &ProfileName, nonce: &str) -> bool {
            self.own_pairing_path(profile, nonce).exists()
                || self.own_pairing_key_path(profile, nonce).exists()
        }

        pub fn pending_contact_exists(&self, profile: &ProfileName, contact: &ContactId) -> bool {
            self.profile_dir(profile)
                .join("pending")
                .join(format!("{}.pending", contact.as_str()))
                .exists()
        }

        pub fn contact_exists(&self, profile: &ProfileName, contact: &ContactId) -> bool {
            self.profile_dir(profile)
                .join("contacts")
                .join(format!("{}.contact", contact.as_str()))
                .exists()
        }

        pub fn save_inbox_envelope(
            &self,
            profile: &ProfileName,
            envelope: &Envelope,
        ) -> Result<(), StorageError> {
            let inbox = self.profile_dir(profile).join("inbox");
            fs::create_dir_all(&inbox)?;
            let path = inbox.join(format!(
                "{:020}-{}.env",
                envelope.message_number, envelope.channel_id
            ));
            fs::write(path, envelope.encode())?;
            Ok(())
        }

        pub fn load_inbox_envelopes(
            &self,
            profile: &ProfileName,
        ) -> Result<Vec<Envelope>, StorageError> {
            let inbox = self.profile_dir(profile).join("inbox");
            if !inbox.exists() {
                return Ok(Vec::new());
            }
            let mut envelopes = Vec::new();
            for entry in fs::read_dir(inbox)? {
                let path = entry?.path();
                if path.extension().and_then(|ext| ext.to_str()) == Some("env") {
                    let record = fs::read_to_string(path)?;
                    envelopes
                        .push(Envelope::decode(&record).map_err(|_| StorageError::InvalidRecord)?);
                }
            }
            envelopes.sort_by_key(|envelope| envelope.message_number);
            Ok(envelopes)
        }

        pub fn clear_inbox(&self, profile: &ProfileName) -> Result<usize, StorageError> {
            let inbox = self.profile_dir(profile).join("inbox");
            if !inbox.exists() {
                return Ok(0);
            }
            let mut count = 0;
            for entry in fs::read_dir(inbox)? {
                let path = entry?.path();
                if path.extension().and_then(|ext| ext.to_str()) == Some("env") {
                    fs::remove_file(path)?;
                    count += 1;
                }
            }
            Ok(count)
        }

        pub fn load_replay_window(
            &self,
            profile: &ProfileName,
            channel_id: &str,
            window_size: u64,
        ) -> Result<ReplayWindow, StorageError> {
            let path = self.replay_path(profile, channel_id);
            if !path.exists() {
                return ReplayWindow::new(window_size).map_err(|_| StorageError::InvalidRecord);
            }
            let record = fs::read_to_string(path)?;
            ReplayWindow::decode_state(&record).map_err(|_| StorageError::InvalidRecord)
        }

        pub fn save_replay_window(
            &self,
            profile: &ProfileName,
            channel_id: &str,
            window: &ReplayWindow,
        ) -> Result<(), StorageError> {
            let dir = self.profile_dir(profile).join("replay");
            fs::create_dir_all(&dir)?;
            fs::write(self.replay_path(profile, channel_id), window.encode_state())?;
            Ok(())
        }

        fn profile_dir(&self, profile: &ProfileName) -> PathBuf {
            self.root.join("profiles").join(profile.as_str())
        }

        fn remove_own_pairing_material(
            &self,
            profile: &ProfileName,
            nonce: &str,
        ) -> Result<(), StorageError> {
            let pairing_path = self.own_pairing_path(profile, nonce);
            if pairing_path.exists() {
                fs::remove_file(pairing_path)?;
            }
            let key_path = self.own_pairing_key_path(profile, nonce);
            if key_path.exists() {
                fs::remove_file(key_path)?;
            }
            let latest_path = self.profile_dir(profile).join("latest_own_pairing");
            if latest_path.exists()
                && fs::read_to_string(&latest_path)
                    .map(|latest| latest.trim() == nonce)
                    .unwrap_or(false)
            {
                fs::remove_file(latest_path)?;
            }
            Ok(())
        }

        fn own_pairing_path(&self, profile: &ProfileName, nonce: &str) -> PathBuf {
            self.profile_dir(profile)
                .join("own_pairings")
                .join(format!("{nonce}.pair"))
        }

        fn own_pairing_key_path(&self, profile: &ProfileName, nonce: &str) -> PathBuf {
            self.profile_dir(profile)
                .join("own_pairing_keys")
                .join(format!("{nonce}.key"))
        }

        fn replay_path(&self, profile: &ProfileName, channel_id: &str) -> PathBuf {
            self.profile_dir(profile)
                .join("replay")
                .join(format!("{}.state", safe_file_component(channel_id)))
        }

        fn copy_own_pairing_key_to_pending(
            &self,
            profile: &ProfileName,
            pending: &PendingContact,
        ) -> Result<(), StorageError> {
            let own_key = self.own_pairing_key_path(profile, &pending.local_payload.pairing_nonce);
            let key_material = fs::read_to_string(own_key)?;
            let pending_keys = self.profile_dir(profile).join("pending_keys");
            fs::create_dir_all(&pending_keys)?;
            fs::write(
                self.pending_key_path(profile, &pending.contact_id),
                key_material,
            )?;
            Ok(())
        }

        fn move_pending_key_to_contact(
            &self,
            profile: &ProfileName,
            contact: &ContactId,
        ) -> Result<(), StorageError> {
            let pending_key = self.pending_key_path(profile, contact);
            let key_material = fs::read_to_string(&pending_key)?;
            let contact_keys = self.profile_dir(profile).join("contact_keys");
            fs::create_dir_all(&contact_keys)?;
            fs::write(self.contact_key_path(profile, contact), key_material)?;
            fs::remove_file(pending_key)?;
            Ok(())
        }

        fn remove_pending_key(
            &self,
            profile: &ProfileName,
            contact: &ContactId,
        ) -> Result<(), StorageError> {
            let pending_key = self.pending_key_path(profile, contact);
            if pending_key.exists() {
                fs::remove_file(pending_key)?;
            }
            Ok(())
        }

        fn pending_key_path(&self, profile: &ProfileName, contact: &ContactId) -> PathBuf {
            self.profile_dir(profile)
                .join("pending_keys")
                .join(format!("{}.key", contact.as_str()))
        }

        fn contact_key_path(&self, profile: &ProfileName, contact: &ContactId) -> PathBuf {
            self.profile_dir(profile)
                .join("contact_keys")
                .join(format!("{}.key", contact.as_str()))
        }
    }

    fn safe_file_component(value: &str) -> String {
        value
            .chars()
            .map(|ch| {
                if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                    ch
                } else {
                    '_'
                }
            })
            .collect()
    }

    fn decode_pending_contact(record: &str) -> Result<PendingContact, StorageError> {
        let lines = record.lines().collect::<Vec<_>>();
        if lines.len() != 4 {
            return Err(StorageError::InvalidRecord);
        }
        let local_payload =
            PairingPayload::decode(lines[0]).map_err(|_| StorageError::InvalidRecord)?;
        let remote_payload =
            PairingPayload::decode(lines[1]).map_err(|_| StorageError::InvalidRecord)?;
        let contact_id = remote_payload
            .contact_id()
            .map_err(|_| StorageError::InvalidRecord)?;
        Ok(PendingContact {
            contact_id,
            local_payload,
            remote_payload,
            safety_number: lines[2].to_string(),
            safety_phrase: lines[3].to_string(),
        })
    }

    impl Store for DevFileStore {
        fn create_profile(&self, profile: &ProfileName) -> Result<(), StorageError> {
            let dir = self.profile_dir(profile);
            fs::create_dir_all(dir.join("pending"))?;
            fs::create_dir_all(dir.join("pending_keys"))?;
            fs::create_dir_all(dir.join("contacts"))?;
            fs::create_dir_all(dir.join("contact_keys"))?;
            fs::create_dir_all(dir.join("inbox"))?;
            fs::create_dir_all(dir.join("replay"))?;
            fs::create_dir_all(dir.join("own_pairing_keys"))?;
            fs::write(dir.join("profile"), profile.as_str())?;
            Ok(())
        }

        fn profile_exists(&self, profile: &ProfileName) -> bool {
            self.profile_dir(profile).join("profile").exists()
        }
    }
}
