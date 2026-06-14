# Another Dimension Chat Engineering Notes

This directory is a public-safe portfolio series for Another Dimension Chat.

The goal is not to claim that the project is a secure messenger today. The goal
is to explain how the project defines a high-risk 1:1 messenger direction,
keeps central trust out of the v0.1 default scope, and manages security claims
with implementation evidence.

## Read Order

0. [Public Beta Launch Note](./00-public-beta-launch.md)
1. [Why This Project Exists](./01-why-this-project-exists.md)
2. [No Central Trusted Server](./02-no-central-trusted-server.md)
3. [Rust Core And Tauri Shell](./03-rust-core-tauri-shell.md)
4. [Pairing, Envelopes, Storage, And Transport](./04-pairing-envelope-storage-transport.md)
5. [Release Discipline And Verification](./05-release-discipline-verification.md)
6. [AI-Native Development And Interview Script](./06-ai-native-development-interview-script.md)

For a slower Korean beginner-friendly explanation of the security and
communication concepts behind the project, read
[reference/learning/](../reference/learning/).

## Public Boundary

These notes use only public repository material:

- [README.md](../README.md)
- [README.ko.md](../README.ko.md)
- [SECURITY.md](../SECURITY.md)
- [SUPPORT.md](../SUPPORT.md)
- [reference/](../reference/)
- source code under [crates/](../crates/) and [apps/](../apps/)
- verification scripts under [scripts/](../scripts/)

They use only public repository material.

## Non-Claims

The current public beta is unsigned, experimental, macOS Apple Silicon only,
not notarized, not audited, and not production-ready. Do not use it for
sensitive communication.

These notes do not claim secure production messaging, audited E2EE, reliable
external onion delivery, censorship-circumvention readiness, or
Briar/Cwtch-equivalent security.
