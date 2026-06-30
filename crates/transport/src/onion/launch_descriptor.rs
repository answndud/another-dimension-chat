use std::fmt;

use crate::DescriptorPublicationPreparationError;
use crate::{
    DescriptorPublicationAdapterError, DescriptorPublicationGateError, OnionHostingGateReady,
    OnionServiceDescriptorPublicationError, OnionServiceKeyMaterialReady,
    OnionServiceLaunchPreflightError, ProfileTransportUnlockReady, RedactedTransportRuntimeEvent,
    TransportRuntimeError, TransportRuntimeEventSink,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionEndpointPublicationPolicy {
    Missing,
    PairwiseRendezvousOnly,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionEndpointUpdatePolicy {
    Missing,
    ExistingEncryptedSessionOnly,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionServiceLaunchPreflight {
    profile_unlocked: bool,
    onion_service_key_ready: bool,
    persistent_client_ready: bool,
    endpoint_publication_policy: OnionEndpointPublicationPolicy,
    endpoint_update_policy: OnionEndpointUpdatePolicy,
    redacted_events_only: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionServiceLaunchReady;

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct OnionServiceDescriptorPublicationBoundary {
    _launch_ready: OnionServiceLaunchReady,
    endpoint_publication_policy: OnionEndpointPublicationPolicy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionServiceDescriptorPublicationReady;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DescriptorPublicationGateReady {
    endpoint_publication_policy: OnionEndpointPublicationPolicy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DescriptorPublicationGateDecision {
    pub(crate) onion_hosting_gate_ready: Option<OnionHostingGateReady>,
    pub(crate) endpoint_publication_policy: OnionEndpointPublicationPolicy,
    pub(crate) redacted_events_only: bool,
    pub(crate) stream_io_enabled: bool,
    pub(crate) usable_messaging_claimed: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DescriptorPublicationPreparationReady {
    endpoint_publication_policy: OnionEndpointPublicationPolicy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RedactedDescriptorPublicationContext {
    endpoint_publication_policy: OnionEndpointPublicationPolicy,
    descriptor_body_present: bool,
    sensitive_context_present: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DescriptorPublicationPreparationBoundary {
    pub(crate) gate_ready: Option<DescriptorPublicationGateReady>,
    pub(crate) fail_closed_adapter_ready: bool,
    pub(crate) redacted_context: Option<RedactedDescriptorPublicationContext>,
    pub(crate) descriptor_body_created: bool,
    pub(crate) stream_io_enabled: bool,
    pub(crate) usable_messaging_claimed: bool,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct DescriptorPublicationFailClosedAdapter {
    _gate_ready: DescriptorPublicationGateReady,
    boundary: OnionServiceDescriptorPublicationBoundary,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct DescriptorPublicationAttemptIntent {
    endpoint_publication_policy: OnionEndpointPublicationPolicy,
}

impl OnionServiceLaunchPreflight {
    pub fn locked_down_by_default() -> Self {
        Self {
            profile_unlocked: false,
            onion_service_key_ready: false,
            persistent_client_ready: false,
            endpoint_publication_policy: OnionEndpointPublicationPolicy::Missing,
            endpoint_update_policy: OnionEndpointUpdatePolicy::Missing,
            redacted_events_only: false,
        }
    }

    pub fn from_ready_boundaries(
        _profile_unlock: &ProfileTransportUnlockReady,
        _key_material: &OnionServiceKeyMaterialReady,
        persistent_client_ready: bool,
        endpoint_publication_policy: OnionEndpointPublicationPolicy,
        endpoint_update_policy: OnionEndpointUpdatePolicy,
        redacted_events_only: bool,
    ) -> Self {
        Self {
            profile_unlocked: true,
            onion_service_key_ready: true,
            persistent_client_ready,
            endpoint_publication_policy,
            endpoint_update_policy,
            redacted_events_only,
        }
    }

    pub fn check(self) -> Result<OnionServiceLaunchReady, OnionServiceLaunchPreflightError> {
        if !self.profile_unlocked {
            return Err(OnionServiceLaunchPreflightError::ProfileUnlockRequired);
        }
        if !self.onion_service_key_ready {
            return Err(OnionServiceLaunchPreflightError::OnionServiceKeyNotReady);
        }
        if !self.persistent_client_ready {
            return Err(OnionServiceLaunchPreflightError::PersistentClientNotReady);
        }
        if self.endpoint_publication_policy == OnionEndpointPublicationPolicy::Missing {
            return Err(OnionServiceLaunchPreflightError::EndpointPublicationPolicyMissing);
        }
        if self.endpoint_update_policy == OnionEndpointUpdatePolicy::Missing {
            return Err(OnionServiceLaunchPreflightError::EndpointUpdatePolicyMissing);
        }
        if !self.redacted_events_only {
            return Err(OnionServiceLaunchPreflightError::LogRedactionRequired);
        }

        Ok(OnionServiceLaunchReady)
    }
}

impl OnionServiceDescriptorPublicationBoundary {
    pub fn from_launch_ready(
        launch_ready: OnionServiceLaunchReady,
        endpoint_publication_policy: OnionEndpointPublicationPolicy,
    ) -> Result<Self, OnionServiceDescriptorPublicationError> {
        if endpoint_publication_policy != OnionEndpointPublicationPolicy::PairwiseRendezvousOnly {
            return Err(OnionServiceDescriptorPublicationError::EndpointPublicationPolicyMissing);
        }
        Ok(Self {
            _launch_ready: launch_ready,
            endpoint_publication_policy,
        })
    }

    pub fn endpoint_publication_policy(self) -> OnionEndpointPublicationPolicy {
        self.endpoint_publication_policy
    }

    pub fn publish_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), OnionServiceDescriptorPublicationError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::OnionServiceLaunchFailed,
        ));
        Err(OnionServiceDescriptorPublicationError::DescriptorPublicationNotImplemented)
    }
}

impl fmt::Debug for OnionServiceDescriptorPublicationBoundary {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionServiceDescriptorPublicationBoundary")
            .field(
                "endpoint_publication_policy",
                &self.endpoint_publication_policy,
            )
            .field("descriptor", &"<not-published>")
            .field("onion_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}

impl DescriptorPublicationGateDecision {
    pub fn locked_down() -> Self {
        Self {
            onion_hosting_gate_ready: None,
            endpoint_publication_policy: OnionEndpointPublicationPolicy::Missing,
            redacted_events_only: false,
            stream_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn pairwise_rendezvous_only(
        onion_hosting_gate_ready: OnionHostingGateReady,
        endpoint_publication_policy: OnionEndpointPublicationPolicy,
        redacted_events_only: bool,
    ) -> Self {
        Self {
            onion_hosting_gate_ready: Some(onion_hosting_gate_ready),
            endpoint_publication_policy,
            redacted_events_only,
            stream_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn check(self) -> Result<DescriptorPublicationGateReady, DescriptorPublicationGateError> {
        if self.onion_hosting_gate_ready.is_none() {
            return Err(DescriptorPublicationGateError::OnionHostingGateRequired);
        }
        if self.endpoint_publication_policy
            != OnionEndpointPublicationPolicy::PairwiseRendezvousOnly
        {
            return Err(DescriptorPublicationGateError::PairwisePublicationPolicyRequired);
        }
        if !self.redacted_events_only {
            return Err(DescriptorPublicationGateError::RedactedEventPolicyRequired);
        }
        if self.stream_io_enabled {
            return Err(DescriptorPublicationGateError::StreamIoForbidden);
        }
        if self.usable_messaging_claimed {
            return Err(DescriptorPublicationGateError::UsableMessagingClaimForbidden);
        }

        Ok(DescriptorPublicationGateReady {
            endpoint_publication_policy: self.endpoint_publication_policy,
        })
    }
}

impl DescriptorPublicationGateReady {
    pub fn endpoint_publication_policy(self) -> OnionEndpointPublicationPolicy {
        self.endpoint_publication_policy
    }
}

impl DescriptorPublicationPreparationReady {
    pub fn endpoint_publication_policy(self) -> OnionEndpointPublicationPolicy {
        self.endpoint_publication_policy
    }
}

impl RedactedDescriptorPublicationContext {
    pub fn pairwise_rendezvous_only(
        endpoint_publication_policy: OnionEndpointPublicationPolicy,
    ) -> Self {
        Self {
            endpoint_publication_policy,
            descriptor_body_present: false,
            sensitive_context_present: false,
        }
    }

    pub fn unsafe_raw_context_for_test(
        endpoint_publication_policy: OnionEndpointPublicationPolicy,
    ) -> Self {
        Self {
            endpoint_publication_policy,
            descriptor_body_present: true,
            sensitive_context_present: true,
        }
    }

    pub fn endpoint_publication_policy(self) -> OnionEndpointPublicationPolicy {
        self.endpoint_publication_policy
    }

    pub fn is_redacted(self) -> bool {
        !self.descriptor_body_present && !self.sensitive_context_present
    }
}

impl DescriptorPublicationPreparationBoundary {
    pub fn locked_down() -> Self {
        Self {
            gate_ready: None,
            fail_closed_adapter_ready: false,
            redacted_context: None,
            descriptor_body_created: false,
            stream_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn from_fail_closed_adapter(
        gate_ready: DescriptorPublicationGateReady,
        _adapter: &DescriptorPublicationFailClosedAdapter,
        redacted_context: RedactedDescriptorPublicationContext,
    ) -> Self {
        Self {
            gate_ready: Some(gate_ready),
            fail_closed_adapter_ready: true,
            redacted_context: Some(redacted_context),
            descriptor_body_created: false,
            stream_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn check(
        self,
    ) -> Result<DescriptorPublicationPreparationReady, DescriptorPublicationPreparationError> {
        let gate_ready = self
            .gate_ready
            .ok_or(DescriptorPublicationPreparationError::DescriptorPublicationGateRequired)?;
        if !self.fail_closed_adapter_ready {
            return Err(
                DescriptorPublicationPreparationError::DescriptorPublicationAdapterRequired,
            );
        }
        let redacted_context = self
            .redacted_context
            .ok_or(DescriptorPublicationPreparationError::RedactedDescriptorContextRequired)?;
        if !redacted_context.is_redacted() {
            return Err(DescriptorPublicationPreparationError::RawDescriptorContextForbidden);
        }
        if redacted_context.endpoint_publication_policy()
            != gate_ready.endpoint_publication_policy()
        {
            return Err(DescriptorPublicationPreparationError::RedactedDescriptorContextRequired);
        }
        if self.descriptor_body_created {
            return Err(DescriptorPublicationPreparationError::DescriptorBodyForbidden);
        }
        if self.stream_io_enabled {
            return Err(DescriptorPublicationPreparationError::StreamIoForbidden);
        }
        if self.usable_messaging_claimed {
            return Err(DescriptorPublicationPreparationError::UsableMessagingClaimForbidden);
        }

        Ok(DescriptorPublicationPreparationReady {
            endpoint_publication_policy: gate_ready.endpoint_publication_policy(),
        })
    }
}

impl DescriptorPublicationFailClosedAdapter {
    pub fn from_gate_ready(
        gate_ready: DescriptorPublicationGateReady,
        launch_ready: OnionServiceLaunchReady,
    ) -> Result<Self, DescriptorPublicationAdapterError> {
        let boundary = OnionServiceDescriptorPublicationBoundary::from_launch_ready(
            launch_ready,
            gate_ready.endpoint_publication_policy(),
        )
        .map_err(|_| DescriptorPublicationAdapterError::EndpointPublicationPolicyMismatch)?;

        Ok(Self {
            _gate_ready: gate_ready,
            boundary,
        })
    }

    pub fn from_missing_gate() -> Result<Self, DescriptorPublicationAdapterError> {
        Err(DescriptorPublicationAdapterError::DescriptorPublicationGateRequired)
    }

    pub fn publish_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), DescriptorPublicationAdapterError> {
        self.prepare_publish_intent().publish_fail_closed(sink)
    }

    pub fn prepare_publish_intent(self) -> DescriptorPublicationAttemptIntent {
        DescriptorPublicationAttemptIntent {
            endpoint_publication_policy: self.boundary.endpoint_publication_policy(),
        }
    }

    pub fn endpoint_publication_policy(self) -> OnionEndpointPublicationPolicy {
        self.boundary.endpoint_publication_policy()
    }
}

impl DescriptorPublicationAttemptIntent {
    pub fn endpoint_publication_policy(self) -> OnionEndpointPublicationPolicy {
        self.endpoint_publication_policy
    }

    pub fn publish_fail_closed<S: TransportRuntimeEventSink>(
        self,
        sink: &mut S,
    ) -> Result<(), DescriptorPublicationAdapterError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::OnionServiceLaunchFailed,
        ));
        Err(DescriptorPublicationAdapterError::DescriptorPublicationNotImplemented)
    }
}

impl fmt::Debug for DescriptorPublicationAttemptIntent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("DescriptorPublicationAttemptIntent")
            .field(
                "endpoint_publication_policy",
                &self.endpoint_publication_policy,
            )
            .field("descriptor", &"<not-published>")
            .field("onion_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}

impl fmt::Debug for DescriptorPublicationFailClosedAdapter {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("DescriptorPublicationFailClosedAdapter")
            .field("gate", &"<ready>")
            .field("descriptor", &"<not-published>")
            .field("onion_endpoint", &"<redacted>")
            .field("contact_id", &"<redacted>")
            .field("profile_name", &"<redacted>")
            .finish()
    }
}
