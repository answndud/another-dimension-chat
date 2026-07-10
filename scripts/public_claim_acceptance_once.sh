#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing public claim file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing public claim text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden public claim text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_CLAIM_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
  "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md"
  "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
  "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
  "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md"
  "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md"
)

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  require_file "$file"
done

require_file "$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh"
bash -n "$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh"
"$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh" >/dev/null

require_text "$ROOT_DIR/README.md" "This project does not currently provide a secure messenger."
require_text "$ROOT_DIR/SECURITY.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "not a secure messenger release"

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"; do
  require_file "$file"
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

require_text "$ROOT_DIR/README.md" "The beta does not claim Briar/Cwtch equivalence"
require_text "$ROOT_DIR/SECURITY.md" "Briar/Cwtch-equivalent privacy or security level"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "Briar/Cwtch-equivalent."
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "gap map, not a"
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "not audited, not production-ready, and sensitive communication prohibited"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "not an external review result"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Public Claims Not Allowed Today"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Suggested Public-Safe Review Commands"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "practical transport split"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "manual GitHub Release download"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "public support diagnostics"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "workflow state"
require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" 'Private planning notes stay in ignored `docs/`.'
require_text "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "not a secure messenger release today"
require_text "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "Release and updates"
require_text "$ROOT_DIR/README.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/SECURITY.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "public support diagnostics"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "public support diagnostics"
require_text "$ROOT_DIR/README.md" "desktop local-private-flow acceptance blockers"
require_text "$ROOT_DIR/SECURITY.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "desktop local-private-flow acceptance"
require_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_file "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "prepare_unsigned_public_beta_release.sh\" --check-artifact-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "prepare_unsigned_public_beta_release.sh\" --check-policy"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_beta_acceptance_matrix_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_public_beta_source_freeze_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_windows_readiness_source_audit_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_windows_local_runtime_smoke_boundary_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_candidate_gate_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_real_user_test_prep_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_default_transport_boundary_once.sh"
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
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "next_development_axis=windows-artifact-runtime-manifest-evidence#release-packaging-upload-after-explicit-user-request#real-user-test-prep#default-transport-boundary"
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
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "checks=artifact-boundary,update-integrity-policy,high-risk-release-integrity-gate,macos-release-distribution-manifest,public-release-source-path,desktop-supply-chain-surface,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,windows-public-artifact-candidate-gate,public-support-readiness,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance,final-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "checks_run=artifact-boundary,update-integrity-policy,high-risk-release-integrity-gate,macos-release-distribution-manifest,public-release-source-path,desktop-supply-chain-surface,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,windows-public-artifact-candidate-gate,public-support-readiness,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance,final-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "run_step final-claim-acceptance check_final_claim_acceptance_hold"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "final_claim_acceptance=hold-expected"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "final_claim_stable_candidate_blocked_by_p0_p1_audit=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "final_claim_high_risk_blocked_by_missing_required_conditions=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "generated_artifacts_created=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "release_artifact_generation=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze=desktop-public-beta-source-candidate"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze_scope=desktop-source-only-no-dmg-rebuild-no-upload"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "source_freeze_next_axes=windows-artifact-runtime-manifest-evidence#release-packaging-upload-after-explicit-user-request#real-user-test-prep#default-transport-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "release_upload_performed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "dmg_rebuild_performed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_readiness=public-artifact-candidate-source-gate"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_candidate=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_candidate_gate=source-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_candidate_gate_script=scripts/windows_public_artifact_candidate_gate_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "artifact_consistency_sequence=macos-release-distribution-manifest#windows-public-artifact-candidate-gate#final-claim-acceptance"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "macos_artifact_consistency_verified=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_artifact_consistency_verified=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "external_evidence_presence=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "external_evidence_required_for_stable_candidate=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_artifact_type=windows-nsis-exe-installer-candidate"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_bundle_target=nsis"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_ready=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_installer_ready=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_signing_ready=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_packaging_hold_without_explicit_request=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_packaging_upload_permitted_this_run=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_release_request_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_installer_signing_store_claim_allowed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_generated_artifact_commit_allowed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_runtime_smoke_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_app_data_path_review_required=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_path_separator_review_required=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_app_data_resolver=tauri-app-data"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_app_data_resolver_shared_storage_semantics=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_app_data_resolver_public_support_safe=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_raw_local_path_returned=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_support_report_raw_path_allowed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_local_deletion_behavior_review_required=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_redacted_diagnostics_behavior_review_required=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_runtime_result_external_peer_evidence_separated=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_explicit_user_action_review_required=true"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "windows_public_artifact_upload_allowed=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_prep=redacted-intake-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_forbidden_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"
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
require_text "$ROOT_DIR/README.md" 'commit `e8954df9`, and SHA-256 `7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a`'
require_text "$ROOT_DIR/README.md" "This is not a packaging readiness, audit readiness, or release go signal."
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
require_text "$ROOT_DIR/SECURITY.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/SECURITY.md" "source-only preflight before staging artifacts"
require_text "$ROOT_DIR/SECURITY.md" 'pinned ignored public-release source DMG accepted by `scripts/prepare_unsigned_public_beta_release.sh`'
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "source-only preflight"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" 'upload only the files listed in the generated `MANIFEST.md`'
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "Build a local-only installable desktop beta"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "This generic Tauri build output is not a public release upload artifact."
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "separate from the public release packaging input"
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "scripts/public_release_readiness_preflight.sh"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Packaging decision: proceed-to-packaging-only-with-frozen-ignored-dmg"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Packaging fallback: return-to-desktop-hardening-if-source-preflight-fails"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Public diagnostics include: desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "OPERATOR_FINAL_HANDOFF.md"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operator Final Handoff"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "source_acceptance=desktop-release-source-accepted-for-operator-staging"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "decision=proceed-to-packaging-only-with-frozen-ignored-dmg"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "status=unsigned-public-beta-release-ready"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" 'Download the DMG and \`.sha256\` from the published GitHub Release'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "If any after-upload confirmation fails"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Do not announce the release as ready"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Return to desktop hardening if the source preflight or regenerated upload set"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Final Operation Decision Summary"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Upload decision: proceed only after the source preflight prints"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Explicit operator request gate: do not package, upload, or announce unless the"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Hold decision: do not upload, do not announce, and return to desktop hardening"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operation boundary: this handoff does not perform a GitHub Release upload"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "next_development_axis=desktop-post-release-hardening-or-non-release-product-work"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"windows_public_artifact_ready\": false"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"windows_packaging_hold_without_explicit_request\": true"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Windows packaging hold"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "windows_packaging_hold_without_explicit_request=true"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_allowlist_source": "MANIFEST.md"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_release_body": "GITHUB_RELEASE_BODY.md"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" '"upload_forbidden": "docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"'
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operator Upload Boundary"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "--check-artifact-boundary"
require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "release output must stay under ignored apps/desktop-tauri/public-release/"
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
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "OPERATOR_FINAL_HANDOFF.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "Upload boundary for operators"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" 'Use `GITHUB_RELEASE_BODY.md` exactly as'
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" 'Do not upload `docs/`, `beta-artifacts/`, the'
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "or any file not listed in the manifest"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "external_delivery_claim=false"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "security_ready_claim=false"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "PRIVACY_MODEL_COMPARISON.md"
require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" 'Upload files from `apps/desktop-tauri/public-release/unsigned-public-beta/` only'
require_text "$ROOT_DIR/README.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/SECURITY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$ROOT_DIR/README.md" "no external delivery claim is made"
require_text "$ROOT_DIR/SECURITY.md" "report is expected or required for this v0.1 claim"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "No peer report is"

