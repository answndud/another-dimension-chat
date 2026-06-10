# Manual Update Integrity

This document defines the unsigned public beta update boundary.

Another Dimension Chat does not provide auto-update, signed update channels,
notarized releases, transparency logs, reproducible builds, or audited release
promotion for this beta.

## User Verification Model

Every public beta update is a manual GitHub Release download.

Users must download these files from the same GitHub Release:

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json`
- `MANIFEST.md`
- `GITHUB_RELEASE_BODY.md`
- `UPDATE_INTEGRITY.md`
- `SUPPLY_CHAIN_BASELINE.md`
- `DEPENDENCY_INVENTORY.md`
- `DEPENDENCY_LOCKFILES.sha256`

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
