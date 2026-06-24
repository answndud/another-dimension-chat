import {
  normalizedSavedRoomManualRebuildDeliveryAction,
  normalizedSavedRoomManualRebuildMessageNumber,
} from "./saved-room-storage.js";

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
