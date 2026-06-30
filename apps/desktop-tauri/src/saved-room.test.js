import assert from "node:assert/strict";
import test from "node:test";
import * as savedRoom from "./saved-room.js";
const {
  connectionCodeRoleStorageKey,
  createSavedRoomController,
  inviteRoomMetadataValue,
  inviteRoomMetadataWithoutManualRebuild,
  inviteRoomUpdatedAtValue,
  inviteRoomsStorageKey,
  lastInviteRoomStorageKey,
  localPrivateRouteCodesStorageKey,
  localPrivateRouteLifecycleStorageKey,
  manualRebuildRecoveryPersistenceTtlMs,
  normalizeSavedRoomManualRebuildMetadata,
  normalizeStoredRealOnionRecovery,
  normalizedSavedRoomManualRebuildDeliveryAction,
  normalizedSavedRoomManualRebuildDeliveryScope,
  normalizedSavedRoomManualRebuildFlow,
  normalizedSavedRoomManualRebuildMessageNumber,
  normalizedSavedRoomRetryableAction,
  normalizedSavedRoomRetryableMessage,
  normalizedSavedRoomRetryableMessageNumber,
  peerPrivateRouteDraftsStorageKey,
  privateRouteMapStorageLimit,
  readSavedInviteRooms,
  readStoredLifecycleMap,
  readStoredStringMap,
  realOnionRecoveriesStorageKey,
  realOnionRecoveryPersistenceTtlMs,
  receiveIntentRoomsStorageKey,
  refreshCurrentRoomAfterReceiveImport,
  refreshSavedInviteRoomMetadataForFingerprint,
  rememberCurrentInviteRoomMetadata,
  roomListStoragePayload,
  savedInviteRoomActionRechecksAfterOpen,
  savedInviteRoomBaseStateView,
  savedInviteRoomImmediateListAction,
  savedInviteRoomListItemContext,
  savedInviteRoomListItemDerivedState,
  savedInviteRoomListItemDisplayState,
  savedInviteRoomListItemViewRoom,
  savedInviteRoomManualRebuildRecoveryCandidate,
  savedInviteRoomMetadataFromLocalStores,
  savedInviteRoomMetadataSyncCandidates,
  savedInviteRoomNormalizedRecoveryView,
  savedInviteRoomReadinessBlockerKeyValue,
  savedInviteRoomReadinessNextDetailKeyValue,
  savedInviteRoomReadinessReviewValue,
  savedInviteRoomReadinessSummaryKeyValue,
  savedInviteRoomRecheckedRouteReadinessAction,
  savedInviteRoomRecoveryCandidates,
  savedInviteRoomRecoveryListAction,
  savedInviteRoomResumePriorityValue,
  savedInviteRoomResumeStateView,
  savedInviteRoomRetryableListAction,
  savedInviteRoomStorageLimit,
  savedRoomActionLabelKeyValue,
  savedRoomManualRebuildExpired,
  savedRoomManualRebuildUpdatedAtValue,
  savedRoomMetadataStartupSyncLimit,
  selectSavedInviteRoomResumeRoom,
  serializeStoredLifecycleMap,
  serializeStoredStringMap,
  syncSavedInviteRoomMetadataFromLocalStores
} = savedRoom;

(() => {
function createHarness(options = {}) {
  const store = new Map();
  const calls = {
    renderSavedInviteRooms: 0,
    rememberReceiveIntentForRoom: [],
    forgetTwoProfileSessionStatusForInput: [],
    clearPrivateRouteFollowupForRoom: [],
    clearChatDeliveryNoticeForInput: [],
    clearPrivateRouteRuntimeStateForInput: [],
    persistPrivateRouteRuntimeState: 0,
    openedChatSettings: 0,
    setProductionTwoProfileState: [],
    setText: [],
    invoke: [],
  };
  const controller = createSavedRoomController({
    localStoreGet: (key) => (store.has(key) ? store.get(key) : null),
    localStoreSet: (key, value) => store.set(key, value),
    localStoreRemove: (key) => store.delete(key),
    inviteRoomsStorageKey: "invite-rooms",
    lastInviteRoomStorageKey: "last-room",
    inviteRoomMetadataValue: (metadata, existing, key) => metadata?.[key] ?? existing?.[key],
    inviteRoomUpdatedAtValue: (metadata, existing) => Number(metadata?.updatedAt ?? existing?.updatedAt ?? 0),
    savedInviteRoomRetryableAction: (value) => String(value ?? "").trim(),
    productionInviteCodeProfiles: (code, role) => ({
      localProfile: `${role}-local-${code}`,
      peerProfile: `${role}-peer-${code}`,
    }),
    renderSavedInviteRooms: () => {
      calls.renderSavedInviteRooms += 1;
    },
    rememberReceiveIntentForRoom: (input, enabled) => {
      calls.rememberReceiveIntentForRoom.push({ input, enabled });
    },
    forgetTwoProfileSessionStatusForInput: (input) => {
      calls.forgetTwoProfileSessionStatusForInput.push(input);
    },
    clearPrivateRouteFollowupForRoom: (input) => {
      calls.clearPrivateRouteFollowupForRoom.push(input);
    },
    clearChatDeliveryNoticeForInput: (input) => {
      calls.clearChatDeliveryNoticeForInput.push(input);
    },
    twoProfileSafetyStorageKeys: (input) => [`safety:${input.inviteRole}:${input.passphrase}`],
    clearPrivateRouteRuntimeStateForInput: (input) => {
      calls.clearPrivateRouteRuntimeStateForInput.push(input);
    },
    persistPrivateRouteRuntimeState: () => {
      calls.persistPrivateRouteRuntimeState += 1;
    },
    openChatSettingsPanel: () => {
      calls.openedChatSettings += 1;
    },
    setProductionTwoProfileState: (value) => {
      calls.setProductionTwoProfileState.push(value);
    },
    setText: (node, value) => {
      if (node) {
        node.textContent = value;
      }
      calls.setText.push(value);
    },
    t: (key) => key,
    fields: {
      productionTwoProfileB: {},
      productionTwoProfileWarning: {},
      peerPrivateRouteCode: { value: "" },
    },
    twoProfileSessionsReadyForInput: () => options.sessionsReady !== false,
    twoProfileSafetyConfirmedForInput: () => options.safetyConfirmed !== false,
    manualNetworkPermissionEnabled: () => options.manualNetworkPermission !== false,
    twoProfilePeerEndpointState: () => ({ ready: options.peerEndpointReady === true }),
    showPrivateRouteRetryFollowupPrompt: () => false,
    invoke: async (command, input) => {
      calls.invoke.push({ command, input });
      if (command === "production_onion_persistent_client_status") {
        return { persistent_client_ready: false };
      }
      if (command === "production_onion_persistent_client_start") {
        return { persistent_client_ready: true, next_blocker: "" };
      }
      return { ok: true };
    },
    focusSafetyConfirmation: () => {},
    twoProfileInviteCodeModeActive: () => false,
    focusPrivateRouteNextAction: () => "paste-peer",
    applyPeerPrivateRouteCode: async () => true,
    prepareInviteRoomPrivateRouteExchange: async () => true,
    twoProfileTranscriptInputStillCurrent: () => true,
    refreshProductionTwoProfilePeerEndpoints: async () => ({ ready: false }),
    showLatestRetryableOutboundNotice: () => false,
    setChatDeliveryNoticeByKey: () => {},
  });
  return { controller, store, calls };
}

test("rememberInviteRoom preserves saved-room storage payload shape", () => {
  const { controller, store, calls } = createHarness();

  controller.rememberInviteRoom("room-a", "inviter", {
    updatedAt: 12,
    messageCount: 3,
    retryableOutboundCount: 1,
    retryableOutboundMessageNumber: 7,
    retryableOutboundMessage: "retry me",
    retryableOutboundAction: "retry-network",
  });

  const saved = JSON.parse(store.get("invite-rooms"));
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0], {
    code: "room-a",
    role: "inviter",
    updatedAt: 12,
    lastMessagePreview: "",
    lastMessageAt: 0,
    messageCount: 3,
    retryableOutboundCount: 1,
    retryableOutboundMessageNumber: 7,
    retryableOutboundMessage: "retry me",
    retryableOutboundAction: "retry-network",
    manualRebuildFlow: false,
    manualRebuildDeliveryScope: "",
    manualRebuildDeliveryAction: "",
    manualRebuildMessageNumber: 0,
    manualRebuildUpdatedAt: 0,
  });
  assert.equal(calls.renderSavedInviteRooms, 1);
});

