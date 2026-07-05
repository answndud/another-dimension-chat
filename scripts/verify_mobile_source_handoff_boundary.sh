#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile source handoff file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile source handoff text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile source handoff text in $file: $text" >&2
    exit 1
  fi
}

MOBILE_README="$ROOT_DIR/apps/mobile/README.md"
ANDROID_README="$ROOT_DIR/apps/mobile/android/README.md"
IOS_README="$ROOT_DIR/apps/mobile/ios/README.md"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
HANDOFF="$ROOT_DIR/scripts/verify_mobile_source_handoff.sh"

require_file "$MOBILE_README"
require_file "$ANDROID_README"
require_file "$IOS_README"
require_file "$FFI_README"
require_file "$HANDOFF"

require_text "$MOBILE_README" "Current Source Scaffold Operator Handoff"
require_text "$MOBILE_README" "read-only status adapter"
require_text "$MOBILE_README" "blocked command adapter"
require_text "$MOBILE_README" "user-initiated redacted diagnostics copy boundary"
require_text "$MOBILE_README" "display-only local data lifecycle confirmation boundary"
require_text "$MOBILE_README" "no native network permission"
require_text "$MOBILE_README" "scripts/verify_mobile_source_handoff.sh"
require_text "$MOBILE_README" "binding generation implemented false"
require_text "$MOBILE_README" "callable FFI implemented false"
require_text "$MOBILE_README" "mobile readiness claimed false"
require_text "$MOBILE_README" "security-ready claimed false"

for readme in "$ANDROID_README" "$IOS_README"; do
  require_text "$readme" "Operator handoff check"
  require_text "$readme" "scripts/verify_mobile_source_handoff.sh"
  require_text "$readme" "source-boundary verification only"
  require_text "$readme" "read-only status adapter"
  require_text "$readme" "blocked command adapter"
  require_text "$readme" "diagnostics copy"
  require_text "$readme" "lifecycle confirmation"
  require_text "$readme" "no-network launch boundary"
done

require_text "$FFI_README" "Operator Handoff Verification Boundary"
require_text "$FFI_README" "scripts/verify_mobile_source_handoff.sh"
require_text "$FFI_README" "not generated binding validation"
require_text "$FFI_README" "not runtime messaging validation"
require_text "$FFI_README" "not a mobile readiness claim"

for script in \
  verify_mobile_read_only_status_adapter.sh \
  verify_mobile_command_blocked_adapter.sh \
  verify_mobile_shell_presentation.sh \
  verify_mobile_diagnostics_copy_boundary.sh \
  verify_mobile_lifecycle_boundary.sh \
  verify_mobile_launch_network_boundary.sh \
  verify_mobile_binding_readiness_gate.sh \
  verify_mobile_ffi_error_mapping.sh \
  verify_mobile_serialization_vectors.sh \
  verify_mobile_memory_ownership.sh \
  verify_mobile_diagnostics_payload_review.sh \
  verify_mobile_binding_gate.sh \
  verify_android_shell_boundary.sh \
  verify_ios_shell_boundary.sh \
  verify_mobile_skeleton_boundary.sh; do
  require_text "$HANDOFF" "scripts/$script"
done

require_text "$HANDOFF" "status=mobile-source-handoff-verified"
require_text "$HANDOFF" "source_boundary_only=true"
require_text "$HANDOFF" "release_packaging=false"
require_text "$HANDOFF" "generated_bindings=false"
require_text "$HANDOFF" "runtime_messaging=false"
require_text "$HANDOFF" "mobile_readiness_claim=false"
require_text "$HANDOFF" "security_ready_claim=false"

reject_text "$HANDOFF" "cargo build"
reject_text "$HANDOFF" "gradle assemble"
reject_text "$HANDOFF" "xcodebuild"
reject_text "$HANDOFF" "release upload"
reject_text "$HANDOFF" "generated public-release"
reject_text "$HANDOFF" "beta-artifacts"

printf 'status=mobile-source-handoff-boundary-verified\n'
printf 'operator_handoff_documented=true\n'
printf 'targeted_aggregator_present=true\n'
printf 'release_packaging=false\n'
printf 'mobile_readiness_claim=false\n'
