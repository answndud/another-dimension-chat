import { invoke } from "@tauri-apps/api/core";
import {
  productionActionAvailability,
  productionHandshakeFinishImportView,
  productionHandshakePayloadView,
  productionManualNextActions,
  productionMessageEnvelopeExportView,
  productionMessageEnvelopeImportView,
  productionPairingPayloadView,
  productionProfilePreset,
  productionProfileUnlockView,
  productionReceivedMessageExportView,
  productionSessionDraftView,
  productionSessionStateView,
  productionTwoProfileResultView,
  productionTwoProfileReadiness,
} from "./action-state.js";
import "./styles.css";

const fields = {
  themeToggle: document.querySelector("#theme-toggle"),
  appReleaseSummary: document.querySelector("#app-release-summary"),
  localCapabilitySummary: document.querySelector("#local-capability-summary"),
  mainBlockerSummary: document.querySelector("#main-blocker-summary"),
  releaseClaim: document.querySelector("#release-claim"),
  messaging: document.querySelector("#messaging"),
  core: document.querySelector("#core"),
  profile: document.querySelector("#profile"),
  pairing: document.querySelector("#pairing"),
  productionSession: document.querySelector("#production-session"),
  productionSelfTest: document.querySelector("#production-self-test"),
  productionSessionNonReadiness: document.querySelector("#production-session-non-readiness"),
  productionPreflight: document.querySelector("#production-preflight"),
  productionPreflightBlockers: document.querySelector("#production-preflight-blockers"),
  sessionDurableState: document.querySelector("#session-durable-state"),
  sessionUnlockPolicy: document.querySelector("#session-unlock-policy"),
  sessionUnlockNonReadiness: document.querySelector("#session-unlock-non-readiness"),
  sessionUnlockCliRejection: document.querySelector("#session-unlock-cli-rejection"),
  sessionUnlockCliRejectionFlags: document.querySelector("#session-unlock-cli-rejection-flags"),
  transport: document.querySelector("#transport"),
  networkExecution: document.querySelector("#network-execution"),
  experimentalTransport: document.querySelector("#experimental-transport"),
  bootstrapStatus: document.querySelector("#bootstrap-status"),
  transportIo: document.querySelector("#transport-io"),
  storage: document.querySelector("#storage"),
  verification: document.querySelector("#verification"),
  runDemo: document.querySelector("#run-demo"),
  demoState: document.querySelector("#demo-state"),
  demoHint: document.querySelector("#demo-hint"),
  demoWarning: document.querySelector("#demo-warning"),
  demoSteps: document.querySelector("#demo-steps"),
  flowControls: document.querySelector("#flow-controls"),
  aliceProfile: document.querySelector("#alice-profile"),
  aliceContact: document.querySelector("#alice-contact"),
  aliceInbox: document.querySelector("#alice-inbox"),
  bobProfile: document.querySelector("#bob-profile"),
  bobContact: document.querySelector("#bob-contact"),
  bobInbox: document.querySelector("#bob-inbox"),
  simulationSafetyNumber: document.querySelector("#simulation-safety-number"),
  simulationSafetyPhrase: document.querySelector("#simulation-safety-phrase"),
  simulationMessage: document.querySelector("#simulation-message"),
  simulationReplay: document.querySelector("#simulation-replay"),
  productionProfileSelector: document.querySelector("#production-profile-selector"),
  productionProfileName: document.querySelector("#production-profile-name"),
  useAliceProductionProfile: document.querySelector("#use-alice-production-profile"),
  useBobProductionProfile: document.querySelector("#use-bob-production-profile"),
  productionProfilePassphrase: document.querySelector("#production-profile-passphrase"),
  unlockProductionProfile: document.querySelector("#unlock-production-profile"),
  productionProfileState: document.querySelector("#production-profile-state"),
  productionProfileNextAction: document.querySelector("#production-profile-next-action"),
  productionProfileWarning: document.querySelector("#production-profile-warning"),
  productionProfileStorage: document.querySelector("#production-profile-storage"),
  productionProfileIdentity: document.querySelector("#production-profile-identity"),
  productionProfileBoundary: document.querySelector("#production-profile-boundary"),
  productionPairingEndpoint: document.querySelector("#production-pairing-endpoint"),
  exportProductionPairing: document.querySelector("#export-production-pairing"),
  productionPairingState: document.querySelector("#production-pairing-state"),
  productionPairingNextAction: document.querySelector("#production-pairing-next-action"),
  productionPairingWarning: document.querySelector("#production-pairing-warning"),
  productionPairingPayload: document.querySelector("#production-pairing-payload"),
  useProductionPairingPayload: document.querySelector("#use-production-pairing-payload"),
  productionRemotePairingPayload: document.querySelector("#production-remote-pairing-payload"),
  saveProductionSessionDraft: document.querySelector("#save-production-session-draft"),
  productionHandshakeInitPayload: document.querySelector("#production-handshake-init-payload"),
  useProductionHandshakeInit: document.querySelector("#use-production-handshake-init"),
  productionRemoteHandshakeInitPayload: document.querySelector(
    "#production-remote-handshake-init-payload",
  ),
  productionHandshakeReplyPayload: document.querySelector("#production-handshake-reply-payload"),
  useProductionHandshakeReply: document.querySelector("#use-production-handshake-reply"),
  productionRemoteHandshakeReplyPayload: document.querySelector(
    "#production-remote-handshake-reply-payload",
  ),
  productionHandshakeFinishPayload: document.querySelector("#production-handshake-finish-payload"),
  useProductionHandshakeFinish: document.querySelector("#use-production-handshake-finish"),
  productionRemoteHandshakeFinishPayload: document.querySelector(
    "#production-remote-handshake-finish-payload",
  ),
  exportProductionHandshakeInit: document.querySelector("#export-production-handshake-init"),
  exportProductionHandshakeReply: document.querySelector("#export-production-handshake-reply"),
  exportProductionHandshakeFinish: document.querySelector("#export-production-handshake-finish"),
  importProductionHandshakeFinish: document.querySelector("#import-production-handshake-finish"),
  checkProductionSessionState: document.querySelector("#check-production-session-state"),
  productionPairingStorage: document.querySelector("#production-pairing-storage"),
  productionPairingSession: document.querySelector("#production-pairing-session"),
  productionHandshakeState: document.querySelector("#production-handshake-state"),
  productionPairingBoundary: document.querySelector("#production-pairing-boundary"),
  productionMessageNumber: document.querySelector("#production-message-number"),
  productionMessageBody: document.querySelector("#production-message-body"),
  exportProductionMessageEnvelope: document.querySelector("#export-production-message-envelope"),
  productionMessageState: document.querySelector("#production-message-state"),
  productionMessageNextAction: document.querySelector("#production-message-next-action"),
  productionMessageWarning: document.querySelector("#production-message-warning"),
  productionMessageEnvelope: document.querySelector("#production-message-envelope"),
  useProductionMessageEnvelope: document.querySelector("#use-production-message-envelope"),
  productionRemoteMessageEnvelope: document.querySelector("#production-remote-message-envelope"),
  importProductionMessageEnvelope: document.querySelector("#import-production-message-envelope"),
  exportProductionReceivedMessage: document.querySelector("#export-production-received-message"),
  productionReceivedMessage: document.querySelector("#production-received-message"),
  productionMessageOutbound: document.querySelector("#production-message-outbound"),
  productionMessageInbound: document.querySelector("#production-message-inbound"),
  productionMessageBoundary: document.querySelector("#production-message-boundary"),
  productionTwoProfileA: document.querySelector("#production-two-profile-a"),
  productionTwoProfileB: document.querySelector("#production-two-profile-b"),
  productionTwoProfilePassphrase: document.querySelector("#production-two-profile-passphrase"),
  productionTwoProfileMessage: document.querySelector("#production-two-profile-message"),
  runProductionTwoProfileRoundtrip: document.querySelector("#run-production-two-profile-roundtrip"),
  productionTwoProfileReadiness: document.querySelector("#production-two-profile-readiness"),
  productionTwoProfileState: document.querySelector("#production-two-profile-state"),
  productionTwoProfileWarning: document.querySelector("#production-two-profile-warning"),
  productionTwoProfileProfiles: document.querySelector("#production-two-profile-profiles"),
  productionTwoProfileSession: document.querySelector("#production-two-profile-session"),
  productionTwoProfileMessageState: document.querySelector("#production-two-profile-message-state"),
  productionTwoProfileBoundary: document.querySelector("#production-two-profile-boundary"),
  productionTwoProfileCurrentInput: document.querySelector("#production-two-profile-current-input"),
  productionTwoProfileLastSuccess: document.querySelector("#production-two-profile-last-success"),
  productionTwoProfileNextStep: document.querySelector("#production-two-profile-next-step"),
  openManualProductionTools: document.querySelector("#open-manual-production-tools"),
  focusLocalDiagnostic: document.querySelector("#focus-local-diagnostic"),
  editTwoProfileMessage: document.querySelector("#edit-two-profile-message"),
  manualProductionTools: document.querySelector(".advanced-panel"),
  localDiagnosticPanel: document.querySelector("#demo-title"),
  productionRoundtripMessage: document.querySelector("#production-roundtrip-message"),
  runProductionRoundtrip: document.querySelector("#run-production-roundtrip"),
  productionRoundtripState: document.querySelector("#production-roundtrip-state"),
  productionRoundtripWarning: document.querySelector("#production-roundtrip-warning"),
  productionRoundtripSession: document.querySelector("#production-roundtrip-session"),
  productionRoundtripEnvelope: document.querySelector("#production-roundtrip-envelope"),
  productionRoundtripReceive: document.querySelector("#production-roundtrip-receive"),
  productionRoundtripBoundary: document.querySelector("#production-roundtrip-boundary"),
  loopMessages: document.querySelector("#loop-messages"),
  runLoop: document.querySelector("#run-loop"),
  resetLoop: document.querySelector("#reset-loop"),
  loopState: document.querySelector("#loop-state"),
  loopWarning: document.querySelector("#loop-warning"),
  loopResults: document.querySelector("#loop-results"),
  loopReplay: document.querySelector("#loop-replay"),
  loopExpiry: document.querySelector("#loop-expiry"),
  loopStorage: document.querySelector("#loop-storage"),
  demoOutput: document.querySelector("#demo-output"),
};

