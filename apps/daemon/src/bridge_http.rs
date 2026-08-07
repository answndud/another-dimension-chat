#![allow(clippy::module_name_repetitions)]

#[path = "authority.rs"]
mod authority;
#[path = "http_support.rs"]
mod http_support;
#[path = "maintenance.rs"]
mod maintenance;
#[path = "message_service.rs"]
mod message_service;

use authority::{
    mls_device_credential, verify_relay_receipt, verify_signed_invite, verify_signed_invite_unbound,
};
pub use authority::{IdentityView, InviteAuthority, VerifiedInvite};
use http_support::{
    axum_request_bytes, axum_response, cookie_value, delivery_state_name, json_bool, json_escape,
    json_string, json_string_array, json_u64, parse_request, response, static_file, Request,
};
use maintenance::{
    background_sync_once, deliver_device_change_commits, notify_new_messages, retry_due_deliveries,
};
use message_service::{
    decode_message_payload, encode_message_payload, persist_message, StoredMessage,
};

use crate::{
    attachment::{AttachmentDescriptor, AttachmentJob, EncryptedAttachment},
    bridge::{BridgeRequest, LocalBridge},
    contacts::{ContactDirectory, ContactDirectoryError},
    delivery::{DeliveryLedger, RelayEnvelope},
    device::{DeviceRegistry, DeviceRegistryError},
    device_link::{DeviceLinkError, DeviceLinkRequest},
    identity::AccountRootKey,
    mls_session::{attachment_descriptor_from_plaintext, MlsSessionCatalog, SessionCatalogError},
    pairing::{PairingError, PairingSession},
    relay_http::{RelayClient, RelayEndpoint, RelayError},
    storage::{EncryptedStore, RecordClass, StorageError},
    trust::{relay_tls_pin_record_key, RelayTrust, TlsCertificatePin},
};
use axum::{
    body::{to_bytes, Body},
    extract::State,
    http::{Request as HttpRequest, Uri},
    response::Response,
    routing::any,
    Router,
};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use sha2::{Digest, Sha256};
use std::{
    io,
    net::SocketAddr,
    path::{Path, PathBuf},
    process::Command,
    sync::{Arc, Mutex},
    time::Duration,
};

const MAX_REQUEST_BYTES: usize = 192 * 1024;
const EXCHANGE_PATH: &str = "/local-session/exchange";
const MAX_INVITE_TTL_SECONDS: u64 = 10 * 60;
const COMPLETED_ATTACHMENT_TTL_SECONDS: u64 = 60 * 60;
const MAX_COMPLETED_ATTACHMENT_COUNT: usize = 2;
const MAX_COMPLETED_ATTACHMENT_BYTES: usize = 64 * 1024 * 1024;
const MAX_MESSAGE_TTL_SECONDS: u64 = 7 * 24 * 60 * 60;
const MAX_AUTOMATIC_RETRIES_PER_TICK: usize = 2;

/// Minimal HTTP boundary for the local bridge. It intentionally exposes only
/// session bootstrap/status/lock; identity and message APIs remain absent.
pub fn handle_request(bridge: &mut LocalBridge, raw: &[u8], now: u64) -> Vec<u8> {
    handle_request_with_context(bridge, raw, now, None, None, None, None, None, None)
}

pub fn handle_request_with_ui(
    bridge: &mut LocalBridge,
    raw: &[u8],
    now: u64,
    ui_root: Option<&Path>,
) -> Vec<u8> {
    handle_request_with_context(bridge, raw, now, ui_root, None, None, None, None, None)
}

pub(crate) enum DeviceActionError {
    Registry(DeviceRegistryError),
    Link(DeviceLinkError),
    CurrentDevice,
    RootUnavailable,
    Storage,
}

