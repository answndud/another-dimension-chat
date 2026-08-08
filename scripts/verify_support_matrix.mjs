#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const matrixPath = resolve(root, "reference/SUPPORT_MATRIX.json");
const allowedStatuses = new Set(["verified-local", "blocked", "unverified"]);

const fail = (message) => { throw new Error(`support matrix: ${message}`); };
function verifyEvidenceShape(entry, evidence) {
  for (const field of ["sourceRevision", "archiveSha256", "recordedAt", "scope", "runtime"]) {
    if (typeof evidence[field] !== "string" || !evidence[field].trim()) fail(`verified evidence ${field} is missing: ${entry.id}`);
  }
  if (!/^[0-9a-f]{40,64}$/i.test(evidence.sourceRevision)) fail(`verified evidence sourceRevision is invalid: ${entry.id}`);
  if (!/^[0-9a-f]{64}$/i.test(evidence.archiveSha256)) fail(`verified evidence archiveSha256 is invalid: ${entry.id}`);
  if (!evidence.host || typeof evidence.host !== "object" || evidence.host.platform !== entry.platform) {
    fail(`verified evidence host platform does not match matrix: ${entry.id}`);
  }
  if (entry.surface === "browser-ui" && (typeof evidence.host.browserVersion !== "string" || !evidence.host.browserVersion.trim())) {
    fail(`verified browser evidence must record an exact browserVersion: ${entry.id}`);
  }
  if (!evidence.observations || typeof evidence.observations !== "object" || !Array.isArray(evidence.observations.steps) || evidence.observations.steps.length === 0) {
    fail(`verified evidence observations.steps is missing: ${entry.id}`);
  }
  if (evidence.observations.initializationErrorShown === true) fail(`verified evidence records an initialization error: ${entry.id}`);
  if (evidence.redaction?.passed !== true) fail(`verified evidence redaction is not marked passed: ${entry.id}`);
}
const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
if (matrix.format !== "another-dimension-support-matrix" || matrix.version !== 1) fail("unsupported format");
if (!Array.isArray(matrix.entries) || matrix.entries.length === 0) fail("entries are required");

const ids = new Set();
for (const entry of matrix.entries) {
  for (const field of ["id", "surface", "platform", "runtime", "status", "scope"]) {
    if (typeof entry[field] !== "string" || !entry[field].trim()) fail(`${field} is missing for an entry`);
  }
  if (ids.has(entry.id)) fail(`duplicate id: ${entry.id}`);
  ids.add(entry.id);
  if (!allowedStatuses.has(entry.status)) fail(`invalid status for ${entry.id}`);
  if (entry.evidence !== null && (typeof entry.evidence !== "string" || entry.evidence.includes(".."))) fail(`unsafe evidence path for ${entry.id}`);
  if (entry.status === "verified-local" && !entry.evidence) fail(`verified entry has no evidence: ${entry.id}`);
  if (entry.status === "verified-local" && !entry.evidence.endsWith(".json")) fail(`verified entry must reference a JSON evidence record: ${entry.id}`);
  if (entry.status === "unverified" && !/no support claim/i.test(entry.scope)) fail(`unverified entry has a support-like scope: ${entry.id}`);
  if (entry.status === "verified-local") {
    const evidencePath = resolve(root, entry.evidence);
    await access(evidencePath);
    const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    if (evidence.status !== entry.status) fail(`evidence status does not match matrix: ${entry.id}`);
    if (typeof evidence.scope !== "string" || !evidence.scope.trim()) fail(`evidence scope is missing: ${entry.id}`);
    verifyEvidenceShape(entry, evidence);
  }
}
console.log(`support matrix valid: ${matrix.entries.length} entries; verified-local=${matrix.entries.filter((entry) => entry.status === "verified-local").length}; blocked=${matrix.entries.filter((entry) => entry.status === "blocked").length}; unverified=${matrix.entries.filter((entry) => entry.status === "unverified").length}`);
