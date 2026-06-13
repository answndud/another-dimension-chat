#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
HANDOFF="$ROOT_DIR/scripts/verify_mobile_source_handoff.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile binding readiness gate file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile binding readiness gate text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile binding readiness gate text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$FFI_README"
require_file "$HANDOFF"

require_text "$CONTRACT" '"native_binding_readiness_gate"'
require_text "$CONTRACT" '"status": "blocked-until-prerequisites-met"'
require_text "$CONTRACT" '"readiness_gate_documented": true'
require_text "$CONTRACT" '"callable_ffi_may_start": false'
require_text "$CONTRACT" '"generated_binding_may_start": false'
require_text "$CONTRACT" '"native_runtime_messaging_may_start": false'
require_text "$CONTRACT" '"network_delivery_may_start": false'
require_text "$CONTRACT" '"release_packaging_may_start": false'
require_text "$CONTRACT" '"explicit_owner_authorization_for_native_binding"'
require_text "$CONTRACT" '"memory_ownership_release_contract_finalized"'
require_text "$CONTRACT" '"memory_ownership_release_contract_finalized": true'
require_text "$CONTRACT" '"canonical_serialization_test_vectors_finalized"'
require_text "$CONTRACT" '"canonical_serialization_test_vectors_finalized": true'
require_text "$CONTRACT" '"ffi_error_mapping_table_finalized"'
require_text "$CONTRACT" '"ffi_error_mapping_table_finalized": true'
require_text "$CONTRACT" '"redacted_diagnostics_payload_reviewed"'
require_text "$CONTRACT" '"redacted_diagnostics_payload_reviewed": true'
require_text "$CONTRACT" '"android_ios_adapter_parity_verified"'
require_text "$CONTRACT" '"android_ios_adapter_parity_verified": true'
require_text "$CONTRACT" '"source_handoff_verifier_passing"'
require_text "$CONTRACT" '"binding_prerequisite_closure_verified": true'
require_text "$CONTRACT" '"callable_ffi_authorization_hold_active": true'
require_text "$CONTRACT" '"callable_ffi_authorization_hold_file": "apps/mobile/ffi/callable_ffi_authorization_hold.json"'
require_text "$CONTRACT" '"source_boundary_cleanup_verified": true'
require_text "$CONTRACT" '"source_boundary_cleanup_file": "apps/mobile/ffi/source_boundary_cleanup.json"'
require_text "$CONTRACT" '"authorization_hold_regression_matrix_verified": true'
require_text "$CONTRACT" '"authorization_hold_regression_matrix_file": "apps/mobile/ffi/authorization_hold_regression_matrix.json"'
require_text "$CONTRACT" '"owner_authorization_transition_runbook_verified": true'
require_text "$CONTRACT" '"owner_authorization_transition_runbook_file": "apps/mobile/ffi/owner_authorization_transition_runbook.json"'
require_text "$CONTRACT" '"pre_implementation_handoff_packet_verified": true'
require_text "$CONTRACT" '"pre_implementation_handoff_packet_file": "apps/mobile/ffi/pre_implementation_handoff_packet.json"'
require_text "$CONTRACT" '"authorization_boundary_closure_verified": true'
require_text "$CONTRACT" '"authorization_boundary_closure_file": "apps/mobile/ffi/authorization_boundary_closure.json"'
require_text "$CONTRACT" '"owner_authorization_for_callable_ffi": false'
require_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": false'

for blocked in \
  unlock_callable_ffi \
  invite_callable_ffi \
  pairing_callable_ffi \
  envelope_callable_ffi \
  transcript_callable_ffi \
  lifecycle_callable_ffi \
  native_network_runtime \
  background_delivery \
  push_notification_delivery \
  release_packaging; do
  require_text "$CONTRACT" "\"$blocked\""
done

for blocked_text in \
  "unlock callable FFI" \
  "invite callable FFI" \
  "pairing callable FFI" \
  "envelope callable FFI" \
  "transcript callable FFI" \
  "lifecycle callable FFI" \
  "native network runtime" \
  "background delivery" \
  "push notification delivery" \
  "release packaging"; do
  require_text "$FFI_README" "$blocked_text"
done

require_text "$FFI_README" "Native Binding Readiness Gate"
require_text "$FFI_README" "Native binding implementation remains blocked"
require_text "$FFI_README" "Callable FFI may not start until all of these are true"
require_text "$FFI_README" "explicit owner authorization for native binding"
require_text "$FFI_README" "memory ownership and release contract finalized"
require_text "$FFI_README" "canonical serialization test vectors finalized"
require_text "$FFI_README" "FFI error mapping table finalized"
require_text "$FFI_README" "redacted diagnostics payload reviewed"
require_text "$FFI_README" "Android/iOS adapter parity verified"
require_text "$FFI_README" "scripts/verify_mobile_source_handoff.sh"
require_text "$FFI_README" "callable FFI implemented false"
require_text "$FFI_README" "generated binding may start false"
require_text "$FFI_README" "native runtime messaging may start false"
require_text "$FFI_README" "network delivery may start false"
require_text "$FFI_README" "release packaging may start false"
require_text "$FFI_README" "mobile readiness claimed false"
require_text "$FFI_README" "security-ready claimed false"
require_text "$FFI_README" "Binding Prerequisite Closure Handoff"
require_text "$FFI_README" "Callable FFI Authorization Hold"
require_text "$FFI_README" "The callable FFI authorization hold is active"
require_text "$FFI_README" "Source Boundary Cleanup Summary"
require_text "$FFI_README" "Authorization Hold Regression Matrix"
require_text "$FFI_README" "Owner Authorization Transition Runbook"
require_text "$FFI_README" "Pre-Implementation Handoff Packet"
require_text "$FFI_README" "Authorization Boundary Closure"

require_text "$HANDOFF" "status=mobile-source-handoff-verified"
require_text "$HANDOFF" "generated_bindings=false"
require_text "$HANDOFF" "runtime_messaging=false"

reject_text "$CONTRACT" '"callable_ffi_may_start": true'
reject_text "$CONTRACT" '"generated_binding_may_start": true'
reject_text "$CONTRACT" '"native_runtime_messaging_may_start": true'
reject_text "$CONTRACT" '"network_delivery_may_start": true'
reject_text "$CONTRACT" '"release_packaging_may_start": true'

printf 'status=mobile-binding-readiness-gate-verified\n'
printf 'callable_ffi_may_start=false\n'
printf 'generated_binding_may_start=false\n'
printf 'native_runtime_messaging_may_start=false\n'
printf 'network_delivery_may_start=false\n'
printf 'release_packaging_may_start=false\n'
printf 'mobile_readiness_claim=false\n'
