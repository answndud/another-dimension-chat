#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: scripts/high_risk_runtime_evidence_validate_once.sh <report.json|-> [report.json...]" >&2
  exit 2
fi

tmp_stdin=""
args=()
for arg in "$@"; do
  if [ "$arg" = "-" ]; then
    tmp_stdin="$(mktemp)"
    cat > "$tmp_stdin"
    args+=("$tmp_stdin")
  else
    args+=("$arg")
  fi
done
trap 'if [ -n "$tmp_stdin" ]; then rm -f "$tmp_stdin"; fi' EXIT

node - "${args[@]}" <<'NODE'
const fs = require("node:fs");

const allowed = new Set([
  "schema_version",
  "evidence_source",
  "runtime_evidence_accepted",
  "runtime_evidence_present",
  "readiness_condition_set",
  "readiness_missing_conditions",
  "safety_verification_ready",
  "high_risk_transport_runtime_ready",
  "emergency_controls_ready",
  "local_storage_evidence_ready",
  "release_integrity_ready",
  "primary_blocker",
  "failure_class",
  "explicit_user_action",
  "onion_only",
  "direct_fallback_attempted",
  "app_launch_bootstrap_attempted",
  "room_open_network_attempted",
  "endpoint_rotation_observed",
  "redacted_runtime_event_recorded",
  "clipboard_expiry_ready",
  "emergency_controls_reachable",
  "local_only_evidence",
  "fabricated_evidence",
  "forbidden_fields_present",
  "endpoint_value_recorded",
  "descriptor_recorded",
  "local_path_recorded",
  "payload_recorded",
  "key_material_recorded",
  "high_risk_public_claim_allowed",
  "high_risk_ready_claim_allowed",
]);

const appSummaryFields = [
  "readiness_condition_set",
  "readiness_missing_conditions",
  "evidence_source",
  "failure_class",
  "clipboard_expiry_ready",
  "emergency_controls_ready",
  "local_storage_evidence_ready",
  "release_integrity_ready",
];

const forbidden = [
  "onion_endpoint",
  "endpoint_payload",
  "descriptor",
  "descriptor_body",
  "envelope_payload",
  "message_body",
  "local_path",
  "profile_name",
  "passphrase",
  "private_key",
  "key_material",
  "raw_logs",
  "bridge_line",
];

const acceptedTrue = [
  "runtime_evidence_accepted",
  "runtime_evidence_present",
  "explicit_user_action",
  "onion_only",
  "endpoint_rotation_observed",
  "redacted_runtime_event_recorded",
  "clipboard_expiry_ready",
  "emergency_controls_reachable",
];

const requiredFalse = [
  "direct_fallback_attempted",
  "app_launch_bootstrap_attempted",
  "room_open_network_attempted",
  "local_only_evidence",
  "fabricated_evidence",
  "forbidden_fields_present",
  "endpoint_value_recorded",
  "descriptor_recorded",
  "local_path_recorded",
  "payload_recorded",
  "key_material_recorded",
  "high_risk_public_claim_allowed",
  "high_risk_ready_claim_allowed",
];

const failureClasses = new Set([
  "none",
  "bridge_config_missing",
  "bootstrap_timeout",
  "peer_unreachable",
  "stale_endpoint",
  "receive_owner_mismatch",
  "unknown_redacted",
]);

const readinessConditions = [
  "safety-verification",
  "high-risk-transport-runtime",
  "emergency-controls",
  "clipboard-expiry",
  "local-storage-evidence",
  "release-integrity",
];
const readinessConditionSet = readinessConditions.join("#");
const readinessFields = {
  "safety-verification": "safety_verification_ready",
  "high-risk-transport-runtime": "high_risk_transport_runtime_ready",
  "emergency-controls": "emergency_controls_ready",
  "clipboard-expiry": "clipboard_expiry_ready",
  "local-storage-evidence": "local_storage_evidence_ready",
  "release-integrity": "release_integrity_ready",
};
const readinessNextActions = {
  "safety-verification": "verify-safety-number",
  "high-risk-transport-runtime": "collect-real-redacted-runtime-report",
  "emergency-controls": "open-emergency-controls",
  "clipboard-expiry": "enable-clipboard-expiry",
  "local-storage-evidence": "check-local-storage-runtime-evidence",
  "release-integrity": "run-release-integrity-gate",
};

const issues = [];
const files = process.argv.slice(2);
let acceptedCount = 0;
const readinessMissing = new Set();
const decisions = new Set();
const nextOwnerActions = new Set();

function parseConditionList(value) {
  if (value === undefined || value === null || value === "" || value === "none") return [];
  return String(value).split("#").filter(Boolean);
}

function hasBool(report, key) {
  return report[key] === true || report[key] === "true";
}

function conditionMissingFromAppSummary(report, condition, reportedMissing) {
  if (condition === "safety-verification") return reportedMissing.includes(condition);
  if (condition === "high-risk-transport-runtime") return report.evidence_source !== "runtime-report";
  return !hasBool(report, readinessFields[condition]);
}

function inspectForbidden(value, path = "") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectForbidden(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.includes(key)) issues.push(`forbidden-field:${path}${key}`);
      inspectForbidden(child, `${path}${key}.`);
    }
    return;
  }
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    for (const token of forbidden) {
      if (lowered.includes(token.replaceAll("_", " "))) {
        issues.push(`forbidden-content:${token}`);
      }
    }
  }
}

