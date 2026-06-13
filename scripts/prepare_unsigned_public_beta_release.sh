#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP_VERSION="0.1.0"
BUILD_CHANNEL="beta-onion"
BUILD_COMMIT="e8954df9"
PLATFORM="macos-aarch64"
MACOS_PUBLIC_SUPPORT_SCOPE="apple-silicon-aarch64-only"
MACOS_UNIVERSAL_ARTIFACT_READY=false
MACOS_INTEL_ARTIFACT_READY=false
MACOS_MINIMUM_VERSION_CLAIMED=false
RELEASE_TAG="v0.1.0-beta-onion-unsigned"
RELEASE_URL="https://github.com/answndud/another-dimension-chat/releases/tag/$RELEASE_TAG"
EXPECTED_DMG_SHA="7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a"

SOURCE_DIR="$ROOT_DIR/apps/desktop-tauri/beta-artifacts"
SOURCE_DMG="$SOURCE_DIR/Another Dimension Chat_0.1.0_aarch64.dmg"
SOURCE_PROVENANCE="$SOURCE_DIR/Another Dimension Chat_0.1.0_aarch64.dmg.provenance.json"

RELEASE_DIR="${1:-$ROOT_DIR/apps/desktop-tauri/public-release/unsigned-public-beta}"
RELEASE_DMG="another-dimension-chat-${APP_VERSION}-${BUILD_CHANNEL}-${PLATFORM}-unsigned.dmg"
RELEASE_PROVENANCE="${RELEASE_DMG}.provenance.json"
REQUIRED_RELEASE_FILES=(
  "$RELEASE_DMG"
  "$RELEASE_DMG.sha256"
  "$RELEASE_PROVENANCE"
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

case "$RELEASE_DIR" in
  ""|"/"|"$ROOT_DIR"|"$ROOT_DIR/"|"."|"..")
    echo "FAIL unsafe release directory: $RELEASE_DIR" >&2
    exit 1
    ;;
esac

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local expected="$2"
  if ! grep -Fq -- "$expected" "$file"; then
    echo "FAIL missing expected text in $file: $expected" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local forbidden="$2"
  if grep -Fq -- "$forbidden" "$file"; then
    echo "FAIL forbidden text in $file: $forbidden" >&2
    exit 1
  fi
}

require_ignored_path() {
  local path="$1"
  if ! git -C "$ROOT_DIR" check-ignore -q "$path"; then
    echo "FAIL generated artifact path is not ignored: $path" >&2
    exit 1
  fi
}

