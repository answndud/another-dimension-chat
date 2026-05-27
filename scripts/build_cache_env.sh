#!/usr/bin/env bash

if [[ -z "${CARGO_TARGET_DIR:-}" ]]; then
  if [[ -n "${AD_BUILD_CACHE_DIR:-}" ]]; then
    export CARGO_TARGET_DIR="$AD_BUILD_CACHE_DIR/cargo-target"
  else
    export CARGO_TARGET_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/another-dimension-chat/cargo-target"
  fi
fi

mkdir -p "$CARGO_TARGET_DIR"
