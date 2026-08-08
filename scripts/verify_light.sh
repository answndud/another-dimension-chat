#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  local name="$1"
  shift

  printf '\n==> %s\n' "$name"
  "$@"
}

cd "$ROOT_DIR"

export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}

run_step "daemon binary" cargo build -p another-dimension-daemon --locked
run_step "product boundary" node scripts/verify_product_boundary.mjs
run_step "daemon boundary" node scripts/verify_daemon_boundary.mjs
run_step "dependency and runtime policy" node scripts/verify_dependency_policy.mjs
run_step "resource limit acceptance" node scripts/acceptance_resource_limits.mjs
run_step "runtime budget acceptance" node scripts/acceptance_runtime_budget.mjs
run_step "browser UI tests" npm --prefix apps/web test --workspaces=false
run_step "local server API tests" npm --prefix apps/server test --workspaces=false
run_step "browser production build" npm --prefix apps/web run build --workspaces=false
run_step "release manifest integrity" node scripts/release_manifest.test.mjs
run_step "user-owned server transport smoke" node scripts/smoke_user_owned_servers.mjs
run_step "support matrix release policy" node scripts/verify_release_support_gate.mjs
run_step "two-daemon product journey" node scripts/acceptance_daemon_e2e.mjs

printf '\nweb/server lightweight verification passed\n'
