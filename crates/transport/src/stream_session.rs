use another_dimension_identity::ContactId;
use another_dimension_protocol::Envelope;
use std::fmt;

use crate::{
    EnvelopeIoAdapterError, InboundStreamFailClosedAdapter, InboundStreamPreparationReady,
    OnionInboundStreamBoundary, OnionOutboundStreamBoundary, OutboundStreamFailClosedAdapter,
    OutboundStreamPreparationReady, PostAuthStreamReadinessOrderingError,
    RedactedTransportRuntimeEvent, RemotePeerAuthenticationError, StreamAdapterCloseoutError,
    StreamCloseoutIntegrationError, StreamSessionBindingError, TransportRuntimeError,
    TransportRuntimeEventSink,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StreamSessionVerificationContext {
    VerifiedPairwiseEncryptedSession,
    UnverifiedSession,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RemotePeerAuthenticationContext {
    AuthenticatedPairwisePeer,
    UnauthenticatedPeer,
}

#[derive(Clone, Eq, PartialEq)]
pub struct PairwiseStreamSessionBinding {
    contact_id: ContactId,
}

impl PairwiseStreamSessionBinding {
    pub fn from_verified_pairwise_session(
        contact_id: ContactId,
        context: StreamSessionVerificationContext,
    ) -> Result<Self, StreamSessionBindingError> {
        if context != StreamSessionVerificationContext::VerifiedPairwiseEncryptedSession {
            return Err(StreamSessionBindingError::VerifiedPairwiseSessionRequired);
        }

        Ok(Self { contact_id })
    }

    pub fn contact_id(&self) -> &ContactId {
        &self.contact_id
    }
}

impl fmt::Debug for PairwiseStreamSessionBinding {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PairwiseStreamSessionBinding")
            .field("contact_id", &"<redacted>")
            .field("session", &"<verified>")
            .field("session_secret", &"<not-held>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct RemotePeerAuthenticationReady {
    contact_id: ContactId,
}

impl RemotePeerAuthenticationReady {
    pub fn from_authenticated_pairwise_peer(
        contact_id: ContactId,
        context: RemotePeerAuthenticationContext,
    ) -> Result<Self, RemotePeerAuthenticationError> {
        if context != RemotePeerAuthenticationContext::AuthenticatedPairwisePeer {
            return Err(RemotePeerAuthenticationError::RemotePeerAuthenticationRequired);
        }

        Ok(Self { contact_id })
    }

    pub fn from_missing_peer_proof() -> Result<Self, RemotePeerAuthenticationError> {
        Err(RemotePeerAuthenticationError::RemotePeerAuthenticationRequired)
    }

    pub fn contact_id(&self) -> &ContactId {
        &self.contact_id
    }
}

impl fmt::Debug for RemotePeerAuthenticationReady {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("RemotePeerAuthenticationReady")
            .field("contact_id", &"<redacted>")
            .field("peer_proof", &"<verified>")
            .field("session_transcript", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct BoundInboundStreamSession {
    _inbound_stream: OnionInboundStreamBoundary,
    session_binding: PairwiseStreamSessionBinding,
    _remote_peer_authentication: RemotePeerAuthenticationReady,
}

#[derive(Clone, Eq, PartialEq)]
pub struct BoundOutboundStreamSession {
    _outbound_stream: OnionOutboundStreamBoundary,
    session_binding: PairwiseStreamSessionBinding,
    _remote_peer_authentication: RemotePeerAuthenticationReady,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct EnvelopeIoAdapterReady;

#[derive(Clone, Eq, PartialEq)]
pub struct InboundEnvelopeIoAdapterBoundary {
    _bound_stream_session: BoundInboundStreamSession,
    _io_ready: EnvelopeIoAdapterReady,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OutboundEnvelopeIoAdapterBoundary {
    _bound_stream_session: BoundOutboundStreamSession,
    _io_ready: EnvelopeIoAdapterReady,
}

#[derive(Clone, Eq, PartialEq)]
pub struct PostAuthInboundStreamReadinessOrder {
    _envelope_io_boundary: InboundEnvelopeIoAdapterBoundary,
}

#[derive(Clone, Eq, PartialEq)]
pub struct PostAuthOutboundStreamReadinessOrder {
    _envelope_io_boundary: OutboundEnvelopeIoAdapterBoundary,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StreamAdapterCloseoutReady;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StreamAdapterCloseoutDecision {
    inbound_adapter_ready: bool,
    outbound_adapter_ready: bool,
    inbound_preparation_ready: bool,
    outbound_preparation_ready: bool,
    remote_peer_authentication_required: bool,
    verified_pairwise_session_required: bool,
    bound_session_shortcut_claimed: bool,
    envelope_io_claimed: bool,
    usable_messaging_claimed: bool,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct StreamAdapterCloseoutIntent {
    decision: StreamAdapterCloseoutDecision,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StreamCloseoutIntegrationOrder {
    closeout_ready: bool,
    remote_peer_authentication_next: bool,
    session_binding_after_remote_authentication: bool,
    envelope_io_claimed: bool,
    usable_messaging_claimed: bool,
}

impl BoundInboundStreamSession {
    pub fn from_inbound_stream(
        inbound_stream: OnionInboundStreamBoundary,
        session_binding: PairwiseStreamSessionBinding,
        remote_peer_authentication: RemotePeerAuthenticationReady,
    ) -> Result<Self, RemotePeerAuthenticationError> {
        if session_binding.contact_id() != remote_peer_authentication.contact_id() {
            return Err(RemotePeerAuthenticationError::ContactMismatch);
        }

        Ok(Self {
            _inbound_stream: inbound_stream,
            session_binding,
            _remote_peer_authentication: remote_peer_authentication,
        })
    }

    pub fn from_missing_session_binding() -> Result<Self, StreamSessionBindingError> {
        Err(StreamSessionBindingError::VerifiedPairwiseSessionRequired)
    }

    pub fn receive_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), StreamSessionBindingError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::ReceiveFailed,
        ));
        Err(StreamSessionBindingError::BoundInboundReceiveNotImplemented)
    }

    pub fn contact_id(&self) -> &ContactId {
        self.session_binding.contact_id()
    }
}

impl fmt::Debug for BoundInboundStreamSession {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("BoundInboundStreamSession")
            .field("stream", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("session", &"<verified>")
            .field("envelope", &"<not-read>")
            .finish()
    }
}

impl BoundOutboundStreamSession {
    pub fn from_outbound_stream(
        outbound_stream: OnionOutboundStreamBoundary,
        session_binding: PairwiseStreamSessionBinding,
        remote_peer_authentication: RemotePeerAuthenticationReady,
    ) -> Result<Self, RemotePeerAuthenticationError> {
        if outbound_stream.contact_id() != session_binding.contact_id() {
            return Err(RemotePeerAuthenticationError::ContactMismatch);
        }
        if outbound_stream.contact_id() != remote_peer_authentication.contact_id() {
            return Err(RemotePeerAuthenticationError::ContactMismatch);
        }

        Ok(Self {
            _outbound_stream: outbound_stream,
            session_binding,
            _remote_peer_authentication: remote_peer_authentication,
        })
    }

    pub fn from_missing_session_binding() -> Result<Self, StreamSessionBindingError> {
        Err(StreamSessionBindingError::VerifiedPairwiseSessionRequired)
    }

    pub fn send_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        _envelope: &Envelope,
        sink: &mut S,
    ) -> Result<(), StreamSessionBindingError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::SendFailed,
        ));
        Err(StreamSessionBindingError::BoundOutboundSendNotImplemented)
    }

    pub fn contact_id(&self) -> &ContactId {
        self.session_binding.contact_id()
    }
}

impl fmt::Debug for BoundOutboundStreamSession {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("BoundOutboundStreamSession")
            .field("stream", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("session", &"<verified>")
            .field("envelope", &"<not-sent>")
            .finish()
    }
}

impl InboundEnvelopeIoAdapterBoundary {
    pub fn from_bound_stream_session(
        bound_stream_session: BoundInboundStreamSession,
        io_ready: EnvelopeIoAdapterReady,
    ) -> Self {
        Self {
            _bound_stream_session: bound_stream_session,
            _io_ready: io_ready,
        }
    }

    pub fn from_missing_io_readiness() -> Result<Self, EnvelopeIoAdapterError> {
        Err(EnvelopeIoAdapterError::EnvelopeIoReadinessRequired)
    }

    pub fn receive_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<Vec<Envelope>, EnvelopeIoAdapterError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::ReceiveFailed,
        ));
        Err(EnvelopeIoAdapterError::InboundEnvelopeReceiveNotImplemented)
    }
}