test("rememberLastInviteRoom stores last-room pointer and room list entry", () => {
  const { controller, store } = createHarness();

  controller.rememberLastInviteRoom("room-b", "joiner");

  assert.deepEqual(JSON.parse(store.get("last-room")), { code: "room-b", role: "joiner" });
  assert.deepEqual(controller.savedLastInviteRoom(), { code: "room-b", role: "joiner" });
  assert.equal(controller.savedInviteRooms()[0].code, "room-b");
  assert.equal(controller.savedInviteRooms()[0].role, "joiner");
});

test("savedInviteRoomInput derives stable local and peer profiles from code and role", () => {
  const { controller } = createHarness();

  assert.deepEqual(controller.savedInviteRoomInput({ code: "room-c", role: "inviter" }), {
    profileA: "inviter-local-room-c",
    profileB: "inviter-peer-room-c",
    passphrase: "room-c",
    connectionCode: "room-c",
    inviteRole: "inviter",
  });
});

test("forgetInviteRoom clears both inviter and joiner runtime side effects", () => {
  const { controller, store, calls } = createHarness();
  store.set("invite-rooms", JSON.stringify([{ code: "room-d", role: "inviter", updatedAt: 1 }]));
  store.set("last-room", JSON.stringify({ code: "room-d", role: "inviter" }));
  store.set("safety:inviter:room-d", "confirmed");
  store.set("safety:joiner:room-d", "confirmed");

  controller.forgetLastInviteRoom("room-d");

  assert.equal(store.has("last-room"), false);
  assert.deepEqual(JSON.parse(store.get("invite-rooms")), []);
  assert.equal(calls.persistPrivateRouteRuntimeState, 1);
  assert.equal(calls.rememberReceiveIntentForRoom.length, 2);
  assert.equal(calls.forgetTwoProfileSessionStatusForInput.length, 2);
  assert.equal(calls.clearPrivateRouteFollowupForRoom.length, 2);
  assert.equal(calls.clearChatDeliveryNoticeForInput.length, 2);
  assert.equal(calls.clearPrivateRouteRuntimeStateForInput.length, 2);
});

test("openSavedInviteRoom restores code and role into the active room input", async () => {
  const { controller } = createHarness();
  const fields = {
    productionTwoProfileB: { value: "", dataset: {} },
  };
  let showedRoomDetail = 0;
  let cleared = 0;
  let rememberedRole = null;
  let currentInviteCodeShareVisible = true;
  let latestCreatedInviteCode = "";
  const controllerWithUi = createSavedRoomController({
    ...controller,
    localStoreGet: controller.savedInviteRooms ? undefined : () => null,
  });
  void controllerWithUi;
  const savedRoomController = createSavedRoomController({
    localStoreGet: () => null,
    localStoreSet: () => {},
    localStoreRemove: () => {},
    inviteRoomsStorageKey: "invite-rooms",
    lastInviteRoomStorageKey: "last-room",
    inviteRoomMetadataValue: (metadata, existing, key) => metadata?.[key] ?? existing?.[key],
    inviteRoomUpdatedAtValue: (metadata, existing) => Number(metadata?.updatedAt ?? existing?.updatedAt ?? 0),
    savedInviteRoomRetryableAction: (value) => String(value ?? "").trim(),
    productionInviteCodeProfiles: (code, role) => ({
      localProfile: `${role}-local-${code}`,
      peerProfile: `${role}-peer-${code}`,
    }),
    renderSavedInviteRooms: () => {},
    rememberReceiveIntentForRoom: () => {},
    forgetTwoProfileSessionStatusForInput: () => {},
    clearPrivateRouteFollowupForRoom: () => {},
    clearChatDeliveryNoticeForInput: () => {},
    twoProfileSafetyStorageKeys: () => [],
    clearPrivateRouteRuntimeStateForInput: () => {},
    persistPrivateRouteRuntimeState: () => {},
    showRoomDetail: () => {
      showedRoomDetail += 1;
    },
    clearCurrentInviteRoomInput: () => {
      cleared += 1;
    },
    rememberConnectionCodeRole: (code, role) => {
      rememberedRole = { code, role };
    },
    syncTwoProfileDerivedConnectionFields: () => {},
    renderCurrentInviteCodeDisplay: () => {},
    applyProductionActionState: () => {},
    productionTwoProfileInput: () => ({ profileA: "a", profileB: "b", passphrase: "room-x" }),
    waitForMessageRetentionPolicyReady: async () => true,
    twoProfileTranscriptInputStillCurrent: () => true,
    openInviteRoomFromToken: async () => true,
    stopProductionTwoProfileOnionReceiveForInput: () => {},
    currentInviteRoomCode: () => "",
    showRoomList: () => {},
    setProductionTwoProfileState: () => {},
    setText: () => {},
    t: (key) => key,
    applyPairwiseInviteGuidance: () => {},
    openSavedInviteRoomReceiveOwnerBeforeSwitch: async () => false,
    savedInviteRoomActionIsRouteReadinessOnly: () => false,
    clearRouteReadinessOnlyFollowupContext: () => false,
    savedInviteRoomActionCanUseRetryableOutbound: () => false,
    savedInviteRoomResolvedRetryableOutbound: () => null,
    handleSavedInviteRoomMissingPendingAction: async () => true,
    savedInviteRoomActionRechecksAfterOpen: () => false,
    currentSavedInviteRoomView: () => ({ room: null, action: "", actionOrigin: "" }),
    savedInviteRoomRecheckedRouteReadinessAction: () => null,
    savedInviteRoomPreservesOpenActionOrigin: () => false,
    showSavedInviteRoomReceiveStopPending: () => true,
    showSavedInviteRoomExpiredRealOnionAction: () => true,
    showSavedInviteRoomActionNowReady: () => true,
    showManualRebuildRecoveryAfterSavedRoomOpen: () => false,
    showExactRetryableOutboundPrompt: () => true,
    showSavedInviteRoomPeerCodePrompt: () => true,
    externalPeerSendReadiness: () => ({ ready: true }),
    showRealOnionRouteReadinessBlock: () => true,
    realOnionRecoveryRunAction: () => ({ ready: false }),
    focusLocalDiagnostic: () => {},
    runProductionTwoProfileRealOnionRoundtrip: async () => true,
    showSavedInviteRoomRealOnionNeedsMessage: () => false,
    applyProductionActionStateAfterListAction: () => {},
    rememberPrivateRouteFollowup: () => {},
    renderManualRebuildDeliveryScopeGate: () => {},
    focusPrivateRouteNextAction: () => {},
    runSavedInviteRoomRetryableOutboundAction: async () => true,
    openPrivateDeliverySettings: () => {},
    preparePrivateDeliveryRoute: async () => {},
    focusSafetyConfirmation: () => {},
    startProductionTwoProfileOnionReceive: async () => {},
    stopProductionTwoProfileOnionReceive: () => {},
    savedInviteRoomRealOnionRecoveryView: () => null,
    enablePrivateDeliveryPermission: () => {},
    fields,
    setChatDeliveryNoticeByKey: () => {},
    openPrivateDeliveryBridgeSettings: () => {},
    setCurrentInviteCodeShareVisible: (value) => {
      currentInviteCodeShareVisible = value;
    },
    setLatestCreatedInviteCode: (value) => {
      latestCreatedInviteCode = value;
    },
    window: { confirm: () => true },
  });

  const opened = await savedRoomController.openSavedInviteRoom({ code: "room-x", role: "inviter" });

  assert.equal(opened, true);
  assert.equal(showedRoomDetail, 1);
  assert.equal(cleared, 1);
  assert.deepEqual(rememberedRole, { code: "room-x", role: "inviter" });
  assert.equal(fields.productionTwoProfileB.value, "room-x");
  assert.equal(fields.productionTwoProfileB.dataset.inviteCodeRole, "inviter");
  assert.equal(currentInviteCodeShareVisible, false);
  assert.equal(latestCreatedInviteCode, "room-x");
});

