# Another Dimension Chat — Web-first prototype

English | [한국어](README.ko.md)

**A browser-local 1:1 encrypted-message prototype with no account, phone
number, contact discovery, central message store, or push dependency.**

The current product direction is a user-owned local server plus a browser UI.
The profile and message keys stay in the browser, encrypted local profile
material stays in IndexedDB, and each user's server only handles opaque sealed
envelopes.

> **Current status:** web-first experimental prototype. It is not audited, not
> production-ready, and not for sensitive communication. Each user may run a
> local server for direct opaque-envelope delivery; the server is not a central
> host.

## What works in the current web prototype

- Create and unlock a local browser profile with a passphrase.
- Export a signed public invite and verify a peer invite.
- Compare a deterministic safety phrase before messaging.
- Encrypt a message locally and export a sealed envelope.
- Import and decrypt a peer envelope locally.
- Reject an envelope imported twice.
- Persist profile material and transcript data in IndexedDB for later unlock.
- Send sealed envelopes to a peer's explicitly exchanged server endpoint.
- Sync and acknowledge sealed envelopes from the current user's local server.

The preferred delivery flow is user-owned server-to-server transport. Manual
invite and sealed-envelope copy/paste remains available when a server is not
running or is unreachable.

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

The same flow can be started from the repository root with
`./scripts/start_local_server.sh` after the web bundle is built.

Run a short two-server transport smoke check with:

```sh
node scripts/smoke_user_owned_servers.mjs
```

The default bind is `127.0.0.1:1422`. For a LAN or VPN deployment, set
`AD_BIND_HOST` explicitly, set `AD_PUBLIC_URL` to the address peers can reach,
and configure the network exposure yourself:

```sh
AD_BIND_HOST=0.0.0.0 AD_PUBLIC_URL=https://chat.example.test \
  npm --prefix apps/server start --workspaces=false
```

The server stores only bounded opaque envelopes and serves the static browser UI.

No ChatGPT Sites or central message hosting is required.

### Network choices

- Loopback (`127.0.0.1`, default): useful for local development and same-device
  testing; another device cannot reach it.
- LAN: bind to the machine's LAN interface or `0.0.0.0`, put an HTTPS reverse
  proxy in front of it, set `AD_PUBLIC_URL` to the HTTPS URL, and apply the host
  firewall policy. Plain HTTP LAN pages cannot use Web Crypto in normal browsers.
- VPN: advertise an HTTPS address (for example, an HTTPS reverse proxy bound to
  a Tailscale/WireGuard interface) in `AD_PUBLIC_URL`; the VPN supplies
  reachability, not this application.
- Public HTTPS: place the server behind a reverse proxy that you operate,
  configure HTTPS and access controls there, and advertise that HTTPS origin.

The server does not configure UPnP, port forwarding, TLS certificates,
authentication, anonymity, or availability automatically.

For a small self-managed setup, the server can also terminate HTTPS directly by
setting the paired `AD_TLS_KEY_FILE` and `AD_TLS_CERT_FILE` PEM paths. A
maintained reverse proxy remains preferable for public exposure.

For development only, generate a host/IP certificate with
`./scripts/generate_tls_cert.sh <host-or-ip>`. It is self-signed and must be
installed in the relevant devices' trust stores before a browser can accept it;
the script does not change system trust automatically.

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

Automatic relay delivery may be considered later as a separate opaque relay or
signaling service. It must not become a trusted holder of message plaintext,
private keys, or identity discovery, and WebRTC/IP exposure must be explicit.

## Validation

```sh
npm --prefix apps/web test --workspaces=false
npm --prefix apps/web run build --workspaces=false
```

The current Node integration test exercises two local profiles, invite
verification, Web Crypto envelope encryption/decryption, duplicate rejection,
tamper/replay boundaries, bounded inbox behavior, and unlock-based transcript
recovery. A two-origin in-app-browser smoke flow has also been run against two
local server processes.

## Security and support

Read [SECURITY.md](SECURITY.md) before using the prototype. Do not use it for
sensitive communication. Public support requests must not include invite
codes, envelopes, keys, passphrases, plaintext messages, raw logs, local
paths, or screenshots of private rooms.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), and the
[MIT license](LICENSE) for project conventions.
