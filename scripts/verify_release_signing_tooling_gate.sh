#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Release Signing Tooling Decision Gate' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'No final release signing tooling decision is recorded yet' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'minisign/signify-first path and an OpenSSL-compatible detached-signature path' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'The OpenSSL fixture does not select final release signing tooling' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'scripts/verify_release_signing_tooling_gate.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_tooling_gate.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release signing tooling selected|final signing tool selected|minisign selected for release|signify selected for release|openssl selected for release signing|release signing tooling approved' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release signing tooling is not selected and must not be claimed" >&2
  exit 1
fi

printf 'release signing tooling gate confirms final signing tooling is undecided\n'
