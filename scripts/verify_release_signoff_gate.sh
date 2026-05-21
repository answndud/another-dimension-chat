#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Threat model and release copy alignment | Public non-claim copy exists' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'Release-Candidate Threat Model and Copy Signoff Skeleton' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'No release-candidate threat-model or release-copy signoff evidence is recorded yet' \
  "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'release-candidate signoff record must identify the exact candidate commit, threat model revision, non-goals, known risks, user-facing safety copy, and unresolved release blockers' \
  "$ROOT_DIR/RELEASE_HARDENING.md"

if grep -R -n -E 'release candidate signoff complete|threat model signoff complete|release copy approved|safety copy approved|known risks accepted for high-risk release' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "release-candidate signoff is not complete and must not be claimed" >&2
  exit 1
fi

printf 'release signoff gate skeleton confirms release-candidate signoff is incomplete\n'
