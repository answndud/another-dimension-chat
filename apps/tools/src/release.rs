use base64ct::{Base64, Encoding};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

const FORMAT: &str = "another-dimension-release-manifest";
const TRUST_FORMAT: &str = "another-dimension-release-trust";

fn error(message: impl Into<String>) -> Result<(), String> {
    Err(message.into())
}

fn option(args: &[String], name: &str) -> Result<PathBuf, String> {
    args.windows(2)
        .find(|pair| pair[0] == name)
        .map(|pair| PathBuf::from(&pair[1]))
        .filter(|value| !value.as_os_str().is_empty())
        .ok_or_else(|| format!("{name} requires a value"))
}

fn text_option(args: &[String], name: &str) -> Result<String, String> {
    args.windows(2)
        .find(|pair| pair[0] == name)
        .map(|pair| pair[1].clone())
        .filter(|value| !value.starts_with('-') && !value.is_empty())
        .ok_or_else(|| format!("{name} requires a value"))
}

fn version(value: &str) -> Result<String, String> {
    let parts: Vec<_> = value.split('.').collect();
    if parts.len() != 3
        || parts
            .iter()
            .any(|part| part.is_empty() || !part.chars().all(|c| c.is_ascii_digit()))
    {
        return Err(format!(
            "invalid version: {value}; expected MAJOR.MINOR.PATCH"
        ));
    }
    Ok(value.to_owned())
}

fn encode(bytes: &[u8]) -> Result<String, String> {
    let mut output = vec![0u8; Base64::encoded_len(bytes)];
    Base64::encode(bytes, &mut output)
        .map(str::to_owned)
        .map_err(|_| "base64 encoding failed".into())
}

fn decode(value: &str) -> Result<Vec<u8>, String> {
    let mut output = vec![0u8; value.len()];
    Base64::decode(value, &mut output)
        .map(|bytes| bytes.to_vec())
        .map_err(|_| "invalid base64".into())
}

fn pem_der(value: &str) -> Result<Vec<u8>, String> {
    let encoded = value
        .lines()
        .filter(|line| !line.starts_with("-----"))
        .collect::<String>();
    decode(&encoded)
}

fn public_key_from_pem(value: &str) -> Result<VerifyingKey, String> {
    const PREFIX: &[u8] = b"\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00";
    let der = pem_der(value)?;
    if der.len() != PREFIX.len() + 32 || !der.starts_with(PREFIX) {
        return Err("invalid Ed25519 public key PEM".into());
    }
    let bytes: [u8; 32] = der[PREFIX.len()..]
        .try_into()
        .map_err(|_| "invalid Ed25519 public key bytes".to_owned())?;
    VerifyingKey::from_bytes(&bytes).map_err(|_| "invalid Ed25519 public key".into())
}

fn signing_key(path: &Path) -> Result<SigningKey, String> {
    let pem = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let der = pem_der(&pem)?;
    const PREFIX: &[u8] = b"\x30\x2e\x02\x01\x00\x30\x05\x06\x03\x2b\x65\x70\x04\x22\x04\x20";
    if der.len() != PREFIX.len() + 32 || !der.starts_with(PREFIX) {
        return Err("invalid Ed25519 private key PEM".into());
    }
    let seed: [u8; 32] = der[PREFIX.len()..]
        .try_into()
        .map_err(|_| "invalid Ed25519 private key bytes".to_owned())?;
    Ok(SigningKey::from_bytes(&seed))
}

fn key_id(key: &VerifyingKey) -> String {
    let mut der = b"\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00".to_vec();
    der.extend_from_slice(key.as_bytes());
    Sha256::digest(der)[..16]
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn files(root: &Path, current: &Path, output: &mut Vec<String>) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path).map_err(|error| error.to_string())?;
        if metadata.file_type().is_symlink() {
            return error("release symlinks are not allowed");
        }
        if metadata.is_dir() {
            files(root, &path, output)?;
        } else if metadata.is_file() {
            let relative = path
                .strip_prefix(root)
                .map_err(|_| "release path escaped root")?
                .to_string_lossy()
                .replace('\\', "/");
            if relative != "release-manifest.json" {
                output.push(relative);
            }
        } else {
            return error("unsupported release entry");
        }
    }
    Ok(())
}

