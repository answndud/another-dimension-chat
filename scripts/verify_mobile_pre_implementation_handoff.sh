#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
PACKET="$ROOT_DIR/apps/mobile/ffi/pre_implementation_handoff_packet.json"
CLOSURE="$ROOT_DIR/apps/mobile/ffi/binding_prerequisite_closure.json"
HOLD="$ROOT_DIR/apps/mobile/ffi/callable_ffi_authorization_hold.json"
CLEANUP="$ROOT_DIR/apps/mobile/ffi/source_boundary_cleanup.json"
MATRIX="$ROOT_DIR/apps/mobile/ffi/authorization_hold_regression_matrix.json"
RUNBOOK="$ROOT_DIR/apps/mobile/ffi/owner_authorization_transition_runbook.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
HANDOFF="$ROOT_DIR/scripts/verify_mobile_source_handoff.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile pre-implementation handoff file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile pre-implementation handoff text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile pre-implementation handoff text in $file: $text" >&2
    exit 1
  fi
}

for file in "$CONTRACT" "$PACKET" "$CLOSURE" "$HOLD" "$CLEANUP" "$MATRIX" "$RUNBOOK" "$FFI_README" "$HANDOFF"; do
  require_file "$file"
done

node - "$CONTRACT" "$PACKET" "$CLOSURE" "$HOLD" "$CLEANUP" "$MATRIX" "$RUNBOOK" <<'NODE'
const fs = require("fs");
const [contractPath, packetPath, closurePath, holdPath, cleanupPath, matrixPath, runbookPath] = process.argv.slice(2);
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
const closure = JSON.parse(fs.readFileSync(closurePath, "utf8"));
const hold = JSON.parse(fs.readFileSync(holdPath, "utf8"));
const cleanup = JSON.parse(fs.readFileSync(cleanupPath, "utf8"));
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
const runbook = JSON.parse(fs.readFileSync(runbookPath, "utf8"));

function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}

assert(contract.pre_implementation_handoff_packet_verified === true, "contract handoff packet flag is not true");
assert(contract.pre_implementation_handoff_packet_file === "apps/mobile/ffi/pre_implementation_handoff_packet.json", "contract handoff packet file mismatch");
assert(packet.status === "source-boundary-pre-implementation-handoff-packet", "packet status mismatch");
assert(packet.current_state === "authorization_false_implementation_blocked", "packet current state mismatch");
assert(packet.implementation_remains_blocked === true, "packet implementation is not blocked");

for (const object of [contract, packet, hold, matrix, runbook]) {
  assert(object.owner_authorization_for_callable_ffi === false, "owner authorization is not false");
  assert(object.explicit_callable_ffi_implementation_request === false, "explicit implementation request is not false");
}

assert(closure.binding_prerequisite_closure_verified === true, "closure is not verified");
assert(hold.callable_ffi_authorization_hold_active === true, "authorization hold is not active");
assert(cleanup.source_boundary_cleanup_verified !== false, "cleanup unexpectedly false");
assert(matrix.authorization_hold_regression_matrix_verified === true, "regression matrix is not verified");
assert(runbook.owner_authorization_transition_runbook_verified === true, "transition runbook is not verified");

for (const ref of [
  "apps/mobile/ffi/binding_prerequisite_closure.json",
  "apps/mobile/ffi/callable_ffi_authorization_hold.json",
  "apps/mobile/ffi/source_boundary_cleanup.json",
  "apps/mobile/ffi/authorization_hold_regression_matrix.json",
  "apps/mobile/ffi/owner_authorization_transition_runbook.json",
  "scripts/verify_mobile_source_handoff.sh",
]) {
  assert(packet.packet_references.includes(ref), `packet missing reference ${ref}`);
}

for (const output of [
  "status=mobile-binding-prerequisite-closure-verified",
  "status=mobile-callable-ffi-authorization-hold-verified",
  "status=mobile-source-boundary-cleanup-verified",
  "status=mobile-authorization-hold-regression-matrix-verified",
  "status=mobile-owner-authorization-transition-verified",
  "status=mobile-source-handoff-verified",
]) {
  assert(packet.required_verifier_outputs.includes(output), `packet missing verifier output ${output}`);
}

for (const blocked of [
  "callable_ffi_may_start=false",
  "generated_binding_may_start=false",
  "native_runtime_messaging_may_start=false",
  "network_delivery_may_start=false",
  "release_packaging_may_start=false",
  "mobile_readiness_claim=false",
  "security_ready_claim=false",
]) {
  assert(packet.blocked_state_summary.includes(blocked), `packet missing blocked state ${blocked}`);
}
NODE

require_text "$CONTRACT" '"pre_implementation_handoff_packet_verified": true'
require_text "$CONTRACT" '"pre_implementation_handoff_packet_file": "apps/mobile/ffi/pre_implementation_handoff_packet.json"'
require_text "$PACKET" '"current_state": "authorization_false_implementation_blocked"'
require_text "$PACKET" '"implementation_remains_blocked": true'
require_text "$PACKET" '"owner_authorization_for_callable_ffi": false'
require_text "$PACKET" '"explicit_callable_ffi_implementation_request": false'
require_text "$FFI_README" "Pre-Implementation Handoff Packet"
require_text "$FFI_README" "pre_implementation_handoff_packet.json"
require_text "$FFI_README" "authorization false implementation blocked"
require_text "$FFI_README" "binding prerequisite closure"
require_text "$FFI_README" "callable FFI authorization"
require_text "$FFI_README" "authorization hold regression matrix"
require_text "$FFI_README" "owner authorization transition runbook"
require_text "$FFI_README" "status=mobile-source-handoff-verified"
require_text "$HANDOFF" "scripts/verify_mobile_pre_implementation_handoff.sh"

for instruction in \
  "do_not_create_generated_bindings" \
  "do_not_create_callable_ffi" \
  "do_not_create_native_runtime_messaging" \
  "do_not_create_native_network_delivery" \
  "do_not_create_release_packaging" \
  "do_not_claim_mobile_readiness" \
  "do_not_claim_security_ready" \
  "run_scripts_verify_mobile_source_handoff_before_any_transition"; do
  require_text "$PACKET" "\"$instruction\""
done

reject_text "$CONTRACT" '"owner_authorization_for_callable_ffi": true'
reject_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": true'
reject_text "$CONTRACT" '"callable_ffi_implemented": true'
reject_text "$CONTRACT" '"generated_bindings_claimed": true'
reject_text "$CONTRACT" '"mobile_readiness_claimed": true'
reject_text "$CONTRACT" '"security_ready_claimed": true'
reject_text "$PACKET" '"implementation_remains_blocked": false'
reject_text "$PACKET" '"owner_authorization_for_callable_ffi": true'
reject_text "$PACKET" '"explicit_callable_ffi_implementation_request": true'

printf 'status=mobile-pre-implementation-handoff-verified\n'
printf 'pre_implementation_handoff_packet_verified=true\n'
printf 'current_state=authorization_false_implementation_blocked\n'
printf 'implementation_remains_blocked=true\n'
printf 'packet_references=complete\n'
printf 'required_verifier_outputs=complete\n'
printf 'mobile_readiness_claim=false\n'
printf 'security_ready_claim=false\n'
