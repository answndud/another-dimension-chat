# High-Risk Runtime Evidence Schema

Status: source-level redacted runtime evidence packet for High-Risk Mode. This
is not High-Risk readiness, not reliable onion delivery evidence, not an audit
result, not production-ready status, and not permission for sensitive
communication.

Focused script:

```bash
scripts/high_risk_runtime_evidence_validate_once.sh <report.json>
```

Use `-` as the file name to validate one JSON report from stdin.

## Scope

Accepted runtime evidence must come from a real explicit runtime report created
after a user action. Local fixtures, generated examples, fabricated reports,
local-dev roundtrips, stale UI results, and reports containing private fields
must not be accepted.

The validator separates evidence acceptance from public claims. Even accepted
runtime evidence must keep:

```text
high_risk_public_claim_allowed=false
high_risk_ready_claim_allowed=false
```

## Allowed Fields

The report JSON may contain only these top-level fields:

- `schema_version`
- `evidence_source`
- `runtime_evidence_accepted`
- `runtime_evidence_present`
- `readiness_condition_set`
- `readiness_missing_conditions`
- `safety_verification_ready`
- `high_risk_transport_runtime_ready`
- `emergency_controls_ready`
- `primary_blocker`
- `failure_class`
- `explicit_user_action`
- `onion_only`
- `direct_fallback_attempted`
- `app_launch_bootstrap_attempted`
- `room_open_network_attempted`
- `endpoint_rotation_observed`
- `redacted_runtime_event_recorded`
- `clipboard_expiry_ready`
- `emergency_controls_reachable`
- `local_storage_evidence_ready`
- `release_integrity_ready`
- `local_only_evidence`
- `fabricated_evidence`
- `forbidden_fields_present`
- `endpoint_value_recorded`
- `descriptor_recorded`
- `local_path_recorded`
- `payload_recorded`
- `key_material_recorded`
- `high_risk_public_claim_allowed`
- `high_risk_ready_claim_allowed`

## Forbidden Fields

The report must fail validation if it contains any of these field names or raw
values:

- `onion_endpoint`
- `endpoint_payload`
- `descriptor`
- `descriptor_body`
- `envelope_payload`
- `message_body`
- `local_path`
- `profile_name`
- `passphrase`
- `private_key`
- `key_material`
- `raw_logs`
- `bridge_line`

## Acceptance Conditions

The validator may print `high_risk_runtime_evidence_accepted=true` only when:

- `schema_version=high-risk-runtime-evidence-v1`
- `evidence_source=runtime-report`
- `runtime_evidence_accepted=true`
- `runtime_evidence_present=true`
- `explicit_user_action=true`
- `onion_only=true`
- direct fallback, app-launch bootstrap, and room-open network are false
- endpoint rotation is observed
- redacted runtime event is recorded
- clipboard expiry and emergency controls are ready
- local-only evidence, fabricated evidence, and forbidden fields are false
- endpoint value, descriptor, local path, payload, and key material are not
  recorded
- public and ready claim allowances are false

Reports may still be valid with `runtime_evidence_accepted=false`, but they must
not print an accepted evidence result.

## Readiness Conditions

Runtime evidence acceptance is not the same as High-Risk Mode readiness. The
validator and app state share this condition set:

```text
readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
```

`readiness_missing_conditions` must be either `none` or a `#`-joined subset of
that condition set, computed from these boolean fields:

- `safety_verification_ready`
- `high_risk_transport_runtime_ready` or accepted runtime evidence
- `emergency_controls_ready` or `emergency_controls_reachable`
- `clipboard_expiry_ready`
- `local_storage_evidence_ready`
- `release_integrity_ready`

Accepted runtime evidence can still report readiness gaps such as
`safety-verification`, `local-storage-evidence`, or `release-integrity`. Those
gaps keep `high_risk_public_claim_allowed=false` and
`high_risk_ready_claim_allowed=false`.
