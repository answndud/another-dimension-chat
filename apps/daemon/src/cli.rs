use crate::{
    bridge::{BridgeConfig, LocalBridge},
    bridge_http::{serve_forever, IdentityView, InviteAuthority},
    device::{DeviceRegistry, DeviceRegistryError},
    device_link::{DeviceLinkApproval, DeviceLinkRequest, PendingDeviceKey},
    identity::{AccountRootKey, DeviceIdentity, ProfileIdentity},
    mls_session::MlsSessionCatalog,
    storage::{EncryptedStore, RecordClass, RecordMutation, StorageError},
    trust::{relay_tls_pin_record_key, RelayTrust, TlsCertificatePin},
};
use sha2::{Digest, Sha256};
use std::{
    fs, io,
    path::{Path, PathBuf},
};

const IDENTITY_RECORD_MAGIC: &[u8; 13] = b"ADIDENTITY1\0\0";
const LINKED_IDENTITY_RECORD_MAGIC: &[u8; 13] = b"ADIDENTITY2\0\0";
const RECOVERY_MAGIC: &[u8; 13] = b"ADRECOVERY2\0\0";
const STORE_FILE: &str = "store.adstore";
const REVISION_FILE: &str = "store.adstore.revision";

#[derive(Debug)]
pub enum CliError {
    Usage(String),
    Io,
    Storage(StorageError),
    NotInitialized,
    AlreadyInitialized,
    UnsafeSecretArgument,
    Unsupported(String),
    InvalidRecovery,
}

impl std::fmt::Display for CliError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Usage(value) => write!(f, "usage error: {value}"),
            Self::Io => f.write_str("local daemon I/O failed"),
            Self::Storage(error) => write!(f, "storage error: {error}"),
            Self::NotInitialized => f.write_str("daemon profile is not initialized"),
            Self::AlreadyInitialized => {
                f.write_str("daemon profile already exists; refusing overwrite")
            }
            Self::UnsafeSecretArgument => f.write_str(
                "do not pass secrets in command arguments; provide the passphrase on stdin",
            ),
            Self::Unsupported(value) => write!(f, "command is not implemented yet: {value}"),
            Self::InvalidRecovery => {
                f.write_str("recovery artifact is invalid or would overwrite existing state")
            }
        }
    }
}

impl std::error::Error for CliError {}
impl From<io::Error> for CliError {
    fn from(_: io::Error) -> Self {
        Self::Io
    }
}
impl From<StorageError> for CliError {
    fn from(error: StorageError) -> Self {
        Self::Storage(error)
    }
}

pub fn needs_passphrase(args: &[String]) -> bool {
    matches!(args.first().map(String::as_str), Some("init"))
        || matches!(args.first().map(String::as_str), Some("serve"))
        || matches!(
            (
                args.first().map(String::as_str),
                args.get(1).map(String::as_str)
            ),
            (Some("identity"), Some("show"))
        )
        || matches!(args.first().map(String::as_str), Some("device"))
        || matches!(
            (
                args.first().map(String::as_str),
                args.get(1).map(String::as_str)
            ),
            (Some("recovery"), Some("rotate"))
        )
        || matches!(args.first().map(String::as_str), Some("wipe"))
}

pub fn run(args: &[String], passphrase: Option<&str>) -> Result<String, CliError> {
    if args
        .iter()
        .any(|arg| arg == "--passphrase" || arg.starts_with("--passphrase="))
    {
        return Err(CliError::UnsafeSecretArgument);
    }
    match args.first().map(String::as_str).unwrap_or("help") {
        "help" | "--help" | "-h" => Ok(help_text()),
        "init" => init(
            args,
            passphrase
                .ok_or_else(|| CliError::Usage("init requires a passphrase from stdin".into()))?,
        ),
        "identity" => identity_show(
            args,
            passphrase.ok_or_else(|| {
                CliError::Usage("identity show requires a passphrase from stdin".into())
            })?,
        ),
        "doctor" => doctor(args),
        "status" => status(args),
        "stop" => stop(args),
        "lock" => Ok(
            "daemon session locked; no active daemon session was retained by this command".into(),
        ),
        "recovery" => recovery(args, passphrase),
        "serve" => serve(
            args,
            passphrase.ok_or_else(|| {
                CliError::Usage("serve requires the profile passphrase from stdin".into())
            })?,
        ),
        "device" => device_command(
            args,
            passphrase.ok_or_else(|| {
                CliError::Usage("device command requires the profile passphrase from stdin".into())
            })?,
        ),
        "wipe" => wipe(
            args,
            passphrase.ok_or_else(|| {
                CliError::Usage("wipe requires the profile passphrase from stdin".into())
            })?,
        ),
        "invite" | "contact" | "update" | "rollback" => Err(CliError::Unsupported(args[0].clone())),
        other => Err(CliError::Usage(format!(
            "unknown command '{other}'; use --help"
        ))),
    }
}

