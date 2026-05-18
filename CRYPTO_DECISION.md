# Crypto Decision Notes

Another Dimension Chat does not have production cryptography today.

This document records the public-safe Phase 2 decision boundary before any placeholder crypto is replaced. It is intentionally conservative: no production security claim should be made until the selected design has implementation, tests, review, and release discipline behind it.

## Current State

The repository currently has:

- A `CryptoSession` trait in `crates/crypto`.
- Development-only fake encryption behind `dev-insecure`.
- Pairwise identity types in `crates/identity`.
- Pairing payload canonicalization and signature boundary in `crates/pairing`.
- Padded envelope and replay window prototypes in `crates/protocol`.

The repository does not currently have:

- Real E2EE.
- A reviewed ratchet implementation.
- Real signature keys.
- Real key agreement.
- Production key storage.
- Production randomness policy.
- Production encrypted local storage.

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

## Candidate Direction

The current architecture points toward this first production boundary:

- Pairwise identity per contact.
- In-person QR pairing as the first supported setup path.
- Pairing payload includes identity material, signed session setup material, rendezvous endpoint, and capability commitments.
- Safety number derives from a canonical transcript that includes the identity and setup material.
- Message encryption is handled by a reviewed session construction, not by the CLI or UI.
- `dev-insecure` remains available only for development tests after production crypto is introduced.

This is a direction, not an approval to implement crypto from scratch.

## Prekey Question

The v0.1 product direction avoids a central identity or message server. That makes prekey distribution a first-class design decision.

Allowed options to evaluate:

- Include the first prekey bundle in the in-person QR pairing payload.
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

1. Add production key type wrappers without changing CLI behavior.
2. Add test vectors for canonical transcript and signature verification.
3. Add maintained signature dependency and replace dev pairing signatures behind a production feature or default path.
4. Add session establishment tests before selecting message encryption implementation.
5. Replace fake message encryption only after pairing identity verification is production-backed.
6. Keep development fake crypto behind `dev-insecure` for test ergonomics.

## Open Questions

- Which maintained Rust-compatible signature library should back pairwise identity?
- Which maintained session protocol implementation is acceptable for the first production prototype?
- Should Phase 2 prioritize identity signatures first or full message session encryption first?
- How should production key material be stored before Phase 3 encrypted storage is complete?
- What review threshold is required before any release artifact includes production crypto enabled by default?
