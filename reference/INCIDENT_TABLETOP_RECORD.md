# Incident Tabletop Record

Status: OPS-9 tabletop and support template review completed for source-side
operational readiness input. This is not evidence of a real incident response,
not an external audit, not production operations readiness, and not permission
for sensitive communication.

## Tabletop Scenarios

| Scenario | Expected maintainer response | Decision |
| --- | --- | --- |
| Public issue contains an invite code, endpoint, payload, message text, path, or key material. | Stop public triage, ask the reporter to remove the private data, route to private vulnerability reporting or minimal private contact, and do not quote the secret. | pass |
| DMG checksum or provenance mismatch is reported. | Tell users to stop before opening the app, verify same-release authority, hold the release path, and publish advisory/replacement only through an explicit release task. | pass |
| Dependency vulnerability affects a locked dependency. | Classify affected lockfile and package scope, patch or hold, run focused verification, and avoid SBOM/audit/security-ready claims. | pass |
| User reports leaked passphrase, private key, key material, or safety phrase. | Treat old profile/room/pending envelopes as compromised, avoid public secret collection, tell user there is no recovery guarantee, and require fresh local profile/room after local cleanup. | pass |
| README, SECURITY, release body, app UI, or support response drifts toward production-ready, audited, secure messenger, sensitive-use, reliable external delivery, or Briar/Cwtch-equivalent wording. | Revert wording or hold release, keep beta non-claims, and run the affected claim verifier. | pass |
| Public support asks for raw logs, crash dumps, local paths, endpoints, payloads, or screenshots of private room data. | Replace with redacted public diagnostics request and update intake copy or templates if needed. | pass |

## Support Template Review

Reviewed source inputs:

- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/public_beta_support.yml`
- `.github/ISSUE_TEMPLATE/security_contact_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `reference/PUBLIC_INTAKE_POLICY.md`
- `reference/PUBLIC_SUPPORT_TRIAGE.md`
- `SECURITY.md`

The reviewed templates route public support to redacted diagnostics, route
sensitive reports to private vulnerability reporting or minimal private contact,
and forbid raw logs, paths, endpoints, invite codes, payloads, message text,
passphrases, private keys, key material, screenshots of private room data,
files from `docs/`, and local app data.

## Current Tabletop Flags

- o100_1_operations_blocker_closed=true
- operations_source_gate_closed=true
- production_operations_evidence_required_for_claims=true
- real_incident_response_execution_required_for_claims=true
- incident_tabletop_completed=true
- support_template_review_completed=true
- public_private_intake_split_verified=true
- private_data_publication_response_defined=true
- release_integrity_incident_response_defined=true
- dependency_vulnerability_response_defined=true
- key_compromise_response_defined=true
- claim_drift_response_defined=true
- telemetry_default_upload_enabled=false
- crash_upload_default_enabled=false
- raw_log_request_allowed=false
- production_operational_readiness_claim_allowed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
