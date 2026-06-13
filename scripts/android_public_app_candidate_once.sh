#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

DOC="reference/ANDROID_PUBLIC_APP_CANDIDATE.md"
VALIDATOR="scripts/validate_android_public_artifact_manifest.mjs"

for file in "$DOC" "$VALIDATOR" \
  "apps/mobile/android/app/src/main/AndroidManifest.xml" \
  "apps/mobile/android/app/src/main/res/xml/data_extraction_rules.xml" \
  "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/JsonBridgeSharedCoreAdapter.kt" \
  "scripts/verify_mobile_forbidden_dependency_scan_once.sh"; do
  [ -f "$file" ] || fail "missing Android public app candidate input: $file"
done

for flag in \
  "android_public_app_candidate_path_ready=true" \
  "android_artifact_manifest_schema_available=true" \
  "android_artifact_manifest_validator_available=true" \
  "android_public_artifact_checksum_verifier_ready=true" \
  "android_shell_uses_shared_core_json_bridge_candidate=true" \
  "android_forbidden_dependency_scan_ready=true" \
  "android_backup_exclusion_configured=true" \
  "android_release_package_smoke_ready=false" \
  "android_real_device_smoke_passed=false" \
  "android_release_signing_ready=false" \
  "android_apk_aab_artifact_ready=false" \
  "android_public_artifact_ready=false" \
  "android_public_artifact_upload_allowed=false" \
  "android_play_store_distribution_ready=false" \
  "android_generated_artifact_commit_allowed=false" \
  "android_public_claim_allowed=false" \
  "mobile_readiness_claimed=false" \
  "production_ready_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$VALIDATOR" "android-public-artifact-manifest-v1"
must_contain "apps/mobile/android/app/src/main/AndroidManifest.xml" 'android:allowBackup="false"'
must_contain "apps/mobile/android/app/src/main/res/xml/data_extraction_rules.xml" '<exclude domain="database" path="."'
must_contain "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/JsonBridgeSharedCoreAdapter.kt" "RuntimeScopeUnlockedJsonBridgeMobileApi"

node --check "$VALIDATOR" >/dev/null
scripts/verify_mobile_forbidden_dependency_scan_once.sh >/dev/null

empty_output="$(node "$VALIDATOR" "$ROOT/apps/mobile/android/public-release")"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-android-public-artifact-manifest" ||
  fail "empty Android artifact manifest validator did not wait"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
artifact="$tmp_dir/another-dimension-0.1.0-runtime-candidate.apk"
printf 'android artifact fixture\n' >"$artifact"
artifact_sha="$(shasum -a 256 "$artifact" | awk '{print $1}')"
artifact_size="$(wc -c <"$artifact" | tr -d ' ')"
printf '%s  %s\n' "$artifact_sha" "$(basename "$artifact")" >"$tmp_dir/another-dimension-0.1.0-runtime-candidate.apk.sha256"
cat >"$tmp_dir/another-dimension-0.1.0-runtime-candidate.apk.provenance.json" <<JSON
{
  "schema_version": "android-public-artifact-provenance-v1",
  "source_commit": "abcdef1234567890",
  "artifact_sha256": "$artifact_sha",
  "android_public_artifact_ready": false
}
JSON
cat >"$tmp_dir/ANDROID_PUBLIC_ARTIFACT_MANIFEST.json" <<JSON
{
  "schema_version": "android-public-artifact-manifest-v1",
  "platform": "android",
  "source_commit": "abcdef1234567890",
  "version": "0.1.0",
  "artifact_kind": "apk",
  "distribution_path": "sideload-hold",
  "signing_status": "unsigned-debug-hold",
  "same_release_asset_authority_required": true,
  "real_device_smoke_passed": true,
  "backup_exclusion_verified": true,
  "forbidden_dependency_scan_passed": true,
  "android_public_artifact_ready": false,
  "android_public_artifact_upload_allowed": false,
  "android_generated_artifact_commit_allowed": false,
  "public_non_claims": [
    "sensitive communication prohibited",
    "not audited",
    "not production-ready",
    "no Android public artifact"
  ],
  "artifact": {
    "filename": "another-dimension-0.1.0-runtime-candidate.apk",
    "sha256": "$artifact_sha",
    "size_bytes": $artifact_size,
    "checksum_file": "another-dimension-0.1.0-runtime-candidate.apk.sha256",
    "provenance_file": "another-dimension-0.1.0-runtime-candidate.apk.provenance.json"
  }
}
JSON

candidate_output="$(node "$VALIDATOR" "$tmp_dir/ANDROID_PUBLIC_ARTIFACT_MANIFEST.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_android_public_artifact_manifests=1" ||
  fail "valid Android artifact manifest was not accepted"
printf '%s\n' "$candidate_output" | grep -Fq "android_public_artifact_ready=false" ||
  fail "Android validator must not claim public artifact readiness"

cat <<'STATUS'
status=android-public-app-candidate-source-ready
android_public_app_candidate_path_ready=true
android_artifact_manifest_schema_available=true
android_artifact_manifest_validator_available=true
android_public_artifact_checksum_verifier_ready=true
android_shell_uses_shared_core_json_bridge_candidate=true
android_forbidden_dependency_scan_ready=true
android_backup_exclusion_configured=true
android_release_package_smoke_ready=false
android_real_device_smoke_passed=false
android_release_signing_ready=false
android_apk_aab_artifact_ready=false
android_public_artifact_ready=false
android_public_artifact_upload_allowed=false
android_public_claim_allowed=false
mobile_readiness_claimed=false
sensitive_communication_allowed=false
STATUS