fn unsigned(manifest: &Value) -> Result<Vec<u8>, String> {
    let mut value = manifest.clone();
    value
        .as_object_mut()
        .ok_or_else(|| "manifest must be an object".to_owned())?
        .insert("signature".into(), Value::Null);
    serde_json::to_vec(&value).map_err(|error| error.to_string())
}

fn trust_unsigned(manifest: &Value) -> Result<Vec<u8>, String> {
    unsigned(manifest)
}

fn verify_signed_document(value: &Value, key: &VerifyingKey) -> Result<(), String> {
    let signature = value
        .get("signature")
        .ok_or_else(|| "signature is missing".to_owned())?;
    if signature.get("algorithm").and_then(Value::as_str) != Some("Ed25519")
        || signature.get("keyId").and_then(Value::as_str) != Some(key_id(key).as_str())
    {
        return error("signature key identity mismatch");
    }
    let bytes = decode(
        signature
            .get("value")
            .and_then(Value::as_str)
            .ok_or_else(|| "signature value is missing".to_owned())?,
    )?;
    let signature =
        Signature::from_slice(&bytes).map_err(|_| "invalid signature length".to_owned())?;
    key.verify(&trust_unsigned(value)?, &signature)
        .map_err(|_| "signature verification failed".to_owned())
}

fn write_json_once(output: &Path, value: &Value) -> Result<(), String> {
    if output.exists() {
        return error(format!(
            "refusing to overwrite existing trust manifest: {}",
            output.display()
        ));
    }
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(
        output,
        format!(
            "{}\n",
            serde_json::to_string_pretty(value).map_err(|error| error.to_string())?
        ),
    )
    .map_err(|error| error.to_string())
}

fn create(root: &Path, version: &str, private_key: &Path) -> Result<(), String> {
    let signing = signing_key(private_key)?;
    let mut paths = Vec::new();
    files(root, root, &mut paths)?;
    paths.sort();
    let mut entries = Vec::new();
    for relative in paths {
        let path = Path::new(&relative);
        if path.is_absolute()
            || relative.contains('\\')
            || path
                .components()
                .any(|component| matches!(component, std::path::Component::ParentDir))
        {
            return error(format!("unsafe release path: {relative}"));
        }
        let bytes = fs::read(root.join(path)).map_err(|error| error.to_string())?;
        entries.push(json!({
            "path": relative,
            "sha256": hex(&Sha256::digest(&bytes)),
            "bytes": bytes.len(),
        }));
    }
    let mut manifest = Map::new();
    manifest.insert("format".into(), json!(FORMAT));
    manifest.insert("manifestVersion".into(), json!(1));
    manifest.insert("releaseVersion".into(), json!(version));
    manifest.insert("files".into(), Value::Array(entries));
    manifest.insert("signature".into(), Value::Null);
    let mut value = Value::Object(manifest);
    let signature = signing.sign(&unsigned(&value)?);
    value.as_object_mut().expect("manifest object").insert(
        "signature".into(),
        json!({
            "algorithm": "Ed25519",
            "keyId": key_id(&signing.verifying_key()),
            "value": encode(&signature.to_bytes())?,
        }),
    );
    fs::write(
        root.join("release-manifest.json"),
        format!(
            "{}\n",
            serde_json::to_string_pretty(&value).map_err(|error| error.to_string())?
        ),
    )
    .map_err(|error| error.to_string())
}

