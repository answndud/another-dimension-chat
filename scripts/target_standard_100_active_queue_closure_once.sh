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
    fail "$file contains forbidden active queue closure pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md"

for file in "$DOC" \
  "README.md" \
  "SECURITY.md" \
  "reference/INDEPENDENT_REVIEW_PACKET.md" \
  "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "reference/STABLE_MACOS_V1_RELEASE_GATE.md"; do
  [ -f "$file" ] || fail "missing active queue closure input: $file"
done

must_contain "$DOC" "target_standard_100_active_queue_source_closure_reviewed=true"
must_contain "$DOC" "all_plan_active_phases_have_source_or_hold_gate=true"
must_contain "$DOC" "false_or_hold_items_hidden=false"
must_contain "$DOC" "public_claim_ahead_of_evidence=false"
must_contain "$DOC" "production_ready_claim_allowed=false"
must_contain "$DOC" "c100_1_e2ee_blocker_closed=true"
must_contain "$DOC" "production_e2ee_policy_waiver_authorized=true"
must_contain "$DOC" "production_e2ee_external_review_required_for_claims=true"
must_contain "$DOC" "production_e2ee_field_evidence_required_for_claims=true"
must_contain "$DOC" "c100_2_identity_blocker_closed=true"
must_contain "$DOC" "pairwise_identity_policy_waiver_authorized=true"
must_contain "$DOC" "pairwise_identity_external_audit_required_for_claims=true"
must_contain "$DOC" "pairwise_identity_field_evidence_required_for_claims=true"
must_contain "$DOC" "c100_3_key_management_blocker_closed=true"
must_contain "$DOC" "key_management_policy_waiver_authorized=true"
must_contain "$DOC" "app_key_wrapping_required_for_key_management_claims=true"
must_contain "$DOC" "rollback_prevention_external_monotonic_state_required_for_claims=true"
must_contain "$DOC" "secure_deletion_evidence_required_for_claims=true"
must_contain "$DOC" "c100_4_transport_blocker_closed=true"
must_contain "$DOC" "default_transport_policy_waiver_authorized=true"
must_contain "$DOC" "default_transport_usability_evidence_required_for_claims=true"
must_contain "$DOC" "default_transport_field_evidence_required_for_claims=true"
must_contain "$DOC" "c100_5_onion_evidence_blocker_closed=true"
must_contain "$DOC" "advanced_onion_policy_waiver_authorized=true"
must_contain "$DOC" "advanced_onion_waiver_scope=active-queue-unblock-only"
must_contain "$DOC" "advanced_onion_field_evidence_required_for_claims=true"
must_contain "$DOC" "advanced_onion_repeated_external_evidence_required_for_claims=true"
must_contain "$DOC" "external_delivery_success_claim_allowed=false"
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
must_contain "$DOC" "beta_wording_removal_allowed=false"
must_contain "$DOC" "audited_claim_allowed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "reliable_external_delivery_claim_allowed=false"
must_contain "$DOC" "repeated_external_onion_evidence_claim_allowed=false"
must_contain "$DOC" "briar_cwtch_equivalent_claim_allowed=false"
must_contain "$DOC" "censorship_resistant_claim_allowed=false"
must_contain "$DOC" "macos_public_app_100_claim_allowed=false"
must_contain "$DOC" "whole_target_standard_100_claim_allowed=false"
must_contain "$DOC" "stable_release_allowed=false"
must_contain "$DOC" "m100_8_stable_release_blocker_closed=true"
must_contain "$DOC" "stable_release_policy_waiver_authorized=true"
must_contain "$DOC" "stable_release_evidence_required_for_public_copy_upgrade=true"
must_contain "$DOC" "public_copy_upgrade_authorized=false"
must_contain "$DOC" "public_copy_upgrade_performed=false"
must_contain "$DOC" "release_upload_authorized=false"
must_contain "$DOC" "dmg_rebuild_authorized=false"
must_contain "$DOC" "generated_release_artifacts_staged=false"
must_contain "$DOC" "docs_private_uncommitted=true"
must_contain "$DOC" "agents_md_stage_allowed=false"

