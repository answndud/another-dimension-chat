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
DMG_CONTAINED_APP_VERIFIER="$ROOT/scripts/verify_macos_dmg_contained_app.sh"

[ -f "$CONFIG" ] || fail "missing Tauri config: $CONFIG"
[ -f "$ENTITLEMENTS" ] || fail "missing macOS entitlements: $ENTITLEMENTS"
[ -f "$DMG_CONTAINED_APP_VERIFIER" ] || fail "missing DMG contained app verifier: $DMG_CONTAINED_APP_VERIFIER"

case "$TARGET_ARCH" in
  aarch64-apple-darwin|x86_64-apple-darwin) ;;
  *) fail "AD_MACOS_TARGET_ARCH must be aarch64-apple-darwin or x86_64-apple-darwin" ;;
esac

case "$OUT_DIR" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_SIGNED_MACOS_RELEASE_OUT_DIR must be under an ignored generated artifact directory" ;;
esac

if [ -n "$PROVENANCE_OUT" ]; then
  case "$PROVENANCE_OUT" in
    "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
    *) fail "AD_SIGNED_RC_PROVENANCE_OUT must be under an ignored generated artifact directory" ;;
  esac
fi

if [ "$EXECUTE" != "1" ] || [ "$BUILD_EXECUTE" != "1" ] ||
  [ "$DMG_REBUILD_AUTHORIZED" != "1" ]; then
  cat <<'STATUS'
status=macos-signed-notarized-release-build-held
macos_signed_notarized_release_build_script_ready=true
signed_app_build_path_ready=true
signed_app_codesign_path_ready=true
dmg_create_from_signed_app_path_ready=true
dmg_codesign_path_ready=true
notary_submit_wait_path_ready=true
stapler_staple_validate_path_ready=true
gatekeeper_assessment_path_ready=true
macos_dmg_contained_app_verifier_available=true
dmg_mounted_app_found=false
dmg_contained_app_codesign_verify_passed=false
dmg_contained_app_gatekeeper_assess_passed=false
dmg_contained_app_matches_signed_source_app=false
explicit_execution_env_required=true
ad_execute_macos_sign_notary_required=true
ad_build_macos_signed_rc_required=true
ad_dmg_rebuild_authorized_required=true
actual_release_build_executed=false
actual_signing_executed=false
notary_submit_executed=false
stapler_staple_executed=false
gatekeeper_assess_executed=false
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
DMG_NAME="another-dimension-chat-${APP_VERSION}-${BUILD_CHANNEL}-${TARGET_ARCH}-signed-notarized.dmg"
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

if [ -z "$PROVENANCE_OUT" ]; then
  PROVENANCE_OUT="$DMG_PATH.provenance.json"
fi
mkdir -p "$(dirname "$PROVENANCE_OUT")"
cat >"$PROVENANCE_OUT" <<JSON
{
  "schema_version": "macos-signed-notarized-rc-provenance-v1",
  "artifact": $(json_escape "$(basename "$DMG_PATH")"),
  "sha256": "$sha256",
  "source_commit": "$(git rev-parse HEAD)",
  "target_arch": "$TARGET_ARCH",
  "build_channel": "$BUILD_CHANNEL",
  "signed": true,
  "notarized": true,
  "stapled": true,
  "gatekeeper_assessed": true,
  "dmg_mounted_app_found": true,
  "dmg_contained_app_codesign_verify_passed": true,
  "dmg_contained_app_gatekeeper_assess_passed": true,
  "dmg_contained_app_matches_signed_source_app": true,
  "release_upload_authorized": false,
  "dmg_rebuild_authorized": $DMG_REBUILD_AUTHORIZED_BOOL
}
JSON

cat <<STATUS
status=macos-signed-notarized-release-build-verified
macos_signed_notarized_release_build_script_ready=true
signed_app_build_path_ready=true
signed_app_codesign_path_ready=true
dmg_create_from_signed_app_path_ready=true
dmg_codesign_path_ready=true
notary_submit_executed=true
stapler_staple_executed=true
gatekeeper_assess_executed=true
dmg_mounted_app_found=true
dmg_contained_app_codesign_verify_passed=true
dmg_contained_app_gatekeeper_assess_passed=true
dmg_contained_app_matches_signed_source_app=true
signed_notarized_rc_dmg=$DMG_PATH
rc_artifact_sha256=$sha256
provenance_out=$PROVENANCE_OUT
release_upload_authorized=false
dmg_rebuild_authorized=$DMG_REBUILD_AUTHORIZED_BOOL
STATUS
