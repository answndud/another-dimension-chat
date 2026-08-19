#![allow(clippy::module_name_repetitions)]

#[path = "attachment_routes.rs"]
mod attachment_routes;
#[path = "authority.rs"]
mod authority;
#[path = "authority_routes.rs"]
mod authority_routes;
#[path = "delivery_routes.rs"]
mod delivery_routes;
#[path = "http_errors.rs"]
mod http_errors;
#[path = "http_server.rs"]
mod http_server;
#[path = "http_support.rs"]
mod http_support;
#[path = "maintenance.rs"]
mod maintenance;
#[path = "message_service.rs"]
mod message_service;
#[path = "mls_routes.rs"]
mod mls_routes;
#[path = "route_context.rs"]
mod route_context;
#[path = "session_routes.rs"]
mod session_routes;

use attachment_routes::handle_attachment_route;
pub(crate) use authority::validate_bound_inbox_url;
use authority::{
    mls_device_credential, verify_relay_receipt, verify_signed_invite, verify_signed_invite_unbound,
};
pub use authority::{IdentityView, InviteAuthority, VerifiedInvite};
use authority_routes::handle_authority_route;
use delivery_routes::{handle_delivery_route, process_sync_items, SyncProcessContext};
use http_errors::{
    authorize_api, catalog_error, contact_directory_error, error_code, pairing_error, pairing_ready,
};
pub use http_server::{serve_forever, serve_setup_forever};
use http_support::{
    axum_request_bytes, axum_response, cookie_value, delivery_state_name, json_bool, json_escape,
    json_string, json_string_array, json_u64, parse_request, response, static_file, Request,
};
use maintenance::{
    deliver_device_change_commits, fetch_inbox, notify_new_messages, process_inbox_items,
};
use message_service::{
    decode_message_payload, encode_message_payload, encoded_message_record, StoredMessage,
};
use mls_routes::handle_mls_route;
use route_context::RouteContext;
use session_routes::handle_session_route;

use crate::{
    attachment::{AttachmentDescriptor, AttachmentJob, EncryptedAttachment},
    bridge::LocalBridge,
    contacts::{ContactDirectory, ContactDirectoryError},
    delivery::{DeliveryLedger, RelayEnvelope},
    device::{DeviceRegistry, DeviceRegistryError},
    device_link::{DeviceLinkError, DeviceLinkRequest},
    identity::AccountRootKey,
    mls_session::{
        attachment_descriptor_from_plaintext, session_checkpoint_key, MlsSessionCatalog,
        SessionCatalogError,
    },
    pairing::{PairingError, PairingSession},
    relay_http::{RelayClient, RelayEndpoint, RelayError, RelayItem},
    storage::{EncryptedStore, RecordClass, RecordMutation, StorageError},
    trust::{relay_tls_pin_record_key, RelayTrust, TlsCertificatePin},
};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use sha2::{Digest, Sha256};
use std::{path::Path, process::Command};

const MAX_REQUEST_BYTES: usize = 192 * 1024;
const EXCHANGE_PATH: &str = "/local-session/exchange";
const BOOTSTRAP_UI_PATH: &str = "/__ad_ui__/current";
const MAX_INVITE_TTL_SECONDS: u64 = 10 * 60;
const COMPLETED_ATTACHMENT_TTL_SECONDS: u64 = 60 * 60;
const MAX_COMPLETED_ATTACHMENT_COUNT: usize = 2;
const MAX_COMPLETED_ATTACHMENT_BYTES: usize = 64 * 1024 * 1024;
const MAX_MESSAGE_TTL_SECONDS: u64 = 7 * 24 * 60 * 60;
pub(crate) const MAX_AUTOMATIC_RETRIES_PER_TICK: usize = 2;

/// HTTP boundary for the local bridge. It exposes only daemon-owned routes;
/// session state, identity, protocol state, and message material never leave
/// the daemon as raw private records.
pub fn handle_request(bridge: &mut LocalBridge, raw: &[u8], now: u64) -> Vec<u8> {
    handle_request_with_route_context(
        raw,
        RouteContext {
            bridge,
            now,
            ui_root: None,
            identity: None,
            invite_authority: None,
            session_catalog: None,
            session_store: None,
            delivery_ledger: None,
        },
    )
}

