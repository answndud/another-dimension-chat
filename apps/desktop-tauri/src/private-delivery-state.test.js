import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
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
  highRiskTransportMetadataBoundaryStatus,
  localManualE2eeRuntimeBoundaryStatus,
  localStorageRuntimeEvidenceView,
  manualEnvelopeExchangePanelView,
  noSilentNetworkBoundaryStatus,
  parseFieldTestReport,
  publicBetaDiagnosticsReport,
  publicDiagnosticsFailureClass,
  publicSupportDiagnosticsAllowedFieldsValue,
  publicSupportDiagnosticsForbiddenFieldsValue,
  realOnionResultConfirmsExternalPeerDelivery,
  savedInviteRoomActionCanUseRetryableOutbound,
  savedInviteRoomReceiveOwnershipBlocksRecovery,
  savedInviteRoomRetryOnlyWithoutRetryableOrigin,
} from "./private-delivery-state.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");

test("manual envelope panel exposes only guided status for malformed replay and missing peer", () => {
  const malformed = manualEnvelopeExchangePanelView({
    sessionReady: true,
    safetyVerified: true,
    latestFailureClass: "malformed-envelope",
    latestRecoveryNextAction: "ask-for-fresh-envelope",
    envelopePayload: "ADENV1SECRET",
    messageText: "secret message",
    localPath: "/Users/alex/private",
    passphrase: "correct horse battery staple",
  });
  const replay = manualEnvelopeExchangePanelView({
    sessionReady: true,
    safetyVerified: true,
    slotMismatchReason: "payload-replay_rejected",
  });
  const missingPeer = manualEnvelopeExchangePanelView({
    sessionReady: true,
    safetyVerified: true,
    selectedNeedsPeerImport: true,
    hasRemoteMessageEnvelopeSlot: false,
    slotMismatchReason: "empty-slot",
  });

  assert.equal(malformed.failureClass, "malformed-envelope");
  assert.equal(malformed.recoveryNextAction, "ask-for-fresh-envelope");
  assert.equal(replay.failureClass, "replay-rejected");
  assert.equal(replay.recoveryNextAction, "ask-for-fresh-envelope");
  assert.equal(missingPeer.failureClass, "missing-peer-envelope");
  assert.equal(missingPeer.recoveryNextAction, "load-or-ask-for-peer-envelope");
  for (const view of [malformed, replay, missingPeer]) {
    const serialized = JSON.stringify(view);
    assert.equal(view.rawEnvelopePayloadReturned, false);
    assert.equal(view.pairingPayloadReturned, false);
    assert.equal(view.supportPayloadAllowed, false);
    assert.match(view.boundary, /raw_envelope_payload_returned=false/);
    assert.match(view.boundary, /diagnostics_payload_allowed=false/);
    assert.doesNotMatch(serialized, /ADENV1SECRET|secret message|correct horse|\/Users\/alex\/private/);
  }
});

test("manual envelope panel keeps export import reply retry states in one view", () => {
  const view = manualEnvelopeExchangePanelView({
    currentStep: "Reply | Next: send stored-session reply.",
    sessionReady: true,
    safetyVerified: true,
    hasLocalMessageEnvelope: true,
    hasRemoteMessageEnvelopeSlot: true,
    hasInboundEnvelopeInput: true,
    hasImportedMessage: true,
    hasReceivedMessage: true,
    hasTwoProfileReplySelected: true,
    hasTwoProfileReplyDraftInput: true,
    retryAvailable: true,
    cancelAvailable: true,
  });

  assert.equal(view.current.state, "ready");
  assert.equal(view.export.state, "complete");
  assert.equal(view.import.state, "complete");
  assert.equal(view.reply.state, "ready");
  assert.equal(view.recovery.state, "ready");
  assert.match(view.recovery.text, /retry=true cancel=true/);
  assert.equal(view.failure.text, "failure_class=none recovery_next_action=continue-manual-envelope-flow");
});

