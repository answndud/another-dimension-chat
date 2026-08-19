use super::{
    authorize_api, axum_request_bytes, axum_response, contact_directory_error,
    handle_request_with_route_context, hex_bytes, hex_decode, json_escape, json_string, json_u64,
    mls_device_credential, notify_new_messages, pairing_error, pairing_ready, parse_request,
    response, unix_now, validate_bound_inbox_url, verify_relay_receipt,
    verify_signed_invite_unbound, IdentityView, InviteAuthority, Request, RouteContext,
    StoredMessage, VerifiedInvite, MAX_REQUEST_BYTES,
};
use super::{fetch_inbox, process_inbox_items, MAX_AUTOMATIC_RETRIES_PER_TICK};
use super::{process_sync_items, SyncProcessContext};
use crate::{
    bridge::LocalBridge,
    delivery::{DeliveryLedger, DeliveryRecord, RelayEnvelope},
    mls_session::{session_checkpoint_key, MlsSessionCatalog},
    relay_http::{RelayClient, RelayEndpoint, RelayError},
    storage::{EncryptedStore, RecordClass, RecordMutation},
    trust::TlsCertificatePin,
};
use axum::{
    body::{to_bytes, Body},
    extract::State,
    http::Request as HttpRequest,
    response::Response,
    routing::any,
    Router,
};
use std::{
    io,
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tokio::sync::Semaphore;

const MAX_BLOCKING_REQUESTS: usize = 2;

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
        blocking_slots: Arc::new(Semaphore::new(MAX_BLOCKING_REQUESTS)),
        shutting_down: Arc::new(AtomicBool::new(false)),
    };
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_io()
        .enable_time()
        .build()
        .map_err(|error| io::Error::other(error.to_string()))?;
    runtime.block_on(async move {
        let listener = tokio::net::TcpListener::bind(address).await?;
        let maintenance_state = state.clone();
        let shutdown_state = state.clone();
        let app = Router::new().fallback(any(axum_handler)).with_state(state);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(15));
            loop {
                interval.tick().await;
                if maintenance_state.shutting_down.load(Ordering::Acquire) {
                    break;
                }
                let Ok(maintenance_permit) = maintenance_state
                    .blocking_slots
                    .clone()
                    .acquire_owned()
                    .await
                else {
                    break;
                };
                let state_for_tick = maintenance_state.clone();
                let processed = tokio::task::spawn_blocking(move || {
                    let _maintenance_permit = maintenance_permit;
                    let processed = run_maintenance_tick(&state_for_tick, unix_now());
                    if notifications_enabled && processed > 0 {
                        notify_new_messages(true, processed);
                    }
                    processed
                })
                .await
                .unwrap_or(0);
                let _ = processed;
            }
        });
        tokio::select! {
            result = axum::serve(listener, app) => {
                shutdown_state.shutting_down.store(true, Ordering::Release);
                drain_blocking_work(&shutdown_state).await?;
                result.map_err(|error| io::Error::other(error.to_string()))
            },
            _ = shutdown_signal() => {
                shutdown_state.shutting_down.store(true, Ordering::Release);
                drain_blocking_work(&shutdown_state).await?;
                Ok(())
            },
        }
    })
}

async fn drain_blocking_work(state: &AppState) -> io::Result<()> {
    match tokio::time::timeout(
        Duration::from_secs(10),
        state
            .blocking_slots
            .clone()
            .acquire_many_owned(MAX_BLOCKING_REQUESTS as u32),
    )
    .await
    {
        Ok(Ok(_permits)) => Ok(()),
        Ok(Err(_)) => Err(io::Error::other("shutdown drain semaphore unavailable")),
        Err(_) => {
            eprintln!("daemon shutdown drain timed out; in-flight work was not confirmed complete");
            Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "daemon shutdown drain timed out",
            ))
        }
    }
}

#[derive(Clone, Copy)]
enum DetachedDeliveryRoute {
    Post,
    Retry,
    Ack,
    Sync,
}

#[derive(Clone, Copy)]
enum DetachedAttachmentRoute {
    UploadChunk,
    UploadCompleted,
    DownloadChunk,
    Send,
}

#[derive(Clone, Copy)]
enum DetachedAuthorityRoute {
    Create,
    Consume,
    Revoke,
    AutoSync,
    CompleteSession,
    Approve,
}

fn detached_delivery_route(raw: &[u8]) -> Option<DetachedDeliveryRoute> {
    parse_request(raw)
        .ok()
        .and_then(|request| match (request.method, request.path) {
            ("POST", "/local-api/delivery/post") => Some(DetachedDeliveryRoute::Post),
            ("POST", "/local-api/delivery/retry") => Some(DetachedDeliveryRoute::Retry),
            ("POST", "/local-api/delivery/ack") => Some(DetachedDeliveryRoute::Ack),
            ("POST", "/local-api/delivery/sync") => Some(DetachedDeliveryRoute::Sync),
            _ => None,
        })
}

fn detached_attachment_route(raw: &[u8]) -> Option<DetachedAttachmentRoute> {
    parse_request(raw)
        .ok()
        .and_then(|request| match (request.method, request.path) {
            ("POST", "/local-api/attachment/upload-chunk") => {
                Some(DetachedAttachmentRoute::UploadChunk)
            }
            ("POST", "/local-api/attachment/upload-completed") => {
                Some(DetachedAttachmentRoute::UploadCompleted)
            }
            ("POST", "/local-api/attachment/download-chunk") => {
                Some(DetachedAttachmentRoute::DownloadChunk)
            }
            ("POST", "/local-api/attachment/send") => Some(DetachedAttachmentRoute::Send),
            _ => None,
        })
}

fn detached_authority_route(raw: &[u8]) -> Option<DetachedAuthorityRoute> {
    parse_request(raw)
        .ok()
        .and_then(|request| match (request.method, request.path) {
            ("POST", "/local-api/invites") => Some(DetachedAuthorityRoute::Create),
            ("POST", "/local-api/invites/consume") => Some(DetachedAuthorityRoute::Consume),
            ("POST", "/local-api/invites/revoke") => Some(DetachedAuthorityRoute::Revoke),
            ("POST", "/local-api/pairing/auto-sync") => Some(DetachedAuthorityRoute::AutoSync),
            ("POST", "/local-api/pairing/complete-session") => {
                Some(DetachedAuthorityRoute::CompleteSession)
            }
            ("POST", "/local-api/pairing/approve") => Some(DetachedAuthorityRoute::Approve),
            _ => None,
        })
}

