#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DIR = path.join(process.cwd(), "docs", "final-100-evidence");

const REQUIRED_GROUPS = Object.freeze([
  "macos",
  "windows",
  "android",
  "ios",
  "security",
  "external",
  "claim_discipline",
]);

const REQUIRED_TRUE_FIELDS = Object.freeze({
  macos: [
    "developer_id_signed",
    "notarized",
    "stapled",
    "spctl_assess_passed",
    "dmg_mounted_app_found",
    "dmg_contained_app_codesign_verify_passed",
    "dmg_contained_app_gatekeeper_assess_passed",
    "dmg_contained_app_matches_signed_source_app",
    "gatekeeper_clean_open_observed",
    "release_distribution_manifest_verified",
    "representative_usability_completed",
  ],
  windows: [
    "real_runtime_smoke_passed",
    "webview2_runtime_verified",
    "public_artifact_manifest_verified",
  ],
  android: [
    "real_device_smoke_passed",
    "shared_core_flow_verified",
    "apk_or_aab_manifest_verified",
    "backup_exclusion_verified",
  ],
  ios: [
    "real_device_smoke_passed",
    "shared_core_flow_verified",
    "ipa_or_testflight_manifest_verified",
    "minimal_entitlements_reviewed",
    "privacy_labels_reviewed",
  ],
  security: [
    "production_e2ee_reviewed",
    "key_management_reviewed",
    "storage_lifecycle_reviewed",
    "default_transport_ready",
    "redacted_diagnostics_reviewed",
  ],
  external: [
    "named_external_review_completed",
    "audit_completed",
    "critical_high_findings_closed",
    "repeated_real_field_reports_available",
  ],
  claim_discipline: [
    "public_claim_may_not_exceed_evidence",
    "release_copy_reviewed",
    "support_copy_reviewed",
  ],
});

const SHA_FIELDS = Object.freeze({
  macos: ["artifact_sha256", "distribution_manifest_sha256"],
  windows: ["artifact_sha256", "artifact_manifest_sha256"],
  android: ["artifact_sha256", "artifact_manifest_sha256"],
  ios: ["artifact_sha256", "artifact_manifest_sha256"],
});

const REQUIRED_EVIDENCE_FILES = Object.freeze({
  macos: [
    "artifact_provenance",
    "distribution_manifest",
    "gatekeeper_assessment",
    "dmg_contained_app_assessment",
    "representative_usability_reports",
  ],
  windows: ["artifact_manifest", "runtime_result"],
  android: ["artifact_manifest", "real_device_result"],
  ios: ["artifact_manifest", "real_device_result"],
  external: ["review_signoff", "audit_finding_tracker", "redacted_field_reports"],
  claim_discipline: ["release_copy_review", "support_copy_review"],
});

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
  [/\bsynthetic\b/i, "synthetic-evidence"],
  [/\bfabricated\b/i, "fabricated-evidence"],
  [/\blocal-only\b/i, "local-only-evidence"],
  [/\bsame-machine\b/i, "same-machine-evidence"],
]);

function collectFiles(inputs) {
  const targets = inputs.length > 0 ? inputs : [DEFAULT_DIR];
  const files = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      files.push(target);
    } else if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        if (entry.isFile() && /\.json$/i.test(entry.name)) {
          files.push(path.join(target, entry.name));
        }
      }
    }
  }
  return files.sort();
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

