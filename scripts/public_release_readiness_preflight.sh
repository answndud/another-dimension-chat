#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DMG="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
EXPECTED_DMG_SHA="7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a"
EXPECTED_RELEASE_FILES=(
  "$RELEASE_DMG"
  "$RELEASE_DMG.sha256"
  "$RELEASE_DMG.provenance.json"
  "INSTALL_UNSIGNED_MACOS.md"
  "RELEASE_NOTES.md"
  "GITHUB_RELEASE_BODY.md"
  "UPDATE_INTEGRITY.md"
  "SUPPLY_CHAIN_BASELINE.md"
  "DEPENDENCY_INVENTORY.md"
  "PUBLIC_THREAT_MODEL.md"
  "PRIVACY_MODEL_COMPARISON.md"
  "INDEPENDENT_REVIEW_PACKET.md"
  "PUBLIC_INTAKE_POLICY.md"
  "REPOSITORY_GOVERNANCE.md"
  "COMPONENT_BOUNDARIES.md"
  "DEPENDENCY_LOCKFILES.sha256"
  "OPERATOR_FINAL_HANDOFF.md"
  "MANIFEST.md"
)

run_step() {
  local name="$1"
  shift
  echo "step=$name"
  "$@"
}

require_text() {
  local file="$1"
  local expected="$2"
  if ! grep -Fq -- "$expected" "$file"; then
    echo "FAIL stale existing release output missing expected text in $file: $expected" >&2
    exit 1
  fi
}

require_same_file() {
  local source="$1"
  local copied="$2"
  if ! cmp -s "$source" "$copied"; then
    echo "FAIL stale existing release output differs from source: $copied" >&2
    exit 1
  fi
}

