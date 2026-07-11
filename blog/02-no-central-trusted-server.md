# No Central Trusted Server

"Serverless chat" is not the right description for this project.

The important distinction is not whether any server exists anywhere. Releases,
downloads, support, and vulnerability intake may still use public infrastructure.
The question is whether the messenger product requires a central service to
define identity, discover contacts, store messages, push notifications, or
recover private data.

## What v0.1 Excludes

The v0.1 default scope excludes:

- phone-number identity
- email identity
- global accounts
- searchable usernames
- centralized contact discovery
- centralized message servers
- push notification dependency
- cloud backup

This is a product constraint, not a claim that the current prototype solves all
security problems.

## Why Manual Transport Is The Default

The practical default transport in the beta is manual encrypted envelope
exchange. That is inconvenient, but it prevents the default path from implying
automatic network delivery, a central mailbox, push dependency, or reliable
external onion delivery.

Advanced onion/Tor paths exist as explicit-user-triggered, fail-closed
experiments. The public beta does not claim they are reliable external delivery.

Relevant public references:

- [PRODUCTION_DEFAULT_TRANSPORT_PATH.md](../reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md)
- [PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md](../reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md)
- [PUBLIC_THREAT_MODEL.md](../reference/PUBLIC_THREAT_MODEL.md)

## Tradeoff

The design intentionally chooses a weaker user experience in the short term to
avoid hiding a stronger trust assumption. That is the central product judgment:
make the trust boundary obvious before optimizing convenience.

## Interview Summary

I would not describe the project as "serverless chat." I would describe it as a
1:1 messenger prototype that keeps central trust out of the default product
model. The beta is useful because it makes identity, contact discovery, message
delivery, push, backup, and transport assumptions explicit instead of quietly
outsourcing them to a central service.
