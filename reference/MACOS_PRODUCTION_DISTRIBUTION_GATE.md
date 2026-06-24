# macOS Production Distribution Gate

Status: OPS-6 source-side distribution gate closed as a hold record, with RB-7
release-class scope-down recorded in
`reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md`. This does not
create a stable macOS release, signed artifact, notarized artifact, auto-update
channel, release upload, DMG rebuild, or production-ready claim.

The current public artifact remains the Apple Silicon unsigned experimental
public beta DMG. Production distribution remains blocked until Developer ID
signing, notarization, stable artifact packaging, matching checksum/provenance,
release notes, and update/rollback policy are completed through an explicit
release task.

## Current Distribution State

- Current public artifact: unsigned macOS Apple Silicon public beta DMG.
- Current install model: GitHub Release download, same-release SHA-256
  verification, and macOS Privacy & Security manual allow if Gatekeeper blocks
  the unsigned app.
- Current release authority: files attached to the same GitHub Release, not
  branch source files, GitHub source archives, or local generated folders.
- Current update model: manual GitHub Release download only.
- Current auto-update model: none.
- Current signing state: no Developer ID signed stable artifact.
- Current notarization state: no notarized stable artifact.
- Current distribution claim: still unsigned experimental public beta, not
  audited, not production-ready, and sensitive communication prohibited.

## Stable Release Requirements

Before opening a non-beta macOS release, all of these must be true:

- Developer ID certificate and signing identity are available to the release
  operator.
- The macOS app bundle is signed with hardened runtime where appropriate.
- The DMG or distribution container is signed when required by the selected
  packaging flow.
- The artifact is notarized and stapled, or the release notes explicitly record
  any notarization failure as a blocker.
- The stable release asset has matching SHA-256, provenance JSON, manifest,
  release notes, update-integrity note, supply-chain baseline, dependency
  evidence, and install guide in the same GitHub Release.
- Clean install on macOS does not require Gatekeeper manual bypass.
- Auto-update remains absent, or if introduced, has signed update metadata,
  rollback/failure policy, and recovery documentation.
- Signing/notarization is described as distribution ergonomics, not as the
  security trust boundary for the messenger.

## Explicit Holds

- No release upload is authorized by this source gate.
- No DMG rebuild is authorized by this source gate.
- No GitHub Release body edit is authorized by this source gate.
- Generated `public-release/` and `beta-artifacts/` contents must remain ignored
  and uncommitted.
- The public non-claim copy must stay in place until OPS-10 and external review
  gates close.

## RB-7 Scope-Down

RB-7 does not fabricate signing credentials or notarization. Instead, it removes
missing signed/stable artifact work as a blocker for lower release classes only.
Source-side work may continue toward an unsigned or signed public beta / RC
while stable macOS distribution remains held.

Public wording must still say `not production-ready` and
`sensitive communication prohibited`.

## Evidence Anchors

- Manual update integrity boundary: `reference/UPDATE_INTEGRITY.md`
- Unsigned public beta final source report:
  `reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md`
- Fresh install rehearsal result:
  `reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md`
- Signed/notarized RC artifact runbook and verifier:
  `reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md`
- Signed/notarized execution path:
  `reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md`
- Release distribution metadata schema:
  `reference/MACOS_RELEASE_DISTRIBUTION_METADATA.md`
- Historical release page update gate:
  `scripts/macos_release_page_update_gate_once.sh`
- Historical public beta source preflight:
  `scripts/macos_public_beta_final_source_preflight_once.sh`
- Historical release staging script:
  `scripts/prepare_unsigned_public_beta_release.sh`

These release-task scripts remain documented as hold-record references. They
are not part of the current maintained development baseline; current local
verification entrypoints are `scripts/verify_all.sh` and
`scripts/verify_full.sh`.

## Current Gate Flags

- macos_production_distribution_gate_reviewed=true
- rb_7_macos_stable_artifact_release_class_scope_down_reviewed=true
- current_public_artifact_unsigned_beta=true
- developer_id_signing_available=false
- notarization_available=false
- stable_signed_notarized_artifact_available=false
- gatekeeper_manual_bypass_required_for_current_beta=true
- auto_update_channel_available=false
- update_signature_ready=false
- rollback_policy_ready=false
- checksum_provenance_manifest_boundary_ready=true
- macos_release_distribution_manifest_schema_available=true
- macos_release_distribution_metadata_generator_ready=true
- macos_release_upload_script_ready=true
- same_release_asset_authority_required=true
- release_upload_performed=false
- release_body_edit_performed=false
- dmg_rebuild_performed=false
- generated_release_artifacts_staged=false
- m100_3_signed_notarized_rc_runbook_reviewed=true
- d100_3_signed_notarized_execution_path_reviewed=true
- macos_signed_notarized_execution_path_available=true
- signed_notarized_rc_execution_ready=false
- signed_notarized_rc_artifact_available=false
- production_distribution_ready=false
- signed_notarized_security_boundary=false
- security_ready_claimed=false
- stable_or_production_release_allowed_without_signed_artifact=false
- unsigned_or_signed_public_beta_or_rc_release_class_allowed_without_stable_artifact=true
- signed_artifact_no_longer_blocks_lower_release_class=true
- signed_artifact_still_blocks_stable_or_production_claims=true
- next_required_phase=RB-8 production claim and stable release candidate gate
