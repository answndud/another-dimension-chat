use super::{
    axum_request_bytes, axum_response, background_sync_once, handle_request_with_route_context,
    notify_new_messages, response, retry_due_deliveries, unix_now, IdentityView, InviteAuthority,
    RouteContext, StoredMessage, MAX_REQUEST_BYTES,
};
use crate::{
    bridge::LocalBridge,
    delivery::DeliveryLedger,
    mls_session::MlsSessionCatalog,
    storage::{EncryptedStore, RecordClass},
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
    sync::{Arc, Mutex},
    time::Duration,
};

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
    let output = handle_request_with_route_context(
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
    );
    axum_response(output)
}
