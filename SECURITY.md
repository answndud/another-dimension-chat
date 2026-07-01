# Security Policy

## Current Status

Another Dimension Chat is not ready for real communication.

The current macOS release is an unsigned DMG primary experimental public beta
with a source-build alternate path and a legacy unsigned DMG fallback for
explicit optional use. It is not signed, not notarized, not audited, not
production-ready, and not for sensitive communication. It is not a secure
messenger release.
The public v0.1 repository surface is macOS desktop only.

## Supported Public Build

| Platform | Public status |
|----------|---------------|
| macOS Apple Silicon | unsigned DMG primary, source-build alternate, legacy unsigned DMG fallback |
| Windows | No public app yet |

## Public Release Readiness Checklist

Before any public-facing release note or support response, confirm all of the
following:

- The build is described as unsigned DMG primary macOS beta, not a signed or notarized release.
- The wording still keeps `not audited`, `not production-ready`, and `not for sensitive communication`.
- Public support diagnostics stay redacted and do not include raw logs, local paths, invite codes, payloads, message bodies, safety phrases, passphrases, keys, or screenshots of private room data.
- Any macOS DMG is described as the primary install route, but it remains unsigned, not notarized, and not a security proof.
- No copy claims secure messenger readiness, reliable external delivery, or production security.

## Non-Claims

This beta does not claim:

- audited security
- production readiness
- safety for sensitive communication
- anonymity or untraceability
- reliable onion/network delivery
- Briar/Cwtch-equivalent privacy or security
- protection from compromised endpoints, coercion, unaudited implementation bugs, or full global traffic correlation

Experimental onion/network delivery is explicit, fail-closed, and outside the
default manual encrypted-envelope flow. It is not a reliable delivery claim.

## Implementation Notes

The current public decision notes are reduced to four files:

- [Public Threat Model](reference/PUBLIC_THREAT_MODEL.md)
- [Crypto Decision](reference/CRYPTO_DECISION.md)
- [Storage Decision](reference/STORAGE_DECISION.md)
- [Transport Decision](reference/TRANSPORT_DECISION.md)

These are review aids, not security claims.

## Source Build Boundary

The public macOS distribution path is an unsigned GitHub DMG for normal
installers, with a source-build alternate path and a legacy unsigned GitHub DMG
convenience path for explicit fallback use. It is not signed, not notarized,
not audited, not production-ready, and sensitive communication is prohibited.

The storage boundary for this public source-build path is split into checkout
space and runtime app-owned space:

- Clean source builds may use more than 500MB of temporary Rust/Tauri build
  space while the build is running, but that temporary target data must live
  outside the repository checkout and be removed after the build exits.
- After the build finishes, the repository checkout itself is expected to stay
  under 500MB without persistent `target/`, `apps/desktop-tauri/src-tauri/target/`,
  or `.build-cache/` directories left behind.
- Runtime local app-owned data is a separate budget from the checkout. The
  current desktop runtime target is 256MB total app-owned data, with each
  encrypted profile store capped at 128MB and write attempts fail-closed when
  that per-profile cap is reached.
- Global Rust toolchains, Cargo registry/cache directories, and shared npm
  dependency downloads are developer-machine costs and are not counted toward
  the repository checkout budget.

## Reporting Security Issues

If you find a security issue, use GitHub's private vulnerability reporting
feature if it is enabled for the repository.

If private vulnerability reporting is not enabled, open a minimal public issue
that does not include exploit details, crash dumps, screenshots, support
bundles, payload samples, endpoint details, or sensitive information, and ask
only for a private contact path.

Public support requests should stay redacted and limited to the app status,
build identity, checksum result, broad failure class, recovery next action,
and other non-sensitive support fields.
