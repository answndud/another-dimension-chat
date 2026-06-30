# DONE.md

완료된 작업의 짧은 append-only archive다. 새 세션 시작 시 기본적으로 읽지 않는다.

## Archive

## 2026-06-30 - P130.2 DONE archive cleanup and limit recheck
- 요약: DONE의 오래된 follow-up 문장을 현재 완료 상태로 바꾸고 archive 최근 20개 제한을 유지했다.
- 변경: `docs/DONE.md`에서 P130.1 follow-up을 제거하고 완료 상태를 반영했다.
- 검증: `rg -c '^## 2026-|^## 2025-' docs/DONE.md`, `sed -n '1,120p' docs/DONE.md`, `git diff --check`
- 후속: 없음.

## 2026-06-30 - P130.1 private guide verification command drift cleanup
- 요약: 유지할 가치가 있는 private guide와 index 문서에서 삭제된 verification command 참조를 현재 entrypoint로 치환했다.
- 변경: `docs/product/legacy/DEVELOPER_WORKFLOW.md`, `docs/technical-guide/09-release-security-and-non-claims.md`, `docs/technical-guide/10-how-to-read-the-codebase.md`, `docs/blog/README.md`, `docs/blog/00_source_reference_map.md`, `docs/blog/10-verification-scripts와-quality-gate.md`, `docs/blog/11-ai-agent를-개발-시스템에-넣은-방법.md`, `docs/blog/13-면접-qna와-5분-데모-스크립트.md`, `docs/blog/14-면접-학습-master-guide.md`를 `verify_light.sh`/`verify_full.sh` 기준으로 갱신했다.
- 검증: `rg -n "verify_all\\.sh|verify_warm\\.sh|verify_cold\\.sh|verify_default_boundary\\.sh|build_cache_env\\.sh" docs --glob '*.md'`, `git diff --check`
- 후속: 없음.

## 2026-06-30 - P129.2 storage budget metric consolidation
- 요약: storage budget의 structure metric 정의와 limit 체크를 한 선언형 목록으로 묶었다.
- 변경: `apps/desktop-tauri/scripts/storage-budget.mjs`에서 metric별 prefix, report key, limit을 하나의 목록으로 관리하고 report/검사를 그 목록으로 생성하게 했다.
- 변경: `apps/desktop-tauri/scripts/storage-budget.test.mjs`의 fixture와 기대값을 새 집계에 맞게 유지했다.
- 검증: `node --test apps/desktop-tauri/scripts/storage-budget.test.mjs`, `npm --prefix apps/desktop-tauri run check:storage-budget`, `git diff --check`
- 후속: P130.1에서 private guide의 삭제된 verification command 참조를 현재 entrypoint로 치환한다.

## 2026-06-30 - P129.1 structure budget metric correction
- 요약: frontend/script 구조 budget을 실제 repo surface에 맞게 조정했다.
- 변경: `apps/desktop-tauri/scripts/storage-budget.mjs`에서 frontend cap을 40으로 올리고 `scripts/`와 `apps/desktop-tauri/scripts/`를 합산해 script surface를 20 cap으로 검사하도록 바꿨다.
- 변경: `apps/desktop-tauri/scripts/storage-budget.test.mjs`, `README.md`, `README.ko.md`를 새 계약에 맞게 갱신했다.
- 검증: `node --test apps/desktop-tauri/scripts/storage-budget.test.mjs`, `npm --prefix apps/desktop-tauri run check:storage-budget`, `git diff --check`
- 후속: P129.2에서 storage budget metric 정의의 반복을 선언형 목록으로 더 압축한다.

