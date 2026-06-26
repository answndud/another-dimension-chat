# Another Dimension Chat — Source Build Primary

<p>
  <img src="https://img.shields.io/badge/status-source%20build%20primary-blue" alt="Source build primary">
  <img src="https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

[English](README.md) | 한국어

**계정, 전화번호, contact discovery, 클라우드 메시지 저장,
푸시 알림 의존성을 피하는 local-first 1:1 메신저 베타.**

**Rust**와 **Tauri**로 제작. 현재 테스트 흐름은 pairwise invite room,
safety material 비교, 로컬 암호화 저장, 수동 sealed-message 교환을 사용.

> **현재 상태:** source-build-primary macOS Apple Silicon 베타. 감사되지
> 않았고, production-ready가 아니며, 민감한 통신에 사용하면 안 됨.

## 지금 제공하는 이점

| 이점 | 현재 베타 동작 |
|------|----------------|
| 계정 생성 없음 | 내 기기에 로컬 프로필 생성 |
| 공개 식별자 없음 | 초대 코드로 한 사람과만 연결 |
| 중앙 메시지 저장 없음 | 내보내기 전까지 메시지는 로컬에 보관 |
| 전달 채널 직접 선택 | sealed message를 원하는 채널로 전달 |
| 명확한 안전 확인 | room 사용 전 safety material 비교 |

## macOS 소스 빌드

기본 설치 경로는 이제 source build입니다.

GitHub Release DMG 없이 macOS에서 실행하려면 소스 빌드 안내를 따르세요.

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

재현 가능한 빌드 기준은
[macOS 재현성 빌드 노트](REPRODUCIBLE_BUILD_MACOS.md)를 보세요.

GitHub Release DMG가 있더라도, 그것은 legacy unsigned fallback입니다.
기본 설치 경로는 아닙니다.
fallback 세부 내용은 [SECURITY.md](SECURITY.md)에만 둡니다.

## 빠른 시작

1. 로컬 프로필 생성.
2. 초대 코드로 pairwise room 생성 또는 참가.
3. 상대와 safety material 비교.
4. 메시지 작성 후 sealed message(`encrypted envelope`) 내보내기.
5. 원하는 채널로 해당 파일/텍스트 전달.
6. 상대쪽에서 가져오고 같은 방식으로 답장.

중앙 계정, 검색 가능한 username, contact discovery 서비스, 메시지 릴레이,
클라우드 백업, 푸시 알림 서비스는 없음.

## 스크린샷

<table>
<tr>
  <td><img src="reference/screenshots/macos-public-beta-first-run-desktop.png" width="320" alt="로컬 프로필 생성"></td>
  <td><img src="reference/screenshots/macos-public-beta-room-flow-desktop.png" width="320" alt="페어와이즈 룸 생성"></td>
  <td><img src="reference/screenshots/macos-public-beta-manual-envelope-desktop.png" width="320" alt="sealed message 내보내기"></td>
</tr>
<tr>
  <td align="center">로컬 프로필 생성</td>
  <td align="center">초대 코드 공유</td>
  <td align="center">sealed message 내보내기</td>
</tr>
</table>

[더 많은 스크린샷](reference/screenshots/)

## 플랫폼

| 플랫폼 | 공개 상태 |
|--------|-----------|
| macOS Apple Silicon | source build primary, unsigned DMG fallback |
| Windows | 공개 앱 없음 |
| Android / iOS | 공개 앱 없음 |

## 중요

이 베타는 **어떤 보안 claim도 하지 않음**. 실험적 onion/network delivery는
명시적 동작이고 fail-closed이며, 신뢰 가능한 전달 claim이 아님.

[SECURITY.md](SECURITY.md) 참고. 지원은 redacted public issue로 요청:
invite code, payload, key, raw log, private room screenshot 게시 금지.

## 공개 릴리스 체크리스트

공개 배포 전에 아래 항목을 확인하세요.

- macOS 경로가 source-build-primary인지 확인한다.
- 다운로드한 DMG가 기본 경로처럼 읽히지 않는지 확인한다.
- 현재 베타 문구가 `not audited`, `not production-ready`, `not for sensitive communication`을 유지하는지 확인한다.
- public diagnostics가 redacted이고 room-scoped인지 확인한다.
- signing, notarization, secure messenger readiness, reliable external delivery를 주장하는 문구가 없는지 확인한다.

## 소스에서 빌드

[macOS에서 소스 빌드로 설치](INSTALL_FROM_SOURCE_MACOS.md)를 먼저 보세요.

```sh
scripts/verify_light.sh  # 빠른 경계 검증
scripts/verify_warm.sh   # 더 넓은 desktop 셸 검증
scripts/verify_cold.sh   # 사전-릴리즈 전체 검증
```

`npm --prefix apps/desktop-tauri run verify:desktop-boundary`는
`scripts/verify_light.sh`와 같은 빠른 경계 검증입니다.

## 프로젝트 문서

| 필요 | 시작 문서 |
|------|-----------|
| 보안 경계 | [SECURITY.md](SECURITY.md) |
| 지원 / 버그 제보 | [SUPPORT.md](SUPPORT.md) |
| 기여 | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 라이선스 | [MIT](LICENSE) |
