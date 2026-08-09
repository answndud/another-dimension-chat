#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly CACHE_DIR="$ROOT_DIR/.build-cache/cargo-target"
readonly DEFAULT_MAX_MB=2048
max_mb="${AD_BUILD_CACHE_MAX_MB:-$DEFAULT_MAX_MB}"

case "$max_mb" in
  ''|*[!0-9]*) echo "AD_BUILD_CACHE_MAX_MB must be an integer" >&2; exit 2 ;;
esac

if [ -d "$CACHE_DIR" ]; then
  size_mb="$(du -sm -- "$CACHE_DIR" | awk '{print $1}')"
else
  size_mb=0
fi

if [ "$size_mb" -ge "$max_mb" ]; then
  echo "Cargo cache ${size_mb}MB >= ${max_mb}MB; removing regenerable artifacts."
  "$ROOT_DIR/scripts/clean_build_artifacts.sh" --apply
fi

mkdir -p "$CACHE_DIR"
echo "Cargo cache ready: $CACHE_DIR"
