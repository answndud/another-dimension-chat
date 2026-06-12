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
