# Support

Another Dimension Chat is a web-first experimental prototype. It is not
audited, not production-ready, and sensitive communication is prohibited.
Each user may run the local server on their own device; local development uses
the Vite web runtime or the bundled static server. The old macOS DMG is a
legacy artifact, not the primary product path.

## Public support

Keep reports redacted and limited to:

- app version or commit
- browser and platform
- broad failure class
- recovery action reached
- whether the local web build loaded
- whether the local server health endpoint loaded
- whether the peer endpoint was loopback, LAN, VPN, or reverse-proxy HTTPS
- whether `scripts/check_https_endpoint.mjs` passed, without including its URL

Never post invite codes, sealed envelopes, message text, safety phrases,
profile names, passphrases, private keys, browser storage exports, raw logs,
local paths, crash dumps, private local UI URLs, or screenshots of private rooms.

## Recovery boundary

- If the peer server is unreachable, use the prepared outgoing envelope in the
  manual copy/paste flow; a failed automatic send is not recorded as delivered.
- After a server restart or endpoint change, create and exchange a fresh signed
  invite. Existing queued envelopes remain available only when the same data
  directory is retained.
- If an inbox capability is exposed, stop the server and start with a new data
  directory. Retain the old queue privately only as long as recovery requires.

## Security reports

Use GitHub private vulnerability reporting when available. If it is
unavailable, publish only a minimal redacted request for a private contact
path. Do not include exploit details or sensitive material in a public issue.

## Legacy macOS artifacts

The repository contains historical macOS installation notes and release
artifacts. They are not the current product distribution route and do not
represent web hosting, production readiness, or a security guarantee.
