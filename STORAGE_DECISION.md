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

The repository does not currently have:

- SQLCipher or another encrypted database backend.
- OS keychain, DPAPI, Android Keystore, or iOS Keychain integration.
- Password-based key derivation.
- Production key wrapping.
- Durable production private key storage.
- Durable production replay state storage.
- Durable Noise transport or ratchet state storage.
- Backup, export, import, or migration behavior.

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

## Implementation Sequence

1. Add production storage record classification and plaintext persistence rejection. Done in `crates/storage`.
2. Add a public-safe backend selection decision before adding new dependencies.
3. Add an encrypted record envelope format independent of any specific backend.
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
