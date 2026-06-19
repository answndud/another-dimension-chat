import assert from "node:assert/strict";
import test from "node:test";
import {
  chatNoticeForSendReceiveText,
  productionActionAvailability,
  productionEncryptedEnvelopeExchangeStepperView,
  productionFirstRunDesktopSummaryView,
  productionLocalLifecycleBoundaryView,
  productionBridgeCensorshipBoundaryView,
  productionHighRiskThreatModelBoundaryView,
  productionHighRiskThreatModelClaimMatrix,
  HIGH_RISK_READINESS_CONDITION_SET,
  productionHighRiskReadinessGateView,
  productionHighRiskRuntimeEvidenceInputFromAttemptResult,
  productionHighRiskRuntimeEvidenceGateView,
  productionHighRiskRuntimeEvidenceSummaryView,
  productionFinalReleaseAcceptanceView,
  productionExternalTwoMachineEvidenceView,
  productionHighRiskTransportMetadataBoundaryView,
  productionPanicLockMitigationView,
  productionVersionIntegrityView,
  productionWindowsPublicArtifactCandidateView,
  productionWindowsRuntimeParityView,
  productionInviteCodeProfiles,
  productionInviteIdentityBoundaryView,
  productionLocalDataRecoveryView,
  productionMessageDeliveryProductizationView,
  productionPairwiseInviteCreateView,
  productionPairwiseInviteImportFailureView,
  productionPairwiseInviteGuidanceView,
  productionPairwiseSafetyActionGateView,
  productionPairwiseSafetyVerificationFlowView,
  productionProfileUnlockRecoveryView,
  productionProfileRecoveryActionsView,
  productionRedactedSupportReportView,
  productionStorageKeyManagementHardeningView,
  productionInviteRoomConversationMetadata,
  productionManualCurrentFocusTarget,
  productionManualCurrentStepView,
  productionManualMessageCheckView,
  productionManualNextActions,
  productionManualPendingOutboundStateView,
  productionManualTransferStepLabel,
  productionOnionReceiveLoopRefreshPlan,
  productionOnionReceiveRuntimeView,
  productionTwoProfileCurrentAction,
  productionTwoProfileLatestRetryableOutbound,
  productionTwoProfileManualLifecycleView,
  productionTwoProfileOutboundActionState,
  productionTwoProfileOutboundNeedsEndpointRefresh,
  productionTwoProfileOutboundPrimaryAction,
  productionTwoProfileOutboundStatusLabel,
  productionTwoProfileRealOnionRecoveryPlan,
  productionTwoProfileRealOnionUserView,
  productionTwoProfileResumeTarget,
  productionSessionLifecycleView,
  productionTwoProfileSendAttemptUserView,
  productionTwoProfileShouldClearPendingOutboundNotice,
  productionTwoProfileShouldShowOutboundRecovery,
} from "./action-state.js";

test("bridge censorship boundary keeps support and delivery claims explicit", () => {
  assert.equal(
    productionBridgeCensorshipBoundaryView({
      bridge_capable_build: true,
      bridge_configured_for_bootstrap: true,
    }),
    [
      "bridge_lines_local_sensitive=true",
      "bridge_support=configuration_specific",
      "audited_censorship_circumvention_claim=false",
      "reliable_onion_delivery_claim=false",
      "external_peer_evidence_required=true",
      "bridge_configured=true",
      "bridge_capable=true",
    ].join(" "),
  );
});

test("invite code creates opposite local and peer roles", () => {
  assert.deepEqual(productionInviteCodeProfiles("ABCD-2345", "inviter"), {
    connectionCode: "ABCD-2345",
    role: "inviter",
    slug: "abcd-2345-1ufszcs",
    localProfile: "inviter-abcd-2345-1ufszcs",
    peerProfile: "joiner-abcd-2345-1ufszcs",
  });
  assert.deepEqual(productionInviteCodeProfiles("ABCD-2345", "joiner"), {
    connectionCode: "ABCD-2345",
    role: "joiner",
    slug: "abcd-2345-1ufszcs",
    localProfile: "joiner-abcd-2345-1ufszcs",
    peerProfile: "inviter-abcd-2345-1ufszcs",
  });
});

test("invite identity boundary stays accountless and redacted", () => {
  const boundary = productionInviteIdentityBoundaryView({
    profileA: "inviter-abcd-2345-1ufszcs",
    profileB: "joiner-abcd-2345-1ufszcs",
    passphrase: "ABCD-2345",
  });

  assert.match(boundary, /accountless=true/);
  assert.match(boundary, /phone_number_required=false/);
  assert.match(boundary, /email_required=false/);
  assert.match(boundary, /global_account_required=false/);
  assert.match(boundary, /searchable_username=false/);
  assert.match(boundary, /central_contact_discovery=false/);
  assert.match(boundary, /central_message_server=false/);
  assert.match(boundary, /pairwise_identity=true/);
  assert.match(boundary, /pairwise_profiles_derived=true/);
  assert.match(boundary, /invite_code_sensitive=true/);
  assert.match(boundary, /invite_code_in_diagnostics=false/);
  assert.match(boundary, /qr_required=false/);
  assert.doesNotMatch(boundary, /ABCD-2345|inviter-abcd|joiner-abcd/);
});

