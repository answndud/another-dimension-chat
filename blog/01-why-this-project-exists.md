# Why This Project Exists

Another Dimension Chat started from a product question:

> If a 1:1 messenger should avoid a central trusted server by default, what must
> be removed, narrowed, and verified first?

The project is not trying to win by having many chat features. It is trying to
make a hard privacy/security direction explicit enough that over-claiming
becomes difficult.

## The Problem

Many chat products rely on convenient central systems:

- phone-number or email identity
- global accounts
- searchable usernames
- centralized contact discovery
- centralized message servers
- push notification infrastructure
- cloud backup

Each one can be useful. Each one also creates metadata, account, delivery, or
recovery authority that a high-risk 1:1 messenger may not want as a default.

So the v0.1 scope deliberately avoids them. The result is less convenient, but
it makes the trust boundary visible.

## What The Project Shows

The current beta focuses on local, inspectable flows:

- local profile create and unlock
- invite-code room setup
- safety material comparison
- local encrypted profile/session/message stores
- manual encrypted envelope export/import
- explicit retry, cancel, recovery, and deletion actions
- redacted public diagnostics
- no network/onion work on app launch

Those capabilities are listed in the public [README](../README.md). The same
README also states what the project is not.

## Why The Non-Claim Matters

For this project, saying "not yet" is part of the engineering work. A test
passing is not the same thing as a security claim. A signed app is not the same
thing as a secure messenger. An onion/Tor path is not the same thing as reliable
external delivery.

The public security boundary is documented in [SECURITY.md](../SECURITY.md).
The support boundary is documented in [SUPPORT.md](../SUPPORT.md).

## Interview Summary

This project is a Rust/Tauri prototype for a high-risk 1:1 messenger direction
with no central trusted server in the product model. The point is not to claim a
finished secure messenger. The point is to show how identity, pairing, protocol,
storage, transport, release copy, and verification can be managed so the current
evidence and the public claims stay aligned.