function isSha(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function evidencePath(baseDir, relativePath) {
  if (!relativePath || typeof relativePath !== "string") return "";
  if (path.isAbsolute(relativePath)) return "";
  const normalized = path.normalize(relativePath);
  if (normalized === "." || normalized.startsWith("..") || path.isAbsolute(normalized)) return "";
  return path.join(baseDir, normalized);
}

function validateEvidenceFileRef(baseDir, groupName, fieldName, value) {
  const prefix = `${groupName}.evidence_files.${fieldName}`;
  const issues = [];
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${prefix}:empty-array`];
    for (const [index, item] of value.entries()) {
      issues.push(...validateEvidenceFileRef(baseDir, groupName, `${fieldName}[${index}]`, item));
    }
    return issues;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [`${prefix}:missing-ref`];
  }
  const file = evidencePath(baseDir, value.path);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    issues.push(`${prefix}:missing-file`);
  }
  if (!isSha(value.sha256)) {
    issues.push(`${prefix}:invalid-sha256`);
  } else if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const actualSha = sha256File(file);
    if (actualSha !== value.sha256) {
      issues.push(`${prefix}:sha-mismatch`);
    }
    const text = fs.readFileSync(file, "utf8");
    for (const [pattern, label] of FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) issues.push(`${prefix}:forbidden-content:${label}`);
    }
  }
  return issues;
}

function collectEvidenceFilePaths(baseDir, value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectEvidenceFilePaths(baseDir, item));
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const file = evidencePath(baseDir, value.path);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return [];
  return [file];
}

function validateRepresentativeUsabilityReports(ledger, file, { requireCurrentHead }) {
  const refs = ledger.evidence_files?.macos?.representative_usability_reports;
  const reportFiles = collectEvidenceFilePaths(path.dirname(file), refs);
  if (reportFiles.length === 0) return [];
  const validator = path.join(process.cwd(), "scripts", "validate_representative_usability_reports.mjs");
  const issues = [];
  let output = "";
  try {
    output = execFileSync(process.execPath, [validator, ...reportFiles], {
      encoding: "utf8",
      env: {
        ...process.env,
        AD_REQUIRE_CURRENT_HEAD: requireCurrentHead ? "1" : process.env.AD_REQUIRE_CURRENT_HEAD ?? "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return ["macos.representative_usability_reports:validator-failed"];
  }
  if (!output.includes("representative_usability_sample_threshold_met=true")) {
    issues.push("macos.representative_usability_reports:sample-threshold-not-met");
  }
  if (!output.includes("representative_usability_required_tasks_passed=true")) {
    issues.push("macos.representative_usability_reports:required-tasks-not-passed");
  }
  if (!output.includes("app_launch_network_stayed_false_all_reports=true")) {
    issues.push("macos.representative_usability_reports:network-boundary-not-proven");
  }
  if (!output.includes("status=representative-usability-evidence-candidate-requires-review")) {
    issues.push("macos.representative_usability_reports:not-candidate");
  }
  return issues;
}

function validateRedactedFieldReports(ledger, file) {
  const refs = ledger.evidence_files?.external?.redacted_field_reports;
  const reportFiles = collectEvidenceFilePaths(path.dirname(file), refs);
  if (reportFiles.length === 0) return [];
  const validator = path.join(process.cwd(), "scripts", "validate_redacted_field_reports.mjs");
  const issues = [];
  let output = "";
  try {
    output = execFileSync(process.execPath, [validator, ...reportFiles], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return ["external.redacted_field_reports:validator-failed"];
  }
  if (!output.includes("accepted_production_field_reports=4")) {
    issues.push("external.redacted_field_reports:below-threshold");
  }
  if (!output.includes("required_platform_pairs_covered=true")) {
    issues.push("external.redacted_field_reports:required-platform-pairs-not-covered");
  }
  if (!output.includes("different_networks_covered=true")) {
    issues.push("external.redacted_field_reports:different-networks-not-covered");
  }
  if (!output.includes("status=redacted-field-evidence-candidate-requires-review")) {
    issues.push("external.redacted_field_reports:not-candidate");
  }
  return issues;
}

function validateGroup(ledger, groupName) {
  const group = ledger[groupName];
  const issues = [];
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    return [`missing-group:${groupName}`];
  }
  for (const field of REQUIRED_TRUE_FIELDS[groupName] ?? []) {
    if (group[field] !== true) {
      issues.push(`${groupName}.${field}:not-true`);
    }
  }
  for (const field of SHA_FIELDS[groupName] ?? []) {
    if (!isSha(group[field])) {
      issues.push(`${groupName}.${field}:invalid-sha256`);
    }
  }
  return issues;
}

function validateEvidenceFiles(ledger, file) {
  const issues = [];
  const baseDir = path.dirname(file);
  const evidenceFiles = ledger.evidence_files;
  if (!evidenceFiles || typeof evidenceFiles !== "object" || Array.isArray(evidenceFiles)) {
    return ["missing-evidence-files"];
  }
  for (const [groupName, fields] of Object.entries(REQUIRED_EVIDENCE_FILES)) {
    const groupRefs = evidenceFiles[groupName];
    if (!groupRefs || typeof groupRefs !== "object" || Array.isArray(groupRefs)) {
      issues.push(`missing-evidence-file-group:${groupName}`);
      continue;
    }
    for (const field of fields) {
      issues.push(...validateEvidenceFileRef(baseDir, groupName, field, groupRefs[field]));
    }
  }
  const usabilityRefs = evidenceFiles.macos?.representative_usability_reports;
  if (!Array.isArray(usabilityRefs) || usabilityRefs.length < 3) {
    issues.push("macos.representative_usability_reports:below-threshold");
  }
  const fieldRefs = evidenceFiles.external?.redacted_field_reports;
  if (!Array.isArray(fieldRefs) || fieldRefs.length < 4) {
    issues.push("external.redacted_field_reports:below-threshold");
  }
  return issues;
}

function validateLedger(file, { requireCurrentHead, head }) {
  const text = fs.readFileSync(file, "utf8");
  const issues = [];
  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) issues.push(`forbidden-content:${label}`);
  }
  let ledger;
  try {
    ledger = JSON.parse(text);
  } catch {
    return { file, valid: false, issues: ["invalid-json"] };
  }
  if (ledger.schema_version !== "final-100-evidence-ledger-v1") {
    issues.push("invalid-schema-version");
  }
  if (!/^[0-9a-f]{7,40}$/i.test(ledger.source_commit ?? "")) {
    issues.push("invalid-source-commit");
  }
  if (requireCurrentHead && ledger.source_commit !== head) {
    issues.push("source-commit-not-current-head");
  }
  if (ledger.evidence_origin !== "real-external-and-device-evidence") {
    issues.push("invalid-evidence-origin");
  }
  if (ledger.final_100_claim_gate_ready !== true) {
    issues.push("final-gate-not-ready");
  }
  if (ledger.macos_public_app_100_claim_allowed !== false) {
    issues.push("macos-100-claim-must-stay-false");
  }
  if (ledger.whole_target_standard_100_claim_allowed !== false) {
    issues.push("target-standard-100-claim-must-stay-false");
  }
  if (ledger.production_ready_claim_allowed !== false) {
    issues.push("production-ready-claim-must-stay-false");
  }
  if (ledger.audited_claim_allowed !== false) {
    issues.push("audited-claim-must-stay-false");
  }
  if (ledger.sensitive_communication_allowed !== false) {
    issues.push("sensitive-communication-must-stay-false");
  }
  for (const groupName of REQUIRED_GROUPS) {
    issues.push(...validateGroup(ledger, groupName));
  }
  issues.push(...validateEvidenceFiles(ledger, file));
  issues.push(...validateRepresentativeUsabilityReports(ledger, file, { requireCurrentHead }));
  issues.push(...validateRedactedFieldReports(ledger, file));
  const fieldReportCount = ledger.external?.accepted_field_report_count;
  if (!Number.isInteger(fieldReportCount) || fieldReportCount < 4) {
    issues.push("external.accepted_field_report_count:below-threshold");
  }
  const usabilityCount = ledger.macos?.representative_usability_report_count;
  if (!Number.isInteger(usabilityCount) || usabilityCount < 3) {
    issues.push("macos.representative_usability_report_count:below-threshold");
  }
  return { file, valid: issues.length === 0, issues };
}

const rawArgs = process.argv.slice(2);
const requireCurrentHead =
  rawArgs.includes("--require-current-head") || process.env.AD_REQUIRE_CURRENT_HEAD === "1";
const inputs = rawArgs.filter((arg) => arg !== "--require-current-head");
const files = collectFiles(inputs);
console.log(`final_100_evidence_ledger_current_head_required=${requireCurrentHead}`);
console.log(`final_100_evidence_ledger_files_found=${files.length}`);

if (files.length === 0) {
  console.log("accepted_final_100_evidence_ledgers=0");
  console.log("final_100_evidence_ledger_child_files_content_redacted=true");
  console.log("final_100_evidence_ledger_requires_valid_representative_usability_reports=true");
  console.log("final_100_evidence_ledger_requires_valid_redacted_field_reports=true");
  console.log("final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true");
  console.log("macos_public_app_100_claim_allowed=false");
  console.log("whole_target_standard_100_claim_allowed=false");
  console.log("production_ready_claim_allowed=false");
  console.log("audited_claim_allowed=false");
  console.log("sensitive_communication_allowed=false");
  console.log("status=waiting-for-final-100-evidence-ledger");
  process.exit(0);
}

let failures = 0;
const head = requireCurrentHead ? currentHead() : "";
for (const result of files.map((file) => validateLedger(file, { requireCurrentHead, head }))) {
  if (result.valid) {
    console.log(`ok ${path.basename(result.file)}`);
  } else {
    failures += 1;
    console.log(`FAIL ${path.basename(result.file)} ${result.issues.join(",")}`);
  }
}

if (failures > 0) {
  console.log("status=invalid-final-100-evidence-ledger");
  process.exit(1);
}

console.log(`accepted_final_100_evidence_ledgers=${files.length}`);
console.log("final_100_evidence_ledger_child_files_sha_verified=true");
console.log("final_100_evidence_ledger_child_files_content_redacted=true");
console.log("final_100_evidence_ledger_requires_valid_representative_usability_reports=true");
console.log("final_100_evidence_ledger_requires_valid_redacted_field_reports=true");
console.log("final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true");
console.log("final_100_evidence_candidate_requires_owner_claim_decision=true");
console.log("macos_public_app_100_claim_allowed=false");
console.log("whole_target_standard_100_claim_allowed=false");
console.log("production_ready_claim_allowed=false");
console.log("audited_claim_allowed=false");
console.log("sensitive_communication_allowed=false");
console.log("status=final-100-evidence-candidate-requires-review");
