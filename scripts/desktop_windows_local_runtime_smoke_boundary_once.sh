#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing Windows local runtime smoke boundary input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing Windows local runtime smoke boundary text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden Windows local runtime smoke boundary text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/apps/desktop-tauri/README.md"
)

for file in \
  "${PUBLIC_FILES[@]}" \
  "$ROOT_DIR/apps/desktop-tauri/package.json" \
  "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/main.js" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" \
  "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" \
  "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" \
  "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"; do
  require_file "$file"
done

for file in "${PUBLIC_FILES[@]}"; do
  require_text "$file" "Windows local runtime smoke boundary"
  require_text "$file" "WebView2 runtime smoke"
  require_text "$file" "app-data path review"
  require_text "$file" "path separator review"
  require_text "$file" "local deletion behavior"
  require_text "$file" "redacted diagnostics"
  require_text "$file" "diagnostics behavior"
  require_text "$file" "explicit user action"
  require_text "$file" "local build candidate only"
  require_text "$file" "no public Windows artifact"
  require_text "$file" "no Windows installer"
  require_text "$file" "no public artifact"
  require_text "$file" "public artifact upload"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  reject_text "$file" "Windows local runtime smoke passed=true"
  reject_text "$file" "Windows public-ready"
  reject_text "$file" "Windows production-ready"
done

require_text "$ROOT_DIR/apps/desktop-tauri/package.json" '"test:windows-boundary"'
require_text "$ROOT_DIR/apps/desktop-tauri/package.json" "verify-windows-local-runtime-boundary.mjs"
require_text "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" "status=desktop-windows-local-runtime-smoke-boundary-ready"
require_text "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" "windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary"
require_text "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" "windows_local_deletion_behavior_review_required=true"
require_text "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" "windows_redacted_diagnostics_behavior_review_required=true"
require_text "$ROOT_DIR/apps/desktop-tauri/scripts/verify-windows-local-runtime-boundary.mjs" "windows_explicit_user_action_review_required=true"

require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_windows_local_runtime_smoke_boundary_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_local_deletion_behavior_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_redacted_diagnostics_behavior_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_explicit_user_action_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_upload_allowed=false"
require_text "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" "desktop_windows_local_runtime_smoke_boundary_once.sh"
require_text "$ROOT_DIR/scripts/public_claim_acceptance_once.sh" "desktop_windows_local_runtime_smoke_boundary_once.sh"

(
  cd "$ROOT_DIR"
  npm --prefix apps/desktop-tauri run test:windows-boundary
)
