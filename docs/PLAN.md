# PLAN.md

## Goal

Another Dimension의 소스 빌드와 장기 사용이 재생성 가능한 산출물을 누적하지 않도록 만든다. 설치 앱의 보안상 필요한 암호화 프로필·세션은 유지하되, 프로젝트 checkout은 평상시 200MB 이하, 빌드 종료 후 500MB 이하를 강제하고 앱 데이터는 만료·삭제 후 실제 디스크 공간까지 회수한다. 이 용량 작업이 끝난 뒤 macOS source-build-primary v0.1에 필요하지 않은 앱·문서·스크립트와 과분할 모듈을 제거해 저장소 구조도 최소화한다.

## Acceptance Bar

- clean build 도중 Rust/Tauri 임시 산출물이 500MB를 넘을 수 있음은 허용하되 checkout 밖 임시 디렉터리만 사용한다.
- 공식 명령은 시작 시 checkout target과 24시간이 지난 project-tagged 임시 target을 선제 삭제하고, 성공·실패·signal 종료 시 자신이 만든 산출물을 삭제한다.
- build 종료 후 checkout 전체가 500MB 이하이며 `target/`, `src-tauri/target/`, `.build-cache/`가 없다.
- public source build는 Cargo incremental과 debug symbol을 만들지 않고 release에 필요한 crate/feature만 컴파일한다.
- 앱 설치물, `dist/`, sidecar, 앱 데이터, 빌드 캐시를 구분해 측정하며 암호화 프로필, 1:1 room/session 복구, replay 방지는 용량 절감을 이유로 제거하지 않는다.
- 만료 메시지 삭제 후 SQLCipher 파일의 미사용 페이지를 회수하며 저장소 크기 상한 초과 시 쓰기를 fail-closed 한다.
- 전역 Rust toolchain과 Cargo registry는 프로젝트 소유 데이터가 아니므로 500MB checkout 기준에서 제외하고 문서에 명시한다.

## Backlog

- LTO는 설치물 크기보다 clean-build 임시 용량과 시간이 더 중요한 현재 목표에 역행하므로 적용하지 않는다.
- 전역 `~/.cargo/registry`와 Rust toolchain 자동 청소는 다른 Rust 프로젝트를 손상시킬 수 있어 프로젝트 명령에서 수행하지 않는다.
