#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md"

test -f "$DOC"

grep -q 'Guard status: release-note non-claim guard only, not release evidence' "$DOC"
grep -q 'release signing is not implemented' "$DOC"
grep -q 'no signed artifact verification evidence exists' "$DOC"
grep -q 'fixture checks are not release evidence' "$DOC"
grep -q 'not release-ready or v0.1-security-ready' "$DOC"
grep -q 'Release signing remains incomplete' "$DOC"
grep -q 'Fixture checks use disposable files and do not create release evidence' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not verify signed release artifacts' "$DOC"
grep -q 'does not approve release signing' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

grep -q 'RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'release-note non-claim guard' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_release_note_non_claim_guard.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release signing ready|release signing complete|signed artifacts available|signed artifact verification passed|artifact authenticity proven|verification UX approved|candidate evidence collected|release hardening gates passed|approved for high-risk communication|v0\.1-security-ready approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release-note signing copy must not imply release evidence or approval" >&2
  exit 1
fi

printf 'release signing release-note non-claim guard remains guard-only\n'
