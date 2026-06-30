use crate::{
    BridgeCensorshipReady, OnionServiceKeyLifecycleReady, TransportBackupExclusionVerification,
};

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
