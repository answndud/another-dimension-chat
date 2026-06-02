# Randomness Decision

This document records the first public-safe randomness boundaries for production pairing nonces and Ed25519 pairwise private key seeds.

Another Dimension Chat still does not have production cryptography. This document covers only pairing nonce generation and Ed25519 pairwise private key seed generation. It does not decide session establishment randomness, storage keys, backups, or release readiness.

## Decision

Use `getrandom` as the first OS-randomness dependency for production pairing nonces and Ed25519 pairwise private key seeds.

The production pairing nonce API is intentionally narrow:

```text
pn-v1-<32 lowercase hex chars>
```

The current nonce size is 16 random bytes encoded as lowercase hex with a fixed scheme prefix.

A higher-level production pairing default helper uses this nonce API and the local system clock to fill nonce, timestamp, TTL, endpoint rotation policy, and capability defaults. A production pairing draft helper combines this with generated Ed25519 key material and returns the key plus signed payload to the caller. Rendezvous endpoint and prekey material remain caller-supplied because transport and session-establishment decisions are not complete.

## Why This Boundary

Pairing nonces are included in canonical pairing payloads and are also used by the development store path today. They must therefore be:

- Generated from OS randomness in production paths.
- File-name safe.
- Distinguishable from development nonces.
- Free of profile names, timestamps, process IDs, or endpoint data.
- Small enough for invite-code pairing payloads.

This boundary does not expose a general-purpose random byte API to the rest of the project.

## Dependency

- Crate: `getrandom`
- Version line: `0.4.2`
- Crates.io: <https://crates.io/crates/getrandom/0.4.2>
- Docs: <https://docs.rs/getrandom>
- Repository: <https://github.com/rust-random/getrandom>
- License: MIT OR Apache-2.0

Metadata was checked with `cargo search` and `cargo info` on 2026-05-18.

## Required Rules

- Do not use development nonce generation in production pairing construction.
- Do not derive production nonces from profile names, timestamps, process IDs, endpoints, or key material.
- Do not use this pairing nonce API as a key generator.
- Generate Ed25519 pairwise private key seeds through the dedicated identity API, not through ad hoc callers.
- Do not hide rendezvous endpoint or prekey decisions behind the nonce/defaults helper.
- Do not persist, export, or back up generated private keys inside the draft helper.
- Do not log production nonce generation failures with sensitive environment details.
- Keep nonce strings lowercase, scheme-tagged, and file-name safe.
- Keep production key generation as a separate decision.

## Tests

Current tests cover:

- Production nonce prefix.
- Fixed encoded length.
- Lowercase hex body.
- Two generated nonces are not equal under normal OS randomness.
- Default production pairing params use generated nonce, local timestamp, default TTL, default endpoint rotation policy, and default capability string.
- Two generated Ed25519 pairwise private keys differ under normal OS randomness and can sign/verify pairing payload bytes.
- Production pairing draft construction returns a generated private key and decodeable signed payload.

This is not statistical randomness testing. It only protects the API boundary and encoding invariants.
