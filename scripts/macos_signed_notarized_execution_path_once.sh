#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

json_escape() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
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
    fail "$file contains forbidden signed/notarized execution pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
RC_DOC="reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md"
CREDENTIAL_GATE="reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
DIST_GATE="reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
GAP_REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
REVIEW_PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
TAURI_CONFIG="apps/desktop-tauri/src-tauri/tauri.conf.json"
ENTITLEMENTS="${AD_MACOS_ENTITLEMENTS:-$ROOT/apps/desktop-tauri/src-tauri/Entitlements.plist}"
SIGNED_BUILD_SCRIPT="scripts/build_signed_notarized_macos_release.sh"
DMG_CONTAINED_APP_VERIFIER="scripts/verify_macos_dmg_contained_app.sh"

for file in "$DOC" "$RC_DOC" "$CREDENTIAL_GATE" "$DIST_GATE" "$MATRIX" \
  "$GAP_REGISTER" "$REVIEW_PACKET" "$TAURI_CONFIG" "$ENTITLEMENTS" \
  "$SIGNED_BUILD_SCRIPT" "$DMG_CONTAINED_APP_VERIFIER" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing D100-3 signed/notarized execution input: $file"
done

for file in "$RC_DOC" "$DIST_GATE" "$MATRIX" "$GAP_REGISTER" "$REVIEW_PACKET" \
  "SECURITY.md"; do
  must_contain "$file" "MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
done
if ! grep -Fq "MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" "README.md"; then
  must_contain "SECURITY.md" "MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md"
fi

for flag in \
  "d100_3_signed_notarized_execution_path_reviewed=true" \
  "macos_signed_notarized_execution_path_available=true" \
  "macos_tauri_signing_config_ready=true" \
  "macos_hardened_runtime_configured=true" \
  "macos_entitlements_configured=true" \
  "macos_entitlements_minimal=true" \
  "macos_signed_notarized_release_build_script_ready=true" \
  "release_build_operator_runbook_ready=true" \
  "release_build_expected_output_path_declared=true" \
  "release_build_generated_file_set_declared=true" \
  "release_build_failure_classes_declared=true" \
  "release_distribution_metadata_generator_path_ready=true" \
  "credential_material_redacted_from_output=true" \
  "signed_app_build_path_ready=true" \
  "dmg_create_from_signed_app_path_ready=true" \
  "credential_probe_path_ready=true" \
  "signing_command_path_ready=true" \
  "notary_submit_wait_path_ready=true" \
  "stapler_staple_validate_path_ready=true" \
  "gatekeeper_assessment_path_ready=true" \
  "macos_dmg_contained_app_verifier_available=true" \
  "signed_rc_provenance_identity_fields_ready=true" \
  "signed_rc_provenance_artifact_identity_ready=true" \
  "signed_rc_provenance_signing_identity_hash_ready=true" \
  "dmg_mounted_app_found=false" \
  "dmg_contained_app_codesign_verify_passed=false" \
  "dmg_contained_app_gatekeeper_assess_passed=false" \
  "dmg_contained_app_matches_signed_source_app=false" \
  "checksum_provenance_update_path_ready=true" \
  "explicit_execution_env_required=true" \
  "ad_execute_macos_sign_notary_required=true" \
  "developer_id_signing_available=false" \
  "notarization_credential_available=false" \
  "signed_notarized_rc_execution_ready=false" \
  "actual_signing_executed=false" \
  "notary_submit_executed=false" \
  "stapler_staple_executed=false" \
  "gatekeeper_assess_executed=false" \
  "rc_artifact_sha256_recorded=false" \
  "generated_provenance_written=false" \
  "macos_signed_notarized_artifact_ready=false" \
  "release_upload_authorized=false" \
  "dmg_rebuild_authorized=false" \
  "generated_release_artifacts_staged=false" \
  "stable_release_allowed=false" \
  "production_distribution_ready=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$TAURI_CONFIG" '"macOS"'
