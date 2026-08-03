# Independent security review scope

This repository is an experimental web-first 1:1 messenger. An audit must review
the application composition and distribution boundary, not only `vodozemac` or
Web Crypto in isolation.

Required scope:

1. Identity signatures, invite expiry/revocation, prekey reservation/consumption,
   safety verification, transcript binding, session pickle persistence, crash and
   rollback behavior.
2. Rust/WASM adapter correctness, generated artifact provenance, Argon2id profile
   wrapping, IndexedDB lifecycle, auto-lock, backup/restore, and panic wipe.
3. Browser UI trust boundary, service-worker update/cache behavior, DOM/log/error
   redaction, clipboard use, and malicious-server or replaced-JS scenarios.
4. User-owned relay capability secrecy, CORS, headers, rate limits, queue bounds,
   rotation, proxy configuration, TLS assumptions, and metadata exposure.
5. Release manifest signatures, key fingerprint distribution, SBOM, source/build
   reproducibility, rollback rejection, and release archive contents.

The reviewer should receive the exact source revision, generated WASM, lockfiles,
release manifest, SBOM, threat model, focused test output, and known non-claims.
The audit must report assumptions, attack preconditions, severity, reproduction
steps, and residual risk. A library audit is not evidence that this application
is safe for journalists or activists.

The handoff index is [`SECURITY_REVIEW_EVIDENCE.md`](SECURITY_REVIEW_EVIDENCE.md).
The reviewer must record covered and excluded scope, affected versions, findings,
remediation, and a separate sign-off. Automated output must be attached as evidence,
not copied into the sign-off field. Incident, CVE, signing-key, and rollback
procedures are in [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).