fn serve(args: &[String], passphrase: &str) -> Result<String, CliError> {
    let data_dir = data_dir(args)?;
    let _instance_lock = InstanceLock::acquire(&data_dir)?;
    let port = option(args, "--port")?
        .map(|value| value.parse::<u16>())
        .transpose()
        .map_err(|_| CliError::Usage("--port must be a valid port".into()))?
        .unwrap_or(1420);
    let config = BridgeConfig::new(
        "127.0.0.1".parse().map_err(|_| CliError::Io)?,
        port,
        format!("http://127.0.0.1:{port}"),
        "web-v1",
    )
    .map_err(|_| CliError::Usage("serve requires a loopback port".into()))?;
    let ui_dir = option(args, "--ui-dir")?
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("apps/web/dist"));
    if !ui_dir.is_dir() {
        return Err(CliError::Usage(format!(
            "UI directory does not exist: {}",
            ui_dir.display()
        )));
    }
    let mut store = open_store(&data_dir, passphrase)?;
    let record = store
        .get(RecordClass::AccountRoot, "identity")
        .ok_or(CliError::NotInitialized)?;
    let summary =
        decode_identity_summary(&record).ok_or(CliError::Storage(StorageError::CorruptStore))?;
    let registry = decode_registry(&store)?;
    if registry.account_public_key() != summary.account_public_key {
        return Err(StorageError::CorruptStore.into());
    }
    registry
        .authorize(&summary.device_id, now_seconds())
        .map_err(registry_error)?;
    let root_seed = summary.root_seed;
    let mut session_catalog = MlsSessionCatalog::new_with_device_private_key(summary.device_seed);
    session_catalog
        .restore_all(&store)
        .map_err(|_| StorageError::CorruptStore)?;
    let identity = IdentityView {
        account_id: summary.account_id,
        device_id: summary.device_id,
        display_name: summary.display_name,
    };
    let relay_origin = option(args, "--relay-origin")?.unwrap_or_default();
    let notifications_enabled = args.iter().any(|arg| arg == "--notify");
    let relay_tls_retrust = args.iter().any(|arg| arg == "--relay-tls-retrust");
    let inbox_url = option(args, "--inbox-url")?;
    if let Some(inbox_url) = &inbox_url {
        let expected_prefix = format!("{relay_origin}/api/v1/inbox/");
        if relay_origin.is_empty() || !inbox_url.starts_with(&expected_prefix) {
            return Err(CliError::Usage(
                "--inbox-url must belong to --relay-origin and use /api/v1/inbox/<capability>"
                    .into(),
            ));
        }
    }
    let relay_public_key = option(args, "--relay-public-key")?
        .map(|value| parse_hex_key(&value))
        .transpose()
        .map_err(|_| CliError::Usage("--relay-public-key must be 32-byte lowercase hex".into()))?;
    let relay_tls_pin = option(args, "--relay-tls-pin")?
        .map(|value| TlsCertificatePin::parse(&value))
        .transpose()
        .map_err(|_| CliError::Usage("--relay-tls-pin must use sha256:<64-hex>".into()))?;
    let relay_tls_pin =
        resolve_relay_tls_pin(&mut store, &relay_origin, relay_tls_pin, relay_tls_retrust)?;
    if relay_origin.starts_with("https://") && relay_tls_pin.is_none() {
        return Err(CliError::Usage(
            "HTTPS relay requires --relay-tls-pin or a previously trusted pin".into(),
        ));
    }
    let relay_fingerprint = option(args, "--relay-public-key-fingerprint")?;
    let trust_manifest = option(args, "--relay-trust-manifest")?;
    let trust_bootstrap = option(args, "--relay-trust-bootstrap-key")?
        .map(|value| parse_hex_key(&value))
        .transpose()
        .map_err(|_| {
            CliError::Usage("--relay-trust-bootstrap-key must be 32-byte lowercase hex".into())
        })?;
    if trust_manifest.is_some() != trust_bootstrap.is_some() {
        return Err(CliError::Usage(
            "--relay-trust-manifest and --relay-trust-bootstrap-key must be supplied together"
                .into(),
        ));
    }
    if relay_public_key.is_some() != relay_fingerprint.is_some() {
        return Err(CliError::Usage(
            "--relay-public-key and --relay-public-key-fingerprint must be supplied together"
                .into(),
        ));
    }
    if let (Some(key), Some(fingerprint)) = (relay_public_key, relay_fingerprint.as_deref()) {
        let expected = Sha256::digest(key)
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        if fingerprint != expected {
            return Err(CliError::Usage(
                "relay public key fingerprint mismatch; refuse to start".into(),
            ));
        }
    }
    let relay_trust = match (trust_manifest, trust_bootstrap) {
        (Some(path), Some(bootstrap)) => Some(
            RelayTrust::from_manifest(Path::new(&path), bootstrap).map_err(|_| {
                CliError::Usage(
                    "relay trust manifest is invalid or not signed by the supplied bootstrap key"
                        .into(),
                )
            })?,
        ),
        _ => None,
    };
    let mut authority = match root_seed {
        Some(seed) => InviteAuthority::new(
            AccountRootKey::from_seed(seed),
            identity.device_id.clone(),
            relay_origin,
            inbox_url,
            relay_public_key,
            relay_tls_pin,
            relay_trust,
        ),
        None => InviteAuthority::new_rootless(
            summary.account_public_key,
            identity.device_id.clone(),
            relay_origin,
            inbox_url,
            relay_public_key,
            relay_tls_pin,
            relay_trust,
        ),
    };
    authority.set_device_registry(registry);
    authority
        .restore_pairing(&store)
        .map_err(|_| CliError::Storage(StorageError::CorruptStore))?;
    authority
        .restore_contacts(&store)
        .map_err(|_| CliError::Storage(StorageError::CorruptStore))?;
    authority
        .restore_received_attachments(&store)
        .map_err(|_| CliError::Storage(StorageError::CorruptStore))?;
    let bridge = LocalBridge::new(config.clone()).map_err(|_| CliError::Io)?;
    let url = bridge.bootstrap_url("/").map_err(|_| CliError::Io)?;
    eprintln!("daemon bridge listening on 127.0.0.1:{port}");
    eprintln!("open once: {url}");
    if args.iter().any(|arg| arg == "--open") {
        open_browser(&url);
    }
    serve_forever(
        bridge,
        Some(&ui_dir),
        Some(identity),
        Some(authority),
        session_catalog,
        store,
        notifications_enabled,
    )
    .map_err(|error| {
        if error.kind() == io::ErrorKind::AddrInUse {
            CliError::Usage(format!(
                "port {port} is already in use; choose another --port or stop the existing daemon"
            ))
        } else {
            CliError::from(error)
        }
    })?;
    Ok("daemon stopped".into())
}

fn open_browser(url: &str) {
    if !cfg!(target_os = "macos") {
        eprintln!("browser auto-open is only supported on macOS; copy the URL above");
        return;
    }
    match std::process::Command::new("open").arg(url).status() {
        Ok(status) if status.success() => eprintln!("browser opened"),
        _ => eprintln!(
            "could not open the browser automatically; copy the one-time URL above into Chromium"
        ),
    }
}

struct InstanceLock {
    path: PathBuf,
}

impl InstanceLock {
    fn acquire(data_dir: &Path) -> Result<Self, CliError> {
        fs::create_dir_all(data_dir)?;
        let path = data_dir.join("daemon.lock");
        for attempt in 0..2 {
            let mut file = match fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&path)
            {
                Ok(file) => file,
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists && attempt == 0 => {
                    let Some(pid) = lock_pid(&path) else {
                        return Err(CliError::Usage(
                            "daemon.lock exists but has no valid PID; inspect it before removal"
                                .into(),
                        ));
                    };
                    if process_is_daemon(pid) {
                        return Err(CliError::Usage(format!(
                            "daemon is already running with PID {pid}"
                        )));
                    }
                    if process_is_alive(pid) {
                        return Err(CliError::Usage(format!(
                            "daemon.lock PID {pid} belongs to another process; inspect it before removal"
                        )));
                    }
                    fs::remove_file(&path)?;
                    continue;
                }
                Err(error) => return Err(error.into()),
            };
            use std::io::Write;
            writeln!(file, "pid={}", std::process::id())?;
            return Ok(Self { path });
        }
        Err(CliError::Usage("could not acquire daemon.lock".into()))
    }
}