let latestSimulation = null;
let latestProductionSessionState = null;
let latestProductionTwoProfileSuccess = null;
let productionBusyAction = null;

const themeStorageKey = "another-dimension-theme";

function applyTheme(theme) {
  const mode = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = mode;
  if (fields.themeToggle) {
    fields.themeToggle.textContent = mode === "dark" ? "Dark mode" : "Light mode";
    fields.themeToggle.setAttribute("aria-pressed", String(mode === "dark"));
  }
}

function initializeTheme() {
  const savedTheme = window.localStorage?.getItem(themeStorageKey);
  applyTheme(savedTheme === "light" ? "light" : "dark");
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  window.localStorage?.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
}

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function setDemoState(state, message) {
  setText(fields.demoState, message);
  if (fields.demoOutput) {
    fields.demoOutput.className = `is-${state}`;
  }
}

function setLoopState(message) {
  setText(fields.loopState, message);
}

function setProductionRoundtripState(message) {
  setText(fields.productionRoundtripState, message);
}

function setProductionTwoProfileState(message) {
  setText(fields.productionTwoProfileState, message);
}

function setProductionProfileState(message) {
  setText(fields.productionProfileState, message);
}

function setProductionPairingState(message) {
  setText(fields.productionPairingState, message);
}

function setProductionMessageState(message) {
  setText(fields.productionMessageState, message);
}

function setDisabled(node, disabled) {
  if (node) {
    node.disabled = disabled;
  }
}

function setProductionFollowupActions(enabled, message) {
  setText(fields.productionTwoProfileNextStep, message);
  setDisabled(fields.openManualProductionTools, !enabled);
  setDisabled(fields.focusLocalDiagnostic, !enabled);
  setDisabled(fields.editTwoProfileMessage, !enabled);
}

function renderAppStateSummary(status) {
  const releaseSummary = status.secure_release
    ? "Ready: secure-release claim present"
    : "Blocked: secure-release claim closed";
  const localCapabilitySummary = status.usable_messaging
    ? "Ready: runtime messaging path enabled"
    : "Local-only: encrypted app-data harness";
  const mainBlockerSummary = status.network_execution_status?.includes("disabled")
    ? "Blocked: runtime transport disabled"
    : status.production_preflight_blockers;

  setText(fields.appReleaseSummary, releaseSummary);
  setText(fields.localCapabilitySummary, localCapabilitySummary);
  setText(fields.mainBlockerSummary, mainBlockerSummary);
}

function validProductionMessageNumber() {
  const messageNumber = Number.parseInt(fields.productionMessageNumber?.value ?? "1", 10);
  return Number.isInteger(messageNumber) && messageNumber >= 1;
}

function productionSessionReadyForMessages() {
  return latestProductionSessionState?.ready_for_message_envelope === true;
}

function applyProductionProfilePreset(peer) {
  const preset = productionProfilePreset(peer);
  if (!preset || !fields.productionProfileName || !fields.productionPairingEndpoint) {
    return;
  }
  fields.productionProfileName.value = preset.profile;
  fields.productionPairingEndpoint.value = preset.rendezvousEndpoint;
  if (fields.productionProfileSelector) {
    fields.productionProfileSelector.value = preset.profile;
  }
  resetProductionPairingView();
  resetProductionMessageView();
  applyProductionActionState();
  setText(
    fields.productionProfileWarning,
    `Manual profile preset applied: ${preset.profile} / ${preset.rendezvousEndpoint}`,
  );
}

function renderManualNextActions(state) {
  const nextActions = productionManualNextActions(state);

  setText(fields.productionProfileNextAction, nextActions.profile);
  setText(fields.productionPairingNextAction, nextActions.pairing);
  setText(fields.productionMessageNextAction, nextActions.message);
}

function twoProfileInputFingerprint(input) {
  return `${input.profileA}\n${input.profileB}\n${input.message}`;
}

function renderProductionTwoProfileMemory(input = productionTwoProfileInput()) {
  const currentLabel =
    input.profileA && input.profileB && input.message
      ? `${input.profileA} -> ${input.profileB} | message_chars=${input.message.length}`
      : "Current input incomplete";

  if (!latestProductionTwoProfileSuccess) {
    setText(fields.productionTwoProfileCurrentInput, "No successful run yet");
    setText(fields.productionTwoProfileLastSuccess, "No successful roundtrip in this app session");
    return;
  }

  const matchesLastSuccess =
    twoProfileInputFingerprint(input) === latestProductionTwoProfileSuccess.fingerprint;
  setText(
    fields.productionTwoProfileCurrentInput,
    `${matchesLastSuccess ? "Matches last success" : "Differs from last success"}: ${currentLabel}`,
  );
  setText(
    fields.productionTwoProfileLastSuccess,
    `${latestProductionTwoProfileSuccess.profileA} -> ${latestProductionTwoProfileSuccess.profileB} | message_chars=${latestProductionTwoProfileSuccess.messageLength}`,
  );
}

function moveLocalPayload(sourceField, targetField, label) {
  const value = sourceField?.value?.trim() ?? "";
  if (!value || !targetField) {
    setProductionPairingState(`${label} needs payload`);
    return;
  }
  targetField.value = value;
  targetField.dispatchEvent(new Event("input", { bubbles: true }));
  setProductionPairingState(`${label} applied`);
  setText(fields.productionPairingWarning, "Local screen payload copied into the matching remote field.");
  applyProductionActionState();
}

function moveLocalMessageEnvelope() {
  const value = fields.productionMessageEnvelope?.value?.trim() ?? "";
  if (!value || !fields.productionRemoteMessageEnvelope) {
    setProductionMessageState("Message envelope needs payload");
    return;
  }
  fields.productionRemoteMessageEnvelope.value = value;
  fields.productionRemoteMessageEnvelope.dispatchEvent(new Event("input", { bubbles: true }));
  setProductionMessageState("Message envelope applied");
  setText(fields.productionMessageWarning, "Local screen envelope copied into the remote envelope field.");
  applyProductionActionState();
}

