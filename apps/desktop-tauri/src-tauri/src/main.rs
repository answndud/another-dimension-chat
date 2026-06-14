#[cfg(all(feature = "windows-public-shell", feature = "full-runtime"))]
compile_error!("windows-public-shell must be built with --no-default-features");

#[cfg(feature = "windows-public-shell")]
use tauri::Manager;

#[cfg(feature = "windows-public-shell")]
fn main() {
    run_windows_public_shell();
}

#[cfg(all(not(feature = "windows-public-shell"), feature = "full-runtime"))]
fn main() {
    another_dimension_desktop_tauri::run();
}

#[cfg(feature = "windows-public-shell")]
#[derive(serde::Serialize)]
struct WindowsPublicShellStatus {
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
    public_artifact_ready: bool,
    production_ready_claim: bool,
    high_risk_claim: bool,
    sensitive_communication_allowed: bool,
}

#[cfg(feature = "windows-public-shell")]
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

#[cfg(feature = "windows-public-shell")]
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

#[cfg(feature = "windows-public-shell")]
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

#[cfg(feature = "windows-public-shell")]
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

#[cfg(feature = "windows-public-shell")]
#[tauri::command]
fn prototype_status(app: tauri::AppHandle) -> WindowsPublicShellStatus {
    let engine_sidecar_basename = engine_sidecar_basename();
    let engine_sidecar_present = engine_sidecar_present(&app, &engine_sidecar_basename);
    WindowsPublicShellStatus {
        warning: "windows public shell; engine sidecar packaging does not open messaging or high-risk claims",
        artifact_type: "windows-shell-nsis-exe-installer-candidate",
        runtime_mode: "shell-sidecar-pending",
        engine_runtime_mode: "contract-only-engine-sidecar",
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
        manual_e2ee_runtime_available: false,
        public_artifact_ready: false,
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
    }
}

#[cfg(feature = "windows-public-shell")]
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

#[cfg(feature = "windows-public-shell")]
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

#[cfg(feature = "windows-public-shell")]
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

#[cfg(feature = "windows-public-shell")]
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

#[cfg(feature = "windows-public-shell")]
fn engine_sidecar_basename() -> String {
    format!(
        "another-dimension-engine-{}{}",
        engine_sidecar_target_triple(),
        std::env::consts::EXE_SUFFIX
    )
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "windows",
    target_arch = "x86_64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-pc-windows-msvc"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "windows",
    target_arch = "aarch64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-pc-windows-msvc"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "macos",
    target_arch = "x86_64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-apple-darwin"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "macos",
    target_arch = "aarch64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-apple-darwin"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "linux",
    target_arch = "x86_64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "x86_64-unknown-linux-gnu"
}

#[cfg(all(
    feature = "windows-public-shell",
    target_os = "linux",
    target_arch = "aarch64"
))]
fn engine_sidecar_target_triple() -> &'static str {
    "aarch64-unknown-linux-gnu"
}

#[cfg(all(
    feature = "windows-public-shell",
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

#[cfg(feature = "windows-public-shell")]
fn engine_sidecar_path(app: &tauri::AppHandle, basename: &str) -> Option<std::path::PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    [
        resource_dir.join(basename),
        resource_dir.join("binaries").join(basename),
    ]
    .into_iter()
    .find(|path| path.is_file())
}

#[cfg(feature = "windows-public-shell")]
fn engine_sidecar_present(app: &tauri::AppHandle, basename: &str) -> bool {
    engine_sidecar_path(app, basename).is_some()
}

#[cfg(feature = "windows-public-shell")]
fn run_engine_sidecar_command(
    app: &tauri::AppHandle,
    command: &str,
) -> Option<std::io::Result<std::process::Output>> {
    let basename = engine_sidecar_basename();
    let path = engine_sidecar_path(app, &basename)?;
    Some(std::process::Command::new(path).arg(command).output())
}

#[cfg(feature = "windows-public-shell")]
fn run_windows_public_shell() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            prototype_status,
            engine_sidecar_status,
            engine_sidecar_manual_self_test
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Windows public shell");
}

#[cfg(all(not(feature = "windows-public-shell"), not(feature = "full-runtime")))]
compile_error!("desktop-tauri requires either full-runtime or windows-public-shell");
