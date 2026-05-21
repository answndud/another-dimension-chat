#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/RELEASE_EXTERNAL_REVIEW_TEMPLATE.md"

grep -q 'not external review readiness evidence, independent review evidence, release approval, or a security-ready claim' "$TEMPLATE"
grep -q 'Candidate commit: `TODO-CANDIDATE-COMMIT`' "$TEMPLATE"
grep -q 'Build profile: `TODO-BUILD-PROFILE`' "$TEMPLATE"
grep -q 'Target platforms: `TODO-TARGET-PLATFORMS`' "$TEMPLATE"
grep -q 'Threat model revision: `TODO-THREAT-MODEL-REVISION`' "$TEMPLATE"
grep -q 'Review Materials' "$TEMPLATE"
grep -q 'Crypto/session design' "$TEMPLATE"
grep -q 'Storage/key lifecycle design' "$TEMPLATE"
grep -q 'Update/signing/release design' "$TEMPLATE"
grep -q 'Reviewer independence expectations: `TODO-INDEPENDENCE-EXPECTATIONS`' "$TEMPLATE"
grep -q 'Finding Triage' "$TEMPLATE"
grep -q 'Candidate Findings and Blockers' "$TEMPLATE"
grep -q 'not-review-readiness-evidence' "$TEMPLATE"
grep -q 'does not record review findings' "$TEMPLATE"
grep -q 'RELEASE_EXTERNAL_REVIEW_TEMPLATE.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_external_review_template.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_external_review_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'external review readiness template complete|release-candidate external review readiness evidence recorded|independent review readiness evidence recorded|review findings resolved|approved for high-risk release' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_EXTERNAL_REVIEW_TEMPLATE.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "external review template is not review readiness evidence and must not be claimed complete" >&2
  exit 1
fi

printf 'external review template confirms review readiness evidence is not recorded\n'
