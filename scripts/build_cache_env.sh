#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${CARGO_TARGET_DIR:-}" ]]; then
  CARGO_TARGET_DIR="$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-cargo-target.XXXXXX")"
  export CARGO_TARGET_DIR
  trap 'rm -rf "$CARGO_TARGET_DIR"' EXIT
fi

mkdir -p "$CARGO_TARGET_DIR"
