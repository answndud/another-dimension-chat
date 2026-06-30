use crate::{
    OnionInboundStreamError, OnionOutboundStreamError, OnionServiceDescriptorPublicationReady,
    PairwiseRendezvousEndpoint, RedactedTransportRuntimeEvent, TransportPolicy, TransportRoute,
    TransportRuntimeError, TransportRuntimeEventSink,
};
use another_dimension_identity::ContactId;
use another_dimension_protocol::Envelope;
use std::fmt;

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct OnionInboundStreamBoundary {
    _descriptor_ready: OnionServiceDescriptorPublicationReady,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OnionOutboundStreamBoundary {
    pairwise_endpoint: PairwiseRendezvousEndpoint,
    policy: TransportPolicy,
}

impl OnionInboundStreamBoundary {
    pub fn from_descriptor_publication_ready(
        descriptor_ready: OnionServiceDescriptorPublicationReady,
    ) -> Self {
        Self {
            _descriptor_ready: descriptor_ready,
        }
    }

    pub fn from_missing_descriptor_publication() -> Result<Self, OnionInboundStreamError> {
        Err(OnionInboundStreamError::DescriptorPublicationRequired)
    }

    pub fn accept_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), OnionInboundStreamError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::ReceiveFailed,
        ));
        Err(OnionInboundStreamError::InboundAcceptNotImplemented)
    }

    pub fn read_write_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), OnionInboundStreamError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::ReceiveFailed,
        ));
        Err(OnionInboundStreamError::InboundReadWriteNotImplemented)
    }
}

impl fmt::Debug for OnionInboundStreamBoundary {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionInboundStreamBoundary")
            .field("descriptor", &"<redacted>")
            .field("onion_endpoint", &"<redacted>")
            .field("remote_endpoint", &"<redacted>")
            .field("stream_id", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}

impl OnionOutboundStreamBoundary {
    pub fn from_pairwise_endpoint(
        pairwise_endpoint: PairwiseRendezvousEndpoint,
        policy: TransportPolicy,
    ) -> Result<Self, OnionOutboundStreamError> {
        let route = TransportRoute::OnionService(pairwise_endpoint.endpoint().clone());
        policy
            .require_allowed(&route)
            .map_err(|_| OnionOutboundStreamError::TransportPolicyViolation)?;

        Ok(Self {
            pairwise_endpoint,
            policy,
        })
    }

    pub fn from_missing_pairwise_endpoint() -> Result<Self, OnionOutboundStreamError> {
        Err(OnionOutboundStreamError::PairwiseEndpointRequired)
    }

    pub fn dial_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), OnionOutboundStreamError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::SendFailed,
        ));
        Err(OnionOutboundStreamError::OutboundDialNotImplemented)
    }

    pub fn send_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        _envelope: &Envelope,
        sink: &mut S,
    ) -> Result<(), OnionOutboundStreamError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::SendFailed,
        ));
        Err(OnionOutboundStreamError::OutboundSendNotImplemented)
    }

    pub fn contact_id(&self) -> &ContactId {
        self.pairwise_endpoint.contact_id()
    }

    pub fn policy(&self) -> &TransportPolicy {
        &self.policy
    }
}

impl fmt::Debug for OnionOutboundStreamBoundary {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionOutboundStreamBoundary")
            .field("pairwise_endpoint", &"<redacted>")
            .field("onion_endpoint", &"<redacted>")
            .field("remote_endpoint", &"<redacted>")
            .field("stream_id", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .field("policy_mode", &self.policy.mode())
            .finish()
    }
}
