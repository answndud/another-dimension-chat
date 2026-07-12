#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

AUTHORIZED="${AD_RELEASE_UPLOAD_AUTHORIZED:-0}"
TAG="${AD_GITHUB_RELEASE_TAG:-v0.1.0-beta-onion-unsigned}"
ASSET_DIR="${AD_MACOS_RELEASE_ASSET_DIR:-$ROOT/apps/desktop-tauri/public-release/unsigned-public-beta}"
MANIFEST="${AD_MACOS_RELEASE_DISTRIBUTION_MANIFEST:-$ASSET_DIR/MANIFEST.md}"
REPO="${AD_GITHUB_REPO:-answndud/another-dimension-chat}"
RELEASE_BODY="$ASSET_DIR/GITHUB_RELEASE_BODY.md"

if [ "$AUTHORIZED" != "1" ] && [ "$DRY_RUN" != "1" ]; then
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

if [ "$DRY_RUN" != "1" ]; then
  command -v gh >/dev/null 2>&1 || fail "gh CLI is required for approved upload"
fi
[ -n "$TAG" ] || fail "AD_GITHUB_RELEASE_TAG is required"
[ -d "$ASSET_DIR" ] || fail "AD_MACOS_RELEASE_ASSET_DIR must point to a generated asset directory"
[ -f "$MANIFEST" ] || fail "AD_MACOS_RELEASE_DISTRIBUTION_MANIFEST is required"
[ -f "$RELEASE_BODY" ] || fail "GITHUB_RELEASE_BODY.md is required"

case "$ASSET_DIR" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_MACOS_RELEASE_ASSET_DIR must be under an ignored generated artifact directory" ;;
esac
case "$MANIFEST" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_MACOS_RELEASE_DISTRIBUTION_MANIFEST must be under an ignored generated artifact directory" ;;
esac

allowlist_file="$(mktemp)"
actual_file="$(mktemp)"
cleanup() {
  rm -f "$allowlist_file" "$actual_file"
}
trap cleanup EXIT

awk '
  /^## Upload Allowlist$/ { in_list = 1; next }
  /^## / && in_list { exit }
  in_list && /^- `/ {
    gsub(/^- `/, "")
    gsub(/`$/, "")
    print
  }
' "$MANIFEST" | sort > "$allowlist_file"
if [ ! -s "$allowlist_file" ]; then
  fail "MANIFEST.md upload allowlist is empty"
fi

find "$ASSET_DIR" -maxdepth 1 -type f -exec basename {} \; | sort > "$actual_file"
if ! cmp -s "$allowlist_file" "$actual_file"; then
  printf 'expected allowlist:\n' >&2
  cat "$allowlist_file" >&2
  printf 'actual files:\n' >&2
  cat "$actual_file" >&2
  fail "asset directory files must exactly match MANIFEST.md upload allowlist"
fi

assets=()
while IFS= read -r asset_name; do
  assets+=("$ASSET_DIR/$asset_name")
done < "$allowlist_file"

for asset in "${assets[@]}"; do
  case "$asset" in
    "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
    *) fail "release asset outside ignored generated artifact directories" ;;
  esac
  git -C "$ROOT" check-ignore -q "$asset" || fail "release asset path is not ignored: $asset"
done

(
  cd "$ASSET_DIR"
  shasum -a 256 -c "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256" >/dev/null
)

if [ "$DRY_RUN" = "1" ]; then
  if [ "$AUTHORIZED" = "1" ]; then
    UPLOAD_AUTHORIZED_BOOL=true
  else
    UPLOAD_AUTHORIZED_BOOL=false
  fi
  cat <<STATUS
status=macos-release-upload-dry-run
macos_release_upload_script_ready=true
release_upload_authorized=$UPLOAD_AUTHORIZED_BOOL
release_upload_performed=false
release_body_edit_performed=false
release_asset_delete_performed=false
release_tag=$TAG
repo=$REPO
asset_count=${#assets[@]}
release_body=$RELEASE_BODY
STATUS
  exit 0
fi

UPLOAD_AUTHORIZED_BOOL=true
gh release upload "$TAG" "${assets[@]}" --repo "$REPO" --clobber
gh release edit "$TAG" --repo "$REPO" --notes-file "$RELEASE_BODY"

cat <<STATUS
status=macos-release-upload-performed
macos_release_upload_script_ready=true
release_upload_authorized=$UPLOAD_AUTHORIZED_BOOL
release_upload_performed=true
release_body_edit_performed=true
release_asset_delete_performed=false
STATUS
