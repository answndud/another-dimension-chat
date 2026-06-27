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

run_step "source build path verifier" scripts/verify_source_build_path.sh
run_step "desktop JavaScript tests" npm --prefix apps/desktop-tauri test
run_step "desktop build" npm --prefix apps/desktop-tauri run build

printf '\nlight verification passed\n'
