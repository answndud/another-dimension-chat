# Contributing

Another Dimension Chat is not a secure messenger release today.

This repository currently uses a maintainer-driven main-branch workflow. Public
contributions are welcome as issues or small patches, but every public change
must preserve the daemon-owned security boundary and the
no-central-trusted-server product direction.

## Scope Boundaries

Allowed v0.1 direction:

- no central trusted account server
- no phone-number or email identity
- no searchable username directory
- no centralized contact discovery
- no central message server
- no push notification service
- no cloud backup
- explicit user action before relay trust changes
- authenticated browser UI + local OpenMLS daemon + user-owned relay

Do not add telemetry, crash upload, cloud reporting, unverified auto-update, centralized account
infrastructure, centralized contact discovery, central message relay, push
notification, or cloud backup paths unless the project direction is explicitly
changed in public documentation first.

## Public Non-Claims

Do not describe the current beta as:

- secure messenger
- production-ready
- audited
- safe for sensitive communication
- anonymous or censorship-resistant delivery
- supply-chain audited
- signed, notarized, auto-updating, or reproducible

## Redaction Rules

Public issues, pull requests, logs, screenshots, release notes, and docs must
not include:

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

Use `SECURITY.md` for public support redaction rules and sensitive security
reports.

## License

By contributing, you agree that your contribution is licensed under the
repository's [MIT License](LICENSE).

## Release Discipline

The current product's lightweight verification is daemon/web/relay focused:

```bash
scripts/verify_light.sh
```

`scripts/verify_light.sh` is the canonical current-product entrypoint.
`scripts/verify_full.sh --release` adds daemon tests, formatting, and lints. It
is intentionally release-only; do not run it in the daily loop. Historical
Tauri, native CLI/engine, browser Olm, and onion prototypes were removed from
the workspace; git history is the archive.

Older release packaging or evidence-generation scripts referenced in historical
documents are not part of the current development baseline unless they are
restored deliberately in a separate task.

Every public release update must keep:

- `high-risk-disabled` mode (always off)
- `sensitive communication prohibited until approval`
- `not audited`
- `not production-ready`
- anonymity and censorship-resistance non-claims
- public diagnostics redaction boundary
- public intake redaction boundary
- no unverified signing/update claim

## Development Notes

- Keep private planning notes in ignored `docs/`.
- Do not fabricate peer reports or external evidence.
- Do not add broad verification loops as release evidence.
- Prefer small public changes that preserve existing boundaries.
- Keep `README.md` and `SECURITY.md` aligned when public claims or release
  files change.
