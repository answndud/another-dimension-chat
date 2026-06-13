# macOS Production Distribution Gate

Status: OPS-6 source-side distribution gate closed as a hold record. This does
not create a stable macOS release, signed artifact, notarized artifact,
auto-update channel, release upload, DMG rebuild, or production-ready claim.

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

## Evidence Anchors

- Manual update integrity boundary: `reference/UPDATE_INTEGRITY.md`
- Unsigned public beta final source report:
  `reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md`
- Fresh install rehearsal result:
  `reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md`
- Release page update gate: `scripts/macos_release_page_update_gate_once.sh`
- Public beta source preflight:
  `scripts/macos_public_beta_final_source_preflight_once.sh`
- Release staging script:
  `scripts/prepare_unsigned_public_beta_release.sh`

## Current Gate Flags

- macos_production_distribution_gate_reviewed=true
- current_public_artifact_unsigned_beta=true
- developer_id_signing_available=false
- notarization_available=false
- stable_signed_notarized_artifact_available=false
- gatekeeper_manual_bypass_required_for_current_beta=true
- auto_update_channel_available=false
- update_signature_ready=false
- rollback_policy_ready=false
- checksum_provenance_manifest_boundary_ready=true
- same_release_asset_authority_required=true
- release_upload_performed=false
- release_body_edit_performed=false
- dmg_rebuild_performed=false
- generated_release_artifacts_staged=false
- production_distribution_ready=false
- signed_notarized_security_boundary=false
- security_ready_claimed=false
- next_required_phase=OPS-7 external review and audit readiness