check_existing_release_output() {
  local release_dir="$ROOT_DIR/apps/desktop-tauri/public-release/unsigned-public-beta"
  if [ ! -d "$release_dir" ]; then
    echo "existing_release_output=absent"
    return
  fi

  echo "existing_release_output=present"
  local expected_files
  local actual_files
  expected_files="$(printf '%s\n' "${EXPECTED_RELEASE_FILES[@]}" | LC_ALL=C sort)"
  actual_files="$(cd "$release_dir" && find . -maxdepth 1 -type f -print | sed 's#^\./##' | LC_ALL=C sort)"
  if [ "$actual_files" != "$expected_files" ]; then
    echo "FAIL existing release output file list differs from MANIFEST allowlist" >&2
    printf 'expected:\n%s\nactual:\n%s\n' "$expected_files" "$actual_files" >&2
    exit 1
  fi

  require_text "$release_dir/MANIFEST.md" "Operator Upload Boundary"
  require_text "$release_dir/MANIFEST.md" "OPERATOR_FINAL_HANDOFF.md"
  require_text "$release_dir/MANIFEST.md" "Do not upload \`docs/\`, \`beta-artifacts/\`, the \`public-release/\` folder itself"
  require_text "$release_dir/GITHUB_RELEASE_BODY.md" "Upload boundary for operators"
  require_text "$release_dir/GITHUB_RELEASE_BODY.md" "OPERATOR_FINAL_HANDOFF.md"
  require_text "$release_dir/GITHUB_RELEASE_BODY.md" "Use \`GITHUB_RELEASE_BODY.md\` exactly as"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Operator Final Handoff"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Final Operation Decision Summary"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Upload decision: proceed only after the source preflight prints"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Hold decision: do not upload, do not announce, and return to desktop hardening"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Operation boundary: this handoff does not perform a GitHub Release upload"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Next development axis after this handoff: desktop post-release hardening or"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "source_acceptance=desktop-release-source-accepted-for-operator-staging"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "decision=proceed-to-packaging-only-with-frozen-ignored-dmg"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "status=unsigned-public-beta-release-ready"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Download the DMG and \`.sha256\` from the published GitHub Release"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "attached to the same GitHub Release"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "auto-update manifest"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "store approval"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "release or update authority"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "If any after-upload confirmation fails"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Do not announce the release as ready"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Remove the incorrect release assets or move the GitHub Release back to a held"
  require_text "$release_dir/OPERATOR_FINAL_HANDOFF.md" "Return to desktop hardening if the source preflight or regenerated upload set"
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"upload_allowlist_source\": \"MANIFEST.md\""
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"upload_forbidden\": \"docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data\""
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"same_release_asset_set_authority_required\": true"
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"branch_or_source_archive_update_authority\": false"
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"auto_update_manifest_trusted\": false"
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"platform_signing_trust_boundary\": false"
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"notarization_trust_boundary\": false"
  require_text "$release_dir/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json" "\"store_trust_boundary\": false"
  require_text "$release_dir/$RELEASE_DMG.sha256" "$EXPECTED_DMG_SHA"

  local actual_dmg_sha
  actual_dmg_sha="$(shasum -a 256 "$release_dir/$RELEASE_DMG" | awk '{print $1}')"
  if [ "$actual_dmg_sha" != "$EXPECTED_DMG_SHA" ]; then
    echo "FAIL existing release output DMG SHA-256 mismatch" >&2
    echo "expected: $EXPECTED_DMG_SHA" >&2
    echo "actual:   $actual_dmg_sha" >&2
    exit 1
  fi

  require_same_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "$release_dir/INSTALL_UNSIGNED_MACOS.md"
  require_same_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$release_dir/RELEASE_NOTES.md"
  require_same_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "$release_dir/GITHUB_RELEASE_BODY.md"
  require_same_file "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "$release_dir/UPDATE_INTEGRITY.md"
  require_same_file "$ROOT_DIR/reference/SUPPLY_CHAIN_BASELINE.md" "$release_dir/SUPPLY_CHAIN_BASELINE.md"
  require_same_file "$ROOT_DIR/reference/DEPENDENCY_INVENTORY.md" "$release_dir/DEPENDENCY_INVENTORY.md"
  require_same_file "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "$release_dir/PUBLIC_THREAT_MODEL.md"
  require_same_file "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "$release_dir/PRIVACY_MODEL_COMPARISON.md"
  require_same_file "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "$release_dir/INDEPENDENT_REVIEW_PACKET.md"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "Public Intake Policy"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "Forbidden Public Intake"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "Public Diagnostics Boundary"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "unsigned experimental public"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "secure production messaging"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "audited security"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "sensitive communication safety"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "production-ready E2EE"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "raw logs"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "onion endpoints"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "invite codes"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "message text"
  require_text "$release_dir/PUBLIC_INTAKE_POLICY.md" "local paths"
  require_same_file "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "$release_dir/REPOSITORY_GOVERNANCE.md"
  require_same_file "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "$release_dir/COMPONENT_BOUNDARIES.md"

  local lockfile_hashes
  lockfile_hashes="$(mktemp)"
  (
    cd "$ROOT_DIR"
    shasum -a 256 \
      Cargo.lock \
      apps/desktop-tauri/src-tauri/Cargo.lock \
      apps/desktop-tauri/package-lock.json
  ) > "$lockfile_hashes"
  if ! cmp -s "$lockfile_hashes" "$release_dir/DEPENDENCY_LOCKFILES.sha256"; then
    rm -f "$lockfile_hashes"
    echo "FAIL existing release output dependency lockfile evidence is stale" >&2
    exit 1
  fi
  rm -f "$lockfile_hashes"

  echo "existing_release_output_file_list=manifest-allowlist-only"
  echo "existing_release_output_reference_copies=strict-except-public-intake"
  echo "existing_release_output_public_intake=baseline-present-source-may-be-newer"
  echo "existing_release_output_lockfiles=current"
  echo "existing_release_output_status=current"
}

echo "preflight=public-release-readiness"
echo "scope=source-only-no-dmg-required-no-generated-artifacts"
echo "artifact_generation=false"
echo "dmg_required=false"
echo "network_or_onion_work=false"
echo "checks=artifact-boundary,update-integrity-policy,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance"
echo "checks_run=artifact-boundary,update-integrity-policy,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance"

run_step artifact-boundary "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-artifact-boundary
run_step update-integrity-policy "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-policy
run_step desktop-beta-acceptance-matrix "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh"
run_step desktop-public-beta-source-freeze "$ROOT_DIR/scripts/desktop_public_beta_source_freeze_once.sh"
run_step desktop-windows-readiness-source-audit "$ROOT_DIR/scripts/desktop_windows_readiness_source_audit_once.sh"
run_step desktop-windows-local-runtime-smoke-boundary "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_boundary_once.sh"
run_step desktop-real-user-test-prep "$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh"
run_step desktop-default-transport-boundary "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh"
run_step public-beta-gap "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
run_step public-claim-acceptance env PUBLIC_RELEASE_PREFLIGHT_CHILD=1 "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"
run_step existing-release-output check_existing_release_output

echo "status=public-release-readiness-source-preflight-ready"
echo "source_acceptance=desktop-release-source-accepted-for-operator-staging"
echo "decision=proceed-to-packaging-only-with-frozen-ignored-dmg"
echo "operator_explicit_request_required=true"
echo "operator_request_gate_text=Explicit operator request gate: do not package, upload, or announce unless the user explicitly requested release packaging/upload in the current task"
echo "release_packaging_upload_hold_without_explicit_request=true"
echo "packaging_upload_permitted_this_run=false"
echo "fallback=return-to-desktop-hardening-if-source-preflight-fails"
echo "scope=source-only-no-dmg-required-no-generated-artifacts"
echo "artifact_generation=false"
echo "generated_artifacts_created=false"
echo "release_artifact_generation=false"
echo "source_freeze=desktop-public-beta-source-candidate"
echo "source_freeze_scope=desktop-source-only-no-dmg-rebuild-no-upload"
echo "source_freeze_next_axes=release-packaging-upload-after-explicit-user-request#windows-readiness#real-user-test-prep#default-transport-boundary"
echo "release_upload_performed=false"
echo "dmg_rebuild_performed=false"
echo "windows_readiness=local-build-candidate-only"
echo "windows_public_artifact_ready=false"
echo "windows_installer_ready=false"
echo "windows_runtime_smoke_required=true"
echo "windows_app_data_path_review_required=true"
echo "windows_path_separator_review_required=true"
echo "windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary"
echo "windows_local_deletion_behavior_review_required=true"
echo "windows_redacted_diagnostics_behavior_review_required=true"
echo "windows_explicit_user_action_review_required=true"
echo "windows_public_artifact_upload_allowed=false"
echo "real_user_test_prep=redacted-intake-ready"
echo "real_user_test_allowed_fields=app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network"
echo "real_user_test_forbidden_fields=raw-logs#endpoints#invite-codes#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#key-material#private-planning-notes"
echo "real_user_test_external_success_claim=false"
echo "real_user_test_production_ready_claim=false"
echo "real_user_test_sensitive_communication_allowed=false"
echo "real_user_test_hold_criteria=missing-redacted-diagnostics#forbidden-private-data#network-before-explicit-action#checksum-mismatch"
echo "real_user_test_abort_criteria=secrets-exposed#raw-logs-requested#external-success-claim-requested#sensitive-use-requested"
echo "default_transport_boundary=local-manual-envelope-default-high-risk-onion-explicit"
echo "default_transport_path=local-manual-encrypted-envelope-exchange"
echo "default_transport_network_io=false"
echo "default_transport_automatic_delivery=false"
echo "default_transport_central_message_server=false"
echo "default_transport_push_dependency=false"
echo "default_transport_central_contact_discovery=false"
echo "automatic_network_on_launch=false"
echo "high_risk_onion_path=explicit-user-triggered-fail-closed"
echo "high_risk_onion_direct_fallback=false"
echo "dmg_required=false"
echo "network_or_onion_work=false"
echo "external_delivery_claim=false"
echo "security_ready_claim=false"
echo "final_security_ready_acceptance=false"
echo "desktop_beta_acceptance_matrix=invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim"
echo "desktop_beta_acceptance_scope=desktop-local-manual-beta-readiness"
echo "desktop_beta_acceptance_excluded=android-ios-runtime#external-peer-evidence#audit#production-ready#security-ready#sensitive-communication"
echo "operator_final_handoff=OPERATOR_FINAL_HANDOFF.md"
echo "operator_request_gate=explicit-user-request-required-before-packaging-upload"
echo "operator_after_upload_verify=same-release-sha256-before-opening"
echo "operator_update_authority=same-release-assets-only-no-auto-update-manifest-signing-notarization-store-branch-source-archive"
echo "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"
echo "operator_non_claims=unsigned experimental public beta; not audited; not production-ready; sensitive communication prohibited; external_delivery_claim=false; security_ready_claim=false"
echo "operator_handoff_wrapup=upload-only-after-explicit-user-request-source-and-staging-statuses-otherwise-hold-and-return-to-desktop-hardening"
echo "next_development_axis=release-packaging-upload-after-explicit-user-request#windows-readiness#real-user-test-prep#default-transport-boundary"
echo "next=choose release packaging/upload only after explicit user request, Windows readiness, real-user test preparation, or default transport boundary"
