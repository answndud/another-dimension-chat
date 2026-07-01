# PLAN.md

## Goal

macOS Apple Silicon 사용자가 소스를 빌드하지 않고 GitHub Releases의 unsigned DMG로 Another Dimension Chat v0.1을 설치할 수 있게 한다. 릴리스마다 앱, sidecar, 버전, 아키텍처, SHA-256, 공개 경고 문구를 자동 검증하고, 최초 실행은 macOS의 공식 `Open Anyway` 절차만 안내한다.

## Acceptance Bar

- 기본 공개 설치 경로는 GitHub Release의 macOS Apple Silicon unsigned DMG이며 source build는 개발자 대체 경로로 남긴다.
- DMG에는 `Another Dimension Chat.app`과 `/Applications` 바로가기가 있고 앱 번들 안에 release manual-E2EE sidecar가 포함된다.
- 파일명, Tauri 버전, Git tag, build commit, `arm64` 아키텍처가 일치하지 않으면 publish하지 않는다.
- Release에는 DMG와 별도 `SHA256SUMS.txt`를 게시하고 문서에 `shasum -a 256 -c` 검증 절차를 제공한다.
- DMG와 앱이 Developer ID로 서명·공증되지 않았으며 체크섬이 Apple의 신뢰 검증이나 보안 감사를 대체하지 않는다고 다운로드 전에 표시한다.
- 최초 실행은 Apple의 `시스템 설정 > 개인정보 보호 및 보안 > 확인 없이 열기` 절차를 안내하고 `xattr`, Gatekeeper 비활성화, 자체 인증서 설치를 요구하지 않는다.
- fresh macOS 사용자 계정에서 다운로드, 체크섬 확인, 설치, 최초 실행, 앱 재실행, 두 프로필 메시지 왕복과 재시작 후 복구까지 통과한다.
- 릴리스 실패나 acceptance 실패 시 기존 Release를 덮어쓰지 않고 문제 버전의 공개 publish를 중단한다.

## Next

- 위임: P130.3
- 목표: fresh-account에서 unsigned DMG 설치와 핵심 1:1 흐름 acceptance를 기록한다.
- 파일: `docs/PLAN.md`, `docs/DONE.md`
- 검증: acceptance 결과에 macOS version, chip, release tag, commit, DMG checksum, 각 단계 pass/fail만 기록
- 메모: 실제 fresh-account macOS 계정과 공개 prerelease asset이 필요하다.
- 기록 형식:
  - `macOS version=...`
  - `chip=...`
  - `release tag=...`
  - `commit=...`
  - `DMG checksum=...`
  - `download=pass/fail`
  - `checksum=pass/fail`
  - `install=pass/fail`
  - `open-anyway=pass/fail`
  - `pairing-message-roundtrip=pass/fail`
  - `restart-recovery=pass/fail`
  - `uninstall-boundary=pass/fail`

## Active

### P128 - unsigned DMG 산출물 계약

- 상태: pending
- 목표: 개발 머신과 CI가 동일한 명령으로 배포 가능한 DMG를 만들고 잘못된 번들을 publish 전에 거부한다.
- 범위:
  - 수정: Tauri bundle 설정, npm release 명령, 산출물 검사 스크립트와 focused test
  - 참조: `apps/desktop-tauri/src-tauri/tauri.sidecar.conf.json`, `apps/desktop-tauri/scripts/run-clean-build.mjs`
  - 보존: checkout 외부 임시 Cargo target과 빌드 종료 후 생성물 정리 계약
- slices:
  1. P128.1 - DMG bundle target 추가
     - 파일: `apps/desktop-tauri/src-tauri/tauri.conf.json`, `apps/desktop-tauri/package.json`, `apps/desktop-tauri/scripts/build-storage-contract.test.mjs`
     - 변경: macOS bundle target을 `dmg`로 전환하고 `tauri:build:macos-dmg:beta-onion` 명령이 release manual-E2EE sidecar와 DMG만 만들게 한다.
     - 검증: `npm --prefix apps/desktop-tauri run test:build-storage-contract`
     - 완료: 한 명령의 기대 산출물이 `bundle/dmg/*.dmg`이고 기존 clean-build cleanup 동작이 테스트로 고정된다.
     - 금지: Developer ID identity, notarization credential, updater를 추가하지 않는다.
  2. P128.2 - DMG release packet 생성기 추가
     - 파일: `apps/desktop-tauri/scripts/prepare-macos-release.mjs`, `apps/desktop-tauri/scripts/prepare-macos-release.test.mjs`, `apps/desktop-tauri/package.json`, `.gitignore`
     - 변경: 단일 DMG를 버전·아키텍처가 포함된 고정 파일명으로 복사하고 `SHA256SUMS.txt`와 commit/version/build-channel 메타데이터를 생성한다. 생성 packet은 ignored 경로에만 둔다.
     - 검증: `node --test apps/desktop-tauri/scripts/prepare-macos-release.test.mjs`
     - 완료: 누락·복수 DMG, 버전 불일치, 잘못된 channel, 비-`arm64` 앱 또는 sidecar에서 실패하고 정상 fixture에서는 DMG와 checksum manifest만 출력한다.
     - 금지: 체크섬을 서명 또는 출처 인증으로 표현하지 않는다.
  3. P128.3 - 실제 DMG 구조와 실행 파일 검사 추가
     - 파일: `apps/desktop-tauri/scripts/verify-macos-dmg.mjs`, `apps/desktop-tauri/scripts/verify-macos-dmg.test.mjs`, `scripts/verify_light.sh`, `apps/desktop-tauri/package.json`
     - 변경: DMG attach 후 `.app`, `/Applications` 링크, bundle identifier/version, 주 실행 파일과 sidecar의 `arm64`, 금지된 debug 산출물 부재를 검사하고 항상 detach한다.
     - 검증: `node --test apps/desktop-tauri/scripts/verify-macos-dmg.test.mjs` 및 실제 macOS에서 `npm --prefix apps/desktop-tauri run verify:macos-dmg -- <path>`
     - 완료: 변조 fixture가 각 경계에서 실패하고 실제 DMG 검사가 성공한다.
     - 금지: 검증 과정에서 quarantine 제거 또는 앱 데이터 삭제를 하지 않는다.
