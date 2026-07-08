#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

AUTHORIZED="${AD_RELEASE_UPLOAD_AUTHORIZED:-0}"
TAG="${AD_GITHUB_RELEASE_TAG:-}"
ASSET_DIR="${AD_MACOS_RELEASE_ASSET_DIR:-}"
MANIFEST="${AD_MACOS_RELEASE_DISTRIBUTION_MANIFEST:-}"
VALIDATOR="scripts/validate_macos_release_distribution_manifest.mjs"

[ -f "$VALIDATOR" ] || fail "missing macOS release manifest validator"

if [ "$AUTHORIZED" != "1" ]; then
  cat <<'STATUS'
status=macos-release-upload-held
macos_release_upload_script_ready=true
owner_release_upload_approval_required=true
release_upload_authorized=false
release_upload_performed=false
release_body_edit_performed=false
release_asset_delete_performed=false
STATUS
  exit 0
fi

command -v gh >/dev/null 2>&1 || fail "gh CLI is required for approved upload"
[ -n "$TAG" ] || fail "AD_GITHUB_RELEASE_TAG is required"
[ -d "$ASSET_DIR" ] || fail "AD_MACOS_RELEASE_ASSET_DIR must point to a generated asset directory"
[ -f "$MANIFEST" ] || fail "AD_MACOS_RELEASE_DISTRIBUTION_MANIFEST is required"

case "$ASSET_DIR" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_MACOS_RELEASE_ASSET_DIR must be under an ignored generated artifact directory" ;;
esac
case "$MANIFEST" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_MACOS_RELEASE_DISTRIBUTION_MANIFEST must be under an ignored generated artifact directory" ;;
esac

node "$VALIDATOR" "$MANIFEST" >/dev/null

mapfile -t assets < <(find "$ASSET_DIR" -maxdepth 1 -type f | sort)
[ "${#assets[@]}" -gt 0 ] || fail "no release assets found"

for asset in "${assets[@]}"; do
  case "$asset" in
    "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
    *) fail "release asset outside ignored generated artifact directories" ;;
  esac
done

UPLOAD_AUTHORIZED_BOOL=true
gh release upload "$TAG" "${assets[@]}" --repo answndud/another-dimension-chat

cat <<STATUS
status=macos-release-upload-performed
macos_release_upload_script_ready=true
release_upload_authorized=$UPLOAD_AUTHORIZED_BOOL
release_upload_performed=true
release_body_edit_performed=false
release_asset_delete_performed=false
STATUS
