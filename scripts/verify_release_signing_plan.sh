#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Another Dimension Chat does not have release signing today' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'pre-implementation signing design, not signed artifact evidence and not release approval' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'SHA256SUMS' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'RELEASE_SIGNING_TOOLING_DECISION.md' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'dry-run release using disposable test keys' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'scripts/verify_release_signing_dry_run.sh' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'The dry-run marker is not a real release signature' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'scripts/verify_release_detached_signature_fixture.sh' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'does not create a release signing key or sign release artifacts' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'RELEASE_SIGNING_CEREMONY_DRY_RUN.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'dry-run procedure only, not release signing evidence' \
  "$ROOT_DIR/RELEASE_SIGNING_CEREMONY_DRY_RUN.md"
grep -q 'RELEASE_SIGNING_PLAN.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_plan.sh' "$ROOT_DIR/RELEASE_HARDENING.md"

if grep -R -n -E 'release signing ready|release signing complete|signed artifact verification passed|artifact authenticity proven|release signing key generated' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release signing is not implemented and must not be claimed" >&2
  exit 1
fi

printf 'release signing plan confirms signing is planned but not implemented\n'