impl fmt::Debug for InboundEnvelopeIoAdapterBoundary {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("InboundEnvelopeIoAdapterBoundary")
            .field("bound_stream_session", &"<redacted>")
            .field("io_readiness", &"<present>")
            .field("envelope", &"<not-read>")
            .field("padded_payload", &"<redacted>")
            .field("channel_id", &"<redacted>")
            .field("message_number", &"<redacted>")
            .finish()
    }
}

impl OutboundEnvelopeIoAdapterBoundary {
    pub fn from_bound_stream_session(
        bound_stream_session: BoundOutboundStreamSession,
        io_ready: EnvelopeIoAdapterReady,
    ) -> Self {
        Self {
            _bound_stream_session: bound_stream_session,
            _io_ready: io_ready,
        }
    }

    pub fn from_missing_io_readiness() -> Result<Self, EnvelopeIoAdapterError> {
        Err(EnvelopeIoAdapterError::EnvelopeIoReadinessRequired)
    }

    pub fn send_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        _envelope: &Envelope,
        sink: &mut S,
    ) -> Result<(), EnvelopeIoAdapterError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::SendFailed,
        ));
        Err(EnvelopeIoAdapterError::OutboundEnvelopeSendNotImplemented)
    }
}

impl fmt::Debug for OutboundEnvelopeIoAdapterBoundary {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OutboundEnvelopeIoAdapterBoundary")
            .field("bound_stream_session", &"<redacted>")
            .field("io_readiness", &"<present>")
            .field("envelope", &"<not-sent>")
            .field("padded_payload", &"<redacted>")
            .field("channel_id", &"<redacted>")
            .field("message_number", &"<redacted>")
            .finish()
    }
}

