#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
CLEANUP="$ROOT_DIR/apps/mobile/ffi/source_boundary_cleanup.json"
CLOSURE="$ROOT_DIR/apps/mobile/ffi/binding_prerequisite_closure.json"
HOLD="$ROOT_DIR/apps/mobile/ffi/callable_ffi_authorization_hold.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
READINESS_VERIFIER="$ROOT_DIR/scripts/verify_mobile_binding_readiness_gate.sh"
HOLD_VERIFIER="$ROOT_DIR/scripts/verify_mobile_callable_ffi_authorization_hold.sh"
HANDOFF="$ROOT_DIR/scripts/verify_mobile_source_handoff.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile source boundary cleanup file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile source boundary cleanup text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile source boundary cleanup text in $file: $text" >&2
    exit 1
  fi
}

for file in "$CONTRACT" "$CLEANUP" "$CLOSURE" "$HOLD" "$FFI_README" "$READINESS_VERIFIER" "$HOLD_VERIFIER" "$HANDOFF"; do
  require_file "$file"
done

node - "$CONTRACT" "$CLEANUP" "$CLOSURE" "$HOLD" <<'NODE'
const fs = require("fs");
const [contractPath, cleanupPath, closurePath, holdPath] = process.argv.slice(2);
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const cleanup = JSON.parse(fs.readFileSync(cleanupPath, "utf8"));
const closure = JSON.parse(fs.readFileSync(closurePath, "utf8"));
const hold = JSON.parse(fs.readFileSync(holdPath, "utf8"));

function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}

assert(contract.source_boundary_cleanup_verified === true, "contract cleanup verifier flag is not true");
assert(contract.source_boundary_cleanup_file === "apps/mobile/ffi/source_boundary_cleanup.json", "contract cleanup file mismatch");
assert(cleanup.status === "source-boundary-cleanup", "cleanup status mismatch");

const falseExpectations = {
  binding_generation_implemented: contract.binding_generation_implemented,
  callable_ffi_implemented: contract.callable_ffi_implemented,
  generated_bindings_claimed: contract.generated_bindings_claimed,
  owner_authorization_for_callable_ffi: contract.owner_authorization_for_callable_ffi,
  explicit_callable_ffi_implementation_request: contract.explicit_callable_ffi_implementation_request,
  callable_ffi_may_start: contract.native_binding_readiness_gate.callable_ffi_may_start,
  generated_binding_may_start: contract.native_binding_readiness_gate.generated_binding_may_start,
  native_runtime_messaging_may_start: contract.native_binding_readiness_gate.native_runtime_messaging_may_start,
  network_delivery_may_start: contract.native_binding_readiness_gate.network_delivery_may_start,
  release_packaging_may_start: contract.native_binding_readiness_gate.release_packaging_may_start,
  mobile_readiness_claimed: contract.mobile_readiness_claimed,
  security_ready_claimed: contract.security_ready_claimed,
};

for (const flag of cleanup.canonical_false_flags) {
  assert(falseExpectations[flag] === false, `${flag} is not false in shared contract`);
}

for (const flag of [
  "owner_authorization_for_callable_ffi",
  "callable_ffi_may_start",
  "generated_binding_may_start",
  "native_runtime_messaging_may_start",
  "network_delivery_may_start",
  "release_packaging_may_start",
]) {
  assert(closure[flag] === false, `${flag} is not false in closure`);
}

for (const flag of [
  "owner_authorization_for_callable_ffi",
  "explicit_callable_ffi_implementation_request",
  "callable_ffi_may_start",
  "generated_binding_may_start",
  "native_runtime_messaging_may_start",
  "network_delivery_may_start",
  "release_packaging_may_start",
]) {
  assert(hold[flag] === false, `${flag} is not false in authorization hold`);
}

for (const blocked of cleanup.canonical_blocked_surfaces) {
  assert(closure.blocked_without_owner_authorization.includes(blocked), `closure missing blocked surface ${blocked}`);
}

for (const allowed of cleanup.canonical_allowed_surfaces) {
  assert(hold.allowed_while_hold_active.includes(allowed), `authorization hold missing allowed surface ${allowed}`);
}
NODE

require_text "$CONTRACT" '"source_boundary_cleanup_verified": true'
require_text "$CONTRACT" '"source_boundary_cleanup_file": "apps/mobile/ffi/source_boundary_cleanup.json"'
require_text "$FFI_README" "Source Boundary Cleanup Summary"
require_text "$FFI_README" "source_boundary_cleanup.json"
require_text "$FFI_README" "Canonical false state"
require_text "$FFI_README" "Canonical blocked state"
require_text "$FFI_README" "Canonical allowed state while blocked"
require_text "$FFI_README" "callable FFI authorization hold, source"
require_text "$FFI_README" "boundary cleanup, and authorization hold regression matrix verifiers"

for text in \
  "binding generation implemented false" \
  "callable FFI implemented false" \
  "generated bindings claimed false" \
  "owner authorization for callable FFI false" \
  "explicit callable FFI implementation request false" \
  "callable FFI may start false" \
  "generated binding may start false" \
  "native runtime messaging may start false" \
  "network delivery may start false" \
  "release packaging may start false" \
  "mobile readiness claimed false" \
  "security-ready claimed false"; do
  require_text "$FFI_README" "$text"
done

for text in \
  "generated bindings" \
  "callable FFI" \
  "native runtime messaging" \
  "native network delivery" \
  "background delivery" \
  "push notification delivery" \
  "release packaging" \
  "store distribution" \
  "mobile readiness claim" \
  "security-ready claim"; do
  require_text "$FFI_README" "$text"
done

for output in \
  "callable_ffi_may_start=false" \
  "generated_binding_may_start=false" \
  "native_runtime_messaging_may_start=false" \
  "network_delivery_may_start=false" \
  "release_packaging_may_start=false" \
  "mobile_readiness_claim=false"; do
  require_text "$READINESS_VERIFIER" "$output"
done

for output in \
  "callable_ffi_authorization_hold_active=true" \
  "owner_authorization_for_callable_ffi=false" \
  "explicit_callable_ffi_implementation_request=false" \
  "callable_ffi_may_start=false" \
  "generated_binding_may_start=false"; do
  require_text "$HOLD_VERIFIER" "$output"
done

require_text "$HANDOFF" "scripts/verify_mobile_callable_ffi_authorization_hold.sh"
require_text "$HANDOFF" "scripts/verify_mobile_source_boundary_cleanup.sh"
require_text "$HANDOFF" "generated_bindings=false"
require_text "$HANDOFF" "runtime_messaging=false"
require_text "$HANDOFF" "mobile_readiness_claim=false"
require_text "$HANDOFF" "security_ready_claim=false"

reject_text "$CONTRACT" '"binding_generation_implemented": true'
reject_text "$CONTRACT" '"callable_ffi_implemented": true'
reject_text "$CONTRACT" '"generated_bindings_claimed": true'
reject_text "$CONTRACT" '"owner_authorization_for_callable_ffi": true'
reject_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": true'
reject_text "$CONTRACT" '"mobile_readiness_claimed": true'
reject_text "$CONTRACT" '"security_ready_claimed": true'

printf 'status=mobile-source-boundary-cleanup-verified\n'
printf 'source_boundary_cleanup_verified=true\n'
printf 'canonical_false_state=aligned\n'
printf 'canonical_blocked_state=aligned\n'
printf 'canonical_allowed_state=aligned\n'
printf 'mobile_readiness_claim=false\n'
printf 'security_ready_claim=false\n'
