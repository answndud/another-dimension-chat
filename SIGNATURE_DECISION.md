# Identity Signature Decision

This document records the first Phase 2 identity signature dependency decision.

Another Dimension Chat still does not have production cryptography. This document is a dependency selection boundary, not a security claim.

## Decision

Use `ed25519-dalek` 2.x as the first production identity signature candidate.

Do not add the crate to `Cargo.toml` until the implementation commit also adds tests that prove the production boundary is being used.

Initial target:

- Crate: `ed25519-dalek`
- Version line: stable `2.x`, starting from `2.2.0`
- Crates.io: <https://crates.io/crates/ed25519-dalek/2.2.0>
- Docs: <https://docs.rs/ed25519-dalek>
- Repository: <https://github.com/dalek-cryptography/curve25519-dalek/tree/main/ed25519-dalek>
- License: BSD-3-Clause

The crates.io latest at the time of this decision is `3.0.0-pre.7`. That pre-release line is not the initial target.

## Why Ed25519

Ed25519 is a reasonable first fit for the current pairing model:

- Pairing payloads need compact identity signatures.
- QR payload size matters.
- Signature verification should be deterministic and testable.
- The first pairing path is in-person QR, not public directory lookup.
- Pairwise identity per contact is already the project direction.

This does not decide message encryption, ratcheting, key agreement, storage encryption, or transport anonymity.

## Candidates Reviewed

| Candidate | Current observed version | Fit | Decision |
| --- | ---: | --- | --- |
| `ed25519-dalek` | `2.2.0`, latest `3.0.0-pre.7` | General Ed25519 signing and verification, pure Rust, common Rust ecosystem choice. | Select stable 2.x as first target. |
| `ed25519-zebra` | `4.2.0` | Zcash-flavored Ed25519 for Zebra. Good project, but narrower domain fit. | Do not select first. |
| `ed25519-consensus` | `2.1.0` | Consensus-critical Ed25519. Strong niche fit, but narrower API goal than this pairing boundary. | Keep as fallback candidate. |
| `ring` | `0.17.14` | Broad crypto library. Lower Rust API fit for this narrow identity-signature boundary. | Do not select first. |

Metadata was checked with `cargo search` and `cargo info` on 2026-05-18.

## Required Implementation Rules

When `ed25519-dalek` is added:

- Add it only to `crates/identity`.
- Prefer a narrow feature set; do not enable serialization features unless tests require them.
- Keep `dev-insecure` placeholder signing available only for dev/test flows.
- Do not allow `dev-pub-*`, `dev-priv-*`, or `dev-sign-v1-*` material into production key wrappers.
- Keep private key debug output redacted.
- Add deterministic test vectors before wiring the pairing decoder to production verification.

## Minimum Tests For The First Implementation Commit

The first implementation commit that adds `ed25519-dalek` must include tests for:

- Generating or constructing a production signing key.
- Signing canonical pairing payload bytes.
- Verifying the signature with the matching production public key.
- Rejecting tampered canonical bytes.
- Rejecting a mismatched public key.
- Rejecting development placeholder key material in production wrappers.
- Proving debug output does not print private key bytes.

## Deferred Decisions

Not decided here:

- X25519 or PQ key agreement.
- Signal-style ratchet vs Noise-based message session.
- Prekey bundle format.
- Production local key storage.
- Session backup or migration.
- Onion transport authentication.

Those decisions stay in Phase 2/Phase 3 until they have their own tests and implementation boundary.
