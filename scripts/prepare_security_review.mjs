#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
if (outIndex < 0 || !args[outIndex + 1]) throw new Error("Usage: prepare_security_review.mjs --out DIRECTORY [--evidence-dir DIRECTORY]");
const output = path.resolve(args[outIndex + 1]);
const evidenceIndex = args.indexOf("--evidence-dir");
const evidenceDir = evidenceIndex >= 0 && args[evidenceIndex + 1] ? path.resolve(args[evidenceIndex + 1]) : null;

const sourceFiles = [
  "Cargo.lock",
  "apps/web/package.json",
  "apps/web/package-lock.json",
  "apps/daemon/Cargo.toml",
  "apps/daemon/src/mls_provider.rs",
  "apps/daemon/src/mls_session.rs",
  "apps/daemon/src/storage.rs",
  "apps/daemon/src/relay_http.rs",
  "apps/web/src/main.js",
  "apps/server/server.mjs",
  "scripts/build_release.sh",
  "scripts/verify_public_release_gate.mjs",
  "scripts/verify_release_trust.mjs",
  "scripts/verify_release_trust_receipt.mjs",
  "scripts/verify_security_review_signoff.mjs",
  "scripts/verify_security_review_handoff.mjs",
  "scripts/verify_install_state.mjs",
  "scripts/acceptance_p3.mjs",
  "reference/product_boundary.json",
];
const reviewDocs = [
  "reference/CRYPTO_REVIEW_PACKET.md",
  "reference/SECURITY_AUDIT_SCOPE.md",
  "reference/SECURITY_REVIEW_EVIDENCE.md",
  "reference/SECURITY_REQUIREMENTS.md",
  "reference/SECURITY_REVIEW_RESULT_TEMPLATE.md",
  "reference/INCIDENT_RESPONSE.md",
  "reference/PRODUCT_BOUNDARY.md",
  "SECURITY.md",
  "SUPPORT.md",
];
const forbidden = [
  { name: "private-key-pem", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/i },
  { name: "bearer-fragment", pattern: /#(?:relay|local)=(?!\.\.\.)[^\s)"'<>]+/i },
  { name: "invite-or-envelope-value", pattern: /(?:ADINVITE|ADENV1)\.[A-Za-z0-9+/_=-]{16,}/ },
  { name: "ipv4-address", pattern: /\b(?!127\.0\.0\.1\b)(?:\d{1,3}\.){3}\d{1,3}\b/ },
];

async function exists(file) {
  try { await access(file, constants.R_OK); return true; } catch { return false; }
}
async function digest(file) {
  const bytes = await readFile(file);
  return { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.byteLength };
}
async function scan(file) {
  const info = await stat(file);
  if (!info.isFile()) return;
  const value = await readFile(file, "utf8").catch(() => null);
  if (value === null) return;
  for (const rule of forbidden) if (rule.pattern.test(value)) throw new Error(`${rule.name} found in ${file}`);
}
async function assertNewDirectory(dir) {
  if (!(await exists(dir))) return;
  const entries = await readdir(dir);
  if (entries.length) throw new Error(`output directory must be absent or empty: ${dir}`);
}
function assertCleanRevision() {
  const status = execFileSync("git", ["-C", projectDir, "status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" });
  if (status.trim()) throw new Error("review bundle requires a clean git worktree; commit or stash local changes first");
}
async function copyChecked(relative) {
  const source = path.join(projectDir, relative);
  if (!(await exists(source))) throw new Error(`missing review input: ${relative}`);
  const destination = path.join(output, "source", relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
  return { path: relative, ...(await digest(source)) };
}

await assertNewDirectory(output);
assertCleanRevision();
await mkdir(output, { recursive: true });
await mkdir(path.join(output, "source"), { recursive: true });
const revision = execFileSync("git", ["-C", projectDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sourceDate = execFileSync("git", ["-C", projectDir, "show", "-s", "--format=%cI", revision], { encoding: "utf8" }).trim();
const files = [];
for (const relative of sourceFiles) files.push(await copyChecked(relative));
const reviewFiles = [];
for (const relative of reviewDocs) {
  const source = path.join(projectDir, relative);
  if (!(await exists(source))) throw new Error(`missing review document: ${relative}`);
  const destination = path.join(output, "review", relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
  await scan(destination);
  reviewFiles.push({ path: relative, ...(await digest(destination)) });
}

const evidenceOutput = path.join(output, "evidence");
await mkdir(evidenceOutput, { recursive: true });
let evidenceStatus = "not-provided";
if (evidenceDir) {
  if (!(await exists(evidenceDir))) throw new Error(`evidence directory does not exist: ${evidenceDir}`);
  const entries = await readdir(evidenceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !/\.(json|txt|md|log)$/i.test(entry.name)) continue;
    const source = path.join(evidenceDir, entry.name);
    const destination = path.join(evidenceOutput, entry.name);
    await cp(source, destination);
    await scan(destination);
  }
  evidenceStatus = "provided-and-scanned";
}
await writeFile(path.join(evidenceOutput, "STATUS.json"), `${JSON.stringify({ format: "another-dimension-review-evidence-status", status: evidenceStatus, note: "Automated evidence is not reviewer sign-off." }, null, 2)}\n`);

const manifest = {
  format: "another-dimension-security-review-bundle",
  version: 1,
  sourceRevision: revision,
  sourceCommitDate: sourceDate,
  contents: { sourceFiles: files, reviewDocuments: reviewDocs, reviewFiles, evidenceStatus },
  claims: { independentReview: "not-provided", productionReady: false, highRiskAllowed: false },
  redaction: { scannedRules: forbidden.map(({ name }) => name), secretsIncluded: false },
};
await writeFile(path.join(output, "REVIEW-MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`security review bundle prepared: ${output} (${files.length} source hashes, ${reviewDocs.length} review documents, evidence ${evidenceStatus})`);
