#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUDIT="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE_COVERAGE_AUDIT.md"
TEMPLATE="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE.md"

test -f "$AUDIT"
test -f "$TEMPLATE"

grep -q 'not signed artifact verification evidence, detached signature verification evidence, artifact authenticity proof, release signing approval, release approval, or a security-ready claim' "$AUDIT"
grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE.md' "$AUDIT"
grep -q 'Coverage-audit status: signed-artifact verification record template coverage audit only, not signed artifact verification evidence' "$AUDIT"
grep -q 'not-signed-artifact-verification-evidence' "$AUDIT"
grep -q 'candidate commit, release tag, build profile, target platforms, artifact manifest path, and artifact manifest SHA-256' "$AUDIT"
grep -q '`SHA256SUMS` path and SHA-256' "$AUDIT"
grep -q '`SHA256SUMS.sig` path and SHA-256' "$AUDIT"
grep -q 'public signing-key fingerprint and key ceremony record' "$AUDIT"
grep -q 'signature verification command and transcript' "$AUDIT"
grep -q 'artifact hash verification command and transcript' "$AUDIT"
grep -q 'failure transcript' "$AUDIT"
grep -q 'binding checks for `candidate_commit`, `release_tag`, `artifact_manifest`, `artifact_manifest_sha256`, `public_key_fingerprint`, `SHA256SUMS`, `SHA256SUMS.sig`, and exact artifact set' "$AUDIT"
grep -q 'reviewer, review timestamp, blocker status, unresolved blocker evidence, and classification' "$AUDIT"
grep -q 'does not sign release artifacts' "$AUDIT"
grep -q 'does not checksum real release artifacts' "$AUDIT"
grep -q 'does not compare real release artifact hashes against `SHA256SUMS`' "$AUDIT"
grep -q 'does not verify detached signatures' "$AUDIT"
grep -q 'does not prove artifact authenticity' "$AUDIT"
grep -q 'does not collect candidate-specific release evidence' "$AUDIT"
grep -q 'does not approve release signing' "$AUDIT"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$AUDIT"

grep -q 'Candidate commit: `TODO-CANDIDATE-COMMIT`' "$TEMPLATE"
grep -q 'Release tag: `TODO-RELEASE-TAG`' "$TEMPLATE"
grep -q 'Artifact manifest SHA-256: `TODO-ARTIFACT-MANIFEST-SHA256`' "$TEMPLATE"
grep -q '`SHA256SUMS.sig` SHA-256: `TODO-SHA256SUMS-SIG-SHA256`' "$TEMPLATE"
grep -q 'Signature verification transcript: `TODO-SIGNATURE-VERIFICATION-TRANSCRIPT`' "$TEMPLATE"
grep -q 'Artifact hash verification transcript: `TODO-ARTIFACT-HASH-VERIFICATION-TRANSCRIPT`' "$TEMPLATE"
grep -q 'Failure transcript: `TODO-FAILURE-TRANSCRIPT`' "$TEMPLATE"
grep -q 'Blocker status: `TODO-BLOCKER-STATUS`' "$TEMPLATE"
grep -q 'not-signed-artifact-verification-evidence' "$TEMPLATE"

grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE_COVERAGE_AUDIT.md' "$ROOT_DIR/README.md"
grep -q 'RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE_COVERAGE_AUDIT.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'signed-artifact verification record template coverage audit' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_candidate_signed_artifact_verification_record_template_coverage_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'signed artifact verification evidence recorded|detached signature verification evidence recorded|artifact authenticity proof recorded|release artifact hashes verified|signed artifact verification passed|release signing approved|release candidate approved|release hardening gates passed|v0\.1-security-ready approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_GATE_EVIDENCE_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_RECORD_TEMPLATE_COVERAGE_AUDIT.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "signed-artifact verification record template coverage audit must not imply evidence or approval" >&2
  exit 1
fi

printf 'release signing candidate signed-artifact verification record template coverage audit remains audit-only\n'