fn trust_create(args: &[String]) -> Result<(), String> {
    let output = option(args, "--output")?;
    let bootstrap = signing_key(&option(args, "--bootstrap-private-key")?)?;
    let release_pem_path = option(args, "--release-public-key")?;
    let release_pem = fs::read_to_string(&release_pem_path).map_err(|error| error.to_string())?;
    let release = public_key_from_pem(&release_pem)?;
    let minimum = version(&text_option(args, "--minimum-release-version")?)?;
    let valid_from = version(
        &args
            .windows(2)
            .find(|pair| pair[0] == "--valid-from-version")
            .map(|pair| pair[1].clone())
            .unwrap_or_else(|| minimum.clone()),
    )?;
    let valid_until = args
        .windows(2)
        .find(|pair| pair[0] == "--valid-until-version")
        .map(|pair| pair[1].clone())
        .map(|value| version(&value))
        .transpose()?;
    let release_id = key_id(&release);
    let mut manifest = Map::new();
    manifest.insert("format".into(), json!(TRUST_FORMAT));
    manifest.insert("trustVersion".into(), json!(1));
    manifest.insert("policy".into(), json!({ "minimumReleaseVersion": minimum }));
    manifest.insert(
        "keys".into(),
        json!([{
            "keyId": release_id,
            "publicKey": release_pem,
            "validFromVersion": valid_from,
            "validUntilVersion": valid_until,
        }]),
    );
    manifest.insert("revokedKeyIds".into(), json!([]));
    manifest.insert("signature".into(), Value::Null);
    let mut value = Value::Object(manifest);
    let signature = bootstrap.sign(&trust_unsigned(&value)?);
    value
        .as_object_mut()
        .expect("trust manifest object")
        .insert(
            "signature".into(),
            json!({
                "algorithm": "Ed25519",
                "keyId": key_id(&bootstrap.verifying_key()),
                "value": encode(&signature.to_bytes())?,
            }),
        );
    write_json_once(&output, &value)
}

fn trust_revoke(args: &[String]) -> Result<(), String> {
    let input = option(args, "--input")?;
    let output = option(args, "--output")?;
    let key_to_revoke = text_option(args, "--key-id")?;
    if key_to_revoke.len() != 32 || !key_to_revoke.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return error("--key-id must be a 32-character hexadecimal key id");
    }
    let bootstrap = signing_key(&option(args, "--bootstrap-private-key")?)?;
    let mut manifest: Value =
        serde_json::from_slice(&fs::read(&input).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    if manifest.get("format").and_then(Value::as_str) != Some(TRUST_FORMAT)
        || manifest.get("trustVersion").and_then(Value::as_u64) != Some(1)
    {
        return error("unsupported trust manifest");
    }
    verify_signed_document(&manifest, &bootstrap.verifying_key())?;
    let known_key = manifest
        .get("keys")
        .and_then(Value::as_array)
        .is_some_and(|keys| {
            keys.iter().any(|entry| {
                entry.get("keyId").and_then(Value::as_str) == Some(key_to_revoke.as_str())
            })
        });
    if !known_key {
        return error("cannot revoke an unknown release key");
    }
    let revoked = manifest
        .get_mut("revokedKeyIds")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| "trust manifest revokedKeyIds is missing".to_owned())?;
    if revoked
        .iter()
        .any(|entry| entry.as_str() == Some(key_to_revoke.as_str()))
    {
        return error("release key is already revoked");
    }
    revoked.push(Value::String(key_to_revoke));
    manifest
        .as_object_mut()
        .ok_or_else(|| "trust manifest must be an object".to_owned())?
        .insert("signature".into(), Value::Null);
    let signature = bootstrap.sign(&trust_unsigned(&manifest)?);
    manifest
        .as_object_mut()
        .expect("trust manifest object")
        .insert(
            "signature".into(),
            json!({
                "algorithm": "Ed25519",
                "keyId": key_id(&bootstrap.verifying_key()),
                "value": encode(&signature.to_bytes())?,
            }),
        );
    write_json_once(&output, &manifest)
}

