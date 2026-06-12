#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
ANDROID_API="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt"
ANDROID_ADAPTER="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/ReadOnlyNativeStatusAdapter.kt"
IOS_API="$ROOT_DIR/apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift"
IOS_ADAPTER="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile read-only status adapter file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile read-only status adapter text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile read-only status adapter text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$ANDROID_API"
require_file "$ANDROID_ADAPTER"
require_file "$IOS_API"
require_file "$IOS_ADAPTER"
require_file "$ROOT_DIR/apps/mobile/ffi/README.md"

require_text "$CONTRACT" '"first_binding_unit": "status_and_redacted_diagnostics_read_only_adapter"'
require_text "$CONTRACT" '"read_only_adapter_implemented": true'
require_text "$CONTRACT" '"binding_generation_implemented": false'
require_text "$CONTRACT" '"callable_ffi_implemented": false'
require_text "$CONTRACT" '"generated_bindings_claimed": false'
require_text "$CONTRACT" '"shared_core_status_surface"'
require_text "$CONTRACT" '"redacted_support_diagnostics"'
require_text "$CONTRACT" '"network_io"'
require_text "$CONTRACT" '"runtime_messaging"'
require_text "$CONTRACT" '"destructive_lifecycle"'

require_text "$ANDROID_API" "private val readOnlyStatusAdapter: ReadOnlyNativeStatusAdapter"
require_text "$ANDROID_API" "readOnlyStatusAdapter.sharedCoreStatusSurface()"
require_text "$ANDROID_API" "readOnlyStatusAdapter.redactedSupportDiagnostics()"
require_text "$IOS_API" "private let readOnlyStatusAdapter: ReadOnlyNativeStatusAdapter"
require_text "$IOS_API" "readOnlyStatusAdapter.sharedCoreStatusSurface()"
require_text "$IOS_API" "readOnlyStatusAdapter.redactedSupportDiagnostics()"

for adapter in "$ANDROID_ADAPTER" "$IOS_ADAPTER"; do
  require_text "$adapter" "ReadOnlyNativeStatusAdapter"
  require_text "$adapter" "SourceBoundaryReadOnlyNativeStatusAdapter"
  require_text "$adapter" "sharedCoreStatusSurface"
  require_text "$adapter" "redactedSupportDiagnostics"
  require_text "$adapter" "shared_core_status_surface"
  require_text "$adapter" "redacted_support_diagnostics"
  require_text "$adapter" "unsigned experimental public beta"
  require_text "$adapter" "sensitive communication prohibited"
  require_text "$adapter" "not audited"
  require_text "$adapter" "not production-ready"
  require_text "$adapter" "external onion delivery not claimed"
  require_text "$adapter" "mobile readiness not claimed"

  reject_text "$adapter" "fun profileUnlockLockStatus"
  reject_text "$adapter" "fun inviteCodeCreateJoin"
  reject_text "$adapter" "fun pairingPayloadExportImport"
  reject_text "$adapter" "fun safetyTranscriptConfirm"
  reject_text "$adapter" "fun manualEnvelopeExportImport"
  reject_text "$adapter" "fun messageTranscriptView"
  reject_text "$adapter" "fun localDataLifecycle"
  reject_text "$adapter" "func profileUnlockLockStatus"
  reject_text "$adapter" "func inviteCodeCreateJoin"
  reject_text "$adapter" "func pairingPayloadExportImport"
  reject_text "$adapter" "func safetyTranscriptConfirm"
  reject_text "$adapter" "func manualEnvelopeExportImport"
  reject_text "$adapter" "func messageTranscriptView"
  reject_text "$adapter" "func localDataLifecycle"
  reject_text "$adapter" "HttpURLConnection"
  reject_text "$adapter" "Socket"
  reject_text "$adapter" "Firebase"
  reject_text "$adapter" "URLSession"
  reject_text "$adapter" "NWConnection"
  reject_text "$adapter" "CloudKit"
done

require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "Read-Only Native Status Adapter Boundary"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "status_and_redacted_diagnostics_read_only_adapter"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "binding generation implemented false"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "callable FFI implemented false"

printf 'status=mobile-read-only-status-adapter-verified\n'
printf 'first_binding_unit=status_and_redacted_diagnostics_read_only_adapter\n'
printf 'android_read_only_adapter_connected=true\n'
printf 'ios_read_only_adapter_connected=true\n'
printf 'blocked_surfaces_remain_blocked=true\n'
printf 'callable_ffi_implemented=false\n'
printf 'generated_bindings_claimed=false\n'
printf 'mobile_readiness_claim=false\n'
