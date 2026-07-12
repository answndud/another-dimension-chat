# Public Intake Policy

Another Dimension Chat is not a secure messenger release today.

This policy defines what can be posted in public GitHub issues, discussions,
release comments, and support requests for the unsigned experimental public
beta.

## Allowed Public Intake

Public reports may include only:

- app version
- build channel
- build commit
- platform
- app status
- public support diagnostics copied from the app
- checksum verification result
- release class readiness
- unsigned macOS install step reached
- failure class
- redacted next action
- desktop local-private-flow acceptance status
- desktop local-private-flow blocker summary
- whether app-launch network remained false

Canonical app field names:

```text
allowed_public_intake_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness#high-risk-runtime-evidence-source#high-risk-runtime-evidence-accepted#high-risk-runtime-primary-blocker#high-risk-runtime-failure-class#engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class#engine-sidecar-redacted-runtime-status
forbidden_public_intake_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles
public_intake_policy_alignment=app-diagnostics#github-issue-template#reference-policy
```

## Public Issue Dry-Run Contract

A public issue dry-run may include only the canonical allowed fields above. The
support-safe fixture for a sidecar or High-Risk runtime issue must keep these
fields redacted and non-evidentiary:

```text
recovery_next_action=stay-on-manual-envelope
desktop_acceptance_status=not-claimed
high_risk_runtime_evidence_source=absent
high_risk_runtime_evidence_accepted=false
high_risk_runtime_primary_blocker=high-risk-transport-runtime
high_risk_runtime_failure_class=runtime-evidence-missing
engine_sidecar_status_failure_class=sidecar-unavailable
engine_sidecar_manual_self_test_failure_class=manual-self-test-not-run
engine_sidecar_redacted_runtime_status=redacted
public_issue_evidence_class=support-triage-only
accepted_usability_evidence=false
accepted_field_evidence=false
accepted_high_risk_evidence=false
```

Public issues are support routing only. They are not representative usability
evidence, not production field evidence, and not High-Risk readiness evidence.

## Desktop Real-User Test Preparation Boundary

Tester-facing reports must use redacted public support diagnostics, failure
class, and recovery next action only.

Allowed public fields are app status, app version, build channel, build commit,
platform, checksum result, public diagnostics, failure class, recovery next
action, desktop local-private-flow acceptance status, desktop local-private-flow
blocker summary, whether app-launch network stayed false, release class
readiness, redacted High-Risk runtime evidence source/accepted/blocker/failure
class, and redacted engine sidecar status/self-test failure classes.

Forbidden fields include raw logs, crash dumps, screenshots, onion endpoints,
invite codes, pairing/envelope/endpoint payloads, safety phrases, profile names,
message text, local paths, passphrases, private keys, key material, private
planning notes, and support bundles.

Hold criteria are missing redacted diagnostics, forbidden private data, network
before explicit action, or checksum mismatch.

Abort criteria are exposed secrets, requests for raw logs, requests for an
external success claim, or requests to use the beta for sensitive communication.
There is no external two-machine success claim, no production readiness claim,
and sensitive communication prohibited remains in force. This remains an
unsigned experimental public beta, not audited, and not production-ready.

## Forbidden Public Intake

Do not post:

- bridge lines
- onion endpoints
- invite codes
- pairing payloads
- endpoint payloads
- envelope payloads
- safety phrases
- profile names
- contact identifiers
- message text
- local paths
- raw logs
- crash dumps
- screenshots that show private room data
- support bundles
- passphrases
- private keys
- key material
- private planning notes
- files from `docs/`
- local app data

## Security Reports

Use GitHub private vulnerability reporting when available.

If private reporting is unavailable, open a minimal public issue that says a
security report exists, but do not include exploit details, raw logs, crash
dumps, screenshots, support bundles, payloads, keys, paths, endpoints, or
private data. Ask only for a private contact path.

## Public Diagnostics Boundary

The app's public support diagnostics are local-copy only. They do not upload crash
reports, telemetry, raw logs, crash dumps, support bundles, raw diagnostic
files, or local files. The intended public diagnostic payload is limited to app
status, build identity, checksum result, broad failure class, recovery next action, desktop local-private-flow acceptance status/blockers/non-claims, app-launch network boundary, and release class readiness.
It must not include workflow state, manual network
permission state, invite codes, endpoints, payloads, safety material, profile
names, message text, paths, logs, crash dumps, screenshots, passphrases, private
keys, key material, support bundles, files from `docs/`, or local app data.

## Public Recovery Vocabulary

Public reports should use broad failure classes and the next recovery action,
not raw errors or local paths:

- `checksum-install-failure`: stop, verify the same-release `.sha256`, then
  follow `README.md` or `INSTALL_UNSIGNED_MACOS.md`.
- `macos-manual-allow`: checksum passed, then use the normal macOS Privacy &
  Security manual allow path for the unsigned app.
- `profile-locked`: retry the passphrase or create a new local profile; no
  cloud, backup, or OS-keychain-only recovery is available.
- `malformed-payload`: ask the peer to export a fresh envelope and import only
  into the active pending row.
- `replay-rejected`: do not force the message through; import a fresh envelope
  or review the active message number.
- `transport-unavailable`: stay on manual envelope exchange or retry only after
  explicit user delivery action.
- `policy-blocked`: enable the relevant local permission or keep using manual
  envelope exchange.
- `lifecycle-confirmation-required`: confirm the local-only delete/wipe scope
  before continuing.
- `desktop-state-drift`: copy public diagnostics and report only whether row
  selection, retry, cancel, composer primary action, or follow-up copy drifted.
- `macos-gui-human-rehearsal-not-run`: source install authority is checked, but
  disposable GUI first-run/profile/invite/manual-flow/delete/diagnostics still
  needs a human follow-through.
- `unknown-redacted`: copy only public diagnostics and choose the closest broad
  area without logs, paths, codes, payloads, or screenshots of private data.

## Maintainer Triage

Maintainers should use `reference/PUBLIC_SUPPORT_TRIAGE.md` for the public
support routing matrix and response snippets. Public issues should resolve into
checksum retry, Gatekeeper recovery, profile recovery, payload retry/cancel,
lifecycle confirmation, redacted diagnostics, or private security contact
routing. Maintainers must not ask for raw logs, local paths, onion endpoints,
invite codes, payloads, message text, passphrases, private keys, key material,
private screenshots, external delivery proof, production-ready proof, audited
status, or sensitive-use reports.

## Non-Claims

This intake policy does not claim:

- secure production messaging
- audited security
- sensitive communication safety
- production-ready E2EE
- reliable real-network onion delivery
- completed external two-machine onion evidence
- completed independent review
- safe publication of private logs or crash dumps
- automated log collection, support bundle export, raw diagnostic file export,
  or crash dump export
