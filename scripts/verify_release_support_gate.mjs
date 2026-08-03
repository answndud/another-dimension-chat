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
    if (policy.verifiedLocalIsNotPublicSupport && !/only|scoped/i.test(entry.scope || "")) {
      fail(`verified-local entry does not declare a scope: ${entry.id}`);
    }
  }
}
console.log(`release support gate passed: verified-local=${matrix.entries.filter((entry) => entry.status === "verified-local").length}; non-claim-unverified=${matrix.entries.filter((entry) => entry.status === "unverified").length}; blocked=0`);
