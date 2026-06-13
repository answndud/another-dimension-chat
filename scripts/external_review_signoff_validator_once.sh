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

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/EXTERNAL_REVIEW_SIGNOFF_SCHEMA.md"
VALIDATOR="scripts/validate_external_review_signoff.mjs"

for file in "$DOC" "$VALIDATOR"; do
  [ -f "$file" ] || fail "missing external review signoff input: $file"
done

for flag in \
  "external_review_signoff_schema_available=true" \
  "external_review_signoff_validator_available=true" \
  "external_review_signoff_candidate_requires_owner_claim_decision=true" \
  "named_external_review_required_for_claims=true" \
  "external_review_completed=false" \
  "audit_completed=false" \
  "reviewer_signoff_claimed=false" \
  "audited_claim_allowed=false" \
  "security_ready_claimed=false" \
  "production_ready_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

empty_output="$(node "$VALIDATOR" "$ROOT/docs/external-review-signoff")"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-external-review-signoff" ||
  fail "empty external review signoff validator did not wait"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
cat >"$tmp_dir/signoff.json" <<'JSON'
{
  "schema_version": "external-review-signoff-v1",
  "review_id": "XR-2026-0001",
  "review_type": "independent-review",
  "reviewer": {
    "name": "Riley Stone",
    "affiliation": "Independent Security Review LLC",
    "contact": "reviewer@example.org"
  },
  "reviewed_commit": "abcdef1234567890",
  "completed_at": "2026-06-13",
  "public_safe_report_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "reviewed_inputs": [
    "README.md",
    "SECURITY.md",
    "reference/INDEPENDENT_REVIEW_PACKET.md",
    "reference/AUDIT_FINDING_TRACKER.md",
    "scripts/validate_audit_finding_tracker.mjs",
    "crates/core/src/lib.rs",
    "apps/desktop-tauri/src/App.tsx"
  ],
  "finding_summary": {
    "total_findings": 1,
    "critical_open": 0,
    "high_open": 0,
    "medium_open": 0,
    "low_open": 0,
    "informational_open": 0,
    "fixed": 1,
    "held": 0,
    "waived": 0,
    "all_findings_triaged": true
  },
  "signoff": {
    "reviewer_signed_public_safe_summary": true,
    "reviewer_claims_sensitive_use_safety": false,
    "reviewer_claims_production_ready": false,
    "reviewer_claims_audited_product": false
  },
  "evidence_boundary": {
    "external_reviewer_submitted": true,
    "fabricated_or_local_only": false,
    "private_material_included": false,
    "owner_claim_decision_required": true
  }
}
JSON

candidate_output="$(node "$VALIDATOR" "$tmp_dir/signoff.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_external_review_signoffs=1" ||
  fail "valid external review signoff candidate was not accepted"
printf '%s\n' "$candidate_output" | grep -Fq "external_review_signoff_candidate_requires_owner_claim_decision=true" ||
  fail "signoff validator did not require owner claim decision"
printf '%s\n' "$candidate_output" | grep -Fq "external_review_completed=false" ||
  fail "signoff validator promoted review completion"

cat >"$tmp_dir/bad-local.json" <<'JSON'
{
  "schema_version": "external-review-signoff-v1",
  "review_id": "XR-2026-0002",
  "review_type": "independent-review",
  "reviewer": {
    "name": "Unknown",
    "affiliation": "TBD",
    "contact": "n/a"
  },
  "reviewed_commit": "abcdef1234567890",
  "completed_at": "2026-06-13",
  "public_safe_report_sha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "reviewed_inputs": ["/Users/alex/project/private.md"],
  "finding_summary": {
    "total_findings": 0,
    "critical_open": 0,
    "high_open": 0,
    "medium_open": 0,
    "low_open": 0,
    "informational_open": 0,
    "fixed": 0,
    "held": 0,
    "waived": 0,
    "all_findings_triaged": true
  },
  "signoff": {
    "reviewer_signed_public_safe_summary": true,
    "reviewer_claims_sensitive_use_safety": true,
    "reviewer_claims_production_ready": false,
    "reviewer_claims_audited_product": false
  },
  "evidence_boundary": {
    "external_reviewer_submitted": true,
    "fabricated_or_local_only": true,
    "private_material_included": false,
    "owner_claim_decision_required": true
  }
}
JSON

if node "$VALIDATOR" "$tmp_dir/bad-local.json" >"$tmp_dir/bad.out" 2>&1; then
  fail "bad external review signoff was accepted"
fi
grep -Eq "forbidden-content|placeholder-reviewer-name|fabricated-or-local-only" "$tmp_dir/bad.out" ||
  fail "bad external review signoff rejection reason was not reported"

if AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" "$tmp_dir/signoff.json" >"$tmp_dir/stale.out" 2>&1; then
  fail "strict external review signoff validator accepted stale reviewed commit"
fi
grep -Fq "reviewed-commit-not-current-head" "$tmp_dir/stale.out" ||
  fail "strict external review signoff validator did not report stale reviewed commit"

cat <<'STATUS'
status=external-review-signoff-validator-ready
external_review_signoff_schema_available=true
external_review_signoff_validator_available=true
external_review_signoff_candidate_requires_owner_claim_decision=true
named_external_review_required_for_claims=true
external_review_completed=false
audit_completed=false
reviewer_signoff_claimed=false
audited_claim_allowed=false
security_ready_claimed=false
production_ready_claim_allowed=false
sensitive_communication_allowed=false
STATUS
