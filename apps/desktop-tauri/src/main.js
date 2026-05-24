import { invoke } from "@tauri-apps/api/core";
import {
  productionActionAvailability,
  productionCounterpartProfile,
  productionHandshakeFinishImportView,
  productionHandshakePayloadView,
  productionManualMessageCheckView,
  productionManualNextActions,
  productionManualRelayAvailability,
  productionManualMessageStatusView,
  productionManualStatusView,
  productionMessageEnvelopeExportView,
  productionMessageEnvelopeImportView,
  productionPairingPayloadView,
  productionProfileMessageReadiness,
  productionProfilePreset,
  productionProfileUnlockView,
  productionReceivedMessageExportView,
  productionSessionDraftView,
  productionSessionStateView,
  productionTwoProfileMessageResultView,
  productionTwoProfileResultView,
  productionTwoProfileSessionStatusView,
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
  productionManualRoute: document.querySelector("#production-manual-route"),
  productionManualDirection: document.querySelector("#production-manual-direction"),
  productionManualSlots: document.querySelector("#production-manual-slots"),
  productionManualMode: document.querySelector("#production-manual-mode"),
  productionManualPolicy: document.querySelector("#production-manual-policy"),
  productionTwoProfileSessionStatus: document.querySelector("#production-two-profile-session-status"),
  checkProductionTwoProfileSessionStatus: document.querySelector(
    "#check-production-two-profile-session-status",
  ),
  productionPairingEndpoint: document.querySelector("#production-pairing-endpoint"),
  exportProductionPairing: document.querySelector("#export-production-pairing"),
  productionPairingState: document.querySelector("#production-pairing-state"),
  productionPairingNextAction: document.querySelector("#production-pairing-next-action"),
  productionPairingWarning: document.querySelector("#production-pairing-warning"),
  productionPairingPayload: document.querySelector("#production-pairing-payload"),
  useProductionPairingPayload: document.querySelector("#use-production-pairing-payload"),
  storeProductionPairingPayload: document.querySelector("#store-production-pairing-payload"),
  loadProductionPairingPayload: document.querySelector("#load-production-pairing-payload"),
  productionRemotePairingPayload: document.querySelector("#production-remote-pairing-payload"),
  saveProductionSessionDraft: document.querySelector("#save-production-session-draft"),
  productionHandshakeInitPayload: document.querySelector("#production-handshake-init-payload"),
  useProductionHandshakeInit: document.querySelector("#use-production-handshake-init"),
  storeProductionHandshakeInit: document.querySelector("#store-production-handshake-init"),
  loadProductionHandshakeInit: document.querySelector("#load-production-handshake-init"),
  productionRemoteHandshakeInitPayload: document.querySelector(
    "#production-remote-handshake-init-payload",
  ),
  productionHandshakeReplyPayload: document.querySelector("#production-handshake-reply-payload"),
  useProductionHandshakeReply: document.querySelector("#use-production-handshake-reply"),
  storeProductionHandshakeReply: document.querySelector("#store-production-handshake-reply"),
  loadProductionHandshakeReply: document.querySelector("#load-production-handshake-reply"),
  productionRemoteHandshakeReplyPayload: document.querySelector(
    "#production-remote-handshake-reply-payload",
  ),
  productionHandshakeFinishPayload: document.querySelector("#production-handshake-finish-payload"),
  useProductionHandshakeFinish: document.querySelector("#use-production-handshake-finish"),
  storeProductionHandshakeFinish: document.querySelector("#store-production-handshake-finish"),
  loadProductionHandshakeFinish: document.querySelector("#load-production-handshake-finish"),
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
  productionMessageAutoNumber: document.querySelector("#production-message-auto-number"),
  productionMessageNumber: document.querySelector("#production-message-number"),
  productionMessageBody: document.querySelector("#production-message-body"),
  exportProductionMessageEnvelope: document.querySelector("#export-production-message-envelope"),
  productionMessageState: document.querySelector("#production-message-state"),
  productionMessageNextAction: document.querySelector("#production-message-next-action"),
  productionMessageWarning: document.querySelector("#production-message-warning"),
  productionMessageEnvelope: document.querySelector("#production-message-envelope"),
  useProductionMessageEnvelope: document.querySelector("#use-production-message-envelope"),
  storeProductionMessageEnvelope: document.querySelector("#store-production-message-envelope"),
  loadProductionMessageEnvelope: document.querySelector("#load-production-message-envelope"),
  relayProductionMessageEnvelope: document.querySelector("#relay-production-message-envelope"),
  productionRemoteMessageEnvelope: document.querySelector("#production-remote-message-envelope"),
  importProductionMessageEnvelope: document.querySelector("#import-production-message-envelope"),
  exportProductionReceivedMessage: document.querySelector("#export-production-received-message"),
  productionReceivedMessage: document.querySelector("#production-received-message"),
  loadProductionMessageTranscript: document.querySelector("#load-production-message-transcript"),
  productionMessageTranscript: document.querySelector("#production-message-transcript"),
  productionMessageActiveStatus: document.querySelector("#production-message-active-status"),
  productionMessageManualCheck: document.querySelector("#production-message-manual-check"),
  productionMessageOutbound: document.querySelector("#production-message-outbound"),
  productionMessageInbound: document.querySelector("#production-message-inbound"),
  productionMessageBoundary: document.querySelector("#production-message-boundary"),
  productionTwoProfileA: document.querySelector("#production-two-profile-a"),
  productionTwoProfileB: document.querySelector("#production-two-profile-b"),
  productionTwoProfileDirection: document.querySelector("#production-two-profile-direction"),
  productionTwoProfileStepSession: document.querySelector("#production-two-profile-step-session"),
  productionTwoProfileStepSessionDetail: document.querySelector(
    "#production-two-profile-step-session-detail",
  ),
  productionTwoProfileStepCompose: document.querySelector("#production-two-profile-step-compose"),
  productionTwoProfileStepComposeDetail: document.querySelector(
    "#production-two-profile-step-compose-detail",
  ),
  productionTwoProfileStepSend: document.querySelector("#production-two-profile-step-send"),
  productionTwoProfileStepSendDetail: document.querySelector("#production-two-profile-step-send-detail"),
  productionTwoProfileStepReply: document.querySelector("#production-two-profile-step-reply"),
  productionTwoProfileStepReplyDetail: document.querySelector(
    "#production-two-profile-step-reply-detail",
  ),
  productionTwoProfilePassphrase: document.querySelector("#production-two-profile-passphrase"),
  productionTwoProfileMessage: document.querySelector("#production-two-profile-message"),
  runProductionTwoProfileRoundtrip: document.querySelector("#run-production-two-profile-roundtrip"),
  checkProductionTwoProfileSessionStatusInline: document.querySelector(
    "#check-production-two-profile-session-status-inline",
  ),
  runProductionTwoProfileMessageRoundtrip: document.querySelector(
    "#run-production-two-profile-message-roundtrip",
  ),
  productionTwoProfileReadiness: document.querySelector("#production-two-profile-readiness"),
  productionTwoProfileState: document.querySelector("#production-two-profile-state"),
  productionTwoProfileWarning: document.querySelector("#production-two-profile-warning"),
  productionTwoProfileProfiles: document.querySelector("#production-two-profile-profiles"),
  productionTwoProfileSession: document.querySelector("#production-two-profile-session"),
  productionTwoProfileMessageState: document.querySelector("#production-two-profile-message-state"),
  productionTwoProfileBoundary: document.querySelector("#production-two-profile-boundary"),
  productionTwoProfileCurrentInput: document.querySelector("#production-two-profile-current-input"),
  productionTwoProfileLastSuccess: document.querySelector("#production-two-profile-last-success"),
  loadProductionTwoProfileTranscript: document.querySelector("#load-production-two-profile-transcript"),
  replyLatestTwoProfileMessage: document.querySelector("#reply-latest-two-profile-message"),
  reviewPendingTwoProfileMessage: document.querySelector("#review-pending-two-profile-message"),
  productionTwoProfileTranscript: document.querySelector("#production-two-profile-transcript"),
  productionTwoProfileNextStep: document.querySelector("#production-two-profile-next-step"),
  openManualProductionTools: document.querySelector("#open-manual-production-tools"),
  focusLocalDiagnostic: document.querySelector("#focus-local-diagnostic"),
  swapTwoProfileDirection: document.querySelector("#swap-two-profile-direction"),
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
let latestProductionTwoProfileSessionStatus = null;
let latestProductionTwoProfileSuccess = null;
let latestProductionMessageImport = null;
let productionBusyAction = null;
let twoProfileAutoResumeTimer = null;
let latestTwoProfileAutoResumeFingerprint = null;
let selectedTwoProfileConversationKey = null;
const productionTranscriptEntryKeys = new Set();
const productionTwoProfileConversationEntries = new Map();
const productionPayloadSlots = {
  pairing: new Map(),
  handshakeInit: new Map(),
  handshakeReply: new Map(),
  handshakeFinish: new Map(),
  messageEnvelope: new Map(),
};

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

function setActionButtonState(node, disabled, reason, current = false) {
  if (!node) {
    return;
  }
  node.disabled = disabled;
  node.title = disabled ? reason : "";
  node.classList.toggle("is-current-action", !disabled && current);
}

function setProductionMessageManualCurrent(target) {
  fields.productionMessageManualCheck?.classList.toggle("is-current-manual", target === "check");
  fields.productionMessageOutbound?.classList.toggle("is-current-manual", target === "outbound");
  fields.productionMessageInbound?.classList.toggle("is-current-manual", target === "inbound");
}

function setTwoProfileComposeLocked(locked) {
  if (!fields.productionTwoProfileMessage) {
    return;
  }
  fields.productionTwoProfileMessage.readOnly = locked;
  fields.productionTwoProfileMessage.setAttribute("aria-busy", String(locked));
  fields.productionTwoProfileMessage.title = locked ? "Two-profile action is running." : "";
}

function setProductionFollowupActions(enabled, message) {
  setText(fields.productionTwoProfileNextStep, message);
  setDisabled(fields.openManualProductionTools, !enabled);
  setDisabled(fields.focusLocalDiagnostic, !enabled);
  setDisabled(fields.swapTwoProfileDirection, !enabled);
  setDisabled(fields.editTwoProfileMessage, !enabled);
}

function setProductionTwoProfileReadiness(message, state = "blocked") {
  const node = fields.productionTwoProfileReadiness;
  if (!node) {
    return;
  }
  node.textContent = message;
  node.classList.remove("is-ready", "is-setup", "is-compose", "is-blocked");
  node.classList.add(`is-${state}`);
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

function productionMessageUsesAutoNumber() {
  return fields.productionMessageAutoNumber?.checked ?? true;
}

function productionMessageImportFingerprint(input = productionMessageInput()) {
  const profile = String(input.profile ?? "").trim().toLowerCase();
  const messageNumber = Number.isInteger(input.messageNumber) ? input.messageNumber : "invalid";
  return `${profile}\n${messageNumber}`;
}

function latestProductionMessageImportMatches(input = productionMessageInput()) {
  return latestProductionMessageImport === productionMessageImportFingerprint(input);
}

function productionSessionReadyForMessages() {
  const activeProfile = activeProductionProfileName();
  const scopedTwoProfileStatus = latestTwoProfileSessionStatusForCurrentInput();
  return productionProfileMessageReadiness(
    activeProfile,
    latestProductionSessionState,
    scopedTwoProfileStatus,
  );
}

function activeProductionProfileName() {
  return (fields.productionProfileName?.value ?? "").trim().toLowerCase();
}

function syncProductionPassphrases(source) {
  const profilePassphrase = fields.productionProfilePassphrase;
  const twoProfilePassphrase = fields.productionTwoProfilePassphrase;
  if (!profilePassphrase || !twoProfilePassphrase) {
    return;
  }
  const value =
    source === "profile"
      ? profilePassphrase.value
      : source === "two-profile"
        ? twoProfilePassphrase.value
        : twoProfilePassphrase.value || profilePassphrase.value;
  if (profilePassphrase.value !== value) {
    profilePassphrase.value = value;
  }
  if (twoProfilePassphrase.value !== value) {
    twoProfilePassphrase.value = value;
  }
}

function syncProductionProfilePassphraseFromTwoProfile() {
  syncProductionPassphrases("two-profile");
}

function syncProductionTwoProfilePassphraseFromProfile() {
  syncProductionPassphrases("profile");
}

function twoProfileSessionStatusFingerprint(input = productionTwoProfileInput()) {
  return `${input.profileA.toLowerCase()}\n${input.profileB.toLowerCase()}`;
}

function twoProfileAutoResumeFingerprint(input = productionTwoProfileInput()) {
  return `${twoProfileSessionStatusFingerprint(input)}\n${input.passphrase ? "passphrase-present" : "passphrase-missing"}`;
}

function resetTwoProfileAutoResumeAttempt() {
  latestTwoProfileAutoResumeFingerprint = null;
}

function latestTwoProfileSessionStatusForCurrentInput(input = productionTwoProfileInput()) {
  if (!latestProductionTwoProfileSessionStatus) {
    return null;
  }
  const currentFingerprint = twoProfileSessionStatusFingerprint(input);
  return latestProductionTwoProfileSessionStatus.fingerprint === currentFingerprint
    ? latestProductionTwoProfileSessionStatus.result
    : null;
}

function rememberTwoProfileSessionStatus(input, result) {
  latestProductionTwoProfileSessionStatus = {
    fingerprint: twoProfileSessionStatusFingerprint(input),
    result,
  };
}

function latestTwoProfileSuccessMatchesDirection(input = productionTwoProfileInput()) {
  return Boolean(
    latestProductionTwoProfileSuccess &&
      latestProductionTwoProfileSuccess.profileA === input.profileA &&
      latestProductionTwoProfileSuccess.profileB === input.profileB,
  );
}

function latestTwoProfileSuccessMatchesOppositeDirection(input = productionTwoProfileInput()) {
  return Boolean(
    latestProductionTwoProfileSuccess &&
      latestProductionTwoProfileSuccess.profileA === input.profileB &&
      latestProductionTwoProfileSuccess.profileB === input.profileA,
  );
}

function twoProfileSessionsReadyForInput(input = productionTwoProfileInput()) {
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  return (
    Boolean(sessionStatus?.both_ready_for_message_envelope) ||
    latestTwoProfileSuccessMatchesDirection(input) ||
    latestTwoProfileSuccessMatchesOppositeDirection(input)
  );
}

function rememberTwoProfileReadySessionFromRoundtrip(input, result) {
  if (!input.profileA || !input.profileB) {
    return;
  }
  rememberTwoProfileSessionStatus(input, {
    profile_a: input.profileA,
    profile_b: input.profileB,
    profile_a_ready_for_message_envelope: Boolean(result.sender_session_ready),
    profile_b_ready_for_message_envelope: Boolean(result.receiver_session_ready),
    both_ready_for_message_envelope: Boolean(result.sender_session_ready && result.receiver_session_ready),
    profile_a_session_transport_state_present: Boolean(result.sender_session_ready),
    profile_b_session_transport_state_present: Boolean(result.receiver_session_ready),
    profile_a_runtime_material_reconstructable: Boolean(result.sender_session_ready),
    profile_b_runtime_material_reconstructable: Boolean(result.receiver_session_ready),
    profile_a_outbound_envelope_io_ready: false,
    profile_b_outbound_envelope_io_ready: false,
    store_path_returned: Boolean(result.store_path_returned),
    passphrase_retained: Boolean(result.passphrase_retained),
    key_material_exposed: Boolean(result.key_material_exposed),
    network_io_attempted: Boolean(result.network_io_attempted),
    transport_io_opened: Boolean(result.transport_io_opened),
    runtime_messaging_enabled: Boolean(result.runtime_messaging_enabled),
  });
}

function applyProductionProfilePreset(peer) {
  const preset = productionProfilePreset(peer);
  if (!preset || !fields.productionProfileName || !fields.productionPairingEndpoint) {
    return;
  }
  fields.productionProfileName.value = preset.profile;
  fields.productionPairingEndpoint.value = preset.rendezvousEndpoint;
  syncProductionProfilePassphraseFromTwoProfile();
  if (fields.productionProfileSelector) {
    fields.productionProfileSelector.value = preset.profile;
  }
  resetProductionPairingView({ preserveTwoProfileStatus: true });
  resetProductionMessageView();
  applyTwoProfilePairFromProfile(preset.profile);
  applyProductionActionState();
  setText(
    fields.productionProfileWarning,
    `Manual profile preset applied: ${preset.profile} / ${preset.rendezvousEndpoint}`,
  );
}

function applyTwoProfilePairFromProfile(profile) {
  const preset = productionProfilePreset(profile);
  const counterpart = productionCounterpartProfile(profile);
  if (!preset || !counterpart || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    return false;
  }
  fields.productionTwoProfileA.value = preset.profile;
  fields.productionTwoProfileB.value = counterpart;
  latestProductionTwoProfileSessionStatus = null;
  setProductionTwoProfileState("Two-profile pair selected");
  setText(
    fields.productionTwoProfileWarning,
    `Selected local pair ${preset.profile} -> ${counterpart}. Enter passphrase, then load conversation or check sessions.`,
  );
  renderProductionTwoProfileDirection(productionTwoProfileInput());
  renderProductionTwoProfileMemory(productionTwoProfileInput());
  scheduleTwoProfileAutoResume();
  return true;
}

function renderManualNextActions(state) {
  const nextActions = productionManualNextActions(state);

  setText(fields.productionProfileNextAction, nextActions.profile);
  setText(fields.productionPairingNextAction, nextActions.pairing);
  setText(fields.productionMessageNextAction, nextActions.message);
}

function renderManualMessageStatus(state) {
  setText(fields.productionMessageActiveStatus, productionManualMessageStatusView(state));
  setText(fields.productionMessageManualCheck, productionManualMessageCheckView(state));
  setProductionMessageManualCurrent(null);
}

function resetProductionMessageImportState() {
  latestProductionMessageImport = null;
  if (fields.productionReceivedMessage) {
    fields.productionReceivedMessage.value = "";
  }
}

function resetProductionMessageTranscript() {
  productionTranscriptEntryKeys.clear();
  resetTranscriptList(fields.productionMessageTranscript, "No messages yet.");
}

function resetProductionTwoProfileTranscript() {
  productionTwoProfileConversationEntries.clear();
  resetTranscriptList(fields.productionTwoProfileTranscript, "No two-profile messages yet.");
}

function resetTranscriptList(target, emptyText) {
  if (!target) {
    return;
  }
  target.replaceChildren();
  const empty = document.createElement("li");
  empty.className = "is-empty";
  empty.textContent = emptyText;
  target.append(empty);
}

function appendTranscriptEntry(target, keySet, kind, profile, messageNumber, message) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase() || "unknown";
  const normalizedNumber = Number.isInteger(messageNumber) ? messageNumber : "unknown";
  const text = String(message ?? "").trim();
  if (!text || !target) {
    return;
  }
  const key = `${kind}\n${normalizedProfile}\n${normalizedNumber}\n${text}`;
  if (keySet.has(key)) {
    return;
  }
  keySet.add(key);
  target.querySelector(".is-empty")?.remove();

  const item = document.createElement("li");
  item.className = kind === "received" ? "is-received" : "is-sent";
  const meta = document.createElement("strong");
  meta.textContent = `${kind === "received" ? "Received" : "Sent"} / ${normalizedProfile} / #${normalizedNumber}`;
  const body = document.createElement("span");
  body.textContent = text;
  item.append(meta, body);
  target.append(item);
}

function appendProductionTranscriptEntry(kind, profile, messageNumber, message) {
  appendTranscriptEntry(
    fields.productionMessageTranscript,
    productionTranscriptEntryKeys,
    kind,
    profile,
    messageNumber,
    message,
  );
}

function twoProfileConversationKey(entry) {
  return [
    String(entry.sender ?? "").trim().toLowerCase(),
    String(entry.receiver ?? "").trim().toLowerCase(),
    entry.messageNumber,
    String(entry.message ?? "").trim(),
  ].join("\n");
}

function appendProductionTwoProfileConversationStatus(
  kind,
  ownerProfile,
  counterpartProfile,
  messageNumber,
  message,
) {
  const normalizedKind = kind === "received" ? "received" : "sent";
  const owner = String(ownerProfile ?? "").trim().toLowerCase() || "unknown";
  const counterpart = String(counterpartProfile ?? "").trim().toLowerCase() || "peer";
  const normalizedNumber = Number.parseInt(messageNumber, 10);
  const text = String(message ?? "").trim();
  if (!Number.isInteger(normalizedNumber) || normalizedNumber < 1 || !text || !fields.productionTwoProfileTranscript) {
    return;
  }

  const entry = {
    sender: normalizedKind === "sent" ? owner : counterpart,
    receiver: normalizedKind === "sent" ? counterpart : owner,
    messageNumber: normalizedNumber,
    message: text,
  };
  const key = twoProfileConversationKey(entry);
  const existing = productionTwoProfileConversationEntries.get(key) ?? {
    ...entry,
    statuses: new Set(),
  };
  existing.statuses.add(normalizedKind);
  productionTwoProfileConversationEntries.set(key, existing);
  renderProductionTwoProfileConversationList();
}

function renderProductionTwoProfileConversationList() {
  const target = fields.productionTwoProfileTranscript;
  if (!target) {
    return;
  }
  target.replaceChildren();
  const entries = [...productionTwoProfileConversationEntries.values()].sort((left, right) => {
    const numberDelta = left.messageNumber - right.messageNumber;
    if (numberDelta !== 0) {
      return numberDelta;
    }
    return `${left.sender}:${left.receiver}`.localeCompare(`${right.sender}:${right.receiver}`);
  });
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "is-empty";
    empty.textContent = "No two-profile messages yet.";
    target.append(empty);
    return;
  }
  for (const entry of entries) {
    const item = document.createElement("li");
    const key = twoProfileConversationKey(entry);
    const delivered = entry.statuses.has("sent") && entry.statuses.has("received");
    const inboundOnly = !entry.statuses.has("sent") && entry.statuses.has("received");
    const senderEnvelopeSlotPresent = productionPayloadSlots.messageEnvelope.has(entry.sender);
    const selected = key === selectedTwoProfileConversationKey;
    item.className = delivered ? "is-delivered" : inboundOnly ? "is-inbound-only" : "is-pending-receive";
    item.classList.toggle("is-selected", selected);
    if (!delivered) {
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Review pending message ${entry.sender} to ${entry.receiver} number ${entry.messageNumber}`);
      item.addEventListener("click", () => selectTwoProfileConversationEntryForReview(entry));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectTwoProfileConversationEntryForReview(entry);
        }
      });
    }

    const meta = document.createElement("strong");
    meta.textContent = `${entry.sender} -> ${entry.receiver} / #${entry.messageNumber}`;

    const status = document.createElement("span");
    status.className = `transcript-status ${delivered ? "is-delivered" : inboundOnly ? "is-inbound-only" : "is-pending-receive"}`;
    status.textContent = delivered
      ? "delivered: local sent + peer received"
      : inboundOnly
        ? "inbound-only: local sent copy missing"
        : "pending: peer received copy missing";

    const slot = document.createElement("span");
    slot.className = `transcript-slot ${senderEnvelopeSlotPresent ? "is-present" : "is-missing"}`;
    slot.textContent = senderEnvelopeSlotPresent
      ? `sender envelope slot: ready (${entry.sender})`
      : `sender envelope slot: missing (${entry.sender})`;

    const actionView = twoProfileConversationActionView(entry);
    const action = document.createElement("span");
    action.className = `transcript-action ${actionView.state}`;
    action.textContent = actionView.rowLabel;

    const body = document.createElement("span");
    body.textContent = entry.message;

    item.append(meta, status, slot, action);
    if (selected) {
      const review = document.createElement("span");
      review.className = "transcript-review is-selected";
      review.textContent = delivered
        ? "selected review target: delivered"
        : "selected review target: pending";
      item.append(review);
    }
    item.append(body);
    target.append(item);
  }
}

function latestTwoProfileConversationEntry() {
  const entries = [...productionTwoProfileConversationEntries.values()].sort((left, right) => {
    const numberDelta = right.messageNumber - left.messageNumber;
    if (numberDelta !== 0) {
      return numberDelta;
    }
    return `${right.sender}:${right.receiver}`.localeCompare(`${left.sender}:${left.receiver}`);
  });
  return entries[0] ?? null;
}

function latestTwoProfilePendingConversationEntry() {
  const entries = [...productionTwoProfileConversationEntries.values()]
    .filter((entry) => !(entry.statuses.has("sent") && entry.statuses.has("received")))
    .sort((left, right) => {
      const numberDelta = right.messageNumber - left.messageNumber;
      if (numberDelta !== 0) {
        return numberDelta;
      }
      return `${right.sender}:${right.receiver}`.localeCompare(`${left.sender}:${left.receiver}`);
    });
  return entries[0] ?? null;
}

function selectedTwoProfileConversationEntry() {
  return selectedTwoProfileConversationKey
    ? productionTwoProfileConversationEntries.get(selectedTwoProfileConversationKey) ?? null
    : null;
}

function twoProfileConversationActionView(entry) {
  if (!entry) {
    return {
      nextAction: "Next actions unlock after a completed local roundtrip.",
      rowLabel: "action: unavailable",
      state: "is-waiting",
      focusTarget: null,
      manualTarget: null,
    };
  }
  const sentCopyPresent = entry.statuses.has("sent");
  const receivedCopyPresent = entry.statuses.has("received");
  const senderEnvelopeSlotPresent = productionPayloadSlots.messageEnvelope.has(entry.sender);
  if (sentCopyPresent && receivedCopyPresent) {
    return {
      nextAction: `Complete: message #${entry.messageNumber} delivered. Next: write reply from ${entry.receiver} to ${entry.sender}.`,
      rowLabel: `action: reply from ${entry.receiver}`,
      state: "is-reply",
      focusTarget: fields.productionTwoProfileMessage,
      manualTarget: null,
    };
  }
  if (sentCopyPresent && senderEnvelopeSlotPresent) {
    return {
      nextAction: `Next: import envelope for message #${entry.messageNumber} into ${entry.receiver}.`,
      rowLabel: `action: import envelope into ${entry.receiver}`,
      state: "is-ready",
      focusTarget: fields.importProductionMessageEnvelope,
      manualTarget: "inbound",
    };
  }
  if (sentCopyPresent) {
    return {
      nextAction: `Next: load or paste sender envelope for message #${entry.messageNumber}.`,
      rowLabel: `action: load envelope for ${entry.receiver}`,
      state: "is-waiting",
      focusTarget: fields.productionRemoteMessageEnvelope,
      manualTarget: "inbound",
    };
  }
  return {
    nextAction: `Next: review missing local sent copy for message #${entry.messageNumber}.`,
    rowLabel: `action: export sender copy from ${entry.sender}`,
    state: "is-ready",
    focusTarget: fields.exportProductionMessageEnvelope,
    manualTarget: "outbound",
  };
}

function selectedTwoProfileNextActionMessage(entry) {
  return twoProfileConversationActionView(entry).nextAction;
}

function selectedTwoProfileManualFocusTarget(entry) {
  return twoProfileConversationActionView(entry).focusTarget;
}

function renderProductionTwoProfileTranscriptEntries(entries) {
  resetProductionTwoProfileTranscript();
  const orderedEntries = [...(entries ?? [])].sort((left, right) => {
    const numberDelta = left.messageNumber - right.messageNumber;
    if (numberDelta !== 0) {
      return numberDelta;
    }
    return `${left.profile}:${left.kind}`.localeCompare(`${right.profile}:${right.kind}`);
  });
  for (const entry of orderedEntries) {
    appendProductionTwoProfileConversationStatus(
      entry.kind,
      entry.profile,
      entry.counterpartProfile,
      entry.messageNumber,
      entry.message,
    );
  }
}

function renderProductionTranscriptEntries(profile, entries) {
  resetProductionMessageTranscript();
  for (const entry of entries ?? []) {
    appendProductionTranscriptEntry(
      entry.direction === "received" ? "received" : "sent",
      profile,
      entry.message_number,
      entry.message,
    );
  }
}

function renderManualStatus() {
  const profile = activeProductionProfileName();
  const counterpart = productionCounterpartProfile(profile);
  const slotState = {
    pairing: {
      local: productionPayloadSlots.pairing.has(profile),
      remote: Boolean(counterpart && productionPayloadSlots.pairing.has(counterpart)),
    },
    handshakeInit: {
      local: productionPayloadSlots.handshakeInit.has(profile),
      remote: Boolean(counterpart && productionPayloadSlots.handshakeInit.has(counterpart)),
    },
    handshakeReply: {
      local: productionPayloadSlots.handshakeReply.has(profile),
      remote: Boolean(counterpart && productionPayloadSlots.handshakeReply.has(counterpart)),
    },
    handshakeFinish: {
      local: productionPayloadSlots.handshakeFinish.has(profile),
      remote: Boolean(counterpart && productionPayloadSlots.handshakeFinish.has(counterpart)),
    },
    messageEnvelope: {
      local: productionPayloadSlots.messageEnvelope.has(profile),
      remote: Boolean(counterpart && productionPayloadSlots.messageEnvelope.has(counterpart)),
    },
  };
  const view = productionManualStatusView({ profile }, slotState);
  setText(fields.productionManualRoute, view.route);
  setText(fields.productionManualDirection, view.direction);
  setText(fields.productionManualSlots, view.payloads);
  setText(fields.productionManualMode, view.mode);
  setText(fields.productionManualPolicy, view.policy);
}

function twoProfileInputFingerprint(input) {
  return `${input.profileA}\n${input.profileB}\n${input.message}`;
}

function twoProfileDirectionLabel(input) {
  if (!input.profileA || !input.profileB) {
    return "Direction: enter Profile A and Profile B";
  }
  if (input.profileA === input.profileB) {
    return "Direction blocked: profiles must be distinct";
  }
  return `Direction: ${input.profileA} -> ${input.profileB}`;
}

function twoProfileComposePrompt(input = productionTwoProfileInput()) {
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return "Write a stored-session message";
  }
  if (latestTwoProfileSuccessMatchesOppositeDirection(input)) {
    return `Reply from ${input.profileA} to ${input.profileB}`;
  }
  if (latestTwoProfileSuccessMatchesDirection(input)) {
    return `Next message from ${input.profileA} to ${input.profileB}`;
  }
  return `Message from ${input.profileA} to ${input.profileB}`;
}

