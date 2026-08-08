# Independent security review scope

> **상태: 현재 daemon-first 제품 검토 범위.** 삭제된 browser Olm/WASM,
> IndexedDB, Tauri/native prototype은 현재 제품 증거가 아니며 검토 입력물에
> 포함하지 않는다.

This is a review scope, not an audit report or a production-safety certificate.
The reviewer must assess the daemon, browser bridge, user-owned relay, and
release channel as one composition. A review of OpenMLS, Rust, Node, or any
other dependency alone is insufficient.

## Required scope

1. **Ownership and boundary:** daemon/browser/relay trust boundaries, Account
   Root Key versus Device Key ownership, least-privilege bridge responses,
   loopback binding, one-time bootstrap, exact Origin/Host/UI-version checks,
   CSRF, session expiry, and restart invalidation.
2. **Identity and pairing:** root-signed device certificates, duplicate and
   revoked-device rejection, invite signature/expiry/capability binding,
   single-use consumption, safety-number verification, contact approval, and
   identity-change handling.
3. **Protocol composition:** the pinned `openmls-1` admission boundary,
   `MlsSessionCatalog`, persistence ordering, replay/duplicate handling,
   message/attachment state, crash recovery, and rollback behavior. Confirm
   which properties are provided by OpenMLS and which are application code.
4. **Storage and recovery:** Argon2id/AES-GCM encrypted daemon store, OS
   key-store boundary, corrupt/old/incomplete recovery artifacts, lock/wipe
   semantics, backup overwrite protection, memory lifetime, and diagnostic
   redaction. Secure deletion and coercion resistance are explicit non-claims.
5. **Browser UI:** static asset integrity, CSP, no third-party runtime,
   bootstrap fragment removal, DOM/network/log exposure, clipboard and file
   handling, stale-cache behavior, accessibility of blocking states, and the
   exact Chromium support boundary.
6. **User-owned relay:** opaque bounded envelopes, capability scope/leakage,
   request abuse, queue/blob bounds, retry/duplicate semantics, restart,
   backup/restore, TLS pin assumptions, logs, and metadata disclosure.
7. **Release and operations:** manifest/signature/provenance/SBOM, trusted-key
   bootstrap and rotation, revocation/minimum-version/rollback refusal,
   install/update/stop workflow, incident stop-distribution procedure, and
   whether a clean signed archive was actually tested.
8. **Non-claims:** compromised browser/OS, extensions, malware, keyloggers,
   screen capture, IP/timing/size analysis, anonymity, censorship resistance,
   secure deletion, and coercion resistance must not be promoted as protected.

## Required handoff inputs

The reviewer receives one clean Git revision, the daemon source and binary,
web artifact, relay source, lockfiles, release manifest, SBOM, provenance,
product boundary, threat model, focused evidence, and known non-claims.
Generate the packet with:

```sh
node scripts/prepare_security_review.mjs --out /secure/review/bundle
node scripts/verify_security_review_bundle.mjs /secure/review/bundle --project-dir .
```

The reviewer must receive no private key, passphrase, live capability,
plaintext, private invite, or real user data. The bundle verifier proves hashes
and redaction only; it does not prove reviewer independence or safety.

## Required finding format

For every finding record the source revision, severity, attacker preconditions,
confidentiality/integrity/availability impact, redacted reproduction, whether
automated evidence covers it, remediation, regression evidence, release-stop
decision, affected versions, and residual risk. Critical/high findings stop the
release. The signed result must separately state covered and excluded scope.

The handoff index is [`SECURITY_REVIEW_EVIDENCE.md`](SECURITY_REVIEW_EVIDENCE.md).
The independent sign-off is verified separately with
`scripts/verify_security_review_handoff.mjs`; an empty or fixture-only sign-off
leaves `AUDIT-01` blocked.
