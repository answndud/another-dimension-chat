#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md"

test -f "$DOC"

grep -q 'Requirement status: evidence collection runbook only, not candidate evidence' "$DOC"
grep -q 'RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md' "$DOC"
grep -q 'RELEASE_KEY_CEREMONY_REQUIREMENTS.md' "$DOC"
grep -q 'RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md' "$DOC"
grep -q 'RELEASE_VERIFICATION_UX_REQUIREMENTS.md' "$DOC"
grep -q 'RELEASE_COMPLETION_AUDIT.md' "$DOC"
grep -q 'TODO-CANDIDATE-COMMIT' "$DOC"
grep -q 'TODO-ARTIFACT-MANIFEST' "$DOC"
grep -q 'TODO-CANDIDATE-EVIDENCE-INDEX-PATH' "$DOC"
grep -q 'TODO-CANDIDATE-EVIDENCE-OWNER' "$DOC"
grep -q 'TODO-CANDIDATE-EVIDENCE-REVIEWER' "$DOC"
grep -q 'TODO-CANDIDATE-EVIDENCE-STATUS' "$DOC"
grep -q 'TODO-CANDIDATE-EVIDENCE-BLOCKERS' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not create or approve a release candidate' "$DOC"
grep -q 'does not verify signed release artifacts' "$DOC"
grep -q 'does not approve release signing' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

grep -q 'RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'candidate evidence collection runbook' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_runbook.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'candidate evidence collected|candidate evidence package complete|release candidate approved|release evidence collection complete|release signing approved|v0\.1-security-ready approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "candidate evidence collection runbook must not be treated as collected evidence or approval" >&2
  exit 1
fi

printf 'release signing candidate evidence runbook remains runbook-only\n'
