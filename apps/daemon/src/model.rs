//! Domain identifiers and fail-closed state transitions for the daemon product.
//! This module owns the vocabulary shared by storage, protocol, delivery, and UI.

use serde::{Deserialize, Serialize};
use std::fmt;

const MAX_ID_BYTES: usize = 128;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvalidId;

impl fmt::Display for InvalidId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("identifier must be non-empty, bounded, and free of control characters")
    }
}

impl std::error::Error for InvalidId {}

macro_rules! typed_id {
    ($name:ident) => {
        #[derive(Clone, Debug, Eq, Hash, PartialEq, Serialize, Deserialize)]
        pub struct $name(String);

        impl $name {
            pub fn new(value: impl Into<String>) -> Result<Self, InvalidId> {
                let value = value.into();
                if value.is_empty()
                    || value.len() > MAX_ID_BYTES
                    || crate::protocol_gate::validate_protocol_identifier(&value).is_err()
                {
                    return Err(InvalidId);
                }
                Ok(Self(value))
            }

            pub fn as_str(&self) -> &str {
                &self.0
            }
        }
    };
}

typed_id!(AccountId);
typed_id!(DeviceId);
typed_id!(ContactId);
typed_id!(ConversationId);
typed_id!(MessageId);
typed_id!(DeliveryId);

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccountState {
    Locked,
    Ready,
    Recovering,
    Revoked,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AccountEvent {
    Unlock,
    Lock,
    BeginRecovery,
    CompleteRecovery,
    Revoke,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeviceState {
    Provisioning,
    Active,
    Revoked,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DeviceEvent {
    Activate,
    Revoke,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContactState {
    Invited,
    Pending,
    Verified,
    Blocked,
    Removed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ContactEvent {
    ReceiveRequest,
    Verify,
    Block,
    Unblock,
    Remove,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversationState {
    Pairing,
    Active,
    Suspended,
    Closed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ConversationEvent {
    Establish,
    Suspend,
    Resume,
    Close,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageState {
    Draft,
    Encrypted,
    Queued,
    RelayAccepted,
    RecipientReceived,
    Decrypted,
    Retryable,
    Failed,
    Expired,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MessageEvent {
    Encrypt,
    Queue,
    RelayAccept,
    Receive,
    Decrypt,
    Retry,
    Fail,
    Expire,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeliveryState {
    Queued,
    RelayAccepted,
    RecipientReceived,
    Decrypted,
    Retryable,
    Failed,
    Expired,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DeliveryEvent {
    RelayAccept,
    Receive,
    Decrypt,
    Retry,
    Fail,
    Expire,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvalidTransition {
    pub entity: &'static str,
    pub state: &'static str,
    pub event: &'static str,
}

impl fmt::Display for InvalidTransition {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "invalid {} transition: {} + {}",
            self.entity, self.state, self.event
        )
    }
}

impl std::error::Error for InvalidTransition {}

macro_rules! invalid {
    ($entity:literal, $state:expr, $event:expr) => {
        Err(InvalidTransition {
            entity: $entity,
            state: $state,
            event: $event,
        })
    };
}

impl AccountState {
    pub fn transition(self, event: AccountEvent) -> Result<Self, InvalidTransition> {
        match (self, event) {
            (Self::Locked, AccountEvent::Unlock) => Ok(Self::Ready),
            (Self::Ready, AccountEvent::Lock) => Ok(Self::Locked),
            (Self::Locked, AccountEvent::BeginRecovery) => Ok(Self::Recovering),
            (Self::Recovering, AccountEvent::CompleteRecovery) => Ok(Self::Ready),
            (Self::Locked | Self::Ready | Self::Recovering, AccountEvent::Revoke) => {
                Ok(Self::Revoked)
            }
            _ => invalid!("account", self.name(), event.name()),
        }
    }

    const fn name(self) -> &'static str {
        match self {
            Self::Locked => "locked",
            Self::Ready => "ready",
            Self::Recovering => "recovering",
            Self::Revoked => "revoked",
        }
    }
}

impl AccountEvent {
    const fn name(self) -> &'static str {
        match self {
            Self::Unlock => "unlock",
            Self::Lock => "lock",
            Self::BeginRecovery => "begin_recovery",
            Self::CompleteRecovery => "complete_recovery",
            Self::Revoke => "revoke",
        }
    }
}

impl DeviceState {
    pub fn transition(self, event: DeviceEvent) -> Result<Self, InvalidTransition> {
        match (self, event) {
            (Self::Provisioning, DeviceEvent::Activate) => Ok(Self::Active),
            (Self::Provisioning | Self::Active, DeviceEvent::Revoke) => Ok(Self::Revoked),
            _ => invalid!("device", self.name(), event.name()),
        }
    }

    const fn name(self) -> &'static str {
        match self {
            Self::Provisioning => "provisioning",
            Self::Active => "active",
            Self::Revoked => "revoked",
        }
    }
}

impl DeviceEvent {
    const fn name(self) -> &'static str {
        match self {
            Self::Activate => "activate",
            Self::Revoke => "revoke",
        }
    }
}

impl ContactState {
    pub fn transition(self, event: ContactEvent) -> Result<Self, InvalidTransition> {
        match (self, event) {
            (Self::Invited, ContactEvent::ReceiveRequest) => Ok(Self::Pending),
            (Self::Pending, ContactEvent::Verify) => Ok(Self::Verified),
            (Self::Verified, ContactEvent::Block) => Ok(Self::Blocked),
            (Self::Blocked, ContactEvent::Unblock) => Ok(Self::Verified),
            (
                Self::Invited | Self::Pending | Self::Verified | Self::Blocked,
                ContactEvent::Remove,
            ) => Ok(Self::Removed),
            _ => invalid!("contact", self.name(), event.name()),
        }
    }

    const fn name(self) -> &'static str {
        match self {
            Self::Invited => "invited",
            Self::Pending => "pending",
            Self::Verified => "verified",
            Self::Blocked => "blocked",
            Self::Removed => "removed",
        }
    }
}

impl ContactEvent {
    const fn name(self) -> &'static str {
        match self {
            Self::ReceiveRequest => "receive_request",
            Self::Verify => "verify",
            Self::Block => "block",
            Self::Unblock => "unblock",
            Self::Remove => "remove",
        }
    }
}

impl ConversationState {
    pub fn transition(self, event: ConversationEvent) -> Result<Self, InvalidTransition> {
        match (self, event) {
            (Self::Pairing, ConversationEvent::Establish) => Ok(Self::Active),
            (Self::Active, ConversationEvent::Suspend) => Ok(Self::Suspended),
            (Self::Suspended, ConversationEvent::Resume) => Ok(Self::Active),
            (Self::Pairing | Self::Active | Self::Suspended, ConversationEvent::Close) => {
                Ok(Self::Closed)
            }
            _ => invalid!("conversation", self.name(), event.name()),
        }
    }

    const fn name(self) -> &'static str {
        match self {
            Self::Pairing => "pairing",
            Self::Active => "active",
            Self::Suspended => "suspended",
            Self::Closed => "closed",
        }
    }
}

impl ConversationEvent {
    const fn name(self) -> &'static str {
        match self {
            Self::Establish => "establish",
            Self::Suspend => "suspend",
            Self::Resume => "resume",
            Self::Close => "close",
        }
    }
}

impl MessageState {
    pub fn transition(self, event: MessageEvent) -> Result<Self, InvalidTransition> {
        match (self, event) {
            (Self::Draft, MessageEvent::Encrypt) => Ok(Self::Encrypted),
            (Self::Encrypted, MessageEvent::Queue) => Ok(Self::Queued),
            (Self::Queued, MessageEvent::RelayAccept) => Ok(Self::RelayAccepted),
            (Self::RelayAccepted, MessageEvent::Receive) => Ok(Self::RecipientReceived),
            (Self::RecipientReceived, MessageEvent::Decrypt) => Ok(Self::Decrypted),
            (Self::Queued | Self::RelayAccepted, MessageEvent::Retry) => Ok(Self::Retryable),
            (Self::Retryable, MessageEvent::Queue) => Ok(Self::Queued),
            (
                Self::Draft
                | Self::Encrypted
                | Self::Queued
                | Self::RelayAccepted
                | Self::RecipientReceived
                | Self::Retryable,
                MessageEvent::Fail,
            ) => Ok(Self::Failed),
            (
                Self::Draft
                | Self::Encrypted
                | Self::Queued
                | Self::RelayAccepted
                | Self::Retryable,
                MessageEvent::Expire,
            ) => Ok(Self::Expired),
            _ => invalid!("message", self.name(), event.name()),
        }
    }

    const fn name(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Encrypted => "encrypted",
            Self::Queued => "queued",
            Self::RelayAccepted => "relay_accepted",
            Self::RecipientReceived => "recipient_received",
            Self::Decrypted => "decrypted",
            Self::Retryable => "retryable",
            Self::Failed => "failed",
            Self::Expired => "expired",
        }
    }
}

impl MessageEvent {
    const fn name(self) -> &'static str {
        match self {
            Self::Encrypt => "encrypt",
            Self::Queue => "queue",
            Self::RelayAccept => "relay_accept",
            Self::Receive => "receive",
            Self::Decrypt => "decrypt",
            Self::Retry => "retry",
            Self::Fail => "fail",
            Self::Expire => "expire",
        }
    }
}

