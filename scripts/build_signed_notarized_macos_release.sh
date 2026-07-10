#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

json_escape() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set +x

CONFIG="apps/desktop-tauri/src-tauri/tauri.conf.json"
ENTITLEMENTS="${AD_MACOS_ENTITLEMENTS:-$ROOT/apps/desktop-tauri/src-tauri/Entitlements.plist}"
EXECUTE="${AD_EXECUTE_MACOS_SIGN_NOTARY:-0}"
BUILD_EXECUTE="${AD_BUILD_MACOS_SIGNED_RC:-0}"
DMG_REBUILD_AUTHORIZED="${AD_DMG_REBUILD_AUTHORIZED:-0}"
IDENTITY="${AD_RELEASE_SIGNING_IDENTITY:-}"
TARGET_ARCH="${AD_MACOS_TARGET_ARCH:-aarch64-apple-darwin}"
BUILD_CHANNEL="${AD_MACOS_BUILD_CHANNEL:-beta-onion}"
OUT_DIR="${AD_SIGNED_MACOS_RELEASE_OUT_DIR:-$ROOT/apps/desktop-tauri/public-release/signed-notarized-rc}"
PROVENANCE_OUT="${AD_SIGNED_RC_PROVENANCE_OUT:-}"
DISTRIBUTION_METADATA_OUT_DIR="${AD_SIGNED_MACOS_DISTRIBUTION_METADATA_OUT_DIR:-$OUT_DIR/distribution-metadata}"
DMG_CONTAINED_APP_VERIFIER="$ROOT/scripts/verify_macos_dmg_contained_app.sh"
METADATA_GENERATOR="$ROOT/scripts/prepare_macos_release_distribution_metadata.sh"

[ -f "$CONFIG" ] || fail "missing Tauri config: $CONFIG"
[ -f "$ENTITLEMENTS" ] || fail "missing macOS entitlements: $ENTITLEMENTS"
[ -f "$DMG_CONTAINED_APP_VERIFIER" ] || fail "missing DMG contained app verifier: $DMG_CONTAINED_APP_VERIFIER"
[ -f "$METADATA_GENERATOR" ] || fail "missing macOS distribution metadata generator: $METADATA_GENERATOR"

case "$TARGET_ARCH" in
  aarch64-apple-darwin)
    PUBLIC_ARCHITECTURE="macos-aarch64"
    METADATA_ARCHITECTURE="macos-aarch64"
    ;;
  x86_64-apple-darwin)
    PUBLIC_ARCHITECTURE="macos-x64"
    METADATA_ARCHITECTURE="macos-x86_64"
    ;;
  *) fail "AD_MACOS_TARGET_ARCH must be aarch64-apple-darwin or x86_64-apple-darwin" ;;
esac

case "$OUT_DIR" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_SIGNED_MACOS_RELEASE_OUT_DIR must be under an ignored generated artifact directory" ;;
esac
case "$DISTRIBUTION_METADATA_OUT_DIR" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_SIGNED_MACOS_DISTRIBUTION_METADATA_OUT_DIR must be under an ignored generated artifact directory" ;;
esac

if [ -n "$PROVENANCE_OUT" ]; then
  case "$PROVENANCE_OUT" in
    "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
    *) fail "AD_SIGNED_RC_PROVENANCE_OUT must be under an ignored generated artifact directory" ;;
  esac
fi

if [ "$EXECUTE" != "1" ] || [ "$BUILD_EXECUTE" != "1" ] ||
  [ "$DMG_REBUILD_AUTHORIZED" != "1" ]; then
  cat <<STATUS
status=macos-signed-notarized-release-build-held
macos_signed_notarized_release_build_script_ready=true
release_build_operator_runbook_ready=true
release_build_expected_output_path_declared=true
release_build_generated_file_set_declared=true
release_build_failure_classes_declared=true
release_distribution_metadata_generator_path_ready=true
credential_material_redacted_from_output=true
signed_app_build_path_ready=true
signed_app_codesign_path_ready=true
dmg_create_from_signed_app_path_ready=true
dmg_codesign_path_ready=true
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
explicit_execution_env_required=true
ad_execute_macos_sign_notary_required=true
ad_build_macos_signed_rc_required=true
ad_dmg_rebuild_authorized_required=true
signed_macos_release_default_out_dir=$OUT_DIR
signed_macos_distribution_metadata_default_out_dir=$DISTRIBUTION_METADATA_OUT_DIR
signed_macos_release_artifact_name_template=another-dimension-chat-<app-version>-<build-channel>-<public-architecture>-signed-notarized.dmg
signed_macos_release_generated_files=dmg,sha256,signed-provenance-json,distribution-manifest-packet
notary_credential_modes_supported=keychain-profile,app-store-connect-api-key,apple-id-app-specific-password
release_build_failure_classes=missing-explicit-env,missing-developer-id,missing-notary-credential,missing-tooling,contained-app-mismatch,gatekeeper-failure
actual_release_build_executed=false
actual_signing_executed=false
notary_submit_executed=false
stapler_staple_executed=false
gatekeeper_assess_executed=false
macos_signed_notarized_artifact_ready=false
release_upload_authorized=false
dmg_rebuild_authorized=false
STATUS
  exit 0
