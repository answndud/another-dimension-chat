# AGENTS.md

## 프로젝트 방향

- 이 프로젝트는 "서버 없는 채팅"이 아니라 `no central trusted server` 기반 고위험 1:1 보안 메신저를 목표로 한다.
- v0.1 기본 범위는 1:1 text only, 대면 QR 페어링, safety number 검증, Tor/onion transport, 로컬 암호화 저장, disappearing messages다.
- 전화번호, 이메일, 글로벌 계정, 검색 가능한 username, 중앙 contact discovery, 중앙 메시지 서버, 푸시 알림, 클라우드 백업은 v0.1 범위가 아니다.
- Signal보다 일반적으로 더 안전하다고 주장하지 않는다. 특정 위협 모델에서 전화번호/중앙 identity/contact discovery/delivery 의존을 줄인다고만 표현한다.

## 개발 진행 방식

- 기본 작업 방식은 실제 앱 흐름을 끝까지 관통하는 vertical slice 구현이다.
- record prefix, status mirror, boundary copy처럼 작은 안전장치만 반복하는 작업은 중단하고, 실제 pair -> verify -> onion connect -> send/receive -> resume 흐름을 여는 작업을 우선한다.
- 보안/릴리즈 주장은 계속 보수적으로 닫아두되, 코딩은 사용자가 체감하는 end-to-end 흐름을 빠르게 관통하도록 구현 우선으로 진행한다.
- 다음 작업을 고를 때는 "이 변경으로 실제 네트워크 송수신이나 앱 재개 흐름이 얼마나 더 열리는가?"를 먼저 본다.
- 문서나 하네스 정리는 코드 흐름을 빠르게 만들 때만 수행한다. 기능 구현을 미루기 위한 문서/검증 scaffold 작업은 금지한다.
- 혼자 AI agent로 빠르게 제품을 만드는 단계이므로 과설계를 피한다. 새 추상화, 상태값, 테스트, verifier는 실제 사용자 흐름을 단순하게 만들 때만 추가한다.
- UI/UX 변경은 regex 기반 구조 고정 테스트를 늘리지 않는다. 핵심 사용자 플로우 회귀만 남기고, 색상/문구/DOM 세부 구조를 과하게 잠그는 테스트는 줄인다.
- 기능이 아직 불안정할 때는 완벽한 방어망보다 작은 vertical slice, 직접 실행 가능한 흐름, 빠른 검증을 우선한다.
- 단, 자체 암호/RNG/KDF 작성, silent network enablement, production secure claim, user data destructive change는 vertical slice라도 금지한다.

## 먼저 볼 파일

- `Cargo.toml`: Rust workspace 구성.
- `README.md`: public-safe project overview and development commands.
- `SECURITY.md`: public security policy and non-claims.
- `apps/cli/src/main.rs`: prototype CLI entrypoint.
- `crates/core/src/lib.rs`: profile, pairing, messaging orchestration.
- `crates/pairing/src/lib.rs`: pairing payload, safety transcript, prototype signature boundary.
- `crates/protocol/src/lib.rs`: message envelope and replay window prototype.
- `scripts/verify_all.sh`: lightweight canonical local verification entrypoint.
- `scripts/verify_full.sh`: heavy pre-release/audit verification entrypoint.
- `docs/`는 public repository에 올리지 않는 private planning/security notes이며 `.gitignore`에 포함되어 있다.

## 작업 상태 문서

- 장기/다단계 작업을 이어받을 때만 `docs/PLAN.md`와 `docs/PROGRESS.md`를 읽는다. 단일 코드 수정이나 명확한 질문 답변을 문서 갱신 작업으로 확장하지 않는다.
- `docs/COMPLETED.md`는 완료 archive이며, 과거 맥락이 실제로 필요할 때만 읽는다.
- `docs/PLAN.md`에는 현재 active 작업, 범위 변경, 우선순위 변경처럼 다음 세션이 알아야 할 내용만 기록한다.
- `docs/PROGRESS.md`에는 장기 작업의 blocker, 검증 결과, 다음 액션처럼 handoff에 필요한 진행 상태만 기록한다.
- `docs/COMPLETED.md` append는 의미 있는 milestone이나 장기 작업 종료 때만 수행한다. 작은 코드 수정, 단순 문서 정리, 일반 검증 통과를 매번 archive하지 않는다.
- active 작업이 없으면 `PLAN.md`와 `PROGRESS.md`는 `현재 active 작업 없음`만 표시한다.
- 코드 변경이 우선이며, 상태 문서는 코드 개발을 대체하거나 지연시키지 않는다.

