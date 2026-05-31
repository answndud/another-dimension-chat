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
  const brace = source.indexOf("{", source.indexOf(")", index));
  assert.notEqual(brace, -1, `missing function body ${name}`);
  let depth = 0;
  for (let cursor = brace; cursor < source.length; cursor += 1) {
    if (source[cursor] === "{") depth += 1;
    if (source[cursor] === "}") depth -= 1;
    if (depth === 0) return source.slice(brace + 1, cursor);
  }
  assert.fail(`unterminated function ${name}`);
}

test("invite flow exposes create, paste, copy, and local prepare actions", () => {
  for (const id of [
    "create-invite-code",
    "received-invite-code",
    "create-room-from-received-code",
    "pending-invite-code-display",
    "copy-pending-invite-code",
    "create-room-from-invite-code",
  ]) {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  }
  assert.match(indexHtml, /invite-copy-prepare-actions/);
  assert.match(mainJs, /async function createInviteCode/);
  assert.match(mainJs, /function createRoomFromReceivedInviteCode/);
  assert.match(mainJs, /async function prepareInviteRoomLocalSetup/);
  assert.match(mainJs, /function inviteCodeCopyIsNextAction/);
  assert.match(functionBody(mainJs, "inviteSetupPrimaryActionNode"), /copyPendingInviteCode/);
  assert.match(functionBody(mainJs, "copyCurrentInviteCode"), /createRoomFromInviteCode\.focus/);
});

test("invite setup remains a staged local-device exchange", () => {
  for (const id of [
    "local-invite-setup-code",
    "peer-invite-setup-code",
    "local-invite-session-code",
    "peer-invite-session-code",
  ]) {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  }
  assert.match(functionBody(mainJs, "prepareInviteRoomLocalSetup"), /production_pairing_payload_export/);
  assert.doesNotMatch(functionBody(mainJs, "prepareInviteRoomLocalSetup"), /production_invite_room_setup/);
  assert.match(functionBody(mainJs, "usePeerInviteSetupCode"), /production_pairing_safety_preview/);
  assert.match(functionBody(mainJs, "saveInviteSessionDraftAfterSafetyConfirm"), /production_handshake_init_export/);
  assert.match(functionBody(mainJs, "usePeerInviteSessionCode"), /production_handshake_(reply|finish)_export/);
  assert.match(functionBody(mainJs, "usePeerInviteSessionCode"), /production_handshake_finish_import/);
});

test("chat-first surface keeps setup and diagnostics out of the main path", () => {
  assert.match(indexHtml, /class="chat-empty-state"/);
  assert.match(indexHtml, /class="room-secondary-options"/);
  assert.match(indexHtml, /class="system-settings-panel"/);
  assert.match(indexHtml, /id="chat-delivery-notice"/);
  assert.doesNotMatch(indexHtml, /id="send-recovery-panel"/);
  assert.match(stylesCss, /body\.is-chat-active/);
  assert.match(stylesCss, /\.chat-settings-panel/);
  assert.doesNotMatch(indexHtml, /Use this same code|Both devices use the same code|Create room/);
});

test("verification and private delivery stay explicit user actions", () => {
  assert.match(indexHtml, /id="confirm-two-profile-safety"/);
  assert.match(indexHtml, /id="reject-two-profile-safety"/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("sendLockedUntilVerified", "warning"\)/);
  assert.match(mainJs, /function focusSafetyConfirmation/);
  assert.match(mainJs, /openPrivateDeliverySettings\(\)/);
  assert.match(mainJs, /openChatSettingsPanel\(fields\.roomNetworkPermission\)/);
  assert.match(mainJs, /setChatDeliveryNoticeByKey\("chatNoticeNetworkPermission", "warning"\)/);
});

