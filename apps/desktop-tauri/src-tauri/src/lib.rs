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
        production_profile_store_path, run_production_local_roundtrip,
        run_production_profile_unlock, sanitize_loop_messages, sanitize_production_profile,
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
