#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
RELAY=${AD_RELAY_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/debug/another-dimension-relay"}

if [ ! -x "$RELAY" ]; then
  CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --offline -p another-dimension-relay
fi

export AD_RELAY_DATA_DIR=${AD_RELAY_DATA_DIR:-"${AD_DATA_DIR:-$PROJECT_DIR/.another-dimension-relay}"}
export AD_RELAY_BIND_HOST=${AD_RELAY_BIND_HOST:-127.0.0.1}
export AD_RELAY_PORT=${AD_RELAY_PORT:-1422}
exec "$RELAY"
