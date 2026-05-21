#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQ="$ROOT_DIR/RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md"

grep -q 'evidence requirements only, not artifact signing evidence' "$REQ"
grep -q 'does not sign artifacts, verify real artifacts, or approve a release candidate' "$REQ"
grep -q 'Candidate commit: `TODO-CANDIDATE-COMMIT`' "$REQ"
grep -q 'Signing key ceremony reference: `TODO-KEY-CEREMONY-REFERENCE`' "$REQ"
grep -q 'Detached signature path: `TODO-SHA256SUMS-SIG-PATH`' "$REQ"
grep -q 'Signing command transcript: `TODO-SIGNING-COMMAND-TRANSCRIPT`' "$REQ"
grep -q 'Reviewer verification transcript: `TODO-VERIFICATION-TRANSCRIPT`' "$REQ"
grep -q 'Signature verification transcript' "$REQ"
grep -q 'Artifact hash verification transcript' "$REQ"
grep -q 'Fail-closed checks' "$REQ"
grep -q 'does not sign release artifacts' "$REQ"
grep -q 'does not verify real release artifacts' "$REQ"
grep -q 'RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'scripts/verify_release_artifact_signing_requirements.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_artifact_signing_requirements.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release signing ready|release signing complete|signed artifact verification passed|artifact authenticity proven|release artifacts signed|signed artifact evidence recorded|artifact signing evidence recorded' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "artifact signing requirements are not signed artifact evidence" >&2
  exit 1
fi

printf 'release artifact signing requirements confirm signed artifact evidence is not recorded\n'
