#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Dependency and supply-chain review | Lockfiles, static checks, and a release-candidate review template exist, but no candidate-specific review evidence exists' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'Dependency Review Policy Skeleton' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'No dependency review evidence is recorded yet' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_dependency_review_template.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'dependency review record must identify reviewed lockfiles, direct dependency changes, native/system dependencies, and denied or accepted risk decisions' \
  "$ROOT_DIR/RELEASE_HARDENING.md"

if grep -R -n -E 'dependency review complete|supply-chain review complete|dependency gate passed|dependencies approved for security-ready release' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "dependency/supply-chain review is not complete and must not be claimed" >&2
  exit 1
fi

printf 'dependency review gate skeleton confirms dependency review is incomplete\n'
