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
    fail "$file contains forbidden deployment readiness pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
BLOCKER_PLAN="reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
FINAL="reference/TARGET_STANDARD_100_FINAL_ACTIVE_QUEUE_CLOSURE.md"

for file in "$REGISTER" "$MATRIX" "$BLOCKER_PLAN" "$FINAL" \
  "reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md" \
  "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" \
  "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md" \
  "reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md" \
  "reference/REPRESENTATIVE_USABILITY_REPORT_PACKET.md" \
  "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" \
  "reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md" \
  "reference/MACOS_PRODUCTION_UX_ONBOARDING.md" \
  "reference/MACOS_USABILITY_RECOVERY_CLOSURE.md" \
  "reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md" \
  "reference/PRODUCTION_E2EE_SOURCE_GATE.md" \
  "reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md" \
  "reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md" \
  "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md" \
  "reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md" \
  "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md" \
  "reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md" \
  "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md" \
  "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing deployment readiness reconciliation input: $file"
done

must_contain "$REGISTER" "deployment_readiness_gap_register_reviewed=true"
must_contain "$REGISTER" "deployment_100_blocker_resolution_plan_available=true"
must_contain "$REGISTER" "target_standard_100_deployment_gap_reconciled=true"
must_contain "$REGISTER" "stale_generic_partial_or_hold_reduced=true"
must_contain "$REGISTER" "source_solved_items_promoted_to_named_supported_scope=true"
must_contain "$REGISTER" "external_blockers_still_visible=true"
must_contain "$REGISTER" "false_or_hold_items_hidden=false"
must_contain "$REGISTER" "public_claim_ahead_of_evidence=false"
must_contain "$REGISTER" "macos_current_scope_supported=true"
must_contain "$REGISTER" "macos_universal_intel_scope_still_hold=true"
must_contain "$REGISTER" "onboarding_recovery_source_ready=true"
must_contain "$REGISTER" "pairwise_identity_source_ready=true"
must_contain "$REGISTER" "production_e2ee_source_gate_reviewed=true"
must_contain "$REGISTER" "c100_5_onion_evidence_blocker_closed=true"
must_contain "$REGISTER" "advanced_onion_policy_waiver_authorized=true"
must_contain "$REGISTER" "advanced_onion_waiver_scope=active-queue-unblock-only"
must_contain "$REGISTER" "advanced_onion_field_evidence_required_for_claims=true"
must_contain "$REGISTER" "advanced_onion_repeated_external_evidence_required_for_claims=true"
must_contain "$REGISTER" "external_delivery_success_claim_allowed=false"
must_contain "$REGISTER" "reliable_external_delivery_claim_allowed=false"
must_contain "$REGISTER" "repeated_external_onion_evidence_claim_allowed=false"
must_contain "$REGISTER" "production_e2ee_source_ready=true"
must_contain "$REGISTER" "d100_1_e2ee_source_gate_reviewed=true"
must_contain "$REGISTER" "protocol_session_e2ee_source_ready=true"
must_contain "$REGISTER" "supported_default_transport_ready=true"
must_contain "$REGISTER" "supported_local_key_lifecycle_ready=true"
must_contain "$REGISTER" "supported_local_deletion_scope_ready=true"
must_contain "$REGISTER" "production_key_management_source_gate_reviewed=true"
must_contain "$REGISTER" "production_key_management_source_ready=true"
must_contain "$REGISTER" "d100_2_key_management_source_gate_reviewed=true"
must_contain "$REGISTER" "manual_update_integrity_policy_available=true"
must_contain "$REGISTER" "macos_signed_update_manifest_schema_available=true"
must_contain "$REGISTER" "macos_signed_update_manifest_validator_available=true"
must_contain "$REGISTER" "signed_update_manifest_candidate_verifier_ready=true"
must_contain "$REGISTER" "d100_3_signed_notarized_execution_path_reviewed=true"
must_contain "$REGISTER" "macos_signed_notarized_execution_path_available=true"
must_contain "$REGISTER" "signed_notarized_rc_execution_ready=false"
must_contain "$REGISTER" "d100_4_external_evidence_intake_execution_reviewed=true"
must_contain "$REGISTER" "external_evidence_intake_operator_ready=true"
must_contain "$REGISTER" "reviewer_packet_freeze_ready=true"
must_contain "$REGISTER" "a100_1_external_security_review_packet_frozen=true"
must_contain "$REGISTER" "a100_2_external_review_execution_blocker_closed=true"
must_contain "$REGISTER" "external_review_execution_policy_waiver_authorized=true"
must_contain "$REGISTER" "named_external_review_required_for_claims=true"
must_contain "$REGISTER" "accepted_audit_finding_closure_required_for_claims=true"
must_contain "$REGISTER" "external_review_execution_claim_allowed=false"
must_contain "$REGISTER" "audit_findings_recorded=0"
must_contain "$REGISTER" "audit_finding_closure_claim_allowed=false"
must_contain "$REGISTER" "f100_1_field_evidence_blocker_closed=true"
must_contain "$REGISTER" "field_evidence_policy_waiver_authorized=true"
must_contain "$REGISTER" "real_external_two_machine_field_evidence_required_for_claims=true"
must_contain "$REGISTER" "accepted_redacted_field_reports_required_for_claims=true"
must_contain "$REGISTER" "field_evidence_execution_claim_allowed=false"
must_contain "$REGISTER" "accepted_production_field_reports=0"
must_contain "$REGISTER" "o100_1_operations_blocker_closed=true"
must_contain "$REGISTER" "operations_source_gate_closed=true"
must_contain "$REGISTER" "production_operations_evidence_required_for_claims=true"
must_contain "$REGISTER" "real_incident_response_execution_required_for_claims=true"
must_contain "$REGISTER" "production_operational_readiness_claim_allowed=false"
must_contain "$REGISTER" "review_packet_synced_to_latest_source_gates=true"
must_contain "$REGISTER" "review_packet_includes_c100_5_onion_boundary=true"
must_contain "$REGISTER" "review_packet_includes_target_standard_matrix=true"
must_contain "$REGISTER" "review_packet_includes_deployment_blocker_plan=true"
must_contain "$REGISTER" "review_packet_finding_tracker_synced=true"
must_contain "$REGISTER" "private_docs_excluded_from_review_packet=true"
must_contain "$REGISTER" "generated_release_artifacts_excluded_from_review_packet=true"
must_contain "$REGISTER" "audit_finding_tracker_ready=true"
must_contain "$REGISTER" "audit_finding_tracker_schema_machine_checkable=true"
must_contain "$REGISTER" "audit_finding_counts_machine_checked=true"
must_contain "$REGISTER" "field_report_validator_ready=true"
must_contain "$REGISTER" "usability_report_validator_ready=true"
must_contain "$REGISTER" "consent_non_sensitive_use_notice_ready=true"
must_contain "$REGISTER" "fabricated_or_local_only_evidence_rejected=true"
must_contain "$REGISTER" "local_only_evidence_promoted_to_external=false"
must_contain "$REGISTER" "d100_5_windows_public_artifact_execution_path_reviewed=true"
must_contain "$REGISTER" "windows_public_artifact_execution_path_available=true"
must_contain "$REGISTER" "windows_real_runtime_result_schema_available=true"
must_contain "$REGISTER" "windows_real_runtime_result_validator_available=true"
must_contain "$REGISTER" "real_windows_runtime_smoke_requirements_defined=true"
must_contain "$REGISTER" "windows_installer_signing_decision_recorded=true"
must_contain "$REGISTER" "windows_checksum_provenance_requirements_defined=true"
must_contain "$REGISTER" "windows_public_copy_requirements_defined=true"
must_contain "$REGISTER" "windows_support_diagnostics_requirements_defined=true"
must_contain "$REGISTER" "windows_no_overclaim_gate_ready=true"
must_contain "$REGISTER" "windows_real_runtime_smoke_passed=false"
must_contain "$REGISTER" "windows_public_artifact_ready=false"
must_contain "$REGISTER" "windows_installer_ready=false"
must_contain "$REGISTER" "windows_public_artifact_upload_allowed=false"
must_contain "$REGISTER" "target_standard_100_final_active_queue_closure_available=true"
must_contain "$REGISTER" "final_active_queue_closure_reviewed=true"
must_contain "$REGISTER" "all_remaining_active_phases_closed_by_source_or_hold_gate=true"
must_contain "$REGISTER" "w100_1_windows_runtime_parity_scope_blocker_closed=true"
must_contain "$REGISTER" "w100_2_windows_public_artifact_blocker_closed=true"
must_contain "$REGISTER" "x100_1_cross_desktop_product_parity_blocker_closed=true"
must_contain "$REGISTER" "mob100_0_mobile_scope_unlock_decision_closed=true"
must_contain "$REGISTER" "mob100_1_mobile_api_stabilization_blocker_closed=true"
must_contain "$REGISTER" "mob100_2_android_public_app_candidate_blocker_closed=true"
must_contain "$REGISTER" "mob100_3_ios_public_app_candidate_blocker_closed=true"
must_contain "$REGISTER" "x100_2_cross_platform_field_support_blocker_closed=true"
must_contain "$REGISTER" "r100_1_production_claim_gate_decision_closed=true"
must_contain "$REGISTER" "r100_2_stable_macos_release_decision_closed=true"
must_contain "$REGISTER" "r100_3_whole_product_target_standard_gate_decision_closed=true"
must_contain "$REGISTER" "plan_active_queue_complete=true"
must_contain "$REGISTER" "production_claim_gate_passed=false"
must_contain "$REGISTER" "stable_release_publication_performed=false"

