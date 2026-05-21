#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE.md"

test -f "$TEMPLATE"

grep -q 'not signed artifact verification evidence, detached signature verification evidence, artifact authenticity proof, release signing approval, release approval, or a security-ready claim' "$TEMPLATE"
grep -q 'Candidate commit: `TODO-CANDIDATE-COMMIT`' "$TEMPLATE"
grep -q 'Release tag: `TODO-RELEASE-TAG`' "$TEMPLATE"
grep -q 'Build profile: `TODO-BUILD-PROFILE`' "$TEMPLATE"
grep -q 'Target platforms: `TODO-TARGET-PLATFORMS`' "$TEMPLATE"
grep -q 'Artifact manifest: `TODO-ARTIFACT-MANIFEST-PATH`' "$TEMPLATE"
grep -q 'Artifact manifest SHA-256: `TODO-ARTIFACT-MANIFEST-SHA256`' "$TEMPLATE"
grep -q '`SHA256SUMS` path: `TODO-SHA256SUMS-PATH`' "$TEMPLATE"
grep -q '`SHA256SUMS` SHA-256: `TODO-SHA256SUMS-SHA256`' "$TEMPLATE"
grep -q '`SHA256SUMS.sig` path: `TODO-SHA256SUMS-SIG-PATH`' "$TEMPLATE"
grep -q '`SHA256SUMS.sig` SHA-256: `TODO-SHA256SUMS-SIG-SHA256`' "$TEMPLATE"
grep -q 'Public signing-key fingerprint: `TODO-PUBLIC-SIGNING-KEY-FINGERPRINT`' "$TEMPLATE"
grep -q 'Key ceremony record: `TODO-KEY-CEREMONY-RECORD`' "$TEMPLATE"
grep -q 'Signature verification command: `TODO-SIGNATURE-VERIFICATION-COMMAND`' "$TEMPLATE"
grep -q 'Signature verification transcript: `TODO-SIGNATURE-VERIFICATION-TRANSCRIPT`' "$TEMPLATE"
grep -q 'Artifact hash verification command: `TODO-ARTIFACT-HASH-VERIFICATION-COMMAND`' "$TEMPLATE"
grep -q 'Artifact hash verification transcript: `TODO-ARTIFACT-HASH-VERIFICATION-TRANSCRIPT`' "$TEMPLATE"
grep -q 'Failure transcript: `TODO-FAILURE-TRANSCRIPT`' "$TEMPLATE"
grep -q 'same `candidate_commit`, `release_tag`, `artifact_manifest`, and `artifact_manifest_sha256` as `CANDIDATE_EVIDENCE_INDEX`' "$TEMPLATE"
grep -q 'same `public_key_fingerprint` as the matching key ceremony record' "$TEMPLATE"
grep -q 'exact `SHA256SUMS` and `SHA256SUMS.sig` files used in the verification transcripts' "$TEMPLATE"
grep -q 'Reviewer: `TODO-REVIEWER`' "$TEMPLATE"
grep -q 'Review timestamp: `TODO-REVIEW-TIMESTAMP`' "$TEMPLATE"
grep -q 'Blocker status: `TODO-BLOCKER-STATUS`' "$TEMPLATE"
grep -q 'Unresolved blocker evidence: `TODO-UNRESOLVED-BLOCKER-EVIDENCE`' "$TEMPLATE"
grep -q 'TODO-CLASSIFICATION-SIGNED-ARTIFACT-VERIFICATION-EVIDENCE' "$TEMPLATE"
grep -q 'TODO-CLASSIFICATION-SIGNED-ARTIFACT-VERIFICATION-BLOCKED' "$TEMPLATE"
grep -q 'not-signed-artifact-verification-evidence' "$TEMPLATE"
grep -q 'does not sign release artifacts' "$TEMPLATE"
grep -q 'does not checksum real release artifacts' "$TEMPLATE"
grep -q 'does not compare real release artifact hashes against `SHA256SUMS`' "$TEMPLATE"
grep -q 'does not verify detached signatures' "$TEMPLATE"
grep -q 'does not prove artifact authenticity' "$TEMPLATE"
grep -q 'does not collect candidate-specific release evidence' "$TEMPLATE"
grep -q 'does not approve release signing' "$TEMPLATE"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$TEMPLATE"

grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE.md' "$ROOT_DIR/README.md"
grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'signed-artifact verification record template' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_candidate_signed_artifact_verification_record_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'signed artifact verification evidence recorded|detached signature verification evidence recorded|artifact authenticity proof recorded|release artifact hashes verified|signed artifact verification passed|release signing approved|release candidate approved|release hardening gates passed|v0\.1-security-ready approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_GATE_EVIDENCE_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "signed-artifact verification record template must not imply evidence or approval" >&2
  exit 1
fi

printf 'release signing candidate signed-artifact verification record template confirms evidence is not recorded\n'