function openManualProductionTools() {
  if (fields.manualProductionTools) {
    fields.manualProductionTools.open = true;
    fields.manualProductionTools.scrollIntoView({ block: "start", behavior: "smooth" });
  }
}

function focusLocalDiagnostic() {
  fields.localDiagnosticPanel?.scrollIntoView({ block: "start", behavior: "smooth" });
  fields.runDemo?.focus();
}

function editTwoProfileMessage() {
  fields.productionTwoProfileMessage?.focus();
}

function applyProductionActionState() {
  const { profile, passphrase } = productionProfileInput();
  const pairing = productionPairingInput();
  const message = productionMessageInput();
  const twoProfile = productionTwoProfileInput();
  const busy = productionBusyAction !== null;
  const sessionReadyForMessages = productionSessionReadyForMessages();
  const hasProfileUnlockInput = Boolean(profile && passphrase);
  const hasPairingInput = Boolean(hasProfileUnlockInput && pairing.rendezvousEndpoint);
  const hasSessionDraftInput = Boolean(
    hasProfileUnlockInput && pairing.localPayload && pairing.remotePayload,
  );
  const hasHandshakeReplyInput = Boolean(hasProfileUnlockInput && pairing.initPayload);
  const hasHandshakeFinishInput = Boolean(hasProfileUnlockInput && pairing.replyPayload);
  const hasFinishImportInput = Boolean(hasProfileUnlockInput && pairing.finishPayload);
  const hasLocalPairingPayload = Boolean(fields.productionPairingPayload?.value.trim());
  const hasHandshakeInitPayload = Boolean(fields.productionHandshakeInitPayload?.value.trim());
  const hasHandshakeReplyPayload = Boolean(fields.productionHandshakeReplyPayload?.value.trim());
  const hasHandshakeFinishPayload = Boolean(fields.productionHandshakeFinishPayload?.value.trim());
  const hasLocalMessageEnvelope = Boolean(fields.productionMessageEnvelope?.value.trim());
  const hasOutboundMessageInput = Boolean(
    hasProfileUnlockInput &&
      validProductionMessageNumber() &&
      message.message &&
      sessionReadyForMessages,
  );
  const hasInboundEnvelopeInput = Boolean(
    hasProfileUnlockInput && validProductionMessageNumber() && message.envelopePayload,
  );
  const hasReceivedExportInput = Boolean(hasProfileUnlockInput && validProductionMessageNumber());
  const hasReceivedMessage = Boolean(fields.productionReceivedMessage?.value.trim());
  const hasTwoProfileInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase &&
      twoProfile.message,
  );
  const state = {
    busy,
    hasProfileUnlockInput,
    hasPairingInput,
    hasSessionDraftInput,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    hasLocalPairingPayload,
    hasHandshakeInitPayload,
    hasHandshakeReplyPayload,
    hasHandshakeFinishPayload,
    hasLocalMessageEnvelope,
    sessionReadyForMessages,
    hasOutboundMessageInput,
    hasInboundEnvelopeInput,
    hasReceivedExportInput,
    hasReceivedMessage,
    hasTwoProfileInput,
  };
  const availability = productionActionAvailability(state);

  setText(fields.productionTwoProfileReadiness, productionTwoProfileReadiness(twoProfile, busy));
  renderProductionTwoProfileMemory(twoProfile);
  renderManualNextActions(state);
  setDisabled(fields.unlockProductionProfile, !availability.unlockProfile);
  setDisabled(fields.exportProductionPairing, !availability.exportPairing);
  setDisabled(fields.saveProductionSessionDraft, !availability.saveSessionDraft);
  setDisabled(fields.checkProductionSessionState, !availability.checkSessionState);
  setDisabled(fields.exportProductionHandshakeInit, !availability.exportHandshakeInit);
  setDisabled(fields.exportProductionHandshakeReply, !availability.exportHandshakeReply);
  setDisabled(fields.exportProductionHandshakeFinish, !availability.exportHandshakeFinish);
  setDisabled(fields.importProductionHandshakeFinish, !availability.importHandshakeFinish);
  setDisabled(fields.exportProductionMessageEnvelope, !availability.exportMessageEnvelope);
  setDisabled(fields.importProductionMessageEnvelope, !availability.importMessageEnvelope);
  setDisabled(fields.exportProductionReceivedMessage, !availability.exportReceivedMessage);
  setDisabled(fields.runProductionTwoProfileRoundtrip, !availability.runTwoProfileRoundtrip);
  setDisabled(fields.useProductionPairingPayload, !availability.usePairingPayload);
  setDisabled(fields.useProductionHandshakeInit, !availability.useHandshakeInit);
  setDisabled(fields.useProductionHandshakeReply, !availability.useHandshakeReply);
  setDisabled(fields.useProductionHandshakeFinish, !availability.useHandshakeFinish);
  setDisabled(fields.useProductionMessageEnvelope, !availability.useMessageEnvelope);
}

function renderDemoSteps(steps) {
  if (!fields.demoSteps) {
    return;
  }

  fields.demoSteps.replaceChildren();
  if (!steps || steps.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Steps have not run yet.";
    fields.demoSteps.append(item);
    return;
  }

  for (const step of steps) {
    const item = document.createElement("li");
    item.className = `is-${step.status}`;

    const label = document.createElement("strong");
    label.textContent = step.label;
    item.append(label);

    if (step.detail) {
      const detail = document.createElement("span");
      detail.textContent = step.detail;
      item.append(detail);
    }

    fields.demoSteps.append(item);
  }
}

function resetSimulationFields() {
  setText(fields.aliceProfile, "Waiting for local demo");
  setText(fields.aliceContact, "Waiting for pairing");
  setText(fields.aliceInbox, "No local message state");
  setText(fields.bobProfile, "Waiting for local demo");
  setText(fields.bobContact, "Waiting for pairing");
  setText(fields.bobInbox, "No local message state");
  setText(fields.simulationSafetyNumber, "Not shown yet");
  setText(fields.simulationSafetyPhrase, "Not shown yet");
  setText(fields.simulationMessage, "Not received yet");
  setText(fields.simulationReplay, "Not checked yet");
}

function resetSimulationView() {
  resetSimulationFields();
  if (fields.flowControls) {
    fields.flowControls.replaceChildren();
  }
}

function resetLoopView() {
  setLoopState("Loop idle");
  setText(fields.loopWarning, "Loop has not run yet.");
  setText(fields.loopReplay, "Not checked yet");
  setText(fields.loopExpiry, "Not checked yet");
  setText(fields.loopStorage, "Not checked yet");
  if (fields.loopResults) {
    fields.loopResults.replaceChildren();
    const item = document.createElement("li");
    item.textContent = "Messages have not run yet.";
    fields.loopResults.append(item);
  }
}

function resetProductionRoundtripView() {
  setProductionRoundtripState("Roundtrip idle");
  setText(fields.productionRoundtripWarning, "Production roundtrip has not run yet.");
  setText(fields.productionRoundtripSession, "Not checked yet");
  setText(fields.productionRoundtripEnvelope, "Not checked yet");
  setText(fields.productionRoundtripReceive, "Not checked yet");
  setText(fields.productionRoundtripBoundary, "Not checked yet");
}

function resetProductionTwoProfileView() {
  setProductionTwoProfileState("Two-profile roundtrip idle");
  setText(fields.productionTwoProfileWarning, "Two-profile app-data harness has not run yet.");
  setText(fields.productionTwoProfileProfiles, "Not checked yet");
  setText(fields.productionTwoProfileSession, "Not checked yet");
  setText(fields.productionTwoProfileMessageState, "Not checked yet");
  setText(fields.productionTwoProfileBoundary, "Not checked yet");
  renderProductionTwoProfileMemory();
  setProductionFollowupActions(false, "Next actions unlock after a completed local roundtrip.");
  applyProductionActionState();
}

function resetProductionProfileView() {
  setProductionProfileState("Profile locked");
  setText(fields.productionProfileWarning, "Production profile has not been unlocked yet.");
  setText(fields.productionProfileStorage, "Not checked yet");
  setText(fields.productionProfileIdentity, "Not checked yet");
  setText(fields.productionProfileBoundary, "Not checked yet");
  applyProductionActionState();
}

