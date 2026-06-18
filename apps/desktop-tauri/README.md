# Desktop Tauri Beta Shell

This directory contains the desktop Tauri shell for Another Dimension Chat.

It is a local beta candidate, not a secure-release claim.

Current boundary:

- v0.1 unsigned public beta product surface is this desktop Tauri beta shell.
  Android is the next mobile client candidate only after the shared Rust
  core/API boundary stays platform-neutral; iOS follows after that same
  boundary is preserved. Mobile clients are not part of this public beta.
- macOS production UX and onboarding review input is tracked in
  `../../reference/MACOS_PRODUCTION_UX_ONBOARDING.md`. It binds the first-run
  checklist, invite/verify/message flow, manual envelope guide, recovery guide,
  redacted diagnostics, local lifecycle confirmations, and advanced transport
  UX boundary while keeping beta/non-claim copy in place.
- macOS production distribution gate status is tracked in
  `../../reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md`. It records that the
  current artifact is still unsigned beta, Developer ID signing/notarization and
  stable update channels are unavailable, and release upload/DMG rebuild remain
  explicit held actions.
- Rust owns security-sensitive state and future protocol/storage/transport behavior.
- Shared Rust core owns profile identity, pairing payload and safety
  transcript logic, message orchestration, protocol envelopes and replay,
  encrypted local storage policy, and fail-closed transport policy.
- Frontend may request redacted status, run local `dev-insecure` diagnostics, and call explicit local encrypted-store production commands.
- UI shells must not define separate security-sensitive protocol, storage,
  transport, pairing, contact-discovery, account, push notification, or cloud
  backup behavior.
- The main view shows an unsigned public beta warning. Public diagnostics export only status, build, failure class, recovery next action, desktop local-private-flow acceptance status/blockers/non-claims, and app-launch network boundary. It does not provide workflow-state export, crash upload, telemetry, raw log export, crash dump export, automated log collection, support bundle export, raw diagnostic file export, paths, endpoints, passphrases, or key material.
- Redacted status separates release-claim, messaging-surface, core, profile, pairing, production-session, production-self-test, production-session limits, production-preflight, preflight-blockers, session durable-state, session unlock-policy, session unlock-limits, session unlock-rejection, transport, network-execution, experimental-transport, bootstrap-status classification, transport-I/O, storage, and verification boundaries without exposing profile/contact/endpoint data.
- The core status is static boundary copy; security-sensitive protocol, storage, and transport work stays in Rust commands rather than frontend logic.
- The production-session status is static evaluation copy for the `snow` Noise XX synchronous boundary. Message commands use local encrypted stores, and onion transport commands are separate explicit user-triggered actions.
- The production-self-test status points to the CLI `production self-test` boundary only; it does not execute from the Tauri shell or mark messaging usable.
- The production-session limits copy keeps audited production E2EE readiness, automatic transport, and async messaging out of scope.
- The production-preflight status mirrors the CLI `production preflight` blockers as static read-only copy; it does not execute the CLI command, bootstrap transport, or mark messaging usable.
- The session lifecycle controls can check and delete local encrypted session draft, endpoint, replay, and Noise transport records without returning paths, passphrases, channel ids, endpoints, payloads, or key material. Deleting the session closes resume/message readiness but does not wipe message records, and this is no audited readiness claim.
- The data lifecycle controls can delete current conversation records, delete an encrypted profile store, wipe owned local app data, prepare backup-exclusion/migration/rollback markers, and report the boundary without returning local paths, plaintext, passphrases, or key material.
- The session unlock-policy status uses passphrase-first high-risk unlock and rejects OS-keystore-only unlock. Apple keychain, Secure Enclave, DPAPI, Keystore, and cloud key wrapping are not v0.1 requirements.
- Session unlock non-readiness remains rollback prevention secure deletion from media runtime messaging disabled.
- Product unlock/lock commands open the local encrypted profile store only after explicit user passphrase input, record only redacted unlocked/locked metadata, provide explicit lock, and apply a 60-second idle auto-lock.
- The session unlock-rejection status keeps CLI production unlock fail-closed while the desktop product unlock remains explicit and redacted.
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