test("preparePrivateDeliveryRoute needs a complete room before opening settings", async () => {
  const { controller, calls } = createHarness();

  await controller.preparePrivateDeliveryRoute({ input: { profileA: "", profileB: "", passphrase: "" } });

  assert.equal(calls.openedChatSettings, 1);
  assert.deepEqual(calls.setProductionTwoProfileState, ["Private route needs room"]);
  assert.deepEqual(calls.setText, ["refreshAddressNeedsRoom"]);
});

test("preparePrivateDeliveryRoute reports ready route without retry recovery", async () => {
  const { controller, calls } = createHarness({ peerEndpointReady: true });

  await controller.preparePrivateDeliveryRoute({
    input: { profileA: "alice", profileB: "bob", passphrase: "room" },
    allowRetryRecovery: false,
  });

  assert.deepEqual(calls.setProductionTwoProfileState, ["Private route ready"]);
  assert.deepEqual(calls.setText, ["privateDeliveryRouteReady"]);
});

test("ensurePrivateDeliveryRuntimeReady prepares onion runtime with manual permission", async () => {
  const { controller, calls } = createHarness();

  const runtime = await controller.ensurePrivateDeliveryRuntimeReady({
    profileA: "alice",
    profileB: "bob",
    passphrase: "room",
  });

  assert.deepEqual(calls.invoke.map((call) => call.command), [
    "production_onion_backup_exclusion_prepare",
    "production_onion_key_record_prepare",
    "production_onion_persistent_client_status",
    "production_onion_persistent_client_start",
  ]);
  assert.deepEqual(runtime, {
    backup: { ok: true },
    key: { ok: true },
    client: { persistent_client_ready: true, next_blocker: "" },
  });
});
})();

(() => {

test("saved invite room actions recheck only known recovery paths", () => {
  assert.equal(savedInviteRoomActionRechecksAfterOpen("verify-safety"), true);
  assert.equal(savedInviteRoomActionRechecksAfterOpen("real-onion-retry"), true);
  assert.equal(savedInviteRoomActionRechecksAfterOpen("open-room"), false);
});

test("saved invite room route readiness recheck preserves ready state", () => {
  assert.deepEqual(savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "route-readiness", {}, null), {
    ready: true,
  });
  assert.equal(
    savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "retryable-outbound", {}, { action: "retry" }),
    null,
  );
  assert.deepEqual(savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "route-readiness", {}, { action: "refresh-endpoint" }), {
    ready: false,
    action: "refresh-endpoint",
  });
  assert.deepEqual(savedInviteRoomRecheckedRouteReadinessAction("refresh-endpoint", "route-readiness", {}, { action: "paste-peer-code" }), {
    ready: false,
    action: "paste-peer-code",
  });
});

test("saved invite room manual rebuild recovery candidate prioritizes waiting peer code and paused receive state", () => {
  const candidate = savedInviteRoomManualRebuildRecoveryCandidate({
    room: {
      manualRebuildFlow: true,
      manualRebuildDeliveryAction: "refresh-endpoint",
      manualRebuildMessageNumber: 4,
    },
    view: {
      waitingPeerCode: true,
      receiveState: "paused",
      routeReadinessView: { action: "refresh-endpoint" },
    },
  });
  assert.deepEqual(candidate, {
    action: "paste-peer-code",
    actionOrigin: "route-readiness",
    messageNumber: 4,
  });
});

test("saved invite room manual rebuild recovery candidate prefers retryable outbound before route or receive recovery", () => {
  const candidate = savedInviteRoomManualRebuildRecoveryCandidate({
    room: {
      manualRebuildFlow: true,
      retryableOutboundCount: 1,
      retryableOutboundMessageNumber: 9,
      manualRebuildDeliveryAction: "refresh-endpoint",
      manualRebuildMessageNumber: 4,
    },
    action: "retry",
    actionOrigin: "retryable-outbound",
    view: {
      waitingPeerCode: true,
      receiveState: "paused",
      routeReadinessView: { action: "paste-peer-code" },
    },
  });
  assert.deepEqual(candidate, {
    action: "retry",
    actionOrigin: "retryable-outbound",
    messageNumber: 9,
  });
});

test("saved invite room manual rebuild recovery candidate falls back to current non-real-onion action before metadata action", () => {
  const candidate = savedInviteRoomManualRebuildRecoveryCandidate({
    room: {
      manualRebuildFlow: true,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      manualRebuildDeliveryAction: "refresh-endpoint",
      manualRebuildMessageNumber: 6,
    },
    action: "verify-safety",
    actionOrigin: "saved-room",
    view: {
      waitingPeerCode: false,
      receiveState: "idle",
      routeReadinessView: null,
    },
  });
  assert.deepEqual(candidate, {
    action: "verify-safety",
    actionOrigin: "saved-room",
    messageNumber: 6,
  });
});

test("saved invite room manual rebuild recovery candidate ignores current real-onion action and uses stored metadata action", () => {
  const candidate = savedInviteRoomManualRebuildRecoveryCandidate({
    room: {
      manualRebuildFlow: true,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      manualRebuildDeliveryAction: "refresh-endpoint",
      manualRebuildMessageNumber: 11,
    },
    action: "real-onion-retry",
    actionOrigin: "saved-room",
    view: {
      waitingPeerCode: false,
      receiveState: "idle",
      routeReadinessView: null,
    },
  });
  assert.deepEqual(candidate, {
    action: "refresh-endpoint",
    actionOrigin: "manual-rebuild-metadata",
    messageNumber: 11,
  });
});
})();

