#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];
const webFiles = [
  "apps/web/src/main.js",
  "apps/web/src/daemon-bridge.js",
  "apps/web/src/daemon-controller.js",
  "apps/web/src/daemon-view.js",
  "apps/web/src/daemon-state.js",
  "apps/web/src/daemon-errors.js",
];

// WEB-02: telemetry/logs/titles must never carry secrets or plaintext.
for (const file of webFiles) {
  const source = await readFile(resolve(root, file), "utf8");
  if (/console\.(log|warn|error|debug|info)\s*\(/.test(source)) {
    failures.push(`${file}: console logging must not expose runtime state`);
  }
  if (/document\.title\s*=/.test(source)) {
    failures.push(`${file}: document.title must stay static (no message/identity text)`);
  }
  if (/navigator\.clipboard\.writeText\s*\(/.test(source) && !/async function copyToClipboard/.test(source)) {
    failures.push(`${file}: clipboard writes must go through the explicit copyToClipboard helper`);
  }
}

// The clipboard helper must be the only place that touches the clipboard, and
// it must be user-action driven from a button binding (never automatic).
const controller = await readFile(resolve(root, "apps/web/src/daemon-controller.js"), "utf8");
const copyCalls = [...controller.matchAll(/copyToClipboard\s*\(/g)].length;
const helper = controller.match(/async function copyToClipboard\(value\)[\s\S]*?^}/m)?.[0] || "";
if (copyCalls < 1) failures.push("daemon-controller.js: no explicit copyToClipboard helper is defined");
if (!/async function copyToClipboard\(value\)/.test(controller)) failures.push("daemon-controller.js: copyToClipboard helper signature changed");
// Clipboard access is allowed only inside the explicit helper; every
// navigator.clipboard reference elsewhere would be an automatic secret write.
const helperClipboardUses = [...helper.matchAll(/navigator\.clipboard/g)].length;
const totalClipboardUses = [...controller.matchAll(/navigator\.clipboard/g)].length;
if (helperClipboardUses < 1) failures.push("daemon-controller.js: copyToClipboard helper must perform the clipboard write");
if (totalClipboardUses > helperClipboardUses) failures.push("daemon-controller.js: navigator.clipboard must only be used inside copyToClipboard");

// DOM updates must be escaped text or static template markup; interpolated
// secret-bearing innerHTML would be a DOM injection surface.
const view = await readFile(resolve(root, "apps/web/src/daemon-view.js"), "utf8");
const main = await readFile(resolve(root, "apps/web/src/main.js"), "utf8");
if (/\.innerHTML\s*=/.test(view)) failures.push("daemon-view.js: view markup must not assign innerHTML directly");
if (/innerHTML\s*=\s*[^;]*\$\{/.test(main)) failures.push("main.js: innerHTML must only receive prebuilt template markup, not interpolated values");

// Network surface: the browser client may only talk to the loopback daemon
// origin, never to a hardcoded remote host, and must never put the bootstrap
// token in a URL query.
const bridge = await readFile(resolve(root, "apps/web/src/daemon-bridge.js"), "utf8");
for (const pattern of [/https?:\/\/(?!127\.0\.0\.1|localhost|\[::1\])/, /XMLHttpRequest/, /sendBeacon/]) {
  if (pattern.test(bridge)) failures.push(`daemon-bridge.js: non-loopback network surface present: ${pattern}`);
}
if (!/readBootstrap\(location\)/.test(bridge)) failures.push("daemon-bridge.js: bootstrap token read helper missing");
if (!/clearFragment/.test(bridge) || !/replaceState/.test(bridge)) failures.push("daemon-bridge.js: bootstrap fragment must be removed from history before use");
if (/ad_bootstrap=/.test(bridge) && !/params\.get\(BOOTSTRAP_PARAM\)/.test(bridge)) failures.push("daemon-bridge.js: bootstrap token handling changed unexpectedly");

// DATA-02: the browser must not own durable plaintext or capability state.
// Persistent browser storage (localStorage, IndexedDB, Cache API) would
// bypass the daemon boundary, so none may appear in the web sources.
for (const file of webFiles) {
  const source = await readFile(resolve(root, file), "utf8");
  for (const api of ["localStorage", "sessionStorage", "indexedDB", "openDatabase", /\bcaches\./]) {
    if (api instanceof RegExp ? api.test(source) : source.includes(api)) {
      failures.push(`${file}: browser storage API must not own product state: ${api}`);
    }
  }
}

// DATA-02: the daemon-served UI must be no-store and nosniff so Chromium
// cache, back-forward cache, and stale tabs cannot resurrect old plaintext.
const httpSupport = await readFile(resolve(root, "apps/daemon/src/http_support.rs"), "utf8");
if (!/Cache-Control: no-store/.test(httpSupport)) failures.push("http_support.rs: daemon HTTP responses must be no-store");
if (!/X-Content-Type-Options: nosniff/.test(httpSupport)) failures.push("http_support.rs: daemon HTTP responses must be nosniff");
const distManifest = resolve(root, "apps/web/dist/asset-integrity.json");
let distIndex = "";
try {
  distIndex = await readFile(resolve(root, "apps/web/dist/index.html"), "utf8");
} catch {
  // dist may be absent in source-only scans; the built artifact is checked by
  // verify_web_artifact.mjs which already enforces SRI and no source paths.
}
if (distIndex && (/serviceWorker/.test(distIndex) || distIndex.includes("/sw.js"))) {
  failures.push("apps/web/dist/index.html: production UI must not reference a service worker");
}

if (failures.length) {
  console.error("web exposure scan failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("web exposure scan passed: no console/title/clipboard/DOM secret surfaces, loopback-only network, and no-store daemon UI");
