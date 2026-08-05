//! Daemon-owned relay transport.
//!
//! This first transport deliberately supports only loopback HTTP, which is
//! useful for local integration without pretending that an unpinned remote
//! HTTPS connection is production-safe. P0.11 adds the remote TLS provider,
//! pinning, redirect policy, and endpoint re-trust flow.

use crate::delivery::RelayEnvelope;
use axum::http::Uri;
use serde::Deserialize;
use std::time::Duration;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
    time::timeout,
};

const MAX_RESPONSE_BYTES: usize = 128 * 1024;

#[derive(Debug, Eq, PartialEq)]
pub enum RelayError {
    InvalidEndpoint,
    UnsupportedTransport,
    InvalidCapability,
    Connect,
    Timeout,
    ResponseTooLarge,
    InvalidResponse,
    Rejected(u16),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RelayEndpoint {
    pub origin: String,
    pub path: String,
    pub capability: String,
}

impl RelayEndpoint {
    pub fn from_inbox_url(value: &str) -> Result<Self, RelayError> {
        let uri: Uri = value.parse().map_err(|_| RelayError::InvalidEndpoint)?;
        let scheme = uri.scheme_str().ok_or(RelayError::InvalidEndpoint)?;
        let authority = uri.authority().ok_or(RelayError::InvalidEndpoint)?;
        let host = authority.host();
        if scheme != "http" || !matches!(host, "127.0.0.1" | "localhost" | "[::1]") {
            return Err(RelayError::UnsupportedTransport);
        }
        if uri.query().is_some()
            || uri.path().is_empty()
            || !uri.path().starts_with("/api/v1/inbox/")
        {
            return Err(RelayError::InvalidEndpoint);
        }
        let capability = uri.path().rsplit('/').next().unwrap_or_default();
        if capability.len() != 43
            || !capability
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
        {
            return Err(RelayError::InvalidCapability);
        }
        Ok(Self {
            origin: format!("http://{authority}"),
            path: uri.path().to_owned(),
            capability: capability.to_owned(),
        })
    }

