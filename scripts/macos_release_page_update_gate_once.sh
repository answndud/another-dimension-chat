#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POLICY="$ROOT_DIR/reference/RELEASE_PAGE_UPDATE_POLICY.json"
RELEASE_BODY="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
TAG="v0.1.0-beta-onion-unsigned"
REPO="answndud/another-dimension-chat"
DMG="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
DMG_SHA="7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing release page update gate input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing release page update gate text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden release page update gate text in $file: $text" >&2
    exit 1
  fi
}

require_file "$POLICY"
require_file "$RELEASE_BODY"

require_text "$POLICY" '"body_only_edit_requires_explicit_user_approval": true'
require_text "$POLICY" '"asset_upload_allowed": false'
require_text "$POLICY" '"asset_delete_allowed": false'
require_text "$POLICY" '"checksum_change_allowed": false'
require_text "$POLICY" '"dmg_rebuild_allowed": false'
require_text "$POLICY" "no live release update needed while source upload-set extras remain held"
require_text "$POLICY" "$DMG_SHA"

for file in "$POLICY" "$RELEASE_BODY"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
done

reject_text "$RELEASE_BODY" "sensitive communication allowed"
reject_text "$RELEASE_BODY" "sensitive communication is safe"
reject_text "$RELEASE_BODY" "safe for sensitive communication"
reject_text "$RELEASE_BODY" "production-ready public beta"
reject_text "$RELEASE_BODY" "audited public beta"
reject_text "$RELEASE_BODY" "external onion delivery succeeded"
reject_text "$RELEASE_BODY" "external onion delivery works"

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL gh CLI is required for the read-only live release gate" >&2
  exit 1
fi

live_body="$(mktemp)"
live_assets="$(mktemp)"
expected_assets="$(mktemp)"
live_body_assets="$(mktemp)"
missing_assets="$(mktemp)"
extra_assets="$(mktemp)"
live_body_missing_assets="$(mktemp)"
live_body_extra_assets="$(mktemp)"

cleanup() {
  rm -f "$live_body" "$live_assets" "$expected_assets" "$live_body_assets" "$missing_assets" "$extra_assets" "$live_body_missing_assets" "$live_body_extra_assets"
}
trap cleanup EXIT

gh release view "$TAG" --repo "$REPO" --json body --jq '.body' > "$live_body"
gh release view "$TAG" --repo "$REPO" --json assets --jq '.assets[].name' | sort > "$live_assets"

awk '
  /^## Download$/ { in_download = 1; next }
  /^## / && in_download { exit }
  in_download && /^- `/ {
    gsub(/^- `/, "")
    gsub(/`$/, "")
    print
  }
' "$RELEASE_BODY" | sort > "$expected_assets"

awk '
  /^## Download$/ { in_download = 1; next }
  /^## / && in_download { exit }
  in_download && /^- `/ {
    gsub(/^- `/, "")
    gsub(/`$/, "")
    print
  }
' "$live_body" | sort > "$live_body_assets"

require_text "$live_assets" "$DMG"
require_text "$live_assets" "$DMG.sha256"
require_text "$live_body" "unsigned experimental public beta"
require_text "$live_body" "sensitive communication prohibited"
require_text "$live_body" "not audited"
require_text "$live_body" "not production-ready"
reject_text "$live_body" "sensitive communication allowed"
reject_text "$live_body" "sensitive communication is safe"
reject_text "$live_body" "safe for sensitive communication"
reject_text "$live_body" "production-ready public beta"
reject_text "$live_body" "audited public beta"
reject_text "$live_body" "external onion delivery succeeded"
reject_text "$live_body" "external onion delivery works"

comm -23 "$expected_assets" "$live_assets" > "$missing_assets"
comm -13 "$expected_assets" "$live_assets" > "$extra_assets"
comm -23 "$live_body_assets" "$live_assets" > "$live_body_missing_assets"
comm -13 "$live_body_assets" "$live_assets" > "$live_body_extra_assets"

source_sha="$(shasum -a 256 "$RELEASE_BODY" | awk '{print $1}')"
live_sha="$(shasum -a 256 "$live_body" | awk '{print $1}')"

if [ "$source_sha" = "$live_sha" ]; then
  body_drift=false
else
  body_drift=true
fi

if [ -s "$live_body_missing_assets" ] || [ -s "$live_body_extra_assets" ]; then
  live_asset_body_drift=true
  asset_drift=true
  decision="hold-live-release-edit-until-live-body-and-assets-match"
elif [ -s "$missing_assets" ] || [ -s "$extra_assets" ]; then
  live_asset_body_drift=false
  asset_drift=true
  decision="no-live-release-update-needed-source-upload-set-held-without-explicit-upload"
else
  live_asset_body_drift=false
  asset_drift=false
  if [ "$body_drift" = true ]; then
    decision="candidate-body-only-edit-after-explicit-user-approval"
  else
    decision="no-live-body-update-needed"
  fi
fi

printf 'release_page_update_gate=ok\n'
printf 'published_release_body_drift=%s\n' "$body_drift"
printf 'published_release_asset_drift=%s\n' "$live_asset_body_drift"
printf 'source_expected_asset_drift=%s\n' "$asset_drift"
printf 'decision=%s\n' "$decision"

if [ -s "$live_body_missing_assets" ]; then
  printf 'missing_live_assets_from_live_body=\n'
  sed 's/^/- /' "$live_body_missing_assets"
fi

if [ -s "$live_body_extra_assets" ]; then
  printf 'extra_live_assets_not_in_live_body=\n'
  sed 's/^/- /' "$live_body_extra_assets"
fi

if [ -s "$missing_assets" ]; then
  printf 'missing_live_assets_from_source_upload_set=\n'
  sed 's/^/- /' "$missing_assets"
fi

if [ -s "$extra_assets" ]; then
  printf 'extra_live_assets_not_in_source_upload_set=\n'
  sed 's/^/- /' "$extra_assets"
fi

printf 'release_upload_performed=false\n'
printf 'release_asset_change_performed=false\n'
printf 'release_body_edit_performed=false\n'
