# Security Policy

## Current Security Status

Another Dimension Chat is not ready for real communication.

The current public repository contains an early `dev-insecure` Rust prototype. It is useful for testing development flow and protocol boundaries, but it does not provide production-grade confidentiality, anonymity, metadata resistance, or endpoint protection.

Do not use this project to communicate sensitive information.

## Reporting Security Issues

If you find a security issue, please use GitHub's private vulnerability reporting feature if it is enabled for the repository.

If private vulnerability reporting is not enabled, open a minimal public issue that does not include exploit details or sensitive information, and ask for a private contact path.

## Non-Claims

This project does not currently claim:

- Real end-to-end encryption.
- Real Tor/onion transport.
- Production encrypted local storage.
- Protection against device compromise.
- Protection against coercion.
- Protection against malicious contacts.
- Protection against global traffic correlation.
- Security superiority over Signal.

## Development Expectations

- Keep development-only crypto, storage, and transport behavior behind `dev-insecure`.
- Preserve the `WARNING: dev-insecure build. Not for real communication.` runtime warning.
- Do not add new security claims without matching implementation, tests, and review.
- Do not publish private planning notes or sensitive threat-model details from ignored local documentation.
