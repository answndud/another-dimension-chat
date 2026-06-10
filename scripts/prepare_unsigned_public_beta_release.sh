#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP_VERSION="0.1.0"
BUILD_CHANNEL="beta-onion"
BUILD_COMMIT="806ecad1"
PLATFORM="macos-aarch64"
EXPECTED_DMG_SHA="625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95"

SOURCE_DIR="$ROOT_DIR/apps/desktop-tauri/beta-artifacts"
SOURCE_DMG="$SOURCE_DIR/Another Dimension Chat_0.1.0_aarch64.dmg"
SOURCE_PROVENANCE="$SOURCE_DIR/Another Dimension Chat_0.1.0_aarch64.dmg.provenance.json"

RELEASE_DIR="${1:-$ROOT_DIR/apps/desktop-tauri/public-release/unsigned-public-beta}"
RELEASE_DMG="another-dimension-chat-${APP_VERSION}-${BUILD_CHANNEL}-${PLATFORM}-unsigned.dmg"
RELEASE_PROVENANCE="${RELEASE_DMG}.provenance.json"
REQUIRED_RELEASE_FILES=(
  "$RELEASE_DMG"
  "$RELEASE_DMG.sha256"
  "$RELEASE_PROVENANCE"
  "INSTALL_UNSIGNED_MACOS.md"
  "RELEASE_NOTES.md"
  "GITHUB_RELEASE_BODY.md"
  "UPDATE_INTEGRITY.md"
  "SUPPLY_CHAIN_BASELINE.md"
  "DEPENDENCY_INVENTORY.md"
  "PUBLIC_THREAT_MODEL.md"
  "INDEPENDENT_REVIEW_PACKET.md"
  "DEPENDENCY_LOCKFILES.sha256"
  "MANIFEST.md"
)

case "$RELEASE_DIR" in
  ""|"/"|"$ROOT_DIR"|"$ROOT_DIR/"|"."|"..")
    echo "FAIL unsafe release directory: $RELEASE_DIR" >&2
    exit 1
    ;;
esac

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local expected="$2"
  if ! grep -Fq "$expected" "$file"; then
    echo "FAIL missing expected text in $file: $expected" >&2
    exit 1
  fi
}

require_file "$SOURCE_DMG"
require_file "$SOURCE_PROVENANCE"
require_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
require_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
require_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
require_file "$ROOT_DIR/reference/UPDATE_INTEGRITY.md"
require_file "$ROOT_DIR/reference/SUPPLY_CHAIN_BASELINE.md"
require_file "$ROOT_DIR/reference/DEPENDENCY_INVENTORY.md"
require_file "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
require_file "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
require_file "$ROOT_DIR/Cargo.lock"
require_file "$ROOT_DIR/apps/desktop-tauri/src-tauri/Cargo.lock"
require_file "$ROOT_DIR/apps/desktop-tauri/package-lock.json"

actual_sha="$(shasum -a 256 "$SOURCE_DMG" | awk '{print $1}')"
if [ "$actual_sha" != "$EXPECTED_DMG_SHA" ]; then
  echo "FAIL DMG SHA-256 mismatch" >&2
  echo "expected: $EXPECTED_DMG_SHA" >&2
  echo "actual:   $actual_sha" >&2
  exit 1
fi

source_provenance_sha="$(shasum -a 256 "$SOURCE_PROVENANCE" | awk '{print $1}')"
artifact_size_bytes="$(wc -c < "$SOURCE_DMG" | tr -d '[:space:]')"

require_text "$SOURCE_PROVENANCE" "\"artifact_sha256\": \"$EXPECTED_DMG_SHA\""
require_text "$SOURCE_PROVENANCE" "\"app_version\": \"$APP_VERSION\""
require_text "$SOURCE_PROVENANCE" "\"build_channel\": \"$BUILD_CHANNEL\""
require_text "$SOURCE_PROVENANCE" "\"build_commit\": \"$BUILD_COMMIT\""
require_text "$SOURCE_PROVENANCE" "\"platform\": \"$PLATFORM\""
require_text "$SOURCE_PROVENANCE" "\"startup_network_sockets\": \"none\""

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

cp "$SOURCE_DMG" "$RELEASE_DIR/$RELEASE_DMG"
cp "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md"
cp "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$RELEASE_DIR/RELEASE_NOTES.md"
cp "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "$RELEASE_DIR/GITHUB_RELEASE_BODY.md"
cp "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "$RELEASE_DIR/UPDATE_INTEGRITY.md"
cp "$ROOT_DIR/reference/SUPPLY_CHAIN_BASELINE.md" "$RELEASE_DIR/SUPPLY_CHAIN_BASELINE.md"
cp "$ROOT_DIR/reference/DEPENDENCY_INVENTORY.md" "$RELEASE_DIR/DEPENDENCY_INVENTORY.md"
cp "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "$RELEASE_DIR/PUBLIC_THREAT_MODEL.md"
cp "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "$RELEASE_DIR/INDEPENDENT_REVIEW_PACKET.md"

