#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

if [ ! -f "$PROJECT_DIR/apps/web/dist/index.html" ]; then
  echo "Web bundle missing. Run: npm --prefix apps/web run build --workspaces=false" >&2
  exit 1
fi

exec node "$PROJECT_DIR/apps/server/server.mjs"
