# Production Key Management Source Gate

Status: D100-2 source gate is ready for the supported local key/storage scope.
This is a source-readiness gate only. It is not complete production key
management, not app key wrapping readiness, not key rotation readiness, not
rollback prevention, not secure deletion, not an audit result, and not
permission for sensitive communication.

## Source-Ready Scope

This gate treats the following supported local scope as pass-capable:

- passphrase-first local profile unlock,
- SQLCipher-backed `ADREC1` local profile/session/message record path,
- OS-keystore-only unlock rejection for high-risk mode,
- encrypted-at-rest production record classification for private keys, replay,
  message, endpoint, and session transport state,
- forward-only schema version handling,
- SQLCipher passphrase rekey primitive,
- marker-only rollback detection with user-visible reset/rebuild recovery,
- explicit local conversation delete, session delete, profile delete, and owned
  app-data wipe scopes,
- best-effort backup-exclusion policy as a required policy boundary.

This gate is deliberately narrower than `production_key_management_ready`.
It confirms that current source has a coherent pass/hold boundary for review;
it does not claim final KDF ownership, app database-key wrapping, key rotation,
backup recovery, rollback prevention, secure media deletion, or device
compromise resistance.

## Unit Status

| Unit | Current status | Claim boundary |
| --- | --- | --- |
| Passphrase unlock | source-ready | SQLCipher passphrase path only. |
| KDF policy | supported-scope pass | SQLCipher passphrase KDF only; no project-owned Argon2/scrypt policy claim. |
| Record encryption | source-ready | SQLCipher-backed `ADREC1` record path; no raw key wrapping claim. |
| Schema versioning | source-ready | Forward-only schema version handling; no prototype-data migration claim. |
| App key wrapping | hold | `app_key_wrapping_ready=false`. |
| Key rotation | source primitive only; product hold | SQLCipher passphrase rekey is source-ready; no rotation UI, policy, backup/recovery, or production rotation claim. |
| Rollback handling | supported detection only | marker-only detection; rollback prevention false. |
| Deletion | supported local lifecycle only | logical delete/app-data wipe only; secure media deletion false. |
| Backup/recovery | hold | backup exclusion is best-effort policy; backup recovery false. |

## Required Anchors

- `reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md`
- `reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md`
- `reference/STORAGE_DECISION.md`
- `crates/storage/src/lib.rs`: `storage_backend_integration_boundary_summary`
- `crates/storage/src/lib.rs`: `rekey_with_passphrase`
- `crates/storage/src/lib.rs`: `sqlcipher_store_schema_migration_is_forward_only`
- `crates/core/src/lib.rs`: `production_key_rollback_boundary_summary`
- `crates/core/src/lib.rs`: `production_local_data_lifecycle_policy_summary`
- `apps/desktop-tauri/src-tauri/src/lib.rs`: redacted unlock/delete lifecycle tests

## Focused Test Anchors

- `unlock_policy_requires_passphrase_for_all_modes`
- `sqlcipher_store_rejects_wrong_passphrase_before_returning_records`
- `sqlcipher_store_rekey_rotates_passphrase_without_plaintext_exposure`
- `sqlcipher_store_schema_migration_is_forward_only`
- `storage_backend_integration_summary_keeps_non_ready_boundaries_explicit`
- `production_local_data_lifecycle_policy_is_passphrase_first_with_non_claims`
- `production_key_rollback_boundary_closes_policy_without_claiming_wrapping_or_rollback`
- `production_profile_unlock_uses_app_data_store_without_returning_secrets`
- `production_session_lifecycle_status_and_delete_are_redacted`

## Current Gate Flags

- production_key_management_source_gate_reviewed=true
- production_key_management_source_ready=true
- d100_2_key_management_source_gate_reviewed=true
- key_management_source_scope=passphrase-first-sqlcipher-local-profile-store-marker-rollback-local-delete-only
- passphrase_first_unlock_required=true
- sqlcipher_adrec1_local_store_ready=true
- sqlcipher_passphrase_kdf_scope_ready=true
- project_owned_argon2_scrypt_kdf_ready=false
- os_keystore_only_rejected=true
- encrypted_profile_session_message_store_ready=true
- forward_only_schema_version_ready=true
- sqlcipher_passphrase_rekey_source_ready=true
- prototype_data_migration_ready=false
- app_key_wrapping_ready=false
- key_rotation_ready=false
- supported_rollback_detection_ready=true
- supported_rollback_detection_scope=marker-only-detection-user-visible-reset-required
- rollback_detection_marker_only=true
- rollback_prevention_claimed=false
- supported_local_deletion_scope_ready=true
- supported_local_deletion_scope=local-logical-delete-and-owned-app-data-wipe-only
- secure_deletion_claim_allowed=false
- secure_media_deletion_claimed=false
- backup_exclusion_best_effort_only=true
- backup_recovery_claimed=false
- cloud_backup_sync_enabled=false
- production_key_management_ready=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- next_required_phase=D100-3 macOS signed/notarized artifact execution path
