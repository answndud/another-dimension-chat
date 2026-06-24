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
