# Another Dimension Chat — Web-first prototype

[English](README.md) | 한국어

**계정·전화번호·contact discovery·중앙 메시지 저장·push 없이 브라우저에서
실행하는 1:1 암호화 메시지 prototype.**

현재 제품 방향은 사용자 소유 local server와 browser UI의 조합입니다.
프로필과 메시지 키는 브라우저에 두고, 암호화된 로컬 프로필 자료는 IndexedDB에
저장하며, 각 사용자의 서버는 opaque sealed envelope만 처리합니다.

현재 제품 경계는 `apps/web` browser UI와 `apps/server` 사용자 소유 relay입니다.
`apps/desktop-tauri`, `apps/cli`, `apps/engine` 및 기존 Rust native crates는
legacy/native prototype으로 보존되어 있지만 현재 web 제품의 release나 보안
준비도 증거가 아닙니다.

> **현재 상태:** web-first 실험용 prototype. 감사되지 않았고,
> production-ready가 아니며, 민감한 통신에 사용하면 안 됩니다. 각 사용자가
> 자신의 local server를 실행하면 명시적으로 교환한 endpoint를 통해 sealed
> envelope를 직접 전달할 수 있습니다.

> **앱 코드 공급망 경고:** 현재 local server는 편의를 위해 browser
> JavaScript/WASM도 제공합니다. server나 reverse proxy가 변조되면 암호화가
> 시작되기 전에 passphrase·평문·key가 탈취될 수 있습니다. 독립적으로 검증할
> signed app release가 아직 없으므로 고위험 통신에 사용하면 안 됩니다.

## 현재 웹 prototype에서 동작하는 것

- passphrase를 사용하는 로컬 브라우저 프로필 생성·unlock
- 서명된 공개 invite 생성과 상대 invite 검증
- 감사 이력이 있는 Rust `vodozemac`을 browser WebAssembly로 실행하는
  Olm v2 Double Ratchet session 설정
- 메시지 전에 비교하는 deterministic safety phrase
- 브라우저에서 메시지 암호화 및 sealed envelope 내보내기
- 상대 envelope 가져오기 및 로컬 복호화
- 같은 envelope의 중복 가져오기 거부
- IndexedDB 기반 프로필 자료와 transcript 저장·재unlock 복구
- 상대가 교환한 server endpoint로 sealed envelope 전송
- unlock된 room이 보이는 동안 새 envelope 자동 수신·ack 및 복구용 수동 Sync
- 상대에게 공유한 invite capability는 write-only로 제한하고 queue 조회·ack는
  소유자의 별도 local-access capability로 보호

기본 자동 전달은 사용자 소유 server 간에만 동작합니다. 서버가 꺼져 있거나
도달할 수 없으면 invite와 sealed envelope를 복사하는 수동 모드로 돌아갑니다.
최초 pairing은 서명된 Olm control envelope 두 개(`init`, `ready`)를
교환합니다. 양쪽 unlock room을 열어 두면 자동으로 진행되며,
수동 모드에서는 같은 복사·붙여넣기 입력으로 전달할 수 있습니다. 마지막
`ready` envelope를 보낸 사용자는 UI에서 전달 완료를 확인해야 메시지 입력이
활성화됩니다.

## 로컬 실행

```sh
npm ci --prefix apps/web --workspaces=false
npm --prefix apps/web run dev --workspaces=false
```

Vite가 출력하는 로컬 URL을 엽니다. 브라우저 제품은 `apps/web`에 있고,
local server 제품은 `apps/server`에 있으며, Tauri 패키지는 선택적인 desktop
wrapper입니다.

생성된 cryptography WebAssembly module은 commit되므로 일반 release build는 Rust를
다시 compile하지 않습니다. `crates/crypto` 또는 `crates/web-crypto-wasm`을
수정한 경우에만 `npm --prefix apps/web run build:crypto --workspaces=false`로
명시적으로 재생성합니다. Rust WASM target과 wasm-bindgen 0.2.121이 필요합니다.

