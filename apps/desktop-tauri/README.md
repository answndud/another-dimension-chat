# Desktop Tauri Beta Shell

This directory contains the desktop Tauri shell for Another Dimension Chat.

It is a local beta candidate, not a secure-release claim.

Current boundary:

- Rust owns security-sensitive state and future protocol/storage/transport behavior.
- Frontend may request redacted status, run local `dev-insecure` diagnostics, and call explicit local encrypted-store production commands.
- Redacted status separates release-claim, messaging-surface, core, profile, pairing, production-session, production-self-test, production-session limits, production-preflight, preflight-blockers, session durable-state, session unlock-policy, session unlock-limits, session unlock-rejection, transport, network-execution, experimental-transport, bootstrap-status classification, transport-I/O, storage, and verification boundaries without exposing profile/contact/endpoint data.
- The core status is static boundary copy; security-sensitive protocol, storage, and transport work stays in Rust commands rather than frontend logic.
- The production-session status is static evaluation copy for the `snow` Noise XX synchronous boundary. Message commands use local encrypted stores, and onion transport commands are separate explicit user-triggered actions.
- The production-self-test status points to the CLI `production self-test` boundary only; it does not execute from the Tauri shell or mark messaging usable.
- The production-session limits copy keeps production E2EE claim, durable session persistence, Tauri production messaging command, and async messaging out of scope.
- The production-preflight status mirrors the CLI `production preflight` blockers as static read-only copy; it does not execute the CLI command, bootstrap transport, or mark messaging usable.
- The session durable-state status mirrors the store-write adapter boundary as static copy; it does not execute unlock, expose a shell write command, persist Noise transport state, or mark durable session persistence ready.
- The session unlock-policy status mirrors the high-risk passphrase-required and OS-keystore-only-rejected policy as static copy; it does not expose a product unlock command.
- The session unlock-limits copy keeps product unlock, durable session persistence, rollback protection, and runtime messaging disabled.
- The session unlock-rejection status mirrors the CLI `production unlock` redacted disabled taxonomy as static copy; it does not execute the CLI command, expose profile/passphrase input, open storage, write session records, expose key material, or enable runtime messaging.
- The transport status is conservative pre-network copy; it does not by itself bootstrap Tor, host onion services, publish descriptors, open streams, or transfer envelopes.
- The network-execution status is disabled-by-default copy; socket, Tor bootstrap, onion hosting, stream, and envelope transfer attempts require in-app manual network permission and an explicit user action.
- The experimental-transport status is a manual-gate summary; it does not mark transport broadly usable.
- The bootstrap-status classification mirrors CLI status classes such as `network-disabled`, `censorship-or-bridge-required`, and `timeout-or-transient-network-failure`; it does not expose raw Arti errors, paths, endpoints, bridge lines, descriptors, profile names, contact ids, or key material.
- The transport-I/O status stays conservative until explicit onion commands report redacted attempt results for onion hosting, stream I/O, envelope I/O, and messaging.
- The storage status is static `ADREC1` spike copy; it does not claim complete production key management, rollback protection, secure deletion, backup, recovery, or durable session persistence.
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

Run the local development shell with the manual onion networking attempt feature compiled in:

```bash
cd apps/desktop-tauri
npm run tauri:dev:beta-onion
```

The `manual-onion-client-attempt` feature only compiles the explicit onion attempt path. It does not start Tor, launch an onion service, publish descriptors, receive, or send on app startup. Network work still requires the in-app manual network permission and an explicit user action.

Local beta artifacts can be copied to `apps/desktop-tauri/beta-artifacts/` for tester handoff. That directory is ignored and must not be committed.

Current local beta handoff:

- Artifact: `apps/desktop-tauri/beta-artifacts/Another Dimension Chat_0.1.0_aarch64.dmg`
- SHA-256: `da4a7188c03cc2054979ea7e78abbfeee68de5d68134b2f25a5bb0422a3168f5`
- Installed-app smoke covered fresh smoke profiles, local encrypted pair/verify/send/reply, quit/reopen/unlock transcript resume, and explicit receive start/stop after manual network permission.
- This remains a local beta candidate. External Tor/onion success is environment-dependent and must be tested with explicit user action; no secure-release claim is made.
- External Tor/onion field testing should record whether bootstrap, onion endpoint launch, endpoint exchange, send, receive, retry, and cancel complete or fail closed. Do not treat Tor blocking, timeout, or peer offline results as release-blocking security failures unless they expose secrets, silently start network work, or corrupt transcript/session state.

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
- v0.1 beta has no destructive migration step. Existing profile/session/message records are read in place; incompatible future schema changes must add explicit migration logic before deleting or rewriting user data.
- Build artifacts must not include local app data, local dev stores, `docs/`, `target/`, `dist/`, `node_modules/`, or `beta-artifacts/`.

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
