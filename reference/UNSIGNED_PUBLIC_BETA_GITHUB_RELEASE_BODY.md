# GitHub Release Body - Unsigned Public Beta

This is an unsigned experimental public beta.

It is not signed, not notarized, not audited, not production-ready, and sensitive communication prohibited.

Apple Developer Program, Developer ID, notarization, App Store, and TestFlight
credentials are not used or required for this OSS public beta. Gatekeeper may
warn because the app is unsigned. Verify the checksum first, then use the normal
macOS Privacy & Security manual allow path. Do not disable Gatekeeper globally
and do not use terminal quarantine-removal commands as an install step.

## Download

For normal install, download only these two files from this same GitHub Release:

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256`

The other attached files are reviewer or maintainer evidence:

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

Use the files attached to this GitHub Release as the release authority. The
`main` branch may contain later documentation or source updates, so do not
verify the downloaded DMG against branch files copied from GitHub's source
browser, GitHub source archives, or files from a different release.

<details>
<summary>Maintainer upload boundary</summary>

Upload boundary for operators: this GitHub Release should contain exactly the
files listed above and in `MANIFEST.md`. Use `GITHUB_RELEASE_BODY.md` exactly as
the release body. Do not upload `docs/`, `beta-artifacts/`, the
`public-release/` folder itself, branch files, source archives, raw logs, crash
dumps, screenshots, local app data, private diagnostics, private planning notes,
or any file not listed in the manifest.

</details>

## Verify Before Opening

Run:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Expected result:

```text
another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg: OK
```

Expected DMG SHA-256:

```text
ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13
```

Only after the checksum matches, use the normal macOS Privacy & Security manual allow path if macOS blocks the unsigned app.

Do not use terminal quarantine-removal commands as an install step.

## Shared Packet Boundary

These values must stay identical across the install guide, release notes,
GitHub Release body, and beta checklist:

- `artifact_identity=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg#ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13#beta-onion#e724bd39#v0.1.0-beta-onion-unsigned#macos-aarch64`
- `artifact_identity_fields=artifact#artifact_sha256#build_channel#build_commit#release_tag#platform`
- `artifact_current_head_aligned=true`
- `public_artifact_stale=false`
- `public_artifact_state=current`
- `next_owner_action=run-clean-macos-fresh-install-with-disposable-profile`
- `trust_model=same-github-release-assets#same-release-sha256#manual-privacy-security-allow-after-checksum#no-auto-update`
- `support_intake=redacted-diagnostics-only#no-raw-logs#no-crash-dumps#no-private-room-data#no-payloads#no-key-material`
- `generated_artifact_boundary=do-not-commit-public-release-or-beta-artifacts#no-dmg-rebuild#no-release-upload-or-edit`

This generated DMG packet is aligned to the current public packet source.
Verify it with the same-release checksum and provenance; the matching GitHub
Release asset set is current.

## Install

Read `INSTALL_UNSIGNED_MACOS.md` before opening the DMG. The short path is:

1. Download the DMG and matching `.sha256` from this same GitHub Release.
2. Run the checksum command above and continue only if it prints `OK`.
3. Open the DMG.
4. If macOS blocks the unsigned app, use System Settings > Privacy & Security
   to allow it only after the checksum matches.
5. If checksum, damaged-DMG, open-blocked, or allow-button issues appear, follow
   the troubleshooting section in `INSTALL_UNSIGNED_MACOS.md`.

## What Works

- macOS Apple Silicon unsigned DMG download.
- Manual SHA-256 verification before opening.
- Local profile unlock and reopen rehearsal.
- Invite room create/join/verify flow.
- Manual encrypted envelope export/import.
- Reply, retry/cancel, local deletion, and redacted diagnostics copy.
- Explicit user-triggered advanced onion/Tor attempt paths that remain outside
  the public product claim.
- High-Risk runtime evidence validator is a redacted evidence-format gate; it
  does not open public High-Risk or reliable delivery claims.

## What Does Not Work

- There is no signed or notarized macOS app.
- There is no auto-update channel.
- There is no public Windows, Android, or iOS artifact in this release.
- There is no account, phone number, email, username search, cloud backup,
  central contact discovery, central message server, or push notification.
- There is no production security claim, audit claim, sensitive communication
  permission, or external onion delivery success claim.

## Safety Warnings

This beta is for local desktop public-beta testing only. It is not audited, not
production-ready, and sensitive communication prohibited. Do not use it for real
communication. Do not post invite codes, endpoints, payloads, message text,
local paths, raw logs, screenshots of private room data, passphrases, private
keys, or key material in public.

## Report Issue

Public issues and release comments must use only redacted diagnostics, broad
failure class, checksum result, platform, build identity, and recovery next
action. Security details or sensitive material must use private vulnerability
reporting when available, or a minimal public contact request without exploit
details when private reporting is unavailable.

## Non-Claims

This beta does not claim:

- external_delivery_claim=false
- security_ready_claim=false
- high_risk_public_claim_allowed=false
- high_risk_ready_claim_allowed=false
- secure production messaging
- audited security
- production-ready E2EE
- sensitive communication safety
- crash upload, telemetry, raw log export, crash dump export, automated log
  collection, support bundle export, raw diagnostic file export, or safe
  publication of private logs
- safe publication of bridge lines, onion endpoints, invite codes, payloads,
  safety phrases, messages, paths, crash dumps, passphrases, private keys, key
  material, screenshots of private room data, or private planning notes
- signing or notarization
- auto-update integrity
- reproducible-build proof
- SBOM, dependency audit completion, live dependency scan, or vulnerability triage signoff
- completed independent review
- reviewer signoff or public user safety signoff
- fabricated external review or external peer evidence
- reliable real-network Tor/onion delivery
- independently verified external two-machine onion delivery
- Briar/Cwtch-equivalent privacy or security level
- repeated external onion evidence, offline mesh delivery, or security-ready status
- cloud backup/sync or backup recovery
- destructive migration
- rollback prevention
- secure deletion from storage media

Dependency evidence is limited to `DEPENDENCY_INVENTORY.md` and exactly three
lockfile hash entries in `DEPENDENCY_LOCKFILES.sha256`: `Cargo.lock`,
`apps/desktop-tauri/src-tauri/Cargo.lock`, and
`apps/desktop-tauri/package-lock.json`.

External onion delivery is outside the v0.1 public product claim. Same-machine
dual-profile rehearsal is development evidence only, not peer field-test evidence.
No peer report is expected or required for this v0.1 claim, and no external delivery claim is made.

`PRIVACY_MODEL_COMPARISON.md` is a public gap map for the Korean
Briar/Cwtch-style direction. It is not a claim that this beta has reached those
systems' level.

Every update is a new manual GitHub Release download and must be verified with the matching `.sha256` file.

For support requests, use only redacted public support diagnostics. For security reports
with sensitive details, use private vulnerability reporting when available or
open a minimal public contact request without exploit details.

Repository governance for this beta is maintainer-driven main-branch work with
unsigned beta non-claims, no-central-trusted-server scope, private-data
redaction, and no fabricated external peer evidence.
