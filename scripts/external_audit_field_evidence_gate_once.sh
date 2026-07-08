#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden external evidence claim pattern: $pattern"
  fi
}

DOC="reference/EXTERNAL_AUDIT_FIELD_EVIDENCE_GATE.md"

for file in "$DOC" \
  "reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md" \
  "reference/EXTERNAL_REVIEW_SIGNOFF_SCHEMA.md" \
  "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md" \
  "reference/AUDIT_FINDING_TRACKER.md" \
  "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" \
  "reference/REDACTED_FIELD_REPORT_PACKET.md" \
  "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" \
  "reference/ANDROID_PUBLIC_APP_CANDIDATE.md" \
  "reference/IOS_PUBLIC_APP_CANDIDATE.md" \
  "scripts/audit_finding_tracker_validator_once.sh" \
  "scripts/external_review_signoff_validator_once.sh" \
  "scripts/external_evidence_intake_execution_once.sh" \
  "scripts/redacted_field_report_validator_once.sh" \
  "scripts/validate_audit_finding_tracker.mjs" \
  "scripts/validate_external_review_signoff.mjs" \
  "scripts/validate_redacted_field_reports.mjs"; do
  [ -f "$file" ] || fail "missing external audit/field evidence gate input: $file"
done

for flag in \
  "external_audit_field_evidence_gate_ready=true" \
  "audit_finding_tracker_validator_ready=true" \
  "external_review_signoff_schema_available=true" \
  "external_review_signoff_validator_ready=true" \
  "external_review_signoff_candidate_requires_owner_claim_decision=true" \
  "external_evidence_intake_validator_ready=true" \
  "redacted_field_report_validator_ready=true" \
  "fabricated_or_local_only_evidence_rejected=true" \
  "named_external_review_required_for_claims=true" \
  "accepted_audit_finding_closure_required_for_claims=true" \
  "repeated_real_field_reports_required_for_claims=true" \
  "required_platform_pair_coverage_required_for_claims=true" \
  "macos_public_artifact_evidence_required=true" \
  "windows_public_artifact_evidence_required=true" \
  "android_public_artifact_evidence_required=true" \
  "ios_public_artifact_evidence_required=true" \
  "external_review_completed=false" \
  "audit_completed=false" \
  "repeated_redacted_field_reports_available=false" \
  "reliability_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "production_ready_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md" "external_review_completed=false"
must_contain "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md" "fabricated_or_local_only_evidence_rejected=true"
must_contain "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" "repeated_redacted_field_reports_available=false"
must_contain "reference/REDACTED_FIELD_REPORT_PACKET.md" "required_platform_pair_coverage_required_for_claims=true"
must_contain "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" "windows_public_artifact_ready=false"
must_contain "reference/ANDROID_PUBLIC_APP_CANDIDATE.md" "android_public_artifact_ready=false"
must_contain "reference/IOS_PUBLIC_APP_CANDIDATE.md" "ios_public_artifact_ready=false"

for file in "$DOC" reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md reference/AUDIT_FINDING_TRACKER.md; do
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "repeated_redacted_field_reports_available=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

scripts/audit_finding_tracker_validator_once.sh >/dev/null
scripts/external_review_signoff_validator_once.sh >/dev/null
scripts/redacted_field_report_validator_once.sh >/dev/null

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
cat >"$tmp_dir/local-only.md" <<'REPORT'
app_version=0.1.0
build_channel=beta-onion
build_commit=test-redacted
platform_pair=macos-to-macos
checksum_result=pass
install_path_reached=first-launch
flow_scope=same-machine
network_condition_class=not-applicable
run_count=1
clean_install_checksum_status=pass
first_launch_warning_status=pass
profile_create_unlock_status=pass
invite_verify_status=pass
manual_envelope_round_trip_status=pass
retry_cancel_recovery_status=pass
restart_resume_status=pass
offline_online_transition_status=pass
failed_delivery_recovery_status=pass
delete_wipe_lifecycle_status=pass
public_diagnostics_copy_status=pass
required_flow_status=pass
failure_class=unknown-redacted
recovery_next_action=none-redacted
app_launch_network_stayed_false=true
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
REPORT

local_only_output="$(node scripts/validate_redacted_field_reports.mjs "$tmp_dir/local-only.md")"
printf '%s\n' "$local_only_output" | grep -Fq "accepted_production_field_reports=0" ||
  fail "local-only field report was promoted"
if printf '%s\n' "$local_only_output" | grep -Fq "status=redacted-field-evidence-candidate-requires-review"; then
  fail "local-only field report reached external evidence candidate status"
fi

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=external-audit-field-evidence-gate-ready
external_audit_field_evidence_gate_ready=true
audit_finding_tracker_validator_ready=true
external_review_signoff_schema_available=true
external_review_signoff_validator_ready=true
external_review_signoff_candidate_requires_owner_claim_decision=true
external_evidence_intake_validator_ready=true
redacted_field_report_validator_ready=true
fabricated_or_local_only_evidence_rejected=true
named_external_review_required_for_claims=true
accepted_audit_finding_closure_required_for_claims=true
repeated_real_field_reports_required_for_claims=true
required_platform_pair_coverage_required_for_claims=true
external_review_completed=false
audit_completed=false
repeated_redacted_field_reports_available=false
reliability_claim_allowed=false
audited_claim_allowed=false
production_ready_claim_allowed=false
sensitive_communication_allowed=false
STATUS
