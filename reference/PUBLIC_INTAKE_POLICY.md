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
- whether app-launch network remained false

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
