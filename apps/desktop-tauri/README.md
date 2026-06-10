# Desktop Tauri Beta Shell

This directory contains the desktop Tauri shell for Another Dimension Chat.

It is a local beta candidate, not a secure-release claim.

Current boundary:

- Rust owns security-sensitive state and future protocol/storage/transport behavior.
- Frontend may request redacted status, run local `dev-insecure` diagnostics, and call explicit local encrypted-store production commands.
- The main view shows an unsigned public beta warning. Public diagnostics export only status, build, failure class, manual network permission state, and app-launch network boundary. It does not provide crash upload, telemetry, raw log export, paths, endpoints, passphrases, or key material.
- Redacted status separates release-claim, messaging-surface, core, profile, pairing, production-session, production-self-test, production-session limits, production-preflight, preflight-blockers, session durable-state, session unlock-policy, session unlock-limits, session unlock-rejection, transport, network-execution, experimental-transport, bootstrap-status classification, transport-I/O, storage, and verification boundaries without exposing profile/contact/endpoint data.
- The core status is static boundary copy; security-sensitive protocol, storage, and transport work stays in Rust commands rather than frontend logic.
- The production-session status is static evaluation copy for the `snow` Noise XX synchronous boundary. Message commands use local encrypted stores, and onion transport commands are separate explicit user-triggered actions.
- The production-self-test status points to the CLI `production self-test` boundary only; it does not execute from the Tauri shell or mark messaging usable.
- The production-session limits copy keeps audited production E2EE readiness, automatic transport, and async messaging out of scope.
- The production-preflight status mirrors the CLI `production preflight` blockers as static read-only copy; it does not execute the CLI command, bootstrap transport, or mark messaging usable.
- The session lifecycle controls can check and delete local encrypted session draft, endpoint, replay, and Noise transport records without returning paths, passphrases, channel ids, endpoints, payloads, or key material. Deleting the session closes resume/message readiness but does not wipe message records.
- The data lifecycle controls can delete current conversation records, delete an encrypted profile store, wipe owned local app data, prepare backup-exclusion/migration/rollback markers, and report the boundary without returning local paths, plaintext, passphrases, or key material.
- The session unlock-policy status uses passphrase-first high-risk unlock and rejects OS-keystore-only unlock. Apple keychain, Secure Enclave, DPAPI, Keystore, and cloud key wrapping are not v0.1 requirements.
- Product unlock/lock commands open the local encrypted profile store only after explicit user passphrase input, record only redacted unlocked/locked metadata, provide explicit lock, and apply a 60-second idle auto-lock.
- The CLI `production unlock` command remains fail-closed. The desktop product unlock command does not expose profile paths, passphrases, raw storage errors, key material, write session records, or enable runtime messaging.
- The transport status is conservative pre-network copy; it does not by itself bootstrap Tor, host onion services, publish descriptors, open streams, or transfer envelopes.
- The network-execution status is disabled-by-default copy; socket, Tor bootstrap, onion hosting, stream, and envelope transfer attempts require in-app manual network permission and an explicit user action.
- The experimental-transport status is a manual-gate summary; it does not mark transport broadly usable.
- The bootstrap-status classification mirrors CLI status classes such as `network-disabled`, `censorship-or-bridge-required`, and `timeout-or-transient-network-failure`; it does not expose raw Arti errors, paths, endpoints, bridge lines, descriptors, profile names, contact ids, or key material.
- The transport-I/O status stays conservative until explicit onion commands report redacted attempt results for onion hosting, stream I/O, envelope I/O, and messaging.
- The storage status is static `ADREC1` spike copy; it does not claim complete production key management, rollback prevention, secure deletion from media, backup recovery, or audited session lifecycle readiness.
- Status copy must describe boundary-only or disabled prototype states, not readiness, availability, or secure-release claims.
- The allowed Tauri commands are the explicit local demo, status, encrypted profile/pairing/session/message commands, and explicit user-triggered onion transport commands.
- `dev_local_demo` runs `cargo run -q --features dev-insecure -- demo local` from a temporary local workspace and returns its warning/transcript; it is not production messaging.
- No Tor bootstrap, onion hosting, descriptor publication, stream I/O, or envelope I/O starts on app launch. Push notifications, cloud backup, groups, file transfer, and multi-device support are out of scope.
- `src-tauri` is excluded from the root Cargo workspace until the Tauri dependency and platform build costs are accepted as a separate phase.

Local commands after dependency installation:

```bash
npm ci --workspaces=false
npm run dev
npm run build
```

Build an installable desktop beta:

```bash
cd apps/desktop-tauri
npm run tauri:build
```

Build the beta with the manual onion networking attempt feature compiled in:

```bash
cd apps/desktop-tauri
npm run tauri:build:beta-onion
```

