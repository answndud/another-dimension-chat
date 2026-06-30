import assert from "node:assert/strict";
import test from "node:test";
import * as transcript from "./transcript.js";
const {
  combinedTwoProfileTranscriptTsv,
  createMessageTranscriptController,
  createTranscriptController,
  currentRoomConversationMetadata,
  manualExportConversationSyncView,
  manualImportConversationReloadResult,
  reconcileCurrentInviteRoomMetadataFromTranscriptEntries,
  savedInviteRoomMetadataSyncCandidates,
  transcriptLoadUiState,
  transcriptLoadWarnings,
  transcriptResumeWarningText,
  transcriptRetentionView
} = transcript;

(() => {
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
})();

(() => {

test("currentRoomConversationMetadata applies preferred retryable and session status hooks", () => {
  const result = currentRoomConversationMetadata({
    currentTranscriptMetadata: { retryableOutboundCount: 1, retryableOutboundMessageNumber: 3 },
    existingRoom: { retryableOutboundMessageNumber: 3 },
    roomInput: { profileA: "a", profileB: "b" },
    conversationEntries: [],
    inviteRoomMetadataWithoutRetryableOutbound: (metadata) => ({ ...metadata, trimmed: true }),
    savedInviteRoomMetadataWithPreferredRetryable: (metadata) => ({ ...metadata, preferred: true }),
    savedInviteRoomMetadataWithSessionStatus: (metadata) => ({ ...metadata, session: true }),
    sessionStatus: { state: "ok" },
  });
  assert.deepEqual(result, { retryableOutboundCount: 1, retryableOutboundMessageNumber: 3, preferred: true, session: true });
});

test("reconcileCurrentInviteRoomMetadataFromTranscriptEntries stores transcript metadata", () => {
  let remembered = null;
  const ok = reconcileCurrentInviteRoomMetadataFromTranscriptEntries({
    code: "code-1",
    role: "inviter",
    entries: [],
    roomInput: { profileA: "a", profileB: "b" },
    productionInviteRoomConversationMetadata: () => ({ messageCount: 2 }),
    inviteRoomMetadataWithoutRetryableOutbound: (metadata) => metadata,
    savedInviteRoomMetadataWithPreferredRetryable: (metadata) => metadata,
    savedInviteRoomMetadataWithSessionStatus: (metadata) => metadata,
    rememberInviteRoom: (code, role, metadata) => {
      remembered = { code, role, metadata };
    },
  });
  assert.equal(ok, true);
  assert.deepEqual(remembered, { code: "code-1", role: "inviter", metadata: { messageCount: 2 } });
});

test("savedInviteRoomMetadataSyncCandidates sorts by priority then recency", () => {
  const result = savedInviteRoomMetadataSyncCandidates(
    [
      { code: "a", role: "inviter", updatedAt: 10 },
      { code: "b", role: "inviter", updatedAt: 20 },
    ],
    {
      savedInviteRoomPriorityEntries: (rooms) => rooms.map((room, index) => ({
        index,
        room,
        priority: room.code === "a" ? 2 : 2,
        updatedAt: room.updatedAt,
      })),
      savedRoomMetadataStartupSyncLimit: 1,
    },
  );
  assert.equal(result[0].code, "b");
});

test("transcriptResumeWarningText returns localized pending review guidance", () => {
  assert.equal(
    transcriptResumeWarningText({
      target: "pending-review",
      selectedMessageNumber: 7,
      currentLanguage: "ko",
      baseWarning: "base",
    }),
    "메시지 #7가 아직 완료되지 않았습니다. 대화는 저장되어 있으며 필요한 작업을 이어갈 수 있습니다.",
  );
  assert.equal(
    transcriptResumeWarningText({
      target: "pending-review",
      selectedMessageNumber: 7,
      currentLanguage: "en",
      baseWarning: "base",
    }),
    "Message #7 is still pending. The conversation is saved and ready to continue.",
  );
});

test("transcriptResumeWarningText appends recovery details for latest reply resume", () => {
  const result = transcriptResumeWarningText({
    target: "reply-latest",
    staleMessageEnvelopeSlotsPruned: 2,
    expiredMessagesPurged: 1,
    appendStaleMessageEnvelopeSlotsPruned: (text, count) => `${text} [stale:${count}]`,
    appendExpiredMessagesPurged: (text, count) => `${text} [expired:${count}]`,
  });
  assert.equal(
    result,
    "Stored conversation recovered. Latest delivered message is selected as the reply target. [stale:2] [expired:1]",
  );
});

test("transcriptResumeWarningText falls back to base warning when no specialized branch applies", () => {
  assert.equal(
    transcriptResumeWarningText({
      target: null,
      baseWarning: "base",
    }),
    "base",
  );
});
})();