function twoProfileRecoveryMessage(action, error, input = productionTwoProfileInput()) {
  const detail = String(error ?? "").trim();
  const suffix = detail ? ` Boundary detail: ${detail}` : "";
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return "Enter two distinct profiles before continuing.";
  }
  if (!input.passphrase) {
    return "Enter the local passphrase before continuing.";
  }
  if (action === "session-status") {
    return (
      "Session check did not complete. Verify the passphrase and that both profiles exist locally, " +
      `or write a first message and run full two-profile setup.${suffix}`
    );
  }
  if (action === "stored-message") {
    return (
      "Stored-session message could not run. Check sessions to distinguish missing local session state " +
      `from an unlock failure, or run full two-profile setup again.${suffix}`
    );
  }
  if (action === "roundtrip") {
    return (
      "Full two-profile setup did not complete. Verify both profile names and passphrase, then retry setup. " +
      `No network or transport send was attempted.${suffix}`
    );
  }
  return `Two-profile action failed.${suffix}`;
}

function renderProductionTwoProfileDirection(input = productionTwoProfileInput()) {
  setText(fields.productionTwoProfileDirection, twoProfileDirectionLabel(input));
  if (!fields.productionTwoProfileMessage) {
    return;
  }
  fields.productionTwoProfileMessage.placeholder = twoProfileComposePrompt(input);
}

