#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
VECTORS="$ROOT_DIR/apps/mobile/ffi/serialization_vectors.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
ANDROID_VIEW="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
IOS_VIEW="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ContentView.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile serialization vector file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile serialization vector text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile serialization vector text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$VECTORS"
require_file "$FFI_README"
require_file "$ANDROID_VIEW"
require_file "$IOS_VIEW"

node -e "const fs=require('fs'); JSON.parse(fs.readFileSync(process.argv[1],'utf8')); JSON.parse(fs.readFileSync(process.argv[2],'utf8'));" "$CONTRACT" "$VECTORS"

require_text "$CONTRACT" '"canonical_serialization_test_vectors_finalized": true'
require_text "$CONTRACT" '"canonical_serialization_vectors_file": "apps/mobile/ffi/serialization_vectors.json"'
require_text "$VECTORS" '"canonical_serialization_test_vectors_finalized": true'
require_text "$VECTORS" '"callable_ffi_implemented": false'
require_text "$VECTORS" '"generated_bindings_claimed": false'

for term in \
  deterministic_utf8_json_object \
  explicit_schema_version \
  sorted_keys \
  string_enums \
  bounded_status_label_arrays \
  reject_unknown_fields; do
  require_text "$CONTRACT" "\"$term\""
  require_text "$VECTORS" "\"$term\""
  require_text "$FFI_README" "$term"
done

for key in \
  backup_exclusion_state \
  diagnostics_redaction_state \
  install_update_integrity_state \
  local_data_lifecycle_state \
  mobile_command_surface \
  platform \
  profile_lock_state \
  public_non_claims \
  runtime_command_surface \
  schema_version; do
  require_text "$VECTORS" "\"$key\""
  require_text "$FFI_README" "$key"
  require_text "$ANDROID_VIEW" "$key="
  require_text "$IOS_VIEW" "$key="
done

for key in failure_class recovery_next_action status; do
  require_text "$VECTORS" "\"$key\""
  require_text "$FFI_README" "$key"
  require_text "$ANDROID_VIEW" "$key="
  require_text "$IOS_VIEW" "$key="
done

for vector in \
  shared_core_status_surface \
  redacted_support_diagnostics \
  blocked_command_result \
  lifecycle_confirmation_required_result \
  reject_unknown_fields_vector; do
  require_text "$CONTRACT" "\"$vector\""
  require_text "$VECTORS" "\"$vector\""
  require_text "$FFI_README" "$vector"
done

require_text "$VECTORS" '"unexpected\":\"reject\"'
require_text "$VECTORS" '"failure_class\":\"policy_blocked\",\"recovery_next_action\":\"explicit user action required\",\"status\":\"blocked\"'
require_text "$VECTORS" '"failure_class\":\"lifecycle_confirmation_required\",\"recovery_next_action\":\"confirm lifecycle intent before any shared Rust core binding for local_data_lifecycle\",\"status\":\"blocked\"'
require_text "$VECTORS" '"backup_exclusion_state\":\"cloud backup not claimed\",\"diagnostics_redaction_state\":\"redacted status only\"'
require_text "$FFI_README" "Canonical Serialization Test Vector Boundary"
require_text "$FFI_README" 'The vector file is `serialization_vectors.json`.'
require_text "$FFI_README" "Unknown fields must be rejected"
require_text "$FFI_README" "schema version must be explicit"

reject_text "$VECTORS" '"callable_ffi_implemented": true'
reject_text "$VECTORS" '"generated_bindings_claimed": true'
reject_text "$VECTORS" "plaintext"
reject_text "$VECTORS" "private_key"
reject_text "$VECTORS" "passphrase"

printf 'status=mobile-serialization-vectors-verified\n'
printf 'canonical_serialization_test_vectors_finalized=true\n'
printf 'sorted_keys=true\n'
printf 'reject_unknown_fields=true\n'
printf 'callable_ffi_implemented=false\n'
