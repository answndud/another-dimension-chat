#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=build_cache_env.sh
source "$ROOT_DIR/scripts/build_cache_env.sh"

run_step() {
  local name="$1"
  shift

  printf '\n==> %s\n' "$name"
  "$@"
}

cd "$ROOT_DIR"

run_step "generated artifact guard" scripts/mobile_generated_artifact_guard_once.sh
run_step "rustfmt" cargo fmt --all -- --check
run_step "desktop tauri shell cargo check" cargo check --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml
run_step "desktop tauri scaffold contract" scripts/verify_tauri_scaffold.sh
run_step "desktop shell fast state tests" npm --prefix apps/desktop-tauri run test:state
run_step "desktop shell vite build" npm --prefix apps/desktop-tauri run build

printf '\nfast desktop shell verification passed\n'
