use serde::{Deserialize, Serialize};
use serde_json::Value;

const SCHEMA_VERSION: &str = "ad-engine-sidecar-status-v1";
const SIDECAR_PROTOCOL: &str = "ad-engine-json-stdio-v1";
const CONTRACT_VERSION: u16 = 1;
const BINARY_NAME: &str = "another-dimension-engine";
const CONTRACT_COMMANDS: &[&str] = &[
    "status",
    "manual-self-test",
    "profile-status",
    "profile-unlock",
    "pairing-export",
    "pairing-import",
    "safety-preview",
    "envelope-export",
    "envelope-import",
    "redacted-support-diagnostics",
];

#[derive(Debug, Serialize)]
struct EngineSidecarStatus {
    schema_version: &'static str,
    sidecar_protocol: &'static str,
    contract_version: u16,
    binary_name: &'static str,
    runtime_mode: &'static str,
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
    supported_commands: &'static [&'static str],
    forbidden_public_fields: &'static [&'static str],
}

#[derive(Debug, Serialize)]
struct ManualE2eeRuntimeSelfTest {
    schema_version: &'static str,
    sidecar_protocol: &'static str,
    contract_version: u16,
    runtime_mode: &'static str,
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

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct EngineContractInput {
    profile_ref: Option<String>,
    passphrase: Option<String>,
    local_payload_ref: Option<String>,
    remote_payload_ref: Option<String>,
    rendezvous_endpoint_ref: Option<String>,
    message_ref: Option<String>,
    envelope_ref: Option<String>,
    diagnostics_ref: Option<String>,
}

#[derive(Debug, Serialize)]
struct EngineCommandContractResult {
    schema_version: &'static str,
    sidecar_protocol: &'static str,
    contract_version: u16,
    command: &'static str,
    runtime_mode: &'static str,
    status: &'static str,
    failure_class: &'static str,
    recovery_action: &'static str,
    input_schema: &'static str,
    output_schema: &'static str,
    required_fields: &'static [&'static str],
    missing_required_fields: Vec<&'static str>,
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

fn engine_sidecar_status() -> EngineSidecarStatus {
    EngineSidecarStatus {
        schema_version: SCHEMA_VERSION,
        sidecar_protocol: SIDECAR_PROTOCOL,
        contract_version: CONTRACT_VERSION,
        binary_name: BINARY_NAME,
        runtime_mode: runtime_mode(),
        manual_e2ee_runtime_available: manual_e2ee_runtime_compiled(),
        onion_runtime_compiled: false,
        app_launch_network_allowed: false,
        room_open_network_allowed: false,
        redacted_diagnostics_only: true,
        raw_local_path_returned: false,
        key_material_exposed: false,
        passphrase_exposed: false,
        runtime_result_external_peer_evidence_separated:
            runtime_result_external_peer_evidence_separated(),
        windows_public_artifact_ready: windows_public_artifact_ready(),
        windows_installer_ready: windows_installer_ready(),
        public_artifact_upload_allowed: windows_public_artifact_upload_allowed(),
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
        supported_commands: supported_commands(),
        forbidden_public_fields: &[
            "raw_logs",
            "crash_dumps",
            "screenshots",
            "local_paths",
            "onion_endpoints",
            "invite_codes",
            "pairing_payloads",
            "envelope_payloads",
            "message_text",
            "passphrases",
            "private_keys",
            "key_material",
        ],
    }
}

fn runtime_mode() -> &'static str {
    if full_runtime_compiled() {
        "full-engine-sidecar"
    } else if manual_e2ee_runtime_compiled() {
        "manual-e2ee-engine-sidecar"
    } else {
        "contract-only-engine-sidecar"
    }
}

fn supported_commands() -> &'static [&'static str] {
    CONTRACT_COMMANDS
}

fn full_runtime_compiled() -> bool {
    cfg!(feature = "full-runtime")
}

fn manual_e2ee_runtime_compiled() -> bool {
    cfg!(feature = "manual-e2ee-runtime")
}

#[cfg(feature = "full-runtime")]
fn runtime_result_external_peer_evidence_separated() -> bool {
    another_dimension_core::production::production_windows_public_artifact_candidate_summary()
        .runtime_result_external_peer_evidence_separated()
}

#[cfg(not(feature = "full-runtime"))]
fn runtime_result_external_peer_evidence_separated() -> bool {
    true
}