Local Vite-first commands after dependency installation:

```bash
npm ci --workspaces=false
npm run dev
npm run test:ui-fast
npm run build
```

Native shell checks are separate and only needed for packaging or platform
integration work:

```bash
npm run test:native-shell
npm run tauri:dev
```

Build a local-only lightweight desktop public shell for packaging checks:

```bash
cd apps/desktop-tauri
npm run tauri:build
```

This generic Tauri build output is a public-shell artifact, not a public release
upload artifact. Public staging accepts only the pinned frozen DMG and
provenance checked by `scripts/prepare_unsigned_public_beta_release.sh`; update
that script's commit and SHA constants deliberately before changing the public
release input.

Build caches default to the OS user cache, not the repository. Inspect generated
cache paths before deleting them:

```bash
cd ../..
scripts/clean_build_cache.sh --dry-run
scripts/clean_build_cache.sh --apply
```

Windows desktop cross-platform parity intake is source-only and tracked in
`windows_desktop_parity_intake.json`.

It keeps these non-claims:

- Windows local build candidate only
- no public Windows artifact
- no Windows installer
- no public artifact upload
- not audited
- not production-ready
- sensitive communication prohibited

The intake lists WebView2 runtime smoke, Tauri app-data storage
roots, path separator behavior, encrypted-store parity, local deletion behavior,
redacted diagnostics, explicit user action review, no-auto-update parity, and
local-manual envelope default path as parity gaps before any Windows public
artifact work.

Windows local runtime smoke handoff is source-only and tracked in
`windows_local_runtime_smoke_handoff.json`. It is a checklist for a future real
Windows machine run of `npm --prefix apps/desktop-tauri run test:windows-boundary`,
not a Windows local runtime smoke passed claim.

The handoff checklist covers:

- WebView2 runtime smoke
- Tauri app-data path review
- path separator review
- local deletion behavior review
- redacted diagnostics behavior review
- explicit user action before network review
- local-manual envelope default path review
- no auto-update channel review
- public non-claim copy review

It keeps no public Windows artifact, no Windows installer, no public artifact
upload, not production-ready, and sensitive communication prohibited.

Build the beta-onion desktop shell with the manual E2EE engine sidecar bundled:

```bash
cd apps/desktop-tauri
npm run tauri:build:beta-onion
```

Build the beta-onion bridge channel shell with the same sidecar-first runtime boundary:

```bash
cd apps/desktop-tauri
npm run tauri:build:beta-onion-bridge
```

Run the native desktop shell only when packaging or platform integration needs
the Tauri wrapper:

```bash
cd apps/desktop-tauri
npm run tauri:dev
```

Run the local beta-onion shell with the manual E2EE engine sidecar bundled:

```bash
cd apps/desktop-tauri
npm run tauri:dev:beta-onion
```

Run the local beta-onion bridge channel shell with the same sidecar-first runtime boundary:

```bash
cd apps/desktop-tauri
npm run tauri:dev:beta-onion-bridge
```

The default and beta-onion Tauri commands are sidecar-first public-shell builds. Legacy embedded runtime commands remain under `legacy:tauri:*` for compatibility work only. They do not start Tor, launch an onion service, publish descriptors, receive, or send on app startup. Network work still requires the in-app manual network permission and an explicit user action.

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

