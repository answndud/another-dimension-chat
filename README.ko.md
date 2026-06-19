# Another Dimension Chat

[![Verify](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml/badge.svg)](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml)
[![Release](https://img.shields.io/badge/release-unsigned%20macOS%20beta-orange)](https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned)

[English](README.md) | 한국어

**Unsigned experimental public beta — 감사되지 않았고 프로덕션 준비 안 됨.
민감한 통신에 사용하지 말 것.**

Rust와 Tauri로 만든 local-first 1:1 private messenger 실험. 전화번호, 이메일,
글로벌 계정, contact discovery, 메시지 릴레이, 푸시 알림, 클라우드 백업이
없이 암호화 메시지를 교환한다.

## 다운로드

<https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>

두 파일을 받고 체크섬 검증:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

출력이 `OK`여야 진행. macOS에서 차단되면 System Settings > Privacy & Security
에서 허용. quarantine-removal 명령어 사용 금지.

## 빠른 시작

1. local profile 생성.
2. pairwise room 생성 또는 참가.
3. 상대와 safety material 비교.
4. 메시지 → encrypted envelope export.
5. 원하는 채널로 전달.
6. 상대쪽에서 import.

## 플랫폼

macOS Apple Silicon (unsigned DMG). Windows, Android, iOS: source-only.

## 중요

이 beta는 **어떤 보안 claim도 하지 않음**. 사용 전 [SECURITY.md](SECURITY.md) 참고.
지원은 redacted public issue로 — invite code, payload, key, raw log 게시 금지.

## 빌드 및 기여

- 가벼운 검증: `scripts/verify_all.sh`
- 전체 검증: `scripts/verify_full.sh`
- [CONTRIBUTING.md](CONTRIBUTING.md) 참고

## License

UNLICENSED