#[cfg(feature = "full-runtime")]
fn windows_public_artifact_ready() -> bool {
    another_dimension_core::production::production_windows_public_artifact_candidate_summary()
        .windows_public_artifact_ready()
}

#[cfg(not(feature = "full-runtime"))]
fn windows_public_artifact_ready() -> bool {
    false
}

#[cfg(feature = "full-runtime")]
fn windows_installer_ready() -> bool {
    another_dimension_core::production::production_windows_public_artifact_candidate_summary()
        .windows_installer_ready()
}

#[cfg(not(feature = "full-runtime"))]
fn windows_installer_ready() -> bool {
    false
}

#[cfg(feature = "full-runtime")]
fn windows_public_artifact_upload_allowed() -> bool {
    another_dimension_core::production::production_windows_public_artifact_candidate_summary()
        .windows_public_artifact_upload_allowed()
}

#[cfg(not(feature = "full-runtime"))]
fn windows_public_artifact_upload_allowed() -> bool {
    false
}

fn print_status() -> Result<(), String> {
    let status = engine_sidecar_status();
    let json = serde_json::to_string_pretty(&status)
        .map_err(|_| "failed to serialize engine sidecar status".to_string())?;
    println!("{json}");
    Ok(())
}

#[cfg(feature = "manual-e2ee-runtime")]
fn manual_e2ee_runtime_self_test() -> Result<ManualE2eeRuntimeSelfTest, String> {
    use another_dimension_crypto::production::{
        generate_noise_static_keypair, run_noise_xx_handshake_smoke,
    };
    use another_dimension_identity::ProfileName;
    use another_dimension_pairing::{
        production_pairing_draft_with_defaults, transcript, PairingPayload,
    };
    use another_dimension_protocol::{pad_to_bucket, Envelope, MessageType, ReplayWindow};

    let alice_static =
        generate_noise_static_keypair().map_err(|_| "manual self-test noise setup failed")?;
    let bob_static =
        generate_noise_static_keypair().map_err(|_| "manual self-test noise setup failed")?;
    let alice_prekey = alice_static
        .prekey_bundle()
        .map_err(|_| "manual self-test prekey setup failed")?
        .encode();
    let bob_prekey = bob_static
        .prekey_bundle()
        .map_err(|_| "manual self-test prekey setup failed")?
        .encode();
    let alice_profile =
        ProfileName::new("engine-alice").map_err(|_| "manual self-test profile setup failed")?;
    let bob_profile =
        ProfileName::new("engine-bob").map_err(|_| "manual self-test profile setup failed")?;
    let alice_draft = production_pairing_draft_with_defaults(
        &alice_profile,
        "manual-envelope-exchange",
        alice_prekey,
    )
    .map_err(|_| "manual self-test pairing setup failed")?;
    let bob_draft = production_pairing_draft_with_defaults(
        &bob_profile,
        "manual-envelope-exchange",
        bob_prekey,
    )
    .map_err(|_| "manual self-test pairing setup failed")?;
    let encoded_pairing = alice_draft
        .payload
        .encode()
        .map_err(|_| "manual self-test pairing encode failed")?;
    let decoded_pairing = PairingPayload::decode(&encoded_pairing)
        .map_err(|_| "manual self-test pairing decode failed")?;
    let pairing_payload_roundtrip = decoded_pairing == alice_draft.payload;
    let safety_transcript = transcript(&alice_draft.payload, &bob_draft.payload)
        .map_err(|_| "manual self-test transcript failed")?;
    let smoke = run_noise_xx_handshake_smoke(
        &safety_transcript,
        &alice_static,
        &bob_static,
        b"manual e2ee runtime smoke",
    )
    .map_err(|_| "manual self-test noise handshake failed")?;
    let noise_handshake_roundtrip = smoke.plaintext == b"manual e2ee runtime smoke";

    let padded =
        pad_to_bucket(&smoke.ciphertext).map_err(|_| "manual self-test envelope padding failed")?;
    let envelope = Envelope {
        protocol_version: 1,
        channel_id: "engine-self-test-channel".to_string(),
        message_number: 1,
        message_type: MessageType::Data,
        padded_ciphertext: padded,
    };
    let envelope_roundtrip = Envelope::decode(&envelope.encode())
        .map_err(|_| "manual self-test envelope decode failed")?
        == envelope;
    let mut replay = ReplayWindow::new(32).map_err(|_| "manual self-test replay setup failed")?;
    replay
        .accept(1)
        .map_err(|_| "manual self-test replay accept failed")?;
    let replay_duplicate_rejected = replay.accept(1).is_err();

    Ok(ManualE2eeRuntimeSelfTest {
        schema_version: "ad-engine-manual-e2ee-self-test-v1",
        sidecar_protocol: SIDECAR_PROTOCOL,
        contract_version: CONTRACT_VERSION,
        runtime_mode: runtime_mode(),
        manual_e2ee_runtime_available: true,
        storage_runtime_compiled: full_runtime_compiled(),
        onion_runtime_compiled: false,
        app_launch_network_allowed: false,
        room_open_network_allowed: false,
        pairing_payload_roundtrip,
        safety_transcript_bound: safety_transcript.starts_with("ADPAIR-SAFETY-V1|"),
        noise_handshake_roundtrip,
        envelope_roundtrip,
        replay_duplicate_rejected,
        plaintext_returned: false,
        ciphertext_returned: false,
        invite_code_returned: false,
        endpoint_returned: false,
        key_material_exposed: false,
        passphrase_exposed: false,
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
    })
}

