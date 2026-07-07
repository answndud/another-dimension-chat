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
    fail "$file contains forbidden cross-platform closure text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md"

for file in "$DOC" \
  "reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md" \
  "reference/GITHUB_RELEASE_PUBLICATION_SCOPE_DOWN.md" \
  "reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md" \
  "reference/ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "reference/IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing required cross-platform closure input: $file"
done

must_contain "$DOC" "rb_13_cross_platform_target_standard_final_closure_reviewed=true"
must_contain "$DOC" "target_standard_matrix_available=true"
must_contain "$DOC" "platform_artifact_matrix_available=true"
must_contain "$DOC" "platform_public_claims_aligned=true"
must_contain "$DOC" "next_release_class=signed-public-beta-or-rc"
must_contain "$DOC" "macos_current_public_artifact_class=unsigned-experimental-public-beta"
must_contain "$DOC" "windows_current_public_artifact_class=none-local-build-candidate-only"
must_contain "$DOC" "android_current_public_artifact_class=none-source-shell-only"
must_contain "$DOC" "ios_current_public_artifact_class=none-source-shell-only"
must_contain "$DOC" "whole_target_standard_100_claim_allowed=false"
must_contain "$DOC" "production_ready_claim_allowed=false"
must_contain "$DOC" "audited_claim_allowed=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "reliable_external_delivery_claim_allowed=false"
must_contain "$DOC" "briar_cwtch_equivalent_claim_allowed=false"
must_contain "$DOC" "censorship_resistant_claim_allowed=false"
must_contain "$DOC" "stable_release_allowed=false"
must_contain "$DOC" "lower_release_class_claim_boundary_ready=true"
must_contain "$DOC" "remaining_limitations_public_safe=true"
must_contain "$DOC" "plan_active_queue_complete=true"

must_contain "README.md" "reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md"
must_contain "SECURITY.md" "reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md"

for file in "$DOC" "README.md" "SECURITY.md"; do
  must_contain "$file" "not audited"
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "whole_target_standard_100_claim_allowed=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "briar_cwtch_equivalent_claim_allowed=true"
  must_not_match "$file" "censorship_resistant_claim_allowed=true"
  must_not_match "$file" "stable_release_allowed=true"
done

scripts/production_claim_release_class_decision_once.sh >/dev/null
scripts/github_release_publication_scope_down_once.sh >/dev/null
scripts/windows_public_artifact_scope_down_once.sh >/dev/null
scripts/android_implementation_authorization_scope_down_once.sh >/dev/null
scripts/ios_implementation_authorization_scope_down_once.sh >/dev/null

cat <<'STATUS'
status=cross-platform-target-standard-final-closure-complete
rb_13_cross_platform_target_standard_final_closure_reviewed=true
target_standard_matrix_available=true
platform_artifact_matrix_available=true
platform_public_claims_aligned=true
next_release_class=signed-public-beta-or-rc
whole_target_standard_100_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
security_ready_claimed=false
sensitive_communication_allowed=false
reliable_external_delivery_claim_allowed=false
briar_cwtch_equivalent_claim_allowed=false
censorship_resistant_claim_allowed=false
stable_release_allowed=false
lower_release_class_claim_boundary_ready=true
plan_active_queue_complete=true
STATUS
