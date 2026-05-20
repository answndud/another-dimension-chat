#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/desktop-tauri"
TAURI_DIR="$APP_DIR/src-tauri"

required_files=(
  "$APP_DIR/README.md"
  "$APP_DIR/package.json"
  "$APP_DIR/index.html"
  "$APP_DIR/src/main.js"
  "$APP_DIR/src/styles.css"
  "$APP_DIR/vite.config.js"
  "$TAURI_DIR/Cargo.toml"
  "$TAURI_DIR/build.rs"
  "$TAURI_DIR/src/lib.rs"
  "$TAURI_DIR/src/main.rs"
  "$TAURI_DIR/tauri.conf.json"
)

for file in "${required_files[@]}"; do
  test -f "$file"
done

grep -q '"frontendDist": "../dist"' "$TAURI_DIR/tauri.conf.json"
grep -q '"devUrl": "http://localhost:1420"' "$TAURI_DIR/tauri.conf.json"
grep -q 'prototype_status' "$TAURI_DIR/src/lib.rs"
grep -q 'secure_release: false' "$TAURI_DIR/src/lib.rs"
grep -q 'usable_messaging: false' "$TAURI_DIR/src/lib.rs"
grep -q 'invoke("prototype_status")' "$APP_DIR/src/main.js"
grep -q 'not a production messaging UI' "$APP_DIR/README.md"

cargo metadata --manifest-path "$TAURI_DIR/Cargo.toml" --no-deps --format-version 1 >/dev/null

printf 'tauri scaffold static verification passed\n'
