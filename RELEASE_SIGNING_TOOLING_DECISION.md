# Release Signing Tooling Decision

Another Dimension Chat still does not have release signing, release keys, signed artifacts, or signed artifact verification evidence.

Decision status: tooling path selected, signing implementation incomplete.

## Selected Path

The release signing tooling path is OpenSSL-compatible detached signatures over `SHA256SUMS`.

This decision chooses the verification format and command family for the first release-candidate signing implementation. It does not create a release signing key, sign release artifacts, or approve release signing readiness.

## Rationale

- The repository already has a disposable OpenSSL detached-signature fixture that exercises checksum/signature verification semantics without release keys.
- OpenSSL is available on the maintainer platform used for current local verification.
- Detached signatures over `SHA256SUMS` keep artifact hashes reviewable and allow user/reviewer verification without trusting an updater.
- The path is compatible with the current v0.1 position that has no auto-update or background update check.

## Required Implementation Before Any Signing Claim

- Generate a real offline release signing key through a recorded key ceremony.
- Record offline storage, backup, rotation, and revocation procedures for the release signing key.
- Publish the public-key fingerprint through stable release channels.
- Add release artifact naming and checksum publication rules.
- Add a checked release signing command sequence for real artifacts.
- Add a checked user/reviewer verification command sequence.
- Add fail-closed handling for missing signatures, stale checksums, stale signatures, unsigned artifacts, and extra artifacts.

## Non-Claims

- This decision does not create release keys.
- This decision does not sign release artifacts.
- This decision does not prove artifact authenticity.
- This decision does not satisfy release signing.
- This decision does not make Another Dimension Chat release-ready or v0.1-security-ready.
