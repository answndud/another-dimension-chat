#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HANDOFF="$ROOT_DIR/apps/desktop-tauri/windows_local_runtime_smoke_handoff.json"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing Windows local runtime smoke handoff input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing Windows local runtime smoke handoff text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden Windows local runtime smoke handoff text in $file: $text" >&2
    exit 1
  fi
}

for file in \
  "$HANDOFF" \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/SECURITY.md" \
  "$ROOT_DIR/apps/desktop-tauri/README.md" \
  "$ROOT_DIR/apps/desktop-tauri/windows_desktop_parity_intake.json" \
  "$ROOT_DIR/scripts/desktop_windows_parity_intake_once.sh" \
  "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_boundary_once.sh" \
  "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" \
  "$ROOT_DIR/apps/desktop-tauri/package.json" \
  "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"; do
  require_file "$file"
done

node - "$HANDOFF" <<'NODE'
const fs = require("fs");
const [handoffPath] = process.argv.slice(2);
const handoff = JSON.parse(fs.readFileSync(handoffPath, "utf8"));

function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}

assert(handoff.status === "source-boundary-windows-local-runtime-smoke-handoff", "handoff status mismatch");
assert(handoff.windows_local_runtime_smoke_handoff_verified === true, "handoff verified flag is not true");
assert(handoff.current_state === "source-boundary-only", "handoff current state mismatch");
assert(handoff.source_command === "npm --prefix apps/desktop-tauri run test:windows-boundary", "handoff source command mismatch");
assert(handoff.must_run_on === "real-windows-machine", "handoff must_run_on mismatch");

for (const flag of [
  "windows_local_runtime_smoke_passed",
  "windows_public_artifact_ready",
  "windows_installer_ready",
  "windows_public_artifact_upload_allowed",
  "release_packaging_allowed",
]) {
  assert(handoff[flag] === false, `${flag} is not false`);
}

for (const item of [
  "webview2_runtime_smoke",
  "tauri_app_data_path_review",
  "path_separator_review",
  "encrypted_store_profile_unlock_review",
  "local_deletion_behavior_review",
  "redacted_diagnostics_behavior_review",
  "explicit_user_action_before_network_review",
  "local_manual_envelope_default_path_review",
  "no_auto_update_channel_review",
  "public_non_claim_copy_review",
]) {
  assert(handoff.handoff_checklist.includes(item), `missing handoff checklist item ${item}`);
}

for (const field of [
  "platform",
  "webview2_rendered",
  "app_data_root_redacted",
  "path_separator_behavior",
  "local_deletion_behavior",
  "redacted_diagnostics_only",
  "explicit_user_action_before_network",
  "local_manual_envelope_default_path",
  "auto_update_channel_absent",
  "public_non_claims_visible",
]) {
  assert(handoff.required_observation_fields.includes(field), `missing observation field ${field}`);
}

for (const field of [
  "raw_local_paths",
  "profile_names",
  "message_text",
  "invite_codes",
  "pairing_payloads",
  "envelope_payloads",
  "onion_endpoints",
  "bridge_lines",
  "passphrases",
  "private_keys",
  "key_material",
  "raw_logs",
  "crash_dumps",
]) {
  assert(handoff.forbidden_observation_fields.includes(field), `missing forbidden field ${field}`);
}
NODE

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/apps/desktop-tauri/README.md"; do
  require_text "$file" "Windows local runtime smoke handoff"
  require_text "$file" "windows_local_runtime_smoke_handoff.json"
  require_text "$file" "npm --prefix apps/desktop-tauri run test:windows-boundary"
  require_text "$file" "not a Windows local runtime smoke passed claim"
  require_text "$file" "WebView2 runtime smoke"
  require_text "$file" "Tauri app-data path review"
  require_text "$file" "path separator review"
  require_text "$file" "local deletion behavior review"
  require_text "$file" "redacted diagnostics behavior review"
  require_text "$file" "explicit user action"
  require_text "$file" "local-manual envelope default path review"
  require_text "$file" "no auto-update"
  require_text "$file" "public non-claim"
  require_text "$file" "no public Windows artifact"
  require_text "$file" "no Windows installer"
  require_text "$file" "no public artifact upload"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  reject_text "$file" "Windows local runtime smoke passed=true"
  reject_text "$file" "Windows public artifact ready"
  reject_text "$file" "Windows installer ready"
  reject_text "$file" "Windows production-ready"
done

require_text "$ROOT_DIR/apps/desktop-tauri/package.json" '"test:windows-boundary"'
require_text "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" "windows_local_runtime_smoke_status=source-boundary-only"
require_text "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" "windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows"
require_text "$ROOT_DIR/scripts/desktop_windows_parity_intake_once.sh" "status=desktop-windows-parity-intake-ready"
require_text "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_boundary_once.sh" "status=desktop-windows-local-runtime-smoke-boundary-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_windows_local_runtime_smoke_handoff_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_local_runtime_smoke_handoff=source-boundary-only"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_local_runtime_smoke_passed=false"

reject_text "$HANDOFF" '"windows_local_runtime_smoke_passed": true'
reject_text "$HANDOFF" '"windows_public_artifact_ready": true'
reject_text "$HANDOFF" '"windows_installer_ready": true'
reject_text "$HANDOFF" '"windows_public_artifact_upload_allowed": true'
reject_text "$HANDOFF" '"release_packaging_allowed": true'

printf 'status=desktop-windows-local-runtime-smoke-handoff-ready\n'
printf 'windows_local_runtime_smoke_handoff=source-boundary-only\n'
printf 'windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary\n'
printf 'windows_local_runtime_smoke_passed=false\n'
printf 'windows_public_artifact_ready=false\n'
printf 'windows_installer_ready=false\n'
printf 'windows_public_artifact_upload_allowed=false\n'
printf 'release_packaging_allowed=false\n'
printf 'production_ready_claim=false\n'
printf 'sensitive_communication_allowed=false\n'
