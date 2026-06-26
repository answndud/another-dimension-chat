import assert from "node:assert/strict";
import test from "node:test";
import { createEngineSidecarDiagnosticsController } from "./engine-sidecar-diagnostics-controller.js";

function createController(overrides = {}) {
  const calls = [];
  return {
    calls,
    controller: createEngineSidecarDiagnosticsController({
      hasTauriRuntimeBridge: () => true,
      invoke: async (command, input) => {
        calls.push([command, input]);
        if (command === "engine_sidecar_status") {
          return overrides.statusProbe ?? { attempted: true, failure_class: "none", schema_valid: true, protocol_valid: true, contract_version_valid: true, runtime_mode: "release" };
        }
        if (command === "engine_sidecar_manual_self_test") {
          return overrides.manualSelfTestProbe ?? {
            attempted: true,
            failure_class: "none",
            schema_valid: true,
            protocol_valid: true,
            contract_version_valid: true,
            pairing_payload_roundtrip: true,
            safety_transcript_bound: true,
            noise_handshake_roundtrip: true,
            envelope_roundtrip: true,
            replay_duplicate_rejected: true,
            plaintext_returned: false,
            key_material_exposed: false,
            passphrase_exposed: false,
            manual_e2ee_runtime_available: true,
          };
        }
        if (command === "engine_sidecar_contract_command") {
          return overrides.contractProbe ?? {
            attempted: true,
            command: "redacted-support-diagnostics",
            status: "accepted",
            failure_class: "none",
            recovery_action: "none",
            schema_valid: true,
            protocol_valid: true,
            contract_version_valid: true,
            command_valid: true,
            input_schema_valid: true,
            output_schema_valid: true,
            raw_payload_returned: false,
            runtime_action_performed: false,
            state_mutated: false,
          };
        }
        throw new Error(`unexpected command ${command}`);
      },
    }),
  };
}

test("engine sidecar diagnostics default to redacted fallback when tauri is unavailable", async () => {
  const controller = createEngineSidecarDiagnosticsController({
    hasTauriRuntimeBridge: () => false,
    invoke: async () => {
      throw new Error("should not call invoke");
    },
  });

  const diagnostics = await controller.updateEngineSidecarDiagnostics();

  assert.equal(diagnostics.statusFailureClass, "tauri-unavailable");
  assert.equal(diagnostics.contractFailureClass, "tauri-unavailable");
  assert.equal(diagnostics.rawPathReturned, false);
  assert.equal(diagnostics.stdoutReturned, false);
  assert.equal(diagnostics.stderrReturned, false);
  assert.match(controller.engineSidecarDiagnosticReportLines(diagnostics).join("\n"), /engine_sidecar_status_runtime_checked=false/);
});

test("engine sidecar diagnostics mark raw sidecar output as redacted and keep contract state scoped", async () => {
  const { controller, calls } = createController({
    statusProbe: {
      attempted: true,
      failure_class: "none",
      schema_valid: true,
      protocol_valid: true,
      contract_version_valid: true,
      redacted_diagnostics_only: true,
      runtime_mode: "release",
      raw_local_path_returned: true,
      stdout_returned: true,
      stderr_returned: true,
      app_launch_network_allowed: false,
      room_open_network_allowed: false,
    },
    manualSelfTestProbe: {
      attempted: true,
      failure_class: "none",
      schema_valid: true,
      protocol_valid: true,
      contract_version_valid: true,
      pairing_payload_roundtrip: true,
      safety_transcript_bound: true,
      noise_handshake_roundtrip: true,
      envelope_roundtrip: true,
      replay_duplicate_rejected: true,
      plaintext_returned: false,
      key_material_exposed: false,
      passphrase_exposed: false,
      sidecar_path_returned: true,
      stdout_returned: false,
      stderr_returned: false,
      manual_e2ee_runtime_available: true,
      app_launch_network_allowed: true,
    },
    contractProbe: {
      attempted: true,
      command: "redacted-support-diagnostics",
      status: "rejected",
      failure_class: "blocked",
      recovery_action: "retry-with-redacted-contract-input",
      schema_valid: true,
      protocol_valid: true,
      contract_version_valid: true,
      command_valid: true,
      input_schema_valid: true,
      output_schema_valid: true,
      raw_payload_returned: true,
      runtime_action_performed: false,
      state_mutated: false,
    },
  });

  const diagnostics = await controller.updateEngineSidecarDiagnostics();

  assert.deepEqual(calls.map(([command]) => command), [
    "engine_sidecar_status",
    "engine_sidecar_manual_self_test",
    "engine_sidecar_contract_command",
  ]);
  assert.equal(diagnostics.statusRedactedDiagnosticsOnly, true);
  assert.equal(diagnostics.rawPathReturned, true);
  assert.equal(diagnostics.stdoutReturned, true);
  assert.equal(diagnostics.stderrReturned, true);
  assert.equal(diagnostics.manualSelfTestPassed, true);
  assert.equal(diagnostics.contractRejected, true);
  assert.equal(diagnostics.contractRawPayloadReturned, true);
  assert.match(controller.engineSidecarDiagnosticReportLines(diagnostics).join("\n"), /engine_sidecar_contract_failure_class=blocked/);
  assert.match(controller.engineSidecarDiagnosticReportLines(diagnostics).join("\n"), /engine_sidecar_contract_raw_payload_returned=true/);
});
