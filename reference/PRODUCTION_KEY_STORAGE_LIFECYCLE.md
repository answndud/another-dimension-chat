# Production Key And Local Storage Lifecycle Gate

Status: OPS-3 and RB-2 source-side gates closed for review input. C100-3 is
closed for active-queue progress by explicit owner policy waiver only. The
supported local key lifecycle, marker-only rollback detection, and local
deletion/wipe scopes are ready. This is not complete production key-management
readiness, secure media deletion, backup recovery, rollback prevention, or a
security-ready claim.

This document records the current passphrase-first local storage lifecycle for
the desktop-first 1:1 flow. It binds the profile, session, message, deletion,
backup, migration, and rollback semantics to one public-safe gate before the
default transport phase.

## Current Decision

- Passphrase-first unlock is required for local high-risk profile access.
- OS-keystore-only unlock is rejected. Optional OS wrapping may be evaluated
  later, but it is not a required trust dependency.
- Local profile/session/message records use the SQLCipher-backed `ADREC1`
  storage spike and production record policy checks.
- Conversation delete, session lifecycle delete, profile delete, and full local
  wipe are separate local actions with separate recovery boundaries.
- Backup exclusion is a required best-effort policy, not a completed guarantee.
- Schema migration is forward-only; destructive migration is blocked.
- Rollback detection is marker-only. Rollback prevention is not claimed.
- Secure deletion from physical storage media is not claimed.
- The RB-2 supported scope is recorded in
  `reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md`.
- D100-2 pass/hold decomposition for production key-management source
  readiness is recorded in
  `reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md`.

## Lifecycle Matrix

| Scope | Current behavior | Preserves | Removes | Claim boundary |
| --- | --- | --- | --- | --- |
| Profile unlock | Opens the local encrypted profile store after explicit profile name and passphrase input. | Local profile store, session records, message records. | Nothing. | Does not return paths, passphrases, key material, raw storage errors, or identifiers. |
| Explicit lock | Clears the desktop unlocked status and requires passphrase input again. | Local encrypted store on disk. | In-memory unlocked status. | Does not claim memory zeroization or device-compromise resistance. |
| Conversation delete | Deletes local sent/received message records, envelope records, indexes, and counters for the active conversation. | Session lifecycle records. | Local conversation message records. | Logical delete only; no backup recovery, rollback prevention, or secure media deletion. |
| Session lifecycle delete | Deletes pairing/session resume records for the active session. | Message records. | Session draft, endpoint state, replay window, and session transport readiness. | Requires manual rebuild before messaging resumes. |
| Profile delete | Requires typing the exact local profile name. | Other local profiles and app-owned data. | The selected local profile store. | Local-only delete; no cloud backup cleanup or secure media deletion claim. |
| Full local wipe | Requires typing `WIPE LOCAL DATA`. | Nothing in app-owned local data roots. | App-owned profile, transport, lifecycle-marker, and cache data. | Local app-data wipe only; no device-wide or synced-data claim. |

## Key And Storage Semantics

Profile unlock is passphrase-first. The current public boundary relies on the
SQLCipher-backed store opening path, redacted `ProfilePassphrase` and database
key debug output, and explicit unlock policy tests. It does not yet document a
final production KDF parameter policy, app database-key wrapping, key rotation,
key export, account recovery, or OS keychain/DPAPI/Keystore/Keychain wrapper.

RB-2 records the stable local scope as passphrase-first SQLCipher passphrase
handling for the local profile store only. No project-owned Argon2/scrypt KDF,
raw-key wrapping, OS account recovery, or keychain-only unlock is claimed.

Production record kinds that carry profile, pairing, identity private key,
Noise static private key, replay, message, endpoint, handshake, session draft,
or session transport state are encrypted-at-rest records. `SchemaMarker` is the
only plaintext-allowed production storage class today.

## Backup, Migration, And Rollback

Backup/sync is not a product feature. The app can prepare and report
backup-exclusion boundaries, but platform verification and recovery semantics
remain explicit follow-up work. Users must not be told that cloud backup,
backup recovery, rollback prevention, or secure deletion is available.

