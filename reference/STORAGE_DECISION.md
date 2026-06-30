# Storage Decision Notes

Another Dimension Chat does not have a complete production encrypted local
storage lifecycle today.

This document records the current public-safe storage boundary around a narrow
SQLCipher-backed `ADREC1` spike. It is intentionally conservative: default
production code must not silently persist sensitive production records as
plaintext files, and the current spike must not be described as complete
production key management, rollback protection, secure deletion, backup,
recovery, or production E2EE readiness.

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

The repository does not currently have:

- OS keychain, DPAPI, Android Keystore, or iOS Keychain integration.
- Password-based key derivation.
- Production key wrapping.
- Durable production private key storage.
- Replay rollback protection.
- Durable Noise transport or ratchet state storage.
- Verified backup exclusion, cloud backup/sync, backup recovery,
  export/import recovery, or prototype data migration behavior.
- Production account recovery or key rotation.
- Full production message persistence and rich local message index schema.

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

## Current Direction

Initial v0.1 direction: use a SQLCipher-compatible SQLite backend from the
Rust core, with OS keychain integration treated as key wrapping/unlock support
rather than the primary message store.

The first backend spike should:

- Add the storage dependency only after an encrypted record envelope is
  defined.
- Keep the database writer behind production storage policy checks.
- Store only records classified as `EncryptedAtRestRequired`.
- Accept `SessionTransportState` only when it is encoded as an encrypted record
  scoped to the session contact.
- Use a test-only ephemeral key in tests, clearly separated from production
  unlock/key wrapping.
- Avoid OS keychain integration in the first spike.
- Avoid migrations from `dev-insecure` data.

## Required Follow-up Before Dependency Addition

- Define encrypted record envelope versioning and associated data.
- Decide whether schema metadata may remain plaintext or should be placed
  inside the encrypted DB as well.
- Decide test-only key handling so it cannot be confused with production
  unlock.
- Add a dependency review note before adding `rusqlite`/SQLCipher features.

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
