use crate::protocol_gate::TtlContract;
use getrandom::fill as secure_random;
use sha2::{Digest, Sha256};
use std::{
    fmt,
    net::{IpAddr, SocketAddr, TcpListener},
    time::Instant,
};
use zeroize::Zeroizing;

const TOKEN_BYTES: usize = 32;
const TOKEN_HASH_BYTES: usize = 32;
const DEFAULT_SESSION_TTL_SECONDS: u64 = 15 * 60;
const MAX_UI_VERSION_BYTES: usize = 64;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BridgeError {
    NonLoopbackBind,
    InvalidUiOrigin,
    InvalidUiVersion,
    InvalidRequestOrigin,
    InvalidHost,
    InvalidBootstrap,
    BootstrapAlreadyConsumed,
    SessionInvalid,
    CsrfRequired,
    RandomnessUnavailable,
}

impl fmt::Display for BridgeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::NonLoopbackBind => "daemon bridge must bind to loopback",
            Self::InvalidUiOrigin => "UI origin must be an exact loopback HTTP origin",
            Self::InvalidUiVersion => "UI version is invalid",
            Self::InvalidRequestOrigin => "request Origin is not the configured UI origin",
            Self::InvalidHost => "request Host is not the configured loopback host",
            Self::InvalidBootstrap => "bootstrap token is invalid",
            Self::BootstrapAlreadyConsumed => "bootstrap token was already consumed",
            Self::SessionInvalid => "daemon session is invalid or expired",
            Self::CsrfRequired => "state-changing request requires the daemon CSRF token",
            Self::RandomnessUnavailable => "secure randomness is unavailable",
        })
    }
}

impl std::error::Error for BridgeError {}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BridgeConfig {
    bind_host: IpAddr,
    port: u16,
    ui_origin: String,
    ui_version: String,
    session_ttl_seconds: u64,
}

impl BridgeConfig {
    pub fn new(
        bind_host: IpAddr,
        port: u16,
        ui_origin: impl Into<String>,
        ui_version: impl Into<String>,
    ) -> Result<Self, BridgeError> {
        let ui_origin = ui_origin.into();
        let ui_version = ui_version.into();
        if !bind_host.is_loopback() {
            return Err(BridgeError::NonLoopbackBind);
        }
        if !is_exact_loopback_origin(&ui_origin, bind_host, port) {
            return Err(BridgeError::InvalidUiOrigin);
        }
        if ui_version.is_empty()
            || ui_version.len() > MAX_UI_VERSION_BYTES
            || ui_version
                .chars()
                .any(|ch| ch.is_control() || ch.is_whitespace())
        {
            return Err(BridgeError::InvalidUiVersion);
        }
        Ok(Self {
            bind_host,
            port,
            ui_origin,
            ui_version,
            session_ttl_seconds: DEFAULT_SESSION_TTL_SECONDS,
        })
    }

    pub fn with_session_ttl(mut self, seconds: u64) -> Self {
        self.session_ttl_seconds = seconds.max(1);
        self
    }

    pub fn bind_host(&self) -> IpAddr {
        self.bind_host
    }
    pub fn port(&self) -> u16 {
        self.port
    }
    pub fn ui_origin(&self) -> &str {
        &self.ui_origin
    }
    pub fn ui_version(&self) -> &str {
        &self.ui_version
    }

    pub fn bind(&self) -> Result<TcpListener, BridgeError> {
        self.bind_listener()
    }

    pub(crate) fn bind_listener(&self) -> Result<TcpListener, BridgeError> {
        TcpListener::bind(SocketAddr::new(self.bind_host, self.port))
            .map_err(|_| BridgeError::NonLoopbackBind)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SessionCredentials {
    pub cookie: String,
    pub set_cookie: String,
    pub csrf_token: String,
    pub expires_at: u64,
    pub ui_version: String,
}

pub struct LocalBridge {
    config: BridgeConfig,
    bootstrap_hash: Option<[u8; TOKEN_HASH_BYTES]>,
    bootstrap_token: Option<Zeroizing<String>>,
    session: Option<SessionState>,
}

struct SessionState {
    cookie_hash: [u8; TOKEN_HASH_BYTES],
    csrf_hash: [u8; TOKEN_HASH_BYTES],
    ttl: TtlContract,
    started: Instant,
}

impl fmt::Debug for LocalBridge {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("LocalBridge")
            .field("ui_origin", &self.config.ui_origin)
            .field("ui_version", &self.config.ui_version)
            .field("bootstrap_available", &self.bootstrap_hash.is_some())
            .field("session_active", &self.session.is_some())
            .field("secrets", &"[redacted]")
            .finish()
    }
}

impl LocalBridge {
    pub fn bind_host(&self) -> IpAddr {
        self.config.bind_host()
    }

    pub fn port(&self) -> u16 {
        self.config.port()
    }

    pub fn new(config: BridgeConfig) -> Result<Self, BridgeError> {
        let bootstrap = random_token()?;
        Ok(Self {
            config,
            bootstrap_hash: Some(hash_token(&bootstrap)),
            bootstrap_token: Some(Zeroizing::new(bootstrap)),
            session: None,
        })
    }