must_contain "$TAURI_CONFIG" '"minimumSystemVersion": "12.0"'
must_contain "$TAURI_CONFIG" '"hardenedRuntime": true'
must_contain "$TAURI_CONFIG" '"entitlements": "Entitlements.plist"'
must_contain "$TAURI_CONFIG" '"signingIdentity": null'
must_contain "$TAURI_CONFIG" '"providerShortName": null'
must_contain "$ENTITLEMENTS" "<dict/>"
must_contain "$SIGNED_BUILD_SCRIPT" "AD_BUILD_MACOS_SIGNED_RC"
must_contain "$SIGNED_BUILD_SCRIPT" "app_version"
must_contain "$SIGNED_BUILD_SCRIPT" "app_bundle_id"
must_contain "$SIGNED_BUILD_SCRIPT" "artifact_size_bytes"
must_contain "$SIGNED_BUILD_SCRIPT" "signing_identity_sha256"
must_contain "$SIGNED_BUILD_SCRIPT" "release_build_operator_runbook_ready=true"
must_contain "$SIGNED_BUILD_SCRIPT" "prepare_macos_release_distribution_metadata.sh"
must_contain "$SIGNED_BUILD_SCRIPT" "AD_PREPARE_MACOS_RELEASE_DISTRIBUTION_METADATA=1"
must_contain "$SIGNED_BUILD_SCRIPT" 'AD_MACOS_SIGNED_RC_PROVENANCE_IN="$PROVENANCE_OUT"'
must_contain "$SIGNED_BUILD_SCRIPT" "macos_release_distribution_metadata_prepared=true"
must_contain "$SIGNED_BUILD_SCRIPT" "macos_signed_notarized_artifact_ready=true"
must_contain "$SIGNED_BUILD_SCRIPT" "macos_signed_notarized_artifact_ready=false"
must_contain "$SIGNED_BUILD_SCRIPT" "signed_macos_release_artifact_name_template=another-dimension-chat-<app-version>-<build-channel>-<public-architecture>-signed-notarized.dmg"
must_contain "$SIGNED_BUILD_SCRIPT" "signed_macos_release_generated_files=dmg,sha256,signed-provenance-json,distribution-manifest-packet"
must_contain "$SIGNED_BUILD_SCRIPT" "notary_credential_modes_supported=keychain-profile,app-store-connect-api-key,apple-id-app-specific-password"
must_contain "$SIGNED_BUILD_SCRIPT" "release_build_failure_classes=missing-explicit-env,missing-developer-id,missing-notary-credential,missing-tooling,contained-app-mismatch,gatekeeper-failure"
must_contain "$SIGNED_BUILD_SCRIPT" "hdiutil create"
must_contain "$SIGNED_BUILD_SCRIPT" "verify_macos_dmg_contained_app.sh"
must_contain "$SIGNED_BUILD_SCRIPT" "xcrun notarytool submit"
must_contain "$DOC" "codesign --force --deep --options runtime --timestamp --entitlements"
must_contain "$DOC" "xcrun notarytool submit"
must_contain "$DOC" "xcrun stapler staple"
must_contain "$DOC" "xcrun stapler validate"
must_contain "$DOC" "spctl --assess --type open --verbose=4"
must_contain "$DOC" "spctl --assess --type execute --verbose=4"
must_contain "$DOC" "dmg_contained_app_matches_signed_source_app=false"
must_contain "$DOC" "AD_SIGNED_RC_PROVENANCE_OUT"
must_contain "$DMG_CONTAINED_APP_VERIFIER" "dmg_contained_app_codesign_verify_passed=true"
must_contain "$DMG_CONTAINED_APP_VERIFIER" "dmg_contained_app_gatekeeper_assess_passed=true"
must_contain "$CREDENTIAL_GATE" "developer_id_signing_available=false"
must_contain "$CREDENTIAL_GATE" "notarization_credential_available=false"
must_contain "$DIST_GATE" "stable_signed_notarized_artifact_available=false"
must_contain "$DIST_GATE" "production_distribution_ready=false"

for file in "$DOC" "$RC_DOC" "$DIST_GATE" "$MATRIX" "$GAP_REGISTER" \
  "README.md" "SECURITY.md"; do
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "stable_release_allowed=true"
  must_not_match "$file" "production_distribution_ready=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

if git -C "$ROOT" ls-files | grep -Eq '^(apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "generated release artifact path is tracked"
fi

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

