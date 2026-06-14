#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "FAIL public stable candidate rehearsal: $*" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "missing file: $1"
}

require_output() {
  local output="$1"
  local expected="$2"
  printf '%s\n' "$output" | grep -Fq -- "$expected" || fail "missing output: $expected"
}

require_file "$ROOT_DIR/scripts/final_acceptance_once.sh"
require_file "$ROOT_DIR/scripts/android_public_app_candidate_once.sh"
require_file "$ROOT_DIR/scripts/ios_public_app_candidate_once.sh"
require_file "$ROOT_DIR/scripts/external_review_audit_readiness_once.sh"
require_file "$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh"
require_file "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"

bash -n "$ROOT_DIR/scripts/final_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/android_public_app_candidate_once.sh"
bash -n "$ROOT_DIR/scripts/ios_public_app_candidate_once.sh"
bash -n "$ROOT_DIR/scripts/external_review_audit_readiness_once.sh"
bash -n "$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh"
bash -n "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"

android_output="$("$ROOT_DIR/scripts/android_public_app_candidate_once.sh")"
require_output "$android_output" "status=android-public-app-candidate-source-ready"
require_output "$android_output" "android_shell_uses_shared_core_json_bridge_candidate=true"
require_output "$android_output" "android_forbidden_dependency_scan_ready=true"
require_output "$android_output" "android_apk_aab_artifact_ready=false"
require_output "$android_output" "android_public_artifact_ready=false"
require_output "$android_output" "android_public_claim_allowed=false"
require_output "$android_output" "mobile_readiness_claimed=false"

ios_output="$("$ROOT_DIR/scripts/ios_public_app_candidate_once.sh")"
require_output "$ios_output" "status=ios-public-app-candidate-source-ready"
require_output "$ios_output" "ios_shell_uses_shared_core_json_bridge_candidate=true"
require_output "$ios_output" "ios_forbidden_dependency_scan_ready=true"
require_output "$ios_output" "ios_ipa_artifact_ready=false"
require_output "$ios_output" "ios_testflight_distribution_ready=false"
require_output "$ios_output" "ios_app_store_distribution_ready=false"
require_output "$ios_output" "ios_public_artifact_ready=false"
require_output "$ios_output" "ios_public_claim_allowed=false"
require_output "$ios_output" "mobile_readiness_claimed=false"

scanner_output="$("$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh")"
require_output "$scanner_output" "forbidden_positive_claims_found=false"
require_output "$scanner_output" "stable_candidate_claim_allowed=false"
require_output "$scanner_output" "high_risk_public_claim_allowed=false"

external_review_output="$("$ROOT_DIR/scripts/external_review_audit_readiness_once.sh")"
require_output "$external_review_output" "independent_review_packet_source_ready=true"
require_output "$external_review_output" "independent_review_packet_public_safe=true"
require_output "$external_review_output" "stable_candidate_evidence_required_before_external_review=true"
require_output "$external_review_output" "external_review_not_local_source_progress_blocker=true"
require_output "$external_review_output" "external_review_completed=false"
require_output "$external_review_output" "audit_completed=false"
require_output "$external_review_output" "audited_claim_allowed=false"

if final_output="$("$ROOT_DIR/scripts/final_acceptance_once.sh" 2>&1)"; then
  fail "final acceptance unexpectedly opened stable/public claim"
fi

require_output "$final_output" "stable_candidate_ready=false"
require_output "$final_output" "stable_public_app_ready=false"
require_output "$final_output" "high_risk_mode_ready=false"
require_output "$final_output" "release_decision=hold"
require_output "$final_output" "forbidden_positive_public_claims_found=false"
require_output "$final_output" "external_two_machine_evidence_present=false"
require_output "$final_output" "independent_review_packet_source_ready=true"
require_output "$final_output" "stable_candidate_evidence_required_before_external_review=true"
require_output "$final_output" "external_review_not_local_source_progress_blocker=true"
require_output "$final_output" "external_review_complete=false"
require_output "$final_output" "external_review_claim_allowed=false"
require_output "$final_output" "audited_claim_allowed=false"
require_output "$final_output" "stable_candidate_blocked_by_external_review_evidence=true"
require_output "$final_output" "macos_public_artifact_consistency_verified=false"
require_output "$final_output" "windows_public_artifact_consistency_verified=false"
require_output "$final_output" "android_public_app_candidate_source_ready=true"
require_output "$final_output" "android_apk_aab_artifact_ready=false"
require_output "$final_output" "android_public_artifact_ready=false"
require_output "$final_output" "android_public_claim_allowed=false"
require_output "$final_output" "ios_public_app_candidate_source_ready=true"
require_output "$final_output" "ios_ipa_artifact_ready=false"
require_output "$final_output" "ios_testflight_distribution_ready=false"
require_output "$final_output" "ios_app_store_distribution_ready=false"
require_output "$final_output" "ios_public_artifact_ready=false"
require_output "$final_output" "ios_public_claim_allowed=false"
require_output "$final_output" "mobile_readiness_claimed=false"
require_output "$final_output" "stable_candidate_blocked_by_p0_p1_audit=true"
require_output "$final_output" "high_risk_blocked_by_missing_required_conditions=true"

if git -C "$ROOT_DIR" ls-files docs | grep -q .; then
  git -C "$ROOT_DIR" ls-files docs >&2
  fail "private docs are tracked"
fi

if git -C "$ROOT_DIR" ls-files 'apps/desktop-tauri/public-release/*' 'beta-artifacts/*' | grep -q .; then
  git -C "$ROOT_DIR" ls-files 'apps/desktop-tauri/public-release/*' 'beta-artifacts/*' >&2
  fail "generated release artifacts are tracked"
fi

cat <<'EOF'
phase38_rehearsal=source-only-hold
generated_artifacts_created=false
docs_tracked=false
stable_candidate_ready=false
stable_public_app_ready=false
high_risk_mode_ready=false
release_decision=hold
forbidden_positive_claims_found=false
external_evidence_presence=false
independent_review_packet_source_ready=true
stable_candidate_evidence_required_before_external_review=true
external_review_not_local_source_progress_blocker=true
external_review_complete=false
external_review_claim_allowed=false
audited_claim_allowed=false
artifact_consistency_verified=false
android_public_app_candidate_source_ready=true
android_apk_aab_artifact_ready=false
android_public_artifact_ready=false
android_public_claim_allowed=false
ios_public_app_candidate_source_ready=true
ios_ipa_artifact_ready=false
ios_testflight_distribution_ready=false
ios_app_store_distribution_ready=false
ios_public_artifact_ready=false
ios_public_claim_allowed=false
mobile_readiness_claimed=false
production_claim_allowed=false
high_risk_public_claim_allowed=false
EOF
