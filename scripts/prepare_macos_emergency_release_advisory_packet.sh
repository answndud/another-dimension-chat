#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  printf '%s' "$value"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

INCIDENT_CLASS="${AD_EMERGENCY_INCIDENT_CLASS:-checksum-mismatch}"
DECISION="${AD_EMERGENCY_DECISION:-advisory}"
AFFECTED_RELEASE_TAG="${AD_AFFECTED_RELEASE_TAG:-unknown-release}"
AFFECTED_ARTIFACT="${AD_AFFECTED_ARTIFACT:-unknown-artifact}"
AFFECTED_ARTIFACT_SHA256="${AD_AFFECTED_ARTIFACT_SHA256:-}"
AFFECTED_PROVENANCE_SHA256="${AD_AFFECTED_PROVENANCE_SHA256:-}"
AFFECTED_DISTRIBUTION_MANIFEST_SHA256="${AD_AFFECTED_DISTRIBUTION_MANIFEST_SHA256:-}"
REPLACEMENT_RELEASE_TAG="${AD_REPLACEMENT_RELEASE_TAG:-none-yet}"
OUTPUT_DIR="${AD_EMERGENCY_OUTPUT_DIR:-apps/desktop-tauri/beta-artifacts/emergency-release}"
EXECUTE="${AD_EXECUTE_MACOS_EMERGENCY_ADVISORY:-0}"
OWNER_APPROVED="${AD_OWNER_APPROVED_EMERGENCY_ADVISORY:-0}"

case "$INCIDENT_CLASS" in
  bad-artifact|checksum-mismatch|dependency-vulnerability|key-compromise|claim-drift) ;;
  *) fail "unsupported emergency incident class: $INCIDENT_CLASS" ;;
esac

case "$DECISION" in
  hold|advisory|rebuild|revoke) ;;
  *) fail "unsupported emergency decision: $DECISION" ;;
esac

require_sha256() {
  local name="$1"
  local value="$2"
  [[ "$value" =~ ^[a-f0-9]{64}$ ]] || fail "$name must be a lowercase 64-char SHA-256 value before writing an emergency advisory packet"
}

for flag in AD_RELEASE_UPLOAD_AUTHORIZED AD_DMG_REBUILD_AUTHORIZED AD_RELEASE_ASSET_DELETE_AUTHORIZED AD_RELEASE_ADVISORY_PUBLICATION_AUTHORIZED; do
  if [ "${!flag:-0}" = "1" ]; then
    fail "$flag is not allowed by the emergency advisory packet script"
  fi
done

if [ "$EXECUTE" != "1" ]; then
  cat <<STATUS
status=macos-emergency-release-advisory-dry-run
incident_class=$INCIDENT_CLASS
decision=$DECISION
affected_release_tag=$AFFECTED_RELEASE_TAG
affected_artifact=$AFFECTED_ARTIFACT
replacement_release_tag=$REPLACEMENT_RELEASE_TAG
emergency_release_generates_app_artifact=false
emergency_release_upload_authorized=false
emergency_release_dmg_rebuild_authorized=false
emergency_release_asset_delete_authorized=false
emergency_release_advisory_publication_authorized=false
rollback_prevention_claimed=false
auto_update_channel_ready=false
signed_update_manifest_ready=false
security_ready_claimed=false
sensitive_communication_allowed=false
STATUS
  exit 0
fi

[ "$OWNER_APPROVED" = "1" ] || fail "set AD_OWNER_APPROVED_EMERGENCY_ADVISORY=1 to write advisory/checklist files"
[[ "$AFFECTED_RELEASE_TAG" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$ ]] ||
  fail "AD_AFFECTED_RELEASE_TAG must be a concrete release tag before writing an emergency advisory packet"
[ "$AFFECTED_ARTIFACT" != "unknown-artifact" ] || fail "AD_AFFECTED_ARTIFACT is required before writing an emergency advisory packet"
[ "$AFFECTED_ARTIFACT" = "$(basename "$AFFECTED_ARTIFACT")" ] ||
  fail "AD_AFFECTED_ARTIFACT must be an artifact filename, not a path"
