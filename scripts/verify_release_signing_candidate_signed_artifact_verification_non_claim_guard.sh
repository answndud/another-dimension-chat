#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_NON_CLAIM_GUARD.md"

test -f "$DOC"

grep -q 'Guard status: signed-artifact verification non-claim guard only, not signed artifact verification evidence' "$DOC"
grep -q 'Signed-artifact verification coverage remains fixture-only' "$DOC"
grep -q 'SHA256SUMS' "$DOC"
grep -q 'SHA256SUMS.sig' "$DOC"
grep -q 'fixture signed-artifact verification coverage is not signed artifact verification evidence' "$DOC"
grep -q 'no detached signature verification evidence exists' "$DOC"
grep -q 'no artifact authenticity proof exists' "$DOC"
grep -q 'not release-ready or v0.1-security-ready' "$DOC"
grep -q 'does not sign release artifacts' "$DOC"
grep -q 'does not checksum real release artifacts' "$DOC"
grep -q 'does not compare real release artifact hashes against `SHA256SUMS`' "$DOC"
grep -q 'does not verify detached signatures' "$DOC"
grep -q 'does not prove artifact authenticity' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not approve release signing' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_NON_CLAIM_GUARD.md' "$ROOT_DIR/README.md"
grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_NON_CLAIM_GUARD.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'signed-artifact verification non-claim guard' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_candidate_signed_artifact_verification_non_claim_guard.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release artifact hashes verified|real release artifact hashes compared|detached signatures verified|signed artifact verification passed|artifact authenticity proven|candidate evidence collected|release signing approved|release candidate approved|release hardening gates passed|v0\.1-security-ready approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_GATE_EVIDENCE_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_FIXTURE.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_FIXTURE_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_NON_CLAIM_GUARD.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "signed-artifact verification fixture coverage must not imply release evidence or approval" >&2
  exit 1
fi

printf 'release signing candidate signed-artifact verification non-claim guard remains guard-only\n'
