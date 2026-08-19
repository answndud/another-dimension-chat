#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${1:-}" != "--release" ]]; then
  echo '사용법: scripts/verify_full.sh --release' >&2
  exit 2
fi
[[ $# -eq 1 ]] || { echo '옵션은 --release 하나만 허용됩니다.' >&2; exit 2; }
cd "$ROOT_DIR"
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
export CARGO_INCREMENTAL=0
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-"$ROOT_DIR/.build-cache/cargo-target"}

scripts/prepare_build_cache.sh
printf '%s\n' '==> Rust release binaries'
cargo build --release --locked --offline -p another-dimension-daemon -p another-dimension-relay -p another-dimension-tools
printf '%s\n' '==> static web build'
scripts/build_web_static.sh
printf '%s\n' '==> shell syntax'
bash -n scripts/*.sh
printf '%s\n' '==> P0 local smoke'
scripts/smoke_p0.sh
scripts/prepare_build_cache.sh
printf '%s\n' 'Rust/web release verification passed'
