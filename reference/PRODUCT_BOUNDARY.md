# Product boundary

## Supported product

The only supported product path is:

```text
verified browser UI bundle + user-owned API-only relay
```

The browser UI performs profile, pairing, safety confirmation, message
encryption/decryption, local transcript handling, lock, backup, and wipe
requests. The relay stores and forwards bounded opaque envelopes. It is not an
identity provider, contact directory, message archive, push service, or
trusted decryption service.

The production release package contains only the web UI, relay, release
verification/install tooling, public documentation, SBOM, provenance, and the
runtime explicitly required by that package. A package is not a supported
release merely because its files compile.

The future production candidate has a separate path:

```text
apps/daemon = local security-daemon boundary only
```

This crate currently exposes command names and an explicit not-ready status;
it does not own keys, storage, protocol state, or network traffic yet. Its
presence in the Rust workspace must not be interpreted as high-risk readiness.

## Explicitly unsupported legacy surfaces

`apps/desktop-tauri`, `apps/cli`, `apps/engine`, and the native transport/onion
spikes under `crates/transport` remain source/research material only. They are
not a second client, not an alternative security boundary, not evidence for
the web release, and not covered by the web product's security claims.

Legacy workflows may run only when explicitly requested for legacy maintenance.
They must not publish a current product release, advertise high-risk transport,
or be used as evidence that the supported web package passed its release gate.

## Security boundary consequences

- `serveStatic` and `AD_SERVE_UI=1` are development-only and are rejected by a
  public release package.
- Direct HTTPS, VPN, and LAN transport are low-risk delivery routes; they do
  not provide anonymity or censorship resistance.
- The high-risk route is permanently disabled in the v0.1 web product. Onion/Tor
  endpoints are rejected by the browser and server configuration; a future
  anonymity transport would require a new product-boundary decision and
  independent review before any implementation could ship.
- A changed JavaScript/WASM bundle, missing signature, revoked key, missing
  provenance/SBOM, or legacy artifact in a public package is a release failure.
- This boundary does not claim anonymity, secure deletion, coercion resistance,
  compromised-device protection, or independent audit status.
