# Security Policy

## Current Security Status

Another Dimension Chat is not ready for real communication.

The current public repository contains a Rust/Tauri prototype and a local desktop beta candidate. It is useful for testing development flow, local encrypted-store boundaries, invite-room recovery, explicit private-delivery actions, and fail-closed onion/Tor attempt behavior, but it does not provide production-grade confidentiality, anonymity, metadata resistance, endpoint protection, or user safety.

Default-build production code now includes narrow decision boundaries for pairing, session setup, envelope handling, replay rejection, transport policy, fail-closed onion transport behavior, pre-network transport blockers, backup-exclusion verification boundaries, onion service key lifecycle policy boundaries, onion service launch preflight boundaries, bridge/censorship readiness policy boundaries, bootstrap execution boundaries, bounded Arti adapter spikes, local-only manual bootstrap gates, profile-scoped transport directory resolution, persistent Arti client lifecycle ownership, storage policy tests, SQLCipher-backed storage work, passphrase unlock tests, high-risk unlock policy tests, replay-window persistence tests, receive-flow replay commit-order tests, session-scoped opaque replay record-id derivation, and desktop beta recovery UI checks. These are implementation guardrails, not a secure messenger release.

The public cross-component replacement inventory is tracked in `reference/COMPONENT_BOUNDARIES.md`. It is a boundary map for future work, not a production-readiness statement.

Do not use this project to communicate sensitive information.

## Reporting Security Issues

If you find a security issue, please use GitHub's private vulnerability reporting feature if it is enabled for the repository.

If private vulnerability reporting is not enabled, open a minimal public issue that does not include exploit details or sensitive information, and ask for a private contact path.

## Non-Claims

This project does not currently claim:

- Secure production end-to-end encryption.
- Reliable real-network Tor/onion delivery.
- Audited production transport adapter implementation.
- Audited bridge or censorship-circumvention support.
- Production-ready Arti transport bootstrap, onion service launch, system Tor discovery, runtime Tor connectivity, or bridge/censorship behavior.
- Onion service key generation, rotation, persistence, backup, or migration.
- Actual onion service private key material.
- Production unlock/key management.
- OS keychain/DPAPI/Keystore wrapping.
- Complete production encrypted local storage lifecycle.
- Durable production key storage.
- Durable production session persistence.
- Replay rollback protection against encrypted database snapshot restore.
- Signed, notarized, reproducible, auto-updating, or supply-chain-reviewed releases.
- External audit, independent review, or public user safety signoff.
- Protection against device compromise.
- Protection against coercion.
- Protection against malicious contacts.
- Protection against global traffic correlation.
- Security superiority over Signal.

## Beta Distribution Boundary

Internal beta artifacts are for field testing only. A beta handoff may exercise local encrypted stores, invite-room recovery, explicit receive start/stop, retry/cancel recovery, and explicit onion/Tor attempts, but it must not be described as secure, anonymous, audited, hardened, or suitable for sensitive communication.

Beta artifacts must not include local app data, private planning notes, bridge lines, onion endpoints, plaintext messages, passphrases, private keys, raw diagnostic logs, build caches, or ignored `beta-artifacts/` contents in the public repository.

## Development Expectations

- Keep development-only crypto, storage, and transport behavior behind `dev-insecure`.
- Preserve the `WARNING: dev-insecure build. Not for real communication.` runtime warning.
- Do not add new security claims without matching implementation, tests, and review.
- Keep high-risk transport policy onion-only unless a separate ADR changes that rule.
- Do not persist production private keys, replay state, message envelopes, local message indexes, or session transport state as plaintext.
- Do not publish private planning notes or sensitive threat-model details from ignored local documentation.
