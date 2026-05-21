#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Release Signing Tooling Decision Gate' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'RELEASE_SIGNING_TOOLING_DECISION.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'Decision status: tooling path selected, signing implementation incomplete' \
  "$ROOT_DIR/RELEASE_SIGNING_TOOLING_DECISION.md"
grep -q 'The release signing tooling path is OpenSSL-compatible detached signatures over `SHA256SUMS`' \
  "$ROOT_DIR/RELEASE_SIGNING_TOOLING_DECISION.md"
grep -q 'does not create a release signing key, sign release artifacts, or approve release signing readiness' \
  "$ROOT_DIR/RELEASE_SIGNING_TOOLING_DECISION.md"
grep -q 'selected OpenSSL-compatible detached-signature path' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'OpenSSL fixture supports the selected tooling path' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'scripts/verify_release_signing_tooling_gate.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_tooling_gate.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release signing ready|release signing complete|signed artifact verification passed|artifact authenticity proven|release signing key generated|release signing tooling approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_TOOLING_DECISION.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release signing tooling decision is not release signing readiness" >&2
  exit 1
fi

printf 'release signing tooling gate confirms tooling path is selected but signing is incomplete\n'