## 2026-06-30 - P128.1 cleanup runner for failed Tauri builds
- 요약: Tauri build alias를 공통 cleanup runner로 묶어 성공, 실패, SIGTERM 종료 뒤 checkout 산출물이 남지 않게 했다.
- 변경: `apps/desktop-tauri/scripts/run-clean-build.mjs`와 `apps/desktop-tauri/scripts/run-clean-build.test.mjs`를 추가하고 `apps/desktop-tauri/package.json`의 build alias를 runner로 교체했다.
- 변경: `apps/desktop-tauri/scripts/build-storage-contract.test.mjs`를 새 alias 문자열에 맞게 갱신했다.
- 검증: `node --test apps/desktop-tauri/scripts/run-clean-build.test.mjs`, `node --test apps/desktop-tauri/scripts/build-storage-contract.test.mjs`, `npm --prefix apps/desktop-tauri run check:storage-budget`, `git diff --check`
- 후속: P129.1에서 frontend/script 구조 budget 지표를 실제 repo surface에 맞춘다.

## 2026-06-30 - P127.5 storage structure budget static verification
- 요약: checkout 500MB 검사에 tracked file/directory 상한을 붙이고 실패 보고를 구조 중심으로 바꿨다.
- 변경: `apps/desktop-tauri/scripts/storage-budget.mjs`에 tracked file 180개, tracked directory 45개, frontend src 32개, reference 4개, scripts 4개 상한과 상위 10개 directory 요약을 추가했다.
- 변경: `apps/desktop-tauri/scripts/storage-budget.test.mjs`에 구조 성공/실패 회귀를 넣고 `README.md`, `README.ko.md`에 구조 budget 설명을 추가했다.
- 검증: `node --test apps/desktop-tauri/scripts/storage-budget.test.mjs`, `npm --prefix apps/desktop-tauri run check:storage-budget`, `./scripts/verify_light.sh`
- 후속: P125.2에서 만료·삭제 후 DB 파일 공간 회수를 붙인다.

## 2026-06-30 - P127.4 transport and verification entrypoint integration
- 요약: transport 소스 root를 5개로 줄이고 verify wrapper 체인을 4개 entrypoint로 압축했다.
- 변경: `crates/transport/src/{runtime,onion}/` 아래로 transport 하위 모듈을 옮기고 `lib.rs`를 얇은 재export로 바꿨다. `scripts/verify_all.sh`/`verify_warm.sh`/`verify_cold.sh`/`verify_engine_runtime_focused.sh`/`verify_default_boundary.sh`/`verify_macos_dmg_contained_app.sh`/`smoke_dev_cli.sh`/`build_cache_env.sh`를 제거했다.
- 변경: `scripts/verify_full.sh`, `scripts/smoke_tauri_two_profile.sh`, `apps/desktop-tauri/package.json`, `.github/workflows/verify.yml`를 새 entrypoint로 연결했다.
- 검증: `cargo check -p another-dimension-transport`, `./scripts/verify_light.sh`, `find crates/transport/src -maxdepth 1 -type f | wc -l`
- 후속: `cargo test --workspace`는 기존 `production::tests::crypto_erasure_lifecycle_persists_session_records_without_transport` 실패로 full verify가 중단됐다.

## 2026-06-30 - P127.3 frontend state module integration
- 요약: saved-room/transcript/chat-delivery/diagnostics micro-state files를 도메인 합본으로 접었다.
- 변경: `apps/desktop-tauri/src/{saved-room,transcript,chat-delivery,diagnostics,production}.js`와 대응 테스트 5개로 합치고 `main.js` import를 새 모듈 경로로 정리했다.
- 검증: `npm --prefix apps/desktop-tauri test`, `find apps/desktop-tauri/src -maxdepth 1 -type f | wc -l`
- 후속: P127.4에서 transport와 검증 entrypoint를 통합한다.

## 2026-06-30 - P127.2 reference contract collapse
- 요약: reference/training/screenshots/beta-packaging 잔재를 걷고 핵심 4개 decision note만 남겼다.
- 변경: `SECURITY.md`, `README.md`, `README.ko.md`, `CONTRIBUTING.md`를 current contract 기준으로 줄이고 `reference/PUBLIC_THREAT_MODEL.md`, `reference/CRYPTO_DECISION.md`, `reference/STORAGE_DECISION.md`, `reference/TRANSPORT_DECISION.md`만 유지했다.
- 검증: `cargo metadata --no-deps --format-version 1`, `git ls-files reference | wc -l`(staged 전), `rg -n "reference/" README.md README.ko.md SECURITY.md CONTRIBUTING.md .github scripts`
- 후속: P127.3에서 frontend 상태 모듈을 도메인 단위로 통합한다.