    /// The token exists only in a URL fragment; it is not sent in an HTTP
    /// request and must be removed by the UI immediately after exchange.
    pub fn bootstrap_url(&self, ui_path: &str) -> Result<String, BridgeError> {
        if ui_path.contains('#')
            || ui_path.contains('?')
            || ui_path.contains('\n')
            || ui_path.contains('\r')
        {
            return Err(BridgeError::InvalidUiOrigin);
        }
        let token = self
            .bootstrap_token
            .as_ref()
            .ok_or(BridgeError::BootstrapAlreadyConsumed)?;
        Ok(format!(
            "{}{}#ad_bootstrap={}",
            self.config.ui_origin,
            ui_path,
            token.as_str()
        ))
    }

    /// Exchange the one-time clear token supplied from the fragment. The
    /// caller must remove the fragment with history.replaceState immediately.
    pub fn exchange(
        &mut self,
        origin: &str,
        host: &str,
        token: &str,
        ui_version: &str,
        now: u64,
    ) -> Result<SessionCredentials, BridgeError> {
        self.check_origin_host(origin, host)?;
        if ui_version != self.config.ui_version {
            return Err(BridgeError::InvalidBootstrap);
        }
        let expected = self
            .bootstrap_hash
            .ok_or(BridgeError::BootstrapAlreadyConsumed)?;
        if !constant_time_equal(&expected, &hash_token(token)) {
            return Err(BridgeError::InvalidBootstrap);
        }
        self.bootstrap_hash = None;
        self.bootstrap_token = None;
        self.issue_session(now)
    }

    /// Rotates an existing browser session without requiring the one-time
    /// bootstrap fragment again. The old cookie and CSRF token are both
    /// required, including when the idle TTL has elapsed.
    pub fn renew(
        &mut self,
        origin: &str,
        host: &str,
        cookie: &str,
        csrf_token: &str,
        ui_version: &str,
        now: u64,
    ) -> Result<SessionCredentials, BridgeError> {
        self.check_origin_host(origin, host)?;
        if ui_version != self.config.ui_version {
            return Err(BridgeError::SessionInvalid);
        }
        let session = self.session.as_ref().ok_or(BridgeError::SessionInvalid)?;
        if !constant_time_equal(&session.cookie_hash, &hash_token(cookie))
            || !constant_time_equal(&session.csrf_hash, &hash_token(csrf_token))
        {
            return Err(BridgeError::SessionInvalid);
        }
        self.issue_session(now)
    }

    fn issue_session(&mut self, now: u64) -> Result<SessionCredentials, BridgeError> {
        let cookie = random_token()?;
        let csrf_token = random_token()?;
        let ttl = TtlContract {
            issued_at: now,
            ttl_seconds: self.config.session_ttl_seconds,
        };
        self.session = Some(SessionState {
            cookie_hash: hash_token(&cookie),
            csrf_hash: hash_token(&csrf_token),
            ttl,
            started: Instant::now(),
        });
        Ok(SessionCredentials {
            set_cookie: format!(
                "ad_session={cookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age={}",
                self.config.session_ttl_seconds
            ),
            cookie,
            csrf_token,
            expires_at: ttl.expires_at(),
            ui_version: self.config.ui_version.clone(),
        })
    }

    pub fn authorize(&self, request: &BridgeRequest<'_>, now: u64) -> Result<(), BridgeError> {
        self.check_origin_host(request.origin, request.host)?;
        if request.ui_version != self.config.ui_version {
            return Err(BridgeError::SessionInvalid);
        }
        let session = self.session.as_ref().ok_or(BridgeError::SessionInvalid)?;
        if session
            .ttl
            .is_expired(now, session.started.elapsed().as_secs())
            || !constant_time_equal(&session.cookie_hash, &hash_token(request.cookie))
        {
            return Err(BridgeError::SessionInvalid);
        }
        if is_state_changing_method(request.method)
            && !constant_time_equal(
                &session.csrf_hash,
                &hash_token(request.csrf_token.unwrap_or("")),
            )
        {
            return Err(BridgeError::CsrfRequired);
        }
        Ok(())
    }

    pub fn invalidate_session(&mut self) {
        self.session = None;
    }

    fn check_origin_host(&self, origin: &str, host: &str) -> Result<(), BridgeError> {
        if origin != self.config.ui_origin {
            return Err(BridgeError::InvalidRequestOrigin);
        }
        if host != expected_host(self.config.bind_host, self.config.port) {
            return Err(BridgeError::InvalidHost);
        }
        Ok(())
    }
}

pub struct BridgeRequest<'a> {
    pub origin: &'a str,
    pub host: &'a str,
    pub method: &'a str,
    pub cookie: &'a str,
    pub csrf_token: Option<&'a str>,
    pub ui_version: &'a str,
}

fn is_state_changing_method(method: &str) -> bool {
    matches!(method, "POST" | "PUT" | "PATCH" | "DELETE")
}

