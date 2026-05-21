#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_VERIFICATION_UX_REQUIREMENTS.md"

test -f "$DOC"

grep -q 'Requirement status: evidence requirements only, not signed artifact verification evidence' "$DOC"
grep -q 'RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md' "$DOC"
grep -q 'TODO-CANDIDATE-COMMIT' "$DOC"
grep -q 'TODO-PUBLIC-KEY-FINGERPRINT-COPY' "$DOC"
grep -q 'TODO-SIGNATURE-VERIFY-COMMAND' "$DOC"
grep -q 'TODO-HASH-VERIFY-COMMAND' "$DOC"
grep -q 'TODO-EXPECTED-FAILURE-COPY' "$DOC"
grep -q 'TODO-REVIEWER-TRANSCRIPT' "$DOC"
grep -q 'does not verify real release artifacts' "$DOC"
grep -q 'does not prove artifact authenticity' "$DOC"
grep -q 'does not satisfy release signing' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

grep -q 'RELEASE_VERIFICATION_UX_REQUIREMENTS.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'Release verification UX evidence requirements' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_verification_ux_requirements.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release signing ready|release signing complete|signed artifact verification passed|artifact authenticity proven|release artifacts verified|verification UX approved|user verification complete|reviewer verification complete' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_VERIFICATION_UX_REQUIREMENTS.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release verification UX requirements must not be treated as signing or verification completion" >&2
  exit 1
fi

printf 'release verification UX requirements remain requirements-only\n'
