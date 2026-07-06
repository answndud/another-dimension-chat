#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
README="$ROOT_DIR/README.md"
SECURITY="$ROOT_DIR/SECURITY.md"
RELEASE_BODY="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
INSTALL_GUIDE="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
RELEASE_NOTES="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing macOS public beta landing input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing macOS public beta landing text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden macOS public beta landing text in $file: $text" >&2
    exit 1
  fi
}

for file in "$README" "$SECURITY" "$RELEASE_BODY" "$INSTALL_GUIDE" "$RELEASE_NOTES"; do
  require_file "$file"
done

require_text "$README" "macOS Public Beta Quick Start"
require_text "$README" "unsigned experimental public beta"
require_text "$README" "macOS Apple Silicon"
require_text "$README" "aarch64"
require_text "$README" "not audited"
require_text "$README" "not production-ready"
require_text "$README" "sensitive communication prohibited"
require_text "$README" "Do not use it for real communication"
require_text "$README" "Download the DMG"
require_text "$README" "Download the matching"
require_text "$README" "Verify the download before opening"
require_text "$README" "shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256"
require_text "$README" "Expected SHA-256"
require_text "$README" "7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a"
require_text "$README" "Privacy & Security"
require_text "$README" "First run"
require_text "$README" "manual encrypted envelope export/import"
require_text "$README" "redacted diagnostics"
require_text "$README" "Feedback"
require_text "$README" "Release authority"
require_text "$README" "branch may contain later documentation or source changes"
require_text "$README" "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
require_text "$README" "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256"

for file in "$README" "$SECURITY" "$RELEASE_BODY" "$INSTALL_GUIDE" "$RELEASE_NOTES"; do
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

require_text "$RELEASE_BODY" "This is an unsigned experimental public beta"
require_text "$RELEASE_BODY" "## Download"
require_text "$RELEASE_BODY" "## Verify Before Opening"
require_text "$RELEASE_BODY" "## Non-Claims"
require_text "$RELEASE_BODY" "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
require_text "$RELEASE_BODY" "same GitHub Release"
require_text "$RELEASE_BODY" "Do not upload"

require_text "$INSTALL_GUIDE" "Install Unsigned macOS Public Beta"
require_text "$INSTALL_GUIDE" "Verify The Download"
require_text "$INSTALL_GUIDE" "Open On macOS"
require_text "$INSTALL_GUIDE" "Do not use terminal quarantine-removal commands as an install step"
require_text "$INSTALL_GUIDE" "Do not use this app for sensitive communication"

require_text "$RELEASE_NOTES" "Platform: macOS aarch64"
require_text "$RELEASE_NOTES" "What This Beta Is For"
require_text "$RELEASE_NOTES" "What This Beta Does Not Claim"
require_text "$RELEASE_NOTES" "Do not use this beta for sensitive communication"

for file in "$README" "$SECURITY" "$RELEASE_BODY" "$INSTALL_GUIDE" "$RELEASE_NOTES"; do
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "sensitive communication is safe"
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "Windows public artifact ready"
  reject_text "$file" "Windows production-ready"
done

printf 'status=macos-public-beta-landing-ready\n'
printf 'macos_artifact=apple-silicon-aarch64-unsigned-dmg\n'
printf 'release_link_present=true\n'
printf 'checksum_verification_present=true\n'
printf 'gatekeeper_manual_allow_present=true\n'
printf 'first_run_path_present=true\n'
printf 'feedback_redaction_boundary_present=true\n'
printf 'production_ready_claim=false\n'
printf 'sensitive_communication_allowed=false\n'