test("public intake field set is shared by app diagnostics issue template and reference policy", () => {
  const allowed = publicSupportDiagnosticsAllowedFieldsValue();
  const forbidden = publicSupportDiagnosticsForbiddenFieldsValue();
  const issueTemplate = readFileSync(
    join(repoRoot, ".github/ISSUE_TEMPLATE/public_beta_support.yml"),
    "utf8",
  );
  const policy = readFileSync(join(repoRoot, "SECURITY.md"), "utf8");
  const diagnostics = publicBetaDiagnosticsReport("app_version=0.1.0\nbuild_channel=beta-onion", {
    includeCopyBoundary: true,
  });

  assert.ok(policy.includes("Public support requests should stay redacted"));
  for (const text of [issueTemplate, diagnostics]) {
    assert.ok(text.includes(`allowed_public_intake_fields=${allowed}`));
    assert.ok(text.includes(`forbidden_public_intake_fields=${forbidden}`));
    assert.ok(text.includes("public_intake_policy_alignment=app-diagnostics#github-issue-template#security-policy"));
  }
  assert.match(diagnostics, /public_intake_policy_version=public-intake-v1/);
  assert.match(diagnostics, /public_intake_policy_fields_aligned=true/);
});

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
    "engine_sidecar_status_runtime_checked=true",
    "engine_sidecar_status_failure_class=none",
    "engine_sidecar_status_contract_valid=true",
    "engine_sidecar_status_redacted_diagnostics_only=true",
    "engine_sidecar_status_runtime_mode=manual-e2ee-engine-sidecar",
    "engine_sidecar_manual_self_test_runtime_checked=true",
    "engine_sidecar_manual_self_test_failure_class=none",
    "engine_sidecar_manual_self_test_contract_valid=true",
    "engine_sidecar_manual_self_test_passed=true",
    "engine_sidecar_manual_self_test_runtime_available=true",
    "engine_sidecar_raw_path_returned=false",
    "engine_sidecar_stdout_returned=false",
    "engine_sidecar_stderr_returned=false",
    "engine_sidecar_app_launch_network_allowed=false",
    "engine_sidecar_room_open_network_allowed=false",
    "engine_sidecar_local_runtime_promoted_to_delivery_proof=false",
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
  assert.match(diagnostics, /public_intake_policy_version=public-intake-v1/);
  assert.match(diagnostics, /public_intake_policy_alignment=app-diagnostics#github-issue-template#security-policy/);
  assert.match(diagnostics, /public_intake_policy_fields_aligned=true/);
  assert.match(diagnostics, /payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only/);
  assert.match(diagnostics, /diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only/);
  assert.match(
    diagnostics,
    /allowed_public_intake_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness/,
  );
  assert.match(diagnostics, /engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class/);
  assert.match(
    diagnostics,
    /forbidden_public_intake_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles/,
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
  assert.match(diagnostics, /production_key_management_ready=true/);
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
  assert.match(diagnostics, /engine_sidecar_status_runtime_checked=true/);
  assert.match(diagnostics, /engine_sidecar_status_failure_class=none/);
  assert.match(diagnostics, /engine_sidecar_status_contract_valid=true/);
  assert.match(diagnostics, /engine_sidecar_status_redacted_diagnostics_only=true/);
  assert.match(diagnostics, /engine_sidecar_manual_self_test_runtime_checked=true/);
  assert.match(diagnostics, /engine_sidecar_manual_self_test_failure_class=none/);
  assert.match(diagnostics, /engine_sidecar_manual_self_test_contract_valid=true/);
  assert.match(diagnostics, /engine_sidecar_manual_self_test_passed=true/);
  assert.match(diagnostics, /engine_sidecar_manual_self_test_runtime_available=true/);
  assert.match(diagnostics, /engine_sidecar_raw_path_returned=false/);
  assert.match(diagnostics, /engine_sidecar_stdout_returned=false/);
  assert.match(diagnostics, /engine_sidecar_stderr_returned=false/);
  assert.match(diagnostics, /engine_sidecar_app_launch_network_allowed=false/);
  assert.match(diagnostics, /engine_sidecar_room_open_network_allowed=false/);
  assert.match(diagnostics, /engine_sidecar_local_runtime_promoted_to_delivery_proof=false/);
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
  assert.match(diagnostics, /excluded_fields=codes,endpoints,messages,profiles,paths,logs,crash_dumps,screenshots,passphrases,private_keys,key_material,private_planning_notes,support_bundles/);
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
  assert.doesNotMatch(diagnostics, /engine_sidecar_raw_path_returned=true/);
  assert.doesNotMatch(diagnostics, /engine_sidecar_stdout_returned=true/);
  assert.doesNotMatch(diagnostics, /engine_sidecar_stderr_returned=true/);
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
  assert.match(diagnostics, /high_risk_transport_onion_only=true/);
  assert.match(diagnostics, /high_risk_transport_direct_fallback=false/);
  assert.match(diagnostics, /high_risk_transport_dns_endpoint=false/);
  assert.match(diagnostics, /high_risk_transport_ip_endpoint=false/);
  assert.match(diagnostics, /high_risk_transport_app_launch_bootstrap=false/);
  assert.match(diagnostics, /high_risk_transport_runtime_evidence_required_for_ready=true/);
  assert.match(diagnostics, /high_risk_transport_runtime_evidence_present=false/);
  assert.match(diagnostics, /high_risk_runtime_evidence_source=absent/);
  assert.match(diagnostics, /high_risk_runtime_evidence_accepted=false/);
  assert.match(diagnostics, /high_risk_runtime_primary_blocker=none/);
  assert.match(diagnostics, /high_risk_runtime_failure_class=none/);
  assert.match(diagnostics, /local_only_evidence_promoted=false/);
  assert.match(diagnostics, /fabricated_evidence_promoted=false/);
  assert.match(diagnostics, /high_risk_public_claim_allowed=false/);
  assert.match(
    diagnostics,
    /high_risk_transport_failure_classes=bridge_config_missing#bootstrap_timeout#peer_unreachable#stale_endpoint#receive_owner_mismatch/,
  );
  assert.match(diagnostics, /high_risk_transport_not_ready_reason=runtime-network-disabled-until-explicit-user-action/);
});

