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

## Future online delivery boundary

Automatic delivery is not part of the current web product. If a relay or
signaling service is added later, it must be treated as an untrusted transport
component. It must not receive plaintext messages, private keys, passphrases,
or centralized contact discovery data. WebRTC and any direct network path must
make IP and metadata exposure explicit.

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