fn trust_add_key(args: &[String]) -> Result<(), String> {
    let input = option(args, "--input")?;
    let output = option(args, "--output")?;
    let bootstrap = signing_key(&option(args, "--bootstrap-private-key")?)?;
    let release_pem = fs::read_to_string(option(args, "--release-public-key")?)
        .map_err(|error| error.to_string())?;
    let release = public_key_from_pem(&release_pem)?;
    let valid_from = version(&text_option(args, "--valid-from-version")?)?;
    let valid_until = args
        .windows(2)
        .find(|pair| pair[0] == "--valid-until-version")
        .map(|pair| pair[1].clone())
        .map(|value| version(&value))
        .transpose()?;
    let mut manifest: Value =
        serde_json::from_slice(&fs::read(&input).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    if manifest.get("format").and_then(Value::as_str) != Some(TRUST_FORMAT)
        || manifest.get("trustVersion").and_then(Value::as_u64) != Some(1)
    {
        return error("unsupported trust manifest");
    }
    verify_signed_document(&manifest, &bootstrap.verifying_key())?;
    let release_id = key_id(&release);
    let keys = manifest
        .get_mut("keys")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| "trust manifest keys is missing".to_owned())?;
    if keys
        .iter()
        .any(|entry| entry.get("keyId").and_then(Value::as_str) == Some(release_id.as_str()))
    {
        return error("release key is already present");
    }
    keys.push(json!({
        "keyId": release_id,
        "publicKey": release_pem,
        "validFromVersion": valid_from,
        "validUntilVersion": valid_until,
    }));
    manifest
        .as_object_mut()
        .ok_or_else(|| "trust manifest must be an object".to_owned())?
        .insert("signature".into(), Value::Null);
    let signature = bootstrap.sign(&trust_unsigned(&manifest)?);
    manifest
        .as_object_mut()
        .expect("trust manifest object")
        .insert(
            "signature".into(),
            json!({
                "algorithm": "Ed25519",
                "keyId": key_id(&bootstrap.verifying_key()),
                "value": encode(&signature.to_bytes())?,
            }),
        );
    write_json_once(&output, &manifest)
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn verify(root: &Path, public_key: &Path) -> Result<(), String> {
    let key =
        public_key_from_pem(&fs::read_to_string(public_key).map_err(|error| error.to_string())?)?;
    let manifest: Value = serde_json::from_slice(
        &fs::read(root.join("release-manifest.json")).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    if manifest.get("format").and_then(Value::as_str) != Some(FORMAT)
        || manifest.get("manifestVersion").and_then(Value::as_u64) != Some(1)
    {
        return error("unsupported release manifest");
    }
    let signature = manifest
        .pointer("/signature")
        .ok_or_else(|| "manifest signature is missing".to_owned())?;
    if signature.get("algorithm").and_then(Value::as_str) != Some("Ed25519")
        || signature.get("keyId").and_then(Value::as_str) != Some(key_id(&key).as_str())
    {
        return error("manifest signature identity mismatch");
    }
    let signature = Signature::from_slice(&decode(
        signature
            .get("value")
            .and_then(Value::as_str)
            .ok_or_else(|| "manifest signature value is missing".to_owned())?,
    )?)
    .map_err(|_| "invalid manifest signature length".to_owned())?;
    key.verify(&unsigned(&manifest)?, &signature)
        .map_err(|_| "manifest signature verification failed".to_owned())?;
    let entries = manifest
        .get("files")
        .and_then(Value::as_array)
        .ok_or_else(|| "manifest files are missing".to_owned())?;
    let mut listed = Vec::new();
    for entry in entries {
        let path = entry
            .get("path")
            .and_then(Value::as_str)
            .ok_or_else(|| "manifest file path is missing".to_owned())?;
        let relative = Path::new(path);
        if relative.is_absolute()
            || path.contains('\\')
            || relative
                .components()
                .any(|component| matches!(component, std::path::Component::ParentDir))
        {
            return error(format!("unsafe manifest path: {path}"));
        }
        let bytes = fs::read(root.join(relative)).map_err(|error| error.to_string())?;
        if entry.get("bytes").and_then(Value::as_u64) != Some(bytes.len() as u64)
            || entry.get("sha256").and_then(Value::as_str)
                != Some(hex(&Sha256::digest(&bytes)).as_str())
        {
            return error(format!("manifest hash mismatch: {path}"));
        }
        listed.push(path.to_owned());
    }
    let mut actual = Vec::new();
    files(root, root, &mut actual)?;
    actual.sort();
    listed.sort();
    if actual != listed {
        return error("release contains unlisted or missing files");
    }
    Ok(())
}

fn hygiene(root: &Path, current: &Path) -> Result<(), String> {
    const SECRET_BASENAMES: &[&str] = &[
        "daemon.lock",
        "profile.keychain",
        "profile.id",
        "relay.pid",
        "relay-receipt-signing-key.pem",
        "release-signing-key.pem",
        "release-trust.json",
        "bootstrap-private.pem",
    ];
    const SECRET_EXTENSIONS: &[&str] = &[".log", ".sqlite", ".adrecovery", ".passphrase", ".key"];
    const FORBIDDEN_SEGMENTS: &[&str] = &["target", ".build-cache", ".git", ".cargo", ".local"];
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path).map_err(|error| error.to_string())?;
        let relative = path
            .strip_prefix(root)
            .map_err(|_| "release path escaped root")?
            .to_string_lossy()
            .replace('\\', "/");
        if metadata.file_type().is_symlink() {
            return error(format!("unsupported release entry: {relative}"));
        }
        #[cfg(unix)]
        if metadata.permissions().mode() & 0o022 != 0 {
            return error(format!("over-broad permissions: {relative}"));
        }
        if metadata.is_dir() {
            if FORBIDDEN_SEGMENTS
                .iter()
                .any(|segment| path.file_name().is_some_and(|name| name == *segment))
            {
                return error(format!("forbidden directory in release: {relative}"));
            }
            hygiene(root, &path)?;
            continue;
        }
        if !metadata.is_file() {
            return error(format!("unsupported release entry: {relative}"));
        }
        let basename = path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| format!("invalid release filename: {relative}"))?;
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| format!(".{value}"));
        if SECRET_BASENAMES.contains(&basename)
            || extension
                .as_deref()
                .is_some_and(|value| SECRET_EXTENSIONS.contains(&value))
        {
            return error(format!("secret/data/log file in release: {relative}"));
        }
        let bytes = fs::read(&path).map_err(|error| error.to_string())?;
        // Binary executables can contain diagnostic/source strings that look like
        // PEM markers. Scan only release text formats; filename and extension
        // checks above still apply to every file.
        let text_file = matches!(
            extension.as_deref(),
            Some(
                ".json"
                    | ".md"
                    | ".sh"
                    | ".html"
                    | ".css"
                    | ".js"
                    | ".txt"
                    | ".toml"
                    | ".yaml"
                    | ".yml"
                    | ".webmanifest"
            )
        );
        if text_file {
            let text = String::from_utf8(bytes.clone())
                .map_err(|_| format!("release text file is not valid UTF-8: {relative}"))?;
            if text.contains("-----BEGIN ") && text.contains("PRIVATE KEY-----") {
                return error(format!("private key material in release: {relative}"));
            }
        }
    }
    Ok(())
}

