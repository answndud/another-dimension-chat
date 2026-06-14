#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
  "artifact_app_version",
  "artifact_release_class",
  "artifact_path_redacted",
  "install_path_class",
  "app_data_resolver_class",
  "artifact_manifest_file",
  "artifact_sha256",
  "artifact_provenance_sha256",
  "artifact_manifest_sha256",
  "source_commit",
  "webview2_rendered",
  "app_data_root_redacted",
  "path_separator_behavior",
  "encrypted_store_profile_unlock",
  "profile_create_unlock",
  "local_deletion_behavior",
  "redacted_diagnostics_only",
  "redacted_diagnostics_copy",
  "engine_sidecar_status_runtime_checked",
  "engine_sidecar_status_failure_class",
  "engine_sidecar_status_contract_valid",
  "engine_sidecar_status_redacted_diagnostics_only",
  "engine_sidecar_manual_self_test_runtime_checked",
  "engine_sidecar_manual_self_test_failure_class",
  "engine_sidecar_manual_self_test_contract_valid",
  "engine_sidecar_manual_self_test_passed",
  "engine_sidecar_manual_self_test_runtime_available",
  "engine_sidecar_raw_path_returned",
  "engine_sidecar_stdout_returned",
  "engine_sidecar_stderr_returned",
  "engine_sidecar_app_launch_network_allowed",
  "engine_sidecar_room_open_network_allowed",
  "engine_sidecar_local_runtime_promoted_to_delivery_proof",
  "explicit_user_action_before_network",
  "app_launch_network",
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
  "profile_create_unlock",
  "local_deletion_behavior",
  "redacted_diagnostics_only",
  "redacted_diagnostics_copy",
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
  ["artifact_release_class", new Set(["unsigned-windows-beta", "signed-windows-rc", "stable"])],
  ["artifact_path_redacted", new Set(["true"])],
  ["install_path_class", new Set(["redacted-standard-user-install", "redacted-portable-run", "redacted-installer-default"])],
  ["app_data_resolver_class", new Set(["tauri-app-data"])],
  ["installer_signing_decision", new Set(["unsigned-hold", "signtool-signed", "store-signed", "not-applicable"])],
  ["smartscreen_reputation_claim", new Set(["false"])],
  ["app_launch_network", new Set(["false"])],
  ["engine_sidecar_status_runtime_checked", new Set(["true"])],
  ["engine_sidecar_status_failure_class", new Set(["none"])],
  ["engine_sidecar_status_contract_valid", new Set(["true"])],
  ["engine_sidecar_status_redacted_diagnostics_only", new Set(["true"])],
  ["engine_sidecar_manual_self_test_runtime_checked", new Set(["true"])],
  ["engine_sidecar_manual_self_test_failure_class", new Set(["none"])],
  ["engine_sidecar_manual_self_test_contract_valid", new Set(["true"])],
  ["engine_sidecar_manual_self_test_passed", new Set(["true"])],
  ["engine_sidecar_manual_self_test_runtime_available", new Set(["true"])],
  ["engine_sidecar_raw_path_returned", new Set(["false"])],
  ["engine_sidecar_stdout_returned", new Set(["false"])],
  ["engine_sidecar_stderr_returned", new Set(["false"])],
  ["engine_sidecar_app_launch_network_allowed", new Set(["false"])],
  ["engine_sidecar_room_open_network_allowed", new Set(["false"])],
  ["engine_sidecar_local_runtime_promoted_to_delivery_proof", new Set(["false"])],
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
  [/%LOCALAPPDATA%/i, "windows-local-app-data"],
  [/AppData\\Local\\/i, "windows-local-app-data"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop)\//, "local-path"],
  [/\bdocs\/(?:PLAN|DONE|product|security|research)\b/i, "private-docs"],
  [/\b(?:public-release|beta-artifacts|target)\/[^\s]*/i, "generated-artifact-path"],
  [/!\[[^\]]*(?:room|message|profile|invite|private)[^\]]*\]\([^)]+\)/i, "private-screenshot"],
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

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function relativeEvidenceFile(baseFile, relativePath) {
  if (!relativePath || typeof relativePath !== "string") return "";
  if (path.isAbsolute(relativePath)) return "";
  const normalized = path.normalize(relativePath);
  if (normalized === "." || normalized.startsWith("..") || path.isAbsolute(normalized)) return "";
  return path.join(path.dirname(baseFile), normalized);
}

function relativeSibling(baseFile, siblingName) {
  if (!siblingName || typeof siblingName !== "string") return "";
  if (siblingName !== path.basename(siblingName)) return "";
  return path.join(path.dirname(baseFile), siblingName);
}

function sameSet(actual, expected) {
  return actual.size === expected.length && expected.every((item) => actual.has(item));
}

