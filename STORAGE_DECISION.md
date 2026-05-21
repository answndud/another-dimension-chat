# Storage Decision Notes

Another Dimension Chat does not have a complete production encrypted local storage lifecycle today.

This document records the current public-safe storage boundary around a narrow SQLCipher-backed `ADREC1` spike. It is intentionally conservative: default production code must not silently persist sensitive production records as plaintext files, and the current spike must not be described as complete production key management, rollback protection, secure deletion, backup, recovery, or durable session persistence.

## Current State

The repository currently has:

- Development-only file storage behind the `dev-insecure` feature.
- A default-build production storage policy boundary in `crates/storage`.
- Production record classification for schema markers, pairing payloads, private keys, replay state, message envelopes, local message indexes, and session transport state.
- Tests that reject plaintext writes for production pairing payloads, private keys, replay state, message envelopes, local message indexes, and session transport state.
- Tests that keep Noise/session transport state `InMemoryOnly`, even after an encrypted storage backend exists.
- A backend-independent encrypted record envelope format, `ADREC1`, for storing nonce plus sealed record body produced by a separate encryption layer.
- Tests that reject `ADREC1` records for plaintext-only schema markers and in-memory-only session transport state.
- A narrow SQLCipher-backed `ADREC1` record store spike using `rusqlite`, with raw database key opening kept internal to the storage module.
- Tests that round-trip `ADREC1` through SQLCipher and assert that the sealed body and `ADREC1` marker are not visible in database file bytes.
- An opaque `EncryptedRecordId` boundary so row identifiers cannot be path-like profile/contact strings.
- A passphrase unlock boundary through `ProfilePassphrase` and `LockedProfileStore`.
- Tests that wrong passphrases fail before records are returned.
- Tests that passphrases and database keys are redacted in debug output.
- An unlock policy boundary that rejects OS-keystore-only unlock, including in high-risk mode.
- Durable `ReplayWindowState` storage through `SqlCipherRecordStore`.
- Tests that replay state does not appear as plaintext database bytes.
- Core receive boundary that persists replay state only after successful decrypt/replay acceptance.
- Local message index skeleton persistence through `ProductionEnvelopeSession`.
- Local record lifecycle deletion helpers for encrypted records, replay state, message envelopes, local message indexes, and pairwise endpoint state.
- A storage backend integration summary that reports the current SQLCipher-backed `ADREC1` spike, passphrase-first unlock boundary, encrypted record-body storage, no production key-management readiness, no replay rollback protection, no secure deletion from physical media, and no session transport persistence.
- A production message storage boundary summary that keeps replay windows, message envelopes, local message indexes, and endpoint state encrypted-at-rest while keeping session transport state in-memory only.
- A session durable-state connector gate draft that maps pairwise identity private keys, Noise static private keys, and replay window state to encrypted-at-rest records while keeping Noise/session transport state in-memory only.
- A session durable-state connector harness that applies the gate to storage policy before connector implementation: encrypted-record paths are accepted for private-key and replay records, while session transport persistence is rejected.
- A session durable-state persistence adapter skeleton that maps those record kinds to storage policy without implementing unlock, transport I/O, runtime messaging, or durable Noise transport persistence.
- A session durable-state encrypted-record adapter spike that prepares allowed sealed records without writing them to a store or opening unlock/runtime commands.
- A session durable-state adapter non-readiness guard that keeps rollback protection, store writes, durable session persistence, production E2EE readiness, durable Noise transport persistence, and runtime messaging false.
- A session durable-state store-write spike that is `#[cfg(test)]` only and round-trips one prepared sealed record through `SqlCipherRecordStore`.
- A session durable-state store-write status mirror that reports the round-trip coverage as test-only while keeping production store write, unlock command, durable persistence, rollback protection, and runtime messaging unavailable.
- A session durable-state product unlock blocker summary that keeps product unlock closed until key wrapping, backup exclusion, rollback protection, and durable session lifecycle decisions are complete.
- A session durable-state unlock policy handoff summary that reuses the storage unlock policy to require high-risk passphrase input and reject OS-keystore-only unlock while product unlock remains unavailable.
- A session unlock/lock command design gate that requires explicit lock, idle auto-lock, redacted unlock errors, and passphrase-first high-risk policy before any product command is implemented.
- A session unlock command fail-closed skeleton that defines request/result shapes but returns disabled without opening SQLCipher storage, writing session records, exposing key material, or enabling runtime messaging.