impl Drop for InstanceLock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

fn init(args: &[String], passphrase: &str) -> Result<String, CliError> {
    let data_dir = data_dir(args)?;
    let display_name = option(args, "--display-name")?
        .ok_or_else(|| CliError::Usage("init requires --display-name".into()))?;
    if store_path(&data_dir).exists() {
        return Err(CliError::AlreadyInitialized);
    }
    fs::create_dir_all(&data_dir)?;
    set_private_dir(&data_dir)?;
    let root = AccountRootKey::generate().map_err(|_| CliError::Io)?;
    let device = root
        .issue_device("device-1", [0; 32], 0, u64::MAX - 1)
        .map_err(|_| CliError::Io)?;
    let profile = ProfileIdentity::from_account(&root, display_name, None)
        .map_err(|_| CliError::Usage("display name is invalid".into()))?;
    let mut store = EncryptedStore::initialize(store_path(&data_dir), passphrase)?;
    let mut registry = DeviceRegistry::new(&root);
    registry
        .register(device.certificate().clone(), 0)
        .map_err(registry_error)?;
    store.put(
        RecordClass::AccountRoot,
        "identity",
        &encode_identity(&root, &device, &profile),
    )?;
    store.put(
        RecordClass::Device,
        "registry",
        &registry.encode().map_err(registry_error)?,
    )?;
    Ok(format!("profile initialized\naccount_id: {}\ndevice_id: {}\nprivate key: encrypted in local daemon store", profile.account_id().as_str(), device.device_id()))
}

fn identity_show(args: &[String], passphrase: &str) -> Result<String, CliError> {
    if args.get(1).map(String::as_str) != Some("show") {
        return Err(CliError::Usage("use identity show".into()));
    }
    let store = open_store(&data_dir(args)?, passphrase)?;
    let record = store
        .get(RecordClass::AccountRoot, "identity")
        .ok_or(CliError::NotInitialized)?;
    let summary =
        decode_identity_summary(&record).ok_or(CliError::Storage(StorageError::CorruptStore))?;
    Ok(format!(
        "account_id: {}\ndevice_id: {}\ndisplay_name: {}\nrelay: none configured",
        summary.account_id, summary.device_id, summary.display_name
    ))
}

fn wipe(args: &[String], passphrase: &str) -> Result<String, CliError> {
    let data_dir = data_dir(args)?;
    let store = open_store(&data_dir, passphrase)?;
    drop(store);
    let store_path = store_path(&data_dir);
    let revision_path = revision_path(&data_dir);
    if !store_path.is_file() || !revision_path.is_file() {
        return Err(CliError::NotInitialized);
    }
    fs::remove_file(&store_path)?;
    fs::remove_file(&revision_path)?;
    Ok(format!(
        "local daemon store deleted: {}\nrelay-side blobs, exported backups, OS/SSD remnants, and browser caches are not deleted",
        data_dir.display()
    ))
}

fn doctor(args: &[String]) -> Result<String, CliError> {
    let data_dir = data_dir(args)?;
    let _relay_tls_pin = option(args, "--relay-tls-pin")?
        .map(|value| TlsCertificatePin::parse(&value))
        .transpose()
        .map_err(|_| CliError::Usage("--relay-tls-pin must use sha256:<64-hex>".into()))?;
    let relay_public_key = option(args, "--relay-public-key")?
        .map(|value| parse_hex_key(&value))
        .transpose()
        .map_err(|_| CliError::Usage("--relay-public-key must be 32-byte lowercase hex".into()))?;
    let relay_fingerprint = option(args, "--relay-public-key-fingerprint")?;
    if relay_public_key.is_some() != relay_fingerprint.is_some() {
        return Err(CliError::Usage(
            "relay public key and fingerprint must be supplied together".into(),
        ));
    }
    if let (Some(key), Some(fingerprint)) = (relay_public_key, relay_fingerprint.as_deref()) {
        let expected = Sha256::digest(key)
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        if fingerprint != expected {
            return Err(CliError::Usage(
                "relay public key fingerprint mismatch".into(),
            ));
        }
    }
    let trust_manifest = option(args, "--relay-trust-manifest")?;
    let trust_bootstrap = option(args, "--relay-trust-bootstrap-key")?
        .map(|value| parse_hex_key(&value))
        .transpose()
        .map_err(|_| {
            CliError::Usage("--relay-trust-bootstrap-key must be 32-byte lowercase hex".into())
        })?;
    if trust_manifest.is_some() != trust_bootstrap.is_some() {
        return Err(CliError::Usage(
            "relay trust manifest and bootstrap key must be supplied together".into(),
        ));
    }
    let trust_status = match (trust_manifest, trust_bootstrap, relay_public_key) {
        (Some(path), Some(bootstrap), Some(key)) => {
            let trust = RelayTrust::from_manifest(Path::new(&path), bootstrap)
                .map_err(|_| CliError::Usage("relay trust manifest verification failed".into()))?;
            if !trust.allows(&key) {
                return Err(CliError::Usage(
                    "relay key is not allowed by the trust manifest".into(),
                ));
            }
            "relay trust: verified"
        }
        (None, None, None) => "relay trust: not configured",
        _ => return Err(CliError::Usage(
            "relay trust preflight requires public key, fingerprint, manifest, and bootstrap key"
                .into(),
        )),
    };
    let checks = [
        format!(
            "data directory: {}",
            if data_dir.is_dir() {
                "present"
            } else {
                "missing"
            }
        ),
        format!(
            "encrypted store: {}",
            if store_path(&data_dir).is_file() {
                "present"
            } else {
                "missing"
            }
        ),
        format!(
            "revision marker: {}",
            if revision_path(&data_dir).is_file() {
                "present"
            } else {
                "missing"
            }
        ),
        "high-risk mode: disabled".into(),
        "OS key store: unavailable; insecure fallback: refused".into(),
        "network/serve bridge: not started by doctor".into(),
        trust_status.into(),
    ];
    let ready =
        data_dir.is_dir() && store_path(&data_dir).is_file() && revision_path(&data_dir).is_file();
    Ok(format!(
        "doctor status: {}\n{}",
        if ready {
            "presence checks passed; unlock verification required; release readiness blocked"
        } else {
            "profile not initialized"
        },
        checks.join("\n")
    ))
}