Current local beta handoff, separate from the public release packaging input:

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
scripts/public_release_readiness_preflight.sh
scripts/prepare_unsigned_public_beta_release.sh
```

Run the source-only preflight from the repository root before staging artifacts; it does not require a DMG and does not generate release files. Treat `decision=proceed-to-packaging-only-with-frozen-ignored-dmg` as the packaging go signal only when the current task explicitly requests release packaging/upload, and return to desktop hardening if the source preflight fails or no explicit request exists. Then run the release staging command after the frozen local DMG and provenance JSON exist in `apps/desktop-tauri/beta-artifacts/`. It writes the ignored upload set to `apps/desktop-tauri/public-release/unsigned-public-beta/`; upload only the files listed in the generated `MANIFEST.md`.

Desktop public beta source freeze candidate: this is a source-only candidate,
with no DMG rebuild, no upload, and no generated release artifact commit. Final
source acceptance is limited to non-claims, redacted diagnostics, release
boundary, and desktop flow blocker checks. The next development axis must be
one of: release packaging/upload only after explicit user request, Windows
readiness, real-user test preparation, or default-transport-boundary.

Desktop Real-User Test Preparation Boundary: tester-facing reports must use
redacted public support diagnostics, failure class, and recovery next action
only. Allowed public fields are app version, build channel, build commit,
platform, checksum result, public diagnostics, failure class, recovery next
action, and whether app-launch network stayed false. Forbidden fields include
raw logs, onion endpoints, invite codes, pairing/envelope/endpoint payloads,
safety phrases, profile names, message text, local paths, passphrases, key
material, and private planning notes. Hold criteria are missing redacted
diagnostics, forbidden private data, network before explicit action, or checksum
mismatch. Abort criteria are exposed secrets, requests for raw logs, requests
for an external success claim, or requests to use the beta for sensitive
communication. There is no external two-machine success claim, no production
readiness claim, and sensitive communication prohibited remains in force.

Public Support Triage: maintainers should use
`reference/PUBLIC_SUPPORT_TRIAGE.md` for checksum retry, Gatekeeper recovery,
profile recovery, payload retry/cancel, lifecycle confirmation, redacted
diagnostics, and private security contact routing. Public triage must not
request raw logs, local paths, onion endpoints, invite codes, payloads, message
text, passphrases, private keys, key material, private screenshots, external
delivery proof, production-ready proof, audited status, or sensitive-use
reports.

Desktop Default Practical Transport Boundary: the desktop default practical path
is local manual encrypted envelope exchange. It is the only default source
boundary for v0.1 and has `network_io=false`, `automatic_delivery=false`,
`central_message_server=false`, `push_notification_dependency=false`, and
`central_contact_discovery=false`. The high-risk onion/Tor path is separate,
explicit-user-triggered, fail-closed, onion-only, and has
`direct_fallback=false`. This boundary is a product decision and first
implementation slice, not a reliable external delivery claim, production-ready
claim, audited security claim, or sensitive-communication allowance.

This public path is still an unsigned experimental public beta. It is not notarized, not audited, not production-ready, and sensitive communication prohibited. External onion delivery is outside the v0.1 public product claim; same-machine dual-profile rehearsal is development evidence only. No peer report is expected or required for this v0.1 claim, and no external delivery claim is made. Users must verify the checksum attached to the same GitHub Release as the DMG before using the normal macOS Privacy & Security manual allow path. Branch source files, source archives, or copied docs are not release proof. Updates are manual GitHub Release downloads only; there is no auto-update channel.

Desktop-only v0.1 acceptance matrix: `desktop local/manual beta readiness`
covers `invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim`.
It excludes
`android-ios-runtime#external-peer-evidence#audit#production-ready#security-ready#sensitive-communication`.
This matrix is not external onion delivery evidence, an audit result, a
production-ready claim, a security-ready claim, or permission for sensitive
communication.

Run the Vite-first UI loop during normal development:

```bash
cd apps/desktop-tauri
npm run dev
npm run test:ui-fast
npm run build
```

Expected local-only behavior:

- The first screen is the two-profile chat room.
- Onion setup controls are behind the `Onion setup` disclosure.
- Manual payload tools are behind the `Manual production payload tools` disclosure.
- Dev-insecure diagnostics are behind developer diagnostics disclosures.
- The public-shell first run avoids compiling the full Rust core/runtime stack.
  Legacy embedded runtime commands still take longer from a cold Cargo target.
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

