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
    fail "$file contains forbidden macOS artifact scope-down text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md"
DIST="reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md"
AUTH="reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
CLAIM_GATE="reference/PRODUCTION_READINESS_CLAIM_GATE.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"

for file in "$DOC" "$DIST" "$AUTH" "$CLAIM_GATE" "$STABLE_GATE" "$PACKET" \
  "README.md" "SECURITY.md" "reference/UPDATE_INTEGRITY.md"; do
  [ -f "$file" ] || fail "missing required macOS artifact scope-down input: $file"
done

must_contain "$DOC" "rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true"
must_contain "$DOC" "developer_id_signing_available=false"
must_contain "$DOC" "notarization_credential_available=false"
must_contain "$DOC" "stable_signed_notarized_artifact_available=false"
must_contain "$DOC" "gatekeeper_manual_bypass_required_for_current_beta=true"
must_contain "$DOC" "auto_update_channel_available=false"
must_contain "$DOC" "update_signature_ready=false"
must_contain "$DOC" "rollback_policy_ready=false"
must_contain "$DOC" "release_upload_authorized=false"
must_contain "$DOC" "dmg_rebuild_authorized=false"
must_contain "$DOC" "generated_release_artifacts_commit_allowed=false"
must_contain "$DOC" "production_distribution_ready=false"
must_contain "$DOC" "signed_notarized_security_boundary=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "stable_or_production_release_allowed_without_signed_artifact=false"
must_contain "$DOC" "unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true"
must_contain "$DOC" "signed_artifact_no_longer_blocks_lower_release_class=true"
must_contain "$DOC" "signed_artifact_still_blocks_stable_or_production_claims=true"
must_contain "$DOC" "next_required_phase=RB-8 production claim and stable release candidate gate"

must_contain "$DIST" "rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true"
must_contain "$DIST" "signed_artifact_no_longer_blocks_lower_release_class=true"
must_contain "$DIST" "signed_artifact_still_blocks_stable_or_production_claims=true"
must_contain "$DIST" "next_required_phase=RB-8 production claim and stable release candidate gate"
must_contain "$AUTH" "stable_release_scope_down_until_credentials=true"
must_contain "$CLAIM_GATE" "rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true"
must_contain "$CLAIM_GATE" "stable_or_production_release_allowed_without_signed_artifact=false"
must_contain "$CLAIM_GATE" "unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true"
must_contain "$STABLE_GATE" "rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true"
must_contain "$STABLE_GATE" "stable_or_production_release_allowed_without_signed_artifact=false"
must_contain "$STABLE_GATE" "unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true"
must_contain "$PACKET" "reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "README.md" "reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md"

for file in "$DOC" "$DIST" "$AUTH" "$CLAIM_GATE" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "developer_id_signing_available=true"
  must_not_match "$file" "notarization_credential_available=true"
  must_not_match "$file" "stable_signed_notarized_artifact_available=true"
  must_not_match "$file" "auto_update_channel_available=true"
  must_not_match "$file" "update_signature_ready=true"
  must_not_match "$file" "rollback_policy_ready=true"
  must_not_match "$file" "production_distribution_ready=true"
  must_not_match "$file" "signed_notarized_security_boundary=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "stable_or_production_release_allowed_without_signed_artifact=true"
done

if git -C "$ROOT" ls-files | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  fail "generated public-release or beta-artifacts path is tracked"
fi

cat <<'STATUS'
status=macos-stable-artifact-release-class-scope-down-closed
rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true
developer_id_signing_available=false
notarization_credential_available=false
stable_signed_notarized_artifact_available=false
auto_update_channel_available=false
update_signature_ready=false
rollback_policy_ready=false
release_upload_authorized=false
dmg_rebuild_authorized=false
production_distribution_ready=false
stable_or_production_release_allowed_without_signed_artifact=false
unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true
signed_artifact_no_longer_blocks_lower_release_class=true
signed_artifact_still_blocks_stable_or_production_claims=true
next_required_phase=RB-8-production-claim-and-stable-release-candidate-gate
STATUS
