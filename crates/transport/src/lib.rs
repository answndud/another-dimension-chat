use another_dimension_identity::ProfileName;
use another_dimension_protocol::Envelope;

#[derive(Debug, Eq, PartialEq)]
pub enum TransportError {
    DeliveryFailed,
    ReceiveFailed,
    InvalidEndpoint,
    PolicyViolation,
    Unavailable,
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

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OnionEnvelopeTransport {
    policy: TransportPolicy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyPolicy {
    DoNotGenerateUntilStorageDecision,
    AppPrivateArtiKeystoreAfterProfileLifecycleDecision,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ArtiLifecycleDecision {
    pub require_app_private_state_dir: bool,
    pub require_app_private_cache_dir: bool,
    pub allow_shared_default_arti_dirs: bool,
    pub require_backup_exclusion: bool,
    pub require_log_redaction: bool,
    pub onion_service_key_policy: OnionServiceKeyPolicy,
}

pub fn arti_lifecycle_decision() -> ArtiLifecycleDecision {
    ArtiLifecycleDecision {
        require_app_private_state_dir: true,
        require_app_private_cache_dir: true,
        allow_shared_default_arti_dirs: false,
        require_backup_exclusion: true,
        require_log_redaction: true,
        onion_service_key_policy: OnionServiceKeyPolicy::DoNotGenerateUntilStorageDecision,
    }
}

impl OnionEnvelopeTransport {
    pub fn fail_closed_high_risk() -> Self {
        Self {
            policy: TransportPolicy::high_risk_default(),
        }
    }

    pub fn policy(&self) -> &TransportPolicy {
        &self.policy
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

#[cfg(feature = "arti-adapter-spike")]
pub mod arti_adapter_spike {
    use super::*;
    use arti_client::TorClientConfig;

    #[derive(Clone, Debug)]
    pub struct ArtiAdapterSpike {
        config: TorClientConfig,
        transport: OnionEnvelopeTransport,
    }

    impl ArtiAdapterSpike {
        pub fn fail_closed_default_config() -> Self {
            Self {
                config: TorClientConfig::default(),
                transport: OnionEnvelopeTransport::fail_closed_high_risk(),
            }
        }

        pub fn config(&self) -> &TorClientConfig {
            &self.config
        }

        pub fn transport(&self) -> &OnionEnvelopeTransport {
            &self.transport
        }
    }
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
    use another_dimension_protocol::MessageType;

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

    #[test]
    fn onion_transport_skeleton_fails_closed_until_adapter_exists() {
        let transport = OnionEnvelopeTransport::fail_closed_high_risk();
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let envelope = sample_envelope();

        assert_eq!(
            transport.send_envelope(TransportSendRequest {
                route: &onion,
                envelope: &envelope,
            }),
            Err(TransportError::Unavailable)
        );
        assert_eq!(
            transport.receive_envelopes(TransportReceiveRequest { route: &onion }),
            Err(TransportError::Unavailable)
        );
    }

    #[test]
    fn onion_transport_skeleton_rejects_direct_routes_before_network_attempt() {
        let transport = OnionEnvelopeTransport::fail_closed_high_risk();
        let direct = TransportRoute::direct_peer("peer.example").expect("direct route");
        let envelope = sample_envelope();

        assert_eq!(
            transport.send_envelope(TransportSendRequest {
                route: &direct,
                envelope: &envelope,
            }),
            Err(TransportError::PolicyViolation)
        );
        assert_eq!(
            transport.receive_envelopes(TransportReceiveRequest { route: &direct }),
            Err(TransportError::PolicyViolation)
        );
    }

    #[test]
    fn arti_lifecycle_decision_rejects_shared_defaults_and_key_generation() {
        assert_eq!(
            arti_lifecycle_decision(),
            ArtiLifecycleDecision {
                require_app_private_state_dir: true,
                require_app_private_cache_dir: true,
                allow_shared_default_arti_dirs: false,
                require_backup_exclusion: true,
                require_log_redaction: true,
                onion_service_key_policy: OnionServiceKeyPolicy::DoNotGenerateUntilStorageDecision,
            }
        );
    }

    fn sample_envelope() -> Envelope {
        Envelope {
            protocol_version: 1,
            channel_id: "adchan1:test".to_string(),
            message_number: 1,
            message_type: MessageType::Data,
            padded_ciphertext: b"ciphertext".to_vec(),
        }
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn arti_adapter_spike_compiles_without_opening_network() {
        let spike = arti_adapter_spike::ArtiAdapterSpike::fail_closed_default_config();
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let envelope = sample_envelope();

        assert_eq!(
            spike.transport().policy().mode(),
            TransportMode::HighRiskOnionOnly
        );
        assert!(format!("{:?}", spike.config()).contains("TorClientConfig"));
        assert_eq!(
            spike.transport().send_envelope(TransportSendRequest {
                route: &onion,
                envelope: &envelope,
            }),
            Err(TransportError::Unavailable)
        );
    }
}
