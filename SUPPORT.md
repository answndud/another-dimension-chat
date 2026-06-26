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

Allowed public intake fields are:

- app-status
- app-version
- build-channel
- build-commit
- platform
- public-diagnostics
- checksum-result
- failure-class
- recovery-next-action
- desktop-acceptance-status
- desktop-acceptance-blockers
- app-launch-network
- release-class-readiness
- high-risk-runtime-evidence-source
- high-risk-runtime-evidence-accepted
- high-risk-runtime-primary-blocker
- high-risk-runtime-failure-class
- engine-sidecar-status-failure-class
- engine-sidecar-manual-self-test-failure-class
- engine-sidecar-redacted-runtime-status

Forbidden public intake fields are:

- raw logs
- crash dumps
- screenshots
- onion endpoints
- endpoints
- invite codes
- pairing payloads
- envelope payloads
- endpoint payloads
- message text
- local paths
- payloads
- safety phrases
- profile names
- passphrases
- private keys
- key material
- private planning notes
- support bundles

The intake policy fields are:

- `allowed_public_intake_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness#high-risk-runtime-evidence-source#high-risk-runtime-evidence-accepted#high-risk-runtime-primary-blocker#high-risk-runtime-failure-class#engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class#engine-sidecar-redacted-runtime-status`
- `forbidden_public_intake_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles`

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

If you intentionally choose the legacy DMG fallback, download the DMG and
matching `.sha256` from the same GitHub Release:

<https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>

Verify the checksum before using the normal macOS Privacy & Security manual
allow path.
