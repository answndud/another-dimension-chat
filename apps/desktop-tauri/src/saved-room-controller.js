import {
  normalizeSavedRoomManualRebuildMetadata,
  normalizedSavedRoomRetryableAction,
  normalizedSavedRoomRetryableMessage,
  normalizedSavedRoomRetryableMessageNumber,
  readSavedInviteRooms,
  roomListStoragePayload,
} from "./saved-room-storage.js";
import {
  refreshCurrentRoomAfterReceiveImport as savedRoomRefreshCurrentRoomAfterReceiveImport,
  refreshSavedInviteRoomMetadataForFingerprint as savedRoomRefreshSavedInviteRoomMetadataForFingerprint,
} from "./saved-room-refresh.js";

export function createSavedRoomController(input) {
  const {
    localStoreGet,
    localStoreSet,
    localStoreRemove,
    inviteRoomsStorageKey,
    lastInviteRoomStorageKey,
    inviteRoomMetadataValue,
    inviteRoomUpdatedAtValue,
    savedInviteRoomRetryableAction,
    productionInviteCodeProfiles,
    renderSavedInviteRooms,
    rememberReceiveIntentForRoom,
    forgetTwoProfileSessionStatusForInput,
    clearPrivateRouteFollowupForRoom,
    clearChatDeliveryNoticeForInput,
    twoProfileSafetyStorageKeys,
    clearPrivateRouteRuntimeStateForInput,
    persistPrivateRouteRuntimeState,
    showRoomDetail,
    clearCurrentInviteRoomInput,
    rememberConnectionCodeRole,
    syncTwoProfileDerivedConnectionFields,
    renderCurrentInviteCodeDisplay,
    applyProductionActionState,
    productionTwoProfileInput,
    waitForMessageRetentionPolicyReady,
    twoProfileTranscriptInputStillCurrent,
    openInviteRoomFromToken,
    stopProductionTwoProfileOnionReceiveForInput,
    currentInviteRoomCode,
    showRoomList,
    setProductionTwoProfileState,
    setText,
    t,
    applyPairwiseInviteGuidance,
    openSavedInviteRoomReceiveOwnerBeforeSwitch,
    savedInviteRoomActionIsRouteReadinessOnly,
    clearRouteReadinessOnlyFollowupContext,
    savedInviteRoomActionCanUseRetryableOutbound,
    savedInviteRoomResolvedRetryableOutbound,
    handleSavedInviteRoomMissingPendingAction,
    savedInviteRoomActionRechecksAfterOpen,
    currentSavedInviteRoomView,
    savedInviteRoomRecheckedRouteReadinessAction,
    savedInviteRoomPreservesOpenActionOrigin,
    showSavedInviteRoomReceiveStopPending,
    showSavedInviteRoomExpiredRealOnionAction,
    showSavedInviteRoomActionNowReady,
    showManualRebuildRecoveryAfterSavedRoomOpen,
    showExactRetryableOutboundPrompt,
    showSavedInviteRoomPeerCodePrompt,
    externalPeerSendReadiness,
    showRealOnionRouteReadinessBlock,
    realOnionRecoveryRunAction,
    focusLocalDiagnostic,
    runProductionTwoProfileRealOnionRoundtrip,
    showSavedInviteRoomRealOnionNeedsMessage,
    applyProductionActionStateAfterListAction,
    rememberPrivateRouteFollowup,
    renderManualRebuildDeliveryScopeGate,
    focusPrivateRouteNextAction,
    runSavedInviteRoomRetryableOutboundAction,
    openChatSettingsPanel,
    openPrivateDeliverySettings,
    manualNetworkPermissionEnabled,
    twoProfileSessionsReadyForInput,
    twoProfileSafetyConfirmedForInput,
    focusSafetyConfirmation,
    twoProfilePeerEndpointState,
    twoProfileInviteCodeModeActive,
    showPrivateRouteRetryFollowupPrompt,
    applyPeerPrivateRouteCode,
    prepareInviteRoomPrivateRouteExchange,
    refreshProductionTwoProfilePeerEndpoints,
    showLatestRetryableOutboundNotice,
    startProductionTwoProfileOnionReceive,
    stopProductionTwoProfileOnionReceive,
    savedInviteRoomRealOnionRecoveryView,
    invoke,
    enablePrivateDeliveryPermission,
    fields,
    setChatDeliveryNoticeByKey,
    openPrivateDeliveryBridgeSettings,
    window,
    savedInviteRoomMetadataFromLocalStores,
    savedInviteRoomMetadataWithSessionStatus,
    invokeInviteRoomSessionStatus,
    rememberTwoProfileSessionStatus,
    savedInviteRoomHasRetryableOutbound,
    latestTwoProfileSessionStatusForCurrentInput,
    connectionCodeRoleFor,
    allowCurrentRoomRetryableMetadataFallbackOnce,
    allowCurrentRoomRetryableMetadataFallbackOnceSet,
    currentRoomConversationMetadata,
    renderRoomStatusSummary,
    renderRoomIdentityBar,
    renderProductionTwoProfileMemory,
  } = input;

  function savedInviteRooms() {
    return readSavedInviteRooms(localStoreGet(inviteRoomsStorageKey), localStoreGet(lastInviteRoomStorageKey), {
      normalizeRetryableAction: savedInviteRoomRetryableAction,
    });
  }

  function savedInviteRoomForRoomFingerprint(roomFingerprint, rooms = savedInviteRooms()) {
    const fingerprint = String(roomFingerprint ?? "").trim();
    if (!fingerprint) {
      return null;
    }
    return (
      (Array.isArray(rooms) ? rooms : []).find(
        (room) => input.roomFingerprintForRoom(room) === fingerprint,
      ) ?? null
    );
  }

  async function preparePrivateDeliveryRoute(options = {}) {
    const forceRefresh = options.forceRefresh === true;
    const input = options.input ?? productionTwoProfileInput();
    const allowRetryRecovery = options.allowRetryRecovery !== false;
    if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
      openChatSettingsPanel(fields.productionTwoProfileB);
      setProductionTwoProfileState("Private route needs room");
      setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsRoom"));
      return;
    }
    if (!twoProfileSessionsReadyForInput(input)) {
      setProductionTwoProfileState("Private route needs ready room");
      setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsReadyRoom"));
      return;
    }
    if (!twoProfileSafetyConfirmedForInput(input)) {
      setProductionTwoProfileState("Verification required");
      setText(fields.productionTwoProfileWarning, t("sendLockedUntilVerified"));
      focusSafetyConfirmation();
      return;
    }
    if (!manualNetworkPermissionEnabled()) {
      openPrivateDeliverySettings(input);
      return;
    }
    if (twoProfilePeerEndpointState(input).ready && !forceRefresh) {
      if (allowRetryRecovery && showPrivateRouteRetryFollowupPrompt(input)) {
        return;
      }
      setProductionTwoProfileState("Private route ready");
      setText(fields.productionTwoProfileWarning, t("privateDeliveryRouteReady"));
      setChatDeliveryNoticeByKey("privateDeliveryRouteReady", "success", input);
      return;
    }

    if (twoProfileInviteCodeModeActive()) {
      const nextRouteAction = focusPrivateRouteNextAction(input, { forceRefresh });
      if (nextRouteAction === "paste-peer") {
        setProductionTwoProfileState("Peer delivery code needed");
        setText(fields.productionTwoProfileWarning, t("peerPrivateRouteCodeMissing"));
        setChatDeliveryNoticeByKey("peerPrivateRouteCodeMissing", "muted", input);
        if (allowRetryRecovery) {
          showPrivateRouteRetryFollowupPrompt(input);
        }
        return;
      }
      if (nextRouteAction === "apply-peer") {
        await applyPeerPrivateRouteCode({ allowRetryRecovery });
        return;
      }
      const localRouteCreated = await prepareInviteRoomPrivateRouteExchange(input, { allowRetryRecovery });
      if (!twoProfileTranscriptInputStillCurrent(input)) {
        return;
      }
      if (localRouteCreated && (fields.peerPrivateRouteCode?.value ?? "").trim()) {
        await applyPeerPrivateRouteCode({ allowRetryRecovery });
      }
      return;
    }

    setChatDeliveryNoticeByKey("privateDeliveryRoutePreparing", "progress", input);
    const refreshed = await refreshProductionTwoProfilePeerEndpoints(input, { allowRetryRecovery });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    if (allowRetryRecovery && refreshed && showPrivateRouteRetryFollowupPrompt(input, { clear: true })) {
      return;
    }
    if (allowRetryRecovery && refreshed && showLatestRetryableOutboundNotice(input, { allowAutomatic: false })) {
      return;
    }
    setChatDeliveryNoticeByKey(
      refreshed ? "privateDeliveryRouteReady" : "chatNoticeRefreshAddress",
      refreshed ? "success" : "warning",
      input,
    );
  }

  async function ensurePrivateDeliveryRuntimeReady(input = productionTwoProfileInput()) {
    const manualNetworkPermission = manualNetworkPermissionEnabled();
    if (!manualNetworkPermission) {
      throw new Error("ManualNetworkPermissionMissing");
    }
    const backup = await invoke("production_onion_backup_exclusion_prepare");
    const key = await invoke("production_onion_key_record_prepare", {
      profile: input.profileA,
      passphrase: input.passphrase,
    });
    const status = await invoke("production_onion_persistent_client_status");
    const client = status.persistent_client_ready
      ? status
      : await invoke("production_onion_persistent_client_start", { manualNetworkPermission });
    if (!client.persistent_client_ready) {
      throw new Error(client.next_blocker || "PersistentClientNotReady");
    }
    return { backup, key, client };
  }

  async function refreshSavedInviteRoomMetadataForFingerprint(roomFingerprint, options = {}) {
    return savedRoomRefreshSavedInviteRoomMetadataForFingerprint({
      room: savedInviteRoomForRoomFingerprint(roomFingerprint),
      roomFingerprint,
      options,
      savedInviteRoomMetadataFromLocalStores,
      savedInviteRoomMetadataWithSessionStatus,
      invokeInviteRoomSessionStatus,
      rememberTwoProfileSessionStatus,
      forgetTwoProfileSessionStatusForInput,
      rememberInviteRoom,
      renderSavedInviteRooms,
      savedInviteRoomInput,
      savedInviteRoomHasRetryableOutbound,
      latestTwoProfileSessionStatusForCurrentInput,
      roomFingerprintForRoom: (room) => input.roomFingerprintForRoom(room),
    });
  }

  function refreshCurrentRoomAfterReceiveImport(refreshPlan = {}, roomInput = productionTwoProfileInput()) {
    return savedRoomRefreshCurrentRoomAfterReceiveImport({
      refreshPlan,
      roomInput,
      twoProfileSessionsReadyForInput: input.twoProfileSessionsReadyForInput,
      rememberCurrentInviteRoomMetadata: input.rememberCurrentInviteRoomMetadata,
      renderSavedInviteRooms,
      renderRoomStatusSummary,
      renderRoomIdentityBar,
      renderProductionTwoProfileMemory,
    });
  }

  function rememberCurrentInviteRoomMetadata() {
    const code = currentInviteRoomCode();
    const role = connectionCodeRoleFor(code);
    if (!code || !role) {
      return;
    }
    const allowRetryableFallback = allowCurrentRoomRetryableMetadataFallbackOnce === true;
    allowCurrentRoomRetryableMetadataFallbackOnceSet(false);
    rememberInviteRoom(code, role, currentRoomConversationMetadata({ allowRetryableFallback }));
  }

  function rememberInviteRoom(code, role, metadata = {}, options = {}) {
    const trimmedCode = String(code ?? "").trim();
    const normalizedRole = role === "inviter" ? "inviter" : "joiner";
    if (!trimmedCode) {
      return;
    }
    const existing = savedInviteRooms().find((room) => room.code === trimmedCode) ?? {};
    const rooms = savedInviteRooms().filter((room) => room.code !== trimmedCode);
    const retryableOutboundCount = Math.max(
      0,
      Number.parseInt(inviteRoomMetadataValue(metadata, existing, "retryableOutboundCount") ?? 0, 10) || 0,
    );
    const manualRebuildMetadata = normalizeSavedRoomManualRebuildMetadata({
      manualRebuildFlow: inviteRoomMetadataValue(metadata, existing, "manualRebuildFlow"),
      manualRebuildDeliveryScope: inviteRoomMetadataValue(metadata, existing, "manualRebuildDeliveryScope"),
      manualRebuildDeliveryAction: inviteRoomMetadataValue(metadata, existing, "manualRebuildDeliveryAction"),
      manualRebuildMessageNumber: inviteRoomMetadataValue(metadata, existing, "manualRebuildMessageNumber"),
      manualRebuildUpdatedAt: inviteRoomMetadataValue(metadata, existing, "manualRebuildUpdatedAt"),
    });
    rooms.unshift({
      ...existing,
      code: trimmedCode,
      role: normalizedRole,
      updatedAt: inviteRoomUpdatedAtValue(metadata, existing),
      lastMessagePreview: String(metadata.lastMessagePreview ?? existing.lastMessagePreview ?? "").trim(),
      lastMessageAt: Number(metadata.lastMessageAt ?? existing.lastMessageAt ?? 0),
      messageCount: Math.max(
        0,
        Number.parseInt(inviteRoomMetadataValue(metadata, existing, "messageCount") ?? 0, 10) || 0,
      ),
      retryableOutboundCount,
      retryableOutboundMessageNumber: normalizedSavedRoomRetryableMessageNumber(
        retryableOutboundCount,
        inviteRoomMetadataValue(metadata, existing, "retryableOutboundMessageNumber"),
      ),
      retryableOutboundMessage: normalizedSavedRoomRetryableMessage(
        retryableOutboundCount,
        inviteRoomMetadataValue(metadata, existing, "retryableOutboundMessage"),
      ),
      retryableOutboundAction: normalizedSavedRoomRetryableAction(
        retryableOutboundCount,
        inviteRoomMetadataValue(metadata, existing, "retryableOutboundAction"),
        savedInviteRoomRetryableAction,
      ),
      ...manualRebuildMetadata,
    });
    localStoreSet(
      inviteRoomsStorageKey,
      JSON.stringify(roomListStoragePayload(rooms, { normalizeRetryableAction: savedInviteRoomRetryableAction })),
    );
    if (options.render !== false) {
      renderSavedInviteRooms();
    }
  }

  function rememberLastInviteRoom(code, role) {
    const trimmedCode = String(code ?? "").trim();
    const normalizedRole = role === "inviter" ? "inviter" : "joiner";
    if (!trimmedCode) {
      return;
    }
    localStoreSet(lastInviteRoomStorageKey, JSON.stringify({ code: trimmedCode, role: normalizedRole }));
    rememberInviteRoom(trimmedCode, normalizedRole);
  }

  function savedLastInviteRoom() {
    try {
      const saved = JSON.parse(localStoreGet(lastInviteRoomStorageKey) ?? "null");
      const code = String(saved?.code ?? "").trim();
      const role = saved?.role === "inviter" ? "inviter" : saved?.role === "joiner" ? "joiner" : "";
      return code && role ? { code, role } : null;
    } catch {
      return null;
    }
  }

  function savedInviteRoomInput(room) {
    const code = String(room?.code ?? "").trim();
    const role = room?.role === "inviter" ? "inviter" : room?.role === "joiner" ? "joiner" : "";
    if (!code || !role) {
      return { profileA: "", profileB: "", passphrase: "" };
    }
    const { localProfile, peerProfile } = productionInviteCodeProfiles(code, role);
    return { profileA: localProfile, profileB: peerProfile, passphrase: code, connectionCode: code, inviteRole: role };
  }

  function forgetInviteRoom(code) {
    const trimmedCode = String(code ?? "").trim();
    if (!trimmedCode) {
      return;
    }
    for (const role of ["inviter", "joiner"]) {
      const { localProfile, peerProfile } = productionInviteCodeProfiles(trimmedCode, role);
      const roomInput = {
        profileA: localProfile,
        profileB: peerProfile,
        passphrase: trimmedCode,
        connectionCode: trimmedCode,
        inviteRole: role,
      };
      rememberReceiveIntentForRoom(roomInput, false);
      forgetTwoProfileSessionStatusForInput(roomInput);
      clearPrivateRouteFollowupForRoom(roomInput);
      clearChatDeliveryNoticeForInput(roomInput);
      for (const key of twoProfileSafetyStorageKeys(roomInput)) {
        localStoreRemove(key);
      }
      clearPrivateRouteRuntimeStateForInput(roomInput);
    }
    persistPrivateRouteRuntimeState();
    const rooms = savedInviteRooms().filter((room) => room.code !== trimmedCode);
    localStoreSet(
      inviteRoomsStorageKey,
      JSON.stringify(roomListStoragePayload(rooms, { normalizeRetryableAction: savedInviteRoomRetryableAction })),
    );
    renderSavedInviteRooms();
  }

  function forgetLastInviteRoom(code) {
    const trimmedCode = String(code ?? "").trim();
    try {
      const saved = JSON.parse(localStoreGet(lastInviteRoomStorageKey) ?? "null");
      if (!trimmedCode || saved?.code === trimmedCode) {
        localStoreRemove(lastInviteRoomStorageKey);
      }
    } catch {
      localStoreRemove(lastInviteRoomStorageKey);
    }
    forgetInviteRoom(trimmedCode);
  }

  async function openSavedInviteRoom(room) {
    const code = String(room?.code ?? "").trim();
    const role = room?.role === "inviter" ? "inviter" : room?.role === "joiner" ? "joiner" : "";
    if (!code || !role) {
      return false;
    }
    showRoomDetail();
    clearCurrentInviteRoomInput();
    input.setCurrentInviteCodeShareVisible?.(false);
    rememberConnectionCodeRole(code, role);
    if (role === "inviter") {
      input.setLatestCreatedInviteCode?.(code);
    }
    if (fields.productionTwoProfileB) {
      fields.productionTwoProfileB.value = code;
      fields.productionTwoProfileB.dataset.inviteCodeRole = role;
    }
    syncTwoProfileDerivedConnectionFields();
    renderCurrentInviteCodeDisplay();
    applyProductionActionState();
    const openInput = productionTwoProfileInput();
    if (!(await waitForMessageRetentionPolicyReady())) {
      return false;
    }
    if (!twoProfileTranscriptInputStillCurrent(openInput)) {
      return false;
    }
    return openInviteRoomFromToken(openInput);
  }

  function removeSavedInviteRoom(room) {
    const code = String(room?.code ?? "").trim();
    if (!code) {
      return false;
    }
    if (!window.confirm(t("removeRoomConfirm"))) {
      return false;
    }
    stopProductionTwoProfileOnionReceiveForInput(savedInviteRoomInput(room), { silent: true });
    forgetInviteRoom(code);
    if (code === currentInviteRoomCode()) {
      clearCurrentInviteRoomInput();
      showRoomList();
    }
    setProductionTwoProfileState("Room removed from list");
    setText(fields.productionTwoProfileWarning, t("removeRoomNotice"));
    applyPairwiseInviteGuidance("delete", { input: savedInviteRoomInput(room), role: room?.role });
    return true;
  }

  async function runSavedInviteRoomListAction(room, action, options = {}) {
    const actionOrigin = String(options.actionOrigin ?? "").trim();
    if (
      action === "start-receiving" &&
      !savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin) &&
      await openSavedInviteRoomReceiveOwnerBeforeSwitch(room)
    ) {
      return true;
    }
    const opened = await openSavedInviteRoom(room);
    if (!opened) {
      return false;
    }
    const inputValue = productionTwoProfileInput();
    if (savedInviteRoomActionIsRouteReadinessOnly(actionOrigin)) {
      clearRouteReadinessOnlyFollowupContext(inputValue);
    }
    if (
      savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin) &&
      !savedInviteRoomResolvedRetryableOutbound(room, inputValue, action, actionOrigin)
    ) {
      await handleSavedInviteRoomMissingPendingAction(action);
      return true;
    }
    if (savedInviteRoomActionRechecksAfterOpen(action)) {
      const current = currentSavedInviteRoomView(inputValue);
      const currentRoom = current.room;
      const currentAction = current.action;
      if (currentAction && (currentAction !== action || current.actionOrigin !== actionOrigin)) {
        if (currentAction === "wait-receive-stop") {
          return showSavedInviteRoomReceiveStopPending(inputValue);
        }
        if (savedInviteRoomActionIsRouteReadinessOnly(actionOrigin)) {
          const routeRecheck = savedInviteRoomRecheckedRouteReadinessAction(action, actionOrigin, currentRoom);
          if (routeRecheck?.ready) {
            return showSavedInviteRoomActionNowReady(inputValue);
          }
          if (routeRecheck?.action && routeRecheck.action !== action) {
            return runSavedInviteRoomListAction(currentRoom, routeRecheck.action, { actionOrigin: "route-readiness" });
          }
          if (!routeRecheck?.action) {
            return showSavedInviteRoomActionNowReady(inputValue);
          }
        } else if (!savedInviteRoomPreservesOpenActionOrigin(actionOrigin)) {
          return runSavedInviteRoomListAction(currentRoom, currentAction, { actionOrigin: current.actionOrigin });
        }
      }
      if (!currentAction) {
        return String(action ?? "").startsWith("real-onion-")
          ? showSavedInviteRoomExpiredRealOnionAction(inputValue)
          : showSavedInviteRoomActionNowReady(inputValue);
      }
    }
    if (showManualRebuildRecoveryAfterSavedRoomOpen(currentSavedInviteRoomView(inputValue), inputValue)) {
      return true;
    }
    if (savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin)) {
      return runSavedInviteRoomRetryableOutboundAction(room, inputValue, action, actionOrigin);
    }
    if (action === "paste-peer-code") {
      rememberReceiveIntentForRoom(inputValue, true);
      rememberPrivateRouteFollowup("receive", inputValue);
      renderManualRebuildDeliveryScopeGate(inputValue, action);
      focusPrivateRouteNextAction(inputValue);
      return true;
    }
    if (action === "enable-private-delivery") {
      renderManualRebuildDeliveryScopeGate(inputValue, action);
      openPrivateDeliverySettings(inputValue);
      return true;
    }
    if (action === "prepare-private-route") {
      renderManualRebuildDeliveryScopeGate(inputValue, action);
      focusPrivateRouteNextAction(inputValue);
      return true;
    }
    if (action === "refresh-endpoint") {
      renderManualRebuildDeliveryScopeGate(inputValue, action);
      setChatDeliveryNoticeByKey("chatNoticeRefreshAddress", "warning", inputValue);
      await preparePrivateDeliveryRoute({ input: inputValue, forceRefresh: true, allowRetryRecovery: false });
      return true;
    }
    if (action === "verify-safety") {
      focusSafetyConfirmation();
      return true;
    }
    if (action === "start-receiving") {
      renderManualRebuildDeliveryScopeGate(inputValue, action);
      await startProductionTwoProfileOnionReceive();
      return true;
    }
    if (action === "stop-receiving") {
      stopProductionTwoProfileOnionReceive();
      return true;
    }
    if (action === "wait-receive-stop") {
      return showSavedInviteRoomReceiveStopPending(inputValue);
    }
    if (action === "real-onion-enable-private-delivery") {
      const recoveryView = savedInviteRoomRealOnionRecoveryView(room);
      if (recoveryView?.action !== action) {
        return showSavedInviteRoomExpiredRealOnionAction(inputValue);
      }
      enablePrivateDeliveryPermission();
      renderSavedInviteRooms();
      return true;
    }
    if (action === "real-onion-network-settings") {
      const recoveryView = savedInviteRoomRealOnionRecoveryView(room);
      if (recoveryView?.action !== action) {
        return showSavedInviteRoomExpiredRealOnionAction(inputValue);
      }
      const recovery = recoveryView.recovery;
      const runAction = realOnionRecoveryRunAction(recovery);
      if (runAction.opensNetworkSettings) {
        input.openPrivateDeliveryBridgeSettings?.(recovery, inputValue);
        return true;
      }
      if (runAction.ready) {
        await runProductionTwoProfileRealOnionRoundtrip();
        return true;
      }
      return true;
    }
    if (action === "real-onion-inspect-diagnostics") {
      const recoveryView = savedInviteRoomRealOnionRecoveryView(room);
      if (recoveryView?.action !== action) {
        return showSavedInviteRoomExpiredRealOnionAction(inputValue);
      }
      setText(fields.productionTwoProfileWarning, t("fieldTestNextInspectDiagnostics"));
      setChatDeliveryNoticeByKey("fieldTestNextInspectDiagnostics", "warning", inputValue);
      focusLocalDiagnostic();
      return true;
    }
    if (action === "real-onion-retry") {
      const recoveryView = savedInviteRoomRealOnionRecoveryView(room);
      if (recoveryView?.action !== action) {
        return showSavedInviteRoomExpiredRealOnionAction(inputValue);
      }
      const routeReadiness = externalPeerSendReadiness(inputValue, {
        allowMissingMessage: true,
        latestOnionOutbound: null,
      });
      if (!routeReadiness.ready) {
        showRealOnionRouteReadinessBlock(routeReadiness, inputValue);
        applyProductionActionStateAfterListAction();
        return true;
      }
      if (showSavedInviteRoomRealOnionNeedsMessage(inputValue)) {
        applyProductionActionStateAfterListAction();
        return true;
      }
      await runProductionTwoProfileRealOnionRoundtrip();
      return true;
    }
    if (action === "review-send" || action === "retry" || action === "retry-network" || action === "refresh-and-retry") {
      return runSavedInviteRoomRetryableOutboundAction(room, inputValue, action, actionOrigin);
    }
    if (action === "paste-peer-code") {
      return showSavedInviteRoomPeerCodePrompt(inputValue);
    }
    return false;
  }

  return {
    forgetInviteRoom,
    forgetLastInviteRoom,
    openSavedInviteRoom,
    rememberInviteRoom,
    rememberLastInviteRoom,
    removeSavedInviteRoom,
    runSavedInviteRoomListAction,
    preparePrivateDeliveryRoute,
    ensurePrivateDeliveryRuntimeReady,
    refreshSavedInviteRoomMetadataForFingerprint,
    refreshCurrentRoomAfterReceiveImport,
    rememberCurrentInviteRoomMetadata,
    savedInviteRoomInput,
    savedInviteRooms,
    savedLastInviteRoom,
  };
}
