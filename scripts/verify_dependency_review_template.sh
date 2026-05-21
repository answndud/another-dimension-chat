#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md"

grep -q 'not dependency review evidence, supply-chain approval, release approval, or a security-ready claim' "$TEMPLATE"
grep -q 'Candidate commit: `TODO-CANDIDATE-COMMIT`' "$TEMPLATE"
grep -q 'Build profile: `TODO-BUILD-PROFILE`' "$TEMPLATE"
grep -q 'Target platform: `TODO-TARGET-PLATFORM`' "$TEMPLATE"
grep -q 'Workspace lockfile: `Cargo.lock`' "$TEMPLATE"
grep -q 'Tauri Rust lockfile: `apps/desktop-tauri/src-tauri/Cargo.lock`' "$TEMPLATE"
grep -q 'Desktop npm lockfile: `apps/desktop-tauri/package-lock.json`' "$TEMPLATE"
grep -q 'Direct Dependency Changes' "$TEMPLATE"
grep -q 'Security-Sensitive Dependency Areas' "$TEMPLATE"
grep -q 'SQLCipher/OpenSSL requirements: `TODO-SQLCIPHER-OPENSSL-REVIEW`' "$TEMPLATE"
grep -q 'Deny/Allow Decisions' "$TEMPLATE"
grep -q 'not-review-evidence' "$TEMPLATE"
grep -q 'does not provide dependency review evidence' "$TEMPLATE"
grep -q 'RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_dependency_review_template.sh' "$ROOT_DIR/RELEASE_HARDENING.md"
grep -q 'scripts/verify_dependency_review_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'dependency review template complete|release-candidate dependency review evidence recorded|supply-chain review evidence recorded|dependencies approved for high-risk use|dependencies approved for security-ready release' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "dependency review template is not review evidence and must not be claimed complete" >&2
  exit 1
fi

printf 'dependency review template confirms dependency review evidence is not recorded\n'