pub fn command(args: &[String]) -> Result<(), String> {
    match args.first().map(String::as_str) {
        Some("create") => create(
            &option(args, "--root")?,
            args.windows(2)
                .find(|pair| pair[0] == "--version")
                .map(|pair| pair[1].as_str())
                .ok_or_else(|| "--version requires a value".to_owned())?,
            &option(args, "--private-key")?,
        ),
        Some("verify") => verify(&option(args, "--root")?, &option(args, "--public-key")?),
        Some("hygiene") => {
            let root = option(args, "--root")?;
            let metadata = fs::metadata(&root).map_err(|error| error.to_string())?;
            if !metadata.is_dir() {
                return error("release root is not a directory");
            }
            #[cfg(unix)]
            if metadata.permissions().mode() & 0o022 != 0 {
                return error("release root permissions are over-broad");
            }
            hygiene(&root, &root)
        }
        Some("release-trust") => match args.get(1).map(String::as_str) {
            Some("create") => trust_create(&args[2..]),
            Some("revoke") => trust_revoke(&args[2..]),
            Some("add-key") => trust_add_key(&args[2..]),
            _ => Err("usage: release-trust create|add-key|revoke ...".into()),
        },
        _ => Err(
            "usage: release-manifest create|verify | release-trust create|add-key|revoke".into(),
        ),
    }
}
