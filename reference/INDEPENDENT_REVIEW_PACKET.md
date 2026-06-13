# Independent Review Packet

Another Dimension Chat is not a secure messenger release today.

This packet gives an independent reviewer a public-safe starting point. It is
not an external review result and does not imply approval.

## Review Gap Boundary

The unsigned public beta release packet must publish this gap explicitly:

- `independent_review_complete=false`
- `public_review_gap_published=true`
- `reviewer_signoff_claimed=false`
- `public_user_safety_signoff_claimed=false`
- `review_packet_inputs_public_safe=true`
- `known_review_gaps_published=true`
- `public_safe_review_commands_required=true`
- `private_reporting_boundary=private-vulnerability-reporting-or-minimal-public-contact-request`
- `minimal_public_contact_request_allowed=true`
- `fabricated_review_or_peer_evidence_allowed=false`

These fields mean the project has prepared review inputs only. They do not mean
the project has passed review.

## Private Reporting Boundary

Security findings with exploit details, endpoint material, logs, payloads,
paths, keys, screenshots of private room data, or other sensitive material must
use private vulnerability reporting when available. If private reporting is not
available, the only allowed public report is a minimal contact request that says
a security report exists and asks for a private channel.

## Review Scope

Review the unsigned experimental public beta boundary:

- public release artifact contents
- unsigned macOS install guidance
- checksum/provenance/manual update integrity model
- public support diagnostics redaction boundary
- crash/log redaction and no-upload/no-telemetry boundary
- public issue and security intake redaction boundary
- repository governance and release guardrail boundary
- passphrase-first local unlock/lock boundary
- durable local session lifecycle boundary
- local data lifecycle and migration boundary
- practical transport split between local manual encrypted envelope exchange and
  advanced fail-closed onion/Tor attempts
- onion/Tor attempt non-readiness and external-evidence gap
- public non-claims in README and SECURITY

## Public Claims Allowed Today

- unsigned experimental public beta
- local desktop beta candidate
- manual GitHub Release download
- user-verified SHA-256 checksum
- public support diagnostics export is redacted by design
- public support diagnostics are local-copy only and limited to app status,
  build identity, broad failure class, recovery next action, desktop local-private-flow acceptance status/blockers/non-claims, and app-launch network boundary
- public support diagnostics do not provide crash upload, telemetry, raw log
  export, workflow-state export, support bundle export, or raw diagnostic file
  export
- public support intake uses redacted diagnostics or minimal contact requests
  instead of raw logs, payloads, endpoints, paths, keys, or private data
- repository governance keeps main-branch changes aligned with unsigned beta
  non-claims, no-central-trusted-server scope, redaction, and no fabricated
  external evidence
- no automatic network/onion work on app launch
- passphrase-first local unlock path exists
- local data lifecycle controls exist
- local backup-exclusion verification and forward-only migration boundaries
  exist, while cloud backup/sync and backup recovery are non-claims
- current and future public artifacts must use manual GitHub Release download,
  same-release checksum, public provenance, manifest, update-integrity notes,
  dependency evidence, and no-auto-update semantics
- dependency lockfile hash baseline exists

## Public Claims Not Allowed Today

- secure messenger
- production-ready
- safe for sensitive communication
- audited
- notarized or signed release
- reproducible build
- auto-update integrity
- dependency audit or SBOM completion
- reliable real-network onion delivery
- independently verified external two-machine onion delivery
- audited bridge/censorship support
- cloud backup/sync or backup recovery
- destructive migration
- rollback prevention
- secure deletion from storage media

## Evidence Map

- `README.md`: project status, public release files, current non-claims.
- `SECURITY.md`: public security policy, non-claims, unsigned beta boundary.
- `reference/INDEPENDENT_REVIEW_PACKET.md`: this public-safe entrypoint and
  evidence map for external reviewer orientation.
- `reference/BETA_RELEASE_CHECKLIST.md`: release upload checklist.
- `reference/UNSIGNED_PUBLIC_BETA_INSTALL.md`: user install and checksum steps.
- `reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md`: release notes template.
- `reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md`: copy-ready GitHub
  Release body with required non-claims.
- `reference/UPDATE_INTEGRITY.md`: manual update integrity boundary.
- `reference/SUPPLY_CHAIN_BASELINE.md`: dependency lockfile hash baseline.
- `reference/PRIVACY_MODEL_COMPARISON.md`: LINDDUN/Briar/Cwtch-style target
  comparison and current public beta gap map.
- `reference/PUBLIC_THREAT_MODEL.md`: public threat model and non-goals.
- `reference/PUBLIC_INTAKE_POLICY.md`: public issue, release comment, and
  security contact redaction rules.
- `reference/REPOSITORY_GOVERNANCE.md`: maintainer-driven main workflow,
  release guardrails, redaction guardrails, and explicit governance non-goals.
- `reference/COMPONENT_BOUNDARIES.md`: component replacement and readiness map.
- `reference/PRODUCTION_READINESS_CLAIM_GATE.md`: production-readiness,
  external-review, audit, field-evidence, and stable-release claim gate.
- `reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md`: 1:1 protocol/session
  state machine, replay/retry/cancel/delete semantics, and unresolved
  production E2EE review questions.
- `reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md`: RB-1 supported
  local/manual 1:1 envelope message-content E2EE claim boundary, while broad
  production E2EE, audited, secure messenger, sensitive-use, automatic network
  messaging, remote acknowledgement, and external delivery claims remain false.
