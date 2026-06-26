import assert from "node:assert/strict";
import test from "node:test";

import { createOnionRuntimeController } from "./onion-runtime-controller.js";

test("launch preflight stays fail-closed on stale profile input", async () => {
  const calls = [];
  const fields = { onionLaunchPreflightBoundary: { text: "" }, checkOnionLaunchPreflight: { disabled: false } };
  const controller = createOnionRuntimeController({
    productionProfileInput: () => ({ profile: "alice", passphrase: "pw" }),
    productionProfileInputStillCurrent: () => false,
    productionTwoProfileInput: () => ({}),
    twoProfileTranscriptInputStillCurrent: () => true,
    manualNetworkPermissionEnabled: () => false,
    openPrivateDeliverySettings: () => {},
    setProductionTwoProfileState: (value) => calls.push(["state", value]),
    setOnionLaunchPreflightState: (value) => calls.push(["preflight", value]),
    setProductionPairingState: () => {},
    setText: (field, value) => {
      field.text = value;
      calls.push(["text", value]);
    },
    fields,
    invoke: async (name) => {
      calls.push(["invoke", name]);
      return {};
    },
    applyProductionActionState: () => calls.push(["apply"]),
    setProductionBusyAction: () => {},
    clearProductionBusyAction: () => {},
    productionPairingInput: () => ({}),
    productionPairingInputStillCurrent: () => true,
  });

  await controller.checkOnionLaunchPreflight();

  assert.deepEqual(calls, [
    ["preflight", "Launch preflight running"],
    ["text", "Checking launch preflight guards without starting Tor or publishing a descriptor."],
    ["invoke", "production_onion_launch_preflight_check"],
  ]);
  assert.equal(fields.checkOnionLaunchPreflight.disabled, false);
});

test("launch endpoint exports pairing only when endpoint and pairing input are current", async () => {
  const calls = [];
  const fields = {
    productionTwoProfileWarning: { text: "" },
    productionTwoProfileProfiles: { text: "" },
    productionTwoProfileSession: { text: "" },
    productionTwoProfileMessageState: { text: "" },
    productionTwoProfileBoundary: { text: "" },
    launchProductionTwoProfileOnionEndpoint: { disabled: false },
    productionPairingEndpoint: { value: "", dispatchEvent: () => calls.push(["dispatch", "endpoint"]) },
    productionProfileName: { value: "", dispatchEvent: () => calls.push(["dispatch", "name"]) },
    productionProfileSelector: { value: "" },
    productionPairingWarning: { text: "" },
    productionPairingSession: { text: "" },
  };
  const controller = createOnionRuntimeController({
    productionProfileInput: () => ({ profile: "alice", passphrase: "pw" }),
    productionProfileInputStillCurrent: () => true,
    productionTwoProfileInput: () => ({ profileA: "alice", passphrase: "pw" }),
    twoProfileTranscriptInputStillCurrent: () => true,
    manualNetworkPermissionEnabled: () => true,
    openPrivateDeliverySettings: () => {},
    setProductionTwoProfileState: (value) => calls.push(["state", value]),
    setOnionLaunchPreflightState: () => {},
    setProductionPairingState: (value) => calls.push(["pairing-state", value]),
    setText: (field, value) => {
      field.text = value;
      calls.push(["text", value]);
    },
    fields,
    invoke: async (name, payload) => {
      calls.push(["invoke", name, payload]);
      if (name === "production_onion_service_launch_attempt") {
        return {
          manual_client_attempt_feature_compiled: true,
          manual_network_permission_enabled: true,
          profile_transport_unlock_ready: true,
          backup_exclusion_verified: true,
          key_record_present: true,
          key_material_ready: true,
          persistent_client_ready: true,
          launch_preflight_ready: true,
          launch_adapter_ready: true,
          launch_attempt_started: true,
          launch_attempt_succeeded: true,
          onion_service_retained: true,
          onion_endpoint_returned: "onion://alice",
          redacted_launch_result_event_recorded: true,
          event_summary: ["launch"],
          next_blocker: "none",
          blockers: [],
          raw_path_returned: false,
          onion_secret_returned: false,
          descriptor_body_returned: false,
          key_material_exposed: false,
          network_io_attempted: false,
          descriptor_publish_attempted: false,
          transport_io_opened: false,
          runtime_messaging_enabled: true,
          warning: "ok",
        };
      }
      if (name === "production_pairing_payload_export") {
        return { pairing_payload: "payload", pairing_payload_exported: true };
      }
      throw new Error(`unexpected ${name}`);
    },
    applyProductionActionState: () => calls.push(["apply"]),
    setProductionBusyAction: (value) => calls.push(["busy", value]),
    clearProductionBusyAction: (value) => calls.push(["clear", value]),
    productionPairingInput: () => ({ token: "pairing" }),
    productionPairingInputStillCurrent: () => true,
  });

  await controller.launchProductionTwoProfileOnionEndpoint();

  assert.equal(fields.launchProductionTwoProfileOnionEndpoint.disabled, false);
  assert.deepEqual(calls.slice(0, 4), [
    ["busy", "two-profile-onion-endpoint-launch"],
    ["state", "Onion endpoint launch running"],
    ["text", "Launching local onion endpoint for profile A."],
    ["text", "local_profile=alice"],
  ]);
  assert.ok(calls.some((entry) => entry[1] === "production_onion_service_launch_attempt"));
});
