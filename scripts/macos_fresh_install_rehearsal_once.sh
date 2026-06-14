#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKLIST="$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL.md"
RESULT="$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"
INSTALL_GUIDE="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
README="$ROOT_DIR/README.md"
RELEASE_DIR="$ROOT_DIR/apps/desktop-tauri/public-release/unsigned-public-beta"
DMG="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
SHA_FILE="$DMG.sha256"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing macOS fresh install rehearsal input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing macOS fresh install rehearsal text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden macOS fresh install rehearsal text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CHECKLIST"
require_file "$RESULT"
require_file "$INSTALL_GUIDE"
require_file "$README"

for file in "$CHECKLIST" "$RESULT" "$INSTALL_GUIDE" "$README"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "sensitive communication is safe"
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "production-ready public beta"
  reject_text "$file" "audited public beta"
  reject_text "$file" "external onion delivery succeeded"
  reject_text "$file" "external onion delivery works"
done

for text in \
  "Fresh Download" \
  "Checksum" \
  "Mount The DMG" \
  "Copy The App" \
  "First Launch And Gatekeeper" \
  "Privacy & Security" \
  "First-Run Warning" \
  "Profile Unlock Or Create" \
  "Invite Room And Verify" \
  "Safety Compare" \
  "Manual Encrypted Envelope Export/Import" \
  "Reply, Retry, And Cancel" \
  "Local Deletion" \
  "Redacted Diagnostics Copy" \
  "Expected result" \
  "Failure recovery" \
  "Do not record local paths" \
  "Do not use terminal quarantine-removal commands as an install step" \
  "no external onion delivery claim"; do
  require_text "$CHECKLIST" "$text"
done

require_text "$README" "reference/MACOS_FRESH_INSTALL_REHEARSAL.md"
require_text "$README" "reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"
require_text "$CHECKLIST" "reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"
require_text "$INSTALL_GUIDE" "Do not use terminal quarantine-removal commands as an install step"

require_text "$RESULT" "Status: hold for manual GUI follow-through; source install authority passed."
require_text "$RESULT" "checksum_result: OK"
require_text "$RESULT" "gatekeeper_manual_allow_result: hold"
require_text "$RESULT" "first_launch_result: hold"
require_text "$RESULT" "profile_unlock_result: hold"
require_text "$RESULT" "invite_join_result: hold"
require_text "$RESULT" "safety_compare_result: hold"
require_text "$RESULT" "envelope_exchange_result: hold"
require_text "$RESULT" "diagnostics_copy_result: hold"
require_text "$RESULT" "local_delete_result: hold"
require_text "$RESULT" "app_launch_network: false"
require_text "$RESULT" "macos-gui-human-rehearsal-not-run"
require_text "$RESULT" "clean_machine_execution=false"
require_text "$RESULT" "clean_machine_result_accepted=false"
require_text "$RESULT" "local_fixture_promoted_to_clean_install_pass=false"
require_text "$RESULT" "next_owner_action=run-clean-macos-fresh-install-with-disposable-profile"
require_text "$RESULT" "public beta non-claims confirmed: yes"
require_text "$RESULT" "Fresh Download: pass"
require_text "$RESULT" "Checksum: pass"
require_text "$RESULT" "Mount The DMG: pass"
require_text "$RESULT" "Copy The App: pass"
require_text "$RESULT" "First Launch And Gatekeeper: hold"
require_text "$RESULT" "manual Privacy & Security allow was not exercised"
require_text "$RESULT" "First-Run Warning: hold"
require_text "$RESULT" "Profile Unlock Or Create: hold"
require_text "$RESULT" "Invite Room And Verify: hold"
require_text "$RESULT" "Safety Compare: hold"
require_text "$RESULT" "Manual Encrypted Envelope Export/Import: hold"
require_text "$RESULT" "Reply, Retry, And Cancel: hold"
require_text "$RESULT" "Local Deletion: hold"
require_text "$RESULT" "Redacted Diagnostics Copy: hold"
require_text "$RESULT" "No release upload"
require_text "$RESULT" "DMG rebuild"
require_text "$RESULT" "production-ready"
require_text "$RESULT" "external onion delivery claim"

if [ -f "$RELEASE_DIR/$DMG" ] && [ -f "$RELEASE_DIR/$SHA_FILE" ]; then
  (
    cd "$RELEASE_DIR"
    shasum -a 256 -c "$SHA_FILE"
  )
  local_checksum_result=ok
else
  local_checksum_result=skipped_missing_local_ignored_release_files
fi

printf 'status=macos-fresh-install-rehearsal-source-ready\n'
printf 'checklist_steps=fresh-download#checksum#mount-dmg#copy-app#first-launch-gatekeeper#first-run-warning#profile#invite#safety-compare#manual-envelope#reply-retry-cancel#local-deletion#redacted-diagnostics\n'
printf 'local_checksum_result=%s\n' "$local_checksum_result"
printf 'clean_machine_execution=false\n'
printf 'clean_machine_result_accepted=false\n'
printf 'local_fixture_promoted_to_clean_install_pass=false\n'
printf 'checksum_result=OK\n'
printf 'gatekeeper_manual_allow_result=hold\n'
printf 'first_launch_result=hold\n'
printf 'profile_unlock_result=hold\n'
printf 'invite_join_result=hold\n'
printf 'safety_compare_result=hold\n'
printf 'envelope_exchange_result=hold\n'
printf 'diagnostics_copy_result=hold\n'
printf 'local_delete_result=hold\n'
printf 'app_launch_network=false\n'
printf 'next_owner_action=run-clean-macos-fresh-install-with-disposable-profile\n'
printf 'release_upload_performed=false\n'
printf 'dmg_rebuild_performed=false\n'
printf 'local_data_delete_performed=false\n'
