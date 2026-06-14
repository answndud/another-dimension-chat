# External Two-Machine Evidence Schema

Status: source-level schema for future real peer evidence. This file is not
external delivery proof, not reliable delivery evidence, not an audit result,
not production-ready status, and not permission for sensitive communication.

Focused scripts:

```bash
scripts/external_two_machine_evidence_prepare.sh
scripts/external_two_machine_evidence_validate.sh <report.json>
```

## Scope

Accepted evidence must come from two real machines or two independent runtime
environments operated as separate peers. Same-machine rehearsals, fabricated
reports, local-only dry runs, and generated examples must not be promoted to
external evidence.

## Allowed Fields

The report JSON may contain only these top-level fields:

- `schema_version`
- `app_version`
- `build_commit`
- `platform_pair`
- `checksum_status`
- `machine_a_report_present`
- `machine_b_report_present`
- `app_version_match`
- `build_commit_match`
- `checksum_match`
- `invite_created`
- `safety_compared`
- `outbound_exported`
- `inbound_imported`
- `retry_cancel_delete_verified`
- `high_risk_readiness_condition_set`
- `high_risk_readiness_condition_coverage`
- `broad_failure_class`
- `local_only_rehearsal`
- `fabricated_evidence`

## Forbidden Fields

The report must fail validation if it contains any of these field names or raw
values:

- `invite_body`
- `envelope_payload`
- `onion_endpoint`
- `local_path`
- `profile_name`
- `message_body`
- `passphrase`
- `private_key`
- `key_material`
- `raw_logs`

## Acceptance Conditions

The validator may print `external_two_machine_evidence_present=true` only when:

- both peer reports are present
- app version, build commit, and checksum match
- invite creation, safety comparison, outbound export, inbound import, and
  retry/cancel/delete recovery are complete
- broad failure class is redacted
- local-only rehearsal is false
- fabricated evidence is false
- forbidden fields are absent
- `high_risk_readiness_condition_set` matches
  `safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity`
- `high_risk_readiness_condition_coverage` is
  `safety-verification#high-risk-transport-runtime`

Even accepted evidence does not allow audited, production-ready, reliable
external delivery, or sensitive-use claims.

External reports cover only the peer field-observable conditions. They do not
prove emergency controls, clipboard expiry, local storage evidence, release
integrity, audited security, or High-Risk public readiness.

```text
high_risk_readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
field_report_high_risk_condition_coverage=none
field_report_high_risk_missing_conditions=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
next_owner_action=collect-real-redacted-two-machine-field-reports
missing_evidence_is_next_owner_action=true
external_two_machine_evidence_present=false
local_only_promoted_to_external=false
reliable_delivery_claim_allowed=false
high_risk_ready_claim_allowed=false
audited_claim_allowed=false
```
