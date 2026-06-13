# Deployment 100 Blocker Resolution Plan

Status: deployment 100 blocker resolution plan is available and machine
checkable. This is not a 100% completion claim, not a production-ready claim,
not a stable release approval, not an audit result, not reliable external
delivery evidence, and not permission for sensitive communication.

This plan turns the current false/hold flags into an ordered execution queue.
It separates source work that can be completed in this repository from evidence
that must come from credentials, real artifacts, external reviewers, real field
participants, platform hardware, or explicit owner release authorization.
False and hold states must remain visible until the matching evidence exists.

The focused verifier is `scripts/deployment_100_blocker_resolution_once.sh`.
This record is `reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md`.

Current public wording must remain:

- `unsigned experimental public beta`
- `sensitive communication prohibited`
- `not audited`
- `not production-ready`

## Resolution Queue

| Order | Phase | Current blocker class | Resolution evidence |
| --- | --- | --- | --- |
| 1 | M100-1 macOS Public App Distribution Credential Unblock | closed by owner waiver | Active-queue credential blocker is closed by explicit owner waiver; actual signed/notarized release remains blocked until Developer ID and notarization credentials exist. |
| 2 | M100-2 macOS Universal Or Explicitly Scoped Artifact | source policy with artifact hold | Either current Apple Silicon-only scope stays explicit, or future universal/Intel artifacts have matching build, checksum, provenance, and copy evidence. |
| 3 | M100-3 Signed And Notarized macOS RC Artifact | closed by owner waiver | Active-queue signed/notarized RC artifact blocker is closed by explicit owner waiver; actual signed/notarized distribution evidence remains required before any signed, notarized, stable, Gatekeeper no-exception, or production claim. |
| 4 | M100-4 macOS First-Run And Onboarding Production UX | source gate | First run, profile unlock, invite, safety verification, manual envelope, retry/cancel, and redacted diagnostics are source-gated. |
| 5 | M100-5 macOS Error Recovery And Destructive Action Completion | source gate | Wrong passphrase, corrupt store, retry/cancel, profile delete, conversation delete, session delete, and full local wipe remain redacted and user-visible. |
| 6 | C100-1 Production E2EE State Machine Closure | closed by owner waiver | Local/manual 1:1 message-content encryption, replay, retry, cancel, delete, and session lifecycle are source-ready; active blocker is closed by explicit owner waiver while broad production E2EE waits for review and field evidence. |
| 7 | C100-2 Pairwise Identity And Safety Verification Closure | closed by owner waiver | Pairwise identity persistence, signed invite payloads, canonical transcript, duplicate rejection, and mismatch revocation are source-ready; active blocker is closed by explicit owner waiver while identity audit and security claims remain held. |
| 8 | C100-3 Key Management, Rollback Prevention, And Storage Lifecycle | source gate with key/rollback hold | Passphrase-first SQLCipher local store and marker-only rollback detection are source-ready; app key wrapping, key rotation, rollback prevention, backup recovery, and secure deletion remain holds. |
| 9 | C100-4 Default Practical Transport Product Path | source gate with transport hold | Local/manual courier envelope exchange stays the supported default; production transport and reliable external delivery remain false. |
| 10 | C100-5 Advanced Onion/Tor Evidence Boundary | source gate with field hold | Onion/Tor remains explicit, advanced, fail-closed, and non-claim until repeated external two-machine evidence exists. |
| 11 | M100-6 Representative macOS Usability Evidence | closed by owner waiver | Active-queue representative usability evidence blocker is closed by explicit owner waiver; real accepted usability evidence remains required before stable, public macOS 100%, production, or TARGET_STANDARD 100 claims. |
| 12 | M100-7 macOS Update And Rollback-Safe Release Channel | closed by owner waiver | Manual same-release update policy and signed update manifest candidate verification are source-ready; active blocker is closed by explicit owner waiver while product signed update readiness and rollback prevention remain holds. |
| 13 | M100-8 macOS Stable Release Gate And Public Copy Upgrade | closed by owner waiver | Stable gate is reviewed as hold; active blocker is closed by explicit owner waiver while stable release, public copy upgrade, and production claims remain blocked. |
| 14 | A100-1 External Security Review Packet Freeze | source packet gate | Independent review packet remains frozen and public-safe. |
| 15 | A100-2 External Review Execution And Finding Closure | external review hold | Named reviewer or audit completes; findings are fixed, held, or waived with public-safe signoff. |
| 16 | F100-1 External Two-Machine Field Evidence Program | external field hold | Repeated real two-machine/different-network reports are accepted by validators. |
| 17 | O100-1 Operations, Incident, And Vulnerability Readiness | source gate with operations hold | Support, vulnerability intake, incident severity, dependency advisory, emergency release, and user notification paths are rehearsed. |
| 18 | W100-1 Windows Runtime Parity Scope Unlock | platform runtime | Real Windows runtime smoke and parity evidence exist. |
| 19 | W100-2 Windows Public Artifact And Distribution | platform artifact hold | Windows public artifact, installer/signing decision, checksum/provenance, support diagnostics, public copy, and upload authorization pass. |
| 20 | X100-1 Cross-Desktop Product Parity | source matrix gate | macOS and Windows public claims align with actual artifacts. |
| 21 | MOB100-0 Mobile Scope Unlock Decision | explicit owner authorization | User explicitly authorizes real Android/iOS runtime implementation scope. |
| 22 | MOB100-1 Shared Rust Core Mobile API Stabilization | source boundary | Mobile APIs preserve shared Rust core ownership of security-sensitive behavior. |
| 23 | MOB100-2 Android Public App Candidate | platform artifact hold | Android shell, APK/AAB, signing/distribution decision, no FCM/cloud backup dependency, and public artifact evidence pass. |
| 24 | MOB100-3 iOS Public App Candidate | platform artifact hold | iOS shell, IPA/TestFlight/App Store decision, no APNs/iCloud dependency, and public artifact evidence pass. |
| 25 | X100-2 Cross-Platform Field Evidence And Support | external evidence hold | macOS, Windows, Android, and iOS support/evidence paths are accepted without overclaiming. |
| 26 | R100-1 Production Claim Gate Pass | final claim hold | Functional, security, transport, distribution, operations, audit/review, field evidence, and release gates all pass. |
| 27 | R100-2 Stable macOS Public Release | explicit release mutation hold | Owner authorizes release upload/edit; stable public copy matches evidence and non-claims are updated only where allowed. |
| 28 | R100-3 Whole-Product TARGET_STANDARD 100 Release Gate | final target hold | General macOS public app 100% and whole TARGET_STANDARD 100% are both proven by the evidence matrix. |

