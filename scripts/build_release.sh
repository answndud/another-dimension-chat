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
cp "$PROJECT_DIR/scripts/start_local_server.sh" "$PROJECT_DIR/scripts/install_local_server.sh" "$PROJECT_DIR/scripts/configure_local_server.mjs" "$PROJECT_DIR/scripts/preflight_local_server.mjs" "$PROJECT_DIR/scripts/generate_tls_cert.sh" "$PROJECT_DIR/scripts/check_https_endpoint.mjs" "$PROJECT_DIR/scripts/release_manifest.mjs" "$PROJECT_DIR/scripts/product_boundary.mjs" "$PROJECT_DIR/scripts/verify_release_manifest.mjs" "$PROJECT_DIR/scripts/verify_public_release_gate.mjs" "$STAGE/another-dimension-$VERSION/scripts/"
cp "$PROJECT_DIR/README.md" "$PROJECT_DIR/README.ko.md" "$PROJECT_DIR/SECURITY.md" "$PROJECT_DIR/SUPPORT.md" "$STAGE/another-dimension-$VERSION/"
mkdir -p "$STAGE/another-dimension-$VERSION/reference"
cp "$PROJECT_DIR/reference/PRODUCT_BOUNDARY.md" "$PROJECT_DIR/reference/product_boundary.json" "$STAGE/another-dimension-$VERSION/reference/"
cp "$PROJECT_DIR/Cargo.lock" "$STAGE/another-dimension-$VERSION/Cargo.lock"
if [ -n "${AD_NODE_RUNTIME:-}" ]; then
  if [ ! -x "$AD_NODE_RUNTIME" ]; then
    printf '%s\n' "AD_NODE_RUNTIME must point to an executable Node.js 20+ runtime." >&2
    exit 1
  fi
  mkdir -p "$STAGE/another-dimension-$VERSION/runtime"
  cp "$AD_NODE_RUNTIME" "$STAGE/another-dimension-$VERSION/runtime/node"
  chmod 700 "$STAGE/another-dimension-$VERSION/runtime/node"
elif [ "${AD_RELEASE_PROFILE:-development}" = "public" ]; then
  printf '%s\n' "Public release requires AD_NODE_RUNTIME so users do not need Node/npm." >&2
  exit 1
fi
SOURCE_COMMIT=${AD_RELEASE_SOURCE_COMMIT:-$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || printf '%s' unknown)}
node -e 'const fs=require("fs"); const [file, version, commit, epoch] = process.argv.slice(1); fs.writeFileSync(file, JSON.stringify({format:"another-dimension-release-provenance", version, sourceCommit:commit, node:process.version, sourceDateEpoch:Number(epoch)}, null, 2)+"\n")' "$STAGE/another-dimension-$VERSION/RELEASE-PROVENANCE.json" "$VERSION" "$SOURCE_COMMIT" "${AD_RELEASE_SOURCE_DATE_EPOCH:-0}"
node "$PROJECT_DIR/scripts/generate_sbom.mjs" "$STAGE/another-dimension-$VERSION/apps/web/package-lock.json" "$STAGE/another-dimension-$VERSION/SBOM.cyclonedx.json" --cargo-lock "$PROJECT_DIR/Cargo.lock" --node-version "$(node --version)"
node "$PROJECT_DIR/scripts/verify_product_boundary.mjs" "$STAGE/another-dimension-$VERSION" --release
chmod +x "$STAGE/another-dimension-$VERSION/scripts/start_local_server.sh" "$STAGE/another-dimension-$VERSION/scripts/install_local_server.sh" "$STAGE/another-dimension-$VERSION/scripts/configure_local_server.mjs" "$STAGE/another-dimension-$VERSION/scripts/generate_tls_cert.sh"

MANIFEST_ARGS="--version $VERSION"
VERIFY_ARGS=""
if [ "${AD_RELEASE_PROFILE:-development}" = "public" ]; then AD_RELEASE_REQUIRE_SIGNATURE=1; fi
if [ "${AD_RELEASE_PROFILE:-development}" = "public" ] && [ -z "${AD_RELEASE_PUBLIC_KEY:-}" ]; then
  printf '%s\n' "AD_RELEASE_PROFILE=public requires AD_RELEASE_PUBLIC_KEY for the post-signature public gate." >&2
  exit 1
fi
if [ -n "${AD_RELEASE_SIGNING_KEY:-}" ]; then
  MANIFEST_ARGS="$MANIFEST_ARGS --private-key $AD_RELEASE_SIGNING_KEY"
elif [ "${AD_RELEASE_REQUIRE_SIGNATURE:-0}" = "1" ]; then
  printf '%s\n' "AD_RELEASE_REQUIRE_SIGNATURE=1 requires AD_RELEASE_SIGNING_KEY to point to an Ed25519 PEM private key." >&2
  exit 1
fi
if [ "${AD_RELEASE_REQUIRE_SIGNATURE:-0}" = "1" ]; then VERIFY_ARGS="--require-signature"; fi
if [ -n "${AD_RELEASE_MIN_VERSION:-}" ]; then VERIFY_ARGS="$VERIFY_ARGS --min-version $AD_RELEASE_MIN_VERSION"; fi
if [ -n "${AD_RELEASE_REVOKED_KEY_IDS:-}" ]; then
  OLD_IFS=$IFS
  IFS=,
  for REVOKED_KEY_ID in $AD_RELEASE_REVOKED_KEY_IDS; do VERIFY_ARGS="$VERIFY_ARGS --revoked-key-id $REVOKED_KEY_ID"; done
  IFS=$OLD_IFS
fi
# shellcheck disable=SC2086
SOURCE_DATE_EPOCH="${AD_RELEASE_SOURCE_DATE_EPOCH:-0}" node "$PROJECT_DIR/scripts/create_release_manifest.mjs" "$STAGE/another-dimension-$VERSION" $MANIFEST_ARGS
# Unsigned output is allowed only for local development; verified distribution requires a signature.
# shellcheck disable=SC2086
node "$PROJECT_DIR/scripts/verify_release_manifest.mjs" "$STAGE/another-dimension-$VERSION" $VERIFY_ARGS
if [ "${AD_RELEASE_PROFILE:-development}" = "public" ]; then
  PUBLIC_GATE_ARGS="--public-key $AD_RELEASE_PUBLIC_KEY"
  [ -n "${AD_RELEASE_MIN_VERSION:-}" ] && PUBLIC_GATE_ARGS="$PUBLIC_GATE_ARGS --min-version $AD_RELEASE_MIN_VERSION"
  # shellcheck disable=SC2086
  node "$PROJECT_DIR/scripts/verify_public_release_gate.mjs" "$STAGE/another-dimension-$VERSION" $PUBLIC_GATE_ARGS
fi

mkdir -p "$RELEASE_ROOT"
RELEASE_MTIME=$(date -r "${AD_RELEASE_SOURCE_DATE_EPOCH:-0}" '+%Y%m%d%H%M.%S')
find "$STAGE/another-dimension-$VERSION" -exec touch -t "$RELEASE_MTIME" {} +
tar --options gzip:!timestamp -czf "$RELEASE_ROOT/another-dimension-$VERSION.tar.gz" -C "$STAGE" "another-dimension-$VERSION"
printf '%s\n' "Created $RELEASE_ROOT/another-dimension-$VERSION.tar.gz"
