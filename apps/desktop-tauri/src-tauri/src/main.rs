#[cfg(all(feature = "public-shell", feature = "legacy-embedded-runtime"))]
compile_error!("public-shell must not be built with legacy-embedded-runtime");

#[cfg(feature = "public-shell")]
use tauri::Manager;

#[cfg(feature = "public-shell")]
const ENGINE_SIDECAR_CONTRACT_COMMANDS: [&str; 8] = [
    "profile-status",
    "profile-unlock",
    "pairing-export",
    "pairing-import",
    "safety-preview",
    "envelope-export",
    "envelope-import",
    "redacted-support-diagnostics",
];

#[cfg(feature = "public-shell")]
fn main() {
    run_desktop_public_shell();
}

#[cfg(all(not(feature = "public-shell"), feature = "legacy-embedded-runtime"))]
fn main() {
    another_dimension_desktop_tauri::run();
}

#[cfg(feature = "public-shell")]
#[derive(serde::Serialize)]
struct DesktopPublicShellStatus {
    warning: &'static str,
    artifact_type: &'static str,
    runtime_mode: &'static str,
    engine_runtime_mode: &'static str,
    engine_sidecar_required: bool,
    engine_sidecar_present: bool,
    engine_sidecar_packaged: bool,
    engine_sidecar_contract_version: u16,
    engine_sidecar_protocol: &'static str,
    engine_sidecar_basename: String,
    engine_sidecar_location_class: &'static str,
    engine_sidecar_status_command: &'static str,
    engine_sidecar_manual_self_test_command: &'static str,
    engine_sidecar_probe_supported: bool,
    engine_sidecar_spawn_supported: bool,
    engine_sidecar_raw_path_returned: bool,
    engine_sidecar_stdout_returned: bool,
    engine_sidecar_stderr_returned: bool,
    full_runtime_compiled: bool,
    onion_runtime_compiled: bool,
    manual_e2ee_runtime_available: bool,
    local_storage_runtime_evidence_ready: bool,
    local_storage_runtime_evidence_boundary: &'static str,
    passphrase_first_unlock_required: bool,
    locked_state_no_plaintext_access: bool,
    locked_state_no_key_material_access: bool,
    locked_state_no_runtime_messaging: bool,
    rollback_marker_status: &'static str,
    rollback_marker_present: bool,
    rollback_suspicion_detected: bool,
    rollback_resume_blocked: bool,
    local_delete_confirmation_required: bool,
    local_delete_confirmation: &'static str,
    backup_exclusion_policy_decided: bool,
    backup_exclusion_verified: bool,
    backup_exclusion_status: &'static str,
    cloud_backup_or_sync_enabled: bool,
    backup_recovery_claimed: bool,
    rollback_prevention_claimed: bool,
    secure_deletion_claim_allowed: bool,
    compromised_endpoint_protected: bool,
    public_artifact_ready: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
}

#[cfg(feature = "public-shell")]
#[derive(serde::Deserialize)]
struct EngineSidecarStatusPayload {
    schema_version: String,
    sidecar_protocol: String,
    contract_version: u16,
    runtime_mode: String,
    manual_e2ee_runtime_available: bool,
    onion_runtime_compiled: bool,
    app_launch_network_allowed: bool,
    room_open_network_allowed: bool,
    redacted_diagnostics_only: bool,
    raw_local_path_returned: bool,
    key_material_exposed: bool,
    passphrase_exposed: bool,
    runtime_result_external_peer_evidence_separated: bool,
    windows_public_artifact_ready: bool,
    windows_installer_ready: bool,
    public_artifact_upload_allowed: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
}

