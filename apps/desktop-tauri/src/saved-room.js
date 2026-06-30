export const lastInviteRoomStorageKey = "ad.lastInviteRoom.v1";
export const inviteRoomsStorageKey = "ad.inviteRooms.v1";
export const receiveIntentRoomsStorageKey = "ad.receiveIntentRooms.v1";
export const localPrivateRouteCodesStorageKey = "ad.localPrivateRouteCodes.v1";
export const localPrivateRouteLifecycleStorageKey = "ad.localPrivateRouteLifecycle.v1";
export const peerPrivateRouteDraftsStorageKey = "ad.peerPrivateRouteDrafts.v1";
export const realOnionRecoveriesStorageKey = "ad.realOnionRecoveries.v1";
export const savedInviteRoomStorageLimit = 24;
export const savedRoomMetadataStartupSyncLimit = 8;
export const realOnionRecoveryPersistenceTtlMs = 24 * 60 * 60 * 1000;
export const manualRebuildRecoveryPersistenceTtlMs = 7 * 24 * 60 * 60 * 1000;
export const privateRouteMapStorageLimit = 48;

export function connectionCodeRoleStorageKey(code, slugify) {
  const slug = slugify(code);
  return `ad.connectionCodeRole.v1.${encodeURIComponent(slug)}`;
}

export function normalizeStoredRealOnionRecovery(record, options = {}) {
  const action = String(record?.action ?? "").trim();
  const reason = String(record?.reason ?? "").trim();
  const now = Number.parseInt(options.now ?? Date.now(), 10) || Date.now();
  const updatedAt = Number.parseInt(record?.updatedAt ?? 0, 10) || now;
  if (
    !new Set([
      "bootstrap-cancelled",
      "enable-private-delivery",
      "inspect-diagnostics",
      "prepare-network-or-bridge",
      "retry-bootstrap",
      "retry-private-delivery",
    ]).has(action)
  ) {
    return null;
  }
  if (updatedAt + realOnionRecoveryPersistenceTtlMs < now) {
    return null;
  }
  return {
    action,
    retryable: record?.retryable === true,
    waitCancellable: false,
    reason: /^[a-z0-9-]{1,96}$/.test(reason) ? reason : "persisted-recovery",
    updatedAt,
  };
}

export function readStoredStringMap(raw, limit = privateRouteMapStorageLimit) {
  const target = new Map();
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const entries = Object.entries(parsed && typeof parsed === "object" ? parsed : {});
    for (const [roomKey, routeCode] of entries.slice(-limit)) {
      const key = String(roomKey ?? "").trim();
      const value = String(routeCode ?? "").trim();
      if (key && value) {
        target.set(key, value);
      }
    }
  } catch {
    target.clear();
  }
  return target;
}

export function serializeStoredStringMap(source, limit = privateRouteMapStorageLimit) {
  return [...source.entries()]
    .map(([roomKey, routeCode]) => [String(roomKey ?? "").trim(), String(routeCode ?? "").trim()])
    .filter(([roomKey, routeCode]) => roomKey && routeCode)
    .slice(-limit);
}

export function readStoredLifecycleMap(raw, limit = privateRouteMapStorageLimit) {
  const target = new Map();
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const entries = Object.entries(parsed && typeof parsed === "object" ? parsed : {});
    for (const [roomKey, record] of entries.slice(-limit)) {
      const key = String(roomKey ?? "").trim();
      const endpoint = String(record?.endpoint ?? "").trim();
      const state = String(record?.state ?? "").trim() === "listening"
        ? "stopped"
        : String(record?.state ?? "").trim();
      if (key && endpoint && state) {
        target.set(key, {
          endpoint,
          state,
          updatedAt: Number.parseInt(record?.updatedAt ?? 0, 10) || 0,
          generation: Number.parseInt(record?.generation ?? 0, 10) || 0,
        });
      }
    }
  } catch {
    target.clear();
  }
  return target;
}

export function serializeStoredLifecycleMap(source, limit = privateRouteMapStorageLimit) {
  return [...source.entries()]
    .map(([roomKey, record]) => [
      String(roomKey ?? "").trim(),
      {
        endpoint: String(record?.endpoint ?? "").trim(),
        state: String(record?.state ?? "").trim(),
        updatedAt: Number.parseInt(record?.updatedAt ?? 0, 10) || 0,
        generation: Number.parseInt(record?.generation ?? 0, 10) || 0,
      },
    ])
    .filter(([roomKey, record]) => roomKey && record.endpoint && record.state)
    .slice(-limit);
}

export function normalizedSavedRoomManualRebuildFlow(value) {
  return value === true || value === "true";
}

export function normalizedSavedRoomManualRebuildDeliveryScope(value) {
  const normalized = String(value ?? "").trim();
  return new Set(["retry", "receive", "delivery-code", "explicit-delivery"]).has(normalized)
    ? normalized
    : "";
}

export function normalizedSavedRoomManualRebuildDeliveryAction(value) {
  const normalized = String(value ?? "").trim();
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : "";
}

