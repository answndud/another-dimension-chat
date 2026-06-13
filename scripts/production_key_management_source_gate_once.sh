#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden production key-management source-gate pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
KEY_DOC="reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md"
RB2_DOC="reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md"
STORAGE_DECISION="reference/STORAGE_DECISION.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
GAP_REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
REVIEW_PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
CLAIM_GATE="reference/PRODUCTION_READINESS_CLAIM_GATE.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
STORAGE="crates/storage/src/lib.rs"
CORE="crates/core/src/lib.rs"
TAURI_LIB="apps/desktop-tauri/src-tauri/src/lib.rs"

for file in "$DOC" "$KEY_DOC" "$RB2_DOC" "$STORAGE_DECISION" "$MATRIX" \
  "$GAP_REGISTER" "$REVIEW_PACKET" "$CLAIM_GATE" "$STABLE_GATE" "$STORAGE" \
  "$CORE" "$TAURI_LIB" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing D100-2 production key-management source gate input: $file"
done

for file in "$KEY_DOC" "$RB2_DOC" "$MATRIX" "$GAP_REGISTER" "$REVIEW_PACKET" \
  "$CLAIM_GATE" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_contain "$file" "PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
done

for flag in \
  "production_key_management_source_gate_reviewed=true" \
  "c100_3_key_management_blocker_closed=true" \
  "key_management_policy_waiver_authorized=true" \
  "key_management_waiver_scope=active-queue-unblock-only" \
  "app_key_wrapping_required_for_key_management_claims=true" \
  "rollback_prevention_external_monotonic_state_required_for_claims=true" \
  "secure_deletion_evidence_required_for_claims=true" \
  "production_key_management_source_ready=true" \
  "d100_2_key_management_source_gate_reviewed=true" \
  "key_management_source_scope=passphrase-first-sqlcipher-local-profile-store-marker-rollback-local-delete-only" \
  "passphrase_first_unlock_required=true" \
  "sqlcipher_adrec1_local_store_ready=true" \
  "sqlcipher_passphrase_kdf_scope_ready=true" \
  "project_owned_argon2_scrypt_kdf_ready=false" \
  "os_keystore_only_rejected=true" \
  "encrypted_profile_session_message_store_ready=true" \
  "forward_only_schema_version_ready=true" \
  "sqlcipher_passphrase_rekey_source_ready=true" \
  "tauri_profile_passphrase_rekey_command_ready=true" \
  "prototype_data_migration_ready=false" \
  "app_key_wrapping_ready=false" \
  "key_rotation_ready=false" \
  "supported_rollback_detection_ready=true" \
  "rollback_detection_marker_only=true" \
  "rollback_prevention_claimed=false" \
  "supported_local_deletion_scope_ready=true" \
  "secure_deletion_claim_allowed=false" \
  "secure_media_deletion_claimed=false" \
  "backup_exclusion_best_effort_only=true" \
  "backup_recovery_claimed=false" \
  "cloud_backup_sync_enabled=false" \
  "production_key_management_ready=false" \
  "security_ready_claimed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$KEY_DOC" "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
must_contain "$KEY_DOC" "c100_3_key_management_blocker_closed=true"
must_contain "$KEY_DOC" "key_management_policy_waiver_authorized=true"
must_contain "$KEY_DOC" "rollback_prevention_external_monotonic_state_required_for_claims=true"
must_contain "$KEY_DOC" "secure_deletion_evidence_required_for_claims=true"
must_contain "$KEY_DOC" "production_key_management_source_gate_reviewed=true"
must_contain "$KEY_DOC" "production_key_management_source_ready=true"
must_contain "$KEY_DOC" "sqlcipher_passphrase_rekey_source_ready=true"
must_contain "$KEY_DOC" "tauri_profile_passphrase_rekey_command_ready=true"
must_contain "$RB2_DOC" "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
must_contain "$RB2_DOC" "c100_3_key_management_blocker_closed=true"
must_contain "$RB2_DOC" "key_management_policy_waiver_authorized=true"
must_contain "$RB2_DOC" "d100_2_key_management_source_gate_reviewed=true"
must_contain "$RB2_DOC" "sqlcipher_passphrase_rekey_source_ready=true"
must_contain "$RB2_DOC" "tauri_profile_passphrase_rekey_command_ready=true"
must_contain "$MATRIX" "production_key_management_source_ready=true"
must_contain "$MATRIX" "c100_3_key_management_blocker_closed=true"
must_contain "$MATRIX" "key_management_policy_waiver_authorized=true"
must_contain "$MATRIX" "rollback_prevention_external_monotonic_state_required_for_claims=true"
must_contain "$MATRIX" "secure_deletion_evidence_required_for_claims=true"
must_contain "$MATRIX" "sqlcipher_passphrase_rekey_source_ready=true"
must_contain "$MATRIX" "tauri_profile_passphrase_rekey_command_ready=true"
must_contain "$MATRIX" "production_key_management_ready=false"
must_contain "$GAP_REGISTER" "production_key_management_source_ready=true"
must_contain "$GAP_REGISTER" "c100_3_key_management_blocker_closed=true"
must_contain "$GAP_REGISTER" "key_management_policy_waiver_authorized=true"
must_contain "$GAP_REGISTER" "sqlcipher_passphrase_rekey_source_ready=true"
must_contain "$GAP_REGISTER" "tauri_profile_passphrase_rekey_command_ready=true"
must_contain "$GAP_REGISTER" "production_key_management_ready=false"
must_contain "$CLAIM_GATE" "production_key_management_source_ready=true"
must_contain "$CLAIM_GATE" "sqlcipher_passphrase_rekey_source_ready=true"
must_contain "$CLAIM_GATE" "tauri_profile_passphrase_rekey_command_ready=true"
must_contain "$STABLE_GATE" "production_key_management_source_ready=true"
must_contain "$STABLE_GATE" "sqlcipher_passphrase_rekey_source_ready=true"
must_contain "$STABLE_GATE" "tauri_profile_passphrase_rekey_command_ready=true"

