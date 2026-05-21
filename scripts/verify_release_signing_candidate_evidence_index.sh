#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md"

test -f "$DOC"

grep -q 'Requirement status: candidate evidence index only, not release signing evidence' "$DOC"
grep -q 'TODO-CANDIDATE-COMMIT' "$DOC"
grep -q 'TODO-RELEASE-TAG' "$DOC"
grep -q 'TODO-ARTIFACT-MANIFEST' "$DOC"
grep -q 'TODO-KEY-CEREMONY-RECORD' "$DOC"
grep -q 'TODO-SIGNED-ARTIFACT-EVIDENCE' "$DOC"
grep -q 'TODO-VERIFICATION-UX-EVIDENCE' "$DOC"
grep -q 'TODO-BINARY-VERIFICATION-EVIDENCE' "$DOC"
grep -q 'TODO-DEPENDENCY-REVIEW-EVIDENCE' "$DOC"
grep -q 'TODO-SIGNOFF-EVIDENCE' "$DOC"
grep -q 'TODO-EXTERNAL-REVIEW-EVIDENCE' "$DOC"
grep -q 'TODO-UPDATE-INTEGRITY-EVIDENCE' "$DOC"
grep -q 'TODO-UNRESOLVED-BLOCKERS' "$DOC"
grep -q 'RELEASE_KEY_CEREMONY_REQUIREMENTS.md' "$DOC"
grep -q 'RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md' "$DOC"
grep -q 'RELEASE_VERIFICATION_UX_REQUIREMENTS.md' "$DOC"
grep -q 'does not record candidate-specific release evidence' "$DOC"
grep -q 'does not verify signed release artifacts' "$DOC"
grep -q 'does not approve release signing' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

grep -q 'RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'candidate evidence index' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_index.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'candidate evidence complete|release candidate approved|candidate release ready|all release evidence recorded|release signing candidate accepted|release signing approved|v0\.1-security-ready approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "candidate evidence index must not be treated as release evidence or approval" >&2
  exit 1
fi

printf 'release signing candidate evidence index remains index-only\n'