#[cfg(feature = "public-shell")]
#[derive(serde::Serialize)]
struct EngineSidecarStatusProbe {
    command: &'static str,
    attempted: bool,
    engine_sidecar_present: bool,
    exit_success: bool,
    failure_class: &'static str,
    schema_valid: bool,
    protocol_valid: bool,
    contract_version_valid: bool,
    runtime_mode: String,
    manual_e2ee_runtime_available: bool,
    onion_runtime_compiled: bool,
    app_launch_network_allowed: bool,
    room_open_network_allowed: bool,
    redacted_diagnostics_only: bool,
    raw_local_path_returned: bool,
    key_material_exposed: bool,
    passphrase_exposed: bool,
    runtime_result_external_peer_evidence_separated: bool,
    windows_public_artifact_ready: bool,
    windows_installer_ready: bool,
    public_artifact_upload_allowed: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
    stdout_returned: bool,
    stderr_returned: bool,
    sidecar_path_returned: bool,
}

#[cfg(feature = "public-shell")]
#[derive(serde::Deserialize)]
struct EngineManualSelfTestPayload {
    schema_version: String,
    sidecar_protocol: String,
    contract_version: u16,
    runtime_mode: String,
    manual_e2ee_runtime_available: bool,
    storage_runtime_compiled: bool,
    onion_runtime_compiled: bool,
    app_launch_network_allowed: bool,
    room_open_network_allowed: bool,
    pairing_payload_roundtrip: bool,
    safety_transcript_bound: bool,
    noise_handshake_roundtrip: bool,
    envelope_roundtrip: bool,
    replay_duplicate_rejected: bool,
    plaintext_returned: bool,
    ciphertext_returned: bool,
    invite_code_returned: bool,
    endpoint_returned: bool,
    key_material_exposed: bool,
    passphrase_exposed: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
}

#[cfg(feature = "public-shell")]
#[derive(serde::Serialize)]
struct EngineManualSelfTestProbe {
    command: &'static str,
    attempted: bool,
    engine_sidecar_present: bool,
    exit_success: bool,
    failure_class: &'static str,
    schema_valid: bool,
    protocol_valid: bool,
    contract_version_valid: bool,
    runtime_mode: String,
    manual_e2ee_runtime_available: bool,
    storage_runtime_compiled: bool,
    onion_runtime_compiled: bool,
    app_launch_network_allowed: bool,
    room_open_network_allowed: bool,
    pairing_payload_roundtrip: bool,
    safety_transcript_bound: bool,
    noise_handshake_roundtrip: bool,
    envelope_roundtrip: bool,
    replay_duplicate_rejected: bool,
    plaintext_returned: bool,
    ciphertext_returned: bool,
    invite_code_returned: bool,
    endpoint_returned: bool,
    key_material_exposed: bool,
    passphrase_exposed: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
    stdout_returned: bool,
    stderr_returned: bool,
    sidecar_path_returned: bool,
}

#[cfg(feature = "public-shell")]
#[derive(serde::Deserialize)]
struct EngineCommandContractPayload {
    schema_version: String,
    sidecar_protocol: String,
    contract_version: u16,
    command: String,
    runtime_mode: String,
    status: String,
    failure_class: String,
    recovery_action: String,
    input_schema: String,
    output_schema: String,
    required_fields: Vec<String>,
    missing_required_fields: Vec<String>,
    manual_e2ee_runtime_available: bool,
    storage_runtime_available: bool,
    runtime_action_performed: bool,
    state_mutated: bool,
    artifact_written: bool,
    raw_local_path_returned: bool,
    raw_payload_returned: bool,
    plaintext_returned: bool,
    ciphertext_returned: bool,
    invite_code_returned: bool,
    endpoint_returned: bool,
    key_material_exposed: bool,
    passphrase_exposed: bool,
    app_launch_network_allowed: bool,
    room_open_network_allowed: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
}

#[cfg(feature = "public-shell")]
#[derive(serde::Serialize)]
struct EngineCommandContractProbe {
    command: String,
    attempted: bool,
    engine_sidecar_present: bool,
    exit_success: bool,
    failure_class: String,
    recovery_action: String,
    schema_valid: bool,
    protocol_valid: bool,
    contract_version_valid: bool,
    command_valid: bool,
    input_schema_valid: bool,
    output_schema_valid: bool,
    runtime_mode: String,
    status: String,
    required_fields: Vec<String>,
    missing_required_fields: Vec<String>,
    manual_e2ee_runtime_available: bool,
    storage_runtime_available: bool,
    runtime_action_performed: bool,
    state_mutated: bool,
    artifact_written: bool,
    raw_local_path_returned: bool,
    raw_payload_returned: bool,
    plaintext_returned: bool,
    ciphertext_returned: bool,
    invite_code_returned: bool,
    endpoint_returned: bool,
    key_material_exposed: bool,
    passphrase_exposed: bool,
    app_launch_network_allowed: bool,
    room_open_network_allowed: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
    stdout_returned: bool,
    stderr_returned: bool,
    sidecar_path_returned: bool,
}

