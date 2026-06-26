# Support

Another Dimension Chat is an unsigned experimental public beta. It is not
notarized, not audited, not production-ready, and sensitive communication
prohibited.

## Public Support

For install, checksum, launch, and redacted diagnostics questions, use the
`Unsigned public beta support` issue template. Keep the report room-scoped:
public diagnostics only, no raw logs, no local paths, no invite codes, no
payloads, no message text, no safety phrases, no passphrases, no keys, and no
screenshots of private room data.

Post only:

- app version
- build channel
- build commit
- platform
- checksum verification result
- unsigned macOS install step reached
- public diagnostics copied from the app
- redacted failure class

Do not post raw logs, crash dumps, local paths, endpoints, payloads, invite
codes, safety phrases, message text, passphrases, private keys, key material,
private planning notes, files from `docs/`, local app data, or screenshots that
show private room data.

## Security Reports

Use GitHub private vulnerability reporting when available.

If private vulnerability reporting is unavailable, open a `Security contact
request` issue with only a minimal public summary. Do not include exploit
details or sensitive material in public issues.

## Source Build First

The primary macOS install path is source build.

Follow the source build guide first:

- [Install from source on macOS](INSTALL_FROM_SOURCE_MACOS.md)

## Legacy DMG Fallback

If you still choose the DMG path, download the DMG and matching `.sha256`
from the same GitHub Release:

<https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>

Verify the checksum before using the normal macOS Privacy & Security manual
allow path.
