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
- Establish `Noise_XX_25519_ChaChaPoly_BLAKE2s` through the existing Rust
  `snow` implementation compiled to browser WebAssembly.
- Compare a deterministic safety phrase before messaging.
- Encrypt a message locally and export a sealed envelope.
- Import and decrypt a peer envelope locally.
- Reject an envelope imported twice.
- Persist profile material and transcript data in IndexedDB for later unlock.
- Send sealed envelopes to a peer's explicitly exchanged server endpoint.
- Automatically receive and acknowledge sealed envelopes while the unlocked
  room is visible, with a manual Sync action for recovery.
- Keep the peer's invite capability write-only; queue read and ack require the
  owner's separate local-access capability.

The preferred delivery flow is user-owned server-to-server transport. Manual
invite and sealed-envelope copy/paste remains available when a server is not
running or is unreachable. Initial pairing exchanges four signed Noise control
envelopes (`init`, `reply`, `finish`, `ready`); this happens automatically while
both unlocked rooms are open, or through the same copy/paste fields in manual
mode. In manual mode, the sender of the final `ready` envelope confirms its
delivery in the UI before message controls are enabled.

## Run locally

```sh
npm ci --prefix apps/web --workspaces=false
npm --prefix apps/web run dev --workspaces=false
```

Open the local URL printed by Vite. The browser product lives in `apps/web`;
the local server product lives in `apps/server`; the Tauri package is an
optional desktop wrapper.

The generated Noise WebAssembly module is committed so a release build does
not compile Rust. When changing `crates/crypto` or `crates/web-crypto-wasm`,
regenerate it explicitly with `npm --prefix apps/web run build:crypto
--workspaces=false`. This requires the Rust WASM target and wasm-bindgen 0.2.121.

## Run a user-owned local server

Build the browser bundle, then start the server on the user's device:

```sh
npm --prefix apps/web run build --workspaces=false
./scripts/start_local_server.sh
```

Open the private local UI URL printed by the server, including its `#local=...`
fragment. A plain root URL intentionally runs in manual mode because it cannot
read or advertise the inbox capability. Treat the printed local UI URL as a
secret and never include it in logs, screenshots, or support reports.

The first run is loopback-only. To choose a peer-reachable HTTPS setup without
assembling environment variables, run the guided setup; it saves a private
configuration and immediately starts the server:

```sh
./scripts/start_local_server.sh --setup
```

Choose an existing HTTPS reverse proxy/Tailscale Serve route or direct HTTPS
with your own PEM certificate and key. Later runs use the saved configuration
with plain `./scripts/start_local_server.sh`.

To create a self-contained release archive:

```sh
./scripts/build_release.sh
tar -xzf public-release/another-dimension-0.1.0.tar.gz
cd another-dimension-0.1.0
./scripts/start_local_server.sh
```

The archive contains the built browser bundle and server runtime; the extracted
user does not need Vite or the source repository. Node.js 20 or newer is required.

Run a short two-server transport smoke check with:

```sh
node scripts/smoke_user_owned_servers.mjs
```

The default bind is `127.0.0.1:1422`. A setup can also be scripted while keeping
the same validated configuration path:

```sh
./scripts/start_local_server.sh --setup \
  --mode reverse-proxy --public-url https://chat.example.test --port 1422
```

The public URL must be an HTTPS origin containing only a scheme and host (plus
an optional port), without a path, credentials, query, or fragment. This makes
the invite address explicit; it does not configure DNS, a firewall, or
reverse-proxy reachability. Existing `AD_*` environment variables remain an
advanced compatibility path when no saved config exists.

The server stores only bounded opaque envelopes and serves the static browser UI.

No ChatGPT Sites or central message hosting is required.

### Network choices

- Loopback (`127.0.0.1`, default): useful for local development and same-device
  testing; another device cannot reach it.
- LAN: bind to the machine's LAN interface or `0.0.0.0`, put an HTTPS reverse
  proxy in front of it, configure that HTTPS origin through guided setup, and
  apply the host firewall policy. Plain HTTP LAN pages cannot use Web Crypto in
  normal browsers.
- Local UI + LAN API (development only): open each user's UI from that user's
  `localhost` server, while the invite points to the peer's LAN inbox. The
  sealed envelope remains encrypted, but an HTTP capability URL can be observed
  or abused to inject/drop opaque traffic. Use only on a controlled network;
  use HTTPS for production.
- VPN: advertise an HTTPS address (for example, an HTTPS reverse proxy bound to
  a Tailscale/WireGuard interface) through guided setup; the VPN supplies
  reachability, not this application.
- Public HTTPS: place the server behind a reverse proxy that you operate,
  configure HTTPS and access controls there, and advertise that HTTPS origin.

The server does not configure UPnP, port forwarding, TLS certificates,
authentication, anonymity, or availability automatically.

For a small self-managed setup, guided `direct-tls` mode lets the server
terminate HTTPS with paired PEM key and certificate paths. A maintained reverse
proxy remains preferable for public exposure.

For development only, generate a host/IP certificate with
`./scripts/generate_tls_cert.sh <host-or-ip>`. It is self-signed and must be
installed in the relevant devices' trust stores before a browser can accept it;
the script does not change system trust automatically.

After configuring a publicly trusted, non-loopback HTTPS endpoint, check its
certificate, health, advertised origin, public opaque delivery, private read,
and private ack:

```sh
node scripts/check_https_endpoint.mjs https://chat.example.test
```

The command rejects HTTP, localhost, untrusted certificates, and a server that
advertises another origin. A two-user invite exchange and message round trip in
real browsers remains the final user acceptance. Set `AD_SERVER_DATA_DIR`,
`AD_PORT`, or `AD_LOCAL_URL` when checking a non-default local configuration.

## Web security boundary

The browser runtime uses Web Crypto for P-256 invite/envelope signatures and
passphrase wrapping, and the existing Rust `snow` implementation for Noise XX
setup and message encryption. Private Noise state, nonces, and transcript
records are passphrase-wrapped in IndexedDB. The serverless/manual flow does not
upload private keys, passphrases, plaintext messages, or message transcripts.
Browser storage and unlocked browser memory are still exposed to the device,
browser profile, extensions, and local malware.

This prototype does not claim production E2EE, anonymity, reliable delivery,
secure deletion, backup recovery, rollback protection, or protection from a
compromised endpoint. Noise is used without a message ratchet, independent
security audit, or post-compromise recovery; this is not equivalent to a
reviewed Signal deployment.

Protocol-v2 profiles use a separate IndexedDB database. Existing v1 browser
profiles are left untouched but are not loaded; create fresh profiles and pair
again after upgrading.

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

The current Node integration test exercises two local profiles, signed invite
verification, the four-message Noise XX setup, encrypted message exchange,
duplicate rejection, nested-field tamper/replay boundaries, protected inbox
access, and unlock-based session/transcript recovery. A two-origin
in-app-browser flow is also used against two local server processes.

## Security and support

Read [SECURITY.md](SECURITY.md) before using the prototype. Do not use it for
sensitive communication. Public support requests must not include invite
codes, envelopes, keys, passphrases, plaintext messages, raw logs, local
paths, or screenshots of private rooms.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), and the
[MIT license](LICENSE) for project conventions.