function validateArtifactEvidenceBundle(file, fields, { requireCurrentHead = false } = {}) {
  const issues = [];
  const manifestFile = relativeEvidenceFile(file, fields.get("artifact_manifest_file"));
  if (!manifestFile || !fs.existsSync(manifestFile) || !fs.statSync(manifestFile).isFile()) {
    return ["artifact_manifest_file:missing-file"];
  }
  if (sha256File(manifestFile) !== fields.get("artifact_manifest_sha256")) {
    issues.push("artifact-manifest-sha-mismatch");
  }
  const validator = path.join(process.cwd(), "scripts", "validate_windows_artifact_manifest.mjs");
  try {
    const output = execFileSync(process.execPath, [validator, manifestFile], {
      encoding: "utf8",
      env: {
        ...process.env,
        AD_REQUIRE_CURRENT_HEAD: requireCurrentHead ? "1" : process.env.AD_REQUIRE_CURRENT_HEAD ?? "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (!output.includes("accepted_windows_artifact_manifests=1")) {
      issues.push("artifact-manifest-not-accepted");
    }
    if (!output.includes("windows_artifact_package_structure_verified=true")) {
      issues.push("artifact-manifest-package-structure-not-verified");
    }
  } catch {
    issues.push("artifact-manifest-validator-failed");
  }

  const manifest = readJson(manifestFile);
  if (!manifest || !Array.isArray(manifest.artifacts)) {
    issues.push("artifact-manifest-invalid-json");
    return issues;
  }
  if (manifest.source_commit !== fields.get("source_commit")) {
    issues.push("artifact-manifest-source-commit-mismatch");
  }
  if (manifest.version !== fields.get("artifact_app_version")) {
    issues.push("artifact-manifest-version-mismatch");
  }
  if (manifest.release_class !== fields.get("artifact_release_class")) {
    issues.push("artifact-manifest-release-class-mismatch");
  }
  if (manifest.app_data_resolver !== fields.get("app_data_resolver_class")) {
    issues.push("artifact-manifest-app-data-resolver-mismatch");
  }
  const artifact = manifest.artifacts.find((entry) => entry?.sha256 === fields.get("artifact_sha256"));
  if (!artifact) {
    issues.push("artifact-sha-not-found-in-manifest");
    return issues;
  }
  const artifactFile = relativeSibling(manifestFile, artifact.filename);
  if (!artifactFile || !fs.existsSync(artifactFile) || !fs.statSync(artifactFile).isFile()) {
    issues.push("artifact-file-missing-from-manifest-directory");
  } else if (sha256File(artifactFile) !== fields.get("artifact_sha256")) {
    issues.push("artifact-file-sha-mismatch");
  }
  const provenanceFile = relativeSibling(manifestFile, artifact.provenance_file);
  if (!provenanceFile || !fs.existsSync(provenanceFile) || !fs.statSync(provenanceFile).isFile()) {
    issues.push("artifact-provenance-file-missing");
  } else if (sha256File(provenanceFile) !== fields.get("artifact_provenance_sha256")) {
    issues.push("artifact-provenance-sha-mismatch");
  }
  const signingDecision = fields.get("installer_signing_decision");
  if (signingDecision !== "not-applicable" && artifact.signing_status !== signingDecision) {
    issues.push("installer-signing-decision-mismatch");
  }
  if (artifact.webview2_runtime_required !== true) {
    issues.push("artifact-webview2-requirement-missing");
  }
  if (artifact.app_data_resolver !== fields.get("app_data_resolver_class")) {
    issues.push("artifact-app-data-resolver-mismatch");
  }
  if (artifact.encrypted_store_required !== true) {
    issues.push("artifact-encrypted-store-requirement-missing");
  }
  if (artifact.redacted_diagnostics_required !== true) {
    issues.push("artifact-redacted-diagnostics-requirement-missing");
  }
  if (artifact.auto_update !== false) {
    issues.push("artifact-auto-update-must-stay-false");
  }
  if (artifact.engine_sidecar_required !== true) {
    issues.push("artifact-engine-sidecar-required");
  }
  if (artifact.engine_sidecar_packaged !== true) {
    issues.push("artifact-engine-sidecar-not-packaged");
  }
  if (artifact.engine_sidecar_runtime_mode !== "manual-e2ee-engine-sidecar") {
    issues.push("artifact-engine-sidecar-runtime-mode-mismatch");
  }
  if (artifact.engine_sidecar_manual_self_test_required !== true) {
    issues.push("artifact-engine-sidecar-manual-self-test-not-required");
  }
  return issues;
}

function validateResult(file, { requireCurrentHead = false, head = "" } = {}) {
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
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(fields.get("artifact_app_version") ?? "")) {
    issues.push("invalid-artifact-app-version");
  }
  if (requireCurrentHead && fields.get("source_commit") !== head) {
    issues.push("source-commit-not-current-head");
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
  issues.push(...validateArtifactEvidenceBundle(file, fields, { requireCurrentHead }));
  return { file, fields, issues, valid: issues.length === 0 };
}

function fieldEquals(result, field, value) {
  return result.fields.get(field) === value;
}

const rawArgs = process.argv.slice(2);
const requireCurrentHead =
  rawArgs.includes("--require-current-head") || process.env.AD_REQUIRE_CURRENT_HEAD === "1";
const inputs = rawArgs.filter((arg) => arg !== "--require-current-head");
const results = collectResultFiles(inputs);
console.log(`windows_public_artifact_result_current_head_required=${requireCurrentHead}`);
console.log(`results_found=${results.length}`);

if (results.length === 0) {
  console.log("accepted_windows_public_artifact_results=0");
  console.log("windows_result_requires_valid_artifact_manifest=true");
  console.log("windows_real_runtime_smoke_passed=false");
  console.log("windows_public_artifact_ready=false");
  console.log("status=waiting-for-real-windows-public-artifact-results");
  process.exit(0);
}

const head = requireCurrentHead ? currentHead() : "";
const validated = results.map((file) => validateResult(file, { requireCurrentHead, head }));
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
console.log("windows_result_artifact_manifest_sha_verified=true");
console.log("windows_result_artifact_provenance_sha_verified=true");
console.log("windows_result_artifact_bytes_sha_verified=true");
console.log("windows_result_artifact_identity_verified=true");
console.log("windows_result_runtime_boundary_verified=true");
console.log("windows_result_engine_sidecar_diagnostics_verified=true");
console.log("windows_result_engine_sidecar_manual_self_test_verified=true");
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
