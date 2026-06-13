# macOS Release Distribution Metadata

Status: source-ready for macOS release metadata generation and validation, but
held on actual signed/notarized distribution artifact evidence and owner upload
approval. This is not a release upload, not a DMG rebuild, not a stable release,
not an audit result, not production-ready, and not permission for sensitive
communication.

The current public macOS support scope remains Apple Silicon aarch64 only. A
universal or Intel artifact must not be claimed until the matching artifact,
checksum, provenance, and public copy all use the same architecture value.

## Tools

- Manifest validator:
  `scripts/validate_macos_release_distribution_manifest.mjs`
- Metadata generator:
  `scripts/prepare_macos_release_distribution_metadata.sh`
- Owner-approved upload script:
  `scripts/upload_macos_release_assets_approved.sh`
- Focused verifier:
  `scripts/macos_release_distribution_manifest_once.sh`

The generator writes only under ignored generated artifact directories and
copies the selected artifact beside the generated checksum, provenance, release
body, and manifest so validation uses one same-release asset authority
directory. For signed/notarized or stable candidates it requires
`AD_MACOS_SIGNED_RC_PROVENANCE_IN` from the signed build/notarization path and
binds that provenance to the artifact filename, artifact SHA-256, source
commit, target architecture, signed/notarized/stapled status, Gatekeeper
assessment, and contained-app verification fields instead of accepting
unaudited manual booleans. It keeps upload/edit/commit permissions false. The
upload script holds unless `AD_RELEASE_UPLOAD_AUTHORIZED=1` is present and the
manifest validates first.

## Manifest Fields

Each macOS release distribution manifest uses
`schema_version=macos-release-distribution-manifest-v1` and records:

- repository and source commit,
- version and release class,
- artifact filename, SHA-256, size, platform, architecture, signing status,
  notarization status, stapled status, checksum file, and provenance file,
- for signed/notarized or stable candidates, signed-build provenance proving
  the DMG-contained app verifier was available, the app mounted, contained-app
  codesign passed, contained-app Gatekeeper execute assessment passed, and the
  mounted app matched the signed source app,
- same-release asset authority requirement,
- public non-claims,
- release upload, release body edit, and generated artifact commit flags.

The manifest validator also checks sibling artifact bytes, the `.sha256` file,
the provenance JSON, signed RC provenance binding, and signed/notarized
contained-app evidence before accepting a candidate. For signed/notarized or
stable candidates, it also runs live `codesign`, `spctl`, and `stapler`
validation against the artifact; a text file with forged JSON is rejected.
Acceptance still does not mean release upload authorization or public artifact
readiness.

## Current Gate Flags

- macos_release_distribution_manifest_schema_available=true
- macos_release_distribution_manifest_validator_available=true
- macos_release_distribution_checksum_bytes_verified=true
- macos_release_distribution_provenance_consistency_verified=true
- macos_release_distribution_dmg_contained_app_evidence_required=true
- macos_release_distribution_signed_artifact_tools_verified=true
- macos_dmg_contained_app_verifier_available=false
- dmg_mounted_app_found=false
- dmg_contained_app_codesign_verify_passed=false
- dmg_contained_app_gatekeeper_assess_passed=false
- dmg_contained_app_matches_signed_source_app=false
- macos_release_distribution_metadata_generator_ready=true
- macos_release_upload_script_ready=true
- macos_current_public_support_scope=apple-silicon-aarch64-only
- macos_universal_artifact_available=false
- macos_intel_artifact_available=false
- signed_notarized_distribution_artifact_available=false
- macos_release_distribution_artifact_ready=false
- release_upload_authorized=false
- release_body_edit_authorized=false
- generated_release_artifacts_commit_allowed=false
