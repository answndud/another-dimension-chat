# Another Dimension Chat — Unsigned Public Beta

<p>
  <img src="https://img.shields.io/badge/status-unsigned%20beta-orange" alt="Status">
  <img src="https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-UNLICENSED-red" alt="License">
</p>

[English](README.md) | 한국어

**실험적 local-first 1:1 개인 메신저.**
서명되지 않은 공개 베타 — 감사되지 않음, 프로덕션 준비 안 됨.
민감한 통신에 사용하지 말 것.

전화번호, 이메일, 글로벌 계정, contact discovery, 메시지 릴레이,
푸시 알림, 클라우드 백업 없음. **Rust**와 **Tauri**로 제작.

## 스크린샷

<table>
<tr>
  <td><img src="reference/screenshots/macos-public-beta-first-run-desktop.png" width="320" alt="첫 실행"></td>
  <td><img src="reference/screenshots/macos-public-beta-room-flow-desktop.png" width="320" alt="페어룸"></td>
  <td><img src="reference/screenshots/macos-public-beta-manual-envelope-desktop.png" width="320" alt="봉투 내보내기"></td>
</tr>
<tr>
  <td align="center">프로필 생성</td>
  <td align="center">페어와이즈 룸 &amp; 초대</td>
  <td align="center">암호화 봉투 내보내기</td>
</tr>
</table>

[더 많은 스크린샷](reference/screenshots/)

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

출력이 `OK`여야 진행. macOS에서 차단되면 System Settings > Privacy & Security
에서 허용.

## 빠른 시작

1. 로컬 프로필 생성.
2. 초대 코드 또는 QR로 페어와이즈 룸 생성 또는 참가.
3. 상대와 safety material 비교.
4. 메시지 작성 → 암호화된 봉투 내보내기.
5. 원하는 채널(Signal, 이메일 등)로 봉투 전달.
6. 상대쪽에서 봉투 가져오기.

## 플랫폼

**macOS Apple Silicon** (unsigned DMG). Windows, Android, iOS: source-only.

## 중요

이 베타는 **어떤 보안 claim도 하지 않음**. [SECURITY.md](SECURITY.md) 참고.
지원은 redacted public issue로 — invite code, payload, key, raw log 게시 금지.

## 소스에서 빌드

```sh
git clone https://github.com/answndud/another-dimension-chat.git
cd another-dimension-chat
scripts/verify_all.sh   # 가벼운 검증
scripts/verify_full.sh  # 전체 사전-릴리즈 검증
```

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md) 참고.
