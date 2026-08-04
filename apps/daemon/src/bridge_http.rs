#![allow(clippy::module_name_repetitions)]

use crate::{
    bridge::{BridgeRequest, LocalBridge},
    identity::AccountRootKey,
    trust::RelayTrust,
};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
};

const MAX_REQUEST_BYTES: usize = 16 * 1024;
const EXCHANGE_PATH: &str = "/local-session/exchange";

/// Minimal HTTP boundary for the local bridge. It intentionally exposes only
/// session bootstrap/status/lock; identity and message APIs remain absent.
pub fn handle_request(bridge: &mut LocalBridge, raw: &[u8], now: u64) -> Vec<u8> {
    handle_request_with_context(bridge, raw, now, None, None, None)
}

pub fn handle_request_with_ui(
    bridge: &mut LocalBridge,
    raw: &[u8],
    now: u64,
    ui_root: Option<&Path>,
) -> Vec<u8> {
    handle_request_with_context(bridge, raw, now, ui_root, None, None)
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IdentityView {
    pub account_id: String,
    pub device_id: String,
    pub display_name: String,
}

pub struct InviteAuthority {
    root: AccountRootKey,
    device_id: String,
    relay_origin: String,
    relay_public_key: Option<[u8; 32]>,
    relay_trust: Option<RelayTrust>,
    pending: Option<([u8; 32], u64)>,
    staged_peer: Option<VerifiedInvite>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerifiedInvite {
    pub account_id: String,
    pub device_id: String,
    pub expires_at: u64,
    pub relay_origin: String,
}

pub fn verify_signed_invite(code: &str, signed_invite: &str, now: u64) -> Option<VerifiedInvite> {
    let mut parts = signed_invite.split('.');
    if parts.next()? != "ADDAINV1" {
        return None;
    }
    let payload = hex_decode(parts.next()?)?;
    let signature = hex_decode(parts.next()?)?;
    if parts.next().is_some() || signature.len() != 64 {
        return None;
    }
    let mut lines = std::str::from_utf8(&payload).ok()?.split('\n');
    if lines.next()? != "another-dimension/invite/v1" {
        return None;
    }
    let account_id = lines.next()?.to_owned();
    let device_id = lines.next()?.to_owned();
    let code_hash = lines.next()?;
    let expires_at = lines.next()?.parse::<u64>().ok()?;
    let relay_origin = lines.next()?.to_owned();
    if lines.next().is_some() || !account_id.starts_with("ad1pk") || now >= expires_at {
        return None;
    }
    let public_key = hex_decode(account_id.strip_prefix("ad1pk")?)?;
    if public_key.len() != 32 || code.is_empty() {
        return None;
    }
    let expected_hash: [u8; 32] = Sha256::digest(code.as_bytes()).into();
    if code_hash != hex_bytes(&expected_hash) {
        return None;
    }
    let key_bytes: [u8; 32] = public_key.try_into().ok()?;
    let key = VerifyingKey::from_bytes(&key_bytes).ok()?;
    let signature_bytes: [u8; 64] = signature.try_into().ok()?;
    key.verify(&payload, &Signature::from_bytes(&signature_bytes))
        .ok()?;
    Some(VerifiedInvite {
        account_id,
        device_id,
        expires_at,
        relay_origin,
    })
}

fn verify_relay_receipt(
    code: &str,
    signed_invite: &str,
    receipt: &str,
    invite: &VerifiedInvite,
    public_key: Option<[u8; 32]>,
    relay_trust: Option<&RelayTrust>,
    now: u64,
) -> bool {
    let parts: Vec<_> = receipt.split('.').collect();
    if parts.len() != 7 || parts[0] != "ADRECEIPT1" {
        return false;
    }
    let Some(public_key) = public_key else {
        return false;
    };
    if let Some(trust) = relay_trust {
        if !trust.allows(&public_key) {
            return false;
        }
    }
    let expected_key_id = Sha256::digest(public_key);
    let origin = String::from_utf8(hex_decode(parts[2]).unwrap_or_default()).ok();
    let code_hash: [u8; 32] = Sha256::digest(code.as_bytes()).into();
    let invite_digest: [u8; 32] = Sha256::digest(signed_invite.as_bytes()).into();
    let consumed_at = parts[5].parse::<u64>().ok();
    let signature = hex_decode(parts[6]).and_then(|value| value.try_into().ok());
    let verifying_key = ed25519_dalek::VerifyingKey::from_bytes(&public_key).ok();
    let signed_body = receipt.rsplit_once('.').map(|(body, _)| body);
    origin.as_deref() == Some(invite.relay_origin.as_str())
        && parts[1] == hex_bytes(&expected_key_id)
        && parts[3] == hex_bytes(&code_hash)
        && parts[4] == hex_bytes(&invite_digest)
        && consumed_at.is_some_and(|value| value <= now.saturating_add(300))
        && signature
            .zip(verifying_key)
            .zip(signed_body)
            .is_some_and(|((signature, key), body)| {
                key.verify_strict(
                    body.as_bytes(),
                    &ed25519_dalek::Signature::from_bytes(&signature),
                )
                .is_ok()
            })
}

impl InviteAuthority {
    pub fn new(
        root: AccountRootKey,
        device_id: impl Into<String>,
        relay_origin: impl Into<String>,
        relay_public_key: Option<[u8; 32]>,
        relay_trust: Option<RelayTrust>,
    ) -> Self {
        Self {
            root,
            device_id: device_id.into(),
            relay_origin: relay_origin.into(),
            relay_public_key,
            relay_trust,
            pending: None,
            staged_peer: None,
        }
    }

    fn create(&mut self, now: u64) -> Option<(String, String)> {
        let mut bytes = [0_u8; 32];
        getrandom::fill(&mut bytes).ok()?;
        let code = hex_bytes(&bytes);
        let expires_at = now.saturating_add(600);
        let code_hash: [u8; 32] = Sha256::digest(code.as_bytes()).into();
        let payload = format!(
            "another-dimension/invite/v1\n{}\n{}\n{}\n{}\n{}",
            self.root.account_id().as_str(),
            self.device_id,
            hex_bytes(&code_hash),
            expires_at,
            self.relay_origin
        );
        let signature = self.root.sign(payload.as_bytes());
        self.pending = Some((code_hash, expires_at));
        Some((
            code,
            format!(
                "ADDAINV1.{}.{}",
                hex_bytes(payload.as_bytes()),
                hex_bytes(&signature)
            ),
        ))
    }
}

pub fn handle_request_with_context(
    bridge: &mut LocalBridge,
    raw: &[u8],
    now: u64,
    ui_root: Option<&Path>,
    identity: Option<&IdentityView>,
    invite_authority: Option<&mut InviteAuthority>,
) -> Vec<u8> {
    let Ok(request) = parse_request(raw) else {
        return response(400, "invalid_request", None, None);
    };
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
                Ok(()) => response(
                    200,
                    r##"{"status":"daemon-session-active","high_risk":false,"private_state":"daemon-owned"}"##,
                    None,
                    Some("application/json"),
                ),
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
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
            match bridge.authorize(&authorization, now) {
                Ok(()) => {
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
            let Some(invite) = verify_signed_invite(code, signed_invite, now) else {
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
            authority.staged_peer = Some(invite.clone());
            let body = format!(
                r##"{{"staged":true,"account_id":"{}","device_id":"{}","expires_at":{}}}"##,
                json_escape(&invite.account_id),
                json_escape(&invite.device_id),
                invite.expires_at
            );
            response(200, &body, None, Some("application/json"))
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
        _ => response(404, "not_found", None, None),
    }
}

pub fn serve_forever(
    mut bridge: LocalBridge,
    ui_root: Option<&Path>,
    identity: Option<IdentityView>,
    mut invite_authority: Option<InviteAuthority>,
) -> std::io::Result<()> {
    let listener = bridge
        .bind_listener()
        .map_err(|error| std::io::Error::other(error.to_string()))?;
    for stream in listener.incoming() {
        if let Ok(mut stream) = stream {
            let _ = serve_connection(
                &mut bridge,
                &mut stream,
                unix_now(),
                ui_root,
                identity.as_ref(),
                invite_authority.as_mut(),
            );
        }
    }
    Ok(())
}

fn serve_connection(
    bridge: &mut LocalBridge,
    stream: &mut TcpStream,
    now: u64,
    ui_root: Option<&Path>,
    identity: Option<&IdentityView>,
    invite_authority: Option<&mut InviteAuthority>,
) -> std::io::Result<()> {
    let mut raw = Vec::new();
    let mut buffer = [0_u8; 2048];
    while raw.len() < MAX_REQUEST_BYTES {
        let read = stream.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        raw.extend_from_slice(&buffer[..read]);
        if raw.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
    }
    let output =
        handle_request_with_context(bridge, &raw, now, ui_root, identity, invite_authority);
    stream.write_all(&output)
}

struct Request<'a> {
    method: &'a str,
    path: &'a str,
    headers: Vec<(&'a str, &'a str)>,
    body: &'a [u8],
}
impl<'a> Request<'a> {
    fn header(&self, name: &str) -> Option<&'a str> {
        self.headers
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| *value)
    }
}

fn parse_request(raw: &[u8]) -> Result<Request<'_>, ()> {
    if raw.len() > MAX_REQUEST_BYTES {
        return Err(());
    }
    let separator = raw
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .ok_or(())?;
    let header_text = std::str::from_utf8(&raw[..separator]).map_err(|_| ())?;
    let mut lines = header_text.split("\r\n");
    let mut start = lines.next().ok_or(())?.split_whitespace();
    let method = start.next().ok_or(())?;
    let target = start.next().ok_or(())?;
    let version = start.next().ok_or(())?;
    if version != "HTTP/1.1" || target.contains('?') || target.contains('#') {
        return Err(());
    }
    let mut headers = Vec::new();
    for line in lines {
        let (key, value) = line.split_once(':').ok_or(())?;
        if value.contains('\r') || value.contains('\n') {
            return Err(());
        }
        headers.push((key.trim(), value.trim()));
    }
    let body = &raw[separator + 4..];
    if body.len() > 8 * 1024 {
        return Err(());
    }
    Ok(Request {
        method,
        path: target,
        headers,
        body,
    })
}

