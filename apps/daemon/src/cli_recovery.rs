use super::{
    append_blob, atomic_write, data_dir, generate_passphrase, hex_bytes, now_seconds, open_store,
    option, profile_id_path, profile_keychain_path, read_blob, revision_path,
    save_profile_passphrase, set_private_dir, store_path, CliError,
};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
};

const RECOVERY_MAGIC: &[u8; 13] = b"ADRECOVERY2\0\0";

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

pub(crate) fn command(args: &[String], passphrase: Option<&str>) -> Result<String, CliError> {
    match args.get(1).map(String::as_str) {
        Some("export") => {
            let data_dir = data_dir(args)?;
            let output = option(args, "--output")?
                .ok_or_else(|| CliError::Usage("recovery export requires --output".into()))?;
            export(&data_dir, Path::new(&output))
        }
        Some("import") => {
            let data_dir = data_dir(args)?;
            let input = option(args, "--input")?
                .ok_or_else(|| CliError::Usage("recovery import requires --input".into()))?;
            import(&data_dir, Path::new(&input))
        }
        Some("inspect") => {
            let input = option(args, "--input")?
                .ok_or_else(|| CliError::Usage("recovery inspect requires --input".into()))?;
            inspect(Path::new(&input))
        }
        Some("rotate") => {
            let data_dir = data_dir(args)?;
            let output = option(args, "--passphrase-output")?.map(PathBuf::from);
            let credentials = passphrase.ok_or_else(|| {
                CliError::Usage("recovery rotate requires the old passphrase on stdin".into())
            })?;
            rotate(&data_dir, credentials, output.as_deref())
        }
        _ => Err(CliError::Usage(
            "use recovery export --output PATH, recovery inspect --input PATH, recovery rotate, or recovery import --input PATH".into(),
        )),
    }
}

fn export(data_dir: &Path, output: &Path) -> Result<String, CliError> {
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

fn import(data_dir: &Path, input: &Path) -> Result<String, CliError> {
    let active_store = store_path(data_dir);
    let active_revision = revision_path(data_dir);
    if fs::symlink_metadata(&active_store).is_ok() || fs::symlink_metadata(&active_revision).is_ok()
    {
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
    let temporary_store = data_dir.join(format!("store.adstore.import-{}", std::process::id()));
    let temporary_revision = data_dir.join(format!(
        "store.adstore.revision.import-{}",
        std::process::id()
    ));
    let _ = fs::remove_file(&temporary_store);
    let _ = fs::remove_file(&temporary_revision);
    if let Err(error) = atomic_write(&temporary_store, store) {
        let _ = fs::remove_file(&temporary_store);
        return Err(error);
    }
    if let Err(error) = atomic_write(&temporary_revision, revision) {
        let _ = fs::remove_file(&temporary_store);
        let _ = fs::remove_file(&temporary_revision);
        return Err(error);
    }
    if let Err(error) = fs::rename(&temporary_store, &active_store) {
        let _ = fs::remove_file(&temporary_store);
        let _ = fs::remove_file(&temporary_revision);
        return Err(error.into());
    }
    if let Err(error) = fs::rename(&temporary_revision, &active_revision) {
        let _ = fs::remove_file(&active_store);
        let _ = fs::remove_file(&temporary_revision);
        return Err(error.into());
    }
    Ok(format!(
        "encrypted recovery imported to {}\nunlock with the original passphrase",
        data_dir.display()
    ))
}

fn inspect(input: &Path) -> Result<String, CliError> {
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

fn rotate(
    data_dir: &Path,
    credentials: &str,
    passphrase_output: Option<&Path>,
) -> Result<String, CliError> {
    let old_passphrase = credentials.trim();
    if old_passphrase.is_empty() || credentials.lines().count() != 1 {
        return Err(CliError::Usage(
            "recovery rotate stdin must contain exactly one old passphrase; the replacement is generated".into(),
        ));
    }
    if passphrase_output.is_some_and(|path| path.exists()) {
        return Err(CliError::Usage(
            "--passphrase-output already exists; refusing overwrite".into(),
        ));
    }
    let store = open_store(data_dir, old_passphrase)?;
    let new_passphrase = generate_passphrase()?;
    if let Some(path) = passphrase_output {
        atomic_write(path, format!("{new_passphrase}\n").as_bytes())?;
    }
    let temporary = data_dir.join(format!("store.adstore.rotate-{}", std::process::id()));
    let temporary_revision = PathBuf::from(format!("{}.revision", temporary.display()));
    let _ = fs::remove_file(&temporary);
    let _ = fs::remove_file(&temporary_revision);
    if let Err(error) = store.rekey_to(&temporary, &new_passphrase) {
        if let Some(path) = passphrase_output {
            let _ = fs::remove_file(path);
        }
        return Err(error.into());
    }
    let active = store_path(data_dir);
    let active_revision = revision_path(data_dir);
    let old_store = data_dir.join(format!("store.adstore.old-{}", std::process::id()));
    let old_revision = data_dir.join(format!("store.adstore.revision.old-{}", std::process::id()));
    if let Err(error) = fs::rename(&active, &old_store) {
        let _ = fs::remove_file(&temporary);
        let _ = fs::remove_file(&temporary_revision);
        if let Some(path) = passphrase_output {
            let _ = fs::remove_file(path);
        }
        return Err(error.into());
    }
    if let Err(error) = fs::rename(&active_revision, &old_revision) {
        let _ = fs::rename(&old_store, &active);
        let _ = fs::remove_file(&temporary);
        let _ = fs::remove_file(&temporary_revision);
        if let Some(path) = passphrase_output {
            let _ = fs::remove_file(path);
        }
        return Err(error.into());
    }
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
        if let Some(path) = passphrase_output {
            let _ = fs::remove_file(path);
        }
        return Err(error.into());
    }
    let _ = fs::remove_file(old_store);
    let _ = fs::remove_file(old_revision);
    let keychain_notice = if let Ok(profile_id) = fs::read_to_string(profile_id_path(data_dir)) {
        if save_profile_passphrase(profile_id.trim(), &new_passphrase).is_ok() {
            let _ = atomic_write(&profile_keychain_path(data_dir), b"v1\n");
            "keychain updated"
        } else {
            "keychain not updated"
        }
    } else {
        "keychain not updated"
    };
    let passphrase_notice = passphrase_output
        .map(|path| format!("passphrase file: {}", path.display()))
        .unwrap_or_else(|| format!("passphrase: {new_passphrase}"));
    Ok(format!(
        "database key rewrapped; existing records were preserved\n{passphrase_notice}\n{keychain_notice}"
    ))
}
