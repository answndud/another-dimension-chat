# macOS Emergency Release Integrity

Status: source-ready emergency release integrity boundary for manual macOS
release response. This is not release upload approval, not DMG rebuild
approval, not asset deletion approval, not an auto-update channel, and not
rollback-prevention evidence.

This boundary exists so a bad artifact, checksum/provenance mismatch,
dependency vulnerability, or claim-drift incident can be handled without
inventing evidence or mutating a live release from a source-side gate.

## Emergency Response Scope

- Use a public-safe advisory packet with incident class, affected release tag,
  affected artifact filename, affected platform, affected release class,
  affected artifact SHA-256, affected provenance SHA-256, affected distribution
  manifest SHA-256, same-release authority status, replacement release pointer
  when one exists, user stop/verify/install guidance, and public non-claims.
- Treat release tag, artifact filename, platform, release class, artifact
  SHA-256, provenance SHA-256, and distribution manifest SHA-256 as one bound
  release artifact identity. Do not publish or act on an advisory packet where
  any one of these fields is missing or copied from a different release source.
- Generate only advisory/checklist/manifest material until a separate explicit
  release task authorizes artifact creation, release edit, upload, asset
  deletion, or advisory publication.
- Keep users on manual GitHub Release verification. Branch files, source
  archives, platform-store pages, or copied checksums are not release authority.
- Rollback handling is warning and recovery guidance only. It does not claim
  automatic rollback prevention for local encrypted data or message state.

## Dependency Vulnerability Decision Table

| Condition | Decision | Release Action Boundary |
| --- | --- | --- |
| Vulnerability does not affect shipped locked dependencies or runtime path | hold | Keep current release; publish no stronger claim. |
| Vulnerability affects shipped dependency but no exploit path is identified | advisory | Public-safe advisory/checklist only unless owner authorizes a release task. |
| Vulnerability affects shipped runtime path and patch is available | rebuild | Source fix and focused verifier first; artifact rebuild requires explicit release task. |
| Artifact, signing material, checksum, provenance, or release authority is compromised | revoke | Tell users to stop using the bad artifact; release edit/asset deletion requires explicit release task. |
| Release artifact identity is inconsistent across tag, filename, platform, release class, checksum, provenance, or manifest | hold | Do not publish an advisory as release evidence; rebuild the packet from same-release artifacts. |

## Current Gate Flags

- macos_emergency_release_integrity_available=true
- emergency_release_advisory_packet_script_available=true
- emergency_release_no_artifact_mutation_verifier_ready=true
- emergency_advisory_requires_affected_release_artifact_binding=true
- emergency_advisory_requires_platform_release_class_binding=true
- emergency_advisory_requires_release_artifact_identity_tuple=true
- emergency_advisory_requires_distribution_manifest_sha256=true
- emergency_advisory_requires_signed_false_hold_flags=true
- emergency_release_generates_app_artifact=false
- emergency_release_upload_authorized=false
- emergency_release_dmg_rebuild_authorized=false
- emergency_release_asset_delete_authorized=false
- emergency_release_advisory_publication_authorized=false
- compromised_artifact_public_copy_ready=true
- dependency_vulnerability_decision_table_available=true
- dependency_vulnerability_decisions=hold#advisory#rebuild#revoke
- same_release_asset_authority_required=true
- branch_source_release_authority_allowed=false
- rollback_warning_policy_ready=true
- rollback_prevention_claimed=false
- auto_update_channel_ready=false
- signed_update_manifest_ready=false
- update_signature_ready=false
- production_distribution_ready=false
- high_risk_readiness_panel_emergency_controls_ready=true
- high_risk_readiness_panel_clipboard_expiry_ready=true
- panic_lock_ready=true
- emergency_local_wipe_ready=true
- emergency_wipe_confirmation=EMERGENCY_WIPE_LOCAL_DATA
- standard_local_wipe_confirmation=WIPE_LOCAL_DATA
- emergency_wipe_separate_from_standard_wipe=true
- manual_emergency_release_notice_ready=true
- clipboard_clear_ready=true
- clipboard_ttl_ms=15000
- coercion_safe_claim=false
- compromised_device_safe_claim=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
