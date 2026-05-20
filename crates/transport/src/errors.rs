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
pub enum StreamCloseoutIntegrationError {
    CloseoutReadyRequired,
    RemotePeerAuthenticationMustFollowCloseout,
    SessionBindingMustFollowRemotePeerAuthentication,
    EnvelopeIoForbidden,
    UsableMessagingClaimForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NetworkExperimentGateError {
    PreNetworkCloseoutRequired,
    ManualFeatureGateRequired,
    ExplicitOperatorConsentRequired,
    HeavyVerificationPolicyRequired,
    TargetCacheIsolationRequired,
    UnsupportedExperimentScope,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BootstrapOnlyExperimentDecisionError {
    NetworkExperimentGateRequired,
    ManualBootstrapFeatureRequired,
    UnsupportedBootstrapExpansion,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportPhaseCloseoutError {
    BootstrapOnlyDecisionRequired,
    UnsupportedNextBoundary,
    UsableMessagingClaimForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionHostingGateError {
    TransportPhaseCloseoutRequired,
    ManualFeatureGateRequired,
    ArtiAdapterFeatureRequired,
    LaunchPreflightRequired,
    OnionServiceKeyRequired,
    BootstrappedPersistentClientRequired,
    DescriptorPublicationForbidden,
    StreamIoForbidden,
    UsableMessagingClaimForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DescriptorPublicationGateError {
    OnionHostingGateRequired,
    PairwisePublicationPolicyRequired,
    RedactedEventPolicyRequired,
    StreamIoForbidden,
    UsableMessagingClaimForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DescriptorPublicationAdapterError {
    DescriptorPublicationGateRequired,
    EndpointPublicationPolicyMismatch,
    DescriptorPublicationNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DescriptorPublicationPreparationError {
    DescriptorPublicationGateRequired,
    DescriptorPublicationAdapterRequired,
    RedactedDescriptorContextRequired,
    RawDescriptorContextForbidden,
    DescriptorBodyForbidden,
    StreamIoForbidden,
    UsableMessagingClaimForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InboundStreamGateError {
    DescriptorPublicationGateRequired,
    DescriptorPublicationAdapterRequired,
    AcceptForbidden,
    ReadWriteForbidden,
    EnvelopeIoForbidden,
    UsableMessagingClaimForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InboundStreamPreparationError {
    InboundStreamGateRequired,
    InboundStreamAdapterRequired,
    AcceptForbidden,
    ReadWriteForbidden,
    EnvelopeIoForbidden,
    UsableMessagingClaimForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InboundStreamAdapterError {
    InboundStreamGateRequired,
    InboundAcceptNotImplemented,
    InboundReadWriteNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OutboundStreamGateError {
    PairwiseEndpointRequired,
    HighRiskOnionPolicyRequired,
    DialForbidden,
    SendForbidden,
    EnvelopeIoForbidden,
    UsableMessagingClaimForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OutboundStreamAdapterError {
    OutboundStreamGateRequired,
    TransportPolicyViolation,
    OutboundDialNotImplemented,
    OutboundSendNotImplemented,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StreamAdapterCloseoutError {
    InboundAdapterRequired,
    OutboundAdapterRequired,
    RemotePeerAuthenticationBoundaryRequired,
    VerifiedPairwiseSessionBoundaryRequired,
    BoundSessionShortcutForbidden,
    EnvelopeIoForbidden,
    UsableMessagingClaimForbidden,
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
