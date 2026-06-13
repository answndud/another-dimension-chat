# Field Evidence And Reliability Program

Status: OPS-8 source-side field evidence program gate closed, with RB-5
release-class scope-down recorded in
`reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md`. This is a public-safe
evidence collection plan and reliability claim boundary, not a real external
two-machine success result, not repeated field evidence, not production
readiness, not audited security, and not permission for sensitive communication.

Required public labels: unsigned experimental public beta, sensitive
communication prohibited, not audited, and not production-ready.

The program defines which evidence can change transport and production wording.
It also defines what must remain false until real redacted reports exist.
D100-4 intake execution is tracked in
`reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`; it makes the report intake
path operator-ready without accepting local-only or fabricated evidence.

## Evidence Ladder

Evidence must be collected in this order:

1. Same-machine two-profile rehearsal.
2. Local two-instance rehearsal.
3. macOS two-machine real user flow.
4. Different-network two-machine flow.
5. Restart/resume, offline/online transition, and failed-delivery recovery.
6. Repeated redacted field reports from real users.
7. External review of the field evidence before reliability, production-ready,
   or sensitive-use wording changes.

Earlier steps do not replace later steps. Same-machine rehearsal, local
two-instance rehearsal, source preflight, screenshots, public diagnostics, and
operator-prepared packets are not external peer evidence.

## Required Flow Coverage

Before any reliable external delivery or production-ready wording can be
considered, redacted reports must cover:

- clean install and checksum verification,
- first launch and warning acknowledgement,
- local profile create/unlock,
- invite creation and join,
- safety phrase comparison,
- manual encrypted envelope send/export/import/reply,
- retry and cancel recovery after a failed or stale pending message,
- app restart and room/profile resume,
- offline/online transition recovery,
- failed delivery recovery with a documented next action,
- local delete/wipe lifecycle controls,
- public support diagnostics copy with no private data.

For advanced onion/Tor experiments, reports may only state coarse status
classes from `reference/TRANSPORT_EXPERIMENT_RUNBOOK.md`. They must not claim
usable onion messaging unless a later phase implements and separately reviews
that runtime path.

## Report Data Boundary

Redacted field reports may include only:

- app version,
- build channel,
- build commit,
- platform pair,
- checksum result,
- install path reached,
- flow scope,
- broad network condition class,
- run count,
- pass/fail status per required flow area,
- broad failure class,
- recovery next action,
- app-launch network stayed false,
- default transport path remained local manual encrypted envelope exchange.

Reports must not include bridge lines, onion endpoints, invite codes, pairing
payloads, envelope payloads, endpoint payloads, safety phrases, profile names,
contact identifiers, message text, local paths, raw logs, crash dumps,
screenshots of private room data, passphrases, private keys, key material,
files from `docs/`, local app data, or private planning notes.

## Reliability Decision Rule

Maintainers may only change reliability wording after all of these are true:

- multiple real macOS two-machine reports exist,
- at least one different-network run exists,
- restart/resume is covered,
- offline/online transition is covered,
- failed delivery recovery is covered,
- reports are redacted and public-safe,
- no critical or high unresolved field blockers remain,
- external review confirms the wording does not exceed the evidence.

If any required area is missing, the decision is hold. A hold keeps
`reliable external delivery`, `production-ready`, `security-ready`, `audited`,
and `sensitive communication allowed` wording false.

## RB-5 Scope-Down

RB-5 does not fabricate evidence. Instead, it removes missing field evidence as
a blocker for lower release classes only. Source-side work may continue toward
a signed public beta or RC while field evidence remains a stable/production
claim blocker.

Public wording must still say `sensitive communication prohibited`,
`not audited`, and `not production-ready`.

## C100-5 Advanced Onion/Tor Boundary

C100-5 is closed for active-queue progress by explicit owner policy waiver
only. The waiver does not count as a real two-machine run, does not accept
local-only or synthetic evidence, and does not permit reliable external onion
delivery wording.

The advanced onion/Tor path remains explicit-user-triggered, fail-closed,
non-default, non-production, and claim-blocked until repeated accepted
redacted reports and external review exist.

## Current Gate Flags

- field_evidence_reliability_program_reviewed=true
- c100_5_onion_evidence_blocker_closed=true
- advanced_onion_policy_waiver_authorized=true
- advanced_onion_waiver_scope=active-queue-unblock-only
- advanced_onion_field_evidence_required_for_claims=true
- advanced_onion_repeated_external_evidence_required_for_claims=true
- d100_4_external_evidence_intake_execution_reviewed=true
- external_evidence_intake_operator_ready=true
- field_report_validator_ready=true
- rb_5_field_evidence_release_class_scope_down_reviewed=true
- redacted_field_report_packet_available=true
- redacted_field_report_validator_available=true
- same_machine_rehearsal_source_available=true
- local_two_instance_rehearsal_completed=false
- macos_two_machine_real_user_flow_repeated=false
- different_networks_covered=false
- restart_resume_covered=false
- offline_online_transition_covered=false
- failed_delivery_recovery_documented=false
- repeated_redacted_field_reports_available=false
- raw_logs_or_private_payloads_allowed=false
- fabricated_peer_evidence_allowed=false
- external_delivery_success_claim_allowed=false
- reliable_external_delivery_claim_allowed=false
- repeated_external_onion_evidence_claim_allowed=false
- production_field_evidence_ready=false
- sensitive_communication_allowed=false
- stable_or_production_release_allowed_without_field_evidence=false
- signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true
- field_evidence_no_longer_blocks_lower_release_class=true
- field_evidence_still_blocks_stable_or_production_claims=true
- next_required_phase=RB-6 external review and audit closure
