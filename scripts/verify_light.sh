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
export CARGO_INCREMENTAL=0
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-"$ROOT_DIR/.build-cache/cargo-target"}
export AD_DAEMON_BINARY=${AD_DAEMON_BINARY:-"$CARGO_TARGET_DIR/debug/another-dimension-daemon"}

scripts/prepare_build_cache.sh

run_step "product boundary" node scripts/verify_product_boundary.mjs
run_step "daemon boundary" node scripts/verify_daemon_boundary.mjs
run_step "dependency and runtime policy" node scripts/verify_dependency_policy.mjs
run_step "resource limit acceptance" node scripts/acceptance_resource_limits.mjs
run_step "web exposure scan" node scripts/verify_web_exposure.mjs
run_step "browser UI tests" npm --prefix apps/web test --workspaces=false
run_step "local server API tests" npm --prefix apps/server test --workspaces=false
run_step "relay operations acceptance" node scripts/acceptance_relay_operations.mjs
run_step "relay redacted log scan" node scripts/verify_relay_logs.mjs
run_step "browser production build" npm --prefix apps/web run build --workspaces=false
run_step "support matrix release policy" node scripts/verify_release_support_gate.mjs

# A build can cross the cache budget during this run even when preflight was
# below it. Enforce the same regenerable-cache policy on exit.
scripts/prepare_build_cache.sh

printf '\nlight source/web/relay verification passed\n'
