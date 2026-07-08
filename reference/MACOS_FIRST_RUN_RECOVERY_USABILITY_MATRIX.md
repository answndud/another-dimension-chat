# macOS First-Run Recovery Usability Matrix

Status: source-ready for the macOS first-run, recovery, destructive action, and
redacted support-report workflow matrix. This is not representative usability
evidence, not production-ready wording, not audited, and not permission for
sensitive communication.

## Required User Workflow Coverage

- Release class and non-claims visible on first run.
- Profile create/unlock failures map to redacted recovery classes.
- Invite create/import keeps next action visible.
- Safety verification shows compare/mismatch/re-pairing guidance.
- Manual encrypted envelope export/import/reply is the default user path.
- Pending retry/cancel states are visible and recoverable.
- Conversation delete, session delete, profile delete, and full local wipe are
  distinct destructive actions with distinct confirmations.
- Public support diagnostics are local-copy only and redacted to status, build,
  broad failure class, and recovery next action.
- Advanced onion/Tor path remains explicit and fail-closed.

## Current Gate Flags

- macos_first_run_recovery_usability_matrix_available=true
- first_run_release_class_visible=true
- profile_error_recovery_visible=true
- invite_next_action_visible=true
- safety_mismatch_repair_visible=true
- manual_envelope_recovery_visible=true
- pending_retry_cancel_visible=true
- destructive_actions_separated=true
- redacted_support_report_copy_visible=true
- support_report_raw_logs_allowed=false
- support_report_private_payload_allowed=false
- support_report_key_material_allowed=false
- representative_usability_evidence_completed=false
- usability_study_completed=false
- production_wording_ready=false
- sensitive_communication_allowed=false
