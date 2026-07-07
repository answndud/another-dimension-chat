# macOS Production UX And Onboarding Gate

Status: OPS-5 and RB-4 source-side UX/onboarding gates closed. The
owner-observed critical desktop task script and recovery vocabulary are ready.
This is not a stable production release, completed 3-5-person usability-study
result, audited-security claim, or sensitive-use permission. The app must keep
unsigned experimental public beta, sensitive communication prohibited, not
audited, and not production-ready copy until the later stable release gate.

This document records the desktop-first macOS onboarding and recovery flow that
must be visible in the app before distribution, external review, and field
evidence phases continue.

The RB-4 owner-observed usability/recovery scope is recorded in
`reference/MACOS_USABILITY_RECOVERY_CLOSURE.md`.

## Required First-Run Path

The first screen keeps the public beta warning and shows a local desktop
checklist:

1. Unlock, create, or reopen a local profile.
2. Create an invite room or paste a received invite code.
3. Compare the safety phrase before messaging.
4. Use the manual encrypted envelope export/import flow.
5. Copy redacted diagnostics with broad failure class and recovery next action.

This flow must work without relying on README-only knowledge. README can remain
supporting documentation, but the app must show the primary next action and
failure reason in the room/composer/recovery surfaces.

## Room And Composer Flow

- Room status shows friend/family next actions: invite, open room, rebuild,
  verify, enable delivery, exchange delivery codes, start/stop/restart receive,
  retry/cancel, wait/reply, write, or send.
- The composer primary action stays on the chat delivery path and does not
  silently move users into settings or advanced transport.
- Manual envelope export/import remains the default path.
- Pending send rows remain retryable or cancelable from the active device.
- Retry/cancel and selected-message notices stay scoped to the active invite
  room and current pending message.
- Safety mismatch revokes saved room verification.

## Recovery And Diagnostics

The public recovery guide covers install/checksum failure, profile locked,
malformed payload, replay rejected, transport unavailable or policy blocked,
and local lifecycle confirmation. Public diagnostics stay local-copy only and
limited to status, build identity, broad failure class, recovery next action,
desktop local-private-flow acceptance status/blockers/non-claims, and
app-launch network boundary.

Diagnostics and support intake must not include raw logs, local paths, onion
endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases,
profile names, message text, passphrases, private keys, key material, crash
dumps, or private planning notes.

## Local Lifecycle UX

The app exposes separate destructive local actions:

- Conversation delete removes local conversation message records and preserves
  session records.
- Session delete removes session resume records and preserves message records.
- Profile delete requires typing the exact local profile name.
- Full local wipe requires typing `WIPE LOCAL DATA`.

All destructive actions are local-only and must keep cloud backup recovery,
rollback prevention, secure deletion from storage media, security-ready, and
sensitive-use claims false.

## Advanced Transport UX

The high-risk onion/Tor path is advanced, explicit-user-triggered, fail-closed,
and separate from the default manual envelope path. The app must not bootstrap
Tor, host onion services, publish descriptors, open streams, send envelopes, or
receive envelopes on app launch. Advanced transport controls must keep external
delivery evidence and reliable delivery wording false until field evidence and
review phases.

## Evidence Anchors

- First-run checklist and public beta warning: `apps/desktop-tauri/index.html`
  and `apps/desktop-tauri/src/i18n.js`
- Room/composer next-action logic: `friendFamilyOnboardingView`,
  `twoProfilePrimaryReadiness`, and `runProductionTwoProfileComposerPrimaryAction`
  in `apps/desktop-tauri/src/main.js`
- Manual flow and recovery guides:
  `scripts/desktop_manual_flow_usability_once.sh` and
  `scripts/desktop_error_recovery_copy_once.sh`
- Local lifecycle safety:
  `scripts/desktop_lifecycle_safety_once.sh`
- Public diagnostics redaction:
  `apps/desktop-tauri/src/private-delivery-state.js`

Targeted tests that anchor this gate:

- `first launch public beta warning keeps release and network boundaries visible`
- `friend and family onboarding shows room status next actions`
- `manual encrypted envelope guide keeps local default flow visible`
- `public diagnostics recovery guide keeps support-safe next actions visible`
- `local data lifecycle actions expose destructive local-only boundaries`
- `composer and delivery-route controls stay on the chat delivery path`

## Current Gate Flags

- macos_production_ux_onboarding_gate_reviewed=true
- rb_4_macos_usability_recovery_closure_reviewed=true
- supported_owner_observed_usability_rehearsal_ready=true
- supported_usability_recovery_scope=owner-observed-critical-desktop-task-script-only
- critical_desktop_task_script_ready=true
- first_run_local_desktop_flow_visible=true
- invite_verify_message_flow_in_app=true
- manual_envelope_default_flow_visible=true
- friend_family_next_actions_visible=true
- recovery_guide_visible=true
- recovery_vocabulary_aligned=true
- redacted_diagnostics_copy_visible=true
- destructive_local_lifecycle_confirmations_visible=true
- advanced_transport_explicit_fail_closed=true
- beta_warning_preserved=true
- production_wording_ready=false
- usability_study_completed=false
- automatic_network_on_launch_allowed=false
- external_delivery_claim_allowed=false
- sensitive_communication_allowed=false
- security_ready_claimed=false
- next_required_phase=Phase M100-5 - macOS Error Recovery And Destructive Action Completion
