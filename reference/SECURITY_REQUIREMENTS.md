# Security requirements

> **상태: daemon-first 보안 요구사항 register.** legacy browser/WASM 경로를
> 현재 제품 증거로 사용하지 않는다. 각 상태값은 구현 범위와 evidence의 현재
> 한계를 함께 표시하며, `blocked`·미검증 항목은 release gate를 통과시킬 수 없다.

This is the executable security requirement register for the supported web
product. A requirement is not complete because a document describes it: the
release gate must point to source, a focused test, and an observable artifact.
Requirements marked `blocked` prevent any high-risk claim.

The product mode names are fixed as `development`, `private-trusted`, `public`,
and `high-risk-disabled`. This repository is a `development` checkout preparing
a `private-trusted` limited distribution. `public` release and the
`high-risk-disabled` mode are not approved until every `blocked` requirement in
this register is closed with source, focused tests, and observable artifacts.
The relay not receiving plaintext is not metadata protection; the
`high-risk-disabled` mode covers anonymity, traffic-analysis protection, and
censorship resistance, which remain non-claims.

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
| `ACT-09` | Hostile browser origin/extension/stale worker | Local bridge session, daemon commands, rendered plaintext | Loopback is not authentication; require one-time bootstrap, Origin/Host/CSRF checks, strict CSP, and daemon-side authorization. |
| `ACT-10` | Local process/file observer | Root/device keys, encrypted DB, recovery material, crash/log output | OS key store, encrypted records, redacted diagnostics, no secret in argv/URL, and explicit endpoint non-claim. |
| `ACT-11` | Malicious update/release distributor | Daemon binary, web bundle, WASM, relay, signing trust | Signed manifest, external trust bootstrap, revocation, minimum version, reproducibility, and rollback refusal. |
| `ACT-12` | Coercive or seized-device operator | Unlock secret, active session, profile existence | `non-claim`; do not advertise panic wipe or hidden modes as coercion resistance. |

## Requirements

