# Production Key, Rollback, And Deletion Claim Closure

Status: RB-2 source-side key/rollback/deletion closure is complete for the
supported local-only desktop scope. C100-3 is closed for active-queue progress
by explicit owner policy waiver only. This is not complete production key
management, not rollback prevention, not secure deletion from storage media, not
backup recovery, and not a security-ready or sensitive-use claim.

RB-2 resolves the blocker by narrowing the allowed claim to the behavior that is
implemented and user-visible today: passphrase-first local SQLCipher-backed
profile store access, OS-keystore-only unlock rejection for high-risk mode,
marker-only rollback detection with user-visible reset/rebuild recovery, and
explicit local logical delete / owned app-data wipe scopes.

## Allowed Claim Scope

Allowed public-safe wording:

- local profile access is passphrase-first,
- the current local profile store uses a SQLCipher-backed `ADREC1` record path,
- OS-keystore-only unlock is rejected for high-risk local profile access,
- rollback handling is detection-only and routes users to local reset/rebuild
  recovery,
- conversation delete, session delete, profile delete, and full local wipe are
  explicit local actions with separate scopes.

The passphrase policy relies on SQLCipher passphrase handling through the local
profile store. No project-owned Argon2/scrypt KDF, OS account recovery, raw-key
wrapping, or keychain-only unlock is claimed for this release class.

D100-2 records the broader key-management source gate in
`reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md`. It decomposes the current
passable local scope from app key wrapping, key rotation, rollback prevention,
backup recovery, and secure-deletion holds without expanding the RB-2 claim.

The selected workaround is an explicit owner policy waiver for C100-3 only:
missing app key wrapping, production key rotation, external monotonic rollback
prevention design, backup/recovery evidence, secure deletion evidence, and
external review no longer keep C100-3 in the active queue. Production key
management, rollback-prevention, secure-deletion, security-ready, and
sensitive-use claims remain false.

The supported local key lifecycle includes SQLCipher passphrase rekey plus an
encrypted one-generation-forward rotation marker. Duplicate or lower marker
generation writes are rejected, and marker scope is validated. Replay-window
expected-scope loading exists for follow-up production call-site hardening.
That marker is source evidence for local passphrase rotation continuity only;
it is not app key wrapping, recovery, rollback prevention, or a complete
production key-rotation claim.

## Still Forbidden

Do not claim:

- complete production key management,
- app key wrapping readiness,
- OS keychain, DPAPI, Keystore, Secure Enclave, or iCloud Keychain dependency,
- rollback prevention,
- secure deletion from physical media,
- cloud backup/sync deletion or backup recovery,
- remote wipe,
- device-compromise resistance,
- security-ready or sensitive-communication safe status.

## Code And Runtime Anchors

- `production_key_rollback_boundary_summary`
- `production_local_data_lifecycle_policy_summary`
- `production_local_storage_lifecycle_product_summary`
- `production_product_unlock_key_policy_snapshot_from_markers`
- desktop public diagnostics:
  `supported_local_key_lifecycle_ready=true`
- desktop public diagnostics:
  `supported_rollback_detection_ready=true`
- desktop public diagnostics:
  `supported_local_deletion_scope_ready=true`

## Current Gate Flags

- rb_2_key_rollback_deletion_claim_closure_reviewed=true
- c100_3_key_management_blocker_closed=true
- key_management_policy_waiver_authorized=true
- key_management_waiver_scope=active-queue-unblock-only
- app_key_wrapping_required_for_key_management_claims=true
- rollback_prevention_external_monotonic_state_required_for_claims=true
- secure_deletion_evidence_required_for_claims=true
- production_key_management_source_gate_reviewed=true
- production_key_management_source_ready=true
- d100_2_key_management_source_gate_reviewed=true
- key_management_source_scope=passphrase-first-sqlcipher-local-profile-store-marker-rollback-local-delete-only
- supported_local_key_lifecycle_ready=true
- supported_local_key_lifecycle_scope=passphrase-first-sqlcipher-local-profile-store-only
- supported_rollback_detection_ready=true
- supported_rollback_detection_scope=marker-only-detection-user-visible-reset-required
- supported_local_deletion_scope_ready=true
- supported_local_deletion_scope=local-logical-delete-and-owned-app-data-wipe-only
- passphrase_first_unlock_required=true
- os_keystore_only_rejected=true
- sqlcipher_adrec1_local_store_ready=true
- sqlcipher_passphrase_kdf_scope_ready=true
- sqlcipher_passphrase_rekey_source_ready=true
- sqlcipher_passphrase_rotation_generation_source_ready=true
- key_rotation_marker_monotonic_write_enforced=true
- key_rotation_marker_scope_bound=true
- replay_window_scope_bound_loader_ready=true
- minimum_forward_key_rotation_generation_ready=true
- tauri_profile_passphrase_rekey_command_ready=true
- project_owned_argon2_scrypt_kdf_ready=false
- app_key_wrapping_ready=false
- key_rotation_ready=false
- forward_only_schema_version_ready=true
- prototype_data_migration_ready=false
- rollback_detection_marker_only=true
- rollback_prevention_claimed=false
- secure_deletion_claim_allowed=false
- secure_media_deletion_claimed=false
- backup_recovery_claimed=false
- cloud_backup_sync_enabled=false
- production_key_management_ready=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- next_required_phase=Phase O100-1 - Operations, Incident, And Vulnerability Readiness
