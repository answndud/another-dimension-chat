#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden update/release claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md"

for file in "$DOC" \
  "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md" \
  "scripts/validate_macos_signed_update_manifest.mjs" \
  "reference/UPDATE_INTEGRITY.md" \
  "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md" \
  "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md" \
  "reference/STABLE_MACOS_V1_RELEASE_GATE.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "README.md" \
  "SECURITY.md" \
  "reference/INDEPENDENT_REVIEW_PACKET.md"; do
  [ -f "$file" ] || fail "missing macOS update channel input: $file"
done

must_contain "$DOC" "macos_update_rollback_safe_release_channel_reviewed=true"
must_contain "$DOC" "m100_7_update_blocker_closed=true"
must_contain "$DOC" "update_channel_policy_waiver_authorized=true"
must_contain "$DOC" "update_channel_waiver_scope=active-queue-unblock-only"
must_contain "$DOC" "signed_update_or_rollback_evidence_required_for_stable_claims=true"
must_contain "$DOC" "manual_update_integrity_policy_available=true"
must_contain "$DOC" "same_release_asset_authority_required=true"
must_contain "$DOC" "branch_source_release_authority_allowed=false"
must_contain "$DOC" "source_archive_release_authority_allowed=false"
must_contain "$DOC" "platform_store_security_boundary_allowed=false"
must_contain "$DOC" "auto_update_channel_ready=false"
must_contain "$DOC" "macos_signed_update_manifest_schema_available=true"
must_contain "$DOC" "macos_signed_update_manifest_validator_available=true"
must_contain "$DOC" "signed_update_manifest_candidate_verifier_ready=true"
must_contain "$DOC" "signed_update_manifest_ready=false"
must_contain "$DOC" "update_signature_ready=false"
must_contain "$DOC" "update_version_monotonicity_policy_ready=true"
must_contain "$DOC" "rollback_warning_policy_ready=true"
must_contain "$DOC" "rollback_prevention_claimed=false"
must_contain "$DOC" "emergency_release_path_defined=true"
must_contain "$DOC" "release_upload_authorized=false"
must_contain "$DOC" "dmg_rebuild_authorized=false"
must_contain "$DOC" "stable_release_allowed=false"
must_contain "$DOC" "production_distribution_ready=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "next_required_phase=F100-1 External Two-Machine Field Evidence Program"

must_contain "README.md" "reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md"
must_contain "SECURITY.md" "reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md"
must_contain "README.md" "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "SECURITY.md" "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md"
must_contain "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md" "MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md"
must_contain "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md" "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"

must_contain "reference/UPDATE_INTEGRITY.md" "manual GitHub Release download"
must_contain "reference/UPDATE_INTEGRITY.md" "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "reference/UPDATE_INTEGRITY.md" "same GitHub Release"
must_contain "reference/UPDATE_INTEGRITY.md" "Branch files can move after a release"
must_contain "reference/UPDATE_INTEGRITY.md" "If auto-update is introduced later"
must_contain "reference/UPDATE_INTEGRITY.md" "automatic rollback prevention"
must_contain "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md" "emergency_release_update_path_defined=true"
must_contain "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md" "release_rollback_guidance_defined=true"
must_contain "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md" "production_distribution_ready=false"
must_contain "reference/STABLE_MACOS_V1_RELEASE_GATE.md" "release_upload_authorized=false"
must_contain "reference/STABLE_MACOS_V1_RELEASE_GATE.md" "dmg_rebuild_authorized=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "release_upload_authorized=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "dmg_rebuild_authorized=false"

for file in "$DOC" "reference/UPDATE_INTEGRITY.md" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_not_match "$file" "auto_update_channel_ready=true"
  must_not_match "$file" "signed_update_manifest_ready=true"
  must_not_match "$file" "update_signature_ready=true"
  must_not_match "$file" "rollback_prevention_claimed=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "stable_release_allowed=true"
  must_not_match "$file" "production_distribution_ready=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

scripts/macos_signed_update_manifest_once.sh >/dev/null

cat <<'STATUS'
status=macos-update-rollback-safe-release-channel-ready
macos_update_rollback_safe_release_channel_reviewed=true
m100_7_update_blocker_closed=true
update_channel_policy_waiver_authorized=true
update_channel_waiver_scope=active-queue-unblock-only
signed_update_or_rollback_evidence_required_for_stable_claims=true
manual_update_integrity_policy_available=true
same_release_asset_authority_required=true
auto_update_channel_ready=false
macos_signed_update_manifest_schema_available=true
macos_signed_update_manifest_validator_available=true
signed_update_manifest_candidate_verifier_ready=true
signed_update_manifest_ready=false
update_signature_ready=false
rollback_warning_policy_ready=true
rollback_prevention_claimed=false
emergency_release_path_defined=true
release_upload_authorized=false
dmg_rebuild_authorized=false
stable_release_allowed=false
production_distribution_ready=false
security_ready_claimed=false
sensitive_communication_allowed=false
next_required_phase=F100-1-External-Two-Machine-Field-Evidence-Program
STATUS
