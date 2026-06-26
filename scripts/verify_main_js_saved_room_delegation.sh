#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_contains() {
  local file="$1"
  local pattern="$2"

  if ! grep -Fq "$pattern" "$file"; then
    printf 'missing expected delegation in %s: %s\n' "$file" "$pattern" >&2
    exit 1
  fi
}

require_contains "$ROOT_DIR/apps/desktop-tauri/src/main.js" "return savedRoomController.refreshSavedInviteRoomMetadataForFingerprint(roomFingerprint, options);"
require_contains "$ROOT_DIR/apps/desktop-tauri/src/main.js" "return savedRoomController.rememberCurrentInviteRoomMetadata();"
require_contains "$ROOT_DIR/apps/desktop-tauri/src/main.js" "return savedRoomController.refreshCurrentRoomAfterReceiveImport(refreshPlan, input);"

printf 'main_js_saved_room_delegation passed\n'
