#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RECORD="$ROOT_DIR/RELEASE_SIGNING_CEREMONY_DRY_RUN.md"

grep -q 'dry-run procedure only, not release signing evidence' "$RECORD"
grep -q 'RELEASE_SIGNING_TOOLING_DECISION.md' "$RECORD"
grep -q 'OpenSSL-compatible detached-signature path' "$RECORD"
grep -q 'openssl dgst -sha256 -sign' "$RECORD"
grep -q 'openssl dgst -sha256 -verify' "$RECORD"
grep -q 'TODO-DRY-RUN-OPERATOR' "$RECORD"
grep -q 'Disposable private key path: `TODO-DISPOSABLE-PRIVATE-KEY-PATH`' "$RECORD"
grep -q 'Missing `SHA256SUMS.sig`' "$RECORD"
grep -q 'Extra unsigned artifacts' "$RECORD"
grep -q 'This dry-run record does not create release keys' "$RECORD"
grep -q 'This dry-run record does not sign release artifacts' "$RECORD"
grep -q 'RELEASE_SIGNING_CEREMONY_DRY_RUN.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'scripts/verify_release_signing_ceremony_dry_run.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signing_ceremony_dry_run.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release signing ready|release signing complete|signed artifact verification passed|artifact authenticity proven|release signing key generated|real release key created|release artifacts signed' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md" \
  "$ROOT_DIR/RELEASE_SIGNING_TOOLING_DECISION.md" \
  "$ROOT_DIR/RELEASE_SIGNING_CEREMONY_DRY_RUN.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "signing ceremony dry-run is not release signing evidence" >&2
  exit 1
fi

printf 'release signing ceremony dry-run record confirms signing evidence is not recorded\n'