#[cfg(not(feature = "manual-e2ee-runtime"))]
fn manual_e2ee_runtime_self_test() -> Result<ManualE2eeRuntimeSelfTest, String> {
    Err("manual-e2ee-runtime feature is not compiled".to_string())
}

fn print_manual_e2ee_runtime_self_test() -> Result<(), String> {
    let result = manual_e2ee_runtime_self_test()?;
    let json = serde_json::to_string_pretty(&result)
        .map_err(|_| "failed to serialize engine manual self-test".to_string())?;
    println!("{json}");
    Ok(())
}

fn required_fields_for_contract_command(command: &str) -> Option<&'static [&'static str]> {
    match command {
        "profile-status" => Some(&["profile_ref"]),
        "profile-unlock" => Some(&["profile_ref", "passphrase"]),
        "pairing-export" => Some(&["profile_ref", "passphrase", "rendezvous_endpoint_ref"]),
        "pairing-import" => Some(&[
            "profile_ref",
            "passphrase",
            "local_payload_ref",
            "remote_payload_ref",
        ]),
        "safety-preview" => Some(&["local_payload_ref", "remote_payload_ref"]),
        "envelope-export" => Some(&["profile_ref", "passphrase", "message_ref"]),
        "envelope-import" => Some(&["profile_ref", "passphrase", "envelope_ref"]),
        "redacted-support-diagnostics" => Some(&[]),
        _ => None,
    }
}

fn contract_field_present(input: &EngineContractInput, field: &str) -> bool {
    let value = match field {
        "profile_ref" => input.profile_ref.as_deref(),
        "passphrase" => input.passphrase.as_deref(),
        "local_payload_ref" => input.local_payload_ref.as_deref(),
        "remote_payload_ref" => input.remote_payload_ref.as_deref(),
        "rendezvous_endpoint_ref" => input.rendezvous_endpoint_ref.as_deref(),
        "message_ref" => input.message_ref.as_deref(),
        "envelope_ref" => input.envelope_ref.as_deref(),
        "diagnostics_ref" => input.diagnostics_ref.as_deref(),
        _ => None,
    };
    value.is_some_and(|value| !value.trim().is_empty())
}

fn contract_input_from_json(value: Value) -> Result<EngineContractInput, &'static str> {
    serde_json::from_value(value).map_err(|_| "invalid-input-schema")
}

fn read_contract_json_arg(args: &[String]) -> Result<Value, &'static str> {
    match args {
        [] => Ok(Value::Object(Default::default())),
        [flag, payload] if flag == "--json" => {
            let value: Value = serde_json::from_str(payload).map_err(|_| "invalid-json")?;
            if value.get("passphrase").is_some() {
                return Err("passphrase-requires-json-stdin");
            }
            Ok(value)
        }
        [flag] if flag == "--json-stdin" => {
            let mut payload = String::new();
            std::io::Read::read_to_string(&mut std::io::stdin(), &mut payload)
                .map_err(|_| "stdin-read-failed")?;
            serde_json::from_str(&payload).map_err(|_| "invalid-json")
        }
        _ => Err("invalid-argument-shape"),
    }
}

