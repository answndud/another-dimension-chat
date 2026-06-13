# Release Authority And Credential Unblock

Status: M100-1 credential checklist and local verifier are available, with the
current local result blocked on missing Apple Developer Program team evidence,
Developer ID Application identity, and notarization credential. This is not a
stable release authorization, not a release upload, not a DMG rebuild, not a
signed or notarized artifact, not an audit result, not a field-evidence result,
and not permission for sensitive communication.

M100-1 separates what is executable now from what still needs owner credentials
or external participants. The focused verifier is
`scripts/release_authority_credential_unblock_once.sh`; it reads the local
macOS keychain, `xcode-select`, and `xcrun notarytool` state. Missing
credentials are a release blocker and make the verifier exit non-zero.
Public-safe credential evidence intake is defined in
`reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md`, collected by
`scripts/collect_macos_release_credential_evidence.sh`, and checked by
`scripts/macos_release_credential_evidence_once.sh`; that intake can validate
redacted release-machine evidence but cannot replace the live keychain and
notary verifier.

## Observed Local Authority

- Repository branch: `main`
- GitHub repository: `answndud/another-dimension-chat`
- GitHub viewer permission observed locally: `ADMIN`.
- GitHub release mutation capability observed locally: repository admin access
  is available, but release upload/edit still requires an explicit owner
  release task.
- Xcode observed locally: `/Applications/Xcode.app/Contents/Developer`.
- `xcrun notarytool` observed locally:
  `/Applications/Xcode.app/Contents/Developer/usr/bin/notarytool`.
- `xcrun notarytool --version` observed locally: `1.1.2 (41)`.
- Apple code-signing identities observed locally: `0 valid identities found`.
- Developer ID signing identity observed locally: unavailable.
- Notary credential profile observed locally: none configured in
  `AD_RELEASE_NOTARYTOOL_PROFILE` or `NOTARYTOOL_PROFILE`.
- Notary credential environment observed locally: no public-safe env marker for
  App Store Connect API key or app-specific password credentials.

## Credential Readiness Checklist

All items below must be true on the release machine before a signed/notarized
macOS public app release can proceed:

- Apple Developer Program team is identified and recorded by Team ID.
- Developer ID Application signing identity is installed in the local keychain
  and appears in `security find-identity -v -p codesigning`.
- Developer ID certificate expiry is inspected before every RC/stable signing
  run.
- Certificate rotation owner and renewal deadline are recorded before the
  certificate has fewer than 30 days remaining.
- `xcode-select -p` resolves to an installed Xcode developer directory.
- `xcrun --find notarytool` resolves to the active Xcode notarytool.
- Notarization credential is configured through one of:
  `AD_RELEASE_NOTARYTOOL_PROFILE`, `NOTARYTOOL_PROFILE`, App Store Connect API
  key env (`AD_RELEASE_NOTARY_KEY`, `AD_RELEASE_NOTARY_KEY_ID`,
  `AD_RELEASE_NOTARY_ISSUER`), or Apple ID/app-specific password env
  (`AD_RELEASE_NOTARY_APPLE_ID`, `AD_RELEASE_NOTARY_PASSWORD`,
  `AD_RELEASE_APPLE_TEAM_ID`).
- Notary credentials validate with a public-safe `notarytool history` check
  before a release task signs or submits an artifact.
- Release upload, release edit, asset deletion, DMG rebuild, signing, and
  notarization are performed only in a later explicit release task.

## Release Mutation Decision

- release_mutation_authorization_record_available=true
- github_admin_observed=true
- release_upload_authorized=false
- release_body_edit_authorized=false
- release_asset_delete_authorized=false
- dmg_rebuild_authorized=false
- generated_release_artifacts_commit_allowed=false

No release upload, release body edit, release asset deletion, DMG rebuild, or
generated artifact commit is authorized by RB-0. Those actions remain explicit
release tasks.

Public wording must still say `not production-ready` and
`sensitive communication prohibited`.

## Signing And Notarization Decision

- m100_1_release_credential_verifier_dynamic=true
- apple_developer_program_team_confirmed=false
- apple_developer_team_id_recorded=false
- xcode_available=true
- xcode_path=/Applications/Xcode.app/Contents/Developer
- notarytool_available=true
- notarytool_path=/Applications/Xcode.app/Contents/Developer/usr/bin/notarytool
- notarytool_version_recorded=true
- codesigning_identity_available=false
- valid_codesigning_identity_count=0
- developer_id_signing_available=false
- developer_id_application_identity_available=false
- developer_id_certificate_expiry_inspected=false
- certificate_rotation_expiry_policy_available=true
- certificate_rotation_owner_recorded=false
- notarization_credential_available=false
- notarytool_keychain_profile_configured=false
- notarytool_credential_validated=false
- signed_notarized_stable_release_path_available=false
- signed_notarized_release_ready=false

