#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_VIEW="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
IOS_VIEW="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ContentView.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile shell presentation file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile shell presentation text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile shell presentation text in $file: $text" >&2
    exit 1
  fi
}

require_file "$ANDROID_VIEW"
require_file "$IOS_VIEW"

for view in "$ANDROID_VIEW" "$IOS_VIEW"; do
  require_text "$view" "sharedCore.sharedCoreStatusSurface()"
  require_text "$view" "sharedCore.profileUnlockLockStatus"
  require_text "$view" "sharedCore.inviteCodeCreateJoin"
  require_text "$view" "sharedCore.manualEnvelopeExportImport"
  require_text "$view" "sharedCore.redactedSupportDiagnostics()"
  require_text "$view" "schema_version="
  require_text "$view" "platform="
  require_text "$view" "profile_lock_state="
  require_text "$view" "runtime_command_surface="
  require_text "$view" "mobile_command_surface="
  require_text "$view" "local_data_lifecycle_state="
  require_text "$view" "backup_exclusion_state="
  require_text "$view" "install_update_integrity_state="
  require_text "$view" "diagnostics_redaction_state="
  require_text "$view" "public_non_claims="
  require_text "$view" "failure_class="
  require_text "$view" "recovery_next_action="
  require_text "$view" "ExplicitUserActionToken"

  reject_text "$view" "failure="
  reject_text "$view" "next="
  reject_text "$view" "mobile readiness ready"
  reject_text "$view" "production-ready"
  reject_text "$view" "audited"
  reject_text "$view" "sensitive communication allowed"
  reject_text "$view" "external onion delivery success"
  reject_text "$view" "HttpURLConnection"
  reject_text "$view" "Socket"
  reject_text "$view" "URLSession"
  reject_text "$view" "NWConnection"
done

printf 'status=mobile-shell-presentation-verified\n'
printf 'adapter_result_vocabulary=contract_labels\n'
printf 'public_non_claims_displayed=true\n'
printf 'mobile_readiness_claim=false\n'
