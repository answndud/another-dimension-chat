#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX_HTML="$ROOT_DIR/apps/desktop-tauri/index.html"
I18N_JS="$ROOT_DIR/apps/desktop-tauri/src/i18n.js"
MAIN_JS="$ROOT_DIR/apps/desktop-tauri/src/main.js"
STYLES_CSS="$ROOT_DIR/apps/desktop-tauri/src/styles.css"
UI_SMOKE="$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js"
README="$ROOT_DIR/README.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop lifecycle input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop lifecycle text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop lifecycle text in $file: $text" >&2
    exit 1
  fi
}

for file in "$INDEX_HTML" "$I18N_JS" "$MAIN_JS" "$STYLES_CSS" "$UI_SMOKE" "$README"; do
  require_file "$file"
done

require_text "$INDEX_HTML" "lifecycle-guide"
require_text "$INDEX_HTML" "localDataLifecycleGuideConversation"
require_text "$INDEX_HTML" "localDataLifecycleGuideSession"
require_text "$INDEX_HTML" "localDataLifecycleGuideProfile"
require_text "$INDEX_HTML" "localDataLifecycleGuideWipe"
require_text "$INDEX_HTML" "localDataLifecycleGuideBoundary"
require_text "$INDEX_HTML" "conversationDeleteScopeNote"
require_text "$INDEX_HTML" "sessionDeleteScopeNote"
require_text "$INDEX_HTML" "profileDeleteScopeNote"
require_text "$INDEX_HTML" "fullWipeScopeNote"
require_text "$INDEX_HTML" "production-profile-delete-confirmation"
require_text "$INDEX_HTML" "production-full-wipe-confirmation"

require_text "$I18N_JS" "Conversation delete removes local message records and preserves session records."
require_text "$I18N_JS" "Session delete removes local session resume records and preserves message records."
require_text "$I18N_JS" "Profile delete removes the local profile store after exact-name confirmation."
require_text "$I18N_JS" "Full local wipe removes owned app data on this device after WIPE LOCAL DATA confirmation."
require_text "$I18N_JS" "No cloud backup recovery, rollback prevention, or secure deletion from storage media is claimed."
require_text "$I18N_JS" "Deletes local conversation message records only; session resume records are preserved."
require_text "$I18N_JS" "Deletes local session resume records only; conversation message records are preserved."
require_text "$I18N_JS" "Deletes the local profile store and clears affected room runtime only; no cloud backup recovery is performed."
require_text "$I18N_JS" "Deletes owned local app data on this device only; secure deletion from storage media and rollback prevention are not claimed."

require_text "$MAIN_JS" "function dataLifecycleDestructivePreflightView"
require_text "$MAIN_JS" "confirmation_matched=\${confirmationMatched}"
require_text "$MAIN_JS" "backup_recovery=false"
require_text "$MAIN_JS" "cloud_backup_sync=false"
require_text "$MAIN_JS" "rollback_prevention=false"
require_text "$MAIN_JS" "secure_delete_claim=false"
require_text "$MAIN_JS" "network_io=false"
require_text "$MAIN_JS" "confirmation === input.profile"
require_text "$MAIN_JS" "confirmation === \"WIPE LOCAL DATA\""
require_text "$MAIN_JS" "Deleting local session lifecycle records only. Message data, backups, and secure deletion claims are handled separately."
require_text "$MAIN_JS" "Deleting local conversation message records only. This is not backup recovery, rollback prevention, or secure media deletion."
require_text "$MAIN_JS" "message_records_preserved_by_session_delete=\${sessionDelete}"
require_text "$MAIN_JS" "profile_store_removed=\${profileDelete}"
require_text "$MAIN_JS" "owned_app_data_removed=\${fullWipe}"

require_text "$STYLES_CSS" ".lifecycle-guide"
require_text "$STYLES_CSS" ".lifecycle-action-note"

require_text "$UI_SMOKE" "local data lifecycle actions expose destructive local-only boundaries"
require_text "$UI_SMOKE" "localDataLifecycleGuideConversation"
require_text "$UI_SMOKE" "conversationDeleteScopeNote"

require_text "$README" "### Local Data Lifecycle"
require_text "$README" "conversation delete"
require_text "$README" "preserving session records"
require_text "$README" "session delete"
require_text "$README" "preserving message records"
require_text "$README" "full local wipe requires typing"
require_text "$README" "WIPE LOCAL DATA"
require_text "$README" "cloud backup recovery"
require_text "$README" "prevention, or secure deletion from storage media"

for file in "$INDEX_HTML" "$I18N_JS" "$MAIN_JS" "$README"; do
  reject_text "$file" "secure deletion from storage media is provided"
  reject_text "$file" "secure deletion is guaranteed"
  reject_text "$file" "secure delete guaranteed"
  reject_text "$file" "rollback prevention guaranteed"
  reject_text "$file" "rollback prevention is provided"
  reject_text "$file" "cloud backup recovery is available"
  reject_text "$file" "cloud backup sync is available"
  reject_text "$file" "restores from cloud backup"
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "production-ready public beta"
done

printf 'status=desktop-lifecycle-safety-ready\n'
printf 'conversation_delete_preserves_session_records=true\n'
printf 'session_delete_preserves_message_records=true\n'
printf 'profile_delete_requires_exact_name=true\n'
printf 'full_wipe_requires_literal_confirmation=true\n'
printf 'secure_delete_claim=false\n'
printf 'rollback_prevention=false\n'
printf 'cloud_backup_recovery=false\n'