(
  cd "$RELEASE_DIR"
  shasum -a 256 "$RELEASE_DMG" > "$RELEASE_DMG.sha256"
)

(
  cd "$ROOT_DIR"
  shasum -a 256 \
    Cargo.lock \
    apps/desktop-tauri/src-tauri/Cargo.lock \
    apps/desktop-tauri/package-lock.json > "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256"
)

cat > "$RELEASE_DIR/$RELEASE_PROVENANCE" <<EOF
{
  "artifact": "$RELEASE_DMG",
  "artifact_sha256": "$EXPECTED_DMG_SHA",
  "artifact_size_bytes": $artifact_size_bytes,
  "app_version": "$APP_VERSION",
  "build_channel": "$BUILD_CHANNEL",
  "build_commit": "$BUILD_COMMIT",
  "platform": "$PLATFORM",
  "distribution": "unsigned-github-public-beta",
  "notarized": false,
  "signed": false,
  "auto_update": false,
  "startup_network_sockets": "none",
  "source_provenance_sha256": "$source_provenance_sha",
  "dependency_lockfiles_sha256_file": "DEPENDENCY_LOCKFILES.sha256",
  "dependency_inventory_file": "DEPENDENCY_INVENTORY.md",
  "manual_update_integrity_file": "UPDATE_INTEGRITY.md",
  "supply_chain_baseline_file": "SUPPLY_CHAIN_BASELINE.md",
  "public_non_claims": [
    "unsigned experimental public beta",
    "not notarized",
    "not audited",
    "not production-ready",
    "sensitive communication prohibited",
    "no auto-update",
    "no dependency audit claim",
    "no reproducible-build claim"
  ]
}
EOF

cat > "$RELEASE_DIR/MANIFEST.md" <<EOF
# Another Dimension Chat unsigned public beta manifest

This folder is for a GitHub Release upload.

## Files

- \`$RELEASE_DMG\`
- \`$RELEASE_DMG.sha256\`
- \`$RELEASE_PROVENANCE\`
- \`INSTALL_UNSIGNED_MACOS.md\`
- \`RELEASE_NOTES.md\`
- \`GITHUB_RELEASE_BODY.md\`
- \`UPDATE_INTEGRITY.md\`
- \`SUPPLY_CHAIN_BASELINE.md\`
- \`DEPENDENCY_INVENTORY.md\`
- \`PUBLIC_THREAT_MODEL.md\`
- \`INDEPENDENT_REVIEW_PACKET.md\`
- \`DEPENDENCY_LOCKFILES.sha256\`

## Build

- App version: \`$APP_VERSION\`
- Build channel: \`$BUILD_CHANNEL\`
- Build commit: \`$BUILD_COMMIT\`
- Platform: \`$PLATFORM\`
- DMG SHA-256: \`$EXPECTED_DMG_SHA\`
- Public provenance: \`$RELEASE_PROVENANCE\`
- Source provenance SHA-256: \`$source_provenance_sha\`
- Dependency inventory: \`DEPENDENCY_INVENTORY.md\`
- Dependency lockfile hashes: \`DEPENDENCY_LOCKFILES.sha256\`
- Auto-update: disabled
- Signing/notarization: disabled

## Boundary

This is an unsigned experimental public beta. It is not notarized, not audited,
not production-ready, and sensitive communication prohibited.

External two-machine onion delivery has not been independently verified for
this beta. Same-machine dual-profile rehearsal is development evidence only.

Manual update integrity is limited to user-verified SHA-256 files and the
provenance/dependency-inventory/lockfile-hash evidence in this upload set.
There is no auto-update, signing, notarization, reproducible-build, SBOM, or
security-audit claim.
EOF

for release_file in "${REQUIRED_RELEASE_FILES[@]}"; do
  require_file "$RELEASE_DIR/$release_file"
done

require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"artifact\": \"$RELEASE_DMG\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"artifact_sha256\": \"$EXPECTED_DMG_SHA\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"source_provenance_sha256\": \"$source_provenance_sha\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"dependency_inventory_file\": \"DEPENDENCY_INVENTORY.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"auto_update\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"signed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"notarized\": false"
require_text "$RELEASE_DIR/MANIFEST.md" "Auto-update: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Signing/notarization: disabled"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "unsigned experimental public beta"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "not audited"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "not production-ready"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "sensitive communication prohibited"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "GITHUB_RELEASE_BODY.md"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "External two-machine onion delivery has not yet been independently verified"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "does not provide auto-update"
require_text "$RELEASE_DIR/SUPPLY_CHAIN_BASELINE.md" "not a supply-chain audit"
require_text "$RELEASE_DIR/DEPENDENCY_INVENTORY.md" "not an SBOM"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "Cargo.lock"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "apps/desktop-tauri/src-tauri/Cargo.lock"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "apps/desktop-tauri/package-lock.json"

echo "release_dir=$RELEASE_DIR"
echo "release_dmg=$RELEASE_DMG"
echo "dmg_sha256=$EXPECTED_DMG_SHA"
echo "source_provenance_sha256=$source_provenance_sha"
echo "status=unsigned-public-beta-release-ready"
