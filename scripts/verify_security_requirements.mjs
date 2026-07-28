#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const evidence = new Map([
  ["ARCH-01", ["scripts/verify_product_boundary.mjs", "product boundary"]],
  ["ARCH-02", ["apps/server/server.test.mjs", "relay-only mode"]],
  ["AUTH-01", ["apps/web/src/web-runtime.js", "unlockProfile"]],
  ["AUTH-02", ["apps/web/src/web-runtime.js", "peerIdentity"]],
  ["CRYPTO-01", ["reference/CRYPTO_REVIEW_PACKET.md", "INV-01"]],
  ["DATA-01", ["apps/web/src/web-runtime.js", "AES-GCM"]],
  ["DATA-03", ["SECURITY.md", "secure deletion"]],
  ["RELAY-01", ["apps/server/server.mjs", "MAX_ENVELOPE_BYTES"]],
  ["RELAY-03", ["apps/web/src/web-runtime.js", "Remote relay endpoints require HTTPS"]],
  ["TRANSPORT-02", ["apps/server/server.mjs", "highRiskAllowed: false"]],
  ["RELEASE-01", ["scripts/verify_public_release_gate.mjs", "runtime/node"]],
  ["RELEASE-03", ["scripts/verify_all.sh", "production build cannot be skipped"]],
]);
const failures = [];
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
