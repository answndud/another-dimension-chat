# Security Policy

## Current Security Status

Another Dimension Chat is not ready for real communication.

The current public repository contains an early `dev-insecure` Rust prototype. It is useful for testing development flow and protocol boundaries, but it does not provide production-grade confidentiality, anonymity, metadata resistance, or endpoint protection.

Default-build production code now includes narrow decision boundaries for pairing, session setup, envelope handling, replay rejection, transport policy, a fail-closed onion transport adapter skeleton, storage policy tests, a SQLCipher-backed storage spike, passphrase unlock tests, high-risk unlock policy tests, first replay-window persistence tests, receive-flow replay commit-order tests, and session-scoped opaque replay record id derivation. These are implementation guardrails, not a secure messenger release.

Do not use this project to communicate sensitive information.

## Reporting Security Issues

If you find a security issue, please use GitHub's private vulnerability reporting feature if it is enabled for the repository.

If private vulnerability reporting is not enabled, open a minimal public issue that does not include exploit details or sensitive information, and ask for a private contact path.

## Non-Claims

This project does not currently claim:

- Real end-to-end encryption.
- Real Tor/onion transport.
- Production transport adapter implementation.
- Bridge or censorship-circumvention support.
- Arti transport bootstrap, onion service launch, system Tor discovery, runtime Tor connectivity, or bridge/censorship behavior.
- Onion service key generation, rotation, persistence, backup, or migration.
- Production unlock/key management.
- OS keychain/DPAPI/Keystore wrapping.
- Production encrypted local storage lifecycle.
- Durable production key storage.
- Durable production session persistence.
- Replay rollback protection against encrypted database snapshot restore.
- Protection against device compromise.
- Protection against coercion.
- Protection against malicious contacts.
- Protection against global traffic correlation.
- Security superiority over Signal.

## Development Expectations

- Keep development-only crypto, storage, and transport behavior behind `dev-insecure`.
- Preserve the `WARNING: dev-insecure build. Not for real communication.` runtime warning.
- Do not add new security claims without matching implementation, tests, and review.
- Keep high-risk transport policy onion-only unless a separate ADR changes that rule.
- Do not persist production private keys, replay state, message envelopes, local message indexes, or session transport state as plaintext.
- Do not publish private planning notes or sensitive threat-model details from ignored local documentation.
