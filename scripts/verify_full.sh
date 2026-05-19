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

run_step "dev CLI smoke" scripts/smoke_dev_cli.sh
run_step "rustfmt" cargo fmt --all -- --check
run_step "default tests" cargo test --workspace
run_step "dev-insecure tests" cargo test --workspace --features dev-insecure
run_step "clippy" cargo clippy --workspace --all-targets --all-features

printf '\nfull verification steps passed\n'
