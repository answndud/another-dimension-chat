#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=build_cache_env.sh
source "$ROOT_DIR/scripts/build_cache_env.sh"

run_step() {
  local name="$1"
  shift

  printf '\n==> %s\n' "$name"
  "$@"
}

cd "$ROOT_DIR"

run_step "generated artifact guard" scripts/mobile_generated_artifact_guard_once.sh
run_step "rustfmt" cargo fmt --all -- --check
for test_name in \
  production_setup_drafts_can_encrypt_and_decrypt_envelope \
  production_receive_persists_replay_after_successful_decrypt \
  production_message_retention_preference_round_trips_in_profile_store
do
  run_step "core ${test_name}" cargo test --manifest-path crates/core/Cargo.toml --lib "$test_name"
done
run_step "default build boundary checks" scripts/verify_default_boundary.sh
run_step "tauri scaffold static and UI tests" scripts/verify_tauri_scaffold.sh
run_step "tauri frontend build" npm --prefix apps/desktop-tauri run build

if [[ "${AD_VERIFY_NATIVE_SHELL:-0}" == "1" ]]; then
  run_step "tauri native shell check" npm --prefix apps/desktop-tauri run test:native-shell
else
  printf '\n==> tauri native shell check skipped (set AD_VERIFY_NATIVE_SHELL=1)\n'
fi

if [[ "${AD_VERIFY_FULL_RUNTIME:-0}" == "1" ]]; then
  for test_name in \
    production_two_profile_resume_reloads_status_and_transcripts_after_new_command_invocations \
    production_onion_send_attempt_result_persists_failed_and_sent_resume_state \
    production_two_profile_room_setup_accepts_invite_derived_profiles
  do
    run_step "tauri ${test_name}" cargo test --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml --lib "$test_name"
  done
else
  printf '\n==> tauri native/full-runtime tests skipped (set AD_VERIFY_FULL_RUNTIME=1)\n'
fi

printf '\nlight verification steps passed\n'
