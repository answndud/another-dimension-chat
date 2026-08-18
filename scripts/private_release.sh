#!/bin/sh
set -eu

# One small operator entrypoint for the private-trusted release path.
# It builds with build_release.sh, then verifies the actual tar archive after
# extraction using the trust material supplied outside the repository.

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
VERSION=${AD_RELEASE_VERSION:-$(node -p 'JSON.parse(require("fs").readFileSync("apps/web/package.json", "utf8")).version')}
RELEASE_ROOT=${AD_RELEASE_ROOT:-"$PROJECT_DIR/public-release"}

usage() {
  cat >&2 <<'EOF'
사용법:
  AD_RELEASE_PROFILE=private \
  AD_RELEASE_SIGNING_KEY=/secure/release-private.pem \
  AD_RELEASE_PUBLIC_KEY=/secure/release-public.pem \
  AD_RELEASE_TRUST_MANIFEST=/secure/release-trust.json \
  AD_RELEASE_TRUST_MANIFEST_KEY=/secure/bootstrap-public.pem \
  AD_DAEMON_BINARY=/secure/another-dimension-daemon \
  AD_NODE_RUNTIME=/secure/node \
  scripts/private_release.sh build

  scripts/private_release.sh verify ARCHIVE.tar.gz \
    --public-key /secure/release-public.pem \
    --trust-manifest /secure/release-trust.json \
    --trust-manifest-key /secure/bootstrap-public.pem
EOF
  exit 2
}

archive_hash() {
  node -e 'const fs=require("node:fs"); const crypto=require("node:crypto"); const path=process.argv[1]; console.log(crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex"));' "$1"
}

verify_archive() {
  archive=$1
  public_key=
  trust_manifest=
  trust_manifest_key=
  shift
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --public-key) [ "$#" -ge 2 ] || usage; public_key=$2; shift 2 ;;
      --trust-manifest) [ "$#" -ge 2 ] || usage; trust_manifest=$2; shift 2 ;;
      --trust-manifest-key) [ "$#" -ge 2 ] || usage; trust_manifest_key=$2; shift 2 ;;
      *) echo "알 수 없는 옵션: $1" >&2; usage ;;
    esac
  done
  [ -f "$archive" ] || { echo "archive가 없습니다: $archive" >&2; exit 1; }
  [ -f "$public_key" ] || { echo "외부 release public key가 필요합니다." >&2; exit 1; }
  [ -f "$trust_manifest" ] || { echo "외부 trust manifest가 필요합니다." >&2; exit 1; }
  [ -f "$trust_manifest_key" ] || { echo "외부 trust bootstrap public key가 필요합니다." >&2; exit 1; }

  tmp=$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-private-verify.XXXXXX")
  trap 'rm -rf "$tmp"' EXIT INT TERM
  tar -xzf "$archive" -C "$tmp"
  release_dir=$(find "$tmp" -mindepth 1 -maxdepth 1 -type d -print -quit)
  [ -n "$release_dir" ] || { echo "archive root directory가 없습니다." >&2; exit 1; }
  [ "$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" = 1 ] || { echo "archive root directory가 하나가 아닙니다." >&2; exit 1; }
  node "$PROJECT_DIR/scripts/verify_archive_hygiene.mjs" "$release_dir"
  node "$PROJECT_DIR/scripts/verify_release_support_gate.mjs" --root "$release_dir"
  node "$PROJECT_DIR/scripts/verify_release_manifest.mjs" "$release_dir" --require-signature --public-key "$public_key"
  node "$PROJECT_DIR/scripts/verify_private_release_gate.mjs" "$release_dir" --public-key "$public_key" --trust-manifest "$trust_manifest" --trust-manifest-key "$trust_manifest_key"
  echo "private release archive verified: $archive"
  echo "archive sha256: $(archive_hash "$archive")"
}

[ "$#" -ge 1 ] || usage
case "$1" in
  build)
    [ "$#" -eq 1 ] || usage
    [ "${AD_RELEASE_PROFILE:-}" = private ] || { echo "AD_RELEASE_PROFILE=private가 필요합니다." >&2; exit 1; }
    [ -n "${AD_RELEASE_SIGNING_KEY:-}" ] || { echo "AD_RELEASE_SIGNING_KEY가 필요합니다." >&2; exit 1; }
    [ -n "${AD_RELEASE_PUBLIC_KEY:-}" ] || { echo "AD_RELEASE_PUBLIC_KEY가 필요합니다." >&2; exit 1; }
    [ -n "${AD_RELEASE_TRUST_MANIFEST:-}" ] || { echo "AD_RELEASE_TRUST_MANIFEST가 필요합니다." >&2; exit 1; }
    [ -n "${AD_RELEASE_TRUST_MANIFEST_KEY:-}" ] || { echo "AD_RELEASE_TRUST_MANIFEST_KEY가 필요합니다." >&2; exit 1; }
    sh "$SCRIPT_DIR/build_release.sh"
    verify_archive "$RELEASE_ROOT/another-dimension-$VERSION.tar.gz" \
      --public-key "$AD_RELEASE_PUBLIC_KEY" \
      --trust-manifest "$AD_RELEASE_TRUST_MANIFEST" \
      --trust-manifest-key "$AD_RELEASE_TRUST_MANIFEST_KEY" ;;
  verify)
    [ "$#" -ge 2 ] || usage
    archive=$2
    shift 2
    verify_archive "$archive" "$@" ;;
  *) usage ;;
esac
