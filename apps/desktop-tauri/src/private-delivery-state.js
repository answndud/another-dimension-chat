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

function fieldTestReportEvidenceValue(value, fallback = "unknown") {
  const text = String(value ?? "").trim();
  if (!text) {
    return fallback;
  }
  return text
    .replace(/[^\w .:/#=-]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 192);
}

function manualEnvelopePanelItem(state, text) {
  return {
    state,
    text,
  };
}

function manualEnvelopeFailureForReason(reason) {
  const normalized = fieldTestReportValue(reason, "").toLowerCase();
  if (!normalized || normalized === "none" || normalized === "matched") {
    return { failureClass: "none", recoveryNextAction: "continue-manual-envelope-flow" };
  }
  if (normalized.includes("replay")) {
    return { failureClass: "replay-rejected", recoveryNextAction: "ask-for-fresh-envelope" };
  }
  if (
    normalized.includes("malformed") ||
    normalized.includes("corrupted") ||
    normalized.includes("wrong_type") ||
    normalized.includes("oversized") ||
    normalized.includes("duplicate") ||
    normalized.includes("payload-rejected")
  ) {
    return { failureClass: "malformed-envelope", recoveryNextAction: "ask-for-fresh-envelope" };
  }
  if (normalized === "empty-slot" || normalized === "missing-entry" || normalized.includes("missing-peer")) {
    return { failureClass: "missing-peer-envelope", recoveryNextAction: "load-or-ask-for-peer-envelope" };
  }
  if (normalized.includes("stale") || normalized.includes("mismatch")) {
    return { failureClass: "stale-envelope-selection", recoveryNextAction: "reapply-selected-row" };
  }
  if (normalized.includes("canceled")) {
    return { failureClass: "canceled-envelope-row", recoveryNextAction: "write-and-export-new-message" };
  }
  return { failureClass: "manual-envelope-blocked", recoveryNextAction: "inspect-visible-next-action" };
}

export function manualEnvelopeExchangePanelView(input = {}) {
  const sessionReady = input.sessionReady === true;
  const safetyVerified = input.safetyVerified === true;
  const manualReady = sessionReady && safetyVerified;
  const selectedStale = input.selectedMessageInputMatches === false || input.selectedMessageInputStale === true;
  const exported = Boolean(
    input.hasLocalMessageEnvelope ||
      input.senderEnvelopeSlotPresent ||
      input.outboundExported ||
      input.selectedNeedsPeerImport,
  );
  const exportReady = Boolean(input.hasOutboundMessageInput || input.selectedNeedsSenderExport);
  const importReady = Boolean(input.hasInboundEnvelopeInput || input.hasRemoteMessageEnvelopeSlot);
  const imported = Boolean(input.hasImportedMessage || input.hasReceivedMessage || input.inboundImported);
  const replyDraft = input.hasTwoProfileReplyDraftInput === true;
  const replySelected = input.hasTwoProfileReplySelected === true;
  const plaintextReviewPending = input.plaintextReviewPending === true;
  const retryReady = input.retryAvailable === true;
  const cancelReady = input.cancelAvailable === true;
  const latestFailure = manualEnvelopeFailureForReason(input.latestFailureClass);
  let failure = latestFailure.failureClass === "none"
    ? manualEnvelopeFailureForReason(input.slotMismatchReason)
    : latestFailure;
  if (selectedStale) {
    failure = { failureClass: "stale-envelope-selection", recoveryNextAction: "reapply-selected-row" };
  }
  if (failure.failureClass === "none" && input.selectedNeedsPeerImport === true && !importReady && !imported) {
    failure = { failureClass: "missing-peer-envelope", recoveryNextAction: "load-or-ask-for-peer-envelope" };
  }
  if (input.latestRecoveryNextAction) {
    failure = {
      failureClass: failure.failureClass,
      recoveryNextAction: fieldTestReportValue(input.latestRecoveryNextAction, failure.recoveryNextAction),
    };
  }
  const currentText = failure.failureClass === "none"
    ? fieldTestReportValue(input.currentStep, "Current | open or create a room.")
    : `Recovery | failure_class=${failure.failureClass} recovery_next_action=${failure.recoveryNextAction}`;
  const exportItem = !manualReady
    ? manualEnvelopePanelItem(
        "blocked",
        sessionReady ? "Compare the safety phrase before exporting." : "Open or create a verified room before exporting.",
      )
    : exported
      ? manualEnvelopePanelItem("complete", "Envelope exported or ready for peer import.")
      : exportReady
        ? manualEnvelopePanelItem("ready", "Write message and export envelope from this device.")
        : manualEnvelopePanelItem("waiting", "Write a message after safety verification.");
  const importItem = imported
    ? manualEnvelopePanelItem("complete", "Peer envelope imported for local plaintext review.")
    : importReady
      ? manualEnvelopePanelItem("ready", "Import the loaded peer envelope for this row.")
      : manualEnvelopePanelItem(
          input.selectedNeedsPeerImport ? "blocked" : "waiting",
          input.selectedNeedsPeerImport
            ? "Load the peer envelope or ask for a fresh export."
            : "Wait for the peer envelope.",
        );
  const replyItem = replyDraft
    ? manualEnvelopePanelItem("ready", "Reply draft ready; send it through the stored session.")
    : plaintextReviewPending || input.hasImportedMessage
      ? manualEnvelopePanelItem("ready", "Show plaintext locally before writing the reply.")
      : replySelected || input.hasReceivedMessage
        ? manualEnvelopePanelItem("ready", "Write the reply for the selected delivered row.")
        : manualEnvelopePanelItem("waiting", "Reply unlocks after import and plaintext review.");
  const recoveryText = retryReady || cancelReady
    ? `Retry/cancel available for the selected pending send. retry=${retryReady} cancel=${cancelReady}`
    : "No pending retry or cancel action.";
  const recoveryItem = manualEnvelopePanelItem(retryReady || cancelReady ? "ready" : "waiting", recoveryText);
  const failureItem = manualEnvelopePanelItem(
    failure.failureClass === "none" ? "complete" : "failed",
    `failure_class=${failure.failureClass} recovery_next_action=${failure.recoveryNextAction}`,
  );
  return {
    current: manualEnvelopePanelItem(
      failure.failureClass === "none" ? (safetyVerified ? "ready" : "waiting") : "failed",
      currentText,
    ),
    export: exportItem,
    import: importItem,
    reply: replyItem,
    recovery: recoveryItem,
    failure: failureItem,
    failureClass: failure.failureClass,
    recoveryNextAction: failure.recoveryNextAction,
    rawEnvelopePayloadReturned: false,
    pairingPayloadReturned: false,
    supportPayloadAllowed: false,
    boundary:
      "manual_envelope_panel=true raw_envelope_payload_returned=false pairing_payload_returned=false diagnostics_payload_allowed=false",
  };
}

export const PUBLIC_SUPPORT_DIAGNOSTICS_ALLOWED_FIELDS = Object.freeze([
  "app-status",
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
  "release-class-readiness",
  "high-risk-runtime-evidence-source",
  "high-risk-runtime-evidence-accepted",
  "high-risk-runtime-primary-blocker",
  "high-risk-runtime-failure-class",
  "engine-sidecar-status-failure-class",
  "engine-sidecar-manual-self-test-failure-class",
  "engine-sidecar-redacted-runtime-status",
]);

export const PUBLIC_SUPPORT_DIAGNOSTICS_FORBIDDEN_FIELDS = Object.freeze([
  "raw-logs",
  "crash-dumps",
  "screenshots",
  "onion-endpoints",
  "endpoints",
  "invite-codes",
  "pairing-payloads",
  "envelope-payloads",
  "endpoint-payloads",
  "message-text",
  "local-paths",
  "payloads",
  "safety-phrases",
  "profile-names",
  "passphrases",
  "private-keys",
  "key-material",
  "private-planning-notes",
  "support-bundles",
]);

export const PUBLIC_SUPPORT_DIAGNOSTICS_POLICY_VERSION = "public-intake-v1";
export const PUBLIC_SUPPORT_DIAGNOSTICS_POLICY_ALIGNMENT =
  "app-diagnostics#github-issue-template#security-policy";

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
    "private_keys",
    "key_material",
    "private_planning_notes",
    "support_bundles",
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

export function highRiskTransportMetadataBoundaryStatus() {
  const runtimeEvidenceContract =
    "runtime-report#explicit-user-action#onion-only#no-direct-fallback#endpoint-rotation#redacted-runtime-event#clipboard-expiry#emergency-controls";
  return {
    mode: "onion-only",
    onionOnly: true,
    directFallbackAllowed: false,
    dnsEndpointAllowed: false,
    ipEndpointAllowed: false,
    explicitUserPermissionRequired: true,
    appLaunchBootstrapAllowed: false,
    bridgeFailureClassRedacted: true,
    bridgeLineExposed: false,
    onionEndpointExposed: false,
    descriptorExposed: false,
    localPathExposed: false,
    envelopeSizeBucket: "bucket-4k",
    optionalSendDelaySupported: true,
    timestampPrecision: "minute",
    redactedContactId: true,
    redactedSessionId: true,
    endpointStateSeparated: true,
    streamRetryCancelStateSeparated: true,
    explicitStartActionRequired: true,
    explicitStopActionSupported: true,
    roomOpenNetworkAttempted: false,
    endpointRotationStateSeparated: true,
    encryptedEndpointUpdateReady: true,
    staleEndpointRefreshAction: "refresh-private-route",
    receiveLoopOwnerScoped: true,
    failureClasses: [
      "bridge_config_missing",
      "bootstrap_timeout",
      "peer_unreachable",
      "stale_endpoint",
      "receive_owner_mismatch",
    ],
    runtimeEventIdentifiersRedacted: true,
    runtimeEvidenceRequiredForReady: true,
    runtimeEvidencePresent: false,
    runtimeEvidenceSource: "absent",
    runtimeEvidenceContract,
    localOnlyEvidencePromoted: false,
    fabricatedEvidencePromoted: false,
    highRiskPublicClaimAllowed: false,
    highRiskTransportReady: false,
    notReadyReason: "runtime-network-disabled-until-explicit-user-action",
    boundary: [
      "high_risk_transport_mode=onion-only",
      "high_risk_transport_onion_only=true",
      "high_risk_transport_direct_fallback=false",
      "high_risk_transport_dns_endpoint=false",
      "high_risk_transport_ip_endpoint=false",
      "high_risk_transport_explicit_user_permission=true",
      "high_risk_transport_app_launch_bootstrap=false",
      "high_risk_transport_bridge_failure_class=redacted",
      "high_risk_transport_bridge_line_exposed=false",
      "high_risk_transport_onion_endpoint_exposed=false",
      "high_risk_transport_descriptor_exposed=false",
      "high_risk_transport_local_path_exposed=false",
      "high_risk_transport_envelope_size_bucket=bucket-4k",
      "high_risk_transport_optional_send_delay=true",
      "high_risk_transport_timestamp_precision=minute",
      "high_risk_transport_redacted_contact_id=true",
      "high_risk_transport_redacted_session_id=true",
      "high_risk_transport_endpoint_state_separated=true",
      "high_risk_transport_stream_retry_cancel_state_separated=true",
      "high_risk_transport_explicit_start_action_required=true",
      "high_risk_transport_explicit_stop_action_supported=true",
      "high_risk_transport_room_open_network=false",
      "high_risk_transport_endpoint_rotation_state_separated=true",
      "high_risk_transport_encrypted_endpoint_update_ready=true",
      "high_risk_transport_stale_endpoint_refresh_action=refresh-private-route",
      "high_risk_transport_receive_loop_owner_scoped=true",
      "high_risk_transport_failure_classes=bridge_config_missing#bootstrap_timeout#peer_unreachable#stale_endpoint#receive_owner_mismatch",
      "high_risk_transport_runtime_event_identifiers_redacted=true",
      "high_risk_transport_runtime_evidence_required_for_ready=true",
      "high_risk_transport_runtime_evidence_present=false",
      "high_risk_runtime_evidence_source=absent",
      `high_risk_runtime_evidence_contract=${runtimeEvidenceContract}`,
      "local_only_evidence_promoted=false",
      "fabricated_evidence_promoted=false",
      "high_risk_public_claim_allowed=false",
      "high_risk_transport_ready=false",
      "high_risk_transport_not_ready_reason=runtime-network-disabled-until-explicit-user-action",
    ].join(" "),
  };
}

export function localManualE2eeRuntimeBoundaryStatus() {
  const transportMetadata = highRiskTransportMetadataBoundaryStatus();
  const localStorage = localStorageRuntimeEvidenceView();
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
    productionKeyManagementReady: true,
    localStorageRuntimeEvidenceReady: localStorage.localAtRestMitigationReady,
    localAtRestMitigationReady: localStorage.localAtRestMitigationReady,
    localStorageRuntimeEvidenceBoundary: localStorage.boundary,
    lockedStateNoPlaintextAccess: localStorage.lockedStateNoPlaintextAccess,
    lockedStateNoKeyMaterialAccess: localStorage.lockedStateNoKeyMaterialAccess,
    lockedStateNoRuntimeMessaging: localStorage.lockedStateNoRuntimeMessaging,
    supportedLocalKeyLifecycleReady: true,
    supportedLocalKeyLifecycleScope: "passphrase-first-sqlcipher-local-profile-store-only",
    supportedRollbackDetectionReady: true,
    supportedRollbackDetectionScope: "marker-only-detection-user-visible-reset-required",
    rollbackMarkerStatus: localStorage.rollbackMarkerStatus,
    rollbackMarkerPresent: localStorage.rollbackMarkerPresent,
    rollbackSuspicionDetected: localStorage.rollbackSuspicionDetected,
    rollbackResumeBlocked: localStorage.rollbackResumeBlocked,
    supportedLocalDeletionScopeReady: true,
    supportedLocalDeletionScope: "local-logical-delete-and-owned-app-data-wipe-only",
    localDeleteConfirmationRequired: localStorage.localDeleteConfirmationRequired,
    localDeleteConfirmation: localStorage.localDeleteConfirmation,
    backupExclusionPolicyDecided: localStorage.backupExclusionPolicyDecided,
    backupExclusionVerified: localStorage.backupExclusionVerified,
    backupExclusionStatus: localStorage.backupExclusionStatus,
    supportedDefaultTransportReady: true,
    supportedDefaultTransportScope: "local-manual-courier-envelope-exchange-only",
    supportedOwnerObservedUsabilityRehearsalReady: true,
    supportedUsabilityRecoveryScope: "owner-observed-critical-desktop-task-script-only",
    criticalDesktopTaskScriptReady: true,
    recoveryVocabularyAligned: true,
    usabilityStudyCompleted: false,
    productionWordingReady: false,
    appKeyWrappingReady: false,
    secureDeletionClaimAllowed: false,
    productionTransportReady: false,
    highRiskTransportMetadataMinimized: true,
    highRiskTransportNotReadyReason: transportMetadata.notReadyReason,
    highRiskTransportMetadataBoundary: transportMetadata.boundary,
    reliableExternalDeliveryClaimAllowed: false,
    securityReadyClaimed: false,
  };
}

export function localStorageRuntimeEvidenceView(input = {}) {
  const passphraseFirstUnlockRequired = input.passphraseFirstUnlockRequired !== false;
  const osKeystoreOnlyUnlockRejected = input.osKeystoreOnlyUnlockRejected !== false;
  const lockedStateNoPlaintextAccess = input.lockedStateNoPlaintextAccess !== false;
  const lockedStateNoKeyMaterialAccess = input.lockedStateNoKeyMaterialAccess !== false;
  const lockedStateNoRuntimeMessaging = input.lockedStateNoRuntimeMessaging !== false;
  const rollbackMarkerStatus = fieldTestReportValue(
    input.rollbackMarkerStatus,
    "passphrase-first-runtime-unlock-with-marker-based-rollback-detection",
  );
  const rollbackMarkerPresent = input.rollbackMarkerPresent !== false;
  const rollbackDetectionReady = input.rollbackDetectionReady !== false;
  const rollbackSuspicionDetected = input.rollbackSuspicionDetected === true;
  const rollbackResumeBlocked = input.rollbackResumeBlocked === true || rollbackSuspicionDetected;
  const rollbackPreventionClaimed = input.rollbackPreventionClaimed === true;
  const localDeleteConfirmationRequired = input.localDeleteConfirmationRequired !== false;
  const localDeleteConfirmation = fieldTestReportValue(input.localDeleteConfirmation, "WIPE_LOCAL_DATA")
    .replace(/\s+/g, "_");
  const localDeleteScope = fieldTestReportValue(input.localDeleteScope, "owned-app-data-on-this-device");
  const localDeleteRedactedResult = input.localDeleteRedactedResult !== false;
  const backupExclusionPolicyDecided = input.backupExclusionPolicyDecided !== false;
  const backupExclusionVerified = input.backupExclusionVerified === true;
  const backupExclusionStatus = backupExclusionVerified
    ? "verified"
    : backupExclusionPolicyDecided
      ? "policy-decided-verification-required"
      : "missing";
  const cloudBackupOrSyncEnabled = input.cloudBackupOrSyncEnabled === true;
  const backupRecoveryClaimed = input.backupRecoveryClaimed === true;
  const appKeyWrappingReady = input.appKeyWrappingReady === true;
  const secureDeletionClaimAllowed = input.secureDeletionClaimAllowed === true;
  const productionKeyManagementReady = input.productionKeyManagementReady !== false;
  const compromisedEndpointProtected = false;
  const localAtRestMitigationReady =
    passphraseFirstUnlockRequired &&
    osKeystoreOnlyUnlockRejected &&
    lockedStateNoPlaintextAccess &&
    lockedStateNoKeyMaterialAccess &&
    lockedStateNoRuntimeMessaging &&
    rollbackMarkerPresent &&
    rollbackDetectionReady &&
    !rollbackSuspicionDetected &&
    !rollbackResumeBlocked &&
    localDeleteConfirmationRequired &&
    backupExclusionPolicyDecided &&
    backupExclusionStatus === "policy-decided-verification-required" &&
    !cloudBackupOrSyncEnabled &&
    !backupRecoveryClaimed &&
    !rollbackPreventionClaimed &&
    !appKeyWrappingReady &&
    !secureDeletionClaimAllowed &&
    productionKeyManagementReady;
  const boundary = "passphrase-first-locked-state-rollback-marker-local-delete-backup-exclusion-v1";
  const summary = [
    `local_storage_runtime_evidence_boundary=${boundary}`,
    `local_at_rest_mitigation_ready=${localAtRestMitigationReady}`,
    `passphrase_first_unlock_required=${passphraseFirstUnlockRequired}`,
    `os_keystore_only_unlock_rejected=${osKeystoreOnlyUnlockRejected}`,
    `locked_state_no_plaintext_access=${lockedStateNoPlaintextAccess}`,
    `locked_state_no_key_material_access=${lockedStateNoKeyMaterialAccess}`,
    `locked_state_no_runtime_messaging=${lockedStateNoRuntimeMessaging}`,
    `rollback_marker_status=${rollbackMarkerStatus}`,
    `rollback_marker_present=${rollbackMarkerPresent}`,
    `rollback_detection_ready=${rollbackDetectionReady}`,
    `rollback_suspicion_detected=${rollbackSuspicionDetected}`,
    `rollback_resume_blocked=${rollbackResumeBlocked}`,
    `rollback_prevention_claimed=${rollbackPreventionClaimed}`,
    `local_delete_confirmation_required=${localDeleteConfirmationRequired}`,
    `local_delete_confirmation=${localDeleteConfirmation}`,
    `local_delete_scope=${localDeleteScope}`,
    `local_delete_redacted_result=${localDeleteRedactedResult}`,
    `backup_exclusion_policy_decided=${backupExclusionPolicyDecided}`,
    `backup_exclusion_verified=${backupExclusionVerified}`,
    `backup_exclusion_status=${backupExclusionStatus}`,
    `cloud_backup_or_sync_enabled=${cloudBackupOrSyncEnabled}`,
    `backup_recovery_claimed=${backupRecoveryClaimed}`,
    `app_key_wrapping_ready=${appKeyWrappingReady}`,
    `secure_deletion_claim_allowed=${secureDeletionClaimAllowed}`,
    `production_key_management_ready=${productionKeyManagementReady}`,
    `compromised_endpoint_protected=${compromisedEndpointProtected}`,
  ].join(" ");
  return {
    boundary,
    summary,
    localAtRestMitigationReady,
    passphraseFirstUnlockRequired,
    osKeystoreOnlyUnlockRejected,
    lockedStateNoPlaintextAccess,
    lockedStateNoKeyMaterialAccess,
    lockedStateNoRuntimeMessaging,
    rollbackMarkerStatus,
    rollbackMarkerPresent,
    rollbackDetectionReady,
    rollbackSuspicionDetected,
    rollbackResumeBlocked,
    rollbackPreventionClaimed,
    localDeleteConfirmationRequired,
    localDeleteConfirmation,
    localDeleteScope,
    localDeleteRedactedResult,
    backupExclusionPolicyDecided,
    backupExclusionVerified,
    backupExclusionStatus,
    cloudBackupOrSyncEnabled,
    backupRecoveryClaimed,
    appKeyWrappingReady,
    secureDeletionClaimAllowed,
    productionKeyManagementReady,
    compromisedEndpointProtected,
  };
}

export function noSilentNetworkBoundaryStatus(input = {}) {
  const explicitUserPermission = input.manualNetworkPermission === true;
  const roomReady = input.roomReady === true;
  const profileReady = input.profileReady === true;
  const networkAttemptAllowed = explicitUserPermission && roomReady && profileReady;
  return {
    defaultTransportPath: "local-manual-encrypted-envelope-exchange",
    defaultTransportNetworkIo: false,
    defaultTransportAutomaticDelivery: false,
    defaultTransportCentralMessageServer: false,
    defaultTransportPushDependency: false,
    defaultTransportCentralContactDiscovery: false,
    advancedTransportMode: "explicit-user-triggered-onion-only",
    advancedControlsSeparated: true,
    automaticNetworkOnLaunchAllowed: false,
    explicitUserPermissionRequired: true,
    roomProfileReadinessRequired: true,
    explicitUserPermission,
    roomReady,
    profileReady,
    networkAttemptAllowed,
    reliableOnionDeliveryClaimAllowed: false,
    censorshipResistanceClaimAllowed: false,
    boundary: [
      "no_silent_network=true",
      "default_transport_path=local-manual-encrypted-envelope-exchange",
      "default_transport_network_io=false",
      "default_transport_automatic_delivery=false",
      "default_transport_central_message_server=false",
      "default_transport_push_dependency=false",
      "default_transport_central_contact_discovery=false",
      "advanced_transport_mode=explicit-user-triggered-onion-only",
      "advanced_controls_separated=true",
      "automatic_network_on_launch=false",
      "explicit_user_permission_required=true",
      "room_profile_readiness_required=true",
      `explicit_user_permission=${explicitUserPermission}`,
      `room_ready=${roomReady}`,
      `profile_ready=${profileReady}`,
      `network_attempt_allowed=${networkAttemptAllowed}`,
      "reliable_onion_delivery_claim=false",
      "censorship_resistance_claim=false",
    ].join(" "),
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
    localStorageRuntimeEvidenceReady: localE2eeBoundary.localStorageRuntimeEvidenceReady,
    localAtRestMitigationReady: localE2eeBoundary.localAtRestMitigationReady,
    localStorageRuntimeEvidenceBoundary: localE2eeBoundary.localStorageRuntimeEvidenceBoundary,
    lockedStateNoPlaintextAccess: localE2eeBoundary.lockedStateNoPlaintextAccess,
    lockedStateNoKeyMaterialAccess: localE2eeBoundary.lockedStateNoKeyMaterialAccess,
    lockedStateNoRuntimeMessaging: localE2eeBoundary.lockedStateNoRuntimeMessaging,
    supportedLocalKeyLifecycleReady: localE2eeBoundary.supportedLocalKeyLifecycleReady,
    supportedLocalKeyLifecycleScope: localE2eeBoundary.supportedLocalKeyLifecycleScope,
    supportedRollbackDetectionReady: localE2eeBoundary.supportedRollbackDetectionReady,
    supportedRollbackDetectionScope: localE2eeBoundary.supportedRollbackDetectionScope,
    rollbackMarkerStatus: localE2eeBoundary.rollbackMarkerStatus,
    rollbackMarkerPresent: localE2eeBoundary.rollbackMarkerPresent,
    rollbackSuspicionDetected: localE2eeBoundary.rollbackSuspicionDetected,
    rollbackResumeBlocked: localE2eeBoundary.rollbackResumeBlocked,
    supportedLocalDeletionScopeReady: localE2eeBoundary.supportedLocalDeletionScopeReady,
    supportedLocalDeletionScope: localE2eeBoundary.supportedLocalDeletionScope,
    localDeleteConfirmationRequired: localE2eeBoundary.localDeleteConfirmationRequired,
    localDeleteConfirmation: localE2eeBoundary.localDeleteConfirmation,
    backupExclusionPolicyDecided: localE2eeBoundary.backupExclusionPolicyDecided,
    backupExclusionVerified: localE2eeBoundary.backupExclusionVerified,
    backupExclusionStatus: localE2eeBoundary.backupExclusionStatus,
    supportedDefaultTransportReady: localE2eeBoundary.supportedDefaultTransportReady,
    supportedDefaultTransportScope: localE2eeBoundary.supportedDefaultTransportScope,
    supportedOwnerObservedUsabilityRehearsalReady:
      localE2eeBoundary.supportedOwnerObservedUsabilityRehearsalReady,
    supportedUsabilityRecoveryScope: localE2eeBoundary.supportedUsabilityRecoveryScope,
    criticalDesktopTaskScriptReady: localE2eeBoundary.criticalDesktopTaskScriptReady,
    recoveryVocabularyAligned: localE2eeBoundary.recoveryVocabularyAligned,
    usabilityStudyCompleted: localE2eeBoundary.usabilityStudyCompleted,
    productionWordingReady: localE2eeBoundary.productionWordingReady,
    appKeyWrappingReady: localE2eeBoundary.appKeyWrappingReady,
    secureDeletionClaimAllowed: localE2eeBoundary.secureDeletionClaimAllowed,
    productionTransportReady: localE2eeBoundary.productionTransportReady,
    highRiskTransportMetadataMinimized: localE2eeBoundary.highRiskTransportMetadataMinimized,
    highRiskTransportNotReadyReason: localE2eeBoundary.highRiskTransportNotReadyReason,
    highRiskTransportMetadataBoundary: localE2eeBoundary.highRiskTransportMetadataBoundary,
    reliableExternalDeliveryClaimAllowed: localE2eeBoundary.reliableExternalDeliveryClaimAllowed,
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
  if (
    parsed.evidence_source &&
    parsed.failure_class &&
    parsed.failure_class !== "none" &&
    !parsed.failure_class.includes("/")
  ) {
    return fieldTestReportValue(parsed.failure_class, "none");
  }
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
  const highRiskRuntimeEvidenceSource = fieldTestReportValue(
    parsed.evidence_source ?? parsed.high_risk_runtime_evidence_source,
    "absent",
  );
  const highRiskRuntimeFailureClass = fieldTestReportValue(
    parsed.failure_class ?? parsed.high_risk_runtime_failure_class,
    "none",
  );
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
    `public_intake_policy_version=${PUBLIC_SUPPORT_DIAGNOSTICS_POLICY_VERSION}`,
    `public_intake_policy_alignment=${PUBLIC_SUPPORT_DIAGNOSTICS_POLICY_ALIGNMENT}`,
    "public_intake_policy_fields_aligned=true",
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
    `local_storage_runtime_evidence_ready=${desktopCompletion.localStorageRuntimeEvidenceReady === true}`,
    `local_storage_runtime_evidence_boundary=${fieldTestReportValue(desktopCompletion.localStorageRuntimeEvidenceBoundary, "unknown")}`,
    `local_at_rest_mitigation_ready=${desktopCompletion.localAtRestMitigationReady === true}`,
    `locked_state_no_plaintext_access=${desktopCompletion.lockedStateNoPlaintextAccess === true}`,
    `locked_state_no_key_material_access=${desktopCompletion.lockedStateNoKeyMaterialAccess === true}`,
    `locked_state_no_runtime_messaging=${desktopCompletion.lockedStateNoRuntimeMessaging === true}`,
    `supported_local_key_lifecycle_ready=${desktopCompletion.supportedLocalKeyLifecycleReady === true}`,
    `supported_local_key_lifecycle_scope=${fieldTestReportValue(desktopCompletion.supportedLocalKeyLifecycleScope, "unknown")}`,
    `supported_rollback_detection_ready=${desktopCompletion.supportedRollbackDetectionReady === true}`,
    `supported_rollback_detection_scope=${fieldTestReportValue(desktopCompletion.supportedRollbackDetectionScope, "unknown")}`,
    `rollback_marker_status=${fieldTestReportValue(desktopCompletion.rollbackMarkerStatus, "unknown")}`,
    `rollback_marker_present=${desktopCompletion.rollbackMarkerPresent === true}`,
    `rollback_suspicion_detected=${desktopCompletion.rollbackSuspicionDetected === true}`,
    `rollback_resume_blocked=${desktopCompletion.rollbackResumeBlocked === true}`,
    `supported_local_deletion_scope_ready=${desktopCompletion.supportedLocalDeletionScopeReady === true}`,
    `supported_local_deletion_scope=${fieldTestReportValue(desktopCompletion.supportedLocalDeletionScope, "unknown")}`,
    `local_delete_confirmation_required=${desktopCompletion.localDeleteConfirmationRequired === true}`,
    `local_delete_confirmation=${fieldTestReportValue(desktopCompletion.localDeleteConfirmation, "unknown")}`,
    `backup_exclusion_policy_decided=${desktopCompletion.backupExclusionPolicyDecided === true}`,
    `backup_exclusion_verified=${desktopCompletion.backupExclusionVerified === true}`,
    `backup_exclusion_status=${fieldTestReportValue(desktopCompletion.backupExclusionStatus, "unknown")}`,
    `app_key_wrapping_ready=${desktopCompletion.appKeyWrappingReady === true}`,
    `cloud_backup_or_sync_enabled=false`,
    `backup_recovery_claimed=false`,
    `rollback_prevention_claimed=false`,
    `secure_deletion_claim_allowed=${desktopCompletion.secureDeletionClaimAllowed === true}`,
    `compromised_endpoint_protected=false`,
    `desktop_acceptance_external_delivery_claim=false`,
    `desktop_acceptance_production_claim=false`,
    `desktop_acceptance_sensitive_use_claim=false`,
    `default_transport_path=local-manual-encrypted-envelope-exchange`,
    `supported_default_transport_ready=${desktopCompletion.supportedDefaultTransportReady === true}`,
    `supported_default_transport_scope=${fieldTestReportValue(desktopCompletion.supportedDefaultTransportScope, "unknown")}`,
    `default_transport_network_io=false`,
    `default_transport_automatic_delivery=false`,
    `default_transport_central_message_server=false`,
    `default_transport_push_dependency=false`,
    `default_transport_central_contact_discovery=false`,
    `production_transport_ready=${desktopCompletion.productionTransportReady === true}`,
    `reliable_external_delivery_claim_allowed=${desktopCompletion.reliableExternalDeliveryClaimAllowed === true}`,
    `supported_owner_observed_usability_rehearsal_ready=${desktopCompletion.supportedOwnerObservedUsabilityRehearsalReady === true}`,
    `supported_usability_recovery_scope=${fieldTestReportValue(desktopCompletion.supportedUsabilityRecoveryScope, "unknown")}`,
    `critical_desktop_task_script_ready=${desktopCompletion.criticalDesktopTaskScriptReady === true}`,
    `recovery_vocabulary_aligned=${desktopCompletion.recoveryVocabularyAligned === true}`,
    `usability_study_completed=${desktopCompletion.usabilityStudyCompleted === true}`,
    `production_wording_ready=${desktopCompletion.productionWordingReady === true}`,
    `high_risk_onion_path=explicit-user-triggered-fail-closed`,
    `high_risk_onion_direct_fallback=false`,
    `high_risk_transport_mode=onion-only`,
    `high_risk_transport_onion_only=true`,
    `high_risk_transport_direct_fallback=false`,
    `high_risk_transport_dns_endpoint=false`,
    `high_risk_transport_ip_endpoint=false`,
    `high_risk_transport_explicit_user_permission=true`,
    `high_risk_transport_app_launch_bootstrap=false`,
    `high_risk_transport_bridge_failure_class=redacted`,
    `high_risk_transport_bridge_line_exposed=false`,
    `high_risk_transport_onion_endpoint_exposed=false`,
    `high_risk_transport_descriptor_exposed=false`,
    `high_risk_transport_local_path_exposed=false`,
    `high_risk_transport_envelope_size_bucket=bucket-4k`,
    `high_risk_transport_optional_send_delay=true`,
    `high_risk_transport_timestamp_precision=minute`,
    `high_risk_transport_redacted_contact_id=true`,
    `high_risk_transport_redacted_session_id=true`,
    `high_risk_transport_endpoint_state_separated=true`,
    `high_risk_transport_stream_retry_cancel_state_separated=true`,
    `high_risk_transport_explicit_start_action_required=true`,
    `high_risk_transport_explicit_stop_action_supported=true`,
    `high_risk_transport_room_open_network=false`,
    `high_risk_transport_endpoint_rotation_state_separated=true`,
    `high_risk_transport_encrypted_endpoint_update_ready=true`,
    `high_risk_transport_stale_endpoint_refresh_action=refresh-private-route`,
    `high_risk_transport_receive_loop_owner_scoped=true`,
    `high_risk_transport_failure_classes=bridge_config_missing#bootstrap_timeout#peer_unreachable#stale_endpoint#receive_owner_mismatch`,
    `high_risk_transport_runtime_event_identifiers_redacted=true`,
    `high_risk_transport_runtime_evidence_required_for_ready=true`,
    `high_risk_transport_runtime_evidence_present=${fieldTestReportValue(parsed.high_risk_runtime_evidence_present, "false")}`,
    `readiness_condition_set=${fieldTestReportEvidenceValue(parsed.readiness_condition_set, "unknown")}`,
    `readiness_missing_conditions=${fieldTestReportEvidenceValue(parsed.readiness_missing_conditions, "unknown")}`,
    `evidence_source=${highRiskRuntimeEvidenceSource}`,
    `clipboard_expiry_ready=${fieldTestReportValue(parsed.clipboard_expiry_ready, "false")}`,
    `emergency_controls_ready=${fieldTestReportValue(parsed.emergency_controls_ready, "false")}`,
    `local_storage_evidence_ready=${fieldTestReportValue(parsed.local_storage_evidence_ready, "false")}`,
    `release_integrity_ready=${fieldTestReportValue(parsed.release_integrity_ready, "false")}`,
    `high_risk_runtime_evidence_source=${highRiskRuntimeEvidenceSource}`,
    `high_risk_runtime_evidence_accepted=${fieldTestReportValue(parsed.high_risk_runtime_evidence_accepted, "false")}`,
    `high_risk_runtime_primary_blocker=${fieldTestReportValue(parsed.high_risk_runtime_primary_blocker, "none")}`,
    `high_risk_runtime_failure_class=${highRiskRuntimeFailureClass}`,
    `engine_sidecar_status_runtime_checked=${fieldTestReportValue(parsed.engine_sidecar_status_runtime_checked, "false")}`,
    `engine_sidecar_status_failure_class=${fieldTestReportValue(parsed.engine_sidecar_status_failure_class, "not-run")}`,
    `engine_sidecar_status_contract_valid=${fieldTestReportValue(parsed.engine_sidecar_status_contract_valid, "false")}`,
    `engine_sidecar_status_redacted_diagnostics_only=${fieldTestReportValue(parsed.engine_sidecar_status_redacted_diagnostics_only, "false")}`,
    `engine_sidecar_status_runtime_mode=${fieldTestReportValue(parsed.engine_sidecar_status_runtime_mode, "unknown")}`,
    `engine_sidecar_manual_self_test_runtime_checked=${fieldTestReportValue(parsed.engine_sidecar_manual_self_test_runtime_checked, "false")}`,
    `engine_sidecar_manual_self_test_failure_class=${fieldTestReportValue(parsed.engine_sidecar_manual_self_test_failure_class, "not-run")}`,
    `engine_sidecar_manual_self_test_contract_valid=${fieldTestReportValue(parsed.engine_sidecar_manual_self_test_contract_valid, "false")}`,
    `engine_sidecar_manual_self_test_passed=${fieldTestReportValue(parsed.engine_sidecar_manual_self_test_passed, "false")}`,
    `engine_sidecar_manual_self_test_runtime_available=${fieldTestReportValue(parsed.engine_sidecar_manual_self_test_runtime_available, "false")}`,
    `engine_sidecar_raw_path_returned=${fieldTestReportValue(parsed.engine_sidecar_raw_path_returned, "false")}`,
    `engine_sidecar_stdout_returned=${fieldTestReportValue(parsed.engine_sidecar_stdout_returned, "false")}`,
    `engine_sidecar_stderr_returned=${fieldTestReportValue(parsed.engine_sidecar_stderr_returned, "false")}`,
    `engine_sidecar_app_launch_network_allowed=${fieldTestReportValue(parsed.engine_sidecar_app_launch_network_allowed, "false")}`,
    `engine_sidecar_room_open_network_allowed=${fieldTestReportValue(parsed.engine_sidecar_room_open_network_allowed, "false")}`,
    `engine_sidecar_local_runtime_promoted_to_delivery_proof=false`,
    `local_only_evidence_promoted=false`,
    `fabricated_evidence_promoted=false`,
    `high_risk_public_claim_allowed=false`,
    `high_risk_ready_claim_allowed=false`,
    `high_risk_transport_ready=false`,
    `high_risk_transport_not_ready_reason=${fieldTestReportValue(desktopCompletion.highRiskTransportNotReadyReason, "unknown")}`,
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
