# Deployment Readiness Gap Register

Status: D100-0 deployment readiness gap reconciliation is recorded. This
register is a work plan and evidence map for moving from the current unsigned
experimental public beta to a fully deployable release. It is not a production
claim, stable release approval, audit result, reliable external delivery claim,
or permission for sensitive communication. Public wording remains not
production-ready, not audited, and sensitive communication prohibited.

The ordered 100% blocker resolution plan is tracked in
`reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md`.

Required public labels: `not production-ready`, `not audited`, `sensitive
communication prohibited`.

## Reconciled Source-Solved Items

These items no longer need to appear as generic `partial` or `hold` when the
current supported scope is named precisely:

| Area | Current resolved scope | Remaining blocker |
| --- | --- | --- |
| macOS architecture support | Current public artifact is explicitly Apple Silicon `aarch64` only. | Universal/Intel support remains false until a separate artifact is built and verified. |
| Onboarding and recovery UX | First-run, invite, safety verification, manual envelope, retry/cancel, destructive local lifecycle, and diagnostics are source-gated. | Representative user evidence remains false. |
| Pairwise identity | Local identity persistence, signed invite payloads, canonical safety transcript, duplicate rejection, rebuild/re-pairing, and mismatch revocation are source-gated. | Identity audit remains false. |
| Message-content E2EE | D100-1 source-ready protocol/session surface is gated by `reference/PRODUCTION_E2EE_SOURCE_GATE.md` for local/manual 1:1 message content, session, replay, retry, cancel, delete, and local record boundaries. | Broad production E2EE readiness, audit, sensitive-use, automatic networking, remote ack, and external delivery remain false. |
| Local key/deletion lifecycle | D100-2 source-ready local key/storage scope is gated by `reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md` for passphrase-first SQLCipher, forward-only schema versioning, marker-only rollback detection, and local logical delete/wipe. | Complete production key management, app key wrapping, key rotation, rollback prevention, backup recovery, and secure media deletion remain false. |
| Default transport | Local/manual courier envelope exchange is the supported default. | Production transport and reliable external delivery remain false. |
| Update/release integrity | Manual same-release GitHub Release verification, signed update manifest candidate verification, provenance, rollback warning, and emergency process are source-gated. | Product signed update readiness, rollback prevention, stable release approval, and release upload remain false. |
| External evidence intake | D100-4 review, field, and representative usability intake is gated by `reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`, with reviewer packet freeze, finding tracker validation, field report validation, representative usability validation, consent/non-sensitive-use notice, and local-only/fabricated evidence rejection. | Completed external review/audit, real repeated field reports, representative usability completion, and all related production/audit/reliability/sensitive-use claims remain false. |
| Windows public artifact execution | D100-5 Windows public artifact path is gated by `reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md`, with `reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md`, runtime smoke requirements, installer/signing decision, checksum/provenance, public copy, support diagnostics, and no-overclaim validation. | Real Windows runtime pass, public artifact, installer, signing, upload, and Windows public claim remain false. |
| Operations | Public/private intake, tabletop, emergency release, dependency triage, and support-template boundaries are source-gated. | Production operational readiness claim remains false. |

## Remaining External Or Evidence Blockers

These cannot be made true by editing source files alone:

- Developer ID Application identity available and used; D100-3 execution path is
  ready via `reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md`, but
  credential input remains false.
- Notarization credential available, successful notary submission, and stapling;
  D100-3 execution path is ready via
  `reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md`, but
  credential/artifact input remains false.
- Gatekeeper no-exception open on a normal supported macOS machine; D100-3
  assessment path is ready via
  `reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md`, but signed/notarized
  artifact remains false.
- Signed/notarized stable macOS artifact and owner stable release approval.
- Completed independent external review or audit with public-safe finding
  closure/signoff; D100-4 intake is ready via
  `reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`, but completion remains
  false.
- Repeated real two-machine field evidence with accepted redacted reports;
  D100-4 report validation is ready, but accepted external evidence remains
  false.
- Real representative usability evidence from the required user sample; D100-4
  report validation and consent notice are ready, but study completion remains
  false.
