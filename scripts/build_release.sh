#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
VERSION=${AD_RELEASE_VERSION:-0.1.0}
RELEASE_ROOT=${AD_RELEASE_ROOT:-"$PROJECT_DIR/public-release"}
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-release.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT INT TERM
DAEMON=${AD_DAEMON_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/release/another-dimension-daemon"}
RELAY=${AD_RELAY_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/release/another-dimension-relay"}
TOOLS=${AD_TOOLS_BINARY:-"$PROJECT_DIR/.build-cache/cargo-target/release/another-dimension-tools"}
[ -n "${AD_RELEASE_SIGNING_KEY:-}" ] || { echo "AD_RELEASE_SIGNING_KEY가 필요합니다." >&2; exit 1; }
[ "${AD_REQUIRE_MACOS_SIGNING:-0}" != "1" ] || [ -n "${AD_MACOS_SIGNING_IDENTITY:-}" ] || {
  echo "AD_REQUIRE_MACOS_SIGNING=1인데 AD_MACOS_SIGNING_IDENTITY가 없습니다." >&2
  exit 1
}
[ "${AD_REQUIRE_MACOS_NOTARIZED:-0}" != "1" ] || [ -n "${AD_MACOS_SIGNING_IDENTITY:-}" ] || {
  echo "AD_REQUIRE_MACOS_NOTARIZED=1인데 AD_MACOS_SIGNING_IDENTITY가 없습니다." >&2
  exit 1
}
[ -x "$DAEMON" ] || { CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --release --offline -p another-dimension-daemon; }
[ -x "$RELAY" ] || { CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --release --offline -p another-dimension-relay; }
[ -x "$TOOLS" ] || { CARGO_BUILD_JOBS=2 CARGO_INCREMENTAL=0 cargo build --release --offline -p another-dimension-tools; }
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

# Finder entrypoint. Resources are copied into the app so the user-facing
# package does not depend on the repository or a developer runtime.
APP="$ROOT/Another Dimension.app"
RESOURCES="$APP/Contents/Resources"
mkdir -p "$APP/Contents/MacOS" "$RESOURCES/bin" "$RESOURCES/apps/web" "$RESOURCES/scripts"
cp "$PROJECT_DIR/scripts/macos_app_launcher.sh" "$APP/Contents/MacOS/Another Dimension"
chmod 700 "$APP/Contents/MacOS/Another Dimension"
cp "$ROOT/bin/another-dimension-daemon" "$ROOT/bin/another-dimension-relay" "$ROOT/bin/another-dimension-tools" "$RESOURCES/bin/"
cp -R "$ROOT/apps/web/dist" "$RESOURCES/apps/web/"
cp "$ROOT/scripts/installed_launcher.sh" "$RESOURCES/scripts/"
cp "$ROOT/README.md" "$ROOT/README.ko.md" "$ROOT/SECURITY.md" "$RESOURCES/"
cp "$ROOT/scripts/installed_launcher.sh" "$RESOURCES/another-dimension"
chmod 700 "$RESOURCES/another-dimension" "$RESOURCES/scripts/installed_launcher.sh"
cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleDisplayName</key><string>Another Dimension</string>
<key>CFBundleExecutable</key><string>Another Dimension</string>
<key>CFBundleIdentifier</key><string>chat.another-dimension.local</string>
<key>CFBundleName</key><string>Another Dimension</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>$VERSION</string>
<key>CFBundleVersion</key><string>$VERSION</string>
<key>LSMinimumSystemVersion</key><string>12.0</string>
</dict></plist>
EOF
chmod 700 "$APP" "$APP/Contents" "$APP/Contents/MacOS" "$APP/Contents/Resources" "$RESOURCES/bin" "$RESOURCES/apps" "$RESOURCES/apps/web" "$RESOURCES/scripts"
chmod 600 "$APP/Contents/Info.plist" "$RESOURCES/README.md" "$RESOURCES/README.ko.md" "$RESOURCES/SECURITY.md"

if [ -n "${AD_MACOS_SIGNING_IDENTITY:-}" ]; then
  command -v codesign >/dev/null 2>&1 || {
    echo "AD_MACOS_SIGNING_IDENTITY가 설정됐지만 codesign을 찾을 수 없습니다." >&2
    exit 1
  }
  codesign --force --deep --options runtime --sign "$AD_MACOS_SIGNING_IDENTITY" "$APP" >/dev/null
  codesign --verify --deep --strict "$APP" >/dev/null
  echo "macOS app signed and verified: $AD_MACOS_SIGNING_IDENTITY"
elif [ "${AD_REQUIRE_MACOS_SIGNING:-0}" = "1" ]; then
  echo "AD_REQUIRE_MACOS_SIGNING=1인데 AD_MACOS_SIGNING_IDENTITY가 없습니다." >&2
  exit 1
else
  echo "macOS app is unsigned; set AD_MACOS_SIGNING_IDENTITY for a signed release."
fi

if [ "${AD_REQUIRE_MACOS_NOTARIZED:-0}" = "1" ]; then
  "$PROJECT_DIR/scripts/verify_macos_app.sh" "$APP" --require-notarized
elif [ -n "${AD_MACOS_SIGNING_IDENTITY:-}" ]; then
  "$PROJECT_DIR/scripts/verify_macos_app.sh" "$APP" --require-signed
else
  "$PROJECT_DIR/scripts/verify_macos_app.sh" "$APP"
fi

SOURCE_COMMIT=$(git -C "$PROJECT_DIR" rev-parse HEAD); SOURCE_DATE_EPOCH=${AD_RELEASE_SOURCE_DATE_EPOCH:-0}
printf '{\n  "format": "another-dimension-release-provenance",\n  "version": "%s",\n  "sourceCommit": "%s",\n  "sourceDateEpoch": %s\n}\n' "$VERSION" "$SOURCE_COMMIT" "$SOURCE_DATE_EPOCH" > "$ROOT/RELEASE-PROVENANCE.json"
"$TOOLS" release-manifest create --root "$ROOT" --version "$VERSION" --private-key "$AD_RELEASE_SIGNING_KEY"
[ -n "${AD_RELEASE_PUBLIC_KEY:-}" ] && "$TOOLS" release-manifest verify --root "$ROOT" --public-key "$AD_RELEASE_PUBLIC_KEY"
"$TOOLS" release-manifest hygiene --root "$ROOT"
size_kb=$(du -sk "$ROOT" | awk '{print $1}'); [ "$size_kb" -le 51200 ] || { echo "release archive exceeds 50MiB" >&2; exit 1; }
mkdir -p "$RELEASE_ROOT"
tar --options gzip:!timestamp -czf "$RELEASE_ROOT/another-dimension-$VERSION.tar.gz" -C "$STAGE" "another-dimension-$VERSION"
printf '%s\n' "Rust release created: $RELEASE_ROOT/another-dimension-$VERSION.tar.gz (${size_kb} KiB uncompressed)"
