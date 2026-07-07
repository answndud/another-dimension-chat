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
    fail "$file contains forbidden key/rollback/deletion claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md"
CORE="crates/core/src/lib.rs"
STATUS="apps/desktop-tauri/src-tauri/src/status.rs"
PRIVATE_STATE="apps/desktop-tauri/src/private-delivery-state.js"
MAIN_JS="apps/desktop-tauri/src/main.js"
UI_SMOKE="apps/desktop-tauri/src/ui-smoke.test.js"
KEY_DOC="reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
STORAGE_DECISION="reference/STORAGE_DECISION.md"

for file in "$DOC" "$CORE" "$STATUS" "$PRIVATE_STATE" "$MAIN_JS" "$UI_SMOKE" \
  "$KEY_DOC" "$STABLE_GATE" "$PACKET" "$STORAGE_DECISION" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing RB-2 key/rollback/deletion closure input: $file"
done

must_contain "$DOC" "rb_2_key_rollback_deletion_claim_closure_reviewed=true"
must_contain "$DOC" "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
must_contain "$DOC" "production_key_management_source_gate_reviewed=true"
must_contain "$DOC" "production_key_management_source_ready=true"
must_contain "$DOC" "d100_2_key_management_source_gate_reviewed=true"
must_contain "$DOC" "supported_local_key_lifecycle_ready=true"
must_contain "$DOC" "supported_local_key_lifecycle_scope=passphrase-first-sqlcipher-local-profile-store-only"
must_contain "$DOC" "supported_rollback_detection_ready=true"
must_contain "$DOC" "supported_rollback_detection_scope=marker-only-detection-user-visible-reset-required"
must_contain "$DOC" "supported_local_deletion_scope_ready=true"
must_contain "$DOC" "supported_local_deletion_scope=local-logical-delete-and-owned-app-data-wipe-only"
must_contain "$DOC" "passphrase_first_unlock_required=true"
must_contain "$DOC" "os_keystore_only_rejected=true"
must_contain "$DOC" "sqlcipher_adrec1_local_store_ready=true"
must_contain "$DOC" "sqlcipher_passphrase_kdf_scope_ready=true"
must_contain "$DOC" "project_owned_argon2_scrypt_kdf_ready=false"
must_contain "$DOC" "app_key_wrapping_ready=false"
must_contain "$DOC" "key_rotation_ready=false"
must_contain "$DOC" "forward_only_schema_version_ready=true"
must_contain "$DOC" "prototype_data_migration_ready=false"
must_contain "$DOC" "rollback_detection_marker_only=true"
must_contain "$DOC" "rollback_prevention_claimed=false"
must_contain "$DOC" "secure_deletion_claim_allowed=false"
must_contain "$DOC" "secure_media_deletion_claimed=false"
must_contain "$DOC" "backup_recovery_claimed=false"
must_contain "$DOC" "cloud_backup_sync_enabled=false"
must_contain "$DOC" "production_key_management_ready=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "next_required_phase=RB-3 default practical transport closure"

