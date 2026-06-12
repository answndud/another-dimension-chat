import assert from "node:assert/strict";
import test from "node:test";
import {
  desktopFirstCompletionStatus,
  fieldTestReportComposerAction,
  fieldTestReportComparisonStatus,
  fieldTestReportCopyActionLines,
  fieldTestReportNextActionValue,
  fieldTestReportPanelState,
  fieldTestReportResolvedRoomListAction,
  fieldTestReportRoomListAction,
  fieldTestReportSummary,
  fieldTestReportTriageState,
  localManualE2eeRuntimeBoundaryStatus,
  parseFieldTestReport,
  publicBetaDiagnosticsReport,
  publicDiagnosticsFailureClass,
  realOnionResultConfirmsExternalPeerDelivery,
  savedInviteRoomActionCanUseRetryableOutbound,
  savedInviteRoomReceiveOwnershipBlocksRecovery,
  savedInviteRoomRetryOnlyWithoutRetryableOrigin,
} from "./private-delivery-state.js";

test("saved room retryable actions require retryable outbound origin", () => {
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("retry", "retryable-outbound"), true);
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("start-receiving", "retryable-outbound"), true);
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("wait-receive-stop", "retryable-outbound"), true);
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("retry", "route-readiness"), false);
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("start-receiving", "receive-state"), false);
  assert.equal(savedInviteRoomActionCanUseRetryableOutbound("wait-receive-stop", "receive-state"), false);
  assert.equal(savedInviteRoomRetryOnlyWithoutRetryableOrigin("retry-network", "route-readiness"), true);
});

test("receive ownership blocks stale real onion recovery actions", () => {
  assert.equal(savedInviteRoomReceiveOwnershipBlocksRecovery({ receiveState: "stopping" }), true);
  assert.equal(savedInviteRoomReceiveOwnershipBlocksRecovery({ receiveState: "paused" }), true);
  assert.equal(savedInviteRoomReceiveOwnershipBlocksRecovery({ routeReadinessAction: "wait-receive-stop" }), true);
  assert.equal(
    savedInviteRoomReceiveOwnershipBlocksRecovery({
      routeReadinessAction: "start-receiving",
      routeReadinessFailureKind: "LocalOnionEndpointNotReady",
    }),
    true,
  );
  assert.equal(savedInviteRoomReceiveOwnershipBlocksRecovery({ routeReadinessAction: "refresh-endpoint" }), false);
});

test("field test summary reports receive recovery before stale real onion room action", () => {
  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "room_list_next_action=real-onion-retry",
    "room_list_next_origin=real-onion-recovery",
    "route_readiness_ready=false",
    "route_readiness_next_action=start-receiving",
    "route_readiness_failure_kind=LocalOnionEndpointNotReady",
    "receive_enabled=false",
    "receive_stop_requested=false",
    "real_onion_recovery_action=retry-bootstrap",
  ].join("\n");
  const parsed = parseFieldTestReport(report);

  assert.equal(fieldTestReportRoomListAction(parsed), "real-onion-retry");
  assert.equal(fieldTestReportNextActionValue(parsed), "start-receiving");
  assert.match(fieldTestReportSummary(report), /next=start-receiving/);
});

test("field test summary keeps retryable room action before route readiness", () => {
  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "room_list_next_action=retry",
    "room_list_next_origin=retryable-outbound",
    "retryable_outbound_present=true",
    "route_readiness_ready=false",
    "route_readiness_next_action=prepare-private-route",
    "route_readiness_failure_kind=PeerEndpointMissing",
  ].join("\n");
  const parsed = parseFieldTestReport(report);

  assert.equal(fieldTestReportRoomListAction(parsed), "retry");
  assert.equal(fieldTestReportNextActionValue(parsed), "retry");
  assert.match(fieldTestReportSummary(report), /next=retry/);
});

