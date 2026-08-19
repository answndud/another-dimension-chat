#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
VERSION=${AD_RELEASE_VERSION:-0.1.0}
RELEASE_ROOT=${AD_RELEASE_ROOT:-"$PROJECT_DIR/public-release"}
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-release.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT INT TERM
DAEMON=${AD_DAEMON_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/release/another-dimension-daemon"}
RELAY=${AD_RELAY_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/release/another-dimension-relay"}
TOOLS=${AD_TOOLS_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/debug/another-dimension-tools"}
[ -n "${AD_RELEASE_SIGNING_KEY:-}" ] || { echo "AD_RELEASE_SIGNING_KEY가 필요합니다." >&2; exit 1; }
[ -x "$DAEMON" ] || { CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --release --offline -p another-dimension-daemon; }
[ -x "$RELAY" ] || { CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --release --offline -p another-dimension-relay; }
[ -x "$TOOLS" ] || { CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --offline -p another-dimension-tools; }
AD_WEB_DIST="$PROJECT_DIR/apps/web/dist" "$PROJECT_DIR/scripts/build_web_static.sh"
ROOT="$STAGE/another-dimension-$VERSION"
mkdir -p "$ROOT/bin" "$ROOT/apps/web" "$ROOT/scripts"
cp "$DAEMON" "$ROOT/bin/another-dimension-daemon"
cp "$RELAY" "$ROOT/bin/another-dimension-relay"
cp "$TOOLS" "$ROOT/bin/another-dimension-tools"
chmod 700 "$ROOT/bin/another-dimension-daemon" "$ROOT/bin/another-dimension-relay" "$ROOT/bin/another-dimension-tools"
cp -R "$PROJECT_DIR/apps/web/dist" "$ROOT/apps/web/"
cp "$PROJECT_DIR/scripts/start_local_server.sh" "$PROJECT_DIR/scripts/install_local_server.sh" "$PROJECT_DIR/scripts/installed_launcher.sh" "$ROOT/scripts/"
chmod 700 "$ROOT/scripts/"*.sh
cp "$PROJECT_DIR/README.md" "$PROJECT_DIR/README.ko.md" "$PROJECT_DIR/SECURITY.md" "$ROOT/"
SOURCE_COMMIT=$(git -C "$PROJECT_DIR" rev-parse HEAD); SOURCE_DATE_EPOCH=${AD_RELEASE_SOURCE_DATE_EPOCH:-0}
printf '{\n  "format": "another-dimension-release-provenance",\n  "version": "%s",\n  "sourceCommit": "%s",\n  "sourceDateEpoch": %s\n}\n' "$VERSION" "$SOURCE_COMMIT" "$SOURCE_DATE_EPOCH" > "$ROOT/RELEASE-PROVENANCE.json"
"$TOOLS" release-manifest create --root "$ROOT" --version "$VERSION" --private-key "$AD_RELEASE_SIGNING_KEY"
[ -n "${AD_RELEASE_PUBLIC_KEY:-}" ] && "$TOOLS" release-manifest verify --root "$ROOT" --public-key "$AD_RELEASE_PUBLIC_KEY"
"$TOOLS" release-manifest hygiene --root "$ROOT"
size_kb=$(du -sk "$ROOT" | awk '{print $1}'); [ "$size_kb" -le 51200 ] || { echo "release archive exceeds 50MiB" >&2; exit 1; }
mkdir -p "$RELEASE_ROOT"
tar --options gzip:!timestamp -czf "$RELEASE_ROOT/another-dimension-$VERSION.tar.gz" -C "$STAGE" "another-dimension-$VERSION"
printf '%s\n' "Rust release created: $RELEASE_ROOT/another-dimension-$VERSION.tar.gz (${size_kb} KiB uncompressed)"
