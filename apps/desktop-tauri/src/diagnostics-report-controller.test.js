import assert from "node:assert/strict";
import test from "node:test";
import { createDiagnosticsReportController } from "./diagnostics-report-controller.js";

function createReportHarness() {
  const fields = {
    productionTwoProfileBoundary: { textContent: "failure=none manual_rebuild_flow=false" },
    productionProfileBoundary: { textContent: "rollback_suspicion=false" },
    productionProfileStorage: { textContent: "resume_blocked=false" },
    productionDataLifecycle: { textContent: "local_recovery=none" },
    onionOutboundEnvelopeSendAttempt: { textContent: "owner_profile_bound=true owner_matches_send=true" },
    productionTwoProfileState: { textContent: "Room ready" },
    publicBetaDiagnostics: { value: "" },
    publicBetaDiagnosticsSummary: { textContent: "" },
  };
  return createDiagnosticsReportController({
    fields,
    FIELD_TEST_APP_VERSION: "test-version",
    FIELD_TEST_BUILD_CHANNEL: "test-channel",
    FIELD_TEST_BUILD_COMMIT: "test-commit",
    currentLanguage: () => "en",
    productionTwoProfileInput: () => ({
      profileA: "alice",
      profileB: "bob",
      passphrase: "room",
      message: "",
    }),
    productionTwoProfileConversationEntries: new Map([
      ["1", { statuses: new Set(["sent"]), outboundDeliveryState: "sent" }],
      ["2", { statuses: new Set(["received"]), outboundDeliveryState: "received" }],
    ]),
    twoProfilePeerEndpointState: () => ({ ready: true, stale: false, source: "local", reason: "ready" }),
    currentSavedInviteRoomView: () => ({ view: { state: { key: "ready", label: "Ready" } }, action: "", actionOrigin: "" }),
    fieldTestRetryableOutboundEntry: () => null,
    currentTwoProfileOutboundPrimaryAction: () => null,
    fieldTestReceiveModeSnapshot: () => ({
      ownerCurrentRoom: true,
      enabled: false,
      stopRequested: false,
      runtimeState: "stopped",
      inFlight: false,
      attempt: 0,
      lastProcessedMessageImportCount: 0,
      lastProcessedEndpointUpdateCount: 0,
    }),
    localRecoveryDiagnosticsBoundaryText: () => "local_recovery=none rollback_suspicion=false resume_blocked=false",
    manualInviteRoomRebuildFlowActive: () => false,
    latestRealOnionFieldTestResult: () => null,
    latestProductionOnionBridgeConfigStatus: () => null,
    realOnionWaitCanceledForInput: () => false,
    latestProductionHighRiskRuntimeEvidenceView: () => null,
    productionHighRiskRuntimeEvidenceGateView: () => ({
      evidenceSource: "absent",
      accepted: false,
      runtimeEvidencePresent: false,
      primaryBlocker: "none",
      failureClass: "none",
      highRiskPublicClaimAllowed: false,
      highRiskReadyClaimAllowed: false,
    }),
    latestChatDeliveryNoticeKey: () => "",
    latestChatDeliveryNoticeTone: () => "neutral",
    chatDeliveryNoticeMatchesInput: () => false,
    externalPeerSendReadiness: () => ({ ready: true }),
    engineSidecarDiagnosticReportLines: () => ["engine_sidecar_status_runtime_checked=false"],
    localRehearsalReportLines: () => ["local_rehearsal_ready=false"],
    manualNetworkPermissionEnabled: () => false,
    twoProfileSessionsReadyForInput: () => true,
    twoProfileSafetyConfirmedForInput: () => false,
    savedInviteRoomActionCanUseRetryableOutbound: () => false,
  });
}

test("buildFieldTestReport assembles room and diagnostics fields", () => {
  const controller = createReportHarness();

  const report = controller.buildFieldTestReport();

  assert.match(report, /app_version=test-version/);
  assert.match(report, /room_present=true/);
  assert.match(report, /session_ready=true/);
  assert.match(report, /conversation_rows=2/);
  assert.match(report, /send_runtime_owner_matches_send_profile=true/);
  assert.match(report, /engine_sidecar_status_runtime_checked=false/);
  assert.match(report, /local_rehearsal_ready=false/);
});

test("refreshPublicBetaDiagnostics updates the public diagnostics payload and summary", () => {
  const fields = {
    publicBetaDiagnostics: { value: "" },
    publicBetaDiagnosticsSummary: { textContent: "" },
  };
  const controller = createDiagnosticsReportController({ fields });
  const payload = controller.refreshPublicBetaDiagnostics(
    [
      "failure_class=blocked",
      "recovery_next_action=retry-network",
      "desktop_acceptance_next_action=retry-network",
      "diagnostics_copy_next_action=retry-network",
      "allowed_public_intake_fields=failure-class,recovery-next-action",
      "forbidden_public_intake_fields=raw-logs,endpoints,invite-codes,message-text,local-paths,payloads,passphrases,key-material",
      "excluded_fields=logs passphrases key_material",
    ].join("\n"),
  );

  assert.equal(typeof payload, "string");
  assert.equal(fields.publicBetaDiagnostics.value, payload);
  assert.match(fields.publicBetaDiagnosticsSummary.textContent, /public diagnostics generated/);
  assert.match(fields.publicBetaDiagnosticsSummary.textContent, /failure_class=/);
  assert.match(fields.publicBetaDiagnosticsSummary.textContent, /recovery_next_action=/);
});
