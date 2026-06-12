#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing public beta acceptance input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing required public beta text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden public beta text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_CLAIM_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/apps/desktop-tauri/src/i18n.js"
  "$ROOT_DIR/apps/desktop-tauri/README.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
  "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
  "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
)

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  require_file "$file"
done

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "$ROOT_DIR/apps/desktop-tauri/README.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

require_text "$ROOT_DIR/README.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/SECURITY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "No peer report is"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Release body"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "--check-artifact-boundary"
require_file "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "prepare_unsigned_public_beta_release.sh\" --check-artifact-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "prepare_unsigned_public_beta_release.sh\" --check-policy"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "public_beta_gap_acceptance_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "public_claim_acceptance_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_status=current"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_file_list=manifest-allowlist-only"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_reference_copies=current"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_lockfiles=current"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing release output file list differs from MANIFEST allowlist"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing release output dependency lockfile evidence is stale"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "If any after-upload confirmation fails"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Do not announce the release as ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Return to desktop hardening if the source preflight or regenerated upload set"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "stale existing release output"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "preflight=public-release-readiness"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "status=public-release-readiness-source-preflight-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_acceptance=desktop-release-source-accepted-for-operator-staging"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "decision=proceed-to-packaging-only-with-frozen-ignored-dmg"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "fallback=return-to-desktop-hardening-if-source-preflight-fails"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "scope=source-only-no-dmg-required-no-generated-artifacts"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "artifact_generation=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "dmg_required=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "network_or_onion_work=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "checks=artifact-boundary,update-integrity-policy,public-beta-gap,public-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "checks_run=artifact-boundary,update-integrity-policy,public-beta-gap,public-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "generated_artifacts_created=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "release_artifact_generation=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "external_delivery_claim=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "security_ready_claim=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "final_security_ready_acceptance=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_final_handoff=OPERATOR_FINAL_HANDOFF.md"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_after_upload_verify=same-release-sha256-before-opening"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_non_claims=unsigned experimental public beta; not audited; not production-ready; sensitive communication prohibited; external_delivery_claim=false; security_ready_claim=false"
require_text "$ROOT_DIR/README.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/README.md" 'pinned public-release source DMG accepted by `scripts/prepare_unsigned_public_beta_release.sh`'
require_text "$ROOT_DIR/SECURITY.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/SECURITY.md" "source-only preflight before staging artifacts"
require_text "$ROOT_DIR/SECURITY.md" 'pinned ignored public-release source DMG accepted by `scripts/prepare_unsigned_public_beta_release.sh`'
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "source-only preflight"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" 'upload only the files listed in the generated `MANIFEST.md`'
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "This generic Tauri build output is not a public release upload artifact."
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "release output must stay under ignored apps/desktop-tauri/public-release/"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Packaging decision: proceed-to-packaging-only-with-frozen-ignored-dmg"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Packaging fallback: return-to-desktop-hardening-if-source-preflight-fails"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "OPERATOR_FINAL_HANDOFF.md"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operator Final Handoff"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "source_acceptance=desktop-release-source-accepted-for-operator-staging"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "decision=proceed-to-packaging-only-with-frozen-ignored-dmg"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "status=unsigned-public-beta-release-ready"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "If any after-upload confirmation fails"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Do not announce the release as ready"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Return to desktop hardening if the source preflight or regenerated upload set"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_allowlist_source": "MANIFEST.md"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_release_body": "GITHUB_RELEASE_BODY.md"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_forbidden": "docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operator Upload Boundary"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "next=upload all and only generated files listed in MANIFEST.md from release_dir"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_upload_allowlist=MANIFEST.md"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" 'operator_final_handoff=$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "INSTALL_UNSIGNED_MACOS.md"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "PUBLIC_THREAT_MODEL.md"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "PRIVACY_MODEL_COMPARISON.md"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "INDEPENDENT_REVIEW_PACKET.md"
require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "Upload boundary for operators"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" 'Use `GITHUB_RELEASE_BODY.md` exactly as'
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "OPERATOR_FINAL_HANDOFF.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "external_delivery_claim=false"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "security_ready_claim=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "PRIVACY_MODEL_COMPARISON.md"
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" 'Upload files from `apps/desktop-tauri/public-release/unsigned-public-beta/` only'
reject_text "$ROOT_DIR/apps/desktop-tauri/README.md" "manual network permission state"
reject_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "external delivery evidence must come from real peer reports"
reject_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "실제 peer report에서만"
reject_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "manual network"
reject_text "$ROOT_DIR/README.md" "scripts/prepare_unsigned_public_beta_release.sh --check-artifact-boundary"
reject_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "scripts/prepare_unsigned_public_beta_release.sh --check-artifact-boundary"

echo "status=public-beta-external-delivery-nonclaim-accepted"
echo "external_delivery_claim=false"
echo "security_ready_claim=false"
echo "next=prepare or upload unsigned public beta artifacts without claiming external onion delivery"
