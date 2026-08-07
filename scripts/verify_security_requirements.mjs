#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadProductBoundary } from "./product_boundary.mjs";

const evidence = new Map([
  ["ARCH-01", ["reference/product_boundary.json", "supportedProduct"]],
  ["ARCH-02", ["apps/server/server.test.mjs", "relay-only mode"]],
  ["ARCH-03", ["reference/product_boundary.json", "forbiddenReleasePaths"]],
  ["AUTH-01", ["apps/daemon/src/storage.rs", "InvalidPassphrase"]],
  ["AUTH-02", ["apps/daemon/src/pairing.rs", "BindingChanged"]],
  ["CRYPTO-01", ["reference/CRYPTO_REVIEW_PACKET.md", "INV-01"]],
  ["DATA-01", ["apps/daemon/src/storage.rs", "Aes256Gcm"]],
  ["DATA-03", ["SECURITY.md", "secure deletion"]],
  ["RELAY-01", ["apps/server/server.mjs", "MAX_ENVELOPE_BYTES"]],
  ["RELAY-03", ["apps/daemon/src/relay_http.rs", "does not accept an HTTPS endpoint without a configured trust pin"]],
  ["RELAY-02", ["scripts/verify_relay_logs.mjs", "relay log scan passed"]],
  ["TRANSPORT-02", ["scripts/verify_transport_boundary.mjs", "transport boundary passed"]],
  ["WEB-01", ["scripts/verify_web_artifact.mjs", "asset integrity manifest"]],
  ["RELEASE-01", ["scripts/verify_public_release_gate.mjs", "requiredReleaseFiles"]],
  ["RELEASE-03", ["scripts/verify_all.sh", "production build cannot be skipped"]],
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
