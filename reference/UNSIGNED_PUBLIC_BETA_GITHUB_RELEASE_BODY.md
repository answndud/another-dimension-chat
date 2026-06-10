# GitHub Release Body - Unsigned Public Beta

This is an unsigned experimental public beta.

It is not notarized, not audited, not production-ready, and sensitive communication prohibited.

## Download

Download all files from this same GitHub Release:

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

Use the files attached to this GitHub Release as the release authority. The
`main` branch may contain later documentation or source updates, so do not
verify the downloaded DMG against branch files copied from GitHub's source
browser.

## Verify Before Opening

Run:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Expected result:

```text
another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg: OK
```

Only after the checksum matches, use the normal macOS Privacy & Security manual allow path if macOS blocks the unsigned app.

Do not use terminal quarantine-removal commands as an install step.

## Non-Claims

This beta does not claim:

- secure production messaging
- audited security
- production-ready E2EE
- sensitive communication safety
- crash upload, telemetry, raw log export, or safe publication of private logs
- safe publication of bridge lines, onion endpoints, invite codes, payloads,
  safety phrases, messages, paths, crash dumps, passphrases, private keys, key
  material, screenshots of private room data, or private planning notes
- signing or notarization
- auto-update integrity
- reproducible-build proof
- SBOM or dependency audit completion
- completed independent review
- reviewer signoff or public user safety signoff
- reliable real-network Tor/onion delivery
- independently verified external two-machine onion delivery
- cloud backup/sync or backup recovery
- destructive migration
- rollback prevention
- secure deletion from storage media

External two-machine onion delivery has not yet been independently verified.
Same-machine dual-profile rehearsal is development evidence only, not peer field-test evidence.

Every update is a new manual GitHub Release download and must be verified with the matching `.sha256` file.

For support requests, use only redacted public diagnostics. For security reports
with sensitive details, use private vulnerability reporting when available or
open a minimal public contact request without exploit details.

Repository governance for this beta is maintainer-driven main-branch work with
unsigned beta non-claims, no-central-trusted-server scope, private-data
redaction, and no fabricated external peer evidence.
