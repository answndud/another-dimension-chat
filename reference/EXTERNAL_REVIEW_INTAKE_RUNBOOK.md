# External Review Intake Runbook

Status: D100-4 external review intake runbook is operator-ready. This is not an
external review result, not an audit result, not reviewer signoff, not audited
wording approval, not production-ready, and not permission for sensitive
communication.

## Operator Steps

1. Freeze reviewer inputs from `reference/INDEPENDENT_REVIEW_PACKET.md`,
   `reference/EXTERNAL_REVIEW_AUDIT_READINESS.md`,
   `reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md`,
   `reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md`,
   `reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md`, and
   `reference/AUDIT_FINDING_TRACKER.md`.
2. Give reviewers only public-safe source, reference, and release-material
   inputs. Do not provide private planning notes, local app data, invite codes,
   payloads, endpoints, logs, paths, screenshots of private room data,
   passphrases, private keys, or key material.
3. Route sensitive findings through GitHub private vulnerability reporting when
   available, or a minimal public contact request when private reporting is not
   available.
4. Record public-safe finding summaries in
   `reference/AUDIT_FINDING_TRACKER.md`.
5. Record future named reviewer signoff evidence with
   `reference/EXTERNAL_REVIEW_SIGNOFF_SCHEMA.md` and
   `scripts/validate_external_review_signoff.mjs`.
6. Resolve every finding as exactly one of `fix`, `hold`, or `waive`.
7. Keep `not audited`, `not production-ready`, and
   `sensitive communication prohibited` until a later release/claim task has a
   completed review result, findings closure, stable gate pass, and owner
   approval.

A100-2 may be removed from the active queue only by explicit owner waiver while
the named-review and finding-closure evidence remains false. That waiver does
not alter the intake rules above.

## Tracker Rules

- Use `AR-0001` style IDs for real public-safe findings.
- Allowed severities: `critical`, `high`, `medium`, `low`, `informational`.
- Allowed decisions: `fix`, `hold`, `waive`.
- Allowed statuses: `open`, `fixed`, `held`, `waived`.
- Sensitive findings may be represented publicly only as redacted summaries with
  a private-route note.
- `waive` requires owner rationale, residual risk, and public wording impact.
- Open critical or high findings keep production, audited, security-ready,
  stable, and sensitive-use claims false.

## Current Gate Flags

- external_review_intake_runbook_available=true
- external_review_intake_operator_ready=true
- external_review_signoff_schema_available=true
- external_review_signoff_validator_available=true
- external_review_signoff_candidate_requires_owner_claim_decision=true
- a100_1_external_security_review_packet_frozen=true
- a100_2_external_review_execution_blocker_closed=true
- external_review_execution_policy_waiver_authorized=true
- named_external_review_required_for_claims=true
- accepted_audit_finding_closure_required_for_claims=true
- external_review_execution_claim_allowed=false
- review_packet_synced_to_latest_source_gates=true
- review_packet_includes_c100_5_onion_boundary=true
- review_packet_includes_target_standard_matrix=true
- review_packet_includes_deployment_blocker_plan=true
- review_packet_finding_tracker_synced=true
- private_docs_excluded_from_review_packet=true
- generated_release_artifacts_excluded_from_review_packet=true
- audit_finding_tracker_schema_machine_checkable=true
- audit_finding_counts_machine_checked=true
- sensitive_finding_private_route_required=true
- external_review_report_received=false
- audit_report_received=false
- external_review_completed=false
- audit_completed=false
- reviewer_signoff_claimed=false
- public_user_safety_signoff_claimed=false
- audited_claim_allowed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- next_required_gate=reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md
