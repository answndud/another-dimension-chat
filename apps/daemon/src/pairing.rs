//! Contact pairing state machine owned by the daemon.
//!
//! The relay and browser may transport an invite, but only this state machine
//! can turn a verified invite into an approved contact. MLS session creation
//! is intentionally a later operation; approval is never inferred from merely
//! consuming or verifying a code.

use crate::{
    bridge_http::VerifiedInvite,
    storage::{EncryptedStore, RecordClass, StorageError},
};
use sha2::{Digest, Sha256};

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
            PairingState::Idle | PairingState::Rejected => {
                self.state = PairingState::InviteCreated;
                Ok(())
            }
            PairingState::InviteCreated | PairingState::Verified => {
                Err(PairingError::InvalidTransition)
            }
            PairingState::Established => Err(PairingError::Duplicate),
        }
    }

    pub fn verify_peer(&mut self, peer: VerifiedInvite, now: u64) -> Result<(), PairingError> {
        // Device identifiers are scoped to their account (device-1 is valid
        // for every account); only the account identity makes this a self invite.
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
                let trusted = self.peer.as_ref().expect("established pairing has a peer");
                if trusted.account_id != peer.account_id
                    || trusted.device_id != peer.device_id
                    || trusted.relay_origin != peer.relay_origin
                    || trusted.inbox_url != peer.inbox_url
                {
                    Err(PairingError::BindingChanged)
                } else {
                    Err(PairingError::Duplicate)
                }
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
        if self.state != PairingState::Verified
            || self.safety_number().as_deref() != Some(value.trim())
        {
            return Err(PairingError::SafetyMismatch);
        }
        self.safety_verified = true;
        Ok(())
    }

    pub fn can_message(&self) -> bool {
        self.state == PairingState::Established && self.safety_verified
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
        let snapshot: PairingSnapshot =
            serde_json::from_slice(&bytes).map_err(|_| StorageError::CorruptStore)?;
        if snapshot.state == PairingState::Established && snapshot.peer.is_none() {
            return Err(StorageError::CorruptStore);
        }
        session.state = snapshot.state;
        session.peer = snapshot.peer;
        session.safety_verified = snapshot.safety_verified;
        Ok(session)
    }
}

#[cfg(test)]
mod tests {
    use super::{PairingError, PairingSession, PairingState};
    use crate::bridge_http::VerifiedInvite;

    fn peer(account_id: &str, device_id: &str, expires_at: u64) -> VerifiedInvite {
        VerifiedInvite {
            account_id: account_id.into(),
            device_id: device_id.into(),
            expires_at,
            relay_origin: "https://relay.example".into(),
            inbox_url: None,
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
}