fn status(args: &[String]) -> Result<String, CliError> {
    let data_dir = data_dir(args)?;
    let lock_path = data_dir.join("daemon.lock");
    let pid = lock_pid(&lock_path);
    let running = pid.is_some_and(process_is_daemon);
    let stale = lock_path.is_file() && !running;
    Ok(format!(
        "daemon status: {}\ndata directory: {}\nstore: {}\nlock file: {}{}",
        if running {
            "running"
        } else if stale {
            "stale lock"
        } else {
            "stopped"
        },
        data_dir.display(),
        if store_path(&data_dir).is_file() {
            "present"
        } else {
            "missing"
        },
        if lock_path.is_file() {
            "present"
        } else {
            "absent"
        },
        pid.map_or(String::new(), |pid| format!("\nlock PID: {pid}"))
    ))
}

fn lock_pid(path: &Path) -> Option<u32> {
    let contents = fs::read_to_string(path).ok()?;
    contents
        .strip_prefix("pid=")
        .and_then(|value| value.lines().next())
        .and_then(|value| value.trim().parse().ok())
}

fn process_is_alive(pid: u32) -> bool {
    if pid <= 1 {
        return false;
    }
    std::process::Command::new("kill")
        .args(["-0", &pid.to_string()])
        .stderr(std::process::Stdio::null())
        .status()
        .is_ok_and(|status| status.success())
}

fn process_command(pid: u32) -> Option<String> {
    std::process::Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "command="])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_owned())
        .filter(|command| !command.is_empty())
}

fn process_is_daemon(pid: u32) -> bool {
    process_command(pid).is_some_and(|command| {
        command
            .split_whitespace()
            .next()
            .is_some_and(|executable| executable.ends_with("another-dimension-daemon"))
    })
}

fn stop(args: &[String]) -> Result<String, CliError> {
    let data_dir = data_dir(args)?;
    let path = data_dir.join("daemon.lock");
    let Some(pid) = lock_pid(&path) else {
        return Ok("daemon is not running; no valid lock file found".into());
    };
    if !process_is_alive(pid) {
        fs::remove_file(&path)?;
        return Ok("removed stale daemon lock; no process was running".into());
    }
    if !process_is_daemon(pid) {
        return Err(CliError::Usage(format!(
            "daemon.lock PID {pid} belongs to another process; refusing to send TERM"
        )));
    }
    let status = std::process::Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status()?;
    if !status.success() {
        return Err(CliError::Usage(format!("could not stop daemon PID {pid}")));
    }
    Ok(format!(
        "stop signal sent to daemon PID {pid}; wait for daemon.lock to disappear"
    ))
}

fn recovery(args: &[String], passphrase: Option<&str>) -> Result<String, CliError> {
    match args.get(1).map(String::as_str) {
        Some("export") => {
            let data_dir = data_dir(args)?;
            let output = option(args, "--output")?
                .ok_or_else(|| CliError::Usage("recovery export requires --output".into()))?;
            export_recovery(&data_dir, Path::new(&output))
        }
        Some("import") => {
            let data_dir = data_dir(args)?;
            let input = option(args, "--input")?
                .ok_or_else(|| CliError::Usage("recovery import requires --input".into()))?;
            import_recovery(&data_dir, Path::new(&input))
        }
        Some("inspect") => {
            let input = option(args, "--input")?
                .ok_or_else(|| CliError::Usage("recovery inspect requires --input".into()))?;
            inspect_recovery(Path::new(&input))
        }
        Some("rotate") => {
            let data_dir = data_dir(args)?;
            let credentials = passphrase
                .ok_or_else(|| CliError::Usage("recovery rotate requires old and new passphrases on stdin".into()))?;
            rotate_recovery(&data_dir, credentials)
        }
        _ => Err(CliError::Usage(
            "use recovery export --output PATH, recovery inspect --input PATH, recovery rotate, or recovery import --input PATH".into(),
        )),
    }
}

fn export_recovery(data_dir: &Path, output: &Path) -> Result<String, CliError> {
    if !store_path(data_dir).is_file() || !revision_path(data_dir).is_file() || output.exists() {
        return Err(CliError::InvalidRecovery);
    }
    let store = fs::read(store_path(data_dir))?;
    let revision = fs::read(revision_path(data_dir))?;
    let manifest = RecoveryManifest {
        schema_version: 2,
        created_at: now_seconds(),
        store_bytes: store.len() as u64,
        revision_bytes: revision.len() as u64,
        store_sha256: hex_bytes(&Sha256::digest(&store)),
        revision_sha256: hex_bytes(&Sha256::digest(&revision)),
    };
    let manifest = serde_json::to_vec(&manifest).map_err(|_| CliError::InvalidRecovery)?;
    let mut artifact = Vec::with_capacity(12 + manifest.len() + store.len() + revision.len());
    artifact.extend_from_slice(RECOVERY_MAGIC);
    append_blob(&mut artifact, &manifest);
    append_blob(&mut artifact, &store);
    append_blob(&mut artifact, &revision);
    atomic_write(output, &artifact)?;
    Ok(format!(
        "encrypted recovery exported to {}\nkeep it offline and separate from the device",
        output.display()
    ))
}

fn import_recovery(data_dir: &Path, input: &Path) -> Result<String, CliError> {
    if store_path(data_dir).exists() || revision_path(data_dir).exists() {
        return Err(CliError::AlreadyInitialized);
    }
    let bytes = fs::read(input)?;
    if bytes.len() < RECOVERY_MAGIC.len() || &bytes[..RECOVERY_MAGIC.len()] != RECOVERY_MAGIC {
        return Err(CliError::InvalidRecovery);
    }
    let (manifest_bytes, offset) =
        read_blob(&bytes, RECOVERY_MAGIC.len()).ok_or(CliError::InvalidRecovery)?;
    let manifest: RecoveryManifest =
        serde_json::from_slice(manifest_bytes).map_err(|_| CliError::InvalidRecovery)?;
    if manifest.schema_version != 2 {
        return Err(CliError::InvalidRecovery);
    }
    let (store, offset) = read_blob(&bytes, offset).ok_or(CliError::InvalidRecovery)?;
    let (revision, end) = read_blob(&bytes, offset).ok_or(CliError::InvalidRecovery)?;
    if end != bytes.len()
        || store.len() as u64 != manifest.store_bytes
        || revision.len() as u64 != manifest.revision_bytes
        || hex_bytes(&Sha256::digest(store)) != manifest.store_sha256
        || hex_bytes(&Sha256::digest(revision)) != manifest.revision_sha256
        || store.len() < 32
        || revision.is_empty()
    {
        return Err(CliError::InvalidRecovery);
    }
    fs::create_dir_all(data_dir)?;
    set_private_dir(data_dir)?;
    atomic_write(&store_path(data_dir), store)?;
    atomic_write(&revision_path(data_dir), revision)?;
    Ok(format!(
        "encrypted recovery imported to {}\nunlock with the original passphrase",
        data_dir.display()
    ))
}