impl PostAuthInboundStreamReadinessOrder {
    pub fn from_envelope_io_boundary(
        envelope_io_boundary: InboundEnvelopeIoAdapterBoundary,
    ) -> Self {
        Self {
            _envelope_io_boundary: envelope_io_boundary,
        }
    }

    pub fn from_missing_envelope_io_boundary() -> Result<Self, PostAuthStreamReadinessOrderingError>
    {
        Err(PostAuthStreamReadinessOrderingError::EnvelopeIoBoundaryRequired)
    }
}

impl fmt::Debug for PostAuthInboundStreamReadinessOrder {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PostAuthInboundStreamReadinessOrder")
            .field("launch", &"<required-before-descriptor>")
            .field("descriptor", &"<required-before-inbound-stream>")
            .field("stream", &"<redacted>")
            .field(
                "remote_peer_authentication",
                &"<required-before-session-binding>",
            )
            .field("session_binding", &"<required-before-envelope-io>")
            .field("envelope_io", &"<fail-closed>")
            .finish()
    }
}

impl PostAuthOutboundStreamReadinessOrder {
    pub fn from_envelope_io_boundary(
        envelope_io_boundary: OutboundEnvelopeIoAdapterBoundary,
    ) -> Self {
        Self {
            _envelope_io_boundary: envelope_io_boundary,
        }
    }

    pub fn from_missing_envelope_io_boundary() -> Result<Self, PostAuthStreamReadinessOrderingError>
    {
        Err(PostAuthStreamReadinessOrderingError::EnvelopeIoBoundaryRequired)
    }
}

impl fmt::Debug for PostAuthOutboundStreamReadinessOrder {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PostAuthOutboundStreamReadinessOrder")
            .field("launch", &"<required-before-outbound-stream>")
            .field("pairwise_endpoint", &"<required-before-outbound-stream>")
            .field("stream", &"<redacted>")
            .field(
                "remote_peer_authentication",
                &"<required-before-session-binding>",
            )
            .field("session_binding", &"<required-before-envelope-io>")
            .field("envelope_io", &"<fail-closed>")
            .finish()
    }
}

