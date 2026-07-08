# External Evidence Intake Execution

Status: D100-4 external evidence intake path is operator-ready and currently
held on missing real external review, representative usability sessions, and
real two-machine field reports. This is not an audit result, not reviewer
signoff, not accepted field evidence, not completed usability evidence, not
production-ready, not reliable external delivery, and not permission for
sensitive communication.

The focused verifier is `scripts/external_evidence_intake_execution_once.sh`.
It checks the intake path without fabricating external evidence.

## Intake Components

- Reviewer packet freeze:
  `reference/INDEPENDENT_REVIEW_PACKET.md` and
  `reference/EXTERNAL_REVIEW_AUDIT_READINESS.md`
- Review intake runbook and tracker validator:
  `reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md` and
  `scripts/validate_audit_finding_tracker.mjs`
- Finding tracker:
  `reference/AUDIT_FINDING_TRACKER.md`
- Field report packet and validator:
  `reference/REDACTED_FIELD_REPORT_PACKET.md` and
  `scripts/validate_redacted_field_reports.mjs`
- Representative usability report packet and validator:
  `reference/REPRESENTATIVE_USABILITY_REPORT_PACKET.md` and
  `scripts/validate_representative_usability_reports.mjs`
- Public-safe intake and private security routing:
  `reference/PUBLIC_INTAKE_POLICY.md` and `SECURITY.md`

## Execution Rules

1. Use only real external reviewer findings or real representative/field
   reports. Synthetic review, same-machine rehearsal, local-only reports, and
   operator-prepared examples are not accepted external evidence.
2. Collect only non-sensitive disposable test data.
3. Require tester acknowledgement that this is an unsigned experimental public
   beta, sensitive communication prohibited, not audited, and
   not production-ready.
4. Route sensitive security details through private vulnerability reporting or a
   minimal public contact request.
5. Validate field reports with `scripts/validate_redacted_field_reports.mjs`.
6. Validate representative usability reports with
   `scripts/validate_representative_usability_reports.mjs`.
7. Treat validator pass as candidate evidence only. Maintainer review and a
   later stable/release gate update are required before any wording changes.

## Current Gate Flags

- d100_4_external_evidence_intake_execution_reviewed=true
- external_evidence_intake_operator_ready=true
- external_review_intake_runbook_available=true
- external_review_intake_operator_ready=true
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
- reviewer_packet_freeze_ready=true
- audit_finding_tracker_ready=true
- audit_finding_tracker_schema_machine_checkable=true
- audit_finding_counts_machine_checked=true
- sensitive_finding_private_route_required=true
- field_report_validator_ready=true
- usability_report_validator_ready=true
- consent_non_sensitive_use_notice_ready=true
- external_execution_required=true
- fabricated_or_local_only_evidence_rejected=true
- representative_usability_sample_threshold=3-5
- field_report_sample_threshold=multiple-real-two-machine-plus-different-network
- review_packet_public_safe=true
- audit_finding_tracker_available=true
- redacted_field_report_packet_available=true
- redacted_field_report_validator_available=true
- representative_usability_report_packet_available=true
- representative_usability_report_validator_available=true
- external_review_completed=false
- audit_completed=false
- reviewer_signoff_claimed=false
- public_user_safety_signoff_claimed=false
- usability_study_completed=false
- representative_usability_evidence_completed=false
- macos_two_machine_real_user_flow_repeated=false
- repeated_redacted_field_reports_available=false
- production_field_evidence_ready=false
- reliable_external_delivery_claim_allowed=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- fabricated_review_or_peer_evidence_allowed=false
- local_only_evidence_promoted_to_external=false
- next_required_phase=D100-5 Windows public artifact execution path
