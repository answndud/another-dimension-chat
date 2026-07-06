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

export const PUBLIC_SUPPORT_DIAGNOSTICS_ALLOWED_FIELDS = Object.freeze([
  "app-version",
  "build-channel",
  "build-commit",
  "platform",
  "public-diagnostics",
  "checksum-result",
  "failure-class",
  "recovery-next-action",
  "desktop-acceptance-status",
  "desktop-acceptance-blockers",
  "app-launch-network",
]);

export const PUBLIC_SUPPORT_DIAGNOSTICS_FORBIDDEN_FIELDS = Object.freeze([
  "raw-logs",
  "endpoints",
  "invite-codes",
  "message-text",
  "local-paths",
  "payloads",
  "safety-phrases",
  "profile-names",
  "passphrases",
  "key-material",
  "private-planning-notes",
]);

export function publicSupportDiagnosticsAllowedFieldsValue() {
  return PUBLIC_SUPPORT_DIAGNOSTICS_ALLOWED_FIELDS.join("#");
}

export function publicSupportDiagnosticsForbiddenFieldsValue() {
  return PUBLIC_SUPPORT_DIAGNOSTICS_FORBIDDEN_FIELDS.join("#");
}

export function publicSupportDiagnosticsExcludedFieldsValue() {
  return [
    "codes",
    "endpoints",
    "messages",
    "profiles",
    "paths",
    "logs",
    "crash_dumps",
    "screenshots",
    "passphrases",
    "key_material",
    "private_planning_notes",
  ].join(",");
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
    "network",
    "transport",
    "local_only",
    "manual_rebuild_flow",
    "rebuilt_room_scoped",
    "delivery_scope",
    "delivery_action",
    "retry_scoped",
    "receive_scoped",
    "delivery_code_exchange_scoped",
    "explicit_private_delivery_required",
    "live_network_attempt",
    "backup_recovery",
    "cloud_backup_sync",
    "rollback_prevention",
    "secure_delete_claim",
    "security_ready",
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
    "wait-receive-stop",
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
  if (action === "start-receiving" && parsed.route_readiness_failure_kind === "RuntimeOwnerProfileMismatch") {
    return "stop-receiving";
  }
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

export function fieldTestReportResolvedRoomListAction(parsed) {
  const action = fieldTestReportRoomListAction(parsed);
  if (!action) {
    return "";
  }
  if (!action.startsWith("real-onion-")) {
    return action;
  }
  const realOnionRecovery = fieldTestReportValue(parsed.real_onion_recovery_action, "none");
  return realOnionRecovery === "none" ? action : realOnionRecovery;
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
  const roomListAction = fieldTestReportResolvedRoomListAction(parsed);
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

function desktopCompletionReceiveReady(parsed) {
  if (parsed.receive_enabled !== "true") {
    return false;
  }
  return !new Set(["receive-stopping", "receive-stopped", "receive-off"]).has(
    fieldTestReportReceiveValue(parsed),
  );
}

function desktopCompletionRouteReady(parsed) {
  return parsed.route_ready === "true" && parsed.route_readiness_ready === "true";
}

function desktopCompletionCanSendOrRecover(parsed) {
  const composerAction = fieldTestReportValue(parsed.composer_next_action, "none");
  if (composerAction === "write-message" || composerAction === "send-message") {
    return true;
  }
  return fieldTestReportNextActionValue(parsed) !== "none";
}

export function localManualE2eeRuntimeBoundaryStatus() {
  return {
    boundary: "noise-xx-session-key-replay-reviewed",
    localManualE2eeRuntimeReady: true,
    supportedLocalManualE2eeReady: true,
    supportedLocalManualE2eeScope: "1:1-local-manual-envelope-message-content-only",
    noiseXxTransportStateRequired: true,
    remoteStaticVerificationRequired: true,
    safetyTranscriptBound: true,
    channelBindingRequired: true,
    messageNumberNonceBindingRequired: true,
    replayCommitAfterDecrypt: true,
    tamperFailureNonAdvance: true,
    passphraseFirstStorageRequired: true,
    explicitEnvelopeExportImportReady: true,
    automaticNetworkOnLaunchAllowed: false,
    networkIoAttempted: false,
    productionE2eeReady: false,
    productionKeyManagementReady: false,
    supportedLocalKeyLifecycleReady: true,
    supportedLocalKeyLifecycleScope: "passphrase-first-sqlcipher-local-profile-store-only",
    supportedRollbackDetectionReady: true,
    supportedRollbackDetectionScope: "marker-only-detection-user-visible-reset-required",
    supportedLocalDeletionScopeReady: true,
    supportedLocalDeletionScope: "local-logical-delete-and-owned-app-data-wipe-only",
    appKeyWrappingReady: false,
    secureDeletionClaimAllowed: false,
    securityReadyClaimed: false,
  };
}

export function desktopFirstCompletionStatus(report) {
  const parsed = parseFieldTestReport(report);
  const blockers = [];
  const localE2eeBoundary = localManualE2eeRuntimeBoundaryStatus();
  if (parsed.room_present !== "true") {
    blockers.push("room");
  }
  if (parsed.session_ready !== "true") {
    blockers.push("session");
  }
  if (parsed.safety_confirmed !== "true") {
    blockers.push("safety");
  }
  if (!desktopCompletionRouteReady(parsed)) {
    blockers.push("private-route");
  }
  if (!desktopCompletionReceiveReady(parsed)) {
    blockers.push("receive");
  }
  if (!desktopCompletionCanSendOrRecover(parsed)) {
    blockers.push("send-or-recover");
  }
  return {
    scope: "desktop-local-private-flow",
    status: blockers.length === 0 ? "local-private-flow-no-current-blockers" : "incomplete",
    blockers,
    blockerSummary: blockers.length > 0 ? blockers.join("#") : "none",
    localManualE2eeRuntimeBoundary: localE2eeBoundary.boundary,
    localManualE2eeRuntimeReady: localE2eeBoundary.localManualE2eeRuntimeReady,
    supportedLocalManualE2eeReady: localE2eeBoundary.supportedLocalManualE2eeReady,
    supportedLocalManualE2eeScope: localE2eeBoundary.supportedLocalManualE2eeScope,
    replayCommitAfterDecrypt: localE2eeBoundary.replayCommitAfterDecrypt,
    tamperFailureNonAdvance: localE2eeBoundary.tamperFailureNonAdvance,
    passphraseFirstStorageRequired: localE2eeBoundary.passphraseFirstStorageRequired,
    externalOnionDeliveryVerified: false,
    productionMessagingReady: false,
    productionE2eeReady: localE2eeBoundary.productionE2eeReady,
    productionKeyManagementReady: localE2eeBoundary.productionKeyManagementReady,
    supportedLocalKeyLifecycleReady: localE2eeBoundary.supportedLocalKeyLifecycleReady,
    supportedLocalKeyLifecycleScope: localE2eeBoundary.supportedLocalKeyLifecycleScope,
    supportedRollbackDetectionReady: localE2eeBoundary.supportedRollbackDetectionReady,
    supportedRollbackDetectionScope: localE2eeBoundary.supportedRollbackDetectionScope,
    supportedLocalDeletionScopeReady: localE2eeBoundary.supportedLocalDeletionScopeReady,
    supportedLocalDeletionScope: localE2eeBoundary.supportedLocalDeletionScope,
    appKeyWrappingReady: localE2eeBoundary.appKeyWrappingReady,
    secureDeletionClaimAllowed: localE2eeBoundary.secureDeletionClaimAllowed,
    securityReadyClaimed: false,
    sensitiveCommunicationAllowed: false,
  };
}

const publicDiagnosticsRecoveryActions = new Set([
  "check-session",
  "enable-private-delivery",
  "prepare-private-route",
  "refresh-and-retry",
  "refresh-endpoint",
  "retry",
  "retry-network",
  "send-message",
  "start-receiving",
  "stop-receiving",
  "verify",
  "wait-receive-stop",
  "write-message",
  "check-data-lifecycle",
  "none",
]);

function publicDiagnosticsLocalRecoveryAction(parsed) {
  const localRecovery = fieldTestReportValue(parsed.local_recovery_action, "none");
  if (localRecovery === "check-data-lifecycle") {
    return "check-data-lifecycle";
  }
  if (
    parsed.rollback_suspicion === "true" ||
    parsed.resume_blocked === "true"
  ) {
    return "check-data-lifecycle";
  }
  return "";
}

function publicDiagnosticsRecoveryNextAction(parsed) {
  const action = fieldTestReportValue(fieldTestReportNextActionValue(parsed), "none");
  return publicDiagnosticsRecoveryActions.has(action) ? action : "review-field-test-report";
}

function desktopCompletionBlockerNextAction(blockers = [], parsed = {}) {
  const blocker = blockers[0] ?? "none";
  if (blocker === "room" || blocker === "session") {
    return "check-session";
  }
  if (blocker === "safety") {
    return "verify";
  }
  if (blocker === "private-route") {
    return "prepare-private-route";
  }
  if (blocker === "receive") {
    if (fieldTestReportReceiveValue(parsed) === "receive-stopping") {
      return "wait-receive-stop";
    }
    return "start-receiving";
  }
  if (blocker === "send-or-recover") {
    return "write-message";
  }
  return "none";
}

function publicDiagnosticsDesktopNextAction(parsed, desktopCompletion) {
  const localRecoveryAction = publicDiagnosticsLocalRecoveryAction(parsed);
  if (localRecoveryAction) {
    return localRecoveryAction;
  }
  const action = publicDiagnosticsRecoveryNextAction(parsed);
  if (action !== "none") {
    return action;
  }
  return desktopCompletionBlockerNextAction(desktopCompletion?.blockers, parsed);
}

function desktopCompletionBlockerFailureClass(blockers = []) {
  const blocker = blockers[0] ?? "none";
  if (blocker === "receive") {
    return "receive-blocked";
  }
  if (blocker === "send-or-recover") {
    return "desktop-action-needed";
  }
  return "none";
}

export function publicDiagnosticsFailureClass(parsed, desktopCompletion = null) {
  if (publicDiagnosticsLocalRecoveryAction(parsed)) {
    return "local-recovery-needed";
  }
  if (parsed.room_present !== "true") {
    return "room-not-open";
  }
  if (parsed.session_ready !== "true") {
    return "session-not-ready";
  }
  if (parsed.safety_confirmed !== "true") {
    return "safety-unverified";
  }
  if (fieldTestRouteReadinessBlocked(parsed)) {
    return "route-readiness-blocked";
  }
  if (parsed.receive_failure_kind && parsed.receive_failure_kind !== "none") {
    return "receive-blocked";
  }
  if (fieldTestReportOutboundFailureClass(parsed)) {
    return "outbound-delivery-blocked";
  }
  if (parsed.real_onion_next_blocker && parsed.real_onion_next_blocker !== "none") {
    return "advanced-transport-blocked";
  }
  return desktopCompletionBlockerFailureClass(desktopCompletion?.blockers);
}

export function publicBetaDiagnosticsReport(report, options = {}) {
  const parsed = parseFieldTestReport(report);
  const triage = fieldTestReportTriageState(report);
  const desktopCompletion = desktopFirstCompletionStatus(report);
  const failureClass = publicDiagnosticsFailureClass(parsed, desktopCompletion);
  const recoveryNextAction = publicDiagnosticsDesktopNextAction(parsed, desktopCompletion);
  const desktopAcceptanceNonClaims = [
    "external-onion-delivery",
    "production-messaging",
    "security-ready",
    "sensitive-communication",
    "windows-public-artifact",
  ].join("#");
  const lines = [
    "Another Dimension Chat public support diagnostics",
    "diagnostic_version=2",
    "diagnostic_scope=public-support",
    "payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only",
    "diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only",
    `allowed_public_intake_fields=${publicSupportDiagnosticsAllowedFieldsValue()}`,
    `forbidden_public_intake_fields=${publicSupportDiagnosticsForbiddenFieldsValue()}`,
    `app_version=${fieldTestReportValue(triage.appVersion, "unknown")}`,
    `build_channel=${fieldTestReportValue(triage.buildChannel, "unknown")}`,
    `build_commit=${fieldTestReportValue(triage.buildCommit, "unknown")}`,
    `failure_class=${fieldTestReportValue(failureClass, "none")}`,
    `recovery_next_action=${recoveryNextAction}`,
    `diagnostics_copy_next_action=${recoveryNextAction}`,
    `desktop_completion_scope=${fieldTestReportValue(desktopCompletion.scope, "unknown")}`,
    `desktop_completion_status=${fieldTestReportValue(desktopCompletion.status, "unknown")}`,
    `desktop_completion_blockers=${desktopCompletion.blockerSummary}`,
    `desktop_acceptance_surface=${fieldTestReportValue(desktopCompletion.scope, "unknown")}`,
    `desktop_acceptance_status=${fieldTestReportValue(desktopCompletion.status, "unknown")}`,
    `desktop_acceptance_blockers=${desktopCompletion.blockerSummary}`,
    `desktop_acceptance_next_action=${recoveryNextAction}`,
    `desktop_acceptance_non_claims=${desktopAcceptanceNonClaims}`,
    `local_manual_e2ee_runtime_boundary=${fieldTestReportValue(desktopCompletion.localManualE2eeRuntimeBoundary, "unknown")}`,
    `local_manual_e2ee_runtime_ready=${desktopCompletion.localManualE2eeRuntimeReady === true}`,
    `supported_local_manual_e2ee_ready=${desktopCompletion.supportedLocalManualE2eeReady === true}`,
    `supported_local_manual_e2ee_scope=${fieldTestReportValue(desktopCompletion.supportedLocalManualE2eeScope, "unknown")}`,
    `noise_xx_transport_state_required=true`,
    `remote_static_verification_required=true`,
    `safety_transcript_bound=true`,
    `channel_binding_required=true`,
    `message_number_nonce_binding_required=true`,
    `replay_commit_after_decrypt=${desktopCompletion.replayCommitAfterDecrypt === true}`,
    `tamper_failure_non_advance=${desktopCompletion.tamperFailureNonAdvance === true}`,
    `passphrase_first_storage_required=${desktopCompletion.passphraseFirstStorageRequired === true}`,
    `explicit_envelope_export_import_ready=true`,
    `production_e2ee_ready=${desktopCompletion.productionE2eeReady === true}`,
    `production_key_management_ready=${desktopCompletion.productionKeyManagementReady === true}`,
    `supported_local_key_lifecycle_ready=${desktopCompletion.supportedLocalKeyLifecycleReady === true}`,
    `supported_local_key_lifecycle_scope=${fieldTestReportValue(desktopCompletion.supportedLocalKeyLifecycleScope, "unknown")}`,
    `supported_rollback_detection_ready=${desktopCompletion.supportedRollbackDetectionReady === true}`,
    `supported_rollback_detection_scope=${fieldTestReportValue(desktopCompletion.supportedRollbackDetectionScope, "unknown")}`,
    `supported_local_deletion_scope_ready=${desktopCompletion.supportedLocalDeletionScopeReady === true}`,
    `supported_local_deletion_scope=${fieldTestReportValue(desktopCompletion.supportedLocalDeletionScope, "unknown")}`,
    `app_key_wrapping_ready=${desktopCompletion.appKeyWrappingReady === true}`,
    `rollback_prevention_claimed=false`,
    `secure_deletion_claim_allowed=${desktopCompletion.secureDeletionClaimAllowed === true}`,
    `desktop_acceptance_external_delivery_claim=false`,
    `desktop_acceptance_production_claim=false`,
    `desktop_acceptance_sensitive_use_claim=false`,
    `default_transport_path=local-manual-encrypted-envelope-exchange`,
    `default_transport_network_io=false`,
    `default_transport_automatic_delivery=false`,
    `default_transport_central_message_server=false`,
    `default_transport_push_dependency=false`,
    `default_transport_central_contact_discovery=false`,
    `high_risk_onion_path=explicit-user-triggered-fail-closed`,
    `high_risk_onion_direct_fallback=false`,
    `automatic_network_on_launch=false`,
    `windows_public_artifact_ready=false`,
    `windows_installer_ready=false`,
    `windows_signing_ready=false`,
    `windows_store_ready=false`,
    `windows_local_runtime_smoke_status=source-boundary-only`,
    `windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows`,
    `windows_app_data_path_review_required=true`,
    `windows_path_separator_review_required=true`,
    `windows_local_deletion_behavior_review_required=true`,
    `windows_redacted_diagnostics_behavior_review_required=true`,
    `windows_explicit_user_action_review_required=true`,
    `windows_release_blocker=local-build-smoke-and-release-boundary-review`,
    `external_onion_delivery_verified=${desktopCompletion.externalOnionDeliveryVerified === true}`,
    `production_messaging_ready=${desktopCompletion.productionMessagingReady === true}`,
    `security_ready_claimed=${desktopCompletion.securityReadyClaimed === true}`,
    `sensitive_communication_allowed=${desktopCompletion.sensitiveCommunicationAllowed === true}`,
    `app_launch_network=false`,
    `diagnostics_support_bundle_export=false`,
    `diagnostics_audit_evidence_claim=false`,
    `diagnostics_external_delivery_evidence_claim=false`,
    `diagnostics_security_ready_proof_claim=false`,
  ];
  if (options.includeCopyBoundary === true) {
    lines.push("crash_upload=false");
    lines.push("telemetry=false");
    lines.push("raw_log_export=false");
    lines.push("crash_dump_export=false");
    lines.push("automated_log_collection=false");
    lines.push("support_bundle_export=false");
    lines.push("raw_diagnostic_file_export=false");
    lines.push(`excluded_fields=${publicSupportDiagnosticsExcludedFieldsValue()}`);
  }
  return lines.join("\n");
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

export function fieldTestReportComparisonStatus(localReport, peerReport) {
  if (!String(peerReport ?? "").trim()) {
    return "peer-report-missing";
  }
  const buildMatch = fieldTestBuildIdentityMatches(localReport, peerReport);
  if (buildMatch === false) {
    return "build-mismatch";
  }
  const comparison = fieldTestReportComparison(localReport, peerReport);
  if (comparison.startsWith("compare reports-aligned local_state ")) {
    return "reports-aligned-local-state-diff";
  }
  if (comparison === "compare reports-aligned") {
    return "reports-aligned";
  }
  return "report-mismatch";
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

function fieldTestReportActionState(localReport, peerReport, nextActionKeyForReport) {
  const nextActionKey = nextActionKeyForReport(localReport, peerReport);
  const localRecoveryAction = fieldTestReportRecoveryActionForNextKey(localReport, nextActionKey);
  const composerAction = fieldTestReportComposerAction(localReport);
  const peerNextActionKey = fieldTestPeerLocalStateNextActionKey(
    localReport,
    peerReport,
    nextActionKeyForReport,
  );
  const peerRecoveryAction = peerNextActionKey
    ? fieldTestReportRecoveryActionForNextKey(peerReport, peerNextActionKey)
    : "";
  return {
    nextActionKey,
    localRecoveryAction,
    composerAction,
    peerNextActionKey,
    peerRecoveryAction,
  };
}

function fieldTestReportCopyActionLinesFromState(comparisonStatus, actionState) {
  return [
    `peer_report_status=${fieldTestReportValue(comparisonStatus, "unknown")}`,
    `next_action=${fieldTestReportValue(actionState.nextActionKey, "none")}`,
    actionState.composerAction ? `composer_action=${fieldTestReportValue(actionState.composerAction, "none")}` : "",
    actionState.localRecoveryAction && actionState.localRecoveryAction !== "none"
      ? `local_recovery_action=${fieldTestReportValue(actionState.localRecoveryAction, "none")}`
      : "",
    actionState.peerNextActionKey
      ? `peer_next_action=${fieldTestReportValue(actionState.peerNextActionKey, "none")}`
      : "",
    actionState.peerNextActionKey
      ? `peer_recovery_action=${fieldTestReportValue(actionState.peerRecoveryAction, "none")}`
      : "",
  ].filter(Boolean);
}

export function fieldTestReportCopyActionLines(localReport, peerReport, nextActionKeyForReport) {
  return fieldTestReportCopyActionLinesFromState(
    fieldTestReportComparisonStatus(localReport, peerReport),
    fieldTestReportActionState(localReport, peerReport, nextActionKeyForReport),
  );
}

export function fieldTestReportPanelState(localReport, peerReport, nextActionKeyForReport) {
  const comparison = fieldTestReportComparison(localReport, peerReport);
  const comparisonStatus = fieldTestReportComparisonStatus(localReport, peerReport);
  const actionState = fieldTestReportActionState(localReport, peerReport, nextActionKeyForReport);
  return {
    hasPeerReport: Boolean(String(peerReport ?? "").trim()),
    comparison,
    comparisonStatus,
    nextActionKey: actionState.nextActionKey,
    peerNextActionKey: actionState.peerNextActionKey,
    copyActionLines: fieldTestReportCopyActionLinesFromState(comparisonStatus, actionState),
  };
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
  if (routeReadinessAction === "stop-receiving") {
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