## 사용자 기기에서 local server 실행

브라우저 bundle을 만든 뒤 사용자의 기기에서 서버를 실행합니다.

```sh
npm --prefix apps/web run build --workspaces=false
./scripts/start_local_server.sh
```

서버가 출력하는 `#local=...` fragment까지 포함된 private local UI URL을
여세요. 일반 root URL은 inbox capability를 읽거나 광고할 수 없어 의도적으로
manual mode로 동작합니다. 출력된 local UI URL을 비밀로 취급하고 log,
screenshot, support report에 포함하지 마세요.

첫 실행은 loopback 전용입니다. 환경변수를 직접 조합하지 않고 상대가 접근할
HTTPS 경로를 선택하려면 guided setup을 실행하세요. private 설정을 저장한 뒤
서버를 바로 시작합니다.

```sh
./scripts/start_local_server.sh --setup
```

기존 HTTPS reverse proxy/Tailscale Serve 또는 직접 보유한 PEM 인증서와 key를
사용하는 direct HTTPS 중에서 선택할 수 있습니다. 이후에는
`./scripts/start_local_server.sh`만 실행하면 저장된 설정을 사용합니다.

독립 실행 release archive는 다음처럼 만들 수 있습니다.

```sh
./scripts/build_release.sh
tar -xzf public-release/another-dimension-0.1.0.tar.gz
cd another-dimension-0.1.0
./scripts/start_local_server.sh
```

archive에는 빌드된 browser bundle과 server runtime이 포함되므로 압축을 푼
사용자는 Vite나 원본 저장소가 필요하지 않습니다. Node.js 20 이상이 필요합니다.

### 릴리스 무결성 확인과 서명

기본 실행은 로컬 개발용 `unsigned-development` archive입니다. archive 안에는
파일별 SHA-256 매니페스트가 들어가며, 파일이 바뀌었는지는 다음 명령으로 확인할
수 있습니다.

```sh
node scripts/verify_release_manifest.mjs .
```

고위험 배포용 archive는 운영자가 별도로 보관하는 Ed25519 PEM 개인키로 서명해야
합니다. 개인키를 저장소, archive, 로그, README에 넣지 마세요.

```sh
AD_RELEASE_SIGNING_KEY=/secure/path/release-ed25519-private.pem \
AD_RELEASE_REQUIRE_SIGNATURE=1 \
./scripts/build_release.sh
```

수신자는 별도로 전달받은 신뢰 공개키를 고정해서 검증합니다. 공개키 파일 자체를
archive에서 읽지 않는 점이 중요합니다.

```sh
node scripts/verify_release_manifest.mjs . \
  --require-signature \
  --public-key /secure/path/release-ed25519-public.pem
```

공개키 fingerprint는 매니페스트의 `signature.keyId`와 대조해야 합니다. 이 절차는
번들 변조와 잘못된 서명을 발견하지만, 운영체제·브라우저·호스트가 이미 장악된
경우나 공개키를 처음 받는 과정의 신뢰 문제까지 해결하지는 않습니다.

pairing이 성공해도 바로 메시지를 보낼 수는 없습니다. 두 사람이 서로 다른
신뢰된 채널(대면, 별도 음성 통화 등)로 화면의 전체 safety material을 비교하고,
각자 확인 버튼을 눌러야 메시지 암호화·전송이 열립니다. 이 확인은 현재 paired
session에 저장되며, 새 pairing이나 session 재설정에서는 다시 해야 합니다.

각 profile은 Olm one-time prekey를 여러 개 보유합니다. 초대는 그중 하나를
예약하고, 상대의 최초 handshake가 성공하면 해당 키를 `consumed`로 처리한 뒤
부족한 키를 보충합니다. prekey 상태는 private profile material 안에 저장되며
초대·서버·relay에는 개인키가 노출되지 않습니다. 브라우저 저장소를 복사하거나
profile을 복제하면 이 보장이 깨질 수 있으므로 profile 백업·복제 기능은 아직
안전한 기능으로 제공하지 않습니다.

