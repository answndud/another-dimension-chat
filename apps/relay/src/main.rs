#![forbid(unsafe_code)]

use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{header, StatusCode},
    response::Response,
    routing::{get, post},
    Router,
};
use base64ct::{Base64UrlUnpadded, Encoding};
use getrandom::fill as random_fill;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    env, fs,
    net::SocketAddr,
    path::PathBuf,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::sync::Mutex;

const MAX_ENVELOPE_BYTES: usize = 96 * 1024;
const MAX_INBOX_ITEMS: usize = 256;
const TTL_SECONDS: u64 = 7 * 24 * 60 * 60;

#[derive(Clone)]
struct AppState {
    store: Arc<Mutex<Store>>,
    capability: String,
}
#[derive(Clone, Serialize, Deserialize)]
struct Item {
    id: String,
    envelope: String,
    #[serde(rename = "receivedAt")]
    received_at: u64,
}
struct Store {
    path: PathBuf,
    items: Vec<Item>,
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}
fn response(status: StatusCode, value: Value) -> Response {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "application/json")
        .body(value.to_string().into())
        .unwrap()
}
fn error(status: StatusCode, value: &'static str) -> Response {
    response(status, json!({ "error": value }))
}
fn new_capability() -> Result<String, String> {
    let mut bytes = [0u8; 32];
    random_fill(&mut bytes).map_err(|_| "random generation failed")?;
    let mut output = vec![0u8; Base64UrlUnpadded::encoded_len(&bytes)];
    Base64UrlUnpadded::encode(&bytes, &mut output)
        .map(str::to_owned)
        .map_err(|_| "encoding failed".into())
}
fn persist(store: &Store) -> Result<(), String> {
    let temp = store.path.with_extension("json.tmp");
    fs::write(
        &temp,
        serde_json::to_vec(&store.items).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, &store.path).map_err(|e| e.to_string())
}
fn load_store(path: PathBuf) -> Result<Store, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let items = match fs::read(&path) {
        Ok(bytes) => {
            serde_json::from_slice(&bytes).map_err(|_| "relay state is corrupt".to_owned())?
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Vec::new(),
        Err(error) => return Err(error.to_string()),
    };
    Ok(Store { path, items })
}
async fn health() -> Response {
    response(StatusCode::OK, json!({ "ok": true, "protocol": 1 }))
}
async fn post_inbox(
    State(state): State<AppState>,
    Path(capability): Path<String>,
    body: Bytes,
) -> Response {
    if capability != state.capability {
        return error(StatusCode::GONE, "capability_expired");
    }
    let body: Value = match serde_json::from_slice(&body) {
        Ok(value) => value,
        Err(_) => return error(StatusCode::BAD_REQUEST, "invalid_json"),
    };
    let envelope = match body.get("envelope").and_then(Value::as_str) {
        Some(value) => value.to_owned(),
        None => return error(StatusCode::BAD_REQUEST, "invalid_envelope"),
    };
    if !envelope.starts_with("ADENV1.") || envelope.len() > MAX_ENVELOPE_BYTES {
        return error(StatusCode::BAD_REQUEST, "invalid_envelope");
    }
    let id = hex(&Sha256::digest(envelope.as_bytes()));
    let mut store = state.store.lock().await;
    if store.items.iter().any(|item| item.id == id) {
        return response(
            StatusCode::ACCEPTED,
            json!({ "accepted": true, "id": id, "duplicate": true }),
        );
    }
    if store.items.len() >= MAX_INBOX_ITEMS {
        return error(StatusCode::TOO_MANY_REQUESTS, "queue_full");
    }
    store.items.push(Item {
        id: id.clone(),
        envelope,
        received_at: now(),
    });
    if persist(&store).is_err() {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "storage_error");
    }
    response(StatusCode::ACCEPTED, json!({ "accepted": true, "id": id }))
}
async fn get_inbox(State(state): State<AppState>, Path(capability): Path<String>) -> Response {
    if capability != state.capability {
        return error(StatusCode::GONE, "capability_expired");
    }
    let mut store = state.store.lock().await;
    let cutoff = now().saturating_sub(TTL_SECONDS);
    store.items.retain(|item| item.received_at >= cutoff);
    if persist(&store).is_err() {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "storage_error");
    }
    response(
        StatusCode::OK,
        json!({ "protocol": 1, "items": store.items }),
    )
}
async fn ack_inbox(
    State(state): State<AppState>,
    Path(capability): Path<String>,
    body: Bytes,
) -> Response {
    if capability != state.capability {
        return error(StatusCode::GONE, "capability_expired");
    }
    let body: Value = match serde_json::from_slice(&body) {
        Ok(value) => value,
        Err(_) => return error(StatusCode::BAD_REQUEST, "invalid_json"),
    };
    let ids = match body.get("ids").and_then(Value::as_array) {
        Some(value) if value.len() <= MAX_INBOX_ITEMS => value,
        _ => return error(StatusCode::BAD_REQUEST, "too_many_ids"),
    };
    let ids: std::collections::HashSet<&str> = ids.iter().filter_map(Value::as_str).collect();
    let mut store = state.store.lock().await;
    let before = store.items.len();
    store.items.retain(|item| !ids.contains(item.id.as_str()));
    if persist(&store).is_err() {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "storage_error");
    }
    response(
        StatusCode::OK,
        json!({ "acknowledged": before - store.items.len() }),
    )
}
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = PathBuf::from(
        env::var("AD_RELAY_DATA_DIR").unwrap_or_else(|_| ".another-dimension-relay".into()),
    );
    let port: u16 = env::var("AD_RELAY_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1422);
    let host = env::var("AD_RELAY_BIND_HOST").unwrap_or_else(|_| "127.0.0.1".into());
    let capability_file = data_dir.join("inbox-capability");
    let capability = match fs::read_to_string(&capability_file) {
        Ok(value) if value.trim().len() == 43 => value.trim().to_owned(),
        _ => {
            let value = new_capability()?;
            fs::create_dir_all(&data_dir)?;
            fs::write(&capability_file, format!("{value}\n"))?;
            value
        }
    };
    let state = AppState {
        store: Arc::new(Mutex::new(load_store(data_dir.join("relay-inbox.json"))?)),
        capability: capability.clone(),
    };
    let app = Router::new()
        .route("/api/v1/health", get(health))
        .route(
            "/api/v1/inbox/{capability}",
            get(get_inbox).post(post_inbox),
        )
        .route("/api/v1/inbox/{capability}/ack", post(ack_inbox))
        .with_state(state);
    let address: SocketAddr = format!("{host}:{port}").parse()?;
    let listener = tokio::net::TcpListener::bind(address).await?;
    println!("another-dimension relay listening on http://{address}/api/v1/inbox/{capability}");
    axum::serve(listener, app).await?;
    Ok(())
}
