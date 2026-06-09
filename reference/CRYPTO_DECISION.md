# Crypto Decision Notes

Another Dimension Chat does not have production cryptography today.

This document records the public-safe Phase 2 decision boundary before any placeholder crypto is replaced. It is intentionally conservative: no production security claim should be made until the selected design has implementation, tests, review, and release discipline behind it.

## Current State

The repository currently has:

- A `CryptoSession` trait in `crates/crypto`.
- Development-only fake encryption behind `dev-insecure`.
- Pairwise identity types in `crates/identity`.
- Production-facing key and signature byte wrappers backed by `ed25519-dalek` for signing and verification tests.
- Production Ed25519 pairwise private key generation has a narrow OS-randomness boundary.
- Scheme-tagged production pairing public key strings that are distinct from development public keys.
- Scheme-tagged production pairing signature strings that are distinct from development signatures.
- Pairing payload decode rejects explicit mixed dev/production public key and signature schemes.
- Pairing payload decode verifies production public key plus production signature pairs through the Ed25519 production path.
- Production pairing payload construction can sign caller-supplied pairing parameters with an Ed25519 production private key.
- Production pairing nonce construction uses a narrow OS-randomness wrapper backed by `getrandom`.
- Production pairing default construction centralizes nonce, local timestamp, TTL, endpoint rotation policy, and capability defaults while keeping endpoint and prekey material caller-supplied.
- Production pairing draft construction can return a generated private key plus signed payload without deciding storage, backup, or export.
- Pairing payload canonicalization and signature boundary in `crates/pairing`.
- Production safety transcript tests cover signed production payload ordering and identity, endpoint, prekey, and capability sensitivity.
- Production safety material derivation has a SHA-256 based, domain-separated display boundary independent from `dev-insecure` fake crypto.
- Integration tests cover signed production payloads through transcript construction and production safety material derivation.
- A narrow Noise XX smoke boundary uses `snow` with constrained features for `25519 + ChaChaPoly + BLAKE2s` and binds the handshake prologue to the safety transcript.
- Noise static public keys have a public prekey bundle string format: `adnoise1:xx25519-chachapoly-blake2s:<hex-public-key>`.
- `ProductionSessionPlan` rejects signed production pairing payloads whose `prekey_bundle` is not a valid Noise prekey bundle.
- `ProductionSetupDraft` can generate an Ed25519 production pairing draft and a Noise static keypair together, placing only the Noise public prekey bundle in the signed pairing payload.
- Core-level setup handshake smoke uses the deterministic canonical dialer as the Noise initiator and rejects local Noise private keys that do not match the signed prekey bundle.
- `NoiseTransportPair` exposes a narrow one-message encrypt/decrypt boundary after Noise XX transport mode and rejects tampered ciphertext through the underlying `snow` transport state.
- `ProductionEnvelopeSession` connects the in-memory Noise transport pair to `protocol::Envelope` for a caller-supplied message number and a domain-separated transcript-derived test channel id.
- Production envelope receive can commit `ReplayWindow` state only after replay acceptance and successful decrypt, so tampered ciphertext does not advance replay state.
- `production_session_evaluation_summary()` exposes the bounded first evaluation result: the `snow` Noise XX synchronous boundary has production-pairing, safety-transcript, canonical-dialer, tamper-rejection, replay-before-decrypt guard coverage, encrypted-at-rest durable session state coverage, message-type-separated transport nonce scheduling, and a reviewed runtime command surface inventory. Production E2EE readiness and usable async messaging remain false. It exposes named readiness blockers for reviewed protocol decision and async delivery semantics.
- Production session draft, Noise private key, replay window, session transport persistence, and message-type-separated transport nonce scheduling are implemented as encrypted-at-rest local records and deterministic message crypto boundaries. Reviewed E2EE protocol readiness remains incomplete.
- Integration fixture tests for canonical pairing payloads, dev placeholder signatures, and safety transcript ordering.
- Padded envelope and replay window prototypes in `crates/protocol`.

The repository does not currently have:

- Real E2EE.
- A reviewed ratchet implementation.
- Stored production signature keys.
- Integrated production key agreement for app messages.
- Production key storage.
- Broader production randomness policy for session establishment.
- Production encrypted local storage.
- Persistent production session state.

## Non-Negotiable Rules

- Do not invent a cryptographic algorithm.
- Do not implement custom random generation, custom KDF logic, custom AEAD construction, or custom signature math.
- Do not remove `dev-insecure` until production behavior exists and tests cover the replacement boundary.
- Do not mix development test keys with production key types.
- Do not claim Signal-level or Signal-superior security.
- Do not treat pairing signatures, safety material, message encryption, storage encryption, and transport anonymity as one interchangeable security layer.

## Required Decisions

Before replacing placeholder crypto, decide and document:

- Identity signature algorithm and maintained Rust library.
- Key agreement and session establishment model.
- Whether v0.1 assumes synchronous online pairing or uses a prekey bundle.
- Whether the first production message session uses a reviewed ratchet, a Noise-based construction, or a maintained protocol implementation.
- How safety numbers are derived from pairwise identity, prekey, rendezvous endpoint, and protocol capabilities.
- How test vectors are generated, reviewed, stored, and versioned.
- How production key material is serialized without leaking into logs, CLI output, or public test fixtures.

The first identity signature dependency decision is tracked in [SIGNATURE_DECISION.md](SIGNATURE_DECISION.md).
The first pairing nonce randomness dependency decision is tracked in [RANDOMNESS_DECISION.md](RANDOMNESS_DECISION.md).
The first session-establishment decision boundary is tracked in [SESSION_DECISION.md](SESSION_DECISION.md).