fn expected_host(bind_host: IpAddr, port: u16) -> String {
    match bind_host {
        IpAddr::V4(address) => format!("{address}:{port}"),
        IpAddr::V6(address) => format!("[{address}]:{port}"),
    }
}

fn is_exact_loopback_origin(origin: &str, bind_host: IpAddr, port: u16) -> bool {
    let expected = format!("http://{}", expected_host(bind_host, port));
    origin == expected
}

fn random_token() -> Result<String, BridgeError> {
    let mut bytes = [0_u8; TOKEN_BYTES];
    secure_random(&mut bytes).map_err(|_| BridgeError::RandomnessUnavailable)?;
    Ok(hex_bytes(&bytes))
}

fn hash_token(token: &str) -> [u8; TOKEN_HASH_BYTES] {
    Sha256::digest(token.as_bytes()).into()
}

fn constant_time_equal(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    let mut difference = 0_u8;
    for (a, b) in left.iter().zip(right) {
        difference |= a ^ b;
    }
    difference == 0
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

#[cfg(test)]
mod tests {
    use super::{BridgeConfig, BridgeError, BridgeRequest, LocalBridge};
    use std::net::{IpAddr, Ipv4Addr};

    fn config() -> BridgeConfig {
        BridgeConfig::new(
            IpAddr::V4(Ipv4Addr::LOCALHOST),
            1420,
            "http://127.0.0.1:1420",
            "web-v1",
        )
        .unwrap()
        .with_session_ttl(60)
    }

    #[test]
    fn bridge_rejects_non_loopback_and_cross_origin() {
        assert_eq!(
            BridgeConfig::new(
                "192.0.2.1".parse().unwrap(),
                1420,
                "http://192.0.2.1:1420",
                "web-v1"
            ),
            Err(BridgeError::NonLoopbackBind)
        );
        let mut bridge = LocalBridge::new(config()).unwrap();
        assert_eq!(
            bridge.exchange(
                "https://evil.example",
                "127.0.0.1:1420",
                "wrong",
                "web-v1",
                10
            ),
            Err(BridgeError::InvalidRequestOrigin)
        );
    }

    #[test]
    fn bootstrap_is_one_time_and_session_requires_csrf_for_mutations() {
        let mut bridge = LocalBridge::new(config()).unwrap();
        let token = bridge.bootstrap_token.as_ref().unwrap().to_string();
        let credentials = bridge
            .exchange(
                "http://127.0.0.1:1420",
                "127.0.0.1:1420",
                &token,
                "web-v1",
                100,
            )
            .unwrap();
        assert!(credentials.set_cookie.contains("HttpOnly"));
        assert!(credentials.set_cookie.contains("SameSite=Strict"));
        assert_eq!(
            bridge.exchange(
                "http://127.0.0.1:1420",
                "127.0.0.1:1420",
                &token,
                "web-v1",
                101
            ),
            Err(BridgeError::BootstrapAlreadyConsumed)
        );
        let request = BridgeRequest {
            origin: "http://127.0.0.1:1420",
            host: "127.0.0.1:1420",
            method: "POST",
            cookie: &credentials.cookie,
            csrf_token: None,
            ui_version: "web-v1",
        };
        assert_eq!(
            bridge.authorize(&request, 110),
            Err(BridgeError::CsrfRequired)
        );
        let authorized = BridgeRequest {
            csrf_token: Some(&credentials.csrf_token),
            ..request
        };
        assert_eq!(bridge.authorize(&authorized, 110), Ok(()));
        let renewed = bridge
            .renew(
                "http://127.0.0.1:1420",
                "127.0.0.1:1420",
                &credentials.cookie,
                &credentials.csrf_token,
                "web-v1",
                200,
            )
            .unwrap();
        assert_ne!(renewed.cookie, credentials.cookie);
        assert_eq!(
            bridge.authorize(
                &BridgeRequest {
                    cookie: &renewed.cookie,
                    csrf_token: Some(&renewed.csrf_token),
                    ..authorized
                },
                201
            ),
            Ok(())
        );
    }

    #[test]
    fn stale_cookie_version_and_restart_fail_closed() {
        let mut bridge = LocalBridge::new(config()).unwrap();
        let token = bridge.bootstrap_token.as_ref().unwrap().to_string();
        let credentials = bridge
            .exchange(
                "http://127.0.0.1:1420",
                "127.0.0.1:1420",
                &token,
                "web-v1",
                100,
            )
            .unwrap();
        let stale = BridgeRequest {
            origin: "http://127.0.0.1:1420",
            host: "127.0.0.1:1420",
            method: "GET",
            cookie: &credentials.cookie,
            csrf_token: None,
            ui_version: "web-v0",
        };
        assert_eq!(
            bridge.authorize(&stale, 110),
            Err(BridgeError::SessionInvalid)
        );
        let expired = BridgeRequest {
            ui_version: "web-v1",
            ..stale
        };
        assert_eq!(
            bridge.authorize(&expired, 200),
            Err(BridgeError::SessionInvalid)
        );
        bridge.invalidate_session();
        assert_eq!(
            bridge.authorize(&expired, 110),
            Err(BridgeError::SessionInvalid)
        );
    }
}
