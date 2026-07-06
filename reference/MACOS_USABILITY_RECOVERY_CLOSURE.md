# macOS Usability And Recovery Closure

Status: RB-4 source-side usability/recovery closure is complete for the
owner-observed critical desktop task script scope. This is not a completed
3-5-person usability study, not production wording readiness, not a stable
release claim, and not permission for sensitive communication.

RB-4 resolves the immediate local blocker by making the critical desktop
rehearsal path explicit and checkable: first-run warning, profile create/unlock
or reopen, invite/create/join, safety verification, manual envelope
send/export/import/reply, retry/cancel, local delete/wipe, redacted diagnostics
copy, and recovery vocabulary alignment.

## Owner-Observed Task Script

Run the critical desktop rehearsal with disposable data only:

1. Fresh launch: confirm unsigned experimental public beta, not audited, not
   production-ready, and sensitive communication prohibited copy is visible.
2. Profile: create or reopen a local profile, unlock with a passphrase, then
   lock/reopen once.
3. Invite: create an invite room, join from a second local profile, and compare
   the safety phrase.
4. Message: write one message, export the encrypted envelope, import it on the
   other profile, reply, and import the reply.
5. Recovery: retry and cancel a pending send from the selected row only.
6. Lifecycle: rehearse conversation delete and session delete with disposable
   data; profile delete and full wipe require explicit owner approval.
7. Diagnostics: copy public diagnostics and verify only broad failure class,
   recovery next action, desktop acceptance status, non-claims, and app-launch
   network boundary are present.

## Still Required Before Stronger Claims

- 3-5 representative non-developer task sessions or equivalent recorded
  usability evidence,
- redacted task completion outcomes and unresolved blocker notes,
- UI fixes for observed failures,
- separate stable release and production wording approval.

## Current Gate Flags

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
- usability_study_completed=false
- production_wording_ready=false
- automatic_network_on_launch_allowed=false
- external_delivery_claim_allowed=false
- sensitive_communication_allowed=false
- security_ready_claimed=false
- next_required_phase=RB-5 real macOS two-machine field evidence closure
