# Storage Decision Notes

Another Dimension Chat does not have production encrypted local storage today.

This document records the first public-safe storage boundary before any encrypted database, OS keychain integration, or durable production session persistence is implemented. It is intentionally conservative: default production code must not silently persist sensitive production records as plaintext files.

## Current State

The repository currently has:

- Development-only file storage behind the `dev-insecure` feature.
- A default-build production storage policy boundary in `crates/storage`.
- Production record classification for schema markers, pairing payloads, private keys, replay state, message envelopes, local message indexes, and session transport state.
- Tests that reject plaintext writes for production pairing payloads, private keys, replay state, message envelopes, local message indexes, and session transport state.
- Tests that keep Noise/session transport state `InMemoryOnly`, even after an encrypted storage backend exists.
- A backend-independent encrypted record envelope format, `ADREC1`, for storing nonce plus sealed record body produced by a separate encryption layer.
- Tests that reject `ADREC1` records for plaintext-only schema markers and in-memory-only session transport state.

The repository does not currently have:

- SQLCipher or another encrypted database backend.
- OS keychain, DPAPI, Android Keystore, or iOS Keychain integration.
- Password-based key derivation.
- Production key wrapping.
- Durable production private key storage.
- Durable production replay state storage.
- Durable Noise transport or ratchet state storage.
- Backup, export, import, or migration behavior.
- Record encryption implementation. `ADREC1` is a container format, not an encryption algorithm.

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

Before adding the dependency, confirm that the next slice is only a local encrypted storage spike for `ADREC1` records and is not a production unlock/key-management implementation.

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
4. Add a minimal encrypted storage implementation for non-session records only.
5. Wire production key material only after unlock and key wrapping behavior is tested.
6. Persist replay state only after metadata leakage and rollback behavior are tested.
7. Keep session transport state in memory until a separate session lifecycle decision changes that rule.

## Open Questions

- Should v0.1 use SQLCipher for pragmatic cross-platform storage, or a smaller encrypted record store first?
- Should profile unlock depend on OS keychain wrapping, a user passphrase, or both?
- How should Android storage differ from desktop storage?
- What records should be excluded from backups by default?
- How should rollback, replay-window restoration, and crash recovery interact?
