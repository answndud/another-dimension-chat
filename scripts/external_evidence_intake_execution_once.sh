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
    fail "$file contains forbidden D100-4 evidence pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md"
REVIEW_DOC="reference/EXTERNAL_REVIEW_AUDIT_READINESS.md"
REVIEW_RUNBOOK="reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md"
TRACKER="reference/AUDIT_FINDING_TRACKER.md"
TRACKER_VALIDATOR="scripts/validate_audit_finding_tracker.mjs"
REVIEW_PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
FIELD_PROGRAM="reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md"
FIELD_PACKET="reference/REDACTED_FIELD_REPORT_PACKET.md"
FIELD_VALIDATOR="scripts/validate_redacted_field_reports.mjs"
USABILITY_DOC="reference/MACOS_USABILITY_RECOVERY_CLOSURE.md"
USABILITY_PACKET="reference/REPRESENTATIVE_USABILITY_REPORT_PACKET.md"
USABILITY_VALIDATOR="scripts/validate_representative_usability_reports.mjs"
PUBLIC_INTAKE="reference/PUBLIC_INTAKE_POLICY.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
GAP_REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"

for file in "$DOC" "$REVIEW_DOC" "$REVIEW_RUNBOOK" "$TRACKER" "$TRACKER_VALIDATOR" "$REVIEW_PACKET" \
  "$FIELD_PROGRAM" "$FIELD_PACKET" "$FIELD_VALIDATOR" "$USABILITY_DOC" \
  "$USABILITY_PACKET" "$USABILITY_VALIDATOR" "$PUBLIC_INTAKE" "$MATRIX" \
  "$GAP_REGISTER" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing D100-4 external evidence intake input: $file"
done

for flag in \
  "d100_4_external_evidence_intake_execution_reviewed=true" \
  "external_evidence_intake_operator_ready=true" \
  "external_review_intake_runbook_available=true" \
  "external_review_intake_operator_ready=true" \
  "a100_1_external_security_review_packet_frozen=true" \
  "review_packet_synced_to_latest_source_gates=true" \
  "review_packet_includes_c100_5_onion_boundary=true" \
  "review_packet_includes_target_standard_matrix=true" \
  "review_packet_includes_deployment_blocker_plan=true" \
  "review_packet_finding_tracker_synced=true" \
  "private_docs_excluded_from_review_packet=true" \
  "generated_release_artifacts_excluded_from_review_packet=true" \
  "reviewer_packet_freeze_ready=true" \
  "audit_finding_tracker_ready=true" \
  "audit_finding_tracker_schema_machine_checkable=true" \
  "audit_finding_counts_machine_checked=true" \
  "sensitive_finding_private_route_required=true" \
  "field_report_validator_ready=true" \
  "usability_report_validator_ready=true" \
  "consent_non_sensitive_use_notice_ready=true" \
  "external_execution_required=true" \
  "fabricated_or_local_only_evidence_rejected=true" \
  "representative_usability_sample_threshold=3-5" \
  "field_report_sample_threshold=multiple-real-two-machine-plus-different-network" \
  "review_packet_public_safe=true" \
  "audit_finding_tracker_available=true" \
  "redacted_field_report_packet_available=true" \
  "redacted_field_report_validator_available=true" \
  "representative_usability_report_packet_available=true" \
  "representative_usability_report_validator_available=true" \
  "external_review_completed=false" \
  "audit_completed=false" \
  "reviewer_signoff_claimed=false" \
  "public_user_safety_signoff_claimed=false" \
  "usability_study_completed=false" \
  "representative_usability_evidence_completed=false" \
  "macos_two_machine_real_user_flow_repeated=false" \
  "repeated_redacted_field_reports_available=false" \
  "production_field_evidence_ready=false" \
  "reliable_external_delivery_claim_allowed=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false" \
  "fabricated_review_or_peer_evidence_allowed=false" \
  "local_only_evidence_promoted_to_external=false"; do
  must_contain "$DOC" "$flag"
done

for file in "$REVIEW_DOC" "$REVIEW_RUNBOOK" "$TRACKER" "$REVIEW_PACKET" "$FIELD_PROGRAM" \
  "$FIELD_PACKET" "$USABILITY_DOC" "$USABILITY_PACKET" "$MATRIX" \
  "$GAP_REGISTER" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md"
done

for file in "$USABILITY_DOC" "$MATRIX" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "REPRESENTATIVE_USABILITY_REPORT_PACKET.md"
done

