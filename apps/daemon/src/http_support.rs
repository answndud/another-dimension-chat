use axum::{body::Body, http::StatusCode, response::Response};
use std::{
    fs,
    path::{Path, PathBuf},
};

const MAX_REQUEST_BYTES: usize = 192 * 1024;

pub(crate) fn axum_request_bytes(
    parts: &axum::http::request::Parts,
    body: &[u8],
) -> Option<Vec<u8>> {
    let target = parts.uri.path_and_query()?.as_str();
    if target.contains('?') || target.contains('#') {
        return None;
    }
    let method = parts.method.as_str();
    let mut raw = format!("{method} {target} HTTP/1.1\r\n");
    for (name, value) in &parts.headers {
        let value = value.to_str().ok()?;
        raw.push_str(name.as_str());
        raw.push_str(": ");
        raw.push_str(value);
        raw.push_str("\r\n");
    }
    raw.push_str(&format!("Content-Length: {}\r\n\r\n", body.len()));
    let mut bytes = raw.into_bytes();
    bytes.extend_from_slice(body);
    Some(bytes)
}

pub(crate) fn axum_response(raw: Vec<u8>) -> Response<Body> {
    let Some(separator) = raw.windows(4).position(|window| window == b"\r\n\r\n") else {
        return Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(Body::from("invalid daemon response"))
            .expect("static response is valid");
    };
    let header_text = String::from_utf8_lossy(&raw[..separator]);
    let mut lines = header_text.split("\r\n");
    let status = lines
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|value| value.parse::<u16>().ok())
        .and_then(|value| StatusCode::from_u16(value).ok())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut builder = Response::builder().status(status);
    for line in lines {
        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("content-length") {
                continue;
            }
            builder = builder.header(name, value.trim());
        }
    }
    builder
        .body(Body::from(raw[separator + 4..].to_vec()))
        .unwrap_or_else(|_| Response::new(Body::from("invalid daemon response")))
}

pub(crate) struct Request<'a> {
    pub(crate) method: &'a str,
    pub(crate) path: &'a str,
    pub(crate) headers: Vec<(&'a str, &'a str)>,
    pub(crate) body: &'a [u8],
}
impl<'a> Request<'a> {
    pub(crate) fn header(&self, name: &str) -> Option<&'a str> {
        self.headers
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| *value)
    }
}

pub(crate) fn parse_request(raw: &[u8]) -> Result<Request<'_>, ()> {
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
    if body.len() > MAX_REQUEST_BYTES {
        return Err(());
    }
    Ok(Request {
        method,
        path: target,
        headers,
        body,
    })
}

pub(crate) fn json_string<'a>(body: &'a [u8], key: &str) -> Option<&'a str> {
    let text = std::str::from_utf8(body).ok()?;
    let marker = format!(r##""{}":""##, key);
    let start = text.find(&marker)? + marker.len();
    let end = text[start..].find('"')? + start;
    let value = &text[start..end];
    (!value.is_empty() && !value.contains('\\') && !value.chars().any(|ch| ch.is_control()))
        .then_some(value)
}

pub(crate) fn json_u64(body: &[u8], key: &str) -> Option<u64> {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()?
        .get(key)?
        .as_u64()
}

pub(crate) fn json_bool(body: &[u8], key: &str) -> Option<bool> {
    let needle = format!(r##""{}":"##, key);
    let text = std::str::from_utf8(body).ok()?;
    let tail = text.split_once(&needle)?.1;
    if tail.starts_with("true") {
        Some(true)
    } else if tail.starts_with("false") {
        Some(false)
    } else {
        None
    }
}

pub(crate) fn json_string_array(body: &[u8], key: &str) -> Option<Vec<String>> {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()?
        .get(key)?
        .as_array()?
        .iter()
        .map(|value| value.as_str().map(str::to_owned))
        .collect()
}

pub(crate) fn delivery_state_name(state: crate::delivery::DeliveryState) -> &'static str {
    match state {
        crate::delivery::DeliveryState::Draft => "draft",
        crate::delivery::DeliveryState::Encrypted => "encrypted",
        crate::delivery::DeliveryState::Queued => "queued",
        crate::delivery::DeliveryState::RelayAccepted => "relay-accepted",
        crate::delivery::DeliveryState::RecipientReceived => "recipient-received",
        crate::delivery::DeliveryState::Decrypted => "decrypted",
        crate::delivery::DeliveryState::Retryable => "retryable",
        crate::delivery::DeliveryState::Failed => "failed",
        crate::delivery::DeliveryState::Cancelled => "cancelled",
    }
}

pub(crate) fn json_escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

pub(crate) fn cookie_value<'a>(header: &'a str, name: &str) -> Option<&'a str> {
    header
        .split(';')
        .map(str::trim)
        .find_map(|part| part.strip_prefix(&format!("{name}=")))
}

pub(crate) fn response(
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
    let body = if content_type.eq_ignore_ascii_case("application/json")
        && !body.trim_start().starts_with('{')
        && !body.trim_start().starts_with('[')
    {
        format!(r##"{{"error":"{}"}}"##, json_escape(body))
    } else {
        body.to_owned()
    };
    let cookie = set_cookie
        .map(|value| format!("Set-Cookie: {value}\r\n"))
        .unwrap_or_default();
    format!("HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n{cookie}\r\n{body}", body.len()).into_bytes()
}

pub(crate) fn static_file(ui_root: Option<&Path>, relative: &str) -> Option<Vec<u8>> {
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

pub(crate) fn response_bytes(status: u16, body: &[u8], content_type: &str) -> Option<Vec<u8>> {
    let reason = match status {
        200 => "OK",
        _ => "Error",
    };
    Some(format!("HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n", body.len()).into_bytes().into_iter().chain(body.iter().copied()).collect())
}
