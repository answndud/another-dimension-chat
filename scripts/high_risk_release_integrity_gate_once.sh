#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_ARTIFACT_NAME="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
BUILD_CHANNEL="manual-github-release"
EMERGENCY_ADVISORY_AUTHORITY="scripts/prepare_macos_emergency_release_advisory_packet.sh"
SIGNED_UPDATE_MANIFEST_VALIDATOR="scripts/validate_macos_signed_update_manifest.mjs"
TAURI_CONFIG="apps/desktop-tauri/src-tauri/tauri.conf.json"

fail() {
  echo "FAIL $*" >&2
  exit 1
}

require_file() {
  local file="$1"
  [ -f "$ROOT_DIR/$file" ] || fail "missing required release integrity source: $file"
}

require_text() {
  local file="$1"
  local expected="$2"
  grep -Fq -- "$expected" "$ROOT_DIR/$file" ||
    fail "missing expected release integrity boundary in $file: $expected"
}

forbid_text() {
  local file="$1"
  local forbidden="$2"
  ! grep -Fq -- "$forbidden" "$ROOT_DIR/$file" ||
    fail "forbidden release integrity text in $file: $forbidden"
}

for file in \
  Cargo.lock \
  apps/desktop-tauri/package-lock.json \
  apps/desktop-tauri/src-tauri/Cargo.lock \
  "$TAURI_CONFIG" \
  "$EMERGENCY_ADVISORY_AUTHORITY" \
  "$SIGNED_UPDATE_MANIFEST_VALIDATOR" \
  scripts/prepare_unsigned_public_beta_release.sh \
  reference/UPDATE_INTEGRITY.md \
  reference/SUPPLY_CHAIN_BASELINE.md \
  reference/DEPENDENCY_INVENTORY.md
do
  require_file "$file"
done

require_text reference/MACOS_EMERGENCY_RELEASE_INTEGRITY.md "release_integrity_condition_set=checksum-provenance#manual-advisory#signed-update-manifest-candidate"
require_text reference/MACOS_EMERGENCY_RELEASE_INTEGRITY.md "release_integrity_checksum_provenance_ready=true"
require_text reference/MACOS_EMERGENCY_RELEASE_INTEGRITY.md "release_integrity_manual_advisory_ready=true"
require_text reference/MACOS_EMERGENCY_RELEASE_INTEGRITY.md "release_integrity_signed_update_manifest_candidate_ready=true"
require_text reference/MACOS_EMERGENCY_RELEASE_INTEGRITY.md "release_integrity_ready=true"
require_text reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md "release_integrity_signed_update_manifest_candidate_ready=true"
require_text reference/HIGH_RISK_THREAT_MODEL.md "release_integrity_condition_set=checksum-provenance#manual-advisory#signed-update-manifest-candidate"

require_text scripts/prepare_unsigned_public_beta_release.sh "$RELEASE_ARTIFACT_NAME"
require_text scripts/prepare_unsigned_public_beta_release.sh "\"same_release_checksum_required\": true"
require_text scripts/prepare_unsigned_public_beta_release.sh "\"source_commit\""
require_text scripts/prepare_unsigned_public_beta_release.sh "\"build_channel\""
require_text scripts/prepare_unsigned_public_beta_release.sh "\"rollback_prevention_claimed\": false"

require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "signed_payload_sha256"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "signature_base64"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "artifact_name"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "artifact_sha256"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "source_commit"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "rollback_policy"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "rollback_prevention_claimed"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "signed_update_manifest_ready"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "passphrase"
require_text "$SIGNED_UPDATE_MANIFEST_VALIDATOR" "onion-endpoint"

require_text "$EMERGENCY_ADVISORY_AUTHORITY" "emergency_release_advisory_publication_authorized=false"
require_text "$EMERGENCY_ADVISORY_AUTHORITY" "rollback_prevention_claimed=false"
require_text "$EMERGENCY_ADVISORY_AUTHORITY" "AD_OWNER_APPROVED_EMERGENCY_ADVISORY=1"
require_text "$EMERGENCY_ADVISORY_AUTHORITY" "affected_provenance_sha256"

require_text "$TAURI_CONFIG" "\"csp\": \"default-src 'self'; style-src 'self' 'unsafe-inline'\""
require_text "$TAURI_CONFIG" "\"resources\": []"
require_text "$TAURI_CONFIG" "\"signingIdentity\": null"
require_text "$TAURI_CONFIG" "\"exceptionDomain\": null"
forbid_text "$TAURI_CONFIG" "http://*"
forbid_text "$TAURI_CONFIG" "https://*"

lockfile_count="$(
  cd "$ROOT_DIR"
  shasum -a 256 Cargo.lock apps/desktop-tauri/src-tauri/Cargo.lock apps/desktop-tauri/package-lock.json |
    wc -l |
    tr -d ' '
)"
[ "$lockfile_count" = "3" ] || fail "expected exactly three dependency lockfile hash inputs"

source_commit="$(cd "$ROOT_DIR" && git rev-parse --verify HEAD)"

echo "status=high-risk-release-integrity-gate-ready"
echo "scope=source-only-no-release-upload-no-artifact-generation"
echo "readiness_condition=release-integrity"
echo "release_integrity_condition_set=checksum-provenance#manual-advisory#signed-update-manifest-candidate"
echo "release_integrity_checksum_provenance_ready=true"
echo "release_integrity_manual_advisory_ready=true"
echo "release_integrity_signed_update_manifest_candidate_ready=true"
echo "release_integrity_ready=true"
echo "readiness_missing_conditions=none"
echo "release_artifact_name=$RELEASE_ARTIFACT_NAME"
echo "release_artifact_checksum_policy=same-release-sha256-required"
echo "release_artifact_provenance_policy=same-release-provenance-required"
echo "signed_update_manifest_validator=$SIGNED_UPDATE_MANIFEST_VALIDATOR"
echo "source_commit=$source_commit"
echo "build_channel=$BUILD_CHANNEL"
echo "dependency_lockfile_hash_inputs=3"
echo "tauri_boundary=csp-permissions-remote-code-reviewed"
echo "emergency_advisory_authority=$EMERGENCY_ADVISORY_AUTHORITY"
echo "rollback_prevention_claimed=false"
echo "auto_update_ready=false"
echo "signed_update_manifest_ready=false"
echo "update_signature_ready=false"
echo "high_risk_release_claim_allowed=false"
echo "high_risk_ready_claim_allowed=false"
echo "sensitive_material_recorded=false"
