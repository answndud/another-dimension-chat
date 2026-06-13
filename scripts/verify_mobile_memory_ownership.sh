#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
OWNERSHIP="$ROOT_DIR/apps/mobile/ffi/memory_ownership_contract.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile memory ownership file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile memory ownership text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile memory ownership text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$OWNERSHIP"
require_file "$FFI_README"

node -e "const fs=require('fs'); JSON.parse(fs.readFileSync(process.argv[1],'utf8')); JSON.parse(fs.readFileSync(process.argv[2],'utf8'));" "$CONTRACT" "$OWNERSHIP"

require_text "$CONTRACT" '"memory_ownership_release_contract_finalized": true'
require_text "$CONTRACT" '"memory_ownership_contract_file": "apps/mobile/ffi/memory_ownership_contract.json"'
require_text "$OWNERSHIP" '"memory_ownership_release_contract_finalized": true'
require_text "$OWNERSHIP" '"callable_ffi_implemented": false'
require_text "$OWNERSHIP" '"generated_bindings_claimed": false'

for term in \
  caller_owned_input_buffers \
  core_owned_returned_buffers \
  explicit_release_required \
  release_function_required_before_callable_ffi \
  double_release_must_be_rejected \
  use_after_release_must_be_rejected \
  zero_length_buffer_is_valid \
  null_pointer_is_invalid; do
  require_text "$CONTRACT" "$term"
  require_text "$OWNERSHIP" "\"$term\""
  require_text "$FFI_README" "$term"
done

for payload in \
  SharedCoreStatusDto \
  SharedCoreCommandResult \
  redacted_diagnostics_payload; do
  require_text "$OWNERSHIP" "\"$payload\""
  require_text "$FFI_README" "$payload"
done

for forbidden in \
  raw_pointer_exposed_to_kotlin \
  raw_pointer_exposed_to_swift \
  passphrase_buffer_returned \
  private_key_buffer_returned \
  key_material_buffer_returned \
  plaintext_message_buffer_returned \
  local_path_buffer_returned \
  panic_string_returned \
  raw_log_returned; do
  require_text "$OWNERSHIP" "\"$forbidden\""
done

require_text "$OWNERSHIP" '"kotlin_must_not_hold_raw_native_pointer": true'
require_text "$OWNERSHIP" '"swift_must_not_hold_raw_native_pointer": true'
require_text "$OWNERSHIP" '"kotlin_receives_structured_result_only": true'
require_text "$OWNERSHIP" '"swift_receives_structured_result_only": true'
require_text "$FFI_README" "Memory Ownership Release Contract Boundary"
require_text "$FFI_README" 'The contract file is `memory_ownership_contract.json`.'
require_text "$FFI_README" "must not hold raw native pointers"

reject_text "$OWNERSHIP" '"callable_ffi_implemented": true'
reject_text "$OWNERSHIP" '"generated_bindings_claimed": true'
reject_text "$OWNERSHIP" '"raw_pointer_exposed_to_kotlin": false'
reject_text "$OWNERSHIP" '"raw_pointer_exposed_to_swift": false'
reject_text "$OWNERSHIP" '"passphrase_buffer_returned": false'
reject_text "$OWNERSHIP" '"private_key_buffer_returned": false'
reject_text "$OWNERSHIP" '"plaintext_message_buffer_returned": false'

printf 'status=mobile-memory-ownership-verified\n'
printf 'memory_ownership_release_contract_finalized=true\n'
printf 'caller_owned_input_buffers=true\n'
printf 'core_owned_returned_buffers=true\n'
printf 'explicit_release_required=true\n'
printf 'callable_ffi_implemented=false\n'