export function normalizedSavedRoomManualRebuildMessageNumber(value) {
  return Math.max(0, Number.parseInt(value ?? 0, 10) || 0);
}

export function savedRoomManualRebuildUpdatedAtValue(value) {
  return Number(value ?? 0) || 0;
}

export function savedRoomManualRebuildExpired(updatedAt, now = Date.now()) {
  const timestamp = savedRoomManualRebuildUpdatedAtValue(updatedAt);
  return Boolean(timestamp && now - timestamp > manualRebuildRecoveryPersistenceTtlMs);
}

export function normalizeSavedRoomManualRebuildMetadata(room, now = Date.now()) {
  const manualRebuildUpdatedAt = savedRoomManualRebuildUpdatedAtValue(room?.manualRebuildUpdatedAt);
  const manualRebuildFlow =
    normalizedSavedRoomManualRebuildFlow(room?.manualRebuildFlow) &&
    !savedRoomManualRebuildExpired(manualRebuildUpdatedAt, now);
  return {
    manualRebuildFlow,
    manualRebuildDeliveryScope: manualRebuildFlow
      ? normalizedSavedRoomManualRebuildDeliveryScope(room?.manualRebuildDeliveryScope)
      : "",
    manualRebuildDeliveryAction: manualRebuildFlow
      ? normalizedSavedRoomManualRebuildDeliveryAction(room?.manualRebuildDeliveryAction)
      : "",
    manualRebuildMessageNumber: manualRebuildFlow
      ? normalizedSavedRoomManualRebuildMessageNumber(room?.manualRebuildMessageNumber)
      : 0,
    manualRebuildUpdatedAt: manualRebuildFlow ? manualRebuildUpdatedAt : 0,
  };
}

export function inviteRoomMetadataWithoutManualRebuild(room) {
  return {
    ...room,
    manualRebuildFlow: false,
    manualRebuildDeliveryScope: "",
    manualRebuildDeliveryAction: "",
    manualRebuildMessageNumber: 0,
    manualRebuildUpdatedAt: 0,
  };
}

export function normalizedSavedRoomRetryableMessageNumber(count, value) {
  return count > 0 ? Number.parseInt(value ?? 0, 10) || 0 : 0;
}

export function normalizedSavedRoomRetryableAction(count, value, normalizeAction) {
  return count > 0 ? normalizeAction(value) : "";
}

export function normalizedSavedRoomRetryableMessage(count, value) {
  return count > 0 ? String(value ?? "").trim() : "";
}

