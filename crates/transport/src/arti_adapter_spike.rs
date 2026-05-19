use crate::{
    OnionEndpointPublicationPolicy, OnionEnvelopeTransport, OnionInboundStreamBoundary,
    OnionOutboundStreamBoundary, OnionOutboundStreamError,
    OnionServiceDescriptorPublicationBoundary, OnionServiceDescriptorPublicationError,
    OnionServiceDescriptorPublicationReady, OnionServiceKeyMaterialReady, OnionServiceLaunchReady,
    PairwiseRendezvousEndpoint, RedactedTransportRuntimeEvent, TransportBootstrapExecutionSkeleton,
    TransportBootstrapOutcome, TransportPolicy, TransportRuntimeError, TransportRuntimeEventSink,
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
    OnionHostingNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PersistentArtiClientLifecycleSummary {
    state: PersistentArtiClientLifecycleState,
    client_owned: bool,
    timeout_seconds: u16,
}

impl PersistentArtiClientLifecycleSummary {
    pub fn state(self) -> PersistentArtiClientLifecycleState {
        self.state
    }

    pub fn client_owned(self) -> bool {
        self.client_owned
    }

    pub fn timeout_seconds(self) -> u16 {
        self.timeout_seconds
    }
}

pub struct PersistentArtiClientOwner {
    adapter: BoundedArtiBootstrapAdapterSpike,
    state: PersistentArtiClientLifecycleState,
    client: Option<Arc<dyn Send + Sync + 'static>>,
}

impl PersistentArtiClientOwner {
    pub fn new_unbootstrapped(adapter: BoundedArtiBootstrapAdapterSpike) -> Self {
        Self {
            adapter,
            state: PersistentArtiClientLifecycleState::Unbootstrapped,
            client: None,
        }
    }

    pub fn adapter(&self) -> &BoundedArtiBootstrapAdapterSpike {
        &self.adapter
    }

    pub fn state(&self) -> PersistentArtiClientLifecycleState {
        self.state
    }

    pub fn summary(&self) -> PersistentArtiClientLifecycleSummary {
        PersistentArtiClientLifecycleSummary {
            state: self.state,
            client_owned: self.client.is_some(),
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
        self.client = None;
        self.state = PersistentArtiClientLifecycleState::Shutdown;
        sink.record(RedactedTransportRuntimeEvent::runtime_lifecycle_changed());
    }

    #[cfg(test)]
    pub fn mark_bootstrapped_for_adapter_test<S: TransportRuntimeEventSink>(
        &mut self,
        sink: &mut S,
    ) {
        self.client = Some(Arc::new(()));
        self.state = PersistentArtiClientLifecycleState::Bootstrapped;
        sink.record(RedactedTransportRuntimeEvent::runtime_lifecycle_changed());
    }
}

impl fmt::Debug for PersistentArtiClientOwner {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PersistentArtiClientOwner")
            .field("state", &self.state)
            .field("client_owned", &self.client.is_some())
            .field("state_dir", &"<redacted>")
            .field("cache_dir", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct OnionServiceLaunchAdapterSkeleton {
    _launch_ready: OnionServiceLaunchReady,
    _key_material_ready: bool,
    owner_summary: PersistentArtiClientLifecycleSummary,
}

impl OnionServiceLaunchAdapterSkeleton {
    pub fn from_ready_owner(
        launch_ready: OnionServiceLaunchReady,
        _key_material: &OnionServiceKeyMaterialReady,
        owner: &PersistentArtiClientOwner,
    ) -> Result<Self, OnionServiceLaunchAdapterError> {
        let owner_summary = owner.summary();
        if owner_summary.state() != PersistentArtiClientLifecycleState::Bootstrapped
            || !owner_summary.client_owned()
        {
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
        formatter
            .debug_struct("OnionServiceLaunchAdapterSkeleton")
            .field("owner_state", &self.owner_summary.state())
            .field("client_owned", &self.owner_summary.client_owned())
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
        if self.network_permission == ManualArtiBootstrapNetworkPermission::Disabled {
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

        if network_permission == ManualArtiBootstrapNetworkPermission::Disabled {
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
                self.client = Some(Arc::new(client));
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
