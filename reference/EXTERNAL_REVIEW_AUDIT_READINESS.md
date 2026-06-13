# External Review And Audit Readiness

Status: OPS-7 review-readiness gate closed for public-safe reviewer input. This
is not an external review result, audit completion, reviewer signoff,
public-user-safety signoff, security-ready claim, or permission for sensitive
communication.

This document defines how an external reviewer should inspect the current
desktop-first source and how maintainers must triage review findings without
overclaiming readiness.

## Review Packet

The public-safe review packet starts at:

- `reference/INDEPENDENT_REVIEW_PACKET.md`
- `reference/PUBLIC_THREAT_MODEL.md`
- `reference/PRODUCTION_READINESS_CLAIM_GATE.md`
- `reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md`
- `reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md`
- `reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md`
- `reference/MACOS_PRODUCTION_UX_ONBOARDING.md`
- `reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md`
- `reference/PUBLIC_INTAKE_POLICY.md`
- `reference/REPOSITORY_GOVERNANCE.md`
- `reference/COMPONENT_BOUNDARIES.md`
- `reference/UPDATE_INTEGRITY.md`
- `reference/SUPPLY_CHAIN_BASELINE.md`
- `reference/DEPENDENCY_INVENTORY.md`

The packet must stay public-safe. It must not include private planning notes,
local app data, bridge lines, onion endpoints, invite codes, pairing/envelope
payloads, safety phrases, profile names, message text, local paths,
passphrases, private keys, key material, raw logs, crash dumps, or screenshots
of private room data.

## Review Scope

External review should inspect:

- public claims and forbidden claim drift,
- protocol/session state machine and replay/retry/cancel semantics,
- key management, local storage, backup/migration, and rollback non-claims,
- default manual envelope path and advanced fail-closed onion/Tor boundary,
- macOS first-run UX, recovery, diagnostics, and local lifecycle controls,
- macOS distribution, checksum/provenance/update integrity, signing and
  notarization holds,
- public support and private vulnerability reporting boundaries,
- release artifact and generated-file exclusion discipline.

## Finding Severity

- Critical: likely secret exposure, silent network start, remote code execution,
  private-data publication, release artifact replacement risk, or claim drift
  that would put users at immediate risk.
- High: protocol/storage/transport bug that can break confidentiality,
  integrity, replay resistance, or local data lifecycle boundaries in supported
  flows.
- Medium: recoverable UX, diagnostics, release, support, or process issue that
  can mislead users or maintainers.
- Low: documentation mismatch, unclear wording, missing reviewer context, or
  minor process drift.
- Informational: suggestion or follow-up that does not block current non-claim
  beta posture.

## Finding Decisions

Every finding must resolve to one of:

- Fix: source or process change required before the relevant gate can close.
- Hold: accepted blocker that keeps the related claim false or keeps release
  held.
- Waive: explicit owner decision with rationale, residual risk, and public
  wording impact. A waiver cannot create an audited, security-ready,
  production-ready, sensitive-use, or reliable-delivery claim by itself.

Sensitive findings must use private vulnerability reporting or a minimal public
contact request. Public issues must not contain exploit details, payloads,
endpoints, logs, paths, passphrases, private keys, key material, or screenshots
of private room data.

## Current Gate Flags

- external_review_audit_readiness_gate_reviewed=true
- review_packet_public_safe=true
- review_packet_complete_for_current_source=true
- audit_finding_tracker_available=true
- finding_triage_process_defined=true
- private_security_reporting_boundary_defined=true
- external_review_completed=false
- audit_completed=false
- reviewer_signoff_claimed=false
- public_user_safety_signoff_claimed=false
- audited_claim_allowed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- next_required_phase=OPS-8 field evidence and reliability program
