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
- artifact_filename=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg
- artifact_sha256=ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13
- provenance_sha256=6a872d104b47144d3e15b60c79be71e82d2a5973898c9b7198aba270dd9cdec0
- release_tag=v0.1.0-beta-onion-unsigned
- build_commit=e724bd39
- platform=macos-aarch64
- checksum_result: OK
- dmg_mount_result=pass
- manual_privacy_security_allow_result=hold
- gatekeeper_manual_allow_result: hold
- first_launch_result: hold
- profile_create_result=hold
- profile_unlock_result: hold
- invite_join_safety_result=hold
- invite_join_result: hold
- safety_compare_result: hold
- manual_envelope_exchange_result=hold
- envelope_exchange_result: hold
- diagnostics_redaction_result=hold
- diagnostics_copy_result: hold
- local_delete_result: hold
- network_before_explicit_action=false
- app_launch_network: false
- clean_install_evidence_source=owner-clean-mac
- platform: macOS Apple Silicon
- broad failure class: `macos-gui-human-rehearsal-not-run`
- recovery next action: run-clean-macos-fresh-install-with-disposable-profile before using
  this result as a tester-facing pass record
- public beta non-claims confirmed: yes

## Machine Contract

```text
clean_machine_execution=false
clean_machine_result_accepted=false
local_fixture_promoted_to_clean_install_pass=false
artifact_filename=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg
artifact_sha256=ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13
provenance_sha256=6a872d104b47144d3e15b60c79be71e82d2a5973898c9b7198aba270dd9cdec0
release_tag=v0.1.0-beta-onion-unsigned
build_commit=e724bd39
platform=macos-aarch64
checksum_result=OK
dmg_mount_result=pass
manual_privacy_security_allow_result=hold
gatekeeper_manual_allow_result=hold
first_launch_result=hold
profile_create_result=hold
profile_unlock_result=hold
invite_join_safety_result=hold
invite_join_result=hold
safety_compare_result=hold
manual_envelope_exchange_result=hold
envelope_exchange_result=hold
diagnostics_redaction_result=hold
diagnostics_copy_result=hold
local_delete_result=hold
network_before_explicit_action=false
app_launch_network=false
clean_install_evidence_source=owner-clean-mac
next_owner_action=run-clean-macos-fresh-install-with-disposable-profile
```

## Step Results

- Fresh Download: pass, downloaded DMG and `.sha256` from the same GitHub Release.
- Checksum: pass, same-release `.sha256` printed OK for the DMG.
- Mount The DMG: pass, mounted read-only without rebuilding the DMG.
- Copy The App: pass, copied the app bundle to a temporary install target.
- First Launch And Gatekeeper: hold, headless assessment observed blocked unsigned status; manual Privacy & Security allow was not exercised.
- First-Run Warning: hold, GUI first-run was not opened in this agent session.
- Profile Unlock Or Create: hold, disposable GUI profile flow was not run.
- Invite Room And Verify: hold, disposable GUI invite flow was not run.
- Safety Compare: hold, disposable GUI safety comparison was not run.
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
