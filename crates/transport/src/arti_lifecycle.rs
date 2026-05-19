use crate::OnionServiceKeyPolicy;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ArtiLifecycleDecision {
    pub require_app_private_state_dir: bool,
    pub require_app_private_cache_dir: bool,
    pub allow_shared_default_arti_dirs: bool,
    pub require_backup_exclusion: bool,
    pub require_log_redaction: bool,
    pub onion_service_key_policy: OnionServiceKeyPolicy,
}

pub fn arti_lifecycle_decision() -> ArtiLifecycleDecision {
    ArtiLifecycleDecision {
        require_app_private_state_dir: true,
        require_app_private_cache_dir: true,
        allow_shared_default_arti_dirs: false,
        require_backup_exclusion: true,
        require_log_redaction: true,
        onion_service_key_policy: OnionServiceKeyPolicy::DoNotGenerateUntilStorageDecision,
    }
}
