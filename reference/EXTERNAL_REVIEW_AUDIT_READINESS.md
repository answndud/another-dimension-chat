# External Review And Audit Readiness

Status: OPS-7 review-readiness gate closed for public-safe reviewer input, with
RB-6 release-class scope-down recorded in
`reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md`. This is not an
external review result, audit completion, reviewer signoff, public-user-safety
signoff, security-ready claim, or permission for sensitive communication.

This document defines how an external reviewer should inspect the current
desktop-first source and how maintainers must triage review findings without
overclaiming readiness.

## Review Packet

The public-safe review packet starts at:

- `reference/INDEPENDENT_REVIEW_PACKET.md`
- `reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md`
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

## D100-4 Intake Execution

D100-4 freezes the reviewer packet and makes the finding tracker and future
named reviewer signoff records machine-checkable for real external intake. The
runbook is `reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md`, the signoff schema is
`reference/EXTERNAL_REVIEW_SIGNOFF_SCHEMA.md`, the integrated gate is
`reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`, tracker validation is
performed by `scripts/validate_audit_finding_tracker.mjs`, and signoff
candidate validation is performed by `scripts/validate_external_review_signoff.mjs`.
This only makes the intake path operator-ready; it does not create an external
review result.

## A100-1 Packet Freeze

A100-1 freezes the current public-safe reviewer packet for handoff. The packet
is synced to the latest source gates, including C100-5 advanced onion/Tor
evidence boundary, `reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md`,
`reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md`,
`reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md`, and
`reference/AUDIT_FINDING_TRACKER.md`.

This freeze is a source packet state only. A100-2 remains required for real
review execution, finding closure, reviewer signoff, or audit wording.

## A100-2 Execution Boundary

A100-2 is closed for active-queue progress by explicit owner policy waiver
only. The waiver does not fabricate a reviewer, does not count as an audit, and
does not convert the zero-finding tracker into review evidence.

Named external review or audit, public-safe finding summaries, and accepted
fix/hold/waive closure remain required before audited, security-ready,
production-ready, stable, sensitive-use, or reliable-delivery wording can be
considered.

## RB-6 Scope-Down

RB-6 does not fabricate an external reviewer or audit. Instead, it removes the
missing review/audit blocker for lower release classes only. Source-side work
may continue toward a signed public beta or RC while external review and audit
remain stable/production claim blockers.

Public wording must still say `not audited`, `not production-ready`, and
`sensitive communication prohibited`.

## Current Gate Flags

- external_review_audit_readiness_gate_reviewed=true
- a100_1_external_security_review_packet_frozen=true
- a100_2_external_review_execution_blocker_closed=true
- external_review_execution_policy_waiver_authorized=true
- external_review_execution_waiver_scope=active-queue-unblock-only
- named_external_review_required_for_claims=true
- accepted_audit_finding_closure_required_for_claims=true
- external_review_execution_claim_allowed=false
- audit_findings_recorded=0
- audit_finding_closure_claim_allowed=false
- review_packet_synced_to_latest_source_gates=true
- review_packet_includes_c100_5_onion_boundary=true
- review_packet_includes_target_standard_matrix=true
- review_packet_includes_deployment_blocker_plan=true
- review_packet_finding_tracker_synced=true
- private_docs_excluded_from_review_packet=true
- generated_release_artifacts_excluded_from_review_packet=true
- d100_4_external_evidence_intake_execution_reviewed=true
- external_review_intake_runbook_available=true
- external_review_intake_operator_ready=true
- external_review_signoff_schema_available=true
- external_review_signoff_validator_available=true
- external_review_signoff_candidate_requires_owner_claim_decision=true
- reviewer_packet_freeze_ready=true
- audit_finding_tracker_ready=true
- audit_finding_tracker_schema_machine_checkable=true
- audit_finding_counts_machine_checked=true
- sensitive_finding_private_route_required=true
- rb_6_external_review_release_class_scope_down_reviewed=true
- review_packet_public_safe=true
- review_packet_complete_for_current_source=true
- independent_review_packet_source_ready=true
- independent_review_packet_public_safe=true
- independent_review_packet_waits_for_stable_candidate_evidence=true
- stable_candidate_evidence_required_before_external_review=true
- external_review_not_local_source_progress_blocker=true
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
- stable_or_production_release_allowed_without_external_review=false
- signed_public_beta_or_rc_release_class_allowed_without_external_review=true
- external_review_no_longer_blocks_lower_release_class=true
- external_review_still_blocks_stable_or_production_claims=true
- next_required_phase=RB-7 signed notarized macOS stable artifact pipeline
