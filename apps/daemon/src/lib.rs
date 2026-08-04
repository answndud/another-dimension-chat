#![forbid(unsafe_code)]

pub mod bridge;
pub mod bridge_http;
pub mod cli;
pub mod identity;
pub mod mls_provider;
pub mod mls_storage;
pub mod protocol_gate;
pub mod storage;
pub mod trust;

/// This crate is the only planned owner of the future local security-daemon
/// command boundary. Identity and encrypted-store boundaries exist here; the
/// The local HTTP bridge is intentionally limited to session/status/lock; the
/// message protocol, relay, and OS keychain integrations remain absent.
pub const PRODUCT_ROLE: &str = "local-security-daemon";
pub const IMPLEMENTATION_STATUS: &str = "boundary-only-not-high-risk-ready";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Command {
    Doctor,
    Init,
    Serve,
    Identity,
    Invite,
    Device,
    Lock,
    Recovery,
}

impl Command {
    pub const ALL: [Self; 8] = [
        Self::Doctor,
        Self::Init,
        Self::Serve,
        Self::Identity,
        Self::Invite,
        Self::Device,
        Self::Lock,
        Self::Recovery,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Doctor => "doctor",
            Self::Init => "init",
            Self::Serve => "serve",
            Self::Identity => "identity",
            Self::Invite => "invite",
            Self::Device => "device",
            Self::Lock => "lock",
            Self::Recovery => "recovery",
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
        assert_eq!(IMPLEMENTATION_STATUS, "boundary-only-not-high-risk-ready");
        assert_eq!(Command::ALL.len(), 8);
        assert_eq!(command_from_name("serve"), Some(Command::Serve));
        assert_eq!(command_from_name("desktop"), None);
    }
}
