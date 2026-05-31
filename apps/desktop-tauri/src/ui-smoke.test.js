import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const mainJs = readFileSync(join(here, "main.js"), "utf8");
const stylesCss = readFileSync(join(here, "styles.css"), "utf8");

test("invite code creation is available from empty state and settings", () => {
  assert.match(indexHtml, /id="create-invite-code"/);
  assert.match(indexHtml, /id="create-invite-code-settings"/);
  assert.match(mainJs, /createInviteCodeSettings:\s*document\.querySelector\("#create-invite-code-settings"\)/);
  assert.match(mainJs, /fields\.createInviteCodeSettings\.addEventListener\("click",\s*createInviteCode\)/);
});

test("created invite code has a visible read-only display before room creation", () => {
  assert.match(indexHtml, /id="pending-invite-code-display"/);
  assert.match(indexHtml, /class="invite-code-display"/);
  assert.match(indexHtml, /readonly/);
  assert.match(mainJs, /pendingInviteCodeDisplay:\s*document\.querySelector\("#pending-invite-code-display"\)/);
  assert.match(mainJs, /function renderCurrentInviteCodeDisplay\(\)/);
  assert.match(mainJs, /fields\.pendingInviteCodeDisplay\.value = code/);
  assert.match(mainJs, /fields\.pendingInviteCodeDisplay\?\.scrollIntoView/);
  assert.match(mainJs, /fields\.pendingInviteCodeDisplay\?\.select/);
  assert.match(stylesCss, /\.connection-pending-state \.invite-code-display/);
});

test("connection-code ready state offers create room as the next action", () => {
  assert.match(indexHtml, /id="create-room-from-invite-code"/);
  assert.match(indexHtml, /class="connection-pending-actions"/);
  assert.match(mainJs, /createRoomFromInviteCode:\s*document\.querySelector\("#create-room-from-invite-code"\)/);
  assert.match(mainJs, /fields\.createRoomFromInviteCode\.addEventListener\("click",\s*runProductionTwoProfileRoundtrip\)/);
  assert.match(mainJs, /setActionButtonState\(\s*fields\.createRoomFromInviteCode/);
  assert.match(mainJs, /setText\(\s*fields\.createRoomFromInviteCode,\s*t\("roomActionCreate"\)/);
  assert.match(stylesCss, /#create-room-from-invite-code/);
});

test("received invite code can create a room from the empty state", () => {
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
  assert.match(mainJs, /await runProductionTwoProfileRoundtrip\(\)/);
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

test("default invite room flow uses invite-room commands", () => {
  assert.match(mainJs, /function inviteRoomCommandInput/);
  assert.match(mainJs, /production_invite_room_session_status/);
  assert.match(mainJs, /production_invite_room_setup/);
  assert.match(mainJs, /production_invite_room_message_send/);
  assert.match(mainJs, /const result = await invokeInviteRoomSetup\(\{ profileA, profileB, passphrase \}\)/);
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
  assert.match(mainJs, /productionTwoProfileOutboundPrimaryAction\(entry\)/);
  assert.match(mainJs, /transcript-recovery-note/);
  assert.match(mainJs, /primaryAction\?\.recoveryKey \? t\(primaryAction\.recoveryKey\)/);
  assert.match(mainJs, /primaryAction\.action === "enable-private-delivery"/);
  assert.match(mainJs, /primaryAction\.action === "refresh-and-retry"/);
  assert.match(mainJs, /retryTwoProfileOutboundEntry\(entry\)/);
  assert.match(mainJs, /setChatDeliveryNoticeForPendingOutbound/);
  assert.match(mainJs, /options\.pendingEntry/);
  assert.match(mainJs, /cancelTwoProfileOutboundEntry\(pendingEntry\)/);
  assert.match(stylesCss, /\.chat-delivery-notice-actions/);
  assert.match(stylesCss, /\.transcript-recovery-note/);
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
  assert.match(mainJs, /className = "chat-delivery-notice-action"/);
  assert.match(mainJs, /action\.addEventListener\("click", openPrivateDeliverySettings\)/);
  assert.match(stylesCss, /\.chat-delivery-notice-action/);
});

test("local peer dev scripts isolate app data roots", () => {
  const packageJson = readFileSync(join(appRoot, "package.json"), "utf8");
  const runLocalPeer = readFileSync(join(appRoot, "scripts", "run-local-peer.mjs"), "utf8");
  assert.match(packageJson, /"tauri:dev:peer-a": "node scripts\/run-local-peer\.mjs peer-a"/);
  assert.match(packageJson, /"tauri:dev:peer-b": "node scripts\/run-local-peer\.mjs peer-b"/);
  assert.match(runLocalPeer, /another-dimension-dev-\$\{peer\}/);
  assert.match(runLocalPeer, /ANOTHER_DIMENSION_APP_DATA_DIR/);
  assert.match(runLocalPeer, /ANOTHER_DIMENSION_APP_CACHE_DIR/);
});

test("dark chat palette avoids the removed gold warning colors", () => {
  assert.doesNotMatch(stylesCss, /#b8a46f/i);
  assert.doesNotMatch(stylesCss, /#746842/i);
  assert.doesNotMatch(stylesCss, /\bgold\b/i);
  assert.doesNotMatch(stylesCss, /\byellow\b/i);
});
