# Security requirements

This is the executable security requirement register for the supported web
product. A requirement is not complete because a document describes it: the
release gate must point to source, a focused test, and an observable artifact.
Requirements marked `blocked` prevent any high-risk claim.

## Security levels

| Level | Meaning |
| --- | --- |
| `implemented` | Source and focused automated evidence exist; no independent audit claim. |
| `partial` | The behavior exists only in a limited route or has a documented boundary. |
| `blocked` | Missing evidence or unsafe behavior; release/high-risk claims must fail. |
| `non-claim` | Deliberately not promised by this product. |

## Threat actors and assets

| ID | Actor | Assets/goal | Required boundary |
| --- | --- | --- | --- |
| `ACT-01` | Network observer/ISP/VPN | IP, timing, size, frequency, destination | Direct HTTPS is not anonymous; metadata must be shown and bounded. |
| `ACT-02` | Relay/proxy operator | Plaintext, keys, capabilities, delivery metadata | Relay receives opaque envelopes only; capability and logs are minimized. |
| `ACT-03` | Malicious reverse proxy/server host | JS/WASM, passphrase, plaintext, keys | Verified UI release and explicit altered-bundle failure; no high-risk approval. |
| `ACT-04` | Malicious browser/extension/device malware | Live keys, screen, clipboard, plaintext | `non-claim`; UI must warn and stop high-risk messaging. |
| `ACT-05` | Local attacker/forensic recovery | IndexedDB, Cache API, backups, swap, logs | Wipe is deletion-attempt only; storage copies must be documented. |
| `ACT-06` | Coercion/device seizure | Passphrase, unlocked session, profile existence | `non-claim`; do not present panic wipe as coercion resistance. |
| `ACT-07` | Supply-chain/release attacker | Build, runtime, WASM, manifest, signing key | Signed manifest, provenance, SBOM, key rotation/revocation, rollback rejection. |
| `ACT-08` | Peer impersonator/replay attacker | Identity continuity, invites, ratchet state | Signed invite, safety confirmation, state-machine fail-closed behavior. |

## Requirements

| ID | Requirement | Level now | Evidence required before promotion |
| --- | --- | --- | --- |
| `ARCH-01` | Only the web UI + user-owned relay is a supported product boundary. | `partial` | `verify_product_boundary.mjs` and release archive scan. |
| `ARCH-02` | Relay and UI have separate trust boundaries; development combined serving cannot enter public release. | `implemented` | Server tests, release scan, signed release gate. |
| `ARCH-03` | Tauri/CLI/engine/onion research code cannot appear as current product evidence. | `partial` | Legacy workflow/source boundary scan. |
| `AUTH-01` | Profile passphrase is required for local private-state unlock. | `implemented` | Web runtime tests and wrong-passphrase fixture. |
| `AUTH-02` | Peer identity continuity fails closed on change. | `implemented` | Identity-change and fresh-pair fixture. |
| `AUTH-03` | Invite signature, expiry, name collision, capability scope, and revocation are checked before pairing. | `partial` | Expired/revoked/capability fixture and protocol vectors. |
| `CRYPTO-01` | All identity, invite, prekey, handshake, ratchet, replay, and persistence transitions are specified with invariants. | `partial` | `PROTOCOL_STATE_MACHINE.md`, fixed-seed browser vectors, and external review input. |
| `CRYPTO-02` | Tamper, duplicate, replay, corrupt storage, crash, concurrency, and rollback fail closed. | `partial` | Fixed-seed property vectors, existing storage/concurrency fixtures, and kill-after-write fixtures. |
| `CRYPTO-03` | JS/WASM key exposure and zeroization limits are explicit. | `partial` | Boundary review and browser memory/lock evidence; no stronger claim. |
| `DATA-01` | Private profile state is encrypted before IndexedDB persistence. | `implemented` | Argon2id/PBKDF2 migration and storage tests. |
| `DATA-02` | Browser quota, eviction, private mode, multiple tabs, cache, clipboard, and service-worker behavior are handled. | `blocked` | Browser matrix fixtures and safe-lock behavior. |
| `DATA-03` | Wipe is not called secure deletion and backup is not cloud recovery. | `implemented` | UI/docs claim scan and recovery fixtures. |
| `RELAY-01` | Relay stores only bounded opaque envelopes and never private keys/plaintext. | `implemented` | Server route tests, body bounds, log scan. |
| `RELAY-02` | Capability leakage, request abuse, proxy spoofing, disk failure, queue full, and restart are bounded. | `partial` | HTTP abuse fixtures and redacted logs. |
| `RELAY-03` | Remote HTTP, unsafe bind, and misleading transport claims are rejected. | `implemented` | Server/web transport tests and config preflight. |
| `WEB-01` | UI requires a secure context and has a strict CSP/no third-party runtime. | `blocked` | Built artifact header/CSP/SRI scan and browser execution test. |
| `WEB-02` | UI does not put capabilities, secrets, plaintext, or passphrases in telemetry/logs/URLs/titles. | `partial` | Network/log/DOM/clipboard scan. |
| `WEB-03` | Korean onboarding blocks unsafe shortcuts and explains cause/action/security impact for failures. | `partial` | Automated two-profile UX flow and accessibility checks. |
| `TRANSPORT-01` | Direct HTTPS/VPN/LAN is low-risk and does not claim anonymity. | `implemented` | UI/docs claim scan and packet metadata fixture. |
| `TRANSPORT-02` | High-risk mode is disabled until an independently reviewed anonymity transport exists. | `implemented` | `highRiskAllowed:false`, server/web tests. |
| `RELEASE-01` | Public archive has verified UI, relay, runtime, manifest, SBOM, provenance, and no legacy artifacts. | `blocked` | Clean public release gate with signed archive. |
| `RELEASE-02` | Trusted key bootstrap, rotation, revocation, rollback, and compromised-release response are executable. | `blocked` | Key fixture and clean-install update/rollback matrix. |
| `RELEASE-03` | Production gate fails on skipped build, missing browser acceptance, or missing artifact. | `blocked` | `verify_all.sh --release` negative tests. |
| `OPS-01` | User can install, start, stop, restart, update, rollback, and recover without Node/npm. | `blocked` | No-Node clean OS fixture. |
| `OPS-02` | Incident runbook covers leaked capability, lost device, changed release, key compromise, and fresh pairing. | `partial` | Redacted recovery fixture and support docs. |
| `AUDIT-01` | Independent review covers protocol composition, browser, storage, relay, release, and transport. | `blocked` | Review packet and external report; automated tests cannot substitute. |

## Claim policy

The UI and public docs may claim only `implemented` or explicitly scoped
`partial` behavior. `blocked` requirements must produce a non-zero release gate.
No requirement in this file grants anonymity, secure deletion, coercion
resistance, compromised-device protection, or independent audit status.

## External references

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- W3C Secure Contexts: https://www.w3.org/TR/secure-contexts/
- MDN Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API
- Tor fingerprinting: https://support.torproject.org/anti-fingerprinting/
- Tor information leaks: https://spec.torproject.org/proposals/344-protocol-info-leaks.html
