#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadProductBoundary } from "./product_boundary.mjs";

const checks = [
  ["README.ko.md", "production-ready가 아니며"],
  ["README.md", "scoped `verified-local`"],
  ["README.md", "다른 브라우저로 일반화하지 않습니다"],
  ["README.ko.md", "scoped `verified-local`"],
  ["README.ko.md", "다른 브라우저로 일반화하지 않습니다"],
  ["README.ko.md", "Tor/onion 익명성이나 검열"],
  ["SECURITY.md", "not audited"],
  ["SECURITY.md", "Remote browser origins must use HTTPS"],
  ["SUPPORT.md", "절대 공개하지 마세요"],
  ["reference/PRODUCT_BOUNDARY.md", "verified browser UI bundle"],
  ["reference/SECURITY_REQUIREMENTS.md", "RELEASE-01"],
  ["reference/CRYPTO_REVIEW_PACKET.md", "INV-01"],
  ["scripts/verify_security_requirements.mjs", "security requirement evidence passed"],
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
for (const text of ["민감한 정보·실명·취재원 정보를 입력하지 않겠습니다", "안전 문구", "긴급 삭제"]) {
  if (!main.includes(text)) failures.push(`apps/web/src/main.js: missing safety UI marker: ${text}`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`docs claim scan passed: ${checks.length} document claims + safety UI markers`);
