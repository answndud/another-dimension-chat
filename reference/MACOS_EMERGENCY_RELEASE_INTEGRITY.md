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
  affected artifact, same-release authority status, replacement release pointer
  when one exists, user stop/verify/install guidance, and public non-claims.
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

## Current Gate Flags

- macos_emergency_release_integrity_available=true
- emergency_release_advisory_packet_script_available=true
- emergency_release_no_artifact_mutation_verifier_ready=true
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
- security_ready_claimed=false
- sensitive_communication_allowed=false
