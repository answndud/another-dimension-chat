#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
echo "[1/7] shell and JavaScript syntax"
bash -n scripts/*.sh
node --check scripts/generate_sbom.mjs
node --check scripts/release_manifest.mjs
node --check scripts/verify_docs_claims.mjs
echo "[2/7] focused server tests"
node --test apps/server/server.test.mjs
echo "[3/7] focused browser runtime tests"
npm --prefix apps/web test --workspaces=false
echo "[4/7] relay restart and capability smoke"
node scripts/smoke_user_owned_servers.mjs
echo "[5/7] release manifest tests"
node --test scripts/release_manifest.test.mjs
echo "[6/7] public claim boundary"
node scripts/verify_docs_claims.mjs
echo "[7/7] production build (only when dependencies are present)"
if [ -x apps/web/node_modules/.bin/vite ]; then
  npm --prefix apps/web run build --workspaces=false
else
  echo "production build skipped: apps/web/node_modules is absent; run npm ci before release verification" >&2
fi
git diff --check
echo "verify_all passed (focused local gate)"
