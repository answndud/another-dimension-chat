# Manual Update Integrity

This document defines the unsigned public beta update boundary.

The macOS production distribution gate for the stable-release track is tracked
in [MACOS_PRODUCTION_DISTRIBUTION_GATE.md](MACOS_PRODUCTION_DISTRIBUTION_GATE.md).
It records signing/notarization, same-release asset authority, update-channel,
release upload, and DMG rebuild holds before any non-beta macOS distribution
claim can be made.

Another Dimension Chat does not provide auto-update, signed update channels,
notarized releases, transparency logs, reproducible builds, or audited release
promotion for this beta.

Future signed update manifest candidates are defined in
[MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md](MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md).
That schema can verify Ed25519-signed manifest candidates, but it does not make
auto-update, signed update manifest readiness, release upload, rollback
prevention, or production readiness true for the current release class.

## User Verification Model

Every public beta update is a manual GitHub Release download.

Users must download these files from the same GitHub Release:

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json`
- `INSTALL_UNSIGNED_MACOS.md`
- `RELEASE_NOTES.md`
- `GITHUB_RELEASE_BODY.md`
- `UPDATE_INTEGRITY.md`
- `SUPPLY_CHAIN_BASELINE.md`
- `DEPENDENCY_INVENTORY.md`
- `PUBLIC_THREAT_MODEL.md`
- `PRIVACY_MODEL_COMPARISON.md`
- `INDEPENDENT_REVIEW_PACKET.md`
- `PUBLIC_INTAKE_POLICY.md`
- `REPOSITORY_GOVERNANCE.md`
- `COMPONENT_BOUNDARIES.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `OPERATOR_FINAL_HANDOFF.md`
- `MANIFEST.md`

Then users must verify the DMG checksum before opening the app:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Expected result:

```text
another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg: OK
```

Do not verify a downloaded DMG against files copied from GitHub's branch source
browser. Branch files can move after a release. The release authority for this
beta is the DMG, `.sha256`, provenance JSON, manifest, and notes attached to the
same GitHub Release.

## Release Publisher Boundary

The release publisher must not replace a DMG without replacing the matching
`.sha256`, provenance JSON, manifest, release notes, and dependency lockfile
hash evidence in the same release.

The release publisher must not ask users to mix a DMG from one GitHub Release
with a checksum, provenance file, manifest, install guide, or notes copied from
another release, a branch view, or the source archive.

The generated public provenance JSON must describe the public upload artifact,
not only the local source artifact. It must include:

- public DMG file name
- public DMG SHA-256
- public DMG size in bytes
- app version
- build channel
- build commit
- platform
- unsigned GitHub public beta distribution marker
- `signed=false`
- `notarized=false`
- `auto_update=false`
- `startup_network_sockets=none`
- source provenance SHA-256
- dependency lockfile hash file name
- dependency inventory file name
- manual update integrity file name
- supply-chain baseline file name
- public non-claims

The public release body must repeat:

- unsigned experimental public beta
- not notarized
- not audited
- not production-ready
- sensitive communication prohibited

## Future Platform Artifacts

The current public artifact is the macOS unsigned DMG. Future public Windows,
Android, or iOS artifacts must not weaken the release/update boundary.

Every future public Windows, Android, or iOS artifact must be attached to a
GitHub Release with its own matching checksum and provenance file. The artifact,
checksum, provenance, manifest, release notes, update-integrity note, and
dependency evidence must be attached to the same GitHub Release. Branch files,
source archives, another release, or a platform store page are not release
authority for a downloaded artifact.

A platform store, notarization service, Developer ID signature, SmartScreen
reputation, Play Store approval, App Store/TestFlight approval, or mobile review
process may be a distribution aid, but it is not a trusted security boundary for
v0.1. If auto-update is introduced later, it requires a separate integrity
design before it can be described as supported.

## Emergency Notice Boundary

Emergency notices are manual release identity verification instructions only.
They tell users to stop before opening a suspect artifact and verify the
affected release tag, artifact filename, platform, release class, artifact
SHA-256, provenance SHA-256, and distribution manifest SHA-256 from the same
GitHub Release authority.

An emergency notice is not update availability, not a background update check,
not a push notice, not an auto-update prompt, and not a forced upgrade path.
It must not include local paths, private room state, payload samples, screenshots
of private data, crash dumps, raw logs, support bundles, passphrases, private
keys, or key material.

Current emergency notice flags:

- emergency_notice_manual_verification_only=true
- emergency_notice_update_availability_claim=false
- emergency_notice_auto_update_claim=false
- background_update_check=false
- push_update_notice=false
- forced_upgrade=false

## Non-Claims

This policy does not claim:

- update authenticity beyond the GitHub Release page the user chooses to trust
- branch-file or source-archive release proof
- automatic rollback prevention
- malware review
- dependency audit completion
- SBOM publication
- reproducible build equivalence
- secure messenger readiness
