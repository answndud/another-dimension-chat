import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createMessageEnvelopeSlot,
  messageEnvelopeSlotMatchesEntry,
} from "./message-envelope-slots.js";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const mainJs = readFileSync(join(here, "main.js"), "utf8");
const i18nJs = readFileSync(join(here, "i18n.js"), "utf8");
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
  assert.match(stylesCss, /\.room-list-sync-status/);
  assert.match(stylesCss, /\.saved-room-list-item\.is-resume-recommended/);
  assert.doesNotMatch(mainJs, /restoreLastInviteRoom\(\);/);
  assert.match(functionBody(mainJs, "showRoomList"), /prepareRoomListReturnState\(\)/);
  assert.match(functionBody(mainJs, "prepareRoomListReturnState"), /reconcileCurrentInviteRoomMetadataFromTranscriptEntries/);
  assert.match(functionBody(mainJs, "prepareRoomListReturnState"), /!savedRoomMetadataSyncInFlight/);
  assert.match(functionBody(mainJs, "prepareRoomListReturnState"), /setSavedRoomMetadataSyncStatus\(""\)/);
  assert.match(mainJs, /showRoomList\(\);\s*syncSavedInviteRoomMetadataFromLocalStores\(\);/);
  assert.match(functionBody(mainJs, "savedInviteRoomMetadataFromLocalStores"), /production_message_transcript_export/);
  assert.match(functionBody(mainJs, "savedInviteRoomMetadataSyncCandidates"), /savedInviteRoomResumePriority\(right\) - savedInviteRoomResumePriority\(left\)/);
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
  assert.match(indexHtml, /id="back-to-room-list"/);
  assert.match(stylesCss, /body\.is-room-list-mode [\s\S]*#production-two-profile-transcript/);
  assert.match(stylesCss, /body\.is-room-detail-mode \.room-list-panel/);
  assert.match(stylesCss, /body\.is-room-detail-mode\.is-chat-active \.room-list-back/);
});

test("saved room open carries current session status into metadata reconciliation", () => {
  assert.match(functionBody(mainJs, "finishInviteRoomReadyFromStatus"), /sessionStatus: status/);
  assert.match(
    functionBody(mainJs, "loadProductionTwoProfileTranscript"),
    /options\.sessionStatus \?\? latestTwoProfileSessionStatusForCurrentInput\(transcriptInput\)/,
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
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /action === "enable-private-delivery"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /action === "prepare-private-route"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /action === "refresh-and-retry"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /action === "enable-private-delivery"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /action === "prepare-private-route"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /action === "refresh-and-retry"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /refreshTwoProfileOutboundEndpointThenRetry\(pending\)/);
  assert.match(functionBody(mainJs, "savedInviteRoomResumePriority"), /return 30/);
  assert.match(functionBody(mainJs, "savedInviteRoomResumePriority"), /return 20/);
  assert.match(functionBody(mainJs, "savedInviteRoomResumePriority"), /return 10/);
  assert.match(
    functionBody(mainJs, "savedInviteRoomState"),
    /savedInviteRoomHasRetryableOutbound\(room\)[\s\S]*receiveState === "listening"[\s\S]*receiveState === "paused"[\s\S]*savedInviteRoomWaitingForPeerCode\(room\)/,
  );
  assert.match(
    functionBody(mainJs, "savedInviteRoomListAction"),
    /savedInviteRoomHasRetryableOutbound\(room\)[\s\S]*savedInviteRoomReceiveState\(room\) === "paused"[\s\S]*savedInviteRoomWaitingForPeerCode\(room\)/,
  );
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /roomStateResumeNext/);
  assert.match(functionBody(mainJs, "savedInviteRoomRetryableState"), /roomStateRetrySend/);
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /roomStateWaitingPeerCode/);
  assert.match(i18nJs, /roomStateEnableDelivery/);
  assert.match(i18nJs, /roomStateSetupDelivery/);
  assert.match(i18nJs, /roomStateRefreshAddress/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /needs-receive-restart/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /savedInviteRoomListItemView\(room, \{ currentCode, resumeRoom \}\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /is-waiting-peer-code/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /has-retryable-send/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /is-resume-recommended/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /renderSavedInviteRooms\(\)/);
  assert.match(
    functionBody(mainJs, "startProductionTwoProfileOnionReceive"),
    /catch \(error\) \{[\s\S]*setChatDeliveryNoticeByKey\("receiveStartFailed", "warning", input\);[\s\S]*renderSavedInviteRooms\(\);[\s\S]*applyProductionActionState\(\);/,
  );
  assert.match(
    functionBody(mainJs, "startProductionTwoProfileOnionReceive"),
    /backendLoop\.duplicate_loop_blocked \|\| !backendLoop\.enabled[\s\S]*renderSavedInviteRooms\(\);[\s\S]*applyProductionActionState\(\);/,
  );
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /renderSavedInviteRooms\(\)/);
  assert.match(stylesCss, /\.saved-room-state\.is-listening/);
  assert.match(stylesCss, /\.saved-room-state\.is-receive-paused/);
  assert.match(stylesCss, /\.saved-room-state\.is-waiting-peer-code/);
  assert.match(stylesCss, /\.saved-room-state\.is-retry-send/);
  assert.match(stylesCss, /\.saved-room-state\.is-enable-delivery/);
  assert.match(stylesCss, /\.saved-room-state\.is-setup-delivery/);
  assert.match(stylesCss, /\.saved-room-state\.is-refresh-address/);
  assert.match(stylesCss, /\.saved-room-next-action/);
});

