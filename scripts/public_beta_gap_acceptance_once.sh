#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing public beta acceptance input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq "$text" "$file"; then
    echo "FAIL missing required public beta text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_CLAIM_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/apps/desktop-tauri/src/i18n.js"
  "$ROOT_DIR/apps/desktop-tauri/README.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
  "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
  "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
)

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  require_file "$file"
done

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "$ROOT_DIR/apps/desktop-tauri/README.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

require_text "$ROOT_DIR/README.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/SECURITY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "No peer report is"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Release body"

echo "status=public-beta-external-delivery-nonclaim-accepted"
echo "external_delivery_claim=false"
echo "final_security_ready_acceptance=out_of_v0_1_scope"
echo "next=prepare or upload unsigned public beta artifacts without claiming external onion delivery"
