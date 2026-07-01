# Another Dimension Chat — Unsigned DMG Primary

<p>
  <img src="https://img.shields.io/badge/status-unsigned%20DMG%20primary-blue" alt="Unsigned DMG primary">
  <img src="https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

[English](README.md) | 한국어

**계정, 전화번호, contact discovery, 클라우드 메시지 저장,
푸시 알림 의존성을 피하는 local-first 1:1 메신저 베타.**

**Rust**와 **Tauri**로 제작. 현재 테스트 흐름은 pairwise invite room,
safety material 비교, 로컬 암호화 저장, 수동 sealed-message 교환을 사용.

> **현재 상태:** unsigned DMG primary macOS Apple Silicon 베타. 감사되지
> 않았고, production-ready가 아니며, 민감한 통신에 사용하면 안 됨.

## 지금 제공하는 이점

| 이점 | 현재 베타 동작 |
|------|----------------|
| 계정 생성 없음 | 내 기기에 로컬 프로필 생성 |
| 공개 식별자 없음 | 초대 코드로 한 사람과만 연결 |
| 중앙 메시지 저장 없음 | 내보내기 전까지 메시지는 로컬에 보관 |
| 전달 채널 직접 선택 | sealed message를 원하는 채널로 전달 |
| 명확한 안전 확인 | room 사용 전 safety material 비교 |

## macOS 설치

Apple 칩이 탑재된 Mac(M1 이상)에서 사용할 수 있습니다. Intel Mac은 아직
지원하지 않습니다.

### [macOS용 앱 다운로드](https://github.com/answndud/another-dimension-chat/releases/download/v0.1.0-beta-onion-unsigned/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg)

1. 위의 **macOS용 앱 다운로드**를 클릭합니다.
2. 다운로드된 파일을 엽니다.
3. **Another Dimension Chat**을 **Applications(응용 프로그램)** 폴더로
   드래그합니다.
4. Applications 폴더에서 앱을 실행합니다.

이 베타는 Apple Developer ID로 서명되지 않아 첫 실행이 차단될 수 있습니다.
그럴 때는 **시스템 설정 > 개인정보 보호 및 보안**을 열고 아래로 스크롤한
다음 **확인 없이 열기(Open Anyway)**를 클릭하세요.

선택적인 다운로드 검증, 문제 해결, 삭제 방법은
[unsigned DMG로 macOS 설치](INSTALL_UNSIGNED_DMG_MACOS.md)를 참고하세요.

## 개발자용

macOS 앱을 소스에서 직접 빌드하려면 아래 안내를 따르세요.

- [macOS에서 소스 빌드로 설치](INSTALL_FROM_SOURCE_MACOS.md)

짧은 버전:

```sh
git clone https://github.com/answndud/another-dimension-chat.git
cd another-dimension-chat
npm ci --prefix apps/desktop-tauri
npm --prefix apps/desktop-tauri run tauri:build:beta-onion
```

빌드된 앱 번들은
`apps/desktop-tauri/src-tauri/target/release/bundle/macos/Another Dimension Chat.app`
에 생성됩니다.
이 source build 경로는 app 번들 전용이며, 다운로드한 GitHub Release DMG에
의존하지 않습니다.

이 경로의 저장공간 계약은 다음과 같습니다.

- clean build 도중에는 Rust/Tauri 임시 공간이 500MB를 넘을 수 있지만,
  그 임시 target 데이터는 checkout 밖에서만 만들어지고 빌드 종료 후
  삭제됩니다.
- 빌드가 끝난 뒤 저장소 checkout 자체는 500MB 이하를 유지해야 하며,
  영구적인 `target/`, `src-tauri/target/`, `.build-cache/`가 남지 않아야
  합니다.
- 런타임 앱 소유 데이터 예산은 checkout과 별개입니다. 현재 로컬 runtime
  목표는 앱 데이터 총합 256MB이며, 프로필별 암호화 저장소 쓰기는 128MB로
  제한됩니다.
- 전역 Rust toolchain, Cargo registry/cache, 공유 npm dependency 다운로드는
  다른 프로젝트와 공유되는 머신 단위 개발 비용이므로 checkout 500MB
  예산에 포함하지 않습니다.

재현 가능한 빌드 기준은
[macOS 재현성 빌드 노트](REPRODUCIBLE_BUILD_MACOS.md)를 보세요.

GitHub Release DMG는 macOS의 기본 설치 경로입니다. 소스 빌드는 대체
경로입니다. fallback 세부 내용은 [SECURITY.md](SECURITY.md)에만 둡니다.

## 빠른 시작

1. 로컬 프로필 생성.
2. 초대 코드로 pairwise room 생성 또는 참가.
3. 상대와 safety material 비교.
4. 메시지 작성 후 sealed message(`encrypted envelope`) 내보내기.
5. 원하는 채널로 해당 파일/텍스트 전달.
6. 상대쪽에서 가져오고 같은 방식으로 답장.

중앙 계정, 검색 가능한 username, contact discovery 서비스, 메시지 릴레이,
클라우드 백업, 푸시 알림 서비스는 없음.

## 플랫폼

| 플랫폼 | 공개 상태 |
|--------|-----------|
| macOS Apple Silicon | unsigned DMG primary, source build alternate |
| Windows | 공개 앱 없음 |

## 중요

이 베타는 **어떤 보안 claim도 하지 않음**. 실험적 onion/network delivery는
명시적 동작이고 fail-closed이며, 신뢰 가능한 전달 claim이 아님.

[SECURITY.md](SECURITY.md) 참고. 지원은 redacted public issue로 요청:
invite code, payload, key, raw log, private room screenshot 게시 금지.

## 공개 릴리스 체크리스트

공개 배포 전에 아래 항목을 확인하세요.

- macOS 경로가 unsigned DMG primary인지 확인한다.
- 다운로드한 DMG와 checksum이 같은 release asset인지 확인한다.
- 현재 베타 문구가 `not audited`, `not production-ready`, `not for sensitive communication`을 유지하는지 확인한다.
- public diagnostics가 redacted이고 room-scoped인지 확인한다.
- signing, notarization, secure messenger readiness, reliable external delivery를 주장하는 문구가 없는지 확인한다.

## 소스에서 빌드

macOS source build 대체 경로는 [macOS에서 소스 빌드로 설치](INSTALL_FROM_SOURCE_MACOS.md)를 보세요.

```sh
scripts/verify_light.sh  # source-build 경계 + 모든 desktop JavaScript 테스트
scripts/verify_full.sh   # light + rustfmt + desktop Tauri cargo check + runtime/workspace 테스트 + clippy; 사전 릴리즈 전용
```

`scripts/verify_light.sh`와 `scripts/verify_full.sh`가 canonical entrypoint입니다.
CLI smoke는 기본 검증이 아닌 수동 acceptance이며, `smoke_tauri_two_profile.sh`
는 production profile/pairing/session/transcript resume를 확인합니다.

`npm --prefix apps/desktop-tauri run check:storage-budget`는 tracked source
surface 제한도 함께 검사합니다. 기준은 tracked 파일 180개, tracked 디렉터리
45개, frontend `src/` 파일 40개, reference 4개, `scripts/`와
`apps/desktop-tauri/scripts/`를 합친 scripts 20개입니다.

## 프로젝트 문서

| 필요 | 시작 문서 |
|------|-----------|
| 보안 경계 | [SECURITY.md](SECURITY.md) |
| 지원 / 버그 제보 | [SUPPORT.md](SUPPORT.md) |
| 기여 | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 라이선스 | [MIT](LICENSE) |
