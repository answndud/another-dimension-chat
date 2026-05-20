#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'license = "UNLICENSED"' "$ROOT_DIR/Cargo.toml"
grep -q 'publish = false' "$ROOT_DIR/Cargo.toml"
grep -q '"private": true' "$ROOT_DIR/apps/desktop-tauri/package.json"
grep -q 'not ready for real communication' "$ROOT_DIR/SECURITY.md"
grep -q 'does not .*secure messenger release' "$ROOT_DIR/README.md"
grep -q 'high-risk transport policy/fail-closed behavior' "$ROOT_DIR/README.md"
grep -q 'It does not send messages, persist keys, bootstrap transport' "$ROOT_DIR/README.md"
grep -q 'warning: production self-test is not a secure messenger release' "$ROOT_DIR/apps/cli/src/main.rs"
grep -q 'production boundary self-test passed' "$ROOT_DIR/apps/cli/src/main.rs"
grep -q 'Release signing or reproducible builds' "$ROOT_DIR/README.md"

if git -C "$ROOT_DIR" ls-files | grep -E '^docs/' >/dev/null; then
  echo "private docs must not be tracked" >&2
  exit 1
fi

if grep -R -n -E 'ready for real communication|secure messenger release|production-grade confidentiality|production transport adapter implementation' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/apps/desktop-tauri/README.md" \
  "$ROOT_DIR/apps/desktop-tauri/package.json" \
  "$ROOT_DIR/apps/desktop-tauri/src-tauri/tauri.conf.json" \
  | grep -v 'not ready for real communication' \
  | grep -v 'not a secure messenger release' \
  | grep -v 'does not .*secure messenger release' \
  | grep -v 'does not provide production-grade confidentiality' \
  | grep -v 'Production transport adapter implementation' >/dev/null; then
  echo "public release surface contains an unsupported security/readiness claim" >&2
  exit 1
fi

printf 'release hygiene static verification passed\n'