The selected legal workaround is scope-down: until a Developer ID certificate
and notarization credentials exist, the stable macOS release remains held.
Future artifact work may produce an unsigned RC or signed public beta only if
the release class, release notes, README, SECURITY, and app UI keep matching
non-claims.

Accepted credential paths:

- owner Apple Developer ID certificate,
- organization Apple Developer ID certificate,
- trusted release signer with owner approval,
- CI signing service with owner-controlled credentials.

## Certificate Rotation And Expiry Policy

- Certificate expiry must be inspected before each signed RC or stable release.
- If the Developer ID certificate has fewer than 30 days remaining, release
  signing is held until the certificate is renewed or a replacement signing
  identity is installed.
- The release task must record the certificate common name, Team ID, SHA-1
  fingerprint, and expiry date in public-safe release provenance.
- Rotation must not change the messenger security claim boundary. Developer ID
  and notarization are distribution ergonomics, not a trusted security boundary.
- If a certificate is revoked, expired, missing, or mismatched with the
  configured Team ID, the signed/notarized release path is blocked.

## External Review And Audit Decision

- external_review_execution_path_selected=true
- external_review_completed=false
- audit_engagement_confirmed=false
- audit_completed=false
- audited_claim_allowed=false

The selected workaround is a named independent review first if a paid audit is
not immediately available. Independent review can close
`external_review_completed` only after a real named reviewer produces a
public-safe result. It cannot create an `audited` claim.

## Field Evidence Decision

- field_evidence_execution_path_selected=true
- trusted_external_tester_path_allowed=true
- rented_or_remote_mac_path_allowed=true
- physical_second_mac_path_allowed=true
- synthetic_peer_report_allowed=false
- same_machine_external_evidence_allowed=false
- real_two_machine_field_evidence_completed=false
- external_delivery_success_claim_allowed=false

The selected path is real two-machine evidence from either trusted external
testers, rented/remote Macs, or two independent operator machines. Same-machine,
VM-only, generated, or synthetic reports are not accepted as external evidence.

## Platform Authority Decision

- windows_public_artifact_authorized=false
- android_runtime_implementation_authorized=false
- ios_runtime_implementation_authorized=false

Windows artifact work, Android runtime work, and iOS runtime work remain
separate explicit phases. They do not inherit macOS release authority.

## Current Gate Flags

- release_authority_credential_unblock_reviewed=true
- release_mutation_authorization_record_available=true
- macos_release_credential_evidence_schema_available=true
- macos_release_credential_evidence_validator_available=true
- macos_release_credential_evidence_collector_available=true
- macos_release_credential_evidence_collector_source_ready=true
- macos_release_credential_evidence_intake_ready=true
- github_admin_observed=true
- m100_1_release_credential_verifier_dynamic=true
- apple_developer_program_team_confirmed=false
- apple_developer_team_id_recorded=false
- xcode_available=true
- xcode_path=/Applications/Xcode.app/Contents/Developer
- notarytool_available=true
- notarytool_path=/Applications/Xcode.app/Contents/Developer/usr/bin/notarytool
- notarytool_version_recorded=true
- codesigning_identity_available=false
- valid_codesigning_identity_count=0
- developer_id_signing_available=false
- developer_id_application_identity_available=false
- developer_id_certificate_expiry_inspected=false
- certificate_rotation_expiry_policy_available=true
- certificate_rotation_owner_recorded=false
- notarization_credential_available=false
- notarytool_keychain_profile_configured=false
- notarytool_credential_validated=false
- signed_notarized_stable_release_path_available=false
- signed_notarized_release_ready=false
- release_upload_authorized=false
- release_body_edit_authorized=false
- release_asset_delete_authorized=false
- dmg_rebuild_authorized=false
- generated_release_artifacts_commit_allowed=false
- external_review_execution_path_selected=true
- audit_engagement_confirmed=false
- field_evidence_execution_path_selected=true
- synthetic_peer_report_allowed=false
- real_two_machine_field_evidence_completed=false
- windows_public_artifact_authorized=false
- android_runtime_implementation_authorized=false
- ios_runtime_implementation_authorized=false
- stable_release_scope_down_until_credentials=true
- next_required_phase=RB-1 production protocol and E2EE readiness closure
