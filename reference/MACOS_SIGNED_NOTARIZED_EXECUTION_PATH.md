# macOS Signed And Notarized Execution Path

Status: D100-3 signed/notarized execution path is source-ready and currently
held on missing Developer ID and notarization credentials. This is not a signed
artifact, not a notarized artifact, not a stable release, not release upload
authorization, not production-ready, not audited, and not permission for
sensitive communication.

The focused verifier is
`scripts/macos_signed_notarized_execution_path_once.sh`. By default it performs
a source/credential/path preflight only and exits with a hold when credentials
or artifact inputs are absent. Actual signing and notarization require the
explicit `AD_EXECUTE_MACOS_SIGN_NOTARY=1` environment variable plus operator
provided artifact paths and credentials.

## Execution Inputs

Actual execution requires all of these:

- `AD_EXECUTE_MACOS_SIGN_NOTARY=1`
- `AD_RELEASE_SIGNING_IDENTITY`
- `AD_RC_APP_BUNDLE`
- `AD_RC_DMG`
- one notarization credential path:
  `AD_RELEASE_NOTARYTOOL_PROFILE`/`NOTARYTOOL_PROFILE`, or App Store Connect API
  key env, or Apple ID/app-specific password env
- optional generated evidence path `AD_SIGNED_RC_PROVENANCE_OUT`, which must be
  under ignored generated artifact directories

## One-Shot Command Path

The script connects these operations in order:

1. Probe `codesign`, `spctl`, `xcrun notarytool`, `xcrun stapler`, Developer ID
   identities, and notarization credential markers.
2. Verify provided `.app` and `.dmg` paths exist and are not tracked source
   outputs.
3. Sign the `.app` bundle:
   `codesign --force --deep --options runtime --timestamp --sign "$AD_RELEASE_SIGNING_IDENTITY" "$AD_RC_APP_BUNDLE"`.
4. Sign the DMG/container:
   `codesign --force --timestamp --sign "$AD_RELEASE_SIGNING_IDENTITY" "$AD_RC_DMG"`.
5. Submit and wait for notarization with `xcrun notarytool submit "$AD_RC_DMG" --wait`.
6. Staple and validate: `xcrun stapler staple "$AD_RC_DMG"` and
   `xcrun stapler validate "$AD_RC_DMG"`.
7. Assess Gatekeeper open path with `spctl --assess --type open --verbose=4 "$AD_RC_DMG"`.
8. Record SHA-256 and optional generated provenance JSON.
9. Keep release upload, release edit, generated artifact commit, stable,
   production-ready, audited, and sensitive-use claims false until later gates
   authorize them.

## Current Gate Flags

- d100_3_signed_notarized_execution_path_reviewed=true
- macos_signed_notarized_execution_path_available=true
- credential_probe_path_ready=true
- signing_command_path_ready=true
- notary_submit_wait_path_ready=true
- stapler_staple_validate_path_ready=true
- gatekeeper_assessment_path_ready=true
- checksum_provenance_update_path_ready=true
- explicit_execution_env_required=true
- ad_execute_macos_sign_notary_required=true
- developer_id_signing_available=false
- notarization_credential_available=false
- signed_notarized_rc_execution_ready=false
- actual_signing_executed=false
- notary_submit_executed=false
- stapler_staple_executed=false
- gatekeeper_assess_executed=false
- rc_artifact_sha256_recorded=false
- generated_provenance_written=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- generated_release_artifacts_staged=false
- stable_release_allowed=false
- production_distribution_ready=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- next_required_phase=D100-4 external evidence intake execution