초대에는 서명된 UUID와 24시간의 유효기간이 있습니다. 만료된 초대를 다시
사용하지 말고, pairing 전이라면 화면을 새로 고쳐 새 초대를 발급한 뒤 상대방과
안전한 채널로 다시 교환하세요. 이미 pairing을 완료한 세션의 초대는 세션
연속성을 위해 자동으로 바뀌지 않습니다.

두 사용자 서버의 health → opaque 전달 → ack 흐름은 다음 짧은 smoke 명령으로
확인할 수 있습니다.

```sh
node scripts/smoke_user_owned_servers.mjs
```

기본 bind는 `127.0.0.1:1422`입니다. guided 설정은 다음처럼 비대화형 명령으로도
같은 검증된 설정 파일을 만들 수 있습니다.

```sh
./scripts/start_local_server.sh --setup \
  --mode reverse-proxy --public-url https://chat.example.test \
  --cors-origin https://peer.example.test --port 1422
```

`--cors-origin`은 이 서버의 capability inbox에 브라우저가 접근할 수 있는
상대 UI origin의 허용목록입니다. 기본값은 모든 origin 허용이 아니며, 실제로
연결할 상대 origin만 HTTPS로 추가해야 합니다. 여러 origin은 쉼표로 구분합니다.

capability URL이 로그·스크린샷·초대 공유 과정에서 노출되었다고 의심되면 private
UI에서 다음 로컬 전용 API를 호출해 즉시 교체해야 합니다.

```text
POST /api/v1/inbox/rotate
Header: x-ad-local-access: <private local UI capability>
```

응답으로 새 `inboxUrl`을 받으면 기존 초대에 들어 있던 URL은 폐기하고, 상대방과
새 초대를 안전한 채널로 다시 교환해야 합니다. 이 API는 `x-ad-local-access`가
없으면 동작하지 않습니다.

reverse proxy가 앞에 있고 실제 client IP를 `X-Forwarded-For`로 전달하는 경우에만
설정 파일에 다음을 추가할 수 있습니다. proxy가 외부에서 직접 접근 가능하거나
헤더를 덮어쓰지 않는다면 활성화하지 마세요.

```json
{ "trustProxy": true }
```

public URL은 scheme과 host(선택적 port)만 있는 HTTPS origin이어야 하며 path,
credential, query, fragment를 허용하지 않습니다. 이는 초대에 들어갈 주소를
명확히 할 뿐 DNS, 방화벽, reverse proxy의 실제 도달성을 대신 만들지 않습니다.
저장 설정이 없을 때의 기존 `AD_*` 환경변수는 고급 호환 경로로 유지합니다.

서버는 bounded opaque envelope만 저장하고 정적 browser UI를 제공합니다.

ChatGPT Sites나 중앙 메시지 hosting은 필요하지 않습니다.

### 네트워크 선택지

- Loopback(`127.0.0.1`, 기본값): 같은 기기 테스트용이며 다른 기기에서는
  접근할 수 없습니다.
- LAN: LAN 주소 또는 `0.0.0.0`으로 명시적으로 bind한 뒤 HTTPS reverse
  proxy를 앞에 두고, guided setup에 HTTPS origin을 설정하며 방화벽 정책을
  직접 적용합니다. 일반 브라우저는 평문 HTTP LAN 페이지에서 Web Crypto를
  사용할 수 없습니다.
- Local UI + LAN API(개발 전용): 각자 자신의 `localhost` 서버에서 UI를 열고,
  invite는 상대의 LAN inbox를 가리키게 할 수 있습니다. sealed envelope는
  암호화된 상태로 유지되지만 HTTP capability URL은 노출되거나 opaque traffic
  주입·삭제에 악용될 수 있습니다. 통제된 네트워크에서만 사용하고 운영에는
  HTTPS를 사용하세요.
- VPN: Tailscale/WireGuard 인터페이스에 연결된 HTTPS 주소를
  guided setup의 public URL로 사용합니다. VPN이 도달성을 제공하며 앱이
  제공하는 기능은 아닙니다.