#[cfg(feature = "public-shell")]
#[tauri::command]
fn prototype_status(app: tauri::AppHandle) -> DesktopPublicShellStatus {
    let engine_sidecar_basename = engine_sidecar_basename();
    let engine_sidecar_present = engine_sidecar_present(&app, &engine_sidecar_basename);
    DesktopPublicShellStatus {
        warning:
            "desktop public shell path; sidecar-first design, no full runtime and no beta onion route in this artifact",
        artifact_type: public_shell_artifact_type(),
        runtime_mode: "shell-sidecar-pending",
        engine_runtime_mode: "manual-e2ee-engine-sidecar",
        engine_sidecar_required: true,
        engine_sidecar_present,
        engine_sidecar_packaged: engine_sidecar_present,
        engine_sidecar_contract_version: 1,
        engine_sidecar_protocol: "ad-engine-json-stdio-v1",
        engine_sidecar_basename,
        engine_sidecar_location_class: "tauri-resource-sidecar-basename-only",
        engine_sidecar_status_command: "status",
        engine_sidecar_manual_self_test_command: "manual-self-test",
        engine_sidecar_probe_supported: true,
        engine_sidecar_spawn_supported: true,
        engine_sidecar_raw_path_returned: false,
        engine_sidecar_stdout_returned: false,
        engine_sidecar_stderr_returned: false,
        full_runtime_compiled: false,
        onion_runtime_compiled: false,
        manual_e2ee_runtime_available: engine_sidecar_present,
        local_storage_runtime_evidence_ready: true,
        local_storage_runtime_evidence_boundary:
            "passphrase-first-locked-state-rollback-marker-local-delete-backup-exclusion-v1",
        passphrase_first_unlock_required: true,
        locked_state_no_plaintext_access: true,
        locked_state_no_key_material_access: true,
        locked_state_no_runtime_messaging: true,
        rollback_marker_status: "passphrase-first-runtime-unlock-with-marker-based-rollback-detection",
        rollback_marker_present: true,
        rollback_suspicion_detected: false,
        rollback_resume_blocked: false,
        local_delete_confirmation_required: true,
        local_delete_confirmation: "WIPE_LOCAL_DATA",
        backup_exclusion_policy_decided: true,
        backup_exclusion_verified: false,
        backup_exclusion_status: "policy-decided-verification-required",
        cloud_backup_or_sync_enabled: false,
        backup_recovery_claimed: false,
        rollback_prevention_claimed: false,
        secure_deletion_claim_allowed: false,
        compromised_endpoint_protected: false,
        public_artifact_ready: false,
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
    }
}

#[cfg(all(feature = "public-shell", target_os = "windows"))]
fn public_shell_artifact_type() -> &'static str {
    "windows-shell-nsis-exe-installer-candidate"
}

#[cfg(all(feature = "public-shell", not(target_os = "windows")))]
fn public_shell_artifact_type() -> &'static str {
    "desktop-public-shell-local-artifact-candidate"
}

