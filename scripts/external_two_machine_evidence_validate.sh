#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA="$ROOT/reference/EXTERNAL_TWO_MACHINE_EVIDENCE_SCHEMA.md"
require_schema_text() {
  grep -Fq "$1" "$SCHEMA" || {
    echo "error=reference/EXTERNAL_TWO_MACHINE_EVIDENCE_SCHEMA.md missing required text: $1" >&2
    exit 1
  }
}

if [ "$#" -lt 1 ]; then
  require_schema_text "high_risk_readiness_condition_set"
  require_schema_text "high_risk_readiness_condition_coverage"
  require_schema_text "field_report_high_risk_condition_coverage=none"
  require_schema_text "next_owner_action=collect-real-redacted-two-machine-field-reports"
  require_schema_text "high_risk_ready_claim_allowed=false"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT
  cat >"$tmp_dir/valid.json" <<'JSON'
{
  "schema_version": "external-two-machine-evidence-v1",
  "app_version": "0.1.0",
  "build_commit": "test-redacted",
  "platform_pair": "macos-to-macos",
  "checksum_status": "pass",
  "machine_a_report_present": true,
  "machine_b_report_present": true,
  "app_version_match": true,
  "build_commit_match": true,
  "checksum_match": true,
  "invite_created": true,
  "safety_compared": true,
  "outbound_exported": true,
  "inbound_imported": true,
  "retry_cancel_delete_verified": true,
  "high_risk_readiness_condition_set": "safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity",
  "high_risk_readiness_condition_coverage": "safety-verification#high-risk-transport-runtime",
  "broad_failure_class": "none-redacted",
  "local_only_rehearsal": false,
  "fabricated_evidence": false
}
JSON
  cat >"$tmp_dir/local-only.json" <<'JSON'
{
  "schema_version": "external-two-machine-evidence-v1",
  "app_version": "0.1.0",
  "build_commit": "test-redacted",
  "platform_pair": "macos-to-macos",
  "checksum_status": "pass",
  "machine_a_report_present": true,
  "machine_b_report_present": true,
  "app_version_match": true,
  "build_commit_match": true,
  "checksum_match": true,
  "invite_created": true,
  "safety_compared": true,
  "outbound_exported": true,
  "inbound_imported": true,
  "retry_cancel_delete_verified": true,
  "high_risk_readiness_condition_set": "safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity",
  "high_risk_readiness_condition_coverage": "safety-verification#high-risk-transport-runtime",
  "broad_failure_class": "none-redacted",
  "local_only_rehearsal": true,
  "fabricated_evidence": false
}
JSON
  valid_output="$("$0" "$tmp_dir/valid.json")"
  printf '%s\n' "$valid_output" | grep -Fq "status=external-two-machine-evidence-valid"
  printf '%s\n' "$valid_output" | grep -Fq "field_report_high_risk_condition_coverage=safety-verification#high-risk-transport-runtime"
  printf '%s\n' "$valid_output" | grep -Fq "field_report_high_risk_missing_conditions=emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity"
  printf '%s\n' "$valid_output" | grep -Fq "high_risk_ready_claim_allowed=false"
  if "$0" "$tmp_dir/local-only.json" >/tmp/ad-external-two-machine-invalid.$$ 2>&1; then
    echo "error=validator accepted local-only rehearsal as external evidence" >&2
    rm -f /tmp/ad-external-two-machine-invalid.$$
    exit 1
  fi
  grep -Fq "invalid-value:local_only_rehearsal" /tmp/ad-external-two-machine-invalid.$$ || {
    cat /tmp/ad-external-two-machine-invalid.$$ >&2
    rm -f /tmp/ad-external-two-machine-invalid.$$
    exit 1
  }
  rm -f /tmp/ad-external-two-machine-invalid.$$
  cat <<'STATUS'
status=external-two-machine-evidence-validator-ready
external_two_machine_evidence_present=false
real_external_two_machine_field_evidence_required_for_claims=true
high_risk_readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
field_report_high_risk_condition_coverage=none
field_report_high_risk_missing_conditions=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
next_owner_action=collect-real-redacted-two-machine-field-reports
missing_evidence_is_next_owner_action=true
stable_candidate_evidence_present=false
local_only_promoted_to_external=false
reliable_delivery_claim_allowed=false
high_risk_ready_claim_allowed=false
audited_claim_allowed=false
STATUS
  exit 0