- 공개 HTTPS: 직접 운영하는 reverse proxy 뒤에 서버를 두고 HTTPS와 접근
  제어를 proxy에서 설정한 뒤 HTTPS origin을 invite에 사용합니다.

서버는 UPnP, port forwarding, TLS 인증서, 인증, anonymity, availability를
자동으로 제공하지 않습니다.

소규모 자체 운영에서는 guided `direct-tls` mode에서 PEM key와 certificate
경로를 지정해 서버가 HTTPS를 직접 종료할 수 있습니다. 공개 노출에는
유지보수되는 reverse proxy를 사용하는 편이 안전합니다.

개발용으로는 `./scripts/generate_tls_cert.sh <host-or-ip>`로 인증서를 만들 수
있습니다. self-signed 인증서이므로 브라우저가 수용하려면 각 기기의 trust
store에 직접 설치해야 하며, 스크립트는 시스템 trust 설정을 자동 변경하지
않습니다.

공개적으로 신뢰되는 비-loopback HTTPS 주소를 구성한 뒤 인증서 신뢰,
health, 초대에 광고될 origin, public opaque envelope 전달과 local-access가
필요한 조회·ack를 한 번에 확인합니다.

```sh
node scripts/check_https_endpoint.mjs https://chat.example.test
```

이 명령은 HTTP, localhost, 신뢰되지 않은 인증서, 다른 origin을 광고하는
서버를 실패로 처리합니다. 실제 브라우저에서 두 사용자의 초대를 교환한 뒤
한 번 송수신하는 것이 마지막 사용자 acceptance입니다. 기본값이 아닌 local
구성은 `AD_SERVER_DATA_DIR`, `AD_PORT`, `AD_LOCAL_URL`을 함께 설정합니다.

## 웹 보안 경계

브라우저 runtime은 invite/envelope 서명과 passphrase wrapping에 Web Crypto
P-256을 사용하고, 3DH 설정과 Double Ratchet 메시지 암호화에는 Rust
`vodozemac` Olm v2를 사용합니다. private account/session pickle과 transcript는
passphrase로 감싸 IndexedDB에 저장하며 session pickle은 성공한 송수신마다
전진합니다. 서버 없는 수동 흐름에서는 private key, passphrase, 평문 메시지,
transcript를 업로드하지 않습니다. 단, 브라우저 저장소와 unlock된 메모리는
기기, 브라우저 프로필, 확장 프로그램, 로컬 악성코드의 영향을 받습니다.

이 prototype은 production E2EE, anonymity, 신뢰 가능한 전달, secure
deletion, backup recovery, rollback protection, compromised endpoint 방어를
주장하지 않습니다. 기반 Olm 구현에는 외부 감사 이력이 있지만 이 앱의 protocol
조합과 browser integration은 감사되지 않았으므로 reviewed Signal 배포와
동등하지 않습니다.

protocol v3 profile은 별도 IndexedDB database를 사용합니다. 기존 v1/v2 browser
profile은 삭제하지 않지만 v3에서 불러오지 않으므로 새 profile을 만들고 다시
pairing해야 합니다. 공개 one-time setup key가 단일 사용이므로 profile 하나는
상대 한 명에만 연결됩니다.

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

현재 Node 통합 테스트는 두 로컬 프로필, signed invite 검증, 두 단계 Olm 설정,
ratchet 및 out-of-order 암호화 메시지 교환, 중복·nested-field 변조·replay
거부, 보호된 inbox 접근, unlock 후 session/transcript 복구를 확인합니다.
두 local server process와 두 in-app browser origin도 함께 사용합니다.

## 보안 및 지원

사용 전에 [SECURITY.md](SECURITY.md)를 읽으세요. 민감한 통신에는 사용하지
마세요. 공개 지원 요청에 invite code, envelope, key, passphrase, 평문
메시지, raw log, 로컬 경로, private room screenshot을 포함하지 마세요.

[CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md),
[MIT license](LICENSE)도 참고하세요.
