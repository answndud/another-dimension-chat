#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
CLOSURE="$ROOT_DIR/apps/mobile/ffi/authorization_boundary_closure.json"
PREREQ="$ROOT_DIR/apps/mobile/ffi/binding_prerequisite_closure.json"
HOLD="$ROOT_DIR/apps/mobile/ffi/callable_ffi_authorization_hold.json"
CLEANUP="$ROOT_DIR/apps/mobile/ffi/source_boundary_cleanup.json"
MATRIX="$ROOT_DIR/apps/mobile/ffi/authorization_hold_regression_matrix.json"
RUNBOOK="$ROOT_DIR/apps/mobile/ffi/owner_authorization_transition_runbook.json"
PACKET="$ROOT_DIR/apps/mobile/ffi/pre_implementation_handoff_packet.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
HANDOFF="$ROOT_DIR/scripts/verify_mobile_source_handoff.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile authorization boundary closure file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile authorization boundary closure text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile authorization boundary closure text in $file: $text" >&2
    exit 1
  fi
}

for file in "$CONTRACT" "$CLOSURE" "$PREREQ" "$HOLD" "$CLEANUP" "$MATRIX" "$RUNBOOK" "$PACKET" "$FFI_README" "$HANDOFF"; do
  require_file "$file"
done

node - "$CONTRACT" "$CLOSURE" "$PREREQ" "$HOLD" "$CLEANUP" "$MATRIX" "$RUNBOOK" "$PACKET" <<'NODE'
const fs = require("fs");
const [
  contractPath,
  closurePath,
  prereqPath,
  holdPath,
  cleanupPath,
  matrixPath,
  runbookPath,
  packetPath,
] = process.argv.slice(2);

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const closure = JSON.parse(fs.readFileSync(closurePath, "utf8"));
const prereq = JSON.parse(fs.readFileSync(prereqPath, "utf8"));
const hold = JSON.parse(fs.readFileSync(holdPath, "utf8"));
const cleanup = JSON.parse(fs.readFileSync(cleanupPath, "utf8"));
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
const runbook = JSON.parse(fs.readFileSync(runbookPath, "utf8"));
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}

assert(contract.authorization_boundary_closure_verified === true, "contract closure flag is not true");
assert(contract.authorization_boundary_closure_file === "apps/mobile/ffi/authorization_boundary_closure.json", "contract closure file mismatch");
assert(closure.status === "source-boundary-mobile-authorization-boundary-closure", "closure status mismatch");
assert(closure.authorization_boundary_closure_verified === true, "closure verified flag is not true");
assert(closure.current_state === "authorization_false_implementation_blocked", "closure current state mismatch");
assert(closure.implementation_remains_blocked === true, "closure implementation is not blocked");

for (const object of [contract, closure, hold, matrix, runbook, packet]) {
  assert(object.owner_authorization_for_callable_ffi === false, "owner authorization is not false");
  assert(object.explicit_callable_ffi_implementation_request === false, "explicit implementation request is not false");
}

assert(prereq.binding_prerequisite_closure_verified === true, "prerequisite closure is not verified");
assert(hold.callable_ffi_authorization_hold_active === true, "authorization hold is not active");
assert(cleanup.status === "source-boundary-cleanup", "source boundary cleanup status mismatch");
assert(matrix.authorization_hold_regression_matrix_verified === true, "regression matrix is not verified");
assert(runbook.owner_authorization_transition_runbook_verified === true, "transition runbook is not verified");
assert(packet.pre_implementation_handoff_packet_verified === true, "pre-implementation handoff packet is not verified");

for (const file of [
  "apps/mobile/ffi/binding_prerequisite_closure.json",
  "apps/mobile/ffi/callable_ffi_authorization_hold.json",
  "apps/mobile/ffi/source_boundary_cleanup.json",
  "apps/mobile/ffi/authorization_hold_regression_matrix.json",
  "apps/mobile/ffi/owner_authorization_transition_runbook.json",
  "apps/mobile/ffi/pre_implementation_handoff_packet.json",
]) {
  assert(closure.verified_boundary_files.includes(file), `closure missing boundary file ${file}`);
}

