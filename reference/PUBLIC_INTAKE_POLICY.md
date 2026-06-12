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