fn inspect_recovery(input: &Path) -> Result<String, CliError> {
    let bytes = fs::read(input)?;
    if bytes.len() < RECOVERY_MAGIC.len() || &bytes[..RECOVERY_MAGIC.len()] != RECOVERY_MAGIC {
        return Err(CliError::InvalidRecovery);
    }
    let (manifest, _) = read_blob(&bytes, RECOVERY_MAGIC.len()).ok_or(CliError::InvalidRecovery)?;
    let manifest: RecoveryManifest =
        serde_json::from_slice(manifest).map_err(|_| CliError::InvalidRecovery)?;
    if manifest.schema_version != 2 {
        return Err(CliError::InvalidRecovery);
    }
    Ok(format!(
        "backup schema: {}\ncreated_at: {}\nstore bytes: {}\nrevision bytes: {}\ncontents: encrypted daemon store",
        manifest.schema_version,
        manifest.created_at,
        manifest.store_bytes,
        manifest.revision_bytes
    ))
}

fn rotate_recovery(data_dir: &Path, credentials: &str) -> Result<String, CliError> {
    let mut lines = credentials.lines();
    let old_passphrase = lines.next().unwrap_or("").trim();
    let new_passphrase = lines.next().unwrap_or("").trim();
    if old_passphrase.is_empty() || new_passphrase.is_empty() || lines.next().is_some() {
        return Err(CliError::Usage(
            "recovery rotate stdin must contain exactly two lines: old passphrase, new passphrase"
                .into(),
        ));
    }
    if old_passphrase == new_passphrase {
        return Err(CliError::Usage(
            "new passphrase must differ from the old passphrase".into(),
        ));
    }
    let store = open_store(data_dir, old_passphrase)?;
    let temporary = data_dir.join(format!("store.adstore.rotate-{}", std::process::id()));
    let temporary_revision = PathBuf::from(format!("{}.revision", temporary.display()));
    let _ = fs::remove_file(&temporary);
    let _ = fs::remove_file(&temporary_revision);
    store.rekey_to(&temporary, new_passphrase)?;
    let active = store_path(data_dir);
    let active_revision = revision_path(data_dir);
    let old_store = data_dir.join(format!("store.adstore.old-{}", std::process::id()));
    let old_revision = data_dir.join(format!("store.adstore.revision.old-{}", std::process::id()));
    fs::rename(&active, &old_store)?;
    fs::rename(&active_revision, &old_revision)?;
    if let Err(error) = fs::rename(&temporary, &active) {
        let _ = fs::rename(&old_store, &active);
        let _ = fs::rename(&old_revision, &active_revision);
        let _ = fs::remove_file(&temporary_revision);
        return Err(error.into());
    }
    if let Err(error) = fs::rename(&temporary_revision, &active_revision) {
        let _ = fs::remove_file(&active);
        let _ = fs::rename(&old_store, &active);
        let _ = fs::rename(&old_revision, &active_revision);
        return Err(error.into());
    }
    fs::remove_file(old_store)?;
    fs::remove_file(old_revision)?;
    Ok("database key rewrapped with the new passphrase; existing records were preserved".into())
}

fn encode_identity(
    root: &AccountRootKey,
    device: &DeviceIdentity,
    profile: &ProfileIdentity,
) -> Vec<u8> {
    let mut bytes = Vec::new();
    let root_seed = root.seed_bytes();
    let device_seed = device.seed_bytes();
    bytes.extend_from_slice(IDENTITY_RECORD_MAGIC);
    append_blob(&mut bytes, &*root_seed);
    append_blob(&mut bytes, &*device_seed);
    append_blob(&mut bytes, device.device_id().as_bytes());
    append_blob(&mut bytes, profile.display_name().as_bytes());
    bytes
}

fn encode_linked_identity(
    account_public_key: [u8; 32],
    device_seed: [u8; 32],
    device_id: &str,
    display_name: &str,
) -> Vec<u8> {
    let mut bytes = Vec::new();
    bytes.extend_from_slice(LINKED_IDENTITY_RECORD_MAGIC);
    append_blob(&mut bytes, &account_public_key);
    append_blob(&mut bytes, &device_seed);
    append_blob(&mut bytes, device_id.as_bytes());
    append_blob(&mut bytes, display_name.as_bytes());
    bytes
}

