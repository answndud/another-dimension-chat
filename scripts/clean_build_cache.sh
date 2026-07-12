#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'USAGE'
usage: scripts/clean_build_cache.sh [--dry-run|--apply]

Default: --dry-run. Prints repo-local and external build caches without deleting.
Use --apply to delete only the listed generated build/cache paths.
USAGE
}

mode="dry-run"
case "${1:---dry-run}" in
  --dry-run)
    mode="dry-run"
    ;;
  --apply)
    mode="apply"
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

default_build_cache_dir() {
  local platform
  platform="$(uname -s 2>/dev/null || printf 'unknown')"

  case "$platform" in
    Darwin)
      if [[ -n "${HOME:-}" ]]; then
        printf '%s\n' "$HOME/Library/Caches/another-dimension"
        return
      fi
      ;;
    MINGW* | MSYS* | CYGWIN*)
      if [[ -n "${LOCALAPPDATA:-}" ]]; then
        printf '%s\n' "$LOCALAPPDATA/another-dimension"
        return
      fi
      ;;
    *)
      if [[ -n "${XDG_CACHE_HOME:-}" ]]; then
        printf '%s\n' "$XDG_CACHE_HOME/another-dimension"
        return
      fi
      if [[ -n "${HOME:-}" ]]; then
        printf '%s\n' "$HOME/.cache/another-dimension"
        return
      fi
      ;;
  esac

  printf '%s\n' "$ROOT_DIR/.build-cache"
}

resolved_cargo_target_dir() {
  if [[ -n "${CARGO_TARGET_DIR:-}" ]]; then
    printf '%s\n' "$CARGO_TARGET_DIR"
  elif [[ -n "${AD_BUILD_CACHE_DIR:-}" ]]; then
    printf '%s\n' "$AD_BUILD_CACHE_DIR/cargo-target"
  else
    printf '%s\n' "$(default_build_cache_dir)/cargo-target"
  fi
}

reject_unsafe_path() {
  local path="$1"
  case "$path" in
    "" | "/" | "$ROOT_DIR" | "$ROOT_DIR/" | "$ROOT_DIR/.git" | "$ROOT_DIR/.git/" | "$ROOT_DIR/docs" | "$ROOT_DIR/docs/")
      echo "refusing unsafe cleanup path: $path" >&2
      exit 1
      ;;
  esac
}

path_size() {
  local path="$1"
  if [[ -e "$path" ]]; then
    du -sh "$path" 2>/dev/null | awk '{ print $1 }'
  else
    printf 'missing'
  fi
}

external_cargo_target="$(resolved_cargo_target_dir)"
repo_local_build_cache="$ROOT_DIR/.build-cache"
root_target="$ROOT_DIR/target"
tauri_target="$ROOT_DIR/apps/desktop-tauri/src-tauri/target"
tauri_dist="$ROOT_DIR/apps/desktop-tauri/dist"

cleanup_labels=(
  "external cargo target"
  "repo-local build cache"
  "repo root cargo target"
  "desktop tauri cargo target"
  "desktop vite dist"
)

cleanup_paths=(
  "$external_cargo_target"
  "$repo_local_build_cache"
  "$root_target"
  "$tauri_target"
  "$tauri_dist"
)

printf 'build cache cleanup mode=%s\n' "$mode"
for i in "${!cleanup_paths[@]}"; do
  path="${cleanup_paths[$i]}"
  reject_unsafe_path "$path"
  printf '  [%s] %s (%s)\n' "${cleanup_labels[$i]}" "$path" "$(path_size "$path")"
done

if [[ "$mode" != "apply" ]]; then
  printf 'dry-run only; rerun with --apply to delete listed generated paths\n'
  exit 0
fi

for path in "${cleanup_paths[@]}"; do
  reject_unsafe_path "$path"
  rm -rf "$path"
done

printf 'removed listed generated build/cache paths\n'
