import { invoke } from "@tauri-apps/api/core";
import * as QRCode from "qrcode";
import {
  productionActionAvailability,
  productionCounterpartProfile,
  productionHandshakeFinishImportView,
  productionHandshakePayloadView,
  productionManualMessageCheckView,
  productionManualCurrentFocusTarget,
  productionManualCurrentStepView,
  productionManualNextActions,
  productionManualPrimaryActions,
  productionManualRelayCurrentActions,
  productionManualRelayDisabledReasons,
  productionManualRelayAvailability,
  productionManualRelaySuccessWarning,
  productionManualMessageStatusView,
  productionManualStatusView,
  productionMessageEnvelopeExportView,
  productionMessageEnvelopeImportView,
  productionMessageTtlInputValue,
  productionOnionReceiveFailureMessage,
  productionOnionReceiveLoopRefreshPlan,
  productionOnionReceiveRuntimeView,
  productionPairingPayloadView,
  productionProfileMessageReadiness,
  productionProfilePreset,
  productionProfileUnlockView,
  productionReceivedMessageExportView,
  productionSessionDraftView,
  productionSessionStateView,
  productionTwoProfilePairFromProfiles,
  productionTwoProfileConversationActionView,
  productionTwoProfileConversationCompare,
  productionTwoProfileCurrentAction,
  productionTwoProfileMessageResultView,
  productionTwoProfileReplySelectionView,
  productionTwoProfileResultView,
  productionTwoProfileResumeTarget,
  productionTwoProfileSessionSummaryView,
  productionTwoProfileSessionStatusView,
} from "./action-state.js";
import {
  createMessageEnvelopeSlot,
  messageEnvelopeSlotMatchesEntry,
  messageEnvelopeSlotPayload,
  messageEnvelopeSlotReadyForEntry as envelopeSlotReadyForEntry,
} from "./message-envelope-slots.js";
import { combinedTwoProfileTranscriptTsv } from "./transcript-export.js";
import { transcriptRetentionView } from "./transcript-retention.js";
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
  checkOnionPreflight: document.querySelector("#check-onion-preflight"),
  onionPreflightState: document.querySelector("#onion-preflight-state"),
  onionPreflightWarning: document.querySelector("#onion-preflight-warning"),
  onionPreflightRuntime: document.querySelector("#onion-preflight-runtime"),
  onionPreflightLaunch: document.querySelector("#onion-preflight-launch"),
  onionPreflightEvents: document.querySelector("#onion-preflight-events"),
  onionPreflightBoundary: document.querySelector("#onion-preflight-boundary"),
  prepareOnionBackupExclusion: document.querySelector("#prepare-onion-backup-exclusion"),
  onionBackupExclusionState: document.querySelector("#onion-backup-exclusion-state"),
  onionBackupExclusionBoundary: document.querySelector("#onion-backup-exclusion-boundary"),
  checkOnionClientPreflight: document.querySelector("#check-onion-client-preflight"),
  onionClientPreflightState: document.querySelector("#onion-client-preflight-state"),
  onionClientPreflightBoundary: document.querySelector("#onion-client-preflight-boundary"),
  checkOnionClientAttemptGate: document.querySelector("#check-onion-client-attempt-gate"),
  onionClientAttemptGateState: document.querySelector("#onion-client-attempt-gate-state"),
  onionClientAttemptGateBoundary: document.querySelector("#onion-client-attempt-gate-boundary"),
  manualOnionNetworkPermission: document.querySelector("#manual-onion-network-permission"),
  runOnionClientOnce: document.querySelector("#run-onion-client-once"),
  onionClientOnceState: document.querySelector("#onion-client-once-state"),
  onionClientOnceBoundary: document.querySelector("#onion-client-once-boundary"),
  checkOnionPersistentClient: document.querySelector("#check-onion-persistent-client"),
  startOnionPersistentClient: document.querySelector("#start-onion-persistent-client"),
  onionPersistentClientState: document.querySelector("#onion-persistent-client-state"),
  onionPersistentClientBoundary: document.querySelector("#onion-persistent-client-boundary"),
  prepareOnionKeyRecord: document.querySelector("#prepare-onion-key-record"),
  onionKeyRecordState: document.querySelector("#onion-key-record-state"),
  onionKeyRecordBoundary: document.querySelector("#onion-key-record-boundary"),
  checkOnionLaunchPreflight: document.querySelector("#check-onion-launch-preflight"),
  onionLaunchPreflightState: document.querySelector("#onion-launch-preflight-state"),
  onionLaunchPreflightBoundary: document.querySelector("#onion-launch-preflight-boundary"),
  attemptOnionServiceLaunch: document.querySelector("#attempt-onion-service-launch"),
  onionServiceLaunchAttempt: document.querySelector("#onion-service-launch-attempt"),
  prepareOnionDescriptorPublication: document.querySelector("#prepare-onion-descriptor-publication"),
  attemptOnionDescriptorPublication: document.querySelector("#attempt-onion-descriptor-publication"),
  onionDescriptorPublicationState: document.querySelector("#onion-descriptor-publication-state"),
  onionDescriptorPublicationBoundary: document.querySelector("#onion-descriptor-publication-boundary"),
  onionDescriptorPublicationAttempt: document.querySelector("#onion-descriptor-publication-attempt"),
  prepareOnionInboundStream: document.querySelector("#prepare-onion-inbound-stream"),
  attemptOnionInboundEnvelopeReceive: document.querySelector("#attempt-onion-inbound-envelope-receive"),
  onionInboundStreamState: document.querySelector("#onion-inbound-stream-state"),
  onionInboundStreamBoundary: document.querySelector("#onion-inbound-stream-boundary"),
  onionInboundEnvelopeReceiveAttempt: document.querySelector("#onion-inbound-envelope-receive-attempt"),
  prepareOnionOutboundStream: document.querySelector("#prepare-onion-outbound-stream"),
  onionOutboundStreamState: document.querySelector("#onion-outbound-stream-state"),
  onionOutboundStreamBoundary: document.querySelector("#onion-outbound-stream-boundary"),
  prepareOnionStreamCloseout: document.querySelector("#prepare-onion-stream-closeout"),
  onionStreamCloseoutState: document.querySelector("#onion-stream-closeout-state"),
  onionStreamCloseoutBoundary: document.querySelector("#onion-stream-closeout-boundary"),
  prepareOnionRemoteAuth: document.querySelector("#prepare-onion-remote-auth"),
  onionRemoteAuthState: document.querySelector("#onion-remote-auth-state"),
  onionRemoteAuthBoundary: document.querySelector("#onion-remote-auth-boundary"),
  prepareOnionOutboundEnvelopeSend: document.querySelector("#prepare-onion-outbound-envelope-send"),
  attemptOnionOutboundEnvelopeSend: document.querySelector("#attempt-onion-outbound-envelope-send"),
  onionOutboundEnvelopeSendState: document.querySelector("#onion-outbound-envelope-send-state"),
  onionOutboundEnvelopeSendBoundary: document.querySelector("#onion-outbound-envelope-send-boundary"),
  onionOutboundEnvelopeSendAttempt: document.querySelector("#onion-outbound-envelope-send-attempt"),
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
  productionManualCurrent: document.querySelector("#production-manual-current"),
  focusProductionCurrentAction: document.querySelector("#focus-production-current-action"),
  productionTwoProfileSessionStatus: document.querySelector("#production-two-profile-session-status"),
  checkProductionTwoProfileSessionStatus: document.querySelector(
    "#check-production-two-profile-session-status",
  ),
  productionPairingEndpoint: document.querySelector("#production-pairing-endpoint"),
  exportProductionPairing: document.querySelector("#export-production-pairing"),
  productionPairingState: document.querySelector("#production-pairing-state"),
  productionPairingNextAction: document.querySelector("#production-pairing-next-action"),
  productionPairingWarning: document.querySelector("#production-pairing-warning"),
  productionPairingStepExport: document.querySelector("#production-pairing-step-export"),
  productionPairingStepExportDetail: document.querySelector("#production-pairing-step-export-detail"),
  productionPairingStepRemote: document.querySelector("#production-pairing-step-remote"),
  productionPairingStepRemoteDetail: document.querySelector("#production-pairing-step-remote-detail"),
  productionPairingStepSafety: document.querySelector("#production-pairing-step-safety"),
  productionPairingStepSafetyDetail: document.querySelector("#production-pairing-step-safety-detail"),
  productionPairingStepDraft: document.querySelector("#production-pairing-step-draft"),
  productionPairingStepDraftDetail: document.querySelector("#production-pairing-step-draft-detail"),
  productionPairingPayload: document.querySelector("#production-pairing-payload"),
  productionPairingQr: document.querySelector("#production-pairing-qr"),
  productionPairingQrStatus: document.querySelector("#production-pairing-qr-status"),
  useProductionPairingPayload: document.querySelector("#use-production-pairing-payload"),
  storeProductionPairingPayload: document.querySelector("#store-production-pairing-payload"),
  loadProductionPairingPayload: document.querySelector("#load-production-pairing-payload"),
  relayProductionPairingPayload: document.querySelector("#relay-production-pairing-payload"),
  productionRemotePairingQrPayload: document.querySelector("#production-remote-pairing-qr-payload"),
  useProductionRemotePairingQr: document.querySelector("#use-production-remote-pairing-qr"),
  productionRemotePairingPayload: document.querySelector("#production-remote-pairing-payload"),
  checkProductionPairingSafety: document.querySelector("#check-production-pairing-safety"),
  productionPairingSafetyVerified: document.querySelector("#production-pairing-safety-verified"),
  productionPairingSafetyNumber: document.querySelector("#production-pairing-safety-number"),
  productionPairingSafetyPhrase: document.querySelector("#production-pairing-safety-phrase"),
  productionPairingSafetyBoundary: document.querySelector("#production-pairing-safety-boundary"),
  saveProductionSessionDraft: document.querySelector("#save-production-session-draft"),
  productionHandshakeInitPayload: document.querySelector("#production-handshake-init-payload"),
  useProductionHandshakeInit: document.querySelector("#use-production-handshake-init"),
  storeProductionHandshakeInit: document.querySelector("#store-production-handshake-init"),
  loadProductionHandshakeInit: document.querySelector("#load-production-handshake-init"),
  relayProductionHandshakeInit: document.querySelector("#relay-production-handshake-init"),
  productionRemoteHandshakeInitPayload: document.querySelector(
    "#production-remote-handshake-init-payload",
  ),
  productionHandshakeReplyPayload: document.querySelector("#production-handshake-reply-payload"),
  useProductionHandshakeReply: document.querySelector("#use-production-handshake-reply"),
  storeProductionHandshakeReply: document.querySelector("#store-production-handshake-reply"),
  loadProductionHandshakeReply: document.querySelector("#load-production-handshake-reply"),
  relayProductionHandshakeReply: document.querySelector("#relay-production-handshake-reply"),
  productionRemoteHandshakeReplyPayload: document.querySelector(
    "#production-remote-handshake-reply-payload",
  ),
  productionHandshakeFinishPayload: document.querySelector("#production-handshake-finish-payload"),
  useProductionHandshakeFinish: document.querySelector("#use-production-handshake-finish"),
  storeProductionHandshakeFinish: document.querySelector("#store-production-handshake-finish"),
  loadProductionHandshakeFinish: document.querySelector("#load-production-handshake-finish"),
  relayProductionHandshakeFinish: document.querySelector("#relay-production-handshake-finish"),
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
  productionMessageTtl: document.querySelector("#production-message-ttl"),
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
  productionMessageTranscriptExport: document.querySelector("#production-message-transcript-export"),
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
  productionTwoProfileMessageTtl: document.querySelector("#production-two-profile-message-ttl"),
  productionTwoProfileMessage: document.querySelector("#production-two-profile-message"),
  roomIdentityRoute: document.querySelector("#room-identity-route"),
  roomIdentityPair: document.querySelector("#room-identity-pair"),
  roomIdentityVerify: document.querySelector("#room-identity-verify"),
  roomIdentityTransport: document.querySelector("#room-identity-transport"),
  runProductionTwoProfileRoundtrip: document.querySelector("#run-production-two-profile-roundtrip"),
  checkProductionTwoProfileSessionStatusInline: document.querySelector(
    "#check-production-two-profile-session-status-inline",
  ),
  runProductionTwoProfileMessageRoundtrip: document.querySelector(
    "#run-production-two-profile-message-roundtrip",
  ),
  startProductionTwoProfileOnionBootstrap: document.querySelector(
    "#start-production-two-profile-onion-bootstrap",
  ),
  prepareProductionTwoProfileOnionKey: document.querySelector(
    "#prepare-production-two-profile-onion-key",
  ),
  launchProductionTwoProfileOnionEndpoint: document.querySelector(
    "#launch-production-two-profile-onion-endpoint",
  ),
  prepareProductionTwoProfileOnionPairing: document.querySelector(
    "#prepare-production-two-profile-onion-pairing",
  ),
  saveProductionTwoProfileOnionSessions: document.querySelector(
    "#save-production-two-profile-onion-sessions",
  ),
  refreshProductionTwoProfilePeerEndpoints: document.querySelector(
    "#refresh-production-two-profile-peer-endpoints",
  ),
  sendProductionTwoProfileEndpointUpdate: document.querySelector(
    "#send-production-two-profile-endpoint-update",
  ),
  completeProductionTwoProfileOnionHandshake: document.querySelector(
    "#complete-production-two-profile-onion-handshake",
  ),
  sendProductionTwoProfileLatestOnionEnvelope: document.querySelector(
    "#send-production-two-profile-latest-onion-envelope",
  ),
  startProductionTwoProfileOnionReceive: document.querySelector(
    "#start-production-two-profile-onion-receive",
  ),
  stopProductionTwoProfileOnionReceive: document.querySelector(
    "#stop-production-two-profile-onion-receive",
  ),
  runProductionTwoProfileRealOnionRoundtrip: document.querySelector(
    "#run-production-two-profile-real-onion-roundtrip",
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
  productionTwoProfileTranscriptExport: document.querySelector("#production-two-profile-transcript-export"),
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
let latestProductionTwoProfileOnionEndpoints = null;
let productionTwoProfileOnionReceiveMode = {
  enabled: false,
  profile: "",
  passphrase: "",
  timer: null,
  attempt: 0,
  inFlight: false,
  stopRequested: false,
  runtimeState: "stopped",
  runtimeLabel: "Receive mode stopped",
  lastProcessedImportSequence: 0,
  lastProcessedMessageImportCount: 0,
  lastProcessedEndpointUpdateCount: 0,
  generation: 0,
};
let latestProductionMessageImport = null;
let latestProductionPairingSafety = null;
let productionBusyAction = null;
let latestProductionManualFocusTarget = null;
let twoProfileAutoResumeTimer = null;
let latestTwoProfileAutoResumeFingerprint = null;
let selectedTwoProfileConversationKey = null;
const TWO_PROFILE_ONION_RECEIVE_RETRY_MS = 3000;
const productionTranscriptEntryKeys = new Set();
const productionTwoProfileConversationEntries = new Map();
const productionPayloadSlots = {
  pairing: new Map(),
  handshakeInit: new Map(),
  handshakeReply: new Map(),
  handshakeFinish: new Map(),
  messageEnvelope: new Map(),
};

const manualRemotePayloadFields = [
  { kind: "pairing", field: () => fields.productionRemotePairingPayload },
  { kind: "handshakeInit", field: () => fields.productionRemoteHandshakeInitPayload },
  { kind: "handshakeReply", field: () => fields.productionRemoteHandshakeReplyPayload },
  { kind: "handshakeFinish", field: () => fields.productionRemoteHandshakeFinishPayload },
];

const productionMessageRetentionPolicy = {
  status: "loading",
  error: null,
  defaultTtlSeconds: null,
  allowedTtlSeconds: [],
};
const localPreviewRetentionPolicy = {
  defaultTtlSeconds: 604_800,
  allowedTtlSeconds: [3_600, 86_400, 604_800, 2_592_000],
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

function setOnionPreflightState(message) {
  setText(fields.onionPreflightState, message);
}

function setOnionBackupExclusionState(message) {
  setText(fields.onionBackupExclusionState, message);
}

function setOnionClientPreflightState(message) {
  setText(fields.onionClientPreflightState, message);
}

function setOnionClientAttemptGateState(message) {
  setText(fields.onionClientAttemptGateState, message);
}

function setOnionClientOnceState(message) {
  setText(fields.onionClientOnceState, message);
}

function setOnionPersistentClientState(message) {
  setText(fields.onionPersistentClientState, message);
}

function setOnionKeyRecordState(message) {
  setText(fields.onionKeyRecordState, message);
}

function setOnionLaunchPreflightState(message) {
  setText(fields.onionLaunchPreflightState, message);
}

function setOnionDescriptorPublicationState(message) {
  setText(fields.onionDescriptorPublicationState, message);
}

function setOnionInboundStreamState(message) {
  setText(fields.onionInboundStreamState, message);
}

function setOnionOutboundStreamState(message) {
  setText(fields.onionOutboundStreamState, message);
}

function setOnionStreamCloseoutState(message) {
  setText(fields.onionStreamCloseoutState, message);
}

function setOnionRemoteAuthState(message) {
  setText(fields.onionRemoteAuthState, message);
}

function setOnionOutboundEnvelopeSendState(message) {
  setText(fields.onionOutboundEnvelopeSendState, message);
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

function messageRetentionPolicyReady() {
  return (
    productionMessageRetentionPolicy.status === "loaded" &&
    Number.isFinite(productionMessageRetentionPolicy.defaultTtlSeconds) &&
    productionMessageRetentionPolicy.allowedTtlSeconds.length > 0
  );
}

function messageRetentionPolicyBlocker() {
  if (messageRetentionPolicyReady()) {
    return "";
  }
  if (productionMessageRetentionPolicy.status === "failed") {
    return `Message retention policy unavailable: ${productionMessageRetentionPolicy.error ?? "load failed"}`;
  }
  return "Message retention policy loading; message actions are disabled.";
}

function hasTauriRuntimeBridge() {
  return Boolean(window.__TAURI_INTERNALS__?.invoke);
}

function applyLoadedMessageRetentionPolicy(defaultTtlSeconds, allowedTtlSeconds) {
  productionMessageRetentionPolicy.status = "loaded";
  productionMessageRetentionPolicy.error = null;
  productionMessageRetentionPolicy.defaultTtlSeconds = defaultTtlSeconds;
  productionMessageRetentionPolicy.allowedTtlSeconds = allowedTtlSeconds;
  renderMessageTtlControlOptions();
}

function messageTtlInputBlocker() {
  return messageRetentionPolicyReady()
    ? "Select a supported message retention value before continuing."
    : messageRetentionPolicyBlocker();
}

function setOpenManualProductionToolsLabel(label = "Open manual tools") {
  setText(fields.openManualProductionTools, label);
}

function setReviewPendingTwoProfileLabel(label = "Review") {
  setText(fields.reviewPendingTwoProfileMessage, label);
}

function chatReplyButtonLabel(label = "Reply") {
  if (label === "Reply to latest" || label === "Use selected reply") {
    return "Reply";
  }
  if (label === "Reply target set") {
    return "Reply set";
  }
  return label;
}

function chatReviewButtonLabel(label = "Review") {
  if (label === "Review pending") {
    return "Review";
  }
  if (label === "Open import tools") {
    return "Import";
  }
  if (label === "Open envelope input") {
    return "Envelope";
  }
  if (label === "Open export tools") {
    return "Export";
  }
  return label;
}

function setReplyLatestTwoProfileLabel(label = "Reply") {
  setText(fields.replyLatestTwoProfileMessage, chatReplyButtonLabel(label));
}

function setProductionMessageManualCurrent(target) {
  fields.productionMessageManualCheck?.classList.toggle("is-current-manual", target === "check");
  fields.productionMessageOutbound?.classList.toggle("is-current-manual", target === "outbound");
  fields.productionMessageInbound?.classList.toggle("is-current-manual", target === "inbound");
}

function revealManualProductionTools() {
  if (fields.manualProductionTools) {
    fields.manualProductionTools.open = true;
  }
}

function setProductionManualFocusCurrent(target) {
  for (const node of document.querySelectorAll(".is-current-input")) {
    node?.classList.remove("is-current-input");
  }
  productionManualFocusNode(target)?.classList.add("is-current-input");
}

function setTwoProfileComposeLocked(locked) {
  if (!fields.productionTwoProfileMessage) {
    return;
  }
  fields.productionTwoProfileMessage.readOnly = locked;
  fields.productionTwoProfileMessage.setAttribute("aria-busy", String(locked));
  fields.productionTwoProfileMessage.title = locked ? "Two-profile action is running." : "";
}

function setTwoProfileComposeCurrent(current) {
  fields.productionTwoProfileMessage?.classList.toggle("is-current-input", Boolean(current));
}

function setProductionFollowupActions(enabled, message) {
  setText(fields.productionTwoProfileNextStep, message);
  setOpenManualProductionToolsLabel();
  setActionButtonState(
    fields.openManualProductionTools,
    !enabled,
    "Next actions unlock after a completed local roundtrip.",
  );
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

function renderRoomIdentityBar(input, sessionsReady) {
  const route = input.profileA && input.profileB ? `${input.profileA} -> ${input.profileB}` : "profiles missing";
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  const activeEndpointState = twoProfilePeerEndpointState(input);
  const pairState = sessionsReady
    ? "stored session"
    : sessionStatus
      ? "incomplete"
      : "not checked";
  const verifyState = sessionsReady ? "safety confirmed" : "pending";
  const transportState = activeEndpointState.ready
    ? fields.manualOnionNetworkPermission?.checked
      ? "peer endpoint ready"
      : "endpoint ready; permission off"
    : activeEndpointState.stale
      ? "endpoint stale; refresh"
    : activeEndpointState.reason;

  setText(fields.roomIdentityRoute, route);
  setText(fields.roomIdentityPair, pairState);
  setText(fields.roomIdentityVerify, verifyState);
  setText(fields.roomIdentityTransport, transportState);
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

function renderProductionTwoProfileSessionStatusResult(result) {
  const view = productionTwoProfileSessionStatusView(result);
  const summary = productionTwoProfileSessionSummaryView(result);
  setText(fields.productionTwoProfileSessionStatus, `${view.state}: ${view.status}`);
  setText(fields.productionTwoProfileProfiles, summary.profiles);
  setText(fields.productionTwoProfileSession, summary.session);
  setText(fields.productionTwoProfileBoundary, summary.boundary);
  setText(fields.productionPairingBoundary, summary.boundary);
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

function rememberTwoProfileOnionEndpoints(input, endpoints) {
  if (!input?.profileA || !input?.profileB || !endpoints?.profileAEndpoint || !endpoints?.profileBEndpoint) {
    latestProductionTwoProfileOnionEndpoints = null;
    return;
  }
  latestProductionTwoProfileOnionEndpoints = {
    fingerprint: twoProfileSessionStatusFingerprint(input),
    profileA: input.profileA,
    profileB: input.profileB,
    profileAEndpoint: endpoints.profileAEndpoint,
    profileBEndpoint: endpoints.profileBEndpoint,
  };
}

function latestTwoProfilePeerOnionEndpoint(input = productionTwoProfileInput()) {
  if (
    !latestProductionTwoProfileOnionEndpoints ||
    latestProductionTwoProfileOnionEndpoints.fingerprint !== twoProfileSessionStatusFingerprint(input)
  ) {
    return "";
  }
  if (input.profileA === latestProductionTwoProfileOnionEndpoints.profileA) {
    return latestProductionTwoProfileOnionEndpoints.profileBEndpoint;
  }
  if (input.profileA === latestProductionTwoProfileOnionEndpoints.profileB) {
    return latestProductionTwoProfileOnionEndpoints.profileAEndpoint;
  }
  return "";
}

function latestTwoProfileLocalOnionEndpoint(input = productionTwoProfileInput()) {
  if (
    !latestProductionTwoProfileOnionEndpoints ||
    latestProductionTwoProfileOnionEndpoints.fingerprint !== twoProfileSessionStatusFingerprint(input)
  ) {
    return "";
  }
  if (input.profileA === latestProductionTwoProfileOnionEndpoints.profileA) {
    return latestProductionTwoProfileOnionEndpoints.profileAEndpoint;
  }
  if (input.profileA === latestProductionTwoProfileOnionEndpoints.profileB) {
    return latestProductionTwoProfileOnionEndpoints.profileBEndpoint;
  }
  return "";
}

function storedPeerEndpointPresentForInput(input = productionTwoProfileInput()) {
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  if (!sessionStatus || !input.profileA) {
    return false;
  }
  if (input.profileA === sessionStatus.profile_a) {
    return sessionStatus.profile_a_remote_endpoint_state_present === true;
  }
  if (input.profileA === sessionStatus.profile_b) {
    return sessionStatus.profile_b_remote_endpoint_state_present === true;
  }
  return false;
}

function storedPeerEndpointStatusForInput(input = productionTwoProfileInput()) {
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  if (!sessionStatus || !input.profileA) {
    return null;
  }
  if (input.profileA === sessionStatus.profile_a) {
    return {
      stale: sessionStatus.profile_a_remote_endpoint_marked_stale === true,
      refreshRecommended: sessionStatus.profile_a_remote_endpoint_refresh_recommended === true,
      lastFailedMessageNumber: sessionStatus.profile_a_remote_endpoint_last_failed_message_number ?? null,
    };
  }
  if (input.profileA === sessionStatus.profile_b) {
    return {
      stale: sessionStatus.profile_b_remote_endpoint_marked_stale === true,
      refreshRecommended: sessionStatus.profile_b_remote_endpoint_refresh_recommended === true,
      lastFailedMessageNumber: sessionStatus.profile_b_remote_endpoint_last_failed_message_number ?? null,
    };
  }
  return null;
}

function twoProfilePeerEndpointState(input = productionTwoProfileInput()) {
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return { ready: false, reason: "profiles missing" };
  }
  const transientEndpoint = latestTwoProfilePeerOnionEndpoint(input);
  if (transientEndpoint) {
    return { ready: true, reason: "ready", source: "current runtime" };
  }
  const storedStatus = storedPeerEndpointStatusForInput(input);
  if (storedStatus?.stale) {
    return {
      ready: false,
      reason: storedStatus.lastFailedMessageNumber
        ? `stored endpoint stale after message #${storedStatus.lastFailedMessageNumber}`
        : "stored endpoint stale",
      source: "stored session",
      stale: true,
      refreshRecommended: storedStatus.refreshRecommended,
    };
  }
  if (storedPeerEndpointPresentForInput(input)) {
    return { ready: true, reason: "stored endpoint ready", source: "stored session" };
  }
  if (latestTwoProfileSessionStatusForCurrentInput(input)) {
    return { ready: false, reason: "peer endpoint missing", source: "stored session" };
  }
  return { ready: false, reason: "endpoint not checked" };
}

function storedPeerEndpointTransportState(input = productionTwoProfileInput()) {
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return { ready: false, reason: "profiles missing" };
  }
  const storedStatus = storedPeerEndpointStatusForInput(input);
  if (storedStatus?.stale) {
    return {
      ready: false,
      reason: storedStatus.lastFailedMessageNumber
        ? `stored endpoint stale after message #${storedStatus.lastFailedMessageNumber}`
        : "stored endpoint stale",
      stale: true,
      refreshRecommended: storedStatus.refreshRecommended,
    };
  }
  if (storedPeerEndpointPresentForInput(input)) {
    return { ready: true, reason: "stored endpoint ready" };
  }
  if (latestTwoProfileSessionStatusForCurrentInput(input)) {
    return { ready: false, reason: "stored peer endpoint missing" };
  }
  return { ready: false, reason: "endpoint not checked" };
}

function latestTwoProfileOutboundOnionMessage(input = productionTwoProfileInput()) {
  const latest = latestProductionTwoProfileSuccess;
  if (
    !latest ||
    latest.profileA !== input.profileA ||
    latest.profileB !== input.profileB ||
    !Number.isInteger(latest.messageNumber) ||
    latest.messageNumber < 1
  ) {
    return null;
  }
  const peerEndpoint = latestTwoProfilePeerOnionEndpoint(input);
  const peerEndpointState = twoProfilePeerEndpointState(input);
  if (!peerEndpointState.ready) {
    return null;
  }
  return {
    profile: input.profileA,
    passphrase: input.passphrase,
    peerEndpoint,
    useStoredEndpoint: !peerEndpoint,
    messageNumber: latest.messageNumber,
  };
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
  latestProductionManualFocusTarget = productionManualCurrentFocusTarget(state);
  setProductionManualFocusCurrent(latestProductionManualFocusTarget);

  setText(fields.productionProfileNextAction, nextActions.profile);
  setText(fields.productionPairingNextAction, nextActions.pairing);
  setText(fields.productionMessageNextAction, nextActions.message);
  setText(fields.productionManualCurrent, productionManualCurrentStepView(state));
  setActionButtonState(
    fields.focusProductionCurrentAction,
    !latestProductionManualFocusTarget,
    "No current manual action while another action is running.",
  );
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

function completeProductionMessageImportReview() {
  latestProductionMessageImport = null;
}

function clearManualMessageDraftForReplySelection() {
  if (fields.productionMessageBody) {
    fields.productionMessageBody.value = "";
  }
  if (fields.productionMessageEnvelope) {
    fields.productionMessageEnvelope.value = "";
  }
  if (fields.productionRemoteMessageEnvelope) {
    fields.productionRemoteMessageEnvelope.value = "";
  }
}

function resetProductionMessageTranscript() {
  productionTranscriptEntryKeys.clear();
  resetTranscriptList(fields.productionMessageTranscript, "No messages yet.");
  if (fields.productionMessageTranscriptExport) {
    fields.productionMessageTranscriptExport.value = "";
  }
}

function resetProductionTwoProfileTranscript(options = {}) {
  if (options.preserveSelection !== true) {
    selectedTwoProfileConversationKey = null;
  }
  productionTwoProfileConversationEntries.clear();
  resetTranscriptList(fields.productionTwoProfileTranscript, "No two-profile messages yet.");
  if (fields.productionTwoProfileTranscriptExport) {
    fields.productionTwoProfileTranscriptExport.value = "";
  }
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

function appendTranscriptEntry(target, keySet, kind, profile, messageNumber, message, retentionMetadata = null) {
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
  const retentionView = transcriptRetentionView(retentionMetadata);
  const retention = document.createElement("span");
  retention.className = `transcript-retention ${retentionView.state}`;
  retention.textContent = retentionView.label;
  const body = document.createElement("span");
  body.textContent = text;
  item.append(meta, retention, body);
  target.append(item);
}

function appendProductionTranscriptEntry(kind, profile, messageNumber, message, retentionMetadata = null) {
  appendTranscriptEntry(
    fields.productionMessageTranscript,
    productionTranscriptEntryKeys,
    kind,
    profile,
    messageNumber,
    message,
    retentionMetadata,
  );
}

function messageEnvelopeSlotReadyForEntry(profile, entry) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  const slot = normalizedProfile ? productionPayloadSlots.messageEnvelope.get(normalizedProfile) : null;
  return envelopeSlotReadyForEntry(slot, entry);
}

function storeMessageEnvelopeSlot(profile, payload, metadata = {}) {
  const slot = createMessageEnvelopeSlot(profile, payload, metadata);
  if (!slot) {
    return false;
  }
  productionPayloadSlots.messageEnvelope.set(slot.sender, slot);
  return true;
}

function clearMessageEnvelopeFieldsForPayload(payload) {
  const envelope = String(payload ?? "").trim();
  if (!envelope) {
    return false;
  }
  let cleared = false;
  for (const field of [fields.productionRemoteMessageEnvelope, fields.productionMessageEnvelope]) {
    if (field?.value.trim() === envelope) {
      field.value = "";
      cleared = true;
    }
  }
  return cleared;
}

function pruneStaleMessageEnvelopeSlots() {
  let pruned = 0;
  for (const [sender, slot] of productionPayloadSlots.messageEnvelope.entries()) {
    if (typeof slot === "string") {
      continue;
    }
    const payload = messageEnvelopeSlotPayload(slot);
    const stillMatchesConversation = [...productionTwoProfileConversationEntries.values()].some((entry) =>
      messageEnvelopeSlotMatchesEntry(slot, entry),
    );
    if (!payload || !stillMatchesConversation) {
      productionPayloadSlots.messageEnvelope.delete(sender);
      clearMessageEnvelopeFieldsForPayload(payload);
      pruned += 1;
    }
  }
  return pruned;
}

function selectedMessageEnvelopeMetadata(profile, messageNumber, message) {
  const selectedEntry = selectedTwoProfileConversationEntry();
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  const parsedNumber = Number.parseInt(messageNumber, 10);
  const selectedNumber = Number.parseInt(selectedEntry?.messageNumber, 10);
  const text = String(message ?? "").trim();
  if (
    !selectedEntry ||
    !normalizedProfile ||
    !Number.isInteger(parsedNumber) ||
    !Number.isInteger(selectedNumber) ||
    selectedEntry.sender !== normalizedProfile ||
    selectedNumber !== parsedNumber ||
    selectedEntry.message !== text
  ) {
    return {};
  }
  return {
    receiver: selectedEntry.receiver,
    messageNumber: parsedNumber,
    message: text,
  };
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
  retention = {},
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
    createdAtMs: retention.createdAtMs,
    ttlSeconds: retention.ttlSeconds,
    expiresAtMs: retention.expiresAtMs,
    expired: retention.expired === true,
  };
  const key = twoProfileConversationKey(entry);
  const existing = productionTwoProfileConversationEntries.get(key) ?? {
    ...entry,
    statuses: new Set(),
  };
  existing.statuses.add(normalizedKind);
  if (entry.createdAtMs || entry.ttlSeconds || entry.expiresAtMs || entry.expired) {
    existing.createdAtMs = entry.createdAtMs;
    existing.ttlSeconds = entry.ttlSeconds;
    existing.expiresAtMs = entry.expiresAtMs;
    existing.expired = entry.expired;
  }
  productionTwoProfileConversationEntries.set(key, existing);
  renderProductionTwoProfileConversationList();
}

function twoProfileRetentionLabel(entry) {
  return transcriptRetentionView(entry).label;
}

function renderProductionTwoProfileConversationList() {
  const target = fields.productionTwoProfileTranscript;
  if (!target) {
    return;
  }
  target.replaceChildren();
  const entries = [...productionTwoProfileConversationEntries.values()].sort(
    productionTwoProfileConversationCompare,
  );
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "is-empty";
    empty.textContent = "No two-profile messages yet.";
    target.append(empty);
    return;
  }
  const replyTarget = selectedTwoProfileDeliveredReplyTarget(productionTwoProfileInput());
  const replyTargetKey = replyTarget ? twoProfileConversationKey(replyTarget) : null;
  for (const entry of entries) {
    const item = document.createElement("li");
    const key = twoProfileConversationKey(entry);
    const delivered = twoProfileConversationDelivered(entry);
    const inboundOnly = !entry.statuses.has("sent") && entry.statuses.has("received");
    const senderEnvelopeSlotPresent = messageEnvelopeSlotReadyForEntry(entry.sender, entry);
    const selected = key === selectedTwoProfileConversationKey;
    const currentReplyTarget = key === replyTargetKey;
    const currentReviewTarget = selected && !currentReplyTarget && !delivered;
    item.className = delivered ? "is-delivered" : inboundOnly ? "is-inbound-only" : "is-pending-receive";
    item.classList.toggle("is-selected", selected);
    item.classList.toggle("is-reply-target", currentReplyTarget);
    item.classList.toggle("is-review-target", currentReviewTarget);
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-pressed", selected ? "true" : "false");
    if (currentReplyTarget) {
      item.setAttribute("aria-current", "true");
    }
    item.setAttribute(
      "aria-label",
      currentReplyTarget
        ? `Reply target set for message ${entry.messageNumber}: write reply from ${entry.receiver} to ${entry.sender}`
      : delivered && selected
        ? `Selected delivered message ${entry.messageNumber}: use selected reply from ${entry.receiver} to ${entry.sender}`
        : delivered
        ? `Delivered message ${entry.messageNumber}: select to reply from ${entry.receiver} to ${entry.sender}`
      : currentReviewTarget
        ? `Review target set for pending message ${entry.messageNumber}: continue manual relay for ${entry.sender} to ${entry.receiver}`
        : `Pending message ${entry.messageNumber}: select to review manual relay for ${entry.sender} to ${entry.receiver}`,
    );
    item.addEventListener("click", () => selectTwoProfileConversationEntry(entry));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTwoProfileConversationEntry(entry);
      }
    });

    const meta = document.createElement("strong");
    meta.className = "transcript-meta";
    meta.textContent = `${entry.sender} -> ${entry.receiver} / #${entry.messageNumber}`;

    const status = document.createElement("span");
    status.className = `transcript-status ${delivered ? "is-delivered" : inboundOnly ? "is-inbound-only" : "is-pending-receive"}`;
    status.textContent = delivered
      ? "delivered"
      : inboundOnly
        ? "received"
        : "pending";

    const slot = document.createElement("span");
    slot.className = `transcript-slot ${senderEnvelopeSlotPresent ? "is-present" : "is-missing"}`;
    slot.textContent = senderEnvelopeSlotPresent
      ? `sender envelope slot: ready (${entry.sender})`
      : `sender envelope slot: missing (${entry.sender})`;

    const retention = document.createElement("span");
    const retentionView = transcriptRetentionView(entry);
    retention.className = `transcript-retention ${retentionView.state}`;
    retention.textContent = twoProfileRetentionLabel(entry);

    const actionView = twoProfileConversationActionView(entry);
    const action = document.createElement("span");
    action.className = `transcript-action ${actionView.state}`;
    action.textContent = currentReplyTarget
      ? "reply target"
      : actionView.state === "is-reply"
        ? "reply ready"
        : actionView.state === "is-ready"
          ? "action ready"
          : "waiting";

    const details = document.createElement("span");
    details.className = "transcript-details";
    details.textContent = `${slot.textContent} / ${actionView.rowLabel}`;

    const body = document.createElement("span");
    body.className = "transcript-body";
    body.textContent = entry.message;

    item.append(meta, body, status, retention, action, details);
    if (selected) {
      const review = document.createElement("span");
      review.className = `transcript-review ${
        currentReplyTarget ? "is-reply-target" : currentReviewTarget ? "is-review-target" : "is-selected"
      }`;
      review.textContent = currentReplyTarget
        ? `reply target: ${entry.receiver} -> ${entry.sender}`
        : delivered
        ? `reply candidate: ${entry.receiver} -> ${entry.sender}`
        : `review target set: message #${entry.messageNumber}`;
      item.append(review);
    }
    target.append(item);
  }
}

