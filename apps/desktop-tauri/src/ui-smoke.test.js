import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const i18nJs = readFileSync(join(here, "i18n.js"), "utf8");
const mainJs = readFileSync(join(here, "main.js"), "utf8");
const stylesCss = readFileSync(join(here, "styles.css"), "utf8");

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  const asyncStart = source.indexOf(`async function ${name}(`);
  const index = asyncStart >= 0 && (start < 0 || asyncStart < start) ? asyncStart : start;
  assert.notEqual(index, -1, `missing function ${name}`);
  const paramsStart = source.indexOf("(", index);
  assert.notEqual(paramsStart, -1, `missing function params ${name}`);
  let parenDepth = 0;
  let paramsEnd = -1;
  for (let cursor = paramsStart; cursor < source.length; cursor += 1) {
    if (source[cursor] === "(") {
      parenDepth += 1;
    } else if (source[cursor] === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        paramsEnd = cursor;
        break;
      }
    }
  }
  assert.notEqual(paramsEnd, -1, `unterminated function params ${name}`);
  const brace = source.indexOf("{", paramsEnd);
  assert.notEqual(brace, -1, `missing function body ${name}`);
  let depth = 0;
  for (let cursor = brace; cursor < source.length; cursor += 1) {
    if (source[cursor] === "{") {
      depth += 1;
    } else if (source[cursor] === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(brace + 1, cursor);
      }
    }
  }
  assert.fail(`unterminated function ${name}`);
}

test("invite code creation is available from empty state and settings", () => {
  assert.match(indexHtml, /id="create-invite-code"/);
  assert.match(indexHtml, /id="create-invite-code-settings"/);
  assert.match(mainJs, /createInviteCodeSettings:\s*document\.querySelector\("#create-invite-code-settings"\)/);
  assert.match(mainJs, /fields\.createInviteCodeSettings\.addEventListener\("click",\s*createInviteCode\)/);
});

test("empty connection state stays minimal and action-first", () => {
  assert.match(indexHtml, /class="chat-empty-state"/);
  assert.match(indexHtml, /id="create-invite-code"/);
  assert.match(indexHtml, /id="received-invite-code"/);
  assert.match(indexHtml, /id="create-room-from-received-code"/);
  assert.match(stylesCss, /\.chat-empty-state[\s\S]{0,180}background:\s*transparent/);
  assert.match(stylesCss, /\.connection-choice-card span,[\s\S]{0,80}display:\s*none/);
  assert.match(stylesCss, /\.connection-choice-card \.received-code-label[\s\S]{0,120}clip:\s*rect\(0 0 0 0\)/);
  assert.match(i18nJs, /peerExchangeHint: "Create a code, or paste one\."/);
  assert.match(i18nJs, /peerExchangeHint: "코드를 만들거나, 받은 코드를 붙여넣으세요\."/);
});

test("created invite code has a visible read-only display before room creation", () => {
  assert.match(indexHtml, /id="pending-invite-code-display"/);
  assert.match(indexHtml, /id="current-invite-code-summary"/);
  assert.match(indexHtml, /id="current-invite-code-text"/);
  assert.match(indexHtml, /class="invite-code-display"/);
  assert.match(indexHtml, /readonly/);
  assert.match(mainJs, /pendingInviteCodeDisplay:\s*document\.querySelector\("#pending-invite-code-display"\)/);
  assert.match(mainJs, /currentInviteCodeSummary:\s*document\.querySelector\("#current-invite-code-summary"\)/);
  assert.match(mainJs, /currentInviteCodeText:\s*document\.querySelector\("#current-invite-code-text"\)/);
  assert.match(mainJs, /function renderCurrentInviteCodeDisplay\(\)/);
  assert.match(mainJs, /fields\.pendingInviteCodeDisplay\.value = code/);
  assert.match(mainJs, /fields\.currentInviteCodeText\.textContent = code/);
  assert.match(mainJs, /fields\.pendingInviteCodeDisplay\?\.scrollIntoView/);
  assert.match(mainJs, /fields\.pendingInviteCodeDisplay\?\.select/);
  assert.match(mainJs, /function focusCurrentInviteCodeDisplay\(\)/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("inviteCodeReadyNotice", "success"\)/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("receivedInviteCodeReadyNotice", "success"\)/);
  assert.match(mainJs, /closeChatSettingsPanel\(\)/);
  assert.match(stylesCss, /\.connection-pending-state \.invite-code-display/);
  assert.match(stylesCss, /body\.has-connection-code:not\(\.has-ready-session\) \.connection-pending-state/);
  assert.match(stylesCss, /\.current-invite-code-summary/);
});