function setTwoProfileFlowStep(item, detail, state, message) {
  if (item) {
    item.classList.remove("is-pending", "is-running", "is-complete", "is-failed");
    item.classList.add(`is-${state}`);
  }
  setText(detail, message);
}

function renderProductionTwoProfileFlow(input = productionTwoProfileInput()) {
  const profilesReady = Boolean(input.profileA && input.profileB && input.profileA !== input.profileB);
  const authReady = Boolean(profilesReady && input.passphrase);
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  const hasMessage = Boolean(input.message);
  const lastSuccess = latestProductionTwoProfileSuccess;
  const lastSuccessDirection = latestTwoProfileSuccessMatchesDirection(input);
  const lastSuccessOppositeDirection = latestTwoProfileSuccessMatchesOppositeDirection(input);
  const sessionsReady = twoProfileSessionsReadyForInput(input);

  if (!profilesReady) {
    setTwoProfileFlowStep(
      fields.productionTwoProfileStepSession,
      fields.productionTwoProfileStepSessionDetail,
      "running",
      "Enter two distinct local profiles.",
    );
  } else if (!input.passphrase) {
    setTwoProfileFlowStep(
      fields.productionTwoProfileStepSession,
      fields.productionTwoProfileStepSessionDetail,
      "running",
      "Enter passphrase to unlock both local stores.",
    );
  } else if (sessionsReady) {
    setTwoProfileFlowStep(
      fields.productionTwoProfileStepSession,
      fields.productionTwoProfileStepSessionDetail,
      "complete",
      `Stored sessions ready for ${input.profileA} -> ${input.profileB}.`,
    );
  } else if (sessionStatus) {
    setTwoProfileFlowStep(
      fields.productionTwoProfileStepSession,
      fields.productionTwoProfileStepSessionDetail,
      "failed",
      "Stored sessions are incomplete. Run full two-profile setup.",
    );
  } else {
    setTwoProfileFlowStep(
      fields.productionTwoProfileStepSession,
      fields.productionTwoProfileStepSessionDetail,
      "running",
      hasMessage ? "Run full setup, or check sessions first." : "Check sessions, or write a first message.",
    );
  }

  setTwoProfileFlowStep(
    fields.productionTwoProfileStepCompose,
    fields.productionTwoProfileStepComposeDetail,
    !authReady ? "pending" : hasMessage ? "complete" : "running",
    !authReady
      ? "Waiting for profiles and passphrase."
      : hasMessage
        ? `Draft ready: ${input.message.length} chars.`
        : `${twoProfileComposePrompt(input)}.`,
  );

  const sendRunning = productionBusyAction === "two-profile-message-roundtrip";
  const sendReady = hasMessage && sessionsReady;
  const sendComplete = Boolean(lastSuccessDirection && !hasMessage);
  setTwoProfileFlowStep(
    fields.productionTwoProfileStepSend,
    fields.productionTwoProfileStepSendDetail,
    sendRunning || sendReady ? "running" : sendComplete ? "complete" : "pending",
    sendRunning
      ? "Stored-session message is running."
      : sendComplete
        ? `Sent ${lastSuccess.messageLength} chars; compose buffer cleared.`
        : sendReady
          ? "Run stored-session message."
          : "Waiting for ready session and draft.",
  );

  setTwoProfileFlowStep(
    fields.productionTwoProfileStepReply,
    fields.productionTwoProfileStepReplyDetail,
    lastSuccessOppositeDirection ? "running" : lastSuccess ? "complete" : "pending",
    lastSuccessOppositeDirection
      ? `Reply direction selected: ${input.profileA} -> ${input.profileB}.`
      : lastSuccess
        ? "Swap direction to reply."
        : "Complete one sent message first.",
  );
}

function twoProfilePrimaryReadiness(input, busy, sessionsReady) {
  if (busy) {
    return { message: "Running: production action in progress", state: "blocked" };
  }
  if (!input.profileA) {
    return { message: "Blocked: Profile A required", state: "blocked" };
  }
  if (!input.profileB) {
    return { message: "Blocked: Profile B required", state: "blocked" };
  }
  if (input.profileA === input.profileB) {
    return { message: "Blocked: profiles must be distinct", state: "blocked" };
  }
  if (!input.passphrase) {
    return { message: "Blocked: passphrase required", state: "blocked" };
  }
  if (!input.message) {
    return {
      message: sessionsReady
        ? "Ready: stored session recovered; write a message"
        : "Ready: write first message, then run full setup",
      state: "compose",
    };
  }
  if (sessionsReady) {
    return {
      message: `Ready: send stored-session message ${input.profileA} -> ${input.profileB}`,
      state: "ready",
    };
  }
  return {
    message: `Ready: run full setup for ${input.profileA} -> ${input.profileB}`,
    state: "setup",
  };
}

function renderProductionTwoProfileMemory(input = productionTwoProfileInput()) {
  const currentDirection =
    input.profileA && input.profileB && input.profileA !== input.profileB
      ? `${input.profileA} -> ${input.profileB}`
      : "Current direction incomplete";
  const currentLabel = input.message
    ? `${currentDirection} | draft_chars=${input.message.length}`
    : `${currentDirection} | no draft`;
  const latestConversation = latestTwoProfileConversationEntry();

  if (!latestProductionTwoProfileSuccess) {
    setText(
      fields.productionTwoProfileCurrentInput,
      latestConversation
        ? `Compose: ${currentLabel}; last message ${latestConversation.sender} -> ${latestConversation.receiver} #${latestConversation.messageNumber}`
        : "No successful run yet",
    );
    setText(fields.productionTwoProfileLastSuccess, "No successful roundtrip in this app session");
    return;
  }

  const matchesLastSuccess =
    twoProfileInputFingerprint(input) === latestProductionTwoProfileSuccess.fingerprint;
  const repliesToTail = Boolean(
    latestConversation &&
      input.profileA === latestConversation.receiver &&
      input.profileB === latestConversation.sender,
  );
  setText(
    fields.productionTwoProfileCurrentInput,
    latestConversation
      ? `${repliesToTail ? "Replying to latest" : "Direction differs from latest"}: ${currentLabel}; latest ${latestConversation.sender} -> ${latestConversation.receiver} #${latestConversation.messageNumber}`
      : `${matchesLastSuccess ? "Matches last success" : "Differs from last success"}: ${currentLabel}`,
  );
  setText(
    fields.productionTwoProfileLastSuccess,
    `${latestProductionTwoProfileSuccess.profileA} -> ${latestProductionTwoProfileSuccess.profileB} | message_chars=${latestProductionTwoProfileSuccess.messageLength}`,
  );
}