(() => {

test("transcriptLoadWarnings builds resumed, loaded, and auto-resume variants", () => {
  const warnings = transcriptLoadWarnings({
    expiredMessagesPurged: 2,
    staleMessageEnvelopeSlotsPruned: 1,
    appendExpiredMessagesPurged: (text, count) => `${text} [expired:${count}]`,
    appendStaleMessageEnvelopeSlotsPruned: (text, count) => `${text} [stale:${count}]`,
  });
  assert.deepEqual(warnings, {
    resumeWarning: "Local stored conversation and message-ready sessions loaded after local unlock. [expired:2] [stale:1]",
    loadedWarning: "Stored conversation loaded, but sessions are not ready for stored-message send. [expired:2] [stale:1]",
    autoResumeBaseWarning:
      "Local stored conversation and message-ready sessions loaded after local unlock. Compare the verification phrase before messaging. [stale:1] [expired:2]",
  });
});

test("transcriptLoadUiState returns resumed foreground behavior", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: false,
      sessionStatus: { both_ready_for_message_envelope: true },
      resumeTarget: "reply",
      resumeWarningText: "resume",
      loadedWarning: "loaded",
    }),
    {
      ready: true,
      state: "Conversation resumed",
      shouldStartRefresh: true,
      shouldStopRefresh: false,
      shouldRenderMemory: true,
      shouldAutoSelectPending: false,
      warning: "resume",
      flowKey: "conversation-loaded",
    },
  );
});

test("transcriptLoadUiState returns non-ready foreground behavior", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: false,
      sessionStatus: { both_ready_for_message_envelope: false },
      resumeTarget: null,
      resumeWarningText: "resume",
      loadedWarning: "loaded",
    }),
    {
      ready: false,
      state: "Conversation loaded",
      shouldStartRefresh: false,
      shouldStopRefresh: true,
      shouldRenderMemory: false,
      shouldAutoSelectPending: true,
      warning: "loaded",
      flowKey: "session-check",
    },
  );
});

test("transcriptLoadUiState returns auto-resume review behavior when sessions are not ready", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: true,
      autoResume: true,
      sessionStatus: { both_ready_for_message_envelope: false },
      autoResumeWarningText: "auto-resume",
    }),
    {
      ready: false,
      state: "Resume needs session check",
      shouldStartRefresh: false,
      shouldStopRefresh: true,
      shouldRenderMemory: false,
      shouldAutoSelectPending: false,
      warning:
        "Stored conversation was found, but message-ready sessions were not confirmed. Check sessions or run full setup.",
      flowKey: null,
    },
  );
});

test("transcriptLoadUiState returns auto-resume ready behavior without forcing pending review rendering", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: true,
      autoResume: true,
      sessionStatus: { both_ready_for_message_envelope: true },
      resumeTarget: "pending-review",
      autoResumeWarningText: "auto-ready",
    }),
    {
      ready: true,
      state: "Conversation resumed",
      shouldStartRefresh: true,
      shouldStopRefresh: false,
      shouldRenderMemory: false,
      shouldAutoSelectPending: false,
      warning: "auto-ready",
      flowKey: null,
    },
  );
});

test("transcriptLoadUiState returns inert quiet behavior when auto-resume is off", () => {
  assert.deepEqual(
    transcriptLoadUiState({
      quiet: true,
      autoResume: false,
      sessionStatus: { both_ready_for_message_envelope: true },
      resumeTarget: "reply",
      autoResumeWarningText: "ignored",
    }),
    {
      ready: true,
      state: "",
      shouldStartRefresh: false,
      shouldStopRefresh: false,
      shouldRenderMemory: false,
      shouldAutoSelectPending: false,
      warning: "",
      flowKey: null,
    },
  );
});
})();