require_sha256 "AD_AFFECTED_ARTIFACT_SHA256" "$AFFECTED_ARTIFACT_SHA256"
require_sha256 "AD_AFFECTED_PROVENANCE_SHA256" "$AFFECTED_PROVENANCE_SHA256"
require_sha256 "AD_AFFECTED_DISTRIBUTION_MANIFEST_SHA256" "$AFFECTED_DISTRIBUTION_MANIFEST_SHA256"

mkdir -p "$OUTPUT_DIR"
manifest="$OUTPUT_DIR/MACOS_EMERGENCY_RELEASE_ADVISORY_MANIFEST.json"
advisory="$OUTPUT_DIR/MACOS_EMERGENCY_RELEASE_ADVISORY.md"

cat >"$manifest" <<JSON
{
  "schema_version": "macos-emergency-release-advisory-manifest-v1",
  "incident_class": "$(json_escape "$INCIDENT_CLASS")",
  "decision": "$(json_escape "$DECISION")",
  "affected_release_tag": "$(json_escape "$AFFECTED_RELEASE_TAG")",
  "affected_artifact": "$(json_escape "$AFFECTED_ARTIFACT")",
  "affected_artifact_sha256": "$(json_escape "$AFFECTED_ARTIFACT_SHA256")",
  "affected_provenance_sha256": "$(json_escape "$AFFECTED_PROVENANCE_SHA256")",
  "affected_distribution_manifest_sha256": "$(json_escape "$AFFECTED_DISTRIBUTION_MANIFEST_SHA256")",
  "replacement_release_tag": "$(json_escape "$REPLACEMENT_RELEASE_TAG")",
  "same_release_asset_authority_required": true,
  "branch_source_release_authority_allowed": false,
  "emergency_release_generates_app_artifact": false,
  "emergency_release_upload_authorized": false,
  "emergency_release_dmg_rebuild_authorized": false,
  "emergency_release_asset_delete_authorized": false,
  "emergency_release_advisory_publication_authorized": false,
  "rollback_prevention_claimed": false,
  "auto_update_channel_ready": false,
  "signed_update_manifest_ready": false,
  "security_ready_claimed": false,
  "sensitive_communication_allowed": false,
  "hold_flags": {
    "emergency_release_generates_app_artifact": false,
    "emergency_release_upload_authorized": false,
    "emergency_release_dmg_rebuild_authorized": false,
    "emergency_release_asset_delete_authorized": false,
    "emergency_release_advisory_publication_authorized": false,
    "rollback_prevention_claimed": false,
    "auto_update_channel_ready": false,
    "signed_update_manifest_ready": false,
    "update_signature_ready": false,
    "stable_release_allowed": false,
    "production_distribution_ready": false,
    "security_ready_claimed": false,
    "production_ready_claim_allowed": false,
    "audited_claim_allowed": false,
    "sensitive_communication_allowed": false
  }
}
JSON

cat >"$advisory" <<MD
# macOS Emergency Release Advisory Draft

- Incident class: \`$INCIDENT_CLASS\`
- Decision: \`$DECISION\`
- Affected release tag: \`$AFFECTED_RELEASE_TAG\`
- Affected artifact: \`$AFFECTED_ARTIFACT\`
- Affected artifact SHA-256: \`$AFFECTED_ARTIFACT_SHA256\`
- Affected provenance SHA-256: \`$AFFECTED_PROVENANCE_SHA256\`
- Affected distribution manifest SHA-256: \`$AFFECTED_DISTRIBUTION_MANIFEST_SHA256\`
- Replacement release tag: \`$REPLACEMENT_RELEASE_TAG\`

Stop before opening a suspect artifact. Use only same-GitHub-Release assets
for checksum, provenance, manifest, release notes, and update integrity
evidence. Branch files and source archives are not release authority.

This draft does not upload a release, rebuild a DMG, delete release assets,
publish an advisory, enable auto-update, prove rollback prevention, claim
security readiness, or permit sensitive communication.
MD

cat <<STATUS
status=macos-emergency-release-advisory-packet-written
manifest=$manifest
advisory=$advisory
emergency_release_generates_app_artifact=false
emergency_release_upload_authorized=false
emergency_release_dmg_rebuild_authorized=false
emergency_release_asset_delete_authorized=false
emergency_release_advisory_publication_authorized=false
STATUS
