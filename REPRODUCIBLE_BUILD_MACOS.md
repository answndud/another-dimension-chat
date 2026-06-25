# Reproducible Build Notes for macOS

This document collects the build inputs that should stay stable when you want
to compare two local macOS source builds.

## Keep Fixed

- `apps/desktop-tauri/package-lock.json`
- `Cargo.lock`
- `apps/desktop-tauri/src-tauri/Cargo.lock`
- macOS version
- Xcode Command Line Tools version
- Node.js major version
- Rust toolchain major version
- Tauri CLI major version

## Build Command

Use the source-build command from the install guide:

```sh
npm --prefix apps/desktop-tauri run tauri:build:beta-onion
```

## What This Does Not Guarantee

- It does not guarantee byte-for-byte identical artifacts across every machine.
- It does not make a failing local toolchain produce a valid build.
- It does not turn the source-build path into a signed or notarized release path.

## If Builds Drift

If two builds differ, compare these first:

1. macOS version
2. Xcode Command Line Tools version
3. Node.js version
4. Rust toolchain version
5. Tauri CLI version
6. lockfile changes

If those match, the difference is usually in the local environment rather than
in the documented source-build path.
