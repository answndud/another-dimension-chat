# Another Dimension Chat — Unsigned Public Beta

<p>
  <img src="https://img.shields.io/badge/status-unsigned%20beta-orange" alt="Status">
  <img src="https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-UNLICENSED-red" alt="License">
</p>

English | [한국어](README.ko.md)

**Experimental local-first 1:1 private messenger.**
Unsigned public beta — not audited, not production-ready.
Do not use for sensitive communication.

No phone number, email, global account, contact discovery, message relay,
push notification, or cloud backup. Built with **Rust** and **Tauri**.

## Screenshots

<table>
<tr>
  <td><img src="reference/screenshots/macos-public-beta-first-run-desktop.png" width="320" alt="First run"></td>
  <td><img src="reference/screenshots/macos-public-beta-room-flow-desktop.png" width="320" alt="Pairwise room"></td>
  <td><img src="reference/screenshots/macos-public-beta-manual-envelope-desktop.png" width="320" alt="Manual envelope"></td>
</tr>
<tr>
  <td align="center">Profile creation</td>
  <td align="center">Pairwise room &amp; invite</td>
  <td align="center">Envelope export</td>
</tr>
</table>

[More screenshots](reference/screenshots/)

## Download

> [**another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned**](https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned)

**2 files** to download from Assets:

| File | Purpose |
|------|---------|
| `*.dmg` | The app |
| `*.dmg.sha256` | Checksum for verification |

Verify before opening:

```sh
shasum -a 256 -c *.dmg.sha256
```

Proceed only if output is `OK`. If macOS blocks the unsigned app, allow via
System Settings > Privacy & Security.

## Quick Start

1. Create a local profile.
2. Create or join a pairwise room via invite code or QR.
3. Compare safety material with the other person.
4. Write a message → export encrypted envelope.
5. Send the envelope through your own channel (Signal, email, etc.).
6. Import the envelope on the other side.

## Platforms

**macOS Apple Silicon** (unsigned DMG). Windows, Android, iOS: source-only.

## Before Using

This beta makes **no security claim**. Read [SECURITY.md](SECURITY.md). For
support, open a redacted public issue — no invite codes, payloads, keys, or
raw logs.

## From Source

```sh
git clone https://github.com/answndud/another-dimension-chat.git
cd another-dimension-chat
scripts/verify_all.sh   # light verify
scripts/verify_full.sh  # full pre-release verify
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more.
