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

must_contain_sensitive_nonclaim() {
  local file="$1"
  if grep -Fq "sensitive communication prohibited" "$file"; then
    return
  fi
  if [ "$file" = "README.md" ] &&
    { grep -Fq "it for sensitive communication." "$file" ||
      grep -Fq "safety for sensitive communication" "$file"; }; then
    return
  fi
  fail "$file missing required sensitive-communication non-claim"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden final active queue closure pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/TARGET_STANDARD_100_FINAL_ACTIVE_QUEUE_CLOSURE.md"
ACTIVE="reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
PLAN="reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"

for file in "$DOC" "$ACTIVE" "$MATRIX" "$PLAN" "$REGISTER" \
  "reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md" \
  "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" \
  "reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md" \
  "reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md" \
  "reference/ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "reference/IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md" \
  "reference/GITHUB_RELEASE_PUBLICATION_SCOPE_DOWN.md" \
  "reference/STABLE_MACOS_V1_RELEASE_GATE.md" \
  "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" \
  "scripts/desktop_windows_local_runtime_smoke_boundary_once.sh" \
  "scripts/windows_public_artifact_execution_path_once.sh" \
  "scripts/windows_public_artifact_scope_down_once.sh" \
  "scripts/cross_platform_target_standard_final_closure_once.sh" \
  "scripts/verify_mobile_authorization_boundary_closure.sh" \
  "scripts/verify_mobile_binding_gate.sh" \
  "scripts/verify_android_shell_boundary.sh" \
  "scripts/verify_ios_shell_boundary.sh" \
  "scripts/production_claim_policy_once.sh" \
  "scripts/production_claim_release_class_decision_once.sh" \
  "scripts/github_release_publication_scope_down_once.sh" \
  "scripts/mobile_generated_artifact_guard_once.sh" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing final active queue closure input: $file"
done

for phase in \
  "W100-1 Windows Runtime Parity Scope Unlock" \
  "W100-2 Windows Public Artifact And Distribution" \
  "X100-1 Cross-Desktop Product Parity" \
  "MOB100-0 Mobile Scope Unlock Decision" \
  "MOB100-1 Shared Rust Core Mobile API Stabilization" \
  "MOB100-2 Android Public App Candidate" \
  "MOB100-3 iOS Public App Candidate" \
  "X100-2 Cross-Platform Field Evidence And Support" \
  "R100-1 Production Claim Gate Pass" \
  "R100-2 Stable macOS Public Release" \
  "R100-3 Whole-Product TARGET_STANDARD 100 Release Gate"; do
  must_contain "$DOC" "$phase"
  must_contain "$PLAN" "$phase"
done

for flag in \
  "final_active_queue_closure_reviewed=true" \
  "final_active_queue_range=W100-1-through-R100-3" \
  "all_remaining_active_phases_closed_by_source_or_hold_gate=true" \
  "w100_1_windows_runtime_parity_scope_blocker_closed=true" \
  "w100_2_windows_public_artifact_blocker_closed=true" \
  "x100_1_cross_desktop_product_parity_blocker_closed=true" \
  "mob100_0_mobile_scope_unlock_decision_closed=true" \
  "mob100_1_mobile_api_stabilization_blocker_closed=true" \
  "mob100_2_android_public_app_candidate_blocker_closed=true" \
  "mob100_3_ios_public_app_candidate_blocker_closed=true" \
  "x100_2_cross_platform_field_support_blocker_closed=true" \
  "r100_1_production_claim_gate_decision_closed=true" \
  "r100_2_stable_macos_release_decision_closed=true" \
  "r100_3_whole_product_target_standard_gate_decision_closed=true" \
  "plan_active_queue_complete=true" \
  "next_required_phase=no-active-source-queue" \
  "windows_real_runtime_smoke_passed=false" \
  "windows_public_artifact_ready=false" \
  "windows_public_artifact_upload_allowed=false" \
  "android_runtime_messaging_authorized=false" \
  "android_public_artifact_ready=false" \
  "ios_runtime_messaging_authorized=false" \
  "ios_public_artifact_ready=false" \
  "external_review_completed=false" \
  "audit_completed=false" \
  "macos_two_machine_real_user_flow_repeated=false" \
  "repeated_redacted_field_reports_available=false" \
  "production_claim_gate_passed=false" \
  "stable_release_publication_performed=false" \
  "release_upload_authorized=false" \
  "dmg_rebuild_authorized=false" \
  "macos_public_app_100_claim_allowed=false" \
  "whole_target_standard_100_claim_allowed=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false" \
  "reliable_external_delivery_claim_allowed=false" \
  "repeated_external_onion_evidence_claim_allowed=false" \
  "false_or_hold_items_hidden=false" \
  "public_claim_ahead_of_evidence=false" \
  "docs_private_uncommitted=true" \
  "agents_md_stage_allowed=false"; do
  must_contain "$DOC" "$flag"
done

for file in "$DOC" "$ACTIVE" "$MATRIX" "$PLAN" "$REGISTER" \
  "reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "reference/STABLE_MACOS_V1_RELEASE_GATE.md" \
  "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_contain_sensitive_nonclaim "$file"
  must_not_match "$file" "windows_real_runtime_smoke_passed=true"
  must_not_match "$file" "windows_public_artifact_ready=true"
  must_not_match "$file" "android_public_artifact_ready=true"
  must_not_match "$file" "ios_public_artifact_ready=true"
  must_not_match "$file" "production_claim_gate_passed=true"
  must_not_match "$file" "stable_release_publication_performed=true"
  must_not_match "$file" "macos_public_app_100_claim_allowed=true"
  must_not_match "$file" "whole_target_standard_100_claim_allowed=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
done

scripts/desktop_windows_local_runtime_smoke_boundary_once.sh >/dev/null
scripts/windows_public_artifact_execution_path_once.sh >/dev/null
scripts/windows_public_artifact_scope_down_once.sh >/dev/null
scripts/cross_platform_target_standard_final_closure_once.sh >/dev/null
scripts/verify_mobile_authorization_boundary_closure.sh >/dev/null
scripts/verify_mobile_binding_gate.sh >/dev/null
scripts/verify_android_shell_boundary.sh >/dev/null
scripts/verify_ios_shell_boundary.sh >/dev/null
scripts/production_claim_policy_once.sh >/dev/null
scripts/production_claim_release_class_decision_once.sh >/dev/null
scripts/github_release_publication_scope_down_once.sh >/dev/null
scripts/mobile_generated_artifact_guard_once.sh >/dev/null

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=target-standard-100-final-active-queue-closure-ready
final_active_queue_closure_reviewed=true
final_active_queue_range=W100-1-through-R100-3
all_remaining_active_phases_closed_by_source_or_hold_gate=true
w100_1_windows_runtime_parity_scope_blocker_closed=true
w100_2_windows_public_artifact_blocker_closed=true
x100_1_cross_desktop_product_parity_blocker_closed=true
mob100_0_mobile_scope_unlock_decision_closed=true
mob100_1_mobile_api_stabilization_blocker_closed=true
mob100_2_android_public_app_candidate_blocker_closed=true
mob100_3_ios_public_app_candidate_blocker_closed=true
x100_2_cross_platform_field_support_blocker_closed=true
r100_1_production_claim_gate_decision_closed=true
r100_2_stable_macos_release_decision_closed=true
r100_3_whole_product_target_standard_gate_decision_closed=true
plan_active_queue_complete=true
generated_artifacts_staged=false
production_claim_gate_passed=false
stable_release_publication_performed=false
macos_public_app_100_claim_allowed=false
whole_target_standard_100_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
release_upload_authorized=false
dmg_rebuild_authorized=false
next_required_phase=no-active-source-queue
STATUS
