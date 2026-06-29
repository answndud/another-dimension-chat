#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DMG="${AD_VERIFY_DMG:-${1:-}}"
EXPECTED_APP="${AD_VERIFY_EXPECTED_APP_BUNDLE:-${2:-}}"
EXPECTED_APP_NAME="${AD_VERIFY_EXPECTED_APP_NAME:-}"

if [ -z "$DMG" ]; then
  cat <<'STATUS'
status=macos-dmg-contained-app-verification-held
macos_dmg_contained_app_verifier_available=true
dmg_mounted_app_found=false
dmg_contained_app_codesign_verify_passed=false
dmg_contained_app_gatekeeper_assess_passed=false
dmg_contained_app_matches_signed_source_app=false
STATUS
  exit 0
fi

[ -f "$DMG" ] || fail "DMG input does not point to a file: $DMG"

case "$DMG" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  "$ROOT"/*) fail "DMG input must be in an ignored generated artifact directory, not tracked source: $DMG" ;;
esac

if [ -n "$EXPECTED_APP" ]; then
  [ -d "$EXPECTED_APP" ] || fail "expected app bundle does not point to a directory: $EXPECTED_APP"
  case "$EXPECTED_APP" in
    "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*|"$ROOT"/target/*|"$ROOT"/apps/desktop-tauri/src-tauri/target/*) ;;
    "$ROOT"/*) fail "expected app bundle must be generated output, not tracked source: $EXPECTED_APP" ;;
  esac
  EXPECTED_APP_NAME="$(basename "$EXPECTED_APP")"
fi

if [ -z "$EXPECTED_APP_NAME" ]; then
  EXPECTED_APP_NAME="Another Dimension Chat.app"
fi

command -v hdiutil >/dev/null 2>&1 || fail "hdiutil unavailable"
command -v codesign >/dev/null 2>&1 || fail "codesign unavailable"
command -v spctl >/dev/null 2>&1 || fail "spctl unavailable"

MOUNT_POINT="$(mktemp -d "${TMPDIR:-/tmp}/ad-dmg-contained-app.XXXXXX")"
ATTACHED=false
cleanup() {
  if [ "$ATTACHED" = "true" ]; then
    hdiutil detach "$MOUNT_POINT" -quiet >/dev/null 2>&1 || true
  fi
  rmdir "$MOUNT_POINT" >/dev/null 2>&1 || true
}
trap cleanup EXIT

hdiutil attach -readonly -nobrowse -mountpoint "$MOUNT_POINT" "$DMG" >/dev/null
ATTACHED=true

MOUNTED_APP=""
matching_apps=0
while IFS= read -r candidate; do
  if [ "$(basename "$candidate")" = "$EXPECTED_APP_NAME" ]; then
    matching_apps=$((matching_apps + 1))
    MOUNTED_APP="$candidate"
  fi
done < <(find "$MOUNT_POINT" -maxdepth 2 -type d -name "*.app" -print | sort)

[ "$matching_apps" -gt 0 ] || fail "mounted DMG does not contain expected app bundle: $EXPECTED_APP_NAME"
[ "$matching_apps" -eq 1 ] || fail "mounted DMG contains multiple expected app bundles: $EXPECTED_APP_NAME"

codesign --verify --deep --strict --verbose=2 "$MOUNTED_APP" >/dev/null
spctl --assess --type execute --verbose=4 "$MOUNTED_APP" >/dev/null

matches_signed_source_app=false
if [ -n "$EXPECTED_APP" ]; then
  diff -qr "$EXPECTED_APP" "$MOUNTED_APP" >/dev/null
  matches_signed_source_app=true
fi

if [ "$matches_signed_source_app" = "true" ]; then
  contained_app_matches_signed_source_app="true"
else
  contained_app_matches_signed_source_app="false"
fi

cat <<STATUS
status=macos-dmg-contained-app-verified
macos_dmg_contained_app_verifier_available=true
dmg_mounted_app_found=true
dmg_contained_app_codesign_verify_passed=true
dmg_contained_app_gatekeeper_assess_passed=true
dmg_contained_app_matches_signed_source_app=$contained_app_matches_signed_source_app
dmg_contained_app_bundle=$MOUNTED_APP
STATUS