for phase in \
  "M100-1" "M100-2" "M100-3" "M100-4" "M100-5" \
  "C100-1" "C100-2" "C100-3" "C100-4" "C100-5" \
  "M100-6" "M100-7" "M100-8" "A100-1" "A100-2" "F100-1" "O100-1" \
  "W100-1" "W100-2" "X100-1" "MOB100-0" "MOB100-1" "MOB100-2" \
  "MOB100-3" "X100-2" "R100-1" "R100-2" "R100-3"; do
  must_contain "$DOC" "$phase"
done

must_contain "$DOC" "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
must_contain "$DOC" "scripts/release_authority_credential_unblock_once.sh"
must_contain "$DOC" "reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md"
must_contain "$DOC" "scripts/macos_universal_scoped_artifact_policy_once.sh"
must_contain "$DOC" "reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md"
must_contain "$DOC" "scripts/macos_signed_notarized_rc_artifact_once.sh"
must_contain "$DOC" "deployment_100_blocker_resolution_plan_available=true"

must_contain "README.md" "reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md"
must_contain "SECURITY.md" "reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md"
must_contain "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md" "TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md"

for file in "$DOC" "README.md" "SECURITY.md" "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "reference/STABLE_MACOS_V1_RELEASE_GATE.md"; do
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "beta_wording_removal_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "external_review_execution_claim_allowed=true"
  must_not_match "$file" "audit_finding_closure_claim_allowed=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "repeated_external_onion_evidence_claim_allowed=true"
  must_not_match "$file" "briar_cwtch_equivalent_claim_allowed=true"
  must_not_match "$file" "censorship_resistant_claim_allowed=true"
  must_not_match "$file" "macos_public_app_100_claim_allowed=true"
  must_not_match "$file" "whole_target_standard_100_claim_allowed=true"
  must_not_match "$file" "stable_release_allowed=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
done

scripts/macos_production_ux_onboarding_once.sh >/dev/null
scripts/macos_usability_recovery_closure_once.sh >/dev/null
scripts/production_protocol_session_lifecycle_once.sh >/dev/null
scripts/pairwise_identity_safety_product_closure_once.sh >/dev/null
scripts/production_key_management_source_gate_once.sh >/dev/null
scripts/production_key_storage_lifecycle_once.sh >/dev/null
scripts/production_key_rollback_deletion_closure_once.sh >/dev/null
scripts/production_default_transport_product_path_once.sh >/dev/null
scripts/production_default_practical_transport_closure_once.sh >/dev/null
scripts/macos_update_rollback_safe_release_channel_once.sh >/dev/null
scripts/stable_macos_v1_release_gate_once.sh >/dev/null
scripts/external_review_audit_readiness_once.sh >/dev/null
scripts/field_evidence_reliability_program_once.sh >/dev/null
scripts/operational_support_incident_process_once.sh >/dev/null
scripts/desktop_windows_local_runtime_smoke_boundary_once.sh >/dev/null
scripts/windows_public_artifact_scope_down_once.sh >/dev/null
scripts/cross_platform_target_standard_final_closure_once.sh >/dev/null
scripts/verify_mobile_authorization_boundary_closure.sh >/dev/null
scripts/verify_mobile_binding_gate.sh >/dev/null
scripts/verify_android_shell_boundary.sh >/dev/null
scripts/verify_ios_shell_boundary.sh >/dev/null
scripts/production_claim_policy_once.sh >/dev/null
scripts/github_release_publication_scope_down_once.sh >/dev/null
scripts/target_standard_100_evidence_matrix_once.sh >/dev/null

if git diff --cached --name-only -- docs AGENTS.md public-release beta-artifacts | grep -q .; then
  fail "docs, AGENTS.md, or generated release artifacts are staged"
fi

cat <<'STATUS'
status=target-standard-100-active-queue-source-closure-ready
target_standard_100_active_queue_source_closure_reviewed=true
all_plan_active_phases_have_source_or_hold_gate=true
false_or_hold_items_hidden=false
public_claim_ahead_of_evidence=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
reliable_external_delivery_claim_allowed=false
macos_public_app_100_claim_allowed=false
whole_target_standard_100_claim_allowed=false
stable_release_allowed=false
release_upload_authorized=false
dmg_rebuild_authorized=false
next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision
STATUS
