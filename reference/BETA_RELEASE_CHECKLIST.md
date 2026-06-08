# Beta Release Checklist

This checklist is for internal field-test beta handoff only. It is not a secure-release checklist and does not create a security claim.

## Scope

Allowed beta scope:

- Two-profile invite-code room creation and join.
- Safety phrase comparison and confirmation.
- Local encrypted profile/session/message store exercise.
- Saved-room restart/resume recovery.
- Manual private-route exchange.
- Explicit receive start/stop.
- Failed-send retry and cancel recovery.
- Redacted field-test report copy/compare.
- Explicit onion/Tor attempt paths after manual network permission.

Out of scope:

- Sensitive real communication.
- Public secure messenger release.
- Phone/email/global account/contact discovery.
- Central message server, push notification, or cloud backup.
- Signed, notarized, auto-updating, reproducible, audited, or externally reviewed release claims.

## Pre-Handoff Checks

Run from the repository root unless stated otherwise:

```bash
scripts/verify_all.sh
cd apps/desktop-tauri
npm run test:state
npm run test:local-peers
```

For bridge-capable field testing, run only the targeted bridge/onion checks required for the handoff. Do not run network attempts unless the tester run explicitly needs them.

## Build Commands

```bash
cd apps/desktop-tauri
npm run tauri:build
npm run tauri:build:beta-onion
npm run tauri:build:beta-onion-bridge
```

Use exactly one build channel per artifact. Record the command used.

## Artifact Record

For each local artifact, record:

- Product name and version.
- Build channel.
- Git commit.
- Build date.
- Platform and architecture.
- Artifact path.
- SHA-256.
- Checks completed.
- Known limitations.

Suggested SHA-256 command on macOS:

```bash
shasum -a 256 /path/to/artifact
```

## Handoff Rules

- Store local handoff artifacts under `apps/desktop-tauri/beta-artifacts/`.
- Do not commit `beta-artifacts/`.
- Do not include `docs/`, local app data, build caches, bridge lines, onion endpoints, plaintext messages, passphrases, private keys, raw logs, `target/`, `dist/`, or `node_modules/`.
- Tester notes must say the beta is not secure and must not be used for sensitive communication.
- Field-test notes should record whether bootstrap, onion endpoint launch, route exchange, send, receive, retry, and cancel complete or fail closed.

