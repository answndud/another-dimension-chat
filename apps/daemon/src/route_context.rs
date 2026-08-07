use super::{IdentityView, InviteAuthority};
use crate::{
    bridge::LocalBridge, delivery::DeliveryLedger, mls_session::MlsSessionCatalog,
    storage::EncryptedStore,
};
use std::path::Path;

/// Mutable request-scoped access to daemon-owned services. Route modules take
/// this context instead of growing positional argument lists as capabilities
/// are added.
pub(crate) struct RouteContext<'a> {
    pub(crate) bridge: &'a mut LocalBridge,
    pub(crate) now: u64,
    pub(crate) ui_root: Option<&'a Path>,
    pub(crate) identity: Option<&'a IdentityView>,
    pub(crate) invite_authority: Option<&'a mut InviteAuthority>,
    pub(crate) session_catalog: Option<&'a mut MlsSessionCatalog>,
    pub(crate) session_store: Option<&'a mut EncryptedStore>,
    pub(crate) delivery_ledger: Option<&'a mut DeliveryLedger>,
}
