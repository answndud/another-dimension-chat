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

DOC="reference/EXTERNAL_REVIEW_AUDIT_READINESS.md"
TRACKER="reference/AUDIT_FINDING_TRACKER.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
SCOPE_DOWN="reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"

must_contain "$DOC" "external_review_audit_readiness_gate_reviewed=true"
must_contain "$DOC" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "$DOC" "review_packet_public_safe=true"
must_contain "$DOC" "review_packet_complete_for_current_source=true"
must_contain "$DOC" "audit_finding_tracker_available=true"
must_contain "$DOC" "finding_triage_process_defined=true"
must_contain "$DOC" "private_security_reporting_boundary_defined=true"
must_contain "$DOC" "external_review_completed=false"
must_contain "$DOC" "audit_completed=false"
must_contain "$DOC" "reviewer_signoff_claimed=false"
must_contain "$DOC" "public_user_safety_signoff_claimed=false"
must_contain "$DOC" "audited_claim_allowed=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "stable_or_production_release_allowed_without_external_review=false"
must_contain "$DOC" "signed_public_beta_or_rc_release_class_allowed_without_external_review=true"
must_contain "$DOC" "external_review_no_longer_blocks_lower_release_class=true"
must_contain "$DOC" "external_review_still_blocks_stable_or_production_claims=true"
must_contain "$DOC" "next_required_phase=RB-7 signed notarized macOS stable artifact pipeline"

must_contain "$TRACKER" "Status: tracker available; no external audit findings have been received or"
must_contain "$TRACKER" "Each finding must have exactly one decision: fix, hold, or waive."
must_contain "$TRACKER" "external_review_completed=false"
must_contain "$TRACKER" "audit_completed=false"
must_contain "$TRACKER" "audited_claim_allowed=false"
must_contain "$TRACKER" "security_ready_claimed=false"

for required in \
  "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md" \
  "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md" \
  "reference/AUDIT_FINDING_TRACKER.md" \
  "reference/INDEPENDENT_REVIEW_PACKET.md" \
  "reference/PUBLIC_THREAT_MODEL.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md" \
  "reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md" \
  "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md" \
  "reference/MACOS_PRODUCTION_UX_ONBOARDING.md" \
  "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md" \
  "reference/PUBLIC_INTAKE_POLICY.md"; do
  must_contain "$PACKET" "$required"
done

must_contain "README.md" "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md"
must_contain "README.md" "reference/AUDIT_FINDING_TRACKER.md"
must_contain "README.md" "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md"
must_contain "SECURITY.md" "reference/AUDIT_FINDING_TRACKER.md"
must_contain "SECURITY.md" "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "ops_7_external_review_audit_readiness_gate_reviewed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "external_review_completed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "audit_completed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "reviewer_signoff_claimed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "public_user_safety_signoff_claimed=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "stable_or_production_release_allowed_without_external_review=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "signed_public_beta_or_rc_release_class_allowed_without_external_review=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "external_review_no_longer_blocks_lower_release_class=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "external_review_still_blocks_stable_or_production_claims=true"
must_contain ".github/ISSUE_TEMPLATE/config.yml" "private vulnerability reporting"
must_contain "reference/PUBLIC_INTAKE_POLICY.md" "Use GitHub private vulnerability reporting when available."
must_contain "SECURITY.md" "private vulnerability reporting"

for file in "$DOC" "$TRACKER" "$PACKET" "$SCOPE_DOWN" "README.md" "SECURITY.md"; do
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "reviewer_signoff_claimed=true"
  must_not_match "$file" "public_user_safety_signoff_claimed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "stable_or_production_release_allowed_without_external_review=true"
done

scripts/external_review_release_class_scope_down_once.sh >/dev/null

cat <<'STATUS'
status=external-review-audit-readiness-ready
external_review_audit_readiness_gate_reviewed=true
rb_6_external_review_release_class_scope_down_reviewed=true
review_packet_public_safe=true
review_packet_complete_for_current_source=true
audit_finding_tracker_available=true
finding_triage_process_defined=true
private_security_reporting_boundary_defined=true
external_review_completed=false
audit_completed=false
reviewer_signoff_claimed=false
public_user_safety_signoff_claimed=false
audited_claim_allowed=false
security_ready_claimed=false
sensitive_communication_allowed=false
stable_or_production_release_allowed_without_external_review=false
signed_public_beta_or_rc_release_class_allowed_without_external_review=true
external_review_no_longer_blocks_lower_release_class=true
external_review_still_blocks_stable_or_production_claims=true
next_required_phase=RB-7-signed-notarized-macos-stable-artifact-pipeline
STATUS
