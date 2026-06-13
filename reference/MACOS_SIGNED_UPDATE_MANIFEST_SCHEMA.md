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
- `release_notes_sha256`: release notes SHA-256
- `created_at_utc`: `YYYY-MM-DDTHH:MM:SSZ`
- `source_commit`: 7-to-40-char Git commit
- `update_mode`: `manual-github-release-download`
- `rollback_policy`: `warn-and-recover-only|monotonic-manifest-enforced`
- `release_upload_authorized`: `false`
- `dmg_rebuild_authorized`: `false`
- `public_non_claims`: exact set
  `unsigned-experimental-public-beta`,
  `sensitive-communication-prohibited`,
  `not-audited`,
  `not-production-ready`

## Acceptance Semantics

A valid manifest proves only that a candidate update manifest envelope is
well-formed, has a valid Ed25519 signature, has matching payload and public-key
hashes, preserves same-release manual update semantics, and does not carry
secret material. It does not open product signed-update readiness or product
update-signature readiness, because a later explicit release task must bind the
signed manifest to a real signed/notarized artifact,
release page, owner approval, external review, and stable gate.

## Current Gate Flags

- macos_signed_update_manifest_schema_available=true
- macos_signed_update_manifest_validator_available=true
- signed_update_manifest_candidate_verifier_ready=true
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
- next_required_phase=C100-1 Production E2EE State Machine Closure
