# macOS Update And Rollback-Safe Release Channel

Status: M100-7 is closed for active-queue progress as a manual update
integrity policy and explicit owner policy waiver, not an auto-update channel.
This record connects same-release checksum/provenance authority, version
monotonicity policy, rollback warning, emergency release procedure, and
non-claim wording to a focused verifier.
Signed update manifest schema and candidate verification are tracked in
`reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md`. Emergency release
no-mutation handling is tracked in
`reference/MACOS_EMERGENCY_RELEASE_INTEGRITY.md`.
Signed update manifest candidates must include the same-release distribution
manifest SHA and the DMG-contained `.app` verification fields before the
candidate verifier accepts them. This prevents the update path from bypassing
the release distribution metadata gate. The verifier runs the distribution
manifest validator and compares the signed update payload against actual
distribution manifest, artifact, provenance, and contained-app fields instead
of accepting self-attested booleans.

The current public release class remains an unsigned experimental public beta.
No auto-update, signed update manifest, transparency log, stable release,
release upload, release edit, or rollback-prevention claim is authorized by
this gate. Public wording remains not production-ready, not audited, and
sensitive communication prohibited.

The selected workaround is an explicit owner policy waiver for M100-7 only:
missing signed update publication and product rollback-prevention evidence no
longer keep M100-7 in the active queue, but stable, production, public macOS
100%, and TARGET_STANDARD 100 claims still require real release-channel
evidence or a later explicit claim-policy decision.

## Supported Current Channel

- Manual GitHub Release download only.
- DMG, `.sha256`, provenance JSON, manifest, release notes, update-integrity
  note, dependency inventory, and lockfile hash evidence must be from the same
  release.
- Users are instructed not to mix release assets with branch files, source
  archives, another release, or platform store pages.
- Update rollback handling is a warning and recovery policy only; automatic
  rollback prevention remains false.
- Emergency release handling is defined in the operational incident process.
- Emergency release source tooling may generate advisory/checklist/manifest
  material only; release upload, release edit, asset deletion, DMG rebuild, and
  advisory publication require a separate explicit release task.
- Emergency notice is manual release identity verification only. It is not an
  update availability signal, background update check, push notice, auto-update
  prompt, or forced upgrade path.

## Future Pass Conditions

To pass as a stable update channel, a later release task must provide at least
one of these designs:

- Signed update manifests with version monotonicity and revocation handling.
- A manual stable release policy with signed/notarized artifacts, monotonic
  release records, same-release checksums/provenance, and explicit rollback
  warning/recovery.

Either design still needs external review, field evidence, operations review,
and owner release authorization before public wording changes.

## Current Flags

- macos_update_rollback_safe_release_channel_reviewed=true
- m100_7_update_blocker_closed=true
- update_channel_policy_waiver_authorized=true
- update_channel_waiver_scope=active-queue-unblock-only
- signed_update_or_rollback_evidence_required_for_stable_claims=true
- manual_update_integrity_policy_available=true
- same_release_asset_authority_required=true
- branch_source_release_authority_allowed=false
- source_archive_release_authority_allowed=false
- platform_store_security_boundary_allowed=false
- auto_update_channel_ready=false
- macos_signed_update_manifest_schema_available=true
- macos_signed_update_manifest_validator_available=true
- signed_update_manifest_candidate_verifier_ready=true
- signed_update_manifest_requires_distribution_manifest_sha256=true
- signed_update_manifest_requires_dmg_contained_app_evidence=true
- signed_update_manifest_requires_distribution_manifest_validation=true
- signed_update_manifest_requires_signed_false_hold_flags=true
- signed_update_manifest_previous_monotonicity_verifier_ready=true
- signed_update_manifest_ready=false
- update_signature_ready=false
- update_version_monotonicity_policy_ready=true
- rollback_warning_policy_ready=true
- rollback_prevention_claimed=false
- emergency_release_path_defined=true
- macos_emergency_release_integrity_available=true
- emergency_release_advisory_packet_script_available=true
- emergency_release_no_artifact_mutation_verifier_ready=true
- emergency_advisory_requires_affected_release_artifact_binding=true
- emergency_notice_manual_verification_only=true
- emergency_notice_update_availability_claim=false
- emergency_notice_auto_update_claim=false
- background_update_check=false
- push_update_notice=false
- forced_upgrade=false
- emergency_advisory_requires_distribution_manifest_sha256=true
- emergency_advisory_requires_signed_false_hold_flags=true
- emergency_release_generates_app_artifact=false
- emergency_release_advisory_publication_authorized=false
- dependency_vulnerability_decision_table_available=true
- dependency_vulnerability_decisions=hold#advisory#rebuild#revoke
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- stable_release_allowed=false
- production_distribution_ready=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- next_required_phase=O100-1 Operations, Incident, And Vulnerability Readiness
