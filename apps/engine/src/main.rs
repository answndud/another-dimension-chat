use another_dimension_core::production::production_windows_public_artifact_candidate_summary;
use serde::Serialize;

const SCHEMA_VERSION: &str = "ad-engine-sidecar-status-v1";
const SIDECAR_PROTOCOL: &str = "ad-engine-json-stdio-v1";
const CONTRACT_VERSION: u16 = 1;
const BINARY_NAME: &str = "another-dimension-engine";

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

fn engine_sidecar_status() -> EngineSidecarStatus {
    let windows_artifact = production_windows_public_artifact_candidate_summary();
    EngineSidecarStatus {
        schema_version: SCHEMA_VERSION,
        sidecar_protocol: SIDECAR_PROTOCOL,
        contract_version: CONTRACT_VERSION,
        binary_name: BINARY_NAME,
        runtime_mode: "manual-e2ee-engine-sidecar",
        manual_e2ee_runtime_available: true,
        onion_runtime_compiled: false,
        app_launch_network_allowed: false,
        room_open_network_allowed: false,
        redacted_diagnostics_only: true,
        raw_local_path_returned: false,
        key_material_exposed: false,
        passphrase_exposed: false,
        runtime_result_external_peer_evidence_separated: windows_artifact
            .runtime_result_external_peer_evidence_separated(),
        windows_public_artifact_ready: windows_artifact.windows_public_artifact_ready(),
        windows_installer_ready: windows_artifact.windows_installer_ready(),
        public_artifact_upload_allowed: windows_artifact.windows_public_artifact_upload_allowed(),
        production_ready_claim: false,
        high_risk_claim: false,
        sensitive_communication_allowed: false,
        supported_commands: &["status"],
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

fn print_status() -> Result<(), String> {
    let status = engine_sidecar_status();
    let json = serde_json::to_string_pretty(&status)
        .map_err(|_| "failed to serialize engine sidecar status".to_string())?;
    println!("{json}");
    Ok(())
}

fn help() -> &'static str {
    "another-dimension-engine status\n\nCommands:\n  status    print redacted sidecar status JSON"
}

fn main() {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let result = match args.as_slice() {
        [] => print_status(),
        [cmd] if cmd == "status" || cmd == "--status-json" => print_status(),
        [cmd, flag] if cmd == "status" && flag == "--json" => print_status(),
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
    use super::engine_sidecar_status;

    #[test]
    fn status_keeps_public_claims_closed_and_private_fields_absent() {
        let status = engine_sidecar_status();
        assert_eq!(status.schema_version, "ad-engine-sidecar-status-v1");
        assert_eq!(status.sidecar_protocol, "ad-engine-json-stdio-v1");
        assert_eq!(status.contract_version, 1);
        assert!(status.manual_e2ee_runtime_available);
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
        assert!(status.forbidden_public_fields.contains(&"passphrases"));
        assert!(status.forbidden_public_fields.contains(&"key_material"));
    }
}
