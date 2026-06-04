import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const mainJs = readFileSync(join(here, "main.js"), "utf8");
const i18nJs = readFileSync(join(here, "i18n.js"), "utf8");
const stylesCss = readFileSync(join(here, "styles.css"), "utf8");

function functionBody(source, name) {
  const index = source.indexOf(`function ${name}(`);
  assert.notEqual(index, -1, `missing function ${name}`);
  const brace = source.indexOf("{", source.indexOf(")", index));
  let depth = 0;
  for (let cursor = brace; cursor < source.length; cursor += 1) {
    if (source[cursor] === "{") depth += 1;
    if (source[cursor] === "}") depth -= 1;
    if (depth === 0) return source.slice(brace + 1, cursor);
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
  assert.match(indexHtml, /id="back-to-room-list"/);
  assert.match(stylesCss, /body\.is-room-list-mode [\s\S]*#production-two-profile-transcript/);
  assert.match(stylesCss, /body\.is-room-detail-mode \.room-list-panel/);
  assert.match(stylesCss, /body\.is-room-detail-mode\.is-chat-active \.room-list-back/);
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
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /roomStateRetrySend/);
  assert.match(functionBody(mainJs, "savedInviteRoomState"), /roomStateWaitingPeerCode/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /needs-receive-restart/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /savedInviteRoomListItemView\(room, \{ currentCode, resumeRoom \}\)/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /is-waiting-peer-code/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /has-retryable-send/);
  assert.match(functionBody(mainJs, "renderSavedInviteRooms"), /is-resume-recommended/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /renderSavedInviteRooms\(\)/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /renderSavedInviteRooms\(\)/);
  assert.match(stylesCss, /\.saved-room-state\.is-listening/);
  assert.match(stylesCss, /\.saved-room-state\.is-receive-paused/);
  assert.match(stylesCss, /\.saved-room-state\.is-waiting-peer-code/);
  assert.match(stylesCss, /\.saved-room-state\.is-retry-send/);
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
  const actionBody = functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction");
  assert.match(actionBody, /intent\.action === "start-receiving"/);
  assert.match(actionBody, /await startProductionTwoProfileOnionReceive\(\)/);
  assert.match(actionBody, /input\.message \? "send-draft" : "receive"/);
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
  assert.match(functionBody(mainJs, "runSavedInviteRoomListAction"), /focusPrivateRouteNextAction\(productionTwoProfileInput\(\)\)/);
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
  assert.match(functionBody(mainJs, "forgetInviteRoom"), /for \(const roomKey of privateRouteRoomKeys\(roomInput\)\)/);
  assert.match(mainJs, /function clearPrivateRouteFollowupForRoom/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceiveForInput"), /silentStop: silent/);
  assert.match(functionBody(mainJs, "pollProductionTwoProfileOnionReceiveStopConfirmation"), /silentStop === true/);
  assert.match(functionBody(mainJs, "stopProductionTwoProfileOnionReceive"), /stopProductionTwoProfileOnionReceiveForInput\(productionTwoProfileInput\(\)\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileTranscriptEntries"), /resetProductionTwoProfileTranscript/);
  assert.match(functionBody(mainJs, "resetProductionTwoProfileTranscript"), /productionTwoProfileConversationEntries\.clear\(\)/);
  assert.match(functionBody(mainJs, "renderProductionTwoProfileConversationList"), /rememberCurrentInviteRoomMetadata\(\)/);
  assert.match(mainJs, /function reconcileCurrentInviteRoomMetadataFromTranscriptEntries/);
  assert.match(functionBody(mainJs, "reconcileCurrentInviteRoomMetadataFromTranscriptEntries"), /productionInviteRoomConversationMetadata\(entries \?\? \[\]\)/);
});

test("room transcript refresh is scoped to the current room", () => {
  assert.match(mainJs, /let inviteRoomTranscriptRefreshInFlight = false/);
  assert.match(functionBody(mainJs, "startInviteRoomTranscriptRefresh"), /inviteRoomTranscriptRefreshInFlight/);
  assert.match(functionBody(mainJs, "startInviteRoomTranscriptRefresh"), /finally/);
  assert.match(mainJs, /function twoProfileTranscriptInputStillCurrent/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /transcriptInput/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /twoProfileTranscriptInputStillCurrent\(transcriptInput\)/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /invokeInviteRoomSessionStatus/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /reconcileCurrentInviteRoomMetadataFromTranscriptEntries\(entries\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /const sessionCheckInput = \{ profileA, profileB, passphrase \}/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /twoProfileTranscriptInputStillCurrent\(sessionCheckInput\)/);
  assert.match(functionBody(mainJs, "checkProductionTwoProfileSessionStatus"), /rememberTwoProfileSessionStatus\(sessionCheckInput, result\)/);
});

test("conversation selection keys are scoped to the active invite room", () => {
  assert.match(functionBody(mainJs, "twoProfileConversationKey"), /entry\.roomFingerprint \?\? twoProfileSessionStatusFingerprint\(productionTwoProfileInput\(\)\)/);
  assert.match(functionBody(mainJs, "appendProductionTwoProfileConversationStatus"), /roomFingerprint: twoProfileSessionStatusFingerprint\(productionTwoProfileInput\(\)\)/);
  assert.match(functionBody(mainJs, "selectTwoProfileConversationMessage"), /roomFingerprint: twoProfileSessionStatusFingerprint\(productionTwoProfileInput\(\)\)/);
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
  assert.match(functionBody(mainJs, "runProductionTwoProfileRealOnionRoundtrip"), /latestRealOnionFieldTestResult\(\{ profileA, profileB, passphrase \}\)/);
  assert.match(functionBody(mainJs, "loadProductionTwoProfileTranscript"), /latestTwoProfileSessionStatusForCurrentInput\(\{ profileA, profileB, passphrase \}\)/);
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

  assert.match(functionBody(mainJs, "openInviteRoomFromToken"), /clearProductionBusyAction\("invite-room-open"\)/);
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
  assert.match(unlockRefreshBody, /await loadProductionTwoProfileTranscript\(\{[\s\S]*autoResume: true/);
  assert.match(unlockRefreshBody, /rememberTwoProfileSessionStatus\(input, result\)/);

  const importBody = functionBody(mainJs, "importProductionMessageEnvelope");
  assert.match(importBody, /const twoProfileRefreshInput = productionTwoProfileInput\(\)/);
  assert.match(importBody, /refreshTwoProfileConversationAfterManualImport\([\s\S]*twoProfileRefreshInput/);

  const importRefreshBody = functionBody(mainJs, "refreshTwoProfileConversationAfterManualImport");
  assert.match(mainJs, /async function refreshTwoProfileConversationAfterManualImport\([\s\S]*input = productionTwoProfileInput\(\),[\s\S]*\)/);
  assert.match(importRefreshBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);
  assert.match(importRefreshBody, /await loadProductionTwoProfileTranscript\(\{ quiet: true, refreshSessionStatus: false \}\)/);
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
  assert.match(functionBody(mainJs, "activeMessageEnvelopeSlotReady"), /messageEnvelopeSlotMatchesEntry\(slot, entry\)/);

  const loadBody = functionBody(mainJs, "loadProductionMessageEnvelope");
  assert.match(loadBody, /pendingMessageEnvelopeSlotForActiveProfile\(profile\)/);
  assert.match(loadBody, /if \(!entry\)/);
  assert.match(loadBody, /value && !messageEnvelopeSlotMatchesEntry\(slot, entry\)/);
  assert.match(functionBody(mainJs, "applyProductionActionState"), /activeMessageEnvelopeSlotReady\(activeProductionProfileName\(\)\)/);
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
  assert.match(endpointBody, /production_onion_service_launch_attempt/);
  assert.match(endpointBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(endpointBody, /applyProductionPairingPayloadExportResult/);

  const pairingBody = functionBody(mainJs, "prepareProductionTwoProfileOnionPairing");
  assert.match(pairingBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(pairingBody, /launchAndExport\(profileA\)/);
  assert.match(pairingBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);

  const saveBody = functionBody(mainJs, "saveProductionTwoProfileOnionSessions");
  assert.match(saveBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(saveBody, /production_two_profile_session_status/);
  assert.match(saveBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);

  const refreshBody = functionBody(mainJs, "refreshProductionTwoProfilePeerEndpoints");
  assert.match(refreshBody, /const input = productionTwoProfileInput\(\)/);
  assert.match(refreshBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return false;\s*\}/);

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
  assert.match(functionBody(mainJs, "refreshCurrentRoomAfterReceiveImport"), /rememberCurrentInviteRoomMetadata\(\)/);
  assert.match(functionBody(mainJs, "refreshCurrentRoomAfterReceiveImport"), /renderSavedInviteRooms\(\)/);
  assert.match(functionBody(mainJs, "refreshCurrentRoomAfterReceiveImport"), /renderRoomStatusSummary\(input, sessionsReady\)/);
  assert.match(functionBody(mainJs, "refreshCurrentRoomAfterReceiveImport"), /renderProductionTwoProfileMemory\(input\)/);
  assert.match(functionBody(mainJs, "pollProductionTwoProfileOnionReceiveLoopStatus"), /refreshCurrentRoomAfterReceiveImport\(refreshPlan\)/);
  assert.match(functionBody(mainJs, "pollProductionTwoProfileOnionReceiveLoopStatus"), /const receivingCurrentRoom = productionTwoProfileReceiveMatchesInput\(currentInput\)/);
  assert.match(functionBody(mainJs, "pollProductionTwoProfileOnionReceiveLoopStatus"), /rememberProductionTwoProfileOnionReceiveRuntimeState\(runtimeState, runtimeResult\)/);
  assert.match(
    functionBody(mainJs, "pollProductionTwoProfileOnionReceiveLoopStatus"),
    /if \(!receivingCurrentRoom\) \{[\s\S]*renderSavedInviteRooms\(\);[\s\S]*\} else \{[\s\S]*await loadProductionTwoProfileTranscript/,
  );
});

test("private delivery receive controls require a real route", () => {
  assert.match(functionBody(mainJs, "updateChatPrimaryActionMode"), /"has-private-route",\s*twoProfilePeerEndpointState\(input\)\.ready/);
  assert.doesNotMatch(functionBody(mainJs, "updateChatPrimaryActionMode"), /twoProfileInviteCodeModeActive\(\) && sessionsReady/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /!twoProfilePeerEndpointState\(input\)\.ready/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /rememberPrivateRouteFollowup\("receive", input\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /await preparePrivateDeliveryRoute\(\)/);
  assert.doesNotMatch(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /!latestLocalPrivateRouteCode/);
  assert.match(stylesCss, /body\.is-chat-active\.has-confirmed-safety:not\(\.has-message-draft\) \.room-receive-controls/);
  assert.match(stylesCss, /body\.is-chat-active:not\(\.has-private-route\)[\s\S]*#start-production-two-profile-onion-receive/);
});

test("field test report is redacted and copyable from room diagnostics", () => {
  for (const id of [
    "field-test-report",
    "refresh-field-test-report",
    "copy-field-test-report",
    "cancel-production-two-profile-real-onion-wait",
  ]) {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  }
  assert.match(mainJs, /function buildFieldTestReport/);
  assert.match(mainJs, /function copyFieldTestReport/);
  assert.match(mainJs, /function productionTwoProfileRealOnionSyntheticFailureResult/);
  assert.match(stylesCss, /\.field-test-report-panel/);
  assert.match(i18nJs, /fieldTestReport/);
  assert.match(i18nJs, /현장 테스트 리포트/);

  const reportBody = functionBody(mainJs, "buildFieldTestReport");
  assert.match(reportBody, /route_ready=/);
  assert.match(reportBody, /receive_state=/);
  assert.match(reportBody, /retryable_outbound_present=/);
  assert.match(reportBody, /outbound_failure_class=/);
  assert.match(reportBody, /outbound_recovery_action=/);
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
  assert.match(functionBody(mainJs, "prepareInviteRoomPrivateRouteExchange"), /twoProfileTranscriptInputStillCurrent\(input\)/);
  assert.match(functionBody(mainJs, "prepareInviteRoomPrivateRouteExchange"), /rememberLocalPrivateRouteCode\(result\.local_onion_endpoint, input, \{ updateUi: false \}\)/);
  assert.match(functionBody(mainJs, "preparePrivateDeliveryRoute"), /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
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
  assert.match(functionBody(mainJs, "setChatDeliveryNoticeByKey"), /latestChatDeliveryNoticeRoomFingerprint = key \? chatDeliveryNoticeRoomFingerprint\(\) : ""/);
  assert.match(functionBody(mainJs, "setChatDeliveryNoticeForPendingOutbound"), /latestChatDeliveryNoticeRoomFingerprint = chatDeliveryNoticeRoomFingerprint\(input\)/);

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
  assert.match(completeBody, /sendProductionTwoProfileLatestOnionEnvelope\(onionInput\)/);

  const sendBody = functionBody(mainJs, "sendProductionTwoProfileLatestOnionEnvelope");
  assert.match(mainJs, /async function sendProductionTwoProfileLatestOnionEnvelope\(input = productionTwoProfileInput\(\)\)/);
  assert.match(sendBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(sendBody, /await loadProductionTwoProfileTranscript\(\{ quiet: true, refreshSessionStatus: false \}\)/);

  const retryBody = functionBody(mainJs, "retryTwoProfileOutboundEntry");
  assert.match(retryBody, /await sendProductionTwoProfileLatestOnionEnvelope\(\)/);
  assert.match(retryBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);

  const refreshRetryBody = functionBody(mainJs, "refreshTwoProfileOutboundEndpointThenRetry");
  assert.match(refreshRetryBody, /await prepareInviteRoomPrivateRouteExchange\(input\)/);
  assert.match(refreshRetryBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);
  assert.match(refreshRetryBody, /twoProfilePeerEndpointState\(input\)\.ready/);

  const cancelBody = functionBody(mainJs, "cancelTwoProfileOutboundEntry");
  assert.match(cancelBody, /production_message_outbound_cancel_pending/);
  assert.match(cancelBody, /if \(!twoProfileTranscriptInputStillCurrent\(input\)\) \{\s*return;\s*\}/);

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
  assert.match(runBody, /activeProductionTwoProfileRealOnionInput = \{ profileA, profileB, passphrase, runId: realOnionRunId \}/);
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
  assert.match(functionBody(mainJs, "runProductionTwoProfileComposerPrimaryAction"), /enablePrivateDeliveryPermission\(\)/);
  assert.match(functionBody(mainJs, "ensurePrivateDeliveryRuntimeReady"), /production_onion_persistent_client_start/);
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
  assert.match(composerBody, /await preparePrivateDeliveryRoute\(\)/);
  assert.match(composerBody, /focusSafetyConfirmation\(\)/);
  assert.match(composerBody, /await runProductionTwoProfileMessageRoundtrip\(\)/);
  assert.doesNotMatch(composerBody, /openChatSettingsPanel|openPrivateDeliverySettings/);

  const permissionBody = functionBody(mainJs, "enablePrivateDeliveryPermission");
  assert.match(permissionBody, /setManualNetworkPermission\(true\)/);
  assert.match(permissionBody, /fields\.preparePrivateRoute\?\.focus/);
  assert.doesNotMatch(permissionBody, /openChatSettingsPanel|openPrivateDeliverySettings/);
});

test("dark chat palette does not use gold or yellow warning colors", () => {
  assert.doesNotMatch(stylesCss, /#b8a46f|#746842|\bgold\b|\byellow\b/i);
});