must_contain "$CORE" "SUPPORTED_LOCAL_KEY_LIFECYCLE_SCOPE"
must_contain "$CORE" "SUPPORTED_ROLLBACK_DETECTION_SCOPE"
must_contain "$CORE" "SUPPORTED_LOCAL_DELETION_SCOPE"
must_contain "$CORE" "pub fn supported_local_key_lifecycle_ready"
must_contain "$CORE" "pub fn supported_rollback_detection_ready"
must_contain "$CORE" "pub fn supported_local_deletion_scope_ready"
must_contain "$CORE" "secure_deletion_claim_allowed: false"
must_contain "$CORE" "production_key_management_ready: false"
must_contain "$STATUS" "supported_local_key_lifecycle_ready={}"
must_contain "$STATUS" "supported_rollback_detection_ready={}"
must_contain "$STATUS" "supported_local_deletion_scope_ready={}"
must_contain "$STATUS" "secure_deletion_claim_allowed={}"
must_contain "$STATUS" "production_key_management_ready=false"
must_contain "$PRIVATE_STATE" "supportedLocalKeyLifecycleReady: true"
must_contain "$PRIVATE_STATE" "supportedRollbackDetectionReady: true"
must_contain "$PRIVATE_STATE" "supportedLocalDeletionScopeReady: true"
must_contain "$PRIVATE_STATE" "secureDeletionClaimAllowed: false"
must_contain "$PRIVATE_STATE" "supported_local_key_lifecycle_ready=\${desktopCompletion.supportedLocalKeyLifecycleReady === true}"
must_contain "$PRIVATE_STATE" "supported_rollback_detection_ready=\${desktopCompletion.supportedRollbackDetectionReady === true}"
must_contain "$PRIVATE_STATE" "supported_local_deletion_scope_ready=\${desktopCompletion.supportedLocalDeletionScopeReady === true}"
must_contain "$PRIVATE_STATE" "rollback_prevention_claimed=false"
must_contain "$PRIVATE_STATE" "secure_deletion_claim_allowed=\${desktopCompletion.secureDeletionClaimAllowed === true}"
must_contain "$MAIN_JS" "supported_local_key_lifecycle_ready=\${supportedLocalKeyLifecycleReady}"
must_contain "$MAIN_JS" "supported_rollback_detection_ready=\${supportedRollbackDetectionReady}"
must_contain "$MAIN_JS" "supported_local_deletion_scope_ready=\${supportedLocalDeletionScopeReady}"
must_contain "$MAIN_JS" "rollback_prevention_claimed=\${rollbackPreventionClaimed}"
must_contain "$MAIN_JS" "secure_deletion_claim_allowed=\${secureDeletionClaimAllowed}"
must_contain "$UI_SMOKE" "supported_local_key_lifecycle_ready="
must_contain "$UI_SMOKE" "supported_rollback_detection_ready="
must_contain "$UI_SMOKE" "supported_local_deletion_scope_ready="

must_contain "$KEY_DOC" "reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md"
must_contain "$KEY_DOC" "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
must_contain "$KEY_DOC" "production_key_management_source_ready=true"
must_contain "$KEY_DOC" "supported_local_key_lifecycle_ready=true"
must_contain "$KEY_DOC" "rollback_prevention_claimed=false"
must_contain "$KEY_DOC" "secure_deletion_claim_allowed=false"
must_contain "$STABLE_GATE" "supported_local_key_lifecycle_ready=true"
must_contain "$STABLE_GATE" "production_key_management_ready=false"
must_contain "$PACKET" "reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md"
must_contain "$PACKET" "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md"
must_contain "$STORAGE_DECISION" "SQLCipher passphrase"
must_contain "README.md" "reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md"
must_contain "SECURITY.md" "reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md"

for file in "$DOC" "$KEY_DOC" "$STABLE_GATE" "README.md" "SECURITY.md"; do
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

cat <<'STATUS'
status=production-key-rollback-deletion-closure-ready
rb_2_key_rollback_deletion_claim_closure_reviewed=true
production_key_management_source_gate_reviewed=true
production_key_management_source_ready=true
d100_2_key_management_source_gate_reviewed=true
supported_local_key_lifecycle_ready=true
supported_local_key_lifecycle_scope=passphrase-first-sqlcipher-local-profile-store-only
supported_rollback_detection_ready=true
supported_rollback_detection_scope=marker-only-detection-user-visible-reset-required
supported_local_deletion_scope_ready=true
supported_local_deletion_scope=local-logical-delete-and-owned-app-data-wipe-only
passphrase_first_unlock_required=true
os_keystore_only_rejected=true
app_key_wrapping_ready=false
key_rotation_ready=false
rollback_detection_marker_only=true
rollback_prevention_claimed=false
secure_deletion_claim_allowed=false
secure_media_deletion_claimed=false
backup_recovery_claimed=false
cloud_backup_sync_enabled=false
production_key_management_ready=false
security_ready_claimed=false
sensitive_communication_allowed=false
next_required_phase=RB-3-default-practical-transport-closure
STATUS
