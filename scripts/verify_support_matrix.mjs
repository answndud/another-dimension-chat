#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const matrixPath = resolve(root, "reference/SUPPORT_MATRIX.json");
const allowedStatuses = new Set(["verified-local", "blocked", "unverified"]);

const fail = (message) => { throw new Error(`support matrix: ${message}`); };
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
  if (entry.status !== "verified-local" && entry.scope.includes("support claim")) continue;
  if (entry.status === "unverified" && !/no support claim/i.test(entry.scope)) fail(`unverified entry has a support-like scope: ${entry.id}`);
}

const browserEvidence = resolve(root, "reference/browser-evidence/codex-in-app-browser.json");
const evidence = JSON.parse(await readFile(browserEvidence, "utf8"));
const browserEvidenceIsScopedVerified = evidence.status === "verified-local"
  && evidence.observations?.productionUiRendered === true
  && evidence.observations?.profileCreationCompleted === true
  && evidence.observations?.initializationErrorShown === false
  && /profile (creation|create)|프로필/i.test(evidence.scope ?? "");
const browserEvidenceIsBlocked = evidence.status === "blocked"
  && evidence.observations?.profileCreationCompleted === false;
if (!browserEvidenceIsScopedVerified && !browserEvidenceIsBlocked) fail("browser evidence must be either an explicit blocked result or a scoped verified-local result");
if (evidence.redaction?.includes("passphrase") !== true) fail("browser evidence redaction policy is missing");
console.log(`support matrix valid: ${matrix.entries.length} entries; verified-local=${matrix.entries.filter((entry) => entry.status === "verified-local").length}; blocked=${matrix.entries.filter((entry) => entry.status === "blocked").length}; unverified=${matrix.entries.filter((entry) => entry.status === "unverified").length}`);
