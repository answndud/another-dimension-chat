#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/RELEASE_UPDATE_INTEGRITY_TEMPLATE.md"

grep -q 'not update integrity evidence, installer integrity evidence, package integrity approval, release approval, or a security-ready claim' "$TEMPLATE"
grep -q 'Candidate commit: `TODO-CANDIDATE-COMMIT`' "$TEMPLATE"
grep -q 'Build profile: `TODO-BUILD-PROFILE`' "$TEMPLATE"
grep -q 'Target platforms: `TODO-TARGET-PLATFORMS`' "$TEMPLATE"
grep -q 'Artifact and Package Inventory' "$TEMPLATE"
grep -q 'Public signing-key fingerprint: `TODO-PUBLIC-SIGNING-KEY-FINGERPRINT`' "$TEMPLATE"
grep -q 'Signature verification command: `TODO-SIGNATURE-VERIFY-COMMAND`' "$TEMPLATE"
grep -q 'Downgrade and Rollback Handling' "$TEMPLATE"
grep -q 'Platform Package Integrity' "$TEMPLATE"
grep -q 'Auto-update enabled for v0.1: `TODO-MUST-BE-NO`' "$TEMPLATE"
grep -q 'Background update checks enabled for v0.1: `TODO-MUST-BE-NO`' "$TEMPLATE"
grep -q 'not-update-integrity-evidence' "$TEMPLATE"
grep -q 'does not verify any release artifact or installer' "$TEMPLATE"
grep -q 'RELEASE_UPDATE_INTEGRITY_TEMPLATE.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_update_integrity_template.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_update_integrity_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'update integrity template complete|release-candidate update integrity evidence recorded|installer integrity evidence recorded|signed update verification passed|package integrity approved|auto-update ready' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_UPDATE_INTEGRITY_TEMPLATE.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "update integrity template is not integrity evidence and must not be claimed complete" >&2
  exit 1
fi

printf 'update integrity template confirms update/installer integrity evidence is not recorded\n'