    fn address(&self) -> Result<String, RelayError> {
        self.origin
            .strip_prefix("http://")
            .map(str::to_owned)
            .ok_or(RelayError::InvalidEndpoint)
    }
}

#[derive(Clone, Debug)]
pub struct RelayClient {
    endpoint: RelayEndpoint,
    request_timeout: Duration,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RelayAccepted {
    pub id: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RelayItem {
    pub id: String,
    pub envelope: String,
}

#[derive(Deserialize)]
struct PostResponse {
    accepted: bool,
    id: Option<String>,
}

#[derive(Deserialize)]
struct SyncResponse {
    items: Vec<SyncItem>,
}

#[derive(Deserialize)]
struct SyncItem {
    id: String,
    envelope: String,
}

#[derive(Deserialize)]
struct AckResponse {
    acknowledged: usize,
}

impl RelayClient {
    pub fn new(endpoint: RelayEndpoint) -> Self {
        Self {
            endpoint,
            request_timeout: Duration::from_secs(10),
        }
    }

    pub fn endpoint(&self) -> &RelayEndpoint {
        &self.endpoint
    }

    pub async fn post(&self, envelope: &RelayEnvelope) -> Result<RelayAccepted, RelayError> {
        let wire = envelope
            .to_wire()
            .map_err(|_| RelayError::InvalidResponse)?;
        let body = serde_json::to_vec(&serde_json::json!({ "envelope": format!("ADENV1.{wire}") }))
            .map_err(|_| RelayError::InvalidResponse)?;
        let (status, response) = self.request("POST", &self.endpoint.path, &body).await?;
        if !(200..300).contains(&status) {
            return Err(RelayError::Rejected(status));
        }
        let parsed: PostResponse =
            serde_json::from_slice(&response).map_err(|_| RelayError::InvalidResponse)?;
        if !parsed.accepted {
            return Err(RelayError::Rejected(status));
        }
        Ok(RelayAccepted {
            id: parsed.id.ok_or(RelayError::InvalidResponse)?,
        })
    }

    pub async fn sync(&self) -> Result<Vec<RelayItem>, RelayError> {
        let (status, response) = self.request("GET", &self.endpoint.path, &[]).await?;
        if !(200..300).contains(&status) {
            return Err(RelayError::Rejected(status));
        }
        let parsed: SyncResponse =
            serde_json::from_slice(&response).map_err(|_| RelayError::InvalidResponse)?;
        Ok(parsed
            .items
            .into_iter()
            .map(|item| RelayItem {
                id: item.id,
                envelope: item.envelope,
            })
            .collect())
    }

    pub async fn ack(&self, ids: &[String]) -> Result<usize, RelayError> {
        let body = serde_json::to_vec(&serde_json::json!({ "ids": ids }))
            .map_err(|_| RelayError::InvalidResponse)?;
        let (status, response) = self
            .request("POST", &format!("{}/ack", self.endpoint.path), &body)
            .await?;
        if !(200..300).contains(&status) {
            return Err(RelayError::Rejected(status));
        }
        let parsed: AckResponse =
            serde_json::from_slice(&response).map_err(|_| RelayError::InvalidResponse)?;
        Ok(parsed.acknowledged)
    }

    async fn request(
        &self,
        method: &str,
        path: &str,
        body: &[u8],
    ) -> Result<(u16, Vec<u8>), RelayError> {
        let address = self.endpoint.address()?;
        let stream = timeout(self.request_timeout, TcpStream::connect(address))
            .await
            .map_err(|_| RelayError::Timeout)?
            .map_err(|_| RelayError::Connect)?;
        let mut stream = stream;
        let authority = self
            .endpoint
            .origin
            .strip_prefix("http://")
            .ok_or(RelayError::InvalidEndpoint)?;
        let request = format!(
            "{method} {path} HTTP/1.1\r\nHost: {authority}\r\nConnection: close\r\nAccept: application/json\r\nContent-Type: application/json\r\nX-Ad-Relay-Capability: {}\r\nContent-Length: {}\r\n\r\n",
            self.endpoint.capability, body.len()
        );
        timeout(self.request_timeout, stream.write_all(request.as_bytes()))
            .await
            .map_err(|_| RelayError::Timeout)?
            .map_err(|_| RelayError::Connect)?;
        timeout(self.request_timeout, stream.write_all(body))
            .await
            .map_err(|_| RelayError::Timeout)?
            .map_err(|_| RelayError::Connect)?;
        let mut response = Vec::new();
        timeout(self.request_timeout, stream.read_to_end(&mut response))
            .await
            .map_err(|_| RelayError::Timeout)?
            .map_err(|_| RelayError::Connect)?;
        if response.len() > MAX_RESPONSE_BYTES {
            return Err(RelayError::ResponseTooLarge);
        }
        parse_response(&response)
    }
}

fn parse_response(response: &[u8]) -> Result<(u16, Vec<u8>), RelayError> {
    let split = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .ok_or(RelayError::InvalidResponse)?;
    let head = std::str::from_utf8(&response[..split]).map_err(|_| RelayError::InvalidResponse)?;
    let status = head
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|value| value.parse().ok())
        .ok_or(RelayError::InvalidResponse)?;
    Ok((status, response[split + 4..].to_vec()))
}

#[cfg(test)]
mod tests {
    use super::{RelayEndpoint, RelayError};

    #[test]
    fn endpoint_accepts_only_loopback_http_capability_urls() {
        let endpoint = RelayEndpoint::from_inbox_url(
            "http://127.0.0.1:1421/api/v1/inbox/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq",
        )
        .unwrap();
        assert_eq!(endpoint.capability.len(), 43);
        assert_eq!(
            RelayEndpoint::from_inbox_url(
                "https://relay.example/api/v1/inbox/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq"
            ),
            Err(RelayError::UnsupportedTransport)
        );
        assert_eq!(
            RelayEndpoint::from_inbox_url("http://127.0.0.1:1421/api/v1/inbox/short"),
            Err(RelayError::InvalidCapability)
        );
    }

    #[test]
    fn response_parser_rejects_ambiguous_http() {
        assert_eq!(
            super::parse_response(b"HTTP/1.1 202 Accepted\r\n\r\n{}"),
            Ok((202, b"{}".to_vec()))
        );
        assert_eq!(
            super::parse_response(b"not-http"),
            Err(RelayError::InvalidResponse)
        );
    }
}
