#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_REPORT_DIR = path.join(process.cwd(), "docs", "representative-usability-reports");
const NON_REPORT_FILE_NAMES = new Set(["README.md"]);

const REQUIRED_FIELDS = Object.freeze([
  "participant_label",
  "participant_dedup_token",
  "representative_user_type",
  "app_version",
  "build_channel",
  "build_commit",
  "artifact_sha256",
  "distribution_manifest_sha256",
  "platform",
  "session_scope",
  "consent_notice_acknowledged",
  "non_sensitive_use_confirmed",
  "clean_install_checksum_status",
  "first_launch_warning_status",
  "profile_create_unlock_status",
  "invite_join_status",
  "safety_verification_status",
  "manual_envelope_exchange_status",
  "retry_cancel_recovery_status",
  "local_delete_wipe_status",
  "public_diagnostics_copy_status",
  "redacted_support_report_copy_status",
  "support_report_raw_logs_allowed",
  "support_report_private_payload_allowed",
  "support_report_key_material_allowed",
  "recovery_next_action_understood",
  "required_task_status",
  "blocker_class",
  "redacted_blocker_summary",
  "app_launch_network_stayed_false",
  "default_transport_path",
  "non_claims_confirmed",
]);

const TASK_STATUS_FIELDS = Object.freeze([
  "clean_install_checksum_status",
  "first_launch_warning_status",
  "profile_create_unlock_status",
  "invite_join_status",
  "safety_verification_status",
  "manual_envelope_exchange_status",
  "retry_cancel_recovery_status",
  "local_delete_wipe_status",
  "public_diagnostics_copy_status",
  "redacted_support_report_copy_status",
  "recovery_next_action_understood",
  "required_task_status",
]);

const ALLOWED_VALUES = new Map([
  ["representative_user_type", new Set(["family", "friend", "personal-client", "non-developer"])],
  ["platform", new Set(["macos"])],
  ["session_scope", new Set(["first-run-invite-manual-envelope-recovery-diagnostics-delete"])],
  ["consent_notice_acknowledged", new Set(["true"])],
  ["non_sensitive_use_confirmed", new Set(["true"])],
  ["support_report_raw_logs_allowed", new Set(["false"])],
  ["support_report_private_payload_allowed", new Set(["false"])],
  ["support_report_key_material_allowed", new Set(["false"])],
  ["blocker_class", new Set([
    "none-redacted",
    "install-checksum",
    "first-launch-warning",
    "profile-unlock",
    "invite-join",
    "safety-verification",
    "manual-envelope",
    "retry-cancel",
    "local-delete-wipe",
    "diagnostics-copy",
    "recovery-copy",
    "unknown-redacted",
  ])],
  ["app_launch_network_stayed_false", new Set(["true", "false"])],
  ["default_transport_path", new Set(["local-manual-encrypted-envelope-exchange"])],
]);

for (const field of TASK_STATUS_FIELDS) {
  ALLOWED_VALUES.set(field, new Set(["pass", "fail", "partial", "not-run"]));
}

const REQUIRED_NON_CLAIMS = Object.freeze([
  "unsigned-experimental-public-beta",
  "sensitive-communication-prohibited",
  "not-audited",
  "not-production-ready",
]);

const FORBIDDEN_PATTERNS = Object.freeze([
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "email-address"],
  [/\b(?:\+?\d[\d .()-]{7,}\d)\b/, "phone-number"],
  [/\.onion\b/i, "onion-endpoint"],
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bADENDPOINT[A-Z0-9]*\b/i, "endpoint-payload"],
  [/\bsafety phrase\b/i, "safety-phrase"],
  [/\bpassphrase\b/i, "passphrase"],
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop)\//, "local-path"],
  [/\bobfs4\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\bbridge\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\b(raw log|crash dump|private key|key material)\b/i, "private-debug-data"],
]);

const requireCurrentHead = process.env.AD_REQUIRE_CURRENT_HEAD === "1";

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

function collectReportFiles(inputs) {
  const targets = inputs.length > 0 ? inputs : [DEFAULT_REPORT_DIR];
  const files = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      if (NON_REPORT_FILE_NAMES.has(path.basename(target))) continue;
      files.push(target);
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (NON_REPORT_FILE_NAMES.has(entry.name)) continue;
      if (!/\.(md|txt)$/i.test(entry.name)) continue;
      files.push(path.join(target, entry.name));
    }
  }
  return files.sort();
}

function parseReport(text) {
  const fields = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([a-z][a-z0-9_]*)=(.*)$/);
    if (!match) continue;
    fields.set(match[1], match[2].trim());
  }
  return fields;
}

function isUnresolved(value) {
  return (
    value === "" ||
    value.includes("|") ||
    /^tbd$/i.test(value) ||
    /^todo$/i.test(value) ||
    /^unknown$/i.test(value)
  );
}

