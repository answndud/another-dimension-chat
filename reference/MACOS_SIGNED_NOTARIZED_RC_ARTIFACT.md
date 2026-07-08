# macOS Signed And Notarized RC Artifact

Status: M100-3 is closed by explicit owner policy waiver for active-queue
progress. The source-side signed/notarized RC runbook and verifier remain
available, but no signed/notarized RC artifact exists and no Developer
ID/notary credentials are installed. This is not a signed artifact, not a
notarized artifact, not a stable release, not a release upload authorization,
not production-ready, not audited, and not permission for sensitive
communication.

The focused verifier is
`scripts/macos_signed_notarized_rc_artifact_once.sh`. If
`AD_SIGNED_RC_DMG` points to a DMG and
`AD_SIGNED_RC_EXPECTED_APP_BUNDLE` points to the signed source app bundle, it
performs focused artifact checks:

- file exists and is not inside the repository's tracked source tree,
- `codesign --verify --deep --strict --verbose=2`,
- `spctl --assess --type open --verbose=4`,
- `xcrun stapler validate`,
- read-only DMG mount, contained `.app` discovery, contained app
  `codesign --verify --deep --strict --verbose=2`,
- contained app `spctl --assess --type execute --verbose=4`,
- byte-level comparison between the mounted app and expected signed source app,
- SHA-256 calculation,
- generated artifact paths are not staged or tracked.

Without `AD_SIGNED_RC_DMG`, the verifier records the owner waiver and exits
successfully as an active-queue unblock only. It must not create, upload,
rebuild, or commit any release artifact.

D100-3 execution path is recorded in
`reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md`; it connects credential
probe, signing commands, notary submit/wait, stapling, Gatekeeper assessment,
checksum, and optional generated provenance while holding without credentials.

## RC Artifact Runbook

1. Complete M100-1 with a Developer ID Application identity and validated
   notary credential, or keep the M100-1 active-queue waiver while preserving
   signed/notarized/stable false claims.
2. Build the RC artifact into an ignored generated directory, not into tracked
   source.
3. Sign the `.app` bundle and DMG/container according to the selected release
   packaging flow.
4. Submit for notarization and wait for success.
5. Staple notarization where applicable.
6. Run `AD_SIGNED_RC_DMG=/path/to/rc.dmg AD_SIGNED_RC_EXPECTED_APP_BUNDLE=/path/to/Another\ Dimension\ Chat.app scripts/macos_signed_notarized_rc_artifact_once.sh`.
7. Record the SHA-256 and provenance in generated release evidence.
8. Keep README, SECURITY, release notes, app UI, and support copy in non-claim
   beta/RC wording until stable gates, external review, and field evidence pass.

## Current Gate Flags

- m100_3_signed_notarized_rc_runbook_reviewed=true
- m100_3_artifact_blocker_closed=true
- signed_notarized_rc_policy_waiver_authorized=true
- signed_notarized_rc_waiver_scope=active-queue-unblock-only
- signed_notarized_artifact_required_for_distribution_claims=true
- d100_3_signed_notarized_execution_path_reviewed=true
- macos_signed_notarized_execution_path_available=true
- signed_notarized_rc_artifact_verifier_available=true
- macos_dmg_contained_app_verifier_available=true
- signed_notarized_rc_artifact_available=false
- ad_signed_rc_dmg_input_required_for_artifact_verification=true
- ad_signed_rc_expected_app_bundle_required_for_artifact_verification=true
- codesign_tool_available=true
- spctl_tool_available=true
- stapler_tool_available=true
- codesign_verify_passed=false
- spctl_assess_passed=false
- stapler_validate_passed=false
- dmg_mounted_app_found=false
- dmg_contained_app_codesign_verify_passed=false
- dmg_contained_app_gatekeeper_assess_passed=false
- dmg_contained_app_matches_signed_source_app=false
- rc_artifact_sha256_recorded=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- generated_release_artifacts_staged=false
- stable_release_allowed=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- next_required_phase=Phase O100-1 - Operations, Incident, And Vulnerability Readiness
