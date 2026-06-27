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

run_step "light verification" scripts/verify_light.sh
run_step "rustfmt" cargo fmt --all -- --check
run_step "desktop tauri shell cargo check" cargo check --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml

printf '\nwarm verification passed\n'
