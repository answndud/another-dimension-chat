# Public Threat Model

Another Dimension Chat is not a secure messenger release today.

This document is the public-safe threat model for the unsigned experimental
public beta. It describes the intended direction and the current beta boundary.
It does not claim that the current build is safe for sensitive communication.

## Product Direction

The long-term product direction is a high-risk 1:1 messenger with no central
trusted server for identity, contact discovery, message relay, push delivery, or
cloud backup.

The v0.1 unsigned public beta is narrower:

- local desktop beta testing
- invite-code room flow
- safety phrase confirmation
- local encrypted profile/session/message store exercise
- saved-room restart/resume recovery
- explicit private-route setup
- explicit onion/Tor attempt paths after manual user action
- redacted diagnostics and public release artifact verification

The public gap map for the intended Korean Briar/Cwtch-style privacy direction
is tracked in `reference/PRIVACY_MODEL_COMPARISON.md`.

## Assets

The project is designed to eventually protect:

- pairwise identity material
- pairing payloads and safety material
- message plaintext
- message envelope keys and replay state
- local profile/session/message records
- onion/transport configuration and runtime state
- diagnostic and recovery data

The current public beta must still treat all of these as sensitive. Diagnostics,
release artifacts, reports, and public docs must not include bridge lines, onion
endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases,
profile names, message text, local paths, passphrases, raw logs, or key material.

## Current Defenses

Current implementation evidence includes:

- passphrase-first local product unlock/lock path
- local encrypted profile/session/message store boundaries
- durable local session lifecycle records
- conversation/profile/full local data wipe controls
- forward-only schema version boundary
- marker-only rollback detection boundary
- fail-closed onion/Tor attempt paths
- disabled network/onion work on app launch
- public diagnostics redaction boundary
- manual GitHub Release download with SHA-256 verification
- dependency lockfile hash baseline for reviewers
- public threat-model and independent-review packet publication
- explicit public review gap with no completed-review or reviewer-signoff claim

These are implementation guardrails, not a secure messenger claim.

## Out Of Scope For This Beta

This beta does not claim:

- secure production end-to-end encryption
- production-ready or audited security
- safety for sensitive communication
- reliable real-network Tor/onion delivery
- independently verified external two-machine onion delivery
- verified bridge/censorship support beyond returned external reports
- protection against endpoint compromise
- protection against coercion
- protection against malicious contacts
- protection against global traffic correlation
- rollback prevention against restored encrypted database snapshots
- secure deletion from storage media
- dependency audit, SBOM, reproducible build, signing, notarization, or auto-update
- completed independent review, reviewer signoff, or public user safety signoff

## Non-Goals

v0.1 does not include:

- phone-number identity
- email identity
- global accounts
- searchable usernames
- centralized contact discovery
- centralized message server
- push notification service
- cloud backup
- offline mailbox
- group chat
- file transfer
- voice or video calls
- multi-device sync

## User Risk Statement

The unsigned public beta is for development and review only.

It is an unsigned experimental public beta, not notarized, not audited,
not production-ready, and sensitive communication prohibited.

External two-machine onion delivery has not yet been independently verified.
Same-machine local rehearsal can exercise development flow, but it is not
external peer evidence and must not be presented as such.

macOS may require the user to manually allow the app in Privacy & Security. The
project does not ask users to bypass macOS protections with terminal quarantine
removal commands.