fn handle_detached_create_invite(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let bridge = match state.bridge.lock() {
        Ok(bridge) => bridge,
        Err(_) => return response(503, "bridge_unavailable", None, None),
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    drop(bridge);
    let Some(identity) = state.identity.as_ref() else {
        return response(503, "identity_unavailable", None, None);
    };
    let (conversation_id, signed_invite, inbox_url, pin) = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "invite_unavailable", None, None);
        };
        let Ok(mut authority) = authority.lock() else {
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
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        if let Err(error) = authority.mark_invite_created(&mut store) {
            return super::pairing_error(error);
        }
        let mut conversation_bytes = [0_u8; 16];
        if getrandom::fill(&mut conversation_bytes).is_err() {
            return response(503, "randomness_unavailable", None, None);
        }
        let conversation_id = format!("adconv{}", hex_bytes(&conversation_bytes));
        let Some((_internal_code, signed_invite)) = authority.create(now, Some(&conversation_id))
        else {
            return response(503, "randomness_unavailable", None, None);
        };
        let Some(inbox_url) = authority.inbox_url.clone() else {
            return response(503, "relay_unavailable", None, Some("application/json"));
        };
        (
            conversation_id,
            signed_invite,
            inbox_url,
            authority.relay_tls_pin,
        )
    };
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(&inbox_url, pin) else {
        return response(503, "relay_unavailable", None, Some("application/json"));
    };
    let Ok(invite_code) = RelayClient::new(endpoint).create_invite_code_blocking(&signed_invite)
    else {
        return response(503, "relay_unavailable", None, Some("application/json"));
    };
    {
        let Ok(mut catalog) = state.session_catalog.lock() else {
            return response(503, "session_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        if catalog
            .create(
                &conversation_id,
                mls_device_credential(&identity.account_id, &identity.device_id),
                &mut store,
            )
            .is_err()
        {
            return response(503, "session_unavailable", None, None);
        }
    }
    let Some(authority) = state.invite_authority.as_ref() else {
        return response(503, "invite_unavailable", None, None);
    };
    let Ok(mut authority) = authority.lock() else {
        return response(503, "invite_unavailable", None, None);
    };
    authority.pending_rendezvous_code = Some(invite_code.code.clone());
    authority.pending_conversation_id = Some(conversation_id.clone());
    response(
        200,
        &format!(
            r##"{{"invite_code":"{}","expires_at":{},"invite_digest":"{}","conversation_id":"{}"}}"##,
            json_escape(&invite_code.code),
            invite_code.expires_at,
            json_escape(&invite_code.invite_digest),
            json_escape(&conversation_id)
        ),
        None,
        Some("application/json"),
    )
}

fn handle_detached_consume_invite(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let bridge = match state.bridge.lock() {
        Ok(bridge) => bridge,
        Err(_) => return response(503, "bridge_unavailable", None, None),
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    drop(bridge);
    let Some(code) = json_string(request.body, "invite_code") else {
        return response(400, "invalid_invite", None, Some("application/json"));
    };
    let (default_origin, pin, relay_public_key) = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "invite_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "invite_unavailable", None, None);
        };
        (
            authority.relay_origin.clone(),
            authority.relay_tls_pin,
            authority.relay_public_key,
        )
    };
    let requested_origin =
        json_string(request.body, "relay_origin").unwrap_or(default_origin.as_str());
    let Ok(endpoint) = RelayEndpoint::for_public_origin_with_pin(requested_origin, pin) else {
        return response(
            409,
            "relay_retrust_required",
            None,
            Some("application/json"),
        );
    };
    let Ok(consumed) = RelayClient::new(endpoint.clone()).consume_invite_code_blocking(code) else {
        return response(422, "invalid_invite", None, Some("application/json"));
    };
    let Some(invite) = verify_signed_invite_unbound(&consumed.invite, now) else {
        return response(422, "invalid_invite", None, Some("application/json"));
    };
    let relay_receipt_trusted = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "invite_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "invite_unavailable", None, None);
        };
        verify_relay_receipt(
            code,
            &consumed.invite,
            &consumed.receipt,
            &invite,
            relay_public_key,
            authority.relay_trust.as_ref(),
            now,
        )
    };
    if !relay_receipt_trusted {
        return response(422, "invalid_relay_receipt", None, Some("application/json"));
    }
    let Some(conversation_id) = invite.conversation_id.as_deref() else {
        return response(
            409,
            "invite_missing_conversation",
            None,
            Some("application/json"),
        );
    };
    let Some(identity) = state.identity.as_ref() else {
        return response(503, "identity_unavailable", None, None);
    };
    {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "invite_unavailable", None, None);
        };
        let Ok(mut authority) = authority.lock() else {
            return response(503, "invite_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        if let Err(error) = authority.stage_peer(invite.clone(), now, &mut store) {
            return super::pairing_error(error);
        }
    }
    let key_package = {
        let Ok(mut catalog) = state.session_catalog.lock() else {
            return response(503, "session_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        match catalog.prepare(
            conversation_id,
            mls_device_credential(&identity.account_id, &identity.device_id),
            &mut store,
        ) {
            Ok(value) => value,
            Err(_) => return response(503, "session_unavailable", None, None),
        }
    };
    let (relay_origin, inbox_url) = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "invite_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "invite_unavailable", None, None);
        };
        (authority.relay_origin.clone(), authority.inbox_url.clone())
    };
    let pairing_response = serde_json::json!({
        "kind": "key-package",
        "conversation_id": conversation_id,
        "account_id": identity.account_id,
        "device_id": identity.device_id,
        "key_package": hex_bytes(&key_package),
        "relay_origin": relay_origin,
        "inbox_url": inbox_url,
    });
    if RelayClient::new(endpoint)
        .write_pairing_response_blocking(code, &pairing_response)
        .is_err()
    {
        return response(
            503,
            "pairing_rendezvous_unavailable",
            None,
            Some("application/json"),
        );
    }
    let Some(authority) = state.invite_authority.as_ref() else {
        return response(503, "invite_unavailable", None, None);
    };
    let Ok(mut authority) = authority.lock() else {
        return response(503, "invite_unavailable", None, None);
    };
    authority.pending_rendezvous_code = Some(code.to_owned());
    authority.pending_conversation_id = Some(conversation_id.to_owned());
    let safety_number = authority.pairing.safety_number().unwrap_or_default();
    let inbox_url = invite
        .inbox_url
        .as_deref()
        .map(|value| format!(r##""{}""##, json_escape(value)))
        .unwrap_or_else(|| "null".to_owned());
    response(
        200,
        &format!(
            r##"{{"staged":true,"state":"verified","safety_verified":false,"safety_number":"{}","account_id":"{}","device_id":"{}","expires_at":{},"inbox_url":{},"conversation_id":"{}"}}"##,
            json_escape(&safety_number),
            json_escape(&invite.account_id),
            json_escape(&invite.device_id),
            invite.expires_at,
            inbox_url,
            json_escape(conversation_id),
        ),
        None,
        Some("application/json"),
    )
}

fn handle_detached_pairing_auto_sync(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let bridge = match state.bridge.lock() {
        Ok(bridge) => bridge,
        Err(_) => return response(503, "bridge_unavailable", None, None),
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    drop(bridge);
    let Some(code) = json_string(request.body, "invite_code") else {
        return response(400, "invalid_invite", None, Some("application/json"));
    };
    let (endpoint, pending_conversation_id, local_account_id, already_staged) = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "pairing_unavailable", None, None);
        };
        if authority.pending_rendezvous_code.as_deref() != Some(code) {
            return response(
                409,
                "pairing_rendezvous_unknown",
                None,
                Some("application/json"),
            );
        }
        let Some(endpoint) = RelayEndpoint::for_public_origin_with_pin(
            &authority.relay_origin,
            authority.relay_tls_pin,
        )
        .ok() else {
            return response(503, "relay_unavailable", None, None);
        };
        (
            endpoint,
            authority.pending_conversation_id.clone(),
            authority.account_id.clone(),
            authority.pending_key_package.is_some(),
        )
    };
    if already_staged {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let safety_number = authority.pairing.safety_number().unwrap_or_default();
        return response(
            200,
            &format!(
                r##"{{"state":"verified","safety_verified":false,"safety_number":"{}"}}"##,
                json_escape(&safety_number)
            ),
            None,
            Some("application/json"),
        );
    }
    let Ok(Some(rendezvous)) = RelayClient::new(endpoint).read_pairing_response_blocking(code)
    else {
        return response(
            200,
            r##"{"state":"waiting"}"##,
            None,
            Some("application/json"),
        );
    };
    let Some(kind) = rendezvous.get("kind").and_then(serde_json::Value::as_str) else {
        return response(
            200,
            r##"{"state":"waiting"}"##,
            None,
            Some("application/json"),
        );
    };
    if kind != "key-package" {
        return response(
            422,
            "invalid_pairing_response",
            None,
            Some("application/json"),
        );
    }
    let package_response = &rendezvous;
    let Some(conversation_id) = package_response
        .get("conversation_id")
        .and_then(serde_json::Value::as_str)
    else {
        return response(
            422,
            "invalid_pairing_response",
            None,
            Some("application/json"),
        );
    };
    if pending_conversation_id.as_deref() != Some(conversation_id) {
        return response(
            422,
            "pairing_conversation_mismatch",
            None,
            Some("application/json"),
        );
    }
    let Some(account_id) = package_response
        .get("account_id")
        .and_then(serde_json::Value::as_str)
    else {
        return response(
            422,
            "invalid_pairing_response",
            None,
            Some("application/json"),
        );
    };
    let Some(device_id) = package_response
        .get("device_id")
        .and_then(serde_json::Value::as_str)
    else {
        return response(
            422,
            "invalid_pairing_response",
            None,
            Some("application/json"),
        );
    };
    let Some(key_package) = package_response
        .get("key_package")
        .and_then(serde_json::Value::as_str)
        .and_then(hex_decode)
    else {
        return response(
            422,
            "invalid_pairing_response",
            None,
            Some("application/json"),
        );
    };
    let Some(relay_origin) = package_response
        .get("relay_origin")
        .and_then(serde_json::Value::as_str)
    else {
        return response(
            422,
            "invalid_pairing_response",
            None,
            Some("application/json"),
        );
    };
    let Some(inbox_url) = package_response
        .get("inbox_url")
        .and_then(serde_json::Value::as_str)
    else {
        return response(
            422,
            "invalid_pairing_response",
            None,
            Some("application/json"),
        );
    };
    if validate_bound_inbox_url(relay_origin, inbox_url).is_err() || account_id == local_account_id
    {
        return response(
            422,
            "invalid_pairing_response",
            None,
            Some("application/json"),
        );
    }
    let peer = VerifiedInvite {
        account_id: account_id.to_owned(),
        device_id: device_id.to_owned(),
        expires_at: now.saturating_add(600),
        relay_origin: relay_origin.to_owned(),
        inbox_url: Some(inbox_url.to_owned()),
        conversation_id: Some(conversation_id.to_owned()),
    };
    let Some(authority) = state.invite_authority.as_ref() else {
        return response(503, "pairing_unavailable", None, None);
    };
    let Ok(mut authority) = authority.lock() else {
        return response(503, "pairing_unavailable", None, None);
    };
    let Ok(mut store) = state.session_store.lock() else {
        return response(503, "storage_unavailable", None, None);
    };
    if let Err(error) = authority.stage_peer(peer, now, &mut store) {
        return super::pairing_error(error);
    }
    authority.pending_key_package = Some(key_package);
    let safety_number = authority.pairing.safety_number().unwrap_or_default();
    response(
        200,
        &format!(
            r##"{{"state":"verified","safety_verified":false,"safety_number":"{}","account_id":"{}","device_id":"{}","conversation_id":"{}","relay_origin":"{}","inbox_url":"{}"}}"##,
            json_escape(&safety_number),
            json_escape(account_id),
            json_escape(device_id),
            json_escape(conversation_id),
            json_escape(relay_origin),
            json_escape(inbox_url)
        ),
        None,
        Some("application/json"),
    )
}

