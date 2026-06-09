import "./browser-preview-tauri.js";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import {
  chatNoticeForProductionState,
  chatNoticeForSendReceiveText,
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
  productionSessionLifecycleView,
  productionSessionStateView,
  productionInviteRoomConversationMetadata,
  productionInviteCodeProfiles,
  productionTwoProfileLatestRetryableOutbound,
  productionTwoProfilePairFromProfiles,
  productionTwoProfileOutboundActionState,
  productionTwoProfileOutboundPrimaryAction,
  productionTwoProfileConversationActionView,
  productionTwoProfileConversationCompare,
  productionTwoProfileCurrentAction,
  productionTwoProfileMessageResultView,
  productionTwoProfileOutboundStatusLabel,
  productionTwoProfileRealOnionRecoveryPlan,
  productionTwoProfileRealOnionResultView,
  productionTwoProfileRealOnionResumeProfile,
  productionTwoProfileRealOnionUserView,
  productionTwoProfileReplySelectionView,
  productionTwoProfileResultView,
  productionTwoProfileResumeTarget,
  productionTwoProfileSendAttemptUserView,
  productionTwoProfileShouldShowOutboundRecovery,
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
import { applyStaticTranslations, normalizeLanguage, translate } from "./i18n.js";
import * as privateDeliveryState from "./private-delivery-state.js";
import "./styles.css";

const FIELD_TEST_APP_VERSION = __AD_FIELD_TEST_APP_VERSION__;
const FIELD_TEST_BUILD_CHANNEL = __AD_FIELD_TEST_BUILD_CHANNEL__;
const FIELD_TEST_BUILD_COMMIT = __AD_FIELD_TEST_BUILD_COMMIT__;

const fields = {
  themeToggle: document.querySelector("#theme-toggle"),
  languageSelector: document.querySelector("#language-selector"),
  appReleaseSummary: document.querySelector("#app-release-summary"),
  localCapabilitySummary: document.querySelector("#local-capability-summary"),
  mainBlockerSummary: document.querySelector("#main-blocker-summary"),
  releaseClaim: document.querySelector("#release-claim"),
  messaging: document.querySelector("#messaging"),
  localDevPeerLabel: document.querySelector("#local-dev-peer-label"),
  localPeerTestHint: document.querySelector("#local-peer-test-hint"),
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
  onionBridgeConfigLines: document.querySelector("#onion-bridge-config-lines"),
  saveOnionBridgeConfig: document.querySelector("#save-onion-bridge-config"),
  onionObfs4TransportBinaryPath: document.querySelector("#onion-obfs4-transport-binary-path"),
  saveOnionObfs4TransportBinary: document.querySelector("#save-onion-obfs4-transport-binary"),
  checkOnionBridgeConfig: document.querySelector("#check-onion-bridge-config"),
  clearOnionBridgeConfig: document.querySelector("#clear-onion-bridge-config"),
  roomNetworkPermission: document.querySelector("#room-network-permission"),
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
  lockProductionProfile: document.querySelector("#lock-production-profile"),
  checkProductionProductUnlock: document.querySelector("#check-production-product-unlock"),
  productionProfileState: document.querySelector("#production-profile-state"),
  productionProfileNextAction: document.querySelector("#production-profile-next-action"),
  productionProfileWarning: document.querySelector("#production-profile-warning"),
  productionProductUnlockState: document.querySelector("#production-product-unlock-state"),
  productionProfileStorage: document.querySelector("#production-profile-storage"),
  productionProfileIdentity: document.querySelector("#production-profile-identity"),
  productionProfileBoundary: document.querySelector("#production-profile-boundary"),
  productionDataLifecycle: document.querySelector("#production-data-lifecycle"),
  checkProductionDataLifecycle: document.querySelector("#check-production-data-lifecycle"),
  prepareProductionDataLifecycle: document.querySelector("#prepare-production-data-lifecycle"),
  productionProfileDeleteConfirmation: document.querySelector("#production-profile-delete-confirmation"),
  deleteProductionProfile: document.querySelector("#delete-production-profile"),
  productionFullWipeConfirmation: document.querySelector("#production-full-wipe-confirmation"),
  wipeProductionLocalData: document.querySelector("#wipe-production-local-data"),
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
  useProductionPairingPayload: document.querySelector("#use-production-pairing-payload"),
  storeProductionPairingPayload: document.querySelector("#store-production-pairing-payload"),
  loadProductionPairingPayload: document.querySelector("#load-production-pairing-payload"),
  relayProductionPairingPayload: document.querySelector("#relay-production-pairing-payload"),
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
  checkProductionSessionLifecycle: document.querySelector("#check-production-session-lifecycle"),
  deleteProductionSessionLifecycle: document.querySelector("#delete-production-session-lifecycle"),
  productionPairingStorage: document.querySelector("#production-pairing-storage"),
  productionPairingSession: document.querySelector("#production-pairing-session"),
  productionHandshakeState: document.querySelector("#production-handshake-state"),
  productionSessionLifecycle: document.querySelector("#production-session-lifecycle"),
  productionPairingBoundary: document.querySelector("#production-pairing-boundary"),
  productionMessageAutoNumber: document.querySelector("#production-message-auto-number"),
  productionMessageNumber: document.querySelector("#production-message-number"),
  productionMessageTtl: document.querySelector("#production-message-ttl"),
  productionMessageBody: document.querySelector("#production-message-body"),
  exportProductionMessageEnvelope: document.querySelector("#export-production-message-envelope"),
  deleteProductionConversation: document.querySelector("#delete-production-conversation"),
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
  toggleChatSettings: document.querySelector("#toggle-chat-settings"),
  closeChatSettings: document.querySelector("#close-chat-settings"),
  openPrivateDeliverySettings: document.querySelector("#open-private-delivery-settings"),
  closeAppSettings: document.querySelector("#close-app-settings"),
  openDeveloperTools: document.querySelector("#open-developer-tools"),
  createInviteCode: document.querySelector("#create-invite-code"),
  createInviteCodeSettings: document.querySelector("#create-invite-code-settings"),
  createdInviteCodeDisplay: document.querySelector("#created-invite-code-display"),
  copyCreatedInviteCode: document.querySelector("#copy-created-invite-code"),
  receivedInviteCode: document.querySelector("#received-invite-code"),
  createRoomFromReceivedCode: document.querySelector("#create-room-from-received-code"),
  copyInviteCode: document.querySelector("#copy-invite-code"),
  settingsInviteCodeDisplay: document.querySelector("#settings-invite-code-display"),
  roomInviteTokenPanel: document.querySelector("#room-invite-token-panel"),
  roomInviteTokenDisplay: document.querySelector("#room-invite-token-display"),
  copyRoomInviteToken: document.querySelector("#copy-room-invite-token"),
  backToRoomList: document.querySelector("#back-to-room-list"),
  roomListCreateRoom: document.querySelector("#room-list-create-room"),
  roomListInviteCode: document.querySelector("#room-list-invite-code"),
  roomListJoinRoom: document.querySelector("#room-list-join-room"),
  roomListSyncStatus: document.querySelector("#room-list-sync-status"),
  savedRoomList: document.querySelector("#saved-room-list"),
  productionTwoProfileDirection: document.querySelector("#production-two-profile-direction"),
  connectionDeviceRole: document.querySelector("#connection-device-role"),
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
  chatTranscriptToolbar: document.querySelector(".chat-transcript-toolbar"),
  chatPrimaryActions: document.querySelector(".chat-primary-actions"),
  twoProfileSafetyPhrase: document.querySelector("#two-profile-safety-phrase"),
  confirmTwoProfileSafety: document.querySelector("#confirm-two-profile-safety"),
  rejectTwoProfileSafety: document.querySelector("#reject-two-profile-safety"),
  roomStatusSummary: document.querySelector("#room-status-summary"),
  roomIdentityRoute: document.querySelector("#room-identity-route"),
  roomIdentityPair: document.querySelector("#room-identity-pair"),
  roomIdentityVerify: document.querySelector("#room-identity-verify"),
  roomIdentityTransport: document.querySelector("#room-identity-transport"),
  runProductionTwoProfileRoundtrip: document.querySelector("#run-production-two-profile-roundtrip"),
  runProductionTwoProfileRoundtripInline: document.querySelector("#run-production-two-profile-roundtrip-inline"),
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
  preparePrivateRoute: document.querySelector("#prepare-private-route"),
  privateRouteExchange: document.querySelector("#private-route-exchange"),
  privateRouteExchangeTitle: document.querySelector("#private-route-exchange-title"),
  privateRouteStepLocal: document.querySelector("#private-route-step-local"),
  privateRouteStepCopy: document.querySelector("#private-route-step-copy"),
  privateRouteStepPeer: document.querySelector("#private-route-step-peer"),
  privateRouteInstruction: document.querySelector("#private-route-instruction"),
  privateRouteLocalStatus: document.querySelector("#private-route-local-status"),
  localPrivateRouteCode: document.querySelector("#local-private-route-code"),
  peerPrivateRouteCode: document.querySelector("#peer-private-route-code"),
  copyPrivateRouteCode: document.querySelector("#copy-private-route-code"),
  applyPeerPrivateRouteCode: document.querySelector("#apply-peer-private-route-code"),
  startProductionTwoProfileOnionReceive: document.querySelector(
    "#start-production-two-profile-onion-receive",
  ),
  stopProductionTwoProfileOnionReceive: document.querySelector(
    "#stop-production-two-profile-onion-receive",
  ),
  runProductionTwoProfileRealOnionRoundtrip: document.querySelector(
    "#run-production-two-profile-real-onion-roundtrip",
  ),
  cancelProductionTwoProfileRealOnionWait: document.querySelector(
    "#cancel-production-two-profile-real-onion-wait",
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
  chatDeliveryNotice: document.querySelector("#chat-delivery-notice"),
  fieldTestReport: document.querySelector("#field-test-report"),
  fieldTestReportSummary: document.querySelector("#field-test-report-summary"),
  fieldTestChecklist: document.querySelector("#field-test-checklist"),
  peerFieldTestReport: document.querySelector("#peer-field-test-report"),
  fieldTestReportCompare: document.querySelector("#field-test-report-compare"),
  fieldTestNextAction: document.querySelector("#field-test-next-action"),
  refreshFieldTestReport: document.querySelector("#refresh-field-test-report"),
  copyFieldTestReport: document.querySelector("#copy-field-test-report"),
  publicBetaDiagnostics: document.querySelector("#public-beta-diagnostics"),
  publicBetaDiagnosticsSummary: document.querySelector("#public-beta-diagnostics-summary"),
  refreshPublicBetaDiagnostics: document.querySelector("#refresh-public-beta-diagnostics"),
  copyPublicBetaDiagnostics: document.querySelector("#copy-public-beta-diagnostics"),
  productionTwoProfileTranscriptExport: document.querySelector("#production-two-profile-transcript-export"),
  productionTwoProfileNextStep: document.querySelector("#production-two-profile-next-step"),
  openManualProductionTools: document.querySelector("#open-manual-production-tools"),
  focusLocalDiagnostic: document.querySelector("#focus-local-diagnostic"),
  swapTwoProfileDirection: document.querySelector("#swap-two-profile-direction"),
  editTwoProfileMessage: document.querySelector("#edit-two-profile-message"),
  manualProductionTools: document.querySelector(".advanced-panel"),
  localDiagnosticTools: document.querySelector("#local-diagnostic-tools"),
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
let latestProductionSessionStateFingerprint = "";
let latestProductionTwoProfileSessionStatus = null;
const latestProductionTwoProfileSessionStatusesByRoom = new Map();
let latestProductionTwoProfileSafety = null;
let latestProductionTwoProfileSuccess = null;
let latestProductionTwoProfileOnionEndpoints = null;
const latestProductionTwoProfileRealOnionResultsByRoom = new Map();
const latestProductionTwoProfileRealOnionRecoveriesByRoom = new Map();
let latestProductionOnionBridgeConfigStatus = null;
const latestProductionTwoProfileRealOnionWaitCanceledFingerprints = new Set();
let activeProductionTwoProfileRealOnionInput = null;
let productionTwoProfileRealOnionRunSequence = 0;
let latestLocalPrivateRouteCode = "";
const localPrivateRouteCodesByRoom = new Map();
const activeLocalPrivateRouteCodesByRoom = new Map();
const localPrivateRouteLifecycleByRoom = new Map();
const peerPrivateRouteDraftsByRoom = new Map();
let pendingPrivateRouteFollowup = null;
let productionTwoProfileOnionReceiveMode = {
  enabled: false,
  roomFingerprint: "",
  profile: "",
  passphrase: "",
  timer: null,
  attempt: 0,
  inFlight: false,
  stopRequested: false,
  runtimeState: "stopped",
  runtimeLabel: "Message listening stopped",
  lastProcessedImportSequence: 0,
  lastProcessedMessageImportCount: 0,
  lastProcessedEndpointUpdateCount: 0,
  generation: 0,
  ownerProfileBound: false,
  ownerMatchesReceiveProfile: true,
};
let latestProductionMessageImport = null;
let latestProductionPairingSafety = null;
let productionBusyAction = null;
let activeInviteRoomOpenFingerprint = "";
let activeInviteRoomPrivateRouteCodeFingerprint = "";
let activeInviteRoomPeerRouteCodeFingerprint = "";
let activeTwoProfileRoundtripFingerprint = "";
let activeTwoProfileMessageRoundtripFingerprint = "";
let activeTwoProfileOnionEnvelopeSendKey = "";
let activeTwoProfilePeerEndpointRefreshFingerprint = "";
let activeTwoProfileOutboundCancelFingerprint = "";
let activeTwoProfileSessionStatusFingerprint = "";
let latestProductionManualFocusTarget = null;
let latestChatDeliveryNoticeKey = "";
let latestChatDeliveryNoticeTone = "neutral";
let latestChatDeliveryNoticeRoomFingerprint = "";
let latestChatDeliveryNoticePendingOutbound = null;
let latestClearedRetryableSelection = null;
let allowCurrentRoomRetryableMetadataFallbackOnce = false;
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

function clearProductionBusyAction(action) {
  if (productionBusyAction === action) {
    productionBusyAction = null;
  }
}

function setInviteRoomOpenBusy(input) {
  productionBusyAction = "invite-room-open";
  activeInviteRoomOpenFingerprint = twoProfileSessionStatusFingerprint(input);
}

function inviteRoomOpenBusyMatches(input) {
  return (
    productionBusyAction === "invite-room-open" &&
    activeInviteRoomOpenFingerprint === twoProfileSessionStatusFingerprint(input)
  );
}

function clearInviteRoomOpenBusy(input) {
  if (inviteRoomOpenBusyMatches(input)) {
    activeInviteRoomOpenFingerprint = "";
    clearProductionBusyAction("invite-room-open");
  }
}

function setInviteRoomPrivateRouteCodeBusy(input) {
  productionBusyAction = "invite-room-private-route-code";
  activeInviteRoomPrivateRouteCodeFingerprint = twoProfileSessionStatusFingerprint(input);
}

function clearInviteRoomPrivateRouteCodeBusy(input) {
  if (
    productionBusyAction === "invite-room-private-route-code" &&
    activeInviteRoomPrivateRouteCodeFingerprint === twoProfileSessionStatusFingerprint(input)
  ) {
    activeInviteRoomPrivateRouteCodeFingerprint = "";
    clearProductionBusyAction("invite-room-private-route-code");
  }
}

function setInviteRoomPeerRouteCodeBusy(input) {
  productionBusyAction = "invite-room-peer-route-code";
  activeInviteRoomPeerRouteCodeFingerprint = twoProfileSessionStatusFingerprint(input);
}

function clearInviteRoomPeerRouteCodeBusy(input) {
  if (
    productionBusyAction === "invite-room-peer-route-code" &&
    activeInviteRoomPeerRouteCodeFingerprint === twoProfileSessionStatusFingerprint(input)
  ) {
    activeInviteRoomPeerRouteCodeFingerprint = "";
    clearProductionBusyAction("invite-room-peer-route-code");
  }
}

function setTwoProfileRoundtripBusy(input) {
  productionBusyAction = "two-profile-roundtrip";
  activeTwoProfileRoundtripFingerprint = twoProfileSessionStatusFingerprint(input);
}

function clearTwoProfileRoundtripBusy(input) {
  if (
    productionBusyAction === "two-profile-roundtrip" &&
    activeTwoProfileRoundtripFingerprint === twoProfileSessionStatusFingerprint(input)
  ) {
    activeTwoProfileRoundtripFingerprint = "";
    clearProductionBusyAction("two-profile-roundtrip");
  }
}

function setTwoProfileMessageRoundtripBusy(input) {
  productionBusyAction = "two-profile-message-roundtrip";
  activeTwoProfileMessageRoundtripFingerprint = twoProfileSessionStatusFingerprint(input);
}

function clearTwoProfileMessageRoundtripBusy(input) {
  if (
    productionBusyAction === "two-profile-message-roundtrip" &&
    activeTwoProfileMessageRoundtripFingerprint === twoProfileSessionStatusFingerprint(input)
  ) {
    activeTwoProfileMessageRoundtripFingerprint = "";
    clearProductionBusyAction("two-profile-message-roundtrip");
  }
}

function twoProfileOnionEnvelopeSendKey(input, messageNumber) {
  const normalizedNumber = Number.parseInt(messageNumber, 10) || 0;
  return `${twoProfileSessionStatusFingerprint(input)}\n${normalizedNumber}`;
}

function setTwoProfileOnionEnvelopeSendBusy(input, messageNumber) {
  productionBusyAction = "two-profile-onion-envelope-send";
  activeTwoProfileOnionEnvelopeSendKey = twoProfileOnionEnvelopeSendKey(input, messageNumber);
}

function clearTwoProfileOnionEnvelopeSendBusy(input, messageNumber) {
  if (
    productionBusyAction === "two-profile-onion-envelope-send" &&
    activeTwoProfileOnionEnvelopeSendKey === twoProfileOnionEnvelopeSendKey(input, messageNumber)
  ) {
    activeTwoProfileOnionEnvelopeSendKey = "";
    clearProductionBusyAction("two-profile-onion-envelope-send");
  }
}

function setTwoProfilePeerEndpointRefreshBusy(input) {
  productionBusyAction = "two-profile-peer-endpoint-refresh";
  activeTwoProfilePeerEndpointRefreshFingerprint = twoProfileSessionStatusFingerprint(input);
}

function clearTwoProfilePeerEndpointRefreshBusy(input) {
  if (
    productionBusyAction === "two-profile-peer-endpoint-refresh" &&
    activeTwoProfilePeerEndpointRefreshFingerprint === twoProfileSessionStatusFingerprint(input)
  ) {
    activeTwoProfilePeerEndpointRefreshFingerprint = "";
    clearProductionBusyAction("two-profile-peer-endpoint-refresh");
  }
}

function setTwoProfileOutboundCancelBusy(input) {
  productionBusyAction = "two-profile-outbound-cancel";
  activeTwoProfileOutboundCancelFingerprint = twoProfileSessionStatusFingerprint(input);
}

function clearTwoProfileOutboundCancelBusy(input) {
  if (
    productionBusyAction === "two-profile-outbound-cancel" &&
    activeTwoProfileOutboundCancelFingerprint === twoProfileSessionStatusFingerprint(input)
  ) {
    activeTwoProfileOutboundCancelFingerprint = "";
    clearProductionBusyAction("two-profile-outbound-cancel");
  }
}

function setTwoProfileSessionStatusBusy(input) {
  productionBusyAction = "two-profile-session-status";
  activeTwoProfileSessionStatusFingerprint = twoProfileSessionStatusFingerprint(input);
}

function clearTwoProfileSessionStatusBusy(input) {
  if (
    productionBusyAction === "two-profile-session-status" &&
    activeTwoProfileSessionStatusFingerprint === twoProfileSessionStatusFingerprint(input)
  ) {
    activeTwoProfileSessionStatusFingerprint = "";
    clearProductionBusyAction("two-profile-session-status");
  }
}

function twoProfileOnionEnvelopeSendBusyMatches(input) {
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  return Boolean(
    productionBusyAction === "two-profile-onion-envelope-send" &&
      fingerprint &&
      activeTwoProfileOnionEnvelopeSendKey.startsWith(`${fingerprint}\n`),
  );
}

function productionBusyActionMatchesInput(input = productionTwoProfileInput()) {
  if (productionBusyAction === null) {
    return false;
  }
  if (productionBusyAction === "invite-room-open") {
    return inviteRoomOpenBusyMatches(input);
  }
  if (productionBusyAction === "invite-room-private-route-code") {
    return activeInviteRoomPrivateRouteCodeFingerprint === twoProfileSessionStatusFingerprint(input);
  }
  if (productionBusyAction === "invite-room-peer-route-code") {
    return activeInviteRoomPeerRouteCodeFingerprint === twoProfileSessionStatusFingerprint(input);
  }
  if (productionBusyAction === "two-profile-roundtrip") {
    return activeTwoProfileRoundtripFingerprint === twoProfileSessionStatusFingerprint(input);
  }
  if (productionBusyAction === "two-profile-message-roundtrip") {
    return activeTwoProfileMessageRoundtripFingerprint === twoProfileSessionStatusFingerprint(input);
  }
  if (productionBusyAction === "two-profile-onion-envelope-send") {
    return twoProfileOnionEnvelopeSendBusyMatches(input);
  }
  if (productionBusyAction === "two-profile-peer-endpoint-refresh") {
    return activeTwoProfilePeerEndpointRefreshFingerprint === twoProfileSessionStatusFingerprint(input);
  }
  if (productionBusyAction === "two-profile-outbound-cancel") {
    return activeTwoProfileOutboundCancelFingerprint === twoProfileSessionStatusFingerprint(input);
  }
  if (productionBusyAction === "two-profile-real-onion-roundtrip") {
    return realOnionRoundtripActiveForInput(input);
  }
  if (productionBusyAction === "two-profile-session-status") {
    return activeTwoProfileSessionStatusFingerprint === twoProfileSessionStatusFingerprint(input);
  }
  return true;
}

function productionBusyActionBlocksInput(input = productionTwoProfileInput()) {
  return Boolean(productionBusyAction && productionBusyActionMatchesInput(input));
}

function productionBusyActionIsForInput(action, input = productionTwoProfileInput()) {
  return productionBusyAction === action && productionBusyActionMatchesInput(input);
}

function manualNetworkPermissionEnabled() {
  return fields.roomNetworkPermission?.checked === true || fields.manualOnionNetworkPermission?.checked === true;
}

function setManualNetworkPermission(enabled) {
  const checked = Boolean(enabled);
  if (fields.roomNetworkPermission) {
    fields.roomNetworkPermission.checked = checked;
  }
  if (fields.manualOnionNetworkPermission) {
    fields.manualOnionNetworkPermission.checked = checked;
  }
}

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
let productionMessageRetentionPolicyLoadPromise = null;
const localPreviewRetentionPolicy = {
  defaultTtlSeconds: 604_800,
  allowedTtlSeconds: [3_600, 86_400, 604_800, 2_592_000],
};

const themeStorageKey = "another-dimension-theme";
const languageStorageKey = "another-dimension-language";
const localMemoryStore = new Map();
const browserPreviewPeer =
  new URLSearchParams(window.location.search).get("peer") === "peer-a" ||
  new URLSearchParams(window.location.search).get("peer") === "peer-b"
    ? new URLSearchParams(window.location.search).get("peer")
    : "";
const localDevPeer =
  browserPreviewPeer ||
  (import.meta.env?.VITE_AD_LOCAL_DEV_PEER === "peer-a" || import.meta.env?.VITE_AD_LOCAL_DEV_PEER === "peer-b"
    ? import.meta.env.VITE_AD_LOCAL_DEV_PEER
    : "");
const forcedBrowserPreviewPeer =
  import.meta.env?.VITE_AD_PREVIEW_PEER === "peer-a" || import.meta.env?.VITE_AD_PREVIEW_PEER === "peer-b";

function invoke(cmd, args) {
  const previewInvoke = window.__TAURI_INTERNALS__?.invoke;
  if (forcedBrowserPreviewPeer && typeof previewInvoke === "function") {
    return previewInvoke(cmd, args);
  }
  return tauriInvoke(cmd, args);
}

function localStoreKey(key) {
  if (
    localDevPeer &&
    (key.startsWith("ad.connectionCodeRole.") ||
      key === "ad.lastInviteRoom.v1" ||
      key === "ad.inviteRooms.v1" ||
      key === "ad.receiveIntentRooms.v1" ||
      key === "ad.localPrivateRouteCodes.v1" ||
      key === "ad.realOnionRecoveries.v1" ||
      key === "ad.peerPrivateRouteDrafts.v1" ||
      key === themeStorageKey ||
      key === languageStorageKey)
  ) {
    return `ad.localPeer.${localDevPeer}.${key}`;
  }
  return key;
}

function localStoreGet(key) {
  const scopedKey = localStoreKey(key);
  try {
    const value = window.localStorage?.getItem(scopedKey);
    if (value !== null && value !== undefined) {
      return value;
    }
  } catch {
    // Fall back below.
  }
  return localMemoryStore.has(scopedKey) ? localMemoryStore.get(scopedKey) : null;
}

function localStoreSet(key, value) {
  const scopedKey = localStoreKey(key);
  try {
    window.localStorage?.setItem(scopedKey, value);
    localMemoryStore.delete(scopedKey);
    return true;
  } catch {
    localMemoryStore.set(scopedKey, String(value));
    return true;
  }
}

function localStoreRemove(key) {
  const scopedKey = localStoreKey(key);
  try {
    window.localStorage?.removeItem(scopedKey);
  } catch {
    // Fall through to in-memory cleanup.
  }
  localMemoryStore.delete(scopedKey);
  return true;
}

let currentLanguage = normalizeLanguage(localStoreGet(languageStorageKey) ?? "en");

function t(key) {
  return translate(currentLanguage, key);
}

function formatTemplate(key, values = {}) {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    t(key),
  );
}

function localizedOutboundStatus(label) {
  const normalized = String(label ?? "").trim().toLowerCase();
  const labels = {
    pending: "pending",
    sent: "sent",
    canceled: "canceled",
    "send timeout": "sendTimeout",
    "route missing": "routeMissing",
    "stale endpoint": "staleEndpoint",
    "tor bootstrap": "torBootstrap",
    "permission off": "permissionOff",
    "peer offline": "peerOffline",
  };
  return labels[normalized] ? t(labels[normalized]) : label;
}

function localizedReceiveFailureMessage(message) {
  const normalized = String(message ?? "").trim();
  const exact = {
    "Receive worker is waiting for inbound onion traffic.": "receiveWaiting",
    "Receive mode is paused until manual onion network permission is enabled again.": "receiveNeedsNetwork",
    "Receive mode needs the persistent Tor client to be started again.": "receiveNeedsTor",
    "No inbound peer stream is available yet; receive mode will keep retrying.": "receivePeerOffline",
    "Receive attempt timed out; receive mode will retry while enabled.": "receiveTimeout",
    "A receive attempt is already active; duplicate work is blocked.": "receiveBusy",
    "A received envelope was not fully imported; receive mode will retry.": "receiveImportRetry",
    "This build does not include the manual onion client attempt feature.": "receiveFeatureDisabled",
    "Receive mode hit a retryable backend boundary and will keep polling.": "receiveRetrying",
    "Waiting for new messages.": "receiveWaiting",
    "Turn on network permission before listening for messages.": "receiveNeedsNetwork",
    "Tor needs to be started again before messages can arrive.": "receiveNeedsTor",
    "Peer is offline; listening will retry.": "receivePeerOffline",
    "No message arrived before timeout; listening will retry.": "receiveTimeout",
    "Already listening for messages.": "receiveBusy",
    "A message could not be imported; listening will retry.": "receiveImportRetry",
    "Message listening is not available in this build.": "receiveFeatureDisabled",
    "Message listening hit a retryable error and will keep trying.": "receiveRetrying",
  };
  return exact[normalized] ? t(exact[normalized]) : localizedChatStatus(normalized);
}

function localizedSendFailureMessage(error) {
  const text = String(error ?? "").toLowerCase();
  if (sendFailureNeedsStartReceiving(text)) {
    return t("externalSendNeedsReceive");
  }
  if (text.includes("timeout")) {
    return t("sendTimeout");
  }
  if (sendFailureNeedsRouteSetup(text)) {
    return t("privateDeliveryRouteNeeded");
  }
  if (sendFailureNeedsEndpointRefresh(text)) {
    return t("staleEndpoint");
  }
  if (sendFailureNeedsNetworkRetry(text)) {
    return t("retryNetwork");
  }
  if (text.includes("manualnetworkpermission") || text.includes("permission")) {
    return t("permissionOff");
  }
  if (text.includes("offline") || text.includes("peer")) {
    return t("peerOffline");
  }
  return t("sendFailedGeneric");
}

function localizedSendAttemptMessage(result) {
  const failureText = sendAttemptFailureText(result);
  if (result?.send_attempt_succeeded) {
    return t("chatNoticeExternalSendWritten");
  }
  if (sendRuntimeOwnerMismatch(result)) {
    return t("sendRuntimeMismatch");
  }
  if (sendFailureNeedsStartReceiving(failureText)) {
    return t("externalSendNeedsReceive");
  }
  if (sendFailureNeedsRouteSetup(failureText)) {
    return t("privateDeliveryRouteNeeded");
  }
  if (result?.peer_endpoint_refresh_recommended || result?.retry_recommended_after_endpoint_refresh) {
    return t("chatNoticeRefreshAddress");
  }
  if (sendFailureNeedsNetworkRetry(failureText)) {
    return t("retryNetwork");
  }
  return localizedSendFailureMessage(failureText);
}

function sendRuntimeOwnerMismatch(result) {
  return Boolean(result?.owner_profile_bound === true && result?.owner_matches_send_profile === false);
}

function setChatDeliveryNoticeForSendAttempt(result, input = productionTwoProfileInput()) {
  const failureText = sendAttemptFailureText(result);
  if (result?.send_attempt_succeeded) {
    setChatDeliveryNoticeByKey("chatNoticeExternalSendWritten", "success", input);
    return;
  }
  if (sendRuntimeOwnerMismatch(result)) {
    setChatDeliveryNoticeByKey("sendRuntimeMismatch", "warning", input);
    return;
  }
  if (sendFailureNeedsStartReceiving(failureText)) {
    setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "warning", input);
    return;
  }
  if (sendFailureNeedsRouteSetup(failureText)) {
    setChatDeliveryNoticeByKey("privateDeliveryRouteNeeded", "warning", input);
    return;
  }
  if (result?.peer_endpoint_refresh_recommended || result?.retry_recommended_after_endpoint_refresh) {
    setChatDeliveryNoticeByKey("chatNoticeRefreshAddress", "warning", input);
    return;
  }
  if (sendFailureNeedsNetworkRetry(failureText)) {
    setChatDeliveryNoticeByKey("retryNetwork", "warning", input);
    return;
  }
  const key = chatNoticeForSendReceiveText(failureText)?.key ?? "sendFailedGeneric";
  setChatDeliveryNoticeByKey(key, "warning", input);
}

function sendAttemptFailureText(result) {
  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  return [result?.next_blocker, result?.warning, ...blockers].join(" ").toLowerCase();
}

function sendFailureNeedsRouteSetup(text) {
  return (
    text.includes("peer-endpoint-missing") ||
    text.includes("endpoint-missing") ||
    text.includes("endpointunavailable") ||
    text.includes("stored remote endpoint unavailable") ||
    text.includes("runtimeownerprofilemismatch")
  );
}

function sendFailureNeedsStartReceiving(text) {
  return (
    text.includes("localonionendpointnotready") ||
    text.includes("local onion endpoint not ready") ||
    text.includes("receive stopped") ||
    text.includes("receive mode stopped") ||
    text.includes("message listening stopped") ||
    text.includes("message listening is off")
  );
}

function sendFailureNeedsEndpointRefresh(text) {
  return !sendFailureNeedsRouteSetup(text) && (text.includes("stale") || text.includes("refresh"));
}

function sendFailureNeedsNetworkRetry(text) {
  const normalized = String(text ?? "").toLowerCase();
  return normalized.includes("persistentclientnotready") || normalized.includes("bootstrap");
}

function setChatDeliveryNoticeForOutboundFailureKind(failureKind, input = productionTwoProfileInput()) {
  const normalized = String(failureKind ?? "").toLowerCase();
  if (normalized.includes("manualnetworkpermission")) {
    setChatDeliveryNoticeByKey("chatNoticeNetworkPermission", "warning", input);
    return;
  }
  if (normalized.includes("persistentclientnotready")) {
    setChatDeliveryNoticeByKey("retryNetwork", "warning", input);
    return;
  }
  if (normalized.includes("localonionendpointnotready")) {
    setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "warning", input);
    return;
  }
  if (normalized.includes("runtimeownerprofilemismatch")) {
    setChatDeliveryNoticeByKey("sendRuntimeMismatch", "warning", input);
    return;
  }
  if (sendFailureNeedsRouteSetup(normalized)) {
    setChatDeliveryNoticeByKey("privateDeliveryRouteNeeded", "warning", input);
    return;
  }
  if (sendFailureNeedsEndpointRefresh(normalized)) {
    setChatDeliveryNoticeByKey("chatNoticeRefreshAddress", "warning", input);
    return;
  }
  if (normalized.includes("timeout")) {
    setChatDeliveryNoticeByKey("sendTimeout", "warning", input);
    return;
  }
  setChatDeliveryNoticeByKey("sendFailedGeneric", "warning", input);
}

function localizedRetentionLabel(entry) {
  const retentionView = transcriptRetentionView(entry);
  if (retentionView.state === "is-expired") {
    return t("retentionExpired");
  }
  if (retentionView.state === "is-unknown") {
    return t("retentionLegacy");
  }
  const ttlSeconds = Number.parseInt(entry?.ttlSeconds ?? entry?.ttl_seconds ?? 0, 10);
  const duration = Number.isInteger(ttlSeconds) && ttlSeconds > 0
    ? retentionView.label.replace("retention: ", "").replace(" active", "")
    : "";
  return duration ? `${duration} ${t("retentionActive")}` : t("retentionActive");
}

function localizedTtlLabel(ttlSeconds) {
  const days = ttlSeconds / 86400;
  if (Number.isInteger(days) && days >= 1) {
    return days === 1 ? t("daySingular") : formatTemplate("dayPlural", { count: days });
  }
  const hours = ttlSeconds / 3600;
  if (Number.isInteger(hours)) {
    return hours === 1 ? t("hourSingular") : formatTemplate("hourPlural", { count: hours });
  }
  return `${ttlSeconds}s`;
}

function localizeTwoProfileMessage(key, values = {}) {
  return formatTemplate(key, values);
}

function localizedChatStatus(message) {
  const text = String(message ?? "").trim();
  const lower = text.toLowerCase();
  if (!text) {
    return "";
  }
  const exact = {
    "two-profile roundtrip idle": "waiting",
    "two-profile roundtrip running": "statusBusy",
    "two-profile roundtrip completed": "statusSent",
    "two-profile roundtrip failed": "statusFailed",
    "waiting for connection": "waiting",
    "connection setup blocked": "statusSetup",
    "connection setup needs input": "statusSetup",
    "connection setup running": "statusBusy",
    "connection setup completed": "statusReady",
    "connection setup failed": "statusFailed",
    "connection action already running": "statusBusy",
    "send needs input": "statusSetup",
    "stored-session message running": "statusSending",
    "stored-session message completed": "statusSent",
    "stored-session message failed": "statusFailed",
    "sessions checking": "statusChecking",
    "sessions ready": "statusReady",
    "sessions incomplete": "statusSetup",
    "conversation loading": "statusChecking",
    "conversation loaded": "statusLoaded",
    "conversation resumed": "statusRecovered",
    "resume needs session check": "statusSetup",
    "resume needs review": "statusRetry",
    "receive mode stopped": "statusStopped",
    "receive mode stopping": "statusStopped",
    "receive mode receiving": "statusReceiving",
    "receive mode retryable failure": "receiveRetrying",
    "receive mode peer connected": "statusPeerConnected",
    "receive mode waiting for tor bootstrap": "receiveNeedsTor",
    "receive mode waiting for onion service": "statusReceiving",
    "receive mode imported message": "statusLoaded",
    "receive mode imported endpoint update": "statusLoaded",
    "receive mode imported message or endpoint update": "statusLoaded",
    "message listening stopped": "statusStopped",
    "message listening stopping": "statusStopped",
    "listening for new messages": "statusReceiving",
    "message listening will retry": "receiveRetrying",
    "peer connected": "statusPeerConnected",
    "waiting for tor restart": "receiveNeedsTor",
    "waiting for local address": "statusReceiving",
    "peer address updated": "statusLoaded",
    "new message received": "statusLoaded",
    "private delivery running": "statusSending",
    "private delivery sent": "statusSent",
    "private delivery completed": "statusSent",
    "private delivery failed": "statusFailed",
    "private delivery blocked": "statusFailed",
    "private delivery needs review": "statusRetry",
    "private delivery not ready": "statusSetup",
    "private delivery needs message": "statusNeedMessage",
  };
  if (exact[lower]) {
    return t(exact[lower]);
  }
  if (lower.includes("running") || lower.includes("already running") || lower.includes("in progress")) {
    if (lower.includes("receive")) {
      return t("statusReceiving");
    }
    if (lower.includes("send") || lower.includes("message")) {
      return t("statusSending");
    }
    if (lower.includes("check")) {
      return t("statusChecking");
    }
    return t("statusBusy");
  }
  if (lower.includes("passphrase")) {
    return t("statusNeedPassphrase");
  }
  if (lower.includes("profile") || lower.includes("direction")) {
    return t("statusNeedProfiles");
  }
  if (lower.includes("message required") || lower.includes("write a message") || lower.includes("write first")) {
    return t("statusNeedMessage");
  }
  if (lower.includes("endpoint not checked")) {
    return t("endpointNotChecked");
  }
  if (lower.includes("endpoint missing")) {
    return t("endpointMissing");
  }
  if (lower.includes("endpoint stale")) {
    return t("endpointStale");
  }
  if (lower.includes("endpoint ready")) {
    return t("endpointReady");
  }
  if (lower.includes("ready")) {
    return t("statusReady");
  }
  if (lower.includes("recovered") || lower.includes("resumed")) {
    return t("statusRecovered");
  }
  if (lower.includes("loaded") || lower.includes("updated")) {
    return t("statusLoaded");
  }
  if (lower.includes("failed") || lower.includes("blocked")) {
    return t("statusFailed");
  }
  if (lower.includes("completed") || lower.includes("sent")) {
    return t("statusSent");
  }
  if (lower.includes("incomplete") || lower.includes("rebuild") || lower.includes("setup")) {
    return t("statusSetup");
  }
  if (lower.includes("receive mode stopped")) {
    return t("statusStopped");
  }
  if (lower.includes("receiv")) {
    return t("statusReceiving");
  }
  if (lower.includes("peer connected")) {
    return t("statusPeerConnected");
  }
  if (lower.includes("retry")) {
    return t("statusRetry");
  }
  if (lower.includes("canceled")) {
    return t("statusCanceled");
  }
  return text;
}

function localizedTwoProfileUserViewText(value) {
  const text = String(value ?? "");
  const exact = {
    "Room is ready.": "userRoomReady",
    "Room is saved.": "userRoomSaved",
    "Message was sent.": "userMessageSent",
    "Message was written to the peer route.": "userMessageWrittenToPeerRoute",
    "Waiting for the other device to receive it.": "userWaitingPeerReceive",
    "Private delivery finished. Technical details are available in diagnostics.": "userDeliveryFinished",
    "External peer delivery is not confirmed until the other device receives it.": "userExternalDeliveryUnconfirmed",
    "Peer address needs to be refreshed.": "userPeerAddressRefreshSession",
    "Message is still saved. Refresh the address, then retry or cancel.": "userMessageSavedRefresh",
    "No message was deleted.": "userNoMessageDeleted",
    "Network permission is off.": "userNetworkPermissionOff",
    "Message is still saved.": "userMessageSaved",
    "No private delivery was attempted.": "userNoDeliveryAttempted",
    "The other device may be offline.": "userOtherDeviceMaybeOffline",
    "Message is still saved. Retry or cancel it from the conversation.": "userMessageSavedRetryCancel",
    "The failed send stayed retryable.": "userFailedSendRetryable",
    "Private delivery is not ready.": "userDeliveryNotReady",
    "Message is still saved. Retry when the room is ready.": "userMessageSavedRetryWhenReady",
    "Both devices exchanged messages.": "userBothDevicesExchanged",
    "Message delivered. You can continue the conversation.": "userDeliveredContinue",
    "Private delivery completed without showing private details.": "userDeliveryCompletedNoDetails",
    "Turn on private delivery before trying again.": "userTurnOnPrivateDelivery",
    "Some delivery work finished, but not all messages were confirmed.": "userSomeDeliveryWorkFinished",
    "Review the conversation, then retry or cancel any pending message.": "userReviewRetryCancelPending",
    "No private details were shown in the chat view.": "userNoPrivateDetailsChat",
    "Private delivery setup did not finish.": "userDeliverySetupDidNotFinish",
    "Try again after the private route is ready.": "userTryAgainRouteReady",
    "Private delivery waiting for network": "userDeliveryWaitingNetwork",
    "Private delivery needs network change": "userDeliveryNeedsNetworkChange",
    "Delivery network did not finish starting.": "userDeliveryNetworkStartIncomplete",
    "Wait a moment, then retry private delivery or turn it off.": "userWaitRetryOrDisableDelivery",
    "No message was sent and the wait can be cancelled.": "userNoMessageSentWaitCancellable",
    "Change network or use a bridge-capable build, then retry private delivery.": "userChangeNetworkOrBridgeBuild",
    "No message was sent and this build did not report bridge support.": "userNoMessageSentNoBridgeSupport",
    "Change network or add private bridge config, then retry private delivery.": "userChangeNetworkOrAddBridgeConfig",
    "No message was sent and no bridge config was used.": "userNoMessageSentNoBridgeConfig",
    "Replace the private bridge config, then retry private delivery.": "userReplaceBridgeConfig",
    "No message was sent because the saved bridge config is invalid.": "userNoMessageSentInvalidBridgeConfig",
    "Refresh the private bridge config or replace the pluggable transport binary, then retry private delivery.":
      "userRefreshBridgeTransport",
    "No message was sent after bridge bootstrap exhausted retries with pluggable transport configured.":
      "userNoMessageSentBridgeTransportRetries",
    "Replace the pluggable transport binary path, then retry private delivery.": "userReplaceBridgeTransport",
    "No message was sent because the saved pluggable transport binary path is invalid.":
      "userNoMessageSentInvalidBridgeTransport",
    "Configure the pluggable transport binary, then retry private delivery.": "userConfigureBridgeTransport",
    "No message was sent because pluggable transport is not configured.": "userNoMessageSentMissingBridgeTransport",
    "Refresh the private bridge config or change network, then retry private delivery.":
      "userRefreshBridgeOrNetwork",
    "No message was sent after bridge bootstrap exhausted retries.": "userNoMessageSentBridgeRetries",
    "Change network, then retry private delivery.": "userChangeNetworkRetryDelivery",
    "No message was sent after network bootstrap exhausted retries.": "userNoMessageSentNetworkRetries",
    "Network wait canceled": "networkWaitCanceled",
    "Retry private delivery when you are ready.": "retryPrivateDeliveryHint",
    "No message was sent and the network wait was closed.": "networkWaitCanceledBoundary",
    "Delivery network setup stopped before sending.": "userDeliveryNetworkSetupStopped",
    "Review developer details before retrying private delivery.": "userReviewDeveloperDetailsBeforeRetry",
    "No message was sent and private details stayed hidden.": "userNoMessageSentDetailsHidden",
    "Peer address update was sent.": "userPeerAddressUpdateSent",
    "Wait for the other device to receive it.": "userWaitPeerAddressReceive",
    "Peer address update finished without showing private details.": "userPeerAddressUpdateNoDetails",
    "Existing room state was kept.": "userExistingRoomKept",
    "Updating the saved peer address.": "userUpdatingPeerAddress",
    "No chat message is being sent.": "userNoChatMessageSent",
    "Peer address update is running after your explicit action.": "userPeerAddressUpdateRunning",
    "Sending saved message.": "userSendingSavedMessage",
    "Trying private delivery.": "userTryingPrivateDelivery",
    "Private delivery is running after your explicit action.": "userDeliveryRunningExplicit",
    "Connecting both devices.": "userConnectingBothDevices",
    "Room is being prepared.": "userRoomBeingPrepared",
    "Failed before or during bounded onion send attempt.": "userDeliveryFailedKept",
  };
  if (exact[text]) {
    return t(exact[text]);
  }
  const messageNumberPatterns = [
    [/^Message (#\d+) was sent\.$/, "userMessageNumberSent"],
    [/^Message (#\d+) was written to the peer route\.$/, "userMessageNumberWrittenToPeerRoute"],
    [/^Message (#\d+) is still saved\. Refresh the address, then retry or cancel\.$/, "userMessageNumberSavedRefresh"],
    [/^Message (#\d+) is still saved\.$/, "userMessageNumberSaved"],
    [/^Message (#\d+) is still saved\. Retry or cancel it from the conversation\.$/, "userMessageNumberSavedRetryCancel"],
    [/^Message (#\d+) is still saved\. Retry when the room is ready\.$/, "userMessageNumberSavedRetryWhenReady"],
  ];
  for (const [pattern, key] of messageNumberPatterns) {
    const match = text.match(pattern);
    if (match) {
      return formatTemplate(key, { number: match[1] });
    }
  }
  return localizedChatStatus(text);
}

function localizedTwoProfileUserView(view) {
  return {
    state: localizedChatStatus(view?.state),
    profiles: localizedTwoProfileUserViewText(view?.profiles),
    session: localizedTwoProfileUserViewText(view?.session),
    message: localizedTwoProfileUserViewText(view?.message),
    boundary: localizedTwoProfileUserViewText(view?.boundary),
  };
}

function localizedBoundaryStatus(message) {
  const text = String(message ?? "").trim();
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  const exact = {
    "no secure-release claim": "noSecureReleaseClaim",
    "no runtime messaging path": "noRuntimeMessagingPath",
    "core boundary only": "coreBoundaryOnly",
    "profile boundary only": "profileBoundaryOnly",
    "pairing boundary only": "pairingBoundaryOnly",
    "snow noise xx synchronous evaluation boundary only": "productionSessionBoundary",
    "cli production boundary self-test only": "productionSelfTestBoundary",
    "read-only production skeleton blockers copy": "productionPreflightValue",
    "store-write adapter boundary; product unlock available durable persistence pending":
      "sessionDurableStateValue",
    "passphrase-first high-risk policy os-keystore-only rejected": "sessionUnlockPolicyValue",
    "cli production unlock disabled; desktop product unlock available": "sessionUnlockRejectionValue",
    "pre-network fail-closed only": "transportValue",
    "network execution disabled": "networkExecutionValue",
    "network execution disabled in browser preview": "networkExecutionValue",
    "manual bootstrap gate summary only": "experimentalTransportValue",
    "hosting stream envelope messaging disabled": "transportIoValue",
    "adrec1 storage spike only": "storageValue",
    "lightweight checks only": "verificationValue",
    "browser preview boundary only": "browserPreviewBoundaryValue",
    "browser preview mock only": "browserPreviewMockValue",
    "browser preview mock": "browserPreviewMockValue",
    "browser preview does not verify production security": "browserPreviewNoSecurityValue",
    "browser preview passphrase placeholder": "browserPreviewPassphraseValue",
    "browser preview does not unlock product storage": "browserPreviewNoUnlockValue",
    "browser preview no cli": "browserPreviewNoCliValue",
    "browser preview no transport": "browserPreviewNoTransportValue",
    "browser localstorage preview only": "browserPreviewLocalStorageValue",
    "browser ui preview only": "browserPreviewUiValue",
    "transport_io=false runtime=false": "browserPreviewTransportIoValue",
  };
  if (exact[normalized]) {
    return t(exact[normalized]);
  }
  if (normalized.includes("session e2ee false")) {
    return t("preflightBlockersValue");
  }
  if (normalized.includes("no production e2ee claim")) {
    return t("productionSessionLimitsValue");
  }
  if (normalized.includes("product unlock durable persistence")) {
    return t("sessionUnlockLimitsValue");
  }
  if (normalized.includes("storage_opened=false")) {
    return t("unlockRejectionFlagsValue");
  }
  if (normalized.includes("network-disabled") || normalized.includes("censorship-or-bridge-required")) {
    return t("bootstrapStatusValue");
  }
  return text;
}

function localizedManualStatus(message) {
  const text = String(message ?? "").trim();
  if (!text || currentLanguage !== "ko") {
    return text;
  }
  const lower = text.toLowerCase();
  const subjectMap = [
    ["pairing payload", "페어링 정보"],
    ["session draft", "세션 초안"],
    ["session state", "세션 상태"],
    ["safety check", "안전 번호 확인"],
    ["handshake init", "핸드셰이크 시작값"],
    ["handshake reply", "핸드셰이크 응답값"],
    ["handshake finish", "핸드셰이크 완료값"],
    ["handshake import", "핸드셰이크 가져오기"],
    ["handshake step", "핸드셰이크 단계"],
    ["message envelope", "메시지 봉투"],
    ["message export", "메시지 내보내기"],
    ["message import", "메시지 가져오기"],
    ["received message", "받은 메시지"],
    ["received export", "받은 메시지 확인"],
    ["transcript load", "대화 불러오기"],
    ["transcript recovery", "대화 복구"],
    ["stored transcript", "저장된 대화"],
    ["remote envelope slot", "상대 메시지 슬롯"],
    ["envelope store", "메시지 저장"],
    ["envelope relay", "메시지 전달"],
    ["roundtrip", "왕복 테스트"],
    ["profile", "프로필"],
  ];
  const stateMap = [
    ["needs profile and payload", "manualStateNeedsInput"],
    ["needs profile and envelope", "manualStateNeedsInput"],
    ["needs profile", "manualStateNeedsInput"],
    ["needs payloads", "manualStateNeedsInput"],
    ["needs payload", "manualStateNeedsInput"],
    ["needs envelope", "manualStateNeedsInput"],
    ["needs input", "manualStateNeedsInput"],
    ["needs init", "manualStateNeedsInput"],
    ["needs reply", "manualStateNeedsInput"],
    ["needs finish", "manualStateNeedsInput"],
    ["needs safety check", "manualStateNeedsInput"],
    ["needs supported peer", "manualStateNeedsInput"],
    ["blocked", "manualStateBlocked"],
    ["exporting", "manualStateRunning"],
    ["importing", "manualStateRunning"],
    ["saving", "manualStateRunning"],
    ["checking", "manualStateRunning"],
    ["loading", "manualStateRunning"],
    ["running", "manualStateRunning"],
    ["applied", "manualStateApplied"],
    ["stored", "manualStateStored"],
    ["loaded", "manualStateLoaded"],
    ["relayed", "manualStateRelayed"],
    ["exported", "manualStateExported"],
    ["imported", "manualStateImported"],
    ["completed", "manualStateCompleted"],
    ["checked", "manualStateChecked"],
    ["saved", "manualStateSaved"],
    ["recovered", "manualStateRecovered"],
    ["unavailable", "manualStateUnavailable"],
    ["expired", "manualStateExpired"],
    ["ready", "manualStateReady"],
    ["idle", "waiting"],
    ["failed", "manualStateFailed"],
  ];
  const subject = subjectMap.find(([pattern]) => lower.includes(pattern))?.[1] ?? text;
  const stateKey = stateMap.find(([pattern]) => lower.includes(pattern))?.[1];
  return stateKey ? `${subject} ${t(stateKey)}` : text;
}

function applyTheme(theme) {
  const mode = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = mode;
  if (fields.themeToggle) {
    fields.themeToggle.textContent = mode === "dark" ? t("darkMode") : t("lightMode");
    fields.themeToggle.setAttribute("aria-pressed", String(mode === "dark"));
  }
}

function applyLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  localStoreSet(languageStorageKey, currentLanguage);
  if (fields.languageSelector) {
    fields.languageSelector.value = currentLanguage;
  }
  applyStaticTranslations(document, currentLanguage);
  applyTheme(document.documentElement.dataset.theme);
  renderSavedInviteRooms();
  renderSavedRoomMetadataSyncStatus();
  renderProductionTwoProfileConversationList();
  renderRoomIdentityBar(productionTwoProfileInput(), twoProfileSessionsReadyForInput(productionTwoProfileInput()));
  renderRoomStatusSummary(productionTwoProfileInput(), twoProfileSessionsReadyForInput(productionTwoProfileInput()));
  renderPrototypeStatus();
  renderMessageTtlControlOptions();
  renderProductionTwoProfileFlow(productionTwoProfileInput());
  renderProductionTwoProfileDirection(productionTwoProfileInput());
  rerenderLatestChatDeliveryNotice(productionTwoProfileInput());
  applyProductionActionState();
}

function initializeLanguage() {
  applyLanguage(currentLanguage);
}

function initializeTheme() {
  const savedTheme = localStoreGet(themeStorageKey);
  applyTheme(savedTheme === "light" ? "light" : "dark");
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStoreSet(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
}

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
  if (node === fields.productionTwoProfileWarning) {
    updateChatDeliveryNoticeFromText(value);
  }
}

function isCurrentInviteCodeNoticeKey(key = latestChatDeliveryNoticeKey) {
  return key === "inviteCodeReadyNotice" || key === "receivedInviteCodeReadyNotice";
}

function isLocalPrivateRouteCodeNoticeKey(key = latestChatDeliveryNoticeKey) {
  return (
    key === "privateRouteCodeReady" ||
    key === "privateRouteCodeReadyForReceive" ||
    key === "privateRouteCodeCopied"
  );
}

function privateRouteRecoveryNoticeActive(key = latestChatDeliveryNoticeKey) {
  return (
    key === latestChatDeliveryNoticeKey &&
    chatDeliveryNoticeMatchesInput(productionTwoProfileInput()) &&
    (key === "sendRuntimeMismatch" ||
      key === "privateRouteCodeReady" ||
      key === "privateRouteWaitingPeerCode" ||
      key === "privateRouteCodeReadyForReceive" ||
      key === "peerPrivateRouteCodeMissing")
  );
}

function chatDeliveryNoticeRoomFingerprint(input = productionTwoProfileInput()) {
  return input.profileA && input.profileB && input.profileA !== input.profileB && input.passphrase
    ? twoProfileSessionStatusFingerprint(input)
    : "";
}

function chatDeliveryNoticeMatchesInput(input = productionTwoProfileInput()) {
  return latestChatDeliveryNoticeRoomFingerprint === chatDeliveryNoticeRoomFingerprint(input);
}

function clearLatestChatDeliveryNoticeState() {
  latestChatDeliveryNoticeKey = "";
  latestChatDeliveryNoticeTone = "neutral";
  latestChatDeliveryNoticeRoomFingerprint = "";
  latestChatDeliveryNoticePendingOutbound = null;
}

function clearMismatchedChatDeliveryNotice(input = productionTwoProfileInput()) {
  if (!latestChatDeliveryNoticeKey || chatDeliveryNoticeMatchesInput(input)) {
    return false;
  }
  setChatDeliveryNoticeByKey("", "neutral", input);
  return true;
}

function setChatDeliveryNotice(message = "", tone = "neutral", options = {}) {
  if (!fields.chatDeliveryNotice) {
    return;
  }
  const text = String(message ?? "").trim();
  const pendingEntry = options.pendingEntry ?? null;
  const primaryAction = pendingEntry ? currentTwoProfileOutboundPrimaryAction(pendingEntry) : null;
  fields.chatDeliveryNotice.className = [
    "chat-delivery-notice",
    text ? "is-visible" : "",
    tone ? `is-${tone}` : "",
    primaryAction ? outboundRecoveryClass(primaryAction, productionTwoProfileOutboundStatusLabel(pendingEntry)) : "",
  ]
    .filter(Boolean)
    .join(" ");
  fields.chatDeliveryNotice.replaceChildren();
  if (!text) {
    return;
  }
  const statusLabel = document.createElement("strong");
  statusLabel.className = "chat-delivery-notice-label";
  statusLabel.textContent = t(primaryAction ? "sendRecoveryPanelTitle" : "roomStatusLabel");
  const messageText = document.createElement("span");
  messageText.className = "chat-delivery-notice-text";
  messageText.textContent = text;
  fields.chatDeliveryNotice.append(statusLabel, messageText);
  if (primaryAction) {
    const outboundActionState = currentTwoProfileOutboundActionState(
      pendingEntry,
      productionTwoProfileInput(),
      twoProfileInviteCodeModeActive(),
    );
    const reason = document.createElement("span");
    reason.className = "chat-delivery-notice-chip";
    reason.textContent = t(outboundRecoveryReasonKey(primaryAction, productionTwoProfileOutboundStatusLabel(pendingEntry)));
    const next = document.createElement("span");
    next.className = "chat-delivery-notice-chip is-next";
    next.textContent = outboundActionState.canRunNow
      ? `${t("sendRecoveryNext")}: ${outboundPrimaryActionLabel(primaryAction)}`
      : outboundActionState.disabledReason;
    const actions = document.createElement("span");
    actions.className = "chat-delivery-notice-actions";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "chat-delivery-notice-action";
    retry.textContent = outboundPrimaryActionLabel(primaryAction);
    retry.disabled = !outboundActionState.canRunNow;
    retry.title = outboundActionState.disabledReason || "";
    retry.addEventListener("click", () => {
      const current = currentTwoProfileOutboundAction(pendingEntry, { requireNoticeMatch: true });
      if (current) {
        runTwoProfileOutboundPrimaryAction(current.entry, current.primaryAction);
      }
    });
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "chat-delivery-notice-action is-cancel";
    cancel.textContent = t("cancelSend");
    cancel.disabled = !outboundActionState.canCancelNow;
    cancel.title = outboundActionState.cancelDisabledReason || "";
    cancel.addEventListener("click", () => {
      const currentEntry = currentTwoProfileOutboundCancelableEntry(pendingEntry, { requireNoticeMatch: true });
      if (currentEntry) {
        cancelTwoProfileOutboundEntry(currentEntry);
      }
    });
    actions.append(retry, cancel);
    fields.chatDeliveryNotice.append(reason, next, actions);
    return;
  }
  if (latestChatDeliveryNoticeKey === "privateDeliveryRouteNeeded") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = t("preparePrivateRoute");
    action.addEventListener("click", () => preparePrivateDeliveryRoute({ allowRetryRecovery: false }));
    fields.chatDeliveryNotice.append(action);
  } else if (latestChatDeliveryNoticeKey === "sendRuntimeMismatch") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = t("preparePrivateRoute");
    action.addEventListener("click", () => preparePrivateDeliveryRoute({ forceRefresh: true, allowRetryRecovery: false }));
    fields.chatDeliveryNotice.append(action);
  } else if (
    (latestChatDeliveryNoticeKey === "peerPrivateRouteCodeMissing" ||
      latestChatDeliveryNoticeKey === "privateRouteWaitingPeerCode") &&
    currentActiveLocalPrivateRouteCode()
  ) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = t("copyPrivateRouteCode");
    action.addEventListener("click", copyLocalPrivateRouteCode);
    fields.chatDeliveryNotice.append(action);
  } else if (latestChatDeliveryNoticeKey === "privateDeliveryRouteReady") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = productionTwoProfileReceiveMatchesInput(productionTwoProfileInput())
      ? t("roomActionSend")
      : t("startReceiving");
    action.addEventListener("click", () => {
      const input = productionTwoProfileInput();
      if (!chatDeliveryNoticeMatchesInput(input)) {
        return;
      }
      if (productionTwoProfileReceiveMatchesInput(input)) {
        fields.productionTwoProfileMessage?.focus?.({ preventScroll: true });
        return;
      }
      startProductionTwoProfileOnionReceive();
    });
    fields.chatDeliveryNotice.append(action);
  } else if (
    latestChatDeliveryNoticeKey === "messageSavedPrivateDeliveryOff" ||
    latestChatDeliveryNoticeKey === "chatNoticeNetworkPermission"
  ) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = t("enablePrivateDelivery");
    action.addEventListener("click", () => enablePrivateDeliveryPermission());
    fields.chatDeliveryNotice.append(action);
  } else if (latestChatDeliveryNoticeKey === "sendLockedUntilVerified") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = t("comparePhraseAction");
    action.addEventListener("click", focusSafetyConfirmation);
    fields.chatDeliveryNotice.append(action);
  } else if (
    latestChatDeliveryNoticeKey === "chatNoticeReceiveStopped" ||
    latestChatDeliveryNoticeKey === "receiveStartFailed"
  ) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = t("startReceiving");
    action.addEventListener("click", startProductionTwoProfileOnionReceive);
    fields.chatDeliveryNotice.append(action);
  } else if (latestChatDeliveryNoticeKey === "receiveRuntimeMismatch") {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = t("stopReceiving");
    action.addEventListener("click", stopProductionTwoProfileOnionReceive);
    fields.chatDeliveryNotice.append(action);
  } else if (isLocalPrivateRouteCodeNoticeKey() && currentActiveLocalPrivateRouteCode()) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "chat-delivery-notice-action";
    action.textContent = t("copyPrivateRouteCode");
    action.addEventListener("click", copyLocalPrivateRouteCode);
    fields.chatDeliveryNotice.append(action);
  }
}

function currentTwoProfileOutboundAction(entry, options = {}) {
  const input = productionTwoProfileInput();
  if (options.requireNoticeMatch === true && !chatDeliveryNoticeMatchesInput(input)) {
    return null;
  }
  if (options.requireNoticeMatch === true && !chatDeliveryNoticePendingOutboundMatchesEntry(entry, input)) {
    return null;
  }
  if (options.requireCurrentInput === true && !twoProfileConversationEntryMatchesCurrentInput(entry, input)) {
    return null;
  }
  const currentEntry = currentTwoProfileRetryableOutboundEntry(entry);
  if (!currentEntry) {
    return null;
  }
  const outboundActionState = currentTwoProfileOutboundActionState(
    currentEntry,
    input,
    twoProfileInviteCodeModeActive(),
  );
  if (!outboundActionState.canRunNow) {
    return null;
  }
  return {
    entry: currentEntry,
    primaryAction: currentTwoProfileOutboundPrimaryAction(currentEntry, input),
  };
}

function currentTwoProfileOutboundCancelableEntry(entry, options = {}) {
  const input = productionTwoProfileInput();
  if (options.requireNoticeMatch === true && !chatDeliveryNoticeMatchesInput(input)) {
    return null;
  }
  if (options.requireNoticeMatch === true && !chatDeliveryNoticePendingOutboundMatchesEntry(entry, input)) {
    return null;
  }
  if (options.requireCurrentInput === true && !twoProfileConversationEntryMatchesCurrentInput(entry, input)) {
    return null;
  }
  const currentEntry = currentTwoProfileRetryableOutboundEntry(entry);
  if (!currentEntry) {
    return null;
  }
  const outboundActionState = currentTwoProfileOutboundActionState(
    currentEntry,
    input,
    twoProfileInviteCodeModeActive(),
  );
  return outboundActionState.canCancelNow ? currentEntry : null;
}

function setChatDeliveryNoticeByKey(key, tone = "neutral", input = productionTwoProfileInput()) {
  latestChatDeliveryNoticeKey = key || "";
  latestChatDeliveryNoticeTone = tone || "neutral";
  latestChatDeliveryNoticeRoomFingerprint = key ? chatDeliveryNoticeRoomFingerprint(input) : "";
  latestChatDeliveryNoticePendingOutbound = null;
  setChatDeliveryNotice(key ? t(key) : "", tone);
}

function setChatDeliveryNoticeForPendingOutbound(entry, input = productionTwoProfileInput()) {
  const primaryAction = currentTwoProfileOutboundPrimaryAction(entry, input);
  latestChatDeliveryNoticeKey = primaryAction.noticeKey || "sendFailedGeneric";
  latestChatDeliveryNoticeTone = primaryAction.action === "enable-private-delivery" ? "muted" : "warning";
  latestChatDeliveryNoticeRoomFingerprint = chatDeliveryNoticeRoomFingerprint(input);
  latestChatDeliveryNoticePendingOutbound = {
    roomFingerprint: String(entry?.roomFingerprint ?? twoProfileSessionStatusFingerprint(input)).trim(),
    sender: String(entry?.sender ?? "").trim(),
    receiver: String(entry?.receiver ?? "").trim(),
    messageNumber: Number.parseInt(entry?.messageNumber, 10) || 0,
    message: String(entry?.message ?? "").trim(),
  };
  setChatDeliveryNotice(t(primaryAction.recoveryKey || "sendRecoveryGeneric"), latestChatDeliveryNoticeTone, {
    pendingEntry: entry,
  });
}

function chatDeliveryNoticePendingOutboundMatchesEntry(entry, input = productionTwoProfileInput()) {
  const pending = latestChatDeliveryNoticePendingOutbound;
  if (!pending || !entry || !chatDeliveryNoticeMatchesInput(input)) {
    return false;
  }
  return (
    String(entry.roomFingerprint ?? "").trim() === String(pending.roomFingerprint ?? "").trim() &&
    String(entry.sender ?? "").trim().toLowerCase() === String(pending.sender ?? "").trim().toLowerCase() &&
    String(entry.receiver ?? "").trim().toLowerCase() === String(pending.receiver ?? "").trim().toLowerCase() &&
    Number.parseInt(entry.messageNumber, 10) === Number.parseInt(pending.messageNumber, 10) &&
    String(entry.message ?? "").trim() === String(pending.message ?? "").trim()
  );
}

function restoreLatestChatDeliveryPendingOutbound(input = productionTwoProfileInput()) {
  const pending = latestChatDeliveryNoticePendingOutbound;
  if (!pending || !chatDeliveryNoticeMatchesInput(input)) {
    return null;
  }
  const entry = currentTwoProfileRetryableOutboundEntry(pending);
  if (!entry) {
    return null;
  }
  const sender = String(entry.sender ?? "").trim();
  const receiver = String(entry.receiver ?? "").trim();
  const message = String(entry.message ?? "").trim();
  const roomFingerprint = String(entry.roomFingerprint ?? "").trim();
  if (
    roomFingerprint !== String(pending.roomFingerprint ?? "").trim() ||
    sender !== String(pending.sender ?? "").trim() ||
    receiver !== String(pending.receiver ?? "").trim() ||
    message !== String(pending.message ?? "").trim()
  ) {
    return null;
  }
  return entry;
}

function chatDeliveryPendingOutboundSnapshot(input = productionTwoProfileInput()) {
  if (!latestChatDeliveryNoticePendingOutbound || !chatDeliveryNoticeMatchesInput(input)) {
    return null;
  }
  return { ...latestChatDeliveryNoticePendingOutbound };
}

function restoreChatDeliveryPendingOutboundSnapshot(snapshot, input = productionTwoProfileInput()) {
  if (!snapshot || chatDeliveryNoticeRoomFingerprint(input) !== String(snapshot.roomFingerprint ?? "").trim()) {
    return false;
  }
  const entry = currentTwoProfileRetryableOutboundEntry(snapshot);
  if (!entry) {
    return false;
  }
  setChatDeliveryNoticeForPendingOutbound(entry, input);
  return true;
}

function rerenderLatestChatDeliveryNotice(input = productionTwoProfileInput()) {
  if (!latestChatDeliveryNoticeKey) {
    return false;
  }
  if (!chatDeliveryNoticeMatchesInput(input)) {
    setChatDeliveryNoticeByKey("", "neutral", input);
    return true;
  }
  if (latestChatDeliveryNoticePendingOutbound) {
    const pending = restoreLatestChatDeliveryPendingOutbound(input);
    if (pending) {
      setChatDeliveryNoticeForPendingOutbound(pending, input);
      return true;
    }
    showCurrentRetryableOutboundMissing(latestChatDeliveryNoticePendingOutbound);
    return true;
  }
  setChatDeliveryNoticeByKey(latestChatDeliveryNoticeKey, latestChatDeliveryNoticeTone, input);
  return true;
}

function currentTwoProfileOutboundPrimaryAction(entry, input = productionTwoProfileInput()) {
  const primaryAction = productionTwoProfileOutboundPrimaryAction(entry);
  const routeReadiness = externalPeerSendReadiness(input, { allowMissingMessage: true });
  if (!routeReadiness.ready) {
    if (routeReadiness.nextAction === "enable-private-delivery") {
      return {
        action: "enable-private-delivery",
        labelKey: "enablePrivateDelivery",
        noticeKey: "chatNoticeNetworkPermission",
        recoveryKey: "sendRecoveryPermissionOff",
      };
    }
    if (routeReadiness.nextAction === "start-receiving") {
      if (routeReadinessReceiveRuntimeMismatch(routeReadiness)) {
        return {
          action: "stop-receiving",
          labelKey: "stopReceiving",
          noticeKey: "receiveRuntimeMismatch",
          recoveryKey: "sendRecoveryRuntimeMismatch",
        };
      }
      if (routeReadinessReceiveStopPending(routeReadiness)) {
        return {
          action: "wait-receive-stop",
          labelKey: "receiveStopPending",
          noticeKey: "receiveStopPending",
          recoveryKey: "receiveStopPending",
        };
      }
      return {
        action: "start-receiving",
        labelKey: "startReceiving",
        noticeKey: "chatNoticeReceiveStopped",
        recoveryKey: "sendRecoveryStartReceiving",
      };
    }
    if (routeReadiness.nextAction === "verify") {
      return {
        action: "verify",
        labelKey: "comparePhraseAction",
        noticeKey: "sendLockedUntilVerified",
        recoveryKey: "sendLockedUntilVerified",
      };
    }
    if (routeReadiness.nextAction === "refresh-endpoint") {
      if (routeReadiness.peerEndpointState?.stale) {
        return {
          action: "refresh-and-retry",
          labelKey: "refreshAndRetry",
          noticeKey: "chatNoticeRefreshAddress",
          recoveryKey: "sendRecoveryStaleEndpoint",
        };
      }
      return {
        action: "prepare-private-route",
        labelKey: "preparePrivateRoute",
        noticeKey: "privateDeliveryRouteNeeded",
        recoveryKey: "sendRecoveryRouteMissing",
      };
    }
  }
  const peerEndpointState = twoProfilePeerEndpointState(input);
  if (primaryAction.action === "enable-private-delivery" && manualNetworkPermissionEnabled()) {
    if (!peerEndpointState.ready) {
      if (peerEndpointState.stale) {
        return {
          action: "refresh-and-retry",
          labelKey: "refreshAndRetry",
          noticeKey: "chatNoticeRefreshAddress",
          recoveryKey: "sendRecoveryStaleEndpoint",
        };
      }
      return {
        action: "prepare-private-route",
        labelKey: "preparePrivateRoute",
        noticeKey: "privateDeliveryRouteNeeded",
        recoveryKey: "sendRecoveryRouteMissing",
      };
    }
    return {
      action: "retry",
      labelKey: "retrySend",
      noticeKey: "sendFailedGeneric",
      recoveryKey: "sendRecoveryGeneric",
    };
  }
  if (primaryAction.action === "refresh-and-retry" && peerEndpointState.ready) {
    return {
      action: "retry",
      labelKey: "retrySend",
      noticeKey: "sendFailedGeneric",
      recoveryKey: "sendRecoveryGeneric",
    };
  }
  if (primaryAction.action === "prepare-private-route" && peerEndpointState.ready) {
    return {
      action: "retry",
      labelKey: "retrySend",
      noticeKey: "sendFailedGeneric",
      recoveryKey: "sendRecoveryGeneric",
    };
  }
  return primaryAction;
}

function currentTwoProfileOutboundActionState(entry, input = productionTwoProfileInput(), inviteCodeMode = twoProfileInviteCodeModeActive()) {
  const state = productionTwoProfileOutboundActionState(entry, input, inviteCodeMode);
  if (!state.showActions || !productionTwoProfileReceiveStoppingInOtherRoom(input)) {
    return state;
  }
  return {
    ...state,
    canRunNow: false,
    disabledReason: t("receiveStopPending"),
  };
}

function outboundPrimaryActionLabel(primaryAction) {
  return t(primaryAction?.labelKey || "retrySend");
}

async function restoreInviteRoomForConversationEntry(entry) {
  const expectedFingerprint = String(entry?.roomFingerprint ?? "").trim();
  if (!expectedFingerprint || twoProfileSessionStatusFingerprint(productionTwoProfileInput()) === expectedFingerprint) {
    return true;
  }
  const room = savedInviteRoomForRoomFingerprint(expectedFingerprint);
  if (!room) {
    setSelectedTwoProfileConversationEntry(entry);
    setProductionTwoProfileState("Retry send needs saved room");
    setText(
      fields.productionTwoProfileWarning,
      currentLanguage === "ko"
        ? "이 메시지가 속한 저장된 방을 먼저 다시 여세요."
        : "Reopen the saved room for this message before retrying.",
    );
    return false;
  }
  return openSavedInviteRoom(room);
}

function currentTwoProfileRetryableOutboundEntry(entry) {
  const currentEntry = entry
    ? productionTwoProfileConversationEntries.get(twoProfileConversationKey(entry)) ?? null
    : null;
  return currentEntry && twoProfileConversationOutboundRetryable(currentEntry) ? currentEntry : null;
}

function twoProfileConversationEntryMatchesCurrentInput(entry, input = productionTwoProfileInput()) {
  return Boolean(
    entry &&
      String(entry.roomFingerprint ?? "").trim() === twoProfileSessionStatusFingerprint(input) &&
      String(entry.sender ?? "").trim().toLowerCase() === String(input.profileA ?? "").trim().toLowerCase() &&
      String(entry.receiver ?? "").trim().toLowerCase() === String(input.profileB ?? "").trim().toLowerCase(),
  );
}

function currentTwoProfileRetryableOutboundEntryForMessage(input = productionTwoProfileInput(), messageNumber = null) {
  const normalizedNumber = Number.parseInt(messageNumber, 10);
  if (!Number.isInteger(normalizedNumber) || normalizedNumber < 1) {
    return null;
  }
  return (
    [...productionTwoProfileConversationEntries.values()].find(
      (entry) =>
        twoProfileConversationEntryMatchesOutbound(entry, input, normalizedNumber) &&
        twoProfileConversationOutboundRetryable(entry),
    ) ?? null
  );
}

function rememberPrivateRouteFollowupForOutboundRetry(entry, input = productionTwoProfileInput()) {
  if (!entry) {
    return false;
  }
  rememberPrivateRouteFollowup("retry-outbound", input, {
    sender: entry.sender,
    receiver: entry.receiver,
    messageNumber: entry.messageNumber,
    message: entry.message,
  });
  return true;
}

function showExactRetryableOutboundPrompt(entry, input = productionTwoProfileInput()) {
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return false;
  }
  const currentEntry = currentTwoProfileRetryableOutboundEntry(entry);
  if (!currentEntry) {
    return false;
  }
  setSelectedTwoProfileConversationEntry(currentEntry);
  setText(fields.productionTwoProfileWarning, retryableTwoProfileOutboundWarning(currentEntry));
  showRetryableTwoProfileOutboundNotice(currentEntry);
  setProductionFollowupActions(true, selectedTwoProfileNextActionMessage(currentEntry));
  applyProductionActionState();
  refreshFieldTestReport();
  return true;
}

function showRetryableOutboundPromptForMessage(input = productionTwoProfileInput(), messageNumber = null) {
  const entry = currentTwoProfileRetryableOutboundEntryForMessage(input, messageNumber);
  return entry ? showExactRetryableOutboundPrompt(entry, input) : false;
}

function showCurrentRetryableOutboundMissing(entry) {
  setSelectedTwoProfileConversationEntry(null, { render: false });
  rememberCurrentInviteRoomMetadata();
  renderProductionTwoProfileConversationList();
  renderSavedInviteRooms();
  setProductionTwoProfileState("No pending send");
  setText(
    fields.productionTwoProfileWarning,
    currentLanguage === "ko"
      ? "선택한 전송 대기 메시지는 더 이상 없습니다. 대화를 확인하거나 새 메시지를 작성하세요."
      : "The selected pending send is no longer available. Review the conversation or write a new message.",
  );
  clearLatestChatDeliveryNoticeState();
  setChatDeliveryNotice(
    currentLanguage === "ko"
      ? "선택한 전송 대기 메시지는 더 이상 없습니다."
      : "The selected pending send is no longer available.",
    "muted",
  );
  setProductionFollowupActions(
    true,
    currentLanguage === "ko"
      ? "다음: 대화를 확인하거나 새 메시지를 작성하세요."
      : "Next: review the conversation or write a new message.",
  );
  refreshFieldTestReport();
  return false;
}

async function runTwoProfileOutboundPrimaryAction(entry) {
  if (!(await restoreInviteRoomForConversationEntry(entry))) {
    return;
  }
  const resolvedEntry = currentTwoProfileRetryableOutboundEntry(entry);
  if (!resolvedEntry) {
    showCurrentRetryableOutboundMissing(entry);
    return;
  }
  const outboundActionState = currentTwoProfileOutboundActionState(
    resolvedEntry,
    productionTwoProfileInput(),
    twoProfileInviteCodeModeActive(),
  );
  if (!outboundActionState.canRunNow) {
    selectTwoProfileOutboundActionDirection(resolvedEntry, "retry");
    return;
  }
  const resolvedPrimaryAction = currentTwoProfileOutboundPrimaryAction(resolvedEntry);
  if (resolvedPrimaryAction.action === "enable-private-delivery") {
    selectTwoProfileOutboundActionDirection(resolvedEntry, "retry");
    rememberPrivateRouteFollowupForOutboundRetry(resolvedEntry);
    enablePrivateDeliveryPermission({ preserveFollowup: true });
    return;
  }
  if (resolvedPrimaryAction.action === "start-receiving") {
    selectTwoProfileOutboundActionDirection(resolvedEntry, "retry");
    rememberPrivateRouteFollowupForOutboundRetry(resolvedEntry);
    await startProductionTwoProfileOnionReceive({ preserveFollowup: true });
    if (productionTwoProfileReceiveMatchesInput(productionTwoProfileInput())) {
      const currentInput = productionTwoProfileInput();
      if (!showPrivateRouteRetryFollowupPrompt(currentInput, { clear: true })) {
        showRetryableOutboundPromptForMessage(currentInput, resolvedEntry.messageNumber);
      }
    }
    return;
  }
  if (resolvedPrimaryAction.action === "wait-receive-stop") {
    selectTwoProfileOutboundActionDirection(resolvedEntry, "retry");
    showSavedInviteRoomReceiveStopPending();
    return;
  }
  if (resolvedPrimaryAction.action === "stop-receiving") {
    selectTwoProfileOutboundActionDirection(resolvedEntry, "retry");
    rememberPrivateRouteFollowupForOutboundRetry(resolvedEntry);
    stopProductionTwoProfileOnionReceive();
    return;
  }
  if (resolvedPrimaryAction.action === "verify") {
    selectTwoProfileOutboundActionDirection(resolvedEntry, "retry");
    focusSafetyConfirmation();
    return;
  }
  if (resolvedPrimaryAction.action === "prepare-private-route") {
    selectTwoProfileOutboundActionDirection(resolvedEntry, "retry");
    rememberPrivateRouteFollowupForOutboundRetry(resolvedEntry);
    await preparePrivateDeliveryRoute();
    return;
  }
  if (resolvedPrimaryAction.action === "refresh-and-retry") {
    await refreshTwoProfileOutboundEndpointThenRetry(resolvedEntry);
    return;
  }
  await retryTwoProfileOutboundEntry(resolvedEntry);
}

function outboundRecoveryClass(primaryAction, statusLabel = "") {
  const status = String(statusLabel ?? "").trim().toLowerCase();
  if (primaryAction?.action === "enable-private-delivery") {
    return "is-permission-needed";
  }
  if (
    primaryAction?.action === "start-receiving" ||
    primaryAction?.action === "stop-receiving" ||
    status === "receive stopped"
  ) {
    return "is-route-needed";
  }
  if (primaryAction?.action === "wait-receive-stop") {
    return "is-route-needed";
  }
  if (status === "route missing") {
    return "is-route-needed";
  }
  if (primaryAction?.action === "prepare-private-route") {
    return "is-route-needed";
  }
  if (primaryAction?.action === "refresh-and-retry") {
    return "is-address-stale";
  }
  if (status === "send timeout") {
    return "is-timeout";
  }
  if (status === "peer offline") {
    return "is-peer-offline";
  }
  return "is-retryable-send";
}

function outboundRecoveryReasonKey(primaryAction, statusLabel = "") {
  const status = String(statusLabel ?? "").trim().toLowerCase();
  if (primaryAction?.recoveryKey === "sendRecoveryRuntimeMismatch") {
    return "sendReasonRuntimeMismatch";
  }
  if (primaryAction?.action === "enable-private-delivery") {
    return "sendReasonPermissionOff";
  }
  if (primaryAction?.action === "stop-receiving") {
    return "sendReasonRuntimeMismatch";
  }
  if (primaryAction?.action === "start-receiving" || status === "receive stopped") {
    return "sendReasonStartReceiving";
  }
  if (primaryAction?.action === "wait-receive-stop") {
    return "receiveStopPending";
  }
  if (status === "route missing") {
    return "sendReasonRouteMissing";
  }
  if (primaryAction?.action === "prepare-private-route") {
    return "sendReasonRouteMissing";
  }
  if (primaryAction?.action === "refresh-and-retry") {
    return "sendReasonStaleEndpoint";
  }
  if (status === "tor bootstrap") {
    return "sendReasonTorBootstrap";
  }
  if (status === "send timeout") {
    return "sendReasonTimeout";
  }
  if (status === "peer offline") {
    return "sendReasonPeerOffline";
  }
  return "sendReasonGeneric";
}

function updateChatDeliveryNoticeFromText(value) {
  const notice = chatNoticeForSendReceiveText(value);
  if (notice) {
    setChatDeliveryNoticeByKey(notice.key, notice.tone);
  }
}

function updateChatDeliveryNoticeFromState(message) {
  const notice = chatNoticeForProductionState(message);
  if (notice) {
    setChatDeliveryNoticeByKey(notice.key, notice.tone);
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
  setText(fields.productionRoundtripState, localizedManualStatus(message));
}

function setProductionTwoProfileState(message) {
  setText(fields.productionTwoProfileState, localizedChatStatus(message));
  updateChatDeliveryNoticeFromState(message);
}

function setProductionProfileState(message) {
  setText(fields.productionProfileState, localizedManualStatus(message));
}

function setProductionPairingState(message) {
  setText(fields.productionPairingState, localizedManualStatus(message));
}

function setProductionMessageState(message) {
  setText(fields.productionMessageState, localizedManualStatus(message));
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

function setFlowActionPriority(primaryNode, nodes = []) {
  const candidates = nodes.filter(Boolean);
  for (const node of candidates) {
    node.classList.remove("is-primary-flow-action", "is-secondary-flow-action");
  }
  const activePrimary = primaryNode && !primaryNode.disabled ? primaryNode : null;
  if (!activePrimary) {
    return;
  }
  for (const node of candidates) {
    if (node === activePrimary) {
      node.classList.add("is-primary-flow-action");
    } else if (!node.disabled) {
      node.classList.add("is-secondary-flow-action");
    }
  }
}

function currentInviteCodeForRoom() {
  return (fields.productionTwoProfileB?.value ?? "").trim();
}

function inviteCodeCopyIsNextAction() {
  const code = currentInviteCodeForRoom();
  return Boolean(code && connectionCodeRoleFor(code) === "inviter" && copiedInviteCode !== code);
}

function renderConnectionExchangeInstruction() {
}

function routeExchangePrimaryActionNode(input = productionTwoProfileInput()) {
  if (twoProfilePeerEndpointState(input).ready) {
    return null;
  }
  if (!currentActiveLocalPrivateRouteCode(input)) {
    return fields.preparePrivateRoute;
  }
  return (fields.peerPrivateRouteCode?.value ?? "").trim()
    ? fields.applyPeerPrivateRouteCode
    : fields.copyPrivateRouteCode;
}

function openChatSettingsPanel(focusTarget = fields.productionTwoProfileB) {
  const panel = document.querySelector(".system-settings-panel");
  if (panel) {
    panel.open = true;
  }
  document.body.classList.add("is-app-settings-open");
  fields.toggleChatSettings?.setAttribute("aria-expanded", "true");
  const setupPanel = document.querySelector(".chat-setup-controls");
  if (setupPanel && "open" in setupPanel) {
    setupPanel.open = true;
  }
  const targetDetails = focusTarget?.closest?.("details");
  if (targetDetails && "open" in targetDetails) {
    targetDetails.open = true;
  }
  const visibleFocusTarget = focusTarget && !focusTarget.hidden ? focusTarget : document.querySelector(".system-settings-panel > summary");
  visibleFocusTarget?.focus();
}

function openPrivateDeliverySettings(input = productionTwoProfileInput()) {
  openChatSettingsPanel(fields.roomNetworkPermission);
  document.querySelector(".network-permission-toggle")?.classList.add("is-attention");
  fields.roomNetworkPermission?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  setProductionTwoProfileState("Private delivery permission needed");
  setText(fields.productionTwoProfileWarning, t("privateDeliveryPermissionRequired"));
  setChatDeliveryNoticeByKey("chatNoticeNetworkPermission", "warning", input);
}

function realOnionRecoveryNeedsExplicitNetworkPreparation(recovery) {
  return (
    recovery?.action === "prepare-network-or-bridge" &&
    recovery?.reason !== "network-or-bridge-different-network"
  );
}

function realOnionRecoverySettingsLabelKey(recovery) {
  if (
    recovery?.reason === "network-or-bridge-transport" ||
    recovery?.reason === "network-or-bridge-invalid-transport" ||
    recovery?.reason === "network-or-bridge-refresh-transport"
  ) {
    return "bridgeTransportBinary";
  }
  return "bridgeConfig";
}

function realOnionRecoveryBridgeSettingsTarget(recovery) {
  if (
    recovery?.reason === "network-or-bridge-transport" ||
    recovery?.reason === "network-or-bridge-invalid-transport" ||
    recovery?.reason === "network-or-bridge-refresh-transport"
  ) {
    return fields.onionObfs4TransportBinaryPath ?? fields.onionBridgeConfigLines;
  }
  return fields.onionBridgeConfigLines ?? fields.onionObfs4TransportBinaryPath;
}

function realOnionRecoveryBridgeSettingsNoticeKey(recovery) {
  if (recovery?.reason === "network-or-bridge-refresh-transport") {
    return "fieldTestNextRefreshBridgeTransport";
  }
  if (recovery?.reason === "network-or-bridge-refresh-config") {
    return "fieldTestNextRefreshBridge";
  }
  if (
    recovery?.reason === "network-or-bridge-transport" ||
    recovery?.reason === "network-or-bridge-invalid-transport"
  ) {
    return "bridgeTransportInvalidStatus";
  }
  if (recovery?.reason === "network-or-bridge-invalid-config") {
    return "bridgeConfigInvalidStatus";
  }
  return "fieldTestNextPrepareNetworkOrBridge";
}

function realOnionRecoveryNoticeKey(recovery) {
  switch (recovery?.action) {
    case "enable-private-delivery":
      return "fieldTestNextEnablePrivateDelivery";
    case "retry-bootstrap":
    case "bootstrap-cancelled":
      return "fieldTestNextRetryNetwork";
    case "prepare-network-or-bridge":
      if (recovery?.reason === "network-or-bridge-different-network") {
        return "fieldTestNextDifferentNetwork";
      }
      return realOnionRecoveryBridgeSettingsNoticeKey(recovery);
    case "inspect-diagnostics":
      return "fieldTestNextInspectDiagnostics";
    case "retry-private-delivery":
      return "fieldTestNextRetryDelivery";
    default:
      return "";
  }
}

function realOnionRecoveryRunAction(recovery) {
  if (realOnionRecoveryNeedsExplicitNetworkPreparation(recovery)) {
    return {
      ready: true,
      labelKey: realOnionRecoverySettingsLabelKey(recovery),
      noticeKey: realOnionRecoveryBridgeSettingsNoticeKey(recovery),
      opensNetworkSettings: true,
    };
  }
  if (recovery?.action === "retry-bootstrap" || recovery?.action === "bootstrap-cancelled") {
    return {
      ready: true,
      labelKey: "retryNetwork",
      noticeKey: "fieldTestNextRetryNetwork",
      opensNetworkSettings: false,
    };
  }
  if (recovery?.action === "prepare-network-or-bridge") {
    return {
      ready: true,
      labelKey: recovery?.reason === "network-or-bridge-different-network"
        ? "fieldTestNextDifferentNetwork"
        : "retryNetwork",
      noticeKey: realOnionRecoveryNoticeKey(recovery) || "fieldTestNextRetryNetwork",
      opensNetworkSettings: false,
    };
  }
  if (recovery?.action === "inspect-diagnostics") {
    return {
      ready: true,
      labelKey: "fieldTestNextInspectDiagnostics",
      noticeKey: "fieldTestNextInspectDiagnostics",
      opensNetworkSettings: false,
      inspectDiagnostics: true,
    };
  }
  if (recovery?.action === "retry-private-delivery") {
    return {
      ready: true,
      labelKey: "retryPrivateDelivery",
      noticeKey: "fieldTestNextRetryDelivery",
      opensNetworkSettings: false,
    };
  }
  return {
    ready: false,
    labelKey: "runRealOnionRoundtrip",
    noticeKey: "",
    opensNetworkSettings: false,
  };
}

function openPrivateDeliveryBridgeSettings(recovery, input = productionTwoProfileInput()) {
  const target = realOnionRecoveryBridgeSettingsTarget(recovery);
  openChatSettingsPanel(target);
  target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  target?.focus?.({ preventScroll: true });
  setProductionTwoProfileState("Private delivery needs network change");
  setText(fields.productionTwoProfileWarning, t(realOnionRecoveryBridgeSettingsNoticeKey(recovery)));
  setChatDeliveryNoticeByKey(realOnionRecoveryBridgeSettingsNoticeKey(recovery), "warning", input);
}

function enablePrivateDeliveryPermission(options = {}) {
  setManualNetworkPermission(true);
  if (options.preserveFollowup !== true) {
    clearPrivateRouteFollowupForRoom(productionTwoProfileInput());
  }
  document.querySelector(".network-permission-toggle")?.classList.remove("is-attention");
  const input = productionTwoProfileInput();
  const sessionsReady = twoProfileSessionsReadyForInput(input);
  renderRoomIdentityBar(input, sessionsReady);
  renderRoomStatusSummary(input, sessionsReady);
  setProductionTwoProfileState("Private delivery permission enabled");
  const preservedRetryFollowup =
    options.preserveFollowup === true &&
    pendingPrivateRouteFollowup?.action === "retry-outbound" &&
    privateRouteFollowupMatchesRoom(input);
  if (preservedRetryFollowup) {
    if (showPrivateRouteRetryFollowupPrompt(input)) {
      return;
    }
    clearPrivateRouteFollowupForRoom(input);
  }
  if (sessionsReady && twoProfileSafetyConfirmedForInput(input) && !twoProfilePeerEndpointState(input).ready) {
    setText(fields.productionTwoProfileWarning, t("privateDeliveryRouteNeeded"));
    setChatDeliveryNoticeByKey("privateDeliveryRouteNeeded", "muted", input);
    fields.preparePrivateRoute?.focus?.({ preventScroll: true });
  } else if (sessionsReady && twoProfileSafetyConfirmedForInput(input) && receiveIntentForRoom(input)) {
    setText(fields.productionTwoProfileWarning, t("chatNoticeReceiveStopped"));
    setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "muted", input);
    fields.startProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
  } else {
    setText(fields.productionTwoProfileWarning, t("privateDeliveryRouteReady"));
    setChatDeliveryNoticeByKey("privateDeliveryRouteReady", "success", input);
  }
  refreshRouteReadinessNoticeAfterSessionRefresh(input, { allowRetryRecovery: false });
  applyProductionActionState();
}

function focusSafetyConfirmation() {
  document.querySelector(".safety-confirm-state")?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  fields.confirmTwoProfileSafety?.focus?.({ preventScroll: true });
}

function closeChatSettingsPanel() {
  const panel = document.querySelector(".chat-settings-panel");
  if (panel) {
    panel.open = false;
  }
  document.querySelector(".network-permission-toggle")?.classList.remove("is-attention");
  document.body.classList.remove("is-chat-settings-open");
  fields.toggleChatSettings?.setAttribute("aria-expanded", "false");
}

function closeAppSettingsPanel() {
  const panel = document.querySelector(".system-settings-panel");
  if (panel) {
    panel.open = false;
  }
  document.body.classList.remove("is-app-settings-open");
}

function updateConnectionWizard(input = productionTwoProfileInput()) {
  const steps = [...document.querySelectorAll(".connection-wizard-step[data-wizard-step]")];
  if (steps.length === 0) {
    return;
  }
  const activeStep = input.profileB ? "retention" : "code";
  const completeSteps = new Set();
  if (input.profileA && input.profileB && input.profileA !== input.profileB && input.passphrase && input.messageTtlSeconds) {
    completeSteps.add("code");
    completeSteps.add("retention");
  } else if (input.profileB) {
    completeSteps.add("code");
  }
  steps.forEach((step) => {
    const name = step.dataset.wizardStep;
    const current = name === activeStep;
    step.classList.toggle("is-current", current);
    step.classList.toggle("is-complete", !current && completeSteps.has(name));
    step.classList.toggle("is-locked", !current && !completeSteps.has(name));
  });
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
    return `${t("retentionPolicyUnavailable")}: ${productionMessageRetentionPolicy.error ?? "load failed"}`;
  }
  return currentLanguage === "ko"
    ? "보관 정책을 불러오는 중입니다. 메시지 작업은 잠시 사용할 수 없습니다."
    : "Message retention policy loading; message actions are disabled.";
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
    ? currentLanguage === "ko"
      ? "계속하려면 지원되는 보관 기간을 선택하세요."
      : "Select a supported message retention value before continuing."
    : messageRetentionPolicyBlocker();
}

function setOpenManualProductionToolsLabel(label = "Open manual tools") {
  setText(fields.openManualProductionTools, label);
}

function setReviewPendingTwoProfileLabel(label = "Review") {
  setText(fields.reviewPendingTwoProfileMessage, chatReviewButtonLabel(label));
}

function chatReplyButtonLabel(label = "Reply") {
  if (label === "Reply to latest" || label === "Use selected reply") {
    return t("reply");
  }
  if (label === "Reply target set") {
    return t("replyTarget");
  }
  return label === "Reply" ? t("reply") : label;
}

function chatReviewButtonLabel(label = "Review") {
  if (label === "Review pending") {
    return t("review");
  }
  if (label === "Open import tools") {
    return t("import");
  }
  if (label === "Open envelope input") {
    return t("envelope");
  }
  if (label === "Open export tools") {
    return t("export");
  }
  return label === "Review" ? t("review") : label;
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
  document.body.classList.add("is-developer-mode");
  if (fields.manualProductionTools) {
    fields.manualProductionTools.classList.add("is-revealed");
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
  fields.productionTwoProfileMessage.title = locked ? t("composeLocked") : "";
}

function setTwoProfileComposeCurrent(current) {
  fields.productionTwoProfileMessage?.classList.toggle("is-current-input", Boolean(current));
}

function setProductionFollowupActions(enabled, message) {
  fields.productionTwoProfileNextStep?.closest(".followup-actions")?.classList.toggle("is-revealed", enabled);
  setText(fields.productionTwoProfileNextStep, message);
  setOpenManualProductionToolsLabel();
  setActionButtonState(
    fields.openManualProductionTools,
    !enabled,
    t("followupLocked"),
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
  node.textContent = localizedChatStatus(message);
  node.classList.remove("is-ready", "is-setup", "is-compose", "is-blocked");
  node.classList.add(`is-${state}`);
}

function renderRoomIdentityBar(input, sessionsReady) {
  const hasConnectionCode = Boolean(input.profileA && input.profileB && input.profileA !== input.profileB);
  const route = hasConnectionCode
    ? t(connectionDeviceRoleKey() || "roomDeviceReady")
    : t("roomDeviceMissing");
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  const activeEndpointState = twoProfilePeerEndpointState(input);
  const safetyConfirmed = sessionsReady && twoProfileSafetyConfirmedForInput(input);
  const pairState = sessionsReady
    ? t("roomReady")
    : sessionStatus
      ? t("roomNeedsCreate")
      : t("roomNeedsCode");
  const verifyState = safetyConfirmed ? t("roomVerified") : sessionsReady ? t("roomVerifyNeeded") : t("pending");
  const inviteTokenRoomReady = twoProfileInviteCodeModeActive() && sessionsReady && safetyConfirmed;
  const receivingCurrentRoom = productionTwoProfileReceiveMatchesInput(input);
  const receivingOtherRoom = productionTwoProfileReceiveActiveInOtherRoom(input);
  const receivingRuntimeMismatch = productionTwoProfileReceiveRuntimeMismatched(input);
  const transportState = inviteTokenRoomReady
    ? t("roomReady")
    : receivingCurrentRoom && productionTwoProfileOnionReceiveMode.stopRequested
    ? t("roomReceivingStopping")
    : receivingRuntimeMismatch
      ? t("roomReceivingMismatch")
    : receivingCurrentRoom
      ? t("roomReceivingOn")
      : receivingOtherRoom
        ? t("roomReceivingOther")
      : activeEndpointState.ready
        ? manualNetworkPermissionEnabled()
          ? t("roomNetworkReady")
          : t("roomNetworkOff")
        : activeEndpointState.stale
          ? t("endpointStale")
      : localizedChatStatus(activeEndpointState.reason);

  setText(fields.roomIdentityRoute, route);
  setText(fields.roomIdentityPair, pairState);
  setText(fields.roomIdentityVerify, verifyState);
  setText(fields.roomIdentityTransport, transportState);
  renderConnectionDeviceRole();
}

function renderRoomStatusSummary(input = productionTwoProfileInput(), sessionsReady = twoProfileSessionsReadyForInput(input)) {
  const hasConnectionCode = Boolean(input.profileA && input.profileB && input.profileA !== input.profileB);
  const safetyConfirmed = sessionsReady && twoProfileSafetyConfirmedForInput(input);
  const retryableOutbound = automaticVisibleTwoProfileRetryableOutboundEntry(input);
  const pendingConversation = latestTwoProfilePendingConversationEntry();
  const endpointState = twoProfilePeerEndpointState(input);
  const inviteTokenRoomReady = twoProfileInviteCodeModeActive() && sessionsReady && safetyConfirmed;
  const needsDeliveryPermission = Boolean(
    sessionsReady && safetyConfirmed && !inviteTokenRoomReady && !manualNetworkPermissionEnabled(),
  );
  const needsPrivateRoute = Boolean(
    sessionsReady && safetyConfirmed && !inviteTokenRoomReady && manualNetworkPermissionEnabled() && !endpointState.ready,
  );
  const receiving = productionTwoProfileReceiveMatchesInput(input);
  const receivingRuntimeMismatch = productionTwoProfileReceiveRuntimeMismatched(input);
  const state = retryableOutbound
    ? "pending"
    : pendingConversation
      ? "waiting"
    : !hasConnectionCode
      ? "disconnected"
      : !sessionsReady
        ? "code-ready"
    : !safetyConfirmed
      ? "verify"
    : needsDeliveryPermission
      ? "delivery-off"
    : needsPrivateRoute
      ? "route-needed"
      : "ready";
  const keyByState = {
    pending: "roomStatusShortPending",
    waiting: "roomStatusShortWaiting",
    disconnected: "roomStatusShortNoConnection",
    "code-ready": "roomStatusShortCodeReady",
    verify: "roomStatusShortVerify",
    "delivery-off": "roomStatusShortDeliveryOff",
    "route-needed": "roomStatusShortRouteNeeded",
    ready: "roomStatusShortReady",
  };
  const label = t(keyByState[state]);
  const receiveLabel = receiving
    ? ` · ${t(receivingRuntimeMismatch ? "roomStatusShortReceiveMismatch" : "roomStatusShortReceiving")}`
    : "";
  setText(fields.roomStatusSummary, `${label}${receiveLabel}`);
  fields.roomStatusSummary?.classList.remove(
    "is-disconnected",
    "is-code-ready",
    "is-verify",
    "is-delivery-off",
    "is-route-needed",
    "is-ready",
    "is-pending",
    "is-waiting",
    "is-receiving",
  );
  fields.roomStatusSummary?.classList.add(`is-${state}`);
  fields.roomStatusSummary?.classList.toggle("is-receiving", receiving);
}

function renderRoomSetupProgress() {}

function renderTwoProfileSafetyConfirm(input = productionTwoProfileInput(), sessionsReady = twoProfileSessionsReadyForInput(input)) {
  const safety = twoProfileSafetyForInput(input);
  const confirmed = sessionsReady && twoProfileSafetyConfirmedForInput(input);
  document.body.classList.toggle("has-confirmed-safety", confirmed);
  document.body.classList.toggle("needs-safety-confirmation", sessionsReady && !confirmed);
  const phrase = safety?.safetyPhrase || safety?.safetyNumber || "";
  setText(fields.twoProfileSafetyPhrase, phrase || t("verificationPhraseUnavailable"));
  setDisabled(fields.confirmTwoProfileSafety, !sessionsReady || confirmed);
}

function renderAppStateSummary(status) {
  const releaseSummary = status.secure_release ? t("appReleaseSummaryUnexpected") : t("appReleaseSummarySafe");
  const localCapabilitySummary = status.usable_messaging ? t("runtimeMessagingSummary") : t("localCapabilitySummary");
  const mainBlockerSummary = status.network_execution_status?.includes("disabled")
    ? t("mainBlockerSummary")
    : t("mainBlockerSummary");

  setText(fields.appReleaseSummary, releaseSummary);
  setText(fields.localCapabilitySummary, localCapabilitySummary);
  setText(fields.mainBlockerSummary, mainBlockerSummary);
  const devPeerLabel = String(status.local_dev_peer_label ?? "").trim();
  const devPeerName =
    devPeerLabel === "peer-a" ? t("localPeerA") : devPeerLabel === "peer-b" ? t("localPeerB") : devPeerLabel;
  document.body.classList.toggle("is-local-dev-peer", Boolean(devPeerLabel));
  if (fields.localDevPeerLabel) {
    fields.localDevPeerLabel.hidden = !devPeerLabel;
    fields.localDevPeerLabel.textContent = devPeerLabel
      ? formatTemplate("localPeerBadge", { peer: devPeerName })
      : "";
    fields.localDevPeerLabel.title = devPeerLabel ? t("localPeerBadgeTitle") : "";
  }
  if (fields.localPeerTestHint) {
    fields.localPeerTestHint.hidden = !devPeerLabel;
    fields.localPeerTestHint.textContent = devPeerLabel
      ? formatTemplate("localPeerTestHint", { peer: devPeerName })
      : "";
  }
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
  const envelopePayload = String(input.envelopePayload ?? "").trim();
  return `${profile}\n${input.passphrase || ""}\n${messageNumber}\n${envelopePayload}`;
}

function latestProductionMessageImportMatches(input = productionMessageInput()) {
  return latestProductionMessageImport === productionMessageImportFingerprint(input);
}

function productionSessionStateFingerprint(input = productionProfileInput()) {
  return `${String(input.profile ?? "").trim().toLowerCase()}\n${input.passphrase || ""}`;
}

function rememberProductionSessionState(input, session) {
  latestProductionSessionState = session;
  latestProductionSessionStateFingerprint = session ? productionSessionStateFingerprint(input) : "";
}

function latestProductionSessionStateForInput(input = productionProfileInput()) {
  return latestProductionSessionStateFingerprint === productionSessionStateFingerprint(input)
    ? latestProductionSessionState
    : null;
}

function productionSessionReadyForMessages() {
  const activeProfile = activeProductionProfileName();
  const scopedTwoProfileStatus = latestTwoProfileSessionStatusForCurrentInput();
  return productionProfileMessageReadiness(
    activeProfile,
    latestProductionSessionStateForInput(),
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

let latestDerivedConnectionCode = "";
let latestCreatedInviteCode = "";
let copiedInviteCode = "";
let latestConnectionCodeRole = "";
let inviteRoomPresenceRefreshTimer = null;
let inviteRoomPresenceRefreshFingerprint = "";
let inviteRoomTranscriptRefreshTimer = null;
let inviteRoomTranscriptRefreshFingerprint = "";
let inviteRoomTranscriptRefreshInFlight = false;
let savedRoomMetadataSyncInFlight = false;
let savedRoomMetadataSyncStatus = { key: "", tone: "muted", values: {} };
let roomDetailOpen = false;
let currentInviteCodeShareVisible = false;

function setRoomScreen(screen) {
  roomDetailOpen = screen === "detail";
  document.body.classList.toggle("is-room-list-mode", !roomDetailOpen);
  document.body.classList.toggle("is-room-detail-mode", roomDetailOpen);
  renderSavedInviteRooms();
  updateMinimalChatMode();
}

function prepareRoomListReturnState() {
  reconcileCurrentInviteRoomMetadataFromTranscriptEntries([...productionTwoProfileConversationEntries.values()]);
  clearManualMessagePayloadsForRoomContextChange();
  if (!savedRoomMetadataSyncInFlight) {
    setSavedRoomMetadataSyncStatus("");
  }
}

function showRoomList() {
  prepareRoomListReturnState();
  setRoomScreen("list");
}

function showRoomDetail() {
  setRoomScreen("detail");
}

function connectionCodeSlug(value) {
  return productionInviteCodeProfiles(value).slug;
}

function isDerivedConnectionProfile(value) {
  return /^(local|inviter|joiner|peer)-/.test(String(value ?? "").trim().toLowerCase());
}

function connectionCodeRoleStorageKey(code) {
  const slug = connectionCodeSlug(code);
  return `ad.connectionCodeRole.v1.${encodeURIComponent(slug)}`;
}

const lastInviteRoomStorageKey = "ad.lastInviteRoom.v1";
const inviteRoomsStorageKey = "ad.inviteRooms.v1";
const receiveIntentRoomsStorageKey = "ad.receiveIntentRooms.v1";
const localPrivateRouteCodesStorageKey = "ad.localPrivateRouteCodes.v1";
const localPrivateRouteLifecycleStorageKey = "ad.localPrivateRouteLifecycle.v1";
const peerPrivateRouteDraftsStorageKey = "ad.peerPrivateRouteDrafts.v1";
const realOnionRecoveriesStorageKey = "ad.realOnionRecoveries.v1";
const savedInviteRoomStorageLimit = 24;
const savedRoomMetadataStartupSyncLimit = 8;
const realOnionRecoveryPersistenceTtlMs = 24 * 60 * 60 * 1000;

function normalizeStoredRealOnionRecovery(record, options = {}) {
  const action = String(record?.action ?? "").trim();
  const reason = String(record?.reason ?? "").trim();
  const now = Number.parseInt(options.now ?? Date.now(), 10) || Date.now();
  const updatedAt = Number.parseInt(record?.updatedAt ?? 0, 10) || now;
  if (
    !new Set([
      "bootstrap-cancelled",
      "enable-private-delivery",
      "inspect-diagnostics",
      "prepare-network-or-bridge",
      "retry-bootstrap",
      "retry-private-delivery",
    ]).has(action)
  ) {
    return null;
  }
  if (updatedAt + realOnionRecoveryPersistenceTtlMs < now) {
    return null;
  }
  return {
    action,
    retryable: record?.retryable === true,
    waitCancellable: false,
    reason: /^[a-z0-9-]{1,96}$/.test(reason) ? reason : "persisted-recovery",
    updatedAt,
  };
}

function hydrateRealOnionRecoveries() {
  latestProductionTwoProfileRealOnionRecoveriesByRoom.clear();
  try {
    const parsed = JSON.parse(localStoreGet(realOnionRecoveriesStorageKey) ?? "{}");
    const entries = Object.entries(parsed && typeof parsed === "object" ? parsed : {});
    const now = Date.now();
    let dropped = false;
    for (const [roomKey, recovery] of entries.slice(-savedInviteRoomStorageLimit)) {
      const key = String(roomKey ?? "").trim();
      const normalized = normalizeStoredRealOnionRecovery(recovery, { now });
      if (key && normalized) {
        latestProductionTwoProfileRealOnionRecoveriesByRoom.set(key, normalized);
      } else {
        dropped = true;
      }
    }
    if (dropped || entries.length > savedInviteRoomStorageLimit) {
      persistRealOnionRecoveries();
    }
  } catch {
    latestProductionTwoProfileRealOnionRecoveriesByRoom.clear();
  }
}

function persistRealOnionRecoveries() {
  const now = Date.now();
  const entries = [...latestProductionTwoProfileRealOnionRecoveriesByRoom.entries()]
    .map(([roomKey, recovery]) => [String(roomKey ?? "").trim(), normalizeStoredRealOnionRecovery(recovery, { now })])
    .filter(([roomKey, recovery]) => roomKey && recovery)
    .slice(-savedInviteRoomStorageLimit);
  localStoreSet(realOnionRecoveriesStorageKey, JSON.stringify(Object.fromEntries(entries)));
}

function pruneExpiredRealOnionRecoveries() {
  const now = Date.now();
  let changed = false;
  for (const [roomKey, recovery] of latestProductionTwoProfileRealOnionRecoveriesByRoom.entries()) {
    const key = String(roomKey ?? "").trim();
    const normalized = normalizeStoredRealOnionRecovery(recovery, { now });
    if (key && normalized) {
      latestProductionTwoProfileRealOnionRecoveriesByRoom.set(key, normalized);
    } else {
      latestProductionTwoProfileRealOnionRecoveriesByRoom.delete(roomKey);
      changed = true;
    }
  }
  if (changed) {
    persistRealOnionRecoveries();
  }
  return changed;
}

function hydratePrivateRouteMap(storageKey, target) {
  target.clear();
  try {
    const parsed = JSON.parse(localStoreGet(storageKey) ?? "{}");
    const entries = Object.entries(parsed && typeof parsed === "object" ? parsed : {});
    for (const [roomKey, routeCode] of entries.slice(-48)) {
      const key = String(roomKey ?? "").trim();
      const value = String(routeCode ?? "").trim();
      if (key && value) {
        target.set(key, value);
      }
    }
  } catch {
    target.clear();
  }
}

function persistPrivateRouteMap(storageKey, source) {
  const entries = [...source.entries()]
    .map(([roomKey, routeCode]) => [String(roomKey ?? "").trim(), String(routeCode ?? "").trim()])
    .filter(([roomKey, routeCode]) => roomKey && routeCode)
    .slice(-48);
  localStoreSet(storageKey, JSON.stringify(Object.fromEntries(entries)));
}

function hydratePrivateRouteLifecycleMap(storageKey, target) {
  target.clear();
  try {
    const parsed = JSON.parse(localStoreGet(storageKey) ?? "{}");
    const entries = Object.entries(parsed && typeof parsed === "object" ? parsed : {});
    for (const [roomKey, record] of entries.slice(-48)) {
      const key = String(roomKey ?? "").trim();
      const endpoint = String(record?.endpoint ?? "").trim();
      const state = String(record?.state ?? "").trim() === "listening"
        ? "stopped"
        : String(record?.state ?? "").trim();
      if (key && endpoint && state) {
        target.set(key, {
          endpoint,
          state,
          updatedAt: Number.parseInt(record?.updatedAt ?? 0, 10) || 0,
          generation: Number.parseInt(record?.generation ?? 0, 10) || 0,
        });
      }
    }
  } catch {
    target.clear();
  }
}

function persistPrivateRouteLifecycleMap(storageKey, source) {
  const entries = [...source.entries()]
    .map(([roomKey, record]) => [
      String(roomKey ?? "").trim(),
      {
        endpoint: String(record?.endpoint ?? "").trim(),
        state: String(record?.state ?? "").trim(),
        updatedAt: Number.parseInt(record?.updatedAt ?? 0, 10) || 0,
        generation: Number.parseInt(record?.generation ?? 0, 10) || 0,
      },
    ])
    .filter(([roomKey, record]) => roomKey && record.endpoint && record.state)
    .slice(-48);
  localStoreSet(storageKey, JSON.stringify(Object.fromEntries(entries)));
}

hydratePrivateRouteMap(localPrivateRouteCodesStorageKey, localPrivateRouteCodesByRoom);
hydratePrivateRouteLifecycleMap(localPrivateRouteLifecycleStorageKey, localPrivateRouteLifecycleByRoom);
hydratePrivateRouteMap(peerPrivateRouteDraftsStorageKey, peerPrivateRouteDraftsByRoom);
hydrateRealOnionRecoveries();

function rememberConnectionCodeRole(code, role) {
  const normalizedRole = role === "inviter" ? "inviter" : "joiner";
  latestConnectionCodeRole = normalizedRole;
  localStoreSet(connectionCodeRoleStorageKey(code), normalizedRole);
  if (fields.productionTwoProfileB && fields.productionTwoProfileB.value === String(code ?? "").trim()) {
    fields.productionTwoProfileB.dataset.inviteCodeRole = normalizedRole;
  }
}

function rememberLastInviteRoom(code, role) {
  const trimmedCode = String(code ?? "").trim();
  const normalizedRole = role === "inviter" ? "inviter" : "joiner";
  if (!trimmedCode) {
    return;
  }
  localStoreSet(lastInviteRoomStorageKey, JSON.stringify({ code: trimmedCode, role: normalizedRole }));
  rememberInviteRoom(trimmedCode, normalizedRole);
}

function forgetLastInviteRoom(code) {
  const trimmedCode = String(code ?? "").trim();
  try {
    const saved = JSON.parse(localStoreGet(lastInviteRoomStorageKey) ?? "null");
    if (!trimmedCode || saved?.code === trimmedCode) {
      localStoreRemove(lastInviteRoomStorageKey);
    }
  } catch {
    localStoreRemove(lastInviteRoomStorageKey);
  }
  forgetInviteRoom(trimmedCode);
}

function normalizedSavedRoomRetryableMessageNumber(count, value) {
  return count > 0 ? Number.parseInt(value ?? 0, 10) || 0 : 0;
}

function normalizedSavedRoomRetryableAction(count, value) {
  return count > 0 ? savedInviteRoomRetryableAction(value) : "";
}

function normalizedSavedRoomRetryableMessage(count, value) {
  return count > 0 ? String(value ?? "").trim() : "";
}

function savedInviteRooms() {
  let rooms = [];
  try {
    const parsed = JSON.parse(localStoreGet(inviteRoomsStorageKey) ?? "[]");
    if (Array.isArray(parsed)) {
      rooms = parsed
        .map((room) => {
          const retryableOutboundCount = Math.max(0, Number.parseInt(room?.retryableOutboundCount ?? 0, 10) || 0);
          return {
            code: String(room?.code ?? "").trim(),
            role: room?.role === "inviter" ? "inviter" : room?.role === "joiner" ? "joiner" : "",
            updatedAt: Number(room?.updatedAt ?? 0),
            lastMessagePreview: String(room?.lastMessagePreview ?? "").trim(),
            lastMessageAt: Number(room?.lastMessageAt ?? 0),
            messageCount: Math.max(0, Number.parseInt(room?.messageCount ?? 0, 10) || 0),
            retryableOutboundCount,
            retryableOutboundMessageNumber: normalizedSavedRoomRetryableMessageNumber(
              retryableOutboundCount,
              room?.retryableOutboundMessageNumber,
            ),
            retryableOutboundMessage: normalizedSavedRoomRetryableMessage(
              retryableOutboundCount,
              room?.retryableOutboundMessage,
            ),
            retryableOutboundAction: normalizedSavedRoomRetryableAction(
              retryableOutboundCount,
              room?.retryableOutboundAction,
            ),
          };
        })
        .filter((room) => room.code && room.role);
    }
  } catch {
    rooms = [];
  }
  try {
    const saved = JSON.parse(localStoreGet(lastInviteRoomStorageKey) ?? "null");
    const code = String(saved?.code ?? "").trim();
    const role = saved?.role === "inviter" ? "inviter" : saved?.role === "joiner" ? "joiner" : "";
    if (code && role && !rooms.some((room) => room.code === code)) {
      rooms.push({
        code,
        role,
        updatedAt: 0,
        lastMessagePreview: "",
        lastMessageAt: 0,
        messageCount: 0,
        retryableOutboundCount: 0,
        retryableOutboundMessageNumber: 0,
        retryableOutboundMessage: "",
        retryableOutboundAction: "",
      });
    }
  } catch {
    // Ignore legacy room migration failures.
  }
  return rooms.sort((a, b) => b.updatedAt - a.updatedAt);
}

function roomListStoragePayload(rooms) {
  return rooms.slice(0, savedInviteRoomStorageLimit).map((room) => {
    const retryableOutboundCount = Math.max(0, Number.parseInt(room.retryableOutboundCount ?? 0, 10) || 0);
    return {
      code: room.code,
      role: room.role,
      updatedAt: Number(room.updatedAt ?? 0),
      lastMessagePreview: String(room.lastMessagePreview ?? "").trim(),
      lastMessageAt: Number(room.lastMessageAt ?? 0),
      messageCount: Math.max(0, Number.parseInt(room.messageCount ?? 0, 10) || 0),
      retryableOutboundCount,
      retryableOutboundMessageNumber: normalizedSavedRoomRetryableMessageNumber(
        retryableOutboundCount,
        room.retryableOutboundMessageNumber,
      ),
      retryableOutboundMessage: normalizedSavedRoomRetryableMessage(
        retryableOutboundCount,
        room.retryableOutboundMessage,
      ),
      retryableOutboundAction: normalizedSavedRoomRetryableAction(
        retryableOutboundCount,
        room.retryableOutboundAction,
      ),
    };
  });
}

function inviteRoomMetadataValue(metadata, existing, key) {
  return Object.prototype.hasOwnProperty.call(metadata ?? {}, key) ? metadata[key] : existing?.[key];
}

function inviteRoomUpdatedAtValue(metadata, existing) {
  if (Object.prototype.hasOwnProperty.call(metadata ?? {}, "updatedAt")) {
    return Number(metadata.updatedAt ?? 0);
  }
  if (Object.keys(metadata ?? {}).length > 0) {
    return Date.now();
  }
  return Number(existing?.updatedAt ?? Date.now());
}

function rememberInviteRoom(code, role, metadata = {}, options = {}) {
  const trimmedCode = String(code ?? "").trim();
  const normalizedRole = role === "inviter" ? "inviter" : "joiner";
  if (!trimmedCode) {
    return;
  }
  const existing = savedInviteRooms().find((room) => room.code === trimmedCode) ?? {};
  const rooms = savedInviteRooms().filter((room) => room.code !== trimmedCode);
  const retryableOutboundCount = Math.max(
    0,
    Number.parseInt(inviteRoomMetadataValue(metadata, existing, "retryableOutboundCount") ?? 0, 10) || 0,
  );
  rooms.unshift({
    ...existing,
    code: trimmedCode,
    role: normalizedRole,
    updatedAt: inviteRoomUpdatedAtValue(metadata, existing),
    lastMessagePreview: String(metadata.lastMessagePreview ?? existing.lastMessagePreview ?? "").trim(),
    lastMessageAt: Number(metadata.lastMessageAt ?? existing.lastMessageAt ?? 0),
    messageCount: Math.max(
      0,
      Number.parseInt(inviteRoomMetadataValue(metadata, existing, "messageCount") ?? 0, 10) || 0,
    ),
    retryableOutboundCount,
    retryableOutboundMessageNumber: normalizedSavedRoomRetryableMessageNumber(
      retryableOutboundCount,
      inviteRoomMetadataValue(metadata, existing, "retryableOutboundMessageNumber"),
    ),
    retryableOutboundMessage: normalizedSavedRoomRetryableMessage(
      retryableOutboundCount,
      inviteRoomMetadataValue(metadata, existing, "retryableOutboundMessage"),
    ),
    retryableOutboundAction: normalizedSavedRoomRetryableAction(
      retryableOutboundCount,
      inviteRoomMetadataValue(metadata, existing, "retryableOutboundAction"),
    ),
  });
  localStoreSet(inviteRoomsStorageKey, JSON.stringify(roomListStoragePayload(rooms)));
  if (options.render !== false) {
    renderSavedInviteRooms();
  }
}

function forgetInviteRoom(code) {
  const trimmedCode = String(code ?? "").trim();
  if (!trimmedCode) {
    return;
  }
  for (const role of ["inviter", "joiner"]) {
    const { localProfile, peerProfile } = productionInviteCodeProfiles(trimmedCode, role);
    const roomInput = {
      profileA: localProfile,
      profileB: peerProfile,
      passphrase: trimmedCode,
      connectionCode: trimmedCode,
      inviteRole: role,
    };
    rememberReceiveIntentForRoom(roomInput, false);
    forgetTwoProfileSessionStatusForInput(roomInput);
    clearPrivateRouteFollowupForRoom(roomInput);
    for (const key of twoProfileSafetyStorageKeys(roomInput)) {
      localStoreRemove(key);
    }
    for (const roomKey of privateRouteRoomKeys(roomInput)) {
      localPrivateRouteCodesByRoom.delete(roomKey);
      activeLocalPrivateRouteCodesByRoom.delete(roomKey);
      localPrivateRouteLifecycleByRoom.delete(roomKey);
      peerPrivateRouteDraftsByRoom.delete(roomKey);
      latestProductionTwoProfileRealOnionResultsByRoom.delete(roomKey);
      latestProductionTwoProfileRealOnionRecoveriesByRoom.delete(roomKey);
      latestProductionTwoProfileRealOnionWaitCanceledFingerprints.delete(roomKey);
    }
  }
  persistPrivateRouteMap(localPrivateRouteCodesStorageKey, localPrivateRouteCodesByRoom);
  persistPrivateRouteLifecycleMap(localPrivateRouteLifecycleStorageKey, localPrivateRouteLifecycleByRoom);
  persistPrivateRouteMap(peerPrivateRouteDraftsStorageKey, peerPrivateRouteDraftsByRoom);
  persistRealOnionRecoveries();
  const rooms = savedInviteRooms().filter((room) => room.code !== trimmedCode);
  localStoreSet(inviteRoomsStorageKey, JSON.stringify(roomListStoragePayload(rooms)));
  renderSavedInviteRooms();
}

function savedLastInviteRoom() {
  try {
    const saved = JSON.parse(localStoreGet(lastInviteRoomStorageKey) ?? "null");
    const code = String(saved?.code ?? "").trim();
    const role = saved?.role === "inviter" ? "inviter" : saved?.role === "joiner" ? "joiner" : "";
    return code && role ? { code, role } : null;
  } catch {
    return null;
  }
}

function savedInviteRoomShortSlug(room) {
  const slug = connectionCodeSlug(room.code);
  return slug.length > 18 ? `${slug.slice(0, 18)}...` : slug;
}

function savedInviteRoomLabel(room) {
  const shortSlug = savedInviteRoomShortSlug(room);
  const role = room.role === "inviter" ? t("roomRoleCreated") : t("roomRoleJoined");
  return `${role} ${shortSlug}`;
}

function savedInviteRoomPreview(room) {
  const preview = String(room?.lastMessagePreview ?? "").trim() || t("roomPreviewEmpty");
  if (savedInviteRoomHasRetryableOutbound(room)) {
    const messageNumber = Number.parseInt(room?.retryableOutboundMessageNumber ?? 0, 10) || "";
    return messageNumber
      ? formatTemplate("roomPreviewRetryableSendNumber", { number: messageNumber })
      : formatTemplate("roomPreviewRetryableSend", { preview });
  }
  return preview;
}

function savedInviteRoomInput(room) {
  const code = String(room?.code ?? "").trim();
  const role = room?.role === "inviter" ? "inviter" : room?.role === "joiner" ? "joiner" : "";
  if (!code || !role) {
    return { profileA: "", profileB: "", passphrase: "" };
  }
  const { localProfile, peerProfile } = productionInviteCodeProfiles(code, role);
  return { profileA: localProfile, profileB: peerProfile, passphrase: code, connectionCode: code, inviteRole: role };
}

function savedInviteRoomReceiveState(room) {
  const input = savedInviteRoomInput(room);
  if (
    productionTwoProfileReceiveMatchesInput(input) &&
    productionTwoProfileOnionReceiveMode.stopRequested
  ) {
    return "stopping";
  }
  const listening = Boolean(
    productionTwoProfileReceiveMatchesInput(input) &&
      !productionTwoProfileOnionReceiveMode.stopRequested,
  );
  if (listening) {
    return "listening";
  }
  return receiveIntentForRoom(input) ? "paused" : "";
}

function savedInviteRoomWaitingForPeerCode(room) {
  const input = savedInviteRoomInput(room);
  const roomKey = privateRouteRoomKey(input);
  const localCode = routeMapValueForRoom(localPrivateRouteCodesByRoom, input, localPrivateRouteCodesStorageKey);
  const activeCode = routeMapValueForRoom(activeLocalPrivateRouteCodesByRoom, input);
  const peerDraft = routeMapValueForRoom(peerPrivateRouteDraftsByRoom, input, peerPrivateRouteDraftsStorageKey);
  return Boolean(
    roomKey &&
      localCode &&
      activeCode === localCode &&
      !peerDraft &&
      !twoProfilePeerEndpointState(input).ready,
  );
}

function savedInviteRoomHasRetryableOutbound(room) {
  return (
    Number.parseInt(room?.retryableOutboundCount ?? 0, 10) > 0 &&
    Number.parseInt(room?.retryableOutboundMessageNumber ?? 0, 10) > 0
  );
}

function retryableOutboundEntryForSavedRoomAction(room, input = productionTwoProfileInput(), options = {}) {
  const actionOrigin = String(options.actionOrigin ?? "").trim();
  if (actionOrigin !== "retryable-outbound") {
    return null;
  }
  const messageNumber = Number.parseInt(room?.retryableOutboundMessageNumber ?? 0, 10) || 0;
  if (messageNumber <= 0) {
    return null;
  }
  const retryableMatches = [...productionTwoProfileConversationEntries.values()].filter(
    (entry) =>
      String(entry.roomFingerprint ?? "").trim() === twoProfileSessionStatusFingerprint(input) &&
      String(entry.sender ?? "").trim().toLowerCase() === String(input.profileA ?? "").trim().toLowerCase() &&
      String(entry.receiver ?? "").trim().toLowerCase() === String(input.profileB ?? "").trim().toLowerCase() &&
      Number.parseInt(entry.messageNumber, 10) === messageNumber &&
      entry.outboundDeliveryState === "failed" &&
      twoProfileConversationOutboundRetryable(entry),
  );
  const savedMessage = String(room?.retryableOutboundMessage ?? "").trim();
  if (savedMessage) {
    return retryableMatches.find((entry) => String(entry.message ?? "").trim() === savedMessage) ?? null;
  }
  return retryableMatches[0] ?? null;
}

function savedInviteRoomRetryableAction(action) {
  return privateDeliveryState.normalizeSavedInviteRoomRetryableAction(action);
}

function savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin) {
  return privateDeliveryState.savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin);
}

function savedInviteRoomRetryOnlyWithoutRetryableOrigin(action, actionOrigin) {
  return privateDeliveryState.savedInviteRoomRetryOnlyWithoutRetryableOrigin(action, actionOrigin);
}

function savedInviteRoomActionIsRouteReadinessOnly(actionOrigin) {
  return privateDeliveryState.savedInviteRoomActionIsRouteReadinessOnly(actionOrigin);
}

function savedInviteRoomReceiveOwnershipBlocksRecovery(options) {
  return privateDeliveryState.savedInviteRoomReceiveOwnershipBlocksRecovery(options);
}

function savedInviteRoomResolvedRetryableOutbound(room, input, action, actionOrigin) {
  return savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin)
    ? retryableOutboundEntryForSavedRoomAction(room, input, { actionOrigin })
    : null;
}

function savedInviteRoomRetryableState(room) {
  const action = savedInviteRoomRetryableAction(room?.retryableOutboundAction);
  if (action === "enable-private-delivery") {
    return { key: "enable-delivery", label: t("roomStateEnableDelivery") };
  }
  if (action === "prepare-private-route") {
    return { key: "setup-delivery", label: t("roomStateSetupDelivery") };
  }
  if (action === "refresh-and-retry") {
    return { key: "refresh-address", label: t("roomStateRefreshAddress") };
  }
  if (action === "start-receiving") {
    return { key: "receive-paused", label: t("roomStateReceivePaused") };
  }
  if (action === "wait-receive-stop") {
    return { key: "receive-stopping", label: t("roomReceivingStopping") };
  }
  if (action === "retry-network") {
    return { key: "retry-network", label: t("retryNetwork") };
  }
  if (action === "verify-safety") {
    return { key: "verify-safety", label: t("roomVerifyNeeded") };
  }
  return { key: "retry-send", label: t("roomStateRetrySend") };
}

function savedInviteRoomWithoutLoadedStaleRetryable(room, options = {}) {
  if (!savedInviteRoomHasRetryableOutbound(room) || productionTwoProfileConversationEntries.size === 0) {
    return room;
  }
  const input = savedInviteRoomInput(room);
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return room;
  }
  if (retryableOutboundEntryForSavedRoomAction(room, input, { actionOrigin: "retryable-outbound" })) {
    return room;
  }
  if (options.persist === true) {
    clearSavedInviteRoomRetryableOutbound(room);
  }
  return savedInviteRoomWithoutRetryableOutbound(room);
}

function savedInviteRoomRealOnionRecoveryView(room) {
  const input = savedInviteRoomInput(room);
  const recovery = latestRealOnionRecoveryForInput(input);
  if (!recovery?.action || recovery.action === "none") {
    return null;
  }
  if (recovery.action === "enable-private-delivery") {
    return manualNetworkPermission
      ? null
      : {
          action: "real-onion-enable-private-delivery",
          labelKey: "enablePrivateDelivery",
          state: { key: "enable-delivery", label: t("roomStateEnableDelivery") },
        };
  }
  const runAction = realOnionRecoveryRunAction(recovery);
  if (!runAction.ready) {
    return null;
  }
  if (runAction.opensNetworkSettings) {
    return {
      action: "real-onion-network-settings",
      labelKey: runAction.labelKey,
      recovery,
      state: { key: "setup-delivery", label: t(runAction.labelKey) },
    };
  }
  if (runAction.inspectDiagnostics) {
    return {
      action: "real-onion-inspect-diagnostics",
      labelKey: runAction.labelKey,
      recovery,
      state: { key: "inspect-diagnostics", label: t(runAction.labelKey) },
    };
  }
  if (runAction.labelKey === "retryNetwork") {
    return {
      action: "real-onion-retry",
      labelKey: runAction.labelKey,
      recovery,
      state: { key: "retry-network", label: t(runAction.labelKey) },
    };
  }
  return {
    action: "real-onion-retry",
    labelKey: runAction.labelKey,
    recovery,
    state: { key: "retry-send", label: t(runAction.labelKey) },
  };
}

function savedInviteRoomRouteReadinessView(room) {
  const input = savedInviteRoomInput(room);
  if (!latestTwoProfileSessionStatusForCurrentInput(input)) {
    return null;
  }
  const readiness = externalPeerSendReadiness(input, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  if (readiness.ready === true) {
    return null;
  }
  if (readiness.nextAction === "enable-private-delivery") {
    return {
      action: "enable-private-delivery",
      labelKey: "enablePrivateDelivery",
      state: { key: "enable-delivery", label: t("roomStateEnableDelivery") },
    };
  }
  if (readiness.nextAction === "verify") {
    return {
      action: "verify-safety",
      labelKey: "comparePhraseAction",
      state: { key: "verify-safety", label: t("roomVerifyNeeded") },
    };
  }
  if (readiness.nextAction === "start-receiving") {
    if (routeReadinessReceiveRuntimeMismatch(readiness)) {
      return {
        action: "stop-receiving",
        labelKey: "stopReceiving",
        state: { key: "receive-mismatch", label: t("roomReceivingMismatch") },
      };
    }
    if (routeReadinessReceiveStopPending(readiness)) {
      return {
        action: "wait-receive-stop",
        labelKey: "receiveStopPending",
        state: { key: "receive-stopping", label: t("roomReceivingStopping") },
      };
    }
    return {
      action: "start-receiving",
      labelKey: "startReceiving",
      state: { key: "receive-paused", label: t("roomStateReceivePaused") },
    };
  }
  if (readiness.nextAction === "refresh-endpoint") {
    const stale = readiness.peerEndpointState?.stale === true;
    return {
      action: stale ? "refresh-endpoint" : "prepare-private-route",
      labelKey: stale ? "refreshEndpoint" : "preparePrivateRoute",
      state: stale
        ? { key: "refresh-address", label: t("roomStateRefreshAddress") }
        : { key: "setup-delivery", label: t("roomStateSetupDelivery") },
    };
  }
  return null;
}

function savedInviteRoomResumePriority(room) {
  const viewRoom = savedInviteRoomWithoutLoadedStaleRetryable(room);
  if (savedInviteRoomHasRetryableOutbound(viewRoom)) {
    return 30;
  }
  const receiveState = savedInviteRoomReceiveState(viewRoom);
  if (receiveState === "stopping") {
    return 22;
  }
  if (receiveState === "paused") {
    return 20;
  }
  const routeReadinessView = savedInviteRoomRouteReadinessView(viewRoom);
  if (routeReadinessView?.action === "wait-receive-stop") {
    return 19;
  }
  if (routeReadinessView) {
    return 24;
  }
  if (
    !savedInviteRoomReceiveOwnershipBlocksRecovery({
      receiveState,
      routeReadinessAction: routeReadinessView?.action ?? "",
    }) &&
    savedInviteRoomRealOnionRecoveryView(viewRoom)
  ) {
    return 25;
  }
  if (savedInviteRoomWaitingForPeerCode(viewRoom)) {
    return 18;
  }
  return 0;
}

function savedInviteRoomPriorityEntries(rooms = savedInviteRooms()) {
  pruneExpiredRealOnionRecoveries();
  return (Array.isArray(rooms) ? rooms : []).map((room, index) => ({
    index,
    priority: savedInviteRoomResumePriority(room),
    room,
    updatedAt: Number(room?.updatedAt ?? 0) || 0,
  }));
}

function savedInviteRoomResumeRoom(rooms = savedInviteRooms()) {
  return (
    savedInviteRoomPriorityEntries(rooms)
      .filter(({ priority }) => priority > 0)
      .sort((left, right) => {
        const priority = right.priority - left.priority;
        return priority || right.updatedAt - left.updatedAt || left.index - right.index;
      })[0]?.room ?? null
  );
}

function savedInviteRoomState(room, options = {}) {
  const currentCode = currentInviteRoomCode();
  const receiveState = options.receiveState ?? savedInviteRoomReceiveState(room);
  const waitingPeerCode = options.waitingPeerCode ?? savedInviteRoomWaitingForPeerCode(room);
  const hasRealOnionRecoveryView = Object.prototype.hasOwnProperty.call(options, "realOnionRecoveryView");
  let realOnionRecoveryView = hasRealOnionRecoveryView
    ? options.realOnionRecoveryView
    : savedInviteRoomRealOnionRecoveryView(room);
  const hasRouteReadinessView = Object.prototype.hasOwnProperty.call(options, "routeReadinessView");
  const routeReadinessView = hasRouteReadinessView
    ? options.routeReadinessView
    : savedInviteRoomRouteReadinessView(room);
  if (
    realOnionRecoveryView &&
    savedInviteRoomReceiveOwnershipBlocksRecovery({
      receiveState,
      routeReadinessAction: routeReadinessView?.action ?? "",
    })
  ) {
    realOnionRecoveryView = null;
  }
  const view = (() => {
    if (savedInviteRoomHasRetryableOutbound(room)) {
      return savedInviteRoomRetryableState(room);
    }
    if (realOnionRecoveryView) {
      return realOnionRecoveryView.state;
    }
    if (receiveState === "listening") {
      return { key: "listening", label: t("roomStateListening") };
    }
    if (receiveState === "stopping") {
      return { key: "receive-stopping", label: t("roomReceivingStopping") };
    }
    if (receiveState === "paused") {
      return { key: "receive-paused", label: t("roomStateReceivePaused") };
    }
    if (waitingPeerCode) {
      return { key: "waiting-peer-code", label: t("roomStateWaitingPeerCode") };
    }
    if (routeReadinessView) {
      return routeReadinessView.state;
    }
    if (room.code === currentCode && roomDetailOpen) {
      return { key: "active", label: t("roomStateActive") };
    }
    if (room.code === currentCode && currentInviteCodeShareVisible) {
      return { key: "invite-open", label: t("roomStateInviteOpen") };
    }
    if (room.messageCount > 0) {
      return { key: "ready", label: t("roomStateReady") };
    }
    return { key: "saved", label: t("roomStateSaved") };
  })();
  return options.resumeRecommended
    ? { ...view, label: formatTemplate("roomStateResumeNext", { state: view.label }) }
    : view;
}

function savedInviteRoomListAction(room, options = {}) {
  if (savedInviteRoomHasRetryableOutbound(room)) {
    const action = savedInviteRoomRetryableAction(room.retryableOutboundAction);
    if (action === "enable-private-delivery") {
      return { action, labelKey: "enablePrivateDelivery", origin: "retryable-outbound" };
    }
    if (action === "prepare-private-route") {
      return { action, labelKey: "preparePrivateRoute", origin: "retryable-outbound" };
    }
    if (action === "refresh-and-retry") {
      return { action, labelKey: "refreshAndRetry", origin: "retryable-outbound" };
    }
    if (action === "start-receiving") {
      return { action, labelKey: "startReceiving", origin: "retryable-outbound" };
    }
    if (action === "wait-receive-stop") {
      return { action, labelKey: "receiveStopPending", origin: "retryable-outbound" };
    }
    if (action === "retry-network") {
      return { action, labelKey: "retryNetwork", origin: "retryable-outbound" };
    }
    if (action === "verify-safety") {
      return { action, labelKey: "comparePhraseAction", origin: "retryable-outbound" };
    }
    return { action: "retry", labelKey: "retrySend", origin: "retryable-outbound" };
  }
  const hasRealOnionRecoveryView = Object.prototype.hasOwnProperty.call(options, "realOnionRecoveryView");
  let realOnionRecovery = hasRealOnionRecoveryView
    ? options.realOnionRecoveryView
    : savedInviteRoomRealOnionRecoveryView(room);
  const receiveState = options.receiveState ?? savedInviteRoomReceiveState(room);
  const hasRouteReadinessView = Object.prototype.hasOwnProperty.call(options, "routeReadinessView");
  const routeReadinessView = hasRouteReadinessView
    ? options.routeReadinessView
    : savedInviteRoomRouteReadinessView(room);
  if (
    realOnionRecovery &&
    savedInviteRoomReceiveOwnershipBlocksRecovery({
      receiveState,
      routeReadinessAction: routeReadinessView?.action ?? "",
    })
  ) {
    realOnionRecovery = null;
  }
  if (realOnionRecovery) {
    return { action: realOnionRecovery.action, labelKey: realOnionRecovery.labelKey, origin: "real-onion-recovery" };
  }
  if (receiveState === "stopping") {
    return { action: "wait-receive-stop", labelKey: "receiveStopPending", origin: "receive-state" };
  }
  if (receiveState === "paused") {
    return { action: "start-receiving", labelKey: "startReceiving", origin: "receive-state" };
  }
  const waitingPeerCode = options.waitingPeerCode ?? savedInviteRoomWaitingForPeerCode(room);
  if (waitingPeerCode) {
    return { action: "paste-peer-code", labelKey: "roomActionPastePeerCode", origin: "peer-code" };
  }
  if (routeReadinessView) {
    return { action: routeReadinessView.action, labelKey: routeReadinessView.labelKey, origin: "route-readiness" };
  }
  return null;
}

function savedInviteRoomMissingPendingMessage(action) {
  const normalized = savedInviteRoomRetryableAction(action);
  if (normalized === "refresh-and-retry") {
    return currentLanguage === "ko"
      ? "저장된 전송 대기 메시지는 더 이상 없습니다. 대화를 확인하거나 새 메시지를 작성하세요."
      : "No pending send remains in this saved room. Review the conversation or write a new message.";
  }
  if (normalized === "start-receiving") {
    return currentLanguage === "ko"
      ? "저장된 전송 대기 메시지는 더 이상 없습니다. 메시지 받기를 시작하기 전에 대화를 확인하거나 새 메시지를 작성하세요."
      : "No pending send remains in this saved room. Review the conversation or write a new message before starting receive.";
  }
  return currentLanguage === "ko"
    ? "저장된 전송 대기 메시지는 더 이상 없습니다. 대화를 확인하거나 새 메시지를 작성하세요."
    : "No pending send remains in this saved room. Review the conversation or write a new message.";
}

async function handleSavedInviteRoomMissingPendingAction(action) {
  rememberCurrentInviteRoomMetadata();
  renderSavedInviteRooms();
  setProductionTwoProfileState("No pending send");
  setText(fields.productionTwoProfileWarning, savedInviteRoomMissingPendingMessage(action));
  clearLatestChatDeliveryNoticeState();
  setChatDeliveryNotice(savedInviteRoomMissingPendingMessage(action), "muted");
  setProductionFollowupActions(
    true,
    currentLanguage === "ko"
      ? "다음: 대화를 확인하거나 새 메시지를 작성하세요."
      : "Next: review the conversation or write a new message.",
  );
  if (action === "refresh-and-retry") {
    fields.productionTwoProfileMessage?.focus?.({ preventScroll: true });
    return true;
  }
  if (action === "start-receiving") {
    fields.productionTwoProfileMessage?.focus?.({ preventScroll: true });
    return true;
  }
  fields.productionTwoProfileMessage?.focus?.({ preventScroll: true });
  return true;
}

async function runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin, options = {}) {
  if (!savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin)) {
    return false;
  }
  const pending = savedInviteRoomResolvedRetryableOutbound(room, input, action, actionOrigin);
  if (!pending) {
    await handleSavedInviteRoomMissingPendingAction(action);
    return true;
  }
  selectTwoProfileConversationEntry(pending);
  showRetryableTwoProfileOutboundNotice(pending);
  if (options.reviewOnly === true) {
    return true;
  }
  await runTwoProfileOutboundPrimaryAction(pending);
  return true;
}

async function showSavedInviteRoomReceiveOwnerMissing(targetRoom, stateLabel, options = {}) {
  const stopPending = options.stopPending === true;
  await openSavedInviteRoom(targetRoom);
  setProductionTwoProfileState(stateLabel);
  setText(fields.productionTwoProfileWarning, stopPending ? t("receiveStopPending") : t("receiveOtherRoomMissing"));
  setChatDeliveryNoticeByKey(stopPending ? "receiveStopPending" : "receiveOtherRoomMissing", "warning", productionTwoProfileInput());
  setProductionFollowupActions(
    true,
    stopPending
      ? currentLanguage === "ko"
        ? "다음: 받기 중지가 완료될 때까지 기다리거나 앱을 다시 시작한 뒤, 이 채팅방에서 메시지 받기를 다시 시작하세요."
        : "Next: wait for receiving to stop, or restart the app, then start receiving in this room again."
      : currentLanguage === "ko"
        ? "다음: 원래 채팅방에서 받기를 중지하거나 앱을 다시 시작한 뒤 이 채팅방에서 메시지 받기를 다시 시작하세요."
        : "Next: stop receiving from the original room or restart the app, then start receiving in this room again.",
  );
  if (!stopPending) {
    fields.startProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
  }
  return true;
}

function showSavedInviteRoomReceiveStopPending() {
  setProductionTwoProfileState("Message listening stopping");
  setText(fields.productionTwoProfileWarning, t("receiveStopPending"));
  setChatDeliveryNoticeByKey("receiveStopPending", "warning", productionTwoProfileInput());
  setProductionFollowupActions(
    true,
    currentLanguage === "ko"
      ? "다음: 받기 중지가 완료될 때까지 기다린 뒤, 다시 시작하려던 채팅방을 여세요."
      : "Next: wait until receiving has fully stopped, then reopen the room you wanted to start.",
  );
  return true;
}

function savedInviteRoomMatches(left, right) {
  return Boolean(left && right && left.code === right.code && left.role === right.role);
}

function refreshReceiveStopCompletedNotice(input = productionTwoProfileInput()) {
  if (latestChatDeliveryNoticeKey !== "receiveStopPending" || !chatDeliveryNoticeMatchesInput(input)) {
    return false;
  }
  const current = currentSavedInviteRoomView(input);
  if (current.action?.action === "wait-receive-stop") {
    return false;
  }
  const resumeRoom = savedInviteRoomResumeRoom();
  const resumeAction = resumeRoom
    ? savedInviteRoomListItemView(resumeRoom, {
        currentCode: currentInviteRoomCode(),
        resumeRoom,
      }).nextAction
    : null;
  setProductionTwoProfileState("Message listening stopped");
  setText(fields.productionTwoProfileWarning, t("receiveStopped"));
  setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "muted", input);
  if (current.action?.action === "start-receiving") {
    setProductionFollowupActions(
      true,
      currentLanguage === "ko"
        ? "다음: 이 채팅방에서 메시지 받기를 다시 시작하세요."
        : "Next: start receiving again in this room.",
    );
    fields.startProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
    return true;
  }
  if (resumeAction && !savedInviteRoomMatches(resumeRoom, current.room)) {
    setProductionFollowupActions(
      true,
      currentLanguage === "ko"
        ? `다음: 저장된 방 목록에서 추천된 방을 열고 '${t(resumeAction.labelKey)}' 작업을 진행하세요.`
        : `Next: open the recommended saved room and run '${t(resumeAction.labelKey)}'.`,
    );
    return true;
  }
  if (current.action) {
    setProductionFollowupActions(
      true,
      currentLanguage === "ko"
        ? `다음: 현재 채팅방에서 '${t(current.action.labelKey)}' 작업을 진행하세요.`
        : `Next: run '${t(current.action.labelKey)}' in this room.`,
    );
    return true;
  }
  setProductionFollowupActions(
    true,
    currentLanguage === "ko"
      ? "다음: 대화를 확인하거나 새 메시지를 작성하세요."
      : "Next: review the conversation or write a new message.",
  );
  return true;
}

async function openSavedInviteRoomReceiveOwnerBeforeSwitch(targetRoom) {
  const targetInput = savedInviteRoomInput(targetRoom);
  if (!productionTwoProfileReceiveActiveInOtherRoom(targetInput)) {
    return false;
  }
  rememberReceiveIntentForRoom(targetInput, true);
  const stopPending = productionTwoProfileOnionReceiveMode.stopRequested === true;
  const ownerRoom = savedInviteRoomForRoomFingerprint(productionTwoProfileOnionReceiveMode.roomFingerprint);
  if (!ownerRoom) {
    return showSavedInviteRoomReceiveOwnerMissing(targetRoom, "Message listening owner room missing", { stopPending });
  }
  const openedOwner = await openSavedInviteRoom(ownerRoom);
  if (!openedOwner) {
    return showSavedInviteRoomReceiveOwnerMissing(targetRoom, "Message listening owner room unavailable", { stopPending });
  }
  if (stopPending) {
    return showSavedInviteRoomReceiveStopPending();
  }
  setProductionTwoProfileState("Message listening active in another room");
  setText(fields.productionTwoProfileWarning, t("receiveOtherRoomActive"));
  setChatDeliveryNoticeByKey("receiveOtherRoomActive", "warning", productionTwoProfileInput());
  setProductionFollowupActions(
    true,
    currentLanguage === "ko"
      ? "다음: 이 채팅방에서 메시지 받기를 중지한 뒤, 다시 시작하려던 채팅방을 여세요."
      : "Next: stop receiving in this room, then reopen the room you wanted to start.",
  );
  fields.stopProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
  return true;
}

function showSavedInviteRoomExpiredRealOnionAction() {
  const input = productionTwoProfileInput();
  const message = currentLanguage === "ko"
    ? "저장된 비공개 전송 복구 안내가 만료되었습니다. 현재 방 상태를 다시 확인한 뒤 필요한 작업을 진행하세요."
    : "The saved private delivery recovery hint expired. Review the current room state before choosing the next action.";
  rememberCurrentInviteRoomMetadata();
  renderSavedInviteRooms();
  applyProductionActionState();
  setProductionTwoProfileState("Private delivery recovery expired");
  setText(fields.productionTwoProfileWarning, message);
  clearLatestChatDeliveryNoticeState();
  setChatDeliveryNotice(message, "muted");
  setProductionFollowupActions(
    true,
    currentLanguage === "ko"
      ? "다음: 현재 방 기준으로 비공개 전송 허용, 주소 준비, 전송 테스트 중 필요한 작업을 진행하세요."
      : "Next: use the current room state to enable private delivery, set up the route, or test delivery.",
  );
  const routeReadiness = externalPeerSendReadiness(input, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  if (!routeReadiness.ready) {
    showRealOnionRouteReadinessBlock(routeReadiness, input);
    return true;
  }
  fields.runProductionTwoProfileRealOnionRoundtrip?.focus?.({ preventScroll: true });
  return true;
}

function showRealOnionRouteReadinessBlock(readiness, input = productionTwoProfileInput()) {
  const receiveStopPending = routeReadinessReceiveStopPending(readiness);
  const noticeKey = receiveStopPending
    ? "receiveStopPending"
    : readiness?.noticeKey || "privateDeliveryRouteNeeded";
  const message = receiveStopPending
    ? t("receiveStopPending")
    : readiness?.disabledReason || t(noticeKey);
  setProductionTwoProfileState("Private delivery not ready");
  setText(fields.productionTwoProfileWarning, message);
  setText(fields.productionTwoProfileProfiles, t("roomStateSaved"));
  setText(fields.productionTwoProfileSession, message);
  setText(fields.productionTwoProfileMessageState, t("messageNotSent"));
  setText(fields.productionTwoProfileBoundary, "Private delivery was not started because the route is not ready.");
  setChatDeliveryNoticeByKey(noticeKey, "warning", input);
  setProductionFollowupActions(
    true,
    currentLanguage === "ko"
      ? "다음: 현재 안내된 작업을 먼저 완료한 뒤 전송 테스트를 다시 실행하세요."
      : "Next: complete the current route-readiness action, then run the delivery test again.",
  );
  if (readiness?.nextAction === "enable-private-delivery") {
    fields.openPrivateDeliverySettings?.focus?.({ preventScroll: true });
    return true;
  }
  if (readiness?.nextAction === "verify") {
    focusSafetyConfirmation();
    return true;
  }
  if (readiness?.nextAction === "start-receiving") {
    if (routeReadinessReceiveRuntimeMismatch(readiness)) {
      setProductionFollowupActions(
        true,
        currentLanguage === "ko"
          ? "다음: 현재 받기를 중지한 뒤 이 채팅방에서 메시지 받기를 다시 시작하세요."
          : "Next: stop the current receiver, then start receiving again in this room.",
      );
      fields.stopProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
      return true;
    }
    if (receiveStopPending) {
      setProductionFollowupActions(
        true,
        currentLanguage === "ko"
          ? "다음: 받기 중지가 완료될 때까지 기다린 뒤 대상 방을 다시 여세요."
          : "Next: wait until receiving has fully stopped, then reopen the target room.",
      );
      return true;
    }
    fields.startProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
    return true;
  }
  if (readiness?.nextAction === "refresh-endpoint") {
    focusPrivateRouteNextAction(input);
    return true;
  }
  fields.runProductionTwoProfileMessageRoundtrip?.focus?.({ preventScroll: true });
  return true;
}

function savedInviteRoomActionRechecksAfterOpen(action) {
  const normalized = String(action ?? "");
  return (
    normalized.startsWith("real-onion-") ||
    new Set([
      "enable-private-delivery",
      "prepare-private-route",
      "refresh-endpoint",
      "refresh-and-retry",
      "retry",
      "retry-network",
      "start-receiving",
      "stop-receiving",
      "wait-receive-stop",
      "verify-safety",
    ]).has(normalized)
  );
}

function showSavedInviteRoomActionNowReady() {
  rememberCurrentInviteRoomMetadata();
  renderSavedInviteRooms();
  setProductionTwoProfileState("Room ready");
  setText(fields.productionTwoProfileWarning, t("inviteRoomReadyAfterSessionCode"));
  setChatDeliveryNoticeByKey("inviteRoomReadyAfterSessionCode", "success", productionTwoProfileInput());
  fields.productionTwoProfileMessage?.focus?.({ preventScroll: true });
  return true;
}

function showSavedInviteRoomRecoveryAfterOpen(input = productionTwoProfileInput()) {
  const current = currentSavedInviteRoomView(input);
  if (!current.action) {
    return false;
  }
  if (savedInviteRoomActionCanUseRetryableOutbound(current.action, current.actionOrigin)) {
    const pending = savedInviteRoomResolvedRetryableOutbound(
      current.room,
      input,
      current.action,
      current.actionOrigin,
    );
    return pending ? showExactRetryableOutboundPrompt(pending, input) : false;
  }
  if (current.action === "wait-receive-stop") {
    return showSavedInviteRoomReceiveStopPending();
  }
  const routeReadiness = externalPeerSendReadiness(input, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  if (!routeReadiness.ready) {
    return showRealOnionRouteReadinessBlock(routeReadiness, input);
  }
  if (String(current.action ?? "").startsWith("real-onion-")) {
    const recoveryView = savedInviteRoomRealOnionRecoveryView(current.room);
    if (recoveryView?.action !== current.action) {
      return false;
    }
    const recovery = recoveryView.recovery;
    const runAction = realOnionRecoveryRunAction(recovery);
    const noticeKey = runAction.noticeKey || realOnionRecoveryNoticeKey(recovery);
    if (!noticeKey) {
      return false;
    }
    setProductionTwoProfileState("Private delivery needs review");
    setText(fields.productionTwoProfileWarning, t(noticeKey));
    setChatDeliveryNoticeByKey(noticeKey, "warning", input);
    setProductionFollowupActions(true, t(noticeKey));
    return true;
  }
  return false;
}

function showSavedInviteRoomRealOnionNeedsMessage(input = productionTwoProfileInput()) {
  const hasRetentionPolicy = messageRetentionPolicyReady();
  const messageReady = Boolean(input.message && input.messageTtlSeconds);
  if (messageReady) {
    return false;
  }
  const message = hasRetentionPolicy && !input.message
    ? t("writeMessageBeforeSending")
    : messageTtlInputBlocker();
  rememberCurrentInviteRoomMetadata();
  renderSavedInviteRooms();
  setProductionTwoProfileState("Private delivery needs message");
  setText(fields.productionTwoProfileWarning, message);
  setText(fields.productionTwoProfileMessageState, t("messageNotSent"));
  setText(fields.productionTwoProfileBoundary, "Private delivery was not started because no message is ready.");
  clearLatestChatDeliveryNoticeState();
  setChatDeliveryNotice(message, "muted");
  setProductionFollowupActions(
    true,
    currentLanguage === "ko"
      ? "다음: 메시지를 작성한 뒤 비공개 전송을 다시 시도하세요."
      : "Next: write a message, then retry private delivery.",
  );
  (hasRetentionPolicy ? fields.productionTwoProfileMessage : fields.productionTwoProfileMessageTtl)
    ?.focus?.({ preventScroll: true });
  refreshFieldTestReport();
  return true;
}

function savedInviteRoomRecheckedRouteReadinessAction(action, actionOrigin, currentRoom) {
  if (actionOrigin !== "route-readiness") {
    return null;
  }
  const routeReadinessView = savedInviteRoomRouteReadinessView(currentRoom);
  if (!routeReadinessView) {
    return { ready: true };
  }
  if (routeReadinessView.action === action) {
    return { ready: false, action };
  }
  return { ready: false, action: routeReadinessView.action };
}

function savedInviteRoomPreservesOpenActionOrigin(actionOrigin) {
  return privateDeliveryState.savedInviteRoomPreservesOpenActionOrigin(actionOrigin);
}

function clearRouteReadinessOnlyFollowupContext(input = productionTwoProfileInput()) {
  let changed = false;
  if (privateRouteFollowupMatchesRoom(input)) {
    clearPrivateRouteFollowup();
    changed = true;
  }
  if (latestChatDeliveryNoticePendingOutbound && chatDeliveryNoticeMatchesInput(input)) {
    latestChatDeliveryNoticePendingOutbound = null;
    if (!isRouteReadinessNoticeKey(latestChatDeliveryNoticeKey)) {
      setChatDeliveryNoticeByKey("", "neutral", input);
    }
    changed = true;
  }
  const selected = selectedTwoProfileRetryableOutboundEntry(input);
  if (selected) {
    latestClearedRetryableSelection = {
      roomFingerprint: String(selected.roomFingerprint ?? twoProfileSessionStatusFingerprint(input)).trim(),
      sender: String(selected.sender ?? "").trim(),
      receiver: String(selected.receiver ?? "").trim(),
      messageNumber: Number.parseInt(selected.messageNumber, 10) || 0,
      message: String(selected.message ?? "").trim(),
    };
    selectedTwoProfileConversationKey = null;
    renderProductionTwoProfileConversationList();
    changed = true;
  }
  if (changed) {
    applyProductionActionState();
  }
  return changed;
}

async function runSavedInviteRoomListAction(room, action, options = {}) {
  const actionOrigin = String(options.actionOrigin ?? "").trim();
  if (
    action === "start-receiving" &&
    !savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin) &&
    await openSavedInviteRoomReceiveOwnerBeforeSwitch(room)
  ) {
    return true;
  }
  const opened = await openSavedInviteRoom(room);
  if (!opened) {
    return false;
  }
  const input = productionTwoProfileInput();
  if (savedInviteRoomActionIsRouteReadinessOnly(actionOrigin)) {
    clearRouteReadinessOnlyFollowupContext(input);
  }
  if (
    savedInviteRoomActionCanUseRetryableOutbound(action, actionOrigin) &&
    !savedInviteRoomResolvedRetryableOutbound(room, input, action, actionOrigin)
  ) {
    await handleSavedInviteRoomMissingPendingAction(action);
    return true;
  }
  if (savedInviteRoomActionRechecksAfterOpen(action)) {
    const current = currentSavedInviteRoomView(input);
    const currentRoom = current.room;
    const currentAction = current.action;
    if (currentAction && (currentAction !== action || current.actionOrigin !== actionOrigin)) {
      if (currentAction === "wait-receive-stop") {
        return showSavedInviteRoomReceiveStopPending();
      }
      if (savedInviteRoomActionIsRouteReadinessOnly(actionOrigin)) {
        const routeRecheck = savedInviteRoomRecheckedRouteReadinessAction(action, actionOrigin, currentRoom);
        if (routeRecheck?.ready) {
          return showSavedInviteRoomActionNowReady();
        }
        if (routeRecheck?.action && routeRecheck.action !== action) {
          return runSavedInviteRoomListAction(currentRoom, routeRecheck.action, { actionOrigin: "route-readiness" });
        }
        if (routeRecheck?.action === action) {
          // Keep the original route-only action even if transcript refresh exposed another origin.
        } else {
          return showSavedInviteRoomActionNowReady();
        }
      } else if (savedInviteRoomPreservesOpenActionOrigin(actionOrigin)) {
        // Preserve explicit non-send intent after transcript metadata refresh.
      } else {
        return runSavedInviteRoomListAction(currentRoom, currentAction, { actionOrigin: current.actionOrigin });
      }
    }
    if (!currentAction) {
      return String(action ?? "").startsWith("real-onion-")
        ? showSavedInviteRoomExpiredRealOnionAction()
        : showSavedInviteRoomActionNowReady();
    }
  }
  if (savedInviteRoomRetryOnlyWithoutRetryableOrigin(action, actionOrigin)) {
    clearRouteReadinessOnlyFollowupContext(input);
    return showSavedInviteRoomActionNowReady();
  }
  if (action === "paste-peer-code") {
    rememberReceiveIntentForRoom(input, true);
    rememberPrivateRouteFollowup("receive", input);
    focusPrivateRouteNextAction(input);
    return true;
  }
  if (action === "review-send") {
    return runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin, { reviewOnly: true });
  }
  if (action === "retry") {
    return runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin);
  }
  if (action === "retry-network") {
    return runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin);
  }
  if (action === "enable-private-delivery") {
    if (await runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin)) {
      return true;
    }
    openPrivateDeliverySettings(input);
    return true;
  }
  if (action === "prepare-private-route") {
    if (await runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin)) {
      return true;
    }
    focusPrivateRouteNextAction(input);
    return true;
  }
  if (action === "refresh-endpoint") {
    if (await runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin)) {
      return true;
    }
    setChatDeliveryNoticeByKey("chatNoticeRefreshAddress", "warning", input);
    await preparePrivateDeliveryRoute({ input, forceRefresh: true, allowRetryRecovery: false });
    return true;
  }
  if (action === "verify-safety") {
    if (await runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin)) {
      return true;
    }
    focusSafetyConfirmation();
    return true;
  }
  if (action === "refresh-and-retry") {
    return runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin);
  }
  if (action === "start-receiving") {
    if (await runSavedInviteRoomRetryableOutboundAction(room, input, action, actionOrigin)) {
      return true;
    }
    await startProductionTwoProfileOnionReceive();
    return true;
  }
  if (action === "stop-receiving") {
    stopProductionTwoProfileOnionReceive();
    return true;
  }
  if (action === "wait-receive-stop") {
    return showSavedInviteRoomReceiveStopPending();
  }
  if (action === "real-onion-enable-private-delivery") {
    const recoveryView = savedInviteRoomRealOnionRecoveryView(room);
    if (recoveryView?.action !== action) {
      return showSavedInviteRoomExpiredRealOnionAction();
    }
    enablePrivateDeliveryPermission();
    renderSavedInviteRooms();
    return true;
  }
  if (action === "real-onion-network-settings") {
    const input = productionTwoProfileInput();
    const recoveryView = savedInviteRoomRealOnionRecoveryView(room);
    if (recoveryView?.action !== action) {
      return showSavedInviteRoomExpiredRealOnionAction();
    }
    const recovery = recoveryView.recovery;
    const runAction = realOnionRecoveryRunAction(recovery);
    if (runAction.opensNetworkSettings) {
      openPrivateDeliveryBridgeSettings(recovery, input);
      return true;
    }
    if (runAction.ready) {
      await runProductionTwoProfileRealOnionRoundtrip();
      return true;
    }
    return true;
  }
  if (action === "real-onion-inspect-diagnostics") {
    const input = productionTwoProfileInput();
    const recoveryView = savedInviteRoomRealOnionRecoveryView(room);
    if (recoveryView?.action !== action) {
      return showSavedInviteRoomExpiredRealOnionAction();
    }
    setText(fields.productionTwoProfileWarning, t("fieldTestNextInspectDiagnostics"));
    setChatDeliveryNoticeByKey("fieldTestNextInspectDiagnostics", "warning", input);
    focusLocalDiagnostic();
    return true;
  }
  if (action === "real-onion-retry") {
    const input = productionTwoProfileInput();
    const recoveryView = savedInviteRoomRealOnionRecoveryView(room);
    if (recoveryView?.action !== action) {
      return showSavedInviteRoomExpiredRealOnionAction();
    }
    const routeReadiness = externalPeerSendReadiness(input, {
      allowMissingMessage: true,
      latestOnionOutbound: null,
    });
    if (!routeReadiness.ready) {
      showRealOnionRouteReadinessBlock(routeReadiness, input);
      applyProductionActionState();
      return true;
    }
    if (showSavedInviteRoomRealOnionNeedsMessage(input)) {
      applyProductionActionState();
      return true;
    }
    await runProductionTwoProfileRealOnionRoundtrip();
    return true;
  }
  return false;
}

function currentRoomConversationMetadata(options = {}) {
  let metadata = productionInviteRoomConversationMetadata([...productionTwoProfileConversationEntries.values()]);
  const input = options.input ?? productionTwoProfileInput();
  const existingRoom = savedInviteRoomForRoomFingerprint(privateRouteRoomKey(input));
  const preferredMessageNumber = Number.parseInt(existingRoom?.retryableOutboundMessageNumber ?? 0, 10) || 0;
  if (preferredMessageNumber > 0) {
    metadata = savedInviteRoomMetadataWithPreferredRetryable(
      metadata,
      input,
      [...productionTwoProfileConversationEntries.values()],
      preferredMessageNumber,
    );
  } else if (options.allowRetryableFallback !== true) {
    metadata = inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  return metadata;
}

function reconcileCurrentInviteRoomMetadataFromTranscriptEntries(entries, options = {}) {
  const code = currentInviteRoomCode();
  const role = connectionCodeRoleFor(code);
  if (!code || !role) {
    return false;
  }
  const input = options.input ?? productionTwoProfileInput();
  let metadata = productionInviteRoomConversationMetadata(entries ?? []);
  const existingRoom = savedInviteRoomForRoomFingerprint(privateRouteRoomKey(input));
  const preferredMessageNumber = Number.parseInt(existingRoom?.retryableOutboundMessageNumber ?? 0, 10) || 0;
  if (preferredMessageNumber > 0) {
    metadata = savedInviteRoomMetadataWithPreferredRetryable(metadata, input, entries ?? [], preferredMessageNumber);
  } else if (options.allowRetryableFallback === false) {
    metadata = inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  if (options.sessionStatus) {
    metadata = savedInviteRoomMetadataWithSessionStatus(metadata, input, options.sessionStatus);
  }
  rememberInviteRoom(code, role, metadata);
  return true;
}

async function savedInviteRoomMetadataFromLocalStores(room, options = {}) {
  const input = savedInviteRoomInput(room);
  const { profileA, profileB, passphrase } = input;
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    return null;
  }
  const [profileAResult, profileBResult] = await Promise.all([
    invoke("production_message_transcript_export", { profile: profileA, passphrase }),
    invoke("production_message_transcript_export", { profile: profileB, passphrase }),
  ]);
  const entries = [
    ...twoProfileTranscriptEntriesFromProfile(profileA, profileB, profileAResult.entries),
    ...twoProfileTranscriptEntriesFromProfile(profileB, profileA, profileBResult.entries),
  ];
  let metadata = productionInviteRoomConversationMetadata(entries);
  const preferredMessageNumber = Number.parseInt(room?.retryableOutboundMessageNumber ?? 0, 10) || 0;
  if (preferredMessageNumber > 0) {
    metadata = savedInviteRoomMetadataWithPreferredRetryable(metadata, input, entries, preferredMessageNumber);
  } else if (options.allowRetryableFallback !== true) {
    metadata = inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  return metadata;
}

function inviteRoomMetadataWithoutRetryableOutbound(metadata) {
  return {
    ...metadata,
    retryableOutboundCount: 0,
    retryableOutboundMessageNumber: 0,
    retryableOutboundMessage: "",
    retryableOutboundAction: "",
  };
}

function savedInviteRoomMetadataWithPreferredRetryable(metadata, input, entries, preferredMessageNumber) {
  if (!metadata || Number.parseInt(metadata.retryableOutboundCount ?? 0, 10) <= 0) {
    return metadata;
  }
  const preferred = (entries ?? []).find((entry) =>
    entry?.kind !== "received" &&
      !entry?.statuses?.has?.("received") &&
      String(entry?.profile ?? "").trim().toLowerCase() === String(input.profileA ?? "").trim().toLowerCase() &&
      String(entry?.counterpartProfile ?? "").trim().toLowerCase() === String(input.profileB ?? "").trim().toLowerCase() &&
      Number.parseInt(entry?.messageNumber, 10) === preferredMessageNumber &&
      entry?.outboundRetryable === true &&
      entry?.outboundDeliveryState === "failed"
  );
  if (!preferred) {
    return inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  const preferredMessage = String(preferred.message ?? "").trim();
  const delivered = (entries ?? []).some((entry) =>
    Number.parseInt(entry?.messageNumber, 10) === preferredMessageNumber &&
      String(entry?.message ?? "").trim() === preferredMessage &&
      (
        entry?.statuses?.has?.("received") ||
        (
          entry?.kind === "received" &&
          String(entry?.profile ?? "").trim().toLowerCase() === String(input.profileB ?? "").trim().toLowerCase() &&
          String(entry?.counterpartProfile ?? "").trim().toLowerCase() === String(input.profileA ?? "").trim().toLowerCase()
        )
      )
  );
  if (delivered) {
    return inviteRoomMetadataWithoutRetryableOutbound(metadata);
  }
  const preferredAction = productionTwoProfileOutboundPrimaryAction(preferred).action;
  return {
    ...metadata,
    retryableOutboundMessageNumber: preferredMessageNumber,
    retryableOutboundMessage: preferredMessage,
    retryableOutboundAction: preferredAction,
  };
}

function savedInviteRoomMetadataWithSessionStatus(metadata, input, sessionStatus) {
  if (!metadata || !sessionStatus || Number.parseInt(metadata.retryableOutboundCount ?? 0, 10) <= 0) {
    return metadata;
  }
  const currentAction = savedInviteRoomRetryableAction(metadata.retryableOutboundAction);
  const readiness = externalPeerSendReadiness(input, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  if (!readiness.ready) {
    if (readiness.nextAction === "enable-private-delivery") {
      return { ...metadata, retryableOutboundAction: "enable-private-delivery" };
    }
    if (readiness.nextAction === "verify") {
      return { ...metadata, retryableOutboundAction: "verify-safety" };
    }
    if (readiness.nextAction === "start-receiving") {
      return {
        ...metadata,
        retryableOutboundAction: routeReadinessReceiveStopPending(readiness)
          ? "wait-receive-stop"
          : "start-receiving",
      };
    }
    if (readiness.nextAction === "refresh-endpoint") {
      return {
        ...metadata,
        retryableOutboundAction: readiness.peerEndpointState?.stale
          ? "refresh-and-retry"
          : "prepare-private-route",
      };
    }
  }
  if (
    [
      "enable-private-delivery",
      "verify-safety",
      "start-receiving",
      "refresh-and-retry",
      "prepare-private-route",
    ].includes(currentAction)
  ) {
    return { ...metadata, retryableOutboundAction: "retry" };
  }
  return metadata;
}

function savedInviteRoomForRoomFingerprint(roomFingerprint, rooms = savedInviteRooms()) {
  const fingerprint = String(roomFingerprint ?? "").trim();
  if (!fingerprint) {
    return null;
  }
  return (
    (Array.isArray(rooms) ? rooms : []).find(
      (room) => privateRouteRoomKey(savedInviteRoomInput(room)) === fingerprint,
    ) ?? null
  );
}

async function refreshSavedInviteRoomMetadataForFingerprint(roomFingerprint, options = {}) {
  const room = savedInviteRoomForRoomFingerprint(roomFingerprint);
  if (!room) {
    renderSavedInviteRooms();
    return false;
  }
  try {
    const input = savedInviteRoomInput(room);
    let metadata = await savedInviteRoomMetadataFromLocalStores(room);
    if (!metadata) {
      renderSavedInviteRooms();
      return false;
    }
    const retryableMetadataCleared =
      savedInviteRoomHasRetryableOutbound(room) && !savedInviteRoomHasRetryableOutbound(metadata);
    const refreshSessionStatus =
      options.refreshSessionStatus === true ||
      (retryableMetadataCleared && !latestTwoProfileSessionStatusForCurrentInput(input));
    if (refreshSessionStatus) {
      try {
        const sessionStatus = await invokeInviteRoomSessionStatus(input);
        rememberTwoProfileSessionStatus(input, sessionStatus);
        metadata = savedInviteRoomMetadataWithSessionStatus(metadata, input, sessionStatus);
      } catch {
        forgetTwoProfileSessionStatusForInput(input);
      }
    }
    rememberInviteRoom(
      room.code,
      room.role,
      options.preserveUpdatedAt ? { ...metadata, updatedAt: room.updatedAt } : metadata,
      { render: false },
    );
    renderSavedInviteRooms();
    return true;
  } catch {
    renderSavedInviteRooms();
    return false;
  }
}

function savedInviteRoomMetadataSyncCandidates(rooms = savedInviteRooms()) {
  return savedInviteRoomPriorityEntries(rooms)
    .sort((left, right) => {
      const priority = right.priority - left.priority;
      return priority || right.updatedAt - left.updatedAt || left.index - right.index;
    })
    .map(({ room }) => room)
    .slice(0, savedRoomMetadataStartupSyncLimit);
}

function renderSavedRoomMetadataSyncStatus() {
  if (!fields.roomListSyncStatus) {
    return;
  }
  const key = savedRoomMetadataSyncStatus.key;
  fields.roomListSyncStatus.hidden = !key;
  fields.roomListSyncStatus.className = [
    "room-list-sync-status",
    savedRoomMetadataSyncStatus.tone ? `is-${savedRoomMetadataSyncStatus.tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  fields.roomListSyncStatus.textContent = key ? formatTemplate(key, savedRoomMetadataSyncStatus.values) : "";
}

function setSavedRoomMetadataSyncStatus(key = "", tone = "muted", values = {}) {
  savedRoomMetadataSyncStatus = { key, tone, values };
  renderSavedRoomMetadataSyncStatus();
}

async function syncSavedInviteRoomMetadataFromLocalStores() {
  if (savedRoomMetadataSyncInFlight) {
    return false;
  }
  const candidates = savedInviteRoomMetadataSyncCandidates();
  if (!candidates.length) {
    setSavedRoomMetadataSyncStatus("");
    return false;
  }
  savedRoomMetadataSyncInFlight = true;
  setSavedRoomMetadataSyncStatus("roomListSyncRunning", "progress", { count: candidates.length });
  let refreshed = 0;
  let failed = 0;
  try {
    for (const room of candidates) {
      try {
        let metadata = await savedInviteRoomMetadataFromLocalStores(room);
        if (metadata) {
          try {
            const input = savedInviteRoomInput(room);
            const sessionStatus = await invokeInviteRoomSessionStatus(input);
            rememberTwoProfileSessionStatus(input, sessionStatus);
            metadata = savedInviteRoomMetadataWithSessionStatus(metadata, input, sessionStatus);
          } catch {
            forgetTwoProfileSessionStatusForInput(savedInviteRoomInput(room));
            // Keep transcript refresh useful even if session status cannot be read yet.
          }
          rememberInviteRoom(room.code, room.role, { ...metadata, updatedAt: room.updatedAt }, { render: false });
          refreshed += 1;
        }
      } catch {
        failed += 1;
        // A room may not have local transcript data yet; keep the saved list entry unchanged.
      }
    }
    renderSavedInviteRooms();
    setSavedRoomMetadataSyncStatus(
      failed ? "roomListSyncPartial" : "roomListSyncComplete",
      failed ? "warning" : "muted",
      { count: refreshed },
    );
    return true;
  } finally {
    savedRoomMetadataSyncInFlight = false;
  }
}

function rememberCurrentInviteRoomMetadata() {
  const code = currentInviteRoomCode();
  const role = connectionCodeRoleFor(code);
  if (!code || !role) {
    return;
  }
  const allowRetryableFallback = allowCurrentRoomRetryableMetadataFallbackOnce === true;
  allowCurrentRoomRetryableMetadataFallbackOnce = false;
  rememberInviteRoom(code, role, currentRoomConversationMetadata({ allowRetryableFallback }));
}

function refreshCurrentRoomAfterReceiveImport(refreshPlan = {}, input = productionTwoProfileInput()) {
  const sessionsReady = twoProfileSessionsReadyForInput(input);
  rememberCurrentInviteRoomMetadata();
  renderSavedInviteRooms();
  renderRoomStatusSummary(input, sessionsReady);
  renderRoomIdentityBar(input, sessionsReady);
  if (refreshPlan.messageImported) {
    renderProductionTwoProfileMemory(input);
  }
}

function currentInviteRoomCode() {
  return (fields.productionTwoProfileB?.value ?? "").trim();
}

function savedInviteRoomListItemView(room, context = {}) {
  const viewRoom = savedInviteRoomWithoutLoadedStaleRetryable(room, {
    persist: context.persistStaleRetryableClear === true,
  });
  const currentCode = context.currentCode ?? currentInviteRoomCode();
  const resumeRoom = context.resumeRoom ?? null;
  const receiveState = savedInviteRoomReceiveState(viewRoom);
  const waitingPeerCode = savedInviteRoomWaitingForPeerCode(viewRoom);
  const routeReadinessViewCandidate = savedInviteRoomHasRetryableOutbound(viewRoom)
    ? null
    : savedInviteRoomRouteReadinessView(viewRoom);
  const receiveOwnershipBlocksRecovery = savedInviteRoomReceiveOwnershipBlocksRecovery({
    receiveState,
    routeReadinessAction: routeReadinessViewCandidate?.action ?? "",
  });
  const routeReadinessBlocksRecovery = Boolean(routeReadinessViewCandidate);
  const realOnionRecoveryView = (
    savedInviteRoomHasRetryableOutbound(viewRoom) ||
    receiveOwnershipBlocksRecovery ||
    routeReadinessBlocksRecovery
  )
    ? null
    : savedInviteRoomRealOnionRecoveryView(viewRoom);
  const routeReadinessView = savedInviteRoomHasRetryableOutbound(viewRoom) || realOnionRecoveryView
    ? null
    : routeReadinessViewCandidate;
  const resumeRecommended = Boolean(resumeRoom && viewRoom.code === resumeRoom.code && viewRoom.role === resumeRoom.role);
  return {
    current: viewRoom.code === currentCode,
    hasRetryableSend: savedInviteRoomHasRetryableOutbound(viewRoom),
    nextAction: savedInviteRoomListAction(viewRoom, {
      realOnionRecoveryView,
      receiveState,
      routeReadinessView,
      waitingPeerCode,
    }),
    preview: savedInviteRoomPreview(viewRoom),
    receiveState,
    resumeRecommended,
    room: viewRoom,
    state: savedInviteRoomState(viewRoom, {
      realOnionRecoveryView,
      receiveState,
      resumeRecommended,
      routeReadinessView,
      waitingPeerCode,
    }),
    waitingPeerCode,
  };
}

function savedInviteRoomWithoutRetryableOutbound(room) {
  return inviteRoomMetadataWithoutRetryableOutbound(room);
}

function clearSavedInviteRoomRetryableOutbound(room) {
  if (!savedInviteRoomHasRetryableOutbound(room)) {
    return false;
  }
  rememberInviteRoom(
    room.code,
    room.role,
    {
      retryableOutboundCount: 0,
      retryableOutboundMessageNumber: 0,
      retryableOutboundMessage: "",
      retryableOutboundAction: "",
      updatedAt: Number(room.updatedAt ?? 0),
    },
    { render: false },
  );
  return true;
}

function currentSavedInviteRoomView(input = productionTwoProfileInput()) {
  const currentRoom = savedInviteRoomForRoomFingerprint(privateRouteRoomKey(input));
  if (!currentRoom) {
    return { room: null, view: null, action: "" };
  }
  let viewRoom = currentRoom;
  let view = savedInviteRoomListItemView(viewRoom, {
    currentCode: currentInviteRoomCode(),
    persistStaleRetryableClear: true,
  });
  if (
    view?.nextAction?.origin === "retryable-outbound" &&
    productionTwoProfileConversationEntries.size > 0 &&
    !retryableOutboundEntryForSavedRoomAction(currentRoom, input, { actionOrigin: "retryable-outbound" })
  ) {
    clearSavedInviteRoomRetryableOutbound(currentRoom);
    viewRoom = savedInviteRoomWithoutRetryableOutbound(currentRoom);
    view = savedInviteRoomListItemView(viewRoom, {
      currentCode: currentInviteRoomCode(),
      persistStaleRetryableClear: true,
    });
  }
  return {
    room: viewRoom,
    view,
    action: view?.nextAction?.action ?? "",
    actionOrigin: view?.nextAction?.origin ?? "",
  };
}

function renderSavedInviteRooms() {
  if (!fields.savedRoomList) {
    return;
  }
  const rooms = savedInviteRooms();
  fields.savedRoomList.replaceChildren();
  if (!rooms.length) {
    const empty = document.createElement("li");
    empty.className = "is-empty";
    empty.textContent = t("roomListEmpty");
    fields.savedRoomList.append(empty);
    return;
  }
  const currentCode = currentInviteRoomCode();
  const resumeRoom = savedInviteRoomResumeRoom(rooms);
  for (const room of rooms) {
    const view = savedInviteRoomListItemView(room, {
      currentCode,
      resumeRoom,
      persistStaleRetryableClear: true,
    });
    const item = document.createElement("li");
    item.className = "saved-room-list-item";
    item.classList.toggle("is-current", view.current);
    item.classList.toggle("is-resume-recommended", view.resumeRecommended);
    item.classList.toggle("is-listening", view.receiveState === "listening");
    item.classList.toggle("needs-receive-restart", view.receiveState === "paused");
    item.classList.toggle("is-waiting-peer-code", view.waitingPeerCode);
    item.classList.toggle("has-retryable-send", view.hasRetryableSend);
    const summary = document.createElement("span");
    summary.className = "saved-room-summary";
    const title = document.createElement("span");
    title.className = "saved-room-title";
    title.textContent = savedInviteRoomLabel(room);
    const preview = document.createElement("span");
    preview.className = "saved-room-preview";
    preview.textContent = view.preview;
    const meta = document.createElement("span");
    meta.className = "saved-room-meta";
    meta.textContent = `${savedInviteRoomShortSlug(room)} / ${formatTemplate("roomMessageCount", {
      count: room.messageCount,
    })}`;
    summary.append(title, preview, meta);
    const state = document.createElement("span");
    state.className = `saved-room-state is-${view.state.key}`;
    state.textContent = view.state.label;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "flow-control is-secondary";
    open.textContent = t("openRoom");
    open.addEventListener("click", () => {
      openSavedInviteRoom(room);
    });
    const nextAction = document.createElement("button");
    nextAction.type = "button";
    nextAction.className = "flow-control saved-room-next-action";
    nextAction.hidden = !view.nextAction;
    nextAction.textContent = view.nextAction ? t(view.nextAction.labelKey) : "";
    nextAction.addEventListener("click", () => {
      if (view.nextAction) {
        runSavedInviteRoomListAction(view.room ?? room, view.nextAction.action, { actionOrigin: view.nextAction.origin });
      }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "flow-control is-secondary saved-room-remove";
    remove.textContent = t("removeRoom");
    remove.addEventListener("click", () => {
      removeSavedInviteRoom(room);
    });
    item.append(summary, state, open, nextAction, remove);
    fields.savedRoomList.append(item);
  }
}

function removeSavedInviteRoom(room) {
  const code = String(room?.code ?? "").trim();
  if (!code) {
    return false;
  }
  if (!window.confirm(t("removeRoomConfirm"))) {
    return false;
  }
  stopProductionTwoProfileOnionReceiveForInput(savedInviteRoomInput(room), { silent: true });
  forgetInviteRoom(code);
  if (code === currentInviteRoomCode()) {
    clearCurrentInviteRoomInput();
    showRoomList();
  }
  setProductionTwoProfileState("Room removed from list");
  setText(fields.productionTwoProfileWarning, t("removeRoomNotice"));
  return true;
}

function connectionCodeRoleFor(code) {
  const trimmedCode = String(code ?? "").trim();
  if (!trimmedCode) {
    return "";
  }
  const currentCode = String(fields.productionTwoProfileB?.value ?? "").trim();
  const currentRole = fields.productionTwoProfileB?.dataset.inviteCodeRole;
  if (trimmedCode === currentCode && (currentRole === "inviter" || currentRole === "joiner")) {
    return currentRole;
  }
  if (latestConnectionCodeRole && trimmedCode === latestDerivedConnectionCode) {
    return latestConnectionCodeRole;
  }
  const stored = localStoreGet(connectionCodeRoleStorageKey(trimmedCode));
  if (stored === "inviter" || stored === "joiner") {
    latestConnectionCodeRole = stored;
    return stored;
  }
  return trimmedCode === latestCreatedInviteCode ? "inviter" : "joiner";
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!$%^*";
  const bytes = new Uint8Array(48);
  if (!window.crypto?.getRandomValues) {
    throw new Error(t("inviteCodeUnavailable"));
  }
  const chars = [];
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  while (chars.length < 36) {
    window.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < limit) {
        chars.push(alphabet[byte % alphabet.length]);
      }
      if (chars.length === 36) {
        break;
      }
    }
  }
  return chars.join("");
}

function renderCurrentInviteCodeDisplay() {
  const code = (fields.productionTwoProfileB?.value ?? "").trim();
  const role = connectionCodeRoleFor(code);
  const inviterCode = Boolean(code && role === "inviter" && currentInviteCodeShareVisible);
  const copiedCurrentInviteCode = Boolean(inviterCode && copiedInviteCode === code);
  if (fields.settingsInviteCodeDisplay) {
    fields.settingsInviteCodeDisplay.value = code;
    fields.settingsInviteCodeDisplay.hidden = !code;
  }
  if (fields.createdInviteCodeDisplay) {
    fields.createdInviteCodeDisplay.value = inviterCode ? code : "";
    fields.createdInviteCodeDisplay.hidden = !fields.createdInviteCodeDisplay.value;
  }
  if (fields.roomInviteTokenDisplay) {
    fields.roomInviteTokenDisplay.value = inviterCode ? code : "";
  }
  if (fields.roomInviteTokenPanel) {
    fields.roomInviteTokenPanel.hidden = !inviterCode;
  }
  document.body.classList.toggle("has-current-invite-code", Boolean(code));
  document.body.classList.toggle("has-inviter-invite-code", Boolean(inviterCode));
  renderConnectionDeviceRole();
  document.body.classList.toggle("has-copied-invite-code", copiedCurrentInviteCode);
  fields.copyInviteCode?.toggleAttribute("disabled", !code);
  fields.copyCreatedInviteCode?.toggleAttribute("disabled", !(code && inviterCode));
  fields.copyRoomInviteToken?.toggleAttribute("disabled", !(code && inviterCode));
  renderSavedInviteRooms();
}

function inviteLocalReadyStatusResult(input, session) {
  const ready = Boolean(session?.ready_for_message_envelope);
  return {
    profile_a: input.profileA,
    profile_b: input.profileB,
    profile_a_ready_for_message_envelope: ready,
    profile_b_ready_for_message_envelope: ready,
    both_ready_for_message_envelope: ready,
    profile_a_remote_endpoint_state_present: Boolean(session?.remote_endpoint_state_present),
    profile_b_remote_endpoint_state_present: Boolean(session?.remote_endpoint_state_present),
    profile_a_remote_endpoint_invite_placeholder: Boolean(session?.remote_endpoint_state_present),
    profile_b_remote_endpoint_invite_placeholder: Boolean(session?.remote_endpoint_state_present),
    profile_a_remote_endpoint_marked_stale: Boolean(session?.remote_endpoint_marked_stale),
    profile_b_remote_endpoint_marked_stale: Boolean(session?.remote_endpoint_marked_stale),
    profile_a_remote_endpoint_refresh_recommended: Boolean(session?.remote_endpoint_refresh_recommended),
    profile_b_remote_endpoint_refresh_recommended: Boolean(session?.remote_endpoint_refresh_recommended),
    profile_a_remote_endpoint_last_failed_message_number:
      session?.remote_endpoint_last_failed_message_number ?? null,
    profile_b_remote_endpoint_last_failed_message_number:
      session?.remote_endpoint_last_failed_message_number ?? null,
    profile_a_session_transport_state_present: Boolean(session?.session_transport_state_present),
    profile_b_session_transport_state_present: Boolean(session?.session_transport_state_present),
    profile_a_runtime_material_reconstructable: Boolean(session?.runtime_material_reconstructable),
    profile_b_runtime_material_reconstructable: Boolean(session?.runtime_material_reconstructable),
    profile_a_outbound_envelope_io_ready: Boolean(session?.outbound_envelope_io_ready),
    profile_b_outbound_envelope_io_ready: Boolean(session?.outbound_envelope_io_ready),
    store_path_returned: Boolean(session?.store_path_returned),
    passphrase_retained: Boolean(session?.passphrase_retained),
    key_material_exposed: Boolean(session?.key_material_exposed),
    network_io_attempted: Boolean(session?.network_io_attempted),
    transport_io_opened: Boolean(session?.transport_io_opened),
    runtime_messaging_enabled: Boolean(session?.runtime_messaging_enabled),
  };
}

function connectionDeviceRoleKey(code = (fields.productionTwoProfileB?.value ?? "").trim()) {
  if (!code) {
    return "";
  }
  return connectionCodeRoleFor(code) === "inviter" ? "deviceRoleInviter" : "deviceRoleJoiner";
}

function renderConnectionDeviceRole() {
  const roleKey = connectionDeviceRoleKey();
  const text = roleKey ? t(roleKey) : "";
  setText(fields.connectionDeviceRole, text);
}

function renderReceivedInviteCodeActionState() {
  const code = (fields.receivedInviteCode?.value ?? "").trim();
  if (fields.createRoomFromReceivedCode) {
    fields.createRoomFromReceivedCode.disabled = !code;
    fields.createRoomFromReceivedCode.title = code ? t("roomActionCreate") : t("inviteCodeMissing");
  }
  const roomListCode = (fields.roomListInviteCode?.value ?? "").trim();
  if (fields.roomListJoinRoom) {
    fields.roomListJoinRoom.disabled = !roomListCode;
    fields.roomListJoinRoom.title = roomListCode ? t("roomActionCreate") : t("inviteCodeMissing");
  }
}

function resetFailedJoinInviteRoomState(code) {
  const trimmedCode = String(code ?? "").trim();
  if (currentInviteCodeRole() !== "joiner") {
    return;
  }
  latestCreatedInviteCode = "";
  copiedInviteCode = "";
  latestDerivedConnectionCode = "";
  latestConnectionCodeRole = "";
  if (fields.productionTwoProfileA && isDerivedConnectionProfile(fields.productionTwoProfileA.value)) {
    fields.productionTwoProfileA.value = "";
  }
  if (fields.productionTwoProfileB?.value === trimmedCode) {
    fields.productionTwoProfileB.value = "";
  }
  if (fields.productionTwoProfilePassphrase?.value === trimmedCode) {
    fields.productionTwoProfilePassphrase.value = "";
  }
  if (fields.receivedInviteCode) {
    fields.receivedInviteCode.value = trimmedCode;
  }
  forgetLastInviteRoom(trimmedCode);
  renderReceivedInviteCodeActionState();
  updateMinimalChatMode(productionTwoProfileInput(), false);
  openChatSettingsPanel(fields.receivedInviteCode);
}

function focusCurrentInviteCodeDisplay() {
  if (fields.createdInviteCodeDisplay && !fields.createdInviteCodeDisplay.hidden) {
    fields.createdInviteCodeDisplay.scrollIntoView?.({ block: "center", behavior: "smooth" });
    fields.createdInviteCodeDisplay.focus?.({ preventScroll: true });
    fields.createdInviteCodeDisplay.select?.();
    return;
  }
  fields.productionTwoProfileB?.focus?.({ preventScroll: true });
  fields.productionTwoProfileB?.select?.();
}

async function copyCurrentInviteCode(options = {}) {
  const code = (fields.productionTwoProfileB?.value ?? "").trim();
  if (!code) {
    setProductionTwoProfileState("Invite code missing");
    setText(fields.productionTwoProfileWarning, t("inviteCodeMissing"));
    openChatSettingsPanel(fields.productionTwoProfileB);
    return false;
  }
  try {
    await navigator.clipboard.writeText(code);
    copiedInviteCode = code;
    renderCurrentInviteCodeDisplay();
    applyProductionActionState();
    setProductionTwoProfileState("Invite code copied");
    setText(fields.productionTwoProfileWarning, t("inviteCodeCopied"));
    return true;
  } catch {
    if (fields.createdInviteCodeDisplay && !fields.createdInviteCodeDisplay.hidden) {
      fields.createdInviteCodeDisplay.focus?.();
      fields.createdInviteCodeDisplay.select?.();
    } else {
      fields.productionTwoProfileB?.select?.();
    }
    setProductionTwoProfileState("Invite code selected");
    setText(
      fields.productionTwoProfileWarning,
      options.quiet ? t("inviteCodeCreatedHint") : t("inviteCodeCopyFallback"),
    );
    return false;
  }
}

function fieldTestReportValue(value, fallback = "unknown") {
  return privateDeliveryState.fieldTestReportValue(value, fallback);
}

function latestRealOnionBootstrapDiagnostic(result) {
  const events = Array.isArray(result?.event_summary) ? result.event_summary : [];
  const diagnostics = events.filter((event) => String(event).includes("bootstrap_diagnostic"));
  return diagnostics.at(-1) ?? "none";
}

function fieldTestBoundarySummary(text) {
  return privateDeliveryState.fieldTestBoundarySummary(text);
}

function fieldTestBoundaryValue(text, key, fallback = "none") {
  return privateDeliveryState.fieldTestBoundaryValue(text, key, fallback);
}

function parseFieldTestReport(report) {
  return privateDeliveryState.parseFieldTestReport(report);
}

function fieldTestRouteReadinessBlocked(parsed) {
  return privateDeliveryState.fieldTestRouteReadinessBlocked(parsed);
}

function fieldTestBlockedRouteReadinessAction(parsed) {
  return privateDeliveryState.fieldTestBlockedRouteReadinessAction(parsed);
}

function fieldTestReceiveAwareRecoveryAction(action, parsed) {
  return privateDeliveryState.fieldTestReceiveAwareRecoveryAction(action, parsed);
}

function fieldTestRouteReadinessRecoveryAction(parsed) {
  return privateDeliveryState.fieldTestRouteReadinessRecoveryAction(parsed);
}

function fieldTestReportHasSavedRoomContext(parsed) {
  return privateDeliveryState.fieldTestReportHasSavedRoomContext(parsed);
}

function fieldTestReportStandaloneOutboundRecoveryAction(parsed) {
  return privateDeliveryState.fieldTestReportStandaloneOutboundRecoveryAction(parsed);
}

function fieldTestReportRoomListAction(parsed) {
  return privateDeliveryState.fieldTestReportRoomListAction(parsed);
}

function fieldTestReportResolvedRoomListAction(parsed) {
  return privateDeliveryState.fieldTestReportResolvedRoomListAction(parsed);
}

function fieldTestReportOutboundFailureClass(parsed) {
  return privateDeliveryState.fieldTestReportOutboundFailureClass(parsed);
}

function fieldTestReportBlocker(parsed) {
  return privateDeliveryState.fieldTestReportBlocker(parsed);
}

function fieldTestExternalOnionDelivered(parsed) {
  return privateDeliveryState.fieldTestExternalOnionDelivered(parsed);
}

function fieldTestReportReceiveValue(parsed) {
  return privateDeliveryState.fieldTestReportReceiveValue(parsed);
}

function fieldTestReportNextActionValue(parsed) {
  return privateDeliveryState.fieldTestReportNextActionValue(parsed);
}

function fieldTestReportSummary(report) {
  return privateDeliveryState.fieldTestReportSummary(report);
}

function fieldTestReportTriageState(report) {
  return privateDeliveryState.fieldTestReportTriageState(report);
}

function publicBetaDiagnosticsReport(report, options = {}) {
  return privateDeliveryState.publicBetaDiagnosticsReport(report, options);
}

function fieldTestReportsAligned(localReport, peerReport) {
  return privateDeliveryState.fieldTestReportsAligned(localReport, peerReport);
}

function fieldTestActionRequiresLocalRecovery(key) {
  return privateDeliveryState.fieldTestActionRequiresLocalRecovery(key);
}

function fieldTestPeerLocalStateNextActionKey(localReport, peerReport) {
  return privateDeliveryState.fieldTestPeerLocalStateNextActionKey(
    localReport,
    peerReport,
    fieldTestNextActionKey,
  );
}

function fieldTestBuildIdentityMatches(localReport, peerReport) {
  return privateDeliveryState.fieldTestBuildIdentityMatches(localReport, peerReport);
}

function fieldTestMessagesChecklistStatus({
  externalOnionDelivered,
  routeReadinessBlocked,
  sentRows,
  receivedRows,
}) {
  return privateDeliveryState.fieldTestMessagesChecklistStatus({
    externalOnionDelivered,
    routeReadinessBlocked,
    sentRows,
    receivedRows,
  });
}

function fieldTestReportChecklistStatus({
  externalOnionDelivered,
  routeReadinessBlocked,
  realOnionAttempted,
  realOnionRecoveryAction,
  realOnionRetryable,
}) {
  return privateDeliveryState.fieldTestReportChecklistStatus({
    externalOnionDelivered,
    routeReadinessBlocked,
    realOnionAttempted,
    realOnionRecoveryAction,
    realOnionRetryable,
  });
}

function fieldTestRouteChecklistStatus({
  routeReady,
  routeStale,
  routeReadinessAction,
}) {
  return privateDeliveryState.fieldTestRouteChecklistStatus({
    routeReady,
    routeStale,
    routeReadinessAction,
  });
}

function fieldTestReceiveChecklistStatus({
  receiveEnabled,
  receiveState,
  receiveStopRequested,
  routeReadinessAction,
  routeReadinessFailureKind,
}) {
  return privateDeliveryState.fieldTestReceiveChecklistStatus({
    receiveEnabled,
    receiveState,
    receiveStopRequested,
    routeReadinessAction,
    routeReadinessFailureKind,
  });
}

function fieldTestChecklistItems(report, peerReport = "") {
  const parsed = parseFieldTestReport(report);
  const sentRows = Number.parseInt(parsed.sent_rows ?? "0", 10) || 0;
  const receivedRows = Number.parseInt(parsed.received_rows ?? "0", 10) || 0;
  const routeReady = parsed.route_ready === "true";
  const routeStale = parsed.route_stale === "true";
  const receiveEnabled = parsed.receive_enabled === "true";
  const receiveState = fieldTestReportValue(parsed.receive_state, "stopped");
  const receiveStopRequested = parsed.receive_stop_requested === "true";
  const realOnionAttempted = parsed.real_onion_attempted === "true";
  const realOnionRecoveryAction = fieldTestReportValue(parsed.real_onion_recovery_action, "none");
  const realOnionRetryable = parsed.real_onion_retryable === "true";
  const externalOnionDelivered = fieldTestExternalOnionDelivered(parsed);
  const roomListState = fieldTestReportValue(parsed.room_list_state_key, "none");
  const routeReadinessBlocked = fieldTestRouteReadinessBlocked(parsed);
  const routeReadinessAction = fieldTestReportValue(fieldTestBlockedRouteReadinessAction(parsed), "none");
  const routeReadinessFailureKind = fieldTestReportValue(parsed.route_readiness_failure_kind, "none");
  const buildMatch = fieldTestBuildIdentityMatches(report, peerReport);
  return [
    {
      key: "build",
      status: buildMatch === null ? "pending" : buildMatch ? "done" : "check",
      label: t("fieldTestChecklistBuild"),
    },
    {
      key: "room",
      status: parsed.room_present === "true" && parsed.session_ready === "true" ? "done" : "pending",
      label: t("fieldTestChecklistRoom"),
    },
    {
      key: "safety",
      status: parsed.safety_confirmed === "true" ? "done" : "pending",
      label: t("fieldTestChecklistSafety"),
    },
    {
      key: "route",
      status: fieldTestRouteChecklistStatus({
        routeReady,
        routeStale,
        routeReadinessAction,
      }),
      label: t("fieldTestChecklistRoute"),
    },
    {
      key: "receive",
      status: fieldTestReceiveChecklistStatus({
        receiveEnabled,
        receiveState,
        receiveStopRequested,
        routeReadinessAction,
        routeReadinessFailureKind,
      }),
      label: t("fieldTestChecklistReceive"),
    },
    {
      key: "messages",
      status: fieldTestMessagesChecklistStatus({
        externalOnionDelivered,
        routeReadinessBlocked,
        sentRows,
        receivedRows,
      }),
      label: t("fieldTestChecklistMessages"),
    },
    {
      key: "resume",
      status: roomListState !== "none" ? "done" : "pending",
      label: t("fieldTestChecklistResume"),
    },
    {
      key: "report",
      status: fieldTestReportChecklistStatus({
        externalOnionDelivered,
        routeReadinessBlocked,
        realOnionAttempted,
        realOnionRecoveryAction,
        realOnionRetryable,
      }),
      label: t("fieldTestChecklistReport"),
    },
  ];
}

function fieldTestRealOnionNextActionKey(parsed) {
  if (parsed.real_onion_attempted !== "true") {
    return "";
  }
  switch (parsed.real_onion_recovery_action) {
    case "enable-private-delivery":
      return "fieldTestNextEnablePrivateDelivery";
    case "retry-bootstrap":
    case "bootstrap-cancelled":
      return "fieldTestNextRetryNetwork";
    case "prepare-network-or-bridge":
      if (parsed.real_onion_recovery_reason === "network-or-bridge-refresh-transport") {
        return "fieldTestNextRefreshBridgeTransport";
      }
      if (parsed.real_onion_recovery_reason === "network-or-bridge-refresh-config") {
        return "fieldTestNextRefreshBridge";
      }
      if (parsed.real_onion_recovery_reason === "network-or-bridge-different-network") {
        return "fieldTestNextDifferentNetwork";
      }
      return "fieldTestNextPrepareNetworkOrBridge";
    case "inspect-diagnostics":
      return "fieldTestNextInspectDiagnostics";
    case "retry-private-delivery":
      return "fieldTestNextRetryDelivery";
    default:
      return "";
  }
}

function fieldTestRecoveryActionNextKey(action) {
  switch (action) {
    case "enable-private-delivery":
      return "fieldTestNextEnablePrivateDelivery";
    case "check-session":
      return "fieldTestNextOpenRoom";
    case "verify":
    case "verify-safety":
      return "fieldTestNextVerifySafety";
    case "start-receiving":
      return "fieldTestNextStartReceive";
    case "stop-receiving":
      return "fieldTestNextStopReceive";
    case "wait-receive-stop":
      return "fieldTestNextWaitReceiveStop";
    case "retry-network":
      return "fieldTestNextRetryNetwork";
    case "prepare-private-route":
    case "refresh-and-retry":
    case "refresh-endpoint":
    case "paste-peer-code":
      return "fieldTestNextSetupRoute";
    case "retry":
      return "fieldTestNextRetryDelivery";
    default:
      return "";
  }
}

function fieldTestPeerReportStatusKey(status) {
  switch (status) {
    case "peer-report-missing":
      return "fieldTestPeerStatusMissing";
    case "build-mismatch":
      return "fieldTestPeerStatusBuildMismatch";
    case "reports-aligned-local-state-diff":
      return "fieldTestPeerStatusLocalStateDiff";
    case "reports-aligned":
      return "fieldTestPeerStatusAligned";
    case "report-mismatch":
      return "fieldTestPeerStatusReportMismatch";
    default:
      return "fieldTestPeerStatusUnknown";
  }
}

function fieldTestNextActionKey(report, peerReport = "") {
  const parsed = parseFieldTestReport(report);
  const sentRows = Number.parseInt(parsed.sent_rows ?? "0", 10) || 0;
  const receivedRows = Number.parseInt(parsed.received_rows ?? "0", 10) || 0;
  const peerReportReady = Boolean(String(peerReport ?? "").trim());
  const buildMatch = fieldTestBuildIdentityMatches(report, peerReport);
  const realOnionNextActionKey = fieldTestRealOnionNextActionKey(parsed);
  if (peerReportReady && buildMatch === false) {
    return "fieldTestNextBuildMismatch";
  }
  if (parsed.room_present !== "true" || parsed.session_ready !== "true") {
    return "fieldTestNextOpenRoom";
  }
  if (parsed.safety_confirmed !== "true") {
    return "fieldTestNextVerifySafety";
  }
  const roomListAction = fieldTestReportValue(fieldTestReportResolvedRoomListAction(parsed), "none");
  const outboundAction = fieldTestReportValue(fieldTestReportStandaloneOutboundRecoveryAction(parsed), "none");
  const routeReadinessAction = fieldTestReportValue(fieldTestRouteReadinessRecoveryAction(parsed), "none");
  let currentRecoveryAction = "none";
  if (routeReadinessAction !== "none") {
    currentRecoveryAction = routeReadinessAction;
  } else if (roomListAction !== "none") {
    currentRecoveryAction = roomListAction;
  } else if (outboundAction !== "none") {
    currentRecoveryAction = outboundAction;
  }
  const recoveryActionNextKey = fieldTestRecoveryActionNextKey(currentRecoveryAction);
  if (recoveryActionNextKey) {
    return recoveryActionNextKey;
  }
  if (parsed.route_ready !== "true" || parsed.route_stale === "true") {
    return "fieldTestNextSetupRoute";
  }
  if (parsed.receive_stop_requested === "true") {
    return "fieldTestNextWaitReceiveStop";
  }
  if (parsed.receive_enabled !== "true" || fieldTestReportValue(parsed.receive_state, "stopped") === "stopped") {
    return "fieldTestNextStartReceive";
  }
  if (realOnionNextActionKey) {
    return realOnionNextActionKey;
  }
  if (
    parsed.manual_network_permission === "true" &&
    parsed.real_onion_bridge_capable_build === "true" &&
    parsed.real_onion_bridge_configured_for_bootstrap !== "true"
  ) {
    return "fieldTestNextPrepareNetworkOrBridge";
  }
  if (sentRows === 0 || receivedRows === 0) {
    return "fieldTestNextExchangeMessages";
  }
  if (fieldTestReportValue(parsed.room_list_state_key, "none") === "none") {
    return "fieldTestNextRestartResume";
  }
  if (!peerReportReady) {
    return "fieldTestNextPastePeerReport";
  }
  if (!fieldTestReportsAligned(report, peerReport)) {
    return "fieldTestNextCompareMismatch";
  }
  if (fieldTestPeerLocalStateNextActionKey(report, peerReport)) {
    return "fieldTestNextPeerLocalRecovery";
  }
  return "fieldTestNextComplete";
}

function renderFieldTestNextAction(report, peerReport = fields.peerFieldTestReport?.value ?? "") {
  if (!fields.fieldTestNextAction) {
    return "";
  }
  const key = fieldTestNextActionKey(report, peerReport);
  const text = t(key);
  fields.fieldTestNextAction.textContent = text;
  fields.fieldTestNextAction.hidden = !text;
  return text;
}

function renderFieldTestChecklist(report, peerReport = fields.peerFieldTestReport?.value ?? "") {
  if (!fields.fieldTestChecklist) {
    return [];
  }
  const items = fieldTestChecklistItems(report, peerReport);
  const statusLabels = {
    done: t("fieldTestStatusDone"),
    pending: t("fieldTestStatusPending"),
    check: t("fieldTestStatusCheck"),
  };
  fields.fieldTestChecklist.innerHTML = "";
  for (const item of items) {
    const node = document.createElement("li");
    node.className = `field-test-checklist-item is-${item.status}`;
    node.dataset.fieldTestStep = item.key;
    node.textContent = `${statusLabels[item.status] ?? item.status} ${item.label}`;
    fields.fieldTestChecklist.append(node);
  }
  return items;
}

function renderFieldTestReportSummary(report) {
  if (!fields.fieldTestReportSummary) {
    return "";
  }
  const summary = fieldTestReportSummary(report);
  fields.fieldTestReportSummary.textContent = summary;
  renderFieldTestChecklist(report);
  renderFieldTestNextAction(report);
  return summary;
}

function renderFieldTestReportComparison() {
  if (!fields.fieldTestReportCompare) {
    return "";
  }
  const localReport = fields.fieldTestReport?.value ?? "";
  const peerReport = fields.peerFieldTestReport?.value ?? "";
  const panelState = privateDeliveryState.fieldTestReportPanelState(
    localReport,
    peerReport,
    fieldTestNextActionKey,
  );
  const statusText = t(fieldTestPeerReportStatusKey(panelState.comparisonStatus));
  fields.fieldTestReportCompare.dataset.peerReportStatus = panelState.comparisonStatus;
  fields.fieldTestReportCompare.textContent = panelState.comparison
    ? `${statusText}\n${panelState.comparison}`
    : statusText;
  fields.fieldTestReportCompare.hidden = !statusText;
  renderFieldTestChecklist(localReport, peerReport);
  renderFieldTestNextAction(localReport, peerReport);
  return panelState.comparison;
}

function fieldTestReportCopyPayload(report) {
  const peerReport = fields.peerFieldTestReport?.value ?? "";
  const panelState = privateDeliveryState.fieldTestReportPanelState(report, peerReport, fieldTestNextActionKey);
  const actionLines = panelState.copyActionLines.join("\n");
  return panelState.comparison
    ? `${report}\n${panelState.comparison}\n${actionLines}`
    : `${report}\n${actionLines}`;
}

function selectFieldTestReportCopyPayload(payload) {
  if (!fields.fieldTestReport) {
    return false;
  }
  fields.fieldTestReport.value = payload;
  fields.fieldTestReport.focus?.();
  fields.fieldTestReport.select?.();
  return true;
}

function realOnionResultConfirmsExternalPeerDelivery(result) {
  return privateDeliveryState.realOnionResultConfirmsExternalPeerDelivery(result);
}

function rememberRealOnionFieldTestResult(roomInput, result) {
  const fingerprint = twoProfileSessionStatusFingerprint(twoProfileRoomIdentityInput(roomInput));
  if (!fingerprint) {
    return false;
  }
  latestProductionTwoProfileRealOnionResultsByRoom.set(fingerprint, {
    roomFingerprint: fingerprint,
    result,
  });
  const recovery = productionTwoProfileRealOnionRecoveryPlan(result);
  for (const key of latestProductionTwoProfileRealOnionResultsByRoom.keys()) {
    if (latestProductionTwoProfileRealOnionResultsByRoom.size <= savedInviteRoomStorageLimit) {
      break;
    }
    latestProductionTwoProfileRealOnionResultsByRoom.delete(key);
    latestProductionTwoProfileRealOnionWaitCanceledFingerprints.delete(key);
  }
  if (realOnionResultConfirmsExternalPeerDelivery(result)) {
    latestProductionTwoProfileRealOnionRecoveriesByRoom.delete(fingerprint);
    persistRealOnionRecoveries();
    void refreshSavedInviteRoomMetadataForFingerprint(fingerprint, {
      preserveUpdatedAt: true,
      refreshSessionStatus: true,
    });
  } else if (recovery?.action && recovery.action !== "none") {
    latestProductionTwoProfileRealOnionRecoveriesByRoom.set(fingerprint, {
      ...recovery,
      updatedAt: Date.now(),
    });
    persistRealOnionRecoveries();
  } else {
    latestProductionTwoProfileRealOnionRecoveriesByRoom.delete(fingerprint);
    persistRealOnionRecoveries();
  }
  return true;
}

function latestRealOnionFieldTestResult(input = productionTwoProfileInput()) {
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  return fingerprint
    ? latestProductionTwoProfileRealOnionResultsByRoom.get(fingerprint)?.result ?? null
    : null;
}

function latestRealOnionRecoveryForInput(input = productionTwoProfileInput()) {
  const result = latestRealOnionFieldTestResult(input);
  if (result) {
    return productionTwoProfileRealOnionRecoveryPlan(result);
  }
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  if (!fingerprint) {
    return productionTwoProfileRealOnionRecoveryPlan(null);
  }
  const recovery = latestProductionTwoProfileRealOnionRecoveriesByRoom.get(fingerprint) ?? null;
  if (!recovery) {
    return productionTwoProfileRealOnionRecoveryPlan(null);
  }
  const normalized = normalizeStoredRealOnionRecovery(recovery);
  if (!normalized) {
    latestProductionTwoProfileRealOnionRecoveriesByRoom.delete(fingerprint);
    persistRealOnionRecoveries();
    return productionTwoProfileRealOnionRecoveryPlan(null);
  }
  return normalized;
}

function realOnionWaitCanceledForInput(input = productionTwoProfileInput()) {
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  return Boolean(fingerprint && latestProductionTwoProfileRealOnionWaitCanceledFingerprints.has(fingerprint));
}

function realOnionActiveInputMatches(input = productionTwoProfileInput()) {
  return Boolean(
    activeProductionTwoProfileRealOnionInput &&
      activeProductionTwoProfileRealOnionInput.profileA === input.profileA &&
      activeProductionTwoProfileRealOnionInput.profileB === input.profileB &&
      activeProductionTwoProfileRealOnionInput.passphrase === input.passphrase,
  );
}

function realOnionRoundtripActiveForInput(input = productionTwoProfileInput()) {
  return productionBusyAction === "two-profile-real-onion-roundtrip" && realOnionActiveInputMatches(input);
}

function realOnionActiveRunMatches(runId) {
  return Boolean(activeProductionTwoProfileRealOnionInput?.runId === runId);
}

function currentRealOnionSyntheticFailureBridgeStatus() {
  const status = latestProductionOnionBridgeConfigStatus ?? null;
  return {
    bridge_capable_build: status?.bridge_capable_build === true,
    bridge_configured_for_bootstrap: status?.bridge_configured_for_bootstrap === true,
    bridge_config_state: String(status?.bridge_config_state ?? "unknown"),
    bridge_config_next_action: String(status?.bridge_config_next_action ?? "unknown"),
  };
}

function syntheticRealOnionFailureNumber(text, patterns = []) {
  for (const pattern of patterns) {
    const match = String(text ?? "").match(pattern);
    const value = Number.parseInt(match?.[1] ?? "", 10);
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function syntheticRealOnionFailureBootstrapStats(detail, input = {}) {
  const retryLimit =
    syntheticRealOnionFailureNumber(detail, [
      /\bretry_limit=(\d+)/i,
      /\bbootstrap_retry_limit=(\d+)/i,
    ]) ||
    Math.max(0, Number.parseInt(input?.bootstrapRetryLimit ?? input?.bootstrap_retry_limit ?? 0, 10) || 0);
  return {
    bootstrap_retry_limit: retryLimit,
    profile_a_bootstrap_attempts: syntheticRealOnionFailureNumber(detail, [
      /\battempts_a=(\d+)/i,
      /\bprofile_a_bootstrap_attempts=(\d+)/i,
    ]),
    profile_b_bootstrap_attempts: syntheticRealOnionFailureNumber(detail, [
      /\battempts_b=(\d+)/i,
      /\bprofile_b_bootstrap_attempts=(\d+)/i,
    ]),
  };
}

function productionTwoProfileRealOnionSyntheticFailureResult(error, input, manualNetworkPermission) {
  const detail = String(error ?? "").toLowerCase();
  let nextBlocker = "RealOnionRoundtripCommandError";
  let blocker = "CommandError";
  if (detail.includes("permission")) {
    nextBlocker = "ManualNetworkPermissionMissing";
    blocker = "ManualNetworkPermissionMissing";
  } else if (detail.includes("cancel")) {
    nextBlocker = "BootstrapCancelled";
    blocker = "BootstrapCancelled";
  } else if (detail.includes("networkaccessfailed")) {
    nextBlocker = "BootstrapNetworkAccessFailed";
    blocker = "BootstrapNetworkAccessFailed";
  } else if (detail.includes("localstatefailed")) {
    nextBlocker = "BootstrapLocalStateFailed";
    blocker = "BootstrapLocalStateFailed";
  } else if (detail.includes("configurationfailed")) {
    nextBlocker = "BootstrapConfigurationFailed";
    blocker = "BootstrapConfigurationFailed";
  } else if (detail.includes("unsupported")) {
    nextBlocker = "BootstrapUnsupported";
    blocker = "BootstrapUnsupported";
  } else if (detail.includes("protocolfailed")) {
    nextBlocker = "BootstrapProtocolFailed";
    blocker = "BootstrapProtocolFailed";
  } else if (detail.includes("transientfailure")) {
    nextBlocker = "BootstrapTransientFailure";
    blocker = "BootstrapTransientFailure";
  } else if (detail.includes("censorshiporbridgerequired")) {
    nextBlocker = "CensorshipOrBridgeRequired";
    blocker = "CensorshipOrBridgeRequired";
  } else if (detail.includes("bootstrap")) {
    nextBlocker = "BootstrapTimeout";
    blocker = "BootstrapTimeout";
  } else if (detail.includes("launch") || detail.includes("endpoint")) {
    nextBlocker = "OnionServiceLaunchFailed";
    blocker = "OnionServiceLaunchFailed";
  } else if (detail.includes("send")) {
    nextBlocker = "SendAttemptFailed";
    blocker = "SendAttemptFailed";
  } else if (detail.includes("receive")) {
    nextBlocker = "ReceiveAttemptFailed";
    blocker = "ReceiveAttemptFailed";
  }
  const bridgeStatus = currentRealOnionSyntheticFailureBridgeStatus();
  const bootstrapStats = syntheticRealOnionFailureBootstrapStats(detail, input);
  return {
    manual_client_attempt_feature_compiled: true,
    manual_network_permission_enabled: manualNetworkPermission === true,
    sender_profile: String(input?.profileA ?? ""),
    receiver_profile: String(input?.profileB ?? ""),
    next_blocker: nextBlocker,
    blockers: [blocker],
    ...bridgeStatus,
    ...bootstrapStats,
    local_endpoint_returned: false,
    peer_endpoint_returned: false,
    envelope_payload_returned: false,
    plaintext_returned_to_frontend: false,
    store_path_returned: false,
    passphrase_retained: false,
    key_material_exposed: false,
    network_io_attempted: manualNetworkPermission === true && blocker !== "ManualNetworkPermissionMissing",
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };
}

function renderProductionOnionBridgeConfigStatus(result) {
  latestProductionOnionBridgeConfigStatus = result ?? null;
  const stateKey =
    result?.bridge_capable_build !== true
      ? "bridgeConfigUnsupported"
      : result?.bridge_config_state === "invalid"
        ? "bridgeConfigInvalidStatus"
        : result?.bridge_config_state === "transport-invalid"
        ? "bridgeTransportInvalidStatus"
        : result?.bridge_config_state === "transport-missing"
        ? "bridgeTransportMissing"
        : result?.bridge_configured_for_bootstrap === true
        ? "bridgeConfigReady"
        : "bridgeConfigMissing";
  setText(fields.onionPreflightState, t(stateKey));
  setText(fields.onionPreflightWarning, result?.warning ?? t(stateKey));
  setText(
    fields.onionPreflightBoundary,
    `bridge_capable=${result?.bridge_capable_build === true} ` +
      `bridge_state=${fieldTestReportValue(result?.bridge_config_state, "unknown")} ` +
      `bridge_next=${fieldTestReportValue(result?.bridge_config_next_action, "unknown")} ` +
      `bridge_configured=${result?.bridge_configured_for_bootstrap === true} ` +
      `raw_path=${result?.config_path_returned === true} ` +
      `raw_bridge_lines=${result?.raw_bridge_lines_returned === true} ` +
      `network_io=${result?.network_io_attempted === true} ` +
      `transport_io=${result?.transport_io_opened === true} ` +
      `runtime=${result?.runtime_messaging_enabled === true}`,
  );
  refreshFieldTestReport();
}

function rememberProductionOnionBridgeConfigStatusFallback(status = {}) {
  latestProductionOnionBridgeConfigStatus = {
    bridge_capable_build: status.bridgeCapableBuild === true,
    bridge_configured_for_bootstrap: false,
    bridge_config_state: String(status.state ?? "unknown"),
    bridge_config_next_action: String(status.nextAction ?? "unknown"),
    config_path_returned: false,
    raw_bridge_lines_returned: false,
    network_io_attempted: false,
    transport_io_opened: false,
    runtime_messaging_enabled: false,
  };
  setText(
    fields.onionPreflightBoundary,
    `${status.boundaryPrefix ?? "bridge_config_status_unavailable"}=true ` +
      `bridge_capable=${latestProductionOnionBridgeConfigStatus.bridge_capable_build === true} ` +
      `bridge_state=${fieldTestReportValue(latestProductionOnionBridgeConfigStatus.bridge_config_state, "unknown")} ` +
      `bridge_next=${fieldTestReportValue(latestProductionOnionBridgeConfigStatus.bridge_config_next_action, "unknown")} ` +
      "bridge_configured=false raw_path=false raw_bridge_lines=false network_io=false transport_io=false runtime=false",
  );
  refreshFieldTestReport();
}

function clearRealOnionRecoveryAfterExplicitBridgeChange() {
  let changed = false;
  for (const [roomKey, record] of latestProductionTwoProfileRealOnionResultsByRoom.entries()) {
    const recovery = productionTwoProfileRealOnionRecoveryPlan(record?.result);
    if (recovery?.action && recovery.action !== "none") {
      latestProductionTwoProfileRealOnionResultsByRoom.delete(roomKey);
      latestProductionTwoProfileRealOnionWaitCanceledFingerprints.delete(roomKey);
      changed = true;
    }
  }
  if (latestProductionTwoProfileRealOnionRecoveriesByRoom.size > 0) {
    latestProductionTwoProfileRealOnionRecoveriesByRoom.clear();
    changed = true;
  }
  if (latestProductionTwoProfileRealOnionWaitCanceledFingerprints.size > 0) {
    latestProductionTwoProfileRealOnionWaitCanceledFingerprints.clear();
    changed = true;
  }
  if (!changed) {
    return false;
  }
  persistRealOnionRecoveries();
  renderSavedInviteRooms();
  refreshFieldTestReport();
  return changed;
}

function clearPrivateRouteFollowupAfterExplicitBridgeChange(input = productionTwoProfileInput()) {
  return clearPrivateRouteFollowupForRoom(input);
}

function updateProductionOnionBridgeConfigControls() {
  const busy = productionBusyAction !== null;
  const bridgeConfigInputPresent = Boolean((fields.onionBridgeConfigLines?.value ?? "").trim());
  const obfs4TransportInputPresent = Boolean((fields.onionObfs4TransportBinaryPath?.value ?? "").trim());
  if (fields.saveOnionBridgeConfig) {
    fields.saveOnionBridgeConfig.disabled = busy || !bridgeConfigInputPresent;
    fields.saveOnionBridgeConfig.title = busy
      ? "Wait for the active production action."
      : bridgeConfigInputPresent
        ? t("saveBridgeConfig")
        : t("bridgeConfigPlaceholder");
  }
  if (fields.saveOnionObfs4TransportBinary) {
    fields.saveOnionObfs4TransportBinary.disabled = busy || !obfs4TransportInputPresent;
    fields.saveOnionObfs4TransportBinary.title = busy
      ? "Wait for the active production action."
      : obfs4TransportInputPresent
        ? t("saveBridgeTransport")
        : t("bridgeTransportBinaryPlaceholder");
  }
  if (fields.checkOnionBridgeConfig) {
    fields.checkOnionBridgeConfig.disabled = busy;
    fields.checkOnionBridgeConfig.title = busy
      ? "Wait for the active production action."
      : t("checkBridgeConfig");
  }
  if (fields.clearOnionBridgeConfig) {
    fields.clearOnionBridgeConfig.disabled = busy;
    fields.clearOnionBridgeConfig.title = busy
      ? "Wait for the active production action."
      : t("clearBridgeConfig");
  }
}

async function checkProductionOnionBridgeConfigStatus() {
  if (!hasTauriRuntimeBridge()) {
    setText(fields.onionPreflightWarning, t("tauriUnavailable"));
    return;
  }
  try {
    const result = await invoke("production_onion_bridge_config_status");
    renderProductionOnionBridgeConfigStatus(result);
  } catch (error) {
    rememberProductionOnionBridgeConfigStatusFallback({
      boundaryPrefix: "bridge_config_status_failed",
    });
    setText(fields.onionPreflightWarning, t("bridgeConfigInvalid"));
  }
}

async function loadProductionOnionBridgeConfigStatus() {
  if (!hasTauriRuntimeBridge() || !fields.checkOnionBridgeConfig) {
    return;
  }
  try {
    const result = await invoke("production_onion_bridge_config_status");
    renderProductionOnionBridgeConfigStatus(result);
  } catch {
    rememberProductionOnionBridgeConfigStatusFallback();
  }
}

async function saveProductionOnionBridgeConfig() {
  const bridgeLines = (fields.onionBridgeConfigLines?.value ?? "").trim();
  const input = productionTwoProfileInput();
  if (!bridgeLines) {
    setText(fields.onionPreflightWarning, t("bridgeConfigInvalid"));
    return;
  }
  productionBusyAction = "onion-bridge-config";
  updateProductionOnionBridgeConfigControls();
  applyProductionActionState();
  try {
    const result = await invoke("production_onion_bridge_config_save", { bridgeLines });
    renderProductionOnionBridgeConfigStatus(result);
    clearRealOnionRecoveryAfterExplicitBridgeChange(input);
    clearPrivateRouteFollowupAfterExplicitBridgeChange(input);
    setText(fields.onionPreflightWarning, t("bridgeConfigSaved"));
    if (fields.onionBridgeConfigLines) {
      fields.onionBridgeConfigLines.value = "";
    }
    updateProductionOnionBridgeConfigControls();
  } catch (error) {
    rememberProductionOnionBridgeConfigStatusFallback({
      boundaryPrefix: "bridge_config_save_failed",
      bridgeCapableBuild: true,
      state: "invalid",
      nextAction: "replace-bridge-config",
    });
    setText(fields.onionPreflightWarning, t("bridgeConfigInvalid"));
  } finally {
    clearProductionBusyAction("onion-bridge-config");
    updateProductionOnionBridgeConfigControls();
    applyProductionActionState();
  }
}

async function saveProductionOnionObfs4TransportBinary() {
  const binaryPath = (fields.onionObfs4TransportBinaryPath?.value ?? "").trim();
  const input = productionTwoProfileInput();
  if (!binaryPath) {
    setText(fields.onionPreflightWarning, t("bridgeTransportInvalidStatus"));
    return;
  }
  productionBusyAction = "onion-bridge-config";
  updateProductionOnionBridgeConfigControls();
  applyProductionActionState();
  try {
    const result = await invoke("production_onion_pt_binary_save", { binaryPath });
    renderProductionOnionBridgeConfigStatus(result);
    clearRealOnionRecoveryAfterExplicitBridgeChange(input);
    clearPrivateRouteFollowupAfterExplicitBridgeChange(input);
    setText(fields.onionPreflightWarning, t("bridgeTransportSaved"));
    if (fields.onionObfs4TransportBinaryPath) {
      fields.onionObfs4TransportBinaryPath.value = "";
    }
    updateProductionOnionBridgeConfigControls();
  } catch {
    rememberProductionOnionBridgeConfigStatusFallback({
      boundaryPrefix: "pt_binary_save_failed",
      bridgeCapableBuild: true,
      state: "transport-invalid",
      nextAction: "replace-obfs4-transport",
    });
    setText(fields.onionPreflightWarning, t("bridgeTransportInvalidStatus"));
  } finally {
    clearProductionBusyAction("onion-bridge-config");
    updateProductionOnionBridgeConfigControls();
    applyProductionActionState();
  }
}

async function clearProductionOnionBridgeConfig() {
  if (!hasTauriRuntimeBridge()) {
    setText(fields.onionPreflightWarning, t("tauriUnavailable"));
    return;
  }
  const input = productionTwoProfileInput();
  productionBusyAction = "onion-bridge-config";
  updateProductionOnionBridgeConfigControls();
  applyProductionActionState();
  try {
    const result = await invoke("production_onion_bridge_config_clear");
    renderProductionOnionBridgeConfigStatus(result);
    clearRealOnionRecoveryAfterExplicitBridgeChange(input);
    clearPrivateRouteFollowupAfterExplicitBridgeChange(input);
    setText(fields.onionPreflightWarning, t("bridgeConfigCleared"));
  } catch (error) {
    rememberProductionOnionBridgeConfigStatusFallback({
      boundaryPrefix: "bridge_config_clear_failed",
    });
    setText(fields.onionPreflightWarning, t("bridgeConfigClearFailed"));
  } finally {
    clearProductionBusyAction("onion-bridge-config");
    updateProductionOnionBridgeConfigControls();
    applyProductionActionState();
  }
}

function fieldTestReceiveModeSnapshot(input = productionTwoProfileInput()) {
  const ownerCurrentRoom = productionTwoProfileReceiveMatchesInput(input);
  if (!ownerCurrentRoom) {
    return {
      ownerCurrentRoom: false,
      enabled: false,
      stopRequested: false,
      runtimeState: "stopped",
      attempt: 0,
      inFlight: false,
      lastProcessedMessageImportCount: 0,
      lastProcessedEndpointUpdateCount: 0,
    };
  }
  const stopRequested = productionTwoProfileOnionReceiveMode.stopRequested === true;
  return {
    ownerCurrentRoom: true,
    enabled: productionTwoProfileOnionReceiveMode.enabled === true && !stopRequested,
    stopRequested,
    runtimeState: stopRequested
      ? "stopping"
      : fieldTestReportValue(productionTwoProfileOnionReceiveMode.runtimeState, "stopped"),
    attempt: productionTwoProfileOnionReceiveMode.attempt,
    inFlight: productionTwoProfileOnionReceiveMode.inFlight,
    lastProcessedMessageImportCount: productionTwoProfileOnionReceiveMode.lastProcessedMessageImportCount,
    lastProcessedEndpointUpdateCount: productionTwoProfileOnionReceiveMode.lastProcessedEndpointUpdateCount,
  };
}

function fieldTestRetryableOutboundEntry(input, currentSavedRoom) {
  if (savedInviteRoomActionCanUseRetryableOutbound(currentSavedRoom?.action, currentSavedRoom?.actionOrigin)) {
    return savedInviteRoomResolvedRetryableOutbound(
      currentSavedRoom.room,
      input,
      currentSavedRoom.action,
      currentSavedRoom.actionOrigin,
    );
  }
  if (currentSavedRoom?.room) {
    return null;
  }
  return automaticVisibleTwoProfileRetryableOutboundEntry(input);
}

function fieldTestRoomListNextAction(currentSavedRoom, outboundRecoveryAction, retryableOutbound) {
  if (savedInviteRoomActionCanUseRetryableOutbound(currentSavedRoom?.action, currentSavedRoom?.actionOrigin)) {
    return retryableOutbound ? outboundRecoveryAction : "none";
  }
  if (currentSavedRoom?.action) {
    return currentSavedRoom?.action ?? "none";
  }
  return outboundRecoveryAction !== "none"
    ? outboundRecoveryAction
    : "none";
}

function buildFieldTestReport(input = productionTwoProfileInput()) {
  const hasRoom = Boolean(input.profileA && input.profileB && input.profileA !== input.profileB && input.passphrase);
  const route = twoProfilePeerEndpointState(input);
  const entries = [...productionTwoProfileConversationEntries.values()];
  const sentRows = entries.filter((entry) => entry.statuses?.has("sent")).length;
  const receivedRows = entries.filter((entry) => entry.statuses?.has("received")).length;
  const failedRows = entries.filter((entry) => entry.outboundDeliveryState === "failed").length;
  const canceledRows = entries.filter((entry) => entry.outboundDeliveryState === "canceled").length;
  const currentSavedRoom = currentSavedInviteRoomView(input);
  const currentSavedRoomView = currentSavedRoom.view;
  const retryableOutbound = fieldTestRetryableOutboundEntry(input, currentSavedRoom);
  const outboundFailureClass = retryableOutbound
    ? productionTwoProfileOutboundStatusLabel(retryableOutbound)
    : "none";
  const currentOutboundRecovery = retryableOutbound
    ? currentTwoProfileOutboundPrimaryAction(retryableOutbound, input)
    : null;
  const outboundRecoveryAction = currentOutboundRecovery?.action ?? "none";
  const receiveMode = fieldTestReceiveModeSnapshot(input);
  const boundaryText = fields.productionTwoProfileBoundary?.textContent ?? "";
  const sendAttemptBoundaryText = fields.onionOutboundEnvelopeSendAttempt?.textContent ?? "";
  const receiveFailureKind = receiveMode.ownerCurrentRoom
    ? fieldTestBoundaryValue(boundaryText, "failure")
    : "none";
  const realOnionResult = latestRealOnionFieldTestResult(input);
  const bridgeStatus = latestProductionOnionBridgeConfigStatus;
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
    realOnionResultConfirmsExternalPeerDelivery(realOnionResult);
  const realOnionWaitCancelled = realOnionWaitCanceledForInput(input);
  const deliveryNoticeCurrentRoom = latestChatDeliveryNoticeKey
    ? chatDeliveryNoticeMatchesInput(input)
    : false;
  const deliveryNoticeKey = deliveryNoticeCurrentRoom ? latestChatDeliveryNoticeKey : "none";
  const deliveryNoticeTone = deliveryNoticeCurrentRoom ? latestChatDeliveryNoticeTone : "neutral";
  const routeReadiness = externalPeerSendReadiness(input, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  const routeReadinessBlocked = routeReadiness.ready !== true;
  const routeReadinessNextAction = routeReadinessBlocked ? routeReadiness.nextAction : "none";
  const routeReadinessFailureKind = routeReadinessBlocked ? routeReadiness.failureKind : "none";
  const routeReadinessNoticeKey = routeReadinessBlocked ? routeReadiness.noticeKey : "none";
  const composerNextAction = !retryableOutbound && routeReadiness.ready === true
    ? input.message
      ? "send-message"
      : "write-message"
    : "none";
  const roomListNextAction = fieldTestRoomListNextAction(
    currentSavedRoom,
    outboundRecoveryAction,
    retryableOutbound,
  );

  return [
    "Another Dimension Chat beta field test report",
    "report_version=1",
    `app_version=${FIELD_TEST_APP_VERSION}`,
    `build_channel=${FIELD_TEST_BUILD_CHANNEL}`,
    `build_commit=${FIELD_TEST_BUILD_COMMIT}`,
    `language=${fieldTestReportValue(currentLanguage)}`,
    `room_present=${hasRoom}`,
    `session_ready=${twoProfileSessionsReadyForInput(input)}`,
    `safety_confirmed=${twoProfileSafetyConfirmedForInput(input)}`,
    `manual_network_permission=${manualNetworkPermissionEnabled()}`,
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
    `real_onion_network_io=${realOnionResult?.network_io_attempted === true}`,
    `real_onion_transport_io=${realOnionResult?.transport_io_opened === true}`,
    `real_onion_runtime=${realOnionResult?.runtime_messaging_enabled === true}`,
    `delivery_notice_current_room=${deliveryNoticeCurrentRoom}`,
    `delivery_notice_key=${fieldTestReportValue(deliveryNoticeKey, "none")}`,
    `delivery_notice_tone=${fieldTestReportValue(deliveryNoticeTone, "neutral")}`,
    `ui_state=${fieldTestReportValue(fields.productionTwoProfileState?.textContent)}`,
    `redacted_boundary=${fieldTestBoundarySummary(boundaryText)}`,
  ].join("\n");
}

function refreshFieldTestReport() {
  if (!fields.fieldTestReport) {
    renderFieldTestReportSummary("");
    return "";
  }
  const report = buildFieldTestReport();
  fields.fieldTestReport.value = report;
  renderFieldTestReportSummary(report);
  renderFieldTestReportComparison();
  refreshPublicBetaDiagnostics(report);
  return report;
}

function refreshPublicBetaDiagnostics(report = fields.fieldTestReport?.value || buildFieldTestReport()) {
  if (!fields.publicBetaDiagnostics) {
    return "";
  }
  const payload = publicBetaDiagnosticsReport(report, { includeCopyBoundary: true });
  fields.publicBetaDiagnostics.value = payload;
  const parsed = parseFieldTestReport(report);
  const failureClass = fieldTestReportValue(fieldTestReportBlocker(parsed), "none");
  if (fields.publicBetaDiagnosticsSummary) {
    fields.publicBetaDiagnosticsSummary.textContent = `public diagnostics ready failure_class=${failureClass} app_launch_network=false`;
  }
  return payload;
}

function selectPublicBetaDiagnosticsPayload(payload) {
  if (!fields.publicBetaDiagnostics) {
    return;
  }
  fields.publicBetaDiagnostics.value = payload;
  fields.publicBetaDiagnostics.focus?.();
  fields.publicBetaDiagnostics.select?.();
}

async function copyPublicBetaDiagnostics() {
  const payload = refreshPublicBetaDiagnostics();
  if (!payload) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(payload);
    setProductionTwoProfileState("Public diagnostics copied");
    setText(fields.productionTwoProfileWarning, t("publicBetaDiagnosticsCopied"));
    return true;
  } catch {
    selectPublicBetaDiagnosticsPayload(payload);
    setProductionTwoProfileState("Public diagnostics selected");
    setText(fields.productionTwoProfileWarning, t("publicBetaDiagnosticsCopyFallback"));
    return false;
  }
}

async function copyFieldTestReport() {
  const report = refreshFieldTestReport();
  if (!report) {
    return false;
  }
  const payload = fieldTestReportCopyPayload(report);
  try {
    await navigator.clipboard.writeText(payload);
    setProductionTwoProfileState("Field test report copied");
    setText(fields.productionTwoProfileWarning, t("fieldTestReportCopied"));
    return true;
  } catch {
    selectFieldTestReportCopyPayload(payload);
    setProductionTwoProfileState("Field test report selected");
    setText(fields.productionTwoProfileWarning, t("fieldTestReportCopyFallback"));
    return false;
  }
}

function waitForTimeout(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForMessageRetentionPolicyReady(timeoutMs = 3000) {
  if (messageRetentionPolicyReady()) {
    return true;
  }
  if (productionMessageRetentionPolicyLoadPromise) {
    await Promise.race([productionMessageRetentionPolicyLoadPromise, waitForTimeout(timeoutMs)]);
    return messageRetentionPolicyReady();
  }
  const startedAt = window.performance?.now?.() ?? Date.now();
  while (productionMessageRetentionPolicy.status === "loading") {
    await waitForTimeout(50);
    const now = window.performance?.now?.() ?? Date.now();
    if (now - startedAt >= timeoutMs) {
      break;
    }
  }
  return messageRetentionPolicyReady();
}

async function createInviteCode() {
  let code = "";
  try {
    code = generateInviteCode();
  } catch (error) {
    setProductionTwoProfileState("Invite code unavailable");
    setText(fields.productionTwoProfileWarning, error?.message || t("inviteCodeUnavailable"));
    return false;
  }
  if (fields.receivedInviteCode) {
    fields.receivedInviteCode.value = "";
  }
  currentInviteCodeShareVisible = true;
  return startInviteRoomFromCode({ code, role: "inviter" });
}

async function createRoomFromReceivedInviteCode() {
  const code = String(fields.receivedInviteCode?.value || fields.productionTwoProfileB?.value || "").trim();
  return startInviteRoomFromCode({ code, role: "joiner" });
}

async function createRoomFromRoomListInviteCode() {
  const code = String(fields.roomListInviteCode?.value ?? "").trim();
  return startInviteRoomFromCode({ code, role: "joiner" });
}

function clearCurrentInviteRoomInput() {
  stopInviteRoomPresenceRefresh();
  stopInviteRoomTranscriptRefresh();
  clearManualMessagePayloadsForRoomContextChange();
  resetProductionTwoProfileTranscript();
  latestDerivedConnectionCode = "";
  latestCreatedInviteCode = "";
  copiedInviteCode = "";
  latestConnectionCodeRole = "";
  currentInviteCodeShareVisible = false;
  if (fields.productionTwoProfileA) {
    fields.productionTwoProfileA.value = "";
  }
  if (fields.productionTwoProfileB) {
    fields.productionTwoProfileB.value = "";
    delete fields.productionTwoProfileB.dataset.connectionCode;
    delete fields.productionTwoProfileB.dataset.peerProfile;
    delete fields.productionTwoProfileB.dataset.inviteCodeRole;
  }
  if (fields.productionTwoProfilePassphrase) {
    fields.productionTwoProfilePassphrase.value = "";
  }
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
  }
  if (fields.receivedInviteCode) {
    fields.receivedInviteCode.value = "";
  }
  restorePrivateRouteExchangeForRoom(productionTwoProfileInput());
  renderCurrentInviteCodeDisplay();
  renderProductionTwoProfileDirection(productionTwoProfileInput());
  updateMinimalChatMode(productionTwoProfileInput(), false);
  applyProductionActionState();
}

async function createNewInviteRoomFromList() {
  clearCurrentInviteRoomInput();
  showRoomDetail();
  return createInviteCode();
}

async function openSavedInviteRoom(room) {
  const code = String(room?.code ?? "").trim();
  const role = room?.role === "inviter" ? "inviter" : room?.role === "joiner" ? "joiner" : "";
  if (!code || !role) {
    return false;
  }
  showRoomDetail();
  clearCurrentInviteRoomInput();
  currentInviteCodeShareVisible = false;
  rememberConnectionCodeRole(code, role);
  if (role === "inviter") {
    latestCreatedInviteCode = code;
  }
  if (fields.productionTwoProfileB) {
    fields.productionTwoProfileB.value = code;
    fields.productionTwoProfileB.dataset.inviteCodeRole = role;
  }
  syncTwoProfileDerivedConnectionFields();
  renderCurrentInviteCodeDisplay();
  applyProductionActionState();
  const openInput = productionTwoProfileInput();
  if (!(await waitForMessageRetentionPolicyReady())) {
    return false;
  }
  if (!twoProfileTranscriptInputStillCurrent(openInput)) {
    return false;
  }
  return openInviteRoomFromToken(openInput);
}

async function startInviteRoomFromCode({ code, role, copyBeforePrepare = false }) {
  const trimmedCode = String(code ?? "").trim();
  if (!trimmedCode) {
    setProductionTwoProfileState("Invite code missing");
    setText(fields.productionTwoProfileWarning, t("inviteCodeMissing"));
    return false;
  }
  showRoomDetail();
  if (fields.productionTwoProfileB) {
    fields.productionTwoProfileB.value = trimmedCode;
    fields.productionTwoProfileB.dataset.inviteCodeRole = role === "inviter" ? "inviter" : "joiner";
  }
  if (role === "inviter") {
    latestCreatedInviteCode = trimmedCode;
  }
  copiedInviteCode = "";
  rememberConnectionCodeRole(trimmedCode, role);
  syncTwoProfileDerivedConnectionFields();
  renderProductionTwoProfileDirection(productionTwoProfileInput());
  setProductionTwoProfileState(role === "inviter" ? "Invite code created" : "Received invite code ready");
  setText(
    fields.productionTwoProfileWarning,
    role === "inviter" ? t("inviteCodeCreatedHint") : t("receivedCodeReadyHint"),
  );
  setChatDeliveryNoticeByKey(role === "inviter" ? "inviteCodeReadyNotice" : "receivedInviteCodeReadyNotice", "success");
  closeChatSettingsPanel();
  renderCurrentInviteCodeDisplay();
  applyProductionActionState();

  if (copyBeforePrepare) {
    await copyCurrentInviteCode({ quiet: true });
  }
  const openInput = productionTwoProfileInput();
  if (!(await waitForMessageRetentionPolicyReady())) {
    if (!twoProfileTranscriptInputStillCurrent(openInput)) {
      return false;
    }
    setProductionTwoProfileState("Invite setup blocked");
    setText(fields.productionTwoProfileWarning, messageRetentionPolicyBlocker());
    applyProductionActionState();
    return false;
  }
  if (!twoProfileTranscriptInputStillCurrent(openInput)) {
    return false;
  }
  return openInviteRoomFromToken(openInput);
}

async function finishInviteRoomReadyFromStatus(input, status, warningText) {
  const { profileA, profileB, passphrase } = input;
  const roomInput = twoProfileRoomIdentityInput(input);
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return false;
  }
  const inviteRole = currentInviteCodeRole();
  rememberLastInviteRoom(passphrase, currentInviteCodeRole());
  confirmTwoProfileSafetyForInput(roomInput);
  rememberTwoProfileSessionStatus(roomInput, status);
  renderProductionTwoProfileSessionStatusResult(status);
  renderRoomIdentityBar(roomInput, status.both_ready_for_message_envelope);
  renderRoomStatusSummary(roomInput, status.both_ready_for_message_envelope);
  updateMinimalChatMode(input, status.both_ready_for_message_envelope);
  renderSavedInviteRooms();
  await loadProductionTwoProfileTranscript({
    quiet: true,
    refreshSessionStatus: false,
    sessionStatus: status,
    input,
  });
  const recoveryNoticeShown = showSavedInviteRoomRecoveryAfterOpen(roomInput);
  if (!recoveryNoticeShown) {
    setProductionTwoProfileState("Room ready");
    setText(fields.productionTwoProfileWarning, warningText);
    setChatDeliveryNoticeByKey("inviteRoomReadyAfterSessionCode", "success", input);
  }
  startInviteRoomPresenceRefresh(roomInput);
  startInviteRoomTranscriptRefresh(roomInput);
  if (recoveryNoticeShown) {
    refreshFieldTestReport();
  } else if (inviteRole === "inviter") {
    focusCurrentInviteCodeDisplay();
  } else {
    fields.productionTwoProfileMessage?.focus?.();
  }
  return true;
}

async function restoreLastInviteRoom() {
  const saved = savedLastInviteRoom();
  if (!saved || fields.productionTwoProfileB?.value) {
    return false;
  }
  rememberConnectionCodeRole(saved.code, saved.role);
  if (saved.role === "inviter") {
    latestCreatedInviteCode = saved.code;
  }
  if (fields.productionTwoProfileB) {
    fields.productionTwoProfileB.value = saved.code;
    fields.productionTwoProfileB.dataset.inviteCodeRole = saved.role;
  }
  syncTwoProfileDerivedConnectionFields();
  renderCurrentInviteCodeDisplay();
  applyProductionActionState();
  const openInput = productionTwoProfileInput();
  if (!(await waitForMessageRetentionPolicyReady())) {
    return false;
  }
  if (!twoProfileTranscriptInputStillCurrent(openInput)) {
    return false;
  }
  return openInviteRoomFromToken(openInput);
}

async function openInviteRoomFromToken(input = productionTwoProfileInput()) {
  const { profileA, profileB, passphrase, messageTtlSeconds } = input;
  const openInput = { ...input, profileA, profileB, passphrase, messageTtlSeconds };
  if (!messageRetentionPolicyReady()) {
    setProductionTwoProfileState("Room setup blocked");
    setText(fields.productionTwoProfileWarning, messageRetentionPolicyBlocker());
    applyProductionActionState();
    return false;
  }
  if (!messageTtlSeconds) {
    setProductionTwoProfileState("Room setup blocked");
    setText(fields.productionTwoProfileWarning, messageTtlInputBlocker());
    applyProductionActionState();
    return false;
  }
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setProductionTwoProfileState("Invite code missing");
    setText(fields.productionTwoProfileWarning, t("inviteCodeMissing"));
    openChatSettingsPanel(fields.productionTwoProfileB);
    return false;
  }

  setInviteRoomOpenBusy(openInput);
  setProductionTwoProfileState(currentInviteCodeRole() === "inviter" ? "Opening room" : "Joining room");
  setText(fields.productionTwoProfileWarning, currentInviteCodeRole() === "inviter" ? t("inviteCodeCreatedHint") : t("receivedCodeReadyHint"));
  setText(fields.productionTwoProfileSession, t("setupSessionWaiting"));
  setText(
    fields.productionTwoProfileMessageState,
    currentLanguage === "ko" ? "초대 코드로 채팅방을 여는 중" : "Opening room from invite code",
  );
  setText(fields.productionTwoProfileBoundary, t("setupBoundaryWaiting"));
  applyProductionActionState();

  try {
    try {
      const savedStatus = await invokeInviteRoomSessionStatus({ profileA, profileB, passphrase });
      if (savedStatus.both_ready_for_message_envelope) {
        await saveProductionMessageRetentionPreference(profileA, passphrase, messageTtlSeconds);
        return await finishInviteRoomReadyFromStatus(
          openInput,
          savedStatus,
          currentLanguage === "ko"
            ? "저장된 채팅방을 열었습니다. 바로 메시지를 보낼 수 있습니다."
            : "Saved room opened. You can send a message now.",
        );
      }
    } catch {
      // No saved room yet; continue with first-time invite setup.
    }
    const result = await invokeInviteRoomSetup({ profileA, profileB, passphrase });
    if (!twoProfileTranscriptInputStillCurrent(openInput)) {
      return false;
    }
    const view = renderProductionTwoProfileRoomSetupResult(result);
    if (!view.canContinue) {
      setProductionTwoProfileState("Room setup failed");
      setText(fields.productionTwoProfileWarning, result.warning);
      return false;
    }
    await saveProductionMessageRetentionPreference(profileA, passphrase, messageTtlSeconds);
    const status = await invokeInviteRoomSessionStatus({ profileA, profileB, passphrase });
    return await finishInviteRoomReadyFromStatus(
      openInput,
      status,
      currentInviteCodeRole() === "inviter"
        ? currentLanguage === "ko"
          ? "방이 열렸습니다. 초대 코드를 복사해 상대에게 보내세요."
          : "Room is open. Copy the invite code and send it to the other device."
        : currentLanguage === "ko"
          ? "초대 코드로 방에 들어왔습니다. 바로 메시지를 보낼 수 있습니다."
          : "Joined with the invite code. You can send a message now.",
    );
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(openInput)) {
      return false;
    }
    resetFailedJoinInviteRoomState(passphrase);
    setProductionTwoProfileState("Room setup failed");
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("roundtrip", error, productionTwoProfileInput(), { includeDetail: true }));
    setChatDeliveryNoticeByKey(isInviteRoomNotOpenError(error) ? "inviteRoomNotOpenNotice" : "recoveryRoundtrip", "warning");
    setText(fields.productionTwoProfileSession, t("statusFailed"));
    setText(fields.productionTwoProfileMessageState, t("statusFailed"));
    setText(fields.productionTwoProfileBoundary, t("statusFailed"));
    return false;
  } finally {
    clearInviteRoomOpenBusy(openInput);
    applyProductionActionState();
  }
}

function stopInviteRoomPresenceRefresh() {
  if (inviteRoomPresenceRefreshTimer !== null) {
    window.clearInterval(inviteRoomPresenceRefreshTimer);
    inviteRoomPresenceRefreshTimer = null;
  }
  inviteRoomPresenceRefreshFingerprint = "";
}

function stopInviteRoomTranscriptRefresh() {
  if (inviteRoomTranscriptRefreshTimer !== null) {
    window.clearInterval(inviteRoomTranscriptRefreshTimer);
    inviteRoomTranscriptRefreshTimer = null;
  }
  inviteRoomTranscriptRefreshFingerprint = "";
}

function startInviteRoomPresenceRefresh(input = productionTwoProfileInput()) {
  stopInviteRoomPresenceRefresh();
  if (currentInviteCodeRole() !== "inviter" || !input.profileA || !input.profileB || !input.passphrase) {
    return;
  }
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  inviteRoomPresenceRefreshFingerprint = fingerprint;
  const refresh = () => {
    invoke("production_invite_room_presence_refresh", {
      localProfile: input.profileA,
      peerProfile: input.profileB,
      passphrase: input.passphrase,
    })
      .then((result) => {
        if (inviteRoomPresenceRefreshFingerprint === fingerprint && result?.open === false) {
          stopInviteRoomPresenceRefresh();
        }
      })
      .catch(() => {
        if (inviteRoomPresenceRefreshFingerprint === fingerprint) {
          stopInviteRoomPresenceRefresh();
        }
      });
  };
  refresh();
  inviteRoomPresenceRefreshTimer = window.setInterval(refresh, 2000);
}

function startInviteRoomTranscriptRefresh(input = productionTwoProfileInput()) {
  if (!twoProfileInviteCodeModeActive() || !input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
    stopInviteRoomTranscriptRefresh();
    return;
  }
  const status = latestTwoProfileSessionStatusForCurrentInput(input);
  if (!status?.both_ready_for_message_envelope) {
    stopInviteRoomTranscriptRefresh();
    return;
  }
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  if (inviteRoomTranscriptRefreshTimer !== null && inviteRoomTranscriptRefreshFingerprint === fingerprint) {
    return;
  }
  stopInviteRoomTranscriptRefresh();
  inviteRoomTranscriptRefreshFingerprint = fingerprint;
  const refresh = async () => {
    if (productionBusyAction !== null || inviteRoomTranscriptRefreshInFlight) {
      return;
    }
    const currentInput = productionTwoProfileInput();
    if (
      twoProfileSessionStatusFingerprint(currentInput) !== fingerprint ||
      !latestTwoProfileSessionStatusForCurrentInput(currentInput)?.both_ready_for_message_envelope
    ) {
      stopInviteRoomTranscriptRefresh();
      return;
    }
    inviteRoomTranscriptRefreshInFlight = true;
    try {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false, input });
    } finally {
      inviteRoomTranscriptRefreshInFlight = false;
    }
  };
  inviteRoomTranscriptRefreshTimer = window.setInterval(() => {
    refresh().catch(() => {
      if (inviteRoomTranscriptRefreshFingerprint === fingerprint) {
        stopInviteRoomTranscriptRefresh();
      }
    });
  }, 1500);
}

async function refreshInviteLocalSessionReady(input = productionTwoProfileInput()) {
  const session = await invoke("production_session_state_check", {
    profile: input.profileA,
    passphrase: input.passphrase,
  });
  rememberProductionSessionState({ profile: input.profileA, passphrase: input.passphrase }, session);
  const status = inviteLocalReadyStatusResult(input, session);
  rememberTwoProfileSessionStatus(input, status);
  renderProductionTwoProfileSessionStatusResult(status);
  renderRoomIdentityBar(input, status.both_ready_for_message_envelope);
  renderRoomStatusSummary(input, status.both_ready_for_message_envelope);
  updateMinimalChatMode(input, status.both_ready_for_message_envelope);
  return { session, status };
}

function currentInviteCodeRole() {
  return connectionCodeRoleFor(currentInviteCodeForRoom());
}

function syncTwoProfileDerivedConnectionFields() {
  const code = (fields.productionTwoProfileB?.value ?? "").trim();
  const profile = fields.productionTwoProfileA;
  const passphrase = fields.productionTwoProfilePassphrase;
  if (!profile || !passphrase) {
    return;
  }
  if (!code) {
    if (isDerivedConnectionProfile(profile.value)) {
      profile.value = "";
    }
    if (fields.productionTwoProfileB) {
      delete fields.productionTwoProfileB.dataset.connectionCode;
      delete fields.productionTwoProfileB.dataset.peerProfile;
      delete fields.productionTwoProfileB.dataset.inviteCodeRole;
    }
    if (passphrase.value === latestDerivedConnectionCode) {
      passphrase.value = "";
    }
    latestDerivedConnectionCode = "";
    latestConnectionCodeRole = "";
    syncProductionProfilePassphraseFromTwoProfile();
    renderCurrentInviteCodeDisplay();
    restorePrivateRouteExchangeForRoom(productionTwoProfileInput());
    return;
  }
  const role = connectionCodeRoleFor(code);
  rememberConnectionCodeRole(code, role);
  const { localProfile, peerProfile } = productionInviteCodeProfiles(code, role);
  profile.value = localProfile;
  if (fields.productionTwoProfileB) {
    fields.productionTwoProfileB.dataset.connectionCode = code;
    fields.productionTwoProfileB.dataset.peerProfile = peerProfile;
    fields.productionTwoProfileB.dataset.inviteCodeRole = role;
  }
  if (!passphrase.value || passphrase.value === latestDerivedConnectionCode) {
    passphrase.value = code;
  }
  latestDerivedConnectionCode = code;
  syncProductionProfilePassphraseFromTwoProfile();
  renderCurrentInviteCodeDisplay();
  restorePrivateRouteExchangeForRoom(productionTwoProfileInput());
}

function currentInviteRoomIdentityForInput(input) {
  const code = String(fields.productionTwoProfileB?.dataset.connectionCode ?? fields.productionTwoProfileB?.value ?? "").trim();
  if (!code) {
    return { connectionCode: "", inviteRole: "" };
  }
  const currentProfileA = String(fields.productionTwoProfileA?.value ?? "").trim();
  const currentProfileB = String(fields.productionTwoProfileB?.dataset.peerProfile || code).trim();
  const currentPassphrase =
    fields.productionTwoProfilePassphrase?.value || fields.productionProfilePassphrase?.value || "";
  if (
    String(input?.profileA ?? "").trim() !== currentProfileA ||
    String(input?.profileB ?? "").trim() !== currentProfileB ||
    String(input?.passphrase ?? "") !== currentPassphrase
  ) {
    return { connectionCode: "", inviteRole: "" };
  }
  return {
    connectionCode: code,
    inviteRole: fields.productionTwoProfileB?.dataset.inviteCodeRole ?? connectionCodeRoleFor(code),
  };
}

function twoProfileSessionStatusFingerprint(input = productionTwoProfileInput()) {
  const currentIdentity = currentInviteRoomIdentityForInput(input);
  const connectionCode = String(input.connectionCode ?? currentIdentity.connectionCode).trim();
  const inviteRole = String(input.inviteRole ?? currentIdentity.inviteRole).trim();
  return `${input.profileA.toLowerCase()}\n${input.profileB.toLowerCase()}\n${input.passphrase || ""}\n${connectionCode}\n${inviteRole}`;
}

function twoProfileRoomIdentityInput(input = productionTwoProfileInput()) {
  const currentIdentity = currentInviteRoomIdentityForInput(input);
  const connectionCode = String(input.connectionCode ?? currentIdentity.connectionCode).trim();
  const inviteRole = String(input.inviteRole ?? currentIdentity.inviteRole).trim();
  return { ...input, connectionCode, inviteRole };
}

function legacyTwoProfileSessionStatusFingerprint(input = productionTwoProfileInput()) {
  return `${input.profileA.toLowerCase()}\n${input.profileB.toLowerCase()}\n${input.passphrase || ""}`;
}

function privateRouteRoomKey(input = productionTwoProfileInput()) {
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return "";
  }
  return twoProfileSessionStatusFingerprint(input);
}

function legacyPrivateRouteRoomKey(input = productionTwoProfileInput()) {
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return "";
  }
  return legacyTwoProfileSessionStatusFingerprint(input);
}

function privateRouteRoomKeys(input = productionTwoProfileInput()) {
  const current = privateRouteRoomKey(input);
  const legacy = legacyPrivateRouteRoomKey(input);
  return [...new Set([current, legacy].filter(Boolean))];
}

function savedReceiveIntentRooms() {
  try {
    const parsed = JSON.parse(localStoreGet(receiveIntentRoomsStorageKey) ?? "[]");
    return new Set(
      (Array.isArray(parsed) ? parsed : [])
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function rememberReceiveIntentForRoom(input = productionTwoProfileInput(), enabled = true) {
  const roomKey = privateRouteRoomKey(input);
  if (!roomKey) {
    return false;
  }
  const rooms = savedReceiveIntentRooms();
  if (enabled) {
    rooms.add(roomKey);
  } else {
    for (const key of privateRouteRoomKeys(input)) {
      rooms.delete(key);
    }
  }
  localStoreSet(receiveIntentRoomsStorageKey, JSON.stringify([...rooms].slice(-48)));
  return true;
}

function receiveIntentForRoom(input = productionTwoProfileInput()) {
  const roomKey = privateRouteRoomKey(input);
  if (!roomKey) {
    return false;
  }
  const rooms = savedReceiveIntentRooms();
  if (rooms.has(roomKey)) {
    return true;
  }
  const legacyKey = legacyPrivateRouteRoomKey(input);
  if (legacyKey && legacyKey !== roomKey && rooms.has(legacyKey)) {
    rooms.add(roomKey);
    localStoreSet(receiveIntentRoomsStorageKey, JSON.stringify([...rooms].slice(-48)));
    return true;
  }
  return false;
}

function receiveModeRoomFingerprint(input = productionTwoProfileInput()) {
  return privateRouteRoomKey(input);
}

function productionTwoProfileReceiveMatchesInput(input = productionTwoProfileInput()) {
  const roomFingerprint = receiveModeRoomFingerprint(input);
  return Boolean(
    productionTwoProfileOnionReceiveMode.enabled &&
      roomFingerprint &&
      productionTwoProfileOnionReceiveMode.roomFingerprint === roomFingerprint &&
      productionTwoProfileOnionReceiveMode.profile === input.profileA,
  );
}

function productionTwoProfileReceiveActiveInOtherRoom(input = productionTwoProfileInput()) {
  return Boolean(
    productionTwoProfileOnionReceiveMode.enabled &&
      !productionTwoProfileReceiveMatchesInput(input),
  );
}

function productionTwoProfileReceiveStoppingInOtherRoom(input = productionTwoProfileInput()) {
  return Boolean(
    productionTwoProfileReceiveActiveInOtherRoom(input) &&
      productionTwoProfileOnionReceiveMode.stopRequested,
  );
}

function routeReadinessReceiveStopPending(readiness) {
  return Boolean(
    readiness?.failureKind === "LocalOnionEndpointStopping" ||
      readiness?.receiveStopRequested === true,
  );
}

function routeReadinessReceiveRuntimeMismatch(readiness) {
  return readiness?.failureKind === "RuntimeOwnerProfileMismatch";
}

function productionTwoProfileOnionReceiveOwnerInput(fallbackInput = productionTwoProfileInput()) {
  const ownerFingerprint = String(productionTwoProfileOnionReceiveMode.roomFingerprint ?? "").trim();
  if (!ownerFingerprint) {
    return fallbackInput;
  }
  if (privateRouteRoomKey(fallbackInput) === ownerFingerprint) {
    return fallbackInput;
  }
  const ownerRoom = savedInviteRoomForRoomFingerprint(ownerFingerprint);
  return ownerRoom ? savedInviteRoomInput(ownerRoom) : null;
}

function productionTwoProfileReceiveRuntimeMismatched(input = productionTwoProfileInput()) {
  return Boolean(
    productionTwoProfileReceiveMatchesInput(input) &&
      productionTwoProfileOnionReceiveMode.ownerProfileBound &&
      !productionTwoProfileOnionReceiveMode.ownerMatchesReceiveProfile,
  );
}

function restorePrivateRouteExchangeForRoom(input = productionTwoProfileInput()) {
  const roomKey = privateRouteRoomKey(input);
  latestLocalPrivateRouteCode = routeMapValueForRoom(localPrivateRouteCodesByRoom, input, localPrivateRouteCodesStorageKey);
  if (fields.localPrivateRouteCode) {
    fields.localPrivateRouteCode.value = latestLocalPrivateRouteCode;
  }
  if (fields.peerPrivateRouteCode) {
    fields.peerPrivateRouteCode.value = routeMapValueForRoom(peerPrivateRouteDraftsByRoom, input, peerPrivateRouteDraftsStorageKey);
  }
  updateLocalPrivateRouteCodeUi(input);
  renderPrivateRouteExchangeState(input);
}

function rememberPeerPrivateRouteDraft(input = productionTwoProfileInput()) {
  const roomKey = privateRouteRoomKey(input);
  const value = String(fields.peerPrivateRouteCode?.value ?? "").trim();
  if (!roomKey) {
    return;
  }
  if (value) {
    peerPrivateRouteDraftsByRoom.set(roomKey, value);
  } else {
    peerPrivateRouteDraftsByRoom.delete(roomKey);
  }
  persistPrivateRouteMap(peerPrivateRouteDraftsStorageKey, peerPrivateRouteDraftsByRoom);
  renderSavedInviteRooms();
}

function routeMapValueForRoom(source, input = productionTwoProfileInput(), storageKey = "") {
  const roomKey = privateRouteRoomKey(input);
  if (!roomKey) {
    return "";
  }
  const currentValue = source.get(roomKey) || "";
  if (currentValue) {
    return currentValue;
  }
  const legacyKey = legacyPrivateRouteRoomKey(input);
  const legacyValue = legacyKey && legacyKey !== roomKey ? source.get(legacyKey) || "" : "";
  if (legacyValue) {
    source.set(roomKey, legacyValue);
    if (storageKey) {
      persistPrivateRouteMap(storageKey, source);
    }
  }
  return legacyValue;
}

function twoProfileAutoResumeFingerprint(input = productionTwoProfileInput()) {
  return `${twoProfileSessionStatusFingerprint(input)}\n${input.passphrase ? "passphrase-present" : "passphrase-missing"}`;
}

function resetTwoProfileAutoResumeAttempt() {
  latestTwoProfileAutoResumeFingerprint = null;
}

function inviteRoomCommandInput(input = productionTwoProfileInput()) {
  return {
    localProfile: input.profileA,
    peerProfile: input.profileB,
    passphrase: input.passphrase,
  };
}

async function invokeInviteRoomSessionStatus(input = productionTwoProfileInput()) {
  return invoke("production_invite_room_session_status", inviteRoomCommandInput(input));
}

async function invokeInviteRoomSetup(input = productionTwoProfileInput()) {
  return invoke("production_invite_room_setup", inviteRoomCommandInput(input));
}

async function saveInviteRoomOutboundMessage(input = productionTwoProfileInput()) {
  const { profileA, profileB, passphrase, message, messageTtlSeconds } = input;
  const roomInput = twoProfileRoomIdentityInput(input);
  await saveProductionMessageRetentionPreference(profileA, passphrase, messageTtlSeconds);
  const result = await invoke("production_message_envelope_export", {
    profile: profileA,
    passphrase,
    messageNumber: 0,
    autoMessageNumber: true,
    message,
    messageTtlSeconds,
  });
  const messageNumber = Number.parseInt(result.selected_message_number, 10);
  const messageText = message;
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return { result, messageNumber, messageText, stillCurrent: false };
  }
  latestProductionTwoProfileSuccess = {
    profileA,
    profileB,
    messageLength: messageText.length,
    messageNumber,
    roomFingerprint: twoProfileSessionStatusFingerprint(roomInput),
    fingerprint: twoProfileInputFingerprint({ ...roomInput, message: messageText }),
  };
  if (fields.productionMessageEnvelope) {
    fields.productionMessageEnvelope.value = result.envelope_payload;
  }
  if (fields.productionMessageNumber) {
    fields.productionMessageNumber.value = String(messageNumber);
  }
  storeMessageEnvelopeSlot(profileA, result.envelope_payload, {
    receiver: profileB,
    roomFingerprint: twoProfileSessionStatusFingerprint(input),
    messageNumber,
    message: messageText,
  });
  appendProductionTwoProfileConversationStatus("sent", profileA, profileB, messageNumber, messageText, {
    ttlSeconds: result.message_ttl_seconds,
    outboundDeliveryState: "pending",
    outboundRetryable: true,
    allowRetryableMetadataFallback: true,
  }, input);
  selectTwoProfileConversationMessage(profileA, profileB, messageNumber, messageText, { input });
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
    renderProductionTwoProfileDirection(productionTwoProfileInput());
  }
  setText(fields.productionTwoProfileSession, t("messageSavedForDelivery"));
  setText(fields.productionTwoProfileMessageState, t("messageWaitingForDelivery"));
  setText(fields.productionTwoProfileBoundary, productionMessageEnvelopeExportView(result).boundary);
  await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false, input });
  return { result, messageNumber, messageText, stillCurrent: true };
}

async function completeInviteRoomOutboundDelivery(input, messageNumber) {
  const { profileA, profileB, passphrase } = input;
  const roomInput = twoProfileRoomIdentityInput(input);
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return;
  }
  const onionInput = roomInput;
  const latestOnionOutbound = latestTwoProfileOutboundOnionMessage(onionInput, { messageNumber });
  const routeReadiness = externalPeerSendReadiness(onionInput, {
    latestOnionOutbound,
    messageNumber,
  });
  if (!routeReadiness.ready) {
    await markTwoProfileOutboundSendFailed(
      profileA,
      passphrase,
      messageNumber,
      routeReadiness.failureKind,
    );
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Private delivery not ready");
    setText(fields.productionTwoProfileWarning, routeReadiness.disabledReason);
    setChatDeliveryNoticeByKey(routeReadiness.noticeKey, "warning", input);
    await loadProductionTwoProfileTranscript({
      quiet: true,
      refreshSessionStatus: true,
      suppressRouteReadinessNoticeRefresh: true,
      allowRetryableMetadataFallback: false,
      input,
    });
    if (!showRetryableOutboundPromptForMessage(input, messageNumber)) {
      showCurrentRetryableOutboundMissing(null);
    }
    refreshFieldTestReport();
    return;
  }
  if (latestOnionOutbound) {
    setText(fields.productionTwoProfileWarning, t("onionDeliveryStarting"));
    await sendProductionTwoProfileLatestOnionEnvelope(onionInput, { messageNumber });
  }
}

function latestTwoProfileSessionStatusForCurrentInput(input = productionTwoProfileInput()) {
  const currentFingerprint = twoProfileSessionStatusFingerprint(input);
  if (!currentFingerprint) {
    return null;
  }
  if (latestProductionTwoProfileSessionStatus?.fingerprint === currentFingerprint) {
    return latestProductionTwoProfileSessionStatus.result;
  }
  return latestProductionTwoProfileSessionStatusesByRoom.get(currentFingerprint)?.result ?? null;
}

function twoProfileSafetyStorageKey(input = productionTwoProfileInput()) {
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return null;
  }
  return `ad.chatSafetyConfirmed.v1.${encodeURIComponent(fingerprint)}`;
}

function legacyTwoProfileSafetyStorageKey(input = productionTwoProfileInput()) {
  const fingerprint = legacyTwoProfileSessionStatusFingerprint(input);
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return null;
  }
  return `ad.chatSafetyConfirmed.v1.${encodeURIComponent(fingerprint)}`;
}

function twoProfileSafetyStorageKeys(input = productionTwoProfileInput()) {
  return [...new Set([twoProfileSafetyStorageKey(input), legacyTwoProfileSafetyStorageKey(input)].filter(Boolean))];
}

function rememberTwoProfileSafety(input, result) {
  if (!result?.safety_phrase && !result?.safety_number) {
    return;
  }
  latestProductionTwoProfileSafety = {
    fingerprint: twoProfileSessionStatusFingerprint(input),
    safetyNumber: String(result.safety_number ?? ""),
    safetyPhrase: String(result.safety_phrase ?? ""),
  };
}

function twoProfileSafetyForInput(input = productionTwoProfileInput()) {
  if (
    latestProductionTwoProfileSafety &&
    latestProductionTwoProfileSafety.fingerprint === twoProfileSessionStatusFingerprint(input)
  ) {
    return latestProductionTwoProfileSafety;
  }
  return null;
}

function twoProfileSafetyConfirmedForInput(input = productionTwoProfileInput()) {
  const key = twoProfileSafetyStorageKey(input);
  if (!key) {
    return false;
  }
  if (localStoreGet(key) === "confirmed") {
    return true;
  }
  const legacyKey = legacyTwoProfileSafetyStorageKey(input);
  if (legacyKey && legacyKey !== key && localStoreGet(legacyKey) === "confirmed") {
    localStoreSet(key, "confirmed");
    return true;
  }
  return false;
}

function confirmTwoProfileSafetyForInput(input = productionTwoProfileInput()) {
  const key = twoProfileSafetyStorageKey(input);
  if (!key) {
    return false;
  }
  return localStoreSet(key, "confirmed");
}

function clearTwoProfileSafetyConfirmationForInput(input = productionTwoProfileInput()) {
  const keys = twoProfileSafetyStorageKeys(input);
  if (keys.length === 0) {
    return false;
  }
  for (const key of keys) {
    localStoreRemove(key);
  }
  return true;
}

function confirmCurrentTwoProfileSafety() {
  const input = productionTwoProfileInput();
  if (!twoProfileSessionsReadyForInput(input)) {
    setProductionTwoProfileState("Verification unavailable");
    setText(fields.productionTwoProfileWarning, t("connectionPendingHint"));
    return;
  }
  if (!confirmTwoProfileSafetyForInput(input)) {
    setProductionTwoProfileState("Verification unavailable");
    setText(fields.productionTwoProfileWarning, t("verificationPhraseUnavailable"));
    return;
  }
  setProductionTwoProfileState("Verification confirmed");
  applyProductionActionState();
  if (showPrivateRouteRetryFollowupPrompt(input)) {
    return;
  }
  setText(fields.productionTwoProfileWarning, t("messageInputUnlocked"));
  refreshRouteReadinessNoticeAfterSessionRefresh(input);
  fields.productionTwoProfileMessage?.focus();
}

function rejectCurrentTwoProfileSafety() {
  clearTwoProfileSafetyConfirmationForInput(productionTwoProfileInput());
  setProductionTwoProfileState("Verification mismatch");
  setText(fields.productionTwoProfileWarning, t("phraseMismatchWarning"));
  applyProductionActionState();
  openChatSettingsPanel(fields.productionTwoProfileB);
}

function rememberTwoProfileSessionStatus(input, result) {
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  if (!fingerprint) {
    return;
  }
  latestProductionTwoProfileSessionStatus = {
    fingerprint,
    result,
  };
  latestProductionTwoProfileSessionStatusesByRoom.set(fingerprint, {
    result,
    updatedAt: Date.now(),
  });
  for (const key of latestProductionTwoProfileSessionStatusesByRoom.keys()) {
    if (latestProductionTwoProfileSessionStatusesByRoom.size <= savedInviteRoomStorageLimit) {
      break;
    }
    latestProductionTwoProfileSessionStatusesByRoom.delete(key);
  }
}

function forgetTwoProfileSessionStatusForInput(input) {
  const fingerprint = twoProfileSessionStatusFingerprint(input);
  if (!fingerprint) {
    return;
  }
  latestProductionTwoProfileSessionStatusesByRoom.delete(fingerprint);
  if (latestProductionTwoProfileSessionStatus?.fingerprint === fingerprint) {
    latestProductionTwoProfileSessionStatus = null;
  }
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
    latestTwoProfileSuccessForInput(input) &&
      latestProductionTwoProfileSuccess.profileA === input.profileA &&
      latestProductionTwoProfileSuccess.profileB === input.profileB,
  );
}

function latestTwoProfileSuccessMatchesOppositeDirection(input = productionTwoProfileInput()) {
  return Boolean(
    latestTwoProfileSuccessForInput({
      ...input,
      profileA: input.profileB,
      profileB: input.profileA,
    }) &&
      latestProductionTwoProfileSuccess.profileA === input.profileB &&
      latestProductionTwoProfileSuccess.profileB === input.profileA,
  );
}

function latestTwoProfileSuccessForInput(input = productionTwoProfileInput()) {
  return latestProductionTwoProfileSuccess?.roomFingerprint === twoProfileSessionStatusFingerprint(input)
    ? latestProductionTwoProfileSuccess
    : null;
}

function pendingLocalFinishCodeNeedsSharing() {
  return false;
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
  const activeLocalRoute = routeMapValueForRoom(activeLocalPrivateRouteCodesByRoom, input);
  if (activeLocalRoute) {
    return activeLocalRoute;
  }
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

function localPrivateRouteCodeIsActive(input = productionTwoProfileInput()) {
  const roomKey = privateRouteRoomKey(input);
  return Boolean(
    roomKey &&
      latestLocalPrivateRouteCode &&
      routeMapValueForRoom(activeLocalPrivateRouteCodesByRoom, input) === latestLocalPrivateRouteCode,
  );
}

function currentActiveLocalPrivateRouteCode(input = productionTwoProfileInput()) {
  return localPrivateRouteCodeIsActive(input) ? latestLocalPrivateRouteCode : "";
}

function localPrivateRouteLifecycle(input = productionTwoProfileInput()) {
  const roomKey = privateRouteRoomKey(input);
  return roomKey ? localPrivateRouteLifecycleByRoom.get(roomKey) ?? null : null;
}

function rememberLocalPrivateRouteLifecycle(input = productionTwoProfileInput(), options = {}) {
  const roomKey = privateRouteRoomKey(input);
  if (!roomKey) {
    return false;
  }
  const endpoint = String(
    options.endpoint ??
      routeMapValueForRoom(activeLocalPrivateRouteCodesByRoom, input) ??
      routeMapValueForRoom(localPrivateRouteCodesByRoom, input, localPrivateRouteCodesStorageKey) ??
      "",
  ).trim();
  if (!endpoint) {
    localPrivateRouteLifecycleByRoom.delete(roomKey);
  } else {
    localPrivateRouteLifecycleByRoom.set(roomKey, {
      endpoint,
      state: String(options.state ?? "saved").trim() || "saved",
      updatedAt: Date.now(),
      generation: Number.parseInt(options.generation ?? productionTwoProfileOnionReceiveMode.generation ?? 0, 10) || 0,
    });
  }
  persistPrivateRouteLifecycleMap(localPrivateRouteLifecycleStorageKey, localPrivateRouteLifecycleByRoom);
  return true;
}

function localPrivateRouteCodeStatusKey(input = productionTwoProfileInput()) {
  if (!latestLocalPrivateRouteCode) {
    return "privateRouteLocalStatusEmpty";
  }
  const lifecycle = localPrivateRouteLifecycle(input);
  if (
    lifecycle?.state === "listening" &&
    lifecycle.endpoint === latestLocalPrivateRouteCode &&
    localPrivateRouteCodeIsActive(input)
  ) {
    return "privateRouteLocalStatusListening";
  }
  if (!localPrivateRouteCodeIsActive(input)) {
    return "privateRouteLocalStatusSaved";
  }
  if (
    productionTwoProfileOnionReceiveMode.enabled &&
    !productionTwoProfileOnionReceiveMode.stopRequested &&
    productionTwoProfileOnionReceiveMode.profile === input.profileA
  ) {
    return "privateRouteLocalStatusListening";
  }
  return "privateRouteLocalStatusActive";
}

function updateLocalPrivateRouteCodeUi(input = productionTwoProfileInput()) {
  const hasLocal = Boolean(latestLocalPrivateRouteCode);
  const active = localPrivateRouteCodeIsActive(input);
  const statusKey = localPrivateRouteCodeStatusKey(input);
  fields.copyPrivateRouteCode?.toggleAttribute("disabled", !hasLocal || !active);
  document.body.classList.toggle("has-local-private-route-code", hasLocal && active);
  document.body.classList.toggle("has-active-local-private-route-code", hasLocal && active);
  document.body.classList.toggle("has-saved-local-private-route-code", hasLocal && !active);
  fields.localPrivateRouteCode?.classList.toggle("is-saved-route-code", hasLocal && !active);
  fields.privateRouteLocalStatus?.setAttribute("data-route-status", statusKey);
  setText(fields.privateRouteLocalStatus, t(statusKey));
}

function rememberLocalPrivateRouteCode(code, input, options) {
  const targetInput = input ?? productionTwoProfileInput();
  const routeOptions = options ?? {};
  const roomKey = privateRouteRoomKey(targetInput);
  const markActive = routeOptions.active !== false;
  const updateUi = routeOptions.updateUi !== false;
  const routeCode = String(code ?? "").trim();
  if (roomKey) {
    if (routeCode) {
      localPrivateRouteCodesByRoom.set(roomKey, routeCode);
      if (markActive) {
        activeLocalPrivateRouteCodesByRoom.set(roomKey, routeCode);
      }
      rememberLocalPrivateRouteLifecycle(targetInput, {
        endpoint: routeCode,
        state: markActive ? "ready" : "saved",
      });
    } else {
      localPrivateRouteCodesByRoom.delete(roomKey);
      activeLocalPrivateRouteCodesByRoom.delete(roomKey);
      rememberLocalPrivateRouteLifecycle(targetInput, { endpoint: "", state: "empty" });
    }
    persistPrivateRouteMap(localPrivateRouteCodesStorageKey, localPrivateRouteCodesByRoom);
  }
  if (!updateUi) {
    renderSavedInviteRooms();
    return;
  }
  latestLocalPrivateRouteCode = routeCode;
  if (fields.localPrivateRouteCode) {
    fields.localPrivateRouteCode.value = latestLocalPrivateRouteCode;
  }
  updateLocalPrivateRouteCodeUi(targetInput);
  renderSavedInviteRooms();
}

function focusLocalPrivateRouteCodeDisplay() {
  fields.localPrivateRouteCode?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  fields.localPrivateRouteCode?.focus?.({ preventScroll: true });
  fields.localPrivateRouteCode?.select?.();
}

function focusPeerPrivateRouteCodeInput() {
  fields.peerPrivateRouteCode?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  fields.peerPrivateRouteCode?.focus?.({ preventScroll: true });
}

function showPrivateRouteExchange() {
  if (fields.privateRouteExchange) {
    fields.privateRouteExchange.hidden = false;
    fields.privateRouteExchange.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }
  document.body.classList.add("shows-private-route-exchange");
}

function focusPrivateRouteNextAction(input = productionTwoProfileInput(), options = {}) {
  const forceRefresh = options.forceRefresh === true;
  showPrivateRouteExchange();
  renderPrivateRouteExchangeState(input, { forceRefresh });
  if (!manualNetworkPermissionEnabled()) {
    openPrivateDeliverySettings(input);
    return "permission";
  }
  if (twoProfilePeerEndpointState(input).ready && !forceRefresh) {
    fields.startProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
    return "ready";
  }
  if (!currentActiveLocalPrivateRouteCode(input)) {
    fields.preparePrivateRoute?.focus?.({ preventScroll: true });
    return "create-local";
  }
  if (!(fields.peerPrivateRouteCode?.value ?? "").trim()) {
    focusPeerPrivateRouteCodeInput();
    return "paste-peer";
  }
  fields.applyPeerPrivateRouteCode?.focus?.({ preventScroll: true });
  return "apply-peer";
}

function renderPrivateRouteExchangeState(input = productionTwoProfileInput(), options = {}) {
  const routeReady = twoProfilePeerEndpointState(input).ready && options.forceRefresh !== true;
  const hasLocal = Boolean(latestLocalPrivateRouteCode);
  const hasActiveLocal = Boolean(currentActiveLocalPrivateRouteCode(input));
  const hasPeerDraft = Boolean((fields.peerPrivateRouteCode?.value ?? "").trim());
  const titleKey = routeReady
    ? "routeTitleReady"
    : !hasLocal
      ? "routeTitleCreate"
      : !hasActiveLocal
        ? "routeTitleRefresh"
      : hasPeerDraft
        ? "routeTitleUse"
        : "routeTitleShare";
  const instructionKey = routeReady
    ? "routeInstructionReady"
    : !hasLocal
      ? "routeInstructionCreate"
      : !hasActiveLocal
        ? "routeInstructionSaved"
      : hasPeerDraft
        ? "routeInstructionUse"
        : "routeInstructionShare";
  fields.privateRouteStepLocal?.classList.toggle("is-complete", hasActiveLocal);
  fields.privateRouteStepLocal?.classList.toggle("is-current", !hasActiveLocal);
  fields.privateRouteStepCopy?.classList.toggle("is-complete", hasActiveLocal && hasPeerDraft);
  fields.privateRouteStepCopy?.classList.toggle("is-current", hasActiveLocal && !hasPeerDraft && !routeReady);
  fields.privateRouteStepPeer?.classList.toggle("is-complete", routeReady);
  fields.privateRouteStepPeer?.classList.toggle("is-current", hasActiveLocal && hasPeerDraft && !routeReady);
  setText(fields.privateRouteExchangeTitle, t(titleKey));
  setText(fields.privateRouteInstruction, t(instructionKey));
  updateLocalPrivateRouteCodeUi(input);
}

function hidePrivateRouteExchangeIfReady(input = productionTwoProfileInput()) {
  if (!twoProfilePeerEndpointState(input).ready) {
    return;
  }
  if (fields.privateRouteExchange) {
    fields.privateRouteExchange.hidden = true;
  }
  document.body.classList.remove("shows-private-route-exchange");
  renderPrivateRouteExchangeState(input);
}

async function ensurePrivateDeliveryRuntimeReady(input = productionTwoProfileInput()) {
  const manualNetworkPermission = manualNetworkPermissionEnabled();
  if (!manualNetworkPermission) {
    throw new Error("ManualNetworkPermissionMissing");
  }
  const backup = await invoke("production_onion_backup_exclusion_prepare");
  const key = await invoke("production_onion_key_record_prepare", {
    profile: input.profileA,
    passphrase: input.passphrase,
  });
  const status = await invoke("production_onion_persistent_client_status");
  const client = status.persistent_client_ready
    ? status
    : await invoke("production_onion_persistent_client_start", { manualNetworkPermission });
  if (!client.persistent_client_ready) {
    throw new Error(client.next_blocker || "PersistentClientNotReady");
  }
  return { backup, key, client };
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

function storedPeerEndpointInvitePlaceholderForInput(input = productionTwoProfileInput()) {
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  if (!sessionStatus || !input.profileA) {
    return false;
  }
  if (input.profileA === sessionStatus.profile_a) {
    return sessionStatus.profile_a_remote_endpoint_invite_placeholder === true;
  }
  if (input.profileA === sessionStatus.profile_b) {
    return sessionStatus.profile_b_remote_endpoint_invite_placeholder === true;
  }
  return false;
}

function peerEndpointStateFromSessionStatus(input, sessionStatus, options = {}) {
  if (!sessionStatus || !input?.profileA) {
    return { ready: false, reason: "endpoint not checked" };
  }
  const localProfile = input.profileA;
  const side =
    localProfile === sessionStatus.profile_a
      ? "profile_a"
      : localProfile === sessionStatus.profile_b
        ? "profile_b"
        : "";
  if (!side) {
    return { ready: false, reason: "profiles missing" };
  }
  const present = sessionStatus[`${side}_remote_endpoint_state_present`] === true;
  const stale = sessionStatus[`${side}_remote_endpoint_marked_stale`] === true;
  const refreshRecommended = sessionStatus[`${side}_remote_endpoint_refresh_recommended`] === true;
  const lastFailedMessageNumber = sessionStatus[`${side}_remote_endpoint_last_failed_message_number`] ?? null;
  const invitePlaceholder = sessionStatus[`${side}_remote_endpoint_invite_placeholder`] === true;
  const treatInvitePlaceholderAsMissing = options.treatInvitePlaceholderAsMissing !== false;
  if (stale) {
    return {
      ready: false,
      reason: lastFailedMessageNumber
        ? `stored endpoint stale after message #${lastFailedMessageNumber}`
        : "stored endpoint stale",
      source: "stored session",
      stale: true,
      refreshRecommended,
    };
  }
  if (present && invitePlaceholder && treatInvitePlaceholderAsMissing) {
    return {
      ready: false,
      reason: "peer delivery code missing",
      source: "stored invite placeholder",
    };
  }
  if (present) {
    return { ready: true, reason: "stored endpoint ready", source: "stored session" };
  }
  return { ready: false, reason: "peer endpoint missing", source: "stored session" };
}

function twoProfilePeerEndpointState(input = productionTwoProfileInput()) {
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return { ready: false, reason: "profiles missing" };
  }
  const transientEndpoint = latestTwoProfilePeerOnionEndpoint(input);
  if (transientEndpoint) {
    return { ready: true, reason: "ready", source: "current runtime" };
  }
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  if (sessionStatus) {
    return peerEndpointStateFromSessionStatus(input, sessionStatus, {
      treatInvitePlaceholderAsMissing: twoProfileInviteCodeModeActive(),
    });
  }
  return { ready: false, reason: "endpoint not checked" };
}

function externalPeerSendReadiness(input = productionTwoProfileInput(), options = {}) {
  const sessionsReady = twoProfileSessionsReadyForInput(input);
  const safetyVerified = sessionsReady && twoProfileSafetyConfirmedForInput(input);
  const networkPermission = manualNetworkPermissionEnabled();
  const receiveActive = productionTwoProfileReceiveMatchesInput(input);
  const receiveRuntimeMismatch = productionTwoProfileReceiveRuntimeMismatched(input);
  const receiveStopRequested = Boolean(
    productionTwoProfileOnionReceiveMode.enabled &&
      productionTwoProfileOnionReceiveMode.stopRequested &&
      (receiveActive || productionTwoProfileReceiveActiveInOtherRoom(input)),
  );
  const localEndpointReady = Boolean(
    receiveActive &&
      !receiveRuntimeMismatch &&
      !receiveStopRequested,
  );
  const peerEndpointState = twoProfilePeerEndpointState(input);
  const latestOnionOutbound =
    options.latestOnionOutbound === undefined
      ? latestTwoProfileOutboundOnionMessage(input, options)
      : options.latestOnionOutbound;
  const allowMissingMessage = options.allowMissingMessage === true;

  const base = {
    sessionsReady,
    safetyVerified,
    networkPermission,
    receiveStopRequested,
    localEndpointReady,
    peerEndpointState,
    latestOnionOutbound,
  };
  if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
    return {
      ...base,
      ready: false,
      nextAction: "check-session",
      noticeKey: "receiveNeedsRoom",
      failureKind: "MessageSessionNotReady",
      disabledReason: t("receiveNeedsRoom"),
    };
  }
  if (!sessionsReady) {
    return {
      ...base,
      ready: false,
      nextAction: "check-session",
      noticeKey: "receiveNeedsReadyRoom",
      failureKind: "MessageSessionNotReady",
      disabledReason: t("receiveNeedsReadyRoom"),
    };
  }
  if (!safetyVerified) {
    return {
      ...base,
      ready: false,
      nextAction: "verify",
      noticeKey: "sendLockedUntilVerified",
      failureKind: "SafetyVerificationRequired",
      disabledReason: t("sendLockedUntilVerified"),
    };
  }
  if (!networkPermission) {
    return {
      ...base,
      ready: false,
      nextAction: "enable-private-delivery",
      noticeKey: "chatNoticeNetworkPermission",
      failureKind: "ManualNetworkPermissionMissing",
      disabledReason: t("deliveryNeedsNetworkPermission"),
    };
  }
  if (!localEndpointReady) {
    const failureKind = receiveRuntimeMismatch
      ? "RuntimeOwnerProfileMismatch"
      : receiveStopRequested
        ? "LocalOnionEndpointStopping"
        : "LocalOnionEndpointNotReady";
    return {
      ...base,
      ready: false,
      nextAction: "start-receiving",
      noticeKey: receiveRuntimeMismatch
        ? "receiveRuntimeMismatch"
        : receiveStopRequested
          ? "receiveStopPending"
          : "chatNoticeReceiveStopped",
      failureKind,
      disabledReason: receiveRuntimeMismatch
        ? t("receiveRuntimeMismatch")
        : receiveStopRequested
          ? t("receiveStopPending")
          : t("externalSendNeedsReceive"),
    };
  }
  if (!peerEndpointState.ready) {
    return {
      ...base,
      ready: false,
      nextAction: "refresh-endpoint",
      noticeKey: peerEndpointState.stale ? "chatNoticeRefreshAddress" : "privateDeliveryRouteNeeded",
      failureKind: peerEndpointState.stale
        ? "stored remote endpoint refresh required"
        : "peer-endpoint-missing",
      disabledReason: peerEndpointState.stale
        ? t("chatNoticeRefreshAddress")
        : t("peerPrivateRouteCodeMissing"),
    };
  }
  if (!allowMissingMessage && !latestOnionOutbound) {
    return {
      ...base,
      ready: false,
      nextAction: "retry-send",
      noticeKey: "sendFailedGeneric",
      failureKind: "StoredOutboundEnvelopeRequired",
      disabledReason: t("inputRequiredMessage"),
    };
  }
  return {
    ...base,
    ready: true,
    nextAction: "retry-send",
    noticeKey: "chatNoticeSending",
    failureKind: "",
    disabledReason: "",
  };
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
    if (twoProfileInviteCodeModeActive() && storedPeerEndpointInvitePlaceholderForInput(input)) {
      return { ready: false, reason: "peer delivery code missing" };
    }
    return { ready: true, reason: "stored endpoint ready" };
  }
  if (latestTwoProfileSessionStatusForCurrentInput(input)) {
    return { ready: false, reason: "stored peer endpoint missing" };
  }
  return { ready: false, reason: "endpoint not checked" };
}

function latestTwoProfileOutboundDeliveryCandidate(input = productionTwoProfileInput(), options = {}) {
  const targetMessageNumber = Number.parseInt(options.messageNumber, 10);
  const targetRequested = Number.isInteger(targetMessageNumber) && targetMessageNumber > 0;
  const targetRoomFingerprint = String(options.roomFingerprint ?? twoProfileSessionStatusFingerprint(input)).trim();
  const targetMessage = String(options.message ?? "").trim();
  const targetEntry = targetRequested
    ? [...productionTwoProfileConversationEntries.values()].find(
        (entry) =>
          String(entry.roomFingerprint ?? "").trim() === targetRoomFingerprint &&
          String(entry.sender ?? "").trim().toLowerCase() === String(input.profileA ?? "").trim().toLowerCase() &&
          String(entry.receiver ?? "").trim().toLowerCase() === String(input.profileB ?? "").trim().toLowerCase() &&
          Number.parseInt(entry.messageNumber, 10) === targetMessageNumber &&
          (!targetMessage || String(entry.message ?? "").trim() === targetMessage) &&
          twoProfileConversationOutboundRetryable(entry),
      ) ?? null
    : null;
  if (targetRequested && !targetEntry) {
    return null;
  }
  const retryableEntry = targetEntry ?? (targetRequested ? null : automaticVisibleTwoProfileRetryableOutboundEntry(input));
  const latest = retryableEntry
    ? {
        profileA: retryableEntry.sender,
        profileB: retryableEntry.receiver,
        messageNumber: retryableEntry.messageNumber,
        roomFingerprint: retryableEntry.roomFingerprint,
      }
    : null;
  if (
    !latest ||
    (targetRequested && Number.parseInt(latest.messageNumber, 10) !== targetMessageNumber) ||
    latest.profileA !== input.profileA ||
    latest.profileB !== input.profileB ||
    !Number.isInteger(latest.messageNumber) ||
    latest.messageNumber < 1
  ) {
    return null;
  }
  return latest;
}

function latestTwoProfileOutboundOnionMessage(input = productionTwoProfileInput(), options = {}) {
  const latest = latestTwoProfileOutboundDeliveryCandidate(input, options);
  if (!latest) {
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
  const profileAReady = Boolean(
    result.sender_session_ready ?? result.profile_a_ready_for_message_envelope,
  );
  const profileBReady = Boolean(
    result.receiver_session_ready ?? result.profile_b_ready_for_message_envelope,
  );
  rememberTwoProfileSessionStatus(input, {
    profile_a: input.profileA,
    profile_b: input.profileB,
    profile_a_ready_for_message_envelope: profileAReady,
    profile_b_ready_for_message_envelope: profileBReady,
    both_ready_for_message_envelope: Boolean(
      result.both_ready_for_message_envelope ?? (profileAReady && profileBReady),
    ),
    profile_a_session_transport_state_present: profileAReady,
    profile_b_session_transport_state_present: profileBReady,
    profile_a_runtime_material_reconstructable: profileAReady,
    profile_b_runtime_material_reconstructable: profileBReady,
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
  if (twoProfileInviteCodeModeActive()) {
    setText(fields.productionTwoProfileWarning, t("inviteCodeProfileSelectionIgnored"));
    return false;
  }
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

function clearManualMessagePayloadsForRoomContextChange() {
  resetProductionMessageImportState();
  clearManualMessageDraftForReplySelection();
}

function resetProductionMessageTranscript() {
  productionTranscriptEntryKeys.clear();
  resetTranscriptList(fields.productionMessageTranscript, t("emptyConversation"));
  if (fields.productionMessageTranscriptExport) {
    fields.productionMessageTranscriptExport.value = "";
  }
}

function resetProductionTwoProfileTranscript(options = {}) {
  if (options.preserveSelection !== true) {
    selectedTwoProfileConversationKey = null;
  }
  productionTwoProfileConversationEntries.clear();
  resetTranscriptList(fields.productionTwoProfileTranscript, t("emptyConversation"));
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
  const slot = messageEnvelopeSlotRecord(profile, messageEnvelopeSlotRoomFingerprintForEntry(entry));
  return envelopeSlotReadyForEntry(slot, entry);
}

function pendingMessageEnvelopeSlotForActiveProfile(profile = activeProductionProfileName()) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  const counterpart = productionCounterpartProfile(normalizedProfile);
  if (!normalizedProfile || !counterpart) {
    return { counterpart, entry: null, slot: null, value: "" };
  }
  const selectedEntry = selectedTwoProfilePendingConversationEntry();
  const latestEntry = latestTwoProfilePendingConversationEntry();
  const entry =
    selectedEntry && selectedEntry.sender === counterpart && selectedEntry.receiver === normalizedProfile
      ? selectedEntry
      : latestEntry && latestEntry.sender === counterpart && latestEntry.receiver === normalizedProfile
        ? latestEntry
        : null;
  const slot = entry ? messageEnvelopeSlotRecord(counterpart, entry.roomFingerprint) : messageEnvelopeSlotRecord(counterpart);
  const value = messageEnvelopeSlotPayload(slot);
  return { counterpart, entry, slot, value };
}

function activeMessageEnvelopeSlotReady(profile = activeProductionProfileName()) {
  const { entry, slot, value } = pendingMessageEnvelopeSlotForActiveProfile(profile);
  return Boolean(entry && value && messageEnvelopeSlotMatchesEntry(slot, entry));
}

function messageEnvelopeSlotRoomFingerprintForEntry(entry) {
  return String(entry?.roomFingerprint ?? currentManualPayloadSlotRoomFingerprint()).trim();
}

function messageEnvelopeSlotKey(profile, roomFingerprint = currentManualPayloadSlotRoomFingerprint()) {
  return productionPayloadSlotKey(profile, roomFingerprint);
}

function messageEnvelopeSlotRecord(profile, roomFingerprint = currentManualPayloadSlotRoomFingerprint()) {
  const key = messageEnvelopeSlotKey(profile, roomFingerprint);
  return key ? productionPayloadSlots.messageEnvelope.get(key) ?? null : null;
}

function storeMessageEnvelopeSlot(profile, payload, metadata = {}) {
  const roomFingerprint = String(metadata.roomFingerprint ?? currentManualPayloadSlotRoomFingerprint()).trim();
  const slot = createMessageEnvelopeSlot(profile, payload, { ...metadata, roomFingerprint });
  if (!slot) {
    return false;
  }
  const key = messageEnvelopeSlotKey(slot.sender, slot.roomFingerprint);
  if (!key) {
    return false;
  }
  productionPayloadSlots.messageEnvelope.set(key, slot);
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
  for (const [key, slot] of productionPayloadSlots.messageEnvelope.entries()) {
    if (typeof slot === "string") {
      continue;
    }
    const payload = messageEnvelopeSlotPayload(slot);
    const stillMatchesConversation = [...productionTwoProfileConversationEntries.values()].some((entry) =>
      messageEnvelopeSlotMatchesEntry(slot, entry),
    );
    if (!payload || !stillMatchesConversation) {
      productionPayloadSlots.messageEnvelope.delete(key);
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
  const roomFingerprint = currentManualPayloadSlotRoomFingerprint();
  if (
    !selectedEntry ||
    !normalizedProfile ||
    !Number.isInteger(parsedNumber) ||
    !Number.isInteger(selectedNumber) ||
    selectedEntry.sender !== normalizedProfile ||
    selectedEntry.roomFingerprint !== roomFingerprint ||
    selectedNumber !== parsedNumber ||
    selectedEntry.message !== text
  ) {
    return {};
  }
  return {
    receiver: selectedEntry.receiver,
    roomFingerprint,
    messageNumber: parsedNumber,
    message: text,
  };
}

function twoProfileConversationKey(entry) {
  return [
    String(entry.roomFingerprint ?? twoProfileSessionStatusFingerprint(productionTwoProfileInput())),
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
  input = productionTwoProfileInput(),
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
    roomFingerprint: twoProfileSessionStatusFingerprint(input),
    sender: normalizedKind === "sent" ? owner : counterpart,
    receiver: normalizedKind === "sent" ? counterpart : owner,
    messageNumber: normalizedNumber,
    message: text,
    createdAtMs: retention.createdAtMs,
    ttlSeconds: retention.ttlSeconds,
    expiresAtMs: retention.expiresAtMs,
    expired: retention.expired === true,
    outboundDeliveryState: retention.outboundDeliveryState,
    outboundFailureKind: retention.outboundFailureKind,
    outboundRetryable: retention.outboundRetryable === true,
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
  if (normalizedKind === "sent") {
    existing.outboundDeliveryState = entry.outboundDeliveryState || existing.outboundDeliveryState || "pending";
    existing.outboundFailureKind = entry.outboundFailureKind || "";
    existing.outboundRetryable = entry.outboundRetryable === true;
    if (existing.outboundRetryable && retention.allowRetryableMetadataFallback === true) {
      allowCurrentRoomRetryableMetadataFallbackOnce = true;
    }
  }
  productionTwoProfileConversationEntries.set(key, existing);
  renderProductionTwoProfileConversationList();
}

function twoProfileRetentionLabel(entry) {
  return localizedRetentionLabel(entry);
}

function twoProfileEmptyConversationMessage(input = productionTwoProfileInput()) {
  const hasConnectionCode = Boolean(input.profileA && input.profileB && input.profileA !== input.profileB);
  if (!hasConnectionCode) {
    return t("emptyConversationNoConnection");
  }
  const sessionsReady = twoProfileSessionsReadyForInput(input);
  if (!sessionsReady) {
    return t("emptyConversationCreateRoom");
  }
  if (!twoProfileSafetyConfirmedForInput(input)) {
    return t("emptyConversationVerify");
  }
  return t("emptyConversationReady");
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
    empty.textContent = twoProfileEmptyConversationMessage();
    target.append(empty);
    rememberCurrentInviteRoomMetadata();
    updateMinimalChatMode();
    return;
  }
  const replyTarget = selectedTwoProfileDeliveredReplyTarget(productionTwoProfileInput());
  const replyTargetKey = replyTarget ? twoProfileConversationKey(replyTarget) : null;
  for (const entry of entries) {
    const item = document.createElement("li");
    const input = productionTwoProfileInput();
    const key = twoProfileConversationKey(entry);
    const delivered = twoProfileConversationDelivered(entry);
    const inboundOnly = !entry.statuses.has("sent") && entry.statuses.has("received");
    const isMine = twoProfileConversationOwnedByLocalProfile(entry, input);
    const outboundPending = twoProfileConversationOutboundRetryable(entry);
    const outboundCanceled = entry.outboundDeliveryState === "canceled";
    const outboundStatusLabel = productionTwoProfileOutboundStatusLabel(entry);
    const outboundActionState = currentTwoProfileOutboundActionState(
      entry,
      input,
      twoProfileInviteCodeModeActive(),
    );
    const outboundNeedsAction = outboundActionState.showActions;
    const primaryAction = outboundNeedsAction ? currentTwoProfileOutboundPrimaryAction(entry) : null;
    const recoveryClass = primaryAction ? outboundRecoveryClass(primaryAction, outboundStatusLabel) : "";
    const replyable = twoProfileConversationReplyable(entry);
    const reviewable = twoProfileConversationPendingReviewable(entry);
    const selectable = replyable || reviewable;
    const senderEnvelopeSlotPresent = messageEnvelopeSlotReadyForEntry(entry.sender, entry);
    const selected = selectable && key === selectedTwoProfileConversationKey;
    const currentReplyTarget = key === replyTargetKey;
    const currentReviewTarget = selected && !currentReplyTarget && !delivered;
    item.className = delivered
      ? "is-delivered"
      : inboundOnly
        ? "is-inbound-only"
        : outboundCanceled
          ? "is-canceled"
          : outboundPending
            ? "is-pending-send"
            : "is-pending-receive";
    item.classList.toggle("is-actionable", selectable);
    item.classList.toggle("is-mine", isMine);
    item.classList.toggle("is-peer", !isMine);
    item.classList.toggle("is-selected", selected);
    item.classList.toggle("is-reply-target", currentReplyTarget);
    item.classList.toggle("is-review-target", currentReviewTarget);
    item.classList.toggle("is-send-recovery", Boolean(primaryAction));
    if (selectable) {
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    if (currentReplyTarget) {
      item.setAttribute("aria-current", "true");
    }
    item.setAttribute(
      "aria-label",
      twoProfileConversationAriaLabel(entry, {
        currentReplyTarget,
        currentReviewTarget,
        delivered,
        reviewable,
        selected,
      }),
    );
    if (selectable) {
      item.addEventListener("click", () => selectTwoProfileConversationEntry(entry));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectTwoProfileConversationEntry(entry);
        }
      });
    }

    const meta = document.createElement("strong");
    meta.className = "transcript-meta";
    meta.textContent = `${entry.sender} -> ${entry.receiver} / #${entry.messageNumber}`;

    const status = document.createElement("span");
    status.className = `transcript-status ${
      delivered
        ? "is-delivered"
        : inboundOnly
          ? "is-inbound-only"
          : outboundCanceled
            ? "is-canceled"
            : outboundPending
              ? "is-pending-send"
              : "is-pending-receive"
    }`;
    status.textContent = delivered
      ? t("delivered")
      : inboundOnly
        ? t("received")
        : localizedOutboundStatus(outboundStatusLabel);

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
      ? t("replyTarget")
      : actionView.state === "is-reply"
        ? t("replyReady")
        : actionView.state === "is-ready"
          ? t("actionReady")
          : t("waiting");

    const details = document.createElement("span");
    details.className = "transcript-details";
    details.textContent = `${slot.textContent} / ${actionView.rowLabel}${entry.outboundFailureKind ? ` / ${entry.outboundFailureKind}` : ""}`;

    const body = document.createElement("span");
    body.className = "transcript-body";
    body.textContent = entry.message;

    const deliveryNote = document.createElement("span");
    deliveryNote.className = `transcript-delivery-note ${status.className.replace("transcript-status", "").trim()} ${recoveryClass}`.trim();
    deliveryNote.textContent = delivered
      ? ""
      : inboundOnly
        ? ""
        : outboundCanceled
          ? t("canceled")
          : localizedOutboundStatus(outboundStatusLabel);
    const recoveryNote = document.createElement("span");
    recoveryNote.className = `transcript-recovery-note ${recoveryClass}`.trim();
    recoveryNote.textContent = outboundNeedsAction && !outboundActionState.canRunNow
      ? outboundActionState.disabledReason
      : primaryAction
        ? t(outboundRecoveryReasonKey(primaryAction, outboundStatusLabel))
        : "";
    const recoverySummary = document.createElement("span");
    recoverySummary.className = `transcript-recovery-summary ${recoveryClass}`.trim();
    if (primaryAction) {
      const recoveryStatus = document.createElement("strong");
      recoveryStatus.className = "transcript-recovery-status";
      recoveryStatus.textContent = localizedOutboundStatus(outboundStatusLabel);
      const recoveryText = document.createElement("span");
      recoveryText.className = "transcript-recovery-text";
      recoveryText.textContent = recoveryNote.textContent;
      recoverySummary.append(recoveryStatus, recoveryText);
    }

    const footer = document.createElement("span");
    footer.className = "transcript-footer";
    footer.append(status);

    item.append(meta, body);
    if (deliveryNote.textContent) {
      item.append(deliveryNote);
    }
    if (primaryAction) {
      item.append(recoverySummary);
    }
    if (recoveryNote.textContent) {
      item.append(recoveryNote);
    }
    item.append(footer, retention, action, details);
    if (outboundNeedsAction) {
      const actions = document.createElement("span");
      actions.className = "transcript-row-actions";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "transcript-retry";
      retry.disabled = !outboundActionState.canRunNow;
      retry.title = outboundActionState.disabledReason || "";
      retry.textContent = outboundPrimaryActionLabel(primaryAction);
      retry.addEventListener("click", (event) => {
        event.stopPropagation();
        const current = currentTwoProfileOutboundAction(entry, { requireCurrentInput: true });
        if (current) {
          runTwoProfileOutboundPrimaryAction(current.entry, current.primaryAction);
        }
      });
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "transcript-cancel";
      cancel.disabled = !outboundActionState.canCancelNow;
      cancel.title = outboundActionState.cancelDisabledReason || "";
      cancel.textContent = t("cancelSend");
      cancel.addEventListener("click", (event) => {
        event.stopPropagation();
        const currentEntry = currentTwoProfileOutboundCancelableEntry(entry, { requireCurrentInput: true });
        if (currentEntry) {
          cancelTwoProfileOutboundEntry(currentEntry);
        }
      });
      actions.append(retry, cancel);
      item.append(actions);
    }
    if (selected) {
      const review = document.createElement("span");
      review.className = `transcript-review ${
        currentReplyTarget ? "is-reply-target" : currentReviewTarget ? "is-review-target" : "is-selected"
      }`;
      review.textContent = currentReplyTarget
        ? `${t("replyTarget")}: ${entry.receiver} -> ${entry.sender}`
        : delivered
        ? `${t("replyCandidate")}: ${entry.receiver} -> ${entry.sender}`
        : twoProfileConversationUserActionMessage(entry);
      item.append(review);
    }
    target.append(item);
  }
  rememberCurrentInviteRoomMetadata();
  updateMinimalChatMode();
}

function latestTwoProfileConversationEntry() {
  const entries = [...productionTwoProfileConversationEntries.values()].sort((left, right) =>
    productionTwoProfileConversationCompare(left, right, "desc"),
  );
  return entries[0] ?? null;
}

function updateMinimalChatMode(input = productionTwoProfileInput(), sessionsReady = twoProfileSessionsReadyForInput(input)) {
  const hasConversation = productionTwoProfileConversationEntries.size > 0;
  const hasRoomActivity = Boolean(hasConversation || latestTwoProfileSuccessForInput(input) || sessionsReady);
  const chatStarted = Boolean(roomDetailOpen && hasRoomActivity);
  const setupEmpty = !chatStarted;
  const hasConnectionCode = Boolean(input.profileB);
  const safetyConfirmed = sessionsReady && twoProfileSafetyConfirmedForInput(input);
  document.body.classList.toggle("is-chat-active", chatStarted);
  document.body.classList.toggle("is-chat-empty", setupEmpty);
  document.body.classList.toggle("has-connection-code", hasConnectionCode);
  document.body.classList.toggle("has-ready-session", sessionsReady);
  document.body.classList.toggle("has-confirmed-safety", safetyConfirmed);
  document.body.classList.toggle("needs-safety-confirmation", sessionsReady && !safetyConfirmed);
  document.body.classList.toggle("has-invite-session-stage", false);
  document.body.classList.toggle("needs-final-code-share", false);
  updateChatPrimaryActionMode(input, sessionsReady);
  renderCurrentInviteCodeDisplay();
  if (chatStarted) {
    document.querySelector(".chat-diagnostics")?.removeAttribute("open");
  }
}

function updateChatPrimaryActionMode(input = productionTwoProfileInput(), sessionsReady = twoProfileSessionsReadyForInput(input)) {
  const actionBar = fields.chatPrimaryActions;
  if (!actionBar) {
    return;
  }
  const canCheckSession = Boolean(input.profileA && input.profileB && input.profileA !== input.profileB && input.passphrase);
  const hasDraft = Boolean(String(input.message ?? "").trim());
  actionBar.classList.toggle("is-setup-mode", !sessionsReady);
  actionBar.classList.toggle("is-send-mode", sessionsReady);
  actionBar.classList.toggle("has-session-check-input", canCheckSession);
  actionBar.classList.toggle("has-message-draft", hasDraft);
  document.body.classList.toggle("has-message-draft", hasDraft);
  const receivingCurrentRoom = productionTwoProfileReceiveMatchesInput(input);
  const receivingOtherRoom = productionTwoProfileReceiveActiveInOtherRoom(input);
  actionBar.classList.toggle("has-receive-enabled", receivingCurrentRoom);
  actionBar.classList.toggle("is-receive-stopping", receivingCurrentRoom && productionTwoProfileOnionReceiveMode.stopRequested);
  document.body.classList.toggle("has-private-delivery-permission", manualNetworkPermissionEnabled());
  document.body.classList.toggle(
    "has-private-route",
    twoProfilePeerEndpointState(input).ready,
  );
  document.body.classList.toggle(
    "has-local-private-route-code",
    Boolean(currentActiveLocalPrivateRouteCode(input)),
  );
  document.body.classList.toggle("is-receiving-messages", receivingCurrentRoom);
  document.body.classList.toggle("is-receiving-other-room", receivingOtherRoom);
  document.body.classList.toggle("is-receiving-runtime-mismatch", productionTwoProfileReceiveRuntimeMismatched(input));
  document.body.classList.toggle("is-stopping-receive", receivingCurrentRoom && productionTwoProfileOnionReceiveMode.stopRequested);
}

function twoProfileConversationDelivered(entry) {
  return Boolean(entry?.statuses?.has("sent") && entry.statuses?.has("received"));
}

function twoProfileConversationOwnedByLocalProfile(entry, input = productionTwoProfileInput()) {
  const localProfile = String(input.profileA ?? "").trim().toLowerCase();
  const sender = String(entry?.sender ?? "").trim().toLowerCase();
  return Boolean(localProfile && sender && sender === localProfile);
}

function twoProfileConversationReplyable(entry) {
  return Boolean(entry?.statuses?.has("received"));
}

function twoProfileConversationOutboundRetryable(entry) {
  return Boolean(
    !entry?.statuses?.has("received") &&
      entry.outboundRetryable === true &&
      entry.sender &&
      entry.receiver &&
      entry.outboundDeliveryState !== "canceled",
  );
}

function twoProfileConversationPendingReviewable(entry) {
  return Boolean(!twoProfileConversationReplyable(entry) && entry?.outboundDeliveryState !== "canceled");
}

function latestTwoProfilePendingConversationEntry() {
  const entries = [...productionTwoProfileConversationEntries.values()]
    .filter(twoProfileConversationPendingReviewable)
    .sort((left, right) => productionTwoProfileConversationCompare(left, right, "desc"));
  return entries[0] ?? null;
}

function latestTwoProfileRetryableOutboundEntry(input = productionTwoProfileInput()) {
  return productionTwoProfileLatestRetryableOutbound(
    [...productionTwoProfileConversationEntries.values()],
    input,
  );
}

function selectedTwoProfileRetryableOutboundEntry(input = productionTwoProfileInput()) {
  const selectedEntry = selectedTwoProfileConversationEntry();
  const sender = String(selectedEntry?.sender ?? "").trim().toLowerCase();
  const receiver = String(selectedEntry?.receiver ?? "").trim().toLowerCase();
  const profileA = String(input.profileA ?? "").trim().toLowerCase();
  const profileB = String(input.profileB ?? "").trim().toLowerCase();
  if (
    !selectedEntry ||
    !twoProfileConversationOutboundRetryable(selectedEntry) ||
    String(selectedEntry.roomFingerprint ?? "").trim() !== twoProfileSessionStatusFingerprint(input) ||
    sender !== profileA ||
    receiver !== profileB
  ) {
    return null;
  }
  return selectedEntry;
}

function latestVisibleTwoProfileRetryableOutboundEntry(input = productionTwoProfileInput()) {
  return selectedTwoProfileRetryableOutboundEntry(input) ?? latestTwoProfileRetryableOutboundEntry(input);
}

function clearedRetryableSelectionMatchesInput(input = productionTwoProfileInput()) {
  return Boolean(
    latestClearedRetryableSelection &&
      String(latestClearedRetryableSelection.roomFingerprint ?? "").trim() === twoProfileSessionStatusFingerprint(input),
  );
}

function automaticVisibleTwoProfileRetryableOutboundEntry(input = productionTwoProfileInput()) {
  const selected = selectedTwoProfileRetryableOutboundEntry(input);
  if (selected) {
    return selected;
  }
  return clearedRetryableSelectionMatchesInput(input) ? null : latestTwoProfileRetryableOutboundEntry(input);
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
    !input.profileB
  ) {
    return null;
  }
  if (twoProfileInviteCodeModeActive()) {
    return entry;
  }
  if (
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
  latestClearedRetryableSelection = null;
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
    roomFingerprint: twoProfileSessionStatusFingerprint(options.input ?? productionTwoProfileInput()),
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
  return selectedEntry && twoProfileConversationPendingReviewable(selectedEntry)
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

function twoProfileRetryableOutboundActionView(entry, fallback) {
  if (!twoProfileConversationOutboundRetryable(entry)) {
    return fallback;
  }
  const current = currentTwoProfileOutboundAction(entry);
  const primaryAction = current?.primaryAction ?? currentTwoProfileOutboundPrimaryAction(entry);
  const number = Number.parseInt(entry?.messageNumber, 10);
  const label = Number.isInteger(number) ? `#${number}` : "";
  const common = {
    state: "is-ready",
    manualTarget: null,
    manualButtonLabel: "Open manual tools",
  };
  if (primaryAction.action === "refresh-and-retry") {
    return {
      ...common,
      nextAction: `Stale address: refresh the peer address, then retry message ${label}.`,
      rowLabel: "action: refresh address and retry",
      focusTarget: "refresh-endpoint",
    };
  }
  if (primaryAction.action === "start-receiving") {
    return {
      ...common,
      nextAction: `Receive stopped: start receiving, then retry message ${label}.`,
      rowLabel: "action: start receiving",
      focusTarget: "start-receiving",
    };
  }
  if (primaryAction.action === "stop-receiving") {
    return {
      ...common,
      nextAction: `Receiver owner mismatch: stop receiving, then restart it before retrying message ${label}.`,
      rowLabel: "action: stop mismatched receive",
      focusTarget: "stop-receiving",
    };
  }
  if (primaryAction.action === "wait-receive-stop") {
    return {
      ...common,
      nextAction: `Receive is stopping: wait until it finishes, then retry message ${label}.`,
      rowLabel: "action: wait for receive stop",
      focusTarget: "retry-send",
    };
  }
  if (primaryAction.action === "retry-network") {
    return {
      ...common,
      nextAction: `Network retry needed: retry private delivery for message ${label}.`,
      rowLabel: "action: retry network",
      focusTarget: "retry-send",
    };
  }
  if (primaryAction.action === "prepare-private-route") {
    return {
      ...common,
      nextAction: `Delivery code needed: set up delivery, then retry message ${label}.`,
      rowLabel: "action: set up delivery",
      focusTarget: "private-route",
    };
  }
  if (primaryAction.action === "enable-private-delivery") {
    return {
      ...common,
      nextAction: `Private delivery is off: turn it on, then retry message ${label}.`,
      rowLabel: "action: turn on private delivery",
      focusTarget: "private-delivery",
    };
  }
  if (primaryAction.action === "verify") {
    return {
      ...common,
      nextAction: `Verify peer identity, then retry message ${label}.`,
      rowLabel: "action: verify peer",
      focusTarget: "verify",
    };
  }
  return {
    ...common,
    nextAction: `Retry send: message ${label} can be sent again or canceled.`,
    rowLabel: "action: retry send",
    focusTarget: "retry-send",
  };
}

function twoProfileConversationActionView(entry) {
  const senderEnvelopeSlotPresent = entry
    ? messageEnvelopeSlotReadyForEntry(entry.sender, entry)
    : false;
  const actionView = productionTwoProfileConversationActionView(entry, senderEnvelopeSlotPresent);
  const resolvedActionView = twoProfileRetryableOutboundActionView(entry, actionView);
  const focusTargets = {
    "reply-message": fields.productionTwoProfileMessage,
    "import-envelope": fields.importProductionMessageEnvelope,
    "remote-envelope": fields.productionRemoteMessageEnvelope,
    "export-envelope": fields.exportProductionMessageEnvelope,
    "stop-receiving": fields.stopProductionTwoProfileOnionReceive,
  };
  return {
    ...resolvedActionView,
    focusTargetKey: resolvedActionView.focusTarget,
    focusTarget: focusTargets[resolvedActionView.focusTarget] ?? null,
  };
}

function selectedTwoProfileNextActionMessage(entry) {
  return twoProfileConversationActionView(entry).nextAction;
}

function retryableTwoProfileOutboundWarning(entry) {
  if (!entry) {
    return "";
  }
  const number = Number.parseInt(entry.messageNumber, 10);
  const label = Number.isInteger(number) ? `#${number}` : "";
  const current = currentTwoProfileOutboundAction(entry);
  const primaryAction = current?.primaryAction ?? currentTwoProfileOutboundPrimaryAction(entry);
  if (primaryAction.action === "refresh-and-retry") {
    return currentLanguage === "ko"
      ? `메시지 ${label} 전송이 멈췄습니다. 상대 주소를 갱신한 뒤 다시 보내거나 취소할 수 있습니다.`
      : `Message ${label} is waiting. Refresh the peer address, then retry or cancel this send.`;
  }
  if (primaryAction.action === "start-receiving") {
    return currentLanguage === "ko"
      ? `메시지 ${label} 전송이 멈췄습니다. 메시지 받기를 시작한 뒤 다시 보내거나 취소할 수 있습니다.`
      : `Message ${label} is waiting. Start receiving, then retry or cancel this send.`;
  }
  if (primaryAction.action === "stop-receiving") {
    return currentLanguage === "ko"
      ? `메시지 ${label} 전송이 멈췄습니다. 현재 받기를 중지한 뒤 다시 시작하고 전송을 재시도하세요.`
      : `Message ${label} is waiting. Stop the current receiver, restart receiving, then retry this send.`;
  }
  if (primaryAction.action === "wait-receive-stop") {
    return currentLanguage === "ko"
      ? `메시지 ${label} 전송이 멈췄습니다. 받기 중지가 완료된 뒤 다시 보내거나 취소할 수 있습니다.`
      : `Message ${label} is waiting. Wait for receiving to stop, then retry or cancel this send.`;
  }
  if (primaryAction.action === "retry-network") {
    return currentLanguage === "ko"
      ? `메시지 ${label} 전송 네트워크를 다시 시도해야 합니다. 다시 보내거나 취소할 수 있습니다.`
      : `Message ${label} needs a network retry. Retry private delivery or cancel this send.`;
  }
  if (primaryAction.action === "prepare-private-route") {
    return currentLanguage === "ko"
      ? `메시지 ${label} 전송 경로가 준비되지 않았습니다. 전송을 준비한 뒤 다시 보내거나 취소할 수 있습니다.`
      : `Message ${label} needs a delivery route. Set up delivery, then retry or cancel this send.`;
  }
  return currentLanguage === "ko"
    ? `메시지 ${label} 전송이 실패했습니다. 다시 보내거나 취소할 수 있습니다.`
    : `Message ${label} failed to send. You can retry or cancel it.`;
}

function twoProfileConversationUserActionMessage(entry) {
  if (!entry) {
    return "";
  }
  const number = Number.parseInt(entry.messageNumber, 10);
  const label = Number.isInteger(number) ? `#${number}` : "";
  if (twoProfileConversationOutboundRetryable(entry)) {
    return retryableTwoProfileOutboundWarning(entry);
  }
  if (entry.outboundDeliveryState === "canceled") {
    return currentLanguage === "ko"
      ? `메시지 ${label} 전송을 취소했습니다. 대화 내용은 이 기기에 남아 있습니다.`
      : `Message ${label} send was canceled. The conversation stays saved on this device.`;
  }
  if (entry.statuses?.has("sent") && !entry.statuses?.has("received")) {
    return currentLanguage === "ko"
      ? `메시지 ${label}가 전송 대기 중입니다. 상대가 수신하면 상태가 갱신됩니다.`
      : `Message ${label} is waiting for delivery. The status will update after the peer receives it.`;
  }
  return selectedTwoProfileNextActionMessage(entry);
}

function twoProfileConversationAriaLabel(entry, state = {}) {
  if (!entry) {
    return "";
  }
  const number = Number.parseInt(entry.messageNumber, 10);
  const label = Number.isInteger(number) ? `#${number}` : "";
  if (state.currentReplyTarget) {
    return currentLanguage === "ko"
      ? `메시지 ${label}에 답장 작성 중`
      : `Writing a reply to message ${label}`;
  }
  if (state.delivered && state.selected) {
    return currentLanguage === "ko"
      ? `선택된 전달 완료 메시지 ${label}. 답장을 작성할 수 있습니다.`
      : `Selected delivered message ${label}. You can write a reply.`;
  }
  if (state.delivered) {
    return currentLanguage === "ko"
      ? `전달 완료 메시지 ${label}. 선택하면 답장할 수 있습니다.`
      : `Delivered message ${label}. Select it to reply.`;
  }
  if (state.currentReviewTarget || state.reviewable) {
    return twoProfileConversationUserActionMessage(entry);
  }
  return currentLanguage === "ko" ? `메시지 ${label}` : `Message ${label}`;
}

function showRetryableTwoProfileOutboundNotice(entry) {
  if (!entry) {
    return;
  }
  setChatDeliveryNoticeForPendingOutbound(entry, productionTwoProfileInput());
}

function showLatestRetryableOutboundNotice(input = productionTwoProfileInput(), options = {}) {
  if (!twoProfileSessionsReadyForInput(input)) {
    return false;
  }
  if (latestChatDeliveryNoticePendingOutbound && chatDeliveryNoticeMatchesInput(input)) {
    const pending = restoreLatestChatDeliveryPendingOutbound(input);
    if (pending) {
      setChatDeliveryNoticeForPendingOutbound(pending, input);
      return true;
    }
    showCurrentRetryableOutboundMissing(latestChatDeliveryNoticePendingOutbound);
    return true;
  }
  if (options.allowAutomatic === false) {
    return false;
  }
  const entry = automaticVisibleTwoProfileRetryableOutboundEntry(input);
  if (!entry) {
    return false;
  }
  setChatDeliveryNoticeForPendingOutbound(entry, input);
  return true;
}

function isRouteReadinessNoticeKey(key = latestChatDeliveryNoticeKey) {
  return new Set([
    "chatNoticeRefreshAddress",
    "chatNoticeNetworkPermission",
    "chatNoticeReceiveStopped",
    "messageSavedPrivateDeliveryOff",
    "peerPrivateRouteCodeMissing",
    "privateDeliveryRouteReady",
    "privateDeliveryRouteNeeded",
    "privateRouteWaitingPeerCode",
    "sendLockedUntilVerified",
  ]).has(key);
}

function isRealOnionRecoveryNoticeKey(key = latestChatDeliveryNoticeKey) {
  return new Set([
    "bridgeConfigInvalidStatus",
    "bridgeTransportInvalidStatus",
    "fieldTestNextDifferentNetwork",
    "fieldTestNextEnablePrivateDelivery",
    "fieldTestNextInspectDiagnostics",
    "fieldTestNextPrepareNetworkOrBridge",
    "fieldTestNextRefreshBridge",
    "fieldTestNextRefreshBridgeTransport",
    "fieldTestNextRetryDelivery",
    "fieldTestNextRetryNetwork",
  ]).has(key);
}

function refreshRouteReadinessNoticeAfterSessionRefresh(input = productionTwoProfileInput(), options = {}) {
  if (!chatDeliveryNoticeMatchesInput(input)) {
    return false;
  }
  const routeReadiness = externalPeerSendReadiness(input, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  const routeReadinessBlocked = routeReadiness.ready !== true;
  if (
    !isRouteReadinessNoticeKey() &&
    !(routeReadinessBlocked && isRealOnionRecoveryNoticeKey())
  ) {
    return false;
  }
  if (options.allowRetryRecovery !== false) {
    if (showPrivateRouteRetryFollowupPrompt(input)) {
      return true;
    }
    if (showLatestRetryableOutboundNotice(input, { allowAutomatic: false })) {
      return true;
    }
  }
  if (routeReadiness.ready === true) {
    setProductionTwoProfileState("Private route ready");
    setText(fields.productionTwoProfileWarning, t("privateDeliveryRouteReady"));
    setChatDeliveryNoticeByKey("privateDeliveryRouteReady", "success", input);
    setProductionFollowupActions(
      true,
      currentLanguage === "ko"
        ? "다음: 새 메시지를 작성하거나 저장된 전송을 다시 시도하세요."
        : "Next: write a new message or retry the saved send.",
    );
    fields.productionTwoProfileMessage?.focus?.({ preventScroll: true });
    return true;
  }
  if (routeReadiness.nextAction === "start-receiving" && !routeReadinessReceiveStopPending(routeReadiness)) {
    setProductionTwoProfileState("Message listening needed");
    setText(fields.productionTwoProfileWarning, t("chatNoticeReceiveStopped"));
    setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "muted", input);
    setProductionFollowupActions(
      true,
      currentLanguage === "ko"
        ? "다음: 이 채팅방에서 메시지 받기를 시작하세요."
        : "Next: start receiving in this room.",
    );
    fields.startProductionTwoProfileOnionReceive?.focus?.({ preventScroll: true });
    return true;
  }
  if (routeReadiness.noticeKey && routeReadiness.noticeKey !== latestChatDeliveryNoticeKey) {
    setText(fields.productionTwoProfileWarning, routeReadiness.disabledReason || t(routeReadiness.noticeKey));
    setChatDeliveryNoticeByKey(routeReadiness.noticeKey, "warning", input);
    return true;
  }
  return false;
}

function showReceiveEndpointUpdateRecoveryNotice(input, previousPendingNotice = null, options = {}) {
  if (restoreChatDeliveryPendingOutboundSnapshot(previousPendingNotice, input)) {
    return true;
  }
  if (showPrivateRouteRetryFollowupPrompt(input, { clear: true })) {
    return true;
  }
  if (showLatestRetryableOutboundNotice(input, { allowAutomatic: false })) {
    return true;
  }
  if (options.allowRouteReadiness === false) {
    return false;
  }
  return refreshRouteReadinessNoticeAfterSessionRefresh(input, {
    allowRetryRecovery: false,
  });
}

function clearStaleSendRecoveryNotice(input = productionTwoProfileInput()) {
  if (automaticVisibleTwoProfileRetryableOutboundEntry(input)) {
    return false;
  }
  if (!chatDeliveryNoticeMatchesInput(input)) {
    return false;
  }
  const staleRecoveryNotice = new Set([
    "sendFailedGeneric",
    "messageSavedPrivateDeliveryOff",
    "privateDeliveryRouteNeeded",
    "chatNoticeRefreshAddress",
  ]);
  if (!staleRecoveryNotice.has(latestChatDeliveryNoticeKey)) {
    return false;
  }
  setChatDeliveryNoticeByKey("", "neutral");
  return true;
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

function twoProfileConversationEntryMatchesOutbound(entry, input = productionTwoProfileInput(), messageNumber = null) {
  const normalizedNumber = Number.parseInt(messageNumber, 10);
  return Boolean(
    entry &&
      String(entry.roomFingerprint ?? "").trim() === twoProfileSessionStatusFingerprint(input) &&
      String(entry.sender ?? "").trim().toLowerCase() === String(input.profileA ?? "").trim().toLowerCase() &&
      String(entry.receiver ?? "").trim().toLowerCase() === String(input.profileB ?? "").trim().toLowerCase() &&
      Number.isInteger(normalizedNumber) &&
      normalizedNumber > 0 &&
      Number.parseInt(entry.messageNumber, 10) === normalizedNumber,
  );
}

function clearMessageEnvelopeSlotForConversationEntry(entry) {
  if (!entry) {
    return false;
  }
  const slot = messageEnvelopeSlotRecord(entry.sender, entry.roomFingerprint);
  if (!messageEnvelopeSlotMatchesEntry(slot, entry)) {
    return false;
  }
  const key = messageEnvelopeSlotKey(entry.sender, entry.roomFingerprint);
  const payload = messageEnvelopeSlotPayload(slot);
  if (!key) {
    return false;
  }
  productionPayloadSlots.messageEnvelope.delete(key);
  clearMessageEnvelopeFieldsForPayload(payload);
  return true;
}

function clearCompletedExternalSendUiState(input = productionTwoProfileInput(), messageNumber = null) {
  let changed = false;
  const sentEntry =
    [...productionTwoProfileConversationEntries.values()].find((entry) =>
      twoProfileConversationEntryMatchesOutbound(entry, input, messageNumber),
    ) ?? null;
  if (!sentEntry || twoProfileConversationOutboundRetryable(sentEntry)) {
    return false;
  }
  changed = clearPrivateRouteFollowupForRoom(input);
  changed = clearMessageEnvelopeSlotForConversationEntry(sentEntry) || changed;
  const selectedEntry = selectedTwoProfileConversationEntry();
  if (
    selectedEntry &&
    !twoProfileConversationOutboundRetryable(selectedEntry) &&
    twoProfileConversationEntryMatchesOutbound(selectedEntry, input, messageNumber)
  ) {
    latestClearedRetryableSelection = {
      roomFingerprint: String(selectedEntry.roomFingerprint ?? twoProfileSessionStatusFingerprint(input)).trim(),
      sender: String(selectedEntry.sender ?? "").trim(),
      receiver: String(selectedEntry.receiver ?? "").trim(),
      messageNumber: Number.parseInt(selectedEntry.messageNumber, 10) || 0,
      message: String(selectedEntry.message ?? "").trim(),
    };
    selectedTwoProfileConversationKey = null;
    changed = true;
  }
  if (changed) {
    renderProductionTwoProfileConversationList();
    applyProductionActionState();
  }
  return changed;
}

function renderProductionTwoProfileTranscriptEntries(entries, input = productionTwoProfileInput()) {
  const selectedBeforeRefresh = selectedTwoProfileConversationEntry();
  const selectedRetryableBeforeRefresh = twoProfileConversationOutboundRetryable(selectedBeforeRefresh)
    ? {
        roomFingerprint: String(selectedBeforeRefresh.roomFingerprint ?? twoProfileSessionStatusFingerprint(input)).trim(),
        sender: String(selectedBeforeRefresh.sender ?? "").trim(),
        receiver: String(selectedBeforeRefresh.receiver ?? "").trim(),
        messageNumber: Number.parseInt(selectedBeforeRefresh.messageNumber, 10) || 0,
        message: String(selectedBeforeRefresh.message ?? "").trim(),
      }
    : null;
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
        outboundDeliveryState: entry.outboundDeliveryState,
        outboundFailureKind: entry.outboundFailureKind,
        outboundRetryable: entry.outboundRetryable,
      },
      input,
    );
  }
  if (clearStaleTwoProfileConversationSelection() && selectedRetryableBeforeRefresh) {
    latestClearedRetryableSelection = selectedRetryableBeforeRefresh;
  }
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
        outboundDeliveryState: entry.outbound_delivery_state,
        outboundFailureKind: entry.outbound_failure_kind,
        outboundRetryable: entry.outbound_retryable === true,
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
      local: productionPayloadSlotReady("pairing", profile),
      remote: productionPayloadSlotReady("pairing", counterpart),
    },
    handshakeInit: {
      local: productionPayloadSlotReady("handshakeInit", profile),
      remote: productionPayloadSlotReady("handshakeInit", counterpart),
    },
    handshakeReply: {
      local: productionPayloadSlotReady("handshakeReply", profile),
      remote: productionPayloadSlotReady("handshakeReply", counterpart),
    },
    handshakeFinish: {
      local: productionPayloadSlotReady("handshakeFinish", profile),
      remote: productionPayloadSlotReady("handshakeFinish", counterpart),
    },
    messageEnvelope: {
      local: Boolean(messageEnvelopeSlotRecord(profile)),
      remote: activeMessageEnvelopeSlotReady(profile),
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

function currentManualPayloadSlotRoomFingerprint() {
  const input = productionTwoProfileInput();
  if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
    return "";
  }
  return twoProfileSessionStatusFingerprint(input);
}

function productionPayloadSlotKey(profile, roomFingerprint = currentManualPayloadSlotRoomFingerprint()) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  const normalizedRoom = String(roomFingerprint ?? "").trim();
  return normalizedProfile && normalizedRoom ? `${normalizedProfile}\n${normalizedRoom}` : "";
}

function productionPayloadSlotPayload(slot) {
  return typeof slot === "string" ? slot : String(slot?.payload ?? "").trim();
}

function productionPayloadSlotMatchesRoom(slot, profile, roomFingerprint = currentManualPayloadSlotRoomFingerprint()) {
  if (!slot || typeof slot === "string") {
    return false;
  }
  return (
    String(slot.profile ?? "").trim().toLowerCase() === String(profile ?? "").trim().toLowerCase() &&
    String(slot.roomFingerprint ?? "").trim() === String(roomFingerprint ?? "").trim()
  );
}

function createProductionPayloadSlot(profile, payload) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  const value = String(payload ?? "").trim();
  const roomFingerprint = currentManualPayloadSlotRoomFingerprint();
  if (!normalizedProfile || !value || !roomFingerprint) {
    return null;
  }
  return { profile: normalizedProfile, roomFingerprint, payload: value };
}

function storeProductionPayloadSlotRecord(kind, profile, payload) {
  const slot = createProductionPayloadSlot(profile, payload);
  if (!slot) {
    return false;
  }
  productionPayloadSlots[kind].set(productionPayloadSlotKey(slot.profile, slot.roomFingerprint), slot);
  return true;
}

function productionPayloadSlotRecord(kind, profile) {
  const key = productionPayloadSlotKey(profile);
  const slot = key ? productionPayloadSlots[kind]?.get(key) : null;
  return productionPayloadSlotMatchesRoom(slot, profile) ? slot : null;
}

function productionPayloadSlotValue(kind, profile) {
  return productionPayloadSlotPayload(productionPayloadSlotRecord(kind, profile));
}

function productionPayloadSlotReady(kind, profile) {
  return Boolean(productionPayloadSlotValue(kind, profile));
}

function rememberPrivateRouteFollowup(action, input = productionTwoProfileInput(), options = {}) {
  const retryMessageNumber = Number.parseInt(options.messageNumber, 10);
  pendingPrivateRouteFollowup = {
    action,
    roomFingerprint: twoProfileAutoResumeFingerprint(input),
    messageFingerprint: twoProfileInputFingerprint(input),
    retrySender: String(options.sender ?? input.profileA ?? "").trim(),
    retryReceiver: String(options.receiver ?? input.profileB ?? "").trim(),
    retryMessageNumber: Number.isInteger(retryMessageNumber) && retryMessageNumber > 0 ? retryMessageNumber : null,
    retryMessage: String(options.message ?? "").trim(),
  };
}

function clearPrivateRouteFollowup() {
  pendingPrivateRouteFollowup = null;
}

function privateRouteFollowupMatchesRoom(input = productionTwoProfileInput()) {
  return Boolean(
    pendingPrivateRouteFollowup &&
      pendingPrivateRouteFollowup.roomFingerprint === twoProfileAutoResumeFingerprint(input),
  );
}

function clearPrivateRouteFollowupForRoom(input = productionTwoProfileInput()) {
  if (privateRouteFollowupMatchesRoom(input)) {
    clearPrivateRouteFollowup();
    return true;
  }
  return false;
}

function clearMismatchedPrivateRouteFollowup(input = productionTwoProfileInput()) {
  if (!pendingPrivateRouteFollowup || privateRouteFollowupMatchesRoom(input)) {
    return false;
  }
  clearPrivateRouteFollowup();
  return true;
}

async function continueAfterPeerPrivateRouteSaved(input = productionTwoProfileInput()) {
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return false;
  }
  if (!twoProfilePeerEndpointState(input).ready) {
    return false;
  }
  if (!privateRouteFollowupMatchesRoom(input)) {
    return false;
  }
  const followup = pendingPrivateRouteFollowup;
  clearPrivateRouteFollowup();
  if (followup.action === "retry-outbound") {
    const pending = retryableOutboundEntryForPrivateRouteFollowup(followup, input);
    if (pending) {
      selectTwoProfileConversationEntry(pending);
      showRetryableTwoProfileOutboundNotice(pending);
      await runTwoProfileOutboundPrimaryAction(pending);
      return true;
    }
    setProductionTwoProfileState("Retry send needs saved message");
    setText(
      fields.productionTwoProfileWarning,
      currentLanguage === "ko"
        ? "주소는 저장됐지만 선택했던 전송 대기 메시지를 찾을 수 없습니다. 대화에서 다시 보낼 메시지를 선택하세요."
        : "The address was saved, but the selected pending send is no longer available. Choose the message to retry from the conversation.",
    );
    setChatDeliveryNoticeByKey("sendFailedGeneric", "warning", input);
    return true;
  }
  if (followup.action === "receive") {
    await startProductionTwoProfileOnionReceive();
    return true;
  }
  if (followup.action === "send-draft") {
    if (followup.messageFingerprint === twoProfileInputFingerprint(input) && String(input.message ?? "").trim()) {
      await runProductionTwoProfileMessageRoundtrip();
      return true;
    }
    setProductionTwoProfileState("Draft send needs review");
    setText(
      fields.productionTwoProfileWarning,
      currentLanguage === "ko"
        ? "전송 경로는 준비됐지만 메시지 초안이 바뀌었습니다. 현재 메시지를 확인한 뒤 다시 보내세요."
        : "The delivery route is ready, but the message draft changed. Review the current message before sending.",
    );
    setChatDeliveryNoticeByKey("privateDeliveryRouteReady", "success", input);
    fields.productionTwoProfileMessage?.focus?.({ preventScroll: true });
    return true;
  }
  return false;
}

function retryableOutboundEntryForPrivateRouteFollowup(followup, input = productionTwoProfileInput()) {
  const messageNumber = Number.parseInt(followup?.retryMessageNumber, 10);
  if (!Number.isInteger(messageNumber) || messageNumber < 1) {
    return null;
  }
  const roomFingerprint = twoProfileSessionStatusFingerprint(input);
  const sender = String(followup?.retrySender ?? input.profileA ?? "").trim().toLowerCase();
  const receiver = String(followup?.retryReceiver ?? input.profileB ?? "").trim().toLowerCase();
  const message = String(followup?.retryMessage ?? "").trim();
  return (
    [...productionTwoProfileConversationEntries.values()].find(
      (entry) =>
        String(entry?.roomFingerprint ?? "").trim() === roomFingerprint &&
        String(entry?.sender ?? "").trim().toLowerCase() === sender &&
        String(entry?.receiver ?? "").trim().toLowerCase() === receiver &&
        Number.parseInt(entry?.messageNumber, 10) === messageNumber &&
        (!message || String(entry?.message ?? "").trim() === message) &&
        twoProfileConversationOutboundRetryable(entry),
    ) ?? null
  );
}

function showPrivateRouteRetryFollowupPrompt(input = productionTwoProfileInput(), options = {}) {
  if (pendingPrivateRouteFollowup?.action !== "retry-outbound" || !privateRouteFollowupMatchesRoom(input)) {
    return false;
  }
  const pending = retryableOutboundEntryForPrivateRouteFollowup(pendingPrivateRouteFollowup, input);
  if (!pending) {
    return false;
  }
  const shown = showExactRetryableOutboundPrompt(pending, input);
  if (shown && options.clear === true) {
    clearPrivateRouteFollowup();
  }
  return shown;
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
  return localizedTtlLabel(ttlSeconds);
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
          ? t("retentionPolicyUnavailable")
          : t("retentionPolicyLoading");
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
  if (productionMessageRetentionPolicyLoadPromise) {
    return productionMessageRetentionPolicyLoadPromise;
  }
  productionMessageRetentionPolicyLoadPromise = loadProductionMessageRetentionPolicyOnce();
  try {
    await productionMessageRetentionPolicyLoadPromise;
  } finally {
    productionMessageRetentionPolicyLoadPromise = null;
  }
}

async function loadProductionMessageRetentionPolicyOnce() {
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
    return currentLanguage === "ko"
      ? "상태: 초대 코드를 만들거나 붙여넣으세요"
      : "Status: create or paste an invite code";
  }
  if (input.profileA === input.profileB) {
    return currentLanguage === "ko"
      ? "전송 불가: 초대 코드를 다시 확인하세요"
      : "Blocked: verify the invite code";
  }
  return currentLanguage === "ko"
    ? "상태: 초대 코드 준비됨"
    : "Status: invite code ready";
}

function twoProfileComposePrompt(input = productionTwoProfileInput()) {
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return currentLanguage === "ko"
      ? "초대 코드를 먼저 만들거나 붙여넣으세요"
      : "Create or paste an invite code first";
  }
  const selectedReplyTarget = selectedTwoProfileDeliveredReplyTarget(input);
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  const sessionsReady = twoProfileSessionsReadyForInput(input);
  const safetyConfirmed = sessionsReady && twoProfileSafetyConfirmedForInput(input);
  const hasRecoveredConversation = Boolean(latestTwoProfileConversationEntry());
  if (!sessionsReady && !sessionStatus && hasRecoveredConversation) {
    return currentLanguage === "ko" ? "먼저 복구된 연결을 확인하세요" : "Check recovered sessions before writing";
  }
  if (!sessionsReady && sessionStatus) {
    return currentLanguage === "ko" ? "방을 다시 연 뒤 메시지를 작성하세요" : "Reopen the room before writing";
  }
  if (!sessionsReady) {
    return currentLanguage === "ko"
      ? "초대 코드로 방에 들어간 뒤 메시지를 작성하세요"
      : "Join the room with the invite code before writing";
  }
  if (!safetyConfirmed) {
    return currentLanguage === "ko"
      ? "확인 문구를 비교한 뒤 메시지를 작성하세요"
      : "Compare the verification phrase before writing";
  }
  if (selectedReplyTarget) {
    return currentLanguage === "ko"
      ? `#${selectedReplyTarget.messageNumber}에 답장: ${input.profileA} -> ${input.profileB}`
      : `Reply to message #${selectedReplyTarget.messageNumber} from ${input.profileA} to ${input.profileB}`;
  }
  if (latestTwoProfileSuccessMatchesOppositeDirection(input)) {
    return currentLanguage === "ko" ? "답장 작성" : "Write a reply";
  }
  if (latestTwoProfileSuccessMatchesDirection(input)) {
    return currentLanguage === "ko" ? "메시지 작성" : "Write a message";
  }
  if (safetyConfirmed) {
    return t("readyMessagePlaceholder");
  }
  return currentLanguage === "ko" ? "메시지 작성" : "Write a message";
}

function twoProfileRecoveryMessage(action, error, input = productionTwoProfileInput(), options = {}) {
  const detail = String(error ?? "").trim();
  const suffix = options.includeDetail && detail ? ` ${t("boundaryDetailPrefix")}: ${detail}` : "";
  if (!input.profileA || !input.profileB || input.profileA === input.profileB) {
    return t("recoveryNeedProfiles");
  }
  if (!input.passphrase) {
    return t("recoveryNeedPassphrase");
  }
  if (isInviteRoomNotOpenError(error)) {
    return t("recoveryInviteRoomNotOpen");
  }
  if (action === "session-status") {
    return `${t("recoverySessionStatus")}${suffix}`;
  }
  if (action === "stored-message") {
    return `${t("recoveryStoredMessage")}${suffix}`;
  }
  if (action === "roundtrip") {
    return `${t("recoveryRoundtrip")}${suffix}`;
  }
  if (action === "real-onion-roundtrip") {
    return `${t("recoveryRealOnion")}${suffix}`;
  }
  return `${t("recoveryGeneric")}${suffix}`;
}

function isInviteRoomNotOpenError(error) {
  return /invite code is not open/i.test(String(error ?? ""));
}

function twoProfileSessionRebuildMessage(input = productionTwoProfileInput()) {
  if (currentLanguage === "ko") {
    return input.message
      ? "채팅방 상태가 불완전합니다. 초대 코드를 다시 확인하세요."
      : "채팅방 상태가 불완전합니다. 초대 코드를 다시 확인한 뒤 메시지를 작성하세요.";
  }
  return input.message
    ? "Room state is incomplete. Check the invite code again."
    : "Room state is incomplete. Check the invite code again, then write a message.";
}

function renderProductionTwoProfileDirection(input = productionTwoProfileInput()) {
  setText(fields.productionTwoProfileDirection, twoProfileDirectionLabel(input));
  if (!fields.productionTwoProfileMessage) {
    return;
  }
  fields.productionTwoProfileMessage.placeholder = "";
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
  const draftSaved = Boolean(latestProductionSessionStateForInput(input)?.session_draft_present);

  setProductionPairingFlowStep(
    fields.productionPairingStepExport,
    fields.productionPairingStepExportDetail,
    hasLocalPayload ? "complete" : hasProfile && hasEndpoint ? "running" : "pending",
    hasLocalPayload
      ? "Local pairing payload is ready."
      : hasProfile && hasEndpoint
        ? "Export the local pairing payload."
        : "Unlock profile and set an onion endpoint.",
  );
  setProductionPairingFlowStep(
    fields.productionPairingStepRemote,
    fields.productionPairingStepRemoteDetail,
    hasRemotePayload ? "complete" : hasLocalPayload ? "running" : "pending",
    hasRemotePayload
      ? "Remote pairing payload is loaded."
      : hasLocalPayload
        ? "Paste or load the remote pairing payload."
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
  const lastSuccess = latestTwoProfileSuccessForInput(input);
  const lastSuccessDirection = latestTwoProfileSuccessMatchesDirection(input);
  const lastSuccessOppositeDirection = latestTwoProfileSuccessMatchesOppositeDirection(input);
  const selectedReplyTarget = selectedTwoProfileDeliveredReplyTarget(input);
  const sessionsReady = twoProfileSessionsReadyForInput(input);

  if (!profilesReady) {
    setTwoProfileFlowStep(
      fields.productionTwoProfileStepSession,
      fields.productionTwoProfileStepSessionDetail,
      "running",
      currentLanguage === "ko"
        ? "연결 코드를 입력하세요."
        : "Enter a connection code.",
    );
  } else if (!input.passphrase) {
    setTwoProfileFlowStep(
      fields.productionTwoProfileStepSession,
      fields.productionTwoProfileStepSessionDetail,
      "running",
      currentLanguage === "ko"
        ? "연결 코드를 입력하세요."
        : "Enter a connection code.",
    );
  } else if (sessionsReady) {
    setTwoProfileFlowStep(
      fields.productionTwoProfileStepSession,
      fields.productionTwoProfileStepSessionDetail,
      "complete",
      currentLanguage === "ko"
        ? "채팅방이 준비됐습니다."
        : "Room is ready.",
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
      currentLanguage === "ko"
        ? hasMessage
          ? "채팅방을 확인하거나 먼저 상태를 확인하세요."
          : "연결을 확인하거나 첫 메시지를 작성하세요."
        : hasMessage
          ? "Check the room before sending."
          : "Check the room, or write a first message.",
    );
  }

  setTwoProfileFlowStep(
    fields.productionTwoProfileStepCompose,
    fields.productionTwoProfileStepComposeDetail,
    !authReady ? "pending" : hasMessage ? "complete" : "running",
    !authReady
      ? currentLanguage === "ko"
        ? "연결 코드를 기다리는 중입니다."
        : "Waiting for a connection code."
      : hasMessage
        ? currentLanguage === "ko"
          ? `작성됨: ${input.message.length}자`
          : `Draft ready: ${input.message.length} chars.`
        : `${twoProfileComposePrompt(input)}.`,
  );

  const sendRunning = productionBusyActionIsForInput("two-profile-message-roundtrip", input);
  const sendReady = hasMessage && sessionsReady;
  const sendComplete = Boolean(lastSuccessDirection && !hasMessage);
  setTwoProfileFlowStep(
    fields.productionTwoProfileStepSend,
    fields.productionTwoProfileStepSendDetail,
    sendRunning || sendReady ? "running" : sendComplete ? "complete" : "pending",
    sendRunning
      ? currentLanguage === "ko"
        ? "메시지를 보내는 중입니다."
        : "Sending message."
      : sendComplete
        ? currentLanguage === "ko"
          ? `${lastSuccess.messageLength}자를 보냈고 입력창을 비웠습니다.`
          : `Sent ${lastSuccess.messageLength} chars; compose buffer cleared.`
        : sendReady
          ? selectedReplyTarget
            ? currentLanguage === "ko"
              ? `#${selectedReplyTarget.messageNumber}에 답장을 보냅니다.`
              : `Send reply to message #${selectedReplyTarget.messageNumber}.`
            : currentLanguage === "ko"
              ? "메시지를 보냅니다."
              : "Send message."
          : currentLanguage === "ko"
            ? "채팅방 준비와 메시지 작성을 기다리는 중입니다."
            : "Waiting for a ready room and message.",
  );

  setTwoProfileFlowStep(
    fields.productionTwoProfileStepReply,
    fields.productionTwoProfileStepReplyDetail,
    selectedReplyTarget || lastSuccessOppositeDirection ? "running" : lastSuccess ? "complete" : "pending",
    selectedReplyTarget
      ? currentLanguage === "ko"
        ? `답장 대상 선택됨: #${selectedReplyTarget.messageNumber}`
        : `Reply target selected: message #${selectedReplyTarget.messageNumber}.`
      : lastSuccessOppositeDirection
      ? currentLanguage === "ko"
        ? "답장을 작성할 수 있습니다."
        : "Ready to write a reply."
      : lastSuccess
        ? currentLanguage === "ko"
          ? "이 채팅방에서 계속 작성하세요."
          : "Keep writing in this room."
        : currentLanguage === "ko"
          ? "먼저 메시지를 하나 보내세요."
          : "Complete one sent message first.",
  );
}

function twoProfilePrimaryReadiness(input, busy, sessionsReady, hasMessageRetentionPolicy = true) {
  const sessionStatus = latestTwoProfileSessionStatusForCurrentInput(input);
  if (busy) {
    return {
      message: currentLanguage === "ko" ? "작업 중" : "Working",
      state: "blocked",
    };
  }
  if (!hasMessageRetentionPolicy) {
    return { message: messageRetentionPolicyBlocker(), state: "blocked" };
  }
  if (!input.profileA) {
    return { message: currentLanguage === "ko" ? "초대 코드 필요" : "Invite code needed", state: "blocked" };
  }
  if (!input.profileB) {
    return { message: currentLanguage === "ko" ? "초대 코드 필요" : "Invite code needed", state: "blocked" };
  }
  if (input.profileA === input.profileB) {
    return {
      message: currentLanguage === "ko" ? "상대 연결을 다르게 입력" : "Use a distinct peer connection",
      state: "blocked",
    };
  }
  if (!input.passphrase) {
    return { message: currentLanguage === "ko" ? "초대 코드 필요" : "Invite code needed", state: "blocked" };
  }
  if (!input.messageTtlSeconds) {
    return { message: messageTtlInputBlocker(), state: "blocked" };
  }
  if (!sessionsReady) {
    return {
      message: sessionStatus
        ? currentLanguage === "ko"
          ? "연결 재설정 필요"
          : "Rebuild connection"
        : currentLanguage === "ko"
          ? "초대 코드 확인 가능"
          : "Ready to check invite code",
      state: "setup",
    };
  }
  if (sessionsReady && !twoProfileSafetyConfirmedForInput(input)) {
    return { message: t("phraseNotConfirmed"), state: "blocked" };
  }
  if (!input.message) {
    const selectedReplyTarget = selectedTwoProfileDeliveredReplyTarget(input);
    return {
      message: sessionsReady
        ? selectedReplyTarget
          ? currentLanguage === "ko"
            ? `#${selectedReplyTarget.messageNumber} 답장 작성`
            : `Reply to #${selectedReplyTarget.messageNumber}`
          : currentLanguage === "ko"
            ? "메시지 작성"
            : "Write a message"
        : currentLanguage === "ko"
          ? "메시지 작성"
          : "Write a message",
      state: "compose",
    };
  }
  if (sessionsReady) {
    if (!manualNetworkPermissionEnabled()) {
      return {
        message: t("deliveryNeedsNetworkPermission"),
        state: "blocked",
      };
    }
    if (!twoProfilePeerEndpointState(input).ready) {
      return {
        message: t("deliveryNeedsRoute"),
        state: "blocked",
      };
    }
    return {
      message: currentLanguage === "ko"
        ? "보낼 수 있음"
        : "Ready to send",
      state: "ready",
    };
  }
  return { message: currentLanguage === "ko" ? "보낼 수 있음" : "Ready to send", state: "ready" };
}

function twoProfileComposerPrimaryIntent({
  input = productionTwoProfileInput(),
  busy = productionBusyActionBlocksInput(input),
  sessionsReady = twoProfileSessionsReadyForInput(input),
  safetyConfirmed = twoProfileSafetyConfirmedForInput(input),
  manualNetworkPermission = manualNetworkPermissionEnabled(),
  peerEndpointState = twoProfilePeerEndpointState(input),
} = {}) {
  const needsReceiveStart = Boolean(
    receiveIntentForRoom(input) &&
      !input.message &&
      !productionTwoProfileOnionReceiveMode.enabled &&
      !productionTwoProfileOnionReceiveMode.stopRequested &&
      !productionTwoProfileReceiveActiveInOtherRoom(input),
  );
  const needsReceiveBeforeSend = Boolean(
    input.message &&
      !productionTwoProfileReceiveMatchesInput(input) &&
      !productionTwoProfileOnionReceiveMode.stopRequested &&
      !productionTwoProfileReceiveActiveInOtherRoom(input),
  );
  if (busy || !sessionsReady || (!input.message && !needsReceiveStart)) {
    return {
      action: "send",
      labelKey: "roomActionSend",
      disabledReason: "",
    };
  }
  if (!safetyConfirmed) {
    return {
      action: "verify",
      labelKey: "comparePhraseAction",
      disabledReason: t("sendLockedUntilVerified"),
    };
  }
  if (!manualNetworkPermission) {
    return {
      action: "enable-private-delivery",
      labelKey: "enablePrivateDelivery",
      disabledReason: t("deliveryNeedsNetworkPermission"),
    };
  }
  const routeReadiness = externalPeerSendReadiness(input, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  if (routeReadinessReceiveRuntimeMismatch(routeReadiness)) {
    return {
      action: "stop-receiving",
      labelKey: "stopReceiving",
      disabledReason: routeReadiness.disabledReason || t("receiveRuntimeMismatch"),
    };
  }
  if (routeReadinessReceiveStopPending(routeReadiness)) {
    return {
      action: "wait-receive-stop",
      labelKey: "receiveStopPending",
      disabledReason: t("receiveStopPending"),
    };
  }
  if ((needsReceiveStart || needsReceiveBeforeSend) || routeReadiness.nextAction === "start-receiving") {
    return {
      action: "start-receiving",
      labelKey: "startReceiving",
      disabledReason: routeReadiness.disabledReason || t("externalSendNeedsReceive"),
    };
  }
  if (routeReadiness.nextAction === "refresh-endpoint") {
    const stale = routeReadiness.peerEndpointState?.stale === true || peerEndpointState.stale === true;
    return {
      action: stale ? "refresh-endpoint" : "prepare-private-route",
      labelKey: stale ? "refreshAndRetry" : "preparePrivateRoute",
      disabledReason: routeReadiness.disabledReason || t("deliveryNeedsRoute"),
    };
  }
  if (!routeReadiness.ready) {
    return {
      action: "prepare-private-route",
      labelKey: "preparePrivateRoute",
      disabledReason: routeReadiness.disabledReason || t("deliveryNeedsRoute"),
    };
  }
  return {
    action: "send",
    labelKey: "roomActionSend",
    disabledReason: "",
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
  const latestSuccess = latestTwoProfileSuccessForInput(input);

  if (!latestSuccess) {
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
    twoProfileInputFingerprint(input) === latestSuccess.fingerprint;
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
    `${latestSuccess.profileA} -> ${latestSuccess.profileB} | message_chars=${latestSuccess.messageLength}`,
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
  if (!storeProductionPayloadSlotRecord(kind, profile, value)) {
    setProductionPairingState(`${label} store needs active room`);
    setText(fields.productionPairingWarning, `Open the active room before storing a local ${payloadLabel(label)} slot.`);
    return;
  }
  setProductionPairingState(`${label} stored`);
  setText(fields.productionPairingWarning, `Stored local ${payloadLabel(label)} slot for ${profile}.`);
  applyProductionActionState();
}

function loadProductionPayloadSlot(kind, targetField, label) {
  const profile = activeProductionProfileName();
  const counterpart = productionCounterpartProfile(profile);
  const value = productionPayloadSlotValue(kind, counterpart);
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
  if (!storeProductionPayloadSlotRecord(kind, profile, value)) {
    setProductionPairingState(`${label} relay needs active room`);
    setText(fields.productionPairingWarning, `Open the active room before relaying a local ${payloadLabel(label)}.`);
    return;
  }
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
  const { counterpart, entry, slot, value } = pendingMessageEnvelopeSlotForActiveProfile(profile);
  if (!entry) {
    setProductionMessageState("Remote envelope needs pending message");
    setText(
      fields.productionMessageWarning,
      counterpart
        ? `Select a pending ${counterpart} -> ${profile} message before loading an envelope slot.`
        : manualMissingCounterpartWarning(profile, counterpart, "envelope"),
    );
    return;
  }
  if (value && !messageEnvelopeSlotMatchesEntry(slot, entry)) {
    setProductionMessageState("Remote envelope slot stale");
    setText(
      fields.productionMessageWarning,
      `Stored ${counterpart} envelope does not match selected message #${entry.messageNumber}. Export that message again before importing.`,
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
  const key = counterpart ? messageEnvelopeSlotKey(counterpart) : "";
  const storedEnvelope = key ? messageEnvelopeSlotPayload(productionPayloadSlots.messageEnvelope.get(key)) : "";
  if (!counterpart || !importedEnvelope || storedEnvelope !== importedEnvelope) {
    return false;
  }
  productionPayloadSlots.messageEnvelope.delete(key);
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
  } else if (target === "verify-safety") {
    fields.confirmTwoProfileSafety?.focus();
  }
}

function focusLocalDiagnostic() {
  document.body.classList.add("is-developer-mode");
  if (fields.localDiagnosticTools) {
    fields.localDiagnosticTools.classList.add("is-revealed");
    fields.localDiagnosticTools.open = true;
  }
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

function twoProfileInviteCodeModeActive() {
  return Boolean(
    fields.productionTwoProfileB?.dataset.connectionCode &&
      fields.productionTwoProfileB?.dataset.peerProfile,
  );
}

function keepTwoProfileInviteCodeDirection(reason = "compose") {
  const input = productionTwoProfileInput();
  renderProductionTwoProfileDirection(input);
  renderProductionTwoProfileMemory(input);
  setProductionTwoProfileState(reason === "swap" ? "Room identity fixed" : "Reply ready");
  setText(
    fields.productionTwoProfileWarning,
    reason === "swap" ? t("inviteCodeDirectionFixed") : t("inviteCodeReplyFromThisDevice"),
  );
  setProductionFollowupActions(false, "");
  applyProductionActionState();
  fields.productionTwoProfileMessage?.focus();
  return true;
}

function swapTwoProfileDirection() {
  const profileA = fields.productionTwoProfileA?.value ?? "";
  const profileB = fields.productionTwoProfileB?.value ?? "";
  if (!fields.productionTwoProfileA || !fields.productionTwoProfileB || !profileA || !profileB) {
    setProductionTwoProfileState("Swap needs profiles");
    setText(fields.productionTwoProfileWarning, "Enter both profiles before swapping direction.");
    return;
  }
  if (twoProfileInviteCodeModeActive()) {
    keepTwoProfileInviteCodeDirection("swap");
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
  if (twoProfileInviteCodeModeActive()) {
    setSelectedTwoProfileConversationEntry(target);
    return keepTwoProfileInviteCodeDirection("reply");
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
  if (twoProfileInviteCodeModeActive()) {
    setSelectedTwoProfileConversationEntry(entry);
    renderProductionTwoProfileDirection(productionTwoProfileInput());
    renderProductionTwoProfileMemory(productionTwoProfileInput());
    setProductionTwoProfileState("Conversation item selected");
    setText(fields.productionTwoProfileWarning, twoProfileConversationUserActionMessage(entry));
    applyProductionActionState();
    if (focusManual) {
      fields.productionTwoProfileMessage?.focus();
    }
    return true;
  }
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
    twoProfileConversationOutboundRetryable(entry)
      ? retryableTwoProfileOutboundWarning(entry)
      : `Pending message #${entry.messageNumber} selected: ${input.profileA} -> ${input.profileB}. Manual relay/import review is prepared below.`,
  );
  if (twoProfileConversationOutboundRetryable(entry)) {
    showRetryableTwoProfileOutboundNotice(entry);
  }
  setProductionFollowupActions(true, nextAction);
  const review = applyPendingConversationToManualMessageReview(entry, { focusManual, deferFocus: true });
  if (review?.twoProfileWarning && !twoProfileConversationOutboundRetryable(entry)) {
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
  const senderEnvelopeSlotRecord = messageEnvelopeSlotRecord(entry.sender, entry.roomFingerprint);
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
    hasRetryableOutbound: Boolean(automaticVisibleTwoProfileRetryableOutboundEntry()),
    hasPendingConversation: Boolean(latestTwoProfilePendingConversationEntry()),
    hasDeliveredConversation: Boolean(latestTwoProfileDeliveredConversationEntry()),
    hasMessageDraft: Boolean(productionTwoProfileInput().message),
  });
  if (target === "retry-send" || target === "pending-review") {
    return autoSelectPendingTwoProfileConversation() ? target : null;
  }
  if (target === "reply-latest") {
    return autoSelectLatestDeliveredReply() ? target : null;
  }
  return target;
}

function twoProfileResumeWarningForTarget(target, baseWarning, staleMessageEnvelopeSlotsPruned = 0, expiredMessagesPurged = 0) {
  if (target === "retry-send") {
    const entry = automaticVisibleTwoProfileRetryableOutboundEntry();
    showRetryableTwoProfileOutboundNotice(entry);
    return retryableTwoProfileOutboundWarning(entry);
  }
  if (target === "pending-review") {
    const selected = selectedTwoProfileConversationEntry() ?? latestTwoProfilePendingConversationEntry();
    return selected
      ? currentLanguage === "ko"
        ? `메시지 #${selected.messageNumber}가 아직 완료되지 않았습니다. 대화는 저장되어 있으며 필요한 작업을 이어갈 수 있습니다.`
        : `Message #${selected.messageNumber} is still pending. The conversation is saved and ready to continue.`
      : baseWarning;
  }
  if (target === "reply-latest") {
    return appendExpiredMessagesPurged(
      appendStaleMessageEnvelopeSlotsPruned(
        "Stored conversation recovered. Latest delivered message is selected as the reply target.",
        staleMessageEnvelopeSlotsPruned,
      ),
      expiredMessagesPurged,
    );
  }
  return baseWarning;
}

function selectTwoProfileReplyDirection(sentInput) {
  const sender = String(sentInput?.profileA ?? "").trim();
  const receiver = String(sentInput?.profileB ?? "").trim();
  if (!sender || !receiver || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    return false;
  }
  if (twoProfileInviteCodeModeActive()) {
    return keepTwoProfileInviteCodeDirection("reply");
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
  if (twoProfileInviteCodeModeActive()) {
    setSelectedTwoProfileConversationEntry(entry);
    return keepTwoProfileInviteCodeDirection("reply");
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
  const sentMessage = selectTwoProfileConversationMessage(sender, receiver, messageNumber, message, { input: fallbackInput });
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
  const busy = productionBusyActionBlocksInput(twoProfile);
  const sessionReadyForMessages = productionSessionReadyForMessages();
  const hasProfileUnlockInput = Boolean(profile && passphrase);
  const hasPairingInput = Boolean(hasProfileUnlockInput && pairing.rendezvousEndpoint);
  const pairingSafetyVerified = currentPairingSafetyVerified(pairing);
  const hasSessionDraftInput = Boolean(
    hasProfileUnlockInput && pairing.localPayload && pairing.remotePayload && pairingSafetyVerified,
  );
  const hasSessionDraftSaved = Boolean(latestProductionSessionStateForInput(pairing)?.session_draft_present);
  const hasHandshakeReplyInput = Boolean(hasProfileUnlockInput && pairing.initPayload);
  const hasHandshakeFinishInput = Boolean(hasProfileUnlockInput && pairing.replyPayload);
  const hasFinishImportInput = Boolean(hasProfileUnlockInput && pairing.finishPayload);
  const hasLocalPairingPayload = Boolean(fields.productionPairingPayload?.value.trim());
  const hasRemotePairingInput = Boolean(pairing.remotePayload);
  const counterpartProfile = productionCounterpartProfile(activeProductionProfileName());
  const hasRemotePairingSlot = productionPayloadSlotReady("pairing", counterpartProfile);
  const hasHandshakeInitPayload = Boolean(fields.productionHandshakeInitPayload?.value.trim());
  const hasHandshakeReplyPayload = Boolean(fields.productionHandshakeReplyPayload?.value.trim());
  const hasHandshakeFinishPayload = Boolean(fields.productionHandshakeFinishPayload?.value.trim());
  const hasRemoteHandshakeInitSlot = productionPayloadSlotReady("handshakeInit", counterpartProfile);
  const hasRemoteHandshakeReplySlot = productionPayloadSlotReady("handshakeReply", counterpartProfile);
  const hasRemoteHandshakeFinishSlot = productionPayloadSlotReady("handshakeFinish", counterpartProfile);
  const hasLocalMessageEnvelope = Boolean(fields.productionMessageEnvelope?.value.trim());
  const hasRemoteMessageEnvelopeSlot = activeMessageEnvelopeSlotReady(activeProductionProfileName());
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
  const hasTwoProfileSetupInput = Boolean(
    twoProfile.profileA &&
      twoProfile.profileB &&
      twoProfile.profileA !== twoProfile.profileB &&
      twoProfile.passphrase &&
      twoProfile.messageTtlSeconds,
  );
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
    hasTwoProfileSetupInput,
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
  const twoProfileNeedsSetup = hasTwoProfileSetupInput && !twoProfileSessionsReady && !twoProfileNeedsSessionCheck;
  const twoProfileSafetyConfirmed = twoProfileSessionsReady && twoProfileSafetyConfirmedForInput(twoProfile);
  const twoProfileCurrentAction = productionTwoProfileCurrentAction({
    input: twoProfile,
    busy,
    sessionsReady: twoProfileSessionsReady,
    hasKnownSessionStatus: knownTwoProfileSessionStatus,
    hasRecoveredConversation: Boolean(latestConversation),
    hasMessageRetentionPolicy,
  });
  const twoProfileCanReply = Boolean(
    !busy && latestTwoProfileSuccessForInput(twoProfile) && hasTwoProfileSessionStatusInput && !twoProfile.message,
  );
  const selectedConversationDelivered = twoProfileConversationReplyable(selectedConversation);
  const inviteCodeReplyMode = twoProfileInviteCodeModeActive();
  const latestReplySelected = inviteCodeReplyMode
    ? Boolean(latestConversationDelivered)
    : Boolean(
        twoProfileConversationReplyable(latestConversation) &&
          twoProfile.profileA === latestConversation.receiver &&
          twoProfile.profileB === latestConversation.sender,
      );
  const selectedDeliveredReplyReady = inviteCodeReplyMode
    ? Boolean(selectedConversationDelivered)
    : Boolean(
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
    productionBusyActionIsForInput("two-profile-roundtrip", twoProfile) ||
    productionBusyActionIsForInput("two-profile-message-roundtrip", twoProfile) ||
    (twoProfileSessionsReady && !twoProfileSafetyConfirmed);

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
  updateConnectionWizard(twoProfile);
  renderRoomIdentityBar(twoProfile, twoProfileSessionsReady);
  renderRoomStatusSummary(twoProfile, twoProfileSessionsReady);
  renderRoomSetupProgress(twoProfile, twoProfileSessionsReady);
  renderTwoProfileSafetyConfirm(twoProfile, twoProfileSessionsReady);
  updateMinimalChatMode(twoProfile, twoProfileSessionsReady);
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
    fields.checkProductionDataLifecycle,
    busy,
    "Wait for the active production action.",
    false,
  );
  setActionButtonState(
    fields.prepareProductionDataLifecycle,
    busy,
    "Wait for the active production action.",
    false,
  );
  setActionButtonState(
    fields.deleteProductionProfile,
    busy ||
      !productionProfileInput().profile ||
      (fields.productionProfileDeleteConfirmation?.value ?? "").trim() !==
        productionProfileInput().profile,
    busy
      ? "Wait for the active production action."
      : "Type the exact profile name before deleting the profile store.",
    false,
  );
  setActionButtonState(
    fields.wipeProductionLocalData,
    busy || (fields.productionFullWipeConfirmation?.value ?? "").trim() !== "WIPE LOCAL DATA",
    busy
      ? "Wait for the active production action."
      : "Type WIPE LOCAL DATA before wiping local app data.",
    false,
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
    fields.checkProductionSessionLifecycle,
    !availability.checkSessionState,
    busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
    false,
  );
  setActionButtonState(
    fields.deleteProductionSessionLifecycle,
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
    fields.deleteProductionConversation,
    !availability.checkSessionState,
    busy ? "Wait for the active production action." : "Enter profile and passphrase first.",
    false,
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
    busy ? "Wait for the active production action." : "Create or paste an invite code first.",
    twoProfileCurrentAction === "check-session",
  );
  setActionButtonState(
    fields.checkProductionTwoProfileSessionStatusInline,
    busy || !hasTwoProfileSessionStatusInput,
    busy ? "Wait for the active production action." : "Create or paste an invite code first.",
    twoProfileCurrentAction === "check-session",
  );
  setActionButtonState(
    fields.loadProductionTwoProfileTranscript,
    busy || !hasTwoProfileSessionStatusInput,
    busy ? "Wait for the active production action." : "Create or paste an invite code first.",
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
  fields.chatTranscriptToolbar?.classList.toggle("has-pending-action", Boolean(pendingConversation));
  fields.chatTranscriptToolbar?.classList.toggle("has-selected-pending-action", pendingSelected);
  fields.chatTranscriptToolbar?.classList.toggle("has-reply-action", Boolean(replySelection.canSelect));
  fields.chatTranscriptToolbar?.classList.toggle(
    "has-conversation-action",
    Boolean(pendingConversation || replySelection.canSelect),
  );
  const receiveIntent = receiveIntentForRoom(twoProfile);
  const receivingCurrentRoom = productionTwoProfileReceiveMatchesInput(twoProfile);
  const receivingOtherRoom = productionTwoProfileReceiveActiveInOtherRoom(twoProfile);
  const receivingRuntimeMismatch = productionTwoProfileReceiveRuntimeMismatched(twoProfile);
  const retryableOutboundConversation = automaticVisibleTwoProfileRetryableOutboundEntry(twoProfile);
  clearMismatchedChatDeliveryNotice(twoProfile);
  clearMismatchedPrivateRouteFollowup(twoProfile);
  const currentRoomDeliveryNotice = chatDeliveryNoticeMatchesInput(twoProfile);
  if (
    productionTwoProfileShouldShowOutboundRecovery({
      busy,
      sessionsReady: twoProfileSessionsReady,
      hasRetryableOutbound: Boolean(retryableOutboundConversation),
    })
  ) {
    setChatDeliveryNoticeForPendingOutbound(retryableOutboundConversation, twoProfile);
  } else if (!busy && twoProfileSessionsReady && !twoProfileSafetyConfirmed) {
    setChatDeliveryNoticeByKey("sendLockedUntilVerified", "warning", twoProfile);
  } else if (
    !busy &&
    twoProfileSessionsReady &&
    twoProfileSafetyConfirmed &&
    !manualNetworkPermission
  ) {
    setChatDeliveryNoticeByKey("chatNoticeNetworkPermission", "warning", twoProfile);
  } else if (
    !busy &&
    twoProfileSessionsReady &&
    twoProfileSafetyConfirmed &&
    !twoProfilePeerEndpointState(twoProfile).ready
  ) {
    setChatDeliveryNoticeByKey(
      manualNetworkPermission ? "privateDeliveryRouteNeeded" : "chatNoticeNetworkPermission",
      manualNetworkPermission ? "muted" : "warning",
      twoProfile,
    );
  } else if (
    !busy &&
    twoProfileSessionsReady &&
    twoProfileSafetyConfirmed &&
    manualNetworkPermission &&
    twoProfilePeerEndpointState(twoProfile).ready &&
    !productionTwoProfileOnionReceiveMode.enabled &&
    !productionTwoProfileOnionReceiveMode.stopRequested
  ) {
    setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "muted", twoProfile);
  } else if (
    !busy &&
    twoProfileSafetyConfirmed &&
    currentRoomDeliveryNotice &&
    latestChatDeliveryNoticeKey === "sendLockedUntilVerified"
  ) {
    setChatDeliveryNoticeByKey("", "neutral", twoProfile);
  } else if (
    !busy &&
    !pendingConversation &&
    currentRoomDeliveryNotice &&
    (latestChatDeliveryNoticeKey === "messageSavedPrivateDeliveryOff" ||
      latestChatDeliveryNoticeKey === "privateDeliveryRouteNeeded" ||
      latestChatDeliveryNoticeKey === "chatNoticeNetworkPermission" ||
      latestChatDeliveryNoticeKey === "chatNoticeReceiveStopped")
  ) {
    setChatDeliveryNoticeByKey("", "neutral", twoProfile);
  }
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
        ? "Check recovered room before joining again."
      : twoProfileSessionsReady
        ? "Room is ready; send a message instead."
      : twoProfileSessionsIncomplete
        ? twoProfileSessionRebuildMessage(twoProfile)
        : "Create or paste an invite code first.",
    twoProfileCurrentAction === "full-setup",
  );
  setActionButtonState(
    fields.runProductionTwoProfileRoundtripInline,
    !availability.runTwoProfileRoundtrip,
    busy
      ? "Wait for the active production action."
      : !hasMessageRetentionPolicy
        ? retentionPolicyBlocker
      : twoProfileNeedsSessionCheck
        ? "Check recovered room before joining again."
      : twoProfileSessionsReady
        ? "Room is ready; send a message instead."
      : twoProfileSessionsIncomplete
        ? twoProfileSessionRebuildMessage(twoProfile)
        : "Create or paste an invite code first.",
    twoProfileCurrentAction === "full-setup",
  );
  setText(
    fields.runProductionTwoProfileRoundtrip,
    twoProfileNeedsSessionCheck ? t("roomActionResume") : t("createConnection"),
  );
  setText(
    fields.runProductionTwoProfileRoundtripInline,
    twoProfileNeedsSessionCheck ? t("roomActionResume") : t("createConnection"),
  );
  const peerEndpointState = twoProfilePeerEndpointState(twoProfile);
  const composerPrimaryIntent = twoProfileComposerPrimaryIntent({
    input: twoProfile,
    busy,
    sessionsReady: twoProfileSessionsReady,
    safetyConfirmed: twoProfileSafetyConfirmed,
    manualNetworkPermission,
    peerEndpointState,
  });
  const composerPrimaryAvailableWithoutDraft = composerPrimaryIntent.action !== "send";
  const composerPrimaryWaitingForReceiveStop = composerPrimaryIntent.action === "wait-receive-stop";
  setActionButtonState(
    fields.runProductionTwoProfileMessageRoundtrip,
    composerPrimaryAvailableWithoutDraft
      ? busy || !hasMessageRetentionPolicy || composerPrimaryWaitingForReceiveStop
      : !availability.runTwoProfileMessageRoundtrip,
    busy
      ? "Wait for the active production action."
      : !hasMessageRetentionPolicy
        ? retentionPolicyBlocker
      : composerPrimaryWaitingForReceiveStop
        ? composerPrimaryIntent.disabledReason
      : composerPrimaryIntent.action === "start-receiving"
        ? t("receiveIntentRestartReady")
      : composerPrimaryIntent.action !== "send"
        ? composerPrimaryIntent.disabledReason
      : twoProfileSessionsReady && !twoProfileSafetyConfirmed
        ? t("sendLockedUntilVerified")
      : selectedDeliveredReplyReady && twoProfileReplyDraftReady
        ? `Send reply to selected message #${selectedConversation.messageNumber}.`
      : latestReplySelected && twoProfileReplyDraftReady
        ? "Send reply to the latest delivered message."
      : twoProfileSessionsReady && twoProfileSafetyConfirmed && !twoProfile.message
        ? t("writeMessageBeforeSending")
      : hasTwoProfileInput
        ? "Check the room before sending."
        : "Create or paste an invite code, then write a message.",
    manualPrimaryActions.sendReply ||
      (!state.hasTwoProfileReplySelected && twoProfileCurrentAction === "stored-message"),
  );
  setText(fields.runProductionTwoProfileMessageRoundtrip, t(composerPrimaryIntent.labelKey));
  if (fields.runProductionTwoProfileMessageRoundtrip && composerPrimaryIntent.action !== "send") {
    fields.runProductionTwoProfileMessageRoundtrip.title = composerPrimaryIntent.disabledReason;
  }
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
        ? "Create or paste an invite code first."
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
        ? "Create or paste an invite code first."
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
        ? "Create or paste an invite code first."
      : !latestTwoProfileSessionStatusForCurrentInput(twoProfile)
        ? "Check or save onion sessions before refreshing peer endpoints."
        : "Launch fresh local endpoints and apply them to existing peer session records.",
    false,
  );
  const storedEndpointTransportState = storedPeerEndpointTransportState(twoProfile);
  const latestTwoProfileSuccess = latestTwoProfileSuccessForInput(twoProfile);
  setActionButtonState(
    fields.sendProductionTwoProfileEndpointUpdate,
    busy ||
      !manualNetworkPermission ||
      !hasTwoProfileSessionStatusInput ||
      !twoProfileSessionsReady ||
      !storedEndpointTransportState.ready ||
      !latestTwoProfileLocalOnionEndpoint(twoProfile) ||
      !latestTwoProfileSuccess ||
      latestTwoProfileSuccess.profileA !== twoProfile.profileA ||
      latestTwoProfileSuccess.profileB !== twoProfile.profileB,
    busy
      ? "Wait for the active production action."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before sending an endpoint update over onion."
      : !hasTwoProfileSessionStatusInput
        ? "Create or paste an invite code first."
      : !twoProfileSessionsReady
        ? "Complete the verified session handshake first."
      : !storedEndpointTransportState.ready
        ? `Stored peer endpoint blocked: ${storedEndpointTransportState.reason}.`
      : !latestTwoProfileLocalOnionEndpoint(twoProfile)
        ? "Refresh or prepare onion endpoints first."
      : !latestTwoProfileSuccess ||
          latestTwoProfileSuccess.profileA !== twoProfile.profileA ||
          latestTwoProfileSuccess.profileB !== twoProfile.profileB
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
        ? "Create or paste an invite code first."
        : "Complete Alice/Bob local handshake and persist transport state.",
    false,
  );
  const latestOnionOutbound = latestTwoProfileOutboundOnionMessage(twoProfile);
  const externalSendReadiness = externalPeerSendReadiness(twoProfile, {
    latestOnionOutbound,
  });
  const routePreparationReady = Boolean(
    hasTwoProfileSessionStatusInput &&
      twoProfileSessionsReady &&
      twoProfileSafetyConfirmed &&
      !peerEndpointState.ready,
  );
  const routeRecoveryReady = Boolean(
    hasTwoProfileSessionStatusInput &&
      twoProfileSessionsReady &&
      twoProfileSafetyConfirmed &&
      privateRouteRecoveryNoticeActive(),
  );
  setActionButtonState(
    fields.preparePrivateRoute,
    busy || !(routePreparationReady || routeRecoveryReady) || !manualNetworkPermission,
    busy
      ? "Wait for the active production action."
      : !twoProfileSessionsReady
        ? "Join the room before preparing the private route."
      : !twoProfileSafetyConfirmed
        ? t("sendLockedUntilVerified")
      : !manualNetworkPermission
        ? t("privateDeliveryPermissionRequired")
      : routeRecoveryReady
        ? t("sendRuntimeMismatch")
      : peerEndpointState.ready
        ? "Private route is ready."
        : "Prepare local and peer address records after your explicit action.",
    (routePreparationReady || routeRecoveryReady) && manualNetworkPermission,
  );
  if (fields.privateRouteExchange) {
    const showRouteExchange =
      (routePreparationReady || routeRecoveryReady) &&
      manualNetworkPermission &&
      (twoProfileInviteCodeModeActive() || document.body.classList.contains("shows-private-route-exchange"));
    fields.privateRouteExchange.hidden = !showRouteExchange;
  }
  renderPrivateRouteExchangeState(twoProfile, { forceRefresh: routeRecoveryReady });
  setActionButtonState(
    fields.copyPrivateRouteCode,
    busy || !currentActiveLocalPrivateRouteCode(twoProfile),
    busy
      ? "Wait for the active production action."
      : !latestLocalPrivateRouteCode
        ? t("privateRouteCodeNotReady")
      : currentActiveLocalPrivateRouteCode(twoProfile)
        ? t("copyPrivateRouteCode")
        : t("privateRouteLocalStatusSaved"),
  );
  setActionButtonState(
    fields.applyPeerPrivateRouteCode,
    busy || !(routePreparationReady || routeRecoveryReady) || !manualNetworkPermission || !(fields.peerPrivateRouteCode?.value ?? "").trim(),
    busy
      ? "Wait for the active production action."
      : !(routePreparationReady || routeRecoveryReady)
        ? t("refreshAddressNeedsReadyRoom")
      : !manualNetworkPermission
        ? t("privateDeliveryPermissionRequired")
        : !(fields.peerPrivateRouteCode?.value ?? "").trim()
          ? t("peerPrivateRouteCodeMissing")
          : t("applyPeerPrivateRouteCode"),
  );
  setFlowActionPriority(routeExchangePrimaryActionNode(twoProfile), [
    fields.preparePrivateRoute,
    fields.copyPrivateRouteCode,
    fields.applyPeerPrivateRouteCode,
  ]);
  setActionButtonState(
    fields.sendProductionTwoProfileLatestOnionEnvelope,
    busy || !latestOnionOutbound || !externalSendReadiness.ready,
    busy
      ? "Wait for the active production action."
      : !latestOnionOutbound
        ? "Send a stored-session message after preparing onion pairing endpoints first."
      : !externalSendReadiness.ready
        ? externalSendReadiness.disabledReason
        : `Attempt external onion send for message #${latestOnionOutbound.messageNumber}.`,
    false,
  );
  setActionButtonState(
    fields.startProductionTwoProfileOnionReceive,
    busy ||
      receivingCurrentRoom ||
      receivingOtherRoom ||
      !manualNetworkPermission ||
      !hasTwoProfileSessionStatusInput ||
      !twoProfileSessionsReady ||
      !twoProfileSafetyConfirmed,
    busy
      ? "Wait for the active production action."
      : receivingCurrentRoom && productionTwoProfileOnionReceiveMode.stopRequested
        ? t("receiveStopPending")
      : receivingRuntimeMismatch
        ? t("receiveRuntimeMismatch")
      : receivingCurrentRoom
        ? t("receiveAlreadyListening")
      : receivingOtherRoom
        ? t("receiveOtherRoomActive")
      : !manualNetworkPermission
        ? t("receivePermissionRequired")
      : !hasTwoProfileSessionStatusInput
        ? t("receiveNeedsRoom")
      : !twoProfileSessionsReady
        ? t("receiveNeedsReadyRoom")
      : !twoProfileSafetyConfirmed
        ? t("receiveNeedsVerification")
        : t("startReceiving"),
    (receiveIntent || Boolean(twoProfile.message)) && !receivingCurrentRoom && !receivingOtherRoom,
  );
  setActionButtonState(
    fields.stopProductionTwoProfileOnionReceive,
    !receivingCurrentRoom || productionTwoProfileOnionReceiveMode.stopRequested,
    receivingCurrentRoom && productionTwoProfileOnionReceiveMode.stopRequested
      ? t("receiveStopPending")
      : receivingRuntimeMismatch
        ? t("receiveRuntimeMismatchStop")
      : receivingCurrentRoom
      ? t("stopReceiving")
      : receivingOtherRoom
        ? t("receiveOtherRoomActive")
        : t("receiveStopped"),
    false,
  );
  setActionButtonState(
    fields.openPrivateDeliverySettings,
    busy || manualNetworkPermission || !hasTwoProfileSessionStatusInput || !twoProfileSessionsReady || !twoProfileSafetyConfirmed,
    busy
      ? "Wait for the active production action."
      : manualNetworkPermission
        ? t("privateDelivery")
      : !hasTwoProfileSessionStatusInput
        ? t("receiveNeedsRoom")
      : !twoProfileSessionsReady
        ? t("receiveNeedsReadyRoom")
      : !twoProfileSafetyConfirmed
        ? t("receiveNeedsVerification")
        : t("privateDeliveryPermissionRequired"),
    false,
  );
  const realOnionRecovery = latestRealOnionRecoveryForInput(twoProfile);
  const realOnionWaitCanceled = realOnionWaitCanceledForInput(twoProfile);
  const realOnionRoundtripActive = realOnionRoundtripActiveForInput(twoProfile);
  const realOnionRunAction = realOnionRecoveryRunAction(realOnionRecovery);
  const realOnionRouteReadiness = externalPeerSendReadiness(twoProfile, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  const realOnionRunBypassesRouteReadiness =
    realOnionRunAction.opensNetworkSettings === true ||
    realOnionRunAction.inspectDiagnostics === true;
  const realOnionRouteBlocked = !realOnionRunBypassesRouteReadiness && !realOnionRouteReadiness.ready;
  const realOnionMissingMessage =
    !realOnionRunBypassesRouteReadiness &&
    Boolean(twoProfile.profileA && twoProfile.profileB && twoProfile.profileA !== twoProfile.profileB && twoProfile.passphrase) &&
    (!twoProfile.message || !twoProfile.messageTtlSeconds);
  const realOnionCancelWaitReady =
    realOnionRoundtripActive ||
    (realOnionRecovery.action === "retry-bootstrap" &&
      realOnionRecovery.waitCancellable === true &&
      !realOnionWaitCanceled);
  const realOnionRunLabel = fields.runProductionTwoProfileRealOnionRoundtrip?.querySelector("[data-i18n]");
  if (realOnionRunLabel) {
    setText(
      realOnionRunLabel,
      realOnionMissingMessage && !twoProfile.message
        ? t("writeMessageBeforeSending")
        : t(realOnionRunAction.ready ? realOnionRunAction.labelKey : "runRealOnionRoundtrip"),
    );
  }
  setActionButtonState(
    fields.runProductionTwoProfileRealOnionRoundtrip,
    busy ||
      !hasTwoProfileInput ||
      !hasMessageRetentionPolicy ||
      !manualNetworkPermission ||
      realOnionMissingMessage ||
      realOnionRouteBlocked,
    busy
      ? "Wait for the active production action."
      : !manualNetworkPermission
        ? "Enable manual onion network permission before running real onion roundtrip."
      : !hasMessageRetentionPolicy
        ? retentionPolicyBlocker
      : realOnionMissingMessage
        ? !twoProfile.message
          ? t("writeMessageBeforeSending")
          : messageTtlInputBlocker()
      : realOnionRouteBlocked
        ? realOnionRouteReadiness.disabledReason
      : realOnionRunAction.ready
        ? t(realOnionRunAction.noticeKey || realOnionRunAction.labelKey)
      : "Enter two profiles, passphrase, and message first.",
    twoProfileCurrentAction === "real-onion-roundtrip",
  );
  if (fields.cancelProductionTwoProfileRealOnionWait) {
    fields.cancelProductionTwoProfileRealOnionWait.hidden = !realOnionCancelWaitReady;
  }
  setActionButtonState(
    fields.cancelProductionTwoProfileRealOnionWait,
    (busy && !realOnionRoundtripActive) || !realOnionCancelWaitReady,
    busy && !realOnionRoundtripActive
      ? "Wait for the active production action."
      : realOnionWaitCanceled
        ? t("networkWaitCanceled")
        : t("cancelNetworkWait"),
    false,
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
  updateProductionOnionBridgeConfigControls();
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
  latestProductionTwoProfileSafety = null;
  setProductionTwoProfileState(t("twoProfileIdle"));
  setText(fields.productionTwoProfileWarning, t("twoProfileNotRun"));
  setText(fields.productionTwoProfileProfiles, t("notCheckedYet"));
  setText(fields.productionTwoProfileSession, t("notCheckedYet"));
  setText(fields.productionTwoProfileMessageState, t("notCheckedYet"));
  setText(fields.productionTwoProfileBoundary, t("notCheckedYet"));
  resetProductionTwoProfileTranscript();
  renderProductionTwoProfileMemory();
  updateMinimalChatMode(productionTwoProfileInput(), false);
  setProductionFollowupActions(false, t("followupLocked"));
  applyProductionActionState();
}

function resetProductionProfileView() {
  setProductionProfileState("Profile locked");
  setText(fields.productionProfileWarning, "Production profile has not been unlocked yet.");
  setText(fields.productionProductUnlockState, "Not checked yet");
  setText(fields.productionProfileStorage, "Not checked yet");
  setText(fields.productionProfileIdentity, "Not checked yet");
  setText(fields.productionProfileBoundary, "Not checked yet");
  setText(fields.productionDataLifecycle, "Not checked yet");
  if (fields.lockProductionProfile) {
    fields.lockProductionProfile.disabled = true;
  }
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
  if (twoProfileInviteCodeModeActive()) {
    applyProductionActionState();
    return;
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
  rememberProductionSessionState(productionProfileInput(), null);
  if (!options.preserveTwoProfileStatus) {
    latestProductionTwoProfileSessionStatus = null;
  }
  setProductionPairingState("Pairing payload idle");
  setText(fields.productionPairingWarning, t("pairingNotExported"));
  if (fields.productionPairingPayload) {
    fields.productionPairingPayload.value = "";
  }
  resetProductionPairingSafety();
  clearAllManualRemotePayloadInputs();
  setHandshakePayload(fields.productionHandshakeInitPayload, "");
  setHandshakePayload(fields.productionHandshakeReplyPayload, "");
  setHandshakePayload(fields.productionHandshakeFinishPayload, "");
  setText(fields.productionPairingStorage, t("notCheckedYet"));
  setText(fields.productionPairingSession, t("notCheckedYet"));
  setText(fields.productionHandshakeState, t("notCheckedYet"));
  setText(fields.productionSessionLifecycle, t("notCheckedYet"));
  setText(fields.productionPairingBoundary, t("notCheckedYet"));
  applyProductionActionState();
}

function resetProductionMessageView() {
  resetProductionMessageImportState();
  resetProductionMessageTranscript();
  setProductionMessageState("Message flow idle");
  setText(fields.productionMessageWarning, t("messageEnvelopeNotExported"));
  if (fields.productionMessageEnvelope) {
    fields.productionMessageEnvelope.value = "";
  }
  setText(fields.productionMessageActiveStatus, t("notCheckedYet"));
  setText(
    fields.productionMessageManualCheck,
    currentLanguage === "ko"
      ? "수동 확인: 현재 프로필, 메시지 번호, 메시지 출처를 확인하세요."
      : "Manual check: verify active profile, message number, and envelope source.",
  );
  setText(fields.productionMessageOutbound, t("notCheckedYet"));
  setText(fields.productionMessageInbound, t("notCheckedYet"));
  setText(fields.productionMessageBoundary, t("notCheckedYet"));
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
  syncTwoProfileDerivedConnectionFields();
  const connectionCode = (fields.productionTwoProfileB?.value ?? "").trim();
  const derivedPeerProfile = fields.productionTwoProfileB?.dataset.peerProfile ?? "";
  return {
    profileA: (fields.productionTwoProfileA?.value ?? "").trim(),
    profileB: (derivedPeerProfile || connectionCode).trim(),
    passphrase:
      fields.productionTwoProfilePassphrase?.value || fields.productionProfilePassphrase?.value || "",
    connectionCode: fields.productionTwoProfileB?.dataset.connectionCode ?? connectionCode,
    inviteRole: fields.productionTwoProfileB?.dataset.inviteCodeRole ?? connectionCodeRoleFor(connectionCode),
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
    rememberTwoProfileSafety(input, result);
    latestProductionTwoProfileSuccess = {
      profileA: input.profileA,
      profileB: input.profileB,
      messageLength: input.message.length,
      messageNumber: Number.parseInt(result.message_number, 10),
      roomFingerprint: twoProfileSessionStatusFingerprint(input),
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

function renderProductionTwoProfileRoomSetupResult(result) {
  const input = productionTwoProfileInput();
  const canContinue = Boolean(
    result.profile_a_ready_for_message_envelope &&
      result.profile_b_ready_for_message_envelope &&
      result.both_ready_for_message_envelope &&
      result.safety_phrase &&
      !result.plaintext_returned_to_frontend &&
      !result.store_path_returned &&
      !result.passphrase_retained &&
      !result.key_material_exposed &&
      !result.network_io_attempted &&
      !result.transport_io_opened &&
      !result.runtime_messaging_enabled,
  );
  setText(
    fields.productionTwoProfileProfiles,
    `profiles=${result.profile_a}/${result.profile_b} payloads=${result.pairing_payloads_exported}`,
  );
  setText(
    fields.productionTwoProfileSession,
    `drafts=${result.session_drafts_saved} handshake=${result.handshake_completed} ready=${result.both_ready_for_message_envelope}`,
  );
  setText(
    fields.productionTwoProfileMessageState,
    currentLanguage === "ko"
      ? "메시지는 아직 보내지 않았습니다. 확인 문구를 비교한 뒤 메시지를 작성하세요."
      : "No message sent yet. Compare the verification phrase, then write a message.",
  );
  setText(
    fields.productionTwoProfileBoundary,
    `plaintext=${result.plaintext_returned_to_frontend} store_path=${result.store_path_returned} passphrase=${result.passphrase_retained} key_material=${result.key_material_exposed} network=${result.network_io_attempted} transport=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  );
  if (canContinue) {
    rememberTwoProfileSafety(input, result);
    rememberTwoProfileReadySessionFromRoundtrip(input, result);
    renderProductionTwoProfileMemory(input);
  }
  setProductionFollowupActions(
    canContinue,
    currentLanguage === "ko"
      ? "다음: 확인 문구가 일치하는지 비교한 뒤 메시지를 보내세요."
      : "Next: compare the verification phrase, then send a message.",
  );
  return {
    canContinue,
    nextStep: canContinue
      ? currentLanguage === "ko"
        ? "확인 문구 비교 후 메시지 작성"
        : "Compare phrase, then compose"
      : result.warning,
  };
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
      roomFingerprint: twoProfileSessionStatusFingerprint(input),
      fingerprint: twoProfileInputFingerprint(input),
    };
    renderProductionTwoProfileMemory(input);
    applyStoredSessionMessageResultToManualFlow(result, input.message, input);
    if (fields.productionTwoProfileMessage) {
      fields.productionTwoProfileMessage.value = "";
      renderProductionTwoProfileDirection(productionTwoProfileInput());
    }
  }
  setProductionFollowupActions(view.canContinue, view.nextStep);
  return view;
}

function applyStoredSessionMessageResultToManualFlow(result, message, input = productionTwoProfileInput()) {
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
    appendProductionTwoProfileConversationStatus("sent", sender, receiver, messageNumber, text, {}, input);
    appendProductionTwoProfileConversationStatus("received", receiver, sender, messageNumber, text, {}, input);
    selectTwoProfileConversationMessage(sender, receiver, messageNumber, text, { input });
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

function productionProfileInputStillCurrent(input) {
  const current = productionProfileInput();
  return current.profile === input.profile && current.passphrase === input.passphrase;
}

function productionPairingInput() {
  return {
    ...productionProfileInput(),
    rendezvousEndpoint: (fields.productionPairingEndpoint?.value ?? "").trim(),
    localPayload: (fields.productionPairingPayload?.value ?? "").trim(),
    remotePayload: (fields.productionRemotePairingPayload?.value ?? "").trim(),
    safetyConfirmed: Boolean(fields.productionPairingSafetyVerified?.checked),
    initPayload: (fields.productionRemoteHandshakeInitPayload?.value ?? "").trim(),
    replyPayload: (fields.productionRemoteHandshakeReplyPayload?.value ?? "").trim(),
    finishPayload: (fields.productionRemoteHandshakeFinishPayload?.value ?? "").trim(),
  };
}

function productionPairingInputStillCurrent(input, keys = []) {
  const current = productionPairingInput();
  const fieldsToCompare = keys.length > 0 ? keys : Object.keys(input ?? {});
  return fieldsToCompare.every((key) => current[key] === input[key]);
}

function productionPairingEndpointStillCurrent(rendezvousEndpoint) {
  return (fields.productionPairingEndpoint?.value ?? "").trim() === String(rendezvousEndpoint ?? "").trim();
}

function pairingSafetyFingerprint(input = productionPairingInput()) {
  const profile = String(input.profile ?? "").trim().toLowerCase();
  return `${profile}\n${input.passphrase || ""}\n${input.localPayload}\n${input.remotePayload}`;
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

function productionMessageInputStillCurrent(input) {
  const current = productionMessageInput();
  return (
    current.profile === input.profile &&
    current.passphrase === input.passphrase &&
    current.autoMessageNumber === input.autoMessageNumber &&
    current.messageNumber === input.messageNumber &&
    current.messageTtlSeconds === input.messageTtlSeconds &&
    current.message === input.message &&
    current.envelopePayload === input.envelopePayload
  );
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

    setText(fields.releaseClaim, status.secure_release ? "Unexpected release claim" : t("noSecureReleaseClaim"));
    setText(
      fields.messaging,
      status.usable_messaging ? "Unexpected messaging status" : t("noRuntimeMessagingPath"),
    );
    setText(fields.core, localizedBoundaryStatus(status.core_status));
    setText(fields.profile, localizedBoundaryStatus(status.profile_status));
    setText(fields.pairing, localizedBoundaryStatus(status.pairing_status));
    setText(fields.productionSession, localizedBoundaryStatus(status.production_session_status));
    setText(fields.productionSelfTest, localizedBoundaryStatus(status.production_self_test_status));
    setText(fields.productionSessionNonReadiness, localizedBoundaryStatus(status.production_session_non_readiness));
    setText(fields.productionPreflight, localizedBoundaryStatus(status.production_preflight_status));
    setText(fields.productionPreflightBlockers, localizedBoundaryStatus(status.production_preflight_blockers));
    setText(fields.sessionDurableState, localizedBoundaryStatus(status.session_durable_state_status));
    setText(fields.sessionUnlockPolicy, localizedBoundaryStatus(status.session_unlock_policy_status));
    setText(fields.sessionUnlockNonReadiness, localizedBoundaryStatus(status.session_unlock_non_readiness));
    setText(fields.sessionUnlockCliRejection, localizedBoundaryStatus(status.session_unlock_cli_rejection_status));
    setText(fields.sessionUnlockCliRejectionFlags, localizedBoundaryStatus(status.session_unlock_cli_rejection_flags));
    setText(fields.transport, localizedBoundaryStatus(status.transport_status));
    setText(fields.networkExecution, localizedBoundaryStatus(status.network_execution_status));
    setText(fields.experimentalTransport, localizedBoundaryStatus(status.experimental_transport_status));
    setText(fields.bootstrapStatus, localizedBoundaryStatus(status.bootstrap_status_classification));
    setText(fields.transportIo, localizedBoundaryStatus(status.transport_io_status));
    setText(fields.storage, localizedBoundaryStatus(status.storage_status));
    setText(fields.verification, localizedBoundaryStatus(status.verification_status));
  } catch (_error) {
    renderAppStateSummary({
      secure_release: false,
      usable_messaging: false,
      network_execution_status: "network execution disabled",
      production_preflight_blockers:
        "session E2EE false transport send receive false storage rollback not-provided messaging false",
      local_dev_peer_label: "",
    });
    setText(fields.releaseClaim, t("noSecureReleaseClaim"));
    setText(fields.messaging, t("noRuntimeMessagingPath"));
    setText(fields.core, t("coreBoundaryOnly"));
    setText(fields.profile, t("profileBoundaryOnly"));
    setText(fields.pairing, t("pairingBoundaryOnly"));
    setText(fields.productionSession, t("productionSessionBoundary"));
    setText(fields.productionSelfTest, t("productionSelfTestBoundary"));
    setText(
      fields.productionSessionNonReadiness,
      t("productionSessionLimitsValue"),
    );
    setText(fields.productionPreflight, t("productionPreflightValue"));
    setText(
      fields.productionPreflightBlockers,
      t("preflightBlockersValue"),
    );
    setText(fields.sessionDurableState, t("sessionDurableStateValue"));
    setText(fields.sessionUnlockPolicy, t("sessionUnlockPolicyValue"));
    setText(
      fields.sessionUnlockNonReadiness,
      t("sessionUnlockLimitsValue"),
    );
    setText(fields.sessionUnlockCliRejection, t("sessionUnlockRejectionValue"));
    setText(
      fields.sessionUnlockCliRejectionFlags,
      t("unlockRejectionFlagsValue"),
    );
    setText(fields.transport, t("transportValue"));
    setText(fields.networkExecution, t("networkExecutionValue"));
    setText(fields.experimentalTransport, t("experimentalTransportValue"));
    setText(fields.bootstrapStatus, t("bootstrapStatusValue"));
    setText(fields.transportIo, t("transportIoValue"));
    setText(fields.storage, t("storageValue"));
    setText(fields.verification, t("verificationValue"));
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
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
    clearProductionBusyAction("two-profile-onion-bootstrap");
    if (fields.startProductionTwoProfileOnionBootstrap) {
      fields.startProductionTwoProfileOnionBootstrap.disabled = false;
    }
    applyProductionActionState();
  }
}

async function prepareProductionTwoProfileOnionKey() {
  const input = productionTwoProfileInput();
  const { profileA, passphrase } = input;
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Onion key prepare failed");
    setText(fields.productionTwoProfileWarning, `Onion key prepare failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before network, endpoint launch, or message transport.");
  } finally {
    clearProductionBusyAction("two-profile-onion-key-prepare");
    if (fields.prepareProductionTwoProfileOnionKey) {
      fields.prepareProductionTwoProfileOnionKey.disabled = false;
    }
    applyProductionActionState();
  }
}

async function launchProductionTwoProfileOnionEndpoint() {
  const input = productionTwoProfileInput();
  const manualPairingInput = productionPairingInput();
  const { profileA, passphrase } = input;
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    let pairingPayloadExported = false;
    const manualPairingStillCurrent = productionPairingInputStillCurrent(manualPairingInput);
    if (result.local_onion_endpoint && fields.productionPairingEndpoint && manualPairingStillCurrent) {
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
        if (!twoProfileTranscriptInputStillCurrent(input)) {
          return;
        }
        await applyProductionPairingPayloadExportResult(
          pairing,
          "Pairing payload exported from local endpoint",
        );
        pairingPayloadExported = true;
      } catch (pairingError) {
        if (!twoProfileTranscriptInputStillCurrent(input)) {
          return;
        }
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Onion endpoint launch failed");
    setText(fields.productionTwoProfileWarning, `Endpoint launch failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before descriptor publication or message transport.");
  } finally {
    clearProductionBusyAction("two-profile-onion-endpoint-launch");
    if (fields.launchProductionTwoProfileOnionEndpoint) {
      fields.launchProductionTwoProfileOnionEndpoint.disabled = false;
    }
    applyProductionActionState();
  }
}

async function prepareProductionTwoProfileOnionPairing() {
  const input = productionTwoProfileInput();
  const manualPairingInput = productionPairingInput();
  const { profileA, profileB, passphrase } = input;
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    const manualPairingStillCurrent = productionPairingInputStillCurrent(manualPairingInput);
    if (manualPairingStillCurrent && fields.productionProfileName) {
      fields.productionProfileName.value = profileA;
      fields.productionProfileName.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (manualPairingStillCurrent && fields.productionProfileSelector) {
      fields.productionProfileSelector.value = profileA;
    }
    if (manualPairingStillCurrent && fields.productionPairingEndpoint) {
      fields.productionPairingEndpoint.value = profileAResult.launch.local_onion_endpoint;
      fields.productionPairingEndpoint.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (manualPairingStillCurrent) {
      await applyProductionPairingPayloadExportResult(
        profileAResult.pairing,
        "Onion pairing payloads ready",
      );
    }
    if (manualPairingStillCurrent && fields.productionRemotePairingPayload) {
      fields.productionRemotePairingPayload.value = profileBResult.pairing.pairing_payload;
      fields.productionRemotePairingPayload.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const safety = await invoke("production_pairing_safety_preview", {
      localPayload: profileAResult.pairing.pairing_payload,
      remotePayload: profileBResult.pairing.pairing_payload,
    });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    if (manualPairingStillCurrent) {
      applyProductionPairingSafetyPreviewResult(safety, {
        profile: profileA,
        passphrase,
        localPayload: profileAResult.pairing.pairing_payload,
        remotePayload: profileBResult.pairing.pairing_payload,
      });
    }
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
      twoProfileRoomIdentityInput(input),
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Onion pairing failed");
    setText(fields.productionTwoProfileWarning, `Onion pairing failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before session save or message transport.");
  } finally {
    clearProductionBusyAction("two-profile-onion-pairing");
    if (fields.prepareProductionTwoProfileOnionPairing) {
      fields.prepareProductionTwoProfileOnionPairing.disabled = false;
    }
    applyProductionActionState();
  }
}

async function saveProductionTwoProfileOnionSessions() {
  const input = productionTwoProfileInput();
  const { profileA, profileB, passphrase } = input;
  const roomInput = twoProfileRoomIdentityInput(input);
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
  if (
    !currentPairingSafetyVerified({
      profile: profileA,
      passphrase,
      localPayload,
      remotePayload,
      safetyConfirmed: true,
    })
  ) {
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    rememberTwoProfileSessionStatus(roomInput, status);
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Onion session save failed");
    setText(fields.productionTwoProfileWarning, `Onion session save failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before message transport.");
  } finally {
    clearProductionBusyAction("two-profile-onion-session-save");
    if (fields.saveProductionTwoProfileOnionSessions) {
      fields.saveProductionTwoProfileOnionSessions.disabled = false;
    }
    applyProductionActionState();
  }
}

async function refreshProductionTwoProfilePeerEndpoints(input = productionTwoProfileInput(), options = {}) {
  const { profileA, profileB, passphrase } = input;
  const roomInput = twoProfileRoomIdentityInput(input);
  const manualNetworkPermission = manualNetworkPermissionEnabled();
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setProductionTwoProfileState("Endpoint refresh needs profiles");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsRoom"));
    return false;
  }
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Endpoint refresh blocked");
    setText(fields.productionTwoProfileWarning, t("privateDeliveryPermissionRequired"));
    return false;
  }
  if (!latestTwoProfileSessionStatusForCurrentInput(roomInput)) {
    setProductionTwoProfileState("Endpoint refresh needs session");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsReadyRoom"));
    return false;
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

  setTwoProfilePeerEndpointRefreshBusy(input);
  setProductionTwoProfileState("Endpoint refresh running");
  setText(fields.productionTwoProfileWarning, t("refreshAddressRunning"));
  setText(fields.productionTwoProfileProfiles, `a=${profileA} b=${profileB}`);
  setText(fields.productionTwoProfileSession, "Existing encrypted session drafts are kept; only peer endpoint records are updated");
  setText(fields.productionTwoProfileMessageState, "No message transport attempted");
  setText(fields.productionTwoProfileBoundary, "Endpoint refresh in progress with manual network permission");
  applyProductionActionState();
  if (fields.refreshProductionTwoProfilePeerEndpoints) {
    fields.refreshProductionTwoProfilePeerEndpoints.disabled = true;
  }

  let refreshSucceeded = false;
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    rememberTwoProfileOnionEndpoints(
      roomInput,
      {
        profileAEndpoint: profileALaunch.local_onion_endpoint,
        profileBEndpoint: profileBLaunch.local_onion_endpoint,
      },
    );
    rememberTwoProfileSessionStatus(roomInput, status);
    renderProductionTwoProfileSessionStatusResult(status);
    setProductionTwoProfileState(
      status.both_ready_for_message_envelope ? "Peer endpoints refreshed" : "Peer endpoints refreshed; session needs review",
    );
    setText(fields.productionTwoProfileWarning, t("refreshAddressComplete"));
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
    refreshSucceeded = true;
    return true;
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    setProductionTwoProfileState("Endpoint refresh failed");
    setText(fields.productionTwoProfileWarning, t("refreshAddressFailed"));
    setText(fields.productionTwoProfileBoundary, localizedTwoProfileUserViewText("Existing room state was kept."));
    return false;
  } finally {
    clearTwoProfilePeerEndpointRefreshBusy(input);
    if (fields.refreshProductionTwoProfilePeerEndpoints) {
      fields.refreshProductionTwoProfilePeerEndpoints.disabled = false;
    }
    if (
      refreshSucceeded &&
      options.suppressRecoveryNoticeRefresh !== true &&
      twoProfileTranscriptInputStillCurrent(input)
    ) {
      refreshRouteReadinessNoticeAfterSessionRefresh(input, {
        allowRetryRecovery: options.allowRetryRecovery === true,
      });
    }
    applyProductionActionState();
  }
}

async function prepareInviteRoomPrivateRouteExchange(input = productionTwoProfileInput(), options = {}) {
  const allowRetryRecovery = options.allowRetryRecovery !== false;
  showPrivateRouteExchange();
  if (!manualNetworkPermissionEnabled()) {
    openPrivateDeliverySettings(input);
    return false;
  }
  setInviteRoomPrivateRouteCodeBusy(input);
  setProductionTwoProfileState("Delivery code creating");
  setText(fields.productionTwoProfileWarning, t("privateRouteCodeCreating"));
  setChatDeliveryNoticeByKey("privateRouteCodeCreating", "progress", input);
  setText(fields.productionTwoProfileProfiles, localizedTwoProfileUserViewText("Room is ready."));
  setText(fields.productionTwoProfileSession, localizedTwoProfileUserViewText("Preparing private delivery, then creating this device delivery code."));
  setText(fields.productionTwoProfileMessageState, localizedTwoProfileUserViewText("No message transport attempted."));
  setText(fields.productionTwoProfileBoundary, localizedTwoProfileUserViewText("Local delivery code creation requires explicit network permission."));
  applyProductionActionState();

  try {
    const runtime = await ensurePrivateDeliveryRuntimeReady(input);
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    const result = await invoke("production_onion_service_launch_attempt", {
      profile: input.profileA,
      passphrase: input.passphrase,
      manualNetworkPermission: true,
    });
    if (!result.local_onion_endpoint) {
      throw new Error(result.next_blocker || "delivery code unavailable");
    }
    const stillCurrentRoom = twoProfileTranscriptInputStillCurrent(input);
    if (!stillCurrentRoom) {
      rememberLocalPrivateRouteCode(result.local_onion_endpoint, input, { updateUi: false });
      return true;
    }
    rememberLocalPrivateRouteCode(result.local_onion_endpoint);
    if (fields.productionPairingEndpoint) {
      fields.productionPairingEndpoint.value = result.local_onion_endpoint;
      fields.productionPairingEndpoint.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const noticeKey = (fields.peerPrivateRouteCode?.value ?? "").trim()
      ? "privateRouteCodeReady"
      : "privateRouteWaitingPeerCode";
    setProductionTwoProfileState("Delivery code ready");
    setText(fields.productionTwoProfileWarning, t(noticeKey));
    setChatDeliveryNoticeByKey(noticeKey, "muted", input);
    setText(
      fields.productionTwoProfileBoundary,
      `backup=${runtime.backup.backup_exclusion_verified} key=${runtime.key.key_material_ready} persistent_client=${runtime.client.persistent_client_ready} endpoint=${result.onion_endpoint_returned} next=${result.next_blocker}`,
    );
    if (allowRetryRecovery) {
      showPrivateRouteRetryFollowupPrompt(input);
    }
    focusLocalPrivateRouteCodeDisplay();
    return true;
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    setProductionTwoProfileState("Delivery code failed");
    setText(fields.productionTwoProfileWarning, `${t("privateRouteCodeFailed")} ${String(error)}`);
    setChatDeliveryNoticeByKey("privateRouteCodeFailed", "warning", input);
    return false;
  } finally {
    clearInviteRoomPrivateRouteCodeBusy(input);
    applyProductionActionState();
  }
}

async function applyPeerPrivateRouteCode(options = {}) {
  const allowRetryRecovery = options.allowRetryRecovery !== false;
  const input = productionTwoProfileInput();
  const peerRouteCode = (fields.peerPrivateRouteCode?.value ?? "").trim();
  if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
    openChatSettingsPanel(fields.productionTwoProfileB);
    setProductionTwoProfileState("Peer delivery needs room");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsRoom"));
    return false;
  }
  if (!twoProfileSessionsReadyForInput(input)) {
    setProductionTwoProfileState("Peer delivery needs ready room");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsReadyRoom"));
    return false;
  }
  if (!twoProfileSafetyConfirmedForInput(input)) {
    setProductionTwoProfileState("Verification required");
    setText(fields.productionTwoProfileWarning, t("sendLockedUntilVerified"));
    focusSafetyConfirmation();
    return false;
  }
  if (!peerRouteCode) {
    showPrivateRouteExchange();
    setProductionTwoProfileState("Peer delivery code needed");
    setText(fields.productionTwoProfileWarning, t("peerPrivateRouteCodeMissing"));
    fields.peerPrivateRouteCode?.focus();
    showPrivateRouteRetryFollowupPrompt(input);
    return false;
  }
  rememberPeerPrivateRouteDraft(input);

  setInviteRoomPeerRouteCodeBusy(input);
  setProductionTwoProfileState("Peer delivery saving");
  setText(fields.productionTwoProfileWarning, t("peerPrivateRouteCodeSaving"));
  setChatDeliveryNoticeByKey("peerPrivateRouteCodeSaving", "progress", input);
  applyProductionActionState();
  try {
    const update = await invoke("production_pairing_session_remote_endpoint_update", {
      profile: input.profileA,
      passphrase: input.passphrase,
      rendezvousEndpoint: peerRouteCode,
    });
    const status = await invokeInviteRoomSessionStatus(input);
    rememberTwoProfileSessionStatus(input, status);
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return true;
    }
    renderProductionTwoProfileSessionStatusResult(status);
    setProductionTwoProfileState(update.remote_endpoint_state_written ? "Peer delivery saved" : "Peer delivery unchanged");
    setText(fields.productionTwoProfileWarning, t("peerPrivateRouteCodeSaved"));
    setChatDeliveryNoticeByKey("privateDeliveryRouteReady", "success", input);
    hidePrivateRouteExchangeIfReady(input);
    await loadProductionTwoProfileTranscript({
      quiet: true,
      refreshSessionStatus: false,
      suppressRouteReadinessNoticeRefresh: true,
      input,
    });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return true;
    }
    if (allowRetryRecovery && await continueAfterPeerPrivateRouteSaved(input)) {
      return true;
    }
    if (allowRetryRecovery) {
      showLatestRetryableOutboundNotice(input, { allowAutomatic: false });
    }
    return true;
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    setProductionTwoProfileState("Peer delivery failed");
    setText(fields.productionTwoProfileWarning, `${t("peerPrivateRouteCodeFailed")} ${String(error)}`);
    setChatDeliveryNoticeByKey("peerPrivateRouteCodeFailed", "warning", input);
    fields.peerPrivateRouteCode?.focus();
    return false;
  } finally {
    clearInviteRoomPeerRouteCodeBusy(input);
    applyProductionActionState();
  }
}

async function copyLocalPrivateRouteCode() {
  const input = productionTwoProfileInput();
  const code = currentActiveLocalPrivateRouteCode(input);
  if (!code) {
    showPrivateRouteExchange();
    setProductionTwoProfileState("Delivery code missing");
    setText(
      fields.productionTwoProfileWarning,
      latestLocalPrivateRouteCode ? t("privateRouteLocalStatusSaved") : t("privateRouteCodeNotReady"),
    );
    renderPrivateRouteExchangeState(input, { forceRefresh: true });
    return false;
  }
  try {
    await navigator.clipboard.writeText(code);
    setProductionTwoProfileState("Delivery code copied");
    setText(fields.productionTwoProfileWarning, t("privateRouteCodeCopied"));
    setChatDeliveryNoticeByKey("privateRouteCodeCopied", "success", input);
    fields.peerPrivateRouteCode?.focus();
    return true;
  } catch {
    fields.localPrivateRouteCode?.focus();
    fields.localPrivateRouteCode?.select();
    setProductionTwoProfileState("Delivery code selected");
    setText(fields.productionTwoProfileWarning, t("privateRouteCodeCopyFallback"));
    return false;
  }
}

async function preparePrivateDeliveryRoute(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const input = options.input ?? productionTwoProfileInput();
  const allowRetryRecovery = options.allowRetryRecovery !== false;
  if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
    openChatSettingsPanel(fields.productionTwoProfileB);
    setProductionTwoProfileState("Private route needs room");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsRoom"));
    return;
  }
  if (!twoProfileSessionsReadyForInput(input)) {
    setProductionTwoProfileState("Private route needs ready room");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsReadyRoom"));
    return;
  }
  if (!twoProfileSafetyConfirmedForInput(input)) {
    setProductionTwoProfileState("Verification required");
    setText(fields.productionTwoProfileWarning, t("sendLockedUntilVerified"));
    focusSafetyConfirmation();
    return;
  }
  if (!manualNetworkPermissionEnabled()) {
    openPrivateDeliverySettings(input);
    return;
  }
  if (twoProfilePeerEndpointState(input).ready && !forceRefresh) {
    if (allowRetryRecovery && showPrivateRouteRetryFollowupPrompt(input)) {
      return;
    }
    setProductionTwoProfileState("Private route ready");
    setText(fields.productionTwoProfileWarning, t("privateDeliveryRouteReady"));
    setChatDeliveryNoticeByKey("privateDeliveryRouteReady", "success", input);
    return;
  }

  if (twoProfileInviteCodeModeActive()) {
    const nextRouteAction = focusPrivateRouteNextAction(input, { forceRefresh });
    if (nextRouteAction === "paste-peer") {
      setProductionTwoProfileState("Peer delivery code needed");
      setText(fields.productionTwoProfileWarning, t("peerPrivateRouteCodeMissing"));
      setChatDeliveryNoticeByKey("peerPrivateRouteCodeMissing", "muted", input);
      if (allowRetryRecovery) {
        showPrivateRouteRetryFollowupPrompt(input);
      }
      return;
    }
    if (nextRouteAction === "apply-peer") {
      await applyPeerPrivateRouteCode({ allowRetryRecovery });
      return;
    }
    const localRouteCreated = await prepareInviteRoomPrivateRouteExchange(input, { allowRetryRecovery });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    if (localRouteCreated && (fields.peerPrivateRouteCode?.value ?? "").trim()) {
      await applyPeerPrivateRouteCode({ allowRetryRecovery });
    }
    return;
  }

  setChatDeliveryNoticeByKey("privateDeliveryRoutePreparing", "progress", input);
  const refreshed = await refreshProductionTwoProfilePeerEndpoints(input, { allowRetryRecovery });
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return;
  }
  if (allowRetryRecovery && refreshed && showPrivateRouteRetryFollowupPrompt(input, { clear: true })) {
    return;
  }
  if (allowRetryRecovery && refreshed && showLatestRetryableOutboundNotice(input, { allowAutomatic: false })) {
    return;
  }
  setChatDeliveryNoticeByKey(
    refreshed ? "privateDeliveryRouteReady" : "chatNoticeRefreshAddress",
    refreshed ? "success" : "warning",
    input,
  );
}

async function sendProductionTwoProfileEndpointUpdate() {
  const input = productionTwoProfileInput();
  const localEndpoint = latestTwoProfileLocalOnionEndpoint(input);
  const latestMessage = latestTwoProfileSuccessForInput(input);
  const storedEndpointTransportState = storedPeerEndpointTransportState(input);
  if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
    setProductionTwoProfileState("Endpoint update needs profiles");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsRoom"));
    return;
  }
  if (!twoProfileSessionsReadyForInput(input)) {
    setProductionTwoProfileState("Endpoint update needs session");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsReadyRoom"));
    return;
  }
  if (!storedEndpointTransportState.ready) {
    setProductionTwoProfileState("Endpoint update needs peer endpoint");
    setText(
      fields.productionTwoProfileWarning,
      t("chatNoticeRefreshAddress"),
    );
    return;
  }
  if (!localEndpoint) {
    setProductionTwoProfileState("Endpoint update needs local endpoint");
    setText(fields.productionTwoProfileWarning, t("chatNoticeRefreshAddress"));
    return;
  }
  if (!latestMessage || latestMessage.profileA !== input.profileA || latestMessage.profileB !== input.profileB) {
    setProductionTwoProfileState("Endpoint update needs message baseline");
    setText(fields.productionTwoProfileWarning, t("refreshAddressNeedsMessage"));
    return;
  }
  const manualNetworkPermission = manualNetworkPermissionEnabled();
  if (!manualNetworkPermission) {
    setProductionTwoProfileState("Endpoint update blocked");
    setText(fields.productionTwoProfileWarning, t("privateDeliveryPermissionRequired"));
    return;
  }

  const updateMessageNumber = latestMessage.messageNumber + 1;
  productionBusyAction = "two-profile-endpoint-update-control";
  setProductionTwoProfileState("Peer address update running");
  setText(fields.productionTwoProfileWarning, t("refreshAddressSending"));
  setText(fields.productionTwoProfileProfiles, localizedTwoProfileUserViewText("Room is ready."));
  setText(fields.productionTwoProfileSession, localizedTwoProfileUserViewText("Updating the saved peer address."));
  setText(fields.productionTwoProfileMessageState, localizedTwoProfileUserViewText("No chat message is being sent."));
  setText(
    fields.productionTwoProfileBoundary,
    localizedTwoProfileUserViewText("Peer address update is running after your explicit action."),
  );
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    rememberTwoProfileSessionStatus(input, status);
    renderProductionTwoProfileSessionStatusResult(status);
    const userView = localizedTwoProfileUserView(productionTwoProfileSendAttemptUserView(result, updateMessageNumber));
    setProductionTwoProfileState(
      result.send_attempt_succeeded
        ? "Peer address update sent"
        : result.peer_endpoint_refresh_recommended
          ? "Peer address refresh needed"
          : userView.state,
    );
    setText(
      fields.productionTwoProfileWarning,
      result.send_attempt_succeeded ? t("chatNoticeEndpointUpdated") : localizedSendAttemptMessage(result),
    );
    setText(
      fields.productionTwoProfileSession,
      result.send_attempt_succeeded ? localizedTwoProfileUserViewText("Peer address update was sent.") : userView.session,
    );
    setText(
      fields.productionTwoProfileMessageState,
      result.send_attempt_succeeded ? localizedTwoProfileUserViewText("Wait for the other device to receive it.") : userView.message,
    );
    setText(
      fields.productionTwoProfileBoundary,
      result.send_attempt_succeeded
        ? localizedTwoProfileUserViewText("Peer address update finished without showing private details.")
        : userView.boundary,
    );
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Peer address update failed");
    setText(fields.productionTwoProfileWarning, localizedSendFailureMessage(error));
    setText(fields.productionTwoProfileBoundary, localizedTwoProfileUserViewText("Existing room state was kept."));
  } finally {
    clearProductionBusyAction("two-profile-endpoint-update-control");
    if (fields.sendProductionTwoProfileEndpointUpdate) {
      fields.sendProductionTwoProfileEndpointUpdate.disabled = false;
    }
    applyProductionActionState();
  }
}

async function completeProductionTwoProfileOnionHandshake() {
  const input = productionTwoProfileInput();
  const { profileA, profileB, passphrase } = input;
  const roomInput = twoProfileRoomIdentityInput(input);
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

    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
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
    rememberTwoProfileSessionStatus(roomInput, status);
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Onion handshake failed");
    setText(fields.productionTwoProfileWarning, `Onion handshake failed without returning secrets. ${error}`);
    setText(fields.productionTwoProfileBoundary, "Failed before message transport.");
  } finally {
    clearProductionBusyAction("two-profile-onion-handshake");
    if (fields.completeProductionTwoProfileOnionHandshake) {
      fields.completeProductionTwoProfileOnionHandshake.disabled = false;
    }
    applyProductionActionState();
  }
}

async function prepareOnionKeyRecord() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setOnionKeyRecordState(result.key_material_ready ? "Key record prepared" : "Key record blocked");
    setText(
      fields.onionKeyRecordBoundary,
      `storage=${result.storage_opened} profile=${result.profile_marker_present} profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} lifecycle=${result.lifecycle_ready} written=${result.key_record_written} present=${result.key_record_present} material_ready=${result.key_material_ready} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    setText(fields.onionPreflightWarning, result.warning);
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setOnionKeyRecordState("Key record prepare failed");
    setText(fields.onionKeyRecordBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionKeyRecord) {
      fields.prepareOnionKeyRecord.disabled = false;
    }
  }
}

async function checkOnionLaunchPreflight() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setOnionLaunchPreflightState(
      result.ready_for_onion_launch ? "Launch preflight ready" : "Launch preflight blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionLaunchPreflightBoundary,
      `profile_unlock=${result.profile_transport_unlock_ready} backup=${result.backup_exclusion_verified} key_record=${result.key_record_present} key_material=${result.key_material_ready} persistent_client=${result.persistent_client_ready} publication_policy=${result.endpoint_publication_policy_ready} update_policy=${result.endpoint_update_policy_ready} redacted_events=${result.redacted_events_only} launch=${result.ready_for_onion_launch} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setOnionLaunchPreflightState("Launch preflight failed");
    setText(fields.onionLaunchPreflightBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.checkOnionLaunchPreflight) {
      fields.checkOnionLaunchPreflight.disabled = false;
    }
  }
}

async function attemptOnionServiceLaunch() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setText(fields.onionServiceLaunchAttempt, `Failed closed: ${error}`);
  } finally {
    if (fields.attemptOnionServiceLaunch) {
      fields.attemptOnionServiceLaunch.disabled = false;
    }
  }
}

async function prepareOnionDescriptorPublication() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setOnionDescriptorPublicationState(
      result.descriptor_preparation_ready ? "Descriptor prepare ready" : "Descriptor prepare blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionDescriptorPublicationBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} profile_unlock=${result.profile_transport_unlock_ready} key_material=${result.key_material_ready} persistent_client=${result.persistent_client_ready} launch=${result.launch_preflight_ready} hosting_gate=${result.onion_hosting_gate_ready} descriptor_gate=${result.descriptor_publication_gate_ready} adapter=${result.fail_closed_adapter_ready} redacted_context=${result.redacted_context_ready} prepared=${result.descriptor_preparation_ready} policy=${result.endpoint_publication_policy_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setOnionDescriptorPublicationState("Descriptor prepare failed");
    setText(fields.onionDescriptorPublicationBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionDescriptorPublication) {
      fields.prepareOnionDescriptorPublication.disabled = false;
    }
  }
}

async function attemptOnionDescriptorPublication() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionDescriptorPublicationAttempt,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} launch=${result.launch_preflight_ready} descriptor_gate=${result.descriptor_publication_gate_ready} prepared=${result.descriptor_preparation_ready} started=${result.publish_attempt_started} succeeded=${result.publish_attempt_succeeded} event_recorded=${result.redacted_publish_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} key_material_exposed=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setText(fields.onionDescriptorPublicationAttempt, `Failed closed: ${error}`);
  } finally {
    if (fields.attemptOnionDescriptorPublication) {
      fields.attemptOnionDescriptorPublication.disabled = false;
    }
  }
}

async function prepareOnionInboundStream() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setOnionInboundStreamState(
      result.inbound_stream_preparation_ready ? "Inbound prepare ready" : "Inbound prepare blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionInboundStreamBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} persistent_client=${result.persistent_client_ready} launch=${result.launch_preflight_ready} descriptor_gate=${result.descriptor_publication_gate_ready} descriptor_prepared=${result.descriptor_preparation_ready} inbound_gate=${result.inbound_stream_gate_ready} adapter=${result.fail_closed_adapter_ready} inbound_prepared=${result.inbound_stream_preparation_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} stream_id=${result.stream_id_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} accept=${result.stream_accept_attempted} read_write=${result.stream_read_write_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setOnionInboundStreamState("Inbound prepare failed");
    setText(fields.onionInboundStreamBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionInboundStream) {
      fields.prepareOnionInboundStream.disabled = false;
    }
  }
}

async function attemptOnionInboundEnvelopeReceive() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
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
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} promoted_cache=${result.persistent_client_promoted_from_real_onion_cache === true} inbound_prepared=${result.inbound_stream_preparation_ready} rend_stream=${result.inbound_rend_request_stream_ready} rend_accept_attempted=${result.inbound_rend_request_accept_attempted} rend_accepted=${result.inbound_rend_request_accepted} stream_requests=${result.accepted_stream_request_stream_ready} stream_accept_attempted=${result.stream_request_accept_attempted} stream_accepted=${result.stream_request_accepted} stream_read_attempted=${result.stream_read_attempted} stream_bytes=${result.stream_bytes_read} started=${result.receive_attempt_started} succeeded=${result.receive_attempt_succeeded} received_envelope=${result.received_envelope_ready} import_attempted=${result.inbound_import_attempted} control_imported=${result.control_envelope_imported} endpoint_update=${result.endpoint_update_applied} stale_cleared=${result.stale_endpoint_status_cleared} event_recorded=${result.redacted_receive_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} stream_id=${result.stream_id_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} accept=${result.stream_accept_attempted} read_write=${result.stream_read_write_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
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
    if (!productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionOutboundStreamState(
      result.outbound_stream_preparation_ready ? "Outbound prepare ready" : "Outbound prepare blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionOutboundStreamBoundary,
      `endpoint=${result.endpoint_accepted} pairwise=${result.pairwise_endpoint_ready} high_risk_policy=${result.high_risk_onion_policy_ready} outbound_gate=${result.outbound_stream_gate_ready} adapter=${result.fail_closed_adapter_ready} outbound_prepared=${result.outbound_stream_preparation_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} stream_id=${result.stream_id_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} dial=${result.stream_dial_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionOutboundStreamState("Outbound prepare failed");
    setText(fields.onionOutboundStreamBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionOutboundStream) {
      fields.prepareOnionOutboundStream.disabled = false;
    }
  }
}

async function prepareOnionStreamCloseout() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
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
    if (!productionProfileInputStillCurrent(input) || !productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionStreamCloseoutState(
      result.stream_adapter_closeout_ready ? "Stream closeout ready" : "Stream closeout blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionStreamCloseoutBoundary,
      `feature=${result.manual_client_attempt_feature_compiled} persistent_client=${result.persistent_client_ready} inbound=${result.inbound_stream_preparation_ready} outbound=${result.outbound_stream_preparation_ready} closeout=${result.stream_adapter_closeout_ready} remote_auth_next=${result.remote_peer_authentication_next} verified_session_after_auth=${result.verified_pairwise_session_after_remote_authentication} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} descriptor_body=${result.descriptor_body_returned} stream_id=${result.stream_id_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} publish=${result.descriptor_publish_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionProfileInputStillCurrent(input) || !productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionStreamCloseoutState("Stream closeout failed");
    setText(fields.onionStreamCloseoutBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionStreamCloseout) {
      fields.prepareOnionStreamCloseout.disabled = false;
    }
  }
}

async function prepareOnionRemoteAuth() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
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
    if (!productionProfileInputStillCurrent(input) || !productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionRemoteAuthState(
      result.remote_peer_authentication_ready ? "Remote auth ready" : "Remote auth blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionRemoteAuthBoundary,
      `closeout=${result.stream_adapter_closeout_ready} auth_required=${result.remote_peer_authentication_required} stored_session=${result.stored_pairwise_session_ready} auth_ready=${result.remote_peer_authentication_ready} session_binding=${result.verified_pairwise_session_binding_ready} bound_stream=${result.bound_stream_session_ready} outbound_io_boundary=${result.outbound_envelope_io_boundary_ready} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionProfileInputStillCurrent(input) || !productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionRemoteAuthState("Remote auth failed");
    setText(fields.onionRemoteAuthBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionRemoteAuth) {
      fields.prepareOnionRemoteAuth.disabled = false;
    }
  }
}

async function prepareOnionOutboundEnvelopeSend() {
  const input = productionMessageInput();
  const { profile, passphrase, messageNumber } = input;
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
    if (!productionMessageInputStillCurrent(input) || !productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionOutboundEnvelopeSendState(
      result.send_intent_prepared ? "Envelope send intent ready" : "Envelope send intent blocked",
    );
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionOutboundEnvelopeSendBoundary,
      `auth=${result.remote_peer_authentication_ready} bound_stream=${result.bound_stream_session_ready} io_boundary=${result.outbound_envelope_io_boundary_ready} stored_envelope=${result.stored_outbound_envelope_ready} decodable=${result.envelope_decodable} number_match=${result.envelope_message_number_matches} send_intent=${result.send_intent_prepared} ack_wait=${result.ack_wait_registered} event_recorded=${result.redacted_send_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionMessageInputStillCurrent(input) || !productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionOutboundEnvelopeSendState("Envelope send prepare failed");
    setText(fields.onionOutboundEnvelopeSendBoundary, `Failed closed: ${error}`);
  } finally {
    if (fields.prepareOnionOutboundEnvelopeSend) {
      fields.prepareOnionOutboundEnvelopeSend.disabled = false;
    }
  }
}

async function attemptOnionOutboundEnvelopeSend() {
  const input = productionMessageInput();
  const { profile, passphrase, messageNumber } = input;
  const rendezvousEndpoint = (fields.productionPairingEndpoint?.value ?? "").trim();
  const manualNetworkPermission = manualNetworkPermissionEnabled();
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
    if (!productionMessageInputStillCurrent(input) || !productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
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
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} promoted_cache=${result.persistent_client_promoted_from_real_onion_cache === true} owner_profile_bound=${result.owner_profile_bound === true} owner_matches_send=${result.owner_matches_send_profile === true} send_intent=${result.send_intent_prepared} started=${result.send_attempt_started} succeeded=${result.send_attempt_succeeded} ack_wait=${result.ack_wait_registered} event_recorded=${result.redacted_send_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
  } catch (error) {
    if (!productionMessageInputStillCurrent(input) || !productionPairingEndpointStillCurrent(rendezvousEndpoint)) {
      return;
    }
    setOnionOutboundEnvelopeSendState("Envelope send attempt failed");
    setText(fields.onionOutboundEnvelopeSendAttempt, `Failed closed: ${error}`);
  } finally {
    if (fields.attemptOnionOutboundEnvelopeSend) {
      fields.attemptOnionOutboundEnvelopeSend.disabled = false;
    }
  }
}

async function sendProductionTwoProfileLatestOnionEnvelope(input = productionTwoProfileInput(), options = {}) {
  const latestOnionOutbound = latestTwoProfileOutboundOnionMessage(input, options);
  const routeReadiness = externalPeerSendReadiness(input, {
    ...options,
    latestOnionOutbound,
  });
  if (!latestOnionOutbound) {
    const latestCandidate = latestTwoProfileOutboundDeliveryCandidate(input, options);
    if (latestCandidate) {
      await markTwoProfileOutboundSendFailed(
        input.profileA,
        input.passphrase,
        latestCandidate.messageNumber,
        routeReadiness.failureKind,
      );
      if (!twoProfileTranscriptInputStillCurrent(input)) {
        return;
      }
      await loadProductionTwoProfileTranscript({
        quiet: true,
        refreshSessionStatus: true,
        suppressRouteReadinessNoticeRefresh: true,
        allowRetryableMetadataFallback: false,
        input,
      });
      if (!showRetryableOutboundPromptForMessage(input, latestCandidate.messageNumber)) {
        showCurrentRetryableOutboundMissing(null);
      }
      refreshFieldTestReport();
      return;
    }
    if (options.exactRetryOnly === true) {
      showCurrentRetryableOutboundMissing(null);
      return;
    }
    setProductionTwoProfileState("Private delivery needs message");
    setText(
      fields.productionTwoProfileWarning,
      routeReadiness.peerEndpointState.ready
        ? t("inputRequiredMessage")
        : routeReadiness.disabledReason,
    );
    setChatDeliveryNoticeByKey(routeReadiness.peerEndpointState.ready ? "sendFailedGeneric" : routeReadiness.noticeKey, "warning", input);
    refreshFieldTestReport();
    return;
  }
  if (!routeReadiness.ready) {
    await markTwoProfileOutboundSendFailed(
      latestOnionOutbound.profile,
      latestOnionOutbound.passphrase,
      latestOnionOutbound.messageNumber,
      routeReadiness.failureKind,
    );
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Private delivery not ready");
    setText(fields.productionTwoProfileWarning, routeReadiness.disabledReason);
    setChatDeliveryNoticeByKey(routeReadiness.noticeKey, "warning", input);
    if (routeReadiness.nextAction === "enable-private-delivery") {
      openPrivateDeliverySettings(input);
    }
    await loadProductionTwoProfileTranscript({
      quiet: true,
      refreshSessionStatus: true,
      suppressRouteReadinessNoticeRefresh: true,
      input,
    });
    if (!showRetryableOutboundPromptForMessage(input, latestOnionOutbound.messageNumber)) {
      showCurrentRetryableOutboundMissing(null);
    }
    refreshFieldTestReport();
    return;
  }

  setTwoProfileOnionEnvelopeSendBusy(input, latestOnionOutbound.messageNumber);
  setProductionTwoProfileState("Private delivery running");
  setText(fields.productionTwoProfileWarning, t("chatNoticeSending"));
  setChatDeliveryNoticeByKey("chatNoticeSending", "progress", input);
  setText(fields.productionTwoProfileProfiles, localizedTwoProfileUserViewText("Room is ready."));
  setText(fields.productionTwoProfileSession, localizedTwoProfileUserViewText("Sending saved message."));
  setText(fields.productionTwoProfileMessageState, localizedTwoProfileUserViewText("Trying private delivery."));
  setText(fields.productionTwoProfileBoundary, localizedTwoProfileUserViewText("Private delivery is running after your explicit action."));
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
          manualNetworkPermission: routeReadiness.networkPermission,
        })
      : await invoke("production_onion_outbound_envelope_send_attempt", {
          profile: latestOnionOutbound.profile,
          passphrase: latestOnionOutbound.passphrase,
          rendezvousEndpoint: latestOnionOutbound.peerEndpoint,
          messageNumber: latestOnionOutbound.messageNumber,
          manualNetworkPermission: routeReadiness.networkPermission,
        });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setOnionOutboundEnvelopeSendState(
      result.send_attempt_succeeded
        ? "Envelope send attempt wrote"
        : result.send_attempt_started
          ? "Envelope send attempt failed closed"
          : "Envelope send attempt blocked",
    );
    const userView = localizedTwoProfileUserView(productionTwoProfileSendAttemptUserView(
      result,
      latestOnionOutbound.messageNumber,
    ));
    setProductionTwoProfileState(userView.state);
    setText(fields.onionPreflightWarning, result.warning);
    setText(
      fields.onionOutboundEnvelopeSendAttempt,
      `feature=${result.manual_client_attempt_feature_compiled} permission=${result.manual_network_permission_enabled} persistent_client=${result.persistent_client_ready} promoted_cache=${result.persistent_client_promoted_from_real_onion_cache === true} owner_profile_bound=${result.owner_profile_bound === true} owner_matches_send=${result.owner_matches_send_profile === true} send_intent=${result.send_intent_prepared} started=${result.send_attempt_started} succeeded=${result.send_attempt_succeeded} ack_wait=${result.ack_wait_registered} event_recorded=${result.redacted_send_result_event_recorded} events=${result.event_summary.join("; ") || "none"} next=${result.next_blocker} blockers=${result.blockers.join("; ") || "none"} raw_endpoint=${result.raw_endpoint_returned} raw_path=${result.raw_path_returned} onion_secret=${result.onion_secret_returned} peer_proof=${result.peer_proof_returned} transcript=${result.session_transcript_returned} envelope_payload=${result.envelope_payload_returned} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} accept=${result.stream_accept_attempted} dial=${result.stream_dial_attempted} read_write=${result.stream_read_write_attempted} send=${result.stream_send_attempted} envelope_io=${result.envelope_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    setText(fields.productionTwoProfileWarning, localizedSendAttemptMessage(result));
    setChatDeliveryNoticeForSendAttempt(result, input);
    setText(fields.productionTwoProfileProfiles, userView.profiles);
    setText(fields.productionTwoProfileSession, userView.session);
    setText(fields.productionTwoProfileMessageState, userView.message);
    setText(fields.productionTwoProfileBoundary, userView.boundary);
    if (result.peer_endpoint_failure_recorded) {
      const status = await invoke("production_two_profile_session_status", {
        profileA: input.profileA,
        profileB: input.profileB,
        passphrase: input.passphrase,
      });
      if (!twoProfileTranscriptInputStillCurrent(input)) {
        return;
      }
      rememberTwoProfileSessionStatus(input, status);
      renderRoomIdentityBar(input, twoProfileSessionsReadyForInput(input));
    }
    await loadProductionTwoProfileTranscript({
      quiet: true,
      refreshSessionStatus: false,
      suppressRouteReadinessNoticeRefresh: result.send_attempt_succeeded !== true,
      allowRetryableMetadataFallback: false,
      input,
    });
    if (result.send_attempt_succeeded) {
      clearCompletedExternalSendUiState(input, latestOnionOutbound.messageNumber);
      rememberCurrentInviteRoomMetadata();
      renderSavedInviteRooms();
    } else {
      if (!showRetryableOutboundPromptForMessage(input, latestOnionOutbound.messageNumber)) {
        showCurrentRetryableOutboundMissing(null);
      }
    }
    refreshFieldTestReport();
  } catch (error) {
    const failureKind = outboundSendFailureKindFromError(error);
    try {
      await markTwoProfileOutboundSendFailed(
        latestOnionOutbound.profile,
        latestOnionOutbound.passphrase,
        latestOnionOutbound.messageNumber,
        failureKind,
      );
    } catch {
      // Keep the user-facing failure path available even if state refresh fails.
    }
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Private delivery failed");
    setText(fields.productionTwoProfileWarning, localizedSendFailureMessage(error));
    setChatDeliveryNoticeForOutboundFailureKind(failureKind, input);
    setText(fields.productionTwoProfileBoundary, localizedTwoProfileUserViewText("Failed before or during bounded onion send attempt."));
    try {
      await loadProductionTwoProfileTranscript({
        quiet: true,
        refreshSessionStatus: true,
        suppressRouteReadinessNoticeRefresh: true,
        allowRetryableMetadataFallback: false,
        input,
      });
      if (!showRetryableOutboundPromptForMessage(input, latestOnionOutbound.messageNumber)) {
        showCurrentRetryableOutboundMissing(null);
      }
      refreshFieldTestReport();
    } catch {
      applyProductionActionState();
    }
  } finally {
    clearTwoProfileOnionEnvelopeSendBusy(input, latestOnionOutbound.messageNumber);
    if (fields.sendProductionTwoProfileLatestOnionEnvelope) {
      fields.sendProductionTwoProfileLatestOnionEnvelope.disabled = false;
    }
    applyProductionActionState();
  }
}

async function markTwoProfileOutboundSendFailed(profile, passphrase, messageNumber, failureKind) {
  const normalizedNumber = Number.parseInt(messageNumber, 10);
  if (!profile || !passphrase || !Number.isInteger(normalizedNumber) || normalizedNumber < 1) {
    return false;
  }
  await invoke("production_message_outbound_mark_send_failed", {
    profile,
    passphrase,
    messageNumber: normalizedNumber,
    failureKind,
  });
  return true;
}

function outboundSendFailureKindFromError(error) {
  const text = String(error ?? "").toLowerCase();
  if (sendFailureNeedsStartReceiving(text)) {
    return "LocalOnionEndpointNotReady";
  }
  if (text.includes("manualnetworkpermission") || text.includes("network permission")) {
    return "ManualNetworkPermissionMissing";
  }
  if (text.includes("timeout")) {
    return "receive-timeout";
  }
  if (text.includes("persistentclientnotready") || text.includes("bootstrap")) {
    return "PersistentClientNotReady";
  }
  if (sendFailureNeedsRouteSetup(text)) {
    return "peer-endpoint-missing";
  }
  if (sendFailureNeedsEndpointRefresh(text)) {
    return "stored remote endpoint refresh required";
  }
  return "peer offline";
}

function selectTwoProfileOutboundActionDirection(entry, action) {
  if (!entry || !fields.productionTwoProfileA || !fields.productionTwoProfileB) {
    return false;
  }
  const input = productionTwoProfileInput();
  if (entry.sender === input.profileA && entry.receiver === input.profileB) {
    setSelectedTwoProfileConversationEntry(entry);
    return true;
  }
  if (twoProfileInviteCodeModeActive()) {
    setSelectedTwoProfileConversationEntry(entry);
    setProductionTwoProfileState(
      action === "cancel" ? "Cancel send needs this device" : "Retry send needs this device",
    );
    setText(
      fields.productionTwoProfileWarning,
      currentLanguage === "ko"
        ? "이 기기에서 보낸 대기 메시지만 여기서 다시 보내거나 취소할 수 있습니다."
        : "Only pending messages sent from this device can be retried or canceled here.",
    );
    return false;
  }
  setSelectedTwoProfileConversationEntry(entry);
  fields.productionTwoProfileA.value = entry.sender;
  fields.productionTwoProfileB.value = entry.receiver;
  if (fields.productionTwoProfileMessage) {
    fields.productionTwoProfileMessage.value = "";
  }
  const nextInput = productionTwoProfileInput();
  renderProductionTwoProfileDirection(nextInput);
  renderProductionTwoProfileMemory(nextInput);
  setProductionTwoProfileState(action === "cancel" ? "Cancel send selected" : "Retry send selected");
  setText(
    fields.productionTwoProfileWarning,
    currentLanguage === "ko"
      ? `메시지 #${entry.messageNumber} 방향을 선택했습니다: ${entry.sender} -> ${entry.receiver}.`
      : `Selected message #${entry.messageNumber}: ${entry.sender} -> ${entry.receiver}.`,
  );
  applyProductionActionState();
  return true;
}

async function retryTwoProfileOutboundEntry(entry) {
  if (!(await restoreInviteRoomForConversationEntry(entry))) {
    return;
  }
  const currentEntry = currentTwoProfileRetryableOutboundEntry(entry);
  if (!currentEntry) {
    showCurrentRetryableOutboundMissing(entry);
    return;
  }
  if (!selectTwoProfileOutboundActionDirection(currentEntry, "retry")) {
    return;
  }
  const input = productionTwoProfileInput();
  if (currentEntry.sender !== input.profileA || currentEntry.receiver !== input.profileB) {
    setProductionTwoProfileState("Retry send needs direction");
    setText(fields.productionTwoProfileWarning, t("sendRetryWrongDirection"));
    setChatDeliveryNoticeByKey("sendRetryWrongDirection", "warning", input);
    return;
  }
  setProductionTwoProfileState("Retry send running");
  setText(fields.productionTwoProfileWarning, t("sendRetrying"));
  setChatDeliveryNoticeByKey("sendRetrying", "progress", input);
  await sendProductionTwoProfileLatestOnionEnvelope(input, {
    exactRetryOnly: true,
    message: currentEntry.message,
    messageNumber: currentEntry.messageNumber,
    roomFingerprint: currentEntry.roomFingerprint,
  });
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return;
  }
  await loadProductionTwoProfileTranscript({
    quiet: true,
    refreshSessionStatus: true,
    allowRetryableMetadataFallback: false,
    input,
  });
}

async function refreshTwoProfileOutboundEndpointThenRetry(entry) {
  if (!(await restoreInviteRoomForConversationEntry(entry))) {
    return;
  }
  const currentEntry = currentTwoProfileRetryableOutboundEntry(entry);
  if (!currentEntry) {
    showCurrentRetryableOutboundMissing(entry);
    return;
  }
  const input = productionTwoProfileInput();
  if (currentEntry.sender !== input.profileA || currentEntry.receiver !== input.profileB) {
    setProductionTwoProfileState("Endpoint refresh needs direction");
    setText(fields.productionTwoProfileWarning, t("sendRefreshWrongDirection"));
    return;
  }
  if (twoProfileInviteCodeModeActive()) {
    const peerEndpointState = twoProfilePeerEndpointState(input);
    if (!peerEndpointState.ready) {
      rememberPrivateRouteFollowupForOutboundRetry(currentEntry, input);
      const nextRouteAction = focusPrivateRouteNextAction(input);
      if (nextRouteAction === "create-local") {
        await prepareInviteRoomPrivateRouteExchange(input);
        if (!twoProfileTranscriptInputStillCurrent(input)) {
          return;
        }
        await loadProductionTwoProfileTranscript({
          quiet: true,
          refreshSessionStatus: true,
          allowRetryableMetadataFallback: false,
          input,
        });
        return;
      }
      if (nextRouteAction === "apply-peer") {
        const retryFollowup = pendingPrivateRouteFollowup?.action === "retry-outbound"
          ? pendingPrivateRouteFollowup
          : null;
        const applied = await applyPeerPrivateRouteCode();
        if (!twoProfileTranscriptInputStillCurrent(input)) {
          return;
        }
        if (retryFollowup && !privateRouteFollowupMatchesRoom(input)) {
          return;
        }
        if (applied && twoProfilePeerEndpointState(input).ready) {
          await retryTwoProfileOutboundEntry(currentEntry);
        }
        return;
      }
      if (peerEndpointState.stale) {
        setProductionTwoProfileState("Peer address refresh needed");
        setText(fields.productionTwoProfileWarning, t("chatNoticeRefreshAddress"));
        setChatDeliveryNoticeByKey("chatNoticeRefreshAddress", "warning", input);
        focusPeerPrivateRouteCodeInput();
      } else {
        setProductionTwoProfileState("Peer delivery code needed");
        setText(fields.productionTwoProfileWarning, t("peerPrivateRouteCodeMissing"));
        setChatDeliveryNoticeByKey("peerPrivateRouteCodeMissing", "muted", input);
      }
      return;
    }
    await retryTwoProfileOutboundEntry(currentEntry);
    return;
  }
  const refreshed = await refreshProductionTwoProfilePeerEndpoints(input, { suppressRecoveryNoticeRefresh: true });
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return;
  }
  if (refreshed) {
    await retryTwoProfileOutboundEntry(currentEntry);
  } else {
    await loadProductionTwoProfileTranscript({
      quiet: true,
      refreshSessionStatus: true,
      allowRetryableMetadataFallback: false,
      input,
    });
  }
}

async function cancelTwoProfileOutboundEntry(entry) {
  if (!(await restoreInviteRoomForConversationEntry(entry))) {
    return;
  }
  const currentEntry = currentTwoProfileRetryableOutboundEntry(entry);
  if (!currentEntry) {
    showCurrentRetryableOutboundMissing(entry);
    return;
  }
  if (!selectTwoProfileOutboundActionDirection(currentEntry, "cancel")) {
    return;
  }
  const input = productionTwoProfileInput();
  if (currentEntry.sender !== input.profileA || currentEntry.receiver !== input.profileB) {
    setProductionTwoProfileState("Cancel send needs direction");
    setText(fields.productionTwoProfileWarning, t("sendCancelWrongDirection"));
    setChatDeliveryNoticeByKey("sendCancelWrongDirection", "warning", input);
    return;
  }
  setTwoProfileOutboundCancelBusy(input);
  setProductionTwoProfileState("Cancel send running");
  setText(fields.productionTwoProfileWarning, t("sendCanceling"));
  setChatDeliveryNoticeByKey("sendCanceling", "progress", input);
  applyProductionActionState();
  try {
    await invoke("production_message_outbound_cancel_pending", {
      profile: currentEntry.sender,
      passphrase: input.passphrase,
      messageNumber: Number.parseInt(currentEntry.messageNumber, 10),
    });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Pending send canceled");
    setSelectedTwoProfileConversationEntry(null);
    setText(fields.productionTwoProfileWarning, t("sendCanceledNotice"));
    setChatDeliveryNoticeByKey("sendCanceledNotice", "success", input);
    await loadProductionTwoProfileTranscript({
      quiet: true,
      refreshSessionStatus: false,
      allowRetryableMetadataFallback: false,
      input,
    });
    showLatestRetryableOutboundNotice(input, { allowAutomatic: false });
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Cancel send failed");
    setText(fields.productionTwoProfileWarning, `${t("sendCancelFailed")} ${String(error)}`);
    setChatDeliveryNoticeByKey("sendCancelFailed", "warning", input);
  } finally {
    clearTwoProfileOutboundCancelBusy(input);
    applyProductionActionState();
  }
}

async function startProductionTwoProfileOnionReceive(options = {}) {
  const input = productionTwoProfileInput();
  const { profileA, profileB, passphrase } = input;
  const manualNetworkPermission = manualNetworkPermissionEnabled();
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setProductionTwoProfileState("Message listening needs room");
    setText(fields.productionTwoProfileWarning, t("receiveNeedsRoom"));
    return;
  }
  if (!twoProfileSessionsReadyForInput(input)) {
    setProductionTwoProfileState("Message listening needs ready room");
    setText(fields.productionTwoProfileWarning, t("receiveNeedsReadyRoom"));
    return;
  }
  if (!twoProfileSafetyConfirmedForInput(input)) {
    setProductionTwoProfileState("Verification required");
    setText(fields.productionTwoProfileWarning, t("receiveNeedsVerification"));
    return;
  }
  if (productionTwoProfileReceiveStoppingInOtherRoom(input)) {
    setProductionTwoProfileState("Message listening stopping in another room");
    setText(fields.productionTwoProfileWarning, t("receiveStopPending"));
    setChatDeliveryNoticeByKey("receiveStopPending", "warning", input);
    setProductionFollowupActions(
      true,
      currentLanguage === "ko"
        ? "다음: 기존 받기 중지가 완료된 뒤 이 채팅방에서 메시지 받기를 다시 시작하세요."
        : "Next: wait for the existing receive stop to finish, then start receiving in this room again.",
    );
    return;
  }
  if (productionTwoProfileReceiveActiveInOtherRoom(input)) {
    setProductionTwoProfileState("Message listening active in another room");
    setText(fields.productionTwoProfileWarning, t("receiveOtherRoomActive"));
    setChatDeliveryNoticeByKey("receiveOtherRoomActive", "warning", input);
    return;
  }
  if (options.preserveFollowup !== true) {
    clearPrivateRouteFollowupForRoom(input);
  }
  rememberReceiveIntentForRoom(input, true);
  if (!manualNetworkPermission) {
    setChatDeliveryNoticeByKey("chatNoticeNetworkPermission", "warning", input);
    openPrivateDeliverySettings(input);
    return;
  }
  if (productionTwoProfileOnionReceiveMode.enabled) {
    setProductionTwoProfileState("Message listening already running");
    setText(fields.productionTwoProfileWarning, t("receiveAlreadyListening"));
    return;
  }
  if (!currentActiveLocalPrivateRouteCode(input)) {
    setProductionTwoProfileState("Local endpoint preparing");
    setText(fields.productionTwoProfileWarning, t("privateRouteCodeCreating"));
    const localEndpointReady = await prepareInviteRoomPrivateRouteExchange(input, {
      allowRetryRecovery: options.preserveFollowup === true,
    });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    if (!localEndpointReady || !currentActiveLocalPrivateRouteCode(input)) {
      setProductionTwoProfileState("Local endpoint needed");
      setText(fields.productionTwoProfileWarning, t("privateRouteCodeNotReady"));
      setChatDeliveryNoticeByKey("privateRouteCodeFailed", "warning", input);
      return;
    }
  }

  let backendLoop = null;
  try {
    backendLoop = await invoke("production_onion_receive_loop_start", {
      profile: profileA,
      passphrase,
      manualNetworkPermission,
    });
  } catch (error) {
    setProductionTwoProfileState("Message listening failed");
    setText(fields.productionTwoProfileWarning, t("receiveStartFailed"));
    setChatDeliveryNoticeByKey("receiveStartFailed", "warning", input);
    renderSavedInviteRooms();
    applyProductionActionState();
    return;
  }
  if (backendLoop.duplicate_loop_blocked || !backendLoop.enabled) {
    setProductionTwoProfileState("Message listening already running");
    setText(fields.productionTwoProfileWarning, t("receiveAlreadyListening"));
    setText(
      fields.productionTwoProfileBoundary,
      productionTwoProfileOnionReceiveBackendBoundary(backendLoop),
    );
    renderSavedInviteRooms();
    applyProductionActionState();
    return;
  }

  const generation = productionTwoProfileOnionReceiveMode.generation + 1;
  productionTwoProfileOnionReceiveMode = {
    enabled: true,
    roomFingerprint: receiveModeRoomFingerprint(input),
    profile: profileA,
    passphrase: "",
    timer: null,
    attempt: 0,
    inFlight: false,
    stopRequested: false,
    runtimeState: "receiving",
    runtimeLabel: "Listening for new messages",
    silentStop: false,
    lastProcessedImportSequence: 0,
    lastProcessedMessageImportCount: 0,
    lastProcessedEndpointUpdateCount: 0,
    generation,
    ownerProfileBound: backendLoop.owner_profile_bound === true,
    ownerMatchesReceiveProfile: backendLoop.owner_matches_receive_profile !== false,
  };
  rememberLocalPrivateRouteLifecycle(input, {
    state: "listening",
    endpoint: currentActiveLocalPrivateRouteCode(input),
    generation,
  });
  setProductionTwoProfileOnionReceiveRuntimeState("receiving");
  updateLocalPrivateRouteCodeUi(input);
  setText(fields.productionTwoProfileWarning, t("receiveStarted"));
  setChatDeliveryNoticeByKey("chatNoticeReceiving", "success", input);
  setText(fields.productionTwoProfileProfiles, currentLanguage === "ko" ? `내 ID=${profileA}` : `local=${profileA}`);
  setText(fields.productionTwoProfileSession, t("receiveUsingLocalRoom"));
  setText(fields.productionTwoProfileMessageState, t("receiveWaiting"));
  setText(
    fields.productionTwoProfileBoundary,
    productionTwoProfileOnionReceiveBackendBoundary(backendLoop),
  );
  applyProductionActionState();
  renderRoomIdentityBar(input, true);
  renderSavedInviteRooms();
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

function rememberProductionTwoProfileOnionReceiveRuntimeState(runtimeState, result = null) {
  productionTwoProfileOnionReceiveMode.runtimeState = runtimeState;
  productionTwoProfileOnionReceiveMode.runtimeLabel = result?.runtime_label || "";
  return productionOnionReceiveRuntimeView(productionTwoProfileOnionReceiveMode, result);
}

function productionTwoProfileOnionReceiveBackendBoundary(backendLoop) {
  return `backend_enabled=${backendLoop.enabled} worker=${backendLoop.worker_running} stop_requested=${backendLoop.stop_requested} stop_confirmed=${backendLoop.stop_confirmed} profile_selected=${backendLoop.profile_selected} in_flight=${backendLoop.receive_attempt_in_flight} attempts=${backendLoop.attempt_count} generation=${backendLoop.generation} worker_starts=${backendLoop.worker_start_count ?? 0} duplicate_blocks=${backendLoop.duplicate_start_block_count ?? 0} import_seq=${backendLoop.import_sequence} message_imports=${backendLoop.message_import_count ?? 0} endpoint_updates=${backendLoop.endpoint_update_count ?? 0} active_after_import=${backendLoop.active_after_import} continues_after_import=${backendLoop.continues_after_import} multi_message_ready=${backendLoop.multi_message_receive_ready} restart_isolated=${backendLoop.restart_generation_isolated} wait_cancellable=${backendLoop.retry_wait_cancellable} runtime_state=${backendLoop.runtime_state || "unknown"} last_started=${backendLoop.last_attempt_started} last_succeeded=${backendLoop.last_attempt_succeeded} endpoint_update=${backendLoop.last_endpoint_update_applied} last_network=${backendLoop.last_network_io_attempted} last_accept=${backendLoop.last_stream_accept_attempted} last_stream=${backendLoop.last_stream_read_write_attempted} last_envelope=${backendLoop.last_envelope_io_opened} last_runtime=${backendLoop.last_runtime_messaging_enabled} failure=${backendLoop.last_failure_kind} retryable=${backendLoop.last_failure_retryable} next=${backendLoop.last_next_blocker || "none"} explicit_start=${backendLoop.explicit_user_start_required} duplicate=${backendLoop.duplicate_loop_blocked} app_launch_network=${backendLoop.starts_network_on_app_launch} owner_profile_bound=${backendLoop.owner_profile_bound === true} owner_matches_receive=${backendLoop.owner_matches_receive_profile === true} raw_profile=${backendLoop.raw_profile_returned} passphrase=${backendLoop.passphrase_retained} key_material=${backendLoop.key_material_exposed} network=${backendLoop.network_io_attempted} transport=${backendLoop.transport_io_opened} runtime=${backendLoop.runtime_messaging_enabled}`;
}

function productionTwoProfileOnionReceiveImportSummary(refreshPlan) {
  const parts = [];
  if (refreshPlan.newMessageImportCount > 0) {
    parts.push(
      currentLanguage === "ko"
        ? `메시지 ${refreshPlan.newMessageImportCount}개`
        : `${refreshPlan.newMessageImportCount} message${refreshPlan.newMessageImportCount === 1 ? "" : "s"}`,
    );
  }
  if (refreshPlan.newEndpointUpdateCount > 0) {
    parts.push(
      currentLanguage === "ko"
        ? `상대 주소 갱신 ${refreshPlan.newEndpointUpdateCount}건`
        : `${refreshPlan.newEndpointUpdateCount} endpoint update${refreshPlan.newEndpointUpdateCount === 1 ? "" : "s"}`,
    );
  }
  if (parts.length === 0 && refreshPlan.newImportCount > 0) {
    parts.push(
      currentLanguage === "ko"
        ? `수신 이벤트 ${refreshPlan.newImportCount}건`
        : `${refreshPlan.newImportCount} import event${refreshPlan.newImportCount === 1 ? "" : "s"}`,
    );
  }
  return parts.length > 0
    ? parts.join(currentLanguage === "ko" ? ", " : " and ")
    : currentLanguage === "ko"
      ? "새 수신 없음"
      : "no new imports";
}

function productionTwoProfileOnionReceiveUserNotice(refreshPlan) {
  const eventText = t(refreshPlan.messageImported ? "chatNoticeReceived" : "chatNoticeEndpointUpdated");
  const importSummary = productionTwoProfileOnionReceiveImportSummary(refreshPlan);
  const hasMultipleImports =
    refreshPlan.newMessageImportCount > 1 ||
    refreshPlan.newEndpointUpdateCount > 1 ||
    (refreshPlan.newImportCount > 1 && importSummary);
  return hasMultipleImports
    ? `${eventText} (${importSummary}). ${t("receiveStillListening")}`
    : `${eventText} ${t("receiveStillListening")}`;
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
    productionTwoProfileOnionReceiveMode.ownerProfileBound = backendLoop.owner_profile_bound === true;
    productionTwoProfileOnionReceiveMode.ownerMatchesReceiveProfile =
      backendLoop.owner_matches_receive_profile !== false;
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
    const runtimeResult = refreshPlan.transcriptChanged
      ? { runtime_label: refreshPlan.messageImported ? "New message received" : "Peer address updated" }
      : backendLoop;
    const currentInput = productionTwoProfileInput();
    const pendingNoticeBeforeReceiveRefresh = chatDeliveryPendingOutboundSnapshot(currentInput);
    const receivingCurrentRoom = productionTwoProfileReceiveMatchesInput(currentInput);
    const runtimeView = receivingCurrentRoom
      ? setProductionTwoProfileOnionReceiveRuntimeState(runtimeState, runtimeResult)
      : rememberProductionTwoProfileOnionReceiveRuntimeState(runtimeState, runtimeResult);
    if (receivingCurrentRoom) {
      setText(
        fields.productionTwoProfileMessageState,
        localizedChatStatus(runtimeView.label),
      );
      if (runtimeState === "failed-retryable") {
        const receiveFailureMessage = productionOnionReceiveFailureMessage(backendLoop);
        setText(fields.productionTwoProfileWarning, localizedReceiveFailureMessage(receiveFailureMessage));
        const receiveNotice = chatNoticeForSendReceiveText(receiveFailureMessage) ??
          chatNoticeForProductionState("Message listening will retry") ?? {
            key: "receiveRetrying",
            tone: "warning",
          };
        setChatDeliveryNoticeByKey(receiveNotice.key, receiveNotice.tone, currentInput);
      } else if (refreshPlan.transcriptChanged) {
        setText(fields.productionTwoProfileWarning, productionTwoProfileOnionReceiveUserNotice(refreshPlan));
        setChatDeliveryNoticeByKey(
          refreshPlan.messageImported ? "chatNoticeReceived" : "chatNoticeEndpointUpdated",
          "success",
          currentInput,
        );
      } else if (productionTwoProfileReceiveRuntimeMismatched(currentInput)) {
        setText(fields.productionTwoProfileWarning, t("receiveRuntimeMismatch"));
        setChatDeliveryNoticeByKey("receiveRuntimeMismatch", "warning", currentInput);
      } else if (runtimeState === "receiving") {
        setText(fields.productionTwoProfileWarning, t("receiveStarted"));
      }
      setText(fields.productionTwoProfileBoundary, productionTwoProfileOnionReceiveBackendBoundary(backendLoop));
      renderRoomIdentityBar(currentInput, twoProfileSessionsReadyForInput(currentInput));
      renderRoomStatusSummary(currentInput);
    }
    if (refreshPlan.transcriptChanged) {
      productionTwoProfileOnionReceiveMode.lastProcessedImportSequence = refreshPlan.importSequence;
      productionTwoProfileOnionReceiveMode.lastProcessedMessageImportCount = refreshPlan.messageImportCount;
      productionTwoProfileOnionReceiveMode.lastProcessedEndpointUpdateCount = refreshPlan.endpointUpdateCount;
      if (!receivingCurrentRoom) {
        await refreshSavedInviteRoomMetadataForFingerprint(
          productionTwoProfileOnionReceiveMode.roomFingerprint,
          {
            preserveUpdatedAt: refreshPlan.messageImported !== true,
            refreshSessionStatus: refreshPlan.endpointUpdated === true,
          },
        );
      } else {
        await loadProductionTwoProfileTranscript({
          quiet: true,
          refreshSessionStatus: refreshPlan.endpointUpdated === true,
          suppressRouteReadinessNoticeRefresh: refreshPlan.endpointUpdated === true,
          input: currentInput,
        });
        if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
          renderSavedInviteRooms();
          return;
        }
        if (refreshPlan.messageImported) {
          const replySelected = selectLatestReceivedReplyForProfile(productionTwoProfileOnionReceiveMode.profile, {
            focusReply: "none",
          });
          if (replySelected) {
            setText(fields.productionTwoProfileWarning, t("replyReadyAfterReceive"));
            setChatDeliveryNoticeByKey("replyReadyAfterReceive", "success", currentInput);
          }
        }
        if (refreshPlan.endpointUpdated) {
          if (currentInput.profileA && currentInput.profileB && currentInput.profileA !== currentInput.profileB && currentInput.passphrase) {
            const status = await invoke("production_two_profile_session_status", {
              profileA: currentInput.profileA,
              profileB: currentInput.profileB,
              passphrase: currentInput.passphrase,
            });
            if (!twoProfileTranscriptInputStillCurrent(currentInput)) {
              renderSavedInviteRooms();
              return;
            }
            rememberTwoProfileSessionStatus(currentInput, status);
            renderProductionTwoProfileSessionStatusResult(status);
            renderRoomIdentityBar(currentInput, twoProfileSessionsReadyForInput(currentInput));
            showReceiveEndpointUpdateRecoveryNotice(currentInput, pendingNoticeBeforeReceiveRefresh, {
              allowRouteReadiness: !refreshPlan.messageImported,
            });
          }
        }
        refreshCurrentRoomAfterReceiveImport(refreshPlan, currentInput);
      }
    }
    if (!backendLoop.enabled && !backendLoop.worker_running) {
      const receiveOwnerInput = productionTwoProfileOnionReceiveOwnerInput(currentInput);
      markProductionTwoProfileOnionReceiveStopped(backendLoop, {
        silent: !receivingCurrentRoom,
        input: receiveOwnerInput,
      });
      if (receivingCurrentRoom) {
        setChatDeliveryNoticeByKey("chatNoticeReceiveStopped", "muted", currentInput);
      }
      return;
    }
    if (backendLoop.enabled && !productionTwoProfileOnionReceiveMode.stopRequested) {
      scheduleProductionTwoProfileOnionReceiveStatusPoll();
    }
  } catch (error) {
    setProductionTwoProfileState("Message listening failed");
    productionTwoProfileOnionReceiveMode.runtimeState = "failed-retryable";
    setText(fields.productionTwoProfileWarning, t("receiveStatusFailed"));
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

function markProductionTwoProfileOnionReceiveStopped(backendLoop = null, options = {}) {
  const stoppedInput = Object.prototype.hasOwnProperty.call(options, "input")
    ? options.input
    : productionTwoProfileOnionReceiveOwnerInput();
  const nextGeneration = Math.max(
    productionTwoProfileOnionReceiveMode.generation,
    Number.parseInt(backendLoop?.generation ?? 0, 10) || 0,
  );
  if (stoppedInput && privateRouteRoomKey(stoppedInput)) {
    rememberLocalPrivateRouteLifecycle(stoppedInput, {
      state: "stopped",
      endpoint: routeMapValueForRoom(activeLocalPrivateRouteCodesByRoom, stoppedInput) ||
        routeMapValueForRoom(localPrivateRouteCodesByRoom, stoppedInput, localPrivateRouteCodesStorageKey),
      generation: nextGeneration,
    });
  }
  productionTwoProfileOnionReceiveMode = {
    enabled: false,
    roomFingerprint: "",
    profile: "",
    passphrase: "",
    timer: null,
    attempt: backendLoop?.attempt_count ?? 0,
    inFlight: false,
    stopRequested: false,
    runtimeState: "stopped",
    runtimeLabel: "Message listening stopped",
    silentStop: false,
    lastProcessedImportSequence: productionTwoProfileOnionReceiveMode.lastProcessedImportSequence,
    lastProcessedMessageImportCount: productionTwoProfileOnionReceiveMode.lastProcessedMessageImportCount,
    lastProcessedEndpointUpdateCount: productionTwoProfileOnionReceiveMode.lastProcessedEndpointUpdateCount,
    generation: nextGeneration,
    ownerProfileBound: false,
    ownerMatchesReceiveProfile: true,
  };
  if (options.silent === true) {
    rememberProductionTwoProfileOnionReceiveRuntimeState("stopped");
  } else {
    setProductionTwoProfileOnionReceiveRuntimeState("stopped");
  }
}

async function pollProductionTwoProfileOnionReceiveStopConfirmation() {
  const silent = productionTwoProfileOnionReceiveMode.silentStop === true;
  let receiveStopStateChanged = false;
  try {
    const backendLoop = await invoke("production_onion_receive_loop_status");
    if (!silent) {
      setText(fields.productionTwoProfileBoundary, productionTwoProfileOnionReceiveBackendBoundary(backendLoop));
      setText(
        fields.productionTwoProfileMessageState,
        backendLoop.stop_confirmed ? t("receiveStopped") : t("receiveStopping"),
      );
    }
    if (!backendLoop.stop_confirmed) {
      scheduleProductionTwoProfileOnionReceiveStopConfirmation();
    } else {
      const receiveOwnerInput = productionTwoProfileOnionReceiveOwnerInput();
      markProductionTwoProfileOnionReceiveStopped(backendLoop, {
        silent,
        input: receiveOwnerInput,
      });
      receiveStopStateChanged = true;
      if (!silent) {
        setText(fields.productionTwoProfileMessageState, t("receiveStopped"));
      }
    }
  } catch (error) {
    productionTwoProfileOnionReceiveMode = {
      ...productionTwoProfileOnionReceiveMode,
      stopRequested: false,
      runtimeState: "failed-retryable",
      runtimeLabel: "Message listening stop failed",
    };
    receiveStopStateChanged = true;
    if (!silent) {
      setText(fields.productionTwoProfileWarning, t("receiveStopFailed"));
      setChatDeliveryNoticeByKey("receiveStopFailed", "warning", productionTwoProfileInput());
      setText(fields.productionTwoProfileBoundary, `Backend receive loop stop confirmation failed without returning secrets. ${error}`);
    }
  } finally {
    if (receiveStopStateChanged) {
      renderSavedInviteRooms();
      refreshReceiveStopCompletedNotice(productionTwoProfileInput());
    }
    applyProductionActionState();
  }
}

function stopProductionTwoProfileOnionReceiveForInput(input, options) {
  const targetInput = input ?? productionTwoProfileInput();
  const stopOptions = options ?? {};
  const silent = stopOptions.silent === true;
  if (!productionTwoProfileReceiveMatchesInput(targetInput)) {
    if (!silent) {
      setProductionTwoProfileState("Message listening active in another room");
      setText(fields.productionTwoProfileWarning, t("receiveOtherRoomActive"));
      setChatDeliveryNoticeByKey("receiveOtherRoomActive", "warning", targetInput);
      applyProductionActionState();
    }
    return;
  }
  const profile = productionTwoProfileOnionReceiveMode.profile;
  clearPrivateRouteFollowupForRoom(targetInput);
  rememberReceiveIntentForRoom(targetInput, false);
  rememberLocalPrivateRouteLifecycle(targetInput, {
    state: "stopped",
    endpoint: currentActiveLocalPrivateRouteCode(targetInput) ||
      routeMapValueForRoom(localPrivateRouteCodesByRoom, targetInput, localPrivateRouteCodesStorageKey),
    generation: productionTwoProfileOnionReceiveMode.generation,
  });
  clearProductionTwoProfileOnionReceiveTimer();
  productionTwoProfileOnionReceiveMode = {
    ...productionTwoProfileOnionReceiveMode,
    enabled: true,
    profile,
    passphrase: "",
    timer: null,
    stopRequested: true,
    runtimeState: "stopped",
    runtimeLabel: "Message listening stopping",
    silentStop: silent,
  };
  if (silent) {
    rememberProductionTwoProfileOnionReceiveRuntimeState("stopped");
  } else {
    setProductionTwoProfileOnionReceiveRuntimeState("stopped");
  }
  updateLocalPrivateRouteCodeUi(productionTwoProfileInput());
  if (!silent) {
    setText(fields.productionTwoProfileWarning, profile ? t("receiveStopPending") : t("receiveStopped"));
    setText(fields.productionTwoProfileMessageState, t("receiveStopping"));
  }
  applyProductionActionState();
  renderSavedInviteRooms();
  invoke("production_onion_receive_loop_stop")
    .then((backendLoop) => {
      if (!silent) {
        setText(
          fields.productionTwoProfileBoundary,
          productionTwoProfileOnionReceiveBackendBoundary(backendLoop),
        );
      }
      if (!backendLoop.stop_confirmed) {
        scheduleProductionTwoProfileOnionReceiveStopConfirmation();
      } else {
        markProductionTwoProfileOnionReceiveStopped(backendLoop, {
          silent,
          input: targetInput,
        });
        if (!silent) {
          setText(fields.productionTwoProfileMessageState, t("receiveStopped"));
          setText(fields.productionTwoProfileWarning, t("receiveStopped"));
        }
        renderSavedInviteRooms();
        refreshReceiveStopCompletedNotice(productionTwoProfileInput());
      }
    })
    .catch((error) => {
      productionTwoProfileOnionReceiveMode = {
        ...productionTwoProfileOnionReceiveMode,
        stopRequested: false,
        runtimeState: "failed-retryable",
        runtimeLabel: "Message listening stop failed",
      };
      if (!silent) {
        setText(fields.productionTwoProfileWarning, t("receiveStopFailed"));
        setText(fields.productionTwoProfileBoundary, `Backend receive loop stop failed without returning secrets. ${error}`);
      }
      applyProductionActionState();
      renderSavedInviteRooms();
    });
  return true;
}

function stopProductionTwoProfileOnionReceive() {
  stopProductionTwoProfileOnionReceiveForInput(productionTwoProfileInput());
}

async function runProductionTwoProfileRoundtrip() {
  const input = productionTwoProfileInput();
  const { profileA, profileB, passphrase, messageTtlSeconds } = input;
  let postBusyFocus = null;
  if (twoProfileInviteCodeModeActive()) {
    await openInviteRoomFromToken();
    return;
  }
  if (!messageRetentionPolicyReady()) {
    setProductionTwoProfileState("Connection setup blocked");
    setText(fields.productionTwoProfileWarning, messageRetentionPolicyBlocker());
    applyProductionActionState();
    return;
  }
  if (!messageTtlSeconds) {
    setProductionTwoProfileState("Connection setup blocked");
    setText(fields.productionTwoProfileWarning, messageTtlInputBlocker());
    applyProductionActionState();
    return;
  }
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setProductionTwoProfileState("Connection setup needs input");
    setText(fields.productionTwoProfileWarning, t("inputRequiredSetup"));
    return;
  }

  setProductionTwoProfileState("Connection setup running");
  setText(fields.productionTwoProfileWarning, t("setupRunningWarning"));
  setText(fields.productionTwoProfileProfiles, t("setupProfilesWaiting"));
  setText(fields.productionTwoProfileSession, t("setupSessionWaiting"));
  setText(
    fields.productionTwoProfileMessageState,
    currentLanguage === "ko" ? "메시지 없이 채팅방을 준비하는 중" : "Preparing room without sending a message",
  );
  setText(fields.productionTwoProfileBoundary, t("setupBoundaryWaiting"));
  setProductionFollowupActions(false, t("setupFollowupLocked"));
  setTwoProfileRoundtripBusy(input);
  applyProductionActionState();
  if (fields.runProductionTwoProfileRoundtrip) {
    fields.runProductionTwoProfileRoundtrip.disabled = true;
  }
  try {
    const result = await invokeInviteRoomSetup({ profileA, profileB, passphrase });
    let retentionPreferenceWarning = null;
    try {
      await saveProductionMessageRetentionPreference(profileA, passphrase, messageTtlSeconds);
    } catch (error) {
      retentionPreferenceWarning = `Roundtrip completed, but retention preference was not saved: ${String(error)}`;
    }
    setProductionTwoProfileState("Connection setup completed");
    const view = renderProductionTwoProfileRoomSetupResult(result);
    if (view.canContinue) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false, input });
      setText(
        fields.productionTwoProfileWarning,
        currentLanguage === "ko"
          ? "채팅방을 만들었습니다. 확인 문구를 비교한 뒤 메시지를 보낼 수 있습니다."
          : "Room created. Compare the verification phrase before sending a message.",
      );
      postBusyFocus = "verify-safety";
    } else {
      setText(fields.productionTwoProfileWarning, result.warning);
    }
    if (retentionPreferenceWarning) {
      setText(fields.productionTwoProfileWarning, retentionPreferenceWarning);
    }
    await loadProductionProfileList();
  } catch (error) {
    setProductionTwoProfileState("Connection setup failed");
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("roundtrip", error));
    setText(fields.productionTwoProfileProfiles, t("statusFailed"));
    setText(fields.productionTwoProfileSession, t("statusFailed"));
    setText(fields.productionTwoProfileMessageState, t("statusFailed"));
    setText(fields.productionTwoProfileBoundary, t("statusFailed"));
    setProductionFollowupActions(false, t("setupRetryHint"));
  } finally {
    clearTwoProfileRoundtripBusy(input);
    if (fields.runProductionTwoProfileRoundtrip) {
      fields.runProductionTwoProfileRoundtrip.disabled = false;
    }
    applyProductionActionState();
    focusAfterProductionBusyAction(postBusyFocus);
  }
}

async function runProductionTwoProfileMessageRoundtrip() {
  const input = productionTwoProfileInput();
  const { profileA, profileB, passphrase, message, messageTtlSeconds } = input;
  const roomInput = twoProfileRoomIdentityInput(input);
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
      t("inputRequiredMessage"),
    );
    return;
  }
  if (!twoProfileSafetyConfirmedForInput(roomInput)) {
    setProductionTwoProfileState("Verification required");
    setText(fields.productionTwoProfileWarning, t("sendLockedUntilVerified"));
    applyProductionActionState();
    return;
  }

  setProductionTwoProfileState("Message send running");
  setText(fields.productionTwoProfileWarning, t("messageRunningWarning"));
  setText(fields.productionTwoProfileProfiles, t("messageProfilesWaiting"));
  setText(fields.productionTwoProfileSession, t("messageSessionWaiting"));
  setText(fields.productionTwoProfileMessageState, t("setupMessageWaiting"));
  setText(fields.productionTwoProfileBoundary, t("setupBoundaryWaiting"));
  setProductionFollowupActions(false, t("messageFollowupLocked"));
  setTwoProfileMessageRoundtripBusy(input);
  applyProductionActionState();
  try {
    const { result, messageNumber, stillCurrent } = await saveInviteRoomOutboundMessage({
      ...roomInput,
      profileA,
      profileB,
      passphrase,
      message,
      messageTtlSeconds,
    });
    if (!stillCurrent || !twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Message saved");
    setText(fields.productionTwoProfileWarning, result.warning);
    await completeInviteRoomOutboundDelivery(input, messageNumber);
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    await loadProductionProfileList();
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    setProductionTwoProfileState("Message send failed");
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("stored-message", error));
    setText(fields.productionTwoProfileProfiles, t("messageProfilesFailed"));
    setText(fields.productionTwoProfileSession, t("messageSessionFailed"));
    setText(fields.productionTwoProfileMessageState, t("messageNotSent"));
    setText(fields.productionTwoProfileBoundary, t("boundaryFailedNoPath"));
    setProductionFollowupActions(false, t("messageRetryHint"));
  } finally {
    clearTwoProfileMessageRoundtripBusy(input);
    applyProductionActionState();
  }
}

async function runProductionTwoProfileComposerPrimaryAction() {
  const input = productionTwoProfileInput();
  const intent = twoProfileComposerPrimaryIntent({
    input,
    busy: productionBusyActionBlocksInput(input),
    sessionsReady: twoProfileSessionsReadyForInput(input),
    safetyConfirmed: twoProfileSafetyConfirmedForInput(input),
    manualNetworkPermission: manualNetworkPermissionEnabled(),
    peerEndpointState: twoProfilePeerEndpointState(input),
  });
  if (intent.action === "enable-private-delivery") {
    rememberPrivateRouteFollowup(input.message ? "send-draft" : "receive", input);
    enablePrivateDeliveryPermission({ preserveFollowup: true });
    return;
  }
  if (intent.action === "prepare-private-route") {
    rememberPrivateRouteFollowup(input.message ? "send-draft" : "receive", input);
    setChatDeliveryNoticeByKey("privateDeliveryRouteNeeded", "muted", input);
    await preparePrivateDeliveryRoute({ input, allowRetryRecovery: false });
    return;
  }
  if (intent.action === "refresh-endpoint") {
    rememberPrivateRouteFollowup(input.message ? "send-draft" : "receive", input);
    setChatDeliveryNoticeByKey("chatNoticeRefreshAddress", "warning", input);
    await preparePrivateDeliveryRoute({ input, forceRefresh: true, allowRetryRecovery: false });
    return;
  }
  if (intent.action === "start-receiving") {
    setChatDeliveryNoticeByKey("chatNoticeReceiveRestart", "success", input);
    await startProductionTwoProfileOnionReceive();
    return;
  }
  if (intent.action === "stop-receiving") {
    setChatDeliveryNoticeByKey("receiveRuntimeMismatch", "warning", input);
    stopProductionTwoProfileOnionReceive();
    return;
  }
  if (intent.action === "wait-receive-stop") {
    showSavedInviteRoomReceiveStopPending();
    return;
  }
  if (intent.action === "verify") {
    setChatDeliveryNoticeByKey("sendLockedUntilVerified", "warning", input);
    focusSafetyConfirmation();
    return;
  }
  await runProductionTwoProfileMessageRoundtrip();
}

async function runProductionTwoProfileRealOnionRoundtrip() {
  const input = productionTwoProfileInput();
  const { profileA, profileB, passphrase, message, messageTtlSeconds } = input;
  const roomInput = twoProfileRoomIdentityInput(input);
  const manualNetworkPermission = manualNetworkPermissionEnabled();
  if (!profileA || !profileB || profileA === profileB || !passphrase || !message || !messageTtlSeconds) {
    setProductionTwoProfileState("Real onion roundtrip needs input");
    setText(fields.productionTwoProfileWarning, t("privateDeliveryNeedsMessage"));
    return;
  }
  if (!manualNetworkPermission) {
    openPrivateDeliverySettings(input);
    return;
  }

  const previousRealOnionResult = latestRealOnionFieldTestResult(roomInput);
  const previousRealOnionRecovery = latestRealOnionRecoveryForInput(roomInput);
  const previousRealOnionRunAction = realOnionRecoveryRunAction(previousRealOnionRecovery);
  if (previousRealOnionRunAction.inspectDiagnostics) {
    setProductionTwoProfileState("Private delivery needs review");
    setText(fields.productionTwoProfileWarning, t(previousRealOnionRunAction.noticeKey));
    setChatDeliveryNoticeByKey(previousRealOnionRunAction.noticeKey, "warning", input);
    focusLocalDiagnostic();
    refreshFieldTestReport();
    return;
  }
  if (previousRealOnionRunAction.opensNetworkSettings) {
    openPrivateDeliveryBridgeSettings(previousRealOnionRecovery, input);
    if (previousRealOnionResult) {
      const userView = localizedTwoProfileUserView(productionTwoProfileRealOnionUserView(previousRealOnionResult));
      setText(fields.productionTwoProfileProfiles, userView.profiles);
      setText(fields.productionTwoProfileSession, userView.session);
      setText(fields.productionTwoProfileMessageState, userView.message);
      setText(fields.productionTwoProfileBoundary, userView.boundary);
    }
    refreshFieldTestReport();
    return;
  }
  const routeReadiness = externalPeerSendReadiness(roomInput, {
    allowMissingMessage: true,
    latestOnionOutbound: null,
  });
  if (!routeReadiness.ready) {
    showRealOnionRouteReadinessBlock(routeReadiness, roomInput);
    applyProductionActionState();
    return;
  }
  const bootstrapRetryLimit =
    previousRealOnionRecovery.action === "retry-bootstrap"
      ? 3
      : previousRealOnionRecovery.action === "bootstrap-cancelled"
      ? 2
      : 1;
  const previousPendingNotice = chatDeliveryPendingOutboundSnapshot(input);
  latestProductionTwoProfileRealOnionWaitCanceledFingerprints.delete(twoProfileSessionStatusFingerprint(roomInput));
  setProductionTwoProfileState("Private delivery running");
  setText(fields.productionTwoProfileWarning, t("chatNoticeSending"));
  setText(fields.productionTwoProfileProfiles, localizedTwoProfileUserViewText("Room is being prepared."));
  setText(fields.productionTwoProfileSession, localizedTwoProfileUserViewText("Connecting both devices."));
  setText(fields.productionTwoProfileMessageState, localizedTwoProfileUserViewText("Trying private delivery."));
  setText(fields.productionTwoProfileBoundary, localizedTwoProfileUserViewText("Private delivery is running after your explicit action."));
  setProductionFollowupActions(false, t("privateDeliveryFollowupLocked"));
  const realOnionRunId = (productionTwoProfileRealOnionRunSequence += 1);
  productionBusyAction = "two-profile-real-onion-roundtrip";
  activeProductionTwoProfileRealOnionInput = { ...roomInput, runId: realOnionRunId };
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
      bootstrapRetryLimit,
    });
    rememberRealOnionFieldTestResult(roomInput, result);
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    const view = productionTwoProfileRealOnionResultView(result);
    const userView = localizedTwoProfileUserView(productionTwoProfileRealOnionUserView(result));
    const realOnionRecovery = productionTwoProfileRealOnionRecoveryPlan(result);
    const realOnionNoticeKey = realOnionRecoveryNoticeKey(realOnionRecovery);
    const realOnionNotice = view.complete
      ? { key: "userDeliveryCompletedNoDetails", tone: "success" }
      : realOnionNoticeKey
        ? { key: realOnionNoticeKey, tone: "warning" }
        : chatNoticeForSendReceiveText(result.next_blocker || result.warning || userView.message) ?? {
          key: "sendFailedGeneric",
          tone: "warning",
        };
    setProductionTwoProfileState(userView.state);
    setText(fields.productionTwoProfileWarning, t(realOnionNotice.key));
    setChatDeliveryNoticeByKey(realOnionNotice.key, realOnionNotice.tone, input);
    setText(fields.productionTwoProfileProfiles, userView.profiles);
    setText(fields.productionTwoProfileSession, userView.session);
    setText(fields.productionTwoProfileMessageState, userView.message);
    setText(fields.productionTwoProfileBoundary, userView.boundary);
    rememberTwoProfileReadySessionFromRoundtrip(roomInput, result);
    const latestRoundtripMessageNumber = Number.parseInt(
      result.second_message_number || result.message_number,
      10,
    );
    if (
      realOnionResultConfirmsExternalPeerDelivery(result) &&
      Number.isInteger(latestRoundtripMessageNumber) &&
      latestRoundtripMessageNumber > 0
    ) {
      latestProductionTwoProfileSuccess = {
        profileA: result.sender_profile || profileA,
        profileB: result.receiver_profile || profileB,
        messageLength: message.length,
        messageNumber: latestRoundtripMessageNumber,
        roomFingerprint: twoProfileSessionStatusFingerprint(input),
        fingerprint: twoProfileInputFingerprint(input),
      };
    }
    if (view.touchedTranscript) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: true, input });
      if (!twoProfileTranscriptInputStillCurrent(input)) {
        return;
      }
      restoreChatDeliveryPendingOutboundSnapshot(previousPendingNotice, input);
    }
    if (view.complete) {
      if (fields.productionTwoProfileMessage) {
        fields.productionTwoProfileMessage.value = "";
        renderProductionTwoProfileDirection(input);
      }
      const resumeProfile = productionTwoProfileRealOnionResumeProfile(result, { profileB });
      selectLatestReceivedReplyForProfile(resumeProfile, { focusReply: "none" });
    }
  } catch (error) {
    const syntheticFailure = productionTwoProfileRealOnionSyntheticFailureResult(
      error,
      { profileA, profileB, bootstrapRetryLimit },
      manualNetworkPermission,
    );
    rememberRealOnionFieldTestResult(roomInput, syntheticFailure);
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return;
    }
    const syntheticRecovery = productionTwoProfileRealOnionRecoveryPlan(syntheticFailure);
    const syntheticNoticeKey = realOnionRecoveryNoticeKey(syntheticRecovery);
    setProductionTwoProfileState("Private delivery failed");
    const detail = String(error ?? "");
    const redactedStage = detail.includes("redacted stage:")
      ? detail.split("redacted stage:").slice(1).join("redacted stage:").trim()
      : "";
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("real-onion-roundtrip", error));
    setText(
      fields.productionTwoProfileProfiles,
      redactedStage.includes("bootstrap")
        ? "Room is saved."
        : "Room setup did not finish.",
    );
    setText(
      fields.productionTwoProfileSession,
      redactedStage.includes("bootstrap")
        ? t("retryNetwork")
        : "Private delivery setup did not finish.",
    );
    setText(fields.productionTwoProfileMessageState, "Message was not delivered. Retry when private delivery is ready.");
    setText(
      fields.productionTwoProfileBoundary,
      "Failed without showing private details in the chat view.",
    );
    setChatDeliveryNoticeByKey(
      syntheticNoticeKey ||
        (redactedStage.includes("bootstrap") ? "fieldTestNextRetryNetwork" : "sendFailedGeneric"),
      "warning",
      input,
    );
    restoreChatDeliveryPendingOutboundSnapshot(previousPendingNotice, input);
  } finally {
    if (realOnionActiveRunMatches(realOnionRunId)) {
      clearProductionBusyAction("two-profile-real-onion-roundtrip");
      activeProductionTwoProfileRealOnionInput = null;
      if (fields.runProductionTwoProfileRealOnionRoundtrip) {
        fields.runProductionTwoProfileRealOnionRoundtrip.disabled = false;
      }
      applyProductionActionState();
    }
  }
}

async function cancelProductionTwoProfileRealOnionWait() {
  const input = productionTwoProfileInput();
  if (productionBusyAction === "two-profile-real-onion-roundtrip") {
    const activeInput = activeProductionTwoProfileRealOnionInput;
    if (!activeInput) {
      return false;
    }
    try {
      const result = await invoke("production_two_profile_real_onion_wait_cancel");
      if (result?.cancel_requested) {
        latestProductionTwoProfileRealOnionWaitCanceledFingerprints.add(twoProfileSessionStatusFingerprint(activeInput));
        if (!twoProfileTranscriptInputStillCurrent(activeInput)) {
          return true;
        }
        setProductionTwoProfileState("Private delivery wait cancel requested");
        setText(fields.productionTwoProfileWarning, t("networkWaitCancelRequested"));
        setText(fields.productionTwoProfileProfiles, localizedTwoProfileUserViewText("Room is saved."));
        setText(fields.productionTwoProfileSession, t("networkWaitCancelRequested"));
        setText(fields.productionTwoProfileMessageState, t("retryPrivateDeliveryHint"));
        setText(fields.productionTwoProfileBoundary, t("networkWaitCanceledBoundary"));
        setChatDeliveryNoticeByKey("networkWaitCancelRequested", "muted", activeInput);
        applyProductionActionState();
        refreshFieldTestReport();
        return true;
      }
    } catch {
      if (!twoProfileTranscriptInputStillCurrent(activeInput)) {
        return false;
      }
      setProductionTwoProfileState("Private delivery wait cancel failed");
      setText(fields.productionTwoProfileWarning, t("networkWaitCancelFailed"));
      applyProductionActionState();
      return false;
    }
  }
  const result = latestRealOnionFieldTestResult(input);
  const recovery = productionTwoProfileRealOnionRecoveryPlan(result);
  if (recovery.action !== "retry-bootstrap" || recovery.waitCancellable !== true) {
    setProductionTwoProfileState("Private delivery not waiting");
    setText(fields.productionTwoProfileWarning, t("networkWaitNotActive"));
    applyProductionActionState();
    refreshFieldTestReport();
    return false;
  }
  latestProductionTwoProfileRealOnionWaitCanceledFingerprints.add(twoProfileSessionStatusFingerprint(input));
  setProductionTwoProfileState("Private delivery wait canceled");
  setText(fields.productionTwoProfileWarning, t("networkWaitCanceledNotice"));
  setText(fields.productionTwoProfileProfiles, localizedTwoProfileUserViewText("Room is saved."));
  setText(fields.productionTwoProfileSession, t("networkWaitCanceled"));
  setText(fields.productionTwoProfileMessageState, t("retryPrivateDeliveryHint"));
  setText(fields.productionTwoProfileBoundary, t("networkWaitCanceledBoundary"));
  setChatDeliveryNoticeByKey("networkWaitCanceledNotice", "muted", input);
  applyProductionActionState();
  refreshFieldTestReport();
  return true;
}

async function runTwoProfilePrimaryActionFromCompose() {
  const input = productionTwoProfileInput();
  if (productionBusyActionBlocksInput(input)) {
    setProductionTwoProfileState("Connection action already running");
    setText(fields.productionTwoProfileWarning, "Wait for the active production action before sending again.");
    return;
  }

  applyProductionActionState();
  if (fields.runProductionTwoProfileMessageRoundtrip && !fields.runProductionTwoProfileMessageRoundtrip.disabled) {
    await runProductionTwoProfileComposerPrimaryAction();
    return;
  }
  if (fields.runProductionTwoProfileRoundtrip && !fields.runProductionTwoProfileRoundtrip.disabled) {
    await runProductionTwoProfileRoundtrip();
    return;
  }

  setProductionTwoProfileState("Send needs input");
  const readiness = twoProfilePrimaryReadiness(
    input,
    productionBusyActionBlocksInput(input),
    twoProfileSessionsReadyForInput(input),
    messageRetentionPolicyReady(),
  );
  setText(fields.productionTwoProfileWarning, readiness.message);
}

function handleTwoProfileMessageKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
    const node = event.currentTarget;
    const start = node.selectionStart ?? node.value.length;
    const end = node.selectionEnd ?? node.value.length;
    node.value = `${node.value.slice(0, start)}\n${node.value.slice(end)}`;
    node.selectionStart = start + 1;
    node.selectionEnd = start + 1;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
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

function renderProductionProductUnlockStatus(result) {
  const unlocked = result?.unlocked === true;
  const reason = result?.redacted_reason || "unknown";
  const profile = result?.profile ? ` profile=${result.profile}` : "";
  const expires = result?.expires_at_ms ? ` expires_at_ms=${result.expires_at_ms}` : "";
  setText(
    fields.productionProductUnlockState,
    `unlocked=${unlocked}${profile} reason=${reason} idle_auto_lock_seconds=${result?.idle_auto_lock_seconds ?? 60}${expires}`,
  );
  setText(
    fields.productionProfileBoundary,
    `store_path_returned=${result?.store_path_returned === true} passphrase_retained=${result?.passphrase_retained === true} key_material=${result?.key_material_exposed === true} raw_error=${result?.raw_storage_error_exposed === true} runtime=${result?.runtime_messaging_enabled === true}`,
  );
  if (fields.lockProductionProfile) {
    fields.lockProductionProfile.disabled = !unlocked || productionBusyAction !== null;
  }
  return unlocked;
}

async function checkProductionProductUnlockStatus() {
  try {
    const result = await invoke("production_product_unlock_status");
    renderProductionProductUnlockStatus(result);
    setText(fields.productionProfileWarning, result.warning);
    setProductionProfileState(result.unlocked ? "Profile unlocked" : "Profile locked");
    return result;
  } catch (error) {
    setProductionProfileState("Profile unlock status failed");
    setText(fields.productionProfileWarning, String(error));
    setText(fields.productionProductUnlockState, "status failed without exposing local path details");
    return null;
  }
}

async function lockProductionProfile() {
  try {
    const result = await invoke("production_product_lock");
    renderProductionProductUnlockStatus(result);
    setProductionProfileState("Profile locked");
    setText(fields.productionProfileWarning, result.warning);
    setText(fields.productionProfileStorage, "Locked");
    setText(fields.productionProfileIdentity, "Locked");
    return result;
  } catch (error) {
    setProductionProfileState("Profile lock failed");
    setText(fields.productionProfileWarning, String(error));
    return null;
  }
}

function dataLifecycleSummary(result) {
  return (
    `profiles=${result.profile_count ?? 0} transport=${result.transport_data_present === true} ` +
    `marker=${result.lifecycle_marker_present === true} backup_checked=${result.backup_exclusion_checked === true} ` +
    `backup=${result.backup_exclusion_verified === true} migration_v=${result.migration_current_version ?? 0} ` +
    `migration_marker=${result.migration_marker_present === true} forward_only=${result.forward_only_migration === true} ` +
    `destructive_blocked=${result.destructive_migration_blocked === true} rollback_marker=${result.rollback_marker_present === true} ` +
    `rollback_detection=${result.rollback_detection_ready === true} rollback_prevention=${result.rollback_prevention_claimed === true} ` +
    `wiped=${result.full_local_data_wiped === true}`
  );
}

function dataLifecycleBoundary(result) {
  return (
    `path_returned=${result.store_path_returned === true} passphrase_retained=${result.passphrase_retained === true} ` +
    `key_material=${result.key_material_exposed === true} secure_delete_claim=${result.secure_deletion_from_media_claimed === true} ` +
    `network_io=${result.network_io_attempted === true} transport_io=${result.transport_io_opened === true} ` +
    `runtime=${result.runtime_messaging_enabled === true}`
  );
}

async function checkProductionDataLifecycle() {
  setProductionProfileState("Data lifecycle checking");
  productionBusyAction = "data-lifecycle";
  applyProductionActionState();
  try {
    const result = await invoke("production_data_lifecycle_status");
    setProductionProfileState("Data lifecycle checked");
    setText(fields.productionProfileWarning, result.warning);
    setText(fields.productionDataLifecycle, dataLifecycleSummary(result));
    setText(fields.productionProfileBoundary, dataLifecycleBoundary(result));
    return result;
  } catch (error) {
    setProductionProfileState("Data lifecycle check failed");
    setText(fields.productionProfileWarning, String(error));
    setText(fields.productionDataLifecycle, "Failed");
    return null;
  } finally {
    clearProductionBusyAction("data-lifecycle");
    applyProductionActionState();
  }
}

async function prepareProductionDataLifecycle() {
  setProductionProfileState("Data lifecycle preparing");
  productionBusyAction = "data-lifecycle-prepare";
  applyProductionActionState();
  try {
    const result = await invoke("production_data_lifecycle_prepare");
    setProductionProfileState("Data lifecycle prepared");
    setText(fields.productionProfileWarning, result.warning);
    setText(fields.productionDataLifecycle, dataLifecycleSummary(result));
    setText(fields.productionProfileBoundary, dataLifecycleBoundary(result));
    return result;
  } catch (error) {
    setProductionProfileState("Data lifecycle prepare failed");
    setText(fields.productionProfileWarning, String(error));
    setText(fields.productionDataLifecycle, "Failed");
    return null;
  } finally {
    clearProductionBusyAction("data-lifecycle-prepare");
    applyProductionActionState();
  }
}

async function deleteProductionProfile() {
  const input = productionProfileInput();
  const confirmation = (fields.productionProfileDeleteConfirmation?.value ?? "").trim();
  if (!input.profile || confirmation !== input.profile) {
    setProductionProfileState("Profile delete needs confirmation");
    setText(fields.productionProfileWarning, "Type the exact profile name before deleting.");
    return null;
  }
  productionBusyAction = "profile-delete";
  setProductionProfileState("Profile deleting");
  applyProductionActionState();
  try {
    const result = await invoke("production_profile_delete", {
      profile: input.profile,
      confirmation,
    });
    setProductionProfileState(result.profile_deleted ? "Profile deleted" : "Profile not found");
    setText(fields.productionProfileWarning, result.warning);
    setText(
      fields.productionDataLifecycle,
      `profile_deleted=${result.profile_deleted} existed=${result.profile_existed_before_delete} exists_after=${result.profile_exists_after_delete} unlock_locked=${result.product_unlock_locked}`,
    );
    setText(
      fields.productionProfileBoundary,
      `path_returned=${result.store_path_returned} passphrase_required=${result.passphrase_required} passphrase_retained=${result.passphrase_retained} key_material=${result.key_material_exposed} secure_delete_claim=${result.secure_deletion_from_media_claimed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    resetProductionPairingView({ preserveTwoProfileStatus: true });
    resetProductionMessageView();
    await loadProductionProfileList();
    return result;
  } catch (error) {
    setProductionProfileState("Profile delete failed");
    setText(fields.productionProfileWarning, String(error));
    return null;
  } finally {
    clearProductionBusyAction("profile-delete");
    applyProductionActionState();
  }
}

async function wipeProductionLocalData() {
  const confirmation = (fields.productionFullWipeConfirmation?.value ?? "").trim();
  if (confirmation !== "WIPE LOCAL DATA") {
    setProductionProfileState("Local wipe needs confirmation");
    setText(fields.productionProfileWarning, "Type WIPE LOCAL DATA before wiping local app data.");
    return null;
  }
  productionBusyAction = "full-local-data-wipe";
  setProductionProfileState("Local data wiping");
  applyProductionActionState();
  try {
    const result = await invoke("production_full_local_data_wipe", { confirmation });
    resetProductionProfileView();
    resetProductionPairingView();
    resetProductionMessageView();
    setProductionProfileState(result.full_local_data_wiped ? "Local data wiped" : "Local wipe incomplete");
    setText(fields.productionProfileWarning, result.warning);
    setText(fields.productionDataLifecycle, dataLifecycleSummary(result));
    setText(fields.productionProfileBoundary, dataLifecycleBoundary(result));
    await loadProductionProfileList();
    return result;
  } catch (error) {
    setProductionProfileState("Local data wipe failed");
    setText(fields.productionProfileWarning, String(error));
    return null;
  } finally {
    clearProductionBusyAction("full-local-data-wipe");
    applyProductionActionState();
  }
}

async function unlockProductionProfile() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
  const twoProfileRefreshInput = productionTwoProfileInput();
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
    const productUnlock = await invoke("production_product_unlock", { profile, passphrase });
    renderProductionProductUnlockStatus(productUnlock);
    if (productUnlock.unlocked !== true) {
      setProductionProfileState("Profile unlock failed");
      setText(fields.productionProfileWarning, productUnlock.warning);
      setText(fields.productionProfileStorage, `Locked reason=${productUnlock.redacted_reason}`);
      setText(fields.productionProfileIdentity, "Not opened");
      return;
    }
    const result = await invoke("production_profile_unlock", { profile, passphrase });
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    const view = productionProfileUnlockView(result);
    setProductionProfileState("Profile unlocked");
    setText(fields.productionProfileWarning, result.warning);
    setText(fields.productionProfileStorage, view.storage);
    setText(fields.productionProfileIdentity, view.identity);
    setText(fields.productionProfileBoundary, view.boundary);
    await loadProductionMessageRetentionPreference(profile, passphrase, { quiet: true });
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    await loadProductionProfileList();
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    await restoreProductionSessionAfterUnlock(input);
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    await refreshTwoProfileSessionAfterProfileUnlock(profile, passphrase, twoProfileRefreshInput);
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setProductionProfileState("Profile unlock failed");
    setText(fields.productionProfileWarning, String(error));
    setText(fields.productionProfileStorage, "Failed");
    setText(fields.productionProfileIdentity, "Failed");
    setText(fields.productionProfileBoundary, "Failed");
  } finally {
    clearProductionBusyAction("profile-unlock");
    if (fields.unlockProductionProfile) {
      fields.unlockProductionProfile.disabled = false;
    }
    applyProductionActionState();
  }
}

async function refreshTwoProfileSessionAfterProfileUnlock(
  profile,
  passphrase,
  input = productionTwoProfileInput(),
) {
  const unlockedProfile = String(profile ?? "").trim().toLowerCase();
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    const result = await invokeInviteRoomSessionStatus(input);
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    rememberTwoProfileSessionStatus(input, result);
    renderProductionTwoProfileSessionStatusResult(result);
    if (result.both_ready_for_message_envelope) {
      await loadProductionTwoProfileTranscript({
        quiet: true,
        refreshSessionStatus: false,
        autoResume: true,
        input,
      });
      if (!twoProfileTranscriptInputStillCurrent(input)) {
        return false;
      }
      const resumeTarget = autoSelectTwoProfileResumeTarget(result);
      setProductionTwoProfileState(
        resumeTarget === "retry-send" || resumeTarget === "pending-review"
          ? "Resume needs review after profile unlock"
          : "Conversation resumed after profile unlock",
      );
      return true;
    }
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    setProductionTwoProfileState("Sessions incomplete after profile unlock");
    setText(fields.productionTwoProfileWarning, twoProfileSessionRebuildMessage(input));
    setProductionFollowupActions(true, `Next: ${twoProfileSessionRebuildMessage(input)}`);
    return false;
  } catch {
    return false;
  }
}

async function restoreProductionSessionAfterUnlock(input) {
  const { profile, passphrase } = input;
  let session;
  try {
    session = await invoke("production_session_state_check", { profile, passphrase });
  } catch {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    rememberProductionSessionState(input, null);
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

  if (!productionProfileInputStillCurrent(input)) {
    return;
  }
  const view = productionSessionStateView(session);
  rememberProductionSessionState(input, session);
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    renderProductionTranscriptEntries(profile, transcript.entries);
    setProductionMessageState("Stored transcript recovered");
    setText(fields.productionMessageWarning, transcriptRetentionWarning(transcript));
    setText(fields.productionMessageBoundary, transcriptBoundarySummary(transcript));
  } catch {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
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
  applyProductionActionState();
  setText(fields.productionPairingStorage, view.storage);
  setText(fields.productionPairingBoundary, view.boundary);
}

async function exportProductionPairingPayload() {
  const input = productionPairingInput();
  const { profile, passphrase, rendezvousEndpoint } = input;
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
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "rendezvousEndpoint"])) {
      return;
    }
    await applyProductionPairingPayloadExportResult(result);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "rendezvousEndpoint"])) {
      return;
    }
    setProductionPairingState("Pairing payload export failed");
    setText(fields.productionPairingWarning, String(error));
    if (fields.productionPairingPayload) {
      fields.productionPairingPayload.value = "";
    }
    setText(fields.productionPairingStorage, "Failed");
    setText(fields.productionPairingBoundary, "Failed");
  } finally {
    clearProductionBusyAction("pairing-payload");
    if (fields.exportProductionPairing) {
      fields.exportProductionPairing.disabled = false;
    }
    applyProductionActionState();
  }
}

async function saveProductionSessionDraft() {
  const input = productionPairingInput();
  const { profile, passphrase, localPayload, remotePayload, safetyConfirmed } = input;
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
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "localPayload", "remotePayload", "safetyConfirmed"])) {
      return;
    }
    const view = productionSessionDraftView(result);
    setProductionPairingState("Session draft saved");
    setText(fields.productionPairingWarning, result.warning);
    setText(fields.productionPairingSession, view.session);
    setText(fields.productionPairingStorage, view.storage);
    setText(fields.productionPairingBoundary, view.boundary);
    if (result.session_draft_present) {
      await checkProductionSessionState(input);
    }
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "localPayload", "remotePayload", "safetyConfirmed"])) {
      return;
    }
    setProductionPairingState("Session draft save failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionPairingSession, "Failed");
    setText(fields.productionPairingBoundary, "Failed");
  } finally {
    clearProductionBusyAction("session-draft");
    if (fields.saveProductionSessionDraft) {
      fields.saveProductionSessionDraft.disabled = false;
    }
    applyProductionActionState();
  }
}

function applyProductionPairingSafetyPreviewResult(result, input) {
  latestProductionPairingSafety = {
    fingerprint: pairingSafetyFingerprint(input),
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
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "localPayload", "remotePayload"])) {
      return;
    }
    applyProductionPairingSafetyPreviewResult(result, input);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "localPayload", "remotePayload"])) {
      return;
    }
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

async function checkProductionSessionState(input = productionPairingInput()) {
  const { profile, passphrase } = input;
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
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
      return;
    }
    const view = productionSessionStateView(result);
    rememberProductionSessionState(input, result);
    setProductionPairingState("Session state checked");
    setText(fields.productionPairingWarning, result.warning);
    setText(fields.productionPairingSession, view.session);
    setText(fields.productionPairingBoundary, view.pairingBoundary);
    setText(fields.productionMessageBoundary, view.messageBoundary);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
      return;
    }
    rememberProductionSessionState(input, null);
    setProductionPairingState("Session state check failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionPairingSession, "Failed");
  } finally {
    clearProductionBusyAction("session-state");
    if (fields.checkProductionSessionState) {
      fields.checkProductionSessionState.disabled = false;
    }
    applyProductionActionState();
  }
}

async function checkProductionSessionLifecycle(input = productionPairingInput()) {
  const { profile, passphrase } = input;
  if (!profile || !passphrase) {
    setProductionPairingState("Session lifecycle needs profile");
    setText(fields.productionPairingWarning, "Enter profile and passphrase.");
    return;
  }

  setProductionPairingState("Session lifecycle checking");
  productionBusyAction = "session-lifecycle";
  applyProductionActionState();
  if (fields.checkProductionSessionLifecycle) {
    fields.checkProductionSessionLifecycle.disabled = true;
  }
  try {
    const result = await invoke("production_session_lifecycle_status", { profile, passphrase });
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
      return;
    }
    const view = productionSessionLifecycleView(result);
    setProductionPairingState(
      result.session_resume_ready ? "Session lifecycle resumable" : "Session lifecycle incomplete",
    );
    setText(fields.productionPairingWarning, result.warning);
    setText(fields.productionSessionLifecycle, view.lifecycle);
    setText(fields.productionPairingBoundary, view.boundary);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
      return;
    }
    setProductionPairingState("Session lifecycle check failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionSessionLifecycle, "Failed");
  } finally {
    clearProductionBusyAction("session-lifecycle");
    if (fields.checkProductionSessionLifecycle) {
      fields.checkProductionSessionLifecycle.disabled = false;
    }
    applyProductionActionState();
  }
}

async function deleteProductionSessionLifecycle(input = productionPairingInput()) {
  const { profile, passphrase } = input;
  if (!profile || !passphrase) {
    setProductionPairingState("Session delete needs profile");
    setText(fields.productionPairingWarning, "Enter profile and passphrase.");
    return;
  }

  setProductionPairingState("Session lifecycle deleting");
  setText(
    fields.productionPairingWarning,
    "Deleting local session lifecycle records. Message data wipe is handled separately.",
  );
  productionBusyAction = "session-lifecycle-delete";
  applyProductionActionState();
  if (fields.deleteProductionSessionLifecycle) {
    fields.deleteProductionSessionLifecycle.disabled = true;
  }
  try {
    const result = await invoke("production_session_lifecycle_delete", { profile, passphrase });
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
      return;
    }
    const view = productionSessionLifecycleView(result);
    rememberProductionSessionState(input, null);
    setProductionPairingState(
      result.session_resume_closed ? "Session lifecycle deleted" : "Session lifecycle delete incomplete",
    );
    setText(fields.productionPairingWarning, result.warning);
    setText(fields.productionPairingSession, "Stored session no longer resumable");
    setText(fields.productionSessionLifecycle, view.lifecycle);
    setText(fields.productionPairingBoundary, view.boundary);
    setProductionMessageState("Message flow idle");
    setText(fields.productionMessageBoundary, view.boundary);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
      return;
    }
    setProductionPairingState("Session lifecycle delete failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionSessionLifecycle, "Failed");
  } finally {
    clearProductionBusyAction("session-lifecycle-delete");
    if (fields.deleteProductionSessionLifecycle) {
      fields.deleteProductionSessionLifecycle.disabled = false;
    }
    applyProductionActionState();
  }
}

async function checkProductionTwoProfileSessionStatus() {
  const input = productionTwoProfileInput();
  const { profileA, profileB, passphrase } = input;
  const sessionCheckInput = twoProfileRoomIdentityInput(input);
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    setText(
      fields.productionTwoProfileSessionStatus,
      currentLanguage === "ko"
        ? "초대 코드를 먼저 만들거나 붙여넣으세요."
        : "Create or paste an invite code first.",
    );
    setProductionTwoProfileState("Session check needs input");
    setText(
        fields.productionTwoProfileWarning,
        currentLanguage === "ko"
          ? "채팅방을 확인하려면 초대 코드를 먼저 만들거나 붙여넣으세요."
          : "Create or paste an invite code before checking the room.",
    );
    return;
  }

  setText(fields.productionTwoProfileSessionStatus, "Checking encrypted local stores");
  setProductionTwoProfileState("Sessions checking");
  setText(fields.productionTwoProfileWarning, "Checking the saved room on this device.");
  setTwoProfileSessionStatusBusy(sessionCheckInput);
  let postCheckFocus = null;
  applyProductionActionState();
  if (fields.checkProductionTwoProfileSessionStatus) {
    fields.checkProductionTwoProfileSessionStatus.disabled = true;
  }
  if (fields.checkProductionTwoProfileSessionStatusInline) {
    fields.checkProductionTwoProfileSessionStatusInline.disabled = true;
  }
  try {
    const result = await invokeInviteRoomSessionStatus(sessionCheckInput);
    rememberTwoProfileSessionStatus(sessionCheckInput, result);
    if (!twoProfileTranscriptInputStillCurrent(sessionCheckInput)) {
      return;
    }
    renderProductionTwoProfileSessionStatusResult(result);
    setText(fields.productionPairingWarning, result.warning);
    if (result.both_ready_for_message_envelope) {
      await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false, input: sessionCheckInput });
      startInviteRoomTranscriptRefresh(sessionCheckInput);
      const currentInput = productionTwoProfileInput();
      const hasDraft = Boolean(currentInput.message);
      const resumeTarget = autoSelectTwoProfileResumeTarget(result);
      if (resumeTarget === "retry-send" || resumeTarget === "pending-review") {
        setProductionTwoProfileState("Resume needs review");
        setText(
          fields.productionTwoProfileWarning,
          twoProfileResumeWarningForTarget(
            resumeTarget,
            "Room is ready. Continue the saved conversation.",
          ),
        );
      } else {
        setProductionTwoProfileState("Sessions ready");
        setText(
          fields.productionTwoProfileWarning,
          hasDraft
            ? "Room is ready. Send the message."
            : "Room is ready. Write a message to continue.",
        );
        postCheckFocus = hasDraft
          ? fields.runProductionTwoProfileMessageRoundtrip
          : fields.productionTwoProfileMessage;
      }
    } else {
      stopInviteRoomTranscriptRefresh();
      const currentInput = productionTwoProfileInput();
      setProductionTwoProfileState("Sessions incomplete");
      setText(fields.productionTwoProfileWarning, twoProfileSessionRebuildMessage(currentInput));
      setProductionFollowupActions(true, `Next: ${twoProfileSessionRebuildMessage(currentInput)}`);
      postCheckFocus = currentInput.message
        ? fields.runProductionTwoProfileRoundtrip
        : fields.productionTwoProfileMessage;
    }
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(sessionCheckInput)) {
      return;
    }
    forgetTwoProfileSessionStatusForInput(sessionCheckInput);
    setProductionTwoProfileState("Session check failed");
    setText(fields.productionTwoProfileSessionStatus, "Saved connection check failed");
    setText(fields.productionTwoProfileWarning, twoProfileRecoveryMessage("session-status", error));
    setText(fields.productionPairingWarning, String(error));
    postCheckFocus = fields.checkProductionTwoProfileSessionStatusInline;
  } finally {
    clearTwoProfileSessionStatusBusy(sessionCheckInput);
    if (fields.checkProductionTwoProfileSessionStatus) {
      fields.checkProductionTwoProfileSessionStatus.disabled = false;
    }
    if (fields.checkProductionTwoProfileSessionStatusInline) {
      fields.checkProductionTwoProfileSessionStatusInline.disabled = false;
    }
    applyProductionActionState();
    if (twoProfileTranscriptInputStillCurrent(sessionCheckInput)) {
      postCheckFocus?.focus();
    }
  }
}

function twoProfileTranscriptInputStillCurrent(input) {
  const current = productionTwoProfileInput();
  return (
    current.profileA === input.profileA &&
    current.profileB === input.profileB &&
    current.passphrase === input.passphrase &&
    twoProfileSessionStatusFingerprint(current) === twoProfileSessionStatusFingerprint(input)
  );
}

async function loadProductionTwoProfileTranscript(options = {}) {
  const input = options.input ?? productionTwoProfileInput();
  const { profileA, profileB, passphrase } = input;
  const transcriptInput = twoProfileRoomIdentityInput(input);
  const quiet = options.quiet === true;
  const refreshSessionStatus = options.refreshSessionStatus !== false;
  const autoResume = options.autoResume === true;
  if (!profileA || !profileB || profileA === profileB || !passphrase) {
    if (!quiet) {
      setProductionTwoProfileState("Conversation load needs profiles");
      setText(
        fields.productionTwoProfileWarning,
        currentLanguage === "ko"
          ? "대화를 불러오려면 초대 코드를 먼저 만들거나 붙여넣으세요."
          : "Create or paste an invite code before loading the conversation.",
      );
    }
    return;
  }

  if (!quiet) {
    setProductionTwoProfileState("Conversation loading");
    setText(fields.productionTwoProfileWarning, "Reading stored conversation after local unlock.");
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
    if (!twoProfileTranscriptInputStillCurrent(transcriptInput)) {
      return false;
    }
    const expiredMessagesPurged =
      Number.parseInt(profileAResult.expired_messages_purged ?? 0, 10) +
      Number.parseInt(profileBResult.expired_messages_purged ?? 0, 10);
    let sessionStatus = options.sessionStatus ?? latestTwoProfileSessionStatusForCurrentInput(transcriptInput);
    if (refreshSessionStatus) {
      sessionStatus = await invokeInviteRoomSessionStatus({
        profileA,
        profileB,
        passphrase,
      });
      if (!twoProfileTranscriptInputStillCurrent(transcriptInput)) {
        return false;
      }
      rememberTwoProfileSessionStatus(transcriptInput, sessionStatus);
      renderProductionTwoProfileSessionStatusResult(sessionStatus);
      setText(fields.productionPairingWarning, sessionStatus.warning);
    }
    if (fields.productionTwoProfileTranscriptExport) {
      fields.productionTwoProfileTranscriptExport.value = combinedTwoProfileTranscriptTsv(
        profileA,
        profileAResult,
        profileB,
        profileBResult,
      );
    }
    const staleMessageEnvelopeSlotsPruned = renderProductionTwoProfileTranscriptEntries(entries, transcriptInput);
    reconcileCurrentInviteRoomMetadataFromTranscriptEntries(entries, {
      input: transcriptInput,
      sessionStatus,
      allowRetryableFallback: options.allowRetryableMetadataFallback,
    });
    if (
      options.suppressRouteReadinessNoticeRefresh !== true &&
      !refreshRouteReadinessNoticeAfterSessionRefresh(transcriptInput)
    ) {
      clearStaleSendRecoveryNotice(transcriptInput);
    }
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
    if (!quiet) {
      const ready = Boolean(sessionStatus?.both_ready_for_message_envelope);
      setProductionTwoProfileState(ready ? "Conversation resumed" : "Conversation loaded");
      const resumeTarget = ready ? autoSelectTwoProfileResumeTarget(sessionStatus) : null;
      setText(
        fields.productionTwoProfileWarning,
        ready
          ? twoProfileResumeWarningForTarget(
              resumeTarget,
              resumeWarning,
              staleMessageEnvelopeSlotsPruned,
              expiredMessagesPurged,
            )
          : loadedWarning,
      );
      if (ready && resumeTarget !== "pending-review") {
        renderProductionTwoProfileMemory();
      }
      if (!ready) {
        autoSelectPendingTwoProfileConversation();
      }
      if (ready) {
        startInviteRoomTranscriptRefresh(transcriptInput);
      } else {
        stopInviteRoomTranscriptRefresh();
      }
    } else if (autoResume && sessionStatus?.both_ready_for_message_envelope) {
      setProductionTwoProfileState("Conversation resumed");
      const resumeTarget = autoSelectTwoProfileResumeTarget(sessionStatus);
      const autoResumeBaseWarning = appendExpiredMessagesPurged(
        appendStaleMessageEnvelopeSlotsPruned(
          "Stored conversation and message-ready sessions recovered after local unlock. Write a message to continue.",
          staleMessageEnvelopeSlotsPruned,
        ),
        expiredMessagesPurged,
      );
      setText(
        fields.productionTwoProfileWarning,
        twoProfileResumeWarningForTarget(
          resumeTarget,
          autoResumeBaseWarning,
          staleMessageEnvelopeSlotsPruned,
          expiredMessagesPurged,
        ),
      );
      if (resumeTarget !== "pending-review") {
        renderProductionTwoProfileMemory();
      }
      startInviteRoomTranscriptRefresh(transcriptInput);
    } else if (autoResume) {
      stopInviteRoomTranscriptRefresh();
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
      clearProductionBusyAction("two-profile-transcript-load");
      applyProductionActionState();
    }
  }
}

async function refreshTwoProfileConversationAfterManualImport(
  profile,
  passphrase,
  input = productionTwoProfileInput(),
) {
  const importedProfile = String(profile ?? "").trim().toLowerCase();
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
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
    await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false, input });
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
  } catch (error) {
    if (!twoProfileTranscriptInputStillCurrent(input)) {
      return false;
    }
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
  input = productionTwoProfileInput(),
) {
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return false;
  }
  const exportedProfile = String(profile ?? "").trim().toLowerCase();
  const selectedEntry = selectedTwoProfileConversationEntry();
  const selectedNumber = Number.parseInt(selectedEntry?.messageNumber, 10);
  const exportedNumber = Number.parseInt(messageNumber, 10);
  const text = String(message ?? "").trim();
  const envelope = String(envelopePayload ?? "").trim();
  if (exportedProfile && envelope) {
    storeMessageEnvelopeSlot(exportedProfile, envelope, {
      receiver: selectedEntry?.receiver,
      roomFingerprint: twoProfileSessionStatusFingerprint(input),
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
    input,
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

function syncTwoProfileConversationAfterReceivedExport(
  profile,
  messageNumber,
  message,
  input = productionTwoProfileInput(),
) {
  if (!twoProfileTranscriptInputStillCurrent(input)) {
    return false;
  }
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
    {},
    input,
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
    await loadProductionTwoProfileTranscript({ quiet: true, autoResume: true, input: currentInput });
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
    outboundDeliveryState: entry.outbound_delivery_state,
    outboundFailureKind: entry.outbound_failure_kind,
    outboundRetryable: entry.outbound_retryable === true,
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
  const input = productionPairingInput();
  const { profile, passphrase } = input;
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
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
      return;
    }
    renderHandshakePayloadResult(result, fields.productionHandshakeInitPayload);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase"])) {
      return;
    }
    setProductionPairingState("Handshake init failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionHandshakeState, "Failed");
  } finally {
    clearProductionBusyAction("handshake-init");
    if (fields.exportProductionHandshakeInit) {
      fields.exportProductionHandshakeInit.disabled = false;
    }
    applyProductionActionState();
  }
}

async function exportProductionHandshakeReply() {
  const input = productionPairingInput();
  const { profile, passphrase, initPayload } = input;
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
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "initPayload"])) {
      return;
    }
    renderHandshakePayloadResult(result, fields.productionHandshakeReplyPayload);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "initPayload"])) {
      return;
    }
    setProductionPairingState("Handshake reply failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionHandshakeState, "Failed");
  } finally {
    clearProductionBusyAction("handshake-reply");
    if (fields.exportProductionHandshakeReply) {
      fields.exportProductionHandshakeReply.disabled = false;
    }
    applyProductionActionState();
  }
}

async function exportProductionHandshakeFinish() {
  const input = productionPairingInput();
  const { profile, passphrase, replyPayload } = input;
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
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "replyPayload"])) {
      return;
    }
    renderHandshakePayloadResult(result, fields.productionHandshakeFinishPayload);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "replyPayload"])) {
      return;
    }
    setProductionPairingState("Handshake finish failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionHandshakeState, "Failed");
  } finally {
    clearProductionBusyAction("handshake-finish");
    if (fields.exportProductionHandshakeFinish) {
      fields.exportProductionHandshakeFinish.disabled = false;
    }
    applyProductionActionState();
  }
}

async function importProductionHandshakeFinish() {
  const input = productionPairingInput();
  const { profile, passphrase, finishPayload } = input;
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
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "finishPayload"])) {
      return;
    }
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
    await checkProductionSessionState(input);
  } catch (error) {
    if (!productionPairingInputStillCurrent(input, ["profile", "passphrase", "finishPayload"])) {
      return;
    }
    setProductionPairingState("Handshake finish import failed");
    setText(fields.productionPairingWarning, String(error));
    setText(fields.productionHandshakeState, "Failed");
  } finally {
    clearProductionBusyAction("handshake-finish-import");
    if (fields.importProductionHandshakeFinish) {
      fields.importProductionHandshakeFinish.disabled = false;
    }
    applyProductionActionState();
  }
}

async function exportProductionMessageEnvelope() {
  const input = productionMessageInput();
  const { profile, passphrase, autoMessageNumber, messageNumber, message, messageTtlSeconds } = input;
  const twoProfileRefreshInput = productionTwoProfileInput();
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
    if (!productionMessageInputStillCurrent(input)) {
      return;
    }
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
      twoProfileRefreshInput,
    );
    if (expiredOutboundMessagesPurged(result) > 0) {
      if (twoProfileTranscriptInputStillCurrent(twoProfileRefreshInput)) {
        await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false, input: twoProfileRefreshInput });
      }
      if (conversationSync?.conversationUpdated && twoProfileTranscriptInputStillCurrent(twoProfileRefreshInput)) {
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
    if (!productionMessageInputStillCurrent(input)) {
      return;
    }
    setProductionMessageState("Message envelope export failed");
    setText(fields.productionMessageWarning, String(error));
    setText(fields.productionMessageOutbound, "Failed");
  } finally {
    clearProductionBusyAction("message-export");
    if (fields.exportProductionMessageEnvelope) {
      fields.exportProductionMessageEnvelope.disabled = false;
    }
    applyProductionActionState();
    focusAfterProductionBusyAction(postBusyFocus);
  }
}

async function deleteProductionConversation() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
  if (!profile || !passphrase) {
    setProductionMessageState("Conversation delete needs profile");
    setText(fields.productionMessageWarning, "Enter profile and passphrase first.");
    return;
  }
  setProductionMessageState("Conversation deleting");
  setText(fields.productionMessageWarning, "Deleting local conversation message records.");
  productionBusyAction = "conversation-delete";
  applyProductionActionState();
  try {
    const result = await invoke("production_conversation_delete", { profile, passphrase });
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    resetProductionMessageTranscript();
    resetProductionMessageImportState();
    if (fields.productionMessageEnvelope) {
      fields.productionMessageEnvelope.value = "";
    }
    setProductionMessageState("Conversation deleted");
    setText(fields.productionMessageWarning, result.warning);
    setText(
      fields.productionMessageOutbound,
      `sent_deleted=${result.sent_messages_deleted} envelopes_deleted=${result.message_envelopes_deleted} indexes_deleted=${result.local_message_indexes_deleted} counter_deleted=${result.message_counter_deleted}`,
    );
    setText(
      fields.productionMessageInbound,
      `received_deleted=${result.received_messages_deleted} total_records=${result.conversation_records_deleted} session_preserved=${result.session_records_preserved}`,
    );
    setText(
      fields.productionMessageBoundary,
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} plaintext=${result.plaintext_exposed} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    );
    await checkProductionSessionState(input);
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setProductionMessageState("Conversation delete failed");
    setText(fields.productionMessageWarning, String(error));
  } finally {
    clearProductionBusyAction("conversation-delete");
    applyProductionActionState();
  }
}

async function importProductionMessageEnvelope() {
  const input = productionMessageInput();
  const { profile, passphrase, messageNumber, envelopePayload, messageTtlSeconds } = input;
  const twoProfileRefreshInput = productionTwoProfileInput();
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
    if (!productionMessageInputStillCurrent(input)) {
      return;
    }
    const view = productionMessageEnvelopeImportView(result);
    latestProductionMessageImport = productionMessageImportFingerprint(input);
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
    const conversationRefresh = await refreshTwoProfileConversationAfterManualImport(
      profile,
      passphrase,
      twoProfileRefreshInput,
    );
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
    if (!productionMessageInputStillCurrent(input)) {
      return;
    }
    setProductionMessageState("Message envelope import failed");
    setText(fields.productionMessageWarning, String(error));
    setText(fields.productionMessageInbound, "Failed");
  } finally {
    clearProductionBusyAction("message-import");
    if (fields.importProductionMessageEnvelope) {
      fields.importProductionMessageEnvelope.disabled = false;
    }
    applyProductionActionState();
    focusAfterProductionBusyAction(postBusyFocus);
  }
}

async function exportProductionReceivedMessage() {
  const input = productionMessageInput();
  const { profile, passphrase, messageNumber } = input;
  const twoProfileRefreshInput = productionTwoProfileInput();
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
    if (!productionMessageInputStillCurrent(input)) {
      return;
    }
    const view = productionReceivedMessageExportView(result);
    const expiredReceivedPurged = result.expired_received_message_purged === true;
    setProductionMessageState(expiredReceivedPurged ? "Received message expired" : "Received message exported");
    setText(fields.productionMessageWarning, appendMessageLifecyclePurgeWarning(result.warning, result));
    if (expiredReceivedPurged) {
      if (fields.productionReceivedMessage) {
        fields.productionReceivedMessage.value = "";
      }
      completeProductionMessageImportReview();
      if (twoProfileTranscriptInputStillCurrent(twoProfileRefreshInput)) {
        await loadProductionTwoProfileTranscript({ quiet: true, refreshSessionStatus: false, input: twoProfileRefreshInput });
        appendMessageLifecyclePurgeWarningToField(fields.productionTwoProfileWarning, result);
      }
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
      twoProfileRefreshInput,
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
    if (!productionMessageInputStillCurrent(input)) {
      return;
    }
    setProductionMessageState("Received message export failed");
    setText(fields.productionMessageWarning, String(error));
    setText(fields.productionMessageInbound, "Failed");
  } finally {
    clearProductionBusyAction("received-export");
    if (fields.exportProductionReceivedMessage) {
      fields.exportProductionReceivedMessage.disabled = false;
    }
    applyProductionActionState();
    focusAfterProductionBusyAction(postBusyFocus);
  }
}

async function loadProductionMessageTranscript() {
  const input = productionProfileInput();
  const { profile, passphrase } = input;
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
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    renderProductionTranscriptEntries(profile, result.entries);
    if (fields.productionMessageTranscriptExport) {
      fields.productionMessageTranscriptExport.value = result.transcript_tsv ?? "";
    }
    setProductionMessageState("Transcript loaded");
    setText(fields.productionMessageWarning, transcriptRetentionWarning(result));
    setText(fields.productionMessageBoundary, transcriptBoundarySummary(result));
  } catch (error) {
    if (!productionProfileInputStillCurrent(input)) {
      return;
    }
    setProductionMessageState("Transcript load failed");
    setText(fields.productionMessageWarning, String(error));
  } finally {
    clearProductionBusyAction("transcript-load");
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

if (fields.languageSelector) {
  fields.languageSelector.addEventListener("change", () => {
    applyLanguage(fields.languageSelector.value);
  });
}

if (fields.toggleChatSettings) {
  fields.toggleChatSettings.setAttribute("aria-expanded", "false");
  fields.toggleChatSettings.addEventListener("click", () => {
    const panel = document.querySelector(".chat-settings-panel");
    const systemPanel = document.querySelector(".system-settings-panel");
    if (panel) {
      if (panel.open) {
        closeChatSettingsPanel();
      } else {
        openChatSettingsPanel();
      }
      if (panel.open && systemPanel) {
        systemPanel.open = false;
      }
    }
  });
}

if (fields.closeChatSettings) {
  fields.closeChatSettings.addEventListener("click", () => {
    closeChatSettingsPanel();
    fields.toggleChatSettings?.focus();
  });
}

if (fields.openPrivateDeliverySettings) {
  fields.openPrivateDeliverySettings.addEventListener("click", () => enablePrivateDeliveryPermission());
}

document.querySelector(".chat-settings-panel")?.addEventListener("toggle", (event) => {
  const open = Boolean(event.currentTarget.open);
  document.body.classList.toggle("is-chat-settings-open", open);
  fields.toggleChatSettings?.setAttribute("aria-expanded", open ? "true" : "false");
});

document.querySelector(".system-settings-panel")?.addEventListener("toggle", (event) => {
  const open = Boolean(event.currentTarget.open);
  document.body.classList.toggle("is-app-settings-open", open);
  if (open) {
    closeChatSettingsPanel();
  }
});

if (fields.closeAppSettings) {
  fields.closeAppSettings.addEventListener("click", () => {
    closeAppSettingsPanel();
    document.querySelector(".system-settings-panel > summary")?.focus();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (document.querySelector(".chat-settings-panel")?.open) {
    closeChatSettingsPanel();
    fields.toggleChatSettings?.focus();
  }
  if (document.querySelector(".system-settings-panel")?.open) {
    closeAppSettingsPanel();
    document.querySelector(".system-settings-panel > summary")?.focus();
  }
});

document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  const chatPanel = document.querySelector(".chat-settings-panel");
  if (chatPanel?.open) {
    if (chatPanel.contains(target) || fields.toggleChatSettings?.contains(target)) {
      return;
    }
    closeChatSettingsPanel();
  }
  const appPanel = document.querySelector(".system-settings-panel");
  const appSummary = document.querySelector(".system-settings-panel > summary");
  if (appPanel?.open) {
    if (appPanel.contains(target) || appSummary?.contains(target)) {
      return;
    }
    closeAppSettingsPanel();
  }
});

if (fields.openDeveloperTools) {
  fields.openDeveloperTools.addEventListener("click", () => {
    closeAppSettingsPanel();
    openManualProductionTools();
  });
}

if (fields.createRoomFromReceivedCode) {
  fields.createRoomFromReceivedCode.addEventListener("click", createRoomFromReceivedInviteCode);
}

if (fields.receivedInviteCode) {
  fields.receivedInviteCode.addEventListener("input", renderReceivedInviteCodeActionState);
  fields.receivedInviteCode.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !fields.createRoomFromReceivedCode?.disabled) {
      event.preventDefault();
      createRoomFromReceivedInviteCode();
    }
  });
  renderReceivedInviteCodeActionState();
}

if (fields.roomListCreateRoom) {
  fields.roomListCreateRoom.addEventListener("click", createNewInviteRoomFromList);
}

if (fields.backToRoomList) {
  fields.backToRoomList.addEventListener("click", showRoomList);
}

if (fields.roomListJoinRoom) {
  fields.roomListJoinRoom.addEventListener("click", createRoomFromRoomListInviteCode);
}

if (fields.roomListInviteCode) {
  fields.roomListInviteCode.addEventListener("input", renderReceivedInviteCodeActionState);
  fields.roomListInviteCode.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !fields.roomListJoinRoom?.disabled) {
      event.preventDefault();
      createRoomFromRoomListInviteCode();
    }
  });
  renderReceivedInviteCodeActionState();
}

if (fields.createInviteCode) {
  fields.createInviteCode.addEventListener("click", createInviteCode);
}

if (fields.createInviteCodeSettings) {
  fields.createInviteCodeSettings.addEventListener("click", createInviteCode);
}

if (fields.copyInviteCode) {
  fields.copyInviteCode.addEventListener("click", () => {
    copyCurrentInviteCode();
  });
}

if (fields.copyCreatedInviteCode) {
  fields.copyCreatedInviteCode.addEventListener("click", () => {
    copyCurrentInviteCode();
  });
}

if (fields.copyRoomInviteToken) {
  fields.copyRoomInviteToken.addEventListener("click", () => {
    copyCurrentInviteCode();
  });
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
  fields.roomNetworkPermission,
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

for (const input of [fields.manualOnionNetworkPermission, fields.roomNetworkPermission]) {
  if (input) {
    input.addEventListener("change", () => {
      setManualNetworkPermission(input.checked);
      if (input.checked) {
        clearPrivateRouteFollowupForRoom(productionTwoProfileInput());
      }
      if (input === fields.roomNetworkPermission && input.checked) {
        document.querySelector(".network-permission-toggle")?.classList.remove("is-attention");
      }
      renderRoomIdentityBar(productionTwoProfileInput(), twoProfileSessionsReadyForInput(productionTwoProfileInput()));
      applyProductionActionState();
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

if (fields.lockProductionProfile) {
  fields.lockProductionProfile.addEventListener("click", lockProductionProfile);
  fields.lockProductionProfile.disabled = true;
}

if (fields.checkProductionProductUnlock) {
  fields.checkProductionProductUnlock.addEventListener("click", checkProductionProductUnlockStatus);
}

if (fields.checkProductionDataLifecycle) {
  fields.checkProductionDataLifecycle.addEventListener("click", checkProductionDataLifecycle);
}

if (fields.prepareProductionDataLifecycle) {
  fields.prepareProductionDataLifecycle.addEventListener("click", prepareProductionDataLifecycle);
}

if (fields.productionProfileDeleteConfirmation) {
  fields.productionProfileDeleteConfirmation.addEventListener("input", applyProductionActionState);
}

if (fields.deleteProductionProfile) {
  fields.deleteProductionProfile.addEventListener("click", deleteProductionProfile);
}

if (fields.productionFullWipeConfirmation) {
  fields.productionFullWipeConfirmation.addEventListener("input", applyProductionActionState);
}

if (fields.wipeProductionLocalData) {
  fields.wipeProductionLocalData.addEventListener("click", wipeProductionLocalData);
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

if (fields.checkProductionPairingSafety) {
  fields.checkProductionPairingSafety.addEventListener("click", checkProductionPairingSafety);
}

if (fields.productionPairingSafetyVerified) {
  fields.productionPairingSafetyVerified.addEventListener("change", () => {
    if (fields.productionPairingSafetyVerified.checked && !currentPairingSafetyVerified()) {
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

if (fields.checkProductionSessionLifecycle) {
  fields.checkProductionSessionLifecycle.addEventListener("click", checkProductionSessionLifecycle);
}

if (fields.deleteProductionSessionLifecycle) {
  fields.deleteProductionSessionLifecycle.addEventListener("click", deleteProductionSessionLifecycle);
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

if (fields.deleteProductionConversation) {
  fields.deleteProductionConversation.addEventListener("click", deleteProductionConversation);
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

if (fields.runProductionTwoProfileRoundtripInline) {
  fields.runProductionTwoProfileRoundtripInline.addEventListener(
    "click",
    runProductionTwoProfileRoundtrip,
  );
}

if (fields.runProductionTwoProfileMessageRoundtrip) {
  fields.runProductionTwoProfileMessageRoundtrip.addEventListener(
    "click",
    runProductionTwoProfileComposerPrimaryAction,
  );
}

if (fields.confirmTwoProfileSafety) {
  fields.confirmTwoProfileSafety.addEventListener("click", confirmCurrentTwoProfileSafety);
}

if (fields.rejectTwoProfileSafety) {
  fields.rejectTwoProfileSafety.addEventListener("click", rejectCurrentTwoProfileSafety);
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
    () => refreshProductionTwoProfilePeerEndpoints(productionTwoProfileInput(), { allowRetryRecovery: false }),
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

if (fields.preparePrivateRoute) {
  fields.preparePrivateRoute.addEventListener("click", () =>
    preparePrivateDeliveryRoute({
      forceRefresh: privateRouteRecoveryNoticeActive("sendRuntimeMismatch"),
      allowRetryRecovery: false,
    }),
  );
}
if (fields.copyPrivateRouteCode) {
  fields.copyPrivateRouteCode.addEventListener("click", copyLocalPrivateRouteCode);
}
if (fields.applyPeerPrivateRouteCode) {
  fields.applyPeerPrivateRouteCode.addEventListener("click", applyPeerPrivateRouteCode);
}
if (fields.peerPrivateRouteCode) {
  fields.peerPrivateRouteCode.addEventListener("input", () => {
    rememberPeerPrivateRouteDraft(productionTwoProfileInput());
    renderPrivateRouteExchangeState(productionTwoProfileInput());
    applyProductionActionState();
  });
  fields.peerPrivateRouteCode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyPeerPrivateRouteCode();
    }
  });
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

if (fields.cancelProductionTwoProfileRealOnionWait) {
  fields.cancelProductionTwoProfileRealOnionWait.addEventListener(
    "click",
    cancelProductionTwoProfileRealOnionWait,
  );
}

if (fields.onionBridgeConfigLines) {
  fields.onionBridgeConfigLines.addEventListener("input", updateProductionOnionBridgeConfigControls);
}

if (fields.onionObfs4TransportBinaryPath) {
  fields.onionObfs4TransportBinaryPath.addEventListener("input", updateProductionOnionBridgeConfigControls);
}

if (fields.saveOnionBridgeConfig) {
  fields.saveOnionBridgeConfig.addEventListener("click", saveProductionOnionBridgeConfig);
}

if (fields.saveOnionObfs4TransportBinary) {
  fields.saveOnionObfs4TransportBinary.addEventListener("click", saveProductionOnionObfs4TransportBinary);
}

if (fields.checkOnionBridgeConfig) {
  fields.checkOnionBridgeConfig.addEventListener("click", checkProductionOnionBridgeConfigStatus);
}

if (fields.clearOnionBridgeConfig) {
  fields.clearOnionBridgeConfig.addEventListener("click", clearProductionOnionBridgeConfig);
}

if (fields.loadProductionTwoProfileTranscript) {
  fields.loadProductionTwoProfileTranscript.addEventListener("click", () =>
    loadProductionTwoProfileTranscript(),
  );
}

if (fields.refreshFieldTestReport) {
  fields.refreshFieldTestReport.addEventListener("click", refreshFieldTestReport);
}

if (fields.copyFieldTestReport) {
  fields.copyFieldTestReport.addEventListener("click", copyFieldTestReport);
}

if (fields.refreshPublicBetaDiagnostics) {
  fields.refreshPublicBetaDiagnostics.addEventListener("click", () => refreshPublicBetaDiagnostics());
}

if (fields.copyPublicBetaDiagnostics) {
  fields.copyPublicBetaDiagnostics.addEventListener("click", copyPublicBetaDiagnostics);
}

if (fields.peerFieldTestReport) {
  fields.peerFieldTestReport.addEventListener("input", renderFieldTestReportComparison);
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

initializeLanguage();
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
renderSavedInviteRooms();
showRoomList();
syncSavedInviteRoomMetadataFromLocalStores();
loadProductionOnionBridgeConfigStatus();