CODESIGN_AVAILABLE=false
SPCTL_AVAILABLE=false
NOTARYTOOL_AVAILABLE=false
STAPLER_AVAILABLE=false
command -v codesign >/dev/null 2>&1 && CODESIGN_AVAILABLE=true
command -v spctl >/dev/null 2>&1 && SPCTL_AVAILABLE=true
xcrun --find notarytool >/dev/null 2>&1 && NOTARYTOOL_AVAILABLE=true
xcrun --find stapler >/dev/null 2>&1 && STAPLER_AVAILABLE=true

IDENTITY="${AD_RELEASE_SIGNING_IDENTITY:-}"
APP_BUNDLE="${AD_RC_APP_BUNDLE:-}"
RC_DMG="${AD_RC_DMG:-${AD_SIGNED_RC_DMG:-}}"
EXECUTE="${AD_EXECUTE_MACOS_SIGN_NOTARY:-0}"
PROVENANCE_OUT="${AD_SIGNED_RC_PROVENANCE_OUT:-}"
TARGET_ARCH="${AD_MACOS_TARGET_ARCH:-${AD_RC_TARGET_ARCH:-aarch64-apple-darwin}}"
BUILD_CHANNEL="${AD_MACOS_BUILD_CHANNEL:-${AD_RC_BUILD_CHANNEL:-operator-provided}}"

case "$TARGET_ARCH" in
  aarch64-apple-darwin)
    PUBLIC_ARCHITECTURE="macos-aarch64"
    ;;
  x86_64-apple-darwin)
    PUBLIC_ARCHITECTURE="macos-x64"
    ;;
  *) fail "AD_MACOS_TARGET_ARCH or AD_RC_TARGET_ARCH must be aarch64-apple-darwin or x86_64-apple-darwin" ;;
esac

NOTARY_PROFILE="${AD_RELEASE_NOTARYTOOL_PROFILE:-${NOTARYTOOL_PROFILE:-}}"
NOTARY_API_KEY_CONFIGURED=false
if [ -n "${AD_RELEASE_NOTARY_KEY:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_KEY_ID:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_ISSUER:-}" ]; then
  NOTARY_API_KEY_CONFIGURED=true
fi
NOTARY_APP_PASSWORD_CONFIGURED=false
if [ -n "${AD_RELEASE_NOTARY_APPLE_ID:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_PASSWORD:-}" ] &&
  [ -n "${AD_RELEASE_APPLE_TEAM_ID:-}" ]; then
  NOTARY_APP_PASSWORD_CONFIGURED=true
fi
NOTARY_CREDENTIAL_AVAILABLE=false
if [ -n "$NOTARY_PROFILE" ] || [ "$NOTARY_API_KEY_CONFIGURED" = "true" ] ||
  [ "$NOTARY_APP_PASSWORD_CONFIGURED" = "true" ]; then
  NOTARY_CREDENTIAL_AVAILABLE=true
fi

DEVELOPER_ID_AVAILABLE=false
if [ -n "$IDENTITY" ] &&
  security find-identity -v -p codesigning 2>/dev/null | grep -Fq "$IDENTITY"; then
  DEVELOPER_ID_AVAILABLE=true
fi

if [ "$EXECUTE" != "1" ]; then
  cat <<STATUS
