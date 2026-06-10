# Install Unsigned macOS Public Beta

This build is an unsigned experimental public beta of Another Dimension Chat.

It is not notarized, not audited, not production-ready, and sensitive communication prohibited.

## Files

Download these files from the GitHub Release:

<https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>

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
- `INDEPENDENT_REVIEW_PACKET.md`
- `PUBLIC_INTAKE_POLICY.md`
- `REPOSITORY_GOVERNANCE.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `MANIFEST.md`

Use the files attached to that GitHub Release as the release authority. The
`main` branch may contain later documentation or source updates, so do not
verify the downloaded DMG against branch files copied from GitHub's source
browser.

## Verify The Download

Put the `.dmg` and `.sha256` in the same folder, then run:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Expected output:

```text
another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg: OK
```

Expected DMG SHA-256:

```text
625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95
```

## Open On macOS

Because this build is unsigned and not notarized, macOS may block it.

Use only the normal macOS manual allow path:

1. Open the DMG.
2. Try to open Another Dimension Chat.
3. If macOS blocks it, open System Settings.
4. Go to Privacy & Security.
5. Allow the blocked app only if the checksum matched the expected SHA-256.

Do not use this app for sensitive communication.

## Manual Updates Only

This beta has no auto-update channel.

For every update, download the new DMG and matching `.sha256` from the same
GitHub Release and verify the checksum again before opening the app.

`DEPENDENCY_LOCKFILES.sha256` records the lockfile hashes used for the release
baseline. It is reviewer evidence, not a dependency audit or security guarantee.

`PUBLIC_THREAT_MODEL.md` and `INDEPENDENT_REVIEW_PACKET.md` are reviewer inputs
only. The release provenance records that independent review is not complete and
that no reviewer signoff is claimed.

`PUBLIC_INTAKE_POLICY.md` describes what can be posted in public issues and
release comments. Use redacted public diagnostics only. Do not post raw logs,
crash dumps, endpoints, payloads, paths, passphrases, private keys, key
material, screenshots of private room data, private planning notes, or local app
data.

`REPOSITORY_GOVERNANCE.md` records maintainer-driven main-branch governance,
release guardrails, redaction rules, and non-goals for this unsigned beta.

Public diagnostics are local-copy only. They are limited to status, build,
failure class, manual network permission, and app-launch network boundary. They
do not provide crash upload, telemetry, or raw log export.

Local backup exclusion is a required local verification boundary only. This
beta does not provide cloud backup/sync, backup recovery, rollback prevention,
or secure deletion from storage media.

## Safety Boundary

- No phone number, email, global account, searchable username, centralized contact discovery, central message server, push notification, or cloud backup is part of this beta.
- The app must not start Tor/onion/network work on launch.
- Network/onion work must require explicit user action.
- This beta does not claim secure messenger readiness.
