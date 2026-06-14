#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DMG="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
EXPECTED_DMG_SHA="ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13"
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

track_reference_copy() {
  local source="$1"
  local copied="$2"
  local label="$3"
  if ! cmp -s "$source" "$copied"; then
    reference_copies_status="source-may-be-newer"
    echo "existing_release_output_source_newer_file=$label"
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

  local reference_copies_status
  reference_copies_status="current"
  track_reference_copy "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "$release_dir/INSTALL_UNSIGNED_MACOS.md" "INSTALL_UNSIGNED_MACOS.md"
  track_reference_copy "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$release_dir/RELEASE_NOTES.md" "RELEASE_NOTES.md"
  track_reference_copy "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "$release_dir/GITHUB_RELEASE_BODY.md" "GITHUB_RELEASE_BODY.md"
  track_reference_copy "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "$release_dir/UPDATE_INTEGRITY.md" "UPDATE_INTEGRITY.md"
  track_reference_copy "$ROOT_DIR/reference/SUPPLY_CHAIN_BASELINE.md" "$release_dir/SUPPLY_CHAIN_BASELINE.md" "SUPPLY_CHAIN_BASELINE.md"
  track_reference_copy "$ROOT_DIR/reference/DEPENDENCY_INVENTORY.md" "$release_dir/DEPENDENCY_INVENTORY.md" "DEPENDENCY_INVENTORY.md"
  track_reference_copy "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "$release_dir/PUBLIC_THREAT_MODEL.md" "PUBLIC_THREAT_MODEL.md"
  track_reference_copy "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "$release_dir/PRIVACY_MODEL_COMPARISON.md" "PRIVACY_MODEL_COMPARISON.md"
  track_reference_copy "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "$release_dir/INDEPENDENT_REVIEW_PACKET.md" "INDEPENDENT_REVIEW_PACKET.md"
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
  track_reference_copy "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "$release_dir/REPOSITORY_GOVERNANCE.md" "REPOSITORY_GOVERNANCE.md"
  track_reference_copy "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "$release_dir/COMPONENT_BOUNDARIES.md" "COMPONENT_BOUNDARIES.md"

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
  if [ "$reference_copies_status" = "current" ]; then
    echo "existing_release_output_reference_copies=current"
  else
    echo "existing_release_output_reference_copies=source-may-be-newer"
  fi
  echo "existing_release_output_public_intake=baseline-present-source-may-be-newer"
  echo "existing_release_output_lockfiles=current"
  if [ "$reference_copies_status" = "current" ]; then
    echo "existing_release_output_status=current"
    echo "existing_release_output_next_owner_action=upload-current-unsigned-public-beta-packet"
  else
    echo "existing_release_output_status=stale"
    echo "existing_release_output_stale_reason=source-reference-copy-differs-from-held-packet"
    echo "existing_release_output_next_owner_action=rebuild-or-republish-unsigned-public-beta-packet"
  fi
}