(() => {

test("savedInviteRoomMetadataFromLocalStores prefers the stored retryable outbound message", async () => {
  const result = await savedInviteRoomMetadataFromLocalStores({
    room: { retryableOutboundMessageNumber: 7 },
    roomInput: { profileA: "alice", profileB: "bob" },
    invokeRoomTranscriptExport: async () => ({
      entries: [{ messageNumber: 7 }],
      metadata: { retryableOutboundCount: 1, retryableOutboundMessageNumber: 9 },
    }),
    savedInviteRoomMetadataWithPreferredRetryable: (metadata, roomInput, entries, preferredMessageNumber) => ({
      ...metadata,
      preferredMessageNumber,
      pairedProfiles: `${roomInput.profileA}-${roomInput.profileB}`,
      entryCount: entries.length,
    }),
    inviteRoomMetadataWithoutRetryableOutbound: (metadata) => ({ ...metadata, cleared: true }),
  });

  assert.deepEqual(result, {
    retryableOutboundCount: 1,
    retryableOutboundMessageNumber: 9,
    preferredMessageNumber: 7,
    pairedProfiles: "alice-bob",
    entryCount: 1,
  });
});

test("savedInviteRoomMetadataFromLocalStores clears retryable metadata when no preferred message exists", async () => {
  const result = await savedInviteRoomMetadataFromLocalStores({
    room: { retryableOutboundMessageNumber: 0 },
    invokeRoomTranscriptExport: async () => ({
      entries: [],
      metadata: { retryableOutboundCount: 1, retryableOutboundMessageNumber: 4 },
    }),
    savedInviteRoomMetadataWithPreferredRetryable: (metadata) => metadata,
    inviteRoomMetadataWithoutRetryableOutbound: (metadata) => ({ ...metadata, retryableOutboundCount: 0, cleared: true }),
  });

  assert.deepEqual(result, {
    retryableOutboundCount: 0,
    retryableOutboundMessageNumber: 4,
    cleared: true,
  });
});

test("refreshSavedInviteRoomMetadataForFingerprint refreshes session status after retryable outbound is cleared", async () => {
  const remembered = [];
  const forgotten = [];
  let rendered = 0;
  const ok = await refreshSavedInviteRoomMetadataForFingerprint({
    room: {
      code: "room-a",
      role: "inviter",
      updatedAt: 17,
      retryableOutboundCount: 1,
      retryableOutboundMessageNumber: 8,
    },
    roomFingerprint: "fp-a",
    options: { preserveUpdatedAt: true },
    savedInviteRoomInput: (room) => ({ profileA: room.code, profileB: room.role }),
    savedInviteRoomMetadataFromLocalStores: async () => ({
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
    }),
    savedInviteRoomMetadataWithSessionStatus: (metadata, roomInput, sessionStatus) => ({
      ...metadata,
      sessionAction: sessionStatus.action,
      sessionFor: roomInput.profileA,
    }),
    savedInviteRoomHasRetryableOutbound: (room) =>
      Number.parseInt(room?.retryableOutboundCount ?? 0, 10) > 0,
    latestTwoProfileSessionStatusForCurrentInput: () => null,
    invokeInviteRoomSessionStatus: async () => ({ action: "retry" }),
    rememberTwoProfileSessionStatus: (roomInput, status) => remembered.push({ roomInput, status }),
    forgetTwoProfileSessionStatusForInput: (roomInput) => forgotten.push(roomInput),
    rememberInviteRoom: (code, role, metadata, options) => remembered.push({ code, role, metadata, options }),
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
  });

  assert.equal(ok, true);
  assert.equal(forgotten.length, 0);
  assert.equal(rendered, 1);
  assert.deepEqual(remembered[0], {
    roomInput: { profileA: "room-a", profileB: "inviter" },
    status: { action: "retry" },
  });
  assert.deepEqual(remembered[1], {
    code: "room-a",
    role: "inviter",
    metadata: {
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      sessionAction: "retry",
      sessionFor: "room-a",
      updatedAt: 17,
    },
    options: { render: false },
  });
});

test("refreshSavedInviteRoomMetadataForFingerprint skips refresh when the saved room fingerprint does not match", async () => {
  let rendered = 0;
  const ok = await refreshSavedInviteRoomMetadataForFingerprint({
    room: {
      code: "room-a",
      role: "inviter",
      updatedAt: 17,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
    },
    roomFingerprint: "fp-a",
    roomFingerprintForRoom: () => "fp-b",
    savedInviteRoomInput: () => ({ profileA: "room-a", profileB: "inviter" }),
    savedInviteRoomMetadataFromLocalStores: async () => {
      throw new Error("should not refresh a mismatched room");
    },
    savedInviteRoomMetadataWithSessionStatus: (metadata) => metadata,
    savedInviteRoomHasRetryableOutbound: () => false,
    latestTwoProfileSessionStatusForCurrentInput: () => null,
    invokeInviteRoomSessionStatus: async () => ({ action: "retry" }),
    rememberTwoProfileSessionStatus: () => {
      throw new Error("should not cache mismatched room status");
    },
    forgetTwoProfileSessionStatusForInput: () => {
      throw new Error("should not forget mismatched room status");
    },
    rememberInviteRoom: () => {
      throw new Error("should not persist mismatched room metadata");
    },
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
  });

  assert.equal(ok, false);
  assert.equal(rendered, 1);
});

test("refreshSavedInviteRoomMetadataForFingerprint forgets stale session cache when session refresh fails", async () => {
  const forgotten = [];
  const remembered = [];
  let rendered = 0;
  const ok = await refreshSavedInviteRoomMetadataForFingerprint({
    room: {
      code: "room-a",
      role: "inviter",
      updatedAt: 17,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
    },
    roomFingerprint: "fp-a",
    options: { refreshSessionStatus: true },
    savedInviteRoomInput: (room) => ({ profileA: room.code, profileB: room.role }),
    savedInviteRoomMetadataFromLocalStores: async () => ({
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      messageCount: 2,
    }),
    savedInviteRoomMetadataWithSessionStatus: (metadata) => metadata,
    savedInviteRoomHasRetryableOutbound: () => false,
    latestTwoProfileSessionStatusForCurrentInput: () => ({ action: "cached" }),
    invokeInviteRoomSessionStatus: async () => {
      throw new Error("refresh failed");
    },
    rememberTwoProfileSessionStatus: () => {
      throw new Error("should not remember failed refresh");
    },
    forgetTwoProfileSessionStatusForInput: (roomInput) => forgotten.push(roomInput),
    rememberInviteRoom: (code, role, metadata, options) => remembered.push({ code, role, metadata, options }),
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
  });

  assert.equal(ok, true);
  assert.deepEqual(forgotten, [{ profileA: "room-a", profileB: "inviter" }]);
  assert.deepEqual(remembered, [
    {
      code: "room-a",
      role: "inviter",
      metadata: {
        retryableOutboundCount: 0,
        retryableOutboundMessageNumber: 0,
        messageCount: 2,
      },
      options: { render: false },
    },
  ]);
  assert.equal(rendered, 1);
});

test("refreshSavedInviteRoomMetadataForFingerprint drops stale async results after the room fingerprint changes", async () => {
  const remembered = [];
  let rendered = 0;
  let fingerprintChecks = 0;
  const ok = await refreshSavedInviteRoomMetadataForFingerprint({
    room: {
      code: "room-a",
      role: "inviter",
      updatedAt: 17,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
    },
    roomFingerprint: "fp-a",
    roomFingerprintForRoom: () => {
      fingerprintChecks += 1;
      return fingerprintChecks === 1 ? "fp-a" : "fp-b";
    },
    options: { refreshSessionStatus: true },
    savedInviteRoomInput: () => ({ profileA: "room-a", profileB: "inviter" }),
    savedInviteRoomMetadataFromLocalStores: async () => ({
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      messageCount: 2,
    }),
    savedInviteRoomMetadataWithSessionStatus: (metadata, _roomInput, sessionStatus) => ({
      ...metadata,
      sessionAction: sessionStatus.action,
    }),
    savedInviteRoomHasRetryableOutbound: () => false,
    latestTwoProfileSessionStatusForCurrentInput: () => null,
    invokeInviteRoomSessionStatus: async () => ({ action: "retry" }),
    rememberTwoProfileSessionStatus: (roomInput, status) => remembered.push({ roomInput, status }),
    forgetTwoProfileSessionStatusForInput: () => {
      throw new Error("should not forget session status for a stale result");
    },
    rememberInviteRoom: () => {
      throw new Error("should not persist stale room metadata");
    },
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
  });

  assert.equal(ok, false);
  assert.equal(rendered, 1);
  assert.deepEqual(remembered, [
    {
      roomInput: { profileA: "room-a", profileB: "inviter" },
      status: { action: "retry" },
    },
  ]);
});

test("syncSavedInviteRoomMetadataFromLocalStores records partial sync status when one room refresh fails", async () => {
  let inFlight = false;
  const statuses = [];
  const remembered = [];
  let rendered = 0;
  const ok = await syncSavedInviteRoomMetadataFromLocalStores({
    savedRoomMetadataSyncInFlight: () => inFlight,
    setSavedRoomMetadataSyncInFlight: (value) => {
      inFlight = value;
    },
    savedRoomMetadataSyncInFlightSet: (value) => {
      inFlight = value;
    },
    savedInviteRoomMetadataSyncCandidates: () => [
      { code: "room-a", role: "inviter", updatedAt: 1 },
      { code: "room-b", role: "joiner", updatedAt: 2 },
    ],
    savedInviteRoomMetadataFromLocalStores: async (room) => {
      if (room.code === "room-b") {
        throw new Error("broken transcript");
      }
      return { messageCount: 1 };
    },
    savedInviteRoomInput: (room) => ({ profileA: room.code, profileB: room.role }),
    invokeInviteRoomSessionStatus: async () => ({ state: "ready" }),
    rememberTwoProfileSessionStatus: () => {},
    forgetTwoProfileSessionStatusForInput: () => {},
    savedInviteRoomMetadataWithSessionStatus: (metadata) => ({ ...metadata, session: true }),
    rememberInviteRoom: (code, role, metadata, options) => remembered.push({ code, role, metadata, options }),
    renderSavedInviteRooms: () => {
      rendered += 1;
    },
    setSavedRoomMetadataSyncStatus: (key, tone, values) => {
      statuses.push({ key, tone, values });
    },
  });

  assert.equal(ok, true);
  assert.equal(inFlight, false);
  assert.equal(rendered, 1);
  assert.deepEqual(remembered, [
    {
      code: "room-a",
      role: "inviter",
      metadata: { messageCount: 1, session: true, updatedAt: 1 },
      options: { render: false },
    },
  ]);
  assert.deepEqual(statuses, [
    { key: "roomListSyncRunning", tone: "progress", values: { count: 2 } },
    { key: "roomListSyncPartial", tone: "warning", values: { count: 1 } },
  ]);
});

test("syncSavedInviteRoomMetadataFromLocalStores clears status and exits when there is nothing to sync", async () => {
  const statuses = [];
  const ok = await syncSavedInviteRoomMetadataFromLocalStores({
    savedRoomMetadataSyncInFlight: () => false,
    savedInviteRoomMetadataSyncCandidates: () => [],
    setSavedRoomMetadataSyncStatus: (key, tone, values) => {
      statuses.push({ key, tone, values });
    },
  });

  assert.equal(ok, false);
  assert.deepEqual(statuses, [{ key: "", tone: undefined, values: undefined }]);
});

test("rememberCurrentInviteRoomMetadata consumes the retryable fallback flag once", () => {
  const fallbackValues = [];
  const remembered = [];
  rememberCurrentInviteRoomMetadata({
    currentInviteRoomCode: () => "room-a",
    connectionCodeRoleFor: () => "inviter",
    allowCurrentRoomRetryableMetadataFallbackOnce: true,
    allowCurrentRoomRetryableMetadataFallbackOnceSet: (value) => {
      fallbackValues.push(value);
    },
    rememberInviteRoom: (code, role, metadata) => remembered.push({ code, role, metadata }),
    currentRoomConversationMetadata: ({ allowRetryableFallback }) => ({
      allowRetryableFallback,
      messageCount: 3,
    }),
  });

  assert.deepEqual(fallbackValues, [false]);
  assert.deepEqual(remembered, [
    {
      code: "room-a",
      role: "inviter",
      metadata: { allowRetryableFallback: true, messageCount: 3 },
    },
  ]);
});

test("refreshCurrentRoomAfterReceiveImport updates memory only when an import completed", () => {
  const calls = [];
  refreshCurrentRoomAfterReceiveImport({
    refreshPlan: { messageImported: false },
    roomInput: { profileA: "alice", profileB: "bob" },
    twoProfileSessionsReadyForInput: () => true,
    rememberCurrentInviteRoomMetadata: () => calls.push("remember"),
    renderSavedInviteRooms: () => calls.push("render-list"),
    renderRoomStatusSummary: (roomInput, ready) => calls.push(["status", roomInput, ready]),
    renderRoomIdentityBar: (roomInput, ready) => calls.push(["identity", roomInput, ready]),
    renderProductionTwoProfileMemory: () => calls.push("memory"),
  });

  assert.deepEqual(calls, [
    "remember",
    "render-list",
    ["status", { profileA: "alice", profileB: "bob" }, true],
    ["identity", { profileA: "alice", profileB: "bob" }, true],
  ]);
});

test("refreshCurrentRoomAfterReceiveImport refreshes memory when an import completed", () => {
  const calls = [];
  refreshCurrentRoomAfterReceiveImport({
    refreshPlan: { messageImported: true },
    roomInput: { profileA: "alice", profileB: "bob" },
    twoProfileSessionsReadyForInput: () => false,
    rememberCurrentInviteRoomMetadata: () => calls.push("remember"),
    renderSavedInviteRooms: () => calls.push("render-list"),
    renderRoomStatusSummary: (roomInput, ready) => calls.push(["status", roomInput, ready]),
    renderRoomIdentityBar: (roomInput, ready) => calls.push(["identity", roomInput, ready]),
    renderProductionTwoProfileMemory: (roomInput) => calls.push(["memory", roomInput]),
  });

  assert.deepEqual(calls, [
    "remember",
    "render-list",
    ["status", { profileA: "alice", profileB: "bob" }, false],
    ["identity", { profileA: "alice", profileB: "bob" }, false],
    ["memory", { profileA: "alice", profileB: "bob" }],
  ]);
});
})();