The repository does not currently have:

- OS keychain, DPAPI, Android Keystore, or iOS Keychain integration.
- Password-based key derivation.
- Production key wrapping.
- Durable production private key storage.
- Replay rollback protection.
- Durable Noise transport or ratchet state storage.
- Backup, export, import, or migration behavior.
- Production account recovery or key rotation.
- Record-level encryption implementation. `ADREC1` is a container format, not an encryption algorithm.
- Full production message persistence and rich local message index schema.

## Phase 3 Exit Criteria Review

Current Phase 3 status is complete for the v0.1 storage lifecycle boundary.

This does not mean the app has production-ready local storage. It means the current v0.1 boundary is narrow enough to support the next onion transport prototype work without expanding into platform keychain integration, migration, or private key persistence.

Satisfied or partially satisfied:

- Production storage classification exists and rejects plaintext persistence for sensitive production record kinds.
- SQLCipher-backed record storage exists for `ADREC1` records.
- Development file storage remains behind the `dev-insecure` feature.
- Replay state is stored through SQLCipher and committed only after successful decrypt/replay acceptance.
- Record lifecycle deletion helpers exist for encrypted records, replay state, message envelopes, local message indexes, and pairwise endpoint state.
- Public documentation avoids secure media erasure and replay rollback-protection claims.

Deferred:

- Full production message persistence and rich local message index schema.
- Durable production private key storage.
- Production key wrapping, KDF parameters, and OS keychain/DPAPI/Keystore integration.
- Migration from `dev-insecure` prototype data.
- Replay rollback protection.
- Secure deletion from physical media.

Current storage direction: keep the SQLCipher spike narrow and explicit while the onion transport prototype work continues. Do not add durable private key storage, production key wrapping, backup/recovery, or replay rollback-protection claims without a separate phase decision.

## Production Storage Classes

| Record kind | Current class | Reason |
| --- | --- | --- |
| `SchemaMarker` | `PlaintextAllowed` | Minimal non-secret local format marker. |
| `PairingPayload` | `EncryptedAtRestRequired` | Contains pairwise identity, rendezvous endpoint, prekey material, capabilities, and contact metadata. |
| `PairwiseIdentityPrivateKey` | `EncryptedAtRestRequired` | Long-lived identity secret. |
| `NoiseStaticPrivateKey` | `EncryptedAtRestRequired` | Session setup secret. |
| `ReplayWindowState` | `EncryptedAtRestRequired` | Reveals message counters and receive state. |
| `MessageEnvelope` | `EncryptedAtRestRequired` | Ciphertext still carries metadata such as channel id, message number, size bucket, and timing when stored. |
| `LocalMessageIndex` | `EncryptedAtRestRequired` | Reveals local conversation structure and message metadata. |
| `SessionTransportState` | `InMemoryOnly` | Noise transport state must not be persisted without a separate session lifecycle decision. |

## Non-Negotiable Rules

- Do not write production private keys to plaintext local files.
- Do not write production pairing payloads to plaintext local files by default.
- Do not write production replay state, message envelopes, or local message indexes to plaintext local files.
- Do not persist Noise transport state just because encrypted storage exists.
- Keep `dev-insecure` file storage behind the `dev-insecure` feature.
- Do not treat encrypted message ciphertext as safe-to-store plaintext metadata.
- Do not add a storage encryption dependency without documenting key derivation, unlock behavior, backup exclusion, platform support, and failure modes.

## Next Required Decisions

Before implementing durable production storage, decide and document:

- Storage backend: SQLCipher, encrypted embedded database, or a smaller record store.
- Unlock model: passphrase, OS keystore wrapping, or hybrid.
- KDF and parameter policy if passphrases are used.
- Per-profile and per-contact scoping.
- Backup exclusion behavior on macOS, Windows, Linux, and Android.
- Secure deletion expectations and non-claims.
- Crash dump, log, and temporary file handling.
- Migration strategy from prototype data, if any.

