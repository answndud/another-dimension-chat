# Another Dimension Chat — Source Build Primary

<p>
  <img src="https://img.shields.io/badge/status-source%20build%20primary-blue" alt="Source build primary">
  <img src="https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

English | [한국어](README.ko.md)

**A local-first 1:1 messenger beta that avoids accounts, phone numbers,
contact discovery, cloud message storage, and push-notification dependency.**

Built with **Rust** and **Tauri**. Current testing uses pairwise invite rooms,
safety material comparison, local encrypted storage, and manual sealed-message
exchange.

> **Current status:** source-build-primary macOS Apple Silicon beta. Not
> audited, not production-ready, and not for sensitive communication.

## What You Get Today

| Benefit | Current beta behavior |
|---------|-----------------------|
| No account setup | Create a local profile on your device |
| No public identifier | Pair with one person using an invite code |
| No central message storage | Messages stay local unless you export them |
| User-chosen delivery | Move sealed messages through any channel you choose |
| Clear safety step | Compare safety material before using the room |

## Source Build for macOS

The default install path is now source build.

If you want to run the app on macOS without relying on a GitHub Release DMG,
follow the source build guide:

- [Install from source on macOS](INSTALL_FROM_SOURCE_MACOS.md)

Short version:

```sh
git clone https://github.com/answndud/another-dimension-chat.git
cd another-dimension-chat
npm ci --prefix apps/desktop-tauri
npm --prefix apps/desktop-tauri run tauri:build:beta-onion
```

The built app bundle is under
`apps/desktop-tauri/src-tauri/target/release/bundle/macos/Another Dimension Chat.app`.

GitHub Release DMGs, when present, are optional unsigned convenience artifacts
for people who explicitly want that path. They are not the primary install
route.

## Legacy Download

> [**another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned**](https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned)

If you use a GitHub Release DMG, verify the checksum before opening it and
follow the current macOS manual allow flow only after verification.

## Quick Start

1. Create a local profile.
2. Create or join a pairwise room via invite code.
3. Compare safety material with the other person.
4. Write a message and export a sealed message (`encrypted envelope`).
5. Send that file/text through your own channel.
6. Import it on the other side, then reply the same way.

There is no central account, searchable username, contact discovery service,
message relay, cloud backup, or push notification service.

## Screenshots

<table>
<tr>
  <td><img src="reference/screenshots/macos-public-beta-first-run-desktop.png" width="320" alt="Create a local profile"></td>
  <td><img src="reference/screenshots/macos-public-beta-room-flow-desktop.png" width="320" alt="Create a pairwise room"></td>
  <td><img src="reference/screenshots/macos-public-beta-manual-envelope-desktop.png" width="320" alt="Export a sealed message"></td>
</tr>
<tr>
  <td align="center">Create a local profile</td>
  <td align="center">Share one invite code</td>
  <td align="center">Export a sealed message</td>
</tr>
</table>

[More screenshots](reference/screenshots/)

## Platforms

| Platform | Public status |
|----------|---------------|
| macOS Apple Silicon | Source build primary, unsigned DMG fallback |
| Windows | No public app yet |
| Android / iOS | No public app yet |

## Before Using

This beta makes **no security claim**. Experimental onion/network delivery is
explicit, fail-closed, and not a reliable delivery claim.

Read [SECURITY.md](SECURITY.md). For support, open a redacted public issue:
no invite codes, payloads, keys, raw logs, or screenshots of private room data.

## From Source

Follow the macOS install guide for the primary build path:

- [Install from source on macOS](INSTALL_FROM_SOURCE_MACOS.md)

Then run the local verification entrypoints from the repository root:

```sh
scripts/verify_all.sh   # light verify
scripts/verify_full.sh  # full pre-release verify
```

## Project Docs

| Need | Start here |
|------|------------|
| Security boundary | [SECURITY.md](SECURITY.md) |
| Support / bug reports | [SUPPORT.md](SUPPORT.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| License | [MIT](LICENSE) |
