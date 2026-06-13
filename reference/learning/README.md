# Another Dimension Chat Learning Guide

이 폴더는 Another Dimension Chat에 사용된 보안, 통신, 저장소, release 개념을 초보자도 따라올 수 있게 설명하는 public learning guide다.

목표는 "이 프로젝트는 안전한 메신저다"라고 주장하는 것이 아니다. 목표는 다음을 이해시키는 것이다.

1. 보안 메신저라는 말이 왜 넓고 위험한 claim인지
2. 중앙 신뢰 서버가 어떤 역할을 할 때 문제가 되는지
3. identity, key, signature, pairing, safety verification이 어떻게 연결되는지
4. encrypted envelope, replay window, local encrypted storage가 왜 필요한지
5. transport, Tor/onion, release signing, checksum, audit가 각각 무엇을 증명하고 무엇을 증명하지 않는지
6. 이 프로젝트의 Rust core와 Tauri shell이 그런 개념을 어떻게 나누는지

## Public Boundary

이 guide는 public repository에 둘 수 있는 설명만 사용한다.

근거로 사용할 수 있는 public source:

- [README.md](../../README.md)
- [README.ko.md](../../README.ko.md)
- [SECURITY.md](../../SECURITY.md)
- [SUPPORT.md](../../SUPPORT.md)
- [reference/](../)
- source code under `crates/` and `apps/`
- verification scripts under `scripts/`

이 guide는 public repository material만 기준으로 한다.

## 읽는 순서

1. [00-reading-roadmap.md](./00-reading-roadmap.md)
2. [01-what-is-a-secure-messenger.md](./01-what-is-a-secure-messenger.md)
3. [02-central-trust-and-metadata.md](./02-central-trust-and-metadata.md)
4. [03-identity-keys-and-signatures.md](./03-identity-keys-and-signatures.md)
5. [04-pairing-and-safety-verification.md](./04-pairing-and-safety-verification.md)
6. [05-encryption-envelope-and-replay.md](./05-encryption-envelope-and-replay.md)
7. [06-local-encrypted-storage.md](./06-local-encrypted-storage.md)
8. [07-transport-manual-onion-and-network-boundaries.md](./07-transport-manual-onion-and-network-boundaries.md)
9. [08-tauri-shell-and-rust-core-boundary.md](./08-tauri-shell-and-rust-core-boundary.md)
10. [09-release-security-and-non-claims.md](./09-release-security-and-non-claims.md)
11. [10-how-to-read-the-codebase.md](./10-how-to-read-the-codebase.md)
12. [glossary.md](./glossary.md)
13. [diagrams.md](./diagrams.md)

## 각 글의 기본 형식

각 글은 가능하면 같은 흐름을 따른다.

```text
이 글에서 배울 것
초보자용 비유
정확한 기술 개념
이 프로젝트에서는 어떻게 쓰는가
관련 코드 파일
흔한 오해
아직 claim하지 않는 것
직접 확인해볼 파일/명령
요약
```

## 이 guide의 톤

- 어려운 용어는 처음 나올 때 풀어쓴다.
- 코드 파일을 링크하되, 코드를 읽기 전에 이해해야 할 개념을 먼저 설명한다.
- "암호화했다"를 "안전하다"로 바로 바꾸지 않는다.
- "Tor/onion을 쓴다"를 "검열 저항/익명성/신뢰성 보장"으로 바로 바꾸지 않는다.
- "checksum/signing/notarization"을 "secure messenger proof"로 바꾸지 않는다.
- 테스트 통과를 audit 또는 production readiness로 바꾸지 않는다.

## 현재 claim boundary

현재 public beta는 unsigned experimental macOS Apple Silicon beta다.

현재 claim하지 않는 것:

- secure messenger
- production-ready
- audited
- sensitive communication safe/allowed
- reliable external onion delivery
- censorship-resistant
- Briar/Cwtch-equivalent privacy or security
- Windows/Android/iOS public artifact support

이 guide는 위 non-claim을 유지하면서 개념을 설명한다.
