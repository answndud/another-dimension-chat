export function sendRuntimeOwnerMismatch(result) {
  return Boolean(result?.owner_profile_bound === true && result?.owner_matches_send_profile === false);
}

export function sendAttemptFailureText(result) {
  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  return [result?.next_blocker, result?.warning, ...blockers].join(" ").toLowerCase();
}

export function sendFailureNeedsRouteSetup(text) {
  return (
    text.includes("peer-endpoint-missing") ||
    text.includes("endpoint-missing") ||
    text.includes("endpointunavailable") ||
    text.includes("stored remote endpoint unavailable") ||
    text.includes("runtimeownerprofilemismatch")
  );
}

export function sendFailureNeedsStartReceiving(text) {
  return (
    text.includes("localonionendpointnotready") ||
    text.includes("local onion endpoint not ready") ||
    text.includes("receive stopped") ||
    text.includes("receive mode stopped") ||
    text.includes("message listening stopped") ||
    text.includes("message listening is off")
  );
}

export function sendFailureNeedsEndpointRefresh(text) {
  return !sendFailureNeedsRouteSetup(text) && (text.includes("stale") || text.includes("refresh"));
}

export function sendFailureNeedsNetworkRetry(text) {
  const normalized = String(text ?? "").toLowerCase();
  return normalized.includes("persistentclientnotready") || normalized.includes("bootstrap");
}

export function localizedSendFailureMessage(input) {
  const { error, t, sendFailureNeedsStartReceiving, sendFailureNeedsRouteSetup, sendFailureNeedsEndpointRefresh, sendFailureNeedsNetworkRetry } = input;
  const text = String(error ?? "").toLowerCase();
  if (sendFailureNeedsStartReceiving(text)) {
    return t("externalSendNeedsReceive");
  }
  if (text.includes("timeout")) {
    return t("sendTimeout");
  }
  if (sendFailureNeedsRouteSetup(text)) {
    return t("privateDeliveryRouteNeeded");
  }
  if (sendFailureNeedsEndpointRefresh(text)) {
    return t("staleEndpoint");
  }
  if (sendFailureNeedsNetworkRetry(text)) {
    return t("retryNetwork");
  }
  if (text.includes("manualnetworkpermission") || text.includes("permission")) {
    return t("permissionOff");
  }
  if (text.includes("offline") || text.includes("peer")) {
    return t("peerOffline");
  }
  return t("sendFailedGeneric");
}

export function localizedSendAttemptMessage(input) {
  const { result, t, sendAttemptFailureText, sendRuntimeOwnerMismatch, sendFailureNeedsStartReceiving, sendFailureNeedsRouteSetup, sendFailureNeedsNetworkRetry, localizedSendFailureMessage } = input;
  const failureText = sendAttemptFailureText(result);
  if (result?.send_attempt_succeeded) {
    return t("chatNoticeExternalSendWritten");
  }
  if (sendRuntimeOwnerMismatch(result)) {
    return t("sendRuntimeMismatch");
  }
  if (sendFailureNeedsStartReceiving(failureText)) {
    return t("externalSendNeedsReceive");
  }
  if (sendFailureNeedsRouteSetup(failureText)) {
    return t("privateDeliveryRouteNeeded");
  }
  if (result?.peer_endpoint_refresh_recommended || result?.retry_recommended_after_endpoint_refresh) {
    return t("chatNoticeRefreshAddress");
  }
  if (sendFailureNeedsNetworkRetry(failureText)) {
    return t("retryNetwork");
  }
  return localizedSendFailureMessage({ error: failureText, t, sendFailureNeedsStartReceiving, sendFailureNeedsRouteSetup, sendFailureNeedsEndpointRefresh: input.sendFailureNeedsEndpointRefresh, sendFailureNeedsNetworkRetry });
}

export function outboundEntryMatchesCurrentDirection(entry, input = {}) {
  return entry?.sender === input.profileA && entry?.receiver === input.profileB;
}

export function inviteModeEndpointRefreshAction(input = {}) {
  const peerEndpointState = input.peerEndpointState ?? {};
  if (peerEndpointState.ready) {
    return { kind: "retry-now" };
  }
  if (input.nextRouteAction === "create-local") {
    return { kind: "prepare-local-route" };
  }
  if (input.nextRouteAction === "apply-peer") {
    return { kind: "apply-peer-route" };
  }
  if (peerEndpointState.stale) {
    return {
      kind: "warn-stale-route",
      state: "Peer address refresh needed",
      noticeKey: "chatNoticeRefreshAddress",
      tone: "warning",
      warningKey: "chatNoticeRefreshAddress",
    };
  }
  return {
    kind: "warn-missing-peer-route",
    state: "Peer delivery code needed",
    noticeKey: "peerPrivateRouteCodeMissing",
    tone: "muted",
    warningKey: "peerPrivateRouteCodeMissing",
  };
}

