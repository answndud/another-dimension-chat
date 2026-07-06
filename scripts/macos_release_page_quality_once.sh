#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_BODY="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
RELEASE_NOTES="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
INSTALL_GUIDE="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
PREPARE_SCRIPT="$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh"
TAG="v0.1.0-beta-onion-unsigned"
REPO="answndud/another-dimension-chat"
DMG="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
DMG_SHA="7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing macOS release page quality input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing macOS release page quality text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden macOS release page quality text in $file: $text" >&2
    exit 1
  fi
}

for file in "$RELEASE_BODY" "$RELEASE_NOTES" "$INSTALL_GUIDE" "$PREPARE_SCRIPT"; do
  require_file "$file"
done

for file in "$RELEASE_BODY" "$RELEASE_NOTES" "$INSTALL_GUIDE"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "$DMG"
  require_text "$file" "$DMG_SHA"
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "sensitive communication is safe"
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "production-ready public beta"
  reject_text "$file" "audited public beta"
  reject_text "$file" "external onion delivery succeeded"
  reject_text "$file" "external onion delivery works"
done

for heading in \
  "## Download" \
  "## Verify Before Opening" \
  "## Install" \
  "## What Works" \
  "## What Does Not Work" \
  "## Safety Warnings" \
  "## Report Issue" \
  "## Non-Claims"; do
  require_text "$RELEASE_BODY" "$heading"
done

require_text "$RELEASE_BODY" "macOS Apple Silicon unsigned DMG download"
require_text "$RELEASE_BODY" "Manual encrypted envelope export/import"
require_text "$RELEASE_BODY" "There is no signed or notarized macOS app"
require_text "$RELEASE_BODY" "There is no public Windows, Android, or iOS artifact"
require_text "$RELEASE_BODY" "external onion delivery success claim"
require_text "$RELEASE_BODY" "Public issues and release comments must use only redacted diagnostics"
require_text "$RELEASE_BODY" "Use the files attached to this GitHub Release as the release authority"

for heading in \
  "## User Path" \
  "## What This Beta Is For" \
  "## What This Beta Does Not Claim" \
  "## Known User Limits" \
  "## Install"; do
  require_text "$RELEASE_NOTES" "$heading"
done

require_text "$RELEASE_NOTES" "Gatekeeper can block this unsigned/not notarized app"
require_text "$RELEASE_NOTES" "macOS Apple Silicon is the only public app artifact"
require_text "$RELEASE_NOTES" "Manual encrypted envelope exchange is the practical default path"
require_text "$RELEASE_NOTES" "external onion delivery success is not claimed"
require_text "$RELEASE_NOTES" "Report only redacted diagnostics"

require_text "$PREPARE_SCRIPT" "## Upload Allowlist"
require_text "$PREPARE_SCRIPT" "## Forbidden Uploads"
require_text "$PREPARE_SCRIPT" "Upload exactly the files listed in this"
require_text "$PREPARE_SCRIPT" "Do not upload"
require_text "$PREPARE_SCRIPT" "beta-artifacts"
require_text "$PREPARE_SCRIPT" "public-release"
require_text "$PREPARE_SCRIPT" "branch files, source archives, raw logs, crash dumps"
require_text "$PREPARE_SCRIPT" "any file not listed in"
require_text "$PREPARE_SCRIPT" "require_text \"\$RELEASE_DIR/MANIFEST.md\" \"Upload Allowlist\""
require_text "$PREPARE_SCRIPT" "require_text \"\$RELEASE_DIR/MANIFEST.md\" \"Forbidden Uploads\""

if [ "${1:-}" = "--live" ]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "FAIL gh CLI is required for live release metadata check" >&2
    exit 1
  fi
  live_body="$(mktemp)"
  live_assets="$(mktemp)"
  gh release view "$TAG" --repo "$REPO" --json body --jq '.body' > "$live_body"
  gh release view "$TAG" --repo "$REPO" --json assets --jq '.assets[].name' > "$live_assets"
  require_text "$live_assets" "$DMG"
  require_text "$live_assets" "$DMG.sha256"
  require_text "$live_body" "unsigned experimental public beta"
  require_text "$live_body" "not audited"
  require_text "$live_body" "not production-ready"
  require_text "$live_body" "sensitive communication prohibited"
  reject_text "$live_body" "sensitive communication allowed"
  reject_text "$live_body" "sensitive communication is safe"
  reject_text "$live_body" "safe for sensitive communication"
  reject_text "$live_body" "production-ready public beta"
  reject_text "$live_body" "audited public beta"
  reject_text "$live_body" "external onion delivery succeeded"
  reject_text "$live_body" "external onion delivery works"
  source_sha="$(shasum -a 256 "$RELEASE_BODY" | awk '{print $1}')"
  live_sha="$(shasum -a 256 "$live_body" | awk '{print $1}')"
  if [ "$source_sha" = "$live_sha" ]; then
    printf 'published_release_body_drift=false\n'
  else
    printf 'published_release_body_drift=true\n'
  fi
  rm -f "$live_body" "$live_assets"
fi

printf 'status=macos-release-page-quality-source-ready\n'
printf 'release_body_sections=download#verify#install#what-works#what-does-not-work#safety-warnings#report-issue#non-claims\n'
printf 'release_notes_user_path=true\n'
printf 'manifest_upload_allowlist=true\n'
printf 'manifest_forbidden_uploads=true\n'
printf 'release_upload_performed=false\n'
printf 'release_asset_change_performed=false\n'
