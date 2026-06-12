import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createMessageEnvelopeSlot,
  messageEnvelopeSlotImportReadyForEntry,
  messageEnvelopeSlotMatchesEntry,
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
  ]) {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  }
  assert.match(mainJs, /startProductionTwoProfileOnionReceive/);
  assert.match(mainJs, /retryTwoProfileOutboundEntry/);
  assert.match(mainJs, /cancelTwoProfileOutboundEntry/);
});

test("first launch public beta warning keeps release and network boundaries visible", () => {
  assert.match(indexHtml, /class="public-beta-warning"/);
  assert.match(indexHtml, /class="public-beta-gate"/);
  assert.match(indexHtml, /data-i18n="publicBetaChecksumBody"/);
  assert.match(indexHtml, /data-i18n="publicBetaInstallBody"/);
  assert.match(indexHtml, /data-i18n="publicBetaNoUpdateBody"/);
  assert.match(i18nJs, /same GitHub Release/);
  assert.match(i18nJs, /Privacy & Security manual allow/);
  assert.match(i18nJs, /unsigned experimental public beta/);
  assert.match(i18nJs, /not audited/);
  assert.match(i18nJs, /not production-ready/);
  assert.match(i18nJs, /sensitive communication prohibited/);
  assert.match(i18nJs, /external onion delivery claim/);
  assert.match(i18nJs, /Ready for local beta messages/);
  assert.match(i18nJs, /Verified local beta room\. Manual message actions are available\./);
  assert.match(i18nJs, /Explicit local\/manual messaging path available/);
  assert.match(i18nJs, /nothing starts on app launch/);
  assert.match(i18nJs, /앱 실행 시 자동 시작되지 않습니다/);
  assert.match(i18nJs, /Receive attempts start after this explicit action; external delivery is not claimed\./);
  assert.match(i18nJs, /Local send attempt recorded\./);
  assert.match(i18nJs, /External receipt remains unconfirmed\./);
  assert.doesNotMatch(i18nJs, /New messages arrive after you turn this on\./);
  assert.doesNotMatch(i18nJs, /Message (was )?sent\./);
  assert.doesNotMatch(i18nJs, /Message delivered\. You can continue the conversation\./);
  assert.doesNotMatch(i18nJs, /statusSent:\s*"sent"/);
  assert.match(i18nJs, /statusSent:\s*"send attempt recorded"/);
  assert.match(stylesCss, /\.public-beta-gate/);
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
  assert.match(functionBody(mainJs, "currentComposerPendingOutboundAction"), /restoreLatestChatDeliveryPendingOutbound\(input\) \?\? automaticVisibleTwoProfileRetryableOutboundEntry\(input\)/);
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
  assert.match(functionBody(mainJs, "pruneStaleMessageEnvelopeSlots"), /stillImportReadyForConversation/);
  assert.match(functionBody(mainJs, "pruneStaleMessageEnvelopeSlots"), /messageEnvelopeSlotImportReadyForEntry\(slot, entry\)/);

  const loadBody = functionBody(mainJs, "loadProductionMessageEnvelope");
  assert.match(loadBody, /pendingMessageEnvelopeSlotForActiveProfile\(profile\)/);
  assert.match(loadBody, /if \(!entry\)/);
  assert.match(loadBody, /value && !messageEnvelopeSlotMatchesEntry\(slot, entry\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /activeMessageEnvelopeSlotReady\(activeProductionProfileName\(\)\)/);
});

test("manual message envelope slots are import-ready only for active lifecycle rows", () => {
  const slot = createMessageEnvelopeSlot("alice", "ADENV1PAYLOAD", {
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
  assert.equal(messageEnvelopeSlotMatchesEntry(slot, sentEntry), true);
  assert.equal(messageEnvelopeSlotImportReadyForEntry(slot, sentEntry), true);
  assert.equal(
    messageEnvelopeSlotImportReadyForEntry(slot, {
      ...sentEntry,
      outboundDeliveryState: "canceled",
    }),
    false,
  );
  assert.equal(
    messageEnvelopeSlotImportReadyForEntry(slot, {
      ...sentEntry,
      statuses: new Set(["sent", "received"]),
    }),
    false,
  );
  assert.match(functionBody(mainJs, "cancelTwoProfileOutboundEntry"), /clearMessageEnvelopeSlotForConversationEntry\(currentEntry\)/);
});

test("manual message envelope slots are scoped to the room fingerprint", () => {
  const slot = createMessageEnvelopeSlot("Alice", "payload", {
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
  assert.match(recoveryBody, /local_recovery=retry-passphrase-or-new-local-profile/);

  const renderBody = functionBody(mainJs, "renderProductionProductUnlockRecovery");
  assert.match(renderBody, /fields\.productionProfileNextAction/);

  const unlockBody = functionBody(mainJs, "unlockProductionProfile");
  assert.match(unlockBody, /const productUnlockRecovery = renderProductionProductUnlockRecovery\(productUnlock\)/);
  assert.match(unlockBody, /setText\(fields\.productionProfileBoundary, productUnlockRecovery\.boundary\)/);

  const lockBody = functionBody(mainJs, "lockProductionProfile");
  assert.match(lockBody, /renderProductionProductUnlockRecovery\(result, \{ lockedByUser: true \}\)/);
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

  const profileUnlockResumeBody = functionBody(mainJs, "refreshTwoProfileSessionAfterProfileUnlock");
  assert.match(profileUnlockResumeBody, /applyRuntimeResumeRollbackRecovery\(resume, \{ source: "profile-unlock-auto-resume" \}\)/);

  const loadTranscriptBody = functionBody(mainJs, "loadProductionTwoProfileTranscript");
  assert.match(loadTranscriptBody, /applyRuntimeResumeRollbackRecovery\(runtimeResumeResult, \{ source: "transcript-load" \}\)/);
});

test("local data lifecycle actions expose destructive local-only boundaries", () => {
  const viewBody = functionBody(mainJs, "dataLifecycleActionView");
  assert.match(viewBody, /destructive_action=\$\{destructiveAction\}/);
  assert.match(viewBody, /redacted_result=true/);
  assert.match(viewBody, /local_only=true/);
  assert.match(viewBody, /backup_recovery=false/);
  assert.match(viewBody, /cloud_backup_sync=false/);
  assert.match(viewBody, /security_ready=false/);
  assert.match(viewBody, /rollback_prevention/);
  assert.match(viewBody, /rollback_prevention=false/);
  assert.match(viewBody, /secure_delete_claim/);
  assert.match(viewBody, /secure_delete_claim=false/);
  assert.match(viewBody, /profile_deleted/);
  assert.match(viewBody, /full_local_data_wiped/);

  const preflightBody = functionBody(mainJs, "dataLifecycleDestructivePreflightView");
  assert.match(preflightBody, /destructive_preflight=true/);
  assert.match(preflightBody, /confirmation_matched=\$\{confirmationMatched\}/);
  assert.match(preflightBody, /profile_target_present=\$\{profilePresent\}/);
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
  const conversationDeleteBody = functionBody(mainJs, "deleteProductionConversation");
  assert.match(conversationDeleteBody, /clearSavedInviteRoomConversationMetadataForProfile\(profile\)/);
  assert.match(conversationDeleteBody, /saved_rooms_cleared=\$\{savedRoomsCleared\}/);

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
  assert.match(rebuildBody, /stale_room_retry_cleared=true/);
  assert.match(rebuildBody, /stale_receive_cleared=true/);
  assert.match(rebuildBody, /stale_delivery_code_cleared=true/);
  assert.match(rebuildBody, /stale_manual_rebuild_cleared=true/);
  assert.match(rebuildBody, /stale_chat_notice_cleared=true/);
  assert.match(rebuildBody, /rebuild_required=true/);
  assert.match(rebuildBody, /external_evidence_claim=false/);
  assert.match(rebuildBody, /backup_recovery=false/);
  assert.match(rebuildBody, /cloud_backup_sync=false/);
  assert.match(rebuildBody, /rollback_prevention=false/);
  assert.match(rebuildBody, /secure_delete_claim=false/);
  assert.match(rebuildBody, /security_ready=false/);
  assert.match(rebuildBody, /clearCurrentInviteRoomInput\(\)/);
  assert.match(rebuildBody, /setProductionFollowupActions\(true/);

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
  assert.match(functionBody(mainJs, "copyFieldTestReport"), /navigator\.clipboard\.writeText\(payload\)/);
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
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /cancel\.disabled = !outboundActionState\.canCancelNow/);
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
  assert.match(functionBody(mainJs, "ensurePrivateDeliveryRuntimeReady"), /production_onion_persistent_client_start/);
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
  assert.match(functionBody(mainJs, "refreshPublicBetaDiagnostics"), /app_launch_network=false/);
  assert.match(mainJs, /Attempt explicit private delivery for message #/);
  assert.doesNotMatch(mainJs, /Attempt external onion send/);
});
