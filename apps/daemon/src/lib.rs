#![forbid(unsafe_code)]

pub mod attachment;
pub mod bridge;
pub mod bridge_http;
pub mod cli;
pub mod contacts;
pub mod delivery;
pub mod device;
pub mod device_link;
pub mod identity;
pub mod mls_provider;
pub mod mls_session;
pub mod mls_storage;
pub mod mls_storage_provider;
pub mod model;
pub mod pairing;
pub mod protocol_gate;
pub mod relay_http;
pub mod storage;
pub mod storage_os;
pub mod trust;

/// This crate owns the daemon product boundary. The typed domain model is
/// authoritative for storage, protocol, delivery, and UI contracts. The
/// high-risk release gate remains closed until implementation, independent
/// review, and release evidence requirements are complete.
pub const PRODUCT_ROLE: &str = "local-security-daemon";
pub const IMPLEMENTATION_STATUS: &str = "daemon-owned-openmls-messaging-path-active-development";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Command {
    Doctor,
    Init,
    Serve,
    Identity,
    Device,
    Keychain,
    Lock,
    Recovery,
    Status,
    Stop,
    Wipe,
    VerifyClientRelease,
}

impl Command {
    pub const ALL: [Self; 12] = [
        Self::Doctor,
        Self::Init,
        Self::Serve,
        Self::Identity,
        Self::Device,
        Self::Keychain,
        Self::Lock,
        Self::Recovery,
        Self::Status,
        Self::Stop,
        Self::Wipe,
        Self::VerifyClientRelease,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Doctor => "doctor",
            Self::Init => "init",
            Self::Serve => "serve",
            Self::Identity => "identity",
            Self::Device => "device",
            Self::Keychain => "keychain",
            Self::Lock => "lock",
            Self::Recovery => "recovery",
            Self::Status => "status",
            Self::Stop => "stop",
            Self::Wipe => "wipe",
            Self::VerifyClientRelease => "verify-client-release",
        }
    }
}

pub fn command_from_name(value: &str) -> Option<Command> {
    Command::ALL
        .into_iter()
        .find(|command| command.as_str() == value)
}

#[cfg(test)]
mod tests {
    use super::{command_from_name, Command, IMPLEMENTATION_STATUS, PRODUCT_ROLE};

    #[test]
    fn boundary_exposes_only_planned_commands() {
        assert_eq!(PRODUCT_ROLE, "local-security-daemon");
        assert_eq!(
            IMPLEMENTATION_STATUS,
            "daemon-owned-openmls-messaging-path-active-development"
        );
        assert_eq!(Command::ALL.len(), 12);
        assert_eq!(command_from_name("serve"), Some(Command::Serve));
        assert_eq!(command_from_name("keychain"), Some(Command::Keychain));
        assert_eq!(command_from_name("desktop"), None);
    }
}
