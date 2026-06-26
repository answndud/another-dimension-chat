function fieldTestReportValue(value, fallback = "unknown") {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function engineSidecarDiagnosticsFallback(failureClass = "not-run") {
  return {
    statusRuntimeChecked: false,
    statusFailureClass: failureClass,
    statusContractValid: false,
    statusRedactedDiagnosticsOnly: false,
    statusRuntimeMode: "unknown",
    manualSelfTestRuntimeChecked: false,
    manualSelfTestFailureClass: failureClass,
    manualSelfTestContractValid: false,
    manualSelfTestPassed: false,
    manualSelfTestRuntimeAvailable: false,
    rawPathReturned: false,
    stdoutReturned: false,
    stderrReturned: false,
    appLaunchNetworkAllowed: false,
    roomOpenNetworkAllowed: false,
    localRuntimePromotedToDeliveryProof: false,
    contractRuntimeChecked: false,
    contractCommand: "redacted-support-diagnostics",
    contractStatus: "unknown",
    contractFailureClass: failureClass,
    contractRecoveryAction: "retry-with-redacted-contract-input",
    contractSchemaValid: false,
    contractRejected: false,
    contractRawPayloadReturned: false,
    contractRuntimeActionPerformed: false,
    contractStateMutated: false,
  };
}

function engineSidecarContractDiagnosticsFromProbe(contractProbe = {}) {
  const contractSchemaValid =
    contractProbe.schema_valid === true &&
    contractProbe.protocol_valid === true &&
    contractProbe.contract_version_valid === true &&
    contractProbe.command_valid === true &&
    contractProbe.input_schema_valid === true &&
    contractProbe.output_schema_valid === true;
  return {
    contractRuntimeChecked: contractProbe.attempted === true,
    contractCommand: fieldTestReportValue(contractProbe.command, "redacted-support-diagnostics"),
    contractStatus: fieldTestReportValue(contractProbe.status, "unknown"),
    contractFailureClass: fieldTestReportValue(contractProbe.failure_class, "unknown"),
    contractRecoveryAction: fieldTestReportValue(contractProbe.recovery_action, "unknown"),
    contractSchemaValid,
    contractRejected: contractProbe.status === "rejected",
    contractRawPayloadReturned: contractProbe.raw_payload_returned === true,
    contractRuntimeActionPerformed: contractProbe.runtime_action_performed === true,
    contractStateMutated: contractProbe.state_mutated === true,
  };
}

function engineSidecarDiagnosticsFromProbes(statusProbe = {}, manualSelfTestProbe = {}, contractProbe = {}) {
  const manualSelfTestPassed =
    manualSelfTestProbe.failure_class === "none" &&
    manualSelfTestProbe.pairing_payload_roundtrip === true &&
    manualSelfTestProbe.safety_transcript_bound === true &&
    manualSelfTestProbe.noise_handshake_roundtrip === true &&
    manualSelfTestProbe.envelope_roundtrip === true &&
    manualSelfTestProbe.replay_duplicate_rejected === true &&
    manualSelfTestProbe.plaintext_returned !== true &&
    manualSelfTestProbe.key_material_exposed !== true &&
    manualSelfTestProbe.passphrase_exposed !== true;
  return {
    statusRuntimeChecked: statusProbe.attempted === true,
    statusFailureClass: fieldTestReportValue(statusProbe.failure_class, "unknown"),
    statusContractValid:
      statusProbe.schema_valid === true &&
      statusProbe.protocol_valid === true &&
      statusProbe.contract_version_valid === true,
    statusRedactedDiagnosticsOnly: statusProbe.redacted_diagnostics_only === true,
    statusRuntimeMode: fieldTestReportValue(statusProbe.runtime_mode, "unknown"),
    manualSelfTestRuntimeChecked: manualSelfTestProbe.attempted === true,
    manualSelfTestFailureClass: fieldTestReportValue(manualSelfTestProbe.failure_class, "unknown"),
    manualSelfTestContractValid:
      manualSelfTestProbe.schema_valid === true &&
      manualSelfTestProbe.protocol_valid === true &&
      manualSelfTestProbe.contract_version_valid === true,
    manualSelfTestPassed,
    manualSelfTestRuntimeAvailable: manualSelfTestProbe.manual_e2ee_runtime_available === true,
    rawPathReturned:
      statusProbe.raw_local_path_returned === true ||
      statusProbe.sidecar_path_returned === true ||
      manualSelfTestProbe.sidecar_path_returned === true,
    stdoutReturned: statusProbe.stdout_returned === true || manualSelfTestProbe.stdout_returned === true,
    stderrReturned: statusProbe.stderr_returned === true || manualSelfTestProbe.stderr_returned === true,
    appLaunchNetworkAllowed:
      statusProbe.app_launch_network_allowed === true || manualSelfTestProbe.app_launch_network_allowed === true,
    roomOpenNetworkAllowed:
      statusProbe.room_open_network_allowed === true || manualSelfTestProbe.room_open_network_allowed === true,
    localRuntimePromotedToDeliveryProof: false,
    ...engineSidecarContractDiagnosticsFromProbe(contractProbe),
  };
}

export function createEngineSidecarDiagnosticsController(input) {
  let latestEngineSidecarDiagnostics = engineSidecarDiagnosticsFallback();

  async function updateEngineSidecarDiagnostics() {
    if (!input.hasTauriRuntimeBridge()) {
      latestEngineSidecarDiagnostics = engineSidecarDiagnosticsFallback("tauri-unavailable");
      return latestEngineSidecarDiagnostics;
    }
    try {
      const [statusProbe, manualSelfTestProbe, contractProbe] = await Promise.all([
        input.invoke("engine_sidecar_status"),
        input.invoke("engine_sidecar_manual_self_test"),
        input.invoke("engine_sidecar_contract_command", {
          command: "redacted-support-diagnostics",
          input: { diagnostics_ref: "public-beta-diagnostics" },
        }),
      ]);
      latestEngineSidecarDiagnostics = engineSidecarDiagnosticsFromProbes(statusProbe, manualSelfTestProbe, contractProbe);
    } catch {
      latestEngineSidecarDiagnostics = engineSidecarDiagnosticsFallback("sidecar-command-unavailable");
    }
    return latestEngineSidecarDiagnostics;
  }

  function engineSidecarDiagnosticReportLines(diagnostics = latestEngineSidecarDiagnostics) {
    return [
      `engine_sidecar_status_runtime_checked=${diagnostics.statusRuntimeChecked === true}`,
      `engine_sidecar_status_failure_class=${fieldTestReportValue(diagnostics.statusFailureClass, "unknown")}`,
      `engine_sidecar_status_contract_valid=${diagnostics.statusContractValid === true}`,
      `engine_sidecar_status_redacted_diagnostics_only=${diagnostics.statusRedactedDiagnosticsOnly === true}`,
      `engine_sidecar_status_runtime_mode=${fieldTestReportValue(diagnostics.statusRuntimeMode, "unknown")}`,
      `engine_sidecar_manual_self_test_runtime_checked=${diagnostics.manualSelfTestRuntimeChecked === true}`,
      `engine_sidecar_manual_self_test_failure_class=${fieldTestReportValue(
        diagnostics.manualSelfTestFailureClass,
        "unknown",
      )}`,
      `engine_sidecar_manual_self_test_contract_valid=${diagnostics.manualSelfTestContractValid === true}`,
      `engine_sidecar_manual_self_test_passed=${diagnostics.manualSelfTestPassed === true}`,
      `engine_sidecar_manual_self_test_runtime_available=${diagnostics.manualSelfTestRuntimeAvailable === true}`,
      `engine_sidecar_raw_path_returned=${diagnostics.rawPathReturned === true}`,
      `engine_sidecar_stdout_returned=${diagnostics.stdoutReturned === true}`,
      `engine_sidecar_stderr_returned=${diagnostics.stderrReturned === true}`,
      `engine_sidecar_app_launch_network_allowed=${diagnostics.appLaunchNetworkAllowed === true}`,
      `engine_sidecar_room_open_network_allowed=${diagnostics.roomOpenNetworkAllowed === true}`,
      `engine_sidecar_local_runtime_promoted_to_delivery_proof=${
        diagnostics.localRuntimePromotedToDeliveryProof === true
      }`,
      `engine_sidecar_contract_runtime_checked=${diagnostics.contractRuntimeChecked === true}`,
      `engine_sidecar_contract_command=${fieldTestReportValue(
        diagnostics.contractCommand,
        "redacted-support-diagnostics",
      )}`,
      `engine_sidecar_contract_status=${fieldTestReportValue(diagnostics.contractStatus, "unknown")}`,
      `engine_sidecar_contract_failure_class=${fieldTestReportValue(diagnostics.contractFailureClass, "unknown")}`,
      `engine_sidecar_contract_recovery_action=${fieldTestReportValue(
        diagnostics.contractRecoveryAction,
        "unknown",
      )}`,
      `engine_sidecar_contract_schema_valid=${diagnostics.contractSchemaValid === true}`,
      `engine_sidecar_contract_rejected=${diagnostics.contractRejected === true}`,
      `engine_sidecar_contract_raw_payload_returned=${diagnostics.contractRawPayloadReturned === true}`,
      `engine_sidecar_contract_runtime_action_performed=${diagnostics.contractRuntimeActionPerformed === true}`,
      `engine_sidecar_contract_state_mutated=${diagnostics.contractStateMutated === true}`,
    ];
  }

  return {
    updateEngineSidecarDiagnostics,
    engineSidecarDiagnosticReportLines,
    getLatestEngineSidecarDiagnostics: () => latestEngineSidecarDiagnostics,
  };
}