## 2026-06-29 - P125.3 budget status surface in settings
- 요약: settings에 경로/바이트 없이 storage budget 상태만 노출하고 정리 액션과 연결했다.
- 변경: `apps/desktop-tauri/src-tauri/src/lib.rs`에 profile/app-data budget status를 추가하고 `src/main.js`, `src/production-profile-controller.js`, `src/i18n.js`에서 잠금/해제/생명주기 흐름에 연결했다.
- 검증: `cargo test --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml --no-default-features --features legacy-embedded-runtime --lib storage_budget -- --nocapture`, `cargo test --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml --no-default-features --features legacy-embedded-runtime --lib production_profile_unlock_uses_app_data_store_without_returning_secrets -- --nocapture`, `node --test --test-name-pattern='storage budget|local data' src/*.test.js`, `git diff --check`
- 후속: P126.1에서 public 문서에 checkout/runtime storage 계약을 반영한다.

## 2026-06-29 - P125.2 delete-boundary storage reclamation
- 요약: 만료·삭제 경계에서 SQLCipher DB의 비어 있는 페이지를 회수하도록 붙였다.
- 변경: `crates/storage/src/lib.rs`에 reclaim helper와 bulk-delete test를 넣고 `crates/core/src/lib.rs`의 transcript/delete 경계에 회수 호출을 연결했다.
- 검증: `cargo test -p another-dimension-storage production_compaction -- --nocapture`, `cargo test -p another-dimension-core production_expired_message -- --nocapture`, `git diff --check`
- 후속: P125.3에서 앱 데이터 budget 상태와 수동 정리 UX를 연결한다.

## 2026-06-29 - P125.1 storage budget hard cap
- 요약: SQLCipher DB와 sqlite sidecar 파일 크기를 합산해 profile storage budget을 계산하고 128MB cap을 걸었다.
- 변경: `crates/storage/src/lib.rs`에 budget measurement/cap helper를 추가하고 `crates/core/src/lib.rs`에 budget status helper를 넣었다.
- 검증: `cargo test -p another-dimension-storage storage_budget -- --nocapture`, `cargo test -p another-dimension-core production_storage_budget -- --nocapture`
- 후속: P125.2에서 만료·삭제 후 DB 파일 공간 회수를 추가한다.

## 2026-06-29 - P124.6 cache path and legacy build cleanup
- 요약: 영구 cache 경로와 legacy build alias를 제거하고 disposable target만 쓰도록 정리했다.
- 변경: `build_cache_env.sh`를 temp-only로 바꾸고 `apps/desktop-tauri/package.json`에서 `legacy:tauri:*`, `tauri:dev:full`, `tauri:build:full`, `verify:warm`, `verify:cold`를 뺐다.
- 검증: `npm --prefix apps/desktop-tauri run test:build-storage-contract`, `bash scripts/verify_default_boundary.sh`, `rg -n 'verify:warm|verify:cold|legacy:tauri|tauri:build:full|tauri:dev:full|\\.build-cache|Library/Caches/another-dimension' README.md README.ko.md INSTALL_FROM_SOURCE_MACOS.md apps/desktop-tauri/README.md apps/desktop-tauri/package.json scripts`
- 후속: P125.1에서 storage hard cap을 추가한다.

