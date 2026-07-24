# Another Dimension local server

This is the user-owned relay server. In its default mode it exposes only the
health/info/inbox API and holds opaque sealed envelopes in a capability-scoped
inbox. It never receives plaintext, profile keys, or passphrases. It does not
serve the browser bundle unless the explicit development-only `serveStatic`
option or `AD_SERVE_UI=1` is enabled.

```sh
./scripts/start_local_server.sh
```

Serve the browser UI from a separately verified static release. The combined
server/UI mode is for local development only:

```sh
AD_SERVE_UI=1 npm --prefix apps/web run build --workspaces=false
AD_SERVE_UI=1 ./scripts/start_local_server.sh
```

Run `./scripts/start_local_server.sh --setup` for a guided local,
reverse-proxy/Tailscale Serve, or direct-TLS configuration. It validates and
saves `.another-dimension-server/server-config.json` with owner-only
permissions, then starts the server. Later starts reuse it automatically.

The web bundle includes the committed Rust `vodozemac` Olm WebAssembly module.
Only crypto-source changes require `npm --prefix apps/web run build:crypto
--workspaces=false`; ordinary server starts and release builds do not compile Rust.

The private URL file contains a `#relay=...&local=...` fragment. The `local`
value authorizes the browser to read the inbox setting and is a bearer secret.
Use it only with a separately verified browser UI. Never share or log it.

For a source-independent archive, run `./scripts/build_release.sh` from the
repository root and start the extracted `scripts/start_local_server.sh`.

Defaults are loopback-only (`127.0.0.1:1422`). Configure deliberately when using
another device. The browser UI must be opened from HTTPS (except localhost), so
put an HTTPS reverse proxy in front of the HTTP server for LAN/VPN/public use:

- `AD_BIND_HOST` — bind address; use a LAN/VPN address only when you understand the exposure.
- `AD_PORT` — listening port.
- `AD_PUBLIC_URL` — externally reachable HTTP(S) origin used in invites. It
  must contain only a scheme and host (plus an optional port), with no path,
  credentials, query, or fragment. It is required with `0.0.0.0`.
- `AD_SERVER_DATA_DIR` — private queue and capability storage directory.
- `AD_WEB_DIST_DIR` — browser bundle directory.
- `AD_INBOX_TTL_MS` — envelope retention period; default seven days.
- `AD_TLS_KEY_FILE` and `AD_TLS_CERT_FILE` — optional paired PEM files for
  direct HTTPS termination. Prefer a maintained reverse proxy for public
  exposure; never commit or share these files.

For development, `./scripts/generate_tls_cert.sh <host-or-ip>` creates a
self-signed certificate. Install it in the browser device trust stores before
testing; do not use this certificate workflow as a production PKI.

The inbox is bounded to 256 items and 96 KiB per envelope. Restart recovery is
file-backed. The invite capability permits submission only; queue reads and
acknowledgements additionally require the private local-access capability.
Share invites only with the intended peer and rotate the data directory if
either capability is exposed. Authentication, relay, port
forwarding, and anonymity are not provided automatically. Plain HTTP remote
pages cannot use the browser's Web Crypto APIs in normal browsers.

After configuring a publicly trusted, non-loopback HTTPS endpoint, check the
certificate, advertised invite origin, delivery, read, and acknowledgement:

```sh
node scripts/check_https_endpoint.mjs https://chat.example.test
```

This rejects localhost, HTTP, untrusted certificates, and an advertised inbox
on a different origin. It does not configure DNS, a VPN, the firewall,
certificates, or a reverse proxy. Set `AD_SERVER_DATA_DIR`, `AD_PORT`, or
`AD_LOCAL_URL` when the local server does not use its defaults.