fi

command -v npm >/dev/null 2>&1 || fail "npm unavailable"
command -v hdiutil >/dev/null 2>&1 || fail "hdiutil unavailable"
command -v codesign >/dev/null 2>&1 || fail "codesign unavailable"
command -v spctl >/dev/null 2>&1 || fail "spctl unavailable"
command -v shasum >/dev/null 2>&1 || fail "shasum unavailable"
xcrun --find notarytool >/dev/null 2>&1 || fail "notarytool unavailable"
xcrun --find stapler >/dev/null 2>&1 || fail "stapler unavailable"

[ -n "$IDENTITY" ] || fail "AD_RELEASE_SIGNING_IDENTITY is required"
security find-identity -v -p codesigning 2>/dev/null | grep -Fq "$IDENTITY" ||
  fail "AD_RELEASE_SIGNING_IDENTITY is not an installed codesigning identity"

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
[ -n "$NOTARY_PROFILE" ] || [ "$NOTARY_API_KEY_CONFIGURED" = "true" ] ||
  [ "$NOTARY_APP_PASSWORD_CONFIGURED" = "true" ] ||
  fail "notarization credential env/profile is missing"

DMG_REBUILD_AUTHORIZED_BOOL=true

APP_VERSION="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.version)')"
APP_BUNDLE_ID="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.identifier)')"
DMG_NAME="another-dimension-chat-${APP_VERSION}-${BUILD_CHANNEL}-${PUBLIC_ARCHITECTURE}-signed-notarized.dmg"
BUILD_TARGET_DIR="${CARGO_TARGET_DIR:-${AD_BUILD_CACHE_DIR:-$ROOT/.build-cache}/cargo-target}"
APP_BUNDLE="$BUILD_TARGET_DIR/$TARGET_ARCH/release/bundle/macos/Another Dimension Chat.app"
DMG_PATH="$OUT_DIR/$DMG_NAME"

mkdir -p "$OUT_DIR"
STAGE_DIR="$(mktemp -d "$OUT_DIR/.stage.XXXXXX")"
trap 'rm -rf "$STAGE_DIR"' EXIT

(
  cd "$ROOT/apps/desktop-tauri"
  npm run build
  CARGO_TARGET_DIR="$BUILD_TARGET_DIR" VITE_AD_BUILD_CHANNEL="$BUILD_CHANNEL" \
    node scripts/with-cargo-target.mjs tauri build \
      --features manual-onion-client-attempt \
      --target "$TARGET_ARCH" \
      --bundles app
)

[ -d "$APP_BUNDLE" ] || fail "Tauri app bundle was not produced"

codesign --force --deep --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$IDENTITY" "$APP_BUNDLE"
codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE" >/dev/null

cp -R "$APP_BUNDLE" "$STAGE_DIR/"
ln -s /Applications "$STAGE_DIR/Applications"
rm -f "$DMG_PATH"
hdiutil create -volname "Another Dimension Chat" -srcfolder "$STAGE_DIR" -fs HFS+ -format UDZO "$DMG_PATH" >/dev/null
codesign --force --timestamp --sign "$IDENTITY" "$DMG_PATH"
codesign --verify --deep --strict --verbose=2 "$DMG_PATH" >/dev/null

if [ -n "$NOTARY_PROFILE" ]; then
  xcrun notarytool submit "$DMG_PATH" --keychain-profile "$NOTARY_PROFILE" --wait --no-progress
elif [ "$NOTARY_API_KEY_CONFIGURED" = "true" ]; then
  xcrun notarytool submit "$DMG_PATH" --key "${AD_RELEASE_NOTARY_KEY}" \
    --key-id "${AD_RELEASE_NOTARY_KEY_ID}" --issuer "${AD_RELEASE_NOTARY_ISSUER}" \
    --wait --no-progress
else
  xcrun notarytool submit "$DMG_PATH" --apple-id "${AD_RELEASE_NOTARY_APPLE_ID}" \
    --password "${AD_RELEASE_NOTARY_PASSWORD}" --team-id "${AD_RELEASE_APPLE_TEAM_ID}" \
    --wait --no-progress
fi

xcrun stapler staple "$DMG_PATH"
xcrun stapler validate "$DMG_PATH"
spctl --assess --type open --verbose=4 "$DMG_PATH"
contained_app_output="$(AD_VERIFY_DMG="$DMG_PATH" AD_VERIFY_EXPECTED_APP_BUNDLE="$APP_BUNDLE" "$DMG_CONTAINED_APP_VERIFIER")"
printf '%s\n' "$contained_app_output" | grep -Fq "dmg_mounted_app_found=true" ||
  fail "DMG contained app was not found"
