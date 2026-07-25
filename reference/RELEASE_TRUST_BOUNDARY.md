# Release trust boundary

This document fixes the browser distribution boundary for TM-02 and TM-07.

## What the browser can and cannot prove

A JavaScript application cannot cryptographically prove the integrity of the
JavaScript that is already executing. A malicious static host can replace both
the verifier and the code it is supposed to verify. A Service Worker cache is
also not a signature boundary.

Therefore the product does not claim that a browser can self-attest its own
high-risk code. Trust must be established before the browser opens a profile:

1. An operator builds the source and generated WASM from a pinned toolchain.
2. The release manifest, SBOM, provenance, and archive are created.
3. An offline Ed25519 key signs the manifest.
4. A separate verifier runs `verify_public_release_gate.mjs` with the trusted
   public key and minimum version.
5. The verified static archive is copied to a static origin that does not run
   the relay process.
6. The user checks the release hash and public-key fingerprint through a
   separate trusted channel before entering a passphrase.

Key rotation is explicit: a new trusted public key is distributed out of band,
the old key ID is passed to the verifier with `--revoked-key-id`, and a release
signed by that revoked ID is rejected even when its signature is mathematically
valid. The release also carries `RELEASE-PROVENANCE.json`, `Cargo.lock`, and a
CycloneDX SBOM covering NPM, Cargo, and the Node runtime.

The user-owned relay is API-only by default. `serveStatic` and
`AD_SERVE_UI=1` are development convenience modes and must never be presented
as a high-risk release path.

## Fail-closed rules

- Missing or invalid manifest signature blocks a public release gate.
- A rollbacked or partially downloaded archive is not accepted.
- A relay root URL never serves a fallback `index.html` in relay-only mode.
- A browser warning must not describe HTTPS, VPN, or a verified archive as
  anonymity or endpoint-compromise protection.

This boundary reduces accidental trust in the relay. It does not protect a
browser, extension, operating system, or device that is already compromised.
