use another_dimension_core::production::{
    production_mobile_diagnostics_redaction_boundary_summary,
    production_mobile_runtime_command_surface_status_summary,
    production_mobile_shared_core_api_freeze_boundary_summary,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MobilePlatform {
    Android,
    Ios,
}

impl MobilePlatform {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Android => "android_runtime_candidate",
            Self::Ios => "ios_runtime_candidate",
        }
    }
}

pub fn shared_core_status_surface_json(platform: MobilePlatform) -> String {
    let runtime = production_mobile_runtime_command_surface_status_summary();
    let api = production_mobile_shared_core_api_freeze_boundary_summary();
    format!(
        concat!(
            "{{",
            "\"backup_exclusion_state\":\"platform_private_data_only_no_cloud_backup\",",
            "\"binding_strategy\":\"shared_core_json_bridge\",",
            "\"callable_json_bridge_implemented\":true,",
            "\"diagnostics_redaction_state\":\"redacted_status_support_only\",",
            "\"install_update_integrity_state\":\"manual_same_release_artifact_evidence_required\",",
            "\"local_data_lifecycle_state\":\"confirmation_required_no_unreviewed_mutation\",",
            "\"mobile_command_surface\":[\"shared_core_status_surface\",\"redacted_support_diagnostics\"],",
            "\"mobile_readiness_claimed\":false,",
            "\"native_network_delivery_enabled\":false,",
            "\"platform\":\"{}\",",
            "\"profile_lock_state\":\"not_unlocked_by_status_bridge\",",
            "\"public_non_claims\":[\"sensitive communication prohibited\",\"not audited\",\"not production-ready\",\"mobile public artifact unavailable\"],",
            "\"runtime_command_surface\":[\"explicit_user_action_required\",\"no_network_on_launch\",\"no_background_delivery\"],",
            "\"schema_version\":1,",
            "\"security_ready_claimed\":false,",
            "\"shared_core_api_boundary_closed\":{},",
            "\"shared_core_runtime_status_boundary_closed\":{}",
            "}}"
        ),
        platform.as_str(),
        api.boundary_closed(),
        runtime.boundary_closed()
    )
}

pub fn redacted_support_diagnostics_json(platform: MobilePlatform) -> String {
    let diagnostics = production_mobile_diagnostics_redaction_boundary_summary();
    format!(
        concat!(
            "{{",
            "\"background_upload_enabled\":false,",
            "\"diagnostics_redaction_state\":\"redacted_status_support_only\",",
            "\"failure_class\":\"none\",",
            "\"local_copy_only\":{},",
            "\"mobile_readiness_claimed\":false,",
            "\"platform\":\"{}\",",
            "\"public_non_claims\":[\"sensitive communication prohibited\",\"not audited\",\"not production-ready\",\"mobile public artifact unavailable\"],",
            "\"recovery_next_action\":\"copy only after explicit user action\",",
            "\"schema_version\":1,",
            "\"security_ready_claimed\":false,",
            "\"status\":\"ok\"",
            "}}"
        ),
        diagnostics.local_copy_only(),
        platform.as_str()
    )
}

pub fn mobile_command_result_json(command: &str, explicit_user_action: bool) -> String {
    let (status, failure_class, recovery_next_action) = match (command, explicit_user_action) {
        ("shared_core_status_surface" | "redacted_support_diagnostics", _) => (
            "ok",
            "none",
            "read shared core JSON bridge result",
        ),
        ("local_data_lifecycle", true) => (
            "blocked",
            "lifecycle_confirmation_required",
            "confirm lifecycle intent before local mutation",
        ),
        (
            "invite_code_create_join"
            | "pairing_payload_export_import"
            | "safety_transcript_confirm"
            | "manual_envelope_export_import"
            | "message_transcript_view",
            true,
        ) => (
            "blocked",
            "transport_unavailable",
            "runtime candidate exposes status and diagnostics first",
        ),
        (_, false) => (
            "blocked",
            "policy_blocked",
            "explicit user action required",
        ),
        _ => (
            "blocked",
            "malformed_payload",
            "show redacted parse failure",
        ),
    };
    format!(
        concat!(
            "{{",
            "\"failure_class\":\"{}\",",
            "\"mobile_readiness_claimed\":false,",
            "\"recovery_next_action\":\"{}\",",
            "\"schema_version\":1,",
            "\"status\":\"{}\"",
            "}}"
        ),
        failure_class, recovery_next_action, status
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_json_is_core_backed_and_non_claiming() {
        let status = shared_core_status_surface_json(MobilePlatform::Android);
        assert!(status.contains("\"platform\":\"android_runtime_candidate\""));
        assert!(status.contains("\"callable_json_bridge_implemented\":true"));
        assert!(status.contains("\"shared_core_api_boundary_closed\":true"));
        assert!(status.contains("\"shared_core_runtime_status_boundary_closed\":true"));
        assert!(status.contains("\"mobile_readiness_claimed\":false"));
        assert!(status.contains("\"native_network_delivery_enabled\":false"));
        assert!(!status.contains("phone"));
        assert!(!status.contains("cloud_backup\":true"));
    }

    #[test]
    fn diagnostics_json_is_redacted_and_local_only() {
        let diagnostics = redacted_support_diagnostics_json(MobilePlatform::Ios);
        assert!(diagnostics.contains("\"platform\":\"ios_runtime_candidate\""));
        assert!(diagnostics.contains("\"local_copy_only\":true"));
        assert!(diagnostics.contains("\"background_upload_enabled\":false"));
        assert!(!diagnostics.contains("local_paths"));
        assert!(!diagnostics.contains("raw_logs"));
        assert!(!diagnostics.contains("key_material"));
    }

    #[test]
    fn command_result_json_keeps_non_status_surfaces_blocked() {
        let lifecycle = mobile_command_result_json("local_data_lifecycle", true);
        assert!(lifecycle.contains("\"failure_class\":\"lifecycle_confirmation_required\""));
        let missing_action = mobile_command_result_json("manual_envelope_export_import", false);
        assert!(missing_action.contains("\"failure_class\":\"policy_blocked\""));
        let unknown = mobile_command_result_json("unknown", true);
        assert!(unknown.contains("\"failure_class\":\"malformed_payload\""));
    }
}
