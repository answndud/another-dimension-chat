import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createMessageEnvelopeSlot,
  messageEnvelopeSlotCreatedByExplicitUserAction,
  messageEnvelopeSlotImportReadyForEntry,
  messageEnvelopeSlotMatchesEntry,
  messageEnvelopeSlotMismatchReason,
  messageEnvelopePayloadImportDecision,
  messageEnvelopeSlotRecoveryHint,
} from "./message-envelope-slots.js";
import {
  productionManualCurrentFocusTarget,
  productionManualPrimaryActions,
  productionManualTransferStepLabel,
} from "./action-state.js";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const mainJs = readFileSync(join(here, "main.js"), "utf8");
const i18nJs = readFileSync(join(here, "i18n.js"), "utf8");
const actionStateJs = readFileSync(join(here, "action-state.js"), "utf8");
const privateDeliveryStateJs = readFileSync(join(here, "private-delivery-state.js"), "utf8");
const stylesCss = readFileSync(join(here, "styles.css"), "utf8");
const securityMd = readFileSync(join(appRoot, "..", "..", "SECURITY.md"), "utf8");
const finalAcceptanceScript = readFileSync(
  join(appRoot, "..", "..", "scripts", "final_acceptance_once.sh"),
  "utf8",
);
const externalEvidencePrepareScript = readFileSync(
  join(appRoot, "..", "..", "scripts", "external_two_machine_evidence_prepare.sh"),
  "utf8",
);
const externalEvidenceValidateScript = readFileSync(
  join(appRoot, "..", "..", "scripts", "external_two_machine_evidence_validate.sh"),
  "utf8",
);
const externalEvidenceSchema = readFileSync(
  join(appRoot, "..", "..", "reference", "EXTERNAL_TWO_MACHINE_EVIDENCE_SCHEMA.md"),
  "utf8",
);
const functionBodyCache = new Map();

function functionBody(source, name) {
  const cacheKey = `${name}:${source.length}`;
  if (functionBodyCache.has(cacheKey)) {
    return functionBodyCache.get(cacheKey);
  }
  const index = source.indexOf(`function ${name}(`);
  assert.notEqual(index, -1, `missing function ${name}`);
  const paramsStart = source.indexOf("(", index);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let cursor = paramsStart; cursor < source.length; cursor += 1) {
    if (source[cursor] === "(") paramsDepth += 1;
    if (source[cursor] === ")") paramsDepth -= 1;
    if (paramsDepth === 0) {
      paramsEnd = cursor;
      break;
    }
  }
  assert.notEqual(paramsEnd, -1, `unterminated params for function ${name}`);
  const brace = source.indexOf("{", paramsEnd);
  let depth = 0;
  for (let cursor = brace; cursor < source.length; cursor += 1) {
    if (source[cursor] === "{") depth += 1;
    if (source[cursor] === "}") depth -= 1;
    if (depth === 0) {
      const body = source.slice(brace + 1, cursor);
      functionBodyCache.set(cacheKey, body);
      return body;
    }
  }
  assert.fail(`unterminated function ${name}`);
}

test("main chat surface keeps invite, message, receive, and retry entry points", () => {
  for (const id of [
    "create-invite-code",
    "received-invite-code",
    "room-list-create-room",
    "room-list-invite-code",
    "back-to-room-list",
    "saved-room-list",
    "room-list-sync-status",
    "copy-room-invite-token",
    "production-two-profile-message",
    "chat-delivery-notice",
    "manual-flow-guide-title",
    "public-recovery-guide-title",
  ]) {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  }
  assert.match(mainJs, /startProductionTwoProfileOnionReceive/);
  assert.match(mainJs, /retryTwoProfileOutboundEntry/);
  assert.match(mainJs, /cancelTwoProfileOutboundEntry/);
});

