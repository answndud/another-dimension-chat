# Crypto review packet

This packet is an input for an independent review of the application-level
composition around the audited `vodozemac` implementation. It is not an audit
report and must not be used as a security certificate.

## Scope

1. Profile identity generation, signing-key storage, passphrase wrapping,
   Argon2id Worker lifecycle, legacy PBKDF2 migration, lock, wipe, and backup.
2. Invite canonicalization, signature verification, expiry, name collision,
   server/capability binding, revocation, prekey reservation, consumption, and
   replenishment.
3. Olm init/ready state transitions, safety phrase binding, identity continuity,
   ratchet pickle persistence, commit/rollback, replay window, duplicate
   envelope handling, endpoint changes, and key rotation.
4. Browser/WASM boundary, JavaScript memory lifetime, IndexedDB/Cache/service
   worker behavior, multiple tabs, reload, crash, quota/eviction, clipboard,
   history, and error paths.
5. Relay delivery semantics, queue limits, ack behavior, capability exposure,
   retry/duplicate behavior, and metadata claims.
6. Release manifest, signed UI/WASM/runtime, SBOM/provenance, trusted-key
   bootstrap, revocation, rollback, and malicious-bundle response.

## Required state invariants

| ID | Invariant | Required failure behavior |
| --- | --- | --- |
| `INV-01` | A locked profile has no usable private profile/session key in the active app state. | Stop work and require unlock; do not send or decrypt. |
| `INV-02` | A peer identity change never continues an existing ratchet. | Reject envelope and require fresh invite + safety verification. |
| `INV-03` | A message is enabled only after the current safety material is explicitly verified. | Keep send/export disabled. |
| `INV-04` | A prekey is never silently reused after reservation/consumption. | Reject or create a fresh profile; never guess state. |
| `INV-05` | A ratchet pickle is persisted atomically before the corresponding message is acknowledged as sent/received. | Roll back or stop; never advance in memory only. |
| `INV-06` | An envelope is accepted at most once for the current profile/session. | Reject duplicate/replay without mutating ratchet state. |
| `INV-07` | A capability or invite is never logged or sent to an unintended origin. | Abort request and redact diagnostics. |
| `INV-08` | Changed JS/WASM, manifest, runtime, or signing key cannot be presented as verified. | Refuse startup/release; do not downgrade to unsigned mode. |
| `INV-09` | Backup import cannot overwrite an active/existing profile or downgrade security parameters. | Reject import without changing local state. |
| `INV-10` | All unsupported transport routes fail closed when high-risk is requested. | Keep high-risk messaging disabled. |

## Reproduction fixture matrix

| Fixture | Input | Evidence |
| --- | --- | --- |
| `crypto/wrong-passphrase` | wrong passphrase, damaged ciphertext | no key/session mutation, actionable error |
| `crypto/invite` | expired, revoked, altered, wrong-peer, duplicate invite | rejected before pairing |
| `crypto/prekey` | reservation crash, exhaustion, duplicate handshake | no private-key reuse; explicit recovery |
| `crypto/ratchet` | init/ready replay, tamper, reordered envelope, endpoint change | fail-closed state and unchanged transcript |
| `crypto/persistence` | kill after write before ack, corrupt record, quota failure | atomic rollback or locked profile |
| `crypto/concurrency` | two tabs send/receive/lock simultaneously | serialized state or safe rejection |
| `crypto/backup` | altered version, weak KDF parameters, overwrite target | reject without overwrite |
| `web/boundary` | altered JS/WASM, stale SW/cache, CSP violation, extension-like injection | no verified/high-risk startup |
| `relay/capability` | leaked invite/local token, replay, brute force, oversized body | scoped denial, rotation, no secret logs |
| `release/key` | wrong/revoked key, changed manifest, rollback version | release gate non-zero |

## Review deliverables

- protocol/state diagram with message formats and canonicalization rules;
- key and secret lifecycle table with memory/storage/network/log locations;
- adversary assumptions and explicit non-claims;
- reproducible commands and fixed fixtures for every invariant;
- severity-ranked findings with affected versions and safe remediation;
- independent statement of what was not reviewed;
- sign-off that is separate from the automated test report.

## Current decision

Until every `INV-*` fixture is reproducible and the independent review is
complete, the application remains an experimental low-risk prototype. The
underlying cryptographic library's audit history does not audit this packet's
composition, browser integration, relay, UI, storage, or release process.