function payloadLabel(label) {
  return String(label ?? "payload").toLowerCase();
}

function manualFilledRemoteFieldWarning(profile, label) {
  return `Filled remote field from active=${profile} source=${payloadLabel(label)}.`;
}

function manualMissingCounterpartWarning(profile, counterpart, label) {
  return (
    `No stored ${payloadLabel(label)} for active=${profile} ` +
    `expected_counterpart=${counterpart ?? "Alice or Bob"}; manually select the counterpart profile after storing it.`
  );
}

function manualLoadedCounterpartWarning(profile, counterpart, label) {
  return `Filled remote ${payloadLabel(label)} for active=${profile} loaded_from=${counterpart}.`;
}

function moveLocalPayload(sourceField, targetField, label) {
  const profile = activeProductionProfileName();
  const value = sourceField?.value?.trim() ?? "";
  if (!value || !targetField) {
    setProductionPairingState(`${label} needs payload`);
    return;
  }
  targetField.value = value;
  targetField.dispatchEvent(new Event("input", { bubbles: true }));
  setProductionPairingState(`${label} applied`);
  setText(fields.productionPairingWarning, manualFilledRemoteFieldWarning(profile, label));
  applyProductionActionState();
}

function storeProductionPayloadSlot(kind, sourceField, label) {
  const profile = activeProductionProfileName();
  const value = sourceField?.value?.trim() ?? "";
  if (!profile || !value) {
    setProductionPairingState(`${label} store needs profile and payload`);
    setText(fields.productionPairingWarning, `Export ${payloadLabel(label)} before storing a local payload slot.`);
    return;
  }
  productionPayloadSlots[kind].set(profile, value);
  setProductionPairingState(`${label} stored`);
  setText(fields.productionPairingWarning, `Stored local ${payloadLabel(label)} slot for ${profile}.`);
  applyProductionActionState();
}

function loadProductionPayloadSlot(kind, targetField, label) {
  const profile = activeProductionProfileName();
  const counterpart = productionCounterpartProfile(profile);
  const value = counterpart ? productionPayloadSlots[kind].get(counterpart) : null;
  if (!value || !targetField) {
    setProductionPairingState(`Remote ${payloadLabel(label)} slot empty`);
    setText(fields.productionPairingWarning, manualMissingCounterpartWarning(profile, counterpart, label));
    return;
  }
  targetField.value = value;
  targetField.dispatchEvent(new Event("input", { bubbles: true }));
  setProductionPairingState(`Remote ${payloadLabel(label)} loaded`);
  setText(fields.productionPairingWarning, manualLoadedCounterpartWarning(profile, counterpart, label));
  applyProductionActionState();
}

function moveLocalMessageEnvelope() {
  const profile = activeProductionProfileName();
  const value = fields.productionMessageEnvelope?.value?.trim() ?? "";
  if (!value || !fields.productionRemoteMessageEnvelope) {
    setProductionMessageState("Message envelope needs payload");
    return;
  }
  fields.productionRemoteMessageEnvelope.value = value;
  fields.productionRemoteMessageEnvelope.dispatchEvent(new Event("input", { bubbles: true }));
  setProductionMessageState("Message envelope applied");
  setText(fields.productionMessageWarning, manualFilledRemoteFieldWarning(profile, "envelope"));
  applyProductionActionState();
}

function storeProductionMessageEnvelope() {
  const profile = activeProductionProfileName();
  const value = fields.productionMessageEnvelope?.value?.trim() ?? "";
  if (!profile || !value) {
    setProductionMessageState("Envelope store needs profile and envelope");
    setText(fields.productionMessageWarning, "Export envelope before storing a local message slot.");
    return;
  }
  productionPayloadSlots.messageEnvelope.set(profile, value);
  setProductionMessageState("Message envelope stored");
  setText(fields.productionMessageWarning, `Stored local message envelope slot for ${profile}.`);
  renderProductionTwoProfileConversationList();
  applyProductionActionState();
}

function loadProductionMessageEnvelope() {
  const profile = activeProductionProfileName();
  const counterpart = productionCounterpartProfile(profile);
  const value = counterpart ? productionPayloadSlots.messageEnvelope.get(counterpart) : null;
  if (!value || !fields.productionRemoteMessageEnvelope) {
    setProductionMessageState("Remote envelope slot empty");
    setText(fields.productionMessageWarning, manualMissingCounterpartWarning(profile, counterpart, "envelope"));
    return;
  }
  fields.productionRemoteMessageEnvelope.value = value;
  fields.productionRemoteMessageEnvelope.dispatchEvent(new Event("input", { bubbles: true }));
  setProductionMessageState("Remote envelope loaded");
  setText(fields.productionMessageWarning, manualLoadedCounterpartWarning(profile, counterpart, "envelope"));
  applyProductionActionState();
}

function clearImportedMessageEnvelopeSlot(profile, envelopePayload) {
  const importedProfile = String(profile ?? "").trim().toLowerCase();
  const counterpart = productionCounterpartProfile(importedProfile);
  const importedEnvelope = String(envelopePayload ?? "").trim();
  const storedEnvelope = counterpart ? productionPayloadSlots.messageEnvelope.get(counterpart) : null;
  if (!counterpart || !importedEnvelope || storedEnvelope !== importedEnvelope) {
    return false;
  }
  productionPayloadSlots.messageEnvelope.delete(counterpart);
  renderProductionTwoProfileConversationList();
  return true;
}

function selectProductionProfileForManualRelay(profile) {
  const preset = productionProfilePreset(profile);
  if (!preset || !fields.productionProfileName) {
    return false;
  }
  fields.productionProfileName.value = preset.profile;
  if (fields.productionProfileSelector) {
    fields.productionProfileSelector.value = preset.profile;
  }
  if (fields.productionPairingEndpoint) {
    fields.productionPairingEndpoint.value = preset.rendezvousEndpoint;
  }
  syncProductionProfilePassphraseFromTwoProfile();
  return true;
}

function relayProductionMessageEnvelopeToPeer() {
  const profile = activeProductionProfileName();
  const counterpart = productionCounterpartProfile(profile);
  const value = fields.productionMessageEnvelope?.value?.trim() ?? "";
  if (!profile || !counterpart || !value || !fields.productionRemoteMessageEnvelope) {
    setProductionMessageState("Envelope relay needs profile and envelope");
    setText(
      fields.productionMessageWarning,
      "Export a local envelope from Alice or Bob before relaying to the peer.",
    );
    return;
  }
  resetProductionMessageImportState();
  productionPayloadSlots.messageEnvelope.set(profile, value);
  renderProductionTwoProfileConversationList();
  if (!selectProductionProfileForManualRelay(counterpart)) {
    setProductionMessageState("Envelope relay needs supported peer");
    setText(fields.productionMessageWarning, "Relay supports the local Alice/Bob manual pair only.");
    return;
  }
  fields.productionRemoteMessageEnvelope.value = value;
  if (fields.productionMessageEnvelope) {
    fields.productionMessageEnvelope.value = "";
  }
  fields.productionRemoteMessageEnvelope.dispatchEvent(new Event("input", { bubbles: true }));
  setProductionMessageState(`Envelope relayed to ${counterpart}`);
  setText(
    fields.productionMessageWarning,
    `Stored ${profile} envelope, selected ${counterpart}, and loaded remote envelope. Import remains explicit.`,
  );
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
  const input = productionTwoProfileInput();
  if (latestTwoProfileSuccessMatchesOppositeDirection(input) && !input.message) {
    setProductionTwoProfileState("Reply draft ready");
    setText(
      fields.productionTwoProfileWarning,
      `Write reply from ${input.profileA} to ${input.profileB}, then run stored-session message.`,
    );
  }
  fields.productionTwoProfileMessage?.focus();
}

function swapTwoProfileDirection() {
  const profileA = fields.productionTwoProfileA?.value ?? "";
  const profileB = fields.productionTwoProfileB?.value ?? "";
  if (!fields.productionTwoProfileA || !fields.productionTwoProfileB || !profileA || !profileB) {
    setProductionTwoProfileState("Swap needs profiles");
    setText(fields.productionTwoProfileWarning, "Enter both profiles before swapping direction.");
    return;
  }
  fields.productionTwoProfileA.value = profileB;
  fields.productionTwoProfileB.value = profileA;
  const input = productionTwoProfileInput();
  const replyDirection = latestTwoProfileSuccessMatchesOppositeDirection(input);
  renderProductionTwoProfileDirection(input);
  renderProductionTwoProfileMemory(input);
  setProductionTwoProfileState(replyDirection ? "Reply direction ready" : "Direction swapped");
  setText(
    fields.productionTwoProfileWarning,
    replyDirection
      ? `Reply direction selected: ${input.profileA} -> ${input.profileB}. Write the reply, then run stored-session message.`
      : `Stored-session direction swapped: ${input.profileA} -> ${input.profileB}. Run stored-session message when ready.`,
  );
  setProductionFollowupActions(
    true,
    replyDirection
      ? `Next: write reply from ${input.profileA} to ${input.profileB}.`
      : `Next: write message from ${input.profileA} to ${input.profileB}.`,
  );
  applyProductionActionState();
  fields.productionTwoProfileMessage?.focus();
}

function replyToLatestTwoProfileMessage() {
  const latest = latestTwoProfileConversationEntry();
  if (!latest || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    setProductionTwoProfileState("Reply needs conversation");
    setText(fields.productionTwoProfileWarning, "Load a stored conversation before selecting a reply direction.");
    return false;
  }
  fields.productionTwoProfileA.value = latest.receiver;
  fields.productionTwoProfileB.value = latest.sender;
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
  }
  const input = productionTwoProfileInput();
  renderProductionTwoProfileDirection(input);
  renderProductionTwoProfileMemory(input);
  setProductionTwoProfileState("Reply direction ready");
  setText(
    fields.productionTwoProfileWarning,
    `Reply target selected from latest message #${latest.messageNumber}: ${input.profileA} -> ${input.profileB}.`,
  );
  setProductionFollowupActions(true, `Next: write reply from ${input.profileA} to ${input.profileB}.`);
  applyProductionActionState();
  fields.productionTwoProfileMessage?.focus();
  return true;
}

function selectTwoProfileConversationEntryForReview(entry, options = {}) {
  if (!entry || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    return false;
  }
  const focusManual = options.focusManual !== false;
  if (entry.statuses.has("sent") && entry.statuses.has("received")) {
    setProductionTwoProfileState("Conversation item delivered");
    setText(fields.productionTwoProfileWarning, `Message #${entry.messageNumber} is already delivered.`);
    return false;
  }
  selectedTwoProfileConversationKey = twoProfileConversationKey(entry);
  fields.productionTwoProfileA.value = entry.sender;
  fields.productionTwoProfileB.value = entry.receiver;
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
  }
  const input = productionTwoProfileInput();
  renderProductionTwoProfileDirection(input);
  renderProductionTwoProfileMemory(input);
  setProductionTwoProfileState("Pending message selected");
  const nextAction = selectedTwoProfileNextActionMessage(entry);
  setText(
    fields.productionTwoProfileWarning,
    `Pending message #${entry.messageNumber} selected: ${input.profileA} -> ${input.profileB}. Manual relay/import review is prepared below.`,
  );
  setProductionFollowupActions(true, nextAction);
  applyPendingConversationToManualMessageReview(entry, { focusManual });
  applyProductionActionState();
  return true;
}