- Tauri resolves the profile store root from `app.path().app_data_dir()` for identifier `chat.anotherdimension.app`.
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
npm run test:ui-fast
npm run build
```

For a local desktop shell check after the frontend dependencies are installed:

```bash
npm run test:native-shell
npm run tauri:dev
```


### Build Speed Boundary

The default `public-shell` feature pulls in only `tauri` + `serde` + `serde_json`.
Zero `another-dimension-*` runtime crates, `tokio`, `rusqlite`, `rustls`, or
arti/Tor deps in the default build. The heavy runtime features
(`legacy-embedded-runtime`, `full-runtime`, `manual-onion-client-attempt`,
`manual-onion-bridge-client`) are explicit opt-in and require full `cargo build`
with native compilation, vendored sqlcipher/OpenSSL, and optional arti.

The fast path is: `npm run build` (Vite-only) + `cargo check --manifest-path src-tauri/Cargo.toml`.
The `test:native-shell` script (`cargo check` on the Tauri Cargo.toml) without
additional `--features` uses the fast path only.

Machine-checkable from the repository root:

```bash
bash scripts/build_speed_boundary_once.sh
```

Expected output begins with `build_speed_boundary_status=ok`.

Dependency/build gate:

- `package-lock.json` is committed to pin the scaffold dependency graph.
- `src-tauri/Cargo.lock` is committed to pin the local Tauri shell dependency graph.
- `.npmrc` sets `workspaces=false` so local commands run as an isolated package even when the parent environment enables npm workspaces.
- Build cache cleanup is dry-run by default; use `scripts/clean_build_cache.sh --apply` from the repository root only when deleting generated cache paths is intended.
- Lightweight CI checks the scaffold shape and lockfile metadata only.
- Full Tauri install/build is local-only until a separate heavy workflow decision.
- Do not add network messaging, secure-release claims, or security-sensitive protocol logic to the frontend.

Platform prerequisites:

- Follow the official Tauri v2 prerequisites before running the desktop shell: https://v2.tauri.app/start/prerequisites/
- macOS requires the platform developer tools required by Tauri.
- Windows uses Microsoft Edge WebView2 for rendering.
- Linux requires distribution-specific WebKitGTK and related system packages.
- Android and iOS are out of scope for this scaffold slice.

Windows desktop readiness source audit status is local build candidate only:
there is no public Windows artifact, no Windows installer, no public artifact
upload, and no production-ready claim. Before any public Windows artifact,
Windows still needs WebView2 runtime smoke, app-data path review, path separator
review, redacted diagnostics review, explicit user action review, and
no-auto-update verification. Windows signing, Microsoft Store approval, and
SmartScreen reputation are distribution concerns, not a security boundary, and
sensitive communication prohibited remains in force.

Windows local usable criteria are source-defined before artifact work: a local
Windows run must preserve WebView2 rendering, Tauri app-data storage roots,
encrypted profile stores, local deletion behavior, redacted diagnostics,
explicit user actions before network work, no auto-update, and the same
local-manual envelope default path. Windows public artifact prerequisites are
separate and still require an explicit release request, local runtime smoke on a
real Windows machine, packaging review, installer/signing decisions, checksum
provenance, and public upload hold review.

Windows local runtime smoke boundary is source-only until a real Windows machine
runs the local app. The source command is:

```bash
npm --prefix apps/desktop-tauri run test:windows-boundary
```

It checks that the required Windows smoke still covers WebView2 runtime smoke,
app-data path review, path separator review, local deletion behavior, redacted
diagnostics behavior, and explicit user action review. Passing this source
command is not a Windows local runtime smoke passed result, not a public Windows
artifact, not a Windows installer, not a public artifact upload, not
production-ready, and sensitive communication prohibited.

Why full Tauri build is not in CI yet:

- The root Rust workspace verification should remain lightweight.
- Linux Tauri builds require system packages that are not part of the current Rust-only CI image.
- macOS and Windows builds introduce signing, notarization, SmartScreen, and platform package decisions that are not part of this prototype shell boundary.
- A separate heavy workflow should be added only after the app shell needs installable artifacts.
