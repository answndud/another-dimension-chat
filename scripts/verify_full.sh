#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
export CARGO_INCREMENTAL=0
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-"$ROOT_DIR/.build-cache/cargo-target"}
export AD_DAEMON_BINARY=${AD_DAEMON_BINARY:-"$CARGO_TARGET_DIR/debug/another-dimension-daemon"}

scripts/prepare_build_cache.sh

run_step() {
  local name="$1"
  shift
  printf '\n==> %s\n' "$name"
  "$@"
}

cd "$ROOT_DIR"
run_step "light product verification" scripts/verify_light.sh
run_step "Rust formatting" cargo fmt --all -- --check
run_step "daemon binary" cargo build -p another-dimension-daemon --locked
run_step "runtime budget acceptance" node scripts/acceptance_runtime_budget.mjs
run_step "user-owned server transport smoke" node scripts/smoke_user_owned_servers.mjs
run_step "release manifest integrity" node scripts/release_manifest.test.mjs
run_step "private release acceptance" node scripts/acceptance_private_release.mjs
run_step "two-daemon product journey" node scripts/acceptance_daemon_e2e.mjs
run_step "daemon tests" cargo test -p another-dimension-daemon --lib
run_step "daemon library lints" cargo clippy -p another-dimension-daemon --lib -- -D warnings
scripts/prepare_build_cache.sh

printf '\nfull daemon/web/relay verification passed\n'