#[cfg(feature = "public-shell")]
#[tauri::command]
fn engine_sidecar_status(app: tauri::AppHandle) -> EngineSidecarStatusProbe {
    let command = "status";
    let Some(output) = run_engine_sidecar_command(&app, command) else {
        return empty_engine_sidecar_status_probe(command, "sidecar-not-present", false, false);
    };
    let Ok(output) = output else {
        return empty_engine_sidecar_status_probe(command, "sidecar-spawn-failed", true, false);
    };
    if !output.status.success() {
        return empty_engine_sidecar_status_probe(command, "sidecar-command-failed", true, true);
    }
    if output.stdout.len() > 16 * 1024 {
        return empty_engine_sidecar_status_probe(command, "sidecar-output-too-large", true, true);
    }
    let Ok(payload) = serde_json::from_slice::<EngineSidecarStatusPayload>(&output.stdout) else {
        return empty_engine_sidecar_status_probe(command, "sidecar-invalid-json", true, true);
    };
    let schema_valid = payload.schema_version == "ad-engine-sidecar-status-v1";
    let protocol_valid = payload.sidecar_protocol == "ad-engine-json-stdio-v1";
    let contract_version_valid = payload.contract_version == 1;
    let failure_class = if schema_valid && protocol_valid && contract_version_valid {
        "none"
    } else {
        "sidecar-contract-mismatch"
    };
    EngineSidecarStatusProbe {
        command,
        attempted: true,
        engine_sidecar_present: true,
        exit_success: true,
        failure_class,
        schema_valid,
        protocol_valid,
        contract_version_valid,
        runtime_mode: payload.runtime_mode,
        manual_e2ee_runtime_available: payload.manual_e2ee_runtime_available,
        onion_runtime_compiled: payload.onion_runtime_compiled,
        app_launch_network_allowed: payload.app_launch_network_allowed,
        room_open_network_allowed: payload.room_open_network_allowed,
        redacted_diagnostics_only: payload.redacted_diagnostics_only,
        raw_local_path_returned: payload.raw_local_path_returned,
        key_material_exposed: payload.key_material_exposed,
        passphrase_exposed: payload.passphrase_exposed,
        runtime_result_external_peer_evidence_separated: payload
            .runtime_result_external_peer_evidence_separated,
        windows_public_artifact_ready: payload.windows_public_artifact_ready,
        windows_installer_ready: payload.windows_installer_ready,
        public_artifact_upload_allowed: payload.public_artifact_upload_allowed,
        production_ready_claim: payload.production_ready_claim,
        high_risk_claim: payload.high_risk_claim,
        sensitive_communication_allowed: payload.sensitive_communication_allowed,
        stdout_returned: false,
        stderr_returned: false,
        sidecar_path_returned: false,
    }
}

#[cfg(feature = "public-shell")]
#[tauri::command]
fn engine_sidecar_manual_self_test(app: tauri::AppHandle) -> EngineManualSelfTestProbe {
    let command = "manual-self-test";
    let Some(output) = run_engine_sidecar_command(&app, command) else {
        return empty_engine_manual_self_test_probe(command, "sidecar-not-present", false, false);
    };
    let Ok(output) = output else {
        return empty_engine_manual_self_test_probe(command, "sidecar-spawn-failed", true, false);
    };
    if !output.status.success() {
        return empty_engine_manual_self_test_probe(
            command,
            "manual-e2ee-runtime-not-compiled",
            true,
            true,
        );
    }
    if output.stdout.len() > 16 * 1024 {
        return empty_engine_manual_self_test_probe(
            command,
            "sidecar-output-too-large",
            true,
            true,
        );
    }
    let Ok(payload) = serde_json::from_slice::<EngineManualSelfTestPayload>(&output.stdout) else {
        return empty_engine_manual_self_test_probe(command, "sidecar-invalid-json", true, true);
    };
    let schema_valid = payload.schema_version == "ad-engine-manual-e2ee-self-test-v1";
    let protocol_valid = payload.sidecar_protocol == "ad-engine-json-stdio-v1";
    let contract_version_valid = payload.contract_version == 1;
    let failure_class = if schema_valid && protocol_valid && contract_version_valid {
        "none"
    } else {
        "sidecar-contract-mismatch"
    };
    EngineManualSelfTestProbe {
        command,
        attempted: true,
        engine_sidecar_present: true,
        exit_success: true,
        failure_class,
        schema_valid,
        protocol_valid,
        contract_version_valid,
        runtime_mode: payload.runtime_mode,
        manual_e2ee_runtime_available: payload.manual_e2ee_runtime_available,
        storage_runtime_compiled: payload.storage_runtime_compiled,
        onion_runtime_compiled: payload.onion_runtime_compiled,
        app_launch_network_allowed: payload.app_launch_network_allowed,
        room_open_network_allowed: payload.room_open_network_allowed,
        pairing_payload_roundtrip: payload.pairing_payload_roundtrip,
        safety_transcript_bound: payload.safety_transcript_bound,
        noise_handshake_roundtrip: payload.noise_handshake_roundtrip,
        envelope_roundtrip: payload.envelope_roundtrip,
        replay_duplicate_rejected: payload.replay_duplicate_rejected,
        plaintext_returned: payload.plaintext_returned,
        ciphertext_returned: payload.ciphertext_returned,
        invite_code_returned: payload.invite_code_returned,
        endpoint_returned: payload.endpoint_returned,
        key_material_exposed: payload.key_material_exposed,
        passphrase_exposed: payload.passphrase_exposed,
        production_ready_claim: payload.production_ready_claim,
        high_risk_claim: payload.high_risk_claim,
        sensitive_communication_allowed: payload.sensitive_communication_allowed,
        stdout_returned: false,
        stderr_returned: false,
        sidecar_path_returned: false,
    }
}