function renderProductionProfileSelector(profiles) {
  if (!fields.productionProfileSelector) {
    return;
  }
  fields.productionProfileSelector.replaceChildren();
  if (!profiles || profiles.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved profiles";
    fields.productionProfileSelector.append(option);
    return;
  }
  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile;
    option.textContent = profile;
    fields.productionProfileSelector.append(option);
  }
  const currentProfile = productionProfileInput().profile;
  if (profiles.includes(currentProfile)) {
    fields.productionProfileSelector.value = currentProfile;
  } else if (!currentProfile && profiles[0]) {
    fields.productionProfileSelector.value = profiles[0];
    fields.productionProfileName.value = profiles[0];
  }
  applyProductionActionState();
}

async function loadProductionProfileList() {
  if (!fields.productionProfileSelector) {
    return;
  }
  try {
    const result = await invoke("production_profile_list");
    renderProductionProfileSelector(result.profiles);
    if (result.profile_count > 0) {
      setText(fields.productionProfileStorage, `saved_profiles=${result.profile_count}`);
    }
  } catch (error) {
    renderProductionProfileSelector([]);
  }
}

function resetProductionPairingView() {
  latestProductionSessionState = null;
  setProductionPairingState("Pairing payload idle");
  setText(fields.productionPairingWarning, "Pairing payload has not been exported yet.");
  if (fields.productionPairingPayload) {
    fields.productionPairingPayload.value = "";
  }
  setHandshakePayload(fields.productionHandshakeInitPayload, "");
  setHandshakePayload(fields.productionHandshakeReplyPayload, "");
  setHandshakePayload(fields.productionHandshakeFinishPayload, "");
  setText(fields.productionPairingStorage, "Not checked yet");
  setText(fields.productionPairingSession, "Not checked yet");
  setText(fields.productionHandshakeState, "Not checked yet");
  setText(fields.productionPairingBoundary, "Not checked yet");
  applyProductionActionState();
}

function resetProductionMessageView() {
  setProductionMessageState("Message flow idle");
  setText(fields.productionMessageWarning, "Message envelope has not been exported yet.");
  if (fields.productionMessageEnvelope) {
    fields.productionMessageEnvelope.value = "";
  }
  if (fields.productionReceivedMessage) {
    fields.productionReceivedMessage.value = "";
  }
  setText(fields.productionMessageOutbound, "Not checked yet");
  setText(fields.productionMessageInbound, "Not checked yet");
  setText(fields.productionMessageBoundary, "Not checked yet");
  applyProductionActionState();
}

