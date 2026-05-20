use another_dimension_protocol::Envelope;
use std::fmt;

use crate::{
    DescriptorPublicationFailClosedAdapter, DescriptorPublicationGateReady,
    InboundStreamAdapterError, InboundStreamGateError, OnionInboundStreamBoundary,
    OnionOutboundStreamBoundary, OnionServiceDescriptorPublicationReady,
    OutboundStreamAdapterError, OutboundStreamGateError, PairwiseRendezvousEndpoint,
    RedactedTransportRuntimeEvent, TransportMode, TransportPolicy, TransportRoute,
    TransportRuntimeError, TransportRuntimeEventSink,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct InboundStreamGateReady;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct InboundStreamGateDecision {
    pub(crate) descriptor_publication_gate_ready: Option<DescriptorPublicationGateReady>,
    pub(crate) descriptor_publication_adapter_ready: bool,
    pub(crate) accept_enabled: bool,
    pub(crate) read_write_enabled: bool,
    pub(crate) envelope_io_enabled: bool,
    pub(crate) usable_messaging_claimed: bool,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct InboundStreamFailClosedAdapter {
    _gate_ready: InboundStreamGateReady,
    boundary: OnionInboundStreamBoundary,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct InboundStreamAcceptIntent {
    boundary: OnionInboundStreamBoundary,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct InboundStreamReadWriteIntent {
    boundary: OnionInboundStreamBoundary,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OutboundStreamGateReady;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OutboundStreamGateDecision {
    pub(crate) pairwise_endpoint: Option<PairwiseRendezvousEndpoint>,
    pub(crate) policy: TransportPolicy,
    pub(crate) dial_enabled: bool,
    pub(crate) send_enabled: bool,
    pub(crate) envelope_io_enabled: bool,
    pub(crate) usable_messaging_claimed: bool,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OutboundStreamFailClosedAdapter {
    _gate_ready: OutboundStreamGateReady,
    boundary: OnionOutboundStreamBoundary,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OutboundStreamDialIntent {
    boundary: OnionOutboundStreamBoundary,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OutboundStreamSendIntent {
    boundary: OnionOutboundStreamBoundary,
}

impl InboundStreamGateDecision {
    pub fn locked_down() -> Self {
        Self {
            descriptor_publication_gate_ready: None,
            descriptor_publication_adapter_ready: false,
            accept_enabled: false,
            read_write_enabled: false,
            envelope_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn from_publication_gate_and_adapter(
        descriptor_publication_gate_ready: DescriptorPublicationGateReady,
        _adapter: &DescriptorPublicationFailClosedAdapter,
    ) -> Self {
        Self {
            descriptor_publication_gate_ready: Some(descriptor_publication_gate_ready),
            descriptor_publication_adapter_ready: true,
            accept_enabled: false,
            read_write_enabled: false,
            envelope_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn check(self) -> Result<InboundStreamGateReady, InboundStreamGateError> {
        if self.descriptor_publication_gate_ready.is_none() {
            return Err(InboundStreamGateError::DescriptorPublicationGateRequired);
        }
        if !self.descriptor_publication_adapter_ready {
            return Err(InboundStreamGateError::DescriptorPublicationAdapterRequired);
        }
        if self.accept_enabled {
            return Err(InboundStreamGateError::AcceptForbidden);
        }
        if self.read_write_enabled {
            return Err(InboundStreamGateError::ReadWriteForbidden);
        }
        if self.envelope_io_enabled {
            return Err(InboundStreamGateError::EnvelopeIoForbidden);
        }
        if self.usable_messaging_claimed {
            return Err(InboundStreamGateError::UsableMessagingClaimForbidden);
        }

        Ok(InboundStreamGateReady)
    }
}

impl InboundStreamFailClosedAdapter {
    pub fn from_gate_ready(
        gate_ready: InboundStreamGateReady,
        descriptor_ready: OnionServiceDescriptorPublicationReady,
    ) -> Self {
        Self {
            _gate_ready: gate_ready,
            boundary: OnionInboundStreamBoundary::from_descriptor_publication_ready(
                descriptor_ready,
            ),
        }
    }

    pub fn from_missing_gate() -> Result<Self, InboundStreamAdapterError> {
        Err(InboundStreamAdapterError::InboundStreamGateRequired)
    }

    pub fn accept_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), InboundStreamAdapterError> {
        self.prepare_accept_intent().accept_fail_closed(sink)
    }

    pub fn read_write_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), InboundStreamAdapterError> {
        self.prepare_read_write_intent()
            .read_write_fail_closed(sink)
    }

    pub fn prepare_accept_intent(self) -> InboundStreamAcceptIntent {
        InboundStreamAcceptIntent {
            boundary: self.boundary,
        }
    }

    pub fn prepare_read_write_intent(self) -> InboundStreamReadWriteIntent {
        InboundStreamReadWriteIntent {
            boundary: self.boundary,
        }
    }
}

impl InboundStreamAcceptIntent {
    pub fn accept_fail_closed<S: TransportRuntimeEventSink>(
        self,
        sink: &mut S,
    ) -> Result<(), InboundStreamAdapterError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::ReceiveFailed,
        ));
        Err(InboundStreamAdapterError::InboundAcceptNotImplemented)
    }
}

impl fmt::Debug for InboundStreamAcceptIntent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("InboundStreamAcceptIntent")
            .field("boundary", &self.boundary)
            .field("stream_id", &"<redacted>")
            .field("remote_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}

impl InboundStreamReadWriteIntent {
    pub fn read_write_fail_closed<S: TransportRuntimeEventSink>(
        self,
        sink: &mut S,
    ) -> Result<(), InboundStreamAdapterError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::ReceiveFailed,
        ));
        Err(InboundStreamAdapterError::InboundReadWriteNotImplemented)
    }
}

impl fmt::Debug for InboundStreamReadWriteIntent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("InboundStreamReadWriteIntent")
            .field("boundary", &self.boundary)
            .field("stream_id", &"<redacted>")
            .field("remote_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}

impl fmt::Debug for InboundStreamFailClosedAdapter {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("InboundStreamFailClosedAdapter")
            .field("gate", &"<ready>")
            .field("boundary", &self.boundary)
            .field("stream_id", &"<redacted>")
            .field("remote_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}

impl OutboundStreamGateDecision {
    pub fn locked_down() -> Self {
        Self {
            pairwise_endpoint: None,
            policy: TransportPolicy::local_only(),
            dial_enabled: false,
            send_enabled: false,
            envelope_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn from_pairwise_endpoint_and_policy(
        pairwise_endpoint: PairwiseRendezvousEndpoint,
        policy: TransportPolicy,
    ) -> Self {
        Self {
            pairwise_endpoint: Some(pairwise_endpoint),
            policy,
            dial_enabled: false,
            send_enabled: false,
            envelope_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn check(self) -> Result<OutboundStreamGateReady, OutboundStreamGateError> {
        let Some(pairwise_endpoint) = self.pairwise_endpoint else {
            return Err(OutboundStreamGateError::PairwiseEndpointRequired);
        };
        let route = TransportRoute::OnionService(pairwise_endpoint.endpoint().clone());
        if self.policy.mode() != TransportMode::HighRiskOnionOnly
            || self.policy.require_allowed(&route).is_err()
        {
            return Err(OutboundStreamGateError::HighRiskOnionPolicyRequired);
        }
        if self.dial_enabled {
            return Err(OutboundStreamGateError::DialForbidden);
        }
        if self.send_enabled {
            return Err(OutboundStreamGateError::SendForbidden);
        }
        if self.envelope_io_enabled {
            return Err(OutboundStreamGateError::EnvelopeIoForbidden);
        }
        if self.usable_messaging_claimed {
            return Err(OutboundStreamGateError::UsableMessagingClaimForbidden);
        }

        Ok(OutboundStreamGateReady)
    }
}

impl OutboundStreamFailClosedAdapter {
    pub fn from_gate_ready(
        gate_ready: OutboundStreamGateReady,
        pairwise_endpoint: PairwiseRendezvousEndpoint,
        policy: TransportPolicy,
    ) -> Result<Self, OutboundStreamAdapterError> {
        let boundary =
            OnionOutboundStreamBoundary::from_pairwise_endpoint(pairwise_endpoint, policy)
                .map_err(|_| OutboundStreamAdapterError::TransportPolicyViolation)?;

        Ok(Self {
            _gate_ready: gate_ready,
            boundary,
        })
    }

    pub fn from_missing_gate() -> Result<Self, OutboundStreamAdapterError> {
        Err(OutboundStreamAdapterError::OutboundStreamGateRequired)
    }

    pub fn dial_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), OutboundStreamAdapterError> {
        self.prepare_dial_intent().dial_fail_closed(sink)
    }

    pub fn send_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        envelope: &Envelope,
        sink: &mut S,
    ) -> Result<(), OutboundStreamAdapterError> {
        self.prepare_send_intent(envelope).send_fail_closed(sink)
    }

    pub fn prepare_dial_intent(&self) -> OutboundStreamDialIntent {
        OutboundStreamDialIntent {
            boundary: self.boundary.clone(),
        }
    }

    pub fn prepare_send_intent(&self, _envelope: &Envelope) -> OutboundStreamSendIntent {
        OutboundStreamSendIntent {
            boundary: self.boundary.clone(),
        }
    }
}

impl OutboundStreamDialIntent {
    pub fn dial_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), OutboundStreamAdapterError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::SendFailed,
        ));
        Err(OutboundStreamAdapterError::OutboundDialNotImplemented)
    }
}

impl fmt::Debug for OutboundStreamDialIntent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OutboundStreamDialIntent")
            .field("boundary", &self.boundary)
            .field("stream_id", &"<redacted>")
            .field("remote_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}

impl OutboundStreamSendIntent {
    pub fn send_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), OutboundStreamAdapterError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::SendFailed,
        ));
        Err(OutboundStreamAdapterError::OutboundSendNotImplemented)
    }
}

impl fmt::Debug for OutboundStreamSendIntent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OutboundStreamSendIntent")
            .field("boundary", &self.boundary)
            .field("envelope", &"<redacted>")
            .field("stream_id", &"<redacted>")
            .field("remote_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}

impl fmt::Debug for OutboundStreamFailClosedAdapter {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OutboundStreamFailClosedAdapter")
            .field("gate", &"<ready>")
            .field("boundary", &self.boundary)
            .field("stream_id", &"<redacted>")
            .field("remote_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}
