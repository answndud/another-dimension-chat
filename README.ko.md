# Another Dimension Chat — Web-first prototype

[English](README.md) | 한국어

**계정·전화번호·contact discovery·중앙 메시지 저장·push 없이 브라우저에서
실행하는 1:1 암호화 메시지 prototype.**

현재 제품 방향은 static web app입니다. 브라우저에서 프로필과 메시지 키를
만들고, 암호화된 로컬 프로필 자료와 transcript를 IndexedDB에 저장하며,
서명된 invite와 sealed message envelope를 사용자가 선택한 채널로 직접
전달합니다.

> **현재 상태:** web-first 실험용 prototype. 감사되지 않았고,
> production-ready가 아니며, 민감한 통신에 사용하면 안 됩니다. 아직 public
> hosting과 신뢰 가능한 자동 전달은 제공하지 않습니다.

## 현재 웹 prototype에서 동작하는 것

- passphrase를 사용하는 로컬 브라우저 프로필 생성·unlock
- 서명된 공개 invite 생성과 상대 invite 검증
- 메시지 전에 비교하는 deterministic safety phrase
- 브라우저에서 메시지 암호화 및 sealed envelope 내보내기
- 상대 envelope 가져오기 및 로컬 복호화
- 같은 envelope의 중복 가져오기 거부
- IndexedDB 기반 프로필 자료와 transcript 저장·재unlock 복구

기본 전달 방식은 수동 전달입니다. invite나 sealed envelope를 복사해서
사용자가 선택한 채널로 보내며, 앱은 메시지 서버를 실행하지 않습니다.

## 로컬 실행

```sh
npm ci --prefix apps/desktop-tauri
npm --prefix apps/desktop-tauri run dev
```

Vite가 출력하는 로컬 URL을 엽니다. 현재 web migration 동안에는 기존
소스 위치를 임시로 사용합니다. 다음 배포 slice에서 web surface를 별도
`apps/web` 패키지와 static hosting 설정으로 옮깁니다.

## 웹 보안 경계

브라우저 runtime은 Web Crypto와 IndexedDB를 사용합니다. 서버 없는 수동
흐름에서는 private key, passphrase, 평문 메시지, transcript를 업로드하지
않습니다. 단, 브라우저 저장소와 unlock된 메모리는 기기, 브라우저 프로필,
확장 프로그램, 로컬 악성코드의 영향을 받습니다.

이 prototype은 production E2EE, anonymity, 신뢰 가능한 전달, secure
deletion, backup recovery, rollback protection, compromised endpoint 방어를
주장하지 않습니다. 현재 브라우저 암호화 흐름은 prototype 경계이며,
review된 Signal 또는 Noise 배포와 동등하지 않습니다.

## 아직 포함하지 않는 것

- 계정·전화번호·이메일 identity·검색 username·contact discovery
- 중앙 메시지 relay·push·cloud backup·계정 복구
- 자동 online delivery·WebRTC·Tor/onion·offline mailbox
- 그룹 채팅·파일·통화·multi-device 동기화
- public hosting·서명 release·공증·production security 주장

자동 전달은 이후 opaque relay 또는 signaling 서비스로 별도 검토합니다.
그 서버가 평문·private key·identity discovery를 보유해서는 안 되며,
WebRTC/IP 노출도 명시적으로 다뤄야 합니다.

## 검증

```sh
npm --prefix apps/desktop-tauri test
npm --prefix apps/desktop-tauri run build
```

현재 Node 통합 테스트는 두 로컬 프로필, invite 검증, Web Crypto envelope
암복호화, 중복 거부, unlock 후 transcript 복구를 확인합니다. 실제 브라우저
context acceptance는 로컬 browser automation binary가 준비된 뒤 진행합니다.

## 보안 및 지원

사용 전에 [SECURITY.md](SECURITY.md)를 읽으세요. 민감한 통신에는 사용하지
마세요. 공개 지원 요청에 invite code, envelope, key, passphrase, 평문
메시지, raw log, 로컬 경로, private room screenshot을 포함하지 마세요.

[CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md),
[MIT license](LICENSE)도 참고하세요.