struct IdentitySummary {
    root_seed: Option<[u8; 32]>,
    device_seed: [u8; 32],
    account_public_key: [u8; 32],
    account_id: String,
    device_id: String,
    display_name: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct RecoveryManifest {
    schema_version: u16,
    created_at: u64,
    store_bytes: u64,
    revision_bytes: u64,
    store_sha256: String,
    revision_sha256: String,
}
fn decode_identity_summary(bytes: &[u8]) -> Option<IdentitySummary> {
    if bytes.len() < IDENTITY_RECORD_MAGIC.len() {
        return None;
    }
    if &bytes[..IDENTITY_RECORD_MAGIC.len()] == IDENTITY_RECORD_MAGIC {
        let (root, offset) = read_blob(bytes, IDENTITY_RECORD_MAGIC.len())?;
        let (device_seed, offset) = read_blob(bytes, offset)?;
        let (device_id, offset) = read_blob(bytes, offset)?;
        let (display_name, end) = read_blob(bytes, offset)?;
        if end != bytes.len() || root.len() != 32 || device_seed.len() != 32 {
            return None;
        }
        let root_seed: [u8; 32] = root.try_into().ok()?;
        let device_seed: [u8; 32] = device_seed.try_into().ok()?;
        let root = AccountRootKey::from_seed(root_seed);
        return Some(IdentitySummary {
            root_seed: Some(root_seed),
            device_seed,
            account_public_key: root.public_key(),
            account_id: root.account_id().as_str().into(),
            device_id: String::from_utf8(device_id.to_vec()).ok()?,
            display_name: String::from_utf8(display_name.to_vec()).ok()?,
        });
    }
    if &bytes[..LINKED_IDENTITY_RECORD_MAGIC.len()] != LINKED_IDENTITY_RECORD_MAGIC {
        return None;
    }
    let (account_public_key, offset) = read_blob(bytes, LINKED_IDENTITY_RECORD_MAGIC.len())?;
    let (device_seed, offset) = read_blob(bytes, offset)?;
    let (device_id, offset) = read_blob(bytes, offset)?;
    let (display_name, end) = read_blob(bytes, offset)?;
    if end != bytes.len() || account_public_key.len() != 32 || device_seed.len() != 32 {
        return None;
    }
    let account_public_key: [u8; 32] = account_public_key.try_into().ok()?;
    let device_seed: [u8; 32] = device_seed.try_into().ok()?;
    Some(IdentitySummary {
        root_seed: None,
        device_seed,
        account_public_key,
        account_id: AccountRootKey::account_id_from_public_key(account_public_key)
            .as_str()
            .into(),
        device_id: String::from_utf8(device_id.to_vec()).ok()?,
        display_name: String::from_utf8(display_name.to_vec()).ok()?,
    })
}

fn open_store(data_dir: &Path, passphrase: &str) -> Result<EncryptedStore, CliError> {
    if !store_path(data_dir).is_file() {
        return Err(CliError::NotInitialized);
    }
    Ok(EncryptedStore::open(store_path(data_dir), passphrase)?)
}

fn decode_registry(store: &EncryptedStore) -> Result<DeviceRegistry, CliError> {
    let bytes = store
        .get(RecordClass::Device, "registry")
        .ok_or(CliError::Storage(StorageError::CorruptStore))?;
    DeviceRegistry::decode(&bytes).map_err(registry_error)
}

fn registry_error(error: DeviceRegistryError) -> CliError {
    CliError::Storage(match error {
        DeviceRegistryError::Corrupt => StorageError::CorruptStore,
        DeviceRegistryError::Identity(_) => StorageError::AuthenticationFailed,
        DeviceRegistryError::WrongAccount
        | DeviceRegistryError::DuplicateDevice
        | DeviceRegistryError::UnknownDevice
        | DeviceRegistryError::DeviceNotActive => StorageError::CorruptStore,
    })
}

fn device_command(args: &[String], passphrase: &str) -> Result<String, CliError> {
    match args.get(1).map(String::as_str) {
        Some("link-request") => return device_link_request(args, passphrase),
        Some("link-complete") => return device_link_complete(args, passphrase),
        _ => {}
    }
    let data_dir = data_dir(args)?;
    let mut store = open_store(&data_dir, passphrase)?;
    let mut registry = decode_registry(&store)?;
    match args.get(1).map(String::as_str) {
        Some("list") => Ok(registry
            .records()
            .map(|record| {
                format!(
                    "device_id: {}\nstate: {:?}\nexpires_at: {}",
                    record.certificate().device_id(),
                    record.state(),
                    record.certificate().expires_at()
                )
            })
            .collect::<Vec<_>>()
            .join("\n")),
        Some("revoke") => {
            let device_id = option(args, "--id")?
                .ok_or_else(|| CliError::Usage("device revoke requires --id DEVICE_ID".into()))?;
            let record = store
                .get(RecordClass::AccountRoot, "identity")
                .ok_or(CliError::NotInitialized)?;
            let summary = decode_identity_summary(&record)
                .ok_or(CliError::Storage(StorageError::CorruptStore))?;
            let Some(root_seed) = summary.root_seed else {
                return Err(CliError::Usage(
                    "device revoke requires the account root device".into(),
                ));
            };
            let root = AccountRootKey::from_seed(root_seed);
            registry
                .revoke(&root, &device_id, now_seconds())
                .map_err(registry_error)?;
            store.put(
                RecordClass::Device,
                "registry",
                &registry.encode().map_err(registry_error)?,
            )?;
            Ok(format!("device revoked: {device_id}"))
        }
        _ => Err(CliError::Usage(
            "use device list or device revoke --id DEVICE_ID".into(),
        )),
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct PendingLinkArtifact {
    schema_version: u16,
    request: String,
    private_seed: String,
    approval: Option<String>,
}

fn device_link_request(args: &[String], passphrase: &str) -> Result<String, CliError> {
    let output = option(args, "--output")?
        .ok_or_else(|| CliError::Usage("device link-request requires --output PATH".into()))?;
    let output = PathBuf::from(output);
    if output.exists() || output.with_extension("revision").exists() {
        return Err(CliError::Usage(
            "device link-request refuses to overwrite an existing artifact".into(),
        ));
    }
    let device_id = option(args, "--id")?
        .ok_or_else(|| CliError::Usage("device link-request requires --id DEVICE_ID".into()))?;
    let (pending, code) =
        PendingDeviceKey::create(device_id, [0; 32], now_seconds()).map_err(|_| CliError::Io)?;
    let request = pending
        .request()
        .encode()
        .map_err(|_| CliError::InvalidRecovery)?;
    let seed = pending.seed_bytes();
    let artifact = PendingLinkArtifact {
        schema_version: 1,
        request: request.clone(),
        private_seed: hex_bytes(&*seed),
        approval: None,
    };
    let mut store = EncryptedStore::initialize(&output, passphrase)?;
    store.put(
        RecordClass::Device,
        "pending-link",
        &serde_json::to_vec(&artifact).map_err(|_| StorageError::CorruptStore)?,
    )?;
    Ok(format!(
        "device link request created\nrequest: {request}\ncode: {code}\nprivate key: encrypted in the pending artifact\nnext: paste the request and code into an approved existing device"
    ))
}

fn device_link_complete(args: &[String], passphrase: &str) -> Result<String, CliError> {
    let input = option(args, "--input")?
        .ok_or_else(|| CliError::Usage("device link-complete requires --input PATH".into()))?;
    let data_dir = data_dir(args)?;
    let approval = option(args, "--approval")?
        .ok_or_else(|| CliError::Usage("device link-complete requires --approval VALUE".into()))?;
    if store_path(&data_dir).exists() {
        return Err(CliError::Usage(
            "device link-complete refuses to overwrite an existing profile".into(),
        ));
    }
    let store = EncryptedStore::open(Path::new(&input), passphrase)?;
    let bytes = store
        .get(RecordClass::Device, "pending-link")
        .ok_or(CliError::InvalidRecovery)?;
    let artifact: PendingLinkArtifact =
        serde_json::from_slice(&bytes).map_err(|_| CliError::InvalidRecovery)?;
    if artifact.schema_version != 1 || artifact.approval.is_some() {
        return Err(CliError::InvalidRecovery);
    }
    let request =
        DeviceLinkRequest::parse(&artifact.request).map_err(|_| CliError::InvalidRecovery)?;
    let parsed_approval =
        DeviceLinkApproval::parse(&approval).map_err(|_| CliError::InvalidRecovery)?;
    parsed_approval
        .verify_for(&request, now_seconds())
        .map_err(|_| CliError::InvalidRecovery)?;
    let device_seed =
        parse_hex_key(&artifact.private_seed).map_err(|_| CliError::InvalidRecovery)?;
    let device_key = ed25519_dalek::SigningKey::from_bytes(&device_seed);
    if device_key.verifying_key().to_bytes() != request.device_public_key() {
        return Err(CliError::InvalidRecovery);
    }
    fs::create_dir_all(&data_dir)?;
    set_private_dir(&data_dir)?;
    let mut activated = EncryptedStore::initialize(store_path(&data_dir), passphrase)?;
    let display_name = option(args, "--display-name")?
        .unwrap_or_else(|| format!("linked-{}", request.device_id()));
    let mut registry =
        DeviceRegistry::new_for_public_key(parsed_approval.certificate().account_public_key());
    registry
        .register(parsed_approval.certificate().clone(), now_seconds())
        .map_err(registry_error)?;
    activated.apply_batch(&[
        RecordMutation::Put(
            RecordClass::AccountRoot,
            "identity".into(),
            encode_linked_identity(
                parsed_approval.certificate().account_public_key(),
                device_seed,
                request.device_id(),
                &display_name,
            ),
        ),
        RecordMutation::Put(
            RecordClass::Device,
            "registry".into(),
            registry.encode().map_err(registry_error)?,
        ),
    ])?;
    Ok(format!(
        "device link approval verified\nprofile activated: {}\ndevice_id: {}\naccount_id: {}\nroot private key: not present\nnext: run serve with --data-dir {}",
        data_dir.display(),
        request.device_id(),
        parsed_approval.certificate().account_id().as_str(),
        data_dir.display()
    ))
}

fn now_seconds() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn resolve_relay_tls_pin(
    store: &mut EncryptedStore,
    relay_origin: &str,
    supplied: Option<TlsCertificatePin>,
    retrust: bool,
) -> Result<Option<TlsCertificatePin>, CliError> {
    if retrust && supplied.is_none() {
        return Err(CliError::Usage(
            "--relay-tls-retrust requires --relay-tls-pin".into(),
        ));
    }
    if supplied.is_some() && !relay_origin.starts_with("https://") {
        return Err(CliError::Usage(
            "--relay-tls-pin requires an HTTPS relay origin".into(),
        ));
    }
    if relay_origin.is_empty() {
        return Ok(supplied);
    }
    let stored = store
        .get(
            RecordClass::Account,
            &relay_tls_pin_record_key(relay_origin),
        )
        .and_then(|value| {
            std::str::from_utf8(&value)
                .ok()
                .and_then(|value| TlsCertificatePin::parse(value).ok())
        });
    if let (Some(previous), Some(current)) = (stored.as_ref(), supplied.as_ref()) {
        if previous != current && !retrust {
            return Err(CliError::Usage(
                "relay TLS pin changed; pass --relay-tls-retrust with the new pin".into(),
            ));
        }
    }
    let selected = supplied.or(stored);
    if let Some(pin) = selected {
        if supplied.is_some() && (retrust || stored.is_none() || stored != Some(pin)) {
            store.put(
                RecordClass::Account,
                &relay_tls_pin_record_key(relay_origin),
                pin.as_text().as_bytes(),
            )?;
        }
        return Ok(Some(pin));
    }
    Ok(None)
}

fn data_dir(args: &[String]) -> Result<PathBuf, CliError> {
    Ok(option(args, "--data-dir")?
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(".another-dimension-daemon")))
}
fn option(args: &[String], name: &str) -> Result<Option<String>, CliError> {
    let Some(index) = args.iter().position(|arg| arg == name) else {
        return Ok(None);
    };
    args.get(index + 1)
        .cloned()
        .ok_or_else(|| CliError::Usage(format!("{name} requires a value")))
        .map(Some)
}
fn store_path(data_dir: &Path) -> PathBuf {
    data_dir.join(STORE_FILE)
}
fn revision_path(data_dir: &Path) -> PathBuf {
    data_dir.join(REVISION_FILE)
}
fn append_blob(output: &mut Vec<u8>, value: &[u8]) {
    output.extend_from_slice(&(value.len() as u64).to_be_bytes());
    output.extend_from_slice(value);
}

fn parse_hex_key(value: &str) -> Result<[u8; 32], ()> {
    if value.len() != 64 {
        return Err(());
    }
    let mut result = [0_u8; 32];
    for (index, pair) in value.as_bytes().chunks_exact(2).enumerate() {
        let high = char::from(pair[0]).to_digit(16).ok_or(())?;
        let low = char::from(pair[1]).to_digit(16).ok_or(())?;
        result[index] = ((high << 4) | low) as u8;
    }
    Ok(result)
}
fn hex_bytes(value: &[u8]) -> String {
    value.iter().map(|byte| format!("{byte:02x}")).collect()
}
fn read_blob(bytes: &[u8], offset: usize) -> Option<(&[u8], usize)> {
    let end_length = offset.checked_add(8)?;
    if end_length > bytes.len() {
        return None;
    }
    let length = u64::from_be_bytes(bytes[offset..end_length].try_into().ok()?) as usize;
    let end = end_length.checked_add(length)?;
    if end > bytes.len() {
        return None;
    }
    Some((&bytes[end_length..end], end))
}
fn set_private_dir(path: &Path) -> Result<(), CliError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}
fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), CliError> {
    let temporary = path.with_extension(format!("tmp-{}", std::process::id()));
    fs::write(&temporary, bytes)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temporary, fs::Permissions::from_mode(0o600))?;
    }
    fs::rename(temporary, path)?;
    Ok(())
}
fn help_text() -> String {
    "Another Dimension daemon\n\nUsage:\n  init --display-name NAME [--data-dir PATH]\n  identity show [--data-dir PATH]\n  status [--data-dir PATH]\n  stop [--data-dir PATH]\n  serve --data-dir PATH --relay-origin ORIGIN --inbox-url URL [--relay-tls-pin sha256:HEX] [--relay-tls-retrust] [--notify] [--open]\n  device list [--data-dir PATH]\n  device revoke --id DEVICE_ID [--data-dir PATH]\n  device link-request --id DEVICE_ID --output PATH\n  device link-complete --input PATH --approval VALUE\n  doctor [--data-dir PATH] [--relay-tls-pin sha256:HEX]\n  lock\n  recovery export --output PATH [--data-dir PATH]\n  recovery inspect --input PATH [--data-dir PATH]\n  recovery rotate --data-dir PATH  # stdin: old passphrase\\nnew passphrase\n  recovery import --input PATH [--data-dir PATH]\n  wipe --data-dir PATH              # irreversible local store deletion\n\n--notify is opt-in and emits only a generic macOS notification without sender or message text.\n--open is opt-in; if macOS cannot open a browser, copy the one-time URL printed above.\nPassphrases are read from stdin and are never accepted as arguments.".into()
}