function applyPendingConversationToManualMessageReview(entry, options = {}) {
  const focusManual = options.focusManual !== false;
  const sentCopyPresent = entry.statuses.has("sent");
  const receivedCopyPresent = entry.statuses.has("received");
  const reviewProfile = sentCopyPresent && !receivedCopyPresent ? entry.receiver : entry.sender;
  const senderEnvelopeSlot = productionPayloadSlots.messageEnvelope.get(entry.sender) ?? "";
  if (!selectProductionProfileForManualRelay(reviewProfile)) {
    return false;
  }
  if (fields.productionMessageAutoNumber) {
    fields.productionMessageAutoNumber.checked = false;
  }
  if (fields.productionMessageNumber) {
    fields.productionMessageNumber.value = String(entry.messageNumber);
  }
  if (fields.productionMessageBody) {
    fields.productionMessageBody.value = entry.message;
  }
  const canPrepareImport = Boolean(sentCopyPresent && !receivedCopyPresent && senderEnvelopeSlot);
  if (fields.productionRemoteMessageEnvelope && !receivedCopyPresent) {
    fields.productionRemoteMessageEnvelope.value = canPrepareImport ? senderEnvelopeSlot : "";
    fields.productionRemoteMessageEnvelope.dispatchEvent(new Event("input", { bubbles: true }));
  }
  resetProductionMessageImportState();
  if (focusManual) {
    openManualProductionTools();
  }
  let reviewState = "Manual sender review selected";
  let reviewWarning = `Selected ${reviewProfile} to review missing local sent copy for message #${entry.messageNumber}.`;
  if (canPrepareImport) {
    reviewState = "Manual import ready";
    reviewWarning = `Loaded sender envelope slot for message #${entry.messageNumber}. Import remains explicit.`;
  } else if (sentCopyPresent && !receivedCopyPresent) {
    reviewState = "Manual import review selected";
    reviewWarning = `Selected ${reviewProfile} to import pending message #${entry.messageNumber}. Load or paste the sender envelope, then import explicitly.`;
  }
  let manualCheck = `Needs sender review: local sent copy is missing for ${entry.sender} message #${entry.messageNumber}.`;
  let inboundReadiness = receivedCopyPresent
    ? "Received copy present in transcript"
    : "Pending peer received copy";
  let outboundReadiness = "Local sent copy missing";
  if (canPrepareImport) {
    manualCheck = `Ready: import envelope for ${reviewProfile} message #${entry.messageNumber}.`;
    inboundReadiness = "Ready to import explicit remote envelope";
    outboundReadiness = `Sender envelope slot ready for ${entry.sender}`;
  } else if (sentCopyPresent && !receivedCopyPresent) {
    manualCheck = `Needs envelope: load or paste sender envelope for ${entry.sender} message #${entry.messageNumber}.`;
    outboundReadiness = senderEnvelopeSlot
      ? `Sender envelope slot ready for ${entry.sender}`
      : "Local sent copy present; sender envelope slot missing";
  }
  setProductionMessageState(reviewState);
  setText(fields.productionMessageWarning, reviewWarning);
  setText(fields.productionMessageManualCheck, manualCheck);
  setText(fields.productionMessageInbound, inboundReadiness);
  setText(fields.productionMessageOutbound, outboundReadiness);
  if (focusManual) {
    selectedTwoProfileManualFocusTarget(entry)?.focus();
  }
  return true;
}

function reviewPendingTwoProfileMessage() {
  const pending = latestTwoProfilePendingConversationEntry();
  if (!pending || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    setProductionTwoProfileState("No pending conversation item");
    setText(fields.productionTwoProfileWarning, "Loaded conversation has no pending sent/received status gap.");
    return false;
  }
  return selectTwoProfileConversationEntryForReview(pending);
}

function autoSelectPendingTwoProfileConversation() {
  const selectedEntry = selectedTwoProfileConversationEntry();
  if (selectedEntry && !(selectedEntry.statuses.has("sent") && selectedEntry.statuses.has("received"))) {
    return selectTwoProfileConversationEntryForReview(selectedEntry, { focusManual: false });
  }
  const pending = latestTwoProfilePendingConversationEntry();
  return pending ? selectTwoProfileConversationEntryForReview(pending, { focusManual: false }) : false;
}

function selectTwoProfileReplyDirection(sentInput) {
  const sender = String(sentInput?.profileA ?? "").trim();
  const receiver = String(sentInput?.profileB ?? "").trim();
  if (!sender || !receiver || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    return false;
  }
  fields.productionTwoProfileA.value = receiver;
  fields.productionTwoProfileB.value = sender;
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
  }
  renderProductionTwoProfileDirection(productionTwoProfileInput());
  renderProductionTwoProfileMemory(productionTwoProfileInput());
  setProductionTwoProfileState("Reply direction ready");
  setProductionFollowupActions(
    true,
    `Next: write reply from ${receiver} to ${sender}.`,
  );
  fields.productionTwoProfileMessage?.focus();
  return true;
}

function selectReplyAfterDeliveredReview(entry) {
  if (
    !entry ||
    !entry.statuses.has("sent") ||
    !entry.statuses.has("received") ||
    !fields.productionTwoProfileA ||
    !fields.productionTwoProfileB
  ) {
    return false;
  }
  fields.productionTwoProfileA.value = entry.receiver;
  fields.productionTwoProfileB.value = entry.sender;
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
  }
  const input = productionTwoProfileInput();
  renderProductionTwoProfileDirection(input);
  renderProductionTwoProfileMemory(input);
  setProductionTwoProfileState("Reply direction ready");
  setText(
    fields.productionTwoProfileWarning,
    `Message #${entry.messageNumber} delivered; reply direction selected: ${input.profileA} -> ${input.profileB}.`,
  );
  setProductionFollowupActions(true, selectedTwoProfileNextActionMessage(entry));
  applyProductionActionState();
  fields.productionTwoProfileMessage?.focus();
  return true;
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
  const counterpartProfile = productionCounterpartProfile(activeProductionProfileName());
  const hasRemotePairingSlot = Boolean(
    counterpartProfile && productionPayloadSlots.pairing.has(counterpartProfile),
  );
  const hasHandshakeInitPayload = Boolean(fields.productionHandshakeInitPayload?.value.trim());
  const hasHandshakeReplyPayload = Boolean(fields.productionHandshakeReplyPayload?.value.trim());
  const hasHandshakeFinishPayload = Boolean(fields.productionHandshakeFinishPayload?.value.trim());
  const hasRemoteHandshakeInitSlot = Boolean(
    counterpartProfile && productionPayloadSlots.handshakeInit.has(counterpartProfile),
  );
  const hasRemoteHandshakeReplySlot = Boolean(
    counterpartProfile && productionPayloadSlots.handshakeReply.has(counterpartProfile),
  );
  const hasRemoteHandshakeFinishSlot = Boolean(
    counterpartProfile && productionPayloadSlots.handshakeFinish.has(counterpartProfile),
  );
  const hasLocalMessageEnvelope = Boolean(fields.productionMessageEnvelope?.value.trim());
  const hasRemoteMessageEnvelopeSlot = Boolean(
    counterpartProfile && productionPayloadSlots.messageEnvelope.has(counterpartProfile),
  );
  const hasMessageNumberForExport =
    productionMessageUsesAutoNumber() || validProductionMessageNumber();
  const hasMessageNumberForImport = validProductionMessageNumber();
  const hasOutboundMessageInput = Boolean(
    hasProfileUnlockInput &&
      hasMessageNumberForExport &&
      message.message &&
      sessionReadyForMessages,
  );
  const hasInboundEnvelopeInput = Boolean(
    hasProfileUnlockInput &&
      hasMessageNumberForImport &&
      message.envelopePayload &&
      sessionReadyForMessages,
  );
  const hasImportedMessage = latestProductionMessageImportMatches(message);
  const hasReceivedExportInput = Boolean(hasProfileUnlockInput && hasMessageNumberForImport);
  const hasReceivedMessage = Boolean(fields.productionReceivedMessage?.value.trim());
  const hasTwoProfileInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase &&
      twoProfile.message,
  );
  const hasTwoProfileSessionStatusInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase,
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
    hasRemotePairingSlot,
    hasHandshakeInitPayload,
    hasRemoteHandshakeInitSlot,
    hasHandshakeReplyPayload,
    hasRemoteHandshakeReplySlot,
    hasHandshakeFinishPayload,
    hasRemoteHandshakeFinishSlot,
    hasLocalMessageEnvelope,
    hasRemoteMessageEnvelopeSlot,
    sessionReadyForMessages,
    hasOutboundMessageInput,
    hasInboundEnvelopeInput,
    hasImportedMessage,
    hasReceivedExportInput,
    hasReceivedMessage,
    hasTwoProfileInput,
    hasTwoProfileSessionsReady: twoProfileSessionsReadyForInput(twoProfile),
    activeProfile: activeProductionProfileName(),
    counterpartProfile,
    messageNumber: message.messageNumber,
    autoMessageNumber: message.autoMessageNumber,
  };
  const availability = productionActionAvailability(state);
  const manualAvailability = productionManualRelayAvailability(state);
  const twoProfileSessionsReady = state.hasTwoProfileSessionsReady;
  const twoProfileNeedsSetup = hasTwoProfileInput && !twoProfileSessionsReady;
  const twoProfileCanSendStoredMessage = hasTwoProfileInput && twoProfileSessionsReady;
  const twoProfileNeedsSessionCheck =
    hasTwoProfileSessionStatusInput && !twoProfile.message && !twoProfileSessionsReady;
  const twoProfileCanReply = Boolean(
    !busy && latestProductionTwoProfileSuccess && hasTwoProfileSessionStatusInput && !twoProfile.message,
  );
  const selectedConversation = selectedTwoProfileConversationEntry();
  const selectedHasSentCopy = Boolean(selectedConversation?.statuses.has("sent"));
  const selectedHasReceivedCopy = Boolean(selectedConversation?.statuses.has("received"));
  const selectedNeedsSenderExport = Boolean(selectedConversation && !selectedHasSentCopy);
  const selectedNeedsPeerImport = Boolean(
    selectedConversation && selectedHasSentCopy && !selectedHasReceivedCopy,
  );
  const twoProfileComposeLocked =
    productionBusyAction === "two-profile-roundtrip" ||
    productionBusyAction === "two-profile-message-roundtrip";

  if (fields.productionMessageNumber) {
    fields.productionMessageNumber.disabled = message.autoMessageNumber;
  }
  setTwoProfileComposeLocked(twoProfileComposeLocked);
  renderProductionTwoProfileDirection(twoProfile);
  renderProductionTwoProfileFlow(twoProfile);
  const twoProfileReadiness = twoProfilePrimaryReadiness(twoProfile, busy, twoProfileSessionsReady);
  setProductionTwoProfileReadiness(twoProfileReadiness.message, twoProfileReadiness.state);
  renderProductionTwoProfileMemory(twoProfile);
  renderManualNextActions(state);
  renderManualMessageStatus(state);
  if (selectedConversation) {
    const selectedActionView = twoProfileConversationActionView(selectedConversation);
    setText(fields.productionMessageNextAction, selectedActionView.nextAction);
    setProductionMessageManualCurrent(selectedActionView.manualTarget);
  }
  renderManualStatus();
  setActionButtonState(
    fields.unlockProductionProfile,
    !availability.unlockProfile,
    busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
    true,
  );
  setActionButtonState(
    fields.exportProductionPairing,
    !availability.exportPairing,
    busy ? "Wait for the active production action." : "Enter profile, passphrase, and onion endpoint first.",
    hasProfileUnlockInput,
  );
  setActionButtonState(
    fields.saveProductionSessionDraft,
    !availability.saveSessionDraft,
    busy ? "Wait for the active production action." : "Load or paste both local and remote pairing payloads first.",
    true,
  );
  setActionButtonState(
    fields.checkProductionSessionState,
    !availability.checkSessionState,
    busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
    false,
  );
  setActionButtonState(
    fields.exportProductionHandshakeInit,
    !availability.exportHandshakeInit,
    busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
    false,
  );
  setActionButtonState(
    fields.exportProductionHandshakeReply,
    !availability.exportHandshakeReply,
    busy ? "Wait for the active production action." : "Load or paste remote handshake init first.",
    true,
  );
  setActionButtonState(
    fields.exportProductionHandshakeFinish,
    !availability.exportHandshakeFinish,
    busy ? "Wait for the active production action." : "Load or paste remote handshake reply first.",
    true,
  );
  setActionButtonState(
    fields.importProductionHandshakeFinish,
    !availability.importHandshakeFinish,
    busy ? "Wait for the active production action." : "Load or paste remote handshake finish first.",
    true,
  );
  setActionButtonState(
    fields.exportProductionMessageEnvelope,
    !availability.exportMessageEnvelope,
    busy ? "Wait for the active production action." : "Complete session state, then enter message number and message.",
    selectedNeedsSenderExport || (!selectedConversation && availability.exportMessageEnvelope),
  );
  setActionButtonState(
    fields.importProductionMessageEnvelope,
    !availability.importMessageEnvelope,
    busy ? "Wait for the active production action." : "Complete session state, then load or paste a remote envelope.",
    hasInboundEnvelopeInput && !hasImportedMessage && (!selectedConversation || selectedNeedsPeerImport),
  );
  setActionButtonState(
    fields.exportProductionReceivedMessage,
    !availability.exportReceivedMessage,
    busy ? "Wait for the active production action." : "Enter profile, passphrase, and message number first.",
    hasImportedMessage && !hasReceivedMessage,
  );
  setActionButtonState(
    fields.loadProductionMessageTranscript,
    !hasProfileUnlockInput || busy,
    busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
  );
  setActionButtonState(
    fields.checkProductionTwoProfileSessionStatus,
    busy || !hasTwoProfileSessionStatusInput,
    busy ? "Wait for the active production action." : "Enter distinct Profile A, Profile B, and passphrase first.",
    twoProfileNeedsSessionCheck,
  );
  setActionButtonState(
    fields.checkProductionTwoProfileSessionStatusInline,
    busy || !hasTwoProfileSessionStatusInput,
    busy ? "Wait for the active production action." : "Enter distinct Profile A, Profile B, and passphrase first.",
    twoProfileNeedsSessionCheck,
  );
  setActionButtonState(
    fields.loadProductionTwoProfileTranscript,
    busy || !hasTwoProfileSessionStatusInput,
    busy ? "Wait for the active production action." : "Enter distinct Profile A, Profile B, and passphrase first.",
  );
  const latestConversation = latestTwoProfileConversationEntry();
  const latestReplySelected = Boolean(
    latestConversation &&
      twoProfile.profileA === latestConversation.receiver &&
      twoProfile.profileB === latestConversation.sender,
  );
  const pendingConversation = latestTwoProfilePendingConversationEntry();
  const pendingSelected = Boolean(
    pendingConversation &&
      twoProfile.profileA === pendingConversation.sender &&
      twoProfile.profileB === pendingConversation.receiver,
  );
  setActionButtonState(
    fields.replyLatestTwoProfileMessage,
    busy || !latestConversation,
    busy ? "Wait for the active production action." : "Load a stored conversation first.",
    latestReplySelected,
  );
  setActionButtonState(
    fields.reviewPendingTwoProfileMessage,
    busy || !pendingConversation,
    busy ? "Wait for the active production action." : "No pending sent/received gap in loaded conversation.",
    pendingSelected,
  );
  setActionButtonState(
    fields.runProductionTwoProfileRoundtrip,
    !availability.runTwoProfileRoundtrip,
    busy
      ? "Wait for the active production action."
      : twoProfileSessionsReady
        ? "Stored sessions are ready; send a stored-session message instead."
        : "Enter two profiles, passphrase, and message first.",
    twoProfileNeedsSetup,
  );
  setActionButtonState(
    fields.runProductionTwoProfileMessageRoundtrip,
    !availability.runTwoProfileMessageRoundtrip,
    busy
      ? "Wait for the active production action."
      : hasTwoProfileInput
        ? "Run full setup once before sending with stored sessions."
        : "Enter two profiles, passphrase, and message first.",
    twoProfileCanSendStoredMessage,
  );
  setActionButtonState(
    fields.useProductionPairingPayload,
    !manualAvailability.usePairingPayload,
    busy ? "Wait for the active production action." : "Export local pairing payload first.",
  );
  setActionButtonState(
    fields.storeProductionPairingPayload,
    !manualAvailability.storePairingPayload,
    busy ? "Wait for the active production action." : "Export local pairing payload first.",
    manualAvailability.storePairingPayload,
  );
  setActionButtonState(
    fields.loadProductionPairingPayload,
    !manualAvailability.loadPairingPayload,
    busy ? "Wait for the active production action." : "Store counterpart pairing payload first.",
    manualAvailability.loadPairingPayload,
  );
  setActionButtonState(
    fields.useProductionHandshakeInit,
    !manualAvailability.useHandshakeInit,
    busy ? "Wait for the active production action." : "Export handshake init first.",
  );
  setActionButtonState(
    fields.storeProductionHandshakeInit,
    !manualAvailability.storeHandshakeInit,
    busy ? "Wait for the active production action." : "Export handshake init first.",
    manualAvailability.storeHandshakeInit,
  );
  setActionButtonState(
    fields.loadProductionHandshakeInit,
    !manualAvailability.loadHandshakeInit,
    busy ? "Wait for the active production action." : "Store counterpart handshake init first.",
    manualAvailability.loadHandshakeInit,
  );
  setActionButtonState(
    fields.useProductionHandshakeReply,
    !manualAvailability.useHandshakeReply,
    busy ? "Wait for the active production action." : "Export handshake reply first.",
  );
  setActionButtonState(
    fields.storeProductionHandshakeReply,
    !manualAvailability.storeHandshakeReply,
    busy ? "Wait for the active production action." : "Export handshake reply first.",
    manualAvailability.storeHandshakeReply,
  );
  setActionButtonState(
    fields.loadProductionHandshakeReply,
    !manualAvailability.loadHandshakeReply,
    busy ? "Wait for the active production action." : "Store counterpart handshake reply first.",
    manualAvailability.loadHandshakeReply,
  );
  setActionButtonState(
    fields.useProductionHandshakeFinish,
    !manualAvailability.useHandshakeFinish,
    busy ? "Wait for the active production action." : "Export handshake finish first.",
  );
  setActionButtonState(
    fields.storeProductionHandshakeFinish,
    !manualAvailability.storeHandshakeFinish,
    busy ? "Wait for the active production action." : "Export handshake finish first.",
    manualAvailability.storeHandshakeFinish,
  );
  setActionButtonState(
    fields.loadProductionHandshakeFinish,
    !manualAvailability.loadHandshakeFinish,
    busy ? "Wait for the active production action." : "Store counterpart handshake finish first.",
    manualAvailability.loadHandshakeFinish,
  );
  setActionButtonState(
    fields.useProductionMessageEnvelope,
    !manualAvailability.useMessageEnvelope,
    busy ? "Wait for the active production action." : "Export local message envelope first.",
  );
  setActionButtonState(
    fields.storeProductionMessageEnvelope,
    !manualAvailability.storeMessageEnvelope,
    busy ? "Wait for the active production action." : "Export local message envelope first.",
    manualAvailability.storeMessageEnvelope,
  );
  setActionButtonState(
    fields.loadProductionMessageEnvelope,
    !manualAvailability.loadMessageEnvelope,
    busy ? "Wait for the active production action." : "Store counterpart message envelope first.",
    manualAvailability.loadMessageEnvelope && selectedNeedsPeerImport && !hasInboundEnvelopeInput,
  );
  setActionButtonState(
    fields.relayProductionMessageEnvelope,
    !manualAvailability.relayMessageEnvelope,
    busy ? "Wait for the active production action." : "Export local message envelope first.",
    manualAvailability.relayMessageEnvelope,
  );
  setActionButtonState(
    fields.swapTwoProfileDirection,
    fields.swapTwoProfileDirection?.disabled ?? true,
    "Complete a local roundtrip before swapping direction.",
    twoProfileCanReply && !latestTwoProfileSuccessMatchesOppositeDirection(twoProfile),
  );
  setActionButtonState(
    fields.editTwoProfileMessage,
    fields.editTwoProfileMessage?.disabled ?? true,
    "Complete a local roundtrip before editing the next message.",
    twoProfileCanReply && latestTwoProfileSuccessMatchesOppositeDirection(twoProfile),
  );
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
  latestProductionTwoProfileSessionStatus = null;
  setProductionTwoProfileState("Two-profile roundtrip idle");
  setText(fields.productionTwoProfileWarning, "Two-profile app-data harness has not run yet.");
  setText(fields.productionTwoProfileProfiles, "Not checked yet");
  setText(fields.productionTwoProfileSession, "Not checked yet");
  setText(fields.productionTwoProfileMessageState, "Not checked yet");
  setText(fields.productionTwoProfileBoundary, "Not checked yet");
  resetProductionTwoProfileTranscript();
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

