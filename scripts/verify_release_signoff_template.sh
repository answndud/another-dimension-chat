#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/RELEASE_SIGNOFF_TEMPLATE.md"

grep -q 'not release-candidate signoff evidence, threat-model signoff evidence, release-copy approval, release approval, or a security-ready claim' "$TEMPLATE"
grep -q 'Candidate commit: `TODO-CANDIDATE-COMMIT`' "$TEMPLATE"
grep -q 'Build profile: `TODO-BUILD-PROFILE`' "$TEMPLATE"
grep -q 'Target platforms: `TODO-TARGET-PLATFORMS`' "$TEMPLATE"
grep -q 'Threat model revision: `TODO-THREAT-MODEL-REVISION`' "$TEMPLATE"
grep -q 'Non-goals included in public copy: `TODO-NON-GOALS-COPY`' "$TEMPLATE"
grep -q 'Known risks included in public copy: `TODO-KNOWN-RISKS-COPY`' "$TEMPLATE"
grep -q 'Public Copy Alignment' "$TEMPLATE"
grep -q 'Release Gate Evidence' "$TEMPLATE"
grep -q 'Unresolved Blockers' "$TEMPLATE"
grep -q 'not-signoff-evidence' "$TEMPLATE"
grep -q 'does not sign off a release candidate' "$TEMPLATE"
grep -q 'RELEASE_SIGNOFF_TEMPLATE.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signoff_template.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_release_signoff_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'release signoff template complete|release-candidate signoff evidence recorded|threat-model signoff evidence recorded|release-copy signoff evidence recorded|known risks accepted for high-risk release' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_SIGNOFF_TEMPLATE.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release signoff template is not signoff evidence and must not be claimed complete" >&2
  exit 1
fi

printf 'release signoff template confirms signoff evidence is not recorded\n'