impl DeliveryState {
    pub fn transition(self, event: DeliveryEvent) -> Result<Self, InvalidTransition> {
        match (self, event) {
            (Self::Queued, DeliveryEvent::RelayAccept) => Ok(Self::RelayAccepted),
            (Self::RelayAccepted, DeliveryEvent::Receive) => Ok(Self::RecipientReceived),
            (Self::RecipientReceived, DeliveryEvent::Decrypt) => Ok(Self::Decrypted),
            (Self::Queued | Self::RelayAccepted, DeliveryEvent::Retry) => Ok(Self::Retryable),
            (Self::Retryable, DeliveryEvent::Retry) => Ok(Self::Queued),
            (Self::Queued | Self::RelayAccepted | Self::Retryable, DeliveryEvent::Fail) => {
                Ok(Self::Failed)
            }
            (Self::Queued | Self::RelayAccepted | Self::Retryable, DeliveryEvent::Expire) => {
                Ok(Self::Expired)
            }
            _ => invalid!("delivery", self.name(), event.name()),
        }
    }

    const fn name(self) -> &'static str {
        match self {
            Self::Queued => "queued",
            Self::RelayAccepted => "relay_accepted",
            Self::RecipientReceived => "recipient_received",
            Self::Decrypted => "decrypted",
            Self::Retryable => "retryable",
            Self::Failed => "failed",
            Self::Expired => "expired",
        }
    }
}

