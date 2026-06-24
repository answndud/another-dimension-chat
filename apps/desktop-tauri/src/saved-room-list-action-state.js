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
