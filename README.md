# Another Dimension Chat — Web-first prototype

English | [한국어](README.ko.md)

**A browser-local 1:1 encrypted-message prototype with no account, phone
number, contact discovery, central message store, or push dependency.**

The current product direction is a user-owned local server plus a browser UI.
The profile and message keys stay in the browser, encrypted local profile
material stays in IndexedDB, and each user's server only handles opaque sealed
envelopes.

> **Current status:** web-first experimental prototype. It is not audited, not
> production-ready, and not for sensitive communication. Hosting is an
> optional user-owned deployment concern; reliable automatic delivery is not
> available.

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
npm ci --prefix apps/web --workspaces=false
npm --prefix apps/web run dev --workspaces=false
```

Open the local URL printed by Vite. The browser product lives in `apps/web`;
the local server product lives in `apps/server`; the Tauri package is an
optional desktop wrapper.

## Run a user-owned local server

Build the browser bundle, then start the server on the user's device:

```sh
npm --prefix apps/web run build --workspaces=false
npm --prefix apps/server start --workspaces=false
```

The default bind is `127.0.0.1:1422`. For a LAN or VPN deployment, set
`AD_BIND_HOST` explicitly, set `AD_PUBLIC_URL` to the address peers can reach,
and configure the network exposure yourself:

```sh
AD_BIND_HOST=0.0.0.0 AD_PUBLIC_URL=http://192.168.1.20:1422 \
  npm --prefix apps/server start --workspaces=false
```

The server stores only bounded opaque envelopes and serves the static browser UI.

No ChatGPT Sites or central message hosting is required.

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
- Automatic WebRTC, Tor/onion transport, and offline mailbox
- Group chat, files, calls, and multi-device synchronization
- Signed releases, notarization, and production security claims

Automatic delivery may be considered later as a separate opaque relay or
signaling service. It must not become a trusted holder of message plaintext,
private keys, or identity discovery, and WebRTC/IP exposure must be explicit.

## Validation

```sh
npm --prefix apps/web test --workspaces=false
npm --prefix apps/web run build --workspaces=false
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
