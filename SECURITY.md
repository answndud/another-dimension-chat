# Security Policy

## Current status

Another Dimension Chat is an experimental web-first prototype and is not
ready for real communication. It is not audited, not production-ready, and
not for sensitive communication.

The current direction is a user-owned local server plus a browser UI. No
ChatGPT Sites project or central message host is required by the product. The
Tauri desktop target is a secondary development wrapper, not the current
product distribution boundary.

## Current web behavior

- Profile private material is generated in the browser.
- Profile private material is encrypted with a passphrase before IndexedDB storage.
- Peer invites are signed and verified locally.
- Messages are encrypted locally and exchanged as sealed envelopes.
- Transcript records remain in browser-local storage for the current profile.
- No central message server, push service, cloud backup, or account recovery exists.
- A user-owned local server may store bounded opaque sealed envelopes for that
  user's inbox; it is not trusted with plaintext or private keys.
- The inbox capability is returned only when the browser presents the separate
  local-access capability from the private `#local=...` startup URL. Opening the
  public root URL does not disclose or advertise the inbox.
- The browser can POST a sealed envelope to the peer endpoint in a signed invite
  and can GET/ack its own local inbox; endpoint reachability is a network
  configuration concern, not an identity or confidentiality guarantee.
- Remote browser origins must use HTTPS (localhost is the development exception)
  because Web Crypto is unavailable in ordinary insecure HTTP contexts.
- `AD_PUBLIC_URL` is only an advertised origin. HTTPS in that setting means the
  operator asserts that a trusted reverse proxy or direct TLS endpoint exists;
  it does not prove reachability or certificate trust. The endpoint check and
  a two-browser exchange are required before relying on that route.
- A localhost UI may reach an HTTP LAN inbox for controlled development testing,
  but the capability URL and network metadata are then exposed to the LAN and
  an attacker can inject or drop opaque envelopes. This is not a production
  HTTPS transport claim.

These are implementation behaviors, not proof of secure messenger readiness.

## Non-claims

This prototype does not claim:

- audited or production-ready security
- safety for sensitive communication
- Signal-level, Noise-level, or equivalent security
- anonymity, untraceability, or protection from global traffic correlation
- reliable automatic delivery, Tor/onion delivery, or censorship resistance
- secure deletion, backup recovery, rollback protection, or multi-device recovery
- protection from compromised browsers, extensions, devices, local malware, or coercion

Web Crypto and IndexedDB do not protect an unlocked browser session or a
compromised endpoint. Browser support, browser implementation details, and
storage behavior must be verified before any stronger claim is considered.

## Online delivery boundary

The current direct delivery path uses user-owned capability inboxes. If a relay
or signaling service is added later, it must be treated as an untrusted
transport component. It must not receive plaintext messages, private keys,
passphrases, or centralized contact discovery data. WebRTC and any direct
network path must make IP and metadata exposure explicit.

Treat an inbox capability URL as a bearer secret: anyone who learns it can read,
submit, acknowledge, or delete opaque envelopes. Do not put it in logs, support
reports, screenshots, public proxy configuration, or monitoring URLs. If it is
exposed, stop the server, move the old data directory aside, and start with a
new data directory to rotate the capability.

The private local UI URL is also a bearer secret. Its fragment is not sent in
ordinary HTTP requests, but it remains visible in browser history and on-screen.
Do not share it. Rotating the server data directory rotates both local access
and inbox capabilities.

## Public support data

Do not publish invite codes, sealed envelopes, key material, passphrases,
plaintext messages, safety phrases, profile names, raw logs, crash dumps,
local paths, browser storage exports, or screenshots of private rooms.

Security reports should use GitHub private vulnerability reporting when
available. If it is unavailable, publish only a minimal redacted issue asking
for a private contact path; do not include exploit details or private data.

## Related review notes

The files under `reference/` are design review notes, not security claims:

- [Public Threat Model](reference/PUBLIC_THREAT_MODEL.md)
- [Crypto Decision](reference/CRYPTO_DECISION.md)
- [Storage Decision](reference/STORAGE_DECISION.md)
- [Transport Decision](reference/TRANSPORT_DECISION.md)
