#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/desktop-tauri"
TAURI_DIR="$APP_DIR/src-tauri"

required_files=(
  "$APP_DIR/README.md"
  "$APP_DIR/.npmrc"
  "$APP_DIR/package.json"
  "$APP_DIR/package-lock.json"
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
grep -q 'Prototype shell only' "$APP_DIR/index.html"
grep -q 'Another Dimension Chat Prototype' "$APP_DIR/index.html"
grep -q 'Not a secure release' "$APP_DIR/index.html"
grep -q 'Not available' "$APP_DIR/index.html"
grep -q 'Fail-closed only' "$APP_DIR/index.html"
grep -q 'Unexpected secure-release status' "$APP_DIR/src/main.js"
grep -q 'Unexpected messaging status' "$APP_DIR/src/main.js"
grep -q 'transport_status: "fail-closed only"' "$TAURI_DIR/src/lib.rs"
grep -q '^workspaces=false$' "$APP_DIR/.npmrc"
grep -q '"lockfileVersion": 3' "$APP_DIR/package-lock.json"
grep -q '"vite": "^6.0.0"' "$APP_DIR/package-lock.json"

command_count="$(grep -R '^\s*#\[tauri::command\]' "$TAURI_DIR/src" | wc -l | tr -d ' ')"
test "$command_count" = "1"

invoke_count="$(grep -R 'invoke(' "$APP_DIR/src" | wc -l | tr -d ' ')"
test "$invoke_count" = "1"

grep -q 'generate_handler!\[prototype_status\]' "$TAURI_DIR/src/lib.rs"

if grep -R 'invoke(' "$APP_DIR/src" | grep -v 'invoke("prototype_status")' >/dev/null; then
  echo "unexpected frontend Tauri command invocation" >&2
  exit 1
fi

if grep -R -E 'send_message|receive_message|transport_bootstrap|bootstrap_transport|launch_onion|publish_descriptor|accept_stream|dial_stream|send_envelope|receive_envelope|create_profile|pair_contact|cloud_backup|push_notification|group_chat|file_transfer|multi_device' "$APP_DIR/src" "$TAURI_DIR/src" >/dev/null; then
  echo "unexpected production command surface in Tauri scaffold" >&2
  exit 1
fi

if grep -R -E '<button|<input|<textarea|contenteditable|Available|Start chat|Send message|Connect|Pair contact|Bootstrap|Launch onion' "$APP_DIR/index.html" "$APP_DIR/src" >/dev/null; then
  echo "unexpected interactive or readiness-implying UI copy in Tauri scaffold" >&2
  exit 1
fi

cargo metadata --manifest-path "$TAURI_DIR/Cargo.toml" --no-deps --format-version 1 >/dev/null

printf 'tauri scaffold static verification passed\n'