test("high-risk threat model matrix keeps public claims bounded", () => {
  const matrix = productionHighRiskThreatModelClaimMatrix();
  const boundary = productionHighRiskThreatModelBoundaryView();
  const statusFor = (attackerClass) =>
    matrix.find((entry) => entry.attackerClass === attackerClass)?.status;

  assert.equal(matrix.length, 8);
  assert.equal(statusFor("remote_passive_observer"), "mitigated");
  assert.equal(statusFor("remote_active_attacker"), "mitigated");
  assert.equal(statusFor("malicious_peer"), "mitigated");
  assert.equal(statusFor("local_at_rest_attacker"), "mitigated");
  assert.equal(statusFor("supply_chain_update_attacker"), "mitigated");
  assert.equal(statusFor("compromised_endpoint"), "not_protected");
  assert.equal(statusFor("direct_coercion"), "not_protected");
  assert.equal(statusFor("global_traffic_correlation"), "not_protected");
  assert.deepEqual(boundary.notProtected, [
    "compromised_endpoint",
    "direct_coercion",
    "global_traffic_correlation",
  ]);
  assert.match(boundary.boundary, /ordinary_use_claim=no-phone#no-email#no-global-account/);
  assert.match(boundary.boundary, /claimable_statuses=protected,mitigated/);
  assert.match(boundary.boundary, /compromised_endpoint:not_protected/);
  assert.match(boundary.boundary, /direct_coercion:not_protected/);
  assert.match(boundary.boundary, /global_traffic_correlation:not_protected/);
  assert.match(boundary.boundary, /audited_security_claim=false/);
  assert.match(boundary.boundary, /briar_cwtch_equivalence_claim=false/);
  assert.match(boundary.boundary, /coercion_safe_claim=false/);
  assert.match(boundary.boundary, /full_global_traffic_correlation_safe_claim=false/);
  assert.match(boundary.boundary, /full_censorship_resistance_claim=false/);
});

test("high-risk transport metadata boundary stays onion-only and redacted", () => {
  const view = productionHighRiskTransportMetadataBoundaryView();

  assert.equal(view.status, "not-ready");
  assert.equal(view.notReadyReason, "runtime-network-disabled-until-explicit-user-action");
  assert.match(view.boundary, /high_risk_transport_mode=onion-only/);
  assert.match(view.boundary, /high_risk_transport_onion_only=true/);
  assert.match(view.boundary, /high_risk_transport_direct_fallback=false/);
  assert.match(view.boundary, /high_risk_transport_dns_endpoint=false/);
  assert.match(view.boundary, /high_risk_transport_ip_endpoint=false/);
  assert.match(view.boundary, /high_risk_transport_explicit_user_permission=true/);
  assert.match(view.boundary, /high_risk_transport_app_launch_bootstrap=false/);
  assert.match(view.boundary, /high_risk_transport_bridge_failure_class=redacted/);
  assert.match(view.boundary, /high_risk_transport_bridge_line_exposed=false/);
  assert.match(view.boundary, /high_risk_transport_onion_endpoint_exposed=false/);
  assert.match(view.boundary, /high_risk_transport_descriptor_exposed=false/);
  assert.match(view.boundary, /high_risk_transport_local_path_exposed=false/);
  assert.match(view.boundary, /high_risk_transport_envelope_size_bucket=bucket-4k/);
  assert.match(view.boundary, /high_risk_transport_optional_send_delay=true/);
  assert.match(view.boundary, /high_risk_transport_timestamp_precision=minute/);
  assert.match(view.boundary, /high_risk_transport_redacted_contact_id=true/);
  assert.match(view.boundary, /high_risk_transport_redacted_session_id=true/);
  assert.match(view.boundary, /high_risk_transport_runtime_evidence_required_for_ready=true/);
  assert.match(view.boundary, /high_risk_transport_runtime_evidence_present=false/);
  assert.match(
    view.boundary,
    /high_risk_transport_failure_classes=bridge_config_missing#bootstrap_timeout#peer_unreachable#stale_endpoint#receive_owner_mismatch/,
  );
  assert.match(view.boundary, /high_risk_transport_ready=false/);
});

test("high-risk runtime evidence gate rejects local fabricated and unsafe evidence", () => {
  const localOnly = productionHighRiskRuntimeEvidenceGateView({
    evidenceSource: "local-fixture",
    explicitUserAction: true,
    onionOnly: true,
    endpointRotationObserved: true,
    redactedRuntimeEventRecorded: true,
    clipboardTtlMs: 5000,
    emergencyControlsReachable: true,
    localOnlyEvidence: true,
  });

  assert.equal(localOnly.accepted, false);
  assert.equal(localOnly.runtimeEvidencePresent, false);
  assert.equal(localOnly.primaryBlocker, "runtime-report-missing");
  assert.match(localOnly.summary, /local_only_evidence=true/);
  assert.match(localOnly.summary, /local_only_evidence_promoted=false/);
  assert.match(localOnly.summary, /high_risk_public_claim_allowed=false/);
  assert.match(localOnly.summary, /high_risk_ready_claim_allowed=false/);

  const fabricated = productionHighRiskRuntimeEvidenceGateView({
    evidenceSource: "runtime-report",
    explicitUserAction: true,
    onionOnly: true,
    endpointRotationObserved: true,
    redactedRuntimeEventRecorded: true,
    clipboardTtlMs: 5000,
    emergencyControlsReachable: true,
    fabricatedEvidence: true,
  });
  assert.equal(fabricated.accepted, false);
  assert.match(fabricated.summary, /fabricated_evidence=true/);
  assert.match(fabricated.summary, /fabricated_evidence_promoted=false/);

  const accepted = productionHighRiskRuntimeEvidenceGateView({
    evidenceSource: "runtime-report",
    explicitUserAction: true,
    onionOnly: true,
    directFallbackAttempted: false,
    appLaunchBootstrapAttempted: false,
    roomOpenNetworkAttempted: false,
    endpointRotationObserved: true,
    redactedRuntimeEventRecorded: true,
    failureClass: "stale_endpoint",
    clipboardTtlMs: 5000,
    emergencyControlsReachable: true,
  });
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.runtimeEvidencePresent, true);
  assert.equal(accepted.highRiskPublicClaimAllowed, false);
  assert.equal(accepted.highRiskReadyClaimAllowed, false);
  assert.equal(
    accepted.readinessConditionSet,
    "safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity",
  );
  assert.deepEqual(accepted.readinessMissingConditions, [
    "safety-verification",
    "local-storage-evidence",
    "release-integrity",
  ]);
  assert.match(accepted.boundary, /evidence_contract=runtime-report#explicit-user-action#onion-only#no-direct-fallback/);
  assert.match(accepted.summary, /runtime_failure_class=stale_endpoint/);
  assert.match(
    accepted.summary,
    /readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity/,
  );
  assert.match(accepted.summary, /endpoint_value_recorded=false/);
});

test("high-risk runtime evidence input summarizes explicit attempts without private fields", () => {
  const sendAttempt = productionHighRiskRuntimeEvidenceInputFromAttemptResult({
    manual_network_permission_enabled: true,
    send_attempt_started: true,
    redacted_send_result_event_recorded: true,
    stream_dial_attempted: true,
    network_io_attempted: true,
    next_blocker: "PeerUnreachable",
  });
  const sendGate = productionHighRiskRuntimeEvidenceGateView(sendAttempt);
  assert.equal(sendAttempt.evidenceSource, "runtime-report");
  assert.equal(sendAttempt.explicitUserAction, true);
  assert.equal(sendAttempt.endpointRotationObserved, false);
  assert.equal(sendAttempt.failureClass, "peer_unreachable");
  assert.equal(sendAttempt.forbiddenFieldsPresent, false);
  assert.equal(sendGate.accepted, false);
  assert.match(sendGate.summary, /primary_blocker=endpoint-rotation-missing/);

  const endpointUpdate = productionHighRiskRuntimeEvidenceInputFromAttemptResult({
    manual_network_permission_enabled: true,
    send_attempt_started: true,
    redacted_send_result_event_recorded: true,
    endpoint_update_applied: true,
    stale_endpoint_status_cleared: true,
  }, {
    emergencyControlsReachable: true,
  });
  const endpointUpdateGate = productionHighRiskRuntimeEvidenceGateView(endpointUpdate);
  assert.equal(endpointUpdate.endpointRotationObserved, true);
  assert.equal(endpointUpdateGate.accepted, true);
  assert.equal(endpointUpdateGate.highRiskReadyClaimAllowed, false);
  assert.match(endpointUpdateGate.summary, /high_risk_public_claim_allowed=false/);

  const localDev = productionHighRiskRuntimeEvidenceInputFromAttemptResult({
    manual_network_permission_enabled: true,
    send_attempt_started: true,
    redacted_send_result_event_recorded: true,
    endpoint_update_applied: true,
    local_dev_roundtrip_result: true,
  }, {
    emergencyControlsReachable: true,
  });
  const stale = productionHighRiskRuntimeEvidenceInputFromAttemptResult(
    {
      manual_network_permission_enabled: true,
      send_attempt_started: true,
      redacted_send_result_event_recorded: true,
      endpoint_update_applied: true,
    },
    { staleInput: true },
  );
  assert.equal(productionHighRiskRuntimeEvidenceGateView(localDev).accepted, false);
  assert.equal(productionHighRiskRuntimeEvidenceGateView(stale).accepted, false);
  assert.match(productionHighRiskRuntimeEvidenceGateView(localDev).summary, /local_only_evidence_promoted=false/);
});

test("high-risk runtime evidence summary exposes only copy-safe readiness fields", () => {
  const view = productionHighRiskRuntimeEvidenceSummaryView({
    evidenceSource: "runtime-report",
    explicitUserAction: true,
    onionOnly: true,
    endpointRotationObserved: true,
    redactedRuntimeEventRecorded: true,
    failureClass: "stale_endpoint",
    clipboardTtlMs: 5000,
    emergencyControlsReachable: true,
    safetyVerificationReady: true,
    localStorageEvidenceReady: true,
    releaseIntegrityReady: true,
    copyRequested: true,
  });

  assert.equal(view.accepted, true);
  assert.deepEqual(Object.keys(view.copyablePayload), [
    "readiness_condition_set",
    "readiness_missing_conditions",
    "evidence_source",
    "high_risk_runtime_evidence_decision",
    "failure_class",
    "clipboard_expiry_ready",
    "emergency_controls_ready",
    "local_storage_evidence_ready",
    "release_integrity_ready",
  ]);
  assert.equal(view.copyablePayload.readiness_missing_conditions, "none");
  assert.equal(view.copyablePayload.evidence_source, "runtime-report");
  assert.equal(view.copyablePayload.high_risk_runtime_evidence_decision, "accepted");
  assert.equal(view.copyablePayload.failure_class, "stale_endpoint");
  assert.equal(view.copyablePayload.clipboard_expiry_ready, true);
  assert.equal(view.copyablePayload.emergency_controls_ready, true);
  assert.equal(view.copyablePayload.local_storage_evidence_ready, true);
  assert.equal(view.copyablePayload.release_integrity_ready, true);
  assert.equal(view.highRiskReadyClaimAllowed, false);
  assert.equal(view.decision, "accepted");
  assert.equal(view.nextOwnerAction, "none");
  assert.match(view.boundary, /copy_requires_explicit_user_action=true/);
  assert.match(view.boundary, /copy_enabled=true/);
  assert.match(view.boundary, /high_risk_runtime_evidence_decision=accepted/);
  assert.match(view.boundary, /next_owner_action=none/);
  assert.match(view.boundary, /high_risk_ready_claim_allowed=false/);
  assert.doesNotMatch(
    view.copyablePayloadText,
    /(^|\n)(endpoint|descriptor|bridge_line|raw_logs|local_path|payload|key_material)=/i,
  );
});

test("high-risk readiness gate separates not ready limited and ready claims", () => {
  assert.deepEqual(HIGH_RISK_READINESS_CONDITION_SET, [
    "safety-verification",
    "high-risk-transport-runtime",
    "emergency-controls",
    "clipboard-expiry",
    "local-storage-evidence",
    "release-integrity",
  ]);
  const missingSafety = productionHighRiskReadinessGateView({
    threatMatrixAccepted: true,
    pairwiseSafetyVerified: false,
    highRiskTransportReady: false,
    highRiskTransportExplicitlyDisabled: true,
    emergencyControlsReady: true,
    clipboardExpiryReady: true,
    localStorageEvidenceReady: true,
    productionKeyManagementReady: true,
    rollbackMarkerHealthy: true,
    diagnosticsRedacted: true,
    releaseIntegrityAvailable: true,
  });

  assert.equal(missingSafety.status, "not_ready");
  assert.equal(missingSafety.primaryReasonCode, "safety-verification");
  assert.equal(missingSafety.nextAction, "verify-safety-number");
  assert.deepEqual(missingSafety.readinessMissingConditions, [
    "safety-verification",
    "high-risk-transport-runtime",
  ]);
  assert.equal(missingSafety.highRiskReadyClaimAllowed, false);
  assert.equal(missingSafety.publicSupportHighRiskClaimAllowed, false);
  assert.equal(missingSafety.releaseHighRiskClaimAllowed, false);
  assert.equal(missingSafety.unmetConditionsHidden, false);
  assert.match(missingSafety.summary, /reason_codes=safety-verification#high-risk-transport-runtime/);
  assert.match(missingSafety.summary, /readiness_missing_conditions=safety-verification#high-risk-transport-runtime/);
  assert.doesNotMatch(missingSafety.summary, /high_risk_ready_claim_allowed=true/);

  const limited = productionHighRiskReadinessGateView({
    threatMatrixAccepted: true,
    pairwiseSafetyVerified: true,
    highRiskTransportReady: false,
    highRiskTransportExplicitlyDisabled: true,
    emergencyControlsReady: true,
    clipboardExpiryReady: true,
    localStorageEvidenceReady: true,
    productionKeyManagementReady: true,
    rollbackMarkerHealthy: true,
    diagnosticsRedacted: true,
    releaseIntegrityAvailable: true,
  });
  assert.equal(limited.status, "limited");
  assert.equal(limited.primaryReasonCode, "high-risk-transport-runtime");
  assert.equal(limited.nextAction, "run-high-risk-transport-runtime-evidence");
  assert.equal(limited.highRiskReadyClaimAllowed, false);
  assert.deepEqual(limited.readinessMissingConditions, ["high-risk-transport-runtime"]);
  assert.match(limited.boundary, /status_values=ready#limited#not_ready/);

  const missingRuntimeEvidence = productionHighRiskReadinessGateView({
    threatMatrixAccepted: true,
    pairwiseSafetyVerified: true,
    highRiskTransportReady: true,
    emergencyControlsReady: true,
    clipboardExpiryReady: true,
    localStorageEvidenceReady: true,
    productionKeyManagementReady: true,
    rollbackMarkerHealthy: true,
    diagnosticsRedacted: true,
    releaseIntegrityAvailable: true,
  });
  assert.equal(missingRuntimeEvidence.status, "not_ready");
  assert.equal(missingRuntimeEvidence.primaryReasonCode, "high-risk-transport-runtime");
  assert.equal(missingRuntimeEvidence.nextAction, "run-high-risk-transport-runtime-evidence");
  assert.equal(missingRuntimeEvidence.highRiskReadyClaimAllowed, false);
  assert.deepEqual(missingRuntimeEvidence.readinessMissingConditions, ["high-risk-transport-runtime"]);
  assert.match(missingRuntimeEvidence.summary, /high_risk_transport_runtime_evidence_present=false/);
  assert.doesNotMatch(missingRuntimeEvidence.summary, /high_risk_ready_claim_allowed=true/);

  const missingLocalStorageAndControls = productionHighRiskReadinessGateView({
    threatMatrixAccepted: true,
    pairwiseSafetyVerified: true,
    highRiskTransportReady: true,
    highRiskRuntimeEvidencePresent: true,
    emergencyControlsReady: false,
    clipboardExpiryReady: false,
    clipboardClearReady: false,
    localStorageEvidenceReady: false,
    productionKeyManagementReady: true,
    rollbackMarkerHealthy: true,
    diagnosticsRedacted: true,
    releaseIntegrityAvailable: true,
  });
  assert.deepEqual(missingLocalStorageAndControls.readinessMissingConditions, [
    "emergency-controls",
    "clipboard-expiry",
    "local-storage-evidence",
  ]);
  assert.equal(missingLocalStorageAndControls.primaryReasonCode, "emergency-controls");
  assert.match(
    missingLocalStorageAndControls.summary,
    /readiness_missing_condition_fields=emergency_controls_ready#clipboard_expiry_ready#local_storage_evidence_ready/,
  );
  assert.match(missingLocalStorageAndControls.summary, /panic_lock_ready=true/);
  assert.match(missingLocalStorageAndControls.summary, /emergency_local_wipe_ready=true/);
  assert.match(missingLocalStorageAndControls.summary, /manual_emergency_release_notice_ready=false/);
  assert.match(missingLocalStorageAndControls.summary, /clipboard_clear_ready=false/);
  assert.match(missingLocalStorageAndControls.summary, /clipboard_ttl_ms=15000/);

  const controlsReadyFromMitigations = productionHighRiskReadinessGateView({
    threatMatrixAccepted: true,
    pairwiseSafetyVerified: true,
    highRiskTransportReady: true,
    highRiskRuntimeEvidencePresent: true,
    clipboardTtlMs: 5000,
    manualEmergencyReleaseNoticeReady: true,
    localStorageEvidenceReady: true,
    productionKeyManagementReady: true,
    rollbackMarkerHealthy: true,
    diagnosticsRedacted: true,
    releaseIntegrityAvailable: true,
  });
  assert.equal(controlsReadyFromMitigations.status, "ready");
  assert.equal(controlsReadyFromMitigations.emergencyControlsReady, true);
  assert.equal(controlsReadyFromMitigations.panicLockReady, true);
  assert.equal(controlsReadyFromMitigations.emergencyLocalWipeReady, true);
  assert.equal(controlsReadyFromMitigations.emergencyWipeConfirmation, "EMERGENCY WIPE LOCAL DATA");
  assert.equal(controlsReadyFromMitigations.standardLocalWipeConfirmation, "WIPE LOCAL DATA");
  assert.equal(controlsReadyFromMitigations.emergencyWipeSeparateFromStandardWipe, true);
  assert.equal(controlsReadyFromMitigations.manualEmergencyReleaseNoticeReady, true);
  assert.equal(controlsReadyFromMitigations.clipboardClearReady, true);
  assert.equal(controlsReadyFromMitigations.clipboardExpiryReady, true);
  assert.equal(controlsReadyFromMitigations.clipboardTtlMs, 5000);
  assert.match(controlsReadyFromMitigations.summary, /emergency_wipe_separate_from_standard_wipe=true/);
  assert.match(controlsReadyFromMitigations.summary, /manual_emergency_release_notice_ready=true/);
  assert.match(controlsReadyFromMitigations.summary, /coercion_safe_claim=false/);
  assert.match(controlsReadyFromMitigations.summary, /compromised_device_safe_claim=false/);

  const ready = productionHighRiskReadinessGateView({
    threatMatrixAccepted: true,
    pairwiseSafetyVerified: true,
    highRiskTransportReady: true,
    highRiskRuntimeEvidencePresent: true,
    emergencyControlsReady: true,
    clipboardExpiryReady: true,
    localStorageEvidenceReady: true,
    productionKeyManagementReady: true,
    rollbackMarkerHealthy: true,
    diagnosticsRedacted: true,
    releaseIntegrityAvailable: true,
  });
  assert.equal(ready.status, "ready");
  assert.equal(ready.highRiskOperationalReady, true);
  assert.equal(ready.primaryReasonCode, "none");
  assert.equal(ready.nextAction, "ready");
  assert.deepEqual(ready.readinessMissingConditions, []);
  assert.equal(ready.highRiskReadyClaimAllowed, false);
  assert.equal(ready.publicSupportHighRiskClaimAllowed, false);
  assert.equal(ready.releaseHighRiskClaimAllowed, false);
  assert.match(ready.summary, /high_risk_operational_ready=true/);
  assert.match(ready.summary, /readiness_missing_conditions=none/);
  assert.match(ready.summary, /local_storage_evidence_ready=true/);
  assert.match(ready.summary, /high_risk_ready_claim_allowed=false/);
  assert.match(ready.summary, /high_risk_public_claim_allowed=false/);
});

test("final release acceptance separates beta candidate stable and high-risk readiness", () => {
  const hold = productionFinalReleaseAcceptanceView({
    p0P1LocalBugAuditComplete: false,
    p0P1LocalBugsPresent: true,
    sourceAcceptanceSuitePassed: true,
    releaseArtifactConsistencyVerified: true,
    externalTwoMachineEvidencePresent: true,
    macosPublicArtifactConsistencyVerified: true,
    windowsPublicArtifactConsistencyVerified: true,
    emergencyAdvisoryPathReady: true,
    publicCopyClaimsReviewed: true,
    supportRedactionVerified: true,
    highRiskReadiness: "ready",
  });

  assert.equal(hold.acceptanceBarItems, 27);
  assert.equal(hold.acceptanceBarCovered, true);
  assert.equal(hold.payloadRecorded, false);
  assert.equal(hold.passphraseRecorded, false);
  assert.equal(hold.localPathRecorded, false);
  assert.equal(hold.keyMaterialRecorded, false);
  assert.equal(hold.p0P1LocalBugAuditComplete, false);
  assert.equal(hold.p0P1LocalBugsPresent, true);
  assert.equal(hold.publicBetaReady, false);
  assert.equal(hold.stableCandidateReady, false);
  assert.equal(hold.stablePublicAppReady, false);
  assert.equal(hold.highRiskModeReady, true);
  assert.equal(hold.releaseClass, "public_beta");
  assert.equal(hold.releaseDecision, "hold");
  assert.match(hold.summary, /release_class=public_beta/);
  assert.match(hold.summary, /acceptance_bar_items=27/);
  assert.match(hold.summary, /stable_candidate_ready=false/);
  assert.match(hold.summary, /stable_public_app_ready=false/);
  assert.match(hold.summary, /high_risk_mode_ready=true/);
  assert.match(hold.summary, /payload_recorded=false/);
  assert.match(hold.summary, /passphrase_recorded=false/);
  assert.match(hold.summary, /local_path_recorded=false/);
  assert.match(hold.summary, /key_material_recorded=false/);
  assert.doesNotMatch(
    hold.summary,
    /audited_claim=true|compromised_device_safe_claim=true|coercion_safe_claim=true|full_global_correlation_safe_claim=true/,
  );

  const stableOnly = productionFinalReleaseAcceptanceView({
    p0P1LocalBugAuditComplete: true,
    p0P1LocalBugsPresent: false,
    sourceAcceptanceSuitePassed: true,
    releaseArtifactConsistencyVerified: false,
    externalTwoMachineEvidencePresent: true,
    macosPublicArtifactConsistencyVerified: true,
    windowsPublicArtifactConsistencyVerified: true,
    emergencyAdvisoryPathReady: true,
    publicCopyClaimsReviewed: true,
    supportRedactionVerified: true,
    highRiskReadiness: "limited",
  });
  assert.equal(stableOnly.publicBetaReady, true);
  assert.equal(stableOnly.stableCandidateReady, true);
  assert.equal(stableOnly.stablePublicAppReady, false);
  assert.equal(stableOnly.highRiskModeReady, false);
  assert.equal(stableOnly.releaseClass, "stable_candidate");
  assert.equal(stableOnly.releaseDecision, "stable-candidate-ready-high-risk-hold");
  assert.match(stableOnly.boundary, /readiness_streams=public_beta#stable_candidate#stable_public_app#high_risk_mode/);
});

test("external two-machine evidence accepts only redacted real peer reports", () => {
  const base = {
    machineAReportPresent: true,
    machineBReportPresent: true,
    appVersionMatch: true,
    buildCommitMatch: true,
    checksumMatch: true,
    inviteCreated: true,
    safetyCompared: true,
    outboundExported: true,
    inboundImported: true,
    retryCancelDeleteVerified: true,
    broadFailureClass: "none-redacted",
  };

  const localOnly = productionExternalTwoMachineEvidenceView({
    ...base,
    localOnlyRehearsal: true,
  });
  assert.equal(localOnly.accepted, false);
  assert.equal(localOnly.stableCandidateEvidencePresent, false);
  assert.equal(localOnly.primaryBlocker, "local-only-rehearsal");
  assert.equal(localOnly.localOnlyPromotedToExternal, false);
  assert.equal(localOnly.reliableDeliveryClaimAllowed, false);
  assert.match(localOnly.summary, /local_only_rehearsal=true/);
  assert.match(localOnly.summary, /reliable_delivery_claim_allowed=false/);

  const forbidden = productionExternalTwoMachineEvidenceView({
    ...base,
    forbiddenFieldsPresent: true,
  });
  assert.equal(forbidden.accepted, false);
  assert.equal(forbidden.primaryBlocker, "forbidden-field-present");
  assert.match(forbidden.summary, /forbidden_fields_present=true/);
  assert.match(forbidden.summary, /forbidden_fields=.*invite_body.*envelope_payload.*local_path.*passphrase.*key_material/);

  const accepted = productionExternalTwoMachineEvidenceView(base);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.stableCandidateEvidencePresent, true);
  assert.equal(accepted.primaryBlocker, "none");
  assert.equal(accepted.nextAction, "ready-for-maintainer-review");
  assert.match(accepted.boundary, /evidence_scope=real-two-machine-redacted-peer-reports-only/);
  assert.doesNotMatch(accepted.summary, /invite_body=.*[^#\s]|envelope_payload=.*[^#\s]|passphrase=.*[^#\s]/);
});

test("version integrity view keeps manual update and rollback claims bounded", () => {
  const view = productionVersionIntegrityView({
    currentVersion: "0.1.0",
    buildChannel: "beta-onion",
    buildCommit: "abc1234",
    latestVersion: "0.1.1",
    currentReleaseTag: "v0.1.0-beta-onion-unsigned",
  });

  assert.equal(view.currentVersion, "0.1.0");
  assert.equal(view.latestVersion, "0.1.1");
  assert.equal(view.versionComparison, "manual-review-newer-or-different-version");
  assert.equal(view.expectedReleaseAuthority, "same-github-release-assets");
  assert.equal(view.checksumVerification, "matching-sha256-before-open");
  assert.equal(view.releaseIntegrityConditionSet, "checksum-provenance#manual-advisory#signed-update-manifest-candidate");
  assert.equal(view.releaseIntegrityChecksumProvenanceReady, true);
  assert.equal(view.releaseIntegrityManualAdvisoryReady, true);
  assert.equal(view.releaseIntegritySignedUpdateManifestCandidateReady, true);
  assert.equal(view.releaseIntegrityReady, true);
  assert.equal(view.autoUpdateReady, false);
  assert.equal(view.signedUpdateManifestReady, false);
  assert.equal(view.rollbackPreventionClaimed, false);
  assert.equal(view.manualUpdateRequired, true);
  assert.equal(view.emergencyNoticeMode, "manual-release-identity-verification");
  assert.equal(view.emergencyNoticeManualVerificationOnly, true);
  assert.equal(view.emergencyNoticeUpdateAvailabilityClaimed, false);
  assert.equal(view.backgroundUpdateCheck, false);
  assert.equal(view.pushUpdateNotice, false);
  assert.equal(view.forcedUpgrade, false);
  assert.equal(view.badReleaseAdvisoryPathReady, true);
  assert.equal(view.highRiskReleaseIntegrityGatePath, "scripts/high_risk_release_integrity_gate_once.sh");
  assert.match(view.summary, /emergency_advisory_path=scripts\/prepare_macos_emergency_release_advisory_packet\.sh/);
  assert.match(view.summary, /emergency_notice_mode=manual-release-identity-verification/);
  assert.match(view.summary, /emergency_notice_manual_verification_only=true/);
  assert.match(view.summary, /emergency_notice_update_availability_claim=false/);
  assert.match(view.summary, /background_update_check=false/);
  assert.match(view.summary, /push_update_notice=false/);
  assert.match(view.summary, /forced_upgrade=false/);
  assert.match(view.summary, /high_risk_release_integrity_gate_path=scripts\/high_risk_release_integrity_gate_once\.sh/);
  assert.match(view.summary, /dependency_lockfile_hash_inputs=3/);
  assert.match(view.summary, /tauri_csp_permissions_remote_code_boundary=true/);
  assert.match(view.boundary, /manual_update_required=true/);
  assert.match(view.boundary, /auto_update_ready=false/);
  assert.match(view.boundary, /rollback_warning_policy=manual-warning-only/);
  assert.match(view.boundary, /rollback_prevention_claimed=false/);
  assert.match(view.boundary, /emergency_notice_manual_verification_only=true/);
  assert.match(view.boundary, /emergency_notice_update_availability_claim=false/);
  assert.match(view.boundary, /emergency_notice_auto_update_claim=false/);
  assert.match(view.boundary, /background_update_check=false/);
  assert.match(view.boundary, /push_update_notice=false/);
  assert.match(view.boundary, /forced_upgrade=false/);
  assert.match(view.boundary, /release_artifact_checksum_policy=same-release-sha256-required/);
  assert.match(view.boundary, /release_integrity_condition_set=checksum-provenance#manual-advisory#signed-update-manifest-candidate/);
  assert.match(view.boundary, /release_integrity_checksum_provenance_ready=true/);
  assert.match(view.boundary, /release_integrity_manual_advisory_ready=true/);
  assert.match(view.boundary, /release_integrity_signed_update_manifest_candidate_ready=true/);
  assert.match(view.boundary, /release_integrity_ready=true/);
  assert.match(view.boundary, /signed_manifest_source_gate=true/);
  assert.match(view.boundary, /dependency_inventory_lockfile_hash_bound=true/);
  assert.match(view.boundary, /high_risk_release_claim_allowed=false/);
  assert.match(view.boundary, /branch_source_release_authority_allowed=false/);
  assert.doesNotMatch(view.boundary, /auto_update_ready=true|emergency_notice_update_availability_claim=true|push_update_notice=true|forced_upgrade=true|rollback_prevention_claimed=true|high_risk_release_claim_allowed=true|security_ready_claim=true/);
});

test("panic lock mitigation view keeps coercion and compromised-device claims bounded", () => {
  const view = productionPanicLockMitigationView({ clipboardTtlMs: 5000 });

  assert.equal(view.panicLockReachable, true);
  assert.equal(view.emergencyWipeReachable, true);
  assert.equal(view.emergencyConfirmation, "EMERGENCY WIPE LOCAL DATA");
  assert.match(view.boundary, /panic_lock=true/);
  assert.match(view.boundary, /memory_state_clear=true/);
  assert.match(view.boundary, /private_view_hidden=true/);
  assert.match(view.boundary, /clipboard_clear=true/);
  assert.match(view.boundary, /clipboard_ttl_ms=5000/);
  assert.match(view.boundary, /pending_secret_action_cancel=true/);
  assert.match(view.boundary, /emergency_wipe_separate_from_standard_wipe=true/);
  assert.match(view.boundary, /transcript_visible_when_locked=false/);
  assert.match(view.boundary, /invite_visible_when_locked=false/);
  assert.match(view.boundary, /endpoint_visible_when_locked=false/);
  assert.match(view.boundary, /payload_visible_when_locked=false/);
  assert.match(view.boundary, /copied_secret_in_diagnostics=false/);
  assert.match(view.boundary, /coercion_safe_claim=false/);
  assert.match(view.boundary, /compromised_device_safe_claim=false/);
  assert.match(view.boundary, /mitigation_only=true/);
});

test("windows runtime parity view keeps shared core and redacted local path boundaries", () => {
  const view = productionWindowsRuntimeParityView({ platform: "Win32" });

  assert.equal(view.platformScope, "desktop-shared-core");
  assert.equal(view.windowsDistribution, "local-build-candidate-only");
  assert.equal(view.appDataResolver, "tauri-app-data");
  assert.equal(view.pathSeparator, "platform-native-redacted");
  assert.equal(view.profileSemantics, "shared-core");
  assert.equal(view.messageExchangeSemantics, "shared-core");
  assert.equal(view.deleteWipeSemantics, "shared-core");
  assert.equal(view.rawLocalPathReturned, false);
  assert.equal(view.supportReportRawPathAllowed, false);
  assert.equal(view.macosOnlyWordingAllowed, false);
  assert.equal(view.windowsPublicArtifactReady, false);
  assert.equal(view.windowsInstallerReady, false);
  assert.equal(view.windowsSigningSecurityBoundary, false);
  assert.equal(view.sharedCoreBypassAllowed, false);
  assert.match(view.summary, /platform_scope=desktop-shared-core/);
  assert.match(view.summary, /raw_local_path_returned=false/);
  assert.match(view.summary, /windows_public_artifact_ready=false/);
  assert.match(view.boundary, /tauri_app_data_resolver_required=true/);
  assert.match(view.boundary, /local_storage_paths_redacted=true/);
  assert.match(view.boundary, /support_report_raw_path_allowed=false/);
  assert.doesNotMatch(
    view.boundary,
    /raw_local_path_returned=true|windows_public_artifact_ready=true|shared_core_bypass_allowed=true/,
  );
});

test("windows public artifact candidate keeps installer and security claims false", () => {
  const view = productionWindowsPublicArtifactCandidateView({ platform: "Win32" });

  assert.equal(view.artifactType, "windows-shell-nsis-exe-installer-candidate");
  assert.equal(view.artifactFilename, "AnotherDimension-0.1.0-windows-shell-nsis.exe");
  assert.equal(view.bundleTarget, "nsis");
  assert.equal(view.runtimeMode, "shell-sidecar-pending");
  assert.equal(view.onionRuntimeCompiled, false);
  assert.equal(view.defaultExtension, ".exe");
  assert.equal(view.portableDefaultAllowed, false);
  assert.equal(view.msiAlternativeAllowed, true);
  assert.equal(view.webview2RuntimeRequired, true);
  assert.equal(view.webview2FailureClassRedacted, true);
  assert.equal(view.appDataResolver, "tauri-app-data");
  assert.equal(view.appDataResolverSharedStorageSemantics, true);
  assert.equal(view.rawLocalPathReturned, false);
  assert.equal(view.supportReportRawPathAllowed, false);
  assert.equal(view.sharedCoreBypassAllowed, false);
  assert.equal(view.profileSessionMessageStorageBypassAllowed, false);
  assert.equal(view.manifestChecksumProvenanceRequired, true);
  assert.equal(
    view.artifactIdentityTuple,
    "AnotherDimension-0.1.0-windows-shell-nsis.exe#AnotherDimension-0.1.0-windows-shell-nsis.exe.sha256#AnotherDimension-0.1.0-windows-shell-nsis.exe.provenance.json#WINDOWS_ARTIFACT_MANIFEST.json",
  );
  assert.equal(view.manifestValidatesVersionCommitInstallerWebview2NoAutoUpdate, true);
  assert.equal(view.runtimeResultExternalPeerEvidenceSeparated, true);
  assert.equal(view.engineSidecarRequired, true);
  assert.equal(view.engineSidecarPackagedRequired, true);
  assert.equal(view.engineSidecarContractVersion, 1);
  assert.equal(view.engineSidecarProtocol, "ad-engine-json-stdio-v1");
  assert.equal(view.engineSidecarStatusCommand, "status");
  assert.equal(view.engineSidecarManualSelfTestCommand, "manual-self-test");
  assert.equal(view.engineSidecarManualSelfTestRequired, true);
  assert.equal(view.engineSidecarSpawnSupported, true);
  assert.equal(view.engineSidecarRawPathReturned, false);
  assert.equal(view.engineSidecarStdoutReturned, false);
  assert.equal(view.engineSidecarStderrReturned, false);
  assert.equal(view.engineRuntimeMode, "manual-e2ee-engine-sidecar");
  assert.equal(view.installOpenBasicFlow, "redacted_status_only");
  assert.equal(view.sidecarSelfTestStatus, "manual-self-test-redacted-status-only");
  assert.equal(view.localRuntimePromotedToDeliveryProof, false);
  assert.equal(view.smartscreenSecurityBoundaryClaimed, false);
  assert.equal(view.codeSigningSecurityBoundaryClaimed, false);
  assert.equal(view.storeReputationSecurityBoundaryClaimed, false);
  assert.equal(view.autoUpdateClaimed, false);
  assert.equal(view.windowsPublicArtifactReady, false);
  assert.equal(view.windowsInstallerReady, false);
  assert.equal(view.windowsSigningReady, false);
  assert.equal(view.windowsPublicArtifactUploadAllowed, false);
  assert.equal(view.windowsProductionClaimAllowed, false);
  assert.match(view.summary, /windows_public_artifact_candidate=true/);
  assert.match(view.summary, /webview2_runtime_required=true/);
  assert.match(view.summary, /artifact_identity_tuple=AnotherDimension-0\.1\.0-windows-shell-nsis\.exe#AnotherDimension-0\.1\.0-windows-shell-nsis\.exe\.sha256#AnotherDimension-0\.1\.0-windows-shell-nsis\.exe\.provenance\.json#WINDOWS_ARTIFACT_MANIFEST\.json/);
  assert.match(view.summary, /runtime_mode=shell-sidecar-pending/);
  assert.match(view.summary, /onion_runtime_compiled=false/);
  assert.match(view.summary, /runtime_result_external_peer_evidence_separated=true/);
  assert.match(view.summary, /engine_sidecar_protocol=ad-engine-json-stdio-v1/);
  assert.match(view.summary, /engine_sidecar_packaged_required=true/);
  assert.match(view.summary, /engine_sidecar_manual_self_test_command=manual-self-test/);
  assert.match(view.summary, /engine_sidecar_manual_self_test_required=true/);
  assert.match(view.summary, /engine_sidecar_spawn_supported=true/);
  assert.match(view.summary, /engine_sidecar_raw_path_returned=false/);
  assert.match(view.summary, /engine_sidecar_stdout_returned=false/);
  assert.match(view.summary, /engine_sidecar_stderr_returned=false/);
  assert.match(view.summary, /install_open_basic_flow=redacted_status_only/);
  assert.match(view.summary, /sidecar_self_test_status=manual-self-test-redacted-status-only/);
  assert.doesNotMatch(
    view.boundary,
    /windows_public_artifact_ready=true|windows_installer_ready=true|windows_signing_ready=true|smartscreen_security_boundary_claimed=true|shared_core_bypass_allowed=true|engine_sidecar_raw_path_returned=true|engine_sidecar_stdout_returned=true|engine_sidecar_stderr_returned=true/,
  );
});

test("first-run desktop summary keeps purpose release status and next action visible", () => {
  const initial = productionFirstRunDesktopSummaryView();
  const locked = productionFirstRunDesktopSummaryView({ profileInputPresent: true });
  const noRoom = productionFirstRunDesktopSummaryView({
    profileInputPresent: true,
    profileUnlocked: true,
  });
  const unverified = productionFirstRunDesktopSummaryView({
    profileInputPresent: true,
    profileUnlocked: true,
    roomPresent: true,
  });
  const readyToWrite = productionFirstRunDesktopSummaryView({
    profileInputPresent: true,
    profileUnlocked: true,
    roomPresent: true,
    safetyVerified: true,
  });
  const active = productionFirstRunDesktopSummaryView({
    profileInputPresent: true,
    profileUnlocked: true,
    roomPresent: true,
    safetyVerified: true,
    messageFlowReady: true,
    diagnosticsCopied: true,
  });

  assert.equal(initial.purpose, "No-central-trusted-server 1:1 private messenger");
  assert.equal(initial.releaseStatus, "Unsigned public beta; no production security claim");
  assert.equal(initial.currentStep, "profile");
  assert.equal(initial.currentStepIndex, 1);
  assert.equal(initial.stepCount, 6);
  assert.equal(initial.stepStatuses.profile, "current");
  assert.equal(initial.stepStatuses.room, "blocked");
  assert.equal(initial.stepStatuses.safety, "blocked");
  assert.equal(initial.stepStatuses.message, "blocked");
  assert.equal(initial.stepStatuses.diagnostics, "blocked");
  assert.equal(initial.stepStatuses.localDelete, "blocked");
  assert.equal(noRoom.currentStep, "room");
  assert.equal(unverified.currentStep, "safety");
  assert.equal(readyToWrite.currentStep, "message");
  assert.equal(active.currentStep, "localDelete");
  assert.equal(active.stepStatuses.profile, "complete");
  assert.equal(active.stepStatuses.message, "complete");
  assert.equal(active.stepStatuses.diagnostics, "complete");
  assert.equal(active.stepStatuses.localDelete, "current");
  assert.equal(initial.primaryNextAction, "Enter a local profile and passphrase.");
  assert.equal(locked.primaryNextAction, "Unlock or create the local profile.");
  assert.equal(noRoom.primaryNextAction, "Create an invite room or paste the invite code you received.");
  assert.equal(unverified.primaryNextAction, "Compare the safety phrase before messaging.");
  assert.equal(readyToWrite.primaryNextAction, "Write a message and export the encrypted envelope.");
  assert.equal(active.primaryNextAction, "Delete the local data on this device when you are done.");
  assert.equal(initial.stepDetails.profile.nextAction, "enter-local-profile-and-passphrase");
  assert.equal(initial.stepDetails.profile.blockedReason, "profile-input-missing");
  assert.equal(noRoom.stepDetails.room.nextAction, "create-or-join-pairwise-invite-room");
  assert.equal(noRoom.stepDetails.room.blockedReason, "room-missing");
  assert.equal(unverified.stepDetails.safety.blockedReason, "safety-not-verified");
  assert.equal(readyToWrite.stepDetails.message.nextAction, "export-manual-encrypted-envelope");
  assert.equal(active.stepDetails.message.nextAction, "import-reply-retry-cancel");
  assert.equal(active.stepDetails.diagnostics.nextAction, "done");
  assert.equal(active.stepDetails.diagnostics.blockedReason, "none");
  assert.equal(active.stepDetails.localDelete.nextAction, "delete-local-data-on-this-device");
  assert.equal(active.stepDetails.localDelete.blockedReason, "local-delete-not-completed");
  assert.equal(initial.currentAction, "enter-local-profile-and-passphrase");
  assert.equal(initial.currentBlockedReason, "profile-input-missing");
  assert.equal(initial.stepDetails.profile.keyboardLabel, "keyboard-profile-form");
  assert.equal(initial.stepDetails.localDelete.localDeleteWarning, "delete-local-data-removes-this-device-copy-no-cloud-recovery");
  assert.equal(initial.stepDetails.diagnostics.copyStatus, "not-copied");
  assert.equal(active.currentAction, "delete-local-data-on-this-device");
  assert.equal(active.currentBlockedReason, "local-delete-not-completed");
  assert.equal(active.diagnosticsCopyStatus, "copied");
  assert.match(initial.boundary, /first_run_summary=true/);
  assert.match(initial.boundary, /first_run_current_step=profile/);
  assert.match(initial.boundary, /first_run_progress_visible=true/);
  assert.match(initial.boundary, /first_run_status_values=complete#current#blocked/);
  assert.match(initial.boundary, /primary_next_action_visible=true/);
  assert.match(active.boundary, /first_run_step_next_actions=/);
  assert.match(active.boundary, /localDelete:delete-local-data-on-this-device/);
  assert.match(active.boundary, /first_run_blocked_reasons=/);
  assert.match(active.boundary, /localDelete:local-delete-not-completed/);
  assert.match(active.boundary, /first_run_keyboard_labels=/);
  assert.match(active.boundary, /message:keyboard-manual-envelope-actions/);
  assert.match(active.boundary, /first_run_current_action=localDelete:delete-local-data-on-this-device/);
  assert.match(active.boundary, /first_run_current_blocked_reason=local-delete-not-completed/);
  assert.match(active.boundary, /first_run_recovery_next_action_visible=true/);
  assert.match(active.boundary, /first_run_local_delete_warning=delete-local-data-removes-this-device-copy-no-cloud-recovery/);
  assert.match(active.boundary, /first_run_diagnostics_copy_status=copied/);
  assert.match(active.boundary, /first_run_mobile_desktop_wrap_safe=true/);
  assert.match(initial.boundary, /sensitive_communication_claim=false/);
  assert.match(initial.boundary, /security_ready_claim=false/);
  assert.match(initial.boundary, /network_on_launch=false/);
});

test("pairwise invite guidance keeps discovery and messaging gates explicit", () => {
  const create = productionPairwiseInviteGuidanceView({
    step: "create",
    role: "inviter",
    roomPresent: true,
  });
  assert.equal(create.nextKey, "pairwiseInviteNextShareCode");
  assert.match(create.boundary, /pairwise_invite_flow=true/);
  assert.match(create.boundary, /step=create-code/);
  assert.match(create.boundary, /role=inviter/);
  assert.match(create.boundary, /send_code_over_existing_channel=true/);
  assert.match(create.boundary, /verify_phrase_before_messaging=true/);
  assert.match(create.boundary, /searchable_username=false/);
  assert.match(create.boundary, /address_book=false/);
  assert.match(create.boundary, /central_contact_discovery=false/);
  assert.match(create.boundary, /central_message_server=false/);
  assert.match(create.boundary, /invite_code_in_diagnostics=false/);
  assert.match(create.boundary, /room_present=true/);

  const remove = productionPairwiseInviteGuidanceView({ step: "delete", role: "joiner" });
  assert.equal(remove.nextKey, "pairwiseInviteNextCreateOrPasteAgain");
  assert.match(remove.boundary, /step=remove-list-entry/);
  assert.match(remove.boundary, /room_present=false/);
});

test("pairwise invite create view exposes local peer labels without diagnostic payload claims", () => {
  const view = productionPairwiseInviteCreateView({
    code: "ABCD-2345",
    role: "inviter",
  });

  assert.equal(view.localProfile, "inviter-abcd-2345-1ufszcs");
  assert.equal(view.intendedPeerLabel, "joiner device");
  assert.equal(view.intendedPeerProfile, "joiner-abcd-2345-1ufszcs");
  assert.equal(view.payload, "ABCD-2345");
  assert.match(view.manualSendInstruction, /Send this invite code/);
  assert.match(view.boundary, /local_profile_visible=true/);
  assert.match(view.boundary, /intended_peer_label_visible=true/);
  assert.match(view.boundary, /payload_visible_to_user=true/);
  assert.match(view.boundary, /payload_in_diagnostics=false/);
});

test("pairwise invite import failure view splits non-generic recovery kinds", () => {
  const malformed = productionPairwiseInviteImportFailureView({
    error: "pairwise_invite_import_failure=malformed",
  });
  const duplicate = productionPairwiseInviteImportFailureView({
    error: "CoreError::PairingAlreadyPending",
  });
  const paired = productionPairwiseInviteImportFailureView({
    error: "CoreError::ContactAlreadyActive",
  });
  const mismatch = productionPairwiseInviteImportFailureView({
    error: "ProductionSessionError::LocalPairingPayloadMismatch",
  });
  const unsupported = productionPairwiseInviteImportFailureView({
    error: "ProductionSessionError::NonProductionPairingPayload",
  });
  const stale = productionPairwiseInviteImportFailureView({
    error: "PairingError::ExpiredPayload",
  });
  const revoked = productionPairwiseInviteImportFailureView({
    error: "pairwise_invite_import_failure=revoked_re_pair_required",
  });

  assert.equal(malformed.kind, "malformed");
  assert.equal(duplicate.kind, "duplicate");
  assert.equal(paired.kind, "already_paired");
  assert.equal(stale.kind, "stale");
  assert.equal(mismatch.kind, "identity_mismatch");
  assert.equal(unsupported.kind, "unsupported");
  assert.equal(revoked.kind, "revoked_re_pair_required");
  for (const view of [malformed, duplicate, paired, stale, mismatch, unsupported, revoked]) {
    assert.match(view.boundary, /malicious_input_fail_closed=true/);
    assert.match(view.boundary, /success_state=false/);
    assert.match(view.boundary, /verified_state=false/);
    assert.match(view.boundary, /delivered_state=false/);
    assert.match(view.boundary, /generic_error=false/);
    assert.match(view.boundary, /endpoint_returned=false/);
    assert.doesNotMatch(view.message, /ADPAIR2|\/tmp|passphrase|private key/i);
  }
});

test("pairwise safety verification flow routes mismatch and revoked to re-pair", () => {
  const compare = productionPairwiseSafetyVerificationFlowView({
    safetyTranscriptBound: true,
  });
  const confirmed = productionPairwiseSafetyVerificationFlowView({
    safetyTranscriptBound: true,
    confirmedMatch: true,
  });
  const mismatch = productionPairwiseSafetyVerificationFlowView({
    safetyTranscriptBound: true,
    failure_kind: "identity_mismatch",
  });
  const revoked = productionPairwiseSafetyVerificationFlowView({
    failure_kind: "revoked_re_pair_required",
  });

  assert.equal(compare.state, "compare");
  assert.equal(compare.confirmMatchAllowed, true);
  assert.equal(confirmed.state, "confirmed_match");
  assert.match(confirmed.boundary, /compare_required=false/);
  assert.equal(mismatch.state, "marked_mismatch");
  assert.equal(mismatch.rePairRequired, true);
  assert.equal(mismatch.sendAllowed, false);
  assert.equal(mismatch.exportAllowed, false);
  assert.equal(mismatch.importAllowed, false);
  assert.equal(mismatch.failureClass, "safety_mismatch");
  assert.match(mismatch.boundary, /malicious_input_fail_closed=true/);
  assert.match(mismatch.boundary, /false_verified_state=blocked/);
  assert.equal(revoked.state, "revoked_re_pair_required");
  assert.equal(revoked.rePairRequired, true);
  assert.equal(revoked.sendAllowed, false);
  assert.equal(revoked.exportAllowed, false);
  assert.equal(revoked.importAllowed, false);
  assert.equal(revoked.failureClass, "revoked_room");
  assert.match(revoked.boundary, /generic_error=false/);
});

test("pairwise safety action gate blocks send export import for unsafe peer states", () => {
  const ready = productionPairwiseSafetyActionGateView({
    safetyVerified: true,
  });
  assert.equal(ready.failureClass, "none");
  assert.equal(ready.sendAllowed, true);
  assert.equal(ready.exportAllowed, true);
  assert.equal(ready.importAllowed, true);

  const unsafe = [
    productionPairwiseSafetyActionGateView({ safetyVerified: false }),
    productionPairwiseSafetyActionGateView({ failureClass: "identity_mismatch", safetyVerified: true }),
    productionPairwiseSafetyActionGateView({ failureClass: "duplicate", safetyVerified: true }),
    productionPairwiseSafetyActionGateView({ failureClass: "PairingError::ExpiredPayload", safetyVerified: true }),
    productionPairwiseSafetyActionGateView({ failureClass: "revoked_re_pair_required", safetyVerified: true }),
  ];
  assert.deepEqual(unsafe.map((view) => view.failureClass), [
    "safety_not_verified",
    "safety_mismatch",
    "duplicate_invite",
    "stale_invite",
    "revoked_room",
  ]);
  for (const view of unsafe) {
    assert.equal(view.sendAllowed, false);
    assert.equal(view.exportAllowed, false);
    assert.equal(view.importAllowed, false);
    assert.equal(view.verifiedStateAllowed, false);
    assert.equal(view.deliveredStateAllowed, false);
    assert.match(view.boundary, /mismatch_blocks_message_actions=true/);
    assert.match(view.boundary, /duplicate_invite_blocks_message_actions=true/);
    assert.match(view.boundary, /stale_invite_blocks_message_actions=true/);
    assert.match(view.boundary, /revoked_room_blocks_message_actions=true/);
    assert.match(view.boundary, /safety_number_in_diagnostics=false/);
    assert.match(view.boundary, /safety_phrase_in_diagnostics=false/);
    assert.match(view.boundary, /invite_payload_in_diagnostics=false/);
  }
});

test("profile unlock recovery view splits passphrase store and migration failures", () => {
  const wrong = productionProfileUnlockRecoveryView({ redacted_reason: "wrong-passphrase" });
  const missing = productionProfileUnlockRecoveryView({ kind: "missing_store" });
  const corrupt = productionProfileUnlockRecoveryView({ error: "corrupt local store" });
  const migration = productionProfileUnlockRecoveryView({ failure_kind: "migration_needed" });
  const unsupported = productionProfileUnlockRecoveryView({ error: "os-keystore-only rejected" });

  assert.equal(wrong.kind, "wrong_passphrase");
  assert.equal(wrong.retryWithPassphraseAllowed, true);
  assert.equal(missing.kind, "missing_store");
  assert.equal(missing.createNewProfileAllowed, true);
  assert.equal(corrupt.kind, "corrupt_store");
  assert.equal(corrupt.createNewProfileAllowed, true);
  assert.equal(migration.kind, "migration_needed");
  assert.equal(migration.migrationRequired, true);
  assert.equal(unsupported.kind, "unsupported_unlock_factor");
  assert.match(unsupported.boundary, /os_keychain_only_supported=false/);
  for (const view of [wrong, missing, corrupt, migration, unsupported]) {
    assert.match(view.boundary, /generic_error=false/);
    assert.match(view.boundary, /raw_path_returned=false/);
    assert.match(view.boundary, /passphrase_returned=false/);
    assert.match(view.boundary, /key_material=false/);
    assert.match(view.boundary, /secure_media_deletion_claim=false/);
    assert.match(view.boundary, /not_protected_device_compromise=true/);
    assert.doesNotMatch(view.warning, /\/tmp|profiles\/|correct horse|private key/i);
  }
});

test("profile recovery actions stay structured and redacted", () => {
  const wrong = productionProfileRecoveryActionsView(
    productionProfileUnlockRecoveryView({ redacted_reason: "wrong-passphrase" }),
  );
  const missing = productionProfileRecoveryActionsView(
    productionProfileUnlockRecoveryView({ kind: "missing_store" }),
  );
  const corrupt = productionProfileRecoveryActionsView(
    productionProfileUnlockRecoveryView({ kind: "corrupt_store" }),
  );
  const migration = productionProfileRecoveryActionsView(
    productionProfileUnlockRecoveryView({ kind: "migration_needed" }),
  );

  assert.equal(wrong.primaryAction, "retry");
  assert.equal(wrong.retryEnabled, true);
  assert.equal(missing.primaryAction, "create");
  assert.equal(missing.createEnabled, true);
  assert.equal(corrupt.rebuildEnabled, true);
  assert.equal(migration.rebuildEnabled, true);
  for (const view of [wrong, missing, corrupt, migration]) {
    assert.equal(view.chooseAnotherProfileEnabled, true);
    assert.equal(view.copySupportReportEnabled, true);
    assert.match(view.boundary, /profile_recovery_actions=true/);
    assert.match(view.boundary, /support_report_redacted=true/);
    assert.match(view.boundary, /string_parsing_security_state=false/);
    assert.match(view.boundary, /raw_path_returned=false/);
    assert.match(view.boundary, /passphrase_returned=false/);
    assert.match(view.boundary, /key_material=false/);
    assert.match(view.boundary, /message_body_returned=false/);
    assert.match(view.boundary, /envelope_payload_returned=false/);
  }
});

test("redacted support report excludes sensitive inputs", () => {
  const view = productionRedactedSupportReportView({
    appVersion: "1.2.3",
    buildChannel: "public-beta",
    buildCommit: "abc1234",
    platform: "MacIntel",
    releaseClass: "unsigned-public-beta",
    activeFlow: "profile-unlock",
    redactedErrorCode: "wrong_passphrase",
    nonSensitiveStatus: "profile_unlock_failed",
    recoveryNextAction: "retry-passphrase",
    passphrase: "correct horse battery staple",
    privateKey: "PRIVATEKEYSECRET",
    inviteBody: "ADPAIR2SECRET",
    messageBody: "hello plaintext",
    envelopePayload: "ADENV1SECRET",
    rawLocalPath: "/Users/alex/secret/profile.db",
    credential: "token-secret",
  });

  assert.equal(view.copyEnabled, true);
  assert.match(view.payload, /app_version=1\.2\.3/);
  assert.match(view.payload, /build_channel=public-beta/);
  assert.match(view.payload, /build_commit=abc1234/);
  assert.match(view.payload, /platform=MacIntel/);
  assert.match(view.payload, /release_class=unsigned-public-beta/);
  assert.match(view.payload, /active_flow=profile-unlock/);
  assert.match(view.payload, /redacted_error_code=wrong_passphrase/);
  assert.match(view.payload, /non_sensitive_status=profile_unlock_failed/);
  assert.match(view.payload, /recovery_next_action=retry-passphrase/);
  assert.match(view.payload, /passphrase=<redacted>/);
  assert.match(view.payload, /private_key=<redacted>/);
  assert.match(view.boundary, /support_bundle_requested=false/);
  assert.match(view.boundary, /diagnostic_upload_requested=false/);
  assert.match(view.boundary, /telemetry_upload_requested=false/);
  assert.match(view.boundary, /support_bundle_export=false/);
  assert.match(view.boundary, /security_ready_proof_claim=false/);
  for (const forbidden of [
    "correct horse battery staple",
    "PRIVATEKEYSECRET",
    "ADPAIR2SECRET",
    "hello plaintext",
    "ADENV1SECRET",
    "/Users/alex/secret/profile.db",
    "token-secret",
  ]) {
    assert.doesNotMatch(view.payload, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("local data recovery view keeps backup migration and corrupt store limits explicit", () => {
  const passphraseLoss = productionLocalDataRecoveryView({ kind: "passphrase_loss" });
  const corrupt = productionLocalDataRecoveryView({ kind: "corrupt_store" });
  const migration = productionLocalDataRecoveryView({ kind: "migration_failure" });

  assert.equal(passphraseLoss.kind, "passphrase_loss");
  assert.equal(passphraseLoss.createNewProfileAllowed, true);
  assert.equal(corrupt.kind, "corrupt_store");
  assert.equal(corrupt.createNewProfileAllowed, true);
  assert.equal(migration.kind, "migration_failure");
  assert.equal(migration.migrationRequired, true);
  assert.equal(migration.migrationRetryAllowed, true);
  assert.equal(migration.createNewProfileAllowed, false);
  for (const view of [passphraseLoss, corrupt, migration]) {
    assert.match(view.boundary, /local_export_backup=encrypted_only/);
    assert.match(view.boundary, /restore_requires_profile_passphrase=true/);
    assert.match(view.boundary, /cloud_backup_sync=false/);
    assert.match(view.boundary, /backup_recovery_claim=false/);
    assert.match(view.boundary, /destructive_migration=false/);
    assert.match(view.boundary, /silent_data_loss=false/);
    assert.match(view.boundary, /rollback_prevention_claim=false/);
    assert.match(view.boundary, /secure_media_deletion_claim=false/);
    assert.doesNotMatch(view.warning, /\/tmp|profiles\/|correct horse|private key/i);
  }

  const unlockMigration = productionProfileUnlockRecoveryView({ kind: "migration_needed" });
  assert.match(unlockMigration.boundary, /local_data_recovery=true/);
  assert.match(unlockMigration.boundary, /failure=migration_failure/);
  assert.match(unlockMigration.boundary, /silent_data_loss=false/);
});

test("storage key management hardening view keeps secrets redacted and claims bounded", () => {
  const ready = productionStorageKeyManagementHardeningView();
  assert.equal(ready.productionKeyManagementReady, true);
  assert.equal(ready.boundaryClosed, true);
  assert.equal(ready.rawPathReturned, false);
  assert.equal(ready.passphraseReturned, false);
  assert.equal(ready.keyMaterialExposed, false);
  assert.equal(ready.backupRecoveryClaimed, false);
  assert.equal(ready.rollbackPreventionClaimed, false);
  assert.equal(ready.secureMediaDeletionClaimed, false);
  assert.match(ready.boundary, /passphrase_first_required=true/);
  assert.match(ready.boundary, /kdf_params_versioned=true/);
  assert.match(ready.boundary, /migration_failure_distinct_from_corrupt_store=true/);
  assert.match(ready.boundary, /ui_error_private_fields_allowed=false/);
  assert.match(ready.boundary, /support_report_redacted=true/);
  assert.doesNotMatch(
    ready.boundary,
    /correct horse|private-key|\/Users\/alex|raw_path_returned=true|key_material_exposed=true/,
  );

  const blocked = productionStorageKeyManagementHardeningView({
    kdfParamsVersioned: false,
    passphraseReturned: true,
  });
  assert.equal(blocked.productionKeyManagementReady, false);
  assert.equal(blocked.boundaryClosed, false);
  assert.equal(blocked.passphraseReturned, true);
});

test("chat action moves from setup to compose to stored send", () => {
  const input = {
    profileA: "alice",
    profileB: "bob",
    passphrase: "connection-code",
    messageTtlSeconds: 86400,
    message: "",
  };

  assert.equal(
    productionTwoProfileCurrentAction({
      input,
      hasMessageRetentionPolicy: true,
      sessionsReady: false,
      hasKnownSessionStatus: true,
    }),
    "full-setup",
  );
  assert.equal(
    productionTwoProfileCurrentAction({
      input,
      hasMessageRetentionPolicy: true,
      sessionsReady: true,
    }),
    "compose",
  );
  assert.equal(
    productionTwoProfileCurrentAction({
      input: { ...input, message: "hello" },
      hasMessageRetentionPolicy: true,
      sessionsReady: true,
    }),
    "stored-message",
  );
});

test("resume target prioritizes retryable sends before normal replies", () => {
  assert.equal(
    productionTwoProfileResumeTarget({
      sessionsReady: true,
      hasRetryableOutbound: true,
      hasPendingConversation: true,
      hasDeliveredConversation: true,
    }),
    "retry-send",
  );
  assert.equal(
    productionTwoProfileResumeTarget({
      sessionsReady: true,
      hasPendingConversation: true,
      hasDeliveredConversation: true,
    }),
    "pending-review",
  );
  assert.equal(
    productionTwoProfileResumeTarget({
      sessionsReady: true,
      hasDeliveredConversation: true,
    }),
    "reply-latest",
  );
});

test("local lifecycle boundary keeps backup recovery and secure delete as non-claims", () => {
  const boundary = productionLocalLifecycleBoundaryView({
    store_path_returned: false,
    passphrase_retained: false,
    plaintext_exposed: false,
    key_material_exposed: false,
    network_io_attempted: false,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
    rollback_prevention_claimed: false,
    secure_deletion_from_media_claimed: false,
    crypto_erasure_performed: true,
    conversation_dek_deleted: true,
    message_key_records_deleted: true,
  });

  assert.match(boundary, /local_only=true/);
  assert.match(boundary, /destructive_action=false/);
  assert.match(boundary, /destructive_scope=local-lifecycle-readiness/);
  assert.match(boundary, /confirmation_phrase=none/);
  assert.match(boundary, /cloud_backup_sync=false/);
  assert.match(boundary, /backup_recovery=false/);
  assert.match(boundary, /marker_only_rollback=true/);
  assert.match(boundary, /crypto_erasure=true/);
  assert.match(boundary, /key_record_deletion=true/);
  assert.match(boundary, /rollback_prevention=false/);
  assert.match(boundary, /secure_delete_claim=false/);
  assert.match(boundary, /path_returned=false/);
  assert.match(boundary, /key_material=false/);

  const conversationDelete = productionLocalLifecycleBoundaryView(
    { session_records_preserved: true },
    { action: "conversation-delete" },
  );
  const sessionDelete = productionLocalLifecycleBoundaryView(
    { message_records_preserved: true },
    { action: "session-delete" },
  );
  const profileDelete = productionLocalLifecycleBoundaryView(
    { profile_deleted: true },
    { action: "profile-delete" },
  );
  const fullWipe = productionLocalLifecycleBoundaryView(
    { full_local_data_wiped: true },
    { action: "full-local-wipe" },
  );

  assert.match(conversationDelete, /destructive_scope=conversation-message-records/);
  assert.match(conversationDelete, /confirmation_phrase=DELETE_CONVERSATION/);
  assert.match(conversationDelete, /session_records_preserved=true/);
  assert.match(sessionDelete, /destructive_scope=session-resume-records/);
  assert.match(sessionDelete, /confirmation_phrase=DELETE_SESSION/);
  assert.match(sessionDelete, /message_records_preserved=true/);
  assert.match(profileDelete, /destructive_scope=local-profile-store/);
  assert.match(profileDelete, /confirmation_phrase=exact_profile_name/);
  assert.match(profileDelete, /profile_store_removed=true/);
  assert.match(fullWipe, /destructive_scope=owned-local-app-data/);
  assert.match(fullWipe, /confirmation_phrase=WIPE_LOCAL_DATA/);
  assert.match(fullWipe, /owned_app_data_removed=true/);
});

test("session lifecycle view exposes local-only lifecycle non-claims", () => {
  const view = productionSessionLifecycleView({
    session_draft_present: true,
    remote_endpoint_state_present: true,
    remote_endpoint_status_present: true,
    replay_window_present: true,
    pending_handshake_state_present: false,
    session_transport_state_present: true,
    session_resume_ready: true,
    session_deleted: false,
    session_dek_records_deleted: false,
    session_key_records_deleted: false,
    crypto_erasure_performed: false,
    session_resume_closed: false,
    message_records_preserved: true,
    store_path_returned: false,
    passphrase_retained: false,
    key_material_exposed: false,
    network_io_attempted: false,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  }, { action: "session-delete" });

  assert.match(view.lifecycle, /resume=true/);
  assert.match(view.boundary, /message_records_preserved=true/);
  assert.match(view.boundary, /destructive_scope=session-resume-records/);
  assert.match(view.boundary, /confirmation_phrase=DELETE_SESSION/);
  assert.match(view.boundary, /local_only=true/);
  assert.match(view.boundary, /backup_recovery=false/);
  assert.match(view.boundary, /cloud_backup_sync=false/);
  assert.match(view.boundary, /crypto_erasure=false/);
  assert.match(view.boundary, /key_record_deletion=false/);
  assert.match(view.boundary, /secure_delete_claim=false/);
});

test("failed outbound messages stay retryable or cancelable from the active device", () => {
  const entry = {
    sender: "alice",
    receiver: "bob",
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "ManualNetworkPermissionMissing",
    outboundRetryable: true,
  };

  assert.deepEqual(productionTwoProfileOutboundActionState(entry, { profileA: "alice", profileB: "bob" }), {
    showActions: true,
    sameDirection: true,
    canApplyDirection: true,
    canRunNow: true,
    canCancelNow: true,
    disabledReason: "",
    cancelDisabledReason: "",
  });
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(entry), {
    action: "enable-private-delivery",
    labelKey: "enablePrivateDelivery",
    noticeKey: "messageSavedPrivateDeliveryOff",
    recoveryKey: "sendRecoveryPermissionOff",
  });
  assert.deepEqual(productionTwoProfileOutboundActionState(entry, { profileA: "bob", profileB: "alice" }, true), {
    showActions: true,
    sameDirection: false,
    canApplyDirection: true,
    canRunNow: false,
    canCancelNow: false,
    disabledReason: "Only pending messages sent from this device can be retried or canceled here.",
    cancelDisabledReason: "Only pending messages sent from this device can be retried or canceled here.",
  });
});

test("outbound failure classes keep missing route separate from stale endpoint", () => {
  const missingRoute = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "peer-endpoint-missing",
    outboundRetryable: true,
  };
  const staleEndpoint = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "stored remote endpoint refresh required",
    outboundRetryable: true,
  };
  const timeout = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "receive-timeout",
    outboundRetryable: true,
  };
  const bootstrap = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "PersistentClientNotReady",
    outboundRetryable: true,
  };
  const missingMessage = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "StoredOutboundEnvelopeRequired",
    outboundRetryable: true,
  };
  const localEndpointNotReady = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "LocalOnionEndpointNotReady",
    outboundRetryable: true,
  };

  assert.equal(productionTwoProfileOutboundStatusLabel(missingRoute), "route missing");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(missingRoute), false);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(missingRoute), {
    action: "prepare-private-route",
    labelKey: "preparePrivateRoute",
    noticeKey: "privateDeliveryRouteNeeded",
    recoveryKey: "sendRecoveryRouteMissing",
  });

  const runtimeMismatch = {
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundFailureKind: "RuntimeOwnerProfileMismatch",
    outboundRetryable: true,
  };
  assert.equal(productionTwoProfileOutboundStatusLabel(runtimeMismatch), "route missing");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(runtimeMismatch), false);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(runtimeMismatch), {
    action: "prepare-private-route",
    labelKey: "preparePrivateRoute",
    noticeKey: "privateDeliveryRouteNeeded",
    recoveryKey: "sendRecoveryRuntimeMismatch",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(staleEndpoint), "stale endpoint");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(staleEndpoint), true);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(staleEndpoint), {
    action: "refresh-and-retry",
    labelKey: "refreshAndRetry",
    noticeKey: "chatNoticeRefreshAddress",
    recoveryKey: "sendRecoveryStaleEndpoint",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(timeout), "send timeout");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(timeout), false);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(timeout), {
    action: "retry",
    labelKey: "retrySend",
    noticeKey: "sendFailedGeneric",
    recoveryKey: "sendRecoveryTimeout",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(bootstrap), "Tor bootstrap");
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(bootstrap), {
    action: "retry-network",
    labelKey: "retryNetwork",
    noticeKey: "sendFailedGeneric",
    recoveryKey: "sendRecoveryTorBootstrap",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(localEndpointNotReady), "receive stopped");
  assert.equal(productionTwoProfileOutboundNeedsEndpointRefresh(localEndpointNotReady), false);
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(localEndpointNotReady), {
    action: "start-receiving",
    labelKey: "startReceiving",
    noticeKey: "chatNoticeReceiveStopped",
    recoveryKey: "sendRecoveryStartReceiving",
  });

  assert.equal(productionTwoProfileOutboundStatusLabel(missingMessage), "message missing");
  assert.deepEqual(productionTwoProfileOutboundPrimaryAction(missingMessage), {
    action: "retry",
    labelKey: "retrySend",
    noticeKey: "sendFailedGeneric",
    recoveryKey: "sendRecoveryGeneric",
  });
});

