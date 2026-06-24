# Another Dimension Chat — Unsigned Public Beta

<p>
  <img src="https://img.shields.io/badge/status-unsigned%20beta-orange" alt="Status">
  <img src="https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

[English](README.md) | 한국어

**계정, 전화번호, contact discovery, 클라우드 메시지 저장,
푸시 알림 의존성을 피하는 local-first 1:1 메신저 베타.**

**Rust**와 **Tauri**로 제작. 현재 테스트 흐름은 pairwise invite room,
safety material 비교, 로컬 암호화 저장, 수동 sealed-message 교환을 사용.

> **현재 상태:** 서명되지 않은 macOS Apple Silicon 베타. 감사되지 않았고,
> production-ready가 아니며, 민감한 통신에 사용하면 안 됨.

## 지금 제공하는 이점

| 이점 | 현재 베타 동작 |
|------|----------------|
| 계정 생성 없음 | 내 기기에 로컬 프로필 생성 |
| 공개 식별자 없음 | 초대 코드로 한 사람과만 연결 |
| 중앙 메시지 저장 없음 | 내보내기 전까지 메시지는 로컬에 보관 |
| 전달 채널 직접 선택 | sealed message를 원하는 채널로 전달 |
| 명확한 안전 확인 | room 사용 전 safety material 비교 |

## 다운로드

> [**another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned**](https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned)

Assets에서 **2개 파일** 다운로드:

| 파일 | 용도 |
|------|------|
| `*.dmg` | 앱 |
| `*.dmg.sha256` | 체크섬 검증 |

열기 전에 검증:

```sh
shasum -a 256 -c *.dmg.sha256
```

예상 출력:

```text
another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg: OK
```

출력이 `OK`여야 진행. macOS에서 차단되면 checksum 검증 후
System Settings > Privacy & Security에서 허용.

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
| macOS Apple Silicon | unsigned DMG beta |
| Windows | 공개 앱 없음 |
| Android / iOS | 공개 앱 없음 |

## 중요

이 베타는 **어떤 보안 claim도 하지 않음**. 실험적 onion/network delivery는
명시적 동작이고 fail-closed이며, 신뢰 가능한 전달 claim이 아님.

[SECURITY.md](SECURITY.md) 참고. 지원은 redacted public issue로 요청:
invite code, payload, key, raw log, private room screenshot 게시 금지.

## 소스에서 빌드

```sh
git clone https://github.com/answndud/another-dimension-chat.git
cd another-dimension-chat
scripts/verify_all.sh   # 가벼운 검증
scripts/verify_full.sh  # 전체 사전-릴리즈 검증
```

## 프로젝트 문서

| 필요 | 시작 문서 |
|------|-----------|
| 보안 경계 | [SECURITY.md](SECURITY.md) |
| 지원 / 버그 제보 | [SUPPORT.md](SUPPORT.md) |
| 기여 | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 라이선스 | [MIT](LICENSE) |
