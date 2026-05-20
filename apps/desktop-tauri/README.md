# Desktop Tauri Scaffold

This directory is the first desktop shell scaffold for Another Dimension Chat.

It is intentionally not a production messaging UI.

Current boundary:

- Tauri shell only.
- Rust owns security-sensitive state and future protocol/storage/transport behavior.
- Frontend may request redacted prototype status only.
- Redacted status separates release-claim, messaging-surface, core, profile, pairing, transport, network-execution, storage, and verification boundaries without exposing profile/contact/endpoint data.
- The core status is static boundary copy in this scaffold; it does not link or call production core protocol, storage, or transport code.
- The transport status is static pre-network fail-closed copy; it does not bootstrap Tor, host onion services, publish descriptors, open streams, or transfer envelopes.
- The network-execution status is static disabled copy; it does not grant socket, Tor bootstrap, onion hosting, stream, or envelope transfer permission.
- The storage status is static `ADREC1` spike copy; it does not claim complete production key management, rollback protection, secure deletion, backup, recovery, or durable session persistence.
- Status copy must describe boundary-only or disabled prototype states, not readiness, availability, or secure-release claims.
- The only allowed Tauri command in this scaffold is `prototype_status`.
- No Tor bootstrap, onion hosting, descriptor publication, stream I/O, envelope I/O, push notifications, cloud backup, groups, file transfer, or multi-device support.
- `src-tauri` is excluded from the root Cargo workspace until the Tauri dependency and platform build costs are accepted as a separate phase.

Planned local commands after dependency installation:

```bash
npm ci --workspaces=false
npm run dev
npm run build
```

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