test("manual lifecycle view summarizes envelope state without sensitive payloads", () => {
  const base = {
    messageNumber: 7,
    message: "secret text",
    sender: "alice-profile",
    receiver: "bob-profile",
    roomFingerprint: "room-secret",
  };

  const exportNeeded = productionTwoProfileManualLifecycleView({
    ...base,
    statuses: new Set(),
    outboundDeliveryState: "pending",
  });
  assert.equal(exportNeeded.phase, "export-needed");
  assert.equal(exportNeeded.step, productionManualTransferStepLabel("export-envelope"));
  assert.match(exportNeeded.boundary, /network_io=false/);

  const importReady = productionTwoProfileManualLifecycleView(
    {
      ...base,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "sent",
    },
    true,
  );
  assert.equal(importReady.phase, "import-ready");
  assert.equal(importReady.step, productionManualTransferStepLabel("import-envelope"));

  const retryable = productionTwoProfileManualLifecycleView({
    ...base,
    statuses: new Set(["sent"]),
    outboundDeliveryState: "failed",
    outboundRetryable: true,
  });
  assert.equal(retryable.phase, "retryable");
  assert.equal(retryable.step, "retry or cancel");

  const complete = productionTwoProfileManualLifecycleView({
    ...base,
    statuses: new Set(["sent", "received"]),
    outboundDeliveryState: "sent",
  });
  assert.equal(complete.phase, "complete");
  assert.equal(complete.step, productionManualTransferStepLabel("write-reply"));

  const rendered = [exportNeeded, importReady, retryable, complete]
    .map((view) => Object.values(view).join(" "))
    .join("\n");
  assert.doesNotMatch(rendered, /secret text|alice-profile|bob-profile|room-secret|passphrase|payload|endpoint|path/);
});

