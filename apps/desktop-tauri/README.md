# Desktop Tauri Scaffold

This directory is the first desktop shell scaffold for Another Dimension Chat.

It is intentionally not a production messaging UI.

Current boundary:

- Tauri shell only.
- Rust owns security-sensitive state and future protocol/storage/transport behavior.
- Frontend may request redacted prototype status and run the local `dev-insecure` demo transcript command only.
- Redacted status separates release-claim, messaging-surface, core, profile, pairing, transport, network-execution, storage, and verification boundaries without exposing profile/contact/endpoint data.
- The core status is static boundary copy in this scaffold; it does not link or call production core protocol, storage, or transport code.
- The transport status is static pre-network fail-closed copy; it does not bootstrap Tor, host onion services, publish descriptors, open streams, or transfer envelopes.
- The network-execution status is static disabled copy; it does not grant socket, Tor bootstrap, onion hosting, stream, or envelope transfer permission.
- The storage status is static `ADREC1` spike copy; it does not claim complete production key management, rollback protection, secure deletion, backup, recovery, or durable session persistence.
- Status copy must describe boundary-only or disabled prototype states, not readiness, availability, or secure-release claims.
- The allowed Tauri commands in this scaffold are `prototype_status` and `dev_local_demo`.
- `dev_local_demo` runs `cargo run -q --features dev-insecure -- demo local` from a temporary local workspace and returns its warning/transcript; it is not production messaging.
- No Tor bootstrap, onion hosting, descriptor publication, stream I/O, envelope I/O, push notifications, cloud backup, groups, file transfer, or multi-device support.
- `src-tauri` is excluded from the root Cargo workspace until the Tauri dependency and platform build costs are accepted as a separate phase.

Planned local commands after dependency installation:

```bash
npm ci --workspaces=false
npm run dev
npm run build
```

Run the visible local demo shell:

```bash
cd apps/desktop-tauri
npm ci --workspaces=false
npm run tauri -- dev
```

Then click `Run local demo`.

Expected local-only behavior:

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
- Do not add production messaging UI or security-sensitive logic to the frontend.

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
