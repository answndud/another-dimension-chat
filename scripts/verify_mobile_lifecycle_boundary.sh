#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_VIEW="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
ANDROID_ADAPTER="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/BlockedMobileCommandAdapter.kt"
IOS_VIEW="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ContentView.swift"
IOS_ADAPTER="$ROOT_DIR/apps/mobile/ios/AnotherDimension/BlockedMobileCommandAdapter.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile lifecycle boundary file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile lifecycle boundary text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile lifecycle boundary text in $file: $text" >&2
    exit 1
  fi
}

require_file "$ANDROID_VIEW"
require_file "$ANDROID_ADAPTER"
require_file "$IOS_VIEW"
require_file "$IOS_ADAPTER"

for file in "$ANDROID_ADAPTER" "$IOS_ADAPTER"; do
  require_text "$file" "localDataLifecycle"
  require_text "$file" "lifecycle_confirmation_required"
  require_text "$file" "confirm lifecycle intent before any shared Rust core binding for local_data_lifecycle"
  require_text "$file" "policy_blocked"
  require_text "$file" "explicit user action required"
done

for view in "$ANDROID_VIEW" "$IOS_VIEW"; do
  require_text "$view" "Lifecycle"
  require_text "$view" "sharedCore.localDataLifecycle"
  require_text "$view" "tap_lifecycle_review"
  require_text "$view" "renderLifecycleConfirmationBoundary"
  require_text "$view" "lifecycle_confirmation_boundary=display_only_no_local_data_mutation"
  require_text "$view" "lifecycle_commands=conversation_delete,session_delete,profile_delete,full_local_wipe"
  require_text "$view" "destructive_lifecycle_execution=false"
  require_text "$view" "filesystem_path_exposed=false"
  require_text "$view" "storage_delete_called=false"
  require_text "$view" "failure_class="
  require_text "$view" "recovery_next_action="

  reject_text "$view" "deleteRecursively"
  reject_text "$view" "delete()"
  reject_text "$view" "removeItem"
  reject_text "$view" "FileManager.default.remove"
  reject_text "$view" "drop table"
  reject_text "$view" "DROP TABLE"
  reject_text "$view" "databasePath"
  reject_text "$view" "filesDir"
  reject_text "$view" "documentDirectory"
  reject_text "$view" "full wipe executed"
  reject_text "$view" "profile delete executed"
  reject_text "$view" "session delete executed"
  reject_text "$view" "conversation delete executed"
done

printf 'status=mobile-lifecycle-boundary-verified\n'
printf 'lifecycle_confirmation_required=true\n'
printf 'destructive_lifecycle_execution=false\n'
printf 'storage_delete_called=false\n'
printf 'mobile_readiness_claim=false\n'
