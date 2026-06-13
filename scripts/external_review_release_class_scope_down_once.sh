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
    fail "$file contains forbidden external review scope-down text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
READINESS="reference/EXTERNAL_REVIEW_AUDIT_READINESS.md"
TRACKER="reference/AUDIT_FINDING_TRACKER.md"
CLAIM_GATE="reference/PRODUCTION_READINESS_CLAIM_GATE.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"

for file in "$DOC" "$READINESS" "$TRACKER" "$CLAIM_GATE" "$STABLE_GATE" "$PACKET" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing required external review scope-down input: $file"
done

must_contain "$DOC" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "$DOC" "a100_2_external_review_execution_blocker_closed=true"
must_contain "$DOC" "external_review_execution_policy_waiver_authorized=true"
must_contain "$DOC" "named_external_review_required_for_claims=true"
must_contain "$DOC" "accepted_audit_finding_closure_required_for_claims=true"
must_contain "$DOC" "external_review_execution_claim_allowed=false"
must_contain "$DOC" "review_packet_public_safe=true"
must_contain "$DOC" "audit_finding_tracker_available=true"
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
must_contain "$DOC" "fabricated_review_or_peer_evidence_allowed=false"
must_contain "$DOC" "next_required_phase=RB-7 signed notarized macOS stable artifact pipeline"

must_contain "$READINESS" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "$READINESS" "external_review_no_longer_blocks_lower_release_class=true"
must_contain "$READINESS" "external_review_still_blocks_stable_or_production_claims=true"
must_contain "$READINESS" "next_required_phase=RB-7 signed notarized macOS stable artifact pipeline"
must_contain "$CLAIM_GATE" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "$CLAIM_GATE" "signed_public_beta_or_rc_release_class_allowed_without_external_review=true"
must_contain "$CLAIM_GATE" "stable_or_production_release_allowed_without_external_review=false"
must_contain "$STABLE_GATE" "rb_6_external_review_release_class_scope_down_reviewed=true"
must_contain "$STABLE_GATE" "signed_public_beta_or_rc_release_class_allowed_without_external_review=true"
must_contain "$STABLE_GATE" "stable_or_production_release_allowed_without_external_review=false"
must_contain "$PACKET" "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "README.md" "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"
must_contain "SECURITY.md" "reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md"

for file in "$DOC" "$READINESS" "$TRACKER" "$CLAIM_GATE" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "not audited"
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "reviewer_signoff_claimed=true"
  must_not_match "$file" "public_user_safety_signoff_claimed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "stable_or_production_release_allowed_without_external_review=true"
  must_not_match "$file" "fabricated_review_or_peer_evidence_allowed=true"
  must_not_match "$file" "external_review_execution_claim_allowed=true"
done

cat <<'STATUS'
status=external-review-release-class-scope-down-closed
rb_6_external_review_release_class_scope_down_reviewed=true
a100_2_external_review_execution_blocker_closed=true
external_review_execution_policy_waiver_authorized=true
external_review_execution_claim_allowed=false
external_review_completed=false
audit_completed=false
reviewer_signoff_claimed=false
audited_claim_allowed=false
security_ready_claimed=false
sensitive_communication_allowed=false
stable_or_production_release_allowed_without_external_review=false
signed_public_beta_or_rc_release_class_allowed_without_external_review=true
external_review_no_longer_blocks_lower_release_class=true
external_review_still_blocks_stable_or_production_claims=true
next_required_phase=RB-7-signed-notarized-macos-stable-artifact-pipeline
STATUS
