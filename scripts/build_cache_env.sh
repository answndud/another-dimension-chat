#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

if [[ -z "${CARGO_TARGET_DIR:-}" ]]; then
  if [[ -n "${AD_BUILD_CACHE_DIR:-}" ]]; then
    export CARGO_TARGET_DIR="$AD_BUILD_CACHE_DIR/cargo-target"
  else
    export CARGO_TARGET_DIR="$(default_build_cache_dir)/cargo-target"
  fi
fi

mkdir -p "$CARGO_TARGET_DIR"
