#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
RUNBOOK="$ROOT_DIR/apps/mobile/ffi/owner_authorization_transition_runbook.json"
HOLD="$ROOT_DIR/apps/mobile/ffi/callable_ffi_authorization_hold.json"
MATRIX="$ROOT_DIR/apps/mobile/ffi/authorization_hold_regression_matrix.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
HANDOFF="$ROOT_DIR/scripts/verify_mobile_source_handoff.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile owner authorization transition file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile owner authorization transition text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile owner authorization transition text in $file: $text" >&2
    exit 1
  fi
}

for file in "$CONTRACT" "$RUNBOOK" "$HOLD" "$MATRIX" "$FFI_README" "$HANDOFF"; do
  require_file "$file"
done

node - "$CONTRACT" "$RUNBOOK" "$HOLD" "$MATRIX" <<'NODE'
const fs = require("fs");
const [contractPath, runbookPath, holdPath, matrixPath] = process.argv.slice(2);
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const runbook = JSON.parse(fs.readFileSync(runbookPath, "utf8"));
const hold = JSON.parse(fs.readFileSync(holdPath, "utf8"));
const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));

function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}

assert(contract.owner_authorization_transition_runbook_verified === true, "contract transition runbook flag is not true");
assert(contract.owner_authorization_transition_runbook_file === "apps/mobile/ffi/owner_authorization_transition_runbook.json", "contract transition runbook file mismatch");
assert(runbook.status === "source-boundary-owner-authorization-transition-runbook", "runbook status mismatch");
assert(runbook.current_state === "authorization_false_implementation_blocked", "runbook current state mismatch");
assert(runbook.implementation_remains_blocked === true, "runbook implementation is not blocked");

for (const object of [contract, runbook, hold, matrix]) {
  assert(object.owner_authorization_for_callable_ffi === false, "owner authorization is not false");
  assert(object.explicit_callable_ffi_implementation_request === false, "explicit implementation request is not false");
}

for (const flag of [
  "callable_ffi_may_start",
  "generated_binding_may_start",
  "native_runtime_messaging_may_start",
  "network_delivery_may_start",
  "release_packaging_may_start",
]) {
  assert(hold[flag] === false, `hold ${flag} is not false`);
}

for (const input of [
  "explicit_owner_authorization_for_native_binding",
  "explicit_callable_ffi_implementation_request",
  "named_first_callable_ffi_scope",
  "accepted_memory_release_contract",
  "accepted_serialization_vectors",
  "accepted_error_mapping_table",
  "accepted_diagnostics_redaction_boundary",
  "accepted_android_ios_adapter_parity",
  "accepted_authorization_hold_regression_matrix",
]) {
  assert(runbook.required_transition_inputs.includes(input), `missing transition input ${input}`);
}

for (const step of [
  "record_owner_authorization",
  "record_explicit_callable_ffi_implementation_request",
  "name_first_callable_ffi_scope",
  "update_authorization_hold_contract",
  "update_shared_core_mobile_api_contract",
  "update_regression_matrix_for_allowed_first_scope",
  "add_minimal_callable_ffi_verifier",
  "run_source_handoff_verifier_before_implementation",
]) {
  assert(runbook.transition_order.includes(step), `missing transition step ${step}`);
}

for (const check of [
  "owner_authorization_for_callable_ffi_can_return_false",
  "explicit_callable_ffi_implementation_request_can_return_false",
  "source_handoff_returns_to_blocked_state",
  "no_generated_artifacts_after_rollback",
  "no_release_packaging_after_rollback",
  "no_mobile_readiness_or_security_ready_claim_after_rollback",
]) {
  assert(runbook.rollback_checks.includes(check), `missing rollback check ${check}`);
}
NODE

require_text "$CONTRACT" '"owner_authorization_transition_runbook_verified": true'
require_text "$CONTRACT" '"owner_authorization_transition_runbook_file": "apps/mobile/ffi/owner_authorization_transition_runbook.json"'
require_text "$RUNBOOK" '"current_state": "authorization_false_implementation_blocked"'
require_text "$RUNBOOK" '"implementation_remains_blocked": true'
require_text "$RUNBOOK" '"owner_authorization_for_callable_ffi": false'
require_text "$RUNBOOK" '"explicit_callable_ffi_implementation_request": false'
require_text "$FFI_README" "Owner Authorization Transition Runbook"
require_text "$FFI_README" "owner_authorization_transition_runbook.json"
require_text "$FFI_README" "authorization false implementation"
require_text "$FFI_README" "explicit owner authorization for native binding"
require_text "$FFI_README" "explicit callable FFI implementation request"
require_text "$FFI_README" "named first callable FFI scope"
require_text "$FFI_README" "run source"
require_text "$FFI_README" "handoff verifier before implementation"
require_text "$FFI_README" "no generated artifacts after rollback"
require_text "$FFI_README" "no release"
require_text "$FFI_README" "packaging after rollback"
require_text "$HANDOFF" "scripts/verify_mobile_owner_authorization_transition.sh"

reject_text "$CONTRACT" '"owner_authorization_for_callable_ffi": true'
reject_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": true'
reject_text "$CONTRACT" '"callable_ffi_implemented": true'
reject_text "$CONTRACT" '"generated_bindings_claimed": true'
reject_text "$CONTRACT" '"mobile_readiness_claimed": true'
reject_text "$CONTRACT" '"security_ready_claimed": true'
reject_text "$RUNBOOK" '"implementation_remains_blocked": false'
reject_text "$RUNBOOK" '"owner_authorization_for_callable_ffi": true'
reject_text "$RUNBOOK" '"explicit_callable_ffi_implementation_request": true'

printf 'status=mobile-owner-authorization-transition-verified\n'
printf 'owner_authorization_transition_runbook_verified=true\n'
printf 'current_state=authorization_false_implementation_blocked\n'
printf 'owner_authorization_for_callable_ffi=false\n'
printf 'explicit_callable_ffi_implementation_request=false\n'
printf 'implementation_remains_blocked=true\n'
printf 'rollback_checks=present\n'
printf 'mobile_readiness_claim=false\n'
printf 'security_ready_claim=false\n'