if git -C "$ROOT_DIR" ls-files docs | grep -q .; then
  echo "FAIL private docs are tracked in git" >&2
  git -C "$ROOT_DIR" ls-files docs >&2
  exit 1
fi

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  reject_text "$file" "production-ready secure messenger"
  reject_text "$file" "Briar/Cwtch-equivalent privacy or security level achieved"
  reject_text "$file" "independent review complete=true"
  reject_text "$file" "security_ready_claim=true"
  reject_text "$file" "does not close the external-evidence gate"
  reject_text "$file" "accepted for unsigned public beta release gating only"
done
reject_text "$ROOT_DIR/apps/desktop-tauri/README.md" "manual network permission state"
reject_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "external delivery evidence must come from real peer reports"
reject_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "실제 peer report에서만"
reject_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "manual network"
reject_text "$ROOT_DIR/README.md" "scripts/prepare_unsigned_public_beta_release.sh --check-artifact-boundary"
reject_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "scripts/prepare_unsigned_public_beta_release.sh --check-artifact-boundary"

bash -n "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh"
bash -n "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
if [ "${PUBLIC_RELEASE_PREFLIGHT_CHILD:-0}" != "1" ]; then
  release_dir="$ROOT_DIR/apps/desktop-tauri/public-release/unsigned-public-beta"
  release_dir_existed=false
  if [ -e "$release_dir" ]; then
    release_dir_existed=true
  fi
  preflight_output="$("$ROOT_DIR/scripts/public_release_readiness_preflight.sh")"
  if [ "$release_dir_existed" = false ] && [ -e "$release_dir" ]; then
    echo "FAIL release readiness preflight created generated release artifacts" >&2
    exit 1
  fi
  printf '%s\n' "$preflight_output" | grep -Fq -- "status=public-release-readiness-source-preflight-ready" || {
    echo "FAIL release readiness preflight missing ready status" >&2
    exit 1
  }
  if [ "$release_dir_existed" = true ]; then
    printf '%s\n' "$preflight_output" | grep -Fq -- "existing_release_output_file_list=manifest-allowlist-only" || {
      echo "FAIL release readiness preflight missing exact file-list freshness" >&2
      exit 1
    }
    printf '%s\n' "$preflight_output" | grep -Fq -- "existing_release_output_reference_copies=strict-except-public-intake" || {
      echo "FAIL release readiness preflight missing reference-copy freshness" >&2
      exit 1
    }
    printf '%s\n' "$preflight_output" | grep -Fq -- "existing_release_output_public_intake=baseline-present-source-may-be-newer" || {
      echo "FAIL release readiness preflight missing public intake baseline" >&2
      exit 1
    }
    printf '%s\n' "$preflight_output" | grep -Fq -- "existing_release_output_lockfiles=current" || {
      echo "FAIL release readiness preflight missing lockfile freshness" >&2
      exit 1
    }
  fi
  printf '%s\n' "$preflight_output" | grep -Fq -- "source_acceptance=desktop-release-source-accepted-for-operator-staging" || {
    echo "FAIL release readiness preflight missing source acceptance" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "decision=proceed-to-packaging-only-with-frozen-ignored-dmg" || {
    echo "FAIL release readiness preflight missing packaging decision" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "operator_explicit_request_required=true" || {
    echo "FAIL release readiness preflight missing explicit request gate" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "release_packaging_upload_hold_without_explicit_request=true" || {
    echo "FAIL release readiness preflight missing packaging/upload hold" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "packaging_upload_permitted_this_run=false" || {
    echo "FAIL release readiness preflight unexpectedly permits packaging/upload" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "fallback=return-to-desktop-hardening-if-source-preflight-fails" || {
    echo "FAIL release readiness preflight missing hardening fallback" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "checks_run=artifact-boundary,update-integrity-policy,high-risk-release-integrity-gate,macos-release-distribution-manifest,public-release-source-path,desktop-supply-chain-surface,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,windows-public-artifact-candidate-gate,public-support-readiness,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance,final-claim-acceptance" || {
    echo "FAIL release readiness preflight missing check list" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "scope=source-only-no-dmg-required-no-generated-artifacts" || {
    echo "FAIL release readiness preflight missing source-only scope" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "artifact_generation=false" || {
    echo "FAIL release readiness preflight missing no-artifact-generation boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "generated_artifacts_created=false" || {
    echo "FAIL release readiness preflight missing generated-artifact side-effect boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "release_artifact_generation=false" || {
    echo "FAIL release readiness preflight missing release-artifact-generation boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "source_freeze=desktop-public-beta-source-candidate" || {
    echo "FAIL release readiness preflight missing desktop source freeze marker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "source_freeze_scope=desktop-source-only-no-dmg-rebuild-no-upload" || {
    echo "FAIL release readiness preflight missing desktop source freeze scope" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "source_freeze_next_axes=windows-artifact-runtime-manifest-evidence#release-packaging-upload-after-explicit-user-request#real-user-test-prep#default-transport-boundary" || {
    echo "FAIL release readiness preflight missing desktop source freeze next axes" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "release_upload_performed=false" || {
    echo "FAIL release readiness preflight missing release upload non-action" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "dmg_rebuild_performed=false" || {
    echo "FAIL release readiness preflight missing DMG rebuild non-action" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_readiness=public-artifact-candidate-source-gate" || {
    echo "FAIL release readiness preflight missing Windows readiness boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_public_artifact_candidate_gate=source-ready" || {
    echo "FAIL release readiness preflight missing Windows candidate source gate" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "artifact_consistency_sequence=macos-release-distribution-manifest#windows-public-artifact-candidate-gate#final-claim-acceptance" || {
    echo "FAIL release readiness preflight missing artifact consistency sequence" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "macos_artifact_consistency_verified=false" || {
    echo "FAIL release readiness preflight missing macOS artifact consistency blocker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_artifact_consistency_verified=false" || {
    echo "FAIL release readiness preflight missing Windows artifact consistency blocker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "external_evidence_presence=false" || {
    echo "FAIL release readiness preflight missing external evidence blocker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_public_artifact_ready=false" || {
    echo "FAIL release readiness preflight missing Windows public artifact non-readiness" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_installer_ready=false" || {
    echo "FAIL release readiness preflight missing Windows installer non-readiness" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_signing_ready=false" || {
    echo "FAIL release readiness preflight missing Windows signing non-readiness" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_packaging_hold_without_explicit_request=true" || {
    echo "FAIL release readiness preflight missing Windows packaging hold" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_packaging_upload_permitted_this_run=false" || {
    echo "FAIL release readiness preflight missing Windows packaging/upload non-permission" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_public_artifact_release_request_required=true" || {
    echo "FAIL release readiness preflight missing Windows public artifact release request gate" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_runtime_smoke_required=true" || {
    echo "FAIL release readiness preflight missing Windows runtime smoke blocker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_app_data_path_review_required=false" || {
    echo "FAIL release readiness preflight missing Windows app-data source closure" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_path_separator_review_required=false" || {
    echo "FAIL release readiness preflight missing Windows path separator source closure" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_app_data_resolver=tauri-app-data" || {
    echo "FAIL release readiness preflight missing Windows app-data resolver" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_raw_local_path_returned=false" || {
    echo "FAIL release readiness preflight missing Windows raw path non-return" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary" || {
    echo "FAIL release readiness preflight missing Windows runtime smoke source command" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_local_deletion_behavior_review_required=false" || {
    echo "FAIL release readiness preflight missing Windows local deletion source closure" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_redacted_diagnostics_behavior_review_required=false" || {
    echo "FAIL release readiness preflight missing Windows redacted diagnostics source closure" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_runtime_result_external_peer_evidence_separated=true" || {
    echo "FAIL release readiness preflight missing Windows runtime evidence separation" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_explicit_user_action_review_required=true" || {
    echo "FAIL release readiness preflight missing Windows explicit action review blocker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "windows_public_artifact_upload_allowed=false" || {
    echo "FAIL release readiness preflight missing Windows upload hold" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "real_user_test_prep=redacted-intake-ready" || {
    echo "FAIL release readiness preflight missing real-user test prep status" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "real_user_test_allowed_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness" || {
    echo "FAIL release readiness preflight missing real-user allowed fields" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "real_user_test_forbidden_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles" || {
    echo "FAIL release readiness preflight missing real-user forbidden fields" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "real_user_test_external_success_claim=false" || {
    echo "FAIL release readiness preflight missing real-user external success non-claim" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "real_user_test_hold_criteria=missing-redacted-diagnostics#forbidden-private-data#network-before-explicit-action#checksum-mismatch" || {
    echo "FAIL release readiness preflight missing real-user hold criteria" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "real_user_test_abort_criteria=secrets-exposed#raw-logs-requested#external-success-claim-requested#sensitive-use-requested" || {
    echo "FAIL release readiness preflight missing real-user abort criteria" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "default_transport_boundary=local-manual-envelope-default-high-risk-onion-explicit" || {
    echo "FAIL release readiness preflight missing default transport boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "default_transport_network_io=false" || {
    echo "FAIL release readiness preflight missing default transport network non-claim" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "default_transport_central_message_server=false" || {
    echo "FAIL release readiness preflight missing central message server exclusion" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "high_risk_onion_direct_fallback=false" || {
    echo "FAIL release readiness preflight missing high-risk direct fallback exclusion" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "dmg_required=false" || {
    echo "FAIL release readiness preflight missing no-DMG-required boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "network_or_onion_work=false" || {
    echo "FAIL release readiness preflight missing no-network boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "external_delivery_claim=false" || {
    echo "FAIL release readiness preflight missing external delivery non-claim" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "security_ready_claim=false" || {
    echo "FAIL release readiness preflight missing security-ready non-claim" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "final_security_ready_acceptance=false" || {
    echo "FAIL release readiness preflight missing final acceptance non-claim" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "final_claim_acceptance=hold-expected" || {
    echo "FAIL release readiness preflight missing final claim hold status" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "final_claim_stable_candidate_blocked_by_p0_p1_audit=true" || {
    echo "FAIL release readiness preflight missing P0/P1 stable candidate blocker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "final_claim_stable_public_app_blocked_by_p0_p1_audit=true" || {
    echo "FAIL release readiness preflight missing P0/P1 stable app blocker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "final_claim_high_risk_mode_ready=false" || {
    echo "FAIL release readiness preflight missing final High-Risk hold" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "final_claim_high_risk_required_conditions_missing=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-encryption-evidence#release-integrity" || {
    echo "FAIL release readiness preflight missing High-Risk required condition list" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "final_claim_high_risk_blocked_by_missing_required_conditions=true" || {
    echo "FAIL release readiness preflight missing High-Risk condition blocker" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "final_claim_forbidden_positive_public_claims_found=false" || {
    echo "FAIL release readiness preflight missing forbidden positive claim scan status" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "desktop_beta_acceptance_matrix=invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim" || {
    echo "FAIL release readiness preflight missing desktop beta acceptance matrix" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "operator_final_handoff=OPERATOR_FINAL_HANDOFF.md" || {
    echo "FAIL release readiness preflight missing operator handoff" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "operator_request_gate=explicit-user-request-required-before-packaging-upload" || {
    echo "FAIL release readiness preflight missing operator request gate" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "operator_after_upload_verify=same-release-sha256-before-opening" || {
    echo "FAIL release readiness preflight missing after-upload verification" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "operator_update_authority=same-release-assets-only-no-auto-update-manifest-signing-notarization-store-branch-source-archive" || {
    echo "FAIL release readiness preflight missing update authority boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data" || {
    echo "FAIL release readiness preflight missing forbidden upload boundary" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "operator_non_claims=unsigned experimental public beta; not audited; not production-ready; sensitive communication prohibited; external_delivery_claim=false; security_ready_claim=false" || {
    echo "FAIL release readiness preflight missing operator non-claims" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "operator_handoff_wrapup=upload-only-after-explicit-user-request-source-and-staging-statuses-otherwise-hold-and-return-to-desktop-hardening" || {
    echo "FAIL release readiness preflight missing operator handoff wrap-up" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "next_development_axis=windows-artifact-runtime-manifest-evidence#release-packaging-upload-after-explicit-user-request#real-user-test-prep#default-transport-boundary" || {
    echo "FAIL release readiness preflight missing next development axis" >&2
    exit 1
  }
  printf '%s\n' "$preflight_output" | grep -Fq -- "next=choose Windows artifact runtime/manifest evidence, release packaging/upload only after explicit user request, real-user test preparation, or default transport boundary" || {
    echo "FAIL release readiness preflight missing operator next step" >&2
    exit 1
  }
fi
bash "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-artifact-boundary
if "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "$ROOT_DIR/release-upload-test" >/tmp/another-dimension-release-output-check.out 2>&1; then
  echo "FAIL release prepare accepted a non-ignored output directory" >&2
  exit 1
fi
require_text /tmp/another-dimension-release-output-check.out "release output must stay under ignored apps/desktop-tauri/public-release/"
bash -n "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/final_acceptance_once.sh"
if final_acceptance_output="$("$ROOT_DIR/scripts/final_acceptance_once.sh" 2>&1)"; then
  echo "FAIL final acceptance unexpectedly succeeded" >&2
  exit 1
fi
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "outside the v0.1 public product claim" || {
  echo "FAIL final acceptance missing public product claim boundary" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "external_delivery_claim=false" || {
  echo "FAIL final acceptance missing external delivery non-claim" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "release_class=public_beta" || {
  echo "FAIL final acceptance missing public beta release class" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "stable_candidate_ready=false" || {
  echo "FAIL final acceptance missing stable candidate readiness hold" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "external_two_machine_evidence_present=false" || {
  echo "FAIL final acceptance missing external evidence blocker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "macos_public_artifact_consistency_verified=false" || {
  echo "FAIL final acceptance missing macOS artifact blocker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_public_artifact_candidate_source_gate_ready=true" || {
  echo "FAIL final acceptance missing Windows source gate readiness marker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_artifact_manifest_package_structure_verified=true" || {
  echo "FAIL final acceptance missing Windows package-structure source verification marker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_runtime_result_manifest_binding_verified=true" || {
  echo "FAIL final acceptance missing Windows runtime-result manifest binding marker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_runtime_evidence_contract_verified=true" || {
  echo "FAIL final acceptance missing Windows runtime evidence contract marker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_public_artifact_real_runtime_evidence_present=false" || {
  echo "FAIL final acceptance missing Windows real runtime evidence blocker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_public_artifact_consistency_verified=false" || {
  echo "FAIL final acceptance missing Windows artifact blocker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_artifact_release_upload_authorized=false" || {
  echo "FAIL final acceptance missing Windows release upload hold" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "missing_windows_public_artifact_conditions=real_windows_runtime_result#release_artifact#signing_decision#upload_authorization#public_copy_review" || {
  echo "FAIL final acceptance missing Windows public artifact condition list" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_production_claim_allowed=false" || {
  echo "FAIL final acceptance missing Windows production claim hold" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_public_claim_allowed=false" || {
  echo "FAIL final acceptance missing high-risk public claim hold" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "emergency_advisory_path_ready=false" || {
  echo "FAIL final acceptance missing emergency advisory blocker" >&2
  exit 1
}
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "scripts/public_release_readiness_preflight.sh" || {
  echo "FAIL final acceptance missing public release source gate next step" >&2
  exit 1
}

echo "status=public-claim-audit-readiness-ready"
