# Public Beta Launch Note

Another Dimension Chat is a no-central-trusted-server 1:1 private messenger
beta for macOS Apple Silicon.

The project is built around one product constraint: the default v0.1 messenger
model should not require a central service for identity, contact discovery,
message storage, push delivery, or private data recovery. That removes a lot of
convenience, but it makes the trust boundary easier to inspect.

## What You Can Try

The current public app lets two people walk through the local private-message
flow:

- create and unlock a local profile
- create or join a pairwise invite room
- compare safety material before trusting the room
- export and import manual encrypted envelopes
- retry, cancel, and recover pending envelope actions
- delete conversation, session, profile, or app-owned local data
- copy redacted diagnostics for public support

The practical default transport is manual encrypted envelope exchange. Advanced
onion/Tor paths are separate, explicit-user-triggered, and fail closed; external
onion delivery is outside the v0.1 public product claim.

## Why This Exists

Most convenient messengers centralize at least one important thing: account
identity, contact discovery, delivery, notification routing, or backup. This
project starts from the opposite direction and asks how much of a 1:1 private
messenger can be made local, pairwise, explicit, and reviewable first.

That is why the app avoids phone numbers, email identity, global accounts,
searchable usernames, centralized contact discovery, centralized message
servers, push notifications, and cloud backup in the v0.1 default scope.

## How To Try It

Download the unsigned macOS DMG and matching `.sha256` file from the GitHub
Release linked in the main README. Verify the same-release checksum before
opening the app, then use the normal macOS Privacy & Security manual allow path
only if the checksum matches.

Do not disable Gatekeeper globally. Do not use terminal quarantine-removal
commands as an install step.

Start here:

- [README.md](../README.md)
- [README.ko.md](../README.ko.md)
- [UNSIGNED_PUBLIC_BETA_INSTALL.md](../reference/UNSIGNED_PUBLIC_BETA_INSTALL.md)

## Boundaries

This is an unsigned experimental public beta. It is not notarized, not audited,
not production-ready, and sensitive communication prohibited. It is not a
secure messenger release, not a High-Risk-ready release, not a
Signal/Briar/Cwtch-equivalent privacy or security claim, and not a reliable
external onion delivery claim.

Windows, Android, and iOS remain source-only or local candidate paths until
separate artifact evidence exists. The current public artifact is macOS Apple
Silicon only.

Public support should use only redacted diagnostics copied from the app. Do not
post raw logs, local paths, invite codes, endpoints, payloads, message text,
safety material, passphrases, private keys, key material, or screenshots that
show private room data.

## Portfolio Summary

The value of the project is the engineering discipline around a hard product
boundary: Rust owns identity, pairing, protocol, storage, transport policy, and
orchestration; the Tauri shell exposes redacted state and explicit user actions.
Release copy, support intake, and verification scripts are kept aligned so the
public claims stay below the available evidence.

For the deeper architecture notes, continue with
[Why This Project Exists](./01-why-this-project-exists.md).