fn engine_command_contract_result(
    command: &'static str,
    input_result: Result<EngineContractInput, &'static str>,
) -> EngineCommandContractResult {
    let required_fields = required_fields_for_contract_command(command).unwrap_or(&[]);
    let missing_required_fields = input_result
        .as_ref()
        .map(|input| {
            required_fields
                .iter()
                .copied()
                .filter(|field| !contract_field_present(input, field))
                .collect::<Vec<_>>()
        })
        .unwrap_or_else(|_| required_fields.to_vec());
    let input_failure_class = input_result.err();
    let storage_required = !matches!(
        command,
        "safety-preview" | "redacted-support-diagnostics" | "profile-status"
    );
    let storage_runtime_available = full_runtime_compiled();
    let status = if input_failure_class.is_none()
        && missing_required_fields.is_empty()
        && (!storage_required || storage_runtime_available)
    {
        "contract-ready"
    } else {
        "rejected"
    };
    let failure_class = if let Some(failure_class) = input_failure_class {
        failure_class
    } else if !missing_required_fields.is_empty() {
        "missing-required-field"
    } else if storage_required && !storage_runtime_available {
        "storage-runtime-not-compiled"
    } else {
        "none"
    };
    let recovery_action = match failure_class {
        "none" => "continue",
        "missing-required-field" | "invalid-input-schema" | "invalid-json" => {
            "resubmit-redacted-json-contract-input"
        }
        "storage-runtime-not-compiled" => "prepare-full-engine-sidecar",
        "passphrase-requires-json-stdin" => "use-json-stdin",
        "invalid-argument-shape" => "use-json-stdin",
        "stdin-read-failed" => "retry-json-stdin",
        _ => "retry-with-redacted-contract-input",
    };

    EngineCommandContractResult {
        schema_version: "ad-engine-command-contract-result-v1",
        sidecar_protocol: SIDECAR_PROTOCOL,
        contract_version: CONTRACT_VERSION,
        command,
        runtime_mode: runtime_mode(),
        status,
        failure_class,
        recovery_action,
        input_schema: "ad-engine-command-input-v1",
        output_schema: "ad-engine-command-redacted-result-v1",
        required_fields,
        missing_required_fields,
        manual_e2ee_runtime_available: manual_e2ee_runtime_compiled(),
        storage_runtime_available,
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
    }
}

fn print_engine_command_contract(command: &'static str, args: &[String]) -> Result<(), String> {
    let input_result = read_contract_json_arg(args).and_then(contract_input_from_json);
    let result = engine_command_contract_result(command, input_result);
    let json = serde_json::to_string_pretty(&result)
        .map_err(|_| "failed to serialize engine command contract result".to_string())?;
    println!("{json}");
    Ok(())
}

fn help() -> &'static str {
    "another-dimension-engine status\n\nCommands:\n  status                         print redacted sidecar status JSON\n  manual-self-test               run local manual E2EE primitive self-test when compiled\n  profile-status                 validate redacted profile status command input\n  profile-unlock                 validate redacted profile unlock command input\n  pairing-export                 validate redacted pairing export command input\n  pairing-import                 validate redacted pairing import command input\n  safety-preview                 validate redacted safety preview command input\n  envelope-export                validate redacted envelope export command input\n  envelope-import                validate redacted envelope import command input\n  redacted-support-diagnostics   validate redacted support diagnostics command input\n\nContract commands accept no input, --json '<object>', or --json-stdin. Passphrase-bearing input must use --json-stdin. They never echo payloads, passphrases, local paths, keys, plaintext, ciphertext, invite codes, or endpoints."
}

