# Windows Real Runtime Result Schema

Status: D100-5 Windows real-runtime result schema is source-ready. This is not
a Windows runtime pass result, not a Windows installer, not a signed Windows
artifact, not a public Windows upload, not production-ready, and not permission
for sensitive communication.

Validate candidate results with
`scripts/validate_windows_public_artifact_results.mjs`. Passing validation only
marks a candidate for maintainer review. It does not open Windows public
artifact readiness.
Artifact bytes, same-release `.sha256`, and provenance consistency are tracked
separately in `reference/WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md`.
The D100-5 runbook is
`reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md`.

## Required Result Fields

- `schema_version=windows-public-artifact-result-v1`
- `result_id`
- `run_host=real-windows-machine`
- `platform=windows`
- `windows_version`
- `architecture=x64|arm64`
- `artifact_kind=installer|portable-archive|msix|nsis|tauri-bundle`
- `artifact_path_redacted=true`
- `artifact_manifest_file`
  - Relative to the result file directory. It must point to the same Windows
    artifact manifest that validates with
    `scripts/validate_windows_artifact_manifest.mjs`.
- `artifact_sha256`
- `artifact_provenance_sha256`
- `artifact_manifest_sha256`
- `source_commit`
  - Must be the current audited source commit when
    `AD_REQUIRE_CURRENT_HEAD=1` or `--require-current-head` is used.
- `webview2_rendered=pass|fail`
- `app_data_root_redacted=pass|fail`
- `path_separator_behavior=pass|fail`
- `encrypted_store_profile_unlock=pass|fail`
- `local_deletion_behavior=pass|fail`
- `redacted_diagnostics_only=pass|fail`
- `explicit_user_action_before_network=pass|fail`
- `local_manual_envelope_default_path=pass|fail`
- `auto_update_channel_absent=pass|fail`
- `public_non_claims_visible=pass|fail`
- `installer_signing_decision=unsigned-hold|signtool-signed|store-signed|not-applicable`
- `smartscreen_reputation_claim=false`
- `public_copy_reviewed=true|false`
- `checksum_provenance_verified=true|false`
- `support_diagnostics_reviewed=true|false`
- `non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready#no-public-windows-artifact#no-windows-installer#no-public-artifact-upload`

## Forbidden Result Content

Do not include raw local paths, profile names, contact identifiers, message text,
invite codes, pairing payloads, envelope payloads, endpoint payloads, onion
endpoints, bridge lines, passphrases, private keys, key material, raw logs,
crash dumps, screenshots of private room data, files from `docs/`, local app
data, or generated artifact bytes.
The validator rejects Windows user paths, `%LOCALAPPDATA%`/`AppData\\Local`,
private `docs/` paths, generated artifact paths, and markdown screenshot links
that describe private room/message/profile/invite content.

## Current Schema Flags

- windows_real_runtime_result_schema_available=true
- windows_real_runtime_result_validator_available=true
- windows_artifact_manifest_checksum_schema_available=true
- windows_artifact_manifest_checksum_validator_available=true
- windows_artifact_manifest_checksum_verifier_ready=true
- windows_result_requires_real_windows_machine=true
- windows_result_requires_current_source_commit=true
- windows_result_current_head_strict_mode_ready=true
- windows_result_requires_checksum_provenance=true
- windows_result_requires_valid_artifact_manifest=true
- windows_result_artifact_manifest_sha_verified=true
- windows_result_artifact_provenance_sha_verified=true
- windows_result_artifact_bytes_sha_verified=true
- windows_result_requires_support_diagnostics_review=true
- windows_result_requires_public_non_claims=true
- windows_result_rejects_local_only_or_private_data=true
- windows_result_rejects_private_docs_local_app_data_and_screenshots=true
- windows_public_artifact_candidate_requires_manual_review=true
- windows_real_runtime_smoke_passed=false
- windows_public_artifact_ready=false
- windows_installer_ready=false
- windows_signing_ready=false
- windows_public_artifact_upload_allowed=false
- windows_release_packaging_allowed=false
- windows_generated_artifact_commit_allowed=false
