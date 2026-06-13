#!/usr/bin/env bash
set -euo pipefail

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
    fail "$file contains forbidden claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROGRAM="reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md"
PACKET="reference/REDACTED_FIELD_REPORT_PACKET.md"
REVIEW_PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
GATE="reference/PRODUCTION_READINESS_CLAIM_GATE.md"
VALIDATOR="scripts/validate_redacted_field_reports.mjs"

for file in "$PROGRAM" "$PACKET" "$REVIEW_PACKET" "$GATE" "$VALIDATOR" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing required field evidence input: $file"
done

must_contain "$PROGRAM" "field_evidence_reliability_program_reviewed=true"
must_contain "$PROGRAM" "redacted_field_report_packet_available=true"
must_contain "$PROGRAM" "same_machine_rehearsal_source_available=true"
must_contain "$PROGRAM" "local_two_instance_rehearsal_completed=false"
must_contain "$PROGRAM" "macos_two_machine_real_user_flow_repeated=false"
must_contain "$PROGRAM" "different_networks_covered=false"
must_contain "$PROGRAM" "restart_resume_covered=false"
must_contain "$PROGRAM" "offline_online_transition_covered=false"
must_contain "$PROGRAM" "failed_delivery_recovery_documented=false"
must_contain "$PROGRAM" "repeated_redacted_field_reports_available=false"
must_contain "$PROGRAM" "raw_logs_or_private_payloads_allowed=false"
must_contain "$PROGRAM" "fabricated_peer_evidence_allowed=false"
must_contain "$PROGRAM" "external_delivery_success_claim_allowed=false"
must_contain "$PROGRAM" "reliable_external_delivery_claim_allowed=false"
must_contain "$PROGRAM" "production_field_evidence_ready=false"
must_contain "$PROGRAM" "sensitive_communication_allowed=false"
must_contain "$PROGRAM" "next_required_phase=OPS-9 operational support, incident, and vulnerability process"

must_contain "$PACKET" "redacted_field_report_packet_available=true"
must_contain "$PACKET" "redacted_field_report_validator_available=true"
must_contain "$PACKET" "accepted_production_field_reports=0"
must_contain "$PACKET" "clean_install_checksum_status=pass|fail|partial|not-run"
must_contain "$PACKET" "manual_envelope_round_trip_status=pass|fail|partial|not-run"
must_contain "$PACKET" "failed_delivery_recovery_status=pass|fail|partial|not-run"
must_contain "$PACKET" "default_transport_path=local-manual-encrypted-envelope-exchange"
must_contain "$PACKET" "raw_logs_or_private_payloads_allowed=false"
must_contain "$PACKET" "fabricated_peer_evidence_allowed=false"
must_contain "$PACKET" "external_delivery_success_claim_allowed=false"
must_contain "$PACKET" "reliable_external_delivery_claim_allowed=false"
must_contain "$PACKET" "production_field_evidence_ready=false"
must_contain "$PACKET" "sensitive_communication_allowed=false"

for required in \
  "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" \
  "reference/REDACTED_FIELD_REPORT_PACKET.md" \
  "reference/PUBLIC_INTAKE_POLICY.md" \
  "reference/PUBLIC_SUPPORT_TRIAGE.md" \
  "reference/TRANSPORT_EXPERIMENT_RUNBOOK.md" \
  "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md"; do
  must_contain "$REVIEW_PACKET" "$required"
done

must_contain "README.md" "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md"
must_contain "README.md" "reference/REDACTED_FIELD_REPORT_PACKET.md"
must_contain "SECURITY.md" "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md"
must_contain "SECURITY.md" "reference/REDACTED_FIELD_REPORT_PACKET.md"
must_contain "$VALIDATOR" "status=waiting-for-redacted-field-reports"
must_contain "$VALIDATOR" "status=redacted-field-evidence-candidate-requires-review"
must_contain "$VALIDATOR" "production_field_evidence_ready=false"
must_contain "$GATE" "ops_8_field_evidence_reliability_program_reviewed=true"
must_contain "$GATE" "redacted_field_report_packet_available=true"
must_contain "$GATE" "macos_two_machine_real_user_flow_repeated=false"
must_contain "$GATE" "repeated_redacted_field_reports_available=false"
must_contain "$GATE" "production_field_evidence_ready=false"
must_contain "$GATE" "next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision"
must_contain "reference/PUBLIC_INTAKE_POLICY.md" "Desktop Real-User Test Preparation Boundary"
must_contain "reference/PUBLIC_SUPPORT_TRIAGE.md" "Do not ask for external two-machine success evidence"

for file in "$PROGRAM" "$PACKET" "$REVIEW_PACKET" "$GATE" "README.md" "SECURITY.md"; do
  must_not_match "$file" "macos_two_machine_real_user_flow_repeated=true"
  must_not_match "$file" "different_networks_covered=true"
  must_not_match "$file" "repeated_redacted_field_reports_available=true"
  must_not_match "$file" "raw_logs_or_private_payloads_allowed=true"
  must_not_match "$file" "fabricated_peer_evidence_allowed=true"
  must_not_match "$file" "external_delivery_success_claim_allowed=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "production_field_evidence_ready=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

scripts/desktop_real_user_test_prep_once.sh >/dev/null
scripts/redacted_field_report_validator_once.sh >/dev/null

cat <<'STATUS'
status=field-evidence-reliability-program-ready
field_evidence_reliability_program_reviewed=true
redacted_field_report_packet_available=true
redacted_field_report_validator_available=true
same_machine_rehearsal_source_available=true
local_two_instance_rehearsal_completed=false
macos_two_machine_real_user_flow_repeated=false
different_networks_covered=false
restart_resume_covered=false
offline_online_transition_covered=false
failed_delivery_recovery_documented=false
repeated_redacted_field_reports_available=false
raw_logs_or_private_payloads_allowed=false
fabricated_peer_evidence_allowed=false
external_delivery_success_claim_allowed=false
reliable_external_delivery_claim_allowed=false
production_field_evidence_ready=false
sensitive_communication_allowed=false
next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision
STATUS
