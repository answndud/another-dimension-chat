# Install from Source on macOS

This is the primary macOS install path for developers and other people who want
to build the app locally instead of downloading a DMG.

## Requirements

- macOS on Apple Silicon
- Xcode Command Line Tools
- Rust toolchain
- Node.js and npm
- Git

## Build

1. Clone the repository.

   ```sh
   git clone https://github.com/answndud/another-dimension-chat.git
   cd another-dimension-chat
   ```

2. Install the desktop package dependencies.

   ```sh
   npm ci --prefix apps/desktop-tauri
   ```

3. Build the macOS app bundle.

   ```sh
   npm --prefix apps/desktop-tauri run tauri:build:beta-onion
   ```

4. Open the built app bundle.

   ```sh
   open apps/desktop-tauri/src-tauri/target/release/bundle/macos/Another\ Dimension\ Chat.app
   ```

## Storage Expectations

- The source-build command may use more than 500MB of temporary build space
  while it is running. That temporary Rust/Tauri target data is created
  outside the repository checkout and is removed when the build command exits.
- After the build completes, the repository checkout is expected to stay under
  500MB and not retain persistent `target/`, `src-tauri/target/`, or
  `.build-cache/` directories.
- Runtime local app data is a different budget from the repository checkout.
  The current runtime target is 256MB total app-owned data, with each
  encrypted profile store capped at 128MB.
- Global Rust toolchains, Cargo registry/cache directories, and shared npm
  dependency downloads are not counted toward the repository checkout budget.

## Verification Ladder

If you want to check the checkout before or after building, use the repo-root
verification scripts in this order:

```sh
scripts/verify_light.sh  # source-build boundaries + all desktop JavaScript tests
scripts/verify_full.sh   # light + rustfmt + desktop Tauri cargo check + runtime/workspace tests + clippy; pre-release only
```

`scripts/verify_light.sh` and `scripts/verify_full.sh` are the canonical
entrypoints. The optional `smoke_tauri_two_profile.sh` flow is a manual
acceptance check for production two-profile resume behavior; it is not part
of default verification.

## Reproducibility

For build-version and toolchain expectations, see
[Reproducible build notes for macOS](REPRODUCIBLE_BUILD_MACOS.md).

## What To Expect

- This is a developer-oriented path.
- It does not depend on a signed or notarized GitHub Release DMG.
- It does not claim audited, production-ready, or secure-messenger readiness.

## Common Failures

- `cargo` is missing or not on `PATH`
- `npm ci` fails because Node.js or lockfile prerequisites are missing
- Xcode Command Line Tools are not installed
- Tauri build or bundling fails because the local macOS toolchain is incomplete

## Notes

- If you are trying to help a non-developer, the source build path is usually
  the wrong path.
- If you intentionally use the legacy DMG fallback, verify the checksum
  first and treat it as an optional convenience path, not the primary one.
