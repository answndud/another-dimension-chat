# Another Dimension local server

This is the user-owned development server. It serves the static browser bundle and
holds only opaque sealed envelopes in a capability-scoped inbox. It never receives
plaintext, profile keys, or passphrases.

```sh
npm --prefix apps/web run build
npm --prefix apps/server start
```

Defaults are loopback-only (`127.0.0.1:1422`). Configure deliberately when using
another device:

- `AD_BIND_HOST` — bind address; use a LAN/VPN address only when you understand the exposure.
- `AD_PORT` — listening port.
- `AD_PUBLIC_URL` — externally reachable HTTP(S) origin used in invites.
- `AD_SERVER_DATA_DIR` — private queue and capability storage directory.
- `AD_WEB_DIST_DIR` — browser bundle directory.
- `AD_INBOX_TTL_MS` — envelope retention period; default seven days.

The inbox is bounded to 256 items and 96 KiB per envelope. Restart recovery is
file-backed. A capability URL is equivalent to permission to submit/read that
inbox, so share invites only with the intended peer and rotate the data directory
if a capability is exposed. HTTPS, authentication, relay, port forwarding, and
anonymity are not provided automatically.
