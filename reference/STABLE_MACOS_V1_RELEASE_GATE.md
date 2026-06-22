# Stable macOS v1.0 Release Gate

Status: OPS-10 stable macOS v1.0 gate reviewed with decision hold. This does
not authorize a stable release, release upload, DMG rebuild, GitHub Release
edit, beta wording removal, production-ready claim, audited claim,
security-ready claim, reliable external delivery claim, or sensitive
communication permission.

The current public artifact remains the macOS Apple Silicon unsigned
experimental public beta. The stable release gate is complete as a public-safe
hold decision only.

RB-0 release authority and credential unblock is recorded in
`reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md`. GitHub admin access and
Xcode/notarytool availability are observed, but local code-signing identities,
Developer ID signing, and notarization credentials are unavailable.

RB-1 supported local/manual E2EE claim closure is recorded in
`reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md`. It allows only supported
1:1 local/manual envelope message-content encryption wording. Broad
`production_e2ee_ready`, audited E2EE, secure messenger, sensitive-use,
automatic network messaging, remote acknowledgement, and external delivery
claims remain false.

RB-2 supported key/rollback/deletion claim closure is recorded in
`reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md`. It allows only
passphrase-first SQLCipher-backed local profile store access, marker-only
rollback detection, and explicit local logical delete / owned app-data wipe
wording. Complete `production_key_management_ready`, app key wrapping, rollback
prevention, secure media deletion, backup recovery, security-ready, and
sensitive-use claims remain false.

RB-3 supported default practical transport closure is recorded in
`reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md`. It makes the
supported default transport local/manual courier envelope exchange only.
Automatic network delivery, central message server delivery, reliable external
delivery, production transport readiness, and sensitive-use claims remain false.

RB-4 macOS usability/recovery closure is recorded in
`reference/MACOS_USABILITY_RECOVERY_CLOSURE.md`. It provides an owner-observed
critical desktop task script and recovery vocabulary alignment. Representative
3-5-person usability study completion and production wording readiness remain
false.

RB-5 field evidence scope-down is recorded in
`reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md`. It does not claim real
macOS two-machine evidence. It only removes missing field evidence as a blocker
for lower release classes such as signed public beta or RC. Field evidence
still blocks stable, production, reliable external delivery, and sensitive-use
wording.

## Gate Decision

Decision: hold.

Reason: the source-side readiness inputs from OPS-2 through OPS-9 are present,
but stable release prerequisites are still false. A stable release requires
actual signed/notarized artifact work, completed external review or audit,
field evidence, and a separate owner release decision.

## Required Inputs And Current Result

| Area | Current result | Stable impact |
| --- | --- | --- |
| Protocol/session lifecycle | Supported local/manual envelope message-content scope is ready; broad `production_e2ee_ready=false`. | Hold production-ready and security-ready claims. |
| Key/storage lifecycle | Supported local key/deletion scope exists; broad `production_key_management_ready=false`. | Hold sensitive-use and security-ready claims. |
| Default transport | Supported local/manual courier envelope default exists; broad `production_transport_ready=false`. | Hold reliable external delivery claims. |
| macOS UX/onboarding | Owner-observed task script exists; `usability_study_completed=false`. | Hold production wording removal. |
| macOS distribution | Distribution gate exists; `stable_signed_notarized_artifact_available=false`. | Hold stable release publication. |
| External review/audit | Review packet exists; `external_review_completed=false` and `audit_completed=false`. | Keep `not audited`. |
| Field evidence | Program and validator exist; RB-5 scope-down permits lower release classes only; `macos_two_machine_real_user_flow_repeated=false`. | Hold stable, reliable delivery, production, and sensitive-use claims. |
| Operations | Incident/support process exists; `production_operational_readiness_claim_allowed=false`. | Hold production operations claim. |

## Public Wording Decision

Keep all current public wording:

- `unsigned experimental public beta`
- `sensitive communication prohibited`
- `not audited`
- `not production-ready`

