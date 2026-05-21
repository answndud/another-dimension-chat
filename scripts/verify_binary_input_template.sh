#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/RELEASE_BINARY_INPUT_TEMPLATE.md"

grep -q 'not release-candidate evidence, reproducible build evidence, equivalent binary verification evidence, or release approval' "$TEMPLATE"
grep -q 'Candidate commit: `TODO-CANDIDATE-COMMIT`' "$TEMPLATE"
grep -q 'Build profile: `TODO-BUILD-PROFILE`' "$TEMPLATE"
grep -q 'Target platform: `TODO-TARGET-PLATFORM`' "$TEMPLATE"
grep -q 'Rust toolchain: `TODO-RUST-TOOLCHAIN`' "$TEMPLATE"
grep -q 'Workspace lockfile: `Cargo.lock`' "$TEMPLATE"
grep -q 'Tauri Rust lockfile: `apps/desktop-tauri/src-tauri/Cargo.lock`' "$TEMPLATE"
grep -q 'Desktop npm lockfile: `apps/desktop-tauri/package-lock.json`' "$TEMPLATE"
grep -q 'Artifact path | Bytes | SHA-256' "$TEMPLATE"
grep -q 'Build-input drift result: `TODO-BUILD-INPUT-DRIFT-RESULT`' "$TEMPLATE"
grep -q 'not-verification-evidence' "$TEMPLATE"
grep -q 'does not verify any release artifact' "$TEMPLATE"
grep -q 'RELEASE_BINARY_INPUT_TEMPLATE.md' "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'scripts/verify_binary_input_template.sh' "$ROOT_DIR/RELEASE_HARDENING.md"

if grep -R -n -E 'binary input template complete|release-candidate binary verification evidence recorded|equivalent binary verification evidence recorded|reproducible build evidence recorded|independent rebuild evidence recorded' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md" \
  "$ROOT_DIR/RELEASE_BINARY_INPUT_TEMPLATE.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "binary input template is not verification evidence and must not be claimed complete" >&2
  exit 1
fi

printf 'binary input template confirms release-candidate verification evidence is not recorded\n'
