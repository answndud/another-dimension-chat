#![forbid(unsafe_code)]

use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::Response,
    routing::{get, post},
    Router,
};
use base64ct::{Base64UrlUnpadded, Encoding};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
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
    invites: Arc<Mutex<Vec<Invite>>>,
    capability: String,
    origin: String,
    receipt_key: SigningKey,
    blob_dir: PathBuf,
}
fn valid_blob_id(value: &str) -> bool {
    (32..=128).contains(&value.len())
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}
fn header_usize(headers: &HeaderMap, name: &str, default: usize) -> Option<usize> {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.parse().ok())
        .unwrap_or(Some(default))
}
async fn blob_impl(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    body: Bytes,
    method: axum::http::Method,
) -> Response {
    if !valid_blob_id(&id) {
        return error(StatusCode::BAD_REQUEST, "invalid_blob_id");
    }
    if headers
        .get("x-ad-relay-capability")
        .and_then(|v| v.to_str().ok())
        != Some(state.capability.as_str())
    {
        return error(StatusCode::FORBIDDEN, "relay_capability_required");
    }
    let file = state.blob_dir.join(format!("{id}.blob"));
    let meta = state.blob_dir.join(format!("{id}.meta.json"));
    if method == axum::http::Method::DELETE {
        let _ = fs::remove_file(file);
        let _ = fs::remove_file(meta);
        return response(StatusCode::OK, json!({ "deleted": true }));
    }
    if method == axum::http::Method::GET {
        let bytes = match fs::read(&file) {
            Ok(v) => v,
            Err(_) => return error(StatusCode::NOT_FOUND, "blob_not_found"),
        };
        let offset = match header_usize(&headers, "x-ad-blob-offset", 0) {
            Some(v) if v <= bytes.len() => v,
            _ => return error(StatusCode::BAD_REQUEST, "invalid_blob_range"),
        };
        let length = header_usize(&headers, "x-ad-blob-length", bytes.len() - offset)
            .unwrap_or(0)
            .min(bytes.len() - offset);
        let mut response = response(StatusCode::OK, json!({ "error": "binary" }));
        *response.status_mut() = StatusCode::OK;
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            "application/octet-stream".parse().unwrap(),
        );
        response
            .headers_mut()
            .insert("x-ad-blob-offset", offset.to_string().parse().unwrap());
        response
            .headers_mut()
            .insert("x-ad-blob-total", bytes.len().to_string().parse().unwrap());
        *response.body_mut() = bytes[offset..offset + length].to_vec().into();
        return response;
    }
    let offset = match header_usize(&headers, "x-ad-blob-offset", 0) {
        Some(v) => v,
        None => return error(StatusCode::BAD_REQUEST, "invalid_blob_metadata"),
    };
    let total = match header_usize(&headers, "x-ad-blob-total", 0) {
        Some(v) if v > 0 && v <= 32 * 1024 * 1024 => v,
        _ => return error(StatusCode::BAD_REQUEST, "invalid_blob_metadata"),
    };
    if offset > total || offset + body.len() > total {
        return error(StatusCode::BAD_REQUEST, "blob_chunk_out_of_bounds");
    }
    let mut existing = fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(&file)
        .map_err(|_| ())
        .ok();
    if existing.is_none() && offset != 0 {
        return error(StatusCode::BAD_REQUEST, "blob_offset_mismatch");
    }
    let Some(mut file_handle) = existing.take() else {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "blob_storage_error");
    };
    use std::io::{Seek, SeekFrom, Write};
    if file_handle
        .metadata()
        .map(|metadata| metadata.len() as usize)
        .unwrap_or(usize::MAX)
        != offset
    {
        return error(StatusCode::BAD_REQUEST, "blob_offset_mismatch");
    }
    if file_handle.seek(SeekFrom::Start(offset as u64)).is_err()
        || file_handle.write_all(&body).is_err()
    {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "blob_storage_error");
    }
    let received = offset + body.len();
    let complete = received == total;
    let metadata = json!({ "version": 1, "total": total, "received": received, "complete": complete, "expiresAt": now() + TTL_SECONDS });
    if fs::write(&meta, metadata.to_string()).is_err() {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "blob_storage_error");
    }
    response(
        if complete {
            StatusCode::CREATED
        } else {
            StatusCode::ACCEPTED
        },
        json!({ "accepted": true, "complete": complete, "received": received, "total": total, "expiresAt": now() + TTL_SECONDS, "blobUrl": format!("/api/v1/blobs/{id}") }),
    )
}
async fn get_blob(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    blob_impl(
        State(state),
        Path(id),
        headers,
        Bytes::new(),
        axum::http::Method::GET,
    )
    .await
}
async fn post_blob(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    blob_impl(
        State(state),
        Path(id),
        headers,
        body,
        axum::http::Method::POST,
    )
    .await
}
async fn delete_blob(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    blob_impl(
        State(state),
        Path(id),
        headers,
        Bytes::new(),
        axum::http::Method::DELETE,
    )
    .await
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
#[derive(Clone, Serialize, Deserialize)]
struct Invite {
    version: u8,
    #[serde(rename = "codeHash")]
    code_hash: String,
    invite: String,
    #[serde(rename = "inviteDigest")]
    invite_digest: String,
    #[serde(rename = "createdAt")]
    created_at: u64,
    #[serde(rename = "expiresAt")]
    expires_at: u64,
    #[serde(rename = "consumedAt", skip_serializing_if = "Option::is_none")]
    consumed_at: Option<u64>,
    #[serde(rename = "pairingResponse", skip_serializing_if = "Option::is_none")]
    pairing_response: Option<Value>,
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
fn persist_invites(path: &PathBuf, invites: &[Invite]) -> Result<(), String> {
    let temp = path.with_extension("json.tmp");
    fs::write(
        &temp,
        serde_json::to_vec(invites).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())
}
fn invite_code() -> Result<String, String> {
    const ALPHABET: &[u8] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    let mut bytes = [0u8; 32];
    random_fill(&mut bytes).map_err(|_| "random generation failed")?;
    let raw: String = bytes
        .iter()
        .take(26)
        .map(|b| ALPHABET[*b as usize % ALPHABET.len()] as char)
        .collect();
    Ok(raw
        .as_bytes()
        .chunks(4)
        .map(|c| std::str::from_utf8(c).unwrap_or(""))
        .collect::<Vec<_>>()
        .join("-"))
}
fn code_hash(code: &str) -> String {
    hex(&Sha256::digest(
        code.chars()
            .filter(|c| *c != '-')
            .flat_map(char::to_uppercase)
            .collect::<String>()
            .as_bytes(),
    ))
}
fn receipt(key: &SigningKey, origin: &str, code: &str, invite: &str, timestamp: u64) -> String {
    let key_id = hex(&Sha256::digest(key.verifying_key().as_bytes()));
    let body = format!(
        "ADRECEIPT1.{}.{}.{}.{}.{}",
        key_id,
        hex(origin.as_bytes()),
        code_hash(code),
        hex(&Sha256::digest(invite.as_bytes())),
        timestamp
    );
    format!("{}.{}", body, hex(&key.sign(body.as_bytes()).to_bytes()))
}
fn hex_decode(value: &str) -> Option<Vec<u8>> {
    if value.len() % 2 != 0 {
        return None;
    }
    (0..value.len())
        .step_by(2)
        .map(|index| u8::from_str_radix(&value[index..index + 2], 16).ok())
        .collect()
}
fn validate_invite(invite: &str, expected_origin: &str) -> bool {
    let parts: Vec<_> = invite.split('.').collect();
    if parts.len() != 3 || parts[0] != "ADDAINV1" {
        return false;
    }
    let Some(payload) = hex_decode(parts[1]) else {
        return false;
    };
    let Some(signature) = hex_decode(parts[2]) else {
        return false;
    };
    let Ok(text) = String::from_utf8(payload.clone()) else {
        return false;
    };
    let lines: Vec<_> = text.split('\n').collect();
    if ![6, 7, 8].contains(&lines.len()) || lines[0] != "another-dimension/invite/v1" {
        return false;
    }
    let account = lines[1].strip_prefix("ad1pk").unwrap_or("");
    let Some(public_bytes) = hex_decode(account) else {
        return false;
    };
    let Ok(public_bytes) = <[u8; 32]>::try_from(public_bytes) else {
        return false;
    };
    let Ok(key) = VerifyingKey::from_bytes(&public_bytes) else {
        return false;
    };
    let Ok(sig_bytes) = <[u8; 64]>::try_from(signature) else {
        return false;
    };
    let Ok(expires) = lines[4].parse::<u64>() else {
        return false;
    };
    if expires <= now() || lines[5] != expected_origin || hex_decode(lines[3]).is_none() {
        return false;
    }
    key.verify(&payload, &Signature::from_bytes(&sig_bytes))
        .is_ok()
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
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    if capability != state.capability {
        return error(StatusCode::GONE, "capability_expired");
    }
    if headers
        .get("x-ad-relay-capability")
        .and_then(|value| value.to_str().ok())
        != Some(state.capability.as_str())
    {
        return error(StatusCode::FORBIDDEN, "relay_capability_required");
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
async fn get_inbox(
    State(state): State<AppState>,
    Path(capability): Path<String>,
    headers: HeaderMap,
) -> Response {
    if capability != state.capability {
        return error(StatusCode::GONE, "capability_expired");
    }
    if headers
        .get("x-ad-relay-capability")
        .and_then(|value| value.to_str().ok())
        != Some(state.capability.as_str())
    {
        return error(StatusCode::FORBIDDEN, "relay_capability_required");
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
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    if capability != state.capability {
        return error(StatusCode::GONE, "capability_expired");
    }
    if headers
        .get("x-ad-relay-capability")
        .and_then(|value| value.to_str().ok())
        != Some(state.capability.as_str())
    {
        return error(StatusCode::FORBIDDEN, "relay_capability_required");
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
async fn create_invite(State(state): State<AppState>, body: Bytes) -> Response {
    let body: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => return error(StatusCode::BAD_REQUEST, "invalid_json"),
    };
    let invite = match body.get("invite").and_then(Value::as_str) {
        Some(v) if v.len() <= 96 * 1024 && validate_invite(v, &state.origin) => v.to_owned(),
        _ => return error(StatusCode::BAD_REQUEST, "invalid_signed_invite"),
    };
    let code = match invite_code() {
        Ok(v) => v,
        Err(_) => {
            return error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "random_generation_failed",
            )
        }
    };
    let timestamp = now();
    let record = Invite {
        version: 1,
        code_hash: code_hash(&code),
        invite_digest: hex(&Sha256::digest(invite.as_bytes())),
        invite,
        created_at: timestamp,
        expires_at: timestamp + 600,
        consumed_at: None,
        pairing_response: None,
    };
    let mut invites = state.invites.lock().await;
    let result = record.clone();
    invites.retain(|item| item.expires_at > timestamp);
    invites.push(record);
    if persist_invites(
        &PathBuf::from(
            env::var("AD_RELAY_DATA_DIR").unwrap_or_else(|_| ".another-dimension-relay".into()),
        )
        .join("invite-codes.json"),
        &invites,
    )
    .is_err()
    {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "storage_error");
    }
    response(
        StatusCode::CREATED,
        json!({ "created": true, "code": code, "expiresAt": result.expires_at, "inviteDigest": result.invite_digest }),
    )
}
async fn consume_invite(State(state): State<AppState>, body: Bytes) -> Response {
    let body: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => return error(StatusCode::BAD_REQUEST, "invalid_json"),
    };
    let code = match body.get("code").and_then(Value::as_str) {
        Some(v) => v,
        None => return error(StatusCode::NOT_FOUND, "invalid_or_expired"),
    };
    let mut invites = state.invites.lock().await;
    let timestamp = now();
    let Some(record) = invites.iter_mut().find(|item| {
        item.code_hash == code_hash(code)
            && item.expires_at > timestamp
            && item.consumed_at.is_none()
    }) else {
        return error(StatusCode::NOT_FOUND, "invalid_or_expired");
    };
    record.consumed_at = Some(timestamp);
    let payload = json!({ "consumed": true, "invite": record.invite, "inviteDigest": record.invite_digest, "receipt": receipt(&state.receipt_key, &state.origin, code, &record.invite, timestamp) });
    if persist_invites(
        &PathBuf::from(
            env::var("AD_RELAY_DATA_DIR").unwrap_or_else(|_| ".another-dimension-relay".into()),
        )
        .join("invite-codes.json"),
        &invites,
    )
    .is_err()
    {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "storage_error");
    }
    response(StatusCode::OK, payload)
}
async fn pairing(State(state): State<AppState>, body: Bytes) -> Response {
    let body: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => return error(StatusCode::BAD_REQUEST, "invalid_json"),
    };
    let code = match body.get("code").and_then(Value::as_str) {
        Some(v) => v,
        None => return error(StatusCode::NOT_FOUND, "invalid_or_expired"),
    };
    let mut invites = state.invites.lock().await;
    let timestamp = now();
    let Some(record) = invites.iter_mut().find(|item| {
        item.code_hash == code_hash(code)
            && item.expires_at > timestamp
            && item.consumed_at.is_some()
    }) else {
        return error(StatusCode::NOT_FOUND, "invalid_or_expired");
    };
    if body.get("read").and_then(Value::as_bool) == Some(true) {
        return response(
            StatusCode::OK,
            json!({ "available": true, "response": record.pairing_response.clone().unwrap_or_else(|| json!({})) }),
        );
    }
    let value = match body.get("response") {
        Some(v)
            if v.is_object()
                && serde_json::to_vec(v)
                    .map(|b| b.len() <= 128 * 1024)
                    .unwrap_or(false) =>
        {
            v.clone()
        }
        _ => return error(StatusCode::BAD_REQUEST, "invalid_pairing_response"),
    };
    if record.pairing_response.is_some() {
        return error(StatusCode::CONFLICT, "pairing_response_already_set");
    }
    record.pairing_response = Some(value);
    if persist_invites(
        &PathBuf::from(
            env::var("AD_RELAY_DATA_DIR").unwrap_or_else(|_| ".another-dimension-relay".into()),
        )
        .join("invite-codes.json"),
        &invites,
    )
    .is_err()
    {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "storage_error");
    }
    response(StatusCode::CREATED, json!({ "accepted": true }))
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
    let invite_path = data_dir.join("invite-codes.json");
    let invites = match fs::read(&invite_path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|_| "invite state is corrupt")?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Vec::new(),
        Err(error) => return Err(error.into()),
    };
    let key_path = data_dir.join("relay-receipt-signing-key.bin");
    let mut seed = [0u8; 32];
    match fs::read(&key_path) {
        Ok(bytes) if bytes.len() == 32 => seed.copy_from_slice(&bytes),
        Ok(_) => return Err("relay receipt key is corrupt".into()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            random_fill(&mut seed)?;
            fs::write(&key_path, seed)?;
            #[cfg(unix)]
            {
                let mut permissions = fs::metadata(&key_path)?.permissions();
                std::os::unix::fs::PermissionsExt::set_mode(&mut permissions, 0o600);
                fs::set_permissions(&key_path, permissions)?;
            }
        }
        Err(error) => return Err(error.into()),
    }
    let origin = format!("http://{host}:{port}");
    let blob_dir = data_dir.join("blobs");
    fs::create_dir_all(&blob_dir)?;
    let state = AppState {
        store: Arc::new(Mutex::new(load_store(data_dir.join("relay-inbox.json"))?)),
        invites: Arc::new(Mutex::new(invites)),
        capability: capability.clone(),
        origin,
        receipt_key: SigningKey::from_bytes(&seed),
        blob_dir,
    };
    let app = Router::new()
        .route("/api/v1/health", get(health))
        .route(
            "/api/v1/inbox/{capability}",
            get(get_inbox).post(post_inbox),
        )
        .route("/api/v1/inbox/{capability}/ack", post(ack_inbox))
        .route("/api/v1/invite-codes/public", post(create_invite))
        .route("/api/v1/invite-codes/consume", post(consume_invite))
        .route("/api/v1/invite-codes/pairing-response", post(pairing))
        .route(
            "/api/v1/blobs/{id}",
            get(get_blob).post(post_blob).delete(delete_blob),
        )
        .with_state(state);
    let address: SocketAddr = format!("{host}:{port}").parse()?;
    let listener = tokio::net::TcpListener::bind(address).await?;
    println!("another-dimension relay listening on http://{address}/api/v1/inbox/{capability}");
    axum::serve(listener, app).await?;
    Ok(())
}