Rollback detection uses local markers and profile snapshots. It can block
runtime resume when local state looks inconsistent, but it does not prevent a
restored encrypted database snapshot from existing. Any rollback-prevention
claim requires an external monotonic-state design and external review.

## Evidence Anchors

- Storage policy and SQLCipher spike:
  `crates/storage/src/lib.rs`
- Core lifecycle and key/rollback summaries:
  `crates/core/src/lib.rs`
- Desktop Tauri lifecycle commands and redacted results:
  `apps/desktop-tauri/src-tauri/src/lib.rs`
- Desktop UI destructive-action copy and state cleanup:
  `apps/desktop-tauri/src/main.js`
- Storage decision history:
  `reference/STORAGE_DECISION.md`

Targeted tests that anchor this gate:

- `unlock_policy_requires_passphrase_for_all_modes`
- `sqlcipher_store_rejects_wrong_passphrase_before_returning_records`
- `storage_backend_integration_summary_keeps_non_ready_boundaries_explicit`
- `production_message_storage_summary_allows_encrypted_session_transport`
- `production_local_data_lifecycle_policy_is_passphrase_first_with_non_claims`
- `production_local_storage_lifecycle_product_matrix_closes_without_backup_or_rollback_claims`
- `production_key_rollback_boundary_closes_policy_without_claiming_wrapping_or_rollback`
- `production_profile_unlock_uses_app_data_store_without_returning_secrets`
- `production_session_lifecycle_status_and_delete_are_redacted`
- `production_data_lifecycle_delete_migration_and_wipe_are_redacted`

## External Review Questions

- Are the final passphrase KDF parameters, memory cost, and migration policy
  adequate for this risk model?
- Should optional platform key wrapping be added, and how can it remain optional
  instead of becoming OS-account trust?
- What monotonic-state design is acceptable before rollback prevention can be
  claimed?
- What exact backup-exclusion checks are required per platform before public
  wording can move beyond best-effort?
- What destructive-action wording is sufficient to avoid implying secure media
  deletion or cloud-backup cleanup?

## Current Gate Flags

- production_key_storage_lifecycle_gate_reviewed=true
- c100_3_key_management_blocker_closed=true
- key_management_policy_waiver_authorized=true
- key_management_waiver_scope=active-queue-unblock-only
- app_key_wrapping_required_for_key_management_claims=true
- rollback_prevention_external_monotonic_state_required_for_claims=true
- secure_deletion_evidence_required_for_claims=true
- rb_2_key_rollback_deletion_claim_closure_reviewed=true
- production_key_management_source_gate_reviewed=true
- production_key_management_source_ready=true
- d100_2_key_management_source_gate_reviewed=true
- key_management_source_scope=passphrase-first-sqlcipher-local-profile-store-marker-rollback-local-delete-only
- passphrase_first_unlock_required=true
- supported_local_key_lifecycle_ready=true
- supported_local_key_lifecycle_scope=passphrase-first-sqlcipher-local-profile-store-only
- supported_rollback_detection_ready=true
- supported_rollback_detection_scope=marker-only-detection-user-visible-reset-required
- supported_local_deletion_scope_ready=true
- supported_local_deletion_scope=local-logical-delete-and-owned-app-data-wipe-only
- encrypted_profile_session_message_store_ready=true
- sqlcipher_adrec1_local_store_ready=true
- sqlcipher_passphrase_kdf_scope_ready=true
- sqlcipher_passphrase_rekey_source_ready=true
- tauri_profile_passphrase_rekey_command_ready=true
- project_owned_argon2_scrypt_kdf_ready=false
- forward_only_schema_version_ready=true
- prototype_data_migration_ready=false
- app_key_wrapping_ready=false
- key_rotation_ready=false
- destructive_local_actions_separated=true
- exact_confirmation_required=true
- backup_exclusion_best_effort_only=true
- cloud_backup_sync_enabled=false
- backup_recovery_claimed=false
- rollback_detection_marker_only=true
- rollback_prevention_claimed=false
- secure_deletion_claim_allowed=false
- secure_media_deletion_claimed=false
- production_key_management_ready=false
- security_ready_claimed=false
- next_required_phase=Phase F100-1 - External Two-Machine Field Evidence Program
