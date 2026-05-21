#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Audit verdict: not complete' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Current evidence does not prove v0.1-security-ready 100%' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Release signing | `RELEASE_HARDENING.md` records a pre-implementation signing plan, dry-run verifier, disposable detached-signature fixture, and unresolved tooling gate, but no release signing workflow or signed artifact verification exists' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_plan.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_dry_run.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_detached_signature_fixture.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_tooling_gate.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Reproducible or equivalent binary verification | `RELEASE_HARDENING.md` states no reproducible build story exists' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Dependency and supply-chain review | `RELEASE_HARDENING.md` records only a policy skeleton' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Threat model and release copy alignment | `RELEASE_HARDENING.md` records only a release-candidate signoff skeleton' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'External or independent review readiness | `RELEASE_HARDENING.md` records only a readiness checklist skeleton' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Update and installer integrity | `RELEASE_HARDENING.md` records only an update/installer integrity checklist skeleton' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Update and installer integrity' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signoff_gate.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'v0\.1-security-ready 100% complete|release gates complete|completion audit passed|approved for high-risk release' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "completion audit does not prove 100% or release approval" >&2
  exit 1
fi

printf 'release completion audit confirms v0.1-security-ready is not complete\n'
