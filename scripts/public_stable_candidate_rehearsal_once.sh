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
require_file "$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh"
require_file "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"

bash -n "$ROOT_DIR/scripts/final_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh"
bash -n "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"

scanner_output="$("$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh")"
require_output "$scanner_output" "forbidden_positive_claims_found=false"
require_output "$scanner_output" "stable_candidate_claim_allowed=false"
require_output "$scanner_output" "high_risk_public_claim_allowed=false"

if final_output="$("$ROOT_DIR/scripts/final_acceptance_once.sh" 2>&1)"; then
  fail "final acceptance unexpectedly opened stable/public claim"
fi

require_output "$final_output" "stable_candidate_ready=false"
require_output "$final_output" "stable_public_app_ready=false"
require_output "$final_output" "high_risk_mode_ready=false"
require_output "$final_output" "release_decision=hold"
require_output "$final_output" "forbidden_positive_public_claims_found=false"
require_output "$final_output" "external_two_machine_evidence_present=false"
require_output "$final_output" "macos_public_artifact_consistency_verified=false"
require_output "$final_output" "windows_public_artifact_consistency_verified=false"
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
artifact_consistency_verified=false
production_claim_allowed=false
high_risk_public_claim_allowed=false
EOF
