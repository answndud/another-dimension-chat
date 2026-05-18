# Safety Material Decision

This document records the first public-safe production safety material display boundary.

Another Dimension Chat still does not have production message encryption. This decision only covers deriving display material from a canonical safety transcript so users can compare pairing state. It is not a ratchet, key agreement, message encryption, or authentication UX audit.

## Decision

Use `sha2` 0.10.9 as the first maintained hash dependency for production safety material display.

The current API derives:

- A numeric safety number from `SHA-256("AD-SAFETY-NUMBER-V1" || 0x00 || transcript)`.
- A short display phrase from `SHA-256("AD-SAFETY-PHRASE-V1" || 0x00 || transcript)`.

The two domain strings are intentionally separate so number and phrase displays do not reuse the same digest stream.

## Dependency

- Crate: `sha2`
- Version line: `0.10.9`
- Crates.io: <https://crates.io/crates/sha2/0.10.9>
- Docs: <https://docs.rs/sha2>
- Repository: <https://github.com/RustCrypto/hashes>
- License: MIT OR Apache-2.0

Metadata was checked with `cargo search` and `cargo info` on 2026-05-18.

## Required Rules

- Do not use the `dev-insecure` fake hash for production safety material.
- Do not derive safety material from non-canonical or unsigned pairing payloads.
- Keep number and phrase derivation domain-separated.
- Do not treat safety material derivation as message encryption, key agreement, or transport anonymity.
- Do not claim this display format has completed usability review.

## Tests

Current tests cover:

- Stable production safety material test vector.
- Safety material changes when the transcript changes.

Pairing tests separately cover that production transcripts are order-independent and sensitive to identity, endpoint, prekey, and capability changes.