- 검증: `scripts/verify_light.sh` 후 실제 Apple Silicon macOS에서 DMG build·packet·verify 명령을 순서대로 실행한다.
- 완료: publish 입력으로 사용할 DMG packet이 수동 파일 선택 없이 생성되고 구조·identity·architecture 검사를 통과한다.

### P129 - GitHub Release 자동화

- 상태: pending
- 목표: 검증된 tag에서 Apple Silicon unsigned DMG를 빌드하고 승인된 GitHub Release에만 첨부한다.
- 범위:
  - 수정: macOS release workflow, release metadata 검증, generated artifact tracking guard
  - 참조: `.github/workflows/verify.yml`, `.github/workflows/windows-public-artifact.yml`, `REPRODUCIBLE_BUILD_MACOS.md`
  - 보존: 기본 CI의 `contents: read` 최소 권한과 기존 Windows candidate workflow
- slices:
  1. P129.1 - macOS runner 빌드 job 추가
     - 파일: `.github/workflows/macos-unsigned-release.yml`, `REPRODUCIBLE_BUILD_MACOS.md`
     - 변경: 수동 dispatch로 시작해 입력 tag가 현재 commit을 가리키고 `v<tauri-version>`과 일치하는지 확인한다. Apple Silicon runner, 고정 Node/Rust 기준, `npm ci`, `verify_light`, DMG build, packet 검증을 수행하고 짧은 보존 기간의 Actions artifact로 올린다.
     - 검증: workflow syntax 검사와 GitHub의 non-publish dry run 1회
     - 완료: runner architecture와 tool versions가 로그에 남고 DMG·checksum·metadata artifact가 생성된다.
     - 금지: pull request나 일반 push에서 release를 만들지 않고 cache에 완성 DMG나 앱 데이터를 저장하지 않는다.
  2. P129.2 - publish job과 immutable release 규칙 추가
     - 파일: `.github/workflows/macos-unsigned-release.yml`, `apps/desktop-tauri/scripts/prepare-macos-release.mjs`
     - 변경: GitHub environment 승인 뒤에만 `contents: write`로 정확한 tag의 새 prerelease를 만들고 DMG와 `SHA256SUMS.txt`를 업로드한다. 같은 tag/asset 존재, tag 이동, checksum 재계산 불일치에서는 실패한다.
     - 검증: 임시 prerelease tag로 upload 후 asset 다운로드 checksum 비교, 실패 시나리오 dry run
     - 완료: 릴리스 본문에 unsigned/not notarized/not audited 경고, 지원 링크, checksum 명령이 있고 workflow 재실행이 기존 asset을 덮어쓰지 않는다.
     - 금지: `latest` stable 표시, 자동 updater manifest, 장기 credential을 추가하지 않는다.
  3. P129.3 - release provenance와 보존 경계 고정
     - 파일: `.github/workflows/macos-unsigned-release.yml`, `.github/workflows/verify.yml`, `scripts/verify_source_build_path.sh`
     - 변경: release body 또는 metadata에 tag, full commit SHA, runner architecture, app version을 기록하고 generated release 경로가 git에 tracked되지 않는지 검사한다.
     - 검증: `AD_VERIFY_SOURCE_BUILD_SKIP_BUILD=1 scripts/verify_source_build_path.sh` 및 GitHub에서 release asset을 새 디렉터리에 재다운로드해 checksum 확인
     - 완료: 공개 asset에서 원본 commit과 build identity를 확인할 수 있고 checkout에 DMG나 release packet이 남지 않는다.
     - 금지: GitHub checksum을 독립적인 암호학적 서명으로 주장하지 않는다.
- 검증: prerelease 1회를 만들고 다른 Mac에서 GitHub Release 페이지로만 DMG와 checksum을 내려받아 일치 여부를 확인한다.
- 완료: maintainer의 로컬 빌드 파일 업로드 없이 승인된 workflow가 immutable prerelease를 게시한다.

