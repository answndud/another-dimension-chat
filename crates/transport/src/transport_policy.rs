use another_dimension_identity::ProfileName;
use another_dimension_protocol::Envelope;

use crate::{
    OnionServiceEndpoint, TransportError, TransportRuntimeError, TransportRuntimePreflight,
    TransportRuntimeState,
};

pub trait Transport {
    fn send_envelope(
        &self,
        recipient: &ProfileName,
        envelope: &Envelope,
    ) -> Result<(), TransportError>;
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportMode {
    HighRiskOnionOnly,
    LocalOnly,
    LowRiskDirectAllowed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportKind {
    OnionService,
    LocalOnly,
    DirectPeer,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransportPolicy {
    mode: TransportMode,
}

impl TransportPolicy {
    pub fn practical_default() -> Self {
        Self::local_only()
    }

    pub fn advanced_high_risk_onion() -> Self {
        Self::high_risk_default()
    }

    pub fn high_risk_default() -> Self {
        Self {
            mode: TransportMode::HighRiskOnionOnly,
        }
    }

    pub fn local_only() -> Self {
        Self {
            mode: TransportMode::LocalOnly,
        }
    }

    pub fn low_risk_direct_allowed() -> Self {
        Self {
            mode: TransportMode::LowRiskDirectAllowed,
        }
    }

    pub fn mode(&self) -> TransportMode {
        self.mode
    }

    pub fn require_allowed(&self, route: &TransportRoute) -> Result<(), TransportError> {
        match (self.mode, route.kind()) {
            (TransportMode::HighRiskOnionOnly, TransportKind::OnionService)
            | (TransportMode::LocalOnly, TransportKind::LocalOnly)
            | (TransportMode::LowRiskDirectAllowed, _) => Ok(()),
            _ => Err(TransportError::PolicyViolation),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct NoSilentNetworkTransportBoundarySummary {
    default_policy_mode: TransportMode,
    default_route_kind: TransportKind,
    default_user_mediated_encrypted_exchange: bool,
    automatic_network_on_launch_allowed: bool,
    advanced_onion_controls_required: bool,
    explicit_user_permission_required_before_network: bool,
    room_profile_readiness_required_before_network: bool,
    reliable_onion_delivery_claim_allowed: bool,
    censorship_resistance_claim_allowed: bool,
    central_message_server_allowed: bool,
}

impl NoSilentNetworkTransportBoundarySummary {
    pub fn default_policy_mode(self) -> TransportMode {
        self.default_policy_mode
    }

    pub fn default_route_kind(self) -> TransportKind {
        self.default_route_kind
    }

    pub fn default_user_mediated_encrypted_exchange(self) -> bool {
        self.default_user_mediated_encrypted_exchange
    }

    pub fn automatic_network_on_launch_allowed(self) -> bool {
        self.automatic_network_on_launch_allowed
    }

    pub fn advanced_onion_controls_required(self) -> bool {
        self.advanced_onion_controls_required
    }

    pub fn explicit_user_permission_required_before_network(self) -> bool {
        self.explicit_user_permission_required_before_network
    }

    pub fn room_profile_readiness_required_before_network(self) -> bool {
        self.room_profile_readiness_required_before_network
    }

    pub fn reliable_onion_delivery_claim_allowed(self) -> bool {
        self.reliable_onion_delivery_claim_allowed
    }

    pub fn censorship_resistance_claim_allowed(self) -> bool {
        self.censorship_resistance_claim_allowed
    }

    pub fn central_message_server_allowed(self) -> bool {
        self.central_message_server_allowed
    }
}

pub fn no_silent_network_transport_boundary_summary(
) -> NoSilentNetworkTransportBoundarySummary {
    NoSilentNetworkTransportBoundarySummary {
        default_policy_mode: TransportPolicy::practical_default().mode(),
        default_route_kind: TransportKind::LocalOnly,
        default_user_mediated_encrypted_exchange: true,
        automatic_network_on_launch_allowed: false,
        advanced_onion_controls_required: true,
        explicit_user_permission_required_before_network: true,
        room_profile_readiness_required_before_network: true,
        reliable_onion_delivery_claim_allowed: false,
        censorship_resistance_claim_allowed: false,
        central_message_server_allowed: false,
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct HighRiskTransportMetadataMinimizationSummary {
    policy_mode: TransportMode,
    advanced_route_kind: TransportKind,
    onion_only: bool,
    direct_fallback_allowed: bool,
    dns_endpoint_allowed: bool,
    ip_endpoint_allowed: bool,
    explicit_user_permission_required: bool,
    app_launch_bootstrap_allowed: bool,
    bridge_censorship_failure_class_redacted: bool,
    bridge_line_exposed_in_status: bool,
    onion_endpoint_exposed_in_status: bool,
    descriptor_exposed_in_status: bool,
    local_path_exposed_in_status: bool,
    envelope_size_bucket: &'static str,
    optional_send_delay_supported: bool,
    timestamp_precision: &'static str,
    redacted_contact_id: bool,
    redacted_session_id: bool,
    endpoint_creation_state_separated: bool,
    endpoint_rotation_state_separated: bool,
    encrypted_endpoint_update_state_separated: bool,
    stream_send_receive_retry_cancel_state_separated: bool,
    not_ready_reason: &'static str,
}

impl HighRiskTransportMetadataMinimizationSummary {
    pub fn policy_mode(self) -> TransportMode {
        self.policy_mode
    }

    pub fn advanced_route_kind(self) -> TransportKind {
        self.advanced_route_kind
    }

    pub fn onion_only(self) -> bool {
        self.onion_only
    }

    pub fn direct_fallback_allowed(self) -> bool {
        self.direct_fallback_allowed
    }

    pub fn dns_endpoint_allowed(self) -> bool {
        self.dns_endpoint_allowed
    }

    pub fn ip_endpoint_allowed(self) -> bool {
        self.ip_endpoint_allowed
    }

    pub fn explicit_user_permission_required(self) -> bool {
        self.explicit_user_permission_required
    }

    pub fn app_launch_bootstrap_allowed(self) -> bool {
        self.app_launch_bootstrap_allowed
    }

    pub fn bridge_censorship_failure_class_redacted(self) -> bool {
        self.bridge_censorship_failure_class_redacted
    }

    pub fn bridge_line_exposed_in_status(self) -> bool {
        self.bridge_line_exposed_in_status
    }

    pub fn onion_endpoint_exposed_in_status(self) -> bool {
        self.onion_endpoint_exposed_in_status
    }

    pub fn descriptor_exposed_in_status(self) -> bool {
        self.descriptor_exposed_in_status
    }

    pub fn local_path_exposed_in_status(self) -> bool {
        self.local_path_exposed_in_status
    }

    pub fn envelope_size_bucket(self) -> &'static str {
        self.envelope_size_bucket
    }

    pub fn optional_send_delay_supported(self) -> bool {
        self.optional_send_delay_supported
    }

    pub fn timestamp_precision(self) -> &'static str {
        self.timestamp_precision
    }

    pub fn redacted_contact_id(self) -> bool {
        self.redacted_contact_id
    }

    pub fn redacted_session_id(self) -> bool {
        self.redacted_session_id
    }

    pub fn endpoint_creation_state_separated(self) -> bool {
        self.endpoint_creation_state_separated
    }

    pub fn endpoint_rotation_state_separated(self) -> bool {
        self.endpoint_rotation_state_separated
    }

    pub fn encrypted_endpoint_update_state_separated(self) -> bool {
        self.encrypted_endpoint_update_state_separated
    }

    pub fn stream_send_receive_retry_cancel_state_separated(self) -> bool {
        self.stream_send_receive_retry_cancel_state_separated
    }

    pub fn not_ready_reason(self) -> &'static str {
        self.not_ready_reason
    }
}

pub fn high_risk_transport_metadata_minimization_summary(
) -> HighRiskTransportMetadataMinimizationSummary {
    let policy = TransportPolicy::advanced_high_risk_onion();
    let onion_route =
        TransportRoute::onion("metadata-preflight.onion").expect("static onion route is valid");
    let direct_fallback_allowed = TransportRoute::direct_peer("direct-peer")
        .ok()
        .is_some_and(|route| policy.require_allowed(&route).is_ok());

    HighRiskTransportMetadataMinimizationSummary {
        policy_mode: policy.mode(),
        advanced_route_kind: onion_route.kind(),
        onion_only: policy.mode() == TransportMode::HighRiskOnionOnly
            && policy.require_allowed(&onion_route).is_ok(),
        direct_fallback_allowed,
        dns_endpoint_allowed: TransportRoute::onion("example.com").is_ok(),
        ip_endpoint_allowed: TransportRoute::onion("192.0.2.10").is_ok(),
        explicit_user_permission_required: true,
        app_launch_bootstrap_allowed: false,
        bridge_censorship_failure_class_redacted: true,
        bridge_line_exposed_in_status: false,
        onion_endpoint_exposed_in_status: false,
        descriptor_exposed_in_status: false,
        local_path_exposed_in_status: false,
        envelope_size_bucket: "bucket-4k",
        optional_send_delay_supported: true,
        timestamp_precision: "minute",
        redacted_contact_id: true,
        redacted_session_id: true,
        endpoint_creation_state_separated: true,
        endpoint_rotation_state_separated: true,
        encrypted_endpoint_update_state_separated: true,
        stream_send_receive_retry_cancel_state_separated: true,
        not_ready_reason: "runtime-network-disabled-until-explicit-user-action",
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TransportRoute {
    OnionService(OnionServiceEndpoint),
    LocalOnly(LocalTransportEndpoint),
    DirectPeer(DirectPeerEndpoint),
}

impl TransportRoute {
    pub fn onion(endpoint: impl Into<String>) -> Result<Self, TransportError> {
        Ok(Self::OnionService(OnionServiceEndpoint::new(endpoint)?))
    }

    pub fn local(endpoint: impl Into<String>) -> Result<Self, TransportError> {
        Ok(Self::LocalOnly(LocalTransportEndpoint::new(endpoint)?))
    }

    pub fn direct_peer(endpoint: impl Into<String>) -> Result<Self, TransportError> {
        Ok(Self::DirectPeer(DirectPeerEndpoint::new(endpoint)?))
    }

    pub fn kind(&self) -> TransportKind {
        match self {
            Self::OnionService(_) => TransportKind::OnionService,
            Self::LocalOnly(_) => TransportKind::LocalOnly,
            Self::DirectPeer(_) => TransportKind::DirectPeer,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalTransportEndpoint(String);

impl LocalTransportEndpoint {
    fn new(value: impl Into<String>) -> Result<Self, TransportError> {
        let value = value.into();
        if !is_safe_endpoint_token(&value) {
            return Err(TransportError::InvalidEndpoint);
        }
        Ok(Self(value))
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DirectPeerEndpoint(String);

impl DirectPeerEndpoint {
    fn new(value: impl Into<String>) -> Result<Self, TransportError> {
        let value = value.into();
        if !is_safe_endpoint_token(&value) {
            return Err(TransportError::InvalidEndpoint);
        }
        Ok(Self(value))
    }
}

pub struct TransportSendRequest<'a> {
    pub route: &'a TransportRoute,
    pub envelope: &'a Envelope,
}

pub struct TransportReceiveRequest<'a> {
    pub route: &'a TransportRoute,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportAdapterIntegrationBoundarySummary {
    policy_mode: TransportMode,
    runtime_state: TransportRuntimeState,
    fail_closed_blocker: Option<TransportRuntimeError>,
    envelope_io_available: bool,
}

impl TransportAdapterIntegrationBoundarySummary {
    pub fn policy_mode(self) -> TransportMode {
        self.policy_mode
    }

    pub fn runtime_state(self) -> TransportRuntimeState {
        self.runtime_state
    }

    pub fn fail_closed_blocker(self) -> Option<TransportRuntimeError> {
        self.fail_closed_blocker
    }

    pub fn envelope_io_available(self) -> bool {
        self.envelope_io_available
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportMessagePathBoundarySummary {
    route_kind: TransportKind,
    route_allowed_by_policy: bool,
    runtime_state: TransportRuntimeState,
    fail_closed_blocker: Option<TransportRuntimeError>,
    envelope_io_available: bool,
    send_receive_available: bool,
    offline_mailbox_available: bool,
    usable_messaging_enabled: bool,
}

impl TransportMessagePathBoundarySummary {
    pub fn route_kind(self) -> TransportKind {
        self.route_kind
    }

    pub fn route_allowed_by_policy(self) -> bool {
        self.route_allowed_by_policy
    }

    pub fn runtime_state(self) -> TransportRuntimeState {
        self.runtime_state
    }

    pub fn fail_closed_blocker(self) -> Option<TransportRuntimeError> {
        self.fail_closed_blocker
    }

    pub fn envelope_io_available(self) -> bool {
        self.envelope_io_available
    }

    pub fn send_receive_available(self) -> bool {
        self.send_receive_available
    }

    pub fn offline_mailbox_available(self) -> bool {
        self.offline_mailbox_available
    }

    pub fn usable_messaging_enabled(self) -> bool {
        self.usable_messaging_enabled
    }
}

pub trait EnvelopeTransport {
    fn send_envelope(&self, request: TransportSendRequest<'_>) -> Result<(), TransportError>;

    fn receive_envelopes(
        &self,
        request: TransportReceiveRequest<'_>,
    ) -> Result<Vec<Envelope>, TransportError>;
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OnionEnvelopeTransport {
    policy: TransportPolicy,
    runtime_state: TransportRuntimeState,
}

impl OnionEnvelopeTransport {
    pub fn fail_closed_high_risk() -> Self {
        Self {
            policy: TransportPolicy::high_risk_default(),
            runtime_state: TransportRuntimeState::disabled(),
        }
    }

    pub fn fail_closed_after_preflight(
        preflight: TransportRuntimePreflight,
    ) -> Result<Self, TransportRuntimeError> {
        Ok(Self {
            policy: TransportPolicy::high_risk_default(),
            runtime_state: TransportRuntimeState::from_preflight(preflight)?,
        })
    }

    pub fn policy(&self) -> &TransportPolicy {
        &self.policy
    }

    pub fn runtime_state(&self) -> TransportRuntimeState {
        self.runtime_state
    }

    pub fn integration_boundary_summary(&self) -> TransportAdapterIntegrationBoundarySummary {
        TransportAdapterIntegrationBoundarySummary {
            policy_mode: self.policy.mode(),
            runtime_state: self.runtime_state,
            fail_closed_blocker: self.runtime_state.fail_closed_blocker(),
            envelope_io_available: false,
        }
    }

    pub fn message_path_boundary_summary(
        &self,
        route: &TransportRoute,
    ) -> TransportMessagePathBoundarySummary {
        TransportMessagePathBoundarySummary {
            route_kind: route.kind(),
            route_allowed_by_policy: self.policy.require_allowed(route).is_ok(),
            runtime_state: self.runtime_state,
            fail_closed_blocker: self.runtime_state.fail_closed_blocker(),
            envelope_io_available: false,
            send_receive_available: false,
            offline_mailbox_available: false,
            usable_messaging_enabled: false,
        }
    }
}

impl EnvelopeTransport for OnionEnvelopeTransport {
    fn send_envelope(&self, request: TransportSendRequest<'_>) -> Result<(), TransportError> {
        self.policy.require_allowed(request.route)?;
        Err(TransportError::Unavailable)
    }

    fn receive_envelopes(
        &self,
        request: TransportReceiveRequest<'_>,
    ) -> Result<Vec<Envelope>, TransportError> {
        self.policy.require_allowed(request.route)?;
        Err(TransportError::Unavailable)
    }
}

pub(crate) fn is_safe_endpoint_token(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.')
}