## Backend Selection Decision

Initial v0.1 direction: use a SQLCipher-compatible SQLite backend from the Rust core, with OS keychain integration treated as key wrapping/unlock support rather than the primary message store.

This is a provisional implementation direction, not approval to add the dependency yet.

### Candidate Comparison

| Candidate | Decision | Reason |
| --- | --- | --- |
| `rusqlite` + SQLCipher feature path | Prefer for first backend spike | Keeps storage in Rust core, fits desktop-first development, and has documented SQLCipher/bundled SQLCipher build paths. |
| Direct SQLCipher C integration | Defer | More build and FFI surface than needed before the schema and record codec are stable. |
| Tauri SQL plugin | Do not use for core storage | Places storage behind the app shell/plugin boundary instead of the Rust core; less suitable for CLI/core tests. |
| Tauri Stronghold plugin | Defer | Useful to evaluate later for secret storage, but tying the first durable store to Tauri would complicate non-UI core testing. |
| Rust `keyring` crate | Do not depend directly on v4 | The current crate describes itself as sample code and points application developers to the lower-level keyring ecosystem. |
| OS keychain/DPAPI/Keystore only | Not enough | Good for wrapping an app database key, not for structured message/replay/contact storage. |
| Custom encrypted file format | Do not use first | Too much custom cryptographic and corruption-recovery surface for this project. |

### Source Notes

- SQLCipher describes itself as full database encryption for SQLite and lists major desktop/mobile platforms including Windows, iOS, macOS, Android, and Linux: <https://www.zetetic.net/sqlcipher/>.
- `rusqlite` documents `sqlcipher`, `bundled-sqlcipher`, and `bundled-sqlcipher-vendored-openssl` feature paths: <https://github.com/rusqlite/rusqlite>.
- Tauri documents official SQL and Stronghold plugins, but the storage boundary for this project should remain in Rust core first: <https://v2.tauri.app/plugin/>.
- `keyring` 4.x says application developers should not depend on that crate directly and should use the keyring ecosystem components instead: <https://github.com/open-source-cooperative/keyring-rs>.

### Initial Backend Spike Scope

The first backend spike should:

- Add the storage dependency only after an encrypted record envelope is defined.
- Keep the database writer behind production storage policy checks.
- Store only records classified as `EncryptedAtRestRequired`.
- Reject `SessionTransportState` even when encrypted storage is available.
- Use a test-only ephemeral key in tests, clearly separated from production unlock/key wrapping.
- Avoid OS keychain integration in the first spike.
- Avoid migrations from `dev-insecure` data.

### Required Follow-up Before Dependency Addition

- Define encrypted record envelope versioning and associated data. Initial `ADREC1` container is in place.
- Decide whether schema metadata may remain plaintext or should be placed inside the encrypted DB as well.
- Decide test-only key handling so it cannot be confused with production unlock.
- Add a dependency review note before adding `rusqlite`/SQLCipher features.

## Dependency Review Before First Backend Spike

No new storage encryption dependency has been added yet.
Status: implemented for the first local spike.

Candidate dependency:

```toml
rusqlite = { version = "0.39.0", features = ["bundled-sqlcipher-vendored-openssl"] }
```

Rationale:

- `cargo search` currently reports `rusqlite = "0.39.0"`.
- The `rusqlite` README documents `bundled-sqlcipher` and `bundled-sqlcipher-vendored-openssl`.
- The vendored OpenSSL path is more likely to make CI and Windows builds reproducible than relying on a system `libcrypto` or system SQLCipher install.
- Keeping SQLite/SQLCipher access in `crates/storage` preserves CLI/core testability and avoids pushing storage logic into the Tauri frontend/plugin layer.

Known costs and risks:

- Adds C/FFI build surface through SQLite/SQLCipher/OpenSSL.
- Increases CI and local build time.
- Introduces OpenSSL vendoring and license/review surface.
- Mobile cross-compilation may need target-specific follow-up even if desktop CI works.
- SQLCipher protects database pages at rest, but does not solve unlocked-device compromise, screenshots, process memory extraction, logs, crash dumps, or malicious contacts.