test("manual envelope stepper and pending outbound states stay support-safe", () => {
  const initial = productionEncryptedEnvelopeExchangeStepperView({
    hasOutboundMessageInput: true,
  });
  const imported = productionEncryptedEnvelopeExchangeStepperView({
    hasOutboundMessageInput: true,
    hasLocalMessageEnvelope: true,
    hasRemoteMessageEnvelopeSlot: true,
    hasImportedMessage: true,
  });
  const replied = productionEncryptedEnvelopeExchangeStepperView({
    hasOutboundMessageInput: true,
    hasLocalMessageEnvelope: true,
    hasRemoteMessageEnvelopeSlot: true,
    hasImportedMessage: true,
    hasReceivedMessage: true,
    hasTwoProfileReplyDraftInput: true,
  });

  assert.deepEqual(initial.steps.map((step) => step.step), [
    "compose",
    "export-envelope",
    "share-outside-app",
    "import-envelope",
    "decrypt-display",
    "reply",
  ]);
  assert.equal(initial.currentStep, "export-envelope");
  assert.equal(initial.nextAction, "export-envelope");
  assert.equal(initial.blockedReason, "encrypted-envelope-not-exported");
  assert.equal(initial.steps.find((step) => step.step === "export-envelope").nextAction, "export-envelope");
  assert.equal(imported.currentStep, "decrypt-display");
  assert.equal(imported.nextAction, "import-envelope-to-decrypt-display");
  assert.equal(imported.blockedReason, "message-not-decrypted");
  assert.equal(replied.currentStep, "complete");
  assert.equal(replied.nextAction, "reply-retry-cancel-delete-or-repeat");
  assert.equal(replied.blockedReason, "none");
  assert.match(initial.boundary, /current_step=export-envelope/);
  assert.match(initial.boundary, /next_action=export-envelope/);
  assert.match(initial.boundary, /blocked_reason=encrypted-envelope-not-exported/);
  assert.match(initial.boundary, /network_io=false/);
  assert.match(initial.boundary, /payload_returned_to_support=false/);

  const base = {
    messageNumber: 9,
    statuses: new Set(),
    outboundDeliveryState: "pending",
  };
  const ready = productionManualPendingOutboundStateView(base);
  const exported = productionManualPendingOutboundStateView(base, { envelopeExported: true });
  const waiting = productionManualPendingOutboundStateView({
    ...base,
    statuses: new Set(["sent"]),
    outboundDeliveryState: "sent",
  });
  const duplicate = productionManualPendingOutboundStateView(waiting, {
    importDecision: { kind: "duplicate" },
  });
  const replayed = productionManualPendingOutboundStateView(waiting, {
    importDecision: { kind: "replay_rejected" },
  });
  const canceled = productionManualPendingOutboundStateView({
    ...base,
    outboundDeliveryState: "canceled",
  });

  assert.equal(ready.state, "ready_to_export");
  assert.equal(ready.exportAllowed, true);
  assert.equal(exported.state, "exported");
  assert.equal(exported.importAllowed, true);
  assert.equal(waiting.state, "waiting_for_reply");
  assert.equal(duplicate.state, "duplicate_import");
  assert.equal(duplicate.retryAllowed, true);
  assert.equal(replayed.state, "stale_or_replayed_import");
  assert.equal(replayed.retryAllowed, true);
  assert.equal(canceled.state, "canceled");
  assert.equal(canceled.nextAction, "write-new-message");
  for (const view of [ready, exported, waiting, duplicate, replayed, canceled]) {
    assert.match(view.boundary, /automatic_delivery=false/);
    assert.match(view.boundary, /payload_returned_to_support=false/);
    assert.match(view.boundary, /path_returned=false/);
    assert.match(view.boundary, /key_material=false/);
    assert.match(view.boundary, /plaintext_returned=false/);
  }
});

