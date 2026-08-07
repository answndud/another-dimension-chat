# Independent security review scope

> **상태: 재작성 대기 중인 과거 scope.** WASM, browser-owned storage, legacy
> session 항목은 현재 제품에서 제거되었습니다. 현재 daemon 릴리스에 대한 검토
> 범위나 sign-off 입력물로 사용하지 않습니다.

This repository is an experimental web-first prototype whose production
candidate is daemon-first. An audit must review the daemon, its browser bridge,
the user-owned relay, and the distribution boundary as one composition. It
must not treat `vodozemac`, Web Crypto, or any legacy Tauri/CLI/native crate in
isolation as evidence that the product is safe for high-risk users.

Required scope, in this order:

1. **Boundary and ownership:** daemon/browser/relay trust boundaries, Account
   Root Key versus Device Key ownership, least-privilege bridge API, loopback
   binding, bootstrap token, Origin/Host/CSRF checks, restart invalidation, and
   version binding.
2. **Identity and protocol:** identity signatures, invite expiry/revocation, prekey reservation/consumption,
   safety verification, transcript binding, session pickle persistence, crash and
   rollback behavior.
3. **Storage and recovery:** Rust/WASM adapter correctness, generated artifact provenance, Argon2id profile
   wrapping, IndexedDB lifecycle, auto-lock, backup/restore, and panic wipe.
4. Browser UI trust boundary, service-worker update/cache behavior, DOM/log/error
   redaction, clipboard use, and malicious-server or replaced-JS scenarios.
5. User-owned relay capability secrecy, CORS, headers, rate limits, queue bounds,
   rotation, proxy configuration, TLS assumptions, and metadata exposure.
6. Release manifest signatures, key fingerprint distribution, SBOM, source/build
   reproducibility, rollback rejection, and release archive contents.
7. **Endpoint and operational non-claims:** malware, browser extensions, keyloggers,
   coercion, secure deletion, anonymity, traffic analysis, and the exact point at
   which the release must stop instead of offering a workaround.

The reviewer should receive the exact source revision, daemon binary and source,
bridge API contract, generated WASM, lockfiles,
release manifest, SBOM, threat model, focused test output, and known non-claims.
The audit must report assumptions, attack preconditions, severity, reproduction
steps, and residual risk. A library audit is not evidence that this application
is safe for journalists or activists.

The handoff index is [`SECURITY_REVIEW_EVIDENCE.md`](SECURITY_REVIEW_EVIDENCE.md).
Every in-scope control must map to a requirement ID, source boundary, one
focused command, a redacted artifact, and a remaining limitation. Missing
daemon implementation is a blocker, not an invitation to use the browser
prototype as a substitute.
The reviewer must record covered and excluded scope, affected versions, findings,
remediation, and a separate sign-off. Automated output must be attached as evidence,
not copied into the sign-off field. Incident, CVE, signing-key, and rollback
procedures are in [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).