#[cfg(feature = "public-shell")]
#[tauri::command]
fn engine_sidecar_contract_command(
    app: tauri::AppHandle,
    command: String,
    input: Option<serde_json::Value>,
) -> EngineCommandContractProbe {
    let command = command.trim().to_string();
    if !ENGINE_SIDECAR_CONTRACT_COMMANDS.contains(&command.as_str()) {
        return empty_engine_contract_probe(command, "unsupported-contract-command", false, false);
    }
    let input = input.unwrap_or_else(|| serde_json::json!({}));
    let Ok(input_json) = serde_json::to_vec(&input) else {
        return empty_engine_contract_probe(
            command,
            "contract-input-serialize-failed",
            false,
            false,
        );
    };
    if input_json.len() > 16 * 1024 {
        return empty_engine_contract_probe(command, "contract-input-too-large", false, false);
    }
    let Some(output) = run_engine_sidecar_command_with_json_stdin(&app, &command, &input_json)
    else {
        return empty_engine_contract_probe(command, "sidecar-not-present", false, false);
    };
    let Ok(output) = output else {
        return empty_engine_contract_probe(command, "sidecar-spawn-failed", true, false);
    };
    if !output.status.success() {
        return empty_engine_contract_probe(command, "sidecar-command-failed", true, true);
    }
    if output.stdout.len() > 16 * 1024 {
        return empty_engine_contract_probe(command, "sidecar-output-too-large", true, true);
    }
    let Ok(payload) = serde_json::from_slice::<EngineCommandContractPayload>(&output.stdout) else {
        return empty_engine_contract_probe(command, "sidecar-invalid-json", true, true);
    };
    let schema_valid = payload.schema_version == "ad-engine-command-contract-result-v1";
    let protocol_valid = payload.sidecar_protocol == "ad-engine-json-stdio-v1";
    let contract_version_valid = payload.contract_version == 1;
    let command_valid = payload.command == command;
    let input_schema_valid = payload.input_schema == "ad-engine-command-input-v1";
    let output_schema_valid = payload.output_schema == "ad-engine-command-redacted-result-v1";
    let failure_class = if schema_valid
        && protocol_valid
        && contract_version_valid
        && command_valid
        && input_schema_valid
        && output_schema_valid
    {
        payload.failure_class
    } else {
        "sidecar-contract-mismatch".to_string()
    };
    EngineCommandContractProbe {
        command,
        attempted: true,
        engine_sidecar_present: true,
        exit_success: true,
        failure_class,
        recovery_action: payload.recovery_action,
        schema_valid,
        protocol_valid,
        contract_version_valid,
        command_valid,
        input_schema_valid,
        output_schema_valid,
        runtime_mode: payload.runtime_mode,
        status: payload.status,
        required_fields: payload.required_fields,
        missing_required_fields: payload.missing_required_fields,
        manual_e2ee_runtime_available: payload.manual_e2ee_runtime_available,
        storage_runtime_available: payload.storage_runtime_available,
        runtime_action_performed: payload.runtime_action_performed,
        state_mutated: payload.state_mutated,
        artifact_written: payload.artifact_written,
        raw_local_path_returned: payload.raw_local_path_returned,
        raw_payload_returned: payload.raw_payload_returned,
        plaintext_returned: payload.plaintext_returned,
        ciphertext_returned: payload.ciphertext_returned,
        invite_code_returned: payload.invite_code_returned,
        endpoint_returned: payload.endpoint_returned,
        key_material_exposed: payload.key_material_exposed,
        passphrase_exposed: payload.passphrase_exposed,
        app_launch_network_allowed: payload.app_launch_network_allowed,
        room_open_network_allowed: payload.room_open_network_allowed,
        production_ready_claim: payload.production_ready_claim,
        high_risk_claim: payload.high_risk_claim,
        sensitive_communication_allowed: payload.sensitive_communication_allowed,
        stdout_returned: false,
        stderr_returned: false,
        sidecar_path_returned: false,
    }
}