check_macos_public_beta_final_sources() {
  require_text "$ROOT_DIR/README.md" "reference/RELEASE_PAGE_UPDATE_POLICY.json"
  require_text "$ROOT_DIR/README.md" "reference/MACOS_FRESH_INSTALL_REHEARSAL.md"
  require_text "$ROOT_DIR/README.md" "reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"
  require_text "$ROOT_DIR/README.md" "reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md"
  require_text "$ROOT_DIR/README.md" "reference/screenshots/README.md"
  require_text "$ROOT_DIR/README.md" "reference/PUBLIC_SUPPORT_TRIAGE.md"
  require_text "$ROOT_DIR/README.md" "macOS unsigned public beta source closure"
  require_text "$ROOT_DIR/README.md" "readiness target is 100%"
  require_text "$ROOT_DIR/README.md" "production readiness definition and claim gate"
  require_text "$ROOT_DIR/reference/RELEASE_PAGE_UPDATE_POLICY.json" "current source packet upload is held without explicit upload approval"
  require_text "$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL.md" "Redacted Diagnostics Copy"
  require_text "$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md" "Status: hold for manual GUI follow-through; source install authority passed."
  require_text "$ROOT_DIR/reference/screenshots/README.md" "Reviewed files"
  require_text "$ROOT_DIR/reference/PUBLIC_SUPPORT_TRIAGE.md" "Triage Routing Matrix"
  require_text "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "already public macOS unsigned beta"
  require_text "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "still not production-ready"
  require_text "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "source-side macOS unsigned public"
  require_text "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "macOS Unsigned Public Beta Closure"
  require_text "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "Known Release Drift"
  require_text "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "Phase OPS-1 - Production Readiness Definition And Claim Gate"
  require_text "$ROOT_DIR/scripts/macos_release_page_update_gate_once.sh" "release_page_update_gate=ok"
  require_text "$ROOT_DIR/scripts/macos_fresh_install_rehearsal_once.sh" "macos-fresh-install-rehearsal-source-ready"
  require_text "$ROOT_DIR/scripts/desktop_screenshot_safety_once.sh" "public_screenshot_assets_committed=true"
  require_text "$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh" "PUBLIC_SUPPORT_TRIAGE.md"

  echo "macos_public_beta_final_report=ready"
  echo "macos_release_page_update_gate=source-linked"
  echo "macos_fresh_install_rehearsal=source-linked"
  echo "macos_public_screenshots=source-linked"
  echo "macos_public_support_triage=source-linked"
}