test("field test summary maps receive owner mismatch to stop receiving", () => {
  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "room_list_next_action=start-receiving",
    "room_list_next_origin=route-readiness",
    "route_readiness_ready=false",
    "route_readiness_next_action=start-receiving",
    "route_readiness_failure_kind=RuntimeOwnerProfileMismatch",
    "receive_enabled=true",
    "receive_stop_requested=false",
    "real_onion_recovery_action=retry-bootstrap",
  ].join("\n");
  const parsed = parseFieldTestReport(report);

  assert.equal(fieldTestReportNextActionValue(parsed), "stop-receiving");
  assert.match(fieldTestReportSummary(report), /next=stop-receiving/);
});

test("field test summary resolves real onion saved room action to recovery action", () => {
  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "room_list_next_action=real-onion-retry",
    "room_list_next_origin=real-onion-recovery",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "real_onion_recovery_action=retry-bootstrap",
  ].join("\n");
  const parsed = parseFieldTestReport(report);

  assert.equal(fieldTestReportRoomListAction(parsed), "real-onion-retry");
  assert.equal(fieldTestReportResolvedRoomListAction(parsed), "retry-bootstrap");
  assert.equal(fieldTestReportNextActionValue(parsed), "retry-bootstrap");
  assert.match(fieldTestReportSummary(report), /next=retry-bootstrap/);
});

test("local dev roundtrip never counts as external onion delivery", () => {
  assert.equal(
    realOnionResultConfirmsExternalPeerDelivery({
      external_peer_delivery_confirmed: true,
      local_dev_roundtrip_result: true,
    }),
    false,
  );
  assert.equal(
    realOnionResultConfirmsExternalPeerDelivery({
      external_peer_delivery_confirmed: true,
      local_dev_roundtrip_result: false,
    }),
    true,
  );

  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "real_onion_external_peer_delivery_confirmed=true",
    "real_onion_local_dev_roundtrip_result=true",
  ].join("\n");

  assert.match(fieldTestReportSummary(report), /local-dev-roundtrip/);
  assert.equal(fieldTestReportTriageState(report).delivery, "local-dev-roundtrip");
});

test("route-ready compose state stays separate from recovery next action", () => {
  const report = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "room_list_next_action=none",
    "outbound_recovery_action=none",
    "real_onion_recovery_action=none",
    "composer_next_action=send-message",
  ].join("\n");

  assert.equal(fieldTestReportNextActionValue(parseFieldTestReport(report)), "none");
  assert.equal(fieldTestReportComposerAction(report), "send-message");
  assert.match(fieldTestReportSummary(report), /next=none/);
});

test("field test comparison status separates missing peer, build mismatch, and local state diffs", () => {
  const readyReport = [
    "app_version=0.1.0",
    "build_channel=beta-onion",
    "build_commit=806ecad1",
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "receive_enabled=true",
    "receive_state=running",
    "real_onion_external_peer_delivery_confirmed=true",
    "real_onion_local_dev_roundtrip_result=false",
  ].join("\n");
  const peerNeedsReceive = [
    "app_version=0.1.0",
    "build_channel=beta-onion",
    "build_commit=806ecad1",
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "receive_enabled=false",
    "receive_state=stopped",
    "real_onion_external_peer_delivery_confirmed=true",
    "real_onion_local_dev_roundtrip_result=false",
  ].join("\n");
  const wrongBuild = readyReport.replace("build_commit=806ecad1", "build_commit=deadbeef");

  assert.equal(fieldTestReportComparisonStatus(readyReport, ""), "peer-report-missing");
  assert.equal(fieldTestReportComparisonStatus(readyReport, wrongBuild), "build-mismatch");
  assert.equal(
    fieldTestReportComparisonStatus(readyReport, peerNeedsReceive),
    "reports-aligned-local-state-diff",
  );
  assert.equal(fieldTestReportComparisonStatus(readyReport, readyReport), "reports-aligned");
});

