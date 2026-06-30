import assert from "node:assert/strict";
import test from "node:test";
import * as diagnostics from "./diagnostics.js";
const {
  createDesktopPanelController,
  createDiagnosticsCopyController,
  createDiagnosticsReportController,
  createEngineSidecarDiagnosticsController
} = diagnostics;

(() => {
function createButton() {
  return {
    listeners: new Map(),
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
  };
}

function createField() {
  return {
    value: "",
    focused: false,
    selected: false,
    focus() {
      this.focused = true;
    },
    select() {
      this.selected = true;
    },
  };
}

test("copyFieldTestReport falls back to selecting the payload", async () => {
  const fields = {
    fieldTestReport: createField(),
    productionTwoProfileWarning: {},
  };
  let state = "";
  let warning = "";
  const controller = createDiagnosticsCopyController({
    fields,
    t: (key) => key,
    updateEngineSidecarDiagnostics: async () => {},
    refreshFieldTestReport: () => "field-report",
    refreshPublicBetaDiagnostics: () => "",
    renderRedactedSupportReport: () => ({ payload: "" }),
    fieldTestReportCopyPayload: (report) => `${report}\ncopy-boundary`,
    writeClipboardWithTtl: async () => {
      throw new Error("clipboard denied");
    },
    setProductionTwoProfileState: (value) => {
      state = value;
    },
    setText: (_node, value) => {
      warning = value;
    },
    renderFieldTestReportComparison: () => {},
  });

  const copied = await controller.copyFieldTestReport();

  assert.equal(copied, false);
  assert.equal(fields.fieldTestReport.value, "field-report\ncopy-boundary");
  assert.equal(fields.fieldTestReport.focused, true);
  assert.equal(fields.fieldTestReport.selected, true);
  assert.equal(state, "Field test report selected");
  assert.equal(warning, "fieldTestReportCopyFallback");
});

test("copyPublicBetaDiagnostics refreshes runtime diagnostics before copying", async () => {
  const fields = {
    publicBetaDiagnostics: createField(),
    productionTwoProfileWarning: {},
  };
  const calls = [];
  const controller = createDiagnosticsCopyController({
    fields,
    t: (key) => key,
    updateEngineSidecarDiagnostics: async () => {
      calls.push("updateEngineSidecarDiagnostics");
    },
    refreshFieldTestReport: () => "",
    refreshPublicBetaDiagnostics: () => {
      calls.push("refreshPublicBetaDiagnostics");
      return "public-diagnostics";
    },
    renderRedactedSupportReport: () => ({ payload: "" }),
    fieldTestReportCopyPayload: (report) => report,
    writeClipboardWithTtl: async (value) => {
      calls.push(`writeClipboardWithTtl:${value}`);
    },
    setProductionTwoProfileState: (value) => {
      calls.push(`state:${value}`);
    },
    setText: (_node, value) => {
      calls.push(`warning:${value}`);
    },
    renderFieldTestReportComparison: () => {},
  });

  const copied = await controller.copyPublicBetaDiagnostics();

  assert.equal(copied, true);
  assert.deepEqual(calls, [
    "updateEngineSidecarDiagnostics",
    "refreshPublicBetaDiagnostics",
    "writeClipboardWithTtl:public-diagnostics",
    "state:Public diagnostics copied",
    "warning:publicBetaDiagnosticsCopied",
  ]);
});

test("copyRedactedSupportReport renders a report when the field is empty", async () => {
  const fields = {
    redactedSupportReport: createField(),
    productionTwoProfileWarning: {},
  };
  let rendered = 0;
  const controller = createDiagnosticsCopyController({
    fields,
    t: (key) => key,
    updateEngineSidecarDiagnostics: async () => {},
    refreshFieldTestReport: () => "",
    refreshPublicBetaDiagnostics: () => "",
    renderRedactedSupportReport: () => {
      rendered += 1;
      return { payload: "redacted-payload" };
    },
    fieldTestReportCopyPayload: (report) => report,
    writeClipboardWithTtl: async () => {},
    setProductionTwoProfileState: () => {},
    setText: () => {},
    renderFieldTestReportComparison: () => {},
  });

  const copied = await controller.copyRedactedSupportReport();

  assert.equal(copied, true);
  assert.equal(rendered, 1);
});

test("bindDiagnosticsCopyControls wires refresh, copy, and peer comparison handlers", () => {
  const fields = {
    refreshFieldTestReport: createButton(),
    copyFieldTestReport: createButton(),
    refreshPublicBetaDiagnostics: createButton(),
    copyPublicBetaDiagnostics: createButton(),
    copyRedactedSupportReport: createButton(),
    peerFieldTestReport: createButton(),
    productionTwoProfileWarning: {},
  };
  const renderFieldTestReportComparison = () => {};
  const controller = createDiagnosticsCopyController({
    fields,
    t: (key) => key,
    updateEngineSidecarDiagnostics: async () => {},
    refreshFieldTestReport: () => "",
    refreshPublicBetaDiagnostics: () => "",
    renderRedactedSupportReport: () => ({ payload: "" }),
    fieldTestReportCopyPayload: (report) => report,
    writeClipboardWithTtl: async () => {},
    setProductionTwoProfileState: () => {},
    setText: () => {},
    renderFieldTestReportComparison,
  });

  controller.bindDiagnosticsCopyControls();

  assert.equal(fields.refreshFieldTestReport.listeners.get("click"), controller.refreshFieldTestReportWithRuntimeDiagnostics);
  assert.equal(fields.copyFieldTestReport.listeners.get("click"), controller.copyFieldTestReport);
  assert.equal(
    fields.refreshPublicBetaDiagnostics.listeners.get("click"),
    controller.refreshPublicBetaDiagnosticsWithRuntimeDiagnostics,
  );
  assert.equal(fields.copyPublicBetaDiagnostics.listeners.get("click"), controller.copyPublicBetaDiagnostics);
  assert.equal(fields.copyRedactedSupportReport.listeners.get("click"), controller.copyRedactedSupportReport);
  assert.equal(fields.peerFieldTestReport.listeners.get("input"), renderFieldTestReportComparison);
});
})();

