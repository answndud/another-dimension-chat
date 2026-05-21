#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'External or independent review readiness | A readiness template exists, but no candidate-specific external or independent review readiness evidence exists' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'External Review Readiness Checklist Skeleton' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'No external or independent review readiness evidence is recorded yet' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'RELEASE_EXTERNAL_REVIEW_TEMPLATE.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_external_review_template.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'external review readiness record must identify reviewed scope, reviewer independence expectations, review materials, finding triage, and release-blocking unresolved risks' \
  "$ROOT_DIR/RELEASE_HARDENING.md"

if grep -R -n -E 'external review complete|independent review complete|external review ready|review findings resolved|approved for high-risk release' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "external/independent review readiness is not complete and must not be claimed" >&2
  exit 1
fi

printf 'external review gate skeleton confirms review readiness is incomplete\n'