(() => {

test("selectSavedInviteRoomResumeRoom returns null when no resumable room exists", () => {
  assert.equal(selectSavedInviteRoomResumeRoom([]), null);
  assert.equal(
    selectSavedInviteRoomResumeRoom([
      { room: { code: "a" }, priority: 0, updatedAt: 10, index: 0 },
    ]),
    null,
  );
});

test("selectSavedInviteRoomResumeRoom prefers highest priority room", () => {
  const result = selectSavedInviteRoomResumeRoom([
    { room: { code: "a" }, priority: 1, updatedAt: 20, index: 0 },
    { room: { code: "b" }, priority: 3, updatedAt: 10, index: 1 },
  ]);
  assert.equal(result.code, "b");
});

test("selectSavedInviteRoomResumeRoom breaks ties by recency and then original index", () => {
  const byRecency = selectSavedInviteRoomResumeRoom([
    { room: { code: "a" }, priority: 2, updatedAt: 10, index: 0 },
    { room: { code: "b" }, priority: 2, updatedAt: 20, index: 1 },
  ]);
  assert.equal(byRecency.code, "b");

  const byIndex = selectSavedInviteRoomResumeRoom([
    { room: { code: "a" }, priority: 2, updatedAt: 20, index: 0 },
    { room: { code: "b" }, priority: 2, updatedAt: 20, index: 1 },
  ]);
  assert.equal(byIndex.code, "a");
});
})();