test("message delivery productization view blocks false ready and private support leaks", () => {
  const locked = productionMessageDeliveryProductizationView({
    currentRoomOwnsState: true,
    currentProfileOwnsState: true,
    duplicateOrReplayRejected: true,
    peerMismatchBlocksVerified: true,
    supportRedacted: true,
  });
  assert.equal(locked.primaryAction, "unlock-profile");
  assert.equal(locked.firstMessageRoundTripReady, false);

  const ready = productionMessageDeliveryProductizationView({
    profileUnlocked: true,
    pairwiseInviteReady: true,
    mandatorySafetyVerified: true,
    composeReady: true,
    outboundExported: true,
    inboundImported: true,
    replyReady: true,
    retryAvailable: true,
    cancelAvailable: true,
    localDeleteAvailable: true,
    currentRoomOwnsState: true,
    currentProfileOwnsState: true,
    duplicateOrReplayRejected: true,
    peerMismatchBlocksVerified: true,
    supportRedacted: true,
  });
  assert.equal(ready.primaryAction, "delete-or-rebuild");
  assert.equal(ready.firstMessageRoundTripReady, true);
  assert.equal(ready.recoveryReady, true);
  assert.equal(ready.boundaryClosed, true);

  const staleOwner = productionMessageDeliveryProductizationView({
    profileUnlocked: true,
    pairwiseInviteReady: true,
    mandatorySafetyVerified: true,
    composeReady: true,
    outboundExported: true,
    inboundImported: true,
    replyReady: true,
    retryAvailable: true,
    cancelAvailable: true,
    localDeleteAvailable: true,
    currentRoomOwnsState: false,
    currentProfileOwnsState: true,
    duplicateOrReplayRejected: true,
    peerMismatchBlocksVerified: true,
    supportRedacted: true,
  });
  assert.equal(staleOwner.primaryAction, "delete-or-rebuild");
  assert.equal(staleOwner.firstMessageRoundTripReady, false);
  assert.equal(staleOwner.currentInputOwned, false);
  assert.equal(staleOwner.boundaryClosed, false);

  const mismatchOrReplayOpen = productionMessageDeliveryProductizationView({
    profileUnlocked: true,
    pairwiseInviteReady: true,
    mandatorySafetyVerified: true,
    composeReady: true,
    outboundExported: true,
    inboundImported: true,
    replyReady: true,
    retryAvailable: true,
    cancelAvailable: true,
    localDeleteAvailable: true,
    currentRoomOwnsState: true,
    currentProfileOwnsState: true,
    duplicateOrReplayRejected: false,
    peerMismatchBlocksVerified: false,
    supportRedacted: true,
  });
  assert.equal(mismatchOrReplayOpen.primaryAction, "verify-safety");
  assert.match(mismatchOrReplayOpen.summary, /pairwise_safety_failure_class=safety_mismatch/);
  assert.match(mismatchOrReplayOpen.summary, /send_action_allowed=false/);
  assert.match(mismatchOrReplayOpen.summary, /export_action_allowed=false/);
  assert.match(mismatchOrReplayOpen.summary, /import_action_allowed=false/);
  assert.equal(mismatchOrReplayOpen.firstMessageRoundTripReady, false);
  assert.equal(mismatchOrReplayOpen.boundaryClosed, false);

  for (const view of [locked, ready, staleOwner, mismatchOrReplayOpen]) {
    assert.equal(view.falseDeliveredAllowed, false);
    assert.equal(view.falseVerifiedAllowed, false);
    assert.equal(view.falseReadyAllowed, false);
    assert.equal(view.supportPrivateFieldsAllowed, false);
    assert.match(view.boundary, /false_delivered_allowed=false/);
    assert.match(view.boundary, /false_verified_allowed=false/);
    assert.match(view.boundary, /false_ready_allowed=false/);
    assert.match(view.boundary, /message_body_in_support=false/);
    assert.match(view.boundary, /envelope_payload_in_support=false/);
    assert.match(view.boundary, /invite_body_in_support=false/);
    assert.match(view.boundary, /local_path_in_support=false/);
    assert.match(view.boundary, /key_or_passphrase_in_support=false/);
    assert.doesNotMatch(
      view.boundary,
      /secret text|raw-envelope|invite body|\/Users\/alex|hunter2|PRIVATE_KEY_BYTES/,
    );
  }
});

