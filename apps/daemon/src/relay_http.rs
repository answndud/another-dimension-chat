//! Daemon-owned relay transport.
//!
//! The transport supports loopback HTTP for local development and explicitly
//! pinned HTTPS endpoints for user-owned relays. It never follows redirects
//! and does not accept an HTTPS endpoint without a configured trust pin.

use crate::delivery::RelayEnvelope;
use crate::trust::TlsCertificatePin;
use axum::http::Uri;
use rustls::{
    client::WebPkiServerVerifier,
    pki_types::{CertificateDer, ServerName, UnixTime},
    ClientConfig, RootCertStore,
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    io::{Read, Write},
    net::TcpStream as StdTcpStream,
    sync::Arc,
    time::Duration,
};
use tokio::{
    io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt},
    net::TcpStream,
    time::timeout,
};
use tokio_rustls::TlsConnector;
use webpki_roots::TLS_SERVER_ROOTS;

const MAX_RESPONSE_BYTES: usize = 128 * 1024;

#[derive(Debug)]
struct PinnedServerCertVerifier {
    inner: Arc<WebPkiServerVerifier>,
    pin: TlsCertificatePin,
}

impl rustls::client::danger::ServerCertVerifier for PinnedServerCertVerifier {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        intermediates: &[CertificateDer<'_>],
        server_name: &ServerName<'_>,
        ocsp_response: &[u8],
        now: UnixTime,
    ) -> Result<rustls::client::danger::ServerCertVerified, rustls::Error> {
        let digest = Sha256::digest(end_entity.as_ref());
        if digest.as_slice() != self.pin.as_bytes() {
            return Err(rustls::Error::General(
                "relay certificate pin mismatch".into(),
            ));
        }
        // An exact certificate pin is an explicit trust anchor for privately
        // operated relays. Publicly trusted certificates still pass the
        // normal WebPKI verifier; pinned private certificates may be
        // self-signed, but only the exact pre-provisioned DER certificate is
        // accepted.
        match self.inner.verify_server_cert(
            end_entity,
            intermediates,
            server_name,
            ocsp_response,
            now,
        ) {
            Ok(verified) => Ok(verified),
            Err(_) => Ok(rustls::client::danger::ServerCertVerified::assertion()),
        }
    }

    fn verify_tls12_signature(
        &self,
        message: &[u8],
        cert: &CertificateDer<'_>,
        dss: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        self.inner.verify_tls12_signature(message, cert, dss)
    }

    fn verify_tls13_signature(
        &self,
        message: &[u8],
        cert: &CertificateDer<'_>,
        dss: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        self.inner.verify_tls13_signature(message, cert, dss)
    }

    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        self.inner.supported_verify_schemes()
    }
}

fn tls_config(pin: TlsCertificatePin) -> Result<Arc<ClientConfig>, RelayError> {
    // The workspace also contains OpenMLS dependencies that may enable a
    // second rustls provider. Select the daemon transport provider explicitly
    // instead of relying on rustls' process-global feature inference.
    let provider = Arc::new(rustls::crypto::ring::default_provider());
    let mut roots = RootCertStore::empty();
    roots.extend(TLS_SERVER_ROOTS.iter().cloned());
    let inner = WebPkiServerVerifier::builder_with_provider(Arc::new(roots), provider.clone())
        .build()
        .map_err(|_| RelayError::TlsConfiguration)?;
    let verifier = Arc::new(PinnedServerCertVerifier { inner, pin });
    Ok(Arc::new(
        ClientConfig::builder_with_provider(provider)
            .with_safe_default_protocol_versions()
            .map_err(|_| RelayError::TlsConfiguration)?
            .dangerous()
            .with_custom_certificate_verifier(verifier)
            .with_no_client_auth(),
    ))
}

#[derive(Debug, Eq, PartialEq)]
pub enum RelayError {
    InvalidEndpoint,
    TrustRequired,
    TlsConfiguration,
    TlsHandshake,
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
    pub tls_certificate_pin: Option<TlsCertificatePin>,
    pub tls_server_name: String,
}

impl RelayEndpoint {
    pub fn from_inbox_url(value: &str) -> Result<Self, RelayError> {
        Self::from_inbox_url_with_pin(value, None)
    }

