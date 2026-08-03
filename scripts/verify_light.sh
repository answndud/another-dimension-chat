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

run_step "browser runtime tests" npm --prefix apps/web test --workspaces=false
run_step "local server API tests" npm --prefix apps/server test --workspaces=false
run_step "browser production build" npm --prefix apps/web run build --workspaces=false
run_step "release manifest integrity" node scripts/release_manifest.test.mjs
run_step "user-owned server transport smoke" node scripts/smoke_user_owned_servers.mjs
run_step "support matrix release policy" node scripts/verify_release_support_gate.mjs
run_step "service worker runtime policy" node scripts/verify_service_worker_runtime.mjs

printf '\nweb/server lightweight verification passed\n'