printf '%s\n' "$contained_app_output" | grep -Fq "dmg_contained_app_codesign_verify_passed=true" ||
  fail "DMG contained app codesign verification failed"
printf '%s\n' "$contained_app_output" | grep -Fq "dmg_contained_app_gatekeeper_assess_passed=true" ||
  fail "DMG contained app Gatekeeper assessment failed"
printf '%s\n' "$contained_app_output" | grep -Fq "dmg_contained_app_matches_signed_source_app=true" ||
  fail "DMG contained app does not match the signed source app bundle"

sha256="$(shasum -a 256 "$DMG_PATH" | awk '{print $1}')"
printf '%s  %s\n' "$sha256" "$(basename "$DMG_PATH")" >"$DMG_PATH.sha256"
artifact_size_bytes="$(wc -c <"$DMG_PATH" | tr -d ' ')"
signing_identity_sha256="$(printf '%s' "$IDENTITY" | shasum -a 256 | awk '{print $1}')"

if [ -z "$PROVENANCE_OUT" ]; then
  PROVENANCE_OUT="$DMG_PATH.provenance.json"
fi
mkdir -p "$(dirname "$PROVENANCE_OUT")"
cat >"$PROVENANCE_OUT" <<JSON
{
  "schema_version": "macos-signed-notarized-rc-provenance-v1",
  "artifact": $(json_escape "$(basename "$DMG_PATH")"),
  "sha256": "$sha256",
  "artifact_size_bytes": $artifact_size_bytes,
  "source_commit": "$(git rev-parse HEAD)",
  "app_version": $(json_escape "$APP_VERSION"),
  "app_bundle_id": $(json_escape "$APP_BUNDLE_ID"),
  "release_class": "signed-notarized-rc",
  "target_arch": "$TARGET_ARCH",
  "public_architecture": "$PUBLIC_ARCHITECTURE",
  "build_channel": "$BUILD_CHANNEL",
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
  "dmg_rebuild_authorized": $DMG_REBUILD_AUTHORIZED_BOOL
}
JSON

metadata_output="$(
  AD_PREPARE_MACOS_RELEASE_DISTRIBUTION_METADATA=1 \
    AD_MACOS_RELEASE_ARTIFACT="$DMG_PATH" \
    AD_MACOS_RELEASE_CLASS="signed-notarized-rc" \
    AD_MACOS_ARTIFACT_ARCHITECTURE="$METADATA_ARCHITECTURE" \
    AD_MACOS_ARTIFACT_SIGNING_STATUS="signed" \
    AD_MACOS_ARTIFACT_NOTARIZATION_STATUS="notarized" \
    AD_MACOS_ARTIFACT_STAPLED="true" \
    AD_MACOS_SIGNED_RC_PROVENANCE_IN="$PROVENANCE_OUT" \
    AD_MACOS_RELEASE_METADATA_OUT_DIR="$DISTRIBUTION_METADATA_OUT_DIR" \
    "$METADATA_GENERATOR"
)"
printf '%s\n' "$metadata_output" | grep -Fq "status=macos-release-distribution-metadata-prepared" ||
  fail "macOS distribution metadata generator did not prepare metadata"
printf '%s\n' "$metadata_output" | grep -Fq "macos_release_distribution_dmg_contained_app_evidence_verified=true" ||
  fail "macOS distribution metadata did not verify contained-app evidence"
distribution_manifest="$(printf '%s\n' "$metadata_output" | sed -n 's/^manifest=//p')"
[ -n "$distribution_manifest" ] || fail "macOS distribution metadata manifest path missing"

cat <<STATUS
status=macos-signed-notarized-release-build-verified
macos_signed_notarized_release_build_script_ready=true
release_distribution_metadata_generator_path_ready=true
signed_app_build_path_ready=true
signed_app_codesign_path_ready=true
dmg_create_from_signed_app_path_ready=true
dmg_codesign_path_ready=true
notary_submit_executed=true
stapler_staple_executed=true
gatekeeper_assess_executed=true
dmg_mounted_app_found=true
signed_rc_provenance_identity_fields_ready=true
signed_rc_provenance_artifact_identity_ready=true
signed_rc_provenance_signing_identity_hash_ready=true
dmg_contained_app_codesign_verify_passed=true
dmg_contained_app_gatekeeper_assess_passed=true
dmg_contained_app_matches_signed_source_app=true
signed_notarized_rc_dmg=$DMG_PATH
rc_artifact_sha256=$sha256
provenance_out=$PROVENANCE_OUT
distribution_manifest=$distribution_manifest
macos_release_distribution_metadata_prepared=true
macos_signed_notarized_artifact_ready=true
release_upload_authorized=false
dmg_rebuild_authorized=$DMG_REBUILD_AUTHORIZED_BOOL
STATUS