Do not publish stable release notes, remove beta wording, or describe this app
as a secure messenger, audited, production-ready, reliable external onion
delivery product, Briar/Cwtch-equivalent product, censorship-resistant product,
or safe for sensitive communication.

## Release Mutation Boundary

This gate does not authorize:

- release upload,
- release body edit,
- release asset deletion,
- DMG rebuild,
- generated `public-release/` commit,
- generated `beta-artifacts/` commit,
- signing or notarization claim,
- auto-update channel creation.

Any future stable release requires an explicit release task and a fresh stable
preflight after the blockers below are resolved.

## Remaining Stable Blockers

- No signed/notarized stable macOS artifact exists.
- No completed external review or audit exists.
- No repeated real macOS two-machine field evidence exists.
- Broad production E2EE readiness remains false; only supported local/manual
  envelope message-content scope is ready.
- Broad production key-management readiness remains false; only supported local
  key lifecycle, marker-only rollback detection, and local deletion/wipe scopes
  are ready.
- Broad production transport readiness remains false; only supported
  local/manual courier envelope exchange is ready.
- Production distribution readiness remains false.
- Production field evidence readiness remains false.
- Sensitive communication remains prohibited.
- Owner stable release approval is not recorded.

## Current Gate Flags

- stable_macos_v1_release_gate_reviewed=true
- stable_release_gate_decision=hold
- stable_macos_v1_release_allowed=false
- public_stable_release_allowed=false
- stable_signed_notarized_artifact_available=false
- external_review_completed=false
- audit_completed=false
- macos_two_machine_real_user_flow_repeated=false
- rb_5_field_evidence_release_class_scope_down_reviewed=true
- real_external_macos_two_machine_reports_available=false
- rb_1_local_manual_e2ee_claim_closure_reviewed=true
- supported_local_manual_e2ee_ready=true
- supported_local_manual_e2ee_scope=1:1-local-manual-envelope-message-content-only
- rb_2_key_rollback_deletion_claim_closure_reviewed=true
- supported_local_key_lifecycle_ready=true
- supported_local_key_lifecycle_scope=passphrase-first-sqlcipher-local-profile-store-only
- supported_rollback_detection_ready=true
- supported_rollback_detection_scope=marker-only-detection-user-visible-reset-required
- supported_local_deletion_scope_ready=true
- supported_local_deletion_scope=local-logical-delete-and-owned-app-data-wipe-only
- rb_3_default_practical_transport_closure_reviewed=true
- supported_default_transport_ready=true
- supported_default_transport_scope=local-manual-courier-envelope-exchange-only
- rb_4_macos_usability_recovery_closure_reviewed=true
- supported_owner_observed_usability_rehearsal_ready=true
- supported_usability_recovery_scope=owner-observed-critical-desktop-task-script-only
- critical_desktop_task_script_ready=true
- recovery_vocabulary_aligned=true
- usability_study_completed=false
- production_wording_ready=false
- production_e2ee_ready=false
- production_key_management_ready=false
- app_key_wrapping_ready=false
- rollback_prevention_claimed=false
- secure_deletion_claim_allowed=false
- production_transport_ready=false
- reliable_external_delivery_claim_allowed=false
- stable_or_production_release_allowed_without_field_evidence=false
- signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true
- field_evidence_no_longer_blocks_lower_release_class=true
- field_evidence_still_blocks_stable_or_production_claims=true
- production_distribution_ready=false
- production_field_evidence_ready=false
- production_operational_readiness_claim_allowed=false
- production_ready_claim_allowed=false
- beta_wording_removal_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- release_body_beta_wording_removal_authorized=false
- release_authority_credential_unblock_reviewed=true
- github_admin_observed=true
- xcode_available=true
- notarytool_available=true
- codesigning_identity_available=false
- developer_id_signing_available=false
- notarization_credential_available=false
- stable_release_scope_down_until_credentials=true
- next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision
