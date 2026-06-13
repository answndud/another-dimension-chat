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
    fail "$file contains forbidden deployment 100 blocker pattern: $pattern"
  fi
}

output_must_contain() {
  local output="$1"
  local needle="$2"
  printf '%s\n' "$output" | grep -Fq "$needle" || fail "credential probe missing: $needle"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PLAN="reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
ACTIVE="reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md"
REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"

for file in "$PLAN" "$MATRIX" "$ACTIVE" "$REGISTER" \
  "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md" \
  "reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md" \
  "scripts/collect_macos_release_credential_evidence.sh" \
  "reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md" \
  "reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md" \
  "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" \
  "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md" \
  "reference/STABLE_MACOS_V1_RELEASE_GATE.md" \
  "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md" \
  "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" \
  "reference/ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "reference/IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing deployment 100 blocker resolution input: $file"
done

must_contain "$PLAN" "deployment_100_blocker_resolution_plan_available=true"
must_contain "$PLAN" "deployment_100_blocker_resolution_machine_checkable=true"
must_contain "$PLAN" "all_false_hold_flags_categorized=true"
must_contain "$PLAN" "next_required_phase=Phase A100-1 - External Security Review Packet Freeze"

for phase in \
  "M100-1" "M100-2" "M100-3" "M100-4" "M100-5" "C100-1" "C100-2" \
  "C100-3" "C100-4" "C100-5" "M100-6" "M100-7" "M100-8" \
  "A100-1" "A100-2" "F100-1" "O100-1" "W100-1" "W100-2" \
  "X100-1" "MOB100-0" "MOB100-1" "MOB100-2" "MOB100-3" \
  "X100-2" "R100-1" "R100-2" "R100-3"; do
  must_contain "$PLAN" "$phase"
  must_contain "$ACTIVE" "$phase"
done

for linked in \
  "DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md" \
  "TARGET_STANDARD_100_EVIDENCE_MATRIX.md" \
  "TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md" \
  "DEPLOYMENT_READINESS_GAP_REGISTER.md" \
  "RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md" \
  "MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md" \
  "MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md" \
  "MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md" \
  "MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" \
  "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md" \
  "STABLE_MACOS_V1_RELEASE_GATE.md" \
  "EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md" \
  "WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" \
  "ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md"; do
  must_contain "$PLAN" "$linked"
done

must_contain "README.md" "reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
must_contain "SECURITY.md" "reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
must_contain "$MATRIX" "DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
must_contain "$REGISTER" "DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"

for flag in \
  "developer_id_signing_available=false" \
  "m100_1_credential_blocker_closed=true" \
  "release_credential_policy_waiver_authorized=true" \
  "signed_notarized_release_requires_actual_credentials=true" \
  "m100_3_artifact_blocker_closed=true" \
  "signed_notarized_rc_policy_waiver_authorized=true" \
  "signed_notarized_artifact_required_for_distribution_claims=true" \
  "m100_6_usability_blocker_closed=true" \
  "representative_usability_policy_waiver_authorized=true" \
  "representative_usability_evidence_required_for_stable_claims=true" \
  "m100_7_update_blocker_closed=true" \
  "update_channel_policy_waiver_authorized=true" \
  "signed_update_or_rollback_evidence_required_for_stable_claims=true" \
  "m100_8_stable_release_blocker_closed=true" \
  "stable_release_policy_waiver_authorized=true" \
  "stable_release_evidence_required_for_public_copy_upgrade=true" \
  "c100_1_e2ee_blocker_closed=true" \
  "production_e2ee_policy_waiver_authorized=true" \
  "production_e2ee_external_review_required_for_claims=true" \
  "production_e2ee_field_evidence_required_for_claims=true" \
  "c100_2_identity_blocker_closed=true" \
  "pairwise_identity_policy_waiver_authorized=true" \
  "pairwise_identity_external_audit_required_for_claims=true" \
  "pairwise_identity_field_evidence_required_for_claims=true" \
  "c100_3_key_management_blocker_closed=true" \
  "key_management_policy_waiver_authorized=true" \
  "app_key_wrapping_required_for_key_management_claims=true" \
  "rollback_prevention_external_monotonic_state_required_for_claims=true" \
  "secure_deletion_evidence_required_for_claims=true" \
  "c100_4_transport_blocker_closed=true" \
  "default_transport_policy_waiver_authorized=true" \
  "default_transport_usability_evidence_required_for_claims=true" \
  "default_transport_field_evidence_required_for_claims=true" \
  "c100_5_onion_evidence_blocker_closed=true" \
  "advanced_onion_policy_waiver_authorized=true" \
  "advanced_onion_waiver_scope=active-queue-unblock-only" \
  "advanced_onion_field_evidence_required_for_claims=true" \
  "advanced_onion_repeated_external_evidence_required_for_claims=true" \
  "external_delivery_success_claim_allowed=false" \
  "reliable_external_delivery_claim_allowed=false" \
  "repeated_external_onion_evidence_claim_allowed=false" \
  "macos_release_credential_evidence_schema_available=true" \
  "macos_release_credential_evidence_validator_available=true" \
  "macos_release_credential_evidence_collector_available=true" \
  "macos_release_credential_evidence_collector_source_ready=true" \
  "macos_release_credential_evidence_intake_ready=true" \
  "macos_release_credential_evidence_current_head_bound=true" \
  "macos_release_credential_evidence_private_docs_path_bound=true" \
  "apple_developer_team_id_recorded=false" \
  "notarization_credential_available=false" \
  "notarytool_credential_validated=false" \
  "signed_notarized_rc_artifact_available=false" \
  "stable_signed_notarized_artifact_available=false" \
  "gatekeeper_no_exception_open_proven=false" \
  "external_review_completed=false" \
  "audit_completed=false" \
  "reviewer_signoff_claimed=false" \
  "macos_two_machine_real_user_flow_repeated=false" \
  "repeated_redacted_field_reports_available=false" \
  "representative_usability_evidence_completed=false" \
  "windows_real_runtime_smoke_passed=false" \
  "windows_public_artifact_ready=false" \
  "android_public_artifact_available=false" \
  "ios_public_artifact_available=false" \
  "production_e2ee_ready=false" \
  "production_key_management_ready=false" \
  "app_key_wrapping_ready=false" \
  "key_rotation_ready=false" \
  "rollback_prevention_claimed=false" \
  "secure_deletion_claim_allowed=false" \
  "production_transport_ready=false" \
  "production_operational_readiness_claim_allowed=false" \
  "macos_signed_update_manifest_schema_available=true" \
  "macos_signed_update_manifest_validator_available=true" \
  "signed_update_manifest_candidate_verifier_ready=true" \
  "signed_update_manifest_ready=false" \
  "update_signature_ready=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false" \
  "macos_public_app_100_claim_allowed=false" \
  "whole_target_standard_100_claim_allowed=false" \
  "stable_release_allowed=false" \
  "release_upload_authorized=false" \
  "dmg_rebuild_authorized=false" \
  "false_or_hold_items_hidden=false" \
  "public_claim_ahead_of_evidence=false"; do
  must_contain "$PLAN" "$flag"
done

for file in "$PLAN" "$MATRIX" "$REGISTER" "$ACTIVE" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "macos_public_app_100_claim_allowed=true"
  must_not_match "$file" "whole_target_standard_100_claim_allowed=true"
  must_not_match "$file" "stable_release_allowed=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
done

scripts/target_standard_100_evidence_matrix_once.sh >/dev/null
scripts/target_standard_100_active_queue_closure_once.sh >/dev/null
scripts/deployment_readiness_gap_reconciliation_once.sh >/dev/null
scripts/stable_macos_v1_release_gate_once.sh >/dev/null
scripts/macos_release_credential_evidence_once.sh >/dev/null
scripts/macos_signed_update_manifest_once.sh >/dev/null
scripts/macos_update_rollback_safe_release_channel_once.sh >/dev/null
scripts/macos_universal_scoped_artifact_policy_once.sh >/dev/null
scripts/macos_signed_notarized_rc_artifact_once.sh >/dev/null
scripts/macos_signed_notarized_execution_path_once.sh >/dev/null

credential_status=0
credential_output="$(scripts/release_authority_credential_unblock_once.sh 2>&1)" || credential_status=$?
if [ "$credential_status" -eq 0 ]; then
  output_must_contain "$credential_output" "m100_1_credential_blocker_closed=true"
  if printf '%s\n' "$credential_output" | grep -Fq "signed_notarized_release_ready=true"; then
    m100_1_release_credentials_ready=true
  else
    output_must_contain "$credential_output" "m100_1_release_credentials_ready=false"
    output_must_contain "$credential_output" "release_credential_policy_waiver_authorized=true"
    output_must_contain "$credential_output" "signed_notarized_release_requires_actual_credentials=true"
    m100_1_release_credentials_ready=false
  fi
else
  output_must_contain "$credential_output" "developer_id_signing_available=false"
  output_must_contain "$credential_output" "notarization_credential_available=false"
  output_must_contain "$credential_output" "notarytool_credential_validated=false"
  output_must_contain "$credential_output" "signed_notarized_release_ready=false"
  output_must_contain "$credential_output" "release credentials blocked"
  m100_1_release_credentials_ready=false
fi

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<STATUS
status=deployment-100-blocker-resolution-plan-ready
deployment_100_blocker_resolution_plan_available=true
deployment_100_blocker_resolution_machine_checkable=true
all_false_hold_flags_categorized=true
m100_1_credential_blocker_closed=true
m100_3_artifact_blocker_closed=true
m100_6_usability_blocker_closed=true
m100_7_update_blocker_closed=true
m100_8_stable_release_blocker_closed=true
c100_1_e2ee_blocker_closed=true
c100_2_identity_blocker_closed=true
c100_3_key_management_blocker_closed=true
c100_4_transport_blocker_closed=true
c100_5_onion_evidence_blocker_closed=true
m100_1_release_credentials_ready=$m100_1_release_credentials_ready
false_or_hold_items_hidden=false
public_claim_ahead_of_evidence=false
macos_public_app_100_claim_allowed=false
whole_target_standard_100_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
stable_release_allowed=false
release_upload_authorized=false
dmg_rebuild_authorized=false
next_required_phase=Phase-A100-1-External-Security-Review-Packet-Freeze
STATUS
