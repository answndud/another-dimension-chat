# Session Establishment Decision

This document records the first public-safe decision boundary for production session establishment.

Another Dimension Chat still does not have production message encryption, key agreement, or a reviewed ratchet implementation. This document is a gate before replacing `dev-insecure` message crypto. It is not a claim that the messenger is secure.

## Decision Boundary

Do not implement message encryption until the first session-establishment test boundary exists.

The first prototype should start from the narrowest model:

- 1:1 only.
- Invite-code pairing only.
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

## Selected Direction

Use a minimal Noise-based synchronous session boundary through `snow` for the first v0.1 production session path, because it fits the current 1:1 online-only invite-code pairing model without inventing a custom key exchange.

This is a reviewed protocol decision for the first implementation boundary. It is not a claim that the messenger has production-ready E2EE.

## Shortlist Alignment

The first selected implementation boundary is the existing `snow`-backed Noise XX path, limited to the synchronous 1:1 session-establishment path.

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

This alignment does not claim production E2EE readiness. It only fixes the first reviewed protocol boundary and leaves asynchronous delivery semantics as the remaining Phase BD blocker.

## Current Code Boundary

`crates/core` now contains a narrow `ProductionSessionPlan` boundary. It accepts only verified production pairing payloads, requires valid Noise prekey bundles, commits to the safety transcript, and selects a deterministic canonical dialer from pairwise public keys with domain-separated hashing. It still does not implement message encryption, Noise handshakes, ratchets, session secret storage, or transport authentication.

`crates/crypto` also contains a Noise XX smoke boundary through `snow` 0.10.0. It proves that a transcript-bound prologue can complete a handshake and round-trip one encrypted payload, and that mismatched prologues fail. Noise static public keys are serialized as `adnoise1:xx25519-chachapoly-blake2s:<hex-public-key>` inside the signed pairing payload. This is not wired into app messaging and does not yet decide how Noise static private keys are persisted, rotated, or bound to endpoint rotation.

`ProductionSetupDraft` connects the first setup pieces: it generates the production Ed25519 pairing material and a Noise static keypair together, signs the pairing payload, and carries only the Noise public prekey bundle in that signed payload. It still does not persist private key material.

`run_setup_draft_handshake_smoke` connects two setup drafts to the session plan and a Noise XX smoke handshake. The deterministic canonical dialer becomes the Noise initiator. The function rejects a setup draft when its local Noise private keypair does not match the signed public prekey bundle.

`NoiseTransportPair` is now the narrow production crypto boundary after a successful Noise XX handshake. It supports initiator-to-responder encrypt/decrypt in memory and has tamper rejection coverage. It is still not persisted and is not connected to message storage, replay windows, or onion transport.

`ProductionEnvelopeSession` connects the in-memory Noise transport pair to `protocol::Envelope`. The current boundary uses caller-supplied message numbers and a domain-separated hash of the safety transcript as a non-persistent test channel id. It is not a durable session identifier and is not yet connected to storage, transport, or replay persistence.

Replay-aware decrypt now uses the existing `ReplayWindow` boundary. Duplicate and old message numbers are rejected before decrypt, while tampered ciphertext does not commit replay state. Replay state is still caller-owned and not persisted by the production boundary.

`production_protocol_decision_summary()` is the current public-safe protocol decision harness. It records that the first v0.1 boundary selects `snow` Noise XX for a synchronous 1:1 invite-code session, rejects custom X25519 protocols, standalone ratchet crates, unreviewed Signal-style wrappers, offline mailbox prekey publication, group sender keys, and multi-device sync, and keeps production E2EE readiness false.

`production_session_evaluation_summary()` is the current public-safe harness for this evaluation path. It records that the existing `snow` Noise XX synchronous boundary is covered for production pairing, safety transcript binding, deterministic canonical dialer selection, ciphertext tamper rejection, replay-before-decrypt behavior, encrypted-at-rest durable session state, message-type-separated transport nonce scheduling, reviewed protocol decision, and reviewed runtime command surface inventory. It keeps production E2EE readiness and usable async messaging explicitly false, with named blocker for async delivery semantics.

`production_session_readiness_gate()` mirrors those readiness blockers as a compact gate for CLI/Tauri status surfaces. It does not open runtime messaging, storage unlock commands, transport I/O, or a secure messenger claim.