test("message composer routes send, receive, retry, and route preparation through explicit helpers", () => {
  assert.match(mainJs, /function twoProfileComposerPrimaryIntent/);
  assert.match(mainJs, /async function runProductionTwoProfileComposerPrimaryAction/);
  assert.match(mainJs, /needsDeliveryPermission/);
  assert.match(mainJs, /roomStatusShortDeliveryOff/);
  assert.match(mainJs, /startProductionTwoProfileOnionReceive/);
  assert.match(mainJs, /preparePrivateDeliveryRoute/);
  assert.match(mainJs, /function ensurePrivateDeliveryRuntimeReady/);
  assert.match(mainJs, /saveInviteRoomOutboundMessage/);
  assert.match(mainJs, /completeInviteRoomOutboundDelivery/);
  assert.match(functionBody(mainJs, "ensurePrivateDeliveryRuntimeReady"), /production_onion_persistent_client_start/);
  assert.match(functionBody(mainJs, "prepareInviteRoomPrivateRouteExchange"), /ensurePrivateDeliveryRuntimeReady\(input\)/);
  assert.match(functionBody(mainJs, "startProductionTwoProfileOnionReceive"), /prepareInviteRoomPrivateRouteExchange\(input\)/);
  assert.match(functionBody(mainJs, "completeInviteRoomOutboundDelivery"), /showLatestRetryableOutboundNotice\(input\)/);
});

test("failed sends stay recoverable from the chat flow", () => {
  assert.doesNotMatch(mainJs, /function renderSendRecoveryPanel/);
  assert.match(mainJs, /function runTwoProfileOutboundPrimaryAction/);
  assert.match(mainJs, /function cancelTwoProfileOutboundEntry/);
  assert.match(mainJs, /setChatDeliveryNoticeForPendingOutbound/);
  assert.match(mainJs, /chat-delivery-notice-chip/);
  assert.match(mainJs, /t\(primaryAction \? "sendRecoveryPanelTitle" : "roomStatusLabel"\)/);
  assert.match(mainJs, /productionTwoProfileOutboundPrimaryAction\(entry\)/);
  assert.match(functionBody(mainJs, "runTwoProfileOutboundPrimaryAction"), /refreshTwoProfileOutboundEndpointThenRetry/);
  assert.match(functionBody(mainJs, "runTwoProfileOutboundPrimaryAction"), /retryTwoProfileOutboundEntry/);
  assert.match(functionBody(mainJs, "cancelTwoProfileOutboundEntry"), /sendCanceledNotice/);
  assert.match(i18nJs, /sendRecoveryPanelTitle: "message not sent"/);
  assert.match(i18nJs, /sendRecoveryPanelTitle: "메시지가 전송되지 않음"/);
  assert.match(stylesCss, /\.chat-delivery-notice-chip/);
  assert.doesNotMatch(stylesCss, /\.send-recovery-panel/);
});

test("local peer development uses isolated app data roots", () => {
  const packageJson = readFileSync(join(appRoot, "package.json"), "utf8");
  const runLocalPeer = readFileSync(join(appRoot, "scripts", "run-local-peer.mjs"), "utf8");
  const verifyLocalPeerFlow = readFileSync(join(appRoot, "scripts", "verify-local-peer-flow.mjs"), "utf8");

  assert.match(indexHtml, /id="local-dev-peer-label"/);
  assert.match(indexHtml, /id="local-peer-test-hint"/);
  assert.match(packageJson, /"tauri:dev:peer-a": "node scripts\/run-local-peer\.mjs peer-a"/);
  assert.match(packageJson, /"tauri:dev:peer-b": "node scripts\/run-local-peer\.mjs peer-b"/);
  assert.match(runLocalPeer, /ANOTHER_DIMENSION_DEV_PEER_LABEL/);
  assert.match(runLocalPeer, /ANOTHER_DIMENSION_APP_DATA_DIR/);
  assert.match(runLocalPeer, /ANOTHER_DIMENSION_APP_CACHE_DIR/);
  assert.match(verifyLocalPeerFlow, /cleanPeerRoots/);
  assert.doesNotMatch(verifyLocalPeerFlow, /tauri dev|\bvite\b|\bpreview\b/);
});

test("dark chat palette does not reintroduce gold warning colors", () => {
  assert.doesNotMatch(stylesCss, /#b8a46f/i);
  assert.doesNotMatch(stylesCss, /#746842/i);
  assert.doesNotMatch(stylesCss, /\bgold\b/i);
  assert.doesNotMatch(stylesCss, /\byellow\b/i);
});