function resetProductionPairingView(options = {}) {
  latestProductionSessionState = null;
  if (!options.preserveTwoProfileStatus) {
    latestProductionTwoProfileSessionStatus = null;
  }
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
  resetProductionMessageImportState();
  resetProductionMessageTranscript();
  setProductionMessageState("Message flow idle");
  setText(fields.productionMessageWarning, "Message envelope has not been exported yet.");
  if (fields.productionMessageEnvelope) {
    fields.productionMessageEnvelope.value = "";
  }
  setText(fields.productionMessageActiveStatus, "Not checked yet");
  setText(
    fields.productionMessageManualCheck,
    "Manual check: verify active profile, message number, and envelope source.",
  );
  setText(fields.productionMessageOutbound, "Not checked yet");
  setText(fields.productionMessageInbound, "Not checked yet");
  setText(fields.productionMessageBoundary, "Not checked yet");
  setProductionMessageManualCurrent(null);
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
    rememberTwoProfileReadySessionFromRoundtrip(input, result);
    renderProductionTwoProfileMemory(input);
    if (fields.productionTwoProfileMessage) {
      fields.productionTwoProfileMessage.value = "";
      renderProductionTwoProfileDirection(productionTwoProfileInput());
    }
  }
  setProductionFollowupActions(view.canContinue, view.nextStep);
  return view;
}

function renderProductionTwoProfileMessageResult(result) {
  const input = productionTwoProfileInput();
  const view = productionTwoProfileMessageResultView(result);

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
    applyStoredSessionMessageResultToManualFlow(result, input.message);
    if (fields.productionTwoProfileMessage) {
      fields.productionTwoProfileMessage.value = "";
      renderProductionTwoProfileDirection(productionTwoProfileInput());
    }
  }
  setProductionFollowupActions(view.canContinue, view.nextStep);
  return view;
}

function applyStoredSessionMessageResultToManualFlow(result, message) {
  const sender = String(result.sender_profile ?? "").trim().toLowerCase();
  const receiver = String(result.receiver_profile ?? "").trim().toLowerCase();
  const messageNumber = Number.parseInt(result.message_number, 10);
  const text = String(message ?? "").trim();
  if (!sender || !receiver || !Number.isInteger(messageNumber) || messageNumber < 1) {
    return;
  }

  if (fields.productionProfileName) {
    fields.productionProfileName.value = sender;
  }
  if (fields.productionProfileSelector) {
    fields.productionProfileSelector.value = sender;
  }
  if (fields.productionMessageNumber) {
    fields.productionMessageNumber.value = String(messageNumber);
  }
  if (text) {
    selectedTwoProfileConversationKey = twoProfileConversationKey({
      sender,
      receiver,
      messageNumber,
      message: text,
    });
    appendProductionTranscriptEntry("sent", sender, messageNumber, text);
    appendProductionTranscriptEntry("received", receiver, messageNumber, text);
    appendProductionTwoProfileConversationStatus("sent", sender, receiver, messageNumber, text);
    appendProductionTwoProfileConversationStatus("received", receiver, sender, messageNumber, text);
  }
  latestProductionMessageImport = null;
  setProductionMessageState("Stored-session message synced");
  setText(
    fields.productionMessageWarning,
    `Stored-session message #${messageNumber} synced to manual view. Active sender=${sender}; receiver=${receiver}.`,
  );
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
    autoMessageNumber: productionMessageUsesAutoNumber(),
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
    setText(fields.sessionDurableState, "Store-write adapter boundary; product unlock disabled");
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
    const sentInput = { profileA, profileB };
    const view = renderProductionTwoProfileResult(result);
    if (view.canContinue) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
      selectTwoProfileReplyDirection(sentInput);
      setText(
        fields.productionTwoProfileWarning,
        `First message stored. Reply direction selected: ${profileB} -> ${profileA}.`,
      );
      fields.productionTwoProfileMessage?.focus();
    } else {
      setText(fields.productionTwoProfileWarning, result.warning);
    }
    await loadProductionProfileList();
  } catch (error) {
    setProductionTwoProfileState("Two-profile roundtrip failed");
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("roundtrip", error));
    setText(fields.productionTwoProfileProfiles, "Failed");
    setText(fields.productionTwoProfileSession, "Failed");
    setText(fields.productionTwoProfileMessageState, "Failed");
    setText(fields.productionTwoProfileBoundary, "Failed");
    setProductionFollowupActions(false, "Verify profiles/passphrase, then retry full setup.");
  } finally {
    productionBusyAction = null;
    if (fields.runProductionTwoProfileRoundtrip) {
      fields.runProductionTwoProfileRoundtrip.disabled = false;
    }
    applyProductionActionState();
  }
}

async function runProductionTwoProfileMessageRoundtrip() {
  const { profileA, profileB, passphrase, message } = productionTwoProfileInput();
  if (!profileA || !profileB || profileA === profileB || !passphrase || !message) {
    setProductionTwoProfileState("Stored-session message needs input");
    setText(
      fields.productionTwoProfileWarning,
      "Enter two distinct profiles with existing sessions, the production passphrase, and a message.",
    );
    return;
  }

  setProductionTwoProfileState("Stored-session message running");
  setText(fields.productionTwoProfileWarning, "Reusing existing encrypted session state.");
  setText(fields.productionTwoProfileProfiles, "Using existing encrypted profile stores");
  setText(fields.productionTwoProfileSession, "Checking stored sender and receiver sessions");
  setText(fields.productionTwoProfileMessageState, "Waiting for encrypted envelope and receive");
  setText(fields.productionTwoProfileBoundary, "Waiting for boundary flags");
  setProductionFollowupActions(false, "Stored-session message running. Follow-up actions are locked.");
  productionBusyAction = "two-profile-message-roundtrip";
  applyProductionActionState();
  try {
    const result = await invoke("production_two_profile_message_roundtrip", {
      profileA,
      profileB,
      passphrase,
      message,
    });
    setProductionTwoProfileState("Stored-session message completed");
    setText(fields.productionTwoProfileWarning, result.warning);
    const sentInput = { profileA, profileB };
    const view = renderProductionTwoProfileMessageResult(result);
    await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
    if (view.canContinue) {
      selectTwoProfileReplyDirection(sentInput);
      setText(
        fields.productionTwoProfileWarning,
        `Stored-session message completed. Reply direction selected: ${profileB} -> ${profileA}.`,
      );
    } else {
      setText(
        fields.productionTwoProfileWarning,
        "Stored-session message completed and conversation refreshed from encrypted local stores.",
      );
    }
    await loadProductionProfileList();
  } catch (error) {
    setProductionTwoProfileState("Stored-session message failed");
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("stored-message", error));
    setText(fields.productionTwoProfileProfiles, "Existing profiles not usable");
    setText(fields.productionTwoProfileSession, "Stored session check failed");
    setText(fields.productionTwoProfileMessageState, "Message not sent");
    setText(fields.productionTwoProfileBoundary, "Failed without returning local path details");
    setProductionFollowupActions(false, "Check sessions, verify passphrase, or run full setup.");
  } finally {
    productionBusyAction = null;
    applyProductionActionState();
  }
}

