# Privacy Model Comparison

Another Dimension Chat is not a secure messenger release today.

This document compares the intended direction against a Briar/Cwtch-style
privacy model using public-safe LINDDUN categories. It is a gap map, not a
claim that the current beta has reached those systems' security or privacy
level.

## Target Direction

The target product is a Korean-language high-risk 1:1 messenger with:

- no phone-number identity
- no email identity
- no global account
- no searchable username
- no central contact discovery
- no central message server
- no push notification dependency
- no cloud backup
- default practical transport through explicit local manual encrypted envelope
  exchange, with advanced onion/Tor transport kept opt-in and fail-closed
- pairwise contacts and pairwise local state
- local encrypted storage controlled by the user
- public release artifacts that do not require App Store, notarization, or a
  central vendor account

This is closer to the privacy goals of Briar and Cwtch than to phone-number or
cloud-account messengers, but the current implementation is still an
experimental local beta candidate.

## LINDDUN Gap Map

| Category | Target Position | Current Status |
| --- | --- | --- |
| Linkability | Pairwise identities, pairwise contacts, no global account, no central contact graph. | Partially aligned in architecture. Current beta still lacks audited production E2EE, reliable real-network onion delivery, and external two-machine evidence. |
| Identifiability | No phone number, email, searchable username, or public directory. | Aligned as a product boundary. Current app must keep invite and diagnostics data redacted. |
| Non-repudiation | Avoid central logs and avoid product claims that create false evidentiary confidence. | Partially aligned. Local logs and diagnostics are redacted, but production deniability properties are not claimed. |
| Detectability | Default practical transport avoids automatic network work; advanced onion/Tor remains opt-in, user-triggered, and fail-closed until verified. | Early boundary only. App has explicit onion/Tor attempt paths and launch-time network suppression, but reliable external onion delivery and bridge behavior are not proven. |
| Disclosure of Information | Production E2EE, local encrypted stores, redacted reports, data lifecycle controls. | Partially implemented as local guardrails. Not audited, not production E2EE-ready, no secure deletion guarantee, no rollback-prevention claim. |
| Unawareness | Korean UI and release docs must clearly warn that beta is unsigned, unaudited, not production-ready, and not safe for sensitive communication. | Public docs and beta warnings contain non-claims. Must be preserved until security-ready criteria are met. |
| Non-compliance | Public release must avoid overclaiming, publish security boundaries, and keep private planning data out of artifacts. | Partially aligned through README, SECURITY, public threat model, release checklist, and ignored docs. No independent review result yet. |

## Comparison Against Briar/Cwtch-Level Goals

### Where the Project Is Directionally Aligned

- No central trusted account provider is in scope.
- Phone-number identity and central contact discovery are excluded.
- Default practical delivery is local manual encrypted envelope exchange, while
  advanced high-risk delivery rejects default direct P2P and aims at
  onion/private delivery.
- The desktop beta does not start network/onion work automatically on launch.
- Local encrypted profile/session/message storage boundaries exist.
- Public support diagnostics are limited to app status, build identity, broad
  failure class, recovery next action, and app-launch network boundary.
  Field-test reports remain separate and must be redacted before public use.
- The release path can distribute an unsigned GitHub DMG without Apple Store or
  notarization dependency, with explicit manual checksum verification.

### Where the Current Beta Is Behind Briar/Cwtch

- Real external two-machine onion delivery has not been independently verified.
- Production E2EE readiness is not complete or audited.
- Onion service key lifecycle is policy/boundary work, not production key
  material management.
- Durable session lifecycle exists locally, but is not audited as security-ready.
- Rollback protection is marker-only and does not prevent restored encrypted
  database snapshots.
- Bridge/censorship support is not validated as a usable field configuration.
- There is no independent security review result.
- There is no complete supply-chain review, SBOM, reproducible-build evidence,
  signing story, or auto-update integrity implementation.
- There is no mobile/offline mesh transport comparable to Briar's Bluetooth or
  Wi-Fi-local disaster-mode capability.
- User base, social bootstrapping, support, and safety education are not solved
  by the codebase.

## Development Priority

For a Korean Briar/Cwtch-style model, the fastest useful order is:

1. Preserve the unsigned public beta non-claims and release hygiene.
2. Close production E2EE and durable session lifecycle as one subsystem.
3. Close passphrase-first key management, rollback boundary, and local data
   lifecycle as one subsystem.
4. Finish external two-machine onion delivery evidence when a second machine or
   external tester exists.
5. Close bridge/censorship support with only verified configurations.
6. Close dependency/supply-chain review and manual update integrity.
7. Complete independent review or publish an explicit review gap.
8. Only then consider stronger public privacy claims.

## Current Public Claim

The current public claim remains limited to:

- unsigned experimental public beta
- local desktop beta candidate
- no central account or contact-discovery direction
- redacted diagnostics boundary
- no automatic network/onion work on launch
- external two-machine onion delivery not independently verified
- not audited, not production-ready, and sensitive communication prohibited