| ID | Requirement | Level now | Evidence required before promotion |
| --- | --- | --- | --- |
| `ARCH-01` | Only the web UI + user-owned relay is a supported product boundary. | `implemented` | `verify_product_boundary.mjs`, `verify_archive_hygiene.mjs`, and private/public release gate scans. |
| `ARCH-02` | Relay and UI have separate trust boundaries; development combined serving cannot enter public release. | `implemented` | Server tests, release scan, signed release gate. |
| `ARCH-03` | Tauri/CLI/engine/onion research code cannot appear as current product evidence. | `implemented` | `verify_product_boundary.mjs` legacy source scan and `verify_daemon_boundary.mjs` forbidden-dependency scan. |
| `ARCH-04` | The daemon, browser bridge, and relay have separate ownership and failure domains. | `implemented` | `verify_daemon_boundary.mjs`, `verify_local_bridge.mjs`, bridge_http negative fixtures, and release archive separation. |
| `AUTH-01` | Profile passphrase is required for local daemon private-state unlock. | `implemented` | daemon init/serve stdin workflow and wrong-passphrase fixture. |
| `AUTH-02` | Peer identity continuity fails closed on change. | `implemented` | Identity-change and fresh-pair fixture. |
| `AUTH-03` | Invite signature, expiry, name collision, capability scope, and revocation are checked before pairing. | `implemented` | `verify_invite_code.mjs` (format, expiry, single-use, relay binding, owner revoke), pairing.rs expiry/replay fixtures, staged-invite relay-receipt binding test. |
| `AUTH-04` | Account Root Key signs device certificates; unsigned, revoked, or duplicate devices cannot enter a session. | `implemented` | identity.rs/device.rs/device_link.rs focused tests, cli.rs revoked-device serve gate, and daemon device registry fixtures. |
| `CRYPTO-01` | All identity, invite, device, session, replay, and persistence transitions are specified with invariants. | `implemented` | `PROTOCOL_STATE_MACHINE.md` state tables, mls_session.rs fixtures, and daemon session catalog tests. Independent composition review remains external. |
| `CRYPTO-02` | Tamper, duplicate, replay, corrupt storage, crash, concurrency, and rollback fail closed. | `implemented` | mls_session.rs replay/reorder/tamper fixtures, storage.rs rollback/corruption fixtures, delivery.rs late-result fixtures. |
| `CRYPTO-03` | Browser memory exposure and daemon key zeroization limits are explicit. | `implemented` | zeroizing storage types, `EncryptedStore::lock` fixture, bridge boundary markers, and web exposure scan. No endpoint-compromise claim. |
| `CRYPTO-04` | The selected 1:1 protocol owns prekey, ratchet, persistence, replay, and identity-binding transitions without ad-hoc crypto. | `blocked` | Protocol decision record, fixed vectors, crash/rollback fixtures, and independent composition review. |
| `DATA-01` | Private profile state is encrypted before daemon persistence. | `implemented` | Argon2id/AES-GCM daemon store and storage checks. |
| `DATA-02` | Browser cache, multiple tabs, clipboard, and service-worker behavior cannot bypass the daemon boundary. | `implemented` | `verify_daemon_ui_artifact.mjs` (no-store UI, no persistent service worker, CSP) and `verify_web_exposure.mjs` (no browser storage APIs, explicit-only clipboard). Actual private-mode/quota/eviction matrix remains unverified. |
| `DATA-03` | Wipe is not called secure deletion and backup is not cloud recovery. | `implemented` | UI/docs claim scan and recovery fixtures. |
| `DATA-04` | Long-term private state is owned by the daemon, not browser storage; keychain-unavailable and recovery failure paths fail closed. | `implemented` | storage.rs keychain-unavailable/corrupt/rollback fixtures, cli.rs recovery tamper/wrong-passphrase fixtures, and pairing snapshot migration fixture. |
| `RELAY-01` | Relay stores only bounded opaque envelopes and never private keys/plaintext. | `implemented` | Server route tests, body bounds, log scan. |
| `RELAY-02` | Capability leakage, request abuse, proxy spoofing, disk failure, queue full, and restart are bounded. | `implemented` | server.test.mjs abuse/malformed/queue-full/rate-limit/disk-failure/restart fixtures and `verify_relay_logs.mjs` redacted-log scan. |
| `RELAY-03` | Remote HTTP, unsafe bind, and misleading transport claims are rejected. | `implemented` | Server/web transport tests and config preflight. |
| `WEB-01` | UI requires a secure context and has a strict CSP/no third-party runtime. | `implemented` | `verify_web_artifact.mjs` (SRI, no inline/external, no source maps) and `verify_daemon_ui_artifact.mjs` (CSP, no persistent service worker). Full browser matrix remains absent. |
| `WEB-02` | UI does not put capabilities, secrets, plaintext, or passphrases in telemetry/logs/URLs/titles. | `implemented` | `verify_web_exposure.mjs` (console/title/clipboard/DOM/network scan), `verify_dependency_policy.mjs` (runtime API scan), and relay log scan. |
| `WEB-03` | Korean onboarding blocks unsafe shortcuts and explains cause/action/security impact for failures. | `implemented` | daemon-view onboarding/re-verification/system-row tests, product-entry negative markers, and keyboard/accessibility CSS checks. |
| `BRIDGE-01` | A hostile web origin cannot bootstrap, replay, or widen a daemon session. | `implemented` | bridge.rs and bridge_http.rs negative fixtures (wrong origin, stale cookie, token replay, restart invalidation, version mismatch) and `verify_local_bridge.mjs`. |
| `BRIDGE-02` | The UI receives only least-privilege daemon results and never reads private keys, raw DB files, or ratchet state. | `implemented` | bridge_http least-privilege/unknown-route fail-closed fixtures, `verify_daemon_boundary.mjs`, and web exposure scan. |
| `TRANSPORT-01` | Direct HTTPS/VPN/LAN is low-risk and does not claim anonymity. | `implemented` | UI/docs claim scan and packet metadata fixture. |
| `TRANSPORT-02` | High-risk mode is disabled until an independently reviewed anonymity transport exists. | `implemented` | `highRiskAllowed:false`, server/web tests. |
| `RELEASE-01` | Public archive has verified UI, relay, runtime, manifest, SBOM, provenance, and no legacy artifacts. | `blocked` | Clean public release gate with signed archive. |
| `RELEASE-02` | Trusted key bootstrap, rotation, revocation, rollback, and compromised-release response are executable. | `partial` | `verify_release_trust.mjs --fixture`, `verify_release_trust_receipt.mjs --fixture`, trust-manifest plus independent-review sign-off public gate, and clean-install update/rollback matrix; external bootstrap delivery remains blocked. |
| `RELEASE-03` | Production gate fails on skipped build, missing browser acceptance, or missing artifact. | `blocked` | `verify_all.sh --release` negative tests. |
| `OPS-01` | User can install, start, stop, restart, update, rollback, and recover without Node/npm. | `partial` | `acceptance_release_local_only.mjs` runs install, doctor, status, update, and rollback with Node absent from PATH; clean OS and all supported host combinations remain unverified. |
| `OPS-02` | Incident runbook covers leaked capability, lost device, changed release, key compromise, and fresh pairing. | `partial` | Redacted recovery fixture and support docs. |
| `AUDIT-01` | Independent review covers protocol composition, browser, storage, relay, release, and transport. | `blocked` | `verify_security_review_signoff.mjs --fixture` validates the handoff gate; actual external report, reviewer identity, and independent sign-off are absent. |
| `RECOVERY-01` | Recovery, device revocation, backup import, rollback, and incident stop-distribution behavior are explicit and fail closed. | `partial` | Recovery state machine, corrupted/interrupted/old-backup fixtures, and signed incident bundle. |

## Claim policy

The UI and public docs may claim only `implemented` or explicitly scoped
`partial` behavior. `blocked` requirements must produce a non-zero release gate.
No requirement in this file grants anonymity, secure deletion, coercion
resistance, compromised-device protection, or independent audit status.

## Evidence and incident boundary

The source/test/artifact mapping for this register is maintained in
[`SECURITY_REVIEW_EVIDENCE.md`](SECURITY_REVIEW_EVIDENCE.md). Each mapped item
must identify the exact source boundary, focused command, observable artifact,
and remaining limitation. A command that exits zero is evidence of that command's
fixture only; it is not reviewer approval.

`SECURITY_REVIEW_EVIDENCE.md` also defines the separate reviewer sign-off format.
An empty sign-off leaves `AUDIT-01` blocked. Key compromise, CVE disclosure,
capability leakage, altered release, and rollback response must follow
[`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md); an incident cannot be closed by
merely rerunning the normal test suite.

## External references

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- W3C Secure Contexts: https://www.w3.org/TR/secure-contexts/
- MDN Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API
- Tor fingerprinting: https://support.torproject.org/anti-fingerprinting/
- Tor information leaks: https://spec.torproject.org/proposals/344-protocol-info-leaks.html
