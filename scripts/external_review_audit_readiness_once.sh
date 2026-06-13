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

must_reference_public_gate() {
  local file="$1"
  local needle="$2"
  if grep -Fq "$needle" "$file"; then
    return
  fi
  if [ "$file" = "README.md" ] &&
    grep -Fq "SECURITY.md" "$file" &&
    grep -Fq "$needle" "SECURITY.md"; then
    return
  fi
  fail "$file missing public-reachable reference: $needle"
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

DOC="reference/EXTERNAL_REVIEW_AUDIT_READINESS.md"
RUNBOOK="reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md"
TRACKER="reference/AUDIT_FINDING_TRACKER.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
SCOPE_DOWN="reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
SIGNOFF_SCHEMA="reference/EXTERNAL_REVIEW_SIGNOFF_SCHEMA.md"
TRACKER_VALIDATOR="scripts/validate_audit_finding_tracker.mjs"
SIGNOFF_VALIDATOR="scripts/validate_external_review_signoff.mjs"

must_contain "$DOC" "external_review_audit_readiness_gate_reviewed=true"
must_contain "$DOC" "a100_1_external_security_review_packet_frozen=true"
must_contain "$DOC" "a100_2_external_review_execution_blocker_closed=true"
must_contain "$DOC" "external_review_execution_policy_waiver_authorized=true"
must_contain "$DOC" "external_review_execution_waiver_scope=active-queue-unblock-only"
must_contain "$DOC" "named_external_review_required_for_claims=true"
must_contain "$DOC" "accepted_audit_finding_closure_required_for_claims=true"
must_contain "$DOC" "external_review_execution_claim_allowed=false"
must_contain "$DOC" "audit_findings_recorded=0"
must_contain "$DOC" "audit_finding_closure_claim_allowed=false"
must_contain "$DOC" "review_packet_synced_to_latest_source_gates=true"
must_contain "$DOC" "review_packet_includes_c100_5_onion_boundary=true"
must_contain "$DOC" "review_packet_includes_target_standard_matrix=true"
must_contain "$DOC" "review_packet_includes_deployment_blocker_plan=true"
must_contain "$DOC" "review_packet_finding_tracker_synced=true"
must_contain "$DOC" "private_docs_excluded_from_review_packet=true"
must_contain "$DOC" "generated_release_artifacts_excluded_from_review_packet=true"
must_contain "$DOC" "d100_4_external_evidence_intake_execution_reviewed=true"
must_contain "$DOC" "external_review_intake_runbook_available=true"
must_contain "$DOC" "external_review_intake_operator_ready=true"
must_contain "$DOC" "external_review_signoff_schema_available=true"
must_contain "$DOC" "external_review_signoff_validator_available=true"
must_contain "$DOC" "external_review_signoff_candidate_requires_owner_claim_decision=true"
must_contain "$DOC" "reviewer_packet_freeze_ready=true"
must_contain "$DOC" "audit_finding_tracker_ready=true"
must_contain "$DOC" "audit_finding_tracker_schema_machine_checkable=true"
must_contain "$DOC" "audit_finding_counts_machine_checked=true"
must_contain "$DOC" "sensitive_finding_private_route_required=true"
must_contain "$DOC" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "$DOC" "review_packet_public_safe=true"
must_contain "$DOC" "review_packet_complete_for_current_source=true"
must_contain "$DOC" "audit_finding_tracker_available=true"
must_contain "$DOC" "finding_triage_process_defined=true"
must_contain "$DOC" "private_security_reporting_boundary_defined=true"
must_contain "$DOC" "external_review_completed=false"
must_contain "$DOC" "audit_completed=false"
must_contain "$DOC" "reviewer_signoff_claimed=false"
must_contain "$DOC" "public_user_safety_signoff_claimed=false"
must_contain "$DOC" "audited_claim_allowed=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "stable_or_production_release_allowed_without_external_review=false"
must_contain "$DOC" "signed_public_beta_or_rc_release_class_allowed_without_external_review=true"
must_contain "$DOC" "external_review_no_longer_blocks_lower_release_class=true"
must_contain "$DOC" "external_review_still_blocks_stable_or_production_claims=true"
must_contain "$DOC" "next_required_phase=RB-7 signed notarized macOS stable artifact pipeline"

must_contain "$RUNBOOK" "external_review_intake_runbook_available=true"
must_contain "$RUNBOOK" "external_review_intake_operator_ready=true"
must_contain "$RUNBOOK" "external_review_signoff_schema_available=true"
must_contain "$RUNBOOK" "external_review_signoff_validator_available=true"
must_contain "$RUNBOOK" "external_review_signoff_candidate_requires_owner_claim_decision=true"
must_contain "$RUNBOOK" "a100_1_external_security_review_packet_frozen=true"
must_contain "$RUNBOOK" "a100_2_external_review_execution_blocker_closed=true"
must_contain "$RUNBOOK" "external_review_execution_policy_waiver_authorized=true"
must_contain "$RUNBOOK" "named_external_review_required_for_claims=true"
must_contain "$RUNBOOK" "accepted_audit_finding_closure_required_for_claims=true"
must_contain "$RUNBOOK" "external_review_execution_claim_allowed=false"
must_contain "$RUNBOOK" "review_packet_synced_to_latest_source_gates=true"
must_contain "$RUNBOOK" "review_packet_includes_c100_5_onion_boundary=true"
must_contain "$RUNBOOK" "review_packet_includes_target_standard_matrix=true"
must_contain "$RUNBOOK" "review_packet_includes_deployment_blocker_plan=true"
must_contain "$RUNBOOK" "review_packet_finding_tracker_synced=true"
must_contain "$RUNBOOK" "private_docs_excluded_from_review_packet=true"
must_contain "$RUNBOOK" "generated_release_artifacts_excluded_from_review_packet=true"
must_contain "$RUNBOOK" "audit_finding_tracker_schema_machine_checkable=true"
must_contain "$RUNBOOK" "sensitive_finding_private_route_required=true"
must_contain "$TRACKER" "Status: tracker available; no external audit findings have been received or"
must_contain "$TRACKER" "audit_finding_tracker_ready=true"
must_contain "$TRACKER" "a100_1_external_security_review_packet_frozen=true"
must_contain "$TRACKER" "a100_2_external_review_execution_blocker_closed=true"
must_contain "$TRACKER" "external_review_execution_policy_waiver_authorized=true"
must_contain "$TRACKER" "named_external_review_required_for_claims=true"
must_contain "$TRACKER" "accepted_audit_finding_closure_required_for_claims=true"
must_contain "$TRACKER" "external_review_execution_claim_allowed=false"
must_contain "$TRACKER" "audit_findings_recorded=0"
must_contain "$TRACKER" "audit_finding_closure_claim_allowed=false"
must_contain "$TRACKER" "review_packet_finding_tracker_synced=true"
must_contain "$TRACKER" "audit_finding_tracker_schema_machine_checkable=true"
must_contain "$TRACKER" "audit_finding_counts_machine_checked=true"
must_contain "$TRACKER" "sensitive_finding_private_route_required=true"
must_contain "$TRACKER" "Each finding must have exactly one decision: fix, hold, or waive."
must_contain "$TRACKER" "external_review_completed=false"
must_contain "$TRACKER" "audit_completed=false"
must_contain "$TRACKER" "audited_claim_allowed=false"
must_contain "$TRACKER" "security_ready_claimed=false"
must_contain "$SIGNOFF_SCHEMA" "external_review_signoff_schema_available=true"
must_contain "$SIGNOFF_SCHEMA" "external_review_signoff_validator_available=true"
must_contain "$SIGNOFF_SCHEMA" "external_review_signoff_candidate_requires_owner_claim_decision=true"
must_contain "$SIGNOFF_VALIDATOR" "status=external-review-signoff-candidate-requires-owner-claim-decision"
must_contain "$TRACKER_VALIDATOR" "status=audit-finding-tracker-valid"

for required in \
  "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md" \
  "reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md" \
  "reference/EXTERNAL_REVIEW_SIGNOFF_SCHEMA.md" \
  "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md" \
  "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md" \
  "reference/AUDIT_FINDING_TRACKER.md" \
  "reference/INDEPENDENT_REVIEW_PACKET.md" \
  "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md" \
  "reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md" \
  "reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md" \
  "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md" \
  "reference/PUBLIC_THREAT_MODEL.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md" \
  "reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md" \
  "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md" \
  "reference/TRANSPORT_EXPERIMENT_RUNBOOK.md" \
  "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" \
  "reference/MACOS_PRODUCTION_UX_ONBOARDING.md" \
  "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md" \
  "reference/PUBLIC_INTAKE_POLICY.md"; do
  must_contain "$PACKET" "$required"
done

must_reference_public_gate "README.md" "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md"
must_reference_public_gate "README.md" "reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md"
must_reference_public_gate "README.md" "reference/AUDIT_FINDING_TRACKER.md"
must_reference_public_gate "README.md" "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
must_reference_public_gate "README.md" "reference/EXTERNAL_REVIEW_SIGNOFF_SCHEMA.md"
must_contain "SECURITY.md" "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md"
must_contain "SECURITY.md" "reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md"
must_contain "SECURITY.md" "reference/AUDIT_FINDING_TRACKER.md"
must_contain "SECURITY.md" "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/EXTERNAL_REVIEW_SIGNOFF_SCHEMA.md"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "ops_7_external_review_audit_readiness_gate_reviewed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "a100_1_external_security_review_packet_frozen=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "a100_2_external_review_execution_blocker_closed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "external_review_execution_policy_waiver_authorized=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "named_external_review_required_for_claims=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "accepted_audit_finding_closure_required_for_claims=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "external_review_execution_claim_allowed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "audit_finding_closure_claim_allowed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "review_packet_synced_to_latest_source_gates=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "review_packet_finding_tracker_synced=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "external_review_completed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "audit_completed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "reviewer_signoff_claimed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "public_user_safety_signoff_claimed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "stable_or_production_release_allowed_without_external_review=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "signed_public_beta_or_rc_release_class_allowed_without_external_review=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "external_review_no_longer_blocks_lower_release_class=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "external_review_still_blocks_stable_or_production_claims=true"
must_contain ".github/ISSUE_TEMPLATE/config.yml" "private vulnerability reporting"
must_contain "reference/PUBLIC_INTAKE_POLICY.md" "Use GitHub private vulnerability reporting when available."
must_contain "SECURITY.md" "private vulnerability reporting"

for file in "$DOC" "$RUNBOOK" "$TRACKER" "$PACKET" "$SCOPE_DOWN" "README.md" "SECURITY.md"; do
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "reviewer_signoff_claimed=true"
  must_not_match "$file" "public_user_safety_signoff_claimed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "stable_or_production_release_allowed_without_external_review=true"
  must_not_match "$file" "external_review_execution_claim_allowed=true"
  must_not_match "$file" "audit_finding_closure_claim_allowed=true"
done

scripts/audit_finding_tracker_validator_once.sh >/dev/null
scripts/external_review_signoff_validator_once.sh >/dev/null
scripts/external_review_release_class_scope_down_once.sh >/dev/null

cat <<'STATUS'
status=external-review-audit-readiness-ready
external_review_audit_readiness_gate_reviewed=true
a100_1_external_security_review_packet_frozen=true
a100_2_external_review_execution_blocker_closed=true
external_review_execution_policy_waiver_authorized=true
external_review_execution_waiver_scope=active-queue-unblock-only
named_external_review_required_for_claims=true
accepted_audit_finding_closure_required_for_claims=true
external_review_execution_claim_allowed=false
audit_findings_recorded=0
audit_finding_closure_claim_allowed=false
review_packet_synced_to_latest_source_gates=true
review_packet_includes_c100_5_onion_boundary=true
review_packet_includes_target_standard_matrix=true
review_packet_includes_deployment_blocker_plan=true
review_packet_finding_tracker_synced=true
private_docs_excluded_from_review_packet=true
generated_release_artifacts_excluded_from_review_packet=true
d100_4_external_evidence_intake_execution_reviewed=true
external_review_intake_runbook_available=true
external_review_intake_operator_ready=true
external_review_signoff_schema_available=true
external_review_signoff_validator_available=true
external_review_signoff_candidate_requires_owner_claim_decision=true
reviewer_packet_freeze_ready=true
audit_finding_tracker_ready=true
audit_finding_tracker_schema_machine_checkable=true
audit_finding_counts_machine_checked=true
sensitive_finding_private_route_required=true
rb_6_external_review_release_class_scope_down_reviewed=true
review_packet_public_safe=true
review_packet_complete_for_current_source=true
audit_finding_tracker_available=true
finding_triage_process_defined=true
private_security_reporting_boundary_defined=true
external_review_completed=false
audit_completed=false
reviewer_signoff_claimed=false
public_user_safety_signoff_claimed=false
audited_claim_allowed=false
security_ready_claimed=false
sensitive_communication_allowed=false
stable_or_production_release_allowed_without_external_review=false
signed_public_beta_or_rc_release_class_allowed_without_external_review=true
external_review_no_longer_blocks_lower_release_class=true
external_review_still_blocks_stable_or_production_claims=true
next_required_phase=RB-7-signed-notarized-macos-stable-artifact-pipeline
STATUS