impl StreamAdapterCloseoutDecision {
    pub fn locked_down() -> Self {
        Self {
            inbound_adapter_ready: false,
            outbound_adapter_ready: false,
            inbound_preparation_ready: false,
            outbound_preparation_ready: false,
            remote_peer_authentication_required: true,
            verified_pairwise_session_required: true,
            bound_session_shortcut_claimed: false,
            envelope_io_claimed: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn from_fail_closed_adapters(
        _inbound: &InboundStreamFailClosedAdapter,
        _outbound: &OutboundStreamFailClosedAdapter,
        _inbound_preparation: InboundStreamPreparationReady,
        _outbound_preparation: OutboundStreamPreparationReady,
    ) -> Self {
        Self {
            inbound_adapter_ready: true,
            outbound_adapter_ready: true,
            inbound_preparation_ready: true,
            outbound_preparation_ready: true,
            remote_peer_authentication_required: true,
            verified_pairwise_session_required: true,
            bound_session_shortcut_claimed: false,
            envelope_io_claimed: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn without_remote_peer_authentication_boundary(mut self) -> Self {
        self.remote_peer_authentication_required = false;
        self
    }

    pub fn without_verified_pairwise_session_boundary(mut self) -> Self {
        self.verified_pairwise_session_required = false;
        self
    }

    pub fn without_inbound_preparation(mut self) -> Self {
        self.inbound_preparation_ready = false;
        self
    }

    pub fn without_outbound_preparation(mut self) -> Self {
        self.outbound_preparation_ready = false;
        self
    }

    pub fn claim_bound_session_shortcut(mut self) -> Self {
        self.bound_session_shortcut_claimed = true;
        self
    }

    pub fn claim_envelope_io(mut self) -> Self {
        self.envelope_io_claimed = true;
        self
    }

    pub fn claim_usable_messaging(mut self) -> Self {
        self.usable_messaging_claimed = true;
        self
    }

    pub fn check(self) -> Result<StreamAdapterCloseoutReady, StreamAdapterCloseoutError> {
        if !self.inbound_adapter_ready {
            return Err(StreamAdapterCloseoutError::InboundAdapterRequired);
        }
        if !self.outbound_adapter_ready {
            return Err(StreamAdapterCloseoutError::OutboundAdapterRequired);
        }
        if !self.inbound_preparation_ready {
            return Err(StreamAdapterCloseoutError::InboundPreparationRequired);
        }
        if !self.outbound_preparation_ready {
            return Err(StreamAdapterCloseoutError::OutboundPreparationRequired);
        }
        if !self.remote_peer_authentication_required {
            return Err(StreamAdapterCloseoutError::RemotePeerAuthenticationBoundaryRequired);
        }
        if !self.verified_pairwise_session_required {
            return Err(StreamAdapterCloseoutError::VerifiedPairwiseSessionBoundaryRequired);
        }
        if self.bound_session_shortcut_claimed {
            return Err(StreamAdapterCloseoutError::BoundSessionShortcutForbidden);
        }
        if self.envelope_io_claimed {
            return Err(StreamAdapterCloseoutError::EnvelopeIoForbidden);
        }
        if self.usable_messaging_claimed {
            return Err(StreamAdapterCloseoutError::UsableMessagingClaimForbidden);
        }

        Ok(StreamAdapterCloseoutReady)
    }
}

impl StreamAdapterCloseoutIntent {
    pub fn from_fail_closed_adapters(
        inbound: &InboundStreamFailClosedAdapter,
        outbound: &OutboundStreamFailClosedAdapter,
        inbound_preparation: InboundStreamPreparationReady,
        outbound_preparation: OutboundStreamPreparationReady,
    ) -> Self {
        Self {
            decision: StreamAdapterCloseoutDecision::from_fail_closed_adapters(
                inbound,
                outbound,
                inbound_preparation,
                outbound_preparation,
            ),
        }
    }

    pub fn check(self) -> Result<StreamAdapterCloseoutReady, StreamAdapterCloseoutError> {
        self.decision.check()
    }
}

impl fmt::Debug for StreamAdapterCloseoutIntent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("StreamAdapterCloseoutIntent")
            .field("inbound_adapter", &"<ready>")
            .field("outbound_adapter", &"<ready>")
            .field("remote_peer_authentication", &"<required-next>")
            .field("verified_pairwise_session", &"<required-after-auth>")
            .field("bound_session_shortcut", &"<forbidden>")
            .field("envelope_io", &"<forbidden>")
            .field("usable_messaging", &"<forbidden>")
            .finish()
    }
}

impl StreamCloseoutIntegrationOrder {
    pub fn locked_down() -> Self {
        Self {
            closeout_ready: false,
            remote_peer_authentication_next: false,
            session_binding_after_remote_authentication: false,
            envelope_io_claimed: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn from_closeout_ready(_closeout: StreamAdapterCloseoutReady) -> Self {
        Self {
            closeout_ready: true,
            remote_peer_authentication_next: true,
            session_binding_after_remote_authentication: true,
            envelope_io_claimed: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn without_remote_peer_authentication_next(mut self) -> Self {
        self.remote_peer_authentication_next = false;
        self
    }

    pub fn without_session_binding_after_remote_authentication(mut self) -> Self {
        self.session_binding_after_remote_authentication = false;
        self
    }

    pub fn claim_envelope_io(mut self) -> Self {
        self.envelope_io_claimed = true;
        self
    }

    pub fn claim_usable_messaging(mut self) -> Self {
        self.usable_messaging_claimed = true;
        self
    }

    pub fn check(self) -> Result<Self, StreamCloseoutIntegrationError> {
        if !self.closeout_ready {
            return Err(StreamCloseoutIntegrationError::CloseoutReadyRequired);
        }
        if !self.remote_peer_authentication_next {
            return Err(StreamCloseoutIntegrationError::RemotePeerAuthenticationMustFollowCloseout);
        }
        if !self.session_binding_after_remote_authentication {
            return Err(
                StreamCloseoutIntegrationError::SessionBindingMustFollowRemotePeerAuthentication,
            );
        }
        if self.envelope_io_claimed {
            return Err(StreamCloseoutIntegrationError::EnvelopeIoForbidden);
        }
        if self.usable_messaging_claimed {
            return Err(StreamCloseoutIntegrationError::UsableMessagingClaimForbidden);
        }

        Ok(self)
    }
}
