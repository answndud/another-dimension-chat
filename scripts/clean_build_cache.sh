#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=build_cache_env.sh
source "$ROOT_DIR/scripts/build_cache_env.sh"

rm -rf \
  "$CARGO_TARGET_DIR" \
  "$ROOT_DIR/target" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/target" \
  "$ROOT_DIR/apps/desktop-tauri/dist"

printf 'removed build caches:\n'
printf '  %s\n' "$CARGO_TARGET_DIR"
printf '  %s\n' "$ROOT_DIR/target"
printf '  %s\n' "$ROOT_DIR/apps/desktop-tauri/src-tauri/target"
printf '  %s\n' "$ROOT_DIR/apps/desktop-tauri/dist"
