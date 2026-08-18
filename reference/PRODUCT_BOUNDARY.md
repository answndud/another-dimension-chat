# Product boundary

## Supported product

The only supported product path is:

```text
authenticated browser UI + local OpenMLS daemon + user-owned relay
```

The browser UI is a presentation client for the local daemon. The daemon owns
profile identity, device state, OpenMLS sessions, encrypted local storage,
pairing, message delivery, backup, lock, and wipe requests. The relay stores
and forwards bounded opaque envelopes. It is not an identity provider, contact
directory, message archive, push service, or trusted decryption service.

The production release package contains only the web UI, relay, release
verification/install tooling, public documentation, SBOM, provenance, and the
runtime explicitly required by that package. A package is not a supported
release merely because its files compile.

The implementation uses this single path:

```text
apps/daemon = local OpenMLS security-daemon product owner
```

The daemon exposes the authoritative domain and protocol boundary. The
`highRiskAllowed` release flag remains false until all implementation,
independent review, and release evidence gates are complete.

## Release modes

The four product modes are named `development`, `private-trusted`, `public`, and
`high-risk-disabled` everywhere.

- `development`: local developer runs, not distributable.
- `private-trusted`: limited distribution to the operator and trusted
  acquaintances; the ciphertext-relay and local-key-ownership model can be
explained.
- `public`: general public distribution; requires independent review and
  operational evidence.
- `high-risk-disabled`: high-risk user protection; always disabled today.

This repository is a `development` checkout preparing a `private-trusted`
limited distribution. `public` release and the `high-risk-disabled` mode stay
blocked: `public` requires independent review, operational signing-key trust,
and deployment evidence, and `high-risk-disabled` remains off until a
separately reviewed anonymity transport exists. A relay operator can still
observe metadata (client IP, timing, traffic size) even in `private-trusted`
use; the relay not seeing plaintext is not metadata protection.

## Explicitly unsupported legacy surfaces

The former Tauri, native CLI/engine, browser Olm, and onion transport trees were
removed from the working source. Git history is the only archive. Their data
formats are not imported into the daemon because cryptographic state migration
would create a false identity-continuity claim; users create a fresh daemon
identity and verify contacts again.

## Security boundary consequences

- `serveStatic` and `AD_SERVE_UI=1` are development-only and are rejected by a
  public release package.
- Direct HTTPS, VPN, and LAN transport are low-risk delivery routes; they do
  not provide anonymity or censorship resistance.
- The high-risk route is permanently disabled in the v0.1 web product. Onion/Tor
  endpoints are rejected by the browser and server configuration; a future
  anonymity transport would require a new product-boundary decision and
  independent review before any implementation could ship.
- A changed web bundle or daemon binary, missing signature, revoked key, missing
  provenance/SBOM, or legacy artifact in a public package is a release failure.
- This boundary does not claim anonymity, secure deletion, coercion resistance,
  compromised-device protection, or independent audit status.
