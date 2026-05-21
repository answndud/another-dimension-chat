mod status;

pub use status::PrototypeStatus;
use tauri::Manager;

#[derive(serde::Serialize)]
pub struct DevLocalDemoTranscript {
    warning: String,
    transcript: String,
    steps: Vec<DevLocalDemoStep>,
    simulation: DevLocalSimulation,
    first_run_hint: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalMessageLoopResult {
    warning: String,
    transcript: String,
    messages: Vec<DevLocalLoopMessage>,
    replay_summary: String,
    expiry_summary: String,
    storage_guard: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalLoopMessage {
    index: usize,
    sent: String,
    received: String,
    replay_check: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalDemoStep {
    label: String,
    status: &'static str,
    detail: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalSimulation {
    peers: Vec<DevLocalPeer>,
    safety_number: String,
    safety_phrase: String,
    message_body: String,
    queued_envelope: String,
    replay_check: String,
}

#[derive(serde::Serialize)]
pub struct DevLocalPeer {
    name: &'static str,
    profile_state: &'static str,
    contact_state: &'static str,
    inbox_state: &'static str,
}

#[derive(serde::Serialize)]
pub struct ProductionLocalRoundtripResult {
    warning: &'static str,
    profile_stores_opened: bool,
    identities_created: bool,
    pairing_payloads_created: bool,
    session_drafts_written: bool,
    transport_state_persisted: bool,
    outbound_message_prepared: bool,
    encrypted_envelope_exported: bool,
    inbound_message_stored: bool,
    received_status_verified: bool,
    received_export_matches_input: bool,
    plaintext_returned_to_frontend: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionProfileUnlockResult {
    warning: &'static str,
    storage_opened: bool,
    app_data_profile_store: bool,
    profile_initialized: bool,
    profile_marker_present: bool,
    identity_created: bool,
    identity_private_key_present: bool,
    identity_public_key_derivable: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionPairingPayloadExportResult {
    warning: &'static str,
    storage_opened: bool,
    identity_private_key_loaded: bool,
    noise_static_private_key_written: bool,
    pairing_payload_exported: bool,
    pairing_payload: String,
    payload_format: &'static str,
    store_path_returned: bool,
    passphrase_retained: bool,
    private_key_material_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionPairingSessionDraftResult {
    warning: &'static str,
    storage_opened: bool,
    session_plan_created: bool,
    local_noise_static_private_key_loaded: bool,
    local_noise_static_matches_payload: bool,
    session_draft_written: bool,
    remote_endpoint_state_written: bool,
    replay_window_written: bool,
    channel_id_derivable: bool,
    session_draft_present: bool,
    remote_contact_present: bool,
    remote_endpoint_state_present: bool,
    replay_window_present: bool,
    payloads_returned: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionSessionStateCheckResult {
    warning: &'static str,
    storage_opened: bool,
    session_draft_present: bool,
    channel_id_derivable: bool,
    local_role_available: bool,
    remote_contact_present: bool,
    remote_endpoint_state_present: bool,
    replay_window_present: bool,
    session_transport_state_present: bool,
    runtime_material_reconstructable: bool,
    outbound_envelope_io_ready: bool,
    ready_for_message_envelope: bool,
    store_path_returned: bool,
    passphrase_retained: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionHandshakePayloadResult {
    warning: &'static str,
    storage_opened: bool,
    session_draft_loaded: bool,
    local_noise_static_private_key_loaded: bool,
    local_noise_static_matches_draft: bool,
    safety_transcript_loaded: bool,
    role_allowed: bool,
    input_payload_read: bool,
    input_payload_decodable: bool,
    output_payload_created: bool,
    output_payload: String,
    output_payload_format: &'static str,
    state_written: bool,
    transport_state_persisted: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionHandshakeFinishImportResult {
    warning: &'static str,
    storage_opened: bool,
    session_draft_loaded: bool,
    local_noise_static_private_key_loaded: bool,
    local_noise_static_matches_draft: bool,
    safety_transcript_loaded: bool,
    role_allowed: bool,
    finish_payload_read: bool,
    finish_payload_decodable: bool,
    remote_static_verified: bool,
    transport_state_created: bool,
    transport_state_persisted: bool,
    payloads_returned: bool,
    key_material_exposed: bool,
    network_io_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageEnvelopeExportResult {
    warning: &'static str,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    outbound_envelope_io_ready: bool,
    plaintext_accepted: bool,
    message_number_reserved: bool,
    local_message_index_written: bool,
    pending_message_record_written: bool,
    pending_message_record_present: bool,
    local_message_index_matches_pending: bool,
    session_transport_ready: bool,
    envelope_encryption_ready: bool,
    encrypted_envelope_written: bool,
    encrypted_envelope_present: bool,
    envelope_decodable: bool,
    envelope_message_number_matches: bool,
    envelope_payload: String,
    plaintext_returned: bool,
    key_material_exposed: bool,
    network_send_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageEnvelopeImportResult {
    warning: &'static str,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    envelope_read: bool,
    envelope_decodable: bool,
    session_transport_ready: bool,
    replay_window_loaded: bool,
    replay_accepted: bool,
    plaintext_decrypted: bool,
    plaintext_returned: bool,
    received_message_written: bool,
    replay_window_committed: bool,
    received_message_record_present: bool,
    received_message_record_decodable: bool,
    received_message_matches_session: bool,
    key_material_exposed: bool,
    network_receive_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[derive(serde::Serialize)]
pub struct ProductionMessageReceivedExportResult {
    warning: &'static str,
    storage_opened: bool,
    runtime_material_reconstructable: bool,
    received_message_record_present: bool,
    received_message_record_decodable: bool,
    received_message_matches_session: bool,
    received_message: String,
    plaintext_returned_after_unlock: bool,
    key_material_exposed: bool,
    network_receive_attempted: bool,
    transport_io_opened: bool,
    runtime_messaging_enabled: bool,
}

#[tauri::command]
fn prototype_status() -> PrototypeStatus {
    status::redacted_prototype_status()
}

#[tauri::command]
fn production_profile_unlock(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionProfileUnlockResult, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|_| "production profile unlock failed without exposing local path details")?;
    run_production_profile_unlock(app_data_root, profile, passphrase).map_err(|_| {
        "production profile unlock failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_pairing_payload_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
) -> Result<ProductionPairingPayloadExportResult, String> {
    let app_data_root = app.path().app_data_dir().map_err(|_| {
        "production pairing payload export failed without exposing local path details"
    })?;
    run_production_pairing_payload_export(app_data_root, profile, passphrase, rendezvous_endpoint)
        .map_err(|_| {
            "production pairing payload export failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_pairing_session_draft_save(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    local_payload: String,
    remote_payload: String,
) -> Result<ProductionPairingSessionDraftResult, String> {
    let app_data_root = app.path().app_data_dir().map_err(|_| {
        "production pairing session draft save failed without exposing local path details"
    })?;
    run_production_pairing_session_draft_save(
        app_data_root,
        profile,
        passphrase,
        local_payload,
        remote_payload,
    )
    .map_err(|_| {
        "production pairing session draft save failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_session_state_check(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionSessionStateCheckResult, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|_| "production session state check failed without exposing local path details")?;
    run_production_session_state_check(app_data_root, profile, passphrase).map_err(|_| {
        "production session state check failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_handshake_init_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|_| "production handshake init failed without exposing local path details")?;
    run_production_handshake_init_export(app_data_root, profile, passphrase).map_err(|_| {
        "production handshake init failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_handshake_reply_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    init_payload: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|_| "production handshake reply failed without exposing local path details")?;
    run_production_handshake_reply_export(app_data_root, profile, passphrase, init_payload).map_err(
        |_| {
            "production handshake reply failed without exposing profile, path, or key details"
                .to_string()
        },
    )
}

#[tauri::command]
fn production_handshake_finish_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    reply_payload: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|_| "production handshake finish failed without exposing local path details")?;
    run_production_handshake_finish_export(app_data_root, profile, passphrase, reply_payload)
        .map_err(|_| {
            "production handshake finish failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_handshake_finish_import(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    finish_payload: String,
) -> Result<ProductionHandshakeFinishImportResult, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|_| "production handshake import failed without exposing local path details")?;
    run_production_handshake_finish_import(app_data_root, profile, passphrase, finish_payload)
        .map_err(|_| {
            "production handshake import failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_message_envelope_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
    message: String,
) -> Result<ProductionMessageEnvelopeExportResult, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|_| "production message export failed without exposing local path details")?;
    run_production_message_envelope_export(
        app_data_root,
        profile,
        passphrase,
        message_number,
        message,
    )
    .map_err(|_| {
        "production message export failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_message_envelope_import(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
    envelope_payload: String,
) -> Result<ProductionMessageEnvelopeImportResult, String> {
    let app_data_root = app
        .path()
        .app_data_dir()
        .map_err(|_| "production message import failed without exposing local path details")?;
    run_production_message_envelope_import(
        app_data_root,
        profile,
        passphrase,
        message_number,
        envelope_payload,
    )
    .map_err(|_| {
        "production message import failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn production_message_received_export(
    app: tauri::AppHandle,
    profile: String,
    passphrase: String,
    message_number: u64,
) -> Result<ProductionMessageReceivedExportResult, String> {
    let app_data_root = app.path().app_data_dir().map_err(|_| {
        "production received message export failed without exposing local path details"
    })?;
    run_production_message_received_export(app_data_root, profile, passphrase, message_number)
        .map_err(|_| {
            "production received message export failed without exposing profile, path, or key details"
                .to_string()
        })
}

#[tauri::command]
fn production_local_roundtrip(message: String) -> Result<ProductionLocalRoundtripResult, String> {
    run_production_local_roundtrip(message).map_err(|_| {
        "production local roundtrip failed without exposing profile, path, or key details"
            .to_string()
    })
}

#[tauri::command]
fn dev_local_demo() -> Result<DevLocalDemoTranscript, String> {
    let root_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .ok_or_else(|| "failed to resolve repository root".to_string())?;
    let output = std::process::Command::new("cargo")
        .current_dir(root_dir)
        .args([
            "run",
            "-q",
            "--features",
            "dev-insecure",
            "--",
            "demo",
            "local",
        ])
        .output()
        .map_err(|_| "failed to launch local dev demo command".to_string())?;
    let warning = String::from_utf8_lossy(&output.stderr).into_owned();
    let transcript = String::from_utf8_lossy(&output.stdout).into_owned();

    if output.status.success() {
        let steps = parse_demo_steps(&transcript);
        let simulation = build_demo_simulation(&steps);
        Ok(DevLocalDemoTranscript {
            warning,
            transcript,
            steps,
            simulation,
            first_run_hint:
                "First run may take longer while Cargo builds the dev-insecure local demo."
                    .to_string(),
        })
    } else {
        Err(format!(
            "local dev demo failed\n{}\n{}",
            warning.trim(),
            transcript.trim()
        ))
    }
}

#[tauri::command]
fn dev_local_message_loop(messages: Vec<String>) -> Result<DevLocalMessageLoopResult, String> {
    let messages = sanitize_loop_messages(messages)?;
    let root_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .ok_or_else(|| "failed to resolve repository root".to_string())?;
    let mut args = vec![
        "run".to_string(),
        "-q".to_string(),
        "--features".to_string(),
        "dev-insecure".to_string(),
        "--".to_string(),
        "demo".to_string(),
        "local-loop".to_string(),
    ];
    for message in messages {
        args.push("--message".to_string());
        args.push(message);
    }
    let output = std::process::Command::new("cargo")
        .current_dir(root_dir)
        .args(args)
        .output()
        .map_err(|_| "failed to launch local dev message loop command".to_string())?;
    let warning = String::from_utf8_lossy(&output.stderr).into_owned();
    let transcript = String::from_utf8_lossy(&output.stdout).into_owned();

    if output.status.success() {
        Ok(DevLocalMessageLoopResult {
            warning,
            messages: parse_loop_messages(&transcript),
            replay_summary: extract_line_containing(&transcript, "no replayed messages")
                .unwrap_or_else(|| "replay check summary not observed".to_string()),
            expiry_summary: extract_line_containing(&transcript, "expired envelopes:")
                .unwrap_or_else(|| "expiry summary not observed".to_string()),
            storage_guard: extract_line_containing(&transcript, "dev store plaintext guard")
                .unwrap_or_else(|| "storage guard summary not observed".to_string()),
            transcript,
        })
    } else {
        Err(format!(
            "local dev message loop failed\n{}\n{}",
            warning.trim(),
            transcript.trim()
        ))
    }
}

fn sanitize_loop_messages(messages: Vec<String>) -> Result<Vec<String>, String> {
    let cleaned = messages
        .into_iter()
        .map(|message| message.trim().to_string())
        .filter(|message| !message.is_empty())
        .collect::<Vec<_>>();
    if cleaned.is_empty() {
        return Err("local loop requires at least one message".to_string());
    }
    if cleaned.len() > 5 {
        return Err("local loop accepts at most 5 messages".to_string());
    }
    if cleaned.iter().any(|message| message.len() > 240) {
        return Err("local loop messages must be 240 characters or fewer".to_string());
    }
    Ok(cleaned)
}

fn parse_demo_steps(transcript: &str) -> Vec<DevLocalDemoStep> {
    let mut steps = Vec::new();
    let mut current_label: Option<String> = None;
    let mut current_detail = Vec::new();

    for line in transcript.lines() {
        if let Some(label) = line
            .strip_prefix("== ")
            .and_then(|value| value.strip_suffix(" =="))
        {
            if let Some(label) = current_label.replace(label.to_string()) {
                steps.push(DevLocalDemoStep {
                    label,
                    status: "completed",
                    detail: current_detail.join("\n").trim().to_string(),
                });
                current_detail.clear();
            }
        } else if current_label.is_some() && !line.trim().is_empty() {
            current_detail.push(line.to_string());
        }
    }

    if let Some(label) = current_label {
        steps.push(DevLocalDemoStep {
            label,
            status: "completed",
            detail: current_detail.join("\n").trim().to_string(),
        });
    }

    steps
}

fn build_demo_simulation(steps: &[DevLocalDemoStep]) -> DevLocalSimulation {
    DevLocalSimulation {
        peers: vec![
            DevLocalPeer {
                name: "Alice",
                profile_state: "local dev profile initialized",
                contact_state: "Bob contact activated",
                inbox_state: "sender in local dev flow",
            },
            DevLocalPeer {
                name: "Bob",
                profile_state: "local dev profile initialized",
                contact_state: "Alice contact activated",
                inbox_state: "received one local dev message",
            },
        ],
        safety_number: extract_prefixed_value(steps, "safety number:"),
        safety_phrase: extract_prefixed_value(steps, "safety phrase:"),
        message_body: extract_step_detail(steps, "Receive as Bob"),
        queued_envelope: extract_step_detail(steps, "Send message"),
        replay_check: extract_step_detail(steps, "Replay check"),
    }
}

fn extract_step_detail(steps: &[DevLocalDemoStep], label: &str) -> String {
    steps
        .iter()
        .find(|step| step.label == label)
        .map(|step| step.detail.clone())
        .unwrap_or_else(|| "not observed in local demo transcript".to_string())
}

fn extract_prefixed_value(steps: &[DevLocalDemoStep], prefix: &str) -> String {
    steps
        .iter()
        .flat_map(|step| step.detail.lines())
        .find_map(|line| line.strip_prefix(prefix).map(str::trim))
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(|| "not observed in local demo transcript".to_string())
}

fn parse_loop_messages(transcript: &str) -> Vec<DevLocalLoopMessage> {
    let mut messages = Vec::new();
    let mut current_index = None;
    let mut received = None;
    let mut replay_check = None;

    for line in transcript.lines() {
        if let Some(label) = line
            .strip_prefix("== Local message ")
            .and_then(|value| value.strip_suffix(" =="))
        {
            if let Some(index) = current_index.take() {
                messages.push(DevLocalLoopMessage {
                    index,
                    sent: received.clone().unwrap_or_default(),
                    received: received.take().unwrap_or_default(),
                    replay_check: replay_check.take().unwrap_or_default(),
                });
            }
            current_index = label.parse::<usize>().ok();
        } else if let Some(value) = line.strip_prefix("received by bob: ") {
            received = Some(value.to_string());
        } else if let Some(value) = line.strip_prefix("replay check: ") {
            replay_check = Some(value.to_string());
        }
    }

    if let Some(index) = current_index {
        messages.push(DevLocalLoopMessage {
            index,
            sent: received.clone().unwrap_or_default(),
            received: received.unwrap_or_default(),
            replay_check: replay_check.unwrap_or_default(),
        });
    }

    messages
}

fn extract_line_containing(transcript: &str, needle: &str) -> Option<String> {
    transcript
        .lines()
        .rev()
        .find(|line| line.contains(needle))
        .map(ToString::to_string)
}

fn run_production_profile_unlock(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionProfileUnlockResult, String> {
    use another_dimension_core::production::{
        production_profile_identity_init, production_profile_identity_status,
        production_profile_init, production_profile_status,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;

    if let Some(parent) = store_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|_| "failed to create production profile store directory")?;
    }

    let initial_profile = production_profile_status(&store_path, profile.clone(), &passphrase)
        .map_err(|_| "profile unlock failed")?;
    let profile_initialized = if initial_profile.profile_marker_present() {
        false
    } else {
        let init = production_profile_init(&store_path, profile.clone(), &passphrase)
            .map_err(|_| "profile init failed")?;
        init.profile_marker_written()
    };
    let profile_status = production_profile_status(&store_path, profile.clone(), &passphrase)
        .map_err(|_| "profile status failed")?;
    let profile_storage_opened = profile_status.storage_opened();
    let profile_marker_present = profile_status.profile_marker_present();
    let profile_key_material_exposed = profile_status.key_material_exposed();
    let profile_transport_io_opened = profile_status.transport_io_opened();
    let profile_runtime_messaging_enabled = profile_status.runtime_messaging_enabled();

    let initial_identity =
        production_profile_identity_status(&store_path, profile.clone(), &passphrase)
            .map_err(|_| "identity status failed")?;
    let identity_created = if initial_identity.identity_private_key_present() {
        false
    } else {
        let init = production_profile_identity_init(&store_path, profile.clone(), &passphrase)
            .map_err(|_| "identity init failed")?;
        init.identity_private_key_written()
    };
    let identity_status = production_profile_identity_status(&store_path, profile, &passphrase)
        .map_err(|_| "identity status failed")?;
    let identity_storage_opened = identity_status.storage_opened();
    let identity_private_key_present = identity_status.identity_private_key_present();
    let identity_public_key_derivable = identity_status.identity_public_key_derivable();
    let identity_key_material_exposed = identity_status.key_material_exposed();
    let identity_transport_io_opened = identity_status.transport_io_opened();
    let identity_runtime_messaging_enabled = identity_status.runtime_messaging_enabled();

    Ok(ProductionProfileUnlockResult {
        warning:
            "app-data production profile unlock only; no session, network, Tor, or secure-release claim",
        storage_opened: profile_storage_opened && identity_storage_opened,
        app_data_profile_store: true,
        profile_initialized,
        profile_marker_present,
        identity_created,
        identity_private_key_present,
        identity_public_key_derivable,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: profile_key_material_exposed || identity_key_material_exposed,
        network_io_attempted: false,
        transport_io_opened: profile_transport_io_opened || identity_transport_io_opened,
        runtime_messaging_enabled: profile_runtime_messaging_enabled
            || identity_runtime_messaging_enabled,
    })
}

fn sanitize_production_profile(
    profile: String,
) -> Result<another_dimension_identity::ProfileName, String> {
    let trimmed = profile.trim();
    if trimmed.len() > 64 {
        return Err("production profile name must be 64 bytes or fewer".to_string());
    }
    another_dimension_identity::ProfileName::new(trimmed)
        .map_err(|_| "invalid production profile name".to_string())
}

fn production_profile_store_path(
    app_data_root: impl AsRef<std::path::Path>,
    profile: &another_dimension_identity::ProfileName,
) -> Result<std::path::PathBuf, String> {
    let profile_name = profile.as_str();
    if profile_name.contains('.') {
        return Err("production profile name cannot contain path-like segments".to_string());
    }
    Ok(app_data_root
        .as_ref()
        .join("profiles")
        .join(format!("{profile_name}.db")))
}

fn run_production_pairing_payload_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    rendezvous_endpoint: String,
) -> Result<ProductionPairingPayloadExportResult, String> {
    use another_dimension_core::production::production_pairing_payload_create;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let rendezvous_endpoint = sanitize_pairing_rendezvous_endpoint(rendezvous_endpoint)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let summary =
        production_pairing_payload_create(&store_path, profile, &passphrase, rendezvous_endpoint)
            .map_err(|_| "pairing payload export failed")?;
    let pairing_payload = summary
        .payload()
        .encode()
        .map_err(|_| "pairing payload encoding failed")?;

    Ok(ProductionPairingPayloadExportResult {
        warning:
            "public pairing payload export only; verify safety number out-of-band before trusting a contact",
        storage_opened: summary.storage_opened(),
        identity_private_key_loaded: summary.identity_private_key_loaded(),
        noise_static_private_key_written: summary.noise_static_private_key_written(),
        pairing_payload_exported: !pairing_payload.is_empty(),
        pairing_payload,
        payload_format: "ADPAIR2",
        store_path_returned: false,
        passphrase_retained: false,
        private_key_material_returned: false,
        key_material_exposed: summary.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: summary.transport_io_opened(),
        runtime_messaging_enabled: summary.runtime_messaging_enabled(),
    })
}

fn sanitize_pairing_rendezvous_endpoint(endpoint: String) -> Result<String, String> {
    let endpoint = endpoint.trim();
    if endpoint.is_empty() {
        return Err("pairing rendezvous endpoint is required".to_string());
    }
    if endpoint.len() > 128 {
        return Err("pairing rendezvous endpoint must be 128 bytes or fewer".to_string());
    }
    if !endpoint.ends_with(".onion")
        || endpoint.contains('/')
        || endpoint.contains('\\')
        || endpoint.chars().any(char::is_whitespace)
    {
        return Err("pairing rendezvous endpoint must be a single onion host".to_string());
    }
    Ok(endpoint.to_string())
}

fn run_production_pairing_session_draft_save(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    local_payload: String,
    remote_payload: String,
) -> Result<ProductionPairingSessionDraftResult, String> {
    use another_dimension_core::production::{
        production_pairing_session_save_draft, production_pairing_session_status,
    };
    use another_dimension_pairing::PairingPayload;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let local_payload = PairingPayload::decode(&sanitize_pairing_payload(local_payload)?)
        .map_err(|_| "invalid local pairing payload")?;
    let remote_payload = PairingPayload::decode(&sanitize_pairing_payload(remote_payload)?)
        .map_err(|_| "invalid remote pairing payload")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;

    let save = production_pairing_session_save_draft(
        &store_path,
        profile.clone(),
        &passphrase,
        &local_payload,
        &remote_payload,
    )
    .map_err(|_| "session draft save failed")?;
    let status = production_pairing_session_status(&store_path, profile, &passphrase)
        .map_err(|_| "session draft status failed")?;

    Ok(ProductionPairingSessionDraftResult {
        warning:
            "session draft saved locally only; verify safety number before handshake or trust decisions",
        storage_opened: save.storage_opened() && status.storage_opened(),
        session_plan_created: save.session_plan_created(),
        local_noise_static_private_key_loaded: save.local_noise_static_private_key_loaded(),
        local_noise_static_matches_payload: save.local_noise_static_matches_payload(),
        session_draft_written: save.session_draft_written(),
        remote_endpoint_state_written: save.remote_endpoint_state_written(),
        replay_window_written: save.replay_window_written(),
        channel_id_derivable: save.channel_id_derivable() && status.channel_id_derivable(),
        session_draft_present: status.session_draft_present(),
        remote_contact_present: status.remote_contact_present(),
        remote_endpoint_state_present: status.remote_endpoint_state_present(),
        replay_window_present: status.replay_window_present(),
        payloads_returned: false,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: save.key_material_exposed() || status.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: save.transport_io_opened() || status.transport_io_opened(),
        runtime_messaging_enabled: save.runtime_messaging_enabled()
            || status.runtime_messaging_enabled(),
    })
}

fn sanitize_pairing_payload(payload: String) -> Result<String, String> {
    let payload = payload.trim();
    if payload.is_empty() {
        return Err("pairing payload is required".to_string());
    }
    if payload.len() > 1200 {
        return Err("pairing payload is too large".to_string());
    }
    if !payload.starts_with("ADPAIR2|") || payload.chars().any(char::is_whitespace) {
        return Err("pairing payload must be a single ADPAIR2 value".to_string());
    }
    Ok(payload.to_string())
}

fn run_production_session_state_check(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionSessionStateCheckResult, String> {
    use another_dimension_core::production::{
        production_pairing_session_open_runtime, production_pairing_session_status,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let status = production_pairing_session_status(&store_path, profile.clone(), &passphrase)
        .map_err(|_| "session state status failed")?;
    let runtime =
        production_pairing_session_open_runtime(&store_path, profile.clone(), &passphrase).ok();

    let runtime_material_reconstructable = runtime
        .as_ref()
        .is_some_and(|runtime| runtime.runtime_material_reconstructable());
    let outbound_envelope_io_ready = runtime
        .as_ref()
        .is_some_and(|runtime| runtime.outbound_envelope_io_ready());
    let session_transport_state_present = status.session_transport_state_present();

    Ok(ProductionSessionStateCheckResult {
        warning:
            "session state read from encrypted local store only; no network or transport IO opened",
        storage_opened: status.storage_opened()
            && runtime
                .as_ref()
                .map(|runtime| runtime.storage_opened())
                .unwrap_or(true),
        session_draft_present: status.session_draft_present(),
        channel_id_derivable: status.channel_id_derivable(),
        local_role_available: status.local_role_available(),
        remote_contact_present: status.remote_contact_present(),
        remote_endpoint_state_present: status.remote_endpoint_state_present(),
        replay_window_present: status.replay_window_present(),
        session_transport_state_present,
        runtime_material_reconstructable,
        outbound_envelope_io_ready,
        ready_for_message_envelope: status.session_draft_present()
            && status.channel_id_derivable()
            && status.remote_contact_present()
            && status.remote_endpoint_state_present()
            && status.replay_window_present()
            && runtime_material_reconstructable
            && outbound_envelope_io_ready
            && session_transport_state_present,
        store_path_returned: false,
        passphrase_retained: false,
        key_material_exposed: status.key_material_exposed()
            || runtime
                .as_ref()
                .is_some_and(|runtime| runtime.key_material_exposed()),
        network_io_attempted: false,
        transport_io_opened: status.transport_io_opened()
            || runtime
                .as_ref()
                .is_some_and(|runtime| runtime.transport_io_opened()),
        runtime_messaging_enabled: status.runtime_messaging_enabled()
            || runtime
                .as_ref()
                .is_some_and(|runtime| runtime.runtime_messaging_enabled()),
    })
}

fn run_production_handshake_init_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    use another_dimension_core::production::production_pairing_session_handshake_init_export;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let init = production_pairing_session_handshake_init_export(&store_path, profile, &passphrase)
        .map_err(|_| "handshake init export failed")?;

    Ok(ProductionHandshakePayloadResult {
        warning: "handshake init payload export only; send out-of-band to paired contact",
        storage_opened: init.storage_opened(),
        session_draft_loaded: init.session_draft_loaded(),
        local_noise_static_private_key_loaded: init.local_noise_static_private_key_loaded(),
        local_noise_static_matches_draft: init.local_noise_static_matches_draft(),
        safety_transcript_loaded: init.safety_transcript_loaded(),
        role_allowed: init.local_role_can_initiate(),
        input_payload_read: false,
        input_payload_decodable: false,
        output_payload_created: init.handshake_message_created(),
        output_payload: init.export_payload().trim().to_string(),
        output_payload_format: "ADNOISEXXINIT1",
        state_written: init.initiator_state_written(),
        transport_state_persisted: false,
        key_material_exposed: init.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: init.transport_io_opened(),
        runtime_messaging_enabled: init.runtime_messaging_enabled(),
    })
}

fn run_production_handshake_reply_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    init_payload: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    use another_dimension_core::production::production_pairing_session_handshake_reply_export;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let init_payload = sanitize_handshake_payload(init_payload, "ADNOISEXXINIT1")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let reply = production_pairing_session_handshake_reply_export(
        &store_path,
        profile,
        &passphrase,
        &init_payload,
    )
    .map_err(|_| "handshake reply export failed")?;

    Ok(ProductionHandshakePayloadResult {
        warning: "handshake reply payload export only; send out-of-band to initiator",
        storage_opened: reply.storage_opened(),
        session_draft_loaded: reply.session_draft_loaded(),
        local_noise_static_private_key_loaded: reply.local_noise_static_private_key_loaded(),
        local_noise_static_matches_draft: reply.local_noise_static_matches_draft(),
        safety_transcript_loaded: reply.safety_transcript_loaded(),
        role_allowed: reply.local_role_can_accept(),
        input_payload_read: reply.init_message_read(),
        input_payload_decodable: reply.init_message_decodable(),
        output_payload_created: reply.reply_message_created(),
        output_payload: reply.export_payload().trim().to_string(),
        output_payload_format: "ADNOISEXXREPLY1",
        state_written: reply.responder_state_persisted(),
        transport_state_persisted: false,
        key_material_exposed: reply.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: reply.transport_io_opened(),
        runtime_messaging_enabled: reply.runtime_messaging_enabled(),
    })
}

fn run_production_handshake_finish_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    reply_payload: String,
) -> Result<ProductionHandshakePayloadResult, String> {
    use another_dimension_core::production::production_pairing_session_handshake_finish_export;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let reply_payload = sanitize_handshake_payload(reply_payload, "ADNOISEXXREPLY1")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let finish = production_pairing_session_handshake_finish_export(
        &store_path,
        profile,
        &passphrase,
        &reply_payload,
    )
    .map_err(|_| "handshake finish export failed")?;

    Ok(ProductionHandshakePayloadResult {
        warning: "handshake finish payload export only; transport state persisted locally",
        storage_opened: finish.storage_opened(),
        session_draft_loaded: finish.session_draft_loaded(),
        local_noise_static_private_key_loaded: finish.local_noise_static_private_key_loaded(),
        local_noise_static_matches_draft: finish.local_noise_static_matches_draft(),
        safety_transcript_loaded: finish.safety_transcript_loaded(),
        role_allowed: finish.local_role_can_finish(),
        input_payload_read: finish.reply_message_read(),
        input_payload_decodable: finish.reply_message_decodable(),
        output_payload_created: finish.finish_message_created(),
        output_payload: finish.export_payload().trim().to_string(),
        output_payload_format: "ADNOISEXXFINISH1",
        state_written: finish.initiator_state_loaded(),
        transport_state_persisted: finish.transport_state_persisted(),
        key_material_exposed: finish.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: finish.transport_io_opened(),
        runtime_messaging_enabled: finish.runtime_messaging_enabled(),
    })
}

fn run_production_handshake_finish_import(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    finish_payload: String,
) -> Result<ProductionHandshakeFinishImportResult, String> {
    use another_dimension_core::production::production_pairing_session_handshake_finish_import;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let finish_payload = sanitize_handshake_payload(finish_payload, "ADNOISEXXFINISH1")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let finish = production_pairing_session_handshake_finish_import(
        &store_path,
        profile,
        &passphrase,
        &finish_payload,
    )
    .map_err(|_| "handshake finish import failed")?;

    Ok(ProductionHandshakeFinishImportResult {
        warning: "handshake finish imported locally; transport state persisted",
        storage_opened: finish.storage_opened(),
        session_draft_loaded: finish.session_draft_loaded(),
        local_noise_static_private_key_loaded: finish.local_noise_static_private_key_loaded(),
        local_noise_static_matches_draft: finish.local_noise_static_matches_draft(),
        safety_transcript_loaded: finish.safety_transcript_loaded(),
        role_allowed: finish.local_role_can_complete(),
        finish_payload_read: finish.finish_message_read(),
        finish_payload_decodable: finish.finish_message_decodable(),
        remote_static_verified: finish.remote_static_verified(),
        transport_state_created: finish.transport_state_created(),
        transport_state_persisted: finish.transport_state_persisted(),
        payloads_returned: false,
        key_material_exposed: finish.key_material_exposed(),
        network_io_attempted: false,
        transport_io_opened: finish.transport_io_opened(),
        runtime_messaging_enabled: finish.runtime_messaging_enabled(),
    })
}

fn sanitize_handshake_payload(payload: String, expected_prefix: &str) -> Result<String, String> {
    let payload = payload.trim();
    if payload.is_empty() {
        return Err("handshake payload is required".to_string());
    }
    if payload.len() > 4096 {
        return Err("handshake payload is too large".to_string());
    }
    let expected = format!("{expected_prefix}|");
    if !payload.starts_with(&expected) || payload.chars().any(char::is_whitespace) {
        return Err("handshake payload must be a single expected handshake value".to_string());
    }
    Ok(payload.to_string())
}

fn run_production_message_envelope_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
    message: String,
) -> Result<ProductionMessageEnvelopeExportResult, String> {
    use another_dimension_core::production::{
        production_message_outbound_encrypt_prepare, production_message_outbound_envelope_export,
        production_message_pending_status, production_message_send_prepare,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let message = sanitize_production_message_text(message)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;

    let send = production_message_send_prepare(
        &store_path,
        profile.clone(),
        &passphrase,
        message_number,
        &message,
    )
    .map_err(|_| "message send prepare failed")?;
    let pending = production_message_pending_status(
        &store_path,
        profile.clone(),
        &passphrase,
        message_number,
    )
    .map_err(|_| "message pending status failed")?;
    let encrypt = production_message_outbound_encrypt_prepare(
        &store_path,
        profile.clone(),
        &passphrase,
        message_number,
    )
    .map_err(|_| "message encrypt prepare failed")?;
    let envelope = production_message_outbound_envelope_export(
        &store_path,
        profile,
        &passphrase,
        message_number,
    )
    .map_err(|_| "message envelope export failed")?;

    Ok(ProductionMessageEnvelopeExportResult {
        warning:
            "encrypted envelope exported locally; deliver it out-of-band to the paired contact",
        storage_opened: send.storage_opened()
            && pending.storage_opened()
            && encrypt.storage_opened()
            && envelope.storage_opened(),
        runtime_material_reconstructable: send.runtime_material_reconstructable()
            && pending.runtime_material_reconstructable()
            && encrypt.runtime_material_reconstructable()
            && envelope.runtime_material_reconstructable(),
        outbound_envelope_io_ready: send.outbound_envelope_io_ready(),
        plaintext_accepted: send.plaintext_accepted(),
        message_number_reserved: send.message_number_reserved(),
        local_message_index_written: send.local_message_index_written(),
        pending_message_record_written: send.pending_message_record_written(),
        pending_message_record_present: pending.pending_message_record_present()
            && encrypt.pending_message_record_present(),
        local_message_index_matches_pending: pending.local_message_index_matches_pending()
            && encrypt.local_message_index_matches_pending(),
        session_transport_ready: encrypt.session_transport_ready(),
        envelope_encryption_ready: encrypt.envelope_encryption_ready(),
        encrypted_envelope_written: encrypt.encrypted_envelope_written(),
        encrypted_envelope_present: envelope.encrypted_envelope_present(),
        envelope_decodable: envelope.envelope_decodable(),
        envelope_message_number_matches: envelope.envelope_message_number_matches(),
        envelope_payload: envelope.export_payload().trim().to_string(),
        plaintext_returned: false,
        key_material_exposed: send.key_material_exposed()
            || pending.key_material_exposed()
            || encrypt.key_material_exposed()
            || envelope.key_material_exposed(),
        network_send_attempted: send.network_send_attempted()
            || pending.network_send_attempted()
            || encrypt.network_send_attempted()
            || envelope.network_send_attempted(),
        transport_io_opened: send.transport_io_opened()
            || pending.transport_io_opened()
            || encrypt.transport_io_opened()
            || envelope.transport_io_opened(),
        runtime_messaging_enabled: send.runtime_messaging_enabled()
            || pending.runtime_messaging_enabled()
            || encrypt.runtime_messaging_enabled()
            || envelope.runtime_messaging_enabled(),
    })
}

fn run_production_message_envelope_import(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
    envelope_payload: String,
) -> Result<ProductionMessageEnvelopeImportResult, String> {
    use another_dimension_core::production::{
        production_message_inbound_decrypt_import, production_message_received_status,
    };
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let envelope_payload = sanitize_envelope_payload(envelope_payload)?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;

    let import = production_message_inbound_decrypt_import(
        &store_path,
        profile.clone(),
        &passphrase,
        &envelope_payload,
    )
    .map_err(|_| "message envelope import failed")?;
    let status =
        production_message_received_status(&store_path, profile, &passphrase, message_number)
            .map_err(|_| "message received status failed")?;

    Ok(ProductionMessageEnvelopeImportResult {
        warning:
            "encrypted envelope imported locally; received plaintext remains in encrypted store",
        storage_opened: import.storage_opened() && status.storage_opened(),
        runtime_material_reconstructable: import.runtime_material_reconstructable()
            && status.runtime_material_reconstructable(),
        envelope_read: import.envelope_read(),
        envelope_decodable: import.envelope_decodable(),
        session_transport_ready: import.session_transport_ready(),
        replay_window_loaded: import.replay_window_loaded(),
        replay_accepted: import.replay_accepted(),
        plaintext_decrypted: import.plaintext_decrypted(),
        plaintext_returned: false,
        received_message_written: import.received_message_written(),
        replay_window_committed: import.replay_window_committed(),
        received_message_record_present: status.received_message_record_present(),
        received_message_record_decodable: status.received_message_record_decodable(),
        received_message_matches_session: status.received_message_matches_session(),
        key_material_exposed: import.key_material_exposed() || status.key_material_exposed(),
        network_receive_attempted: import.network_receive_attempted()
            || status.network_receive_attempted(),
        transport_io_opened: import.transport_io_opened() || status.transport_io_opened(),
        runtime_messaging_enabled: import.runtime_messaging_enabled()
            || status.runtime_messaging_enabled(),
    })
}

fn run_production_message_received_export(
    app_data_root: impl AsRef<std::path::Path>,
    profile: String,
    passphrase: String,
    message_number: u64,
) -> Result<ProductionMessageReceivedExportResult, String> {
    use another_dimension_core::production::production_message_received_export;
    use another_dimension_storage::production::ProfilePassphrase;

    let profile = sanitize_production_profile(profile)?;
    let passphrase = ProfilePassphrase::new(passphrase.trim())
        .map_err(|_| "invalid production profile passphrase")?;
    let store_path = production_profile_store_path(app_data_root, &profile)?;
    let export =
        production_message_received_export(&store_path, profile, &passphrase, message_number)
            .map_err(|_| "received message export failed")?;
    let received_message = String::from_utf8(export.export_payload().to_vec())
        .map_err(|_| "received message is not displayable UTF-8")?;

    Ok(ProductionMessageReceivedExportResult {
        warning: "received message exported after local unlock; no network or transport IO opened",
        storage_opened: export.storage_opened(),
        runtime_material_reconstructable: export.runtime_material_reconstructable(),
        received_message_record_present: export.received_message_record_present(),
        received_message_record_decodable: export.received_message_record_decodable(),
        received_message_matches_session: export.received_message_matches_session(),
        received_message,
        plaintext_returned_after_unlock: true,
        key_material_exposed: export.key_material_exposed(),
        network_receive_attempted: export.network_receive_attempted(),
        transport_io_opened: export.transport_io_opened(),
        runtime_messaging_enabled: export.runtime_messaging_enabled(),
    })
}

fn sanitize_production_message_text(message: String) -> Result<Vec<u8>, String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("production message requires text".to_string());
    }
    if trimmed.len() > 240 {
        return Err("production message must be 240 bytes or fewer".to_string());
    }
    Ok(trimmed.as_bytes().to_vec())
}

fn sanitize_envelope_payload(payload: String) -> Result<String, String> {
    let payload = payload.trim();
    if payload.is_empty() {
        return Err("encrypted envelope payload is required".to_string());
    }
    if payload.len() > 4096 {
        return Err("encrypted envelope payload is too large".to_string());
    }
    if !payload.starts_with("ADENV1|") || payload.chars().any(char::is_whitespace) {
        return Err("encrypted envelope payload must be a single ADENV1 value".to_string());
    }
    Ok(payload.to_string())
}

fn run_production_local_roundtrip(
    message: String,
) -> Result<ProductionLocalRoundtripResult, String> {
    use another_dimension_core::production::{
        production_message_inbound_decrypt_import, production_message_outbound_encrypt_prepare,
        production_message_outbound_envelope_export, production_message_received_export,
        production_message_received_status, production_message_send_prepare,
        production_pairing_payload_create, production_pairing_session_handshake_finish_export,
        production_pairing_session_handshake_finish_import,
        production_pairing_session_handshake_init_export,
        production_pairing_session_handshake_reply_export, production_pairing_session_save_draft,
        production_profile_identity_init, production_profile_init,
    };
    use another_dimension_identity::ProfileName;
    use another_dimension_storage::production::ProfilePassphrase;

    let message = sanitize_production_roundtrip_message(message)?;
    let root = unique_production_roundtrip_dir()?;
    std::fs::create_dir_all(&root).map_err(|_| "failed to create local roundtrip store")?;
    let alice_store = root.join("alice.db");
    let bob_store = root.join("bob.db");
    let passphrase = ProfilePassphrase::new("local-production-roundtrip-passphrase")
        .map_err(|_| "failed to create local roundtrip passphrase")?;
    let alice = ProfileName::new("alice").map_err(|_| "failed to create local profile")?;
    let bob = ProfileName::new("bob").map_err(|_| "failed to create local profile")?;

    let result = (|| {
        let alice_profile = production_profile_init(&alice_store, alice.clone(), &passphrase)
            .map_err(|_| "profile init failed")?;
        let bob_profile = production_profile_init(&bob_store, bob.clone(), &passphrase)
            .map_err(|_| "profile init failed")?;
        let alice_identity =
            production_profile_identity_init(&alice_store, alice.clone(), &passphrase)
                .map_err(|_| "identity init failed")?;
        let bob_identity = production_profile_identity_init(&bob_store, bob.clone(), &passphrase)
            .map_err(|_| "identity init failed")?;

        let alice_payload = production_pairing_payload_create(
            &alice_store,
            alice.clone(),
            &passphrase,
            "alice.onion",
        )
        .map_err(|_| "payload create failed")?;
        let bob_payload =
            production_pairing_payload_create(&bob_store, bob.clone(), &passphrase, "bob.onion")
                .map_err(|_| "payload create failed")?;
        let alice_payload_value = alice_payload.payload().clone();
        let bob_payload_value = bob_payload.payload().clone();

        let alice_draft = production_pairing_session_save_draft(
            &alice_store,
            alice.clone(),
            &passphrase,
            &alice_payload_value,
            &bob_payload_value,
        )
        .map_err(|_| "session draft failed")?;
        let bob_draft = production_pairing_session_save_draft(
            &bob_store,
            bob.clone(),
            &passphrase,
            &bob_payload_value,
            &alice_payload_value,
        )
        .map_err(|_| "session draft failed")?;

        let alice_init = production_pairing_session_handshake_init_export(
            &alice_store,
            alice.clone(),
            &passphrase,
        )
        .map_err(|_| "handshake init failed")?;
        let (init_payload, reply_profile, reply_store, finish_profile, finish_store) =
            if alice_init.handshake_message_created() {
                (
                    alice_init.export_payload().to_string(),
                    bob.clone(),
                    bob_store.as_path(),
                    alice.clone(),
                    alice_store.as_path(),
                )
            } else {
                let bob_init = production_pairing_session_handshake_init_export(
                    &bob_store,
                    bob.clone(),
                    &passphrase,
                )
                .map_err(|_| "handshake init failed")?;
                if !bob_init.handshake_message_created() {
                    return Err("handshake init was not created");
                }
                (
                    bob_init.export_payload().to_string(),
                    alice.clone(),
                    alice_store.as_path(),
                    bob.clone(),
                    bob_store.as_path(),
                )
            };

        let reply = production_pairing_session_handshake_reply_export(
            reply_store,
            reply_profile.clone(),
            &passphrase,
            &init_payload,
        )
        .map_err(|_| "handshake reply failed")?;
        let finish = production_pairing_session_handshake_finish_export(
            finish_store,
            finish_profile.clone(),
            &passphrase,
            reply.export_payload(),
        )
        .map_err(|_| "handshake finish failed")?;
        let finish_import = production_pairing_session_handshake_finish_import(
            reply_store,
            reply_profile.clone(),
            &passphrase,
            finish.export_payload(),
        )
        .map_err(|_| "handshake finish import failed")?;

        let send = production_message_send_prepare(
            finish_store,
            finish_profile.clone(),
            &passphrase,
            1,
            &message,
        )
        .map_err(|_| "send prepare failed")?;
        let encrypt = production_message_outbound_encrypt_prepare(
            finish_store,
            finish_profile.clone(),
            &passphrase,
            1,
        )
        .map_err(|_| "encrypt prepare failed")?;
        let envelope = production_message_outbound_envelope_export(
            finish_store,
            finish_profile,
            &passphrase,
            1,
        )
        .map_err(|_| "envelope export failed")?;
        let inbound = production_message_inbound_decrypt_import(
            reply_store,
            reply_profile.clone(),
            &passphrase,
            envelope.export_payload(),
        )
        .map_err(|_| "inbound import failed")?;
        let received_status =
            production_message_received_status(reply_store, reply_profile.clone(), &passphrase, 1)
                .map_err(|_| "received status failed")?;
        let received_export =
            production_message_received_export(reply_store, reply_profile, &passphrase, 1)
                .map_err(|_| "received export failed")?;

        Ok(ProductionLocalRoundtripResult {
            warning:
                "local production-core roundtrip only; no network, Tor, or secure-release claim",
            profile_stores_opened: alice_profile.storage_opened() && bob_profile.storage_opened(),
            identities_created: alice_identity.identity_private_key_written()
                && bob_identity.identity_private_key_written(),
            pairing_payloads_created: alice_payload.noise_static_private_key_written()
                && bob_payload.noise_static_private_key_written(),
            session_drafts_written: alice_draft.session_draft_written()
                && bob_draft.session_draft_written(),
            transport_state_persisted: finish.transport_state_persisted()
                && finish_import.transport_state_persisted(),
            outbound_message_prepared: send.pending_message_record_written()
                && encrypt.encrypted_envelope_written(),
            encrypted_envelope_exported: envelope.encrypted_envelope_present()
                && !envelope.export_payload().is_empty(),
            inbound_message_stored: inbound.received_message_written(),
            received_status_verified: received_status.received_message_matches_session(),
            received_export_matches_input: received_export.export_payload() == message.as_slice(),
            plaintext_returned_to_frontend: false,
            network_io_attempted: send.network_send_attempted()
                || encrypt.network_send_attempted()
                || inbound.network_receive_attempted()
                || received_status.network_receive_attempted()
                || received_export.network_receive_attempted(),
            transport_io_opened: send.transport_io_opened()
                || encrypt.transport_io_opened()
                || inbound.transport_io_opened()
                || received_status.transport_io_opened()
                || received_export.transport_io_opened(),
            runtime_messaging_enabled: send.runtime_messaging_enabled()
                || encrypt.runtime_messaging_enabled()
                || inbound.runtime_messaging_enabled()
                || received_status.runtime_messaging_enabled()
                || received_export.runtime_messaging_enabled(),
        })
    })();

    let _ = std::fs::remove_dir_all(&root);
    result.map_err(ToString::to_string)
}

fn sanitize_production_roundtrip_message(message: String) -> Result<Vec<u8>, String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("production local roundtrip requires a message".to_string());
    }
    if trimmed.len() > 240 {
        return Err("production local roundtrip message must be 240 bytes or fewer".to_string());
    }
    Ok(trimmed.as_bytes().to_vec())
}

fn unique_production_roundtrip_dir() -> Result<std::path::PathBuf, String> {
    static TEMP_DIR_COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "failed to create local roundtrip directory name")?
        .as_nanos();
    let counter = TEMP_DIR_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    Ok(std::env::temp_dir().join(format!(
        "another-dimension-production-roundtrip-{}-{nanos}-{counter}",
        std::process::id()
    )))
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            prototype_status,
            production_profile_unlock,
            production_pairing_payload_export,
            production_pairing_session_draft_save,
            production_session_state_check,
            production_handshake_init_export,
            production_handshake_reply_export,
            production_handshake_finish_export,
            production_handshake_finish_import,
            production_message_envelope_export,
            production_message_envelope_import,
            production_message_received_export,
            production_local_roundtrip,
            dev_local_demo,
            dev_local_message_loop
        ])
        .run(tauri::generate_context!())
        .expect("failed to run desktop prototype shell");
}

#[cfg(test)]
mod tests {
    use super::{
        build_demo_simulation, parse_demo_steps, parse_loop_messages,
        production_profile_store_path, run_production_handshake_finish_export,
        run_production_handshake_finish_import, run_production_handshake_init_export,
        run_production_handshake_reply_export, run_production_local_roundtrip,
        run_production_message_envelope_export, run_production_message_envelope_import,
        run_production_message_received_export, run_production_pairing_payload_export,
        run_production_pairing_session_draft_save, run_production_profile_unlock,
        run_production_session_state_check, sanitize_envelope_payload, sanitize_handshake_payload,
        sanitize_loop_messages, sanitize_pairing_payload, sanitize_pairing_rendezvous_endpoint,
        sanitize_production_message_text, sanitize_production_profile,
        sanitize_production_roundtrip_message, unique_production_roundtrip_dir,
    };

    #[test]
    fn demo_step_parser_extracts_cli_sections() {
        let transcript = "\
Another Dimension Chat dev-insecure local demo

== Create local profiles ==
profile initialized: alice
profile initialized: bob

== Exchange pairing payloads ==
safety number: 013 859 357 798
safety phrase: copper-harbor-orbit

== Demo complete ==
dev-insecure local CLI flow completed
";

        let steps = parse_demo_steps(transcript);

        assert_eq!(steps.len(), 3);
        assert_eq!(steps[0].label, "Create local profiles");
        assert_eq!(steps[0].status, "completed");
        assert!(steps[0].detail.contains("profile initialized: alice"));
        assert_eq!(steps[1].label, "Exchange pairing payloads");
        assert!(steps[1].detail.contains("safety number"));
        assert_eq!(steps[2].label, "Demo complete");
    }

    #[test]
    fn demo_simulation_model_extracts_peer_state() {
        let transcript = "\
== Create local profiles ==
profile initialized: alice
profile initialized: bob

== Exchange pairing payloads ==
safety number: 013 859 357 798
safety phrase: copper-harbor-orbit

== Send message ==
queued envelope for bob: 256 bytes

== Receive as Bob ==
hello from the dev-insecure local demo

== Replay check ==
second receive returned no replayed messages
";

        let steps = parse_demo_steps(transcript);
        let simulation = build_demo_simulation(&steps);

        assert_eq!(simulation.peers.len(), 2);
        assert_eq!(simulation.peers[0].name, "Alice");
        assert_eq!(simulation.safety_number, "013 859 357 798");
        assert_eq!(simulation.safety_phrase, "copper-harbor-orbit");
        assert_eq!(
            simulation.message_body,
            "hello from the dev-insecure local demo"
        );
        assert!(simulation
            .queued_envelope
            .contains("queued envelope for bob"));
        assert!(simulation.replay_check.contains("no replayed messages"));
    }

    #[test]
    fn demo_loop_parser_extracts_repeated_messages() {
        let transcript = "\
== Local message 1 ==
queued envelope for bob: 256 bytes
received by bob: first
replay check: no replayed messages after message 1

== Local message 2 ==
queued envelope for bob: 256 bytes
received by bob: second
replay check: no replayed messages after message 2
";

        let messages = parse_loop_messages(transcript);

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].index, 1);
        assert_eq!(messages[0].sent, "first");
        assert_eq!(messages[0].received, "first");
        assert!(messages[1].replay_check.contains("message 2"));
    }

    #[test]
    fn demo_loop_message_sanitizer_rejects_empty_input() {
        assert!(sanitize_loop_messages(vec![" ".to_string()]).is_err());
        assert_eq!(
            sanitize_loop_messages(vec![" one ".to_string()]).expect("message"),
            ["one".to_string()]
        );
    }

    #[test]
    fn production_roundtrip_message_sanitizer_rejects_empty_input() {
        assert!(sanitize_production_roundtrip_message(" ".to_string()).is_err());
        assert_eq!(
            sanitize_production_roundtrip_message(" production local ".to_string())
                .expect("message"),
            b"production local"
        );
    }

    #[test]
    fn production_profile_sanitizer_rejects_path_like_input() {
        assert!(sanitize_production_profile("../alice".to_string()).is_err());
        assert!(sanitize_production_profile("alice.db".to_string()).is_err());
        let profile = sanitize_production_profile(" alice_1 ".to_string()).expect("profile");
        assert_eq!(profile.as_str(), "alice_1");
    }

    #[test]
    fn production_profile_store_path_stays_under_profiles_dir() {
        let profile = sanitize_production_profile("alice".to_string()).expect("profile");
        let path = production_profile_store_path("/tmp/app-data", &profile).expect("path");
        assert!(path.ends_with("profiles/alice.db"));
    }

    #[test]
    fn production_profile_unlock_uses_app_data_store_without_returning_secrets() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        let result = run_production_profile_unlock(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("profile unlock");

        assert!(result.storage_opened);
        assert!(result.app_data_profile_store);
        assert!(result.profile_initialized);
        assert!(result.profile_marker_present);
        assert!(result.identity_created);
        assert!(result.identity_private_key_present);
        assert!(result.identity_public_key_derivable);
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let second = run_production_profile_unlock(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("second profile unlock");
        assert!(!second.profile_initialized);
        assert!(!second.identity_created);

        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        assert!(!serialized.contains("profiles"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn pairing_rendezvous_endpoint_sanitizer_accepts_onion_host_only() {
        assert_eq!(
            sanitize_pairing_rendezvous_endpoint(" alice.onion ".to_string()).expect("endpoint"),
            "alice.onion"
        );
        assert!(sanitize_pairing_rendezvous_endpoint("alice.onion/path".to_string()).is_err());
        assert!(sanitize_pairing_rendezvous_endpoint("alice.example".to_string()).is_err());
        assert!(sanitize_pairing_rendezvous_endpoint("alice onion".to_string()).is_err());
    }

    #[test]
    fn production_pairing_payload_export_uses_persistent_profile_without_returning_secrets() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        run_production_profile_unlock(&root, "alice".to_string(), "correct-passphrase".to_string())
            .expect("profile unlock");
        let result = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("payload export");

        assert!(result.storage_opened);
        assert!(result.identity_private_key_loaded);
        assert!(result.noise_static_private_key_written);
        assert!(result.pairing_payload_exported);
        assert!(result.pairing_payload.starts_with("ADPAIR2|"));
        assert_eq!(result.payload_format, "ADPAIR2");
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.private_key_material_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        assert!(!serialized.contains("profiles"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn pairing_payload_sanitizer_accepts_single_adpair2_value_only() {
        assert_eq!(
            sanitize_pairing_payload(" ADPAIR2|abc|sig ".to_string()).expect("payload"),
            "ADPAIR2|abc|sig"
        );
        assert!(sanitize_pairing_payload("ADPAIR1|abc|sig".to_string()).is_err());
        assert!(sanitize_pairing_payload("ADPAIR2|abc|sig\nADPAIR2|x|y".to_string()).is_err());
    }

    #[test]
    fn production_pairing_session_draft_save_uses_persistent_profile_without_returning_secrets() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for (profile, endpoint) in [("alice", "alice.onion"), ("bob", "bob.onion")] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
            run_production_pairing_payload_export(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
                endpoint.to_string(),
            )
            .expect("payload export");
        }

        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;

        let result = run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload,
            bob_payload,
        )
        .expect("session draft save");

        assert!(result.storage_opened);
        assert!(result.session_plan_created);
        assert!(result.local_noise_static_private_key_loaded);
        assert!(result.local_noise_static_matches_payload);
        assert!(result.session_draft_written);
        assert!(result.remote_endpoint_state_written);
        assert!(result.replay_window_written);
        assert!(result.channel_id_derivable);
        assert!(result.session_draft_present);
        assert!(result.remote_contact_present);
        assert!(result.remote_endpoint_state_present);
        assert!(result.replay_window_present);
        assert!(!result.payloads_returned);
        assert!(!result.store_path_returned);
        assert!(!result.passphrase_retained);
        assert!(!result.key_material_exposed);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("ADPAIR2"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn handshake_payload_sanitizer_accepts_expected_single_value_only() {
        assert_eq!(
            sanitize_handshake_payload(" ADNOISEXXINIT1|abc ".to_string(), "ADNOISEXXINIT1")
                .expect("payload"),
            "ADNOISEXXINIT1|abc"
        );
        assert!(
            sanitize_handshake_payload("ADNOISEXXREPLY1|abc".to_string(), "ADNOISEXXINIT1")
                .is_err()
        );
        assert!(sanitize_handshake_payload(
            "ADNOISEXXINIT1|abc\nADNOISEXXINIT1|def".to_string(),
            "ADNOISEXXINIT1"
        )
        .is_err());
    }

    #[test]
    fn production_handshake_commands_persist_transport_without_returning_secrets() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for profile in ["alice", "bob"] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
        }
        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;
        run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload.clone(),
            bob_payload.clone(),
        )
        .expect("alice draft");
        run_production_pairing_session_draft_save(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            bob_payload,
            alice_payload,
        )
        .expect("bob draft");
        let draft_state = run_production_session_state_check(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("draft state");
        assert!(draft_state.storage_opened);
        assert!(draft_state.session_draft_present);
        assert!(draft_state.channel_id_derivable);
        assert!(draft_state.local_role_available);
        assert!(draft_state.remote_contact_present);
        assert!(draft_state.remote_endpoint_state_present);
        assert!(draft_state.replay_window_present);
        assert!(!draft_state.session_transport_state_present);
        assert!(draft_state.runtime_material_reconstructable);
        assert!(draft_state.outbound_envelope_io_ready);
        assert!(!draft_state.ready_for_message_envelope);
        assert!(!draft_state.store_path_returned);
        assert!(!draft_state.passphrase_retained);
        assert!(!draft_state.key_material_exposed);
        assert!(!draft_state.network_io_attempted);
        assert!(!draft_state.transport_io_opened);
        assert!(!draft_state.runtime_messaging_enabled);

        let alice_init = run_production_handshake_init_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("alice init");
        let (initiator, responder, init_payload) = if alice_init.output_payload_created {
            ("alice", "bob", alice_init.output_payload)
        } else {
            let bob_init = run_production_handshake_init_export(
                &root,
                "bob".to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("bob init");
            assert!(bob_init.output_payload_created);
            ("bob", "alice", bob_init.output_payload)
        };

        let reply = run_production_handshake_reply_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            init_payload,
        )
        .expect("reply");
        assert!(reply.output_payload_created);
        assert!(reply.state_written);

        let finish = run_production_handshake_finish_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            reply.output_payload,
        )
        .expect("finish");
        assert!(finish.output_payload_created);
        assert!(finish.transport_state_persisted);

        let import = run_production_handshake_finish_import(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            finish.output_payload,
        )
        .expect("finish import");
        assert!(import.remote_static_verified);
        assert!(import.transport_state_created);
        assert!(import.transport_state_persisted);
        assert!(!import.payloads_returned);
        assert!(!import.key_material_exposed);
        assert!(!import.network_io_attempted);
        assert!(!import.transport_io_opened);
        assert!(!import.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&import).expect("serialize import");
        assert!(!serialized.contains("ADNOISEXX"));
        assert!(!serialized.contains("correct-passphrase"));
        assert!(!serialized.contains("/tmp"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_message_sanitizers_reject_empty_or_wrong_payloads() {
        assert_eq!(
            sanitize_production_message_text(" hello ".to_string()).expect("message"),
            b"hello"
        );
        assert!(sanitize_production_message_text(" ".to_string()).is_err());
        assert_eq!(
            sanitize_envelope_payload(" ADENV1|abc ".to_string()).expect("envelope"),
            "ADENV1|abc"
        );
        assert!(sanitize_envelope_payload("ADENV2|abc".to_string()).is_err());
        assert!(sanitize_envelope_payload("ADENV1|abc\nADENV1|def".to_string()).is_err());
    }

    #[test]
    fn production_message_envelope_commands_use_persistent_transport_without_returning_plaintext() {
        let root = unique_production_roundtrip_dir().expect("temp root");
        for profile in ["alice", "bob"] {
            run_production_profile_unlock(
                &root,
                profile.to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("profile unlock");
        }
        let alice_payload = run_production_pairing_payload_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            "alice.onion".to_string(),
        )
        .expect("alice payload")
        .pairing_payload;
        let bob_payload = run_production_pairing_payload_export(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            "bob.onion".to_string(),
        )
        .expect("bob payload")
        .pairing_payload;
        run_production_pairing_session_draft_save(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
            alice_payload.clone(),
            bob_payload.clone(),
        )
        .expect("alice draft");
        run_production_pairing_session_draft_save(
            &root,
            "bob".to_string(),
            "correct-passphrase".to_string(),
            bob_payload,
            alice_payload,
        )
        .expect("bob draft");

        let alice_init = run_production_handshake_init_export(
            &root,
            "alice".to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("alice init");
        let (initiator, responder, init_payload) = if alice_init.output_payload_created {
            ("alice", "bob", alice_init.output_payload)
        } else {
            let bob_init = run_production_handshake_init_export(
                &root,
                "bob".to_string(),
                "correct-passphrase".to_string(),
            )
            .expect("bob init");
            ("bob", "alice", bob_init.output_payload)
        };
        let reply = run_production_handshake_reply_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            init_payload,
        )
        .expect("reply");
        let finish = run_production_handshake_finish_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            reply.output_payload,
        )
        .expect("finish");
        run_production_handshake_finish_import(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            finish.output_payload,
        )
        .expect("finish import");
        let ready_state = run_production_session_state_check(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
        )
        .expect("ready state");
        assert!(ready_state.session_transport_state_present);
        assert!(ready_state.runtime_material_reconstructable);
        assert!(ready_state.outbound_envelope_io_ready);
        assert!(ready_state.ready_for_message_envelope);
        assert!(!ready_state.key_material_exposed);
        assert!(!ready_state.transport_io_opened);
        assert!(!ready_state.runtime_messaging_enabled);

        let outbound = run_production_message_envelope_export(
            &root,
            initiator.to_string(),
            "correct-passphrase".to_string(),
            1,
            "persistent hello".to_string(),
        )
        .expect("outbound");
        assert!(outbound.storage_opened);
        assert!(outbound.runtime_material_reconstructable);
        assert!(outbound.message_number_reserved);
        assert!(outbound.pending_message_record_written);
        assert!(outbound.session_transport_ready);
        assert!(outbound.encrypted_envelope_written);
        assert!(outbound.encrypted_envelope_present);
        assert!(outbound.envelope_payload.starts_with("ADENV1|"));
        assert!(!outbound.plaintext_returned);
        assert!(!outbound.key_material_exposed);
        assert!(!outbound.network_send_attempted);
        assert!(!outbound.transport_io_opened);
        assert!(!outbound.runtime_messaging_enabled);

        let inbound = run_production_message_envelope_import(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            1,
            outbound.envelope_payload,
        )
        .expect("inbound");
        assert!(inbound.storage_opened);
        assert!(inbound.runtime_material_reconstructable);
        assert!(inbound.envelope_read);
        assert!(inbound.envelope_decodable);
        assert!(inbound.session_transport_ready);
        assert!(inbound.replay_accepted);
        assert!(inbound.plaintext_decrypted);
        assert!(inbound.received_message_written);
        assert!(inbound.replay_window_committed);
        assert!(inbound.received_message_matches_session);
        assert!(!inbound.plaintext_returned);
        assert!(!inbound.key_material_exposed);
        assert!(!inbound.network_receive_attempted);
        assert!(!inbound.transport_io_opened);
        assert!(!inbound.runtime_messaging_enabled);

        let received = run_production_message_received_export(
            &root,
            responder.to_string(),
            "correct-passphrase".to_string(),
            1,
        )
        .expect("received export");
        assert!(received.storage_opened);
        assert!(received.runtime_material_reconstructable);
        assert!(received.received_message_record_present);
        assert!(received.received_message_record_decodable);
        assert!(received.received_message_matches_session);
        assert_eq!(received.received_message, "persistent hello");
        assert!(received.plaintext_returned_after_unlock);
        assert!(!received.key_material_exposed);
        assert!(!received.network_receive_attempted);
        assert!(!received.transport_io_opened);
        assert!(!received.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&inbound).expect("serialize inbound");
        assert!(!serialized.contains("persistent hello"));
        assert!(!serialized.contains("ADENV1"));
        assert!(!serialized.contains("correct-passphrase"));
        let serialized_received = serde_json::to_string(&received).expect("serialize received");
        assert!(serialized_received.contains("persistent hello"));
        assert!(!serialized_received.contains("ADENV1"));
        assert!(!serialized_received.contains("correct-passphrase"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn production_roundtrip_uses_core_without_returning_plaintext() {
        let result = run_production_local_roundtrip("tauri production bridge".to_string())
            .expect("production roundtrip");

        assert!(result.profile_stores_opened);
        assert!(result.identities_created);
        assert!(result.pairing_payloads_created);
        assert!(result.session_drafts_written);
        assert!(result.transport_state_persisted);
        assert!(result.outbound_message_prepared);
        assert!(result.encrypted_envelope_exported);
        assert!(result.inbound_message_stored);
        assert!(result.received_status_verified);
        assert!(result.received_export_matches_input);
        assert!(!result.plaintext_returned_to_frontend);
        assert!(!result.network_io_attempted);
        assert!(!result.transport_io_opened);
        assert!(!result.runtime_messaging_enabled);

        let serialized = serde_json::to_string(&result).expect("serialize result");
        assert!(!serialized.contains("tauri production bridge"));
        assert!(!serialized.contains("alice"));
        assert!(!serialized.contains("bob"));
        assert!(!serialized.contains("ADENV1"));
    }
}
