//! Contact pairing state machine owned by the daemon.
//!
//! The relay and browser may transport an invite, but only this state machine
//! can turn a verified invite into an approved contact. MLS session creation
//! is intentionally a later operation; approval is never inferred from merely
//! consuming or verifying a code.

use crate::{
    bridge_http::VerifiedInvite,
    protocol_gate::validate_protocol_identifier,
    storage::{EncryptedStore, RecordClass, StorageError},
};
use sha2::{Digest, Sha256};

const PAIRING_SNAPSHOT_VERSION: u16 = 1;

#[derive(Clone, Copy, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub enum PairingState {
    Idle,
    InviteCreated,
    Verified,
    Established,
    Rejected,
}

impl PairingState {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::InviteCreated => "invite-created",
            Self::Verified => "verified",
            Self::Established => "established",
            Self::Rejected => "rejected",
        }
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum PairingError {
    InvalidTransition,
    SelfInvite,
    Expired,
    Duplicate,
    SafetyMismatch,
    BindingChanged,
}

impl std::fmt::Display for PairingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::InvalidTransition => "pairing state transition is invalid",
            Self::SelfInvite => "cannot pair an account with itself",
            Self::Expired => "pairing invite has expired",
            Self::Duplicate => "pairing invite is already established",
            Self::SafetyMismatch => "safety number does not match",
            Self::BindingChanged => "trusted peer binding changed; re-verification is required",
        })
    }
}

impl std::error::Error for PairingError {}

#[derive(Clone, Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct PairingSnapshot {
    /// `0` is the legacy pre-versioned snapshot and is migrated to v1 on load.
    #[serde(default)]
    pub schema_version: u16,
    pub state: PairingState,
    pub peer: Option<VerifiedInvite>,
    #[serde(default)]
    pub safety_verified: bool,
}

pub struct PairingSession {
    local_account_id: String,
    local_device_id: String,
    state: PairingState,
    peer: Option<VerifiedInvite>,
    safety_verified: bool,
}

impl PairingSession {
    pub fn new(local_account_id: impl Into<String>, local_device_id: impl Into<String>) -> Self {
        Self {
            local_account_id: local_account_id.into(),
            local_device_id: local_device_id.into(),
            state: PairingState::Idle,
            peer: None,
            safety_verified: false,
        }
    }

    pub fn mark_invite_created(&mut self) -> Result<(), PairingError> {
        match self.state {
            PairingState::Idle
            | PairingState::InviteCreated
            | PairingState::Rejected
            | PairingState::Established => {
                self.state = PairingState::InviteCreated;
                Ok(())
            }
            PairingState::Verified => Err(PairingError::InvalidTransition),
        }
    }

    pub fn verify_peer(&mut self, peer: VerifiedInvite, now: u64) -> Result<(), PairingError> {
        // Device identifiers are scoped to their account (device-1 is valid
        // for every account); only the account identity makes this a self invite.
        if !valid_verified_peer(&peer) {
            return Err(PairingError::InvalidTransition);
        }
        if peer.account_id == self.local_account_id {
            return Err(PairingError::SelfInvite);
        }
        if now >= peer.expires_at {
            return Err(PairingError::Expired);
        }
        match self.state {
            PairingState::Idle | PairingState::InviteCreated | PairingState::Rejected => {
                self.peer = Some(peer);
                self.state = PairingState::Verified;
                self.safety_verified = false;
                Ok(())
            }
            PairingState::Verified => Err(PairingError::Duplicate),
            PairingState::Established => {
                // A group owner can stage additional peers while the pairing
                // stays established. Safety stays verified from the first peer.
                let Some(trusted) = self.peer.as_ref() else {
                    return Err(PairingError::InvalidTransition);
                };
                if trusted.account_id == peer.account_id {
                    return Err(PairingError::BindingChanged);
                }
                self.peer = Some(peer);
                self.safety_verified = true;
                Ok(())
            }
        }
    }

    pub fn approve(&mut self, now: u64) -> Result<(), PairingError> {
        let Some(peer) = self.peer.as_ref() else {
            return Err(PairingError::InvalidTransition);
        };
        if now >= peer.expires_at {
            return Err(PairingError::Expired);
        }
        if self.state != PairingState::Verified {
            return Err(if self.state == PairingState::Established {
                PairingError::Duplicate
            } else {
                PairingError::InvalidTransition
            });
        }
        if !self.safety_verified {
            return Err(PairingError::InvalidTransition);
        }
        self.state = PairingState::Established;
        Ok(())
    }

