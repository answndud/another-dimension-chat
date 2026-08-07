import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const srcDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ui = readFileSync(resolve(srcDir, "main.js"), "utf8");
const daemonView = readFileSync(resolve(srcDir, "daemon-view.js"), "utf8");
const daemonController = readFileSync(resolve(srcDir, "daemon-controller.js"), "utf8");
const productUi = `${ui}\n${daemonView}\n${daemonController}`;

test("web product entry is daemon-only and keeps browser state out of the product path", () => {
  for (const text of [
    "LOCAL SECURITY DAEMON",
    "daemonBridgeMode",
    "connectDaemonBridge",
    "renderDaemonBridgeState",
    "키와 메시지 상태는 daemon이 소유합니다",
    "고위험 통신을 시작하려면 CLI 데몬",
    "안전 번호 다시 확인",
    "암호화 복구 백업 다운로드",
  ]) assert.match(productUi, new RegExp(text.replace(/[.*+?^$\\{}()|[\]\\\\]/g, "\\\\$&")));
  for (const text of [
    "로컬 프로필 만들기",
    "기존 프로필 잠금 해제",
    "renderLegacy",
    "bindAuth",
    "bindRoom",
    "web-runtime.js",
    "serviceWorkerStatus",
    "IndexedDB",
    "Olm handshake",
  ]) assert.doesNotMatch(productUi, new RegExp(text.replace(/[.*+?^$\\{}()|[\]\\\\]/g, "\\\\$&")));
  assert.doesNotMatch(productUi, /browser-preview-tauri/);
  assert.doesNotMatch(productUi, /production_onion/);
  assert.match(productUi, /copyToClipboard/);
  assert.doesNotMatch(productUi, /receiveDaemonMessages/);
});