must_contain "$REVIEW_DOC" "reviewer_packet_freeze_ready=true"
must_contain "$REVIEW_DOC" "a100_1_external_security_review_packet_frozen=true"
must_contain "$REVIEW_DOC" "review_packet_synced_to_latest_source_gates=true"
must_contain "$REVIEW_DOC" "review_packet_finding_tracker_synced=true"
must_contain "$REVIEW_RUNBOOK" "external_review_intake_operator_ready=true"
must_contain "$TRACKER" "audit_finding_tracker_ready=true"
must_contain "$TRACKER" "review_packet_finding_tracker_synced=true"
must_contain "$TRACKER_VALIDATOR" "status=audit-finding-tracker-valid"
must_contain "$FIELD_PROGRAM" "field_report_validator_ready=true"
must_contain "$USABILITY_DOC" "usability_report_validator_ready=true"
must_contain "$USABILITY_PACKET" "consent_non_sensitive_use_notice_ready=true"
must_contain "$PUBLIC_INTAKE" "sensitive communication prohibited"
must_contain "$FIELD_VALIDATOR" "status=redacted-field-evidence-candidate-requires-review"
must_contain "$USABILITY_VALIDATOR" "status=representative-usability-evidence-candidate-requires-review"

for file in "$DOC" "$REVIEW_DOC" "$REVIEW_RUNBOOK" "$TRACKER" "$REVIEW_PACKET" "$FIELD_PROGRAM" \
  "$FIELD_PACKET" "$USABILITY_DOC" "$USABILITY_PACKET" "$MATRIX" \
  "$GAP_REGISTER" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "not audited"
  must_contain "$file" "not production-ready"
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "reviewer_signoff_claimed=true"
  must_not_match "$file" "public_user_safety_signoff_claimed=true"
  must_not_match "$file" "usability_study_completed=true"
  must_not_match "$file" "representative_usability_evidence_completed=true"
  must_not_match "$file" "macos_two_machine_real_user_flow_repeated=true"
  must_not_match "$file" "repeated_redacted_field_reports_available=true"
  must_not_match "$file" "production_field_evidence_ready=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "fabricated_review_or_peer_evidence_allowed=true"
  must_not_match "$file" "local_only_evidence_promoted_to_external=true"
done

scripts/external_review_audit_readiness_once.sh >/dev/null
scripts/audit_finding_tracker_validator_once.sh >/dev/null
scripts/redacted_field_report_validator_once.sh >/dev/null
scripts/field_evidence_reliability_program_once.sh >/dev/null
scripts/representative_usability_report_validator_once.sh >/dev/null

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

local_only_output="$(node "$FIELD_VALIDATOR" "$tmp_dir/local-only.md")"
printf '%s\n' "$local_only_output" | grep -Fq "accepted_production_field_reports=0" || fail "local-only field report was promoted"
if printf '%s\n' "$local_only_output" | grep -Fq "status=redacted-field-evidence-candidate-requires-review"; then
  fail "local-only field report reached external evidence candidate status"
fi

cat >"$tmp_dir/no-consent.md" <<'REPORT'
participant_label=R01
representative_user_type=non-developer
app_version=0.1.0
build_channel=beta-onion
build_commit=test-redacted
platform=macos
session_scope=first-run-invite-manual-envelope-recovery-diagnostics-delete
consent_notice_acknowledged=false
non_sensitive_use_confirmed=true
clean_install_checksum_status=pass
first_launch_warning_status=pass
profile_create_unlock_status=pass
invite_join_status=pass
safety_verification_status=pass
manual_envelope_exchange_status=pass
retry_cancel_recovery_status=pass
local_delete_wipe_status=pass
public_diagnostics_copy_status=pass
recovery_next_action_understood=pass
required_task_status=pass
blocker_class=none-redacted
redacted_blocker_summary=none-redacted
app_launch_network_stayed_false=true
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
REPORT

no_consent_output="$tmp_dir/no-consent.out"
if node "$USABILITY_VALIDATOR" "$tmp_dir/no-consent.md" >"$no_consent_output" 2>&1; then
  fail "representative usability validator accepted missing consent"
fi
grep -Fq "invalid-value:consent_notice_acknowledged" "$no_consent_output" || fail "missing consent rejection was not reported"

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=external-evidence-intake-execution-ready
d100_4_external_evidence_intake_execution_reviewed=true
external_evidence_intake_operator_ready=true
external_review_intake_runbook_available=true
external_review_intake_operator_ready=true
reviewer_packet_freeze_ready=true
a100_1_external_security_review_packet_frozen=true
review_packet_synced_to_latest_source_gates=true
review_packet_includes_c100_5_onion_boundary=true
review_packet_includes_target_standard_matrix=true
review_packet_includes_deployment_blocker_plan=true
review_packet_finding_tracker_synced=true
audit_finding_tracker_ready=true
audit_finding_tracker_schema_machine_checkable=true
audit_finding_counts_machine_checked=true
field_report_validator_ready=true
usability_report_validator_ready=true
consent_non_sensitive_use_notice_ready=true
external_execution_required=true
fabricated_or_local_only_evidence_rejected=true
representative_usability_sample_threshold=3-5
field_report_sample_threshold=multiple-real-two-machine-plus-different-network
external_review_completed=false
audit_completed=false
usability_study_completed=false
representative_usability_evidence_completed=false
macos_two_machine_real_user_flow_repeated=false
repeated_redacted_field_reports_available=false
production_field_evidence_ready=false
reliable_external_delivery_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
next_required_phase=D100-5-Windows-public-artifact-execution-path
STATUS