test("receive controls are scoped to the active room", () => {
  assert.match(mainJs, /roomFingerprint: ""/);
  assert.match(functionBody(mainJs, "productionTwoProfileReceiveMatchesInput"), /productionTwoProfileOnionReceiveMode\.roomFingerprint === roomFingerprint/);
  assert.match(mainJs, /function productionTwoProfileReceiveRuntimeMismatched/);
  assert.match(functionBody(mainJs, "productionTwoProfileReceiveRuntimeMismatched"), /ownerProfileBound/);
  assert.match(functionBody(mainJs, "productionTwoProfileReceiveRuntimeMismatched"), /ownerMatchesReceiveProfile/);
  assert.match(functionBody(mainJs, "updateChatPrimaryActionMode"), /is-receiving-other-room/);
  assert.match(functionBody(mainJs, "updateChatPrimaryActionMode"), /is-receiving-runtime-mismatch/);
  assert.match(functionBody(mainJs, "renderRoomStatusSummary"), /productionTwoProfileReceiveMatchesInput\(input\)/);
  assert.match(functionBody(mainJs, "renderRoomStatusSummary"), /roomStatusShortReceiveMismatch/);
  assert.match(functionBody(mainJs, "renderRoomIdentityBar"), /roomReceivingOther/);
  assert.match(functionBody(mainJs, "renderRoomIdentityBar"), /roomReceivingMismatch/);
  assert.match(mainJs, /receiveIntentForRoom\(input\)[\s\S]*!productionTwoProfileReceiveActiveInOtherRoom\(input\)[\s\S]*action: "start-receiving"/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /productionTwoProfileReceiveActiveInOtherRoom\(input\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /receiveOtherRoomActive/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /!productionTwoProfileReceiveMatchesInput\(targetInput\)/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /receiveOtherRoomActive/);
  assert.match(i18nJs, /roomReceivingOther/);
  assert.match(i18nJs, /roomReceivingMismatch/);
  assert.match(i18nJs, /receiveRuntimeMismatch/);
  assert.match(i18nJs, /receiveOtherRoomActive/);
});

test("receive restart intent owns the room primary action", () => {
  assert.match(mainJs, /function twoProfileComposerPrimaryIntent/);
  assert.match(mainJs, /receiveIntentForRoom\(input\)[\s\S]*action: "start-receiving"/);
  assert.match(mainJs, /action: "start-receiving"[\s\S]*labelKey: "startReceiving"/);
  assert.match(mainJs, /function savedInviteRoomListAction/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /savedInviteRoomReceiveState\(room\) === "paused"/);
  assert.match(functionBody(mainJs, "savedInviteRoomListAction"), /labelKey: "startReceiving"/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /rememberReceiveIntentForRoom\(input, true\)/);
  const actionBody = functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction");
  assert.match(actionBody, /intent\.action === "start-receiving"/);
  assert.match(actionBody, /await startProductionTwoProfileOnionReceive\(\)/);
  assert.match(actionBody, /input\.message \? "send-draft" : "receive"/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /latestChatDeliveryNoticeKey === "receiveStartFailed"/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /action\.textContent = t\("startReceiving"\)/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /action\.addEventListener\("click", startProductionTwoProfileOnionReceive\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /composerPrimaryAvailableWithoutDraft/);
  assert.match(i18nJs, /receiveIntentRestartReady/);
  assert.match(i18nJs, /chatNoticeReceiveRestart/);
});

test("room list controls are wired to room flow instead of settings", () => {
  assert.match(mainJs, /fields\.roomListCreateRoom\.addEventListener\("click", createNewInviteRoomFromList\)/);
  assert.match(mainJs, /fields\.roomListJoinRoom\.addEventListener\("click", createRoomFromRoomListInviteCode\)/);
  assert.match(mainJs, /fields\.backToRoomList\.addEventListener\("click", showRoomList\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /runSavedInviteRoomListAction\(room, view\.nextAction\.action\)/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /await openSavedInviteRoom\(room\)/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /focusPrivateRouteNextAction\(input\)/);
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /showRetryableTwoProfileOutboundNotice\(pending\)/);
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
});

test("saved room removal is list-only and transcript switching rebuilds entries", () => {
  assert.match(functionBody(mainJs, "removeSavedInviteRoom"), /forgetInviteRoom\(code\)/);
  assert.match(functionBody(mainJs, "removeSavedInviteRoom"), /stopProductionTwoProfileOnionReceiveForInput\(savedInviteRoomInput\(room\), \{ silent: true \}\)/);
  assert.match(functionBody(mainJs, "removeSavedInviteRoom"), /removeRoomConfirm/);
  assert.match(mainJs, /removeRoomNotice/);
  assert.doesNotMatch(functionBody(mainJs, "removeSavedInviteRoom"), /invoke\(/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /rememberReceiveIntentForRoom\(roomInput, false\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /clearPrivateRouteFollowupForRoom\(roomInput\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /connectionCode: trimmedCode/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /twoProfileSafetyStorageKeys\(roomInput\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /localStoreRemove\(key\)/);
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /for \(const roomKey of privateRouteRoomKeys\(roomInput\)\)/);
  assert.match(mainJs, /function clearPrivateRouteFollowupForRoom/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /silentStop: silent/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /if \(silent\) \{[\s\S]*rememberProductionTwoProfileOnionReceiveRuntimeState\("stopped"\)/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /else \{[\s\S]*setProductionTwoProfileOnionReceiveRuntimeState\("stopped"\)/);
  assert.match(functionBody(mainJs, "pollProductionTwoProfileOnionReceiveStopConfirmation"), /silentStop === true/);
  assert.match(functionBody(mainJs, "pollProductionTwoProfileOnionReceiveStopConfirmation"), /markProductionTwoProfileOnionReceiveStopped\(backendLoop, \{ silent \}\)/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /markProductionTwoProfileOnionReceiveStopped\(backendLoop, \{ silent \}\)/);
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
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /invokeInviteRoomSessionStatus/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /reconcileCurrentInviteRoomMetadataFromTranscriptEntries\(entries\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /const sessionCheckInput = twoProfileRoomIdentityInput\(input\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /twoProfileTranscriptInputStillCurrent\(sessionCheckInput\)/);
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
  assert.match(functionBody(mainJs, "twoProfileRoomIdentityInput"), /connectionCode/);
  assert.match(functionBody(mainJs, "twoProfileRoomIdentityInput"), /inviteRole/);
  assert.match(functionBody(mainJs, "latestTwoProfileSuccessForInput"), /roomFingerprint === twoProfileSessionStatusFingerprint\(input\)/);
  assert.match(functionBody(mainJs, "latestTwoProfileSuccessMatchesDirection"), /latestTwoProfileSuccessForInput\(input\)/);
  assert.match(functionBody(mainJs, "latestTwoProfileSuccessMatchesOppositeDirection"), /latestTwoProfileSuccessForInput\(\{/);
  assert.match(functionBody(mainJs, "latestTwoProfileOutboundDeliveryCandidate"), /latest\.roomFingerprint !== twoProfileSessionStatusFingerprint\(input\)/);

  for (const name of [
    "saveInviteRoomOutboundMessage",
    "renderProductionTwoProfileResult",
    "renderProductionTwoProfileMessageResult",
    "retryTwoProfileOutboundEntry",
    "runProductionTwoProfileRealOnionRoundtrip",
  ]) {
    assert.match(functionBody(mainJs, name), /roomFingerprint: twoProfileSessionStatusFingerprint/);
  }

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
  assert.match(unlockRefreshBody, /invokeInviteRoomSessionStatus\(input\)/);
  assert.match(unlockRefreshBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(unlockRefreshBody, /await loadProductionTwoProfileTranscript\(\{[\s\S]*autoResume: true,[\s\S]*input/);
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
  assert.match(receivedBody, /const twoProfileRefreshInput = productionTwoProfileInput\(\)/);
  assert.match(receivedBody, /if \(!productionMessageInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(receivedBody, /syncTwoProfileConversationAfterReceivedExport\([\s\S]*twoProfileRefreshInput/);

  assert.match(functionBody(mainJs, "syncTwoProfileConversationAfterManualExport"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(functionBody(mainJs, "syncTwoProfileConversationAfterReceivedExport"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
});

test("manual message envelope slots require the active pending message", () => {
  assert.match(mainJs, /function pendingMessageEnvelopeSlotForActiveProfile/);
  assert.match(functionBody(mainJs, "pendingMessageEnvelopeSlotForActiveProfile"), /selectedTwoProfilePendingConversationEntry\(\)/);
  assert.match(functionBody(mainJs, "pendingMessageEnvelopeSlotForActiveProfile"), /latestTwoProfilePendingConversationEntry\(\)/);
  assert.match(functionBody(mainJs, "pendingMessageEnvelopeSlotForActiveProfile"), /messageEnvelopeSlotRecord\(counterpart, entry\.roomFingerprint\)/);
  assert.match(functionBody(mainJs, "activeMessageEnvelopeSlotReady"), /messageEnvelopeSlotMatchesEntry\(slot, entry\)/);
  assert.match(functionBody(mainJs, "messageEnvelopeSlotKey"), /productionPayloadSlotKey\(profile, roomFingerprint\)/);
  assert.match(functionBody(mainJs, "messageEnvelopeSlotRecord"), /messageEnvelopeSlotKey\(profile, roomFingerprint\)/);
  assert.match(functionBody(mainJs, "storeMessageEnvelopeSlot"), /roomFingerprint/);
  assert.match(functionBody(mainJs, "storeMessageEnvelopeSlot"), /messageEnvelopeSlotKey\(slot\.sender, slot\.roomFingerprint\)/);

  const loadBody = functionBody(mainJs, "loadProductionMessageEnvelope");
  assert.match(loadBody, /pendingMessageEnvelopeSlotForActiveProfile\(profile\)/);
  assert.match(loadBody, /if \(!entry\)/);
  assert.match(loadBody, /value && !messageEnvelopeSlotMatchesEntry\(slot, entry\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /activeMessageEnvelopeSlotReady\(activeProductionProfileName\(\)\)/);
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
  assert.match(mainJs, /async function refreshProductionTwoProfilePeerEndpoints\(input = productionTwoProfileInput\(\)\)/);
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
  assert.match(pollBody, /showLatestRetryableOutboundNotice\(currentInput\)/);
  assert.match(pollBody, /refreshCurrentRoomAfterReceiveImport\(refreshPlan, currentInput\)/);
});

test("private delivery receive controls require a real route", () => {
  assert.match(functionBody(mainJs, "updateChatPrimaryActionMode"), /"has-private-route",\s*twoProfilePeerEndpointState\(input\)\.ready/);
  assert.doesNotMatch(functionBody(mainJs, "updateChatPrimaryActionMode"), /twoProfileInviteCodeModeActive\(\) && sessionsReady/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /!twoProfilePeerEndpointState\(input\)\.ready/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /rememberPrivateRouteFollowup\("receive", input\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /await preparePrivateDeliveryRoute\(\{ input \}\)/);
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
  const summaryBody = functionBody(mainJs, "fieldTestReportSummary");
  const compareBody = functionBody(mainJs, "fieldTestReportComparison");
  const checklistBody = functionBody(mainJs, "fieldTestChecklistItems");
  assert.match(summaryBody, /parseFieldTestReport\(report\)/);
  assert.match(compareBody, /fieldTestReportTriageState\(localReport\)/);
  assert.match(compareBody, /appVersion/);
  assert.match(compareBody, /buildChannel/);
  assert.match(compareBody, /buildCommit/);
  assert.match(functionBody(mainJs, "fieldTestBuildIdentityMatches"), /local\.appVersion === peer\.appVersion/);
  assert.match(functionBody(mainJs, "fieldTestBuildIdentityMatches"), /local\.buildChannel === peer\.buildChannel/);
  assert.match(functionBody(mainJs, "fieldTestBuildIdentityMatches"), /local\.buildCommit === peer\.buildCommit/);
  assert.match(checklistBody, /parseFieldTestReport\(report\)/);
  assert.match(checklistBody, /fieldTestChecklistBuild/);
  assert.match(checklistBody, /fieldTestBuildIdentityMatches\(report, peerReport\)/);
  assert.match(checklistBody, /fieldTestChecklistRoom/);
  assert.match(checklistBody, /fieldTestChecklistReport/);
  const nextActionBody = functionBody(mainJs, "fieldTestNextActionKey");
  assert.match(nextActionBody, /fieldTestNextBuildMismatch/);
  assert.match(nextActionBody, /fieldTestNextOpenRoom/);
  assert.match(nextActionBody, /fieldTestNextComplete/);
  assert.match(functionBody(mainJs, "renderFieldTestChecklist"), /fieldTestStatusDone/);
  assert.match(functionBody(mainJs, "renderFieldTestChecklist"), /fieldTestStatusPending/);
  assert.match(functionBody(mainJs, "renderFieldTestChecklist"), /fieldTestStatusCheck/);
  assert.match(compareBody, /fieldTestReportTriageState\(peerReport\)/);
  assert.match(compareBody, /mismatches\.push/);
  assert.match(compareBody, /reports-aligned/);
  assert.match(summaryBody, /room_list_next_action/);
  assert.match(summaryBody, /outbound_recovery_action/);
  assert.match(summaryBody, /real_onion_recovery_action/);
  assert.match(summaryBody, /real_onion_next_blocker/);
  assert.match(summaryBody, /receive_failure_kind/);
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
  assert.match(reportBody, /receive_state=/);
  assert.match(reportBody, /retryable_outbound_present=/);
  assert.match(reportBody, /outbound_failure_class=/);
  assert.match(reportBody, /outbound_recovery_action=/);
  assert.match(reportBody, /savedInviteRoomListItemView\(currentSavedRoom/);
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
  assert.match(reportBody, /redacted_boundary=/);
  assert.match(functionBody(mainJs, "runProductionTwoProfileRealOnionRoundtrip"), /productionTwoProfileRealOnionSyntheticFailureResult/);
  assert.match(functionBody(mainJs, "runProductionTwoProfileRealOnionRoundtrip"), /bootstrapRetryLimit/);
  assert.match(functionBody(mainJs, "cancelProductionTwoProfileRealOnionWait"), /latestProductionTwoProfileRealOnionWaitCanceledFingerprint/);
  assert.match(functionBody(mainJs, "cancelProductionTwoProfileRealOnionWait"), /production_two_profile_real_onion_wait_cancel/);
  assert.doesNotMatch(reportBody, /roomInviteTokenDisplay|createdInviteCodeDisplay|localPrivateRouteCode|peerPrivateRouteCode/);
  assert.doesNotMatch(reportBody, /productionTwoProfilePassphrase|productionTwoProfileMessage/);
  assert.doesNotMatch(summaryBody, /roomInviteTokenDisplay|createdInviteCodeDisplay|localPrivateRouteCode|peerPrivateRouteCode/);
  assert.doesNotMatch(summaryBody, /productionTwoProfilePassphrase|productionTwoProfileMessage/);
  assert.doesNotMatch(compareBody, /roomInviteTokenDisplay|createdInviteCodeDisplay|localPrivateRouteCode|peerPrivateRouteCode/);
  assert.doesNotMatch(compareBody, /productionTwoProfilePassphrase|productionTwoProfileMessage/);
  assert.doesNotMatch(reportBody, /room_list_code|currentRoomCode=/);
});

test("send diagnostics expose runtime owner match without raw profile names", () => {
  assert.match(mainJs, /owner_profile_bound=\$\{result\.owner_profile_bound === true\}/);
  assert.match(mainJs, /owner_matches_send=\$\{result\.owner_matches_send_profile === true\}/);
  assert.match(mainJs, /function sendRuntimeOwnerMismatch/);
  assert.match(functionBody(mainJs, "setChatDeliveryNoticeForSendAttempt"), /sendRuntimeMismatch/);
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "sendRuntimeMismatch"/);
  assert.match(mainJs, /preparePrivateDeliveryRoute\(\{ forceRefresh: true \}\)/);
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
  assert.match(followupBody, /latestTwoProfileRetryableOutboundEntry\(input\)/);
  assert.match(followupBody, /await retryTwoProfileOutboundEntry\(pending\)/);
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
  assert.match(functionBody(mainJs, "preparePrivateDeliveryRoute"), /const refreshed = await refreshProductionTwoProfilePeerEndpoints\(input\);[\s\S]*if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{[\s\S]*return;/);
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
  assert.match(functionBody(mainJs, "setChatDeliveryNoticeForSendAttempt"), /setChatDeliveryNoticeByKey\("chatNoticeSent", "success", input\)/);
  assert.match(mainJs, /function currentTwoProfileOutboundAction/);
  assert.match(functionBody(mainJs, "currentTwoProfileOutboundAction"), /options\.requireNoticeMatch === true && !chatDeliveryNoticeMatchesInput\(input\)/);
  assert.match(functionBody(mainJs, "currentTwoProfileOutboundAction"), /productionTwoProfileConversationEntries\.get\(twoProfileConversationKey\(entry\)\)/);
  assert.match(functionBody(mainJs, "currentTwoProfileOutboundAction"), /currentTwoProfileOutboundPrimaryAction\(currentEntry, input\)/);
  assert.match(mainJs, /function currentTwoProfileOutboundCancelableEntry/);
  assert.match(functionBody(mainJs, "currentTwoProfileOutboundCancelableEntry"), /outboundActionState\.canCancelNow \? currentEntry : null/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /currentTwoProfileOutboundAction\(pendingEntry, \{ requireNoticeMatch: true \}\)/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /cancel\.disabled = !outboundActionState\.canCancelNow/);
  assert.match(functionBody(mainJs, "setChatDeliveryNotice"), /currentTwoProfileOutboundCancelableEntry\(pendingEntry, \{ requireNoticeMatch: true \}\)/);

  const languageBody = functionBody(mainJs, "applyLanguage");
  assert.match(languageBody, /latestChatDeliveryNoticeKey && chatDeliveryNoticeMatchesInput\(productionTwoProfileInput\(\)\)/);
  assert.match(languageBody, /setChatDeliveryNoticeByKey\("", "neutral"\)/);

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
  assert.doesNotMatch(intentSource, /twoProfileInviteCodeModeActive/);
  assert.match(intentSource, /enable-private-delivery/);
  assert.match(intentSource, /prepare-private-route/);
  assert.doesNotMatch(functionBody(mainJs, "runProductionTwoProfileMessageRoundtrip"), /invokeInviteRoomMessageSend/);
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
  assert.match(functionBody(mainJs, "latestTwoProfileOutboundDeliveryCandidate"), /targetRequested \? null : latestTwoProfileRetryableOutboundEntry\(input\)/);
  assert.match(functionBody(mainJs, "latestTwoProfileOutboundDeliveryCandidate"), /targetRequested && Number\.parseInt\(latest\.messageNumber, 10\) !== targetMessageNumber/);
  assert.match(sendBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(sendBody, /await loadProductionTwoProfileTranscript\(\{ quiet: true, refreshSessionStatus: false, input \}\)/);
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
  assert.match(retryBody, /await sendProductionTwoProfileLatestOnionEnvelope\(input, \{ messageNumber: entry\.messageNumber \}\)/);
  assert.match(retryBody, /await loadProductionTwoProfileTranscript\(\{ quiet: true, refreshSessionStatus: true, input \}\)/);
  assert.match(retryBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(retryBody, /setChatDeliveryNoticeByKey\("sendRetrying", "progress", input\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /currentTwoProfileOutboundAction\(entry\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /runTwoProfileOutboundPrimaryAction\(current\.entry, current\.primaryAction\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /cancel\.disabled = !outboundActionState\.canCancelNow/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /currentTwoProfileOutboundCancelableEntry\(entry\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /cancelTwoProfileOutboundEntry\(currentEntry\)/);

  const refreshRetryBody = functionBody(mainJs, "refreshTwoProfileOutboundEndpointThenRetry");
  assert.match(refreshRetryBody, /await prepareInviteRoomPrivateRouteExchange\(input\)/);
  assert.match(refreshRetryBody, /await refreshProductionTwoProfilePeerEndpoints\(input\)/);
  assert.match(refreshRetryBody, /await loadProductionTwoProfileTranscript\(\{ quiet: true, refreshSessionStatus: true, input \}\)/);
  assert.match(refreshRetryBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(refreshRetryBody, /twoProfilePeerEndpointState\(input\)\.ready/);

  const cancelBody = functionBody(mainJs, "cancelTwoProfileOutboundEntry");
  assert.match(cancelBody, /production_message_outbound_cancel_pending/);
  assert.match(cancelBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(cancelBody, /setSelectedTwoProfileConversationEntry\(null\)/);
  assert.match(cancelBody, /await loadProductionTwoProfileTranscript\(\{ quiet: true, refreshSessionStatus: false, input \}\)/);
  assert.match(cancelBody, /showLatestRetryableOutboundNotice\(input\)/);
  assert.match(cancelBody, /setChatDeliveryNoticeByKey\("sendCanceling", "progress", input\)/);

  const composerBody = functionBody(mainJs, "runProductionTwoProfileMessageRoundtrip");
  assert.match(composerBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(composerBody, /stillCurrent/);
  assert.match(composerBody, /if \(!stillCurrent \|\| !twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(composerBody, /completeInviteRoomOutboundDelivery\(input, messageNumber\)/);
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
  assert.match(
    functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction"),
    /rememberPrivateRouteFollowup\(input\.message \? "send-draft" : "receive", input\);[\s\S]*enablePrivateDeliveryPermission\(\)/,
  );
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
  assert.match(composerBody, /enablePrivateDeliveryPermission\(\)/);
  assert.match(composerBody, /rememberPrivateRouteFollowup\(input\.message \? "send-draft" : "receive", input\)/);
  assert.match(composerBody, /await preparePrivateDeliveryRoute\(\{ input \}\)/);
  assert.match(composerBody, /focusSafetyConfirmation\(\)/);
  assert.match(composerBody, /await runProductionTwoProfileMessageRoundtrip\(\)/);
  assert.doesNotMatch(composerBody, /openChatSettingsPanel|openPrivateDeliverySettings/);

  const prepareRouteBody = functionBody(mainJs, "preparePrivateDeliveryRoute");
  assert.match(prepareRouteBody, /const input = options\.input \?\? productionTwoProfileInput\(\)/);
  assert.match(prepareRouteBody, /await refreshProductionTwoProfilePeerEndpoints\(input\)/);

  const permissionBody = functionBody(mainJs, "enablePrivateDeliveryPermission");
  assert.match(permissionBody, /setManualNetworkPermission\(true\)/);
  assert.match(permissionBody, /fields\.preparePrivateRoute\?\.focus/);
  assert.doesNotMatch(permissionBody, /openChatSettingsPanel|openPrivateDeliverySettings/);
});

test("dark chat palette does not use gold or yellow warning colors", () => {
  assert.doesNotMatch(stylesCss, /#b8a46f|#746842|\bgold\b|\byellow\b/i);
});
