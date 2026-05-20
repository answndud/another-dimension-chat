use another_dimension_identity::ContactId;
use another_dimension_protocol::{bucket_for_len, pad_to_bucket, Envelope, MessageType};
use std::fmt;

use crate::{
    is_safe_endpoint_token, EndpointLifecycleError, RedactedTransportRuntimeEvent, TransportError,
    TransportRuntimeError, TransportRuntimeEventSink,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OnionServiceEndpoint(String);

impl OnionServiceEndpoint {
    pub fn new(value: impl Into<String>) -> Result<Self, TransportError> {
        let value = value.into();
        if !is_safe_endpoint_token(&value) || !value.ends_with(".onion") {
            return Err(TransportError::InvalidEndpoint);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RendezvousEndpointScope {
    PairwiseContact,
    GlobalDirectory,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RendezvousEndpointIdentityBinding {
    TransportScoped,
    DerivedFromIdentityKey,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EndpointUpdateChannel {
    ExistingEncryptedSession,
    PlaintextControl,
    OutOfBandPairingPayload,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub struct EndpointRotationSequence(u64);

impl EndpointRotationSequence {
    pub fn new(value: u64) -> Result<Self, EndpointLifecycleError> {
        if value == 0 {
            return Err(EndpointLifecycleError::EndpointRotationStale);
        }
        Ok(Self(value))
    }

    pub fn value(self) -> u64 {
        self.0
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EndpointRotationApplyContext {
    ExistingEncryptedSessionVerified,
    UnverifiedControlPayload,
}

#[derive(Clone, Eq, PartialEq)]
pub struct PairwiseRendezvousEndpoint {
    contact_id: ContactId,
    endpoint: OnionServiceEndpoint,
}

impl PairwiseRendezvousEndpoint {
    const STATE_SCHEMA: &'static str = "ADENDPOINTSTATE1";

    pub fn new(
        contact_id: ContactId,
        endpoint: OnionServiceEndpoint,
        scope: RendezvousEndpointScope,
        identity_binding: RendezvousEndpointIdentityBinding,
    ) -> Result<Self, EndpointLifecycleError> {
        if scope != RendezvousEndpointScope::PairwiseContact {
            return Err(EndpointLifecycleError::GlobalEndpointForbidden);
        }
        if identity_binding != RendezvousEndpointIdentityBinding::TransportScoped {
            return Err(EndpointLifecycleError::IdentityKeyCouplingForbidden);
        }

        Ok(Self {
            contact_id,
            endpoint,
        })
    }

    pub fn contact_id(&self) -> &ContactId {
        &self.contact_id
    }

    pub fn endpoint(&self) -> &OnionServiceEndpoint {
        &self.endpoint
    }

    pub fn encode_state(&self) -> String {
        format!(
            "{}|{}|{}",
            Self::STATE_SCHEMA,
            self.contact_id.as_str(),
            self.endpoint.as_str()
        )
    }

    pub fn decode_state(value: &str) -> Result<Self, EndpointLifecycleError> {
        let parts = value.trim().split('|').collect::<Vec<_>>();
        if parts.len() != 3 || parts[0] != Self::STATE_SCHEMA {
            return Err(EndpointLifecycleError::InvalidEndpointState);
        }
        let contact_id =
            ContactId::new(parts[1]).map_err(|_| EndpointLifecycleError::InvalidEndpointState)?;
        let endpoint = OnionServiceEndpoint::new(parts[2])
            .map_err(|_| EndpointLifecycleError::InvalidEndpointState)?;
        Self::new(
            contact_id,
            endpoint,
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
    }
}

impl fmt::Debug for PairwiseRendezvousEndpoint {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PairwiseRendezvousEndpoint")
            .field("contact_id", &"<redacted>")
            .field("endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct PairwiseEndpointUpdate {
    contact_id: ContactId,
    new_endpoint: OnionServiceEndpoint,
}

impl PairwiseEndpointUpdate {
    pub fn for_existing_encrypted_session(
        current: &PairwiseRendezvousEndpoint,
        new_endpoint: OnionServiceEndpoint,
        channel: EndpointUpdateChannel,
    ) -> Result<Self, EndpointLifecycleError> {
        if channel != EndpointUpdateChannel::ExistingEncryptedSession {
            return Err(EndpointLifecycleError::ExistingEncryptedSessionRequired);
        }
        if current.endpoint() == &new_endpoint {
            return Err(EndpointLifecycleError::EndpointUnchanged);
        }

        Ok(Self {
            contact_id: current.contact_id().clone(),
            new_endpoint,
        })
    }

    pub fn contact_id(&self) -> &ContactId {
        &self.contact_id
    }

    pub fn new_endpoint(&self) -> &OnionServiceEndpoint {
        &self.new_endpoint
    }
}

impl fmt::Debug for PairwiseEndpointUpdate {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PairwiseEndpointUpdate")
            .field("contact_id", &"<redacted>")
            .field("new_endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct PendingEndpointRotation {
    sequence: EndpointRotationSequence,
    update: PairwiseEndpointUpdate,
}

impl PendingEndpointRotation {
    pub fn sequence(&self) -> EndpointRotationSequence {
        self.sequence
    }

    pub fn update(&self) -> &PairwiseEndpointUpdate {
        &self.update
    }
}

impl fmt::Debug for PendingEndpointRotation {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PendingEndpointRotation")
            .field("sequence", &self.sequence)
            .field("contact_id", &"<redacted>")
            .field("new_endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct EndpointRotationReconnectIntent {
    sequence: EndpointRotationSequence,
}

impl EndpointRotationReconnectIntent {
    pub fn sequence(self) -> EndpointRotationSequence {
        self.sequence
    }

    pub fn reconnect_fail_closed<S: TransportRuntimeEventSink>(
        self,
        sink: &mut S,
    ) -> Result<(), EndpointLifecycleError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::RuntimeNetworkDisabled,
        ));
        Err(EndpointLifecycleError::EndpointReconnectNotImplemented)
    }
}

impl fmt::Debug for EndpointRotationReconnectIntent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("EndpointRotationReconnectIntent")
            .field("sequence", &self.sequence)
            .field("contact_id", &"<redacted>")
            .field("current_endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct PairwiseEndpointRotationState {
    current: PairwiseRendezvousEndpoint,
    pending: Option<PendingEndpointRotation>,
    last_applied_sequence: u64,
}

impl PairwiseEndpointRotationState {
    pub fn new(current: PairwiseRendezvousEndpoint) -> Self {
        Self {
            current,
            pending: None,
            last_applied_sequence: 0,
        }
    }

    pub fn current(&self) -> &PairwiseRendezvousEndpoint {
        &self.current
    }

    pub fn pending(&self) -> Option<&PendingEndpointRotation> {
        self.pending.as_ref()
    }

    pub fn last_applied_sequence(&self) -> u64 {
        self.last_applied_sequence
    }

    pub fn stage_verified_update(
        &mut self,
        update: PairwiseEndpointUpdate,
        sequence: EndpointRotationSequence,
        context: EndpointRotationApplyContext,
    ) -> Result<(), EndpointLifecycleError> {
        if context != EndpointRotationApplyContext::ExistingEncryptedSessionVerified {
            return Err(EndpointLifecycleError::EncryptedSessionVerificationRequired);
        }
        if update.contact_id() != self.current.contact_id() {
            return Err(EndpointLifecycleError::EndpointContactMismatch);
        }
        if sequence.value() <= self.last_applied_sequence {
            return Err(EndpointLifecycleError::EndpointRotationRollback);
        }
        if let Some(pending) = &self.pending {
            if sequence <= pending.sequence() {
                return Err(EndpointLifecycleError::EndpointRotationStale);
            }
        }

        self.pending = Some(PendingEndpointRotation { sequence, update });
        Ok(())
    }

    pub fn apply_pending(
        &mut self,
        sequence: EndpointRotationSequence,
    ) -> Result<(), EndpointLifecycleError> {
        let pending = self
            .pending
            .take()
            .ok_or(EndpointLifecycleError::EndpointRotationNotPending)?;
        if sequence != pending.sequence() {
            self.pending = Some(pending);
            return Err(EndpointLifecycleError::EndpointRotationStale);
        }
        if sequence.value() <= self.last_applied_sequence {
            self.pending = Some(pending);
            return Err(EndpointLifecycleError::EndpointRotationRollback);
        }

        self.current = PairwiseRendezvousEndpoint::new(
            pending.update.contact_id().clone(),
            pending.update.new_endpoint().clone(),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )?;
        self.last_applied_sequence = sequence.value();
        Ok(())
    }

    pub fn apply_pending_and_prepare_reconnect(
        &mut self,
        sequence: EndpointRotationSequence,
    ) -> Result<EndpointRotationReconnectIntent, EndpointLifecycleError> {
        self.apply_pending(sequence)?;
        Ok(EndpointRotationReconnectIntent { sequence })
    }

    pub fn reconnect_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), EndpointLifecycleError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::RuntimeNetworkDisabled,
        ));
        Err(EndpointLifecycleError::EndpointReconnectNotImplemented)
    }
}

impl fmt::Debug for PairwiseEndpointRotationState {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PairwiseEndpointRotationState")
            .field("contact_id", &"<redacted>")
            .field("current_endpoint", &"<redacted>")
            .field("pending", &self.pending.as_ref().map(|_| "<redacted>"))
            .field("last_applied_sequence", &self.last_applied_sequence)
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct EndpointUpdateControlPlaintext {
    new_endpoint: OnionServiceEndpoint,
}

impl EndpointUpdateControlPlaintext {
    const SCHEMA: &'static str = "ADENDPOINTUPDATE1";

    pub fn from_pairwise_update(update: &PairwiseEndpointUpdate) -> Self {
        Self {
            new_endpoint: update.new_endpoint().clone(),
        }
    }

    pub fn encode(&self) -> Vec<u8> {
        format!("{}|{}", Self::SCHEMA, self.new_endpoint.as_str()).into_bytes()
    }

    pub fn encode_padded(&self) -> Result<Vec<u8>, EndpointLifecycleError> {
        pad_to_bucket(&self.encode()).map_err(|_| EndpointLifecycleError::InvalidControlEnvelope)
    }
}

impl fmt::Debug for EndpointUpdateControlPlaintext {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("EndpointUpdateControlPlaintext")
            .field("new_endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct EncryptedEndpointUpdateControlEnvelope {
    contact_id: ContactId,
    envelope: Envelope,
}

impl EncryptedEndpointUpdateControlEnvelope {
    pub fn from_pairwise_update(
        update: &PairwiseEndpointUpdate,
        channel_id: impl Into<String>,
        message_number: u64,
        encrypted_payload: Vec<u8>,
    ) -> Result<Self, EndpointLifecycleError> {
        if encrypted_payload.is_empty() {
            return Err(EndpointLifecycleError::EmptyEncryptedPayload);
        }
        let channel_id = channel_id.into();
        let envelope = Envelope {
            protocol_version: 1,
            channel_id,
            message_number,
            message_type: MessageType::Control,
            padded_ciphertext: encrypted_payload,
        };

        Self::from_control_envelope(update, envelope)
    }

    pub fn from_control_envelope(
        update: &PairwiseEndpointUpdate,
        envelope: Envelope,
    ) -> Result<Self, EndpointLifecycleError> {
        if envelope.protocol_version != 1
            || envelope.channel_id.is_empty()
            || envelope.message_number == 0
            || envelope.message_type != MessageType::Control
        {
            return Err(EndpointLifecycleError::InvalidControlEnvelope);
        }
        if envelope.padded_ciphertext.is_empty() {
            return Err(EndpointLifecycleError::EmptyEncryptedPayload);
        }
        if bucket_for_len(envelope.padded_ciphertext.len()).is_none() {
            return Err(EndpointLifecycleError::InvalidControlEnvelope);
        }

        Ok(Self {
            contact_id: update.contact_id().clone(),
            envelope,
        })
    }

    pub fn contact_id(&self) -> &ContactId {
        &self.contact_id
    }

    pub fn envelope(&self) -> &Envelope {
        &self.envelope
    }
}

impl fmt::Debug for EncryptedEndpointUpdateControlEnvelope {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("EncryptedEndpointUpdateControlEnvelope")
            .field("contact_id", &"<redacted>")
            .field("message_type", &self.envelope.message_type)
            .field("message_number", &self.envelope.message_number)
            .field(
                "padded_ciphertext_len",
                &self.envelope.padded_ciphertext.len(),
            )
            .finish()
    }
}
