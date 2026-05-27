use another_dimension_identity::ProfileName;
use std::{fmt, path::Path};

use crate::{
    TransportError, TransportKind, TransportRoute, TransportRuntimeError,
    TransportRuntimeProbeError,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportRuntimeEventKind {
    BootstrapFailed,
    BootstrapSucceeded,
    DirectoryProbeFailed,
    RouteRejected,
    RuntimeLifecycleChanged,
    OnionServiceLaunchSucceeded,
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

    pub fn onion_service_launch_succeeded() -> Self {
        Self {
            kind: TransportRuntimeEventKind::OnionServiceLaunchSucceeded,
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