Initial feature choice:

- Prefer `bundled-sqlcipher-vendored-openssl` for the first desktop/CI spike.
- Re-evaluate before Android/iOS support.
- Do not use Tauri SQL plugin for core storage.
- Do not use Tauri Stronghold as the first message database backend.

Test-only key handling for the first spike:

- Use an explicit `TestOnlyStorageKey` type behind tests or an obviously named test helper.
- Never expose a production default key.
- Do not read a test key from environment variables that could be mistaken for a production unlock path.
- Test database files must live under temporary directories and must not be reused across runs.
- Tests must assert that plaintext record bodies are not visible in the database bytes.

Dependency addition gate:

The dependency was added only for a local encrypted storage spike for `ADREC1` records. This is not a production unlock/key-management implementation.

## SQLCipher Store Spike

The first SQLCipher store boundary is `SqlCipherRecordStore` in `crates/storage`.

It supports:

- Opening a SQLCipher-backed database through passphrase-first public unlock APIs.
- Storing and loading `ADREC1` records by opaque `EncryptedRecordId`.
- Rejecting empty or path-like record ids before write.
- Keeping `SessionTransportState` outside persistent storage through the existing storage policy.
- Internal raw database key opening for local verification and storage-module plumbing only.
- Test-only key construction for local verification.
- Passphrase-based unlock through `ProfilePassphrase`.
- A locked profile handle that requires explicit unlock before records can be read.
- Wrong-passphrase rejection before records are returned.
- Unlock policy checks that require a passphrase factor before unlock.
- High-risk mode rejection for OS-keystore-only auto-unlock.
- Saving and loading durable replay windows as the first wired production record kind.
- Deleting encrypted records by opaque `EncryptedRecordId`.

It does not support:

- UI-level production profile unlock.
- OS keychain/DPAPI/Keystore wrapping.
- Project-owned password KDFs.
- Key rotation.
- Backup/export/import.
- Migration from `dev-insecure` storage.
- Persistent Noise/session transport state.
- A security-ready release.

## First Durable Record Wiring

The first durable production record wired into `SqlCipherRecordStore` is `ReplayWindowState`.

Rationale:

- Replay state is security-sensitive metadata and must not be plaintext.
- It is less dangerous than private identity keys as the first persistence target.
- It exercises the `EncryptedAtRestRequired` path without introducing key migration, contact import, or session transport persistence.

Current behavior:

- `save_replay_window` stores `ReplayWindow::encode_state()` through an `ADREC1` record of kind `ReplayWindowState`.
- `load_replay_window` returns `None` for missing records.
- `delete_replay_window` removes replay state through the same opaque record id boundary and is idempotent for missing state.
- Loading rejects records whose kind is not `ReplayWindowState`.
- Tests assert the database file does not contain the `ADREPLAY1` marker or observed replay sequence bytes.

Limitations:

- Replay state rollback protection is not implemented.
- Initial `ProductionEnvelopeSession` receive integration is in place, but a full transport/UI receive pipeline is not.

## Receive Flow Replay Persistence

`ProductionEnvelopeSession::decrypt_at_responder_with_persistent_replay` is the first core receive boundary that connects message decrypt, replay checks, and SQLCipher-backed replay state persistence.

Current behavior:

- Load existing replay state from `SqlCipherRecordStore`.
- Use a fresh replay window when no state exists.
- Reject duplicate or old message numbers before decrypt.
- Decrypt the envelope.
- Save updated replay state only after decrypt succeeds.
- Do not persist replay advancement for tampered ciphertext.

This still does not provide:

- Rollback protection for an attacker who can restore an older database snapshot.
- Durable session transport state.
- Full receive pipeline integration with Tor/onion transport or UI.

## Receive Storage API Boundary

`ProductionEnvelopeSession` owns replay record id derivation for its current session. Callers should not allocate human-readable replay record ids such as profile names, contact ids, endpoint strings, or channel ids.

Current API boundary:

- `ProductionEnvelopeSession` derives the replay `EncryptedRecordId` internally.
- The id is a domain-separated hash of the session `channel_id`.
- The id is stable for the same session and different across different session transcripts.
- The id does not embed the `adchan1` channel id string, profile names, contact ids, or endpoints.
- `decrypt_at_responder_with_session_replay` is the preferred receive helper for current session replay persistence.
- The lower-level explicit-record-id replay helper is module-private and remains available only to internal tests and future in-module migration code.

The caller still provides `EncryptedRecordScope` because storage authorization and record ownership are profile/contact concerns outside the in-memory session object. A future UI/transport receive facade should construct that scope from the selected local profile and verified contact, not from untrusted network input.

## Encrypted Record Deletion Boundary

`SqlCipherRecordStore::delete` removes rows by opaque `EncryptedRecordId` only.

Current behavior:

- Existing encrypted records are removed from `encrypted_records`.
- Missing records are treated idempotently.
- Raw profile names, contact ids, endpoint strings, local paths, or message plaintext are not accepted by the deletion API.

This is a lifecycle boundary for later expiry and local deletion flows. It is not secure deletion from physical media, and it does not claim protection against filesystem snapshots, backups, wear leveling, database page history, or an already-unlocked compromised device.

Replay-specific cleanup uses `delete_replay_window` so callers do not have to assemble raw table operations. This helper still provides only record lifecycle deletion, not replay rollback protection or secure media erasure.

Message expiry cleanup uses `delete_message_envelope` and `delete_local_message_index` so future expiry code can remove encrypted local message records without direct table operations. These helpers do not implement mailbox expiry, transport delivery expiry, secure media erasure, or user-facing disappearing-message policy by themselves.

Message record ids are allocated by module-private `ProductionEnvelopeSession` helpers rather than by callers assembling human-readable strings:

- `message_envelope_record_id` derives a `message_...` id from the session channel id, message number, and message type.
- `local_message_index_record_id` derives a `msgidx_...` id from the session channel id, verified contact id, and message number.
- Both helpers use domain-separated hashes and do not embed profile names, contact ids, endpoint strings, plaintext channel ids, or message plaintext in the resulting record id.

The first local message index skeleton stores only a contact id, message number, and message type inside a `LocalMessageIndex` encrypted record body. It exists to fix the persistence boundary and record id allocation before any message list UI, search, mailbox sync, delivery state, or full message persistence is added.

Endpoint state cleanup uses `ProductionEnvelopeSession::delete_pairwise_endpoint_state`, which accepts a verified `ContactId`, derives the opaque endpoint state record id internally, and removes the encrypted record idempotently. It does not publish descriptors, rotate endpoints, reconnect streams, or claim secure media erasure.

## Storage Boundary Review

The current storage boundary should stay smaller than a full message database until the transport and UI receive paths exist.

Current decision:

- Do not add new durable record kinds only to anticipate later UI, mailbox, attachment, or sync features.
- Keep `SqlCipherRecordStore::delete` as the canonical row deletion behavior.
- Keep type-specific delete helpers only as thin lifecycle names for replay, message envelope, and local message index cleanup.
- Test the generic delete behavior once, and test missing-record idempotency for the thin helpers together instead of repeating the same database row lifecycle in separate tests.
- Keep plaintext-on-disk checks for replay state, endpoint state, and local message index because those encode different metadata leakage risks.

This review does not make the prototype production-secure. It only reduces duplicated verification while preserving the storage invariants that matter for v0.1: no plaintext production records, explicit profile unlock, opaque record ids, encrypted-at-rest record bodies, and no replay rollback protection claim.

## Production Storage Lifecycle Cleanup

The phrase "production storage lifecycle" in this repository means a narrow set of guardrails, not complete production encrypted local storage.

Current lifecycle boundary:

- Production record kinds are classified before persistence.
- Sensitive production records must not be written as plaintext.
- Profile storage reads require an explicit passphrase unlock boundary.
- SQLCipher-backed `ADREC1` storage is a local spike for encrypted record bodies.
- Replay state commit ordering is tested for the current database state.
- Opaque record ids are used for replay, message index, and endpoint state records.
- Local record deletion helpers remove rows by opaque id only.
- `storage_backend_integration_boundary_summary()` exposes these guardrails as integration status, while keeping production key management, replay rollback protection, secure media deletion, and session transport persistence explicitly unavailable.
- `production_message_storage_boundary_summary()` exposes the current production message-path storage status: replay windows, message envelopes, local message indexes, and endpoint state require encrypted-at-rest records; session transport state remains in-memory only; replay commits only after decrypt; rollback protection, production key management, secure media deletion, and durable session transport persistence remain unavailable.
- `session_durable_state_connector_gate()` records the current cross-core session persistence contract: pairwise identity private keys, Noise static private keys, and replay windows require encrypted-at-rest records; session transport state remains in-memory-only; rollback protection and runtime execution remain unavailable.
- `session_durable_state_connector_test_harness()` verifies that contract against storage policy without adding storage unlock commands or durable Noise transport persistence.
- `session_durable_state_persistence_adapter_skeleton()` maps the allowed durable-state record policies before adding an encrypted-record adapter implementation.
- `session_durable_state_encrypted_record_adapter_spike()` prepares allowed sealed records but does not perform store writes, unlock, or durable Noise transport persistence.
- `session_durable_state_adapter_non_readiness_guard()` records that sealed-record preparation does not provide rollback protection, durable session persistence, production E2EE readiness, store writes, or runtime messaging.
- `session_durable_state_store_write_test_only_round_trips_prepared_record` verifies one test-only SQLCipher round-trip for a prepared sealed durable-state record while preserving the production non-readiness guard.
- `session_durable_state_store_write_status_mirror()` exposes that store-write coverage as test-only and keeps production store write, unlock, durable persistence, rollback protection, and runtime messaging disabled.
- `session_durable_state_product_unlock_blocker_summary()` exposes product unlock blockers: passphrase-first storage exists, but key wrapping, backup exclusion, rollback protection, durable session persistence, and runtime messaging are not ready.
- `session_durable_state_unlock_policy_handoff_summary()` confirms that the session durable-state blocker path is aligned with the storage unlock policy: high-risk mode requires passphrase input, OS-keystore-only unlock is rejected, and product unlock remains closed.
- `session_unlock_lock_command_design_gate()` captures pre-implementation command requirements while keeping product unlock, product lock, durable session persistence, and runtime messaging disabled.
- `session_unlock_command_fail_closed()` gives future unlock callers a stable disabled result shape while keeping storage closed, session records unwritten, key material unexposed, and runtime messaging disabled.

Non-claims:

- No durable production private key persistence.
- No complete production encrypted local storage lifecycle.
- No rollback protection against encrypted database snapshot restore.
- No secure deletion from physical media.
- No OS keychain/DPAPI/Keystore wrapping.
- No migration, backup, export, or recovery behavior.
- No durable session transport persistence.

Public docs should use "storage guardrails", "storage boundary", or "SQLCipher-backed storage spike" unless and until the missing lifecycle pieces above are implemented and reviewed.

## Replay Rollback Protection Decision

v0.1 does not claim replay rollback protection against encrypted database snapshot restore.

Current replay persistence guarantees are intentionally narrower:

- Replay state is stored through the SQLCipher-backed `ADREC1` record path.
- Replay state is not written as plaintext database bytes.
- Receive flow loads replay state before decrypt.
- Receive flow saves replay state only after decrypt and replay acceptance succeed.
- Duplicate or old message numbers are rejected relative to the current database state.

This does not protect against an attacker who can restore an older encrypted database snapshot and still cause the app to unlock it. SQLCipher protects at-rest confidentiality; it does not by itself prove that the database file is the newest version ever opened by the profile.

Before this project can claim rollback protection, it needs a separate design and tests for at least one monotonic state source. Candidate approaches include OS-backed secure storage, TPM/Secure Enclave/StrongBox-backed counters or wrapped state, protocol-level peer checkpointing, or another reviewed external monotonic mechanism. Each option has platform, recovery, backup, and coercion tradeoffs and must be handled in a separate ADR before implementation.

Public product language must therefore avoid claims like "persistent replay protection" or "rollback-proof local state." The current claim is limited to encrypted replay persistence with correct commit ordering in the current database state.

## Unlock and Key Wrapping Decision

