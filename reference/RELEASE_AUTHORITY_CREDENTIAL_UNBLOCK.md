# Release Authority And Credential Unblock

Status: RB-0 source-side authority and credential gate closed with a scope-down
decision. This is not a stable release authorization, not a release upload, not
a DMG rebuild, not a signed or notarized artifact, not an audit result, not a
field-evidence result, and not permission for sensitive communication.

RB-0 separates what is executable now from what still needs owner credentials
or external participants.

## Observed Local Authority

- Repository branch: `main`
- GitHub repository: `answndud/another-dimension-chat`
- GitHub viewer permission observed locally: `ADMIN`
- GitHub release mutation capability observed locally: repository admin access
  is available, but release upload/edit still requires an explicit owner
  release task.
- Xcode observed locally: available.
- `xcrun notarytool` observed locally: available.
- Apple code-signing identities observed locally: `0 valid identities found`.
- Developer ID signing identity observed locally: unavailable.

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

- xcode_available=true
- notarytool_available=true
- codesigning_identity_available=false
- developer_id_signing_available=false
- notarization_credential_available=false
- signed_notarized_stable_release_path_available=false

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
- github_admin_observed=true
- xcode_available=true
- notarytool_available=true
- codesigning_identity_available=false
- developer_id_signing_available=false
- notarization_credential_available=false
- signed_notarized_stable_release_path_available=false
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
