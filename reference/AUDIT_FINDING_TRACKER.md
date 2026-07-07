# Audit Finding Tracker

Status: tracker available; no external audit findings have been received or
resolved. D100-4 intake execution is tracked in
`reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md`. This tracker is not an audit
result, reviewer signoff, public user safety signoff, or security-ready claim.

## Tracker Rules

- Tracker schema version: `audit-finding-tracker-v1`.
- Real public-safe finding IDs must use `AR-0001` style identifiers.
- Allowed severities are `critical`, `high`, `medium`, `low`, and
  `informational`.
- Allowed decisions are `fix`, `hold`, and `waive`.
- Allowed statuses are `open`, `fixed`, `held`, and `waived`.
- Do not paste sensitive exploit details, payloads, logs, endpoints, paths,
  passphrases, private keys, key material, or screenshots of private room data
  into public records.
- Public entries must be redacted summaries only.
- Sensitive findings must use private vulnerability reporting or a minimal
  public contact request.
- Each finding must have exactly one decision: fix, hold, or waive.
- Waive requires owner rationale and cannot create any production, audited,
  security-ready, sensitive-use, or reliable-delivery claim.
- Validate count and redaction drift with
  `scripts/validate_audit_finding_tracker.mjs`.

## Finding Table

| ID | Severity | Area | Public-safe summary | Decision | Status | Public wording impact |
| --- | --- | --- | --- | --- | --- | --- |
| none | none | none | No external findings recorded. | hold | no-audit-yet | Keep `not audited`, `not production-ready`, and `sensitive communication prohibited`. |

## Current Counts

- audit_finding_tracker_ready=true
- audit_finding_tracker_schema_machine_checkable=true
- audit_finding_counts_machine_checked=true
- sensitive_finding_private_route_required=true
- critical_findings_open=0
- high_findings_open=0
- medium_findings_open=0
- low_findings_open=0
- informational_findings_open=0
- findings_fixed=0
- findings_held=0
- findings_waived=0
- external_review_completed=false
- audit_completed=false
- audited_claim_allowed=false
- security_ready_claimed=false