must_contain "$MATRIX" "target_standard_100_deployment_gap_reconciled=true"
must_contain "$MATRIX" "deployment_100_blocker_resolution_plan_available=true"
must_contain "$MATRIX" "macos_current_scope_supported=true"
must_contain "$MATRIX" "macos_universal_intel_scope_still_hold=true"
must_contain "$MATRIX" "onboarding_recovery_source_ready=true"
must_contain "$MATRIX" "production_e2ee_source_gate_reviewed=true"
must_contain "$MATRIX" "c100_5_onion_evidence_blocker_closed=true"
must_contain "$MATRIX" "advanced_onion_policy_waiver_authorized=true"
must_contain "$MATRIX" "advanced_onion_waiver_scope=active-queue-unblock-only"
must_contain "$MATRIX" "advanced_onion_field_evidence_required_for_claims=true"
must_contain "$MATRIX" "advanced_onion_repeated_external_evidence_required_for_claims=true"
must_contain "$MATRIX" "external_delivery_success_claim_allowed=false"
must_contain "$MATRIX" "production_e2ee_source_ready=true"
must_contain "$MATRIX" "d100_1_e2ee_source_gate_reviewed=true"
must_contain "$MATRIX" "protocol_session_e2ee_source_ready=true"
must_contain "$MATRIX" "supported_default_transport_ready=true"
must_contain "$MATRIX" "supported_local_key_lifecycle_ready=true"
must_contain "$MATRIX" "supported_local_deletion_scope_ready=true"
must_contain "$MATRIX" "production_key_management_source_gate_reviewed=true"
must_contain "$MATRIX" "production_key_management_source_ready=true"
must_contain "$MATRIX" "d100_2_key_management_source_gate_reviewed=true"
must_contain "$MATRIX" "manual_update_integrity_policy_available=true"
must_contain "$MATRIX" "macos_signed_update_manifest_schema_available=true"
must_contain "$MATRIX" "macos_signed_update_manifest_validator_available=true"
must_contain "$MATRIX" "signed_update_manifest_candidate_verifier_ready=true"
must_contain "$MATRIX" "d100_3_signed_notarized_execution_path_reviewed=true"
must_contain "$MATRIX" "macos_signed_notarized_execution_path_available=true"
must_contain "$MATRIX" "signed_notarized_rc_execution_ready=false"
must_contain "$MATRIX" "d100_4_external_evidence_intake_execution_reviewed=true"
must_contain "$MATRIX" "external_evidence_intake_operator_ready=true"
must_contain "$MATRIX" "field_report_validator_ready=true"
must_contain "$MATRIX" "usability_report_validator_ready=true"
must_contain "$MATRIX" "fabricated_or_local_only_evidence_rejected=true"
must_contain "$MATRIX" "d100_5_windows_public_artifact_execution_path_reviewed=true"
must_contain "$MATRIX" "windows_public_artifact_execution_path_available=true"
must_contain "$MATRIX" "windows_real_runtime_result_schema_available=true"
must_contain "$MATRIX" "windows_real_runtime_smoke_passed=false"
must_contain "$MATRIX" "windows_public_artifact_ready=false"
must_contain "$MATRIX" "target_standard_100_final_active_queue_closure_available=true"
must_contain "$MATRIX" "final_active_queue_closure_reviewed=true"
must_contain "$MATRIX" "plan_active_queue_complete=true"

must_contain "$MATRIX" "pass for explicit Apple Silicon current scope; universal/Intel hold"
must_contain "$MATRIX" "source pass; representative usability hold"
must_contain "$MATRIX" "supported-scope pass; external delivery false"
must_contain "$MATRIX" "supported-scope pass; secure media deletion false"
must_contain "$MATRIX" "source pass for manual same-release policy and signed manifest candidate verification; signed update/rollback-prevention hold"
must_contain "$MATRIX" "source gate closed; production operations claim false"
must_contain "$MATRIX" "pass for current boundary; C100-5 active blocker closed by waiver; reliable external delivery false"
must_contain "$MATRIX" "source pass; identity audit false"
must_contain "$MATRIX" "D100-1 source-ready protocol/session pass; production/audit/sensitive-use/external-delivery false"
must_contain "$MATRIX" "D100-2 source-ready local key/storage pass; app wrapping/key rotation/rollback prevention/secure deletion false"
must_contain "$MATRIX" "supported-scope pass; production transport false"
must_contain "$MATRIX" "source pass for current manual release class; signed manifest candidate verifier ready; signed update hold"

must_contain "README.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "SECURITY.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "README.md" "reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
must_contain "SECURITY.md" "reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "README.md" "reference/PRODUCTION_E2EE_SOURCE_GATE.md"
must_contain "SECURITY.md" "reference/PRODUCTION_E2EE_SOURCE_GATE.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/PRODUCTION_E2EE_SOURCE_GATE.md"
must_contain "README.md" "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
must_contain "SECURITY.md" "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
must_contain "README.md" "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
must_contain "SECURITY.md" "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
must_contain "README.md" "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md"
must_contain "SECURITY.md" "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md"
must_contain "README.md" "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md"
must_contain "SECURITY.md" "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md"

