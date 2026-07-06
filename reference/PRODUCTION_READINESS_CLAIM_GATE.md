# Production Readiness Claim Gate

Status: not satisfied. The public wording must remain unsigned experimental
public beta, sensitive communication prohibited, not audited, and
not production-ready until this gate is closed by a later stable release phase.

This gate defines when beta wording may be removed. It does not make the current
app production-ready, audited, secure for sensitive communication, or equivalent
to Briar/Cwtch.

## Production-Ready Meaning

Production-ready requires all five categories below to be true at the same time.

1. Functional readiness: first launch, local profile create/unlock, contact
   invite, verification, message send/receive, retry/cancel, diagnostics,
   local deletion, and recovery work without requiring README-only knowledge.
2. Security readiness: protocol/session state machine, E2EE assumptions, replay
   rejection, retry/cancel semantics, key management, local storage lifecycle,
   migration/rollback policy, and destructive-action boundaries have tests and
   reviewable documentation.
3. Transport readiness: the default product path lets normal users exchange
   messages without a central trusted server, phone/email/global account,
   searchable username, central contact discovery, central message server, push
   notification dependency, or unsafe direct fallback.
4. Distribution readiness: the stable macOS artifact is signed/notarized for
   install ergonomics, has matching checksums, provenance, manifest, update
   integrity notes, dependency evidence, and rollback/failure recovery.
5. Operational readiness: public support, private vulnerability reporting,
   incident response, advisory process, dependency vulnerability triage,
   release rollback, and maintainer response paths exist and are rehearsed.

## Claim Matrix

| Public phrase | Allowed now | Removal or use gate |
| --- | --- | --- |
| `unsigned experimental public beta` | yes, required | May be removed only after OPS-2 through OPS-10 are complete and a stable release artifact exists. |
| `sensitive communication prohibited` | yes, required | May be removed only after external review, field evidence, incident process, and explicit owner decision. |
| `not audited` | yes, required | May be removed only after completed external review/audit with public-safe findings handling. |
| `not production-ready` | yes, required | May be removed only when functional, security, transport, distribution, and operational readiness all pass. |
| `production-ready` | no | Requires OPS-10 stable release gate after OPS-2 through OPS-9 are complete. |
| `secure messenger` | no | Requires protocol/storage/transport review, field evidence, audit outcome, and claim-specific approval. |
| `audited` | no | Requires completed external audit or review result; a review packet alone is not enough. |
| `sensitive communication safe/allowed` | no | Requires a separate explicit decision after audit, field evidence, support readiness, and known-risk publication. |
| `reliable external onion delivery` | no | Requires repeated external two-machine evidence under documented network conditions. |
| `Briar/Cwtch-equivalent` | no | Requires a separate comparative review; current privacy model remains a gap map. |
| `censorship-resistant` | no | Requires bridge/censorship implementation, field evidence, and external review. |

## Beta Wording Removal Checklist

Before removing beta/non-claim wording from README, SECURITY, release body, app
UI, or support templates, all of these must be true:

- OPS-2 production E2EE protocol/session lifecycle hardening is complete.
- OPS-3 production key management and local storage lifecycle is complete.
- OPS-4 reliable default transport product path is complete.
- OPS-5 macOS production UX and onboarding is complete.
- OPS-6 macOS production distribution is complete.
- OPS-7 external review and audit readiness is complete.
- OPS-8 field evidence and reliability program is complete.
- OPS-9 operational support, incident, and vulnerability process is complete.
- OPS-10 stable macOS v1.0 release gate is complete.
- The release artifact, release notes, README, SECURITY, app UI, diagnostics,
  support templates, and public issue policy all agree on the same allowed
  claims and remaining risks.

## Explicit Non-Gates

Signing and notarization reduce macOS install friction and make distribution
more ergonomic. They are not a security trust boundary for this messenger, do not replace same-release checksum verification, do not replace provenance or
update integrity, do not prove E2EE correctness, do not prove safe key
management, and do not make the app safe for sensitive communication.

GitHub Release asset publication, screenshots, source preflight success, local
single-machine rehearsal, public support diagnostics, or a review packet are
not production readiness by themselves.

## Current Decision

- production_ready_claim_allowed=false
- beta_wording_removal_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- signed_notarized_security_boundary=false
- next_required_phase=OPS-2 production E2EE protocol and session lifecycle hardening
