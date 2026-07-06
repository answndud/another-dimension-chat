# macOS Fresh Install Rehearsal Result

Status: hold for manual GUI follow-through; source install authority passed.
Date: 2026-06-13.

Non-claims retained: unsigned experimental public beta, sensitive communication prohibited, not audited, not production-ready.

This record is public-safe. It does not include local paths, profile names,
invite codes, endpoints, payloads, message text, raw logs, passphrases, private
keys, key material, screenshots of private room data, or local app data.

## Result Header

- release tag: `v0.1.0-beta-onion-unsigned`
- app artifact name: `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- checksum result: OK
- platform: macOS Apple Silicon
- broad failure class: `macos-gui-human-rehearsal-not-run`
- recovery next action: run the GUI checklist with disposable data before using
  this result as a tester-facing pass record
- public beta non-claims confirmed: yes

## Step Results

- Fresh Download: pass, downloaded DMG and `.sha256` from the same GitHub Release.
- Checksum: pass, same-release `.sha256` printed OK for the DMG.
- Mount The DMG: pass, mounted read-only without rebuilding the DMG.
- Copy The App: pass, copied the app bundle to a temporary install target.
- First Launch And Gatekeeper: hold, headless assessment observed blocked unsigned status; manual Privacy & Security allow was not exercised.
- First-Run Warning: hold, GUI first-run was not opened in this agent session.
- Profile Unlock Or Create: hold, disposable GUI profile flow was not run.
- Invite Room And Verify: hold, disposable GUI invite flow was not run.
- Manual Encrypted Envelope Export/Import: hold, disposable GUI envelope flow was not run.
- Reply, Retry, And Cancel: hold, disposable GUI pending-state flow was not run.
- Local Deletion: hold, disposable GUI deletion flow was not run.
- Redacted Diagnostics Copy: hold, GUI diagnostics copy was not run.

## Decision

The release download, checksum, mount, and copy path is ready. The public beta
must not treat this as a full human fresh-install pass until a disposable GUI
run confirms first-run warning, profile unlock/create, invite room, manual
envelope export/import, reply/retry/cancel, local deletion, and diagnostics copy.
No release upload, DMG rebuild, generated artifact commit, production-ready
claim, audit claim, external onion delivery claim, or sensitive communication
allowance was made.
