#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'license = "UNLICENSED"' "$ROOT_DIR/Cargo.toml"
grep -q 'publish = false' "$ROOT_DIR/Cargo.toml"
grep -q '"private": true' "$ROOT_DIR/apps/desktop-tauri/package.json"
grep -q 'not ready for real communication' "$ROOT_DIR/SECURITY.md"
grep -q 'does not .*secure messenger release' "$ROOT_DIR/README.md"
grep -q 'high-risk transport policy/fail-closed behavior' "$ROOT_DIR/README.md"
grep -q 'entry to a bounded fail-closed skeleton, not usable network execution' "$ROOT_DIR/README.md"
grep -Fq 'network_execution_allowed()` means the pre-network blocker list is empty enough to enter the next bounded fail-closed skeleton' "$ROOT_DIR/TRANSPORT_DECISION.md"
grep -Fq 'It does not mean sockets, Tor bootstrap, onion hosting, or envelope transfer are allowed' "$ROOT_DIR/TRANSPORT_DECISION.md"
grep -Fq 'TransportRuntimePreflight::first_runtime_blocker()` may report the first fail-closed blocker without minting a `TransportRuntimeReady` token' "$ROOT_DIR/TRANSPORT_DECISION.md"
grep -Fq 'TransportRuntimeState::fail_closed_blocker()` reports disabled state as `RuntimeNetworkDisabled` for status/reporting without starting a runtime' "$ROOT_DIR/TRANSPORT_DECISION.md"
grep -q 'pub fn first_runtime_blocker(self) -> Option<TransportRuntimeError>' "$ROOT_DIR/crates/transport/src/runtime_preflight.rs"
grep -q 'pub fn fail_closed_blocker(self) -> Option<TransportRuntimeError>' "$ROOT_DIR/crates/transport/src/runtime_preflight.rs"
grep -q 'It does not send messages, persist keys, bootstrap transport' "$ROOT_DIR/README.md"
grep -q 'SQLCipher-backed storage spikes for `ADREC1` record containers' "$ROOT_DIR/README.md"
grep -q 'not a complete production encrypted local storage lifecycle' "$ROOT_DIR/README.md"
grep -q 'Complete production encrypted local storage lifecycle' "$ROOT_DIR/README.md"
grep -q 'Complete production encrypted local storage lifecycle' "$ROOT_DIR/SECURITY.md"
grep -q 'Replay rollback protection against encrypted database snapshot restore' "$ROOT_DIR/SECURITY.md"
grep -q 'does not have a complete production encrypted local storage lifecycle today' "$ROOT_DIR/STORAGE_DECISION.md"
grep -q 'ADREC1` spike' "$ROOT_DIR/STORAGE_DECISION.md"
grep -q 'ADREC1` is a container format, not an encryption algorithm' "$ROOT_DIR/STORAGE_DECISION.md"
grep -q 'Public docs should use "storage guardrails", "storage boundary", or "SQLCipher-backed storage spike"' "$ROOT_DIR/STORAGE_DECISION.md"
grep -q 'Public product language must therefore avoid claims like "persistent replay protection" or "rollback-proof local state."' "$ROOT_DIR/STORAGE_DECISION.md"
grep -Fq 'Here, "production" means the default non-`dev-insecure` build boundary, not deployable security' "$ROOT_DIR/README.md"
grep -q 'perform network I/O, unlock local storage' "$ROOT_DIR/README.md"
grep -q 'COMPONENT_BOUNDARIES.md' "$ROOT_DIR/README.md"
grep -q 'Security-Ready Component Boundaries' "$ROOT_DIR/COMPONENT_BOUNDARIES.md"
grep -q 'not a secure messenger release today' "$ROOT_DIR/COMPONENT_BOUNDARIES.md"
grep -q 'boundary map, not an approval to ship production communication' "$ROOT_DIR/COMPONENT_BOUNDARIES.md"
grep -q 'Default builds do not expose usable profile, pairing, messaging, storage unlock, Tor bootstrap, onion hosting, stream I/O, or production message commands' "$ROOT_DIR/COMPONENT_BOUNDARIES.md"
grep -q 'replace Tauri CLI-wrapper demo commands with Rust-owned runtime commands only after the above boundaries have guardrails' "$ROOT_DIR/COMPONENT_BOUNDARIES.md"
grep -q 'Any claim that this project is generally safer than Signal' "$ROOT_DIR/COMPONENT_BOUNDARIES.md"
grep -q 'COMPONENT_BOUNDARIES.md' "$ROOT_DIR/SECURITY.md"
grep -q 'warning: production self-test is not a secure messenger release' "$ROOT_DIR/apps/cli/src/main.rs"
grep -q 'production self-test performs no network I/O and opens no local storage' "$ROOT_DIR/apps/cli/src/main.rs"
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
