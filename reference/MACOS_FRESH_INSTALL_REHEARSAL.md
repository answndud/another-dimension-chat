# macOS Fresh Install Rehearsal

This checklist is for rehearsing the unsigned experimental public beta path on
macOS Apple Silicon before sending a tester to the GitHub Release.

It is not an audit, not production-ready evidence, and sensitive communication
prohibited remains in force. Do not record local paths, profile names, invite
codes, endpoints, payloads, message text, passphrases, private keys, key
material, raw logs, crash dumps, screenshots of private room data, or local app
data in the result.

## Result Header

Current public-safe result record:
`reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md`.

Record only:

- release tag
- app artifact name
- artifact filename
- artifact SHA-256
- provenance SHA-256
- build commit
- release_download_source: github-release
- same_release_download_result: pass, fail, or not_run
- same_release_checksum_result: pass, fail, or not_run
- checksum_result: OK, mismatch, or not_run
- dmg_mount_result: pass, hold, fail, or not_run
- manual_privacy_security_allow_result: pass, hold, fail, or not_run
- gatekeeper_manual_allow_result: pass, hold, fail, or not_run
- first_launch_result: pass, hold, fail, or not_run
- profile_create_result: pass, hold, fail, or not_run
- profile_unlock_result: pass, hold, fail, or not_run
- invite_join_safety_result: pass, hold, fail, or not_run
- invite_join_result: pass, hold, fail, or not_run
- safety_compare_result: pass, hold, fail, or not_run
- manual_envelope_exchange_result: pass, hold, fail, or not_run
- envelope_exchange_result: pass, hold, fail, or not_run
- diagnostics_redaction_result: pass, hold, fail, or not_run
- diagnostics_copy_result: pass, hold, fail, or not_run
- local_delete_result: pass, hold, fail, or not_run
- network_before_explicit_action: false, true, or not_observed
- app_launch_network: false, true, or not_observed
- platform: macos-aarch64
- clean_install_evidence_source: owner-clean-mac
- broad failure class, if any
- recovery next action, if any
- public beta non-claims confirmed: yes or no

Required machine-readable contract:

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
release_download_source=github-release
same_release_download_result=pass
same_release_checksum_result=pass
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

Do not mark `clean_machine_result_accepted=true` until a real clean macOS
machine has run the GUI flow with disposable data and the result stays
public-safe. Local fixtures, ignored release packets, screenshots, or headless
checks are source preparation only.

## Steps

### 1. Fresh Download

Action: open the GitHub Release and download the DMG plus matching `.sha256`
from that same release.

Expected result: both files are present and the user can identify that they
came from the same release.

Failure recovery: if either file is missing or came from a branch view, source
archive, chat attachment, or another release, stop and download both files again
from the GitHub Release.

### 2. Checksum

Action: run the same-release checksum command before opening the DMG.

Expected result: the command prints `OK` for
`another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`.

Failure recovery: on mismatch, stop, delete the local download copies, and
download the DMG plus `.sha256` again from the same GitHub Release. Do not open
the DMG and do not use a checksum copied from the branch.

### 3. Mount The DMG

Action: open the DMG only after checksum success.

Expected result: macOS mounts the DMG without a checksum or damaged-DMG warning.

Failure recovery: if macOS reports a damaged image, rerun the checksum. If it
still prints `OK`, eject and mount again; if it does not print `OK`, stop and
download again.

### 4. Copy The App

Action: copy the app from the mounted DMG to the normal macOS app location or a
temporary user-chosen test location.

Expected result: the app is visible in the chosen app location.

Failure recovery: if copy fails, stop and record only the broad failure class.
Do not publish local paths or screenshots containing private desktop data.

### 5. First Launch And Gatekeeper

Action: launch the copied app. If macOS blocks it, use System Settings >
Privacy & Security to allow the blocked app only after checksum success.

Expected result: the app opens or macOS presents the expected unsigned-app block
that can be manually allowed after checksum verification.

Failure recovery: if the allow button is missing, try opening the copied app
once, return to Privacy & Security, and report only the broad failure class if
it remains blocked. Do not use terminal quarantine-removal commands as an install step.

### 6. First-Run Warning

Action: read the first-run warning.

Expected result: the app says unsigned experimental public beta, not audited,
not production-ready, sensitive communication prohibited, checksum before
manual allow, and no external onion delivery claim.

Failure recovery: if any warning is missing or softened, stop and treat it as a
release-blocking copy issue.

### 7. Profile Unlock Or Create

Action: create or unlock a disposable local test profile.

Expected result: profile unlock/create succeeds without network/onion work on
launch.

Failure recovery: if unlock/create fails, copy only redacted diagnostics and
record the broad failure class. Do not publish profile names, paths,
passphrases, or raw logs.

### 8. Invite Room And Verify

Action: create or join a disposable invite room and view the verification
phrase.

Expected result: the user can find the invite room path and safety/verification
surface.

Failure recovery: if invite or verification is unclear, record the broad failure
class and recovery next action. Do not publish invite codes, endpoints,
payloads, or screenshots of private room data.

### 8a. Safety Compare

Action: compare the safety material for the disposable room before trusting it.

Expected result: the UI makes the safety comparison state visible before any
manual envelope exchange is treated as trusted.

Failure recovery: if the safety comparison is missing, unclear, or bypassed,
record broad failure class `safety-compare-blocked` and stop the rehearsal.

### 9. Manual Encrypted Envelope Export/Import

Action: use the local manual encrypted envelope export/import path with
disposable text only.

Expected result: the user can export, carry through an existing channel, import,
and see the message flow without automatic delivery or external delivery claim.

Failure recovery: if export/import fails, use retry or cancel where available
and copy only redacted diagnostics.

### 10. Reply, Retry, And Cancel

Action: send a disposable reply, then exercise retry and cancel on a pending or
failed local message state when available.

Expected result: conversation notice, composer primary action, and follow-up
copy stay aligned with the actual pending message state.

Failure recovery: if the UI points at the wrong pending state, record broad
failure class `desktop-state-drift` and do not continue to real communication.

### 11. Local Deletion

Action: rehearse conversation delete and session delete with disposable data.
Do not run profile delete or full local wipe unless the operator explicitly
chooses a disposable profile and types the exact required confirmation.

Expected result: the app distinguishes conversation delete, session delete,
profile delete, and full local wipe, and does not imply cloud backup recovery,
rollback prevention, or secure deletion from storage media.

Failure recovery: if destructive copy is ambiguous, stop and treat it as a
release-blocking UX issue.

### 12. Redacted Diagnostics Copy

Action: copy public support diagnostics after a harmless failure or normal beta
status review.

Expected result: diagnostics contain app status, build identity, broad failure
class, recovery next action, desktop acceptance status/blockers/non-claims, and
app-launch network boundary only.

Failure recovery: if diagnostics include raw logs, local paths, invite codes,
endpoints, payloads, message text, passphrases, private keys, key material, or
screenshots, stop and do not publish them.

## Final Decision

Pass only when checksum, Gatekeeper recovery, first-run warning, profile
unlock/create, invite room, manual encrypted envelope export/import, reply,
retry, cancel, local deletion, and redacted diagnostics copy are all understood
without private data exposure.

Hold when any step requires raw logs, private data, terminal quarantine removal,
external onion success evidence, sensitive communication, production-ready
language, or a public artifact not attached to the GitHub Release.
