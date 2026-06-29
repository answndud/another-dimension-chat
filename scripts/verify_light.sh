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

run_step "source build path verifier (static only)" env AD_VERIFY_SOURCE_BUILD_SKIP_BUILD=1 scripts/verify_source_build_path.sh
run_step "desktop JavaScript tests" npm --prefix apps/desktop-tauri test

printf '\nlight verification passed\n'
