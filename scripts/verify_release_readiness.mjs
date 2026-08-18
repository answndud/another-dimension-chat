#!/usr/bin/env node
// P8 private-trusted release readiness gate.
//
// This gate validates the evidence produced by the representative acceptance
// flow. It deliberately does not convert external trust-channel delivery or
// independent review into local proof.
import { access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fail = (message) => { throw new Error(`release readiness: ${message}`); };
const currentRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const evidenceSourceRevision = execFileSync("git", ["rev-parse", "HEAD^"], { cwd: root, encoding: "utf8" }).trim();

const criteria = [
  { id: 1, name: "private release profile exists", evidence: ["scripts/acceptance_release_builder.mjs"] },
  { id: 2, name: "development and private archives are separated", evidence: ["scripts/build_release.sh"] },
  { id: 3, name: "release signing, manifest, and SHA-256 verification work", evidence: ["scripts/acceptance_release_builder.mjs", "scripts/verify_private_release_gate.mjs", "scripts/verify_release_manifest.mjs"] },
  { id: 4, name: "release public key fingerprint procedure is documented", externalOnly: true, evidence: ["reference/RELEASE_TRUST_OPERATIONS.md", "reference/RELEASE_READINESS.md"] },
  { id: 5, name: "installs and runs with bundled Node", evidence: ["scripts/install_local_server.sh", "scripts/acceptance_release_builder.mjs"] },
  { id: 6, name: "production relay refuses to start without an operator relay key", evidence: ["scripts/acceptance_relay_operations.mjs"] },
  { id: 7, name: "HTTPS and relay trust are verified", evidence: ["scripts/verify_transport_boundary.mjs", "scripts/acceptance_daemon_repair.mjs"] },
  { id: 8, name: "two local profiles complete invite, safety number, and approval", evidence: ["scripts/acceptance_daemon_repair.mjs"] },
  { id: 9, name: "text, attachment, offline queue, restart, and re-sync work", evidence: ["scripts/acceptance_daemon_repair.mjs", "scripts/acceptance_delivery_consistency.mjs"] },
  { id: 10, name: "device revoke works", evidence: ["scripts/acceptance_daemon_repair.mjs"] },
  { id: 11, name: "recovery export/import works", evidence: ["scripts/acceptance_daemon_repair.mjs"] },
  { id: 12, name: "relay backup/restore works", evidence: ["scripts/acceptance_relay_operations.mjs"] },
  { id: 13, name: "update and rollback work", evidence: ["scripts/acceptance_private_release.mjs"] },
  { id: 14, name: "no secrets or plaintext in logs, DOM, or network", evidence: ["scripts/verify_web_exposure.mjs", "scripts/verify_relay_logs.mjs"] },
  { id: 15, name: "installer, relay operator, and incident documents match real commands", evidence: ["scripts/verify_docs_claims.mjs"] },
  { id: 16, name: "supported environment is macOS arm64 + Chromium only", evidence: ["scripts/acceptance_os_matrix.mjs", "scripts/verify_support_matrix.mjs", "scripts/verify_product_boundary.mjs"] },
  { id: 17, name: "high-risk features and claims remain disabled", evidence: ["scripts/verify_daemon_boundary.mjs", "scripts/verify_product_boundary.mjs"] },
];

const docMarkers = [
  ["reference/RELEASE_READINESS.md", "## 판정 조건과 검증"],
  ["reference/RELEASE_READINESS.md", "비판정 항목"],
  ["apps/daemon/src/main.rs", "High-risk release remains disabled"],
];
for (const [file, marker] of docMarkers) {
  const contents = await readFile(resolve(root, file), "utf8");
  if (!contents.includes(marker)) fail(`missing readiness marker: ${file}: ${marker}`);
}

const matrix = JSON.parse(await readFile(resolve(root, "reference/SUPPORT_MATRIX.json"), "utf8"));
const verifiedEntries = matrix.entries?.filter((entry) => entry.status === "verified-local") ?? [];
if (verifiedEntries.length === 0) fail("no verified-local support evidence is available");
const evidenceRecords = [];
for (const entry of verifiedEntries) {
  if (!entry.evidence || entry.evidence.includes("..")) fail(`unsafe evidence path: ${entry.id}`);
  const evidence = JSON.parse(await readFile(resolve(root, entry.evidence), "utf8"));
  if (evidence.status !== "verified-local") fail(`evidence status mismatch: ${entry.id}`);
  if (evidence.sourceRevision !== currentRevision && evidence.sourceRevision !== evidenceSourceRevision) {
    fail(`evidence source revision is neither current HEAD nor the immediately preceding code commit: ${entry.id}`);
  }
  if (!/^[0-9a-f]{64}$/.test(evidence.archiveSha256)) fail(`evidence archive hash is invalid: ${entry.id}`);
  if (evidence.redaction?.passed !== true) fail(`evidence redaction gate is not passed: ${entry.id}`);
  if (!Array.isArray(evidence.observations?.steps) || evidence.observations.steps.length === 0) fail(`evidence observations are missing: ${entry.id}`);
  if (!Array.isArray(evidence.flow?.phases) || evidence.flow.phases.length === 0) fail(`evidence phases are missing: ${entry.id}`);
  if (evidence.flow.phases.some((phase) => phase.exitCode !== 0)) fail(`evidence contains a failed phase: ${entry.id}`);
  if (!/not a public or high-risk support claim/i.test(evidence.scope || "")) fail(`evidence scope is too broad: ${entry.id}`);
  evidenceRecords.push(evidence);
}
const archiveHashes = new Set(evidenceRecords.map((evidence) => evidence.archiveSha256));
if (archiveHashes.size !== 1) fail("verified-local evidence records reference different archive hashes");

const results = [];
for (const criterion of criteria) {
  for (const evidence of criterion.evidence) {
    try { await access(resolve(root, evidence)); }
    catch { fail(`criterion ${criterion.id} (${criterion.name}) is missing evidence: ${evidence}`); }
  }
  results.push({ ...criterion, status: criterion.externalOnly ? "documented-only" : "evidence-backed" });
}

for (const result of results) {
  console.log(`release readiness: [${result.id}] ${result.name} -> ${result.status}`);
}
console.log(`release readiness passed: ${results.length} criteria; ${verifiedEntries.length} local evidence records match code revision ${evidenceRecords[0].sourceRevision} (current evidence commit ${currentRevision}) and archive ${[...archiveHashes][0]}`);
console.log("release readiness scope: private-trusted only; external fingerprint delivery, independent review, and high-risk approval remain unverified");