fn main() {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let result = match args.as_slice() {
        [] => print_status(),
        [cmd] if cmd == "status" || cmd == "--status-json" => print_status(),
        [cmd, flag] if cmd == "status" && flag == "--json" => print_status(),
        [cmd] if cmd == "manual-self-test" => print_manual_e2ee_runtime_self_test(),
        [cmd, flag] if cmd == "manual-self-test" && flag == "--json" => {
            print_manual_e2ee_runtime_self_test()
        }
        [cmd, rest @ ..] if cmd == "profile-status" => {
            print_engine_command_contract("profile-status", rest)
        }
        [cmd, rest @ ..] if cmd == "profile-unlock" => {
            print_engine_command_contract("profile-unlock", rest)
        }
        [cmd, rest @ ..] if cmd == "pairing-export" => {
            print_engine_command_contract("pairing-export", rest)
        }
        [cmd, rest @ ..] if cmd == "pairing-import" => {
            print_engine_command_contract("pairing-import", rest)
        }
        [cmd, rest @ ..] if cmd == "safety-preview" => {
            print_engine_command_contract("safety-preview", rest)
        }
        [cmd, rest @ ..] if cmd == "envelope-export" => {
            print_engine_command_contract("envelope-export", rest)
        }
        [cmd, rest @ ..] if cmd == "envelope-import" => {
            print_engine_command_contract("envelope-import", rest)
        }
        [cmd, rest @ ..] if cmd == "redacted-support-diagnostics" => {
            print_engine_command_contract("redacted-support-diagnostics", rest)
        }
        [cmd] if cmd == "--help" || cmd == "-h" || cmd == "help" => {
            println!("{}", help());
            Ok(())
        }
        [cmd] if cmd == "--version" || cmd == "version" => {
            println!("{BINARY_NAME} 0.1.0 contract={CONTRACT_VERSION} protocol={SIDECAR_PROTOCOL}");
            Ok(())
        }
        _ => Err(format!("unsupported engine sidecar command\n\n{}", help())),
    };

    if let Err(error) = result {
        eprintln!("error: {error}");
        std::process::exit(2);
    }
}

#[cfg(test)]
mod tests {
    use super::{
        contract_input_from_json, engine_command_contract_result, engine_sidecar_status,
        read_contract_json_arg,
    };
    use serde_json::json;

    #[test]
    fn status_keeps_public_claims_closed_and_private_fields_absent() {
        let status = engine_sidecar_status();
        assert_eq!(status.schema_version, "ad-engine-sidecar-status-v1");
        assert_eq!(status.sidecar_protocol, "ad-engine-json-stdio-v1");
        assert_eq!(status.contract_version, 1);
        let expected_runtime_mode = if cfg!(feature = "full-runtime") {
            "full-engine-sidecar"
        } else if cfg!(feature = "manual-e2ee-runtime") {
            "manual-e2ee-engine-sidecar"
        } else {
            "contract-only-engine-sidecar"
        };
        assert_eq!(status.runtime_mode, expected_runtime_mode);
        assert_eq!(
            status.manual_e2ee_runtime_available,
            cfg!(feature = "manual-e2ee-runtime")
        );
        assert!(!status.onion_runtime_compiled);
        assert!(!status.app_launch_network_allowed);
        assert!(!status.room_open_network_allowed);
        assert!(status.redacted_diagnostics_only);
        assert!(!status.raw_local_path_returned);
        assert!(!status.key_material_exposed);
        assert!(!status.passphrase_exposed);
        assert!(status.runtime_result_external_peer_evidence_separated);
        assert!(!status.windows_public_artifact_ready);
        assert!(!status.windows_installer_ready);
        assert!(!status.public_artifact_upload_allowed);
        assert!(!status.production_ready_claim);
        assert!(!status.high_risk_claim);
        assert!(!status.sensitive_communication_allowed);
        assert!(status.supported_commands.contains(&"status"));
        assert!(status.supported_commands.contains(&"profile-status"));
        assert!(status.supported_commands.contains(&"profile-unlock"));
        assert!(status.supported_commands.contains(&"pairing-export"));
        assert!(status.supported_commands.contains(&"pairing-import"));
        assert!(status.supported_commands.contains(&"safety-preview"));
        assert!(status.supported_commands.contains(&"envelope-export"));
        assert!(status.supported_commands.contains(&"envelope-import"));
        assert!(status
            .supported_commands
            .contains(&"redacted-support-diagnostics"));
        assert!(status.forbidden_public_fields.contains(&"passphrases"));
        assert!(status.forbidden_public_fields.contains(&"key_material"));
    }

    #[test]
    fn contract_commands_reject_missing_inputs_without_exposing_private_fields() {
        let result = engine_command_contract_result(
            "profile-unlock",
            contract_input_from_json(json!({"profile_ref": "local-profile"})),
        );
        assert_eq!(
            result.schema_version,
            "ad-engine-command-contract-result-v1"
        );
        assert_eq!(result.sidecar_protocol, "ad-engine-json-stdio-v1");
        assert_eq!(result.contract_version, 1);
        assert_eq!(result.command, "profile-unlock");
        assert_eq!(result.status, "rejected");
        assert_eq!(result.failure_class, "missing-required-field");
        assert!(result.missing_required_fields.contains(&"passphrase"));
        assert!(!result.runtime_action_performed);
        assert!(!result.state_mutated);
        assert!(!result.artifact_written);
        assert!(!result.raw_local_path_returned);
        assert!(!result.raw_payload_returned);
        assert!(!result.plaintext_returned);
        assert!(!result.ciphertext_returned);
        assert!(!result.invite_code_returned);
        assert!(!result.endpoint_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.passphrase_exposed);
        assert!(!result.app_launch_network_allowed);
        assert!(!result.room_open_network_allowed);
        assert!(!result.production_ready_claim);
        assert!(!result.high_risk_claim);
        assert!(!result.sensitive_communication_allowed);
    }

