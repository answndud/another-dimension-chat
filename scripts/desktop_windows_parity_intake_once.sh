#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTAKE="$ROOT_DIR/apps/desktop-tauri/windows_desktop_parity_intake.json"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing Windows desktop parity intake input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing Windows desktop parity intake text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden Windows desktop parity intake text in $file: $text" >&2
    exit 1
  fi
}

for file in \
  "$INTAKE" \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/SECURITY.md" \
  "$ROOT_DIR/apps/desktop-tauri/README.md" \
  "$ROOT_DIR/apps/desktop-tauri/package.json" \
  "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" \
  "$ROOT_DIR/scripts/desktop_windows_readiness_source_audit_once.sh" \
  "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_boundary_once.sh" \
  "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js"; do
  require_file "$file"
done

node - "$INTAKE" <<'NODE'
const fs = require("fs");
const [intakePath] = process.argv.slice(2);
const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));

function assert(value, message) {
  if (!value) {
    console.error(message);
    process.exit(1);
  }
}

assert(intake.status === "source-boundary-windows-desktop-cross-platform-parity-intake", "intake status mismatch");
assert(intake.windows_desktop_parity_intake_verified === true, "intake verified flag is not true");
assert(intake.current_state === "windows-local-build-candidate-only", "intake current state mismatch");

for (const flag of [
  "windows_public_artifact_ready",
  "windows_installer_ready",
  "windows_public_artifact_upload_allowed",
  "windows_local_runtime_smoke_passed",
  "release_packaging_allowed",
  "generated_artifact_commit_allowed",
]) {
  assert(intake[flag] === false, `${flag} is not false`);
}

for (const item of [
  "webview2_runtime_smoke",
  "tauri_app_data_storage_roots",
  "path_separator_review",
  "encrypted_store_parity",
  "local_deletion_behavior_review",
  "redacted_diagnostics_review",
  "explicit_user_action_review",
  "no_auto_update_parity",
  "local_manual_envelope_default_path",
  "installer_signing_decisions",
  "checksum_provenance",
  "public_upload_hold_review",
]) {
  assert(intake.parity_gap_items.includes(item), `missing parity gap item ${item}`);
}

for (const evidence of [
  "scripts/desktop_windows_readiness_source_audit_once.sh",
  "scripts/desktop_windows_local_runtime_smoke_boundary_once.sh",
  "apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs",
  "apps/desktop-tauri/package.json:test:windows-boundary",
  "scripts/public_release_readiness_preflight.sh",
]) {
  assert(intake.source_evidence.includes(evidence), `missing source evidence ${evidence}`);
}

for (const nonClaim of [
  "unsigned experimental public beta",
  "sensitive communication prohibited",
  "not audited",
  "not production-ready",
  "no public Windows artifact",
  "no Windows installer",
  "no public artifact upload",
  "Windows local build candidate only",
]) {
  assert(intake.public_non_claims.includes(nonClaim), `missing non-claim ${nonClaim}`);
}
NODE

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/apps/desktop-tauri/README.md"; do
  require_text "$file" "Windows desktop cross-platform parity intake"
  require_text "$file" "windows_desktop_parity_intake.json"
  require_text "$file" "Windows local build candidate"
  require_text "$file" "no public Windows artifact"
  require_text "$file" "no Windows installer"
  require_text "$file" "no public artifact upload"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "WebView2 runtime smoke"
  require_text "$file" "Tauri app-data storage"
  require_text "$file" "path separator"
  require_text "$file" "local deletion behavior"
  require_text "$file" "redacted diagnostics"
  require_text "$file" "explicit user action"
  require_text "$file" "local-manual envelope default path"
done

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "Windows local runtime smoke boundary"
  reject_text "$file" "Windows local runtime smoke passed=true"
  reject_text "$file" "Windows public artifact ready"
  reject_text "$file" "Windows installer ready"
  reject_text "$file" "Windows production-ready"
done

require_text "$ROOT_DIR/apps/desktop-tauri/package.json" '"test:windows-boundary"'
require_text "$ROOT_DIR/apps/desktop-tauri/package.json" "verify-windows-local-runtime-boundary.mjs"
require_text "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" "status=desktop-windows-local-runtime-smoke-boundary-ready"
require_text "$ROOT_DIR/scripts/desktop_windows_readiness_source_audit_once.sh" "status=desktop-windows-readiness-source-audit-ready"
require_text "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_boundary_once.sh" "status=desktop-windows-local-runtime-smoke-boundary-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_windows_parity_intake_once.sh"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "windows_is_local_build_candidate_only"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "windows_public_artifact_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "windows_public_artifact_ready=false"

reject_text "$INTAKE" '"windows_public_artifact_ready": true'
reject_text "$INTAKE" '"windows_installer_ready": true'
reject_text "$INTAKE" '"windows_public_artifact_upload_allowed": true'
reject_text "$INTAKE" '"release_packaging_allowed": true'
reject_text "$INTAKE" '"generated_artifact_commit_allowed": true'

printf 'status=desktop-windows-parity-intake-ready\n'
printf 'windows_desktop_parity_intake=source-boundary-only\n'
printf 'windows_readiness=local-build-candidate-only\n'
printf 'windows_public_artifact_ready=false\n'
printf 'windows_installer_ready=false\n'
printf 'windows_public_artifact_upload_allowed=false\n'
printf 'windows_local_runtime_smoke_passed=false\n'
printf 'release_packaging_allowed=false\n'
printf 'generated_artifact_commit_allowed=false\n'
printf 'production_ready_claim=false\n'
printf 'sensitive_communication_allowed=false\n'
