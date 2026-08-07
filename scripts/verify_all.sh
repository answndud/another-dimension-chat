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
node --check scripts/product_boundary.mjs
node --check scripts/preflight_local_server.mjs
node --check scripts/configure_local_server.mjs
node --check scripts/verify_install_state.mjs
node --check scripts/verify_public_release_gate.mjs
node --check scripts/product_boundary_negative.test.mjs
node --check scripts/verify_relay_logs.mjs
node --check scripts/verify_web_artifact.mjs
node --check scripts/verify_transport_boundary.mjs
node --check scripts/verify_web_artifact_fixture.mjs
node --check scripts/acceptance_p3.mjs
node --check scripts/acceptance_release_local_only.mjs
node --check scripts/verify_security_requirements.mjs
node --check scripts/prepare_security_review.mjs
node --check scripts/verify_security_review_bundle.mjs
node --check scripts/verify_release_trust.mjs
node --check scripts/verify_release_trust_receipt.mjs
node --check scripts/verify_security_review_signoff.mjs
node --check scripts/verify_security_review_handoff.mjs
node --check scripts/verify_daemon_ui_artifact.mjs
node --check scripts/acceptance_daemon_e2e.mjs
node --check scripts/acceptance_daemon_repair.mjs
node --check scripts/verify_support_matrix.mjs
node --check scripts/verify_release_support_gate.mjs
node --check scripts/acceptance_os_matrix.mjs
echo "[2/8] product boundary"
node scripts/verify_product_boundary.mjs
node scripts/product_boundary_negative.test.mjs
node scripts/verify_relay_logs.mjs
node scripts/verify_web_artifact_fixture.mjs
node scripts/verify_transport_boundary.mjs
echo "[3/8] focused server tests"
node --test apps/server/server.test.mjs
echo "[4/8] focused browser runtime tests"
npm --prefix apps/web test --workspaces=false
echo "[5/8] relay restart and capability smoke"
node scripts/smoke_user_owned_servers.mjs
node scripts/acceptance_release_local_only.mjs
echo "[6/8] release manifest tests"
node --test scripts/release_manifest.test.mjs
echo "[7/8] public claim boundary"
node scripts/verify_docs_claims.mjs
node scripts/verify_security_requirements.mjs
node scripts/verify_support_matrix.mjs
node scripts/verify_release_support_gate.mjs
node scripts/verify_release_trust.mjs --fixture
node scripts/verify_release_trust_receipt.mjs --fixture
node scripts/verify_security_review_signoff.mjs --fixture
node scripts/verify_security_review_handoff.mjs --fixture
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
