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
- public support diagnostics copied from the app
- checksum verification result
- unsigned macOS install step reached
- failure class
- redacted next action
- desktop local-private-flow acceptance status
- desktop local-private-flow blocker summary
- whether app-launch network remained false

## Desktop Real-User Test Preparation Boundary

Tester-facing reports must use redacted public support diagnostics, failure
class, and recovery next action only.

Allowed public fields are app version, build channel, build commit, platform,
checksum result, public diagnostics, failure class, recovery next action,
desktop local-private-flow acceptance status, desktop local-private-flow
blocker summary, and whether app-launch network stayed false.

Forbidden fields include raw logs, onion endpoints, invite codes,
pairing/envelope/endpoint payloads, safety phrases, profile names, message text,
local paths, passphrases, key material, and private planning notes.

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
- passphrases
- private keys
- key material
- private planning notes
- files from `docs/`
- local app data

## Security Reports

Use GitHub private vulnerability reporting when available.

If private reporting is unavailable, open a minimal public issue that says a
security report exists, but do not include exploit details, raw logs, payloads,
keys, paths, endpoints, or private data. Ask for a private contact path.

## Public Diagnostics Boundary

The app's public support diagnostics are local-copy only. They do not upload crash
reports, telemetry, raw logs, crash dumps, support bundles, raw diagnostic
files, or local files. The intended public diagnostic payload is limited to app
status, build identity, broad failure class, recovery next action, desktop local-private-flow acceptance status/blockers/non-claims, and app-launch network boundary.
It must not include workflow state, manual network
permission state, invite codes, endpoints, payloads, safety material, profile
names, message text, paths, logs, passphrases, private keys, key material, files
from `docs/`, or local app data.

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
- `unknown-redacted`: paste only public diagnostics and choose the closest broad
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
