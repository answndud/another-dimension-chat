# Session Establishment Decision

This document records the first public-safe decision boundary for production session establishment.

Another Dimension Chat still does not have production message encryption, key agreement, or a reviewed ratchet implementation. This document is a gate before replacing `dev-insecure` message crypto. It is not a claim that the messenger is secure.

## Decision Boundary

Do not implement message encryption until the first session-establishment test boundary exists.

The first prototype should start from the narrowest model:

- 1:1 only.
- In-person QR pairing only.
- Pairwise identity per contact.
- Signed production pairing payloads.
- Canonical safety transcript and production safety material.
- Synchronous online first session.
- No offline mailbox prekey publication.
- No group sender keys.
- No multi-device.
- No file transfer.

This keeps the first session boundary aligned with the current v0.1 scope and avoids silently introducing mailbox, directory, or multi-device assumptions.

## Candidate Directions

| Candidate | Current observed version | Fit | Initial decision |
| --- | ---: | --- | --- |
| `snow` | `0.10.0` | Maintained Rust implementation of the Noise Protocol Framework. A good candidate for a narrow synchronous session prototype. | Evaluate first for a minimal Noise-based session boundary. |
| `libsignal-protocol` | `0.1.0` | Rust wrapper around `libsignal-protocol-c`. Closer to Signal-style semantics but old wrapper surface and C dependency need review. | Do not select first without deeper audit. |
| `x25519-dalek` | `3.0.0-pre.6` | Low-level X25519 primitive, not a session protocol by itself. Current line is pre-release. | Do not build custom protocol directly from this. |
| `double-ratchet` | `0.1.0` | Direct Double Ratchet crate, but early version and insufficient as full session establishment. | Do not select first. |
| `ratchetx2` | `0.3.8` | Double-ratchet-oriented crate with broader defaults such as grpc feature. Needs deeper review. | Do not select first. |

Metadata was checked with `cargo search` and `cargo info` on 2026-05-18.

## Required Tests Before Implementation

The first implementation slice must start with tests that fail against current placeholder behavior:

- Two production pairing drafts can establish a session only when both signed payloads decode and verify.
- Session setup commits to the safety transcript.
- Session setup rejects a wrong peer identity key.
- Session setup rejects a changed rendezvous endpoint, prekey commitment, or protocol capability.
- Both sides derive the same send/receive secret for the same transcript and role assignment.
- Role assignment is deterministic and independent from timing.
- Ciphertext does not contain plaintext.
- Tampered ciphertext fails to decrypt.
- Replayed message numbers remain rejected by the protocol replay window.
- `dev-insecure` CLI behavior remains explicitly separate.

## Non-Decisions

Not decided here:

- Offline prekey mailbox.
- Asynchronous invites.
- PQ key agreement.
- Signal-style Double Ratchet adoption.
- Group messaging.
- Multi-device state sync.
- Storage of production session secrets.
- Transport authentication over onion services.

## Initial Direction

Evaluate a minimal Noise-based synchronous session boundary first, likely through `snow`, because it can fit the current 1:1 online-only pairing model without inventing a custom key exchange.

This is only a candidate direction.

## Shortlist Alignment

The first implementation candidate is the existing `snow`-backed Noise XX smoke boundary, limited to the synchronous 1:1 session-establishment path.

Selection constraints:

- Use it only through production pairing payloads and the canonical safety transcript.
- Keep the Noise prologue bound to safety material.
- Keep deterministic canonical dialer role assignment.
- Keep session and replay state in memory until encrypted storage/key management permits persistence.
- Keep `dev-insecure` fake crypto behind its feature for local demo ergonomics.

Explicitly not selected for the first implementation slice:

- A custom protocol built from low-level X25519 primitives.
- A standalone Double Ratchet crate without a reviewed setup, identity, persistence, and transport-binding story.
- A Signal-style implementation wrapper without deeper dependency, storage, prekey, and release review.

This alignment does not claim production E2EE readiness. It only narrows the next testable boundary.

## Current Code Boundary

`crates/core` now contains a narrow `ProductionSessionPlan` boundary. It accepts only verified production pairing payloads, requires valid Noise prekey bundles, commits to the safety transcript, and selects a deterministic canonical dialer from pairwise public keys with domain-separated hashing. It still does not implement message encryption, Noise handshakes, ratchets, session secret storage, or transport authentication.

