# Field-test protocol

Use only synthetic, non-sensitive messages. Do not test with a real source,
contact, identity, capability, or private network.

Record for each run: release version and manifest fingerprint, browser/version,
OS/device, language, network type, proxy/VPN/Tor status, server mode, UTC start
and end time, expected result, observed result, logs with secrets redacted, and
whether the test was repeated after restart.

Minimum matrix:

| Area | Acceptance case | Evidence |
| --- | --- | --- |
| onboarding | create/unlock profile, exchange invite, compare safety material, complete handshake | screen-free written observations and error text |
| delivery | peer offline, relay restart, duplicate envelope, queue full, ack failure | server status and local transcript |
| identity | expired invite, revoked invite, changed peer identity, wrong safety material | safe rejection and fresh-pair path |
| storage | reload, browser close, auto-lock, backup restore, wrong passphrase, panic wipe | profile/message presence or absence |
| transport | localhost, HTTPS reverse proxy, LAN HTTP warning, VPN, blocked port | endpoint check and metadata observations |
| release | signed verification, wrong key, tampered file, old version, stale service-worker cache | verifier output and cache behavior |

The release must not be called field-tested until at least two independent
devices complete the matrix with all critical cases passing. Any capability,
passphrase, private invite, or real conversation found in evidence invalidates
the run and must be destroyed.
