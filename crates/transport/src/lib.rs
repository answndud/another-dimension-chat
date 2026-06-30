//! Transport boundary crate.
//!
//! This crate is intentionally a set of fail-closed transport guardrails, not a
//! usable Tor/onion transport implementation. The modules are split by boundary
//! but re-export a compact API at the crate root.

mod onion;
mod runtime;
mod transport_policy;

pub use onion::*;
pub use runtime::*;
pub use transport_policy::*;

pub(crate) use transport_policy::is_safe_endpoint_token;

#[cfg(test)]
mod tests;
