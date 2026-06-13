# Install Unsigned macOS Public Beta

This build is an unsigned experimental public beta of Another Dimension Chat.

It is not notarized, not audited, not production-ready, and sensitive communication prohibited.

This guide is for macOS Apple Silicon users installing the unsigned DMG from
the GitHub Release. The safe order is download, verify, open, then use the
normal macOS Privacy & Security manual allow path if Gatekeeper blocks the app.

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
- `PRIVACY_MODEL_COMPARISON.md`
- `INDEPENDENT_REVIEW_PACKET.md`
- `PUBLIC_INTAKE_POLICY.md`
- `REPOSITORY_GOVERNANCE.md`
- `COMPONENT_BOUNDARIES.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `OPERATOR_FINAL_HANDOFF.md`
- `MANIFEST.md`

Use the files attached to that GitHub Release as the release authority. The
`main` branch may contain later documentation or source updates, so do not
verify the downloaded DMG against branch files copied from GitHub's source
browser, GitHub source archives, or files from a different release.

## Verify The Download

Put the `.dmg` and `.sha256` in the same folder. Use the `.sha256` attached to
the same GitHub Release as the DMG, then run:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Expected output:

```text
another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg: OK
```

Expected DMG SHA-256:

```text
7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a
```

## Open On macOS

Because this build is unsigned and not notarized, macOS may block it.

Use only the normal macOS manual allow path:

1. Open the DMG.
2. Try to open Another Dimension Chat.
3. If macOS blocks it, open System Settings.
4. Go to Privacy & Security.
5. Allow the blocked app only if the checksum matched the expected SHA-256.

Do not use terminal quarantine-removal commands as an install step.

Do not use this app for sensitive communication.

## Troubleshooting

### Checksum mismatch

Stop and do not open the DMG. Delete the local `.dmg` and `.sha256`, then
download both files again from the same GitHub Release. Do not mix a DMG from
one release with a checksum copied from a branch view, source archive, README
copy, chat message, or another release.

### DMG looks damaged

Do not bypass the warning. First rerun the checksum command above. If the
checksum does not print `OK`, delete the files and download the DMG and
`.sha256` again from the same GitHub Release. If the checksum prints `OK`,
eject the DMG, mount it again, and use the normal macOS Privacy & Security
manual allow path.

### App cannot be opened

This is expected for some unsigned/not notarized builds. Confirm the checksum
first, try to open the app once, then open System Settings > Privacy & Security
and allow the blocked app there. Do not use terminal quarantine-removal commands
to force-open the app.

### Privacy & Security allow button is missing

The allow button may appear only after you try to open the blocked app once.
Confirm the checksum, try opening Another Dimension Chat from the mounted DMG,
then return to System Settings > Privacy & Security. If the button still does
not appear, stop and report the broad failure class with redacted diagnostics
only. Do not post local paths, raw logs, invite codes, endpoints, payloads,
message text, passphrases, private keys, or key material.

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
release comments. Use redacted public support diagnostics only. Do not post raw logs,
crash dumps, endpoints, payloads, paths, passphrases, private keys, key
material, screenshots of private room data, private planning notes, or local app
data.

`REPOSITORY_GOVERNANCE.md` records maintainer-driven main-branch governance,
release guardrails, redaction rules, and non-goals for this unsigned beta.

Public support diagnostics are local-copy only. They are limited to app status,
build identity, broad failure class, recovery next action, desktop local-private-flow acceptance status/blockers/non-claims, and app-launch network boundary.
They do not provide workflow-state export, crash upload, telemetry, raw log
export, support bundle export, or raw diagnostic file export.

Local backup exclusion is a required local verification boundary only. This
beta does not provide cloud backup/sync, backup recovery, rollback prevention,
or secure deletion from storage media.

## Safety Boundary

- No phone number, email, global account, searchable username, centralized contact discovery, central message server, push notification, or cloud backup is part of this beta.
- The app must not start Tor/onion/network work on launch.
- Network/onion work must require explicit user action.
- This beta does not claim secure messenger readiness.