Build the beta with the manual onion networking attempt and bridge-client feature compiled in:

```bash
cd apps/desktop-tauri
npm run tauri:build:beta-onion-bridge
```

Run the local development shell with the manual onion networking attempt feature compiled in:

```bash
cd apps/desktop-tauri
npm run tauri:dev:beta-onion
```

Run the local development shell with the manual onion networking attempt and bridge-client feature compiled in:

```bash
cd apps/desktop-tauri
npm run tauri:dev:beta-onion-bridge
```

The `manual-onion-client-attempt` and `manual-onion-bridge-client` features only compile explicit onion attempt paths. They do not start Tor, launch an onion service, publish descriptors, receive, or send on app startup. Network work still requires the in-app manual network permission and an explicit user action.

Run two isolated local peer shells from separate terminals when testing one computer as two devices:

```bash
cd apps/desktop-tauri
npm run tauri:dev:peer-a
npm run tauri:dev:peer-b
```

Use the bridge-capable peer shells when the field run needs app-private bridge config:

```bash
cd apps/desktop-tauri
npm run tauri:dev:peer-a:bridge
npm run tauri:dev:peer-b:bridge
```

Inject the same local bridge config file into each bridge-capable peer shell without printing bridge lines. Managed-transport bridges such as obfs4 or webtunnel also require an explicit pluggable transport binary; direct bridge lines do not.

```bash
cd apps/desktop-tauri
npm run tauri:dev:peer-a:bridge -- --bridge-config-file /path/to/local/bridge-lines.txt --pt-binary /path/to/lyrebird
npm run tauri:dev:peer-b:bridge -- --bridge-config-file /path/to/local/bridge-lines.txt --pt-binary /path/to/lyrebird
```

Run the ignored real onion smoke with a local bridge config file and pluggable transport binary only when you are ready for one explicit network attempt:

```bash
ANOTHER_DIMENSION_REAL_ONION_SMOKE_BRIDGE_CONFIG_FILE=/path/to/local/bridge-lines.txt \
ANOTHER_DIMENSION_REAL_ONION_SMOKE_PT_BINARY=/path/to/lyrebird \
ANOTHER_DIMENSION_REAL_ONION_SMOKE_REQUIRE_BRIDGE_CONFIG=1 \
CARGO_BUILD_JOBS=1 cargo test --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml --lib \
  --features manual-onion-bridge-client \
  production_two_profile_real_onion_roundtrip_smoke_delivers_or_fails_closed -- --ignored --nocapture
```

Run the GUI-less preflight before opening those shells:

```bash
cd apps/desktop-tauri
npm run test:local-peers
```

The GUI-less preflight checks the peer-a/peer-b app data roots and the invite-derived two-device handshake/recovery path without starting Vite, Tauri dev, or a desktop window.

Local beta artifacts can be copied to `apps/desktop-tauri/beta-artifacts/` for tester handoff. That directory is ignored and must not be committed.

Current local beta handoff:

- Artifact: `apps/desktop-tauri/beta-artifacts/Another Dimension Chat_0.1.0_aarch64.dmg`
- SHA-256: `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`
- Transfer bundle: `apps/desktop-tauri/beta-artifacts/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-field-test-handoff.zip`
- Transfer bundle SHA-256: `f231dcc3a95b63d5d32b6b36cb503443a46547fa1dcbb44d58f772be831d0907`
- Peer delivery folders: `apps/desktop-tauri/beta-artifacts/peer-delivery-a/` and `apps/desktop-tauri/beta-artifacts/peer-delivery-b/`
- Build: `beta-onion` from commit `806ecad1`
- Installed-app smoke covered fresh smoke profiles, local encrypted pair/verify/send/reply, quit/reopen/unlock transcript resume, and explicit receive start/stop after manual network permission.
- This remains a local beta candidate. External Tor/onion success is environment-dependent and must be tested with explicit user action; no secure-release claim is made.
- External Tor/onion field testing should record whether bootstrap, onion endpoint launch, endpoint exchange, send, receive, retry, and cancel complete or fail closed. Do not treat Tor blocking, timeout, or peer offline results as release-blocking security failures unless they expose secrets, silently start network work, or corrupt transcript/session state.
- Peer reports must use the listed leading status tokens and must not include bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, passphrases, profile names, message text, local paths, raw logs, or key material.

Public unsigned GitHub Release staging:

```bash
scripts/prepare_unsigned_public_beta_release.sh
```

Run that command from the repository root after the frozen local DMG and provenance JSON exist in `apps/desktop-tauri/beta-artifacts/`. It writes the ignored upload set to `apps/desktop-tauri/public-release/unsigned-public-beta/`:

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json`
- `INSTALL_UNSIGNED_MACOS.md`
- `RELEASE_NOTES.md`
- `UPDATE_INTEGRITY.md`
- `SUPPLY_CHAIN_BASELINE.md`
- `PUBLIC_THREAT_MODEL.md`
- `INDEPENDENT_REVIEW_PACKET.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `MANIFEST.md`