test("field test copy action lines include peer status and local recovery hints", () => {
  const localNeedsRoute = [
    "app_version=0.1.0",
    "build_channel=beta-onion",
    "build_commit=806ecad1",
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=false",
    "route_readiness_ready=false",
    "route_readiness_next_action=prepare-private-route",
    "route_readiness_failure_kind=PeerEndpointMissing",
    "receive_enabled=true",
    "receive_state=running",
    "real_onion_external_peer_delivery_confirmed=false",
    "composer_next_action=send-message",
  ].join("\n");
  const peerNeedsReceive = [
    "app_version=0.1.0",
    "build_channel=beta-onion",
    "build_commit=806ecad1",
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "receive_enabled=false",
    "receive_state=stopped",
    "real_onion_external_peer_delivery_confirmed=true",
    "real_onion_local_dev_roundtrip_result=false",
  ].join("\n");
  const localReady = peerNeedsReceive
    .replace("receive_enabled=false", "receive_enabled=true")
    .replace("receive_state=stopped", "receive_state=running");
  const peerNeedsRoute = localReady
    .replace("route_ready=true", "route_ready=false")
    .replace("route_readiness_ready=true", "route_readiness_ready=false")
    .replace("route_readiness_next_action=none", "route_readiness_next_action=prepare-private-route")
    .concat("\nroute_readiness_failure_kind=PeerEndpointMissing");
  const nextActionKeyForReport = (report, peerReport = "") => {
    const parsed = parseFieldTestReport(report);
    if (parsed.route_readiness_next_action === "prepare-private-route") {
      return "fieldTestNextSetupRoute";
    }
    if (parsed.receive_enabled !== "true") {
      return "fieldTestNextStartReceive";
    }
    return String(peerReport ?? "").trim() ? "fieldTestNextComplete" : "fieldTestNextPastePeerReport";
  };

  assert.deepEqual(fieldTestReportCopyActionLines(localNeedsRoute, "", nextActionKeyForReport), [
    "peer_report_status=peer-report-missing",
    "next_action=fieldTestNextSetupRoute",
    "composer_action=send-message",
    "local_recovery_action=prepare-private-route",
  ]);
  assert.deepEqual(fieldTestReportCopyActionLines(localReady, peerNeedsRoute, nextActionKeyForReport), [
    "peer_report_status=reports-aligned-local-state-diff",
    "next_action=fieldTestNextComplete",
    "peer_next_action=fieldTestNextSetupRoute",
    "peer_recovery_action=prepare-private-route",
  ]);
});

test("field test panel state keeps comparison, next action, and copy lines in sync", () => {
  const localReady = [
    "app_version=0.1.0",
    "build_channel=beta-onion",
    "build_commit=806ecad1",
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "receive_enabled=true",
    "receive_state=running",
    "real_onion_external_peer_delivery_confirmed=true",
    "real_onion_local_dev_roundtrip_result=false",
  ].join("\n");
  const peerNeedsRoute = localReady
    .replace("route_ready=true", "route_ready=false")
    .replace("route_readiness_ready=true", "route_readiness_ready=false")
    .replace("route_readiness_next_action=none", "route_readiness_next_action=prepare-private-route")
    .concat("\nroute_readiness_failure_kind=PeerEndpointMissing");
  const nextActionKeyForReport = (report, peerReport = "") => {
    const parsed = parseFieldTestReport(report);
    if (parsed.route_readiness_next_action === "prepare-private-route") {
      return "fieldTestNextSetupRoute";
    }
    return String(peerReport ?? "").trim() ? "fieldTestNextComplete" : "fieldTestNextPastePeerReport";
  };

  assert.deepEqual(fieldTestReportPanelState(localReady, "", nextActionKeyForReport), {
    hasPeerReport: false,
    comparison: "",
    comparisonStatus: "peer-report-missing",
    nextActionKey: "fieldTestNextPastePeerReport",
    peerNextActionKey: "",
    copyActionLines: [
      "peer_report_status=peer-report-missing",
      "next_action=fieldTestNextPastePeerReport",
    ],
  });
  assert.deepEqual(fieldTestReportPanelState(localReady, peerNeedsRoute, nextActionKeyForReport), {
    hasPeerReport: true,
    comparison: "compare reports-aligned local_state route:route-ready!=route-missing next:none!=prepare-private-route blocker:none!=PeerEndpointMissing",
    comparisonStatus: "reports-aligned-local-state-diff",
    nextActionKey: "fieldTestNextComplete",
    peerNextActionKey: "fieldTestNextSetupRoute",
    copyActionLines: [
      "peer_report_status=reports-aligned-local-state-diff",
      "next_action=fieldTestNextComplete",
      "peer_next_action=fieldTestNextSetupRoute",
      "peer_recovery_action=prepare-private-route",
    ],
  });
});

