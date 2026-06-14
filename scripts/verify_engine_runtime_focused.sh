#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=build_cache_env.sh
source "$ROOT_DIR/scripts/build_cache_env.sh"

run_step() {
  local name="$1"
  shift

  printf '\n==> %s\n' "$name"
  bash -c "$*"
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

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

run_step "engine sidecar focused build" \
  cargo build -p another-dimension-engine --features manual-e2ee-runtime

STATUS_FILE="$TEMP_DIR/engine-status.json"
MANUAL_SELF_TEST_FILE="$TEMP_DIR/engine-manual-self-test.json"

run_step "engine sidecar status output" \
  "cargo run -p another-dimension-engine --features manual-e2ee-runtime -- status > \"$STATUS_FILE\""
verify_json_output "$STATUS_FILE" status

run_step "engine manual-self-test output" \
  "cargo run -p another-dimension-engine --features manual-e2ee-runtime -- manual-self-test > \"$MANUAL_SELF_TEST_FILE\""
verify_json_output "$MANUAL_SELF_TEST_FILE" manual_self_test

if [[ "${AD_VERIFY_LEGACY_EMBEDDED_RUNTIME:-}" == "1" ]]; then
  run_step "legacy embedded runtime contract tests (opt-in)" \
    cargo test -p another-dimension-desktop-tauri --features legacy-embedded-runtime --no-default-features \
      production_two_profile_resume_reloads_status_and_transcripts_after_new_command_invocations \
      production_onion_send_attempt_result_persists_failed_and_sent_resume_state \
      production_two_profile_room_setup_accepts_invite_derived_profiles
fi

printf '\nengine runtime-focused verification passed\n'
