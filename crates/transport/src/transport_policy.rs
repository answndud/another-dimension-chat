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
