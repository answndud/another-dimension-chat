use super::*;
use crate::bridge::BridgeRequest;

pub(crate) fn authorize_api(
    bridge: &LocalBridge,
    request: &Request<'_>,
    now: u64,
) -> Result<(), Vec<u8>> {
    let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session") else {
        return Err(response(401, "session_invalid", None, None));
    };
    // Chromium and embedded Chromium may omit Origin and Fetch Metadata on a
    // same-origin GET. This exception is read-only: exact Host, HttpOnly
    // session cookie and UI version remain mandatory, responses expose no CORS
    // permission, and every mutation still requires exact Origin plus CSRF.
    let origin = match request.header("origin") {
        Some(origin) => origin,
        None if request.method == "GET" => bridge.ui_origin(),
        None => "",
    };
    let authorization = BridgeRequest {
        origin,
        host: request.header("host").unwrap_or(""),
        method: request.method,
        cookie,
        csrf_token: request.header("x-ad-csrf"),
        ui_version: request.header("x-ad-ui-version").unwrap_or(""),
    };
    bridge
        .authorize(&authorization, now)
        .map_err(|error| response(403, error_code(&error), None, Some("application/json")))
}

pub(crate) fn catalog_error(error: SessionCatalogError) -> Vec<u8> {
    match error {
        SessionCatalogError::DuplicateConversation => {
            response(409, "conversation_exists", None, Some("application/json"))
        }
        SessionCatalogError::UnknownConversation => response(
            404,
            "conversation_not_found",
            None,
            Some("application/json"),
        ),
        SessionCatalogError::Session(_) => response(
            422,
            "session_operation_failed",
            None,
            Some("application/json"),
        ),
    }
}

pub(crate) fn pairing_ready(authority: Option<&InviteAuthority>) -> bool {
    authority.is_none_or(|value| value.pairing.can_message())
}

pub(crate) fn pairing_error(error: PairingError) -> Vec<u8> {
    let (status, code) = match error {
        PairingError::InvalidTransition => (409, "pairing_invalid_transition"),
        PairingError::SelfInvite => (422, "self_invite"),
        PairingError::Expired => (410, "pairing_expired"),
        PairingError::Duplicate => (409, "pairing_duplicate"),
        PairingError::SafetyMismatch => (422, "safety_number_mismatch"),
        PairingError::BindingChanged => (409, "pairing_binding_changed"),
    };
    response(status, code, None, Some("application/json"))
}

pub(crate) fn contact_directory_error(error: ContactDirectoryError) -> Vec<u8> {
    let (status, code) = match error {
        ContactDirectoryError::DuplicateDevice => (409, "contact_device_conflict"),
        ContactDirectoryError::ContactNotFound => (404, "contact_not_found"),
        ContactDirectoryError::InvalidAlias => (422, "invalid_alias"),
        ContactDirectoryError::Corrupt => (503, "contacts_storage_corrupt"),
        ContactDirectoryError::InvalidState => (422, "invalid_contact_state"),
    };
    response(status, code, None, Some("application/json"))
}

pub(crate) fn error_code(error: &crate::bridge::BridgeError) -> &'static str {
    match error {
        crate::bridge::BridgeError::InvalidRequestOrigin => "invalid_origin",
        crate::bridge::BridgeError::InvalidHost => "invalid_host",
        crate::bridge::BridgeError::CsrfRequired => "csrf_required",
        crate::bridge::BridgeError::SessionInvalid => "session_invalid",
        crate::bridge::BridgeError::BootstrapAlreadyConsumed => "bootstrap_consumed",
        _ => "bridge_rejected",
    }
}