for file in "$REGISTER" "$MATRIX" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "developer_id_signing_available=true"
  must_not_match "$file" "notarization_available=true"
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "macos_two_machine_real_user_flow_repeated=true"
  must_not_match "$file" "representative_usability_evidence_completed=true"
  must_not_match "$file" "windows_public_artifact_available=true"
  must_not_match "$file" "android_public_artifact_available=true"
  must_not_match "$file" "ios_public_artifact_available=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "external_review_execution_claim_allowed=true"
  must_not_match "$file" "audit_finding_closure_claim_allowed=true"
  must_not_match "$file" "field_evidence_execution_claim_allowed=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "repeated_external_onion_evidence_claim_allowed=true"
done

scripts/target_standard_100_evidence_matrix_once.sh >/dev/null
scripts/production_e2ee_source_gate_once.sh >/dev/null
scripts/production_protocol_session_lifecycle_once.sh >/dev/null
scripts/production_key_management_source_gate_once.sh >/dev/null
scripts/macos_signed_notarized_execution_path_once.sh >/dev/null
scripts/external_evidence_intake_execution_once.sh >/dev/null
scripts/windows_public_artifact_execution_path_once.sh >/dev/null
scripts/macos_universal_scoped_artifact_policy_once.sh >/dev/null
scripts/macos_production_ux_onboarding_once.sh >/dev/null
scripts/pairwise_identity_safety_product_closure_once.sh >/dev/null
scripts/production_key_rollback_deletion_closure_once.sh >/dev/null
scripts/production_default_practical_transport_closure_once.sh >/dev/null
scripts/macos_update_rollback_safe_release_channel_once.sh >/dev/null
scripts/macos_signed_update_manifest_once.sh >/dev/null
scripts/operational_support_incident_process_once.sh >/dev/null
scripts/target_standard_100_final_active_queue_closure_once.sh >/dev/null

