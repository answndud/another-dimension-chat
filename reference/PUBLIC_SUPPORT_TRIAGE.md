# Public Support Triage

Another Dimension Chat is still an unsigned experimental public beta,
sensitive communication prohibited, not audited, and not production-ready.
This triage guide is for public GitHub issues and release comments only. It
does not create an audit claim, production-ready claim, external onion delivery
claim, or permission to use the beta for sensitive communication.

## Intake Rule

Ask for public support diagnostics only. Do not ask for raw logs, local paths,
onion endpoints, invite codes, delivery codes, payloads, safety phrases,
profile names, message text, passphrases, private keys, key material, crash
dumps, screenshots of private room data, support bundles, files from `docs/`, or
local app data.

If the report may contain an exploitable security issue, route to GitHub
private vulnerability reporting or a minimal security contact request. Do not request
exploit details, crash dumps, screenshots, payload samples, endpoint details, or
support bundles in a public issue.

## Public Issue Dry-Run

For a public issue dry-run, maintainers may use only redacted fields such as
`recovery_next_action`, `desktop_acceptance_status`,
`high_risk_runtime_evidence_accepted`, `high_risk_runtime_failure_class`,
`engine_sidecar_status_failure_class`, and
`engine_sidecar_manual_self_test_failure_class`.

The expected dry-run classification is
`public_issue_evidence_class=support-triage-only`,
`accepted_usability_evidence=false`, `accepted_field_evidence=false`, and
`accepted_high_risk_evidence=false`. Do not treat a public issue as
representative usability evidence, production field evidence, or High-Risk
readiness evidence.

## Triage Routing Matrix

| Failure class | Maintainer next action | Public response snippet |
| --- | --- | --- |
| `checksum-install-failure` | Ask the reporter to redownload the DMG and `.sha256` from the same GitHub Release and rerun checksum verification. | "Please stop before opening the app, download the DMG and `.sha256` from the same release, and report only whether checksum verification says pass or fail." |
| `macos-manual-allow` | Point to the unsigned macOS install guide and confirm checksum passed before manual allow. | "This is expected for an unsigned experimental public beta. Use macOS Privacy & Security manual allow only after the same-release checksum passes." |
| `profile-locked` | Ask them to retry the passphrase or create a new disposable local profile; do not ask for profile names or paths. | "Please retry the passphrase or create a new local profile. There is no cloud backup, OS-keychain-only recovery, or profile-name recovery path in this beta." |
| `malformed-payload` | Ask for a fresh envelope and active pending row import; do not ask for the payload. | "Please ask the peer to export a fresh envelope and import it only into the active pending row. Do not include the envelope payload in this issue." |
| `replay-rejected` | Explain replay rejection and ask them to use a fresh envelope or review the active message number. | "Do not force the old envelope through. Use a fresh envelope or the active message number shown by the app." |
| `transport-unavailable` | Keep them on manual envelope exchange or ask them to retry only after an explicit delivery action. | "Stay on manual envelope exchange unless you deliberately enable delivery and press an explicit action. This report is not external delivery evidence." |
| `policy-blocked` | Confirm the relevant local permission or keep manual mode; do not suggest direct fallback. | "The app is fail-closed here. Enable only the relevant local permission or continue with manual envelope exchange; do not use a direct fallback." |
| `lifecycle-confirmation-required` | Ask them to read the local-only delete/wipe scope and type only the required confirmation in the app. | "Confirm only the local delete or wipe scope shown by the app. This does not provide cloud recovery, rollback prevention, or secure media deletion." |
| `desktop-state-drift` | Ask for redacted diagnostics and the selected broad area; do not ask for screenshots of private rows or message text. | "Please copy public diagnostics and describe only whether the mismatch is in row selection, retry, cancel, composer primary action, or follow-up copy." |
| `macos-gui-human-rehearsal-not-run` | Treat source install authority as checked but request a disposable GUI follow-through before tester-facing pass. | "The download/checksum/mount/copy path is checked, but a disposable GUI run is still needed for first-run, profile, invite, manual envelope, deletion, and diagnostics." |
| `unknown-redacted` | Keep the issue open under `needs-triage` and ask only for public diagnostics plus failure class. | "Please copy only the app's Public diagnostics output and the broad failure class. Do not include logs, paths, codes, payloads, or screenshots of private data." |

## Closeout States

- `needs-checksum-retry`: checksum missing or mismatch; stop before opening.
- `needs-gatekeeper-recovery`: unsigned macOS block after checksum pass.
- `needs-profile-recovery`: profile locked or disposable profile needed.
- `needs-payload-retry-cancel`: malformed, replayed, wrong pending row, retry,
  or cancel path.
- `needs-lifecycle-confirmation`: local delete/wipe confirmation not understood.
- `needs-private-security-contact`: possible vulnerability or sensitive report.
- `closed-not-planned-private-data-requested`: reporter asks to post or collect
  forbidden private data.
- `closed-non-claim-boundary`: reporter asks for production-ready, audited,
  sensitive communication, external delivery, or Briar/Cwtch-equivalent claim.

## Maintainer Guardrails

- Do not request raw logs, crash dumps, local paths, endpoints, invite codes,
  payloads, message text, passphrases, private keys, key material, or private
  screenshots.
- Do not request support bundles or crash artifacts in public issues.
- Do not ask for external two-machine success evidence as a v0.1 acceptance
  requirement.
- Do not claim that manual envelope exchange, diagnostics, or a field report
  proves reliable external onion delivery.
- Do not tell users this beta is safe for sensitive communication.
- Keep labels public-safe: `public-beta`, `needs-triage`,
  `needs-checksum-retry`, `needs-gatekeeper-recovery`,
  `needs-profile-recovery`, `needs-payload-retry-cancel`,
  `needs-lifecycle-confirmation`, and `security-contact`.
