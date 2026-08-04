//! Admission boundary for the future daemon-owned 1:1 protocol.
//! This module deliberately does not implement cryptography or a session.

pub const DAEMON_PROTOCOL: &str = "openmls-1";

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SessionAdmission {
    pub peer_account_id: String,
    pub peer_device_id: String,
    pub protocol: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AdmissionError {
    EmptyPeerIdentity,
    UnsupportedProtocol,
    ImplementationNotAvailable,
}

pub fn admit(
    peer_account_id: &str,
    peer_device_id: &str,
    protocol: &str,
) -> Result<SessionAdmission, AdmissionError> {
    if peer_account_id.is_empty() || peer_device_id.is_empty() {
        return Err(AdmissionError::EmptyPeerIdentity);
    }
    if protocol != DAEMON_PROTOCOL {
        return Err(AdmissionError::UnsupportedProtocol);
    }
    // The implementation gate remains closed until a vetted, pinned dependency
    // and persistence/test-vector review are present in this workspace.
    Err(AdmissionError::ImplementationNotAvailable)
}

#[cfg(test)]
mod tests {
    use super::{admit, AdmissionError, DAEMON_PROTOCOL};

    #[test]
    fn legacy_browser_protocols_never_enter_daemon_admission() {
        assert_eq!(
            admit("ad1pkpeer", "device-1", "Olm.v2"),
            Err(AdmissionError::UnsupportedProtocol)
        );
        assert_eq!(
            admit("ad1pkpeer", "device-1", "ADENVWEB3"),
            Err(AdmissionError::UnsupportedProtocol)
        );
    }

    #[test]
    fn selected_protocol_stays_closed_until_vetted_implementation_exists() {
        assert_eq!(
            admit("ad1pkpeer", "device-1", DAEMON_PROTOCOL),
            Err(AdmissionError::ImplementationNotAvailable)
        );
        assert_eq!(
            admit("", "device-1", DAEMON_PROTOCOL),
            Err(AdmissionError::EmptyPeerIdentity)
        );
    }
}
