# macOS Signed Update Manifest Schema

Status: M100-7 signed update manifest schema and verifier are source-ready.
This is not an auto-update channel, not a signed stable release, not release
upload authorization, not rollback prevention, not production-ready, not
audited, and not permission for sensitive communication.

The validator is `scripts/validate_macos_signed_update_manifest.mjs`.
The focused verifier is `scripts/macos_signed_update_manifest_once.sh`.

This schema defines the minimum signed update manifest format required before
a later release task can claim signed update manifest readiness. Manifest
candidate files should live under ignored generated or private evidence
directories until an explicit release task authorizes publication.

Current public wording must remain:

- `unsigned experimental public beta`
- `sensitive communication prohibited`
- `not audited`
- `not production-ready`

## Manifest Envelope

The manifest file is JSON with these top-level fields:

- `schema_version`: `macos-signed-update-manifest-envelope-v1`
- `manifest_id`: `MACOS-UPDATE-0001`
- `signed_payload_base64`: Base64 payload bytes.
- `signed_payload_sha256`: SHA-256 of the decoded payload bytes.
- `signature_algorithm`: `ed25519`
- `signature_base64`: Base64 Ed25519 signature over the decoded payload bytes.
- `public_key_spki_der_base64`: Base64 SPKI DER Ed25519 public key.
- `public_key_spki_sha256`: SHA-256 of the public key DER.

The signed payload is UTF-8 JSON with these fields:

- `schema_version`: `macos-signed-update-manifest-payload-v1`
- `manifest_id`: same as envelope
- `repository`: `answndud/another-dimension-chat`
- `release_channel`: `signed-public-beta-or-rc|stable`
- `release_tag`: GitHub Release tag
- `app_version`: semantic version
- `minimum_allowed_version`: semantic version no newer than `app_version`
- `platform`: `macos-aarch64|macos-universal`
- `artifact_name`: `.dmg` file name
- `artifact_sha256`: artifact SHA-256
- `artifact_size_bytes`: positive integer
- `provenance_sha256`: provenance SHA-256
- `distribution_manifest_sha256`: SHA-256 of the same-release macOS release
  distribution manifest.
- `release_distribution_manifest_verified`: `true`
- `same_release_asset_authority_required`: `true`
- `release_notes_sha256`: release notes SHA-256
- `macos_release_distribution_dmg_contained_app_evidence_verified`: `true`
- `macos_dmg_contained_app_verifier_available`: `true`
- `dmg_mounted_app_found`: `true`
- `dmg_contained_app_codesign_verify_passed`: `true`
- `dmg_contained_app_gatekeeper_assess_passed`: `true`
- `dmg_contained_app_matches_signed_source_app`: `true`
- `created_at_utc`: `YYYY-MM-DDTHH:MM:SSZ`
- `source_commit`: 7-to-40-char Git commit
- `update_mode`: `manual-github-release-download`
- `rollback_policy`: `warn-and-recover-only|monotonic-manifest-enforced`
- `release_upload_authorized`: `false`
- `dmg_rebuild_authorized`: `false`
- `hold_flags`: exact false set for
  `signed_update_manifest_ready`, `update_signature_ready`,
  `auto_update_channel_ready`, `rollback_prevention_claimed`,
  `release_upload_authorized`, `dmg_rebuild_authorized`,
  `stable_release_allowed`, `production_distribution_ready`,
  `security_ready_claimed`, `production_ready_claim_allowed`,
  `audited_claim_allowed`, and `sensitive_communication_allowed`
- `public_non_claims`: exact set
  `unsigned-experimental-public-beta`,
  `sensitive-communication-prohibited`,
  `not-audited`,
  `not-production-ready`

## Acceptance Semantics

A valid manifest proves only that a candidate update manifest envelope is
well-formed, has a valid Ed25519 signature, has matching payload and public-key
hashes, is checked against a same-release distribution manifest, carries a
distribution manifest SHA that matches the actual manifest file, matches the
distribution manifest's artifact filename, artifact SHA-256, artifact size,
provenance SHA-256, source commit, version, signing/notarization state, and
DMG-contained `.app` verification result, preserves same-release manual update
semantics, and does not carry secret material. It does not open product
signed-update readiness or product update-signature readiness, because a later
explicit release task must bind the signed manifest to a real
signed/notarized artifact, release page, owner approval, external review, and
stable gate.

The validator supports `--require-current-head` or
`AD_REQUIRE_CURRENT_HEAD=1` to reject candidate manifests whose `source_commit`
does not match the current checkout.
The validator also requires `--distribution-manifest <path>` or
`AD_MACOS_RELEASE_DISTRIBUTION_MANIFEST=<path>` whenever a signed update
candidate is present. It runs the macOS release distribution manifest validator
before comparing the signed update payload against that distribution evidence.
`--previous-manifest <path>` or `AD_PREVIOUS_SIGNED_UPDATE_MANIFEST=<path>`
enables focused monotonic checks for `app_version`, `release_tag`, and
`minimum_allowed_version`.

## Current Gate Flags

- macos_signed_update_manifest_schema_available=true
- macos_signed_update_manifest_validator_available=true
- signed_update_manifest_candidate_verifier_ready=true
- signed_update_manifest_requires_distribution_manifest_sha256=true
- signed_update_manifest_requires_dmg_contained_app_evidence=true
- signed_update_manifest_requires_distribution_manifest_validation=true
- signed_update_manifest_requires_signed_false_hold_flags=true
- signed_update_manifest_previous_monotonicity_verifier_ready=true
- signed_update_manifest_ready=false
- update_signature_ready=false
- auto_update_channel_ready=false
- rollback_prevention_claimed=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- production_distribution_ready=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- next_required_phase=O100-1 Operations, Incident, And Vulnerability Readiness
