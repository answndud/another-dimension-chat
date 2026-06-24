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