test("public beta diagnostics keeps only support-safe status, build, failure class, and next action", () => {
  const report = [
    "app_version=0.1.0",
    "build_channel=beta-onion",
    "build_commit=806ecad1",
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=false",
    "route_ready=false",
    "route_readiness_ready=false",
    "route_readiness_next_action=prepare-private-route",
    "route_readiness_failure_kind=PeerEndpointMissing",
    "receive_enabled=false",
    "receive_state=stopped",
    "manual_network_permission=true",
    "real_onion_attempted=true",
    "real_onion_next_blocker=BootstrapTimeout",
    "bridge_line=obfs4 198.51.100.4:443 SECRET",
    "onion_endpoint=examplehiddenservice.onion:443",
    "invite_code=ADINVITE-secret",
    "safety_phrase=alpha bravo",
    "message_text=hello secret",
    "sender_profile=alice-private",
    "envelope_payload=payload-secret",
    "local_path=/Users/alex/private",
    "passphrase=correct horse battery staple",
    "key_material=deadbeef",
  ].join("\n");
  const diagnostics = publicBetaDiagnosticsReport(report, { includeCopyBoundary: true });

  assert.match(diagnostics, /Another Dimension Chat public support diagnostics/);
  assert.match(diagnostics, /diagnostic_version=2/);
  assert.match(diagnostics, /diagnostic_scope=public-support/);
  assert.match(diagnostics, /payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only/);
  assert.match(diagnostics, /diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only/);
  assert.match(
    diagnostics,
    /allowed_public_intake_fields=app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network/,
  );
  assert.match(
    diagnostics,
    /forbidden_public_intake_fields=raw-logs#endpoints#invite-codes#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#key-material#private-planning-notes/,
  );
  assert.match(diagnostics, /app_version=0.1.0/);
  assert.match(diagnostics, /build_channel=beta-onion/);
  assert.match(diagnostics, /build_commit=806ecad1/);
  assert.match(diagnostics, /failure_class=safety-unverified/);
  assert.match(diagnostics, /recovery_next_action=verify/);
  assert.match(diagnostics, /diagnostics_copy_next_action=verify/);
  assert.match(diagnostics, /desktop_completion_scope=desktop-local-private-flow/);
  assert.match(diagnostics, /desktop_completion_status=incomplete/);
  assert.match(diagnostics, /desktop_completion_blockers=safety#private-route#receive/);
  assert.match(diagnostics, /desktop_acceptance_surface=desktop-local-private-flow/);
  assert.match(diagnostics, /desktop_acceptance_status=incomplete/);
  assert.match(diagnostics, /desktop_acceptance_blockers=safety#private-route#receive/);
  assert.match(diagnostics, /desktop_acceptance_next_action=verify/);
  assert.match(
    diagnostics,
    /desktop_acceptance_non_claims=external-onion-delivery#production-messaging#security-ready#sensitive-communication#windows-public-artifact/,
  );
  assert.match(diagnostics, /local_manual_e2ee_runtime_boundary=noise-xx-session-key-replay-reviewed/);
  assert.match(diagnostics, /local_manual_e2ee_runtime_ready=true/);
  assert.match(diagnostics, /noise_xx_transport_state_required=true/);
  assert.match(diagnostics, /remote_static_verification_required=true/);
  assert.match(diagnostics, /safety_transcript_bound=true/);
  assert.match(diagnostics, /channel_binding_required=true/);
  assert.match(diagnostics, /message_number_nonce_binding_required=true/);
  assert.match(diagnostics, /replay_commit_after_decrypt=true/);
  assert.match(diagnostics, /tamper_failure_non_advance=true/);
  assert.match(diagnostics, /passphrase_first_storage_required=true/);
  assert.match(diagnostics, /explicit_envelope_export_import_ready=true/);
  assert.match(diagnostics, /production_e2ee_ready=false/);
  assert.match(diagnostics, /production_key_management_ready=false/);
  assert.match(diagnostics, /app_key_wrapping_ready=false/);
  assert.match(diagnostics, /desktop_acceptance_external_delivery_claim=false/);
  assert.match(diagnostics, /desktop_acceptance_production_claim=false/);
  assert.match(diagnostics, /desktop_acceptance_sensitive_use_claim=false/);
  assert.match(diagnostics, /default_transport_path=local-manual-encrypted-envelope-exchange/);
  assert.match(diagnostics, /default_transport_network_io=false/);
  assert.match(diagnostics, /default_transport_automatic_delivery=false/);
  assert.match(diagnostics, /default_transport_central_message_server=false/);
  assert.match(diagnostics, /default_transport_push_dependency=false/);
  assert.match(diagnostics, /default_transport_central_contact_discovery=false/);
  assert.match(diagnostics, /high_risk_onion_path=explicit-user-triggered-fail-closed/);
  assert.match(diagnostics, /high_risk_onion_direct_fallback=false/);
  assert.match(diagnostics, /automatic_network_on_launch=false/);
  assert.match(diagnostics, /windows_public_artifact_ready=false/);
  assert.match(diagnostics, /windows_installer_ready=false/);
  assert.match(diagnostics, /windows_signing_ready=false/);
  assert.match(diagnostics, /windows_store_ready=false/);
  assert.match(diagnostics, /windows_local_runtime_smoke_status=source-boundary-only/);
  assert.match(diagnostics, /windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows/);
  assert.match(diagnostics, /windows_app_data_path_review_required=true/);
  assert.match(diagnostics, /windows_path_separator_review_required=true/);
  assert.match(diagnostics, /windows_local_deletion_behavior_review_required=true/);
  assert.match(diagnostics, /windows_redacted_diagnostics_behavior_review_required=true/);
  assert.match(diagnostics, /windows_explicit_user_action_review_required=true/);
  assert.match(diagnostics, /windows_release_blocker=local-build-smoke-and-release-boundary-review/);
  assert.match(diagnostics, /external_onion_delivery_verified=false/);
  assert.match(diagnostics, /production_messaging_ready=false/);
  assert.match(diagnostics, /security_ready_claimed=false/);
  assert.match(diagnostics, /sensitive_communication_allowed=false/);
  assert.match(diagnostics, /app_launch_network=false/);
  assert.match(diagnostics, /diagnostics_support_bundle_export=false/);
  assert.match(diagnostics, /diagnostics_audit_evidence_claim=false/);
  assert.match(diagnostics, /diagnostics_external_delivery_evidence_claim=false/);
  assert.match(diagnostics, /diagnostics_security_ready_proof_claim=false/);
  assert.match(diagnostics, /crash_upload=false/);
  assert.match(diagnostics, /telemetry=false/);
  assert.match(diagnostics, /raw_log_export=false/);
  assert.match(diagnostics, /crash_dump_export=false/);
  assert.match(diagnostics, /automated_log_collection=false/);
  assert.match(diagnostics, /support_bundle_export=false/);
  assert.match(diagnostics, /raw_diagnostic_file_export=false/);
  assert.match(diagnostics, /excluded_fields=codes,endpoints,messages,profiles,paths,logs,crash_dumps,screenshots,passphrases,key_material,private_planning_notes/);
  assert.doesNotMatch(diagnostics, /^bridge_line=/m);
  assert.doesNotMatch(diagnostics, /^onion_endpoint=/m);
  assert.doesNotMatch(diagnostics, /^invite_code=/m);
  assert.doesNotMatch(diagnostics, /^safety_phrase=/m);
  assert.doesNotMatch(diagnostics, /^message_text=/m);
  assert.doesNotMatch(diagnostics, /^sender_profile=/m);
  assert.doesNotMatch(diagnostics, /^envelope_payload=/m);
  assert.doesNotMatch(diagnostics, /^local_path=/m);
  assert.doesNotMatch(diagnostics, /^passphrase=/m);
  assert.doesNotMatch(diagnostics, /^key_material=/m);
  assert.doesNotMatch(diagnostics, /^room_status=/m);
  assert.doesNotMatch(diagnostics, /^safety_status=/m);
  assert.doesNotMatch(diagnostics, /^delivery_status=/m);
  assert.doesNotMatch(diagnostics, /^route_status=/m);
  assert.doesNotMatch(diagnostics, /^receive_status=/m);
  assert.doesNotMatch(diagnostics, /^manual_network_permission=/m);
  assert.doesNotMatch(diagnostics, /^real_onion_attempted=/m);
  assert.doesNotMatch(diagnostics, /^manual_rebuild_flow=/m);
  assert.doesNotMatch(diagnostics, /^rebuild_/m);
  assert.doesNotMatch(diagnostics, /^next_action=/m);
  assert.doesNotMatch(diagnostics, /obfs4|198\.51\.100\.4|examplehiddenservice|ADINVITE|alpha bravo|hello secret|alice-private|payload-secret/);
  assert.doesNotMatch(diagnostics, /\/Users\/alex|correct horse|deadbeef/);
});

test("default transport boundary keeps the public diagnostic path manual and non-centralized", () => {
  const diagnostics = publicBetaDiagnosticsReport(
    [
      "room_present=true",
      "session_ready=true",
      "safety_confirmed=true",
      "route_readiness_ready=true",
      "receive_enabled=false",
      "composer_next_action=send-message",
    ].join("\n"),
  );

  assert.match(diagnostics, /default_transport_path=local-manual-encrypted-envelope-exchange/);
  assert.match(diagnostics, /default_transport_network_io=false/);
  assert.match(diagnostics, /default_transport_automatic_delivery=false/);
  assert.match(diagnostics, /default_transport_central_message_server=false/);
  assert.match(diagnostics, /default_transport_push_dependency=false/);
  assert.match(diagnostics, /default_transport_central_contact_discovery=false/);
  assert.match(diagnostics, /automatic_network_on_launch=false/);
  assert.match(diagnostics, /high_risk_onion_path=explicit-user-triggered-fail-closed/);
  assert.match(diagnostics, /high_risk_onion_direct_fallback=false/);
});

test("local manual E2EE runtime boundary exposes key lifecycle guardrails without production claims", () => {
  const boundary = localManualE2eeRuntimeBoundaryStatus();

  assert.deepEqual(boundary, {
    boundary: "noise-xx-session-key-replay-reviewed",
    localManualE2eeRuntimeReady: true,
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
    appKeyWrappingReady: false,
    securityReadyClaimed: false,
  });
});

test("desktop-first completion reports local private flow readiness without security claims", () => {
  const readyReport = [
    "room_present=true",
    "session_ready=true",
    "safety_confirmed=true",
    "route_ready=true",
    "route_readiness_ready=true",
    "route_readiness_next_action=none",
    "receive_enabled=true",
    "receive_state=running",
    "composer_next_action=send-message",
    "real_onion_external_peer_delivery_confirmed=true",
    "real_onion_local_dev_roundtrip_result=true",
  ].join("\n");
  const blockedReport = readyReport
    .replace("receive_enabled=true", "receive_enabled=false")
    .replace("receive_state=running", "receive_state=stopped")
    .replace("composer_next_action=send-message", "composer_next_action=none");
  const composeBlockedReport = readyReport.replace("composer_next_action=send-message", "composer_next_action=none");
  const receiveStoppingReport = readyReport
    .replace("receive_state=running", "receive_state=stopping")
    .concat("\nreceive_stop_requested=true");

  assert.deepEqual(desktopFirstCompletionStatus(readyReport), {
    scope: "desktop-local-private-flow",
    status: "local-private-flow-no-current-blockers",
    blockers: [],
    blockerSummary: "none",
    localManualE2eeRuntimeBoundary: "noise-xx-session-key-replay-reviewed",
    localManualE2eeRuntimeReady: true,
    replayCommitAfterDecrypt: true,
    tamperFailureNonAdvance: true,
    passphraseFirstStorageRequired: true,
    externalOnionDeliveryVerified: false,
    productionMessagingReady: false,
    productionE2eeReady: false,
    productionKeyManagementReady: false,
    appKeyWrappingReady: false,
    securityReadyClaimed: false,
    sensitiveCommunicationAllowed: false,
  });
  assert.deepEqual(desktopFirstCompletionStatus(blockedReport), {
    scope: "desktop-local-private-flow",
    status: "incomplete",
    blockers: ["receive", "send-or-recover"],
    blockerSummary: "receive#send-or-recover",
    localManualE2eeRuntimeBoundary: "noise-xx-session-key-replay-reviewed",
    localManualE2eeRuntimeReady: true,
    replayCommitAfterDecrypt: true,
    tamperFailureNonAdvance: true,
    passphraseFirstStorageRequired: true,
    externalOnionDeliveryVerified: false,
    productionMessagingReady: false,
    productionE2eeReady: false,
    productionKeyManagementReady: false,
    appKeyWrappingReady: false,
    securityReadyClaimed: false,
    sensitiveCommunicationAllowed: false,
  });

  const diagnostics = publicBetaDiagnosticsReport(readyReport);
  assert.match(diagnostics, /desktop_completion_status=local-private-flow-no-current-blockers/);
  assert.match(diagnostics, /desktop_completion_blockers=none/);
  assert.match(diagnostics, /desktop_acceptance_status=local-private-flow-no-current-blockers/);
  assert.match(diagnostics, /desktop_acceptance_blockers=none/);
  assert.match(diagnostics, /desktop_acceptance_next_action=none/);
  assert.match(diagnostics, /local_manual_e2ee_runtime_boundary=noise-xx-session-key-replay-reviewed/);
  assert.match(diagnostics, /local_manual_e2ee_runtime_ready=true/);
  assert.match(diagnostics, /replay_commit_after_decrypt=true/);
  assert.match(diagnostics, /tamper_failure_non_advance=true/);
  assert.match(diagnostics, /passphrase_first_storage_required=true/);
  assert.match(diagnostics, /production_e2ee_ready=false/);
  assert.match(diagnostics, /production_key_management_ready=false/);
  assert.match(diagnostics, /app_key_wrapping_ready=false/);
  assert.match(diagnostics, /desktop_acceptance_external_delivery_claim=false/);
  assert.match(diagnostics, /desktop_acceptance_production_claim=false/);
  assert.match(diagnostics, /desktop_acceptance_sensitive_use_claim=false/);
  assert.match(diagnostics, /external_onion_delivery_verified=false/);
  assert.match(diagnostics, /production_messaging_ready=false/);
  assert.match(diagnostics, /security_ready_claimed=false/);
  assert.match(diagnostics, /sensitive_communication_allowed=false/);
  assert.doesNotMatch(diagnostics, /external_onion_delivery_verified=true/);
  assert.doesNotMatch(diagnostics, /production_messaging_ready=true/);

  const receiveBlockedDiagnostics = publicBetaDiagnosticsReport(blockedReport);
  assert.match(receiveBlockedDiagnostics, /failure_class=receive-blocked/);
  assert.match(receiveBlockedDiagnostics, /desktop_completion_blockers=receive#send-or-recover/);
  assert.match(receiveBlockedDiagnostics, /recovery_next_action=start-receiving/);
  assert.match(receiveBlockedDiagnostics, /desktop_acceptance_next_action=start-receiving/);
  assert.doesNotMatch(receiveBlockedDiagnostics, /failure_class=none/);
  assert.doesNotMatch(receiveBlockedDiagnostics, /desktop_acceptance_next_action=none/);

  const receiveStoppingDiagnostics = publicBetaDiagnosticsReport(receiveStoppingReport);
  assert.match(receiveStoppingDiagnostics, /desktop_completion_blockers=receive/);
  assert.match(receiveStoppingDiagnostics, /recovery_next_action=wait-receive-stop/);
  assert.match(receiveStoppingDiagnostics, /desktop_acceptance_next_action=wait-receive-stop/);
  assert.doesNotMatch(receiveStoppingDiagnostics, /desktop_acceptance_next_action=start-receiving/);

  const composeBlockedDiagnostics = publicBetaDiagnosticsReport(composeBlockedReport);
  assert.match(composeBlockedDiagnostics, /failure_class=desktop-action-needed/);
  assert.match(composeBlockedDiagnostics, /desktop_completion_blockers=send-or-recover/);
  assert.match(composeBlockedDiagnostics, /recovery_next_action=write-message/);
  assert.match(composeBlockedDiagnostics, /desktop_acceptance_next_action=write-message/);
  assert.doesNotMatch(composeBlockedDiagnostics, /failure_class=none/);
  assert.doesNotMatch(composeBlockedDiagnostics, /desktop_acceptance_next_action=none/);

  const rollbackRecoveryDiagnostics = publicBetaDiagnosticsReport(
    [
      "room_present=false",
      "session_ready=false",
      "safety_confirmed=false",
      "local_recovery_action=check-data-lifecycle",
      "rollback_suspicion=true",
      "resume_blocked=true",
    ].join("\n"),
  );
  assert.match(rollbackRecoveryDiagnostics, /failure_class=local-recovery-needed/);
  assert.match(rollbackRecoveryDiagnostics, /recovery_next_action=check-data-lifecycle/);
  assert.match(rollbackRecoveryDiagnostics, /desktop_acceptance_next_action=check-data-lifecycle/);
  assert.doesNotMatch(rollbackRecoveryDiagnostics, /failure_class=room-not-open/);
});

test("public diagnostics failure class maps detailed blockers to broad support classes", () => {
  assert.equal(
    publicDiagnosticsFailureClass(
      parseFieldTestReport("room_present=false\nlocal_recovery_action=check-data-lifecycle"),
    ),
    "local-recovery-needed",
  );
  assert.equal(
    publicDiagnosticsFailureClass(
      parseFieldTestReport("room_present=false\nrollback_suspicion=true\nresume_blocked=true"),
    ),
    "local-recovery-needed",
  );
  assert.equal(publicDiagnosticsFailureClass(parseFieldTestReport("room_present=false")), "room-not-open");
  assert.equal(
    publicDiagnosticsFailureClass(parseFieldTestReport("room_present=true\nsession_ready=false")),
    "session-not-ready",
  );
  assert.equal(
    publicDiagnosticsFailureClass(
      parseFieldTestReport("room_present=true\nsession_ready=true\nsafety_confirmed=false"),
    ),
    "safety-unverified",
  );
  assert.equal(
    publicDiagnosticsFailureClass(
      parseFieldTestReport(
        "room_present=true\nsession_ready=true\nsafety_confirmed=true\nroute_readiness_ready=false\nroute_readiness_failure_kind=PeerEndpointMissing",
      ),
    ),
    "route-readiness-blocked",
  );
  assert.equal(
    publicDiagnosticsFailureClass(
      parseFieldTestReport(
        "room_present=true\nsession_ready=true\nsafety_confirmed=true\nroute_readiness_ready=true\nreal_onion_next_blocker=BootstrapTimeout",
      ),
    ),
    "advanced-transport-blocked",
  );
});