`session_durable_state_connector_gate()` is the first read-only connector-gate draft for durable session state. It records that pairwise identity private keys, Noise static private keys, replay window state, and Noise transport state require encrypted-at-rest records; replay commits remain after successful decrypt; rollback protection is not provided; and storage unlock commands, transport I/O, runtime messaging, and connector readiness remain false.

`session_durable_state_connector_test_harness()` applies that gate to the storage policy without opening runtime execution. It verifies that pairwise identity private keys, Noise static private keys, replay windows, and session transport state may enter only the encrypted-record path, and keeps storage unlock commands, transport I/O, and runtime messaging closed.

`session_durable_state_persistence_adapter_skeleton()` is the current adapter boundary before implementation. It maps pairwise identity private keys, Noise static private keys, replay windows, and session transport state to storage policy decisions, while keeping adapter implementation readiness, storage unlock commands, transport I/O, and runtime messaging false.

`session_durable_state_encrypted_record_adapter_spike()` is the first narrow adapter spike. It can prepare sealed `EncryptedRecord` containers for allowed session durable-state kinds while keeping runtime execution closed.

`session_durable_state_adapter_non_readiness_guard()` keeps the adapter spike from being interpreted as production E2EE readiness. It records that durable session persistence and durable Noise transport persistence are available as encrypted-at-rest local state, while rollback protection, production E2EE readiness, product store writes, and runtime messaging remain false.

`session_durable_state_store_write_adapter()` is the first narrow store-write boundary. It writes caller-supplied prepared sealed records through an already-unlocked `SqlCipherRecordStore` only after the expected durable-state kind, encrypted-record scope, and record-id prefix match. It does not open an unlock command, transport I/O, runtime messaging, rollback protection, or production E2EE readiness.

`session_durable_state_store_write_status_mirror()` reports that the store-write adapter boundary exists and requires a caller-supplied unlocked store. It keeps production store write, production unlock command, rollback protection, and runtime messaging unavailable.

`session_durable_state_product_unlock_blocker_summary()` records the current product unlock blockers. The passphrase-first storage boundary exists, but product unlock remains closed because app key wrapping, backup exclusion, rollback protection, and runtime messaging are not ready.

`session_durable_state_unlock_policy_handoff_summary()` links the session durable-state blocker summary to the storage unlock policy. It confirms that high-risk mode accepts passphrase-based unlock policy, rejects OS-keystore-only unlock, and still keeps product unlock and runtime messaging unavailable.

`session_unlock_lock_command_design_gate()` records the minimum command semantics before any product unlock/lock implementation. A future command must preserve passphrase-first high-risk unlock, OS-keystore-only rejection, explicit lock, idle auto-lock, and redacted unlock errors. The gate keeps production unlock command, production lock command, and runtime messaging unavailable.

`session_unlock_command_fail_closed()` is the first command-shape skeleton for future product unlock. It accepts passphrase-only, OS-keystore-only, and combined request shapes, but every request returns a redacted disabled result. The skeleton does not open storage, write session records, expose key material, or enable runtime messaging.

`session_lock_lifecycle_status_mirror()` records the lock lifecycle requirements that future unlock work must satisfy. It carries the explicit lock requirement, default 5 minute idle auto-lock, and high-risk 1 minute idle auto-lock into a status API while keeping storage unlocked state, product lock command, key erasure claim, and runtime messaging unavailable.

`session_unlock_redacted_error_taxonomy()` defines safe unlock failure categories for future CLI/Tauri copy. It distinguishes disabled product unlock, passphrase-required, and OS-keystore-only rejected states without exposing raw storage errors, OS keychain errors, paths, identifiers, key material, or passphrase detail.

Default CLI `production unlock` currently uses that taxonomy only as a fail-closed boundary rejection. It ignores profile/passphrase details, returns `product-unlock-disabled`, and keeps storage open, session record writes, key material exposure, and runtime messaging false.

## Session Persistence Decision

For the current v0.1 production message boundary, production session state is persisted only as encrypted-at-rest local records through the session lifecycle path.

Do not persist Noise transport state, Noise static private keys, replay state, or derived channel/session state in plaintext local files. Production E2EE readiness remains blocked until async delivery semantics are complete.

The current implementation may recreate setup drafts and sessions for local self-tests. That is acceptable for boundary verification, but it is not a usable asynchronous messaging model and should not be presented as production-ready communication.

The current durable-state gate is a contract draft, not an implementation of durable production sessions. It does not add a storage unlock command, does not persist Noise transport state, and does not make the existing Noise boundary production E2EE-ready.
