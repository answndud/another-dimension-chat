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