Initial v0.1 direction: keep unlock explicit and passphrase-first. `StorageDatabaseKey` still has only test-only construction, and the raw SQLCipher open helper is not part of the public production API. Normal code must go through `ProfilePassphrase` and `LockedProfileStore`/`SqlCipherRecordStore::unlock_with_passphrase`.

When production unlock is added, prefer this sequence:

1. Add an explicit profile unlock API in Rust core.
2. Support a passphrase unlock path first, relying on SQLCipher passphrase key derivation rather than adding a separate custom KDF.
3. Add OS keychain/DPAPI/Keystore wrapping only as an optional convenience or recovery layer after the passphrase path is tested.
4. Keep high-risk mode from auto-unlocking solely because the user is logged into the OS account. Initial unlock policy test is in place.
5. Add key rotation through SQLCipher rekey only after backup, rollback, and recovery behavior are documented.

Rationale:

- SQLCipher documents `PRAGMA key` as supporting passphrase-based key derivation and states that passphrases are converted to database keys using PBKDF2.
- SQLCipher documents raw key input too, but using raw keys would require this project to define its own key generation, wrapping, and salt handling earlier than needed.
- OS keychains are useful for wrapping or storing secrets, but using them as the only unlock factor weakens the high-risk local compromise story.
- A passphrase-first API keeps the next Tauri UI honest: unlock is a visible user action, not an implicit side effect of app launch.

Non-decisions:

- No Argon2 dependency has been selected.
- No OS keychain crate has been selected.
- No biometric unlock behavior has been selected.
- No recovery code, backup key, or remote reset behavior has been selected.
- No production default key exists.

Required tests before production unlock:

- Opening an existing DB with the wrong passphrase fails before any records are returned. Initial storage test is in place.
- No passphrase, database key, or derived key appears in debug output, logs, panic text, or CLI output. Initial debug redaction test is in place.
- Locked profiles cannot read `ADREC1` records. Initial locked-handle API is in place.
- High-risk mode does not auto-unlock through OS keychain alone. Initial unlock policy test is in place.
- Rekey/rotation tests exist before any key rotation UI is exposed.

## Encrypted Record Envelope

`ADREC1` is the first storage record envelope:

```text
ADREC1|<record-kind>|<profile>|<scope>|<nonce-hex>|<sealed-body-hex>
```

It provides:

- Versioned record prefix.
- Storage record kind.
- Profile scope.
- Optional contact scope.
- Nonce bytes from the future encryption layer.
- Sealed body bytes from the future encryption layer.
- Associated data construction for future AEAD or SQLCipher-adjacent record protection tests.

It does not provide:

- Encryption.
- Authentication.
- Key derivation.
- Key wrapping.
- Secure deletion.
- Database page encryption.

Only records classified as `EncryptedAtRestRequired` may be encoded as `ADREC1`. `SchemaMarker` remains outside this encrypted record envelope, and `SessionTransportState` remains `InMemoryOnly`.

## Implementation Sequence

1. Add production storage record classification and plaintext persistence rejection. Done in `crates/storage`.
2. Add a public-safe backend selection decision before adding new dependencies. Initial direction: Rust-core SQLCipher-compatible SQLite, likely through `rusqlite`, after the encrypted record envelope is defined.
3. Add an encrypted record envelope format independent of any specific backend. Initial `ADREC1` container is in place.
4. Add a minimal encrypted storage implementation for non-session records only. Initial SQLCipher-backed `ADREC1` store spike is in place.
5. Wire production key material only after unlock and key wrapping behavior is tested. Initial passphrase unlock boundary and negative tests are in place.
6. Persist replay state only after metadata leakage and rollback behavior are tested. Initial SQLCipher-backed replay state persistence and receive-flow commit ordering are in place, but rollback protection is still open.
7. Keep session transport state in memory until a separate session lifecycle decision changes that rule.

## Open Questions

- Should v0.1 use SQLCipher for pragmatic cross-platform storage, or a smaller encrypted record store first?
- Should profile unlock depend on OS keychain wrapping, a user passphrase, or both?
- How should Android storage differ from desktop storage?
- What records should be excluded from backups by default?
- How should rollback, replay-window restoration, and crash recovery interact?