test("resume retry selection keeps selected row aligned with retry notice", () => {
  assert.match(mainJs, /function autoSelectRetryableTwoProfileOutboundConversation\(\)/);
  assert.match(
    functionBody(mainJs, "autoSelectRetryableTwoProfileOutboundConversation"),
    /automaticVisibleTwoProfileRetryableOutboundEntry\(\)/,
  );
  assert.match(
    functionBody(mainJs, "autoSelectRetryableTwoProfileOutboundConversation"),
    /selectTwoProfileConversationEntryForReview\(retryable,[\s\S]*focusManual: false/,
  );
  assert.match(
    functionBody(mainJs, "autoSelectTwoProfileResumeTarget"),
    /if \(target === "retry-send"\) \{[\s\S]*autoSelectRetryableTwoProfileOutboundConversation\(\) \? target : null/,
  );
  assert.match(
    functionBody(mainJs, "autoSelectTwoProfileResumeTarget"),
    /if \(target === "pending-review"\) \{[\s\S]*autoSelectPendingTwoProfileConversation\(\) \? target : null/,
  );
});

test("first launch public beta warning keeps release and network boundaries visible", () => {
  assert.match(indexHtml, /class="public-beta-warning"/);
  assert.match(indexHtml, /class="public-beta-gate"/);
  assert.match(indexHtml, /class="first-run-checklist"/);
  assert.match(indexHtml, /id="first-run-primary-next-action"/);
  assert.match(indexHtml, /id="version-integrity-status"/);
  assert.match(indexHtml, /id="windows-runtime-parity-status"/);
  assert.match(indexHtml, /id="high-risk-threat-model-status"/);
  assert.match(indexHtml, /id="high-risk-transport-metadata-status"/);
  assert.match(indexHtml, /id="high-risk-readiness-status"/);
  assert.match(indexHtml, /class="version-integrity-status"/);
  assert.match(indexHtml, /data-i18n="publicBetaChecksumBody"/);
  assert.match(indexHtml, /data-i18n="publicBetaInstallBody"/);
  assert.match(indexHtml, /data-i18n="publicBetaNoUpdateBody"/);
  assert.match(indexHtml, /data-i18n="versionIntegrityStatusInitial"/);
  assert.match(indexHtml, /data-i18n="windowsRuntimeParityStatusInitial"/);
  assert.match(indexHtml, /data-i18n="highRiskThreatModelStatusInitial"/);
  assert.match(indexHtml, /data-i18n="highRiskTransportMetadataStatusInitial"/);
  assert.match(indexHtml, /data-i18n="highRiskReadinessStatusInitial"/);
  assert.match(indexHtml, /windows_public_artifact_ready=false/);
  assert.match(indexHtml, /shared_core_bypass_allowed=false/);
  assert.match(indexHtml, /High-Risk threat model: protected=none/);
  assert.match(indexHtml, /mitigated=remote_passive_observer,remote_active_attacker,malicious_peer,local_at_rest_attacker,supply_chain_update_attacker/);
  assert.match(indexHtml, /not_protected=compromised_endpoint,direct_coercion,global_traffic_correlation/);
  assert.match(indexHtml, /claims: audited=false/);
  assert.match(indexHtml, /no-direct-fallback/);
  assert.match(indexHtml, /ready_claim_allowed=false/);
  assert.match(indexHtml, /data-i18n="firstRunProfileStep"/);
  assert.match(indexHtml, /data-i18n="firstRunRoomStep"/);
  assert.match(indexHtml, /data-i18n="firstRunVerifyStep"/);
  assert.match(indexHtml, /data-i18n="firstRunManualMessageStep"/);
  assert.match(indexHtml, /data-i18n="firstRunDiagnosticsStep"/);
  assert.match(indexHtml, /data-first-run-step="profile"/);
  assert.match(indexHtml, /data-first-run-step="room"/);
  assert.match(indexHtml, /data-first-run-step="safety"/);
  assert.match(indexHtml, /data-first-run-step="message"/);
  assert.match(indexHtml, /data-first-run-step="diagnostics"/);
  assert.match(indexHtml, /aria-current="step"/);
  assert.match(indexHtml, /data-i18n="firstRunPrimaryNextAction"/);
  assert.match(i18nJs, /same GitHub Release/);
  assert.match(i18nJs, /Privacy & Security manual allow/);
  assert.match(i18nJs, /unsigned experimental public beta/);
  assert.match(i18nJs, /central trusted server/);
  assert.match(i18nJs, /pairwise invites/);
  assert.match(i18nJs, /mandatory safety comparison/);
  assert.match(i18nJs, /encrypted manual envelope exchange/);
  assert.match(i18nJs, /local data ownership/);
  assert.match(i18nJs, /onion-only advanced transport/);
  assert.match(i18nJs, /full censorship-resistance claim/);
  assert.match(indexHtml, /Private 1:1 chat without a central trusted server/);
  assert.match(indexHtml, /pairwise invites/);
  assert.match(indexHtml, /mandatory safety comparison/);
  assert.match(i18nJs, /not audited/);
  assert.match(i18nJs, /not production-ready/);
  assert.match(i18nJs, /sensitive communication prohibited/);
  assert.match(i18nJs, /external onion delivery claim/);
  assert.match(i18nJs, /release_authority=same-github-release-assets/);
  assert.match(i18nJs, /rollback_prevention_claimed=false/);
  assert.match(i18nJs, /Ready for local beta messages/);
  assert.match(i18nJs, /Verified local beta room\. Manual message actions are available\./);
  assert.match(i18nJs, /Explicit local\/manual messaging path available/);
  assert.match(i18nJs, /Create, unlock, or reopen your local profile before room actions\./);
  assert.match(i18nJs, /Create a pairwise invite room or paste the invite code you received\./);
  assert.match(i18nJs, /Compare the mandatory safety phrase, then write a message\./);
  assert.match(i18nJs, /Export\/import the manual encrypted envelope, then reply, retry, cancel, or delete locally\./);
  assert.match(i18nJs, /blocked actions show the reason and next recovery action/);
  assert.match(i18nJs, /Next: create or unlock your local profile\./);
  assert.match(i18nJs, /다음: 로컬 profile을 만들거나 unlock 하세요\./);
  assert.match(mainJs, /productionFirstRunDesktopSummaryView/);
  assert.match(functionBody(mainJs, "renderFirstRunDesktopSummary"), /fields\.firstRunPrimaryNextAction/);
  assert.match(functionBody(mainJs, "renderFirstRunDesktopSummary"), /data-current-step/);
  assert.match(functionBody(mainJs, "renderFirstRunDesktopSummary"), /data-next-action/);
  assert.match(functionBody(mainJs, "renderFirstRunDesktopSummary"), /data-blocked-reason/);
  assert.match(functionBody(mainJs, "renderFirstRunDesktopSummary"), /Blocked reason:/);
  assert.match(functionBody(mainJs, "renderFirstRunDesktopSummary"), /aria-current/);
  assert.match(stylesCss, /data-step-status="current"/);
  assert.match(stylesCss, /data-step-status="complete"/);
  assert.match(actionStateJs, /export function productionHighRiskReadinessGateView/);
  assert.match(actionStateJs, /export function productionHighRiskRuntimeEvidenceGateView/);
  assert.match(actionStateJs, /export function productionFinalReleaseAcceptanceView/);
  assert.match(actionStateJs, /export function productionExternalTwoMachineEvidenceView/);
  assert.match(actionStateJs, /export function productionMessageDeliveryProductizationView/);
  assert.match(actionStateJs, /export function productionStorageKeyManagementHardeningView/);
  assert.match(actionStateJs, /production_key_management_ready=\$\{productionKeyManagementReady\}/);
  assert.match(actionStateJs, /kdf_params_versioned=\$\{kdfParamsVersioned\}/);
  assert.match(actionStateJs, /ui_error_private_fields_allowed=false/);
  assert.match(mainJs, /productionMessageDeliveryProductizationView/);
  assert.match(mainJs, /productionStorageKeyManagementHardeningView/);
  assert.match(mainJs, /dataset\.deliveryPrimaryAction/);
  assert.match(mainJs, /message_delivery_productization/);
  assert.match(mainJs, /dataset\.storageKeyManagementBoundaryClosed/);
  assert.match(actionStateJs, /primary_action=\$\{primaryAction\}/);
  assert.match(actionStateJs, /first_message_round_trip_ready=\$\{firstMessageRoundTripReady\}/);
  assert.match(actionStateJs, /false_delivered_allowed=false/);
  assert.match(actionStateJs, /false_verified_allowed=false/);
  assert.match(actionStateJs, /false_ready_allowed=false/);
  assert.match(actionStateJs, /message_body_in_support=false/);
  assert.match(actionStateJs, /envelope_payload_in_support=false/);
  assert.match(actionStateJs, /key_or_passphrase_in_support=false/);
  assert.match(actionStateJs, /status_values=ready#limited#not_ready/);
  assert.match(actionStateJs, /high_risk_public_claim_allowed=false/);
  assert.match(actionStateJs, /public_support_high_risk_claim_allowed=false/);
  assert.match(actionStateJs, /release_high_risk_claim_allowed=false/);
  assert.match(actionStateJs, /local_only_evidence_promoted=false/);
  assert.match(actionStateJs, /fabricated_evidence_promoted=false/);
  assert.match(actionStateJs, /evidence_contract=runtime-report#explicit-user-action#onion-only#no-direct-fallback/);
  assert.match(actionStateJs, /release_class=\$\{releaseClass\}/);
  assert.match(actionStateJs, /acceptance_bar_items=\$\{acceptanceBarItems\}/);
  assert.match(actionStateJs, /stable_candidate_ready=\$\{stableCandidateReady\}/);
  assert.match(actionStateJs, /stable_public_app_ready=\$\{stablePublicAppReady\}/);
  assert.match(actionStateJs, /high_risk_mode_ready=\$\{highRiskModeReady\}/);
  assert.match(actionStateJs, /external_two_machine_evidence_present=\$\{externalTwoMachineEvidencePresent\}/);
  assert.match(actionStateJs, /macos_public_artifact_consistency_verified=\$\{macosPublicArtifactConsistencyVerified\}/);
  assert.match(actionStateJs, /windows_public_artifact_consistency_verified=\$\{windowsPublicArtifactConsistencyVerified\}/);
  assert.match(actionStateJs, /payload_recorded=false/);
  assert.match(actionStateJs, /passphrase_recorded=false/);
  assert.match(actionStateJs, /local_path_recorded=false/);
  assert.match(actionStateJs, /key_material_recorded=false/);
  assert.match(finalAcceptanceScript, /release_class=public_beta/);
  assert.match(finalAcceptanceScript, /acceptance_bar_items=27/);
  assert.match(finalAcceptanceScript, /stable_candidate_ready=false/);
  assert.match(finalAcceptanceScript, /stable_public_app_ready=false/);
  assert.match(finalAcceptanceScript, /high_risk_mode_ready=false/);
  assert.match(finalAcceptanceScript, /external_two_machine_evidence_present=false/);
  assert.match(finalAcceptanceScript, /macos_public_artifact_consistency_verified=false/);
  assert.match(finalAcceptanceScript, /windows_public_artifact_consistency_verified=false/);
  assert.match(finalAcceptanceScript, /emergency_advisory_path_ready=false/);
  assert.match(finalAcceptanceScript, /external_delivery_claim=false/);
  assert.match(finalAcceptanceScript, /payload_recorded=false/);
  assert.match(finalAcceptanceScript, /passphrase_recorded=false/);
  assert.match(finalAcceptanceScript, /local_path_recorded=false/);
  assert.match(finalAcceptanceScript, /key_material_recorded=false/);
  assert.match(externalEvidencePrepareScript, /schema_version": "external-two-machine-evidence-v1"/);
  assert.match(externalEvidencePrepareScript, /external_two_machine_evidence_present=false/);
  assert.match(externalEvidenceValidateScript, /external_two_machine_evidence_present=true/);
  assert.match(externalEvidenceValidateScript, /local_only_promoted_to_external=false/);
  assert.match(externalEvidenceValidateScript, /reliable_delivery_claim_allowed=false/);
  assert.match(externalEvidenceValidateScript, /audited_claim_allowed=false/);
  assert.match(externalEvidenceValidateScript, /forbidden-field:\$\{path\}\$\{key\}/);
  assert.match(externalEvidenceSchema, /schema_version/);
  assert.match(externalEvidenceSchema, /invite_body/);
  assert.match(externalEvidenceSchema, /envelope_payload/);
  assert.match(externalEvidenceSchema, /local_path/);
  assert.match(externalEvidenceSchema, /passphrase/);
  assert.match(externalEvidenceSchema, /key_material/);
  assert.match(mainJs, /productionHighRiskReadinessGateView/);
  assert.match(mainJs, /productionHighRiskRuntimeEvidenceGateView/);
  assert.match(functionBody(mainJs, "renderHighRiskReadinessStatus"), /twoProfileSafetyConfirmedForInput/);
  assert.match(functionBody(mainJs, "renderHighRiskReadinessStatus"), /data-readiness/);
  assert.match(functionBody(mainJs, "renderHighRiskReadinessStatus"), /data-high-risk-ready-claim-allowed/);
  assert.match(functionBody(mainJs, "renderHighRiskReadinessStatus"), /ready_claim_allowed=\$\{view\.highRiskReadyClaimAllowed\}/);
  assert.match(functionBody(mainJs, "renderHighRiskReadinessStatus"), /operational_ready=\$\{view\.highRiskOperationalReady\}/);
  assert.match(functionBody(mainJs, "renderHighRiskReadinessStatus"), /data-high-risk-operational-ready/);
  assert.match(functionBody(mainJs, "renderHighRiskTransportMetadataStatus"), /runtime_evidence=\$\{runtimeEvidence\.runtimeEvidencePresent\}/);
  assert.match(functionBody(mainJs, "renderHighRiskTransportMetadataStatus"), /data-runtime-evidence-source/);
  assert.match(functionBody(mainJs, "renderHighRiskTransportMetadataStatus"), /data-high-risk-public-claim-allowed/);
  assert.match(functionBody(mainJs, "renderHighRiskThreatModelStatus"), /data-not-protected/);
  assert.match(functionBody(mainJs, "renderHighRiskThreatModelStatus"), /compromised_endpoint_safe=false/);
  assert.match(functionBody(mainJs, "renderHighRiskTransportMetadataStatus"), /not_protected=global-traffic-correlation-complete-defense/);
  assert.match(stylesCss, /\.high-risk-readiness-status\[data-readiness="limited"\]/);
  assert.match(stylesCss, /\.high-risk-readiness-status\[data-readiness="not_ready"\]/);
  assert.match(securityMd, /The app readiness output uses `ready`, `limited`, and `not_ready`/);
  assert.match(securityMd, /stable public app readiness and High-Risk Mode\s+readiness as separate decisions/);
  assert.match(i18nJs, /nothing starts on app launch/);
  assert.match(i18nJs, /앱 실행 시 자동 시작되지 않습니다/);
  assert.match(i18nJs, /Receive attempts start after this explicit action; external delivery is not claimed\./);
  assert.doesNotMatch(indexHtml, /New messages arrive after you turn this on\./);
  assert.match(i18nJs, /Local send attempt recorded\./);
  assert.match(i18nJs, /External receipt remains unconfirmed\./);
  assert.match(i18nJs, /Single private delivery attempt completed; reliability is not claimed\./);
  assert.doesNotMatch(i18nJs, /Private delivery completed without showing private details\./);
  assert.doesNotMatch(i18nJs, /New messages arrive after you turn this on\./);
  assert.doesNotMatch(i18nJs, /Message (was )?sent\./);
  assert.doesNotMatch(i18nJs, /Message delivered\. You can continue the conversation\./);
  assert.doesNotMatch(i18nJs, /statusSent:\s*"sent"/);
  assert.match(i18nJs, /statusSent:\s*"send attempt recorded"/);
  assert.match(stylesCss, /\.public-beta-gate/);
});

test("default public surface hides advanced onion controls outside developer mode", () => {
  assert.match(indexHtml, /class="onion-advanced-controls"/);
  assert.match(
    stylesCss,
    /\.onion-advanced-controls\s*\{\s*display:\s*none;\s*\}/,
  );
  assert.match(
    stylesCss,
    /body\.is-developer-mode \.onion-advanced-controls\s*\{\s*display:\s*grid;\s*\}/,
  );
  assert.doesNotMatch(
    stylesCss,
    /\.onion-advanced-controls,\s*body\.is-developer-mode \.onion-advanced-controls\s*\{\s*display:\s*grid;/,
  );
});

test("startup invokes only redacted local onion status", () => {
  const startupBlock = mainJs.slice(mainJs.indexOf("initializeLanguage();"));
  assert.match(startupBlock, /loadProductionOnionBridgeConfigStatus\(\);/);
  assert.doesNotMatch(startupBlock, /production_onion_service_launch_attempt/);
  assert.doesNotMatch(startupBlock, /production_onion_client_start/);
  assert.doesNotMatch(startupBlock, /production_onion_outbound_envelope_send_attempt/);
  assert.doesNotMatch(startupBlock, /production_onion_receive_loop_start/);
  assert.doesNotMatch(startupBlock, /startProductionTwoProfileOnionReceive\(\)/);
});

test("screenshot-safe browser preview blanks public screenshot fields", () => {
  const enabledBody = functionBody(mainJs, "screenshotSafePreviewModeEnabled");
  assert.match(enabledBody, /screenshot-safe/);
  assert.match(enabledBody, /localhost/);
  assert.match(enabledBody, /127\.0\.0\.1/);
  assert.match(enabledBody, /::1/);

  const applyBody = functionBody(mainJs, "applyScreenshotSafePreviewMode");
  assert.match(applyBody, /is-screenshot-safe-preview/);
  assert.match(applyBody, /fields\.productionProfileName/);
  assert.match(applyBody, /fields\.productionProfilePassphrase/);
  assert.match(applyBody, /fields\.productionPairingEndpoint/);
  assert.match(applyBody, /fields\.productionMessageBody/);
  assert.match(applyBody, /fields\.productionTwoProfileMessage/);
  assert.match(applyBody, /fields\.createdInviteCodeDisplay/);
  assert.match(applyBody, /fields\.receivedInviteCode/);
  assert.match(applyBody, /fields\.roomListInviteCode/);
  assert.match(applyBody, /fields\.localPrivateRouteCode/);
  assert.match(applyBody, /fields\.peerPrivateRouteCode/);
  assert.match(applyBody, /fields\.fieldTestReport/);
  assert.match(applyBody, /fields\.publicBetaDiagnostics/);
  assert.match(applyBody, /private_fields_blank=true/);
  assert.match(mainJs, /window\.setTimeout\(applyScreenshotSafePreviewMode, 50\)/);
});

test("message composer does not use instructional placeholder text", () => {
  const idIndex = indexHtml.indexOf('id="production-two-profile-message"');
  assert.notEqual(idIndex, -1, "missing production message composer");
  const openIndex = indexHtml.lastIndexOf("<textarea", idIndex);
  const closeIndex = indexHtml.indexOf("</textarea>", idIndex);
  const composerHtml = indexHtml.slice(openIndex, closeIndex + "</textarea>".length);
  assert.doesNotMatch(composerHtml, /data-i18n-placeholder/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileDirection"), /placeholder = ""/);
});

test("saved rooms can be listed and reopened", () => {
  assert.match(mainJs, /ad\.inviteRooms\.v1/);
  assert.match(mainJs, /const localDevPeer =/);
  assert.match(mainJs, /VITE_AD_LOCAL_DEV_PEER/);
  assert.match(mainJs, /ad\.localPeer\.\$\{localDevPeer\}\.\$\{key\}/);
  assert.match(mainJs, /function showRoomList/);
  assert.match(mainJs, /function showRoomDetail/);
  assert.match(mainJs, /function prepareRoomListReturnState/);
  assert.match(mainJs, /function renderSavedInviteRooms/);
  assert.match(mainJs, /function openSavedInviteRoom/);
  assert.match(mainJs, /function removeSavedInviteRoom/);
  assert.match(mainJs, /function rememberCurrentInviteRoomMetadata/);
  assert.match(mainJs, /function syncSavedInviteRoomMetadataFromLocalStores/);
  assert.match(mainJs, /let savedRoomMetadataSyncInFlight = false/);
  assert.match(mainJs, /roomListSyncStatus: document\.querySelector\("#room-list-sync-status"\)/);
  assert.match(mainJs, /const savedRoomMetadataStartupSyncLimit = 8/);
  assert.match(mainJs, /function savedInviteRoomResumeRoom/);
  assert.match(mainJs, /function savedInviteRoomListItemView/);
  assert.match(mainJs, /createNewInviteRoomFromList/);
  assert.match(mainJs, /createRoomFromRoomListInviteCode/);
  assert.match(mainJs, /showRoomList\(\);/);
  assert.match(mainJs, /lastMessagePreview/);
  assert.match(mainJs, /messageCount/);
  assert.match(mainJs, /removeRoomConfirm/);
  assert.match(stylesCss, /\.saved-room-preview/);
  assert.match(stylesCss, /\.saved-room-state/);
  assert.match(stylesCss, /\.saved-room-primary-action/);
  assert.match(stylesCss, /\.room-list-sync-status/);
  assert.match(stylesCss, /\.saved-room-list-item\.is-resume-recommended/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /const displayRoom = view\.room \?\? room/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /savedInviteRoomLabel\(displayRoom\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /savedInviteRoomShortSlug\(displayRoom\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /count: displayRoom\.messageCount/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /openSavedInviteRoom\(displayRoom\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /removeSavedInviteRoom\(displayRoom\)/);
  assert.doesNotMatch(mainJs, /restoreLastInviteRoom\(\);/);
  assert.match(functionBody(mainJs, "showRoomList"), /prepareRoomListReturnState\(\)/);
  assert.match(functionBody(mainJs, "prepareRoomListReturnState"), /reconcileCurrentInviteRoomMetadataFromTranscriptEntries/);
  assert.match(functionBody(mainJs, "prepareRoomListReturnState"), /!savedRoomMetadataSyncInFlight/);
  assert.match(functionBody(mainJs, "prepareRoomListReturnState"), /setSavedRoomMetadataSyncStatus\(""\)/);
  assert.match(mainJs, /showRoomList\(\);\s*syncSavedInviteRoomMetadataFromLocalStores\(\);/);
  assert.match(functionBody(mainJs, "savedInviteRoomMetadataFromLocalStores"), /production_message_transcript_export/);
  assert.match(functionBody(mainJs, "savedInviteRoomMetadataSyncCandidates"), /right\.priority - left\.priority/);
  assert.match(functionBody(mainJs, "savedInviteRoomMetadataSyncCandidates"), /slice\(0, savedRoomMetadataStartupSyncLimit\)/);
  assert.match(functionBody(mainJs, "syncSavedInviteRoomMetadataFromLocalStores"), /roomListSyncRunning/);
  assert.match(functionBody(mainJs, "syncSavedInviteRoomMetadataFromLocalStores"), /roomListSyncComplete/);
  assert.match(functionBody(mainJs, "syncSavedInviteRoomMetadataFromLocalStores"), /roomListSyncPartial/);
  assert.match(functionBody(mainJs, "syncSavedInviteRoomMetadataFromLocalStores"), /rememberInviteRoom\(room\.code, room\.role[\s\S]*render: false/);
  assert.match(functionBody(mainJs, "syncSavedInviteRoomMetadataFromLocalStores"), /savedInviteRoomMetadataSyncCandidates\(\)/);
  assert.match(mainJs, /function inviteRoomMetadataValue/);
  assert.match(functionBody(mainJs, "inviteRoomMetadataValue"), /hasOwnProperty\.call\(metadata \?\? \{\}, key\)/);
  assert.match(mainJs, /function inviteRoomUpdatedAtValue/);
  assert.match(functionBody(mainJs, "inviteRoomUpdatedAtValue"), /hasOwnProperty\.call\(metadata \?\? \{\}, "updatedAt"\)/);
  assert.match(functionBody(mainJs, "inviteRoomUpdatedAtValue"), /Object\.keys\(metadata \?\? \{\}\)\.length > 0[\s\S]*Date\.now\(\)/);
  assert.match(functionBody(mainJs, "rememberInviteRoom"), /updatedAt: inviteRoomUpdatedAtValue\(metadata, existing\)/);
  assert.match(functionBody(mainJs, "rememberInviteRoom"), /inviteRoomMetadataValue\(metadata, existing, "retryableOutboundCount"\)/);
  assert.match(functionBody(mainJs, "rememberInviteRoom"), /inviteRoomMetadataValue\(metadata, existing, "retryableOutboundMessageNumber"\)/);
  assert.match(functionBody(mainJs, "rememberInviteRoom"), /inviteRoomMetadataValue\(metadata, existing, "retryableOutboundAction"\)/);
  assert.match(functionBody(mainJs, "rememberInviteRoom"), /inviteRoomMetadataValue\(metadata, existing, "manualRebuildFlow"\)/);
  assert.match(functionBody(mainJs, "roomListStoragePayload"), /const manualRebuildMetadata = normalizeSavedRoomManualRebuildMetadata\(room\)/);
  assert.match(functionBody(mainJs, "savedInviteRooms"), /const manualRebuildMetadata = normalizeSavedRoomManualRebuildMetadata\(room\)/);
  assert.match(indexHtml, /id="back-to-room-list"/);
  assert.match(stylesCss, /body\.is-room-list-mode [\s\S]*#production-two-profile-transcript/);
  assert.match(stylesCss, /body\.is-room-detail-mode \.room-list-panel/);
  assert.match(stylesCss, /body\.is-room-detail-mode\.is-chat-active \.room-list-back/);
});

test("saved room open carries current session status into metadata reconciliation", () => {
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /sessionStatus: status/);
  assert.match(
    functionBody(mainJs, "loadProductionTwoProfileTranscript"),
    /options\.sessionStatus \?\?[\s\S]*runtimeResumeResult\?\.session_status[\s\S]*latestTwoProfileSessionStatusForCurrentInput\(transcriptInput\)/,
  );
  assert.match(
    functionBody(mainJs, "loadProductionTwoProfileTranscript"),
    /reconcileCurrentInviteRoomMetadataFromTranscriptEntries\(entries,[\s\S]*sessionStatus/,
  );
});

test("saved room list shows receive runtime and restart intent", () => {
  assert.match(mainJs, /function savedInviteRoomInput/);
  assert.match(mainJs, /function savedInviteRoomReceiveState/);
  assert.match(mainJs, /function productionTwoProfileReceiveMatchesInput/);
  assert.match(mainJs, /function productionTwoProfileReceiveActiveInOtherRoom/);
  assert.match(
    functionBody(mainJs, "savedInviteRoomReceiveState"),
    /productionTwoProfileReceiveMatchesInput\(input\)/,
  );
  assert.match(functionBody(mainJs, "savedInviteRoomReceiveState"), /receiveIntentForRoom\(input\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /roomStateListening/);
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /roomStateReceivePaused/);
  assert.match(mainJs, /function savedInviteRoomWaitingForPeerCode/);
  assert.match(functionBody(mainJs, "savedInviteRoomInput"), /connectionCode: code/);
  assert.match(functionBody(mainJs, "savedInviteRoomInput"), /inviteRole: role/);
  assert.match(functionBody(mainJs, "savedInviteRoomWaitingForPeerCode"), /routeMapValueForRoom\(localPrivateRouteCodesByRoom, input/);
  assert.match(functionBody(mainJs, "savedInviteRoomWaitingForPeerCode"), /routeMapValueForRoom\(activeLocalPrivateRouteCodesByRoom, input\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomWaitingForPeerCode"), /routeMapValueForRoom\(peerPrivateRouteDraftsByRoom, input/);
  assert.match(mainJs, /function savedInviteRoomHasRetryableOutbound/);
  assert.match(mainJs, /function savedInviteRoomRetryableAction/);
  assert.match(mainJs, /function savedInviteRoomRetryableState/);
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /savedInviteRoomRetryableState\(room\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomRetryableState"), /roomStateEnableDelivery/);
  assert.match(functionBody(mainJs, "savedInviteRoomRetryableState"), /roomStateSetupDelivery/);
  assert.match(functionBody(mainJs, "savedInviteRoomRetryableState"), /roomStateRefreshAddress/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /savedInviteRoomRetryableAction\(room\.retryableOutboundAction\)/);
  assert.match(
    functionBody(mainJs, "savedInviteRoomListAction"),
    /new Set\(\["start-receiving", "stop-receiving", "wait-receive-stop"\]\)\.has\(routeReadinessView\?\.action\)[\s\S]*savedInviteRoomHasRetryableOutbound\(room\)/,
  );
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /action === "enable-private-delivery"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /action === "prepare-private-route"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /action === "refresh-and-retry"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /labelKey: "savedRoomActionStartReceivingForRetry"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /savedRoomActionLabelKey\(action\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /savedRoomActionLabelKey\(routeReadinessView\.action, routeReadinessView\.labelKey\)/);
  assert.match(functionBody(mainJs, "savedRoomActionLabelKey"), /savedRoomActionEnableDelivery/);
  assert.match(functionBody(mainJs, "savedRoomActionLabelKey"), /savedRoomActionShareDeliveryCode/);
  assert.match(functionBody(mainJs, "savedRoomActionLabelKey"), /savedRoomActionUpdateCodeAndRetry/);
  assert.match(functionBody(mainJs, "savedRoomActionLabelKey"), /savedRoomActionWaitReceivingStop/);
  assert.doesNotMatch(functionBody(mainJs, "savedRoomActionLabelKey"), /normalized === "prepare-private-route" \|\| normalized === "real-onion-network-settings"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /action === "enable-private-delivery"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /action === "prepare-private-route"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /action === "refresh-and-retry"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /runSavedInviteRoomRetryableOutboundAction\(room, input, action, actionOrigin\)/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomRetryableOutboundAction"), /runTwoProfileOutboundPrimaryAction\(pending, \{ action \}\)/);
  assert.match(mainJs, /function normalizedExpectedOutboundPrimaryAction/);
  assert.match(functionBody(mainJs, "normalizedExpectedOutboundPrimaryAction"), /normalized === "verify-safety"[\s\S]*return "verify"/);
  assert.match(mainJs, /async function runTwoProfileOutboundPrimaryAction\(entry, expectedPrimaryAction = null\)/);
  assert.match(functionBody(mainJs, "runTwoProfileOutboundPrimaryAction"), /normalizedExpectedOutboundPrimaryAction\(expectedPrimaryAction\)/);
  assert.match(functionBody(mainJs, "runTwoProfileOutboundPrimaryAction"), /resolvedPrimaryAction\.action !== expectedAction[\s\S]*showExactRetryableOutboundPrompt\(resolvedEntry\)/);
  assert.match(mainJs, /function outboundRecoveryMessage/);
  assert.match(mainJs, /function outboundRecoveryNextText/);
  assert.match(mainJs, /function currentComposerPendingOutboundAction/);
  assert.match(functionBody(mainJs, "currentComposerPendingOutboundAction"), /selectedTwoProfileRetryableOutboundEntry\(input\) \?\?/);
  assert.match(functionBody(mainJs, "currentComposerPendingOutboundAction"), /restoreLatestChatDeliveryPendingOutbound\(input\) \?\?/);
  assert.match(functionBody(mainJs, "currentComposerPendingOutboundAction"), /automaticVisibleTwoProfileRetryableOutboundEntry\(input\)/);
  assert.ok(
    functionBody(mainJs, "currentComposerPendingOutboundAction").indexOf("selectedTwoProfileRetryableOutboundEntry(input)") <
      functionBody(mainJs, "currentComposerPendingOutboundAction").indexOf("restoreLatestChatDeliveryPendingOutbound(input)"),
  );
  assert.match(functionBody(mainJs, "showLatestRetryableOutboundNotice"), /const selected = selectedTwoProfileRetryableOutboundEntry\(input\)/);
  assert.match(functionBody(mainJs, "showLatestRetryableOutboundNotice"), /setChatDeliveryNoticeForPendingOutbound\(selected, input\)/);
  assert.match(functionBody(mainJs, "currentComposerPendingOutboundAction"), /if \(!actionState\.canRunNow\) \{\s*return null;\s*\}/);
  assert.match(functionBody(mainJs, "twoProfileComposerPrimaryIntent"), /currentComposerPendingOutboundAction\(input\)/);
  assert.match(functionBody(mainJs, "twoProfileComposerPrimaryIntent"), /pendingOutboundEntry: pendingOutboundAction\.entry/);
  assert.match(functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction"), /runTwoProfileOutboundPrimaryAction\(intent\.pendingOutboundEntry, intent\.expectedPrimaryAction\)/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /outboundRecoveryNextText\(primaryAction, outboundActionState\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /outboundRecoveryMessage\(primaryAction\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /outboundRecoveryNextText\(primaryAction, outboundActionState\)/);
  assert.match(functionBody(mainJs, "twoProfileRetryableOutboundActionView"), /sendRecoveryRowNext/);
  assert.match(functionBody(mainJs, "retryableTwoProfileOutboundWarning"), /sendRecoverySelectedWarning/);
  assert.match(i18nJs, /sendRecoveryRowNext/);
  assert.match(i18nJs, /sendRecoverySelectedWarning/);
  assert.match(functionBody(mainJs, "savedInviteRoomResumePriority"), /return 30/);
  assert.match(functionBody(mainJs, "savedInviteRoomResumePriority"), /return 20/);
  assert.match(functionBody(mainJs, "savedInviteRoomResumePriority"), /return 18/);
  assert.match(
    functionBody(mainJs, "savedInviteRoomState"),
    /receiveState === "listening"[\s\S]*receiveState === "stopping"[\s\S]*waitingPeerCode[\s\S]*receiveState === "paused"[\s\S]*savedInviteRoomHasRetryableOutbound\(room\)/,
  );
  assert.match(
    functionBody(mainJs, "savedInviteRoomListAction"),
    /receiveState === "stopping"[\s\S]*waitingPeerCode[\s\S]*receiveState === "paused"[\s\S]*savedInviteRoomHasRetryableOutbound\(room\)/,
  );
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /roomStateResumeNext/);
  assert.match(functionBody(mainJs, "savedInviteRoomRetryableState"), /roomStateRetrySend/);
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /roomStateWaitingPeerCode/);
  assert.match(i18nJs, /roomStateEnableDelivery/);
  assert.match(i18nJs, /roomStateSetupDelivery/);
  assert.match(i18nJs, /roomStateRefreshAddress/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /needs-receive-restart/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /const currentInput = productionTwoProfileInput\(\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /const currentRole = currentInput\.inviteRole/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /const currentRoomFingerprint = privateRouteRoomKey\(currentInput\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /savedInviteRoomListItemView\(room,[\s\S]*currentCode,[\s\S]*resumeRoom,[\s\S]*persistStaleRetryableClear: true/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /is-waiting-peer-code/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /has-retryable-send/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /is-resume-recommended/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /saved-room-primary-action/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /view\.nextAction \? t\(view\.nextAction\.labelKey\) : t\("openRoom"\)/);
  assert.match(mainJs, /function savedInviteRoomReadinessReview/);
  assert.match(mainJs, /function savedInviteRoomReadinessBlockerKey/);
  assert.match(mainJs, /function savedInviteRoomReadinessSummaryKey/);
  assert.match(mainJs, /function savedInviteRoomReadinessNextDetailKey/);
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /const currentRole = context\.currentRole === "inviter" \|\| context\.currentRole === "joiner"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /const currentRoomFingerprint = String\(context\.currentRoomFingerprint \?\? ""\)\.trim\(\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /const roomFingerprint = privateRouteRoomKey\(savedInviteRoomInput\(viewRoom\)\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /currentRoomFingerprint[\s\S]*roomFingerprint === currentRoomFingerprint[\s\S]*viewRoom\.code === currentCode && \(!currentRole \|\| viewRoom\.role === currentRole\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /current,[\s\S]*hasRetryableSend/);
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /const nextAction = savedInviteRoomListAction/);
  assert.match(
    functionBody(mainJs, "savedInviteRoomListItemView"),
    /const routeReadinessViewCandidate = savedInviteRoomRouteReadinessView\(viewRoom\)/,
  );
  assert.doesNotMatch(
    functionBody(mainJs, "savedInviteRoomListItemView"),
    /const routeReadinessViewCandidate = savedInviteRoomHasRetryableOutbound/,
  );
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /const state = savedInviteRoomState/);
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /savedInviteRoomReadinessReview\(\{/);
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessBlockerKey"), /retryable-outbound/);
  assert.match(
    functionBody(mainJs, "savedInviteRoomReadinessBlockerKey"),
    /receiveState === "stopping"[\s\S]*hasRetryableSend[\s\S]*waitingPeerCode[\s\S]*receiveState === "paused"/,
  );
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessBlockerKey"), /peer-delivery-code/);
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessBlockerKey"), /safety-unverified/);
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessNextDetailKey"), /roomReadinessNextRetrySavedMessage/);
  assert.match(
    functionBody(mainJs, "savedInviteRoomReadinessNextDetailKey"),
    /receiveState === "stopping"[\s\S]*hasRetryableSend[\s\S]*waitingPeerCode[\s\S]*receiveState === "paused"/,
  );
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessNextDetailKey"), /roomReadinessNextPastePeerCode/);
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessNextDetailKey"), /roomReadinessNextStartReceive/);
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessNextDetailKey"), /roomReadinessNextRetryNetwork/);
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessReview"), /boundaryKey: "roomReadinessBoundary"/);
  assert.match(functionBody(mainJs, "savedInviteRoomReadinessReview"), /nextDetailKey: savedInviteRoomReadinessNextDetailKey\(view\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /saved-room-readiness/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /detail=\$\{t\(view\.readinessReview\.nextDetailKey\)\}/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /view\.readinessReview\.blockerKey/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /view\.readinessReview\.boundaryKey/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /item\.append\(summary, state, primaryAction, remove, readiness\)/);
  assert.doesNotMatch(functionBody(mainJs, "renderSavedInviteRooms"), /profileA|profileB|passphrase|connectionCode|messageNumber/);
  assert.doesNotMatch(functionBody(mainJs, "renderSavedInviteRooms"), /nextAction\.hidden/);
  assert.doesNotMatch(functionBody(mainJs, "renderSavedInviteRooms"), /const open = document\.createElement/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /renderSavedInviteRooms\(\)/);
  assert.match(
    functionBody(mainJs, "startProductionTwoProfileOnionReceive"),
    /catch \(error\) \{[\s\S]*setChatDeliveryNoticeByKey\("receiveStartFailed", "warning", input\);[\s\S]*renderSavedInviteRooms\(\);[\s\S]*applyProductionActionState\(\);/,
  );
  assert.match(
    functionBody(mainJs, "startProductionTwoProfileOnionReceive"),
    /backendLoop\.duplicate_loop_blocked \|\| !backendLoop\.enabled[\s\S]*refreshReceiveIntentRecoveryUi\(input\);/,
  );
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /renderSavedInviteRooms\(\)/);
  assert.match(stylesCss, /\.saved-room-state\.is-listening/);
  assert.match(stylesCss, /\.saved-room-state\.is-receive-paused/);
  assert.match(stylesCss, /\.saved-room-state\.is-waiting-peer-code/);
  assert.match(stylesCss, /\.saved-room-state\.is-retry-send/);
  assert.match(stylesCss, /\.saved-room-state\.is-enable-delivery/);
  assert.match(stylesCss, /\.saved-room-state\.is-setup-delivery/);
  assert.match(stylesCss, /\.saved-room-state\.is-refresh-address/);
  assert.match(stylesCss, /grid-template-columns: minmax\(0, 1fr\) auto auto auto/);
  assert.match(stylesCss, /\.saved-room-next-action/);
  assert.match(stylesCss, /\.saved-room-readiness/);
  assert.match(stylesCss, /\.saved-room-readiness-meta/);
  assert.match(i18nJs, /openRoom: "Open room"/);
  assert.match(i18nJs, /roomReadinessReview: "Readiness"/);
  assert.match(i18nJs, /roomReadinessBoundary: "local status only; network_io=false"/);
  assert.match(i18nJs, /roomReadinessNextRetrySavedMessage: "Retry or cancel the saved outbound message from this room\."/);
  assert.match(i18nJs, /roomReadinessNextPastePeerCode: "Paste the peer delivery code into this room\."/);
  assert.match(i18nJs, /roomReadinessNextRetryNetwork: "Retry the explicit delivery step; this is not external delivery evidence\."/);
  assert.match(i18nJs, /roomActionPastePeerCode: "Paste delivery code"/);
  assert.match(i18nJs, /roomStateSetupDelivery: "Share delivery code"/);
  assert.match(i18nJs, /roomStateWaitingPeerCode: "Need their delivery code"/);
  assert.match(i18nJs, /roomStateReceivePaused: "Receive paused"/);
  assert.match(i18nJs, /savedRoomActionEnableDelivery: "Turn on delivery"/);
  assert.match(i18nJs, /savedRoomActionShareDeliveryCode: "Share delivery code"/);
  assert.match(i18nJs, /savedRoomActionStartReceiving: "Start receiving"/);
  assert.match(i18nJs, /savedRoomActionStartReceivingForRetry: "Start receiving for retry"/);
  assert.match(i18nJs, /savedRoomActionWaitReceivingStop: "Wait for stop"/);
  assert.match(i18nJs, /savedRoomActionRetrySavedMessage: "Retry message"/);
  assert.match(i18nJs, /openRoom: "채팅방 열기"/);
  assert.match(i18nJs, /roomReadinessReview: "준비 상태"/);
  assert.match(i18nJs, /roomReadinessNextRetrySavedMessage: "이 방의 저장된 outbound 메시지를 다시 보내거나 취소하세요\."/);
  assert.match(i18nJs, /roomReadinessNextPastePeerCode: "상대 전송 코드를 이 방에 붙여넣으세요\."/);
  assert.match(i18nJs, /roomActionPastePeerCode: "전송 코드 붙여넣기"/);
  assert.match(i18nJs, /roomStateSetupDelivery: "전송 코드 공유"/);
  assert.match(i18nJs, /roomStateWaitingPeerCode: "상대 전송 코드 필요"/);
  assert.match(i18nJs, /roomStateReceivePaused: "받기 재시작 필요"/);
  assert.match(i18nJs, /savedRoomActionEnableDelivery: "전송 켜기"/);
  assert.match(i18nJs, /savedRoomActionShareDeliveryCode: "전송 코드 공유"/);
  assert.match(i18nJs, /savedRoomActionStartReceiving: "메시지 받기 시작"/);
  assert.match(i18nJs, /savedRoomActionStartReceivingForRetry: "재전송을 위해 받기 시작"/);
  assert.match(i18nJs, /savedRoomActionWaitReceivingStop: "받기 중지 대기"/);
  assert.match(i18nJs, /savedRoomActionRetrySavedMessage: "메시지 다시 보내기"/);
});

test("receive controls are scoped to the active room", () => {
  assert.match(mainJs, /roomFingerprint: ""/);
  assert.match(functionBody(mainJs, "productionTwoProfileReceiveMatchesInput"), /productionTwoProfileOnionReceiveMode\.roomFingerprint === roomFingerprint/);
  assert.match(mainJs, /function productionTwoProfileReceiveRuntimeMismatched/);
  assert.match(functionBody(mainJs, "productionTwoProfileReceiveRuntimeMismatched"), /ownerProfileBound/);
  assert.match(functionBody(mainJs, "productionTwoProfileReceiveRuntimeMismatched"), /ownerMatchesReceiveProfile/);
  assert.match(functionBody(mainJs, "updateChatPrimaryActionMode"), /is-receiving-other-room/);
  assert.match(functionBody(mainJs, "updateChatPrimaryActionMode"), /is-receiving-runtime-mismatch/);
  assert.match(functionBody(mainJs, "renderRoomStatusSummary"), /friendFamilyOnboardingView\(input, sessionsReady\)/);
  assert.match(functionBody(mainJs, "friendFamilyOnboardingView"), /productionTwoProfileReceiveMatchesInput\(input\)/);
  assert.match(functionBody(mainJs, "renderRoomStatusSummary"), /roomStatusShortReceiveMismatch/);
  assert.match(functionBody(mainJs, "renderRoomIdentityBar"), /roomReceivingOther/);
  assert.match(functionBody(mainJs, "renderRoomIdentityBar"), /roomReceivingMismatch/);
  assert.match(mainJs, /receiveIntentForRoom\(input\)[\s\S]*!productionTwoProfileReceiveActiveInOtherRoom\(input\)[\s\S]*action: "start-receiving"/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /productionTwoProfileReceiveActiveInOtherRoom\(input\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /receiveOtherRoomActive/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /await invoke\("production_onion_receive_loop_stop"\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /rememberReceiveIntentForRoom\(input, false\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /localEndpointReady = await prepareInviteRoomPrivateRouteExchange/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{[\s\S]*rememberReceiveIntentForRoom\(input, false\)[\s\S]*return;/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /catch \(error\) \{[\s\S]*if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{[\s\S]*rememberReceiveIntentForRoom\(input, false\)/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /!productionTwoProfileReceiveMatchesInput\(targetInput\)/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /receiveOtherRoomActive/);
  assert.match(i18nJs, /roomReceivingOther/);
  assert.match(i18nJs, /roomReceivingMismatch/);
  assert.match(i18nJs, /receiveRuntimeMismatch/);
  assert.match(i18nJs, /receiveOtherRoomActive/);
});

test("friend and family onboarding shows room status next actions", () => {
  assert.match(mainJs, /function friendFamilyOnboardingView/);
  const viewBody = functionBody(mainJs, "friendFamilyOnboardingView");
  assert.match(viewBody, /roomOnboardingNextInvite/);
  assert.match(viewBody, /roomOnboardingNextVerify/);
  assert.match(viewBody, /roomOnboardingNextExchangeDeliveryCodes/);
  assert.match(viewBody, /roomOnboardingNextStartReceive/);
  assert.match(viewBody, /roomOnboardingNextSend/);
  assert.match(viewBody, /externalPeerSendReadiness\(input/);
  assert.match(functionBody(mainJs, "renderRoomStatusSummary"), /\$\{view\.label\} · \$\{view\.next\}/);
  assert.match(functionBody(mainJs, "renderRoomSetupProgress"), /dataset\.nextAction = view\.nextKey/);
  assert.match(functionBody(mainJs, "twoProfilePrimaryReadiness"), /friendFamilyOnboardingView\(input, sessionsReady\)/);
  for (const key of [
    "roomOnboardingNextInvite",
    "roomOnboardingNextOpenRoom",
    "roomOnboardingNextRebuild",
    "roomOnboardingNextVerify",
    "roomOnboardingNextEnableDelivery",
    "roomOnboardingNextExchangeDeliveryCodes",
    "roomOnboardingNextStartReceive",
    "roomOnboardingNextWaitReceiveStop",
    "roomOnboardingNextRestartReceive",
    "roomOnboardingNextRetryOrCancel",
    "roomOnboardingNextWaitOrReply",
    "roomOnboardingNextWriteMessage",
    "roomOnboardingNextSend",
  ]) {
    assert.match(i18nJs, new RegExp(`${key}:`));
  }
});

test("receive restart intent owns the room primary action", () => {
  assert.match(mainJs, /function twoProfileComposerPrimaryIntent/);
  assert.match(mainJs, /receiveIntentForRoom\(input\)[\s\S]*action: "start-receiving"/);
  assert.match(mainJs, /action: "start-receiving"[\s\S]*labelKey: "startReceiving"/);
  assert.match(functionBody(mainJs, "refreshReceiveIntentRecoveryUi"), /renderSavedInviteRooms\(\)/);
  assert.match(functionBody(mainJs, "refreshReceiveIntentRecoveryUi"), /renderRoomIdentityBar\(input, twoProfileSessionsReadyForInput\(input\)\)/);
  assert.match(functionBody(mainJs, "refreshReceiveIntentRecoveryUi"), /renderRoomStatusSummary\(input\)/);
  assert.match(functionBody(mainJs, "refreshReceiveIntentRecoveryUi"), /applyProductionActionState\(\)/);
  const startReceiveBody = functionBody(mainJs, "startProductionTwoProfileOnionReceive");
  assert.match(startReceiveBody, /rememberReceiveIntentForRoom\(input, true\);\s*refreshReceiveIntentRecoveryUi\(input\)/);
  assert.match(startReceiveBody, /!manualNetworkPermission[\s\S]*openPrivateDeliverySettings\(input\);[\s\S]*refreshReceiveIntentRecoveryUi\(input\);[\s\S]*return;/);
  assert.match(startReceiveBody, /productionTwoProfileOnionReceiveMode\.enabled[\s\S]*receiveAlreadyListening[\s\S]*refreshReceiveIntentRecoveryUi\(input\);[\s\S]*return;/);
  assert.match(startReceiveBody, /privateRouteCodeFailed[\s\S]*refreshReceiveIntentRecoveryUi\(input\);[\s\S]*return;/);
  assert.match(startReceiveBody, /backendLoop\.duplicate_loop_blocked \|\| !backendLoop\.enabled[\s\S]*refreshReceiveIntentRecoveryUi\(input\);[\s\S]*return;/);
  assert.match(mainJs, /function savedInviteRoomListAction/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /receiveState === "paused"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /savedRoomActionLabelKey\("start-receiving"\)/);
  assert.match(functionBody(mainJs, "savedRoomActionLabelKey"), /savedRoomActionStartReceiving/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /rememberReceiveIntentForRoom\(input, true\)/);
  const actionBody = functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction");
  assert.match(actionBody, /intent\.action === "start-receiving"/);
  assert.match(actionBody, /await startProductionTwoProfileOnionReceive\(\)/);
  assert.match(actionBody, /input\.message \? "send-draft" : "receive"/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /latestChatDeliveryNoticeKey === "receiveStartFailed"/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /action\.textContent = t\("startReceiving"\)/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /action\.addEventListener\("click", startProductionTwoProfileOnionReceive\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /composerPrimaryAvailableWithoutDraft/);
  const stopCompletedBody = functionBody(mainJs, "refreshReceiveStopCompletedNotice");
  assert.match(stopCompletedBody, /const currentAction = String\(current\.action \?\? ""\)\.trim\(\)/);
  assert.match(stopCompletedBody, /currentAction === "wait-receive-stop"/);
  assert.match(stopCompletedBody, /currentAction === "start-receiving"/);
  assert.match(stopCompletedBody, /current\.view\?\.nextAction\?\.labelKey \?\? savedRoomActionLabelKey\(currentAction\)/);
  assert.doesNotMatch(stopCompletedBody, /current\.action\?\.action/);
  assert.doesNotMatch(stopCompletedBody, /current\.action\.labelKey/);
  assert.match(i18nJs, /receiveIntentRestartReady/);
  assert.match(i18nJs, /chatNoticeReceiveRestart/);
});

test("room list controls are wired to room flow instead of settings", () => {
  assert.match(mainJs, /fields\.roomListCreateRoom\.addEventListener\("click", createNewInviteRoomFromList\)/);
  assert.match(mainJs, /fields\.roomListJoinRoom\.addEventListener\("click", createRoomFromRoomListInviteCode\)/);
  assert.match(mainJs, /fields\.backToRoomList\.addEventListener\("click", showRoomList\)/);
  assert.match(mainJs, /productionPairwiseInviteGuidanceView/);
  const pairwiseGuidanceBody = functionBody(mainJs, "applyPairwiseInviteGuidance");
  assert.match(pairwiseGuidanceBody, /productionPairwiseInviteGuidanceView/);
  assert.match(pairwiseGuidanceBody, /roomPresent: Boolean/);
  assert.match(pairwiseGuidanceBody, /fields\.productionTwoProfileBoundary/);
  assert.match(pairwiseGuidanceBody, /fields\.productionProfileNextAction/);
  assert.match(pairwiseGuidanceBody, /setProductionFollowupActions\(true, next\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /runSavedInviteRoomListAction\(view\.room \?\? room, view\.nextAction\.action, \{ actionOrigin: view\.nextAction\.origin \}\)/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /await openSavedInviteRoom\(room\)/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /focusPrivateRouteNextAction\(input\)/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomRetryableOutboundAction"), /showRetryableTwoProfileOutboundNotice\(pending\)/);
  assert.match(mainJs, /fields\.roomListInviteCode\.addEventListener\("input", renderReceivedInviteCodeActionState\)/);
  assert.match(
    mainJs,
    /fields\.roomListInviteCode\.addEventListener\("keydown",[\s\S]*createRoomFromRoomListInviteCode\(\);[\s\S]*\}\);/,
  );

  const createBody = functionBody(mainJs, "createNewInviteRoomFromList");
  assert.match(createBody, /clearCurrentInviteRoomInput\(\)/);
  assert.match(createBody, /showRoomDetail\(\)/);
  assert.match(createBody, /return createInviteCode\(\)/);
  assert.doesNotMatch(createBody, /openChatSettingsPanel|openPrivateDeliverySettings/);

  assert.match(functionBody(mainJs, "startInviteRoomFromCode"), /applyPairwiseInviteGuidance\(role === "inviter" \? "create" : "join"/);
  assert.match(functionBody(mainJs, "openInviteRoomFromToken"), /applyPairwiseInviteGuidance\("room-opening"/);
  assert.match(functionBody(mainJs, "openInviteRoomFromToken"), /applyPairwiseInviteGuidance\("saved-room-return"/);
  assert.match(functionBody(mainJs, "openInviteRoomFromToken"), /applyPairwiseInviteGuidance\("room-ready"/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /const safetyConfirmed = twoProfileSafetyConfirmedForInput\(roomInput\)/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /const verifyBeforeMessaging = !safetyConfirmed && inviteRole !== "inviter"/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /verifyBeforeMessaging \? t\("roomOnboardingNextVerify"\) : warningText/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /verifyBeforeMessaging \? "sendLockedUntilVerified" : "inviteRoomReadyAfterSessionCode"/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /else if \(!safetyConfirmed\) \{[\s\S]*focusSafetyConfirmation\(\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /const safetyConfirmed = twoProfileSafetyConfirmedForInput\(twoProfileRoomIdentityInput\(currentInput\)\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /: focusSafetyConfirmation/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /typeof postCheckFocus === "function"[\s\S]*postCheckFocus\(\)/);
  assert.match(functionBody(mainJs, "removeSavedInviteRoom"), /applyPairwiseInviteGuidance\("delete"/);

  assert.match(functionBody(mainJs, "createRoomFromRoomListInviteCode"), /fields\.roomListInviteCode/);
  assert.match(
    functionBody(mainJs, "createRoomFromRoomListInviteCode"),
    /startInviteRoomFromCode\(\{ code, role: "joiner" \}\)/,
  );

  const startBody = functionBody(mainJs, "startInviteRoomFromCode");
  assert.match(startBody, /showRoomDetail\(\)/);
  assert.match(startBody, /closeChatSettingsPanel\(\)/);
  assert.match(startBody, /const openInput = productionTwoProfileInput\(\)/);
  assert.match(startBody, /twoProfileTranscriptInputStillCurrent\(openInput\)/);
  assert.match(startBody, /return openInviteRoomFromToken\(openInput\)/);
  assert.doesNotMatch(startBody, /openChatSettingsPanel|openPrivateDeliverySettings/);

  for (const key of [
    "pairwiseInviteNextShareCode",
    "pairwiseInviteNextOpenRoom",
    "pairwiseInviteNextVerifyPhrase",
    "pairwiseInviteNextVerifyOrWrite",
    "pairwiseInviteNextCreateOrPasteAgain",
    "pairwiseInviteNextFreshCode",
  ]) {
    assert.match(i18nJs, new RegExp(`${key}:`));
  }
  assert.match(i18nJs, /inviteRoomReadyAfterSessionCode: "Room is ready\. Compare the verification phrase before writing\."/);
  assert.match(i18nJs, /connectionGuideSetupText: "The invite code opens the room; compare the verification phrase before messaging\."/);
  assert.doesNotMatch(i18nJs, /You can send a message now|바로 메시지를 보낼 수 있습니다|Room is ready\. Write a message to continue/);
  assert.doesNotMatch(mainJs, /You can send a message now|바로 메시지를 보낼 수 있습니다|Room is ready\. Write a message to continue/);
  assert.match(i18nJs, /No usernames or address book/);
  assert.match(i18nJs, /사용자 이름이나 주소록 없이/);
});

test("room list create action does not overlap the app settings action", () => {
  assert.match(stylesCss, /body\.is-room-list-mode \.room-list-panel\s*\{[\s\S]*padding-top:\s*48px;/);
  assert.match(stylesCss, /\.system-settings-panel\s*\{[\s\S]*top:\s*14px;[\s\S]*right:\s*14px;/);
  assert.match(
    stylesCss,
    /@media \(max-width: 560px\) \{[\s\S]*body\.is-room-list-mode \.room-list-header\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\);/,
  );
  assert.match(
    stylesCss,
    /@media \(max-width: 560px\) \{[\s\S]*body\.is-room-list-mode \.room-list-header button\s*\{[\s\S]*justify-self:\s*start;/,
  );
});

test("room context switches clear stale manual message payloads", () => {
  assert.match(mainJs, /function clearManualMessagePayloadsForRoomContextChange/);
  assert.match(functionBody(mainJs, "clearManualMessagePayloadsForRoomContextChange"), /resetProductionMessageImportState\(\)/);
  assert.match(functionBody(mainJs, "clearManualMessagePayloadsForRoomContextChange"), /clearManualMessageDraftForReplySelection\(\)/);
  assert.match(functionBody(mainJs, "clearManualMessageDraftForReplySelection"), /productionMessageEnvelope\.value = ""/);
  assert.match(functionBody(mainJs, "clearManualMessageDraftForReplySelection"), /productionRemoteMessageEnvelope\.value = ""/);
  assert.match(functionBody(mainJs, "clearCurrentInviteRoomInput"), /clearManualMessagePayloadsForRoomContextChange\(\)/);
  assert.match(functionBody(mainJs, "prepareRoomListReturnState"), /clearManualMessagePayloadsForRoomContextChange\(\)/);
});

test("room context switches clear stale conversation selection", () => {
  assert.match(functionBody(mainJs, "clearCurrentInviteRoomInput"), /resetProductionTwoProfileTranscript\(\)/);
  assert.match(functionBody(mainJs, "resetProductionTwoProfileTranscript"), /selectedTwoProfileConversationKey = null/);
  assert.match(functionBody(mainJs, "resetProductionTwoProfileTranscript"), /productionTwoProfileConversationEntries\.clear\(\)/);
  assert.match(functionBody(mainJs, "createNewInviteRoomFromList"), /clearCurrentInviteRoomInput\(\)/);
  assert.match(functionBody(mainJs, "openSavedInviteRoom"), /clearCurrentInviteRoomInput\(\)/);
  assert.doesNotMatch(functionBody(mainJs, "removeSavedInviteRoom"), /clearCurrentInviteRoomInput\(\);\s*resetProductionTwoProfileTranscript\(\)/);
});

test("created invite code stays visible after the room becomes ready", () => {
  assert.match(mainJs, /has-inviter-invite-code/);
  assert.match(mainJs, /focusCurrentInviteCodeDisplay\(\)/);
  assert.match(stylesCss, /body\.has-inviter-invite-code \.room-invite-token-panel:not\(\[hidden\]\)/);
  assert.doesNotMatch(stylesCss, /body\.has-ready-session #copy-created-invite-code/);
});

test("reopened inviter rooms do not show the invite code share panel", () => {
  assert.match(mainJs, /let currentInviteCodeShareVisible = false/);
  assert.match(functionBody(mainJs, "renderCurrentInviteCodeDisplay"), /role === "inviter" && currentInviteCodeShareVisible/);
  assert.match(functionBody(mainJs, "createInviteCode"), /currentInviteCodeShareVisible = true/);
  assert.match(functionBody(mainJs, "openSavedInviteRoom"), /currentInviteCodeShareVisible = false/);
  assert.match(functionBody(mainJs, "openSavedInviteRoom"), /const openInput = productionTwoProfileInput\(\)/);
  assert.match(functionBody(mainJs, "openSavedInviteRoom"), /twoProfileTranscriptInputStillCurrent\(openInput\)/);
  assert.match(functionBody(mainJs, "openSavedInviteRoom"), /return openInviteRoomFromToken\(openInput\)/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /const transcriptLoaded = await loadProductionTwoProfileTranscript/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /!transcriptLoaded \|\| !twoProfileTranscriptInputStillCurrent\(input\)/);
});

test("saved room removal is list-only and transcript switching rebuilds entries", () => {
  assert.match(functionBody(mainJs, "removeSavedInviteRoom"), /forgetInviteRoom\(code\)/);
  assert.match(functionBody(mainJs, "removeSavedInviteRoom"), /stopProductionTwoProfileOnionReceiveForInput\(savedInviteRoomInput\(room\), \{ silent: true \}\)/);
  assert.match(functionBody(mainJs, "removeSavedInviteRoom"), /removeRoomConfirm/);
  assert.match(mainJs, /removeRoomNotice/);
  assert.doesNotMatch(functionBody(mainJs, "removeSavedInviteRoom"), /invoke\(/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /rememberReceiveIntentForRoom\(roomInput, false\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /clearPrivateRouteFollowupForRoom\(roomInput\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /clearChatDeliveryNoticeForInput\(roomInput\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /clearPrivateRouteRuntimeStateForInput\(roomInput\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /persistPrivateRouteRuntimeState\(\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /connectionCode: trimmedCode/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /twoProfileSafetyStorageKeys\(roomInput\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /localStoreRemove\(key\)/);
  const routeRuntimeClearBody = functionBody(mainJs, "clearPrivateRouteRuntimeStateForInput");
  assert.match(routeRuntimeClearBody, /for \(const roomKey of privateRouteRoomKeys\(input\)\)/);
  assert.match(routeRuntimeClearBody, /clearProductionPayloadSlotsForRoomFingerprint\(roomKey\)/);
  assert.match(routeRuntimeClearBody, /localPrivateRouteCodesByRoom\.delete\(roomKey\)/);
  assert.match(routeRuntimeClearBody, /activeLocalPrivateRouteCodesByRoom\.delete\(roomKey\)/);
  assert.match(routeRuntimeClearBody, /localPrivateRouteLifecycleByRoom\.delete\(roomKey\)/);
  assert.match(routeRuntimeClearBody, /peerPrivateRouteDraftsByRoom\.delete\(roomKey\)/);
  assert.match(routeRuntimeClearBody, /latestProductionTwoProfileRealOnionResultsByRoom\.delete\(roomKey\)/);
  assert.match(routeRuntimeClearBody, /latestProductionTwoProfileRealOnionRecoveriesByRoom\.delete\(roomKey\)/);
  assert.match(routeRuntimeClearBody, /latestProductionTwoProfileRealOnionWaitCanceledFingerprints\.delete\(roomKey\)/);
  const routeRuntimePersistBody = functionBody(mainJs, "persistPrivateRouteRuntimeState");
  assert.match(routeRuntimePersistBody, /persistPrivateRouteMap\(localPrivateRouteCodesStorageKey, localPrivateRouteCodesByRoom\)/);
  assert.match(routeRuntimePersistBody, /persistPrivateRouteLifecycleMap\(localPrivateRouteLifecycleStorageKey, localPrivateRouteLifecycleByRoom\)/);
  assert.match(routeRuntimePersistBody, /persistPrivateRouteMap\(peerPrivateRouteDraftsStorageKey, peerPrivateRouteDraftsByRoom\)/);
  assert.match(routeRuntimePersistBody, /persistRealOnionRecoveries\(\)/);
  assert.match(mainJs, /function clearPrivateRouteFollowupForRoom/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /silentStop: silent/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /if \(silent\) \{[\s\S]*rememberProductionTwoProfileOnionReceiveRuntimeState\("stopped"\)/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /else \{[\s\S]*setProductionTwoProfileOnionReceiveRuntimeState\("stopped"\)/);
  assert.match(functionBody(mainJs, "pollProductionTwoProfileOnionReceiveStopConfirmation"), /silentStop === true/);
  assert.match(functionBody(mainJs, "pollProductionTwoProfileOnionReceiveStopConfirmation"), /markProductionTwoProfileOnionReceiveStopped\(backendLoop,[\s\S]*silent,[\s\S]*input: receiveOwnerInput/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /markProductionTwoProfileOnionReceiveStopped\(backendLoop,[\s\S]*silent,[\s\S]*input: targetInput/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceive"), /stopProductionTwoProfileOnionReceiveForInput\(productionTwoProfileInput\(\)\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileTranscriptEntries"), /resetProductionTwoProfileTranscript/);
  assert.match(functionBody(mainJs, "resetProductionTwoProfileTranscript"), /productionTwoProfileConversationEntries\.clear\(\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /rememberCurrentInviteRoomMetadata\(\)/);
  assert.match(mainJs, /function reconcileCurrentInviteRoomMetadataFromTranscriptEntries/);
  assert.match(functionBody(mainJs, "reconcileCurrentInviteRoomMetadataFromTranscriptEntries"), /productionInviteRoomConversationMetadata\(entries \?\? \[\]\)/);
});

test("room transcript refresh is scoped to the current room", () => {
  assert.match(mainJs, /let inviteRoomPresenceRefreshFingerprint = ""/);
  assert.match(functionBody(mainJs, "stopInviteRoomPresenceRefresh"), /inviteRoomPresenceRefreshFingerprint = ""/);
  assert.match(functionBody(mainJs, "startInviteRoomPresenceRefresh"), /const fingerprint = twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "startInviteRoomPresenceRefresh"), /inviteRoomPresenceRefreshFingerprint = fingerprint/);
  assert.match(
    functionBody(mainJs, "startInviteRoomPresenceRefresh"),
    /inviteRoomPresenceRefreshFingerprint === fingerprint && result\?\.open === false/,
  );
  assert.match(
    functionBody(mainJs, "startInviteRoomPresenceRefresh"),
    /catch\(\(\) => \{[\s\S]*inviteRoomPresenceRefreshFingerprint === fingerprint[\s\S]*stopInviteRoomPresenceRefresh\(\)/,
  );
  assert.match(mainJs, /let inviteRoomTranscriptRefreshInFlight = false/);
  assert.match(functionBody(mainJs, "startInviteRoomTranscriptRefresh"), /inviteRoomTranscriptRefreshInFlight/);
  assert.match(functionBody(mainJs, "startInviteRoomTranscriptRefresh"), /finally/);
  assert.match(
    functionBody(mainJs, "startInviteRoomTranscriptRefresh"),
    /catch\(\(\) => \{[\s\S]*inviteRoomTranscriptRefreshFingerprint === fingerprint[\s\S]*stopInviteRoomTranscriptRefresh\(\)/,
  );
  assert.match(mainJs, /function twoProfileTranscriptInputStillCurrent/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /transcriptInput/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /twoProfileTranscriptInputStillCurrent\(transcriptInput\)/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /return true;/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /catch \(error\)[\s\S]*return false;/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /invokeInviteRoomSessionStatus/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /reconcileCurrentInviteRoomMetadataFromTranscriptEntries\(entries,[\s\S]*sessionStatus/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /const sessionCheckInput = twoProfileRoomIdentityInput\(input\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /twoProfileTranscriptInputStillCurrent\(sessionCheckInput\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /const transcriptLoaded = await loadProductionTwoProfileTranscript/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /!transcriptLoaded \|\| !twoProfileTranscriptInputStillCurrent\(sessionCheckInput\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /rememberTwoProfileSessionStatus\(sessionCheckInput, result\)/);
  assert.match(functionBody(mainJs, "twoProfileTranscriptInputStillCurrent"), /twoProfileSessionStatusFingerprint\(current\) === twoProfileSessionStatusFingerprint\(input\)/);
});

test("conversation selection keys are scoped to the active invite room", () => {
  assert.match(functionBody(mainJs, "twoProfileConversationKey"), /entry\.roomFingerprint \?\? twoProfileSessionStatusFingerprint\(productionTwoProfileInput\(\)\)/);
  assert.match(mainJs, /function appendProductionTwoProfileConversationStatus\([\s\S]*input = productionTwoProfileInput\(\),[\s\S]*\)/);
  assert.match(functionBody(mainJs, "appendProductionTwoProfileConversationStatus"), /roomFingerprint: twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "selectTwoProfileConversationMessage"), /roomFingerprint: twoProfileSessionStatusFingerprint\(options\.input \?\? productionTwoProfileInput\(\)\)/);
  assert.match(mainJs, /function renderProductionTwoProfileTranscriptEntries\(entries, input = productionTwoProfileInput\(\)\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileTranscriptEntries"), /,\s*input,\s*\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileTranscriptEntries"), /resetProductionTwoProfileTranscript\(\{ preserveSelection: true \}\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileTranscriptEntries"), /clearStaleTwoProfileConversationSelection\(\)/);
  assert.match(functionBody(mainJs, "clearStaleTwoProfileConversationSelection"), /productionTwoProfileConversationEntries\.has\(selectedTwoProfileConversationKey\)/);
});

test("same-profile invite rooms are scoped by invite code", () => {
  assert.match(functionBody(mainJs, "twoProfileSessionStatusFingerprint"), /input\.passphrase/);
  assert.match(functionBody(mainJs, "productionTwoProfileInput"), /connectionCode:/);
  assert.match(functionBody(mainJs, "productionTwoProfileInput"), /inviteRole:/);
  assert.match(functionBody(mainJs, "twoProfileSessionStatusFingerprint"), /input\.connectionCode/);
  assert.match(functionBody(mainJs, "twoProfileSessionStatusFingerprint"), /input\.inviteRole/);
  assert.match(functionBody(mainJs, "currentInviteRoomIdentityForInput"), /input\?\.profileA/);
  assert.match(functionBody(mainJs, "currentInviteRoomIdentityForInput"), /return \{ connectionCode: "", inviteRole: "" \}/);
  assert.match(functionBody(mainJs, "twoProfileSafetyConfirmedForInput"), /legacyTwoProfileSafetyStorageKey\(input\)/);
  assert.match(functionBody(mainJs, "twoProfileSafetyConfirmedForInput"), /localStoreSet\(key, "confirmed"\)/);
  assert.match(functionBody(mainJs, "twoProfileSafetyStorageKeys"), /legacyTwoProfileSafetyStorageKey\(input\)/);
  assert.match(functionBody(mainJs, "renderTwoProfileSafetyConfirm"), /const safetyLoaded = Boolean/);
  assert.match(functionBody(mainJs, "renderTwoProfileSafetyConfirm"), /!safetyLoaded/);
  assert.match(functionBody(mainJs, "confirmTwoProfileSafetyForInput"), /!twoProfileSafetyForInput\(input\)/);
  assert.doesNotMatch(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /confirmTwoProfileSafetyForInput/);
  assert.match(functionBody(mainJs, "confirmCurrentTwoProfileSafety"), /confirmTwoProfileSafetyForInput\(input\)/);
  assert.match(actionStateJs, /export function productionVersionIntegrityView/);
  assert.match(actionStateJs, /export function productionWindowsRuntimeParityView/);
  assert.match(actionStateJs, /export function productionWindowsPublicArtifactCandidateView/);
  assert.match(actionStateJs, /const emergencyAdvisoryPath = "scripts\/prepare_macos_emergency_release_advisory_packet\.sh"/);
  assert.match(actionStateJs, /const highRiskReleaseIntegrityGatePath = "scripts\/high_risk_release_integrity_gate_once\.sh"/);
  assert.match(actionStateJs, /emergency_advisory_path=\$\{emergencyAdvisoryPath\}/);
  assert.match(actionStateJs, /high_risk_release_integrity_gate_path=\$\{highRiskReleaseIntegrityGatePath\}/);
  assert.match(actionStateJs, /dependency_inventory_lockfile_hash_bound=true/);
  assert.match(actionStateJs, /tauri_csp_permissions_remote_code_boundary=true/);
  assert.match(actionStateJs, /high_risk_release_claim_allowed=false/);
  assert.match(actionStateJs, /rollback_warning_policy=manual-warning-only/);
  assert.match(actionStateJs, /rollback_prevention_claimed=false/);
  assert.match(actionStateJs, /windows_distribution=local-build-candidate-only/);
  assert.match(actionStateJs, /support_report_raw_path_allowed=false/);
  assert.match(actionStateJs, /macos_only_wording_allowed=false/);
  assert.match(actionStateJs, /shared_core_bypass_allowed=false/);
  assert.match(actionStateJs, /windows_public_artifact_candidate=true/);
  assert.match(actionStateJs, /webview2_runtime_required=true/);
  assert.match(actionStateJs, /runtime_result_external_peer_evidence_separated=true/);
  assert.match(actionStateJs, /smartscreen_security_boundary_claimed=false/);
  assert.match(actionStateJs, /full_censorship_resistance_claim=false/);
  assert.match(actionStateJs, /high_risk_transport_mode=onion-only/);
  assert.match(actionStateJs, /high_risk_transport_runtime_evidence_required_for_ready=true/);
  assert.match(actionStateJs, /high_risk_transport_runtime_evidence_present=false/);
  assert.match(actionStateJs, /transport-runtime-evidence-missing/);
  assert.match(actionStateJs, /high_risk_transport_not_ready_reason=runtime-network-disabled-until-explicit-user-action/);
  assert.doesNotMatch(actionStateJs, /windows_public_artifact_ready=true|windows_installer_ready=true|windows_signing_ready=true|smartscreen_security_boundary_claimed=true|shared_core_bypass_allowed=true/);
  assert.match(mainJs, /productionVersionIntegrityView/);
  assert.match(mainJs, /productionWindowsRuntimeParityView/);
  assert.match(functionBody(mainJs, "renderVersionIntegrityStatus"), /FIELD_TEST_APP_VERSION/);
  assert.match(functionBody(mainJs, "renderVersionIntegrityStatus"), /v0\.1\.0-beta-onion-unsigned/);
  assert.match(functionBody(mainJs, "renderWindowsRuntimeParityStatus"), /navigator\?\.platform/);
  assert.match(functionBody(mainJs, "renderWindowsRuntimeParityStatus"), /windowsRuntimeParityStatus/);
  assert.match(functionBody(mainJs, "renderHighRiskThreatModelStatus"), /productionHighRiskThreatModelBoundaryView/);
  assert.match(functionBody(mainJs, "renderHighRiskThreatModelStatus"), /highRiskThreatModelStatus/);
  assert.match(functionBody(mainJs, "renderHighRiskTransportMetadataStatus"), /productionHighRiskTransportMetadataBoundaryView/);
  assert.match(functionBody(mainJs, "renderHighRiskTransportMetadataStatus"), /highRiskTransportMetadataStatus/);
  assert.match(functionBody(mainJs, "applyLanguage"), /renderVersionIntegrityStatus\(\)/);
  assert.match(functionBody(mainJs, "applyLanguage"), /renderWindowsRuntimeParityStatus\(\)/);
  assert.match(functionBody(mainJs, "applyLanguage"), /renderHighRiskThreatModelStatus\(\)/);
  assert.match(functionBody(mainJs, "applyLanguage"), /renderHighRiskTransportMetadataStatus\(\)/);
  assert.match(stylesCss, /\.version-integrity-status/);
  assert.match(functionBody(mainJs, "twoProfileRoomIdentityInput"), /connectionCode/);
  assert.match(functionBody(mainJs, "twoProfileRoomIdentityInput"), /inviteRole/);
  assert.match(functionBody(mainJs, "latestTwoProfileSuccessForInput"), /roomFingerprint === twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "latestTwoProfileSuccessMatchesDirection"), /latestTwoProfileSuccessForInput\(input\)/);
  assert.match(functionBody(mainJs, "latestTwoProfileSuccessMatchesOppositeDirection"), /latestTwoProfileSuccessForInput\(\{/);
  assert.match(functionBody(mainJs, "latestTwoProfileOutboundDeliveryCandidate"), /String\(entry\.roomFingerprint \?\? ""\)\.trim\(\) === targetRoomFingerprint/);

  for (const name of [
    "saveInviteRoomOutboundMessage",
    "renderProductionTwoProfileResult",
    "renderProductionTwoProfileMessageResult",
    "runProductionTwoProfileRealOnionRoundtrip",
  ]) {
    assert.match(functionBody(mainJs, name), /roomFingerprint: twoProfileSessionStatusFingerprint/);
  }
  assert.match(functionBody(mainJs, "retryTwoProfileOutboundEntry"), /roomFingerprint: currentEntry\.roomFingerprint/);

  assert.match(functionBody(mainJs, "updateMinimalChatMode"), /latestTwoProfileSuccessForInput\(input\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileMemory"), /latestTwoProfileSuccessForInput\(input\)/);
  assert.match(functionBody(mainJs, "sendProductionTwoProfileEndpointUpdate"), /latestTwoProfileSuccessForInput\(input\)/);
  assert.match(functionBody(mainJs, "runProductionTwoProfileRealOnionRoundtrip"), /latestRealOnionFieldTestResult\(roomInput\)/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /latestTwoProfileSessionStatusForCurrentInput\(transcriptInput\)/);
});

test("busy actions only clear the action they started", () => {
  assert.match(mainJs, /function clearProductionBusyAction\(action\)/);
  assert.match(functionBody(mainJs, "clearProductionBusyAction"), /productionBusyAction === action/);

  const directNullClearedMain = mainJs
    .replace("let productionBusyAction = null;", "")
    .replace(
      /function clearProductionBusyAction\(action\) \{\s*if \(productionBusyAction === action\) \{\s*productionBusyAction = null;\s*\}\s*\}/,
      "",
    );
  assert.doesNotMatch(directNullClearedMain, /productionBusyAction = null;/);

  const busyActions = [...mainJs.matchAll(/productionBusyAction = "([^"]+)";/g)].map((match) => match[1]);
  assert.notEqual(busyActions.length, 0, "expected production busy actions");
  for (const action of busyActions) {
    assert.match(mainJs, new RegExp(`clearProductionBusyAction\\("${action}"\\)`), `missing scoped busy clear for ${action}`);
  }

  assert.match(mainJs, /let activeInviteRoomOpenFingerprint = ""/);
  assert.match(functionBody(mainJs, "setInviteRoomOpenBusy"), /productionBusyAction = "invite-room-open"/);
  assert.match(functionBody(mainJs, "setInviteRoomOpenBusy"), /activeInviteRoomOpenFingerprint = twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "inviteRoomOpenBusyMatches"), /productionBusyAction === "invite-room-open"/);
  assert.match(functionBody(mainJs, "inviteRoomOpenBusyMatches"), /activeInviteRoomOpenFingerprint === twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "clearInviteRoomOpenBusy"), /inviteRoomOpenBusyMatches\(input\)/);
  assert.match(functionBody(mainJs, "clearInviteRoomOpenBusy"), /clearProductionBusyAction\("invite-room-open"\)/);
  assert.match(functionBody(mainJs, "openInviteRoomFromToken"), /setInviteRoomOpenBusy\(openInput\)/);
  assert.match(functionBody(mainJs, "openInviteRoomFromToken"), /clearInviteRoomOpenBusy\(openInput\)/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /clearProductionBusyAction\("two-profile-transcript-load"\)/);
  assert.match(
    functionBody(mainJs, "runProductionTwoProfileRealOnionRoundtrip"),
    /clearProductionBusyAction\("two-profile-real-onion-roundtrip"\)/,
  );
});

test("profile unlock and manual import refresh the room captured at action start", () => {
  const unlockBody = functionBody(mainJs, "unlockProductionProfile");
  assert.match(unlockBody, /const twoProfileRefreshInput = productionTwoProfileInput\(\)/);
  assert.match(unlockBody, /refreshTwoProfileSessionAfterProfileUnlock\(profile, passphrase, twoProfileRefreshInput\)/);

  const unlockRefreshBody = functionBody(mainJs, "refreshTwoProfileSessionAfterProfileUnlock");
  assert.match(mainJs, /async function refreshTwoProfileSessionAfterProfileUnlock\([\s\S]*input = productionTwoProfileInput\(\),[\s\S]*\)/);
  assert.match(unlockRefreshBody, /invokeTwoProfileRuntimeResumeStatus\(input\)/);
  assert.match(unlockRefreshBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(unlockRefreshBody, /await loadProductionTwoProfileTranscript\(\{[\s\S]*autoResume: true,[\s\S]*input/);
  assert.match(unlockRefreshBody, /runtimeResumeResult: resume/);
  assert.match(unlockRefreshBody, /rememberTwoProfileSessionStatus\(input, result\)/);

  const importBody = functionBody(mainJs, "importProductionMessageEnvelope");
  assert.match(importBody, /const twoProfileRefreshInput = productionTwoProfileInput\(\)/);
  assert.match(importBody, /refreshTwoProfileConversationAfterManualImport\([\s\S]*twoProfileRefreshInput/);

  const importRefreshBody = functionBody(mainJs, "refreshTwoProfileConversationAfterManualImport");
  assert.match(mainJs, /async function refreshTwoProfileConversationAfterManualImport\([\s\S]*input = productionTwoProfileInput\(\),[\s\S]*\)/);
  assert.match(importRefreshBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(importRefreshBody, /await loadProductionTwoProfileTranscript\(\{ quiet: true, refreshSessionStatus: false, input \}\)/);
  assert.match(importRefreshBody, /renderProductionTwoProfileMemory\(input\)/);
});

test("manual message actions ignore stale inputs before updating current UI", () => {
  assert.match(mainJs, /function productionMessageInputStillCurrent/);
  assert.match(functionBody(mainJs, "productionMessageInput"), /roomFingerprint: twoProfileSessionStatusFingerprint\(productionTwoProfileInput\(\)\)/);
  assert.match(functionBody(mainJs, "productionMessageImportFingerprint"), /const roomFingerprint = String\(input\.roomFingerprint \?\? ""\)\.trim\(\)/);
  assert.match(functionBody(mainJs, "productionMessageImportFingerprint"), /\$\{roomFingerprint\}\\n\$\{profile\}/);
  assert.match(functionBody(mainJs, "productionMessageInputStillCurrent"), /current\.roomFingerprint === input\.roomFingerprint/);
  assert.match(functionBody(mainJs, "productionMessageInputStillCurrent"), /current\.envelopePayload === input\.envelopePayload/);
  assert.match(functionBody(mainJs, "productionMessageImportFingerprint"), /input\.passphrase/);
  assert.match(functionBody(mainJs, "productionMessageImportFingerprint"), /input\.envelopePayload/);

  const exportBody = functionBody(mainJs, "exportProductionMessageEnvelope");
  assert.match(exportBody, /const twoProfileRefreshInput = productionTwoProfileInput\(\)/);
  assert.match(exportBody, /if \(!productionMessageInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(exportBody, /syncTwoProfileConversationAfterManualExport\([\s\S]*twoProfileRefreshInput/);
  assert.match(exportBody, /twoProfileTranscriptInputStillCurrent\(twoProfileRefreshInput\)/);

  const importBody = functionBody(mainJs, "importProductionMessageEnvelope");
  assert.match(importBody, /const twoProfileRefreshInput = productionTwoProfileInput\(\)/);
  assert.match(importBody, /if \(!productionMessageInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(importBody, /latestProductionMessageImport = productionMessageImportFingerprint\(input\)/);
  assert.match(importBody, /refreshTwoProfileConversationAfterManualImport\([\s\S]*twoProfileRefreshInput/);

  const receivedBody = functionBody(mainJs, "exportProductionReceivedMessage");
  assert.match(receivedBody, /selectedManualMessageActionBlocker\("show plaintext", input\)/);
  assert.match(receivedBody, /const twoProfileRefreshInput = productionTwoProfileInput\(\)/);
  assert.match(receivedBody, /if \(!productionMessageInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(receivedBody, /syncTwoProfileConversationAfterReceivedExport\([\s\S]*twoProfileRefreshInput/);

  assert.match(functionBody(mainJs, "syncTwoProfileConversationAfterManualExport"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(functionBody(mainJs, "syncTwoProfileConversationAfterReceivedExport"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(functionBody(mainJs, "selectedManualMessageActionBlocker"), /action === "show plaintext"/);
  assert.match(functionBody(mainJs, "selectedManualMessageActionBlocker"), /Select \$\{entry\.receiver\} before showing plaintext/);
  assert.match(functionBody(mainJs, "selectedManualMessageActionBlocker"), /!latestProductionMessageImportMatches\(input\)/);
  assert.match(functionBody(mainJs, "selectedManualMessageActionBlocker"), /Import selected pending message #\$\{entry\.messageNumber\} in this room before showing plaintext/);
  assert.match(functionBody(actionStateJs, "productionActionAvailability"), /exportReceivedMessage: !busy && selectedMessageInputMatches && hasReceivedExportInput/);
  assert.match(functionBody(actionStateJs, "productionManualMessageCheckView"), /click Show plaintext before writing the reply/);
});

test("manual message envelope slots require the active pending message", () => {
  assert.match(mainJs, /function pendingMessageEnvelopeSlotForActiveProfile/);
  assert.match(functionBody(mainJs, "pendingMessageEnvelopeSlotForActiveProfile"), /selectedTwoProfilePendingConversationEntry\(\)/);
  assert.match(functionBody(mainJs, "pendingMessageEnvelopeSlotForActiveProfile"), /latestTwoProfilePendingConversationEntry\(\)/);
  assert.match(functionBody(mainJs, "pendingMessageEnvelopeSlotForActiveProfile"), /messageEnvelopeSlotRecord\(counterpart, entry\.roomFingerprint\)/);
  assert.match(functionBody(mainJs, "messageEnvelopeSlotReadyForEntry"), /messageEnvelopeSlotImportReadyForEntry\(slot, entry\)/);
  assert.match(functionBody(mainJs, "activeMessageEnvelopeSlotReady"), /messageEnvelopeSlotImportReadyForEntry\(slot, entry\)/);
  assert.match(functionBody(mainJs, "messageEnvelopeSlotKey"), /productionPayloadSlotKey\(profile, roomFingerprint\)/);
  assert.match(functionBody(mainJs, "messageEnvelopeSlotRecord"), /messageEnvelopeSlotKey\(profile, roomFingerprint\)/);
  assert.match(functionBody(mainJs, "storeMessageEnvelopeSlot"), /roomFingerprint/);
  assert.match(functionBody(mainJs, "storeMessageEnvelopeSlot"), /messageEnvelopeSlotKey\(slot\.sender, slot\.roomFingerprint\)/);
  assert.match(functionBody(mainJs, "selectedMessageEnvelopeMetadata"), /explicitUserAction: true/);
  assert.match(functionBody(mainJs, "selectedMessageEnvelopeMetadata"), /manualAction: "export-envelope"/);
  assert.match(functionBody(mainJs, "pruneStaleMessageEnvelopeSlots"), /stillImportReadyForConversation/);
  assert.match(functionBody(mainJs, "pruneStaleMessageEnvelopeSlots"), /messageEnvelopeSlotImportReadyForEntry\(slot, entry\)/);
  assert.doesNotMatch(functionBody(mainJs, "pruneStaleMessageEnvelopeSlots"), /typeof slot === "string"[\s\S]*continue/);

  const loadBody = functionBody(mainJs, "loadProductionMessageEnvelope");
  assert.match(loadBody, /pendingMessageEnvelopeSlotForActiveProfile\(profile\)/);
  assert.match(loadBody, /if \(!entry\)/);
  assert.match(loadBody, /value && !messageEnvelopeSlotMatchesEntry\(slot, entry\)/);
  assert.match(loadBody, /messageEnvelopeSlotRecoveryHint\(slot, entry\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /activeMessageEnvelopeSlotReady\(activeProductionProfileName\(\)\)/);
});

test("manual message envelope slots are import-ready only for active lifecycle rows", () => {
  const slot = createMessageEnvelopeSlot("alice", "ADENV1|1|chan|9|data|00", {
    explicitUserAction: true,
    manualAction: "export-envelope",
    receiver: "bob",
    roomFingerprint: "room-1",
    messageNumber: 9,
    message: "hello",
  });
  const sentEntry = {
    sender: "alice",
    receiver: "bob",
    roomFingerprint: "room-1",
    messageNumber: 9,
    message: "hello",
    statuses: new Set(["sent"]),
    outboundDeliveryState: "sent",
  };
  assert.equal(messageEnvelopeSlotCreatedByExplicitUserAction(slot), true);
  assert.equal(messageEnvelopeSlotMatchesEntry(slot, sentEntry), true);
  assert.equal(messageEnvelopeSlotImportReadyForEntry(slot, sentEntry), true);
  assert.equal(messageEnvelopeSlotMismatchReason(slot, sentEntry), "matched");
  assert.equal(
    messageEnvelopeSlotImportReadyForEntry(slot, {
      ...sentEntry,
      outboundDeliveryState: "canceled",
    }),
    false,
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, {
      ...sentEntry,
      outboundDeliveryState: "canceled",
    }),
    "canceled-entry",
  );
  assert.match(
    messageEnvelopeSlotRecoveryHint(slot, {
      ...sentEntry,
      outboundDeliveryState: "canceled",
    }),
    /canceled/,
  );
  assert.equal(
    messageEnvelopeSlotImportReadyForEntry(slot, {
      ...sentEntry,
      statuses: new Set(["sent", "received"]),
    }),
    false,
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, {
      ...sentEntry,
      statuses: new Set(["sent", "received"]),
    }),
    "already-received-entry",
  );
  assert.match(
    messageEnvelopeSlotRecoveryHint(slot, {
      ...sentEntry,
      statuses: new Set(["sent", "received"]),
    }),
    /already received/,
  );
  assert.equal(messageEnvelopeSlotImportReadyForEntry("ADENV1LEGACY", sentEntry), false);
  assert.equal(messageEnvelopeSlotMismatchReason("ADENV1LEGACY", sentEntry), "legacy-unscoped-slot");
  assert.match(messageEnvelopeSlotRecoveryHint("ADENV1LEGACY", sentEntry), /unscoped/);
  assert.equal(
    createMessageEnvelopeSlot("alice", "ADENV1IMPLICIT", {
      receiver: "bob",
      roomFingerprint: "room-1",
      messageNumber: 9,
      message: "hello",
    }),
    null,
  );
  assert.equal(
    messageEnvelopeSlotImportReadyForEntry(
      {
        payload: "ADENV1IMPLICIT",
        sender: "alice",
        receiver: "bob",
        roomFingerprint: "room-1",
        messageNumber: 9,
        message: "hello",
      },
      sentEntry,
    ),
    false,
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(
      {
        payload: "ADENV1IMPLICIT",
        sender: "alice",
        receiver: "bob",
        roomFingerprint: "room-1",
        messageNumber: 9,
        message: "hello",
      },
      sentEntry,
    ),
    "missing-explicit-user-action",
  );
  assert.match(functionBody(mainJs, "cancelTwoProfileOutboundEntry"), /clearMessageEnvelopeSlotForConversationEntry\(currentEntry\)/);
});

test("manual message envelope import decision fails closed for malformed and replayed payloads", () => {
  const accepted = messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|data|00", {
    expectedMessageNumber: 9,
  });
  const malformed = messageEnvelopePayloadImportDecision("not-json");
  const oversized = messageEnvelopePayloadImportDecision(`ADENV1|1|chan|9|data|${"00".repeat(8193)}`);
  const corrupted = messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|data|0z");
  const wrongType = messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|control|00");
  const duplicate = messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|data|00", {
    duplicatePayloads: new Set(["ADENV1|1|chan|9|data|00"]),
  });
  const replayed = messageEnvelopePayloadImportDecision("ADENV1|1|chan|9|data|00", {
    replayedMessageNumbers: new Set([9]),
  });

  assert.equal(accepted.accepted, true);
  assert.match(accepted.boundary, /plaintext_returned=false/);
  for (const decision of [malformed, oversized, corrupted, wrongType, duplicate, replayed]) {
    assert.equal(decision.accepted, false);
    assert.equal(decision.imported, false);
    assert.equal(decision.delivered, false);
    assert.equal(decision.plaintextReturned, false);
    assert.equal(decision.pathReturned, false);
    assert.equal(decision.keyMaterialExposed, false);
    assert.equal(decision.genericError, false);
    assert.doesNotMatch(decision.boundary, /secret|passphrase|\/tmp|private/i);
  }
  assert.equal(malformed.kind, "malformed");
  assert.equal(oversized.kind, "oversized");
  assert.equal(corrupted.kind, "corrupted");
  assert.equal(wrongType.kind, "wrong_type");
  assert.equal(duplicate.kind, "duplicate");
  assert.equal(replayed.kind, "replay_rejected");
});

test("manual message envelope slots are scoped to the room fingerprint", () => {
  const slot = createMessageEnvelopeSlot("Alice", "ADENV1|1|chan|7|data|00", {
    explicitUserAction: true,
    manualAction: "export-envelope",
    receiver: "Bob",
    roomFingerprint: "room-a",
    messageNumber: 7,
    message: "secret",
  });
  assert.equal(slot.roomFingerprint, "room-a");
  assert.equal(
    messageEnvelopeSlotMatchesEntry(slot, {
      sender: "alice",
      receiver: "bob",
      roomFingerprint: "room-a",
      messageNumber: 7,
      message: "secret",
    }),
    true,
  );
  assert.equal(
    messageEnvelopeSlotMatchesEntry(slot, {
      sender: "alice",
      receiver: "bob",
      roomFingerprint: "room-b",
      messageNumber: 7,
      message: "secret",
    }),
    false,
  );
  assert.equal(
    messageEnvelopeSlotMismatchReason(slot, {
      sender: "alice",
      receiver: "bob",
      roomFingerprint: "room-b",
      messageNumber: 7,
      message: "secret",
    }),
    "room-fingerprint-mismatch",
  );
  assert.match(
    messageEnvelopeSlotRecoveryHint(slot, {
      sender: "alice",
      receiver: "bob",
      roomFingerprint: "room-b",
      messageNumber: 7,
      message: "secret",
    }),
    /another room/,
  );
});

test("manual setup payload slots are scoped to the active room", () => {
  assert.match(mainJs, /function currentManualPayloadSlotRoomFingerprint/);
  assert.match(functionBody(mainJs, "currentManualPayloadSlotRoomFingerprint"), /twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "productionPayloadSlotKey"), /normalizedProfile && normalizedRoom/);
  assert.match(functionBody(mainJs, "productionPayloadSlotMatchesRoom"), /slot\.roomFingerprint/);
  assert.match(functionBody(mainJs, "storeProductionPayloadSlotRecord"), /productionPayloadSlotKey\(slot\.profile, slot\.roomFingerprint\)/);

  const storeBody = functionBody(mainJs, "storeProductionPayloadSlot");
  assert.match(storeBody, /storeProductionPayloadSlotRecord\(kind, profile, value\)/);
  assert.doesNotMatch(storeBody, /productionPayloadSlots\[kind\]\.set\(profile, value\)/);

  const loadBody = functionBody(mainJs, "loadProductionPayloadSlot");
  assert.match(loadBody, /productionPayloadSlotValue\(kind, counterpart\)/);
  assert.doesNotMatch(loadBody, /productionPayloadSlots\[kind\]\.get\(counterpart\)/);

  const relayBody = functionBody(mainJs, "relayProductionPayloadSlotToPeer");
  assert.match(relayBody, /storeProductionPayloadSlotRecord\(kind, profile, value\)/);
  assert.doesNotMatch(relayBody, /productionPayloadSlots\[kind\]\.set\(profile, value\)/);

  const actionStateBody = functionBody(mainJs, "applyProductionActionState");
  assert.match(actionStateBody, /productionPayloadSlotReady\("pairing", counterpartProfile\)/);
  assert.match(actionStateBody, /productionPayloadSlotReady\("handshakeInit", counterpartProfile\)/);
  assert.match(actionStateBody, /productionPayloadSlotReady\("handshakeReply", counterpartProfile\)/);
  assert.match(actionStateBody, /productionPayloadSlotReady\("handshakeFinish", counterpartProfile\)/);
});

test("pairing and handshake actions ignore stale setup inputs", () => {
  assert.match(mainJs, /function productionPairingInputStillCurrent/);
  assert.match(functionBody(mainJs, "productionPairingInputStillCurrent"), /fieldsToCompare\.every/);

  const pairingBody = functionBody(mainJs, "exportProductionPairingPayload");
  assert.match(pairingBody, /const input = productionPairingInput\(\)/);
  assert.match(pairingBody, /productionPairingInputStillCurrent\(input, \["profile", "passphrase", "rendezvousEndpoint"\]\)/);

  const draftBody = functionBody(mainJs, "saveProductionSessionDraft");
  assert.match(draftBody, /const input = productionPairingInput\(\)/);
  assert.match(draftBody, /productionPairingInputStillCurrent\(input, \["profile", "passphrase", "localPayload", "remotePayload", "safetyConfirmed"\]\)/);
  assert.match(draftBody, /await checkProductionSessionState\(input\)/);

  const safetyBody = functionBody(mainJs, "checkProductionPairingSafety");
  assert.match(safetyBody, /productionPairingInputStillCurrent\(input, \["profile", "passphrase", "localPayload", "remotePayload"\]\)/);
  assert.match(functionBody(mainJs, "pairingSafetyFingerprint"), /input\.profile/);
  assert.match(functionBody(mainJs, "pairingSafetyFingerprint"), /input\.passphrase/);
  assert.match(functionBody(mainJs, "applyProductionPairingSafetyPreviewResult"), /fingerprint: pairingSafetyFingerprint\(input\)/);

  const sessionBody = functionBody(mainJs, "checkProductionSessionState");
  assert.match(mainJs, /async function checkProductionSessionState\(input = productionPairingInput\(\)\)/);
  assert.match(sessionBody, /productionPairingInputStillCurrent\(input, \["profile", "passphrase"\]\)/);

  assert.match(functionBody(mainJs, "exportProductionHandshakeInit"), /productionPairingInputStillCurrent\(input, \["profile", "passphrase"\]\)/);
  assert.match(functionBody(mainJs, "exportProductionHandshakeReply"), /productionPairingInputStillCurrent\(input, \["profile", "passphrase", "initPayload"\]\)/);
  assert.match(functionBody(mainJs, "exportProductionHandshakeFinish"), /productionPairingInputStillCurrent\(input, \["profile", "passphrase", "replyPayload"\]\)/);
  assert.match(functionBody(mainJs, "importProductionHandshakeFinish"), /productionPairingInputStillCurrent\(input, \["profile", "passphrase", "finishPayload"\]\)/);
  assert.match(functionBody(mainJs, "importProductionHandshakeFinish"), /await checkProductionSessionState\(input\)/);
  assert.match(mainJs, /fields\.productionPairingSafetyVerified\.checked && !currentPairingSafetyVerified\(\)/);
});

test("profile unlock and transcript load ignore stale profile inputs", () => {
  assert.match(mainJs, /function productionProfileInputStillCurrent/);
  assert.match(functionBody(mainJs, "productionProfileInputStillCurrent"), /current\.profile === input\.profile/);

  const unlockBody = functionBody(mainJs, "unlockProductionProfile");
  assert.match(unlockBody, /const input = productionProfileInput\(\)/);
  assert.match(unlockBody, /if \(!productionProfileInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(unlockBody, /restoreProductionSessionAfterUnlock\(input\)/);

  const restoreBody = functionBody(mainJs, "restoreProductionSessionAfterUnlock");
  assert.match(restoreBody, /const \{ profile, passphrase \} = input/);
  assert.match(restoreBody, /if \(!productionProfileInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(restoreBody, /production_message_transcript_export/);

  const transcriptBody = functionBody(mainJs, "loadProductionMessageTranscript");
  assert.match(transcriptBody, /const input = productionProfileInput\(\)/);
  assert.match(transcriptBody, /if \(!productionProfileInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
});

test("product unlock lockout shows local-only recovery actions", () => {
  const recoveryBody = functionBody(mainJs, "productionProductUnlockRecoveryView");
  assert.match(recoveryBody, /os_keychain_fallback=false/);
  assert.match(recoveryBody, /backup_recovery=false/);
  assert.match(recoveryBody, /cloud_backup_sync=false/);
  assert.match(recoveryBody, /security_ready=false/);
  assert.match(recoveryBody, /rollback_suspicion_detected/);
  assert.match(recoveryBody, /rollback_resume_blocked/);
  assert.match(recoveryBody, /local_recovery=check-data-lifecycle/);
  assert.match(recoveryBody, /productionProfileUnlockRecoveryView\(result\)/);
  assert.match(recoveryBody, /local_recovery=\$\{profileRecovery\.kind\}/);
  assert.match(recoveryBody, /profileRecovery\.boundary/);
  assert.match(recoveryBody, /productionProfileRecoveryActionsView\(profileRecovery\)/);
  assert.match(recoveryBody, /recoveryActions\.primaryNextAction/);
  assert.match(recoveryBody, /recoveryActions\.boundary/);

  const renderBody = functionBody(mainJs, "renderProductionProductUnlockRecovery");
  assert.match(renderBody, /fields\.productionProfileNextAction/);

  const unlockBody = functionBody(mainJs, "unlockProductionProfile");
  assert.match(unlockBody, /const productUnlockRecovery = renderProductionProductUnlockRecovery\(productUnlock\)/);
  assert.match(unlockBody, /setText\(fields\.productionProfileBoundary, productUnlockRecovery\.boundary\)/);

  const lockBody = functionBody(mainJs, "lockProductionProfile");
  assert.match(lockBody, /renderProductionProductUnlockRecovery\(result, \{ lockedByUser: true \}\)/);

  const panicBody = functionBody(mainJs, "panicLockProductionProfile");
  assert.match(indexHtml, /id="panic-lock-production-profile"/);
  assert.match(panicBody, /productionPanicLockMitigationView\(\)/);
  assert.match(panicBody, /clearProductionSensitiveMemoryState\(\)/);
  assert.match(panicBody, /clearProductionSensitiveFields\(\)/);
  assert.match(panicBody, /classList\.add\("is-panic-locked"\)/);
  assert.match(panicBody, /clearClipboardBestEffort\(\)/);
  assert.match(panicBody, /production_product_lock/);
  assert.match(stylesCss, /body\.is-panic-locked [\s\S]*#production-two-profile-transcript/);
  assert.match(stylesCss, /body\.is-panic-locked [\s\S]*#production-pairing-payload/);
  assert.match(stylesCss, /body\.is-panic-locked [\s\S]*#production-pairing-endpoint/);
});

test("desktop accessibility polish keeps disabled reasons focus and overflow explicit", () => {
  const setDisabledBody = functionBody(mainJs, "setDisabled");
  const buttonStateBody = functionBody(mainJs, "setActionButtonState");
  const singlePrimaryBody = functionBody(mainJs, "enforceSingleCurrentPrimaryAction");
  const focusCurrentBody = functionBody(mainJs, "focusProductionCurrentAction");
  const savedRoomBody = functionBody(mainJs, "renderSavedInviteRooms");
  const transcriptBody = functionBody(mainJs, "renderProductionTwoProfileConversationList");

  assert.match(setDisabledBody, /aria-disabled/);
  assert.match(buttonStateBody, /aria-disabled/);
  assert.match(buttonStateBody, /dataset\.disabledReason/);
  assert.match(buttonStateBody, /aria-description/);
  assert.match(singlePrimaryBody, /querySelectorAll\("button\.is-current-action:not\(:disabled\)"\)/);
  assert.match(singlePrimaryBody, /currentPrimaryActionCount/);
  assert.match(singlePrimaryBody, /currentPrimaryActionTarget/);
  assert.match(singlePrimaryBody, /currentPrimaryActionUnique/);
  assert.match(singlePrimaryBody, /dataset\.currentPrimaryAction/);
  assert.match(focusCurrentBody, /latestProductionCurrentPrimaryActionNode/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /enforceSingleCurrentPrimaryAction/);
  assert.match(savedRoomBody, /item\.tabIndex = 0/);
  assert.match(savedRoomBody, /dataset\.roomRowState = view\.state\.key/);
  assert.match(savedRoomBody, /dataset\.roomRowAction = view\.nextAction\?\.action \?\? "open-room"/);
  assert.match(savedRoomBody, /aria-keyshortcuts", "Enter Space"/);
  assert.match(savedRoomBody, /event\.target !== item/);
  assert.match(transcriptBody, /dataset\.transcriptRowState/);
  assert.match(transcriptBody, /dataset\.transcriptRowSelectable = selectable \? "true" : "false"/);
  assert.match(transcriptBody, /setActionButtonState\(retry, !outboundActionState\.canRunNow/);
  assert.match(transcriptBody, /setActionButtonState\(cancel, !outboundActionState\.canCancelNow/);
  assert.match(stylesCss, /button:focus-visible/);
  assert.match(stylesCss, /summary:focus-visible/);
  assert.match(stylesCss, /input:focus-visible/);
  assert.match(stylesCss, /\.saved-room-list-item:focus-visible/);
  assert.match(stylesCss, /\.message-transcript li\[data-transcript-row-selectable="false"\]:focus-visible/);
  assert.match(stylesCss, /\.saved-room-list-item\s*\{[\s\S]*max-width: 100%;[\s\S]*min-width: 0;/);
  assert.match(stylesCss, /\.saved-room-primary-action\s*\{[\s\S]*max-width: 18ch;[\s\S]*text-overflow: ellipsis;/);
  assert.match(stylesCss, /\.message-transcript \.transcript-row-actions button\s*\{[\s\S]*max-width: min\(100%, 22ch\);[\s\S]*text-overflow: ellipsis;/);
  assert.match(stylesCss, /\.public-recovery-guide li\s*\{[\s\S]*overflow-wrap: anywhere;/);
  assert.match(stylesCss, /\.public-diagnostics-panel textarea\s*\{[\s\S]*max-width: 100%;[\s\S]*overflow-wrap: anywhere;/);
  assert.match(stylesCss, /prefers-reduced-motion: reduce/);
  assert.match(stylesCss, /scroll-behavior: auto !important/);
  assert.match(stylesCss, /\.demo-state,[\s\S]*\.demo-hint,[\s\S]*\.demo-warning/);
  assert.match(stylesCss, /overflow-wrap: anywhere/);
  assert.match(stylesCss, /cursor: not-allowed/);
});

test("runtime resume rollback block routes users to local data recovery", () => {
  const recoveryBody = functionBody(mainJs, "runtimeResumeRollbackRecoveryView");
  assert.match(recoveryBody, /local_recovery=check-data-lifecycle/);
  assert.match(recoveryBody, /recovery=check-data-lifecycle/);
  assert.match(recoveryBody, /os_keychain_fallback=false/);
  assert.match(recoveryBody, /backup_recovery=false/);
  assert.match(recoveryBody, /cloud_backup_sync=false/);
  assert.match(recoveryBody, /security_ready=false/);
  assert.match(recoveryBody, /rollback_prevention/);
  assert.match(recoveryBody, /rollback_prevention=false/);
  assert.match(recoveryBody, /secure_delete_claim/);
  assert.match(recoveryBody, /secure_delete_claim=false/);

  const applyBody = functionBody(mainJs, "applyRuntimeResumeRollbackRecovery");
  assert.match(applyBody, /fields\.productionDataLifecycle/);
  assert.match(applyBody, /fields\.productionProfileNextAction/);
  assert.match(applyBody, /setProductionFollowupActions\(true, view\.next\)/);
  assert.match(mainJs, /function localRecoveryDiagnosticsBoundaryText/);
  assert.match(functionBody(mainJs, "localRecoveryDiagnosticsBoundaryText"), /fields\.productionProfileStorage/);
  assert.match(functionBody(mainJs, "localRecoveryDiagnosticsBoundaryText"), /fields\.productionDataLifecycle/);
  assert.match(functionBody(mainJs, "buildFieldTestReport"), /local_recovery_action=/);
  assert.match(functionBody(mainJs, "buildFieldTestReport"), /rollback_suspicion=/);
  assert.match(functionBody(mainJs, "buildFieldTestReport"), /resume_blocked=/);

  const profileUnlockResumeBody = functionBody(mainJs, "refreshTwoProfileSessionAfterProfileUnlock");
  assert.match(profileUnlockResumeBody, /applyRuntimeResumeRollbackRecovery\(resume, \{ source: "profile-unlock-auto-resume" \}\)/);

  const loadTranscriptBody = functionBody(mainJs, "loadProductionTwoProfileTranscript");
  assert.match(loadTranscriptBody, /applyRuntimeResumeRollbackRecovery\(runtimeResumeResult, \{ source: "transcript-load" \}\)/);
});

test("local data lifecycle actions expose destructive local-only boundaries", () => {
  assert.match(indexHtml, /class="lifecycle-guide"/);
  assert.match(indexHtml, /localDataLifecycleGuideConversation/);
  assert.match(indexHtml, /localDataLifecycleGuideSession/);
  assert.match(indexHtml, /localDataLifecycleGuideProfile/);
  assert.match(indexHtml, /localDataLifecycleGuideWipe/);
  assert.match(indexHtml, /localDataLifecycleGuideBoundary/);
  assert.match(indexHtml, /conversationDeleteScopeNote/);
  assert.match(indexHtml, /sessionDeleteScopeNote/);
  assert.match(indexHtml, /profileDeleteScopeNote/);
  assert.match(indexHtml, /fullWipeScopeNote/);
  assert.match(indexHtml, /id="production-session-delete-confirmation"/);
  assert.match(indexHtml, /id="production-conversation-delete-confirmation"/);
  assert.match(indexHtml, /data-destructive-scope="conversation-delete"/);
  assert.match(indexHtml, /data-destructive-scope="session-delete"/);
  assert.match(indexHtml, /data-destructive-scope="profile-delete"/);
  assert.match(indexHtml, /data-destructive-scope="full-local-wipe"/);
  assert.match(indexHtml, /data-destructive-scope="emergency-local-wipe"/);
  assert.match(indexHtml, /id="conversation-delete-scope-note"/);
  assert.match(indexHtml, /id="session-delete-scope-note"/);
  assert.match(indexHtml, /id="profile-delete-scope-note"/);
  assert.match(indexHtml, /id="full-wipe-scope-note"/);
  assert.match(indexHtml, /id="emergency-wipe-scope-note"/);
  assert.match(indexHtml, /aria-describedby="conversation-delete-scope-note"/);
  assert.match(indexHtml, /aria-describedby="session-delete-scope-note"/);
  assert.match(indexHtml, /aria-describedby="profile-delete-scope-note"/);
  assert.match(indexHtml, /aria-describedby="full-wipe-scope-note"/);
  assert.match(indexHtml, /aria-describedby="emergency-wipe-scope-note"/);
  assert.match(indexHtml, /data-i18n="sessionDeleteConfirm"/);
  assert.match(indexHtml, /data-i18n="conversationDeleteConfirm"/);
  assert.match(i18nJs, /Conversation delete removes local message records and preserves session records/);
  assert.match(i18nJs, /Session delete removes local session resume records and preserves message records/);
  assert.match(i18nJs, /Type DELETE SESSION to delete session records/);
  assert.match(i18nJs, /Type DELETE CONVERSATION to delete local messages/);
  assert.match(i18nJs, /Full local wipe removes owned app data on this device after WIPE LOCAL DATA confirmation/);
  assert.match(i18nJs, /No cloud backup recovery, rollback prevention, or secure deletion from storage media is claimed/);
  assert.match(i18nJs, /Type EMERGENCY WIPE LOCAL DATA for emergency local wipe/);
  assert.match(i18nJs, /coercion-safe or compromised-device-safe protection/);
  assert.match(stylesCss, /\.lifecycle-guide/);
  assert.match(stylesCss, /\.lifecycle-action-note/);
  assert.match(stylesCss, /button\[data-destructive-scope\]/);
  assert.match(stylesCss, /input\[data-destructive-scope\]/);
  assert.match(stylesCss, /\[data-destructive-scope="conversation-delete"\]/);
  assert.match(stylesCss, /\[data-destructive-scope="session-delete"\]/);
  assert.match(stylesCss, /\[data-destructive-scope="emergency-local-wipe"\]/);

  const viewBody = functionBody(mainJs, "dataLifecycleActionView");
  assert.match(viewBody, /destructive_action=\$\{destructiveAction\}/);
  assert.match(viewBody, /redacted_result=true/);
  assert.match(viewBody, /local_only=true/);
  assert.match(viewBody, /backup_recovery=false/);
  assert.match(viewBody, /cloud_backup_sync=false/);
  assert.match(viewBody, /security_ready=false/);
  assert.match(viewBody, /rollback_prevention/);
  assert.match(viewBody, /crypto_erasure/);
  assert.match(viewBody, /key_record_deletion/);
  assert.match(viewBody, /rollback_prevention=false/);
  assert.match(viewBody, /secure_delete_claim/);
  assert.match(viewBody, /secure_delete_claim=false/);
  assert.match(viewBody, /profile_deleted/);
  assert.match(viewBody, /full_local_data_wiped/);
  assert.match(viewBody, /action === "emergency-local-wipe"/);

  const preflightBody = functionBody(mainJs, "dataLifecycleDestructivePreflightView");
  assert.match(preflightBody, /destructive_preflight=true/);
  assert.match(preflightBody, /confirmation_matched=\$\{confirmationMatched\}/);
  assert.match(preflightBody, /profile_target_present=\$\{profilePresent\}/);
  assert.match(preflightBody, /conversation_delete=\$\{conversationDelete\}/);
  assert.match(preflightBody, /session_delete=\$\{sessionDelete\}/);
  assert.match(preflightBody, /backup_recovery=false/);
  assert.match(preflightBody, /cloud_backup_sync=false/);
  assert.match(preflightBody, /rollback_prevention=false/);
  assert.match(preflightBody, /secure_delete_claim=false/);
  assert.match(preflightBody, /network_io=false/);
  assert.match(preflightBody, /dataLifecycleDestructivePreflightReady/);
  assert.match(preflightBody, /dataLifecycleDeleteConfirmWarning/);
  assert.match(preflightBody, /dataLifecycleWipeConfirmWarning/);
  assert.match(mainJs, /function renderDataLifecycleDestructivePreflight/);

  const renderBody = functionBody(mainJs, "renderProductionDataLifecycleAction");
  assert.match(renderBody, /fields\.productionDataLifecycle/);
  assert.match(renderBody, /fields\.productionProfileBoundary/);
  assert.match(renderBody, /fields\.productionProfileNextAction/);

  assert.match(functionBody(mainJs, "checkProductionDataLifecycle"), /renderProductionDataLifecycleAction\(result, "status"\)/);
  assert.match(functionBody(mainJs, "prepareProductionDataLifecycle"), /renderProductionDataLifecycleAction\(result, "prepare"\)/);

  const deleteBody = functionBody(mainJs, "deleteProductionProfile");
  assert.match(deleteBody, /renderDataLifecycleDestructivePreflight\("profile-delete"/);
  assert.match(deleteBody, /confirmationMatched: Boolean\(input\.profile && confirmation === input\.profile\)/);
  assert.match(deleteBody, /dataLifecycleDeleteRunning/);
  assert.match(deleteBody, /renderProductionDataLifecycleAction\(result, "profile-delete"\)/);
  assert.match(deleteBody, /await checkProductionProductUnlockStatus\(\)/);

  const wipeBody = functionBody(mainJs, "wipeProductionLocalData");
  assert.match(wipeBody, /renderDataLifecycleDestructivePreflight\("full-local-wipe"/);
  assert.match(wipeBody, /confirmationMatched: confirmation === "WIPE LOCAL DATA"/);
  assert.match(wipeBody, /dataLifecycleWipeRunning/);
  assert.match(wipeBody, /renderProductionDataLifecycleAction\(result, "full-local-wipe"\)/);
  assert.match(wipeBody, /await checkProductionProductUnlockStatus\(\)/);
  const emergencyWipeBody = functionBody(mainJs, "emergencyWipeProductionLocalData");
  assert.match(indexHtml, /id="emergency-wipe-production-local-data"/);
  assert.match(indexHtml, /id="production-emergency-wipe-confirmation"/);
  assert.match(emergencyWipeBody, /confirmation !== boundary\.emergencyConfirmation/);
  assert.match(emergencyWipeBody, /clearProductionSensitiveMemoryState\(\)/);
  assert.match(emergencyWipeBody, /clearProductionSensitiveFields\(\)/);
  assert.match(emergencyWipeBody, /classList\.add\("is-panic-locked"\)/);
  assert.match(emergencyWipeBody, /production_emergency_local_data_wipe/);
  assert.match(emergencyWipeBody, /renderProductionDataLifecycleAction\(result, "emergency-local-wipe"\)/);
  assert.match(mainJs, /writeClipboardWithTtl/);
  assert.doesNotMatch(mainJs, /navigator\.clipboard\.writeText\(payload\)/);
  const sessionDeleteBody = functionBody(mainJs, "deleteProductionSessionLifecycle");
  assert.match(sessionDeleteBody, /renderDataLifecycleDestructivePreflight\("session-delete"/);
  assert.match(sessionDeleteBody, /confirmation === "DELETE SESSION"/);
  assert.match(sessionDeleteBody, /production_session_lifecycle_delete"[\s\S]*confirmation/);
  assert.match(sessionDeleteBody, /local session lifecycle records only/);
  assert.match(sessionDeleteBody, /Message data, backups, and secure deletion claims are handled separately/);
  const conversationDeleteBody = functionBody(mainJs, "deleteProductionConversation");
  assert.match(conversationDeleteBody, /renderDataLifecycleDestructivePreflight\("conversation-delete"/);
  assert.match(conversationDeleteBody, /confirmation === "DELETE CONVERSATION"/);
  assert.match(conversationDeleteBody, /production_conversation_delete"[\s\S]*confirmation/);
  assert.match(conversationDeleteBody, /local conversation message records only/);
  assert.match(conversationDeleteBody, /not backup recovery, rollback prevention, or secure media deletion/);
  assert.match(i18nJs, /dataLifecycleDestructivePreflightReady/);
  assert.match(i18nJs, /파괴적 로컬 작업 확인/);
});

test("destructive lifecycle actions clear stale room retry state before rebuild", () => {
  const roomReferenceBody = functionBody(mainJs, "savedInviteRoomReferencesProfile");
  assert.match(roomReferenceBody, /productionInviteCodeProfiles\(code, role\)/);
  assert.match(roomReferenceBody, /localProfile/);
  assert.match(roomReferenceBody, /peerProfile/);

  const roomRuntimeClearBody = functionBody(mainJs, "clearSavedInviteRoomRuntimeState");
  assert.match(roomRuntimeClearBody, /rememberReceiveIntentForRoom\(input, false\)/);
  assert.match(roomRuntimeClearBody, /forgetTwoProfileSessionStatusForInput\(input\)/);
  assert.match(roomRuntimeClearBody, /clearPrivateRouteFollowupForRoom\(input\)/);
  assert.match(roomRuntimeClearBody, /clearChatDeliveryNoticeForInput\(input\)/);
  assert.match(roomRuntimeClearBody, /clearPrivateRouteRuntimeStateForInput\(input\)/);
  assert.match(roomRuntimeClearBody, /persistPrivateRouteRuntimeState\(\)/);
  assert.match(roomRuntimeClearBody, /clearSavedInviteRoomRetryableOutbound\(room\)/);
  assert.match(roomRuntimeClearBody, /clearSavedInviteRoomManualRebuildMetadata\(room\)/);
  assert.match(functionBody(mainJs, "clearChatDeliveryNoticeForInput"), /chatDeliveryNoticeMatchesInput\(input\)/);
  assert.match(functionBody(mainJs, "clearChatDeliveryNoticeForInput"), /setChatDeliveryNoticeByKey\("", "neutral", input\)/);

  const roomConversationClearBody = functionBody(mainJs, "clearSavedInviteRoomConversationMetadata");
  assert.match(roomConversationClearBody, /lastMessagePreview: ""/);
  assert.match(roomConversationClearBody, /messageCount: 0/);
  assert.match(roomConversationClearBody, /retryableOutboundCount: 0/);
  assert.match(roomConversationClearBody, /clearMessageEnvelopeSlotsForRoomFingerprint\(privateRouteRoomKey\(savedInviteRoomInput\(room\)\)\)/);
  assert.match(functionBody(mainJs, "clearSavedInviteRoomConversationMetadataForProfile"), /savedInviteRoomReferencesProfile\(room, profile\)/);
  assert.match(functionBody(mainJs, "clearMessageEnvelopeSlotsForRoomFingerprint"), /productionPayloadSlots\.messageEnvelope\.entries\(\)/);
  const activeLifecycleClearBody = functionBody(mainJs, "clearActiveRoomInteractionStateAfterLocalLifecycle");
  assert.match(activeLifecycleClearBody, /clearChatDeliveryNoticeForInput\(input\)/);
  assert.match(activeLifecycleClearBody, /clearPrivateRouteFollowupForRoom\(input\)/);
  assert.match(activeLifecycleClearBody, /clearManualMessagePayloadsForRoomContextChange\(\)/);
  assert.match(activeLifecycleClearBody, /selectedTwoProfileConversationKey = null/);
  assert.match(activeLifecycleClearBody, /latestClearedRetryableSelection = null/);
  assert.match(activeLifecycleClearBody, /options\.preserveSessionRuntime !== true/);
  assert.match(activeLifecycleClearBody, /rememberReceiveIntentForRoom\(input, false\)/);
  assert.match(activeLifecycleClearBody, /forgetTwoProfileSessionStatusForInput\(input\)/);
  assert.match(activeLifecycleClearBody, /clearPrivateRouteRuntimeStateForInput\(input\)/);
  assert.match(activeLifecycleClearBody, /persistPrivateRouteRuntimeState\(\)/);
  assert.match(activeLifecycleClearBody, /clearMessageEnvelopeSlotsForRoomFingerprint\(roomFingerprint\)/);
  const activeConversationClearBody = functionBody(mainJs, "clearActiveConversationStateAfterLocalDelete");
  assert.match(activeConversationClearBody, /twoProfileInputReferencesProfile\(input, targetProfile\)/);
  assert.match(activeConversationClearBody, /clearActiveRoomInteractionStateAfterLocalLifecycle\(input, \{ preserveSessionRuntime: true \}\)/);
  assert.match(activeConversationClearBody, /resetProductionTwoProfileTranscript\(\)/);
  assert.match(activeConversationClearBody, /renderRoomStatusSummary\(input, twoProfileSessionsReadyForInput\(input\)\)/);
  const conversationDeleteBody = functionBody(mainJs, "deleteProductionConversation");
  assert.match(conversationDeleteBody, /roomInputBeforeDelete = productionTwoProfileInput\(\)/);
  assert.match(conversationDeleteBody, /clearSavedInviteRoomConversationMetadataForProfile\(profile\)/);
  assert.match(conversationDeleteBody, /clearActiveConversationStateAfterLocalDelete\(profile, roomInputBeforeDelete\)/);
  assert.match(conversationDeleteBody, /saved_rooms_cleared=\$\{savedRoomsCleared\}/);
  assert.match(conversationDeleteBody, /active_room_cleared=\$\{activeRoomCleared\}/);

  assert.match(functionBody(mainJs, "clearProductionPayloadSlotsForRoomFingerprint"), /Object\.values\(productionPayloadSlots\)/);
  assert.match(functionBody(mainJs, "clearProductionPayloadSlotsForRoomFingerprint"), /slot\?\.roomFingerprint/);
  assert.match(functionBody(mainJs, "clearAllProductionPayloadSlots"), /Object\.values\(productionPayloadSlots\)/);
  assert.match(functionBody(mainJs, "clearAllProductionPayloadSlots"), /slots\.clear\(\)/);

  const allRoomClearBody = functionBody(mainJs, "clearAllSavedInviteRoomLocalState");
  assert.match(allRoomClearBody, /localStoreRemove\(inviteRoomsStorageKey\)/);
  assert.match(allRoomClearBody, /localStoreRemove\(lastInviteRoomStorageKey\)/);
  assert.match(allRoomClearBody, /localStoreRemove\(receiveIntentRoomsStorageKey\)/);
  assert.match(allRoomClearBody, /latestProductionTwoProfileRealOnionRecoveriesByRoom\.clear\(\)/);
  assert.match(allRoomClearBody, /clearAllProductionPayloadSlots\(\)/);

  const rebuildBody = functionBody(mainJs, "applyPostDestructiveLifecycleRebuildGuidance");
  assert.match(rebuildBody, /const sessionDelete = action === "session-delete"/);
  assert.match(rebuildBody, /const profileDelete = action === "profile-delete"/);
  assert.match(rebuildBody, /postSessionDeleteRoomRebuildWarning/);
  assert.match(rebuildBody, /postSessionDeleteRoomRebuildNext/);
  assert.match(rebuildBody, /lifecycle_action=\$\{action\}/);
  assert.match(rebuildBody, /session_records_removed=\$\{sessionDelete\}/);
  assert.match(rebuildBody, /message_records_preserved_by_session_delete=\$\{sessionDelete\}/);
  assert.match(rebuildBody, /profile_store_removed=\$\{profileDelete\}/);
  assert.match(rebuildBody, /owned_app_data_removed=\$\{fullWipe\}/);
  assert.match(rebuildBody, /stale_room_retry_cleared=true/);
  assert.match(rebuildBody, /stale_receive_cleared=true/);
  assert.match(rebuildBody, /stale_delivery_code_cleared=true/);
  assert.match(rebuildBody, /stale_manual_rebuild_cleared=true/);
  assert.match(rebuildBody, /stale_chat_notice_cleared=true/);
  assert.match(rebuildBody, /stale_selected_message_cleared=true/);
  assert.match(rebuildBody, /stale_followup_cleared=true/);
  assert.match(rebuildBody, /stale_import_review_cleared=true/);
  assert.match(rebuildBody, /stale_runtime_cleared=true/);
  assert.match(rebuildBody, /rebuild_required=true/);
  assert.match(rebuildBody, /external_evidence_claim=false/);
  assert.match(rebuildBody, /backup_recovery=false/);
  assert.match(rebuildBody, /cloud_backup_sync=false/);
  assert.match(rebuildBody, /rollback_prevention=false/);
  assert.match(rebuildBody, /secure_delete_claim=false/);
  assert.match(rebuildBody, /security_ready=false/);
  assert.match(rebuildBody, /affectedCurrentRoom\)[\s\S]*clearActiveRoomInteractionStateAfterLocalLifecycle\(input\)/);
  assert.match(rebuildBody, /clearCurrentInviteRoomInput\(\)/);
  assert.match(rebuildBody, /setProductionFollowupActions\(true/);
  assert.ok(
    rebuildBody.indexOf('renderManualInviteRoomRebuildFlow("rebuild-needed"') <
      rebuildBody.indexOf("setText(fields.productionTwoProfileSession, lifecycleSession)"),
    "lifecycle-specific session diagnostics must be restored after rebuild flow renders",
  );
  assert.match(i18nJs, /postSessionDeleteRoomRebuildWarning/);
  assert.match(i18nJs, /Session resume records were cleared while local message records remain/);
  assert.match(i18nJs, /세션 재개 기록을 정리했지만 로컬 메시지 기록은 남아 있습니다/);

  assert.match(functionBody(mainJs, "deleteProductionProfile"), /roomInputBeforeDelete = productionTwoProfileInput\(\)/);
  assert.match(functionBody(mainJs, "deleteProductionProfile"), /applyPostDestructiveLifecycleRebuildGuidance\("profile-delete"/);
  const sessionDeleteBody = functionBody(mainJs, "deleteProductionSessionLifecycle");
  assert.match(sessionDeleteBody, /roomInputBeforeDelete = productionTwoProfileInput\(\)/);
  assert.match(sessionDeleteBody, /result\.session_resume_closed/);
  assert.match(sessionDeleteBody, /applyPostDestructiveLifecycleRebuildGuidance\("session-delete"/);
  assert.match(sessionDeleteBody, /deletedProfile: profile/);
  assert.match(sessionDeleteBody, /input: roomInputBeforeDelete/);
  assert.match(functionBody(mainJs, "wipeProductionLocalData"), /roomInputBeforeWipe = productionTwoProfileInput\(\)/);
  assert.match(functionBody(mainJs, "wipeProductionLocalData"), /applyPostDestructiveLifecycleRebuildGuidance\("full-local-wipe"/);
});

test("manual invite room rebuild flow stays local-only across setup steps", () => {
  assert.match(mainJs, /let latestManualInviteRoomRebuildFlow = null/);
  assert.match(functionBody(mainJs, "rememberManualInviteRoomRebuildFlow"), /source/);
  assert.match(functionBody(mainJs, "manualInviteRoomRebuildFlowActive"), /latestManualInviteRoomRebuildFlow/);

  const stepViewBody = functionBody(mainJs, "manualInviteRoomRebuildStepView");
  assert.match(stepViewBody, /manual_rebuild_flow=true/);
  assert.match(stepViewBody, /profile_unlock_required=true/);
  assert.match(stepViewBody, /saved_room_check_required=true/);
  assert.match(stepViewBody, /first_message_setup_required=true/);
  assert.match(stepViewBody, /backup_recovery=false/);
  assert.match(stepViewBody, /cloud_backup_sync=false/);
  assert.match(stepViewBody, /rollback_prevention=false/);
  assert.match(stepViewBody, /secure_delete_claim=false/);
  assert.match(stepViewBody, /security_ready=false/);
  assert.match(stepViewBody, /live_network_attempt=false/);

  const renderBody = functionBody(mainJs, "renderManualInviteRoomRebuildFlow");
  assert.match(renderBody, /fields\.productionTwoProfileSession/);
  assert.match(renderBody, /fields\.productionTwoProfileBoundary/);
  assert.match(renderBody, /fields\.productionProfileNextAction/);
  assert.match(renderBody, /setProductionFollowupActions\(true, view\.next\)/);

  const lifecycleBody = functionBody(mainJs, "applyPostDestructiveLifecycleRebuildGuidance");
  assert.match(lifecycleBody, /rememberManualInviteRoomRebuildFlow\(action\)/);
  assert.match(lifecycleBody, /renderManualInviteRoomRebuildFlow\("rebuild-needed"/);

  assert.match(functionBody(mainJs, "startInviteRoomFromCode"), /renderManualInviteRoomRebuildFlow\("invite-room-started"\)/);
  assert.match(functionBody(mainJs, "openInviteRoomFromToken"), /renderManualInviteRoomRebuildFlow\("room-opening"\)/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /renderManualInviteRoomRebuildFlow\("room-ready"\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /renderManualInviteRoomRebuildFlow\("session-check"\)/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /renderManualInviteRoomRebuildFlow\(ready \? "conversation-loaded" : "session-check"\)/);
});

test("rebuild first message stops at explicit manual delivery gate", () => {
  const stepViewBody = functionBody(mainJs, "manualInviteRoomRebuildStepView");
  assert.match(stepViewBody, /first-message-draft/);
  assert.match(stepViewBody, /local-message-saved/);

  const gateViewBody = functionBody(mainJs, "manualRebuildFirstMessageDeliveryGateView");
  assert.match(gateViewBody, /latestTwoProfileOutboundOnionMessage\(roomInput, \{ messageNumber \}\)/);
  assert.match(gateViewBody, /externalPeerSendReadiness\(roomInput/);
  assert.match(gateViewBody, /first_message_saved=true/);
  assert.match(gateViewBody, /private_delivery_gate=/);
  assert.match(gateViewBody, /route_readiness_ready=/);
  assert.match(gateViewBody, /network_io=false/);
  assert.match(gateViewBody, /live_network_attempt=false/);
  assert.match(gateViewBody, /backup_recovery=false/);
  assert.match(gateViewBody, /cloud_backup_sync=false/);
  assert.match(gateViewBody, /security_ready=false/);

  const gateRenderBody = functionBody(mainJs, "renderManualRebuildFirstMessageDeliveryGate");
  assert.match(gateRenderBody, /manualInviteRoomRebuildFlowActive\(\)/);
  assert.match(gateRenderBody, /fields\.productionTwoProfileMessageState/);
  assert.match(gateRenderBody, /fields\.productionTwoProfileBoundary/);
  assert.match(gateRenderBody, /fields\.productionProfileNextAction/);
  assert.match(gateRenderBody, /setProductionFollowupActions\(true, view\.next\)/);

  const messageBody = functionBody(mainJs, "runProductionTwoProfileMessageRoundtrip");
  assert.match(messageBody, /renderManualInviteRoomRebuildFlow\("first-message-draft"\)/);
  assert.match(messageBody, /if \(renderManualRebuildFirstMessageDeliveryGate\(input, messageNumber\)\) \{[\s\S]*return;[\s\S]*\}/);
  assert.doesNotMatch(messageBody, /completeInviteRoomOutboundDelivery\(input, messageNumber\)/);
});

test("rebuild delivery retry and receive actions stay room-scoped", () => {
  const scopeViewBody = functionBody(mainJs, "manualRebuildDeliveryScopeView");
  assert.match(scopeViewBody, /twoProfileAutoResumeFingerprint\(input\)/);
  assert.match(scopeViewBody, /manual_rebuild_flow=true/);
  assert.match(scopeViewBody, /rebuilt_room_scoped=/);
  assert.match(scopeViewBody, /retry_scoped=true/);
  assert.match(scopeViewBody, /receive_scoped=true/);
  assert.match(scopeViewBody, /delivery_code_exchange_scoped=true/);
  assert.match(scopeViewBody, /explicit_private_delivery_required=true/);
  assert.match(scopeViewBody, /network_io=false/);
  assert.match(scopeViewBody, /live_network_attempt=false/);
  assert.match(scopeViewBody, /backup_recovery=false/);
  assert.match(scopeViewBody, /cloud_backup_sync=false/);
  assert.match(scopeViewBody, /security_ready=false/);

  const scopeRenderBody = functionBody(mainJs, "renderManualRebuildDeliveryScopeGate");
  assert.match(scopeRenderBody, /manualInviteRoomRebuildFlowActive\(\)/);
  assert.match(scopeRenderBody, /savedInviteRoomManualRebuildFlowForInput\(input\)/);
  assert.match(scopeRenderBody, /options\.force !== true/);
  assert.match(scopeRenderBody, /rememberManualRebuildRecoveryForInput\(input, action, options\)/);
  assert.match(scopeRenderBody, /fields\.productionTwoProfileSession/);
  assert.match(scopeRenderBody, /fields\.productionTwoProfileBoundary/);
  assert.match(scopeRenderBody, /setProductionFollowupActions\(true, view\.next\)/);

  const continueBody = functionBody(mainJs, "continueAfterPeerPrivateRouteSaved");
  assert.match(continueBody, /manualInviteRoomRebuildFlowActive\(\)/);
  assert.match(continueBody, /renderManualRebuildDeliveryScopeGate\(input, followup\.action/);
  assert.match(continueBody, /followup\.action === "retry-outbound"[\s\S]*return true/);
  assert.match(continueBody, /followup\.action === "receive"[\s\S]*return true/);
  assert.match(continueBody, /followup\.action === "send-draft"[\s\S]*return true/);

  const retryBody = functionBody(mainJs, "runSavedInviteRoomRetryableOutboundAction");
  assert.match(retryBody, /renderManualRebuildDeliveryScopeGate\(input, action, \{ messageNumber: pending\.messageNumber \}\)/);

  const savedRoomActionBody = functionBody(mainJs, "runSavedInviteRoomListAction");
  assert.match(savedRoomActionBody, /action === "paste-peer-code"[\s\S]*renderManualRebuildDeliveryScopeGate\(input, action\)/);
  assert.match(savedRoomActionBody, /action === "prepare-private-route"[\s\S]*renderManualRebuildDeliveryScopeGate\(input, action\)/);
  assert.match(savedRoomActionBody, /action === "refresh-endpoint"[\s\S]*renderManualRebuildDeliveryScopeGate\(input, action\)/);
  assert.match(savedRoomActionBody, /action === "start-receiving"[\s\S]*renderManualRebuildDeliveryScopeGate\(input, action\)/);

  const recoveryFocusBody = functionBody(mainJs, "focusManualRebuildRecoveryAction");
  assert.match(recoveryFocusBody, /action === "start-receiving"[\s\S]*startProductionTwoProfileOnionReceive/);
  assert.match(recoveryFocusBody, /action === "wait-receive-stop"[\s\S]*savedRoomList/);
  assert.match(recoveryFocusBody, /action === "verify-safety"[\s\S]*focusSafetyConfirmation\(\)/);
  assert.ok(recoveryFocusBody.indexOf('action === "verify-safety"') < recoveryFocusBody.indexOf("fields.runProductionTwoProfileMessageRoundtrip"));
  assert.doesNotMatch(recoveryFocusBody, /action === "start-receiving" \|\| action === "wait-receive-stop"/);

  const composerBody = functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction");
  assert.match(composerBody, /intent\.action === "enable-private-delivery"[\s\S]*renderManualRebuildDeliveryScopeGate\(input, intent\.action\)/);
  assert.match(composerBody, /intent\.action === "prepare-private-route"[\s\S]*renderManualRebuildDeliveryScopeGate\(input, intent\.action\)/);
  assert.match(composerBody, /intent\.action === "refresh-endpoint"[\s\S]*renderManualRebuildDeliveryScopeGate\(input, intent\.action\)/);
  assert.match(composerBody, /intent\.action === "start-receiving"[\s\S]*renderManualRebuildDeliveryScopeGate\(input, intent\.action\)/);
});

test("manual rebuild recovery resumes from saved room metadata", () => {
  assert.match(mainJs, /function normalizedSavedRoomManualRebuildFlow/);
  assert.match(mainJs, /function normalizedSavedRoomManualRebuildDeliveryScope/);
  assert.match(mainJs, /function normalizedSavedRoomManualRebuildDeliveryAction/);
  assert.match(mainJs, /const manualRebuildRecoveryPersistenceTtlMs = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(mainJs, /function savedRoomManualRebuildExpired/);
  assert.match(mainJs, /function normalizeSavedRoomManualRebuildMetadata/);
  assert.match(mainJs, /function inviteRoomMetadataWithoutManualRebuild/);
  assert.match(mainJs, /function rememberManualRebuildRecoveryForInput/);
  assert.match(mainJs, /function savedInviteRoomManualRebuildRecoveryCandidate/);
  assert.match(mainJs, /function showManualRebuildRecoveryAfterSavedRoomOpen/);
  assert.match(mainJs, /function showSavedInviteRoomPeerCodePrompt/);
  assert.match(mainJs, /function clearSavedInviteRoomManualRebuildMetadata/);
  assert.match(mainJs, /function savedInviteRoomManualRebuildNeedsRecovery/);
  assert.match(mainJs, /function savedInviteRoomWithoutResolvedManualRebuild/);

  assert.match(functionBody(mainJs, "savedInviteRooms"), /normalizeSavedRoomManualRebuildMetadata\(room\)/);
  assert.match(functionBody(mainJs, "roomListStoragePayload"), /normalizeSavedRoomManualRebuildMetadata\(room\)/);
  assert.match(functionBody(mainJs, "rememberInviteRoom"), /normalizeSavedRoomManualRebuildMetadata/);

  const rememberBody = functionBody(mainJs, "rememberManualRebuildRecoveryForInput");
  assert.match(rememberBody, /manualRebuildFlow: true/);
  assert.match(rememberBody, /manualRebuildDeliveryScope: manualRebuildDeliveryScopeKind/);
  assert.match(rememberBody, /manualRebuildDeliveryAction: normalizedAction/);
  assert.match(rememberBody, /manualRebuildMessageNumber/);
  assert.match(rememberBody, /rememberInviteRoom/);

  const candidateBody = functionBody(mainJs, "savedInviteRoomManualRebuildRecoveryCandidate");
  assert.match(candidateBody, /room\?\.manualRebuildFlow !== true/);
  assert.match(candidateBody, /savedInviteRoomHasRetryableOutbound\(room\)/);
  assert.match(candidateBody, /savedInviteRoomWaitingForPeerCode\(room\)/);
  assert.match(candidateBody, /receiveState === "paused"/);
  assert.match(candidateBody, /receiveState === "stopping"/);
  assert.match(candidateBody, /savedInviteRoomRouteReadinessView\(room\)/);

  const needsRecoveryBody = functionBody(mainJs, "savedInviteRoomManualRebuildNeedsRecovery");
  assert.match(needsRecoveryBody, /savedRoomManualRebuildExpired\(room\.manualRebuildUpdatedAt\)/);
  assert.match(needsRecoveryBody, /savedInviteRoomHasRetryableOutbound\(room\)/);
  assert.match(needsRecoveryBody, /receiveState === "paused" \|\| receiveState === "stopping"/);
  assert.match(needsRecoveryBody, /savedInviteRoomWaitingForPeerCode\(room\)/);
  assert.match(needsRecoveryBody, /savedInviteRoomRouteReadinessView\(room\)/);

  const cleanupBody = functionBody(mainJs, "savedInviteRoomWithoutResolvedManualRebuild");
  assert.match(cleanupBody, /savedInviteRoomManualRebuildNeedsRecovery\(room\)/);
  assert.match(cleanupBody, /clearSavedInviteRoomManualRebuildMetadata\(room\)/);
  assert.match(cleanupBody, /inviteRoomMetadataWithoutManualRebuild\(room\)/);
  assert.match(functionBody(mainJs, "clearSavedInviteRoomRuntimeState"), /clearSavedInviteRoomManualRebuildMetadata\(room\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomListItemView"), /savedInviteRoomWithoutResolvedManualRebuild/);
  assert.match(functionBody(mainJs, "savedInviteRoomResumePriority"), /savedInviteRoomWithoutResolvedManualRebuild/);

  const reopenBody = functionBody(mainJs, "showManualRebuildRecoveryAfterSavedRoomOpen");
  assert.match(reopenBody, /savedInviteRoomManualRebuildRecoveryCandidate\(current, input\)/);
  assert.match(reopenBody, /savedInviteRoomResolvedRetryableOutbound/);
  assert.match(reopenBody, /renderManualRebuildDeliveryScopeGate\(input, candidate\.action, \{[\s\S]*force: true/);
  assert.match(reopenBody, /focusManualRebuildRecoveryAction\(candidate\.action, input\)/);
  assert.match(reopenBody, /refreshFieldTestReport\(\)/);

  const openRecoveryBody = functionBody(mainJs, "showSavedInviteRoomRecoveryAfterOpen");
  assert.match(openRecoveryBody, /showManualRebuildRecoveryAfterSavedRoomOpen\(current, input\)[\s\S]*return true/);
  assert.match(openRecoveryBody, /current\.action === "paste-peer-code"[\s\S]*showSavedInviteRoomPeerCodePrompt\(input\)/);
  assert.ok(openRecoveryBody.indexOf("showManualRebuildRecoveryAfterSavedRoomOpen") < openRecoveryBody.indexOf("!current.action"));
  assert.ok(openRecoveryBody.indexOf('current.action === "paste-peer-code"') < openRecoveryBody.indexOf("externalPeerSendReadiness"));

  const peerCodePromptBody = functionBody(mainJs, "showSavedInviteRoomPeerCodePrompt");
  assert.match(peerCodePromptBody, /twoProfileTranscriptInputStillCurrent\(input\)/);
  assert.match(peerCodePromptBody, /setProductionTwoProfileState\("Peer delivery code needed"\)/);
  assert.match(peerCodePromptBody, /privateRouteWaitingPeerCode/);
  assert.match(peerCodePromptBody, /roomReadinessNextPastePeerCode/);
  assert.match(peerCodePromptBody, /setChatDeliveryNoticeByKey\("privateDeliveryRouteNeeded", "warning", input\)/);
  assert.match(peerCodePromptBody, /setProductionFollowupActions\(true, t\("roomReadinessNextPastePeerCode"\)\)/);
  assert.match(peerCodePromptBody, /focusPrivateRouteNextAction\(input\)/);
  assert.doesNotMatch(peerCodePromptBody, /manual_rebuild_flow=true/);
});

test("manual session readiness is scoped to the active profile passphrase", () => {
  assert.match(mainJs, /let latestProductionSessionStateFingerprint = ""/);
  assert.match(functionBody(mainJs, "productionSessionStateFingerprint"), /input\.passphrase/);
  assert.match(functionBody(mainJs, "rememberProductionSessionState"), /latestProductionSessionStateFingerprint = session \? productionSessionStateFingerprint\(input\) : ""/);
  assert.match(functionBody(mainJs, "latestProductionSessionStateForInput"), /latestProductionSessionStateFingerprint === productionSessionStateFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "productionSessionReadyForMessages"), /latestProductionSessionStateForInput\(\)/);
  assert.doesNotMatch(functionBody(mainJs, "productionSessionReadyForMessages"), /latestProductionSessionState,/);
  assert.match(functionBody(mainJs, "renderProductionPairingFlow"), /latestProductionSessionStateForInput\(input\)\?\.session_draft_present/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /latestProductionSessionStateForInput\(pairing\)\?\.session_draft_present/);
  assert.match(functionBody(mainJs, "restoreProductionSessionAfterUnlock"), /rememberProductionSessionState\(input, session\)/);
  assert.match(functionBody(mainJs, "checkProductionSessionState"), /rememberProductionSessionState\(input, result\)/);
  assert.match(functionBody(mainJs, "refreshInviteLocalSessionReady"), /rememberProductionSessionState\(\{ profile: input\.profileA, passphrase: input\.passphrase \}, session\)/);
});

test("two-profile onion setup actions ignore stale room results", () => {
  const keyBody = functionBody(mainJs, "prepareProductionTwoProfileOnionKey");
  assert.match(keyBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(keyBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);

  const endpointBody = functionBody(mainJs, "launchProductionTwoProfileOnionEndpoint");
  assert.match(endpointBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(endpointBody, /const manualPairingInput = productionPairingInput\(\)/);
  assert.match(endpointBody, /production_onion_service_launch_attempt/);
  assert.match(endpointBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(endpointBody, /const manualPairingStillCurrent = productionPairingInputStillCurrent\(manualPairingInput\)/);
  assert.match(endpointBody, /result\.local_onion_endpoint && fields\.productionPairingEndpoint && manualPairingStillCurrent/);
  assert.match(endpointBody, /applyProductionPairingPayloadExportResult/);

  const pairingBody = functionBody(mainJs, "prepareProductionTwoProfileOnionPairing");
  assert.match(pairingBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(pairingBody, /const manualPairingInput = productionPairingInput\(\)/);
  assert.match(pairingBody, /launchAndExport\(profileA\)/);
  assert.match(pairingBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(pairingBody, /const manualPairingStillCurrent = productionPairingInputStillCurrent\(manualPairingInput\)/);
  assert.match(pairingBody, /if \(manualPairingStillCurrent\) \{[\s\S]*applyProductionPairingPayloadExportResult/);
  assert.match(pairingBody, /if \(manualPairingStillCurrent\) \{[\s\S]*applyProductionPairingSafetyPreviewResult/);

  const saveBody = functionBody(mainJs, "saveProductionTwoProfileOnionSessions");
  assert.match(saveBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(saveBody, /production_two_profile_session_status/);
  assert.match(saveBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);

  const refreshBody = functionBody(mainJs, "refreshProductionTwoProfilePeerEndpoints");
  assert.match(mainJs, /async function refreshProductionTwoProfilePeerEndpoints\(input = productionTwoProfileInput\(\), options = \{\}\)/);
  assert.match(refreshBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(mainJs, /let activeTwoProfilePeerEndpointRefreshFingerprint = ""/);
  assert.match(functionBody(mainJs, "setTwoProfilePeerEndpointRefreshBusy"), /productionBusyAction = "two-profile-peer-endpoint-refresh"/);
  assert.match(functionBody(mainJs, "setTwoProfilePeerEndpointRefreshBusy"), /activeTwoProfilePeerEndpointRefreshFingerprint = twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "clearTwoProfilePeerEndpointRefreshBusy"), /activeTwoProfilePeerEndpointRefreshFingerprint === twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(refreshBody, /setTwoProfilePeerEndpointRefreshBusy\(input\)/);
  assert.match(refreshBody, /clearTwoProfilePeerEndpointRefreshBusy\(input\)/);

  const loadTranscriptBody = functionBody(mainJs, "loadProductionTwoProfileTranscript");
  assert.match(loadTranscriptBody, /const input = options\.input \?\? productionTwoProfileInput\(\)/);
  assert.match(loadTranscriptBody, /if \(!twoProfileTranscriptInputStillCurrent\(transcriptInput\)\) \{\s*return false;\s*\}/);
  assert.match(loadTranscriptBody, /invokeTwoProfileRuntimeResumeStatus/);
  assert.match(loadTranscriptBody, /runtimeResumeResult\?\.session_status/);

  const updateBody = functionBody(mainJs, "sendProductionTwoProfileEndpointUpdate");
  assert.match(updateBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(updateBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);

  const handshakeBody = functionBody(mainJs, "completeProductionTwoProfileOnionHandshake");
  assert.match(handshakeBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(handshakeBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
});

test("standalone onion diagnostics ignore stale profile and endpoint inputs", () => {
  assert.match(mainJs, /function productionPairingEndpointStillCurrent/);
  assert.match(functionBody(mainJs, "productionPairingEndpointStillCurrent"), /productionPairingEndpoint/);

  for (const name of [
    "prepareOnionKeyRecord",
    "checkOnionLaunchPreflight",
    "attemptOnionServiceLaunch",
    "prepareOnionDescriptorPublication",
    "attemptOnionDescriptorPublication",
    "prepareOnionInboundStream",
    "attemptOnionInboundEnvelopeReceive",
  ]) {
    const body = functionBody(mainJs, name);
    assert.match(body, /const input = productionProfileInput\(\)/);
    assert.match(body, /if \(!productionProfileInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  }

  const outboundBody = functionBody(mainJs, "prepareOnionOutboundStream");
  assert.match(outboundBody, /productionPairingEndpointStillCurrent\(rendezvousEndpoint\)/);

  for (const name of ["prepareOnionStreamCloseout", "prepareOnionRemoteAuth"]) {
    const body = functionBody(mainJs, name);
    assert.match(body, /const input = productionProfileInput\(\)/);
    assert.match(body, /productionProfileInputStillCurrent\(input\)/);
    assert.match(body, /productionPairingEndpointStillCurrent\(rendezvousEndpoint\)/);
  }

  for (const name of ["prepareOnionOutboundEnvelopeSend", "attemptOnionOutboundEnvelopeSend"]) {
    const body = functionBody(mainJs, name);
    assert.match(body, /const input = productionMessageInput\(\)/);
    assert.match(body, /productionMessageInputStillCurrent\(input\)/);
    assert.match(body, /productionPairingEndpointStillCurrent\(rendezvousEndpoint\)/);
  }
});

test("receive imports refresh room list metadata immediately", () => {
  assert.match(mainJs, /function refreshCurrentRoomAfterReceiveImport/);
  assert.match(mainJs, /function savedInviteRoomForRoomFingerprint/);
  assert.match(mainJs, /function refreshSavedInviteRoomMetadataForFingerprint/);
  assert.match(functionBody(mainJs, "savedInviteRoomForRoomFingerprint"), /privateRouteRoomKey\(savedInviteRoomInput\(room\)\) === fingerprint/);
  assert.match(functionBody(mainJs, "refreshSavedInviteRoomMetadataForFingerprint"), /savedInviteRoomMetadataFromLocalStores\(room\)/);
  assert.match(functionBody(mainJs, "refreshSavedInviteRoomMetadataForFingerprint"), /rememberInviteRoom\(/);
  assert.match(functionBody(mainJs, "refreshCurrentRoomAfterReceiveImport"), /rememberCurrentInviteRoomMetadata\(\)/);
  assert.match(functionBody(mainJs, "refreshCurrentRoomAfterReceiveImport"), /renderSavedInviteRooms\(\)/);
  assert.match(functionBody(mainJs, "refreshCurrentRoomAfterReceiveImport"), /renderRoomStatusSummary\(input, sessionsReady\)/);
  assert.match(functionBody(mainJs, "refreshCurrentRoomAfterReceiveImport"), /renderProductionTwoProfileMemory\(input\)/);
  const pollBody = functionBody(mainJs, "pollProductionTwoProfileOnionReceiveLoopStatus");
  assert.match(pollBody, /const receivingCurrentRoom = productionTwoProfileReceiveMatchesInput\(currentInput\)/);
  assert.match(pollBody, /rememberProductionTwoProfileOnionReceiveRuntimeState\(runtimeState, runtimeResult\)/);
  assert.match(
    pollBody,
    /if \(!receivingCurrentRoom\) \{[\s\S]*await refreshSavedInviteRoomMetadataForFingerprint\([\s\S]*productionTwoProfileOnionReceiveMode\.roomFingerprint,[\s\S]*preserveUpdatedAt: refreshPlan\.messageImported !== true[\s\S]*\);[\s\S]*\} else \{[\s\S]*await loadProductionTwoProfileTranscript/,
  );
  assert.match(pollBody, /if \(!twoProfileTranscriptInputStillCurrent\(currentInput\)\) \{[\s\S]*renderSavedInviteRooms\(\);[\s\S]*return;/);
  assert.match(pollBody, /profileA: currentInput\.profileA/);
  assert.match(pollBody, /rememberTwoProfileSessionStatus\(currentInput, status\)/);
  assert.match(pollBody, /showReceiveEndpointUpdateRecoveryNotice\(currentInput, pendingNoticeBeforeReceiveRefresh/);
  assert.match(pollBody, /refreshCurrentRoomAfterReceiveImport\(refreshPlan, currentInput\)/);
});

test("private delivery receive controls require a real route", () => {
  assert.match(functionBody(mainJs, "updateChatPrimaryActionMode"), /"has-private-route",\s*twoProfilePeerEndpointState\(input\)\.ready/);
  assert.doesNotMatch(functionBody(mainJs, "updateChatPrimaryActionMode"), /twoProfileInviteCodeModeActive\(\) && sessionsReady/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /!currentActiveLocalPrivateRouteCode\(input\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /rememberReceiveIntentForRoom\(input, true\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /await prepareInviteRoomPrivateRouteExchange\(input,/);
  assert.doesNotMatch(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /!latestLocalPrivateRouteCode/);
  assert.match(stylesCss, /body\.is-chat-active\.has-confirmed-safety:not\(\.has-message-draft\) \.room-receive-controls/);
  assert.match(stylesCss, /body\.is-chat-active:not\(\.has-private-route\)[\s\S]*#start-production-two-profile-onion-receive/);
});

test("field test report is redacted and copyable from room diagnostics", () => {
  for (const id of [
    "field-test-report",
    "field-test-report-summary",
    "field-test-checklist",
    "peer-field-test-report",
    "field-test-report-compare",
    "field-test-next-action",
    "refresh-field-test-report",
    "copy-field-test-report",
    "cancel-production-two-profile-real-onion-wait",
  ]) {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  }
  assert.match(mainJs, /function buildFieldTestReport/);
  assert.match(mainJs, /function parseFieldTestReport/);
  assert.match(mainJs, /function fieldTestReportSummary/);
  assert.match(mainJs, /function fieldTestReportTriageState/);
  assert.match(mainJs, /function fieldTestReportComparison/);
  assert.match(mainJs, /function fieldTestBuildIdentityMatches/);
  assert.match(mainJs, /function fieldTestChecklistItems/);
  assert.match(mainJs, /function fieldTestNextActionKey/);
  assert.match(mainJs, /function renderFieldTestNextAction/);
  assert.match(mainJs, /function renderFieldTestChecklist/);
  assert.match(mainJs, /function renderFieldTestReportSummary/);
  assert.match(mainJs, /function renderFieldTestReportComparison/);
  assert.match(mainJs, /function fieldTestReportCopyPayload/);
  assert.match(mainJs, /function copyFieldTestReport/);
  assert.match(mainJs, /function productionTwoProfileRealOnionSyntheticFailureResult/);
  assert.match(stylesCss, /\.field-test-report-panel/);
  assert.match(stylesCss, /\.field-test-report-summary/);
  assert.match(stylesCss, /\.field-test-checklist/);
  assert.match(stylesCss, /\.field-test-checklist-item/);
  assert.match(stylesCss, /\.peer-field-test-report/);
  assert.match(i18nJs, /fieldTestReport/);
  assert.match(i18nJs, /현장 테스트 리포트/);

  const reportBody = functionBody(mainJs, "buildFieldTestReport");
  const summaryBody = functionBody(privateDeliveryStateJs, "fieldTestReportSummary");
  const compareBody = functionBody(privateDeliveryStateJs, "fieldTestReportComparison");
  const checklistBody = functionBody(mainJs, "fieldTestChecklistItems");
  const rebuildDiagnosticsBody = functionBody(mainJs, "manualRebuildDeliveryDiagnostics");
  const publicDiagnosticsBody = functionBody(privateDeliveryStateJs, "publicBetaDiagnosticsReport");
  assert.match(functionBody(mainJs, "fieldTestReportSummary"), /privateDeliveryState\.fieldTestReportSummary\(report\)/);
  assert.match(functionBody(mainJs, "fieldTestReportComparison"), /privateDeliveryState\.fieldTestReportComparison\(localReport, peerReport\)/);
  assert.match(summaryBody, /parseFieldTestReport\(report\)/);
  assert.match(compareBody, /fieldTestReportTriageState\(localReport\)/);
  assert.match(privateDeliveryStateJs, /FIELD_TEST_REPORT_HARD_COMPARE_KEYS[\s\S]*"appVersion"/);
  assert.match(privateDeliveryStateJs, /FIELD_TEST_REPORT_HARD_COMPARE_KEYS[\s\S]*"buildChannel"/);
  assert.match(privateDeliveryStateJs, /FIELD_TEST_REPORT_HARD_COMPARE_KEYS[\s\S]*"buildCommit"/);
  assert.match(functionBody(mainJs, "fieldTestBuildIdentityMatches"), /privateDeliveryState\.fieldTestBuildIdentityMatches\(localReport, peerReport\)/);
  assert.match(functionBody(privateDeliveryStateJs, "fieldTestBuildIdentityMatches"), /local\.appVersion === peer\.appVersion/);
  assert.match(functionBody(privateDeliveryStateJs, "fieldTestBuildIdentityMatches"), /local\.buildChannel === peer\.buildChannel/);
  assert.match(functionBody(privateDeliveryStateJs, "fieldTestBuildIdentityMatches"), /local\.buildCommit === peer\.buildCommit/);
  assert.match(checklistBody, /parseFieldTestReport\(report\)/);
  assert.match(checklistBody, /fieldTestChecklistBuild/);
  assert.match(checklistBody, /fieldTestBuildIdentityMatches\(report, peerReport\)/);
  assert.match(checklistBody, /fieldTestChecklistRoom/);
  assert.match(checklistBody, /fieldTestChecklistReport/);
  const nextActionBody = functionBody(mainJs, "fieldTestNextActionKey");
  assert.match(nextActionBody, /fieldTestReportResolvedRoomListAction\(parsed\)/);
  assert.match(nextActionBody, /fieldTestNextBuildMismatch/);
  assert.match(nextActionBody, /fieldTestNextOpenRoom/);
  assert.match(nextActionBody, /fieldTestNextComplete/);
  assert.match(functionBody(mainJs, "fieldTestRecoveryActionNextKey"), /fieldTestNextStopReceive/);
  assert.match(functionBody(mainJs, "fieldTestNextActionKey"), /roomListAction !== "none"[\s\S]*room_list_next_origin !== "retryable-outbound"[\s\S]*routeReadinessAction[\s\S]*: roomListAction/);
  assert.match(functionBody(mainJs, "renderFieldTestChecklist"), /fieldTestStatusDone/);
  assert.match(functionBody(mainJs, "renderFieldTestChecklist"), /fieldTestStatusPending/);
  assert.match(functionBody(mainJs, "renderFieldTestChecklist"), /fieldTestStatusCheck/);
  assert.match(compareBody, /fieldTestReportTriageState\(peerReport\)/);
  assert.match(compareBody, /mismatches\.push/);
  assert.match(compareBody, /reports-aligned/);
  assert.match(summaryBody, /fieldTestReportNextActionValue\(parsed\)/);
  assert.match(summaryBody, /fieldTestReportBlocker\(parsed\)/);
  assert.match(summaryBody, /fieldTestReportReceiveValue\(parsed\)/);
  assert.match(functionBody(mainJs, "refreshFieldTestReport"), /renderFieldTestReportSummary\(report\)/);
  assert.match(functionBody(mainJs, "renderFieldTestReportSummary"), /renderFieldTestChecklist\(report\)/);
  assert.match(functionBody(mainJs, "renderFieldTestReportSummary"), /renderFieldTestNextAction\(report\)/);
  assert.match(functionBody(mainJs, "refreshFieldTestReport"), /renderFieldTestReportComparison\(\)/);
  assert.match(functionBody(mainJs, "renderFieldTestReportComparison"), /renderFieldTestChecklist\(fields\.fieldTestReport\?\.value \?\? "", fields\.peerFieldTestReport\?\.value \?\? ""\)/);
  assert.match(functionBody(mainJs, "renderFieldTestReportComparison"), /renderFieldTestNextAction\(fields\.fieldTestReport\?\.value \?\? "", fields\.peerFieldTestReport\?\.value \?\? ""\)/);
  assert.match(functionBody(mainJs, "fieldTestReportCopyPayload"), /const peerReport = fields\.peerFieldTestReport\?\.value \?\? ""/);
  assert.match(functionBody(mainJs, "fieldTestReportCopyPayload"), /fieldTestReportComparison\(report, peerReport\)/);
  assert.match(functionBody(mainJs, "fieldTestReportCopyPayload"), /fieldTestNextActionKey\(report, peerReport\)/);
  assert.match(functionBody(mainJs, "fieldTestReportCopyPayload"), /next_action=/);
  assert.match(functionBody(mainJs, "copyFieldTestReport"), /const payload = fieldTestReportCopyPayload\(report\)/);
  assert.match(functionBody(mainJs, "copyFieldTestReport"), /writeClipboardWithTtl\(payload\)/);
  assert.match(mainJs, /fields\.peerFieldTestReport\.addEventListener\("input", renderFieldTestReportComparison\)/);
  assert.match(reportBody, /route_ready=/);
  assert.match(reportBody, /app_version=/);
  assert.match(reportBody, /build_channel=/);
  assert.match(reportBody, /build_commit=/);
  assert.match(reportBody, /productionInviteIdentityBoundaryView\(input\)/);
  assert.match(reportBody, /accountless_invite_boundary=/);
  assert.match(reportBody, /receive_state=/);
  assert.match(reportBody, /retryable_outbound_present=/);
  assert.match(reportBody, /outbound_failure_class=/);
  assert.match(reportBody, /outbound_recovery_action=/);
  assert.match(reportBody, /outbound_recovery_key=/);
  assert.match(reportBody, /outbound_recovery_notice_key=/);
  assert.match(reportBody, /currentSavedInviteRoomView\(input\)/);
  assert.match(reportBody, /room_list_state_key=/);
  assert.match(reportBody, /room_list_state_label=/);
  assert.match(reportBody, /room_list_next_action=/);
  assert.match(reportBody, /receive_failure_kind=/);
  assert.match(reportBody, /real_onion_next_blocker=/);
  assert.match(reportBody, /real_onion_blockers=/);
  assert.match(reportBody, /real_onion_recovery_action=/);
  assert.match(reportBody, /real_onion_wait_cancellable=/);
  assert.match(reportBody, /real_onion_wait_cancelled=/);
  assert.match(reportBody, /real_onion_bootstrap_retry_limit=/);
  assert.match(reportBody, /real_onion_profile_a_bootstrap_attempts=/);
  assert.match(reportBody, /real_onion_profile_b_bootstrap_attempts=/);
  assert.match(reportBody, /real_onion_profile_a_bootstrap_reused=/);
  assert.match(reportBody, /real_onion_profile_b_bootstrap_reused=/);
  assert.match(reportBody, /room_runtime_promoted_from_real_onion_cache=/);
  assert.match(reportBody, /room_runtime_owner_profile_bound=/);
  assert.match(reportBody, /room_runtime_owner_matches_receive_profile=/);
  assert.match(reportBody, /deliveryNoticeCurrentRoom/);
  assert.match(reportBody, /delivery_notice_current_room=/);
  assert.match(reportBody, /deliveryNoticeCurrentRoom \? latestChatDeliveryNoticeKey : "none"/);
  assert.match(reportBody, /deliveryNoticeCurrentRoom \? latestChatDeliveryNoticeTone : "neutral"/);
  assert.match(reportBody, /send_runtime_owner_profile_bound=/);
  assert.match(reportBody, /send_runtime_owner_matches_send_profile=/);
  assert.match(reportBody, /real_onion_network_io=/);
  assert.match(reportBody, /manualRebuildDeliveryDiagnostics\(input, boundaryText\)/);
  assert.match(reportBody, /manual_rebuild_flow=/);
  assert.match(reportBody, /rebuild_room_scoped=/);
  assert.match(reportBody, /rebuild_delivery_scope=/);
  assert.match(reportBody, /rebuild_delivery_action=/);
  assert.match(reportBody, /rebuild_retry_scoped=/);
  assert.match(reportBody, /rebuild_receive_scoped=/);
  assert.match(reportBody, /rebuild_delivery_code_exchange_scoped=/);
  assert.match(reportBody, /rebuild_explicit_private_delivery_required=/);
  assert.match(reportBody, /rebuild_delivery_network_io=/);
  assert.match(reportBody, /rebuild_delivery_live_network_attempt=/);
  assert.match(reportBody, /rebuild_external_peer_evidence_claim=false/);
  assert.match(reportBody, /localRehearsalReportLines\(reportLines\.join\("\\n"\)\)/);
  assert.match(rebuildDiagnosticsBody, /manualInviteRoomRebuildFlowActive\(\)/);
  assert.match(rebuildDiagnosticsBody, /fieldTestBoundaryValue\(boundaryText, "delivery_scope", "none"\)/);
  assert.match(rebuildDiagnosticsBody, /fieldTestBoundaryValue\(boundaryText, "network_io", "false"\)/);
  assert.match(rebuildDiagnosticsBody, /fieldTestBoundaryValue\(boundaryText, "live_network_attempt", "false"\)/);
  assert.match(privateDeliveryStateJs, /manual_rebuild_flow/);
  assert.match(privateDeliveryStateJs, /delivery_code_exchange_scoped/);
  assert.match(publicDiagnosticsBody, /diagnostic_scope=public-support/);
  assert.match(publicDiagnosticsBody, /payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only/);
  assert.match(publicDiagnosticsBody, /publicDiagnosticsFailureClass\(parsed, desktopCompletion\)/);
  assert.match(privateDeliveryStateJs, /function publicDiagnosticsLocalRecoveryAction/);
  assert.match(privateDeliveryStateJs, /localRecovery === "check-data-lifecycle"/);
  assert.match(publicDiagnosticsBody, /publicDiagnosticsDesktopNextAction\(parsed, desktopCompletion\)/);
  assert.match(functionBody(privateDeliveryStateJs, "publicDiagnosticsDesktopNextAction"), /publicDiagnosticsLocalRecoveryAction\(parsed\)/);
  assert.match(functionBody(privateDeliveryStateJs, "publicDiagnosticsFailureClass"), /local-recovery-needed/);
  assert.match(publicDiagnosticsBody, /windows_public_artifact_ready=false/);
  assert.match(publicDiagnosticsBody, /windows_local_runtime_smoke_status=source-boundary-only/);
  assert.match(publicDiagnosticsBody, /windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows/);
  assert.match(publicDiagnosticsBody, /windows_local_deletion_behavior_review_required=true/);
  assert.match(publicDiagnosticsBody, /windows_redacted_diagnostics_behavior_review_required=true/);
  assert.match(publicDiagnosticsBody, /windows_explicit_user_action_review_required=true/);
  assert.match(publicDiagnosticsBody, /windows_release_blocker=local-build-smoke-and-release-boundary-review/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /windows_public_artifact=false/);
  assert.match(functionBody(mainJs, "renderPrototypeStatus"), /desktop_platform_readiness_boundary/);
  assert.match(functionBody(mainJs, "renderPrototypeStatus"), /desktopPlatformBoundaryValue/);
  assert.match(i18nJs, /desktopPlatformBoundaryValue/);
  assert.match(i18nJs, /Windows is a local build candidate/);
  assert.doesNotMatch(publicDiagnosticsBody, /rebuild_delivery_scope=/);
  assert.doesNotMatch(publicDiagnosticsBody, /rebuild_delivery_action=/);
  assert.doesNotMatch(publicDiagnosticsBody, /rebuild_delivery_network_io=/);
  assert.doesNotMatch(publicDiagnosticsBody, /rebuild_external_peer_evidence_claim=false/);
  assert.match(reportBody, /redacted_boundary=/);
  assert.match(functionBody(mainJs, "runProductionTwoProfileRealOnionRoundtrip"), /productionTwoProfileRealOnionSyntheticFailureResult/);
  assert.match(functionBody(mainJs, "runProductionTwoProfileRealOnionRoundtrip"), /bootstrapRetryLimit/);
  assert.match(functionBody(mainJs, "cancelProductionTwoProfileRealOnionWait"), /latestProductionTwoProfileRealOnionWaitCanceledFingerprint/);
  assert.match(functionBody(mainJs, "cancelProductionTwoProfileRealOnionWait"), /production_two_profile_real_onion_wait_cancel/);
  assert.doesNotMatch(reportBody, /roomInviteTokenDisplay|createdInviteCodeDisplay|localPrivateRouteCode|peerPrivateRouteCode/);
  assert.doesNotMatch(reportBody, /receivedInviteCode|productionInviteCodeProfiles\(input|profileA=.*profileB=/);
  assert.doesNotMatch(reportBody, /productionTwoProfilePassphrase|productionTwoProfileMessage/);
  assert.doesNotMatch(reportBody, /outbound_recovery_message=|outbound_message=|peer_endpoint=|onion_endpoint=/);
  assert.doesNotMatch(summaryBody, /roomInviteTokenDisplay|createdInviteCodeDisplay|localPrivateRouteCode|peerPrivateRouteCode/);
  assert.doesNotMatch(summaryBody, /productionTwoProfilePassphrase|productionTwoProfileMessage/);
  assert.doesNotMatch(compareBody, /roomInviteTokenDisplay|createdInviteCodeDisplay|localPrivateRouteCode|peerPrivateRouteCode/);
  assert.doesNotMatch(compareBody, /productionTwoProfilePassphrase|productionTwoProfileMessage/);
  assert.doesNotMatch(reportBody, /room_list_code|currentRoomCode=/);
});

test("single-machine local rehearsal is scoped apart from external field evidence", () => {
  assert.match(indexHtml, /id="local-rehearsal-checklist"/);
  assert.match(indexHtml, /id="local-rehearsal-next-action"/);
  assert.match(indexHtml, /data-i18n="localRehearsalHint"/);
  assert.match(i18nJs, /Single-machine dual-profile rehearsal only/);
  assert.match(i18nJs, /외부 onion delivery evidence가 아닙니다/);
  assert.match(i18nJs, /this public beta does not collect, require, or claim external delivery evidence/);
  assert.doesNotMatch(i18nJs, /external delivery evidence must come from real peer reports/);
  assert.doesNotMatch(i18nJs, /실제 peer report에서만/);

  assert.match(mainJs, /localRehearsalChecklist: document\.querySelector\("#local-rehearsal-checklist"\)/);
  assert.match(mainJs, /localRehearsalNextAction: document\.querySelector\("#local-rehearsal-next-action"\)/);
  assert.match(mainJs, /function localRehearsalChecklistItems/);
  assert.match(mainJs, /function localRehearsalNextActionKey/);
  assert.match(mainJs, /function localRehearsalReportLines/);
  assert.match(mainJs, /function renderLocalRehearsal/);

  const rehearsalItemsBody = functionBody(mainJs, "localRehearsalChecklistItems");
  assert.match(rehearsalItemsBody, /localRehearsalInvite/);
  assert.match(rehearsalItemsBody, /localRehearsalSafety/);
  assert.match(rehearsalItemsBody, /localRehearsalDeliveryCode/);
  assert.match(rehearsalItemsBody, /localRehearsalReceive/);
  assert.match(rehearsalItemsBody, /localRehearsalRetry/);

  const rehearsalNextBody = functionBody(mainJs, "localRehearsalNextActionKey");
  assert.match(rehearsalNextBody, /fieldTestNextActionKey\(report, ""\)/);
  assert.match(rehearsalNextBody, /fieldTestNextPastePeerReport/);
  assert.match(rehearsalNextBody, /localRehearsalNextRepeatOrReset/);
  assert.match(rehearsalNextBody, /real_onion_external_peer_delivery_confirmed/);
  assert.match(rehearsalNextBody, /localRehearsalNextExternalEvidenceIgnored/);

  const reportLinesBody = functionBody(mainJs, "localRehearsalReportLines");
  assert.match(reportLinesBody, /rehearsal_scope=single_machine_local/);
  assert.match(reportLinesBody, /rehearsal_dual_profile=true/);
  assert.match(reportLinesBody, /rehearsal_external_peer_evidence=false/);
  assert.match(reportLinesBody, /rehearsal_external_onion_delivery_claim=false/);
  assert.match(reportLinesBody, /rehearsal_peer_report_required=false/);
  assert.match(reportLinesBody, /local_rehearsal_next_action=/);

  assert.match(functionBody(mainJs, "renderFieldTestReportSummary"), /renderLocalRehearsal\(report\)/);
  assert.match(functionBody(mainJs, "renderFieldTestReportComparison"), /renderLocalRehearsal/);
  assert.match(functionBody(mainJs, "buildFieldTestReport"), /localRehearsalReportLines\(reportLines\.join\("\\n"\)\)/);
});

test("send diagnostics expose runtime owner match without raw profile names", () => {
  assert.match(mainJs, /owner_profile_bound=\$\{result\.owner_profile_bound === true\}/);
  assert.match(mainJs, /owner_matches_send=\$\{result\.owner_matches_send_profile === true\}/);
  assert.match(mainJs, /function sendRuntimeOwnerMismatch/);
  assert.match(functionBody(mainJs, "setChatDeliveryNoticeForSendAttempt"), /sendRuntimeMismatch/);
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "sendRuntimeMismatch"/);
  assert.match(mainJs, /preparePrivateDeliveryRoute\(\{ forceRefresh: true, allowRetryRecovery: false \}\)/);
  assert.match(mainJs, /function privateRouteRecoveryNoticeActive/);
  assert.match(functionBody(mainJs, "privateRouteRecoveryNoticeActive"), /privateRouteWaitingPeerCode/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /routeRecoveryReady/);
  assert.match(functionBody(mainJs, "buildFieldTestReport"), /sendAttemptBoundaryText/);
  assert.match(functionBody(mainJs, "buildFieldTestReport"), /send_runtime_owner_matches_send_profile=/);
  assert.match(i18nJs, /sendRecoveryRuntimeMismatch/);
  assert.match(i18nJs, /sendRuntimeMismatch/);
});

test("delivery code save continues the original send or receive action", () => {
  assert.match(mainJs, /let pendingPrivateRouteFollowup = null/);
  assert.match(functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction"), /rememberPrivateRouteFollowup\(input\.message \? "send-draft" : "receive", input\)/);
  assert.match(functionBody(mainJs, "applyPeerPrivateRouteCode"), /continueAfterPeerPrivateRouteSaved\(input\)/);
  assert.match(functionBody(mainJs, "applyPeerPrivateRouteCode"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return true;\s*\}/);
  const followupBody = functionBody(mainJs, "continueAfterPeerPrivateRouteSaved");
  assert.match(followupBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(followupBody, /retryableOutboundEntryForPrivateRouteFollowup\(followup, input\)/);
  assert.match(followupBody, /await runTwoProfileOutboundPrimaryAction\(pending\)/);
  assert.match(followupBody, /await startProductionTwoProfileOnionReceive\(\)/);
  assert.match(followupBody, /await runProductionTwoProfileMessageRoundtrip\(\)/);
  assert.match(followupBody, /clearPrivateRouteFollowup\(\)/);
});

test("saved local delivery codes must be refreshed before sharing", () => {
  assert.match(mainJs, /const activeLocalPrivateRouteCodesByRoom = new Map\(\)/);
  assert.match(functionBody(mainJs, "restorePrivateRouteExchangeForRoom"), /updateLocalPrivateRouteCodeUi\(input\)/);
  assert.match(functionBody(mainJs, "localPrivateRouteCodeIsActive"), /routeMapValueForRoom\(activeLocalPrivateRouteCodesByRoom, input\)/);
  assert.match(functionBody(mainJs, "routeMapValueForRoom"), /legacyPrivateRouteRoomKey\(input\)/);
  assert.match(functionBody(mainJs, "routeMapValueForRoom"), /persistPrivateRouteMap\(storageKey, source\)/);
  assert.match(functionBody(mainJs, "receiveIntentForRoom"), /legacyPrivateRouteRoomKey\(input\)/);
  assert.match(functionBody(mainJs, "rememberReceiveIntentForRoom"), /privateRouteRoomKeys\(input\)/);
  assert.match(functionBody(mainJs, "rememberLocalPrivateRouteCode"), /const updateUi = routeOptions\.updateUi !== false/);
  assert.match(functionBody(mainJs, "rememberLocalPrivateRouteCode"), /if \(!updateUi\) \{[\s\S]*return;[\s\S]*\}/);
  assert.match(mainJs, /let activeInviteRoomPrivateRouteCodeFingerprint = ""/);
  assert.match(mainJs, /let activeInviteRoomPeerRouteCodeFingerprint = ""/);
  assert.match(functionBody(mainJs, "setInviteRoomPrivateRouteCodeBusy"), /productionBusyAction = "invite-room-private-route-code"/);
  assert.match(functionBody(mainJs, "setInviteRoomPrivateRouteCodeBusy"), /activeInviteRoomPrivateRouteCodeFingerprint = twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "clearInviteRoomPrivateRouteCodeBusy"), /activeInviteRoomPrivateRouteCodeFingerprint === twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "setInviteRoomPeerRouteCodeBusy"), /productionBusyAction = "invite-room-peer-route-code"/);
  assert.match(functionBody(mainJs, "setInviteRoomPeerRouteCodeBusy"), /activeInviteRoomPeerRouteCodeFingerprint = twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "clearInviteRoomPeerRouteCodeBusy"), /activeInviteRoomPeerRouteCodeFingerprint === twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "prepareInviteRoomPrivateRouteExchange"), /twoProfileTranscriptInputStillCurrent\(input\)/);
  assert.match(functionBody(mainJs, "prepareInviteRoomPrivateRouteExchange"), /setInviteRoomPrivateRouteCodeBusy\(input\)/);
  assert.match(functionBody(mainJs, "prepareInviteRoomPrivateRouteExchange"), /clearInviteRoomPrivateRouteCodeBusy\(input\)/);
  assert.match(functionBody(mainJs, "applyPeerPrivateRouteCode"), /setInviteRoomPeerRouteCodeBusy\(input\)/);
  assert.match(functionBody(mainJs, "applyPeerPrivateRouteCode"), /clearInviteRoomPeerRouteCodeBusy\(input\)/);
  assert.match(functionBody(mainJs, "prepareInviteRoomPrivateRouteExchange"), /const runtime = await ensurePrivateDeliveryRuntimeReady\(input\);[\s\S]*if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{[\s\S]*return false;/);
  assert.match(functionBody(mainJs, "prepareInviteRoomPrivateRouteExchange"), /rememberLocalPrivateRouteCode\(result\.local_onion_endpoint, input, \{ updateUi: false \}\)/);
  assert.match(functionBody(mainJs, "preparePrivateDeliveryRoute"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(functionBody(mainJs, "preparePrivateDeliveryRoute"), /const refreshed = await refreshProductionTwoProfilePeerEndpoints\(input, \{ allowRetryRecovery \}\);[\s\S]*if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{[\s\S]*return;/);
  assert.match(functionBody(mainJs, "routeExchangePrimaryActionNode"), /!currentActiveLocalPrivateRouteCode\(input\)/);
  assert.match(mainJs, /function focusPrivateRouteNextAction\([\s\S]*!currentActiveLocalPrivateRouteCode\(input\)/);
  assert.match(functionBody(mainJs, "localPrivateRouteCodeStatusKey"), /privateRouteLocalStatusSaved/);
  assert.match(functionBody(mainJs, "currentActiveLocalPrivateRouteCode"), /localPrivateRouteCodeIsActive\(input\)/);
  assert.match(functionBody(mainJs, "updateLocalPrivateRouteCodeUi"), /has-saved-local-private-route-code/);
  assert.match(functionBody(mainJs, "updateLocalPrivateRouteCodeUi"), /has-local-private-route-code", hasLocal && active/);
  assert.match(functionBody(mainJs, "copyLocalPrivateRouteCode"), /const code = currentActiveLocalPrivateRouteCode\(input\)/);
  assert.doesNotMatch(functionBody(mainJs, "copyLocalPrivateRouteCode"), /fields\.localPrivateRouteCode\?\.value \|\| latestLocalPrivateRouteCode/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /currentActiveLocalPrivateRouteCode\(\)/);
  assert.match(functionBody(mainJs, "updateChatPrimaryActionMode"), /currentActiveLocalPrivateRouteCode\(input\)/);
  assert.match(stylesCss, /:not\(\.exchange-instruction\):not\(\.route-code-status\)/);
  assert.match(indexHtml, /id="private-route-local-status"/);
});

test("chat delivery notices stay scoped to the active invite room", () => {
  assert.match(mainJs, /let latestChatDeliveryNoticeRoomFingerprint = ""/);
  assert.match(functionBody(mainJs, "chatDeliveryNoticeRoomFingerprint"), /twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "chatDeliveryNoticeMatchesInput"), /latestChatDeliveryNoticeRoomFingerprint === chatDeliveryNoticeRoomFingerprint\(input\)/);
  assert.match(mainJs, /function setChatDeliveryNoticeByKey\(key, tone = "neutral", input = productionTwoProfileInput\(\)\)/);
  assert.match(functionBody(mainJs, "setChatDeliveryNoticeByKey"), /latestChatDeliveryNoticeRoomFingerprint = key \? chatDeliveryNoticeRoomFingerprint\(input\) : ""/);
  assert.match(functionBody(mainJs, "setChatDeliveryNoticeForPendingOutbound"), /latestChatDeliveryNoticeRoomFingerprint = chatDeliveryNoticeRoomFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "setChatDeliveryNoticeForSendAttempt"), /setChatDeliveryNoticeByKey\("chatNoticeExternalSendWritten", "success", input\)/);
  assert.match(mainJs, /function currentTwoProfileOutboundAction/);
  assert.match(functionBody(mainJs, "currentTwoProfileOutboundAction"), /options\.requireNoticeMatch === true && !chatDeliveryNoticeMatchesInput\(input\)/);
  assert.match(functionBody(mainJs, "currentTwoProfileOutboundAction"), /currentTwoProfileRetryableOutboundEntry\(entry\)/);
  assert.match(functionBody(mainJs, "currentTwoProfileOutboundAction"), /currentTwoProfileOutboundPrimaryAction\(currentEntry, input\)/);
  assert.match(mainJs, /function currentTwoProfileOutboundCancelableEntry/);
  assert.match(functionBody(mainJs, "currentTwoProfileOutboundCancelableEntry"), /outboundActionState\.canCancelNow \? currentEntry : null/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /currentTwoProfileOutboundAction\(pendingEntry, \{ requireNoticeMatch: true \}\)/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /cancel\.disabled = !outboundActionState\.canCancelNow/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /currentTwoProfileOutboundCancelableEntry\(pendingEntry, \{ requireNoticeMatch: true \}\)/);

  const languageBody = functionBody(mainJs, "applyLanguage");
  assert.match(languageBody, /rerenderLatestChatDeliveryNotice\(productionTwoProfileInput\(\)\)/);

  const actionStateBody = functionBody(mainJs, "applyProductionActionState");
  assert.match(actionStateBody, /const currentRoomDeliveryNotice = chatDeliveryNoticeMatchesInput\(twoProfile\)/);
  assert.match(actionStateBody, /currentRoomDeliveryNotice[\s\S]*latestChatDeliveryNoticeKey === "sendLockedUntilVerified"/);
  assert.match(actionStateBody, /currentRoomDeliveryNotice[\s\S]*latestChatDeliveryNoticeKey === "messageSavedPrivateDeliveryOff"/);

  assert.match(functionBody(mainJs, "clearStaleSendRecoveryNotice"), /!chatDeliveryNoticeMatchesInput\(input\)/);
});

test("invite-code send path does not bypass private delivery gates", () => {
  const intentStart = mainJs.indexOf("function twoProfileComposerPrimaryIntent");
  const intentEnd = mainJs.indexOf("function renderProductionTwoProfileMemory", intentStart);
  assert.notEqual(intentStart, -1, "missing twoProfileComposerPrimaryIntent");
  assert.notEqual(intentEnd, -1, "missing function after twoProfileComposerPrimaryIntent");
  const intentSource = mainJs.slice(intentStart, intentEnd);
  const draftSendIndex = intentSource.indexOf("if (input.message)");
  const privateDeliveryIndex = intentSource.indexOf("if (!manualNetworkPermission)");
  assert.doesNotMatch(intentSource, /twoProfileInviteCodeModeActive/);
  assert.notEqual(draftSendIndex, -1, "draft send intent must exist");
  assert.notEqual(privateDeliveryIndex, -1, "private delivery intent must exist");
  assert.ok(draftSendIndex < privateDeliveryIndex, "default send must stay before private delivery setup");
  assert.match(intentSource, /enable-private-delivery/);
  assert.match(intentSource, /prepare-private-route/);
  assert.doesNotMatch(functionBody(mainJs, "runProductionTwoProfileMessageRoundtrip"), /invokeInviteRoomMessageSend/);
  assert.doesNotMatch(functionBody(mainJs, "runProductionTwoProfileMessageRoundtrip"), /completeInviteRoomOutboundDelivery/);
});

test("message send retry and cancel results stay scoped to the current room", () => {
  const saveBody = functionBody(mainJs, "saveInviteRoomOutboundMessage");
  assert.match(saveBody, /twoProfileTranscriptInputStillCurrent\(input\)/);
  assert.match(saveBody, /stillCurrent: false/);

  const completeBody = functionBody(mainJs, "completeInviteRoomOutboundDelivery");
  assert.match(completeBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(completeBody, /latestTwoProfileOutboundOnionMessage\(onionInput, \{ messageNumber \}\)/);
  assert.match(completeBody, /sendProductionTwoProfileLatestOnionEnvelope\(onionInput, \{ messageNumber \}\)/);

  const sendBody = functionBody(mainJs, "sendProductionTwoProfileLatestOnionEnvelope");
  assert.match(mainJs, /async function sendProductionTwoProfileLatestOnionEnvelope\(input = productionTwoProfileInput\(\), options = \{\}\)/);
  assert.match(sendBody, /latestTwoProfileOutboundOnionMessage\(input, options\)/);
  assert.match(sendBody, /latestTwoProfileOutboundDeliveryCandidate\(input, options\)/);
  assert.match(functionBody(mainJs, "latestTwoProfileOutboundDeliveryCandidate"), /twoProfileConversationOutboundRetryable\(entry\)/);
  assert.match(functionBody(mainJs, "latestTwoProfileOutboundDeliveryCandidate"), /targetRequested \? null : automaticVisibleTwoProfileRetryableOutboundEntry\(input\)/);
  assert.match(functionBody(mainJs, "latestTwoProfileOutboundDeliveryCandidate"), /\(targetRequested && Number\.parseInt\(latest\.messageNumber, 10\) !== targetMessageNumber\)/);
  assert.match(sendBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(sendBody, /await loadProductionTwoProfileTranscript\(\{[\s\S]*quiet: true,[\s\S]*refreshSessionStatus: true,[\s\S]*input/);
  assert.match(sendBody, /setChatDeliveryNoticeForSendAttempt\(result, input\)/);
  assert.match(mainJs, /let activeTwoProfileOnionEnvelopeSendKey = ""/);
  assert.match(functionBody(mainJs, "twoProfileOnionEnvelopeSendKey"), /twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "twoProfileOnionEnvelopeSendKey"), /normalizedNumber/);
  assert.match(functionBody(mainJs, "setTwoProfileOnionEnvelopeSendBusy"), /productionBusyAction = "two-profile-onion-envelope-send"/);
  assert.match(functionBody(mainJs, "setTwoProfileOnionEnvelopeSendBusy"), /activeTwoProfileOnionEnvelopeSendKey = twoProfileOnionEnvelopeSendKey\(input, messageNumber\)/);
  assert.match(functionBody(mainJs, "clearTwoProfileOnionEnvelopeSendBusy"), /activeTwoProfileOnionEnvelopeSendKey === twoProfileOnionEnvelopeSendKey\(input, messageNumber\)/);
  assert.match(sendBody, /setTwoProfileOnionEnvelopeSendBusy\(input, latestOnionOutbound\.messageNumber\)/);
  assert.match(sendBody, /clearTwoProfileOnionEnvelopeSendBusy\(input, latestOnionOutbound\.messageNumber\)/);

  const retryBody = functionBody(mainJs, "retryTwoProfileOutboundEntry");
  assert.match(retryBody, /await sendProductionTwoProfileLatestOnionEnvelope\(input,[\s\S]*exactRetryOnly: true,[\s\S]*message: currentEntry\.message,[\s\S]*messageNumber: currentEntry\.messageNumber,[\s\S]*roomFingerprint: currentEntry\.roomFingerprint/);
  assert.match(retryBody, /await loadProductionTwoProfileTranscript\(\{[\s\S]*quiet: true,[\s\S]*refreshSessionStatus: true,[\s\S]*allowRetryableMetadataFallback: false,[\s\S]*input/);
  assert.match(retryBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(retryBody, /setChatDeliveryNoticeByKey\("sendRetrying", "progress", input\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /currentTwoProfileOutboundAction\(entry, \{ requireCurrentInput: true \}\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /runTwoProfileOutboundPrimaryAction\(current\.entry, current\.primaryAction\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /setActionButtonState\(cancel, !outboundActionState\.canCancelNow/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /currentTwoProfileOutboundCancelableEntry\(entry, \{ requireCurrentInput: true \}\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /cancelTwoProfileOutboundEntry\(currentEntry\)/);

  const refreshRetryBody = functionBody(mainJs, "refreshTwoProfileOutboundEndpointThenRetry");
  assert.match(refreshRetryBody, /await prepareInviteRoomPrivateRouteExchange\(input\)/);
  assert.match(refreshRetryBody, /await refreshProductionTwoProfilePeerEndpoints\(input, \{ suppressRecoveryNoticeRefresh: true \}\)/);
  assert.match(refreshRetryBody, /await loadProductionTwoProfileTranscript\(\{[\s\S]*quiet: true,[\s\S]*refreshSessionStatus: true,[\s\S]*allowRetryableMetadataFallback: false,[\s\S]*input/);
  assert.match(refreshRetryBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(refreshRetryBody, /twoProfilePeerEndpointState\(input\)\.ready/);

  const cancelBody = functionBody(mainJs, "cancelTwoProfileOutboundEntry");
  assert.match(cancelBody, /production_message_outbound_cancel_pending/);
  assert.match(cancelBody, /clearMessageEnvelopeSlotForConversationEntry\(currentEntry\)/);
  assert.match(cancelBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(cancelBody, /setSelectedTwoProfileConversationEntry\(null\)/);
  assert.match(cancelBody, /await loadProductionTwoProfileTranscript\(\{[\s\S]*quiet: true,[\s\S]*refreshSessionStatus: false,[\s\S]*allowRetryableMetadataFallback: false,[\s\S]*input/);
  assert.match(cancelBody, /await loadProductionTwoProfileTranscript\(\{[\s\S]*allowRetryableMetadataFallback: false,[\s\S]*input,[\s\S]*\}\);\s*renderSavedInviteRooms\(\);\s*showLatestRetryableOutboundNotice\(input, \{ allowAutomatic: false \}\)/);
  assert.match(cancelBody, /showLatestRetryableOutboundNotice\(input, \{ allowAutomatic: false \}\)/);
  assert.match(cancelBody, /setChatDeliveryNoticeByKey\("sendCanceling", "progress", input\)/);

  const composerBody = functionBody(mainJs, "runProductionTwoProfileMessageRoundtrip");
  assert.match(composerBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(composerBody, /stillCurrent/);
  assert.match(composerBody, /if \(!stillCurrent \|\| !twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.doesNotMatch(composerBody, /completeInviteRoomOutboundDelivery\(input, messageNumber\)/);
});

test("conversation rows show manual lifecycle summary without stronger delivery claims", () => {
  const renderBody = functionBody(mainJs, "renderProductionTwoProfileConversationList");
  const actionState = {
    hasProfileUnlockInput: true,
    hasImportedMessage: true,
    hasReceivedMessage: false,
    hasTwoProfileReplyDraftInput: true,
    hasTwoProfileReplySelected: true,
  };
  assert.match(mainJs, /productionTwoProfileManualLifecycleView/);
  assert.match(renderBody, /const manualLifecycle = productionTwoProfileManualLifecycleView\(entry, senderEnvelopeSlotPresent\)/);
  assert.match(renderBody, /const actionView = twoProfileConversationActionView\(entry, senderEnvelopeSlotPresent\)/);
  assert.match(renderBody, /transcript-lifecycle/);
  assert.match(renderBody, /manualLifecycle\.phase/);
  assert.match(renderBody, /manualLifecycle\.step/);
  assert.match(renderBody, /manualLifecycle\.detail/);
  assert.match(renderBody, /manualLifecycle\.boundary/);
  assert.match(actionStateJs, /click Show plaintext before writing the reply/);
  assert.equal(productionManualTransferStepLabel("show-plaintext"), "show plaintext");
  assert.match(actionStateJs, /productionManualTransferStepLabel\("show-plaintext"\)/);
  assert.match(actionStateJs, /productionManualTransferStepLabel\("import-envelope"\)/);
  assert.equal(productionManualCurrentFocusTarget(actionState), "show-received");
  assert.deepEqual(productionManualPrimaryActions(actionState), {
    showReceived: true,
    selectReply: false,
    sendReply: false,
  });
  assert.match(functionBody(mainJs, "twoProfileConversationUserActionMessage"), /selectedTwoProfileNextActionMessage\(entry\)/);
  assert.doesNotMatch(functionBody(mainJs, "twoProfileConversationUserActionMessage"), /waiting for delivery/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /const plaintextReviewPending = Boolean\(hasImportedMessage && !hasReceivedMessage\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /!state\.hasTwoProfileReplyDraftInput && !plaintextReviewPending/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /if \(!plaintextReviewPending && selectedConversation && !selectedConversationDelivered\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /const composerPrimaryBlockedByPlaintextReview = Boolean\(\s*plaintextReviewPending,\s*\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /Click Show plaintext before writing or sending a reply\./);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /!composerPrimaryBlockedByPlaintextReview[\s\S]*manualPrimaryActions\.sendReply/);
  assert.match(functionBody(mainJs, "exportProductionReceivedMessage"), /Plaintext review running/);
  assert.match(functionBody(mainJs, "exportProductionReceivedMessage"), /Received plaintext reviewed/);
  assert.doesNotMatch(functionBody(mainJs, "exportProductionReceivedMessage"), /Received message exporting/);
  assert.match(i18nJs, /exportEnvelope: "Envelope 내보내기"/);
  assert.match(i18nJs, /importEnvelope: "Envelope 가져오기"/);
  assert.match(stylesCss, /\.transcript-lifecycle/);
  assert.match(stylesCss, /\.transcript-lifecycle-phase/);
  assert.match(stylesCss, /body\.is-chat-active \.message-transcript \.transcript-lifecycle/);
  assert.match(actionStateJs, /manual lifecycle only; network_io=false/);
});

test("real onion roundtrip and wait cancel stay scoped to the current room", () => {
  assert.match(mainJs, /let activeProductionTwoProfileRealOnionInput = null/);
  assert.match(mainJs, /let productionTwoProfileRealOnionRunSequence = 0/);
  assert.match(functionBody(mainJs, "realOnionActiveInputMatches"), /activeProductionTwoProfileRealOnionInput\.passphrase === input\.passphrase/);
  assert.match(functionBody(mainJs, "realOnionRoundtripActiveForInput"), /productionBusyAction === "two-profile-real-onion-roundtrip"/);
  assert.match(functionBody(mainJs, "realOnionActiveRunMatches"), /activeProductionTwoProfileRealOnionInput\?\.runId === runId/);

  const actionStateBody = functionBody(mainJs, "applyProductionActionState");
  assert.match(actionStateBody, /realOnionRoundtripActiveForInput\(twoProfile\)/);

  const runBody = functionBody(mainJs, "runProductionTwoProfileRealOnionRoundtrip");
  assert.match(runBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(runBody, /const realOnionRunId = \(productionTwoProfileRealOnionRunSequence \+= 1\)/);
  assert.match(runBody, /activeProductionTwoProfileRealOnionInput = \{ \.\.\.roomInput, runId: realOnionRunId \}/);
  assert.match(runBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(runBody, /fingerprint: twoProfileInputFingerprint\(input\)/);
  assert.match(runBody, /if \(realOnionActiveRunMatches\(realOnionRunId\)\) \{/);
  assert.match(runBody, /clearProductionBusyAction\("two-profile-real-onion-roundtrip"\)[\s\S]*activeProductionTwoProfileRealOnionInput = null/);

  const cancelBody = functionBody(mainJs, "cancelProductionTwoProfileRealOnionWait");
  assert.match(cancelBody, /const activeInput = activeProductionTwoProfileRealOnionInput/);
  assert.match(cancelBody, /twoProfileSessionStatusFingerprint\(activeInput\)/);
  assert.match(cancelBody, /if \(!twoProfileTranscriptInputStillCurrent\(activeInput\)\) \{\s*return true;\s*\}/);
  assert.match(cancelBody, /if \(!twoProfileTranscriptInputStillCurrent\(activeInput\)\) \{\s*return false;\s*\}/);
});

test("join failure explains when the invite room is not open", () => {
  assert.match(mainJs, /function isInviteRoomNotOpenError/);
  assert.match(mainJs, /recoveryInviteRoomNotOpen/);
  assert.match(mainJs, /inviteRoomNotOpenNotice/);
});

test("invite code mode always owns the local profile role", () => {
  const body = functionBody(mainJs, "syncTwoProfileDerivedConnectionFields");
  assert.match(body, /profile\.value = localProfile/);
  assert.doesNotMatch(body, /if \(!profile\.value \|\| isDerivedConnectionProfile\(profile\.value\)\)/);
});

test("new invite room setup creates profiles before saving retention preference", () => {
  const body = functionBody(mainJs, "openInviteRoomFromToken");
  const setupIndex = body.indexOf("const result = await invokeInviteRoomSetup");
  const retentionIndex = body.indexOf("await saveProductionMessageRetentionPreference", setupIndex);
  assert.notEqual(setupIndex, -1, "missing invite room setup call");
  assert.notEqual(retentionIndex, -1, "missing post-setup retention save");
  assert.ok(retentionIndex > setupIndex, "retention preference must save after new room setup");
  assert.match(body, /const openInput = \{ \.\.\.input, profileA, profileB, passphrase, messageTtlSeconds \}/);
  assert.match(body, /twoProfileTranscriptInputStillCurrent\(openInput\)/);
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /twoProfileTranscriptInputStillCurrent\(input\)/);
});

test("private delivery stays explicit before network work starts", () => {
  assert.match(functionBody(mainJs, "enablePrivateDeliveryPermission"), /setManualNetworkPermission\(true\)/);
  assert.doesNotMatch(functionBody(mainJs, "enablePrivateDeliveryPermission"), /production_onion_persistent_client_start/);
  assert.doesNotMatch(functionBody(mainJs, "enablePrivateDeliveryPermission"), /production_onion_service_launch_attempt/);
  const intentBody = functionBody(mainJs, "twoProfileComposerPrimaryIntent");
  assert.ok(intentBody.indexOf("if (input.message)") < intentBody.indexOf("if (!manualNetworkPermission)"));
  const messageBody = functionBody(mainJs, "runProductionTwoProfileMessageRoundtrip");
  assert.match(messageBody, /Manual envelope save running/);
  assert.match(messageBody, /default path is local manual envelope exchange and starts no network send/);
  assert.match(messageBody, /default_transport_path=local-manual-encrypted-envelope-exchange network_io=false automatic_delivery=false/);
  assert.match(messageBody, /default_transport_network_io=false high_risk_onion_path=explicit-user-triggered-fail-closed external_delivery_claim=false/);
  assert.doesNotMatch(messageBody, /production_onion_outbound_envelope_send_attempt|production_two_profile_real_onion_roundtrip/);
  assert.match(functionBody(mainJs, "ensurePrivateDeliveryRuntimeReady"), /production_onion_persistent_client_start/);
});

test("manual encrypted envelope guide keeps local default flow visible", () => {
  assert.match(indexHtml, /class="manual-flow-guide"/);
  assert.match(indexHtml, /data-i18n="manualFlowGuideHint"/);
  assert.match(indexHtml, /data-i18n="manualFlowGuideStepInvite"/);
  assert.match(indexHtml, /data-i18n="manualFlowGuideStepExport"/);
  assert.match(indexHtml, /data-i18n="manualFlowGuideStepImport"/);
  assert.match(indexHtml, /data-i18n="manualFlowGuideStepRecovery"/);
  assert.match(indexHtml, /data-i18n="manualFlowGuideBoundary"/);
  assert.match(i18nJs, /Default path is local\/manual encrypted envelope exchange/);
  assert.match(i18nJs, /export, carry through your existing channel, import, then reply/);
  assert.match(i18nJs, /retry or cancel pending sends/);
  assert.match(i18nJs, /delete only local conversation records/);
  assert.match(i18nJs, /Manual local\/default path: no network I\/O, no automatic delivery, and no external delivery claim\./);
  assert.match(stylesCss, /\.manual-flow-guide/);
});

test("public diagnostics recovery guide keeps support-safe next actions visible", () => {
  assert.match(indexHtml, /class="public-recovery-guide"/);
  assert.match(indexHtml, /class="redacted-support-report-panel"/);
  assert.match(indexHtml, /id="redacted-support-report"/);
  assert.match(indexHtml, /id="redacted-support-report-summary"/);
  assert.match(indexHtml, /id="copy-redacted-support-report"/);
  assert.match(indexHtml, /data-i18n="publicRecoveryInstall"/);
  assert.match(indexHtml, /data-i18n="publicRecoveryProfileLocked"/);
  assert.match(indexHtml, /data-i18n="publicRecoveryPayloadReplay"/);
  assert.match(indexHtml, /data-i18n="publicRecoveryTransportPolicy"/);
  assert.match(indexHtml, /data-i18n="publicRecoveryLifecycle"/);
  assert.match(indexHtml, /data-i18n="redactedSupportReport"/);
  assert.match(indexHtml, /data-i18n="copyRedactedSupportReport"/);
  assert.match(i18nJs, /Install\/checksum failure: stop, verify the same-release \.sha256/);
  assert.match(i18nJs, /Profile locked: retry the passphrase or create a new local profile/);
  assert.match(i18nJs, /Malformed payload or replay rejected: ask for a fresh envelope/);
  assert.match(i18nJs, /Transport unavailable or policy blocked: stay on manual envelope exchange/);
  assert.match(i18nJs, /Lifecycle confirmation required: confirm the local-only delete or wipe scope/);
  assert.match(i18nJs, /Redacted support report/);
  assert.match(i18nJs, /민감정보 제거 지원 리포트/);
  assert.match(stylesCss, /\.public-recovery-guide/);
  assert.match(stylesCss, /\.redacted-support-report-panel/);
  assert.match(actionStateJs, /export function productionRedactedSupportReportView/);
  assert.match(actionStateJs, /passphrase=<redacted>/);
  assert.match(actionStateJs, /private_key=<redacted>/);
  assert.match(actionStateJs, /envelope_payload=<redacted>/);
  assert.match(actionStateJs, /raw_local_path=<redacted>/);
  assert.match(actionStateJs, /credential=<redacted>/);
  assert.match(actionStateJs, /support_bundle_requested=false/);
  assert.match(actionStateJs, /diagnostic_upload_requested=false/);
  assert.match(actionStateJs, /telemetry_upload_requested=false/);
  assert.match(mainJs, /productionRedactedSupportReportView/);
  assert.match(mainJs, /function renderRedactedSupportReport/);
  assert.match(mainJs, /function rememberFailureSupportReport/);
  assert.match(mainJs, /function copyRedactedSupportReport/);
  assert.match(mainJs, /fields\.copyRedactedSupportReport\.addEventListener\("click", copyRedactedSupportReport\)/);
  assert.match(functionBody(mainJs, "unlockProductionProfile"), /rememberFailureSupportReport\(/);
  assert.match(functionBody(mainJs, "exportProductionMessageEnvelope"), /rememberFailureSupportReport\(/);
  assert.match(functionBody(mainJs, "importProductionMessageEnvelope"), /rememberFailureSupportReport\(/);
  assert.match(functionBody(mainJs, "deleteProductionProfile"), /rememberFailureSupportReport\(/);
  assert.match(functionBody(mainJs, "wipeProductionLocalData"), /rememberFailureSupportReport\(/);
  assert.match(functionBody(mainJs, "deleteProductionSessionLifecycle"), /rememberFailureSupportReport\(/);
  assert.match(functionBody(mainJs, "deleteProductionConversation"), /rememberFailureSupportReport\(/);
  assert.match(functionBody(mainJs, "dataLifecycleDestructivePreflightView"), /destructive_scope=/);
  assert.match(functionBody(mainJs, "dataLifecycleDestructivePreflightView"), /confirmation_phrase=/);
  assert.match(functionBody(mainJs, "deleteProductionSessionLifecycle"), /action: "session-delete"/);
  assert.match(functionBody(mainJs, "deleteProductionConversation"), /action: "conversation-delete"/);
  assert.match(indexHtml, /data-destructive-scope="conversation-delete"/);
  assert.match(indexHtml, /data-destructive-scope="session-delete"/);
  assert.match(indexHtml, /data-destructive-scope="profile-delete"/);
  assert.match(indexHtml, /data-destructive-scope="full-local-wipe"/);
  assert.match(indexHtml, /data-destructive-scope="emergency-local-wipe"/);
});

test("empty loading and error states keep UI error details redacted", () => {
  assert.match(mainJs, /function redactedUiErrorClass/);
  assert.match(mainJs, /function redactedUiErrorMessage/);
  assert.match(
    functionBody(mainJs, "redactedUiErrorMessage"),
    /No private payloads, local paths, keys, passphrases, endpoints, or message bodies are shown/,
  );
  assert.match(functionBody(mainJs, "twoProfileRecoveryMessage"), /error_class=\$\{redactedUiErrorClass\(error\)\}/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /redactedUiErrorMessage\("conversation-load", error\)/);
  assert.match(functionBody(mainJs, "exportProductionMessageEnvelope"), /redactedUiErrorMessage\("message-export", error\)/);
  assert.match(functionBody(mainJs, "importProductionMessageEnvelope"), /redactedUiErrorMessage\("message-import", error\)/);
  assert.match(functionBody(mainJs, "exportProductionReceivedMessage"), /redactedUiErrorMessage\("received-export", error\)/);
  assert.match(functionBody(mainJs, "loadProductionMessageTranscript"), /redactedUiErrorMessage\("transcript-load", error\)/);
  assert.match(functionBody(mainJs, "exportProductionHandshakeInit"), /redactedUiErrorMessage\("handshake-init", error\)/);
  assert.match(functionBody(mainJs, "importProductionHandshakeFinish"), /redactedUiErrorMessage\("handshake-finish-import", error\)/);
  assert.match(functionBody(mainJs, "runLocalDemo"), /Local demo failed:\\n\$\{redactedUiErrorMessage\("local-command", error\)\}/);
  assert.doesNotMatch(mainJs, /setText\([^;]*String\(error\)/);
  assert.doesNotMatch(mainJs, /renderDemoSteps\([^;]*String\(error\)/);
  assert.doesNotMatch(mainJs, /renderLoopResults\([^;]*String\(error\)/);
});

test("safety mismatch revokes the saved room verification", () => {
  assert.match(mainJs, /function clearTwoProfileSafetyConfirmationForInput/);
  assert.match(functionBody(mainJs, "clearTwoProfileSafetyConfirmationForInput"), /twoProfileSafetyStorageKeys\(input\)/);
  assert.match(functionBody(mainJs, "clearTwoProfileSafetyConfirmationForInput"), /localStoreRemove\(key\)/);
  assert.match(functionBody(mainJs, "rejectCurrentTwoProfileSafety"), /clearTwoProfileSafetyConfirmationForInput\(productionTwoProfileInput\(\)\)/);
  assert.match(functionBody(mainJs, "rejectCurrentTwoProfileSafety"), /applyProductionActionState\(\)/);
  assert.match(functionBody(mainJs, "runProductionTwoProfileMessageRoundtrip"), /!twoProfileSafetyConfirmedForInput\(roomInput\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /!twoProfileSafetyConfirmedForInput\(input\)/);
});

test("composer and delivery-route controls stay on the chat delivery path", () => {
  assert.match(
    mainJs,
    /fields\.runProductionTwoProfileMessageRoundtrip\.addEventListener\(\s*"click",\s*runProductionTwoProfileComposerPrimaryAction/,
  );
  assert.match(mainJs, /fields\.preparePrivateRoute\.addEventListener\("click",[\s\S]*preparePrivateDeliveryRoute/);
  assert.match(mainJs, /fields\.copyPrivateRouteCode\.addEventListener\("click", copyLocalPrivateRouteCode\)/);
  assert.match(mainJs, /fields\.applyPeerPrivateRouteCode\.addEventListener\("click", applyPeerPrivateRouteCode\)/);
  assert.match(
    mainJs,
    /fields\.peerPrivateRouteCode\.addEventListener\("keydown",[\s\S]*applyPeerPrivateRouteCode\(\);[\s\S]*\}\);/,
  );

  const composerBody = functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction");
  assert.match(composerBody, /enablePrivateDeliveryPermission\(\{ preserveFollowup: true \}\)/);
  assert.match(composerBody, /rememberPrivateRouteFollowup\(input\.message \? "send-draft" : "receive", input\)/);
  assert.match(composerBody, /await preparePrivateDeliveryRoute\(\{ input, allowRetryRecovery: false \}\)/);
  assert.match(composerBody, /focusSafetyConfirmation\(\)/);
  assert.match(composerBody, /await runProductionTwoProfileMessageRoundtrip\(\)/);
  assert.doesNotMatch(composerBody, /openChatSettingsPanel|openPrivateDeliverySettings/);

  const savedMessageBody = functionBody(mainJs, "saveInviteRoomOutboundMessage");
  assert.match(savedMessageBody, /outboundDeliveryState: "sent"/);
  assert.match(savedMessageBody, /outboundRetryable: false/);

  const prepareRouteBody = functionBody(mainJs, "preparePrivateDeliveryRoute");
  assert.match(prepareRouteBody, /const input = options\.input \?\? productionTwoProfileInput\(\)/);
  assert.match(prepareRouteBody, /await refreshProductionTwoProfilePeerEndpoints\(input, \{ allowRetryRecovery \}\)/);

  const permissionBody = functionBody(mainJs, "enablePrivateDeliveryPermission");
  assert.match(permissionBody, /setManualNetworkPermission\(true\)/);
  assert.match(permissionBody, /fields\.preparePrivateRoute\?\.focus/);
  assert.doesNotMatch(permissionBody, /openChatSettingsPanel|openPrivateDeliverySettings/);
});

test("dark chat palette does not use gold or yellow warning colors", () => {
  assert.doesNotMatch(stylesCss, /#b8a46f|#746842|\bgold\b|\byellow\b/i);
});

test("public diagnostics summary includes desktop completion without production claims", () => {
  assert.match(privateDeliveryStateJs, /function desktopCompletionRouteReady/);
  assert.match(privateDeliveryStateJs, /export function desktopFirstCompletionStatus/);
  assert.match(privateDeliveryStateJs, /local-private-flow-no-current-blockers/);
  assert.doesNotMatch(privateDeliveryStateJs, /ready-for-local-private-message-flow/);
  assert.match(privateDeliveryStateJs, /blockerSummary: blockers\.length > 0 \? blockers\.join\("#"\) : "none"/);
  assert.match(privateDeliveryStateJs, /desktop_completion_scope=\$\{fieldTestReportValue\(desktopCompletion\.scope/);
  assert.match(privateDeliveryStateJs, /desktop_acceptance_surface=\$\{fieldTestReportValue\(desktopCompletion\.scope/);
  assert.match(privateDeliveryStateJs, /desktop_acceptance_status=\$\{fieldTestReportValue\(desktopCompletion\.status/);
  assert.match(privateDeliveryStateJs, /desktop_acceptance_blockers=\$\{desktopCompletion\.blockerSummary\}/);
  assert.match(privateDeliveryStateJs, /desktop_acceptance_next_action=\$\{recoveryNextAction\}/);
  assert.match(privateDeliveryStateJs, /export function localManualE2eeRuntimeBoundaryStatus/);
  assert.match(privateDeliveryStateJs, /localManualE2eeRuntimeReady: true/);
  assert.match(privateDeliveryStateJs, /replayCommitAfterDecrypt: true/);
  assert.match(privateDeliveryStateJs, /tamperFailureNonAdvance: true/);
  assert.match(privateDeliveryStateJs, /passphraseFirstStorageRequired: true/);
  assert.match(privateDeliveryStateJs, /productionE2eeReady: false/);
  assert.match(privateDeliveryStateJs, /productionKeyManagementReady: true/);
  assert.match(privateDeliveryStateJs, /supportedLocalKeyLifecycleReady: true/);
  assert.match(privateDeliveryStateJs, /supportedLocalKeyLifecycleScope: "passphrase-first-sqlcipher-local-profile-store-only"/);
  assert.match(privateDeliveryStateJs, /supportedRollbackDetectionReady: true/);
  assert.match(privateDeliveryStateJs, /supportedRollbackDetectionScope: "marker-only-detection-user-visible-reset-required"/);
  assert.match(privateDeliveryStateJs, /supportedLocalDeletionScopeReady: true/);
  assert.match(privateDeliveryStateJs, /supportedLocalDeletionScope: "local-logical-delete-and-owned-app-data-wipe-only"/);
  assert.match(privateDeliveryStateJs, /supportedDefaultTransportReady: true/);
  assert.match(privateDeliveryStateJs, /supportedDefaultTransportScope: "local-manual-courier-envelope-exchange-only"/);
  assert.match(privateDeliveryStateJs, /supportedOwnerObservedUsabilityRehearsalReady: true/);
  assert.match(privateDeliveryStateJs, /supportedUsabilityRecoveryScope: "owner-observed-critical-desktop-task-script-only"/);
  assert.match(privateDeliveryStateJs, /criticalDesktopTaskScriptReady: true/);
  assert.match(privateDeliveryStateJs, /recoveryVocabularyAligned: true/);
  assert.match(privateDeliveryStateJs, /usabilityStudyCompleted: false/);
  assert.match(privateDeliveryStateJs, /productionWordingReady: false/);
  assert.match(privateDeliveryStateJs, /appKeyWrappingReady: false/);
  assert.match(privateDeliveryStateJs, /secureDeletionClaimAllowed: false/);
  assert.match(privateDeliveryStateJs, /productionTransportReady: false/);
  assert.match(privateDeliveryStateJs, /reliableExternalDeliveryClaimAllowed: false/);
  assert.match(privateDeliveryStateJs, /local_manual_e2ee_runtime_boundary=\$\{fieldTestReportValue\(desktopCompletion\.localManualE2eeRuntimeBoundary/);
  assert.match(privateDeliveryStateJs, /local_manual_e2ee_runtime_ready=\$\{desktopCompletion\.localManualE2eeRuntimeReady === true\}/);
  assert.match(privateDeliveryStateJs, /supported_local_manual_e2ee_ready=\$\{desktopCompletion\.supportedLocalManualE2eeReady === true\}/);
  assert.match(privateDeliveryStateJs, /supported_local_manual_e2ee_scope=\$\{fieldTestReportValue\(desktopCompletion\.supportedLocalManualE2eeScope/);
  assert.match(privateDeliveryStateJs, /replay_commit_after_decrypt=\$\{desktopCompletion\.replayCommitAfterDecrypt === true\}/);
  assert.match(privateDeliveryStateJs, /tamper_failure_non_advance=\$\{desktopCompletion\.tamperFailureNonAdvance === true\}/);
  assert.match(privateDeliveryStateJs, /production_e2ee_ready=\$\{desktopCompletion\.productionE2eeReady === true\}/);
  assert.match(privateDeliveryStateJs, /production_key_management_ready=\$\{desktopCompletion\.productionKeyManagementReady === true\}/);
  assert.match(privateDeliveryStateJs, /supported_local_key_lifecycle_ready=\$\{desktopCompletion\.supportedLocalKeyLifecycleReady === true\}/);
  assert.match(privateDeliveryStateJs, /supported_local_key_lifecycle_scope=\$\{fieldTestReportValue\(desktopCompletion\.supportedLocalKeyLifecycleScope/);
  assert.match(privateDeliveryStateJs, /supported_rollback_detection_ready=\$\{desktopCompletion\.supportedRollbackDetectionReady === true\}/);
  assert.match(privateDeliveryStateJs, /supported_rollback_detection_scope=\$\{fieldTestReportValue\(desktopCompletion\.supportedRollbackDetectionScope/);
  assert.match(privateDeliveryStateJs, /supported_local_deletion_scope_ready=\$\{desktopCompletion\.supportedLocalDeletionScopeReady === true\}/);
  assert.match(privateDeliveryStateJs, /supported_local_deletion_scope=\$\{fieldTestReportValue\(desktopCompletion\.supportedLocalDeletionScope/);
  assert.match(privateDeliveryStateJs, /rollback_prevention_claimed=false/);
  assert.match(privateDeliveryStateJs, /secure_deletion_claim_allowed=\$\{desktopCompletion\.secureDeletionClaimAllowed === true\}/);
  assert.match(privateDeliveryStateJs, /supported_default_transport_ready=\$\{desktopCompletion\.supportedDefaultTransportReady === true\}/);
  assert.match(privateDeliveryStateJs, /supported_default_transport_scope=\$\{fieldTestReportValue\(desktopCompletion\.supportedDefaultTransportScope/);
  assert.match(privateDeliveryStateJs, /production_transport_ready=\$\{desktopCompletion\.productionTransportReady === true\}/);
  assert.match(privateDeliveryStateJs, /reliable_external_delivery_claim_allowed=\$\{desktopCompletion\.reliableExternalDeliveryClaimAllowed === true\}/);
  assert.match(privateDeliveryStateJs, /supported_owner_observed_usability_rehearsal_ready=\$\{desktopCompletion\.supportedOwnerObservedUsabilityRehearsalReady === true\}/);
  assert.match(privateDeliveryStateJs, /supported_usability_recovery_scope=\$\{fieldTestReportValue\(desktopCompletion\.supportedUsabilityRecoveryScope/);
  assert.match(privateDeliveryStateJs, /critical_desktop_task_script_ready=\$\{desktopCompletion\.criticalDesktopTaskScriptReady === true\}/);
  assert.match(privateDeliveryStateJs, /recovery_vocabulary_aligned=\$\{desktopCompletion\.recoveryVocabularyAligned === true\}/);
  assert.match(privateDeliveryStateJs, /usability_study_completed=\$\{desktopCompletion\.usabilityStudyCompleted === true\}/);
  assert.match(privateDeliveryStateJs, /production_wording_ready=\$\{desktopCompletion\.productionWordingReady === true\}/);
  assert.match(privateDeliveryStateJs, /diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only/);
  assert.match(privateDeliveryStateJs, /PUBLIC_SUPPORT_DIAGNOSTICS_ALLOWED_FIELDS/);
  assert.match(privateDeliveryStateJs, /PUBLIC_SUPPORT_DIAGNOSTICS_FORBIDDEN_FIELDS/);
  assert.match(privateDeliveryStateJs, /allowed_public_intake_fields=\$\{publicSupportDiagnosticsAllowedFieldsValue\(\)\}/);
  assert.match(privateDeliveryStateJs, /forbidden_public_intake_fields=\$\{publicSupportDiagnosticsForbiddenFieldsValue\(\)\}/);
  assert.match(privateDeliveryStateJs, /excluded_fields=\$\{publicSupportDiagnosticsExcludedFieldsValue\(\)\}/);
  assert.match(privateDeliveryStateJs, /diagnostics_copy_next_action=\$\{recoveryNextAction\}/);
  assert.match(privateDeliveryStateJs, /diagnostics_support_bundle_export=false/);
  assert.match(privateDeliveryStateJs, /diagnostics_audit_evidence_claim=false/);
  assert.match(privateDeliveryStateJs, /diagnostics_external_delivery_evidence_claim=false/);
  assert.match(privateDeliveryStateJs, /diagnostics_security_ready_proof_claim=false/);
  assert.match(privateDeliveryStateJs, /desktop_acceptance_external_delivery_claim=false/);
  assert.match(privateDeliveryStateJs, /desktop_acceptance_production_claim=false/);
  assert.match(privateDeliveryStateJs, /desktop_acceptance_sensitive_use_claim=false/);
  assert.match(
    privateDeliveryStateJs,
    /external_onion_delivery_verified=\$\{desktopCompletion\.externalOnionDeliveryVerified === true\}/,
  );
  assert.match(privateDeliveryStateJs, /production_messaging_ready=\$\{desktopCompletion\.productionMessagingReady === true\}/);
  assert.match(privateDeliveryStateJs, /security_ready_claimed=\$\{desktopCompletion\.securityReadyClaimed === true\}/);
  assert.match(
    privateDeliveryStateJs,
    /sensitive_communication_allowed=\$\{desktopCompletion\.sensitiveCommunicationAllowed === true\}/,
  );
  assert.match(mainJs, /function desktopFirstCompletionStatus\(report\)/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /public diagnostics generated failure_class=/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /recovery_next_action=\$\{recoveryNextAction\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /parseFieldTestReport\(payload\)/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /publicDiagnostics\.failure_class/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /publicDiagnostics\.diagnostics_copy_next_action/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /publicDiagnostics\.desktop_acceptance_next_action/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /publicDiagnostics\.allowed_public_intake_fields/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /publicDiagnostics\.forbidden_public_intake_fields/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /publicDiagnostics\.excluded_fields/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /payload_next_action_match=\$\{payloadNextActionMatchesSummary\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /raw_state_excluded=\$\{rawStateExcluded\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /public_intake_policy_fields_aligned=\$\{publicIntakePolicyFieldsAligned\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /allowed_public_intake_fields=\$\{allowedPublicIntakeFields\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /forbidden_public_intake_fields=\$\{forbiddenPublicIntakeFields\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /local_manual_e2ee_runtime_boundary=\$\{localManualE2eeBoundary\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_local_manual_e2ee_ready=\$\{supportedLocalManualE2eeReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_local_manual_e2ee_scope=\$\{supportedLocalManualE2eeScope\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_local_key_lifecycle_ready=\$\{supportedLocalKeyLifecycleReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_local_key_lifecycle_scope=\$\{supportedLocalKeyLifecycleScope\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_rollback_detection_ready=\$\{supportedRollbackDetectionReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_rollback_detection_scope=\$\{supportedRollbackDetectionScope\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_local_deletion_scope_ready=\$\{supportedLocalDeletionScopeReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_local_deletion_scope=\$\{supportedLocalDeletionScope\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /production_key_management_ready=\$\{productionKeyManagementReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /rollback_prevention_claimed=\$\{rollbackPreventionClaimed\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /secure_deletion_claim_allowed=\$\{secureDeletionClaimAllowed\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /default_transport_path=\$\{defaultTransportPath\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_default_transport_ready=\$\{supportedDefaultTransportReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_default_transport_scope=\$\{supportedDefaultTransportScope\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /default_transport_network_io=\$\{defaultTransportNetworkIo\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /production_transport_ready=\$\{productionTransportReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /reliable_external_delivery_claim_allowed=\$\{reliableExternalDeliveryClaimAllowed\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_owner_observed_usability_rehearsal_ready=\$\{supportedOwnerObservedUsabilityRehearsalReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /supported_usability_recovery_scope=\$\{supportedUsabilityRecoveryScope\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /critical_desktop_task_script_ready=\$\{criticalDesktopTaskScriptReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /recovery_vocabulary_aligned=\$\{recoveryVocabularyAligned\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /usability_study_completed=\$\{usabilityStudyCompleted\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /production_wording_ready=\$\{productionWordingReady\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /high_risk_onion_path=explicit-user-triggered-fail-closed/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /high_risk_transport_mode=\$\{highRiskTransportMode\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /high_risk_transport_not_ready_reason=\$\{highRiskTransportNotReadyReason\}/);
  assert.match(privateDeliveryStateJs, /high_risk_transport_runtime_evidence_required_for_ready=true/);
  assert.match(privateDeliveryStateJs, /high_risk_transport_runtime_evidence_present=false/);
  assert.match(
    privateDeliveryStateJs,
    /high_risk_transport_failure_classes=bridge_config_missing#bootstrap_timeout#peer_unreachable#stale_endpoint#receive_owner_mismatch/,
  );
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /production_e2ee_ready=\$\{productionE2eeReady\}/);
  assert.doesNotMatch(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /public diagnostics ready failure_class=/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /desktop_completion=\$\{desktopCompletion\.status\}/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /desktop_blockers=\$\{desktopCompletion\.blockerSummary\}/);
  assert.match(
    functionBody(mainJs, "refreshPublicBetaDiagnostics"),
    /release_non_claims=unsigned-experimental-public-beta#not-audited#not-production-ready#sensitive-communication-prohibited/,
  );
  assert.match(
    functionBody(mainJs, "refreshPublicBetaDiagnostics"),
    /non_claims=external-onion-delivery#production-messaging#security-ready#sensitive-communication/,
  );
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /support_bundle_export=false/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /audit_evidence_claim=false/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /external_delivery_evidence_claim=false/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /security_ready_proof_claim=false/);
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /app_launch_network=false/);
  assert.match(mainJs, /Attempt explicit private delivery for message #/);
  assert.doesNotMatch(mainJs, /Attempt external onion send/);
});