    #[test]
    fn contract_commands_deny_unknown_fields_and_fail_closed() {
        let result = engine_command_contract_result(
            "pairing-export",
            contract_input_from_json(json!({
                "profile_ref": "local-profile",
                "passphrase": "secret",
                "rendezvous_endpoint_ref": "endpoint-handle",
                "raw_local_path": "/tmp/secret"
            })),
        );
        assert_eq!(result.status, "rejected");
        assert_eq!(result.failure_class, "invalid-input-schema");
        assert_eq!(
            result.recovery_action,
            "resubmit-redacted-json-contract-input"
        );
        assert!(!result.raw_local_path_returned);
        assert!(!result.passphrase_exposed);
        assert!(!result.endpoint_returned);
    }

    #[test]
    fn json_arg_rejects_passphrase_bearing_payloads() {
        let args = vec![
            "--json".to_string(),
            r#"{"profile_ref":"local-profile","passphrase":"do-not-use-argv"}"#.to_string(),
        ];
        assert_eq!(
            read_contract_json_arg(&args),
            Err("passphrase-requires-json-stdin")
        );
    }

    #[test]
    fn stateless_contract_commands_can_validate_without_storage_runtime() {
        let result = engine_command_contract_result(
            "safety-preview",
            contract_input_from_json(json!({
                "local_payload_ref": "local-payload-handle",
                "remote_payload_ref": "remote-payload-handle"
            })),
        );
        assert_eq!(result.status, "contract-ready");
        assert_eq!(result.failure_class, "none");
        assert!(!result.runtime_action_performed);
        assert!(!result.raw_payload_returned);
        assert!(!result.production_ready_claim);
        assert!(!result.high_risk_claim);
    }

    #[test]
    fn storage_backed_contract_commands_require_full_engine_runtime() {
        let result = engine_command_contract_result(
            "envelope-export",
            contract_input_from_json(json!({
                "profile_ref": "local-profile",
                "passphrase": "secret",
                "message_ref": "pending-message-handle"
            })),
        );
        let expected_status = if cfg!(feature = "full-runtime") {
            "contract-ready"
        } else {
            "rejected"
        };
        let expected_failure = if cfg!(feature = "full-runtime") {
            "none"
        } else {
            "storage-runtime-not-compiled"
        };
        assert_eq!(result.status, expected_status);
        assert_eq!(result.failure_class, expected_failure);
        assert_eq!(
            result.storage_runtime_available,
            cfg!(feature = "full-runtime")
        );
        assert!(!result.runtime_action_performed);
        assert!(!result.state_mutated);
        assert!(!result.plaintext_returned);
        assert!(!result.ciphertext_returned);
        assert!(!result.passphrase_exposed);
    }

    #[cfg(feature = "manual-e2ee-runtime")]
    #[test]
    fn manual_e2ee_runtime_self_test_uses_crypto_without_opening_claims() {
        let result = super::manual_e2ee_runtime_self_test().expect("manual e2ee self-test");
        assert_eq!(result.schema_version, "ad-engine-manual-e2ee-self-test-v1");
        assert!(result.manual_e2ee_runtime_available);
        assert!(result.pairing_payload_roundtrip);
        assert!(result.safety_transcript_bound);
        assert!(result.noise_handshake_roundtrip);
        assert!(result.envelope_roundtrip);
        assert!(result.replay_duplicate_rejected);
        assert!(!result.app_launch_network_allowed);
        assert!(!result.room_open_network_allowed);
        assert!(!result.plaintext_returned);
        assert!(!result.ciphertext_returned);
        assert!(!result.invite_code_returned);
        assert!(!result.endpoint_returned);
        assert!(!result.key_material_exposed);
        assert!(!result.passphrase_exposed);
        assert!(!result.production_ready_claim);
        assert!(!result.high_risk_claim);
        assert!(!result.sensitive_communication_allowed);
    }
}
