# Storage Decision Notes

> **상태: 폐기된 legacy/browser 저장소 기록.** 현재 제품은 daemon 소유 암호화
> 저장소와 `ADRECOVERY2`를 사용합니다. IndexedDB·ADREC1·legacy crate 설명은
> 현재 구현 또는 복구 호환성 증거가 아닙니다.

Another Dimension Chat does not have a complete production encrypted local
storage lifecycle today.

This document records the current public-safe storage boundary around a narrow
SQLCipher-backed `ADREC1` spike. It is intentionally conservative: default
production code must not silently persist sensitive production records as
plaintext files, and the current spike must not be described as complete
production key management, rollback protection, secure deletion, backup,
recovery, or production E2EE readiness.

The current web product uses passphrase-wrapped IndexedDB records. New profile
key derivation uses Argon2id in a dedicated browser Worker; legacy PBKDF2
records are migrated after unlock. The worker prevents the KDF from blocking
the UI, but it does not protect an already compromised browser or device.

## Current State

The repository currently has:

- Development-only file storage behind the `dev-insecure` feature.
- A default-build production storage policy boundary in `crates/storage`.
- Production record classification for schema markers, pairing payloads,
  private keys, replay state, message envelopes, local message indexes, and
  session transport state.
- Tests that reject plaintext writes for production pairing payloads, private
  keys, replay state, message envelopes, local message indexes, and session
  transport state.
- Tests that allow Noise/session transport state only through
  encrypted-at-rest session lifecycle records.
- A backend-independent encrypted record envelope format, `ADREC1`, for
  storing nonce plus sealed record body produced by a separate encryption
  layer.
- A narrow SQLCipher-backed `ADREC1` record store spike using `rusqlite`, with
  raw database key opening kept internal to the storage module.
- Tests that round-trip `ADREC1` through SQLCipher and assert that the sealed
  body and `ADREC1` marker are not visible in database file bytes.
- A passphrase unlock boundary through `ProfilePassphrase` and
  `LockedProfileStore`.
- Tests that wrong passphrases fail before records are returned.
- An unlock policy boundary that rejects OS-keystore-only unlock, including in
  high-risk mode.
- Durable `ReplayWindowState` storage through `SqlCipherRecordStore`.
- Tests that replay state does not appear as plaintext database bytes.
- Core receive boundary that persists replay state only after successful
  decrypt/replay acceptance.
- Local message index skeleton persistence through `ProductionEnvelopeSession`.
- Local record lifecycle deletion helpers for encrypted records, replay state,
  message envelopes, local message indexes, and pairwise endpoint state.
- A daemon-only `EncryptedStore` prototype using Argon2id, AES-256-GCM,
  authenticated associated data, encrypted record classes, atomic file writes,
  a monotonic revision marker, and zeroizing in-memory key buffers.
- A fail-closed `OsKeyStore` trait boundary; no platform keychain implementation
  is claimed yet, so the daemon cannot silently fall back to one.

The repository does not currently have:

- OS keychain, DPAPI, Android Keystore, or iOS Keychain integration.
- A daemon-integrated production key wrapping flow.
- Durable production private-key lifecycle integration above the storage API.
- Replay rollback protection.
- Durable Noise transport or ratchet state storage.
- Verified backup exclusion, cloud backup/sync, backup recovery,
  export/import recovery, or prototype data migration behavior.
- Production account recovery or key rotation.
- Full production message persistence and rich local message index schema.

The web backup formats are intentionally separate. `ADBACKUP1` is profile-only:
its AES-GCM payload removes peer/session/invite state before sealing. `ADSESSION1`
contains the encrypted Olm session and replay-seen state, while `ADTRANSCRIPT1`
contains encrypted local transcript records. All three include KDF metadata,
creation time, revision, size limits, and a SHA-256 integrity envelope; weak or
future KDF/version metadata, stale revisions, altered input, and overwrite are
rejected. Import writes are rolled back on partial failure. None of these formats
claim secure deletion from browser storage, clipboard history, swap, crash dumps,
or SSD media.

## Non-Negotiable Rules

- Do not write production private keys to plaintext local files.
- Do not write production pairing payloads to plaintext local files by
  default.
- Do not write production replay state, message envelopes, or local message
  indexes to plaintext local files.
- Persist Noise transport state only through the reviewed session lifecycle
  path and encrypted-record storage policy.
- Keep `dev-insecure` file storage behind the `dev-insecure` feature.
- Do not treat encrypted message ciphertext as safe-to-store plaintext
  metadata.
- Do not add a storage encryption dependency without documenting key
  derivation, unlock behavior, backup exclusion, platform support, and failure
  modes.

## Daemon candidate direction

The future daemon uses an encrypted local record store owned by the daemon. The
database key is never accepted from the browser or relay. The preferred first
implementation is an encrypted SQLite/SQLCipher-compatible backend behind a
narrow storage trait, with OS keychain/keyring integration used to protect a
wrapped database key rather than to replace the encrypted message store.

The user passphrase remains an explicit recovery/unlock factor. A keychain-only
silent unlock is not a high-risk default. If the platform key store or the
passphrase policy cannot be established, the daemon fails closed instead of
falling back to plaintext or browser storage.

The daemon storage slice must:

- Add the storage dependency only after an encrypted record envelope is
  defined.
- Keep the database writer behind production storage policy checks.
- Store only records classified as `EncryptedAtRestRequired`.
- Accept `SessionTransportState` only when it is encoded as an encrypted record
  scoped to the session contact.
- Use a test-only ephemeral key in tests, clearly separated from production
  unlock/key wrapping.
- Keep OS keychain/keyring integration behind an auditable adapter and test
  unavailable-keychain behavior as a hard failure.
- Avoid migrations from browser, `dev-insecure`, Tauri, or legacy native data.
- Keep Account Root Key, Device Key, protocol session, transcript, and recovery
  records in separate encrypted classes with explicit associated data.
- Write a monotonic revision/rollback marker before acknowledging a state
  transition; an old or ambiguous snapshot is opened read-only for diagnosis or
  rejected, never used to send messages.
- Export only a profile/root recovery artifact by default. Session and transcript
  restore require explicit, versioned, conflict-checked operations and never
  overwrite an active profile.
- Treat wipe as a deletion attempt, not secure deletion; do not expose a panic
  or coercion-resistance claim.

## Required Follow-up Before Dependency Addition

- Define encrypted record envelope versioning and associated data.
- Decide whether schema metadata may remain plaintext or should be placed
  inside the encrypted DB as well.
- Decide test-only key handling so it cannot be confused with production
  unlock.
- Add a dependency review note before adding `rusqlite`/SQLCipher features and
  record platform support, FFI surface, key handling, and reproducibility. The
  current daemon file store is a bounded prototype and is not a release store.

## Dependency Review

Candidate dependency:

```toml
rusqlite = { version = "0.39.0", features = ["bundled-sqlcipher-vendored-openssl"] }
```

Rationale:

- Keeps storage in Rust core.
- Fits desktop-first development.
- Gives the first local encrypted storage spike a stable SQLCipher path.

Known costs and risks:

- Adds C/FFI build surface through SQLite/SQLCipher/OpenSSL.
- Increases CI and local build time.
- Introduces OpenSSL vendoring and license/review surface.
- SQLCipher protects database pages at rest, but does not solve unlocked-device
  compromise, screenshots, process memory extraction, logs, crash dumps, or
  malicious contacts.
