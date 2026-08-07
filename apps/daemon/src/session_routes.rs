use super::{
    authorize_api, cookie_value, error_code, hex_bytes, hex_decode, json_escape, json_string,
    response, Request, RouteContext, EXCHANGE_PATH,
};
use crate::storage::EncryptedStore;

pub(crate) fn handle_session_route(
    request: &Request<'_>,
    context: &mut RouteContext<'_>,
) -> Option<Vec<u8>> {
    let origin = request.header("origin").unwrap_or("");
    let host = request.header("host").unwrap_or("");
    let reply = match (request.method, request.path) {
        ("POST", EXCHANGE_PATH) => {
            let Some(token) = json_string(request.body, "token") else {
                return Some(response(400, "invalid_bootstrap", None, None));
            };
            let Some(ui_version) = json_string(request.body, "ui_version") else {
                return Some(response(400, "invalid_bootstrap", None, None));
            };
            if let (Some(authority), Some(store)) = (
                context.invite_authority.as_deref_mut(),
                context.session_store.as_deref(),
            ) {
                if authority.restore_received_attachments(store).is_err() {
                    return Some(response(
                        503,
                        "attachment_state_unavailable",
                        None,
                        Some("application/json"),
                    ));
                }
            }
            match context
                .bridge
                .exchange(origin, host, token, ui_version, context.now)
            {
                Ok(credentials) => {
                    let body = format!(
                        r##"{{"csrf_token":"{}","expires_at":{},"ui_version":"{}"}}"##,
                        credentials.csrf_token, credentials.expires_at, credentials.ui_version
                    );
                    response(
                        200,
                        &body,
                        Some(&credentials.set_cookie),
                        Some("application/json"),
                    )
                }
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
        }
        ("POST", "/local-session/renew") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return Some(response(401, "session_invalid", None, None));
            };
            let csrf_token = request.header("x-ad-csrf").unwrap_or("");
            let ui_version = request.header("x-ad-ui-version").unwrap_or("");
            match context
                .bridge
                .renew(origin, host, cookie, csrf_token, ui_version, context.now)
            {
                Ok(credentials) => {
                    let body = format!(
                        r##"{{"csrf_token":"{}","expires_at":{},"ui_version":"{}"}}"##,
                        credentials.csrf_token, credentials.expires_at, credentials.ui_version
                    );
                    response(
                        200,
                        &body,
                        Some(&credentials.set_cookie),
                        Some("application/json"),
                    )
                }
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
        }
        ("GET", "/local-api/status") => match authorize_api(context.bridge, request, context.now) {
            Ok(()) => {
                let relay_origin = context
                    .invite_authority
                    .as_deref()
                    .map(|authority| authority.relay_origin.as_str())
                    .unwrap_or("");
                let inbox_url = context
                    .invite_authority
                    .as_deref()
                    .and_then(|authority| authority.inbox_url.as_deref())
                    .map(|value| format!(r##""{}""##, json_escape(value)))
                    .unwrap_or_else(|| "null".to_owned());
                let (storage_records, storage_record_limit) = context
                    .session_store
                    .as_deref()
                    .map(|store| (store.record_count(), EncryptedStore::record_limit()))
                    .unwrap_or((0, EncryptedStore::record_limit()));
                response(
                    200,
                    &format!(
                        r##"{{"status":"daemon-session-active","high_risk":false,"private_state":"daemon-owned","relay_origin":"{}","inbox_url":{},"storage_records":{},"storage_record_limit":{}}}"##,
                        json_escape(relay_origin),
                        inbox_url,
                        storage_records,
                        storage_record_limit,
                    ),
                    None,
                    Some("application/json"),
                )
            }
            Err(reply) => reply,
        },
        ("POST", "/local-api/recovery/export") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            let Some(store) = context.session_store.as_deref() else {
                return Some(response(
                    503,
                    "storage_unavailable",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(artifact) = store.export_recovery_artifact(context.now) else {
                return Some(response(
                    503,
                    "recovery_export_unavailable",
                    None,
                    Some("application/json"),
                ));
            };
            response(
                200,
                &format!(
                    r##"{{"schema_version":2,"artifact_hex":"{}"}}"##,
                    hex_bytes(&artifact)
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/recovery/stage") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            let Some(artifact) = json_string(request.body, "artifact_hex").and_then(hex_decode)
            else {
                return Some(response(
                    400,
                    "invalid_recovery_artifact",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(store) = context.session_store.as_deref() else {
                return Some(response(
                    503,
                    "storage_unavailable",
                    None,
                    Some("application/json"),
                ));
            };
            match store.stage_recovery_artifact(&artifact) {
                Ok(()) => response(
                    202,
                    r##"{"staged":true,"restart_required":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(_) => response(
                    422,
                    "invalid_recovery_artifact",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/session/lock") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            if let Some(catalog) = context.session_catalog.as_deref_mut() {
                catalog.lock();
            }
            if let Some(authority) = context.invite_authority.as_deref_mut() {
                authority.clear_attachment_state();
            }
            if let Some(store) = context.session_store.as_deref_mut() {
                store.lock();
            }
            context.bridge.invalidate_session();
            response(
                200,
                r##"{"status":"locked"}"##,
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/session/wipe") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            if let Some(catalog) = context.session_catalog.as_deref_mut() {
                catalog.lock();
            }
            if let Some(authority) = context.invite_authority.as_deref_mut() {
                authority.clear_attachment_state();
            }
            if let Some(ledger) = context.delivery_ledger.as_deref_mut() {
                ledger.wipe();
            }
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            if store.wipe_files().is_err() {
                return Some(response(
                    503,
                    "wipe_incomplete",
                    None,
                    Some("application/json"),
                ));
            }
            context.bridge.invalidate_session();
            response(
                200,
                r##"{"wiped":true,"remote_data":"not_deleted","browser_cache":"not_deleted"}"##,
                None,
                Some("application/json"),
            )
        }
        _ => return None,
    };
    Some(reply)
}
