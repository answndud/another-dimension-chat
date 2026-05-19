use another_dimension_identity::{ContactId, ProfileName};
use another_dimension_protocol::{bucket_for_len, pad_to_bucket, Envelope, MessageType};
#[cfg(target_os = "macos")]
use std::process::Command;
use std::{
    fmt, fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Eq, PartialEq)]
pub enum TransportError {
    DeliveryFailed,
    ReceiveFailed,
    InvalidEndpoint,
    PolicyViolation,
    Unavailable,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportRuntimeError {
    BootstrapCancelled,
    BootstrapTimeout,
    CensorshipOrBridgeRequired,
    StateDirectoryPermissionDenied,
    LogRedactionPreflightFailed,
    OnionServiceKeyUnavailable,
    OnionServiceLaunchFailed,
    RuntimeNetworkDisabled,
    SendFailed,
    ReceiveFailed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportBootstrapPolicyError {
    ZeroTimeout,
    TimeoutTooLong,
    ZeroRetryAttempts,
    TooManyRetryAttempts,
    ZeroBackoff,
    BackoffExceedsMaximum,
    SilentRetryForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportRuntimeProbeError {
    EmptyDirectory,
    RelativeDirectory,
    SharedDefaultDirectory,
    SameStateAndCacheDirectory,
    DirectoryCreateFailed,
    DirectoryProbeFailed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportBackupExclusionError {
    UnsupportedPlatform,
    MissingStateDirectoryBackupExclusion,
    MissingCacheDirectoryBackupExclusion,
    MetadataProbeFailed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyLifecycleError {
    GenerationBeforeProfileUnlock,
    PlaintextStorageForbidden,
    BackupExclusionNotVerified,
    RotationPolicyMissing,
    DeletionPolicyMissing,
    MigrationPolicyMissing,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyMaterialError {
    ProfileLocked,
    LifecycleNotReady,
    MissingSqlcipherWrappedRecord,
    PlaintextKeyMaterialForbidden,
    InvalidRecordId,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BridgeCensorshipConfigurationError {
    Unsupported,
    BridgeRequiredButMissing,
    RawBridgeLineForbidden,
    EmptyRedactedBridgeConfigId,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceLaunchPreflightError {
    ProfileUnlockRequired,
    OnionServiceKeyNotReady,
    PersistentClientNotReady,
    EndpointPublicationPolicyMissing,
    EndpointUpdatePolicyMissing,
    LogRedactionRequired,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceDescriptorPublicationError {
    EndpointPublicationPolicyMissing,
    DescriptorPublicationNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionInboundStreamError {
    DescriptorPublicationRequired,
    InboundAcceptNotImplemented,
    InboundReadWriteNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionOutboundStreamError {
    PairwiseEndpointRequired,
    TransportPolicyViolation,
    OutboundDialNotImplemented,
    OutboundSendNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StreamSessionBindingError {
    VerifiedPairwiseSessionRequired,
    ContactMismatch,
    BoundInboundReceiveNotImplemented,
    BoundOutboundSendNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EnvelopeIoAdapterError {
    EnvelopeIoReadinessRequired,
    InboundEnvelopeReceiveNotImplemented,
    OutboundEnvelopeSendNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RemotePeerAuthenticationError {
    RemotePeerAuthenticationRequired,
    ContactMismatch,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PostAuthStreamReadinessOrderingError {
    EnvelopeIoBoundaryRequired,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EndpointLifecycleError {
    GlobalEndpointForbidden,
    IdentityKeyCouplingForbidden,
    ExistingEncryptedSessionRequired,
    EndpointUnchanged,
    EmptyEncryptedPayload,
    InvalidControlEnvelope,
    InvalidEndpointState,
    EncryptedSessionVerificationRequired,
    EndpointContactMismatch,
    EndpointRotationRollback,
    EndpointRotationStale,
    EndpointRotationNotPending,
    EndpointReconnectNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportBootstrapTimeoutPolicy {
    seconds: u16,
}

impl TransportBootstrapTimeoutPolicy {
    pub const MAX_TIMEOUT_SECONDS: u16 = 120;

    pub fn new(seconds: u16) -> Result<Self, TransportBootstrapPolicyError> {
        if seconds == 0 {
            return Err(TransportBootstrapPolicyError::ZeroTimeout);
        }
        if seconds > Self::MAX_TIMEOUT_SECONDS {
            return Err(TransportBootstrapPolicyError::TimeoutTooLong);
        }
        Ok(Self { seconds })
    }

    pub fn high_risk_default() -> Self {
        Self { seconds: 45 }
    }

    pub fn seconds(self) -> u16 {
        self.seconds
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportBootstrapRetryPolicy {
    max_attempts: u8,
    initial_backoff_ms: u32,
    max_backoff_ms: u32,
}

impl TransportBootstrapRetryPolicy {
    pub const MAX_ATTEMPTS: u8 = 3;

    pub fn new(
        max_attempts: u8,
        initial_backoff_ms: u32,
        max_backoff_ms: u32,
    ) -> Result<Self, TransportBootstrapPolicyError> {
        if max_attempts == 0 {
            return Err(TransportBootstrapPolicyError::ZeroRetryAttempts);
        }
        if max_attempts > Self::MAX_ATTEMPTS {
            return Err(TransportBootstrapPolicyError::TooManyRetryAttempts);
        }
        if initial_backoff_ms == 0 || max_backoff_ms == 0 {
            return Err(TransportBootstrapPolicyError::ZeroBackoff);
        }
        if initial_backoff_ms > max_backoff_ms {
            return Err(TransportBootstrapPolicyError::BackoffExceedsMaximum);
        }
        Ok(Self {
            max_attempts,
            initial_backoff_ms,
            max_backoff_ms,
        })
    }

    pub fn high_risk_default() -> Self {
        Self {
            max_attempts: 2,
            initial_backoff_ms: 500,
            max_backoff_ms: 2_000,
        }
    }

    pub fn max_attempts(self) -> u8 {
        self.max_attempts
    }

    pub fn initial_backoff_ms(self) -> u32 {
        self.initial_backoff_ms
    }

    pub fn max_backoff_ms(self) -> u32 {
        self.max_backoff_ms
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportBootstrapPolicy {
    timeout: TransportBootstrapTimeoutPolicy,
    retry: TransportBootstrapRetryPolicy,
    allow_silent_retry: bool,
    classify_censorship_separately: bool,
}

impl TransportBootstrapPolicy {
    pub fn new(
        timeout: TransportBootstrapTimeoutPolicy,
        retry: TransportBootstrapRetryPolicy,
        allow_silent_retry: bool,
        classify_censorship_separately: bool,
    ) -> Result<Self, TransportBootstrapPolicyError> {
        if allow_silent_retry {
            return Err(TransportBootstrapPolicyError::SilentRetryForbidden);
        }
        Ok(Self {
            timeout,
            retry,
            allow_silent_retry,
            classify_censorship_separately,
        })
    }

    pub fn high_risk_default() -> Self {
        Self {
            timeout: TransportBootstrapTimeoutPolicy::high_risk_default(),
            retry: TransportBootstrapRetryPolicy::high_risk_default(),
            allow_silent_retry: false,
            classify_censorship_separately: true,
        }
    }

    pub fn timeout(self) -> TransportBootstrapTimeoutPolicy {
        self.timeout
    }

    pub fn retry(self) -> TransportBootstrapRetryPolicy {
        self.retry
    }

    pub fn allow_silent_retry(self) -> bool {
        self.allow_silent_retry
    }

    pub fn classify_censorship_separately(self) -> bool {
        self.classify_censorship_separately
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportBootstrapOutcome {
    Cancelled,
    TimedOut,
    CensorshipOrBridgeRequired,
    TransientNetworkFailure,
}

impl TransportBootstrapOutcome {
    pub fn runtime_error(self, policy: TransportBootstrapPolicy) -> TransportRuntimeError {
        match self {
            Self::Cancelled => TransportRuntimeError::BootstrapCancelled,
            Self::TimedOut | Self::TransientNetworkFailure => {
                TransportRuntimeError::BootstrapTimeout
            }
            Self::CensorshipOrBridgeRequired if policy.classify_censorship_separately() => {
                TransportRuntimeError::CensorshipOrBridgeRequired
            }
            Self::CensorshipOrBridgeRequired => TransportRuntimeError::BootstrapTimeout,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportPreNetworkBlocker {
    BackupExclusionVerification,
    OnionServiceKeyLifecycle,
    BridgeCensorshipConfiguration,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportNextPhase {
    BackupExclusionVerification,
    OnionServiceKeyLifecycle,
    BridgeCensorshipConfiguration,
    ArtiBootstrapExecutionSkeleton,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransportPreNetworkCloseout {
    blockers: Vec<TransportPreNetworkBlocker>,
    next_phase: TransportNextPhase,
}

impl TransportPreNetworkCloseout {
    pub fn high_risk_default() -> Self {
        Self::from_blockers(vec![
            TransportPreNetworkBlocker::BackupExclusionVerification,
            TransportPreNetworkBlocker::OnionServiceKeyLifecycle,
            TransportPreNetworkBlocker::BridgeCensorshipConfiguration,
        ])
    }

    pub fn after_backup_exclusion_verification(
        _verification: &TransportBackupExclusionVerification,
    ) -> Self {
        Self::from_blockers(vec![
            TransportPreNetworkBlocker::OnionServiceKeyLifecycle,
            TransportPreNetworkBlocker::BridgeCensorshipConfiguration,
        ])
    }

    pub fn after_onion_service_key_lifecycle(
        _verification: &OnionServiceKeyLifecycleReady,
    ) -> Self {
        Self::from_blockers(vec![
            TransportPreNetworkBlocker::BridgeCensorshipConfiguration,
        ])
    }

    pub fn after_bridge_censorship_configuration(_configuration: &BridgeCensorshipReady) -> Self {
        Self::from_blockers(Vec::new())
    }

    pub fn from_blockers(blockers: Vec<TransportPreNetworkBlocker>) -> Self {
        let next_phase = if blockers
            .contains(&TransportPreNetworkBlocker::BackupExclusionVerification)
        {
            TransportNextPhase::BackupExclusionVerification
        } else if blockers.contains(&TransportPreNetworkBlocker::OnionServiceKeyLifecycle) {
            TransportNextPhase::OnionServiceKeyLifecycle
        } else if blockers.contains(&TransportPreNetworkBlocker::BridgeCensorshipConfiguration) {
            TransportNextPhase::BridgeCensorshipConfiguration
        } else {
            TransportNextPhase::ArtiBootstrapExecutionSkeleton
        };

        Self {
            blockers,
            next_phase,
        }
    }

    pub fn blockers(&self) -> &[TransportPreNetworkBlocker] {
        &self.blockers
    }

    pub fn next_phase(&self) -> TransportNextPhase {
        self.next_phase
    }

    pub fn network_execution_allowed(&self) -> bool {
        self.blockers.is_empty()
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportRuntimeEventKind {
    BootstrapFailed,
    BootstrapSucceeded,
    DirectoryProbeFailed,
    RouteRejected,
    RuntimeLifecycleChanged,
    RuntimePreflightFailed,
    TransferFailed,
    SensitiveContextRejected,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportTransferDirection {
    Send,
    Receive,
}

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct RedactedTransportRuntimeEvent {
    kind: TransportRuntimeEventKind,
    runtime_error: Option<TransportRuntimeError>,
    probe_error: Option<TransportRuntimeProbeError>,
    route_kind: Option<TransportKind>,
    transfer_direction: Option<TransportTransferDirection>,
}

impl RedactedTransportRuntimeEvent {
    pub fn bootstrap_failed(error: TransportRuntimeError) -> Self {
        Self {
            kind: TransportRuntimeEventKind::BootstrapFailed,
            runtime_error: Some(error),
            probe_error: None,
            route_kind: None,
            transfer_direction: None,
        }
    }

    pub fn bootstrap_succeeded() -> Self {
        Self {
            kind: TransportRuntimeEventKind::BootstrapSucceeded,
            runtime_error: None,
            probe_error: None,
            route_kind: None,
            transfer_direction: None,
        }
    }

    pub fn directory_probe_failed(path: &Path, error: TransportRuntimeProbeError) -> Self {
        let _ = path;
        Self {
            kind: TransportRuntimeEventKind::DirectoryProbeFailed,
            runtime_error: Some(error.into()),
            probe_error: Some(error),
            route_kind: None,
            transfer_direction: None,
        }
    }

    pub fn route_rejected(route: &TransportRoute, error: TransportError) -> Self {
        let runtime_error = match error {
            TransportError::PolicyViolation | TransportError::InvalidEndpoint => None,
            TransportError::DeliveryFailed => Some(TransportRuntimeError::SendFailed),
            TransportError::ReceiveFailed => Some(TransportRuntimeError::ReceiveFailed),
            TransportError::Unavailable => Some(TransportRuntimeError::RuntimeNetworkDisabled),
        };

        Self {
            kind: TransportRuntimeEventKind::RouteRejected,
            runtime_error,
            probe_error: None,
            route_kind: Some(route.kind()),
            transfer_direction: None,
        }
    }

    pub fn runtime_lifecycle_changed() -> Self {
        Self {
            kind: TransportRuntimeEventKind::RuntimeLifecycleChanged,
            runtime_error: None,
            probe_error: None,
            route_kind: None,
            transfer_direction: None,
        }
    }

    pub fn runtime_preflight_failed(error: TransportRuntimeError) -> Self {
        Self {
            kind: TransportRuntimeEventKind::RuntimePreflightFailed,
            runtime_error: Some(error),
            probe_error: None,
            route_kind: None,
            transfer_direction: None,
        }
    }

    pub fn transfer_failed(
        direction: TransportTransferDirection,
        error: TransportRuntimeError,
    ) -> Self {
        Self {
            kind: TransportRuntimeEventKind::TransferFailed,
            runtime_error: Some(error),
            probe_error: None,
            route_kind: None,
            transfer_direction: Some(direction),
        }
    }

    pub fn sensitive_context_rejected(
        profile: &ProfileName,
        contact_id: &str,
        onion_endpoint: &str,
        plaintext: &str,
        key_material: &[u8],
        error: TransportRuntimeError,
    ) -> Self {
        let _ = (profile, contact_id, onion_endpoint, plaintext, key_material);
        Self {
            kind: TransportRuntimeEventKind::SensitiveContextRejected,
            runtime_error: Some(error),
            probe_error: None,
            route_kind: None,
            transfer_direction: None,
        }
    }

    pub fn kind(&self) -> TransportRuntimeEventKind {
        self.kind
    }

    pub fn runtime_error(&self) -> Option<TransportRuntimeError> {
        self.runtime_error
    }

    pub fn probe_error(&self) -> Option<TransportRuntimeProbeError> {
        self.probe_error
    }

    pub fn route_kind(&self) -> Option<TransportKind> {
        self.route_kind
    }

    pub fn transfer_direction(&self) -> Option<TransportTransferDirection> {
        self.transfer_direction
    }
}

impl fmt::Debug for RedactedTransportRuntimeEvent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("RedactedTransportRuntimeEvent")
            .field("kind", &self.kind)
            .field("runtime_error", &self.runtime_error)
            .field("probe_error", &self.probe_error)
            .field("route_kind", &self.route_kind)
            .field("transfer_direction", &self.transfer_direction)
            .finish()
    }
}

impl fmt::Display for RedactedTransportRuntimeEvent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "transport_event kind={:?} runtime_error={:?} probe_error={:?} route_kind={:?} direction={:?}",
            self.kind,
            self.runtime_error,
            self.probe_error,
            self.route_kind,
            self.transfer_direction
        )
    }
}

pub trait TransportRuntimeEventSink {
    fn record(&mut self, event: RedactedTransportRuntimeEvent);
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct NoopTransportRuntimeEventSink;

impl TransportRuntimeEventSink for NoopTransportRuntimeEventSink {
    fn record(&mut self, _event: RedactedTransportRuntimeEvent) {}
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct InMemoryTransportRuntimeEventSink {
    events: Vec<RedactedTransportRuntimeEvent>,
}

impl InMemoryTransportRuntimeEventSink {
    pub fn events(&self) -> &[RedactedTransportRuntimeEvent] {
        &self.events
    }
}

impl TransportRuntimeEventSink for InMemoryTransportRuntimeEventSink {
    fn record(&mut self, event: RedactedTransportRuntimeEvent) {
        self.events.push(event);
    }
}

impl From<TransportRuntimeProbeError> for TransportRuntimeError {
    fn from(_error: TransportRuntimeProbeError) -> Self {
        Self::StateDirectoryPermissionDenied
    }
}

impl TransportRuntimeError {
    pub fn is_preflight_failure(self) -> bool {
        matches!(
            self,
            Self::StateDirectoryPermissionDenied | Self::LogRedactionPreflightFailed
        )
    }

    pub fn is_bootstrap_failure(self) -> bool {
        matches!(
            self,
            Self::BootstrapCancelled
                | Self::BootstrapTimeout
                | Self::CensorshipOrBridgeRequired
                | Self::RuntimeNetworkDisabled
        )
    }

    pub fn is_onion_service_failure(self) -> bool {
        matches!(
            self,
            Self::OnionServiceKeyUnavailable | Self::OnionServiceLaunchFailed
        )
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportBootstrapExecutionSkeleton {
    runtime_ready: TransportRuntimeReady,
    policy: TransportBootstrapPolicy,
}

impl TransportBootstrapExecutionSkeleton {
    pub fn new(runtime_ready: TransportRuntimeReady, policy: TransportBootstrapPolicy) -> Self {
        Self {
            runtime_ready,
            policy,
        }
    }

    pub fn policy(self) -> TransportBootstrapPolicy {
        self.policy
    }

    pub fn runtime_ready(self) -> TransportRuntimeReady {
        self.runtime_ready
    }

    pub fn execute_fail_closed<S: TransportRuntimeEventSink>(
        self,
        outcome: TransportBootstrapOutcome,
        sink: &mut S,
    ) -> Result<(), TransportRuntimeError> {
        let _ = self.runtime_ready;
        let error = outcome.runtime_error(self.policy);
        sink.record(RedactedTransportRuntimeEvent::bootstrap_failed(error));
        Err(error)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransportStateCacheDirsReady {
    state_dir: PathBuf,
    cache_dir: PathBuf,
}

impl TransportStateCacheDirsReady {
    pub fn state_dir(&self) -> &Path {
        &self.state_dir
    }

    pub fn cache_dir(&self) -> &Path {
        &self.cache_dir
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransportBackupExclusionVerification;

pub fn verify_transport_backup_exclusion(
    dirs: &TransportStateCacheDirsReady,
) -> Result<TransportBackupExclusionVerification, TransportBackupExclusionError> {
    verify_dir_backup_exclusion(dirs.state_dir()).map_err(map_state_backup_exclusion_error)?;
    verify_dir_backup_exclusion(dirs.cache_dir()).map_err(map_cache_backup_exclusion_error)?;
    Ok(TransportBackupExclusionVerification)
}

#[allow(dead_code)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum DirectoryBackupExclusionProbeError {
    UnsupportedPlatform,
    MissingBackupExclusion,
    MetadataProbeFailed,
}

fn map_state_backup_exclusion_error(
    error: DirectoryBackupExclusionProbeError,
) -> TransportBackupExclusionError {
    match error {
        DirectoryBackupExclusionProbeError::UnsupportedPlatform => {
            TransportBackupExclusionError::UnsupportedPlatform
        }
        DirectoryBackupExclusionProbeError::MissingBackupExclusion => {
            TransportBackupExclusionError::MissingStateDirectoryBackupExclusion
        }
        DirectoryBackupExclusionProbeError::MetadataProbeFailed => {
            TransportBackupExclusionError::MetadataProbeFailed
        }
    }
}

fn map_cache_backup_exclusion_error(
    error: DirectoryBackupExclusionProbeError,
) -> TransportBackupExclusionError {
    match error {
        DirectoryBackupExclusionProbeError::UnsupportedPlatform => {
            TransportBackupExclusionError::UnsupportedPlatform
        }
        DirectoryBackupExclusionProbeError::MissingBackupExclusion => {
            TransportBackupExclusionError::MissingCacheDirectoryBackupExclusion
        }
        DirectoryBackupExclusionProbeError::MetadataProbeFailed => {
            TransportBackupExclusionError::MetadataProbeFailed
        }
    }
}

#[cfg(target_os = "macos")]
fn verify_dir_backup_exclusion(path: &Path) -> Result<(), DirectoryBackupExclusionProbeError> {
    let output = Command::new("xattr")
        .arg("-p")
        .arg("com.apple.metadata:com_apple_backup_excludeItem")
        .arg(path)
        .output()
        .map_err(|_| DirectoryBackupExclusionProbeError::MetadataProbeFailed)?;

    if output.status.success() && !output.stdout.is_empty() {
        Ok(())
    } else {
        Err(DirectoryBackupExclusionProbeError::MissingBackupExclusion)
    }
}

#[cfg(not(target_os = "macos"))]
fn verify_dir_backup_exclusion(_path: &Path) -> Result<(), DirectoryBackupExclusionProbeError> {
    Err(DirectoryBackupExclusionProbeError::UnsupportedPlatform)
}

pub fn probe_app_private_state_cache_dirs(
    state_dir: impl Into<PathBuf>,
    cache_dir: impl Into<PathBuf>,
) -> Result<TransportStateCacheDirsReady, TransportRuntimeProbeError> {
    let state_dir = state_dir.into();
    let cache_dir = cache_dir.into();

    validate_transport_runtime_dir(&state_dir)?;
    validate_transport_runtime_dir(&cache_dir)?;
    if state_dir == cache_dir {
        return Err(TransportRuntimeProbeError::SameStateAndCacheDirectory);
    }

    fs::create_dir_all(&state_dir)
        .map_err(|_| TransportRuntimeProbeError::DirectoryCreateFailed)?;
    fs::create_dir_all(&cache_dir)
        .map_err(|_| TransportRuntimeProbeError::DirectoryCreateFailed)?;

    probe_writable_dir(&state_dir)?;
    probe_writable_dir(&cache_dir)?;

    Ok(TransportStateCacheDirsReady {
        state_dir,
        cache_dir,
    })
}

fn validate_transport_runtime_dir(path: &Path) -> Result<(), TransportRuntimeProbeError> {
    let text = path.to_string_lossy();
    if text.is_empty() {
        return Err(TransportRuntimeProbeError::EmptyDirectory);
    }
    if !path.is_absolute() {
        return Err(TransportRuntimeProbeError::RelativeDirectory);
    }
    if looks_like_shared_arti_default(&text) {
        return Err(TransportRuntimeProbeError::SharedDefaultDirectory);
    }
    Ok(())
}

fn probe_writable_dir(path: &Path) -> Result<(), TransportRuntimeProbeError> {
    let probe = path.join(".another-dimension-transport-preflight");
    fs::write(&probe, b"probe").map_err(|_| TransportRuntimeProbeError::DirectoryProbeFailed)?;
    fs::remove_file(&probe).map_err(|_| TransportRuntimeProbeError::DirectoryProbeFailed)
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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportRuntimePreflight {
    pub runtime_network_enabled: bool,
    pub state_cache_dirs_accessible: bool,
    pub log_redaction_ready: bool,
    pub bridge_or_censorship_ready: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportRuntimeReady;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportLogRedactionPolicy {
    NotConfigured,
    RedactedTransportEventsOnly,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportCrashRedactionPolicy {
    NotConfigured,
    SensitivePathsAndIdentifiersRedacted,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportCensorshipReadiness {
    Unsupported,
    ExplicitlyNotRequiredForThisBuild,
    ConfiguredBeforeBootstrap,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BridgeRequirement {
    ExplicitlyNotRequiredForThisBuild,
    RequiredBeforeBootstrap,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BridgeCensorshipConfiguration {
    Unsupported,
    NoBridgeRequired,
    BridgeConfigured { redacted_bridge_config_id: String },
    RawBridgeLine { value: String },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BridgeCensorshipReady {
    readiness: TransportCensorshipReadiness,
}

impl BridgeCensorshipReady {
    pub fn readiness(self) -> TransportCensorshipReadiness {
        self.readiness
    }
}

impl BridgeCensorshipConfiguration {
    pub fn check(
        self,
        requirement: BridgeRequirement,
    ) -> Result<BridgeCensorshipReady, BridgeCensorshipConfigurationError> {
        match (requirement, self) {
            (BridgeRequirement::ExplicitlyNotRequiredForThisBuild, Self::NoBridgeRequired) => {
                Ok(BridgeCensorshipReady {
                    readiness: TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild,
                })
            }
            (BridgeRequirement::ExplicitlyNotRequiredForThisBuild, Self::Unsupported)
            | (BridgeRequirement::RequiredBeforeBootstrap, Self::Unsupported) => {
                Err(BridgeCensorshipConfigurationError::Unsupported)
            }
            (_, Self::RawBridgeLine { value }) => {
                let _ = value;
                Err(BridgeCensorshipConfigurationError::RawBridgeLineForbidden)
            }
            (BridgeRequirement::RequiredBeforeBootstrap, Self::NoBridgeRequired) => {
                Err(BridgeCensorshipConfigurationError::BridgeRequiredButMissing)
            }
            (
                BridgeRequirement::RequiredBeforeBootstrap,
                Self::BridgeConfigured {
                    redacted_bridge_config_id,
                },
            ) => {
                if redacted_bridge_config_id.trim().is_empty() {
                    return Err(BridgeCensorshipConfigurationError::EmptyRedactedBridgeConfigId);
                }
                Ok(BridgeCensorshipReady {
                    readiness: TransportCensorshipReadiness::ConfiguredBeforeBootstrap,
                })
            }
            (
                BridgeRequirement::ExplicitlyNotRequiredForThisBuild,
                Self::BridgeConfigured { .. },
            ) => Ok(BridgeCensorshipReady {
                readiness: TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild,
            }),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportRuntimePermissionPreflight {
    pub runtime_network_enabled: bool,
    pub app_private_state_cache_dirs: bool,
    pub backup_exclusion_verified: bool,
    pub log_redaction_policy: TransportLogRedactionPolicy,
    pub crash_redaction_policy: TransportCrashRedactionPolicy,
    pub censorship_readiness: TransportCensorshipReadiness,
}

impl TransportRuntimePermissionPreflight {
    pub fn locked_down_by_default() -> Self {
        Self {
            runtime_network_enabled: false,
            app_private_state_cache_dirs: false,
            backup_exclusion_verified: false,
            log_redaction_policy: TransportLogRedactionPolicy::NotConfigured,
            crash_redaction_policy: TransportCrashRedactionPolicy::NotConfigured,
            censorship_readiness: TransportCensorshipReadiness::Unsupported,
        }
    }

    pub fn from_platform_preflight(
        dirs: &TransportStateCacheDirsReady,
        runtime_network_enabled: bool,
        backup_exclusion_verified: bool,
        log_redaction_policy: TransportLogRedactionPolicy,
        crash_redaction_policy: TransportCrashRedactionPolicy,
        censorship_readiness: TransportCensorshipReadiness,
    ) -> Self {
        debug_assert_ne!(dirs.state_dir(), dirs.cache_dir());
        Self {
            runtime_network_enabled,
            app_private_state_cache_dirs: true,
            backup_exclusion_verified,
            log_redaction_policy,
            crash_redaction_policy,
            censorship_readiness,
        }
    }

    pub fn from_verified_platform_preflight(
        dirs: &TransportStateCacheDirsReady,
        runtime_network_enabled: bool,
        backup_exclusion_verification: &TransportBackupExclusionVerification,
        log_redaction_policy: TransportLogRedactionPolicy,
        crash_redaction_policy: TransportCrashRedactionPolicy,
        censorship_readiness: TransportCensorshipReadiness,
    ) -> Self {
        let _ = backup_exclusion_verification;
        Self::from_platform_preflight(
            dirs,
            runtime_network_enabled,
            true,
            log_redaction_policy,
            crash_redaction_policy,
            censorship_readiness,
        )
    }

    pub fn from_fully_verified_preflight(
        dirs: &TransportStateCacheDirsReady,
        runtime_network_enabled: bool,
        backup_exclusion_verification: &TransportBackupExclusionVerification,
        bridge_censorship_ready: BridgeCensorshipReady,
        log_redaction_policy: TransportLogRedactionPolicy,
        crash_redaction_policy: TransportCrashRedactionPolicy,
    ) -> Self {
        Self::from_verified_platform_preflight(
            dirs,
            runtime_network_enabled,
            backup_exclusion_verification,
            log_redaction_policy,
            crash_redaction_policy,
            bridge_censorship_ready.readiness(),
        )
    }

    pub fn to_runtime_preflight(self) -> TransportRuntimePreflight {
        TransportRuntimePreflight {
            runtime_network_enabled: self.runtime_network_enabled,
            state_cache_dirs_accessible: self.app_private_state_cache_dirs
                && self.backup_exclusion_verified,
            log_redaction_ready: self.log_redaction_policy
                == TransportLogRedactionPolicy::RedactedTransportEventsOnly
                && self.crash_redaction_policy
                    == TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
            bridge_or_censorship_ready: matches!(
                self.censorship_readiness,
                TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild
                    | TransportCensorshipReadiness::ConfiguredBeforeBootstrap
            ),
        }
    }

    pub fn check(self) -> Result<TransportRuntimeReady, TransportRuntimeError> {
        self.to_runtime_preflight().check()
    }
}

impl TransportRuntimePreflight {
    pub fn disabled_by_default() -> Self {
        Self {
            runtime_network_enabled: false,
            state_cache_dirs_accessible: false,
            log_redaction_ready: false,
            bridge_or_censorship_ready: false,
        }
    }

    pub fn check(self) -> Result<TransportRuntimeReady, TransportRuntimeError> {
        if !self.runtime_network_enabled {
            return Err(TransportRuntimeError::RuntimeNetworkDisabled);
        }
        if !self.state_cache_dirs_accessible {
            return Err(TransportRuntimeError::StateDirectoryPermissionDenied);
        }
        if !self.log_redaction_ready {
            return Err(TransportRuntimeError::LogRedactionPreflightFailed);
        }
        if !self.bridge_or_censorship_ready {
            return Err(TransportRuntimeError::CensorshipOrBridgeRequired);
        }
        Ok(TransportRuntimeReady)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportRuntimeState {
    Disabled,
    Ready(TransportRuntimeReady),
}

impl TransportRuntimeState {
    pub fn disabled() -> Self {
        Self::Disabled
    }

    pub fn from_preflight(
        preflight: TransportRuntimePreflight,
    ) -> Result<Self, TransportRuntimeError> {
        preflight.check().map(Self::Ready)
    }

    pub fn is_ready(self) -> bool {
        matches!(self, Self::Ready(_))
    }
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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RendezvousEndpointScope {
    PairwiseContact,
    GlobalDirectory,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RendezvousEndpointIdentityBinding {
    TransportScoped,
    DerivedFromIdentityKey,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EndpointUpdateChannel {
    ExistingEncryptedSession,
    PlaintextControl,
    OutOfBandPairingPayload,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub struct EndpointRotationSequence(u64);

impl EndpointRotationSequence {
    pub fn new(value: u64) -> Result<Self, EndpointLifecycleError> {
        if value == 0 {
            return Err(EndpointLifecycleError::EndpointRotationStale);
        }
        Ok(Self(value))
    }

    pub fn value(self) -> u64 {
        self.0
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EndpointRotationApplyContext {
    ExistingEncryptedSessionVerified,
    UnverifiedControlPayload,
}

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
pub struct PairwiseRendezvousEndpoint {
    contact_id: ContactId,
    endpoint: OnionServiceEndpoint,
}

impl PairwiseRendezvousEndpoint {
    const STATE_SCHEMA: &'static str = "ADENDPOINTSTATE1";

    pub fn new(
        contact_id: ContactId,
        endpoint: OnionServiceEndpoint,
        scope: RendezvousEndpointScope,
        identity_binding: RendezvousEndpointIdentityBinding,
    ) -> Result<Self, EndpointLifecycleError> {
        if scope != RendezvousEndpointScope::PairwiseContact {
            return Err(EndpointLifecycleError::GlobalEndpointForbidden);
        }
        if identity_binding != RendezvousEndpointIdentityBinding::TransportScoped {
            return Err(EndpointLifecycleError::IdentityKeyCouplingForbidden);
        }

        Ok(Self {
            contact_id,
            endpoint,
        })
    }

    pub fn contact_id(&self) -> &ContactId {
        &self.contact_id
    }

    pub fn endpoint(&self) -> &OnionServiceEndpoint {
        &self.endpoint
    }

    pub fn encode_state(&self) -> String {
        format!(
            "{}|{}|{}",
            Self::STATE_SCHEMA,
            self.contact_id.as_str(),
            self.endpoint.as_str()
        )
    }

    pub fn decode_state(value: &str) -> Result<Self, EndpointLifecycleError> {
        let parts = value.trim().split('|').collect::<Vec<_>>();
        if parts.len() != 3 || parts[0] != Self::STATE_SCHEMA {
            return Err(EndpointLifecycleError::InvalidEndpointState);
        }
        let contact_id =
            ContactId::new(parts[1]).map_err(|_| EndpointLifecycleError::InvalidEndpointState)?;
        let endpoint = OnionServiceEndpoint::new(parts[2])
            .map_err(|_| EndpointLifecycleError::InvalidEndpointState)?;
        Self::new(
            contact_id,
            endpoint,
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
    }
}

impl fmt::Debug for PairwiseRendezvousEndpoint {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PairwiseRendezvousEndpoint")
            .field("contact_id", &"<redacted>")
            .field("endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct PairwiseEndpointUpdate {
    contact_id: ContactId,
    new_endpoint: OnionServiceEndpoint,
}

impl PairwiseEndpointUpdate {
    pub fn for_existing_encrypted_session(
        current: &PairwiseRendezvousEndpoint,
        new_endpoint: OnionServiceEndpoint,
        channel: EndpointUpdateChannel,
    ) -> Result<Self, EndpointLifecycleError> {
        if channel != EndpointUpdateChannel::ExistingEncryptedSession {
            return Err(EndpointLifecycleError::ExistingEncryptedSessionRequired);
        }
        if current.endpoint() == &new_endpoint {
            return Err(EndpointLifecycleError::EndpointUnchanged);
        }

        Ok(Self {
            contact_id: current.contact_id().clone(),
            new_endpoint,
        })
    }

    pub fn contact_id(&self) -> &ContactId {
        &self.contact_id
    }

    pub fn new_endpoint(&self) -> &OnionServiceEndpoint {
        &self.new_endpoint
    }
}

impl fmt::Debug for PairwiseEndpointUpdate {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PairwiseEndpointUpdate")
            .field("contact_id", &"<redacted>")
            .field("new_endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct PendingEndpointRotation {
    sequence: EndpointRotationSequence,
    update: PairwiseEndpointUpdate,
}

impl PendingEndpointRotation {
    pub fn sequence(&self) -> EndpointRotationSequence {
        self.sequence
    }

    pub fn update(&self) -> &PairwiseEndpointUpdate {
        &self.update
    }
}

impl fmt::Debug for PendingEndpointRotation {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PendingEndpointRotation")
            .field("sequence", &self.sequence)
            .field("contact_id", &"<redacted>")
            .field("new_endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct PairwiseEndpointRotationState {
    current: PairwiseRendezvousEndpoint,
    pending: Option<PendingEndpointRotation>,
    last_applied_sequence: u64,
}

impl PairwiseEndpointRotationState {
    pub fn new(current: PairwiseRendezvousEndpoint) -> Self {
        Self {
            current,
            pending: None,
            last_applied_sequence: 0,
        }
    }

    pub fn current(&self) -> &PairwiseRendezvousEndpoint {
        &self.current
    }

    pub fn pending(&self) -> Option<&PendingEndpointRotation> {
        self.pending.as_ref()
    }

    pub fn last_applied_sequence(&self) -> u64 {
        self.last_applied_sequence
    }

    pub fn stage_verified_update(
        &mut self,
        update: PairwiseEndpointUpdate,
        sequence: EndpointRotationSequence,
        context: EndpointRotationApplyContext,
    ) -> Result<(), EndpointLifecycleError> {
        if context != EndpointRotationApplyContext::ExistingEncryptedSessionVerified {
            return Err(EndpointLifecycleError::EncryptedSessionVerificationRequired);
        }
        if update.contact_id() != self.current.contact_id() {
            return Err(EndpointLifecycleError::EndpointContactMismatch);
        }
        if sequence.value() <= self.last_applied_sequence {
            return Err(EndpointLifecycleError::EndpointRotationRollback);
        }
        if let Some(pending) = &self.pending {
            if sequence <= pending.sequence() {
                return Err(EndpointLifecycleError::EndpointRotationStale);
            }
        }

        self.pending = Some(PendingEndpointRotation { sequence, update });
        Ok(())
    }

    pub fn apply_pending(
        &mut self,
        sequence: EndpointRotationSequence,
    ) -> Result<(), EndpointLifecycleError> {
        let pending = self
            .pending
            .take()
            .ok_or(EndpointLifecycleError::EndpointRotationNotPending)?;
        if sequence != pending.sequence() {
            self.pending = Some(pending);
            return Err(EndpointLifecycleError::EndpointRotationStale);
        }
        if sequence.value() <= self.last_applied_sequence {
            self.pending = Some(pending);
            return Err(EndpointLifecycleError::EndpointRotationRollback);
        }

        self.current = PairwiseRendezvousEndpoint::new(
            pending.update.contact_id().clone(),
            pending.update.new_endpoint().clone(),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )?;
        self.last_applied_sequence = sequence.value();
        Ok(())
    }

    pub fn reconnect_fail_closed<S: TransportRuntimeEventSink>(
        &self,
        sink: &mut S,
    ) -> Result<(), EndpointLifecycleError> {
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::RuntimeNetworkDisabled,
        ));
        Err(EndpointLifecycleError::EndpointReconnectNotImplemented)
    }
}

impl fmt::Debug for PairwiseEndpointRotationState {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PairwiseEndpointRotationState")
            .field("contact_id", &"<redacted>")
            .field("current_endpoint", &"<redacted>")
            .field("pending", &self.pending.as_ref().map(|_| "<redacted>"))
            .field("last_applied_sequence", &self.last_applied_sequence)
            .finish()
    }
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
pub struct EndpointUpdateControlPlaintext {
    new_endpoint: OnionServiceEndpoint,
}

impl EndpointUpdateControlPlaintext {
    const SCHEMA: &'static str = "ADENDPOINTUPDATE1";

    pub fn from_pairwise_update(update: &PairwiseEndpointUpdate) -> Self {
        Self {
            new_endpoint: update.new_endpoint().clone(),
        }
    }

    pub fn encode(&self) -> Vec<u8> {
        format!("{}|{}", Self::SCHEMA, self.new_endpoint.as_str()).into_bytes()
    }

    pub fn encode_padded(&self) -> Result<Vec<u8>, EndpointLifecycleError> {
        pad_to_bucket(&self.encode()).map_err(|_| EndpointLifecycleError::InvalidControlEnvelope)
    }
}

impl fmt::Debug for EndpointUpdateControlPlaintext {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("EndpointUpdateControlPlaintext")
            .field("new_endpoint", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Eq, PartialEq)]
pub struct EncryptedEndpointUpdateControlEnvelope {
    contact_id: ContactId,
    envelope: Envelope,
}

impl EncryptedEndpointUpdateControlEnvelope {
    pub fn from_pairwise_update(
        update: &PairwiseEndpointUpdate,
        channel_id: impl Into<String>,
        message_number: u64,
        encrypted_payload: Vec<u8>,
    ) -> Result<Self, EndpointLifecycleError> {
        if encrypted_payload.is_empty() {
            return Err(EndpointLifecycleError::EmptyEncryptedPayload);
        }
        let channel_id = channel_id.into();
        let envelope = Envelope {
            protocol_version: 1,
            channel_id,
            message_number,
            message_type: MessageType::Control,
            padded_ciphertext: encrypted_payload,
        };

        Self::from_control_envelope(update, envelope)
    }

    pub fn from_control_envelope(
        update: &PairwiseEndpointUpdate,
        envelope: Envelope,
    ) -> Result<Self, EndpointLifecycleError> {
        if envelope.protocol_version != 1
            || envelope.channel_id.is_empty()
            || envelope.message_number == 0
            || envelope.message_type != MessageType::Control
        {
            return Err(EndpointLifecycleError::InvalidControlEnvelope);
        }
        if envelope.padded_ciphertext.is_empty() {
            return Err(EndpointLifecycleError::EmptyEncryptedPayload);
        }
        if bucket_for_len(envelope.padded_ciphertext.len()).is_none() {
            return Err(EndpointLifecycleError::InvalidControlEnvelope);
        }

        Ok(Self {
            contact_id: update.contact_id().clone(),
            envelope,
        })
    }

    pub fn contact_id(&self) -> &ContactId {
        &self.contact_id
    }

    pub fn envelope(&self) -> &Envelope {
        &self.envelope
    }
}

impl fmt::Debug for EncryptedEndpointUpdateControlEnvelope {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("EncryptedEndpointUpdateControlEnvelope")
            .field("contact_id", &"<redacted>")
            .field("message_type", &self.envelope.message_type)
            .field("message_number", &self.envelope.message_number)
            .field(
                "padded_ciphertext_len",
                &self.envelope.padded_ciphertext.len(),
            )
            .finish()
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
    runtime_state: TransportRuntimeState,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyPolicy {
    DoNotGenerateUntilStorageDecision,
    AppPrivateArtiKeystoreAfterProfileLifecycleDecision,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyGenerationPolicy {
    DisabledUntilProfileUnlock,
    AfterExplicitProfileUnlock,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyStoragePolicy {
    Undecided,
    PlaintextAppFile,
    SqlcipherWrappedByProfileKey,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyRotationPolicy {
    Missing,
    ManualRotationWithContactEndpointUpdate,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyDeletionPolicy {
    Missing,
    DeleteOnProfileDestroy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyMigrationPolicy {
    Missing,
    NoAutomaticMigration,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionServiceKeyLifecycleDecision {
    pub generation_policy: OnionServiceKeyGenerationPolicy,
    pub storage_policy: OnionServiceKeyStoragePolicy,
    pub backup_exclusion_verified: bool,
    pub rotation_policy: OnionServiceKeyRotationPolicy,
    pub deletion_policy: OnionServiceKeyDeletionPolicy,
    pub migration_policy: OnionServiceKeyMigrationPolicy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionServiceKeyLifecycleReady;

impl OnionServiceKeyLifecycleDecision {
    pub fn locked_down_by_default() -> Self {
        Self {
            generation_policy: OnionServiceKeyGenerationPolicy::DisabledUntilProfileUnlock,
            storage_policy: OnionServiceKeyStoragePolicy::Undecided,
            backup_exclusion_verified: false,
            rotation_policy: OnionServiceKeyRotationPolicy::Missing,
            deletion_policy: OnionServiceKeyDeletionPolicy::Missing,
            migration_policy: OnionServiceKeyMigrationPolicy::Missing,
        }
    }

    pub fn sqlcipher_wrapped_after_unlock(
        _backup_exclusion_verification: &TransportBackupExclusionVerification,
    ) -> Self {
        Self {
            generation_policy: OnionServiceKeyGenerationPolicy::AfterExplicitProfileUnlock,
            storage_policy: OnionServiceKeyStoragePolicy::SqlcipherWrappedByProfileKey,
            backup_exclusion_verified: true,
            rotation_policy: OnionServiceKeyRotationPolicy::ManualRotationWithContactEndpointUpdate,
            deletion_policy: OnionServiceKeyDeletionPolicy::DeleteOnProfileDestroy,
            migration_policy: OnionServiceKeyMigrationPolicy::NoAutomaticMigration,
        }
    }

    pub fn check(self) -> Result<OnionServiceKeyLifecycleReady, OnionServiceKeyLifecycleError> {
        if self.generation_policy != OnionServiceKeyGenerationPolicy::AfterExplicitProfileUnlock {
            return Err(OnionServiceKeyLifecycleError::GenerationBeforeProfileUnlock);
        }
        if self.storage_policy == OnionServiceKeyStoragePolicy::PlaintextAppFile {
            return Err(OnionServiceKeyLifecycleError::PlaintextStorageForbidden);
        }
        if self.storage_policy != OnionServiceKeyStoragePolicy::SqlcipherWrappedByProfileKey {
            return Err(OnionServiceKeyLifecycleError::PlaintextStorageForbidden);
        }
        if !self.backup_exclusion_verified {
            return Err(OnionServiceKeyLifecycleError::BackupExclusionNotVerified);
        }
        if self.rotation_policy == OnionServiceKeyRotationPolicy::Missing {
            return Err(OnionServiceKeyLifecycleError::RotationPolicyMissing);
        }
        if self.deletion_policy == OnionServiceKeyDeletionPolicy::Missing {
            return Err(OnionServiceKeyLifecycleError::DeletionPolicyMissing);
        }
        if self.migration_policy == OnionServiceKeyMigrationPolicy::Missing {
            return Err(OnionServiceKeyLifecycleError::MigrationPolicyMissing);
        }
        Ok(OnionServiceKeyLifecycleReady)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProfileTransportUnlockReady;

#[derive(Clone, Eq, PartialEq)]
pub struct OnionServiceKeyRecordId {
    value: String,
}

impl OnionServiceKeyRecordId {
    pub fn new(value: impl Into<String>) -> Result<Self, OnionServiceKeyMaterialError> {
        let value = value.into();
        if !is_safe_endpoint_token(&value) {
            return Err(OnionServiceKeyMaterialError::InvalidRecordId);
        }
        Ok(Self { value })
    }

    pub fn as_str(&self) -> &str {
        &self.value
    }
}

impl fmt::Debug for OnionServiceKeyRecordId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionServiceKeyRecordId")
            .field("value", &"<redacted>")
            .finish()
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyMaterialState {
    Missing,
    ProfileLocked,
    PlaintextKeyBytesProvided,
    SqlcipherWrappedRecordReady,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OnionServiceKeyMaterialDecision {
    profile_unlocked: bool,
    lifecycle_ready: bool,
    material_state: OnionServiceKeyMaterialState,
    record_id: Option<OnionServiceKeyRecordId>,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OnionServiceKeyMaterialReady {
    record_id: OnionServiceKeyRecordId,
}

impl OnionServiceKeyMaterialDecision {
    pub fn locked_down_by_default() -> Self {
        Self {
            profile_unlocked: false,
            lifecycle_ready: false,
            material_state: OnionServiceKeyMaterialState::Missing,
            record_id: None,
        }
    }

    pub fn profile_locked(
        _lifecycle: &OnionServiceKeyLifecycleReady,
        record_id: OnionServiceKeyRecordId,
    ) -> Self {
        Self {
            profile_unlocked: false,
            lifecycle_ready: true,
            material_state: OnionServiceKeyMaterialState::ProfileLocked,
            record_id: Some(record_id),
        }
    }

    pub fn plaintext_key_bytes_after_unlock(
        _profile_unlock: &ProfileTransportUnlockReady,
        _lifecycle: &OnionServiceKeyLifecycleReady,
    ) -> Self {
        Self {
            profile_unlocked: true,
            lifecycle_ready: true,
            material_state: OnionServiceKeyMaterialState::PlaintextKeyBytesProvided,
            record_id: None,
        }
    }

    pub fn sqlcipher_wrapped_record_after_unlock(
        _profile_unlock: &ProfileTransportUnlockReady,
        _lifecycle: &OnionServiceKeyLifecycleReady,
        record_id: OnionServiceKeyRecordId,
    ) -> Self {
        Self {
            profile_unlocked: true,
            lifecycle_ready: true,
            material_state: OnionServiceKeyMaterialState::SqlcipherWrappedRecordReady,
            record_id: Some(record_id),
        }
    }

    pub fn check(self) -> Result<OnionServiceKeyMaterialReady, OnionServiceKeyMaterialError> {
        if !self.profile_unlocked {
            return Err(OnionServiceKeyMaterialError::ProfileLocked);
        }
        if !self.lifecycle_ready {
            return Err(OnionServiceKeyMaterialError::LifecycleNotReady);
        }
        if self.material_state == OnionServiceKeyMaterialState::PlaintextKeyBytesProvided {
            return Err(OnionServiceKeyMaterialError::PlaintextKeyMaterialForbidden);
        }
        if self.material_state != OnionServiceKeyMaterialState::SqlcipherWrappedRecordReady {
            return Err(OnionServiceKeyMaterialError::MissingSqlcipherWrappedRecord);
        }

        let record_id = self
            .record_id
            .ok_or(OnionServiceKeyMaterialError::MissingSqlcipherWrappedRecord)?;
        Ok(OnionServiceKeyMaterialReady { record_id })
    }
}

impl OnionServiceKeyMaterialReady {
    pub fn record_id(&self) -> &OnionServiceKeyRecordId {
        &self.record_id
    }
}

impl fmt::Debug for OnionServiceKeyMaterialDecision {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionServiceKeyMaterialDecision")
            .field("profile_unlocked", &self.profile_unlocked)
            .field("lifecycle_ready", &self.lifecycle_ready)
            .field("material_state", &self.material_state)
            .field("record_id", &self.record_id.as_ref().map(|_| "<redacted>"))
            .finish()
    }
}

impl fmt::Debug for OnionServiceKeyMaterialReady {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionServiceKeyMaterialReady")
            .field("record_id", &"<redacted>")
            .field("raw_key_material", &"<not-loaded>")
            .finish()
    }
}

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

#[derive(Clone, Copy, Eq, PartialEq)]
pub struct OnionInboundStreamBoundary {
    _descriptor_ready: OnionServiceDescriptorPublicationReady,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OnionOutboundStreamBoundary {
    pairwise_endpoint: PairwiseRendezvousEndpoint,
    policy: TransportPolicy,
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
            .field("policy_mode", &self.policy.mode)
            .finish()
    }
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
    use arti_client::{config::TorClientConfigBuilder, TorClientConfig};
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
            let config =
                TorClientConfigBuilder::from_directories(dirs.state_dir(), dirs.cache_dir())
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
            let config =
                TorClientConfigBuilder::from_directories(dirs.state_dir(), dirs.cache_dir())
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

        pub fn explicitly_enabled_for_manual_spike(
            adapter: BoundedArtiBootstrapAdapterSpike,
        ) -> Self {
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
            let attempt =
                arti_client::TorClient::create_bootstrapped(self.adapter.config().clone());

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
            let attempt =
                arti_client::TorClient::create_bootstrapped(self.adapter.config().clone());

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
    fn pairwise_rendezvous_endpoint_rejects_global_or_identity_key_bound_scope() {
        let contact = ContactId::new("bob").expect("contact");
        let endpoint = OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint");

        assert_eq!(
            PairwiseRendezvousEndpoint::new(
                contact.clone(),
                endpoint.clone(),
                RendezvousEndpointScope::GlobalDirectory,
                RendezvousEndpointIdentityBinding::TransportScoped,
            ),
            Err(EndpointLifecycleError::GlobalEndpointForbidden)
        );
        assert_eq!(
            PairwiseRendezvousEndpoint::new(
                contact,
                endpoint,
                RendezvousEndpointScope::PairwiseContact,
                RendezvousEndpointIdentityBinding::DerivedFromIdentityKey,
            ),
            Err(EndpointLifecycleError::IdentityKeyCouplingForbidden)
        );
    }

    #[test]
    fn pairwise_rendezvous_endpoint_accepts_transport_scoped_contact_endpoint() {
        let contact = ContactId::new("bob").expect("contact");
        let endpoint = OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint");
        let pairwise = PairwiseRendezvousEndpoint::new(
            contact.clone(),
            endpoint.clone(),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("pairwise endpoint");

        assert_eq!(pairwise.contact_id(), &contact);
        assert_eq!(pairwise.endpoint(), &endpoint);

        let rendered = format!("{pairwise:?}");
        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("bobsecret.onion"));
    }

    #[test]
    fn pairwise_rendezvous_endpoint_state_round_trips_and_rejects_malformed_state() {
        let pairwise = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("bobsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("pairwise endpoint");

        let encoded = pairwise.encode_state();
        assert_eq!(encoded, "ADENDPOINTSTATE1|bob|bobsecret.onion");
        assert_eq!(
            PairwiseRendezvousEndpoint::decode_state(&encoded).expect("decode"),
            pairwise
        );

        for malformed in [
            "",
            "ADENDPOINTSTATE1|bob",
            "ADENDPOINTSTATE1|bob|example.com",
            "ADENDPOINTSTATE1|bad contact|bobsecret.onion",
            "OTHER|bob|bobsecret.onion",
        ] {
            assert_eq!(
                PairwiseRendezvousEndpoint::decode_state(malformed),
                Err(EndpointLifecycleError::InvalidEndpointState)
            );
        }
    }

    #[test]
    fn endpoint_update_requires_existing_encrypted_session() {
        let current = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("current endpoint");

        for channel in [
            EndpointUpdateChannel::PlaintextControl,
            EndpointUpdateChannel::OutOfBandPairingPayload,
        ] {
            assert_eq!(
                PairwiseEndpointUpdate::for_existing_encrypted_session(
                    &current,
                    OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
                    channel,
                ),
                Err(EndpointLifecycleError::ExistingEncryptedSessionRequired)
            );
        }
    }

    #[test]
    fn endpoint_update_rejects_unchanged_endpoint_and_redacts_rotation_context() {
        let current = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("current endpoint");

        assert_eq!(
            PairwiseEndpointUpdate::for_existing_encrypted_session(
                &current,
                OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
                EndpointUpdateChannel::ExistingEncryptedSession,
            ),
            Err(EndpointLifecycleError::EndpointUnchanged)
        );

        let update = PairwiseEndpointUpdate::for_existing_encrypted_session(
            &current,
            OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
            EndpointUpdateChannel::ExistingEncryptedSession,
        )
        .expect("endpoint update");

        assert_eq!(update.contact_id(), current.contact_id());
        assert_eq!(update.new_endpoint().as_str(), "newsecret.onion");

        let rendered = format!("{update:?}");
        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("oldsecret.onion"));
        assert!(!rendered.contains("newsecret.onion"));
    }

    #[test]
    fn endpoint_rotation_state_stages_and_applies_only_verified_updates() {
        let current = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("current endpoint");
        let update = PairwiseEndpointUpdate::for_existing_encrypted_session(
            &current,
            OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
            EndpointUpdateChannel::ExistingEncryptedSession,
        )
        .expect("endpoint update");
        let mut state = PairwiseEndpointRotationState::new(current);

        assert_eq!(
            state.stage_verified_update(
                update.clone(),
                EndpointRotationSequence::new(1).expect("sequence"),
                EndpointRotationApplyContext::UnverifiedControlPayload,
            ),
            Err(EndpointLifecycleError::EncryptedSessionVerificationRequired)
        );

        state
            .stage_verified_update(
                update,
                EndpointRotationSequence::new(1).expect("sequence"),
                EndpointRotationApplyContext::ExistingEncryptedSessionVerified,
            )
            .expect("stage verified update");
        assert_eq!(
            state.pending().expect("pending").sequence(),
            EndpointRotationSequence::new(1).expect("sequence")
        );

        state
            .apply_pending(EndpointRotationSequence::new(1).expect("sequence"))
            .expect("apply pending");
        assert_eq!(state.current().endpoint().as_str(), "newsecret.onion");
        assert_eq!(state.last_applied_sequence(), 1);
        assert!(state.pending().is_none());

        let rendered = format!("{state:?}");
        assert!(rendered.contains("PairwiseEndpointRotationState"));
        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("oldsecret.onion"));
        assert!(!rendered.contains("newsecret.onion"));
    }

    #[test]
    fn endpoint_rotation_state_rejects_rollback_stale_and_contact_mismatch() {
        let current = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("current endpoint");
        let bob_update = PairwiseEndpointUpdate::for_existing_encrypted_session(
            &current,
            OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
            EndpointUpdateChannel::ExistingEncryptedSession,
        )
        .expect("endpoint update");
        let carol_current = PairwiseRendezvousEndpoint::new(
            ContactId::new("carol").expect("contact"),
            OnionServiceEndpoint::new("carolsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("carol endpoint");
        let carol_update = PairwiseEndpointUpdate::for_existing_encrypted_session(
            &carol_current,
            OnionServiceEndpoint::new("carolnew.onion").expect("endpoint"),
            EndpointUpdateChannel::ExistingEncryptedSession,
        )
        .expect("carol update");
        let mut state = PairwiseEndpointRotationState::new(current);

        assert_eq!(
            state.apply_pending(EndpointRotationSequence::new(1).expect("sequence")),
            Err(EndpointLifecycleError::EndpointRotationNotPending)
        );
        assert_eq!(
            state.stage_verified_update(
                carol_update,
                EndpointRotationSequence::new(1).expect("sequence"),
                EndpointRotationApplyContext::ExistingEncryptedSessionVerified,
            ),
            Err(EndpointLifecycleError::EndpointContactMismatch)
        );

        state
            .stage_verified_update(
                bob_update.clone(),
                EndpointRotationSequence::new(2).expect("sequence"),
                EndpointRotationApplyContext::ExistingEncryptedSessionVerified,
            )
            .expect("stage update");
        assert_eq!(
            state.stage_verified_update(
                bob_update.clone(),
                EndpointRotationSequence::new(2).expect("sequence"),
                EndpointRotationApplyContext::ExistingEncryptedSessionVerified,
            ),
            Err(EndpointLifecycleError::EndpointRotationStale)
        );
        assert_eq!(
            state.apply_pending(EndpointRotationSequence::new(1).expect("sequence")),
            Err(EndpointLifecycleError::EndpointRotationStale)
        );
        state
            .apply_pending(EndpointRotationSequence::new(2).expect("sequence"))
            .expect("apply update");
        assert_eq!(
            state.stage_verified_update(
                bob_update,
                EndpointRotationSequence::new(1).expect("sequence"),
                EndpointRotationApplyContext::ExistingEncryptedSessionVerified,
            ),
            Err(EndpointLifecycleError::EndpointRotationRollback)
        );
        assert_eq!(
            EndpointRotationSequence::new(0),
            Err(EndpointLifecycleError::EndpointRotationStale)
        );
    }

    #[test]
    fn endpoint_rotation_reconnect_is_fail_closed_and_redacted() {
        let current = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("current endpoint");
        let state = PairwiseEndpointRotationState::new(current);
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            state.reconnect_fail_closed(&mut sink),
            Err(EndpointLifecycleError::EndpointReconnectNotImplemented)
        );
        assert_eq!(sink.events().len(), 1);
        assert_eq!(
            sink.events()[0].kind(),
            TransportRuntimeEventKind::RuntimePreflightFailed
        );
        assert_eq!(
            sink.events()[0].runtime_error(),
            Some(TransportRuntimeError::RuntimeNetworkDisabled)
        );
        assert_redacted_event_hides(&sink.events()[0], &["bob", "oldsecret.onion", ".onion"]);
    }

    #[test]
    fn endpoint_update_control_plaintext_pads_before_encryption_and_redacts_debug() {
        let current = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("current endpoint");
        let update = PairwiseEndpointUpdate::for_existing_encrypted_session(
            &current,
            OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
            EndpointUpdateChannel::ExistingEncryptedSession,
        )
        .expect("endpoint update");

        let plaintext = EndpointUpdateControlPlaintext::from_pairwise_update(&update);
        let encoded = plaintext.encode();
        let padded = plaintext.encode_padded().expect("padded plaintext");

        assert_eq!(
            String::from_utf8_lossy(&encoded),
            "ADENDPOINTUPDATE1|newsecret.onion"
        );
        assert_eq!(padded.len(), 256);

        let debug = format!("{plaintext:?}");
        assert!(debug.contains("EndpointUpdateControlPlaintext"));
        assert!(debug.contains("<redacted>"));
        assert!(!debug.contains("bob"));
        assert!(!debug.contains("oldsecret.onion"));
        assert!(!debug.contains("newsecret.onion"));
    }

    #[test]
    fn encrypted_endpoint_update_control_envelope_wraps_only_control_ciphertext() {
        let current = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("current endpoint");
        let update = PairwiseEndpointUpdate::for_existing_encrypted_session(
            &current,
            OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
            EndpointUpdateChannel::ExistingEncryptedSession,
        )
        .expect("endpoint update");

        let control = EncryptedEndpointUpdateControlEnvelope::from_pairwise_update(
            &update,
            "adchan1:endpoint-update",
            7,
            b"opaque encrypted endpoint update".to_vec(),
        )
        .expect("control envelope");

        assert_eq!(control.contact_id(), current.contact_id());
        assert_eq!(control.envelope().protocol_version, 1);
        assert_eq!(control.envelope().channel_id, "adchan1:endpoint-update");
        assert_eq!(control.envelope().message_number, 7);
        assert_eq!(control.envelope().message_type, MessageType::Control);
        assert_eq!(
            control.envelope().padded_ciphertext,
            b"opaque encrypted endpoint update"
        );

        let debug = format!("{control:?}");
        assert!(debug.contains("EncryptedEndpointUpdateControlEnvelope"));
        assert!(debug.contains("Control"));
        assert!(debug.contains("padded_ciphertext_len"));
        assert!(!debug.contains("bob"));
        assert!(!debug.contains("oldsecret.onion"));
        assert!(!debug.contains("newsecret.onion"));

        let rendered_ciphertext = String::from_utf8_lossy(&control.envelope().padded_ciphertext);
        assert!(!rendered_ciphertext.contains("oldsecret.onion"));
        assert!(!rendered_ciphertext.contains("newsecret.onion"));
    }

    #[test]
    fn encrypted_endpoint_update_control_envelope_rejects_invalid_shape() {
        let current = PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("oldsecret.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("current endpoint");
        let update = PairwiseEndpointUpdate::for_existing_encrypted_session(
            &current,
            OnionServiceEndpoint::new("newsecret.onion").expect("endpoint"),
            EndpointUpdateChannel::ExistingEncryptedSession,
        )
        .expect("endpoint update");

        assert_eq!(
            EncryptedEndpointUpdateControlEnvelope::from_pairwise_update(
                &update,
                "adchan1:endpoint-update",
                1,
                Vec::new(),
            ),
            Err(EndpointLifecycleError::EmptyEncryptedPayload)
        );
        assert_eq!(
            EncryptedEndpointUpdateControlEnvelope::from_pairwise_update(
                &update,
                "",
                1,
                b"ciphertext".to_vec(),
            ),
            Err(EndpointLifecycleError::InvalidControlEnvelope)
        );
        assert_eq!(
            EncryptedEndpointUpdateControlEnvelope::from_pairwise_update(
                &update,
                "adchan1:endpoint-update",
                0,
                b"ciphertext".to_vec(),
            ),
            Err(EndpointLifecycleError::InvalidControlEnvelope)
        );
        assert_eq!(
            EncryptedEndpointUpdateControlEnvelope::from_pairwise_update(
                &update,
                "adchan1:endpoint-update",
                1,
                vec![7; 8193],
            ),
            Err(EndpointLifecycleError::InvalidControlEnvelope)
        );
    }

    #[test]
    fn onion_transport_skeleton_fails_closed_until_adapter_exists() {
        let transport = OnionEnvelopeTransport::fail_closed_high_risk();
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let envelope = sample_envelope();

        assert_eq!(transport.runtime_state(), TransportRuntimeState::Disabled);
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
    fn onion_transport_can_hold_ready_runtime_state_but_still_fails_closed() {
        let transport =
            OnionEnvelopeTransport::fail_closed_after_preflight(TransportRuntimePreflight {
                runtime_network_enabled: true,
                state_cache_dirs_accessible: true,
                log_redaction_ready: true,
                bridge_or_censorship_ready: true,
            })
            .expect("ready runtime state");
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let envelope = sample_envelope();

        assert_eq!(
            transport.runtime_state(),
            TransportRuntimeState::Ready(TransportRuntimeReady)
        );
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
    fn onion_transport_rejects_runtime_state_when_preflight_fails() {
        assert_eq!(
            OnionEnvelopeTransport::fail_closed_after_preflight(
                TransportRuntimePreflight::disabled_by_default()
            ),
            Err(TransportRuntimeError::RuntimeNetworkDisabled)
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
    fn runtime_error_taxonomy_separates_preflight_bootstrap_and_onion_failures() {
        assert!(TransportRuntimeError::StateDirectoryPermissionDenied.is_preflight_failure());
        assert!(TransportRuntimeError::LogRedactionPreflightFailed.is_preflight_failure());
        assert!(!TransportRuntimeError::BootstrapTimeout.is_preflight_failure());

        assert!(TransportRuntimeError::BootstrapCancelled.is_bootstrap_failure());
        assert!(TransportRuntimeError::BootstrapTimeout.is_bootstrap_failure());
        assert!(TransportRuntimeError::CensorshipOrBridgeRequired.is_bootstrap_failure());
        assert!(TransportRuntimeError::RuntimeNetworkDisabled.is_bootstrap_failure());
        assert!(!TransportRuntimeError::OnionServiceLaunchFailed.is_bootstrap_failure());

        assert!(TransportRuntimeError::OnionServiceKeyUnavailable.is_onion_service_failure());
        assert!(TransportRuntimeError::OnionServiceLaunchFailed.is_onion_service_failure());
        assert!(!TransportRuntimeError::SendFailed.is_onion_service_failure());
        assert!(!TransportRuntimeError::ReceiveFailed.is_onion_service_failure());
    }

    #[test]
    fn bootstrap_policy_has_bounded_high_risk_defaults() {
        let policy = TransportBootstrapPolicy::high_risk_default();

        assert_eq!(policy.timeout().seconds(), 45);
        assert_eq!(policy.retry().max_attempts(), 2);
        assert_eq!(policy.retry().initial_backoff_ms(), 500);
        assert_eq!(policy.retry().max_backoff_ms(), 2_000);
        assert!(!policy.allow_silent_retry());
        assert!(policy.classify_censorship_separately());
    }

    #[test]
    fn bootstrap_policy_rejects_unbounded_or_silent_retry() {
        assert_eq!(
            TransportBootstrapTimeoutPolicy::new(0),
            Err(TransportBootstrapPolicyError::ZeroTimeout)
        );
        assert_eq!(
            TransportBootstrapTimeoutPolicy::new(
                TransportBootstrapTimeoutPolicy::MAX_TIMEOUT_SECONDS + 1
            ),
            Err(TransportBootstrapPolicyError::TimeoutTooLong)
        );
        assert_eq!(
            TransportBootstrapRetryPolicy::new(0, 500, 2_000),
            Err(TransportBootstrapPolicyError::ZeroRetryAttempts)
        );
        assert_eq!(
            TransportBootstrapRetryPolicy::new(
                TransportBootstrapRetryPolicy::MAX_ATTEMPTS + 1,
                500,
                2_000,
            ),
            Err(TransportBootstrapPolicyError::TooManyRetryAttempts)
        );
        assert_eq!(
            TransportBootstrapRetryPolicy::new(1, 0, 2_000),
            Err(TransportBootstrapPolicyError::ZeroBackoff)
        );
        assert_eq!(
            TransportBootstrapRetryPolicy::new(1, 2_000, 500),
            Err(TransportBootstrapPolicyError::BackoffExceedsMaximum)
        );
        assert_eq!(
            TransportBootstrapPolicy::new(
                TransportBootstrapTimeoutPolicy::high_risk_default(),
                TransportBootstrapRetryPolicy::high_risk_default(),
                true,
                true,
            ),
            Err(TransportBootstrapPolicyError::SilentRetryForbidden)
        );
    }

    #[test]
    fn bootstrap_outcome_maps_cancellation_timeout_and_censorship() {
        let policy = TransportBootstrapPolicy::high_risk_default();

        assert_eq!(
            TransportBootstrapOutcome::Cancelled.runtime_error(policy),
            TransportRuntimeError::BootstrapCancelled
        );
        assert_eq!(
            TransportBootstrapOutcome::TimedOut.runtime_error(policy),
            TransportRuntimeError::BootstrapTimeout
        );
        assert_eq!(
            TransportBootstrapOutcome::TransientNetworkFailure.runtime_error(policy),
            TransportRuntimeError::BootstrapTimeout
        );
        assert_eq!(
            TransportBootstrapOutcome::CensorshipOrBridgeRequired.runtime_error(policy),
            TransportRuntimeError::CensorshipOrBridgeRequired
        );
    }

    #[test]
    fn bootstrap_policy_can_collapse_censorship_when_not_configured() {
        let policy = TransportBootstrapPolicy::new(
            TransportBootstrapTimeoutPolicy::high_risk_default(),
            TransportBootstrapRetryPolicy::high_risk_default(),
            false,
            false,
        )
        .expect("policy");

        assert_eq!(
            TransportBootstrapOutcome::CensorshipOrBridgeRequired.runtime_error(policy),
            TransportRuntimeError::BootstrapTimeout
        );
    }

    #[test]
    fn bootstrap_execution_skeleton_requires_ready_runtime_and_bounded_policy() {
        let skeleton = TransportBootstrapExecutionSkeleton::new(
            TransportRuntimeReady,
            TransportBootstrapPolicy::high_risk_default(),
        );

        assert_eq!(skeleton.runtime_ready(), TransportRuntimeReady);
        assert_eq!(
            skeleton.policy(),
            TransportBootstrapPolicy::high_risk_default()
        );
    }

    #[test]
    fn bootstrap_execution_skeleton_fails_closed_and_records_redacted_event() {
        let skeleton = TransportBootstrapExecutionSkeleton::new(
            TransportRuntimeReady,
            TransportBootstrapPolicy::high_risk_default(),
        );
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            skeleton.execute_fail_closed(TransportBootstrapOutcome::TimedOut, &mut sink),
            Err(TransportRuntimeError::BootstrapTimeout)
        );

        assert_eq!(sink.events().len(), 1);
        assert_eq!(
            sink.events()[0].kind(),
            TransportRuntimeEventKind::BootstrapFailed
        );
        assert_eq!(
            sink.events()[0].runtime_error(),
            Some(TransportRuntimeError::BootstrapTimeout)
        );
    }

    #[test]
    fn bootstrap_execution_skeleton_classifies_censorship_without_raw_context() {
        let skeleton = TransportBootstrapExecutionSkeleton::new(
            TransportRuntimeReady,
            TransportBootstrapPolicy::high_risk_default(),
        );
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            skeleton.execute_fail_closed(
                TransportBootstrapOutcome::CensorshipOrBridgeRequired,
                &mut sink,
            ),
            Err(TransportRuntimeError::CensorshipOrBridgeRequired)
        );

        let rendered = format!("{:?}", sink.events());
        assert!(rendered.contains("CensorshipOrBridgeRequired"));
        assert!(!rendered.contains("obfs4"));
        assert!(!rendered.contains(".onion"));
        assert!(!rendered.contains("Library/Application Support"));
    }

    #[test]
    fn pre_network_closeout_blocks_network_execution_by_default() {
        let closeout = TransportPreNetworkCloseout::high_risk_default();

        assert!(!closeout.network_execution_allowed());
        assert_eq!(
            closeout.blockers(),
            &[
                TransportPreNetworkBlocker::BackupExclusionVerification,
                TransportPreNetworkBlocker::OnionServiceKeyLifecycle,
                TransportPreNetworkBlocker::BridgeCensorshipConfiguration,
            ]
        );
        assert_eq!(
            closeout.next_phase(),
            TransportNextPhase::BackupExclusionVerification
        );
    }

    #[test]
    fn pre_network_closeout_allows_bootstrap_skeleton_only_after_blockers_clear() {
        let closeout = TransportPreNetworkCloseout::from_blockers(Vec::new());

        assert!(closeout.network_execution_allowed());
        assert_eq!(
            closeout.next_phase(),
            TransportNextPhase::ArtiBootstrapExecutionSkeleton
        );
    }

    #[test]
    fn pre_network_closeout_moves_to_onion_key_lifecycle_after_backup_exclusion() {
        let verification = TransportBackupExclusionVerification;
        let closeout =
            TransportPreNetworkCloseout::after_backup_exclusion_verification(&verification);

        assert!(!closeout.network_execution_allowed());
        assert_eq!(
            closeout.blockers(),
            &[
                TransportPreNetworkBlocker::OnionServiceKeyLifecycle,
                TransportPreNetworkBlocker::BridgeCensorshipConfiguration,
            ]
        );
        assert_eq!(
            closeout.next_phase(),
            TransportNextPhase::OnionServiceKeyLifecycle
        );
    }

    #[test]
    fn pre_network_closeout_moves_to_bridge_config_after_onion_key_lifecycle() {
        let ready = OnionServiceKeyLifecycleReady;
        let closeout = TransportPreNetworkCloseout::after_onion_service_key_lifecycle(&ready);

        assert!(!closeout.network_execution_allowed());
        assert_eq!(
            closeout.blockers(),
            &[TransportPreNetworkBlocker::BridgeCensorshipConfiguration]
        );
        assert_eq!(
            closeout.next_phase(),
            TransportNextPhase::BridgeCensorshipConfiguration
        );
    }

    #[test]
    fn pre_network_closeout_allows_bootstrap_skeleton_after_bridge_config() {
        let ready = BridgeCensorshipReady {
            readiness: TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild,
        };
        let closeout = TransportPreNetworkCloseout::after_bridge_censorship_configuration(&ready);

        assert!(closeout.network_execution_allowed());
        assert_eq!(closeout.blockers(), &[]);
        assert_eq!(
            closeout.next_phase(),
            TransportNextPhase::ArtiBootstrapExecutionSkeleton
        );
    }

    #[test]
    fn runtime_preflight_is_disabled_by_default() {
        assert_eq!(
            TransportRuntimePreflight::disabled_by_default().check(),
            Err(TransportRuntimeError::RuntimeNetworkDisabled)
        );
    }

    #[test]
    fn runtime_preflight_maps_missing_checks_to_runtime_errors() {
        assert_eq!(
            TransportRuntimePreflight {
                runtime_network_enabled: true,
                state_cache_dirs_accessible: false,
                log_redaction_ready: true,
                bridge_or_censorship_ready: true,
            }
            .check(),
            Err(TransportRuntimeError::StateDirectoryPermissionDenied)
        );
        assert_eq!(
            TransportRuntimePreflight {
                runtime_network_enabled: true,
                state_cache_dirs_accessible: true,
                log_redaction_ready: false,
                bridge_or_censorship_ready: true,
            }
            .check(),
            Err(TransportRuntimeError::LogRedactionPreflightFailed)
        );
        assert_eq!(
            TransportRuntimePreflight {
                runtime_network_enabled: true,
                state_cache_dirs_accessible: true,
                log_redaction_ready: true,
                bridge_or_censorship_ready: false,
            }
            .check(),
            Err(TransportRuntimeError::CensorshipOrBridgeRequired)
        );
    }

    #[test]
    fn runtime_preflight_success_requires_all_bootstrap_guards() {
        assert_eq!(
            TransportRuntimePreflight {
                runtime_network_enabled: true,
                state_cache_dirs_accessible: true,
                log_redaction_ready: true,
                bridge_or_censorship_ready: true,
            }
            .check(),
            Ok(TransportRuntimeReady)
        );
    }

    #[test]
    fn runtime_permission_preflight_is_locked_down_by_default() {
        assert_eq!(
            TransportRuntimePermissionPreflight::locked_down_by_default().check(),
            Err(TransportRuntimeError::RuntimeNetworkDisabled)
        );
    }

    #[test]
    fn runtime_permission_preflight_requires_app_private_dirs_and_backup_exclusion() {
        let mut preflight = ready_permission_preflight();
        preflight.app_private_state_cache_dirs = false;
        assert_eq!(
            preflight.check(),
            Err(TransportRuntimeError::StateDirectoryPermissionDenied)
        );

        let mut preflight = ready_permission_preflight();
        preflight.backup_exclusion_verified = false;
        assert_eq!(
            preflight.check(),
            Err(TransportRuntimeError::StateDirectoryPermissionDenied)
        );
    }

    #[test]
    fn runtime_permission_preflight_requires_log_and_crash_redaction() {
        let mut preflight = ready_permission_preflight();
        preflight.log_redaction_policy = TransportLogRedactionPolicy::NotConfigured;
        assert_eq!(
            preflight.check(),
            Err(TransportRuntimeError::LogRedactionPreflightFailed)
        );

        let mut preflight = ready_permission_preflight();
        preflight.crash_redaction_policy = TransportCrashRedactionPolicy::NotConfigured;
        assert_eq!(
            preflight.check(),
            Err(TransportRuntimeError::LogRedactionPreflightFailed)
        );
    }

    #[test]
    fn runtime_permission_preflight_requires_censorship_decision() {
        let mut preflight = ready_permission_preflight();
        preflight.censorship_readiness = TransportCensorshipReadiness::Unsupported;
        assert_eq!(
            preflight.check(),
            Err(TransportRuntimeError::CensorshipOrBridgeRequired)
        );

        let mut preflight = ready_permission_preflight();
        preflight.censorship_readiness = TransportCensorshipReadiness::ConfiguredBeforeBootstrap;
        assert_eq!(preflight.check(), Ok(TransportRuntimeReady));
    }

    #[test]
    fn bridge_censorship_configuration_is_unsupported_by_default() {
        assert_eq!(
            BridgeCensorshipConfiguration::Unsupported
                .check(BridgeRequirement::ExplicitlyNotRequiredForThisBuild),
            Err(BridgeCensorshipConfigurationError::Unsupported)
        );
    }

    #[test]
    fn bridge_censorship_configuration_allows_explicit_no_bridge_build() {
        let ready = BridgeCensorshipConfiguration::NoBridgeRequired
            .check(BridgeRequirement::ExplicitlyNotRequiredForThisBuild)
            .expect("no bridge build should be ready");

        assert_eq!(
            ready.readiness(),
            TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild
        );
    }

    #[test]
    fn bridge_censorship_configuration_requires_bridge_when_declared() {
        assert_eq!(
            BridgeCensorshipConfiguration::NoBridgeRequired
                .check(BridgeRequirement::RequiredBeforeBootstrap),
            Err(BridgeCensorshipConfigurationError::BridgeRequiredButMissing)
        );

        assert_eq!(
            BridgeCensorshipConfiguration::BridgeConfigured {
                redacted_bridge_config_id: String::new(),
            }
            .check(BridgeRequirement::RequiredBeforeBootstrap),
            Err(BridgeCensorshipConfigurationError::EmptyRedactedBridgeConfigId)
        );
    }

    #[test]
    fn bridge_censorship_configuration_rejects_raw_bridge_lines() {
        let config = BridgeCensorshipConfiguration::RawBridgeLine {
            value: "obfs4 198.51.100.1:443 fingerprint cert=secret iat-mode=0".to_string(),
        };

        assert_eq!(
            config.check(BridgeRequirement::RequiredBeforeBootstrap),
            Err(BridgeCensorshipConfigurationError::RawBridgeLineForbidden)
        );
    }

    #[test]
    fn bridge_censorship_configuration_accepts_redacted_config_id() {
        let ready = BridgeCensorshipConfiguration::BridgeConfigured {
            redacted_bridge_config_id: "bridge-config-01".to_string(),
        }
        .check(BridgeRequirement::RequiredBeforeBootstrap)
        .expect("redacted bridge config should be ready");

        assert_eq!(
            ready.readiness(),
            TransportCensorshipReadiness::ConfiguredBeforeBootstrap
        );
    }

    #[test]
    fn runtime_permission_preflight_can_use_bridge_censorship_token() {
        let root = unique_transport_test_root("fully-verified-preflight");
        let dirs = probe_app_private_state_cache_dirs(root.join("state"), root.join("cache"))
            .expect("state/cache probe should pass");
        let backup = TransportBackupExclusionVerification;
        let bridge = BridgeCensorshipConfiguration::NoBridgeRequired
            .check(BridgeRequirement::ExplicitlyNotRequiredForThisBuild)
            .expect("bridge decision should pass");

        let preflight = TransportRuntimePermissionPreflight::from_fully_verified_preflight(
            &dirs,
            true,
            &backup,
            bridge,
            TransportLogRedactionPolicy::RedactedTransportEventsOnly,
            TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
        );

        assert_eq!(preflight.check(), Ok(TransportRuntimeReady));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn runtime_directory_probe_creates_and_checks_state_cache_dirs() {
        let root = unique_transport_test_root("dir-probe");
        let state_dir = root.join("state");
        let cache_dir = root.join("cache");

        let ready = probe_app_private_state_cache_dirs(&state_dir, &cache_dir)
            .expect("state/cache probe should pass");

        assert_eq!(ready.state_dir(), state_dir.as_path());
        assert_eq!(ready.cache_dir(), cache_dir.as_path());
        assert!(state_dir.is_dir());
        assert!(cache_dir.is_dir());
        assert!(!state_dir
            .join(".another-dimension-transport-preflight")
            .exists());
        assert!(!cache_dir
            .join(".another-dimension-transport-preflight")
            .exists());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn runtime_directory_probe_rejects_unsafe_paths_before_writes() {
        let root = unique_transport_test_root("dir-reject");
        let shared_state = if cfg!(windows) {
            r"C:\Users\alex\AppData\Roaming\arti"
        } else {
            "/Users/alex/.local/share/arti"
        };

        assert_eq!(
            probe_app_private_state_cache_dirs("relative-state", root.join("cache")),
            Err(TransportRuntimeProbeError::RelativeDirectory)
        );
        assert_eq!(
            probe_app_private_state_cache_dirs(shared_state, root.join("cache")),
            Err(TransportRuntimeProbeError::SharedDefaultDirectory)
        );
        assert_eq!(
            probe_app_private_state_cache_dirs(root.join("same"), root.join("same")),
            Err(TransportRuntimeProbeError::SameStateAndCacheDirectory)
        );
        assert!(!root.exists());
    }

    #[test]
    fn runtime_directory_probe_error_maps_to_redacted_runtime_failure() {
        let root = unique_transport_test_root("dir-error");
        let error = probe_app_private_state_cache_dirs("relative-state", root.join("cache"))
            .expect_err("relative path should fail");

        assert_eq!(
            TransportRuntimeError::from(error),
            TransportRuntimeError::StateDirectoryPermissionDenied
        );
        assert!(!format!("{error:?}").contains("relative-state"));
    }

    #[test]
    fn runtime_permission_preflight_uses_directory_probe_token() {
        let root = unique_transport_test_root("platform-preflight");
        let dirs = probe_app_private_state_cache_dirs(root.join("state"), root.join("cache"))
            .expect("state/cache probe should pass");

        let preflight = TransportRuntimePermissionPreflight::from_platform_preflight(
            &dirs,
            true,
            true,
            TransportLogRedactionPolicy::RedactedTransportEventsOnly,
            TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
            TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild,
        );

        assert_eq!(preflight.check(), Ok(TransportRuntimeReady));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn runtime_permission_preflight_can_use_backup_exclusion_token() {
        let root = unique_transport_test_root("verified-platform-preflight");
        let dirs = probe_app_private_state_cache_dirs(root.join("state"), root.join("cache"))
            .expect("state/cache probe should pass");
        let verification = TransportBackupExclusionVerification;

        let preflight = TransportRuntimePermissionPreflight::from_verified_platform_preflight(
            &dirs,
            true,
            &verification,
            TransportLogRedactionPolicy::RedactedTransportEventsOnly,
            TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
            TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild,
        );

        assert_eq!(preflight.check(), Ok(TransportRuntimeReady));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    #[cfg(not(target_os = "macos"))]
    fn backup_exclusion_verification_fails_closed_on_unsupported_platforms() {
        let root = unique_transport_test_root("backup-exclusion-unsupported");
        let dirs = probe_app_private_state_cache_dirs(root.join("state"), root.join("cache"))
            .expect("state/cache probe should pass");

        assert_eq!(
            verify_transport_backup_exclusion(&dirs),
            Err(TransportBackupExclusionError::UnsupportedPlatform)
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn backup_exclusion_verification_requires_macos_metadata() {
        let root = unique_transport_test_root("backup-exclusion-macos-missing");
        let dirs = probe_app_private_state_cache_dirs(root.join("state"), root.join("cache"))
            .expect("state/cache probe should pass");

        assert_eq!(
            verify_transport_backup_exclusion(&dirs),
            Err(TransportBackupExclusionError::MissingStateDirectoryBackupExclusion)
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn redacted_runtime_event_does_not_expose_directory_paths() {
        let raw_path = Path::new("/Users/alex/Library/Application Support/AnotherDimension/secret");
        let event = RedactedTransportRuntimeEvent::directory_probe_failed(
            raw_path,
            TransportRuntimeProbeError::DirectoryProbeFailed,
        );

        assert_eq!(
            event.kind(),
            TransportRuntimeEventKind::DirectoryProbeFailed
        );
        assert_eq!(
            event.runtime_error(),
            Some(TransportRuntimeError::StateDirectoryPermissionDenied)
        );
        assert_eq!(
            event.probe_error(),
            Some(TransportRuntimeProbeError::DirectoryProbeFailed)
        );
        assert_redacted_event_hides(&event, &["alex", "AnotherDimension", "secret"]);
    }

    #[test]
    fn redacted_runtime_event_does_not_expose_onion_endpoint() {
        let route = TransportRoute::onion("secretabc.onion").expect("onion route");
        let event =
            RedactedTransportRuntimeEvent::route_rejected(&route, TransportError::PolicyViolation);

        assert_eq!(event.kind(), TransportRuntimeEventKind::RouteRejected);
        assert_eq!(event.route_kind(), Some(TransportKind::OnionService));
        assert_redacted_event_hides(&event, &["secretabc.onion", "secretabc"]);
    }

    #[test]
    fn redacted_runtime_event_does_not_expose_profile_contact_plaintext_or_keys() {
        let profile = ProfileName::new("alice-secret-profile").expect("profile");
        let contact_id = "bob-sensitive-contact";
        let onion_endpoint = "contactsecret.onion";
        let plaintext = "meet at 10";
        let key_material = b"raw-private-key-material";

        let event = RedactedTransportRuntimeEvent::sensitive_context_rejected(
            &profile,
            contact_id,
            onion_endpoint,
            plaintext,
            key_material,
            TransportRuntimeError::LogRedactionPreflightFailed,
        );

        assert_eq!(
            event.kind(),
            TransportRuntimeEventKind::SensitiveContextRejected
        );
        assert_eq!(
            event.runtime_error(),
            Some(TransportRuntimeError::LogRedactionPreflightFailed)
        );
        assert_redacted_event_hides(
            &event,
            &[
                "alice-secret-profile",
                "bob-sensitive-contact",
                "contactsecret.onion",
                "meet at 10",
                "raw-private-key-material",
            ],
        );
    }

    #[test]
    fn redacted_runtime_event_records_transfer_category_only() {
        let event = RedactedTransportRuntimeEvent::transfer_failed(
            TransportTransferDirection::Send,
            TransportRuntimeError::SendFailed,
        );

        assert_eq!(event.kind(), TransportRuntimeEventKind::TransferFailed);
        assert_eq!(
            event.runtime_error(),
            Some(TransportRuntimeError::SendFailed)
        );
        assert_eq!(
            event.transfer_direction(),
            Some(TransportTransferDirection::Send)
        );
    }

    #[test]
    fn runtime_event_noop_sink_accepts_only_redacted_events() {
        let mut sink = NoopTransportRuntimeEventSink;
        sink.record(RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::BootstrapTimeout,
        ));
    }

    #[test]
    fn runtime_event_memory_sink_stores_only_redacted_events() {
        let mut sink = InMemoryTransportRuntimeEventSink::default();
        let profile = ProfileName::new("alice-secret-profile").expect("profile");

        sink.record(RedactedTransportRuntimeEvent::sensitive_context_rejected(
            &profile,
            "bob-sensitive-contact",
            "contactsecret.onion",
            "meet at 10",
            b"raw-private-key-material",
            TransportRuntimeError::LogRedactionPreflightFailed,
        ));

        assert_eq!(sink.events().len(), 1);
        assert_eq!(
            sink.events()[0].kind(),
            TransportRuntimeEventKind::SensitiveContextRejected
        );
        assert_redacted_event_hides(
            &sink.events()[0],
            &[
                "alice-secret-profile",
                "bob-sensitive-contact",
                "contactsecret.onion",
                "meet at 10",
                "raw-private-key-material",
            ],
        );
    }

    #[test]
    fn runtime_state_is_disabled_by_default_and_not_ready() {
        let state = TransportRuntimeState::disabled();

        assert_eq!(state, TransportRuntimeState::Disabled);
        assert!(!state.is_ready());
    }

    #[test]
    fn runtime_state_ready_requires_successful_preflight() {
        assert_eq!(
            TransportRuntimeState::from_preflight(TransportRuntimePreflight::disabled_by_default()),
            Err(TransportRuntimeError::RuntimeNetworkDisabled)
        );

        let ready = TransportRuntimeState::from_preflight(TransportRuntimePreflight {
            runtime_network_enabled: true,
            state_cache_dirs_accessible: true,
            log_redaction_ready: true,
            bridge_or_censorship_ready: true,
        })
        .expect("runtime ready");

        assert_eq!(ready, TransportRuntimeState::Ready(TransportRuntimeReady));
        assert!(ready.is_ready());
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

    #[test]
    fn onion_service_key_lifecycle_is_locked_down_by_default() {
        assert_eq!(
            OnionServiceKeyLifecycleDecision::locked_down_by_default().check(),
            Err(OnionServiceKeyLifecycleError::GenerationBeforeProfileUnlock)
        );
    }

    #[test]
    fn onion_service_key_lifecycle_rejects_plaintext_or_unverified_storage() {
        let backup = TransportBackupExclusionVerification;
        let mut decision =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(&backup);
        decision.storage_policy = OnionServiceKeyStoragePolicy::PlaintextAppFile;
        assert_eq!(
            decision.check(),
            Err(OnionServiceKeyLifecycleError::PlaintextStorageForbidden)
        );

        let mut decision =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(&backup);
        decision.backup_exclusion_verified = false;
        assert_eq!(
            decision.check(),
            Err(OnionServiceKeyLifecycleError::BackupExclusionNotVerified)
        );
    }

    #[test]
    fn onion_service_key_lifecycle_requires_rotation_deletion_and_migration_policies() {
        let backup = TransportBackupExclusionVerification;
        let mut decision =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(&backup);
        decision.rotation_policy = OnionServiceKeyRotationPolicy::Missing;
        assert_eq!(
            decision.check(),
            Err(OnionServiceKeyLifecycleError::RotationPolicyMissing)
        );

        let mut decision =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(&backup);
        decision.deletion_policy = OnionServiceKeyDeletionPolicy::Missing;
        assert_eq!(
            decision.check(),
            Err(OnionServiceKeyLifecycleError::DeletionPolicyMissing)
        );

        let mut decision =
            OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(&backup);
        decision.migration_policy = OnionServiceKeyMigrationPolicy::Missing;
        assert_eq!(
            decision.check(),
            Err(OnionServiceKeyLifecycleError::MigrationPolicyMissing)
        );
    }

    #[test]
    fn onion_service_key_lifecycle_accepts_sqlcipher_wrapped_after_unlock_policy() {
        let backup = TransportBackupExclusionVerification;
        let decision = OnionServiceKeyLifecycleDecision::sqlcipher_wrapped_after_unlock(&backup);

        assert_eq!(decision.check(), Ok(OnionServiceKeyLifecycleReady));
    }

    #[test]
    fn onion_service_key_material_requires_unlock_lifecycle_and_wrapped_record() {
        let profile_unlock = ProfileTransportUnlockReady;
        let key_lifecycle = OnionServiceKeyLifecycleReady;
        let record_id = OnionServiceKeyRecordId::new("onion-key-record-1").expect("record id");

        assert_eq!(
            OnionServiceKeyMaterialDecision::locked_down_by_default().check(),
            Err(OnionServiceKeyMaterialError::ProfileLocked)
        );
        assert_eq!(
            OnionServiceKeyMaterialDecision::profile_locked(&key_lifecycle, record_id.clone())
                .check(),
            Err(OnionServiceKeyMaterialError::ProfileLocked)
        );
        assert_eq!(
            OnionServiceKeyMaterialDecision::plaintext_key_bytes_after_unlock(
                &profile_unlock,
                &key_lifecycle,
            )
            .check(),
            Err(OnionServiceKeyMaterialError::PlaintextKeyMaterialForbidden)
        );

        let ready = OnionServiceKeyMaterialDecision::sqlcipher_wrapped_record_after_unlock(
            &profile_unlock,
            &key_lifecycle,
            record_id.clone(),
        )
        .check()
        .expect("key material ready");

        assert_eq!(ready.record_id(), &record_id);
    }

    #[test]
    fn onion_service_key_material_rejects_unsafe_ids_and_redacts_debug() {
        assert_eq!(
            OnionServiceKeyRecordId::new(""),
            Err(OnionServiceKeyMaterialError::InvalidRecordId)
        );
        assert_eq!(
            OnionServiceKeyRecordId::new("../secret-key"),
            Err(OnionServiceKeyMaterialError::InvalidRecordId)
        );

        let profile_unlock = ProfileTransportUnlockReady;
        let key_lifecycle = OnionServiceKeyLifecycleReady;
        let record_id = OnionServiceKeyRecordId::new("secret-onion-key-record").expect("record id");
        let decision = OnionServiceKeyMaterialDecision::sqlcipher_wrapped_record_after_unlock(
            &profile_unlock,
            &key_lifecycle,
            record_id,
        );
        let ready = decision.clone().check().expect("key material ready");
        let decision_debug = format!("{decision:?}");
        let ready_debug = format!("{ready:?}");

        assert!(decision_debug.contains("<redacted>"));
        assert!(ready_debug.contains("<redacted>"));
        assert!(ready_debug.contains("<not-loaded>"));
        assert!(!decision_debug.contains("secret-onion-key-record"));
        assert!(!ready_debug.contains("secret-onion-key-record"));
        assert!(!ready_debug.contains("private-key"));
    }

    #[test]
    fn onion_service_launch_preflight_is_locked_down_by_default() {
        assert_eq!(
            OnionServiceLaunchPreflight::locked_down_by_default().check(),
            Err(OnionServiceLaunchPreflightError::ProfileUnlockRequired)
        );
    }

    #[test]
    fn onion_service_launch_preflight_requires_persistent_client_and_endpoint_policies() {
        let profile_unlock = ProfileTransportUnlockReady;
        let key_material = ready_onion_service_key_material();

        let preflight = OnionServiceLaunchPreflight::from_ready_boundaries(
            &profile_unlock,
            &key_material,
            false,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
            OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
            true,
        );
        assert_eq!(
            preflight.check(),
            Err(OnionServiceLaunchPreflightError::PersistentClientNotReady)
        );

        let preflight = OnionServiceLaunchPreflight::from_ready_boundaries(
            &profile_unlock,
            &key_material,
            true,
            OnionEndpointPublicationPolicy::Missing,
            OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
            true,
        );
        assert_eq!(
            preflight.check(),
            Err(OnionServiceLaunchPreflightError::EndpointPublicationPolicyMissing)
        );

        let preflight = OnionServiceLaunchPreflight::from_ready_boundaries(
            &profile_unlock,
            &key_material,
            true,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
            OnionEndpointUpdatePolicy::Missing,
            true,
        );
        assert_eq!(
            preflight.check(),
            Err(OnionServiceLaunchPreflightError::EndpointUpdatePolicyMissing)
        );
    }

    #[test]
    fn onion_service_launch_preflight_requires_redacted_events() {
        let profile_unlock = ProfileTransportUnlockReady;
        let key_material = ready_onion_service_key_material();
        let preflight = OnionServiceLaunchPreflight::from_ready_boundaries(
            &profile_unlock,
            &key_material,
            true,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
            OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
            false,
        );

        assert_eq!(
            preflight.check(),
            Err(OnionServiceLaunchPreflightError::LogRedactionRequired)
        );
    }

    #[test]
    fn onion_service_launch_preflight_accepts_ready_boundaries_without_launching_service() {
        let profile_unlock = ProfileTransportUnlockReady;
        let key_material = ready_onion_service_key_material();
        let preflight = OnionServiceLaunchPreflight::from_ready_boundaries(
            &profile_unlock,
            &key_material,
            true,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
            OnionEndpointUpdatePolicy::ExistingEncryptedSessionOnly,
            true,
        );

        assert_eq!(preflight.check(), Ok(OnionServiceLaunchReady));

        let event = RedactedTransportRuntimeEvent::runtime_preflight_failed(
            TransportRuntimeError::OnionServiceLaunchFailed,
        );
        assert_redacted_event_hides(&event, &["example.onion", "alice", "bob"]);
    }

    #[test]
    fn onion_service_descriptor_publication_requires_pairwise_policy() {
        assert_eq!(
            OnionServiceDescriptorPublicationBoundary::from_launch_ready(
                OnionServiceLaunchReady,
                OnionEndpointPublicationPolicy::Missing,
            ),
            Err(OnionServiceDescriptorPublicationError::EndpointPublicationPolicyMissing)
        );

        let boundary = OnionServiceDescriptorPublicationBoundary::from_launch_ready(
            OnionServiceLaunchReady,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
        )
        .expect("descriptor publication boundary");

        assert_eq!(
            boundary.endpoint_publication_policy(),
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly
        );
    }

    #[test]
    fn onion_service_descriptor_publication_fails_closed_and_redacts_output() {
        let boundary = OnionServiceDescriptorPublicationBoundary::from_launch_ready(
            OnionServiceLaunchReady,
            OnionEndpointPublicationPolicy::PairwiseRendezvousOnly,
        )
        .expect("descriptor publication boundary");
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            boundary.publish_fail_closed(&mut sink),
            Err(OnionServiceDescriptorPublicationError::DescriptorPublicationNotImplemented)
        );
        assert_eq!(sink.events().len(), 1);
        assert_eq!(
            sink.events()[0].kind(),
            TransportRuntimeEventKind::RuntimePreflightFailed
        );
        assert_eq!(
            sink.events()[0].runtime_error(),
            Some(TransportRuntimeError::OnionServiceLaunchFailed)
        );

        let rendered = format!("{boundary:?}");
        assert!(rendered.contains("OnionServiceDescriptorPublicationBoundary"));
        assert!(rendered.contains("<not-published>"));
        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains("example.onion"));
        assert!(!rendered.contains("alice"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("private-key"));
        assert!(!rendered.contains("descriptor-value"));
        assert_redacted_event_hides(
            &sink.events()[0],
            &[
                "example.onion",
                "alice",
                "bob",
                "private-key",
                "descriptor-value",
            ],
        );
    }

    #[test]
    fn onion_inbound_stream_boundary_requires_descriptor_publication_ready() {
        assert_eq!(
            OnionInboundStreamBoundary::from_missing_descriptor_publication(),
            Err(OnionInboundStreamError::DescriptorPublicationRequired)
        );

        let boundary = OnionInboundStreamBoundary::from_descriptor_publication_ready(
            OnionServiceDescriptorPublicationReady,
        );
        let rendered = format!("{boundary:?}");

        assert!(rendered.contains("OnionInboundStreamBoundary"));
        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains("example.onion"));
        assert!(!rendered.contains("alice"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("stream-1"));
        assert!(!rendered.contains("descriptor-value"));
    }

    #[test]
    fn onion_inbound_stream_accept_and_io_fail_closed_with_redacted_events() {
        let boundary = OnionInboundStreamBoundary::from_descriptor_publication_ready(
            OnionServiceDescriptorPublicationReady,
        );
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            boundary.accept_fail_closed(&mut sink),
            Err(OnionInboundStreamError::InboundAcceptNotImplemented)
        );
        assert_eq!(
            boundary.read_write_fail_closed(&mut sink),
            Err(OnionInboundStreamError::InboundReadWriteNotImplemented)
        );
        assert_eq!(sink.events().len(), 2);
        for event in sink.events() {
            assert_eq!(
                event.kind(),
                TransportRuntimeEventKind::RuntimePreflightFailed
            );
            assert_eq!(
                event.runtime_error(),
                Some(TransportRuntimeError::ReceiveFailed)
            );
            assert_redacted_event_hides(
                event,
                &[
                    "example.onion",
                    "alice",
                    "bob",
                    "stream-1",
                    "descriptor-value",
                    "private-key",
                ],
            );
        }
    }

    #[test]
    fn onion_outbound_stream_boundary_requires_pairwise_endpoint_and_onion_policy() {
        assert_eq!(
            OnionOutboundStreamBoundary::from_missing_pairwise_endpoint(),
            Err(OnionOutboundStreamError::PairwiseEndpointRequired)
        );

        assert_eq!(
            OnionOutboundStreamBoundary::from_pairwise_endpoint(
                sample_pairwise_endpoint(),
                TransportPolicy::local_only(),
            ),
            Err(OnionOutboundStreamError::TransportPolicyViolation)
        );

        let boundary = OnionOutboundStreamBoundary::from_pairwise_endpoint(
            sample_pairwise_endpoint(),
            TransportPolicy::high_risk_default(),
        )
        .expect("outbound boundary");
        let rendered = format!("{boundary:?}");

        assert_eq!(boundary.contact_id().as_str(), "bob");
        assert_eq!(boundary.policy(), &TransportPolicy::high_risk_default());
        assert!(rendered.contains("OnionOutboundStreamBoundary"));
        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains("example.onion"));
        assert!(!rendered.contains("alice"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("stream-1"));
    }

    #[test]
    fn onion_outbound_stream_dial_and_send_fail_closed_with_redacted_events() {
        let boundary = OnionOutboundStreamBoundary::from_pairwise_endpoint(
            sample_pairwise_endpoint(),
            TransportPolicy::high_risk_default(),
        )
        .expect("outbound boundary");
        let envelope = sample_envelope();
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            boundary.dial_fail_closed(&mut sink),
            Err(OnionOutboundStreamError::OutboundDialNotImplemented)
        );
        assert_eq!(
            boundary.send_fail_closed(&envelope, &mut sink),
            Err(OnionOutboundStreamError::OutboundSendNotImplemented)
        );
        assert_eq!(sink.events().len(), 2);
        for event in sink.events() {
            assert_eq!(
                event.kind(),
                TransportRuntimeEventKind::RuntimePreflightFailed
            );
            assert_eq!(
                event.runtime_error(),
                Some(TransportRuntimeError::SendFailed)
            );
            assert_redacted_event_hides(
                event,
                &[
                    "example.onion",
                    "alice",
                    "bob",
                    "stream-1",
                    "descriptor-value",
                    "private-key",
                    "ciphertext",
                ],
            );
        }
    }

    #[test]
    fn stream_session_binding_requires_verified_pairwise_session() {
        assert_eq!(
            PairwiseStreamSessionBinding::from_verified_pairwise_session(
                ContactId::new("bob").expect("contact"),
                StreamSessionVerificationContext::UnverifiedSession,
            ),
            Err(StreamSessionBindingError::VerifiedPairwiseSessionRequired)
        );
        assert_eq!(
            BoundInboundStreamSession::from_missing_session_binding(),
            Err(StreamSessionBindingError::VerifiedPairwiseSessionRequired)
        );
        assert_eq!(
            BoundOutboundStreamSession::from_missing_session_binding(),
            Err(StreamSessionBindingError::VerifiedPairwiseSessionRequired)
        );

        let binding = sample_stream_session_binding("bob");
        let rendered = format!("{binding:?}");

        assert_eq!(binding.contact_id().as_str(), "bob");
        assert!(rendered.contains("PairwiseStreamSessionBinding"));
        assert!(rendered.contains("<redacted>"));
        assert!(rendered.contains("<verified>"));
        assert!(rendered.contains("<not-held>"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("session-secret"));
    }

    #[test]
    fn bound_outbound_stream_requires_matching_pairwise_session_contact() {
        let outbound = OnionOutboundStreamBoundary::from_pairwise_endpoint(
            sample_pairwise_endpoint(),
            TransportPolicy::high_risk_default(),
        )
        .expect("outbound boundary");

        assert_eq!(
            BoundOutboundStreamSession::from_outbound_stream(
                outbound.clone(),
                sample_stream_session_binding("carol"),
                sample_remote_peer_authentication("bob"),
            ),
            Err(RemotePeerAuthenticationError::ContactMismatch)
        );
        assert_eq!(
            BoundOutboundStreamSession::from_outbound_stream(
                outbound.clone(),
                sample_stream_session_binding("bob"),
                sample_remote_peer_authentication("carol"),
            ),
            Err(RemotePeerAuthenticationError::ContactMismatch)
        );

        let bound = BoundOutboundStreamSession::from_outbound_stream(
            outbound,
            sample_stream_session_binding("bob"),
            sample_remote_peer_authentication("bob"),
        )
        .expect("bound outbound stream");
        let rendered = format!("{bound:?}");

        assert_eq!(bound.contact_id().as_str(), "bob");
        assert!(rendered.contains("BoundOutboundStreamSession"));
        assert!(rendered.contains("<redacted>"));
        assert!(rendered.contains("<verified>"));
        assert!(rendered.contains("<not-sent>"));
        assert!(!rendered.contains("example.onion"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("carol"));
        assert!(!rendered.contains("ciphertext"));
    }

    #[test]
    fn remote_peer_authentication_is_required_before_bound_stream_session() {
        assert_eq!(
            RemotePeerAuthenticationReady::from_missing_peer_proof(),
            Err(RemotePeerAuthenticationError::RemotePeerAuthenticationRequired)
        );
        assert_eq!(
            RemotePeerAuthenticationReady::from_authenticated_pairwise_peer(
                ContactId::new("bob").expect("contact"),
                RemotePeerAuthenticationContext::UnauthenticatedPeer,
            ),
            Err(RemotePeerAuthenticationError::RemotePeerAuthenticationRequired)
        );
        assert_eq!(
            BoundInboundStreamSession::from_inbound_stream(
                OnionInboundStreamBoundary::from_descriptor_publication_ready(
                    OnionServiceDescriptorPublicationReady,
                ),
                sample_stream_session_binding("bob"),
                sample_remote_peer_authentication("carol"),
            ),
            Err(RemotePeerAuthenticationError::ContactMismatch)
        );

        let peer = sample_remote_peer_authentication("bob");
        let rendered = format!("{peer:?}");

        assert_eq!(peer.contact_id().as_str(), "bob");
        assert!(rendered.contains("RemotePeerAuthenticationReady"));
        assert!(rendered.contains("<redacted>"));
        assert!(rendered.contains("<verified>"));
        assert!(!rendered.contains("bob"));
        assert!(!rendered.contains("peer-proof"));
        assert!(!rendered.contains("session-transcript"));
        assert!(!rendered.contains("example.onion"));
    }

    #[test]
    fn bound_stream_sessions_still_fail_closed_for_envelope_io() {
        let inbound = sample_bound_inbound_stream_session();
        let outbound = sample_bound_outbound_stream_session();
        let envelope = sample_envelope();
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            inbound.receive_fail_closed(&mut sink),
            Err(StreamSessionBindingError::BoundInboundReceiveNotImplemented)
        );
        assert_eq!(
            outbound.send_fail_closed(&envelope, &mut sink),
            Err(StreamSessionBindingError::BoundOutboundSendNotImplemented)
        );
        assert_eq!(sink.events().len(), 2);
        assert_eq!(
            sink.events()[0].runtime_error(),
            Some(TransportRuntimeError::ReceiveFailed)
        );
        assert_eq!(
            sink.events()[1].runtime_error(),
            Some(TransportRuntimeError::SendFailed)
        );
        for event in sink.events() {
            assert_redacted_event_hides(
                event,
                &[
                    "example.onion",
                    "alice",
                    "bob",
                    "carol",
                    "stream-1",
                    "descriptor-value",
                    "private-key",
                    "ciphertext",
                    "session-secret",
                ],
            );
        }
    }

    #[test]
    fn envelope_io_adapter_requires_explicit_readiness_after_bound_session() {
        assert_eq!(
            InboundEnvelopeIoAdapterBoundary::from_missing_io_readiness(),
            Err(EnvelopeIoAdapterError::EnvelopeIoReadinessRequired)
        );
        assert_eq!(
            OutboundEnvelopeIoAdapterBoundary::from_missing_io_readiness(),
            Err(EnvelopeIoAdapterError::EnvelopeIoReadinessRequired)
        );

        let inbound = InboundEnvelopeIoAdapterBoundary::from_bound_stream_session(
            sample_bound_inbound_stream_session(),
            EnvelopeIoAdapterReady,
        );
        let outbound = OutboundEnvelopeIoAdapterBoundary::from_bound_stream_session(
            sample_bound_outbound_stream_session(),
            EnvelopeIoAdapterReady,
        );
        let inbound_rendered = format!("{inbound:?}");
        let outbound_rendered = format!("{outbound:?}");

        assert!(inbound_rendered.contains("InboundEnvelopeIoAdapterBoundary"));
        assert!(outbound_rendered.contains("OutboundEnvelopeIoAdapterBoundary"));
        for rendered in [&inbound_rendered, &outbound_rendered] {
            assert!(rendered.contains("<redacted>"));
            assert!(!rendered.contains("example.onion"));
            assert!(!rendered.contains("bob"));
            assert!(!rendered.contains("adchan1:test"));
            assert!(!rendered.contains("ciphertext"));
            assert!(!rendered.contains("session-secret"));
        }
    }

    #[test]
    fn envelope_io_adapter_still_fails_closed_for_send_receive() {
        let inbound = InboundEnvelopeIoAdapterBoundary::from_bound_stream_session(
            sample_bound_inbound_stream_session(),
            EnvelopeIoAdapterReady,
        );
        let outbound = OutboundEnvelopeIoAdapterBoundary::from_bound_stream_session(
            sample_bound_outbound_stream_session(),
            EnvelopeIoAdapterReady,
        );
        let envelope = sample_envelope();
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            inbound.receive_fail_closed(&mut sink),
            Err(EnvelopeIoAdapterError::InboundEnvelopeReceiveNotImplemented)
        );
        assert_eq!(
            outbound.send_fail_closed(&envelope, &mut sink),
            Err(EnvelopeIoAdapterError::OutboundEnvelopeSendNotImplemented)
        );
        assert_eq!(sink.events().len(), 2);
        assert_eq!(
            sink.events()[0].runtime_error(),
            Some(TransportRuntimeError::ReceiveFailed)
        );
        assert_eq!(
            sink.events()[1].runtime_error(),
            Some(TransportRuntimeError::SendFailed)
        );
        for event in sink.events() {
            assert_redacted_event_hides(
                event,
                &[
                    "example.onion",
                    "alice",
                    "bob",
                    "stream-1",
                    "descriptor-value",
                    "private-key",
                    "adchan1:test",
                    "ciphertext",
                    "session-secret",
                ],
            );
        }
    }

    #[test]
    fn post_auth_stream_readiness_order_requires_envelope_io_boundary() {
        assert_eq!(
            PostAuthInboundStreamReadinessOrder::from_missing_envelope_io_boundary(),
            Err(PostAuthStreamReadinessOrderingError::EnvelopeIoBoundaryRequired)
        );
        assert_eq!(
            PostAuthOutboundStreamReadinessOrder::from_missing_envelope_io_boundary(),
            Err(PostAuthStreamReadinessOrderingError::EnvelopeIoBoundaryRequired)
        );

        let inbound = PostAuthInboundStreamReadinessOrder::from_envelope_io_boundary(
            InboundEnvelopeIoAdapterBoundary::from_bound_stream_session(
                sample_bound_inbound_stream_session(),
                EnvelopeIoAdapterReady,
            ),
        );
        let outbound = PostAuthOutboundStreamReadinessOrder::from_envelope_io_boundary(
            OutboundEnvelopeIoAdapterBoundary::from_bound_stream_session(
                sample_bound_outbound_stream_session(),
                EnvelopeIoAdapterReady,
            ),
        );
        let inbound_rendered = format!("{inbound:?}");
        let outbound_rendered = format!("{outbound:?}");

        assert!(inbound_rendered.contains("PostAuthInboundStreamReadinessOrder"));
        assert!(inbound_rendered.contains("required-before-descriptor"));
        assert!(inbound_rendered.contains("required-before-inbound-stream"));
        assert!(outbound_rendered.contains("PostAuthOutboundStreamReadinessOrder"));
        assert!(outbound_rendered.contains("required-before-outbound-stream"));
        assert!(outbound_rendered.contains("required-before-session-binding"));
        for rendered in [&inbound_rendered, &outbound_rendered] {
            assert!(rendered.contains("<redacted>"));
            assert!(rendered.contains("<fail-closed>"));
            assert!(!rendered.contains("example.onion"));
            assert!(!rendered.contains("bob"));
            assert!(!rendered.contains("peer-proof"));
            assert!(!rendered.contains("session-transcript"));
            assert!(!rendered.contains("adchan1:test"));
            assert!(!rendered.contains("ciphertext"));
        }
    }

    fn sample_bound_inbound_stream_session() -> BoundInboundStreamSession {
        BoundInboundStreamSession::from_inbound_stream(
            OnionInboundStreamBoundary::from_descriptor_publication_ready(
                OnionServiceDescriptorPublicationReady,
            ),
            sample_stream_session_binding("bob"),
            sample_remote_peer_authentication("bob"),
        )
        .expect("bound inbound stream")
    }

    fn sample_bound_outbound_stream_session() -> BoundOutboundStreamSession {
        BoundOutboundStreamSession::from_outbound_stream(
            OnionOutboundStreamBoundary::from_pairwise_endpoint(
                sample_pairwise_endpoint(),
                TransportPolicy::high_risk_default(),
            )
            .expect("outbound boundary"),
            sample_stream_session_binding("bob"),
            sample_remote_peer_authentication("bob"),
        )
        .expect("bound outbound stream")
    }

    fn sample_pairwise_endpoint() -> PairwiseRendezvousEndpoint {
        PairwiseRendezvousEndpoint::new(
            ContactId::new("bob").expect("contact"),
            OnionServiceEndpoint::new("example.onion").expect("endpoint"),
            RendezvousEndpointScope::PairwiseContact,
            RendezvousEndpointIdentityBinding::TransportScoped,
        )
        .expect("pairwise endpoint")
    }

    fn sample_stream_session_binding(contact_id: &str) -> PairwiseStreamSessionBinding {
        PairwiseStreamSessionBinding::from_verified_pairwise_session(
            ContactId::new(contact_id).expect("contact"),
            StreamSessionVerificationContext::VerifiedPairwiseEncryptedSession,
        )
        .expect("verified binding")
    }

    fn sample_remote_peer_authentication(contact_id: &str) -> RemotePeerAuthenticationReady {
        RemotePeerAuthenticationReady::from_authenticated_pairwise_peer(
            ContactId::new(contact_id).expect("contact"),
            RemotePeerAuthenticationContext::AuthenticatedPairwisePeer,
        )
        .expect("remote peer authentication")
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

    fn ready_onion_service_key_material() -> OnionServiceKeyMaterialReady {
        OnionServiceKeyMaterialDecision::sqlcipher_wrapped_record_after_unlock(
            &ProfileTransportUnlockReady,
            &OnionServiceKeyLifecycleReady,
            OnionServiceKeyRecordId::new("onion-key-record-1").expect("record id"),
        )
        .check()
        .expect("key material ready")
    }

    fn ready_permission_preflight() -> TransportRuntimePermissionPreflight {
        TransportRuntimePermissionPreflight {
            runtime_network_enabled: true,
            app_private_state_cache_dirs: true,
            backup_exclusion_verified: true,
            log_redaction_policy: TransportLogRedactionPolicy::RedactedTransportEventsOnly,
            crash_redaction_policy:
                TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
            censorship_readiness: TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild,
        }
    }

    fn unique_transport_test_root(label: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "another-dimension-{label}-{}-{nanos}",
            std::process::id()
        ))
    }

    fn assert_redacted_event_hides(
        event: &RedactedTransportRuntimeEvent,
        forbidden_fragments: &[&str],
    ) {
        let debug = format!("{event:?}");
        let display = event.to_string();

        for fragment in forbidden_fragments {
            assert!(
                !debug.contains(fragment),
                "debug output leaked forbidden fragment: {fragment}"
            );
            assert!(
                !display.contains(fragment),
                "display output leaked forbidden fragment: {fragment}"
            );
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

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn arti_adapter_spike_builds_app_private_config_without_opening_network() {
        let root = std::env::temp_dir().join("another-dimension-test-profile");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let spike =
            arti_adapter_spike::ArtiAdapterSpike::fail_closed_app_private_config(dirs.clone())
                .expect("app private config");
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let envelope = sample_envelope();

        assert_eq!(spike.dirs(), Some(&dirs));
        assert!(format!("{:?}", spike.config()).contains("TorClientConfig"));
        assert_eq!(
            spike.transport().send_envelope(TransportSendRequest {
                route: &onion,
                envelope: &envelope,
            }),
            Err(TransportError::Unavailable)
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn arti_app_private_dirs_reject_shared_defaults_and_relative_paths() {
        let root = std::env::temp_dir().join("another-dimension-test-profile");
        let shared_state = if cfg!(windows) {
            r"C:\Users\alex\AppData\Roaming\arti"
        } else {
            "/Users/alex/.local/share/arti"
        };
        let shared_cache = if cfg!(windows) {
            r"C:\Users\alex\AppData\Local\arti"
        } else {
            "/Users/alex/.cache/arti"
        };

        assert_eq!(
            arti_adapter_spike::ArtiAppPrivateDirs::new(shared_state, root.join("cache")),
            Err(arti_adapter_spike::ArtiConfigError::SharedDefaultDirectory)
        );
        assert_eq!(
            arti_adapter_spike::ArtiAppPrivateDirs::new(root.join("state"), shared_cache),
            Err(arti_adapter_spike::ArtiConfigError::SharedDefaultDirectory)
        );
        assert_eq!(
            arti_adapter_spike::ArtiAppPrivateDirs::new("relative-state", root.join("cache"),),
            Err(arti_adapter_spike::ArtiConfigError::RelativeDirectory)
        );
        assert_eq!(
            arti_adapter_spike::ArtiAppPrivateDirs::new(root.join("same"), root.join("same")),
            Err(arti_adapter_spike::ArtiConfigError::SameStateAndCacheDirectory)
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn profile_scoped_transport_dirs_resolve_app_private_arti_dirs() {
        let root = unique_transport_test_root("profile-transport-dirs");
        let profile = ProfileName::new("alice").expect("profile");
        let dirs =
            arti_adapter_spike::ProfileScopedTransportDirs::from_app_data_root(&root, &profile)
                .expect("profile scoped dirs");

        assert_eq!(
            dirs.dirs().state_dir(),
            root.join("profiles")
                .join("alice")
                .join("transport")
                .join("arti-state")
        );
        assert_eq!(
            dirs.dirs().cache_dir(),
            root.join("profiles")
                .join("alice")
                .join("transport")
                .join("arti-cache")
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn profile_scoped_transport_dirs_reject_unsafe_root_and_redact_debug() {
        let profile = ProfileName::new("alice").expect("profile");
        assert_eq!(
            arti_adapter_spike::ProfileScopedTransportDirs::from_app_data_root(
                "relative-root",
                &profile
            ),
            Err(arti_adapter_spike::ArtiConfigError::RelativeDirectory)
        );

        let root = unique_transport_test_root("profile-transport-redacted");
        let dirs =
            arti_adapter_spike::ProfileScopedTransportDirs::from_app_data_root(&root, &profile)
                .expect("profile scoped dirs");
        let rendered = format!("{dirs:?}");

        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains("alice"));
        assert!(!rendered.contains(root.to_string_lossy().as_ref()));
        assert!(!rendered.contains("arti-state"));
        assert!(!rendered.contains("arti-cache"));
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn arti_bootstrap_preflight_boundary_disables_runtime_network_by_default() {
        assert_eq!(
            arti_adapter_spike::bootstrap_preflight_boundary(),
            arti_adapter_spike::ArtiBootstrapPreflight {
                bootstrap_policy:
                    arti_adapter_spike::ArtiBootstrapPolicy::DisabledUntilPreflightIsImplemented,
                onion_service_policy:
                    arti_adapter_spike::ArtiOnionServicePolicy::DisabledUntilKeyLifecycleDecision,
                bridge_policy: arti_adapter_spike::ArtiBridgePolicy::UnsupportedInCurrentSpike,
                require_log_redaction: true,
                allow_runtime_network: false,
                allow_onion_key_generation: false,
            }
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn bounded_arti_bootstrap_adapter_spike_binds_runtime_policy_without_opening_network() {
        let root = unique_transport_test_root("bounded-arti-bootstrap");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let skeleton = TransportBootstrapExecutionSkeleton::new(
            TransportRuntimeReady,
            TransportBootstrapPolicy::high_risk_default(),
        );
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs.clone(),
                skeleton,
            )
            .expect("bounded adapter");

        assert_eq!(adapter.dirs(), &dirs);
        assert_eq!(adapter.skeleton().runtime_ready(), TransportRuntimeReady);
        assert_eq!(
            adapter.skeleton().policy(),
            TransportBootstrapPolicy::high_risk_default()
        );
        assert!(format!("{:?}", adapter.config()).contains("TorClientConfig"));
        assert_eq!(
            adapter.transport().policy().mode(),
            TransportMode::HighRiskOnionOnly
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn bounded_arti_bootstrap_adapter_spike_fails_closed_and_records_redacted_event() {
        let root = unique_transport_test_root("bounded-arti-fail-closed");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            adapter.execute_fail_closed(TransportBootstrapOutcome::TimedOut, &mut sink),
            Err(TransportRuntimeError::BootstrapTimeout)
        );
        assert_eq!(sink.events().len(), 1);
        assert_eq!(
            sink.events()[0].kind(),
            TransportRuntimeEventKind::BootstrapFailed
        );
        assert_eq!(
            sink.events()[0].runtime_error(),
            Some(TransportRuntimeError::BootstrapTimeout)
        );
        assert_redacted_event_hides(
            &sink.events()[0],
            &[".onion", "Library/Application Support", "arti-state"],
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn bounded_arti_bootstrap_adapter_spike_keeps_envelope_transport_unavailable() {
        let root = unique_transport_test_root("bounded-arti-envelope");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let onion = TransportRoute::onion("example.onion").expect("onion route");
        let envelope = sample_envelope();

        assert_eq!(
            adapter.transport().send_envelope(TransportSendRequest {
                route: &onion,
                envelope: &envelope,
            }),
            Err(TransportError::Unavailable)
        );
        assert_eq!(
            adapter
                .transport()
                .receive_envelopes(TransportReceiveRequest { route: &onion }),
            Err(TransportError::Unavailable)
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn persistent_arti_client_owner_starts_unbootstrapped_without_network() {
        let root = unique_transport_test_root("persistent-arti-owner");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);

        assert_eq!(
            owner.state(),
            arti_adapter_spike::PersistentArtiClientLifecycleState::Unbootstrapped
        );
        assert_eq!(
            owner.summary().state(),
            arti_adapter_spike::PersistentArtiClientLifecycleState::Unbootstrapped
        );
        assert!(!owner.summary().client_owned());
        assert_eq!(
            owner.summary().timeout_seconds(),
            TransportBootstrapPolicy::high_risk_default()
                .timeout()
                .seconds()
        );
        assert_eq!(
            owner.adapter().transport().policy().mode(),
            TransportMode::HighRiskOnionOnly
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn persistent_arti_client_owner_redacts_debug_and_shutdown_drops_client_slot() {
        let root = unique_transport_test_root("persistent-arti-redacted");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let mut owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        owner.shutdown(&mut sink);

        assert_eq!(
            owner.state(),
            arti_adapter_spike::PersistentArtiClientLifecycleState::Shutdown
        );
        assert!(!owner.summary().client_owned());
        assert_eq!(sink.events().len(), 1);
        assert_eq!(
            sink.events()[0].kind(),
            TransportRuntimeEventKind::RuntimeLifecycleChanged
        );

        let rendered = format!("{owner:?}");
        assert!(rendered.contains("Shutdown"));
        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains(root.to_string_lossy().as_ref()));
        assert!(!rendered.contains("arti-state"));
        assert!(!rendered.contains("arti-cache"));
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn persistent_arti_client_owner_can_enter_dormant_before_network_execution() {
        let root = unique_transport_test_root("persistent-arti-dormant");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let mut owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        owner.mark_dormant(&mut sink).expect("mark dormant");

        assert_eq!(
            owner.state(),
            arti_adapter_spike::PersistentArtiClientLifecycleState::Dormant
        );
        assert!(!owner.summary().client_owned());
        assert_eq!(
            sink.events()[0].kind(),
            TransportRuntimeEventKind::RuntimeLifecycleChanged
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn onion_service_launch_adapter_rejects_non_bootstrapped_owner() {
        let root = unique_transport_test_root("onion-launch-rejects-unbootstrapped");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);

        assert_eq!(
            arti_adapter_spike::OnionServiceLaunchAdapterSkeleton::from_ready_owner(
                OnionServiceLaunchReady,
                &ready_onion_service_key_material(),
                &owner,
            ),
            Err(
                arti_adapter_spike::OnionServiceLaunchAdapterError::PersistentClientNotBootstrapped
            )
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn onion_service_launch_adapter_fails_closed_without_hosting_or_sensitive_output() {
        let root = unique_transport_test_root("onion-launch-adapter-fail-closed");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let mut owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);
        let mut sink = InMemoryTransportRuntimeEventSink::default();
        owner.mark_bootstrapped_for_adapter_test(&mut sink);
        let launch_adapter =
            arti_adapter_spike::OnionServiceLaunchAdapterSkeleton::from_ready_owner(
                OnionServiceLaunchReady,
                &ready_onion_service_key_material(),
                &owner,
            )
            .expect("launch adapter");

        assert_eq!(
            launch_adapter.owner_summary().state(),
            arti_adapter_spike::PersistentArtiClientLifecycleState::Bootstrapped
        );
        assert!(launch_adapter.owner_summary().client_owned());
        assert_eq!(
            launch_adapter.launch_fail_closed(&mut sink),
            Err(arti_adapter_spike::OnionServiceLaunchAdapterError::OnionHostingNotImplemented)
        );
        assert_eq!(
            sink.events().last().expect("event").kind(),
            TransportRuntimeEventKind::RuntimePreflightFailed
        );
        assert_eq!(
            sink.events().last().expect("event").runtime_error(),
            Some(TransportRuntimeError::OnionServiceLaunchFailed)
        );

        let rendered = format!("{launch_adapter:?}");
        assert!(rendered.contains("OnionServiceLaunchAdapterSkeleton"));
        assert!(rendered.contains("<redacted>"));
        assert!(rendered.contains("<not-created>"));
        assert!(!rendered.contains(root.to_string_lossy().as_ref()));
        assert!(!rendered.contains("arti-state"));
        assert!(!rendered.contains("arti-cache"));
        assert!(!rendered.contains(".onion"));
        assert_redacted_event_hides(
            sink.events().last().expect("event"),
            &["example.onion", "alice", "bob", "private-key", "descriptor"],
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn onion_service_launch_adapter_exposes_descriptor_publication_boundary() {
        let root = unique_transport_test_root("onion-descriptor-boundary");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let mut owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);
        let mut sink = InMemoryTransportRuntimeEventSink::default();
        owner.mark_bootstrapped_for_adapter_test(&mut sink);
        let launch_adapter =
            arti_adapter_spike::OnionServiceLaunchAdapterSkeleton::from_ready_owner(
                OnionServiceLaunchReady,
                &ready_onion_service_key_material(),
                &owner,
            )
            .expect("launch adapter");

        assert_eq!(
            launch_adapter.descriptor_publication_boundary(OnionEndpointPublicationPolicy::Missing),
            Err(OnionServiceDescriptorPublicationError::EndpointPublicationPolicyMissing)
        );

        let boundary = launch_adapter
            .descriptor_publication_boundary(OnionEndpointPublicationPolicy::PairwiseRendezvousOnly)
            .expect("descriptor publication boundary");
        assert_eq!(
            boundary.publish_fail_closed(&mut sink),
            Err(OnionServiceDescriptorPublicationError::DescriptorPublicationNotImplemented)
        );
        assert_eq!(
            sink.events().last().expect("event").runtime_error(),
            Some(TransportRuntimeError::OnionServiceLaunchFailed)
        );
        assert_redacted_event_hides(
            sink.events().last().expect("event"),
            &["example.onion", "alice", "bob", "private-key", "descriptor"],
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn onion_service_launch_adapter_exposes_inbound_stream_boundary() {
        let root = unique_transport_test_root("onion-inbound-stream-boundary");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let mut owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);
        let mut sink = InMemoryTransportRuntimeEventSink::default();
        owner.mark_bootstrapped_for_adapter_test(&mut sink);
        let launch_adapter =
            arti_adapter_spike::OnionServiceLaunchAdapterSkeleton::from_ready_owner(
                OnionServiceLaunchReady,
                &ready_onion_service_key_material(),
                &owner,
            )
            .expect("launch adapter");
        let inbound =
            launch_adapter.inbound_stream_boundary(OnionServiceDescriptorPublicationReady);

        assert_eq!(
            inbound.accept_fail_closed(&mut sink),
            Err(OnionInboundStreamError::InboundAcceptNotImplemented)
        );
        assert_eq!(
            sink.events().last().expect("event").runtime_error(),
            Some(TransportRuntimeError::ReceiveFailed)
        );
        assert_redacted_event_hides(
            sink.events().last().expect("event"),
            &["example.onion", "alice", "bob", "stream-1", "descriptor"],
        );
    }

    #[cfg(feature = "arti-adapter-spike")]
    #[test]
    fn onion_service_launch_adapter_exposes_outbound_stream_boundary() {
        let root = unique_transport_test_root("onion-outbound-stream-boundary");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let mut owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);
        let mut sink = InMemoryTransportRuntimeEventSink::default();
        owner.mark_bootstrapped_for_adapter_test(&mut sink);
        let launch_adapter =
            arti_adapter_spike::OnionServiceLaunchAdapterSkeleton::from_ready_owner(
                OnionServiceLaunchReady,
                &ready_onion_service_key_material(),
                &owner,
            )
            .expect("launch adapter");
        let outbound = launch_adapter
            .outbound_stream_boundary(
                sample_pairwise_endpoint(),
                TransportPolicy::high_risk_default(),
            )
            .expect("outbound boundary");

        assert_eq!(
            outbound.dial_fail_closed(&mut sink),
            Err(OnionOutboundStreamError::OutboundDialNotImplemented)
        );
        assert_eq!(
            sink.events().last().expect("event").runtime_error(),
            Some(TransportRuntimeError::SendFailed)
        );
        assert_redacted_event_hides(
            sink.events().last().expect("event"),
            &["example.onion", "alice", "bob", "stream-1", "descriptor"],
        );
    }

    #[cfg(feature = "arti-manual-bootstrap")]
    #[test]
    fn manual_arti_bootstrap_attempt_gate_is_disabled_by_default() {
        let root = unique_transport_test_root("manual-arti-disabled");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let gate = arti_adapter_spike::ManualArtiBootstrapAttemptGate::disabled(adapter);

        assert_eq!(
            gate.summary().network_permission(),
            arti_adapter_spike::ManualArtiBootstrapNetworkPermission::Disabled
        );
        assert_eq!(
            gate.summary().timeout_seconds(),
            TransportBootstrapPolicy::high_risk_default()
                .timeout()
                .seconds()
        );
    }

    #[cfg(feature = "arti-manual-bootstrap")]
    #[test]
    fn manual_arti_bootstrap_attempt_gate_can_be_explicitly_enabled_without_bootstrapping() {
        let root = unique_transport_test_root("manual-arti-enabled");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let gate =
            arti_adapter_spike::ManualArtiBootstrapAttemptGate::explicitly_enabled_for_manual_spike(
                adapter,
            );

        assert_eq!(
            gate.summary().network_permission(),
            arti_adapter_spike::ManualArtiBootstrapNetworkPermission::ExplicitlyEnabledForManualSpike
        );
        assert_eq!(
            gate.adapter().transport().policy().mode(),
            TransportMode::HighRiskOnionOnly
        );
    }

    #[cfg(feature = "arti-manual-bootstrap")]
    #[tokio::test]
    async fn manual_arti_bootstrap_attempt_gate_fails_closed_when_disabled() {
        let root = unique_transport_test_root("manual-arti-fail-closed");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let gate = arti_adapter_spike::ManualArtiBootstrapAttemptGate::disabled(adapter);
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            gate.bootstrap_once_and_drop_client(&mut sink).await,
            Err(TransportRuntimeError::RuntimeNetworkDisabled)
        );
        assert_eq!(sink.events().len(), 1);
        assert_eq!(
            sink.events()[0].kind(),
            TransportRuntimeEventKind::BootstrapFailed
        );
        assert_eq!(
            sink.events()[0].runtime_error(),
            Some(TransportRuntimeError::RuntimeNetworkDisabled)
        );
    }

    #[cfg(feature = "arti-manual-bootstrap")]
    #[tokio::test]
    async fn persistent_arti_client_owner_fails_closed_when_manual_network_disabled() {
        let root = unique_transport_test_root("persistent-arti-manual-disabled");
        let dirs = arti_adapter_spike::ArtiAppPrivateDirs::new(
            root.join("arti-state"),
            root.join("arti-cache"),
        )
        .expect("app private dirs");
        let adapter =
            arti_adapter_spike::BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(
                dirs,
                TransportBootstrapExecutionSkeleton::new(
                    TransportRuntimeReady,
                    TransportBootstrapPolicy::high_risk_default(),
                ),
            )
            .expect("bounded adapter");
        let mut owner = arti_adapter_spike::PersistentArtiClientOwner::new_unbootstrapped(adapter);
        let mut sink = InMemoryTransportRuntimeEventSink::default();

        assert_eq!(
            owner
                .bootstrap_and_keep_client(
                    arti_adapter_spike::ManualArtiBootstrapNetworkPermission::Disabled,
                    &mut sink,
                )
                .await,
            Err(arti_adapter_spike::PersistentArtiClientLifecycleError::RuntimeNetworkDisabled)
        );
        assert_eq!(
            owner.state(),
            arti_adapter_spike::PersistentArtiClientLifecycleState::Unbootstrapped
        );
        assert!(!owner.summary().client_owned());
        assert_eq!(
            sink.events()[0].runtime_error(),
            Some(TransportRuntimeError::RuntimeNetworkDisabled)
        );
    }
}
