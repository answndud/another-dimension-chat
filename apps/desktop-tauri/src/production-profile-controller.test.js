import assert from "node:assert/strict";
import test from "node:test";
import { createProductionProfileController } from "./production-profile-controller.js";

function createHarness(options = {}) {
  const fields = {
    productionProductUnlockState: {},
    productionProfileBoundary: {},
    productionProfileNextAction: {},
    productionProfileWarning: {},
    productionProfileStorage: {},
    productionProfileIdentity: {},
    lockProductionProfile: { disabled: false },
  };
  const calls = {
    states: [],
    highRiskReadiness: 0,
    clearMemory: 0,
    clearFields: 0,
    clearClipboard: 0,
    applyActionState: 0,
    latestUnlocked: [],
    latestStatus: [],
  };
  const invokeResults = options.invokeResults ?? new Map();
  const controller = createProductionProfileController({
    fields,
    document: { body: { classList: { add: (className) => (calls.bodyClass = className) } } },
    invoke: async (cmd) => {
      if (options.invokeError) {
        throw options.invokeError;
      }
      return invokeResults.get(cmd) ?? { unlocked: false, redacted_reason: "locked" };
    },
    setText: (node, value) => {
      if (node) {
        node.textContent = value;
      }
    },
    setProductionProfileState: (value) => calls.states.push(value),
    redactedUiErrorMessage: (kind) => `redacted:${kind}`,
    t: (key) => `t:${key}`,
    productionProfileUnlockRecoveryView: () => ({
      kind: "wrong-passphrase",
      warning: "wrong passphrase",
      nextAction: "retry unlock",
      boundary: "profile_recovery_boundary=true",
    }),
    productionProfileRecoveryActionsView: () => ({
      primaryNextAction: "retry with passphrase",
      boundary: "recovery_actions=true",
    }),
    productionProfileUnlockView: () => ({}),
    productionPanicLockMitigationView: () => ({ boundary: "panic_boundary=true" }),
    setLatestProductionProfileUnlocked: (value) => calls.latestUnlocked.push(value),
    setLatestProductionProductUnlockStatus: (value) => calls.latestStatus.push(value),
    getProductionBusyAction: () => options.busyAction ?? null,
    renderHighRiskReadinessStatus: () => {
      calls.highRiskReadiness += 1;
    },
    clearProductionSensitiveMemoryState: () => {
      calls.clearMemory += 1;
    },
    clearProductionSensitiveFields: () => {
      calls.clearFields += 1;
    },
    clearClipboardBestEffort: async () => {
      calls.clearClipboard += 1;
      return true;
    },
    applyProductionActionState: () => {
      calls.applyActionState += 1;
    },
  });
  return { controller, fields, calls };
}

test("renderProductionProductUnlockStatus updates redacted unlock status and lock control", () => {
  const { controller, fields, calls } = createHarness();

  const unlocked = controller.renderProductionProductUnlockStatus({
    unlocked: true,
    profile: "alice",
    redacted_reason: "ok",
    key_policy_status: "ready",
    rollback_suspicion_detected: false,
    idle_auto_lock_seconds: 30,
    passphrase_first: true,
    os_keystore_only_rejected: true,
    production_key_management_ready: true,
    rollback_marker_present: true,
    rollback_detection_ready: true,
    rollback_resume_blocked: false,
    store_path_returned: false,
    passphrase_retained: false,
    key_material_exposed: false,
    raw_storage_error_exposed: false,
    runtime_messaging_enabled: true,
  });

  assert.equal(unlocked, true);
  assert.deepEqual(calls.latestUnlocked, [true]);
  assert.equal(fields.lockProductionProfile.disabled, false);
  assert.match(fields.productionProductUnlockState.textContent, /unlocked=true profile=alice reason=ok/);
  assert.match(fields.productionProfileBoundary.textContent, /passphrase_first=true/);
  assert.match(fields.productionProfileBoundary.textContent, /store_path_returned=false/);
  assert.equal(calls.highRiskReadiness, 1);
});

test("locked recovery view separates rollback and manual lock states", () => {
  const { controller } = createHarness();

  assert.deepEqual(
    controller.productionProductUnlockRecoveryView({
      unlocked: false,
      redacted_reason: "rollback",
      rollback_suspicion_detected: true,
      rollback_detection_ready: true,
    }),
    {
      state: "Profile locked",
      warning: "t:profileRecoveryRollbackBlocked",
      storage: "Locked reason=rollback local_recovery=check-data-lifecycle",
      identity: "Not opened; saved-room resume blocked",
      next: "t:profileRecoveryRollbackBlockedNext",
      boundary:
        "local_only=true passphrase_first=false os_keychain_fallback=false os_keystore_only_rejected=false backup_recovery=false cloud_backup_sync=false rollback_detection=true rollback_prevention=false secure_delete_claim=false security_ready=false passphrase_retained=false key_material=false raw_error=false recovery=rollback-suspicion rollback_suspicion=true resume_blocked=true",
    },
  );

  const manual = controller.productionProductUnlockRecoveryView(
    { unlocked: false, redacted_reason: "user" },
    { lockedByUser: true },
  );
  assert.equal(manual.state, "Profile locked");
  assert.equal(manual.storage, "Locked reason=user local_recovery=unlock-with-passphrase");
  assert.match(manual.boundary, /recovery=manual-lock/);
});

test("lockProductionProfile renders manual lock recovery result", async () => {
  const result = { unlocked: false, redacted_reason: "locked", warning: "locked by user" };
  const { controller, fields, calls } = createHarness({
    invokeResults: new Map([["production_product_lock", result]]),
  });

  const returned = await controller.lockProductionProfile();

  assert.equal(returned, result);
  assert.deepEqual(calls.states, ["Profile locked"]);
  assert.equal(fields.productionProfileWarning.textContent, "locked by user");
  assert.equal(fields.productionProfileStorage.textContent, "Locked reason=locked local_recovery=unlock-with-passphrase");
  assert.equal(fields.productionProfileIdentity.textContent, "Locked locally");
});

test("panicLockProductionProfile clears sensitive UI before best-effort runtime lock", async () => {
  const { controller, fields, calls } = createHarness({
    invokeResults: new Map([["production_product_lock", { unlocked: false, redacted_reason: "panic" }]]),
  });

  await controller.panicLockProductionProfile();

  assert.equal(calls.clearMemory, 1);
  assert.equal(calls.clearFields, 1);
  assert.equal(calls.clearClipboard, 1);
  assert.equal(calls.applyActionState, 1);
  assert.equal(calls.bodyClass, "is-panic-locked");
  assert.deepEqual(calls.states, ["Panic lock active"]);
  assert.equal(fields.productionProfileWarning.textContent, "Private views hidden and local memory state cleared.");
  assert.match(fields.productionProfileBoundary.textContent, /passphrase_first=false/);
  assert.match(fields.productionProfileBoundary.textContent, /store_path_returned=false/);
});