test("send receive notices separate bootstrap retry from route setup", () => {
  assert.deepEqual(chatNoticeForSendReceiveText("PersistentClientNotReady"), {
    key: "retryNetwork",
    tone: "warning",
  });
  assert.deepEqual(chatNoticeForSendReceiveText("bootstrap timeout"), {
    key: "retryNetwork",
    tone: "warning",
  });
  assert.deepEqual(chatNoticeForSendReceiveText("private route is not ready"), {
    key: "torBootstrap",
    tone: "warning",
  });
});

test("send attempt view separates route setup from endpoint refresh", () => {
  assert.deepEqual(
    productionTwoProfileSendAttemptUserView(
      {
        send_attempt_started: false,
        send_attempt_succeeded: false,
        peer_endpoint_refresh_recommended: false,
        next_blocker: "stored remote endpoint unavailable",
        blockers: ["stored remote endpoint unavailable"],
      },
      7,
    ),
    {
      state: "Private route needed",
      profiles: "Room is saved.",
      session: "Peer delivery route is not ready.",
      message: "Message #7 is still saved. Set up the delivery route, then retry or cancel.",
      boundary: "No private delivery was attempted.",
    },
  );

  assert.deepEqual(
    productionTwoProfileSendAttemptUserView(
      {
        send_attempt_started: false,
        send_attempt_succeeded: false,
        peer_endpoint_refresh_recommended: true,
        next_blocker: "stored remote endpoint refresh required",
        blockers: ["stored remote endpoint refresh required"],
      },
      7,
    ),
    {
      state: "Peer address refresh needed",
      profiles: "Room is saved.",
      session: "Peer address needs to be refreshed.",
      message: "Message #7 is still saved. Refresh the address, then retry or cancel.",
      boundary: "No message was deleted.",
    },
  );

  assert.deepEqual(
    productionTwoProfileSendAttemptUserView(
      {
        send_attempt_started: true,
        send_attempt_succeeded: false,
        peer_endpoint_refresh_recommended: false,
        next_blocker: "SendFailed",
        blockers: ["SendFailed"],
      },
      7,
    ),
    {
      state: "Private delivery failed",
      profiles: "Room is saved.",
      session: "The other device may be offline.",
      message: "Message #7 is still saved. Retry or cancel it from the conversation.",
      boundary: "The failed send stayed retryable.",
    },
  );
});