impl DeliveryEvent {
    const fn name(self) -> &'static str {
        match self {
            Self::RelayAccept => "relay_accept",
            Self::Receive => "receive",
            Self::Decrypt => "decrypt",
            Self::Retry => "retry",
            Self::Fail => "fail",
            Self::Expire => "expire",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_bounded_and_typed() {
        assert!(AccountId::new("account-1").is_ok());
        assert!(AccountId::new("").is_err());
        assert!(DeviceId::new("device\n1").is_err());
        assert!(MessageId::new("m".repeat(MAX_ID_BYTES + 1)).is_err());
    }

    #[test]
    fn account_device_contact_and_conversation_transitions_fail_closed() {
        assert_eq!(
            AccountState::Locked.transition(AccountEvent::Unlock),
            Ok(AccountState::Ready)
        );
        assert_eq!(
            AccountState::Ready
                .transition(AccountEvent::Unlock)
                .unwrap_err()
                .event,
            "unlock"
        );
        assert_eq!(
            DeviceState::Provisioning.transition(DeviceEvent::Activate),
            Ok(DeviceState::Active)
        );
        assert_eq!(
            ContactState::Invited.transition(ContactEvent::ReceiveRequest),
            Ok(ContactState::Pending)
        );
        assert_eq!(
            ContactState::Removed
                .transition(ContactEvent::Verify)
                .unwrap_err()
                .entity,
            "contact"
        );
        assert_eq!(
            ConversationState::Pairing.transition(ConversationEvent::Establish),
            Ok(ConversationState::Active)
        );
    }

    #[test]
    fn message_and_delivery_follow_the_same_monotonic_delivery_contract() {
        let message = MessageState::Draft
            .transition(MessageEvent::Encrypt)
            .and_then(|state| state.transition(MessageEvent::Queue))
            .and_then(|state| state.transition(MessageEvent::RelayAccept))
            .and_then(|state| state.transition(MessageEvent::Receive))
            .and_then(|state| state.transition(MessageEvent::Decrypt));
        assert_eq!(message, Ok(MessageState::Decrypted));
        assert_eq!(
            MessageState::Decrypted
                .transition(MessageEvent::Retry)
                .unwrap_err()
                .state,
            "decrypted"
        );

        let delivery = DeliveryState::Queued
            .transition(DeliveryEvent::RelayAccept)
            .and_then(|state| state.transition(DeliveryEvent::Receive))
            .and_then(|state| state.transition(DeliveryEvent::Decrypt));
        assert_eq!(delivery, Ok(DeliveryState::Decrypted));
        assert_eq!(
            DeliveryState::Decrypted
                .transition(DeliveryEvent::Fail)
                .unwrap_err()
                .state,
            "decrypted"
        );
    }
}
