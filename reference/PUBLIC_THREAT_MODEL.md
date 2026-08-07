# Public Threat Model

> **상태: daemon 전환 중인 위협 모델 스냅샷.** daemon trust-boundary 절은 방향을
> 설명하지만 browser Olm/WASM 구현 주장과 상태 표는 최신 판정이 아닙니다. 현재
> 공개 non-claim은 `SECURITY.md`, 제품 경계는 `PRODUCT_BOUNDARY.md`를 따릅니다.

Another Dimension Chat is not a secure messenger release today.

This document is the public-safe threat model for the unsigned experimental
public beta. It describes the intended direction and the current beta
boundary. It does not claim that the current build is safe for sensitive
communication.

## Requirement IDs

| ID | Threat / asset | Required boundary | Current claim |
| --- | --- | --- | --- |
| TM-01 | Relay operator sees plaintext or private keys | Relay receives opaque envelopes only | Implemented guardrail; not independently audited |
| TM-02 | Relay or proxy replaces browser JS/WASM | Static UI is separately verified; relay-only is the default | Release blocker |
| TM-03 | Network observer correlates IP, timing, size, or endpoint | Explicit transport limitation or a verified anonymity route | No anonymity claim |
| TM-04 | Browser/device/extension is compromised | Fail closed where possible and disclose endpoint limit | Not protected |
| TM-05 | Capability, invite, or local profile leaks | Redaction, rotation, encrypted storage, and user warning | Partial implementation |
| TM-06 | Queue abuse or relay failure loses messages | Bounded queue, explicit errors, and no silent discard | Availability not guaranteed |
| TM-07 | User mistakes unsafe pairing or release | Safety confirmation and signed release verification | Prototype gate |

## Daemon-first trust boundaries

The production candidate is intentionally split into four independently
reviewable boundaries. This is a security boundary, not merely a deployment
diagram:

```text
human
  │ explicit approval / visible warnings
  ▼
browser UI (untrusted renderer)
  │ authenticated loopback bridge; no key ownership
  ▼
local security daemon (key/session/storage owner)
  │ encrypted opaque envelopes only
  ▼
user-owned relay (untrusted delivery service)
```

The browser must be treated as an untrusted renderer even when it is served
from the same machine. A browser extension, injected script, stale service
worker, malicious reverse proxy, or cross-origin page can influence the UI;
none of these may be allowed to mint identity, export private keys, or submit
messages without an authenticated daemon session and explicit user policy.
The daemon must be treated as a separate local security boundary: it owns the
Account Root Key, Device Key, session state, encrypted records, and recovery
policy. The relay must be treated as an untrusted transport and must not be
required to know a profile name, plaintext, private key, or global contact
graph.

The current web prototype does not implement this daemon boundary. Its
browser-local cryptographic state is therefore not evidence that the future
daemon design is implemented.

## Attack-surface separation

| Surface | Attacker assumption | Protected asset | Required control | Evidence status |
| --- | --- | --- | --- | --- |
| Browser UI | hostile origin, extension, injected/stale bundle | daemon session, plaintext, user approval | loopback-only bridge, one-time bootstrap, Origin/Host/CSRF checks, strict CSP, version binding | blocked until daemon exists |
| Local daemon | local process can probe ports/files or observe crashes | root/device keys, session state, recovery material | authenticated API, OS key store, encrypted DB, redacted logs, fail-closed errors | not implemented |
| Relay | operator can read/alter/delete/replay everything it stores | plaintext, identity continuity, capabilities | opaque bounded envelopes, scoped rotating capabilities, replay/TTL checks in daemon | partial prototype evidence |
| Reverse proxy | can replace web assets or alter headers | code integrity, passphrases, messages | signed artifact verification, pinned release manifest, no high-risk mode on mismatch | blocked |
| Endpoint/OS | malware, keylogger, seizure, memory dump | live secrets, screen, clipboard | explicit non-claim; minimize exposure and disclose residual risk | non-claim |
| Release channel | compromised build host or signing key | executable, WASM, update trust | reproducible build, offline signing, external bootstrap, revocation and rollback refusal | blocked |
| Metadata path | observer sees IP, timing, size, frequency | relationship and activity metadata | no anonymity claim; optional transport is separately reviewed | non-claim |

