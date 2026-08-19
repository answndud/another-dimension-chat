#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

case "${1:-build}" in
  build)
    [ "$#" -eq 1 ] || { echo "사용법: private_release.sh build" >&2; exit 2; }
    sh "$SCRIPT_DIR/build_release.sh"
    ;;
  verify)
    [ "$#" -ge 2 ] || { echo "사용법: private_release.sh verify ARCHIVE.tar.gz --public-key PEM" >&2; exit 2; }
    archive=$2
    shift 2
    tools=${AD_TOOLS_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/release/another-dimension-tools"}
    [ -x "$tools" ] || { CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --release --offline -p another-dimension-tools; }
    tmp=$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-release-verify.XXXXXX")
    trap 'rm -rf "$tmp"' EXIT INT TERM
    tar -xzf "$archive" -C "$tmp"
    root=$(find "$tmp" -mindepth 1 -maxdepth 1 -type d -print -quit)
    [ -n "$root" ] || { echo "release root가 없습니다." >&2; exit 1; }
    "$tools" release-manifest verify --root "$root" "$@"
    "$tools" release-manifest hygiene --root "$root"
    echo "Rust release archive verified: $archive"
    ;;
  *) echo "사용법: private_release.sh {build|verify ARCHIVE --public-key PEM}" >&2; exit 2 ;;
esac
