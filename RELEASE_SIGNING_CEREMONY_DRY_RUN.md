# Release Signing Ceremony Dry-Run Record

Another Dimension Chat still does not have release signing, release keys, signed artifacts, or signed artifact verification evidence.

Record status: dry-run procedure only, not release signing evidence.

This record defines the first release signing ceremony and command sequence for the selected OpenSSL-compatible detached-signature path. It is a dry-run record for future release-candidate work, not a real key ceremony and not release approval.

## Selected Tooling

- Tooling decision: [RELEASE_SIGNING_TOOLING_DECISION.md](RELEASE_SIGNING_TOOLING_DECISION.md)
- Checksum file: `SHA256SUMS`
- Detached signature file: `SHA256SUMS.sig`
- Command family: `openssl dgst -sha256 -sign` and `openssl dgst -sha256 -verify`
- v0.1 update mode: manual download verification only; no auto-update or background update check.

## Dry-Run Ceremony Inputs

These values are placeholders for dry-run rehearsal only:

- Dry-run operator: `TODO-DRY-RUN-OPERATOR`
- Dry-run date: `TODO-DRY-RUN-DATE`
- Dry-run environment: `TODO-DRY-RUN-ENVIRONMENT`
- Disposable private key path: `TODO-DISPOSABLE-PRIVATE-KEY-PATH`
- Disposable public key path: `TODO-DISPOSABLE-PUBLIC-KEY-PATH`
- Disposable key fingerprint command: `TODO-DISPOSABLE-FINGERPRINT-COMMAND`
- Disposable key fingerprint result: `TODO-DISPOSABLE-FINGERPRINT-RESULT`

## Command Sequence

The future release ceremony must adapt this sequence to real offline release-key handling. This dry-run sequence must use disposable keys only.

```sh
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out fixture-private.pem
openssl pkey -in fixture-private.pem -pubout -out fixture-public.pem
find . -type f ! -name SHA256SUMS ! -name SHA256SUMS.sig ! -name fixture-private.pem ! -name fixture-public.pem -print0 \
  | sort -z \
  | xargs -0 shasum -a 256 > SHA256SUMS
openssl dgst -sha256 -sign fixture-private.pem -out SHA256SUMS.sig SHA256SUMS
openssl dgst -sha256 -verify fixture-public.pem -signature SHA256SUMS.sig SHA256SUMS
shasum -a 256 --check SHA256SUMS
```

## Fail-Closed Requirements

The dry-run command record must reject:

- Missing `SHA256SUMS`.
- Missing `SHA256SUMS.sig`.
- Stale checksum entries.
- Stale detached signatures.
- Missing listed artifacts.
- Extra unsigned artifacts.
- Absolute, parent-directory, blank, or whitespace-containing artifact paths.

## Promotion Requirements

Before this can become real release signing evidence, a candidate-specific record must add:

- Real offline key ceremony transcript.
- Offline private-key storage, backup, rotation, and revocation procedure.
- Public-key fingerprint publication instructions.
- Release artifact naming and checksum publication rules.
- User/reviewer verification instructions.
- Evidence that the command sequence ran against the exact release-candidate artifact set.

## Non-Claims

- This dry-run record does not create release keys.
- This dry-run record does not sign release artifacts.
- This dry-run record does not prove artifact authenticity.
- This dry-run record does not satisfy release signing.
- This dry-run record does not make Another Dimension Chat release-ready or v0.1-security-ready.