(() => {

test("savedInviteRoomNormalizedRecoveryView clears blocked real onion recovery", () => {
  const recovery = { state: { key: "recovery", label: "Recovery" } };
  assert.equal(
    savedInviteRoomNormalizedRecoveryView({
      receiveState: "paused",
      routeReadinessView: { action: "refresh-endpoint" },
      realOnionRecoveryView: recovery,
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => true,
    }),
    null,
  );
  assert.equal(
    savedInviteRoomNormalizedRecoveryView({
      receiveState: "idle",
      routeReadinessView: { action: "refresh-endpoint" },
      realOnionRecoveryView: recovery,
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => false,
    }),
    recovery,
  );
});

test("savedInviteRoomResumeStateView only formats labels when resume is recommended", () => {
  const view = { key: "ready", label: "Ready" };
  assert.equal(savedInviteRoomResumeStateView(view, { resumeRecommended: false }), view);
  assert.deepEqual(
    savedInviteRoomResumeStateView(view, {
      resumeRecommended: true,
      formatTemplate: (_key, value) => `Resume ${value.state}`,
    }),
    { key: "ready", label: "Resume Ready" },
  );
});

test("savedInviteRoomBaseStateView prioritizes receive, retry, recovery, and ready states", () => {
  assert.deepEqual(
    savedInviteRoomBaseStateView({
      receiveState: "paused",
      t: (key) => key,
    }),
    { key: "receive-paused", label: "roomStateReceivePaused" },
  );

  assert.deepEqual(
    savedInviteRoomBaseStateView({
      hasRetryableOutbound: true,
      retryableState: { key: "retry", label: "Retry" },
      t: (key) => key,
    }),
    { key: "retry", label: "Retry" },
  );

  assert.deepEqual(
    savedInviteRoomBaseStateView({
      currentCode: "alpha",
      room: { code: "alpha", messageCount: 0 },
      roomDetailOpen: true,
      t: (key) => key,
    }),
    { key: "active", label: "roomStateActive" },
  );

  assert.deepEqual(
    savedInviteRoomBaseStateView({
      room: { code: "beta", messageCount: 2 },
      t: (key) => key,
    }),
    { key: "ready", label: "roomStateReady" },
  );
});
})();

(() => {

test("readSavedInviteRooms normalizes retryable and manual rebuild metadata", () => {
  const rooms = readSavedInviteRooms(
    JSON.stringify([
      {
        code: "code-1",
        role: "inviter",
        updatedAt: 50,
        retryableOutboundCount: 1,
        retryableOutboundMessageNumber: "9",
        retryableOutboundMessage: "hello",
        retryableOutboundAction: "retry-network",
        manualRebuildFlow: true,
        manualRebuildDeliveryScope: "retry",
        manualRebuildDeliveryAction: "refresh-and-retry",
        manualRebuildMessageNumber: "3",
        manualRebuildUpdatedAt: 100,
      },
    ]),
    "null",
    {
      now: 200,
      normalizeRetryableAction: (value) => String(value ?? "").trim().toLowerCase(),
    },
  );
  assert.equal(rooms.length, 1);
  assert.deepEqual(rooms[0], {
    code: "code-1",
    role: "inviter",
    updatedAt: 50,
    lastMessagePreview: "",
    lastMessageAt: 0,
    messageCount: 0,
    retryableOutboundCount: 1,
    retryableOutboundMessageNumber: 9,
    retryableOutboundMessage: "hello",
    retryableOutboundAction: "retry-network",
    manualRebuildFlow: true,
    manualRebuildDeliveryScope: "retry",
    manualRebuildDeliveryAction: "refresh-and-retry",
    manualRebuildMessageNumber: 3,
    manualRebuildUpdatedAt: 100,
  });
});

test("readSavedInviteRooms falls back to last invite room when list is empty", () => {
  const rooms = readSavedInviteRooms("[]", JSON.stringify({ code: "fallback-room", role: "joiner" }));
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].code, "fallback-room");
  assert.equal(rooms[0].role, "joiner");
});

test("roomListStoragePayload strips retry metadata when count is zero", () => {
  const payload = roomListStoragePayload(
    [
      {
        code: "room-a",
        role: "inviter",
        updatedAt: 1,
        retryableOutboundCount: 0,
        retryableOutboundMessageNumber: 99,
        retryableOutboundMessage: "keep out",
        retryableOutboundAction: "retry-network",
        manualRebuildFlow: false,
      },
    ],
    {
      normalizeRetryableAction: (value) => String(value ?? "").trim(),
    },
  );
  assert.equal(payload[0].retryableOutboundMessageNumber, 0);
  assert.equal(payload[0].retryableOutboundMessage, "");
  assert.equal(payload[0].retryableOutboundAction, "");
});

test("normalizeStoredRealOnionRecovery rejects expired records", () => {
  const normalized = normalizeStoredRealOnionRecovery(
    { action: "retry-bootstrap", updatedAt: 1 },
    { now: 24 * 60 * 60 * 1000 * 2 },
  );
  assert.equal(normalized, null);
});

test("stored route readers keep only valid normalized entries", () => {
  const stringMap = readStoredStringMap(JSON.stringify({ " room-a ": " code-a ", bad: "" }));
  const lifecycleMap = readStoredLifecycleMap(
    JSON.stringify({
      roomA: { endpoint: "onion-endpoint", state: "listening", updatedAt: "4", generation: "9" },
      roomB: { endpoint: "", state: "stopped" },
    }),
  );
  assert.equal(stringMap.get("room-a"), "code-a");
  assert.equal(lifecycleMap.get("roomA")?.state, "stopped");
  assert.equal(lifecycleMap.get("roomA")?.generation, 9);
  assert.equal(lifecycleMap.has("roomB"), false);
});
})();

