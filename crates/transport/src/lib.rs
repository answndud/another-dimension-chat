use another_dimension_identity::ProfileName;
use another_dimension_protocol::Envelope;

#[derive(Debug, Eq, PartialEq)]
pub enum TransportError {
    DeliveryFailed,
    ReceiveFailed,
    InvalidEndpoint,
    PolicyViolation,
}

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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalTransportEndpoint(String);

impl LocalTransportEndpoint {
    pub fn new(value: impl Into<String>) -> Result<Self, TransportError> {
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
    pub fn new(value: impl Into<String>) -> Result<Self, TransportError> {
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

pub trait EnvelopeTransport {
    fn send_envelope(&self, request: TransportSendRequest<'_>) -> Result<(), TransportError>;

    fn receive_envelopes(
        &self,
        request: TransportReceiveRequest<'_>,
    ) -> Result<Vec<Envelope>, TransportError>;
}

fn is_safe_endpoint_token(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.')
}

#[cfg(feature = "dev-insecure")]
pub mod dev_insecure {
    use super::*;
    use another_dimension_storage::{dev_insecure::DevFileStore, StorageError};

    #[derive(Clone, Debug)]
    pub struct DevFileTransport {
        store: DevFileStore,
    }

    impl DevFileTransport {
        pub fn new(store: DevFileStore) -> Self {
            Self { store }
        }
    }

    impl Transport for DevFileTransport {
        fn send_envelope(
            &self,
            recipient: &ProfileName,
            envelope: &Envelope,
        ) -> Result<(), TransportError> {
            self.store
                .save_inbox_envelope(recipient, envelope)
                .map_err(map_storage)
        }
    }

    fn map_storage(_error: StorageError) -> TransportError {
        TransportError::DeliveryFailed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn high_risk_default_allows_only_onion_routes() {
        let policy = TransportPolicy::high_risk_default();
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let direct = TransportRoute::direct_peer("192.0.2.10").expect("direct route");
        let local = TransportRoute::local("bluetooth-peer").expect("local route");

        assert_eq!(policy.mode(), TransportMode::HighRiskOnionOnly);
        assert_eq!(policy.require_allowed(&onion), Ok(()));
        assert_eq!(
            policy.require_allowed(&direct),
            Err(TransportError::PolicyViolation)
        );
        assert_eq!(
            policy.require_allowed(&local),
            Err(TransportError::PolicyViolation)
        );
    }

    #[test]
    fn local_only_policy_rejects_onion_and_direct_routes() {
        let policy = TransportPolicy::local_only();
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let direct = TransportRoute::direct_peer("peer.example").expect("direct route");
        let local = TransportRoute::local("wifi-direct-peer").expect("local route");

        assert_eq!(policy.require_allowed(&local), Ok(()));
        assert_eq!(
            policy.require_allowed(&onion),
            Err(TransportError::PolicyViolation)
        );
        assert_eq!(
            policy.require_allowed(&direct),
            Err(TransportError::PolicyViolation)
        );
    }

    #[test]
    fn direct_peer_requires_explicit_low_risk_policy() {
        let policy = TransportPolicy::low_risk_direct_allowed();
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let direct = TransportRoute::direct_peer("peer.example").expect("direct route");
        let local = TransportRoute::local("manual-bundle").expect("local route");

        assert_eq!(policy.require_allowed(&onion), Ok(()));
        assert_eq!(policy.require_allowed(&direct), Ok(()));
        assert_eq!(policy.require_allowed(&local), Ok(()));
    }

    #[test]
    fn onion_endpoint_validation_is_narrow() {
        assert!(TransportRoute::onion("example.onion").is_ok());
        for endpoint in ["", "example.com", "bad onion.onion", "../example.onion"] {
            assert_eq!(
                TransportRoute::onion(endpoint),
                Err(TransportError::InvalidEndpoint)
            );
        }
    }
}
