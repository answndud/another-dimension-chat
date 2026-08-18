#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadProductBoundary } from "./product_boundary.mjs";

const checks = [
  ["SUPPORT.md", "고위험 통신 승인은 아직 비활성화되어 있습니다"],
  ["README.md", "현재 릴리스 정책상 고위험 통신은 차단되어 있습니다"],
  ["README.md", "## 지원 환경"],
  ["README.ko.md", "## 지원 환경"],
  ["README.ko.md", "검열 저항 또는 Tor/onion 전달"],
  ["SECURITY.md", "not independently audited"],
  ["SECURITY.md", "Remote relay access requires HTTPS"],
  ["SUPPORT.md", "공개 보안 승인이 아닙니다"],
  ["reference/PRODUCT_BOUNDARY.md", "production release package contains only"],
  ["reference/SECURITY_REQUIREMENTS.md", "RELEASE-01"],
  ["reference/CRYPTO_REVIEW_PACKET.md", "INV-01"],
  ["reference/RELAY_OPERATIONS.md", "단일 topology"],
  ["reference/RELAY_OPERATIONS.md", "AD_RELAY_PRODUCTION"],
  ["reference/RELAY_OPERATIONS.md", "relay_backup.mjs backup"],
  ["scripts/verify_security_requirements.mjs", "security requirement evidence passed"],
  ["reference/SUPPORT_MATRIX.json", "verifiedLocalIsNotPublicSupport"],
  ["reference/SUPPORT_MATRIX.json", "scoped local evidence"],
];
const boundary = await loadProductBoundary(".");
checks.push(["reference/product_boundary.json", boundary.supportedProduct]);
for (const nonClaim of boundary.nonClaims) checks.push(["reference/PRODUCT_BOUNDARY.md", nonClaim]);
const failures = [];
for (const [file, text] of checks) {
  const contents = await readFile(file, "utf8");
  if (!contents.includes(text)) failures.push(`${file}: missing required claim boundary: ${text}`);
}
const main = await readFile("apps/web/src/main.js", "utf8");
for (const text of ["고위험 통신을 시작하려면 터미널에서 발급한 일회성 주소"]) {
  if (!main.includes(text)) failures.push(`apps/web/src/main.js: missing safety UI marker: ${text}`);
}
const daemonView = await readFile("apps/web/src/daemon-view.js", "utf8");
for (const text of ["브라우저는 화면만 표시합니다", "보안 서비스가 발급한 주소"]) {
  if (!daemonView.includes(text)) failures.push(`apps/web/src/daemon-view.js: missing safety UI marker: ${text}`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`docs claim scan passed: ${checks.length} document claims + safety UI markers`);
