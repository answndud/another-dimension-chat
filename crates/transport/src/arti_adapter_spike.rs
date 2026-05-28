use crate::{
    OnionEndpointPublicationPolicy, OnionEnvelopeTransport, OnionHostingGateDecision,
    OnionHostingGateError, OnionHostingGateFeatureState, OnionHostingGateReady,
    OnionInboundStreamBoundary, OnionOutboundStreamBoundary, OnionOutboundStreamError,
    OnionServiceDescriptorPublicationBoundary, OnionServiceDescriptorPublicationError,
    OnionServiceDescriptorPublicationReady, OnionServiceKeyMaterialReady, OnionServiceLaunchReady,
    PairwiseRendezvousEndpoint, RedactedTransportRuntimeEvent, TransportBootstrapExecutionSkeleton,
    TransportBootstrapOutcome, TransportPhaseCloseoutReady, TransportPolicy, TransportRuntimeError,
    TransportRuntimeEventSink,
};
use another_dimension_identity::ProfileName;
use arti_client::{config::TorClientConfigBuilder, TorClientConfig};
use std::fmt;
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ArtiConfigError {
    EmptyDirectory,
    RelativeDirectory,
    SharedDefaultDirectory,
    SameStateAndCacheDirectory,
    BuildFailed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ArtiBootstrapPolicy {
    DisabledUntilPreflightIsImplemented,
    ManualClientBootstrapOnly,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ArtiOnionServicePolicy {
    DisabledUntilKeyLifecycleDecision,
    LaunchAfterSeparateKeyDecision,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ArtiBridgePolicy {
    UnsupportedInCurrentSpike,
    ConfigureBeforeBootstrap,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ArtiBootstrapPreflight {
    pub bootstrap_policy: ArtiBootstrapPolicy,
    pub onion_service_policy: ArtiOnionServicePolicy,
    pub bridge_policy: ArtiBridgePolicy,
    pub require_log_redaction: bool,
    pub allow_runtime_network: bool,
    pub allow_onion_key_generation: bool,
}

pub fn bootstrap_preflight_boundary() -> ArtiBootstrapPreflight {
    ArtiBootstrapPreflight {
        bootstrap_policy: ArtiBootstrapPolicy::DisabledUntilPreflightIsImplemented,
        onion_service_policy: ArtiOnionServicePolicy::DisabledUntilKeyLifecycleDecision,
        bridge_policy: ArtiBridgePolicy::UnsupportedInCurrentSpike,
        require_log_redaction: true,
        allow_runtime_network: false,
        allow_onion_key_generation: false,
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ArtiAppPrivateDirs {
    state_dir: PathBuf,
    cache_dir: PathBuf,
}

impl ArtiAppPrivateDirs {
    pub fn new(
        state_dir: impl Into<PathBuf>,
        cache_dir: impl Into<PathBuf>,
    ) -> Result<Self, ArtiConfigError> {
        let state_dir = state_dir.into();
        let cache_dir = cache_dir.into();

        validate_app_private_dir(&state_dir)?;
        validate_app_private_dir(&cache_dir)?;
        if state_dir == cache_dir {
            return Err(ArtiConfigError::SameStateAndCacheDirectory);
        }

        Ok(Self {
            state_dir,
            cache_dir,
        })
    }

    pub fn state_dir(&self) -> &Path {
        &self.state_dir
    }

    pub fn cache_dir(&self) -> &Path {
        &self.cache_dir
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct ProfileScopedTransportDirs {
    dirs: ArtiAppPrivateDirs,
}

impl ProfileScopedTransportDirs {
    pub fn from_app_data_root(
        app_data_root: impl Into<PathBuf>,
        profile: &ProfileName,
    ) -> Result<Self, ArtiConfigError> {
        let app_data_root = app_data_root.into();
        validate_app_private_dir(&app_data_root)?;

        let profile_transport_root = app_data_root
            .join("profiles")
            .join(profile.as_str())
            .join("transport");
        let dirs = ArtiAppPrivateDirs::new(
            profile_transport_root.join("arti-state"),
            profile_transport_root.join("arti-cache"),
        )?;

        Ok(Self { dirs })
    }

    pub fn dirs(&self) -> &ArtiAppPrivateDirs {
        &self.dirs
    }

    pub fn into_arti_dirs(self) -> ArtiAppPrivateDirs {
        self.dirs
    }
}

impl fmt::Debug for ProfileScopedTransportDirs {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProfileScopedTransportDirs")
            .field("state_dir", &"<redacted>")
            .field("cache_dir", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Debug)]
pub struct ArtiAdapterSpike {
    config: TorClientConfig,
    transport: OnionEnvelopeTransport,
    dirs: Option<Arc<ArtiAppPrivateDirs>>,
}

impl ArtiAdapterSpike {
    pub fn fail_closed_default_config() -> Self {
        Self {
            config: TorClientConfig::default(),
            transport: OnionEnvelopeTransport::fail_closed_high_risk(),
            dirs: None,
        }
    }

    pub fn fail_closed_app_private_config(
        dirs: ArtiAppPrivateDirs,
    ) -> Result<Self, ArtiConfigError> {
        let config = TorClientConfigBuilder::from_directories(dirs.state_dir(), dirs.cache_dir())
            .build()
            .map_err(|_| ArtiConfigError::BuildFailed)?;

        Ok(Self {
            config,
            transport: OnionEnvelopeTransport::fail_closed_high_risk(),
            dirs: Some(Arc::new(dirs)),
        })
    }

    pub fn config(&self) -> &TorClientConfig {
        &self.config
    }

    pub fn transport(&self) -> &OnionEnvelopeTransport {
        &self.transport
    }

    pub fn dirs(&self) -> Option<&ArtiAppPrivateDirs> {
        self.dirs.as_deref()
    }
}

#[derive(Clone, Debug)]
pub struct BoundedArtiBootstrapAdapterSpike {
    config: TorClientConfig,
    dirs: Arc<ArtiAppPrivateDirs>,
    skeleton: TransportBootstrapExecutionSkeleton,
    transport: OnionEnvelopeTransport,
}

impl BoundedArtiBootstrapAdapterSpike {
    pub fn fail_closed_app_private_config(
        dirs: ArtiAppPrivateDirs,
        skeleton: TransportBootstrapExecutionSkeleton,
    ) -> Result<Self, ArtiConfigError> {
        let config = TorClientConfigBuilder::from_directories(dirs.state_dir(), dirs.cache_dir())
            .build()
            .map_err(|_| ArtiConfigError::BuildFailed)?;

        Ok(Self {
            config,
            dirs: Arc::new(dirs),
            skeleton,
            transport: OnionEnvelopeTransport::fail_closed_high_risk(),
        })
    }

    pub fn config(&self) -> &TorClientConfig {
        &self.config
    }

    pub fn dirs(&self) -> &ArtiAppPrivateDirs {
        &self.dirs
    }

    pub fn skeleton(&self) -> TransportBootstrapExecutionSkeleton {
        self.skeleton
    }

    pub fn transport(&self) -> &OnionEnvelopeTransport {
        &self.transport
    }

    pub fn execute_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        outcome: TransportBootstrapOutcome,
        sink: &mut S,
    ) -> Result<(), TransportRuntimeError> {
        self.skeleton.execute_fail_closed(outcome, sink)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PersistentArtiClientLifecycleState {
    Unbootstrapped,
    Bootstrapping,
    Bootstrapped,
    Dormant,
    Shutdown,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PersistentArtiClientLifecycleError {
    AlreadyShutdown,
    BootstrapAlreadyInProgress,
    ClientAlreadyBootstrapped,
    RuntimeNetworkDisabled,
    BootstrapFailed(TransportRuntimeError),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceLaunchAdapterError {
    PersistentClientNotBootstrapped,
    OnionServiceAlreadyLaunched,
    OnionServiceConfigBuildFailed,
    OnionHostingNotImplemented,
    OnionServiceLaunchFailed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PersistentArtiClientLifecycleSummary {
    state: PersistentArtiClientLifecycleState,
    client_owned: bool,
    onion_service_owned: bool,
    inbound_rend_request_stream_owned: bool,
    accepted_stream_request_stream_owned: bool,
    timeout_seconds: u16,
}

impl PersistentArtiClientLifecycleSummary {
    pub fn state(self) -> PersistentArtiClientLifecycleState {
        self.state
    }

    pub fn client_owned(self) -> bool {
        self.client_owned
    }

    pub fn onion_service_owned(self) -> bool {
        self.onion_service_owned
    }

    pub fn inbound_rend_request_stream_owned(self) -> bool {
        self.inbound_rend_request_stream_owned
    }

    pub fn accepted_stream_request_stream_owned(self) -> bool {
        self.accepted_stream_request_stream_owned
    }

    pub fn timeout_seconds(self) -> u16 {
        self.timeout_seconds
    }

    pub fn has_bootstrapped_client(self) -> bool {
        self.state == PersistentArtiClientLifecycleState::Bootstrapped && self.client_owned
    }

    pub fn can_prepare_onion_launch(self) -> bool {
        self.has_bootstrapped_client() && !self.onion_service_owned
    }
}

pub struct PersistentArtiClientOwner {
    adapter: BoundedArtiBootstrapAdapterSpike,
    state: PersistentArtiClientLifecycleState,
    client: Option<PersistentArtiClientHandle>,
    #[cfg(feature = "arti-manual-bootstrap")]
    onion_service: Option<PersistentOnionServiceHandle>,
}

#[cfg(feature = "arti-manual-bootstrap")]
enum PersistentArtiClientHandle {
    Real(Arc<arti_client::TorClient<tor_rtcompat::PreferredRuntime>>),
    #[cfg(test)]
    Test,
}

#[cfg(feature = "arti-manual-bootstrap")]
enum PersistentOnionServiceHandle {
    Real {
        service: Arc<tor_hsservice::RunningOnionService>,
        rend_requests: std::pin::Pin<
            Box<dyn futures::Stream<Item = tor_hsservice::RendRequest> + Send + Sync>,
        >,
        accepted_stream_requests: Option<
            std::sync::Mutex<
                std::pin::Pin<Box<dyn futures::Stream<Item = tor_hsservice::StreamRequest> + Send>>,
            >,
        >,
    },
    #[cfg(test)]
    #[allow(dead_code)]
    Test,
}

#[cfg(feature = "arti-manual-bootstrap")]
impl fmt::Debug for PersistentArtiClientHandle {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Real(_) => formatter.write_str("<bootstrapped-client>"),
            #[cfg(test)]
            Self::Test => formatter.write_str("<test-client>"),
        }
    }
}

#[cfg(feature = "arti-manual-bootstrap")]
impl fmt::Debug for PersistentOnionServiceHandle {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Real {
                service,
                rend_requests,
                accepted_stream_requests,
            } => {
                let _ = Arc::strong_count(service);
                let _ = rend_requests.as_ref();
                let _ = accepted_stream_requests
                    .as_ref()
                    .map(|stream| stream.is_poisoned());
                formatter.write_str("<running-onion-service>")
            }
            #[cfg(test)]
            Self::Test => formatter.write_str("<test-onion-service>"),
        }
    }
}

impl PersistentArtiClientOwner {
    pub fn new_unbootstrapped(adapter: BoundedArtiBootstrapAdapterSpike) -> Self {
        Self {
            adapter,
            state: PersistentArtiClientLifecycleState::Unbootstrapped,
            client: None,
            #[cfg(feature = "arti-manual-bootstrap")]
            onion_service: None,
        }
    }

    pub fn adapter(&self) -> &BoundedArtiBootstrapAdapterSpike {
        &self.adapter
    }

    pub fn state(&self) -> PersistentArtiClientLifecycleState {
        self.state
    }

    pub fn summary(&self) -> PersistentArtiClientLifecycleSummary {
        #[cfg(feature = "arti-manual-bootstrap")]
        let onion_service_owned = self.onion_service.is_some();
        #[cfg(not(feature = "arti-manual-bootstrap"))]
        let onion_service_owned = false;
        #[cfg(feature = "arti-manual-bootstrap")]
        let inbound_rend_request_stream_owned = self
            .onion_service
            .as_ref()
            .is_some_and(PersistentOnionServiceHandle::inbound_rend_request_stream_owned);
        #[cfg(feature = "arti-manual-bootstrap")]
        let accepted_stream_request_stream_owned = self
            .onion_service
            .as_ref()
            .is_some_and(PersistentOnionServiceHandle::accepted_stream_request_stream_owned);
        #[cfg(not(feature = "arti-manual-bootstrap"))]
        let inbound_rend_request_stream_owned = false;
        #[cfg(not(feature = "arti-manual-bootstrap"))]
        let accepted_stream_request_stream_owned = false;

        PersistentArtiClientLifecycleSummary {
            state: self.state,
            client_owned: self.client.is_some(),
            onion_service_owned,
            inbound_rend_request_stream_owned,
            accepted_stream_request_stream_owned,
            timeout_seconds: self.adapter.skeleton().policy().timeout().seconds(),
        }
    }

    pub fn mark_dormant<S: TransportRuntimeEventSink>(
        &mut self,
        sink: &mut S,
    ) -> Result<(), PersistentArtiClientLifecycleError> {
        if self.state == PersistentArtiClientLifecycleState::Shutdown {
            return Err(PersistentArtiClientLifecycleError::AlreadyShutdown);
        }

        self.state = PersistentArtiClientLifecycleState::Dormant;
        sink.record(RedactedTransportRuntimeEvent::runtime_lifecycle_changed());
        Ok(())
    }

    pub fn shutdown<S: TransportRuntimeEventSink>(&mut self, sink: &mut S) {
        #[cfg(feature = "arti-manual-bootstrap")]
        {
            self.onion_service = None;
        }
        self.client = None;
        self.state = PersistentArtiClientLifecycleState::Shutdown;
        sink.record(RedactedTransportRuntimeEvent::runtime_lifecycle_changed());
    }

    #[cfg(test)]
    pub fn mark_bootstrapped_for_adapter_test<S: TransportRuntimeEventSink>(
        &mut self,
        sink: &mut S,
    ) {
        self.client = Some(PersistentArtiClientHandle::Test);
        self.state = PersistentArtiClientLifecycleState::Bootstrapped;
        sink.record(RedactedTransportRuntimeEvent::runtime_lifecycle_changed());
    }
}

impl fmt::Debug for PersistentArtiClientOwner {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        #[cfg(feature = "arti-manual-bootstrap")]
        let onion_service_owned = self.onion_service.is_some();
        #[cfg(not(feature = "arti-manual-bootstrap"))]
        let onion_service_owned = false;

        formatter
            .debug_struct("PersistentArtiClientOwner")
            .field("state", &self.state)
            .field("client_owned", &self.client.is_some())
            .field("onion_service_owned", &onion_service_owned)
            .field(
                "inbound_rend_request_stream_owned",
                &self.summary().inbound_rend_request_stream_owned(),
            )
            .field(
                "accepted_stream_request_stream_owned",
                &self.summary().accepted_stream_request_stream_owned(),
            )
            .field("state_dir", &"<redacted>")
            .field("cache_dir", &"<redacted>")
            .finish()
    }
}

#[cfg(feature = "arti-manual-bootstrap")]
impl PersistentOnionServiceHandle {
    fn inbound_rend_request_stream_owned(&self) -> bool {
        match self {
            Self::Real { .. } => true,
            #[cfg(test)]
            Self::Test => false,
        }
    }

    fn accepted_stream_request_stream_owned(&self) -> bool {
        match self {
            Self::Real {
                accepted_stream_requests,
                ..
            } => accepted_stream_requests.is_some(),
            #[cfg(test)]
            Self::Test => false,
        }
    }

    fn onion_endpoint(&self) -> Option<String> {
        match self {
            Self::Real { service, .. } => {
                use safelog::DisplayRedacted;

                service
                    .onion_address()
                    .map(|address| address.display_unredacted().to_string())
            }
            #[cfg(test)]
            Self::Test => None,
        }
    }
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct OnionServiceLaunchAdapterSkeleton {
    _launch_ready: OnionServiceLaunchReady,
    _key_material_ready: bool,
    owner_summary: PersistentArtiClientLifecycleSummary,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionServiceLaunchAdapterSummary {
    owner_summary: PersistentArtiClientLifecycleSummary,
    key_material_ready: bool,
    launch_descriptor_created: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ArtiBootstrapToHostingReadinessAudit {
    transport_phase_closeout_ready: Option<TransportPhaseCloseoutReady>,
    launch_summary: OnionServiceLaunchAdapterSummary,
    manual_gate: crate::NetworkExperimentManualGate,
    feature_state: OnionHostingGateFeatureState,
}

impl OnionServiceLaunchAdapterSummary {
    pub fn owner_summary(self) -> PersistentArtiClientLifecycleSummary {
        self.owner_summary
    }

    pub fn key_material_ready(self) -> bool {
        self.key_material_ready
    }

    pub fn launch_descriptor_created(self) -> bool {
        self.launch_descriptor_created
    }

    pub fn can_attempt_fail_closed_launch(self) -> bool {
        self.owner_summary.can_prepare_onion_launch()
            && self.key_material_ready
            && !self.launch_descriptor_created
    }
}

impl ArtiBootstrapToHostingReadinessAudit {
    pub fn locked_down(launch_adapter: &OnionServiceLaunchAdapterSkeleton) -> Self {
        Self {
            transport_phase_closeout_ready: None,
            launch_summary: launch_adapter.summary(),
            manual_gate: crate::NetworkExperimentManualGate::Disabled,
            feature_state: OnionHostingGateFeatureState::NotCompiled,
        }
    }

    pub fn from_ready_boundaries(
        transport_phase_closeout_ready: TransportPhaseCloseoutReady,
        launch_adapter: &OnionServiceLaunchAdapterSkeleton,
    ) -> Self {
        Self {
            transport_phase_closeout_ready: Some(transport_phase_closeout_ready),
            launch_summary: launch_adapter.summary(),
            manual_gate: crate::NetworkExperimentManualGate::FeatureGatedManualOnly,
            feature_state: OnionHostingGateFeatureState::ArtiAdapterSpikeFeature,
        }
    }

    pub fn launch_summary(self) -> OnionServiceLaunchAdapterSummary {
        self.launch_summary
    }

    pub fn check(self) -> Result<OnionHostingGateReady, OnionHostingGateError> {
        OnionHostingGateDecision {
            transport_phase_closeout_ready: self.transport_phase_closeout_ready,
            manual_gate: self.manual_gate,
            feature_state: self.feature_state,
            launch_preflight_ready: self.launch_summary.can_attempt_fail_closed_launch(),
            onion_service_key_ready: self.launch_summary.key_material_ready(),
            bootstrapped_persistent_client_ready: self
                .launch_summary
                .owner_summary()
                .has_bootstrapped_client(),
            descriptor_publication_enabled: false,
            stream_io_enabled: false,
            usable_messaging_claimed: false,
        }
        .check()
    }
}

impl OnionServiceLaunchAdapterSkeleton {
    pub fn from_ready_owner(
        launch_ready: OnionServiceLaunchReady,
        _key_material: &OnionServiceKeyMaterialReady,
        owner: &PersistentArtiClientOwner,
    ) -> Result<Self, OnionServiceLaunchAdapterError> {
        let owner_summary = owner.summary();
        if !owner_summary.can_prepare_onion_launch() {
            return Err(OnionServiceLaunchAdapterError::PersistentClientNotBootstrapped);
        }

        Ok(Self {
            _launch_ready: launch_ready,
            _key_material_ready: true,
            owner_summary,
        })
    }

    pub fn owner_summary(self) -> PersistentArtiClientLifecycleSummary {
        self.owner_summary
    }

    pub fn summary(self) -> OnionServiceLaunchAdapterSummary {
        OnionServiceLaunchAdapterSummary {
            owner_summary: self.owner_summary,
            key_material_ready: self._key_material_ready,
            launch_descriptor_created: self.owner_summary.onion_service_owned(),
        }
    }

    pub fn launch_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), OnionServiceLaunchAdapterError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::OnionServiceLaunchFailed,
        ));
        Err(OnionServiceLaunchAdapterError::OnionHostingNotImplemented)
    }

    pub fn descriptor_publication_boundary(
        &self,
        endpoint_publication_policy: OnionEndpointPublicationPolicy,
    ) -> Result<OnionServiceDescriptorPublicationBoundary, OnionServiceDescriptorPublicationError>
    {
        OnionServiceDescriptorPublicationBoundary::from_launch_ready(
            self._launch_ready,
            endpoint_publication_policy,
        )
    }

    pub fn inbound_stream_boundary(
        &self,
        descriptor_ready: OnionServiceDescriptorPublicationReady,
    ) -> OnionInboundStreamBoundary {
        OnionInboundStreamBoundary::from_descriptor_publication_ready(descriptor_ready)
    }

    pub fn outbound_stream_boundary(
        &self,
        pairwise_endpoint: PairwiseRendezvousEndpoint,
        policy: TransportPolicy,
    ) -> Result<OnionOutboundStreamBoundary, OnionOutboundStreamError> {
        OnionOutboundStreamBoundary::from_pairwise_endpoint(pairwise_endpoint, policy)
    }
}

impl fmt::Debug for OnionServiceLaunchAdapterSkeleton {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let summary = self.summary();
        formatter
            .debug_struct("OnionServiceLaunchAdapterSkeleton")
            .field("owner_state", &summary.owner_summary().state())
            .field("client_owned", &summary.owner_summary().client_owned())
            .field(
                "can_attempt_fail_closed_launch",
                &summary.can_attempt_fail_closed_launch(),
            )
            .field("key_material", &"<redacted>")
            .field("launch_descriptor", &"<not-created>")
            .field("state_dir", &"<redacted>")
            .field("cache_dir", &"<redacted>")
            .finish()
    }
}

#[cfg(feature = "arti-manual-bootstrap")]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ManualArtiBootstrapNetworkPermission {
    Disabled,
    ExplicitlyEnabledForManualSpike,
}

#[cfg(feature = "arti-manual-bootstrap")]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ManualArtiBootstrapAttemptSummary {
    network_permission: ManualArtiBootstrapNetworkPermission,
    timeout_seconds: u16,
}

#[cfg(feature = "arti-manual-bootstrap")]
impl ManualArtiBootstrapAttemptSummary {
    pub fn network_permission(self) -> ManualArtiBootstrapNetworkPermission {
        self.network_permission
    }

    pub fn timeout_seconds(self) -> u16 {
        self.timeout_seconds
    }

    pub fn network_disabled(self) -> bool {
        self.network_permission == ManualArtiBootstrapNetworkPermission::Disabled
    }

    pub fn permits_manual_network_attempt(self) -> bool {
        self.network_permission
            == ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike
    }
}

#[cfg(feature = "arti-manual-bootstrap")]
#[derive(Clone, Debug)]
pub struct ManualArtiBootstrapAttemptGate {
    adapter: BoundedArtiBootstrapAdapterSpike,
    network_permission: ManualArtiBootstrapNetworkPermission,
}

#[cfg(feature = "arti-manual-bootstrap")]
impl ManualArtiBootstrapAttemptGate {
    pub fn disabled(adapter: BoundedArtiBootstrapAdapterSpike) -> Self {
        Self {
            adapter,
            network_permission: ManualArtiBootstrapNetworkPermission::Disabled,
        }
    }

    pub fn explicitly_enabled_for_manual_spike(adapter: BoundedArtiBootstrapAdapterSpike) -> Self {
        Self {
            adapter,
            network_permission:
                ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike,
        }
    }

    pub fn summary(&self) -> ManualArtiBootstrapAttemptSummary {
        ManualArtiBootstrapAttemptSummary {
            network_permission: self.network_permission,
            timeout_seconds: self.adapter.skeleton().policy().timeout().seconds(),
        }
    }

    pub fn adapter(&self) -> &BoundedArtiBootstrapAdapterSpike {
        &self.adapter
    }

    pub async fn bootstrap_once_and_drop_client<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), TransportRuntimeError> {
        let summary = self.summary();
        if summary.network_disabled() {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::bootstrap_failed(error));
            return Err(error);
        }

        let policy = self.adapter.skeleton().policy();
        let timeout = std::time::Duration::from_secs(u64::from(policy.timeout().seconds()));
        let attempt = arti_client::TorClient::create_bootstrapped(self.adapter.config().clone());

        match tokio::time::timeout(timeout, attempt).await {
            Ok(Ok(_client)) => {
                sink.record(RedactedTransportRuntimeEvent::bootstrap_succeeded());
                Ok(())
            }
            Ok(Err(_error)) => self
                .adapter
                .execute_fail_closed(TransportBootstrapOutcome::TransientNetworkFailure, sink),
            Err(_elapsed) => self
                .adapter
                .execute_fail_closed(TransportBootstrapOutcome::TimedOut, sink),
        }
    }
}

#[cfg(feature = "arti-manual-bootstrap")]
impl PersistentArtiClientOwner {
    pub async fn bootstrap_and_keep_client<S: TransportRuntimeEventSink>(
        &mut self,
        network_permission: ManualArtiBootstrapNetworkPermission,
        sink: &mut S,
    ) -> Result<(), PersistentArtiClientLifecycleError> {
        match self.state {
            PersistentArtiClientLifecycleState::Shutdown => {
                return Err(PersistentArtiClientLifecycleError::AlreadyShutdown);
            }
            PersistentArtiClientLifecycleState::Bootstrapping => {
                return Err(PersistentArtiClientLifecycleError::BootstrapAlreadyInProgress);
            }
            PersistentArtiClientLifecycleState::Bootstrapped => {
                return Err(PersistentArtiClientLifecycleError::ClientAlreadyBootstrapped);
            }
            PersistentArtiClientLifecycleState::Unbootstrapped
            | PersistentArtiClientLifecycleState::Dormant => {}
        }

        let attempt_summary = ManualArtiBootstrapAttemptSummary {
            network_permission,
            timeout_seconds: self.adapter.skeleton().policy().timeout().seconds(),
        };
        if attempt_summary.network_disabled() {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::bootstrap_failed(error));
            return Err(PersistentArtiClientLifecycleError::RuntimeNetworkDisabled);
        }

        self.state = PersistentArtiClientLifecycleState::Bootstrapping;
        sink.record(RedactedTransportRuntimeEvent::runtime_lifecycle_changed());

        let policy = self.adapter.skeleton().policy();
        let timeout = std::time::Duration::from_secs(u64::from(policy.timeout().seconds()));
        let attempt = arti_client::TorClient::create_bootstrapped(self.adapter.config().clone());

        match tokio::time::timeout(timeout, attempt).await {
            Ok(Ok(client)) => {
                self.client = Some(PersistentArtiClientHandle::Real(Arc::new(client)));
                self.state = PersistentArtiClientLifecycleState::Bootstrapped;
                sink.record(RedactedTransportRuntimeEvent::bootstrap_succeeded());
                Ok(())
            }
            Ok(Err(_error)) => {
                self.state = PersistentArtiClientLifecycleState::Unbootstrapped;
                let error =
                    TransportBootstrapOutcome::TransientNetworkFailure.runtime_error(policy);
                sink.record(RedactedTransportRuntimeEvent::bootstrap_failed(error));
                Err(PersistentArtiClientLifecycleError::BootstrapFailed(error))
            }
            Err(_elapsed) => {
                self.state = PersistentArtiClientLifecycleState::Unbootstrapped;
                let error = TransportBootstrapOutcome::TimedOut.runtime_error(policy);
                sink.record(RedactedTransportRuntimeEvent::bootstrap_failed(error));
                Err(PersistentArtiClientLifecycleError::BootstrapFailed(error))
            }
        }
    }

    pub async fn write_outbound_envelope_once<S: TransportRuntimeEventSink>(
        &self,
        network_permission: ManualArtiBootstrapNetworkPermission,
        onion_endpoint: &str,
        envelope_payload: &[u8],
        sink: &mut S,
    ) -> Result<(), TransportRuntimeError> {
        use futures::io::AsyncWriteExt;

        if network_permission
            != ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike
        {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Send,
                error,
            ));
            return Err(error);
        }
        if self.state != PersistentArtiClientLifecycleState::Bootstrapped {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Send,
                error,
            ));
            return Err(error);
        }

        let Some(PersistentArtiClientHandle::Real(client)) = self.client.as_ref() else {
            let error = TransportRuntimeError::SendFailed;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Send,
                error,
            ));
            return Err(error);
        };

        let timeout = std::time::Duration::from_secs(u64::from(
            self.adapter.skeleton().policy().timeout().seconds(),
        ));
        let attempt = async {
            let mut stream = client
                .connect((onion_endpoint, 443))
                .await
                .map_err(|_| TransportRuntimeError::SendFailed)?;
            stream
                .write_all(envelope_payload)
                .await
                .map_err(|_| TransportRuntimeError::SendFailed)?;
            stream
                .flush()
                .await
                .map_err(|_| TransportRuntimeError::SendFailed)?;
            Ok(())
        };

        match tokio::time::timeout(timeout, attempt).await {
            Ok(Ok(())) => Ok(()),
            Ok(Err(error)) => {
                sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                    crate::TransportTransferDirection::Send,
                    error,
                ));
                Err(error)
            }
            Err(_) => {
                let error = TransportRuntimeError::SendFailed;
                sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                    crate::TransportTransferDirection::Send,
                    error,
                ));
                Err(error)
            }
        }
    }

    pub fn launch_onion_service_once<S: TransportRuntimeEventSink>(
        &mut self,
        network_permission: ManualArtiBootstrapNetworkPermission,
        service_nickname: &str,
        sink: &mut S,
    ) -> Result<(), OnionServiceLaunchAdapterError> {
        if network_permission
            != ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike
        {
            sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
                TransportRuntimeError::RuntimeNetworkDisabled,
            ));
            return Err(OnionServiceLaunchAdapterError::PersistentClientNotBootstrapped);
        }
        if self.state != PersistentArtiClientLifecycleState::Bootstrapped {
            sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
                TransportRuntimeError::RuntimeNetworkDisabled,
            ));
            return Err(OnionServiceLaunchAdapterError::PersistentClientNotBootstrapped);
        }
        if self.onion_service.is_some() {
            return Err(OnionServiceLaunchAdapterError::OnionServiceAlreadyLaunched);
        }

        let Some(PersistentArtiClientHandle::Real(client)) = self.client.as_ref() else {
            sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
                TransportRuntimeError::OnionServiceLaunchFailed,
            ));
            return Err(OnionServiceLaunchAdapterError::OnionHostingNotImplemented);
        };

        let nickname = tor_hsservice::HsNickname::new(service_nickname.to_owned())
            .map_err(|_| OnionServiceLaunchAdapterError::OnionServiceConfigBuildFailed)?;
        let config = arti_client::config::onion_service::OnionServiceConfigBuilder::default()
            .nickname(nickname)
            .build()
            .map_err(|_| OnionServiceLaunchAdapterError::OnionServiceConfigBuildFailed)?;

        match client.launch_onion_service(config) {
            Ok(Some((running_service, rend_requests))) => {
                self.onion_service = Some(PersistentOnionServiceHandle::Real {
                    service: running_service,
                    rend_requests: Box::pin(rend_requests),
                    accepted_stream_requests: None,
                });
                sink.record(RedactedTransportRuntimeEvent::onion_service_launch_succeeded());
                Ok(())
            }
            Ok(None) | Err(_) => {
                sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
                    TransportRuntimeError::OnionServiceLaunchFailed,
                ));
                Err(OnionServiceLaunchAdapterError::OnionServiceLaunchFailed)
            }
        }
    }

    pub fn retained_onion_endpoint(&self) -> Option<String> {
        self.onion_service
            .as_ref()
            .and_then(PersistentOnionServiceHandle::onion_endpoint)
    }

    pub async fn accept_inbound_rend_request_once<S: TransportRuntimeEventSink>(
        &mut self,
        network_permission: ManualArtiBootstrapNetworkPermission,
        sink: &mut S,
    ) -> Result<(), TransportRuntimeError> {
        use futures::StreamExt;

        if network_permission
            != ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike
        {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        }
        if self.state != PersistentArtiClientLifecycleState::Bootstrapped {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        }

        let Some(PersistentOnionServiceHandle::Real {
            rend_requests,
            accepted_stream_requests,
            ..
        }) = self.onion_service.as_mut()
        else {
            let error = TransportRuntimeError::ReceiveFailed;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        };

        let timeout = std::time::Duration::from_secs(u64::from(
            self.adapter.skeleton().policy().timeout().seconds(),
        ));
        let Some(rend_request) = (match tokio::time::timeout(timeout, rend_requests.next()).await {
            Ok(next) => next,
            Err(_) => {
                let error = TransportRuntimeError::ReceiveFailed;
                sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                    crate::TransportTransferDirection::Receive,
                    error,
                ));
                return Err(error);
            }
        }) else {
            let error = TransportRuntimeError::ReceiveFailed;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        };

        match tokio::time::timeout(timeout, rend_request.accept()).await {
            Ok(Ok(stream_requests)) => {
                *accepted_stream_requests = Some(std::sync::Mutex::new(Box::pin(stream_requests)));
                Ok(())
            }
            Ok(Err(_)) | Err(_) => {
                let error = TransportRuntimeError::ReceiveFailed;
                sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                    crate::TransportTransferDirection::Receive,
                    error,
                ));
                Err(error)
            }
        }
    }

    pub async fn read_accepted_inbound_stream_once<S: TransportRuntimeEventSink>(
        &mut self,
        network_permission: ManualArtiBootstrapNetworkPermission,
        max_bytes: usize,
        sink: &mut S,
    ) -> Result<Vec<u8>, TransportRuntimeError> {
        use futures::{io::AsyncReadExt, StreamExt};

        if network_permission
            != ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike
        {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        }
        if self.state != PersistentArtiClientLifecycleState::Bootstrapped {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        }

        let Some(PersistentOnionServiceHandle::Real {
            accepted_stream_requests,
            ..
        }) = self.onion_service.as_mut()
        else {
            let error = TransportRuntimeError::ReceiveFailed;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        };
        let Some(accepted_stream_requests) = accepted_stream_requests.as_ref() else {
            let error = TransportRuntimeError::ReceiveFailed;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        };

        let mut stream_requests = {
            let mut guard = accepted_stream_requests.lock().map_err(|_| {
                let error = TransportRuntimeError::ReceiveFailed;
                sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                    crate::TransportTransferDirection::Receive,
                    error,
                ));
                error
            })?;
            let empty_stream: std::pin::Pin<
                Box<dyn futures::Stream<Item = tor_hsservice::StreamRequest> + Send>,
            > = Box::pin(futures::stream::empty());
            std::mem::replace(&mut *guard, empty_stream)
        };

        let timeout = std::time::Duration::from_secs(u64::from(
            self.adapter.skeleton().policy().timeout().seconds(),
        ));
        let read_result = async {
            let stream_request = stream_requests
                .next()
                .await
                .ok_or(TransportRuntimeError::ReceiveFailed)?;
            let mut data_stream = stream_request
                .accept(tor_cell::relaycell::msg::Connected::new_empty())
                .await
                .map_err(|_| TransportRuntimeError::ReceiveFailed)?;
            let mut envelope = Vec::new();
            (&mut data_stream)
                .take((max_bytes.saturating_add(1)) as u64)
                .read_to_end(&mut envelope)
                .await
                .map_err(|_| TransportRuntimeError::ReceiveFailed)?;
            if envelope.len() > max_bytes {
                return Err(TransportRuntimeError::ReceiveFailed);
            }
            Ok(envelope)
        };

        let result = match tokio::time::timeout(timeout, read_result).await {
            Ok(result) => result,
            Err(_) => Err(TransportRuntimeError::ReceiveFailed),
        };

        if let Ok(mut guard) = accepted_stream_requests.lock() {
            *guard = stream_requests;
        }

        match result {
            Ok(envelope) => Ok(envelope),
            Err(error) => {
                sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                    crate::TransportTransferDirection::Receive,
                    error,
                ));
                Err(error)
            }
        }
    }

    pub fn read_inbound_envelope_once<S: TransportRuntimeEventSink>(
        &self,
        network_permission: ManualArtiBootstrapNetworkPermission,
        sink: &mut S,
    ) -> Result<(), TransportRuntimeError> {
        if network_permission
            != ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike
        {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        }
        if self.state != PersistentArtiClientLifecycleState::Bootstrapped {
            let error = TransportRuntimeError::RuntimeNetworkDisabled;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        }
        if !self.summary().inbound_rend_request_stream_owned() {
            let error = TransportRuntimeError::ReceiveFailed;
            sink.record(RedactedTransportRuntimeEvent::transfer_failed(
                crate::TransportTransferDirection::Receive,
                error,
            ));
            return Err(error);
        }

        let error = TransportRuntimeError::ReceiveFailed;
        sink.record(RedactedTransportRuntimeEvent::transfer_failed(
            crate::TransportTransferDirection::Receive,
            error,
        ));
        Err(error)
    }
}

fn validate_app_private_dir(path: &Path) -> Result<(), ArtiConfigError> {
    let text = path.to_string_lossy();
    if text.is_empty() {
        return Err(ArtiConfigError::EmptyDirectory);
    }
    if !path.is_absolute() {
        return Err(ArtiConfigError::RelativeDirectory);
    }
    if looks_like_shared_arti_default(&text) {
        return Err(ArtiConfigError::SharedDefaultDirectory);
    }
    Ok(())
}

fn looks_like_shared_arti_default(path: &str) -> bool {
    let normalized = path.replace('\\', "/").to_ascii_lowercase();
    normalized.contains("${arti_")
        || normalized.ends_with("/.cache/arti")
        || normalized.ends_with("/.local/share/arti")
        || normalized.ends_with("/library/application support/arti")
        || normalized.ends_with("/appdata/roaming/arti")
        || normalized.ends_with("/appdata/local/arti")
}
