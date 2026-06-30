use another_dimension_identity::ProfileName;
use another_dimension_protocol::Envelope;
use another_dimension_storage::{dev_insecure::DevFileStore, StorageError};

use crate::{Transport, TransportError};

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
