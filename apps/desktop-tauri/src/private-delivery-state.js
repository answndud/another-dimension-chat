export function fieldTestReportValue(value, fallback = "unknown") {
  const text = String(value ?? "").trim();
  if (!text) {
    return fallback;
  }
  return text
    .replace(/[^\w .:/#=-]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 96);
}

export function fieldTestBoundarySummary(text) {
  const source = String(text ?? "");
  const allowedKeys = [
    "permission",
    "persistent_client",
    "send_intent",
    "started",
    "succeeded",
    "ack_wait",
    "event_recorded",
    "network_io",
    "accept",
    "dial",
    "read_write",
    "send",
    "envelope_io",
    "runtime",
    "backend_enabled",
    "worker",
    "in_flight",
    "attempts",
    "message_imports",
    "endpoint_updates",
    "last_started",
    "last_succeeded",
    "last_network",
    "failure",
    "retryable",
    "next",
    "app_launch_network",
    "raw_profile",
    "passphrase",
    "key_material",
    "network",
    "transport",
  ];
  const parts = [];
  for (const key of allowedKeys) {
    const match = source.match(new RegExp(`(?:^|\\s)${key}=([^\\s;]+)`));
    if (match) {
      parts.push(`${key}=${fieldTestReportValue(match[1])}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : "none";
}

export function fieldTestBoundaryValue(text, key, fallback = "none") {
  const match = String(text ?? "").match(new RegExp(`(?:^|\\s)${key}=([^\\s;]+)`));
  return match ? fieldTestReportValue(match[1], fallback) : fallback;
}

export function parseFieldTestReport(report) {
  const fields = {};
  for (const line of String(report ?? "").split(/\r?\n/)) {
    const match = line.match(/^([a-z0-9_]+)=(.*)$/i);
    if (match) {
      fields[match[1]] = match[2];
    }
  }
  return fields;
}

export function normalizeSavedInviteRoomRetryableAction(action) {
  const normalized = String(action ?? "").trim();
  return new Set([
    "enable-private-delivery",
    "prepare-private-route",
    "refresh-and-retry",
    "start-receiving",
    "retry-network",
    "verify-safety",
    "retry",
  ]).has(normalized)
    ? normalized
    : "";
}

export function isSavedInviteRoomRetryOnlyAction(action) {
  return new Set([
    "refresh-and-retry",
    "retry",
    "retry-network",
    "review-send",
  ]).has(String(action ?? "").trim());
}

export function normalizeSavedInviteRoomActionOrigin(origin) {
  const normalized = String(origin ?? "").trim();
  return new Set([
    "retryable-outbound",
    "route-readiness",
    "receive-state",
    "peer-code",
    "real-onion-recovery",
  ]).has(normalized)
    ? normalized
    : "";
}

export function savedInviteRoomActionCanUseRetryableOutbound(action, origin) {
  const normalizedOrigin = normalizeSavedInviteRoomActionOrigin(origin);
  return (
    normalizedOrigin === "retryable-outbound" &&
    Boolean(normalizeSavedInviteRoomRetryableAction(action) || isSavedInviteRoomRetryOnlyAction(action))
  );
}

export function savedInviteRoomActionIsRouteReadinessOnly(origin) {
  return normalizeSavedInviteRoomActionOrigin(origin) === "route-readiness";
}

export function savedInviteRoomRetryOnlyWithoutRetryableOrigin(action, origin) {
  return isSavedInviteRoomRetryOnlyAction(action) && normalizeSavedInviteRoomActionOrigin(origin) !== "retryable-outbound";
}

export function savedInviteRoomPreservesOpenActionOrigin(origin) {
  return new Set(["receive-state", "peer-code", "real-onion-recovery"]).has(
    normalizeSavedInviteRoomActionOrigin(origin),
  );
}

export function savedInviteRoomReceiveOwnershipBlocksRecovery({
  receiveState,
  routeReadinessAction,
  routeReadinessFailureKind,
  receiveStopRequested,
} = {}) {
  if (receiveState === "stopping" || receiveState === "paused" || receiveStopRequested === true) {
    return true;
  }
  if (routeReadinessAction === "wait-receive-stop") {
    return true;
  }
  return (
    routeReadinessAction === "start-receiving" &&
    new Set([
      "",
      "LocalOnionEndpointNotReady",
      "LocalOnionEndpointStopping",
      "RuntimeOwnerProfileMismatch",
    ]).has(String(routeReadinessFailureKind ?? "").trim())
  );
}

export function fieldTestRouteReadinessBlocked(parsed) {
  return (
    parsed.route_readiness_ready !== "true" &&
    parsed.route_readiness_failure_kind &&
    parsed.route_readiness_failure_kind !== "none"
  );
}

export function fieldTestBlockedRouteReadinessAction(parsed) {
  return parsed.route_readiness_ready !== "true" &&
    parsed.route_readiness_next_action &&
    parsed.route_readiness_next_action !== "none"
    ? parsed.route_readiness_next_action
    : "";
}

export function fieldTestReceiveAwareRecoveryAction(action, parsed) {
  if (
    action === "start-receiving" &&
    (parsed.route_readiness_failure_kind === "LocalOnionEndpointStopping" ||
      parsed.receive_stop_requested === "true")
  ) {
    return "wait-receive-stop";
  }
  return action;
}

export function fieldTestRouteReadinessRecoveryAction(parsed) {
  return fieldTestReceiveAwareRecoveryAction(fieldTestBlockedRouteReadinessAction(parsed), parsed);
}

export function fieldTestReportHasSavedRoomContext(parsed) {
  return (
    fieldTestReportValue(parsed.room_list_state_key, "none") !== "none" ||
    fieldTestReportValue(parsed.room_list_next_action, "none") !== "none" ||
    fieldTestReportValue(parsed.room_list_next_origin, "none") !== "none"
  );
}

export function fieldTestReportStandaloneOutboundRecoveryAction(parsed) {
  const action = fieldTestReportValue(parsed.outbound_recovery_action, "none");
  return action !== "none" && !fieldTestReportHasSavedRoomContext(parsed)
    ? fieldTestReceiveAwareRecoveryAction(action, parsed)
    : "";
}

export function fieldTestReportRoomListAction(parsed) {
  const action = fieldTestReportValue(parsed.room_list_next_action, "none");
  if (action === "none") {
    return "";
  }
  const origin = fieldTestReportValue(parsed.room_list_next_origin, "none");
  return isSavedInviteRoomRetryOnlyAction(action) && origin !== "retryable-outbound"
    ? ""
    : action;
}

export function fieldTestReportOutboundFailureClass(parsed) {
  const failureClass = fieldTestReportValue(parsed.outbound_failure_class, "none");
  if (failureClass === "none") {
    return "";
  }
  if (!fieldTestReportHasSavedRoomContext(parsed)) {
    return failureClass;
  }
  return (
    fieldTestReportValue(parsed.room_list_next_origin, "none") === "retryable-outbound" &&
    parsed.retryable_outbound_present === "true"
  )
    ? failureClass
    : "";
}

export function fieldTestReportBlocker(parsed) {
  if (fieldTestRouteReadinessBlocked(parsed)) {
    return parsed.route_readiness_failure_kind;
  }
  if (parsed.real_onion_next_blocker && parsed.real_onion_next_blocker !== "none") {
    return parsed.real_onion_next_blocker;
  }
  if (parsed.receive_failure_kind && parsed.receive_failure_kind !== "none") {
    return parsed.receive_failure_kind;
  }
  const outboundFailureClass = fieldTestReportOutboundFailureClass(parsed);
  if (outboundFailureClass) {
    return outboundFailureClass;
  }
  return "none";
}

export function fieldTestExternalOnionDelivered(parsed) {
  return (
    parsed.real_onion_external_peer_delivery_confirmed === "true" &&
    parsed.real_onion_local_dev_roundtrip_result !== "true"
  );
}

export function fieldTestReportReceiveValue(parsed) {
  if (parsed.receive_stop_requested === "true") {
    return "receive-stopping";
  }
  if (
    Object.prototype.hasOwnProperty.call(parsed, "receive_owner_current_room") &&
    parsed.receive_owner_current_room !== "true"
  ) {
    return "receive-off";
  }
  return parsed.receive_enabled === "true"
    ? `receive-${fieldTestReportValue(parsed.receive_state, "unknown")}`
    : "receive-off";
}

export function fieldTestReportNextActionValue(parsed) {
  if (parsed.room_present !== "true" || parsed.session_ready !== "true") {
    return "check-session";
  }
  if (parsed.safety_confirmed !== "true") {
    return "verify";
  }
  const routeReadinessAction = fieldTestRouteReadinessRecoveryAction(parsed);
  const roomListAction = fieldTestReportRoomListAction(parsed);
  if (roomListAction) {
    if (parsed.room_list_next_origin !== "retryable-outbound" && routeReadinessAction) {
      return routeReadinessAction;
    }
    return fieldTestReceiveAwareRecoveryAction(roomListAction, parsed);
  }
  if (routeReadinessAction) {
    return routeReadinessAction;
  }
  const outboundRecoveryAction = fieldTestReportStandaloneOutboundRecoveryAction(parsed);
  if (outboundRecoveryAction) {
    return outboundRecoveryAction;
  }
  if (parsed.real_onion_recovery_action && parsed.real_onion_recovery_action !== "none") {
    return parsed.real_onion_recovery_action;
  }
  return "none";
}

export function fieldTestReportSummary(report) {
  const parsed = parseFieldTestReport(report);
  const room = parsed.room_present === "true" ? "room" : "no-room";
  const safety = parsed.safety_confirmed === "true" ? "verified" : "unverified";
  const externalOnionDelivered = fieldTestExternalOnionDelivered(parsed);
  const routeReadinessBlocked = fieldTestRouteReadinessBlocked(parsed);
  const delivery =
    externalOnionDelivered
      ? routeReadinessBlocked
        ? "external-onion-delivered-current-route-blocked"
        : "external-onion-delivered"
      : parsed.real_onion_local_dev_roundtrip_result === "true"
        ? "local-dev-roundtrip"
        : "external-delivery-unconfirmed";
  const route = parsed.route_stale === "true"
    ? "route-stale"
    : parsed.route_ready === "true"
      ? "route-ready"
      : "route-missing";
  const receive = fieldTestReportReceiveValue(parsed);
  const nextAction = fieldTestReportNextActionValue(parsed);
  const blocker = fieldTestReportBlocker(parsed);
  return `summary ${room} ${safety} ${delivery} ${route} ${receive} next=${fieldTestReportValue(nextAction, "none")} blocker=${fieldTestReportValue(blocker, "none")}`;
}

export function fieldTestReportTriageState(report) {
  const parsed = parseFieldTestReport(report);
  return {
    appVersion: fieldTestReportValue(parsed.app_version, "unknown"),
    buildChannel: fieldTestReportValue(parsed.build_channel, "unknown"),
    buildCommit: fieldTestReportValue(parsed.build_commit, "unknown"),
    room: parsed.room_present === "true" ? "room" : "no-room",
    safety: parsed.safety_confirmed === "true" ? "verified" : "unverified",
    delivery:
      fieldTestExternalOnionDelivered(parsed)
        ? "external-onion-delivered"
        : parsed.real_onion_local_dev_roundtrip_result === "true"
          ? "local-dev-roundtrip"
          : "external-delivery-unconfirmed",
    route: parsed.route_stale === "true"
      ? "route-stale"
      : parsed.route_ready === "true"
        ? "route-ready"
        : "route-missing",
    receive: fieldTestReportReceiveValue(parsed),
    next: fieldTestReportNextActionValue(parsed),
    blocker: fieldTestReportBlocker(parsed),
  };
}

export const FIELD_TEST_REPORT_HARD_COMPARE_KEYS = Object.freeze([
  "appVersion",
  "buildChannel",
  "buildCommit",
  "room",
  "safety",
  "delivery",
]);

export const FIELD_TEST_REPORT_LOCAL_STATE_COMPARE_KEYS = Object.freeze([
  "route",
  "receive",
  "next",
  "blocker",
]);

export function fieldTestReportComparison(localReport, peerReport) {
  if (!String(peerReport ?? "").trim()) {
    return "";
  }
  const local = fieldTestReportTriageState(localReport);
  const peer = fieldTestReportTriageState(peerReport);
  const mismatches = [];
  for (const key of FIELD_TEST_REPORT_HARD_COMPARE_KEYS) {
    if (local[key] !== peer[key]) {
      mismatches.push(`${key}:${fieldTestReportValue(local[key], "none")}!=${fieldTestReportValue(peer[key], "none")}`);
    }
  }
  const localStateDiffs = [];
  for (const key of FIELD_TEST_REPORT_LOCAL_STATE_COMPARE_KEYS) {
    if (local[key] !== peer[key]) {
      localStateDiffs.push(`${key}:${fieldTestReportValue(local[key], "none")}!=${fieldTestReportValue(peer[key], "none")}`);
    }
  }
  const localStateSummary = localStateDiffs.length > 0 ? ` local_state ${localStateDiffs.join(" ")}` : "";
  return mismatches.length > 0
    ? `compare ${mismatches.join(" ")}${localStateSummary}`
    : `compare reports-aligned${localStateSummary}`;
}

export function fieldTestReportsAligned(localReport, peerReport) {
  const comparison = fieldTestReportComparison(localReport, peerReport);
  return !comparison || comparison.startsWith("compare reports-aligned");
}

export function fieldTestActionRequiresLocalRecovery(key) {
  return new Set([
    "fieldTestNextDifferentNetwork",
    "fieldTestNextEnablePrivateDelivery",
    "fieldTestNextInspectDiagnostics",
    "fieldTestNextOpenRoom",
    "fieldTestNextPrepareNetworkOrBridge",
    "fieldTestNextRefreshBridge",
    "fieldTestNextRefreshBridgeTransport",
    "fieldTestNextRetryDelivery",
    "fieldTestNextRetryNetwork",
    "fieldTestNextSetupRoute",
    "fieldTestNextStartReceive",
    "fieldTestNextVerifySafety",
    "fieldTestNextWaitReceiveStop",
  ]).has(key);
}

export function fieldTestPeerLocalStateNextActionKey(localReport, peerReport, nextActionKeyForReport) {
  if (!String(peerReport ?? "").trim() || !fieldTestReportsAligned(localReport, peerReport)) {
    return "";
  }
  const localNextActionKey = nextActionKeyForReport(localReport, "");
  if (fieldTestActionRequiresLocalRecovery(localNextActionKey)) {
    return "";
  }
  const peerNextActionKey = nextActionKeyForReport(peerReport, "");
  return fieldTestActionRequiresLocalRecovery(peerNextActionKey) ? peerNextActionKey : "";
}

export function fieldTestReportRecoveryActionForNextKey(report, nextActionKey) {
  return fieldTestActionRequiresLocalRecovery(nextActionKey)
    ? fieldTestReportNextActionValue(parseFieldTestReport(report))
    : "";
}

export function fieldTestReportComposerAction(report) {
  const action = fieldTestReportValue(parseFieldTestReport(report).composer_next_action, "none");
  return action === "write-message" || action === "send-message" ? action : "";
}

export function fieldTestBuildIdentityMatches(localReport, peerReport) {
  if (!String(peerReport ?? "").trim()) {
    return null;
  }
  const local = fieldTestReportTriageState(localReport);
  const peer = fieldTestReportTriageState(peerReport);
  return (
    local.appVersion === peer.appVersion &&
    local.buildChannel === peer.buildChannel &&
    local.buildCommit === peer.buildCommit
  );
}

export function fieldTestMessagesChecklistStatus({
  externalOnionDelivered,
  routeReadinessBlocked,
  sentRows,
  receivedRows,
}) {
  if (externalOnionDelivered) {
    return routeReadinessBlocked ? "check" : "done";
  }
  if (sentRows > 0 && receivedRows > 0) {
    return "done";
  }
  return sentRows > 0 ? "check" : "pending";
}

export function fieldTestReportChecklistStatus({
  externalOnionDelivered,
  routeReadinessBlocked,
  realOnionAttempted,
  realOnionRecoveryAction,
  realOnionRetryable,
}) {
  if (externalOnionDelivered) {
    return "done";
  }
  if (routeReadinessBlocked) {
    return "pending";
  }
  if (!realOnionAttempted) {
    return "pending";
  }
  if (realOnionRecoveryAction && realOnionRecoveryAction !== "none") {
    return "check";
  }
  return realOnionRetryable ? "check" : "done";
}

export function fieldTestRouteChecklistStatus({
  routeReady,
  routeStale,
  routeReadinessAction,
}) {
  if (routeReadinessAction === "refresh-endpoint") {
    return routeStale ? "check" : "pending";
  }
  if (routeReady && !routeStale) {
    return "done";
  }
  return routeStale ? "check" : "pending";
}

export function fieldTestReceiveChecklistStatus({
  receiveEnabled,
  receiveState,
  receiveStopRequested,
  routeReadinessAction,
  routeReadinessFailureKind,
}) {
  if (receiveStopRequested) {
    return "check";
  }
  if (routeReadinessAction === "start-receiving") {
    return routeReadinessFailureKind === "RuntimeOwnerProfileMismatch" ? "check" : "pending";
  }
  return receiveEnabled && receiveState !== "stopped" ? "done" : "pending";
}

export function realOnionResultConfirmsExternalPeerDelivery(result) {
  return result?.external_peer_delivery_confirmed === true && result?.local_dev_roundtrip_result !== true;
}
