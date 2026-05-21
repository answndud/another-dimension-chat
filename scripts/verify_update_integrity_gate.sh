#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Update and installer integrity | An integrity template exists, but no candidate-specific update or installer integrity evidence exists' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'Update and Installer Integrity Checklist Skeleton' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'No update or installer integrity evidence is recorded yet' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'RELEASE_UPDATE_INTEGRITY_TEMPLATE.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_update_integrity_template.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'update integrity record must identify artifact formats, signature/hash verification, downgrade or rollback handling, platform package integrity, and recovery behavior for failed updates' \
  "$ROOT_DIR/RELEASE_HARDENING.md"

if grep -R -n -E 'update integrity complete|installer integrity complete|signed update verification passed|package integrity approved|auto-update ready' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "update/installer integrity is not complete and must not be claimed" >&2
  exit 1
fi

printf 'update integrity gate skeleton confirms update/installer integrity is incomplete\n'
