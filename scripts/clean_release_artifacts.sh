#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/public-release"
WEB_DIST_DIR="$ROOT_DIR/apps/web/dist"

show_size() {
  local path="$1"
  if [ -e "$path" ]; then
    du -sh "$path"
  else
    printf '0B\t%s (없음)\n' "$path"
  fi
}

printf '재생성 가능한 릴리스 산출물:\n'
show_size "$RELEASE_DIR"
show_size "$WEB_DIST_DIR"

if [ "${1:-}" != "--apply" ]; then
  printf '\n삭제하지 않았습니다. 실제 삭제는 다음 명령으로 명시해야 합니다:\n'
  printf '  %s --apply\n' "$0"
  exit 0
fi

rm -rf -- "$RELEASE_DIR" "$WEB_DIST_DIR"
printf '\n릴리스 아카이브와 웹 dist를 삭제했습니다. 둘 다 빌드로 재생성할 수 있습니다.\n'
