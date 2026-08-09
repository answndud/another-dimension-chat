use super::{
    atomic_write, data_dir, decode_identity_summary, delete_profile_passphrase,
    generate_passphrase, open_store, option, profile_id_path, profile_keychain_path, revision_path,
    save_profile_passphrase, set_private_dir, store_path, CliError,
};
use crate::{
    device::DeviceRegistry,
    identity::{AccountRootKey, ProfileIdentity},
    storage::{EncryptedStore, RecordClass, StorageError},
};
use std::{fs, path::PathBuf};

pub(super) fn init(args: &[String]) -> Result<String, CliError> {
    let data_dir = data_dir(args)?;
    let display_name = option(args, "--display-name")?
        .ok_or_else(|| CliError::Usage("init requires --display-name".into()))?;
    let passphrase_output = option(args, "--passphrase-output")?.map(PathBuf::from);
    if store_path(&data_dir).exists() {
        return Err(CliError::AlreadyInitialized);
    }
    if passphrase_output.as_ref().is_some_and(|path| path.exists()) {
        return Err(CliError::Usage(
            "--passphrase-output already exists; refusing overwrite".into(),
        ));
    }
    fs::create_dir_all(&data_dir)?;
    set_private_dir(&data_dir)?;
    let passphrase = generate_passphrase()?;
    let root = AccountRootKey::generate().map_err(|_| CliError::Io)?;
    let device = root
        .issue_device("device-1", [0; 32], 0, u64::MAX - 1)
        .map_err(|_| CliError::Io)?;
    let profile = ProfileIdentity::from_account(&root, display_name, None)
        .map_err(|_| CliError::Usage("display name is invalid".into()))?;
    let profile_id = profile.account_id().as_str();
    let mut store = EncryptedStore::initialize(store_path(&data_dir), &passphrase)?;
    let mut registry = DeviceRegistry::new(&root);
    registry
        .register(device.certificate().clone(), 0)
        .map_err(super::registry_error)?;
    store.put(
        RecordClass::AccountRoot,
        "identity",
        &super::encode_identity(&root, &device, &profile),
    )?;
    store.put(
        RecordClass::Device,
        "registry",
        &registry.encode().map_err(super::registry_error)?,
    )?;
    atomic_write(
        &profile_id_path(&data_dir),
        format!("{profile_id}\n").as_bytes(),
    )?;
    let keychain_notice = match save_profile_passphrase(profile_id, &passphrase) {
        Ok(()) => {
            atomic_write(&profile_keychain_path(&data_dir), b"v1\n")?;
            "keychain: configured\n"
        }
        Err(StorageError::OsKeyStoreUnavailable) => {
            "keychain: unavailable; use the generated passphrase on stdin\n"
        }
        Err(_) => "keychain: could not save; use the generated passphrase on stdin\n",
    };
    if let Some(path) = &passphrase_output {
        if let Err(error) = atomic_write(path, format!("{passphrase}\n").as_bytes()) {
            let _ = fs::remove_file(store_path(&data_dir));
            let _ = fs::remove_file(revision_path(&data_dir));
            let _ = delete_profile_passphrase(profile_id);
            let _ = fs::remove_file(profile_id_path(&data_dir));
            let _ = fs::remove_file(profile_keychain_path(&data_dir));
            return Err(error);
        }
    }
    let passphrase_notice = passphrase_output
        .as_ref()
        .map(|path| format!("passphrase file: {}\n", path.display()))
        .unwrap_or_else(|| format!("passphrase: {passphrase}\n"));
    Ok(format!(
        "profile initialized\naccount_id: {}\ndevice_id: {}\n{}{}private key: encrypted in local daemon store",
        profile.account_id().as_str(),
        device.device_id(),
        keychain_notice,
        passphrase_notice,
    ))
}

pub(super) fn identity_show(args: &[String], passphrase: &str) -> Result<String, CliError> {
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

pub(super) fn keychain_command(
    args: &[String],
    passphrase: Option<&str>,
) -> Result<String, CliError> {
    if args.get(1).map(String::as_str) != Some("enroll") {
        return Err(CliError::Usage(
            "use keychain enroll --data-dir PATH; provide the profile passphrase on stdin".into(),
        ));
    }
    let passphrase = passphrase.ok_or_else(|| {
        CliError::Usage("keychain enroll requires the profile passphrase from stdin".into())
    })?;
    let data_dir = data_dir(args)?;
    let store = open_store(&data_dir, passphrase)?;
    let record = store
        .get(RecordClass::AccountRoot, "identity")
        .ok_or(CliError::NotInitialized)?;
    let summary = decode_identity_summary(&record).ok_or(CliError::InvalidRecovery)?;
    atomic_write(
        &profile_id_path(&data_dir),
        format!("{}\n", summary.account_id).as_bytes(),
    )?;
    save_profile_passphrase(&summary.account_id, passphrase).map_err(CliError::from)?;
    atomic_write(&profile_keychain_path(&data_dir), b"v1\n")?;
    Ok("keychain: configured; future commands may use --keychain".into())
}

pub(super) fn wipe(args: &[String], passphrase: &str) -> Result<String, CliError> {
    let data_dir = data_dir(args)?;
    let store = open_store(&data_dir, passphrase)?;
    drop(store);
    let profile_id = fs::read_to_string(profile_id_path(&data_dir))
        .ok()
        .map(|value| value.trim().to_owned());
    if let Some(profile_id) = profile_id
        .as_deref()
        .filter(|_| profile_keychain_path(&data_dir).is_file())
    {
        delete_profile_passphrase(profile_id).map_err(CliError::from)?;
    }
    let store_path = store_path(&data_dir);
    let revision_path = revision_path(&data_dir);
    if !store_path.is_file() || !revision_path.is_file() {
        return Err(CliError::NotInitialized);
    }
    fs::remove_file(&store_path)?;
    fs::remove_file(&revision_path)?;
    let _ = fs::remove_file(profile_id_path(&data_dir));
    let _ = fs::remove_file(profile_keychain_path(&data_dir));
    Ok(format!(
        "local daemon store deleted: {}\nrelay-side blobs, exported backups, OS/SSD remnants, and browser caches are not deleted",
        data_dir.display()
    ))
}
