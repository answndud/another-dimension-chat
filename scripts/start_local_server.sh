#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
CONFIG_FILE=${AD_CONFIG_FILE:-"$PROJECT_DIR/.another-dimension-server/server-config.json"}

node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 20) { console.error(`Node.js 20 or newer is required (found ${process.version}).`); process.exit(1); }'

if [ ! -f "$PROJECT_DIR/apps/web/dist/index.html" ]; then
  echo "Web bundle missing. Run: npm --prefix apps/web run build --workspaces=false" >&2
  exit 1
fi

if [ "${1:-}" = "--setup" ]; then
  shift
  node "$PROJECT_DIR/scripts/configure_local_server.mjs" --config "$CONFIG_FILE" "$@"
fi

if [ -f "$CONFIG_FILE" ]; then
  node "$PROJECT_DIR/scripts/preflight_local_server.mjs" --config "$CONFIG_FILE"
else
  node "$PROJECT_DIR/scripts/preflight_local_server.mjs"
fi

if [ -f "$CONFIG_FILE" ]; then
  exec node "$PROJECT_DIR/apps/server/server.mjs" --config "$CONFIG_FILE"
fi

exec node "$PROJECT_DIR/apps/server/server.mjs"
