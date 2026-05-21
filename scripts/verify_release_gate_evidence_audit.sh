#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUDIT="$ROOT_DIR/RELEASE_GATE_EVIDENCE_AUDIT.md"

grep -q 'not v0.1-security-ready, not release-ready, and not a secure messenger release' "$AUDIT"
grep -q 'Audit verdict: release gate evidence incomplete' "$AUDIT"
grep -q 'Template coverage is useful' "$AUDIT"
grep -q 'cannot move the project to a 100% security-ready claim' "$AUDIT"
grep -q '99% planning/readiness-scaffold interpretation' "$AUDIT"
grep -q 'The final 1% requires real candidate-specific evidence' "$AUDIT"
grep -q 'RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md' "$AUDIT"
grep -q 'RELEASE_EXTERNAL_REVIEW_TEMPLATE.md' "$AUDIT"
grep -q 'RELEASE_SIGNOFF_TEMPLATE.md' "$AUDIT"
grep -q 'RELEASE_UPDATE_INTEGRITY_TEMPLATE.md' "$AUDIT"
grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_FIXTURE_AUDIT.md' "$AUDIT"
grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_NON_CLAIM_GUARD.md' "$AUDIT"
grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_GUARD_AUDIT.md' "$AUDIT"
grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_GUARD_AUDIT_COVERAGE_CHECKS.md' "$AUDIT"
grep -q 'does not prove any release gate complete' "$AUDIT"
grep -q 'RELEASE_GATE_EVIDENCE_AUDIT.md' "$ROOT_DIR/README.md"
grep -q 'scripts/verify_release_gate_evidence_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'v0\.1-security-ready 100% complete|release gate evidence complete|all release gates satisfied|approved for high-risk release|security-ready claim approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_GATE_EVIDENCE_AUDIT.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release gate evidence is incomplete and must not be claimed complete" >&2
  exit 1
fi

printf 'release gate evidence audit confirms 100%% is not proven\n'