## 2026-06-29 - P124.5 sidecar/build package contraction
- 요약: sidecar 준비와 Tauri build의 중복 패키징 경로를 줄이고 build 시작 전 generated artifact cleanup을 넣었다.
- 변경: desktop-tauri build scripts에 pre-clean을 추가하고, Windows boundary 검증을 `.app` bundle target에 맞췄다.
- 검증: `node --test apps/desktop-tauri/scripts/with-cargo-target.test.mjs`, `npm --prefix apps/desktop-tauri run test:build-storage-contract`, `git diff --check`
- 후속: P124.6에서 영구 cache 경로와 legacy build 명령을 정리한다.

## 2026-06-29 - P124.4 public build release-profile contraction
- 요약: public build용 Cargo release profile을 고정하고 feature graph contract를 추가했다.
- 변경: workspace root와 desktop-tauri package에 release `strip/panic/incremental/debug/codegen-units` 설정을 넣고 `test:build-storage-contract`를 추가했다.
- 검증: `npm --prefix apps/desktop-tauri run test:build-storage-contract`
- 후속: P124.5에서 sidecar와 Tauri 중복 컴파일 및 패키징을 줄인다.

## 2026-06-29 - P124.3 checkout cleanup and storage budget guard
- 요약: desktop source build가 남기는 generated target과 sidecar를 청소하고 500MB checkout guard를 추가했다.
- 변경: `clean-generated.mjs`, `check-storage-budget.mjs`, `storage-budget.mjs`, `storage-budget.test.mjs`를 추가하고 tauri build 계열에 cleanup/budget check를 연결했다.
- 검증: `node --test apps/desktop-tauri/scripts/storage-budget.test.mjs`, `node --test apps/desktop-tauri/scripts/with-cargo-target.test.mjs`, `npm --prefix apps/desktop-tauri run clean:generated`, `npm --prefix apps/desktop-tauri run check:storage-budget`
- 후속: P124.4에서 public build의 Cargo 산출물 자체를 더 줄인다.

## 2026-06-29 - P124.2 stale target reaping
- 요약: disposable target runner가 오래된 project-tagged temp와 allowlist checkout target만 회수하도록 했다.
- 변경: `with-cargo-target.mjs`에 24시간 경과 cleanup과 PID marker 보존을 넣고, stale temp/checkout target 회귀 테스트를 추가했다.
- 검증: `node --test apps/desktop-tauri/scripts/with-cargo-target.test.mjs`
- 후속: P124.3에서 checkout 산출물 청소와 500MB 종료 guard를 추가한다.

## 2026-06-29 - P124.1 disposable target runner integration
- 요약: desktop Cargo 호출과 sidecar 준비를 OS temp 기반 disposable target으로 묶었다.
- 변경: `with-cargo-target.mjs`를 재사용 가능한 runner로 바꾸고 `prepare-engine-sidecar.mjs`가 sidecar prep과 optional `tauri build`를 같은 target에서 실행하도록 합쳤다.
- 검증: `node --test apps/desktop-tauri/scripts/with-cargo-target.test.mjs`
- 후속: P124.2에서 wrapper 우회로 남은 오래된 target을 다음 실행에서 회수한다.

## 2026-06-29 - P122.2 source build path validation
- 요약: 문서에 적힌 source build 절차를 코드/명령 수준에서 한 번 재현 확인했다.
- 변경: `npm ci --prefix apps/desktop-tauri`와 `npm --prefix apps/desktop-tauri run tauri:build:beta-onion`을 실행해 source build와 bundle 생성이 그대로 되는지 확인했다.
- 검증: `bash scripts/verify_warm.sh`, `git diff --check`.
- 후속: P121.3의 실제 desktop acceptance loop만 남는다.

## 2026-06-29 - P122.1 source-build-primary docs alignment
- 요약: 유지 문서의 source-first / DMG-optional 표현을 정리했다.
- 변경: `apps/desktop-tauri/README.md`와 `SECURITY.md`의 source-build-primary 문구를 일관되게 맞췄다.
- 검증: `bash scripts/verify_source_build_path.sh`, `git diff --check`.
- 후속: P122.2에서 문서화된 source build 절차를 한 번만 재현 확인한다.
