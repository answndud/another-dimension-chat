# Another Dimension Chat — Web-first prototype

English | [한국어](README.ko.md)

**A browser-local 1:1 encrypted-message prototype with no account, phone
number, contact discovery, central message store, or push dependency.**

The current product direction is a static web app. It creates the profile and
message keys in the browser, stores encrypted local profile material in
IndexedDB, and moves signed invites and sealed message envelopes through a
channel chosen by the users.

> **Current status:** web-first experimental prototype. It is not audited, not
> production-ready, and not for sensitive communication. Public hosting and
> reliable automatic delivery are not available yet.

## What works in the current web prototype

- Create and unlock a local browser profile with a passphrase.
- Export a signed public invite and verify a peer invite.
- Compare a deterministic safety phrase before messaging.
- Encrypt a message locally and export a sealed envelope.
- Import and decrypt a peer envelope locally.
- Reject an envelope imported twice.
- Persist profile material and transcript data in IndexedDB for later unlock.

The default delivery flow is manual: copy an invite or sealed envelope and
send it through a channel you choose. The app does not run a message server.

## Run locally

```sh
npm ci --prefix apps/desktop-tauri
npm --prefix apps/desktop-tauri run dev
```

Open the local URL printed by Vite. The current source location is retained
temporarily for the web migration; the next deployment slice will move the
web surface to a dedicated `apps/web` package and static hosting configuration.

## Web security boundary

The browser runtime uses Web Crypto and IndexedDB. The serverless/manual flow
does not upload private keys, passphrases, plaintext messages, or message
transcripts. Browser storage and unlocked browser memory are still exposed to
the device, browser profile, extensions, and local malware.

This prototype does not claim production E2EE, anonymity, reliable delivery,
secure deletion, backup recovery, rollback protection, or protection from a
compromised endpoint. The current browser cryptographic flow is a prototype
boundary and is not equivalent to a reviewed Signal or Noise deployment.

## Deliberately not included yet

- Accounts, phone numbers, email identity, searchable usernames, and contact discovery
- Central message relay, push notifications, cloud backup, and account recovery
- Automatic online delivery, WebRTC, Tor/onion transport, and offline mailbox
- Group chat, files, calls, and multi-device synchronization
- Public hosting, signed releases, notarization, and production security claims

Automatic delivery may be considered later as a separate opaque relay or
signaling service. It must not become a trusted holder of message plaintext,
private keys, or identity discovery, and WebRTC/IP exposure must be explicit.

## Validation

```sh
npm --prefix apps/desktop-tauri test
npm --prefix apps/desktop-tauri run build
```

The current Node integration test exercises two local profiles, invite
verification, Web Crypto envelope encryption/decryption, duplicate rejection,
and unlock-based transcript recovery. Browser-context acceptance is still
pending a locally installed browser automation binary.

## Security and support

Read [SECURITY.md](SECURITY.md) before using the prototype. Do not use it for
sensitive communication. Public support requests must not include invite
codes, envelopes, keys, passphrases, plaintext messages, raw logs, local
paths, or screenshots of private rooms.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), and the
[MIT license](LICENSE) for project conventions.
