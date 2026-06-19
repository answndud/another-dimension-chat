# Another Dimension Chat

[![Verify](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml/badge.svg)](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml)
[![Release](https://img.shields.io/badge/release-unsigned%20macOS%20beta-orange)](https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned)

English | [한국어](README.ko.md)

**Unsigned experimental public beta — not audited, not production-ready.
Do not use for sensitive communication.**

A local-first 1:1 private messenger experiment built with Rust and Tauri. No
phone number, email, global account, contact discovery, message relay, push
notification, or cloud backup required.

## Download

<https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>

Download and verify:

```bash
# Download both files, then:
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Proceed only if output is `OK`. If macOS blocks the unsigned app, allow it via
System Settings > Privacy & Security. Do not use terminal quarantine-removal.

## Quick Start

1. Create a local profile.
2. Create or join a pairwise room (invite code or QR).
3. Compare safety material with the other person.
4. Write a message and export the encrypted envelope.
5. Send the envelope through your own channel.
6. Import the envelope on the other side.

## Platform

macOS Apple Silicon (unsigned DMG). Windows, Android, iOS: source-only.

## Before Using

This beta makes **no security claim**. Read [SECURITY.md](SECURITY.md). For
support, open a redacted public issue — no invite codes, payloads, keys, or
raw logs.

## Build & Contribute

- Light verify: `scripts/verify_all.sh`
- Full verify: `scripts/verify_full.sh`
- Read [CONTRIBUTING.md](CONTRIBUTING.md)

## License

UNLICENSED
