#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
CLOSURE="$ROOT_DIR/apps/mobile/ffi/binding_prerequisite_closure.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
HANDOFF="$ROOT_DIR/scripts/verify_mobile_source_handoff.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile binding prerequisite closure file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile binding prerequisite closure text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile binding prerequisite closure text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$CLOSURE"
require_file "$FFI_README"
require_file "$HANDOFF"

node -e "const fs=require('fs'); JSON.parse(fs.readFileSync(process.argv[1],'utf8')); JSON.parse(fs.readFileSync(process.argv[2],'utf8'));" "$CONTRACT" "$CLOSURE"

require_text "$CONTRACT" '"binding_prerequisite_closure_verified": true'
require_text "$CONTRACT" '"binding_prerequisite_closure_file": "apps/mobile/ffi/binding_prerequisite_closure.json"'
require_text "$CONTRACT" '"owner_authorization_for_callable_ffi": false'
require_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": false'
require_text "$CLOSURE" '"binding_prerequisite_closure_verified": true'
require_text "$CLOSURE" '"owner_authorization_for_callable_ffi": false'
require_text "$CLOSURE" '"callable_ffi_may_start": false'
require_text "$CLOSURE" '"generated_binding_may_start": false'
require_text "$CLOSURE" '"native_runtime_messaging_may_start": false'
require_text "$CLOSURE" '"network_delivery_may_start": false'
require_text "$CLOSURE" '"release_packaging_may_start": false'

for prerequisite in \
  ffi_error_mapping_table_finalized \
  canonical_serialization_test_vectors_finalized \
  memory_ownership_release_contract_finalized \
  redacted_diagnostics_payload_reviewed \
  android_ios_adapter_parity_verified \
  source_handoff_verifier_passing; do
  require_text "$CLOSURE" "\"$prerequisite\""
  require_text "$CONTRACT" "$prerequisite"
done

require_text "$CLOSURE" '"remaining_blocker": "explicit_owner_authorization_for_native_binding"'
require_text "$CLOSURE" '"explicit_callable_ffi_implementation_request"'
require_text "$FFI_README" "Binding Prerequisite Closure Handoff"
require_text "$FFI_README" 'The closure file is `binding_prerequisite_closure.json`.'
require_text "$FFI_README" "Remaining blocker: explicit owner authorization for native binding."
require_text "$FFI_README" "explicit callable FFI implementation request"
require_text "$FFI_README" "remain blocked"
require_text "$HANDOFF" "status=mobile-source-handoff-verified"

for blocked in \
  generated_bindings \
  callable_ffi \
  native_runtime_messaging \
  native_network_delivery \
  background_delivery \
  push_notification_delivery \
  release_packaging \
  store_distribution \
  mobile_readiness_claim \
  security_ready_claim; do
  require_text "$CLOSURE" "\"$blocked\""
done

reject_text "$CONTRACT" '"owner_authorization_for_callable_ffi": true'
reject_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": true'
reject_text "$CLOSURE" '"owner_authorization_for_callable_ffi": true'
reject_text "$CLOSURE" '"callable_ffi_may_start": true'
reject_text "$CLOSURE" '"generated_binding_may_start": true'
reject_text "$CLOSURE" '"native_runtime_messaging_may_start": true'
reject_text "$CLOSURE" '"network_delivery_may_start": true'
reject_text "$CLOSURE" '"release_packaging_may_start": true'

printf 'status=mobile-binding-prerequisite-closure-verified\n'
printf 'binding_prerequisite_closure_verified=true\n'
printf 'owner_authorization_for_callable_ffi=false\n'
printf 'callable_ffi_may_start=false\n'
printf 'generated_binding_may_start=false\n'
printf 'remaining_blocker=explicit_owner_authorization_for_native_binding\n'
