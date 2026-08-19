#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
export CARGO_INCREMENTAL=0
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-"$ROOT_DIR/.build-cache/cargo-target"}

printf '%s\n' '==> Rust workspace check'
cargo check --workspace --locked --offline
printf '%s\n' '==> static web build'
scripts/build_web_static.sh
printf '%s\n' '==> launcher syntax'
bash -n scripts/*.sh
printf '%s\n' 'Rust/web lightweight verification passed'
