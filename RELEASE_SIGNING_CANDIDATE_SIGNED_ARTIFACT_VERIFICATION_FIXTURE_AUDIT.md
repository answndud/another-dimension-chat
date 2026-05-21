# Release Signing Candidate Signed Artifact Verification Fixture Coverage Audit

Audit status: signed-artifact verification fixture coverage audit only, not signed artifact verification evidence.

This audit records what the disposable signed-artifact verification fixture covers today. It is a coverage map for `scripts/verify_release_signing_candidate_signed_artifact_verification_fixture.sh`, not release-candidate evidence, signed artifact verification, artifact authenticity proof, release signing approval, or release approval.

## Covered Fixture Behavior

The fixture builds a disposable candidate evidence package and checks that:

- `CANDIDATE_EVIDENCE_INDEX` exists and records the fixture candidate identity.
- `ARTIFACT_MANIFEST` exists and is non-empty.
- `SHA256SUMS` exists and is non-empty.
- `SHA256SUMS.sig` exists and is non-empty.
- `records/key-ceremony.record` records the fixture `public_key_fingerprint`.
- `records/signed-artifact.record` records `candidate_commit`, `release_tag`, `artifact_manifest`, `artifact_manifest_sha256`, `sha256sums_path`, `sha256sums_sha256`, `sha256sums_sig_path`, `sha256sums_sig_sha256`, `public_key_fingerprint`, `key_ceremony_record`, `signature_verification_command`, `signature_verification_transcript`, `artifact_hash_verification_command`, `artifact_hash_verification_transcript`, `failure_transcript`, `reviewer`, `review_timestamp`, `classification`, and `blocker_status`.
- all disposable digests match their files.
- the signed-artifact record binds to the same `candidate_commit`, `release_tag`, `artifact_manifest`, and `artifact_manifest_sha256` as the index.
- the signed-artifact record binds to the same `public_key_fingerprint` as the key ceremony record.
- the signed-artifact record remains classified as `fixture-filled-not-release-evidence`.

The fixture rejects:

- missing signed-artifact verification record
- missing `SHA256SUMS`
- missing `SHA256SUMS.sig`
- missing public key fingerprint
- mismatched record candidate commit
- mismatched record release tag
- mismatched record artifact manifest
- mismatched record artifact manifest digest
- stale `SHA256SUMS` digest
- stale `SHA256SUMS.sig` digest
- key ceremony fingerprint mismatch
- missing signature verification transcript
- missing artifact hash verification transcript
- missing failure transcript
- template-only evidence
- placeholder evidence
- empty blocker status

## Known Limits

- This audit does not sign release artifacts.
- This audit does not checksum real release artifacts.
- This audit does not compare real release artifact hashes against `SHA256SUMS`.
- This audit does not verify detached signatures.
- This audit does not prove artifact authenticity.
- This audit does not collect candidate-specific release evidence.
- This audit does not approve release signing.
- This audit does not approve a release candidate or release.
- This audit does not make Another Dimension Chat release-ready or v0.1-security-ready.

## Non-Claims

- Signed-artifact verification fixture coverage is not signed artifact verification.
- Signed-artifact verification fixture coverage is not artifact authenticity proof.
- Signed-artifact verification fixture coverage is not release signing approval.
- Signed-artifact verification fixture coverage is not release approval.
