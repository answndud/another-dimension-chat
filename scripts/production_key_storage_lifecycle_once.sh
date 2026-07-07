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
    fail "$file contains forbidden claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md"

must_contain "$DOC" "production_key_storage_lifecycle_gate_reviewed=true"
must_contain "$DOC" "passphrase_first_unlock_required=true"
must_contain "$DOC" "encrypted_profile_session_message_store_ready=true"
must_contain "$DOC" "destructive_local_actions_separated=true"
must_contain "$DOC" "exact_confirmation_required=true"
must_contain "$DOC" "backup_exclusion_best_effort_only=true"
must_contain "$DOC" "cloud_backup_sync_enabled=false"
must_contain "$DOC" "backup_recovery_claimed=false"
must_contain "$DOC" "rollback_detection_marker_only=true"
must_contain "$DOC" "rollback_prevention_claimed=false"
must_contain "$DOC" "secure_media_deletion_claimed=false"
must_contain "$DOC" "production_key_management_ready=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "next_required_phase=RB-3 default practical transport closure"

must_contain "README.md" "reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md"
must_contain "SECURITY.md" "reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md"
must_contain "reference/STORAGE_DECISION.md" "PRODUCTION_KEY_STORAGE_LIFECYCLE.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "ops_3_key_storage_lifecycle_gate_reviewed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "ops_4_default_transport_product_path_reviewed=true"

must_contain "crates/storage/src/lib.rs" "unlock_policy_requires_passphrase_for_all_modes"
must_contain "crates/storage/src/lib.rs" "sqlcipher_store_rejects_wrong_passphrase_before_returning_records"
must_contain "crates/storage/src/lib.rs" "storage_backend_integration_summary_keeps_non_ready_boundaries_explicit"
must_contain "crates/storage/src/lib.rs" "production_message_storage_summary_allows_encrypted_session_transport"
must_contain "crates/core/src/lib.rs" "production_local_data_lifecycle_policy_summary"
must_contain "crates/core/src/lib.rs" "production_local_storage_lifecycle_product_summary"
must_contain "crates/core/src/lib.rs" "production_key_rollback_boundary_summary"
must_contain "crates/core/src/lib.rs" "production_local_data_lifecycle_policy_is_passphrase_first_with_non_claims"
must_contain "crates/core/src/lib.rs" "production_local_storage_lifecycle_product_matrix_closes_without_backup_or_rollback_claims"
must_contain "crates/core/src/lib.rs" "production_key_rollback_boundary_closes_policy_without_claiming_wrapping_or_rollback"
must_contain "apps/desktop-tauri/src-tauri/src/lib.rs" "production_profile_unlock_uses_app_data_store_without_returning_secrets"
must_contain "apps/desktop-tauri/src-tauri/src/lib.rs" "production_session_lifecycle_status_and_delete_are_redacted"
must_contain "apps/desktop-tauri/src-tauri/src/lib.rs" "production_data_lifecycle_delete_migration_and_wipe_are_redacted"
must_contain "apps/desktop-tauri/src/main.js" "confirmation === input.profile"
must_contain "apps/desktop-tauri/src/main.js" "WIPE LOCAL DATA"
must_contain "apps/desktop-tauri/src/main.js" "not backup recovery, rollback prevention, or secure media deletion"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "renderDataLifecycleDestructivePreflight\\(\"profile-delete\""
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "confirmationMatched: Boolean\\(input\\.profile && confirmation === input\\.profile\\)"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "confirmationMatched: confirmation === \"WIPE LOCAL DATA\""

for file in "$DOC" "README.md" "SECURITY.md" "reference/STORAGE_DECISION.md"; do
  must_not_match "$file" "production_key_management_ready=true"
  must_not_match "$file" "rollback_prevention_claimed=true"
  must_not_match "$file" "secure_media_deletion_claimed=true"
  must_not_match "$file" "backup_recovery_claimed=true"
  must_not_match "$file" "cloud_backup_sync_enabled=true"
  must_not_match "$file" "security_ready_claimed=true"
done

cat <<'STATUS'
status=production-key-storage-lifecycle-ready
production_key_storage_lifecycle_gate_reviewed=true
passphrase_first_unlock_required=true
encrypted_profile_session_message_store_ready=true
destructive_local_actions_separated=true
exact_confirmation_required=true
backup_exclusion_best_effort_only=true
cloud_backup_sync_enabled=false
backup_recovery_claimed=false
rollback_detection_marker_only=true
rollback_prevention_claimed=false
secure_media_deletion_claimed=false
production_key_management_ready=false
security_ready_claimed=false
next_required_phase=RB-3-default-practical-transport-closure
STATUS
