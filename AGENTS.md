# AGENTS.md

## 프로젝트 방향

- 이 프로젝트는 "서버 없는 채팅"이 아니라 `no central trusted server` 기반 고위험 1:1 보안 메신저를 목표로 한다.
- 전화번호, 이메일, 글로벌 계정, 검색 가능한 username, 중앙 contact discovery, 중앙 메시지 서버, 푸시 알림, 클라우드 백업은 v0.1 범위가 아니다.

## 필요할 때 볼 파일

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

- 장기/다단계 작업을 이어받을 때만 `docs/PLAN.md`를 읽는다. 단일 코드 수정이나 명확한 질문 답변을 문서 갱신 작업으로 확장하지 않는다.
- 과거 완료 맥락이 실제로 필요할 때만 `docs/DONE.md`를 읽는다.
- `docs/PLAN.md`에는 현재 active 작업, 범위 변경, 우선순위 변경, blocker, 검증 결과, 다음 액션처럼 다음 세션이 알아야 할 내용만 기록한다.
- 완료된 작업은 `docs/DONE.md`에 5줄 이하로 append한 뒤 `docs/PLAN.md`의 Active에서 제거한다.
- `docs/PLAN.md`는 현재와 미래만 담고, 완료 이력은 남기지 않는다.
- `docs/PROGRESS.md`는 상시 상태 문서로 사용하지 않는다.

## 저장소 용량 관리

- 프로젝트 폴더 용량이 비대해지면 먼저 빌드 캐시와 target 산출물을 확인한다.
- 용량 확인은 `du -sh . ./* ./.??* 2>/dev/null | sort -h | tail`처럼 큰 항목만 좁혀서 본다.
- 삭제 우선 후보는 재생성 가능한 산출물인 `target/`, `apps/desktop-tauri/src-tauri/target/`, `.build-cache/cargo-target/`이다.
- 소스, 문서, private smoke input, git metadata를 삭제하지 않는다.
- 사용자가 정리를 요청했거나 명확히 용량 문제가 발생한 경우에는 위 빌드/cache 산출물을 제거해 프로젝트 폴더를 줄인다.
