#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
ANDROID_API="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt"
IOS_API="$ROOT_DIR/apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift"
ANDROID_ADAPTER="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/ReadOnlyNativeStatusAdapter.kt"
IOS_ADAPTER="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift"
ANDROID_BLOCKED_COMMAND_ADAPTER="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/BlockedMobileCommandAdapter.kt"
IOS_BLOCKED_COMMAND_ADAPTER="$ROOT_DIR/apps/mobile/ios/AnotherDimension/BlockedMobileCommandAdapter.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile binding gate file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile binding gate text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile binding gate text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$ANDROID_API"
require_file "$IOS_API"
require_file "$ANDROID_ADAPTER"
require_file "$IOS_ADAPTER"
require_file "$ANDROID_BLOCKED_COMMAND_ADAPTER"
require_file "$IOS_BLOCKED_COMMAND_ADAPTER"
require_file "$ROOT_DIR/apps/mobile/ffi/README.md"
require_file "$ROOT_DIR/crates/core/src/lib.rs"

require_text "$CONTRACT" '"status": "source-boundary-contract"'
require_text "$CONTRACT" '"binding_generation_implemented": false'
require_text "$CONTRACT" '"callable_ffi_implemented": false'
require_text "$CONTRACT" '"generated_bindings_claimed": false'
require_text "$CONTRACT" '"read_only_adapter_implemented": true'
require_text "$CONTRACT" '"blocked_command_adapter_implemented": true'
require_text "$CONTRACT" '"native_binding_readiness_gate"'
require_text "$CONTRACT" '"ffi_error_mapping_table_finalized": true'
require_text "$CONTRACT" '"canonical_serialization_test_vectors_finalized": true'
require_text "$CONTRACT" '"callable_ffi_may_start": false'
require_text "$CONTRACT" '"generated_binding_may_start": false'
require_text "$CONTRACT" '"wrapper_neutral": true'
require_text "$CONTRACT" '"mobile_readiness_claimed": false'
require_text "$CONTRACT" '"security_ready_claimed": false'
require_text "$CONTRACT" '"first_binding_unit": "status_and_redacted_diagnostics_read_only_adapter"'
require_text "$CONTRACT" '"network_io"'
require_text "$CONTRACT" '"runtime_messaging"'
require_text "$CONTRACT" '"destructive_lifecycle"'

for api_group in \
  shared_core_status_surface \
  profile_unlock_lock_status \
  invite_code_create_join \
  pairing_payload_export_import \
  safety_transcript_confirm \
  manual_envelope_export_import \
  message_transcript_view \
  local_data_lifecycle \
  redacted_support_diagnostics; do
  require_text "$CONTRACT" "\"$api_group\""
  require_text "$ANDROID_API" "$api_group"
  require_text "$IOS_API" "$api_group"
done

for dto_field in \
  schema_version \
  platform \
  profile_lock_state \
  runtime_command_surface \
  mobile_command_surface \
  local_data_lifecycle_state \
  backup_exclusion_state \
  install_update_integrity_state \
  diagnostics_redaction_state \
  public_non_claims; do
  require_text "$CONTRACT" "\"$dto_field\""
done

for result_field in status failure_class recovery_next_action; do
  require_text "$CONTRACT" "\"$result_field\""
done

for error_code in \
  locked_profile \
  malformed_payload \
  replay_rejected \
  policy_blocked \
  transport_unavailable \
  unsupported_mobile_surface \
  lifecycle_confirmation_required \
  ffi_unavailable; do
  require_text "$CONTRACT" "\"$error_code\""
done

for forbidden in \
  wrapper_specific_protocol \
  wrapper_specific_storage \
  wrapper_specific_transport \
  central_contact_discovery \
  central_message_server \
  push_notification_delivery \
  cloud_backup \
  external_onion_delivery_success_claim \
  security_ready_claim \
  mobile_readiness_claim; do
  require_text "$CONTRACT" "\"$forbidden\""
done

require_text "$ANDROID_API" "class AndroidSharedCoreBoundary"
require_text "$ANDROID_API" "readOnlyStatusAdapter.sharedCoreStatusSurface()"
require_text "$ANDROID_API" "readOnlyStatusAdapter.redactedSupportDiagnostics()"
require_text "$ANDROID_API" "ffi_unavailable"
require_text "$ANDROID_API" "explicit user action required"
require_text "$IOS_API" "final class IOSSharedCoreBoundary"
require_text "$IOS_API" "readOnlyStatusAdapter.sharedCoreStatusSurface()"
require_text "$IOS_API" "readOnlyStatusAdapter.redactedSupportDiagnostics()"
require_text "$IOS_API" "ffi_unavailable"
require_text "$IOS_API" "explicit user action required"
require_text "$ANDROID_ADAPTER" "SourceBoundaryReadOnlyNativeStatusAdapter"
require_text "$IOS_ADAPTER" "SourceBoundaryReadOnlyNativeStatusAdapter"
require_text "$ANDROID_BLOCKED_COMMAND_ADAPTER" "SourceBoundaryBlockedMobileCommandAdapter"
require_text "$IOS_BLOCKED_COMMAND_ADAPTER" "SourceBoundaryBlockedMobileCommandAdapter"

require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "Native Binding Implementation Gate"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "Read-Only Native Status Adapter Boundary"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "Blocked Command Adapter Boundary"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "Native Binding Readiness Gate"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "FFI Error Mapping Table Boundary"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "Canonical Serialization Test Vector Boundary"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "status_and_redacted_diagnostics_read_only_adapter"
require_text "$ROOT_DIR/apps/mobile/ffi/README.md" "shared_core_mobile_api_contract.json"
require_text "$ROOT_DIR/crates/core/src/lib.rs" "production_mobile_shared_core_api_freeze_boundary_summary"

reject_text "$ANDROID_API" "HttpURLConnection"
reject_text "$ANDROID_API" "Socket"
reject_text "$ANDROID_API" "Firebase"
reject_text "$IOS_API" "URLSession"
reject_text "$IOS_API" "NWConnection"
reject_text "$IOS_API" "CloudKit"

printf 'status=mobile-binding-gate-verified\n'
printf 'first_binding_unit=status_and_redacted_diagnostics_read_only_adapter\n'
printf 'binding_generation_implemented=false\n'
printf 'callable_ffi_implemented=false\n'
printf 'generated_bindings_claimed=false\n'
printf 'wrapper_specific_protocol_storage_transport=false\n'
printf 'mobile_readiness_claim=false\n'
