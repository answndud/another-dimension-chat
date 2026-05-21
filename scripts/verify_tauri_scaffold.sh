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

require_status_field() {
  local field="$1"
  local value="$2"

  require_contains "$TAURI_DIR/src/status.rs" "$field: \"$value\""
  require_contains "$APP_DIR/src/main.js" "status.$field"
}

require_status_copy() {
  local value="$1"

  require_contains "$APP_DIR/index.html" "$value"
}

required_files=(
  "$APP_DIR/README.md"
  "$APP_DIR/.npmrc"
  "$APP_DIR/package.json"
  "$APP_DIR/package-lock.json"
  "$TAURI_DIR/Cargo.lock"
  "$APP_DIR/index.html"
  "$APP_DIR/src/main.js"
  "$APP_DIR/src/styles.css"
  "$APP_DIR/vite.config.js"
  "$TAURI_DIR/Cargo.toml"
  "$TAURI_DIR/build.rs"
  "$TAURI_DIR/src/lib.rs"
  "$TAURI_DIR/src/main.rs"
  "$TAURI_DIR/src/status.rs"
  "$TAURI_DIR/icons/icon.png"
  "$TAURI_DIR/tauri.conf.json"
)

for file in "${required_files[@]}"; do
  test -f "$file"
done

require_contains "$TAURI_DIR/tauri.conf.json" '"frontendDist": "../dist"'
require_contains "$TAURI_DIR/tauri.conf.json" '"devUrl": "http://localhost:1420"'
require_contains "$TAURI_DIR/src/lib.rs" 'prototype_status'
require_contains "$TAURI_DIR/src/lib.rs" 'dev_local_demo'
require_contains "$TAURI_DIR/src/lib.rs" 'dev_local_message_loop'
require_contains "$TAURI_DIR/src/lib.rs" 'DevLocalMessageLoopResult'
require_contains "$TAURI_DIR/src/lib.rs" 'parse_loop_messages'
require_contains "$TAURI_DIR/src/lib.rs" 'sanitize_loop_messages'
require_contains "$TAURI_DIR/src/lib.rs" 'steps: Vec<DevLocalDemoStep>'
require_contains "$TAURI_DIR/src/lib.rs" 'simulation: DevLocalSimulation'
require_contains "$TAURI_DIR/src/lib.rs" 'build_demo_simulation'
require_contains "$TAURI_DIR/src/lib.rs" 'DevLocalPeer'
require_contains "$TAURI_DIR/src/lib.rs" 'safety_number'
require_contains "$TAURI_DIR/src/lib.rs" 'message_body'
require_contains "$TAURI_DIR/src/lib.rs" 'first_run_hint'
require_contains "$TAURI_DIR/src/lib.rs" 'parse_demo_steps'
require_contains "$TAURI_DIR/src/lib.rs" 'status: "completed"'
require_contains "$TAURI_DIR/src/lib.rs" 'mod status;'
require_contains "$TAURI_DIR/src/lib.rs" 'pub use status::PrototypeStatus;'
require_contains "$TAURI_DIR/src/lib.rs" 'redacted_prototype_status()'
require_contains "$TAURI_DIR/src/lib.rs" 'dev_local_message_loop'
require_contains "$TAURI_DIR/src/lib.rs" 'cargo'
require_contains "$TAURI_DIR/src/lib.rs" 'demo'
require_contains "$TAURI_DIR/src/lib.rs" 'local'
require_contains "$TAURI_DIR/src/lib.rs" 'local-loop'
require_contains "$TAURI_DIR/src/status.rs" 'pub fn redacted_prototype_status() -> PrototypeStatus'
require_contains "$TAURI_DIR/src/status.rs" 'secure_release: false'
require_contains "$TAURI_DIR/src/status.rs" 'usable_messaging: false'
require_status_field 'core_status' 'core boundary only'
require_status_field 'profile_status' 'profile boundary only'
require_status_field 'pairing_status' 'pairing boundary only'
require_status_field 'transport_status' 'pre-network fail-closed only'
require_status_field 'network_execution_status' 'network execution disabled'
require_status_field 'experimental_transport_status' 'manual bootstrap gate summary only'
require_contains "$TAURI_DIR/src/status.rs" 'bootstrap_status_classification:'
require_contains "$TAURI_DIR/src/status.rs" 'network-disabled; censorship-or-bridge-required; timeout-or-transient-network-failure'
require_contains "$APP_DIR/src/main.js" 'status.bootstrap_status_classification'
require_status_field 'transport_io_status' 'hosting stream envelope messaging disabled'
require_status_field 'storage_status' 'ADREC1 storage spike only'
require_status_field 'verification_status' 'lightweight checks only'
require_contains "$APP_DIR/src/main.js" 'invoke("prototype_status")'
require_contains "$APP_DIR/src/main.js" 'invoke("dev_local_demo")'
require_contains "$APP_DIR/src/main.js" 'invoke("dev_local_message_loop"'
require_contains "$APP_DIR/src/main.js" 'runLocalLoop'
require_contains "$APP_DIR/src/main.js" 'localLoopMessages'
require_contains "$APP_DIR/src/main.js" 'renderLoopResults'
require_contains "$APP_DIR/src/main.js" 'Loop completed'
require_contains "$APP_DIR/src/main.js" 'result.replay_summary'
require_contains "$APP_DIR/src/main.js" 'result.storage_guard'
require_contains "$APP_DIR/src/main.js" 'Demo running'
require_contains "$APP_DIR/src/main.js" 'Demo completed'
require_contains "$APP_DIR/src/main.js" 'Demo failed'
require_contains "$APP_DIR/src/main.js" 'renderDemoSteps'
require_contains "$APP_DIR/src/main.js" 'renderFlowControls'
require_contains "$APP_DIR/src/main.js" 'applySimulationStage'
require_contains "$APP_DIR/src/main.js" 'Reset local view'
require_contains "$APP_DIR/src/main.js" 'result.simulation'
require_contains "$APP_DIR/src/main.js" 'result.first_run_hint'
require_contains "$APP_DIR/src/main.js" 'result.steps'
require_contains "$APP_DIR/src/main.js" 'First run may take longer while Cargo builds the dev-insecure local demo.'
require_contains "$APP_DIR/src/main.js" 'result.warning.trim()'
require_contains "$APP_DIR/src/main.js" 'result.transcript.trim()'
require_contains "$APP_DIR/src/main.js" 'Unexpected release claim'
require_contains "$APP_DIR/src/main.js" 'Unexpected messaging status'
require_contains "$APP_DIR/README.md" 'not a production messaging UI'
require_contains "$APP_DIR/README.md" 'dev_local_demo'
require_contains "$APP_DIR/README.md" 'not production messaging'
require_contains "$APP_DIR/README.md" 'Run the visible local demo shell'
require_contains "$APP_DIR/README.md" 'first run may take longer while Cargo builds the `dev-insecure` CLI demo'
require_contains "$APP_DIR/README.md" 'structured local flow steps'
require_contains "$APP_DIR/README.md" 'Alice/Bob peer panels'
require_contains "$APP_DIR/README.md" 'Reset local view'
require_contains "$APP_DIR/README.md" 'repeatable local loop'
require_contains "$APP_DIR/README.md" 'demo local-loop'
require_contains "$APP_DIR/README.md" 'dev store plaintext guard'
require_contains "$APP_DIR/README.md" 'core, profile'
require_contains "$APP_DIR/README.md" 'does not link or call production core protocol'
require_contains "$APP_DIR/README.md" 'static pre-network fail-closed copy'
require_contains "$APP_DIR/README.md" 'network-execution'
require_contains "$APP_DIR/README.md" 'static disabled copy'
require_contains "$APP_DIR/README.md" 'experimental-transport'
require_contains "$APP_DIR/README.md" 'static manual-gate summary copy'
require_contains "$APP_DIR/README.md" 'bootstrap-status classification'
require_contains "$APP_DIR/README.md" 'network-disabled'
require_contains "$APP_DIR/README.md" 'timeout-or-transient-network-failure'
require_contains "$APP_DIR/README.md" 'does not expose raw Arti errors, paths, endpoints, bridge lines, descriptors, profile names, contact ids, or key material'
require_contains "$APP_DIR/README.md" 'transport-I/O'
require_contains "$APP_DIR/README.md" 'static disabled copy for onion hosting, stream I/O, envelope I/O, and messaging'
require_contains "$APP_DIR/README.md" 'static `ADREC1` spike copy'
require_contains "$APP_DIR/README.md" 'does not claim complete production key management'
require_contains "$APP_DIR/README.md" 'verification boundaries'
require_contains "$APP_DIR/index.html" 'Prototype shell only'
require_contains "$APP_DIR/index.html" 'Another Dimension Chat Prototype'
require_contains "$APP_DIR/index.html" 'Dev-insecure local demo'
require_contains "$APP_DIR/index.html" 'Run local demo'
require_contains "$APP_DIR/index.html" 'Demo idle'
require_contains "$APP_DIR/index.html" 'First run may take longer while Cargo builds the dev-insecure local demo.'
require_contains "$APP_DIR/index.html" 'Warning has not run yet.'
require_contains "$APP_DIR/index.html" 'Local demo flow steps'
require_contains "$APP_DIR/index.html" 'Steps have not run yet.'
require_contains "$APP_DIR/index.html" 'Local peer simulation'
require_contains "$APP_DIR/index.html" 'Alice and Bob state'
require_contains "$APP_DIR/index.html" 'Local flow controls'
require_contains "$APP_DIR/index.html" 'Local peer panels'
require_contains "$APP_DIR/index.html" 'Safety number'
require_contains "$APP_DIR/index.html" 'Replay check'
require_contains "$APP_DIR/index.html" 'Repeatable local loop'
require_contains "$APP_DIR/index.html" 'Local message loop'
require_contains "$APP_DIR/index.html" 'Run local loop'
require_contains "$APP_DIR/index.html" 'Reset loop view'
require_contains "$APP_DIR/index.html" 'Local loop message results'
require_contains "$APP_DIR/index.html" 'Storage guard'
require_contains "$APP_DIR/index.html" 'Release claim'
require_status_copy 'No secure-release claim'
require_status_copy 'Disabled in prototype'
require_status_copy 'Core boundary only'
require_status_copy 'Profile boundary only'
require_status_copy 'Pairing boundary only'
require_status_copy 'Pre-network fail-closed only'
require_status_copy 'Network execution disabled'
require_status_copy 'Manual bootstrap gate summary only'
require_status_copy 'network-disabled; censorship-or-bridge-required;'
require_status_copy 'timeout-or-transient-network-failure'
require_status_copy 'Hosting stream envelope messaging disabled'
require_status_copy 'ADREC1 storage spike only'
require_status_copy 'Lightweight checks only'
require_contains "$APP_DIR/.npmrc" '^workspaces=false$'
require_contains "$APP_DIR/package-lock.json" '"lockfileVersion": 3'
require_contains "$APP_DIR/package-lock.json" '"vite": "^6.0.0"'
require_contains "$TAURI_DIR/Cargo.lock" 'name = "tauri"'