for (const file of files) {
  let report;
  try {
    report = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    issues.push(`invalid-json:${file}`);
    continue;
  }
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    issues.push(`invalid-report:${file}`);
    continue;
  }
  for (const key of Object.keys(report)) {
    if (!allowed.has(key)) issues.push(`unknown-field:${key}`);
  }
  inspectForbidden(report);
  const appSummaryInput = appSummaryFields.every((key) => Object.hasOwn(report, key));
  if (report.schema_version !== undefined && report.schema_version !== "high-risk-runtime-evidence-v1") {
    issues.push("invalid-value:schema_version");
  }
  if (report.schema_version === undefined && !appSummaryInput) {
    issues.push("invalid-value:schema_version");
  }
  if (!failureClasses.has(String(report.failure_class ?? ""))) {
    issues.push("invalid-value:failure_class");
  }
  if (
    report.high_risk_public_claim_allowed !== undefined &&
    report.high_risk_public_claim_allowed !== false
  ) {
    issues.push("invalid-value:high_risk_public_claim_allowed");
  }
  if (
    report.high_risk_ready_claim_allowed !== undefined &&
    report.high_risk_ready_claim_allowed !== false
  ) {
    issues.push("invalid-value:high_risk_ready_claim_allowed");
  }
  const reportedMissingConditions = parseConditionList(report.readiness_missing_conditions);
  for (const condition of reportedMissingConditions) {
    if (!readinessConditions.includes(condition)) {
      issues.push(`invalid-value:readiness_missing_conditions:${condition}`);
    }
  }
  const computedMissingConditions = appSummaryInput
    ? readinessConditions.filter((condition) =>
        conditionMissingFromAppSummary(report, condition, reportedMissingConditions),
      )
    : readinessConditions.filter((condition) => {
        if (condition === "high-risk-transport-runtime") {
          return !(
            report.high_risk_transport_runtime_ready === true ||
            (report.runtime_evidence_accepted === true && report.runtime_evidence_present === true)
          );
        }
        if (condition === "emergency-controls") {
          return !(report.emergency_controls_ready === true || report.emergency_controls_reachable === true);
        }
        return report[readinessFields[condition]] !== true;
      });
  for (const condition of computedMissingConditions) readinessMissing.add(condition);
  for (const condition of computedMissingConditions) nextOwnerActions.add(readinessNextActions[condition]);
  if (report.readiness_condition_set !== undefined && report.readiness_condition_set !== readinessConditionSet) {
    issues.push("invalid-value:readiness_condition_set");
  }
  if (
    report.readiness_missing_conditions !== undefined && !appSummaryInput &&
    report.readiness_missing_conditions !== (computedMissingConditions.join("#") || "none")
  ) {
    issues.push("invalid-value:readiness_missing_conditions");
  }
  if (appSummaryInput) {
    const computedSet = new Set(computedMissingConditions);
    const reportedSet = new Set(reportedMissingConditions);
    for (const condition of computedMissingConditions) {
      if (!reportedSet.has(condition)) issues.push(`missing-readiness-condition:${condition}`);
    }
    for (const condition of reportedMissingConditions) {
      if (!computedSet.has(condition) && condition !== "safety-verification") {
        issues.push(`stale-readiness-condition:${condition}`);
      }
    }
  }
  const source = String(report.evidence_source ?? "absent");
  const rejectedSource =
    source === "local-fixture" ||
    source === "fabricated" ||
    report.local_only_evidence === true ||
    report.fabricated_evidence === true;
  if (report.runtime_evidence_accepted === true) {
    if (report.evidence_source !== "runtime-report") issues.push("invalid-value:evidence_source");
    for (const key of acceptedTrue) {
      if (report[key] !== true) issues.push(`invalid-value:${key}`);
    }
    for (const key of requiredFalse) {
      if (report[key] !== false) issues.push(`invalid-value:${key}`);
    }
    acceptedCount += 1;
    decisions.add("accepted");
  } else if (appSummaryInput && source === "runtime-report" && !rejectedSource) {
    acceptedCount += 1;
    decisions.add("accepted");
  } else {
    if (report.runtime_evidence_present === true) {
      issues.push("invalid-value:runtime_evidence_present");
    }
    if (!appSummaryInput && (report.evidence_source === "local-fixture" || report.evidence_source === "fabricated")) {
      if (report.runtime_evidence_accepted !== false) {
        issues.push("invalid-value:runtime_evidence_accepted");
      }
    }
    if (rejectedSource) {
      decisions.add("rejected");
      nextOwnerActions.add("replace-with-real-redacted-runtime-report");
    } else {
      decisions.add("waiting");
      nextOwnerActions.add("collect-real-redacted-runtime-report");
    }
  }
}

if (issues.length > 0) {
  for (const issue of [...new Set(issues)]) console.error(issue);
  console.error("high_risk_runtime_evidence_packet_valid=false");
  console.error("high_risk_runtime_evidence_decision=rejected");
  console.error("high_risk_runtime_evidence_accepted=false");
  console.error("next_owner_action=fix-redacted-runtime-evidence-report");
  console.error("high_risk_public_claim_allowed=false");
  console.error("high_risk_ready_claim_allowed=false");
  process.exit(1);
}

const finalDecision = decisions.has("rejected")
  ? "rejected"
  : acceptedCount > 0
    ? "accepted"
    : "waiting";
console.log("status=high-risk-runtime-evidence-valid");
console.log("high_risk_runtime_evidence_packet_valid=true");
console.log(`high_risk_runtime_evidence_decision=${finalDecision}`);
console.log(`high_risk_runtime_evidence_accepted=${acceptedCount > 0}`);
console.log(`readiness_condition_set=${readinessConditionSet}`);
console.log(`readiness_missing_conditions=${[...readinessMissing].join("#") || "none"}`);
console.log(`next_owner_action=${[...nextOwnerActions].join("#") || "none"}`);
console.log("high_risk_public_claim_allowed=false");
console.log("high_risk_ready_claim_allowed=false");
NODE
