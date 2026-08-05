//! Admission boundary for the daemon-owned 1:1 protocol.
//! This module deliberately does not implement cryptography or a session yet.

pub const DAEMON_PROTOCOL: &str = "openmls-1";
pub const DAEMON_PROTOCOL_VERSION: u16 = 1;
pub const SUPPORTED_PROTOCOLS: [&str; 1] = [DAEMON_PROTOCOL];
pub const MAX_TEXT_BYTES: usize = 64 * 1024;
pub const MAX_ENVELOPE_BYTES: usize = 96 * 1024;
pub const MAX_ATTACHMENT_BYTES: usize = 32 * 1024 * 1024;
pub const MAX_CLOCK_SKEW_SECONDS: u64 = 300;

pub fn supports(protocol: &str) -> bool {
    SUPPORTED_PROTOCOLS.contains(&protocol)
}

pub fn negotiate(peer_version: u16) -> Result<u16, AdmissionError> {
    if peer_version == DAEMON_PROTOCOL_VERSION {
        Ok(DAEMON_PROTOCOL_VERSION)
    } else {
        Err(AdmissionError::UnsupportedVersion)
    }
}

pub fn validate_clock(now: u64, remote: u64) -> Result<(), AdmissionError> {
    if now.abs_diff(remote) <= MAX_CLOCK_SKEW_SECONDS {
        Ok(())
    } else {
        Err(AdmissionError::ClockSkew)
    }
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
    UnsupportedVersion,
    ClockSkew,
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
    use super::{
        admit, negotiate, supports, validate_clock, AdmissionError, DAEMON_PROTOCOL,
        DAEMON_PROTOCOL_VERSION,
    };

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

    #[test]
    fn incompatible_versions_and_clock_skew_fail_closed() {
        assert_eq!(
            negotiate(DAEMON_PROTOCOL_VERSION),
            Ok(DAEMON_PROTOCOL_VERSION)
        );
        assert_eq!(negotiate(2), Err(AdmissionError::UnsupportedVersion));
        assert!(validate_clock(1_000, 1_300).is_ok());
        assert_eq!(validate_clock(1_000, 1_301), Err(AdmissionError::ClockSkew));
        assert_eq!(validate_clock(1_000, 699), Err(AdmissionError::ClockSkew));
    }
}