test("public diagnostics carries redacted high-risk runtime evidence status without claims", () => {
  const diagnostics = publicBetaDiagnosticsReport(
    [
      "room_present=true",
      "session_ready=true",
      "safety_confirmed=true",
      "route_readiness_ready=true",
      "receive_enabled=true",
      "receive_state=running",
      "composer_next_action=send-message",
      "readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity",
      "readiness_missing_conditions=release-integrity",
      "evidence_source=runtime-report",
      "failure_class=stale_endpoint",
      "clipboard_expiry_ready=true",
      "emergency_controls_ready=true",
      "local_storage_evidence_ready=true",
      "release_integrity_ready=false",
      "high_risk_runtime_evidence_source=runtime-report",
      "high_risk_runtime_evidence_accepted=true",
      "high_risk_runtime_evidence_present=true",
      "high_risk_runtime_primary_blocker=none",
      "high_risk_runtime_failure_class=stale_endpoint",
      "high_risk_public_claim_allowed=false",
      "high_risk_ready_claim_allowed=false",
    ].join("\n"),
  );

  assert.match(diagnostics, /high_risk_transport_runtime_evidence_present=true/);
  assert.match(
    diagnostics,
    /readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity/,
  );
  assert.match(diagnostics, /readiness_missing_conditions=release-integrity/);
  assert.match(diagnostics, /evidence_source=runtime-report/);
  assert.match(diagnostics, /failure_class=stale_endpoint/);
  assert.match(diagnostics, /clipboard_expiry_ready=true/);
  assert.match(diagnostics, /emergency_controls_ready=true/);
  assert.match(diagnostics, /local_storage_evidence_ready=true/);
  assert.match(diagnostics, /release_integrity_ready=false/);
  assert.match(diagnostics, /high_risk_runtime_evidence_source=runtime-report/);
  assert.match(diagnostics, /high_risk_runtime_evidence_accepted=true/);
  assert.match(diagnostics, /high_risk_runtime_primary_blocker=none/);
  assert.match(diagnostics, /high_risk_runtime_failure_class=stale_endpoint/);
  assert.match(diagnostics, /high_risk_public_claim_allowed=false/);
  assert.match(diagnostics, /high_risk_ready_claim_allowed=false/);
  assert.doesNotMatch(diagnostics, /^onion_endpoint=|^envelope_payload=|^local_path=|^key_material=/m);
});