command_count="$(grep -R '^\s*#\[tauri::command\]' "$TAURI_DIR/src" | wc -l | tr -d ' ')"
test "$command_count" = "3"

invoke_count="$(grep -R 'invoke(' "$APP_DIR/src" | wc -l | tr -d ' ')"
test "$invoke_count" = "3"

status_false_count="$(grep -E '^\s*[a-z_]+: false,' "$TAURI_DIR/src/status.rs" | wc -l | tr -d ' ')"
test "$status_false_count" = "2"

if grep -n '\btrue\b' "$TAURI_DIR/src/status.rs" >/dev/null; then
  echo "status adapter must not expose true readiness flags" >&2
  exit 1
fi

if grep -n -E 'secure_release:|usable_messaging:|core_status:|profile_status:|pairing_status:|transport_status:|network_execution_status:|storage_status:|verification_status:' "$TAURI_DIR/src/lib.rs" >/dev/null; then
  echo "Tauri command wrapper must delegate status construction to status.rs" >&2
  exit 1
fi

if grep -n -E '"available"|"ready"|"connected"|"bootstrapped"|"secure release"|"usable messaging"' "$TAURI_DIR/src/status.rs" >/dev/null; then
  echo "status adapter must not imply readiness or secure-release state" >&2
  exit 1