test("latest retryable outbound only selects active-device failed sends", () => {
  const input = { profileA: "alice", profileB: "bob" };
  const entries = [
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 1,
      createdAtMs: 100,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "failed",
      outboundRetryable: true,
    },
    {
      sender: "bob",
      receiver: "alice",
      messageNumber: 2,
      createdAtMs: 400,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "failed",
      outboundRetryable: true,
    },
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 3,
      createdAtMs: 300,
      statuses: new Set(["sent", "received"]),
      outboundDeliveryState: "failed",
      outboundRetryable: true,
    },
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 4,
      createdAtMs: 500,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "canceled",
      outboundRetryable: false,
    },
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 5,
      createdAtMs: 250,
      statuses: new Set(["sent"]),
      outboundDeliveryState: "failed",
      outboundRetryable: true,
    },
  ];

  assert.equal(productionTwoProfileLatestRetryableOutbound(entries, input)?.messageNumber, 5);
});

test("send recovery notice waits until the room is ready", () => {
  assert.equal(
    productionTwoProfileShouldShowOutboundRecovery({
      sessionsReady: false,
      hasRetryableOutbound: true,
    }),
    false,
  );
  assert.equal(
    productionTwoProfileShouldShowOutboundRecovery({
      sessionsReady: true,
      hasRetryableOutbound: true,
    }),
    true,
  );
});

test("stale pending outbound notice clears even when another pending row remains", () => {
  assert.equal(
    productionTwoProfileShouldClearPendingOutboundNotice({
      busy: false,
      hasPendingOutboundNotice: true,
      noticeMatchesCurrentRoom: true,
      noticePendingOutboundRetryable: false,
      hasPendingConversation: true,
    }),
    true,
  );
  assert.equal(
    productionTwoProfileShouldClearPendingOutboundNotice({
      busy: false,
      hasPendingOutboundNotice: true,
      noticeMatchesCurrentRoom: true,
      noticePendingOutboundRetryable: true,
      hasPendingConversation: true,
    }),
    false,
  );
  assert.equal(
    productionTwoProfileShouldClearPendingOutboundNotice({
      busy: true,
      hasPendingOutboundNotice: true,
      noticeMatchesCurrentRoom: true,
      noticePendingOutboundRetryable: false,
    }),
    false,
  );
});

test("receive runtime exposes stopped, waiting, connected, and imported states", () => {
  assert.equal(productionOnionReceiveRuntimeView({ enabled: false }).state, "stopped");
  assert.equal(productionOnionReceiveRuntimeView({ enabled: true, inFlight: true }).state, "receiving");
  assert.equal(
    productionOnionReceiveRuntimeView({ enabled: true }, { stream_request_accepted: true }).state,
    "peer-connected",
  );
  assert.equal(
    productionOnionReceiveRuntimeView({ enabled: true }, { receive_attempt_succeeded: true }).state,
    "message-imported",
  );
});