function sameSet(actual, expected) {
  return actual.size === expected.length && expected.every((item) => actual.has(item));
}

function isSha(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function validateReport(file, { head }) {
  const text = fs.readFileSync(file, "utf8");
  const fields = parseReport(text);
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
  if (!/^[A-Z][A-Z0-9_-]{1,15}$/.test(fields.get("participant_label") ?? "")) {
    issues.push("invalid-participant-label");
  }
  if (!/^dedup_[a-f0-9]{32,64}$/i.test(fields.get("participant_dedup_token") ?? "")) {
    issues.push("invalid-participant-dedup-token");
  }
  if (!/^[a-f0-9]{7,40}$/i.test(fields.get("build_commit") ?? "")) {
    issues.push("invalid-build-commit");
  } else if (requireCurrentHead && fields.get("build_commit") !== head) {
    issues.push("build-commit-not-current-head");
  }
  for (const field of ["artifact_sha256", "distribution_manifest_sha256"]) {
    if (!isSha(fields.get(field) ?? "")) {
      issues.push(`invalid-sha256:${field}`);
    }
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
  return {
    file,
    fields,
    issues,
    valid: issues.length === 0,
  };
}

function fieldEquals(report, field, value) {
  return report.fields.get(field) === value;
}

const reports = collectReportFiles(process.argv.slice(2));
console.log(`reports_found=${reports.length}`);

if (reports.length === 0) {
  console.log("accepted_representative_usability_reports=0");
  console.log("representative_usability_sample_threshold_met=false");
  console.log("evidence_intake_decision=waiting");
  console.log("next_owner_action=collect-real-redacted-representative-usability-reports");
  console.log("missing_evidence_is_next_owner_action=true");
  console.log("usability_study_completed=false");
  console.log("representative_usability_evidence_completed=false");
  console.log("status=waiting-for-representative-usability-reports");
  process.exit(0);
}

const head = requireCurrentHead ? currentHead() : "";
const validated = reports.map((file) => validateReport(file, { head }));
let failures = 0;
for (const report of validated) {
  const name = path.basename(report.file);
  if (report.valid) {
    console.log(`ok ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name} ${report.issues.join(",")}`);
  }
}

if (failures > 0) {
  console.log("evidence_intake_decision=rejected");
  console.log("next_owner_action=fix-redaction-or-required-fields");
  console.log("missing_evidence_is_next_owner_action=true");
  console.log("status=invalid-representative-usability-reports");
  process.exit(1);
}

const participantLabels = new Set(validated.map((report) => report.fields.get("participant_label")));
const participantDedupTokens = new Set(validated.map((report) => report.fields.get("participant_dedup_token")));
const uniqueParticipants = participantLabels.size === validated.length;
const uniqueDedupTokens = participantDedupTokens.size === validated.length;
const allRequiredTasksPassed = validated.every((report) =>
  TASK_STATUS_FIELDS.every((field) => fieldEquals(report, field, "pass")),
);
const allLaunchNetworkStayedFalse = validated.every((report) =>
  fieldEquals(report, "app_launch_network_stayed_false", "true"),
);
const sampleThresholdMet =
  validated.length >= 3 && validated.length <= 5 && uniqueParticipants && uniqueDedupTokens;

console.log(`accepted_representative_usability_reports=${validated.length}`);
console.log(`representative_usability_unique_participants=${uniqueParticipants}`);
console.log(`representative_usability_unique_dedup_tokens=${uniqueDedupTokens}`);
console.log(`representative_usability_sample_threshold_met=${sampleThresholdMet}`);
console.log(`representative_usability_required_tasks_passed=${allRequiredTasksPassed}`);
console.log(`app_launch_network_stayed_false_all_reports=${allLaunchNetworkStayedFalse}`);
console.log("usability_study_completed=false");
console.log("representative_usability_evidence_completed=false");
console.log("representative_usability_evidence_ready_reason=manual-review-and-stable-gate-update-required");

if (!sampleThresholdMet) {
  console.log("evidence_intake_decision=waiting");
  console.log("next_owner_action=collect-3-to-5-unique-representative-usability-reports");
  console.log("missing_evidence_is_next_owner_action=true");
  console.log("status=waiting-for-3-to-5-unique-representative-usability-reports");
} else if (!allRequiredTasksPassed || !allLaunchNetworkStayedFalse) {
  console.log("evidence_intake_decision=rejected");
  console.log("next_owner_action=rerun-required-task-flow-with-redacted-report");
  console.log("missing_evidence_is_next_owner_action=true");
  console.log("status=representative-usability-reports-need-required-task-coverage");
} else {
  console.log("evidence_intake_decision=candidate_requires_review");
  console.log("next_owner_action=manual-review-and-stable-gate-update-required");
  console.log("missing_evidence_is_next_owner_action=true");
  console.log("status=representative-usability-evidence-candidate-requires-review");
}
