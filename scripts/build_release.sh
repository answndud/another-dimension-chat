#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
VERSION=${AD_RELEASE_VERSION:-$(node -p 'JSON.parse(require("fs").readFileSync("apps/web/package.json", "utf8")).version')}
RELEASE_ROOT="$PROJECT_DIR/public-release"
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-release.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT INT TERM

node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 20) { console.error(`Node.js 20 or newer is required (found ${process.version}).`); process.exit(1); }'
if [ ! -f "$PROJECT_DIR/apps/web/src/generated/ad_crypto_bg.wasm" ]; then
  printf '%s\n' "Missing browser cryptography module. Run: npm --prefix apps/web run build:crypto --workspaces=false" >&2
  exit 1
fi
npm --prefix "$PROJECT_DIR/apps/web" run build --workspaces=false

mkdir -p "$STAGE/another-dimension-$VERSION/apps/server" "$STAGE/another-dimension-$VERSION/apps/web" "$STAGE/another-dimension-$VERSION/scripts"
cp "$PROJECT_DIR/apps/server/server.mjs" "$PROJECT_DIR/apps/server/package.json" "$PROJECT_DIR/apps/server/README.md" "$STAGE/another-dimension-$VERSION/apps/server/"
cp -R "$PROJECT_DIR/apps/web/dist" "$STAGE/another-dimension-$VERSION/apps/web/"
cp "$PROJECT_DIR/apps/web/package.json" "$PROJECT_DIR/apps/web/package-lock.json" "$STAGE/another-dimension-$VERSION/apps/web/"
cp "$PROJECT_DIR/scripts/start_local_server.sh" "$PROJECT_DIR/scripts/configure_local_server.mjs" "$PROJECT_DIR/scripts/generate_tls_cert.sh" "$PROJECT_DIR/scripts/check_https_endpoint.mjs" "$PROJECT_DIR/scripts/release_manifest.mjs" "$PROJECT_DIR/scripts/verify_release_manifest.mjs" "$STAGE/another-dimension-$VERSION/scripts/"
cp "$PROJECT_DIR/README.md" "$PROJECT_DIR/README.ko.md" "$PROJECT_DIR/SECURITY.md" "$PROJECT_DIR/SUPPORT.md" "$STAGE/another-dimension-$VERSION/"
node "$PROJECT_DIR/scripts/generate_sbom.mjs" "$STAGE/another-dimension-$VERSION/apps/web/package-lock.json" "$STAGE/another-dimension-$VERSION/SBOM.cyclonedx.json"
chmod +x "$STAGE/another-dimension-$VERSION/scripts/start_local_server.sh" "$STAGE/another-dimension-$VERSION/scripts/configure_local_server.mjs" "$STAGE/another-dimension-$VERSION/scripts/generate_tls_cert.sh"

MANIFEST_ARGS="--version $VERSION"
VERIFY_ARGS=""
if [ -n "${AD_RELEASE_SIGNING_KEY:-}" ]; then
  MANIFEST_ARGS="$MANIFEST_ARGS --private-key $AD_RELEASE_SIGNING_KEY"
elif [ "${AD_RELEASE_REQUIRE_SIGNATURE:-0}" = "1" ]; then
  printf '%s\n' "AD_RELEASE_REQUIRE_SIGNATURE=1 requires AD_RELEASE_SIGNING_KEY to point to an Ed25519 PEM private key." >&2
  exit 1
fi
if [ "${AD_RELEASE_REQUIRE_SIGNATURE:-0}" = "1" ]; then VERIFY_ARGS="--require-signature"; fi
if [ -n "${AD_RELEASE_MIN_VERSION:-}" ]; then VERIFY_ARGS="$VERIFY_ARGS --min-version $AD_RELEASE_MIN_VERSION"; fi
# shellcheck disable=SC2086
SOURCE_DATE_EPOCH="${AD_RELEASE_SOURCE_DATE_EPOCH:-0}" node "$PROJECT_DIR/scripts/create_release_manifest.mjs" "$STAGE/another-dimension-$VERSION" $MANIFEST_ARGS
# Unsigned output is allowed only for local development; verified distribution requires a signature.
# shellcheck disable=SC2086
node "$PROJECT_DIR/scripts/verify_release_manifest.mjs" "$STAGE/another-dimension-$VERSION" $VERIFY_ARGS

mkdir -p "$RELEASE_ROOT"
tar -czf "$RELEASE_ROOT/another-dimension-$VERSION.tar.gz" -C "$STAGE" "another-dimension-$VERSION"
printf '%s\n' "Created $RELEASE_ROOT/another-dimension-$VERSION.tar.gz"
