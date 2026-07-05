#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
PARITY="$ROOT_DIR/apps/mobile/ffi/adapter_parity_contract.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
ANDROID_STATUS="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/ReadOnlyNativeStatusAdapter.kt"
IOS_STATUS="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift"
ANDROID_COMMAND="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/BlockedMobileCommandAdapter.kt"
IOS_COMMAND="$ROOT_DIR/apps/mobile/ios/AnotherDimension/BlockedMobileCommandAdapter.swift"
ANDROID_VIEW="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
IOS_VIEW="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ContentView.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile adapter parity file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile adapter parity text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile adapter parity text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$PARITY"
require_file "$FFI_README"
require_file "$ANDROID_STATUS"
require_file "$IOS_STATUS"
require_file "$ANDROID_COMMAND"
require_file "$IOS_COMMAND"
require_file "$ANDROID_VIEW"
require_file "$IOS_VIEW"

node -e "const fs=require('fs'); JSON.parse(fs.readFileSync(process.argv[1],'utf8')); JSON.parse(fs.readFileSync(process.argv[2],'utf8'));" "$CONTRACT" "$PARITY"

require_text "$CONTRACT" '"android_ios_adapter_parity_verified": true'
require_text "$CONTRACT" '"adapter_parity_contract_file": "apps/mobile/ffi/adapter_parity_contract.json"'
require_text "$PARITY" '"android_ios_adapter_parity_verified": true'
require_text "$PARITY" '"callable_ffi_implemented": false'
require_text "$PARITY" '"generated_bindings_claimed": false'
require_text "$FFI_README" "Android/iOS Adapter Parity Gate"
require_text "$FFI_README" 'The parity contract file is `adapter_parity_contract.json`.'

for method in sharedCoreStatusSurface redactedSupportDiagnostics; do
  require_text "$PARITY" "\"$method\""
  require_text "$ANDROID_STATUS" "$method"
  require_text "$IOS_STATUS" "$method"
done

for method in \
  profileUnlockLockStatus \
  inviteCodeCreateJoin \
  pairingPayloadExportImport \
  safetyTranscriptConfirm \
  manualEnvelopeExportImport \
  messageTranscriptView \
  localDataLifecycle; do
  require_text "$PARITY" "\"$method\""
  require_text "$ANDROID_COMMAND" "$method"
  require_text "$IOS_COMMAND" "$method"
done

for api_group in \
  shared_core_status_surface \
  redacted_support_diagnostics \
  profile_unlock_lock_status \
  invite_code_create_join \
  pairing_payload_export_import \
  safety_transcript_confirm \
  manual_envelope_export_import \
  message_transcript_view \
  local_data_lifecycle; do
  require_text "$PARITY" "\"$api_group\""
  require_text "$CONTRACT" "\"$api_group\""
done

for vocab in status failure_class recovery_next_action; do
  require_text "$PARITY" "\"$vocab\""
  require_text "$ANDROID_VIEW" "$vocab="
  require_text "$IOS_VIEW" "$vocab="
done

require_text "$PARITY" '"blocked"'
require_text "$ANDROID_COMMAND" 'status = "blocked"'
require_text "$IOS_COMMAND" 'status: "blocked"'

for failure in \
  locked_profile \
  policy_blocked \
  lifecycle_confirmation_required \
  ffi_unavailable; do
  require_text "$PARITY" "\"$failure\""
  require_text "$ANDROID_COMMAND" "$failure"
  require_text "$IOS_COMMAND" "$failure"
done

for boundary in \
  'diagnostics_copy_boundary=user_initiated_local_clipboard_only' \
  'diagnostics_payload=redacted_status_support_only' \
  'lifecycle_confirmation_boundary=display_only_no_local_data_mutation' \
  'launch_network_boundary=no_native_network_permission_no_bootstrap' \
  'launch_runtime_boundary=no_runtime_messaging_loop_no_background_delivery' \
  'implicit_delivery_start=false' \
  'generated_callable_binding=false'; do
  require_text "$PARITY" "$boundary"
  require_text "$ANDROID_VIEW" "$boundary"
  require_text "$IOS_VIEW" "$boundary"
done

for platform_diff in \
  android_shell_candidate \
  ios_shell_candidate \
  "app-private storage required" \
  "app-container storage required" \
  "cloud backup not claimed" \
  "iCloud backup not claimed"; do
  require_text "$PARITY" "$platform_diff"
done

reject_text "$PARITY" '"callable_ffi_implemented": true'
reject_text "$PARITY" '"generated_bindings_claimed": true'

printf 'status=mobile-adapter-parity-verified\n'
printf 'android_ios_adapter_parity_verified=true\n'
printf 'shared_status_adapter_methods=true\n'
printf 'shared_blocked_command_methods=true\n'
printf 'shared_shell_boundaries=true\n'
printf 'callable_ffi_implemented=false\n'