fn handle_detached_pairing_complete_session(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let bridge = match state.bridge.lock() {
        Ok(bridge) => bridge,
        Err(_) => return response(503, "bridge_unavailable", None, None),
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    drop(bridge);
    let Some(code) = json_string(request.body, "invite_code") else {
        return response(400, "invalid_invite", None, Some("application/json"));
    };
    let (endpoint, conversation_id) = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "pairing_unavailable", None, None);
        };
        if authority.pending_rendezvous_code.as_deref() != Some(code) {
            return response(
                409,
                "pairing_rendezvous_unknown",
                None,
                Some("application/json"),
            );
        }
        let Some(conversation_id) = authority.pending_conversation_id.clone() else {
            return response(
                409,
                "pairing_conversation_unknown",
                None,
                Some("application/json"),
            );
        };
        let Ok(endpoint) = RelayEndpoint::for_public_origin_with_pin(
            &authority.relay_origin,
            authority.relay_tls_pin,
        ) else {
            return response(503, "relay_unavailable", None, None);
        };
        (endpoint, conversation_id)
    };
    let Ok(Some(rendezvous)) = RelayClient::new(endpoint).read_pairing_response_blocking(code)
    else {
        return response(
            200,
            r##"{"state":"waiting"}"##,
            None,
            Some("application/json"),
        );
    };
    let Some(kind) = rendezvous.get("kind").and_then(serde_json::Value::as_str) else {
        return response(
            200,
            r##"{"state":"waiting"}"##,
            None,
            Some("application/json"),
        );
    };
    if kind != "welcome" {
        return response(422, "invalid_welcome", None, Some("application/json"));
    }
    let welcome_response = &rendezvous;
    if welcome_response
        .get("conversation_id")
        .and_then(serde_json::Value::as_str)
        != Some(conversation_id.as_str())
    {
        return response(
            422,
            "pairing_conversation_mismatch",
            None,
            Some("application/json"),
        );
    }
    let Some(welcome) = welcome_response
        .get("welcome")
        .and_then(serde_json::Value::as_str)
        .and_then(hex_decode)
    else {
        return response(422, "invalid_welcome", None, Some("application/json"));
    };
    let Some(identity) = state.identity.as_ref() else {
        return response(503, "identity_unavailable", None, None);
    };
    let Ok(mut catalog) = state.session_catalog.lock() else {
        return response(503, "session_unavailable", None, None);
    };
    let Ok(mut store) = state.session_store.lock() else {
        return response(503, "storage_unavailable", None, None);
    };
    if catalog
        .join(
            &conversation_id,
            mls_device_credential(&identity.account_id, &identity.device_id),
            &welcome,
            &mut store,
        )
        .is_err()
    {
        return response(422, "invalid_welcome", None, Some("application/json"));
    }
    drop(store);
    drop(catalog);
    let Some(authority) = state.invite_authority.as_ref() else {
        return response(503, "pairing_unavailable", None, None);
    };
    let Ok(mut authority) = authority.lock() else {
        return response(503, "pairing_unavailable", None, None);
    };
    let Ok(mut store) = state.session_store.lock() else {
        return response(503, "storage_unavailable", None, None);
    };
    if let Err(error) = authority.approve_pairing(now, &mut store) {
        return pairing_error(error);
    }
    if let Err(error) = authority.register_approved_contact(now, &mut store) {
        return contact_directory_error(error);
    }
    authority.pending_rendezvous_code = None;
    authority.pending_conversation_id = None;
    response(
        200,
        r##"{"state":"joined","joined":true}"##,
        None,
        Some("application/json"),
    )
}