pub fn handle_request_with_ui(
    bridge: &mut LocalBridge,
    raw: &[u8],
    now: u64,
    ui_root: Option<&Path>,
) -> Vec<u8> {
    handle_request_with_route_context(
        raw,
        RouteContext {
            bridge,
            now,
            ui_root,
            identity: None,
            invite_authority: None,
            session_catalog: None,
            session_store: None,
            delivery_ledger: None,
        },
    )
}

/// Handles only the safe first-run surface. No identity, storage, messaging,
/// pairing, or relay context is available before a profile is created.
pub fn handle_setup_request(
    bridge: &mut LocalBridge,
    raw: &[u8],
    now: u64,
    ui_root: Option<&Path>,
    data_dir: &Path,
    setup_status: &str,
) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    if request.method == "GET" && request.path == "/local-api/status" {
        return match authorize_api(bridge, &request, now) {
            Ok(()) => response(
                200,
                &format!(
                    r#"{{"status":"{}","high_risk":false,"private_state":"not-initialized","relay_configured":false,"storage_records":0}}"#,
                    json_escape(setup_status)
                ),
                None,
                Some("application/json"),
            ),
            Err(reply) => reply,
        };
    }
    if request.method == "POST" && request.path == "/local-api/setup/profile" {
        if setup_status != "not_initialized" {
            return response(
                409,
                "profile_setup_unavailable",
                None,
                Some("application/json"),
            );
        }
        let Ok(()) = authorize_api(bridge, &request, now) else {
            return response(401, "session_invalid", None, Some("application/json"));
        };
        let Some(display_name) = json_string(request.body, "display_name") else {
            return response(400, "display_name_required", None, Some("application/json"));
        };
        if display_name.trim().is_empty() || display_name.chars().count() > 80 {
            return response(400, "display_name_invalid", None, Some("application/json"));
        }
        return match crate::cli::profile::init_from_setup(data_dir, display_name.trim()) {
            Ok(output) => {
                let account_id = output
                    .lines()
                    .find_map(|line| line.strip_prefix("account_id: "))
                    .unwrap_or("");
                response(
                    200,
                    &format!(
                        r#"{{"status":"profile-created","account_id":"{}"}}"#,
                        json_escape(account_id)
                    ),
                    None,
                    Some("application/json"),
                )
            }
            Err(crate::cli::CliError::AlreadyInitialized) => {
                response(409, "already_initialized", None, Some("application/json"))
            }
            Err(_) => response(
                500,
                "profile_initialization_failed",
                None,
                Some("application/json"),
            ),
        };
    }
    if (request.method == "POST" && request.path == EXCHANGE_PATH)
        || (request.method == "GET"
            && (request.path == "/"
                || request.path == "/index.html"
                || request.path == BOOTSTRAP_UI_PATH
                || request.path.starts_with("/assets/")
                || request.path == "/manifest.webmanifest"))
    {
        return handle_request_with_ui(bridge, raw, now, ui_root);
    }
    if request.path.starts_with("/local-api/") || request.path.starts_with("/local-session/") {
        return response(
            409,
            "profile_not_initialized",
            None,
            Some("application/json"),
        );
    }
    response(404, "not_found", None, None)
}

pub(crate) enum DeviceActionError {
    Registry(DeviceRegistryError),
    Link(DeviceLinkError),
    CurrentDevice,
    RootUnavailable,
    Storage,
}

