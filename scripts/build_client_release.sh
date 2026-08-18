#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
VERSION=${AD_RELEASE_VERSION:-$(node -p 'JSON.parse(require("fs").readFileSync("apps/web/package.json", "utf8")).version')}
OUTPUT_DIR=${AD_CLIENT_RELEASE_ROOT:-"$PROJECT_DIR/client-release"}
DAEMON=${AD_CLIENT_DAEMON_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/release/another-dimension-daemon"}
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-client.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT INT TERM

[ -x "$DAEMON" ] || { echo "release daemon이 없습니다. AD_CLIENT_DAEMON_BINARY를 지정하세요." >&2; exit 1; }
[ -n "${AD_RELEASE_SIGNING_KEY:-}" ] || { echo "보안 client release에는 AD_RELEASE_SIGNING_KEY가 필요합니다." >&2; exit 1; }
[ -n "${AD_RELEASE_PUBLIC_KEY:-}" ] || { echo "보안 client release에는 AD_RELEASE_PUBLIC_KEY가 필요합니다." >&2; exit 1; }
npm --prefix "$PROJECT_DIR/apps/web" run build --workspaces=false
ROOT="$STAGE/another-dimension-client-$VERSION"
mkdir -p "$ROOT/bin" "$ROOT/apps/web" "$ROOT/scripts"
cp "$DAEMON" "$ROOT/bin/another-dimension-daemon"; chmod 700 "$ROOT/bin/another-dimension-daemon"
cp -R "$PROJECT_DIR/apps/web/dist" "$ROOT/apps/web/"
cp "$PROJECT_DIR/scripts/client_launcher.sh" "$ROOT/scripts/"
cp "$PROJECT_DIR/scripts/install_client.sh" "$PROJECT_DIR/scripts/verify_release_manifest.mjs" "$PROJECT_DIR/scripts/release_manifest.mjs" "$ROOT/scripts/"
chmod 700 "$ROOT/scripts/client_launcher.sh"
chmod 700 "$ROOT/scripts/install_client.sh"
cp "$PROJECT_DIR/README.md" "$PROJECT_DIR/README.ko.md" "$PROJECT_DIR/SECURITY.md" "$ROOT/"
SOURCE_DATE_EPOCH=${AD_RELEASE_SOURCE_DATE_EPOCH:-0}
SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" node "$PROJECT_DIR/scripts/create_release_manifest.mjs" "$ROOT" --version "$VERSION" --private-key "$AD_RELEASE_SIGNING_KEY"
node "$PROJECT_DIR/scripts/verify_release_manifest.mjs" "$ROOT" --require-signature --public-key "$AD_RELEASE_PUBLIC_KEY"
node "$PROJECT_DIR/scripts/verify_archive_hygiene.mjs" "$ROOT"
size_kb=$(du -sk "$ROOT" | awk '{print $1}')
[ "$size_kb" -le 51200 ] || { echo "client archive exceeds 50MiB: ${size_kb}KiB" >&2; exit 1; }
mkdir -p "$OUTPUT_DIR"
tar --options gzip:!timestamp -czf "$OUTPUT_DIR/another-dimension-client-$VERSION.tar.gz" -C "$STAGE" "another-dimension-client-$VERSION"
printf '%s\n' "client release created: $OUTPUT_DIR/another-dimension-client-$VERSION.tar.gz (${size_kb} KiB uncompressed)"
