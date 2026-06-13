# External Review Signoff Schema

Status: source-ready schema for future named external review signoff intake.
This is not an external review result, not an audit result, not reviewer
signoff already received, not production-ready, and not permission for
sensitive communication.

Real reviewer evidence must be stored outside the public source tree, normally
under ignored private evidence storage such as `docs/external-review-signoff/`.
The public repository provides only the schema and validator.

## Required JSON Shape

Each file uses `schema_version=external-review-signoff-v1` and records:

- `review_id` as `XR-YYYY-NNNN`,
- `review_type` as `independent-review`, `security-audit`, or
  `limited-security-review`,
- named reviewer identity, affiliation, and contact,
- `reviewed_commit` bound to a source commit,
- `completed_at` as a UTC date,
- `public_safe_report_sha256` for the redacted report artifact,
- reviewed public-safe inputs,
- finding counts and triage completion,
- explicit non-claim signoff fields,
- evidence-boundary booleans proving the record is not synthetic/local-only and
  does not contain private material.

The validator rejects local paths, invite or envelope payloads, onion endpoints,
bridge lines, raw logs, crash dumps, passphrases, private keys, key material,
placeholder reviewer names, and any production/audit/sensitive-use claim flag
set to true.

## Current Gate Flags

- external_review_signoff_schema_available=true
- external_review_signoff_validator_available=true
- external_review_signoff_private_input_path=docs/external-review-signoff
- external_review_signoff_candidate_requires_owner_claim_decision=true
- named_external_review_required_for_claims=true
- external_review_completed=false
- audit_completed=false
- reviewer_signoff_claimed=false
- audited_claim_allowed=false
- security_ready_claimed=false
- production_ready_claim_allowed=false
- sensitive_communication_allowed=false