    pub fn confirm_safety(&mut self, value: &str) -> Result<(), PairingError> {
        let can_reconfirm = self.state == PairingState::Verified
            || (self.state == PairingState::Established && !self.safety_verified);
        if !can_reconfirm {
            return Err(PairingError::InvalidTransition);
        }
        if !self.safety_verified && self.safety_number().as_deref() != Some(value.trim()) {
            return Err(PairingError::SafetyMismatch);
        }
        self.safety_verified = true;
        Ok(())
    }

    pub fn unverify_safety(&mut self) -> Result<(), PairingError> {
        if self.state != PairingState::Established || !self.safety_verified {
            return Err(PairingError::InvalidTransition);
        }
        self.safety_verified = false;
        Ok(())
    }

    pub fn can_message(&self) -> bool {
        self.state == PairingState::Established && self.safety_verified
    }

    pub fn can_message_at(&self, now: u64) -> bool {
        self.can_message()
            && self
                .peer
                .as_ref()
                .is_some_and(|peer| now < peer.expires_at.max(now))
    }

    pub fn reject(&mut self) -> Result<(), PairingError> {
        if !matches!(
            self.state,
            PairingState::Verified | PairingState::Established
        ) {
            return Err(PairingError::InvalidTransition);
        }
        self.state = PairingState::Rejected;
        self.peer = None;
        self.safety_verified = false;
        Ok(())
    }

    pub fn invalidate_binding(&mut self) -> Result<(), PairingError> {
        if self.state != PairingState::Established {
            return Err(PairingError::InvalidTransition);
        }
        self.state = PairingState::Rejected;
        self.peer = None;
        self.safety_verified = false;
        Ok(())
    }

    pub fn snapshot(&self) -> PairingSnapshot {
        PairingSnapshot {
            schema_version: PAIRING_SNAPSHOT_VERSION,
            state: self.state,
            peer: self.peer.clone(),
            safety_verified: self.safety_verified,
        }
    }

    /// A comparison value for an out-of-band identity check. It is not a
    /// secret and never authorizes a session by itself.
    pub fn safety_number(&self) -> Option<String> {
        let peer = self.peer.as_ref()?;
        let mut accounts = [self.local_account_id.as_str(), peer.account_id.as_str()];
        accounts.sort_unstable();
        let mut devices = [self.local_device_id.as_str(), peer.device_id.as_str()];
        devices.sort_unstable();
        let transcript = format!(
            "another-dimension/safety/v1\naccount-a={}\naccount-b={}\ndevice-a={}\ndevice-b={}",
            accounts[0], accounts[1], devices[0], devices[1]
        );
        let digest = Sha256::digest(transcript.as_bytes());
        Some(format!(
            "sha256-{}",
            digest
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect::<String>()
        ))
    }

    pub fn persist(&self, store: &mut EncryptedStore) -> Result<(), StorageError> {
        let bytes = serde_json::to_vec(&self.snapshot()).map_err(|_| StorageError::CorruptStore)?;
        store.put(RecordClass::Contact, "pairing/state", &bytes)
    }

    pub fn restore(
        local_account_id: impl Into<String>,
        local_device_id: impl Into<String>,
        store: &EncryptedStore,
    ) -> Result<Self, StorageError> {
        let mut session = Self::new(local_account_id, local_device_id);
        let Some(bytes) = store.get(RecordClass::Contact, "pairing/state") else {
            return Ok(session);
        };
        let mut snapshot: PairingSnapshot =
            serde_json::from_slice(&bytes).map_err(|_| StorageError::CorruptStore)?;
        if snapshot.schema_version > PAIRING_SNAPSHOT_VERSION {
            return Err(StorageError::CorruptStore);
        }
        // Legacy snapshots had no schema field. Their shape is unchanged, so
        // migration is a version annotation rather than a lossy rewrite.
        snapshot.schema_version = PAIRING_SNAPSHOT_VERSION;
        let valid_state_shape = match snapshot.state {
            PairingState::Idle | PairingState::InviteCreated => snapshot.peer.is_none(),
            PairingState::Verified | PairingState::Established => {
                snapshot.peer.as_ref().is_some_and(valid_verified_peer)
            }
            PairingState::Rejected => snapshot.peer.is_none(),
        };
        if !valid_state_shape
            || (snapshot.safety_verified
                && !matches!(
                    snapshot.state,
                    PairingState::Verified | PairingState::Established
                ))
        {
            return Err(StorageError::CorruptStore);
        }
        session.state = snapshot.state;
        session.peer = snapshot.peer;
        session.safety_verified = snapshot.safety_verified;
        Ok(session)
    }
}

