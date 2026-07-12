#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
README="$ROOT_DIR/README.md"
INSTALL_GUIDE="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
UPDATE_INTEGRITY="$ROOT_DIR/reference/UPDATE_INTEGRITY.md"
FRESH_REHEARSAL="$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL.md"
FRESH_RESULT="$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing macOS install/Gatekeeper input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing macOS install/Gatekeeper text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden macOS install/Gatekeeper text in $file: $text" >&2
    exit 1
  fi
}

for file in "$README" "$INSTALL_GUIDE" "$UPDATE_INTEGRITY" "$FRESH_REHEARSAL" "$FRESH_RESULT"; do
  require_file "$file"
done

for file in "$README" "$INSTALL_GUIDE"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "same GitHub Release"
  require_text "$file" "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
  require_text "$file" "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256"
  require_text "$file" "shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256"
  require_text "$file" "7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a"
done

require_text "$README" "System Settings > Privacy &"
require_text "$README" "Security only after the checksum matches"
require_text "$INSTALL_GUIDE" "Privacy & Security"

require_text "$INSTALL_GUIDE" "Install Unsigned macOS Public Beta"
require_text "$INSTALL_GUIDE" "macOS Apple Silicon"
require_text "$INSTALL_GUIDE" "Verify The Download"
require_text "$INSTALL_GUIDE" "Open On macOS"
require_text "$INSTALL_GUIDE" "Troubleshooting"
require_text "$INSTALL_GUIDE" "Checksum mismatch"
require_text "$INSTALL_GUIDE" "Stop and do not open the DMG"
require_text "$INSTALL_GUIDE" "download both files again from the same GitHub Release"
require_text "$INSTALL_GUIDE" "DMG looks damaged"
require_text "$INSTALL_GUIDE" "App cannot be opened"
require_text "$INSTALL_GUIDE" "Privacy & Security allow button is missing"
require_text "$INSTALL_GUIDE" "try to open the blocked app once"
require_text "$INSTALL_GUIDE" "Do not use terminal quarantine-removal commands as an install step"
require_text "$INSTALL_GUIDE" "Do not use terminal quarantine-removal commands"
require_text "$INSTALL_GUIDE" "to force-open the app"
require_text "$INSTALL_GUIDE" "branch files copied from GitHub's source"
require_text "$INSTALL_GUIDE" "GitHub source archives"
require_text "$INSTALL_GUIDE" "source archive"
require_text "$INSTALL_GUIDE" "another release"
require_text "$INSTALL_GUIDE" "redacted diagnostics"

require_text "$README" "reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"

require_text "$UPDATE_INTEGRITY" "same GitHub Release"
require_text "$UPDATE_INTEGRITY" "Branch files"
require_text "$UPDATE_INTEGRITY" "source archives"
require_text "$UPDATE_INTEGRITY" "branch-file or source-archive release proof"
require_text "$FRESH_REHEARSAL" "Do not use terminal quarantine-removal commands as an install step"
require_text "$FRESH_REHEARSAL" "gatekeeper_manual_allow_result"
require_text "$FRESH_REHEARSAL" "app_launch_network=false"
require_text "$FRESH_REHEARSAL" "next_owner_action=run-clean-macos-fresh-install-with-disposable-profile"
require_text "$FRESH_RESULT" "gatekeeper_manual_allow_result: hold"
require_text "$FRESH_RESULT" "app_launch_network: false"
require_text "$FRESH_RESULT" "clean_machine_result_accepted=false"
require_text "$FRESH_RESULT" "next_owner_action=run-clean-macos-fresh-install-with-disposable-profile"

for file in "$README" "$INSTALL_GUIDE" "$UPDATE_INTEGRITY" "$FRESH_REHEARSAL" "$FRESH_RESULT"; do
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "sensitive communication is safe"
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "production-ready public beta"
  reject_text "$file" "audited public beta"
  reject_text "$file" "xattr -d"
done

printf 'status=macos-install-gatekeeper-guide-ready\n'
printf 'checksum_failure_recovery=stop-redownload-same-release\n'
printf 'damaged_dmg_recovery=rerun-checksum-remount-manual-allow\n'
printf 'gatekeeper_recovery=privacy-security-after-checksum\n'
printf 'allow_button_missing_recovery=open-once-then-return-to-privacy-security\n'
printf 'terminal_quarantine_removal_install_step=false\n'
printf 'release_authority=same-release-assets-not-branch-source-archive\n'
printf 'clean_machine_result_accepted=false\n'
printf 'gatekeeper_manual_allow_result=hold\n'
printf 'app_launch_network=false\n'
printf 'next_owner_action=run-clean-macos-fresh-install-with-disposable-profile\n'
