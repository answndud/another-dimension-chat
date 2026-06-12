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
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_beta_acceptance_matrix_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_public_beta_source_freeze_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_windows_readiness_source_audit_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_windows_local_runtime_smoke_boundary_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_real_user_test_prep_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "public_beta_gap_acceptance_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "public_claim_acceptance_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_status=current"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_file_list=manifest-allowlist-only"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_reference_copies=strict-except-public-intake"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_public_intake=baseline-present-source-may-be-newer"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing_release_output_lockfiles=current"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing release output file list differs from MANIFEST allowlist"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "existing release output dependency lockfile evidence is stale"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "If any after-upload confirmation fails"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Do not announce the release as ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Return to desktop hardening if the source preflight or regenerated upload set"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Final Operation Decision Summary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Upload decision: proceed only after the source preflight prints"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Explicit operator request gate: do not package, upload, or announce unless the user explicitly requested release packaging/upload in the current task"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Hold decision: do not upload, do not announce, and return to desktop hardening"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "Operation boundary: this handoff does not perform a GitHub Release upload"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "next_development_axis=release-packaging-upload-after-explicit-user-request#windows-readiness#real-user-test-prep#default-transport-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "stale existing release output"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "preflight=public-release-readiness"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "status=public-release-readiness-source-preflight-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_acceptance=desktop-release-source-accepted-for-operator-staging"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "decision=proceed-to-packaging-only-with-frozen-ignored-dmg"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_explicit_request_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "release_packaging_upload_hold_without_explicit_request=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "packaging_upload_permitted_this_run=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "fallback=return-to-desktop-hardening-if-source-preflight-fails"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "scope=source-only-no-dmg-required-no-generated-artifacts"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "artifact_generation=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "dmg_required=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "network_or_onion_work=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "checks=artifact-boundary,update-integrity-policy,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "checks_run=artifact-boundary,update-integrity-policy,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "generated_artifacts_created=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "release_artifact_generation=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze=desktop-public-beta-source-candidate"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze_scope=desktop-source-only-no-dmg-rebuild-no-upload"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze_next_axes=release-packaging-upload-after-explicit-user-request#windows-readiness#real-user-test-prep#default-transport-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "release_upload_performed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "dmg_rebuild_performed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_readiness=local-build-candidate-only"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_ready=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_installer_ready=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_runtime_smoke_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_app_data_path_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_path_separator_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_local_deletion_behavior_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_redacted_diagnostics_behavior_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_explicit_user_action_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_upload_allowed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_prep=redacted-intake-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_forbidden_fields=raw-logs#endpoints#invite-codes#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#key-material#private-planning-notes"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_external_success_claim=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_hold_criteria=missing-redacted-diagnostics#forbidden-private-data#network-before-explicit-action#checksum-mismatch"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_abort_criteria=secrets-exposed#raw-logs-requested#external-success-claim-requested#sensitive-use-requested"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_boundary=local-manual-envelope-default-high-risk-onion-explicit"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_network_io=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_automatic_delivery=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_central_message_server=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_push_dependency=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_central_contact_discovery=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "high_risk_onion_path=explicit-user-triggered-fail-closed"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "high_risk_onion_direct_fallback=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "external_delivery_claim=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "security_ready_claim=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "final_security_ready_acceptance=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_beta_acceptance_matrix=invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_beta_acceptance_scope=desktop-local-manual-beta-readiness"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_beta_acceptance_excluded=android-ios-runtime#external-peer-evidence#audit#production-ready#security-ready#sensitive-communication"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_final_handoff=OPERATOR_FINAL_HANDOFF.md"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_request_gate=explicit-user-request-required-before-packaging-upload"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_after_upload_verify=same-release-sha256-before-opening"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "operator_update_authority=same-release-assets-only-no-auto-update-manifest-signing-notarization-store-branch-source-archive"
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
require_file "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh"
require_file "$ROOT_DIR/scripts/desktop_public_beta_source_freeze_once.sh"
require_file "$ROOT_DIR/scripts/desktop_windows_readiness_source_audit_once.sh"
require_file "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_boundary_once.sh"
require_file "$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh"
require_file "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh"
require_text "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh" 'ACCEPTED_ITEMS="invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim"'
require_text "$ROOT_DIR/scripts/desktop_public_beta_source_freeze_once.sh" "status=desktop-public-beta-source-freeze-candidate-ready"
require_text "$ROOT_DIR/scripts/desktop_public_beta_source_freeze_once.sh" "source_freeze_scope=desktop-source-only-no-dmg-rebuild-no-upload"
require_text "$ROOT_DIR/scripts/desktop_public_beta_source_freeze_once.sh" "next_development_axis=release-packaging-upload-after-explicit-user-request#windows-readiness#real-user-test-prep#default-transport-boundary"
require_text "$ROOT_DIR/scripts/desktop_windows_readiness_source_audit_once.sh" "status=desktop-windows-readiness-source-audit-ready"
require_text "$ROOT_DIR/scripts/desktop_windows_readiness_source_audit_once.sh" "windows_readiness=local-build-candidate-only"
require_text "$ROOT_DIR/scripts/desktop_windows_readiness_source_audit_once.sh" "windows_public_artifact_ready=false"
require_text "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_boundary_once.sh" "npm --prefix apps/desktop-tauri run test:windows-boundary"
require_text "$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh" "status=desktop-real-user-test-prep-source-ready"
require_text "$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh" "real_user_test_external_success_claim=false"
require_text "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh" "status=desktop-default-transport-boundary-source-ready"
require_text "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh" "default_transport_boundary=local-manual-envelope-default-high-risk-onion-explicit"
require_text "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh" "default_transport_network_io=false"
require_text "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh" "high_risk_onion_direct_fallback=false"
require_text "$ROOT_DIR/apps/desktop-tauri/package.json" '"test:windows-boundary"'
require_text "$ROOT_DIR/README.md" "Desktop-only v0.1 acceptance matrix"
require_text "$ROOT_DIR/SECURITY.md" "Desktop-only v0.1 acceptance matrix"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "Desktop-only v0.1 acceptance matrix"
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
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Final Operation Decision Summary"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Upload decision: proceed only after the source preflight prints"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Hold decision: do not upload, do not announce, and return to desktop hardening"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operation boundary: this handoff does not perform a GitHub Release upload"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "next_development_axis=desktop-post-release-hardening-or-non-release-product-work"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_allowlist_source": "MANIFEST.md"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_release_body": "GITHUB_RELEASE_BODY.md"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_forbidden": "docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operator Upload Boundary"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_request_gate=explicit-user-request-required-before-packaging-upload"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "next=hold unless explicit release upload was requested; upload all and only generated files listed in MANIFEST.md from release_dir"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_upload_allowlist=MANIFEST.md"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" 'operator_final_handoff=$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_update_authority=same-release-assets-only-no-auto-update-manifest-signing-notarization-store-branch-source-archive"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"same_release_asset_set_authority_required": true'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"branch_or_source_archive_update_authority": false'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"auto_update_manifest_trusted": false'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"platform_signing_trust_boundary": false'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"notarization_trust_boundary": false'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"store_trust_boundary": false'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "not release or update authority for a downloaded DMG"
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
