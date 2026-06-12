#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
ANDROID_API="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt"
ANDROID_ADAPTER="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/BlockedMobileCommandAdapter.kt"
IOS_API="$ROOT_DIR/apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift"
IOS_ADAPTER="$ROOT_DIR/apps/mobile/ios/AnotherDimension/BlockedMobileCommandAdapter.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile command blocked adapter file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile command blocked adapter text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile command blocked adapter text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$ANDROID_API"
require_file "$ANDROID_ADAPTER"
require_file "$IOS_API"
require_file "$IOS_ADAPTER"
require_file "$ROOT_DIR/apps/mobile/ffi/README.md"

require_text "$CONTRACT" '"blocked_command_adapter_implemented": true'
require_text "$CONTRACT" '"binding_generation_implemented": false'
require_text "$CONTRACT" '"callable_ffi_implemented": false'
require_text "$CONTRACT" '"generated_bindings_claimed": false'
require_text "$CONTRACT" '"blocked_command_adapter_surfaces"'

for surface in \
  profile_unlock_lock_status \
  invite_code_create_join \
  pairing_payload_export_import \
  safety_transcript_confirm \
  manual_envelope_export_import \
  message_transcript_view \
  local_data_lifecycle; do
  require_text "$CONTRACT" "\"$surface\""
  require_text "$ANDROID_ADAPTER" "$surface"
  require_text "$IOS_ADAPTER" "$surface"
done

for adapter in "$ANDROID_ADAPTER" "$IOS_ADAPTER"; do
  require_text "$adapter" "BlockedMobileCommandAdapter"
  require_text "$adapter" "SourceBoundaryBlockedMobileCommandAdapter"
  require_text "$adapter" "locked_profile"
  require_text "$adapter" "policy_blocked"
  require_text "$adapter" "lifecycle_confirmation_required"
  require_text "$adapter" "ffi_unavailable"
  require_text "$adapter" "explicit user action required"
  require_text "$adapter" "unsigned experimental public beta"
  require_text "$adapter" "sensitive communication prohibited"
  require_text "$adapter" "not audited"
  require_text "$adapter" "not production-ready"
  require_text "$adapter" "external onion delivery not claimed"
  require_text "$adapter" "mobile readiness not claimed"

  reject_text "$adapter" "HttpURLConnection"
  reject_text "$adapter" "Socket"
  reject_text "$adapter" "Firebase"
  reject_text "$adapter" "URLSession"
  reject_text "$adapter" "NWConnection"
  reject_text "$adapter" "CloudKit"
  reject_text "$adapter" "ContactsContract"
  reject_text "$adapter" "UserNotifications"
done

require_text "$ANDROID_ADAPTER" "status = \"blocked\""
require_text "$IOS_ADAPTER" "status: \"blocked\""

require_text "$ANDROID_API" "private val blockedCommandAdapter: BlockedMobileCommandAdapter"
require_text "$ANDROID_API" "blockedCommandAdapter.profileUnlockLockStatus(passphraseProvided)"
require_text "$ANDROID_API" "blockedCommandAdapter.inviteCodeCreateJoin(action)"
require_text "$ANDROID_API" "blockedCommandAdapter.pairingPayloadExportImport(action)"
require_text "$ANDROID_API" "blockedCommandAdapter.safetyTranscriptConfirm(action)"
require_text "$ANDROID_API" "blockedCommandAdapter.manualEnvelopeExportImport(action)"
require_text "$ANDROID_API" "blockedCommandAdapter.messageTranscriptView()"
require_text "$ANDROID_API" "blockedCommandAdapter.localDataLifecycle(action)"

require_text "$IOS_API" "private let blockedCommandAdapter: BlockedMobileCommandAdapter"
require_text "$IOS_API" "blockedCommandAdapter.profileUnlockLockStatus(passphraseProvided: passphraseProvided)"
require_text "$IOS_API" "blockedCommandAdapter.inviteCodeCreateJoin(action: action)"
require_text "$IOS_API" "blockedCommandAdapter.pairingPayloadExportImport(action: action)"
require_text "$IOS_API" "blockedCommandAdapter.safetyTranscriptConfirm(action: action)"
require_text "$IOS_API" "blockedCommandAdapter.manualEnvelopeExportImport(action: action)"
require_text "$IOS_API" "blockedCommandAdapter.messageTranscriptView()"
require_text "$IOS_API" "blockedCommandAdapter.localDataLifecycle(action: action)"

require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "Blocked Command Adapter Boundary"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "binding generation implemented false"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "callable FFI implemented false"

printf 'status=mobile-command-blocked-adapter-verified\n'
printf 'blocked_command_adapter_implemented=true\n'
printf 'blocked_surfaces=profile_unlock_lock_status,invite_code_create_join,pairing_payload_export_import,safety_transcript_confirm,manual_envelope_export_import,message_transcript_view,local_data_lifecycle\n'
printf 'callable_ffi_implemented=false\n'
printf 'generated_bindings_claimed=false\n'
printf 'mobile_readiness_claim=false\n'
