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

must_contain_sensitive_nonclaim() {
  local file="$1"
  if grep -Fq "sensitive communication prohibited" "$file"; then
    return
  fi
  if [ "$file" = "README.md" ] &&
    { grep -Fq "it for sensitive communication." "$file" ||
      grep -Fq "safety for sensitive communication" "$file"; }; then
    return
  fi
  fail "$file missing required sensitive-communication non-claim"
}

must_reference_public_gate() {
  local file="$1"
  local needle="$2"
  if grep -Fq "$needle" "$file"; then
    return
  fi
  if [ "$file" = "README.md" ] &&
    grep -Fq "SECURITY.md" "$file" &&
    grep -Fq "$needle" "SECURITY.md"; then
    return
  fi
  fail "$file missing public-reachable reference: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden production claim decision text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md"
CLAIM_GATE="reference/PRODUCTION_READINESS_CLAIM_GATE.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"

for file in "$DOC" "$CLAIM_GATE" "$STABLE_GATE" "$PACKET" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing required production claim decision input: $file"
done

must_contain "$DOC" "rb_8_production_claim_release_class_decision_reviewed=true"
must_contain "$DOC" "stable_release_candidate_gate_decision=lower-release-class-only"
must_contain "$DOC" "next_release_class=signed-public-beta-or-rc"
must_contain "$DOC" "production_ready_claim_allowed=false"
must_contain "$DOC" "beta_wording_removal_allowed=false"
must_contain "$DOC" "audited_claim_allowed=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "reliable_external_delivery_claim_allowed=false"
must_contain "$DOC" "stable_macos_v1_release_allowed=false"
must_contain "$DOC" "public_stable_release_allowed=false"
must_contain "$DOC" "lower_release_class_claim_boundary_ready=true"
must_contain "$DOC" "public_wording_matches_lower_release_class=true"
must_contain "$DOC" "owner_stable_release_approval_recorded=false"
must_contain "$DOC" "next_required_phase=RB-9 github stable release publication"

must_contain "$CLAIM_GATE" "rb_8_production_claim_release_class_decision_reviewed=true"
must_contain "$CLAIM_GATE" "stable_release_candidate_gate_decision=lower-release-class-only"
must_contain "$CLAIM_GATE" "next_release_class=signed-public-beta-or-rc"
must_contain "$CLAIM_GATE" "lower_release_class_claim_boundary_ready=true"
must_contain "$CLAIM_GATE" "public_wording_matches_lower_release_class=true"
must_contain "$STABLE_GATE" "rb_8_production_claim_release_class_decision_reviewed=true"
must_contain "$STABLE_GATE" "stable_release_candidate_gate_decision=lower-release-class-only"
must_contain "$STABLE_GATE" "next_release_class=signed-public-beta-or-rc"
must_contain "$PACKET" "reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md"
must_reference_public_gate "README.md" "reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md"
must_contain "SECURITY.md" "reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md"

for file in "$DOC" "$CLAIM_GATE" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "not audited"
  must_contain "$file" "not production-ready"
  must_contain_sensitive_nonclaim "$file"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "beta_wording_removal_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "stable_macos_v1_release_allowed=true"
  must_not_match "$file" "public_stable_release_allowed=true"
  must_not_match "$file" "owner_stable_release_approval_recorded=true"
done

cat <<'STATUS'
status=production-claim-release-class-decision-closed
rb_8_production_claim_release_class_decision_reviewed=true
stable_release_candidate_gate_decision=lower-release-class-only
next_release_class=signed-public-beta-or-rc
production_ready_claim_allowed=false
beta_wording_removal_allowed=false
audited_claim_allowed=false
security_ready_claimed=false
sensitive_communication_allowed=false
reliable_external_delivery_claim_allowed=false
stable_macos_v1_release_allowed=false
public_stable_release_allowed=false
lower_release_class_claim_boundary_ready=true
public_wording_matches_lower_release_class=true
owner_stable_release_approval_recorded=false
next_required_phase=RB-9-github-stable-release-publication
STATUS
