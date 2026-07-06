#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop public beta source freeze input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop public beta source freeze text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop public beta source freeze text in $file: $text" >&2
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
  "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" \
  "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" \
  "$ROOT_DIR/scripts/public_claim_acceptance_once.sh" \
  "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh" \
  "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js"; do
  require_file "$file"
done

for file in "${PUBLIC_FILES[@]}"; do
  require_text "$file" "Desktop public beta source freeze candidate"
  require_text "$file" "source-only candidate"
  require_text "$file" "no DMG rebuild"
  require_text "$file" "no upload"
  require_text "$file" "non-claims"
  require_text "$file" "redacted diagnostics"
  require_text "$file" "release"
  require_text "$file" "boundary"
  require_text "$file" "desktop flow blocker checks"
  require_text "$file" "release packaging/upload"
  require_text "$file" "explicit user request"
  require_text "$file" "Windows"
  require_text "$file" "real-user test preparation"
  require_text "$file" "default-transport-boundary"
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "External onion delivery is outside the v0.1 public product claim"
  reject_text "$file" "desktop source freeze proves external onion delivery"
  reject_text "$file" "desktop source freeze proves production readiness"
  reject_text "$file" "desktop source freeze proves security readiness"
  reject_text "$file" "desktop source freeze allows sensitive communication"
done

require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "desktop_acceptance_external_delivery_claim=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "desktop_acceptance_production_claim=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "desktop_acceptance_sensitive_use_claim=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "diagnostics_security_ready_proof_claim=false"

require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_public_beta_source_freeze_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "checks=artifact-boundary,update-integrity-policy,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "checks_run=artifact-boundary,update-integrity-policy,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze=desktop-public-beta-source-candidate"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze_scope=desktop-source-only-no-dmg-rebuild-no-upload"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze_next_axes=release-packaging-upload-after-explicit-user-request#windows-readiness#real-user-test-prep#default-transport-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "release_upload_performed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "dmg_rebuild_performed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "release_artifact_generation=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "dmg_required=false"

require_text "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" "desktop_public_beta_source_freeze_once.sh"
require_text "$ROOT_DIR/scripts/public_claim_acceptance_once.sh" "desktop_public_beta_source_freeze_once.sh"
require_text "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh" "desktop_acceptance_external_delivery_claim=false"
require_text "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh" "desktop_acceptance_production_claim=false"
require_text "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh" "desktop_acceptance_sensitive_use_claim=false"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "source_acceptance=desktop-release-source-accepted-for-operator-staging"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operation boundary: this handoff does not perform a GitHub Release upload"

bash -n "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
bash -n "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh"

echo "status=desktop-public-beta-source-freeze-candidate-ready"
echo "source_freeze=desktop-public-beta-source-candidate"
echo "source_freeze_scope=desktop-source-only-no-dmg-rebuild-no-upload"
echo "source_acceptance=desktop-source-accepted-for-beta-candidate"
echo "final_source_acceptance=non-claims#redacted-diagnostics#release-boundary#desktop-flow-blockers"
echo "next_development_axis=release-packaging-upload-after-explicit-user-request#windows-readiness#real-user-test-prep#default-transport-boundary"
echo "release_upload_performed=false"
echo "dmg_rebuild_performed=false"
echo "release_artifact_generation=false"
echo "external_delivery_claim=false"
echo "production_ready_claim=false"
echo "security_ready_claim=false"
echo "sensitive_communication_allowed=false"
echo "next=choose release packaging/upload only after explicit user request, Windows readiness, real-user test preparation, or default transport boundary"
