mod arti_lifecycle;
mod bootstrap;
#[cfg(feature = "dev-insecure")]
pub mod dev_insecure;
mod endpoint_state;
mod errors;
mod hosting_phase;
mod key_material;
mod launch_descriptor;
mod onion_stream_boundary;
mod pre_network;
mod runtime_events;
mod runtime_preflight;
mod stream_gate;
mod stream_session;
mod transport_policy;

pub use arti_lifecycle::{arti_lifecycle_decision, ArtiLifecycleDecision};
pub use bootstrap::{
    TransportBootstrapExecutionSkeleton, TransportBootstrapOutcome, TransportBootstrapPolicy,
    TransportBootstrapPolicyError, TransportBootstrapRetryPolicy, TransportBootstrapTimeoutPolicy,
};
pub use endpoint_state::{
    EncryptedEndpointUpdateControlEnvelope, EndpointRotationApplyContext,
    EndpointRotationReconnectIntent, EndpointRotationSequence, EndpointUpdateChannel,
    EndpointUpdateControlPlaintext, OnionServiceEndpoint, PairwiseEndpointRotationState,
    PairwiseEndpointUpdate, PairwiseRendezvousEndpoint, PendingEndpointRotation,
    RendezvousEndpointIdentityBinding, RendezvousEndpointScope,
};
pub use errors::{
    BootstrapOnlyExperimentDecisionError, BridgeCensorshipConfigurationError,
    DescriptorPublicationAdapterError, DescriptorPublicationGateError,
    DescriptorPublicationPreparationError, EndpointLifecycleError, EnvelopeIoAdapterError,
    InboundStreamAdapterError, InboundStreamGateError, InboundStreamPreparationError,
    NetworkExperimentGateError, OnionHostingGateError, OnionInboundStreamError,
    OnionOutboundStreamError, OnionServiceDescriptorPublicationError,
    OnionServiceKeyLifecycleError, OnionServiceKeyMaterialError, OnionServiceLaunchPreflightError,
    OutboundStreamAdapterError, OutboundStreamGateError, PostAuthStreamReadinessOrderingError,
    RemotePeerAuthenticationError, StreamAdapterCloseoutError, StreamCloseoutIntegrationError,
    StreamSessionBindingError, TransportBackupExclusionError, TransportError,
    TransportPhaseCloseoutError, TransportRuntimeError, TransportRuntimeProbeError,
};
pub use hosting_phase::{
    BootstrapOnlyExperimentDecision, BootstrapOnlyExperimentExpansion,
    BootstrapOnlyExperimentFeatureState, BootstrapOnlyExperimentReady,
    NetworkExperimentGateProposal, NetworkExperimentGateReady, NetworkExperimentManualGate,
    NetworkExperimentOperatorConsent, NetworkExperimentScope, NetworkExperimentTargetCachePolicy,
    NetworkExperimentVerificationPolicy, OnionHostingGateDecision, OnionHostingGateFeatureState,
    OnionHostingGateReady, TransportNextRiskBoundary, TransportPhaseCloseoutDecision,
    TransportPhaseCloseoutReady,
};
#[cfg(feature = "arti-adapter-spike")]
pub mod arti_adapter_spike;
pub use key_material::{
    OnionServiceKeyDeletionPolicy, OnionServiceKeyGenerationPolicy,
    OnionServiceKeyLifecycleDecision, OnionServiceKeyLifecycleReady,
    OnionServiceKeyMaterialDecision, OnionServiceKeyMaterialReady, OnionServiceKeyMaterialState,
    OnionServiceKeyMigrationPolicy, OnionServiceKeyPolicy, OnionServiceKeyRecordId,
    OnionServiceKeyRotationPolicy, OnionServiceKeyStoragePolicy, ProfileTransportUnlockReady,
};
pub use launch_descriptor::{
    DescriptorPublicationAttemptIntent, DescriptorPublicationFailClosedAdapter,
    DescriptorPublicationGateDecision, DescriptorPublicationGateReady,
    DescriptorPublicationPreparationBoundary, DescriptorPublicationPreparationReady,
    OnionEndpointPublicationPolicy, OnionEndpointUpdatePolicy,
    OnionServiceDescriptorPublicationBoundary, OnionServiceDescriptorPublicationReady,
    OnionServiceLaunchPreflight, OnionServiceLaunchReady, RedactedDescriptorPublicationContext,
};
pub use onion_stream_boundary::{OnionInboundStreamBoundary, OnionOutboundStreamBoundary};
pub use pre_network::{
    TransportNextPhase, TransportPreNetworkBlocker, TransportPreNetworkCloseout,
};
pub use runtime_events::{
    InMemoryTransportRuntimeEventSink, NoopTransportRuntimeEventSink,
    RedactedTransportRuntimeEvent, TransportRuntimeEventKind, TransportRuntimeEventSink,
    TransportTransferDirection,
};
pub use runtime_preflight::{
    probe_app_private_state_cache_dirs, verify_transport_backup_exclusion,
    BridgeCensorshipConfiguration, BridgeCensorshipReady, BridgeRequirement,
    TransportBackupExclusionVerification, TransportCensorshipReadiness,
    TransportCrashRedactionPolicy, TransportLogRedactionPolicy,
    TransportRuntimePermissionPreflight, TransportRuntimePreflight, TransportRuntimeReady,
    TransportRuntimeState, TransportStateCacheDirsReady,
};
pub use stream_gate::{
    InboundStreamAcceptIntent, InboundStreamFailClosedAdapter, InboundStreamGateDecision,
    InboundStreamGateReady, InboundStreamPreparationBoundary, InboundStreamPreparationReady,
    InboundStreamReadWriteIntent, OutboundStreamDialIntent, OutboundStreamFailClosedAdapter,
    OutboundStreamGateDecision, OutboundStreamGateReady, OutboundStreamSendIntent,
};
pub use stream_session::{
    BoundInboundStreamSession, BoundOutboundStreamSession, EnvelopeIoAdapterReady,
    InboundEnvelopeIoAdapterBoundary, OutboundEnvelopeIoAdapterBoundary,
    PairwiseStreamSessionBinding, PostAuthInboundStreamReadinessOrder,
    PostAuthOutboundStreamReadinessOrder, RemotePeerAuthenticationContext,
    RemotePeerAuthenticationReady, StreamAdapterCloseoutDecision, StreamAdapterCloseoutIntent,
    StreamAdapterCloseoutReady, StreamCloseoutIntegrationOrder, StreamSessionVerificationContext,
};
pub(crate) use transport_policy::is_safe_endpoint_token;
pub use transport_policy::{
    DirectPeerEndpoint, EnvelopeTransport, LocalTransportEndpoint, OnionEnvelopeTransport,
    Transport, TransportKind, TransportMode, TransportPolicy, TransportReceiveRequest,
    TransportRoute, TransportSendRequest,
};

#[cfg(test)]
mod tests;