`crates/crypto` also contains a Noise XX smoke boundary through `snow` 0.10.0. It proves that a transcript-bound prologue can complete a handshake and round-trip one encrypted payload, and that mismatched prologues fail. Noise static public keys are serialized as `adnoise1:xx25519-chachapoly-blake2s:<hex-public-key>` inside the signed pairing payload. This is not wired into app messaging and does not yet decide how Noise static private keys are persisted, rotated, or bound to endpoint rotation.

`ProductionSetupDraft` connects the first setup pieces: it generates the production Ed25519 pairing material and a Noise static keypair together, signs the pairing payload, and carries only the Noise public prekey bundle in that signed payload. It still does not persist private key material.

`run_setup_draft_handshake_smoke` connects two setup drafts to the session plan and a Noise XX smoke handshake. The deterministic canonical dialer becomes the Noise initiator. The function rejects a setup draft when its local Noise private keypair does not match the signed public prekey bundle.

`NoiseTransportPair` is now the narrow production crypto boundary after a successful Noise XX handshake. It supports initiator-to-responder encrypt/decrypt in memory and has tamper rejection coverage. It is still not persisted and is not connected to message storage, replay windows, or onion transport.

`ProductionEnvelopeSession` connects the in-memory Noise transport pair to `protocol::Envelope`. The current boundary uses caller-supplied message numbers and a domain-separated hash of the safety transcript as a non-persistent test channel id. It is not a durable session identifier and is not yet connected to storage, transport, or replay persistence.

Replay-aware decrypt now uses the existing `ReplayWindow` boundary. Duplicate and old message numbers are rejected before decrypt, while tampered ciphertext does not commit replay state. Replay state is still caller-owned and not persisted by the production boundary.

`production_session_evaluation_summary()` is the current public-safe harness for this evaluation path. It records that the existing `snow` Noise XX synchronous boundary is covered for production pairing, safety transcript binding, deterministic canonical dialer selection, ciphertext tamper rejection, replay-before-decrypt behavior, and in-memory-only state. It also keeps production E2EE readiness, durable session persistence, Tauri production messaging commands, and usable async messaging explicitly false.

`session_durable_state_connector_gate()` is the first read-only connector-gate draft for durable session state. It records that pairwise identity private keys, Noise static private keys, and replay window state require encrypted-at-rest records; Noise transport state remains in-memory only; replay commits remain after successful decrypt; rollback protection is not provided; and storage unlock commands, transport I/O, runtime messaging, and connector readiness remain false.

`session_durable_state_connector_test_harness()` applies that gate to the storage policy without implementing the connector. It verifies that pairwise identity private keys, Noise static private keys, and replay windows may enter only the encrypted-record path, rejects session transport persistence, and keeps storage unlock commands, transport I/O, and runtime messaging closed.

`session_durable_state_persistence_adapter_skeleton()` is the current adapter boundary before implementation. It maps pairwise identity private keys, Noise static private keys, replay windows, and session transport state to storage policy decisions, while keeping adapter implementation readiness, storage unlock commands, transport I/O, and runtime messaging false.

`session_durable_state_encrypted_record_adapter_spike()` is the first narrow adapter spike. It can prepare sealed `EncryptedRecord` containers for allowed session durable-state kinds, rejects session transport state, and does not write records to a store or mark durable session persistence ready.

## Session Persistence Decision

For the current v0.1 production message boundary, production session state is in-memory only.

Do not persist Noise transport state, Noise static private keys, replay state, or derived channel/session state in plaintext local files. Durable production session persistence is blocked until the encrypted local storage phase defines storage keys, unlock behavior, key derivation, backup exclusion, and local compromise limits.

The current implementation may recreate setup drafts and sessions for local self-tests. That is acceptable for boundary verification, but it is not a usable asynchronous messaging model and should not be presented as production-ready communication.

The current durable-state gate is a contract draft, not an implementation of durable production sessions. It does not add a storage unlock command, does not persist Noise transport state, and does not make the existing Noise boundary production E2EE-ready.
