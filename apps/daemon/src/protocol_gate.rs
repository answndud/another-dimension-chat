//! Admission boundary for the daemon-owned 1:1 protocol.
//! This module deliberately does not implement cryptography or a session yet.

pub const DAEMON_PROTOCOL: &str = "openmls-1";
pub const DAEMON_PROTOCOL_VERSION: u16 = 1;
pub const SUPPORTED_PROTOCOLS: [&str; 1] = [DAEMON_PROTOCOL];

pub fn supports(protocol: &str) -> bool {
    SUPPORTED_PROTOCOLS.contains(&protocol)
}

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
    if !supports(protocol) {
        return Err(AdmissionError::UnsupportedProtocol);
    }
    // The implementation gate remains closed until a vetted, pinned dependency
    // and persistence/test-vector review are present in this workspace.
    Err(AdmissionError::ImplementationNotAvailable)
}

#[cfg(test)]
mod tests {
    use super::{admit, supports, AdmissionError, DAEMON_PROTOCOL, DAEMON_PROTOCOL_VERSION};

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
        assert!(supports(DAEMON_PROTOCOL));
        assert!(!supports("Olm.v2"));
        assert_eq!(DAEMON_PROTOCOL_VERSION, 1);
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
