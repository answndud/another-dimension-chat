#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden mobile runtime unlock pattern: $pattern"
  fi
}

UNLOCK="apps/mobile/ffi/runtime_scope_unlock.json"
REFERENCE="reference/MOBILE_RUNTIME_SCOPE_UNLOCK.md"
CRATE="crates/mobile/src/lib.rs"
ANDROID_ADAPTER="apps/mobile/android/app/src/main/java/chat/anotherdimension/android/JsonBridgeSharedCoreAdapter.kt"
IOS_ADAPTER="apps/mobile/ios/AnotherDimension/JsonBridgeSharedCoreAdapter.swift"
FORBIDDEN_SCAN="scripts/verify_mobile_forbidden_dependency_scan_once.sh"

for file in "$UNLOCK" "$REFERENCE" "$CRATE" "$ANDROID_ADAPTER" "$IOS_ADAPTER" "$FORBIDDEN_SCAN"; do
  [ -f "$file" ] || fail "missing mobile runtime scope unlock input: $file"
done

node - "$UNLOCK" <<'NODE'
const fs = require("fs");
const unlock = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}
assert(unlock.status === "mobile-runtime-scope-unlocked-source-candidate", "invalid status");
assert(unlock.owner_authorization_for_callable_mobile_binding === true, "owner authorization not recorded");
assert(unlock.explicit_callable_mobile_binding_request === true, "callable binding request not recorded");
assert(unlock.binding_strategy === "shared_core_json_bridge", "wrong binding strategy");
assert(unlock.callable_json_bridge_implemented === true, "JSON bridge not implemented");
assert(unlock.callable_ffi_implemented === false, "callable FFI must remain false");
assert(unlock.generated_bindings_claimed === false, "generated binding claim must stay false");
assert(unlock.wrapper_specific_protocol_storage_transport_allowed === false, "wrapper semantics must stay false");
assert(unlock.native_runtime_messaging_may_start === false, "runtime messaging must stay false");
assert(unlock.network_delivery_may_start === false, "network delivery must stay false");
assert(unlock.release_packaging_may_start === false, "release packaging must stay false");
assert(unlock.android_public_artifact_ready === false, "Android artifact readiness must stay false");
assert(unlock.ios_public_artifact_ready === false, "iOS artifact readiness must stay false");
assert(unlock.mobile_readiness_claimed === false, "mobile readiness claim must stay false");
for (const scope of ["shared_core_status_surface", "redacted_support_diagnostics"]) {
  assert(unlock.first_callable_scope.includes(scope), `missing first callable scope ${scope}`);
}
NODE

for flag in \
  "mobile_runtime_scope_unlock_recorded=true" \
  "owner_authorization_for_callable_mobile_binding=true" \
  "explicit_callable_mobile_binding_request=true" \
  "mobile_binding_strategy=shared_core_json_bridge" \
  "shared_rust_mobile_bridge_crate_ready=true" \
  "android_json_bridge_adapter_ready=true" \
  "ios_json_bridge_adapter_ready=true" \
  "mobile_forbidden_dependency_scan_ready=true" \
  "callable_json_bridge_implemented=true" \
  "callable_ffi_implemented=false" \
  "generated_bindings_claimed=false" \
  "wrapper_specific_protocol_storage_transport_allowed=false" \
  "native_runtime_messaging_may_start=false" \
  "network_delivery_may_start=false" \
  "release_packaging_may_start=false" \
  "android_public_artifact_ready=false" \
  "ios_public_artifact_ready=false" \
  "mobile_readiness_claimed=false" \
  "security_ready_claimed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$REFERENCE" "$flag"
done

must_contain "Cargo.toml" '"crates/mobile"'
must_contain "crates/mobile/Cargo.toml" 'name = "another-dimension-mobile"'
must_contain "$CRATE" "production_mobile_shared_core_api_freeze_boundary_summary"
must_contain "$CRATE" "shared_core_status_surface_json"
must_contain "$CRATE" "redacted_support_diagnostics_json"
must_contain "$CRATE" "mobile_command_result_json"
must_contain "$CRATE" "callable_json_bridge_implemented"
must_contain "$ANDROID_ADAPTER" "RuntimeScopeUnlockedJsonBridgeMobileApi"
must_contain "$ANDROID_ADAPTER" "SharedCoreJsonBridge"
must_contain "$ANDROID_ADAPTER" "sharedCoreStatusSurfaceJson"
must_contain "$ANDROID_ADAPTER" "redactedSupportDiagnosticsJson"
must_contain "$IOS_ADAPTER" "RuntimeScopeUnlockedJsonBridgeMobileApi"
must_contain "$IOS_ADAPTER" "SharedCoreJsonBridge"
must_contain "$IOS_ADAPTER" "sharedCoreStatusSurfaceJson"
must_contain "$IOS_ADAPTER" "redactedSupportDiagnosticsJson"

for file in "$UNLOCK" "$REFERENCE" "$CRATE" "$ANDROID_ADAPTER" "$IOS_ADAPTER"; do
  must_not_match "$file" "mobile_readiness_claimed[=:] ?true"
  must_not_match "$file" "android_public_artifact_ready[=:] ?true"
  must_not_match "$file" "ios_public_artifact_ready[=:] ?true"
  must_not_match "$file" "network_delivery_may_start[=:] ?true"
  must_not_match "$file" "release_packaging_may_start[=:] ?true"
done

cargo test -p another-dimension-mobile
"$FORBIDDEN_SCAN" >/dev/null

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=mobile-runtime-scope-unlock-source-ready
mobile_runtime_scope_unlock_recorded=true
owner_authorization_for_callable_mobile_binding=true
explicit_callable_mobile_binding_request=true
mobile_binding_strategy=shared_core_json_bridge
shared_rust_mobile_bridge_crate_ready=true
android_json_bridge_adapter_ready=true
ios_json_bridge_adapter_ready=true
mobile_forbidden_dependency_scan_ready=true
callable_json_bridge_implemented=true
callable_ffi_implemented=false
generated_bindings_claimed=false
native_runtime_messaging_may_start=false
network_delivery_may_start=false
release_packaging_may_start=false
android_public_artifact_ready=false
ios_public_artifact_ready=false
mobile_readiness_claimed=false
security_ready_claimed=false
sensitive_communication_allowed=false
STATUS
