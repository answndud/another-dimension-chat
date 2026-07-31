# Another Dimension Chat — Web-first prototype

[English](README.md) | 한국어

**계정·전화번호·contact discovery·중앙 메시지 저장·push 없이 브라우저에서
실행하는 1:1 암호화 메시지 prototype.**

현재 제품 방향은 사용자 소유 local server와 browser UI의 조합입니다.
프로필과 메시지 키는 브라우저에 두고, 암호화된 로컬 프로필 자료는 IndexedDB에
저장하며, 각 사용자의 서버는 opaque sealed envelope만 처리합니다.

현재 제품 경계는 별도로 검증한 `apps/web` browser UI와 API 전용
`apps/server` 사용자 소유 relay입니다. relay가 UI를 함께 제공하는 모드는
개발용 opt-in입니다.
`apps/desktop-tauri`, `apps/cli`, `apps/engine` 및 기존 Rust native crates는
legacy/research source로만 보존됩니다. 현재 web 제품의 release·설치·보안 준비도
증거가 아니며 공식 사용자는 이 경로를 선택하면 안 됩니다. 정확한 경계는
[`reference/PRODUCT_BOUNDARY.md`](reference/PRODUCT_BOUNDARY.md)에 있습니다.

> **현재 상태:** web-first 실험용 prototype. 감사되지 않았고,
> production-ready가 아니며, 민감한 통신에 사용하면 안 됩니다. 각 사용자가
> 자신의 local server를 실행하면 명시적으로 교환한 endpoint를 통해 sealed
> envelope를 직접 전달할 수 있습니다.

> **앱 코드 공급망 경고:** local relay는 기본적으로 API만 제공하며 browser
> JavaScript/WASM을 제공하지 않습니다. `AD_SERVE_UI=1` combined mode는 개발용
> opt-in입니다. static UI가 변조되면 암호화 전에 passphrase·평문·key가 탈취될
> 수 있으므로 별도로 검증한 signed release만 사용해야 합니다.

## 개발 도구 없는 사용자 설치

일반 사용자는 Node.js, npm, Vite, 터미널 개발 환경을 설치하지 않는 것이 기본입니다.
운영 배포물은 반드시 `runtime/node`를 포함한 signed archive여야 합니다. 공개키를
별도 신뢰 경로로 확인한 뒤 manifest·SBOM·provenance·파일 hash를 검증하고, archive
안의 설치기를 실행합니다.

```sh
./scripts/install_local_server.sh --archive ./another-dimension-0.1.0
~/.local/share/another-dimension/server/another-dimension-server start
```

설치기는 private data directory(권한 700), 설정 파일(권한 600), 그리고
`start|stop|restart|status|uninstall` 명령을 만듭니다. `uninstall`은 사용자 데이터까지
자동 삭제하지 않습니다. 데이터가 필요한지 확인한 뒤 별도로 폐기하세요.

현재 저장소의 development archive는 bundled runtime이 없을 수 있습니다. 그런
archive는 설치기가 명확히 거부하며 일반 사용자용 배포물로 취급하면 안 됩니다.
`AD_RELEASE_PROFILE=public`은 `AD_NODE_RUNTIME=/secure/node`가 없으면 실패합니다.
즉 Node/npm이 없는 깨끗한 기기에서도 설치·실행할 수 있는 공개 release가 준비되기
전에는 이 프로젝트를 민감한 통신에 사용하지 마세요.

릴리스 전 자동 검증은 저장소 루트에서 다음처럼 실행합니다.

```sh
./scripts/verify_all.sh
node scripts/acceptance_p3.mjs
```

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
- relay capability 파일은 owner-only 권한의 목적별 record이며 30일 후 만료됩니다.
  만료·손상·심볼릭 링크 상태는 서버가 폐기하고 새 capability를 발급합니다.

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
local server 제품은 `apps/server`에 있습니다. Tauri/CLI/engine은 공식 web 제품의
대체 실행 경로가 아닙니다.

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

서버 data directory의 private URL 파일에 있는 `#relay=...&local=...`
fragment를 별도로 검증한 browser UI에 입력합니다. `local` 값은 inbox를
읽는 bearer secret이므로 log, screenshot, support report에 포함하지 마세요.

개발 rehearsal에서만 static UI를 relay와 함께 제공할 수 있습니다.

```sh
AD_SERVE_UI=1 npm --prefix apps/web run build --workspaces=false
AD_SERVE_UI=1 ./scripts/start_local_server.sh
```

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

실행 전 환경만 확인하려면 다음 preflight를 사용합니다.

```sh
./scripts/preflight_local_server.mjs --config .another-dimension-server/server-config.json
```

