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

run_step "desktop shell fast verifier" scripts/verify_desktop_shell_fast.sh
run_step "macOS unsigned public beta packet identity" scripts/macos_unsigned_public_release_packet_once.sh
run_step "macOS fresh install rehearsal contract" scripts/macos_fresh_install_rehearsal_once.sh

printf '\nverify_all passed\n'
