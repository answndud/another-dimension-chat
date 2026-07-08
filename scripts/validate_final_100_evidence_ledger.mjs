#!/usr/bin/env node
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

function isSha(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
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

function validateLedger(file) {
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

const files = collectFiles(process.argv.slice(2));
console.log(`final_100_evidence_ledger_files_found=${files.length}`);

if (files.length === 0) {
  console.log("accepted_final_100_evidence_ledgers=0");
  console.log("macos_public_app_100_claim_allowed=false");
  console.log("whole_target_standard_100_claim_allowed=false");
  console.log("production_ready_claim_allowed=false");
  console.log("audited_claim_allowed=false");
  console.log("sensitive_communication_allowed=false");
  console.log("status=waiting-for-final-100-evidence-ledger");
  process.exit(0);
}

let failures = 0;
for (const result of files.map(validateLedger)) {
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
console.log("final_100_evidence_candidate_requires_owner_claim_decision=true");
console.log("macos_public_app_100_claim_allowed=false");
console.log("whole_target_standard_100_claim_allowed=false");
console.log("production_ready_claim_allowed=false");
console.log("audited_claim_allowed=false");
console.log("sensitive_communication_allowed=false");
console.log("status=final-100-evidence-candidate-requires-review");