#[cfg(feature = "public-shell")]
fn empty_engine_sidecar_status_probe(
    command: &'static str,
    failure_class: &'static str,
    engine_sidecar_present: bool,
    attempted: bool,
) -> EngineSidecarStatusProbe {
    EngineSidecarStatusProbe {
        command,
        attempted,
        engine_sidecar_present,
        exit_success: false,
        failure_class,
        schema_valid: false,
        protocol_valid: false,
        contract_version_valid: false,
        runtime_mode: "unknown".to_string(),
        manual_e2ee_runtime_available: false,
        onion_runtime_compiled: false,
        app_launch_network_allowed: false,
        room_open_network_allowed: false,
        redacted_diagnostics_only: false,
        raw_local_path_returned: false,
        key_material_exposed: false,
        passphrase_exposed: false,
        runtime_result_external_peer_evidence_separated: true,
        windows_public_artifact_ready: false,
        windows_installer_ready: false,
        public_artifact_upload_allowed: false,
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
        stdout_returned: false,
        stderr_returned: false,
        sidecar_path_returned: false,
    }
}

#[cfg(feature = "public-shell")]
fn empty_engine_manual_self_test_probe(
    command: &'static str,
    failure_class: &'static str,
    engine_sidecar_present: bool,
    attempted: bool,
) -> EngineManualSelfTestProbe {
    EngineManualSelfTestProbe {
        command,
        attempted,
        engine_sidecar_present,
        exit_success: false,
        failure_class,
        schema_valid: false,
        protocol_valid: false,
        contract_version_valid: false,
        runtime_mode: "unknown".to_string(),
        manual_e2ee_runtime_available: false,
        storage_runtime_compiled: false,
        onion_runtime_compiled: false,
        app_launch_network_allowed: false,
        room_open_network_allowed: false,
        pairing_payload_roundtrip: false,
        safety_transcript_bound: false,
        noise_handshake_roundtrip: false,
        envelope_roundtrip: false,
        replay_duplicate_rejected: false,
        plaintext_returned: false,
        ciphertext_returned: false,
        invite_code_returned: false,
        endpoint_returned: false,
        key_material_exposed: false,
        passphrase_exposed: false,
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
        stdout_returned: false,
        stderr_returned: false,
        sidecar_path_returned: false,
    }
}

#[cfg(feature = "public-shell")]
fn empty_engine_contract_probe(
    command: String,
    failure_class: &'static str,
    engine_sidecar_present: bool,
    attempted: bool,
) -> EngineCommandContractProbe {
    EngineCommandContractProbe {
        command,
        attempted,
        engine_sidecar_present,
        exit_success: false,
        failure_class: failure_class.to_string(),
        recovery_action: "retry-with-redacted-contract-input".to_string(),
        schema_valid: false,
        protocol_valid: false,
        contract_version_valid: false,
        command_valid: false,
        input_schema_valid: false,
        output_schema_valid: false,
        runtime_mode: "unknown".to_string(),
        status: "rejected".to_string(),
        required_fields: Vec::new(),
        missing_required_fields: Vec::new(),
        manual_e2ee_runtime_available: false,
        storage_runtime_available: false,
        runtime_action_performed: false,
        state_mutated: false,
        artifact_written: false,
        raw_local_path_returned: false,
        raw_payload_returned: false,
        plaintext_returned: false,
        ciphertext_returned: false,
        invite_code_returned: false,
        endpoint_returned: false,
        key_material_exposed: false,
        passphrase_exposed: false,
        app_launch_network_allowed: false,
        room_open_network_allowed: false,
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
        stdout_returned: false,
        stderr_returned: false,
        sidecar_path_returned: false,
    }
}