    /// Parse an endpoint only when its transport trust decision is explicit.
    /// Loopback HTTP remains the development-only default; HTTPS requires a
    /// certificate pin before a TLS connector may use it.
    pub fn from_inbox_url_with_pin(
        value: &str,
        tls_certificate_pin: Option<TlsCertificatePin>,
    ) -> Result<Self, RelayError> {
        let uri: Uri = value.parse().map_err(|_| RelayError::InvalidEndpoint)?;
        let scheme = uri.scheme_str().ok_or(RelayError::InvalidEndpoint)?;
        let authority = uri.authority().ok_or(RelayError::InvalidEndpoint)?;
        let host = authority.host();
        let loopback = matches!(host, "127.0.0.1" | "localhost" | "[::1]");
        if scheme == "http" && (!loopback || tls_certificate_pin.is_some()) {
            return Err(RelayError::UnsupportedTransport);
        }
        if scheme == "https" && tls_certificate_pin.is_none() {
            return Err(RelayError::TrustRequired);
        }
        if scheme != "http" && scheme != "https" {
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
            origin: format!("{scheme}://{authority}"),
            path: uri.path().to_owned(),
            capability: capability.to_owned(),
            tls_certificate_pin,
            tls_server_name: host.to_owned(),
        })
    }

    fn address(&self) -> Result<String, RelayError> {
        self.origin
            .split_once("://")
            .map(|(_, authority)| authority.to_owned())
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

    pub fn post_blocking(&self, envelope: &RelayEnvelope) -> Result<RelayAccepted, RelayError> {
        let wire = envelope
            .to_wire()
            .map_err(|_| RelayError::InvalidResponse)?;
        let body = serde_json::to_vec(&serde_json::json!({ "envelope": format!("ADENV1.{wire}") }))
            .map_err(|_| RelayError::InvalidResponse)?;
        let (status, response) = self.request_blocking("POST", &self.endpoint.path, &body)?;
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

    pub fn sync_blocking(&self) -> Result<Vec<RelayItem>, RelayError> {
        let (status, response) = self.request_blocking("GET", &self.endpoint.path, &[])?;
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

    pub fn ack_blocking(&self, ids: &[String]) -> Result<usize, RelayError> {
        let body = serde_json::to_vec(&serde_json::json!({ "ids": ids }))
            .map_err(|_| RelayError::InvalidResponse)?;
        let (status, response) =
            self.request_blocking("POST", &format!("{}/ack", self.endpoint.path), &body)?;
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
        let tcp = timeout(self.request_timeout, TcpStream::connect(address))
            .await
            .map_err(|_| RelayError::Timeout)?
            .map_err(|_| RelayError::Connect)?;
        if let Some(pin) = self.endpoint.tls_certificate_pin {
            let config = tls_config(pin)?;
            let server_name = ServerName::try_from(self.endpoint.tls_server_name.clone())
                .map_err(|_| RelayError::TlsConfiguration)?;
            let stream = TlsConnector::from(config)
                .connect(server_name, tcp)
                .await
                .map_err(|_| RelayError::TlsHandshake)?;
            return self.request_async_stream(stream, method, path, body).await;
        }
        self.request_async_stream(tcp, method, path, body).await
    }

    async fn request_async_stream<S>(
        &self,
        mut stream: S,
        method: &str,
        path: &str,
        body: &[u8],
    ) -> Result<(u16, Vec<u8>), RelayError>
    where
        S: AsyncRead + AsyncWrite + Unpin,
    {
        let authority = self
            .endpoint
            .origin
            .split_once("://")
            .map(|(_, authority)| authority)
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

    fn request_blocking(
        &self,
        method: &str,
        path: &str,
        body: &[u8],
    ) -> Result<(u16, Vec<u8>), RelayError> {
        let address = self.endpoint.address()?;
        let tcp = StdTcpStream::connect(address).map_err(|_| RelayError::Connect)?;
        tcp.set_read_timeout(Some(self.request_timeout))
            .map_err(|_| RelayError::Connect)?;
        tcp.set_write_timeout(Some(self.request_timeout))
            .map_err(|_| RelayError::Connect)?;
        if let Some(pin) = self.endpoint.tls_certificate_pin {
            let config = tls_config(pin)?;
            let server_name = ServerName::try_from(self.endpoint.tls_server_name.clone())
                .map_err(|_| RelayError::TlsConfiguration)?;
            let connection = rustls::ClientConnection::new(config, server_name)
                .map_err(|_| RelayError::TlsHandshake)?;
            let mut stream = rustls::StreamOwned::new(connection, tcp);
            return self.request_blocking_stream(&mut stream, method, path, body);
        }
        self.request_blocking_stream(tcp, method, path, body)
    }

    fn request_blocking_stream<S>(
        &self,
        mut stream: S,
        method: &str,
        path: &str,
        body: &[u8],
    ) -> Result<(u16, Vec<u8>), RelayError>
    where
        S: Read + Write,
    {
        let authority = self
            .endpoint
            .origin
            .split_once("://")
            .map(|(_, authority)| authority)
            .ok_or(RelayError::InvalidEndpoint)?;
        let request = format!(
            "{method} {path} HTTP/1.1\r\nHost: {authority}\r\nConnection: close\r\nAccept: application/json\r\nContent-Type: application/json\r\nX-Ad-Relay-Capability: {}\r\nContent-Length: {}\r\n\r\n",
            self.endpoint.capability, body.len()
        );
        stream
            .write_all(request.as_bytes())
            .map_err(|_| RelayError::Connect)?;
        stream.write_all(body).map_err(|_| RelayError::Connect)?;
        let mut response = Vec::new();
        stream
            .read_to_end(&mut response)
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
    use crate::trust::TlsCertificatePin;

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
            Err(RelayError::TrustRequired)
        );
        assert_eq!(
            RelayEndpoint::from_inbox_url_with_pin(
                "https://relay.example/api/v1/inbox/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq",
                Some(TlsCertificatePin([0x22; 32]))
            )
            .unwrap()
            .tls_certificate_pin,
            Some(TlsCertificatePin([0x22; 32]))
        );
        assert_eq!(
            RelayEndpoint::from_inbox_url_with_pin(
                "https://relay.example/api/v1/inbox/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq",
                None
            ),
            Err(RelayError::TrustRequired)
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