status=macos-signed-notarized-execution-path-held
d100_3_signed_notarized_execution_path_reviewed=true
macos_signed_notarized_execution_path_available=true
macos_tauri_signing_config_ready=true
macos_hardened_runtime_configured=true
macos_entitlements_configured=true
macos_entitlements_minimal=true
macos_signed_notarized_release_build_script_ready=true
release_build_operator_runbook_ready=true
release_build_expected_output_path_declared=true
release_build_generated_file_set_declared=true
release_build_failure_classes_declared=true
release_distribution_metadata_generator_path_ready=true
credential_material_redacted_from_output=true
signed_app_build_path_ready=true
dmg_create_from_signed_app_path_ready=true
credential_probe_path_ready=true
signing_command_path_ready=true
notary_submit_wait_path_ready=true
stapler_staple_validate_path_ready=true
gatekeeper_assessment_path_ready=true
macos_dmg_contained_app_verifier_available=true
signed_rc_provenance_identity_fields_ready=true
signed_rc_provenance_artifact_identity_ready=true
signed_rc_provenance_signing_identity_hash_ready=true
dmg_mounted_app_found=false
dmg_contained_app_codesign_verify_passed=false
dmg_contained_app_gatekeeper_assess_passed=false
dmg_contained_app_matches_signed_source_app=false
checksum_provenance_update_path_ready=true
explicit_execution_env_required=true
developer_id_signing_available=false
notarization_credential_available=false
signed_notarized_rc_execution_ready=false
actual_signing_executed=false
notary_submit_executed=false
stapler_staple_executed=false
gatekeeper_assess_executed=false
rc_artifact_sha256_recorded=false
generated_provenance_written=false
macos_signed_notarized_artifact_ready=false
release_upload_authorized=false
dmg_rebuild_authorized=false
generated_release_artifacts_staged=false
next_required_phase=D100-4-external-evidence-intake-execution
STATUS
  exit 0
fi

[ "$CODESIGN_AVAILABLE" = "true" ] || fail "codesign unavailable"
[ "$SPCTL_AVAILABLE" = "true" ] || fail "spctl unavailable"
[ "$NOTARYTOOL_AVAILABLE" = "true" ] || fail "notarytool unavailable"
[ "$STAPLER_AVAILABLE" = "true" ] || fail "stapler unavailable"
[ "$DEVELOPER_ID_AVAILABLE" = "true" ] || fail "AD_RELEASE_SIGNING_IDENTITY is not an installed codesigning identity"
[ "$NOTARY_CREDENTIAL_AVAILABLE" = "true" ] || fail "notarization credential env/profile is missing"
[ -d "$APP_BUNDLE" ] || fail "AD_RC_APP_BUNDLE must point to an app bundle directory"
[ -f "$RC_DMG" ] || fail "AD_RC_DMG or AD_SIGNED_RC_DMG must point to a DMG file"