- `reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md`: passphrase-first unlock,
  encrypted local profile/session/message store lifecycle, destructive local
  actions, backup/migration boundaries, marker-only rollback detection, and
  unresolved production key-management review questions.
- `reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md`: local manual encrypted
  envelope default path, separate explicit fail-closed onion/Tor advanced path,
  no-central-server boundaries, evidence order, and unresolved reliable
  external delivery review questions.
- `reference/MACOS_PRODUCTION_UX_ONBOARDING.md`: first-run checklist,
  invite/verify/message flow, manual envelope guide, recovery guide, redacted
  diagnostics, destructive local lifecycle confirmations, advanced transport UX
  boundary, and remaining production wording blockers.
- `reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md`: current unsigned beta
  distribution state, signing/notarization holds, same-release
  checksum/provenance authority, update-channel blockers, and remaining stable
  signed distribution blockers.
- `reference/EXTERNAL_REVIEW_AUDIT_READINESS.md`: public-safe reviewer packet
  scope, severity definitions, fix/hold/waive triage process, and current
  no-audit/no-signoff flags.
- `reference/AUDIT_FINDING_TRACKER.md`: public-safe finding tracker template
  with current zero-finding/no-audit status and required non-claims.
- `reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md`: field evidence ladder,
  required macOS flow coverage, report data boundary, reliability decision
  rule, and current no-external-success/no-reliability flags.
- `reference/REDACTED_FIELD_REPORT_PACKET.md`: public-safe field report
  template, forbidden private fields, current empty evidence ledger, and
  required non-claims.
- `reference/PUBLIC_SUPPORT_TRIAGE.md`: public-safe maintainer routing matrix
  for redacted support reports and private security-contact routing.
- `reference/TRANSPORT_EXPERIMENT_RUNBOOK.md`: public-safe manual network
  experiment boundary and coarse transport status vocabulary.
- `reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md`: public support,
  private vulnerability, incident response, key-compromise, emergency
  release/update, and dependency vulnerability process boundary.
- `reference/INCIDENT_TABLETOP_RECORD.md`: public-safe tabletop record and
  support template review for OPS-9 operational readiness input.
- `reference/STABLE_MACOS_V1_RELEASE_GATE.md`: stable macOS v1.0 release gate
  hold decision, stable blocker ledger, public wording decision, and release
  mutation boundary.
- `reference/STABLE_RELEASE_HOLD_REPORT.md`: public-safe hold report and
  allowed maintainer wording for the current non-claim beta state.
- `reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md`: RB-0 release authority,
  local credential observations, scope-down decision, and external-dependency
  execution paths.
- Generated release provenance: records the public threat model, independent
  review packet, incomplete-review flag, published-review-gap flag, and
  no-reviewer-signoff/no-public-user-safety-signoff flags.
- Generated release provenance and manifest: record the public diagnostics
  boundary, crash-upload-disabled flag, telemetry-disabled flag, raw-log-export
  disabled flag, workflow-state-export-disabled boundary, and forbidden
  diagnostics field categories.
- Generated release provenance and manifest: record public-safe review input,
  known-review-gap, public-safe command, private-reporting boundary, minimal
  public contact request, and fabricated-review/peer-evidence-forbidden flags.
- Generated release provenance and manifest: record the backup/migration
  boundary, cloud-backup/sync-disabled flag, backup-recovery non-claim,
  forward-only schema migration requirement, destructive-migration block,
  marker-only rollback detection, rollback-prevention non-claim, and
  secure-media-deletion non-claim.
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md`: private final gate checklist; do not publish.

## Suggested Public-Safe Review Commands

These commands avoid launching the app, starting network/onion work, or reading
private planning notes:

```bash
bash scripts/public_release_readiness_preflight.sh
```

Optional supplemental checks:

```bash
bash -n scripts/prepare_unsigned_public_beta_release.sh
shasum -a 256 Cargo.lock apps/desktop-tauri/src-tauri/Cargo.lock apps/desktop-tauri/package-lock.json
rg -n "secure messenger|production-ready|sensitive communication|not audited|not notarized|auto-update|backup recovery|rollback prevention|secure deletion" README.md SECURITY.md reference apps/desktop-tauri/README.md
git diff --check
```

If reviewing a generated release upload set, run from that folder:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

## Known Review Gaps

- No external security review has been completed.
- The public release packet publishes the review gap but does not close it.
- No reviewer signoff or public user safety signoff exists.
- External onion delivery is outside the v0.1 public product claim.
- Same-machine rehearsal is development evidence only. No peer report is
  expected or required for this v0.1 claim, and no external delivery claim is
  made.
- Fabricated local peer reports or synthetic external review evidence are not
  allowed as substitutes for real independent review or external peer evidence.
- No SBOM is published.
- No reproducible-build proof exists.
- No signing, notarization, or auto-update channel exists.
- Final security-ready claim gate has not passed.

## Reviewer Output Requested

The reviewer should report:

- any public wording that overclaims security readiness
- any GitHub Release body wording that omits required non-claims
- any release artifact that omits checksum/provenance/update-integrity evidence
- any diagnostic/reporting path that could expose sensitive material
- any crash/log path that uploads, copies, or publishes raw logs, paths,
  endpoints, passphrases, private keys, key material, or private planning notes
- any issue template or support path that asks users to paste raw logs, payloads,
  endpoints, paths, passphrases, private keys, key material, crash dumps, or
  screenshots of private room data
- any command path that starts network/onion work without explicit user action
- any missing non-claim around audit, production readiness, onion reliability,
  cloud backup/sync, backup recovery, rollback prevention, secure deletion, or
  supply-chain review
