# macOS Stable Artifact Release-Class Scope-Down

Status: RB-7 release-class scope-down closure. This is not a signed stable
artifact, not a notarized artifact, not a stapled artifact, not a release
upload, not a DMG rebuild, not an auto-update channel, not production
distribution readiness, and not a security-ready claim.

The RB-7 blocker cannot be closed without Developer ID signing and notarization
credentials. The accepted workaround is to lower the release class until those
credentials and artifacts exist.

## Scope-Down Decision

Signed/notarized/stapled macOS artifacts remain required before stable macOS
release wording can open. They are not required to continue source-side work
toward an unsigned or signed public beta / RC if public wording keeps:

- `unsigned experimental public beta` or an explicit non-stable RC class,
- `not audited`,
- `not production-ready`,
- `sensitive communication prohibited`.

The current update model remains manual same-release GitHub assets only. No
auto-update channel, signed update manifest, branch-source update authority, or
store trust boundary is introduced by this closure.

## Required Future Artifact Work

Before stable macOS distribution can open, maintainers still need:

- Developer ID signing identity,
- hardened runtime/signing configuration where appropriate,
- notarization submission and stapling,
- signed/notarized app bundle and distribution container,
- same-release SHA-256/provenance/manifest/release notes/dependency evidence,
- clean install rehearsal without Gatekeeper manual bypass,
- explicit update and rollback policy for the selected release class.

## Current Scope-Down Flags

- rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true
- developer_id_signing_available=false
- notarization_credential_available=false
- stable_signed_notarized_artifact_available=false
- gatekeeper_manual_bypass_required_for_current_beta=true
- auto_update_channel_available=false
- update_signature_ready=false
- rollback_policy_ready=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- generated_release_artifacts_commit_allowed=false
- production_distribution_ready=false
- signed_notarized_security_boundary=false
- security_ready_claimed=false
- stable_or_production_release_allowed_without_signed_artifact=false
- unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true
- signed_artifact_no_longer_blocks_lower_release_class=true
- signed_artifact_still_blocks_stable_or_production_claims=true
- next_required_phase=RB-8 production claim and stable release candidate gate
