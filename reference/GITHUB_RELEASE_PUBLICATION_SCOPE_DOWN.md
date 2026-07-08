# GitHub Release Publication Scope-Down

Status: RB-9 publication scope-down closure. This is not a stable release
publication, not a release upload authorization, not a GitHub Release edit, not
a DMG rebuild, not a signed/notarized artifact, and not production readiness.

The stable publication blocker is closed by selecting the existing lower-class
public prerelease as the current public artifact path.

## Observed Existing Lower-Class Release

- release_tag=v0.1.0-beta-onion-unsigned
- release_class=unsigned-experimental-public-beta
- release_url=https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned
- existing_lower_release_public_prerelease_observed=true
- existing_lower_release_draft=false
- existing_lower_release_asset_set_observed=true
- existing_lower_release_dmg_asset_observed=true
- existing_lower_release_sha256_asset_observed=true
- existing_lower_release_provenance_asset_observed=true

The selected release class keeps `unsigned experimental public beta`,
`not audited`, `not production-ready`, and `sensitive communication prohibited`.

## Publication Decision

No new stable release is published. No release upload, release body edit, asset
delete, DMG rebuild, generated artifact commit, or stable tag creation is
authorized. The existing public prerelease is the approved lower-class artifact
until a later explicit release task changes it.

## Current Scope-Down Flags

- rb_9_github_release_publication_scope_down_reviewed=true
- r100_2_stable_macos_release_decision_closed=true
- stable_release_publication_performed=false
- lower_release_publication_selected=true
- stable_release_published=false
- stable_release_tag_created=false
- stable_release_upload_authorized=false
- release_upload_performed=false
- release_body_edit_performed=false
- release_asset_delete_performed=false
- dmg_rebuild_performed=false
- generated_release_artifacts_commit_allowed=false
- public_stable_release_allowed=false
- lower_release_publication_claim_boundary_ready=true
- next_required_phase=RB-10 windows desktop public artifact closure
