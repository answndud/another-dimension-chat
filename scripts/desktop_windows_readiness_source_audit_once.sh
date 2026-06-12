#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing Windows desktop readiness source audit input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing Windows desktop readiness source audit text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden Windows desktop readiness source audit text in $file: $text" >&2
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
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/tauri.conf.json" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" \
  "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" \
  "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" \
  "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"; do
  require_file "$file"
done

for file in "${PUBLIC_FILES[@]}"; do
  require_text "$file" "Windows desktop readiness source audit"
  require_text "$file" "local build candidate only"
  require_text "$file" "no public Windows artifact"
  require_text "$file" "no Windows installer"
  require_text "$file" "WebView2"
  require_text "$file" "app-data"
  require_text "$file" "redacted diagnostics"
  require_text "$file" "explicit user action"
  require_text "$file" "no auto-update"
  require_text "$file" "signing"
  require_text "$file" "not a security boundary"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  reject_text "$file" "Windows public artifact ready"
  reject_text "$file" "Windows installer ready"
  reject_text "$file" "Windows production-ready"
  reject_text "$file" "Windows signing proves security"
done

require_text "$ROOT_DIR/apps/desktop-tauri/package.json" '"tauri:build"'
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/tauri.conf.json" '"targets": "all"'
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "windows_is_local_build_candidate_only"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "windows_distribution: \"local-build-candidate-only\""
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "tauri_app_data_resolver_required: true"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "tauri_app_cache_resolver_required: true"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "encrypted_store_required: true"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "local_storage_paths_in_diagnostics_allowed: false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "local_deletion_controls_required: true"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "explicit_user_action_required: true"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "automatic_network_on_launch_allowed: false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "auto_update_channel: false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "signing_notarization_or_store_trusted_security_boundary: false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "windows_dpapi_required: false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "public_beta_security_ready_claimed: false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/lib.rs" "sensitive_communication_allowed: false"

require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "desktop_platform_scope=macos-public-beta-windows-local-build-candidate"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "windows_public_artifact_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "windows_installer_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "windows_signing_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "microsoft_store_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "smart_screen_reputation_claim=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "windows_runtime_smoke_required=true"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "windows_app_data_path_review_required=true"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "windows_path_separator_review_required=true"
require_text "$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs" "public_artifact_upload_allowed=false"

require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "windows_public_artifact_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "windows_installer_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "windows_release_blocker=local-build-smoke-and-release-boundary-review"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "windows_public_artifact_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "windows_installer_ready=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" "windows_public_artifact_ready=false"

require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_windows_readiness_source_audit_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_readiness=local-build-candidate-only"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_ready=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_installer_ready=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_runtime_smoke_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_app_data_path_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_path_separator_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_upload_allowed=false"

require_text "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" "desktop_windows_readiness_source_audit_once.sh"
require_text "$ROOT_DIR/scripts/public_claim_acceptance_once.sh" "desktop_windows_readiness_source_audit_once.sh"

bash -n "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
bash -n "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"

echo "status=desktop-windows-readiness-source-audit-ready"
echo "windows_readiness=local-build-candidate-only"
echo "windows_public_artifact_ready=false"
echo "windows_installer_ready=false"
echo "windows_signing_ready=false"
echo "microsoft_store_ready=false"
echo "smart_screen_reputation_claim=false"
echo "windows_runtime_smoke_required=true"
echo "windows_app_data_path_review_required=true"
echo "windows_path_separator_review_required=true"
echo "windows_webview2_required=true"
echo "windows_public_artifact_upload_allowed=false"
echo "auto_update_channel=false"
echo "signing_trust_boundary=false"
echo "production_ready_claim=false"
echo "sensitive_communication_allowed=false"
echo "next_development_axis=windows-local-runtime-smoke-boundary#real-user-test-prep#default-transport-boundary"
