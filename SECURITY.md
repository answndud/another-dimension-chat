# Security Policy

## Current status

Another Dimension Chat is a daemon-first security messenger under active
development. It is not independently audited, not approved for production,
and not for sensitive communication yet.

The current direction is a user-owned relay plus a local daemon and browser UI.
No ChatGPT Sites project or central message host is required by the product.
The former Tauri, native CLI/engine, browser Olm, and onion transport prototypes
were removed; git history is their archive. They are not alternative clients or
evidence for the supported product. The current product boundary is recorded in
`reference/PRODUCT_BOUNDARY.md`.

The current relay defaults to API-only mode and does not serve the browser UI.
An explicit `serveStatic`/`AD_SERVE_UI=1` development mode still exists for local
rehearsal, but it is not a trusted high-risk code-distribution boundary. An
operator, reverse proxy, compromised host, or altered release can replace the
browser UI and can therefore observe displayed plaintext or issue commands to
the unlocked local daemon. The browser does not receive daemon private keys,
but a malicious UI remains a complete session-level compromise. Signed, independently verifiable app
distribution remains a release blocker.

## Current product behavior

- The authenticated browser UI is a presentation client. It does not generate,
  store, or operate identity keys, message keys, OpenMLS state, or recovery keys.
- The loopback daemon owns account/device identity, signed pairing, safety-number
  verification, OpenMLS groups, message encryption, encrypted local storage,
  attachment encryption, delivery state, backup, lock, and wipe operations.
- Local daemon state is encrypted with AES-256-GCM. Passphrase-based stores use
  Argon2id; supported macOS installations can keep the database key behind the
  OS keychain boundary. Keys are cleared when the daemon is locked or stopped,
  subject to the documented limits of process memory and the operating system.
- Pairing uses signed, relay-bound, expiring, single-use invitation records.
  Changed account, device, or relay bindings fail closed and require explicit
  rejection and fresh verification before messaging resumes.
- One-to-one messaging uses the pinned OpenMLS/libcrux provider and one selected
  ciphersuite. The daemon persists each protocol transition through its encrypted
  checkpoint transaction and rejects duplicate, stale, unsupported, or malformed
  protocol input.
- The user-owned relay stores bounded opaque `ADENV1` envelopes and encrypted
  attachment blobs. It is not an identity provider, contact directory, plaintext
  archive, push service, or trusted decryption service.
- Remote relay access requires HTTPS with an explicitly trusted certificate pin.
  Redirects are not followed. Loopback HTTP remains a development exception.
- The relay is API-only by default. Combined relay/UI serving is an explicit
  development mode and is excluded from public release artifacts.
- The local UI bootstrap and session are bearer-authorized, origin-checked,
  short-lived, and invalidated on daemon restart. Secrets must not be copied
  into logs, reports, screenshots, or support requests.
- This architecture does not provide anonymity, censorship resistance, traffic
  analysis protection, secure deletion, compromised-device protection, or
  independent security assurance. High-risk use remains disabled until the
  release and review gates explicitly say otherwise.



The current executable product boundary is `reference/PRODUCT_BOUNDARY.md` and
`reference/product_boundary.json`. Several older requirement, crypto, storage,
UI, and evidence notes under `reference/` are retained only as explicitly
labelled historical snapshots while the daemon review packet is rebuilt. They
must not be used as current implementation evidence. Incident/key compromise
procedures remain in `reference/INCIDENT_RESPONSE.md`; no repository document is
an audit report or reviewer sign-off.

The operational release trust procedure, including offline bootstrap, two-channel
fingerprint confirmation, rotation, revocation, and the redacted receipt template,
is in `reference/RELEASE_TRUST_OPERATIONS.md`. The first external fingerprint
confirmation has not been performed in this repository; until it is independently
recorded, verified distribution remains blocked.

These are implementation behaviors, not proof of secure messenger readiness.

## Non-claims

This prototype does not claim:

- audited or production-ready security
- safety for sensitive communication
- Signal-level security, a reviewed messenger protocol, or equivalent assurance
- an independent audit of this application's protocol composition or browser integration
- post-quantum security or protection when a compromised endpoint remains under attacker control
- anonymity, untraceability, or protection from global traffic correlation
- reliable automatic delivery, Tor/onion delivery, or censorship resistance
- secure deletion, guaranteed recovery from every corruption or device-loss case,
  or complete multi-device recovery
- protection from compromised browsers, extensions, devices, local malware, or coercion
- protection when a server or reverse proxy serves an altered browser bundle
- an independently exercised signing-key distribution path or safe unattended updates
- independently reviewed identity continuity, KeyPackage lifecycle, revocation,
  or device recovery
- rate-limited, spam-resistant, highly available relay delivery

Using OpenMLS and libcrux does not audit this application's identity signatures,
transcript binding, persistence, delivery, local bridge, or UI. An unlocked
daemon session and a compromised endpoint remain outside the protection of the
message protocol. Implementation and storage behavior must be independently
reviewed before any stronger claim is considered.

## Online delivery boundary

The current direct delivery path uses user-owned capability inboxes. If a relay
or signaling service is added later, it must be treated as an untrusted
transport component. It must not receive plaintext messages, private keys,
passphrases, or centralized contact discovery data. WebRTC and any direct
network path must make IP and metadata exposure explicit.

Treat an inbox capability URL as a bearer secret: anyone who learns it can
submit opaque envelopes and observe submission results, but read and ack require
the separate local-access capability. Do not put either capability in logs,
support reports, screenshots, public proxy configuration, or monitoring URLs.
If one is exposed, stop the server, move the old data directory aside, and start
with a new data directory to rotate both capabilities.

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
Use [`reference/INCIDENT_RESPONSE.md`](reference/INCIDENT_RESPONSE.md) for
capability leakage, altered releases, CVE handling, signing-key compromise, and
rollback decisions.

## Related historical review notes

The following files contain earlier design history and are not current product
evidence unless their own status notice says otherwise:

- [Public Threat Model](reference/PUBLIC_THREAT_MODEL.md)
- [Crypto Decision](reference/CRYPTO_DECISION.md)
- [Storage Decision](reference/STORAGE_DECISION.md)
- [Transport Decision](reference/TRANSPORT_DECISION.md)