async function runTwoProfilePrimaryActionFromCompose() {
  if (productionBusyAction !== null) {
    setProductionTwoProfileState("Two-profile action already running");
    setText(fields.productionTwoProfileWarning, "Wait for the active production action before sending again.");
    return;
  }

  applyProductionActionState();
  if (fields.runProductionTwoProfileMessageRoundtrip && !fields.runProductionTwoProfileMessageRoundtrip.disabled) {
    await runProductionTwoProfileMessageRoundtrip();
    return;
  }
  if (fields.runProductionTwoProfileRoundtrip && !fields.runProductionTwoProfileRoundtrip.disabled) {
    await runProductionTwoProfileRoundtrip();
    return;
  }

  setProductionTwoProfileState("Two-profile send needs input");
  const input = productionTwoProfileInput();
  const readiness = twoProfilePrimaryReadiness(
    input,
    productionBusyAction !== null,
    twoProfileSessionsReadyForInput(input),
  );
  setText(fields.productionTwoProfileWarning, readiness.message);
}

function handleTwoProfileMessageKeydown(event) {
  if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey) || event.shiftKey) {
    return;
  }
  event.preventDefault();
  runTwoProfilePrimaryActionFromCompose();
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
    await restoreProductionSessionAfterUnlock(profile, passphrase);
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

async function restoreProductionSessionAfterUnlock(profile, passphrase) {
  let session;
  try {
    session = await invoke("production_session_state_check", { profile, passphrase });
  } catch {
    latestProductionSessionState = null;
    setProductionPairingState("No stored session");
    setText(fields.productionPairingSession, "No message-ready stored session for this profile yet");
    setText(fields.productionPairingBoundary, "Not checked yet");
    setProductionMessageState("Message flow idle");
    setText(
      fields.productionMessageWarning,
      "Profile unlocked. No stored message session was recovered.",
    );
    setText(fields.productionMessageBoundary, "Not checked yet");
    return;
  }

  const view = productionSessionStateView(session);
  latestProductionSessionState = session;
  setProductionPairingState(
    session.ready_for_message_envelope ? "Stored session recovered" : "Stored session incomplete",
  );
  setText(fields.productionPairingWarning, session.warning);
  setText(fields.productionPairingSession, view.session);
  setText(fields.productionPairingBoundary, view.pairingBoundary);
  setText(fields.productionMessageBoundary, view.messageBoundary);
  if (!session.ready_for_message_envelope) {
    setProductionMessageState("Message flow idle");
    setText(
      fields.productionMessageWarning,
      "Profile unlocked. Complete pairing and handshake before message recovery.",
    );
    return;
  }

  try {
    const transcript = await invoke("production_message_transcript_export", { profile, passphrase });
    renderProductionTranscriptEntries(profile, transcript.entries);
    setProductionMessageState("Stored transcript recovered");
    setText(fields.productionMessageWarning, transcript.warning);
    setText(
      fields.productionMessageBoundary,
      `plaintext_after_unlock=${transcript.plaintext_returned_after_unlock} key_material=${transcript.key_material_exposed} network_io=${transcript.network_io_attempted} transport_io=${transcript.transport_io_opened} runtime=${transcript.runtime_messaging_enabled}`,
    );
  } catch {
    setProductionMessageState("Transcript recovery unavailable");
    setText(
      fields.productionMessageWarning,
      "Stored session recovered. Transcript can be loaded after message records exist.",
    );
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

async function checkProductionTwoProfileSessionStatus() {
  const { profileA, profileB, passphrase } = productionTwoProfileInput();
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setText(
      fields.productionTwoProfileSessionStatus,
      "Enter distinct Profile A, Profile B, and passphrase first.",
    );
    setProductionTwoProfileState("Session check needs input");
    setText(
      fields.productionTwoProfileWarning,
      "Enter distinct Profile A, Profile B, and passphrase before checking stored sessions.",
    );
    return;
  }

  setText(fields.productionTwoProfileSessionStatus, "Checking encrypted local stores");
  setProductionTwoProfileState("Sessions checking");
  setText(fields.productionTwoProfileWarning, "Checking stored sessions after explicit local unlock.");
  productionBusyAction = "two-profile-session-status";
  let postCheckFocus = null;
  applyProductionActionState();
  if (fields.checkProductionTwoProfileSessionStatus) {
    fields.checkProductionTwoProfileSessionStatus.disabled = true;
  }
  if (fields.checkProductionTwoProfileSessionStatusInline) {
    fields.checkProductionTwoProfileSessionStatusInline.disabled = true;
  }
  try {
    const result = await invoke("production_two_profile_session_status", {
      profileA,
      profileB,
      passphrase,
    });
    const view = productionTwoProfileSessionStatusView(result);
    rememberTwoProfileSessionStatus({ profileA, profileB }, result);
    setText(fields.productionTwoProfileSessionStatus, `${view.state}: ${view.status}`);
    setText(fields.productionPairingWarning, result.warning);
    setText(fields.productionPairingBoundary, view.boundary);
    if (result.both_ready_for_message_envelope) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
      const currentInput = productionTwoProfileInput();
      const hasDraft = Boolean(currentInput.message);
      setProductionTwoProfileState("Sessions ready");
      setText(
        fields.productionTwoProfileWarning,
        hasDraft
          ? `Stored sessions ready for ${currentInput.profileA} -> ${currentInput.profileB}. Run stored-session message.`
          : `Stored sessions ready for ${currentInput.profileA} -> ${currentInput.profileB}. Write a message to continue.`,
      );
      postCheckFocus = hasDraft
        ? fields.runProductionTwoProfileMessageRoundtrip
        : fields.productionTwoProfileMessage;
    } else {
      const currentInput = productionTwoProfileInput();
      setProductionTwoProfileState("Sessions incomplete");
      setText(
        fields.productionTwoProfileWarning,
        currentInput.message
          ? "Stored sessions are incomplete. Run full two-profile roundtrip to create session state."
          : "Stored sessions are incomplete. Write a first message, then run full two-profile roundtrip.",
      );
      postCheckFocus = currentInput.message
        ? fields.runProductionTwoProfileRoundtrip
        : fields.productionTwoProfileMessage;
    }
  } catch (error) {
    latestProductionTwoProfileSessionStatus = null;
    setProductionTwoProfileState("Session check failed");
    setText(fields.productionTwoProfileSessionStatus, "Two-profile session status failed");
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("session-status", error));
    setText(fields.productionPairingWarning, String(error));
    postCheckFocus = fields.checkProductionTwoProfileSessionStatusInline;
  } finally {
    productionBusyAction = null;
    if (fields.checkProductionTwoProfileSessionStatus) {
      fields.checkProductionTwoProfileSessionStatus.disabled = false;
    }
    if (fields.checkProductionTwoProfileSessionStatusInline) {
      fields.checkProductionTwoProfileSessionStatusInline.disabled = false;
    }
    applyProductionActionState();
    postCheckFocus?.focus();
  }
}

async function refreshTwoProfileSessionStatusAfterTranscript(input) {
  const result = await invoke("production_two_profile_session_status", {
    profileA: input.profileA,
    profileB: input.profileB,
    passphrase: input.passphrase,
  });
  const view = productionTwoProfileSessionStatusView(result);
  rememberTwoProfileSessionStatus(input, result);
  setText(fields.productionTwoProfileSessionStatus, `${view.state}: ${view.status}`);
  setText(fields.productionPairingWarning, result.warning);
  setText(fields.productionPairingBoundary, view.boundary);
  return result;
}

async function loadProductionTwoProfileTranscript(options = {}) {
  const { profileA, profileB, passphrase } = productionTwoProfileInput();
  const quiet = options.quiet === true;
  const refreshSessionStatus = options.refreshSessionStatus !== false;
  const autoResume = options.autoResume === true;
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    if (!quiet) {
      setProductionTwoProfileState("Conversation load needs profiles");
      setText(
        fields.productionTwoProfileWarning,
        "Enter distinct Profile A, Profile B, and passphrase before loading conversation.",
      );
    }
    return;
  }

  if (!quiet) {
    setProductionTwoProfileState("Conversation loading");
    setText(fields.productionTwoProfileWarning, "Reading stored two-profile transcript after local unlock.");
    productionBusyAction = "two-profile-transcript-load";
    applyProductionActionState();
  }

  try {
    const [profileAResult, profileBResult] = await Promise.all([
      invoke("production_message_transcript_export", { profile: profileA, passphrase }),
      invoke("production_message_transcript_export", { profile: profileB, passphrase }),
    ]);
    const entries = [
      ...twoProfileTranscriptEntriesFromProfile(profileA, profileB, profileAResult.entries),
      ...twoProfileTranscriptEntriesFromProfile(profileB, profileA, profileBResult.entries),
    ];
    renderProductionTwoProfileTranscriptEntries(entries);
    let sessionStatus = latestTwoProfileSessionStatusForCurrentInput({ profileA, profileB });
    if (refreshSessionStatus) {
      sessionStatus = await refreshTwoProfileSessionStatusAfterTranscript({
        profileA,
        profileB,
        passphrase,
      });
    }
    if (!quiet) {
      const ready = Boolean(sessionStatus?.both_ready_for_message_envelope);
      setProductionTwoProfileState(ready ? "Conversation resumed" : "Conversation loaded");
      setText(
        fields.productionTwoProfileWarning,
        ready
          ? "Stored conversation and message-ready sessions recovered after local unlock."
          : "Stored conversation loaded, but sessions are not ready for stored-message send.",
      );
      autoSelectPendingTwoProfileConversation();
    } else if (autoResume && sessionStatus?.both_ready_for_message_envelope) {
      setProductionTwoProfileState("Conversation resumed");
      setText(
        fields.productionTwoProfileWarning,
        "Stored conversation and message-ready sessions recovered after local unlock.",
      );
    }
  } catch (error) {
    if (!quiet) {
      setProductionTwoProfileState("Conversation load failed");
      setText(fields.productionTwoProfileWarning, String(error));
    } else if (autoResume) {
      latestProductionTwoProfileSessionStatus = null;
    }
  } finally {
    if (!quiet) {
      productionBusyAction = null;
      applyProductionActionState();
    }
  }
}

async function refreshTwoProfileConversationAfterManualImport(profile, passphrase) {
  const importedProfile = String(profile ?? "").trim().toLowerCase();
  const input = productionTwoProfileInput();
  if (
    !importedProfile ||
    !passphrase ||
    !input.profileA ||
    !input.profileB ||
    input.profileA === input.profileB ||
    !input.passphrase ||
    (input.profileA !== importedProfile && input.profileB !== importedProfile)
  ) {
    return false;
  }

  try {
    await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
  } catch (error) {
    setProductionTwoProfileState("Conversation reload skipped");
    setText(
      fields.productionTwoProfileWarning,
      `Manual import for ${importedProfile} completed, but conversation reload failed: ${String(error)}`,
    );
    return false;
  }
  setProductionTwoProfileState("Conversation updated after import");
  const selectedEntry = selectedTwoProfileConversationEntry();
  if (!selectReplyAfterDeliveredReview(selectedEntry)) {
    setText(
      fields.productionTwoProfileWarning,
      `Manual import for ${importedProfile} completed; conversation transcript was reloaded from encrypted local stores.`,
    );
    renderProductionTwoProfileMemory(input);
  }
  return true;
}

