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
run_step "user-owned server transport smoke" node scripts/smoke_user_owned_servers.mjs

printf '\nweb/server lightweight verification passed\n'