export function readSavedInviteRooms(inviteRoomsRaw, lastInviteRoomRaw, options = {}) {
  const normalizeAction = options.normalizeRetryableAction ?? ((value) => String(value ?? "").trim());
  const now = options.now ?? Date.now();
  let rooms = [];
  try {
    const parsed = JSON.parse(inviteRoomsRaw ?? "[]");
    if (Array.isArray(parsed)) {
      rooms = parsed
        .map((room) => {
          const retryableOutboundCount = Math.max(0, Number.parseInt(room?.retryableOutboundCount ?? 0, 10) || 0);
          const manualRebuildMetadata = normalizeSavedRoomManualRebuildMetadata(room, now);
          return {
            code: String(room?.code ?? "").trim(),
            role: room?.role === "inviter" ? "inviter" : room?.role === "joiner" ? "joiner" : "",
            updatedAt: Number(room?.updatedAt ?? 0),
            lastMessagePreview: String(room?.lastMessagePreview ?? "").trim(),
            lastMessageAt: Number(room?.lastMessageAt ?? 0),
            messageCount: Math.max(0, Number.parseInt(room?.messageCount ?? 0, 10) || 0),
            retryableOutboundCount,
            retryableOutboundMessageNumber: normalizedSavedRoomRetryableMessageNumber(
              retryableOutboundCount,
              room?.retryableOutboundMessageNumber,
            ),
            retryableOutboundMessage: normalizedSavedRoomRetryableMessage(
              retryableOutboundCount,
              room?.retryableOutboundMessage,
            ),
            retryableOutboundAction: normalizedSavedRoomRetryableAction(
              retryableOutboundCount,
              room?.retryableOutboundAction,
              normalizeAction,
            ),
            ...manualRebuildMetadata,
          };
        })
        .filter((room) => room.code && room.role);
    }
  } catch {
    rooms = [];
  }
  try {
    const saved = JSON.parse(lastInviteRoomRaw ?? "null");
    const code = String(saved?.code ?? "").trim();
    const role = saved?.role === "inviter" ? "inviter" : saved?.role === "joiner" ? "joiner" : "";
    if (code && role && !rooms.some((room) => room.code === code)) {
      rooms.push({
        code,
        role,
        updatedAt: 0,
        lastMessagePreview: "",
        lastMessageAt: 0,
        messageCount: 0,
        retryableOutboundCount: 0,
        retryableOutboundMessageNumber: 0,
        retryableOutboundMessage: "",
        retryableOutboundAction: "",
        manualRebuildFlow: false,
        manualRebuildDeliveryScope: "",
        manualRebuildDeliveryAction: "",
        manualRebuildMessageNumber: 0,
        manualRebuildUpdatedAt: 0,
      });
    }
  } catch {
    // Ignore legacy room migration failures.
  }
  return rooms.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function roomListStoragePayload(rooms, options = {}) {
  const normalizeAction = options.normalizeRetryableAction ?? ((value) => String(value ?? "").trim());
  const now = options.now ?? Date.now();
  return rooms.slice(0, savedInviteRoomStorageLimit).map((room) => {
    const retryableOutboundCount = Math.max(0, Number.parseInt(room.retryableOutboundCount ?? 0, 10) || 0);
    const manualRebuildMetadata = normalizeSavedRoomManualRebuildMetadata(room, now);
    return {
      code: room.code,
      role: room.role,
      updatedAt: Number(room.updatedAt ?? 0),
      lastMessagePreview: String(room.lastMessagePreview ?? "").trim(),
      lastMessageAt: Number(room.lastMessageAt ?? 0),
      messageCount: Math.max(0, Number.parseInt(room.messageCount ?? 0, 10) || 0),
      retryableOutboundCount,
      retryableOutboundMessageNumber: normalizedSavedRoomRetryableMessageNumber(
        retryableOutboundCount,
        room.retryableOutboundMessageNumber,
      ),
      retryableOutboundMessage: normalizedSavedRoomRetryableMessage(
        retryableOutboundCount,
        room.retryableOutboundMessage,
      ),
      retryableOutboundAction: normalizedSavedRoomRetryableAction(
        retryableOutboundCount,
        room.retryableOutboundAction,
        normalizeAction,
      ),
      ...manualRebuildMetadata,
    };
  });
}

export function inviteRoomMetadataValue(metadata, existing, key) {
  return Object.prototype.hasOwnProperty.call(metadata ?? {}, key) ? metadata[key] : existing?.[key];
}

export function inviteRoomUpdatedAtValue(metadata, existing) {
  if (Object.prototype.hasOwnProperty.call(metadata ?? {}, "updatedAt")) {
    return Number(metadata.updatedAt ?? 0);
  }
  if (Object.keys(metadata ?? {}).length > 0) {
    return Date.now();
  }
  return Number(existing?.updatedAt ?? Date.now());
}

export function savedInviteRoomNormalizedRecoveryView(options = {}) {
  const receiveState = options.receiveState ?? "";
  const routeReadinessView = options.routeReadinessView ?? null;
  const ownershipBlocksRecovery =
    options.savedInviteRoomReceiveOwnershipBlocksRecovery ?? (() => false);
  const realOnionRecoveryView = options.realOnionRecoveryView ?? null;

  if (
    realOnionRecoveryView &&
    ownershipBlocksRecovery({
      receiveState,
      routeReadinessAction: routeReadinessView?.action ?? "",
    })
  ) {
    return null;
  }

  return realOnionRecoveryView;
}

export function savedInviteRoomResumeStateView(view, options = {}) {
  const resumeRecommended = options.resumeRecommended === true;
  const formatTemplate = options.formatTemplate ?? ((_, value) => value?.state ?? "");
  if (!resumeRecommended) {
    return view;
  }
  return {
    ...view,
    label: formatTemplate("roomStateResumeNext", { state: view.label }),
  };
}

export function savedInviteRoomBaseStateView(options = {}) {
  const receiveState = options.receiveState ?? "";
  const waitingPeerCode = options.waitingPeerCode === true;
  const hasRetryableOutbound = options.hasRetryableOutbound === true;
  const retryableState = options.retryableState ?? null;
  const realOnionRecoveryView = options.realOnionRecoveryView ?? null;
  const routeReadinessView = options.routeReadinessView ?? null;
  const room = options.room ?? {};
  const currentCode = String(options.currentCode ?? "").trim();
  const roomDetailOpen = options.roomDetailOpen === true;
  const currentInviteCodeShareVisible = options.currentInviteCodeShareVisible === true;
  const t = options.t ?? ((key) => key);

  if (receiveState === "listening") {
    return { key: "listening", label: t("roomStateListening") };
  }
  if (receiveState === "stopping") {
    return { key: "receive-stopping", label: t("roomReceivingStopping") };
  }
  if (waitingPeerCode) {
    return { key: "waiting-peer-code", label: t("roomStateWaitingPeerCode") };
  }
  if (receiveState === "paused") {
    return { key: "receive-paused", label: t("roomStateReceivePaused") };
  }
  if (hasRetryableOutbound) {
    return retryableState;
  }
  if (realOnionRecoveryView) {
    return realOnionRecoveryView.state;
  }
  if (routeReadinessView) {
    return routeReadinessView.state;
  }
  if (room.code === currentCode && roomDetailOpen) {
    return { key: "active", label: t("roomStateActive") };
  }
  if (room.code === currentCode && currentInviteCodeShareVisible) {
    return { key: "invite-open", label: t("roomStateInviteOpen") };
  }
  if (room.messageCount > 0) {
    return { key: "ready", label: t("roomStateReady") };
  }
  return { key: "saved", label: t("roomStateSaved") };
}

export function savedInviteRoomActionRechecksAfterOpen(action) {
  const normalized = String(action ?? "");
  return (
    normalized.startsWith("real-onion-") ||
    new Set([
      "enable-private-delivery",
      "prepare-private-route",
      "refresh-endpoint",
      "refresh-and-retry",
      "retry",
      "retry-network",
      "start-receiving",
      "stop-receiving",
      "wait-receive-stop",
      "verify-safety",
    ]).has(normalized)
  );
}

export function savedInviteRoomRecheckedRouteReadinessAction(action, actionOrigin, currentRoom, routeReadinessView) {
  if (actionOrigin !== "route-readiness") {
    return null;
  }
  if (!routeReadinessView) {
    return { ready: true };
  }
  if (routeReadinessView.action === action) {
    return { ready: false, action };
  }
  return { ready: false, action: routeReadinessView.action };
}

export function savedInviteRoomManualRebuildRecoveryCandidate(current, input = {}) {
  const room = current?.room;
  if (room?.manualRebuildFlow !== true) {
    return null;
  }
  const receiveState = current?.view?.receiveState ?? "";
  const waitingPeerCode = Boolean(current?.view?.waitingPeerCode);
  const routeReadinessView = current?.view?.routeReadinessView ?? null;
  const manualAction = normalizedSavedRoomManualRebuildDeliveryAction(room.manualRebuildDeliveryAction);
  const manualMessageNumber = normalizedSavedRoomManualRebuildMessageNumber(room.manualRebuildMessageNumber);
  if (room.retryableOutboundCount > 0 && Number.parseInt(room.retryableOutboundMessageNumber ?? 0, 10) > 0) {
    return {
      action: current?.action || manualAction || "retry",
      actionOrigin: current?.actionOrigin || "retryable-outbound",
      messageNumber: Number.parseInt(room.retryableOutboundMessageNumber ?? 0, 10) || manualMessageNumber,
    };
  }
  if (waitingPeerCode) {
    return { action: "paste-peer-code", actionOrigin: "route-readiness", messageNumber: manualMessageNumber };
  }
  if (receiveState === "paused") {
    return { action: "start-receiving", actionOrigin: "receive-state", messageNumber: manualMessageNumber };
  }
  if (receiveState === "stopping") {
    return { action: "wait-receive-stop", actionOrigin: "receive-state", messageNumber: manualMessageNumber };
  }
  if (routeReadinessView?.action) {
    return {
      action: routeReadinessView.action,
      actionOrigin: "route-readiness",
      messageNumber: manualMessageNumber,
    };
  }
  if (current?.action && !String(current.action).startsWith("real-onion-")) {
    return {
      action: current.action,
      actionOrigin: current.actionOrigin || "saved-room",
      messageNumber: manualMessageNumber,
    };
  }
  if (manualAction) {
    return { action: manualAction, actionOrigin: "manual-rebuild-metadata", messageNumber: manualMessageNumber };
  }
  return null;
}

export function selectSavedInviteRoomResumeRoom(priorityEntries = []) {
  return (
    (Array.isArray(priorityEntries) ? priorityEntries : [])
      .filter(({ priority }) => priority > 0)
      .sort((left, right) => {
        const priority = right.priority - left.priority;
        return priority || right.updatedAt - left.updatedAt || left.index - right.index;
      })[0]?.room ?? null
  );
}

export function savedInviteRoomResumePriorityValue(input = {}) {
  if (input.hasRetryableOutbound === true) {
    return 30;
  }
  if (input.receiveState === "stopping") {
    return 22;
  }
  if (input.routeReadinessAction) {
    if (input.routeReadinessAction === "wait-receive-stop") {
      return 19;
    }
    return 24;
  }
  if (input.hasRealOnionRecovery === true) {
    return 25;
  }
  if (input.receiveState === "paused") {
    return 20;
  }
  if (input.waitingPeerCode === true) {
    return 18;
  }
  return 0;
}

export function savedRoomActionLabelKeyValue(action, fallbackLabelKey = "openRoom") {
  const normalized = String(action ?? "").trim();
  if (normalized === "enable-private-delivery" || normalized === "real-onion-enable-private-delivery") {
    return "savedRoomActionEnableDelivery";
  }
  if (normalized === "prepare-private-route") {
    return "savedRoomActionShareDeliveryCode";
  }
  if (normalized === "refresh-endpoint") {
    return "savedRoomActionUpdateDeliveryCode";
  }
  if (normalized === "refresh-and-retry") {
    return "savedRoomActionUpdateCodeAndRetry";
  }
  if (normalized === "start-receiving") {
    return "savedRoomActionStartReceiving";
  }
  if (normalized === "wait-receive-stop") {
    return "savedRoomActionWaitReceivingStop";
  }
  if (normalized === "retry-network") {
    return "savedRoomActionRetryNetwork";
  }
  if (normalized === "verify-safety") {
    return "savedRoomActionComparePhrase";
  }
  if (normalized === "retry") {
    return "savedRoomActionRetrySavedMessage";
  }
  if (normalized === "paste-peer-code") {
    return "savedRoomActionPastePeerCode";
  }
  if (normalized === "real-onion-retry") {
    return "savedRoomActionRetryDelivery";
  }
  return fallbackLabelKey;
}

export function savedInviteRoomReadinessBlockerKeyValue(view = {}) {
  if (view.receiveState === "stopping") {
    return "receive-stopping";
  }
  if (view.hasRetryableSend) {
    return "retryable-outbound";
  }
  if (view.waitingPeerCode) {
    return "peer-delivery-code";
  }
  if (view.receiveState === "paused") {
    return "receive-paused";
  }
  const action = String(view.nextAction?.action ?? "").trim();
  if (action === "enable-private-delivery" || action === "real-onion-enable-private-delivery") {
    return "private-delivery-disabled";
  }
  if (action === "verify-safety") {
    return "safety-unverified";
  }
  if (action === "prepare-private-route" || action === "refresh-endpoint" || action === "paste-peer-code") {
    return "delivery-code-needed";
  }
  if (action === "retry-network" || action === "real-onion-retry") {
    return "delivery-retry-needed";
  }
  return view.nextAction ? "local-action-needed" : "none";
}

export function savedInviteRoomReadinessSummaryKeyValue(view = {}) {
  if (view.receiveState === "listening") {
    return "roomReadinessListening";
  }
  if (view.receiveState === "stopping") {
    return "roomReadinessReceiveStopping";
  }
  if (view.hasRetryableSend) {
    return "roomReadinessRetryable";
  }
  if (view.waitingPeerCode) {
    return "roomReadinessPeerCode";
  }
  if (view.receiveState === "paused") {
    return "roomReadinessReceivePaused";
  }
  if (view.nextAction) {
    return "roomReadinessNeedsAction";
  }
  if (view.current) {
    return "roomReadinessCurrent";
  }
  if (view.resumeRecommended) {
    return "roomReadinessResume";
  }
  return "roomReadinessOpen";
}

export function savedInviteRoomReadinessNextDetailKeyValue(view = {}, options = {}) {
  const action = String(view.nextAction?.action ?? "").trim();
  const retryableAction = options.savedInviteRoomRetryableAction ?? ((value) => value);
  if (view.receiveState === "stopping" || action === "wait-receive-stop") {
    return "roomReadinessNextWaitReceiveStop";
  }
  if (view.hasRetryableSend) {
    const normalizedAction = retryableAction(view.nextAction?.action);
    if (normalizedAction === "enable-private-delivery") {
      return "roomReadinessNextEnableDelivery";
    }
    if (normalizedAction === "prepare-private-route") {
      return "roomReadinessNextShareDeliveryCode";
    }
    if (normalizedAction === "refresh-and-retry") {
      return "roomReadinessNextRefreshCodeAndRetry";
    }
    if (normalizedAction === "start-receiving") {
      return "roomReadinessNextStartReceive";
    }
    if (normalizedAction === "wait-receive-stop") {
      return "roomReadinessNextWaitReceiveStop";
    }
    if (normalizedAction === "retry-network") {
      return "roomReadinessNextRetryNetwork";
    }
    if (normalizedAction === "verify-safety") {
      return "roomReadinessNextVerifySafety";
    }
    return "roomReadinessNextRetrySavedMessage";
  }
  if (view.waitingPeerCode || action === "paste-peer-code") {
    return "roomReadinessNextPastePeerCode";
  }
  if (view.receiveState === "paused" || action === "start-receiving") {
    return "roomReadinessNextStartReceive";
  }
  if (action === "enable-private-delivery" || action === "real-onion-enable-private-delivery") {
    return "roomReadinessNextEnableDelivery";
  }
  if (action === "verify-safety") {
    return "roomReadinessNextVerifySafety";
  }
  if (action === "prepare-private-route" || action === "real-onion-network-settings") {
    return "roomReadinessNextShareDeliveryCode";
  }
  if (action === "refresh-endpoint") {
    return "roomReadinessNextRefreshDeliveryCode";
  }
  if (action === "retry-network" || action === "real-onion-retry") {
    return "roomReadinessNextRetryNetwork";
  }
  if (action === "real-onion-inspect-diagnostics") {
    return "roomReadinessNextInspectDiagnostics";
  }
  if (view.current) {
    return "roomReadinessNextUseCurrentRoom";
  }
  if (view.resumeRecommended) {
    return "roomReadinessNextResumeRoom";
  }
  return "roomReadinessNextOpenRoom";
}

export function savedInviteRoomReadinessReviewValue(view = {}, options = {}) {
  const blockerKeyResolver = options.savedInviteRoomReadinessBlockerKey ?? savedInviteRoomReadinessBlockerKeyValue;
  const summaryKeyResolver = options.savedInviteRoomReadinessSummaryKey ?? savedInviteRoomReadinessSummaryKeyValue;
  const nextDetailResolver = options.savedInviteRoomReadinessNextDetailKey ?? savedInviteRoomReadinessNextDetailKeyValue;
  const blockerKey = blockerKeyResolver(view);
  return {
    boundaryKey: "roomReadinessBoundary",
    blockerKey,
    nextDetailKey: nextDetailResolver(view),
    nextLabelKey: view.nextAction?.labelKey ?? "openRoom",
    statusKey: summaryKeyResolver(view),
    titleKey: "roomReadinessReview",
  };
}

export function savedInviteRoomRetryableListAction(action, options = {}) {
  const labelKeyForAction = options.savedRoomActionLabelKey ?? ((value) => value);
  if (action === "enable-private-delivery") {
    return { action, labelKey: labelKeyForAction(action), origin: "retryable-outbound" };
  }
  if (action === "prepare-private-route") {
    return { action, labelKey: labelKeyForAction(action), origin: "retryable-outbound" };
  }
  if (action === "refresh-and-retry") {
    return { action, labelKey: labelKeyForAction(action), origin: "retryable-outbound" };
  }
  if (action === "start-receiving") {
    return { action, labelKey: "savedRoomActionStartReceivingForRetry", origin: "retryable-outbound" };
  }
  if (action === "wait-receive-stop") {
    return { action, labelKey: labelKeyForAction(action), origin: "retryable-outbound" };
  }
  if (action === "retry-network") {
    return { action, labelKey: labelKeyForAction(action), origin: "retryable-outbound" };
  }
  if (action === "verify-safety") {
    return { action, labelKey: labelKeyForAction(action), origin: "retryable-outbound" };
  }
  return { action: "retry", labelKey: labelKeyForAction("retry"), origin: "retryable-outbound" };
}

export function savedInviteRoomRecoveryListAction(options = {}) {
  const receiveState = options.receiveState ?? "";
  const routeReadinessView = options.routeReadinessView ?? null;
  const ownershipBlocksRecovery =
    options.savedInviteRoomReceiveOwnershipBlocksRecovery ?? (() => false);
  const labelKeyForAction = options.savedRoomActionLabelKey ?? ((value, fallback) => fallback ?? value);
  let realOnionRecovery = options.realOnionRecovery ?? null;

  if (
    realOnionRecovery &&
    ownershipBlocksRecovery({
      receiveState,
      routeReadinessAction: routeReadinessView?.action ?? "",
    })
  ) {
    realOnionRecovery = null;
  }

  if (realOnionRecovery) {
    return {
      action: realOnionRecovery.action,
      labelKey: labelKeyForAction(realOnionRecovery.action, realOnionRecovery.labelKey),
      origin: "real-onion-recovery",
    };
  }

  if (routeReadinessView) {
    return {
      action: routeReadinessView.action,
      labelKey: labelKeyForAction(routeReadinessView.action, routeReadinessView.labelKey),
      origin: "route-readiness",
    };
  }

  return null;
}

export function savedInviteRoomImmediateListAction(options = {}) {
  const receiveState = options.receiveState ?? "";
  const waitingPeerCode = options.waitingPeerCode === true;
  const routeReadinessView = options.routeReadinessView ?? null;
  const labelKeyForAction = options.savedRoomActionLabelKey ?? ((value, fallback) => fallback ?? value);

  if (receiveState === "stopping") {
    return {
      action: "wait-receive-stop",
      labelKey: labelKeyForAction("wait-receive-stop"),
      origin: "receive-state",
    };
  }
  if (waitingPeerCode) {
    return {
      action: "paste-peer-code",
      labelKey: labelKeyForAction("paste-peer-code"),
      origin: "peer-code",
    };
  }
  if (receiveState === "paused") {
    return {
      action: "start-receiving",
      labelKey: labelKeyForAction("start-receiving"),
      origin: "receive-state",
    };
  }
  if (new Set(["start-receiving", "stop-receiving", "wait-receive-stop"]).has(routeReadinessView?.action)) {
    return {
      action: routeReadinessView.action,
      labelKey: labelKeyForAction(routeReadinessView.action, routeReadinessView.labelKey),
      origin: "route-readiness",
    };
  }
  return null;
}

export function savedInviteRoomRecoveryCandidates(options = {}) {
  const hasRetryableSend = options.hasRetryableSend === true;
  const receiveOwnershipBlocksRecovery = options.receiveOwnershipBlocksRecovery === true;
  const routeReadinessViewCandidate = options.routeReadinessViewCandidate ?? null;
  const realOnionRecoveryViewCandidate = options.realOnionRecoveryViewCandidate ?? null;

  const routeReadinessBlocksRecovery = Boolean(routeReadinessViewCandidate);
  const realOnionRecoveryView =
    hasRetryableSend || receiveOwnershipBlocksRecovery || routeReadinessBlocksRecovery
      ? null
      : realOnionRecoveryViewCandidate;

  const routeReadinessView =
    (hasRetryableSend &&
      !new Set(["start-receiving", "stop-receiving", "wait-receive-stop"]).has(
        routeReadinessViewCandidate?.action,
      )) ||
    realOnionRecoveryView
      ? null
      : routeReadinessViewCandidate;

  return {
    realOnionRecoveryView,
    routeReadinessBlocksRecovery,
    routeReadinessView,
  };
}

export function savedInviteRoomListItemDerivedState(options = {}) {
  const roomFingerprint = String(options.roomFingerprint ?? "").trim();
  const currentCode = String(options.currentCode ?? "").trim();
  const currentRole =
    options.currentRole === "inviter" || options.currentRole === "joiner" ? options.currentRole : "";
  const currentRoomFingerprint = String(options.currentRoomFingerprint ?? "").trim();
  const resumeRoom = options.resumeRoom ?? null;
  const viewRoom = options.viewRoom ?? {};

  return {
    current: currentRoomFingerprint
      ? roomFingerprint === currentRoomFingerprint
      : Boolean(viewRoom.code === currentCode && (!currentRole || viewRoom.role === currentRole)),
    resumeRecommended: Boolean(
      resumeRoom && viewRoom.code === resumeRoom.code && viewRoom.role === resumeRoom.role,
    ),
  };
}

export function savedInviteRoomListItemContext(options = {}) {
  return {
    currentCode: String(options.currentCode ?? "").trim(),
    currentRole:
      options.currentRole === "inviter" || options.currentRole === "joiner" ? options.currentRole : "",
    currentRoomFingerprint: String(options.currentRoomFingerprint ?? "").trim(),
    resumeRoom: options.resumeRoom ?? null,
  };
}

export function savedInviteRoomListItemViewRoom(options = {}) {
  const room = options.room ?? {};
  const persist = options.persist === true;
  const withoutLoadedStaleRetryable = options.savedInviteRoomWithoutLoadedStaleRetryable ?? ((value) => value);
  const withoutResolvedManualRebuild =
    options.savedInviteRoomWithoutResolvedManualRebuild ?? ((value) => value);

  return withoutResolvedManualRebuild(
    withoutLoadedStaleRetryable(room, { persist }),
    { persist },
  );
}

export function savedInviteRoomListItemDisplayState(options = {}) {
  const viewRoom = options.viewRoom ?? {};
  const current = options.current === true;
  const hasRetryableSend = options.hasRetryableSend === true;
  const receiveState = String(options.receiveState ?? "").trim();
  const resumeRecommended = options.resumeRecommended === true;
  const routeReadinessView = options.routeReadinessView ?? null;
  const realOnionRecoveryView = options.realOnionRecoveryView ?? null;
  const waitingPeerCode = options.waitingPeerCode === true;

  const nextActionResolver = options.savedInviteRoomListAction ?? (() => null);
  const stateResolver = options.savedInviteRoomState ?? (() => "");
  const readinessReviewResolver = options.savedInviteRoomReadinessReview ?? (() => null);

  const nextAction = nextActionResolver(viewRoom, {
    realOnionRecoveryView,
    receiveState,
    routeReadinessView,
    waitingPeerCode,
  });
  const state = stateResolver(viewRoom, {
    realOnionRecoveryView,
    receiveState,
    resumeRecommended,
    routeReadinessView,
    waitingPeerCode,
  });
  const readinessReview = readinessReviewResolver({
    current,
    hasRetryableSend,
    nextAction,
    receiveState,
    resumeRecommended,
    state,
    waitingPeerCode,
  });

  return {
    nextAction,
    readinessReview,
    state,
  };
}

export async function savedInviteRoomMetadataFromLocalStores(input) {
  const { room, invokeRoomTranscriptExport, savedInviteRoomMetadataWithPreferredRetryable, inviteRoomMetadataWithoutRetryableOutbound } = input;
  const transcript = await invokeRoomTranscriptExport(room);
  if (!transcript) {
    return null;
  }
  let metadata = transcript.metadata ?? null;
  if (!metadata) {
    return null;
  }
  const preferredMessageNumber = Number.parseInt(room?.retryableOutboundMessageNumber ?? 0, 10) || 0;
  if (preferredMessageNumber > 0) {
    metadata = savedInviteRoomMetadataWithPreferredRetryable(
      metadata,
      input.roomInput,
      transcript.entries ?? [],
      preferredMessageNumber,
    );
  } else {
    metadata = inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  return metadata;
}

export async function refreshSavedInviteRoomMetadataForFingerprint(input) {
  const {
    room,
    roomFingerprint,
    savedInviteRoomMetadataFromLocalStores,
    savedInviteRoomMetadataWithSessionStatus,
    invokeInviteRoomSessionStatus,
    rememberTwoProfileSessionStatus,
    forgetTwoProfileSessionStatusForInput,
    rememberInviteRoom,
    renderSavedInviteRooms,
  } = input;
  const fingerprintMatchesRoom = () => {
    const expectedFingerprint = String(roomFingerprint ?? "").trim();
    if (!expectedFingerprint || !room || typeof input.roomFingerprintForRoom !== "function") {
      return true;
    }
    return String(input.roomFingerprintForRoom(room) ?? "").trim() === expectedFingerprint;
  };
  if (!room) {
    renderSavedInviteRooms();
    return false;
  }
  if (!fingerprintMatchesRoom()) {
    renderSavedInviteRooms();
    return false;
  }
  try {
    const roomInput = input.savedInviteRoomInput(room);
    let metadata = await savedInviteRoomMetadataFromLocalStores(room);
    if (!metadata) {
      renderSavedInviteRooms();
      return false;
    }
    const retryableMetadataCleared =
      input.savedInviteRoomHasRetryableOutbound(room) && !input.savedInviteRoomHasRetryableOutbound(metadata);
    const refreshSessionStatus =
      input.options?.refreshSessionStatus === true ||
      (retryableMetadataCleared && !input.latestTwoProfileSessionStatusForCurrentInput(roomInput));
    if (refreshSessionStatus) {
      try {
        const sessionStatus = await invokeInviteRoomSessionStatus(roomInput);
        rememberTwoProfileSessionStatus(roomInput, sessionStatus);
        metadata = savedInviteRoomMetadataWithSessionStatus(metadata, roomInput, sessionStatus);
      } catch {
        forgetTwoProfileSessionStatusForInput(roomInput);
      }
    }
    if (!fingerprintMatchesRoom()) {
      renderSavedInviteRooms();
      return false;
    }
    rememberInviteRoom(room.code, room.role, input.options?.preserveUpdatedAt ? { ...metadata, updatedAt: room.updatedAt } : metadata, {
      render: false,
    });
    renderSavedInviteRooms();
    return true;
  } catch {
    renderSavedInviteRooms();
    return false;
  }
}

export function savedInviteRoomMetadataSyncCandidates(rooms, dependency) {
  const list = dependency.savedInviteRoomPriorityEntries(rooms);
  return list
    .sort((left, right) => {
      const priority = right.priority - left.priority;
      return priority || right.updatedAt - left.updatedAt || left.index - right.index;
    })
    .map(({ room }) => room)
    .slice(0, dependency.savedRoomMetadataStartupSyncLimit);
}

export async function syncSavedInviteRoomMetadataFromLocalStores(input) {
  if (input.savedRoomMetadataSyncInFlight()) {
    return false;
  }
  const candidates = input.savedInviteRoomMetadataSyncCandidates();
  if (!candidates.length) {
    input.setSavedRoomMetadataSyncStatus("");
    return false;
  }
  input.setSavedRoomMetadataSyncInFlight(true);
  input.setSavedRoomMetadataSyncStatus("roomListSyncRunning", "progress", { count: candidates.length });
  let refreshed = 0;
  let failed = 0;
  try {
    for (const room of candidates) {
      try {
        let metadata = await input.savedInviteRoomMetadataFromLocalStores(room);
        if (metadata) {
          try {
            const roomInput = input.savedInviteRoomInput(room);
            const sessionStatus = await input.invokeInviteRoomSessionStatus(roomInput);
            input.rememberTwoProfileSessionStatus(roomInput, sessionStatus);
            metadata = input.savedInviteRoomMetadataWithSessionStatus(metadata, roomInput, sessionStatus);
          } catch {
            input.forgetTwoProfileSessionStatusForInput(input.savedInviteRoomInput(room));
          }
          input.rememberInviteRoom(room.code, room.role, { ...metadata, updatedAt: room.updatedAt }, { render: false });
          refreshed += 1;
        }
      } catch {
        failed += 1;
      }
    }
    input.renderSavedInviteRooms();
    input.setSavedRoomMetadataSyncStatus(failed ? "roomListSyncPartial" : "roomListSyncComplete", failed ? "warning" : "muted", { count: refreshed });
    return true;
  } finally {
    input.savedRoomMetadataSyncInFlightSet(false);
  }
}

export function rememberCurrentInviteRoomMetadata(input) {
  const code = input.currentInviteRoomCode();
  const role = input.connectionCodeRoleFor(code);
  if (!code || !role) {
    return;
  }
  const allowRetryableFallback = input.allowCurrentRoomRetryableMetadataFallbackOnce === true;
  input.allowCurrentRoomRetryableMetadataFallbackOnceSet(false);
  input.rememberInviteRoom(code, role, input.currentRoomConversationMetadata({ allowRetryableFallback }));
}

export function refreshCurrentRoomAfterReceiveImport(input) {
  const sessionsReady = input.twoProfileSessionsReadyForInput(input.roomInput);
  input.rememberCurrentInviteRoomMetadata();
  input.renderSavedInviteRooms();
  input.renderRoomStatusSummary(input.roomInput, sessionsReady);
  input.renderRoomIdentityBar(input.roomInput, sessionsReady);
  if (input.refreshPlan.messageImported) {
    input.renderProductionTwoProfileMemory(input.roomInput);
  }
}

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
