import * as privateDeliveryState from "./private-delivery-state.js";
import {
  productionInviteIdentityBoundaryView,
  productionTwoProfileOutboundStatusLabel,
  productionTwoProfileRealOnionRecoveryPlan,
} from "./action-state.js";

function fieldTestReportValue(value, fallback = "unknown") {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function fieldTestBoundaryValue(text, key, fallback = "none") {
  return privateDeliveryState.fieldTestBoundaryValue(text, key, fallback);
}

function fieldTestBoundarySummary(text) {
  return privateDeliveryState.fieldTestBoundarySummary(text);
}

function latestRealOnionBootstrapDiagnostic(result) {
  const events = Array.isArray(result?.event_summary) ? result.event_summary : [];
  const diagnostics = events.filter((event) => String(event).includes("bootstrap_diagnostic"));
  return diagnostics.at(-1) ?? "none";
}

function fieldTestRoomListNextAction(currentSavedRoom, outboundRecoveryAction, retryableOutbound, canUseRetryableOutbound) {
  if (canUseRetryableOutbound(currentSavedRoom?.action, currentSavedRoom?.actionOrigin)) {
    return retryableOutbound ? outboundRecoveryAction : "none";
  }
  if (currentSavedRoom?.action) {
    return currentSavedRoom?.action ?? "none";
  }
  return outboundRecoveryAction !== "none" ? outboundRecoveryAction : "none";
}

function manualRebuildDeliveryDiagnostics(input, boundaryText, manualRebuildFlowActive) {
  const manualRebuildFlow =
    manualRebuildFlowActive() ||
    fieldTestBoundaryValue(boundaryText, "manual_rebuild_flow", "false") === "true";
  const deliveryScope = fieldTestBoundaryValue(boundaryText, "delivery_scope", "none");
  const deliveryAction = fieldTestBoundaryValue(boundaryText, "delivery_action", "none");
  const activeDeliveryScope = manualRebuildFlow && deliveryScope !== "none";
  return {
    manualRebuildFlow,
    rebuiltRoomScoped:
      activeDeliveryScope && fieldTestBoundaryValue(boundaryText, "rebuilt_room_scoped", "false") === "true",
    deliveryScope: activeDeliveryScope ? deliveryScope : "none",
    deliveryAction: activeDeliveryScope ? deliveryAction : "none",
    retryScoped: activeDeliveryScope && fieldTestBoundaryValue(boundaryText, "retry_scoped", "false") === "true",
    receiveScoped: activeDeliveryScope && fieldTestBoundaryValue(boundaryText, "receive_scoped", "false") === "true",
    deliveryCodeExchangeScoped:
      activeDeliveryScope && fieldTestBoundaryValue(boundaryText, "delivery_code_exchange_scoped", "false") === "true",
    explicitPrivateDeliveryRequired:
      activeDeliveryScope && fieldTestBoundaryValue(boundaryText, "explicit_private_delivery_required", "false") === "true",
    networkIo: activeDeliveryScope && fieldTestBoundaryValue(boundaryText, "network_io", "false") === "true",
    liveNetworkAttempt:
      activeDeliveryScope && fieldTestBoundaryValue(boundaryText, "live_network_attempt", "false") === "true",
  };
}

export function createDiagnosticsReportController(input) {
  const { fields } = input;

  function buildFieldTestReport(roomInput = input.productionTwoProfileInput()) {
    const hasRoom = Boolean(
      roomInput.profileA && roomInput.profileB && roomInput.profileA !== roomInput.profileB && roomInput.passphrase,
    );
    const route = input.twoProfilePeerEndpointState(roomInput);
    const entries = [...input.productionTwoProfileConversationEntries.values()];
    const sentRows = entries.filter((entry) => entry.statuses?.has("sent")).length;
    const receivedRows = entries.filter((entry) => entry.statuses?.has("received")).length;
    const failedRows = entries.filter((entry) => entry.outboundDeliveryState === "failed").length;
    const canceledRows = entries.filter((entry) => entry.outboundDeliveryState === "canceled").length;
    const currentSavedRoom = input.currentSavedInviteRoomView(roomInput);
    const currentSavedRoomView = currentSavedRoom.view;
    const retryableOutbound = input.fieldTestRetryableOutboundEntry(roomInput, currentSavedRoom);
    const outboundFailureClass = retryableOutbound
      ? productionTwoProfileOutboundStatusLabel(retryableOutbound)
      : "none";
    const currentOutboundRecovery = retryableOutbound
      ? input.currentTwoProfileOutboundPrimaryAction(retryableOutbound, roomInput)
      : null;
    const outboundRecoveryAction = currentOutboundRecovery?.action ?? "none";
    const outboundRecoveryKey = currentOutboundRecovery?.recoveryKey ?? "none";
    const outboundRecoveryNoticeKey = currentOutboundRecovery?.noticeKey ?? "none";
    const receiveMode = input.fieldTestReceiveModeSnapshot(roomInput);
    const boundaryText = fields.productionTwoProfileBoundary?.textContent ?? "";
    const localRecoveryBoundaryText = input.localRecoveryDiagnosticsBoundaryText();
    const localRecoveryAction = fieldTestBoundaryValue(localRecoveryBoundaryText, "local_recovery", "none");
    const localRecoveryFallback = fieldTestBoundaryValue(localRecoveryBoundaryText, "recovery", "none");
    const rollbackSuspicion =
      fieldTestBoundaryValue(localRecoveryBoundaryText, "rollback_suspicion", "false") === "true";
    const resumeBlocked = fieldTestBoundaryValue(localRecoveryBoundaryText, "resume_blocked", "false") === "true";
    const rebuildDeliveryDiagnostics = manualRebuildDeliveryDiagnostics(
      roomInput,
      boundaryText,
      input.manualInviteRoomRebuildFlowActive,
    );
    const sendAttemptBoundaryText = fields.onionOutboundEnvelopeSendAttempt?.textContent ?? "";
    const receiveFailureKind = receiveMode.ownerCurrentRoom ? fieldTestBoundaryValue(boundaryText, "failure") : "none";
    const realOnionResult = input.latestRealOnionFieldTestResult(roomInput);
    const bridgeStatus = input.latestProductionOnionBridgeConfigStatus();
    const bridgeCapableBuild =
      realOnionResult?.bridge_capable_build === true || bridgeStatus?.bridge_capable_build === true;
    const bridgeConfiguredForBootstrap =
      bridgeStatus
        ? bridgeStatus.bridge_configured_for_bootstrap === true
        : realOnionResult?.bridge_configured_for_bootstrap === true;
    const bridgeConfigState = bridgeStatus
      ? bridgeStatus.bridge_config_state
      : realOnionResult?.bridge_configured_for_bootstrap === true
        ? "configured"
        : realOnionResult?.bridge_config_state;
    const bridgeConfigNextAction = bridgeStatus
      ? bridgeStatus.bridge_config_next_action
      : realOnionResult?.bridge_configured_for_bootstrap === true
        ? "retry-network"
        : realOnionResult?.bridge_config_next_action;
    const realOnionBlockers = Array.isArray(realOnionResult?.blockers)
      ? realOnionResult.blockers.join("#")
      : "none";
    const realOnionRecovery = productionTwoProfileRealOnionRecoveryPlan(realOnionResult);
    const realOnionExternalPeerDeliveryConfirmed =
      privateDeliveryState.realOnionResultConfirmsExternalPeerDelivery(realOnionResult);
    const realOnionWaitCancelled = input.realOnionWaitCanceledForInput(roomInput);
    const highRiskRuntimeEvidence =
      input.latestProductionHighRiskRuntimeEvidenceView() ?? input.productionHighRiskRuntimeEvidenceGateView();
    const deliveryNoticeCurrentRoom = input.latestChatDeliveryNoticeKey()
      ? input.chatDeliveryNoticeMatchesInput(roomInput)
      : false;
    const deliveryNoticeKey = deliveryNoticeCurrentRoom ? input.latestChatDeliveryNoticeKey() : "none";
    const deliveryNoticeTone = deliveryNoticeCurrentRoom ? input.latestChatDeliveryNoticeTone() : "neutral";
    const routeReadiness = input.externalPeerSendReadiness(roomInput, {
      allowMissingMessage: true,
      latestOnionOutbound: null,
    });
    const routeReadinessBlocked = routeReadiness.ready !== true;
    const routeReadinessNextAction = routeReadinessBlocked ? routeReadiness.nextAction : "none";
    const routeReadinessFailureKind = routeReadinessBlocked ? routeReadiness.failureKind : "none";
    const routeReadinessNoticeKey = routeReadinessBlocked ? routeReadiness.noticeKey : "none";
    const composerNextAction = !retryableOutbound && routeReadiness.ready === true
      ? roomInput.message
        ? "send-message"
        : "write-message"
      : "none";
    const inviteIdentityBoundary = productionInviteIdentityBoundaryView(roomInput);
    const roomListNextAction = fieldTestRoomListNextAction(
      currentSavedRoom,
      outboundRecoveryAction,
      retryableOutbound,
      input.savedInviteRoomActionCanUseRetryableOutbound,
    );

    const reportLines = [
      "Another Dimension Chat beta field test report",
      "report_version=1",
      `app_version=${input.FIELD_TEST_APP_VERSION}`,
      `build_channel=${input.FIELD_TEST_BUILD_CHANNEL}`,
      `build_commit=${input.FIELD_TEST_BUILD_COMMIT}`,
      `language=${fieldTestReportValue(input.currentLanguage())}`,
      `room_present=${hasRoom}`,
      `session_ready=${input.twoProfileSessionsReadyForInput(roomInput)}`,
      `safety_confirmed=${input.twoProfileSafetyConfirmedForInput(roomInput)}`,
      `accountless_invite_boundary=${fieldTestReportValue(inviteIdentityBoundary)}`,
      `manual_network_permission=${input.manualNetworkPermissionEnabled()}`,
      `route_ready=${route.ready === true}`,
      `route_stale=${route.stale === true}`,
      `route_source=${fieldTestReportValue(route.source)}`,
      `route_reason=${fieldTestReportValue(route.reason)}`,
      `route_readiness_ready=${routeReadiness.ready === true}`,
      `route_readiness_next_action=${fieldTestReportValue(routeReadinessNextAction, "none")}`,
      `route_readiness_failure_kind=${fieldTestReportValue(routeReadinessFailureKind, "none")}`,
      `route_readiness_notice_key=${fieldTestReportValue(routeReadinessNoticeKey, "none")}`,
      `composer_next_action=${fieldTestReportValue(composerNextAction, "none")}`,
      `receive_owner_current_room=${receiveMode.ownerCurrentRoom === true}`,
      `receive_enabled=${receiveMode.enabled === true}`,
      `receive_stop_requested=${receiveMode.stopRequested === true}`,
      `receive_state=${fieldTestReportValue(receiveMode.runtimeState, "stopped")}`,
      `receive_in_flight=${receiveMode.inFlight === true}`,
      `receive_attempts=${Number.parseInt(receiveMode.attempt ?? 0, 10) || 0}`,
      `receive_message_imports=${Number.parseInt(receiveMode.lastProcessedMessageImportCount ?? 0, 10) || 0}`,
      `receive_endpoint_updates=${Number.parseInt(receiveMode.lastProcessedEndpointUpdateCount ?? 0, 10) || 0}`,
      `conversation_rows=${entries.length}`,
      `sent_rows=${sentRows}`,
      `received_rows=${receivedRows}`,
      `failed_outbound_rows=${failedRows}`,
      `canceled_outbound_rows=${canceledRows}`,
      `retryable_outbound_present=${Boolean(retryableOutbound)}`,
      `outbound_failure_class=${fieldTestReportValue(outboundFailureClass, "none")}`,
      `outbound_recovery_action=${fieldTestReportValue(outboundRecoveryAction, "none")}`,
      `outbound_recovery_key=${fieldTestReportValue(outboundRecoveryKey, "none")}`,
      `outbound_recovery_notice_key=${fieldTestReportValue(outboundRecoveryNoticeKey, "none")}`,
      `room_list_state_key=${fieldTestReportValue(currentSavedRoomView?.state?.key, "none")}`,
      `room_list_state_label=${fieldTestReportValue(currentSavedRoomView?.state?.label, "none")}`,
      `room_list_next_action=${fieldTestReportValue(roomListNextAction, "none")}`,
      `room_list_next_origin=${fieldTestReportValue(currentSavedRoom.actionOrigin, "none")}`,
      `receive_failure_kind=${fieldTestReportValue(receiveFailureKind, "none")}`,
      `real_onion_attempted=${Boolean(realOnionResult)}`,
      `real_onion_next_blocker=${fieldTestReportValue(realOnionResult?.next_blocker, "none")}`,
      `real_onion_blockers=${fieldTestReportValue(realOnionBlockers, "none")}`,
      `real_onion_recovery_action=${fieldTestReportValue(realOnionRecovery.action, "none")}`,
      `real_onion_recovery_reason=${fieldTestReportValue(realOnionRecovery.reason, "none")}`,
      `real_onion_retryable=${realOnionRecovery.retryable === true}`,
      `real_onion_wait_cancellable=${realOnionRecovery.waitCancellable === true}`,
      `real_onion_wait_cancelled=${realOnionWaitCancelled === true}`,
      `real_onion_bridge_capable_build=${bridgeCapableBuild}`,
      `real_onion_bridge_configured_for_bootstrap=${bridgeConfiguredForBootstrap}`,
      `real_onion_bridge_config_state=${fieldTestReportValue(bridgeConfigState, "unknown")}`,
      `real_onion_bridge_config_next_action=${fieldTestReportValue(bridgeConfigNextAction, "unknown")}`,
      `real_onion_bootstrap_retry_limit=${Number.parseInt(realOnionResult?.bootstrap_retry_limit ?? 0, 10) || 0}`,
      `real_onion_profile_a_bootstrap_attempts=${Number.parseInt(realOnionResult?.profile_a_bootstrap_attempts ?? 0, 10) || 0}`,
      `real_onion_profile_b_bootstrap_attempts=${Number.parseInt(realOnionResult?.profile_b_bootstrap_attempts ?? 0, 10) || 0}`,
      `real_onion_bootstrap_diagnostic=${fieldTestReportValue(latestRealOnionBootstrapDiagnostic(realOnionResult), "none")}`,
      `real_onion_profile_a_bootstrap_reused=${realOnionResult?.profile_a_bootstrap_reused === true}`,
      `real_onion_profile_b_bootstrap_reused=${realOnionResult?.profile_b_bootstrap_reused === true}`,
      `real_onion_external_peer_delivery_confirmed=${realOnionExternalPeerDeliveryConfirmed}`,
      `real_onion_local_dev_roundtrip_result=${realOnionResult?.local_dev_roundtrip_result === true}`,
      `room_runtime_promoted_from_real_onion_cache=${fieldTestBoundaryValue(boundaryText, "promoted_cache") === "true"}`,
      `room_runtime_owner_profile_bound=${fieldTestBoundaryValue(boundaryText, "owner_profile_bound") === "true"}`,
      `room_runtime_owner_matches_receive_profile=${fieldTestBoundaryValue(boundaryText, "owner_matches_receive") === "true"}`,
      `send_runtime_owner_profile_bound=${fieldTestBoundaryValue(sendAttemptBoundaryText, "owner_profile_bound") === "true"}`,
      `send_runtime_owner_matches_send_profile=${fieldTestBoundaryValue(sendAttemptBoundaryText, "owner_matches_send") === "true"}`,
      `local_recovery_action=${fieldTestReportValue(localRecoveryAction !== "none" ? localRecoveryAction : localRecoveryFallback, "none")}`,
      `rollback_suspicion=${rollbackSuspicion}`,
      `resume_blocked=${resumeBlocked}`,
      `real_onion_network_io=${realOnionResult?.network_io_attempted === true}`,
      `real_onion_transport_io=${realOnionResult?.transport_io_opened === true}`,
      `real_onion_runtime=${realOnionResult?.runtime_messaging_enabled === true}`,
      `high_risk_runtime_evidence_source=${fieldTestReportValue(highRiskRuntimeEvidence.evidenceSource, "absent")}`,
      `high_risk_runtime_evidence_accepted=${highRiskRuntimeEvidence.accepted === true}`,
      `high_risk_runtime_evidence_present=${highRiskRuntimeEvidence.runtimeEvidencePresent === true}`,
      `high_risk_runtime_primary_blocker=${fieldTestReportValue(highRiskRuntimeEvidence.primaryBlocker, "none")}`,
      `high_risk_runtime_failure_class=${fieldTestReportValue(highRiskRuntimeEvidence.failureClass, "none")}`,
      `high_risk_public_claim_allowed=${highRiskRuntimeEvidence.highRiskPublicClaimAllowed === true}`,
      `high_risk_ready_claim_allowed=${highRiskRuntimeEvidence.highRiskReadyClaimAllowed === true}`,
      ...input.engineSidecarDiagnosticReportLines(),
      `delivery_notice_current_room=${deliveryNoticeCurrentRoom}`,
      `delivery_notice_key=${fieldTestReportValue(deliveryNoticeKey, "none")}`,
      `delivery_notice_tone=${fieldTestReportValue(deliveryNoticeTone, "neutral")}`,
      `manual_rebuild_flow=${rebuildDeliveryDiagnostics.manualRebuildFlow === true}`,
      `rebuild_room_scoped=${rebuildDeliveryDiagnostics.rebuiltRoomScoped === true}`,
      `rebuild_delivery_scope=${fieldTestReportValue(rebuildDeliveryDiagnostics.deliveryScope, "none")}`,
      `rebuild_delivery_action=${fieldTestReportValue(rebuildDeliveryDiagnostics.deliveryAction, "none")}`,
      `rebuild_retry_scoped=${rebuildDeliveryDiagnostics.retryScoped === true}`,
      `rebuild_receive_scoped=${rebuildDeliveryDiagnostics.receiveScoped === true}`,
      `rebuild_delivery_code_exchange_scoped=${rebuildDeliveryDiagnostics.deliveryCodeExchangeScoped === true}`,
      `rebuild_explicit_private_delivery_required=${rebuildDeliveryDiagnostics.explicitPrivateDeliveryRequired === true}`,
      `rebuild_delivery_network_io=${rebuildDeliveryDiagnostics.networkIo === true}`,
      `rebuild_delivery_live_network_attempt=${rebuildDeliveryDiagnostics.liveNetworkAttempt === true}`,
      "rebuild_external_peer_evidence_claim=false",
      `ui_state=${fieldTestReportValue(fields.productionTwoProfileState?.textContent)}`,
      `redacted_boundary=${fieldTestBoundarySummary(boundaryText)}`,
    ];
    return [...reportLines, ...input.localRehearsalReportLines(reportLines.join("\n"))].join("\n");
  }

  function refreshPublicBetaDiagnostics(report) {
    if (!fields.publicBetaDiagnostics) {
      return "";
    }
    const payload = privateDeliveryState.publicBetaDiagnosticsReport(report, { includeCopyBoundary: true });
    fields.publicBetaDiagnostics.value = payload;
    const publicDiagnostics = privateDeliveryState.parseFieldTestReport(payload);
    const desktopCompletion = privateDeliveryState.desktopFirstCompletionStatus(report);
    const failureClass = fieldTestReportValue(publicDiagnostics.failure_class, "none");
    const recoveryNextAction = fieldTestReportValue(publicDiagnostics.recovery_next_action, "none");
    const copyNextAction = fieldTestReportValue(publicDiagnostics.diagnostics_copy_next_action, "none");
    const desktopAcceptanceNextAction = fieldTestReportValue(publicDiagnostics.desktop_acceptance_next_action, "none");
    const localManualE2eeBoundary = fieldTestReportValue(publicDiagnostics.local_manual_e2ee_runtime_boundary, "unknown");
    const supportedLocalManualE2eeReady = fieldTestReportValue(publicDiagnostics.supported_local_manual_e2ee_ready, "false");
    const supportedLocalManualE2eeScope = fieldTestReportValue(publicDiagnostics.supported_local_manual_e2ee_scope, "unknown");
    const productionE2eeReady = fieldTestReportValue(publicDiagnostics.production_e2ee_ready, "false");
    const supportedLocalKeyLifecycleReady = fieldTestReportValue(publicDiagnostics.supported_local_key_lifecycle_ready, "false");
    const supportedLocalKeyLifecycleScope = fieldTestReportValue(publicDiagnostics.supported_local_key_lifecycle_scope, "unknown");
    const supportedRollbackDetectionReady = fieldTestReportValue(publicDiagnostics.supported_rollback_detection_ready, "false");
    const supportedRollbackDetectionScope = fieldTestReportValue(publicDiagnostics.supported_rollback_detection_scope, "unknown");
    const supportedLocalDeletionScopeReady = fieldTestReportValue(publicDiagnostics.supported_local_deletion_scope_ready, "false");
    const supportedLocalDeletionScope = fieldTestReportValue(publicDiagnostics.supported_local_deletion_scope, "unknown");
    const productionKeyManagementReady = fieldTestReportValue(publicDiagnostics.production_key_management_ready, "false");
    const rollbackPreventionClaimed = fieldTestReportValue(publicDiagnostics.rollback_prevention_claimed, "false");
    const secureDeletionClaimAllowed = fieldTestReportValue(publicDiagnostics.secure_deletion_claim_allowed, "false");
    const defaultTransportPath = fieldTestReportValue(
      publicDiagnostics.default_transport_path,
      "local-manual-encrypted-envelope-exchange",
    );
    const supportedDefaultTransportReady = fieldTestReportValue(
      publicDiagnostics.supported_default_transport_ready,
      "false",
    );
    const supportedDefaultTransportScope = fieldTestReportValue(
      publicDiagnostics.supported_default_transport_scope,
      "unknown",
    );
    const defaultTransportNetworkIo = fieldTestReportValue(publicDiagnostics.default_transport_network_io, "false");
    const productionTransportReady = fieldTestReportValue(publicDiagnostics.production_transport_ready, "false");
    const reliableExternalDeliveryClaimAllowed = fieldTestReportValue(
      publicDiagnostics.reliable_external_delivery_claim_allowed,
      "false",
    );
    const supportedOwnerObservedUsabilityRehearsalReady = fieldTestReportValue(
      publicDiagnostics.supported_owner_observed_usability_rehearsal_ready,
      "false",
    );
    const supportedUsabilityRecoveryScope = fieldTestReportValue(
      publicDiagnostics.supported_usability_recovery_scope,
      "unknown",
    );
    const criticalDesktopTaskScriptReady = fieldTestReportValue(
      publicDiagnostics.critical_desktop_task_script_ready,
      "false",
    );
    const recoveryVocabularyAligned = fieldTestReportValue(
      publicDiagnostics.recovery_vocabulary_aligned,
      "false",
    );
    const usabilityStudyCompleted = fieldTestReportValue(
      publicDiagnostics.usability_study_completed,
      "false",
    );
    const productionWordingReady = fieldTestReportValue(publicDiagnostics.production_wording_ready, "false");
    const highRiskTransportMode = fieldTestReportValue(publicDiagnostics.high_risk_transport_mode, "onion-only");
    const highRiskTransportReady = fieldTestReportValue(publicDiagnostics.high_risk_transport_ready, "false");
    const highRiskTransportNotReadyReason = fieldTestReportValue(
      publicDiagnostics.high_risk_transport_not_ready_reason,
      "runtime-network-disabled-until-explicit-user-action",
    );
    const highRiskRuntimeEvidenceSource = fieldTestReportValue(
      publicDiagnostics.high_risk_runtime_evidence_source,
      "absent",
    );
    const highRiskRuntimeEvidenceAccepted = fieldTestReportValue(
      publicDiagnostics.high_risk_runtime_evidence_accepted,
      "false",
    );
    const highRiskRuntimePrimaryBlocker = fieldTestReportValue(
      publicDiagnostics.high_risk_runtime_primary_blocker,
      "none",
    );
    const highRiskRuntimeFailureClass = fieldTestReportValue(
      publicDiagnostics.high_risk_runtime_failure_class,
      "none",
    );
    const engineSidecarStatusRuntimeChecked = fieldTestReportValue(
      publicDiagnostics.engine_sidecar_status_runtime_checked,
      "false",
    );
    const engineSidecarStatusFailureClass = fieldTestReportValue(
      publicDiagnostics.engine_sidecar_status_failure_class,
      "unknown",
    );
    const engineSidecarManualSelfTestRuntimeChecked = fieldTestReportValue(
      publicDiagnostics.engine_sidecar_manual_self_test_runtime_checked,
      "false",
    );
    const engineSidecarManualSelfTestFailureClass = fieldTestReportValue(
      publicDiagnostics.engine_sidecar_manual_self_test_failure_class,
      "unknown",
    );
    const engineSidecarManualSelfTestPassed = fieldTestReportValue(
      publicDiagnostics.engine_sidecar_manual_self_test_passed,
      "false",
    );
    const engineSidecarRawPathReturned = fieldTestReportValue(
      publicDiagnostics.engine_sidecar_raw_path_returned,
      "false",
    );
    const engineSidecarStdoutReturned = fieldTestReportValue(
      publicDiagnostics.engine_sidecar_stdout_returned,
      "false",
    );
    const engineSidecarStderrReturned = fieldTestReportValue(
      publicDiagnostics.engine_sidecar_stderr_returned,
      "false",
    );
    const allowedPublicIntakeFields =
      String(publicDiagnostics.allowed_public_intake_fields ?? "unknown").trim() || "unknown";
    const forbiddenPublicIntakeFields =
      String(publicDiagnostics.forbidden_public_intake_fields ?? "unknown").trim() || "unknown";
    const publicIntakePolicyVersion = fieldTestReportValue(
      publicDiagnostics.public_intake_policy_version,
      "unknown",
    );
    const publicIntakePolicyAlignment = fieldTestReportValue(
      publicDiagnostics.public_intake_policy_alignment,
      "unknown",
    );
    const excludedFields = String(publicDiagnostics.excluded_fields ?? "unknown").trim() || "unknown";
    const payloadNextActionMatchesSummary =
      recoveryNextAction === copyNextAction && recoveryNextAction === desktopAcceptanceNextAction;
    const rawStateExcluded =
      publicDiagnostics.diagnostics_copy_boundary === "redacted-status-build-failure-class-recovery-action-only";
    const publicIntakePolicyFieldsAligned =
      publicDiagnostics.public_intake_policy_fields_aligned === "true" &&
      publicIntakePolicyAlignment === "app-diagnostics#github-issue-template#reference-policy" &&
      allowedPublicIntakeFields.includes("failure-class") &&
      allowedPublicIntakeFields.includes("recovery-next-action") &&
      forbiddenPublicIntakeFields.includes("raw-logs") &&
      forbiddenPublicIntakeFields.includes("endpoints") &&
      forbiddenPublicIntakeFields.includes("invite-codes") &&
      forbiddenPublicIntakeFields.includes("message-text") &&
      forbiddenPublicIntakeFields.includes("local-paths") &&
      forbiddenPublicIntakeFields.includes("payloads") &&
      forbiddenPublicIntakeFields.includes("passphrases") &&
      forbiddenPublicIntakeFields.includes("key-material") &&
      excludedFields.includes("logs") &&
      excludedFields.includes("passphrases") &&
      excludedFields.includes("key_material");
    if (fields.publicBetaDiagnosticsSummary) {
      fields.publicBetaDiagnosticsSummary.textContent = `public diagnostics generated failure_class=${failureClass} recovery_next_action=${recoveryNextAction} payload_next_action_match=${payloadNextActionMatchesSummary} raw_state_excluded=${rawStateExcluded} public_intake_policy_version=${publicIntakePolicyVersion} public_intake_policy_alignment=${publicIntakePolicyAlignment} public_intake_policy_fields_aligned=${publicIntakePolicyFieldsAligned} allowed_public_intake_fields=${allowedPublicIntakeFields} forbidden_public_intake_fields=${forbiddenPublicIntakeFields} excluded_fields=${excludedFields} desktop_completion=${desktopCompletion.status} desktop_blockers=${desktopCompletion.blockerSummary} local_manual_e2ee_runtime_boundary=${localManualE2eeBoundary} supported_local_manual_e2ee_ready=${supportedLocalManualE2eeReady} supported_local_manual_e2ee_scope=${supportedLocalManualE2eeScope} production_e2ee_ready=${productionE2eeReady} supported_local_key_lifecycle_ready=${supportedLocalKeyLifecycleReady} supported_local_key_lifecycle_scope=${supportedLocalKeyLifecycleScope} supported_rollback_detection_ready=${supportedRollbackDetectionReady} supported_rollback_detection_scope=${supportedRollbackDetectionScope} supported_local_deletion_scope_ready=${supportedLocalDeletionScopeReady} supported_local_deletion_scope=${supportedLocalDeletionScope} production_key_management_ready=${productionKeyManagementReady} rollback_prevention_claimed=${rollbackPreventionClaimed} secure_deletion_claim_allowed=${secureDeletionClaimAllowed} default_transport_path=${defaultTransportPath} supported_default_transport_ready=${supportedDefaultTransportReady} supported_default_transport_scope=${supportedDefaultTransportScope} default_transport_network_io=${defaultTransportNetworkIo} production_transport_ready=${productionTransportReady} reliable_external_delivery_claim_allowed=${reliableExternalDeliveryClaimAllowed} supported_owner_observed_usability_rehearsal_ready=${supportedOwnerObservedUsabilityRehearsalReady} supported_usability_recovery_scope=${supportedUsabilityRecoveryScope} critical_desktop_task_script_ready=${criticalDesktopTaskScriptReady} recovery_vocabulary_aligned=${recoveryVocabularyAligned} usability_study_completed=${usabilityStudyCompleted} production_wording_ready=${productionWordingReady} high_risk_onion_path=explicit-user-triggered-fail-closed high_risk_transport_mode=${highRiskTransportMode} high_risk_transport_ready=${highRiskTransportReady} high_risk_transport_not_ready_reason=${highRiskTransportNotReadyReason} high_risk_runtime_evidence_source=${highRiskRuntimeEvidenceSource} high_risk_runtime_evidence_accepted=${highRiskRuntimeEvidenceAccepted} high_risk_runtime_primary_blocker=${highRiskRuntimePrimaryBlocker} high_risk_runtime_failure_class=${highRiskRuntimeFailureClass} engine_sidecar_status_runtime_checked=${engineSidecarStatusRuntimeChecked} engine_sidecar_status_failure_class=${engineSidecarStatusFailureClass} engine_sidecar_manual_self_test_runtime_checked=${engineSidecarManualSelfTestRuntimeChecked} engine_sidecar_manual_self_test_failure_class=${engineSidecarManualSelfTestFailureClass} engine_sidecar_manual_self_test_passed=${engineSidecarManualSelfTestPassed} engine_sidecar_raw_path_returned=${engineSidecarRawPathReturned} engine_sidecar_stdout_returned=${engineSidecarStdoutReturned} engine_sidecar_stderr_returned=${engineSidecarStderrReturned} engine_sidecar_local_runtime_promoted_to_delivery_proof=false high_risk_transport_direct_fallback=false high_risk_transport_dns_endpoint=false high_risk_transport_ip_endpoint=false high_risk_transport_app_launch_bootstrap=false high_risk_public_claim_allowed=false high_risk_ready_claim_allowed=false release_non_claims=unsigned-experimental-public-beta#not-audited#not-production-ready#sensitive-communication-prohibited non_claims=external-onion-delivery#production-messaging#security-ready#sensitive-communication support_bundle_export=false audit_evidence_claim=false external_delivery_evidence_claim=false security_ready_proof_claim=false windows_public_artifact=false windows_blocker=local-build-smoke-and-release-boundary-review app_launch_network=false`;
    }
    return payload;
  }

  return { buildFieldTestReport, refreshPublicBetaDiagnostics };
}