test("connection-code ready state prepares only this device as the next action", () => {
  assert.match(indexHtml, /id="create-room-from-invite-code"/);
  assert.match(indexHtml, /class="room-setup-progress"/);
  assert.match(indexHtml, /id="room-setup-step-invite"/);
  assert.match(indexHtml, /id="room-setup-step-setup"/);
  assert.match(indexHtml, /id="room-setup-step-verify"/);
  assert.match(indexHtml, /id="room-setup-step-route"/);
  assert.match(indexHtml, /id="room-setup-step-chat"/);
  assert.match(indexHtml, /id="local-invite-setup-code"/);
  assert.match(indexHtml, /id="copy-local-invite-setup-code"/);
  assert.match(indexHtml, /id="peer-invite-setup-code"/);
  assert.match(indexHtml, /id="use-peer-invite-setup-code"/);
  assert.match(indexHtml, /id="local-invite-session-code"/);
  assert.match(indexHtml, /id="copy-local-invite-session-code"/);
  assert.match(indexHtml, /id="peer-invite-session-code"/);
  assert.match(indexHtml, /id="use-peer-invite-session-code"/);
  assert.match(indexHtml, /class="connection-pending-actions"/);
  assert.match(mainJs, /createRoomFromInviteCode:\s*document\.querySelector\("#create-room-from-invite-code"\)/);
  assert.match(mainJs, /roomSetupStepInvite:\s*document\.querySelector\("#room-setup-step-invite"\)/);
  assert.match(mainJs, /function renderRoomSetupProgress/);
  assert.match(mainJs, /renderRoomSetupProgress\(twoProfile, twoProfileSessionsReady\)/);
  assert.match(mainJs, /async function prepareInviteRoomLocalSetup\(\)/);
  assert.match(mainJs, /fields\.createRoomFromInviteCode\.addEventListener\("click",\s*prepareInviteRoomLocalSetup\)/);
  assert.match(mainJs, /production_profile_unlock/);
  assert.match(mainJs, /production_pairing_payload_export/);
  assert.match(mainJs, /rememberLocalInviteSetupCode\(setup\.pairing_payload\)/);
  assert.match(mainJs, /async function usePeerInviteSetupCode\(\)/);
  assert.match(mainJs, /production_pairing_safety_preview/);
  assert.match(mainJs, /async function saveInviteSessionDraftAfterSafetyConfirm/);
  assert.match(mainJs, /production_pairing_session_draft_save/);
  assert.match(mainJs, /production_handshake_init_export/);
  assert.match(mainJs, /rememberLocalInviteSessionCode\(init\.output_payload\)/);
  assert.match(mainJs, /async function usePeerInviteSessionCode\(\)/);
  assert.match(mainJs, /production_handshake_reply_export/);
  assert.match(mainJs, /production_handshake_finish_export/);
  assert.match(mainJs, /production_handshake_finish_import/);
  assert.match(mainJs, /production_session_state_check/);
  assert.match(mainJs, /inviteLocalReadyStatusResult/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("localInviteSessionCodeReady", "success"\)/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("localInviteSessionReplyCodeReady", "success"\)/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("localInviteSessionFinishCodeReady", "success"\)/);
  assert.match(mainJs, /fields\.usePeerInviteSetupCode\.addEventListener\("click",\s*usePeerInviteSetupCode\)/);
  assert.match(mainJs, /fields\.copyLocalInviteSessionCode\.addEventListener\("click",\s*copyLocalInviteSessionCode\)/);
  assert.match(mainJs, /fields\.usePeerInviteSessionCode\.addEventListener\("click",\s*usePeerInviteSessionCode\)/);
  assert.match(mainJs, /inviteSetupExchangeMatchesCurrent\(input\)/);
  assert.match(mainJs, /setActionButtonState\(\s*fields\.createRoomFromInviteCode/);
  assert.match(mainJs, /setActionButtonState\(\s*fields\.usePeerInviteSetupCode/);
  assert.match(mainJs, /setActionButtonState\(\s*fields\.copyLocalInviteSessionCode/);
  assert.match(mainJs, /setActionButtonState\(\s*fields\.usePeerInviteSessionCode/);
  assert.match(mainJs, /setText\(\s*fields\.createRoomFromInviteCode,\s*t\("prepareThisDevice"\)/);
  assert.match(stylesCss, /#create-room-from-invite-code/);
  assert.match(stylesCss, /\.room-setup-progress[\s\S]{0,80}display:\s*none/);
  assert.match(stylesCss, /body\.has-connection-code:not\(\.has-ready-session\) \.connection-pending-state > h4/);
  assert.match(stylesCss, /#connection-exchange-instruction[\s\S]{0,160}display:\s*block/);
  assert.match(
    stylesCss,
    /body\.is-chat-empty\.has-connection-code:not\(\.has-ready-session\) \.connection-pending-state[\s\S]{0,240}background:\s*transparent/,
  );
  assert.match(stylesCss, /body\.has-ready-session\.needs-safety-confirmation \.connection-pending-state/);
  assert.match(stylesCss, /\.peer-invite-setup-code/);
  assert.match(stylesCss, /\.local-invite-session-code/);
  assert.match(stylesCss, /\.peer-invite-session-code/);
});

test("invite flow copy does not regress to create-room or same-code wording", () => {
  assert.doesNotMatch(indexHtml, /Use this same code|Both devices use the same code|Create room/);
  assert.doesNotMatch(indexHtml, /Use the same invite code|same code/);
  assert.doesNotMatch(mainJs, /Use the same invite code|same code/);
  assert.doesNotMatch(mainJs, /Ready to create room|Create the room|create the room|채팅방을 만든|채팅방 만들기 가능/);
  assert.doesNotMatch(mainJs, /setText\(\s*fields\.runProductionTwoProfileRoundtrip,\s*t\("runTwoProfileRoundtrip"\)/);
  assert.match(indexHtml, /Prepare this device/);
  assert.match(mainJs, /setText\(\s*fields\.runProductionTwoProfileRoundtrip,\s*twoProfileNeedsSessionCheck \? t\("roomActionResume"\) : t\("prepareThisDevice"\)/);
  assert.equal(indexHtml.includes("same code"), false);
});

test("default invite setup copy stays user-facing and avoids developer terms", () => {
  const modalStart = indexHtml.indexOf('class="connection-modal-copy"');
  const modalEnd = indexHtml.indexOf('<div class="chat-setup-controls connection-setup-actions">');
  assert.notEqual(modalStart, -1, "missing connection modal copy");
  assert.notEqual(modalEnd, -1, "missing connection setup actions");
  const inviteModal = indexHtml.slice(modalStart, modalEnd);
  const visibleInviteModalCopy = inviteModal.replace(/<[^>]+>/g, " ");

  assert.doesNotMatch(
    visibleInviteModalCopy,
    /Profile|profile|Developer|developer|passphrase|transport|endpoint|payload|boundary|프로필|개발자|패스프레이즈|전송 경로|엔드포인트|페이로드|경계/i,
  );
  assert.doesNotMatch(
    `${indexHtml}\n${i18nJs}`,
    /setup code|session code|route code|설정 코드|세션 코드|경로 코드|전송 경로 코드/i,
  );
  assert.match(i18nJs, /My connection code/);
  assert.match(i18nJs, /Their connection code/);
  assert.match(i18nJs, /My delivery code/);
  assert.match(i18nJs, /상대 연결 코드/);
  assert.match(i18nJs, /상대 전송 코드/);
  assert.doesNotMatch(i18nJs, /peer profile|private profile|device profile|상대의 개인 프로필|이 기기 프로필/i);
  assert.match(i18nJs, /Preparing this device\. No peer identity is created here\./);
  assert.match(i18nJs, /이 기기를 준비하는 중입니다\. 여기서는 상대 기기의 정보를 만들지 않습니다\./);
});

test("invite setup screen shows one exchange stage at a time", () => {
  const setupStage = stylesCss.slice(stylesCss.indexOf("#pending-invite-code-display"));
  assert.match(setupStage, /has-local-invite-setup-code/);
  assert.match(setupStage, /#pending-invite-code-display/);
  assert.match(setupStage, /#copy-pending-invite-code/);
  assert.match(setupStage, /#create-room-from-invite-code/);
  assert.match(setupStage, /display:\s*none/);
  assert.match(mainJs, /has-invite-session-stage/);
  assert.match(mainJs, /latestLocalInviteSessionCode \|\| \(setupSafetyReady && safetyConfirmed\)/);
  assert.match(stylesCss, /has-invite-session-stage:not\(\.has-ready-session\)[\s\S]{0,120}\.peer-invite-session-label/);

  const sessionStage = stylesCss.slice(stylesCss.indexOf(".local-invite-setup-label"));
  assert.match(sessionStage, /has-local-invite-session-code/);
  assert.match(sessionStage, /\.local-invite-setup-label/);
  assert.match(sessionStage, /\.peer-invite-setup-code/);
  assert.match(sessionStage, /#use-peer-invite-setup-code/);
  assert.match(sessionStage, /display:\s*none/);

  const compactLabels = stylesCss.slice(stylesCss.lastIndexOf(".local-invite-setup-label,"));
  assert.match(compactLabels, /has-local-invite-setup-code:not\(\.has-ready-session\)/);
  assert.match(compactLabels, /\.local-invite-setup-label/);
  assert.match(compactLabels, /has-invite-session-stage:not\(\.has-ready-session\)/);
  assert.match(compactLabels, /\.peer-invite-session-label/);
  assert.match(compactLabels, /clip:\s*rect\(0 0 0 0\)/);
  assert.match(stylesCss, /\.peer-invite-session-code\s*\{[\s\S]{0,100}min-height:\s*58px/);
});

test("invite setup highlights only the next user action", () => {
  assert.match(mainJs, /function setFlowActionPriority/);
  assert.match(mainJs, /function inviteSetupPrimaryActionNode/);
  assert.match(functionBody(mainJs, "inviteSetupPrimaryActionNode"), /twoProfileSessionsReadyForInput\(\)/);
  assert.doesNotMatch(functionBody(mainJs, "inviteSetupPrimaryActionNode"), /session_ready/);
  assert.match(functionBody(mainJs, "copyCurrentInviteCode"), /fields\.createRoomFromInviteCode\.focus\(\)/);
  assert.match(functionBody(mainJs, "createRoomFromReceivedInviteCode"), /fields\.createRoomFromInviteCode\.focus\(\)/);
  assert.match(functionBody(mainJs, "copyLocalInviteSetupCode"), /fields\.peerInviteSetupCode\?\.focus\(\)/);
  assert.match(functionBody(mainJs, "copyLocalInviteSessionCode"), /fields\.peerInviteSessionCode\?\.focus\(\)/);
  assert.match(indexHtml, /id="connection-exchange-instruction"/);
  assert.match(mainJs, /connectionExchangeInstruction:\s*document\.querySelector\("#connection-exchange-instruction"\)/);
  assert.match(mainJs, /function renderConnectionExchangeInstruction/);
  assert.match(mainJs, /exchangeInstructionInvite/);
  assert.match(mainJs, /exchangeInstructionSetupShare/);
  assert.match(mainJs, /exchangeInstructionSetupUse/);
  assert.match(mainJs, /exchangeInstructionSessionShare/);
  assert.match(mainJs, /exchangeInstructionSessionUse/);
  assert.match(mainJs, /latestLocalInviteSetupCode[\s\S]{0,160}fields\.createRoomFromInviteCode/);
  assert.match(mainJs, /peerInviteSetupCode\?\.value[\s\S]{0,120}fields\.usePeerInviteSetupCode/);
  assert.match(mainJs, /peerInviteSessionCode\?\.value[\s\S]{0,120}fields\.usePeerInviteSessionCode/);
  assert.match(mainJs, /setFlowActionPriority\(inviteSetupPrimaryActionNode\(\)/);
  assert.match(stylesCss, /\.connection-pending-state button\.is-primary-flow-action/);
  assert.match(stylesCss, /\.connection-pending-state button\.is-secondary-flow-action/);
  assert.match(stylesCss, /\.exchange-instruction/);
  assert.match(i18nJs, /내 코드를 복사하고, 상대 코드를 붙여넣으세요/);
  assert.match(i18nJs, /상대 코드를 사용하세요/);
});

test("invite setup flow stays isolated and waits for explicit verification", () => {
  const localSetup = functionBody(mainJs, "prepareInviteRoomLocalSetup");
  assert.match(localSetup, /production_profile_unlock/);
  assert.match(localSetup, /production_pairing_payload_export/);
  assert.match(localSetup, /rememberLocalInviteSetupCode\(setup\.pairing_payload\)/);
  assert.doesNotMatch(localSetup, /production_pairing_session_draft_save/);
  assert.doesNotMatch(localSetup, /production_handshake_/);
  assert.doesNotMatch(localSetup, /production_invite_room_setup/);
  assert.doesNotMatch(localSetup, /production_two_profile_roundtrip/);

  const peerSetup = functionBody(mainJs, "usePeerInviteSetupCode");
  assert.match(peerSetup, /production_pairing_safety_preview/);
  assert.match(peerSetup, /latestInviteSetupExchange = \{/);
  assert.match(peerSetup, /rememberTwoProfileSafety\(input,\s*safety\)/);
  assert.match(peerSetup, /focusSafetyConfirmation\(\)/);
  assert.doesNotMatch(peerSetup, /production_pairing_session_draft_save/);
  assert.doesNotMatch(peerSetup, /production_handshake_/);

  const confirmSafety = functionBody(mainJs, "confirmCurrentTwoProfileSafety");
  assert.match(confirmSafety, /inviteSetupExchangeMatchesCurrent\(input\)/);
  assert.match(confirmSafety, /saveInviteSessionDraftAfterSafetyConfirm\(input\)/);
});

test("invite connection code flow handles init reply finish and marks local ready", () => {
  const draft = functionBody(mainJs, "saveInviteSessionDraftAfterSafetyConfirm");
  assert.match(draft, /production_pairing_session_draft_save/);
  assert.match(draft, /safetyConfirmed:\s*true/);
  assert.match(draft, /production_handshake_init_export/);
  assert.match(draft, /rememberLocalInviteSessionCode\(init\.output_payload\)/);
  assert.doesNotMatch(draft, /production_handshake_reply_export/);
  assert.doesNotMatch(draft, /production_handshake_finish_export/);
  assert.doesNotMatch(draft, /production_handshake_finish_import/);

  const kind = functionBody(mainJs, "inviteSessionCodeKind");
  assert.match(kind, /ADNOISEXXINIT1\|/);
  assert.match(kind, /ADNOISEXXREPLY1\|/);
  assert.match(kind, /ADNOISEXXFINISH1\|/);

  const peerSession = functionBody(mainJs, "usePeerInviteSessionCode");
  assert.match(peerSession, /kind === "init"[\s\S]*production_handshake_reply_export/);
  assert.match(peerSession, /kind === "reply"[\s\S]*production_handshake_finish_export/);
  assert.match(peerSession, /production_handshake_finish_import/);
  assert.match(peerSession, /refreshInviteLocalSessionReady\(input\)/);
  assert.doesNotMatch(peerSession, /production_invite_room_setup/);
  assert.doesNotMatch(peerSession, /production_two_profile_roundtrip/);

  const ready = functionBody(mainJs, "refreshInviteLocalSessionReady");
  assert.match(ready, /production_session_state_check/);
  assert.match(ready, /inviteLocalReadyStatusResult\(input,\s*session\)/);
  assert.match(ready, /rememberTwoProfileSessionStatus\(input,\s*status\)/);
});

test("received invite code is accepted without auto-creating a local two-profile room", () => {
  assert.match(indexHtml, /id="received-invite-code"/);
  assert.match(indexHtml, /id="create-room-from-received-code"/);
  assert.match(mainJs, /receivedInviteCode:\s*document\.querySelector\("#received-invite-code"\)/);
  assert.match(mainJs, /createRoomFromReceivedCode:\s*document\.querySelector\("#create-room-from-received-code"\)/);
  assert.match(mainJs, /function createRoomFromReceivedInviteCode\(\)/);
  assert.match(mainJs, /function renderReceivedInviteCodeActionState\(\)/);
  assert.match(mainJs, /fields\.createRoomFromReceivedCode\.disabled = !code/);
  assert.match(mainJs, /fields\.receivedInviteCode\.addEventListener\("input",\s*renderReceivedInviteCodeActionState\)/);
  assert.match(mainJs, /event\.key === "Enter"/);
  assert.match(mainJs, /rememberConnectionCodeRole\(code,\s*"joiner"\)/);
  assert.doesNotMatch(mainJs, /async function createRoomFromReceivedInviteCode\(\)[\s\S]{0,900}runProductionTwoProfileRoundtrip\(\)/);
  assert.match(stylesCss, /#received-invite-code/);
  assert.match(stylesCss, /#create-room-from-received-code/);
});

test("invite code mode shows this-device role instead of profile setup", () => {
  assert.match(indexHtml, /data-i18n="roomDevice"/);
  assert.match(indexHtml, /id="connection-device-role"/);
  assert.match(indexHtml, /id="pending-connection-device-role"/);
  assert.match(mainJs, /function connectionDeviceRoleKey/);
  assert.match(mainJs, /deviceRoleInviter/);
  assert.match(mainJs, /deviceRoleJoiner/);
  assert.match(mainJs, /renderConnectionDeviceRole\(\)/);
  assert.match(stylesCss, /\.device-role-note/);
});

test("default invite room send/status still use invite-room commands", () => {
  assert.match(mainJs, /function inviteRoomCommandInput/);
  assert.match(mainJs, /production_invite_room_session_status/);
  assert.match(mainJs, /production_invite_room_message_send/);
  assert.match(mainJs, /async function invokeInviteRoomSetup/);
  assert.doesNotMatch(mainJs, /fields\.createRoomFromInviteCode\.addEventListener\("click",\s*runProductionTwoProfileRoundtrip\)/);
  assert.match(mainJs, /const result = await invokeInviteRoomSessionStatus\(\{ profileA, profileB, passphrase \}\)/);
});

test("invite room outbound send is grouped behind explicit helpers", () => {
  assert.match(mainJs, /async function saveInviteRoomOutboundMessage/);
  assert.match(mainJs, /async function completeInviteRoomOutboundDelivery/);
  assert.match(mainJs, /saveInviteRoomOutboundMessage\(\{/);
  assert.match(mainJs, /completeInviteRoomOutboundDelivery\(\{ profileA, profileB, passphrase \}, messageNumber\)/);
  assert.match(mainJs, /ManualNetworkPermissionMissing/);
  assert.match(mainJs, /messageSavedPrivateDeliveryOff/);
});

test("failed send actions use direct recovery labels instead of a single generic retry", () => {
  assert.match(mainJs, /function isCurrentInviteCodeNoticeKey/);
  assert.match(mainJs, /chat-delivery-notice-label/);
  assert.match(mainJs, /chat-delivery-notice-text/);
  assert.match(mainJs, /function outboundRecoveryClass/);
  assert.match(mainJs, /outboundRecoveryClass\(primaryAction, productionTwoProfileOutboundStatusLabel\(pendingEntry\)\)/);
  assert.match(mainJs, /productionTwoProfileOutboundPrimaryAction\(entry\)/);
  assert.match(mainJs, /transcript-recovery-note/);
  assert.match(mainJs, /primaryAction\?\.recoveryKey[\s\S]{0,80}t\(primaryAction\.recoveryKey\)/);
  assert.match(mainJs, /primaryAction\.action === "enable-private-delivery"/);
  assert.match(mainJs, /primaryAction\.action === "refresh-and-retry"/);
  assert.match(mainJs, /primaryAction\.action === "refresh-and-retry" && twoProfileInviteCodeModeActive\(\)/);
  assert.match(mainJs, /retry\.disabled = !outboundActionState\.canRunNow/);
  assert.match(mainJs, /cancel\.disabled = !outboundActionState\.canRunNow/);
  assert.match(mainJs, /deliveryNeedsNetworkPermission/);
  assert.match(mainJs, /deliveryNeedsRoute/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("chatNoticeNetworkPermission", "warning"\)/);
  assert.match(mainJs, /peerEndpointState\.stale \? "chatNoticeRefreshAddress" : "privateDeliveryRouteNeeded"/);
  assert.match(mainJs, /retryTwoProfileOutboundEntry\(entry\)/);
  assert.match(functionBody(mainJs, "retryTwoProfileOutboundEntry"), /setChatDeliveryNoticeByKey\("sendRetrying", "progress"\)/);
  assert.match(mainJs, /item\.append\(actions\)/);
  assert.match(mainJs, /setChatDeliveryNoticeForPendingOutbound/);
  assert.match(mainJs, /options\.pendingEntry/);
  assert.match(mainJs, /cancelTwoProfileOutboundEntry\(pendingEntry\)/);
  assert.match(functionBody(mainJs, "cancelTwoProfileOutboundEntry"), /setChatDeliveryNoticeByKey\("sendCanceling", "progress"\)/);
  assert.match(functionBody(mainJs, "cancelTwoProfileOutboundEntry"), /setChatDeliveryNoticeByKey\("sendCanceledNotice", "success"\)/);
  assert.match(functionBody(mainJs, "cancelTwoProfileOutboundEntry"), /setChatDeliveryNoticeByKey\("sendCancelFailed", "warning"\)/);
  assert.match(i18nJs, /sendCanceling/);
  assert.match(i18nJs, /sendCancelFailed/);
  assert.match(stylesCss, /\.chat-delivery-notice-actions/);
  assert.match(stylesCss, /\.chat-delivery-notice-label/);
  assert.match(stylesCss, /\.chat-delivery-notice-text/);
  assert.match(stylesCss, /\.chat-delivery-notice-code/);
  assert.match(stylesCss, /\.chat-delivery-notice\.is-route-needed/);
  assert.match(stylesCss, /\.transcript-recovery-note/);
  assert.match(stylesCss, /\.transcript-recovery-note\.is-timeout/);
  assert.match(stylesCss, /\.transcript-row-actions button:disabled/);
});

test("chat recovery warnings hide raw developer details by default", () => {
  assert.match(mainJs, /function twoProfileRecoveryMessage\(action, error, input = productionTwoProfileInput\(\), options = \{\}\)/);
  assert.match(mainJs, /options\.includeDetail && detail/);
  assert.doesNotMatch(
    mainJs,
    /setText\(fields\.productionTwoProfileWarning,\s*twoProfileRecoveryMessage\([^)]*includeDetail:\s*true/,
  );
});

test("verification state shows the safety checklist before unlocking messages", () => {
  assert.match(indexHtml, /class="safety-confirm-checks"/);
  assert.match(indexHtml, /data-i18n="verificationCheckSeparateChannel"/);
  assert.match(indexHtml, /data-i18n="verificationCheckExactMatch"/);
  assert.match(indexHtml, /id="confirm-two-profile-safety"/);
  assert.match(indexHtml, /id="reject-two-profile-safety"/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("sendLockedUntilVerified", "warning"\)/);
  assert.match(mainJs, /function focusSafetyConfirmation\(\)/);
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "sendLockedUntilVerified"/);
  assert.match(mainJs, /t\("comparePhraseAction"\)/);
  assert.match(stylesCss, /\.safety-confirm-checks/);
  assert.match(i18nJs, /Messages unlock only after the phrase matches/);
  assert.match(i18nJs, /문구가 같을 때만 메시지를 열 수 있습니다/);
  assert.match(i18nJs, /Matches - unlock/);
  assert.match(i18nJs, /일치함 - 메시지 열기/);
  assert.match(stylesCss, /needs-safety-confirmation \.safety-confirm-state[\s\S]{0,260}width:\s*min\(360px,\s*100%\)/);
  assert.match(stylesCss, /\.safety-confirm-state h4,[\s\S]{0,260}\.safety-confirm-checks[\s\S]{0,220}clip:\s*rect\(0 0 0 0\)/);
  assert.match(stylesCss, /#reject-two-profile-safety \{[\s\S]{0,140}width:\s*fit-content/);
  assert.doesNotMatch(
    stylesCss,
    /needs-safety-confirmation[\s\S]{0,260}\.chat-delivery-notice[\s\S]{0,80}display:\s*none/,
  );
});

test("private delivery CTA opens and highlights the exact permission toggle", () => {
  assert.match(mainJs, /openPrivateDeliverySettings\(\)/);
  assert.match(mainJs, /openChatSettingsPanel\(fields\.roomNetworkPermission\)/);
  assert.match(mainJs, /\.network-permission-toggle"\)\?\.classList\.add\("is-attention"\)/);
  assert.match(mainJs, /fields\.roomNetworkPermission\?\.scrollIntoView/);
  assert.match(stylesCss, /\.network-permission-toggle\.is-attention/);
});

test("network-off delivery notice includes a direct settings action", () => {
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "messageSavedPrivateDeliveryOff"/);
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "chatNoticeNetworkPermission"/);
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "privateDeliveryRouteNeeded"/);
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "chatNoticeReceiveStopped"/);
  assert.match(mainJs, /isLocalInviteSessionCodeNoticeKey\(\) && latestLocalInviteSessionCode/);
  assert.match(mainJs, /action\.addEventListener\("click", copyLocalInviteSessionCode\)/);
  assert.match(mainJs, /className = "chat-delivery-notice-action"/);
  assert.match(mainJs, /action\.addEventListener\("click", openPrivateDeliverySettings\)/);
  assert.match(mainJs, /action\.addEventListener\("click", startProductionTwoProfileOnionReceive\)/);
  assert.match(stylesCss, /\.chat-delivery-notice-action/);
});

test("ready rooms surface listening as the next idle chat action", () => {
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("chatNoticeReceiveStopped", "muted"\)/);
  assert.match(
    mainJs,
    /twoProfilePeerEndpointState\(twoProfile\)\.ready[\s\S]{0,220}!productionTwoProfileOnionReceiveMode\.enabled[\s\S]{0,220}!twoProfile\.message/,
  );
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "chatNoticeReceiveStopped"[\s\S]{0,180}t\("startReceiving"\)/);
});

test("verified rooms without a peer route do not look fully connected", () => {
  assert.match(mainJs, /needsPrivateRoute/);
  assert.match(mainJs, /"route-needed"/);
  assert.match(mainJs, /roomStatusShortRouteNeeded/);
  assert.match(mainJs, /manualNetworkPermission \? "privateDeliveryRouteNeeded" : "chatNoticeNetworkPermission"/);
  assert.match(mainJs, /manualNetworkPermission \? "muted" : "warning"/);
  assert.match(stylesCss, /\.room-status-summary\.is-route-needed/);
});

test("private route preparation is a first-class chat action", () => {
  assert.match(indexHtml, /id="prepare-private-route"/);
  assert.match(indexHtml, /data-i18n="preparePrivateRoute"/);
  assert.match(indexHtml, /id="private-route-step-local"/);
  assert.match(indexHtml, /id="private-route-step-copy"/);
  assert.match(indexHtml, /id="private-route-step-peer"/);
  assert.match(mainJs, /preparePrivateRoute:\s*document\.querySelector\("#prepare-private-route"\)/);
  assert.match(mainJs, /privateRouteStepLocal:\s*document\.querySelector\("#private-route-step-local"\)/);
  assert.match(mainJs, /async function preparePrivateDeliveryRoute\(\)/);
  assert.match(mainJs, /fields\.preparePrivateRoute\.addEventListener\("click", preparePrivateDeliveryRoute\)/);
  assert.match(mainJs, /function renderPrivateRouteExchangeState/);
  assert.match(mainJs, /function focusLocalPrivateRouteCodeDisplay\(\)/);
  assert.match(mainJs, /function focusPeerPrivateRouteCodeInput\(\)/);
  assert.match(mainJs, /function focusPrivateRouteNextAction/);
  assert.match(mainJs, /setActionButtonState\(\s*fields\.preparePrivateRoute/);
  assert.match(mainJs, /nextRouteAction === "paste-peer"/);
  assert.match(mainJs, /nextRouteAction === "apply-peer"/);
  assert.match(mainJs, /twoProfileInviteCodeModeActive\(\)[\s\S]{0,420}prepareInviteRoomPrivateRouteExchange\(input\)/);
  assert.match(mainJs, /await refreshProductionTwoProfilePeerEndpoints\(\)/);
  assert.match(mainJs, /latestChatDeliveryNoticeKey === "privateDeliveryRouteNeeded"/);
  assert.match(mainJs, /t\("preparePrivateRoute"\)/);
  assert.match(mainJs, /isLocalPrivateRouteCodeNoticeKey/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("privateRouteCodeCopied", "success"\)/);
  assert.match(stylesCss, /#prepare-private-route/);
  assert.match(stylesCss, /\.private-route-steps/);
  assert.match(stylesCss, /has-private-route/);
});

test("private route exchange highlights the next route action", () => {
  assert.match(indexHtml, /id="private-route-instruction"/);
  assert.match(mainJs, /privateRouteInstruction:\s*document\.querySelector\("#private-route-instruction"\)/);
  assert.match(mainJs, /function routeExchangePrimaryActionNode/);
  assert.match(mainJs, /routeInstructionCreate/);
  assert.match(mainJs, /routeInstructionShare/);
  assert.match(mainJs, /routeInstructionUse/);
  assert.match(mainJs, /routeInstructionReady/);
  assert.match(mainJs, /fields\.privateRouteExchange\.scrollIntoView/);
  assert.match(mainJs, /latestLocalPrivateRouteCode[\s\S]{0,120}fields\.preparePrivateRoute/);
  assert.match(mainJs, /peerPrivateRouteCode\?\.value[\s\S]{0,120}fields\.applyPeerPrivateRouteCode/);
  assert.match(mainJs, /focusPeerPrivateRouteCodeInput\(\)/);
  assert.match(mainJs, /setFlowActionPriority\(routeExchangePrimaryActionNode\(twoProfile\)/);
  assert.match(stylesCss, /\.private-route-exchange button\.is-primary-flow-action/);
  assert.match(stylesCss, /\.private-route-exchange button\.is-secondary-flow-action/);
  assert.match(i18nJs, /붙여넣은 상대 전송 코드를 사용해 비공개 전송을 준비하세요/);
});

test("invite rooms exchange visible delivery codes instead of silently refreshing both local endpoints", () => {
  assert.match(indexHtml, /id="private-route-exchange"/);
  assert.match(indexHtml, /id="local-private-route-code"/);
  assert.match(indexHtml, /id="peer-private-route-code"/);
  assert.match(indexHtml, /id="apply-peer-private-route-code"/);
  assert.match(mainJs, /privateRouteExchange:\s*document\.querySelector\("#private-route-exchange"\)/);
  assert.match(mainJs, /async function prepareInviteRoomPrivateRouteExchange/);
  assert.match(mainJs, /production_onion_service_launch_attempt/);
  assert.match(mainJs, /rememberLocalPrivateRouteCode\(result\.local_onion_endpoint\)/);
  assert.match(mainJs, /async function applyPeerPrivateRouteCode/);
  assert.match(mainJs, /production_pairing_session_remote_endpoint_update/);
  assert.match(mainJs, /async function refreshTwoProfileOutboundEndpointThenRetry/);
  assert.match(mainJs, /prepareInviteRoomPrivateRouteExchange\(input\)/);
  assert.match(mainJs, /fields\.applyPeerPrivateRouteCode\.addEventListener\("click", applyPeerPrivateRouteCode\)/);
  assert.match(stylesCss, /\.private-route-exchange/);
  assert.match(stylesCss, /has-local-private-route-code/);
});

test("delivery controls stay hidden until a room exists", () => {
  assert.match(
    stylesCss,
    /body\.is-chat-empty:not\(\.has-ready-session\) \.room-receive-controls[\s\S]{0,120}display:\s*none/,
  );
});

test("local peer dev scripts isolate app data roots", () => {
  const packageJson = readFileSync(join(appRoot, "package.json"), "utf8");
  const runLocalPeer = readFileSync(join(appRoot, "scripts", "run-local-peer.mjs"), "utf8");
  const verifyLocalPeerFlow = readFileSync(join(appRoot, "scripts", "verify-local-peer-flow.mjs"), "utf8");
  assert.match(indexHtml, /id="local-dev-peer-label"/);
  assert.match(packageJson, /"tauri:dev:peer-a": "node scripts\/run-local-peer\.mjs peer-a"/);
  assert.match(packageJson, /"tauri:dev:peer-b": "node scripts\/run-local-peer\.mjs peer-b"/);
  assert.match(packageJson, /"test:local-peers": "node scripts\/verify-local-peer-flow\.mjs"/);
  assert.match(runLocalPeer, /ANOTHER_DIMENSION_DEV_PEER_LABEL/);
  assert.match(runLocalPeer, /another-dimension-dev-\$\{peer\}/);
  assert.match(runLocalPeer, /ANOTHER_DIMENSION_APP_DATA_DIR/);
  assert.match(runLocalPeer, /ANOTHER_DIMENSION_APP_CACHE_DIR/);
  assert.match(runLocalPeer, /--print-paths/);
  assert.match(verifyLocalPeerFlow, /function cleanPeerRoots/);
  assert.match(verifyLocalPeerFlow, /assertPeerRootsCreatedAndDistinct/);
  assert.match(verifyLocalPeerFlow, /rmSync\(peerRoot, \{ recursive: true, force: true \}\)/);
  assert.match(verifyLocalPeerFlow, /peer-a isolated paths/);
  assert.match(verifyLocalPeerFlow, /peer-b isolated paths/);
  assert.match(verifyLocalPeerFlow, /production_isolated_invite_roots_exchange_payloads_without_peer_private_profile/);
  assert.match(verifyLocalPeerFlow, /production_two_profile_room_setup_accepts_invite_derived_profiles/);
  assert.doesNotMatch(verifyLocalPeerFlow, /tauri dev|\bvite\b|\bpreview\b/);
  assert.match(mainJs, /localDevPeerLabel:\s*document\.querySelector\("#local-dev-peer-label"\)/);
  assert.match(mainJs, /local_dev_peer_label/);
  assert.match(stylesCss, /\.local-dev-peer-label/);
});

test("dark chat palette avoids the removed gold warning colors", () => {
  assert.doesNotMatch(stylesCss, /#b8a46f/i);
  assert.doesNotMatch(stylesCss, /#746842/i);
  assert.doesNotMatch(stylesCss, /\bgold\b/i);
  assert.doesNotMatch(stylesCss, /\byellow\b/i);
});
