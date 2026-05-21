#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Release signing | No release signing workflow or signed artifact verification exists; a pre-implementation signing plan, tooling decision, ceremony dry-run record, real key ceremony requirements, artifact signing requirements, Release verification UX evidence requirements, candidate evidence index, candidate evidence collection runbook, candidate evidence fixture, candidate evidence fixture coverage audit, release-note non-claim guard, ceremony command harness, dry-run verifier, and disposable detached-signature fixture exist' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'Reproducible or equivalent verification | No reproducible build evidence or equivalent binary verification evidence exists; a pre-implementation verification plan, input template, and manifest fixture verifier exist' \
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
