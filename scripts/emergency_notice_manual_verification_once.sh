#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing emergency notice manual verification text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden emergency notice text in $file: $text" >&2
    exit 1
  fi
}

ACTION_STATE="$ROOT_DIR/apps/desktop-tauri/src/action-state.js"
ACTION_STATE_TEST="$ROOT_DIR/apps/desktop-tauri/src/action-state.test.js"
UPDATE_DOC="$ROOT_DIR/reference/UPDATE_INTEGRITY.md"
CHANNEL_DOC="$ROOT_DIR/reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md"
ADVISORY_SCRIPT="$ROOT_DIR/scripts/prepare_macos_emergency_release_advisory_packet.sh"

for file in "$ACTION_STATE" "$ACTION_STATE_TEST" "$UPDATE_DOC" "$CHANNEL_DOC" "$ADVISORY_SCRIPT"; do
  [ -f "$file" ] || {
    echo "FAIL missing emergency notice manual verification input: $file" >&2
    exit 1
  }
done

for file in "$ACTION_STATE" "$ACTION_STATE_TEST" "$UPDATE_DOC" "$CHANNEL_DOC"; do
  require_text "$file" "emergency_notice_manual_verification_only=true"
  require_text "$file" "emergency_notice_update_availability_claim=false"
  require_text "$file" "background_update_check=false"
  require_text "$file" "push_update_notice=false"
  require_text "$file" "forced_upgrade=false"
done

require_text "$ACTION_STATE" 'emergency_notice_mode=${emergencyNoticeMode}'
require_text "$ACTION_STATE" 'const emergencyNoticeMode = "manual-release-identity-verification"'
require_text "$ACTION_STATE" "emergency_notice_auto_update_claim=false"
require_text "$ACTION_STATE_TEST" "emergency_notice_mode=manual-release-identity-verification"
require_text "$ACTION_STATE_TEST" "emergencyNoticeManualVerificationOnly"
require_text "$ACTION_STATE_TEST" "emergencyNoticeUpdateAvailabilityClaimed"
require_text "$UPDATE_DOC" "Emergency notices are manual release identity verification instructions only."
require_text "$UPDATE_DOC" "not update availability"
require_text "$UPDATE_DOC" "not an auto-update prompt"
require_text "$CHANNEL_DOC" "Emergency notice is manual release identity verification only."
require_text "$ADVISORY_SCRIPT" "release_artifact_identity_binding_required=true"
require_text "$ADVISORY_SCRIPT" "manual_verification_required=true"

for file in "$ACTION_STATE" "$UPDATE_DOC" "$CHANNEL_DOC"; do
  reject_text "$file" "emergency_notice_update_availability_claim=true"
  reject_text "$file" "emergency_notice_auto_update_claim=true"
  reject_text "$file" "background_update_check=true"
  reject_text "$file" "push_update_notice=true"
  reject_text "$file" "forced_upgrade=true"
done

printf '%s\n' "status=emergency-notice-manual-verification-ready"
printf '%s\n' "emergency_notice_mode=manual-release-identity-verification"
printf '%s\n' "emergency_notice_manual_verification_only=true"
printf '%s\n' "emergency_notice_update_availability_claim=false"
printf '%s\n' "emergency_notice_auto_update_claim=false"
printf '%s\n' "background_update_check=false"
printf '%s\n' "push_update_notice=false"
printf '%s\n' "forced_upgrade=false"
