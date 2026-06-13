# Representative Usability Report Packet

Status: M100-6 is closed by explicit owner policy waiver for active-queue
progress, while the D100-4 representative usability report intake remains
source-ready. This is not a completed usability study, not representative
evidence completion, not a stable release approval, not production-ready, not
audited, and not permission for sensitive communication.

Use this packet only for real non-sensitive macOS usability sessions with
representative family, friend, personal-client, or non-developer users. Reports
must be redacted before they are shared or checked in. The focused validator is
`scripts/validate_representative_usability_reports.mjs`. D100-4 integrated
intake execution is tracked in
`reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`.

## Consent And Non-Sensitive-Use Notice

Before a session starts, the tester must acknowledge:

- the app is an unsigned experimental public beta,
- sensitive communication prohibited,
- not audited,
- not production-ready,
- only disposable test data may be used,
- no phone number, email, global account, invite code, safety phrase, message
  text, local path, raw log, screenshot of private room data, passphrase, key
  material, or private planning note may be included in the report.

## Sample Threshold

The current intake threshold is 3-5 representative usability reports. Passing
the validator marks only a candidate set that requires maintainer review and
stable-gate update. It does not complete the usability study or representative
evidence gate.

The selected workaround is an explicit owner policy waiver for M100-6 only:
missing representative usability reports no longer keep M100-6 in the active
queue, but stable, production, public macOS 100%, and TARGET_STANDARD 100%
claims still require real accepted usability evidence or a later explicit
claim-policy decision.

## Allowed Report Fields

- `participant_label`
- `participant_dedup_token`
- `representative_user_type`
- `app_version`
- `build_channel`
- `build_commit`
- `artifact_sha256`
- `distribution_manifest_sha256`
- `platform`
- `session_scope`
- `consent_notice_acknowledged`
- `non_sensitive_use_confirmed`
- `clean_install_checksum_status`
- `first_launch_warning_status`
- `profile_create_unlock_status`
- `invite_join_status`
- `safety_verification_status`
- `manual_envelope_exchange_status`
- `retry_cancel_recovery_status`
- `local_delete_wipe_status`
- `public_diagnostics_copy_status`
- `redacted_support_report_copy_status`
- `support_report_raw_logs_allowed`
- `support_report_private_payload_allowed`
- `support_report_key_material_allowed`
- `recovery_next_action_understood`
- `required_task_status`
- `blocker_class`
- `redacted_blocker_summary`
- `app_launch_network_stayed_false`
- `default_transport_path`
- `non_claims_confirmed`

## Forbidden Report Fields

Do not include phone numbers, email addresses, real names, account identifiers,
bridge lines, onion endpoints, invite codes, pairing payloads, envelope
payloads, endpoint payloads, safety phrases, profile names, contact
identifiers, message text, local paths, raw logs, crash dumps, screenshots of
private room data, passphrases, private keys, key material, files from `docs/`,
local app data, or private planning notes.

## Report Template

```text
participant_label=R01
participant_dedup_token=dedup_<non-reversible-32-to-64-hex-token>
representative_user_type=family|friend|personal-client|non-developer
app_version=
build_channel=
build_commit=<7-to-40-char-git-sha>
artifact_sha256=<64-char-artifact-sha256>
distribution_manifest_sha256=<64-char-manifest-sha256>
platform=macos
session_scope=first-run-invite-manual-envelope-recovery-diagnostics-delete
consent_notice_acknowledged=true|false
non_sensitive_use_confirmed=true|false
clean_install_checksum_status=pass|fail|partial|not-run
first_launch_warning_status=pass|fail|partial|not-run
profile_create_unlock_status=pass|fail|partial|not-run
invite_join_status=pass|fail|partial|not-run
safety_verification_status=pass|fail|partial|not-run
manual_envelope_exchange_status=pass|fail|partial|not-run
retry_cancel_recovery_status=pass|fail|partial|not-run
local_delete_wipe_status=pass|fail|partial|not-run
public_diagnostics_copy_status=pass|fail|partial|not-run
redacted_support_report_copy_status=pass|fail|partial|not-run
support_report_raw_logs_allowed=false
support_report_private_payload_allowed=false
support_report_key_material_allowed=false
recovery_next_action_understood=pass|fail|partial|not-run
required_task_status=pass|fail|partial
blocker_class=none-redacted|install-checksum|first-launch-warning|profile-unlock|invite-join|safety-verification|manual-envelope|retry-cancel|local-delete-wipe|diagnostics-copy|recovery-copy|unknown-redacted
redacted_blocker_summary=none-redacted
app_launch_network_stayed_false=true|false
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
```

## Current Packet Flags

- representative_usability_report_packet_available=true
- m100_6_usability_blocker_closed=true
- representative_usability_policy_waiver_authorized=true
- representative_usability_waiver_scope=active-queue-unblock-only
- representative_usability_evidence_required_for_stable_claims=true
- representative_usability_report_validator_available=true
- representative_usability_dedup_token_required=true
- representative_usability_artifact_binding_required=true
- representative_usability_redacted_support_report_required=true
- consent_non_sensitive_use_notice_ready=true
- representative_usability_sample_threshold=3-5
- representative_usability_candidate_requires_manual_review=true
- usability_study_completed=false
- representative_usability_evidence_completed=false
- production_wording_ready=false
- sensitive_communication_allowed=false
