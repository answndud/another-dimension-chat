#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=build_cache_env.sh
source "$ROOT_DIR/scripts/build_cache_env.sh"

cd "$ROOT_DIR"
cargo run -q --features dev-insecure -- demo local
