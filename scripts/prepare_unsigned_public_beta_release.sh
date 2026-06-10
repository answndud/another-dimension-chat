#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP_VERSION="0.1.0"
BUILD_CHANNEL="beta-onion"
BUILD_COMMIT="806ecad1"
PLATFORM="macos-aarch64"
EXPECTED_DMG_SHA="625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95"

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
  "DEPENDENCY_LOCKFILES.sha256"
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
  if ! grep -Fq "$expected" "$file"; then
    echo "FAIL missing expected text in $file: $expected" >&2
    exit 1
  fi
}

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
  "distribution": "unsigned-github-public-beta",
  "notarized": false,
  "signed": false,
  "auto_update": false,
  "startup_network_sockets": "none",
  "source_provenance_sha256": "$source_provenance_sha",
  "dependency_lockfiles_sha256_file": "DEPENDENCY_LOCKFILES.sha256",
  "dependency_inventory_file": "DEPENDENCY_INVENTORY.md",
  "public_threat_model_file": "PUBLIC_THREAT_MODEL.md",
  "privacy_model_comparison_file": "PRIVACY_MODEL_COMPARISON.md",
  "independent_review_packet_file": "INDEPENDENT_REVIEW_PACKET.md",
  "public_intake_policy_file": "PUBLIC_INTAKE_POLICY.md",
  "repository_governance_file": "REPOSITORY_GOVERNANCE.md",
  "independent_review_complete": false,
  "public_review_gap_published": true,
  "reviewer_signoff_claimed": false,
  "public_diagnostics_boundary": "status-build-failure-class-only",
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
    "no Briar/Cwtch-equivalent claim"
  ]
}
EOF

cat > "$RELEASE_DIR/MANIFEST.md" <<EOF
# Another Dimension Chat unsigned public beta manifest

This folder is for a GitHub Release upload.

