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
    fail "$file contains forbidden field evidence scope-down text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md"
PROGRAM="reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md"
PACKET="reference/REDACTED_FIELD_REPORT_PACKET.md"
GATE="reference/PRODUCTION_READINESS_CLAIM_GATE.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
REVIEW_PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"

for file in "$DOC" "$PROGRAM" "$PACKET" "$GATE" "$STABLE_GATE" "$REVIEW_PACKET" \
  "README.md" "SECURITY.md" \
  "scripts/validate_redacted_field_reports.mjs" \
  "scripts/redacted_field_report_validator_once.sh"; do
  [ -f "$file" ] || fail "missing required field evidence scope-down input: $file"
done

must_contain "$DOC" "rb_5_field_evidence_release_class_scope_down_reviewed=true"
must_contain "$DOC" "real_external_macos_two_machine_reports_available=false"
must_contain "$DOC" "redacted_field_report_validator_available=true"
must_contain "$DOC" "production_field_evidence_ready=false"
must_contain "$DOC" "reliable_external_delivery_claim_allowed=false"
must_contain "$DOC" "external_delivery_success_claim_allowed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "stable_or_production_release_allowed_without_field_evidence=false"
must_contain "$DOC" "signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true"
must_contain "$DOC" "field_evidence_no_longer_blocks_lower_release_class=true"
must_contain "$DOC" "field_evidence_still_blocks_stable_or_production_claims=true"
must_contain "$DOC" "fabricated_peer_evidence_allowed=false"
must_contain "$DOC" "next_required_phase=RB-6 external review and audit closure"

must_contain "$PROGRAM" "rb_5_field_evidence_release_class_scope_down_reviewed=true"
must_contain "$PROGRAM" "field_evidence_no_longer_blocks_lower_release_class=true"
must_contain "$PROGRAM" "field_evidence_still_blocks_stable_or_production_claims=true"
must_contain "$PROGRAM" "next_required_phase=RB-6 external review and audit closure"
must_contain "$PACKET" "redacted_field_report_validator_available=true"
must_contain "$GATE" "rb_5_field_evidence_release_class_scope_down_reviewed=true"
must_contain "$GATE" "signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true"
must_contain "$GATE" "stable_or_production_release_allowed_without_field_evidence=false"
must_contain "$GATE" "production_field_evidence_ready=false"
must_contain "$STABLE_GATE" "rb_5_field_evidence_release_class_scope_down_reviewed=true"
must_contain "$STABLE_GATE" "signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true"
must_contain "$STABLE_GATE" "stable_or_production_release_allowed_without_field_evidence=false"
must_contain "$REVIEW_PACKET" "reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "README.md" "reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md"

for file in "$DOC" "$PROGRAM" "$GATE" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "sensitive communication prohibited"
  must_contain "$file" "not audited"
  must_contain "$file" "not production-ready"
  must_not_match "$file" "real_external_macos_two_machine_reports_available=true"
  must_not_match "$file" "macos_two_machine_real_user_flow_repeated=true"
  must_not_match "$file" "different_networks_covered=true"
  must_not_match "$file" "production_field_evidence_ready=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "external_delivery_success_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "stable_or_production_release_allowed_without_field_evidence=true"
  must_not_match "$file" "fabricated_peer_evidence_allowed=true"
done

scripts/redacted_field_report_validator_once.sh >/dev/null

cat <<'STATUS'
status=field-evidence-release-class-scope-down-closed
rb_5_field_evidence_release_class_scope_down_reviewed=true
real_external_macos_two_machine_reports_available=false
redacted_field_report_validator_available=true
production_field_evidence_ready=false
reliable_external_delivery_claim_allowed=false
external_delivery_success_claim_allowed=false
sensitive_communication_allowed=false
stable_or_production_release_allowed_without_field_evidence=false
signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true
field_evidence_no_longer_blocks_lower_release_class=true
field_evidence_still_blocks_stable_or_production_claims=true
next_required_phase=RB-6-external-review-and-audit-closure
STATUS
