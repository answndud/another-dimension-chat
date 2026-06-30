use crate::{
    is_safe_endpoint_token, OnionServiceKeyLifecycleError, OnionServiceKeyMaterialError,
    TransportBackupExclusionVerification,
};
use std::fmt;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyPolicy {
    DoNotGenerateUntilStorageDecision,
    AppPrivateArtiKeystoreAfterProfileLifecycleDecision,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyGenerationPolicy {
    DisabledUntilProfileUnlock,
    AfterExplicitProfileUnlock,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyStoragePolicy {
    Undecided,
    PlaintextAppFile,
    SqlcipherWrappedByProfileKey,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyRotationPolicy {
    Missing,
    ManualRotationWithContactEndpointUpdate,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyDeletionPolicy {
    Missing,
    DeleteOnProfileDestroy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyMigrationPolicy {
    Missing,
    NoAutomaticMigration,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionServiceKeyLifecycleDecision {
    pub generation_policy: OnionServiceKeyGenerationPolicy,
    pub storage_policy: OnionServiceKeyStoragePolicy,
    pub backup_exclusion_verified: bool,
    pub rotation_policy: OnionServiceKeyRotationPolicy,
    pub deletion_policy: OnionServiceKeyDeletionPolicy,
    pub migration_policy: OnionServiceKeyMigrationPolicy,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OnionServiceKeyLifecycleReady;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ProfileTransportUnlockReady;

#[derive(Clone, Eq, PartialEq)]
pub struct OnionServiceKeyRecordId {
    value: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OnionServiceKeyMaterialState {
    Missing,
    ProfileLocked,
    PlaintextKeyBytesProvided,
    SqlcipherWrappedRecordReady,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OnionServiceKeyMaterialDecision {
    profile_unlocked: bool,
    lifecycle_ready: bool,
    material_state: OnionServiceKeyMaterialState,
    record_id: Option<OnionServiceKeyRecordId>,
}

#[derive(Clone, Eq, PartialEq)]
pub struct OnionServiceKeyMaterialReady {
    record_id: OnionServiceKeyRecordId,
}

impl OnionServiceKeyLifecycleDecision {
    pub fn locked_down_by_default() -> Self {
        Self {
            generation_policy: OnionServiceKeyGenerationPolicy::DisabledUntilProfileUnlock,
            storage_policy: OnionServiceKeyStoragePolicy::Undecided,
            backup_exclusion_verified: false,
            rotation_policy: OnionServiceKeyRotationPolicy::Missing,
            deletion_policy: OnionServiceKeyDeletionPolicy::Missing,
            migration_policy: OnionServiceKeyMigrationPolicy::Missing,
        }
    }

    pub fn sqlcipher_wrapped_after_unlock(
        _backup_exclusion_verification: &TransportBackupExclusionVerification,
    ) -> Self {
        Self {
            generation_policy: OnionServiceKeyGenerationPolicy::AfterExplicitProfileUnlock,
            storage_policy: OnionServiceKeyStoragePolicy::SqlcipherWrappedByProfileKey,
            backup_exclusion_verified: true,
            rotation_policy: OnionServiceKeyRotationPolicy::ManualRotationWithContactEndpointUpdate,
            deletion_policy: OnionServiceKeyDeletionPolicy::DeleteOnProfileDestroy,
            migration_policy: OnionServiceKeyMigrationPolicy::NoAutomaticMigration,
        }
    }

    pub fn check(self) -> Result<OnionServiceKeyLifecycleReady, OnionServiceKeyLifecycleError> {
        if self.generation_policy != OnionServiceKeyGenerationPolicy::AfterExplicitProfileUnlock {
            return Err(OnionServiceKeyLifecycleError::GenerationBeforeProfileUnlock);
        }
        if self.storage_policy == OnionServiceKeyStoragePolicy::PlaintextAppFile {
            return Err(OnionServiceKeyLifecycleError::PlaintextStorageForbidden);
        }
        if self.storage_policy != OnionServiceKeyStoragePolicy::SqlcipherWrappedByProfileKey {
            return Err(OnionServiceKeyLifecycleError::PlaintextStorageForbidden);
        }
        if !self.backup_exclusion_verified {
            return Err(OnionServiceKeyLifecycleError::BackupExclusionNotVerified);
        }
        if self.rotation_policy == OnionServiceKeyRotationPolicy::Missing {
            return Err(OnionServiceKeyLifecycleError::RotationPolicyMissing);
        }
        if self.deletion_policy == OnionServiceKeyDeletionPolicy::Missing {
            return Err(OnionServiceKeyLifecycleError::DeletionPolicyMissing);
        }
        if self.migration_policy == OnionServiceKeyMigrationPolicy::Missing {
            return Err(OnionServiceKeyLifecycleError::MigrationPolicyMissing);
        }
        Ok(OnionServiceKeyLifecycleReady)
    }
}

impl OnionServiceKeyRecordId {
    pub fn new(value: impl Into<String>) -> Result<Self, OnionServiceKeyMaterialError> {
        let value = value.into();
        if !is_safe_endpoint_token(&value) {
            return Err(OnionServiceKeyMaterialError::InvalidRecordId);
        }
        Ok(Self { value })
    }

    pub fn as_str(&self) -> &str {
        &self.value
    }
}

impl fmt::Debug for OnionServiceKeyRecordId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionServiceKeyRecordId")
            .field("value", &"<redacted>")
            .finish()
    }
}

impl OnionServiceKeyMaterialDecision {
    pub fn locked_down_by_default() -> Self {
        Self {
            profile_unlocked: false,
            lifecycle_ready: false,
            material_state: OnionServiceKeyMaterialState::Missing,
            record_id: None,
        }
    }

    pub fn profile_locked(
        _lifecycle: &OnionServiceKeyLifecycleReady,
        record_id: OnionServiceKeyRecordId,
    ) -> Self {
        Self {
            profile_unlocked: false,
            lifecycle_ready: true,
            material_state: OnionServiceKeyMaterialState::ProfileLocked,
            record_id: Some(record_id),
        }
    }

    pub fn plaintext_key_bytes_after_unlock(
        _profile_unlock: &ProfileTransportUnlockReady,
        _lifecycle: &OnionServiceKeyLifecycleReady,
    ) -> Self {
        Self {
            profile_unlocked: true,
            lifecycle_ready: true,
            material_state: OnionServiceKeyMaterialState::PlaintextKeyBytesProvided,
            record_id: None,
        }
    }

    pub fn sqlcipher_wrapped_record_after_unlock(
        _profile_unlock: &ProfileTransportUnlockReady,
        _lifecycle: &OnionServiceKeyLifecycleReady,
        record_id: OnionServiceKeyRecordId,
    ) -> Self {
        Self {
            profile_unlocked: true,
            lifecycle_ready: true,
            material_state: OnionServiceKeyMaterialState::SqlcipherWrappedRecordReady,
            record_id: Some(record_id),
        }
    }

    pub fn check(self) -> Result<OnionServiceKeyMaterialReady, OnionServiceKeyMaterialError> {
        if !self.profile_unlocked {
            return Err(OnionServiceKeyMaterialError::ProfileLocked);
        }
        if !self.lifecycle_ready {
            return Err(OnionServiceKeyMaterialError::LifecycleNotReady);
        }
        if self.material_state == OnionServiceKeyMaterialState::PlaintextKeyBytesProvided {
            return Err(OnionServiceKeyMaterialError::PlaintextKeyMaterialForbidden);
        }
        if self.material_state != OnionServiceKeyMaterialState::SqlcipherWrappedRecordReady {
            return Err(OnionServiceKeyMaterialError::MissingSqlcipherWrappedRecord);
        }

        let record_id = self
            .record_id
            .ok_or(OnionServiceKeyMaterialError::MissingSqlcipherWrappedRecord)?;
        Ok(OnionServiceKeyMaterialReady { record_id })
    }
}

impl OnionServiceKeyMaterialReady {
    pub fn record_id(&self) -> &OnionServiceKeyRecordId {
        &self.record_id
    }
}

impl fmt::Debug for OnionServiceKeyMaterialDecision {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionServiceKeyMaterialDecision")
            .field("profile_unlocked", &self.profile_unlocked)
            .field("lifecycle_ready", &self.lifecycle_ready)
            .field("material_state", &self.material_state)
            .field("record_id", &self.record_id.as_ref().map(|_| "<redacted>"))
            .finish()
    }
}

impl fmt::Debug for OnionServiceKeyMaterialReady {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OnionServiceKeyMaterialReady")
            .field("record_id", &"<redacted>")
            .field("raw_key_material", &"<not-loaded>")
            .finish()
    }
}
