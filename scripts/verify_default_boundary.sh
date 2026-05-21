#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if grep -R -n -E '^default[[:space:]]*=.*dev-insecure' \
  "$ROOT_DIR/Cargo.toml" \
  "$ROOT_DIR/apps/cli/Cargo.toml" \
  "$ROOT_DIR/crates"/*/Cargo.toml >/dev/null; then
  echo "default features must not enable dev-insecure" >&2
  exit 1
fi

grep -q 'prototype profile/pairing/message commands require --features dev-insecure' \
  "$ROOT_DIR/apps/cli/src/main.rs"
grep -q 'default build exposes only boundary commands' \
  "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
grep -q 'performs no network I/O and opens no local storage' \
  "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
grep -q 'default_build_rejects_production_skeleton_commands' \
  "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
grep -q 'default_build_prints_read_only_production_preflight_without_secrets' \
  "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
grep -q 'production preflight is read-only' \
  "$ROOT_DIR/apps/cli/src/main.rs"
grep -q 'storage", "unlock"' \
  "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
grep -q 'transport", "send"' \
  "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
grep -q 'message", "send"' \
  "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"

cargo test -p another-dimension --test cli_hardening default_build

printf 'default build boundary verification passed\n'