This public path is still an unsigned experimental public beta. It is not notarized, not audited, not production-ready, and sensitive communication prohibited. External two-machine onion delivery has not been independently verified; same-machine dual-profile rehearsal is development evidence only. Users must verify the checksum attached to the same GitHub Release as the DMG before using the normal macOS Privacy & Security manual allow path. Branch source files, source archives, or copied docs are not release proof. Updates are manual GitHub Release downloads only; there is no auto-update channel.

Run the local desktop shell during development:

```bash
cd apps/desktop-tauri
npm run tauri -- dev
```

Expected local-only behavior:

- The first screen is the two-profile chat room.
- Onion setup controls are behind the `Onion setup` disclosure.
- Manual payload tools are behind the `Manual production payload tools` disclosure.
- Dev-insecure diagnostics are behind developer diagnostics disclosures.
- The first run may take longer while Cargo builds the `dev-insecure` CLI demo.
- The shell shows a dev-insecure warning separately from the transcript.
- The shell shows structured local flow steps for profile creation, pairing, safety verification material, pairing confirmation, message send/receive, replay check, and demo completion.
- The shell maps the local demo result into Alice/Bob peer panels and local flow controls for profile creation, pairing, safety display, contact confirmation, message send/receive, replay check, and completion.
- `Reset local view` clears the displayed simulation state; `Run local demo` can be used again to re-run the underlying dev-insecure local command.
- The repeatable local loop accepts one local dev message per line and runs `demo local-loop` through the same dev-insecure CLI/core flow.
- The local loop reports each send/receive result plus replay, expiry, and dev store plaintext guard summaries.
- The transcript remains visible for debugging.

Failure checks:

- Confirm Rust/Cargo is installed and available on `PATH`.
- Confirm Tauri v2 platform prerequisites are installed.
- Run `cargo run -q --features dev-insecure -- demo local` from the repository root to isolate CLI failures.
- Run `npm run build` from `apps/desktop-tauri` to isolate frontend build failures.

App data and migration expectations:

- Tauri resolves the profile store root from `app.path().app_data_dir()` for identifier `chat.anotherdimension.prototype`.
- Encrypted profile stores live under `<app-data>/profiles/<profile>/`.
- Transport state/cache preparation uses `<app-data>/transport/arti-state` and `<app-cache>/transport/arti-cache`.
- v0.1 beta has no destructive migration step. SQLCipher profile stores use a forward-only schema version boundary and reject future schema versions instead of silently downgrading or rewriting user data.
- The data lifecycle marker records that rollback detection is marker-only. It is not rollback prevention and still requires external monotonic state before any stronger claim.
- Deleting a conversation removes local message records for the current encrypted session while preserving session records. Deleting a profile removes that profile store file. Full local wipe removes owned `profiles/`, `transport/`, lifecycle markers, and transport cache; it does not claim secure deletion from media.
- Build artifacts must not include local app data, local dev stores, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, key material, raw logs, crash dumps, `docs/`, `target/`, `dist/`, `node_modules/`, or `beta-artifacts/`.

From the repository root:

```bash
cd apps/desktop-tauri
npm ci --workspaces=false
npm run dev
```

For a local desktop shell run after the frontend dependencies are installed:

```bash
npm run tauri -- dev
```

Dependency/build gate:

- `package-lock.json` is committed to pin the scaffold dependency graph.
- `src-tauri/Cargo.lock` is committed to pin the local Tauri shell dependency graph.
- `.npmrc` sets `workspaces=false` so local commands run as an isolated package even when the parent environment enables npm workspaces.
- Lightweight CI checks the scaffold shape and lockfile metadata only.
- Full Tauri install/build is local-only until a separate heavy workflow decision.
- Do not add network messaging, secure-release claims, or security-sensitive protocol logic to the frontend.

Platform prerequisites:

- Follow the official Tauri v2 prerequisites before running the desktop shell: https://v2.tauri.app/start/prerequisites/
- macOS requires the platform developer tools required by Tauri.
- Windows uses Microsoft Edge WebView2 for rendering.
- Linux requires distribution-specific WebKitGTK and related system packages.
- Android and iOS are out of scope for this scaffold slice.

Why full Tauri build is not in CI yet:

- The root Rust workspace verification should remain lightweight.
- Linux Tauri builds require system packages that are not part of the current Rust-only CI image.
- macOS and Windows builds introduce signing, notarization, SmartScreen, and platform package decisions that are not part of this prototype shell boundary.
- A separate heavy workflow should be added only after the app shell needs installable artifacts.
