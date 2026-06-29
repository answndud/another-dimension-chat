import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const repoRoot = join(appRoot, "..", "..");

function readRepoFile(...parts) {
  return readFileSync(join(repoRoot, ...parts), "utf8");
}

const indexHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const i18nJs = readFileSync(join(here, "i18n.js"), "utf8");
const stylesCss = readFileSync(join(here, "styles.css"), "utf8");
const readme = readRepoFile("README.md");
const readmeKo = readRepoFile("README.ko.md");
const installFromSource = readRepoFile("INSTALL_FROM_SOURCE_MACOS.md");
const support = readRepoFile("SUPPORT.md");
const supportIssueTemplate = readRepoFile(".github", "ISSUE_TEMPLATE", "public_beta_support.yml");

function assertIncludesAll(source, expected, label) {
  for (const value of expected) {
    assert.ok(source.includes(value), `${label} must include: ${value}`);
  }
}

test("public chat surface keeps the essential room and message entry points", () => {
  assertIncludesAll(
    indexHtml,
    [
      'id="create-invite-code"',
      'id="received-invite-code"',
      'id="saved-room-list"',
      'id="back-to-room-list"',
      'id="safety-confirm-title"',
      'id="production-two-profile-message"',
      'id="chat-delivery-notice"',
      'id="start-production-two-profile-onion-receive"',
      'id="export-production-message-envelope"',
      'id="import-production-message-envelope"',
    ],
    "public chat surface",
  );
});

test("first launch states the public beta security non-claims", () => {
  assertIncludesAll(
    indexHtml,
    [
      'class="public-beta-warning"',
      "without a central trusted server",
      'id="open-public-beta-details"',
      "See security and beta details",
    ],
    "first-launch warning",
  );
  assertIncludesAll(
    indexHtml,
    ["not notarized", "not audited", "not production-ready", "sensitive communication prohibited"],
    "developer details warning copy",
  );
});

test("first launch explains manual delivery and explicit network permission", () => {
  assertIncludesAll(
    indexHtml,
    [
      "no network I/O, no automatic delivery, and no external delivery claim",
    ],
    "manual delivery boundary",
  );
  assertIncludesAll(
    indexHtml,
    [
      "Default exchange is manual encrypted envelopes.",
      "Network and onion delivery stay off on launch",
      "manual permission plus an explicit delivery action",
    ],
    "developer details manual delivery boundary",
  );
});

test("invite flow is invite-code only without QR controls", () => {
  assertIncludesAll(
    indexHtml,
    ['id="create-invite-code"', 'id="received-invite-code"', 'id="create-room-from-received-code"'],
    "invite code only surface",
  );
  for (const absent of ["show-created-invite-qr", "import-received-invite-qr", "invite-qr-panel"]) {
    assert.equal(indexHtml.includes(absent), false, `invite code only surface must remove ${absent}`);
  }
});

test("safety confirmation remains visible before message actions", () => {
  assertIncludesAll(
    indexHtml,
    [
      "Compare the mandatory safety phrase, then write a message.",
      'id="safety-confirm-title"',
      'id="confirm-two-profile-safety"',
      'id="reject-two-profile-safety"',
    ],
    "safety confirmation",
  );
  assertIncludesAll(
    stylesCss,
    [
      "body.needs-safety-confirmation #production-two-profile-message",
      "body.needs-safety-confirmation .chat-composer",
    ],
    "safety lock styling",
  );
});

test("saved-room recovery offers reopen retry and cancel guidance", () => {
  assertIncludesAll(
    indexHtml,
    ['id="saved-room-list"', 'id="back-to-room-list"', 'id="chat-delivery-notice"'],
    "saved-room recovery surface",
  );
  assertIncludesAll(
    i18nJs,
    [
      "restart the app and reopen this saved room",
      'retrySend: "retry send"',
      'cancelSend: "cancel send"',
      'retrySend: "다시 보내기"',
      'cancelSend: "전송 취소"',
    ],
    "saved-room recovery copy",
  );
});

test("public diagnostics exclude private support data", () => {
  const forbidden = [
    "raw logs",
    "local paths",
    "invite codes",
    "payloads",
    "message text",
    "safety phrases",
    "passphrases",
    "private keys",
    "screenshots",
  ];
  assertIncludesAll(support, forbidden, "support policy");
  assertIncludesAll(supportIssueTemplate, forbidden, "public support issue template");
  assertIncludesAll(
    indexHtml,
    ["raw logs", "local paths", "invite codes", "payloads", "message bodies", "safety phrases", "passphrases", "keys", "screenshots"],
    "in-app diagnostics warning",
  );
});

test("source build remains the primary macOS installation path", () => {
  for (const [label, source] of [
    ["README", readme],
    ["Korean README", readmeKo],
  ]) {
    assertIncludesAll(source, ["source-build-primary", "not production-ready"], label);
  }
  assertIncludesAll(
    installFromSource,
    [
      "npm ci --prefix apps/desktop-tauri",
      "npm --prefix apps/desktop-tauri run tauri:build:beta-onion",
      "Another\\ Dimension\\ Chat.app",
    ],
    "source build guide",
  );
});

test("English and Korean warnings preserve the same core boundaries", () => {
  assertIncludesAll(
    i18nJs,
    [
      "not audited",
      "not production-ready",
      "sensitive communication prohibited",
      "no network I/O, no automatic delivery, and no external delivery claim",
      "확인 문구가 다릅니다. 이 채팅방을 사용하지 마세요.",
      "로컬 데이터 삭제",
    ],
    "bilingual safety copy",
  );
});

test("advanced onion controls stay hidden outside developer mode", () => {
  assertIncludesAll(
    stylesCss,
    [
      ".advanced-panel:not(.is-revealed)",
      ".onion-advanced-controls {",
      "body.is-developer-mode .onion-advanced-controls",
    ],
    "advanced control visibility",
  );
});

test("local deletion remains explicit and device-scoped", () => {
  assertIncludesAll(
    indexHtml,
    [
      "Delete local data on this device only after the manual flow is done.",
      'id="delete-production-profile"',
      'data-destructive-scope="profile-delete"',
      'data-destructive-scope="session-delete"',
      'data-destructive-scope="conversation-delete"',
    ],
    "local deletion boundary",
  );
  assertIncludesAll(
    i18nJs,
    ["Wipe local data", "이 기기의 앱 소유 로컬 데이터만 지웁니다."],
    "local deletion copy",
  );
});