cat <<'STATUS'
status=deployment-readiness-gap-reconciled
deployment_readiness_gap_register_reviewed=true
deployment_100_blocker_resolution_plan_available=true
target_standard_100_deployment_gap_reconciled=true
stale_generic_partial_or_hold_reduced=true
source_solved_items_promoted_to_named_supported_scope=true
external_blockers_still_visible=true
false_or_hold_items_hidden=false
public_claim_ahead_of_evidence=false
macos_current_scope_supported=true
macos_universal_intel_scope_still_hold=true
onboarding_recovery_source_ready=true
production_e2ee_source_gate_reviewed=true
c100_5_onion_evidence_blocker_closed=true
advanced_onion_policy_waiver_authorized=true
advanced_onion_field_evidence_required_for_claims=true
advanced_onion_repeated_external_evidence_required_for_claims=true
production_e2ee_source_ready=true
d100_1_e2ee_source_gate_reviewed=true
protocol_session_e2ee_source_ready=true
supported_default_transport_ready=true
supported_local_key_lifecycle_ready=true
supported_local_deletion_scope_ready=true
production_key_management_source_gate_reviewed=true
production_key_management_source_ready=true
d100_2_key_management_source_gate_reviewed=true
manual_update_integrity_policy_available=true
macos_signed_update_manifest_schema_available=true
macos_signed_update_manifest_validator_available=true
signed_update_manifest_candidate_verifier_ready=true
d100_3_signed_notarized_execution_path_reviewed=true
macos_signed_notarized_execution_path_available=true
signed_notarized_rc_execution_ready=false
d100_4_external_evidence_intake_execution_reviewed=true
external_evidence_intake_operator_ready=true
a100_1_external_security_review_packet_frozen=true
a100_2_external_review_execution_blocker_closed=true
external_review_execution_policy_waiver_authorized=true
external_review_execution_claim_allowed=false
f100_1_field_evidence_blocker_closed=true
field_evidence_policy_waiver_authorized=true
field_evidence_execution_claim_allowed=false
review_packet_synced_to_latest_source_gates=true
review_packet_finding_tracker_synced=true
field_report_validator_ready=true
usability_report_validator_ready=true
fabricated_or_local_only_evidence_rejected=true
o100_1_operations_blocker_closed=true
operations_source_gate_closed=true
final_active_queue_closure_reviewed=true
plan_active_queue_complete=true
d100_5_windows_public_artifact_execution_path_reviewed=true
windows_public_artifact_execution_path_available=true
windows_real_runtime_result_schema_available=true
windows_public_artifact_ready=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
STATUS
