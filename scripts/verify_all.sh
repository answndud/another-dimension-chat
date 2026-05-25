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

run_step "rustfmt" cargo fmt --all -- --check
run_step "workspace library tests" cargo test --workspace --lib
run_step "default build boundary checks" scripts/verify_default_boundary.sh
run_step "tauri action state tests" npm --prefix apps/desktop-tauri run test:state
run_step "tauri frontend build" npm --prefix apps/desktop-tauri run build
run_step "tauri scaffold static checks" scripts/verify_tauri_scaffold.sh

printf '\nlight verification steps passed\n'