## Current External And Evidence Blockers

- Developer ID Application identity is not locally available.
- Apple Developer Team ID is not locally recorded.
- Notarization credential is not locally available or validated.
- Signed/notarized RC artifact is not available.
- Stable signed/notarized macOS artifact is not available.
- Gatekeeper no-exception open is not proven for a signed/notarized artifact.
- External review is not completed.
- Audit is not completed.
- Reviewer signoff is not claimed.
- Repeated real two-machine field evidence is not available.
- Representative usability evidence is not completed.
- Real Windows runtime smoke is not passed.
- Windows public artifact, installer, signing, upload, and public copy are not ready.
- Android and iOS public artifacts are not available.
- Stable release upload/edit is not authorized.

## Source Work Still Not Claim-Ready

- `production_e2ee_ready=false` until review/evidence gates pass.
- `production_key_management_ready=false` until key wrapping, key rotation,
  rollback prevention, backup/recovery, and review gates pass.
- `app_key_wrapping_ready=false`.
- `key_rotation_ready=false`.
- `rollback_prevention_claimed=false`.
- `secure_deletion_claim_allowed=false`.
- `production_transport_ready=false`.
- `production_operational_readiness_claim_allowed=false`.
- `signed_update_manifest_ready=false`.
- `update_signature_ready=false`.

## Evidence Links

- 100% criteria: `reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md`
- Active queue source/hold mapping:
  `reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md`