fn handle_detached_pairing_approve(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let bridge = match state.bridge.lock() {
        Ok(bridge) => bridge,
        Err(_) => return response(503, "bridge_unavailable", None, None),
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    drop(bridge);

    let pending = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(mut authority) = authority.lock() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        if let Err(error) = authority.approve_pairing(now, &mut store) {
            return pairing_error(error);
        }
        if let Err(error) = authority.register_approved_contact(now, &mut store) {
            return contact_directory_error(error);
        }
        let Some(key_package) = authority.pending_key_package.clone() else {
            return response(
                200,
                r##"{"state":"established","approved":true}"##,
                None,
                Some("application/json"),
            );
        };
        let Some(code) = authority.pending_rendezvous_code.clone() else {
            return response(
                200,
                r##"{"state":"established","approved":true}"##,
                None,
                Some("application/json"),
            );
        };
        let Some(conversation_id) = authority.pending_conversation_id.clone() else {
            return response(
                200,
                r##"{"state":"established","approved":true}"##,
                None,
                Some("application/json"),
            );
        };
        let Ok(endpoint) = RelayEndpoint::for_public_origin_with_pin(
            &authority.relay_origin,
            authority.relay_tls_pin,
        ) else {
            return response(503, "relay_unavailable", None, None);
        };
        Some((key_package, code, conversation_id, endpoint))
    };
    let Some((key_package, code, conversation_id, endpoint)) = pending else {
        return response(
            200,
            r##"{"state":"established","approved":true}"##,
            None,
            Some("application/json"),
        );
    };
    let welcome = {
        let Ok(mut catalog) = state.session_catalog.lock() else {
            return response(503, "session_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        match catalog.add_member(&conversation_id, &key_package, &mut store) {
            Ok(value) => value,
            Err(_) => return response(503, "session_unavailable", None, None),
        }
    };
    let welcome_response = serde_json::json!({
        "kind": "welcome",
        "conversation_id": conversation_id,
        "welcome": hex_bytes(&welcome),
    });
    if RelayClient::new(endpoint)
        .write_pairing_response_blocking(&code, &welcome_response)
        .is_err()
    {
        return response(
            503,
            "pairing_rendezvous_unavailable",
            None,
            Some("application/json"),
        );
    }
    if let Some(authority) = state.invite_authority.as_ref() {
        if let Ok(mut authority) = authority.lock() {
            authority.pending_key_package = None;
        }
    }
    response(
        200,
        r##"{"state":"established","approved":true}"##,
        None,
        Some("application/json"),
    )
}

fn handle_detached_revoke_invite(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let bridge = match state.bridge.lock() {
        Ok(bridge) => bridge,
        Err(_) => return response(503, "bridge_unavailable", None, None),
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    drop(bridge);
    let Some(code) = json_string(request.body, "invite_code") else {
        return response(400, "invalid_invite", None, Some("application/json"));
    };
    let (inbox_url, pin) = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "invite_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "invite_unavailable", None, None);
        };
        let Some(inbox_url) = authority.inbox_url.clone() else {
            return response(503, "relay_unavailable", None, Some("application/json"));
        };
        (inbox_url, authority.relay_tls_pin)
    };
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(&inbox_url, pin) else {
        return response(503, "relay_unavailable", None, Some("application/json"));
    };
    match RelayClient::new(endpoint).revoke_invite_code_blocking(code) {
        Ok(()) => response(200, r##"{"revoked":true}"##, None, Some("application/json")),
        Err(RelayError::Rejected(status)) => {
            response(status, "relay_rejected", None, Some("application/json"))
        }
        Err(_) => response(503, "relay_unavailable", None, Some("application/json")),
    }
}

fn handle_detached_authority(
    state: &AppState,
    route: DetachedAuthorityRoute,
    raw: &[u8],
    now: u64,
) -> Vec<u8> {
    match route {
        DetachedAuthorityRoute::Create => handle_detached_create_invite(state, raw, now),
        DetachedAuthorityRoute::Consume => handle_detached_consume_invite(state, raw, now),
        DetachedAuthorityRoute::Revoke => handle_detached_revoke_invite(state, raw, now),
        DetachedAuthorityRoute::AutoSync => handle_detached_pairing_auto_sync(state, raw, now),
        DetachedAuthorityRoute::CompleteSession => {
            handle_detached_pairing_complete_session(state, raw, now)
        }
        DetachedAuthorityRoute::Approve => handle_detached_pairing_approve(state, raw, now),
    }
}

fn attachment_relay_pin(
    state: &AppState,
    now: u64,
    request: &Request<'_>,
) -> Result<Option<TlsCertificatePin>, Vec<u8>> {
    let bridge = state
        .bridge
        .lock()
        .map_err(|_| response(503, "bridge_unavailable", None, None))?;
    authorize_api(&bridge, request, now)?;
    drop(bridge);
    let authority = state
        .invite_authority
        .as_ref()
        .ok_or_else(|| response(503, "pairing_unavailable", None, None))?
        .lock()
        .map_err(|_| response(503, "pairing_unavailable", None, None))?;
    if !pairing_ready(Some(&authority), now) {
        return Err(response(
            403,
            "pairing_not_ready",
            None,
            Some("application/json"),
        ));
    }
    Ok(authority.relay_tls_pin)
}

fn handle_detached_attachment_upload_chunk(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let pin = match attachment_relay_pin(state, now, &request) {
        Ok(pin) => pin,
        Err(reply) => return reply,
    };
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
    let Some(total) = json_u64(request.body, "total").and_then(|value| usize::try_from(value).ok())
    else {
        return response(400, "invalid_blob_total", None, Some("application/json"));
    };
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(inbox_url, pin) else {
        return response(
            422,
            "unsupported_relay_endpoint",
            None,
            Some("application/json"),
        );
    };
    match RelayClient::new(endpoint).upload_blob_chunk_blocking(blob_id, offset, total, &chunk) {
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

fn handle_detached_attachment_upload_completed(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let pin = match attachment_relay_pin(state, now, &request) {
        Ok(pin) => pin,
        Err(reply) => return reply,
    };
    let Some(inbox_url) = json_string(request.body, "inbox_url") else {
        return response(400, "invalid_inbox_url", None, Some("application/json"));
    };
    let Some(blob_id) = json_string(request.body, "blob_id") else {
        return response(400, "invalid_blob_id", None, Some("application/json"));
    };
    let package = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Some(package) = authority.completed_attachments.get(blob_id) else {
            return response(404, "attachment_not_found", None, Some("application/json"));
        };
        package.clone()
    };
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(inbox_url, pin) else {
        return response(
            422,
            "unsupported_relay_endpoint",
            None,
            Some("application/json"),
        );
    };
    let client = RelayClient::new(endpoint);
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
    let Some(authority) = state.invite_authority.as_ref() else {
        return response(503, "pairing_unavailable", None, None);
    };
    let Ok(mut authority) = authority.lock() else {
        return response(503, "pairing_unavailable", None, None);
    };
    if !authority.take_completed_attachment_if_equal(blob_id, &package) {
        return response(
            409,
            "attachment_state_unavailable",
            None,
            Some("application/json"),
        );
    }
    response(
        200,
        r##"{"uploaded":true}"##,
        None,
        Some("application/json"),
    )
}

fn handle_detached_attachment_download_chunk(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let pin = match attachment_relay_pin(state, now, &request) {
        Ok(pin) => pin,
        Err(reply) => return reply,
    };
    let Some(attachment_id) = json_string(request.body, "attachment_id") else {
        return response(400, "invalid_attachment_id", None, Some("application/json"));
    };
    let Some(inbox_url) = json_string(request.body, "inbox_url") else {
        return response(400, "invalid_inbox_url", None, Some("application/json"));
    };
    let Some(index) = json_u64(request.body, "index").and_then(|value| usize::try_from(value).ok())
    else {
        return response(
            400,
            "invalid_attachment_index",
            None,
            Some("application/json"),
        );
    };
    let (descriptor, offset, chunk_size) = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "pairing_unavailable", None, None);
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
        let offset = descriptor.chunks[..index]
            .iter()
            .map(|item| item.ciphertext_size as usize)
            .sum();
        (descriptor.clone(), offset, chunk.ciphertext_size as usize)
    };
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(inbox_url, pin) else {
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
        chunk_size,
    ) else {
        return response(503, "relay_unavailable", None, Some("application/json"));
    };
    let Ok(plaintext) =
        crate::attachment::decrypt_blob_chunk(&descriptor, index as u32, &ciphertext)
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

fn handle_detached_attachment_send(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
    let pin = match attachment_relay_pin(state, now, &request) {
        Ok(pin) => pin,
        Err(reply) => return reply,
    };
    let Some(conversation_id) = json_string(request.body, "conversation_id") else {
        return response(400, "invalid_conversation", None, Some("application/json"));
    };
    let Some(inbox_url) = json_string(request.body, "inbox_url") else {
        return response(400, "invalid_inbox_url", None, Some("application/json"));
    };
    let Some(blob_id) = json_string(request.body, "blob_id") else {
        return response(400, "invalid_blob_id", None, Some("application/json"));
    };
    let (package, endpoint) = {
        let Some(authority) = state.invite_authority.as_ref() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(authority) = authority.lock() else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Some(package) = authority.completed_attachments.get(blob_id) else {
            return response(404, "attachment_not_found", None, Some("application/json"));
        };
        let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(inbox_url, pin) else {
            return response(
                422,
                "unsupported_relay_endpoint",
                None,
                Some("application/json"),
            );
        };
        (package.clone(), endpoint)
    };

    // The blob is independent of the MLS state. Upload it before taking any
    // catalog/store/ledger mutex so a slow relay cannot serialize messaging.
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

    let (digest, envelope, checkpoint, wire) = {
        let Ok(mut catalog) = state.session_catalog.lock() else {
            return response(503, "session_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        let Ok(mut ledger) = state.delivery_ledger.lock() else {
            return response(503, "delivery_unavailable", None, None);
        };
        let Ok(ciphertext) =
            catalog.send_attachment_unpersisted(conversation_id, &package.descriptor)
        else {
            return response(
                409,
                "attachment_session_failed",
                None,
                Some("application/json"),
            );
        };
        let Ok(checkpoint) = catalog.checkpoint_bytes(conversation_id) else {
            catalog.poison(conversation_id);
            return response(503, "session_storage_unavailable", None, None);
        };
        let Some(expires_at) = now.checked_add(3600) else {
            catalog.poison(conversation_id);
            return response(422, "invalid_expiry", None, Some("application/json"));
        };
        let Ok(envelope) =
            RelayEnvelope::create(&endpoint.capability, &ciphertext, expires_at, now)
        else {
            catalog.poison(conversation_id);
            return response(
                422,
                "invalid_delivery_envelope",
                None,
                Some("application/json"),
            );
        };
        let Ok(digest) = envelope.digest() else {
            catalog.poison(conversation_id);
            return response(
                422,
                "invalid_delivery_envelope",
                None,
                Some("application/json"),
            );
        };
        let Ok(wire) = envelope.to_wire() else {
            catalog.poison(conversation_id);
            return response(
                422,
                "invalid_delivery_envelope",
                None,
                Some("application/json"),
            );
        };
        if ledger
            .register_encrypted_with_destination(
                digest.clone(),
                Some(wire.clone()),
                Some(envelope.expires_at),
                Some(inbox_url.to_owned()),
            )
            .is_err()
        {
            catalog.poison(conversation_id);
            return response(409, "duplicate_delivery", None, Some("application/json"));
        }
        if ledger
            .transition(&digest, crate::delivery::DeliveryState::Queued)
            .is_err()
        {
            catalog.poison(conversation_id);
            return response(503, "delivery_state_unavailable", None, None);
        }
        let Ok(ledger_bytes) = ledger.encoded_bytes() else {
            catalog.poison(conversation_id);
            return response(503, "delivery_state_unavailable", None, None);
        };
        if store
            .apply_batch(&[
                RecordMutation::Put(
                    RecordClass::ProtocolSession,
                    session_checkpoint_key(conversation_id),
                    checkpoint.clone(),
                ),
                RecordMutation::Put(RecordClass::Outbox, "delivery/ledger".into(), ledger_bytes),
            ])
            .is_err()
        {
            catalog.poison(conversation_id);
            if let Ok(restored) = DeliveryLedger::restore(&store) {
                *ledger = restored;
            }
            return response(503, "message_storage_unavailable", None, None);
        }
        (digest, envelope, checkpoint, wire)
    };
    let _ = checkpoint;
    let _ = wire;

    let accepted = match client.post_blocking(&envelope) {
        Ok(value) => value,
        Err(_) => {
            if let (Ok(mut ledger), Ok(mut store)) =
                (state.delivery_ledger.lock(), state.session_store.lock())
            {
                let _ = ledger.schedule_retry(&digest, now);
                let _ = ledger.persist(&mut store);
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
    let (ledger_persisted, attachment_removed) = {
        let Ok(mut ledger) = state.delivery_ledger.lock() else {
            return response(503, "delivery_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        let _ = ledger.bind_relay_id(&digest, &accepted.id);
        let _ = ledger.transition(&digest, crate::delivery::DeliveryState::RelayAccepted);
        (ledger.persist(&mut store).is_ok(), true)
    };
    if !ledger_persisted {
        return response(503, "storage_unavailable", None, Some("application/json"));
    }
    if attachment_removed {
        if let Some(authority) = state.invite_authority.as_ref() {
            if let Ok(mut authority) = authority.lock() {
                let _ = authority.take_completed_attachment_if_equal(blob_id, &package);
            }
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

fn handle_detached_attachment(
    state: &AppState,
    route: DetachedAttachmentRoute,
    raw: &[u8],
    now: u64,
) -> Vec<u8> {
    match route {
        DetachedAttachmentRoute::UploadChunk => {
            handle_detached_attachment_upload_chunk(state, raw, now)
        }
        DetachedAttachmentRoute::UploadCompleted => {
            handle_detached_attachment_upload_completed(state, raw, now)
        }
        DetachedAttachmentRoute::DownloadChunk => {
            handle_detached_attachment_download_chunk(state, raw, now)
        }
        DetachedAttachmentRoute::Send => handle_detached_attachment_send(state, raw, now),
    }
}

fn handle_detached_delivery_post(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let request = match parse_request(raw) {
        Ok(request) => request,
        Err(_) => return response(400, "invalid_request", None, None),
    };
    let Ok(bridge) = state.bridge.lock() else {
        return response(503, "bridge_unavailable", None, None);
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    let Some(authority) = state
        .invite_authority
        .as_ref()
        .and_then(|value| value.lock().ok())
    else {
        return response(503, "pairing_unavailable", None, None);
    };
    if !pairing_ready(Some(&authority), now) {
        return response(403, "pairing_not_ready", None, Some("application/json"));
    }
    let Some(inbox_url) = json_string(request.body, "inbox_url") else {
        return response(400, "invalid_inbox_url", None, Some("application/json"));
    };
    let Some(ciphertext) = json_string(request.body, "ciphertext").and_then(hex_decode) else {
        return response(400, "invalid_ciphertext", None, Some("application/json"));
    };
    let Some(expires_at) = json_u64(request.body, "expires_at") else {
        return response(400, "invalid_expiry", None, Some("application/json"));
    };
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(inbox_url, authority.relay_tls_pin)
    else {
        return response(
            422,
            "unsupported_relay_endpoint",
            None,
            Some("application/json"),
        );
    };
    let Ok(envelope) = RelayEnvelope::create(&endpoint.capability, &ciphertext, expires_at, now)
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
    let destination = inbox_url.to_owned();
    drop(authority);
    drop(bridge);

    {
        let Ok(_catalog) = state.session_catalog.lock() else {
            return response(503, "session_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        let Ok(mut ledger) = state.delivery_ledger.lock() else {
            return response(503, "delivery_unavailable", None, None);
        };
        if ledger
            .register_queued_with_destination(
                digest.clone(),
                Some(wire),
                Some(envelope.expires_at),
                Some(destination),
            )
            .is_err()
        {
            return response(409, "duplicate_delivery", None, Some("application/json"));
        }
        if ledger.persist(&mut store).is_err() {
            let _ = ledger.discard_if_state(&digest, crate::delivery::DeliveryState::Queued);
            return response(503, "storage_unavailable", None, None);
        }
    }

    let accepted = RelayClient::new(endpoint).post_blocking(&envelope);
    match accepted {
        Ok(accepted) => {
            let Ok(_catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Ok(mut ledger) = state.delivery_ledger.lock() else {
                return response(503, "delivery_unavailable", None, None);
            };
            if !ledger
                .accept_retry(
                    &digest,
                    crate::delivery::DeliveryState::Queued,
                    accepted.id.clone(),
                )
                .unwrap_or(false)
                || ledger.persist(&mut store).is_err()
            {
                return response(
                    409,
                    "delivery_state_changed",
                    None,
                    Some("application/json"),
                );
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
        Err(RelayError::Rejected(410)) => {
            let Some(mut authority) = state
                .invite_authority
                .as_ref()
                .and_then(|value| value.lock().ok())
            else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Ok(_catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Ok(mut ledger) = state.delivery_ledger.lock() else {
                return response(503, "delivery_unavailable", None, None);
            };
            let _ = ledger.mark_failed_if_current(&digest, crate::delivery::DeliveryState::Queued);
            let _ = authority.invalidate_relay_binding(&mut store);
            let _ = ledger.persist(&mut store);
            response(
                409,
                "relay_capability_expired",
                None,
                Some("application/json"),
            )
        }
        Err(_) => {
            let Ok(_catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Ok(mut ledger) = state.delivery_ledger.lock() else {
                return response(503, "delivery_unavailable", None, None);
            };
            let _ = ledger.schedule_retry_if_current(
                &digest,
                crate::delivery::DeliveryState::Queued,
                now,
            );
            let _ = ledger.persist(&mut store);
            response(
                503,
                &format!(
                    r##"{{"error":"relay_unavailable","digest":"{}","state":"retryable"}}"##,
                    json_escape(&digest)
                ),
                None,
                Some("application/json"),
            )
        }
    }
}

fn handle_detached_delivery_retry(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let request = match parse_request(raw) {
        Ok(request) => request,
        Err(_) => return response(400, "invalid_request", None, None),
    };
    let Ok(bridge) = state.bridge.lock() else {
        return response(503, "bridge_unavailable", None, None);
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    let Some(authority) = state
        .invite_authority
        .as_ref()
        .and_then(|value| value.lock().ok())
    else {
        return response(503, "pairing_unavailable", None, None);
    };
    if !pairing_ready(Some(&authority), now) {
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
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(inbox_url, authority.relay_tls_pin)
    else {
        return response(
            422,
            "unsupported_relay_endpoint",
            None,
            Some("application/json"),
        );
    };
    let record = {
        let Ok(_catalog) = state.session_catalog.lock() else {
            return response(503, "session_unavailable", None, None);
        };
        let Ok(_store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        let Ok(ledger) = state.delivery_ledger.lock() else {
            return response(503, "delivery_unavailable", None, None);
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
        if !matches!(
            record.state,
            crate::delivery::DeliveryState::Retryable | crate::delivery::DeliveryState::Queued
        ) {
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
        record
    };
    let Some(wire) = record.wire.as_deref() else {
        return response(
            409,
            "delivery_not_retriable",
            None,
            Some("application/json"),
        );
    };
    let Ok(envelope) = RelayEnvelope::from_wire(wire, now) else {
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
    drop(authority);
    drop(bridge);

    match RelayClient::new(endpoint).post_blocking(&envelope) {
        Ok(accepted) => {
            let Ok(_catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Ok(mut ledger) = state.delivery_ledger.lock() else {
                return response(503, "delivery_unavailable", None, None);
            };
            if !ledger
                .accept_retry(&record.digest, record.state, accepted.id.clone())
                .unwrap_or(false)
                || ledger.persist(&mut store).is_err()
            {
                return response(
                    409,
                    "delivery_state_changed",
                    None,
                    Some("application/json"),
                );
            }
            response(
                202,
                &format!(
                    r##"{{"accepted":true,"id":"{}","digest":"{}","state":"relay-accepted"}}"##,
                    json_escape(&accepted.id),
                    json_escape(&record.digest)
                ),
                None,
                Some("application/json"),
            )
        }
        Err(RelayError::Rejected(410)) => {
            let Some(mut authority) = state
                .invite_authority
                .as_ref()
                .and_then(|value| value.lock().ok())
            else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Ok(_catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Ok(mut ledger) = state.delivery_ledger.lock() else {
                return response(503, "delivery_unavailable", None, None);
            };
            let _ = ledger.mark_failed_if_current(&record.digest, record.state);
            let _ = authority.invalidate_relay_binding(&mut store);
            let _ = ledger.persist(&mut store);
            response(
                409,
                "relay_capability_expired",
                None,
                Some("application/json"),
            )
        }
        Err(_) => {
            let Ok(_catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Ok(mut ledger) = state.delivery_ledger.lock() else {
                return response(503, "delivery_unavailable", None, None);
            };
            let _ = ledger.schedule_retry_if_current(&record.digest, record.state, now);
            let _ = ledger.persist(&mut store);
            response(503, "relay_unavailable", None, Some("application/json"))
        }
    }
}

fn handle_detached_delivery_ack(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let request = match parse_request(raw) {
        Ok(request) => request,
        Err(_) => return response(400, "invalid_request", None, None),
    };
    let Ok(bridge) = state.bridge.lock() else {
        return response(503, "bridge_unavailable", None, None);
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    let Some(inbox_url) = json_string(request.body, "inbox_url") else {
        return response(400, "invalid_inbox_url", None, Some("application/json"));
    };
    let Some(ids) = super::json_string_array(request.body, "ids") else {
        return response(400, "invalid_delivery_ids", None, Some("application/json"));
    };
    let Some(authority) = state
        .invite_authority
        .as_ref()
        .and_then(|value| value.lock().ok())
    else {
        return response(503, "pairing_unavailable", None, None);
    };
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(inbox_url, authority.relay_tls_pin)
    else {
        return response(
            422,
            "unsupported_relay_endpoint",
            None,
            Some("application/json"),
        );
    };
    drop(authority);
    drop(bridge);

    let acknowledged = match RelayClient::new(endpoint).ack_blocking(&ids) {
        Ok(value) => value,
        Err(RelayError::Rejected(410)) => {
            let Some(mut authority) = state
                .invite_authority
                .as_ref()
                .and_then(|value| value.lock().ok())
            else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Ok(_catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let _ = authority.invalidate_relay_binding(&mut store);
            return response(
                409,
                "relay_capability_expired",
                None,
                Some("application/json"),
            );
        }
        Err(_) => return response(503, "relay_unavailable", None, Some("application/json")),
    };
    let Ok(_catalog) = state.session_catalog.lock() else {
        return response(503, "session_unavailable", None, None);
    };
    let Ok(mut store) = state.session_store.lock() else {
        return response(503, "storage_unavailable", None, None);
    };
    let Ok(mut ledger) = state.delivery_ledger.lock() else {
        return response(503, "delivery_unavailable", None, None);
    };
    let relay_acknowledged = ledger.acknowledge_relay_ids(&ids);
    if ledger.persist(&mut store).is_err() {
        return response(503, "storage_unavailable", None, None);
    }
    response(
        200,
        &format!(
            r##"{{"acknowledged":{},"relay_acknowledged":{}}}"##,
            acknowledged, relay_acknowledged
        ),
        None,
        Some("application/json"),
    )
}

fn handle_detached_delivery_sync(state: &AppState, raw: &[u8], now: u64) -> Vec<u8> {
    let request = match parse_request(raw) {
        Ok(request) => request,
        Err(_) => return response(400, "invalid_request", None, None),
    };
    let Ok(bridge) = state.bridge.lock() else {
        return response(503, "bridge_unavailable", None, None);
    };
    if let Err(reply) = authorize_api(&bridge, &request, now) {
        return reply;
    }
    let Some(authority) = state
        .invite_authority
        .as_ref()
        .and_then(|value| value.lock().ok())
    else {
        return response(503, "pairing_unavailable", None, None);
    };
    if !pairing_ready(Some(&authority), now) {
        return response(403, "pairing_not_ready", None, Some("application/json"));
    }
    let Some(inbox_url) = json_string(request.body, "inbox_url") else {
        return response(400, "invalid_inbox_url", None, Some("application/json"));
    };
    let Some(conversation_id) = json_string(request.body, "conversation_id") else {
        return response(400, "invalid_conversation", None, Some("application/json"));
    };
    if authority.contacts.is_blocked_conversation(conversation_id) {
        return response(403, "contact_blocked", None, Some("application/json"));
    }
    let background = super::json_bool(request.body, "background").unwrap_or(false);
    // Copy the values needed for relay I/O out of the guarded state and
    // release the authority lock before touching the network. The 410 branch
    // below re-locks the same mutex, so holding the guard across
    // sync_blocking would self-deadlock on a rotated (expired) inbox.
    let pin = authority.relay_tls_pin;
    drop(authority);
    drop(bridge);
    let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(inbox_url, pin) else {
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
            let Some(mut authority) = state
                .invite_authority
                .as_ref()
                .and_then(|value| value.lock().ok())
            else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Ok(_catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let _ = authority.invalidate_relay_binding(&mut store);
            return response(
                409,
                "relay_capability_expired",
                None,
                Some("application/json"),
            );
        }
        Err(_) => return response(503, "relay_unavailable", None, Some("application/json")),
    };

    let result = {
        let Some(mut authority) = state
            .invite_authority
            .as_ref()
            .and_then(|value| value.lock().ok())
        else {
            return response(503, "pairing_unavailable", None, None);
        };
        let Ok(mut catalog) = state.session_catalog.lock() else {
            return response(503, "session_unavailable", None, None);
        };
        let Ok(mut store) = state.session_store.lock() else {
            return response(503, "storage_unavailable", None, None);
        };
        let Ok(mut ledger) = state.delivery_ledger.lock() else {
            return response(503, "delivery_unavailable", None, None);
        };
        process_sync_items(
            conversation_id,
            background,
            &capability,
            items,
            now,
            SyncProcessContext {
                invite_authority: Some(&mut authority),
                catalog: &mut catalog,
                store: &mut store,
                delivery_ledger: Some(&mut ledger),
            },
        )
    };
    let result = match result {
        Ok(result) => result,
        Err(reply) => return reply,
    };
    let acknowledged = if result.acknowledged_ids.is_empty() {
        0
    } else {
        match client.ack_blocking(&result.acknowledged_ids) {
            Ok(value) => value,
            Err(RelayError::Rejected(410)) => {
                if let Some(mut authority) = state
                    .invite_authority
                    .as_ref()
                    .and_then(|value| value.lock().ok())
                {
                    if let Ok(mut store) = state.session_store.lock() {
                        let _ = authority.invalidate_relay_binding(&mut store);
                    }
                }
                return response(
                    409,
                    "relay_capability_expired",
                    None,
                    Some("application/json"),
                );
            }
            Err(_) => return response(503, "relay_unavailable", None, Some("application/json")),
        }
    };
    response(
        200,
        &format!(
            r##"{{"acknowledged":{},"messages":[{}]}}"##,
            acknowledged,
            result.messages.join(",")
        ),
        None,
        Some("application/json"),
    )
}

fn run_maintenance_tick(state: &AppState, now: u64) -> usize {
    let fetched = {
        let Some(authority) = state
            .invite_authority
            .as_ref()
            .and_then(|value| value.lock().ok())
        else {
            return 0;
        };
        // Snapshot the relay binding and release the guard before the network
        // fetch so a slow or unreachable relay cannot stall every route that
        // needs the invite authority lock.
        let inbox_url = authority.inbox_url.clone();
        let pin = authority.relay_tls_pin;
        drop(authority);
        match inbox_url {
            Some(url) => fetch_inbox(&url, pin),
            None => Ok(None),
        }
    };
    let Some((client, capability, items)) = (match fetched {
        Ok(value) => value,
        Err(RelayError::Rejected(410)) => {
            if let (Some(mut authority), Ok(mut store)) = (
                state
                    .invite_authority
                    .as_ref()
                    .and_then(|value| value.lock().ok()),
                state.session_store.lock(),
            ) {
                let _ = authority.invalidate_relay_binding(&mut store);
            }
            let _ = retry_due_deliveries_detached(state, now);
            return 0;
        }
        Err(_) => {
            let _ = retry_due_deliveries_detached(state, now);
            return 0;
        }
    }) else {
        let _ = retry_due_deliveries_detached(state, now);
        return 0;
    };
    let Some(authority) = state
        .invite_authority
        .as_ref()
        .and_then(|value| value.lock().ok())
    else {
        return 0;
    };
    let Ok(mut catalog) = state.session_catalog.lock() else {
        return 0;
    };
    let Ok(mut store) = state.session_store.lock() else {
        return 0;
    };
    let Ok(mut ledger) = state.delivery_ledger.lock() else {
        return 0;
    };
    let mut authority = authority;
    let (processed, acknowledged_ids) = process_inbox_items(
        &mut authority,
        &mut catalog,
        &mut store,
        &mut ledger,
        &capability,
        items,
        now,
    )
    .unwrap_or((0, Vec::new()));
    let changed = ledger.expire_due(now) > 0;
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
    drop(ledger);
    drop(store);
    drop(catalog);
    drop(authority);
    if !acknowledged_ids.is_empty() {
        let _ = client.ack_blocking(&acknowledged_ids);
    }
    let _ = retry_due_deliveries_detached(state, now);
    processed
}

/// Performs outbox network retries without holding daemon state locks during
/// the relay request. The result is applied only if the ledger record still
/// has the state observed before the request started.
fn retry_due_deliveries_detached(state: &AppState, now: u64) -> usize {
    let (due, pin) = {
        let Some(authority) = state
            .invite_authority
            .as_ref()
            .and_then(|value| value.lock().ok())
        else {
            return 0;
        };
        let Ok(_catalog) = state.session_catalog.lock() else {
            return 0;
        };
        let Ok(_store) = state.session_store.lock() else {
            return 0;
        };
        let Ok(ledger) = state.delivery_ledger.lock() else {
            return 0;
        };
        let pin = authority.relay_tls_pin;
        (
            ledger
                .due_retries(now)
                .into_iter()
                .take(MAX_AUTOMATIC_RETRIES_PER_TICK)
                .collect::<Vec<DeliveryRecord>>(),
            pin,
        )
    };
    let mut accepted_count = 0;
    for record in due {
        let network_result = (|| {
            let destination = record
                .destination
                .as_deref()
                .ok_or(RelayError::InvalidEndpoint)?;
            let wire = record.wire.as_deref().ok_or(RelayError::InvalidResponse)?;
            let endpoint = RelayEndpoint::from_inbox_url_with_pin(destination, pin)?;
            let envelope =
                RelayEnvelope::from_wire(wire, now).map_err(|_| RelayError::InvalidResponse)?;
            if envelope.mailbox != endpoint.capability {
                return Err(RelayError::InvalidResponse);
            }
            RelayClient::new(endpoint).post_blocking(&envelope)
        })();

        let Some(mut authority) = state
            .invite_authority
            .as_ref()
            .and_then(|value| value.lock().ok())
        else {
            continue;
        };
        let Ok(_catalog) = state.session_catalog.lock() else {
            continue;
        };
        let Ok(mut store) = state.session_store.lock() else {
            continue;
        };
        let Ok(mut ledger) = state.delivery_ledger.lock() else {
            continue;
        };
        match network_result {
            Ok(accepted) => {
                if ledger
                    .accept_retry(&record.digest, record.state, accepted.id)
                    .unwrap_or(false)
                    && ledger.persist(&mut store).is_ok()
                {
                    accepted_count += 1;
                }
            }
            Err(RelayError::Rejected(410)) => {
                let _ = authority.invalidate_relay_binding(&mut store);
                let _ = ledger.mark_failed_if_current(&record.digest, record.state);
                let _ = ledger.persist(&mut store);
            }
            Err(RelayError::InvalidEndpoint | RelayError::InvalidResponse) => {
                let _ = ledger.mark_failed_if_current(&record.digest, record.state);
                let _ = ledger.persist(&mut store);
            }
            Err(_) => {
                let _ = ledger.schedule_retry_if_current(&record.digest, record.state, now);
                let _ = ledger.persist(&mut store);
            }
        }
    }
    accepted_count
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
    blocking_slots: Arc<Semaphore>,
    shutting_down: Arc<AtomicBool>,
}

async fn axum_handler(State(state): State<AppState>, request: HttpRequest<Body>) -> Response<Body> {
    if state.shutting_down.load(Ordering::Acquire) {
        return axum_response(response(503, "daemon_shutting_down", None, None));
    }
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
    let Ok(blocking_permit) = state.blocking_slots.clone().try_acquire_owned() else {
        return axum_response(response(503, "daemon_busy", None, None));
    };
    let detached_delivery = detached_delivery_route(&raw);
    let detached_attachment = detached_attachment_route(&raw);
    let detached_authority = detached_authority_route(&raw);
    // Relay operations use a deliberately small synchronous transport layer.
    // Never run it while holding an async runtime worker: a slow or unavailable
    // relay must not freeze the browser bridge's request loop.
    let output = if let Some(route) = detached_delivery {
        match tokio::task::spawn_blocking(move || {
            let _blocking_permit = blocking_permit;
            match route {
                DetachedDeliveryRoute::Post => {
                    handle_detached_delivery_post(&state, &raw, unix_now())
                }
                DetachedDeliveryRoute::Retry => {
                    handle_detached_delivery_retry(&state, &raw, unix_now())
                }
                DetachedDeliveryRoute::Ack => {
                    handle_detached_delivery_ack(&state, &raw, unix_now())
                }
                DetachedDeliveryRoute::Sync => {
                    handle_detached_delivery_sync(&state, &raw, unix_now())
                }
            }
        })
        .await
        {
            Ok(output) => output,
            Err(_) => return axum_response(response(503, "bridge_unavailable", None, None)),
        }
    } else if let Some(route) = detached_attachment {
        match tokio::task::spawn_blocking(move || {
            let _blocking_permit = blocking_permit;
            handle_detached_attachment(&state, route, &raw, unix_now())
        })
        .await
        {
            Ok(output) => output,
            Err(_) => return axum_response(response(503, "bridge_unavailable", None, None)),
        }
    } else if let Some(route) = detached_authority {
        match tokio::task::spawn_blocking(move || {
            let _blocking_permit = blocking_permit;
            handle_detached_authority(&state, route, &raw, unix_now())
        })
        .await
        {
            Ok(output) => output,
            Err(_) => return axum_response(response(503, "bridge_unavailable", None, None)),
        }
    } else {
        match tokio::task::spawn_blocking(move || {
            let _blocking_permit = blocking_permit;
            let Ok(mut bridge) = state.bridge.lock() else {
                return response(503, "bridge_unavailable", None, None);
            };
            let mut invite_guard = state
                .invite_authority
                .as_ref()
                .and_then(|authority| authority.lock().ok());
            let Ok(mut catalog) = state.session_catalog.lock() else {
                return response(503, "session_unavailable", None, None);
            };
            let Ok(mut store) = state.session_store.lock() else {
                return response(503, "storage_unavailable", None, None);
            };
            let Ok(mut delivery_ledger) = state.delivery_ledger.lock() else {
                return response(503, "delivery_unavailable", None, None);
            };
            handle_request_with_route_context(
                &raw,
                RouteContext {
                    bridge: &mut bridge,
                    now: unix_now(),
                    ui_root: state.ui_root.as_deref(),
                    identity: state.identity.as_ref(),
                    invite_authority: invite_guard.as_deref_mut(),
                    session_catalog: Some(&mut catalog),
                    session_store: Some(&mut store),
                    delivery_ledger: Some(&mut delivery_ledger),
                },
            )
        })
        .await
        {
            Ok(output) => output,
            Err(_) => return axum_response(response(503, "bridge_unavailable", None, None)),
        }
    };
    axum_response(output)
}