#[cfg(test)]
mod tests {
    use super::{run, CliError};
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };
    fn temp_dir() -> PathBuf {
        std::env::temp_dir().join(format!(
            "another-dimension-cli-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }
    fn arg(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).into()).collect()
    }
    #[test]
    fn init_identity_doctor_and_recovery_flow_is_local_and_encrypted() {
        let source = temp_dir();
        let backup = source.with_extension("adbackup");
        let restored = temp_dir();
        let init = run(
            &arg(&[
                "init",
                "--data-dir",
                source.to_str().unwrap(),
                "--display-name",
                "Reporter",
            ]),
            Some("correct horse battery staple"),
        )
        .unwrap();
        assert!(init.contains("profile initialized"));
        let identity = run(
            &arg(&["identity", "show", "--data-dir", source.to_str().unwrap()]),
            Some("correct horse battery staple"),
        )
        .unwrap();
        assert!(identity.contains("account_id: ad1pk"));
        assert!(identity.contains("display_name: Reporter"));
        let devices = run(
            &arg(&["device", "list", "--data-dir", source.to_str().unwrap()]),
            Some("correct horse battery staple"),
        )
        .unwrap();
        assert!(devices.contains("device_id: device-1"));
        assert!(devices.contains("state: Active"));
        let revoked = run(
            &arg(&[
                "device",
                "revoke",
                "--id",
                "device-1",
                "--data-dir",
                source.to_str().unwrap(),
            ]),
            Some("correct horse battery staple"),
        )
        .unwrap();
        assert!(revoked.contains("device revoked: device-1"));
        let devices = run(
            &arg(&["device", "list", "--data-dir", source.to_str().unwrap()]),
            Some("correct horse battery staple"),
        )
        .unwrap();
        assert!(devices.contains("state: Revoked"));
        assert!(run(
            &arg(&["identity", "show", "--data-dir", source.to_str().unwrap()]),
            Some("wrong horse battery staple")
        )
        .is_err());
        assert!(run(
            &arg(&["doctor", "--data-dir", source.to_str().unwrap()]),
            None
        )
        .unwrap()
        .contains("release readiness blocked"));
        run(
            &arg(&[
                "recovery",
                "export",
                "--data-dir",
                source.to_str().unwrap(),
                "--output",
                backup.to_str().unwrap(),
            ]),
            None,
        )
        .unwrap();
        let inspected = run(
            &arg(&["recovery", "inspect", "--input", backup.to_str().unwrap()]),
            None,
        )
        .unwrap();
        assert!(inspected.contains("backup schema: 2"));
        run(
            &arg(&[
                "recovery",
                "import",
                "--data-dir",
                restored.to_str().unwrap(),
                "--input",
                backup.to_str().unwrap(),
            ]),
            None,
        )
        .unwrap();
        let restored_identity = run(
            &arg(&["identity", "show", "--data-dir", restored.to_str().unwrap()]),
            Some("correct horse battery staple"),
        )
        .unwrap();
        assert_eq!(identity, restored_identity);
        run(
            &arg(&["recovery", "rotate", "--data-dir", source.to_str().unwrap()]),
            Some("correct horse battery staple\nnew correct horse battery staple"),
        )
        .unwrap();
        assert!(run(
            &arg(&["identity", "show", "--data-dir", source.to_str().unwrap()]),
            Some("correct horse battery staple"),
        )
        .is_err());
        assert!(run(
            &arg(&["identity", "show", "--data-dir", source.to_str().unwrap()]),
            Some("new correct horse battery staple"),
        )
        .is_ok());
        fs::remove_dir_all(source).unwrap();
        fs::remove_file(backup).unwrap();
        fs::remove_dir_all(restored).unwrap();
    }
    #[test]
    fn secrets_are_rejected_from_arguments() {
        assert!(matches!(
            run(
                &arg(&["init", "--passphrase=secret"]),
                Some("correct horse battery staple")
            ),
            Err(CliError::UnsafeSecretArgument)
        ));
    }

    #[test]
    fn linked_identity_record_has_no_root_seed() {
        let account = [71; 32];
        let bytes = super::encode_linked_identity(account, [72; 32], "phone", "Linked phone");
        let summary = super::decode_identity_summary(&bytes).unwrap();
        assert_eq!(summary.root_seed, None);
        assert_eq!(summary.device_seed, [72; 32]);
        assert_eq!(summary.account_public_key, account);
        assert_eq!(summary.device_id, "phone");
    }

    #[test]
    fn stale_lock_is_recovered_but_foreign_live_pid_is_not_killed() {
        let data_dir = temp_dir();
        fs::create_dir_all(&data_dir).unwrap();
        let lock_path = data_dir.join("daemon.lock");
        let mut exited = std::process::Command::new("sh")
            .args(["-c", "exit 0"])
            .spawn()
            .unwrap();
        let stale_pid = exited.id();
        exited.wait().unwrap();
        fs::write(&lock_path, format!("pid={stale_pid}\n")).unwrap();
        assert!(run(
            &arg(&["status", "--data-dir", data_dir.to_str().unwrap()]),
            None
        )
        .unwrap()
        .contains("daemon status: stale lock"));
        let lock = super::InstanceLock::acquire(&data_dir).unwrap();
        drop(lock);

        let current_pid = std::process::id();
        fs::write(&lock_path, format!("pid={current_pid}\n")).unwrap();
        assert!(matches!(
            super::InstanceLock::acquire(&data_dir),
            Err(CliError::Usage(message)) if message.contains("another process")
        ));
        fs::remove_dir_all(data_dir).unwrap();
    }
}