- Real Windows runtime smoke on Windows hardware plus a public Windows artifact;
  D100-5 execution path is ready via
  `reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md`, but runtime pass,
  artifact, installer, signing, upload, and public claim remain false.
- Explicit Android/iOS runtime implementation authorization and public mobile
  artifacts if full TARGET_STANDARD 100 remains the goal.
- Live release upload/edit authorization for any stable release mutation.

## Next Work Order

1. Resolve remaining external blockers: Developer ID/notary credentials,
   signed/notarized macOS artifact, completed external review/audit, repeated
   field evidence, real Windows artifact execution, mobile authorization, and
   explicit release upload approval.

## Current Flags

- deployment_readiness_gap_register_reviewed=true
- deployment_100_blocker_resolution_plan_available=true
- target_standard_100_deployment_gap_reconciled=true
- stale_generic_partial_or_hold_reduced=true
- source_solved_items_promoted_to_named_supported_scope=true
- external_blockers_still_visible=true
- false_or_hold_items_hidden=false
- public_claim_ahead_of_evidence=false
- macos_current_scope_supported=true
- macos_universal_intel_scope_still_hold=true
- onboarding_recovery_source_ready=true
- pairwise_identity_source_ready=true
- production_e2ee_source_gate_reviewed=true
- production_e2ee_source_ready=true
- d100_1_e2ee_source_gate_reviewed=true
- protocol_session_e2ee_source_ready=true
- protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete
- supported_default_transport_ready=true
- supported_local_key_lifecycle_ready=true
- supported_local_deletion_scope_ready=true
- production_key_management_source_gate_reviewed=true
- production_key_management_source_ready=true
- d100_2_key_management_source_gate_reviewed=true
- key_management_source_scope=passphrase-first-sqlcipher-local-profile-store-marker-rollback-local-delete-only
- manual_update_integrity_policy_available=true
- macos_signed_update_manifest_schema_available=true
- macos_signed_update_manifest_validator_available=true
- signed_update_manifest_candidate_verifier_ready=true
- d100_3_signed_notarized_execution_path_reviewed=true
- macos_signed_notarized_execution_path_available=true
- signed_notarized_rc_execution_ready=false
- d100_4_external_evidence_intake_execution_reviewed=true
- external_evidence_intake_operator_ready=true
- reviewer_packet_freeze_ready=true
- audit_finding_tracker_ready=true
- audit_finding_tracker_schema_machine_checkable=true
- audit_finding_counts_machine_checked=true
- field_report_validator_ready=true
- usability_report_validator_ready=true
- consent_non_sensitive_use_notice_ready=true
- fabricated_or_local_only_evidence_rejected=true
- local_only_evidence_promoted_to_external=false
- d100_5_windows_public_artifact_execution_path_reviewed=true
- windows_public_artifact_execution_path_available=true
- windows_real_runtime_result_schema_available=true
- windows_real_runtime_result_validator_available=true
- real_windows_runtime_smoke_requirements_defined=true
- windows_installer_signing_decision_recorded=true
- windows_checksum_provenance_requirements_defined=true
- windows_public_copy_requirements_defined=true
- windows_support_diagnostics_requirements_defined=true
- windows_no_overclaim_gate_ready=true
- windows_real_runtime_smoke_passed=false
- windows_public_artifact_ready=false
- windows_installer_ready=false
- windows_signing_ready=false
- windows_public_artifact_upload_allowed=false
- windows_release_packaging_allowed=false
- windows_generated_artifact_commit_allowed=false
- windows_public_copy_published=false
- windows_production_claim_allowed=false
- developer_id_signing_available=false
- notarization_available=false
- external_review_completed=false
- audit_completed=false
- macos_two_machine_real_user_flow_repeated=false
- representative_usability_evidence_completed=false
- windows_public_artifact_available=false
- android_public_artifact_available=false
- ios_public_artifact_available=false
- production_ready_claim_allowed=false
- production_e2ee_ready=false
- production_key_management_ready=false
- app_key_wrapping_ready=false
- key_rotation_ready=false
- rollback_prevention_claimed=false
- secure_deletion_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
