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
    fail "$file contains forbidden release authority pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"

[ -f "$DOC" ] || fail "missing RB-0 release authority record"

must_contain "$DOC" "release_authority_credential_unblock_reviewed=true"
must_contain "$DOC" "release_mutation_authorization_record_available=true"
must_contain "$DOC" "github_admin_observed=true"
must_contain "$DOC" "xcode_available=true"
must_contain "$DOC" "notarytool_available=true"
must_contain "$DOC" "codesigning_identity_available=false"
must_contain "$DOC" "developer_id_signing_available=false"
must_contain "$DOC" "notarization_credential_available=false"
must_contain "$DOC" "signed_notarized_stable_release_path_available=false"
must_contain "$DOC" "release_upload_authorized=false"
must_contain "$DOC" "release_body_edit_authorized=false"
must_contain "$DOC" "release_asset_delete_authorized=false"
must_contain "$DOC" "dmg_rebuild_authorized=false"
must_contain "$DOC" "generated_release_artifacts_commit_allowed=false"
must_contain "$DOC" "external_review_execution_path_selected=true"
must_contain "$DOC" "audit_engagement_confirmed=false"
must_contain "$DOC" "field_evidence_execution_path_selected=true"
must_contain "$DOC" "synthetic_peer_report_allowed=false"
must_contain "$DOC" "real_two_machine_field_evidence_completed=false"
must_contain "$DOC" "windows_public_artifact_authorized=false"
must_contain "$DOC" "android_runtime_implementation_authorized=false"
must_contain "$DOC" "ios_runtime_implementation_authorized=false"
must_contain "$DOC" "stable_release_scope_down_until_credentials=true"
must_contain "$DOC" "next_required_phase=RB-1 production protocol and E2EE readiness closure"

must_contain "README.md" "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
must_contain "SECURITY.md" "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
must_contain "reference/STABLE_MACOS_V1_RELEASE_GATE.md" "release_authority_credential_unblock_reviewed=true"

for file in "$DOC" "README.md" "SECURITY.md" "reference/STABLE_MACOS_V1_RELEASE_GATE.md"; do
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "release_body_edit_authorized=true"
  must_not_match "$file" "release_asset_delete_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "generated_release_artifacts_commit_allowed=true"
  must_not_match "$file" "codesigning_identity_available=true"
  must_not_match "$file" "developer_id_signing_available=true"
  must_not_match "$file" "notarization_credential_available=true"
  must_not_match "$file" "signed_notarized_stable_release_path_available=true"
  must_not_match "$file" "audit_engagement_confirmed=true"
  must_not_match "$file" "real_two_machine_field_evidence_completed=true"
  must_not_match "$file" "synthetic_peer_report_allowed=true"
done

cat <<'STATUS'
status=release-authority-credential-unblock-scope-down-ready
release_authority_credential_unblock_reviewed=true
github_admin_observed=true
xcode_available=true
notarytool_available=true
codesigning_identity_available=false
developer_id_signing_available=false
notarization_credential_available=false
signed_notarized_stable_release_path_available=false
release_upload_authorized=false
release_body_edit_authorized=false
release_asset_delete_authorized=false
dmg_rebuild_authorized=false
generated_release_artifacts_commit_allowed=false
external_review_execution_path_selected=true
audit_engagement_confirmed=false
field_evidence_execution_path_selected=true
synthetic_peer_report_allowed=false
real_two_machine_field_evidence_completed=false
stable_release_scope_down_until_credentials=true
next_required_phase=RB-1-production-protocol-and-e2ee-readiness-closure
STATUS