## Candidate Direction

The current architecture points toward this first production boundary:

- Pairwise identity per contact.
- Invite-code pairing as the first supported setup path.
- Pairing payload includes identity material, signed session setup material, rendezvous endpoint, and capability commitments.
- Safety number derives from a canonical transcript that includes the identity and setup material.
- Safety material display is derived from the canonical transcript with a reviewed hash crate, while message encryption is handled by a reviewed session construction, not by the CLI or UI.
- `dev-insecure` remains available only for development tests after production crypto is introduced.

This is a direction, not an approval to implement crypto from scratch.

## Protocol/Library Shortlist

Current shortlist outcome:

| Candidate | Shortlist status | Reason |
| --- | --- | --- |
| `snow` Noise XX boundary | **Evaluate first** | Already present as a narrow transcript-bound smoke boundary. Fits the current 1:1, invite-code, synchronous-first scope without adding mailbox, directory, group, or multi-device assumptions. |
| Maintained Signal-style protocol implementation | **Defer until deeper review** | Potentially closer to a mature E2EE messaging model, but adoption would require a reviewed Rust integration path, prekey/session storage decisions, compatibility expectations, and stronger release review. |
| Direct `x25519-dalek` plus custom session logic | **Do not select** | Low-level primitives are not a protocol. Building a custom session or ratchet from primitives would violate the no-custom-crypto rule. |
| Standalone Double Ratchet crates | **Do not select first** | A ratchet crate alone does not solve identity binding, setup authentication, prekey distribution, safety material, persistence, or transport binding. |

First evaluation path:

1. Keep the first production message/session work on the existing Noise-based synchronous boundary.
2. Treat `snow` as the implementation candidate for a bounded prototype only after tests are written against the production pairing/safety/session boundary.
3. Keep `dev-insecure` fake crypto available for local prototype ergonomics.
4. Do not claim production E2EE readiness until persistence, key management, transport binding, release review, and user-facing safety copy are resolved.

This shortlist is intentionally narrow. It does not decide that Noise XX is sufficient for the final v0.1 messenger, and it does not approve a custom ratchet or custom protocol.

## Implementation Gate For The Shortlist

Before a production message/session implementation expands beyond the current smoke boundary, add tests that prove:

- Signed production pairing payloads are required on both sides.
- Noise setup material is bound to the canonical safety transcript.
- A wrong identity key, changed endpoint, changed capability set, or mismatched prekey bundle prevents setup.
- The deterministic canonical dialer role is stable across both peers.
- Ciphertexts do not contain plaintext and tampering fails.
- Replay rejection happens before decrypt and tampered ciphertext does not advance replay state.
- Session state is persisted only where the encrypted storage and session lifecycle boundary explicitly permits it.
- No Tauri production messaging command is exposed while the crypto/session boundary is incomplete.
- `ProductionSessionEvaluationSummary` keeps production E2EE readiness, Tauri production messaging commands, and usable async messaging false while reporting encrypted-at-rest durable session persistence, message-type-separated nonce scheduling, and reviewed runtime command surface inventory as available.

## Prekey Question

The v0.1 product direction avoids a central identity or message server. That makes prekey distribution a first-class design decision.

Allowed options to evaluate:

- Include the first prekey bundle in the invite-code pairing payload.
- Require both users to be online for the first production session.
- Publish prekey bundles through an anonymized, untrusted rendezvous mechanism in a later phase.

Out of scope for the first production crypto replacement:

- Public prekey directory.
- Phone-number based account lookup.
- Searchable username lookup.
- Offline mailbox-based asynchronous invites.

## Test Requirements Before Replacement

Production crypto work must start with tests that fail against placeholder behavior.

Minimum test coverage:

- Canonical transcript test vectors.
- Pairing signature verification accepts valid payloads and rejects tampering.
- Safety material changes when identity key, prekey bundle, rendezvous endpoint, or capabilities change.
- Session setup rejects wrong contact identity.
- Message ciphertext does not contain plaintext.
- Decryption fails on tampered ciphertext.
- Replay behavior remains enforced after replacing fake encryption.
- `dev-insecure` commands remain visibly separate from default builds.

## Implementation Sequence

1. Add production key type wrappers without changing CLI behavior. Done for the initial byte wrapper boundary.
2. Add test vectors for canonical transcript and signature verification. Initial integration fixtures are in place.
3. Add maintained signature dependency and replace dev pairing signatures behind a production feature or default path. `ed25519-dalek` stable 2.x is added to `crates/identity`; pairwise private key generation, pairing decoder wiring, and production pairing draft/payload construction are in place.
4. Add production safety material display boundary before selecting message encryption implementation. Initial SHA-256 display derivation is in place.
5. Add session establishment decision boundary and tests before selecting message encryption implementation. Initial `ProductionSessionPlan` and Noise XX smoke boundaries are in place.
6. Replace fake message encryption only after pairing identity verification is production-backed and the Noise/prekey material is carried through pairing payloads.
7. Keep development fake crypto behind `dev-insecure` for test ergonomics.

## Open Questions

- Which maintained Rust-compatible signature library should back pairwise identity?
- Is the current `snow` Noise XX direction acceptable after documenting how X25519 static private keys are stored, rotated, and bound to endpoint rotation?
- Should Phase 2 prioritize identity signatures first or full message session encryption first?
- How should production key material be stored before Phase 3 encrypted storage is complete?
- Which production session and replay state, if any, should be persisted after encrypted storage exists?
- What review threshold is required before any release artifact includes production crypto enabled by default?
