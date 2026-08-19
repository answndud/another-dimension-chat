#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TOOLS=${AD_TOOLS_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/release/another-dimension-tools"}
if [ ! -x "$TOOLS" ]; then
  CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --release --offline -p another-dimension-tools
fi
"$TOOLS" web-build --source "$PROJECT_DIR/apps/web" --output "${AD_WEB_DIST:-$PROJECT_DIR/apps/web/dist}"
printf '%s\n' "static web build complete"
