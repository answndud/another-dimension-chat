# Operational Support, Incident, And Vulnerability Process

Status: OPS-9 source-side operational process gate closed for the current
non-claim beta posture. This is not proof of production operations, not an
external audit, not security-ready status, and not permission for sensitive
communication.

This process separates public support, private vulnerability reporting,
incident response, emergency release/update decisions, dependency vulnerability
triage, and key-compromise guidance without collecting private user data.

## Intake Channels

- Public support uses `.github/ISSUE_TEMPLATE/public_beta_support.yml`,
  `reference/PUBLIC_INTAKE_POLICY.md`, and `reference/PUBLIC_SUPPORT_TRIAGE.md`.
- Sensitive security reports use GitHub private vulnerability reporting when
  available.
- If private vulnerability reporting is unavailable, reporters open only a
  minimal `security_contact_request` public issue asking for a private contact
  path.
- Public maintainers must not ask for raw logs, paths, endpoints, invite codes,
  payloads, message text, screenshots of private room data, passphrases,
  private keys, key material, or files from `docs/`.

## Incident Classes

- Private data posted publicly.
- Suspected key compromise or leaked passphrase/key material.
- Release artifact checksum, provenance, manifest, or same-release authority
  mismatch.
- Dependency vulnerability affecting a locked Rust, Tauri, or npm dependency.
- Public claim drift toward production-ready, audited, secure messenger,
  sensitive-use, reliable external delivery, or Briar/Cwtch-equivalent wording.
- Diagnostics or support path asks for raw logs, crash dumps, local paths, or
  private payloads.
- Unexpected network-on-launch or automatic delivery behavior.

## Response Workflow

1. Classify the report as public support, private vulnerability, release
   integrity, dependency vulnerability, or claim drift.
2. Contain private data: stop public discussion, ask the reporter to remove
   sensitive material, and continue only through private vulnerability
   reporting or minimal public contact.
3. Preserve current public non-claims: `unsigned experimental public beta`,
   `sensitive communication prohibited`, `not audited`, and
   `not production-ready`.
4. Decide fix, hold, or advisory. A hold keeps the relevant claim false.
5. Apply a source fix or release advisory only through an explicit release task.
6. Re-run the focused verifier for the affected boundary.
7. Record only public-safe summaries. Do not publish raw logs or private data.

## Key Compromise Guidance

If a user reports a leaked passphrase, private key, key material, pairing
payload, endpoint payload, envelope payload, or safety phrase:

- do not ask them to paste it publicly,
- treat the existing local profile, room, and pending envelopes as compromised,
- tell them to stop using that profile for sensitive communication,
- create a new local profile and fresh invite/room only after deleting or
  isolating the old local data,
- explain that there is no cloud backup, account recovery, key recovery,
  rollback prevention, secure media deletion guarantee, or sensitive-use
  permission in this beta.

## Emergency Release And Rollback

There is no auto-update channel. Emergency distribution is manual GitHub
Release publication with matching artifact, checksum, provenance, manifest,
release notes, update-integrity note, dependency evidence, and advisory text.

Rollback means telling users to stop using a bad artifact and install a specific
same-release-authorized replacement or earlier release after verifying its
matching checksum. It does not provide automatic rollback prevention for local
encrypted data or message state.

Any release upload, release edit, DMG rebuild, asset deletion, or advisory
publication requires an explicit release task. Source-side operational readiness
does not authorize release mutation by itself.

## Dependency Vulnerability Handling

Dependency reports are triaged against:

- `Cargo.lock`,
- `apps/desktop-tauri/src-tauri/Cargo.lock`,
- `apps/desktop-tauri/package-lock.json`,
- `reference/DEPENDENCY_INVENTORY.md`,
- `reference/SUPPLY_CHAIN_BASELINE.md`.

For a relevant vulnerability, update the affected lockfile or dependency,
explain the scope in public-safe language, run focused verification for the
affected boundary, and update release/dependency evidence only in an explicit
release task. This is not an SBOM, live dependency scan, vulnerability triage
signoff, or audit claim.

## Telemetry And Crash Upload Boundary

Telemetry, crash upload, automated log collection, support bundle export, raw
diagnostic file export, and raw log export remain disabled by default. Future
collection would require a separate explicit opt-in design and review before
implementation.

## Current Gate Flags

- operational_support_incident_process_reviewed=true
- private_vulnerability_reporting_defined=true
- public_support_intake_defined=true
- incident_response_tabletop_completed=true
- support_template_review_completed=true
- emergency_release_update_path_defined=true
- release_rollback_guidance_defined=true
- dependency_vulnerability_triage_defined=true
- key_compromise_guidance_defined=true
- telemetry_default_upload_enabled=false
- crash_upload_default_enabled=false
- raw_log_request_allowed=false
- production_operational_readiness_claim_allowed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- next_required_phase=OPS-10 stable macOS v1.0 release gate
