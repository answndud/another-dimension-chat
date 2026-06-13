#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_REPORT_DIR = path.join(process.cwd(), "docs", "redacted-field-reports");

const REQUIRED_FIELDS = Object.freeze([
  "app_version",
  "build_channel",
  "build_commit",
  "platform_pair",
  "checksum_result",
  "install_path_reached",
  "flow_scope",
  "network_condition_class",
  "run_count",
  "clean_install_checksum_status",
  "first_launch_warning_status",
  "profile_create_unlock_status",
  "invite_verify_status",
  "manual_envelope_round_trip_status",
  "retry_cancel_recovery_status",
  "restart_resume_status",
  "offline_online_transition_status",
  "failed_delivery_recovery_status",
  "delete_wipe_lifecycle_status",
  "public_diagnostics_copy_status",
  "required_flow_status",
  "failure_class",
  "recovery_next_action",
  "app_launch_network_stayed_false",
  "default_transport_path",
  "non_claims_confirmed",
]);

const FLOW_STATUS_FIELDS = Object.freeze([
  "clean_install_checksum_status",
  "first_launch_warning_status",
  "profile_create_unlock_status",
  "invite_verify_status",
  "manual_envelope_round_trip_status",
  "retry_cancel_recovery_status",
  "restart_resume_status",
  "offline_online_transition_status",
  "failed_delivery_recovery_status",
  "delete_wipe_lifecycle_status",
  "public_diagnostics_copy_status",
  "required_flow_status",
]);

const ALLOWED_VALUES = new Map([
  ["platform_pair", new Set(["macos-to-macos"])],
  ["checksum_result", new Set(["pass", "fail", "not-run"])],
  ["install_path_reached", new Set(["download", "checksum", "mount", "copy", "manual-allow", "first-launch"])],
  ["flow_scope", new Set(["same-machine", "local-two-instance", "two-machine-same-network", "two-machine-different-network"])],
  ["network_condition_class", new Set(["offline", "same-lan", "different-networks", "transient-failure", "not-applicable"])],
  ["failure_class", new Set([
    "checksum-install-failure",
    "macos-manual-allow",
    "profile-locked",
    "malformed-payload",
    "replay-rejected",
    "transport-unavailable",
    "policy-blocked",
    "lifecycle-confirmation-required",
    "desktop-state-drift",
    "unknown-redacted",
  ])],
  ["app_launch_network_stayed_false", new Set(["true", "false"])],
  ["default_transport_path", new Set(["local-manual-encrypted-envelope-exchange"])],
]);

for (const field of FLOW_STATUS_FIELDS) {
  ALLOWED_VALUES.set(field, new Set(["pass", "fail", "partial", "not-run"]));
}

const REQUIRED_NON_CLAIMS = Object.freeze([
  "unsigned-experimental-public-beta",
  "sensitive-communication-prohibited",
  "not-audited",
  "not-production-ready",
]);

const FORBIDDEN_PATTERNS = Object.freeze([
  [/\.onion\b/i, "onion-endpoint"],
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bADENDPOINT[A-Z0-9]*\b/i, "endpoint-payload"],
  [/\bpassphrase\b/i, "passphrase"],
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop)\//, "local-path"],
  [/\bobfs4\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\bbridge\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\b(raw log|crash dump|private key|key material)\b/i, "private-debug-data"],
]);

function collectReportFiles(inputs) {
  const targets = inputs.length > 0 ? inputs : [DEFAULT_REPORT_DIR];
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

function validateReport(file) {
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
  const runCount = Number.parseInt(fields.get("run_count") ?? "", 10);
  if (!Number.isInteger(runCount) || runCount < 1) {
    issues.push("invalid-run-count");
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
  console.log("accepted_production_field_reports=0");
  console.log("macos_two_machine_real_user_flow_repeated=false");
  console.log("different_networks_covered=false");
  console.log("restart_resume_covered=false");
  console.log("offline_online_transition_covered=false");
  console.log("failed_delivery_recovery_documented=false");
  console.log("production_field_evidence_ready=false");
  console.log("status=waiting-for-redacted-field-reports");
  process.exit(0);
}

const validated = reports.map(validateReport);
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
  console.log("status=invalid-redacted-field-reports");
  process.exit(1);
}

const productionReports = validated.filter((report) =>
  ["two-machine-same-network", "two-machine-different-network"].includes(report.fields.get("flow_scope")),
);
const differentNetworksCovered = productionReports.some((report) =>
  fieldEquals(report, "flow_scope", "two-machine-different-network") ||
  fieldEquals(report, "network_condition_class", "different-networks"),
);
const allRequiredFlowPassed = productionReports.every((report) =>
  FLOW_STATUS_FIELDS.every((field) => fieldEquals(report, field, "pass")),
);
const launchNetworkStayedFalse = productionReports.every((report) =>
  fieldEquals(report, "app_launch_network_stayed_false", "true"),
);
const repeated = productionReports.length >= 2;

console.log(`accepted_production_field_reports=${productionReports.length}`);
console.log(`macos_two_machine_real_user_flow_repeated=${repeated}`);
console.log(`different_networks_covered=${differentNetworksCovered}`);
console.log(`restart_resume_covered=${productionReports.some((report) => fieldEquals(report, "restart_resume_status", "pass"))}`);
console.log(`offline_online_transition_covered=${productionReports.some((report) => fieldEquals(report, "offline_online_transition_status", "pass"))}`);
console.log(`failed_delivery_recovery_documented=${productionReports.some((report) => fieldEquals(report, "failed_delivery_recovery_status", "pass"))}`);
console.log("production_field_evidence_ready=false");
console.log("production_field_evidence_ready_reason=manual-review-and-stable-gate-update-required");

if (!repeated) {
  console.log("status=waiting-for-repeated-two-machine-reports");
} else if (!differentNetworksCovered) {
  console.log("status=waiting-for-different-network-report");
} else if (!allRequiredFlowPassed || !launchNetworkStayedFalse) {
  console.log("status=field-reports-need-required-flow-coverage");
} else {
  console.log("status=redacted-field-evidence-candidate-requires-review");
}