fi

node - "$@" <<'NODE'
const fs = require("node:fs");
const highRiskReadinessConditionSet =
  "safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity";
const fieldReportHighRiskConditionCoverage = "safety-verification#high-risk-transport-runtime";
const fieldReportHighRiskMissingConditions =
  "emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity";

const allowed = new Set([
  "schema_version",
  "app_version",
  "build_commit",
  "platform_pair",
  "checksum_status",
  "machine_a_report_present",
  "machine_b_report_present",
  "app_version_match",
  "build_commit_match",
  "checksum_match",
  "invite_created",
  "safety_compared",
  "outbound_exported",
  "inbound_imported",
  "retry_cancel_delete_verified",
  "high_risk_readiness_condition_set",
  "high_risk_readiness_condition_coverage",
  "broad_failure_class",
  "local_only_rehearsal",
  "fabricated_evidence",
]);

const forbidden = [
  "invite_body",
  "envelope_payload",
  "onion_endpoint",
  "local_path",
  "profile_name",
  "message_body",
  "passphrase",
  "private_key",
  "key_material",
  "raw_logs",
];

const requiredTrue = [
  "machine_a_report_present",
  "machine_b_report_present",
  "app_version_match",
  "build_commit_match",
  "checksum_match",
  "invite_created",
  "safety_compared",
  "outbound_exported",
  "inbound_imported",
  "retry_cancel_delete_verified",
];

const issues = [];
const files = process.argv.slice(2);

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
  if (report.schema_version !== "external-two-machine-evidence-v1") {
    issues.push("invalid-value:schema_version");
  }
  if (report.checksum_status !== "pass") issues.push("invalid-value:checksum_status");
  if (report.high_risk_readiness_condition_set !== highRiskReadinessConditionSet) {
    issues.push("invalid-value:high_risk_readiness_condition_set");
  }
  if (report.high_risk_readiness_condition_coverage !== fieldReportHighRiskConditionCoverage) {
    issues.push("invalid-value:high_risk_readiness_condition_coverage");
  }
  if (report.local_only_rehearsal !== false) issues.push("invalid-value:local_only_rehearsal");
  if (report.fabricated_evidence !== false) issues.push("invalid-value:fabricated_evidence");
  if (!/^[a-z0-9][a-z0-9-]{1,80}$/i.test(String(report.broad_failure_class ?? ""))) {
    issues.push("invalid-value:broad_failure_class");
  }
  for (const key of requiredTrue) {
    if (report[key] !== true) issues.push(`invalid-value:${key}`);
  }
}

if (issues.length > 0) {
  for (const issue of [...new Set(issues)]) console.error(issue);
  console.error("external_two_machine_evidence_present=false");
  console.error(`high_risk_readiness_condition_set=${highRiskReadinessConditionSet}`);
  console.error("field_report_high_risk_condition_coverage=none");
  console.error(`field_report_high_risk_missing_conditions=${highRiskReadinessConditionSet}`);
  console.error("next_owner_action=fix-redaction-or-required-fields");
  console.error("missing_evidence_is_next_owner_action=true");
  console.error("stable_candidate_evidence_present=false");
  console.error("local_only_promoted_to_external=false");
  console.error("reliable_delivery_claim_allowed=false");
  console.error("high_risk_ready_claim_allowed=false");
  console.error("audited_claim_allowed=false");
  process.exit(1);
}

console.log("status=external-two-machine-evidence-valid");
console.log("external_two_machine_evidence_present=true");
console.log(`high_risk_readiness_condition_set=${highRiskReadinessConditionSet}`);
console.log(`field_report_high_risk_condition_coverage=${fieldReportHighRiskConditionCoverage}`);
console.log(`field_report_high_risk_missing_conditions=${fieldReportHighRiskMissingConditions}`);
console.log("next_owner_action=manual-review-and-high-risk-gate-update-required");
console.log("missing_evidence_is_next_owner_action=true");
console.log("stable_candidate_evidence_present=true");
console.log("local_only_promoted_to_external=false");
console.log("reliable_delivery_claim_allowed=false");
console.log("high_risk_ready_claim_allowed=false");
console.log("audited_claim_allowed=false");
NODE