pub fn handle_request_with_context(
    bridge: &mut LocalBridge,
    raw: &[u8],
    now: u64,
    ui_root: Option<&Path>,
    identity: Option<&IdentityView>,
    mut invite_authority: Option<&mut InviteAuthority>,
    mut session_catalog: Option<&mut MlsSessionCatalog>,
    mut session_store: Option<&mut EncryptedStore>,
    mut delivery_ledger: Option<&mut DeliveryLedger>,
) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    if let Some(authority) = invite_authority.as_deref_mut() {
        authority.purge_attachment_state(now);
    }
    let origin = request.header("origin").unwrap_or("");
    let host = request.header("host").unwrap_or("");
    match (request.method, request.path) {
        ("GET", "/") | ("GET", "/index.html") => static_file(ui_root, "index.html")
            .unwrap_or_else(|| response(404, "ui_not_found", None, None)),
        ("GET", path)
            if path.starts_with("/assets/")
                || path == "/sw.js"
                || path == "/manifest.webmanifest" =>
        {
            let relative = path.trim_start_matches('/');
            static_file(ui_root, relative)
                .unwrap_or_else(|| response(404, "ui_not_found", None, None))
        }
        ("POST", EXCHANGE_PATH) => {
            let Some(token) = json_string(request.body, "token") else {
                return response(400, "invalid_bootstrap", None, None);
            };
            let Some(ui_version) = json_string(request.body, "ui_version") else {
                return response(400, "invalid_bootstrap", None, None);
            };
            if let (Some(authority), Some(store)) =
                (invite_authority.as_deref_mut(), session_store.as_deref())
            {
                if authority.restore_received_attachments(store).is_err() {
                    return response(
                        503,
                        "attachment_state_unavailable",
                        None,
                        Some("application/json"),
                    );
                }
            }
            match bridge.exchange(origin, host, token, ui_version, now) {
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
                return response(401, "session_invalid", None, None);
            };
            let csrf_token = request.header("x-ad-csrf").unwrap_or("");
            let ui_version = request.header("x-ad-ui-version").unwrap_or("");
            match bridge.renew(origin, host, cookie, csrf_token, ui_version, now) {
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
        ("GET", "/local-api/status") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "GET",
                cookie,
                csrf_token: None,
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            match bridge.authorize(&authorization, now) {
                Ok(()) => {
                    let relay_origin = invite_authority
                        .as_ref()
                        .map(|authority| authority.relay_origin.as_str())
                        .unwrap_or("");
                    let inbox_url = invite_authority
                        .as_ref()
                        .and_then(|authority| authority.inbox_url.as_deref())
                        .map(|value| format!(r##""{}""##, json_escape(value)))
                        .unwrap_or_else(|| "null".to_owned());
                    let (storage_records, storage_record_limit) = session_store
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
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
        }
        ("POST", "/local-api/recovery/export") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(store) = session_store.as_deref() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            let Ok(artifact) = store.export_recovery_artifact(now) else {
                return response(
                    503,
                    "recovery_export_unavailable",
                    None,
                    Some("application/json"),
                );
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
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(artifact) = json_string(request.body, "artifact_hex").and_then(hex_decode)
            else {
                return response(
                    400,
                    "invalid_recovery_artifact",
                    None,
                    Some("application/json"),
                );
            };
            let Some(store) = session_store.as_deref() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
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
        ("GET", "/local-api/relay/trust") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority.as_deref() else {
                return response(
                    503,
                    "relay_trust_unavailable",
                    None,
                    Some("application/json"),
                );
            };
            let pin = authority.relay_tls_pin.map(TlsCertificatePin::as_text);
            response(
                200,
                &format!(
                    r##"{{"relay_origin":"{}","tls_pin":{},"retrust_required":false}}"##,
                    json_escape(&authority.relay_origin),
                    pin.as_deref()
                        .map(|value| format!(r##""{}""##, json_escape(value)))
                        .unwrap_or_else(|| "null".into())
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/relay/trust") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(
                    503,
                    "relay_trust_unavailable",
                    None,
                    Some("application/json"),
                );
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            let Some(value) = json_string(request.body, "tls_pin") else {
                return response(400, "tls_pin_required", None, Some("application/json"));
            };
            if !authority.relay_origin.starts_with("https://") {
                return response(
                    422,
                    "tls_pin_requires_https",
                    None,
                    Some("application/json"),
                );
            }
            let Ok(pin) = TlsCertificatePin::parse(value) else {
                return response(422, "invalid_tls_pin", None, Some("application/json"));
            };
            let retrust = json_bool(request.body, "retrust").unwrap_or(false);
            if let Some(previous) = authority.relay_tls_pin {
                if previous != pin && !retrust {
                    return response(
                        409,
                        "relay_retrust_required",
                        None,
                        Some("application/json"),
                    );
                }
            }
            if store
                .put(
                    RecordClass::Account,
                    &relay_tls_pin_record_key(&authority.relay_origin),
                    pin.as_text().as_bytes(),
                )
                .is_err()
            {
                return response(503, "storage_unavailable", None, Some("application/json"));
            }
            authority.relay_tls_pin = Some(pin);
            response(
                200,
                &format!(
                    r##"{{"saved":true,"tls_pin":"{}","retrusted":{}}}"##,
                    json_escape(&pin.as_text()),
                    retrust
                ),
                None,
                Some("application/json"),
            )
        }
        ("GET", "/local-api/identity") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "GET",
                cookie,
                csrf_token: None,
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            let Some(identity) = identity else {
                return response(503, "identity_unavailable", None, None);
            };
            match bridge.authorize(&authorization, now) {
                Ok(()) => {
                    let body = format!(
                        r##"{{"account_id":"{}","device_id":"{}","display_name":"{}","private_state":"daemon-owned"}}"##,
                        json_escape(&identity.account_id),
                        json_escape(&identity.device_id),
                        json_escape(&identity.display_name),
                    );
                    response(200, &body, None, Some("application/json"))
                }
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
        }
        ("GET", "/local-api/devices") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority.as_deref() else {
                return response(503, "device_unavailable", None, Some("application/json"));
            };
            let devices = authority
                .device_registry
                .records()
                .map(|record| {
                    let certificate = record.certificate();
                    serde_json::json!({
                        "device_id": certificate.device_id(),
                        "state": if record.revoked_at().is_some() || certificate.is_revoked() { "revoked" } else { "active" },
                        "issued_at": certificate.issued_at(),
                        "expires_at": certificate.expires_at(),
                        "public_key": hex_bytes(&certificate.device_public_key()),
                        "revoked_at": record.revoked_at(),
                    })
                })
                .collect::<Vec<_>>();
            response(
                200,
                &serde_json::json!({
                    "devices": devices,
                    "events": authority.device_registry.events(),
                })
                .to_string(),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/devices/revoke") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(device_id) = json_string(request.body, "device_id") else {
                return response(400, "device_id_required", None, Some("application/json"));
            };
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "device_unavailable", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, Some("application/json"));
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, Some("application/json"));
            };
            match authority.revoke_device(device_id, now, store) {
                Ok(()) => {
                    let commits = match catalog.remove_device(
                        &mls_device_credential(&authority.account_id, device_id),
                        store,
                    ) {
                        Ok(commits) => commits,
                        Err(error) => return catalog_error(error),
                    };
                    let delivered = match deliver_device_change_commits(
                        authority, &commits, ledger, store, now,
                    ) {
                        Ok(digests) => digests.len(),
                        Err(_) => {
                            return response(
                                503,
                                "device_change_delivery_pending",
                                None,
                                Some("application/json"),
                            )
                        }
                    };
                    response(
                        200,
                        &format!(
                            r##"{{"revoked":true,"device_id":"{}","sessions_removed":{},"delivered":{}}}"##,
                            json_escape(device_id),
                            commits.len(),
                            delivered
                        ),
                        None,
                        Some("application/json"),
                    )
                }
                Err(DeviceActionError::CurrentDevice) => response(
                    409,
                    "current_device_revoke_forbidden",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Registry(DeviceRegistryError::UnknownDevice)) => {
                    response(404, "device_not_found", None, Some("application/json"))
                }
                Err(DeviceActionError::Registry(DeviceRegistryError::DeviceNotActive)) => response(
                    409,
                    "device_already_revoked",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Storage) => {
                    response(503, "storage_unavailable", None, Some("application/json"))
                }
                Err(DeviceActionError::Registry(_)) => response(
                    422,
                    "device_registry_invalid",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Link(_)) => response(
                    422,
                    "device_registry_invalid",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::RootUnavailable) => response(
                    403,
                    "root_authority_unavailable",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/devices/link/approve") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(link_request) = json_string(request.body, "link_request") else {
                return response(400, "link_request_required", None, Some("application/json"));
            };
            let Some(code) = json_string(request.body, "code") else {
                return response(400, "link_code_required", None, Some("application/json"));
            };
            let Ok(parsed) = DeviceLinkRequest::parse(link_request) else {
                return response(
                    422,
                    "invalid_device_link_request",
                    None,
                    Some("application/json"),
                );
            };
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "device_unavailable", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            match authority.approve_device_link(&parsed, code, now, store) {
                Ok(approval) => response(
                    200,
                    &format!(
                        r##"{{"approved":true,"device_id":"{}","approval":"{}"}}"##,
                        json_escape(parsed.device_id()),
                        json_escape(&approval)
                    ),
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Link(DeviceLinkError::Expired)) => {
                    response(410, "device_link_expired", None, Some("application/json"))
                }
                Err(DeviceActionError::Link(DeviceLinkError::InvalidCode)) => response(
                    422,
                    "invalid_device_link_code",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Registry(DeviceRegistryError::DuplicateDevice)) => response(
                    409,
                    "device_already_registered",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Storage) => {
                    response(503, "storage_unavailable", None, Some("application/json"))
                }
                Err(DeviceActionError::Link(_)) | Err(DeviceActionError::Registry(_)) => response(
                    422,
                    "invalid_device_link_request",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::CurrentDevice) => response(
                    409,
                    "current_device_revoke_forbidden",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::RootUnavailable) => response(
                    403,
                    "root_authority_unavailable",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/invites") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "POST",
                cookie,
                csrf_token: request.header("x-ad-csrf"),
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            let Some(authority) = invite_authority else {
                return response(503, "invite_unavailable", None, None);
            };
            if authority.root.is_none() {
                return response(
                    403,
                    "root_authority_unavailable",
                    None,
                    Some("application/json"),
                );
            }
            match bridge.authorize(&authorization, now) {
                Ok(()) => {
                    let Some(store) = session_store.as_deref_mut() else {
                        return response(503, "storage_unavailable", None, None);
                    };
                    if let Err(error) = authority.mark_invite_created(store) {
                        return pairing_error(error);
                    }
                    let Some((code, signed_invite)) = authority.create(now) else {
                        return response(503, "randomness_unavailable", None, None);
                    };
                    let body = format!(
                        r##"{{"invite_code":"{}","signed_invite":"{}","expires_in":600}}"##,
                        code, signed_invite
                    );
                    response(200, &body, None, Some("application/json"))
                }
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
        }
        ("POST", "/local-api/invites/verify") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "POST",
                cookie,
                csrf_token: request.header("x-ad-csrf"),
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            if let Err(error) = bridge.authorize(&authorization, now) {
                return response(403, error_code(&error), None, Some("application/json"));
            }
            let Some(code) = json_string(request.body, "invite_code") else {
                return response(400, "invalid_invite", None, Some("application/json"));
            };
            let Some(signed_invite) = json_string(request.body, "signed_invite") else {
                return response(400, "invalid_invite", None, Some("application/json"));
            };
            let Some(invite) = verify_signed_invite(code, signed_invite, now) else {
                return response(422, "invalid_invite", None, Some("application/json"));
            };
            let body = format!(
                r##"{{"account_id":"{}","device_id":"{}","expires_at":{},"relay_origin":"{}","verified":true}}"##,
                json_escape(&invite.account_id),
                json_escape(&invite.device_id),
                invite.expires_at,
                json_escape(&invite.relay_origin)
            );
            response(200, &body, None, Some("application/json"))
        }
        ("POST", "/local-api/invites/stage") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "POST",
                cookie,
                csrf_token: request.header("x-ad-csrf"),
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            if let Err(error) = bridge.authorize(&authorization, now) {
                return response(403, error_code(&error), None, Some("application/json"));
            }
            let Some(authority) = invite_authority else {
                return response(503, "invite_unavailable", None, None);
            };
            let Some(code) = json_string(request.body, "invite_code") else {
                return response(400, "invalid_invite", None, Some("application/json"));
            };
            let Some(signed_invite) = json_string(request.body, "signed_invite") else {
                return response(400, "invalid_invite", None, Some("application/json"));
            };
            let Some(receipt) = json_string(request.body, "relay_receipt") else {
                return response(
                    400,
                    "relay_receipt_required",
                    None,
                    Some("application/json"),
                );
            };
            // Public relay rendezvous codes are generated by the relay and are
            // intentionally distinct from the daemon's internal invite code.
            // The relay receipt binds this consumed code to the signed invite.
            let Some(invite) = verify_signed_invite_unbound(signed_invite, now) else {
                return response(422, "invalid_invite", None, Some("application/json"));
            };
            if !verify_relay_receipt(
                code,
                signed_invite,
                receipt,
                &invite,
                authority.relay_public_key,
                authority.relay_trust.as_ref(),
                now,
            ) {
                return response(422, "invalid_relay_receipt", None, Some("application/json"));
            }
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            if let Err(error) = authority.stage_peer(invite.clone(), now, store) {
                return pairing_error(error);
            }
            let safety_number = authority.pairing.safety_number().unwrap_or_default();
            let inbox_url = invite
                .inbox_url
                .as_deref()
                .map(|value| format!(r##""{}""##, json_escape(value)))
                .unwrap_or_else(|| "null".to_owned());
            let body = format!(
                r##"{{"staged":true,"state":"verified","safety_verified":false,"safety_number":"{}","account_id":"{}","device_id":"{}","expires_at":{},"inbox_url":{}}}"##,
                json_escape(&safety_number),
                json_escape(&invite.account_id),
                json_escape(&invite.device_id),
                invite.expires_at,
                inbox_url
            );
            response(200, &body, None, Some("application/json"))
        }
        ("GET", "/local-api/pairing/status") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let snapshot = authority.pairing.snapshot();
            let peer = snapshot
                .peer
                .map(|peer| {
                    let inbox_url = peer
                        .inbox_url
                        .as_deref()
                        .map(|value| format!(r##""{}""##, json_escape(value)))
                        .unwrap_or_else(|| "null".to_owned());
                    format!(
                        r##",\"peer\":{{\"account_id\":\"{}\",\"device_id\":\"{}\",\"expires_at\":{},\"relay_origin\":\"{}\",\"inbox_url\":{}}}"##,
                        json_escape(&peer.account_id),
                        json_escape(&peer.device_id),
                        peer.expires_at,
                        json_escape(&peer.relay_origin),
                        inbox_url,
                    )
                })
                .unwrap_or_default();
            let safety_number = authority
                .pairing
                .safety_number()
                .map(|value| format!(r##",\"safety_number\":\"{}\""##, json_escape(&value)))
                .unwrap_or_default();
            let safety_verified = if snapshot.safety_verified {
                "true"
            } else {
                "false"
            };
            response(
                200,
                &format!(
                    r##"{{"state":"{}","safety_verified":{}{}{} }}"##,
                    snapshot.state.as_str(),
                    safety_verified,
                    peer,
                    safety_number
                )
                .replace(" }", "}"),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/pairing/verify-safety") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(value) = json_string(request.body, "safety_number") else {
                return response(
                    400,
                    "safety_number_required",
                    None,
                    Some("application/json"),
                );
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.confirm_safety(value, store) {
                Ok(()) => response(
                    200,
                    r##"{"safety_verified":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(error) => pairing_error(error),
            }
        }
        ("POST", "/local-api/pairing/unverify-safety") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.unverify_safety(store) {
                Ok(()) => response(
                    200,
                    r##"{"safety_verified":false,"messaging_blocked":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(error) => pairing_error(error),
            }
        }
        ("POST", "/local-api/pairing/approve") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.approve_pairing(now, store) {
                Ok(()) => match authority.register_approved_contact(now, store) {
                    Ok(()) => response(
                        200,
                        r##"{"state":"established","approved":true}"##,
                        None,
                        Some("application/json"),
                    ),
                    Err(error) => contact_directory_error(error),
                },
                Err(error) => pairing_error(error),
            }
        }
        ("GET", "/local-api/contacts") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let payload = match serde_json::to_string(&authority.contacts()) {
                Ok(payload) => payload,
                Err(_) => return response(503, "contacts_unavailable", None, None),
            };
            response(
                200,
                &format!(r##"{{"contacts":{payload}}}"##),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/contacts/alias") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(alias) = json_string(request.body, "alias") else {
                return response(400, "alias_required", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.set_contact_alias(&account_id, &alias, store) {
                Ok(()) => response(200, r##"{"updated":true}"##, None, Some("application/json")),
                Err(error) => contact_directory_error(error),
            }
        }
        ("POST", "/local-api/contacts/block") | ("POST", "/local-api/contacts/unblock") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let blocked = request.path.ends_with("/block");
            match authority.set_contact_blocked(&account_id, blocked, store) {
                Ok(()) => response(
                    200,
                    if blocked {
                        r##"{"blocked":true}"##
                    } else {
                        r##"{"blocked":false}"##
                    },
                    None,
                    Some("application/json"),
                ),
                Err(error) => contact_directory_error(error),
            }
        }
        ("POST", "/local-api/contacts/delete") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let removed = match authority.remove_contact(&account_id, store) {
                Ok(contact) => contact,
                Err(error) => return contact_directory_error(error),
            };
            if let Some(conversation_id) = removed.conversation_id.as_deref() {
                if let Some(catalog) = session_catalog.as_deref_mut() {
                    match catalog.remove(conversation_id, store) {
                        Ok(()) | Err(SessionCatalogError::UnknownConversation) => {}
                        Err(error) => return catalog_error(error),
                    }
                } else {
                    let _ = store.delete(
                        RecordClass::ProtocolSession,
                        &format!("mls/session/{conversation_id}"),
                    );
                }
            }
            response(200, r##"{"deleted":true}"##, None, Some("application/json"))
        }
        ("POST", "/local-api/contacts/bind-conversation") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(
                    400,
                    "conversation_id_required",
                    None,
                    Some("application/json"),
                );
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.bind_contact_conversation(&account_id, &conversation_id, store) {
                Ok(()) => response(200, r##"{"bound":true}"##, None, Some("application/json")),
                Err(error) => contact_directory_error(error),
            }
        }
        ("POST", "/local-api/contacts/read") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.mark_contact_read(&account_id, store) {
                Ok(()) => response(200, r##"{"read":true}"##, None, Some("application/json")),
                Err(error) => contact_directory_error(error),
            }
        }
        ("GET", "/local-api/conversations") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let payload =
                serde_json::to_string(&catalog.conversation_ids()).unwrap_or_else(|_| "[]".into());
            response(
                200,
                &format!(r##"{{"conversations":{payload}}}"##),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/messages/list") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let limit = json_u64(request.body, "limit")
                .and_then(|value| usize::try_from(value).ok())
                .unwrap_or(200)
                .clamp(1, 200);
            let offset = json_u64(request.body, "offset")
                .and_then(|value| usize::try_from(value).ok())
                .unwrap_or(0);
            let mut messages = Vec::new();
            let page = store.records_with_prefix_page(
                RecordClass::Message,
                "messages/",
                offset,
                limit.saturating_add(1),
            );
            let truncated = page.len() > limit;
            for (key, bytes) in page.into_iter().take(limit) {
                let Ok(message) = serde_json::from_slice::<StoredMessage>(&bytes) else {
                    return response(503, "message_storage_corrupt", None, None);
                };
                if message.conversation_id != conversation_id {
                    continue;
                }
                if message.expires_at != 0 && message.expires_at <= now {
                    let _ = store.delete(RecordClass::Message, &key);
                    continue;
                }
                messages.push(format!(
                    r##"{{"message_id":"{}","direction":"{}","created_at":{},"expires_at":{},"plaintext":"{}"}}"##,
                    json_escape(&message.message_id),
                    json_escape(&message.direction),
                    message.created_at,
                    message.expires_at,
                    hex_bytes(message.text.as_bytes())
                ));
            }
            response(
                200,
                &format!(
                    r##"{{"messages":[{}],"next_offset":{}}}"##,
                    messages.join(","),
                    if truncated {
                        (offset + limit).to_string()
                    } else {
                        "null".into()
                    }
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/pairing/reject") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.reject_pairing(store) {
                Ok(()) => response(
                    200,
                    r##"{"state":"rejected","rejected":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(error) => pairing_error(error),
            }
        }
        ("POST", "/local-api/session/remove-device") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "device_unavailable", None, None);
            };
            if authority.root.is_none() {
                return response(
                    403,
                    "root_authority_unavailable",
                    None,
                    Some("application/json"),
                );
            }
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(device_id) = json_string(request.body, "device_id") else {
                return response(400, "device_id_required", None, Some("application/json"));
            };
            if account_id != authority.account_id {
                return response(
                    422,
                    "device_account_mismatch",
                    None,
                    Some("application/json"),
                );
            }
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, None);
            };
            let commits = match catalog
                .remove_device(&mls_device_credential(&account_id, &device_id), store)
            {
                Ok(commits) => commits,
                Err(error) => return catalog_error(error),
            };
            let delivered =
                match deliver_device_change_commits(authority, &commits, ledger, store, now) {
                    Ok(digests) => digests,
                    Err(_) => {
                        return response(
                            503,
                            "device_change_delivery_pending",
                            None,
                            Some("application/json"),
                        )
                    }
                };
            let payload = commits
                .iter()
                .map(|(conversation_id, commit)| {
                    format!(
                        r##"{{"conversation_id":"{}","commit":"{}"}}"##,
                        json_escape(conversation_id),
                        hex_bytes(commit)
                    )
                })
                .collect::<Vec<_>>()
                .join(",");
            response(
                200,
                &format!(
                    r##"{{"removed":true,"commits":[{}],"delivered":{}}}"##,
                    payload,
                    delivered.len()
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/session/create") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(identity) = identity else {
                return response(503, "identity_unavailable", None, None);
            };
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match catalog.create(
                conversation_id,
                mls_device_credential(&identity.account_id, &identity.device_id),
                store,
            ) {
                Ok(()) => response(201, r##"{"created":true}"##, None, Some("application/json")),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/prepare") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            let Some(identity) = identity else {
                return response(503, "identity_unavailable", None, None);
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            match catalog.prepare(
                conversation_id,
                mls_device_credential(&identity.account_id, &identity.device_id),
            ) {
                Ok(key_package) => response(
                    200,
                    &format!(r##"{{"key_package":"{}"}}"##, hex_bytes(&key_package)),
                    None,
                    Some("application/json"),
                ),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/join") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            let Some(welcome) = json_string(request.body, "welcome").and_then(hex_decode) else {
                return response(400, "invalid_welcome", None, Some("application/json"));
            };
            let Some(identity) = identity else {
                return response(503, "identity_unavailable", None, None);
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match catalog.join(
                conversation_id,
                mls_device_credential(&identity.account_id, &identity.device_id),
                &welcome,
                store,
            ) {
                Ok(()) => response(200, r##"{"joined":true}"##, None, Some("application/json")),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/add-member") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            let Some(key_package) = json_string(request.body, "key_package").and_then(hex_decode)
            else {
                return response(400, "invalid_key_package", None, Some("application/json"));
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match catalog.add_member(conversation_id, &key_package, store) {
                Ok(welcome) => response(
                    200,
                    &format!(r##"{{"welcome":"{}"}}"##, hex_bytes(&welcome)),
                    None,
                    Some("application/json"),
                ),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/send") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            if invite_authority.as_deref().is_some_and(|authority| {
                authority.contacts.is_blocked_conversation(&conversation_id)
            }) {
                return response(403, "contact_blocked", None, Some("application/json"));
            }
            let Some(message_text) = json_string(request.body, "plaintext") else {
                return response(400, "invalid_message", None, Some("application/json"));
            };
            let expires_at = json_u64(request.body, "expires_at").unwrap_or(0);
            if expires_at != 0
                && (expires_at <= now || expires_at > now.saturating_add(MAX_MESSAGE_TTL_SECONDS))
            {
                return response(
                    422,
                    "invalid_message_expiry",
                    None,
                    Some("application/json"),
                );
            }
            let Some(plaintext) = encode_message_payload(&message_text, now, expires_at) else {
                return response(503, "randomness_unavailable", None, None);
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match catalog.send(conversation_id, &plaintext, store) {
                Ok(ciphertext) => {
                    let Some(message) = decode_message_payload(&plaintext) else {
                        return response(503, "message_encoding_failed", None, None);
                    };
                    if persist_message(store, conversation_id, &message, "outgoing").is_err() {
                        return response(503, "message_storage_unavailable", None, None);
                    }
                    response(
                        200,
                        &format!(r##"{{"ciphertext":"{}"}}"##, hex_bytes(&ciphertext)),
                        None,
                        Some("application/json"),
                    )
                }
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/receive") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            if invite_authority.as_deref().is_some_and(|authority| {
                authority.contacts.is_blocked_conversation(&conversation_id)
            }) {
                return response(403, "contact_blocked", None, Some("application/json"));
            }
            let Some(ciphertext) = json_string(request.body, "ciphertext").and_then(hex_decode)
            else {
                return response(400, "invalid_ciphertext", None, Some("application/json"));
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match catalog.receive(conversation_id, &ciphertext, store) {
                Ok(plaintext) => {
                    let (plaintext, metadata) = decode_message_payload(&plaintext)
                        .map(|message| {
                            let expired = message.expires_at != 0 && message.expires_at <= now;
                            (message.text.into_bytes(), format!(r##","message_id":"{}","created_at":{},"expires_at":{},"expired":{}"##, json_escape(&message.id), message.created_at, message.expires_at, expired))
                        })
                        .unwrap_or_else(|| (plaintext, String::new()));
                    response(
                        200,
                        &format!(r##"{{"plaintext":"{}"{metadata}}}"##, hex_bytes(&plaintext)),
                        None,
                        Some("application/json"),
                    )
                }
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/send-attachment") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            if invite_authority.as_deref().is_some_and(|authority| {
                authority.contacts.is_blocked_conversation(&conversation_id)
            }) {
                return response(403, "contact_blocked", None, Some("application/json"));
            }
            let Some(descriptor_json) = json_string(request.body, "descriptor") else {
                return response(
                    400,
                    "invalid_attachment_descriptor",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(descriptor) = serde_json::from_str::<AttachmentDescriptor>(&descriptor_json)
            else {
                return response(
                    400,
                    "invalid_attachment_descriptor",
                    None,
                    Some("application/json"),
                );
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match catalog.send_attachment(conversation_id, &descriptor, store) {
                Ok(ciphertext) => response(
                    200,
                    &format!(
                        r##"{{"ciphertext":"{}","blob_id":"{}"}}"##,
                        hex_bytes(&ciphertext),
                        json_escape(&descriptor.blob_id)
                    ),
                    None,
                    Some("application/json"),
                ),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/receive-attachment") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            if invite_authority.as_deref().is_some_and(|authority| {
                authority.contacts.is_blocked_conversation(&conversation_id)
            }) {
                return response(403, "contact_blocked", None, Some("application/json"));
            }
            let Some(ciphertext) = json_string(request.body, "ciphertext").and_then(hex_decode)
            else {
                return response(400, "invalid_ciphertext", None, Some("application/json"));
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match catalog.receive_attachment(conversation_id, &ciphertext, store) {
                Ok(descriptor) => match serde_json::to_string(&descriptor) {
                    Ok(payload) => response(
                        200,
                        &format!(r##"{{"descriptor":{payload}}}"##),
                        None,
                        Some("application/json"),
                    ),
                    Err(_) => response(503, "descriptor_unavailable", None, None),
                },
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/attachment/upload-chunk") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return response(400, "invalid_blob_id", None, Some("application/json"));
            };
            let Some(chunk) = json_string(request.body, "chunk").and_then(hex_decode) else {
                return response(400, "invalid_blob_chunk", None, Some("application/json"));
            };
            let Some(offset) =
                json_u64(request.body, "offset").and_then(|value| usize::try_from(value).ok())
            else {
                return response(400, "invalid_blob_offset", None, Some("application/json"));
            };
            let Some(total) =
                json_u64(request.body, "total").and_then(|value| usize::try_from(value).ok())
            else {
                return response(400, "invalid_blob_total", None, Some("application/json"));
            };
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                &inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            match RelayClient::new(endpoint)
                .upload_blob_chunk_blocking(&blob_id, offset, total, &chunk)
            {
                Ok(result) => response(
                    200,
                    &format!(
                        r##"{{"complete":{},"received":{},"total":{},"expires_at":{}}}"##,
                        result.complete, result.received, result.total, result.expires_at
                    ),
                    None,
                    Some("application/json"),
                ),
                Err(RelayError::Rejected(status)) => {
                    response(status, "relay_rejected", None, Some("application/json"))
                }
                Err(_) => response(503, "relay_unavailable", None, Some("application/json")),
            }
        }
        ("POST", "/local-api/attachment/start") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return response(400, "invalid_blob_id", None, Some("application/json"));
            };
            let Some(total) = json_u64(request.body, "total").and_then(|v| usize::try_from(v).ok())
            else {
                return response(
                    400,
                    "invalid_attachment_size",
                    None,
                    Some("application/json"),
                );
            };
            let file_name = json_string(request.body, "file_name");
            let media_type = json_string(request.body, "media_type");
            match authority.attachment_start(&blob_id, total, file_name, media_type, now) {
                Ok(()) => response(201, r##"{"started":true}"##, None, Some("application/json")),
                Err(_) => response(400, "invalid_attachment", None, Some("application/json")),
            }
        }
        ("POST", "/local-api/attachment/append") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return response(400, "invalid_blob_id", None, Some("application/json"));
            };
            let Some(index) = json_u64(request.body, "index").and_then(|v| u32::try_from(v).ok())
            else {
                return response(
                    400,
                    "invalid_attachment_index",
                    None,
                    Some("application/json"),
                );
            };
            let Some(plaintext) = json_string(request.body, "plaintext").and_then(hex_decode)
            else {
                return response(
                    400,
                    "invalid_attachment_chunk",
                    None,
                    Some("application/json"),
                );
            };
            match authority.attachment_append(&blob_id, index, &plaintext) {
                Ok(()) => response(
                    202,
                    r##"{"accepted":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(_) => response(
                    409,
                    "invalid_attachment_chunk",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/attachment/finish") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return response(400, "invalid_blob_id", None, Some("application/json"));
            };
            match authority.attachment_finish(&blob_id, now) {
                Ok(_) => response(
                    200,
                    r##"{"finished":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(_) => response(
                    409,
                    "attachment_not_complete",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/attachment/send") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return response(400, "invalid_blob_id", None, Some("application/json"));
            };
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(endpoint) =
                RelayEndpoint::from_inbox_url_with_pin(inbox_url, authority.relay_tls_pin).ok()
            else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let Some(package) = authority.completed_attachments.get(blob_id) else {
                return response(404, "attachment_not_found", None, Some("application/json"));
            };
            let client = RelayClient::new(endpoint.clone());
            for (index, chunk) in package
                .blob
                .chunks(crate::attachment::CHUNK_SIZE)
                .enumerate()
            {
                let offset = index * crate::attachment::CHUNK_SIZE;
                if client
                    .upload_blob_chunk_blocking(blob_id, offset, package.blob.len(), chunk)
                    .is_err()
                {
                    return response(503, "relay_unavailable", None, Some("application/json"));
                }
            }
            let descriptor = package.descriptor.clone();
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Ok(ciphertext) = catalog.send_attachment(conversation_id, &descriptor, store)
            else {
                return response(
                    409,
                    "attachment_session_failed",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(expires_at) = now.checked_add(3600).ok_or(()) else {
                return response(422, "invalid_expiry", None, Some("application/json"));
            };
            let Ok(envelope) =
                RelayEnvelope::create(&endpoint.capability, &ciphertext, expires_at, now)
            else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(digest) = envelope.digest() else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(wire) = envelope.to_wire() else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, None);
            };
            if ledger
                .register_encrypted_with_destination(
                    digest.clone(),
                    Some(wire),
                    Some(envelope.expires_at),
                    Some(inbox_url.to_owned()),
                )
                .is_err()
            {
                return response(409, "duplicate_delivery", None, Some("application/json"));
            }
            let accepted = match client.post_blocking(&envelope) {
                Ok(value) => value,
                Err(_) => {
                    let _ = ledger.schedule_retry(&digest, now);
                    let _ = ledger.persist(store);
                    return response(
                        503,
                        &format!(
                            r##"{{"error":"relay_unavailable","digest":"{}","state":"retryable"}}"##,
                            json_escape(&digest)
                        ),
                        None,
                        Some("application/json"),
                    );
                }
            };
            let _ = ledger.bind_relay_id(&digest, &accepted.id);
            let _ = ledger.transition(&digest, crate::delivery::DeliveryState::Queued);
            let _ = ledger.transition(&digest, crate::delivery::DeliveryState::RelayAccepted);
            if ledger.persist(store).is_err() {
                return response(503, "storage_unavailable", None, None);
            }
            authority.take_completed_attachment(blob_id);
            response(
                202,
                &format!(
                    r##"{{"accepted":true,"id":"{}","digest":"{}","state":"relay-accepted"}}"##,
                    json_escape(&accepted.id),
                    json_escape(&digest)
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/attachment/upload-completed") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return response(400, "invalid_blob_id", None, Some("application/json"));
            };
            let Some(endpoint) =
                RelayEndpoint::from_inbox_url_with_pin(&inbox_url, authority.relay_tls_pin).ok()
            else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let Some(package) = authority.completed_attachments.get(blob_id) else {
                return response(404, "attachment_not_found", None, Some("application/json"));
            };
            let client = RelayClient::new(endpoint);
            for (offset, chunk) in package
                .blob
                .chunks(crate::attachment::CHUNK_SIZE)
                .enumerate()
            {
                let offset = offset * crate::attachment::CHUNK_SIZE;
                if client
                    .upload_blob_chunk_blocking(&blob_id, offset, package.blob.len(), chunk)
                    .is_err()
                {
                    return response(503, "relay_unavailable", None, Some("application/json"));
                }
            }
            authority.take_completed_attachment(&blob_id);
            response(
                200,
                r##"{"uploaded":true}"##,
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/attachment/download-chunk") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(authority) = invite_authority.as_deref() else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(attachment_id) = json_string(request.body, "attachment_id") else {
                return response(400, "invalid_attachment_id", None, Some("application/json"));
            };
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(index) = json_u64(request.body, "index").and_then(|v| usize::try_from(v).ok())
            else {
                return response(
                    400,
                    "invalid_attachment_index",
                    None,
                    Some("application/json"),
                );
            };
            let Some(descriptor) = authority.received_attachment(attachment_id) else {
                return response(404, "attachment_not_found", None, Some("application/json"));
            };
            let Some(chunk) = descriptor.chunks.get(index) else {
                return response(
                    416,
                    "attachment_chunk_not_found",
                    None,
                    Some("application/json"),
                );
            };
            let offset: usize = descriptor.chunks[..index]
                .iter()
                .map(|item| item.ciphertext_size as usize)
                .sum();
            let Ok(endpoint) =
                RelayEndpoint::from_inbox_url_with_pin(inbox_url, authority.relay_tls_pin)
            else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(ciphertext) = RelayClient::new(endpoint).download_blob_chunk_blocking(
                &descriptor.blob_id,
                offset,
                chunk.ciphertext_size as usize,
            ) else {
                return response(503, "relay_unavailable", None, Some("application/json"));
            };
            let Ok(plaintext) =
                crate::attachment::decrypt_blob_chunk(descriptor, index as u32, &ciphertext)
            else {
                return response(
                    409,
                    "attachment_verification_failed",
                    None,
                    Some("application/json"),
                );
            };
            let complete = index + 1 == descriptor.chunks.len();
            let file_name = descriptor
                .file_name
                .as_deref()
                .map(|value| format!(r##""{}""##, json_escape(value)))
                .unwrap_or_else(|| "null".to_owned());
            let media_type = descriptor
                .media_type
                .as_deref()
                .map(|value| format!(r##""{}""##, json_escape(value)))
                .unwrap_or_else(|| "null".to_owned());
            response(
                200,
                &format!(
                    r##"{{"attachment_id":"{}","index":{},"complete":{},"file_name":{},"media_type":{},"plaintext":"{}"}}"##,
                    json_escape(attachment_id),
                    index,
                    complete,
                    file_name,
                    media_type,
                    hex_bytes(&plaintext)
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/attachment/cancel") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return response(400, "invalid_attachment_id", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let cancelled = authority.cancel_attachment(blob_id, store);
            response(
                200,
                &format!(r##"{{"cancelled":{cancelled}}}"##),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/post") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(ciphertext) = json_string(request.body, "ciphertext").and_then(hex_decode)
            else {
                return response(400, "invalid_ciphertext", None, Some("application/json"));
            };
            let Some(expires_at) = json_u64(request.body, "expires_at") else {
                return response(400, "invalid_expiry", None, Some("application/json"));
            };
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(envelope) =
                RelayEnvelope::create(&endpoint.capability, &ciphertext, expires_at, now)
            else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(digest) = envelope.digest() else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(wire) = envelope.to_wire() else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, None);
            };
            if ledger
                .register_encrypted_with_destination(
                    digest.clone(),
                    Some(wire),
                    Some(envelope.expires_at),
                    Some(inbox_url.to_owned()),
                )
                .is_err()
            {
                return response(409, "duplicate_delivery", None, Some("application/json"));
            }
            let client = RelayClient::new(endpoint);
            let accepted = match client.post_blocking(&envelope) {
                Ok(value) => value,
                Err(RelayError::Rejected(410)) => {
                    if let (Some(authority), Some(store)) = (
                        invite_authority.as_deref_mut(),
                        session_store.as_deref_mut(),
                    ) {
                        let _ = authority.invalidate_relay_binding(store);
                    }
                    return response(
                        409,
                        "relay_capability_expired",
                        None,
                        Some("application/json"),
                    );
                }
                Err(_) => {
                    let _ = ledger.schedule_retry(&digest, now);
                    if let Some(store) = session_store.as_deref_mut() {
                        let _ = ledger.persist(store);
                    }
                    return response(
                        503,
                        &format!(
                            r##"{{"error":"relay_unavailable","digest":"{}","state":"retryable"}}"##,
                            json_escape(&digest)
                        ),
                        None,
                        Some("application/json"),
                    );
                }
            };
            if ledger.bind_relay_id(&digest, &accepted.id).is_err() {
                return response(503, "delivery_state_unavailable", None, None);
            }
            let _ = ledger.transition(&digest, crate::delivery::DeliveryState::Queued);
            let _ = ledger.transition(&digest, crate::delivery::DeliveryState::RelayAccepted);
            if let Some(store) = session_store.as_deref_mut() {
                if ledger.persist(store).is_err() {
                    return response(503, "storage_unavailable", None, None);
                }
            }
            response(
                202,
                &format!(
                    r##"{{"accepted":true,"id":"{}","digest":"{}","state":"relay-accepted"}}"##,
                    json_escape(&accepted.id),
                    json_escape(&digest)
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/status") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(digest) = json_string(request.body, "digest") else {
                return response(
                    400,
                    "invalid_delivery_digest",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref() else {
                return response(503, "delivery_unavailable", None, Some("application/json"));
            };
            let Some(record) = ledger.get(digest) else {
                return response(404, "delivery_not_found", None, Some("application/json"));
            };
            let relay_id = record
                .relay_id
                .as_deref()
                .map(|value| format!(r##""{}""##, json_escape(value)))
                .unwrap_or_else(|| "null".to_owned());
            response(
                200,
                &format!(
                    r##"{{"digest":"{}","state":"{}","attempts":{},"next_retry_at":{},"relay_id":{}}}"##,
                    json_escape(&record.digest),
                    delivery_state_name(record.state),
                    record.attempts,
                    record
                        .next_retry_at
                        .map_or_else(|| "null".to_owned(), |value| value.to_string()),
                    relay_id
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/cancel") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(digest) = json_string(request.body, "digest") else {
                return response(
                    400,
                    "invalid_delivery_digest",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, None);
            };
            let cancelled = match ledger.cancel(&digest) {
                Ok(value) => value,
                Err(_) => {
                    return response(404, "delivery_not_found", None, Some("application/json"))
                }
            };
            if cancelled {
                if let Some(store) = session_store.as_deref_mut() {
                    if ledger.persist(store).is_err() {
                        return response(503, "storage_unavailable", None, None);
                    }
                }
            }

            response(
                200,
                &format!(r##"{{"cancelled":{cancelled}}}"##),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/retry") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(digest) = json_string(request.body, "digest") else {
                return response(
                    400,
                    "invalid_delivery_digest",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, Some("application/json"));
            };
            let Some(record) = ledger.get(digest).cloned() else {
                return response(404, "delivery_not_found", None, Some("application/json"));
            };
            if record.state == crate::delivery::DeliveryState::Failed {
                return response(
                    409,
                    "delivery_retry_exhausted",
                    None,
                    Some("application/json"),
                );
            }
            if record.state != crate::delivery::DeliveryState::Retryable {
                return response(
                    409,
                    "delivery_not_retryable",
                    None,
                    Some("application/json"),
                );
            }
            if record.next_retry_at.is_some_and(|retry_at| retry_at > now) {
                return response(
                    429,
                    "delivery_retry_backoff",
                    None,
                    Some("application/json"),
                );
            }
            let Some(wire) = record.wire else {
                return response(
                    409,
                    "delivery_not_retriable",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(envelope) = RelayEnvelope::from_wire(&wire, now) else {
                return response(
                    409,
                    "delivery_not_retriable",
                    None,
                    Some("application/json"),
                );
            };
            if envelope.mailbox != endpoint.capability {
                return response(
                    422,
                    "delivery_endpoint_mismatch",
                    None,
                    Some("application/json"),
                );
            }
            let accepted = match RelayClient::new(endpoint).post_blocking(&envelope) {
                Ok(value) => value,
                Err(RelayError::Rejected(410)) => {
                    if let (Some(authority), Some(store)) = (
                        invite_authority.as_deref_mut(),
                        session_store.as_deref_mut(),
                    ) {
                        let _ = authority.invalidate_relay_binding(store);
                    }
                    return response(
                        409,
                        "relay_capability_expired",
                        None,
                        Some("application/json"),
                    );
                }
                Err(_) => {
                    let _ = ledger.schedule_retry(digest, now);
                    if let Some(store) = session_store.as_deref_mut() {
                        let _ = ledger.persist(store);
                    }
                    return response(503, "relay_unavailable", None, Some("application/json"));
                }
            };
            if ledger.bind_relay_id(digest, &accepted.id).is_err()
                || ledger
                    .transition(digest, crate::delivery::DeliveryState::Queued)
                    .is_err()
                || ledger
                    .transition(digest, crate::delivery::DeliveryState::RelayAccepted)
                    .is_err()
            {
                return response(503, "delivery_state_unavailable", None, None);
            }
            if let Some(store) = session_store.as_deref_mut() {
                if ledger.persist(store).is_err() {
                    return response(503, "storage_unavailable", None, None);
                }
            }
            response(
                202,
                &format!(
                    r##"{{"accepted":true,"id":"{}","digest":"{}","state":"relay-accepted"}}"##,
                    json_escape(&accepted.id),
                    json_escape(digest)
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/sync") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            if invite_authority.as_deref().is_some_and(|authority| {
                authority.contacts.is_blocked_conversation(&conversation_id)
            }) {
                return response(403, "contact_blocked", None, Some("application/json"));
            }
            let background = json_bool(request.body, "background").unwrap_or(false);
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let capability = endpoint.capability.clone();
            let client = RelayClient::new(endpoint);
            let items = match client.sync_blocking() {
                Ok(items) => items,
                Err(RelayError::Rejected(410)) => {
                    if let (Some(authority), Some(store)) = (
                        invite_authority.as_deref_mut(),
                        session_store.as_deref_mut(),
                    ) {
                        let _ = authority.invalidate_relay_binding(store);
                    }
                    return response(
                        409,
                        "relay_capability_expired",
                        None,
                        Some("application/json"),
                    );
                }
                Err(_) => {
                    return response(503, "relay_unavailable", None, Some("application/json"))
                }
            };
            let mut validated_items = Vec::with_capacity(items.len());
            for item in items {
                let Some(wire) = item.envelope.strip_prefix("ADENV1.") else {
                    return response(
                        502,
                        "invalid_relay_envelope",
                        None,
                        Some("application/json"),
                    );
                };
                let Ok(envelope) = RelayEnvelope::from_wire(wire, now) else {
                    return response(
                        502,
                        "invalid_relay_envelope",
                        None,
                        Some("application/json"),
                    );
                };
                if envelope.mailbox != capability
                    || hex_bytes(&Sha256::digest(item.envelope.as_bytes())) != item.id
                {
                    return response(
                        502,
                        "invalid_relay_envelope",
                        None,
                        Some("application/json"),
                    );
                }
                validated_items.push((item.id, envelope));
            }
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            let mut acknowledged_ids = Vec::new();
            let mut messages = Vec::new();
            for (relay_id, envelope) in validated_items {
                let digest = match envelope.digest() {
                    Ok(value) => value,
                    Err(_) => {
                        return response(
                            502,
                            "invalid_relay_envelope",
                            None,
                            Some("application/json"),
                        );
                    }
                };
                if delivery_ledger
                    .as_deref()
                    .and_then(|ledger| ledger.get(&digest))
                    .is_some_and(|record| record.state == crate::delivery::DeliveryState::Decrypted)
                {
                    acknowledged_ids.push(relay_id);
                    continue;
                }
                let plaintext = match catalog.receive(conversation_id, &envelope.ciphertext, store)
                {
                    Ok(value) => value,
                    Err(_) => {
                        return response(
                            409,
                            "message_decrypt_failed",
                            None,
                            Some("application/json"),
                        );
                    }
                };
                if let Some(ledger) = delivery_ledger.as_deref_mut() {
                    if ledger
                        .register_recipient_received(&digest, relay_id.clone())
                        .is_err()
                        || ledger.mark_decrypted(&digest).is_err()
                    {
                        return response(503, "delivery_state_unavailable", None, None);
                    }
                    if ledger.persist(store).is_err() {
                        return response(503, "storage_unavailable", None, None);
                    }
                }
                let attachment = attachment_descriptor_from_plaintext(&plaintext);
                if let Some(descriptor) = attachment {
                    if let Some(authority) = invite_authority.as_deref_mut() {
                        if authority
                            .register_received_attachment(&digest, descriptor, store)
                            .is_err()
                        {
                            return response(503, "attachment_state_unavailable", None, None);
                        }
                        let _ = authority.record_contact_message(
                            &conversation_id,
                            b"[encrypted attachment]",
                            now,
                            background,
                            store,
                        );
                    }
                    messages.push(format!(
                        r##"{{"id":"{}","digest":"{}","attachment_id":"{}"}}"##,
                        json_escape(&relay_id),
                        json_escape(&digest),
                        json_escape(&digest)
                    ));
                } else {
                    let message = decode_message_payload(&plaintext);
                    let expired = message
                        .as_ref()
                        .is_some_and(|item| item.expires_at != 0 && item.expires_at <= now);
                    let display_text = message
                        .as_ref()
                        .map(|item| item.text.as_bytes())
                        .unwrap_or(&plaintext);
                    if let Some(message) = message.as_ref().filter(|_| !expired) {
                        if persist_message(store, conversation_id, message, "incoming").is_err() {
                            return response(503, "message_storage_unavailable", None, None);
                        }
                    }
                    if let Some(authority) = invite_authority.as_deref_mut() {
                        if !expired {
                            let _ = authority.record_contact_message(
                                &conversation_id,
                                display_text,
                                now,
                                background,
                                store,
                            );
                        }
                    }
                    let metadata = message
                        .as_ref()
                        .map(|item| format!(r##","message_id":"{}","created_at":{},"expires_at":{},"expired":{}"##, json_escape(&item.id), item.created_at, item.expires_at, expired))
                        .unwrap_or_default();
                    messages.push(format!(
                        r##"{{"id":"{}","digest":"{}","plaintext":"{}"{} }}"##,
                        json_escape(&relay_id),
                        json_escape(&digest),
                        if expired {
                            "".to_owned()
                        } else {
                            hex_bytes(display_text)
                        },
                        metadata
                    ));
                }
                acknowledged_ids.push(relay_id.clone());
            }
            let acknowledged = if acknowledged_ids.is_empty() {
                0
            } else {
                match client.ack_blocking(&acknowledged_ids) {
                    Ok(value) => value,
                    Err(RelayError::Rejected(410)) => {
                        if let (Some(authority), Some(store)) = (
                            invite_authority.as_deref_mut(),
                            session_store.as_deref_mut(),
                        ) {
                            let _ = authority.invalidate_relay_binding(store);
                        }
                        return response(
                            409,
                            "relay_capability_expired",
                            None,
                            Some("application/json"),
                        );
                    }
                    Err(_) => {
                        return response(503, "relay_unavailable", None, Some("application/json"));
                    }
                }
            };
            if let Some(ledger) = delivery_ledger.as_deref_mut() {
                if ledger.persist(store).is_err() {
                    return response(503, "storage_unavailable", None, None);
                }
            }
            response(
                200,
                &format!(
                    r##"{{"acknowledged":{},"messages":[{}]}}"##,
                    acknowledged,
                    messages.join(",")
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/ack") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(ids) = json_string_array(request.body, "ids") else {
                return response(400, "invalid_delivery_ids", None, Some("application/json"));
            };
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let acknowledged = match RelayClient::new(endpoint).ack_blocking(&ids) {
                Ok(value) => value,
                Err(RelayError::Rejected(410)) => {
                    if let (Some(authority), Some(store)) = (
                        invite_authority.as_deref_mut(),
                        session_store.as_deref_mut(),
                    ) {
                        let _ = authority.invalidate_relay_binding(store);
                    }
                    return response(
                        409,
                        "relay_capability_expired",
                        None,
                        Some("application/json"),
                    );
                }
                Err(_) => {
                    return response(503, "relay_unavailable", None, Some("application/json"))
                }
            };
            let recipient_received = if let Some(ledger) = delivery_ledger.as_deref_mut() {
                let count = ledger.acknowledge_relay_ids(&ids);
                if let Some(store) = session_store.as_deref_mut() {
                    if ledger.persist(store).is_err() {
                        return response(503, "storage_unavailable", None, None);
                    }
                }
                count
            } else {
                0
            };
            response(
                200,
                &format!(
                    r##"{{"acknowledged":{},"recipient_received":{}}}"##,
                    acknowledged, recipient_received
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/session/lock") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "POST",
                cookie,
                csrf_token: request.header("x-ad-csrf"),
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            match bridge.authorize(&authorization, now) {
                Ok(()) => {
                    if let Some(catalog) = session_catalog.as_deref_mut() {
                        catalog.lock();
                    }
                    if let Some(authority) = invite_authority.as_deref_mut() {
                        authority.clear_attachment_state();
                    }
                    if let Some(store) = session_store.as_deref_mut() {
                        store.lock();
                    }
                    bridge.invalidate_session();
                    response(
                        200,
                        r##"{"status":"locked"}"##,
                        None,
                        Some("application/json"),
                    )
                }
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
        }
        ("POST", "/local-api/session/wipe") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if let Some(catalog) = session_catalog.as_deref_mut() {
                catalog.lock();
            }
            if let Some(authority) = invite_authority.as_deref_mut() {
                authority.clear_attachment_state();
            }
            if let Some(ledger) = delivery_ledger.as_deref_mut() {
                ledger.wipe();
            }
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            if store.wipe_files().is_err() {
                return response(503, "wipe_incomplete", None, Some("application/json"));
            }
            bridge.invalidate_session();
            response(
                200,
                r##"{"wiped":true,"remote_data":"not_deleted","browser_cache":"not_deleted"}"##,
                None,
                Some("application/json"),
            )
        }
        _ => response(404, "not_found", None, None),
    }
}

pub fn serve_forever(
    bridge: LocalBridge,
    ui_root: Option<&Path>,
    identity: Option<IdentityView>,
    invite_authority: Option<InviteAuthority>,
    session_catalog: MlsSessionCatalog,
    session_store: EncryptedStore,
    notifications_enabled: bool,
) -> std::io::Result<()> {
    let address = SocketAddr::new(bridge.bind_host(), bridge.port());
    let delivery_ledger = DeliveryLedger::restore(&session_store)
        .map_err(|error| io::Error::other(format!("delivery ledger restore failed: {error:?}")))?;
    let state = AppState {
        bridge: Arc::new(Mutex::new(bridge)),
        ui_root: ui_root.map(Path::to_path_buf),
        identity,
        invite_authority: invite_authority.map(|authority| Arc::new(Mutex::new(authority))),
        session_catalog: Arc::new(Mutex::new(session_catalog)),
        session_store: Arc::new(Mutex::new(session_store)),
        delivery_ledger: Arc::new(Mutex::new(delivery_ledger)),
    };
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_io()
        .enable_time()
        .build()
        .map_err(|error| io::Error::other(error.to_string()))?;
    runtime.block_on(async move {
        let listener = tokio::net::TcpListener::bind(address).await?;
        let maintenance_state = state.clone();
        let app = Router::new().fallback(any(axum_handler)).with_state(state);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(15));
            loop {
                interval.tick().await;
                let now = unix_now();
                let Some(authority) = maintenance_state
                    .invite_authority
                    .as_ref()
                    .and_then(|value| value.lock().ok())
                else {
                    continue;
                };
                let Ok(mut catalog) = maintenance_state.session_catalog.lock() else {
                    continue;
                };
                let Ok(mut store) = maintenance_state.session_store.lock() else {
                    continue;
                };
                let Ok(mut ledger) = maintenance_state.delivery_ledger.lock() else {
                    continue;
                };
                let mut authority = authority;
                let processed = background_sync_once(
                    &mut authority,
                    &mut catalog,
                    &mut store,
                    &mut ledger,
                    now,
                )
                .unwrap_or(0);
                notify_new_messages(notifications_enabled, processed);
                let retried = retry_due_deliveries(&mut authority, &mut ledger, &mut store, now);
                let changed = ledger.expire_due(now) > 0 || retried > 0;
                let expired_messages = store
                    .records_with_prefix(RecordClass::Message, "messages/")
                    .into_iter()
                    .filter_map(|(key, bytes)| {
                        let message = serde_json::from_slice::<StoredMessage>(&bytes).ok()?;
                        (message.expires_at != 0 && message.expires_at <= now).then_some(key)
                    })
                    .collect::<Vec<_>>();
                for key in expired_messages {
                    let _ = store.delete(RecordClass::Message, &key);
                }
                if changed {
                    let _ = ledger.persist(&mut store);
                }
            }
        });
        tokio::select! {
            result = axum::serve(listener, app) => result.map_err(|error| io::Error::other(error.to_string())),
            _ = shutdown_signal() => Ok(()),
        }
    })
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        let Ok(mut terminate) =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        else {
            let _ = tokio::signal::ctrl_c().await;
            return;
        };
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {},
            _ = terminate.recv() => {},
        }
    }
    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
    }
}

#[derive(Clone)]
struct AppState {
    bridge: Arc<Mutex<LocalBridge>>,
    ui_root: Option<PathBuf>,
    identity: Option<IdentityView>,
    invite_authority: Option<Arc<Mutex<InviteAuthority>>>,
    session_catalog: Arc<Mutex<MlsSessionCatalog>>,
    session_store: Arc<Mutex<EncryptedStore>>,
    delivery_ledger: Arc<Mutex<DeliveryLedger>>,
}

async fn axum_handler(State(state): State<AppState>, request: HttpRequest<Body>) -> Response<Body> {
    let (parts, body) = request.into_parts();
    let body = match tokio::time::timeout(
        Duration::from_secs(10),
        to_bytes(body, MAX_REQUEST_BYTES),
    )
    .await
    {
        Ok(Ok(body)) => body,
        Ok(Err(_)) => return axum_response(response(413, "request_too_large", None, None)),
        Err(_) => return axum_response(response(408, "request_timeout", None, None)),
    };
    let Some(raw) = axum_request_bytes(&parts, &body) else {
        return axum_response(response(400, "invalid_request", None, None));
    };
    let Ok(mut bridge) = state.bridge.lock() else {
        return axum_response(response(503, "bridge_unavailable", None, None));
    };
    let mut invite_guard = state
        .invite_authority
        .as_ref()
        .and_then(|authority| authority.lock().ok());
    let Ok(mut catalog) = state.session_catalog.lock() else {
        return axum_response(response(503, "session_unavailable", None, None));
    };
    let Ok(mut store) = state.session_store.lock() else {
        return axum_response(response(503, "storage_unavailable", None, None));
    };
    let Ok(mut delivery_ledger) = state.delivery_ledger.lock() else {
        return axum_response(response(503, "delivery_unavailable", None, None));
    };
    let output = handle_request_with_context(
        &mut bridge,
        &raw,
        unix_now(),
        state.ui_root.as_deref(),
        state.identity.as_ref(),
        invite_guard.as_deref_mut(),
        Some(&mut catalog),
        Some(&mut store),
        Some(&mut delivery_ledger),
    );
    axum_response(output)
}

fn authorize_api(bridge: &LocalBridge, request: &Request<'_>, now: u64) -> Result<(), Vec<u8>> {
    let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session") else {
        return Err(response(401, "session_invalid", None, None));
    };
    let authorization = BridgeRequest {
        origin: request.header("origin").unwrap_or(""),
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

fn catalog_error(error: SessionCatalogError) -> Vec<u8> {
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

fn pairing_ready(authority: Option<&InviteAuthority>) -> bool {
    authority.is_none_or(|value| value.pairing.can_message())
}

fn pairing_error(error: PairingError) -> Vec<u8> {
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

fn contact_directory_error(error: ContactDirectoryError) -> Vec<u8> {
    let (status, code) = match error {
        ContactDirectoryError::DuplicateDevice => (409, "contact_device_conflict"),
        ContactDirectoryError::ContactNotFound => (404, "contact_not_found"),
        ContactDirectoryError::InvalidAlias => (422, "invalid_alias"),
        ContactDirectoryError::Corrupt => (503, "contacts_storage_corrupt"),
        ContactDirectoryError::InvalidState => (422, "invalid_contact_state"),
    };
    response(status, code, None, Some("application/json"))
}

fn error_code(error: &crate::bridge::BridgeError) -> &'static str {
    match error {
        crate::bridge::BridgeError::InvalidRequestOrigin => "invalid_origin",
        crate::bridge::BridgeError::InvalidHost => "invalid_host",
        crate::bridge::BridgeError::CsrfRequired => "csrf_required",
        crate::bridge::BridgeError::SessionInvalid => "session_invalid",
        crate::bridge::BridgeError::BootstrapAlreadyConsumed => "bootstrap_consumed",
        _ => "bridge_rejected",
    }
}
fn unix_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn hex_bytes(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut result = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        result.push(HEX[(byte >> 4) as usize] as char);
        result.push(HEX[(byte & 0x0f) as usize] as char);
    }
    result
}

fn hex_decode(value: &str) -> Option<Vec<u8>> {
    if value.is_empty() || value.len() % 2 != 0 {
        return None;
    }
    value
        .as_bytes()
        .chunks_exact(2)
        .map(|pair| Some((hex_nibble(pair[0])? << 4) | hex_nibble(pair[1])?))
        .collect()
}

fn hex_nibble(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        axum_request_bytes, handle_request, handle_request_with_context, hex_bytes, IdentityView,
        InviteAuthority,
    };
    use crate::bridge::{BridgeConfig, LocalBridge};
    use crate::identity::AccountRootKey;
    use crate::mls_session::MlsSessionCatalog;
    use crate::storage::EncryptedStore;
    use axum::body::Body;
    use axum::http::{Request, Uri};
    use ed25519_dalek::{Signer, SigningKey};
    use sha2::{Digest, Sha256};
    use std::net::{IpAddr, Ipv4Addr};

    fn bridge() -> LocalBridge {
        LocalBridge::new(
            BridgeConfig::new(
                IpAddr::V4(Ipv4Addr::LOCALHOST),
                1420,
                "http://127.0.0.1:1420",
                "web-v1",
            )
            .unwrap(),
        )
        .unwrap()
    }
    fn token(bridge: &LocalBridge) -> String {
        bridge
            .bootstrap_url("/")
            .unwrap()
            .split("ad_bootstrap=")
            .nth(1)
            .unwrap()
            .to_owned()
    }
    fn request(method: &str, path: &str, body: &str, extra: &str) -> Vec<u8> {
        format!("{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:1420\r\nOrigin: http://127.0.0.1:1420\r\n{extra}\r\nContent-Length: {}\r\n\r\n{body}", body.len()).into_bytes()
    }

    #[test]
    fn exchange_status_and_lock_are_authenticated() {
        let mut daemon = bridge();
        let bootstrap = token(&daemon);
        let exchange = request(
            "POST",
            "/local-session/exchange",
            &format!(r##"{{"token":"{bootstrap}","ui_version":"web-v1"}}"##),
            "X-Ad-Ui-Version: web-v1",
        );
        let reply = String::from_utf8(handle_request(&mut daemon, &exchange, 10)).unwrap();
        assert!(reply.starts_with("HTTP/1.1 200"));
        assert!(reply.contains("csrf_token"));
        assert!(String::from_utf8(handle_request(
            &mut daemon,
            &request(
                "GET",
                "/local-api/status",
                "",
                "X-Ad-Ui-Version: web-v1\r\nCookie: ad_session=missing"
            ),
            11
        ))
        .unwrap()
        .starts_with("HTTP/1.1 403"));
    }

    #[test]
    fn axum_request_adapter_preserves_body_and_rejects_query_targets() {
        let request = Request::builder()
            .method("POST")
            .uri(Uri::from_static("/local-session/exchange"))
            .header("host", "127.0.0.1:1420")
            .header("origin", "http://127.0.0.1:1420")
            .body(Body::empty())
            .unwrap();
        let (parts, _) = request.into_parts();
        let raw = axum_request_bytes(&parts, br#"{"token":"x"}"#).unwrap();
        assert!(raw.ends_with(br#"{"token":"x"}"#));
        assert!(raw.windows(4).any(|window| window == b"\r\n\r\n"));

        let request = Request::builder()
            .method("GET")
            .uri(Uri::from_static("/local-api/status?debug=1"))
            .body(Body::empty())
            .unwrap();
        let (parts, _) = request.into_parts();
        assert!(axum_request_bytes(&parts, &[]).is_none());
    }

    #[test]
    fn authenticated_session_routes_to_daemon_owned_mls_catalog() {
        let mut daemon = bridge();
        let bootstrap = token(&daemon);
        let credentials = daemon
            .exchange(
                "http://127.0.0.1:1420",
                "127.0.0.1:1420",
                &bootstrap,
                "web-v1",
                10,
            )
            .unwrap();
        let path = std::env::temp_dir().join(format!(
            "another-dimension-bridge-session-{}",
            std::process::id()
        ));
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let mut catalog = MlsSessionCatalog::new();
        let identity = IdentityView {
            account_id: "ad1pkbridge".into(),
            device_id: "device-1".into(),
            display_name: "Bridge test".into(),
        };
        let reply = handle_request_with_context(
            &mut daemon,
            &request(
                "POST",
                "/local-api/session/create",
                r##"{"conversation_id":"conversation-1"}"##,
                &format!(
                    "X-Ad-Ui-Version: web-v1\r\nCookie: ad_session={}\r\nX-Ad-Csrf: {}",
                    credentials.cookie, credentials.csrf_token
                ),
            ),
            11,
            None,
            Some(&identity),
            None,
            Some(&mut catalog),
            Some(&mut store),
            None,
        );
        let reply = String::from_utf8(reply).unwrap();
        assert!(reply.starts_with("HTTP/1.1 201"));
        assert!(reply.contains("\"created\":true"));

        let unauthorized = handle_request_with_context(
            &mut daemon,
            &request(
                "POST",
                "/local-api/session/prepare",
                r##"{"conversation_id":"conversation-1"}"##,
                "X-Ad-Ui-Version: web-v1\r\nCookie: ad_session=missing\r\nX-Ad-Csrf: missing",
            ),
            12,
            None,
            Some(&identity),
            None,
            Some(&mut catalog),
            Some(&mut store),
            None,
        );
        assert!(String::from_utf8(unauthorized)
            .unwrap()
            .starts_with("HTTP/1.1 403"));
        drop(store);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(path.with_extension("revision"));
    }

    #[test]
    fn staged_invite_uses_relay_receipt_code_binding() {
        let mut daemon = bridge();
        let bootstrap = token(&daemon);
        let credentials = daemon
            .exchange(
                "http://127.0.0.1:1420",
                "127.0.0.1:1420",
                &bootstrap,
                "web-v1",
                10,
            )
            .unwrap();
        let path = std::env::temp_dir().join(format!(
            "another-dimension-pairing-stage-{}",
            std::process::id()
        ));
        let mut store = EncryptedStore::initialize(&path, "correct horse battery staple").unwrap();
        let local_root = AccountRootKey::from_seed([7_u8; 32]);
        let peer_root = AccountRootKey::from_seed([8_u8; 32]);
        let relay_key = SigningKey::from_bytes(&[9_u8; 32]);
        let relay_origin = "http://127.0.0.1:1420";
        let code = "MANGO-RIVER-7H2P-Q9DX";
        let payload = format!(
            "another-dimension/invite/v1\n{}\npeer-device\n{}\n{}\n{}",
            peer_root.account_id().as_str(),
            "00".repeat(32),
            610_u64,
            relay_origin
        );
        let signed_invite = format!(
            "ADDAINV1.{}.{}",
            hex_bytes(payload.as_bytes()),
            hex_bytes(&peer_root.sign(payload.as_bytes()))
        );
        let normalized_code: String = code
            .chars()
            .filter(|character| *character != '-')
            .flat_map(char::to_uppercase)
            .collect();
        let code_hash: [u8; 32] = Sha256::digest(normalized_code.as_bytes()).into();
        let invite_digest: [u8; 32] = Sha256::digest(signed_invite.as_bytes()).into();
        let key_id: [u8; 32] = Sha256::digest(relay_key.verifying_key().as_bytes()).into();
        let receipt_body = format!(
            "ADRECEIPT1.{}.{}.{}.{}.{}",
            hex_bytes(&key_id),
            hex_bytes(relay_origin.as_bytes()),
            hex_bytes(&code_hash),
            hex_bytes(&invite_digest),
            20_u64
        );
        let receipt = format!(
            "{}.{}",
            receipt_body,
            hex_bytes(&relay_key.sign(receipt_body.as_bytes()).to_bytes())
        );
        let mut authority = InviteAuthority::new(
            local_root,
            "local-device",
            relay_origin,
            None,
            Some(relay_key.verifying_key().to_bytes()),
            None,
            None,
        );
        let identity = IdentityView {
            account_id: authority.account_id.clone(),
            device_id: "local-device".into(),
            display_name: "Pairing stage test".into(),
        };
        let reply = handle_request_with_context(
            &mut daemon,
            &request(
                "POST",
                "/local-api/invites/stage",
                &format!(
                    r##"{{"invite_code":"{}","signed_invite":"{}","relay_receipt":"{}"}}"##,
                    code, signed_invite, receipt
                ),
                &format!(
                    "X-Ad-Ui-Version: web-v1\r\nCookie: ad_session={}\r\nX-Ad-Csrf: {}",
                    credentials.cookie, credentials.csrf_token
                ),
            ),
            20,
            None,
            Some(&identity),
            Some(&mut authority),
            None,
            Some(&mut store),
            None,
        );
        let reply = String::from_utf8(reply).unwrap();
        assert!(reply.starts_with("HTTP/1.1 200"), "{reply}");
        assert!(reply.contains(peer_root.account_id().as_str()));
        drop(store);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(path.with_extension("revision"));
    }

    #[test]
    fn json_error_responses_expose_stable_error_code() {
        let raw = String::from_utf8(super::response(
            403,
            "pairing_not_ready",
            None,
            Some("application/json"),
        ))
        .unwrap();
        let body = raw.split_once("\r\n\r\n").unwrap().1;
        assert_eq!(body, r##"{"error":"pairing_not_ready"}"##);
    }
}