require_release_output_dir() {
  case "$RELEASE_DIR" in
    "$ROOT_DIR/apps/desktop-tauri/public-release/"*|apps/desktop-tauri/public-release/*)
      ;;
    *)
      echo "FAIL release output must stay under ignored apps/desktop-tauri/public-release/: $RELEASE_DIR" >&2
      exit 1
      ;;
  esac
  require_ignored_path "$RELEASE_DIR"
}

check_artifact_boundary() {
  require_ignored_path "$ROOT_DIR/apps/desktop-tauri/public-release/"
  require_ignored_path "$ROOT_DIR/apps/desktop-tauri/beta-artifacts/"
  if git -C "$ROOT_DIR" ls-files apps/desktop-tauri/public-release apps/desktop-tauri/beta-artifacts | grep -q .; then
    echo "FAIL generated release or beta artifact paths are tracked" >&2
    git -C "$ROOT_DIR" ls-files apps/desktop-tauri/public-release apps/desktop-tauri/beta-artifacts >&2
    exit 1
  fi

  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "COMPONENT_BOUNDARIES.md"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "Upload boundary for operators"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "Use \`GITHUB_RELEASE_BODY.md\` exactly as"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "Do not upload \`docs/\`, \`beta-artifacts/\`, the"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "or any file not listed in the manifest"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "COMPONENT_BOUNDARIES.md"
  require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "PRIVACY_MODEL_COMPARISON.md"
  require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "scripts/public_release_readiness_preflight.sh"
  require_text "$ROOT_DIR/README.md" "scripts/public_release_readiness_preflight.sh"
  require_text "$ROOT_DIR/SECURITY.md" "scripts/public_release_readiness_preflight.sh"
  require_text "$ROOT_DIR/SECURITY.md" "source-only preflight before staging artifacts"
  require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "scripts/public_release_readiness_preflight.sh"
  require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "source-only preflight"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "INSTALL_UNSIGNED_MACOS.md"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "RELEASE_NOTES.md"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "PUBLIC_THREAT_MODEL.md"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "PRIVACY_MODEL_COMPARISON.md"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "INDEPENDENT_REVIEW_PACKET.md"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "PUBLIC_INTAKE_POLICY.md"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "REPOSITORY_GOVERNANCE.md"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "COMPONENT_BOUNDARIES.md"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "desktop local-private-flow acceptance status/blockers/non-claims"
  reject_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "manual network"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"public_diagnostics_boundary\": \"status-build-failure-class-recovery-action-desktop-acceptance-only\""
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Public diagnostics boundary: status-build-failure-class-recovery-action-desktop-acceptance-only"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "desktop local-private-flow acceptance status/blockers/non-claims"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "COMPONENT_BOUNDARIES.md"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "release output must stay under ignored apps/desktop-tauri/public-release/"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" 'manifest=$RELEASE_DIR/MANIFEST.md'
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_request_gate=explicit-user-request-required-before-packaging-upload"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "next=hold unless explicit release upload was requested; upload all and only generated files listed in MANIFEST.md from release_dir"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_release_body=use GITHUB_RELEASE_BODY.md exactly"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"same_release_asset_set_authority_required\": true"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"branch_or_source_archive_update_authority\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"auto_update_manifest_trusted\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"platform_signing_trust_boundary\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"notarization_trust_boundary\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"store_trust_boundary\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "not release or update authority for a downloaded DMG"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"upload_allowlist_source\": \"MANIFEST.md\""
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"upload_release_body\": \"GITHUB_RELEASE_BODY.md\""
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"upload_forbidden\": \"docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data\""
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Operator Upload Boundary"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"windows_public_artifact_ready\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"windows_packaging_hold_without_explicit_request\": true"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "Windows packaging hold"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "windows_packaging_hold_without_explicit_request=true"
  echo "status=release-artifact-boundary-source-ready"
}

check_release_integrity_policy() {
  require_text "$ROOT_DIR/README.md" "Future public Windows, Android, and iOS artifacts must follow the same manual"
  require_text "$ROOT_DIR/README.md" "GitHub Release integrity model"
  require_text "$ROOT_DIR/README.md" "matching checksum, public provenance, manifest,"
  require_text "$ROOT_DIR/README.md" "release notes, update-integrity note, and dependency evidence attached to the"
  require_text "$ROOT_DIR/README.md" "same GitHub Release as the artifact"
  require_text "$ROOT_DIR/README.md" "Signing, notarization, app-store approval,"
  require_text "$ROOT_DIR/README.md" "Play Store approval, TestFlight, Developer ID, SmartScreen reputation, or mobile"
  require_text "$ROOT_DIR/README.md" "security boundary for v0.1."
  require_text "$ROOT_DIR/SECURITY.md" "Future public Windows, Android, and iOS artifacts must use the same manual"
  require_text "$ROOT_DIR/SECURITY.md" "GitHub Release download, same-release checksum, public provenance, manifest, and"
  require_text "$ROOT_DIR/SECURITY.md" "no-auto-update boundary"
  require_text "$ROOT_DIR/SECURITY.md" "Platform signing, notarization, app-store approval,"
  require_text "$ROOT_DIR/SECURITY.md" "Play Store approval, TestFlight, Developer ID, SmartScreen reputation, or mobile"
  require_text "$ROOT_DIR/SECURITY.md" "store review is not a trusted security boundary for v0.1."
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "Future Platform Artifacts"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "Every future public Windows, Android, or iOS artifact must be attached to a"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "GitHub Release with its own matching checksum and provenance file."
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "A platform store, notarization service, Developer ID signature, SmartScreen"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "Play Store approval, App Store/TestFlight approval, or mobile review"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "security boundary for"
  require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "Platform Release Boundary"
  require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "Future Windows, Android,"
  require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "iOS public artifacts must each have a matching checksum, public provenance,"
  require_text "$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md" "same GitHub Release as the artifact."
  require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "Future public Windows, Android, and iOS artifacts must follow the same manual"
  require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "GitHub Release, same-release checksum, public provenance, manifest,"
  require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "non-security-signing boundary as the current macOS DMG path."
  require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "Store approval, notarization, Developer ID signing, SmartScreen reputation, Play"
  require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "Store approval, App Store approval, or TestFlight distribution is not a security"
  require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "boundary for v0.1."
  echo "status=release-update-integrity-policy-ready"
}

if [ "${1:-}" = "--check-policy" ]; then
  check_release_integrity_policy
  exit 0
fi

if [ "${1:-}" = "--check-artifact-boundary" ]; then
  check_artifact_boundary
  exit 0
fi

require_release_output_dir

require_file "$SOURCE_DMG"
require_file "$SOURCE_PROVENANCE"
require_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
require_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
require_file "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
require_file "$ROOT_DIR/reference/UPDATE_INTEGRITY.md"
require_file "$ROOT_DIR/reference/SUPPLY_CHAIN_BASELINE.md"
require_file "$ROOT_DIR/reference/DEPENDENCY_INVENTORY.md"
require_file "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
require_file "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md"
require_file "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
require_file "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
require_file "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md"
require_file "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md"
require_file "$ROOT_DIR/Cargo.lock"
require_file "$ROOT_DIR/apps/desktop-tauri/src-tauri/Cargo.lock"
require_file "$ROOT_DIR/apps/desktop-tauri/package-lock.json"

actual_sha="$(shasum -a 256 "$SOURCE_DMG" | awk '{print $1}')"
if [ "$actual_sha" != "$EXPECTED_DMG_SHA" ]; then
  echo "FAIL DMG SHA-256 mismatch" >&2
  echo "expected: $EXPECTED_DMG_SHA" >&2
  echo "actual:   $actual_sha" >&2
  exit 1
fi

source_provenance_sha="$(shasum -a 256 "$SOURCE_PROVENANCE" | awk '{print $1}')"
artifact_size_bytes="$(wc -c < "$SOURCE_DMG" | tr -d '[:space:]')"
dependency_lockfile_evidence_count=3
dependency_lockfile_evidence_files="Cargo.lock|apps/desktop-tauri/src-tauri/Cargo.lock|apps/desktop-tauri/package-lock.json"

require_text "$SOURCE_PROVENANCE" "\"artifact_sha256\": \"$EXPECTED_DMG_SHA\""
require_text "$SOURCE_PROVENANCE" "\"app_version\": \"$APP_VERSION\""
require_text "$SOURCE_PROVENANCE" "\"build_channel\": \"$BUILD_CHANNEL\""
require_text "$SOURCE_PROVENANCE" "\"build_commit\": \"$BUILD_COMMIT\""
require_text "$SOURCE_PROVENANCE" "\"platform\": \"$PLATFORM\""
require_text "$SOURCE_PROVENANCE" "\"startup_network_sockets\": \"none\""

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

cp "$SOURCE_DMG" "$RELEASE_DIR/$RELEASE_DMG"
cp "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md"
cp "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$RELEASE_DIR/RELEASE_NOTES.md"
cp "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "$RELEASE_DIR/GITHUB_RELEASE_BODY.md"
cp "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "$RELEASE_DIR/UPDATE_INTEGRITY.md"
cp "$ROOT_DIR/reference/SUPPLY_CHAIN_BASELINE.md" "$RELEASE_DIR/SUPPLY_CHAIN_BASELINE.md"
cp "$ROOT_DIR/reference/DEPENDENCY_INVENTORY.md" "$RELEASE_DIR/DEPENDENCY_INVENTORY.md"
cp "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "$RELEASE_DIR/PUBLIC_THREAT_MODEL.md"
cp "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "$RELEASE_DIR/PRIVACY_MODEL_COMPARISON.md"
cp "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "$RELEASE_DIR/INDEPENDENT_REVIEW_PACKET.md"
cp "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "$RELEASE_DIR/PUBLIC_INTAKE_POLICY.md"
cp "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" "$RELEASE_DIR/REPOSITORY_GOVERNANCE.md"
cp "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "$RELEASE_DIR/COMPONENT_BOUNDARIES.md"

(
  cd "$RELEASE_DIR"
  shasum -a 256 "$RELEASE_DMG" > "$RELEASE_DMG.sha256"
)

(
  cd "$ROOT_DIR"
  shasum -a 256 \
    Cargo.lock \
    apps/desktop-tauri/src-tauri/Cargo.lock \
    apps/desktop-tauri/package-lock.json > "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256"
)

cat > "$RELEASE_DIR/$RELEASE_PROVENANCE" <<EOF
{
  "artifact": "$RELEASE_DMG",
  "artifact_sha256": "$EXPECTED_DMG_SHA",
  "artifact_size_bytes": $artifact_size_bytes,
  "app_version": "$APP_VERSION",
  "build_channel": "$BUILD_CHANNEL",
  "build_commit": "$BUILD_COMMIT",
  "platform": "$PLATFORM",
  "macos_public_support_scope": "$MACOS_PUBLIC_SUPPORT_SCOPE",
  "macos_universal_artifact_ready": $MACOS_UNIVERSAL_ARTIFACT_READY,
  "macos_intel_artifact_ready": $MACOS_INTEL_ARTIFACT_READY,
  "macos_minimum_version_claimed": $MACOS_MINIMUM_VERSION_CLAIMED,
  "distribution": "unsigned-github-public-beta",
  "windows_distribution": "local-build-candidate-only",
  "windows_local_usable_criteria_defined": true,
  "windows_local_runtime_smoke_status": "source-boundary-only",
  "windows_local_runtime_recovery_action": "run-test-windows-boundary-on-real-windows",
  "windows_public_artifact_ready": false,
  "windows_installer_ready": false,
  "windows_signing_ready": false,
  "windows_store_ready": false,
  "windows_public_artifact_upload_allowed": false,
  "windows_packaging_hold_without_explicit_request": true,
  "windows_packaging_upload_permitted_this_run": false,
  "windows_public_artifact_release_request_required": true,
  "windows_installer_signing_store_claim_allowed": false,
  "windows_generated_artifact_commit_allowed": false,
  "windows_packaging_prerequisites": "explicit-release-request#real-windows-runtime-smoke#packaging-review#installer-signing-decisions#checksum-provenance#upload-hold-review",
  "release_tag": "$RELEASE_TAG",
  "release_url": "$RELEASE_URL",
  "release_authority": "same-github-release-assets",
  "same_release_checksum_required": true,
  "same_release_asset_set_authority_required": true,
  "source_branch_release_authority": false,
  "branch_or_source_archive_update_authority": false,
  "packaging_decision": "proceed-to-packaging-only-with-frozen-ignored-dmg",
  "packaging_fallback": "return-to-desktop-hardening-if-source-preflight-fails",
  "upload_allowlist_source": "MANIFEST.md",
  "upload_release_body": "GITHUB_RELEASE_BODY.md",
  "upload_forbidden": "docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data",
  "install_allow_path": "macos-privacy-security-manual-allow-after-checksum",
  "terminal_quarantine_removal_install_step": false,
  "notarized": false,
  "signed": false,
  "auto_update": false,
  "auto_update_manifest_trusted": false,
  "platform_signing_trust_boundary": false,
  "notarization_trust_boundary": false,
  "store_trust_boundary": false,
  "startup_network_sockets": "none",
  "source_provenance_sha256": "$source_provenance_sha",
  "dependency_lockfiles_sha256_file": "DEPENDENCY_LOCKFILES.sha256",
  "dependency_inventory_file": "DEPENDENCY_INVENTORY.md",
  "dependency_lockfile_evidence_count": $dependency_lockfile_evidence_count,
  "dependency_lockfile_evidence_files": [
    "Cargo.lock",
    "apps/desktop-tauri/src-tauri/Cargo.lock",
    "apps/desktop-tauri/package-lock.json"
  ],
  "dependency_inventory_runtime_visible": true,
  "supply_chain_audit_complete": false,
  "sbom_published": false,
  "vulnerability_triage_signoff_complete": false,
  "reproducible_build_proof": false,
  "live_dependency_scan_performed": false,
  "public_threat_model_file": "PUBLIC_THREAT_MODEL.md",
  "privacy_model_comparison_file": "PRIVACY_MODEL_COMPARISON.md",
  "independent_review_packet_file": "INDEPENDENT_REVIEW_PACKET.md",
  "public_intake_policy_file": "PUBLIC_INTAKE_POLICY.md",
  "repository_governance_file": "REPOSITORY_GOVERNANCE.md",
  "component_boundaries_file": "COMPONENT_BOUNDARIES.md",
  "independent_review_complete": false,
  "public_review_gap_published": true,
  "reviewer_signoff_claimed": false,
  "public_user_safety_signoff_claimed": false,
  "review_packet_inputs_public_safe": true,
  "known_review_gaps_published": true,
  "public_safe_review_commands_required": true,
  "private_reporting_boundary": "private-vulnerability-reporting-or-minimal-public-contact-request",
  "minimal_public_contact_request_allowed": true,
  "fabricated_review_or_peer_evidence_allowed": false,
  "public_diagnostics_boundary": "status-build-failure-class-recovery-action-desktop-acceptance-only",
  "public_intake_boundary": "redacted-public-diagnostics-or-minimal-contact-request-only",
  "repository_governance_boundary": "main-maintainer-unsigned-beta-non-claim-redaction-guardrails",
  "privacy_model_target": "no-phone-no-email-no-global-account-no-central-contact-discovery-no-central-message-server",
  "briar_cwtch_equivalent_claim": false,
  "audited_e2ee_claim": false,
  "repeated_external_onion_evidence": false,
  "offline_mesh_claim": false,
  "security_ready_claim": false,
  "backup_migration_boundary": "local-backup-exclusion-verification-forward-only-migration-non-claim",
  "cloud_backup_or_sync": false,
  "backup_recovery_claimed": false,
  "forward_only_schema_migration_required": true,
  "destructive_migration_blocked": true,
  "rollback_detection": "marker-only",
  "rollback_prevention_claimed": false,
  "secure_media_deletion_claimed": false,
  "crash_upload": false,
  "telemetry": false,
  "raw_log_export": false,
  "crash_dump_export": false,
  "automated_log_collection": false,
  "support_bundle_export": false,
  "raw_diagnostic_file_export": false,
  "diagnostics_forbidden_fields": [
    "bridge lines",
    "onion endpoints",
    "invite codes",
    "pairing payloads",
    "envelope payloads",
    "safety phrases",
    "profile names",
    "message text",
    "local paths",
    "raw logs",
    "crash dumps",
    "screenshots of private room data",
    "passphrases",
    "private keys",
    "key material",
    "private planning notes"
  ],
  "manual_update_integrity_file": "UPDATE_INTEGRITY.md",
  "supply_chain_baseline_file": "SUPPLY_CHAIN_BASELINE.md",
  "public_non_claims": [
    "unsigned experimental public beta",
    "not notarized",
    "not audited",
    "not production-ready",
    "sensitive communication prohibited",
    "no auto-update",
    "no dependency audit claim",
    "no reproducible-build claim",
    "no completed independent review claim",
    "no reviewer signoff claim",
    "no public user safety signoff claim",
    "no fabricated external review or peer evidence",
    "no Briar/Cwtch-equivalent claim"
  ]
}
EOF

cat > "$RELEASE_DIR/MANIFEST.md" <<EOF
# Another Dimension Chat unsigned public beta manifest

This folder is for a GitHub Release upload.

## Upload Allowlist

- \`$RELEASE_DMG\`
- \`$RELEASE_DMG.sha256\`
- \`$RELEASE_PROVENANCE\`
- \`INSTALL_UNSIGNED_MACOS.md\`
- \`RELEASE_NOTES.md\`
- \`GITHUB_RELEASE_BODY.md\`
- \`UPDATE_INTEGRITY.md\`
- \`SUPPLY_CHAIN_BASELINE.md\`
- \`DEPENDENCY_INVENTORY.md\`
- \`PUBLIC_THREAT_MODEL.md\`
- \`PRIVACY_MODEL_COMPARISON.md\`
- \`INDEPENDENT_REVIEW_PACKET.md\`
- \`PUBLIC_INTAKE_POLICY.md\`
- \`REPOSITORY_GOVERNANCE.md\`
- \`COMPONENT_BOUNDARIES.md\`
- \`DEPENDENCY_LOCKFILES.sha256\`
- \`OPERATOR_FINAL_HANDOFF.md\`
- \`MANIFEST.md\`

## Build

- App version: \`$APP_VERSION\`
- Build channel: \`$BUILD_CHANNEL\`
- Build commit: \`$BUILD_COMMIT\`
- Platform: \`$PLATFORM\`
- macOS support scope: $MACOS_PUBLIC_SUPPORT_SCOPE
- macOS universal artifact ready: $MACOS_UNIVERSAL_ARTIFACT_READY
- macOS Intel artifact ready: $MACOS_INTEL_ARTIFACT_READY
- macOS minimum version claimed: $MACOS_MINIMUM_VERSION_CLAIMED
- Windows distribution: local-build-candidate-only
- Windows local usable criteria defined: true
- Windows local runtime smoke status: source-boundary-only
- Windows runtime recovery action: run-test-windows-boundary-on-real-windows
- Windows public artifact ready: false
- Windows installer ready: false
- Windows signing ready: false
- Windows public artifact upload allowed: false
- Windows packaging hold without explicit request: true
- Windows packaging/upload permitted this run: false
- Windows public artifact release request required: true
- Windows installer/signing/store claim allowed: false
- Windows generated artifact commit allowed: false
- Windows packaging prerequisites: explicit-release-request#real-windows-runtime-smoke#packaging-review#installer-signing-decisions#checksum-provenance#upload-hold-review
- Release tag: \`$RELEASE_TAG\`
- Release URL: \`$RELEASE_URL\`
- Release authority: same-github-release-assets
- DMG SHA-256: \`$EXPECTED_DMG_SHA\`
- Same-release checksum required: true
- Same-release asset set authority required: true
- Source branch release authority: false
- Branch or source archive update authority: false
- Packaging decision: proceed-to-packaging-only-with-frozen-ignored-dmg
- Packaging fallback: return-to-desktop-hardening-if-source-preflight-fails
- Install allow path: macos-privacy-security-manual-allow-after-checksum
- Terminal quarantine-removal install step: false
- Public provenance: \`$RELEASE_PROVENANCE\`
- Source provenance SHA-256: \`$source_provenance_sha\`
- Dependency inventory: \`DEPENDENCY_INVENTORY.md\`
- Dependency lockfile hashes: \`DEPENDENCY_LOCKFILES.sha256\`
- Dependency lockfile evidence count: $dependency_lockfile_evidence_count
- Dependency lockfile evidence files: \`$dependency_lockfile_evidence_files\`
- Dependency inventory runtime visible: true
- Supply-chain audit complete: false
- SBOM published: false
- Vulnerability triage signoff complete: false
- Reproducible-build proof: false
- Live dependency scan performed: false
- Public threat model: \`PUBLIC_THREAT_MODEL.md\`
- Privacy model comparison: \`PRIVACY_MODEL_COMPARISON.md\`
- Independent review packet: \`INDEPENDENT_REVIEW_PACKET.md\`
- Public intake policy: \`PUBLIC_INTAKE_POLICY.md\`
- Repository governance: \`REPOSITORY_GOVERNANCE.md\`
- Component boundaries: \`COMPONENT_BOUNDARIES.md\`
- Independent review complete: false
- Public review gap published: true
- Reviewer signoff claimed: false
- Public user safety signoff claimed: false
- Review packet inputs public safe: true
- Known review gaps published: true
- Public-safe review commands required: true
- Private reporting boundary: private-vulnerability-reporting-or-minimal-public-contact-request
- Minimal public contact request allowed: true
- Fabricated review or peer evidence allowed: false
- Public diagnostics boundary: status-build-failure-class-recovery-action-desktop-acceptance-only
- Public diagnostics include: desktop local-private-flow acceptance status/blockers/non-claims
- Public intake boundary: redacted-public-diagnostics-or-minimal-contact-request-only
- Repository governance boundary: main-maintainer-unsigned-beta-non-claim-redaction-guardrails
- Privacy model target: no-phone-no-email-no-global-account-no-central-contact-discovery-no-central-message-server
- Briar/Cwtch-equivalent claim: false
- Audited E2EE claim: false
- Repeated external onion evidence: false
- Offline mesh claim: false
- Security-ready claim: false
- Backup/migration boundary: local-backup-exclusion-verification-forward-only-migration-non-claim
- Cloud backup or sync: disabled
- Backup recovery claimed: false
- Forward-only schema migration required: true
- Destructive migration blocked: true
- Rollback detection: marker-only
- Rollback prevention claimed: false
- Secure media deletion claimed: false
- Crash upload: disabled
- Telemetry: disabled
- Raw log export: disabled
- Crash dump export: disabled
- Automated log collection: disabled
- Support bundle export: disabled
- Raw diagnostic file export: disabled
- Auto-update: disabled
- Auto-update manifest trusted: false
- Signing/notarization: disabled
- Platform signing trust boundary: false
- Notarization trust boundary: false
- Store trust boundary: false

## Operator Upload Boundary

Upload exactly the files listed in this \`MANIFEST.md\` from this generated
release directory. Use \`GITHUB_RELEASE_BODY.md\` exactly as the GitHub Release
body.

## Forbidden Uploads

Do not upload \`docs/\`, \`beta-artifacts/\`, the \`public-release/\` folder itself,
branch files, source archives, raw logs, crash dumps, screenshots, local app
data, private diagnostics, private planning notes, or any file not listed in
this manifest.

## Boundary

This is an unsigned experimental public beta. It is not notarized, not audited,
not production-ready, and sensitive communication prohibited.

External onion delivery is outside the v0.1 public product claim for this beta.
Same-machine dual-profile rehearsal is development evidence only. No peer report
is expected or required for this v0.1 claim, and no external delivery claim is made.

Manual update integrity is limited to the same GitHub Release asset set,
user-verified SHA-256 files, and the provenance/dependency-inventory/lockfile-hash
evidence in this upload set. The source branch, source archive, copied checksum,
auto-update manifest, platform signing, notarization, and app-store approval are
not release or update authority for a downloaded DMG.
There are exactly $dependency_lockfile_evidence_count lockfile hash evidence
entries in this upload set: \`$dependency_lockfile_evidence_files\`.
There is no live dependency scan, vulnerability triage signoff, auto-update,
signing, notarization, reproducible-build, SBOM, or security-audit claim.

Local backup exclusion is a required local verification boundary for this beta,
not a cloud backup/sync or backup recovery feature. Schema lifecycle is
forward-only, destructive migration is blocked, rollback detection is
marker-only, and no rollback prevention or secure media deletion claim is made.

The public threat model and independent review packet are review inputs only.
No independent review, reviewer signoff, public user safety signoff, fabricated
review/peer evidence, or secure messenger claim is made by this upload set.

The privacy model comparison is a public gap map for the Korean
Briar/Cwtch-style direction. It is not a claim that this beta is
Briar/Cwtch-equivalent, audited E2EE-ready, repeatedly verified on external
onion delivery, offline-mesh capable, independently reviewed, or security-ready.

Public support diagnostics are local-copy only and limited to app status, build
identity, broad failure class, recovery next action, desktop local-private-flow
acceptance status/blockers/non-claims, and app-launch network boundary. No
workflow-state export, crash upload, telemetry, raw log export, crash dump
export, automated log collection, support bundle export, raw diagnostic file
export, bridge line, onion endpoint, invite code, pairing payload, envelope
payload, safety phrase, profile name, message text, local path, passphrase,
private key, key material, screenshot of private room data, or private planning
note is permitted in public diagnostics or release artifacts.

Public GitHub issues and release comments must use the same redaction boundary.
Security reports with exploit details or sensitive material must use private
vulnerability reporting when available, or a minimal public contact request when
private reporting is unavailable.

Repository governance keeps the public beta aligned with maintainer-driven
main-branch changes, no-central-trusted-server scope, unsigned release
non-claims, private-data redaction, and no fabricated external peer evidence.
EOF

cat > "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" <<EOF
# Operator Final Handoff - Unsigned Public Beta

This file is for the release operator. It is not a security audit, notarization,
production-readiness statement, external onion delivery report, or permission
for sensitive communication.

## Final Operation Decision Summary

- Upload decision: proceed only after the source preflight prints
  \`source_acceptance=desktop-release-source-accepted-for-operator-staging\`
  and the generated upload set prints \`status=unsigned-public-beta-release-ready\`.
- Explicit operator request gate: do not package, upload, or announce unless the
  user explicitly requested release packaging/upload in the current task.
- Hold decision: do not upload, do not announce, and return to desktop hardening
  if either required status is missing, if the generated files differ from
  \`MANIFEST.md\`, or if the post-upload checksum/body/asset checks fail.
- Operation boundary: this handoff does not perform a GitHub Release upload,
  does not rebuild the DMG, does not run heavy verification, and does not add a
  mobile release scope.
- Windows packaging hold: local Windows usability is not a public Windows
  artifact, installer, signing/store claim, release upload permission, or
  generated artifact commit permission without an explicit release request and
  the Windows public artifact prerequisites.
- Product boundary: this remains an unsigned experimental public beta, not
  audited, not production-ready, and sensitive communication prohibited.
- Next development axis after this handoff: desktop post-release hardening or
  non-release product work, not external onion delivery claims or mobile wrapper
  implementation.

## Before Upload

- Confirm this file lives inside: \`$RELEASE_DIR\`
- Confirm release tag: \`$RELEASE_TAG\`
- Confirm DMG SHA-256: \`$EXPECTED_DMG_SHA\`
- Confirm release body file: \`GITHUB_RELEASE_BODY.md\`
- Confirm upload allowlist source: \`MANIFEST.md\`
- Confirm \`scripts/public_release_readiness_preflight.sh\` printed:
  \`source_acceptance=desktop-release-source-accepted-for-operator-staging\`
- Confirm \`scripts/public_release_readiness_preflight.sh\` printed:
  \`decision=proceed-to-packaging-only-with-frozen-ignored-dmg\`
- Confirm \`scripts/public_release_readiness_preflight.sh\` printed:
  \`windows_packaging_hold_without_explicit_request=true\`
- Confirm \`scripts/public_release_readiness_preflight.sh\` printed:
  \`windows_packaging_upload_permitted_this_run=false\`
- Confirm \`scripts/prepare_unsigned_public_beta_release.sh\` printed:
  \`status=unsigned-public-beta-release-ready\`
- Confirm every upload file is listed in \`MANIFEST.md\`
- Confirm no extra files are uploaded.
- Confirm the DMG, \`.sha256\`, provenance JSON, \`MANIFEST.md\`, release notes,
  install guide, update-integrity note, and \`GITHUB_RELEASE_BODY.md\` are all
  attached to the same GitHub Release.
- Confirm no branch file, source archive, copied checksum, auto-update manifest,
  signing result, notarization result, or store approval is used as release or
  update authority.

Forbidden uploads:

- \`docs/\`
- \`beta-artifacts/\`
- the \`public-release/\` folder itself
- branch files
- source archives
- raw logs
- crash dumps
- screenshots
- local app data
- private diagnostics
- private planning notes
- any file not listed in \`MANIFEST.md\`

## Upload

Upload all and only the generated files listed in \`MANIFEST.md\` from this
release directory. Use \`GITHUB_RELEASE_BODY.md\` exactly as the GitHub Release
body.

## After Upload

- Download the DMG and \`.sha256\` from the published GitHub Release.
- Run: \`shasum -a 256 -c $RELEASE_DMG.sha256\`
- Confirm the output is: \`$RELEASE_DMG: OK\`
- Confirm the GitHub Release body still says: unsigned experimental public beta,
  not audited, not production-ready, and sensitive communication prohibited.
- Confirm the GitHub Release body still says external_delivery_claim=false and
  security_ready_claim=false.
- Confirm the GitHub Release contains the same-release DMG, \`.sha256\`,
  provenance JSON, \`MANIFEST.md\`, release notes, install guide,
  update-integrity note, and \`GITHUB_RELEASE_BODY.md\`.
- Confirm no auto-update manifest, signing result, notarization result, store
  approval, branch file, source archive, or copied checksum is described as
  release or update authority.
- Confirm no source archive, branch file, private file, raw log, crash dump,
  beta-artifacts folder, public-release folder, or docs folder was uploaded as
  a release asset.

If any after-upload confirmation fails:

- Do not announce the release as ready.
- Remove the incorrect release assets or move the GitHub Release back to a held
  draft/prerelease state before sharing it.
- Re-run \`scripts/public_release_readiness_preflight.sh\` and
  \`scripts/prepare_unsigned_public_beta_release.sh\` from source.
- Return to desktop hardening if the source preflight or regenerated upload set
  does not reproduce the required statuses above.

## Public User Boundary

Public users must verify the same-release \`.sha256\` file before opening the
DMG. The normal macOS Privacy & Security manual allow path is permitted only
after checksum verification. Terminal quarantine-removal commands are not an
install step.
EOF

for release_file in "${REQUIRED_RELEASE_FILES[@]}"; do
  require_file "$RELEASE_DIR/$release_file"
done

require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"artifact\": \"$RELEASE_DMG\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"artifact_sha256\": \"$EXPECTED_DMG_SHA\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"macos_public_support_scope\": \"$MACOS_PUBLIC_SUPPORT_SCOPE\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"macos_universal_artifact_ready\": $MACOS_UNIVERSAL_ARTIFACT_READY"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"macos_intel_artifact_ready\": $MACOS_INTEL_ARTIFACT_READY"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"macos_minimum_version_claimed\": $MACOS_MINIMUM_VERSION_CLAIMED"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"release_tag\": \"$RELEASE_TAG\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"release_url\": \"$RELEASE_URL\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_distribution\": \"local-build-candidate-only\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_public_artifact_ready\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_installer_ready\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_packaging_hold_without_explicit_request\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_packaging_upload_permitted_this_run\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_public_artifact_release_request_required\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_installer_signing_store_claim_allowed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_generated_artifact_commit_allowed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"release_authority\": \"same-github-release-assets\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"same_release_checksum_required\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"same_release_asset_set_authority_required\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"source_branch_release_authority\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"branch_or_source_archive_update_authority\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"packaging_decision\": \"proceed-to-packaging-only-with-frozen-ignored-dmg\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"packaging_fallback\": \"return-to-desktop-hardening-if-source-preflight-fails\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"upload_allowlist_source\": \"MANIFEST.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"upload_release_body\": \"GITHUB_RELEASE_BODY.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"upload_forbidden\": \"docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"install_allow_path\": \"macos-privacy-security-manual-allow-after-checksum\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"terminal_quarantine_removal_install_step\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"source_provenance_sha256\": \"$source_provenance_sha\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"dependency_inventory_file\": \"DEPENDENCY_INVENTORY.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"dependency_lockfile_evidence_count\": $dependency_lockfile_evidence_count"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"apps/desktop-tauri/package-lock.json\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"dependency_inventory_runtime_visible\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"supply_chain_audit_complete\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"sbom_published\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"vulnerability_triage_signoff_complete\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"reproducible_build_proof\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"live_dependency_scan_performed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_threat_model_file\": \"PUBLIC_THREAT_MODEL.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"privacy_model_comparison_file\": \"PRIVACY_MODEL_COMPARISON.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"independent_review_packet_file\": \"INDEPENDENT_REVIEW_PACKET.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_intake_policy_file\": \"PUBLIC_INTAKE_POLICY.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"repository_governance_file\": \"REPOSITORY_GOVERNANCE.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"component_boundaries_file\": \"COMPONENT_BOUNDARIES.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"independent_review_complete\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_review_gap_published\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"reviewer_signoff_claimed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_user_safety_signoff_claimed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"review_packet_inputs_public_safe\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"known_review_gaps_published\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_safe_review_commands_required\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"private_reporting_boundary\": \"private-vulnerability-reporting-or-minimal-public-contact-request\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"minimal_public_contact_request_allowed\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"fabricated_review_or_peer_evidence_allowed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_diagnostics_boundary\": \"status-build-failure-class-recovery-action-desktop-acceptance-only\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_intake_boundary\": \"redacted-public-diagnostics-or-minimal-contact-request-only\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"repository_governance_boundary\": \"main-maintainer-unsigned-beta-non-claim-redaction-guardrails\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"privacy_model_target\": \"no-phone-no-email-no-global-account-no-central-contact-discovery-no-central-message-server\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"briar_cwtch_equivalent_claim\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"audited_e2ee_claim\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"repeated_external_onion_evidence\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"offline_mesh_claim\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"security_ready_claim\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"backup_migration_boundary\": \"local-backup-exclusion-verification-forward-only-migration-non-claim\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"cloud_backup_or_sync\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"backup_recovery_claimed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"forward_only_schema_migration_required\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"destructive_migration_blocked\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"rollback_detection\": \"marker-only\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"rollback_prevention_claimed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"secure_media_deletion_claimed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"crash_upload\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"telemetry\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"raw_log_export\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"crash_dump_export\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"automated_log_collection\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"support_bundle_export\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"raw_diagnostic_file_export\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"auto_update\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"auto_update_manifest_trusted\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"signed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"notarized\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"platform_signing_trust_boundary\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"notarization_trust_boundary\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"store_trust_boundary\": false"
require_text "$RELEASE_DIR/MANIFEST.md" "Auto-update: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Auto-update manifest trusted: false"
require_text "$RELEASE_DIR/MANIFEST.md" "MANIFEST.md"
require_text "$RELEASE_DIR/MANIFEST.md" "Signing/notarization: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Platform signing trust boundary: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Notarization trust boundary: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Store trust boundary: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Release tag: \`$RELEASE_TAG\`"
require_text "$RELEASE_DIR/MANIFEST.md" "Release URL: \`$RELEASE_URL\`"
require_text "$RELEASE_DIR/MANIFEST.md" "Release authority: same-github-release-assets"
require_text "$RELEASE_DIR/MANIFEST.md" "Upload Allowlist"
require_text "$RELEASE_DIR/MANIFEST.md" "Forbidden Uploads"
require_text "$RELEASE_DIR/MANIFEST.md" "Same-release checksum required: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Same-release asset set authority required: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Source branch release authority: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Branch or source archive update authority: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Windows packaging hold without explicit request: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Windows packaging/upload permitted this run: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Windows public artifact release request required: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Windows installer/signing/store claim allowed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Windows generated artifact commit allowed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Operator Upload Boundary"
require_text "$RELEASE_DIR/MANIFEST.md" "Upload exactly the files listed in this \`MANIFEST.md\` from this generated"
require_text "$RELEASE_DIR/MANIFEST.md" "Use \`GITHUB_RELEASE_BODY.md\` exactly as the GitHub Release"
require_text "$RELEASE_DIR/MANIFEST.md" "Do not upload \`docs/\`, \`beta-artifacts/\`, the \`public-release/\` folder itself"
require_text "$RELEASE_DIR/MANIFEST.md" "branch files, source archives, raw logs, crash dumps"
require_text "$RELEASE_DIR/MANIFEST.md" "any file not listed in"
require_text "$RELEASE_DIR/MANIFEST.md" "Install allow path: macos-privacy-security-manual-allow-after-checksum"
require_text "$RELEASE_DIR/MANIFEST.md" "Terminal quarantine-removal install step: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Independent review complete: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Public review gap published: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Reviewer signoff claimed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Public user safety signoff claimed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Review packet inputs public safe: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Known review gaps published: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Public-safe review commands required: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Private reporting boundary: private-vulnerability-reporting-or-minimal-public-contact-request"
require_text "$RELEASE_DIR/MANIFEST.md" "Minimal public contact request allowed: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Fabricated review or peer evidence allowed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Public diagnostics boundary: status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$RELEASE_DIR/MANIFEST.md" "desktop local-private-flow acceptance status/blockers/non-claims"
require_text "$RELEASE_DIR/MANIFEST.md" "Public intake boundary: redacted-public-diagnostics-or-minimal-contact-request-only"
require_text "$RELEASE_DIR/MANIFEST.md" "Repository governance boundary: main-maintainer-unsigned-beta-non-claim-redaction-guardrails"
require_text "$RELEASE_DIR/MANIFEST.md" "Dependency lockfile evidence count: $dependency_lockfile_evidence_count"
require_text "$RELEASE_DIR/MANIFEST.md" "Dependency inventory runtime visible: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Supply-chain audit complete: false"
require_text "$RELEASE_DIR/MANIFEST.md" "SBOM published: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Vulnerability triage signoff complete: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Reproducible-build proof: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Live dependency scan performed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Privacy model comparison: \`PRIVACY_MODEL_COMPARISON.md\`"
require_text "$RELEASE_DIR/MANIFEST.md" "Component boundaries: \`COMPONENT_BOUNDARIES.md\`"
require_text "$RELEASE_DIR/MANIFEST.md" "OPERATOR_FINAL_HANDOFF.md"
require_text "$RELEASE_DIR/MANIFEST.md" "Briar/Cwtch-equivalent claim: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Audited E2EE claim: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Repeated external onion evidence: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Offline mesh claim: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Security-ready claim: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Backup/migration boundary: local-backup-exclusion-verification-forward-only-migration-non-claim"
require_text "$RELEASE_DIR/MANIFEST.md" "Cloud backup or sync: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Backup recovery claimed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Forward-only schema migration required: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Destructive migration blocked: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Rollback detection: marker-only"
require_text "$RELEASE_DIR/MANIFEST.md" "Rollback prevention claimed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Secure media deletion claimed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Crash upload: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Telemetry: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Raw log export: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Crash dump export: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Automated log collection: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Support bundle export: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Raw diagnostic file export: disabled"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "unsigned experimental public beta"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "not audited"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "not production-ready"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "sensitive communication prohibited"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "external_delivery_claim=false"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "security_ready_claim=false"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "GITHUB_RELEASE_BODY.md"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "OPERATOR_FINAL_HANDOFF.md"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "COMPONENT_BOUNDARIES.md"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "Upload boundary for operators"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "Use \`GITHUB_RELEASE_BODY.md\` exactly as"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "Do not upload \`docs/\`, \`beta-artifacts/\`, the"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "or any file not listed in the manifest"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "GitHub source archives"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "completed independent review"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "fabricated external review"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "crash upload, telemetry, raw log export"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "automated log"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "support bundle"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "raw diagnostic file"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "cloud backup/sync or backup recovery"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "destructive migration"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "private vulnerability reporting"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "External onion delivery is outside the v0.1 public product claim"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "No peer report is expected or required for this v0.1 claim"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "no external delivery claim is made"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "Briar/Cwtch-equivalent"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "live dependency scan"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "vulnerability triage"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "apps/desktop-tauri/package-lock.json"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "does not provide auto-update"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "same GitHub Release"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "Branch files can move after a release"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "branch-file or source-archive release proof"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "Use the files attached to that GitHub Release as the release authority"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "branch files copied from GitHub's source"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "GitHub source archives"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "COMPONENT_BOUNDARIES.md"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "Privacy & Security"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "Do not use terminal quarantine-removal commands"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "no auto-update channel"
require_text "$RELEASE_DIR/RELEASE_NOTES.md" "Same GitHub Release assets are the release authority"
require_text "$RELEASE_DIR/RELEASE_NOTES.md" "Do not use terminal quarantine-removal commands"
require_text "$RELEASE_DIR/RELEASE_NOTES.md" "desktop local-private-flow acceptance status/blockers/non-claims"
reject_text "$RELEASE_DIR/RELEASE_NOTES.md" "manual network"
require_text "$RELEASE_DIR/SUPPLY_CHAIN_BASELINE.md" "not a supply-chain audit"
require_text "$RELEASE_DIR/DEPENDENCY_INVENTORY.md" "not an SBOM"
require_text "$RELEASE_DIR/DEPENDENCY_INVENTORY.md" "Lockfile Evidence Summary"
require_text "$RELEASE_DIR/DEPENDENCY_INVENTORY.md" "Vulnerability triage signoff complete: false"
require_text "$RELEASE_DIR/PUBLIC_THREAT_MODEL.md" "not a secure messenger release today"
require_text "$RELEASE_DIR/PUBLIC_THREAT_MODEL.md" "public support diagnostics"
require_text "$RELEASE_DIR/PUBLIC_THREAT_MODEL.md" "raw logs"
require_text "$RELEASE_DIR/PRIVACY_MODEL_COMPARISON.md" "gap map, not a"
require_text "$RELEASE_DIR/PRIVACY_MODEL_COMPARISON.md" "Where the Current Beta Is Behind Briar/Cwtch"
require_text "$RELEASE_DIR/PRIVACY_MODEL_COMPARISON.md" "not audited, not production-ready, and sensitive communication prohibited"
require_text "$RELEASE_DIR/INDEPENDENT_REVIEW_PACKET.md" "not an external review result"
require_text "$RELEASE_DIR/INDEPENDENT_REVIEW_PACKET.md" "Known Review Gaps"
require_text "$RELEASE_DIR/PUBLIC_INTAKE_POLICY.md" "Forbidden Public Intake"
require_text "$RELEASE_DIR/PUBLIC_INTAKE_POLICY.md" "private vulnerability reporting"
require_text "$RELEASE_DIR/PUBLIC_INTAKE_POLICY.md" "support bundles"
require_text "$RELEASE_DIR/PUBLIC_INTAKE_POLICY.md" "raw diagnostic"
require_text "$RELEASE_DIR/REPOSITORY_GOVERNANCE.md" "Direction Lock"
require_text "$RELEASE_DIR/REPOSITORY_GOVERNANCE.md" "Release Guardrails"
require_text "$RELEASE_DIR/COMPONENT_BOUNDARIES.md" "Release and updates"
require_text "$RELEASE_DIR/COMPONENT_BOUNDARIES.md" "not a secure messenger release today"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Operator Final Handoff"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Final Operation Decision Summary"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Upload decision: proceed only after the source preflight prints"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Hold decision: do not upload, do not announce, and return to desktop hardening"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Operation boundary: this handoff does not perform a GitHub Release upload"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Windows packaging hold: local Windows usability is not a public Windows"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "windows_packaging_hold_without_explicit_request=true"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "windows_packaging_upload_permitted_this_run=false"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Next development axis after this handoff: desktop post-release hardening or"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "source_acceptance=desktop-release-source-accepted-for-operator-staging"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "decision=proceed-to-packaging-only-with-frozen-ignored-dmg"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "status=unsigned-public-beta-release-ready"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Confirm every upload file is listed in \`MANIFEST.md\`"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "attached to the same GitHub Release"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "auto-update manifest"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "store approval"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "release or update authority"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Use \`GITHUB_RELEASE_BODY.md\` exactly as the GitHub Release"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Download the DMG and \`.sha256\` from the published GitHub Release"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "shasum -a 256 -c $RELEASE_DMG.sha256"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "$RELEASE_DMG: OK"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "If any after-upload confirmation fails"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Do not announce the release as ready"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Remove the incorrect release assets or move the GitHub Release back to a held"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Return to desktop hardening if the source preflight or regenerated upload set"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "external_delivery_claim=false"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "security_ready_claim=false"
require_text "$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md" "Terminal quarantine-removal commands are not an"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "Cargo.lock"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "apps/desktop-tauri/src-tauri/Cargo.lock"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "apps/desktop-tauri/package-lock.json"

echo "release_dir=$RELEASE_DIR"
echo "release_dmg=$RELEASE_DMG"
echo "manifest=$RELEASE_DIR/MANIFEST.md"
echo "operator_final_handoff=$RELEASE_DIR/OPERATOR_FINAL_HANDOFF.md"
echo "dmg_sha256=$EXPECTED_DMG_SHA"
echo "source_provenance_sha256=$source_provenance_sha"
echo "operator_request_gate=explicit-user-request-required-before-packaging-upload"
echo "next=hold unless explicit release upload was requested; upload all and only generated files listed in MANIFEST.md from release_dir; use GITHUB_RELEASE_BODY.md as the release body"
echo "operator_upload_allowlist=MANIFEST.md"
echo "operator_release_body=use GITHUB_RELEASE_BODY.md exactly"
echo "operator_verify=downloaded users must verify ${RELEASE_DMG}.sha256 before opening"
echo "operator_update_authority=same-release-assets-only-no-auto-update-manifest-signing-notarization-store-branch-source-archive"
echo "operator_forbidden=do not upload docs,beta-artifacts,public-release folder itself,branch files,source archives,raw logs,crash dumps,private data"
echo "operator_non_claims=unsigned experimental public beta; not audited; not production-ready; sensitive communication prohibited; external_delivery_claim=false; security_ready_claim=false"
echo "operator_handoff_wrapup=upload-only-after-explicit-user-request-source-and-staging-statuses-otherwise-hold-and-return-to-desktop-hardening"
echo "windows_packaging_hold_without_explicit_request=true"
echo "windows_packaging_upload_permitted_this_run=false"
echo "windows_public_artifact_release_request_required=true"
echo "windows_public_artifact_ready=false"
echo "windows_installer_ready=false"
echo "windows_signing_ready=false"
echo "windows_installer_signing_store_claim_allowed=false"
echo "windows_generated_artifact_commit_allowed=false"
echo "windows_packaging_prerequisites=explicit-release-request#real-windows-runtime-smoke#packaging-review#installer-signing-decisions#checksum-provenance#upload-hold-review"
echo "next_development_axis=desktop-post-release-hardening-or-non-release-product-work"
echo "status=unsigned-public-beta-release-ready"
