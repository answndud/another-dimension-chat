# Randomness Decision

This document records the first public-safe randomness boundary for production pairing nonces.

Another Dimension Chat still does not have production cryptography. This document only covers pairing nonce generation. It does not decide production key generation, session establishment randomness, storage keys, backups, or release readiness.

## Decision

Use `getrandom` as the first OS-randomness dependency for production pairing nonces.

The production pairing nonce API is intentionally narrow:

```text
pn-v1-<32 lowercase hex chars>
```

The current nonce size is 16 random bytes encoded as lowercase hex with a fixed scheme prefix.

## Why This Boundary

Pairing nonces are included in canonical pairing payloads and are also used by the development store path today. They must therefore be:

- Generated from OS randomness in production paths.
- File-name safe.
- Distinguishable from development nonces.
- Free of profile names, timestamps, process IDs, or endpoint data.
- Small enough for QR pairing payloads.

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
- Do not log production nonce generation failures with sensitive environment details.
- Keep nonce strings lowercase, scheme-tagged, and file-name safe.
- Keep production key generation as a separate decision.

## Tests

Current tests cover:

- Production nonce prefix.
- Fixed encoded length.
- Lowercase hex body.
- Two generated nonces are not equal under normal OS randomness.

This is not statistical randomness testing. It only protects the API boundary and encoding invariants.