(() => {

test("manual import reload result keeps the conversation reload summary when reply is not auto-selected", () => {
  assert.deepEqual(
    manualImportConversationReloadResult({
      importedProfile: "Alice",
      replySelected: false,
    }),
    {
      conversationReloaded: true,
      replySelected: false,
      warning: "Manual import for alice completed; conversation transcript was reloaded from encrypted local stores.",
    },
  );
});

test("manual import reload result suppresses the warning when reply selection already took over", () => {
  assert.deepEqual(
    manualImportConversationReloadResult({
      importedProfile: "bob",
      replySelected: true,
    }),
    {
      conversationReloaded: true,
      replySelected: true,
      warning: "",
    },
  );
});

test("manual export sync view promotes peer import when the sent row is still awaiting receipt", () => {
  const view = manualExportConversationSyncView({
    refreshedEntry: {
      receiver: "bob",
      statuses: new Set(["sent"]),
    },
    exportedNumber: 7,
    envelope: "ciphertext",
    importStep: "Import envelope",
    loadStep: "Load envelope",
    relayTargetSelected: true,
  });
  assert.deepEqual(view, {
    conversationUpdated: true,
    peerImportReady: true,
    preloadRemoteEnvelope: true,
    clearLocalEnvelope: true,
    messageState: "Manual import ready",
    messageWarning: "Export envelope complete for message #7. Next: Import envelope into bob.",
    conversationWarning: "Export envelope complete. Next: Import envelope into bob.",
  });
});

test("manual export sync view falls back to device-to-device instructions when peer import is not primed", () => {
  const view = manualExportConversationSyncView({
    refreshedEntry: {
      receiver: "bob",
      statuses: new Set(["sent", "received"]),
    },
    exportedNumber: 8,
    envelope: "",
    importStep: "Import envelope",
    loadStep: "Load envelope",
    relayTargetSelected: false,
  });
  assert.deepEqual(view, {
    conversationUpdated: true,
    peerImportReady: false,
    preloadRemoteEnvelope: false,
    clearLocalEnvelope: false,
    messageState: "",
    messageWarning: "",
    conversationWarning: "Export envelope complete for message #8. Next: Load envelope on the receiving device, then Import envelope.",
  });
});
})();

(() => {
test("loadProductionMessageTranscript keeps profile-gated transcript loading and redacted failures", async () => {
  const calls = {
    state: [],
    text: [],
    busy: [],
    apply: 0,
    invoke: [],
  };
  const fields = {
    productionMessageWarning: {},
    productionMessageBoundary: {},
    productionMessageTranscriptExport: { value: "" },
    loadProductionMessageTranscript: { disabled: false },
  };
  const controller = createMessageTranscriptController({
    productionProfileInput: () => ({ profile: "alice", passphrase: "room" }),
    setProductionMessageState: (value) => calls.state.push(value),
    setText: (field, value) => calls.text.push({ field, value }),
    fields,
    setProductionBusyAction: (value) => calls.busy.push(["set", value]),
    clearProductionBusyAction: (value) => calls.busy.push(["clear", value]),
    applyProductionActionState: () => {
      calls.apply += 1;
    },
    redactedUiErrorMessage: (scope) => `redacted:${scope}`,
    invoke: async (command, payload) => {
      calls.invoke.push({ command, payload });
      return { transcript_tsv: "tsv", warning: "ok" };
    },
    productionProfileInputStillCurrent: () => true,
    renderProductionTranscriptEntries: (profile, entries) => {
      calls.render = { profile, entries };
    },
    transcriptRetentionWarning: () => "retained",
    transcriptBoundarySummary: () => "boundary",
  });

  await controller.loadProductionMessageTranscript();

  assert.deepEqual(calls.invoke[0], {
    command: "production_message_transcript_export",
    payload: { profile: "alice", passphrase: "room" },
  });
  assert.deepEqual(calls.render, { profile: "alice", entries: undefined });
  assert.equal(fields.productionMessageTranscriptExport.value, "tsv");
  assert.deepEqual(calls.busy, [["set", "transcript-load"], ["clear", "transcript-load"]]);
  assert.equal(calls.apply, 2);
});
})();
