import assert from "node:assert/strict";
import test from "node:test";
import { createSavedRoomController } from "./saved-room-controller.js";

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