export async function resolveOutboundEntryForAction(entry, input = {}) {
  const restored = await input.restoreInviteRoomForConversationEntry(entry);
  if (!restored) {
    return { ok: false, reason: "room-restore-failed", entry: null };
  }
  const currentEntry = input.currentTwoProfileRetryableOutboundEntry(entry);
  if (!currentEntry) {
    input.showCurrentRetryableOutboundMissing(entry);
    return { ok: false, reason: "missing-current-entry", entry: null };
  }
  return { ok: true, reason: "resolved", entry: currentEntry };
}

export function createChatDeliveryNoticeController(input) {
  const {
    document,
    fields,
    t,
    productionTwoProfileInput,
    twoProfileInviteCodeModeActive,
    twoProfileSessionStatusFingerprint,
    currentActiveLocalPrivateRouteCode,
    currentTwoProfileRetryableOutboundEntry,
    currentTwoProfileOutboundPrimaryAction,
    currentTwoProfileOutboundActionState,
    showCurrentRetryableOutboundMissing,
    runTwoProfileOutboundPrimaryAction,
    cancelTwoProfileOutboundEntry,
    startProductionTwoProfileOnionReceive,
    stopProductionTwoProfileOnionReceive,
    preparePrivateDeliveryRoute,
    copyLocalPrivateRouteCode,
    enablePrivateDeliveryPermission,
    focusSafetyConfirmation,
    productionTwoProfileOutboundStatusLabel,
    productionTwoProfileReceiveMatchesInput,
    setLatestChatDeliveryNoticeKey,
    setLatestChatDeliveryNoticeTone,
    setLatestChatDeliveryNoticeRoomFingerprint,
    setLatestChatDeliveryNoticePendingOutbound,
    latestChatDeliveryNoticeKey,
    latestChatDeliveryNoticeTone,
    latestChatDeliveryNoticeRoomFingerprint,
    latestChatDeliveryNoticePendingOutbound,
  } = input;

  function chatDeliveryNoticeRoomFingerprint(roomInput = productionTwoProfileInput()) {
    return roomInput.profileA && roomInput.profileB && roomInput.profileA !== roomInput.profileB && roomInput.passphrase
      ? twoProfileSessionStatusFingerprint(roomInput)
      : "";
  }

  function chatDeliveryNoticeMatchesInput(roomInput = productionTwoProfileInput()) {
    return latestChatDeliveryNoticeRoomFingerprint() === chatDeliveryNoticeRoomFingerprint(roomInput);
  }

  function clearLatestChatDeliveryNoticeState() {
    setLatestChatDeliveryNoticeKey("");
    setLatestChatDeliveryNoticeTone("neutral");
    setLatestChatDeliveryNoticeRoomFingerprint("");
    setLatestChatDeliveryNoticePendingOutbound(null);
  }

  function clearMismatchedChatDeliveryNotice(roomInput = productionTwoProfileInput()) {
    if (!latestChatDeliveryNoticeKey() || chatDeliveryNoticeMatchesInput(roomInput)) {
      return false;
    }
    setChatDeliveryNoticeByKey("", "neutral", roomInput);
    return true;
  }

  function clearChatDeliveryNoticeForInput(roomInput = productionTwoProfileInput()) {
    if (!latestChatDeliveryNoticeKey() || !chatDeliveryNoticeMatchesInput(roomInput)) {
      return false;
    }
    setChatDeliveryNoticeByKey("", "neutral", roomInput);
    return true;
  }

  function setChatDeliveryNotice(message = "", tone = "neutral", options = {}) {
    if (!fields.chatDeliveryNotice) {
      return;
    }
    const text = String(message ?? "").trim();
    const pendingEntry = options.pendingEntry ?? null;
    const primaryAction = pendingEntry ? currentTwoProfileOutboundPrimaryAction(pendingEntry) : null;
    fields.chatDeliveryNotice.className = [
      "chat-delivery-notice",
      text ? "is-visible" : "",
      tone ? `is-${tone}` : "",
      primaryAction ? "is-recovery" : "",
    ]
      .filter(Boolean)
      .join(" ");
    fields.chatDeliveryNotice.replaceChildren();
    if (!text) {
      return;
    }
    const statusLabel = document.createElement("strong");
    statusLabel.className = "chat-delivery-notice-label";
    statusLabel.textContent = t(primaryAction ? "sendRecoveryPanelTitle" : "roomStatusLabel");
    const messageText = document.createElement("span");
    messageText.className = "chat-delivery-notice-text";
    messageText.textContent = text;
    fields.chatDeliveryNotice.append(statusLabel, messageText);
    if (primaryAction) {
      const outboundActionState = currentTwoProfileOutboundActionState(
        pendingEntry,
        productionTwoProfileInput(),
        twoProfileInviteCodeModeActive(),
      );
      const reason = document.createElement("span");
      reason.className = "chat-delivery-notice-chip";
      reason.textContent = t(primaryAction.recoveryKey || "sendRecoveryGeneric");
      const next = document.createElement("span");
      next.className = "chat-delivery-notice-chip is-next";
      next.textContent = outboundRecoveryNextText(primaryAction, outboundActionState);
      const actions = document.createElement("span");
      actions.className = "chat-delivery-notice-actions";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "chat-delivery-notice-action";
      retry.textContent = t(primaryAction.labelKey || "retrySend");
      retry.disabled = !outboundActionState.canRunNow;
      retry.title = outboundActionState.disabledReason || "";
      retry.addEventListener("click", () => {
        const current = currentTwoProfileOutboundAction(pendingEntry, { requireNoticeMatch: true });
        if (current) {
          runTwoProfileOutboundPrimaryAction(current.entry, current.primaryAction);
        }
      });
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "chat-delivery-notice-action is-cancel";
      cancel.textContent = t("cancelSend");
      cancel.disabled = !outboundActionState.canCancelNow;
      cancel.title = outboundActionState.cancelDisabledReason || "";
      cancel.addEventListener("click", () => {
        const currentEntry = currentTwoProfileOutboundCancelableEntry(pendingEntry, { requireNoticeMatch: true });
        if (currentEntry) {
          cancelTwoProfileOutboundEntry(currentEntry);
        }
      });
      actions.append(retry, cancel);
      fields.chatDeliveryNotice.append(reason, next, actions);
      return;
    }
    if (latestChatDeliveryNoticeKey() === "privateDeliveryRouteNeeded") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = t("preparePrivateRoute");
      action.addEventListener("click", () => preparePrivateDeliveryRoute({ allowRetryRecovery: false }));
      fields.chatDeliveryNotice.append(action);
    } else if (latestChatDeliveryNoticeKey() === "sendRuntimeMismatch") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = t("preparePrivateRoute");
      action.addEventListener("click", () => preparePrivateDeliveryRoute({ forceRefresh: true, allowRetryRecovery: false }));
      fields.chatDeliveryNotice.append(action);
    } else if (
      (latestChatDeliveryNoticeKey() === "peerPrivateRouteCodeMissing" ||
        latestChatDeliveryNoticeKey() === "privateRouteWaitingPeerCode") &&
      currentActiveLocalPrivateRouteCode()
    ) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = t("copyPrivateRouteCode");
      action.addEventListener("click", copyLocalPrivateRouteCode);
      fields.chatDeliveryNotice.append(action);
    } else if (latestChatDeliveryNoticeKey() === "privateDeliveryRouteReady") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = productionTwoProfileReceiveMatchesInput(productionTwoProfileInput())
        ? t("roomActionSend")
        : t("startReceiving");
      action.addEventListener("click", () => {
        const roomInput = productionTwoProfileInput();
        if (!chatDeliveryNoticeMatchesInput(roomInput)) {
          return;
        }
        if (productionTwoProfileReceiveMatchesInput(roomInput)) {
          fields.productionTwoProfileMessage?.focus?.({ preventScroll: true });
          return;
        }
        startProductionTwoProfileOnionReceive();
      });
      fields.chatDeliveryNotice.append(action);
    } else if (
      latestChatDeliveryNoticeKey() === "messageSavedPrivateDeliveryOff" ||
      latestChatDeliveryNoticeKey() === "chatNoticeNetworkPermission"
    ) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = t("enablePrivateDelivery");
      action.addEventListener("click", () => enablePrivateDeliveryPermission());
      fields.chatDeliveryNotice.append(action);
    } else if (latestChatDeliveryNoticeKey() === "sendLockedUntilVerified") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = t("comparePhraseAction");
      action.addEventListener("click", focusSafetyConfirmation);
      fields.chatDeliveryNotice.append(action);
    } else if (
      latestChatDeliveryNoticeKey() === "chatNoticeReceiveStopped" ||
      latestChatDeliveryNoticeKey() === "receiveStartFailed"
    ) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = t("startReceiving");
      action.addEventListener("click", startProductionTwoProfileOnionReceive);
      fields.chatDeliveryNotice.append(action);
    } else if (latestChatDeliveryNoticeKey() === "receiveRuntimeMismatch") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = t("stopReceiving");
      action.addEventListener("click", stopProductionTwoProfileOnionReceive);
      fields.chatDeliveryNotice.append(action);
    } else if (currentActiveLocalPrivateRouteCode() && latestChatDeliveryNoticeKey() === "privateRouteCodeReady") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chat-delivery-notice-action";
      action.textContent = t("copyPrivateRouteCode");
      action.addEventListener("click", copyLocalPrivateRouteCode);
      fields.chatDeliveryNotice.append(action);
    }
  }

  function setChatDeliveryNoticeByKey(key, tone = "neutral", roomInput = productionTwoProfileInput()) {
    setLatestChatDeliveryNoticeKey(key || "");
    setLatestChatDeliveryNoticeTone(tone || "neutral");
    setLatestChatDeliveryNoticeRoomFingerprint(key ? chatDeliveryNoticeRoomFingerprint(roomInput) : "");
    setLatestChatDeliveryNoticePendingOutbound(null);
    setChatDeliveryNotice(key ? t(key) : "", tone);
  }

  function outboundRecoveryMessage(primaryAction) {
    return t(primaryAction?.recoveryKey || "sendRecoveryGeneric");
  }

  function outboundRecoveryNextText(primaryAction, outboundActionState = null) {
    if (!primaryAction) {
      return "";
    }
    if (outboundActionState && !outboundActionState.canRunNow) {
      return outboundActionState.disabledReason || outboundRecoveryMessage(primaryAction);
    }
    return `${t("sendRecoveryNext")}: ${t(primaryAction.labelKey || "retrySend")}`;
  }

  function currentTwoProfileOutboundAction(entry, options = {}) {
    const input = productionTwoProfileInput();
    if (options.requireNoticeMatch === true && !chatDeliveryNoticeMatchesInput(input)) {
      return null;
    }
    if (options.requireNoticeMatch === true && !chatDeliveryNoticePendingOutboundMatchesEntry(entry, input)) {
      return null;
    }
    const currentEntry = currentTwoProfileRetryableOutboundEntry(entry);
    if (!currentEntry) {
      return null;
    }
    const outboundActionState = currentTwoProfileOutboundActionState(
      currentEntry,
      input,
      twoProfileInviteCodeModeActive(),
    );
    if (!outboundActionState.canRunNow) {
      return null;
    }
    return {
      entry: currentEntry,
      primaryAction: currentTwoProfileOutboundPrimaryAction(currentEntry, input),
    };
  }

  function currentTwoProfileOutboundCancelableEntry(entry, options = {}) {
    const input = productionTwoProfileInput();
    if (options.requireNoticeMatch === true && !chatDeliveryNoticeMatchesInput(input)) {
      return null;
    }
    if (options.requireNoticeMatch === true && !chatDeliveryNoticePendingOutboundMatchesEntry(entry, input)) {
      return null;
    }
    const currentEntry = currentTwoProfileRetryableOutboundEntry(entry);
    if (!currentEntry) {
      return null;
    }
    const outboundActionState = currentTwoProfileOutboundActionState(
      currentEntry,
      input,
      twoProfileInviteCodeModeActive(),
    );
    return outboundActionState.canCancelNow ? currentEntry : null;
  }

  function setChatDeliveryNoticeForPendingOutbound(entry, roomInput = productionTwoProfileInput()) {
    const primaryAction = currentTwoProfileOutboundPrimaryAction(entry, roomInput);
    setLatestChatDeliveryNoticeKey(primaryAction.noticeKey || "sendFailedGeneric");
    setLatestChatDeliveryNoticeTone(primaryAction.action === "enable-private-delivery" ? "muted" : "warning");
    setLatestChatDeliveryNoticeRoomFingerprint(chatDeliveryNoticeRoomFingerprint(roomInput));
    setLatestChatDeliveryNoticePendingOutbound({
      roomFingerprint: String(entry?.roomFingerprint ?? twoProfileSessionStatusFingerprint(roomInput)).trim(),
      sender: String(entry?.sender ?? "").trim(),
      receiver: String(entry?.receiver ?? "").trim(),
      messageNumber: Number.parseInt(entry?.messageNumber, 10) || 0,
      message: String(entry?.message ?? "").trim(),
    });
    setChatDeliveryNotice(t(primaryAction.recoveryKey || "sendRecoveryGeneric"), latestChatDeliveryNoticeTone(), {
      pendingEntry: entry,
    });
  }

  function chatDeliveryNoticePendingOutboundMatchesEntry(entry, roomInput = productionTwoProfileInput()) {
    const pending = latestChatDeliveryNoticePendingOutbound();
    if (!pending || !entry || !chatDeliveryNoticeMatchesInput(roomInput)) {
      return false;
    }
    return (
      String(entry.roomFingerprint ?? "").trim() === String(pending.roomFingerprint ?? "").trim() &&
      String(entry.sender ?? "").trim().toLowerCase() === String(pending.sender ?? "").trim().toLowerCase() &&
      String(entry.receiver ?? "").trim().toLowerCase() === String(pending.receiver ?? "").trim().toLowerCase() &&
      Number.parseInt(entry.messageNumber, 10) === Number.parseInt(pending.messageNumber, 10) &&
      String(entry.message ?? "").trim() === String(pending.message ?? "").trim()
    );
  }

  function restoreLatestChatDeliveryPendingOutbound(roomInput = productionTwoProfileInput()) {
    const pending = latestChatDeliveryNoticePendingOutbound();
    if (!pending || !chatDeliveryNoticeMatchesInput(roomInput)) {
      return null;
    }
    const entry = currentTwoProfileRetryableOutboundEntry(pending);
    if (!entry) {
      return null;
    }
    const sender = String(entry.sender ?? "").trim();
    const receiver = String(entry.receiver ?? "").trim();
    const message = String(entry.message ?? "").trim();
    const roomFingerprint = String(entry.roomFingerprint ?? "").trim();
    if (
      roomFingerprint !== String(pending.roomFingerprint ?? "").trim() ||
      sender !== String(pending.sender ?? "").trim() ||
      receiver !== String(pending.receiver ?? "").trim() ||
      message !== String(pending.message ?? "").trim()
    ) {
      return null;
    }
    return entry;
  }

  function chatDeliveryPendingOutboundSnapshot(roomInput = productionTwoProfileInput()) {
    if (!latestChatDeliveryNoticePendingOutbound() || !chatDeliveryNoticeMatchesInput(roomInput)) {
      return null;
    }
    return { ...latestChatDeliveryNoticePendingOutbound() };
  }

  function restoreChatDeliveryPendingOutboundSnapshot(snapshot, roomInput = productionTwoProfileInput()) {
    if (!snapshot || chatDeliveryNoticeRoomFingerprint(roomInput) !== String(snapshot.roomFingerprint ?? "").trim()) {
      return false;
    }
    const entry = currentTwoProfileRetryableOutboundEntry(snapshot);
    if (!entry) {
      return false;
    }
    setChatDeliveryNoticeForPendingOutbound(entry, roomInput);
    return true;
  }

  function rerenderLatestChatDeliveryNotice(roomInput = productionTwoProfileInput()) {
    if (!latestChatDeliveryNoticeKey()) {
      return false;
    }
    if (!chatDeliveryNoticeMatchesInput(roomInput)) {
      setChatDeliveryNoticeByKey("", "neutral", roomInput);
      return true;
    }
    if (latestChatDeliveryNoticePendingOutbound()) {
      const pending = restoreLatestChatDeliveryPendingOutbound(roomInput);
      if (pending) {
        setChatDeliveryNoticeForPendingOutbound(pending, roomInput);
        return true;
      }
      showCurrentRetryableOutboundMissing(latestChatDeliveryNoticePendingOutbound());
      return true;
    }
    setChatDeliveryNoticeByKey(latestChatDeliveryNoticeKey(), latestChatDeliveryNoticeTone(), roomInput);
    return true;
  }

  return {
    chatDeliveryNoticeRoomFingerprint,
    chatDeliveryNoticeMatchesInput,
    clearLatestChatDeliveryNoticeState,
    clearMismatchedChatDeliveryNotice,
    clearChatDeliveryNoticeForInput,
    setChatDeliveryNotice,
    setChatDeliveryNoticeByKey,
    setChatDeliveryNoticeForPendingOutbound,
    chatDeliveryNoticePendingOutboundMatchesEntry,
    restoreLatestChatDeliveryPendingOutbound,
    chatDeliveryPendingOutboundSnapshot,
    restoreChatDeliveryPendingOutboundSnapshot,
    rerenderLatestChatDeliveryNotice,
  };
}
