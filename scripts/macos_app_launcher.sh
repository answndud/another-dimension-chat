#!/bin/sh
set -eu

# Thin Finder entrypoint. The browser remains the UI; this file only hands
# lifecycle ownership to the packaged Rust launcher inside Resources.
APP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
LAUNCHER="$APP_ROOT/Resources/another-dimension"
[ -x "$LAUNCHER" ] || {
  echo "Another Dimension 설치가 손상되었습니다: launcher가 없습니다." >&2
  exit 1
}
exec "$LAUNCHER" start "$@"
