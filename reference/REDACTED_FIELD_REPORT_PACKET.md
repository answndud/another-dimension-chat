# Redacted Field Report Packet

Status: packet template available; no production field evidence has been
accepted. This packet is not a peer success result, not reliable delivery
evidence, not an audit result, not production readiness, and not permission for
sensitive communication.

Required public labels: unsigned experimental public beta, sensitive
communication prohibited, not audited, and not production-ready.

Use this packet for real multi-platform field reports only after removing
private data. Public reports should use the app's public support diagnostics
and the broad failure classes from `reference/PUBLIC_INTAKE_POLICY.md`.

Validate redacted reports with:

```sh
node scripts/validate_redacted_field_reports.mjs docs/redacted-field-reports
```

The validator can mark a report set as an evidence candidate, but it never
opens production field evidence readiness by itself. A maintainer must still
review the source of the reports and update the stable gate explicitly.
D100-4 external evidence intake execution is tracked in
`reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`.

F100-1 is closed for active-queue progress by owner waiver only. This packet
still has no accepted production field reports and remains a candidate intake
template until real external reports are submitted and reviewed.

## Allowed Report Fields

- `app_version`
- `build_channel`
- `build_commit`
- `platform_pair`
- `checksum_result`
- `install_path_reached`
- `flow_scope`
- `network_condition_class`
- `run_count`
- `clean_install_checksum_status`
- `first_launch_warning_status`
- `profile_create_unlock_status`
- `invite_verify_status`
- `manual_envelope_round_trip_status`
- `retry_cancel_recovery_status`
- `restart_resume_status`
- `offline_online_transition_status`
- `failed_delivery_recovery_status`
- `delete_wipe_lifecycle_status`
- `public_diagnostics_copy_status`
- `required_flow_status`
- `failure_class`
- `recovery_next_action`
- `app_launch_network_stayed_false`
- `default_transport_path`
- `non_claims_confirmed`

## Forbidden Report Fields

Do not include bridge lines, onion endpoints, invite codes, pairing payloads,
envelope payloads, endpoint payloads, safety phrases, profile names, contact
identifiers, message text, local paths, raw logs, crash dumps, screenshots of
private room data, passphrases, private keys, key material, files from `docs/`,
local app data, or private planning notes.

## Report Template

```text
app_version=
build_channel=
build_commit=
platform_pair=macos-to-macos|macos-to-windows|windows-to-windows|android-to-ios
checksum_result=pass|fail|not-run
install_path_reached=download|checksum|mount|copy|manual-allow|first-launch
flow_scope=same-machine|local-two-instance|two-machine-same-network|two-machine-different-network
network_condition_class=offline|same-lan|different-networks|transient-failure|not-applicable
run_count=
clean_install_checksum_status=pass|fail|partial|not-run
first_launch_warning_status=pass|fail|partial|not-run
profile_create_unlock_status=pass|fail|partial|not-run
invite_verify_status=pass|fail|partial|not-run
manual_envelope_round_trip_status=pass|fail|partial|not-run
retry_cancel_recovery_status=pass|fail|partial|not-run
restart_resume_status=pass|fail|partial|not-run
offline_online_transition_status=pass|fail|partial|not-run
failed_delivery_recovery_status=pass|fail|partial|not-run
delete_wipe_lifecycle_status=pass|fail|partial|not-run
public_diagnostics_copy_status=pass|fail|partial|not-run
required_flow_status=pass|fail|partial
failure_class=checksum-install-failure|macos-manual-allow|profile-locked|malformed-payload|replay-rejected|transport-unavailable|policy-blocked|lifecycle-confirmation-required|desktop-state-drift|unknown-redacted
recovery_next_action=
app_launch_network_stayed_false=true|false
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
```

## Current Evidence Ledger

| ID | Scope | Public-safe summary | Decision | Claim impact |
| --- | --- | --- | --- | --- |
| none | none | No accepted production field report recorded. | hold | Keep external delivery, production-ready, security-ready, audited, and sensitive-use claims false. |

## Current Packet Flags

- redacted_field_report_packet_available=true
- f100_1_field_evidence_blocker_closed=true
- field_evidence_policy_waiver_authorized=true
- real_external_two_machine_field_evidence_required_for_claims=true
- required_platform_pair_coverage_required_for_claims=true
- accepted_redacted_field_reports_required_for_claims=true
- field_evidence_execution_claim_allowed=false
- redacted_field_report_validator_available=true
- d100_4_external_evidence_intake_execution_reviewed=true
- external_evidence_intake_operator_ready=true
- field_report_validator_ready=true
- accepted_production_field_reports=0
- required_platform_pairs_covered=false
- local_two_instance_rehearsal_completed=false
- macos_two_machine_real_user_flow_repeated=false
- different_networks_covered=false
- restart_resume_covered=false
- offline_online_transition_covered=false
- failed_delivery_recovery_documented=false
- repeated_redacted_field_reports_available=false
- raw_logs_or_private_payloads_allowed=false
- fabricated_peer_evidence_allowed=false
- external_delivery_success_claim_allowed=false
- reliable_external_delivery_claim_allowed=false
- production_field_evidence_ready=false
- sensitive_communication_allowed=false
