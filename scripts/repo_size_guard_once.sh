#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THRESHOLD_BYTES="${AD_REPO_SIZE_GUARD_THRESHOLD_BYTES:-2147483648}"
FAIL_ON_LARGE="${AD_REPO_SIZE_GUARD_FAIL:-0}"

size_bytes() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    printf '0'
    return
  fi

  local kib
  kib="$(du -sk "$path" 2>/dev/null | awk '{ print $1 }')"
  printf '%s' "$((kib * 1024))"
}

size_human() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    printf 'missing'
    return
  fi

  du -sh "$path" 2>/dev/null | awk '{ print $1 }'
}

report_path() {
  local label="$1"
  local path="$2"
  local bytes
  local status

  bytes="$(size_bytes "$path")"
  status="ok"
  if (( bytes >= THRESHOLD_BYTES )); then
    status="large"
    large_count="$((large_count + 1))"
  fi

  printf 'repo_size_guard_item label=%s status=%s bytes=%s size=%s path=%s\n' \
    "$label" "$status" "$bytes" "$(size_human "$path")" "$path"
}

large_count=0

printf 'repo_size_guard threshold_bytes=%s fail_on_large=%s\n' "$THRESHOLD_BYTES" "$FAIL_ON_LARGE"
report_path "repo-local-build-cache" "$ROOT_DIR/.build-cache"
report_path "repo-root-target" "$ROOT_DIR/target"
report_path "desktop-tauri-target" "$ROOT_DIR/apps/desktop-tauri/src-tauri/target"
report_path "desktop-vite-dist" "$ROOT_DIR/apps/desktop-tauri/dist"

if (( large_count > 0 )); then
  printf 'repo_size_guard_status=large-generated-paths-present count=%s\n' "$large_count"
  printf 'repo_size_guard_next_action=scripts/clean_build_cache.sh --dry-run\n'
  if [[ "$FAIL_ON_LARGE" == "1" ]]; then
    exit 1
  fi
else
  printf 'repo_size_guard_status=ok\n'
fi