fn json_string<'a>(body: &'a [u8], key: &str) -> Option<&'a str> {
    let text = std::str::from_utf8(body).ok()?;
    let marker = format!(r##""{}":""##, key);
    let start = text.find(&marker)? + marker.len();
    let end = text[start..].find('"')? + start;
    let value = &text[start..end];
    (!value.is_empty() && !value.contains('\\') && !value.chars().any(|ch| ch.is_control()))
        .then_some(value)
}

fn json_escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn cookie_value<'a>(header: &'a str, name: &str) -> Option<&'a str> {
    header
        .split(';')
        .map(str::trim)
        .find_map(|part| part.strip_prefix(&format!("{name}=")))
}

fn response(
    status: u16,
    body: &str,
    set_cookie: Option<&str>,
    content_type: Option<&str>,
) -> Vec<u8> {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        _ => "Error",
    };
    let content_type = content_type.unwrap_or("text/plain; charset=utf-8");
    let cookie = set_cookie
        .map(|value| format!("Set-Cookie: {value}\r\n"))
        .unwrap_or_default();
    format!("HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n{cookie}\r\n{body}", body.len()).into_bytes()
}

fn static_file(ui_root: Option<&Path>, relative: &str) -> Option<Vec<u8>> {
    if relative.is_empty()
        || relative.contains("..")
        || relative.contains('\\')
        || relative.contains('%')
        || relative.contains('\0')
    {
        return None;
    }
    let root = ui_root?.canonicalize().ok()?;
    let candidate = root.join(PathBuf::from(relative));
    let canonical = candidate.canonicalize().ok()?;
    if !canonical.starts_with(&root) || !canonical.is_file() {
        return None;
    }
    let bytes = fs::read(canonical).ok()?;
    let content_type = match Path::new(relative)
        .extension()
        .and_then(|value| value.to_str())
    {
        Some("html") => "text/html; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") | Some("webmanifest") => "application/json",
        Some("wasm") => "application/wasm",
        _ => "application/octet-stream",
    };
    response_bytes(200, &bytes, content_type)
}

fn response_bytes(status: u16, body: &[u8], content_type: &str) -> Option<Vec<u8>> {
    let reason = match status {
        200 => "OK",
        _ => "Error",
    };
    Some(format!("HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n", body.len()).into_bytes().into_iter().chain(body.iter().copied()).collect())
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
    use super::handle_request;
    use crate::bridge::{BridgeConfig, LocalBridge};
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
}