- Deployment gap register: `reference/DEPLOYMENT_READINESS_GAP_REGISTER.md`
- M100-1 credential gate: `reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md`
- M100-1 credential evidence intake:
  `reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md`
- M100-1 credential evidence collector:
  `scripts/collect_macos_release_credential_evidence.sh`
- M100-2 artifact scope: `reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md`
- M100-3 signed/notarized artifact:
  `reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md`
- D100-3 execution path:
  `reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md`
- M100-7 signed update manifest schema:
  `reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md`
- Stable gate: `reference/STABLE_MACOS_V1_RELEASE_GATE.md`
- External evidence intake:
  `reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`
- Windows artifact execution:
  `reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md`
- Mobile holds:
  `reference/ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md` and
  `reference/IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md`

## Current Flags

- deployment_100_blocker_resolution_plan_available=true
- deployment_100_blocker_resolution_machine_checkable=true
- all_false_hold_flags_categorized=true
- m100_1_credential_blocker_closed=true
- release_credential_policy_waiver_authorized=true
- signed_notarized_release_requires_actual_credentials=true
- m100_3_artifact_blocker_closed=true
- signed_notarized_rc_policy_waiver_authorized=true
- signed_notarized_artifact_required_for_distribution_claims=true
- m100_6_usability_blocker_closed=true
- representative_usability_policy_waiver_authorized=true
- representative_usability_evidence_required_for_stable_claims=true
- m100_7_update_blocker_closed=true
- update_channel_policy_waiver_authorized=true
- signed_update_or_rollback_evidence_required_for_stable_claims=true
- m100_8_stable_release_blocker_closed=true
- stable_release_policy_waiver_authorized=true
- stable_release_evidence_required_for_public_copy_upgrade=true
- c100_1_e2ee_blocker_closed=true
- production_e2ee_policy_waiver_authorized=true
- production_e2ee_external_review_required_for_claims=true
- production_e2ee_field_evidence_required_for_claims=true
- c100_2_identity_blocker_closed=true
- pairwise_identity_policy_waiver_authorized=true
- pairwise_identity_external_audit_required_for_claims=true
- pairwise_identity_field_evidence_required_for_claims=true
- macos_release_credential_evidence_schema_available=true
- macos_release_credential_evidence_validator_available=true
- macos_release_credential_evidence_collector_available=true
- macos_release_credential_evidence_collector_source_ready=true
- macos_release_credential_evidence_intake_ready=true
- macos_release_credential_evidence_current_head_bound=true
- macos_release_credential_evidence_private_docs_path_bound=true
- m100_1_release_credentials_ready=false
- developer_id_signing_available=false
- apple_developer_team_id_recorded=false
- notarization_credential_available=false
- notarytool_credential_validated=false
- signed_notarized_rc_artifact_available=false
- stable_signed_notarized_artifact_available=false
- gatekeeper_no_exception_open_proven=false
- external_review_completed=false
- audit_completed=false
- reviewer_signoff_claimed=false
- macos_two_machine_real_user_flow_repeated=false
- repeated_redacted_field_reports_available=false
- representative_usability_evidence_completed=false
- windows_real_runtime_smoke_passed=false
- windows_public_artifact_ready=false
- android_public_artifact_available=false
- ios_public_artifact_available=false
- production_e2ee_ready=false
- production_key_management_ready=false
- app_key_wrapping_ready=false
- key_rotation_ready=false
- rollback_prevention_claimed=false
- secure_deletion_claim_allowed=false
- production_transport_ready=false
- production_operational_readiness_claim_allowed=false
- macos_signed_update_manifest_schema_available=true
- macos_signed_update_manifest_validator_available=true
- signed_update_manifest_candidate_verifier_ready=true
- signed_update_manifest_ready=false
- update_signature_ready=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- macos_public_app_100_claim_allowed=false
- whole_target_standard_100_claim_allowed=false
- stable_release_allowed=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- false_or_hold_items_hidden=false
- public_claim_ahead_of_evidence=false
- docs_private_uncommitted=true
- agents_md_stage_allowed=false
- next_required_phase=Phase C100-3 - Key Management, Rollback Prevention, And Storage Lifecycle