(() => {

test("savedInviteRoomRetryableListAction keeps retryable labels and fallback retry action", () => {
  const savedRoomActionLabelKey = (value) => `label:${value}`;
  assert.deepEqual(
    savedInviteRoomRetryableListAction("enable-private-delivery", { savedRoomActionLabelKey }),
    {
      action: "enable-private-delivery",
      labelKey: "label:enable-private-delivery",
      origin: "retryable-outbound",
    },
  );
  assert.deepEqual(
    savedInviteRoomRetryableListAction("start-receiving", { savedRoomActionLabelKey }),
    {
      action: "start-receiving",
      labelKey: "savedRoomActionStartReceivingForRetry",
      origin: "retryable-outbound",
    },
  );
  assert.deepEqual(
    savedInviteRoomRetryableListAction("verify-safety", { savedRoomActionLabelKey }),
    {
      action: "verify-safety",
      labelKey: "label:verify-safety",
      origin: "retryable-outbound",
    },
  );
  assert.deepEqual(
    savedInviteRoomRetryableListAction("unexpected", { savedRoomActionLabelKey }),
    {
      action: "retry",
      labelKey: "label:retry",
      origin: "retryable-outbound",
    },
  );
});

test("savedInviteRoomRecoveryListAction clears blocked real-onion recovery and falls back to route readiness", () => {
  const savedRoomActionLabelKey = (value, fallback) => fallback ?? `label:${value}`;
  assert.deepEqual(
    savedInviteRoomRecoveryListAction({
      receiveState: "paused",
      routeReadinessView: { action: "refresh-endpoint", labelKey: "refreshEndpoint" },
      realOnionRecovery: { action: "real-onion-retry", labelKey: "savedRoomActionRetryDelivery" },
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => true,
      savedRoomActionLabelKey,
    }),
    {
      action: "refresh-endpoint",
      labelKey: "refreshEndpoint",
      origin: "route-readiness",
    },
  );
  assert.deepEqual(
    savedInviteRoomRecoveryListAction({
      receiveState: "idle",
      routeReadinessView: { action: "refresh-endpoint", labelKey: "refreshEndpoint" },
      realOnionRecovery: { action: "real-onion-retry", labelKey: "savedRoomActionRetryDelivery" },
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => false,
      savedRoomActionLabelKey,
    }),
    {
      action: "real-onion-retry",
      labelKey: "savedRoomActionRetryDelivery",
      origin: "real-onion-recovery",
    },
  );
  assert.equal(
    savedInviteRoomRecoveryListAction({
      receiveState: "idle",
      routeReadinessView: null,
      realOnionRecovery: null,
      savedInviteRoomReceiveOwnershipBlocksRecovery: () => false,
      savedRoomActionLabelKey,
    }),
    null,
  );
});

test("savedInviteRoomImmediateListAction prioritizes receive wait peer code and route readiness actions", () => {
  const savedRoomActionLabelKey = (value, fallback) => fallback ?? `label:${value}`;
  assert.deepEqual(
    savedInviteRoomImmediateListAction({
      receiveState: "stopping",
      waitingPeerCode: true,
      routeReadinessView: { action: "start-receiving", labelKey: "savedRoomActionStartReceiving" },
      savedRoomActionLabelKey,
    }),
    {
      action: "wait-receive-stop",
      labelKey: "label:wait-receive-stop",
      origin: "receive-state",
    },
  );
  assert.deepEqual(
    savedInviteRoomImmediateListAction({
      receiveState: "idle",
      waitingPeerCode: true,
      routeReadinessView: null,
      savedRoomActionLabelKey,
    }),
    {
      action: "paste-peer-code",
      labelKey: "label:paste-peer-code",
      origin: "peer-code",
    },
  );
  assert.deepEqual(
    savedInviteRoomImmediateListAction({
      receiveState: "idle",
      waitingPeerCode: false,
      routeReadinessView: { action: "start-receiving", labelKey: "savedRoomActionStartReceiving" },
      savedRoomActionLabelKey,
    }),
    {
      action: "start-receiving",
      labelKey: "savedRoomActionStartReceiving",
      origin: "route-readiness",
    },
  );
});
})();

(() => {

test("savedInviteRoomRecoveryCandidates suppresses real-onion recovery when retry or route blockers exist", () => {
  const recovery = { action: "real-onion-retry" };
  const route = { action: "refresh-endpoint" };

  assert.deepEqual(
    savedInviteRoomRecoveryCandidates({
      hasRetryableSend: true,
      receiveOwnershipBlocksRecovery: false,
      routeReadinessViewCandidate: route,
      realOnionRecoveryViewCandidate: recovery,
    }),
    {
      realOnionRecoveryView: null,
      routeReadinessBlocksRecovery: true,
      routeReadinessView: null,
    },
  );

  assert.deepEqual(
    savedInviteRoomRecoveryCandidates({
      hasRetryableSend: false,
      receiveOwnershipBlocksRecovery: false,
      routeReadinessViewCandidate: null,
      realOnionRecoveryViewCandidate: recovery,
    }),
    {
      realOnionRecoveryView: recovery,
      routeReadinessBlocksRecovery: false,
      routeReadinessView: null,
    },
  );

  assert.deepEqual(
    savedInviteRoomRecoveryCandidates({
      hasRetryableSend: false,
      receiveOwnershipBlocksRecovery: false,
      routeReadinessViewCandidate: route,
      realOnionRecoveryViewCandidate: null,
    }),
    {
      realOnionRecoveryView: null,
      routeReadinessBlocksRecovery: true,
      routeReadinessView: route,
    },
  );
});

test("savedInviteRoomListItemDerivedState prefers fingerprint and resume-room matches", () => {
  assert.deepEqual(
    savedInviteRoomListItemDerivedState({
      currentCode: "other",
      currentRole: "joiner",
      currentRoomFingerprint: "room-1",
      roomFingerprint: "room-1",
      resumeRoom: { code: "alpha", role: "inviter" },
      viewRoom: { code: "alpha", role: "inviter" },
    }),
    {
      current: true,
      resumeRecommended: true,
    },
  );

  assert.deepEqual(
    savedInviteRoomListItemDerivedState({
      currentCode: "alpha",
      currentRole: "inviter",
      currentRoomFingerprint: "",
      roomFingerprint: "room-2",
      resumeRoom: null,
      viewRoom: { code: "alpha", role: "joiner" },
    }),
    {
      current: false,
      resumeRecommended: false,
    },
  );
});

test("savedInviteRoomListItemContext trims code and fingerprint while constraining role", () => {
  assert.deepEqual(
    savedInviteRoomListItemContext({
      currentCode: " alpha ",
      currentRole: "observer",
      currentRoomFingerprint: " room-1 ",
      resumeRoom: { code: "beta", role: "joiner" },
    }),
    {
      currentCode: "alpha",
      currentRole: "",
      currentRoomFingerprint: "room-1",
      resumeRoom: { code: "beta", role: "joiner" },
    },
  );
});

test("savedInviteRoomListItemViewRoom applies stale-retry cleanup before manual rebuild cleanup", () => {
  const calls = [];
  const room = { code: "alpha" };

  const viewRoom = savedInviteRoomListItemViewRoom({
    persist: true,
    room,
    savedInviteRoomWithoutLoadedStaleRetryable(value, options) {
      calls.push(["stale", value, options]);
      return { ...value, staleCleared: options.persist };
    },
    savedInviteRoomWithoutResolvedManualRebuild(value, options) {
      calls.push(["manual", value, options]);
      return { ...value, manualCleared: options.persist };
    },
  });

  assert.deepEqual(calls, [
    ["stale", room, { persist: true }],
    ["manual", { code: "alpha", staleCleared: true }, { persist: true }],
  ]);
  assert.deepEqual(viewRoom, {
    code: "alpha",
    staleCleared: true,
    manualCleared: true,
  });
});

test("savedInviteRoomListItemDisplayState composes next action, state, and readiness review from shared inputs", () => {
  const calls = [];
  const viewRoom = { code: "alpha" };
  const nextAction = { action: "resume" };

  const displayState = savedInviteRoomListItemDisplayState({
    current: true,
    hasRetryableSend: false,
    realOnionRecoveryView: { action: "retry" },
    receiveState: "paused",
    resumeRecommended: true,
    routeReadinessView: { action: "start-receiving" },
    savedInviteRoomListAction(room, options) {
      calls.push(["action", room, options]);
      return nextAction;
    },
    savedInviteRoomReadinessReview(view) {
      calls.push(["review", view]);
      return { blockerKey: "none", nextAction: view.nextAction.action };
    },
    savedInviteRoomState(room, options) {
      calls.push(["state", room, options]);
      return `state:${options.receiveState}:${options.resumeRecommended}`;
    },
    viewRoom,
    waitingPeerCode: false,
  });

  assert.deepEqual(displayState, {
    nextAction,
    readinessReview: { blockerKey: "none", nextAction: "resume" },
    state: "state:paused:true",
  });
  assert.deepEqual(calls, [
    [
      "action",
      viewRoom,
      {
        realOnionRecoveryView: { action: "retry" },
        receiveState: "paused",
        routeReadinessView: { action: "start-receiving" },
        waitingPeerCode: false,
      },
    ],
    [
      "state",
      viewRoom,
      {
        realOnionRecoveryView: { action: "retry" },
        receiveState: "paused",
        resumeRecommended: true,
        routeReadinessView: { action: "start-receiving" },
        waitingPeerCode: false,
      },
    ],
    [
      "review",
      {
        current: true,
        hasRetryableSend: false,
        nextAction,
        receiveState: "paused",
        resumeRecommended: true,
        state: "state:paused:true",
        waitingPeerCode: false,
      },
    ],
  ]);
});
})();

(() => {

test("savedInviteRoomResumePriorityValue keeps retryable and recovery priorities ahead of passive states", () => {
  assert.equal(savedInviteRoomResumePriorityValue({ hasRetryableOutbound: true }), 30);
  assert.equal(savedInviteRoomResumePriorityValue({ hasRealOnionRecovery: true }), 25);
  assert.equal(savedInviteRoomResumePriorityValue({ routeReadinessAction: "prepare-private-route" }), 24);
  assert.equal(savedInviteRoomResumePriorityValue({ receiveState: "stopping" }), 22);
  assert.equal(savedInviteRoomResumePriorityValue({ receiveState: "paused" }), 20);
  assert.equal(savedInviteRoomResumePriorityValue({ routeReadinessAction: "wait-receive-stop" }), 19);
  assert.equal(savedInviteRoomResumePriorityValue({ waitingPeerCode: true }), 18);
  assert.equal(savedInviteRoomResumePriorityValue({}), 0);
});

test("savedRoomActionLabelKeyValue maps saved room actions to user-facing labels", () => {
  assert.equal(savedRoomActionLabelKeyValue("enable-private-delivery"), "savedRoomActionEnableDelivery");
  assert.equal(savedRoomActionLabelKeyValue("refresh-endpoint"), "savedRoomActionUpdateDeliveryCode");
  assert.equal(savedRoomActionLabelKeyValue("retry"), "savedRoomActionRetrySavedMessage");
  assert.equal(savedRoomActionLabelKeyValue("real-onion-retry"), "savedRoomActionRetryDelivery");
  assert.equal(savedRoomActionLabelKeyValue("unknown-action", "fallback"), "fallback");
});
})();

(() => {

test("savedInviteRoomReadinessBlockerKeyValue prioritizes retry receive and route blockers", () => {
  assert.equal(savedInviteRoomReadinessBlockerKeyValue({ receiveState: "stopping" }), "receive-stopping");
  assert.equal(savedInviteRoomReadinessBlockerKeyValue({ hasRetryableSend: true }), "retryable-outbound");
  assert.equal(savedInviteRoomReadinessBlockerKeyValue({ waitingPeerCode: true }), "peer-delivery-code");
  assert.equal(savedInviteRoomReadinessBlockerKeyValue({ receiveState: "paused" }), "receive-paused");
  assert.equal(
    savedInviteRoomReadinessBlockerKeyValue({ nextAction: { action: "verify-safety" } }),
    "safety-unverified",
  );
  assert.equal(
    savedInviteRoomReadinessBlockerKeyValue({ nextAction: { action: "refresh-endpoint" } }),
    "delivery-code-needed",
  );
  assert.equal(
    savedInviteRoomReadinessBlockerKeyValue({ nextAction: { action: "real-onion-retry" } }),
    "delivery-retry-needed",
  );
});

test("savedInviteRoomReadinessSummaryKeyValue keeps listening action and resume summaries distinct", () => {
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({ receiveState: "listening" }), "roomReadinessListening");
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({ nextAction: { action: "retry" } }), "roomReadinessNeedsAction");
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({ current: true }), "roomReadinessCurrent");
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({ resumeRecommended: true }), "roomReadinessResume");
  assert.equal(savedInviteRoomReadinessSummaryKeyValue({}), "roomReadinessOpen");
});

test("savedInviteRoomReadinessNextDetailKeyValue maps retryable and passive branches", () => {
  const retryableAction = (value) => value;
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { hasRetryableSend: true, nextAction: { action: "retry-network" } },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextRetryNetwork",
  );
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { waitingPeerCode: true },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextPastePeerCode",
  );
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { receiveState: "paused" },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextStartReceive",
  );
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { nextAction: { action: "real-onion-inspect-diagnostics" } },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextInspectDiagnostics",
  );
  assert.equal(
    savedInviteRoomReadinessNextDetailKeyValue(
      { resumeRecommended: true },
      { savedInviteRoomRetryableAction: retryableAction },
    ),
    "roomReadinessNextResumeRoom",
  );
});

test("savedInviteRoomReadinessReviewValue combines delegated readiness fields", () => {
  const view = {
    nextAction: { action: "retry", labelKey: "savedRoomActionRetrySavedMessage" },
  };
  assert.deepEqual(
    savedInviteRoomReadinessReviewValue(view, {
      savedInviteRoomReadinessBlockerKey: () => "retryable-outbound",
      savedInviteRoomReadinessSummaryKey: () => "roomReadinessNeedsAction",
      savedInviteRoomReadinessNextDetailKey: () => "roomReadinessNextRetrySavedMessage",
    }),
    {
      boundaryKey: "roomReadinessBoundary",
      blockerKey: "retryable-outbound",
      nextDetailKey: "roomReadinessNextRetrySavedMessage",
      nextLabelKey: "savedRoomActionRetrySavedMessage",
      statusKey: "roomReadinessNeedsAction",
      titleKey: "roomReadinessReview",
    },
  );
});
})();
