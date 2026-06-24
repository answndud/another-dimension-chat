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
