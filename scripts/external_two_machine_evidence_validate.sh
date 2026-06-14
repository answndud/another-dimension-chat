#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: scripts/external_two_machine_evidence_validate.sh <report.json> [report.json...]" >&2
  exit 2
fi

node - "$@" <<'NODE'
const fs = require("node:fs");

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
  console.error("stable_candidate_evidence_present=false");
  console.error("local_only_promoted_to_external=false");
  console.error("reliable_delivery_claim_allowed=false");
  console.error("audited_claim_allowed=false");
  process.exit(1);
}

console.log("status=external-two-machine-evidence-valid");
console.log("external_two_machine_evidence_present=true");
console.log("stable_candidate_evidence_present=true");
console.log("local_only_promoted_to_external=false");
console.log("reliable_delivery_claim_allowed=false");
console.log("audited_claim_allowed=false");
NODE
