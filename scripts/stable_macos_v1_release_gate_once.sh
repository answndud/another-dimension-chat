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
    fail "$file contains forbidden release claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GATE_DOC="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
HOLD_REPORT="reference/STABLE_RELEASE_HOLD_REPORT.md"
CLAIM_GATE="reference/PRODUCTION_READINESS_CLAIM_GATE.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"

for file in "$GATE_DOC" "$HOLD_REPORT" "$CLAIM_GATE" "$PACKET" \
  "README.md" "SECURITY.md" \
  "reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md" \
  "reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md" \
  "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md" \
  "reference/MACOS_PRODUCTION_UX_ONBOARDING.md" \
  "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md" \
  "reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md" \
  "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md" \
  "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md" \
  "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" \
  "reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md" \
  "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md"; do
  [ -f "$file" ] || fail "missing required stable gate input: $file"
done

must_contain "$GATE_DOC" "stable_macos_v1_release_gate_reviewed=true"
must_contain "$GATE_DOC" "stable_release_gate_decision=hold"
must_contain "$GATE_DOC" "stable_macos_v1_release_allowed=false"
must_contain "$GATE_DOC" "public_stable_release_allowed=false"
must_contain "$GATE_DOC" "stable_signed_notarized_artifact_available=false"
must_contain "$GATE_DOC" "rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true"
must_contain "$GATE_DOC" "external_review_completed=false"
must_contain "$GATE_DOC" "audit_completed=false"
must_contain "$GATE_DOC" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "$GATE_DOC" "macos_two_machine_real_user_flow_repeated=false"
must_contain "$GATE_DOC" "rb_5_field_evidence_release_class_scope_down_reviewed=true"
must_contain "$GATE_DOC" "real_external_macos_two_machine_reports_available=false"
must_contain "$GATE_DOC" "production_e2ee_ready=false"
must_contain "$GATE_DOC" "production_key_management_ready=false"
must_contain "$GATE_DOC" "production_transport_ready=false"
must_contain "$GATE_DOC" "production_distribution_ready=false"
must_contain "$GATE_DOC" "stable_or_production_release_allowed_without_signed_artifact=false"
must_contain "$GATE_DOC" "unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true"
must_contain "$GATE_DOC" "production_field_evidence_ready=false"
must_contain "$GATE_DOC" "production_operational_readiness_claim_allowed=false"
must_contain "$GATE_DOC" "production_ready_claim_allowed=false"
must_contain "$GATE_DOC" "beta_wording_removal_allowed=false"
must_contain "$GATE_DOC" "audited_claim_allowed=false"
must_contain "$GATE_DOC" "sensitive_communication_allowed=false"
must_contain "$GATE_DOC" "stable_or_production_release_allowed_without_external_review=false"
must_contain "$GATE_DOC" "signed_public_beta_or_rc_release_class_allowed_without_external_review=true"
must_contain "$GATE_DOC" "reliable_external_delivery_claim_allowed=false"
must_contain "$GATE_DOC" "stable_or_production_release_allowed_without_field_evidence=false"
must_contain "$GATE_DOC" "signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true"
must_contain "$GATE_DOC" "field_evidence_no_longer_blocks_lower_release_class=true"
must_contain "$GATE_DOC" "field_evidence_still_blocks_stable_or_production_claims=true"
must_contain "$GATE_DOC" "release_upload_authorized=false"
must_contain "$GATE_DOC" "dmg_rebuild_authorized=false"
must_contain "$GATE_DOC" "release_body_beta_wording_removal_authorized=false"
must_contain "$GATE_DOC" "next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision"

must_contain "$HOLD_REPORT" "stable_release_hold_report_available=true"
must_contain "$HOLD_REPORT" "stable_release_gate_decision=hold"
must_contain "$HOLD_REPORT" "stable_macos_v1_release_allowed=false"
must_contain "$HOLD_REPORT" "public_stable_release_allowed=false"
must_contain "$HOLD_REPORT" "production_ready_claim_allowed=false"
must_contain "$HOLD_REPORT" "beta_wording_removal_allowed=false"
must_contain "$HOLD_REPORT" "audited_claim_allowed=false"
must_contain "$HOLD_REPORT" "sensitive_communication_allowed=false"
must_contain "$HOLD_REPORT" "reliable_external_delivery_claim_allowed=false"
must_contain "$HOLD_REPORT" "release_upload_authorized=false"
must_contain "$HOLD_REPORT" "dmg_rebuild_authorized=false"
must_contain "$HOLD_REPORT" "release_body_beta_wording_removal_authorized=false"

