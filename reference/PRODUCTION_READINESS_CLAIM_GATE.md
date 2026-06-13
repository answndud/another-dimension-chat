# Production Readiness Claim Gate

Status: not satisfied. RB-8 production claim release-class decision is recorded
in `reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md`. The public wording
must remain unsigned experimental public beta, sensitive communication
prohibited, not audited, and not production-ready until this gate is closed by a
later stable release phase.

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
   reviewable documentation, including
   `reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md`.
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

D100-4 external evidence intake execution makes review, field, and
representative usability report intake operator-ready through
`reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`. It does not complete review,
audit, field evidence, usability evidence, or any production claim.

## Current Decision

- rb_8_production_claim_release_class_decision_reviewed=true
- stable_release_candidate_gate_decision=lower-release-class-only
- next_release_class=signed-public-beta-or-rc
- production_ready_claim_allowed=false
- beta_wording_removal_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- signed_notarized_security_boundary=false
- lower_release_class_claim_boundary_ready=true
- public_wording_matches_lower_release_class=true
- owner_stable_release_approval_recorded=false
- ops_2_protocol_session_lifecycle_gate_reviewed=true
- d100_1_e2ee_source_gate_reviewed=true
- protocol_session_e2ee_source_ready=true
- ops_3_key_storage_lifecycle_gate_reviewed=true
- d100_2_key_management_source_gate_reviewed=true
- production_key_management_source_ready=true
- sqlcipher_passphrase_rekey_source_ready=true
- tauri_profile_passphrase_rekey_command_ready=true
- ops_4_default_transport_product_path_reviewed=true
- production_transport_ready=false
- ops_5_macos_production_ux_onboarding_gate_reviewed=true
- production_wording_ready=false
- usability_study_completed=false
- ops_6_macos_production_distribution_gate_reviewed=true
- rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true
- stable_signed_notarized_artifact_available=false
- production_distribution_ready=false
- stable_or_production_release_allowed_without_signed_artifact=false
- unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true
- signed_artifact_no_longer_blocks_lower_release_class=true
- signed_artifact_still_blocks_stable_or_production_claims=true
- ops_7_external_review_audit_readiness_gate_reviewed=true
- a100_1_external_security_review_packet_frozen=true
- a100_2_external_review_execution_blocker_closed=true
- external_review_execution_policy_waiver_authorized=true
- named_external_review_required_for_claims=true
- accepted_audit_finding_closure_required_for_claims=true
- external_review_execution_claim_allowed=false
- audit_finding_closure_claim_allowed=false
- review_packet_synced_to_latest_source_gates=true
- review_packet_finding_tracker_synced=true
- d100_4_external_evidence_intake_execution_reviewed=true
- external_evidence_intake_operator_ready=true
- external_review_intake_runbook_available=true
- audit_finding_tracker_schema_machine_checkable=true
- audit_finding_counts_machine_checked=true
- rb_6_external_review_release_class_scope_down_reviewed=true
- external_review_completed=false
- audit_completed=false
- reviewer_signoff_claimed=false
- public_user_safety_signoff_claimed=false
- stable_or_production_release_allowed_without_external_review=false
- signed_public_beta_or_rc_release_class_allowed_without_external_review=true
- external_review_no_longer_blocks_lower_release_class=true
- external_review_still_blocks_stable_or_production_claims=true
- ops_8_field_evidence_reliability_program_reviewed=true
- field_report_validator_ready=true
- usability_report_validator_ready=true
- consent_non_sensitive_use_notice_ready=true
- representative_usability_sample_threshold=3-5
- rb_5_field_evidence_release_class_scope_down_reviewed=true
- redacted_field_report_packet_available=true
- redacted_field_report_validator_available=true
- macos_two_machine_real_user_flow_repeated=false
- repeated_redacted_field_reports_available=false
- production_field_evidence_ready=false
- stable_or_production_release_allowed_without_field_evidence=false
- signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true
- field_evidence_no_longer_blocks_lower_release_class=true
- field_evidence_still_blocks_stable_or_production_claims=true
- ops_9_operational_support_incident_process_reviewed=true
- incident_response_tabletop_completed=true
- support_template_review_completed=true
- production_operational_readiness_claim_allowed=false
- ops_10_stable_macos_v1_release_gate_reviewed=true
- stable_release_gate_decision=hold
- stable_macos_v1_release_allowed=false
- public_stable_release_allowed=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- release_body_beta_wording_removal_authorized=false
- next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision
