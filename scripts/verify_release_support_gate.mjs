#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
if (rootIndex !== -1 && (!args[rootIndex + 1] || args[rootIndex + 1].startsWith("--"))) {
  throw new Error("release support gate: --root requires a directory path");
}
const root = rootIndex === -1 ? projectRoot : resolve(args[rootIndex + 1]);
const matrix = JSON.parse(await readFile(resolve(root, "reference/SUPPORT_MATRIX.json"), "utf8"));
const fail = (message) => { throw new Error(`release support gate: ${message}`); };
function verifyEvidenceShape(entry, evidence) {
  for (const field of ["sourceRevision", "archiveSha256", "recordedAt", "scope", "runtime"]) {
    if (typeof evidence[field] !== "string" || !evidence[field].trim()) fail(`verified evidence ${field} is missing: ${entry.id}`);
  }
  if (!/^[0-9a-f]{40,64}$/i.test(evidence.sourceRevision)) fail(`verified evidence sourceRevision is invalid: ${entry.id}`);
  if (!/^[0-9a-f]{64}$/i.test(evidence.archiveSha256)) fail(`verified evidence archiveSha256 is invalid: ${entry.id}`);
  if (!evidence.host || typeof evidence.host !== "object" || evidence.host.platform !== entry.platform) fail(`verified evidence host platform does not match matrix: ${entry.id}`);
  if (entry.surface === "browser-ui" && (typeof evidence.host.browserVersion !== "string" || !evidence.host.browserVersion.trim())) fail(`verified browser evidence must record an exact browserVersion: ${entry.id}`);
  if (!evidence.observations || typeof evidence.observations !== "object" || !Array.isArray(evidence.observations.steps) || evidence.observations.steps.length === 0) fail(`verified evidence observations.steps is missing: ${entry.id}`);
  if (evidence.redaction?.passed !== true) fail(`verified evidence redaction is not marked passed: ${entry.id}`);
}
async function verifyEvidence(entry, evidencePath) {
  if (!entry.evidence.endsWith(".json")) fail(`verified evidence must be a JSON record: ${entry.id}`);
  let evidence;
  try { evidence = JSON.parse(await readFile(evidencePath, "utf8")); } catch { fail(`evidence is not valid JSON: ${entry.id}`); }
  if (typeof evidence.status === "string" && evidence.status !== entry.status) fail(`evidence status does not match matrix: ${entry.id}`);
  if (entry.status === "verified-local") {
    if (typeof evidence.scope !== "string" || !evidence.scope.trim()) fail(`verified evidence scope is missing: ${entry.id}`);
    verifyEvidenceShape(entry, evidence);
  }
}
const policy = matrix.releasePolicy;
if (!policy?.blockedStatusesFail || !policy.unverifiedStatusesAreNonClaim || !policy.verifiedLocalIsNotPublicSupport) {
  fail("explicit non-claim policy is required");
}
if (!Array.isArray(matrix.entries) || matrix.entries.length === 0) fail("support entries are required");
for (const entry of matrix.entries) {
  if (entry.status === "blocked" && policy.blockedStatusesFail) fail(`blocked entry: ${entry.id}`);
  if (entry.status === "unverified" && policy.unverifiedStatusesAreNonClaim && !/no support claim/i.test(entry.scope || "")) {
    fail(`unverified entry has a support-like scope: ${entry.id}`);
  }
  if (entry.status === "verified-local") {
    if (!entry.evidence) fail(`verified-local entry has no evidence: ${entry.id}`);
    const evidence = resolve(root, entry.evidence);
    if (entry.evidence.split("/").includes("..")) fail(`evidence path escapes release root: ${entry.id}`);
    await access(evidence);
    await verifyEvidence(entry, evidence);
    if (policy.verifiedLocalIsNotPublicSupport && !/only|scoped/i.test(entry.scope || "")) {
      fail(`verified-local entry does not declare a scope: ${entry.id}`);
    }
  }
}
console.log(`release support gate passed: verified-local=${matrix.entries.filter((entry) => entry.status === "verified-local").length}; non-claim-unverified=${matrix.entries.filter((entry) => entry.status === "unverified").length}; blocked=0`);
