# Another Dimension Chat — Web-first prototype

[English](README.md) | 한국어

**계정·전화번호·contact discovery·중앙 메시지 저장·push 없이 브라우저에서
실행하는 1:1 암호화 메시지 prototype.**

현재 제품 방향은 사용자 소유 local server와 browser UI의 조합입니다.
프로필과 메시지 키는 브라우저에 두고, 암호화된 로컬 프로필 자료는 IndexedDB에
저장하며, 각 사용자의 서버는 opaque sealed envelope만 처리합니다.

> **현재 상태:** web-first 실험용 prototype. 감사되지 않았고,
> production-ready가 아니며, 민감한 통신에 사용하면 안 됩니다. 각 사용자가
> 자신의 local server를 실행하면 명시적으로 교환한 endpoint를 통해 sealed
> envelope를 직접 전달할 수 있습니다.

## 현재 웹 prototype에서 동작하는 것

- passphrase를 사용하는 로컬 브라우저 프로필 생성·unlock
- 서명된 공개 invite 생성과 상대 invite 검증
- 메시지 전에 비교하는 deterministic safety phrase
- 브라우저에서 메시지 암호화 및 sealed envelope 내보내기
- 상대 envelope 가져오기 및 로컬 복호화
- 같은 envelope의 중복 가져오기 거부
- IndexedDB 기반 프로필 자료와 transcript 저장·재unlock 복구
- 상대가 교환한 server endpoint로 sealed envelope 전송
- 자신의 local server inbox 동기화와 ack

기본 자동 전달은 사용자 소유 server 간에만 동작합니다. 서버가 꺼져 있거나
도달할 수 없으면 invite와 sealed envelope를 복사하는 수동 모드로 돌아갑니다.

## 로컬 실행

```sh
npm ci --prefix apps/web --workspaces=false
npm --prefix apps/web run dev --workspaces=false
```

Vite가 출력하는 로컬 URL을 엽니다. 브라우저 제품은 `apps/web`에 있고,
local server 제품은 `apps/server`에 있으며, Tauri 패키지는 선택적인 desktop
wrapper입니다.

## 사용자 기기에서 local server 실행

브라우저 bundle을 만든 뒤 사용자의 기기에서 서버를 실행합니다.

```sh
npm --prefix apps/web run build --workspaces=false
npm --prefix apps/server start --workspaces=false
```

기본 bind는 `127.0.0.1:1422`입니다. LAN이나 VPN으로 노출하려면
`AD_BIND_HOST`를 명시하고, 상대가 접근할 수 있는 주소를 `AD_PUBLIC_URL`로
설정한 뒤 네트워크 공개를 사용자가 직접 구성해야 합니다.

```sh
AD_BIND_HOST=0.0.0.0 AD_PUBLIC_URL=https://chat.example.test \
  npm --prefix apps/server start --workspaces=false
```

서버는 bounded opaque envelope만 저장하고 정적 browser UI를 제공합니다.

ChatGPT Sites나 중앙 메시지 hosting은 필요하지 않습니다.

### 네트워크 선택지

- Loopback(`127.0.0.1`, 기본값): 같은 기기 테스트용이며 다른 기기에서는
  접근할 수 없습니다.
- LAN: LAN 주소 또는 `0.0.0.0`으로 명시적으로 bind한 뒤 HTTPS reverse
  proxy를 앞에 두고, `AD_PUBLIC_URL`에는 HTTPS URL을 설정하며 방화벽 정책을
  직접 적용합니다. 일반 브라우저는 평문 HTTP LAN 페이지에서 Web Crypto를
  사용할 수 없습니다.
- VPN: Tailscale/WireGuard 인터페이스에 연결된 HTTPS 주소를
  `AD_PUBLIC_URL`로 사용합니다. VPN이 도달성을 제공하며 앱이 제공하는
  기능은 아닙니다.
- 공개 HTTPS: 직접 운영하는 reverse proxy 뒤에 서버를 두고 HTTPS와 접근
  제어를 proxy에서 설정한 뒤 HTTPS origin을 invite에 사용합니다.

서버는 UPnP, port forwarding, TLS 인증서, 인증, anonymity, availability를
자동으로 제공하지 않습니다.

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
- 자동 WebRTC·Tor/onion·offline mailbox
- 그룹 채팅·파일·통화·multi-device 동기화
- 서명 release·공증·production security 주장

중앙 relay 자동 전달은 이후 opaque relay 또는 signaling 서비스로 별도 검토합니다.
그 서버가 평문·private key·identity discovery를 보유해서는 안 되며,
WebRTC/IP 노출도 명시적으로 다뤄야 합니다.

## 검증

```sh
npm --prefix apps/web test --workspaces=false
npm --prefix apps/web run build --workspaces=false
```

현재 Node 통합 테스트는 두 로컬 프로필, invite 검증, Web Crypto envelope
암복호화, 중복·변조·replay 거부, bounded inbox, unlock 후 transcript 복구를
확인합니다. 두 local server process와 두 in-app browser origin의 실제
전송·수신·ack 왕복도 확인했습니다.

## 보안 및 지원

사용 전에 [SECURITY.md](SECURITY.md)를 읽으세요. 민감한 통신에는 사용하지
마세요. 공개 지원 요청에 invite code, envelope, key, passphrase, 평문
메시지, raw log, 로컬 경로, private room screenshot을 포함하지 마세요.

[CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md),
[MIT license](LICENSE)도 참고하세요.
