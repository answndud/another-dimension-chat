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

This is only a candidate direction. The next code change should add test scaffolding around a `ProductionSession` boundary before adding any session dependency.
