#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CARGO_TARGET_DIR="$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-cargo-target.XXXXXX")"

trap 'rm -rf "$CARGO_TARGET_DIR"' EXIT
mkdir -p "$CARGO_TARGET_DIR"
export CARGO_TARGET_DIR

run_step() {
  local name="$1"
  shift

  printf '\n==> %s\n' "$name"
  "$@"
}

verify_json_output() {
  local file="$1"
  local mode="$2"

  node --input-type=module - "$file" "$mode" <<'NODE'
import fs from "node:fs";

const file = process.argv[2];
const mode = process.argv[3];

const output = fs.readFileSync(file, "utf8");
const data = JSON.parse(output);

function assert(condition, message) {
  if (!condition) {
    console.error(`error=engine-runtime-focused-verifier-${mode} ${message}`);
    process.exit(1);
  }
}

if (mode === "status") {
  assert(typeof data === "object" && data !== null, "status payload is not object");
  assert(data.runtime_mode === "manual-e2ee-engine-sidecar", "unexpected runtime mode");
  assert(Array.isArray(data.supported_commands), "supported_commands missing");
  assert(data.supported_commands.includes("status"), "missing status command");
  assert(data.supported_commands.includes("manual-self-test"), "missing manual-self-test command");
  assert(data.manual_e2ee_runtime_available === true, "manual E2EE runtime should be true");
  assert(data.onion_runtime_compiled === false, "onion runtime must remain false");
  assert(data.raw_local_path_returned === false, "raw local path must stay false");
  assert(data.key_material_exposed === false, "key material must stay false");
  assert(data.passphrase_exposed === false, "passphrase must stay false");
  assert(data.runtime_result_external_peer_evidence_separated === true, "runtime_result_external_peer_evidence_separated must be true");
  assert(data.production_ready_claim === false, "production claim must stay false");
  assert(data.high_risk_claim === false, "high risk claim must stay false");
  assert(data.sensitive_communication_allowed === false, "sensitive communication flag must stay false");
  console.log("engine_runtime_focused_status_verified=true");
}

if (mode === "manual_self_test") {
  assert(typeof data === "object" && data !== null, "manual-self-test payload is not object");
  assert(data.runtime_mode === "manual-e2ee-engine-sidecar", "unexpected runtime mode");
  assert(data.manual_e2ee_runtime_available === true, "manual E2EE runtime should be true");
  assert(data.storage_runtime_compiled === false, "storage runtime should remain contract/runtime boundary for manual runtime");
  assert(data.onion_runtime_compiled === false, "onion runtime must remain false");
  assert(data.plaintext_returned === false, "plaintext must remain false");
  assert(data.ciphertext_returned === false, "ciphertext must remain false");
  assert(data.invite_code_returned === false, "invite code must remain false");
  assert(data.endpoint_returned === false, "endpoint must remain false");
  assert(data.key_material_exposed === false, "key material must stay false");
  assert(data.passphrase_exposed === false, "passphrase must stay false");
  assert(data.noise_handshake_roundtrip === true, "noise handshake smoke test must pass");
  assert(data.envelope_roundtrip === true, "envelope roundtrip must pass");
  assert(data.pairing_payload_roundtrip === true, "pairing payload roundtrip must pass");
  assert(data.replay_duplicate_rejected === true, "replay duplicate rejection must pass");
  assert(data.safety_transcript_bound === true, "safety transcript binding must be true");
  console.log("engine_runtime_focused_manual_self_test_verified=true");
}
NODE
}

run_default_build_boundary_verification() {
  if grep -R -n -E '^default[[:space:]]*=.*dev-insecure' \
    "$ROOT_DIR/Cargo.toml" \
    "$ROOT_DIR/apps/cli/Cargo.toml" \
    "$ROOT_DIR/crates"/*/Cargo.toml >/dev/null; then
    echo "default features must not enable dev-insecure" >&2
    exit 1
  fi

  grep -q 'prototype profile/pairing/message commands require --features dev-insecure' \
    "$ROOT_DIR/apps/cli/src/main.rs"
  grep -q 'default build exposes only boundary commands' \
    "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
  grep -q 'performs no network I/O and opens no local storage' \
    "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
  grep -q 'default_build_rejects_production_skeleton_commands' \
    "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
  grep -q 'default_build_rejects_production_unlock_with_redacted_error' \
    "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
  grep -q 'default_build_prints_read_only_production_preflight_without_secrets' \
    "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
  grep -q 'production preflight is read-only' "$ROOT_DIR/apps/cli/src/main.rs"
  grep -q 'storage", "unlock"' "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
  grep -q 'transport", "send"' "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"
  grep -q 'message", "send"' "$ROOT_DIR/apps/cli/tests/cli_hardening.rs"

  cargo test -p another-dimension --test cli_hardening default_build
}

run_engine_runtime_focused_verification() {
  local status_file="$CARGO_TARGET_DIR/engine-status.json"
  local manual_self_test_file="$CARGO_TARGET_DIR/engine-manual-self-test.json"

  cargo build -p another-dimension-engine --features manual-e2ee-runtime

  cargo run -p another-dimension-engine --features manual-e2ee-runtime -- status >"$status_file"
  verify_json_output "$status_file" status

  cargo run -p another-dimension-engine --features manual-e2ee-runtime -- manual-self-test >"$manual_self_test_file"
  verify_json_output "$manual_self_test_file" manual_self_test

  cargo test -p another-dimension-core \
    production::tests::production_two_profile_resume_reloads_status_and_transcripts_after_new_command_invocations -- --exact
  cargo test -p another-dimension-core \
    production::tests::production_onion_send_attempt_result_persists_failed_and_sent_resume_state -- --exact
  cargo test -p another-dimension-core \
    production::tests::production_two_profile_room_setup_accepts_invite_derived_profiles -- --exact
}

cd "$ROOT_DIR"

run_step "light verification" scripts/verify_light.sh
run_step "default build boundary" run_default_build_boundary_verification
run_step "rustfmt" cargo fmt --all -- --check
run_step "desktop tauri shell cargo check" cargo check --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml
run_step "engine runtime-focused verification" run_engine_runtime_focused_verification
run_step "default tests" cargo test --workspace
run_step "dev-insecure tests" cargo test --workspace --features dev-insecure
run_step "clippy" cargo clippy --workspace --all-targets --all-features

printf '\nfull verification passed\n'