check_final_claim_acceptance_hold() {
  bash -n "$ROOT_DIR/scripts/final_acceptance_once.sh"
  local final_acceptance_output
  if final_acceptance_output="$("$ROOT_DIR/scripts/final_acceptance_once.sh" 2>&1)"; then
    echo "FAIL final acceptance unexpectedly opened public release claim" >&2
    exit 1
  fi

  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "stable_candidate_ready=false" || {
    echo "FAIL final acceptance missing stable candidate hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "p0_p1_local_bug_audit_complete=false" || {
    echo "FAIL final acceptance missing P0/P1 audit blocker" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "stable_candidate_blocked_by_p0_p1_audit=true" || {
    echo "FAIL final acceptance missing stable candidate P0/P1 blocker" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "stable_public_app_blocked_by_p0_p1_audit=true" || {
    echo "FAIL final acceptance missing stable app P0/P1 blocker" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "stable_public_app_ready=false" || {
    echo "FAIL final acceptance missing stable app hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_mode_ready=false" || {
    echo "FAIL final acceptance missing High-Risk hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_runtime_evidence_validator_ready=true" || {
    echo "FAIL final acceptance missing High-Risk runtime evidence validator status" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_runtime_evidence_claim_separated=true" || {
    echo "FAIL final acceptance missing High-Risk runtime evidence claim separation" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_runtime_evidence_accepted=false" || {
    echo "FAIL final acceptance missing High-Risk runtime evidence accepted hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_ready_claim_allowed=false" || {
    echo "FAIL final acceptance missing High-Risk ready claim hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_required_conditions_missing=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-encryption-evidence#release-integrity" || {
    echo "FAIL final acceptance missing High-Risk required condition blockers" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_blocked_by_missing_required_conditions=true" || {
    echo "FAIL final acceptance missing High-Risk condition blocker" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "forbidden_positive_public_claims_found=false" || {
    echo "FAIL final acceptance missing forbidden public claim scan result" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "external_two_machine_evidence_present=false" || {
    echo "FAIL final acceptance missing external evidence blocker" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "independent_review_packet_source_ready=true" || {
    echo "FAIL final acceptance missing independent review packet source readiness" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "stable_candidate_evidence_required_before_external_review=true" || {
    echo "FAIL final acceptance missing stable evidence external review ordering" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "external_review_not_local_source_progress_blocker=true" || {
    echo "FAIL final acceptance missing external review non-blocking source policy" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "external_review_complete=false" || {
    echo "FAIL final acceptance missing external review completion hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "external_review_claim_allowed=false" || {
    echo "FAIL final acceptance missing external review claim hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "stable_candidate_blocked_by_external_review_evidence=true" || {
    echo "FAIL final acceptance missing stable candidate external review evidence blocker" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "macos_public_artifact_consistency_verified=false" || {
    echo "FAIL final acceptance missing macOS artifact blocker" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_public_artifact_consistency_verified=false" || {
    echo "FAIL final acceptance missing Windows artifact blocker" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "real_windows_runtime_result_present=false" || {
    echo "FAIL final acceptance missing real Windows runtime result absence" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_runtime_result_packet_required_for_public_artifact=true" || {
    echo "FAIL final acceptance missing Windows runtime result packet requirement" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_manifest_checksum_provenance_separate_from_runtime_result=true" || {
    echo "FAIL final acceptance missing Windows manifest/runtime evidence separation" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_public_artifact_claim_allowed=false" || {
    echo "FAIL final acceptance missing Windows public artifact claim hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_installer_claim_allowed=false" || {
    echo "FAIL final acceptance missing Windows installer claim hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "windows_upload_claim_allowed=false" || {
    echo "FAIL final acceptance missing Windows upload claim hold" >&2
    exit 1
  }
  printf '%s\n' "$final_acceptance_output" | grep -Fq -- "support_redaction_verified=true" || {
    echo "FAIL final acceptance missing support redaction status" >&2
    exit 1
  }

  echo "final_claim_acceptance=hold-expected"
  echo "final_claim_p0_p1_local_bug_audit_complete=false"
  echo "final_claim_p0_p1_local_bug_blocker=missing-audit-or-unverified-bugs"
  echo "final_claim_stable_candidate_blocked_by_p0_p1_audit=true"
  echo "final_claim_stable_public_app_blocked_by_p0_p1_audit=true"
  echo "final_claim_stable_candidate_ready=false"
  echo "final_claim_stable_public_app_ready=false"
  echo "final_claim_high_risk_mode_ready=false"
  echo "final_claim_high_risk_runtime_evidence_validator_ready=true"
  echo "final_claim_high_risk_runtime_evidence_claim_separated=true"
  echo "final_claim_high_risk_runtime_evidence_accepted=false"
  echo "final_claim_high_risk_ready_claim_allowed=false"
  echo "final_claim_high_risk_required_conditions_missing=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-encryption-evidence#release-integrity"
  echo "final_claim_high_risk_blocked_by_missing_required_conditions=true"
  echo "final_claim_external_evidence_present=false"
  echo "final_claim_independent_review_packet_source_ready=true"
  echo "final_claim_stable_candidate_evidence_required_before_external_review=true"
  echo "final_claim_external_review_not_local_source_progress_blocker=true"
  echo "final_claim_external_review_complete=false"
  echo "final_claim_external_review_claim_allowed=false"
  echo "final_claim_stable_candidate_blocked_by_external_review_evidence=true"
  echo "final_claim_macos_artifact_consistency=false"
  echo "final_claim_windows_artifact_consistency=false"
  echo "final_claim_real_windows_runtime_result_present=false"
  echo "final_claim_windows_runtime_result_packet_required_for_public_artifact=true"
  echo "final_claim_windows_manifest_checksum_provenance_separate_from_runtime_result=true"
  echo "final_claim_windows_public_artifact_claim_allowed=false"
  echo "final_claim_windows_installer_claim_allowed=false"
  echo "final_claim_windows_upload_claim_allowed=false"
  echo "final_claim_support_redaction_verified=true"
  echo "final_claim_forbidden_positive_public_claims_found=false"
}

echo "preflight=public-release-readiness"
echo "scope=source-only-no-dmg-required-no-generated-artifacts"
echo "artifact_generation=false"
echo "dmg_required=false"
echo "network_or_onion_work=false"
# Legacy source-freeze verifier baseline:
# checks=artifact-boundary,update-integrity-policy,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance
# checks_run=artifact-boundary,update-integrity-policy,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance
echo "checks=artifact-boundary,update-integrity-policy,high-risk-release-integrity-gate,macos-release-distribution-manifest,public-release-source-path,desktop-supply-chain-surface,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,windows-public-artifact-candidate-gate,public-support-readiness,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance,final-claim-acceptance,stable-candidate-rehearsal"
echo "checks_run=artifact-boundary,update-integrity-policy,high-risk-release-integrity-gate,macos-release-distribution-manifest,public-release-source-path,desktop-supply-chain-surface,desktop-beta-acceptance-matrix,desktop-public-beta-source-freeze,desktop-windows-parity-intake,desktop-windows-local-runtime-smoke-handoff,desktop-windows-readiness-source-audit,desktop-windows-local-runtime-smoke-boundary,windows-public-artifact-candidate-gate,public-support-readiness,desktop-real-user-test-prep,desktop-default-transport-boundary,public-beta-gap,public-claim-acceptance,final-claim-acceptance,stable-candidate-rehearsal"

run_step artifact-boundary "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-artifact-boundary
run_step update-integrity-policy "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-policy
run_step high-risk-release-integrity-gate "$ROOT_DIR/scripts/high_risk_release_integrity_gate_once.sh"
run_step macos-release-distribution-manifest "$ROOT_DIR/scripts/macos_release_distribution_manifest_once.sh"
run_step public-release-source-path "$ROOT_DIR/scripts/prepare_public_release.sh"
run_step desktop-supply-chain-surface "$ROOT_DIR/scripts/desktop_supply_chain_surface_guard_once.sh"
run_step desktop-beta-acceptance-matrix "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh"
run_step desktop-public-beta-source-freeze "$ROOT_DIR/scripts/desktop_public_beta_source_freeze_once.sh"
run_step desktop-windows-parity-intake "$ROOT_DIR/scripts/desktop_windows_parity_intake_once.sh"
run_step desktop-windows-local-runtime-smoke-handoff "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_handoff_once.sh"
run_step desktop-windows-readiness-source-audit "$ROOT_DIR/scripts/desktop_windows_readiness_source_audit_once.sh"
run_step desktop-windows-local-runtime-smoke-boundary "$ROOT_DIR/scripts/desktop_windows_local_runtime_smoke_boundary_once.sh"
run_step windows-public-artifact-candidate-gate "$ROOT_DIR/scripts/windows_public_artifact_candidate_gate_once.sh"
run_step public-support-readiness "$ROOT_DIR/scripts/public_support_readiness_gate_once.sh"
run_step desktop-real-user-test-prep "$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh"
run_step desktop-default-transport-boundary "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh"
run_step public-beta-gap "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
run_step public-claim-acceptance env PUBLIC_RELEASE_PREFLIGHT_CHILD=1 "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"
run_step final-claim-acceptance check_final_claim_acceptance_hold
run_step stable-candidate-rehearsal "$ROOT_DIR/scripts/public_stable_candidate_rehearsal_once.sh"
run_step macos-public-beta-final-sources check_macos_public_beta_final_sources
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
# Legacy source-freeze verifier baseline:
# source_freeze_next_axes=release-packaging-upload-after-explicit-user-request#windows-readiness#real-user-test-prep#default-transport-boundary
echo "source_freeze_next_axes=windows-artifact-runtime-manifest-evidence#release-packaging-upload-after-explicit-user-request#real-user-test-prep#default-transport-boundary"
echo "release_upload_performed=false"
echo "dmg_rebuild_performed=false"
# Legacy Windows readiness source-audit baseline:
# windows_readiness=local-build-candidate-only
# windows_local_usable_criteria_defined=true
# windows_public_artifact_prerequisites_separate=true
# windows_local_runtime_smoke_status=source-boundary-only
# windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows
# windows_public_artifact_ready=false
# windows_installer_ready=false
# windows_signing_ready=false
# windows_packaging_hold_without_explicit_request=true
# windows_packaging_upload_permitted_this_run=false
# windows_public_artifact_release_request_required=true
# windows_installer_signing_store_claim_allowed=false
# windows_generated_artifact_commit_allowed=false
# windows_runtime_smoke_required=true
# windows_app_data_path_review_required=true
# windows_path_separator_review_required=true
# windows_local_deletion_behavior_review_required=true
# windows_redacted_diagnostics_behavior_review_required=true
# windows_explicit_user_action_review_required=true
# windows_public_artifact_upload_allowed=false
echo "windows_readiness=public-artifact-candidate-source-gate"
echo "windows_public_artifact_candidate=true"
echo "windows_public_artifact_candidate_gate=source-ready"
echo "windows_public_artifact_candidate_gate_script=scripts/windows_public_artifact_candidate_gate_once.sh"
echo "artifact_consistency_sequence=macos-release-distribution-manifest#windows-public-artifact-candidate-gate#final-claim-acceptance"
echo "macos_artifact_consistency_verified=false"
echo "windows_artifact_consistency_verified=false"
echo "real_windows_runtime_result_present=false"
echo "windows_runtime_result_packet_required_for_public_artifact=true"
echo "windows_manifest_checksum_provenance_separate_from_runtime_result=true"
echo "windows_non_windows_runtime_result_promoted=false"
echo "windows_local_or_fabricated_runtime_result_promoted=false"
echo "external_evidence_presence=false"
echo "external_evidence_required_for_stable_candidate=true"
echo "independent_review_packet_source_ready=true"
echo "stable_candidate_evidence_required_before_external_review=true"
echo "external_review_not_local_source_progress_blocker=true"
echo "external_review_complete=false"
echo "external_review_claim_allowed=false"
echo "stable_candidate_blocked_by_external_review_evidence=true"
echo "windows_artifact_type=windows-shell-nsis-exe-installer-candidate"
echo "windows_bundle_target=nsis"
echo "windows_runtime_mode=shell-sidecar-pending"
echo "windows_onion_runtime_compiled=false"
echo "windows_desktop_parity_intake=source-boundary-only"
echo "windows_local_runtime_smoke_handoff=source-boundary-only"
echo "windows_local_usable_criteria_defined=true"
echo "windows_local_usable_scope=webview2#tauri-app-data#encrypted-store#local-deletion#redacted-diagnostics#explicit-user-action#no-auto-update#local-manual-envelope-default"
echo "windows_public_artifact_prerequisites_separate=true"
echo "windows_public_artifact_prerequisites=explicit-release-request#real-windows-runtime-smoke#validated-artifact-manifest#checksum-provenance#installer-signing-decisions#upload-hold-review"
echo "windows_public_artifact_ready=false"
echo "windows_installer_ready=false"
echo "windows_signing_ready=false"
echo "windows_packaging_hold_without_explicit_request=true"
echo "windows_packaging_upload_permitted_this_run=false"
echo "windows_public_artifact_release_request_required=true"
echo "windows_installer_signing_store_claim_allowed=false"
echo "windows_generated_artifact_commit_allowed=false"
echo "windows_local_runtime_smoke_status=source-boundary-only"
echo "windows_local_runtime_recovery_action=run-test-windows-boundary-on-real-windows"
echo "windows_runtime_smoke_required=true"
echo "windows_app_data_path_review_required=false"
echo "windows_path_separator_review_required=false"
echo "windows_app_data_resolver=tauri-app-data"
echo "windows_app_data_resolver_shared_storage_semantics=true"
echo "windows_app_data_resolver_public_support_safe=true"
echo "windows_raw_local_path_returned=false"
echo "windows_support_report_raw_path_allowed=false"
echo "windows_runtime_smoke_source_command=npm --prefix apps/desktop-tauri run test:windows-boundary"
echo "windows_local_deletion_behavior_review_required=false"
echo "windows_redacted_diagnostics_behavior_review_required=false"
echo "windows_runtime_result_external_peer_evidence_separated=true"
echo "windows_explicit_user_action_review_required=true"
echo "windows_public_artifact_upload_allowed=false"
echo "windows_public_artifact_claim_allowed=false"
echo "windows_installer_claim_allowed=false"
echo "windows_upload_claim_allowed=false"
echo "windows_local_runtime_smoke_passed=false"
echo "support_redaction_verified=true"
echo "final_claim_acceptance=hold-expected"
echo "final_claim_p0_p1_local_bug_audit_complete=false"
echo "final_claim_p0_p1_local_bug_blocker=missing-audit-or-unverified-bugs"
echo "final_claim_stable_candidate_blocked_by_p0_p1_audit=true"
echo "final_claim_stable_public_app_blocked_by_p0_p1_audit=true"
echo "final_claim_stable_candidate_ready=false"
echo "final_claim_stable_public_app_ready=false"
echo "final_claim_high_risk_mode_ready=false"
echo "final_claim_high_risk_runtime_evidence_validator_ready=true"
echo "final_claim_high_risk_runtime_evidence_claim_separated=true"
echo "final_claim_high_risk_runtime_evidence_accepted=false"
echo "final_claim_high_risk_ready_claim_allowed=false"
echo "final_claim_high_risk_required_conditions_missing=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-encryption-evidence#release-integrity"
echo "final_claim_high_risk_blocked_by_missing_required_conditions=true"
echo "final_claim_external_evidence_present=false"
echo "final_claim_independent_review_packet_source_ready=true"
echo "final_claim_stable_candidate_evidence_required_before_external_review=true"
echo "final_claim_external_review_not_local_source_progress_blocker=true"
echo "final_claim_external_review_complete=false"
echo "final_claim_external_review_claim_allowed=false"
echo "final_claim_stable_candidate_blocked_by_external_review_evidence=true"
echo "final_claim_macos_artifact_consistency=false"
echo "final_claim_windows_artifact_consistency=false"
echo "final_claim_real_windows_runtime_result_present=false"
echo "final_claim_windows_runtime_result_packet_required_for_public_artifact=true"
echo "final_claim_windows_manifest_checksum_provenance_separate_from_runtime_result=true"
echo "final_claim_windows_public_artifact_claim_allowed=false"
echo "final_claim_windows_installer_claim_allowed=false"
echo "final_claim_windows_upload_claim_allowed=false"
echo "final_claim_forbidden_positive_public_claims_found=false"
echo "stable_candidate_rehearsal=source-only-hold"
echo "stable_candidate_rehearsal_generated_artifacts_created=false"
echo "stable_candidate_rehearsal_docs_tracked=false"
echo "public_support_incident_operations_ready=true"
echo "stable_candidate_blocked_when_support_not_ready=true"
echo "support_readiness_opens_public_claims=false"
echo "raw_logs_requested=false"
echo "crash_dumps_requested=false"
echo "screenshots_requested=false"
echo "support_bundles_requested=false"
echo "telemetry_upload_claimed=false"
echo "external_delivery_evidence_claim=false"
echo "audit_evidence_claim=false"
echo "security_ready_proof_claim=false"
echo "auto_update_notice_claimed=false"
echo "sensitive_use_claim_allowed=false"
echo "real_user_test_prep=redacted-intake-ready"
echo "real_user_test_allowed_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness#high-risk-runtime-evidence-source#high-risk-runtime-evidence-accepted#high-risk-runtime-primary-blocker#high-risk-runtime-failure-class#engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class#engine-sidecar-redacted-runtime-status"
echo "real_user_test_forbidden_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"
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
# Legacy public beta gap marker:
# next_development_axis=windows-packaging-hold-gate#release-packaging-upload-after-explicit-user-request#real-user-test-prep#default-transport-boundary
echo "next_development_axis=windows-artifact-runtime-manifest-evidence#release-packaging-upload-after-explicit-user-request#real-user-test-prep#default-transport-boundary"
echo "next=choose Windows artifact runtime/manifest evidence, release packaging/upload only after explicit user request, real-user test preparation, or default transport boundary"
