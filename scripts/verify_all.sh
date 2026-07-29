#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
MODE=focused
if [ "${1:-}" = "--release" ]; then MODE=release; elif [ "${1:-}" = "--focused" ] || [ -z "${1:-}" ]; then :; else echo "사용법: $0 [--focused|--release]" >&2; exit 2; fi
echo "[1/8] shell and JavaScript syntax"
bash -n scripts/*.sh
node --check scripts/generate_sbom.mjs
node --check scripts/release_manifest.mjs
node --check scripts/verify_docs_claims.mjs
node --check scripts/verify_product_boundary.mjs
node --check scripts/acceptance_p3.mjs
node --check scripts/verify_security_requirements.mjs
echo "[2/8] product boundary"
node scripts/verify_product_boundary.mjs
echo "[3/8] focused server tests"
node --test apps/server/server.test.mjs
echo "[4/8] focused browser runtime tests"
npm --prefix apps/web test --workspaces=false
echo "[5/8] relay restart and capability smoke"
node scripts/smoke_user_owned_servers.mjs
node scripts/acceptance_local_only.mjs
echo "[6/8] release manifest tests"
node --test scripts/release_manifest.test.mjs
echo "[7/8] public claim boundary"
node scripts/verify_docs_claims.mjs
node scripts/verify_security_requirements.mjs
echo "[8/8] production build (only when dependencies are present)"
if [ "$MODE" = release ]; then
  if [ ! -x apps/web/node_modules/.bin/vite ]; then
    echo "release gate requires installed web dependencies; production build cannot be skipped" >&2
    exit 1
  fi
  npm --prefix apps/web run build --workspaces=false
elif [ -x apps/web/node_modules/.bin/vite ]; then
  npm --prefix apps/web run build --workspaces=false
else
  echo "production build skipped: apps/web/node_modules is absent; run npm ci before release verification" >&2
fi
git diff --check
echo "verify_all passed ($MODE local gate)"
