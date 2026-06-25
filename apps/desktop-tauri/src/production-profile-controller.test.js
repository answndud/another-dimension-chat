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
    productionPairingWarning: {},
    productionPairingNextAction: {},
    productionPairingSession: {},
    productionPairingBoundary: {},
    productionSessionLifecycle: {},
    productionMessageBoundary: {},
    productionMessageWarning: {},
    productionMessageNextAction: {},
    productionMessageOutbound: {},
    productionMessageInbound: {},
    productionMessageEnvelope: { value: "" },
    lockProductionProfile: { disabled: false },
    unlockProductionProfile: { disabled: false },
    productionProfileDeleteConfirmation: { value: "" },
    productionFullWipeConfirmation: { value: "" },
    productionEmergencyWipeConfirmation: { value: "" },
    productionSessionDeleteConfirmation: { value: "" },
    productionConversationDeleteConfirmation: { value: "" },
  };
  const calls = {
    states: [],
    busyActions: [],
    clearedBusyActions: [],
    highRiskReadiness: 0,
    clearMemory: 0,
    clearFields: 0,
    clearClipboard: 0,
    applyActionState: 0,
    latestUnlocked: [],
    latestStatus: [],
    failureReports: [],
    preflights: [],
    lifecycleRenders: [],
    resetProfile: 0,
    resetPairing: [],
    resetMessage: 0,
    rebuildGuidance: [],
    loadRetention: [],
    loadProfileList: 0,
    restoreSession: [],
    refreshTwoProfileSession: [],
    removedBodyClass: "",
    pairingStates: [],
    messageStates: [],
  };
  let currentProfileInput = options.profileInput ?? { profile: "alice", passphrase: "secret" };
  const invokeResults = options.invokeResults ?? new Map();
  const invoked = [];
  const controller = createProductionProfileController({
    fields,
    document: {
      body: {
        classList: {
          add: (className) => (calls.bodyClass = className),
          remove: (className) => {
            calls.removedBodyClass = className;
          },
        },
      },
    },
    invoke: async (cmd) => {
      invoked.push(cmd);
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
    productionProfileInput: () => currentProfileInput,
    productionTwoProfileInput: () => ({ profileA: "alice", profileB: "bob", passphrase: "room" }),
    productionPairingInput: () => currentProfileInput,
    productionPairingInputStillCurrent: () => true,
    productionProfileInputStillCurrent: (input) => options.staleAfterProductUnlock !== true && input === currentProfileInput,
    productionProfileUnlockView: () => ({
      storage: "profile storage opened",
      identity: "identity opened",
      boundary: "profile_unlock_boundary=true",
    }),
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
    productionPanicLockMitigationView: () => ({
      boundary: "panic_boundary=true",
      emergencyConfirmation: "EMERGENCY WIPE LOCAL DATA",
    }),
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
    setProductionBusyAction: (action) => calls.busyActions.push(action),
    clearProductionBusyAction: (action) => calls.clearedBusyActions.push(action),
    applyProductionActionState: () => {
      calls.applyActionState += 1;
    },
    rememberFailureSupportReport: (...args) => calls.failureReports.push(args),
    renderDataLifecycleDestructivePreflight: (action, preflightOptions) => {
      calls.preflights.push({ action, options: preflightOptions });
      return {
        warning: `preflight:${action}`,
        next: `next:${action}`,
      };
    },
    renderProductionDataLifecycleAction: (result, action) => {
      calls.lifecycleRenders.push({ result, action });
      return { next: `rendered:${action}`, boundary: `boundary:${action}` };
    },
    productionSessionLifecycleView: (result, options) => ({
      lifecycle: `session:${options.action}`,
      boundary: `session-boundary:${options.action}`,
    }),
    resetProductionProfileView: () => {
      calls.resetProfile += 1;
    },
    resetProductionPairingView: (resetOptions) => calls.resetPairing.push(resetOptions),
    resetProductionMessageView: () => {
      calls.resetMessage += 1;
    },
    applyPostDestructiveLifecycleRebuildGuidance: (...args) => calls.rebuildGuidance.push(args),
    rememberProductionSessionState: (...args) => {
      calls.sessionState = args;
    },
    setProductionPairingState: (value) => calls.pairingStates.push(value),
    setProductionMessageState: (value) => calls.messageStates.push(value),
    clearSavedInviteRoomConversationMetadataForProfile: () => true,
    clearActiveConversationStateAfterLocalDelete: () => true,
    resetProductionMessageTranscript: () => {
      calls.resetTranscript = (calls.resetTranscript ?? 0) + 1;
    },
    resetProductionMessageImportState: () => {
      calls.resetImport = (calls.resetImport ?? 0) + 1;
    },
    productionLocalLifecycleBoundaryView: (_result, options) => `boundary:${options.action}`,
    checkProductionSessionState: async (input) => {
      calls.checkSessionState = input;
    },
    loadProductionMessageRetentionPreference: async (...args) => calls.loadRetention.push(args),
    loadProductionProfileList: async () => {
      calls.loadProfileList += 1;
    },
    restoreProductionSessionAfterUnlock: async (input) => calls.restoreSession.push(input),
    refreshTwoProfileSessionAfterProfileUnlock: async (...args) => calls.refreshTwoProfileSession.push(args),
  });
  return {
    controller,
    fields,
    calls,
    invoked,
    setProfileInput: (input) => {
      currentProfileInput = input;
    },
  };
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

test("unlockProductionProfile runs profile unlock then restores only while input is current", async () => {
  const productUnlock = { unlocked: true, redacted_reason: "ok", warning: "product unlocked" };
  const profileUnlock = { warning: "profile unlocked" };
  const { controller, fields, calls, invoked } = createHarness({
    invokeResults: new Map([
      ["production_product_unlock", productUnlock],
      ["production_profile_unlock", profileUnlock],
    ]),
  });

  await controller.unlockProductionProfile();

  assert.deepEqual(invoked, ["production_product_unlock", "production_profile_unlock"]);
  assert.deepEqual(calls.busyActions, ["profile-unlock"]);
  assert.deepEqual(calls.clearedBusyActions, ["profile-unlock"]);
  assert.equal(fields.unlockProductionProfile.disabled, false);
  assert.equal(calls.removedBodyClass, "is-panic-locked");
  assert.equal(fields.productionProfileWarning.textContent, "profile unlocked");
  assert.equal(fields.productionProfileStorage.textContent, "profile storage opened");
  assert.equal(calls.loadRetention.length, 1);
  assert.equal(calls.loadProfileList, 1);
  assert.equal(calls.restoreSession.length, 1);
  assert.equal(calls.refreshTwoProfileSession.length, 1);
  assert.deepEqual(calls.refreshTwoProfileSession[0], ["alice", "secret", { profileA: "alice", profileB: "bob", passphrase: "room" }]);
});

test("unlockProductionProfile ignores stale profile input before restoring session", async () => {
  const { controller, calls, invoked } = createHarness({
    staleAfterProductUnlock: true,
    invokeResults: new Map([
      ["production_product_unlock", { unlocked: true, redacted_reason: "ok" }],
      ["production_profile_unlock", { warning: "profile unlocked" }],
    ]),
  });

  await controller.unlockProductionProfile();

  assert.deepEqual(invoked, ["production_product_unlock", "production_profile_unlock"]);
  assert.equal(calls.loadRetention.length, 0);
  assert.equal(calls.loadProfileList, 0);
  assert.equal(calls.restoreSession.length, 0);
  assert.equal(calls.refreshTwoProfileSession.length, 0);
  assert.deepEqual(calls.clearedBusyActions, ["profile-unlock"]);
});

test("deleteProductionProfile requires exact profile confirmation", async () => {
  const { controller, fields, calls, invoked } = createHarness();
  fields.productionProfileDeleteConfirmation.value = "wrong";

  const result = await controller.deleteProductionProfile();

  assert.equal(result, null);
  assert.deepEqual(invoked, []);
  assert.deepEqual(calls.states, ["Profile delete needs confirmation"]);
  assert.equal(fields.productionProfileWarning.textContent, "preflight:profile-delete");
  assert.equal(fields.productionProfileNextAction.textContent, "next:profile-delete");
  assert.deepEqual(calls.preflights[0], {
    action: "profile-delete",
    options: { confirmationMatched: false, profile: "alice" },
  });
});

test("deleteProductionProfile deletes then rebuilds local profile flow", async () => {
  const deleteResult = { profile_deleted: true, warning: "profile deleted" };
  const { controller, fields, calls, invoked } = createHarness({
    invokeResults: new Map([["production_profile_delete", deleteResult]]),
  });
  fields.productionProfileDeleteConfirmation.value = "alice";

  const result = await controller.deleteProductionProfile();

  assert.equal(result, deleteResult);
  assert.deepEqual(invoked, ["production_profile_delete", "production_product_unlock_status"]);
  assert.deepEqual(calls.busyActions, ["profile-delete"]);
  assert.deepEqual(calls.clearedBusyActions, ["profile-delete"]);
  assert.deepEqual(calls.lifecycleRenders, [{ result: deleteResult, action: "profile-delete" }]);
  assert.deepEqual(calls.resetPairing, [{ preserveTwoProfileStatus: true }]);
  assert.equal(calls.resetMessage, 1);
  assert.deepEqual(calls.rebuildGuidance[0], [
    "profile-delete",
    { deletedProfile: "alice", input: { profileA: "alice", profileB: "bob", passphrase: "room" } },
  ]);
  assert.equal(calls.loadProfileList, 1);
  assert.equal(fields.productionProfileWarning.textContent, "wrong passphrase");
});

test("wipeProductionLocalData resets profile pairing and message views after confirmation", async () => {
  const wipeResult = { full_local_data_wiped: true, warning: "wiped" };
  const { controller, fields, calls, invoked } = createHarness({
    invokeResults: new Map([["production_full_local_data_wipe", wipeResult]]),
  });
  fields.productionFullWipeConfirmation.value = "WIPE LOCAL DATA";

  const result = await controller.wipeProductionLocalData();

  assert.equal(result, wipeResult);
  assert.deepEqual(invoked, ["production_full_local_data_wipe", "production_product_unlock_status"]);
  assert.deepEqual(calls.busyActions, ["full-local-data-wipe"]);
  assert.deepEqual(calls.clearedBusyActions, ["full-local-data-wipe"]);
  assert.equal(calls.resetProfile, 1);
  assert.deepEqual(calls.resetPairing, [undefined]);
  assert.equal(calls.resetMessage, 1);
  assert.deepEqual(calls.lifecycleRenders, [{ result: wipeResult, action: "full-local-wipe" }]);
  assert.deepEqual(calls.rebuildGuidance[0], [
    "full-local-wipe",
    { input: { profileA: "alice", profileB: "bob", passphrase: "room" } },
  ]);
  assert.equal(calls.loadProfileList, 1);
  assert.equal(fields.productionProfileWarning.textContent, "wrong passphrase");
});

test("emergencyWipeProductionLocalData requires emergency confirmation", async () => {
  const { controller, fields, calls, invoked } = createHarness();
  fields.productionEmergencyWipeConfirmation.value = "wrong";

  const result = await controller.emergencyWipeProductionLocalData();

  assert.equal(result, null);
  assert.deepEqual(invoked, []);
  assert.deepEqual(calls.states, ["Emergency wipe needs confirmation"]);
  assert.equal(calls.clearMemory, 0);
  assert.equal(fields.productionProfileWarning.textContent, "Type EMERGENCY WIPE LOCAL DATA to run the separate emergency local wipe.");
  assert.equal(fields.productionProfileNextAction.textContent, "Next: confirm emergency local wipe.");
  assert.equal(fields.productionProfileBoundary.textContent, "panic_boundary=true");
});

test("emergencyWipeProductionLocalData clears sensitive state before emergency wipe", async () => {
  const wipeResult = { full_local_data_wiped: true, warning: "emergency wiped" };
  const { controller, fields, calls, invoked } = createHarness({
    invokeResults: new Map([["production_emergency_local_data_wipe", wipeResult]]),
  });
  fields.productionEmergencyWipeConfirmation.value = "EMERGENCY WIPE LOCAL DATA";

  const result = await controller.emergencyWipeProductionLocalData();

  assert.equal(result, wipeResult);
  assert.deepEqual(invoked, ["production_emergency_local_data_wipe"]);
  assert.equal(calls.clearMemory, 1);
  assert.equal(calls.clearFields, 1);
  assert.equal(calls.clearClipboard, 1);
  assert.deepEqual(calls.busyActions, ["emergency-local-data-wipe"]);
  assert.deepEqual(calls.clearedBusyActions, ["emergency-local-data-wipe"]);
  assert.equal(calls.bodyClass, "is-panic-locked");
  assert.equal(calls.resetProfile, 1);
  assert.deepEqual(calls.resetPairing, [undefined]);
  assert.equal(calls.resetMessage, 1);
  assert.deepEqual(calls.lifecycleRenders, [{ result: wipeResult, action: "emergency-local-wipe" }]);
  assert.deepEqual(calls.rebuildGuidance[0], [
    "full-local-wipe",
    { input: { profileA: "alice", profileB: "bob", passphrase: "room" } },
  ]);
  assert.equal(calls.loadProfileList, 1);
  assert.equal(fields.productionProfileWarning.textContent, "emergency wiped rendered:emergency-local-wipe");
  assert.equal(fields.productionProfileBoundary.textContent, "boundary:emergency-local-wipe panic_boundary=true");
});

test("checkProductionDataLifecycle renders status and clears busy state", async () => {
  const statusResult = { warning: "status ok" };
  const { controller, fields, calls, invoked } = createHarness({
    invokeResults: new Map([["production_data_lifecycle_status", statusResult]]),
  });

  const result = await controller.checkProductionDataLifecycle();

  assert.equal(result, statusResult);
  assert.deepEqual(invoked, ["production_data_lifecycle_status"]);
  assert.deepEqual(calls.busyActions, ["data-lifecycle"]);
  assert.deepEqual(calls.clearedBusyActions, ["data-lifecycle"]);
  assert.deepEqual(calls.lifecycleRenders, [{ result: statusResult, action: "status" }]);
  assert.deepEqual(calls.states, ["Data lifecycle checking", "Data lifecycle checked"]);
  assert.equal(fields.productionProfileWarning.textContent, "status ok");
  assert.equal(fields.productionProfileNextAction.textContent, "rendered:status");
});

test("prepareProductionDataLifecycle renders prepare flow and clears busy state", async () => {
  const prepareResult = { warning: "prepare ok" };
  const { controller, fields, calls, invoked } = createHarness({
    invokeResults: new Map([["production_data_lifecycle_prepare", prepareResult]]),
  });

  const result = await controller.prepareProductionDataLifecycle();

  assert.equal(result, prepareResult);
  assert.deepEqual(invoked, ["production_data_lifecycle_prepare"]);
  assert.deepEqual(calls.busyActions, ["data-lifecycle-prepare"]);
  assert.deepEqual(calls.clearedBusyActions, ["data-lifecycle-prepare"]);
  assert.deepEqual(calls.lifecycleRenders, [{ result: prepareResult, action: "prepare" }]);
  assert.deepEqual(calls.states, ["Data lifecycle preparing", "Data lifecycle prepared"]);
  assert.equal(fields.productionProfileWarning.textContent, "prepare ok");
  assert.equal(fields.productionProfileNextAction.textContent, "rendered:prepare");
});

test("deleteProductionSessionLifecycle requires exact confirmation", async () => {
  const { controller, fields, calls, invoked } = createHarness();
  fields.productionSessionDeleteConfirmation.value = "wrong";

  const result = await controller.deleteProductionSessionLifecycle();

  assert.equal(result, undefined);
  assert.deepEqual(invoked, []);
  assert.deepEqual(calls.pairingStates, ["Session delete needs confirmation"]);
  assert.equal(fields.productionPairingWarning.textContent, "preflight:session-delete");
  assert.equal(fields.productionPairingNextAction.textContent, "next:session-delete");
  assert.equal(fields.productionSessionLifecycle.textContent, undefined);
  assert.deepEqual(calls.preflights[0], {
    action: "session-delete",
    options: { confirmationMatched: false, profile: "alice" },
  });
});

test("deleteProductionSessionLifecycle deletes and rebuilds session flow", async () => {
  const deleteResult = { session_resume_closed: true, warning: "session deleted" };
  const { controller, fields, calls, invoked } = createHarness({
    invokeResults: new Map([["production_session_lifecycle_delete", deleteResult]]),
  });
  fields.productionSessionDeleteConfirmation.value = "DELETE SESSION";

  const result = await controller.deleteProductionSessionLifecycle();

  assert.equal(result, undefined);
  assert.deepEqual(invoked, ["production_session_lifecycle_delete"]);
  assert.deepEqual(calls.busyActions, ["session-lifecycle-delete"]);
  assert.deepEqual(calls.clearedBusyActions, ["session-lifecycle-delete"]);
  assert.deepEqual(calls.sessionState, [{ profile: "alice", passphrase: "secret" }, null]);
  assert.deepEqual(calls.rebuildGuidance[0], [
    "session-delete",
    { deletedProfile: "alice", input: { profileA: "alice", profileB: "bob", passphrase: "room" } },
  ]);
  assert.deepEqual(calls.pairingStates, ["Session lifecycle deleting", "Session lifecycle deleted"]);
  assert.equal(fields.productionPairingWarning.textContent, "session deleted");
  assert.equal(fields.productionPairingSession.textContent, "Local stored session no longer resumable");
  assert.equal(fields.productionSessionLifecycle.textContent, "session:session-delete");
  assert.equal(fields.productionPairingBoundary.textContent, "session-boundary:session-delete");
  assert.equal(fields.productionMessageBoundary.textContent, "session-boundary:session-delete");
  assert.deepEqual(calls.messageStates, ["Message flow idle"]);
});

test("deleteProductionConversation requires exact confirmation", async () => {
  const { controller, fields, calls, invoked } = createHarness();
  fields.productionConversationDeleteConfirmation.value = "wrong";

  const result = await controller.deleteProductionConversation();

  assert.equal(result, undefined);
  assert.deepEqual(invoked, []);
  assert.deepEqual(calls.messageStates, ["Conversation delete needs confirmation"]);
  assert.equal(fields.productionMessageWarning.textContent, "preflight:conversation-delete");
  assert.equal(fields.productionMessageNextAction.textContent, "next:conversation-delete");
  assert.equal(fields.productionMessageBoundary.textContent, undefined);
  assert.deepEqual(calls.preflights[0], {
    action: "conversation-delete",
    options: { confirmationMatched: false, profile: "alice" },
  });
});

test("deleteProductionConversation deletes conversation state and refreshes session view", async () => {
  const deleteResult = {
    sent_messages_deleted: 1,
    message_envelopes_deleted: 2,
    local_message_indexes_deleted: 3,
    message_counter_deleted: true,
    received_messages_deleted: 4,
    conversation_records_deleted: 5,
    session_records_preserved: true,
    warning: "conversation deleted",
  };
  const { controller, fields, calls, invoked } = createHarness({
    invokeResults: new Map([["production_conversation_delete", deleteResult]]),
  });
  fields.productionConversationDeleteConfirmation.value = "DELETE CONVERSATION";

  const result = await controller.deleteProductionConversation();

  assert.equal(result, undefined);
  assert.deepEqual(invoked, ["production_conversation_delete"]);
  assert.deepEqual(calls.busyActions, ["conversation-delete"]);
  assert.deepEqual(calls.clearedBusyActions, ["conversation-delete"]);
  assert.deepEqual(calls.resetTranscript, 1);
  assert.deepEqual(calls.resetImport, 1);
  assert.equal(fields.productionMessageEnvelope.value, "");
  assert.deepEqual(calls.messageStates, ["Conversation deleting", "Conversation deleted"]);
  assert.equal(fields.productionMessageWarning.textContent, "conversation deleted");
  assert.equal(fields.productionMessageOutbound.textContent, "sent_deleted=1 envelopes_deleted=2 indexes_deleted=3 counter_deleted=true");
  assert.equal(
    fields.productionMessageInbound.textContent,
    "received_deleted=4 total_records=5 session_preserved=true saved_rooms_cleared=true active_room_cleared=true",
  );
  assert.equal(fields.productionMessageBoundary.textContent, "boundary:conversation-delete");
  assert.deepEqual(calls.checkSessionState, { profile: "alice", passphrase: "secret" });
});
