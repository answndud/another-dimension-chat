# AGENTS.md

## 프로젝트 방향

- 이 프로젝트는 "서버 없는 채팅"이 아니라 `no central trusted server` 기반 고위험 1:1 보안 메신저를 목표로 한다.
- v0.1 기본 범위는 1:1 text only, 대면 QR 페어링, safety number 검증, Tor/onion transport, 로컬 암호화 저장, disappearing messages다.
- 전화번호, 이메일, 글로벌 계정, 검색 가능한 username, 중앙 contact discovery, 중앙 메시지 서버, 푸시 알림, 클라우드 백업은 v0.1 범위가 아니다.
- Signal보다 일반적으로 더 안전하다고 주장하지 않는다. 특정 위협 모델에서 전화번호/중앙 identity/contact discovery/delivery 의존을 줄인다고만 표현한다.

## 먼저 볼 파일

- `Cargo.toml`: Rust workspace 구성.
- `apps/cli/src/main.rs`: prototype CLI entrypoint.
- `crates/core/src/lib.rs`: profile, pairing, messaging orchestration.
- `crates/pairing/src/lib.rs`: pairing payload, safety transcript, prototype signature boundary.
- `crates/protocol/src/lib.rs`: message envelope and replay window prototype.
- `scripts/verify_all.sh`: canonical local verification entrypoint.
- `docs/`는 public repository에 올리지 않는 private planning/security notes이며 `.gitignore`에 포함되어 있다.

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
- local git repository는 `main` branch로 초기화되어 있다.
- initial prototype scaffold commit은 생성되어 있다.
- remote는 아직 없다. remote 작업은 별도 작업 단위로 진행한다.
- GitHub Actions workflow는 `.github/workflows/verify.yml`에 있으며 `scripts/verify_all.sh`를 실행한다.

## 검증

- 전체 local verification은 `scripts/verify_all.sh`를 우선 사용한다.
- 기본 Rust 검증 명령:
  - `cargo fmt --all -- --check`
  - `cargo test --workspace`
  - `cargo test --workspace --features dev-insecure`
  - `cargo clippy --workspace --all-targets --all-features`
- CLI flow, pairing lifecycle, storage lifecycle, replay behavior를 건드리면 `scripts/smoke_dev_cli.sh`도 실행한다.
- `dev-insecure` 검증은 prototype flow 검증이며 실제 보안 검증이 아니다.
- 문서 변경은 관련 파일 존재와 핵심 섹션을 확인하고, 작업 상태가 바뀌면 `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/COMPLETED.md`를 함께 갱신한다.