function latestTwoProfileConversationEntry() {
  const entries = [...productionTwoProfileConversationEntries.values()].sort((left, right) =>
    productionTwoProfileConversationCompare(left, right, "desc"),
  );
  return entries[0] ?? null;
}

function twoProfileConversationDelivered(entry) {
  return Boolean(entry?.statuses?.has("sent") && entry.statuses?.has("received"));
}

function twoProfileConversationReplyable(entry) {
  return Boolean(entry?.statuses?.has("received"));
}

function latestTwoProfilePendingConversationEntry() {
  const entries = [...productionTwoProfileConversationEntries.values()]
    .filter((entry) => !twoProfileConversationReplyable(entry))
    .sort((left, right) => productionTwoProfileConversationCompare(left, right, "desc"));
  return entries[0] ?? null;
}

function latestTwoProfileDeliveredConversationEntry() {
  const entries = [...productionTwoProfileConversationEntries.values()]
    .filter((entry) => twoProfileConversationReplyable(entry))
    .sort((left, right) => productionTwoProfileConversationCompare(left, right, "desc"));
  return entries[0] ?? null;
}

function selectedTwoProfileConversationEntry() {
  return selectedTwoProfileConversationKey
    ? productionTwoProfileConversationEntries.get(selectedTwoProfileConversationKey) ?? null
    : null;
}

function selectedTwoProfileDeliveredReplyTarget(input = productionTwoProfileInput()) {
  const entry = selectedTwoProfileConversationEntry();
  if (
    !entry ||
    !entry.statuses?.has("received") ||
    !input.profileA ||
    !input.profileB ||
    input.profileA !== entry.receiver ||
    input.profileB !== entry.sender
  ) {
    return null;
  }
  return entry;
}

function setSelectedTwoProfileConversationEntry(entry, options = {}) {
  if (!entry) {
    selectedTwoProfileConversationKey = null;
    return false;
  }
  selectedTwoProfileConversationKey = twoProfileConversationKey(entry);
  if (options.render !== false) {
    renderProductionTwoProfileConversationList();
  }
  return true;
}

function selectTwoProfileConversationMessage(sender, receiver, messageNumber, message, options = {}) {
  const normalizedNumber = Number.parseInt(messageNumber, 10);
  const text = String(message ?? "").trim();
  if (!sender || !receiver || !Number.isInteger(normalizedNumber) || normalizedNumber < 1 || !text) {
    return null;
  }
  const entry = {
    sender,
    receiver,
    messageNumber: normalizedNumber,
    message: text,
  };
  if (!setSelectedTwoProfileConversationEntry(entry, options)) {
    return null;
  }
  return selectedTwoProfileConversationEntry() ?? entry;
}

function selectedTwoProfilePendingConversationEntry() {
  const selectedEntry = selectedTwoProfileConversationEntry();
  return selectedEntry && !twoProfileConversationReplyable(selectedEntry)
    ? selectedEntry
    : null;
}

function selectedManualMessageActionBlocker(action, input = productionMessageInput()) {
  const entry = selectedTwoProfilePendingConversationEntry();
  if (!entry) {
    return "";
  }
  const profile = String(input.profile ?? "").trim().toLowerCase();
  const messageNumber = Number.parseInt(input.messageNumber, 10);
  const message = String(input.message ?? "").trim();
  if (Number.parseInt(entry.messageNumber, 10) !== messageNumber || String(entry.message ?? "").trim() !== message) {
    return `Reapply selected pending message #${entry.messageNumber} before ${action}; manual number/body no longer match.`;
  }
  if (action === "export") {
    if (entry.statuses?.has("sent")) {
      return `Selected pending message #${entry.messageNumber} already has a local sent copy; import the peer receive step instead.`;
    }
    if (input.autoMessageNumber) {
      return `Turn off auto-number before exporting selected pending message #${entry.messageNumber}.`;
    }
    if (profile !== entry.sender) {
      return `Select ${entry.sender} before exporting selected pending message #${entry.messageNumber}.`;
    }
  }
  if (action === "import") {
    if (!entry.statuses?.has("sent") || entry.statuses?.has("received")) {
      return `Selected pending message #${entry.messageNumber} is not waiting for peer import.`;
    }
    if (profile !== entry.receiver) {
      return `Select ${entry.receiver} before importing selected pending message #${entry.messageNumber}.`;
    }
  }
  return "";
}

function twoProfileConversationActionView(entry) {
  const senderEnvelopeSlotPresent = entry
    ? messageEnvelopeSlotReadyForEntry(entry.sender, entry)
    : false;
  const actionView = productionTwoProfileConversationActionView(entry, senderEnvelopeSlotPresent);
  const focusTargets = {
    "reply-message": fields.productionTwoProfileMessage,
    "import-envelope": fields.importProductionMessageEnvelope,
    "remote-envelope": fields.productionRemoteMessageEnvelope,
    "export-envelope": fields.exportProductionMessageEnvelope,
  };
  return {
    ...actionView,
    focusTargetKey: actionView.focusTarget,
    focusTarget: focusTargets[actionView.focusTarget] ?? null,
  };
}

function selectedTwoProfileNextActionMessage(entry) {
  return twoProfileConversationActionView(entry).nextAction;
}

function selectedTwoProfileManualFocusTarget(entry) {
  return twoProfileConversationActionView(entry).focusTarget;
}

function clearStaleTwoProfileConversationSelection() {
  if (!selectedTwoProfileConversationKey || productionTwoProfileConversationEntries.has(selectedTwoProfileConversationKey)) {
    return false;
  }
  selectedTwoProfileConversationKey = null;
  renderProductionTwoProfileConversationList();
  return true;
}

function renderProductionTwoProfileTranscriptEntries(entries) {
  resetProductionTwoProfileTranscript({ preserveSelection: true });
  const orderedEntries = [...(entries ?? [])].sort((left, right) =>
    productionTwoProfileConversationCompare(
      {
        sender: left.kind === "received" ? left.counterpartProfile : left.profile,
        receiver: left.kind === "received" ? left.profile : left.counterpartProfile,
        messageNumber: left.messageNumber,
        createdAtMs: left.createdAtMs,
      },
      {
        sender: right.kind === "received" ? right.counterpartProfile : right.profile,
        receiver: right.kind === "received" ? right.profile : right.counterpartProfile,
        messageNumber: right.messageNumber,
        createdAtMs: right.createdAtMs,
      },
    ),
  );
  for (const entry of orderedEntries) {
    appendProductionTwoProfileConversationStatus(
      entry.kind,
      entry.profile,
      entry.counterpartProfile,
      entry.messageNumber,
      entry.message,
      {
        createdAtMs: entry.createdAtMs,
        ttlSeconds: entry.ttlSeconds,
        expiresAtMs: entry.expiresAtMs,
        expired: entry.expired,
      },
    );
  }
  clearStaleTwoProfileConversationSelection();
  const prunedEnvelopeSlots = pruneStaleMessageEnvelopeSlots();
  if (prunedEnvelopeSlots > 0) {
    renderProductionTwoProfileConversationList();
    applyProductionActionState();
  }
  return prunedEnvelopeSlots;
}

function renderProductionTranscriptEntries(profile, entries) {
  resetProductionMessageTranscript();
  for (const entry of entries ?? []) {
    appendProductionTranscriptEntry(
      entry.direction === "received" ? "received" : "sent",
      profile,
      entry.message_number,
      entry.message,
      {
        ttlSeconds: entry.ttl_seconds,
        expiresAtMs: entry.expires_at_ms,
        expired: entry.expired,
      },
    );
  }
}

function transcriptRetentionWarning(result) {
  return appendMessageLifecyclePurgeWarning(result?.warning, result);
}

function transcriptBoundarySummary(result) {
  return `plaintext_after_unlock=${result.plaintext_returned_after_unlock} expired_purged=${result.expired_messages_purged ?? 0} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`;
}

function appendExpiredMessagesPurged(message, purged) {
  return purged > 0 ? `${message} Expired messages purged: ${purged}.` : message;
}

function appendStaleMessageEnvelopeSlotsPruned(message, pruned) {
  return pruned > 0 ? `${message} Stale message envelope slots cleared: ${pruned}.` : message;
}

function appendMessageLifecyclePurgeWarning(message, result) {
  const warning = String(message ?? "").trim();
  const messagesPurged = Number.parseInt(result?.expired_messages_purged ?? 0, 10);
  const outboundPurged = Number.parseInt(result?.expired_outbound_messages_purged ?? 0, 10);
  const lifecycleWarnings = [];
  if (Number.isInteger(messagesPurged) && messagesPurged > 0) {
    lifecycleWarnings.push(`Expired messages purged: ${messagesPurged}.`);
  }
  if (Number.isInteger(outboundPurged) && outboundPurged > 0) {
    lifecycleWarnings.push(`Expired outbound messages purged: ${outboundPurged}.`);
  }
  if (result?.expired_received_message_purged === true) {
    lifecycleWarnings.push("Expired received message purged.");
  }
  return [warning, ...lifecycleWarnings].filter(Boolean).join(" ");
}

function expiredOutboundMessagesPurged(result) {
  const purged = Number.parseInt(result?.expired_outbound_messages_purged ?? 0, 10);
  return Number.isInteger(purged) && purged > 0 ? purged : 0;
}