fi

if grep -R 'invoke(' "$APP_DIR/src" \
  | grep -v 'invoke("prototype_status")' \
  | grep -v 'invoke("dev_local_demo")' \
  | grep -v 'invoke("dev_local_message_loop"' >/dev/null; then
  echo "unexpected frontend Tauri command invocation" >&2
  exit 1
fi

if grep -R -E 'send_message|receive_message|transport_bootstrap|bootstrap_transport|launch_onion|publish_descriptor|accept_stream|dial_stream|send_envelope|receive_envelope|create_profile|pair_contact|cloud_backup|push_notification|group_chat|file_transfer|multi_device' "$APP_DIR/src" "$TAURI_DIR/src" >/dev/null; then
  echo "unexpected production command surface in Tauri scaffold" >&2
  exit 1
fi

if grep -R -E '<button|<input|<textarea|contenteditable|Available|Start chat|Send message|Connect|Pair contact|Bootstrap|Launch onion|Not a secure release|Not available' "$APP_DIR/index.html" "$APP_DIR/src" \
  | grep -v '<button id="run-demo" type="button">Run local demo</button>' \
  | grep -v '<button id="run-loop" type="button">Run local loop</button>' \
  | grep -v '<button id="reset-loop" type="button" class="flow-control is-secondary">' \
  | grep -v '<textarea id="loop-messages" rows="4">first local loop message' >/dev/null; then
  echo "unexpected interactive or readiness-implying UI copy in Tauri scaffold" >&2
  exit 1
fi

cargo metadata --manifest-path "$TAURI_DIR/Cargo.toml" --no-deps --format-version 1 >/dev/null

printf 'tauri scaffold static verification passed\n'
