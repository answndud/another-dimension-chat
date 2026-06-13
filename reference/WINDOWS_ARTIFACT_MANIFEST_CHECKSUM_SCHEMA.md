# Windows Artifact Manifest Checksum Schema

Status: D100-5 Windows artifact manifest/checksum gate is source-ready and
held on missing generated Windows artifact evidence, signing decision evidence,
real Windows runtime result evidence, and owner release/upload authorization.
This is not a Windows installer, not a public Windows artifact, not a code
signing result, not a SmartScreen reputation claim, not production-ready, and
not permission for sensitive communication.

This schema matches the macOS release distribution metadata pattern while
keeping Windows readiness false until a real artifact, same-release checksum,
provenance file, and public copy review exist under ignored generated artifact
directories.

## Tools

- Manifest/checksum validator:
  `scripts/validate_windows_artifact_manifest.mjs`
- Held metadata generator:
  `scripts/prepare_windows_public_artifact_metadata.sh`
- Focused verifier:
  `scripts/windows_artifact_manifest_checksum_once.sh`
- Runtime result schema:
  `reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md`

The generator holds unless `AD_PREPARE_WINDOWS_PUBLIC_ARTIFACT_METADATA=1` is
set and `AD_WINDOWS_ARTIFACT` points to an existing artifact under an ignored
generated artifact directory. The validator checks the artifact bytes against
the manifest SHA-256, the `.sha256` sidecar, and the provenance JSON without
opening any upload, release edit, or generated artifact commit gate.

## Manifest Fields

Each Windows artifact manifest uses
`schema_version=windows-public-artifact-manifest-v1` and records:

- repository and source commit,
- version and release class,
- artifact filename, SHA-256, size, platform, architecture, bundle target,
  signing status, checksum file, provenance file, WebView2 requirement,
  SmartScreen boundary, and signing trust boundary,
- same-release asset authority requirement,
- public non-claims,
- release upload, release body edit, public artifact readiness, installer
  readiness, and generated artifact commit flags.

## Current Gate Flags

- windows_artifact_manifest_checksum_schema_available=true
- windows_artifact_manifest_checksum_validator_available=true
- windows_artifact_metadata_generator_ready=true
- windows_artifact_manifest_checksum_verifier_ready=true
- windows_artifact_requires_same_release_authority=true
- windows_artifact_checksum_bytes_verified_by_validator=true
- windows_artifact_provenance_consistency_verified_by_validator=true
- windows_artifact_release_upload_authorized=false
- windows_artifact_release_body_edit_authorized=false
- windows_public_artifact_ready=false
- windows_installer_ready=false
- windows_signing_ready=false
- windows_public_artifact_upload_allowed=false
- windows_generated_artifact_commit_allowed=false
- windows_production_claim_allowed=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
