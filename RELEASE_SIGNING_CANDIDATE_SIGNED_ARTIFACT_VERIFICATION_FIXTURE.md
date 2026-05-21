# Release Signing Candidate Signed Artifact Verification Fixture

Another Dimension Chat does not have a release-candidate signed artifact verification record today. This fixture does not sign artifacts, verify real release artifacts, prove artifact authenticity, approve release signing, or approve a release.

Fixture status: signed-artifact verification fixture only, not signed artifact verification evidence.

This fixture defines a disposable candidate evidence package shape for checking that a future signed-artifact verification record binds to the same candidate, artifact manifest, checksum file, signature file, key ceremony fingerprint, transcripts, classification, and blocker status.

## Fixture Coverage

The signed-artifact verification fixture verifier must accept only a disposable package where:

- `CANDIDATE_EVIDENCE_INDEX` exists and records the fixture candidate identity;
- `ARTIFACT_MANIFEST` exists and is non-empty;
- `SHA256SUMS` exists and is non-empty;
- `SHA256SUMS.sig` exists and is non-empty;
- `records/key-ceremony.record` records the fixture public key fingerprint;
- `records/signed-artifact.record` records `candidate_commit`, `release_tag`, `artifact_manifest`, `artifact_manifest_sha256`, `sha256sums_path`, `sha256sums_sha256`, `sha256sums_sig_path`, `sha256sums_sig_sha256`, `public_key_fingerprint`, `key_ceremony_record`, `signature_verification_command`, `signature_verification_transcript`, `artifact_hash_verification_command`, `artifact_hash_verification_transcript`, `failure_transcript`, `reviewer`, `review_timestamp`, `classification`, and `blocker_status`;
- all record digests match their disposable files;
- the signed-artifact record binds to the same candidate commit, release tag, artifact manifest, and artifact manifest digest as the index;
- the signed-artifact record binds to the same public key fingerprint as the key ceremony record;
- no index or record contains `TODO`, `template-only`, `dry-run-only`, `requirements-only`, or `placeholder`.

The signed-artifact verification fixture verifier must reject:

- missing signed-artifact verification record;
- missing `SHA256SUMS`;
- missing `SHA256SUMS.sig`;
- missing public key fingerprint;
- mismatched record candidate commit;
- mismatched record release tag;
- mismatched record artifact manifest;
- mismatched record artifact manifest digest;
- stale `SHA256SUMS` digest;
- stale `SHA256SUMS.sig` digest;
- key ceremony fingerprint mismatch;
- missing signature verification transcript;
- missing artifact hash verification transcript;
- missing failure transcript;
- template-only evidence;
- placeholder evidence;
- empty blocker status.

## Non-Claims

- This fixture does not sign release artifacts.
- This fixture does not checksum real release artifacts.
- This fixture does not compare real release artifact hashes against `SHA256SUMS`.
- This fixture does not verify detached signatures.
- This fixture does not prove artifact authenticity.
- This fixture does not collect candidate-specific release evidence.
- This fixture does not create or approve a release candidate.
- This fixture does not approve release signing.
- This fixture does not satisfy release hardening gates.
- This fixture does not make Another Dimension Chat release-ready or v0.1-security-ready.
