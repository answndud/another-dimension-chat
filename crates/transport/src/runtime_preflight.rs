#[cfg(target_os = "macos")]
use std::process::Command;
use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    BridgeCensorshipConfigurationError, TransportBackupExclusionError, TransportRuntimeError,
    TransportRuntimeProbeError,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransportStateCacheDirsReady {
    state_dir: PathBuf,
    cache_dir: PathBuf,
}

impl TransportStateCacheDirsReady {
    pub fn state_dir(&self) -> &Path {
        &self.state_dir
    }

    pub fn cache_dir(&self) -> &Path {
        &self.cache_dir
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransportBackupExclusionVerification;

pub fn verify_transport_backup_exclusion(
    dirs: &TransportStateCacheDirsReady,
) -> Result<TransportBackupExclusionVerification, TransportBackupExclusionError> {
    verify_dir_backup_exclusion(dirs.state_dir()).map_err(map_state_backup_exclusion_error)?;
    verify_dir_backup_exclusion(dirs.cache_dir()).map_err(map_cache_backup_exclusion_error)?;
    Ok(TransportBackupExclusionVerification)
}

#[allow(dead_code)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum DirectoryBackupExclusionProbeError {
    UnsupportedPlatform,
    MissingBackupExclusion,
    MetadataProbeFailed,
}

fn map_state_backup_exclusion_error(
    error: DirectoryBackupExclusionProbeError,
) -> TransportBackupExclusionError {
    match error {
        DirectoryBackupExclusionProbeError::UnsupportedPlatform => {
            TransportBackupExclusionError::UnsupportedPlatform
        }
        DirectoryBackupExclusionProbeError::MissingBackupExclusion => {
            TransportBackupExclusionError::MissingStateDirectoryBackupExclusion
        }
        DirectoryBackupExclusionProbeError::MetadataProbeFailed => {
            TransportBackupExclusionError::MetadataProbeFailed
        }
    }
}

fn map_cache_backup_exclusion_error(
    error: DirectoryBackupExclusionProbeError,
) -> TransportBackupExclusionError {
    match error {
        DirectoryBackupExclusionProbeError::UnsupportedPlatform => {
            TransportBackupExclusionError::UnsupportedPlatform
        }
        DirectoryBackupExclusionProbeError::MissingBackupExclusion => {
            TransportBackupExclusionError::MissingCacheDirectoryBackupExclusion
        }
        DirectoryBackupExclusionProbeError::MetadataProbeFailed => {
            TransportBackupExclusionError::MetadataProbeFailed
        }
    }
}

#[cfg(target_os = "macos")]
fn verify_dir_backup_exclusion(path: &Path) -> Result<(), DirectoryBackupExclusionProbeError> {
    let output = Command::new("xattr")
        .arg("-p")
        .arg("com.apple.metadata:com_apple_backup_excludeItem")
        .arg(path)
        .output()
        .map_err(|_| DirectoryBackupExclusionProbeError::MetadataProbeFailed)?;

    if output.status.success() && !output.stdout.is_empty() {
        Ok(())
    } else {
        Err(DirectoryBackupExclusionProbeError::MissingBackupExclusion)
    }
}

#[cfg(not(target_os = "macos"))]
fn verify_dir_backup_exclusion(_path: &Path) -> Result<(), DirectoryBackupExclusionProbeError> {
    Err(DirectoryBackupExclusionProbeError::UnsupportedPlatform)
}

pub fn probe_app_private_state_cache_dirs(
    state_dir: impl Into<PathBuf>,
    cache_dir: impl Into<PathBuf>,
) -> Result<TransportStateCacheDirsReady, TransportRuntimeProbeError> {
    let state_dir = state_dir.into();
    let cache_dir = cache_dir.into();

    validate_transport_runtime_dir(&state_dir)?;
    validate_transport_runtime_dir(&cache_dir)?;
    if state_dir == cache_dir {
        return Err(TransportRuntimeProbeError::SameStateAndCacheDirectory);
    }

    fs::create_dir_all(&state_dir)
        .map_err(|_| TransportRuntimeProbeError::DirectoryCreateFailed)?;
    fs::create_dir_all(&cache_dir)
        .map_err(|_| TransportRuntimeProbeError::DirectoryCreateFailed)?;

    probe_writable_dir(&state_dir)?;
    probe_writable_dir(&cache_dir)?;

    Ok(TransportStateCacheDirsReady {
        state_dir,
        cache_dir,
    })
}

fn validate_transport_runtime_dir(path: &Path) -> Result<(), TransportRuntimeProbeError> {
    let text = path.to_string_lossy();
    if text.is_empty() {
        return Err(TransportRuntimeProbeError::EmptyDirectory);
    }
    if !path.is_absolute() {
        return Err(TransportRuntimeProbeError::RelativeDirectory);
    }
    if looks_like_shared_arti_default(&text) {
        return Err(TransportRuntimeProbeError::SharedDefaultDirectory);
    }
    Ok(())
}

fn probe_writable_dir(path: &Path) -> Result<(), TransportRuntimeProbeError> {
    let probe = path.join(".another-dimension-transport-preflight");
    fs::write(&probe, b"probe").map_err(|_| TransportRuntimeProbeError::DirectoryProbeFailed)?;
    fs::remove_file(&probe).map_err(|_| TransportRuntimeProbeError::DirectoryProbeFailed)
}

fn looks_like_shared_arti_default(path: &str) -> bool {
    let normalized = path.replace('\\', "/").to_ascii_lowercase();
    normalized.contains("${arti_")
        || normalized.ends_with("/.cache/arti")
        || normalized.ends_with("/.local/share/arti")
        || normalized.ends_with("/library/application support/arti")
        || normalized.ends_with("/appdata/roaming/arti")
        || normalized.ends_with("/appdata/local/arti")
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportRuntimePreflight {
    pub runtime_network_enabled: bool,
    pub state_cache_dirs_accessible: bool,
    pub log_redaction_ready: bool,
    pub bridge_or_censorship_ready: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportRuntimeReady;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportLogRedactionPolicy {
    NotConfigured,
    RedactedTransportEventsOnly,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportCrashRedactionPolicy {
    NotConfigured,
    SensitivePathsAndIdentifiersRedacted,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportCensorshipReadiness {
    Unsupported,
    ExplicitlyNotRequiredForThisBuild,
    ConfiguredBeforeBootstrap,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BridgeRequirement {
    ExplicitlyNotRequiredForThisBuild,
    RequiredBeforeBootstrap,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BridgeCensorshipConfiguration {
    Unsupported,
    NoBridgeRequired,
    BridgeConfigured { redacted_bridge_config_id: String },
    RawBridgeLine { value: String },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BridgeCensorshipReady {
    pub(crate) readiness: TransportCensorshipReadiness,
}

impl BridgeCensorshipReady {
    pub fn readiness(self) -> TransportCensorshipReadiness {
        self.readiness
    }
}

impl BridgeCensorshipConfiguration {
    pub fn check(
        self,
        requirement: BridgeRequirement,
    ) -> Result<BridgeCensorshipReady, BridgeCensorshipConfigurationError> {
        match (requirement, self) {
            (BridgeRequirement::ExplicitlyNotRequiredForThisBuild, Self::NoBridgeRequired) => {
                Ok(BridgeCensorshipReady {
                    readiness: TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild,
                })
            }
            (BridgeRequirement::ExplicitlyNotRequiredForThisBuild, Self::Unsupported)
            | (BridgeRequirement::RequiredBeforeBootstrap, Self::Unsupported) => {
                Err(BridgeCensorshipConfigurationError::Unsupported)
            }
            (_, Self::RawBridgeLine { value }) => {
                let _ = value;
                Err(BridgeCensorshipConfigurationError::RawBridgeLineForbidden)
            }
            (BridgeRequirement::RequiredBeforeBootstrap, Self::NoBridgeRequired) => {
                Err(BridgeCensorshipConfigurationError::BridgeRequiredButMissing)
            }
            (
                BridgeRequirement::RequiredBeforeBootstrap,
                Self::BridgeConfigured {
                    redacted_bridge_config_id,
                },
            ) => {
                if redacted_bridge_config_id.trim().is_empty() {
                    return Err(BridgeCensorshipConfigurationError::EmptyRedactedBridgeConfigId);
                }
                Ok(BridgeCensorshipReady {
                    readiness: TransportCensorshipReadiness::ConfiguredBeforeBootstrap,
                })
            }
            (
                BridgeRequirement::ExplicitlyNotRequiredForThisBuild,
                Self::BridgeConfigured { .. },
            ) => Ok(BridgeCensorshipReady {
                readiness: TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild,
            }),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportRuntimePermissionPreflight {
    pub runtime_network_enabled: bool,
    pub app_private_state_cache_dirs: bool,
    pub backup_exclusion_verified: bool,
    pub log_redaction_policy: TransportLogRedactionPolicy,
    pub crash_redaction_policy: TransportCrashRedactionPolicy,
    pub censorship_readiness: TransportCensorshipReadiness,
}

impl TransportRuntimePermissionPreflight {
    pub fn locked_down_by_default() -> Self {
        Self {
            runtime_network_enabled: false,
            app_private_state_cache_dirs: false,
            backup_exclusion_verified: false,
            log_redaction_policy: TransportLogRedactionPolicy::NotConfigured,
            crash_redaction_policy: TransportCrashRedactionPolicy::NotConfigured,
            censorship_readiness: TransportCensorshipReadiness::Unsupported,
        }
    }

    pub fn from_platform_preflight(
        dirs: &TransportStateCacheDirsReady,
        runtime_network_enabled: bool,
        backup_exclusion_verified: bool,
        log_redaction_policy: TransportLogRedactionPolicy,
        crash_redaction_policy: TransportCrashRedactionPolicy,
        censorship_readiness: TransportCensorshipReadiness,
    ) -> Self {
        debug_assert_ne!(dirs.state_dir(), dirs.cache_dir());
        Self {
            runtime_network_enabled,
            app_private_state_cache_dirs: true,
            backup_exclusion_verified,
            log_redaction_policy,
            crash_redaction_policy,
            censorship_readiness,
        }
    }

    pub fn from_verified_platform_preflight(
        dirs: &TransportStateCacheDirsReady,
        runtime_network_enabled: bool,
        backup_exclusion_verification: &TransportBackupExclusionVerification,
        log_redaction_policy: TransportLogRedactionPolicy,
        crash_redaction_policy: TransportCrashRedactionPolicy,
        censorship_readiness: TransportCensorshipReadiness,
    ) -> Self {
        let _ = backup_exclusion_verification;
        Self::from_platform_preflight(
            dirs,
            runtime_network_enabled,
            true,
            log_redaction_policy,
            crash_redaction_policy,
            censorship_readiness,
        )
    }

    pub fn from_fully_verified_preflight(
        dirs: &TransportStateCacheDirsReady,
        runtime_network_enabled: bool,
        backup_exclusion_verification: &TransportBackupExclusionVerification,
        bridge_censorship_ready: BridgeCensorshipReady,
        log_redaction_policy: TransportLogRedactionPolicy,
        crash_redaction_policy: TransportCrashRedactionPolicy,
    ) -> Self {
        Self::from_verified_platform_preflight(
            dirs,
            runtime_network_enabled,
            backup_exclusion_verification,
            log_redaction_policy,
            crash_redaction_policy,
            bridge_censorship_ready.readiness(),
        )
    }

    pub fn to_runtime_preflight(self) -> TransportRuntimePreflight {
        TransportRuntimePreflight {
            runtime_network_enabled: self.runtime_network_enabled,
            state_cache_dirs_accessible: self.app_private_state_cache_dirs
                && self.backup_exclusion_verified,
            log_redaction_ready: self.log_redaction_policy
                == TransportLogRedactionPolicy::RedactedTransportEventsOnly
                && self.crash_redaction_policy
                    == TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted,
            bridge_or_censorship_ready: matches!(
                self.censorship_readiness,
                TransportCensorshipReadiness::ExplicitlyNotRequiredForThisBuild
                    | TransportCensorshipReadiness::ConfiguredBeforeBootstrap
            ),
        }
    }

    pub fn check(self) -> Result<TransportRuntimeReady, TransportRuntimeError> {
        self.to_runtime_preflight().check()
    }
}

impl TransportRuntimePreflight {
    pub fn disabled_by_default() -> Self {
        Self {
            runtime_network_enabled: false,
            state_cache_dirs_accessible: false,
            log_redaction_ready: false,
            bridge_or_censorship_ready: false,
        }
    }

    pub fn check(self) -> Result<TransportRuntimeReady, TransportRuntimeError> {
        if !self.runtime_network_enabled {
            return Err(TransportRuntimeError::RuntimeNetworkDisabled);
        }
        if !self.state_cache_dirs_accessible {
            return Err(TransportRuntimeError::StateDirectoryPermissionDenied);
        }
        if !self.log_redaction_ready {
            return Err(TransportRuntimeError::LogRedactionPreflightFailed);
        }
        if !self.bridge_or_censorship_ready {
            return Err(TransportRuntimeError::CensorshipOrBridgeRequired);
        }
        Ok(TransportRuntimeReady)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportRuntimeState {
    Disabled,
    Ready(TransportRuntimeReady),
}

impl TransportRuntimeState {
    pub fn disabled() -> Self {
        Self::Disabled
    }

    pub fn from_preflight(
        preflight: TransportRuntimePreflight,
    ) -> Result<Self, TransportRuntimeError> {
        preflight.check().map(Self::Ready)
    }

    pub fn is_ready(self) -> bool {
        matches!(self, Self::Ready(_))
    }
}
