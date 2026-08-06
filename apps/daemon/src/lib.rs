#![forbid(unsafe_code)]

pub mod attachment;
pub mod bridge;
pub mod bridge_http;
pub mod cli;
pub mod contacts;
pub mod delivery;
pub mod device;
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
pub mod trust;

/// This crate owns the daemon product boundary. The typed domain model is
/// authoritative for future storage, protocol, delivery, and UI contracts;
/// the implementation gate remains closed until those slices are complete.
pub const PRODUCT_ROLE: &str = "local-security-daemon";
pub const IMPLEMENTATION_STATUS: &str = "daemon-owned-openmls-messaging-path-active-development";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Command {
    Doctor,
    Init,
    Serve,
    Identity,
    Invite,
    Contact,
    Device,
    Lock,
    Recovery,
    Status,
    Stop,
    Wipe,
}

impl Command {
    pub const ALL: [Self; 12] = [
        Self::Doctor,
        Self::Init,
        Self::Serve,
        Self::Identity,
        Self::Invite,
        Self::Contact,
        Self::Device,
        Self::Lock,
        Self::Recovery,
        Self::Status,
        Self::Stop,
        Self::Wipe,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Doctor => "doctor",
            Self::Init => "init",
            Self::Serve => "serve",
            Self::Identity => "identity",
            Self::Invite => "invite",
            Self::Contact => "contact",
            Self::Device => "device",
            Self::Lock => "lock",
            Self::Recovery => "recovery",
            Self::Status => "status",
            Self::Stop => "stop",
            Self::Wipe => "wipe",
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
        assert_eq!(command_from_name("desktop"), None);
    }
}
