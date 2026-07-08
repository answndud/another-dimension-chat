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

DOC="reference/IOS_PUBLIC_APP_CANDIDATE.md"
VALIDATOR="scripts/validate_ios_public_artifact_manifest.mjs"

for file in "$DOC" "$VALIDATOR" \
  "apps/mobile/ios/AnotherDimension/Info.plist" \
  "apps/mobile/ios/AnotherDimension/AnotherDimension.entitlements" \
  "apps/mobile/ios/AnotherDimension/JsonBridgeSharedCoreAdapter.swift" \
  "scripts/verify_mobile_forbidden_dependency_scan_once.sh"; do
  [ -f "$file" ] || fail "missing iOS public app candidate input: $file"
done

for flag in \
  "ios_public_app_candidate_path_ready=true" \
  "ios_artifact_manifest_schema_available=true" \
  "ios_artifact_manifest_validator_available=true" \
  "ios_public_artifact_checksum_verifier_ready=true" \
  "ios_shell_uses_shared_core_json_bridge_candidate=true" \
  "ios_forbidden_dependency_scan_ready=true" \
  "ios_minimal_entitlements_review_ready=true" \
  "ios_release_package_smoke_ready=false" \
  "ios_real_device_smoke_passed=false" \
  "ios_provisioning_ready=false" \
  "ios_ipa_artifact_ready=false" \
  "ios_testflight_distribution_ready=false" \
  "ios_app_store_distribution_ready=false" \
  "ios_public_artifact_ready=false" \
  "ios_public_artifact_upload_allowed=false" \
  "ios_generated_artifact_commit_allowed=false" \
  "ios_public_claim_allowed=false" \
  "mobile_readiness_claimed=false" \
  "production_ready_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$VALIDATOR" "ios-public-artifact-manifest-v1"
must_contain "apps/mobile/ios/AnotherDimension/AnotherDimension.entitlements" "<array/>"
must_contain "apps/mobile/ios/AnotherDimension/JsonBridgeSharedCoreAdapter.swift" "RuntimeScopeUnlockedJsonBridgeMobileApi"

node --check "$VALIDATOR" >/dev/null
scripts/verify_mobile_forbidden_dependency_scan_once.sh >/dev/null

empty_output="$(node "$VALIDATOR" "$ROOT/apps/mobile/ios/public-release")"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-ios-public-artifact-manifest" ||
  fail "empty iOS artifact manifest validator did not wait"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
artifact="$tmp_dir/AnotherDimension-0.1.0-runtime-candidate.ipa"
printf 'ios artifact fixture\n' >"$artifact"
artifact_sha="$(shasum -a 256 "$artifact" | awk '{print $1}')"
artifact_size="$(wc -c <"$artifact" | tr -d ' ')"
printf '%s  %s\n' "$artifact_sha" "$(basename "$artifact")" >"$tmp_dir/AnotherDimension-0.1.0-runtime-candidate.ipa.sha256"
cat >"$tmp_dir/AnotherDimension-0.1.0-runtime-candidate.ipa.provenance.json" <<JSON
{
  "schema_version": "ios-public-artifact-provenance-v1",
  "source_commit": "abcdef1234567890",
  "artifact_sha256": "$artifact_sha",
  "ios_public_artifact_ready": false
}
JSON
cat >"$tmp_dir/IOS_PUBLIC_ARTIFACT_MANIFEST.json" <<JSON
{
  "schema_version": "ios-public-artifact-manifest-v1",
  "platform": "ios",
  "source_commit": "abcdef1234567890",
  "version": "0.1.0",
  "artifact_kind": "ipa",
  "distribution_path": "testflight-hold",
  "signing_status": "development-signed-hold",
  "same_release_asset_authority_required": true,
  "real_device_smoke_passed": true,
  "minimal_entitlements_reviewed": true,
  "privacy_labels_reviewed": true,
  "forbidden_dependency_scan_passed": true,
  "ios_public_artifact_ready": false,
  "ios_public_artifact_upload_allowed": false,
  "ios_generated_artifact_commit_allowed": false,
  "public_non_claims": [
    "sensitive communication prohibited",
    "not audited",
    "not production-ready",
    "no iOS public artifact"
  ],
  "artifact": {
    "filename": "AnotherDimension-0.1.0-runtime-candidate.ipa",
    "sha256": "$artifact_sha",
    "size_bytes": $artifact_size,
    "checksum_file": "AnotherDimension-0.1.0-runtime-candidate.ipa.sha256",
    "provenance_file": "AnotherDimension-0.1.0-runtime-candidate.ipa.provenance.json"
  }
}
JSON

candidate_output="$(node "$VALIDATOR" "$tmp_dir/IOS_PUBLIC_ARTIFACT_MANIFEST.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_ios_public_artifact_manifests=1" ||
  fail "valid iOS artifact manifest was not accepted"
printf '%s\n' "$candidate_output" | grep -Fq "ios_public_artifact_ready=false" ||
  fail "iOS validator must not claim public artifact readiness"

cat <<'STATUS'
status=ios-public-app-candidate-source-ready
ios_public_app_candidate_path_ready=true
ios_artifact_manifest_schema_available=true
ios_artifact_manifest_validator_available=true
ios_public_artifact_checksum_verifier_ready=true
ios_shell_uses_shared_core_json_bridge_candidate=true
ios_forbidden_dependency_scan_ready=true
ios_minimal_entitlements_review_ready=true
ios_release_package_smoke_ready=false
ios_real_device_smoke_passed=false
ios_provisioning_ready=false
ios_ipa_artifact_ready=false
ios_testflight_distribution_ready=false
ios_app_store_distribution_ready=false
ios_public_artifact_ready=false
ios_public_artifact_upload_allowed=false
ios_public_claim_allowed=false
mobile_readiness_claimed=false
sensitive_communication_allowed=false
STATUS