### P130 - 사용자 설치와 acceptance

- 상태: pending
- 목표: 일반 사용자가 소스 빌드나 터미널 기반 보안 우회 없이 DMG를 설치하고 핵심 1:1 로컬 흐름을 검증할 수 있게 한다.
- 범위:
  - 수정: 공개 README·보안·지원 문구, 설치 문서, source-build 계약 검사
  - 참조: Apple의 미확인 개발자 앱 열기 공식 안내
  - 보존: not audited, not production-ready, not for sensitive communication 비주장
- slices:
  1. P130.1 - unsigned DMG 설치 문서 전환
     - 파일: `README.md`, `README.ko.md`, `SECURITY.md`, `SUPPORT.md`
     - 변경: GitHub Release DMG를 기본 설치 경로로 바꾸고 Apple Silicon/macOS 12+, checksum 확인, Applications 이동, 최초 차단 후 `Open Anyway`, 삭제 방법, source build 대체 경로를 짧게 안내한다.
     - 검증: `rg -n "source-build-primary|legacy unsigned DMG|signed|notarized|xattr|Open Anyway" README.md README.ko.md SECURITY.md SUPPORT.md`
     - 완료: 네 문서가 동일한 배포 상태와 제한을 말하고 다운로드 전에 unsigned 경고를 볼 수 있다.
     - 금지: Gatekeeper 전체 비활성화, `xattr`, 민감한 진단 자료 게시를 안내하지 않는다.
  2. P130.2 - 전용 설치·체크섬 안내와 계약 검사 갱신
     - 파일: `INSTALL_UNSIGNED_DMG_MACOS.md`, `INSTALL_FROM_SOURCE_MACOS.md`, `scripts/verify_source_build_path.sh`, `.github/ISSUE_TEMPLATE/public_beta_support.yml`
     - 변경: GUI 설치와 `shasum -a 256 -c SHA256SUMS.txt`를 분리해 설명하고, 공식 Apple 지원 링크·오류별 복구·지원 시 허용 정보만 기록한다. 검증 스크립트와 issue template을 DMG-primary 상태로 맞춘다.
     - 검증: `AD_VERIFY_SOURCE_BUILD_SKIP_BUILD=1 scripts/verify_source_build_path.sh`
     - 완료: 문서 drift 검사에서 DMG-primary, checksum, unsigned 경고, 금지된 bypass 부재가 자동 확인된다.
     - 금지: 앱 암호, invite, payload, 메시지, raw log, 로컬 경로를 지원 정보로 요구하지 않는다.
  3. P130.3 - fresh-account 설치 acceptance 실행
     - 파일: `docs/PLAN.md`, `docs/DONE.md`
     - 변경: 공개 prerelease를 fresh macOS 사용자 계정에서 다운로드해 checksum, drag-install, 최초 실행 승인, 두 프로필 pairing/safety 확인, 양방향 sealed message, 종료·재실행 후 transcript 복구, 손상 payload와 중복 message 거부, uninstall 후 앱 데이터 보존/수동 삭제 경계를 확인한다.
     - 검증: acceptance 결과에 macOS version, chip, release tag, commit, DMG checksum, 각 단계 pass/fail만 기록하고 private 값은 기록하지 않는다.
     - 완료: 모든 항목이 통과하고 실패 시 사용자에게 보이는 복구 문구가 실제 macOS 화면과 일치한다.
     - 금지: 실제 민감한 메시지나 운영 프로필을 테스트에 사용하지 않는다.
  4. P130.4 - 첫 public prerelease 게시 판단
     - 파일: `README.md`, `README.ko.md`, `SECURITY.md`, `docs/PLAN.md`, `docs/DONE.md`
     - 변경: acceptance가 통과한 동일 tag·checksum의 prerelease만 공개 상태로 유지하고 문서 링크를 해당 Release 설치 경로에 맞춘다. 실패하면 Release를 공개 설치 경로로 선언하지 않고 원인 수정 slice를 새로 만든다.
     - 검증: 익명 브라우저에서 README → Release → DMG/checksum → 설치 안내 링크를 따라가며 404, stale version, claim drift가 없는지 확인한다.
     - 완료: 신규 사용자가 저장소 checkout 없이 설치를 시작할 수 있고 공개 문구와 실제 asset이 일치한다.
     - 금지: acceptance 전 stable release 또는 secure messenger readiness를 선언하지 않는다.
- 검증: `scripts/verify_light.sh`, prerelease asset checksum 재검증, fresh-account 수동 acceptance를 모두 통과한다.
- 완료: unsigned DMG가 문서·지원·실제 설치 동작이 일치하는 기본 공개 베타 경로가 된다.

## Backlog

- Developer ID 서명·공증은 별도 비용과 credential 운영 결정을 한 뒤 새 phase로 추가한다.
- 자동 업데이트는 신뢰 가능한 서명 체계를 갖추기 전에는 도입하지 않는다.
- Intel macOS universal binary와 Windows 공개 설치본은 v0.1 unsigned Apple Silicon DMG 범위 밖이다.
