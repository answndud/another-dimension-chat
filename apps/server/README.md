# Another Dimension local server

This is the user-owned development server. It serves the static browser bundle and
holds only opaque sealed envelopes in a capability-scoped inbox. It never receives
plaintext, profile keys, or passphrases.

```sh
npm --prefix apps/web run build --workspaces=false
npm --prefix apps/server start --workspaces=false
```

For a source-independent archive, run `./scripts/build_release.sh` from the
repository root and start the extracted `scripts/start_local_server.sh`.

Defaults are loopback-only (`127.0.0.1:1422`). Configure deliberately when using
another device. The browser UI must be opened from HTTPS (except localhost), so
put an HTTPS reverse proxy in front of the HTTP server for LAN/VPN/public use:

- `AD_BIND_HOST` — bind address; use a LAN/VPN address only when you understand the exposure.
- `AD_PORT` — listening port.
- `AD_PUBLIC_URL` — externally reachable HTTP(S) origin used in invites.
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
file-backed. A capability URL is equivalent to permission to submit/read that
inbox, so share invites only with the intended peer and rotate the data directory
if a capability is exposed. Authentication, relay, port
forwarding, and anonymity are not provided automatically. Plain HTTP remote
pages cannot use the browser's Web Crypto APIs in normal browsers.
