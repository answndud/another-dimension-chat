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
    fail "$file contains forbidden claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md"

must_contain "$DOC" "macos_production_distribution_gate_reviewed=true"
must_contain "$DOC" "current_public_artifact_unsigned_beta=true"
must_contain "$DOC" "developer_id_signing_available=false"
must_contain "$DOC" "notarization_available=false"
must_contain "$DOC" "stable_signed_notarized_artifact_available=false"
must_contain "$DOC" "gatekeeper_manual_bypass_required_for_current_beta=true"
must_contain "$DOC" "auto_update_channel_available=false"
must_contain "$DOC" "update_signature_ready=false"
must_contain "$DOC" "rollback_policy_ready=false"
must_contain "$DOC" "checksum_provenance_manifest_boundary_ready=true"
must_contain "$DOC" "same_release_asset_authority_required=true"
must_contain "$DOC" "release_upload_performed=false"
must_contain "$DOC" "release_body_edit_performed=false"
must_contain "$DOC" "dmg_rebuild_performed=false"
must_contain "$DOC" "generated_release_artifacts_staged=false"
must_contain "$DOC" "production_distribution_ready=false"
must_contain "$DOC" "signed_notarized_security_boundary=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "next_required_phase=OPS-7 external review and audit readiness"

must_contain "README.md" "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md"
must_contain "SECURITY.md" "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md"
must_contain "apps/desktop-tauri/README.md" "../../reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md"
must_contain "reference/UPDATE_INTEGRITY.md" "MACOS_PRODUCTION_DISTRIBUTION_GATE.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "ops_6_macos_production_distribution_gate_reviewed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "stable_signed_notarized_artifact_available=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "production_distribution_ready=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "next_required_phase=OPS-7 external review and audit readiness"
must_contain "reference/UPDATE_INTEGRITY.md" "Another Dimension Chat does not provide auto-update"
must_contain "reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "No live release upload"
must_contain "reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "No signed or notarized macOS artifact exists."
must_contain "scripts/macos_public_beta_final_source_preflight_once.sh" "release_upload_performed=false"
must_contain "scripts/macos_release_page_update_gate_once.sh" "release_upload_performed=false"

for file in "$DOC" "README.md" "SECURITY.md" "apps/desktop-tauri/README.md" "reference/UPDATE_INTEGRITY.md"; do
  must_not_match "$file" "developer_id_signing_available=true"
  must_not_match "$file" "notarization_available=true"
  must_not_match "$file" "stable_signed_notarized_artifact_available=true"
  must_not_match "$file" "auto_update_channel_available=true"
  must_not_match "$file" "update_signature_ready=true"
  must_not_match "$file" "rollback_policy_ready=true"
  must_not_match "$file" "release_upload_performed=true"
  must_not_match "$file" "dmg_rebuild_performed=true"
  must_not_match "$file" "production_distribution_ready=true"
  must_not_match "$file" "signed_notarized_security_boundary=true"
  must_not_match "$file" "security_ready_claimed=true"
done

scripts/macos_public_beta_final_source_preflight_once.sh >/dev/null
scripts/macos_release_page_update_gate_once.sh >/dev/null

if git -C "$ROOT" ls-files | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  fail "generated public-release or beta-artifacts path is tracked"
fi

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  fail "generated public-release or beta-artifacts path is staged"
fi

cat <<'STATUS'
status=macos-production-distribution-gate-ready
macos_production_distribution_gate_reviewed=true
current_public_artifact_unsigned_beta=true
developer_id_signing_available=false
notarization_available=false
stable_signed_notarized_artifact_available=false
gatekeeper_manual_bypass_required_for_current_beta=true
auto_update_channel_available=false
update_signature_ready=false
rollback_policy_ready=false
checksum_provenance_manifest_boundary_ready=true
same_release_asset_authority_required=true
release_upload_performed=false
release_body_edit_performed=false
dmg_rebuild_performed=false
generated_release_artifacts_staged=false
production_distribution_ready=false
signed_notarized_security_boundary=false
security_ready_claimed=false
next_required_phase=OPS-7-external-review-and-audit-readiness
STATUS
