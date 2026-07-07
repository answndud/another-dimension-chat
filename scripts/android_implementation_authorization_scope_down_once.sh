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
    fail "$file contains forbidden Android authorization text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md"

for file in "$DOC" "apps/mobile/android/README.md" "apps/mobile/ffi/shared_core_mobile_api_contract.json" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing required Android authorization input: $file"
done

must_contain "$DOC" "rb_11_android_implementation_authorization_scope_down_reviewed=true"
must_contain "$DOC" "android_source_shell_authorized=true"
must_contain "$DOC" "android_shared_core_boundary_ready=true"
must_contain "$DOC" "android_ffi_contract_plan_ready=true"
must_contain "$DOC" "android_runtime_messaging_authorized=false"
must_contain "$DOC" "android_runtime_messaging_created=false"
must_contain "$DOC" "android_public_artifact_ready=false"
must_contain "$DOC" "android_apk_aab_artifact_ready=false"
must_contain "$DOC" "android_play_store_distribution_ready=false"
must_contain "$DOC" "android_google_account_dependency_allowed=false"
must_contain "$DOC" "android_play_services_dependency_allowed=false"
must_contain "$DOC" "android_fcm_dependency_allowed=false"
must_contain "$DOC" "android_cloud_backup_allowed=false"
must_contain "$DOC" "android_public_claim_allowed=false"
must_contain "$DOC" "android_source_shell_no_longer_blocks_cross_platform_planning=true"
must_contain "$DOC" "android_runtime_still_blocks_android_public_claims=true"
must_contain "$DOC" "next_required_phase=RB-12 ios implementation authorization and shell closure"

must_contain "apps/mobile/android/README.md" "Android Shell Scaffold Boundary"
must_contain "apps/mobile/android/README.md" "not an APK or AAB artifact"
must_contain "apps/mobile/android/README.md" "not Play Store distribution"
must_contain "apps/mobile/android/README.md" "not production-ready"
must_contain "apps/mobile/ffi/shared_core_mobile_api_contract.json" '"first_binding_unit": "status_and_redacted_diagnostics_read_only_adapter"'
must_contain "README.md" "reference/ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md"

for file in "$DOC" "apps/mobile/android/README.md" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_not_match "$file" "android_runtime_messaging_authorized=true"
  must_not_match "$file" "android_runtime_messaging_created=true"
  must_not_match "$file" "android_public_artifact_ready=true"
  must_not_match "$file" "android_apk_aab_artifact_ready=true"
  must_not_match "$file" "android_play_store_distribution_ready=true"
  must_not_match "$file" "android_google_account_dependency_allowed=true"
  must_not_match "$file" "android_play_services_dependency_allowed=true"
  must_not_match "$file" "android_fcm_dependency_allowed=true"
  must_not_match "$file" "android_cloud_backup_allowed=true"
  must_not_match "$file" "android_public_claim_allowed=true"
done

scripts/verify_android_shell_boundary.sh >/dev/null
scripts/verify_mobile_source_handoff.sh >/dev/null

cat <<'STATUS'
status=android-implementation-authorization-scope-down-closed
rb_11_android_implementation_authorization_scope_down_reviewed=true
android_source_shell_authorized=true
android_shared_core_boundary_ready=true
android_ffi_contract_plan_ready=true
android_runtime_messaging_authorized=false
android_runtime_messaging_created=false
android_public_artifact_ready=false
android_apk_aab_artifact_ready=false
android_play_store_distribution_ready=false
android_public_claim_allowed=false
android_source_shell_no_longer_blocks_cross_platform_planning=true
android_runtime_still_blocks_android_public_claims=true
next_required_phase=RB-12-ios-implementation-authorization-and-shell-closure
STATUS
