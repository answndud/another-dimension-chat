#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Release signing | No signing workflow or signed artifact verification exists' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'Reproducible or equivalent verification | No reproducible build story exists' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'This inventory does not replace an external review, release signing, reproducible/equivalent verification, or dependency review' \
  "$ROOT_DIR/RELEASE_HARDENING.md"

if grep -R -n -E 'release signing ready|reproducible build ready|signed artifact verification passed|security-ready release gate passed' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release artifact gate readiness is not implemented and must not be claimed" >&2
  exit 1
fi

printf 'release artifact gate skeleton confirms signing/reproducible gates are incomplete\n'
