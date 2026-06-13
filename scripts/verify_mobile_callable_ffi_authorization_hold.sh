#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
HOLD="$ROOT_DIR/apps/mobile/ffi/callable_ffi_authorization_hold.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile callable FFI authorization hold file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile callable FFI authorization hold text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile callable FFI authorization hold text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$HOLD"
require_file "$FFI_README"

node - "$CONTRACT" "$HOLD" <<'NODE'
const fs = require("fs");
const [contractPath, holdPath] = process.argv.slice(2);
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const hold = JSON.parse(fs.readFileSync(holdPath, "utf8"));

function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}

const falseFlags = [
  "owner_authorization_for_callable_ffi",
  "explicit_callable_ffi_implementation_request",
  "callable_ffi_may_start",
  "generated_binding_may_start",
  "native_runtime_messaging_may_start",
  "network_delivery_may_start",
  "release_packaging_may_start",
];

assert(contract.callable_ffi_authorization_hold_active === true, "contract authorization hold is not active");
assert(contract.callable_ffi_authorization_hold_file === "apps/mobile/ffi/callable_ffi_authorization_hold.json", "contract hold file mismatch");
assert(hold.callable_ffi_authorization_hold_active === true, "hold authorization hold is not active");

for (const flag of falseFlags) {
  assert(contract[flag] === false || contract.native_binding_readiness_gate?.[flag] === false, `contract ${flag} is not false`);
  assert(hold[flag] === false, `hold ${flag} is not false`);
}

const requiredBlocked = [
  "udl_file_creation",
  "uniffi_scaffolding",
  "extern_c_symbols",
  "jni_bridge",
  "swift_ffi_bridge",
  "kotlin_native_binding",
  "callable_shared_core_status_ffi",
  "callable_profile_unlock_ffi",
  "callable_invite_ffi",
  "callable_pairing_ffi",
  "callable_envelope_ffi",
  "callable_transcript_ffi",
  "callable_lifecycle_ffi",
  "native_runtime_messaging",
  "native_network_delivery",
  "release_packaging",
];

for (const blocked of requiredBlocked) {
  assert(contract.callable_ffi_authorization_hold_blocks?.includes(blocked), `contract missing blocked item ${blocked}`);
  assert(hold.blocked_without_authorization?.includes(blocked), `hold missing blocked item ${blocked}`);
}

for (const allowed of [
  "source_boundary_docs",
  "static_verifiers",
  "read_only_status_adapter_source",
  "blocked_command_adapter_source",
  "operator_handoff_docs",
]) {
  assert(hold.allowed_while_hold_active?.includes(allowed), `hold missing allowed item ${allowed}`);
}
NODE

require_text "$CONTRACT" '"callable_ffi_authorization_hold_active": true'
require_text "$CONTRACT" '"callable_ffi_authorization_hold_file": "apps/mobile/ffi/callable_ffi_authorization_hold.json"'
require_text "$CONTRACT" '"owner_authorization_for_callable_ffi": false'
require_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": false'
require_text "$HOLD" '"callable_ffi_authorization_hold_active": true'
require_text "$HOLD" '"owner_authorization_for_callable_ffi": false'
require_text "$HOLD" '"explicit_callable_ffi_implementation_request": false'
require_text "$HOLD" '"callable_ffi_may_start": false'
require_text "$HOLD" '"generated_binding_may_start": false'
require_text "$HOLD" '"native_runtime_messaging_may_start": false'
require_text "$HOLD" '"network_delivery_may_start": false'
require_text "$HOLD" '"release_packaging_may_start": false'
require_text "$FFI_README" "Callable FFI Authorization Hold"
require_text "$FFI_README" "The callable FFI authorization hold is active"
require_text "$FFI_README" "explicit owner authorization for native binding"
require_text "$FFI_README" "explicit callable FFI implementation request"
require_text "$FFI_README" "callable FFI may start false"
require_text "$FFI_README" "generated binding may start false"
require_text "$FFI_README" "native runtime messaging may start false"
require_text "$FFI_README" "network delivery may start false"
require_text "$FFI_README" "release packaging may start false"
require_text "$FFI_README" "mobile readiness claimed false"
require_text "$FFI_README" "security-ready claimed false"

for blocked_text in \
  ".udl" \
  "UniFFI scaffolding" \
  "extern C symbols" \
  "JNI bridge" \
  "Swift FFI bridge" \
  "Kotlin native binding" \
  "callable shared-core status FFI" \
  "callable profile unlock FFI" \
  "callable invite FFI" \
  "callable pairing FFI" \
  "callable envelope FFI" \
  "callable transcript FFI" \
  "callable lifecycle FFI" \
  "native runtime messaging" \
  "native network delivery" \
  "release packaging"; do
  require_text "$FFI_README" "$blocked_text"
done

reject_text "$CONTRACT" '"owner_authorization_for_callable_ffi": true'
reject_text "$CONTRACT" '"explicit_callable_ffi_implementation_request": true'
reject_text "$CONTRACT" '"callable_ffi_may_start": true'
reject_text "$CONTRACT" '"generated_binding_may_start": true'
reject_text "$CONTRACT" '"native_runtime_messaging_may_start": true'
reject_text "$CONTRACT" '"network_delivery_may_start": true'
reject_text "$CONTRACT" '"release_packaging_may_start": true'
reject_text "$HOLD" '"owner_authorization_for_callable_ffi": true'
reject_text "$HOLD" '"explicit_callable_ffi_implementation_request": true'
reject_text "$HOLD" '"callable_ffi_may_start": true'
reject_text "$HOLD" '"generated_binding_may_start": true'

if find "$ROOT_DIR/apps/mobile/ffi" -type f \( -name '*.udl' -o -name '*.uniffi' \) | grep -q .; then
  echo "forbidden callable FFI generated source file under apps/mobile/ffi" >&2
  exit 1
fi

if find "$ROOT_DIR/apps/mobile/ffi" -type d \( -iname '*generated*' -o -iname '*binding*' -o -iname '*bindings*' \) | grep -q .; then
  echo "forbidden callable FFI generated/binding directory under apps/mobile/ffi" >&2
  exit 1
fi

if grep -RInE 'external fun|System\.loadLibrary|JNIEnv|@CName|UniFFI|uniffi|extern "C"|dlopen|NativeLibrary|ctypes' \
  "$ROOT_DIR/apps/mobile/android" "$ROOT_DIR/apps/mobile/ios" >/dev/null; then
  echo "forbidden callable FFI/native bridge source in mobile scaffold" >&2
  exit 1
fi

printf 'status=mobile-callable-ffi-authorization-hold-verified\n'
printf 'callable_ffi_authorization_hold_active=true\n'
printf 'owner_authorization_for_callable_ffi=false\n'
printf 'explicit_callable_ffi_implementation_request=false\n'
printf 'callable_ffi_may_start=false\n'
printf 'generated_binding_may_start=false\n'