must_contain "README.md" "reference/STABLE_MACOS_V1_RELEASE_GATE.md"
must_contain "README.md" "reference/STABLE_RELEASE_HOLD_REPORT.md"
must_contain "SECURITY.md" "reference/STABLE_MACOS_V1_RELEASE_GATE.md"
must_contain "SECURITY.md" "reference/STABLE_RELEASE_HOLD_REPORT.md"
must_contain "$PACKET" "reference/STABLE_MACOS_V1_RELEASE_GATE.md"
must_contain "$PACKET" "reference/STABLE_RELEASE_HOLD_REPORT.md"
must_contain "$PACKET" "reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "$PACKET" "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "$PACKET" "reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md"

must_contain "$CLAIM_GATE" "ops_10_stable_macos_v1_release_gate_reviewed=true"
must_contain "$CLAIM_GATE" "stable_release_gate_decision=hold"
must_contain "$CLAIM_GATE" "stable_macos_v1_release_allowed=false"
must_contain "$CLAIM_GATE" "public_stable_release_allowed=false"
must_contain "$CLAIM_GATE" "rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true"
must_contain "$CLAIM_GATE" "production_ready_claim_allowed=false"
must_contain "$CLAIM_GATE" "beta_wording_removal_allowed=false"
must_contain "$CLAIM_GATE" "audited_claim_allowed=false"
must_contain "$CLAIM_GATE" "sensitive_communication_allowed=false"
must_contain "$CLAIM_GATE" "reliable_external_delivery_claim_allowed=false"
must_contain "$CLAIM_GATE" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "$CLAIM_GATE" "stable_or_production_release_allowed_without_external_review=false"
must_contain "$CLAIM_GATE" "signed_public_beta_or_rc_release_class_allowed_without_external_review=true"
must_contain "$CLAIM_GATE" "stable_or_production_release_allowed_without_signed_artifact=false"
must_contain "$CLAIM_GATE" "unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true"
must_contain "$CLAIM_GATE" "rb_5_field_evidence_release_class_scope_down_reviewed=true"
must_contain "$CLAIM_GATE" "stable_or_production_release_allowed_without_field_evidence=false"
must_contain "$CLAIM_GATE" "signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true"
must_contain "$CLAIM_GATE" "release_upload_authorized=false"
must_contain "$CLAIM_GATE" "dmg_rebuild_authorized=false"
must_contain "$CLAIM_GATE" "release_body_beta_wording_removal_authorized=false"
must_contain "$CLAIM_GATE" "next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision"

must_contain "reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md" "production_e2ee_ready=false"
must_contain "reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md" "production_key_management_ready=false"
must_contain "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md" "production_transport_ready=false"
must_contain "reference/MACOS_PRODUCTION_UX_ONBOARDING.md" "usability_study_completed=false"
must_contain "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md" "stable_signed_notarized_artifact_available=false"
must_contain "reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md" "signed_artifact_no_longer_blocks_lower_release_class=true"
must_contain "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md" "audit_completed=false"
must_contain "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md" "external_review_no_longer_blocks_lower_release_class=true"
must_contain "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" "macos_two_machine_real_user_flow_repeated=false"
must_contain "reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md" "field_evidence_no_longer_blocks_lower_release_class=true"
must_contain "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md" "production_operational_readiness_claim_allowed=false"

for file in "$GATE_DOC" "$HOLD_REPORT" "$CLAIM_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "unsigned experimental public beta"
  must_contain "$file" "sensitive communication prohibited"
  must_contain "$file" "not audited"
  must_contain "$file" "not production-ready"
  must_not_match "$file" "stable_macos_v1_release_allowed=true"
  must_not_match "$file" "public_stable_release_allowed=true"
  must_not_match "$file" "stable_signed_notarized_artifact_available=true"
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "macos_two_machine_real_user_flow_repeated=true"
  must_not_match "$file" "production_e2ee_ready=true"
  must_not_match "$file" "production_key_management_ready=true"
  must_not_match "$file" "production_transport_ready=true"
  must_not_match "$file" "production_distribution_ready=true"
  must_not_match "$file" "production_field_evidence_ready=true"
  must_not_match "$file" "production_operational_readiness_claim_allowed=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "beta_wording_removal_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "stable_or_production_release_allowed_without_field_evidence=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "release_body_beta_wording_removal_authorized=true"
done

cat <<'STATUS'
status=stable-macos-v1-release-gate-held
stable_macos_v1_release_gate_reviewed=true
stable_release_gate_decision=hold
stable_macos_v1_release_allowed=false
public_stable_release_allowed=false
stable_signed_notarized_artifact_available=false
external_review_completed=false
audit_completed=false
macos_two_machine_real_user_flow_repeated=false
production_e2ee_ready=false
production_key_management_ready=false
production_transport_ready=false
production_distribution_ready=false
production_field_evidence_ready=false
production_operational_readiness_claim_allowed=false
production_ready_claim_allowed=false
beta_wording_removal_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
reliable_external_delivery_claim_allowed=false
release_upload_authorized=false
dmg_rebuild_authorized=false
release_body_beta_wording_removal_authorized=false
next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision
STATUS
