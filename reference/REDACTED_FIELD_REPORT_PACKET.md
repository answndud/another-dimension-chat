# Redacted Field Report Packet

Status: packet template available; no production field evidence has been
accepted. This packet is not a peer success result, not reliable delivery
evidence, not an audit result, not production readiness, and not permission for
sensitive communication.

Use this packet for real macOS field reports only after removing private data.
Public reports should use the app's public support diagnostics and the broad
failure classes from `reference/PUBLIC_INTAKE_POLICY.md`.

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
platform_pair=macos-to-macos
checksum_result=pass|fail|not-run
install_path_reached=download|checksum|mount|copy|manual-allow|first-launch
flow_scope=same-machine|local-two-instance|two-machine-same-network|two-machine-different-network
network_condition_class=offline|same-lan|different-networks|transient-failure|not-applicable
run_count=
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
- accepted_production_field_reports=0
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
