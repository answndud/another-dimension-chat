#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
TARGET_DIR="$PROJECT_DIR/target/wasm32-unknown-unknown/release"
OUT_DIR="$PROJECT_DIR/apps/web/src/generated"
DEFAULT_BINDGEN="$PROJECT_DIR/.build-cache/tools/wasm-bindgen-0.2.121-aarch64-apple-darwin/wasm-bindgen"
WASM_BINDGEN_BIN=${WASM_BINDGEN_BIN:-$DEFAULT_BINDGEN}

if ! rustup target list --installed | grep -qx "wasm32-unknown-unknown"; then
  echo "Missing Rust target. Run: rustup target add wasm32-unknown-unknown" >&2
  exit 1
fi

if [ ! -x "$WASM_BINDGEN_BIN" ]; then
  echo "wasm-bindgen 0.2.121 is required. Set WASM_BINDGEN_BIN to its executable." >&2
  exit 1
fi

CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2} cargo build \
  --manifest-path "$PROJECT_DIR/Cargo.toml" \
  --package another-dimension-web-crypto-wasm \
  --target wasm32-unknown-unknown \
  --release

mkdir -p "$OUT_DIR"
"$WASM_BINDGEN_BIN" \
  --target web \
  --out-dir "$OUT_DIR" \
  --out-name ad_crypto \
  "$TARGET_DIR/another_dimension_web_crypto_wasm.wasm"

printf '%s\n' "Generated browser Noise module in $OUT_DIR"