## Files

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
- \`DEPENDENCY_LOCKFILES.sha256\`

## Build

- App version: \`$APP_VERSION\`
- Build channel: \`$BUILD_CHANNEL\`
- Build commit: \`$BUILD_COMMIT\`
- Platform: \`$PLATFORM\`
- DMG SHA-256: \`$EXPECTED_DMG_SHA\`
- Public provenance: \`$RELEASE_PROVENANCE\`
- Source provenance SHA-256: \`$source_provenance_sha\`
- Dependency inventory: \`DEPENDENCY_INVENTORY.md\`
- Dependency lockfile hashes: \`DEPENDENCY_LOCKFILES.sha256\`
- Public threat model: \`PUBLIC_THREAT_MODEL.md\`
- Privacy model comparison: \`PRIVACY_MODEL_COMPARISON.md\`
- Independent review packet: \`INDEPENDENT_REVIEW_PACKET.md\`
- Public intake policy: \`PUBLIC_INTAKE_POLICY.md\`
- Repository governance: \`REPOSITORY_GOVERNANCE.md\`
- Independent review complete: false
- Public review gap published: true
- Reviewer signoff claimed: false
- Public diagnostics boundary: status-build-failure-class-only
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
- Auto-update: disabled
- Signing/notarization: disabled

## Boundary

This is an unsigned experimental public beta. It is not notarized, not audited,
not production-ready, and sensitive communication prohibited.

External two-machine onion delivery has not been independently verified for
this beta. Same-machine dual-profile rehearsal is development evidence only.

Manual update integrity is limited to user-verified SHA-256 files and the
provenance/dependency-inventory/lockfile-hash evidence in this upload set.
There is no auto-update, signing, notarization, reproducible-build, SBOM, or
security-audit claim.

Local backup exclusion is a required local verification boundary for this beta,
not a cloud backup/sync or backup recovery feature. Schema lifecycle is
forward-only, destructive migration is blocked, rollback detection is
marker-only, and no rollback prevention or secure media deletion claim is made.

The public threat model and independent review packet are review inputs only.
No independent review, reviewer signoff, public user safety signoff, or secure
messenger claim is made by this upload set.

The privacy model comparison is a public gap map for the Korean
Briar/Cwtch-style direction. It is not a claim that this beta is
Briar/Cwtch-equivalent, audited E2EE-ready, repeatedly verified on external
onion delivery, offline-mesh capable, independently reviewed, or security-ready.

Public diagnostics are local-copy only and limited to status, build, failure
class, manual network permission, and app-launch network boundary. No crash
upload, telemetry, raw log export, bridge line, onion endpoint, invite code,
pairing payload, envelope payload, safety phrase, profile name, message text,
local path, passphrase, private key, key material, or private planning note is
permitted in public diagnostics or release artifacts.

Public GitHub issues and release comments must use the same redaction boundary.
Security reports with exploit details or sensitive material must use private
vulnerability reporting when available, or a minimal public contact request when
private reporting is unavailable.

Repository governance keeps the public beta aligned with maintainer-driven
main-branch changes, no-central-trusted-server scope, unsigned release
non-claims, private-data redaction, and no fabricated external peer evidence.
EOF

for release_file in "${REQUIRED_RELEASE_FILES[@]}"; do
  require_file "$RELEASE_DIR/$release_file"
done

require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"artifact\": \"$RELEASE_DMG\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"artifact_sha256\": \"$EXPECTED_DMG_SHA\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"source_provenance_sha256\": \"$source_provenance_sha\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"dependency_inventory_file\": \"DEPENDENCY_INVENTORY.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_threat_model_file\": \"PUBLIC_THREAT_MODEL.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"privacy_model_comparison_file\": \"PRIVACY_MODEL_COMPARISON.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"independent_review_packet_file\": \"INDEPENDENT_REVIEW_PACKET.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_intake_policy_file\": \"PUBLIC_INTAKE_POLICY.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"repository_governance_file\": \"REPOSITORY_GOVERNANCE.md\""
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"independent_review_complete\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_review_gap_published\": true"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"reviewer_signoff_claimed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"public_diagnostics_boundary\": \"status-build-failure-class-only\""
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
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"auto_update\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"signed\": false"
require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"notarized\": false"
require_text "$RELEASE_DIR/MANIFEST.md" "Auto-update: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Signing/notarization: disabled"
require_text "$RELEASE_DIR/MANIFEST.md" "Independent review complete: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Public review gap published: true"
require_text "$RELEASE_DIR/MANIFEST.md" "Reviewer signoff claimed: false"
require_text "$RELEASE_DIR/MANIFEST.md" "Public diagnostics boundary: status-build-failure-class-only"
require_text "$RELEASE_DIR/MANIFEST.md" "Public intake boundary: redacted-public-diagnostics-or-minimal-contact-request-only"
require_text "$RELEASE_DIR/MANIFEST.md" "Repository governance boundary: main-maintainer-unsigned-beta-non-claim-redaction-guardrails"
require_text "$RELEASE_DIR/MANIFEST.md" "Privacy model comparison: \`PRIVACY_MODEL_COMPARISON.md\`"
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
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "unsigned experimental public beta"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "not audited"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "not production-ready"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "sensitive communication prohibited"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "GITHUB_RELEASE_BODY.md"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "completed independent review"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "crash upload, telemetry, raw log export"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "cloud backup/sync or backup recovery"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "destructive migration"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "private vulnerability reporting"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "External two-machine onion delivery has not yet been independently verified"
require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "Briar/Cwtch-equivalent"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "does not provide auto-update"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "same GitHub Release"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "Branch files can move after a release"
require_text "$RELEASE_DIR/UPDATE_INTEGRITY.md" "branch-file or source-archive release proof"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "Use the files attached to that GitHub Release as the release authority"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "branch files copied from GitHub's source"
require_text "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md" "no auto-update channel"
require_text "$RELEASE_DIR/SUPPLY_CHAIN_BASELINE.md" "not a supply-chain audit"
require_text "$RELEASE_DIR/DEPENDENCY_INVENTORY.md" "not an SBOM"
require_text "$RELEASE_DIR/PUBLIC_THREAT_MODEL.md" "not a secure messenger release today"
require_text "$RELEASE_DIR/PUBLIC_THREAT_MODEL.md" "public diagnostics"
require_text "$RELEASE_DIR/PUBLIC_THREAT_MODEL.md" "raw logs"
require_text "$RELEASE_DIR/PRIVACY_MODEL_COMPARISON.md" "gap map, not a"
require_text "$RELEASE_DIR/PRIVACY_MODEL_COMPARISON.md" "Where the Current Beta Is Behind Briar/Cwtch"
require_text "$RELEASE_DIR/PRIVACY_MODEL_COMPARISON.md" "not audited, not production-ready, and sensitive communication prohibited"
require_text "$RELEASE_DIR/INDEPENDENT_REVIEW_PACKET.md" "not an external review result"
require_text "$RELEASE_DIR/INDEPENDENT_REVIEW_PACKET.md" "Known Review Gaps"
require_text "$RELEASE_DIR/PUBLIC_INTAKE_POLICY.md" "Forbidden Public Intake"
require_text "$RELEASE_DIR/PUBLIC_INTAKE_POLICY.md" "private vulnerability reporting"
require_text "$RELEASE_DIR/REPOSITORY_GOVERNANCE.md" "Direction Lock"
require_text "$RELEASE_DIR/REPOSITORY_GOVERNANCE.md" "Release Guardrails"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "Cargo.lock"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "apps/desktop-tauri/src-tauri/Cargo.lock"
require_text "$RELEASE_DIR/DEPENDENCY_LOCKFILES.sha256" "apps/desktop-tauri/package-lock.json"

echo "release_dir=$RELEASE_DIR"
echo "release_dmg=$RELEASE_DMG"
echo "dmg_sha256=$EXPECTED_DMG_SHA"
echo "source_provenance_sha256=$source_provenance_sha"
echo "status=unsigned-public-beta-release-ready"
