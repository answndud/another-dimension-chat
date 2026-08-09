#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly TARGET_DIR="$ROOT_DIR/target"
readonly CARGO_CACHE_DIR="$ROOT_DIR/.build-cache/cargo-target"

apply=0
case "${1:-}" in
  "") ;;
  --apply) apply=1 ;;
  *)
    echo "사용법: $0 [--apply]" >&2
    exit 2
    ;;
esac

report() {
  local path="$1"
  if [ -e "$path" ]; then
    du -sh -- "$path"
  else
    printf '0B\t%s (없음)\n' "$path"
  fi
}

echo "재생성 가능한 Rust build cache:"
report "$TARGET_DIR"
report "$CARGO_CACHE_DIR"

if [ "$apply" -eq 0 ]; then
  echo "dry-run: 삭제하지 않았습니다. 실제 삭제는 --apply를 사용하세요."
  exit 0
fi

for path in "$TARGET_DIR" "$CARGO_CACHE_DIR"; do
  case "$path" in
    "$ROOT_DIR/target"|"$ROOT_DIR/.build-cache/cargo-target") ;;
    *) echo "허용되지 않은 build cache 경로: $path" >&2; exit 1 ;;
  esac
  if [ -e "$path" ]; then
    rm -rf -- "$path"
    echo "삭제됨: $path"
  fi
done

echo "정리 후:"
report "$TARGET_DIR"
report "$CARGO_CACHE_DIR"
