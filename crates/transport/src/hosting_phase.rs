use crate::{
    BootstrapOnlyExperimentDecisionError, NetworkExperimentGateError, OnionHostingGateError,
    OnionServiceKeyMaterialReady, OnionServiceLaunchReady, TransportPhaseCloseoutError,
    TransportPreNetworkCloseout,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NetworkExperimentScope {
    BootstrapOnly,
    OnionHosting,
    StreamIo,
    EnvelopeIo,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NetworkExperimentManualGate {
    Disabled,
    FeatureGatedManualOnly,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NetworkExperimentOperatorConsent {
    Missing,
    ExplicitForLocalManualSpike,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NetworkExperimentVerificationPolicy {
    DefaultLightweightOnly,
    HeavyIsolatedTargetAndManualCiExcluded,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NetworkExperimentTargetCachePolicy {
    SharedProjectTarget,
    IsolatedTemporaryTarget,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BootstrapOnlyExperimentFeatureState {
    NotCompiled,
    ArtiManualBootstrapFeature,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BootstrapOnlyExperimentExpansion {
    ExistingManualBootstrapAndLifecycleOnly,
    NewBootstrapBehavior,
    OnionHosting,
    StreamIo,
    EnvelopeIo,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportNextRiskBoundary {
    OnionHostingGate,
    StreamIo,
    EnvelopeIo,
    UsableMessaging,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionHostingGateFeatureState {
    NotCompiled,
    ArtiAdapterSpikeFeature,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct NetworkExperimentGateReady {
    scope: NetworkExperimentScope,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct NetworkExperimentGateProposal {
    pub(crate) pre_network_closeout_complete: bool,
    pub(crate) scope: NetworkExperimentScope,
    pub(crate) manual_gate: NetworkExperimentManualGate,
    pub(crate) operator_consent: NetworkExperimentOperatorConsent,
    pub(crate) verification_policy: NetworkExperimentVerificationPolicy,
    pub(crate) target_cache_policy: NetworkExperimentTargetCachePolicy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BootstrapOnlyExperimentReady {
    expansion: BootstrapOnlyExperimentExpansion,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BootstrapOnlyExperimentDecision {
    pub(crate) gate_ready: Option<NetworkExperimentGateReady>,
    pub(crate) feature_state: BootstrapOnlyExperimentFeatureState,
    pub(crate) expansion: BootstrapOnlyExperimentExpansion,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportPhaseCloseoutReady {
    next_boundary: TransportNextRiskBoundary,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportPhaseCloseoutDecision {
    pub(crate) bootstrap_only_ready: Option<BootstrapOnlyExperimentReady>,
    pub(crate) next_boundary: TransportNextRiskBoundary,
    pub(crate) usable_messaging_claimed: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionHostingGateReady;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionHostingGateDecision {
    pub(crate) transport_phase_closeout_ready: Option<TransportPhaseCloseoutReady>,
    pub(crate) manual_gate: NetworkExperimentManualGate,
    pub(crate) feature_state: OnionHostingGateFeatureState,
    pub(crate) launch_preflight_ready: bool,
    pub(crate) onion_service_key_ready: bool,
    pub(crate) bootstrapped_persistent_client_ready: bool,
    pub(crate) descriptor_publication_enabled: bool,
    pub(crate) stream_io_enabled: bool,
    pub(crate) usable_messaging_claimed: bool,
}

impl NetworkExperimentGateProposal {
    pub fn locked_down(scope: NetworkExperimentScope) -> Self {
        Self {
            pre_network_closeout_complete: false,
            scope,
            manual_gate: NetworkExperimentManualGate::Disabled,
            operator_consent: NetworkExperimentOperatorConsent::Missing,
            verification_policy: NetworkExperimentVerificationPolicy::DefaultLightweightOnly,
            target_cache_policy: NetworkExperimentTargetCachePolicy::SharedProjectTarget,
        }
    }

    pub fn bootstrap_only_manual_spike(
        closeout: &TransportPreNetworkCloseout,
        operator_consent: NetworkExperimentOperatorConsent,
        verification_policy: NetworkExperimentVerificationPolicy,
        target_cache_policy: NetworkExperimentTargetCachePolicy,
    ) -> Self {
        Self {
            pre_network_closeout_complete: closeout.network_execution_allowed(),
            scope: NetworkExperimentScope::BootstrapOnly,
            manual_gate: NetworkExperimentManualGate::FeatureGatedManualOnly,
            operator_consent,
            verification_policy,
            target_cache_policy,
        }
    }

    pub fn check(self) -> Result<NetworkExperimentGateReady, NetworkExperimentGateError> {
        if !self.pre_network_closeout_complete {
            return Err(NetworkExperimentGateError::PreNetworkCloseoutRequired);
        }
        if self.scope != NetworkExperimentScope::BootstrapOnly {
            return Err(NetworkExperimentGateError::UnsupportedExperimentScope);
        }
        if self.manual_gate != NetworkExperimentManualGate::FeatureGatedManualOnly {
            return Err(NetworkExperimentGateError::ManualFeatureGateRequired);
        }
        if self.operator_consent != NetworkExperimentOperatorConsent::ExplicitForLocalManualSpike {
            return Err(NetworkExperimentGateError::ExplicitOperatorConsentRequired);
        }
        if self.verification_policy
            != NetworkExperimentVerificationPolicy::HeavyIsolatedTargetAndManualCiExcluded
        {
            return Err(NetworkExperimentGateError::HeavyVerificationPolicyRequired);
        }
        if self.target_cache_policy != NetworkExperimentTargetCachePolicy::IsolatedTemporaryTarget {
            return Err(NetworkExperimentGateError::TargetCacheIsolationRequired);
        }

        Ok(NetworkExperimentGateReady { scope: self.scope })
    }
}

impl NetworkExperimentGateReady {
    pub fn scope(self) -> NetworkExperimentScope {
        self.scope
    }
}

impl BootstrapOnlyExperimentDecision {
    pub fn locked_down() -> Self {
        Self {
            gate_ready: None,
            feature_state: BootstrapOnlyExperimentFeatureState::NotCompiled,
            expansion: BootstrapOnlyExperimentExpansion::NewBootstrapBehavior,
        }
    }

    pub fn existing_manual_bootstrap_only(
        gate_ready: NetworkExperimentGateReady,
        feature_state: BootstrapOnlyExperimentFeatureState,
    ) -> Self {
        Self {
            gate_ready: Some(gate_ready),
            feature_state,
            expansion: BootstrapOnlyExperimentExpansion::ExistingManualBootstrapAndLifecycleOnly,
        }
    }

    pub fn check(
        self,
    ) -> Result<BootstrapOnlyExperimentReady, BootstrapOnlyExperimentDecisionError> {
        if self.gate_ready.is_none() {
            return Err(BootstrapOnlyExperimentDecisionError::NetworkExperimentGateRequired);
        }
        if self.feature_state != BootstrapOnlyExperimentFeatureState::ArtiManualBootstrapFeature {
            return Err(BootstrapOnlyExperimentDecisionError::ManualBootstrapFeatureRequired);
        }
        if self.expansion
            != BootstrapOnlyExperimentExpansion::ExistingManualBootstrapAndLifecycleOnly
        {
            return Err(BootstrapOnlyExperimentDecisionError::UnsupportedBootstrapExpansion);
        }

        Ok(BootstrapOnlyExperimentReady {
            expansion: self.expansion,
        })
    }
}

impl BootstrapOnlyExperimentReady {
    pub fn expansion(self) -> BootstrapOnlyExperimentExpansion {
        self.expansion
    }
}

impl TransportPhaseCloseoutDecision {
    pub fn locked_down(next_boundary: TransportNextRiskBoundary) -> Self {
        Self {
            bootstrap_only_ready: None,
            next_boundary,
            usable_messaging_claimed: false,
        }
    }

    pub fn select_onion_hosting_gate(bootstrap_only_ready: BootstrapOnlyExperimentReady) -> Self {
        Self {
            bootstrap_only_ready: Some(bootstrap_only_ready),
            next_boundary: TransportNextRiskBoundary::OnionHostingGate,
            usable_messaging_claimed: false,
        }
    }

    pub fn check(self) -> Result<TransportPhaseCloseoutReady, TransportPhaseCloseoutError> {
        if self.bootstrap_only_ready.is_none() {
            return Err(TransportPhaseCloseoutError::BootstrapOnlyDecisionRequired);
        }
        if self.usable_messaging_claimed {
            return Err(TransportPhaseCloseoutError::UsableMessagingClaimForbidden);
        }
        if self.next_boundary != TransportNextRiskBoundary::OnionHostingGate {
            return Err(TransportPhaseCloseoutError::UnsupportedNextBoundary);
        }

        Ok(TransportPhaseCloseoutReady {
            next_boundary: self.next_boundary,
        })
    }
}

impl TransportPhaseCloseoutReady {
    pub fn next_boundary(self) -> TransportNextRiskBoundary {
        self.next_boundary
    }
}

impl OnionHostingGateDecision {
    pub fn locked_down() -> Self {
        Self {
            transport_phase_closeout_ready: None,
            manual_gate: NetworkExperimentManualGate::Disabled,
            feature_state: OnionHostingGateFeatureState::NotCompiled,
            launch_preflight_ready: false,
            onion_service_key_ready: false,
            bootstrapped_persistent_client_ready: false,
            descriptor_publication_enabled: false,
            stream_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn from_ready_boundaries(
        transport_phase_closeout_ready: TransportPhaseCloseoutReady,
        _launch_ready: OnionServiceLaunchReady,
        _key_material: &OnionServiceKeyMaterialReady,
        manual_gate: NetworkExperimentManualGate,
        feature_state: OnionHostingGateFeatureState,
        bootstrapped_persistent_client_ready: bool,
    ) -> Self {
        Self {
            transport_phase_closeout_ready: Some(transport_phase_closeout_ready),
            manual_gate,
            feature_state,
            launch_preflight_ready: true,
            onion_service_key_ready: true,
            bootstrapped_persistent_client_ready,
            descriptor_publication_enabled: false,
            stream_io_enabled: false,
            usable_messaging_claimed: false,
        }
    }

    pub fn check(self) -> Result<OnionHostingGateReady, OnionHostingGateError> {
        if self.transport_phase_closeout_ready.is_none() {
            return Err(OnionHostingGateError::TransportPhaseCloseoutRequired);
        }
        if self.manual_gate != NetworkExperimentManualGate::FeatureGatedManualOnly {
            return Err(OnionHostingGateError::ManualFeatureGateRequired);
        }
        if self.feature_state != OnionHostingGateFeatureState::ArtiAdapterSpikeFeature {
            return Err(OnionHostingGateError::ArtiAdapterFeatureRequired);
        }
        if !self.launch_preflight_ready {
            return Err(OnionHostingGateError::LaunchPreflightRequired);
        }
        if !self.onion_service_key_ready {
            return Err(OnionHostingGateError::OnionServiceKeyRequired);
        }
        if !self.bootstrapped_persistent_client_ready {
            return Err(OnionHostingGateError::BootstrappedPersistentClientRequired);
        }
        if self.descriptor_publication_enabled {
            return Err(OnionHostingGateError::DescriptorPublicationForbidden);
        }
        if self.stream_io_enabled {
            return Err(OnionHostingGateError::StreamIoForbidden);
        }
        if self.usable_messaging_claimed {
            return Err(OnionHostingGateError::UsableMessagingClaimForbidden);
        }

        Ok(OnionHostingGateReady)
    }
}