function syncTwoProfileConversationAfterManualExport(profile, messageNumber, message) {
  const exportedProfile = String(profile ?? "").trim().toLowerCase();
  const selectedEntry = selectedTwoProfileConversationEntry();
  const selectedNumber = Number.parseInt(selectedEntry?.messageNumber, 10);
  const exportedNumber = Number.parseInt(messageNumber, 10);
  const text = String(message ?? "").trim();
  if (
    !selectedEntry ||
    !exportedProfile ||
    selectedEntry.sender !== exportedProfile ||
    !Number.isInteger(selectedNumber) ||
    selectedNumber !== exportedNumber ||
    selectedEntry.message !== text
  ) {
    return false;
  }

  appendProductionTwoProfileConversationStatus(
    "sent",
    exportedProfile,
    selectedEntry.receiver,
    exportedNumber,
    text,
  );
  setProductionTwoProfileState("Conversation updated after export");
  const refreshedEntry = selectedTwoProfileConversationEntry();
  if (!selectReplyAfterDeliveredReview(refreshedEntry)) {
    setText(
      fields.productionTwoProfileWarning,
      `Manual export for ${exportedProfile} completed; selected conversation row was updated.`,
    );
    applyProductionActionState();
  }
  return true;
}

function scheduleTwoProfileAutoResume() {
  const input = productionTwoProfileInput();
  if (
    productionBusyAction !== null ||
    !input.profileA ||
    !input.profileB ||
    input.profileA === input.profileB ||
    !input.passphrase ||
    latestTwoProfileSessionStatusForCurrentInput(input)
  ) {
    return;
  }

  const fingerprint = twoProfileAutoResumeFingerprint(input);
  if (latestTwoProfileAutoResumeFingerprint === fingerprint) {
    return;
  }
  latestTwoProfileAutoResumeFingerprint = fingerprint;
  if (twoProfileAutoResumeTimer) {
    clearTimeout(twoProfileAutoResumeTimer);
  }
  twoProfileAutoResumeTimer = setTimeout(async () => {
    twoProfileAutoResumeTimer = null;
    if (productionBusyAction !== null) {
      return;
    }
    const currentInput = productionTwoProfileInput();
    if (
      twoProfileAutoResumeFingerprint(currentInput) !== fingerprint ||
      latestTwoProfileSessionStatusForCurrentInput(currentInput)
    ) {
      return;
    }
    await loadProductionTwoProfileTranscript({ quiet: true, autoResume: true });
    applyProductionActionState();
  }, 450);
}

function twoProfileTranscriptEntriesFromProfile(profile, counterpartProfile, entries) {
  return (entries ?? []).map((entry) => ({
    profile,
    counterpartProfile,
    kind: entry.direction === "received" ? "received" : "sent",
    messageNumber: entry.message_number,
    message: entry.message,
  }));
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
  const { profile, passphrase, autoMessageNumber, messageNumber, message } =
    productionMessageInput();
  if (
    !profile ||
    !passphrase ||
    (!autoMessageNumber && (!Number.isInteger(messageNumber) || messageNumber < 1)) ||
    !message
  ) {
    setProductionMessageState("Message export needs input");
    setText(fields.productionMessageWarning, "Enter profile, passphrase, and message.");
    return;
  }

  setProductionMessageState("Message envelope exporting");
  setText(fields.productionMessageWarning, "Preparing and encrypting production message.");
  resetProductionMessageImportState();
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
      messageNumber: autoMessageNumber ? 0 : messageNumber,
      autoMessageNumber,
      message,
    });
    const view = productionMessageEnvelopeExportView(result);
    setProductionMessageState("Message envelope exported");
    setText(fields.productionMessageWarning, result.warning);
    if (fields.productionMessageNumber) {
      fields.productionMessageNumber.value = String(result.selected_message_number);
    }
    if (fields.productionMessageEnvelope) {
      fields.productionMessageEnvelope.value = result.envelope_payload;
    }
    appendProductionTranscriptEntry("sent", profile, result.selected_message_number, message);
    syncTwoProfileConversationAfterManualExport(profile, result.selected_message_number, message);
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
  resetProductionMessageImportState();
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
    latestProductionMessageImport = productionMessageImportFingerprint({ profile, messageNumber });
    const clearedEnvelopeSlot = clearImportedMessageEnvelopeSlot(profile, envelopePayload);
    setProductionMessageState("Message envelope imported");
    setText(
      fields.productionMessageWarning,
      clearedEnvelopeSlot
        ? `${result.warning} Consumed matching stored sender envelope slot.`
        : result.warning,
    );
    setText(fields.productionMessageOutbound, "Not exported in this profile");
    setText(fields.productionMessageInbound, view.inbound);
    setText(fields.productionMessageBoundary, view.boundary);
    await refreshTwoProfileConversationAfterManualImport(profile, passphrase);
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
    appendProductionTranscriptEntry("received", profile, messageNumber, result.received_message);
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

async function loadProductionMessageTranscript() {
  const { profile, passphrase } = productionProfileInput();
  if (!profile || !passphrase) {
    setProductionMessageState("Transcript load needs profile");
    setText(fields.productionMessageWarning, "Enter profile and passphrase before loading transcript.");
    return;
  }

  setProductionMessageState("Transcript loading");
  setText(fields.productionMessageWarning, "Reading stored transcript after local unlock.");
  productionBusyAction = "transcript-load";
  applyProductionActionState();
  if (fields.loadProductionMessageTranscript) {
    fields.loadProductionMessageTranscript.disabled = true;
  }
  try {
    const result = await invoke("production_message_transcript_export", {
      profile,
      passphrase,
    });
    renderProductionTranscriptEntries(profile, result.entries);
    setProductionMessageState("Transcript loaded");
    setText(fields.productionMessageWarning, result.warning);
    setText(
      fields.productionMessageBoundary,
      `plaintext_after_unlock=${result.plaintext_returned_after_unlock} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setProductionMessageState("Transcript load failed");
    setText(fields.productionMessageWarning, String(error));
  } finally {
    productionBusyAction = null;
    if (fields.loadProductionMessageTranscript) {
      fields.loadProductionMessageTranscript.disabled = false;
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
      const selectedProfile = fields.productionProfileSelector.value;
      const preset = productionProfilePreset(selectedProfile);
      fields.productionProfileName.value = selectedProfile;
      if (preset && fields.productionPairingEndpoint) {
        fields.productionPairingEndpoint.value = preset.rendezvousEndpoint;
      }
      syncProductionProfilePassphraseFromTwoProfile();
      resetProductionPairingView({ preserveTwoProfileStatus: true });
      resetProductionMessageView();
      applyTwoProfilePairFromProfile(selectedProfile);
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
  fields.productionPairingEndpoint,
  fields.productionPairingPayload,
  fields.productionRemotePairingPayload,
  fields.productionRemoteHandshakeInitPayload,
  fields.productionRemoteHandshakeReplyPayload,
  fields.productionRemoteHandshakeFinishPayload,
  fields.productionMessageAutoNumber,
  fields.productionMessageNumber,
  fields.productionMessageBody,
  fields.productionRemoteMessageEnvelope,
  fields.productionTwoProfileA,
  fields.productionTwoProfileB,
  fields.productionTwoProfileMessage,
]) {
  if (input) {
    input.addEventListener("input", () => {
      applyProductionActionState();
      scheduleTwoProfileAutoResume();
    });
  }
}

if (fields.productionProfilePassphrase) {
  fields.productionProfilePassphrase.addEventListener("input", () => {
    syncProductionTwoProfilePassphraseFromProfile();
    resetTwoProfileAutoResumeAttempt();
    applyProductionActionState();
    scheduleTwoProfileAutoResume();
  });
}

if (fields.productionTwoProfilePassphrase) {
  fields.productionTwoProfilePassphrase.addEventListener("input", () => {
    syncProductionProfilePassphraseFromTwoProfile();
    resetTwoProfileAutoResumeAttempt();
    applyProductionActionState();
    scheduleTwoProfileAutoResume();
  });
}

if (fields.productionTwoProfileMessage) {
  fields.productionTwoProfileMessage.addEventListener("keydown", handleTwoProfileMessageKeydown);
}

if (fields.productionRemoteMessageEnvelope) {
  fields.productionRemoteMessageEnvelope.addEventListener("input", () => {
    resetProductionMessageImportState();
    applyProductionActionState();
  });
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

if (fields.storeProductionPairingPayload) {
  fields.storeProductionPairingPayload.addEventListener("click", () =>
    storeProductionPayloadSlot("pairing", fields.productionPairingPayload, "Pairing payload"),
  );
}

if (fields.loadProductionPairingPayload) {
  fields.loadProductionPairingPayload.addEventListener("click", () =>
    loadProductionPayloadSlot("pairing", fields.productionRemotePairingPayload, "Pairing payload"),
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

if (fields.storeProductionHandshakeInit) {
  fields.storeProductionHandshakeInit.addEventListener("click", () =>
    storeProductionPayloadSlot("handshakeInit", fields.productionHandshakeInitPayload, "Handshake init"),
  );
}

if (fields.loadProductionHandshakeInit) {
  fields.loadProductionHandshakeInit.addEventListener("click", () =>
    loadProductionPayloadSlot("handshakeInit", fields.productionRemoteHandshakeInitPayload, "Handshake init"),
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

if (fields.storeProductionHandshakeReply) {
  fields.storeProductionHandshakeReply.addEventListener("click", () =>
    storeProductionPayloadSlot("handshakeReply", fields.productionHandshakeReplyPayload, "Handshake reply"),
  );
}

if (fields.loadProductionHandshakeReply) {
  fields.loadProductionHandshakeReply.addEventListener("click", () =>
    loadProductionPayloadSlot("handshakeReply", fields.productionRemoteHandshakeReplyPayload, "Handshake reply"),
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

if (fields.storeProductionHandshakeFinish) {
  fields.storeProductionHandshakeFinish.addEventListener("click", () =>
    storeProductionPayloadSlot("handshakeFinish", fields.productionHandshakeFinishPayload, "Handshake finish"),
  );
}

if (fields.loadProductionHandshakeFinish) {
  fields.loadProductionHandshakeFinish.addEventListener("click", () =>
    loadProductionPayloadSlot("handshakeFinish", fields.productionRemoteHandshakeFinishPayload, "Handshake finish"),
  );
}

if (fields.importProductionHandshakeFinish) {
  fields.importProductionHandshakeFinish.addEventListener("click", importProductionHandshakeFinish);
}

if (fields.checkProductionSessionState) {
  fields.checkProductionSessionState.addEventListener("click", checkProductionSessionState);
}

if (fields.checkProductionTwoProfileSessionStatus) {
  fields.checkProductionTwoProfileSessionStatus.addEventListener(
    "click",
    checkProductionTwoProfileSessionStatus,
  );
}

if (fields.checkProductionTwoProfileSessionStatusInline) {
  fields.checkProductionTwoProfileSessionStatusInline.addEventListener(
    "click",
    checkProductionTwoProfileSessionStatus,
  );
}

if (fields.exportProductionMessageEnvelope) {
  fields.exportProductionMessageEnvelope.addEventListener("click", exportProductionMessageEnvelope);
}

if (fields.useProductionMessageEnvelope) {
  fields.useProductionMessageEnvelope.addEventListener("click", moveLocalMessageEnvelope);
}

if (fields.storeProductionMessageEnvelope) {
  fields.storeProductionMessageEnvelope.addEventListener("click", storeProductionMessageEnvelope);
}

if (fields.loadProductionMessageEnvelope) {
  fields.loadProductionMessageEnvelope.addEventListener("click", loadProductionMessageEnvelope);
}

if (fields.relayProductionMessageEnvelope) {
  fields.relayProductionMessageEnvelope.addEventListener("click", relayProductionMessageEnvelopeToPeer);
}

if (fields.importProductionMessageEnvelope) {
  fields.importProductionMessageEnvelope.addEventListener("click", importProductionMessageEnvelope);
}

if (fields.exportProductionReceivedMessage) {
  fields.exportProductionReceivedMessage.addEventListener("click", exportProductionReceivedMessage);
}

if (fields.loadProductionMessageTranscript) {
  fields.loadProductionMessageTranscript.addEventListener("click", loadProductionMessageTranscript);
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

if (fields.runProductionTwoProfileMessageRoundtrip) {
  fields.runProductionTwoProfileMessageRoundtrip.addEventListener(
    "click",
    runProductionTwoProfileMessageRoundtrip,
  );
}

if (fields.loadProductionTwoProfileTranscript) {
  fields.loadProductionTwoProfileTranscript.addEventListener("click", () =>
    loadProductionTwoProfileTranscript(),
  );
}

if (fields.replyLatestTwoProfileMessage) {
  fields.replyLatestTwoProfileMessage.addEventListener("click", replyToLatestTwoProfileMessage);
}

if (fields.reviewPendingTwoProfileMessage) {
  fields.reviewPendingTwoProfileMessage.addEventListener("click", reviewPendingTwoProfileMessage);
}

if (fields.openManualProductionTools) {
  fields.openManualProductionTools.addEventListener("click", openManualProductionTools);
}

if (fields.focusLocalDiagnostic) {
  fields.focusLocalDiagnostic.addEventListener("click", focusLocalDiagnostic);
}

if (fields.swapTwoProfileDirection) {
  fields.swapTwoProfileDirection.addEventListener("click", swapTwoProfileDirection);
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