pub(crate) fn handle_request_with_route_context(raw: &[u8], context: RouteContext<'_>) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let mut context = context;
    if let Some(authority) = context.invite_authority.as_deref_mut() {
        authority.purge_attachment_state(context.now);
    }
    if let Some(reply) = handle_session_route(&request, &mut context) {
        return reply;
    }
    if let Some(reply) = handle_mls_route(&request, &mut context) {
        return reply;
    }
    if let Some(reply) = handle_attachment_route(&request, &mut context) {
        return reply;
    }
    if let Some(reply) = handle_delivery_route(&request, &mut context) {
        return reply;
    }
    if let Some(reply) = handle_authority_route(&request, &mut context) {
        return reply;
    }
    let ui_root = context.ui_root;
    match (request.method, request.path) {
        ("GET", "/") | ("GET", "/index.html") | ("GET", BOOTSTRAP_UI_PATH) => {
            static_file(ui_root, "index.html")
                .unwrap_or_else(|| response(404, "ui_not_found", None, None))
        }
        ("GET", path) if path.starts_with("/assets/") || path == "/manifest.webmanifest" => {
            let relative = path.trim_start_matches('/');
            static_file(ui_root, relative)
                .unwrap_or_else(|| response(404, "ui_not_found", None, None))
        }
        _ => response(404, "not_found", None, None),
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
    if value.is_empty() || !value.len().is_multiple_of(2) {
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
        axum_request_bytes, handle_request, handle_request_with_route_context, hex_bytes,
        IdentityView, InviteAuthority, RouteContext,
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
    fn chromium_same_origin_get_may_omit_origin_but_wrong_origin_is_rejected() {
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
        let browser_get = format!(
            "GET /local-api/status HTTP/1.1\r\nHost: 127.0.0.1:1420\r\nX-Ad-Ui-Version: web-v1\r\nCookie: ad_session={}\r\nContent-Length: 0\r\n\r\n",
            credentials.cookie
        );
        assert!(
            String::from_utf8(handle_request(&mut daemon, browser_get.as_bytes(), 11))
                .unwrap()
                .starts_with("HTTP/1.1 200")
        );

        let cross_site = browser_get.replace(
            "Host: 127.0.0.1:1420\r\n",
            "Host: 127.0.0.1:1420\r\nOrigin: https://attacker.example\r\n",
        );
        assert!(
            String::from_utf8(handle_request(&mut daemon, cross_site.as_bytes(), 12))
                .unwrap()
                .starts_with("HTTP/1.1 403")
        );
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
        let reply = handle_request_with_route_context(
            &request(
                "POST",
                "/local-api/session/create",
                r##"{"conversation_id":"conversation-1"}"##,
                &format!(
                    "X-Ad-Ui-Version: web-v1\r\nCookie: ad_session={}\r\nX-Ad-Csrf: {}",
                    credentials.cookie, credentials.csrf_token
                ),
            ),
            RouteContext {
                bridge: &mut daemon,
                now: 11,
                ui_root: None,
                identity: Some(&identity),
                invite_authority: None,
                session_catalog: Some(&mut catalog),
                session_store: Some(&mut store),
                delivery_ledger: None,
            },
        );
        let reply = String::from_utf8(reply).unwrap();
        assert!(reply.starts_with("HTTP/1.1 201"));
        assert!(reply.contains("\"created\":true"));

        let unauthorized = handle_request_with_route_context(
            &request(
                "POST",
                "/local-api/session/prepare",
                r##"{"conversation_id":"conversation-1"}"##,
                "X-Ad-Ui-Version: web-v1\r\nCookie: ad_session=missing\r\nX-Ad-Csrf: missing",
            ),
            RouteContext {
                bridge: &mut daemon,
                now: 12,
                ui_root: None,
                identity: Some(&identity),
                invite_authority: None,
                session_catalog: Some(&mut catalog),
                session_store: Some(&mut store),
                delivery_ledger: None,
            },
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
        let reply = handle_request_with_route_context(
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
            RouteContext {
                bridge: &mut daemon,
                now: 20,
                ui_root: None,
                identity: Some(&identity),
                invite_authority: Some(&mut authority),
                session_catalog: None,
                session_store: Some(&mut store),
                delivery_ledger: None,
            },
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

    #[test]
    fn unknown_delivery_route_fails_closed_instead_of_panicking() {
        let mut daemon = bridge();
        let reply = handle_request(
            &mut daemon,
            &request("POST", "/local-api/delivery/not-a-route", "{}", ""),
            10,
        );
        assert!(String::from_utf8(reply)
            .unwrap()
            .starts_with("HTTP/1.1 404"));
    }
}
