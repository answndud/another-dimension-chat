#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

scripts/verify_mobile_read_only_status_adapter.sh
scripts/verify_mobile_command_blocked_adapter.sh
scripts/verify_mobile_shell_presentation.sh
scripts/verify_mobile_diagnostics_copy_boundary.sh
scripts/verify_mobile_lifecycle_boundary.sh
scripts/verify_mobile_launch_network_boundary.sh
scripts/verify_mobile_binding_readiness_gate.sh
scripts/verify_mobile_ffi_error_mapping.sh
scripts/verify_mobile_serialization_vectors.sh
scripts/verify_mobile_memory_ownership.sh
scripts/verify_mobile_diagnostics_payload_review.sh
scripts/verify_mobile_adapter_parity.sh
scripts/verify_mobile_binding_prerequisite_closure.sh
scripts/verify_mobile_callable_ffi_authorization_hold.sh
scripts/verify_mobile_source_boundary_cleanup.sh
scripts/verify_mobile_authorization_hold_regression_matrix.sh
scripts/verify_mobile_owner_authorization_transition.sh
scripts/verify_mobile_pre_implementation_handoff.sh
scripts/verify_mobile_binding_gate.sh
scripts/verify_android_shell_boundary.sh
scripts/verify_ios_shell_boundary.sh
scripts/verify_mobile_skeleton_boundary.sh

printf 'status=mobile-source-handoff-verified\n'
printf 'source_boundary_only=true\n'
printf 'release_packaging=false\n'
printf 'generated_bindings=false\n'
printf 'runtime_messaging=false\n'
printf 'mobile_readiness_claim=false\n'
printf 'security_ready_claim=false\n'
