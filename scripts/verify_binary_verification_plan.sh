#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Another Dimension Chat does not have reproducible builds or equivalent binary verification today' \
  "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'pre-implementation verification design, not reproducible build evidence and not release approval' \
  "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'Equivalent binary verification' "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'Artifact manifest listing every release artifact and expected checksum' \
  "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'missing artifacts, extra artifacts, checksum mismatch, changed lockfiles, changed build inputs, or unrecorded environment differences' \
  "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'does not make builds reproducible' "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'scripts/verify_binary_manifest_fixture.sh' "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'does not verify release artifacts, prove reproducibility, or provide independent rebuild evidence' \
  "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'RELEASE_BINARY_VERIFICATION_PLAN.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_binary_verification_plan.sh' "$ROOT_DIR/RELEASE_HARDENING.md"

if grep -R -n -E 'reproducible build ready|reproducible builds complete|equivalent binary verification complete|independent rebuild verified|binary verification passed|artifact checksums independently verified' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "reproducible/equivalent binary verification is not implemented and must not be claimed" >&2
  exit 1
fi

printf 'binary verification plan confirms reproducible/equivalent verification is planned but incomplete\n'
