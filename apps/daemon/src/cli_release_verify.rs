use base64ct::{Base64, Encoding};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
};

const MANIFEST_FORMAT: &str = "another-dimension-release-manifest";
const TRUST_FORMAT: &str = "another-dimension-release-trust";

fn error(message: impl Into<String>) -> super::CliError {
    super::CliError::Usage(message.into())
}
fn hex_encode(input: impl AsRef<[u8]>) -> String {
    input
        .as_ref()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}
fn option(args: &[String], name: &str) -> Result<String, super::CliError> {
    args.iter()
        .position(|value| value == name)
        .and_then(|index| args.get(index + 1))
        .cloned()
        .filter(|value| !value.starts_with('-'))
        .ok_or_else(|| error(format!("{name} requires a value")))
}
fn key_id(key: &VerifyingKey) -> String {
    let mut der = b"\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00".to_vec();
    der.extend_from_slice(key.as_bytes());
    hex_encode(&Sha256::digest(der)[..16])
}
fn parse_key_text(pem: &str) -> Result<VerifyingKey, super::CliError> {
    let encoded = pem
        .lines()
        .filter(|line| !line.starts_with("-----"))
        .collect::<String>();
    let mut der = vec![0u8; encoded.len()];
    let der =
        Base64::decode(&encoded, &mut der).map_err(|_| error("invalid Ed25519 public key PEM"))?;
    const ED25519_SPKI_PREFIX: &[u8] = b"\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00";
    if der.len() != ED25519_SPKI_PREFIX.len() + 32 || !der.starts_with(ED25519_SPKI_PREFIX) {
        return Err(error("invalid Ed25519 public key DER"));
    }
    let bytes: [u8; 32] = der[ED25519_SPKI_PREFIX.len()..]
        .try_into()
        .map_err(|_| error("invalid Ed25519 public key bytes"))?;
    VerifyingKey::from_bytes(&bytes).map_err(|_| error("invalid Ed25519 public key"))
}
fn parse_key(path: &Path) -> Result<VerifyingKey, super::CliError> {
    parse_key_text(&fs::read_to_string(path)?)
}
fn unsigned(value: &Value) -> Result<Vec<u8>, super::CliError> {
    let mut value = value.clone();
    value
        .as_object_mut()
        .ok_or_else(|| error("signed document must be an object"))?
        .insert("signature".into(), Value::Null);
    serde_json::to_vec(&value).map_err(|_| error("signed document is not serializable"))
}
fn signature(value: &Value, key: &VerifyingKey) -> Result<(), super::CliError> {
    let object = value
        .as_object()
        .ok_or_else(|| error("signed document must be an object"))?;
    let signature = object
        .get("signature")
        .and_then(Value::as_object)
        .ok_or_else(|| error("signature is missing"))?;
    if signature.get("algorithm").and_then(Value::as_str) != Some("Ed25519")
        || signature.get("keyId").and_then(Value::as_str) != Some(key_id(key).as_str())
    {
        return Err(error("signature key identity mismatch"));
    }
    let encoded = signature
        .get("value")
        .and_then(Value::as_str)
        .ok_or_else(|| error("signature value is missing"))?;
    let mut bytes = vec![0u8; encoded.len()];
    let decoded =
        Base64::decode(encoded, &mut bytes).map_err(|_| error("signature is not valid base64"))?;
    let sig = Signature::from_slice(decoded).map_err(|_| error("signature length is invalid"))?;
    key.verify(&unsigned(value)?, &sig)
        .map_err(|_| error("signature verification failed"))
}
fn version(value: &str) -> Result<[u64; 3], super::CliError> {
    let parts: Vec<_> = value.split('.').collect();
    if parts.len() != 3 {
        return Err(error("versions must use MAJOR.MINOR.PATCH"));
    }
    Ok([
        parts[0].parse().map_err(|_| error("invalid version"))?,
        parts[1].parse().map_err(|_| error("invalid version"))?,
        parts[2].parse().map_err(|_| error("invalid version"))?,
    ])
}
fn compare(left: &str, right: &str) -> Result<std::cmp::Ordering, super::CliError> {
    Ok(version(left)?.cmp(&version(right)?))
}
fn files(root: &Path, current: &Path, output: &mut Vec<String>) -> Result<(), super::CliError> {
    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path)?;
        if metadata.file_type().is_symlink() {
            return Err(error("release symlinks are not allowed"));
        }
        if metadata.is_dir() {
            files(root, &path, output)?;
        } else if metadata.is_file() {
            let relative = path
                .strip_prefix(root)
                .map_err(|_| error("release path escaped root"))?
                .to_string_lossy()
                .replace('\\', "/");
            if relative != "release-manifest.json" {
                output.push(relative);
            }
        } else {
            return Err(error("unsupported release entry"));
        }
    }
    Ok(())
}
fn verify_manifest(
    root: &Path,
    manifest: &Value,
    release_key: &VerifyingKey,
) -> Result<String, super::CliError> {
    if manifest.get("format").and_then(Value::as_str) != Some(MANIFEST_FORMAT)
        || manifest.get("manifestVersion").and_then(Value::as_u64) != Some(1)
    {
        return Err(error("unsupported release manifest"));
    }
    let release_version = manifest
        .get("releaseVersion")
        .and_then(Value::as_str)
        .ok_or_else(|| error("release version is missing"))?;
    version(release_version)?;
    signature(manifest, release_key)?;
    let entries = manifest
        .get("files")
        .and_then(Value::as_array)
        .ok_or_else(|| error("release files are missing"))?;
    let mut listed = Vec::new();
    for entry in entries {
        let object = entry
            .as_object()
            .ok_or_else(|| error("invalid release file entry"))?;
        let relative = object
            .get("path")
            .and_then(Value::as_str)
            .ok_or_else(|| error("release file path is missing"))?;
        let path = Path::new(relative);
        if path.is_absolute()
            || relative.contains('\\')
            || path
                .components()
                .any(|component| matches!(component, std::path::Component::ParentDir))
        {
            return Err(error("unsafe release file path"));
        }
        let data = fs::read(root.join(path))?;
        let expected = object
            .get("sha256")
            .and_then(Value::as_str)
            .ok_or_else(|| error("release file hash is missing"))?;
        if hex_encode(Sha256::digest(&data)) != expected
            || object.get("bytes").and_then(Value::as_u64) != Some(data.len() as u64)
        {
            return Err(error(format!("release file hash mismatch: {relative}")));
        }
        listed.push(relative.to_owned());
    }
    let mut actual = Vec::new();
    files(root, root, &mut actual)?;
    actual.sort();
    listed.sort();
    if actual != listed {
        return Err(error("release contains unlisted or missing files"));
    }
    Ok(release_version.to_owned())
}
fn verify_trust(
    trust: &Value,
    bootstrap: &VerifyingKey,
    release_version: &str,
    release_key: &VerifyingKey,
) -> Result<(), super::CliError> {
    if trust.get("format").and_then(Value::as_str) != Some(TRUST_FORMAT)
        || trust.get("trustVersion").and_then(Value::as_u64) != Some(1)
    {
        return Err(error("unsupported trust manifest"));
    }
    signature(trust, bootstrap)?;
    let minimum = trust
        .pointer("/policy/minimumReleaseVersion")
        .and_then(Value::as_str)
        .ok_or_else(|| error("trust minimum version is missing"))?;
    if compare(release_version, minimum)? == std::cmp::Ordering::Less {
        return Err(error("release is below trust minimum version"));
    }
    let id = key_id(release_key);
    if trust
        .get("revokedKeyIds")
        .and_then(Value::as_array)
        .is_some_and(|ids| ids.iter().any(|item| item.as_str() == Some(id.as_str())))
    {
        return Err(error("release key is revoked"));
    }
    let keys = trust
        .get("keys")
        .and_then(Value::as_array)
        .ok_or_else(|| error("trust keys are missing"))?;
    let mut known_key_ids = std::collections::HashSet::new();
    for key in keys {
        let key_id_value = key
            .get("keyId")
            .and_then(Value::as_str)
            .ok_or_else(|| error("trust key id is missing"))?;
        if !known_key_ids.insert(key_id_value) {
            return Err(error("trust manifest contains duplicate key ids"));
        }
        let key_path = key
            .get("publicKey")
            .and_then(Value::as_str)
            .ok_or_else(|| error("trust public key is missing"))?;
        let trusted_key = parse_key_text(key_path)?;
        if key_id(&trusted_key) != key_id_value {
            return Err(error("trust key id does not match public key"));
        }
    }
    if trust
        .get("revokedKeyIds")
        .and_then(Value::as_array)
        .is_some_and(|ids| {
            ids.iter().any(|item| {
                item.as_str()
                    .map(|id| !known_key_ids.contains(id))
                    .unwrap_or(true)
            })
        })
    {
        return Err(error("trust manifest revokes an unknown key"));
    }
    let entry = keys
        .iter()
        .find(|item| item.get("keyId").and_then(Value::as_str) == Some(id.as_str()))
        .ok_or_else(|| error("release key is not trusted"))?;
    if compare(
        release_version,
        entry
            .get("validFromVersion")
            .and_then(Value::as_str)
            .ok_or_else(|| error("trust key validity is missing"))?,
    )? == std::cmp::Ordering::Less
    {
        return Err(error("release key is not valid for this version"));
    }
    if let Some(until) = entry.get("validUntilVersion").and_then(Value::as_str) {
        if compare(release_version, until)? == std::cmp::Ordering::Greater {
            return Err(error("release key validity has expired"));
        }
    }
    Ok(())
}
pub fn verify(args: &[String]) -> Result<String, super::CliError> {
    let root = PathBuf::from(option(args, "--root")?);
    let public_key = parse_key(Path::new(&option(args, "--public-key")?))?;
    let bootstrap = parse_key(Path::new(&option(args, "--trust-manifest-key")?))?;
    let manifest: Value = serde_json::from_slice(&fs::read(root.join("release-manifest.json"))?)
        .map_err(|_| error("release manifest JSON is invalid"))?;
    let trust_path = option(args, "--trust-manifest")?;
    let trust: Value = serde_json::from_slice(&fs::read(trust_path)?)
        .map_err(|_| error("trust manifest JSON is invalid"))?;
    let release_version = verify_manifest(&root, &manifest, &public_key)?;
    verify_trust(&trust, &bootstrap, &release_version, &public_key)?;
    let provenance: Value =
        serde_json::from_slice(&fs::read(root.join("RELEASE-PROVENANCE.json"))?)
            .map_err(|_| error("client provenance is invalid"))?;
    if !provenance
        .get("sourceCommit")
        .and_then(Value::as_str)
        .is_some_and(|value| {
            (40..=64).contains(&value.len()) && value.bytes().all(|byte| byte.is_ascii_hexdigit())
        })
    {
        return Err(error("client provenance sourceCommit is invalid"));
    }
    Ok(format!(
        "client release gate passed: signed {release_version}, trust key {}",
        key_id(&public_key)
    ))
}
