#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadProductBoundary } from "./product_boundary.mjs";

const evidence = new Map([
  ["ARCH-01", ["reference/product_boundary.json", "supportedProduct"]],
  ["ARCH-02", ["apps/server/server.test.mjs", "relay-only mode"]],
  ["ARCH-03", ["reference/product_boundary.json", "forbiddenReleasePaths"]],
  ["ARCH-04", ["scripts/verify_daemon_boundary.mjs", "daemon boundary passed"]],
  ["AUTH-01", ["apps/daemon/src/storage.rs", "InvalidPassphrase"]],
  ["AUTH-02", ["apps/daemon/src/pairing.rs", "BindingChanged"]],
  ["AUTH-03", ["scripts/verify_invite_code.mjs", "owner revoke rejection"]],
  ["AUTH-04", ["apps/daemon/src/device.rs", "registry_registers_authorizes_and_revokes_devices"]],
  ["CRYPTO-01", ["reference/CRYPTO_REVIEW_PACKET.md", "INV-01"]],
  ["CRYPTO-02", ["apps/daemon/src/storage.rs", "RollbackDetected"]],
  ["CRYPTO-03", ["apps/web/src/daemon-bridge.js", "clearFragment"]],
  ["DATA-01", ["apps/daemon/src/storage.rs", "Aes256Gcm"]],
  ["DATA-02", ["scripts/verify_web_exposure.mjs", "no-store daemon UI"]],
  ["DATA-03", ["SECURITY.md", "secure deletion"]],
  ["DATA-04", ["apps/daemon/src/storage.rs", "OsKeyStoreUnavailable"]],
  ["RELAY-01", ["apps/server/server.mjs", "MAX_ENVELOPE_BYTES"]],
  ["RELAY-02", ["scripts/verify_relay_logs.mjs", "relay log scan passed"]],
  ["RELAY-03", ["apps/daemon/src/relay_http.rs", "does not accept an HTTPS endpoint without a configured trust pin"]],
  ["TRANSPORT-01", ["scripts/verify_transport_boundary.mjs", "transport boundary passed"]],
  ["TRANSPORT-02", ["scripts/verify_transport_boundary.mjs", "high-risk/onion routes are explicitly disabled"]],
  ["WEB-01", ["scripts/verify_web_artifact.mjs", "asset integrity manifest"]],
  ["WEB-02", ["scripts/verify_web_exposure.mjs", "web exposure scan passed"]],
  ["WEB-03", ["apps/web/src/daemon-view.js", "안전 번호 다시 확인"]],
  ["BRIDGE-01", ["apps/daemon/src/bridge_http.rs", "chromium_same_origin_get_may_omit_origin_but_wrong_origin_is_rejected"]],
  ["BRIDGE-02", ["apps/daemon/src/bridge_http.rs", "json_error_responses_expose_stable_error_code"]],
  ["RELEASE-01", ["scripts/verify_public_release_gate.mjs", "requiredReleaseFiles"]],
  ["RELEASE-02", ["scripts/verify_release_trust.mjs", "release trust passed"]],
  ["RELEASE-03", ["scripts/verify_all.sh", "production build cannot be skipped"]],
  ["RECOVERY-01", ["apps/daemon/src/cli_recovery.rs", "ADRECOVERY2"]],
]);
const failures = [];
const boundary = await loadProductBoundary(".");
if (boundary.highRiskAllowed !== false) failures.push("product boundary must keep high-risk mode disabled");
if (!boundary.forbiddenReleasePaths.includes("apps/desktop-tauri")) failures.push("legacy product boundary is incomplete");
for (const [id, [file, marker]] of evidence) {
  const contents = await readFile(file, "utf8");
  if (!contents.includes(marker)) failures.push(`${id}: evidence marker missing from ${file}: ${marker}`);
}
const requirements = await readFile("reference/SECURITY_REQUIREMENTS.md", "utf8");
for (const id of evidence.keys()) if (!requirements.includes(`| \`${id}\` |`)) failures.push(`${id}: requirement register entry missing`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`security requirement evidence passed: ${evidence.size} mapped requirements`);
