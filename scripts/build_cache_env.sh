#!/usr/bin/env bash

if [[ -z "${CARGO_TARGET_DIR:-}" ]]; then
  if [[ -n "${AD_BUILD_CACHE_DIR:-}" ]]; then
    export CARGO_TARGET_DIR="$AD_BUILD_CACHE_DIR/cargo-target"
  else
    ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    export CARGO_TARGET_DIR="$ROOT_DIR/.build-cache/cargo-target"
  fi
fi

mkdir -p "$CARGO_TARGET_DIR"
