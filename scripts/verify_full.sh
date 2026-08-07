#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}

run_step() {
  local name="$1"
  shift
  printf '\n==> %s\n' "$name"
  "$@"
}

cd "$ROOT_DIR"
run_step "light product verification" scripts/verify_light.sh
run_step "product boundary" node scripts/verify_product_boundary.mjs
run_step "daemon boundary" node scripts/verify_daemon_boundary.mjs
run_step "Rust formatting" cargo fmt --all -- --check
run_step "daemon tests" cargo test -p another-dimension-daemon --lib
run_step "daemon lints" cargo clippy -p another-dimension-daemon --all-targets -- -D warnings

printf '\nfull daemon/web/relay verification passed\n'
