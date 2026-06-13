#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_RESULT_DIR = path.join(process.cwd(), "docs", "windows-public-artifact-results");

const REQUIRED_FIELDS = Object.freeze([
  "schema_version",
  "result_id",
  "run_host",
  "platform",
  "windows_version",
  "architecture",
  "artifact_kind",
  "artifact_path_redacted",
  "artifact_sha256",
  "artifact_provenance_sha256",
  "artifact_manifest_sha256",
  "source_commit",
  "webview2_rendered",
  "app_data_root_redacted",
  "path_separator_behavior",
  "encrypted_store_profile_unlock",
  "local_deletion_behavior",
  "redacted_diagnostics_only",
  "explicit_user_action_before_network",
  "local_manual_envelope_default_path",
  "auto_update_channel_absent",
  "public_non_claims_visible",
  "installer_signing_decision",
  "smartscreen_reputation_claim",
  "public_copy_reviewed",
  "checksum_provenance_verified",
  "support_diagnostics_reviewed",
  "non_claims_confirmed",
]);

const PASS_FIELDS = Object.freeze([
  "webview2_rendered",
  "app_data_root_redacted",
  "path_separator_behavior",
  "encrypted_store_profile_unlock",
  "local_deletion_behavior",
  "redacted_diagnostics_only",
  "explicit_user_action_before_network",
  "local_manual_envelope_default_path",
  "auto_update_channel_absent",
  "public_non_claims_visible",
]);

const ALLOWED_VALUES = new Map([
  ["schema_version", new Set(["windows-public-artifact-result-v1"])],
  ["run_host", new Set(["real-windows-machine"])],
  ["platform", new Set(["windows"])],
  ["architecture", new Set(["x64", "arm64"])],
  ["artifact_kind", new Set(["installer", "portable-archive", "msix", "nsis", "tauri-bundle"])],
  ["artifact_path_redacted", new Set(["true"])],
  ["installer_signing_decision", new Set(["unsigned-hold", "signtool-signed", "store-signed", "not-applicable"])],
  ["smartscreen_reputation_claim", new Set(["false"])],
  ["public_copy_reviewed", new Set(["true", "false"])],
  ["checksum_provenance_verified", new Set(["true", "false"])],
  ["support_diagnostics_reviewed", new Set(["true", "false"])],
]);

for (const field of PASS_FIELDS) {
  ALLOWED_VALUES.set(field, new Set(["pass", "fail"]));
}

const REQUIRED_NON_CLAIMS = Object.freeze([
  "unsigned-experimental-public-beta",
  "sensitive-communication-prohibited",
  "not-audited",
  "not-production-ready",
  "no-public-windows-artifact",
  "no-windows-installer",
  "no-public-artifact-upload",
]);

const FORBIDDEN_PATTERNS = Object.freeze([
  [/[A-Z]:\\Users\\/i, "windows-local-path"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop)\//, "local-path"],
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bADENDPOINT[A-Z0-9]*\b/i, "endpoint-payload"],
  [/\.onion\b/i, "onion-endpoint"],
  [/\bobfs4\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\bpassphrase\b/i, "passphrase"],
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key"],
  [/\b(raw log|crash dump|private key|key material)\b/i, "private-debug-data"],
]);

function collectResultFiles(inputs) {
  const targets = inputs.length > 0 ? inputs : [DEFAULT_RESULT_DIR];
  const files = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      files.push(target);
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.(md|txt)$/i.test(entry.name)) continue;
      files.push(path.join(target, entry.name));
    }
  }
  return files.sort();
}

function parseResult(text) {
  const fields = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([a-z][a-z0-9_]*)=(.*)$/);
    if (!match) continue;
    fields.set(match[1], match[2].trim());
  }
  return fields;
}

function isUnresolved(value) {
  return value === "" || value.includes("|") || /^tbd$/i.test(value) || /^todo$/i.test(value);
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function sameSet(actual, expected) {
  return actual.size === expected.length && expected.every((item) => actual.has(item));
}

function validateResult(file) {
  const text = fs.readFileSync(file, "utf8");
  const fields = parseResult(text);
  const issues = [];
  for (const field of REQUIRED_FIELDS) {
    const value = fields.get(field) ?? "";
    if (isUnresolved(value)) {
      issues.push(`missing-or-template-value:${field}`);
    }
  }
  for (const [field, value] of fields) {
    if (!REQUIRED_FIELDS.includes(field)) {
      issues.push(`unknown-field:${field}`);
    }
    const allowed = ALLOWED_VALUES.get(field);
    if (allowed && !allowed.has(value)) {
      issues.push(`invalid-value:${field}`);
    }
  }
  if (!/^WIN-[0-9]{4}$/.test(fields.get("result_id") ?? "")) {
    issues.push("invalid-result-id");
  }
  for (const field of ["artifact_sha256", "artifact_provenance_sha256", "artifact_manifest_sha256"]) {
    if (!isSha256(fields.get(field) ?? "")) {
      issues.push(`invalid-sha256:${field}`);
    }
  }
  if (!/^[0-9a-f]{7,40}$/i.test(fields.get("source_commit") ?? "")) {
    issues.push("invalid-source-commit");
  }
  const nonClaims = new Set((fields.get("non_claims_confirmed") ?? "").split("#").filter(Boolean));
  if (!sameSet(nonClaims, REQUIRED_NON_CLAIMS)) {
    issues.push("non-claims-mismatch");
  }
  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`forbidden-content:${label}`);
    }
  }
  return { file, fields, issues, valid: issues.length === 0 };
}

function fieldEquals(result, field, value) {
  return result.fields.get(field) === value;
}

const results = collectResultFiles(process.argv.slice(2));
console.log(`results_found=${results.length}`);

if (results.length === 0) {
  console.log("accepted_windows_public_artifact_results=0");
  console.log("windows_real_runtime_smoke_passed=false");
  console.log("windows_public_artifact_ready=false");
  console.log("status=waiting-for-real-windows-public-artifact-results");
  process.exit(0);
}

const validated = results.map(validateResult);
let failures = 0;
for (const result of validated) {
  const name = path.basename(result.file);
  if (result.valid) {
    console.log(`ok ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name} ${result.issues.join(",")}`);
  }
}

if (failures > 0) {
  console.log("status=invalid-windows-public-artifact-results");
  process.exit(1);
}

const allPass = validated.every((result) =>
  PASS_FIELDS.every((field) => fieldEquals(result, field, "pass")),
);
const reviewComplete = validated.every((result) =>
  fieldEquals(result, "public_copy_reviewed", "true") &&
  fieldEquals(result, "checksum_provenance_verified", "true") &&
  fieldEquals(result, "support_diagnostics_reviewed", "true"),
);

console.log(`accepted_windows_public_artifact_results=${validated.length}`);
console.log(`windows_real_runtime_smoke_passed=${allPass}`);
console.log(`windows_public_artifact_candidate_requires_review=${allPass && reviewComplete}`);
console.log("windows_public_artifact_ready=false");
console.log("windows_installer_ready=false");
console.log("windows_public_artifact_upload_allowed=false");
console.log("windows_public_artifact_ready_reason=manual-review-and-release-gate-update-required");

if (!allPass) {
  console.log("status=windows-public-artifact-results-need-required-smoke-coverage");
} else if (!reviewComplete) {
  console.log("status=windows-public-artifact-results-need-public-copy-provenance-support-review");
} else {
  console.log("status=windows-public-artifact-candidate-requires-review");
}