#[cfg(feature = "public-shell")]
fn engine_sidecar_basename() -> String {
    format!(
        "another-dimension-engine-{}{}",
        engine_sidecar_target_triple(),
        std::env::consts::EXE_SUFFIX
    )
}

#[cfg(all(
    feature = "public-shell",
    target_os = "windows",
    target_arch = "x86_64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-pc-windows-msvc"
}

#[cfg(all(
    feature = "public-shell",
    target_os = "windows",
    target_arch = "aarch64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-pc-windows-msvc"
}

#[cfg(all(feature = "public-shell", target_os = "macos", target_arch = "x86_64"))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-apple-darwin"
}

#[cfg(all(feature = "public-shell", target_os = "macos", target_arch = "aarch64"))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-apple-darwin"
}

#[cfg(all(feature = "public-shell", target_os = "linux", target_arch = "x86_64"))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-unknown-linux-gnu"
}

#[cfg(all(feature = "public-shell", target_os = "linux", target_arch = "aarch64"))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-unknown-linux-gnu"
}

#[cfg(all(
    feature = "public-shell",
    not(any(
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "windows", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "x86_64"),
        all(target_os = "macos", target_arch = "aarch64"),
        all(target_os = "linux", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "aarch64")
    ))
))]
fn engine_sidecar_target_triple() -> &'static str {
    "unsupported-target"
}

#[cfg(feature = "public-shell")]
fn engine_sidecar_path(app: &tauri::AppHandle, basename: &str) -> Option<std::path::PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    [
        resource_dir.join(basename),
        resource_dir.join("binaries").join(basename),
    ]
    .into_iter()
    .find(|path| path.is_file())
}

#[cfg(feature = "public-shell")]
fn engine_sidecar_present(app: &tauri::AppHandle, basename: &str) -> bool {
    engine_sidecar_path(app, basename).is_some()
}

#[cfg(feature = "public-shell")]
fn run_engine_sidecar_command(
    app: &tauri::AppHandle,
    command: &str,
) -> Option<std::io::Result<std::process::Output>> {
    let basename = engine_sidecar_basename();
    let path = engine_sidecar_path(app, &basename)?;
    Some(std::process::Command::new(path).arg(command).output())
}

#[cfg(feature = "public-shell")]
fn run_engine_sidecar_command_with_json_stdin(
    app: &tauri::AppHandle,
    command: &str,
    input_json: &[u8],
) -> Option<std::io::Result<std::process::Output>> {
    use std::io::Write;
    let basename = engine_sidecar_basename();
    let path = engine_sidecar_path(app, &basename)?;
    let mut child = match std::process::Command::new(path)
        .arg(command)
        .arg("--json-stdin")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => return Some(Err(error)),
    };
    if let Some(stdin) = child.stdin.as_mut() {
        if let Err(error) = stdin.write_all(input_json) {
            return Some(Err(error));
        }
    }
    Some(child.wait_with_output())
}

#[cfg(feature = "public-shell")]
fn run_desktop_public_shell() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            prototype_status,
            engine_sidecar_status,
            engine_sidecar_manual_self_test,
            engine_sidecar_contract_command
        ])
        .run(tauri::generate_context!())
        .expect("failed to run desktop public shell");
}

#[cfg(all(
    not(feature = "public-shell"),
    not(feature = "legacy-embedded-runtime")
))]
compile_error!("desktop-tauri requires either legacy-embedded-runtime or public-shell");
