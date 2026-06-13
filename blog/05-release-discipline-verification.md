# Release Discipline And Verification

For a security-adjacent project, documentation is part of the engineering
surface. The public copy can create user risk if it implies guarantees that the
implementation and evidence do not support.

## Release Authority

The current public artifact is an unsigned macOS Apple Silicon beta DMG. The
release authority for that DMG is the matching asset set attached to the same
GitHub Release. The branch source tree can change after a release, so a
downloaded DMG should not be verified against branch files or GitHub source
archives.

Relevant references:

- [UNSIGNED_PUBLIC_BETA_INSTALL.md](../reference/UNSIGNED_PUBLIC_BETA_INSTALL.md)
- [UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md](../reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md)
- [PRODUCTION_READINESS_CLAIM_GATE.md](../reference/PRODUCTION_READINESS_CLAIM_GATE.md)

## Public Support Redaction

Public issues should contain only redacted support data: broad failure class,
checksum result, platform, app version/build channel, recovery next action, and
diagnostics copied from the app.

They must not contain raw logs, local paths, invite codes, endpoints, payloads,
message text, passphrases, private keys, key material, private screenshots, or
private planning notes.

Relevant references:

- [SUPPORT.md](../SUPPORT.md)
- [PUBLIC_INTAKE_POLICY.md](../reference/PUBLIC_INTAKE_POLICY.md)
- [PUBLIC_SUPPORT_TRIAGE.md](../reference/PUBLIC_SUPPORT_TRIAGE.md)

## Verification

The lightweight verification entrypoint is:

```bash
scripts/verify_all.sh
```

It checks formatting, focused core tests, focused Tauri tests, default boundary
checks, frontend state tests, and frontend build.

The heavier local engineering pass is:

```bash
scripts/verify_full.sh
```

It includes the lightweight pass plus browser preview peer tests, local peer
flow tests, development CLI smoke, workspace tests, dev-insecure tests, and
clippy.

These scripts are important engineering evidence. They are not an audit,
production readiness proof, or permission to use the app for sensitive
communication.

## Interview Summary

The release work is deliberately conservative. The public beta tells users what
they can test, how to verify the DMG checksum, what not to post publicly, and
what claims are still false. The verification scripts keep implementation
boundaries from drifting, but they do not turn the prototype into an audited
secure messenger.
