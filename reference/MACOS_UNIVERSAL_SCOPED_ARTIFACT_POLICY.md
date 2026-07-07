# macOS Universal Or Scoped Artifact Policy

Status: M100-2 source-side artifact support policy is closed with an explicit
Apple Silicon-only scope for the current public artifact. This is not a
universal macOS release, not an Intel Mac support claim, not a signed or
notarized artifact, not a stable release, and not permission for sensitive
communication.

The current public artifact remains:

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- app version: `0.1.0`
- build channel: `beta-onion`
- build commit: `e8954df9`
- platform: `macos-aarch64`
- support scope: Apple Silicon (`aarch64`) macOS only

## Decision

M100-2 chooses the explicitly scoped artifact path. A universal DMG is not
claimed until a future release task produces and verifies both Apple Silicon
and Intel slices, records target triples, updates artifact naming, and attaches
matching checksum/provenance to the same GitHub Release.

For the current public beta, public wording must keep saying macOS Apple
Silicon or `aarch64`. It must not imply Intel Mac support, universal app
support, stable release support, or Gatekeeper no-exception installation.

## Source Build Policy

- Tauri product name is `Another Dimension Chat`.
- Tauri version is `0.1.0`.
- Tauri bundle generation remains enabled.
- The current public upload artifact is generated from the frozen ignored
  Apple Silicon DMG and renamed to the public `macos-aarch64` release file.
- The release script records `platform=macos-aarch64` and
  `macos_public_support_scope=apple-silicon-aarch64-only`.
- Checksums and provenance belong to the same GitHub Release as the artifact.
- Branch files and source archives are not release authority for a downloaded
  DMG.
- Generated `apps/desktop-tauri/public-release/` and
  `apps/desktop-tauri/beta-artifacts/` contents remain ignored and untracked.

## Future Universal Artifact Requirements

Before a universal macOS artifact can be claimed, all of these must be true:

- Apple Silicon target evidence exists for `aarch64-apple-darwin`.
- Intel target evidence exists for `x86_64-apple-darwin`.
- The universal app bundle or DMG is built with a documented Tauri/Rust command.
- `lipo` or equivalent binary inspection confirms universal slices where
  applicable.
- The artifact name no longer says `macos-aarch64` unless the release remains
  Apple Silicon-only.
- The checksum, provenance, manifest, release notes, install guide, and public
  copy all agree on the same supported architecture scope.
- Signing and notarization, when later available, are recorded as distribution
  ergonomics, not a messenger security boundary.

## Minimum macOS Version Policy

No public minimum macOS version is claimed for the current unsigned beta beyond
the Tauri/macOS runtime compatibility of the produced Apple Silicon artifact.
Before a stable or general public macOS app claim, the minimum supported macOS
version must be explicitly recorded in release notes, provenance, install
guide, and support copy, then verified on representative supported systems.

## Current Gate Flags

- m100_2_macos_universal_scoped_artifact_policy_reviewed=true
- macos_current_public_artifact_file=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg
- macos_current_public_artifact_platform=macos-aarch64
- macos_current_public_support_scope=apple-silicon-aarch64-only
- macos_support_scope_explicit=true
- macos_universal_artifact_available=false
- macos_universal_artifact_claim_allowed=false
- macos_intel_artifact_available=false
- macos_intel_support_claim_allowed=false
- macos_minimum_version_claimed=false
- macos_minimum_version_policy_recorded=true
- tauri_bundle_active=true
- tauri_bundle_targets_current=all
- artifact_naming_platform_consistent=true
- checksum_provenance_platform_consistent=true
- same_release_asset_authority_required=true
- branch_or_source_archive_update_authority=false
- generated_release_artifacts_staged=false
- signed_notarized_release_ready=false
- sensitive_communication_allowed=false
- next_required_phase=Phase C100-4 - Default Practical Transport Product Path
