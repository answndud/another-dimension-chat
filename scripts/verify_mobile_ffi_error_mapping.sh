#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
ANDROID_ADAPTER="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/BlockedMobileCommandAdapter.kt"
IOS_ADAPTER="$ROOT_DIR/apps/mobile/ios/AnotherDimension/BlockedMobileCommandAdapter.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile FFI error mapping file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile FFI error mapping text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile FFI error mapping text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$FFI_README"
require_file "$ANDROID_ADAPTER"
require_file "$IOS_ADAPTER"

require_text "$CONTRACT" '"ffi_error_mapping_table_finalized": true'
require_text "$CONTRACT" '"ffi_error_mapping_table"'
require_text "$CONTRACT" '"ffi_error_mapping_blocks"'
require_text "$CONTRACT" '"raw_exception_bridge": true'
require_text "$CONTRACT" '"platform_specific_error_taxonomy": true'
require_text "$CONTRACT" '"panic_string_exposure": true'
require_text "$CONTRACT" '"private_payload_in_error": true'
require_text "$CONTRACT" '"callable_ffi_implemented": false'

for field in \
  '"failure_class"' \
  '"status"' \
  '"ffi_result_kind"' \
  '"kotlin_result_type": "SharedCoreCommandResult"' \
  '"swift_result_type": "SharedCoreCommandResult"' \
  '"recovery_next_action"'; do
  require_text "$CONTRACT" "$field"
done

for mapping in \
  'locked_profile|blocked|enter passphrase' \
  'malformed_payload|rejected_input|show redacted parse failure' \
  'replay_rejected|rejected_state|show redacted replay rejection' \
  'policy_blocked|blocked|explicit user action required' \
  'transport_unavailable|unavailable|manual transport action required' \
  'unsupported_mobile_surface|unsupported|use desktop source boundary' \
  'lifecycle_confirmation_required|confirmation_required|confirm lifecycle intent before any shared Rust core binding for local_data_lifecycle' \
  'ffi_unavailable|unavailable|connect shared Rust core binding'; do
  IFS='|' read -r failure kind recovery <<< "$mapping"
  require_text "$CONTRACT" "\"failure_class\": \"$failure\""
  require_text "$CONTRACT" "\"ffi_result_kind\": \"$kind\""
  require_text "$CONTRACT" "\"recovery_next_action\": \"$recovery\""
  require_text "$FFI_README" "$failure"
  require_text "$FFI_README" "$kind"
  require_text "$FFI_README" "$recovery"
done

for adapter in "$ANDROID_ADAPTER" "$IOS_ADAPTER"; do
  require_text "$adapter" "SharedCoreCommandResult"
  require_text "$adapter" "locked_profile"
  require_text "$adapter" "policy_blocked"
  require_text "$adapter" "lifecycle_confirmation_required"
  require_text "$adapter" "ffi_unavailable"
  require_text "$adapter" "enter passphrase"
  require_text "$adapter" "explicit user action required"
  require_text "$adapter" "confirm lifecycle intent before any shared Rust core binding for local_data_lifecycle"
  require_text "$adapter" "connect shared Rust core binding"
done

require_text "$FFI_README" "FFI Error Mapping Table Boundary"
require_text "$FFI_README" "does not create callable FFI"
require_text "$FFI_README" "raw exception bridges"
require_text "$FFI_README" "platform-specific error taxonomies"
require_text "$FFI_README" "panic string exposure"
require_text "$FFI_README" "private payloads in errors"

reject_text "$CONTRACT" '"callable_ffi_implemented": true'
reject_text "$CONTRACT" '"raw_exception_bridge": false'
reject_text "$CONTRACT" '"platform_specific_error_taxonomy": false'
reject_text "$CONTRACT" '"panic_string_exposure": false'
reject_text "$CONTRACT" '"private_payload_in_error": false'

printf 'status=mobile-ffi-error-mapping-verified\n'
printf 'ffi_error_mapping_table_finalized=true\n'
printf 'kotlin_swift_result_shape=SharedCoreCommandResult\n'
printf 'callable_ffi_implemented=false\n'
printf 'platform_specific_error_taxonomy=false\n'