case "$APP_BUNDLE" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  "$ROOT"/*) fail "AD_RC_APP_BUNDLE must be in an ignored generated artifact directory: $APP_BUNDLE" ;;
esac

case "$RC_DMG" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  "$ROOT"/*) fail "AD_RC_DMG must be in an ignored generated artifact directory: $RC_DMG" ;;
esac

codesign --force --deep --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$IDENTITY" "$APP_BUNDLE"
codesign --force --timestamp --sign "$IDENTITY" "$RC_DMG"

if [ -n "$NOTARY_PROFILE" ]; then
  xcrun notarytool submit "$RC_DMG" --keychain-profile "$NOTARY_PROFILE" --wait --no-progress
elif [ "$NOTARY_API_KEY_CONFIGURED" = "true" ]; then
  xcrun notarytool submit "$RC_DMG" --key "${AD_RELEASE_NOTARY_KEY}" \
    --key-id "${AD_RELEASE_NOTARY_KEY_ID}" --issuer "${AD_RELEASE_NOTARY_ISSUER}" \
    --wait --no-progress
else
  xcrun notarytool submit "$RC_DMG" --apple-id "${AD_RELEASE_NOTARY_APPLE_ID}" \
    --password "${AD_RELEASE_NOTARY_PASSWORD}" --team-id "${AD_RELEASE_APPLE_TEAM_ID}" \
    --wait --no-progress
fi

xcrun stapler staple "$RC_DMG"
xcrun stapler validate "$RC_DMG"
spctl --assess --type open --verbose=4 "$RC_DMG"
contained_app_output="$(AD_VERIFY_DMG="$RC_DMG" AD_VERIFY_EXPECTED_APP_BUNDLE="$APP_BUNDLE" "$DMG_CONTAINED_APP_VERIFIER")"
printf '%s\n' "$contained_app_output" | grep -Fq "dmg_mounted_app_found=true" ||
  fail "DMG contained app was not found"
printf '%s\n' "$contained_app_output" | grep -Fq "dmg_contained_app_codesign_verify_passed=true" ||
  fail "DMG contained app codesign verification failed"
printf '%s\n' "$contained_app_output" | grep -Fq "dmg_contained_app_gatekeeper_assess_passed=true" ||
  fail "DMG contained app Gatekeeper assessment failed"
printf '%s\n' "$contained_app_output" | grep -Fq "dmg_contained_app_matches_signed_source_app=true" ||
  fail "DMG contained app does not match the signed source app bundle"
rc_sha="$(shasum -a 256 "$RC_DMG" | awk '{print $1}')"
rc_size_bytes="$(wc -c <"$RC_DMG" | tr -d ' ')"
app_version="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.version)')"
app_bundle_id="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.identifier)')"
signing_identity_sha256="$(printf '%s' "$IDENTITY" | shasum -a 256 | awk '{print $1}')"
source_commit="$(git rev-parse HEAD)"
artifact_basename="$(basename "$RC_DMG")"

generated_provenance_written=false
if [ -n "$PROVENANCE_OUT" ]; then
  case "$PROVENANCE_OUT" in
    "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
    *) fail "AD_SIGNED_RC_PROVENANCE_OUT must be under ignored generated artifact directories" ;;
  esac
  mkdir -p "$(dirname "$PROVENANCE_OUT")"
  cat >"$PROVENANCE_OUT" <<JSON
{
  "schema_version": "macos-signed-notarized-rc-provenance-v1",
  "artifact": $(json_escape "$artifact_basename"),
  "sha256": "$rc_sha",
  "artifact_size_bytes": $rc_size_bytes,
  "source_commit": "$source_commit",
  "app_version": $(json_escape "$app_version"),
  "app_bundle_id": $(json_escape "$app_bundle_id"),
  "release_class": "signed-notarized-rc",
  "target_arch": "$TARGET_ARCH",
  "public_architecture": "$PUBLIC_ARCHITECTURE",
  "build_channel": $(json_escape "$BUILD_CHANNEL"),
  "signing_identity_sha256": "$signing_identity_sha256",
  "signing_status": "signed",
  "notarization_status": "notarized",
  "signed": true,
  "notarized": true,
  "stapled": true,
  "stapled_status": "stapled",
  "gatekeeper_assessed": true,
  "gatekeeper_open_assessed": true,
  "gatekeeper_execute_assessed": true,
  "macos_dmg_contained_app_verifier_available": true,
  "dmg_mounted_app_found": true,
  "dmg_contained_app_codesign_verify_passed": true,
  "dmg_contained_app_gatekeeper_assess_passed": true,
  "dmg_contained_app_matches_signed_source_app": true,
  "release_upload_authorized": false,
  "dmg_rebuild_authorized": false
}
JSON
  generated_provenance_written=true
fi

cat <<STATUS
status=macos-signed-notarized-execution-path-verified
d100_3_signed_notarized_execution_path_reviewed=true
macos_signed_notarized_execution_path_available=true
macos_tauri_signing_config_ready=true
macos_hardened_runtime_configured=true
macos_entitlements_configured=true
macos_entitlements_minimal=true
macos_signed_notarized_release_build_script_ready=true
release_build_operator_runbook_ready=true
release_build_expected_output_path_declared=true
release_build_generated_file_set_declared=true
release_build_failure_classes_declared=true
release_distribution_metadata_generator_path_ready=true
credential_material_redacted_from_output=true
signed_app_build_path_ready=true
dmg_create_from_signed_app_path_ready=true
signed_rc_provenance_identity_fields_ready=true
signed_rc_provenance_artifact_identity_ready=true
signed_rc_provenance_signing_identity_hash_ready=true
developer_id_signing_available=true
notarization_credential_available=true
signed_notarized_rc_execution_ready=true
actual_signing_executed=true
notary_submit_executed=true
stapler_staple_executed=true
gatekeeper_assess_executed=true
dmg_mounted_app_found=true
dmg_contained_app_codesign_verify_passed=true
dmg_contained_app_gatekeeper_assess_passed=true
dmg_contained_app_matches_signed_source_app=true
rc_artifact_sha256=$rc_sha
generated_provenance_written=$generated_provenance_written
macos_signed_notarized_artifact_ready=false
release_upload_authorized=false
dmg_rebuild_authorized=false
generated_release_artifacts_staged=false
STATUS
