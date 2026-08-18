#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-2}
export CARGO_INCREMENTAL=0
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-"$ROOT_DIR/.build-cache/cargo-target"}
export AD_DAEMON_BINARY=${AD_DAEMON_BINARY:-"$CARGO_TARGET_DIR/debug/another-dimension-daemon"}

if [[ "${1:-}" != "--release" ]]; then
  cat >&2 <<'EOF'
verify_full.sh is a release-only gate and is intentionally expensive.
Use scripts/verify_light.sh for the daily loop, or run:
  scripts/verify_full.sh --release
EOF
  exit 2
fi
shift
if (($# != 0)); then
  echo "usage: scripts/verify_full.sh --release" >&2
  exit 2
fi

scripts/prepare_build_cache.sh

run_step() {
  local name="$1"
  shift
  printf '\n==> %s\n' "$name"
  "$@"
}

cd "$ROOT_DIR"
run_step "light product verification" scripts/verify_light.sh
run_step "invite and pairing vectors" node scripts/verify_invite_code.mjs
run_step "web exposure scan" node scripts/verify_web_exposure.mjs
run_step "security requirement evidence" node scripts/verify_security_requirements.mjs --private-trusted
run_step "Rust formatting" cargo fmt --all -- --check
run_step "daemon binary" cargo build -p another-dimension-daemon --locked
run_step "runtime budget acceptance" node scripts/acceptance_runtime_budget.mjs
run_step "user-owned server transport smoke" node scripts/smoke_user_owned_servers.mjs
run_step "release manifest integrity" node scripts/release_manifest.test.mjs
run_step "private release acceptance" node scripts/acceptance_private_release.mjs
run_step "relay operations acceptance" node scripts/acceptance_relay_operations.mjs
run_step "delivery consistency acceptance" node scripts/acceptance_delivery_consistency.mjs
run_step "two-daemon product journey" node scripts/acceptance_daemon_e2e.mjs
run_step "representative acceptance flow" node scripts/acceptance_representative_flow.mjs
run_step "private-trusted release readiness gate" node scripts/verify_release_readiness.mjs
run_step "daemon tests" cargo test -p another-dimension-daemon --lib
run_step "daemon library lints" cargo clippy -p another-dimension-daemon --lib -- -D warnings
scripts/prepare_build_cache.sh

printf '\nfull daemon/web/relay verification passed\n'