Each row must be represented by a requirement ID, a focused command, a
redacted observable artifact, and a remaining limitation in
`SECURITY_REVIEW_EVIDENCE.md`. A green prototype test cannot promote a blocked
row or substitute for an independent review.

## Product Direction

The long-term product direction is a high-risk 1:1 messenger with no central
trusted server for identity, contact discovery, message relay, push delivery,
or cloud backup.

The current web prototype is narrower:

- user-owned Node relay plus separately served browser UI
- signed invite-code room flow
- safety material confirmation
- browser-local profile, Olm account/session, and message transcript storage
- two-control-message Olm setup and restart/resume exercise
- automatic opaque-envelope delivery between explicitly exchanged endpoints
- manual encrypted-envelope fallback when a server is unavailable
- HTTPS/reverse-proxy/direct-TLS configuration for advanced users
- redacted diagnostics and local release-archive verification

## Assets

The project is designed to protect:

- pairwise identity material
- pairing payloads and safety material
- message plaintext
- message envelope keys and replay state
- local profile/session/message records
- onion/transport configuration and runtime state
- diagnostic and recovery data

The highest-value ownership rule is explicit: the Account Root Key is not a
browser secret and is not a relay secret. Device keys are independently
generated and certified by the account root. Display names, invite codes,
relay addresses, safety material, and mailbox capabilities are identifiers or
delegation material, not replacements for the account root. A code leak may
authorize rendezvous only within its short scope; it must never authorize
identity creation, private-key export, or message decryption.

The current public beta must still treat all of these as sensitive.
Diagnostics, release artifacts, reports, and public docs must not include bridge
lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads,
safety phrases, profile names, message text, local paths, passphrases, raw
logs, or key material.

## Current Defenses

Current implementation evidence includes:

- passphrase-first browser profile unlock/lock path
- passphrase-wrapped IndexedDB profile/session/message records
- signed invite and envelope verification
- canonical safety material bound to identity and setup material
- Olm v2 Double Ratchet message setup through the Rust WASM adapter
- bounded opaque inbox with separate write and local read/ack capabilities
- duplicate envelope rejection and a bounded age/replay window
- manual encrypted-envelope fallback
- public support diagnostics redaction boundary
- explicit documentation of endpoint, browser, device, and metadata limits

These are implementation guardrails, not a secure messenger claim. Requirement
IDs describe the boundary to verify in code and documentation; they are not
evidence of an independent security review.

## Out Of Scope For This Beta

This beta does not claim:

- secure production end-to-end encryption
- production-ready or audited security
- safety for sensitive communication
- reliable real-network Tor/onion delivery
- independently verified external two-machine onion delivery
- verified bridge/censorship support beyond returned external reports
- Briar/Cwtch-equivalent privacy or security level
- repeated external onion evidence
- offline mesh delivery
- protection against endpoint compromise
- protection against coercion
- protection against malicious contacts
- protection against global traffic correlation
- rollback prevention against restored encrypted database snapshots
- cloud backup/sync or backup recovery
- destructive migration
- secure deletion from storage media
- dependency audit, SBOM, reproducible build, signing, notarization, or auto-update
- completed independent review, reviewer signoff, or public user safety signoff
- trusted signed JavaScript/WASM distribution or verified update channel
- protection against a malicious server or proxy serving altered browser code
- rate-limited, abuse-resistant, high-availability relay delivery
- identity continuity, prekey replenishment, revocation, or device lifecycle
- protection from IP, timing, endpoint, size, or global traffic correlation
- crash upload, telemetry, raw log export, or safe publication of private logs

## Non-Goals

v0.1 does not include:

- phone-number identity
- email identity
- global accounts
- searchable usernames
- centralized contact discovery
- centralized message server
- push notification service
- cloud backup
- backup recovery
- offline mailbox
- group chat
- file transfer
- voice or video calls
- multi-device sync

## User Risk Statement

The unsigned web prototype is for development and review only.

It is an unsigned experimental web prototype, not audited, not
production-ready, and sensitive communication is prohibited.

Anonymity, external onion delivery, censorship resistance, and global traffic
protection are outside the current product claim. Same-machine or HTTPS/VPN
rehearsal can exercise the message flow, but it is not evidence for those
properties and must not be presented as such.

macOS may require the user to manually allow the app in Privacy & Security.
The project does not ask users to bypass macOS protections with terminal
quarantine-removal commands.
