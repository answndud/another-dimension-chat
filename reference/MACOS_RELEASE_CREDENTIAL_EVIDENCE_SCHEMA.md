# macOS Release Credential Evidence Schema

Status: M100-1 release credential evidence intake and collector are
source-ready. This is not a Developer ID credential, not a notarization
credential, not a signed artifact, not a release upload authorization, not
production-ready, not audited, and not permission for sensitive communication.

This schema defines the public-safe evidence file a release machine or CI
signing service can return after Apple Developer and notarization credentials
exist. Evidence files should live under the ignored private directory
`docs/macos-release-credential-evidence/` and must not be committed.

The validator is `scripts/validate_macos_release_credential_evidence.mjs`.
The focused verifier is `scripts/macos_release_credential_evidence_once.sh`.
The release-machine collector is
`scripts/collect_macos_release_credential_evidence.sh`; it writes only
redacted/public-safe fields and refuses to produce evidence until Developer ID
and notary credentials validate locally.
For release-gate use, the validator must run with `AD_REQUIRE_CURRENT_HEAD=1`
or `--require-current-head` so stale evidence from a different commit cannot
advance M100-1. It must also run with `AD_REQUIRE_PRIVATE_DOCS_PATH=1` or
`--require-private-docs-path` so release-gate evidence is accepted only from
the ignored private `docs/macos-release-credential-evidence/` evidence path.

Current public wording must remain:

- `unsigned experimental public beta`
- `sensitive communication prohibited`
- `not audited`
- `not production-ready`

## Required Key-Value Fields

Each evidence file is UTF-8 text with one `key=value` pair per line. Required
fields:

- `schema_version=macos-release-credential-evidence-v1`
- `evidence_id=MACOS-CRED-0001`
- `evidence_subject=developer-id-and-notary-readiness`
- `collection_scope=release-machine`
- `repository=answndud/another-dimension-chat`
- `branch=main`
- `source_commit=<7-to-40-char git sha>`
- `apple_team_id=<10 uppercase alphanumeric characters>`
- `developer_id_common_name=Developer ID Application: <redacted name> (<team id>)`
- `developer_id_team_id=<same team id>`
- `developer_id_sha1=<40 hex characters>`
- `developer_id_not_after=YYYY-MM-DD`
- `developer_id_days_remaining=<integer >= 30>`
- `codesigning_identity_observed=true`
- `certificate_expiry_inspected=true`
- `xcode_path_redacted=true`
- `notarytool_version=<version only, no path>`
- `notary_credential_mode=keychain-profile|app-store-connect-api-key|apple-id-app-specific-password`
- `notary_credential_label_redacted=true`
- `notary_history_check=pass`
- `notary_history_checked_at_utc=YYYY-MM-DDTHH:MM:SSZ`
- `release_mutation_authorized=false`
- `dmg_rebuild_authorized=false`
- `secret_material_included=false`
- `public_non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready`

## Forbidden Evidence Content

Evidence files must not contain:

- private keys, `.p8` file contents, PEM blocks, or App Store Connect key
  material,
- Apple ID email addresses, app-specific passwords, keychain passwords, or
  environment variable values,
- local paths such as `/Users/...` or `C:\Users\...`,
- invite codes, envelope payloads, onion endpoints, bridge lines, passphrases,
  raw logs, crash dumps, or private planning notes.

## Acceptance Semantics

A valid evidence file produces a credential evidence candidate only. The
collector can create that candidate on a credentialed release machine, but it
does not itself authorize signing, notarization, release upload, release body
edit, asset deletion, or DMG rebuild. The live M100-1 gate still requires
`scripts/release_authority_credential_unblock_once.sh` to pass on the release
machine with the actual keychain identity and validated notarization
credential. Release-gate validation must also bind `source_commit` to the
current repository `HEAD`.

## Current Gate Flags

- macos_release_credential_evidence_schema_available=true
- macos_release_credential_evidence_validator_available=true
- macos_release_credential_evidence_collector_available=true
- macos_release_credential_evidence_collector_source_ready=true
- macos_release_credential_evidence_intake_ready=true
- macos_release_credential_evidence_current_head_bound=true
- macos_release_credential_evidence_private_docs_path_bound=true
- macos_release_credential_evidence_private_docs_required=true
- macos_release_credential_evidence_secret_redaction_required=true
- m100_1_release_credential_evidence_candidate=false
- m100_1_release_credentials_ready=false
- developer_id_signing_available=false
- apple_developer_team_id_recorded=false
- notarization_credential_available=false
- notarytool_credential_validated=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- next_required_phase=Phase C100-2 - Pairwise Identity And Safety Verification Closure