must_contain "$STORAGE_DECISION" "SQLCipher passphrase"
must_contain "$STORAGE_DECISION" "Expose user-visible key rotation through SQLCipher rekey"
must_contain "$STORAGE_DECISION" "No recovery code, backup key, or remote reset behavior has been selected"
must_contain "$STORAGE" "pub fn storage_backend_integration_boundary_summary()"
must_contain "$STORAGE" "passphrase_first_unlock: true"
must_contain "$STORAGE" "sqlcipher_passphrase_rekey_source_ready: true"
must_contain "$STORAGE" "production_key_management_ready: false"
must_contain "$STORAGE" "secure_deletion_from_media: false"
must_contain "$STORAGE" "pub fn rekey_with_passphrase"
must_contain "$STORAGE" "apply_forward_only_schema_version"
must_contain "$STORAGE" "fn unlock_policy_requires_passphrase_for_all_modes"
must_contain "$STORAGE" "fn sqlcipher_store_rekey_rotates_passphrase_without_plaintext_exposure"
must_contain "$STORAGE" "fn sqlcipher_store_schema_migration_is_forward_only"
must_contain "$STORAGE" "fn storage_backend_integration_summary_keeps_non_ready_boundaries_explicit"
must_contain "$CORE" "pub fn production_profile_passphrase_rekey"
must_contain "$CORE" "fn production_profile_passphrase_rekey_changes_unlock_secret_without_runtime"
must_contain "$CORE" "pub fn production_key_rollback_boundary_summary()"
must_contain "$CORE" "app_key_wrapping_ready = storage.production_key_management_ready()"
must_contain "$CORE" "rollback_prevention_claimed: false"
must_contain "$CORE" "production_key_management_ready: false"
must_contain "$CORE" "fn production_key_rollback_boundary_closes_policy_without_claiming_wrapping_or_rollback"
must_contain "$CORE" "fn production_local_data_lifecycle_policy_is_passphrase_first_with_non_claims"
must_contain "$TAURI_LIB" "fn production_profile_unlock_uses_app_data_store_without_returning_secrets"
must_contain "$TAURI_LIB" "fn production_profile_passphrase_rekey"
must_contain "$TAURI_LIB" "fn production_profile_passphrase_rekey_is_redacted_and_invalidates_old_passphrase"
must_contain "$TAURI_LIB" "fn production_session_lifecycle_status_and_delete_are_redacted"

for file in "$DOC" "$KEY_DOC" "$RB2_DOC" "$MATRIX" "$GAP_REGISTER" \
  "$CLAIM_GATE" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_not_match "$file" "production_key_management_ready=true"
  must_not_match "$file" "app_key_wrapping_ready=true"
  must_not_match "$file" "key_rotation_ready=true"
  must_not_match "$file" "project_owned_argon2_scrypt_kdf_ready=true"
  must_not_match "$file" "rollback_prevention_claimed=true"
  must_not_match "$file" "secure_deletion_claim_allowed=true"
  must_not_match "$file" "secure_media_deletion_claimed=true"
  must_not_match "$file" "backup_recovery_claimed=true"
  must_not_match "$file" "cloud_backup_sync_enabled=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

scripts/production_key_storage_lifecycle_once.sh >/dev/null
scripts/production_key_rollback_deletion_closure_once.sh >/dev/null

cat <<'STATUS'
status=production-key-management-source-gate-ready
production_key_management_source_gate_reviewed=true
c100_3_key_management_blocker_closed=true
key_management_policy_waiver_authorized=true
key_management_waiver_scope=active-queue-unblock-only
app_key_wrapping_required_for_key_management_claims=true
rollback_prevention_external_monotonic_state_required_for_claims=true
secure_deletion_evidence_required_for_claims=true
production_key_management_source_ready=true
d100_2_key_management_source_gate_reviewed=true
key_management_source_scope=passphrase-first-sqlcipher-local-profile-store-marker-rollback-local-delete-only
passphrase_first_unlock_required=true
sqlcipher_adrec1_local_store_ready=true
sqlcipher_passphrase_kdf_scope_ready=true
project_owned_argon2_scrypt_kdf_ready=false
os_keystore_only_rejected=true
encrypted_profile_session_message_store_ready=true
forward_only_schema_version_ready=true
sqlcipher_passphrase_rekey_source_ready=true
tauri_profile_passphrase_rekey_command_ready=true
prototype_data_migration_ready=false
app_key_wrapping_ready=false
key_rotation_ready=false
supported_rollback_detection_ready=true
rollback_detection_marker_only=true
rollback_prevention_claimed=false
supported_local_deletion_scope_ready=true
secure_deletion_claim_allowed=false
secure_media_deletion_claimed=false
backup_exclusion_best_effort_only=true
backup_recovery_claimed=false
cloud_backup_sync_enabled=false
production_key_management_ready=false
security_ready_claimed=false
sensitive_communication_allowed=false
next_required_phase=Phase-C100-5-Advanced-Onion-Tor-Evidence-Boundary
STATUS