test("real onion bootstrap timeout remains retryable and cancellable", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapTimeout",
    blockers: ["BootstrapTimeout"],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "retry-bootstrap",
    retryable: true,
    waitCancellable: true,
    reason: "network-bootstrap",
  });
  assert.deepEqual(productionTwoProfileRealOnionUserView(result), {
    state: "Private delivery waiting for network",
    profiles: "Room is saved.",
    session: "Delivery network did not finish starting.",
    message: "Wait a moment, then retry private delivery or turn it off.",
    boundary: "No message was sent and the wait can be cancelled.",
  });
});

test("real onion exhausted bootstrap with bridge-capable build but no config points to bridge config", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapTimeout",
    blockers: ["BootstrapTimeout"],
    bootstrap_retry_limit: 3,
    profile_a_bootstrap_attempts: 3,
    profile_b_bootstrap_attempts: 0,
    bridge_capable_build: true,
    bridge_configured_for_bootstrap: false,
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "prepare-network-or-bridge",
    retryable: true,
    waitCancellable: false,
    reason: "network-or-bridge-config",
  });
  assert.deepEqual(productionTwoProfileRealOnionUserView(result), {
    state: "Private delivery needs network change",
    profiles: "Room is saved.",
    session: "Delivery network did not finish starting.",
    message: "Change network or add private bridge config, then retry private delivery.",
    boundary:
      "No message was sent and no bridge config was used. " +
      "bridge_lines_local_sensitive=true bridge_support=configuration_specific " +
      "audited_censorship_circumvention_claim=false reliable_onion_delivery_claim=false " +
      "external_peer_evidence_required=true bridge_configured=false bridge_capable=true",
  });
});

test("real onion exhausted managed bridge bootstrap points to bridge or transport refresh", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapTimeout",
    blockers: ["BootstrapTimeout"],
    bootstrap_retry_limit: 3,
    profile_a_bootstrap_attempts: 3,
    profile_b_bootstrap_attempts: 0,
    bridge_capable_build: true,
    bridge_configured_for_bootstrap: true,
    event_summary: [
      "bootstrap_diagnostic phase=timeout profile=redacted bridge_mode=managed_transport_bridge bridge_lines=2 managed_transport_count=1 pt_binary_configured=true timeout_seconds=120 next_action=retry-different-network-or-refresh-bridge-pt",
    ],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "prepare-network-or-bridge",
    retryable: true,
    waitCancellable: false,
    reason: "network-or-bridge-refresh-transport",
  });
  assert.deepEqual(productionTwoProfileRealOnionUserView(result), {
    state: "Private delivery needs network change",
    profiles: "Room is saved.",
    session: "Delivery network did not finish starting.",
    message:
      "Refresh the private bridge config or replace the pluggable transport binary, then retry private delivery.",
    boundary:
      "No message was sent after bridge bootstrap exhausted retries with pluggable transport configured. " +
      "bridge_lines_local_sensitive=true bridge_support=configuration_specific " +
      "audited_censorship_circumvention_claim=false reliable_onion_delivery_claim=false " +
      "external_peer_evidence_required=true bridge_configured=true bridge_capable=true",
  });
});

test("real onion exhausted direct bridge bootstrap points to bridge refresh", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapTimeout",
    blockers: ["BootstrapTimeout"],
    bootstrap_retry_limit: 3,
    profile_a_bootstrap_attempts: 3,
    profile_b_bootstrap_attempts: 0,
    bridge_capable_build: true,
    bridge_configured_for_bootstrap: true,
    event_summary: [
      "bootstrap_diagnostic phase=timeout profile=redacted bridge_mode=direct_bridge bridge_lines=1 managed_transport_count=0 pt_binary_configured=false timeout_seconds=12 next_action=retry-different-network-or-refresh-bridge",
    ],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "prepare-network-or-bridge",
    retryable: true,
    waitCancellable: false,
    reason: "network-or-bridge-refresh-config",
  });
});

test("real onion managed bridge bootstrap error points to bridge or transport refresh", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileAResumeBootstrapUnsupported",
    blockers: ["BootstrapUnsupported"],
    bootstrap_retry_limit: 3,
    profile_a_bootstrap_attempts: 1,
    profile_b_bootstrap_attempts: 1,
    bridge_capable_build: true,
    bridge_configured_for_bootstrap: true,
    event_summary: [
      "bootstrap_diagnostic phase=error profile=redacted bridge_mode=managed_transport_bridge bridge_lines=2 managed_transport_count=1 pt_binary_configured=true timeout_seconds=120 next_action=inspect-pt-or-bridge-diagnostics",
    ],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "prepare-network-or-bridge",
    retryable: true,
    waitCancellable: false,
    reason: "network-or-bridge-refresh-transport",
  });
});

test("real onion bootstrap cancel remains retryable without an active wait", () => {
  const result = {
    manual_network_permission_enabled: true,
    next_blocker: "ProfileABootstrapCancelled",
    blockers: ["BootstrapCancelled"],
    network_io_attempted: true,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };

  assert.deepEqual(productionTwoProfileRealOnionRecoveryPlan(result), {
    action: "bootstrap-cancelled",
    retryable: true,
    waitCancellable: false,
    reason: "network-bootstrap-cancelled",
  });
  assert.deepEqual(productionTwoProfileRealOnionUserView(result), {
    state: "Private delivery wait canceled",
    profiles: "Room is saved.",
    session: "Network wait canceled",
    message: "Retry private delivery when you are ready.",
    boundary: "No message was sent and the network wait was closed.",
  });
});

test("receive loop refresh plan reloads transcript for new imports and endpoint updates", () => {
  const mode = {
    lastProcessedImportSequence: 2,
    lastProcessedMessageImportCount: 1,
    lastProcessedEndpointUpdateCount: 0,
  };

  assert.deepEqual(
    productionOnionReceiveLoopRefreshPlan(mode, {
      import_sequence: 2,
      message_import_count: 1,
      endpoint_update_count: 0,
    }),
    {
      transcriptChanged: false,
      messageImported: false,
      endpointUpdated: false,
      newImportCount: 0,
      newMessageImportCount: 0,
      newEndpointUpdateCount: 0,
      importSequence: 2,
      messageImportCount: 1,
      endpointUpdateCount: 0,
    },
  );

  assert.deepEqual(
    productionOnionReceiveLoopRefreshPlan(mode, {
      import_sequence: 4,
      message_import_count: 2,
      endpoint_update_count: 1,
    }),
    {
      transcriptChanged: true,
      messageImported: true,
      endpointUpdated: true,
      newImportCount: 2,
      newMessageImportCount: 1,
      newEndpointUpdateCount: 1,
      importSequence: 4,
      messageImportCount: 2,
      endpointUpdateCount: 1,
    },
  );
});

test("room list metadata follows latest imported conversation entry", () => {
  const entries = [
    {
      sender: "alice",
      receiver: "bob",
      messageNumber: 1,
      message: "older outbound",
      createdAtMs: 100,
    },
    {
      sender: "bob",
      receiver: "alice",
      messageNumber: 2,
      message: "latest   receive\nimport",
      createdAtMs: 300,
    },
  ];

  assert.deepEqual(productionInviteRoomConversationMetadata(entries), {
    lastMessagePreview: "latest receive import",
    lastMessageAt: 300,
    messageCount: 2,
    retryableOutboundCount: 0,
    retryableOutboundMessageNumber: null,
    retryableOutboundMessage: "",
    retryableOutboundAction: "",
  });
  assert.equal(entries[0].messageNumber, 1);
});

test("room list metadata truncates long previews without losing message count", () => {
  const longMessage = "a".repeat(80);

  assert.deepEqual(
    productionInviteRoomConversationMetadata([
      {
        sender: "alice",
        receiver: "bob",
        messageNumber: 1,
        message: longMessage,
        createdAtMs: 200,
      },
    ]),
    {
      lastMessagePreview: `${"a".repeat(72)}...`,
      lastMessageAt: 200,
      messageCount: 1,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: null,
      retryableOutboundMessage: "",
      retryableOutboundAction: "",
    },
  );
});

test("room list metadata carries retryable outbound state", () => {
  assert.deepEqual(
    productionInviteRoomConversationMetadata([
      {
        sender: "alice",
        receiver: "bob",
        messageNumber: 3,
        message: "still saved",
        createdAtMs: 400,
        outboundDeliveryState: "failed",
        outboundFailureKind: "stored remote endpoint refresh required",
        outboundRetryable: true,
      },
      {
        sender: "alice",
        receiver: "bob",
        messageNumber: 2,
        message: "sent",
        createdAtMs: 300,
        outboundDeliveryState: "sent",
        outboundRetryable: true,
      },
      {
        sender: "alice",
        receiver: "bob",
        kind: "received",
        messageNumber: 1,
        message: "received copy",
        createdAtMs: 200,
        outboundDeliveryState: "failed",
        outboundRetryable: true,
      },
    ]),
    {
      lastMessagePreview: "still saved",
      lastMessageAt: 400,
      messageCount: 3,
      retryableOutboundCount: 1,
      retryableOutboundMessageNumber: 3,
      retryableOutboundMessage: "still saved",
      retryableOutboundAction: "refresh-and-retry",
    },
  );
});

test("room list metadata waits for failed state before saved retry", () => {
  assert.deepEqual(
    productionInviteRoomConversationMetadata([
      {
        sender: "alice",
        receiver: "bob",
        messageNumber: 3,
        message: "still pending",
        createdAtMs: 400,
        outboundDeliveryState: "pending",
        outboundRetryable: true,
      },
    ]),
    {
      lastMessagePreview: "still pending",
      lastMessageAt: 400,
      messageCount: 1,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: null,
      retryableOutboundMessage: "",
      retryableOutboundAction: "",
    },
  );
});

test("room list metadata collapses retried copies before counting retryable sends", () => {
  assert.deepEqual(
    productionInviteRoomConversationMetadata([
      {
        sender: "alice",
        receiver: "bob",
        kind: "sent",
        messageNumber: 1,
        message: "retried",
        createdAtMs: 400,
        outboundDeliveryState: "pending",
        outboundRetryable: true,
      },
      {
        sender: "alice",
        receiver: "bob",
        kind: "sent",
        messageNumber: 1,
        message: "retried",
        createdAtMs: 400,
        outboundDeliveryState: "failed",
        outboundRetryable: true,
      },
      {
        sender: "alice",
        receiver: "bob",
        kind: "sent",
        messageNumber: 1,
        message: "retried",
        createdAtMs: 400,
        outboundDeliveryState: "sent",
        outboundRetryable: false,
      },
    ]),
    {
      lastMessagePreview: "retried",
      lastMessageAt: 400,
      messageCount: 1,
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: null,
      retryableOutboundMessage: "",
      retryableOutboundAction: "",
    },
  );
});

test("manual received review stays tied to the selected pending row", () => {
  assert.equal(
    productionActionAvailability({
      busy: false,
      hasReceivedExportInput: true,
      selectedMessageInputMatches: false,
    }).exportReceivedMessage,
    false,
  );
  assert.equal(
    productionActionAvailability({
      busy: false,
      hasReceivedExportInput: true,
      selectedMessageInputMatches: true,
    }).exportReceivedMessage,
    true,
  );
});

test("manual check keeps imported message review before reply writing", () => {
  assert.equal(
    productionManualMessageCheckView({
      activeProfile: "bob",
      counterpartProfile: "alice",
      messageNumber: 1,
      selectedMessageInputMatches: true,
      hasImportedMessage: true,
      hasReceivedMessage: false,
      hasTwoProfileReplySelected: true,
    }),
    "Manual check: imported envelope is decrypted; click Show plaintext before writing the reply.",
  );
});

test("manual current action keeps pairing artifacts before message compose", () => {
  const relayPairingState = {
    hasProfileUnlockInput: true,
    hasLocalPairingPayload: true,
    counterpartProfile: "bob",
    sessionReadyForMessages: true,
  };
  assert.equal(productionManualNextActions(relayPairingState).pairing, "Next: click Relay pairing to peer.");
  assert.equal(
    productionManualCurrentStepView(relayPairingState),
    "Pairing | Next: click Relay pairing to peer.",
  );
  assert.equal(productionManualCurrentFocusTarget(relayPairingState), "relay-pairing");

  const finishSlotState = {
    hasProfileUnlockInput: true,
    hasRemoteHandshakeFinishSlot: true,
    sessionReadyForMessages: true,
  };
  assert.equal(productionManualNextActions(finishSlotState).pairing, "Next: click Fill remote finish.");
  assert.equal(
    productionManualCurrentStepView(finishSlotState),
    "Pairing | Next: click Fill remote finish.",
  );
  assert.equal(productionManualCurrentFocusTarget(finishSlotState), "load-handshake-finish");
});