test("high-risk transport metadata boundary exposes only redacted status", () => {
  const boundary = highRiskTransportMetadataBoundaryStatus();

  assert.equal(boundary.mode, "onion-only");
  assert.equal(boundary.onionOnly, true);
  assert.equal(boundary.directFallbackAllowed, false);
  assert.equal(boundary.dnsEndpointAllowed, false);
  assert.equal(boundary.ipEndpointAllowed, false);
  assert.equal(boundary.appLaunchBootstrapAllowed, false);
  assert.equal(boundary.bridgeFailureClassRedacted, true);
  assert.equal(boundary.bridgeLineExposed, false);
  assert.equal(boundary.onionEndpointExposed, false);
  assert.equal(boundary.descriptorExposed, false);
  assert.equal(boundary.localPathExposed, false);
  assert.equal(boundary.envelopeSizeBucket, "bucket-4k");
  assert.equal(boundary.timestampPrecision, "minute");
  assert.equal(boundary.explicitStartActionRequired, true);
  assert.equal(boundary.explicitStopActionSupported, true);
  assert.equal(boundary.roomOpenNetworkAttempted, false);
  assert.equal(boundary.endpointRotationStateSeparated, true);
  assert.equal(boundary.encryptedEndpointUpdateReady, true);
  assert.equal(boundary.staleEndpointRefreshAction, "refresh-private-route");
  assert.equal(boundary.receiveLoopOwnerScoped, true);
  assert.deepEqual(boundary.failureClasses, [
    "bridge_config_missing",
    "bootstrap_timeout",
    "peer_unreachable",
    "stale_endpoint",
    "receive_owner_mismatch",
  ]);
  assert.equal(boundary.runtimeEventIdentifiersRedacted, true);
  assert.equal(boundary.runtimeEvidenceRequiredForReady, true);
  assert.equal(boundary.runtimeEvidencePresent, false);
  assert.equal(boundary.runtimeEvidenceSource, "absent");
  assert.equal(boundary.localOnlyEvidencePromoted, false);
  assert.equal(boundary.fabricatedEvidencePromoted, false);
  assert.equal(boundary.highRiskPublicClaimAllowed, false);
  assert.equal(boundary.highRiskTransportReady, false);
  assert.equal(boundary.notReadyReason, "runtime-network-disabled-until-explicit-user-action");
  assert.match(boundary.boundary, /high_risk_transport_bridge_failure_class=redacted/);
  assert.match(boundary.boundary, /high_risk_transport_room_open_network=false/);
  assert.match(boundary.boundary, /high_risk_transport_runtime_evidence_present=false/);
  assert.match(boundary.boundary, /high_risk_runtime_evidence_contract=runtime-report#explicit-user-action#onion-only#no-direct-fallback/);
  assert.doesNotMatch(boundary.boundary, /bridge_line=|onion_endpoint=|descriptor=|local_path=/);
});

test("local manual E2EE runtime boundary exposes key lifecycle guardrails without production claims", () => {
  const boundary = localManualE2eeRuntimeBoundaryStatus();

  assert.deepEqual({
    boundary: boundary.boundary,
    localManualE2eeRuntimeReady: boundary.localManualE2eeRuntimeReady,
    noiseXxTransportStateRequired: boundary.noiseXxTransportStateRequired,
    remoteStaticVerificationRequired: boundary.remoteStaticVerificationRequired,
    safetyTranscriptBound: boundary.safetyTranscriptBound,
    channelBindingRequired: boundary.channelBindingRequired,
    messageNumberNonceBindingRequired: boundary.messageNumberNonceBindingRequired,
    replayCommitAfterDecrypt: boundary.replayCommitAfterDecrypt,
    tamperFailureNonAdvance: boundary.tamperFailureNonAdvance,
    passphraseFirstStorageRequired: boundary.passphraseFirstStorageRequired,
    explicitEnvelopeExportImportReady: boundary.explicitEnvelopeExportImportReady,
    automaticNetworkOnLaunchAllowed: boundary.automaticNetworkOnLaunchAllowed,
    networkIoAttempted: boundary.networkIoAttempted,
    productionE2eeReady: boundary.productionE2eeReady,
    productionKeyManagementReady: boundary.productionKeyManagementReady,
    localStorageRuntimeEvidenceReady: boundary.localStorageRuntimeEvidenceReady,
    localStorageRuntimeEvidenceBoundary: boundary.localStorageRuntimeEvidenceBoundary,
    localAtRestMitigationReady: boundary.localAtRestMitigationReady,
    lockedStateNoPlaintextAccess: boundary.lockedStateNoPlaintextAccess,
    lockedStateNoKeyMaterialAccess: boundary.lockedStateNoKeyMaterialAccess,
    lockedStateNoRuntimeMessaging: boundary.lockedStateNoRuntimeMessaging,
    rollbackMarkerStatus: boundary.rollbackMarkerStatus,
    rollbackMarkerPresent: boundary.rollbackMarkerPresent,
    rollbackSuspicionDetected: boundary.rollbackSuspicionDetected,
    rollbackResumeBlocked: boundary.rollbackResumeBlocked,
    localDeleteConfirmationRequired: boundary.localDeleteConfirmationRequired,
    localDeleteConfirmation: boundary.localDeleteConfirmation,
    backupExclusionPolicyDecided: boundary.backupExclusionPolicyDecided,
    backupExclusionVerified: boundary.backupExclusionVerified,
    backupExclusionStatus: boundary.backupExclusionStatus,
    appKeyWrappingReady: boundary.appKeyWrappingReady,
    secureDeletionClaimAllowed: boundary.secureDeletionClaimAllowed,
    securityReadyClaimed: boundary.securityReadyClaimed,
  }, {
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
    productionKeyManagementReady: true,
    localStorageRuntimeEvidenceReady: true,
    localStorageRuntimeEvidenceBoundary: "passphrase-first-locked-state-rollback-marker-local-delete-backup-exclusion-v1",
    localAtRestMitigationReady: true,
    lockedStateNoPlaintextAccess: true,
    lockedStateNoKeyMaterialAccess: true,
    lockedStateNoRuntimeMessaging: true,
    rollbackMarkerStatus: "passphrase-first-runtime-unlock-with-marker-based-rollback-detection",
    rollbackMarkerPresent: true,
    rollbackSuspicionDetected: false,
    rollbackResumeBlocked: false,
    localDeleteConfirmationRequired: true,
    localDeleteConfirmation: "WIPE_LOCAL_DATA",
    backupExclusionPolicyDecided: true,
    backupExclusionVerified: false,
    backupExclusionStatus: "policy-decided-verification-required",
    appKeyWrappingReady: false,
    secureDeletionClaimAllowed: false,
    securityReadyClaimed: false,
  });
});

test("local storage runtime evidence links unlock delete rollback and backup without unsafe claims", () => {
  const evidence = localStorageRuntimeEvidenceView();

  assert.equal(evidence.localAtRestMitigationReady, true);
  assert.equal(evidence.passphraseFirstUnlockRequired, true);
  assert.equal(evidence.osKeystoreOnlyUnlockRejected, true);
  assert.equal(evidence.lockedStateNoPlaintextAccess, true);
  assert.equal(evidence.lockedStateNoKeyMaterialAccess, true);
  assert.equal(evidence.lockedStateNoRuntimeMessaging, true);
  assert.equal(evidence.rollbackMarkerStatus, "passphrase-first-runtime-unlock-with-marker-based-rollback-detection");
  assert.equal(evidence.rollbackMarkerPresent, true);
  assert.equal(evidence.rollbackSuspicionDetected, false);
  assert.equal(evidence.rollbackResumeBlocked, false);
  assert.equal(evidence.rollbackPreventionClaimed, false);
  assert.equal(evidence.localDeleteConfirmationRequired, true);
  assert.equal(evidence.localDeleteConfirmation, "WIPE_LOCAL_DATA");
  assert.equal(evidence.localDeleteScope, "owned-app-data-on-this-device");
  assert.equal(evidence.backupExclusionPolicyDecided, true);
  assert.equal(evidence.backupExclusionVerified, false);
  assert.equal(evidence.backupExclusionStatus, "policy-decided-verification-required");
  assert.equal(evidence.cloudBackupOrSyncEnabled, false);
  assert.equal(evidence.backupRecoveryClaimed, false);
  assert.equal(evidence.appKeyWrappingReady, false);
  assert.equal(evidence.secureDeletionClaimAllowed, false);
  assert.equal(evidence.compromisedEndpointProtected, false);
  assert.match(evidence.summary, /local_at_rest_mitigation_ready=true/);
  assert.match(evidence.summary, /compromised_endpoint_protected=false/);

  const unsafe = localStorageRuntimeEvidenceView({
    rollbackSuspicionDetected: true,
    cloudBackupOrSyncEnabled: true,
    backupRecoveryClaimed: true,
    rollbackPreventionClaimed: true,
    appKeyWrappingReady: true,
    secureDeletionClaimAllowed: true,
  });
  assert.equal(unsafe.localAtRestMitigationReady, false);
  assert.equal(unsafe.rollbackResumeBlocked, true);
  assert.match(unsafe.summary, /cloud_backup_or_sync_enabled=true/);
  assert.match(unsafe.summary, /backup_recovery_claimed=true/);
  assert.match(unsafe.summary, /rollback_prevention_claimed=true/);
  assert.match(unsafe.summary, /app_key_wrapping_ready=true/);
  assert.match(unsafe.summary, /secure_deletion_claim_allowed=true/);
});

test("no silent network boundary keeps default manual and advanced onion explicit", () => {
  const launch = noSilentNetworkBoundaryStatus();
  const readyWithoutPermission = noSilentNetworkBoundaryStatus({
    roomReady: true,
    profileReady: true,
  });
  const allowed = noSilentNetworkBoundaryStatus({
    manualNetworkPermission: true,
    roomReady: true,
    profileReady: true,
  });

  assert.equal(launch.defaultTransportPath, "local-manual-encrypted-envelope-exchange");
  assert.equal(launch.defaultTransportNetworkIo, false);
  assert.equal(launch.defaultTransportAutomaticDelivery, false);
  assert.equal(launch.automaticNetworkOnLaunchAllowed, false);
  assert.equal(launch.advancedControlsSeparated, true);
  assert.equal(launch.networkAttemptAllowed, false);
  assert.equal(readyWithoutPermission.networkAttemptAllowed, false);
  assert.equal(allowed.networkAttemptAllowed, true);
  assert.match(allowed.boundary, /explicit_user_permission_required=true/);
  assert.match(allowed.boundary, /room_profile_readiness_required=true/);
  assert.match(allowed.boundary, /reliable_onion_delivery_claim=false/);
  assert.match(allowed.boundary, /censorship_resistance_claim=false/);
  assert.doesNotMatch(allowed.boundary, /central_message_server=true|automatic_network_on_launch=true/);
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

  const readyStatus = desktopFirstCompletionStatus(readyReport);
  assert.deepEqual({
    scope: readyStatus.scope,
    status: readyStatus.status,
    blockers: readyStatus.blockers,
    blockerSummary: readyStatus.blockerSummary,
    localManualE2eeRuntimeBoundary: readyStatus.localManualE2eeRuntimeBoundary,
    localManualE2eeRuntimeReady: readyStatus.localManualE2eeRuntimeReady,
    replayCommitAfterDecrypt: readyStatus.replayCommitAfterDecrypt,
    tamperFailureNonAdvance: readyStatus.tamperFailureNonAdvance,
    passphraseFirstStorageRequired: readyStatus.passphraseFirstStorageRequired,
    externalOnionDeliveryVerified: readyStatus.externalOnionDeliveryVerified,
    productionMessagingReady: readyStatus.productionMessagingReady,
    productionE2eeReady: readyStatus.productionE2eeReady,
    productionKeyManagementReady: readyStatus.productionKeyManagementReady,
    localStorageRuntimeEvidenceReady: readyStatus.localStorageRuntimeEvidenceReady,
    localStorageRuntimeEvidenceBoundary: readyStatus.localStorageRuntimeEvidenceBoundary,
    localAtRestMitigationReady: readyStatus.localAtRestMitigationReady,
    lockedStateNoPlaintextAccess: readyStatus.lockedStateNoPlaintextAccess,
    lockedStateNoKeyMaterialAccess: readyStatus.lockedStateNoKeyMaterialAccess,
    lockedStateNoRuntimeMessaging: readyStatus.lockedStateNoRuntimeMessaging,
    rollbackMarkerStatus: readyStatus.rollbackMarkerStatus,
    rollbackMarkerPresent: readyStatus.rollbackMarkerPresent,
    rollbackSuspicionDetected: readyStatus.rollbackSuspicionDetected,
    rollbackResumeBlocked: readyStatus.rollbackResumeBlocked,
    localDeleteConfirmationRequired: readyStatus.localDeleteConfirmationRequired,
    localDeleteConfirmation: readyStatus.localDeleteConfirmation,
    backupExclusionPolicyDecided: readyStatus.backupExclusionPolicyDecided,
    backupExclusionVerified: readyStatus.backupExclusionVerified,
    backupExclusionStatus: readyStatus.backupExclusionStatus,
    appKeyWrappingReady: readyStatus.appKeyWrappingReady,
    secureDeletionClaimAllowed: readyStatus.secureDeletionClaimAllowed,
    securityReadyClaimed: readyStatus.securityReadyClaimed,
    sensitiveCommunicationAllowed: readyStatus.sensitiveCommunicationAllowed,
  }, {
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
    productionKeyManagementReady: true,
    localStorageRuntimeEvidenceReady: true,
    localStorageRuntimeEvidenceBoundary: "passphrase-first-locked-state-rollback-marker-local-delete-backup-exclusion-v1",
    localAtRestMitigationReady: true,
    lockedStateNoPlaintextAccess: true,
    lockedStateNoKeyMaterialAccess: true,
    lockedStateNoRuntimeMessaging: true,
    rollbackMarkerStatus: "passphrase-first-runtime-unlock-with-marker-based-rollback-detection",
    rollbackMarkerPresent: true,
    rollbackSuspicionDetected: false,
    rollbackResumeBlocked: false,
    localDeleteConfirmationRequired: true,
    localDeleteConfirmation: "WIPE_LOCAL_DATA",
    backupExclusionPolicyDecided: true,
    backupExclusionVerified: false,
    backupExclusionStatus: "policy-decided-verification-required",
    appKeyWrappingReady: false,
    secureDeletionClaimAllowed: false,
    securityReadyClaimed: false,
    sensitiveCommunicationAllowed: false,
  });
  const blockedStatus = desktopFirstCompletionStatus(blockedReport);
  assert.deepEqual({
    scope: blockedStatus.scope,
    status: blockedStatus.status,
    blockers: blockedStatus.blockers,
    blockerSummary: blockedStatus.blockerSummary,
    localManualE2eeRuntimeBoundary: blockedStatus.localManualE2eeRuntimeBoundary,
    localManualE2eeRuntimeReady: blockedStatus.localManualE2eeRuntimeReady,
    replayCommitAfterDecrypt: blockedStatus.replayCommitAfterDecrypt,
    tamperFailureNonAdvance: blockedStatus.tamperFailureNonAdvance,
    passphraseFirstStorageRequired: blockedStatus.passphraseFirstStorageRequired,
    externalOnionDeliveryVerified: blockedStatus.externalOnionDeliveryVerified,
    productionMessagingReady: blockedStatus.productionMessagingReady,
    productionE2eeReady: blockedStatus.productionE2eeReady,
    productionKeyManagementReady: blockedStatus.productionKeyManagementReady,
    localStorageRuntimeEvidenceReady: blockedStatus.localStorageRuntimeEvidenceReady,
    localAtRestMitigationReady: blockedStatus.localAtRestMitigationReady,
    backupExclusionStatus: blockedStatus.backupExclusionStatus,
    appKeyWrappingReady: blockedStatus.appKeyWrappingReady,
    secureDeletionClaimAllowed: blockedStatus.secureDeletionClaimAllowed,
    securityReadyClaimed: blockedStatus.securityReadyClaimed,
    sensitiveCommunicationAllowed: blockedStatus.sensitiveCommunicationAllowed,
  }, {
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
    productionKeyManagementReady: true,
    localStorageRuntimeEvidenceReady: true,
    localAtRestMitigationReady: true,
    backupExclusionStatus: "policy-decided-verification-required",
    appKeyWrappingReady: false,
    secureDeletionClaimAllowed: false,
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
  assert.match(diagnostics, /production_key_management_ready=true/);
  assert.match(diagnostics, /local_storage_runtime_evidence_ready=true/);
  assert.match(
    diagnostics,
    /local_storage_runtime_evidence_boundary=passphrase-first-locked-state-rollback-marker-local-delete-backup-exclusion-v1/,
  );
  assert.match(diagnostics, /local_at_rest_mitigation_ready=true/);
  assert.match(diagnostics, /locked_state_no_plaintext_access=true/);
  assert.match(diagnostics, /locked_state_no_key_material_access=true/);
  assert.match(diagnostics, /locked_state_no_runtime_messaging=true/);
  assert.match(diagnostics, /rollback_marker_status=passphrase-first-runtime-unlock-with-marker-based-rollback-detection/);
  assert.match(diagnostics, /rollback_marker_present=true/);
  assert.match(diagnostics, /rollback_suspicion_detected=false/);
  assert.match(diagnostics, /rollback_resume_blocked=false/);
  assert.match(diagnostics, /local_delete_confirmation_required=true/);
  assert.match(diagnostics, /local_delete_confirmation=WIPE_LOCAL_DATA/);
  assert.match(diagnostics, /backup_exclusion_policy_decided=true/);
  assert.match(diagnostics, /backup_exclusion_verified=false/);
  assert.match(diagnostics, /backup_exclusion_status=policy-decided-verification-required/);
  assert.match(diagnostics, /app_key_wrapping_ready=false/);
  assert.match(diagnostics, /cloud_backup_or_sync_enabled=false/);
  assert.match(diagnostics, /backup_recovery_claimed=false/);
  assert.match(diagnostics, /rollback_prevention_claimed=false/);
  assert.match(diagnostics, /secure_deletion_claim_allowed=false/);
  assert.match(diagnostics, /compromised_endpoint_protected=false/);
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
  assert.doesNotMatch(receiveBlockedDiagnostics, /^failure_class=none$/m);
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
  assert.doesNotMatch(composeBlockedDiagnostics, /^failure_class=none$/m);
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

test("public diagnostics report keeps local recovery next action ahead of room and transport blockers", () => {
  const diagnostics = publicBetaDiagnosticsReport(
    [
      "app_version=0.1.0",
      "build_channel=beta-onion",
      "build_commit=806ecad1",
      "room_present=false",
      "session_ready=false",
      "local_recovery_action=check-data-lifecycle",
      "rollback_suspicion=true",
      "resume_blocked=true",
      "real_onion_next_blocker=BootstrapTimeout",
    ].join("\n"),
    { includeCopyBoundary: true },
  );

  assert.match(diagnostics, /failure_class=local-recovery-needed/);
  assert.match(diagnostics, /recovery_next_action=check-data-lifecycle/);
  assert.match(diagnostics, /diagnostics_copy_next_action=check-data-lifecycle/);
  assert.match(diagnostics, /desktop_acceptance_next_action=check-data-lifecycle/);
  assert.doesNotMatch(diagnostics, /failure_class=room-not-open/);
  assert.doesNotMatch(diagnostics, /recovery_next_action=retry-network/);
});
