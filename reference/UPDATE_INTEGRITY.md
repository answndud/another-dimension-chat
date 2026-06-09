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
- `UPDATE_INTEGRITY.md`
- `SUPPLY_CHAIN_BASELINE.md`
- `DEPENDENCY_LOCKFILES.sha256`

Then users must verify the DMG checksum before opening the app:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Expected result:

```text
another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg: OK
```

## Release Publisher Boundary

The release publisher must not replace a DMG without replacing the matching
`.sha256`, provenance JSON, manifest, release notes, and dependency lockfile
hash evidence in the same release.

The public release body must repeat:

- unsigned experimental public beta
- not notarized
- not audited
- not production-ready
- sensitive communication prohibited

## Non-Claims

This policy does not claim:

- update authenticity beyond the GitHub Release page the user chooses to trust
- automatic rollback prevention
- malware review
- dependency audit completion
- reproducible build equivalence
- secure messenger readiness
