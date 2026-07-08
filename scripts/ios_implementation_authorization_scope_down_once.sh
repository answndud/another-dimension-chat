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
    fail "$file contains forbidden iOS authorization text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md"

for file in "$DOC" "apps/mobile/ios/README.md" "apps/mobile/ffi/shared_core_mobile_api_contract.json" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing required iOS authorization input: $file"
done

must_contain "$DOC" "rb_12_ios_implementation_authorization_scope_down_reviewed=true"
must_contain "$DOC" "ios_source_shell_authorized=true"
must_contain "$DOC" "ios_shared_core_boundary_ready=true"
must_contain "$DOC" "ios_ffi_contract_plan_ready=true"
must_contain "$DOC" "ios_runtime_messaging_authorized=false"
must_contain "$DOC" "ios_runtime_messaging_created=false"
must_contain "$DOC" "ios_public_artifact_ready=false"
must_contain "$DOC" "ios_ipa_artifact_ready=false"
must_contain "$DOC" "ios_testflight_distribution_ready=false"
must_contain "$DOC" "ios_app_store_distribution_ready=false"
must_contain "$DOC" "ios_apple_account_dependency_allowed=false"
must_contain "$DOC" "ios_apns_dependency_allowed=false"
must_contain "$DOC" "ios_icloud_backup_allowed=false"
must_contain "$DOC" "ios_public_claim_allowed=false"
must_contain "$DOC" "ios_source_shell_no_longer_blocks_cross_platform_planning=true"
must_contain "$DOC" "ios_runtime_still_blocks_ios_public_claims=true"
must_contain "$DOC" "next_required_phase=RB-13 cross-platform target standard final closure"

must_contain "apps/mobile/ios/README.md" "iOS Shell Scaffold Boundary"
must_contain "apps/mobile/ios/README.md" "not an IPA artifact"
must_contain "apps/mobile/ios/README.md" "not TestFlight distribution"
must_contain "apps/mobile/ios/README.md" "not production-ready"
must_contain "apps/mobile/ffi/shared_core_mobile_api_contract.json" '"first_binding_unit": "status_and_redacted_diagnostics_read_only_adapter"'
must_reference_public_gate "README.md" "reference/IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md"

for file in "$DOC" "apps/mobile/ios/README.md" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_not_match "$file" "ios_runtime_messaging_authorized=true"
  must_not_match "$file" "ios_runtime_messaging_created=true"
  must_not_match "$file" "ios_public_artifact_ready=true"
  must_not_match "$file" "ios_ipa_artifact_ready=true"
  must_not_match "$file" "ios_testflight_distribution_ready=true"
  must_not_match "$file" "ios_app_store_distribution_ready=true"
  must_not_match "$file" "ios_apple_account_dependency_allowed=true"
  must_not_match "$file" "ios_apns_dependency_allowed=true"
  must_not_match "$file" "ios_icloud_backup_allowed=true"
  must_not_match "$file" "ios_public_claim_allowed=true"
done

scripts/verify_ios_shell_boundary.sh >/dev/null
scripts/verify_mobile_source_handoff.sh >/dev/null

cat <<'STATUS'
status=ios-implementation-authorization-scope-down-closed
rb_12_ios_implementation_authorization_scope_down_reviewed=true
ios_source_shell_authorized=true
ios_shared_core_boundary_ready=true
ios_ffi_contract_plan_ready=true
ios_runtime_messaging_authorized=false
ios_runtime_messaging_created=false
ios_public_artifact_ready=false
ios_ipa_artifact_ready=false
ios_testflight_distribution_ready=false
ios_app_store_distribution_ready=false
ios_public_claim_allowed=false
ios_source_shell_no_longer_blocks_cross_platform_planning=true
ios_runtime_still_blocks_ios_public_claims=true
next_required_phase=RB-13-cross-platform-target-standard-final-closure
STATUS
