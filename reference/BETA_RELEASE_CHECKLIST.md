# Beta Release Checklist

This checklist covers the internal field-test beta handoff and the unsigned public experimental GitHub DMG beta staging path. It is not a secure-release checklist and does not create a security claim.

## Scope

Allowed beta scope:

- Two-profile invite-code room creation and join.
- Safety phrase comparison and confirmation.
- Local encrypted profile/session/message store exercise.
- Saved-room restart/resume recovery.
- Manual private-route exchange.
- Explicit receive start/stop.
- Failed-send retry and cancel recovery.
- Redacted field-test report copy/compare.
- Public diagnostics local-copy boundary with no crash upload, telemetry, or raw log export.
- Local backup-exclusion verification and forward-only migration boundary.
- Explicit onion/Tor attempt paths after manual network permission.

Out of scope:

- Sensitive real communication.
- Public secure messenger release.
- Phone/email/global account/contact discovery.
- Central message server, push notification, or cloud backup.
- Cloud backup/sync, backup recovery, destructive migration, rollback prevention, or secure deletion guarantees.
- Signed, notarized, auto-updating, reproducible, audited, or externally reviewed release claims.

## Pre-Handoff Checks

Run from the repository root unless stated otherwise:

```bash
scripts/verify_all.sh
cd apps/desktop-tauri
npm run test:state
npm run test:local-peers
```

For bridge-capable field testing, run only the targeted bridge/onion checks required for the handoff. Do not run network attempts unless the tester run explicitly needs them.

## Build Commands

```bash
cd apps/desktop-tauri
npm run tauri:build
npm run tauri:build:beta-onion
npm run tauri:build:beta-onion-bridge
```

Use exactly one build channel per artifact. Record the command used.

## Artifact Record

For each local artifact, record:

- Product name and version.
- Build channel.
- Git commit.
- Build date.
- Platform and architecture.
- Artifact path.
- SHA-256.
- Checks completed.
- Known limitations.

Suggested SHA-256 command on macOS:

```bash
shasum -a 256 /path/to/artifact
```

## Handoff Rules

- Store local handoff artifacts under `apps/desktop-tauri/beta-artifacts/`.
- Do not commit `beta-artifacts/`.
- Do not include `docs/`, local app data, build caches, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, key material, raw logs, crash dumps, `target/`, `dist/`, or `node_modules/`.
- Tester notes must say the beta is not secure and must not be used for sensitive communication.
- Field-test notes should record whether bootstrap, onion endpoint launch, route exchange, send, receive, retry, and cancel complete or fail closed.

Current local handoff record:

- Transfer bundle SHA-256: `f231dcc3a95b63d5d32b6b36cb503443a46547fa1dcbb44d58f772be831d0907`
- App DMG SHA-256: `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`
- Build channel and commit: `beta-onion`, `806ecad1`
- Per-peer delivery folders: `apps/desktop-tauri/beta-artifacts/peer-delivery-a/` and `apps/desktop-tauri/beta-artifacts/peer-delivery-b/`

Peer handoff rules:

- Send the transfer zip, matching `.sha256`, `PEER_HANDOFF_MESSAGE.md`, and `MANIFEST.md`.
- Peers must verify the zip with `shasum -a 256 -c ...zip.sha256` before opening it.
- Peers must run `./VERIFY_FIELD_TEST_BUNDLE.sh` from the extracted `another-dimension-beta-handoff` folder.
- Completed peer reports must not include bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, passphrases, profile names, message text, local app data paths, raw logs, or key material.

## Unsigned Public GitHub Release

The public beta path starts from the ignored local DMG and creates a separate ignored upload set:

```bash
scripts/public_release_readiness_preflight.sh
scripts/prepare_unsigned_public_beta_release.sh
```

The preflight is source-only, does not require a DMG, and must not generate or commit `public-release/` or `beta-artifacts/` contents.

Default output:

```text
apps/desktop-tauri/public-release/unsigned-public-beta/
```

Upload exactly these generated files to the GitHub Release:

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

Use `GITHUB_RELEASE_BODY.md` as the GitHub Release body. Public release notes
and the GitHub Release body must say:

- This is an unsigned experimental public beta.
- It is not notarized.
- It is not audited.
- It is not production-ready.
- Sensitive communication prohibited.
- Users must verify the checksum before using the normal macOS Privacy & Security manual allow path.
- Auto-update is not supported; every update is a manual GitHub Release download plus SHA-256 verification.

Upload files from `apps/desktop-tauri/public-release/unsigned-public-beta/` only. Do not use branch files, GitHub source archives, another release, or the generated folder path itself as release assets.

Do not upload or commit `docs/`, local app data, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, key material, raw logs, crash dumps, build caches, `target/`, `dist/`, `node_modules/`, `beta-artifacts/`, or the ignored `public-release/` folder itself.

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

If `public_artifact_stale=false`, the GitHub Release asset set matches the
current generated packet. The next owner action is
`run-clean-macos-fresh-install-with-disposable-profile`.

## Clean macOS Fresh-Install Result Contract

The local source rehearsal may verify checklist readiness and same-release
checksum handling, but it is not a clean-machine pass. A clean install result
must use these public-safe fields:

- `clean_machine_execution=false`
- `clean_machine_result_accepted=false`
- `local_fixture_promoted_to_clean_install_pass=false`
- `checksum_result=OK`
- `gatekeeper_manual_allow_result=hold`
- `first_launch_result=hold`
- `profile_unlock_result=hold`
- `invite_join_result=hold`
- `safety_compare_result=hold`
- `envelope_exchange_result=hold`
- `diagnostics_copy_result=hold`
- `local_delete_result=hold`
- `app_launch_network=false`
- `next_owner_action=run-clean-macos-fresh-install-with-disposable-profile`

Only a real clean macOS machine with disposable data can move the clean-machine
fields out of `hold`. Local fixtures, ignored release packets, and source gates
must not be promoted to a fresh-install pass.

## Platform Release Boundary

The current public artifact is the unsigned macOS DMG. Future Windows, Android,
and iOS public artifacts must each have a matching checksum, public provenance,
manifest, release notes, update-integrity note, and dependency evidence attached
to the same GitHub Release as the artifact.

Do not describe a Windows installer, Android APK/AAB, iOS build, TestFlight
build, app-store listing, notarized artifact, signed artifact, or SmartScreen
reputation as a security boundary for v0.1. Those mechanisms may improve
distribution ergonomics later, but they do not replace same-release checksum
verification, provenance, non-claims, or the no-auto-update boundary.

Do not introduce auto-update until a separate update-integrity design covers
signed update metadata, rollback handling, channel separation, platform-specific
trust boundaries, and public non-claims.