(() => {
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
  assert.match(fields.publicBetaDiagnosticsSummary.textContent, /public diagnostics summary/);
  assert.match(fields.publicBetaDiagnosticsSummary.textContent, /failure_class=/);
  assert.match(fields.publicBetaDiagnosticsSummary.textContent, /recovery_next_action=/);
});
})();

(() => {
function createController(overrides = {}) {
  const calls = [];
  return {
    calls,
    controller: createEngineSidecarDiagnosticsController({
      hasTauriRuntimeBridge: () => true,
      invoke: async (command, input) => {
        calls.push([command, input]);
        if (command === "engine_sidecar_status") {
          return overrides.statusProbe ?? { attempted: true, failure_class: "none", schema_valid: true, protocol_valid: true, contract_version_valid: true, runtime_mode: "release" };
        }
        if (command === "engine_sidecar_manual_self_test") {
          return overrides.manualSelfTestProbe ?? {
            attempted: true,
            failure_class: "none",
            schema_valid: true,
            protocol_valid: true,
            contract_version_valid: true,
            pairing_payload_roundtrip: true,
            safety_transcript_bound: true,
            noise_handshake_roundtrip: true,
            envelope_roundtrip: true,
            replay_duplicate_rejected: true,
            plaintext_returned: false,
            key_material_exposed: false,
            passphrase_exposed: false,
            manual_e2ee_runtime_available: true,
          };
        }
        if (command === "engine_sidecar_contract_command") {
          return overrides.contractProbe ?? {
            attempted: true,
            command: "redacted-support-diagnostics",
            status: "accepted",
            failure_class: "none",
            recovery_action: "none",
            schema_valid: true,
            protocol_valid: true,
            contract_version_valid: true,
            command_valid: true,
            input_schema_valid: true,
            output_schema_valid: true,
            raw_payload_returned: false,
            runtime_action_performed: false,
            state_mutated: false,
          };
        }
        throw new Error(`unexpected command ${command}`);
      },
    }),
  };
}

test("engine sidecar diagnostics default to redacted fallback when tauri is unavailable", async () => {
  const controller = createEngineSidecarDiagnosticsController({
    hasTauriRuntimeBridge: () => false,
    invoke: async () => {
      throw new Error("should not call invoke");
    },
  });

  const diagnostics = await controller.updateEngineSidecarDiagnostics();

  assert.equal(diagnostics.statusFailureClass, "tauri-unavailable");
  assert.equal(diagnostics.contractFailureClass, "tauri-unavailable");
  assert.equal(diagnostics.rawPathReturned, false);
  assert.equal(diagnostics.stdoutReturned, false);
  assert.equal(diagnostics.stderrReturned, false);
  assert.match(controller.engineSidecarDiagnosticReportLines(diagnostics).join("\n"), /engine_sidecar_status_runtime_checked=false/);
});

test("engine sidecar diagnostics mark raw sidecar output as redacted and keep contract state scoped", async () => {
  const { controller, calls } = createController({
    statusProbe: {
      attempted: true,
      failure_class: "none",
      schema_valid: true,
      protocol_valid: true,
      contract_version_valid: true,
      redacted_diagnostics_only: true,
      runtime_mode: "release",
      raw_local_path_returned: true,
      stdout_returned: true,
      stderr_returned: true,
      app_launch_network_allowed: false,
      room_open_network_allowed: false,
    },
    manualSelfTestProbe: {
      attempted: true,
      failure_class: "none",
      schema_valid: true,
      protocol_valid: true,
      contract_version_valid: true,
      pairing_payload_roundtrip: true,
      safety_transcript_bound: true,
      noise_handshake_roundtrip: true,
      envelope_roundtrip: true,
      replay_duplicate_rejected: true,
      plaintext_returned: false,
      key_material_exposed: false,
      passphrase_exposed: false,
      sidecar_path_returned: true,
      stdout_returned: false,
      stderr_returned: false,
      manual_e2ee_runtime_available: true,
      app_launch_network_allowed: true,
    },
    contractProbe: {
      attempted: true,
      command: "redacted-support-diagnostics",
      status: "rejected",
      failure_class: "blocked",
      recovery_action: "retry-with-redacted-contract-input",
      schema_valid: true,
      protocol_valid: true,
      contract_version_valid: true,
      command_valid: true,
      input_schema_valid: true,
      output_schema_valid: true,
      raw_payload_returned: true,
      runtime_action_performed: false,
      state_mutated: false,
    },
  });

  const diagnostics = await controller.updateEngineSidecarDiagnostics();

  assert.deepEqual(calls.map(([command]) => command), [
    "engine_sidecar_status",
    "engine_sidecar_manual_self_test",
    "engine_sidecar_contract_command",
  ]);
  assert.equal(diagnostics.statusRedactedDiagnosticsOnly, true);
  assert.equal(diagnostics.rawPathReturned, true);
  assert.equal(diagnostics.stdoutReturned, true);
  assert.equal(diagnostics.stderrReturned, true);
  assert.equal(diagnostics.manualSelfTestPassed, true);
  assert.equal(diagnostics.contractRejected, true);
  assert.equal(diagnostics.contractRawPayloadReturned, true);
  assert.match(controller.engineSidecarDiagnosticReportLines(diagnostics).join("\n"), /engine_sidecar_contract_failure_class=blocked/);
  assert.match(controller.engineSidecarDiagnosticReportLines(diagnostics).join("\n"), /engine_sidecar_contract_raw_payload_returned=true/);
});
})();