fn valid_verified_peer(peer: &VerifiedInvite) -> bool {
    validate_protocol_identifier(&peer.account_id).is_ok()
        && validate_protocol_identifier(&peer.device_id).is_ok()
        && valid_relay_origin(&peer.relay_origin)
        && peer.inbox_url.as_deref().is_none_or(|inbox| {
            crate::bridge_http::validate_bound_inbox_url(&peer.relay_origin, inbox).is_ok()
        })
        && peer.conversation_id.as_deref().is_none_or(|conversation| {
            !conversation.is_empty()
                && conversation.len() <= 128
                && conversation
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
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

#[cfg(test)]
mod tests {
    use super::{PairingError, PairingSession, PairingState, PAIRING_SNAPSHOT_VERSION};
    use crate::bridge_http::VerifiedInvite;

    fn peer(account_id: &str, device_id: &str, expires_at: u64) -> VerifiedInvite {
        VerifiedInvite {
            account_id: account_id.into(),
            device_id: device_id.into(),
            expires_at,
            relay_origin: "https://relay.example".into(),
            inbox_url: None,
            conversation_id: None,
        }
    }

    #[test]
    fn pairing_requires_verify_then_explicit_approval() {
        let mut session = PairingSession::new("local-account", "local-device");
        assert_eq!(session.approve(10), Err(PairingError::InvalidTransition));
        session.mark_invite_created().unwrap();
        session
            .verify_peer(peer("peer-account", "peer-device", 100), 10)
            .unwrap();
        assert_eq!(session.snapshot().state, PairingState::Verified);
        assert_eq!(session.approve(10), Err(PairingError::InvalidTransition));
        let safety = session.safety_number().unwrap();
        session.confirm_safety(&safety).unwrap();
        session.approve(10).unwrap();
        assert_eq!(session.snapshot().state, PairingState::Established);
        assert_eq!(session.approve(10), Err(PairingError::Duplicate));
    }

    #[test]
    fn pending_invite_can_be_replaced_after_browser_or_daemon_restart() {
        let mut session = PairingSession::new("local-account", "local-device");
        session.mark_invite_created().unwrap();
        session.mark_invite_created().unwrap();
        assert_eq!(session.snapshot().state, PairingState::InviteCreated);
    }

    #[test]
    fn pairing_rejects_self_expired_and_replayed_invites() {
        let mut session = PairingSession::new("local-account", "local-device");
        assert_eq!(
            session.verify_peer(peer("local-account", "other-device", 100), 10),
            Err(PairingError::SelfInvite)
        );
        assert_eq!(
            session.verify_peer(peer("peer-account", "peer-device", 10), 10),
            Err(PairingError::Expired)
        );
        session
            .verify_peer(peer("peer-account", "peer-device", 100), 10)
            .unwrap();
        assert_eq!(
            session.verify_peer(peer("other-account", "other-device", 100), 10),
            Err(PairingError::Duplicate)
        );
        session.reject().unwrap();
        assert_eq!(session.snapshot().state, PairingState::Rejected);
    }

    #[test]
    fn pairing_rejects_malformed_peer_bindings_before_establishment() {
        let mut session = PairingSession::new("local-account", "local-device");
        let mut malformed = peer("peer-account", "peer-device", 100);
        malformed.device_id = "peer\ninvalid".into();
        assert_eq!(
            session.verify_peer(malformed, 10),
            Err(PairingError::InvalidTransition)
        );
    }

    #[test]
    fn messaging_is_closed_until_safety_verified_and_approved() {
        let mut session = PairingSession::new("local-account", "local-device");
        assert!(!session.can_message());
        session
            .verify_peer(peer("peer-account", "peer-device", 100), 10)
            .unwrap();
        assert!(!session.can_message());
        let safety = session.safety_number().unwrap();
        session.confirm_safety(&safety).unwrap();
        assert!(!session.can_message());
        session.approve(10).unwrap();
        assert!(session.can_message());
    }

    #[test]
    fn established_pairing_expires_before_message_admission() {
        let mut session = PairingSession::new("local-account", "local-device");
        session
            .verify_peer(peer("peer-account", "peer-device", 100), 10)
            .unwrap();
        let safety = session.safety_number().unwrap();
        session.confirm_safety(&safety).unwrap();
        session.approve(10).unwrap();
        assert!(session.can_message_at(99));
        assert!(!session.can_message_at(100));
    }

    #[test]
    fn established_pairing_can_be_locked_until_safety_is_reconfirmed() {
        let mut session = PairingSession::new("local-account", "local-device");
        session
            .verify_peer(peer("peer-account", "peer-device", 100), 10)
            .unwrap();
        let safety = session.safety_number().unwrap();
        session.confirm_safety(&safety).unwrap();
        session.approve(10).unwrap();
        assert!(session.can_message());

        session.unverify_safety().unwrap();
        assert!(!session.can_message());
        assert_eq!(
            session.confirm_safety("sha256-not-the-number"),
            Err(PairingError::SafetyMismatch)
        );
        session.confirm_safety(&safety).unwrap();
        assert!(session.can_message());
    }

    #[test]
    fn safety_number_is_order_independent() {
        let mut alice = PairingSession::new("alice-account", "alice-device");
        alice
            .verify_peer(peer("bob-account", "bob-device", 100), 10)
            .unwrap();
        let mut bob = PairingSession::new("bob-account", "bob-device");
        bob.verify_peer(peer("alice-account", "alice-device", 100), 10)
            .unwrap();
        assert_eq!(alice.safety_number(), bob.safety_number());
        assert!(alice.safety_number().unwrap().starts_with("sha256-"));
    }

    #[test]
    fn safety_confirmation_rejects_tampering() {
        let mut session = PairingSession::new("local-account", "local-device");
        session
            .verify_peer(peer("peer-account", "peer-device", 100), 10)
            .unwrap();
        assert_eq!(
            session.confirm_safety("sha256-not-the-number"),
            Err(PairingError::SafetyMismatch)
        );
        assert!(!session.snapshot().safety_verified);
    }

    #[test]
    fn established_pairing_rejects_changed_peer_binding_without_overwrite() {
        let mut session = PairingSession::new("local-account", "local-device");
        session
            .verify_peer(peer("peer-account", "peer-device", 100), 10)
            .unwrap();
        let safety = session.safety_number().unwrap();
        session.confirm_safety(&safety).unwrap();
        session.approve(10).unwrap();
        let changed = VerifiedInvite {
            relay_origin: "https://different-relay.example".into(),
            ..peer("peer-account", "peer-device", 100)
        };
        assert_eq!(
            session.verify_peer(changed, 20),
            Err(PairingError::BindingChanged)
        );
        assert_eq!(
            session.snapshot().peer.unwrap().relay_origin,
            "https://relay.example"
        );
        session.reject().unwrap();
        assert_eq!(session.snapshot().state, PairingState::Rejected);
    }

    #[test]
    fn relay_rotation_requires_a_fresh_safety_verified_pairing() {
        let mut session = PairingSession::new("local-account", "local-device");
        session
            .verify_peer(peer("peer-account", "peer-device", 100), 10)
            .unwrap();
        let safety = session.safety_number().unwrap();
        session.confirm_safety(&safety).unwrap();
        session.approve(10).unwrap();
        assert!(session.can_message());

        session.invalidate_binding().unwrap();
        assert_eq!(session.snapshot().state, PairingState::Rejected);
        assert!(!session.can_message());

        session
            .verify_peer(peer("peer-account", "peer-device", 200), 20)
            .unwrap();
        assert!(!session.can_message());
        let safety = session.safety_number().unwrap();
        session.confirm_safety(&safety).unwrap();
        session.approve(20).unwrap();
        assert!(session.can_message());
    }

    #[test]
    fn pairing_snapshot_migrates_legacy_and_rejects_future_schema() {
        let path = std::env::temp_dir().join(format!(
            "another-dimension-pairing-schema-{}",
            std::process::id()
        ));
        let mut store =
            crate::storage::EncryptedStore::initialize(&path, "correct horse battery staple")
                .unwrap();
        store
            .put(
                crate::storage::RecordClass::Contact,
                "pairing/state",
                br#"{"state":"Idle","peer":null,"safety_verified":false}"#,
            )
            .unwrap();
        let restored = PairingSession::restore("local", "device", &store).unwrap();
        assert_eq!(restored.snapshot().schema_version, PAIRING_SNAPSHOT_VERSION);

        store
            .put(
                crate::storage::RecordClass::Contact,
                "pairing/state",
                br#"{"schema_version":99,"state":"Idle","peer":null,"safety_verified":false}"#,
            )
            .unwrap();
        assert!(matches!(
            PairingSession::restore("local", "device", &store),
            Err(crate::storage::StorageError::CorruptStore)
        ));
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(path.with_extension("revision"));
    }
}
