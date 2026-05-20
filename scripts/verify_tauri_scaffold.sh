#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/desktop-tauri"
TAURI_DIR="$APP_DIR/src-tauri"

require_contains() {
  local file="$1"
  local pattern="$2"

  if ! grep -q -- "$pattern" "$file"; then
    echo "missing expected Tauri scaffold pattern in $file: $pattern" >&2
    exit 1
  fi
}

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
  "$TAURI_DIR/src/status.rs"
  "$TAURI_DIR/tauri.conf.json"
)

for file in "${required_files[@]}"; do
  test -f "$file"
done

require_contains "$TAURI_DIR/tauri.conf.json" '"frontendDist": "../dist"'
require_contains "$TAURI_DIR/tauri.conf.json" '"devUrl": "http://localhost:1420"'
require_contains "$TAURI_DIR/src/lib.rs" 'prototype_status'
require_contains "$TAURI_DIR/src/lib.rs" 'mod status;'
require_contains "$TAURI_DIR/src/lib.rs" 'pub use status::PrototypeStatus;'
require_contains "$TAURI_DIR/src/lib.rs" 'redacted_prototype_status()'
require_contains "$TAURI_DIR/src/lib.rs" 'generate_handler!\[prototype_status\]'
require_contains "$TAURI_DIR/src/status.rs" 'pub fn redacted_prototype_status() -> PrototypeStatus'
require_contains "$TAURI_DIR/src/status.rs" 'secure_release: false'
require_contains "$TAURI_DIR/src/status.rs" 'usable_messaging: false'
require_contains "$TAURI_DIR/src/status.rs" 'profile_status: "profile boundary only"'
require_contains "$TAURI_DIR/src/status.rs" 'pairing_status: "pairing boundary only"'
require_contains "$TAURI_DIR/src/status.rs" 'transport_status: "fail-closed boundary only"'
require_contains "$TAURI_DIR/src/status.rs" 'storage_status: "storage boundary only"'
require_contains "$TAURI_DIR/src/status.rs" 'verification_status: "lightweight checks only"'
require_contains "$APP_DIR/src/main.js" 'invoke("prototype_status")'
require_contains "$APP_DIR/src/main.js" 'status.verification_status'
require_contains "$APP_DIR/src/main.js" 'Unexpected release claim'
require_contains "$APP_DIR/src/main.js" 'Unexpected messaging status'
require_contains "$APP_DIR/README.md" 'not a production messaging UI'
require_contains "$APP_DIR/README.md" 'verification boundaries'
require_contains "$APP_DIR/index.html" 'Prototype shell only'
require_contains "$APP_DIR/index.html" 'Another Dimension Chat Prototype'
require_contains "$APP_DIR/index.html" 'Release claim'
require_contains "$APP_DIR/index.html" 'No secure-release claim'
require_contains "$APP_DIR/index.html" 'Disabled in prototype'
require_contains "$APP_DIR/index.html" 'Fail-closed boundary only'
require_contains "$APP_DIR/index.html" 'Lightweight checks only'
require_contains "$APP_DIR/.npmrc" '^workspaces=false$'
require_contains "$APP_DIR/package-lock.json" '"lockfileVersion": 3'
require_contains "$APP_DIR/package-lock.json" '"vite": "^6.0.0"'

command_count="$(grep -R '^\s*#\[tauri::command\]' "$TAURI_DIR/src" | wc -l | tr -d ' ')"
test "$command_count" = "1"

invoke_count="$(grep -R 'invoke(' "$APP_DIR/src" | wc -l | tr -d ' ')"
test "$invoke_count" = "1"

status_false_count="$(grep -E '^\s*[a-z_]+: false,' "$TAURI_DIR/src/status.rs" | wc -l | tr -d ' ')"
test "$status_false_count" = "2"

if grep -n '\btrue\b' "$TAURI_DIR/src/status.rs" >/dev/null; then
  echo "status adapter must not expose true readiness flags" >&2
  exit 1
fi

if grep -n -E 'secure_release:|usable_messaging:|profile_status:|pairing_status:|transport_status:|storage_status:|verification_status:' "$TAURI_DIR/src/lib.rs" >/dev/null; then
  echo "Tauri command wrapper must delegate status construction to status.rs" >&2
  exit 1
fi

if grep -n -E '"available"|"ready"|"connected"|"bootstrapped"|"secure release"|"usable messaging"' "$TAURI_DIR/src/status.rs" >/dev/null; then
  echo "status adapter must not imply readiness or secure-release state" >&2
  exit 1
fi

if grep -R 'invoke(' "$APP_DIR/src" | grep -v 'invoke("prototype_status")' >/dev/null; then
  echo "unexpected frontend Tauri command invocation" >&2
  exit 1
fi

if grep -R -E 'send_message|receive_message|transport_bootstrap|bootstrap_transport|launch_onion|publish_descriptor|accept_stream|dial_stream|send_envelope|receive_envelope|create_profile|pair_contact|cloud_backup|push_notification|group_chat|file_transfer|multi_device' "$APP_DIR/src" "$TAURI_DIR/src" >/dev/null; then
  echo "unexpected production command surface in Tauri scaffold" >&2
  exit 1
fi

if grep -R -E '<button|<input|<textarea|contenteditable|Available|Start chat|Send message|Connect|Pair contact|Bootstrap|Launch onion|Not a secure release|Not available' "$APP_DIR/index.html" "$APP_DIR/src" >/dev/null; then
  echo "unexpected interactive or readiness-implying UI copy in Tauri scaffold" >&2
  exit 1
fi

cargo metadata --manifest-path "$TAURI_DIR/Cargo.toml" --no-deps --format-version 1 >/dev/null

printf 'tauri scaffold static verification passed\n'