(() => {
function createButton() {
  return {
    listeners: new Map(),
    attrs: new Map(),
    focused: false,
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    setAttribute(name, value) {
      this.attrs.set(name, value);
    },
    focus() {
      this.focused = true;
    },
    contains(target) {
      return target === this;
    },
  };
}

function createPanel() {
  return {
    open: false,
    listeners: new Map(),
    insideTarget: null,
    scrollIntoView() {},
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    contains(target) {
      return target === this.insideTarget;
    },
  };
}

function createDocumentHarness() {
  const chatPanel = createPanel();
  const systemPanel = createPanel();
  const systemSummary = createButton();
  const developerDetails = createPanel();
  const body = {
    classes: new Set(),
    classList: {
      toggle(name, enabled) {
        if (enabled) {
          body.classes.add(name);
        } else {
          body.classes.delete(name);
        }
      },
    },
  };
  const keydownListeners = [];
  const pointerdownListeners = [];
  return {
    chatPanel,
    systemPanel,
    systemSummary,
    developerDetails,
    keydownListeners,
    pointerdownListeners,
    document: {
      body,
      querySelector(selector) {
        if (selector === ".chat-settings-panel") {
          return chatPanel;
        }
        if (selector === ".system-settings-panel") {
          return systemPanel;
        }
        if (selector === ".system-settings-panel > summary") {
          return systemSummary;
        }
        if (selector === ".boundary-details") {
          return developerDetails;
        }
        return null;
      },
      addEventListener(type, handler) {
        if (type === "keydown") {
          keydownListeners.push(handler);
        }
        if (type === "pointerdown") {
          pointerdownListeners.push(handler);
        }
      },
    },
  };
}

test("bindPanelControls wires toggle, close, and utility buttons", () => {
  const harness = createDocumentHarness();
  const fields = {
    toggleChatSettings: createButton(),
    closeChatSettings: createButton(),
    openPrivateDeliverySettings: createButton(),
    closeAppSettings: createButton(),
    openPublicBetaDetails: createButton(),
    openDeveloperTools: createButton(),
  };
  let openedManualTools = 0;
  const controller = createDesktopPanelController({
    document: harness.document,
    fields,
    setManualNetworkPermission: () => {},
    productionTwoProfileInput: () => ({ profileA: "alice", profileB: "bob", passphrase: "room" }),
    twoProfileSessionsReadyForInput: () => true,
    renderRoomIdentityBar: () => {},
    renderRoomStatusSummary: () => {},
    setProductionTwoProfileState: () => {},
    pendingPrivateRouteFollowup: null,
    privateRouteFollowupMatchesRoom: () => false,
    showPrivateRouteRetryFollowupPrompt: () => false,
    clearPrivateRouteFollowupForRoom: () => {},
    twoProfileSafetyConfirmedForInput: () => true,
    twoProfilePeerEndpointState: () => ({ ready: false }),
    receiveIntentForRoom: () => false,
    setText: () => {},
    t: (key) => key,
    setChatDeliveryNoticeByKey: () => {},
    refreshRouteReadinessNoticeAfterSessionRefresh: () => {},
    applyProductionActionState: () => {},
    openChatSettingsPanel: () => {
      harness.chatPanel.open = true;
    },
    closeChatSettingsPanel: () => {
      harness.chatPanel.open = false;
    },
    closeAppSettingsPanel: () => {
      harness.systemPanel.open = false;
    },
    openManualProductionTools: () => {
      openedManualTools += 1;
    },
  });

  controller.bindPanelControls();
  fields.toggleChatSettings.listeners.get("click")();
  fields.closeChatSettings.listeners.get("click")();
  fields.openPrivateDeliverySettings.listeners.get("click")();
  fields.closeAppSettings.listeners.get("click")({ preventDefault() {} });
  fields.openPublicBetaDetails.listeners.get("click")();
  fields.openDeveloperTools.listeners.get("click")();

  assert.equal(fields.toggleChatSettings.attrs.get("aria-expanded"), "false");
  assert.equal(fields.toggleChatSettings.focused, true);
  assert.equal(openedManualTools, 1);
  assert.equal(harness.systemSummary.focused, true);
  assert.equal(fields.openPrivateDeliverySettings.focused, false);
  assert.equal(harness.developerDetails.open, true);
});

test("Escape and outside pointer close open panels", () => {
  const harness = createDocumentHarness();
  const fields = {
    toggleChatSettings: createButton(),
  };
  let chatClosed = 0;
  let appClosed = 0;
  const controller = createDesktopPanelController({
    document: harness.document,
    fields,
    setManualNetworkPermission: () => {},
    productionTwoProfileInput: () => ({ profileA: "alice", profileB: "bob", passphrase: "room" }),
    twoProfileSessionsReadyForInput: () => true,
    renderRoomIdentityBar: () => {},
    renderRoomStatusSummary: () => {},
    setProductionTwoProfileState: () => {},
    pendingPrivateRouteFollowup: null,
    privateRouteFollowupMatchesRoom: () => false,
    showPrivateRouteRetryFollowupPrompt: () => false,
    clearPrivateRouteFollowupForRoom: () => {},
    twoProfileSafetyConfirmedForInput: () => true,
    twoProfilePeerEndpointState: () => ({ ready: false }),
    receiveIntentForRoom: () => false,
    setText: () => {},
    t: (key) => key,
    setChatDeliveryNoticeByKey: () => {},
    refreshRouteReadinessNoticeAfterSessionRefresh: () => {},
    applyProductionActionState: () => {},
    openChatSettingsPanel: () => {},
    closeChatSettingsPanel: () => {
      chatClosed += 1;
      harness.chatPanel.open = false;
    },
    closeAppSettingsPanel: () => {
      appClosed += 1;
      harness.systemPanel.open = false;
    },
    enablePrivateDeliveryPermission: () => {},
    openManualProductionTools: () => {},
  });

  controller.bindPanelControls();
  harness.chatPanel.open = true;
  harness.systemPanel.open = true;
  harness.keydownListeners[0]({ key: "Escape" });
  harness.chatPanel.open = true;
  harness.systemPanel.open = true;
  harness.pointerdownListeners[0]({ target: {} });

  assert.equal(chatClosed, 2);
  assert.equal(appClosed, 2);
  assert.equal(fields.toggleChatSettings.focused, true);
  assert.equal(harness.systemSummary.focused, true);
});

test("toggle listeners keep body state and aria-expanded in sync", () => {
  const harness = createDocumentHarness();
  const fields = {
    toggleChatSettings: createButton(),
  };
  let chatClosed = 0;
  const controller = createDesktopPanelController({
    document: harness.document,
    fields,
    setManualNetworkPermission: () => {},
    productionTwoProfileInput: () => ({ profileA: "alice", profileB: "bob", passphrase: "room" }),
    twoProfileSessionsReadyForInput: () => true,
    renderRoomIdentityBar: () => {},
    renderRoomStatusSummary: () => {},
    setProductionTwoProfileState: () => {},
    pendingPrivateRouteFollowup: null,
    privateRouteFollowupMatchesRoom: () => false,
    showPrivateRouteRetryFollowupPrompt: () => false,
    clearPrivateRouteFollowupForRoom: () => {},
    twoProfileSafetyConfirmedForInput: () => true,
    twoProfilePeerEndpointState: () => ({ ready: false }),
    receiveIntentForRoom: () => false,
    setText: () => {},
    t: (key) => key,
    setChatDeliveryNoticeByKey: () => {},
    refreshRouteReadinessNoticeAfterSessionRefresh: () => {},
    applyProductionActionState: () => {},
    openChatSettingsPanel: () => {},
    closeChatSettingsPanel: () => {
      chatClosed += 1;
    },
    closeAppSettingsPanel: () => {},
    enablePrivateDeliveryPermission: () => {},
    openManualProductionTools: () => {},
  });

  controller.bindPanelControls();
  harness.chatPanel.listeners.get("toggle")({ currentTarget: { open: true } });
  harness.systemPanel.listeners.get("toggle")({ currentTarget: { open: true } });

  assert.equal(fields.toggleChatSettings.attrs.get("aria-expanded"), "true");
  assert.equal(harness.document.body.classes.has("is-chat-settings-open"), true);
  assert.equal(harness.document.body.classes.has("is-app-settings-open"), true);
  assert.equal(chatClosed, 1);
});
})();