function localLoopMessages() {
  return (fields.loopMessages?.value ?? "")
    .split("\n")
    .map((message) => message.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function productionRoundtripMessage() {
  return (fields.productionRoundtripMessage?.value ?? "").trim();
}

function productionTwoProfileInput() {
  return {
    profileA: (fields.productionTwoProfileA?.value ?? "").trim(),
    profileB: (fields.productionTwoProfileB?.value ?? "").trim(),
    passphrase:
      fields.productionTwoProfilePassphrase?.value || fields.productionProfilePassphrase?.value || "",
    message: (fields.productionTwoProfileMessage?.value ?? "").trim(),
  };
}

function renderProductionTwoProfileResult(result) {
  const input = productionTwoProfileInput();
  const view = productionTwoProfileResultView(result);

  setText(fields.productionTwoProfileProfiles, view.profiles);
  setText(fields.productionTwoProfileSession, view.session);
  setText(fields.productionTwoProfileMessageState, view.message);
  setText(fields.productionTwoProfileBoundary, view.boundary);
  if (view.canContinue) {
    latestProductionTwoProfileSuccess = {
      profileA: input.profileA,
      profileB: input.profileB,
      messageLength: input.message.length,
      fingerprint: twoProfileInputFingerprint(input),
    };
    renderProductionTwoProfileMemory(input);
  }
  setProductionFollowupActions(view.canContinue, view.nextStep);
}

function productionProfileInput() {
  return {
    profile: (fields.productionProfileName?.value ?? "").trim(),
    passphrase: fields.productionProfilePassphrase?.value ?? "",
  };
}

function productionPairingInput() {
  return {
    ...productionProfileInput(),
    rendezvousEndpoint: (fields.productionPairingEndpoint?.value ?? "").trim(),
    localPayload: (fields.productionPairingPayload?.value ?? "").trim(),
    remotePayload: (fields.productionRemotePairingPayload?.value ?? "").trim(),
    initPayload: (fields.productionRemoteHandshakeInitPayload?.value ?? "").trim(),
    replyPayload: (fields.productionRemoteHandshakeReplyPayload?.value ?? "").trim(),
    finishPayload: (fields.productionRemoteHandshakeFinishPayload?.value ?? "").trim(),
  };
}

function productionMessageInput() {
  return {
    ...productionProfileInput(),
    messageNumber: Number.parseInt(fields.productionMessageNumber?.value ?? "1", 10),
    message: (fields.productionMessageBody?.value ?? "").trim(),
    envelopePayload: (fields.productionRemoteMessageEnvelope?.value ?? "").trim(),
  };
}

function renderLoopResults(messages) {
  if (!fields.loopResults) {
    return;
  }
  fields.loopResults.replaceChildren();
  if (!messages || messages.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No local loop messages returned.";
    fields.loopResults.append(item);
    return;
  }
  for (const message of messages) {
    const item = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = `Message ${message.index}`;
    const body = document.createElement("span");
    body.textContent = `sent: ${message.sent}\nreceived by Bob: ${message.received}\n${message.replay_check}`;
    item.append(label, body);
    fields.loopResults.append(item);
  }
}

function peerByName(simulation, name) {
  return simulation?.peers?.find((peer) => peer.name === name);
}

function applySimulationStage(stageId) {
  if (!latestSimulation) {
    return;
  }

  const alice = peerByName(latestSimulation, "Alice");
  const bob = peerByName(latestSimulation, "Bob");

  if (stageId === "profiles") {
    setText(fields.aliceProfile, alice?.profile_state ?? "local dev profile initialized");
    setText(fields.bobProfile, bob?.profile_state ?? "local dev profile initialized");
  }

  if (stageId === "pairing") {
    setText(fields.aliceContact, "pending Bob local pairing");
    setText(fields.bobContact, "pending Alice local pairing");
  }

  if (stageId === "safety") {
    setText(fields.simulationSafetyNumber, latestSimulation.safety_number);
    setText(fields.simulationSafetyPhrase, latestSimulation.safety_phrase);
  }

  if (stageId === "confirm") {
    setText(fields.aliceContact, alice?.contact_state ?? "Bob contact activated");
    setText(fields.bobContact, bob?.contact_state ?? "Alice contact activated");
  }

  if (stageId === "send") {
    setText(fields.aliceInbox, latestSimulation.queued_envelope);
  }

  if (stageId === "receive") {
    setText(fields.bobInbox, bob?.inbox_state ?? "received one local dev message");
    setText(fields.simulationMessage, latestSimulation.message_body);
  }

  if (stageId === "replay") {
    setText(fields.simulationReplay, latestSimulation.replay_check);
  }

  if (stageId === "complete") {
    setText(fields.aliceInbox, "local demo completed");
    setText(fields.bobInbox, "local demo completed");
  }
}

function renderFlowControls(simulation) {
  if (!fields.flowControls) {
    return;
  }

  fields.flowControls.replaceChildren();
  latestSimulation = simulation;

  const stages = [
    ["profiles", "Create profiles"],
    ["pairing", "Exchange pairing"],
    ["safety", "Show safety"],
    ["confirm", "Confirm contacts"],
    ["send", "Send local message"],
    ["receive", "Receive as Bob"],
    ["replay", "Check replay"],
    ["complete", "Complete"],
  ];

  for (const [stageId, label] of stages) {
    const control = document.createElement("button");
    control.type = "button";
    control.className = "flow-control";
    control.textContent = label;
    control.addEventListener("click", () => applySimulationStage(stageId));
    fields.flowControls.append(control);
  }

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "flow-control is-secondary";
  reset.textContent = "Reset local view";
  reset.addEventListener("click", resetSimulationFields);
  fields.flowControls.append(reset);
}

async function renderPrototypeStatus() {
  try {
    const status = await invoke("prototype_status");
    renderAppStateSummary(status);

    setText(
      fields.releaseClaim,
      status.secure_release ? "Unexpected release claim" : "No secure-release claim",
    );
    setText(
      fields.messaging,
      status.usable_messaging ? "Unexpected messaging status" : "No runtime messaging path",
    );
    setText(fields.core, status.core_status);
    setText(fields.profile, status.profile_status);
    setText(fields.pairing, status.pairing_status);
    setText(fields.productionSession, status.production_session_status);
    setText(fields.productionSelfTest, status.production_self_test_status);
    setText(fields.productionSessionNonReadiness, status.production_session_non_readiness);
    setText(fields.productionPreflight, status.production_preflight_status);
    setText(fields.productionPreflightBlockers, status.production_preflight_blockers);
    setText(fields.sessionDurableState, status.session_durable_state_status);
    setText(fields.sessionUnlockPolicy, status.session_unlock_policy_status);
    setText(fields.sessionUnlockNonReadiness, status.session_unlock_non_readiness);
    setText(fields.sessionUnlockCliRejection, status.session_unlock_cli_rejection_status);
    setText(fields.sessionUnlockCliRejectionFlags, status.session_unlock_cli_rejection_flags);
    setText(fields.transport, status.transport_status);
    setText(fields.networkExecution, status.network_execution_status);
    setText(fields.experimentalTransport, status.experimental_transport_status);
    setText(fields.bootstrapStatus, status.bootstrap_status_classification);
    setText(fields.transportIo, status.transport_io_status);
    setText(fields.storage, status.storage_status);
    setText(fields.verification, status.verification_status);
  } catch (_error) {
    renderAppStateSummary({
      secure_release: false,
      usable_messaging: false,
      network_execution_status: "network execution disabled",
      production_preflight_blockers:
        "session E2EE false transport send receive false storage rollback not-provided messaging false",
    });
    setText(fields.releaseClaim, "No secure-release claim");
    setText(fields.messaging, "No runtime messaging path");
    setText(fields.core, "Core boundary only");
    setText(fields.profile, "Profile boundary only");
    setText(fields.pairing, "Pairing boundary only");
    setText(fields.productionSession, "Snow Noise XX synchronous evaluation boundary only");
    setText(fields.productionSelfTest, "CLI production boundary self-test only");
    setText(
      fields.productionSessionNonReadiness,
      "No production E2EE claim network transport durable persistence or async messaging",
    );
    setText(fields.productionPreflight, "Read-only production skeleton blockers copy");
    setText(
      fields.productionPreflightBlockers,
      "Session E2EE false transport send receive false storage rollback not-provided messaging false",
    );
    setText(fields.sessionDurableState, "Read-only durable-state candidate blockers copy");
    setText(fields.sessionUnlockPolicy, "High-risk passphrase required OS-keystore-only rejected");
    setText(
      fields.sessionUnlockNonReadiness,
      "Product unlock durable persistence rollback runtime messaging disabled",
    );
    setText(fields.sessionUnlockCliRejection, "Redacted product-unlock-disabled boundary copy");
    setText(
      fields.sessionUnlockCliRejectionFlags,
      "Storage_opened=false session_records_written=false key_material_exposed=false runtime_messaging=false",
    );
    setText(fields.transport, "Pre-network fail-closed only");
    setText(fields.networkExecution, "Network execution disabled");
    setText(fields.experimentalTransport, "Manual bootstrap gate summary only");
    setText(
      fields.bootstrapStatus,
      "Network-disabled; censorship-or-bridge-required; timeout-or-transient-network-failure",
    );
    setText(fields.transportIo, "Hosting stream envelope messaging disabled");
    setText(fields.storage, "ADREC1 storage spike only");
    setText(fields.verification, "Lightweight checks only");
  }
}

async function runLocalDemo() {
  setDemoState("running", "Demo running");
  setText(fields.demoHint, "First run may take longer while Cargo builds the dev-insecure local demo.");
  setText(fields.demoWarning, "Running dev-insecure local demo.");
  setText(fields.demoOutput, "Running local dev-insecure demo...");
  renderDemoSteps([{ label: "Local command", status: "running", detail: "Waiting for Cargo and the CLI demo." }]);
  resetSimulationView();
  if (fields.runDemo) {
    fields.runDemo.disabled = true;
  }
  try {
    const result = await invoke("dev_local_demo");
    setDemoState("success", "Demo completed");
    setText(fields.demoHint, result.first_run_hint);
    setText(fields.demoWarning, result.warning.trim());
    renderDemoSteps(result.steps);
    renderFlowControls(result.simulation);
    setText(fields.demoOutput, result.transcript.trim());
  } catch (error) {
    setDemoState("failed", "Demo failed");
    setText(fields.demoHint, "Check Cargo, Rust, and Tauri prerequisites before running again.");
    setText(fields.demoWarning, "Local demo command failed.");
    renderDemoSteps([{ label: "Local command", status: "failed", detail: String(error) }]);
    resetSimulationView();
    setText(fields.demoOutput, `Local demo failed:\n${error}`);
  } finally {
    if (fields.runDemo) {
      fields.runDemo.disabled = false;
    }
  }
}

async function runLocalLoop() {
  const messages = localLoopMessages();
  if (messages.length === 0) {
    setLoopState("Loop needs messages");
    setText(fields.loopWarning, "Enter one local dev message per line.");
    return;
  }

  setLoopState("Loop running");
  setText(fields.loopWarning, "Running dev-insecure local message loop.");
  renderLoopResults([{ index: 1, sent: "waiting", received: "waiting", replay_check: "waiting for local loop" }]);
  if (fields.runLoop) {
    fields.runLoop.disabled = true;
  }
  try {
    const result = await invoke("dev_local_message_loop", { messages });
    setLoopState("Loop completed");
    setText(fields.loopWarning, result.warning.trim());
    renderLoopResults(result.messages);
    setText(fields.loopReplay, result.replay_summary);
    setText(fields.loopExpiry, result.expiry_summary);
    setText(fields.loopStorage, result.storage_guard);
    setText(fields.demoOutput, result.transcript.trim());
  } catch (error) {
    setLoopState("Loop failed");
    setText(fields.loopWarning, "Local message loop command failed.");
    renderLoopResults([{ index: 1, sent: "failed", received: "failed", replay_check: String(error) }]);
  } finally {
    if (fields.runLoop) {
      fields.runLoop.disabled = false;
    }
  }
}

async function runProductionTwoProfileRoundtrip() {
  const { profileA, profileB, passphrase, message } = productionTwoProfileInput();
  if (!profileA || !profileB || profileA === profileB || !passphrase || !message) {
    setProductionTwoProfileState("Two-profile roundtrip needs input");
    setText(
      fields.productionTwoProfileWarning,
      "Enter two distinct profiles, the production passphrase, and a message.",
    );
    return;
  }

  setProductionTwoProfileState("Two-profile roundtrip running");
  setText(fields.productionTwoProfileWarning, "Running app-data local production harness.");
  setText(fields.productionTwoProfileProfiles, "Waiting for profile unlock and payload export");
  setText(fields.productionTwoProfileSession, "Waiting for session draft and handshake");
  setText(fields.productionTwoProfileMessageState, "Waiting for encrypted envelope and receive");
  setText(fields.productionTwoProfileBoundary, "Waiting for boundary flags");
  setProductionFollowupActions(false, "Roundtrip running. Follow-up actions are locked.");
  productionBusyAction = "two-profile-roundtrip";
  applyProductionActionState();
  if (fields.runProductionTwoProfileRoundtrip) {
    fields.runProductionTwoProfileRoundtrip.disabled = true;
  }
  try {
    const result = await invoke("production_two_profile_roundtrip", {
      profileA,
      profileB,
      passphrase,
      message,
    });
    setProductionTwoProfileState("Two-profile roundtrip completed");
    setText(fields.productionTwoProfileWarning, result.warning);
    renderProductionTwoProfileResult(result);
    await loadProductionProfileList();
  } catch (error) {
    setProductionTwoProfileState("Two-profile roundtrip failed");
    setText(fields.productionTwoProfileWarning, String(error));
    setText(fields.productionTwoProfileProfiles, "Failed");
    setText(fields.productionTwoProfileSession, "Failed");
    setText(fields.productionTwoProfileMessageState, "Failed");
    setText(fields.productionTwoProfileBoundary, "Failed");
    setProductionFollowupActions(false, "Fix the failed roundtrip before continuing.");
  } finally {
    productionBusyAction = null;
    if (fields.runProductionTwoProfileRoundtrip) {
      fields.runProductionTwoProfileRoundtrip.disabled = false;
    }
    applyProductionActionState();
  }
}

async function runProductionRoundtrip() {
  const message = productionRoundtripMessage();
  if (!message) {
    setProductionRoundtripState("Roundtrip needs a message");
    setText(fields.productionRoundtripWarning, "Enter a production local message.");
    return;
  }

  setProductionRoundtripState("Roundtrip running");
  setText(fields.productionRoundtripWarning, "Running production core local roundtrip.");
  setText(fields.productionRoundtripSession, "Waiting for profile, identity, pairing, and handshake");
  setText(fields.productionRoundtripEnvelope, "Waiting for encrypted envelope");
  setText(fields.productionRoundtripReceive, "Waiting for received message store");
  setText(fields.productionRoundtripBoundary, "Waiting for boundary flags");
  if (fields.runProductionRoundtrip) {
    fields.runProductionRoundtrip.disabled = true;
  }
  try {
    const result = await invoke("production_local_roundtrip", { message });
    setProductionRoundtripState("Roundtrip completed");
    setText(fields.productionRoundtripWarning, result.warning);
    setText(
      fields.productionRoundtripSession,
      `profiles=${result.profile_stores_opened} identities=${result.identities_created} pairing=${result.pairing_payloads_created} drafts=${result.session_drafts_written} transport_state=${result.transport_state_persisted}`,
    );
    setText(
      fields.productionRoundtripEnvelope,
      `prepared=${result.outbound_message_prepared} encrypted_export=${result.encrypted_envelope_exported}`,
    );
    setText(
      fields.productionRoundtripReceive,
      `stored=${result.inbound_message_stored} status=${result.received_status_verified} export_match=${result.received_export_matches_input}`,
    );
    setText(
      fields.productionRoundtripBoundary,
      `plaintext_returned=${result.plaintext_returned_to_frontend} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setProductionRoundtripState("Roundtrip failed");
    setText(fields.productionRoundtripWarning, String(error));
    setText(fields.productionRoundtripSession, "Failed");
    setText(fields.productionRoundtripEnvelope, "Failed");
    setText(fields.productionRoundtripReceive, "Failed");
    setText(fields.productionRoundtripBoundary, "Failed");
  } finally {
    if (fields.runProductionRoundtrip) {
      fields.runProductionRoundtrip.disabled = false;
    }
  }
}

async function unlockProductionProfile() {
  const { profile, passphrase } = productionProfileInput();
  if (!profile || !passphrase) {
    setProductionProfileState("Profile unlock needs input");
    setText(fields.productionProfileWarning, "Enter a profile name and passphrase.");
    return;
  }

  setProductionProfileState("Profile unlock running");
  setText(fields.productionProfileWarning, "Opening production profile store.");
  setText(fields.productionProfileStorage, "Waiting for app-data encrypted store");
  setText(fields.productionProfileIdentity, "Waiting for identity status");
  setText(fields.productionProfileBoundary, "Waiting for boundary flags");
  productionBusyAction = "profile-unlock";
  applyProductionActionState();
  if (fields.unlockProductionProfile) {
    fields.unlockProductionProfile.disabled = true;
  }
  try {
    const result = await invoke("production_profile_unlock", { profile, passphrase });
    const view = productionProfileUnlockView(result);
    setProductionProfileState("Profile unlocked");
    setText(fields.productionProfileWarning, result.warning);
    setText(fields.productionProfileStorage, view.storage);
    setText(fields.productionProfileIdentity, view.identity);
    setText(fields.productionProfileBoundary, view.boundary);
    await loadProductionProfileList();
  } catch (error) {
    setProductionProfileState("Profile unlock failed");
    setText(fields.productionProfileWarning, String(error));
    setText(fields.productionProfileStorage, "Failed");
    setText(fields.productionProfileIdentity, "Failed");
    setText(fields.productionProfileBoundary, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.unlockProductionProfile) {
      fields.unlockProductionProfile.disabled = false;
    }
    applyProductionActionState();
  }
}

async function exportProductionPairingPayload() {
  const { profile, passphrase, rendezvousEndpoint } = productionPairingInput();
  if (!profile || !passphrase || !rendezvousEndpoint) {
    setProductionPairingState("Pairing payload needs input");
    setText(fields.productionPairingWarning, "Enter profile, passphrase, and onion endpoint.");
    return;
  }

  setProductionPairingState("Pairing payload exporting");
  setText(fields.productionPairingWarning, "Creating public production pairing payload.");
  if (fields.productionPairingPayload) {
    fields.productionPairingPayload.value = "";
  }
  setText(fields.productionPairingStorage, "Waiting for profile identity and pairing key state");
  setText(fields.productionPairingBoundary, "Waiting for boundary flags");
  productionBusyAction = "pairing-payload";
  applyProductionActionState();
  if (fields.exportProductionPairing) {
    fields.exportProductionPairing.disabled = true;
  }
  try {
    const result = await invoke("production_pairing_payload_export", {
      profile,
      passphrase,
      rendezvousEndpoint,
    });
    const view = productionPairingPayloadView(result);
    setProductionPairingState("Pairing payload exported");
    setText(fields.productionPairingWarning, result.warning);
    if (fields.productionPairingPayload) {
      fields.productionPairingPayload.value = result.pairing_payload;
    }
    applyProductionActionState();
    setText(fields.productionPairingStorage, view.storage);
    setText(fields.productionPairingBoundary, view.boundary);
  } catch (error) {
    setProductionPairingState("Pairing payload export failed");
    setText(fields.productionPairingWarning, String(error));
    if (fields.productionPairingPayload) {
      fields.productionPairingPayload.value = "";
    }
    setText(fields.productionPairingStorage, "Failed");
    setText(fields.productionPairingBoundary, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.exportProductionPairing) {
      fields.exportProductionPairing.disabled = false;
    }
    applyProductionActionState();
  }
}

async function saveProductionSessionDraft() {
  const { profile, passphrase, localPayload, remotePayload } = productionPairingInput();
  if (!profile || !passphrase || !localPayload || !remotePayload) {
    setProductionPairingState("Session draft needs payloads");
    setText(fields.productionPairingWarning, "Export local payload and paste a remote payload.");
    return;
  }

  setProductionPairingState("Session draft saving");
  setText(fields.productionPairingWarning, "Saving production session draft.");
  setText(fields.productionPairingSession, "Waiting for session draft, endpoint, and replay state");
  setText(fields.productionPairingBoundary, "Waiting for boundary flags");
  productionBusyAction = "session-draft";
  applyProductionActionState();
  if (fields.saveProductionSessionDraft) {
    fields.saveProductionSessionDraft.disabled = true;
  }
  try {
    const result = await invoke("production_pairing_session_draft_save", {
      profile,
      passphrase,
      localPayload,
      remotePayload,
    });
    const view = productionSessionDraftView(result);
    setProductionPairingState("Session draft saved");
    setText(fields.productionPairingWarning, result.warning);
    setText(fields.productionPairingSession, view.session);
    setText(fields.productionPairingStorage, view.storage);
    setText(fields.productionPairingBoundary, view.boundary);
    if (result.session_draft_present) {
      await checkProductionSessionState();
    }
  } catch (error) {
    setProductionPairingState("Session draft save failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionPairingSession, "Failed");
    setText(fields.productionPairingBoundary, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.saveProductionSessionDraft) {
      fields.saveProductionSessionDraft.disabled = false;
    }
    applyProductionActionState();
  }
}

async function checkProductionSessionState() {
  const { profile, passphrase } = productionPairingInput();
  if (!profile || !passphrase) {
    setProductionPairingState("Session state needs profile");
    setText(fields.productionPairingWarning, "Enter profile and passphrase.");
    return;
  }

  setProductionPairingState("Session state checking");
  productionBusyAction = "session-state";
  applyProductionActionState();
  if (fields.checkProductionSessionState) {
    fields.checkProductionSessionState.disabled = true;
  }
  try {
    const result = await invoke("production_session_state_check", { profile, passphrase });
    const view = productionSessionStateView(result);
    latestProductionSessionState = result;
    setProductionPairingState("Session state checked");
    setText(fields.productionPairingWarning, result.warning);
    setText(fields.productionPairingSession, view.session);
    setText(fields.productionPairingBoundary, view.pairingBoundary);
    setText(fields.productionMessageBoundary, view.messageBoundary);
  } catch (error) {
    latestProductionSessionState = null;
    setProductionPairingState("Session state check failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionPairingSession, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.checkProductionSessionState) {
      fields.checkProductionSessionState.disabled = false;
    }
    applyProductionActionState();
  }
}

function setHandshakePayload(node, value) {
  if (node) {
    node.value = value ?? "";
  }
}

function renderHandshakePayloadResult(result, outputField) {
  const view = productionHandshakePayloadView(result);
  setProductionPairingState("Handshake step completed");
  setText(fields.productionPairingWarning, result.warning);
  setHandshakePayload(outputField, result.output_payload);
  setText(fields.productionHandshakeState, view.state);
  setText(fields.productionPairingBoundary, view.boundary);
  applyProductionActionState();
}

async function exportProductionHandshakeInit() {
  const { profile, passphrase } = productionPairingInput();
  if (!profile || !passphrase) {
    setProductionPairingState("Handshake init needs profile");
    setText(fields.productionPairingWarning, "Enter profile and passphrase.");
    return;
  }

  setProductionPairingState("Handshake init exporting");
  productionBusyAction = "handshake-init";
  applyProductionActionState();
  if (fields.exportProductionHandshakeInit) {
    fields.exportProductionHandshakeInit.disabled = true;
  }
  try {
    const result = await invoke("production_handshake_init_export", { profile, passphrase });
    renderHandshakePayloadResult(result, fields.productionHandshakeInitPayload);
  } catch (error) {
    setProductionPairingState("Handshake init failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionHandshakeState, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.exportProductionHandshakeInit) {
      fields.exportProductionHandshakeInit.disabled = false;
    }
    applyProductionActionState();
  }
}

async function exportProductionHandshakeReply() {
  const { profile, passphrase, initPayload } = productionPairingInput();
  if (!profile || !passphrase || !initPayload) {
    setProductionPairingState("Handshake reply needs init");
    setText(fields.productionPairingWarning, "Paste a remote handshake init payload.");
    return;
  }

  setProductionPairingState("Handshake reply exporting");
  productionBusyAction = "handshake-reply";
  applyProductionActionState();
  if (fields.exportProductionHandshakeReply) {
    fields.exportProductionHandshakeReply.disabled = true;
  }
  try {
    const result = await invoke("production_handshake_reply_export", {
      profile,
      passphrase,
      initPayload,
    });
    renderHandshakePayloadResult(result, fields.productionHandshakeReplyPayload);
  } catch (error) {
    setProductionPairingState("Handshake reply failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionHandshakeState, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.exportProductionHandshakeReply) {
      fields.exportProductionHandshakeReply.disabled = false;
    }
    applyProductionActionState();
  }
}

async function exportProductionHandshakeFinish() {
  const { profile, passphrase, replyPayload } = productionPairingInput();
  if (!profile || !passphrase || !replyPayload) {
    setProductionPairingState("Handshake finish needs reply");
    setText(fields.productionPairingWarning, "Paste a remote handshake reply payload.");
    return;
  }

  setProductionPairingState("Handshake finish exporting");
  productionBusyAction = "handshake-finish";
  applyProductionActionState();
  if (fields.exportProductionHandshakeFinish) {
    fields.exportProductionHandshakeFinish.disabled = true;
  }
  try {
    const result = await invoke("production_handshake_finish_export", {
      profile,
      passphrase,
      replyPayload,
    });
    renderHandshakePayloadResult(result, fields.productionHandshakeFinishPayload);
  } catch (error) {
    setProductionPairingState("Handshake finish failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionHandshakeState, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.exportProductionHandshakeFinish) {
      fields.exportProductionHandshakeFinish.disabled = false;
    }
    applyProductionActionState();
  }
}

async function importProductionHandshakeFinish() {
  const { profile, passphrase, finishPayload } = productionPairingInput();
  if (!profile || !passphrase || !finishPayload) {
    setProductionPairingState("Handshake import needs finish");
    setText(fields.productionPairingWarning, "Paste a remote handshake finish payload.");
    return;
  }

  setProductionPairingState("Handshake finish importing");
  productionBusyAction = "handshake-finish-import";
  applyProductionActionState();
  if (fields.importProductionHandshakeFinish) {
    fields.importProductionHandshakeFinish.disabled = true;
  }
  try {
    const result = await invoke("production_handshake_finish_import", {
      profile,
      passphrase,
      finishPayload,
    });
    const view = productionHandshakeFinishImportView(result);
    setProductionPairingState("Handshake finish imported");
    setText(fields.productionPairingWarning, result.warning);
    setText(fields.productionHandshakeState, view.state);
    setText(fields.productionPairingBoundary, view.boundary);
    await checkProductionSessionState();
  } catch (error) {
    setProductionPairingState("Handshake finish import failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionHandshakeState, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.importProductionHandshakeFinish) {
      fields.importProductionHandshakeFinish.disabled = false;
    }
    applyProductionActionState();
  }
}

async function exportProductionMessageEnvelope() {
  const { profile, passphrase, messageNumber, message } = productionMessageInput();
  if (!profile || !passphrase || !Number.isInteger(messageNumber) || messageNumber < 1 || !message) {
    setProductionMessageState("Message export needs input");
    setText(fields.productionMessageWarning, "Enter profile, passphrase, number, and message.");
    return;
  }

  setProductionMessageState("Message envelope exporting");
  setText(fields.productionMessageWarning, "Preparing and encrypting production message.");
  if (fields.productionMessageEnvelope) {
    fields.productionMessageEnvelope.value = "";
  }
  productionBusyAction = "message-export";
  applyProductionActionState();
  if (fields.exportProductionMessageEnvelope) {
    fields.exportProductionMessageEnvelope.disabled = true;
  }
  try {
    const result = await invoke("production_message_envelope_export", {
      profile,
      passphrase,
      messageNumber,
      message,
    });
    const view = productionMessageEnvelopeExportView(result);
    setProductionMessageState("Message envelope exported");
    setText(fields.productionMessageWarning, result.warning);
    if (fields.productionMessageEnvelope) {
      fields.productionMessageEnvelope.value = result.envelope_payload;
    }
    applyProductionActionState();
    setText(fields.productionMessageOutbound, view.outbound);
    setText(fields.productionMessageInbound, "Not imported yet");
    setText(fields.productionMessageBoundary, view.boundary);
  } catch (error) {
    setProductionMessageState("Message envelope export failed");
    setText(fields.productionMessageWarning, String(error));
    setText(fields.productionMessageOutbound, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.exportProductionMessageEnvelope) {
      fields.exportProductionMessageEnvelope.disabled = false;
    }
    applyProductionActionState();
  }
}

async function importProductionMessageEnvelope() {
  const { profile, passphrase, messageNumber, envelopePayload } = productionMessageInput();
  if (
    !profile ||
    !passphrase ||
    !Number.isInteger(messageNumber) ||
    messageNumber < 1 ||
    !envelopePayload
  ) {
    setProductionMessageState("Message import needs envelope");
    setText(fields.productionMessageWarning, "Enter profile, passphrase, number, and envelope.");
    return;
  }

  setProductionMessageState("Message envelope importing");
  setText(fields.productionMessageWarning, "Importing and decrypting production envelope.");
  productionBusyAction = "message-import";
  applyProductionActionState();
  if (fields.importProductionMessageEnvelope) {
    fields.importProductionMessageEnvelope.disabled = true;
  }
  try {
    const result = await invoke("production_message_envelope_import", {
      profile,
      passphrase,
      messageNumber,
      envelopePayload,
    });
    const view = productionMessageEnvelopeImportView(result);
    setProductionMessageState("Message envelope imported");
    setText(fields.productionMessageWarning, result.warning);
    setText(fields.productionMessageOutbound, "Not exported in this profile");
    setText(fields.productionMessageInbound, view.inbound);
    setText(fields.productionMessageBoundary, view.boundary);
  } catch (error) {
    setProductionMessageState("Message envelope import failed");
    setText(fields.productionMessageWarning, String(error));
    setText(fields.productionMessageInbound, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.importProductionMessageEnvelope) {
      fields.importProductionMessageEnvelope.disabled = false;
    }
    applyProductionActionState();
  }
}

async function exportProductionReceivedMessage() {
  const { profile, passphrase, messageNumber } = productionMessageInput();
  if (!profile || !passphrase || !Number.isInteger(messageNumber) || messageNumber < 1) {
    setProductionMessageState("Received export needs input");
    setText(fields.productionMessageWarning, "Enter profile, passphrase, and message number.");
    return;
  }

  setProductionMessageState("Received message exporting");
  setText(fields.productionMessageWarning, "Reading received message after local unlock.");
  productionBusyAction = "received-export";
  applyProductionActionState();
  if (fields.exportProductionReceivedMessage) {
    fields.exportProductionReceivedMessage.disabled = true;
  }
  try {
    const result = await invoke("production_message_received_export", {
      profile,
      passphrase,
      messageNumber,
    });
    const view = productionReceivedMessageExportView(result);
    setProductionMessageState("Received message exported");
    setText(fields.productionMessageWarning, result.warning);
    if (fields.productionReceivedMessage) {
      fields.productionReceivedMessage.value = result.received_message;
    }
    setText(fields.productionMessageInbound, view.inbound);
    setText(fields.productionMessageBoundary, view.boundary);
  } catch (error) {
    setProductionMessageState("Received message export failed");
    setText(fields.productionMessageWarning, String(error));
    setText(fields.productionMessageInbound, "Failed");
  } finally {
    productionBusyAction = null;
    if (fields.exportProductionReceivedMessage) {
      fields.exportProductionReceivedMessage.disabled = false;
    }
    applyProductionActionState();
  }
}

if (fields.runDemo) {
  fields.runDemo.addEventListener("click", runLocalDemo);
}

if (fields.themeToggle) {
  fields.themeToggle.addEventListener("click", toggleTheme);
}

if (fields.productionProfileSelector) {
  fields.productionProfileSelector.addEventListener("change", () => {
    if (fields.productionProfileName && fields.productionProfileSelector.value) {
      fields.productionProfileName.value = fields.productionProfileSelector.value;
      resetProductionPairingView();
      resetProductionMessageView();
      applyProductionActionState();
    }
  });
}

if (fields.useAliceProductionProfile) {
  fields.useAliceProductionProfile.addEventListener("click", () =>
    applyProductionProfilePreset("alice"),
  );
}

if (fields.useBobProductionProfile) {
  fields.useBobProductionProfile.addEventListener("click", () =>
    applyProductionProfilePreset("bob"),
  );
}

for (const input of [
  fields.productionProfileName,
  fields.productionProfilePassphrase,
  fields.productionPairingEndpoint,
  fields.productionPairingPayload,
  fields.productionRemotePairingPayload,
  fields.productionRemoteHandshakeInitPayload,
  fields.productionRemoteHandshakeReplyPayload,
  fields.productionRemoteHandshakeFinishPayload,
  fields.productionMessageNumber,
  fields.productionMessageBody,
  fields.productionRemoteMessageEnvelope,
  fields.productionTwoProfileA,
  fields.productionTwoProfileB,
  fields.productionTwoProfilePassphrase,
  fields.productionTwoProfileMessage,
]) {
  if (input) {
    input.addEventListener("input", applyProductionActionState);
  }
}

if (fields.unlockProductionProfile) {
  fields.unlockProductionProfile.addEventListener("click", unlockProductionProfile);
}

if (fields.exportProductionPairing) {
  fields.exportProductionPairing.addEventListener("click", exportProductionPairingPayload);
}

if (fields.useProductionPairingPayload) {
  fields.useProductionPairingPayload.addEventListener("click", () =>
    moveLocalPayload(
      fields.productionPairingPayload,
      fields.productionRemotePairingPayload,
      "Pairing payload",
    ),
  );
}

if (fields.saveProductionSessionDraft) {
  fields.saveProductionSessionDraft.addEventListener("click", saveProductionSessionDraft);
}

if (fields.exportProductionHandshakeInit) {
  fields.exportProductionHandshakeInit.addEventListener("click", exportProductionHandshakeInit);
}

if (fields.useProductionHandshakeInit) {
  fields.useProductionHandshakeInit.addEventListener("click", () =>
    moveLocalPayload(
      fields.productionHandshakeInitPayload,
      fields.productionRemoteHandshakeInitPayload,
      "Handshake init",
    ),
  );
}

if (fields.exportProductionHandshakeReply) {
  fields.exportProductionHandshakeReply.addEventListener("click", exportProductionHandshakeReply);
}

if (fields.useProductionHandshakeReply) {
  fields.useProductionHandshakeReply.addEventListener("click", () =>
    moveLocalPayload(
      fields.productionHandshakeReplyPayload,
      fields.productionRemoteHandshakeReplyPayload,
      "Handshake reply",
    ),
  );
}

if (fields.exportProductionHandshakeFinish) {
  fields.exportProductionHandshakeFinish.addEventListener("click", exportProductionHandshakeFinish);
}

if (fields.useProductionHandshakeFinish) {
  fields.useProductionHandshakeFinish.addEventListener("click", () =>
    moveLocalPayload(
      fields.productionHandshakeFinishPayload,
      fields.productionRemoteHandshakeFinishPayload,
      "Handshake finish",
    ),
  );
}

if (fields.importProductionHandshakeFinish) {
  fields.importProductionHandshakeFinish.addEventListener("click", importProductionHandshakeFinish);
}

if (fields.checkProductionSessionState) {
  fields.checkProductionSessionState.addEventListener("click", checkProductionSessionState);
}

if (fields.exportProductionMessageEnvelope) {
  fields.exportProductionMessageEnvelope.addEventListener("click", exportProductionMessageEnvelope);
}

if (fields.useProductionMessageEnvelope) {
  fields.useProductionMessageEnvelope.addEventListener("click", moveLocalMessageEnvelope);
}

if (fields.importProductionMessageEnvelope) {
  fields.importProductionMessageEnvelope.addEventListener("click", importProductionMessageEnvelope);
}

if (fields.exportProductionReceivedMessage) {
  fields.exportProductionReceivedMessage.addEventListener("click", exportProductionReceivedMessage);
}

if (fields.runProductionRoundtrip) {
  fields.runProductionRoundtrip.addEventListener("click", runProductionRoundtrip);
}

if (fields.runProductionTwoProfileRoundtrip) {
  fields.runProductionTwoProfileRoundtrip.addEventListener(
    "click",
    runProductionTwoProfileRoundtrip,
  );
}

if (fields.openManualProductionTools) {
  fields.openManualProductionTools.addEventListener("click", openManualProductionTools);
}

if (fields.focusLocalDiagnostic) {
  fields.focusLocalDiagnostic.addEventListener("click", focusLocalDiagnostic);
}

if (fields.editTwoProfileMessage) {
  fields.editTwoProfileMessage.addEventListener("click", editTwoProfileMessage);
}

if (fields.runLoop) {
  fields.runLoop.addEventListener("click", runLocalLoop);
}

if (fields.resetLoop) {
  fields.resetLoop.addEventListener("click", resetLoopView);
}

initializeTheme();
renderPrototypeStatus();
resetSimulationView();
resetProductionProfileView();
resetProductionPairingView();
resetProductionMessageView();
resetProductionTwoProfileView();
resetProductionRoundtripView();
resetLoopView();
loadProductionProfileList();
