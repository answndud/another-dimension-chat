#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_REQUIREMENTS.md"

test -f "$DOC"

grep -q 'Requirement status: signed-artifact verification requirements only, not signed artifact verification evidence' "$DOC"
grep -q 'candidate_commit' "$DOC"
grep -q 'release_tag' "$DOC"
grep -q 'artifact_manifest' "$DOC"
grep -q 'artifact_manifest_sha256' "$DOC"
grep -q 'sha256sums_path' "$DOC"
grep -q 'sha256sums_sha256' "$DOC"
grep -q 'sha256sums_sig_path' "$DOC"
grep -q 'sha256sums_sig_sha256' "$DOC"
grep -q 'public_key_fingerprint' "$DOC"
grep -q 'key_ceremony_record' "$DOC"
grep -q 'signature_verification_command' "$DOC"
grep -q 'signature_verification_transcript' "$DOC"
grep -q 'artifact_hash_verification_command' "$DOC"
grep -q 'artifact_hash_verification_transcript' "$DOC"
grep -q 'failure_transcript' "$DOC"
grep -q 'reviewer' "$DOC"
grep -q 'review_timestamp' "$DOC"
grep -q 'classification' "$DOC"
grep -q 'blocker_status' "$DOC"
grep -q 'CANDIDATE_EVIDENCE_INDEX' "$DOC"
grep -q 'same `public_key_fingerprint` as the matching key ceremony record' "$DOC"
grep -q 'missing signed-artifact verification record' "$DOC"
grep -q 'missing `SHA256SUMS`' "$DOC"
grep -q 'missing `SHA256SUMS.sig`' "$DOC"
grep -q 'missing public key fingerprint' "$DOC"
grep -q 'mismatched `candidate_commit`' "$DOC"
grep -q 'mismatched `release_tag`' "$DOC"
grep -q 'mismatched `artifact_manifest`' "$DOC"
grep -q 'mismatched `artifact_manifest_sha256`' "$DOC"
grep -q 'mismatched `sha256sums_sha256`' "$DOC"
grep -q 'mismatched `sha256sums_sig_sha256`' "$DOC"
grep -q 'key ceremony fingerprint mismatch' "$DOC"
grep -q 'missing signature verification transcript' "$DOC"
grep -q 'missing artifact hash verification transcript' "$DOC"
grep -q 'missing failure transcript' "$DOC"
grep -q 'stale signature transcript' "$DOC"
grep -q 'stale artifact hash transcript' "$DOC"
grep -q 'template-only evidence' "$DOC"
grep -q 'placeholder evidence' "$DOC"
grep -q 'empty blocker status' "$DOC"
grep -q 'do not sign release artifacts' "$DOC"
grep -q 'do not checksum real release artifacts' "$DOC"
grep -q 'do not compare real release artifact hashes against `SHA256SUMS`' "$DOC"
grep -q 'do not verify detached signatures' "$DOC"
grep -q 'do not prove artifact authenticity' "$DOC"
grep -q 'do not collect candidate-specific release evidence' "$DOC"
grep -q 'do not approve release signing' "$DOC"
grep -q 'do not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

if grep -R -n -E 'signed artifact verification passed|artifact authenticity proven|release artifacts verified|candidate signed artifact verification complete|signed artifact evidence recorded|release signing approved|release candidate approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$DOC" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "signed-artifact verification requirements must not be treated as release evidence" >&2
  exit 1
fi

printf 'release signing candidate signed-artifact verification requirements remain requirements-only\n'