## 보안 원칙

- 자체 암호 알고리즘, 자체 random generator, 자체 key derivation 로직을 만들지 않는다.
- E2EE는 검증된 프로토콜과 유지보수되는 라이브러리 사용을 전제로 설계한다.
- high-risk mode에서 direct P2P/WebRTC/libp2p direct dialing을 기본값으로 두지 않는다.
- WebRTC, STUN, TURN, ICE, direct P2P는 IP, 접속 시간, 네트워크 상관관계 메타데이터를 노출할 수 있음을 문서화하기 전 도입하지 않는다.
- Tor/onion transport는 IP와 라우팅 메타데이터 노출을 줄이지만 endpoint compromise, coercion, malicious contact, global traffic correlation, Tor blocking을 해결하지 못한다.
- offline mailbox, async delivery, group, file transfer, multi-device, push notification은 별도 PRD/ADR 없이 추가하지 않는다.

## Private Docs

- `docs/`는 local-only 문서 영역이다. public push 대상에 포함하지 않는다.
- public repository에 필요한 설명은 source comments, README, 또는 별도 public-safe 문서로 다시 작성한다.
- private planning/security notes에서 public 문서로 옮길 때는 민감한 위협 모델, 운영 가정, 내부 의사결정 기록을 그대로 복사하지 않는다.

## Repository Hygiene

- `target/`, local prototype/dev stores, temporary pairing payloads, logs, editor metadata는 source context에서 제외한다.
- `docs/`는 public repository에서 제외한다.
- `.gitignore`는 version-control baseline이고, `.ignore`는 git 초기화 전에도 `rg` 검색을 깨끗하게 유지하기 위한 local search baseline이다.
- 생성 산출물이나 로컬 dev data를 문서나 source에 섞지 않는다.
- 루트 Markdown은 `README.md`, `AGENTS.md`, `SECURITY.md`만 유지한다. public-safe decision/runbook/boundary 문서가 꼭 필요하면 `reference/` 아래에 둔다.
- 새 Markdown 파일은 명시적 사용자 요청, durable public contract, 또는 실제 decision record가 있을 때만 만든다. 기존 문서를 고치는 것으로 충분하면 새 문서를 만들지 않는다.
- 루트에 release scaffold Markdown을 새로 만들지 않는다. 특히 `RELEASE_*`, `*_TEMPLATE`, `*_AUDIT`, `*_FIXTURE`, `*_GUARD`, `*_REQUIREMENTS` 계열 파일을 작업 slice마다 추가하는 방식은 금지한다.
- 문서 전용 verifier를 새로 만들지 않는다. `scripts/verify_all.sh`는 기능 코드와 직접 연결된 fmt/test/boundary 검증만 포함한다.
- release readiness는 실제 release 후보가 생겼을 때 소수의 기존 public 문서나 GitHub release checklist에서 다루며, 기능 개발 루프의 다음 작업으로 문서 scaffold를 반복 생성하지 않는다.
- 기능 개발 루프에서 status mirror, guard, prefix, copy update만 독립 반복하지 않는다. 실제 저장/재개/송수신 구현을 막는 scaffold성 검증은 축소하고, 기능이 열릴 때 필요한 최소 non-claim 검사만 유지한다.
- local git repository는 `main` branch로 초기화되어 있다.
- initial prototype scaffold commit은 생성되어 있다.
- remote `origin`은 `git@github.com:answndud/another-dimension-chat.git`이다.
- GitHub Actions workflow는 `.github/workflows/verify.yml`에 있으며 lightweight `scripts/verify_all.sh`를 실행한다.

## 검증

- 기본 local verification은 lightweight `scripts/verify_all.sh`를 우선 사용한다.
- heavy verification은 pre-release, audit, broad refactor, dependency/feature 변경처럼 비용을 감수할 가치가 있을 때만 `scripts/verify_full.sh`로 실행한다.
- 기본 Rust 검증 명령:
  - `cargo fmt --all -- --check`
  - `cargo test --workspace --lib`
- CLI flow, pairing lifecycle, storage lifecycle, replay behavior를 건드리면 `scripts/smoke_dev_cli.sh`도 실행한다.
- `dev-insecure` 검증은 prototype flow 검증이며 실제 보안 검증이 아니다.
- 문서 변경 검증은 변경한 문서의 링크, 명령, 핵심 주장만 확인한다. 상태 문서 갱신은 위 작업 상태 문서 기준에 해당할 때만 수행한다.
