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

run_step "light verification" scripts/verify_all.sh
run_step "tauri browser preview peer tests" npm --prefix apps/desktop-tauri run test:browser-preview-peers
run_step "tauri local peer flow" npm --prefix apps/desktop-tauri run test:local-peers
run_step "dev CLI smoke" scripts/smoke_dev_cli.sh
run_step "default tests" cargo test --workspace
run_step "dev-insecure tests" cargo test --workspace --features dev-insecure
run_step "clippy" cargo clippy --workspace --all-targets --all-features

printf '\nfull verification steps passed\n'