공개 배포 archive는 운영자가 보관하는 trusted public key로 별도 검증해야
합니다. unsigned 개발 archive는 public release gate를 통과하지 않습니다.

```sh
node scripts/verify_public_release_gate.mjs another-dimension-0.1.0 \
  --public-key /secure/path/release-ed25519-public.pem \
  --min-version 0.1.0
```

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

pairing 시점의 장기 identity key fingerprint는 session 상태에도 묶입니다. 이후
저장된 peer identity가 달라지면 envelope 처리를 중단하고 새 safety verification을
포함한 fresh pairing을 요구합니다. 서버 주소나 capability 변경은 identity 변경과
같지 않지만 safety material에는 포함되므로 별도로 다시 확인해야 합니다.

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

서버가 관찰자에게 숨겨 주지 못하는 정보도 명확히 알아야 합니다.

| 관찰자 | 볼 수 있는 정보 | 이 앱이 보장하지 않는 것 |
| --- | --- | --- |
| 인터넷 서비스 제공자·VPN·reverse proxy | 접속 IP, 접속 시각, 통신량, 요청 대상 host, 대략적인 봉투 크기와 빈도 | 익명성, Tor 수준의 origin 보호, traffic correlation 방지 |
| relay 운영자 | 접속 client IP(구성에 따라), inbox URL을 아는 sender의 제출 시각·크기·빈도, opaque ciphertext | 평문·private key·passphrase 복호화 |
| 악성 browser/server/proxy | JS/WASM 교체, 입력·화면·passphrase·복호화 전후 데이터 | 앱 암호화가 이미 장악된 실행 환경을 구해 주지 않음 |

일반 HTTPS·VPN은 전송 경로 보호와 도달성 도구일 뿐 익명성 경로가 아닙니다.
현재 web relay는 low-risk transport만 제공합니다. 원격 HTTP inbox는 capability와
metadata 노출 위험 때문에 자동 연결에서 거부되며, Tor/onion 익명성이나 검열
저항은 제공하지 않습니다.
local/LAN HTTP mode는 capability와 metadata가 네트워크에 노출될 수 있으므로
민감한 통신에 사용하지 마세요. 서버 시작 시 private UI URL 자체는 터미널에
출력하지 않고 `.another-dimension-server/local-ui-url` 파일(mode 600)에만
기록합니다.

profile private material은 Argon2id 기반 wrapping key로 IndexedDB에 저장되며,
Argon2id 계산은 별도 browser Worker에서 실행되어 화면을 멈추지 않습니다.
기존 PBKDF2 profile은 올바른 passphrase로 처음 unlock할 때 Argon2id 형식으로
자동 재포장됩니다. 5분 동안 입력이 없으면 브라우저 세션이 자동 잠기며, 화면의
`Panic wipe`는 passphrase를 다시 확인한 뒤 해당 profile의 private material과
로컬 transcript를 삭제합니다. 삭제 데이터는 복구되지 않으므로 실제 백업으로
간주하지 마세요.

`프로필 전용 백업`은 versioned `ADBACKUP1` wrapper 안에 session·peer·초대 상태를
제거한 profile material만 현재 passphrase로 감싸 내보냅니다. KDF 정책·revision·생성
시각·SHA-256 무결성 정보가 포함되며, 약한 KDF·미래 version·변조·기존 profile 덮어쓰기를
거부합니다. 이 백업은 대화 기록이나 Olm session/replay 상태를 복구하지 않습니다.

잠금 해제한 방에서는 별도로 `ADSESSION1`(Olm ratchet/session과 replay seen 상태)과
`ADTRANSCRIPT1`(로컬 대화 기록) 암호화 export/import를 사용할 수 있습니다. 세 자료는
서로 다른 목적과 포맷이며 현재 profile의 암호 문구로 인증됩니다. 오래된 revision은
rollback으로 보고 거부하고, import 중 오류가 나면 새로 쓴 항목을 되돌립니다.

모든 backup/export 문자열과 passphrase는 서로 다른 장소에 보관하세요. 공개 채널·클라우드
메모·스크린샷·클립보드 기록에 올리지 마세요. 긴급 삭제는 브라우저 저장소의 삭제를
시도하지만 브라우저/OS 백업, clipboard history, swap, crash dump, SSD wear-leveling까지
지운다는 보장이 없습니다. 이 기능은 메시지의 자동 cloud backup이 아닙니다.

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

서버는 bounded opaque envelope만 저장합니다. 정적 browser UI는 별도의 검증된
release에서 제공하며, `AD_SERVE_UI=1`은 개발용 combined mode입니다.

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