for (const output of [
  "status=mobile-binding-prerequisite-closure-verified",
  "status=mobile-callable-ffi-authorization-hold-verified",
  "status=mobile-source-boundary-cleanup-verified",
  "status=mobile-authorization-hold-regression-matrix-verified",
  "status=mobile-owner-authorization-transition-verified",
  "status=mobile-pre-implementation-handoff-verified",
  "status=mobile-source-handoff-verified",
]) {
  assert(closure.verified_boundary_outputs.includes(output), `closure missing verifier output ${output}`);
}

for (const output of [
  "source_boundary_only=true",
  "release_packaging=false",
  "generated_bindings=false",
  "runtime_messaging=false",
  "mobile_readiness_claim=false",
  "security_ready_claim=false",
]) {
  assert(closure.source_handoff_blocked_outputs.includes(output), `closure missing blocked source handoff output ${output}`);
}
NODE

require_text "$CONTRACT" '"authorization_boundary_closure_verified": true'
require_text "$CONTRACT" '"authorization_boundary_closure_file": "apps/mobile/ffi/authorization_boundary_closure.json"'
require_text "$CLOSURE" '"current_state": "authorization_false_implementation_blocked"'
require_text "$CLOSURE" '"implementation_remains_blocked": true'
require_text "$CLOSURE" '"owner_authorization_for_callable_ffi": false'
require_text "$CLOSURE" '"explicit_callable_ffi_implementation_request": false'
require_text "$FFI_README" "Authorization Boundary Closure"
require_text "$FFI_README" "authorization_boundary_closure.json"
require_text "$FFI_README" "authorization false implementation blocked"
require_text "$FFI_README" "status=mobile-pre-implementation-handoff-verified"
require_text "$FFI_README" "status=mobile-source-handoff-verified"
require_text "$FFI_README" "generated bindings false"
require_text "$FFI_README" "runtime messaging false"
require_text "$FFI_README" "mobile readiness"
require_text "$FFI_README" "security-ready claim false"
require_text "$HANDOFF" "scripts/verify_mobile_authorization_boundary_closure.sh"
require_text "$HANDOFF" "source_boundary_only=true"
require_text "$HANDOFF" "release_packaging=false"
require_text "$HANDOFF" "generated_bindings=false"
require_text "$HANDOFF" "runtime_messaging=false"
require_text "$HANDOFF" "mobile_readiness_claim=false"
require_text "$HANDOFF" "security_ready_claim=false"

for blocked in \
  generated_bindings \
  callable_ffi \
  native_runtime_messaging \
  native_network_delivery \
  release_packaging \
  store_distribution \
  mobile_readiness_claim \
  security_ready_claim; do
  require_text "$CLOSURE" "\"$blocked\""
done

reject_text "$CONTRACT" '"owner_authorization_for_callable_ffi": true'
reject_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": true'
reject_text "$CONTRACT" '"callable_ffi_implemented": true'
reject_text "$CONTRACT" '"generated_bindings_claimed": true'
reject_text "$CONTRACT" '"mobile_readiness_claimed": true'
reject_text "$CONTRACT" '"security_ready_claimed": true'
reject_text "$CLOSURE" '"implementation_remains_blocked": false'
reject_text "$CLOSURE" '"owner_authorization_for_callable_ffi": true'
reject_text "$CLOSURE" '"explicit_callable_ffi_implementation_request": true'

printf 'status=mobile-authorization-boundary-closure-verified\n'
printf 'authorization_boundary_closure_verified=true\n'
printf 'current_state=authorization_false_implementation_blocked\n'
printf 'implementation_remains_blocked=true\n'
printf 'verified_boundary_files=complete\n'
printf 'source_handoff_blocked_outputs=complete\n'
printf 'mobile_readiness_claim=false\n'
printf 'security_ready_claim=false\n'
