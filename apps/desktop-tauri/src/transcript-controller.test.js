import assert from "node:assert/strict";
import test from "node:test";
import { createTranscriptController } from "./transcript-controller.js";

function createHarness(overrides = {}) {
  const calls = {
    setState: [],
    setText: [],
    applyProductionActionState: 0,
    clearProductionBusyAction: [],
    rememberTwoProfileSessionStatus: [],
    renderSessionStatus: [],
    renderTranscriptEntries: [],
    reconcileMetadata: [],
    renderMemory: 0,
    autoSelectPending: 0,
    setInterval: [],
    clearInterval: [],
    invoke: [],
    invokeResumeStatus: [],
    invokeSessionStatus: [],
    clearLatestSessionStatus: 0,
  };
  let productionBusyAction = null;
  const input = {
    profileA: "alice",
    profileB: "bob",
    passphrase: "room-1",
  };
  const fields = {
    productionTwoProfileWarning: {},
    productionPairingWarning: {},
    productionTwoProfileTranscriptExport: { value: "" },
  };
  const windowStub = {
    setInterval(fn, ms) {
      const handle = { fn, ms };
      calls.setInterval.push(handle);
      return handle;
    },
    clearInterval(handle) {
      calls.clearInterval.push(handle);
    },
  };
  const controller = createTranscriptController({
    currentLanguage: "en",
    productionTwoProfileInput: () => input,
    twoProfileRoomIdentityInput: (value) => ({
      ...value,
      connectionCode: value.passphrase,
      inviteRole: "inviter",
    }),
    setProductionTwoProfileState: (value) => calls.setState.push(value),
    setText: (field, value) => calls.setText.push({ field, value }),
    fields,
    setProductionBusyAction: (value) => {
      productionBusyAction = value;
    },
    clearProductionBusyAction: (value) => {
      calls.clearProductionBusyAction.push(value);
      if (productionBusyAction === value) {
        productionBusyAction = null;
      }
    },
    applyProductionActionState: () => {
      calls.applyProductionActionState += 1;
    },
    redactedUiErrorMessage: (scope) => `redacted:${scope}`,
    invokeTwoProfileRuntimeResumeStatus: async ({ profileA, profileB, passphrase }) => {
      calls.invokeResumeStatus.push({ profileA, profileB, passphrase });
      return {
        profile_a_transcript: { entries: [{ id: "a1" }], expired_messages_purged: 1 },
        profile_b_transcript: { entries: [{ id: "b1" }], expired_messages_purged: 2 },
        session_status: {
          both_ready_for_message_envelope: true,
          warning: "session ok",
        },
      };
    },
    runtimeResumeRollbackBlocked: () => false,
    applyRuntimeResumeRollbackRecovery: () => {},
    invoke: async (command, payload) => {
      calls.invoke.push({ command, payload });
      return { entries: [], expired_messages_purged: 0 };
    },
    twoProfileTranscriptEntriesFromProfile: (local, peer, entries) =>
      (entries ?? []).map((entry) => ({ ...entry, local, peer })),
    twoProfileTranscriptInputStillCurrent: () => true,
    latestTwoProfileSessionStatusForCurrentInput: () => ({
      both_ready_for_message_envelope: true,
      warning: "latest",
    }),
    rememberTwoProfileSessionStatus: (roomInput, status) => {
      calls.rememberTwoProfileSessionStatus.push({ roomInput, status });
    },
    renderProductionTwoProfileSessionStatusResult: (status) => {
      calls.renderSessionStatus.push(status);
    },
    combinedTwoProfileTranscriptTsv: () => "tsv",
    renderProductionTwoProfileTranscriptEntries: (entries, roomInput) => {
      calls.renderTranscriptEntries.push({ entries, roomInput });
      return 4;
    },
    reconcileCurrentInviteRoomMetadataFromTranscriptEntries: (entries, options) => {
      calls.reconcileMetadata.push({ entries, options });
    },
    refreshRouteReadinessNoticeAfterSessionRefresh: () => false,
    clearStaleSendRecoveryNotice: () => {},
    appendExpiredMessagesPurged: (message, count) => `${message} expired:${count}`,
    appendStaleMessageEnvelopeSlotsPruned: (message, count) => `${message} pruned:${count}`,
    transcriptLoadWarnings: ({ expiredMessagesPurged, staleMessageEnvelopeSlotsPruned }) => ({
      resumeWarning: `resume ${expiredMessagesPurged}/${staleMessageEnvelopeSlotsPruned}`,
      loadedWarning: "loaded",
      autoResumeBaseWarning: "auto",
    }),
    autoSelectTwoProfileResumeTarget: () => "reply-latest",
    transcriptLoadUiState: () => ({
      state: "Conversation resumed",
      shouldStartRefresh: true,
      shouldStopRefresh: false,
      shouldRenderMemory: true,
      shouldAutoSelectPending: false,
      warning: "resume ready",
    }),
    twoProfileResumeWarningForTarget: (_target, warning) => warning,
    renderManualInviteRoomRebuildFlow: () => false,
    renderProductionTwoProfileMemory: () => {
      calls.renderMemory += 1;
    },
    autoSelectPendingTwoProfileConversation: () => {
      calls.autoSelectPending += 1;
    },
    invokeInviteRoomSessionStatus: async (payload) => {
      calls.invokeSessionStatus.push(payload);
      return {
        both_ready_for_message_envelope: true,
        warning: "fetched",
      };
    },
    twoProfileInviteCodeModeActive: () => true,
    twoProfileSessionStatusFingerprint: (value) => `${value.profileA}:${value.profileB}:${value.passphrase}`,
    getProductionBusyAction: () => productionBusyAction,
    clearLatestTwoProfileSessionStatus: () => {
      calls.clearLatestSessionStatus += 1;
    },
    twoProfileRecoveryMessage: (scope) => `recover:${scope}`,
    window: windowStub,
    ...overrides,
  });
  return { controller, calls, fields, input, windowStub };
}

test("loadProductionTwoProfileTranscript keeps transcript refresh orchestration and metadata sync", async () => {
  const { controller, calls, fields } = createHarness();

  const loaded = await controller.loadProductionTwoProfileTranscript();

  assert.equal(loaded, true);
  assert.deepEqual(calls.invokeResumeStatus[0], {
    profileA: "alice",
    profileB: "bob",
    passphrase: "room-1",
  });
  assert.equal(fields.productionTwoProfileTranscriptExport.value, "tsv");
  assert.equal(calls.renderTranscriptEntries.length, 1);
  assert.equal(calls.reconcileMetadata.length, 1);
  assert.equal(calls.renderMemory, 1);
  assert.equal(calls.setInterval.length, 1);
  assert.deepEqual(calls.clearProductionBusyAction, ["two-profile-transcript-load"]);
});

test("startInviteRoomTranscriptRefresh stops when the room is no longer current", async () => {
  const { controller, calls, input } = createHarness({
    latestTwoProfileSessionStatusForCurrentInput: (value) => (
      value.passphrase === input.passphrase
        ? { both_ready_for_message_envelope: true, warning: "ready" }
        : { both_ready_for_message_envelope: false, warning: "stale" }
    ),
  });

  controller.startInviteRoomTranscriptRefresh();
  input.passphrase = "room-2";
  await calls.setInterval[0].fn();

  assert.equal(calls.clearInterval.length, 1);
});
