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
run_step "main.js saved-room delegation guard" scripts/verify_main_js_saved_room_delegation.sh
run_step "main.js size guard" node scripts/verify_main_js_size.mjs

printf '\nlight verification passed\n'