function appendMessageLifecyclePurgeWarningToField(field, result) {
  if (!field) {
    return;
  }
  const current = field.textContent ?? "";
  const updated = appendMessageLifecyclePurgeWarning(current, result);
  if (updated !== current) {
    setText(field, updated);
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
  return `${input.profileA}\n${input.profileB}\n${input.messageTtlSeconds}\n${input.message}`;
}

function messageTtlOptionsFromControls() {
  const values = new Set();
  for (const control of [fields.productionMessageTtl, fields.productionTwoProfileMessageTtl]) {
    for (const option of Array.from(control?.options ?? [])) {
      const value = Number.parseInt(option.value, 10);
      if (Number.isFinite(value) && value > 0) {
        values.add(value);
      }
    }
  }
  return Array.from(values);
}

function defaultMessageTtlSeconds() {
  if (messageRetentionPolicyReady()) {
    return productionMessageRetentionPolicy.defaultTtlSeconds;
  }
  const selected = Number.parseInt(fields.productionMessageTtl?.value ?? "", 10);
  return Number.isFinite(selected) && selected > 0 ? selected : (messageTtlOptionsFromControls()[0] ?? 0);
}

function allowedMessageTtlSeconds() {
  return productionMessageRetentionPolicy.allowedTtlSeconds.length > 0
    ? productionMessageRetentionPolicy.allowedTtlSeconds
    : messageTtlOptionsFromControls();
}

function selectedMessageTtlSeconds(node, fallback = defaultMessageTtlSeconds()) {
  const value = Number.parseInt(node?.value ?? String(fallback), 10);
  const allowed = allowedMessageTtlSeconds();
  if (allowed.length === 0) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  return allowed.includes(value) ? value : fallback;
}

function messageTtlInputValue(node) {
  return productionMessageTtlInputValue(
    node?.value,
    productionMessageRetentionPolicy.allowedTtlSeconds,
    productionMessageRetentionPolicy.defaultTtlSeconds,
  );
}

function retentionOptionLabel(ttlSeconds) {
  const days = ttlSeconds / 86400;
  if (Number.isInteger(days) && days >= 1) {
    return days === 1 ? "1 day" : `${days} days`;
  }
  const hours = ttlSeconds / 3600;
  return Number.isInteger(hours) ? `${hours} hour${hours === 1 ? "" : "s"}` : `${ttlSeconds}s`;
}

function renderMessageTtlControlOptions() {
  const allowed = allowedMessageTtlSeconds();
  const fallback = defaultMessageTtlSeconds();
  for (const control of [fields.productionMessageTtl, fields.productionTwoProfileMessageTtl]) {
    if (!control) {
      continue;
    }
    if (allowed.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent =
        productionMessageRetentionPolicy.status === "failed"
          ? "Retention policy unavailable"
          : "Loading retention policy";
      control.replaceChildren(option);
      continue;
    }
    const selected = selectedMessageTtlSeconds(control, fallback);
    control.replaceChildren(
      ...allowed.map((ttlSeconds) => {
        const option = document.createElement("option");
        option.value = String(ttlSeconds);
        option.textContent = retentionOptionLabel(ttlSeconds);
        option.selected = ttlSeconds === selected;
        return option;
      }),
    );
  }
}

async function loadProductionMessageRetentionPolicy() {
  productionMessageRetentionPolicy.status = "loading";
  productionMessageRetentionPolicy.error = null;
  renderMessageTtlControlOptions();
  applyProductionActionState();
  if (!hasTauriRuntimeBridge()) {
    applyLoadedMessageRetentionPolicy(
      localPreviewRetentionPolicy.defaultTtlSeconds,
      localPreviewRetentionPolicy.allowedTtlSeconds,
    );
    applyProductionActionState();
    return;
  }
  try {
    const policy = await invoke("production_message_retention_policy");
    const defaultTtlSeconds = Number.parseInt(policy.default_ttl_seconds, 10);
    const allowedTtlSeconds = Array.isArray(policy.allowed_ttl_seconds)
      ? policy.allowed_ttl_seconds
          .map((ttlSeconds) => Number.parseInt(ttlSeconds, 10))
          .filter((ttlSeconds) => Number.isFinite(ttlSeconds) && ttlSeconds > 0)
      : [];
    if (!Number.isFinite(defaultTtlSeconds) || !allowedTtlSeconds.includes(defaultTtlSeconds)) {
      throw new Error("retention policy did not include a valid default TTL");
    }
    applyLoadedMessageRetentionPolicy(defaultTtlSeconds, allowedTtlSeconds);
  } catch (error) {
    productionMessageRetentionPolicy.status = "failed";
    productionMessageRetentionPolicy.error = String(error);
    productionMessageRetentionPolicy.defaultTtlSeconds = null;
    productionMessageRetentionPolicy.allowedTtlSeconds = [];
    renderMessageTtlControlOptions();
  }
  applyProductionActionState();
}

function setMessageTtlControls(ttlSeconds) {
  const value = String(selectedMessageTtlSeconds({ value: ttlSeconds }, defaultMessageTtlSeconds()));
  if (fields.productionMessageTtl) {
    fields.productionMessageTtl.value = value;
  }
  if (fields.productionTwoProfileMessageTtl) {
    fields.productionTwoProfileMessageTtl.value = value;
  }
}

function setProductionMessageTtlFromEntry(entry) {
  const ttlSeconds = Number.parseInt(entry?.ttlSeconds ?? "", 10);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0 || !fields.productionMessageTtl) {
    return false;
  }
  if (!allowedMessageTtlSeconds().includes(ttlSeconds)) {
    return false;
  }
  fields.productionMessageTtl.value = String(ttlSeconds);
  fields.productionMessageTtl.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

async function loadProductionMessageRetentionPreference(profile, passphrase, options = {}) {
  const normalizedProfile = String(profile ?? "").trim();
  if (!normalizedProfile || !passphrase) {
    return null;
  }
  try {
    const result = await invoke("production_message_retention_preference_get", {
      profile: normalizedProfile,
      passphrase,
    });
    setMessageTtlControls(result.message_ttl_seconds);
    applyProductionActionState();
    return result;
  } catch (error) {
    if (options.quiet !== true) {
      setText(fields.productionMessageWarning, String(error));
    }
    return null;
  }
}

async function saveProductionMessageRetentionPreference(profile, passphrase, ttlSeconds) {
  const normalizedProfile = String(profile ?? "").trim();
  if (!normalizedProfile || !passphrase) {
    return null;
  }
  const messageTtlSeconds = productionMessageTtlInputValue(
    ttlSeconds,
    productionMessageRetentionPolicy.allowedTtlSeconds,
    productionMessageRetentionPolicy.defaultTtlSeconds,
  );
  if (!messageTtlSeconds) {
    throw new Error(messageTtlInputBlocker());
  }
  return invoke("production_message_retention_preference_set", {
    profile: normalizedProfile,
    passphrase,
    messageTtlSeconds,
  });
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
  const selectedReplyTarget = selectedTwoProfileDeliveredReplyTarget(input);
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  const sessionsReady = twoProfileSessionsReadyForInput(input);
  const hasRecoveredConversation = Boolean(latestTwoProfileConversationEntry());
  if (!sessionsReady && !sessionStatus && hasRecoveredConversation) {
    return "Check recovered sessions before writing";
  }
  if (!sessionsReady && sessionStatus) {
    return "Write setup message to rebuild sessions";
  }
  if (selectedReplyTarget) {
    return `Reply to message #${selectedReplyTarget.messageNumber} from ${input.profileA} to ${input.profileB}`;
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
  if (action === "real-onion-roundtrip") {
    return `Real onion transport did not complete. Retry after Tor bootstrap is reachable.${suffix}`;
  }
  return `Two-profile action failed.${suffix}`;
}

function twoProfileSessionRebuildMessage(input = productionTwoProfileInput()) {
  return input.message
    ? "Stored sessions are incomplete. Run full setup to rebuild session state."
    : "Stored sessions are incomplete. Write a setup message, then run full setup to rebuild session state.";
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

function setProductionPairingFlowStep(item, detail, state, message) {
  setTwoProfileFlowStep(item, detail, state, message);
}

function renderProductionPairingFlow(input = productionPairingInput()) {
  const hasProfile = Boolean(input.profile && input.passphrase);
  const hasEndpoint = Boolean(input.rendezvousEndpoint);
  const hasLocalPayload = Boolean(input.localPayload);
  const hasRemotePayload = Boolean(input.remotePayload);
  const hasSafetyPreview = Boolean(
    latestProductionPairingSafety?.fingerprint === pairingSafetyFingerprint(input),
  );
  const safetyVerified = currentPairingSafetyVerified(input);
  const draftSaved = Boolean(latestProductionSessionState?.session_draft_present);

  setProductionPairingFlowStep(
    fields.productionPairingStepExport,
    fields.productionPairingStepExportDetail,
    hasLocalPayload ? "complete" : hasProfile && hasEndpoint ? "running" : "pending",
    hasLocalPayload
      ? "Local QR payload is ready."
      : hasProfile && hasEndpoint
        ? "Export the local pairing QR."
        : "Unlock profile and set an onion endpoint.",
  );
  setProductionPairingFlowStep(
    fields.productionPairingStepRemote,
    fields.productionPairingStepRemoteDetail,
    hasRemotePayload ? "complete" : hasLocalPayload ? "running" : "pending",
    hasRemotePayload
      ? "Remote pairing payload is loaded."
      : hasLocalPayload
        ? "Paste scanned QR text or load the remote payload."
        : "Export local payload before loading remote.",
  );
  setProductionPairingFlowStep(
    fields.productionPairingStepSafety,
    fields.productionPairingStepSafetyDetail,
    safetyVerified ? "complete" : hasRemotePayload ? "running" : "pending",
    safetyVerified
      ? "Safety number marked verified."
      : hasSafetyPreview
        ? "Compare the shown safety number, then mark verified."
        : hasRemotePayload
          ? "Check safety before saving the draft."
          : "Load remote payload before safety check.",
  );
  setProductionPairingFlowStep(
    fields.productionPairingStepDraft,
    fields.productionPairingStepDraftDetail,
    draftSaved ? "complete" : safetyVerified ? "running" : "pending",
    draftSaved
      ? "Session draft is stored locally."
      : safetyVerified
        ? "Save the verified session draft."
        : "Safety verification is required before draft save.",
  );
}

function renderProductionTwoProfileFlow(input = productionTwoProfileInput()) {
  const profilesReady = Boolean(input.profileA && input.profileB && input.profileA !== input.profileB);
  const authReady = Boolean(profilesReady && input.passphrase);
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  const hasMessage = Boolean(input.message);
  const lastSuccess = latestProductionTwoProfileSuccess;
  const lastSuccessDirection = latestTwoProfileSuccessMatchesDirection(input);
  const lastSuccessOppositeDirection = latestTwoProfileSuccessMatchesOppositeDirection(input);
  const selectedReplyTarget = selectedTwoProfileDeliveredReplyTarget(input);
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
      twoProfileSessionRebuildMessage(input),
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
          ? selectedReplyTarget
            ? `Send reply to message #${selectedReplyTarget.messageNumber}.`
            : "Run stored-session message."
          : "Waiting for ready session and draft.",
  );

  setTwoProfileFlowStep(
    fields.productionTwoProfileStepReply,
    fields.productionTwoProfileStepReplyDetail,
    selectedReplyTarget || lastSuccessOppositeDirection ? "running" : lastSuccess ? "complete" : "pending",
    selectedReplyTarget
      ? `Reply target selected: message #${selectedReplyTarget.messageNumber} ${input.profileA} -> ${input.profileB}.`
      : lastSuccessOppositeDirection
      ? `Reply direction selected: ${input.profileA} -> ${input.profileB}.`
      : lastSuccess
        ? "Swap direction to reply."
        : "Complete one sent message first.",
  );
}

function twoProfilePrimaryReadiness(input, busy, sessionsReady, hasMessageRetentionPolicy = true) {
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  if (busy) {
    return { message: "Running: production action in progress", state: "blocked" };
  }
  if (!hasMessageRetentionPolicy) {
    return { message: messageRetentionPolicyBlocker(), state: "blocked" };
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
  if (!input.messageTtlSeconds) {
    return { message: messageTtlInputBlocker(), state: "blocked" };
  }
  if (!input.message) {
    const selectedReplyTarget = selectedTwoProfileDeliveredReplyTarget(input);
    return {
      message: sessionsReady
        ? selectedReplyTarget
          ? `Ready: write reply to message #${selectedReplyTarget.messageNumber}`
          : "Ready: stored session recovered; write a message"
        : sessionStatus
          ? "Ready: write setup message to rebuild sessions"
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
    message: sessionStatus
      ? `Ready: run full setup to rebuild sessions for ${input.profileA} -> ${input.profileB}`
      : `Ready: run full setup for ${input.profileA} -> ${input.profileB}`,
    state: "setup",
  };
}

function renderProductionTwoProfileMemory(input = productionTwoProfileInput()) {
  const currentDirection =
    input.profileA && input.profileB && input.profileA !== input.profileB
      ? `${input.profileA} -> ${input.profileB}`
      : "Current direction incomplete";
  const currentLabel = input.message
    ? `${currentDirection} | retention=${twoProfileRetentionLabel({ ttlSeconds: input.messageTtlSeconds }).replace("retention: ", "")} | draft_chars=${input.message.length}`
    : `${currentDirection} | no draft`;
  const latestConversation = latestTwoProfileConversationEntry();
  const selectedReplyTarget = selectedTwoProfileDeliveredReplyTarget(input);

  if (!latestProductionTwoProfileSuccess) {
    setText(
      fields.productionTwoProfileCurrentInput,
      selectedReplyTarget
        ? `Replying to selected #${selectedReplyTarget.messageNumber}: ${currentLabel}`
        : latestConversation
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
    selectedReplyTarget
      ? `Replying to selected #${selectedReplyTarget.messageNumber}: ${currentLabel}`
      : latestConversation
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

function setRemotePayloadField(targetField, value, sourceProfile, kind) {
  if (!targetField) {
    return false;
  }
  targetField.value = value;
  targetField.dataset.remotePayloadSourceProfile = String(sourceProfile ?? "").trim().toLowerCase();
  targetField.dataset.remotePayloadKind = kind;
  targetField.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

function clearTrackedRemotePayloadField(targetField) {
  if (!targetField) {
    return false;
  }
  targetField.value = "";
  delete targetField.dataset.remotePayloadSourceProfile;
  delete targetField.dataset.remotePayloadKind;
  return true;
}

function clearStaleManualRemotePayloadInputs(activeProfile = activeProductionProfileName()) {
  const expectedSource = productionCounterpartProfile(activeProfile);
  let cleared = 0;
  for (const remote of manualRemotePayloadFields) {
    const field = remote.field();
    const source = String(field?.dataset.remotePayloadSourceProfile ?? "").trim().toLowerCase();
    if (field?.value.trim() && source && source !== expectedSource) {
      clearTrackedRemotePayloadField(field);
      cleared += 1;
    }
  }
  return cleared;
}

function clearAllManualRemotePayloadInputs() {
  for (const remote of manualRemotePayloadFields) {
    clearTrackedRemotePayloadField(remote.field());
  }
}

function moveLocalPayload(sourceField, targetField, label) {
  const profile = activeProductionProfileName();
  const value = sourceField?.value?.trim() ?? "";
  if (!value || !targetField) {
    setProductionPairingState(`${label} needs payload`);
    return;
  }
  setRemotePayloadField(targetField, value, profile, label);
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
  setRemotePayloadField(targetField, value, counterpart, kind);
  setProductionPairingState(`Remote ${payloadLabel(label)} loaded`);
  setText(fields.productionPairingWarning, manualLoadedCounterpartWarning(profile, counterpart, label));
  applyProductionActionState();
}

function relayProductionPayloadSlotToPeer(kind, sourceField, targetField, label) {
  const profile = activeProductionProfileName();
  const counterpart = productionCounterpartProfile(profile);
  const value = sourceField?.value?.trim() ?? "";
  if (!profile || !counterpart || !value || !targetField) {
    setProductionPairingState(`${label} relay needs profile and payload`);
    setText(
      fields.productionPairingWarning,
      `Export a local ${payloadLabel(label)} from Alice or Bob before relaying to the peer.`,
    );
    return;
  }
  productionPayloadSlots[kind].set(profile, value);
  if (!selectProductionProfileForManualRelay(counterpart)) {
    setProductionPairingState(`${label} relay needs supported peer`);
    setText(fields.productionPairingWarning, "Relay supports the local Alice/Bob manual pair only.");
    return;
  }
  setRemotePayloadField(targetField, value, profile, kind);
  sourceField.value = "";
  setProductionPairingState(`${label} relayed to ${counterpart}`);
  setText(
    fields.productionPairingWarning,
    productionManualRelaySuccessWarning(profile, counterpart, label),
  );
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
  const { profile, messageNumber, message } = productionMessageInput();
  const value = fields.productionMessageEnvelope?.value?.trim() ?? "";
  if (!profile || !value) {
    setProductionMessageState("Envelope store needs profile and envelope");
    setText(fields.productionMessageWarning, "Export envelope before storing a local message slot.");
    return;
  }
  const metadata = selectedMessageEnvelopeMetadata(profile, messageNumber, message);
  storeMessageEnvelopeSlot(profile, value, metadata);
  setProductionMessageState("Message envelope stored");
  setText(
    fields.productionMessageWarning,
    metadata.messageNumber
      ? `Stored local message envelope slot for ${profile} message #${metadata.messageNumber}.`
      : `Stored local message envelope slot for ${profile}.`,
  );
  renderProductionTwoProfileConversationList();
  applyProductionActionState();
}

function loadProductionMessageEnvelope() {
  const profile = activeProductionProfileName();
  const counterpart = productionCounterpartProfile(profile);
  const slot = counterpart ? productionPayloadSlots.messageEnvelope.get(counterpart) : null;
  const value = messageEnvelopeSlotPayload(slot);
  const selectedEntry = selectedTwoProfilePendingConversationEntry();
  if (
    selectedEntry &&
    selectedEntry.sender === counterpart &&
    selectedEntry.receiver === profile &&
    !messageEnvelopeSlotMatchesEntry(slot, selectedEntry)
  ) {
    setProductionMessageState("Remote envelope slot stale");
    setText(
      fields.productionMessageWarning,
      `Stored ${counterpart} envelope does not match selected message #${selectedEntry.messageNumber}. Export that message again before importing.`,
    );
    return;
  }
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
  const storedEnvelope = counterpart ? messageEnvelopeSlotPayload(productionPayloadSlots.messageEnvelope.get(counterpart)) : "";
  if (!counterpart || !importedEnvelope || storedEnvelope !== importedEnvelope) {
    return false;
  }
  productionPayloadSlots.messageEnvelope.delete(counterpart);
  renderProductionTwoProfileConversationList();
  return true;
}

function clearImportedRemoteMessageEnvelopeInput(envelopePayload) {
  const importedEnvelope = String(envelopePayload ?? "").trim();
  if (
    importedEnvelope &&
    fields.productionRemoteMessageEnvelope?.value.trim() === importedEnvelope
  ) {
    fields.productionRemoteMessageEnvelope.value = "";
    return true;
  }
  return false;
}

function clearImportedLocalMessageEnvelopeOutput(envelopePayload) {
  const importedEnvelope = String(envelopePayload ?? "").trim();
  if (
    importedEnvelope &&
    fields.productionMessageEnvelope?.value.trim() === importedEnvelope
  ) {
    fields.productionMessageEnvelope.value = "";
    return true;
  }
  return false;
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
  const { profile, messageNumber, message } = productionMessageInput();
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
  storeMessageEnvelopeSlot(
    profile,
    value,
    selectedMessageEnvelopeMetadata(profile, messageNumber, message),
  );
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
    `${productionManualRelaySuccessWarning(profile, counterpart, "envelope")} Import remains explicit.`,
  );
  applyProductionActionState();
}

function openManualProductionTools(options = {}) {
  if (fields.manualProductionTools) {
    revealManualProductionTools();
    fields.manualProductionTools.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  if (options.focusCurrent === true) {
    const node = productionManualFocusNode(latestProductionManualFocusTarget);
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
    node?.focus();
  }
}

function productionManualFocusNode(target) {
  const targets = {
    "profile-name": fields.productionProfileName,
    "profile-passphrase": fields.productionProfilePassphrase,
    "unlock-profile": fields.unlockProductionProfile,
    "export-pairing": fields.exportProductionPairing,
    "store-pairing": fields.storeProductionPairingPayload,
    "load-pairing": fields.loadProductionPairingPayload,
    "relay-pairing": fields.relayProductionPairingPayload,
    "save-draft": fields.saveProductionSessionDraft,
    "export-init": fields.exportProductionHandshakeInit,
    "store-handshake-init": fields.storeProductionHandshakeInit,
    "load-handshake-init": fields.loadProductionHandshakeInit,
    "relay-handshake-init": fields.relayProductionHandshakeInit,
    "export-reply": fields.exportProductionHandshakeReply,
    "store-handshake-reply": fields.storeProductionHandshakeReply,
    "load-handshake-reply": fields.loadProductionHandshakeReply,
    "relay-handshake-reply": fields.relayProductionHandshakeReply,
    "export-finish": fields.exportProductionHandshakeFinish,
    "store-handshake-finish": fields.storeProductionHandshakeFinish,
    "load-handshake-finish": fields.loadProductionHandshakeFinish,
    "relay-handshake-finish": fields.relayProductionHandshakeFinish,
    "import-finish": fields.importProductionHandshakeFinish,
    "message-body": fields.productionMessageBody,
    "export-envelope": fields.exportProductionMessageEnvelope,
    "remote-envelope": fields.productionRemoteMessageEnvelope,
    "reply-message": fields.productionTwoProfileMessage,
    "export-message-envelope": fields.exportProductionMessageEnvelope,
    "store-message-envelope": fields.storeProductionMessageEnvelope,
    "load-message-envelope": fields.loadProductionMessageEnvelope,
    "relay-message-envelope": fields.relayProductionMessageEnvelope,
    "import-envelope": fields.importProductionMessageEnvelope,
    "show-received": fields.exportProductionReceivedMessage,
    "received-message": fields.productionReceivedMessage,
    "two-profile-message": fields.productionTwoProfileMessage,
    "send-two-profile-message": fields.runProductionTwoProfileMessageRoundtrip,
    "review-pending": fields.reviewPendingTwoProfileMessage,
  };
  return targets[target] ?? null;
}

function focusTargetNeedsManualTools(target) {
  return Boolean(
    target &&
      !["reply-message", "two-profile-message", "send-two-profile-message", "review-pending"].includes(target),
  );
}

function focusProductionCurrentAction() {
  if (focusTargetNeedsManualTools(latestProductionManualFocusTarget)) {
    openManualProductionTools();
  }
  const node = productionManualFocusNode(latestProductionManualFocusTarget);
  if (!node) {
    return;
  }
  node.scrollIntoView({ block: "center", behavior: "smooth" });
  node.focus();
}

function focusAfterProductionBusyAction(target) {
  if (target === "current-action") {
    focusProductionCurrentAction();
  } else if (target === "reply-composer") {
    fields.productionTwoProfileMessage?.focus();
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
  if (replyDirection) {
    clearManualMessageDraftForReplySelection();
  }
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
  const selectedEntry = selectedTwoProfileConversationEntry();
  const selectedDelivered = twoProfileConversationReplyable(selectedEntry) ? selectedEntry : null;
  const target = selectedDelivered ?? latestTwoProfileDeliveredConversationEntry();
  if (!target || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    setProductionTwoProfileState("Reply needs conversation");
    setText(fields.productionTwoProfileWarning, "Load a stored conversation before selecting a reply direction.");
    return false;
  }
  setSelectedTwoProfileConversationEntry(target);
  fields.productionTwoProfileA.value = target.receiver;
  fields.productionTwoProfileB.value = target.sender;
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
  }
  clearManualMessageDraftForReplySelection();
  const input = productionTwoProfileInput();
  renderProductionTwoProfileDirection(input);
  renderProductionTwoProfileMemory(input);
  setProductionTwoProfileState("Reply direction ready");
  const targetSource = selectedDelivered ? "Reply target selected" : "Reply target selected from latest message";
  setText(
    fields.productionTwoProfileWarning,
    `${targetSource} #${target.messageNumber}: ${input.profileA} -> ${input.profileB}.`,
  );
  setProductionFollowupActions(true, `Next: write reply from ${input.profileA} to ${input.profileB}.`);
  applyProductionActionState();
  fields.productionTwoProfileMessage?.focus();
  return true;
}

function selectTwoProfileConversationEntry(entry) {
  if (!entry) {
    return false;
  }
  return twoProfileConversationReplyable(entry)
    ? selectReplyAfterDeliveredReview(entry)
    : selectTwoProfileConversationEntryForReview(entry);
}

function selectTwoProfileConversationEntryForReview(entry, options = {}) {
  if (!entry || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    return false;
  }
  const focusManual = options.focusManual !== false;
  if (twoProfileConversationReplyable(entry)) {
    setProductionTwoProfileState("Conversation item received");
    setText(fields.productionTwoProfileWarning, `Message #${entry.messageNumber} is already received; write a reply instead.`);
    return false;
  }
  setSelectedTwoProfileConversationEntry(entry);
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
  const review = applyPendingConversationToManualMessageReview(entry, { focusManual, deferFocus: true });
  if (review?.twoProfileWarning) {
    setText(fields.productionTwoProfileWarning, review.twoProfileWarning);
  }
  applyProductionActionState();
  if (focusManual) {
    focusProductionCurrentAction();
  }
  return true;
}

function applyPendingConversationToManualMessageReview(entry, options = {}) {
  const focusManual = options.focusManual !== false;
  const deferFocus = options.deferFocus === true;
  const sentCopyPresent = entry.statuses.has("sent");
  const receivedCopyPresent = entry.statuses.has("received");
  const reviewProfile = sentCopyPresent && !receivedCopyPresent ? entry.receiver : entry.sender;
  const senderEnvelopeSlotRecord = productionPayloadSlots.messageEnvelope.get(entry.sender);
  const senderEnvelopeSlot = messageEnvelopeSlotMatchesEntry(senderEnvelopeSlotRecord, entry)
    ? messageEnvelopeSlotPayload(senderEnvelopeSlotRecord)
    : "";
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
  setProductionMessageTtlFromEntry(entry);
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
  let twoProfileWarning =
    `Pending message #${entry.messageNumber} selected: ${entry.sender} -> ${entry.receiver}. ` +
    `Review missing sender export in manual tools.`;
  if (canPrepareImport) {
    reviewState = "Manual import ready";
    reviewWarning =
      `Loaded ${entry.sender} envelope slot for message #${entry.messageNumber} into ${reviewProfile}. ` +
      "Click Import envelope to finish the explicit peer receive step.";
    twoProfileWarning =
      `Pending message #${entry.messageNumber} selected for ${reviewProfile}. ` +
      "Remote envelope is loaded; click Import envelope in manual tools.";
  } else if (sentCopyPresent && !receivedCopyPresent) {
    reviewState = "Manual import review selected";
    reviewWarning =
      `Selected ${reviewProfile} to import pending message #${entry.messageNumber}. ` +
      `Load or paste ${entry.sender}'s envelope, then click Import envelope.`;
    twoProfileWarning =
      `Pending message #${entry.messageNumber} selected for ${reviewProfile}. ` +
      `Sender envelope slot is missing; load or paste ${entry.sender}'s envelope first.`;
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
  if (focusManual && !deferFocus) {
    const node = productionManualFocusNode(selectedTwoProfileManualFocusTarget(entry));
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
    node?.focus();
  }
  return { canPrepareImport, reviewProfile, twoProfileWarning };
}

function reviewPendingTwoProfileMessage() {
  const pending = selectedTwoProfilePendingConversationEntry() ?? latestTwoProfilePendingConversationEntry();
  if (!pending || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    setProductionTwoProfileState("No pending conversation item");
    setText(fields.productionTwoProfileWarning, "Loaded conversation has no pending sent/received status gap.");
    return false;
  }
  return selectTwoProfileConversationEntryForReview(pending);
}

function autoSelectPendingTwoProfileConversation() {
  const selectedEntry = selectedTwoProfilePendingConversationEntry();
  if (selectedEntry) {
    return selectTwoProfileConversationEntryForReview(selectedEntry, { focusManual: false });
  }
  const pending = latestTwoProfilePendingConversationEntry();
  return pending ? selectTwoProfileConversationEntryForReview(pending, { focusManual: false }) : false;
}

function autoSelectLatestDeliveredReply(options = {}) {
  const input = productionTwoProfileInput();
  if (input.message) {
    return false;
  }
  const selectedEntry = selectedTwoProfileConversationEntry();
  if (twoProfileConversationReplyable(selectedEntry)) {
    return selectReplyAfterDeliveredReview(selectedEntry, {
      focusReply: options.focusReply ?? "none",
    });
  }
  const latestDelivered = latestTwoProfileDeliveredConversationEntry();
  return latestDelivered
    ? selectReplyAfterDeliveredReview(latestDelivered, {
        focusReply: options.focusReply ?? "none",
      })
    : false;
}

function autoSelectTwoProfileResumeTarget(sessionStatus) {
  const target = productionTwoProfileResumeTarget({
    sessionsReady: Boolean(sessionStatus?.both_ready_for_message_envelope),
    hasPendingConversation: Boolean(latestTwoProfilePendingConversationEntry()),
    hasDeliveredConversation: Boolean(latestTwoProfileDeliveredConversationEntry()),
    hasMessageDraft: Boolean(productionTwoProfileInput().message),
  });
  if (target === "pending-review") {
    return autoSelectPendingTwoProfileConversation() ? target : null;
  }
  if (target === "reply-latest") {
    return autoSelectLatestDeliveredReply() ? target : null;
  }
  return target;
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
  clearManualMessageDraftForReplySelection();
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

function selectReplyAfterDeliveredReview(entry, options = {}) {
  if (
    !entry ||
    !entry.statuses?.has("received") ||
    !fields.productionTwoProfileA ||
    !fields.productionTwoProfileB
  ) {
    return false;
  }
  setSelectedTwoProfileConversationEntry(entry);
  fields.productionTwoProfileA.value = entry.receiver;
  fields.productionTwoProfileB.value = entry.sender;
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
  }
  clearManualMessageDraftForReplySelection();
  const input = productionTwoProfileInput();
  renderProductionTwoProfileDirection(input);
  renderProductionTwoProfileMemory(input);
  setProductionTwoProfileState("Reply direction ready");
  const importProfile = String(options.importProfile ?? "").trim().toLowerCase();
  const deferReplyUntilReceivedReview = options.deferReplyUntilReceivedReview === true;
  const receivedReviewComplete = options.receivedReviewComplete === true;
  const focusMode =
    options.focusReply === "none" ? "none" : options.focusReply === false ? "manual" : "reply";
  setText(
    fields.productionTwoProfileWarning,
    importProfile && deferReplyUntilReceivedReview
      ? `Manual import for ${importProfile} completed. Click Show plaintext to verify the message, then write the reply from ${input.profileA} to ${input.profileB}.`
      : importProfile && receivedReviewComplete
      ? `Received message verified for ${importProfile}. Write the reply from ${input.profileA} to ${input.profileB}.`
      : importProfile
      ? `Manual import for ${importProfile} completed. Reply direction selected: ${input.profileA} -> ${input.profileB}; write the reply next.`
      : `Message #${entry.messageNumber} received; reply direction selected: ${input.profileA} -> ${input.profileB}.`,
  );
  setProductionFollowupActions(
    true,
    deferReplyUntilReceivedReview
      ? `Next: click Show plaintext for ${importProfile}, then write the reply.`
      : selectedTwoProfileNextActionMessage(entry),
  );
  applyProductionActionState();
  if (focusMode === "reply") {
    fields.productionTwoProfileMessage?.focus();
  } else if (focusMode === "manual") {
    focusProductionCurrentAction();
  }
  return true;
}

function selectReplyAfterSentMessageResult(result, fallbackInput, message, label) {
  const sender = String(result?.sender_profile ?? fallbackInput?.profileA ?? "").trim().toLowerCase();
  const receiver = String(result?.receiver_profile ?? fallbackInput?.profileB ?? "").trim().toLowerCase();
  const messageNumber = Number.parseInt(result?.message_number, 10);
  const sentMessage = selectTwoProfileConversationMessage(sender, receiver, messageNumber, message);
  if (!selectReplyAfterDeliveredReview(sentMessage)) {
    selectTwoProfileReplyDirection(fallbackInput);
  }
  const replyA = receiver || fallbackInput?.profileB;
  const replyB = sender || fallbackInput?.profileA;
  setText(
    fields.productionTwoProfileWarning,
    sentMessage
      ? `${label} #${sentMessage.messageNumber} completed. Reply direction selected: ${replyA} -> ${replyB}.`
      : `${label} completed. Reply direction selected: ${replyA} -> ${replyB}.`,
  );
  fields.productionTwoProfileMessage?.focus();
  return sentMessage;
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
  const pairingSafetyVerified = currentPairingSafetyVerified(pairing);
  const hasSessionDraftInput = Boolean(
    hasProfileUnlockInput && pairing.localPayload && pairing.remotePayload && pairingSafetyVerified,
  );
  const hasSessionDraftSaved = Boolean(latestProductionSessionState?.session_draft_present);
  const hasHandshakeReplyInput = Boolean(hasProfileUnlockInput && pairing.initPayload);
  const hasHandshakeFinishInput = Boolean(hasProfileUnlockInput && pairing.replyPayload);
  const hasFinishImportInput = Boolean(hasProfileUnlockInput && pairing.finishPayload);
  const hasLocalPairingPayload = Boolean(fields.productionPairingPayload?.value.trim());
  const hasRemotePairingInput = Boolean(pairing.remotePayload);
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
  const selectedConversation = selectedTwoProfileConversationEntry();
  const selectedMessageLabel = selectedConversation
    ? `${selectedConversation.sender}->${selectedConversation.receiver}#${selectedConversation.messageNumber}`
    : "";
  const selectedHasSentCopy = Boolean(selectedConversation?.statuses?.has("sent"));
  const selectedHasReceivedCopy = Boolean(selectedConversation?.statuses?.has("received"));
  const selectedNeedsSenderExport = Boolean(selectedConversation && !selectedHasSentCopy);
  const selectedNeedsPeerImport = Boolean(
    selectedConversation && selectedHasSentCopy && !selectedHasReceivedCopy,
  );
  const selectedMessageInputMatches = selectedConversation
    ? Number.parseInt(selectedConversation.messageNumber, 10) === message.messageNumber &&
      String(selectedConversation.message ?? "").trim() === message.message &&
      !(selectedNeedsSenderExport && message.autoMessageNumber)
    : true;
  const selectedMessageInputStale = !selectedMessageInputMatches;
  const selectedManualExportProfile = selectedNeedsSenderExport
    ? String(selectedConversation.sender ?? "").trim().toLowerCase()
    : "";
  const selectedManualImportProfile = selectedNeedsPeerImport
    ? String(selectedConversation.receiver ?? "").trim().toLowerCase()
    : "";
  const selectedManualExportProfileMatches = Boolean(
    !selectedManualExportProfile || activeProductionProfileName() === selectedManualExportProfile,
  );
  const selectedManualImportProfileMatches = Boolean(
    !selectedManualImportProfile || activeProductionProfileName() === selectedManualImportProfile,
  );
  const hasMessageNumberForExport =
    productionMessageUsesAutoNumber() || validProductionMessageNumber();
  const hasMessageNumberForImport = validProductionMessageNumber();
  const hasOutboundMessageInput = Boolean(
    hasProfileUnlockInput &&
      hasMessageNumberForExport &&
      message.message &&
      sessionReadyForMessages &&
      selectedManualExportProfileMatches,
  );
  const hasInboundEnvelopeInput = Boolean(
    hasProfileUnlockInput &&
      hasMessageNumberForImport &&
      message.envelopePayload &&
      sessionReadyForMessages &&
      selectedManualImportProfileMatches,
  );
  const hasImportedMessage = latestProductionMessageImportMatches(message);
  const hasReceivedExportInput = Boolean(hasProfileUnlockInput && hasMessageNumberForImport);
  const hasReceivedMessage = Boolean(fields.productionReceivedMessage?.value.trim());
  const hasTwoProfileInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase &&
      twoProfile.messageTtlSeconds &&
      twoProfile.message,
  );
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  const hasTwoProfileSessionStatusInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase,
  );
  const hasMessageRetentionPolicy = messageRetentionPolicyReady();
  const retentionPolicyBlocker = messageRetentionPolicyBlocker();
  const state = {
    busy,
    hasMessageRetentionPolicy,
    hasProfileUnlockInput,
    hasPairingInput,
    hasSessionDraftInput,
    hasSessionDraftSaved,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    hasLocalPairingPayload,
    hasRemotePairingSlot,
    hasRemotePairingInput,
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
    selectedNeedsSenderExport,
    selectedNeedsPeerImport,
    selectedManualExportProfile,
    selectedManualImportProfile,
    selectedMessageLabel,
    selectedMessageInputMatches,
    messageNumber: message.messageNumber,
    autoMessageNumber: message.autoMessageNumber,
  };
  const availability = productionActionAvailability(state);
  const manualAvailability = productionManualRelayAvailability(state);
  const manualDisabledReasons = productionManualRelayDisabledReasons(state);
  const twoProfileSessionsReady = state.hasTwoProfileSessionsReady;
  const latestConversation = latestTwoProfileConversationEntry();
  const latestConversationDelivered = twoProfileConversationReplyable(latestConversation);
  const knownTwoProfileSessionStatus = Boolean(latestTwoProfileSessionStatusForCurrentInput(twoProfile));
  const twoProfileSessionsIncomplete = Boolean(knownTwoProfileSessionStatus && !twoProfileSessionsReady);
  const twoProfileNeedsSessionCheck =
    hasTwoProfileSessionStatusInput &&
    !twoProfileSessionsReady &&
    !knownTwoProfileSessionStatus &&
    (!twoProfile.message || latestConversation);
  const twoProfileNeedsSetup = hasTwoProfileInput && !twoProfileSessionsReady && !twoProfileNeedsSessionCheck;
  const twoProfileCurrentAction = productionTwoProfileCurrentAction({
    input: twoProfile,
    busy,
    sessionsReady: twoProfileSessionsReady,
    hasKnownSessionStatus: knownTwoProfileSessionStatus,
    hasRecoveredConversation: Boolean(latestConversation),
    hasMessageRetentionPolicy,
  });
  const twoProfileCanReply = Boolean(
    !busy && latestProductionTwoProfileSuccess && hasTwoProfileSessionStatusInput && !twoProfile.message,
  );
  const selectedConversationDelivered = twoProfileConversationReplyable(selectedConversation);
  const latestReplySelected = Boolean(
    twoProfileConversationReplyable(latestConversation) &&
      twoProfile.profileA === latestConversation.receiver &&
      twoProfile.profileB === latestConversation.sender,
  );
  const selectedDeliveredReplyReady = Boolean(
    selectedConversationDelivered &&
      twoProfile.profileA === selectedConversation.receiver &&
      twoProfile.profileB === selectedConversation.sender,
  );
  const twoProfileReplyDraftReady = Boolean((selectedDeliveredReplyReady || latestReplySelected) && twoProfile.message);
  state.hasTwoProfileReplySelected = selectedDeliveredReplyReady || latestReplySelected;
  state.hasTwoProfileReplyDraftInput = twoProfileReplyDraftReady;
  const manualPrimaryActions = productionManualPrimaryActions(state);
  const replyComposerCurrent = Boolean(
    twoProfileCurrentAction === "compose" ||
      (state.hasTwoProfileReplySelected && !state.hasTwoProfileReplyDraftInput),
  );
  const manualCurrentActions = productionManualRelayCurrentActions(manualAvailability, {
    hasFinishImportInput,
    hasHandshakeFinishInput,
    hasHandshakeReplyInput,
    hasInboundEnvelopeInput,
    hasRemotePairingInput,
    selectedNeedsPeerImport,
  });
  const twoProfileComposeLocked =
    productionBusyAction === "two-profile-roundtrip" ||
    productionBusyAction === "two-profile-message-roundtrip";

  if (fields.productionMessageNumber) {
    fields.productionMessageNumber.disabled = message.autoMessageNumber;
  }
  setDisabled(fields.productionMessageTtl, !hasMessageRetentionPolicy || busy);
  setDisabled(fields.productionTwoProfileMessageTtl, !hasMessageRetentionPolicy || busy);
  if (!hasMessageRetentionPolicy) {
    setText(fields.productionMessageWarning, retentionPolicyBlocker);
    setText(fields.productionTwoProfileWarning, retentionPolicyBlocker);
  }
  setTwoProfileComposeLocked(twoProfileComposeLocked);
  renderProductionTwoProfileDirection(twoProfile);
  renderProductionTwoProfileFlow(twoProfile);
  renderRoomIdentityBar(twoProfile, twoProfileSessionsReady);
  const twoProfileReadiness = twoProfilePrimaryReadiness(
    twoProfile,
    busy,
    twoProfileSessionsReady,
    hasMessageRetentionPolicy,
  );
  setProductionTwoProfileReadiness(twoProfileReadiness.message, twoProfileReadiness.state);
  renderProductionTwoProfileMemory(twoProfile);
  renderManualNextActions(state);
  renderProductionPairingFlow(pairing);
  setTwoProfileComposeCurrent(replyComposerCurrent);
  renderManualMessageStatus(state);
  let selectedPendingActionView = null;
  if (selectedConversation && !selectedConversationDelivered) {
    selectedPendingActionView = twoProfileConversationActionView(selectedConversation);
    const selectedNextAction = selectedMessageInputStale
      ? `Stale: click Reapply selected to restore ${selectedMessageLabel}.`
      : selectedPendingActionView.nextAction;
    latestProductionManualFocusTarget = selectedMessageInputStale
      ? "review-pending"
      : selectedPendingActionView.focusTargetKey;
    setProductionManualFocusCurrent(latestProductionManualFocusTarget);
    setText(fields.productionMessageNextAction, selectedNextAction);
    setText(fields.productionManualCurrent, selectedNextAction);
    setOpenManualProductionToolsLabel(selectedPendingActionView.manualButtonLabel);
    setActionButtonState(fields.openManualProductionTools, false, "", false);
    setProductionMessageManualCurrent(selectedPendingActionView.manualTarget);
    if (selectedPendingActionView.manualTarget) {
      revealManualProductionTools();
    }
  }
  renderManualStatus();
  setActionButtonState(
    fields.unlockProductionProfile,
    !availability.unlockProfile,
    busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
    latestProductionManualFocusTarget === "unlock-profile",
  );
  setActionButtonState(
    fields.exportProductionPairing,
    !availability.exportPairing,
    busy ? "Wait for the active production action." : "Enter profile, passphrase, and onion endpoint first.",
    latestProductionManualFocusTarget === "export-pairing",
  );
  setActionButtonState(
    fields.saveProductionSessionDraft,
    !availability.saveSessionDraft,
    busy
      ? "Wait for the active production action."
      : pairing.localPayload && pairing.remotePayload
        ? "Check and confirm the safety number first."
        : "Load or paste both local and remote pairing payloads first.",
    latestProductionManualFocusTarget === "save-draft",
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
    latestProductionManualFocusTarget === "export-init",
  );
  setActionButtonState(
    fields.exportProductionHandshakeReply,
    !availability.exportHandshakeReply,
    busy ? "Wait for the active production action." : "Load or paste remote handshake init first.",
    latestProductionManualFocusTarget === "export-reply",
  );
  setActionButtonState(
    fields.exportProductionHandshakeFinish,
    !availability.exportHandshakeFinish,
    busy ? "Wait for the active production action." : "Load or paste remote handshake reply first.",
    latestProductionManualFocusTarget === "export-finish",
  );
  setActionButtonState(
    fields.importProductionHandshakeFinish,
    !availability.importHandshakeFinish,
    busy ? "Wait for the active production action." : "Load or paste remote handshake finish first.",
    latestProductionManualFocusTarget === "import-finish",
  );
  setActionButtonState(
    fields.exportProductionMessageEnvelope,
    !availability.exportMessageEnvelope,
    busy
      ? "Wait for the active production action."
      : !hasMessageRetentionPolicy
        ? retentionPolicyBlocker
        : !selectedManualExportProfileMatches
          ? `Select ${selectedManualExportProfile} in the manual profile panel before exporting this selected message.`
        : !selectedMessageInputMatches
          ? "Reapply the pending row before exporting; manual number/body or auto-number mode no longer matches the selected message."
        : "Complete session state, then enter message number and message.",
    latestProductionManualFocusTarget === "export-message-envelope",
  );
  setActionButtonState(
    fields.importProductionMessageEnvelope,
    !availability.importMessageEnvelope,
    busy
      ? "Wait for the active production action."
      : !hasMessageRetentionPolicy
        ? retentionPolicyBlocker
        : !selectedManualImportProfileMatches
          ? `Select ${selectedManualImportProfile} in the manual profile panel before importing this selected message.`
        : !selectedMessageInputMatches
          ? "Reapply the pending row before importing; manual number/body no longer matches the selected message."
        : "Complete session state, then load or paste a remote envelope.",
    latestProductionManualFocusTarget === "import-envelope",
  );
  setActionButtonState(
    fields.exportProductionReceivedMessage,
    !availability.exportReceivedMessage,
    busy ? "Wait for the active production action." : "Enter profile, passphrase, and message number first.",
    manualPrimaryActions.showReceived,
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
    twoProfileCurrentAction === "check-session",
  );
  setActionButtonState(
    fields.checkProductionTwoProfileSessionStatusInline,
    busy || !hasTwoProfileSessionStatusInput,
    busy ? "Wait for the active production action." : "Enter distinct Profile A, Profile B, and passphrase first.",
    twoProfileCurrentAction === "check-session",
  );
  setActionButtonState(
    fields.loadProductionTwoProfileTranscript,
    busy || !hasTwoProfileSessionStatusInput,
    busy ? "Wait for the active production action." : "Enter distinct Profile A, Profile B, and passphrase first.",
  );
  const pendingConversation = latestTwoProfilePendingConversationEntry();
  const selectedPendingConversation = selectedTwoProfilePendingConversationEntry();
  const pendingSelected = Boolean(selectedPendingConversation);
  const reviewPendingCurrent = Boolean(pendingSelected && selectedMessageInputStale);
  const replySelection = productionTwoProfileReplySelectionView({
    latestConversationDelivered,
    selectedConversationDelivered,
    selectedDeliveredReplyReady,
    hasTwoProfileReplyDraftInput: state.hasTwoProfileReplyDraftInput,
  });
  setReplyLatestTwoProfileLabel(replySelection.label);
  setReviewPendingTwoProfileLabel(
    chatReviewButtonLabel(
      pendingSelected && selectedMessageInputStale
        ? "Reapply"
        : pendingSelected && selectedPendingActionView
        ? selectedPendingActionView.manualButtonLabel
        : "Review",
    ),
  );
  setActionButtonState(
    fields.replyLatestTwoProfileMessage,
    busy || !replySelection.canSelect,
    busy ? "Wait for the active production action." : replySelection.disabledReason,
    manualPrimaryActions.selectReply && !replyComposerCurrent,
  );
  setActionButtonState(
    fields.reviewPendingTwoProfileMessage,
    busy || !pendingConversation,
    busy ? "Wait for the active production action." : "No pending sent/received gap in loaded conversation.",
    reviewPendingCurrent,
  );
  setActionButtonState(
    fields.runProductionTwoProfileRoundtrip,
    !availability.runTwoProfileRoundtrip,
    busy
      ? "Wait for the active production action."
      : !hasMessageRetentionPolicy
        ? retentionPolicyBlocker
      : twoProfileNeedsSessionCheck
        ? "Check recovered sessions before running full setup."
      : twoProfileSessionsReady
        ? "Stored sessions are ready; send a stored-session message instead."
        : twoProfileSessionsIncomplete
          ? twoProfileSessionRebuildMessage(twoProfile)
        : "Enter two profiles, passphrase, and message first.",
    twoProfileCurrentAction === "full-setup",
  );
  setActionButtonState(
    fields.runProductionTwoProfileMessageRoundtrip,
    !availability.runTwoProfileMessageRoundtrip,
    busy
      ? "Wait for the active production action."
      : !hasMessageRetentionPolicy
        ? retentionPolicyBlocker
      : selectedDeliveredReplyReady && twoProfileReplyDraftReady
        ? `Send reply to selected message #${selectedConversation.messageNumber}.`
      : latestReplySelected && twoProfileReplyDraftReady
        ? "Send reply to the latest delivered message."
      : hasTwoProfileInput
        ? "Run full setup once before sending with stored sessions."
        : "Enter two profiles, passphrase, and message first.",
    manualPrimaryActions.sendReply ||
      (!state.hasTwoProfileReplySelected && twoProfileCurrentAction === "stored-message"),
  );
  setActionButtonState(
    fields.startProductionTwoProfileOnionBootstrap,
    busy || !manualNetworkPermission,
    busy
      ? "Wait for the active production action."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before starting Tor bootstrap."
        : "Start or retry the retained Tor client before real onion roundtrip.",
    false,
  );
  setActionButtonState(
    fields.prepareProductionTwoProfileOnionKey,
    busy || !twoProfile.profileA || !twoProfile.passphrase,
    busy
      ? "Wait for the active production action."
      : !twoProfile.profileA || !twoProfile.passphrase
        ? "Enter profile A and passphrase before preparing the onion key."
        : "Prepare profile A's local onion key record before endpoint launch.",
    false,
  );
  setActionButtonState(
    fields.launchProductionTwoProfileOnionEndpoint,
    busy || !manualNetworkPermission || !twoProfile.profileA || !twoProfile.passphrase,
    busy
      ? "Wait for the active production action."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before launching an endpoint."
      : !twoProfile.profileA || !twoProfile.passphrase
        ? "Enter profile A and passphrase before launching the local onion endpoint."
        : "Launch or retry the local onion endpoint after Tor bootstrap is ready.",
    false,
  );
  setActionButtonState(
    fields.prepareProductionTwoProfileOnionPairing,
    busy || twoProfileSessionsReady || !manualNetworkPermission || !hasTwoProfileSessionStatusInput,
    busy
      ? "Wait for the active production action."
      : twoProfileSessionsReady
        ? "Alice/Bob sessions are message-ready; send a stored-session message instead."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before preparing onion pairing."
      : !hasTwoProfileSessionStatusInput
        ? "Enter distinct Profile A, Profile B, and passphrase first."
        : "Launch both local onion endpoints, export both pairing payloads, and preview safety.",
    false,
  );
  setActionButtonState(
    fields.saveProductionTwoProfileOnionSessions,
    busy ||
      twoProfileSessionsReady ||
      !hasTwoProfileSessionStatusInput ||
      !currentPairingSafetyVerified() ||
      !(fields.productionPairingPayload?.value ?? "").trim() ||
      !(fields.productionRemotePairingPayload?.value ?? "").trim(),
    busy
      ? "Wait for the active production action."
      : twoProfileSessionsReady
        ? "Alice/Bob sessions are already message-ready; send a stored-session message instead."
      : !hasTwoProfileSessionStatusInput
        ? "Enter distinct Profile A, Profile B, and passphrase first."
      : !currentPairingSafetyVerified()
        ? "Verify the safety number before saving Alice/Bob onion sessions."
      : !(fields.productionPairingPayload?.value ?? "").trim() ||
          !(fields.productionRemotePairingPayload?.value ?? "").trim()
        ? "Prepare onion pairing payloads first."
        : "Save Alice/Bob session drafts from the verified onion pairing payloads.",
    false,
  );
  setActionButtonState(
    fields.refreshProductionTwoProfilePeerEndpoints,
    busy || !manualNetworkPermission || !hasTwoProfileSessionStatusInput || !latestTwoProfileSessionStatusForCurrentInput(twoProfile),
    busy
      ? "Wait for the active production action."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before refreshing peer endpoints."
      : !hasTwoProfileSessionStatusInput
        ? "Enter distinct Profile A, Profile B, and passphrase first."
      : !latestTwoProfileSessionStatusForCurrentInput(twoProfile)
        ? "Check or save onion sessions before refreshing peer endpoints."
        : "Launch fresh local endpoints and apply them to existing peer session records.",
    false,
  );
  const peerEndpointState = twoProfilePeerEndpointState(twoProfile);
  const storedEndpointTransportState = storedPeerEndpointTransportState(twoProfile);
  setActionButtonState(
    fields.sendProductionTwoProfileEndpointUpdate,
    busy ||
      !manualNetworkPermission ||
      !hasTwoProfileSessionStatusInput ||
      !twoProfileSessionsReady ||
      !storedEndpointTransportState.ready ||
      !latestTwoProfileLocalOnionEndpoint(twoProfile) ||
      !latestProductionTwoProfileSuccess ||
      latestProductionTwoProfileSuccess.profileA !== twoProfile.profileA ||
      latestProductionTwoProfileSuccess.profileB !== twoProfile.profileB,
    busy
      ? "Wait for the active production action."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before sending an endpoint update over onion."
      : !hasTwoProfileSessionStatusInput
        ? "Enter distinct Profile A, Profile B, and passphrase first."
      : !twoProfileSessionsReady
        ? "Complete the verified session handshake first."
      : !storedEndpointTransportState.ready
        ? `Stored peer endpoint blocked: ${storedEndpointTransportState.reason}.`
      : !latestTwoProfileLocalOnionEndpoint(twoProfile)
        ? "Refresh or prepare onion endpoints first."
      : !latestProductionTwoProfileSuccess ||
          latestProductionTwoProfileSuccess.profileA !== twoProfile.profileA ||
          latestProductionTwoProfileSuccess.profileB !== twoProfile.profileB
        ? "Send a stored-session message first."
        : "Send an encrypted endpoint update control envelope over the stored peer onion endpoint.",
    false,
  );
  setActionButtonState(
    fields.completeProductionTwoProfileOnionHandshake,
    busy || twoProfileSessionsReady || !hasTwoProfileSessionStatusInput,
    busy
      ? "Wait for the active production action."
      : twoProfileSessionsReady
        ? "Alice/Bob sessions are message-ready; send a stored-session message instead."
      : !hasTwoProfileSessionStatusInput
        ? "Enter distinct Profile A, Profile B, and passphrase first."
        : "Complete Alice/Bob local handshake and persist transport state.",
    false,
  );
  const latestOnionOutbound = latestTwoProfileOutboundOnionMessage(twoProfile);
  setActionButtonState(
    fields.sendProductionTwoProfileLatestOnionEnvelope,
    busy || !manualNetworkPermission || !latestOnionOutbound,
    busy
      ? "Wait for the active production action."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before sending over onion."
      : !peerEndpointState.ready
        ? `Peer endpoint blocked: ${peerEndpointState.reason}.`
      : !latestOnionOutbound
        ? "Send a stored-session message after preparing onion pairing endpoints first."
        : `Attempt onion send for message #${latestOnionOutbound.messageNumber}.`,
    false,
  );
  setActionButtonState(
    fields.startProductionTwoProfileOnionReceive,
    busy || productionTwoProfileOnionReceiveMode.enabled || !manualNetworkPermission || !hasTwoProfileSessionStatusInput,
    busy
      ? "Wait for the active production action."
      : productionTwoProfileOnionReceiveMode.enabled
        ? `Receive mode is already enabled for ${productionTwoProfileOnionReceiveMode.profile}.`
      : !manualNetworkPermission
        ? "Enable manual onion network permission before receiving."
      : !hasTwoProfileSessionStatusInput
        ? "Enter distinct Profile A, Profile B, and passphrase first."
        : `Start explicit receive mode for ${twoProfile.profileB}.`,
    false,
  );
  setActionButtonState(
    fields.stopProductionTwoProfileOnionReceive,
    !productionTwoProfileOnionReceiveMode.enabled,
    productionTwoProfileOnionReceiveMode.enabled
      ? "Stop receive mode before another receive attempt."
      : "Receive mode is stopped.",
    false,
  );
  setActionButtonState(
    fields.runProductionTwoProfileRealOnionRoundtrip,
    busy || !hasTwoProfileInput || !hasMessageRetentionPolicy || !manualNetworkPermission,
    busy
      ? "Wait for the active production action."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before running real onion roundtrip."
      : !hasMessageRetentionPolicy
        ? retentionPolicyBlocker
      : "Enter two profiles, passphrase, and message first.",
    twoProfileCurrentAction === "real-onion-roundtrip",
  );
  setActionButtonState(
    fields.useProductionPairingPayload,
    !manualAvailability.usePairingPayload,
    manualDisabledReasons.usePairingPayload,
  );
  setActionButtonState(
    fields.storeProductionPairingPayload,
    !manualAvailability.storePairingPayload,
    manualDisabledReasons.storePairingPayload,
    manualCurrentActions.storePairingPayload && latestProductionManualFocusTarget === "store-pairing",
  );
  setActionButtonState(
    fields.loadProductionPairingPayload,
    !manualAvailability.loadPairingPayload,
    manualDisabledReasons.loadPairingPayload,
    manualCurrentActions.loadPairingPayload && latestProductionManualFocusTarget === "load-pairing",
  );
  setActionButtonState(
    fields.relayProductionPairingPayload,
    !manualAvailability.relayPairingPayload,
    manualDisabledReasons.relayPairingPayload,
    manualCurrentActions.relayPairingPayload && latestProductionManualFocusTarget === "relay-pairing",
  );
  setActionButtonState(
    fields.useProductionHandshakeInit,
    !manualAvailability.useHandshakeInit,
    manualDisabledReasons.useHandshakeInit,
  );
  setActionButtonState(
    fields.storeProductionHandshakeInit,
    !manualAvailability.storeHandshakeInit,
    manualDisabledReasons.storeHandshakeInit,
    manualCurrentActions.storeHandshakeInit && latestProductionManualFocusTarget === "store-handshake-init",
  );
  setActionButtonState(
    fields.loadProductionHandshakeInit,
    !manualAvailability.loadHandshakeInit,
    manualDisabledReasons.loadHandshakeInit,
    manualCurrentActions.loadHandshakeInit && latestProductionManualFocusTarget === "load-handshake-init",
  );
  setActionButtonState(
    fields.relayProductionHandshakeInit,
    !manualAvailability.relayHandshakeInit,
    manualDisabledReasons.relayHandshakeInit,
    manualCurrentActions.relayHandshakeInit && latestProductionManualFocusTarget === "relay-handshake-init",
  );
  setActionButtonState(
    fields.useProductionHandshakeReply,
    !manualAvailability.useHandshakeReply,
    manualDisabledReasons.useHandshakeReply,
  );
  setActionButtonState(
    fields.storeProductionHandshakeReply,
    !manualAvailability.storeHandshakeReply,
    manualDisabledReasons.storeHandshakeReply,
    manualCurrentActions.storeHandshakeReply && latestProductionManualFocusTarget === "store-handshake-reply",
  );
  setActionButtonState(
    fields.loadProductionHandshakeReply,
    !manualAvailability.loadHandshakeReply,
    manualDisabledReasons.loadHandshakeReply,
    manualCurrentActions.loadHandshakeReply && latestProductionManualFocusTarget === "load-handshake-reply",
  );
  setActionButtonState(
    fields.relayProductionHandshakeReply,
    !manualAvailability.relayHandshakeReply,
    manualDisabledReasons.relayHandshakeReply,
    manualCurrentActions.relayHandshakeReply && latestProductionManualFocusTarget === "relay-handshake-reply",
  );
  setActionButtonState(
    fields.useProductionHandshakeFinish,
    !manualAvailability.useHandshakeFinish,
    manualDisabledReasons.useHandshakeFinish,
  );
  setActionButtonState(
    fields.storeProductionHandshakeFinish,
    !manualAvailability.storeHandshakeFinish,
    manualDisabledReasons.storeHandshakeFinish,
    manualCurrentActions.storeHandshakeFinish && latestProductionManualFocusTarget === "store-handshake-finish",
  );
  setActionButtonState(
    fields.loadProductionHandshakeFinish,
    !manualAvailability.loadHandshakeFinish,
    manualDisabledReasons.loadHandshakeFinish,
    manualCurrentActions.loadHandshakeFinish && latestProductionManualFocusTarget === "load-handshake-finish",
  );
  setActionButtonState(
    fields.relayProductionHandshakeFinish,
    !manualAvailability.relayHandshakeFinish,
    manualDisabledReasons.relayHandshakeFinish,
    manualCurrentActions.relayHandshakeFinish && latestProductionManualFocusTarget === "relay-handshake-finish",
  );
  setActionButtonState(
    fields.useProductionMessageEnvelope,
    !manualAvailability.useMessageEnvelope,
    manualDisabledReasons.useMessageEnvelope,
  );
  setActionButtonState(
    fields.storeProductionMessageEnvelope,
    !manualAvailability.storeMessageEnvelope,
    manualDisabledReasons.storeMessageEnvelope,
    manualCurrentActions.storeMessageEnvelope && latestProductionManualFocusTarget === "store-message-envelope",
  );
  setActionButtonState(
    fields.loadProductionMessageEnvelope,
    !manualAvailability.loadMessageEnvelope,
    manualDisabledReasons.loadMessageEnvelope,
    manualCurrentActions.loadMessageEnvelope && latestProductionManualFocusTarget === "load-message-envelope",
  );
  setActionButtonState(
    fields.relayProductionMessageEnvelope,
    !manualAvailability.relayMessageEnvelope,
    manualDisabledReasons.relayMessageEnvelope,
    manualCurrentActions.relayMessageEnvelope && latestProductionManualFocusTarget === "relay-message-envelope",
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
  const pair = productionTwoProfilePairFromProfiles(
    profiles,
    fields.productionTwoProfileA?.value,
    fields.productionTwoProfileB?.value,
  );
  if (pair.changed) {
    if (fields.productionTwoProfileA) {
      fields.productionTwoProfileA.value = pair.profileA;
    }
    if (fields.productionTwoProfileB) {
      fields.productionTwoProfileB.value = pair.profileB;
    }
    renderProductionTwoProfileDirection(productionTwoProfileInput());
    renderProductionTwoProfileMemory(productionTwoProfileInput());
    resetTwoProfileAutoResumeAttempt();
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
      const input = productionTwoProfileInput();
      setText(
        fields.productionProfileStorage,
        `saved_profiles=${result.profile_count} selected_pair=${input.profileA || "none"}->${input.profileB || "none"}`,
      );
    }
    scheduleTwoProfileAutoResume();
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
  if (fields.productionRemotePairingQrPayload) {
    fields.productionRemotePairingQrPayload.value = "";
  }
  resetProductionPairingSafety();
  clearProductionPairingQr();
  clearAllManualRemotePayloadInputs();
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
    messageTtlSeconds: messageTtlInputValue(fields.productionTwoProfileMessageTtl),
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
      messageNumber: Number.parseInt(result.message_number, 10),
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
      messageNumber: Number.parseInt(result.message_number, 10),
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
    return null;
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
    const retentionMetadata = { ttlSeconds: result.message_ttl_seconds };
    appendProductionTranscriptEntry("sent", sender, messageNumber, text, retentionMetadata);
    appendProductionTranscriptEntry("received", receiver, messageNumber, text, retentionMetadata);
    appendProductionTwoProfileConversationStatus("sent", sender, receiver, messageNumber, text);
    appendProductionTwoProfileConversationStatus("received", receiver, sender, messageNumber, text);
    selectTwoProfileConversationMessage(sender, receiver, messageNumber, text);
  }
  latestProductionMessageImport = null;
  if (fields.productionReceivedMessage) {
    fields.productionReceivedMessage.value = "";
  }
  setProductionMessageState("Stored-session message synced");
  setText(
    fields.productionMessageWarning,
    `Stored-session message #${messageNumber} synced to manual view. Active sender=${sender}; receiver=${receiver}; previous received preview cleared.`,
  );
  return { sender, receiver, messageNumber, message: text };
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
    remoteQrPayload: (fields.productionRemotePairingQrPayload?.value ?? "").trim(),
    remotePayload: (fields.productionRemotePairingPayload?.value ?? "").trim(),
    safetyConfirmed: Boolean(fields.productionPairingSafetyVerified?.checked),
    initPayload: (fields.productionRemoteHandshakeInitPayload?.value ?? "").trim(),
    replyPayload: (fields.productionRemoteHandshakeReplyPayload?.value ?? "").trim(),
    finishPayload: (fields.productionRemoteHandshakeFinishPayload?.value ?? "").trim(),
  };
}

function pairingSafetyFingerprint(input = productionPairingInput()) {
  return `${input.localPayload}\n${input.remotePayload}`;
}

function currentPairingSafetyVerified(input = productionPairingInput()) {
  return Boolean(
    input.safetyConfirmed &&
      latestProductionPairingSafety &&
      latestProductionPairingSafety.fingerprint === pairingSafetyFingerprint(input),
  );
}

function resetProductionPairingSafety(status = "Not checked yet") {
  latestProductionPairingSafety = null;
  if (fields.productionPairingSafetyVerified) {
    fields.productionPairingSafetyVerified.checked = false;
  }
  setText(fields.productionPairingSafetyNumber, status);
  setText(fields.productionPairingSafetyPhrase, status);
  setText(fields.productionPairingSafetyBoundary, "verified=false network_io=false");
}

function clearProductionPairingQr(status = "QR appears after pairing export.") {
  const canvas = fields.productionPairingQr;
  if (canvas?.getContext) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  setText(fields.productionPairingQrStatus, status);
}

async function renderProductionPairingQr(payload) {
  const canvas = fields.productionPairingQr;
  if (!canvas || !payload) {
    clearProductionPairingQr();
    return;
  }
  await QRCode.toCanvas(canvas, payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 224,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
  setText(fields.productionPairingQrStatus, "QR ready for face-to-face pairing payload transfer.");
}

function productionMessageInput() {
  return {
    ...productionProfileInput(),
    autoMessageNumber: productionMessageUsesAutoNumber(),
    messageNumber: Number.parseInt(fields.productionMessageNumber?.value ?? "1", 10),
    messageTtlSeconds: messageTtlInputValue(fields.productionMessageTtl),
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

async function checkOnionPreflight() {
  setOnionPreflightState("Onion preflight running");
  setText(fields.onionPreflightWarning, "Checking app-private Tor runtime preflight. No network bootstrap will run.");
  setText(fields.onionPreflightRuntime, "Waiting for runtime permission guards");
  setText(fields.onionPreflightLaunch, "Waiting for onion launch boundary");
  setText(fields.onionPreflightEvents, "Waiting for redacted event summary");
  setText(fields.onionPreflightBoundary, "Waiting for boundary flags");
  if (fields.checkOnionPreflight) {
    fields.checkOnionPreflight.disabled = true;
  }
  try {
    const result = await invoke("production_onion_preflight_check");
    setOnionPreflightState(
      result.ready_for_runtime_bootstrap ? "Runtime preflight ready" : "Runtime preflight blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionPreflightRuntime,
      `dirs=${result.state_cache_dirs_accessible} backup_exclusion=${result.backup_exclusion_verified} log_redaction=${result.log_redaction_ready} crash_redaction=${result.crash_redaction_ready} bridge_or_censorship=${result.bridge_or_censorship_ready}`,
    );
    setText(
      fields.onionPreflightLaunch,
      `runtime_bootstrap=${result.ready_for_runtime_bootstrap} onion_launch=${result.ready_for_onion_launch} blockers=${result.blockers.join("; ") || "none"}`,
    );
    setText(
      fields.onionPreflightEvents,
      result.event_summary.length > 0 ? result.event_summary.join("\n") : "No redacted runtime event emitted",
    );
    setText(
      fields.onionPreflightBoundary,
      `preflight_only=${result.preflight_only} manual_action=${result.manual_network_action} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionPreflightState("Onion preflight failed");
    setText(fields.onionPreflightWarning, String(error));
    setText(fields.onionPreflightRuntime, "Failed without returning local path details");
    setText(fields.onionPreflightLaunch, "Failed closed");
    setText(fields.onionPreflightEvents, "No raw transport details returned");
    setText(fields.onionPreflightBoundary, "network_io=false transport_io=false runtime=false");
  } finally {
    if (fields.checkOnionPreflight) {
      fields.checkOnionPreflight.disabled = false;
    }
  }
}

async function prepareOnionBackupExclusion() {
  setOnionBackupExclusionState("Backup exclusion prepare running");
  setText(
    fields.onionBackupExclusionBoundary,
    "Marking app-private Tor state/cache directories before any transport runtime starts.",
  );
  if (fields.prepareOnionBackupExclusion) {
    fields.prepareOnionBackupExclusion.disabled = true;
  }
  try {
    const result = await invoke("production_onion_backup_exclusion_prepare");
    setOnionBackupExclusionState(
      result.backup_exclusion_verified ? "Backup exclusion verified" : "Backup exclusion blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionBackupExclusionBoundary,
      `dirs=${result.state_cache_dirs_accessible} written=${result.backup_exclusion_written} verified=${result.backup_exclusion_verified} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionBackupExclusionState("Backup exclusion prepare failed");
    setText(fields.onionBackupExclusionBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionBackupExclusion) {
      fields.prepareOnionBackupExclusion.disabled = false;
    }
  }
}

async function checkOnionClientPreflight() {
  setOnionClientPreflightState("Client preflight running");
  setText(
    fields.onionClientPreflightBoundary,
    "Checking bounded Tor bootstrap policy without starting a persistent client.",
  );
  if (fields.checkOnionClientPreflight) {
    fields.checkOnionClientPreflight.disabled = true;
  }
  try {
    const result = await invoke("production_onion_bootstrap_preflight_check");
    setOnionClientPreflightState(
      result.bootstrap_policy_ready ? "Client skeleton ready" : "Client preflight blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionClientPreflightBoundary,
      `dirs=${result.state_cache_dirs_accessible} backup=${result.backup_exclusion_verified} runtime=${result.runtime_preflight_ready} policy=${result.bootstrap_policy_ready} timeout=${result.timeout_seconds}s retries=${result.retry_max_attempts} backoff=${result.retry_initial_backoff_ms}-${result.retry_max_backoff_ms}ms silent_retry=${result.silent_retry_allowed} censorship_classification=${result.censorship_classification_ready} persistent_client=${result.persistent_client_ready} manual_attempt=${result.manual_bootstrap_attempt_enabled} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime_messaging=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionClientPreflightState("Client preflight failed");
    setText(fields.onionClientPreflightBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.checkOnionClientPreflight) {
      fields.checkOnionClientPreflight.disabled = false;
    }
  }
}

async function checkOnionClientAttemptGate() {
  setOnionClientAttemptGateState("Client gate running");
  setText(
    fields.onionClientAttemptGateBoundary,
    "Checking manual client attempt gate without enabling network permission.",
  );
  if (fields.checkOnionClientAttemptGate) {
    fields.checkOnionClientAttemptGate.disabled = true;
  }
  try {
    const result = await invoke("production_onion_client_attempt_gate_check");
    setOnionClientAttemptGateState(
      result.manual_client_attempt_feature_compiled ? "Client gate feature present" : "Client gate feature disabled",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionClientAttemptGateBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} started=${result.client_attempt_started} persistent_client=${result.persistent_client_ready} lifecycle=${result.lifecycle_state} runtime=${result.runtime_preflight_ready} policy=${result.bootstrap_policy_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} events=${result.event_summary.join(" | ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime_messaging=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionClientAttemptGateState("Client gate failed");
    setText(fields.onionClientAttemptGateBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.checkOnionClientAttemptGate) {
      fields.checkOnionClientAttemptGate.disabled = false;
    }
  }
}

async function runOnionClientOnce() {
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  setOnionClientOnceState("Client once running");
  setText(
    fields.onionClientOnceBoundary,
    manualNetworkPermission
      ? "Manual permission set. This may attempt a bounded Tor client bootstrap in feature builds."
      : "Manual permission is off. The command will fail closed without network I/O.",
  );
  if (fields.runOnionClientOnce) {
    fields.runOnionClientOnce.disabled = true;
  }
  try {
    const result = await invoke("production_onion_client_bootstrap_once", { manualNetworkPermission });
    setOnionClientOnceState(
      result.client_bootstrap_succeeded ? "Client once completed" : "Client once blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionClientOnceBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} started=${result.client_attempt_started} succeeded=${result.client_bootstrap_succeeded} persistent_client=${result.persistent_client_ready} lifecycle=${result.lifecycle_state} runtime=${result.runtime_preflight_ready} policy=${result.bootstrap_policy_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} events=${result.event_summary.join(" | ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime_messaging=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionClientOnceState("Client once failed");
    setText(fields.onionClientOnceBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.runOnionClientOnce) {
      fields.runOnionClientOnce.disabled = false;
    }
  }
}

async function checkOnionPersistentClient() {
  setOnionPersistentClientState("Persistent client check running");
  setText(fields.onionPersistentClientBoundary, "Reading retained client state without network I/O.");
  if (fields.checkOnionPersistentClient) {
    fields.checkOnionPersistentClient.disabled = true;
  }
  try {
    const result = await invoke("production_onion_persistent_client_status");
    setOnionPersistentClientState(
      result.persistent_client_ready ? "Persistent client retained" : "Persistent client not retained",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionPersistentClientBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} persistent_client=${result.persistent_client_ready} lifecycle=${result.lifecycle_state} timeout=${result.timeout_seconds}s in_progress=${result.bootstrap_in_progress} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime_messaging=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionPersistentClientState("Persistent client check failed");
    setText(fields.onionPersistentClientBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.checkOnionPersistentClient) {
      fields.checkOnionPersistentClient.disabled = false;
    }
  }
}

async function startOnionPersistentClient() {
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  setOnionPersistentClientState("Persistent client start running");
  setText(
    fields.onionPersistentClientBoundary,
    manualNetworkPermission
      ? "Manual permission set. This may attempt bounded Tor client bootstrap in feature builds and retain the client in memory."
      : "Manual permission is off. The command will fail closed without network I/O.",
  );
  if (fields.startOnionPersistentClient) {
    fields.startOnionPersistentClient.disabled = true;
  }
  try {
    const result = await invoke("production_onion_persistent_client_start", { manualNetworkPermission });
    setOnionPersistentClientState(
      result.persistent_client_ready ? "Persistent client retained" : "Persistent client blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionPersistentClientBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} started=${result.client_bootstrap_started} succeeded=${result.client_bootstrap_succeeded} persistent_client=${result.persistent_client_ready} lifecycle=${result.lifecycle_state} timeout=${result.timeout_seconds}s runtime=${result.runtime_preflight_ready} policy=${result.bootstrap_policy_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} events=${result.event_summary.join(" | ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime_messaging=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionPersistentClientState("Persistent client start failed");
    setText(fields.onionPersistentClientBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.startOnionPersistentClient) {
      fields.startOnionPersistentClient.disabled = false;
    }
  }
}

async function startProductionTwoProfileOnionBootstrap() {
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Tor bootstrap blocked");
    setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before starting Tor bootstrap.");
    return;
  }

  productionBusyAction = "two-profile-onion-bootstrap";
  setProductionTwoProfileState("Tor bootstrap running");
  setText(fields.productionTwoProfileWarning, "Starting retained Tor client for the chat flow.");
  setText(fields.productionTwoProfileProfiles, "Profile stores unchanged");
  setText(fields.productionTwoProfileSession, "Waiting for Tor bootstrap before endpoint launch");
  setText(fields.productionTwoProfileMessageState, "No message transport attempted");
  setText(fields.productionTwoProfileBoundary, "Bootstrap in progress with manual network permission");
  applyProductionActionState();
  if (fields.startProductionTwoProfileOnionBootstrap) {
    fields.startProductionTwoProfileOnionBootstrap.disabled = true;
  }

  try {
    const result = await invoke("production_onion_persistent_client_start", { manualNetworkPermission });
    setProductionTwoProfileState(
      result.persistent_client_ready ? "Tor bootstrap ready" : "Tor bootstrap needs retry",
    );
    setText(fields.productionTwoProfileWarning, result.warning);
    setText(
      fields.productionTwoProfileProfiles,
      `persistent_client=${result.persistent_client_ready} lifecycle=${result.lifecycle_state}`,
    );
    setText(
      fields.productionTwoProfileSession,
      result.persistent_client_ready
        ? "Tor client retained; run real onion roundtrip to launch endpoints."
        : "Tor client not ready; retry bootstrap before endpoint launch.",
    );
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(
      fields.productionTwoProfileBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} started=${result.client_bootstrap_started} succeeded=${result.client_bootstrap_succeeded} timeout=${result.timeout_seconds}s next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} events=${result.event_summary.join(" | ") || "none"} network=${result.network_io_attempted} transport=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setProductionTwoProfileState("Tor bootstrap failed");
    setText(fields.productionTwoProfileWarning, `Tor bootstrap failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before endpoint launch or message transport.");
  } finally {
    productionBusyAction = null;
    if (fields.startProductionTwoProfileOnionBootstrap) {
      fields.startProductionTwoProfileOnionBootstrap.disabled = false;
    }
    applyProductionActionState();
  }
}

async function prepareProductionTwoProfileOnionKey() {
  const { profileA, passphrase } = productionTwoProfileInput();
  if (!profileA || !passphrase) {
    setProductionTwoProfileState("Onion key needs profile");
    setText(fields.productionTwoProfileWarning, "Enter profile A and passphrase before preparing the onion key.");
    return;
  }

  productionBusyAction = "two-profile-onion-key-prepare";
  setProductionTwoProfileState("Onion key prepare running");
  setText(fields.productionTwoProfileWarning, "Preparing local onion key record for profile A.");
  setText(fields.productionTwoProfileProfiles, `local_profile=${profileA}`);
  setText(fields.productionTwoProfileSession, "Preparing backup exclusion and encrypted onion key record");
  setText(fields.productionTwoProfileMessageState, "No network or message transport attempted");
  setText(fields.productionTwoProfileBoundary, "Local onion key preparation in progress");
  applyProductionActionState();
  if (fields.prepareProductionTwoProfileOnionKey) {
    fields.prepareProductionTwoProfileOnionKey.disabled = true;
  }

  try {
    const backup = await invoke("production_onion_backup_exclusion_prepare");
    const result = await invoke("production_onion_key_record_prepare", {
      profile: profileA,
      passphrase,
    });
    const blockers = [...backup.blockers, ...result.blockers];
    setOnionKeyRecordState(result.key_material_ready ? "Key record prepared" : "Key record blocked");
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionKeyRecordBoundary,
      `storage=${result.storage_opened} profile=${result.profile_marker_present} profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} lifecycle=${result.lifecycle_ready} written=${result.key_record_written} present=${result.key_record_present} material_ready=${result.key_material_ready} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    setProductionTwoProfileState(
      result.key_material_ready ? "Onion key ready" : "Onion key needs setup",
    );
    setText(fields.productionTwoProfileWarning, result.warning);
    setText(
      fields.productionTwoProfileProfiles,
      `profile_unlock=${result.profile_transport_unlock_ready} profile_marker=${result.profile_marker_present} storage=${result.storage_opened}`,
    );
    setText(
      fields.productionTwoProfileSession,
      `backup=${backup.backup_exclusion_verified} lifecycle=${result.lifecycle_ready} key_record=${result.key_record_present} key_material=${result.key_material_ready}`,
    );
    setText(fields.productionTwoProfileMessageState, "No network or message transport attempted");
    setText(
      fields.productionTwoProfileBoundary,
      `backup_dirs=${backup.state_cache_dirs_accessible} backup_written=${backup.backup_exclusion_written} backup_verified=${backup.backup_exclusion_verified} key_written=${result.key_record_written} blockers=${blockers.join("; ") || "none"} raw_path=${backup.raw_path_returned || result.raw_path_returned} onion_secret=${backup.onion_secret_returned || result.onion_secret_returned} key_material=${backup.key_material_exposed || result.key_material_exposed} network=${backup.network_io_attempted || result.network_io_attempted} transport=${backup.transport_io_opened || result.transport_io_opened} runtime=${backup.runtime_messaging_enabled || result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setProductionTwoProfileState("Onion key prepare failed");
    setText(fields.productionTwoProfileWarning, `Onion key prepare failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before network, endpoint launch, or message transport.");
  } finally {
    productionBusyAction = null;
    if (fields.prepareProductionTwoProfileOnionKey) {
      fields.prepareProductionTwoProfileOnionKey.disabled = false;
    }
    applyProductionActionState();
  }
}

async function launchProductionTwoProfileOnionEndpoint() {
  const { profileA, passphrase } = productionTwoProfileInput();
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!profileA || !passphrase) {
    setProductionTwoProfileState("Onion endpoint needs profile");
    setText(fields.productionTwoProfileWarning, "Enter profile A and passphrase before launching the local onion endpoint.");
    return;
  }
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Onion endpoint blocked");
    setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before launching an endpoint.");
    return;
  }

  productionBusyAction = "two-profile-onion-endpoint-launch";
  setProductionTwoProfileState("Onion endpoint launch running");
  setText(fields.productionTwoProfileWarning, "Launching local onion endpoint for profile A.");
  setText(fields.productionTwoProfileProfiles, `local_profile=${profileA}`);
  setText(fields.productionTwoProfileSession, "Checking retained Tor client and onion key record");
  setText(fields.productionTwoProfileMessageState, "No message transport attempted");
  setText(fields.productionTwoProfileBoundary, "Endpoint launch in progress with manual network permission");
  applyProductionActionState();
  if (fields.launchProductionTwoProfileOnionEndpoint) {
    fields.launchProductionTwoProfileOnionEndpoint.disabled = true;
  }

  try {
    const result = await invoke("production_onion_service_launch_attempt", {
      profile: profileA,
      passphrase,
      manualNetworkPermission,
    });
    let pairingPayloadExported = false;
    if (result.local_onion_endpoint && fields.productionPairingEndpoint) {
      fields.productionPairingEndpoint.value = result.local_onion_endpoint;
      fields.productionPairingEndpoint.dispatchEvent(new Event("input", { bubbles: true }));
      if (fields.productionProfileName) {
        fields.productionProfileName.value = profileA;
        fields.productionProfileName.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (fields.productionProfileSelector) {
        fields.productionProfileSelector.value = profileA;
      }
      try {
        const pairing = await invoke("production_pairing_payload_export", {
          profile: profileA,
          passphrase,
          rendezvousEndpoint: result.local_onion_endpoint,
        });
        await applyProductionPairingPayloadExportResult(
          pairing,
          "Pairing payload exported from local endpoint",
        );
        pairingPayloadExported = true;
      } catch (pairingError) {
        setProductionPairingState("Local endpoint ready; pairing export failed");
        setText(
          fields.productionPairingWarning,
          `Endpoint launch succeeded, but pairing payload export failed without exposing secrets. ${pairingError}`,
        );
      }
    }
    setProductionTwoProfileState(
      result.launch_attempt_succeeded && result.onion_endpoint_returned
        ? "Onion endpoint ready"
        : "Onion endpoint needs setup",
    );
    setText(fields.productionTwoProfileWarning, result.warning);
    setText(
      fields.productionTwoProfileProfiles,
      `profile_unlock=${result.profile_transport_unlock_ready} key_record=${result.key_record_present} key_material=${result.key_material_ready}`,
    );
    setText(
      fields.productionTwoProfileSession,
      `persistent_client=${result.persistent_client_ready} launch_preflight=${result.launch_preflight_ready} adapter=${result.launch_adapter_ready} retained=${result.onion_service_retained} pairing_payload=${pairingPayloadExported}`,
    );
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(
      fields.productionTwoProfileBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} started=${result.launch_attempt_started} succeeded=${result.launch_attempt_succeeded} endpoint_ready=${result.onion_endpoint_returned} event_recorded=${result.redacted_launch_result_event_recorded} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} events=${result.event_summary.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} key_material=${result.key_material_exposed} network=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} transport=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setProductionTwoProfileState("Onion endpoint launch failed");
    setText(fields.productionTwoProfileWarning, `Endpoint launch failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before descriptor publication or message transport.");
  } finally {
    productionBusyAction = null;
    if (fields.launchProductionTwoProfileOnionEndpoint) {
      fields.launchProductionTwoProfileOnionEndpoint.disabled = false;
    }
    applyProductionActionState();
  }
}

async function prepareProductionTwoProfileOnionPairing() {
  const { profileA, profileB, passphrase } = productionTwoProfileInput();
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setProductionTwoProfileState("Onion pairing needs profiles");
    setText(fields.productionTwoProfileWarning, "Enter two distinct profiles and passphrase before preparing onion pairing.");
    return;
  }
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Onion pairing blocked");
    setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before preparing onion pairing.");
    return;
  }

  const launchAndExport = async (profile) => {
    const launch = await invoke("production_onion_service_launch_attempt", {
      profile,
      passphrase,
      manualNetworkPermission,
    });
    if (!launch.local_onion_endpoint) {
      throw new Error(`${profile} endpoint unavailable: ${launch.next_blocker || "unknown blocker"}`);
    }
    const pairing = await invoke("production_pairing_payload_export", {
      profile,
      passphrase,
      rendezvousEndpoint: launch.local_onion_endpoint,
    });
    return { launch, pairing };
  };

  productionBusyAction = "two-profile-onion-pairing";
  setProductionTwoProfileState("Onion pairing running");
  setText(fields.productionTwoProfileWarning, "Launching Alice/Bob onion endpoints and preparing pairing payloads.");
  setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
  setText(fields.productionTwoProfileSession, "Waiting for endpoint launch, payload export, and safety preview");
  setText(fields.productionTwoProfileMessageState, "No message transport attempted");
  setText(fields.productionTwoProfileBoundary, "Onion pairing in progress with manual network permission");
  applyProductionActionState();
  if (fields.prepareProductionTwoProfileOnionPairing) {
    fields.prepareProductionTwoProfileOnionPairing.disabled = true;
  }

  try {
    const profileAResult = await launchAndExport(profileA);
    const profileBResult = await launchAndExport(profileB);
    if (fields.productionProfileName) {
      fields.productionProfileName.value = profileA;
      fields.productionProfileName.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (fields.productionProfileSelector) {
      fields.productionProfileSelector.value = profileA;
    }
    if (fields.productionPairingEndpoint) {
      fields.productionPairingEndpoint.value = profileAResult.launch.local_onion_endpoint;
      fields.productionPairingEndpoint.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await applyProductionPairingPayloadExportResult(
      profileAResult.pairing,
      "Onion pairing payloads ready",
    );
    if (fields.productionRemotePairingPayload) {
      fields.productionRemotePairingPayload.value = profileBResult.pairing.pairing_payload;
      fields.productionRemotePairingPayload.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const safety = await invoke("production_pairing_safety_preview", {
      localPayload: profileAResult.pairing.pairing_payload,
      remotePayload: profileBResult.pairing.pairing_payload,
    });
    applyProductionPairingSafetyPreviewResult(safety, profileAResult.pairing.pairing_payload, profileBResult.pairing.pairing_payload);
    setProductionTwoProfileState("Onion pairing safety ready");
    setText(
      fields.productionTwoProfileWarning,
      "Alice/Bob onion endpoints and pairing payloads are ready. Verify the safety number before saving a session draft.",
    );
    setText(
      fields.productionTwoProfileProfiles,
      `a_endpoint=${profileAResult.launch.onion_endpoint_returned} b_endpoint=${profileBResult.launch.onion_endpoint_returned}`,
    );
    setText(
      fields.productionTwoProfileSession,
      `a_payload=${profileAResult.pairing.pairing_payload_exported} b_payload=${profileBResult.pairing.pairing_payload_exported} safety=${safety.payloads_decodable}`,
    );
    rememberTwoProfileOnionEndpoints(
      { profileA, profileB, passphrase },
      {
        profileAEndpoint: profileAResult.launch.local_onion_endpoint,
        profileBEndpoint: profileBResult.launch.local_onion_endpoint,
      },
    );
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(
      fields.productionTwoProfileBoundary,
      `a_launch=${profileAResult.launch.launch_attempt_succeeded} b_launch=${profileBResult.launch.launch_attempt_succeeded} a_retained=${profileAResult.launch.onion_service_retained} b_retained=${profileBResult.launch.onion_service_retained} a_events=${profileAResult.launch.event_summary.join("; ") || "none"} b_events=${profileBResult.launch.event_summary.join("; ") || "none"} payloads_returned=false safety_transcript_returned=${safety.safety_transcript_returned} raw_path=${profileAResult.launch.raw_path_returned || profileBResult.launch.raw_path_returned} onion_secret=${profileAResult.launch.onion_secret_returned || profileBResult.launch.onion_secret_returned} descriptor_body=${profileAResult.launch.descriptor_body_returned || profileBResult.launch.descriptor_body_returned} key_material=${profileAResult.launch.key_material_exposed || profileBResult.launch.key_material_exposed || profileAResult.pairing.key_material_exposed || profileBResult.pairing.key_material_exposed || safety.key_material_exposed} network=${profileAResult.launch.network_io_attempted || profileBResult.launch.network_io_attempted} transport=${profileAResult.launch.transport_io_opened || profileBResult.launch.transport_io_opened || profileAResult.pairing.transport_io_opened || profileBResult.pairing.transport_io_opened || safety.transport_io_opened} runtime=${profileAResult.launch.runtime_messaging_enabled || profileBResult.launch.runtime_messaging_enabled || profileAResult.pairing.runtime_messaging_enabled || profileBResult.pairing.runtime_messaging_enabled || safety.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setProductionTwoProfileState("Onion pairing failed");
    setText(fields.productionTwoProfileWarning, `Onion pairing failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before session save or message transport.");
  } finally {
    productionBusyAction = null;
    if (fields.prepareProductionTwoProfileOnionPairing) {
      fields.prepareProductionTwoProfileOnionPairing.disabled = false;
    }
    applyProductionActionState();
  }
}

async function saveProductionTwoProfileOnionSessions() {
  const { profileA, profileB, passphrase } = productionTwoProfileInput();
  const localPayload = (fields.productionPairingPayload?.value ?? "").trim();
  const remotePayload = (fields.productionRemotePairingPayload?.value ?? "").trim();
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setProductionTwoProfileState("Onion session save needs profiles");
    setText(fields.productionTwoProfileWarning, "Enter two distinct profiles and passphrase before saving onion sessions.");
    return;
  }
  if (!localPayload || !remotePayload) {
    setProductionTwoProfileState("Onion session save needs payloads");
    setText(fields.productionTwoProfileWarning, "Prepare onion pairing payloads before saving sessions.");
    return;
  }
  if (!currentPairingSafetyVerified({ localPayload, remotePayload, safetyConfirmed: true })) {
    setProductionTwoProfileState("Onion session save needs safety");
    setText(fields.productionTwoProfileWarning, "Verify the safety number before saving Alice/Bob onion sessions.");
    return;
  }

  productionBusyAction = "two-profile-onion-session-save";
  setProductionTwoProfileState("Onion session save running");
  setText(fields.productionTwoProfileWarning, "Saving verified Alice/Bob session drafts from onion pairing payloads.");
  setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
  setText(fields.productionTwoProfileSession, "Writing both encrypted session drafts");
  setText(fields.productionTwoProfileMessageState, "No message transport attempted");
  setText(fields.productionTwoProfileBoundary, "Session save in progress");
  applyProductionActionState();
  if (fields.saveProductionTwoProfileOnionSessions) {
    fields.saveProductionTwoProfileOnionSessions.disabled = true;
  }

  try {
    const profileADraft = await invoke("production_pairing_session_draft_save", {
      profile: profileA,
      passphrase,
      localPayload,
      remotePayload,
      safetyConfirmed: true,
    });
    const profileBDraft = await invoke("production_pairing_session_draft_save", {
      profile: profileB,
      passphrase,
      localPayload: remotePayload,
      remotePayload: localPayload,
      safetyConfirmed: true,
    });
    const status = await invoke("production_two_profile_session_status", {
      profileA,
      profileB,
      passphrase,
    });
    rememberTwoProfileSessionStatus({ profileA, profileB, passphrase }, status);
    renderProductionTwoProfileSessionStatusResult(status);
    const profileAView = productionSessionDraftView(profileADraft);
    const profileBView = productionSessionDraftView(profileBDraft);
    setProductionPairingState("Onion sessions saved");
    setText(
      fields.productionPairingWarning,
      "Verified onion pairing saved for both local profiles. Message sessions still require handshake completion.",
    );
    setText(
      fields.productionPairingSession,
      `a=${profileAView.session} b=${profileBView.session}`,
    );
    setProductionTwoProfileState(
      status.both_ready_for_message_envelope ? "Onion sessions message-ready" : "Onion session drafts saved",
    );
    setText(
      fields.productionTwoProfileWarning,
      status.both_ready_for_message_envelope
        ? "Alice/Bob sessions are message-ready. Send a stored-session message or continue onion roundtrip."
        : "Alice/Bob session drafts saved. Continue with handshake before stored-session messages.",
    );
    setText(
      fields.productionTwoProfileProfiles,
      `a_draft=${profileADraft.session_draft_present} b_draft=${profileBDraft.session_draft_present}`,
    );
    setText(
      fields.productionTwoProfileSession,
      `a_ready=${status.profile_a_ready_for_message_envelope} b_ready=${status.profile_b_ready_for_message_envelope} both_ready=${status.both_ready_for_message_envelope}`,
    );
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(
      fields.productionTwoProfileBoundary,
      `a_written=${profileADraft.session_draft_written} b_written=${profileBDraft.session_draft_written} a_present=${profileADraft.session_draft_present} b_present=${profileBDraft.session_draft_present} path=${profileADraft.store_path_returned || profileBDraft.store_path_returned || status.store_path_returned} passphrase=${profileADraft.passphrase_retained || profileBDraft.passphrase_retained || status.passphrase_retained} key_material=${profileADraft.key_material_exposed || profileBDraft.key_material_exposed || status.key_material_exposed} network=false transport=${profileADraft.transport_io_opened || profileBDraft.transport_io_opened || status.transport_io_opened} runtime=${profileADraft.runtime_messaging_enabled || profileBDraft.runtime_messaging_enabled || status.runtime_messaging_enabled}`,
    );
    setProductionFollowupActions(
      true,
      status.both_ready_for_message_envelope
        ? "Next: send a stored-session message."
        : "Next: complete handshake to make the sessions message-ready.",
    );
  } catch (error) {
    setProductionTwoProfileState("Onion session save failed");
    setText(fields.productionTwoProfileWarning, `Onion session save failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before message transport.");
  } finally {
    productionBusyAction = null;
    if (fields.saveProductionTwoProfileOnionSessions) {
      fields.saveProductionTwoProfileOnionSessions.disabled = false;
    }
    applyProductionActionState();
  }
}

async function refreshProductionTwoProfilePeerEndpoints() {
  const { profileA, profileB, passphrase } = productionTwoProfileInput();
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setProductionTwoProfileState("Endpoint refresh needs profiles");
    setText(fields.productionTwoProfileWarning, "Enter two distinct profiles and passphrase before refreshing peer endpoints.");
    return;
  }
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Endpoint refresh blocked");
    setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before refreshing endpoints.");
    return;
  }
  if (!latestTwoProfileSessionStatusForCurrentInput({ profileA, profileB, passphrase })) {
    setProductionTwoProfileState("Endpoint refresh needs session");
    setText(fields.productionTwoProfileWarning, "Check or save onion sessions before applying refreshed peer endpoints.");
    return;
  }

  const launchEndpoint = async (profile) => {
    const launch = await invoke("production_onion_service_launch_attempt", {
      profile,
      passphrase,
      manualNetworkPermission,
    });
    if (!launch.local_onion_endpoint) {
      throw new Error(`${profile} endpoint unavailable: ${launch.next_blocker || "unknown blocker"}`);
    }
    return launch;
  };

  productionBusyAction = "two-profile-peer-endpoint-refresh";
  setProductionTwoProfileState("Endpoint refresh running");
  setText(fields.productionTwoProfileWarning, "Launching fresh local onion endpoints and applying them to existing peer session records.");
  setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
  setText(fields.productionTwoProfileSession, "Existing encrypted session drafts are kept; only peer endpoint records are updated");
  setText(fields.productionTwoProfileMessageState, "No message transport attempted");
  setText(fields.productionTwoProfileBoundary, "Endpoint refresh in progress with manual network permission");
  applyProductionActionState();
  if (fields.refreshProductionTwoProfilePeerEndpoints) {
    fields.refreshProductionTwoProfilePeerEndpoints.disabled = true;
  }

  try {
    const profileALaunch = await launchEndpoint(profileA);
    const profileBLaunch = await launchEndpoint(profileB);
    const profileAUpdate = await invoke("production_pairing_session_remote_endpoint_update", {
      profile: profileA,
      passphrase,
      rendezvousEndpoint: profileBLaunch.local_onion_endpoint,
    });
    const profileBUpdate = await invoke("production_pairing_session_remote_endpoint_update", {
      profile: profileB,
      passphrase,
      rendezvousEndpoint: profileALaunch.local_onion_endpoint,
    });
    const status = await invoke("production_two_profile_session_status", {
      profileA,
      profileB,
      passphrase,
    });
    rememberTwoProfileOnionEndpoints(
      { profileA, profileB, passphrase },
      {
        profileAEndpoint: profileALaunch.local_onion_endpoint,
        profileBEndpoint: profileBLaunch.local_onion_endpoint,
      },
    );
    rememberTwoProfileSessionStatus({ profileA, profileB, passphrase }, status);
    renderProductionTwoProfileSessionStatusResult(status);
    setProductionTwoProfileState(
      status.both_ready_for_message_envelope ? "Peer endpoints refreshed" : "Peer endpoints refreshed; session needs review",
    );
    setText(fields.productionTwoProfileWarning, "Stored peer endpoints were refreshed without redoing pairing.");
    setText(
      fields.productionTwoProfileProfiles,
      `a_endpoint=${profileALaunch.onion_endpoint_returned} b_endpoint=${profileBLaunch.onion_endpoint_returned}`,
    );
    setText(
      fields.productionTwoProfileSession,
      `a_update=${profileAUpdate.remote_endpoint_state_written} b_update=${profileBUpdate.remote_endpoint_state_written} a_ready=${status.profile_a_ready_for_message_envelope} b_ready=${status.profile_b_ready_for_message_envelope}`,
    );
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(
      fields.productionTwoProfileBoundary,
      `a_changed=${profileAUpdate.remote_endpoint_changed} b_changed=${profileBUpdate.remote_endpoint_changed} existing_session=${profileAUpdate.update_channel_existing_encrypted_session && profileBUpdate.update_channel_existing_encrypted_session} a_retained=${profileALaunch.onion_service_retained} b_retained=${profileBLaunch.onion_service_retained} raw_endpoint=${profileAUpdate.remote_endpoint_returned || profileBUpdate.remote_endpoint_returned} raw_path=${profileAUpdate.store_path_returned || profileBUpdate.store_path_returned || profileALaunch.raw_path_returned || profileBLaunch.raw_path_returned} onion_secret=${profileALaunch.onion_secret_returned || profileBLaunch.onion_secret_returned} key_material=${profileAUpdate.key_material_exposed || profileBUpdate.key_material_exposed || profileALaunch.key_material_exposed || profileBLaunch.key_material_exposed} network=${profileALaunch.network_io_attempted || profileBLaunch.network_io_attempted} transport=${profileAUpdate.transport_io_opened || profileBUpdate.transport_io_opened || profileALaunch.transport_io_opened || profileBLaunch.transport_io_opened} runtime=${profileAUpdate.runtime_messaging_enabled || profileBUpdate.runtime_messaging_enabled || profileALaunch.runtime_messaging_enabled || profileBLaunch.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setProductionTwoProfileState("Endpoint refresh failed");
    setText(fields.productionTwoProfileWarning, `Endpoint refresh failed without returning endpoint, path, or key details. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Existing session state was not intentionally deleted or re-paired.");
  } finally {
    productionBusyAction = null;
    if (fields.refreshProductionTwoProfilePeerEndpoints) {
      fields.refreshProductionTwoProfilePeerEndpoints.disabled = false;
    }
    applyProductionActionState();
  }
}

async function sendProductionTwoProfileEndpointUpdate() {
  const input = productionTwoProfileInput();
  const localEndpoint = latestTwoProfileLocalOnionEndpoint(input);
  const latestMessage = latestProductionTwoProfileSuccess;
  const storedEndpointTransportState = storedPeerEndpointTransportState(input);
  if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
    setProductionTwoProfileState("Endpoint update needs profiles");
    setText(fields.productionTwoProfileWarning, "Enter two distinct profiles and passphrase before sending an endpoint update.");
    return;
  }
  if (!twoProfileSessionsReadyForInput(input)) {
    setProductionTwoProfileState("Endpoint update needs session");
    setText(fields.productionTwoProfileWarning, "Complete the verified session handshake before sending an endpoint update.");
    return;
  }
  if (!storedEndpointTransportState.ready) {
    setProductionTwoProfileState("Endpoint update needs peer endpoint");
    setText(
      fields.productionTwoProfileWarning,
      `Stored peer endpoint is not ready: ${storedEndpointTransportState.reason}. Refresh peer endpoints before sending an endpoint update over onion.`,
    );
    return;
  }
  if (!localEndpoint) {
    setProductionTwoProfileState("Endpoint update needs local endpoint");
    setText(fields.productionTwoProfileWarning, "Refresh or prepare onion endpoints before sending an endpoint update.");
    return;
  }
  if (!latestMessage || latestMessage.profileA !== input.profileA || latestMessage.profileB !== input.profileB) {
    setProductionTwoProfileState("Endpoint update needs message baseline");
    setText(fields.productionTwoProfileWarning, "Send a stored-session message first so the endpoint update uses the next session message number.");
    return;
  }
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Endpoint update blocked");
    setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before sending an endpoint update over onion.");
    return;
  }

  const updateMessageNumber = latestMessage.messageNumber + 1;
  productionBusyAction = "two-profile-endpoint-update-control";
  setProductionTwoProfileState("Endpoint update running");
  setText(fields.productionTwoProfileWarning, `Sending endpoint update control message #${updateMessageNumber} over onion.`);
  setText(fields.productionTwoProfileProfiles, `sender=${input.profileA} receiver=${input.profileB}`);
  setText(fields.productionTwoProfileSession, "Using existing encrypted session control envelope and stored peer endpoint");
  setText(fields.productionTwoProfileMessageState, "Waiting for bounded onion endpoint update send attempt");
  setText(fields.productionTwoProfileBoundary, "Endpoint update control send in progress with manual network permission");
  applyProductionActionState();
  if (fields.sendProductionTwoProfileEndpointUpdate) {
    fields.sendProductionTwoProfileEndpointUpdate.disabled = true;
  }

  try {
    const result = await invoke("production_onion_endpoint_update_control_send_stored_endpoint_attempt", {
      profile: input.profileA,
      passphrase: input.passphrase,
      messageNumber: updateMessageNumber,
      localRendezvousEndpoint: localEndpoint,
      manualNetworkPermission,
    });
    const status = await invoke("production_two_profile_session_status", {
      profileA: input.profileA,
      profileB: input.profileB,
      passphrase: input.passphrase,
    });
    rememberTwoProfileSessionStatus(input, status);
    renderProductionTwoProfileSessionStatusResult(status);
    setProductionTwoProfileState(
      result.send_attempt_succeeded
        ? "Endpoint update sent"
        : result.peer_endpoint_refresh_recommended
          ? "Peer endpoint refresh needed"
          : "Endpoint update blocked",
    );
    setText(fields.productionTwoProfileWarning, result.warning);
    setText(
      fields.productionTwoProfileSession,
      `control_message=${updateMessageNumber} created=${result.endpoint_update_created} encrypted=${result.encrypted_control_envelope_written} intent=${result.send_intent_prepared}`,
    );
    setText(
      fields.productionTwoProfileMessageState,
      result.peer_endpoint_refresh_recommended
        ? `started=${result.send_attempt_started} succeeded=${result.send_attempt_succeeded} next=refresh peer endpoints, then retry control message #${updateMessageNumber}`
        : `started=${result.send_attempt_started} succeeded=${result.send_attempt_succeeded} next=${result.next_blocker}`,
    );
    setText(
      fields.productionTwoProfileBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} endpoint_failure_recorded=${result.peer_endpoint_failure_recorded} refresh=${result.peer_endpoint_refresh_recommended} retry_after_refresh=${result.retry_recommended_after_endpoint_refresh} events=${result.event_summary.join("; ") || "none"} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} envelope_payload=${result.envelope_payload_returned} endpoint_plaintext=${result.endpoint_plaintext_exposed} key_material=${result.key_material_exposed || status.key_material_exposed} network=${result.network_io_attempted || status.network_io_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled || status.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setProductionTwoProfileState("Endpoint update failed");
    setText(fields.productionTwoProfileWarning, `Endpoint update failed without returning endpoint, path, or key details. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Existing session state was not intentionally deleted or re-paired.");
  } finally {
    productionBusyAction = null;
    if (fields.sendProductionTwoProfileEndpointUpdate) {
      fields.sendProductionTwoProfileEndpointUpdate.disabled = false;
    }
    applyProductionActionState();
  }
}

async function completeProductionTwoProfileOnionHandshake() {
  const { profileA, profileB, passphrase } = productionTwoProfileInput();
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setProductionTwoProfileState("Onion handshake needs profiles");
    setText(fields.productionTwoProfileWarning, "Enter two distinct profiles and passphrase before completing the onion handshake.");
    return;
  }

  productionBusyAction = "two-profile-onion-handshake";
  setProductionTwoProfileState("Onion handshake running");
  setText(fields.productionTwoProfileWarning, "Completing Alice/Bob handshake from stored onion session drafts.");
  setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
  setText(fields.productionTwoProfileSession, "Creating init, reply, finish, and importing finish locally");
  setText(fields.productionTwoProfileMessageState, "No network or message transport attempted");
  setText(fields.productionTwoProfileBoundary, "Handshake in progress");
  applyProductionActionState();
  if (fields.completeProductionTwoProfileOnionHandshake) {
    fields.completeProductionTwoProfileOnionHandshake.disabled = true;
  }

  try {
    const profileAInit = await invoke("production_handshake_init_export", {
      profile: profileA,
      passphrase,
    });
    let senderProfile = profileA;
    let receiverProfile = profileB;
    let init = profileAInit;
    let profileBInit = null;
    if (!profileAInit.output_payload_created) {
      profileBInit = await invoke("production_handshake_init_export", {
        profile: profileB,
        passphrase,
      });
      if (!profileBInit.output_payload_created) {
        throw new Error("handshake init was not created for either profile");
      }
      senderProfile = profileB;
      receiverProfile = profileA;
      init = profileBInit;
    }

    const reply = await invoke("production_handshake_reply_export", {
      profile: receiverProfile,
      passphrase,
      initPayload: init.output_payload,
    });
    const finish = await invoke("production_handshake_finish_export", {
      profile: senderProfile,
      passphrase,
      replyPayload: reply.output_payload,
    });
    const finishImport = await invoke("production_handshake_finish_import", {
      profile: receiverProfile,
      passphrase,
      finishPayload: finish.output_payload,
    });
    const status = await invoke("production_two_profile_session_status", {
      profileA,
      profileB,
      passphrase,
    });

    if (fields.productionProfileName) {
      fields.productionProfileName.value = senderProfile;
      fields.productionProfileName.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (fields.productionProfileSelector) {
      fields.productionProfileSelector.value = senderProfile;
    }
    setHandshakePayload(fields.productionHandshakeInitPayload, init.output_payload);
    setHandshakePayload(fields.productionHandshakeReplyPayload, reply.output_payload);
    setHandshakePayload(fields.productionHandshakeFinishPayload, finish.output_payload);
    setText(fields.productionHandshakeState, "Two-profile handshake completed");
    rememberTwoProfileSessionStatus({ profileA, profileB, passphrase }, status);
    renderProductionTwoProfileSessionStatusResult(status);
    setProductionPairingState(
      status.both_ready_for_message_envelope ? "Onion handshake message-ready" : "Onion handshake needs review",
    );
    setText(
      fields.productionPairingWarning,
      status.both_ready_for_message_envelope
        ? "Handshake transport state persisted for both local profiles."
        : "Handshake completed but message-ready state needs review.",
    );
    setProductionTwoProfileState(
      status.both_ready_for_message_envelope ? "Onion handshake message-ready" : "Onion handshake needs review",
    );
    setText(
      fields.productionTwoProfileWarning,
      status.both_ready_for_message_envelope
        ? "Alice/Bob sessions are message-ready. Send a stored-session message next."
        : "Handshake completed, but session status is not fully message-ready.",
    );
    setText(fields.productionTwoProfileProfiles, `sender=${senderProfile} receiver=${receiverProfile}`);
    setText(
      fields.productionTwoProfileSession,
      `init=${init.output_payload_created} reply=${reply.output_payload_created} finish=${finish.output_payload_created} import=${finishImport.transport_state_persisted} both_ready=${status.both_ready_for_message_envelope}`,
    );
    setText(fields.productionTwoProfileMessageState, "No message transport attempted");
    setText(
      fields.productionTwoProfileBoundary,
      `a_init=${profileAInit.output_payload_created} b_init=${profileBInit?.output_payload_created ?? false} reply_state=${reply.state_written} finish_state=${finish.state_written} finish_import=${finishImport.transport_state_created} a_ready=${status.profile_a_ready_for_message_envelope} b_ready=${status.profile_b_ready_for_message_envelope} path=${status.store_path_returned} passphrase=${status.passphrase_retained} key_material=${profileAInit.key_material_exposed || Boolean(profileBInit?.key_material_exposed) || reply.key_material_exposed || finish.key_material_exposed || finishImport.key_material_exposed || status.key_material_exposed} network=false transport=${profileAInit.transport_io_opened || Boolean(profileBInit?.transport_io_opened) || reply.transport_io_opened || finish.transport_io_opened || finishImport.transport_io_opened || status.transport_io_opened} runtime=${profileAInit.runtime_messaging_enabled || Boolean(profileBInit?.runtime_messaging_enabled) || reply.runtime_messaging_enabled || finish.runtime_messaging_enabled || finishImport.runtime_messaging_enabled || status.runtime_messaging_enabled}`,
    );
    setProductionFollowupActions(
      true,
      status.both_ready_for_message_envelope
        ? "Next: send a stored-session message."
        : "Next: check session status and retry handshake if needed.",
    );
    const currentInput = productionTwoProfileInput();
    if (status.both_ready_for_message_envelope && currentInput.message) {
      fields.runProductionTwoProfileMessageRoundtrip?.focus();
    } else if (status.both_ready_for_message_envelope) {
      fields.productionTwoProfileMessage?.focus();
    }
  } catch (error) {
    setProductionTwoProfileState("Onion handshake failed");
    setText(fields.productionTwoProfileWarning, `Onion handshake failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before message transport.");
  } finally {
    productionBusyAction = null;
    if (fields.completeProductionTwoProfileOnionHandshake) {
      fields.completeProductionTwoProfileOnionHandshake.disabled = false;
    }
    applyProductionActionState();
  }
}

async function prepareOnionKeyRecord() {
  const { profile, passphrase } = productionProfileInput();
  if (!profile || !passphrase) {
    setOnionKeyRecordState("Key record prepare needs profile");
    setText(fields.onionKeyRecordBoundary, "Enter profile and passphrase in the profile unlock panel first.");
    return;
  }

  setOnionKeyRecordState("Key record prepare running");
  setText(fields.onionKeyRecordBoundary, "Checking backup exclusion before opening the encrypted profile store.");
  if (fields.prepareOnionKeyRecord) {
    fields.prepareOnionKeyRecord.disabled = true;
  }
  try {
    const result = await invoke("production_onion_key_record_prepare", { profile, passphrase });
    setOnionKeyRecordState(result.key_material_ready ? "Key record prepared" : "Key record blocked");
    setText(
      fields.onionKeyRecordBoundary,
      `storage=${result.storage_opened} profile=${result.profile_marker_present} profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} lifecycle=${result.lifecycle_ready} written=${result.key_record_written} present=${result.key_record_present} material_ready=${result.key_material_ready} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    setText(fields.onionPreflightWarning, result.warning);
  } catch (error) {
    setOnionKeyRecordState("Key record prepare failed");
    setText(fields.onionKeyRecordBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionKeyRecord) {
      fields.prepareOnionKeyRecord.disabled = false;
    }
  }
}

async function checkOnionLaunchPreflight() {
  const { profile, passphrase } = productionProfileInput();
  if (!profile || !passphrase) {
    setOnionLaunchPreflightState("Launch preflight needs profile");
    setText(fields.onionLaunchPreflightBoundary, "Enter profile and passphrase in the profile unlock panel first.");
    return;
  }

  setOnionLaunchPreflightState("Launch preflight running");
  setText(
    fields.onionLaunchPreflightBoundary,
    "Checking launch preflight guards without starting Tor or publishing a descriptor.",
  );
  if (fields.checkOnionLaunchPreflight) {
    fields.checkOnionLaunchPreflight.disabled = true;
  }
  try {
    const result = await invoke("production_onion_launch_preflight_check", { profile, passphrase });
    setOnionLaunchPreflightState(
      result.ready_for_onion_launch ? "Launch preflight ready" : "Launch preflight blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionLaunchPreflightBoundary,
      `profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} key_record=${result.key_record_present} key_material=${result.key_material_ready} persistent_client=${result.persistent_client_ready} publication_policy=${result.endpoint_publication_policy_ready} update_policy=${result.endpoint_update_policy_ready} redacted_events=${result.redacted_events_only} launch=${result.ready_for_onion_launch} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionLaunchPreflightState("Launch preflight failed");
    setText(fields.onionLaunchPreflightBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.checkOnionLaunchPreflight) {
      fields.checkOnionLaunchPreflight.disabled = false;
    }
  }
}

async function attemptOnionServiceLaunch() {
  const { profile, passphrase } = productionProfileInput();
  const manualNetworkPermission = Boolean(fields.manualOnionNetworkPermission?.checked);
  if (!profile || !passphrase) {
    setText(fields.onionServiceLaunchAttempt, "Enter profile and passphrase in the profile unlock panel first.");
    return;
  }

  setText(
    fields.onionServiceLaunchAttempt,
    "Attempting fail-closed onion launch boundary with explicit manual permission.",
  );
  if (fields.attemptOnionServiceLaunch) {
    fields.attemptOnionServiceLaunch.disabled = true;
  }
  try {
    const result = await invoke("production_onion_service_launch_attempt", {
      profile,
      passphrase,
      manualNetworkPermission,
    });
    setText(fields.onionPreflightWarning, result.warning);
    if (result.local_onion_endpoint && fields.productionPairingEndpoint) {
      fields.productionPairingEndpoint.value = result.local_onion_endpoint;
      fields.productionPairingEndpoint.dispatchEvent(new Event("input", { bubbles: true }));
      setProductionPairingState("Local onion endpoint ready");
    }
    setText(
      fields.onionServiceLaunchAttempt,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} key_record=${result.key_record_present} key_material=${result.key_material_ready} persistent_client=${result.persistent_client_ready} launch_preflight=${result.launch_preflight_ready} adapter=${result.launch_adapter_ready} started=${result.launch_attempt_started} succeeded=${result.launch_attempt_succeeded} retained=${result.onion_service_retained} rend_stream=${result.inbound_rend_request_stream_retained} endpoint_ready=${result.onion_endpoint_returned} event_recorded=${result.redacted_launch_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setText(fields.onionServiceLaunchAttempt, `Failed closed: ${error}`);
  } finally {
    if (fields.attemptOnionServiceLaunch) {
      fields.attemptOnionServiceLaunch.disabled = false;
    }
  }
}

async function prepareOnionDescriptorPublication() {
  const { profile, passphrase } = productionProfileInput();
  if (!profile || !passphrase) {
    setOnionDescriptorPublicationState("Descriptor prepare needs profile");
    setText(fields.onionDescriptorPublicationBoundary, "Enter profile and passphrase in the profile unlock panel first.");
    return;
  }

  setOnionDescriptorPublicationState("Descriptor prepare running");
  setText(
    fields.onionDescriptorPublicationBoundary,
    "Checking descriptor publication preparation guards without creating or publishing a descriptor.",
  );
  if (fields.prepareOnionDescriptorPublication) {
    fields.prepareOnionDescriptorPublication.disabled = true;
  }
  try {
    const result = await invoke("production_onion_descriptor_publication_prepare", { profile, passphrase });
    setOnionDescriptorPublicationState(
      result.descriptor_preparation_ready ? "Descriptor prepare ready" : "Descriptor prepare blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionDescriptorPublicationBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} profile_unlock=${result.profile_transport_unlock_ready} key_material=${result.key_material_ready} persistent_client=${result.persistent_client_ready} launch=${result.launch_preflight_ready} hosting_gate=${result.onion_hosting_gate_ready} descriptor_gate=${result.descriptor_publication_gate_ready} adapter=${result.fail_closed_adapter_ready} redacted_context=${result.redacted_context_ready} prepared=${result.descriptor_preparation_ready} policy=${result.endpoint_publication_policy_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionDescriptorPublicationState("Descriptor prepare failed");
    setText(fields.onionDescriptorPublicationBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionDescriptorPublication) {
      fields.prepareOnionDescriptorPublication.disabled = false;
    }
  }
}

async function attemptOnionDescriptorPublication() {
  const { profile, passphrase } = productionProfileInput();
  const manualNetworkPermission = Boolean(fields.manualOnionNetworkPermission?.checked);
  if (!profile || !passphrase) {
    setText(fields.onionDescriptorPublicationAttempt, "Enter profile and passphrase in the profile unlock panel first.");
    return;
  }

  setText(
    fields.onionDescriptorPublicationAttempt,
    "Attempting fail-closed descriptor publication boundary with explicit manual permission.",
  );
  if (fields.attemptOnionDescriptorPublication) {
    fields.attemptOnionDescriptorPublication.disabled = true;
  }
  try {
    const result = await invoke("production_onion_descriptor_publication_attempt", {
      profile,
      passphrase,
      manualNetworkPermission,
    });
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionDescriptorPublicationAttempt,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} launch=${result.launch_preflight_ready} descriptor_gate=${result.descriptor_publication_gate_ready} prepared=${result.descriptor_preparation_ready} started=${result.publish_attempt_started} succeeded=${result.publish_attempt_succeeded} event_recorded=${result.redacted_publish_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setText(fields.onionDescriptorPublicationAttempt, `Failed closed: ${error}`);
  } finally {
    if (fields.attemptOnionDescriptorPublication) {
      fields.attemptOnionDescriptorPublication.disabled = false;
    }
  }
}

async function prepareOnionInboundStream() {
  const { profile, passphrase } = productionProfileInput();
  if (!profile || !passphrase) {
    setOnionInboundStreamState("Inbound prepare needs profile");
    setText(fields.onionInboundStreamBoundary, "Enter profile and passphrase in the profile unlock panel first.");
    return;
  }

  setOnionInboundStreamState("Inbound prepare running");
  setText(
    fields.onionInboundStreamBoundary,
    "Checking inbound stream guards without accepting streams or opening read/write I/O.",
  );
  if (fields.prepareOnionInboundStream) {
    fields.prepareOnionInboundStream.disabled = true;
  }
  try {
    const result = await invoke("production_onion_inbound_stream_prepare", { profile, passphrase });
    setOnionInboundStreamState(
      result.inbound_stream_preparation_ready ? "Inbound prepare ready" : "Inbound prepare blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionInboundStreamBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} persistent_client=${result.persistent_client_ready} launch=${result.launch_preflight_ready} descriptor_gate=${result.descriptor_publication_gate_ready} descriptor_prepared=${result.descriptor_preparation_ready} inbound_gate=${result.inbound_stream_gate_ready} adapter=${result.fail_closed_adapter_ready} inbound_prepared=${result.inbound_stream_preparation_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} stream_id=${result.stream_id_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} accept=${result.stream_accept_attempted} read_write=${result.stream_read_write_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionInboundStreamState("Inbound prepare failed");
    setText(fields.onionInboundStreamBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionInboundStream) {
      fields.prepareOnionInboundStream.disabled = false;
    }
  }
}

async function attemptOnionInboundEnvelopeReceive() {
  const { profile, passphrase } = productionProfileInput();
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!profile || !passphrase) {
    setOnionInboundStreamState("Envelope receive attempt needs profile");
    setText(fields.onionInboundEnvelopeReceiveAttempt, "Enter profile and passphrase first.");
    return;
  }

  setOnionInboundStreamState("Envelope receive attempt running");
  setText(
    fields.onionInboundEnvelopeReceiveAttempt,
    manualNetworkPermission
      ? "Manual permission set. This may advance to the inbound receive adapter in feature builds."
      : "Manual permission is off. The command will fail closed without network I/O.",
  );
  if (fields.attemptOnionInboundEnvelopeReceive) {
    fields.attemptOnionInboundEnvelopeReceive.disabled = true;
  }
  try {
    const result = await invoke("production_onion_inbound_envelope_receive_attempt", {
      profile,
      passphrase,
      manualNetworkPermission,
    });
    setOnionInboundStreamState(
      result.receive_attempt_succeeded
        ? "Envelope receive attempt read"
        : result.receive_attempt_started
          ? "Envelope receive attempt failed closed"
          : "Envelope receive attempt blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionInboundEnvelopeReceiveAttempt,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} inbound_prepared=${result.inbound_stream_preparation_ready} rend_stream=${result.inbound_rend_request_stream_ready} rend_accept_attempted=${result.inbound_rend_request_accept_attempted} rend_accepted=${result.inbound_rend_request_accepted} stream_requests=${result.accepted_stream_request_stream_ready} stream_accept_attempted=${result.stream_request_accept_attempted} stream_accepted=${result.stream_request_accepted} stream_read_attempted=${result.stream_read_attempted} stream_bytes=${result.stream_bytes_read} started=${result.receive_attempt_started} succeeded=${result.receive_attempt_succeeded} received_envelope=${result.received_envelope_ready} import_attempted=${result.inbound_import_attempted} control_imported=${result.control_envelope_imported} endpoint_update=${result.endpoint_update_applied} stale_cleared=${result.stale_endpoint_status_cleared} event_recorded=${result.redacted_receive_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} stream_id=${result.stream_id_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} accept=${result.stream_accept_attempted} read_write=${result.stream_read_write_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionInboundStreamState("Envelope receive attempt failed");
    setText(fields.onionInboundEnvelopeReceiveAttempt, `Failed closed: ${error}`);
  } finally {
    if (fields.attemptOnionInboundEnvelopeReceive) {
      fields.attemptOnionInboundEnvelopeReceive.disabled = false;
    }
  }
}

async function prepareOnionOutboundStream() {
  const rendezvousEndpoint = (fields.productionPairingEndpoint?.value ?? "").trim();
  if (!rendezvousEndpoint) {
    setOnionOutboundStreamState("Outbound prepare needs endpoint");
    setText(fields.onionOutboundStreamBoundary, "Enter a pairwise onion endpoint in the pairing panel first.");
    return;
  }

  setOnionOutboundStreamState("Outbound prepare running");
  setText(
    fields.onionOutboundStreamBoundary,
    "Checking outbound stream guards without dialing or sending over a stream.",
  );
  if (fields.prepareOnionOutboundStream) {
    fields.prepareOnionOutboundStream.disabled = true;
  }
  try {
    const result = await invoke("production_onion_outbound_stream_prepare", { rendezvousEndpoint });
    setOnionOutboundStreamState(
      result.outbound_stream_preparation_ready ? "Outbound prepare ready" : "Outbound prepare blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionOutboundStreamBoundary,
      `endpoint=${result.endpoint_accepted} pairwise=${result.pairwise_endpoint_ready} high_risk_policy=${result.high_risk_onion_policy_ready} outbound_gate=${result.outbound_stream_gate_ready} adapter=${result.fail_closed_adapter_ready} outbound_prepared=${result.outbound_stream_preparation_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} stream_id=${result.stream_id_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} dial=${result.stream_dial_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionOutboundStreamState("Outbound prepare failed");
    setText(fields.onionOutboundStreamBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionOutboundStream) {
      fields.prepareOnionOutboundStream.disabled = false;
    }
  }
}

async function prepareOnionStreamCloseout() {
  const { profile, passphrase } = productionProfileInput();
  const rendezvousEndpoint = (fields.productionPairingEndpoint?.value ?? "").trim();
  if (!profile || !passphrase) {
    setOnionStreamCloseoutState("Stream closeout needs profile");
    setText(fields.onionStreamCloseoutBoundary, "Enter profile and passphrase in the profile unlock panel first.");
    return;
  }
  if (!rendezvousEndpoint) {
    setOnionStreamCloseoutState("Stream closeout needs endpoint");
    setText(fields.onionStreamCloseoutBoundary, "Enter a pairwise onion endpoint in the pairing panel first.");
    return;
  }

  setOnionStreamCloseoutState("Stream closeout running");
  setText(
    fields.onionStreamCloseoutBoundary,
    "Checking inbound and outbound stream adapter closeout without accepting, dialing, read/write, or sending.",
  );
  if (fields.prepareOnionStreamCloseout) {
    fields.prepareOnionStreamCloseout.disabled = true;
  }
  try {
    const result = await invoke("production_onion_stream_adapter_closeout_prepare", {
      profile,
      passphrase,
      rendezvousEndpoint,
    });
    setOnionStreamCloseoutState(
      result.stream_adapter_closeout_ready ? "Stream closeout ready" : "Stream closeout blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionStreamCloseoutBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} persistent_client=${result.persistent_client_ready} inbound=${result.inbound_stream_preparation_ready} outbound=${result.outbound_stream_preparation_ready} closeout=${result.stream_adapter_closeout_ready} remote_auth_next=${result.remote_peer_authentication_next} verified_session_after_auth=${result.verified_pairwise_session_after_remote_authentication} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} stream_id=${result.stream_id_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionStreamCloseoutState("Stream closeout failed");
    setText(fields.onionStreamCloseoutBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionStreamCloseout) {
      fields.prepareOnionStreamCloseout.disabled = false;
    }
  }
}

async function prepareOnionRemoteAuth() {
  const { profile, passphrase } = productionProfileInput();
  const rendezvousEndpoint = (fields.productionPairingEndpoint?.value ?? "").trim();
  if (!profile || !passphrase) {
    setOnionRemoteAuthState("Remote auth needs profile");
    setText(fields.onionRemoteAuthBoundary, "Enter profile and passphrase in the profile unlock panel first.");
    return;
  }
  if (!rendezvousEndpoint) {
    setOnionRemoteAuthState("Remote auth needs endpoint");
    setText(fields.onionRemoteAuthBoundary, "Enter a pairwise onion endpoint in the pairing panel first.");
    return;
  }

  setOnionRemoteAuthState("Remote auth boundary running");
  setText(
    fields.onionRemoteAuthBoundary,
    "Checking that peer proof is required before stream session binding or envelope I/O.",
  );
  if (fields.prepareOnionRemoteAuth) {
    fields.prepareOnionRemoteAuth.disabled = true;
  }
  try {
    const result = await invoke("production_onion_remote_peer_authentication_prepare", {
      profile,
      passphrase,
      rendezvousEndpoint,
    });
    setOnionRemoteAuthState(
      result.remote_peer_authentication_ready ? "Remote auth ready" : "Remote auth blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionRemoteAuthBoundary,
      `closeout=${result.stream_adapter_closeout_ready} auth_required=${result.remote_peer_authentication_required} stored_session=${result.stored_pairwise_session_ready} auth_ready=${result.remote_peer_authentication_ready} session_binding=${result.verified_pairwise_session_binding_ready} bound_stream=${result.bound_stream_session_ready} outbound_io_boundary=${result.outbound_envelope_io_boundary_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionRemoteAuthState("Remote auth failed");
    setText(fields.onionRemoteAuthBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionRemoteAuth) {
      fields.prepareOnionRemoteAuth.disabled = false;
    }
  }
}

async function prepareOnionOutboundEnvelopeSend() {
  const { profile, passphrase, messageNumber } = productionMessageInput();
  const rendezvousEndpoint = (fields.productionPairingEndpoint?.value ?? "").trim();
  if (!profile || !passphrase) {
    setOnionOutboundEnvelopeSendState("Envelope send needs profile");
    setText(
      fields.onionOutboundEnvelopeSendBoundary,
      "Enter profile and passphrase in the profile unlock panel first.",
    );
    return;
  }
  if (!rendezvousEndpoint) {
    setOnionOutboundEnvelopeSendState("Envelope send needs endpoint");
    setText(
      fields.onionOutboundEnvelopeSendBoundary,
      "Enter a pairwise onion endpoint in the pairing panel first.",
    );
    return;
  }
  if (!Number.isInteger(messageNumber) || messageNumber < 1) {
    setOnionOutboundEnvelopeSendState("Envelope send needs message");
    setText(fields.onionOutboundEnvelopeSendBoundary, "Enter the stored outbound message number first.");
    return;
  }

  setOnionOutboundEnvelopeSendState("Envelope send prepare running");
  setText(
    fields.onionOutboundEnvelopeSendBoundary,
    "Checking stored encrypted envelope against the verified stream session without stream send.",
  );
  if (fields.prepareOnionOutboundEnvelopeSend) {
    fields.prepareOnionOutboundEnvelopeSend.disabled = true;
  }
  try {
    const result = await invoke("production_onion_outbound_envelope_send_prepare", {
      profile,
      passphrase,
      rendezvousEndpoint,
      messageNumber,
    });
    setOnionOutboundEnvelopeSendState(
      result.send_intent_prepared ? "Envelope send intent ready" : "Envelope send intent blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionOutboundEnvelopeSendBoundary,
      `auth=${result.remote_peer_authentication_ready} bound_stream=${result.bound_stream_session_ready} io_boundary=${result.outbound_envelope_io_boundary_ready} stored_envelope=${result.stored_outbound_envelope_ready} decodable=${result.envelope_decodable} number_match=${result.envelope_message_number_matches} send_intent=${result.send_intent_prepared} ack_wait=${result.ack_wait_registered} event_recorded=${result.redacted_send_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionOutboundEnvelopeSendState("Envelope send prepare failed");
    setText(fields.onionOutboundEnvelopeSendBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionOutboundEnvelopeSend) {
      fields.prepareOnionOutboundEnvelopeSend.disabled = false;
    }
  }
}

async function attemptOnionOutboundEnvelopeSend() {
  const { profile, passphrase, messageNumber } = productionMessageInput();
  const rendezvousEndpoint = (fields.productionPairingEndpoint?.value ?? "").trim();
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!profile || !passphrase) {
    setOnionOutboundEnvelopeSendState("Envelope send attempt needs profile");
    setText(fields.onionOutboundEnvelopeSendAttempt, "Enter profile and passphrase first.");
    return;
  }
  if (!rendezvousEndpoint) {
    setOnionOutboundEnvelopeSendState("Envelope send attempt needs endpoint");
    setText(fields.onionOutboundEnvelopeSendAttempt, "Enter a pairwise onion endpoint first.");
    return;
  }
  if (!Number.isInteger(messageNumber) || messageNumber < 1) {
    setOnionOutboundEnvelopeSendState("Envelope send attempt needs message");
    setText(fields.onionOutboundEnvelopeSendAttempt, "Enter the stored outbound message number first.");
    return;
  }

  setOnionOutboundEnvelopeSendState("Envelope send attempt running");
  setText(
    fields.onionOutboundEnvelopeSendAttempt,
    manualNetworkPermission
      ? "Manual permission set. This may attempt one bounded onion stream dial and encrypted envelope write."
      : "Manual permission is off. The command will fail closed without network I/O.",
  );
  if (fields.attemptOnionOutboundEnvelopeSend) {
    fields.attemptOnionOutboundEnvelopeSend.disabled = true;
  }
  try {
    const result = await invoke("production_onion_outbound_envelope_send_attempt", {
      profile,
      passphrase,
      rendezvousEndpoint,
      messageNumber,
      manualNetworkPermission,
    });
    setOnionOutboundEnvelopeSendState(
      result.send_attempt_succeeded
        ? "Envelope send attempt wrote"
        : result.send_attempt_started
          ? "Envelope send attempt failed closed"
          : "Envelope send attempt blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionOutboundEnvelopeSendAttempt,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} send_intent=${result.send_intent_prepared} started=${result.send_attempt_started} succeeded=${result.send_attempt_succeeded} ack_wait=${result.ack_wait_registered} event_recorded=${result.redacted_send_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    setOnionOutboundEnvelopeSendState("Envelope send attempt failed");
    setText(fields.onionOutboundEnvelopeSendAttempt, `Failed closed: ${error}`);
  } finally {
    if (fields.attemptOnionOutboundEnvelopeSend) {
      fields.attemptOnionOutboundEnvelopeSend.disabled = false;
    }
  }
}

async function sendProductionTwoProfileLatestOnionEnvelope() {
  const input = productionTwoProfileInput();
  const latestOnionOutbound = latestTwoProfileOutboundOnionMessage(input);
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Onion send blocked");
    setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before sending over onion.");
    return;
  }
  if (!latestOnionOutbound) {
    setProductionTwoProfileState("Onion send needs latest message");
    const peerEndpointState = twoProfilePeerEndpointState(input);
    setText(
      fields.productionTwoProfileWarning,
      peerEndpointState.ready
        ? "Send a stored-session message before attempting onion send."
        : `Peer endpoint is not ready: ${peerEndpointState.reason}. Prepare onion pairing endpoints or relaunch the endpoint before sending.`,
    );
    return;
  }

  productionBusyAction = "two-profile-onion-envelope-send";
  setProductionTwoProfileState("Onion envelope send running");
  setText(
    fields.productionTwoProfileWarning,
    `Attempting one bounded onion stream send for message #${latestOnionOutbound.messageNumber}.`,
  );
  setText(fields.productionTwoProfileProfiles, `sender=${input.profileA} receiver=${input.profileB}`);
  setText(
    fields.productionTwoProfileSession,
    latestOnionOutbound.useStoredEndpoint
      ? "Using stored outbound envelope and encrypted stored peer endpoint"
      : "Using stored outbound envelope and current peer endpoint",
  );
  setText(fields.productionTwoProfileMessageState, "Waiting for onion stream send attempt");
  setText(fields.productionTwoProfileBoundary, "Onion send attempt in progress with manual network permission");
  applyProductionActionState();
  if (fields.sendProductionTwoProfileLatestOnionEnvelope) {
    fields.sendProductionTwoProfileLatestOnionEnvelope.disabled = true;
  }

  try {
    const result = latestOnionOutbound.useStoredEndpoint
      ? await invoke("production_onion_outbound_envelope_send_stored_endpoint_attempt", {
          profile: latestOnionOutbound.profile,
          passphrase: latestOnionOutbound.passphrase,
          messageNumber: latestOnionOutbound.messageNumber,
          manualNetworkPermission,
        })
      : await invoke("production_onion_outbound_envelope_send_attempt", {
          profile: latestOnionOutbound.profile,
          passphrase: latestOnionOutbound.passphrase,
          rendezvousEndpoint: latestOnionOutbound.peerEndpoint,
          messageNumber: latestOnionOutbound.messageNumber,
          manualNetworkPermission,
        });
    setOnionOutboundEnvelopeSendState(
      result.send_attempt_succeeded
        ? "Envelope send attempt wrote"
        : result.send_attempt_started
          ? "Envelope send attempt failed closed"
          : "Envelope send attempt blocked",
    );
    setProductionTwoProfileState(
      result.send_attempt_succeeded
        ? "Onion envelope send attempted"
        : result.peer_endpoint_refresh_recommended
          ? "Peer endpoint refresh needed"
          : "Onion envelope send blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionOutboundEnvelopeSendAttempt,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} send_intent=${result.send_intent_prepared} started=${result.send_attempt_started} succeeded=${result.send_attempt_succeeded} ack_wait=${result.ack_wait_registered} event_recorded=${result.redacted_send_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    setText(fields.productionTwoProfileWarning, result.warning);
    setText(
      fields.productionTwoProfileSession,
      `message=${latestOnionOutbound.messageNumber} intent=${result.send_intent_prepared} ack_wait=${result.ack_wait_registered} endpoint_failure_recorded=${result.peer_endpoint_failure_recorded}`,
    );
    setText(
      fields.productionTwoProfileMessageState,
      result.peer_endpoint_refresh_recommended
        ? `started=${result.send_attempt_started} succeeded=${result.send_attempt_succeeded} next=refresh peer endpoints, then retry message #${latestOnionOutbound.messageNumber}`
        : `started=${result.send_attempt_started} succeeded=${result.send_attempt_succeeded} next=${result.next_blocker}`,
    );
    setText(
      fields.productionTwoProfileBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} endpoint_failure_recorded=${result.peer_endpoint_failure_recorded} refresh=${result.peer_endpoint_refresh_recommended} retry_after_refresh=${result.retry_recommended_after_endpoint_refresh} events=${result.event_summary.join("; ") || "none"} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network=${result.network_io_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    if (result.peer_endpoint_failure_recorded) {
      const status = await invoke("production_two_profile_session_status", {
        profileA: input.profileA,
        profileB: input.profileB,
        passphrase: input.passphrase,
      });
      rememberTwoProfileSessionStatus(input, status);
      renderRoomIdentityBar(input, twoProfileSessionsReadyForInput(input));
    }
  } catch (error) {
    setProductionTwoProfileState("Onion envelope send failed");
    setText(fields.productionTwoProfileWarning, `Onion envelope send failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before or during bounded onion send attempt.");
  } finally {
    productionBusyAction = null;
    if (fields.sendProductionTwoProfileLatestOnionEnvelope) {
      fields.sendProductionTwoProfileLatestOnionEnvelope.disabled = false;
    }
    applyProductionActionState();
  }
}

async function startProductionTwoProfileOnionReceive() {
  const { profileB, passphrase } = productionTwoProfileInput();
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!profileB || !passphrase) {
    setProductionTwoProfileState("Receive mode needs receiver");
    setText(fields.productionTwoProfileWarning, "Enter Profile B and passphrase before starting receive mode.");
    return;
  }
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Receive mode blocked");
    setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before receiving.");
    return;
  }
  if (productionTwoProfileOnionReceiveMode.enabled) {
    setProductionTwoProfileState("Receive mode already running");
    setText(
      fields.productionTwoProfileWarning,
      `Receive mode is already enabled for ${productionTwoProfileOnionReceiveMode.profile}. Stop it before starting again.`,
    );
    return;
  }

  let backendLoop = null;
  try {
    backendLoop = await invoke("production_onion_receive_loop_start", {
      profile: profileB,
      passphrase,
      manualNetworkPermission,
    });
  } catch (error) {
    setProductionTwoProfileState("Receive mode failed");
    setText(fields.productionTwoProfileWarning, `Receive mode start failed without returning secrets. ${error}`);
    return;
  }
  if (backendLoop.duplicate_loop_blocked || !backendLoop.enabled) {
    setProductionTwoProfileState("Receive mode already running");
    setText(
      fields.productionTwoProfileWarning,
      "Backend receive loop is already enabled for this runtime. Stop receiving before starting another loop.",
    );
    setText(
      fields.productionTwoProfileBoundary,
      productionTwoProfileOnionReceiveBackendBoundary(backendLoop),
    );
    return;
  }

  const generation = productionTwoProfileOnionReceiveMode.generation + 1;
  productionTwoProfileOnionReceiveMode = {
    enabled: true,
    profile: profileB,
    passphrase: "",
    timer: null,
    attempt: 0,
    inFlight: false,
    stopRequested: false,
    runtimeState: "receiving",
    runtimeLabel: "Receive mode receiving",
    lastProcessedImportSequence: 0,
    lastProcessedMessageImportCount: 0,
    lastProcessedEndpointUpdateCount: 0,
    generation,
  };
  setProductionTwoProfileOnionReceiveRuntimeState("receiving");
  setText(fields.productionTwoProfileWarning, `Receive mode enabled for ${profileB}. Bounded receive attempts will repeat until stopped.`);
  setText(fields.productionTwoProfileProfiles, `receiver=${profileB}`);
  setText(fields.productionTwoProfileSession, "Using retained onion service and stored receiver session");
  setText(fields.productionTwoProfileMessageState, `Receive mode waiting for backend bounded attempts; backend_attempts=${backendLoop.attempt_count}`);
  setText(
    fields.productionTwoProfileBoundary,
    productionTwoProfileOnionReceiveBackendBoundary(backendLoop),
  );
  applyProductionActionState();
  scheduleProductionTwoProfileOnionReceiveStatusPoll(1_000);
}

function clearProductionTwoProfileOnionReceiveTimer() {
  if (productionTwoProfileOnionReceiveMode.timer) {
    clearTimeout(productionTwoProfileOnionReceiveMode.timer);
  }
  productionTwoProfileOnionReceiveMode.timer = null;
}

function setProductionTwoProfileOnionReceiveRuntimeState(runtimeState, result = null) {
  productionTwoProfileOnionReceiveMode.runtimeState = runtimeState;
  productionTwoProfileOnionReceiveMode.runtimeLabel = result?.runtime_label || "";
  const view = productionOnionReceiveRuntimeView(productionTwoProfileOnionReceiveMode, result);
  setProductionTwoProfileState(view.label);
  return view;
}

function productionTwoProfileOnionReceiveBackendBoundary(backendLoop) {
  return `backend_enabled=${backendLoop.enabled} worker=${backendLoop.worker_running} stop_requested=${backendLoop.stop_requested} stop_confirmed=${backendLoop.stop_confirmed} profile_selected=${backendLoop.profile_selected} in_flight=${backendLoop.receive_attempt_in_flight} attempts=${backendLoop.attempt_count} generation=${backendLoop.generation} import_seq=${backendLoop.import_sequence} message_imports=${backendLoop.message_import_count ?? 0} endpoint_updates=${backendLoop.endpoint_update_count ?? 0} runtime_state=${backendLoop.runtime_state || "unknown"} last_started=${backendLoop.last_attempt_started} last_succeeded=${backendLoop.last_attempt_succeeded} endpoint_update=${backendLoop.last_endpoint_update_applied} failure=${backendLoop.last_failure_kind} retryable=${backendLoop.last_failure_retryable} next=${backendLoop.last_next_blocker || "none"} explicit_start=${backendLoop.explicit_user_start_required} duplicate=${backendLoop.duplicate_loop_blocked} app_launch_network=${backendLoop.starts_network_on_app_launch} raw_profile=${backendLoop.raw_profile_returned} passphrase=${backendLoop.passphrase_retained} key_material=${backendLoop.key_material_exposed} network=${backendLoop.network_io_attempted} transport=${backendLoop.transport_io_opened} runtime=${backendLoop.runtime_messaging_enabled}`;
}

function scheduleProductionTwoProfileOnionReceiveStatusPoll(delayMs = TWO_PROFILE_ONION_RECEIVE_RETRY_MS) {
  if (
    !productionTwoProfileOnionReceiveMode.enabled ||
    productionTwoProfileOnionReceiveMode.stopRequested
  ) {
    return;
  }
  clearProductionTwoProfileOnionReceiveTimer();
  productionTwoProfileOnionReceiveMode.timer = setTimeout(() => {
    productionTwoProfileOnionReceiveMode.timer = null;
    pollProductionTwoProfileOnionReceiveLoopStatus();
  }, delayMs);
}

async function pollProductionTwoProfileOnionReceiveLoopStatus() {
  if (!productionTwoProfileOnionReceiveMode.enabled || productionTwoProfileOnionReceiveMode.stopRequested) {
    return;
  }
  try {
    const backendLoop = await invoke("production_onion_receive_loop_status");
    productionTwoProfileOnionReceiveMode.attempt = backendLoop.attempt_count;
    productionTwoProfileOnionReceiveMode.inFlight =
      backendLoop.worker_running || backendLoop.receive_attempt_in_flight;
    const refreshPlan = productionOnionReceiveLoopRefreshPlan(productionTwoProfileOnionReceiveMode, backendLoop);
    const inferredRuntimeState = refreshPlan.transcriptChanged
      ? "message-imported"
      : backendLoop.receive_attempt_in_flight
        ? "peer-connected"
        : backendLoop.worker_running
          ? "receiving"
          : backendLoop.enabled
            ? "failed-retryable"
            : "stopped";
    const runtimeState = refreshPlan.transcriptChanged
      ? "message-imported"
      : backendLoop.runtime_state || inferredRuntimeState;
    const runtimeView = setProductionTwoProfileOnionReceiveRuntimeState(
      runtimeState,
      refreshPlan.transcriptChanged
        ? { runtime_label: "Receive mode imported message or endpoint update" }
        : backendLoop,
    );
    setText(
      fields.productionTwoProfileMessageState,
      `state=${runtimeView.state} backend_state=${backendLoop.runtime_state || "unknown"} backend_attempts=${backendLoop.attempt_count} import_seq=${backendLoop.import_sequence} message_imports=${backendLoop.message_import_count ?? 0} endpoint_updates=${backendLoop.endpoint_update_count ?? 0} failure=${backendLoop.last_failure_kind} retryable=${backendLoop.last_failure_retryable} last_started=${backendLoop.last_attempt_started} last_succeeded=${backendLoop.last_attempt_succeeded} endpoint_update=${backendLoop.last_endpoint_update_applied} next=${backendLoop.last_next_blocker || "none"}`,
    );
    if (runtimeState === "failed-retryable") {
      setText(fields.productionTwoProfileWarning, productionOnionReceiveFailureMessage(backendLoop));
    } else if (runtimeState === "receiving") {
      setText(fields.productionTwoProfileWarning, "Receive mode is active. Backend worker is polling bounded onion receive attempts.");
    }
    setText(fields.productionTwoProfileBoundary, productionTwoProfileOnionReceiveBackendBoundary(backendLoop));
    if (refreshPlan.transcriptChanged) {
      productionTwoProfileOnionReceiveMode.lastProcessedImportSequence = refreshPlan.importSequence;
      productionTwoProfileOnionReceiveMode.lastProcessedMessageImportCount = refreshPlan.messageImportCount;
      productionTwoProfileOnionReceiveMode.lastProcessedEndpointUpdateCount = refreshPlan.endpointUpdateCount;
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
      if (refreshPlan.messageImported) {
        selectLatestReceivedReplyForProfile(productionTwoProfileOnionReceiveMode.profile, { focusReply: "none" });
      }
      if (refreshPlan.endpointUpdated) {
        const input = productionTwoProfileInput();
        if (input.profileA && input.profileB && input.profileA !== input.profileB && input.passphrase) {
          const status = await invoke("production_two_profile_session_status", {
            profileA: input.profileA,
            profileB: input.profileB,
            passphrase: input.passphrase,
          });
          rememberTwoProfileSessionStatus(input, status);
          renderProductionTwoProfileSessionStatusResult(status);
          renderRoomIdentityBar(input, twoProfileSessionsReadyForInput(input));
        }
      }
    }
    if (backendLoop.enabled && !productionTwoProfileOnionReceiveMode.stopRequested) {
      scheduleProductionTwoProfileOnionReceiveStatusPoll();
    }
  } catch (error) {
    setProductionTwoProfileState("Receive mode failed");
    productionTwoProfileOnionReceiveMode.runtimeState = "failed-retryable";
    setText(fields.productionTwoProfileWarning, `Receive loop status failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Backend receive loop status failed.");
    scheduleProductionTwoProfileOnionReceiveStatusPoll();
  } finally {
    applyProductionActionState();
  }
}

function scheduleProductionTwoProfileOnionReceiveStopConfirmation(delayMs = 500) {
  clearProductionTwoProfileOnionReceiveTimer();
  productionTwoProfileOnionReceiveMode.timer = setTimeout(() => {
    productionTwoProfileOnionReceiveMode.timer = null;
    pollProductionTwoProfileOnionReceiveStopConfirmation();
  }, delayMs);
}

async function pollProductionTwoProfileOnionReceiveStopConfirmation() {
  try {
    const backendLoop = await invoke("production_onion_receive_loop_status");
    setText(fields.productionTwoProfileBoundary, productionTwoProfileOnionReceiveBackendBoundary(backendLoop));
    setText(
      fields.productionTwoProfileMessageState,
      backendLoop.stop_confirmed
        ? "Receive mode stopped; backend worker exit confirmed"
        : `Receive mode stopping; worker=${backendLoop.worker_running} in_flight=${backendLoop.receive_attempt_in_flight}`,
    );
    if (!backendLoop.stop_confirmed) {
      scheduleProductionTwoProfileOnionReceiveStopConfirmation();
    }
  } catch (error) {
    setText(fields.productionTwoProfileBoundary, `Backend receive loop stop confirmation failed without returning secrets. ${error}`);
  } finally {
    applyProductionActionState();
  }
}

function stopProductionTwoProfileOnionReceive() {
  const profile = productionTwoProfileOnionReceiveMode.profile;
  clearProductionTwoProfileOnionReceiveTimer();
  productionTwoProfileOnionReceiveMode.stopRequested = true;
  const generation = productionTwoProfileOnionReceiveMode.generation + 1;
  productionTwoProfileOnionReceiveMode = {
    enabled: false,
    profile: "",
    passphrase: "",
    timer: null,
    attempt: 0,
    inFlight: false,
    stopRequested: false,
    runtimeState: "stopped",
    runtimeLabel: "Receive mode stopped",
    lastProcessedImportSequence: productionTwoProfileOnionReceiveMode.lastProcessedImportSequence,
    lastProcessedMessageImportCount: productionTwoProfileOnionReceiveMode.lastProcessedMessageImportCount,
    lastProcessedEndpointUpdateCount: productionTwoProfileOnionReceiveMode.lastProcessedEndpointUpdateCount,
    generation,
  };
  setProductionTwoProfileOnionReceiveRuntimeState("stopped");
  setText(
    fields.productionTwoProfileWarning,
    profile
      ? `Receive mode stopped for ${profile}. No further receive attempts will run until Start receiving is clicked again.`
      : "Receive mode is already stopped.",
  );
  setText(fields.productionTwoProfileMessageState, "Receive mode stopped");
  applyProductionActionState();
  invoke("production_onion_receive_loop_stop")
    .then((backendLoop) => {
      setText(
        fields.productionTwoProfileBoundary,
        productionTwoProfileOnionReceiveBackendBoundary(backendLoop),
      );
      if (!backendLoop.stop_confirmed) {
        scheduleProductionTwoProfileOnionReceiveStopConfirmation();
      } else {
        setText(fields.productionTwoProfileMessageState, "Receive mode stopped; backend worker exit confirmed");
      }
    })
    .catch((error) => {
      setText(fields.productionTwoProfileBoundary, `Backend receive loop stop failed without returning secrets. ${error}`);
    });
}

async function runProductionTwoProfileRoundtrip() {
  const { profileA, profileB, passphrase, message, messageTtlSeconds } = productionTwoProfileInput();
  let postBusyFocus = null;
  if (!messageRetentionPolicyReady()) {
    setProductionTwoProfileState("Two-profile roundtrip blocked");
    setText(fields.productionTwoProfileWarning, messageRetentionPolicyBlocker());
    applyProductionActionState();
    return;
  }
  if (!messageTtlSeconds) {
    setProductionTwoProfileState("Two-profile roundtrip blocked");
    setText(fields.productionTwoProfileWarning, messageTtlInputBlocker());
    applyProductionActionState();
    return;
  }
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
      messageTtlSeconds,
    });
    let retentionPreferenceWarning = null;
    try {
      await saveProductionMessageRetentionPreference(profileA, passphrase, messageTtlSeconds);
    } catch (error) {
      retentionPreferenceWarning = `Roundtrip completed, but retention preference was not saved: ${String(error)}`;
    }
    setProductionTwoProfileState("Two-profile roundtrip completed");
    const sentInput = { profileA, profileB };
    const view = renderProductionTwoProfileResult(result);
    if (view.canContinue) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
      postBusyFocus = selectReplyAfterSentMessageResult(result, sentInput, message, "First message")
        ? "reply-composer"
        : null;
    } else {
      setText(fields.productionTwoProfileWarning, result.warning);
    }
    if (retentionPreferenceWarning) {
      setText(fields.productionTwoProfileWarning, retentionPreferenceWarning);
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
    focusAfterProductionBusyAction(postBusyFocus);
  }
}

async function runProductionTwoProfileMessageRoundtrip() {
  const { profileA, profileB, passphrase, message, messageTtlSeconds } = productionTwoProfileInput();
  let postBusyFocus = null;
  if (!messageRetentionPolicyReady()) {
    setProductionTwoProfileState("Stored-session message blocked");
    setText(fields.productionTwoProfileWarning, messageRetentionPolicyBlocker());
    applyProductionActionState();
    return;
  }
  if (!messageTtlSeconds) {
    setProductionTwoProfileState("Stored-session message blocked");
    setText(fields.productionTwoProfileWarning, messageTtlInputBlocker());
    applyProductionActionState();
    return;
  }
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
    await saveProductionMessageRetentionPreference(profileA, passphrase, messageTtlSeconds);
    const result = await invoke("production_two_profile_message_roundtrip", {
      profileA,
      profileB,
      passphrase,
      message,
      messageTtlSeconds,
    });
    setProductionTwoProfileState("Stored-session message completed");
    setText(fields.productionTwoProfileWarning, result.warning);
    const sentInput = { profileA, profileB };
    const view = renderProductionTwoProfileMessageResult(result);
    await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
    if (view.canContinue) {
      postBusyFocus = selectReplyAfterSentMessageResult(result, sentInput, message, "Stored-session message")
        ? "reply-composer"
        : null;
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
    focusAfterProductionBusyAction(postBusyFocus);
  }
}

async function runProductionTwoProfileRealOnionRoundtrip() {
  const { profileA, profileB, passphrase, message, messageTtlSeconds } = productionTwoProfileInput();
  const manualNetworkPermission = fields.manualOnionNetworkPermission?.checked === true;
  if (!profileA || !profileB || profileA === profileB || !passphrase || !message || !messageTtlSeconds) {
    setProductionTwoProfileState("Real onion roundtrip needs input");
    setText(fields.productionTwoProfileWarning, "Enter two distinct profiles, passphrase, retention, and message.");
    return;
  }
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Real onion roundtrip blocked");
    setText(fields.productionTwoProfileWarning, "Enable manual onion network permission before running real onion roundtrip.");
    return;
  }

  setProductionTwoProfileState("Real onion roundtrip running");
  setText(fields.productionTwoProfileWarning, "Launching two explicit onion runtimes and sending one encrypted message.");
  setText(fields.productionTwoProfileProfiles, "Preparing encrypted profile stores and onion endpoints");
  setText(fields.productionTwoProfileSession, "Pairing with real onion endpoints");
  setText(fields.productionTwoProfileMessageState, "Waiting for onion send and receive");
  setText(fields.productionTwoProfileBoundary, "Network roundtrip in progress");
  setProductionFollowupActions(false, "Real onion roundtrip running. Follow-up actions are locked.");
  productionBusyAction = "two-profile-real-onion-roundtrip";
  applyProductionActionState();
  if (fields.runProductionTwoProfileRealOnionRoundtrip) {
    fields.runProductionTwoProfileRealOnionRoundtrip.disabled = true;
  }
  try {
    const result = await invoke("production_two_profile_real_onion_roundtrip", {
      profileA,
      profileB,
      passphrase,
      message,
      messageTtlSeconds,
      manualNetworkPermission,
    });
    setProductionTwoProfileState(
      result.received_export_matches_input ? "Real onion roundtrip completed" : "Real onion roundtrip needs review",
    );
    setText(fields.productionTwoProfileWarning, result.warning);
    setText(
      fields.productionTwoProfileProfiles,
      `a_unlock=${result.profile_a_unlocked} b_unlock=${result.profile_b_unlocked} a_client=${result.profile_a_client_bootstrapped} b_client=${result.profile_b_client_bootstrapped} a_service=${result.profile_a_onion_service_launched} b_service=${result.profile_b_onion_service_launched} a_endpoint=${result.profile_a_endpoint_ready} b_endpoint=${result.profile_b_endpoint_ready}`,
    );
    setText(
      fields.productionTwoProfileSession,
      `pairing=${result.pairing_payloads_exported} drafts=${result.session_drafts_saved} handshake=${result.handshake_completed} sender=${result.sender_session_ready} receiver=${result.receiver_session_ready}`,
    );
    setText(
      fields.productionTwoProfileMessageState,
      `reserved=${result.message_number_reserved} envelope=${result.encrypted_envelope_exported} send=${result.send_attempt_succeeded} receive=${result.receive_attempt_succeeded} inbound=${result.inbound_message_stored} status=${result.received_status_verified} match=${result.received_export_matches_input}`,
    );
    setText(
      fields.productionTwoProfileBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} events=${result.event_summary.join("; ") || "none"} endpoint_returned=${result.local_endpoint_returned || result.peer_endpoint_returned} envelope_payload=${result.envelope_payload_returned} plaintext=${result.plaintext_returned_to_frontend} path=${result.store_path_returned} passphrase=${result.passphrase_retained} key_material=${result.key_material_exposed} network=${result.network_io_attempted} transport=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    if (result.received_export_matches_input) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
    }
  } catch (error) {
    setProductionTwoProfileState("Real onion roundtrip failed");
    const detail = String(error ?? "");
    const redactedStage = detail.includes("redacted stage:")
      ? detail.split("redacted stage:").slice(1).join("redacted stage:").trim()
      : "";
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("real-onion-roundtrip", error));
    setText(
      fields.productionTwoProfileProfiles,
      redactedStage.includes("bootstrap")
        ? "Profile stores opened before Tor bootstrap completed"
        : "Real onion profile setup failed",
    );
    setText(
      fields.productionTwoProfileSession,
      redactedStage.includes("bootstrap")
        ? "Session setup blocked until local onion endpoint exists"
        : "Real onion session setup failed",
    );
    setText(fields.productionTwoProfileMessageState, "Real onion message not delivered");
    setText(
      fields.productionTwoProfileBoundary,
      redactedStage || "Failed without returning endpoint, payload, path, or key details",
    );
  } finally {
    productionBusyAction = null;
    if (fields.runProductionTwoProfileRealOnionRoundtrip) {
      fields.runProductionTwoProfileRealOnionRoundtrip.disabled = false;
    }
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
    messageRetentionPolicyReady(),
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
    await loadProductionMessageRetentionPreference(profile, passphrase, { quiet: true });
    await loadProductionProfileList();
    await restoreProductionSessionAfterUnlock(profile, passphrase);
    await refreshTwoProfileSessionAfterProfileUnlock(profile, passphrase);
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

async function refreshTwoProfileSessionAfterProfileUnlock(profile, passphrase) {
  const unlockedProfile = String(profile ?? "").trim().toLowerCase();
  const input = productionTwoProfileInput();
  if (
    !unlockedProfile ||
    !passphrase ||
    !input.profileA ||
    !input.profileB ||
    input.profileA === input.profileB ||
    !input.passphrase ||
    (input.profileA !== unlockedProfile && input.profileB !== unlockedProfile)
  ) {
    return false;
  }

  try {
    const result = await invoke("production_two_profile_session_status", {
      profileA: input.profileA,
      profileB: input.profileB,
      passphrase: input.passphrase,
    });
    rememberTwoProfileSessionStatus(input, result);
    renderProductionTwoProfileSessionStatusResult(result);
    if (result.both_ready_for_message_envelope) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
      const currentInput = productionTwoProfileInput();
      setProductionTwoProfileState("Sessions recovered after profile unlock");
      setText(
        fields.productionTwoProfileWarning,
        currentInput.message
          ? `Stored sessions recovered for ${currentInput.profileA} -> ${currentInput.profileB}. Run stored-session message.`
          : `Stored sessions recovered for ${currentInput.profileA} -> ${currentInput.profileB}. Write a message to continue.`,
      );
      return true;
    }
    setProductionTwoProfileState("Sessions incomplete after profile unlock");
    setText(fields.productionTwoProfileWarning, twoProfileSessionRebuildMessage(input));
    setProductionFollowupActions(true, `Next: ${twoProfileSessionRebuildMessage(input)}`);
    return false;
  } catch {
    return false;
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
    setText(fields.productionMessageWarning, transcriptRetentionWarning(transcript));
    setText(fields.productionMessageBoundary, transcriptBoundarySummary(transcript));
  } catch {
    setProductionMessageState("Transcript recovery unavailable");
    setText(
      fields.productionMessageWarning,
      "Stored session recovered. Transcript can be loaded after message records exist.",
    );
  }
}

async function applyProductionPairingPayloadExportResult(result, stateLabel = "Pairing payload exported") {
  const view = productionPairingPayloadView(result);
  setProductionPairingState(stateLabel);
  setText(fields.productionPairingWarning, result.warning);
  if (fields.productionPairingPayload) {
    fields.productionPairingPayload.value = result.pairing_payload;
  }
  resetProductionPairingSafety("Safety check required after pairing export.");
  await renderProductionPairingQr(result.pairing_payload);
  applyProductionActionState();
  setText(fields.productionPairingStorage, view.storage);
  setText(fields.productionPairingBoundary, view.boundary);
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
    await applyProductionPairingPayloadExportResult(result);
  } catch (error) {
    setProductionPairingState("Pairing payload export failed");
    setText(fields.productionPairingWarning, String(error));
    if (fields.productionPairingPayload) {
      fields.productionPairingPayload.value = "";
    }
    clearProductionPairingQr("QR unavailable because pairing export failed.");
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
  const { profile, passphrase, localPayload, remotePayload, safetyConfirmed } = productionPairingInput();
  if (!profile || !passphrase || !localPayload || !remotePayload) {
    setProductionPairingState("Session draft needs payloads");
    setText(fields.productionPairingWarning, "Export local payload and paste a remote payload.");
    return;
  }
  if (!currentPairingSafetyVerified()) {
    setProductionPairingState("Session draft needs safety check");
    setText(fields.productionPairingWarning, "Check the safety number and mark it verified before saving the draft.");
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
      safetyConfirmed,
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

function useRemotePairingQrText() {
  const payload = (fields.productionRemotePairingQrPayload?.value ?? "").trim();
  if (!payload) {
    setProductionPairingState("Remote QR text needs payload");
    setText(fields.productionPairingWarning, "Paste scanned ADPAIR2 text before using it as the remote payload.");
    return;
  }
  if (!payload.startsWith("ADPAIR2|")) {
    setProductionPairingState("Remote QR text blocked");
    setText(fields.productionPairingWarning, "Remote QR text must be a single ADPAIR2 pairing payload.");
    return;
  }
  if (fields.productionRemotePairingPayload) {
    fields.productionRemotePairingPayload.value = payload;
  }
  resetProductionPairingSafety("Safety check required after remote QR text update.");
  setProductionPairingState("Remote QR text applied");
  setText(
    fields.productionPairingWarning,
    "Scanned QR text copied into remote payload. Save draft still verifies the payload before storing anything.",
  );
  applyProductionActionState();
}

function applyProductionPairingSafetyPreviewResult(result, localPayload, remotePayload) {
  latestProductionPairingSafety = {
    fingerprint: pairingSafetyFingerprint({ localPayload, remotePayload }),
    safetyNumber: result.safety_number,
    safetyPhrase: result.safety_phrase,
  };
  setProductionPairingState("Safety check ready");
  setText(fields.productionPairingWarning, result.warning);
  setText(fields.productionPairingSafetyNumber, result.safety_number);
  setText(fields.productionPairingSafetyPhrase, result.safety_phrase);
  setText(
    fields.productionPairingSafetyBoundary,
    `verified=${result.safety_confirmed} payloads=${result.payloads_decodable} transcript_bound=${result.safety_transcript_bound} payloads_returned=${result.payloads_returned} transcript_returned=${result.safety_transcript_returned} path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  );
}

async function checkProductionPairingSafety() {
  const input = productionPairingInput();
  if (!input.localPayload || !input.remotePayload) {
    setProductionPairingState("Safety check needs payloads");
    setText(fields.productionPairingWarning, "Export local payload and paste or load a remote payload first.");
    resetProductionPairingSafety("Not checked yet");
    return;
  }

  setProductionPairingState("Safety check running");
  setText(fields.productionPairingWarning, "Calculating safety number for the local and remote pairing payloads.");
  if (fields.checkProductionPairingSafety) {
    fields.checkProductionPairingSafety.disabled = true;
  }
  resetProductionPairingSafety("Checking");
  try {
    const result = await invoke("production_pairing_safety_preview", {
      localPayload: input.localPayload,
      remotePayload: input.remotePayload,
    });
    applyProductionPairingSafetyPreviewResult(result, input.localPayload, input.remotePayload);
  } catch (error) {
    setProductionPairingState("Safety check failed");
    setText(fields.productionPairingWarning, String(error));
    resetProductionPairingSafety("Failed");
  } finally {
    if (fields.checkProductionPairingSafety) {
      fields.checkProductionPairingSafety.disabled = false;
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
    rememberTwoProfileSessionStatus({ profileA, profileB }, result);
    renderProductionTwoProfileSessionStatusResult(result);
    setText(fields.productionPairingWarning, result.warning);
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
      setText(fields.productionTwoProfileWarning, twoProfileSessionRebuildMessage(currentInput));
      setProductionFollowupActions(true, `Next: ${twoProfileSessionRebuildMessage(currentInput)}`);
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
  rememberTwoProfileSessionStatus(input, result);
  renderProductionTwoProfileSessionStatusResult(result);
  setText(fields.productionPairingWarning, result.warning);
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
    if (fields.productionTwoProfileTranscriptExport) {
      fields.productionTwoProfileTranscriptExport.value = combinedTwoProfileTranscriptTsv(
        profileA,
        profileAResult,
        profileB,
        profileBResult,
      );
    }
    const expiredMessagesPurged =
      Number.parseInt(profileAResult.expired_messages_purged ?? 0, 10) +
      Number.parseInt(profileBResult.expired_messages_purged ?? 0, 10);
    const staleMessageEnvelopeSlotsPruned = renderProductionTwoProfileTranscriptEntries(entries);
    const resumeWarning = appendStaleMessageEnvelopeSlotsPruned(
      appendExpiredMessagesPurged(
        "Stored conversation and message-ready sessions recovered after local unlock.",
        expiredMessagesPurged,
      ),
      staleMessageEnvelopeSlotsPruned,
    );
    const loadedWarning = appendStaleMessageEnvelopeSlotsPruned(
      appendExpiredMessagesPurged(
        "Stored conversation loaded, but sessions are not ready for stored-message send.",
        expiredMessagesPurged,
      ),
      staleMessageEnvelopeSlotsPruned,
    );
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
      const resumeTarget = ready ? autoSelectTwoProfileResumeTarget(sessionStatus) : null;
      setText(
        fields.productionTwoProfileWarning,
        ready && resumeTarget === "reply-latest"
          ? appendExpiredMessagesPurged(
              appendStaleMessageEnvelopeSlotsPruned(
                "Stored conversation recovered. Latest delivered message is selected as the reply target.",
                staleMessageEnvelopeSlotsPruned,
              ),
              expiredMessagesPurged,
            )
          : ready
            ? resumeWarning
            : loadedWarning,
      );
      if (ready && resumeTarget !== "pending-review") {
        renderProductionTwoProfileMemory();
      }
      if (!ready) {
        autoSelectPendingTwoProfileConversation();
      }
    } else if (autoResume && sessionStatus?.both_ready_for_message_envelope) {
      setProductionTwoProfileState("Conversation resumed");
      const resumeTarget = autoSelectTwoProfileResumeTarget(sessionStatus);
      if (resumeTarget === "reply-latest") {
        setText(
          fields.productionTwoProfileWarning,
          appendExpiredMessagesPurged(
            appendStaleMessageEnvelopeSlotsPruned(
              "Stored conversation and message-ready sessions recovered after local unlock. Latest delivered message is selected for reply.",
              staleMessageEnvelopeSlotsPruned,
            ),
            expiredMessagesPurged,
          ),
        );
      } else if (resumeTarget === "pending-review") {
        setText(
          fields.productionTwoProfileWarning,
          resumeWarning,
        );
      } else {
        setText(
          fields.productionTwoProfileWarning,
          appendExpiredMessagesPurged(
            appendStaleMessageEnvelopeSlotsPruned(
              "Stored conversation and message-ready sessions recovered after local unlock. Write a message to continue.",
              staleMessageEnvelopeSlotsPruned,
            ),
            expiredMessagesPurged,
          ),
        );
      }
    } else if (autoResume) {
      setProductionTwoProfileState("Resume needs session check");
      setText(
        fields.productionTwoProfileWarning,
        "Stored conversation was found, but message-ready sessions were not confirmed. Check sessions or run full setup.",
      );
    }
  } catch (error) {
    if (!quiet) {
      setProductionTwoProfileState("Conversation load failed");
      setText(fields.productionTwoProfileWarning, String(error));
    } else if (autoResume) {
      latestProductionTwoProfileSessionStatus = null;
      setProductionTwoProfileState("Resume needs review");
      setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("session-status", error));
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
  if (
    selectReplyAfterDeliveredReview(selectedEntry, {
      importProfile: importedProfile,
      deferReplyUntilReceivedReview: true,
      focusReply: false,
    })
  ) {
    return { conversationReloaded: true, replySelected: true };
  }
  setText(
    fields.productionTwoProfileWarning,
    `Manual import for ${importedProfile} completed; conversation transcript was reloaded from encrypted local stores.`,
  );
  renderProductionTwoProfileMemory(input);
  return { conversationReloaded: true, replySelected: false };
}

function syncTwoProfileConversationAfterManualExport(
  profile,
  messageNumber,
  message,
  messageTtlSeconds,
  envelopePayload,
) {
  const exportedProfile = String(profile ?? "").trim().toLowerCase();
  const selectedEntry = selectedTwoProfileConversationEntry();
  const selectedNumber = Number.parseInt(selectedEntry?.messageNumber, 10);
  const exportedNumber = Number.parseInt(messageNumber, 10);
  const text = String(message ?? "").trim();
  const envelope = String(envelopePayload ?? "").trim();
  if (exportedProfile && envelope) {
    storeMessageEnvelopeSlot(exportedProfile, envelope, {
      receiver: selectedEntry?.receiver,
      messageNumber: exportedNumber,
      message: text,
    });
    renderProductionTwoProfileConversationList();
  }
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
    { ttlSeconds: messageTtlSeconds },
  );
  setProductionTwoProfileState("Conversation updated after export");
  const refreshedEntry = selectedTwoProfileConversationEntry();
  if (!selectReplyAfterDeliveredReview(refreshedEntry)) {
    if (
      refreshedEntry &&
      refreshedEntry.statuses?.has("sent") &&
      !refreshedEntry.statuses?.has("received") &&
      envelope &&
      selectProductionProfileForManualRelay(refreshedEntry.receiver)
    ) {
      if (fields.productionRemoteMessageEnvelope) {
        fields.productionRemoteMessageEnvelope.value = envelope;
        fields.productionRemoteMessageEnvelope.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (fields.productionMessageEnvelope) {
        fields.productionMessageEnvelope.value = "";
      }
      setProductionMessageState("Manual import ready");
      setText(
        fields.productionMessageWarning,
        `Manual export for ${exportedProfile} completed. Selected ${refreshedEntry.receiver} and loaded the sender envelope for explicit import.`,
      );
      setText(
        fields.productionTwoProfileWarning,
        `Manual export for ${exportedProfile} completed; import is ready for ${refreshedEntry.receiver}.`,
      );
      applyProductionActionState();
      return { conversationUpdated: true, peerImportReady: true };
    }
    setText(
      fields.productionTwoProfileWarning,
      `Manual export for ${exportedProfile} completed; sender envelope slot is stored for explicit peer import.`,
    );
    applyProductionActionState();
  }
  return { conversationUpdated: true, peerImportReady: false };
}

function syncTwoProfileConversationAfterReceivedExport(profile, messageNumber, message) {
  const receivedProfile = String(profile ?? "").trim().toLowerCase();
  const counterpart = productionCounterpartProfile(receivedProfile);
  const normalizedNumber = Number.parseInt(messageNumber, 10);
  const text = String(message ?? "").trim();
  if (!receivedProfile || !counterpart || !Number.isInteger(normalizedNumber) || normalizedNumber < 1 || !text) {
    return false;
  }

  appendProductionTwoProfileConversationStatus(
    "received",
    receivedProfile,
    counterpart,
    normalizedNumber,
    text,
  );
  const refreshedEntry = selectedTwoProfileConversationEntry();
  if (twoProfileConversationReplyable(refreshedEntry)) {
    return selectReplyAfterDeliveredReview(refreshedEntry, {
      importProfile: receivedProfile,
      receivedReviewComplete: true,
    });
  }
  return true;
}

function selectLatestReceivedReplyForProfile(profile, options = {}) {
  const receivedProfile = String(profile ?? "").trim().toLowerCase();
  if (!receivedProfile) {
    return false;
  }
  const target = [...productionTwoProfileConversationEntries.values()]
    .filter((entry) => entry.receiver === receivedProfile && entry.statuses?.has("received"))
    .sort((left, right) => productionTwoProfileConversationCompare(left, right, "desc"))[0];
  if (!target) {
    return false;
  }
  return selectReplyAfterDeliveredReview(target, {
    importProfile: receivedProfile,
    receivedReviewComplete: true,
    focusReply: options.focusReply ?? "none",
  });
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
    createdAtMs: entry.created_at_ms,
    ttlSeconds: entry.ttl_seconds,
    expiresAtMs: entry.expires_at_ms,
    expired: entry.expired,
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
    const clearedFinishInput =
      Boolean(finishPayload) &&
      fields.productionRemoteHandshakeFinishPayload?.value.trim() === finishPayload;
    if (clearedFinishInput) {
      fields.productionRemoteHandshakeFinishPayload.value = "";
    }
    setProductionPairingState("Handshake finish imported");
    setText(
      fields.productionPairingWarning,
      `${result.warning}${clearedFinishInput ? " Cleared imported remote finish input." : ""}`,
    );
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
  const input = productionMessageInput();
  const { profile, passphrase, autoMessageNumber, messageNumber, message, messageTtlSeconds } = input;
  let postBusyFocus = null;
  const selectedBlocker = selectedManualMessageActionBlocker("export", input);
  if (selectedBlocker) {
    setProductionMessageState("Message export blocked");
    setText(fields.productionMessageWarning, selectedBlocker);
    applyProductionActionState();
    return;
  }
  if (!messageRetentionPolicyReady()) {
    setProductionMessageState("Message export blocked");
    setText(fields.productionMessageWarning, messageRetentionPolicyBlocker());
    applyProductionActionState();
    return;
  }
  if (!messageTtlSeconds) {
    setProductionMessageState("Message export blocked");
    setText(fields.productionMessageWarning, messageTtlInputBlocker());
    applyProductionActionState();
    return;
  }
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
    await saveProductionMessageRetentionPreference(profile, passphrase, messageTtlSeconds);
    const result = await invoke("production_message_envelope_export", {
      profile,
      passphrase,
      messageNumber: autoMessageNumber ? 0 : messageNumber,
      autoMessageNumber,
      message,
      messageTtlSeconds,
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
    appendProductionTranscriptEntry("sent", profile, result.selected_message_number, message, {
      ttlSeconds: result.message_ttl_seconds,
    });
    const conversationSync = syncTwoProfileConversationAfterManualExport(
      profile,
      result.selected_message_number,
      message,
      result.message_ttl_seconds,
      result.envelope_payload,
    );
    if (expiredOutboundMessagesPurged(result) > 0) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
      if (conversationSync?.conversationUpdated) {
        appendMessageLifecyclePurgeWarningToField(fields.productionTwoProfileWarning, result);
      }
    }
    appendMessageLifecyclePurgeWarningToField(fields.productionMessageWarning, result);
    postBusyFocus = conversationSync?.peerImportReady ? "current-action" : null;
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
    focusAfterProductionBusyAction(postBusyFocus);
  }
}

async function importProductionMessageEnvelope() {
  const input = productionMessageInput();
  const { profile, passphrase, messageNumber, envelopePayload, messageTtlSeconds } = input;
  let postBusyFocus = null;
  const selectedBlocker = selectedManualMessageActionBlocker("import", input);
  if (selectedBlocker) {
    setProductionMessageState("Message import blocked");
    setText(fields.productionMessageWarning, selectedBlocker);
    applyProductionActionState();
    return;
  }
  if (!messageRetentionPolicyReady()) {
    setProductionMessageState("Message import blocked");
    setText(fields.productionMessageWarning, messageRetentionPolicyBlocker());
    applyProductionActionState();
    return;
  }
  if (!messageTtlSeconds) {
    setProductionMessageState("Message import blocked");
    setText(fields.productionMessageWarning, messageTtlInputBlocker());
    applyProductionActionState();
    return;
  }
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
    await saveProductionMessageRetentionPreference(profile, passphrase, messageTtlSeconds);
    const result = await invoke("production_message_envelope_import", {
      profile,
      passphrase,
      messageNumber,
      envelopePayload,
      messageTtlSeconds,
    });
    const view = productionMessageEnvelopeImportView(result);
    latestProductionMessageImport = productionMessageImportFingerprint({ profile, messageNumber });
    const clearedEnvelopeSlot = clearImportedMessageEnvelopeSlot(profile, envelopePayload);
    const clearedEnvelopeInput = clearImportedRemoteMessageEnvelopeInput(envelopePayload);
    const clearedEnvelopeOutput = clearImportedLocalMessageEnvelopeOutput(envelopePayload);
    const importWarning = appendMessageLifecyclePurgeWarning(result.warning, result);
    setProductionMessageState("Message envelope imported");
    setText(
      fields.productionMessageWarning,
      `${importWarning}${
        clearedEnvelopeSlot ? " Consumed matching stored sender envelope slot." : ""
      }${clearedEnvelopeInput ? " Cleared imported remote envelope input." : ""}${
        clearedEnvelopeOutput ? " Cleared matching local envelope output." : ""
      } Click Show plaintext to verify the decrypted message.`,
    );
    setText(fields.productionMessageOutbound, "Not exported in this profile");
    setText(fields.productionMessageInbound, view.inbound);
    setText(fields.productionMessageBoundary, view.boundary);
    const conversationRefresh = await refreshTwoProfileConversationAfterManualImport(profile, passphrase);
    if (conversationRefresh?.replySelected) {
      postBusyFocus = "current-action";
      setText(
        fields.productionMessageWarning,
        `${importWarning}${
          clearedEnvelopeSlot ? " Consumed matching stored sender envelope slot." : ""
        }${clearedEnvelopeInput ? " Cleared imported remote envelope input." : ""}${
          clearedEnvelopeOutput ? " Cleared matching local envelope output." : ""
        } Reply target selected in the two-profile conversation. Show plaintext remains available for local plaintext review.`,
      );
    }
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
    focusAfterProductionBusyAction(postBusyFocus);
  }
}

async function exportProductionReceivedMessage() {
  const { profile, passphrase, messageNumber } = productionMessageInput();
  let postBusyFocus = null;
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
    const expiredReceivedPurged = result.expired_received_message_purged === true;
    setProductionMessageState(expiredReceivedPurged ? "Received message expired" : "Received message exported");
    setText(fields.productionMessageWarning, appendMessageLifecyclePurgeWarning(result.warning, result));
    if (expiredReceivedPurged) {
      if (fields.productionReceivedMessage) {
        fields.productionReceivedMessage.value = "";
      }
      completeProductionMessageImportReview();
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false });
      appendMessageLifecyclePurgeWarningToField(fields.productionTwoProfileWarning, result);
      setText(fields.productionMessageInbound, view.inbound);
      setText(fields.productionMessageBoundary, view.boundary);
      return;
    }
    if (fields.productionReceivedMessage) {
      fields.productionReceivedMessage.value = result.received_message;
    }
    completeProductionMessageImportReview();
    appendProductionTranscriptEntry("received", profile, messageNumber, result.received_message, {
      ttlSeconds: result.message_ttl_seconds,
      expiresAtMs: result.expires_at_ms,
      expired: result.expired,
    });
    const replySelected = syncTwoProfileConversationAfterReceivedExport(
      profile,
      messageNumber,
      result.received_message,
    );
    setText(fields.productionMessageInbound, view.inbound);
    setText(fields.productionMessageBoundary, view.boundary);
    if (replySelected) {
      postBusyFocus = "reply-composer";
      setText(
        fields.productionMessageWarning,
        `${result.warning} Received review is complete; write the reply in the two-profile composer.`,
      );
    }
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
    focusAfterProductionBusyAction(postBusyFocus);
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
    if (fields.productionMessageTranscriptExport) {
      fields.productionMessageTranscriptExport.value = result.transcript_tsv ?? "";
    }
    setProductionMessageState("Transcript loaded");
    setText(fields.productionMessageWarning, transcriptRetentionWarning(result));
    setText(fields.productionMessageBoundary, transcriptBoundarySummary(result));
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

if (fields.checkOnionPreflight) {
  fields.checkOnionPreflight.addEventListener("click", checkOnionPreflight);
}

if (fields.prepareOnionBackupExclusion) {
  fields.prepareOnionBackupExclusion.addEventListener("click", prepareOnionBackupExclusion);
}

if (fields.checkOnionClientPreflight) {
  fields.checkOnionClientPreflight.addEventListener("click", checkOnionClientPreflight);
}

if (fields.checkOnionClientAttemptGate) {
  fields.checkOnionClientAttemptGate.addEventListener("click", checkOnionClientAttemptGate);
}

if (fields.runOnionClientOnce) {
  fields.runOnionClientOnce.addEventListener("click", runOnionClientOnce);
}

if (fields.checkOnionPersistentClient) {
  fields.checkOnionPersistentClient.addEventListener("click", checkOnionPersistentClient);
}

if (fields.startOnionPersistentClient) {
  fields.startOnionPersistentClient.addEventListener("click", startOnionPersistentClient);
}

if (fields.prepareOnionKeyRecord) {
  fields.prepareOnionKeyRecord.addEventListener("click", prepareOnionKeyRecord);
}

if (fields.checkOnionLaunchPreflight) {
  fields.checkOnionLaunchPreflight.addEventListener("click", checkOnionLaunchPreflight);
}

if (fields.attemptOnionServiceLaunch) {
  fields.attemptOnionServiceLaunch.addEventListener("click", attemptOnionServiceLaunch);
}

if (fields.prepareOnionDescriptorPublication) {
  fields.prepareOnionDescriptorPublication.addEventListener("click", prepareOnionDescriptorPublication);
}

if (fields.attemptOnionDescriptorPublication) {
  fields.attemptOnionDescriptorPublication.addEventListener("click", attemptOnionDescriptorPublication);
}

if (fields.prepareOnionInboundStream) {
  fields.prepareOnionInboundStream.addEventListener("click", prepareOnionInboundStream);
}

if (fields.attemptOnionInboundEnvelopeReceive) {
  fields.attemptOnionInboundEnvelopeReceive.addEventListener("click", attemptOnionInboundEnvelopeReceive);
}

if (fields.prepareOnionOutboundStream) {
  fields.prepareOnionOutboundStream.addEventListener("click", prepareOnionOutboundStream);
}

if (fields.prepareOnionStreamCloseout) {
  fields.prepareOnionStreamCloseout.addEventListener("click", prepareOnionStreamCloseout);
}

if (fields.prepareOnionRemoteAuth) {
  fields.prepareOnionRemoteAuth.addEventListener("click", prepareOnionRemoteAuth);
}

if (fields.prepareOnionOutboundEnvelopeSend) {
  fields.prepareOnionOutboundEnvelopeSend.addEventListener("click", prepareOnionOutboundEnvelopeSend);
}

if (fields.attemptOnionOutboundEnvelopeSend) {
  fields.attemptOnionOutboundEnvelopeSend.addEventListener("click", attemptOnionOutboundEnvelopeSend);
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
  fields.productionMessageTtl,
  fields.productionMessageBody,
  fields.productionRemoteMessageEnvelope,
  fields.productionTwoProfileA,
  fields.productionTwoProfileB,
  fields.productionTwoProfileMessageTtl,
  fields.productionTwoProfileMessage,
  fields.manualOnionNetworkPermission,
]) {
  if (input) {
    input.addEventListener("input", () => {
      applyProductionActionState();
      scheduleTwoProfileAutoResume();
    });
    input.addEventListener("change", () => {
      applyProductionActionState();
      scheduleTwoProfileAutoResume();
    });
  }
}

for (const input of [fields.productionPairingPayload, fields.productionRemotePairingPayload]) {
  if (input) {
    input.addEventListener("input", () =>
      resetProductionPairingSafety("Safety check required after pairing payload update."),
    );
    input.addEventListener("change", () =>
      resetProductionPairingSafety("Safety check required after pairing payload update."),
    );
  }
}

for (const input of [
  fields.productionProfileName,
  fields.productionProfilePassphrase,
  fields.productionMessageAutoNumber,
  fields.productionMessageNumber,
  fields.productionMessageBody,
]) {
  if (input) {
    input.addEventListener("input", resetProductionMessageImportState);
    input.addEventListener("change", resetProductionMessageImportState);
  }
}

for (const remote of manualRemotePayloadFields) {
  const input = remote.field();
  if (input) {
    input.addEventListener("input", (event) => {
      if (event.isTrusted) {
        delete input.dataset.remotePayloadSourceProfile;
        delete input.dataset.remotePayloadKind;
      }
    });
    input.addEventListener("change", (event) => {
      if (event.isTrusted) {
        delete input.dataset.remotePayloadSourceProfile;
        delete input.dataset.remotePayloadKind;
      }
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

if (fields.productionProfileName) {
  fields.productionProfileName.addEventListener("input", () => {
    clearStaleManualRemotePayloadInputs();
  });
  fields.productionProfileName.addEventListener("change", () => {
    clearStaleManualRemotePayloadInputs();
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
    {
      moveLocalPayload(
      fields.productionPairingPayload,
      fields.productionRemotePairingPayload,
      "Pairing payload",
      );
      resetProductionPairingSafety("Safety check required after remote payload update.");
    },
  );
}

if (fields.storeProductionPairingPayload) {
  fields.storeProductionPairingPayload.addEventListener("click", () =>
    storeProductionPayloadSlot("pairing", fields.productionPairingPayload, "Pairing payload"),
  );
}

if (fields.loadProductionPairingPayload) {
  fields.loadProductionPairingPayload.addEventListener("click", () =>
    {
      loadProductionPayloadSlot("pairing", fields.productionRemotePairingPayload, "Pairing payload");
      resetProductionPairingSafety("Safety check required after remote payload update.");
    },
  );
}

if (fields.relayProductionPairingPayload) {
  fields.relayProductionPairingPayload.addEventListener("click", () =>
    {
      relayProductionPayloadSlotToPeer(
      "pairing",
      fields.productionPairingPayload,
      fields.productionRemotePairingPayload,
      "Pairing payload",
      );
      resetProductionPairingSafety("Safety check required after remote payload update.");
    },
  );
}

if (fields.useProductionRemotePairingQr) {
  fields.useProductionRemotePairingQr.addEventListener("click", useRemotePairingQrText);
}

if (fields.checkProductionPairingSafety) {
  fields.checkProductionPairingSafety.addEventListener("click", checkProductionPairingSafety);
}

if (fields.productionPairingSafetyVerified) {
  fields.productionPairingSafetyVerified.addEventListener("change", () => {
    if (fields.productionPairingSafetyVerified.checked && !latestProductionPairingSafety) {
      fields.productionPairingSafetyVerified.checked = false;
      setProductionPairingState("Safety check required");
      setText(fields.productionPairingWarning, "Check the safety number before marking it verified.");
    }
    setText(
      fields.productionPairingSafetyBoundary,
      currentPairingSafetyVerified()
        ? "verified=true payloads_returned=false transcript_returned=false network_io=false"
        : "verified=false network_io=false",
    );
    applyProductionActionState();
  });
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

if (fields.relayProductionHandshakeInit) {
  fields.relayProductionHandshakeInit.addEventListener("click", () =>
    relayProductionPayloadSlotToPeer(
      "handshakeInit",
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

if (fields.relayProductionHandshakeReply) {
  fields.relayProductionHandshakeReply.addEventListener("click", () =>
    relayProductionPayloadSlotToPeer(
      "handshakeReply",
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

if (fields.relayProductionHandshakeFinish) {
  fields.relayProductionHandshakeFinish.addEventListener("click", () =>
    relayProductionPayloadSlotToPeer(
      "handshakeFinish",
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

if (fields.startProductionTwoProfileOnionBootstrap) {
  fields.startProductionTwoProfileOnionBootstrap.addEventListener(
    "click",
    startProductionTwoProfileOnionBootstrap,
  );
}

if (fields.prepareProductionTwoProfileOnionKey) {
  fields.prepareProductionTwoProfileOnionKey.addEventListener(
    "click",
    prepareProductionTwoProfileOnionKey,
  );
}

if (fields.launchProductionTwoProfileOnionEndpoint) {
  fields.launchProductionTwoProfileOnionEndpoint.addEventListener(
    "click",
    launchProductionTwoProfileOnionEndpoint,
  );
}

if (fields.prepareProductionTwoProfileOnionPairing) {
  fields.prepareProductionTwoProfileOnionPairing.addEventListener(
    "click",
    prepareProductionTwoProfileOnionPairing,
  );
}

if (fields.saveProductionTwoProfileOnionSessions) {
  fields.saveProductionTwoProfileOnionSessions.addEventListener(
    "click",
    saveProductionTwoProfileOnionSessions,
  );
}

if (fields.refreshProductionTwoProfilePeerEndpoints) {
  fields.refreshProductionTwoProfilePeerEndpoints.addEventListener(
    "click",
    refreshProductionTwoProfilePeerEndpoints,
  );
}

if (fields.sendProductionTwoProfileEndpointUpdate) {
  fields.sendProductionTwoProfileEndpointUpdate.addEventListener(
    "click",
    sendProductionTwoProfileEndpointUpdate,
  );
}

if (fields.completeProductionTwoProfileOnionHandshake) {
  fields.completeProductionTwoProfileOnionHandshake.addEventListener(
    "click",
    completeProductionTwoProfileOnionHandshake,
  );
}

if (fields.sendProductionTwoProfileLatestOnionEnvelope) {
  fields.sendProductionTwoProfileLatestOnionEnvelope.addEventListener(
    "click",
    sendProductionTwoProfileLatestOnionEnvelope,
  );
}

if (fields.startProductionTwoProfileOnionReceive) {
  fields.startProductionTwoProfileOnionReceive.addEventListener(
    "click",
    startProductionTwoProfileOnionReceive,
  );
}

if (fields.stopProductionTwoProfileOnionReceive) {
  fields.stopProductionTwoProfileOnionReceive.addEventListener(
    "click",
    stopProductionTwoProfileOnionReceive,
  );
}

if (fields.runProductionTwoProfileRealOnionRoundtrip) {
  fields.runProductionTwoProfileRealOnionRoundtrip.addEventListener(
    "click",
    runProductionTwoProfileRealOnionRoundtrip,
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
  fields.openManualProductionTools.addEventListener("click", () =>
    openManualProductionTools({ focusCurrent: true }),
  );
}

if (fields.focusProductionCurrentAction) {
  fields.focusProductionCurrentAction.addEventListener("click", focusProductionCurrentAction);
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
loadProductionMessageRetentionPolicy();
renderPrototypeStatus();
resetSimulationView();
resetProductionProfileView();
resetProductionPairingView();
resetProductionMessageView();
resetProductionTwoProfileView();
resetProductionRoundtripView();
resetLoopView();
loadProductionProfileList();
