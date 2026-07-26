# Another Dimension Chat

브라우저에서 사용하는 사용자 소유형 1:1 암호화 메시징 프로토타입입니다.

이 프로젝트는 중앙에 하나의 채팅 서버를 두고 모든 사용자의 메시지를 모으는
방식이 아닙니다. 각 사용자가 자신의 기기에서 작은 서버를 실행하고, 두 서버는
암호화된 봉투(sealed envelope)만 전달합니다. 계정, 전화번호, 이메일, 검색 가능한
사용자명, 중앙 주소록, 중앙 메시지 저장소, 푸시 알림, 클라우드 백업은 사용하지
않습니다.

> **중요:** 현재 버전은 실험용 프로토타입입니다. 아직 독립적인 보안 감사를 받은
> 완성형 상용 메신저가 아니며, 민감한 통신이나 생명·재산에 영향을 주는 통신에
> 사용하지 마세요. 기반 Olm 구현에는 외부 감사 이력이 있지만 이 앱의 프로토콜
> 조합, 브라우저 연동, 서버 운영 환경 전체가 감사된 것은 아닙니다.

> **앱 코드 공급망 경고:** relay는 기본적으로 API만 제공하며 브라우저
> JavaScript/WASM을 제공하지 않습니다. `AD_SERVE_UI=1` combined mode는 개발용
> opt-in일 뿐입니다. static UI가 변조되면 암호화가 시작되기 전에 passphrase·평문·키가
> 탈취될 수 있으므로, 별도로 검증한 signed release만 사용해야 합니다.

## 사용자 설치 경로

개발자가 아닌 사용자는 소스 저장소, npm, Vite를 설치하지 않습니다. 공개 release는
`runtime/node`를 포함한 signed archive여야 하며, 별도로 전달받은 공개키로
`release-manifest.json`, SBOM, provenance와 파일 hash를 먼저 검증합니다. 검증된
release 디렉터리에서 다음 설치기를 실행하면 private data directory와 owner-only
권한의 `start`, `stop`, `restart`, `status`, `uninstall` 명령이 만들어집니다.

```sh
./scripts/install_local_server.sh --archive ./another-dimension-0.1.0
~/.local/share/another-dimension/server/another-dimension-server start
```

현재 저장소에서 만드는 development archive에는 bundled runtime이 없을 수 있으므로
설치기가 이를 감지해 중단합니다. `AD_RELEASE_PROFILE=public` release는
`AD_NODE_RUNTIME=/secure/node`를 요구하며, 이 값이 없으면 생성되지 않습니다.
따라서 Node/npm 설치를 요구하는 source flow를 일반 사용자 설치 방법으로 안내하지
않습니다. data directory는 uninstall 때도 자동 삭제하지 않습니다.

릴리스 공개 전 필수 조건은 signed manifest, 공개키 fingerprint의 독립 전달, SBOM,
provenance, archive hash, 그리고 다음 자동 gate입니다.

```sh
./scripts/verify_all.sh
node scripts/acceptance_p3.mjs
```

## 1. 가장 먼저 이해할 구조

이 앱은 다음 세 부분으로 구성됩니다.

1. **브라우저 UI** — 프로필, 초대, 안전 문구, 메시지 평문을 처리합니다.
   메시지는 브라우저 안에서 암호화·복호화됩니다.
2. **사용자 소유 relay** — 사용자의 기기에서 직접 실행합니다. 기본적으로 정적
   웹 UI를 제공하지 않고, 상대 서버에서 온 암호화 봉투를 잠시 보관·전달합니다.
   서버는 평문 메시지나 개인 키를 알 수 없습니다.
3. **두 브라우저 사이의 암호화 세션** — 서명된 초대를 교환한 뒤 Rust
   `vodozemac`의 Olm v2 Double Ratchet을 WebAssembly로 사용합니다. 세션 상태는
   브라우저의 암호화된 IndexedDB에 저장됩니다.

일반적인 사용 흐름은 다음과 같습니다.

```text
각자 자신의 서버 실행
        ↓
각자 서버가 제공하는 private UI 주소로 접속
        ↓
각자 브라우저 프로필 생성·잠금 해제
        ↓
서로 public invite 교환
        ↓
두 사람이 safety phrase를 직접 비교
        ↓
Olm 초기화 봉투 자동 교환
        ↓
브라우저에서 암호화된 메시지를 상대 서버로 전달
        ↓
상대 브라우저가 가져와 로컬에서 복호화
```

서버를 항상 공개 인터넷에 노출해야 하는 것은 아닙니다. 같은 컴퓨터에서
시험할 때는 loopback 서버 두 개를 사용할 수 있고, 실제 두 기기에서 사용할
때는 HTTPS reverse proxy, Tailscale 같은 VPN 경로, 또는 직접 TLS를 사용해야
합니다.

현재 제품 경계는 `apps/web` 브라우저 UI와 `apps/server` 사용자 소유 relay입니다.
`apps/desktop-tauri`, `apps/cli`, `apps/engine` 및 기존 Rust native crates는
legacy/native prototype으로 보존되어 있지만 현재 웹 제품의 release나 보안
준비도 증거가 아닙니다.

## 2. 준비물

소스 저장소에서 개발하거나 직접 서버를 빌드하려면 다음이 필요합니다.

- Node.js 20 이상
- npm
- Web Crypto와 WebAssembly를 지원하는 최신 브라우저
- 실제 두 기기에서 사용할 경우, 서로 도달 가능한 HTTPS 주소

macOS에서는 Node.js 설치 후 터미널에서 버전을 확인합니다.

```sh
node --version
npm --version
```

Node.js가 20보다 낮으면 서버 시작 스크립트가 실행을 중단합니다.

## 3. 소스 저장소에서 처음 실행하기

저장소 루트(`/Users/.../another-dimension`)에서 다음을 실행합니다.

```sh
npm ci --prefix apps/web --workspaces=false
npm --prefix apps/web run build --workspaces=false
./scripts/start_local_server.sh
```

서버가 다음과 비슷한 출력을 보여 줍니다.

```text
Another Dimension local server listening at http://127.0.0.1:1422
Advertised origin: http://127.0.0.1:1422
Open the private local UI: http://127.0.0.1:1422/#local=...
```

출력된 주소 중 **`#local=...`까지 포함된 private local UI 주소**를 브라우저의
주소창에 그대로 엽니다. 이 fragment는 서버 소유자가 자신의 inbox를 읽고
acknowledge할 수 있는 로컬 접근 capability입니다.

다음 주소를 다른 사람에게 보내거나 공개 로그에 남기지 마세요.

- `#local=...`가 포함된 private UI 주소
- 서버 데이터 디렉터리의 `inbox-capability`
- 서버 데이터 디렉터리의 `local-access-capability`
- 초대문과 암호화 봉투
- 프로필 passphrase

### 개발 화면만 빠르게 확인하고 싶을 때

서버를 사용하지 않고 Vite 개발 화면만 열 수도 있습니다.

```sh
npm --prefix apps/web run dev --workspaces=false
```

Vite가 출력한 `http://127.0.0.1:1420` 주소를 엽니다. 이 방식은 기본적으로
manual envelope mode입니다. 즉, 서버의 inbox capability를 읽을 수 없으므로
상대 서버로 자동 전송하지 않고 초대문·봉투를 직접 복사해야 합니다. 실제 사용
흐름을 확인하려면 `start_local_server.sh`로 서버가 제공하는 UI를 사용하세요.

## 4. 서버 설정 방법

### 4.1 같은 컴퓨터에서만 테스트: 기본 loopback 모드

설정 없이 시작하면 서버는 `127.0.0.1:1422`에만 열립니다.

```sh
./scripts/start_local_server.sh
```

이 모드는 다른 기기에서 접근할 수 없습니다. 프로필 생성, 초대 교환, 암호화
메시지 왕복을 한 컴퓨터에서 시험할 때 가장 적합합니다.

설정을 다시 처음부터 만들고 싶다면 설정 파일을 삭제하는 대신, 먼저 필요한
파일인지 확인한 후 별도 위치를 지정할 수 있습니다.

```sh
AD_CONFIG_FILE="$(pwd)/.test-server/server-config.json" \
  ./scripts/start_local_server.sh --setup
```

### 4.2 guided setup 사용

처음으로 네트워크 범위를 정하거나 HTTPS 주소를 설정할 때는 guided setup을
사용합니다.

```sh
./scripts/start_local_server.sh --setup
```

화면에서 다음 중 하나를 선택합니다.

1. **This Mac only** — loopback 전용. 기본값이며 로컬 테스트용입니다.
2. **Existing HTTPS reverse proxy or Tailscale Serve** — 이미 운영 중인 HTTPS
   reverse proxy 또는 Tailscale Serve 뒤에 로컬 서버를 둡니다.
3. **Direct HTTPS** — PEM 형식의 TLS 인증서와 개인 키를 서버에 직접 지정합니다.

설정은 프로젝트의 `.another-dimension-server/server-config.json`에 저장되고,
파일 권한은 소유자만 읽을 수 있는 `0600`으로 설정됩니다. 한 번 저장하면 이후
실행은 다음 한 줄이면 됩니다.

```sh
./scripts/start_local_server.sh
```

### 4.3 reverse proxy 또는 Tailscale 경로

reverse proxy/Tailscale Serve를 이미 구성한 경우 비대화형으로도 저장할 수
있습니다.

```sh
./scripts/start_local_server.sh --setup \
  --mode reverse-proxy \
  --public-url https://chat.example.com \
  --port 1422
```

여기서 `--public-url`은 `https://chat.example.com`처럼 scheme과 host만 포함해야
합니다. path, query, fragment, 사용자명, 비밀번호는 넣지 않습니다.

이 명령은 다음을 자동으로 해주지 않습니다.

- DNS 레코드 생성
- 방화벽 포트 개방
- reverse proxy 설치·실행
- Tailscale 로그인이나 Serve 설정
- TLS 인증서 발급

즉, reverse proxy 또는 VPN 경로가 실제로 실행되고 외부에서 접근되는지 사용자가
직접 준비해야 합니다. 앱은 초대문에 넣을 public origin과 로컬 서버 설정만
기록합니다.

### 4.4 direct TLS

PEM 인증서와 개인 키를 직접 가진 경우 다음처럼 서버가 HTTPS를 종료하게 할 수
있습니다.

```sh
./scripts/start_local_server.sh --setup \
  --mode direct-tls \
  --public-url https://chat.example.com \
  --port 1422 \
  --tls-key /absolute/path/server-key.pem \
  --tls-cert /absolute/path/server-cert.pem
```

공개 서비스에는 보통 자동 갱신과 접근 제어를 관리하는 reverse proxy를 앞에
두는 편이 운영하기 쉽습니다. 개발용 self-signed 인증서는 다음 명령으로 만들
수 있지만, 각 기기의 신뢰 저장소에 직접 설치하지 않으면 브라우저가 거부합니다.

```sh
./scripts/generate_tls_cert.sh chat.example.com
```

### 4.5 네트워크 선택

| 방식 | 용도 | 주의점 |
| --- | --- | --- |
| `127.0.0.1` loopback | 같은 기기 테스트 | 다른 기기에서 접근 불가 |
| LAN + HTTPS reverse proxy | 같은 집·사무실 네트워크 | 방화벽과 HTTPS를 직접 구성 |
| Tailscale/WireGuard + HTTPS | VPN에 연결된 기기끼리 사용 | VPN은 앱 외부에서 준비 |
| 공개 HTTPS | 인터넷을 통한 기기 간 사용 | DNS, TLS, 방화벽, proxy를 직접 운영 |
| 평문 HTTP LAN | 개발 중 제한적 테스트 | capability 노출 위험이 있어 운영 금지 |

일반 브라우저의 Web Crypto는 안전한 context를 요구하므로, 실제 다른 기기에서
사용할 때는 HTTPS를 기준으로 구성하세요. 서버는 UPnP, port forwarding,
익명성, 사용자 인증, 고가용성을 자동으로 제공하지 않습니다.

## 5. 두 사람이 처음 사용하는 방법

아래 절차는 Alice와 Bob이 각자 자신의 기기에서 서버를 실행한다는 전제입니다.

### 5.1 각자 서버와 private UI를 준비

Alice와 Bob 모두 자신의 기기에서 다음을 실행합니다.

```sh
npm --prefix apps/web run build --workspaces=false
./scripts/start_local_server.sh
```

각자 서버가 출력한 private UI 주소를 **자기 브라우저에서만** 엽니다. 상대에게
보내는 것은 private UI 주소가 아니라 앱 화면에 표시되는 public invite입니다.

상대 기기의 서버가 접근 가능한 주소를 사용하려면 guided setup에서 HTTPS
public URL을 설정한 뒤 서버를 다시 시작해야 합니다. 초대문은 이 endpoint를
포함해 생성됩니다.

### 5.2 브라우저 프로필 만들기

첫 화면에서 다음 정보를 입력합니다.

- **이름** — 상대 화면에 표시할 로컬 표시 이름입니다. 계정이나 글로벌 username이
  아닙니다.
- **passphrase** — 브라우저에 저장되는 프로필·세션 자료를 잠그는 암호입니다.

passphrase는 서버로 전송되지 않습니다. 잊어버리면 이 프로필의 저장 자료를
복구할 수 없으므로 안전한 password manager에 보관하세요. 프로필을 만든 뒤에는
페이지를 새로 열 때 **Unlock existing profile**에서 같은 passphrase로 잠금
해제합니다.

브라우저의 site data/IndexedDB를 삭제하면 프로필과 대화 기록도 잃을 수 있습니다.
현재 버전은 클라우드 백업이나 계정 복구를 제공하지 않습니다.

### 5.3 public invite 교환

프로필을 잠금 해제하면 화면에 **Your public invite**가 표시됩니다.

1. Alice가 자신의 invite를 안전한 별도 채널을 통해 Bob에게 보냅니다.
2. Bob은 **Peer public invite**에 Alice의 invite를 붙여 넣고 **Pair and verify**를
   누릅니다.
3. Bob도 자신의 invite를 Alice에게 보내고, Alice도 같은 작업을 합니다.

초대문에는 공개 키와 선택적으로 상대 서버로 보내기 위한 write-only inbox
capability가 포함됩니다. 이것은 공개 초대 자료이지만, 그래도 의도한 상대에게만
보내는 것을 권장합니다. private UI 주소나 local-access capability와 혼동하지
마세요.

프로필 하나는 현재 한 명의 상대와만 연결됩니다. 이미 페어링한 프로필의
Pair 버튼은 **Profile already paired**로 바뀌며, 같은 one-time setup key를
여러 상대에게 재사용하지 않도록 막습니다. 다른 상대와 대화하려면 별도의
브라우저 프로필 또는 별도 브라우저 site data가 필요합니다.

### 5.4 safety phrase 직접 비교

초대가 검증되면 두 화면에 **Safety material**이 표시됩니다. 통화, 대면,
이미 신뢰하는 별도 채널처럼 공격자가 통제하기 어려운 경로로 두 사람이 이
문구를 직접 읽어 비교하세요.

문구가 다르면 다음을 진행하지 마세요.

- 초대문을 잘못 붙였는지 확인합니다.
- 각자 올바른 프로필을 사용 중인지 확인합니다.
- 중간자 공격이나 잘못된 전달 경로 가능성을 의심합니다.

문구가 일치한다는 것은 현재 두 프로필이 같은 상대 자료를 보고 있다는 확인
절차입니다. 기기 자체가 이미 장악된 경우까지 해결해 주는 것은 아닙니다.

### 5.5 초기 세션이 준비될 때까지 기다리기

Olm 초기화에는 `init`과 `ready` 두 개의 암호화된 제어 봉투가 필요합니다.
두 사람이 모두 잠금 해제된 room을 열고 있으면 서버를 통해 자동으로 교환됩니다.

화면의 상태가 **ready**가 되고 pending handshake 안내가 사라지면 메시지를
보낼 수 있습니다. 자동 전달이 되지 않는 경우에는 화면의 Outgoing envelope를
복사해 상대의 Incoming envelope에 붙여 넣고 **Import and decrypt**를 누릅니다.

수동 모드에서 마지막 `ready` 봉투를 보낸 사람에게는 **I delivered the handshake
envelope** 확인 버튼이 나타납니다. 실제로 상대에게 전달한 뒤 이 버튼을 눌러야
메시지 입력이 활성화됩니다.

## 6. 메시지 보내기와 받기

### 자동 서버 전달

상태가 `ready`이면 Message 입력란에 평문을 작성하고 **Encrypt and send to peer
server**를 누릅니다.

1. 평문은 브라우저에서 Olm Double Ratchet으로 암호화됩니다.
2. 생성된 봉투가 상대가 초대문에 제공한 endpoint로 전송됩니다.
3. 상대 브라우저가 열려 있고 잠금 해제되어 있으면 자동으로 inbox를 확인합니다.
4. 상대 브라우저가 봉투를 로컬에서 복호화한 뒤 transcript에 표시합니다.
5. 성공적으로 처리된 봉투는 상대 서버 inbox에서 acknowledge됩니다.

상대 브라우저가 잠겨 있거나 꺼져 있어도 봉투는 서버의 제한된 inbox에 잠시
보관됩니다. 상대가 다시 잠금 해제한 뒤 **Sync my inbox**를 누르면 받을 수
있습니다. 서버는 최대 256개 봉투를 보관하고 기본 보관 기간은 7일입니다.

### 수동 envelope 전달

상대 서버에 접근할 수 없는 경우에도 수동으로 사용할 수 있습니다.

1. Message에 내용을 입력합니다.
2. **Encrypt and export envelope**를 누릅니다.
3. Outgoing envelope 전체를 복사해 상대에게 보냅니다.
4. 상대는 Incoming envelope에 붙여 넣습니다.
5. **Import and decrypt**를 누릅니다.

수동 전달은 암호화된 봉투만 이동시키며, 평문 메시지를 전달하는 것이 아닙니다.
하지만 봉투를 전달하는 채널이 누락·지연·삭제·재전송될 수 있으므로, 같은
봉투를 여러 번 가져오지는 마세요. 앱은 이미 처리한 봉투의 중복 처리를 거부합니다.

### 답장과 순서가 뒤섞인 메시지

상대가 보낸 봉투를 먼저 처리하지 못하고 나중에 처리하더라도 Olm 세션이 허용하는
범위에서는 ratchet이 메시지를 처리합니다. 그래도 서버 보관 기간을 넘겼거나
필요한 메시지를 영구적으로 잃은 경우에는 자동 복구되지 않습니다.

## 7. 잠금, 재접속, 데이터 보존

화면의 **Lock**을 누르면 프로필과 대화 화면이 잠기고 브라우저 메모리에서
사용 중이던 상태가 정리됩니다. 다시 사용하려면 같은 private UI 주소를 열고
passphrase로 Unlock합니다.

다음 자료는 브라우저의 IndexedDB에 passphrase로 감싼 형태로 저장됩니다.

- 프로필 키 자료
- Olm account/session pickle
- 페어링 transcript
- 로컬 메시지 transcript

각 메시지를 성공적으로 보내거나 받을 때 ratchet session 상태도 함께 갱신됩니다.
따라서 같은 프로필을 같은 브라우저 site data에서 다시 unlock하면 대화를 이어갈
수 있습니다.

다음 상황에서는 복구되지 않을 수 있습니다.

- passphrase를 잊은 경우
- 브라우저 site data 또는 IndexedDB를 삭제한 경우
- 다른 브라우저 프로필이나 private browsing 창에서 연 경우
- 기기 디스크 자체가 손상된 경우
- 상대가 보관 기간을 넘긴 봉투를 전달하지 못한 경우

v3 프로필은 별도의 IndexedDB 데이터베이스를 사용합니다. 예전 v1/v2 프로필은
삭제하지 않지만 현재 앱에서 불러오지 않으므로 업데이트 후에는 새 프로필을
만들고 다시 페어링해야 합니다.

## 8. 외부 HTTPS endpoint 확인

공개적으로 신뢰되는 HTTPS endpoint를 구성한 뒤 서버가 올바른 origin을 광고하고
있는지 확인할 수 있습니다.

```sh
node scripts/check_https_endpoint.mjs https://chat.example.com
```

이 검사는 HTTP, localhost, 신뢰되지 않은 인증서, 다른 origin을 광고하는 서버를
실패 처리합니다. DNS, 방화벽, reverse proxy가 실제로 올바르게 구성되었는지와
두 실제 브라우저에서 초대·메시지 왕복이 되는지는 별도로 확인해야 합니다.

## 9. 독립 실행 release 만들기

소스 저장소 없이 실행할 수 있는 압축 파일을 만들려면 다음을 실행합니다.

```sh
./scripts/build_release.sh
```

생성 파일은 다음 위치입니다.

```text
public-release/another-dimension-0.1.0.tar.gz
```

압축을 풀고 실행합니다.

```sh
tar -xzf public-release/another-dimension-0.1.0.tar.gz
cd another-dimension-0.1.0
./scripts/start_local_server.sh
```

release에는 이미 빌드된 브라우저 bundle, 서버, 설정·TLS·endpoint 확인
스크립트가 포함됩니다. 압축을 푼 사용자는 Vite나 원본 저장소가 필요하지
않습니다. Node.js 20 이상은 계속 필요합니다.

배포 전 환경만 확인하려면 `scripts/preflight_local_server.mjs`를 실행하고,
공개 archive는 `scripts/verify_public_release_gate.mjs`에 trusted public key를
제공해 서명·SBOM·필수 문서·최소 버전을 함께 검증합니다. unsigned 개발 archive는
public release gate를 통과하지 않습니다.

기본 archive는 로컬 개발용 unsigned release입니다. 릴리스 디렉터리의 파일별
SHA-256 매니페스트는 다음처럼 확인할 수 있습니다.

```sh
node scripts/verify_release_manifest.mjs .
```

검증된 배포는 저장소 밖의 Ed25519 PEM 개인키로 서명해야 합니다. 개인키를
저장소나 archive에 넣지 말고, 수신자는 별도로 전달받은 공개키를 고정해
검증합니다.

```sh
AD_RELEASE_SIGNING_KEY=/secure/path/release-ed25519-private.pem \
AD_RELEASE_REQUIRE_SIGNATURE=1 \
./scripts/build_release.sh
node scripts/verify_release_manifest.mjs . --require-signature \
  --public-key /secure/path/release-ed25519-public.pem
```

## 10. 개발자가 알아둘 명령

브라우저 테스트와 production bundle 확인:

```sh
npm --prefix apps/web test --workspaces=false
npm --prefix apps/web run build --workspaces=false
```

사용자 소유 서버 간의 health, opaque 전달, acknowledge smoke check:

```sh
node scripts/smoke_user_owned_servers.mjs
```

브라우저 암호화 Rust 코드를 변경했을 때만 WebAssembly를 다시 생성합니다.

```sh
npm --prefix apps/web run build:crypto --workspaces=false
```

이 명령은 Rust WASM target과 wasm-bindgen이 필요하며 일반 사용자는 실행할
필요가 없습니다. 생성된 WebAssembly 파일은 저장소에 포함되어 있으므로 일반
release build는 Rust를 다시 컴파일하지 않습니다.

## 11. 보안 경계와 아직 제공하지 않는 기능

브라우저는 P-256 서명과 passphrase wrapping에 Web Crypto를 사용하고, Olm v2
3DH 초기화와 Double Ratchet 메시지 암호화에는 Rust `vodozemac`을 사용합니다.
서버에는 제한된 크기의 opaque envelope만 저장됩니다. 서버의 읽기·acknowledge는
소유자의 별도 local-access capability로 보호되고, 상대에게 공유되는 capability는
쓰기 전용입니다.

그래도 다음은 보장하지 않습니다.

- 익명성 또는 IP 주소 보호
- 변조된 운영체제·브라우저·확장 프로그램·기기에서의 안전성
- 완전한 전달 보장, 오프라인 mailbox, 자동 복구
- secure deletion, cloud backup, account recovery
- 다중 기기 동기화, 그룹 채팅, 파일, 통화
- 중앙 relay, push notification, WebRTC, Tor/onion transport
- signed release, notarization, production security certification

특히 브라우저가 이미 장악되었거나 기기의 메모리와 저장소를 공격자가 읽을 수
있다면 브라우저 암호화만으로 보호할 수 없습니다. 서버가 평문을 보지 않는다는
것과 endpoint가 안전하다는 것은 서로 다른 주장입니다.

## 12. 문제 해결

### 서버가 시작되지 않음

- `node --version`이 20 이상인지 확인합니다.
- 먼저 `npm --prefix apps/web run build --workspaces=false`를 실행합니다.
- 다른 프로세스가 1422 포트를 사용 중이면 setup에서 다른 port를 지정합니다.
- 설정 파일의 public URL이 `https://호스트[:포트]` 형식인지 확인합니다.
- direct TLS라면 key와 certificate 파일을 모두 읽을 수 있는지 확인합니다.

### 화면은 열리지만 자동 전송이 되지 않음

- 서버가 출력한 `#local=...` 주소를 열었는지 확인합니다.
- 양쪽 invite에 상대 서버의 올바른 HTTPS origin이 들어 있는지 확인합니다.
- 상대 서버가 실행 중이고 health endpoint에 도달 가능한지 확인합니다.
- reverse proxy가 `/api/` POST, GET, OPTIONS 요청과 WebAssembly 파일을 통과시키는지 확인합니다.
- 브라우저 개발 화면(`127.0.0.1:1420`)을 사용 중이면 manual mode일 수 있으므로
  봉투를 복사해 전달하거나 local server UI를 사용합니다.
- 자동 수신이 안 되면 **Sync my inbox**를 누릅니다.

### 메시지 버튼이 비활성화됨

- 두 invite가 서로 교환되었는지 확인합니다.
- Safety phrase가 일치하는지 확인합니다.
- session 상태가 `ready`인지 확인합니다.
- pending handshake가 있으면 상대에게 봉투를 전달하고 필요한 확인 버튼을
  누릅니다.
- 이미 페어링된 프로필로 새 상대를 연결하려 하지 않는지 확인합니다. 새 상대는
  새 프로필을 사용해야 합니다.

### unlock할 수 없음

사용한 브라우저 프로필, origin, passphrase가 같은지 확인합니다. IndexedDB를
삭제했거나 passphrase를 잊었다면 현재 버전에는 계정 복구나 서버 백업이 없으므로
기존 프로필을 복원할 방법이 없습니다.

### 지원 요청을 보낼 때

공개 이슈나 지원 요청에 다음을 포함하지 마세요.

- invite 전체
- envelope 전체
- 개인 키, passphrase, capability URL
- 평문 메시지와 private room screenshot
- `#local=...` 주소
- raw 로그에 포함된 로컬 경로와 비밀값

대신 운영체제, Node.js 버전, 재현 단계, 비밀값을 제거한 오류 메시지만 공유하세요.
자세한 정책은 [SECURITY.md](SECURITY.md)와 [SUPPORT.md](SUPPORT.md)를 읽으세요.

## 관련 문서

- [보안 정책](SECURITY.md)
- [지원 가이드](SUPPORT.md)
- [기여 가이드](CONTRIBUTING.md)
- [MIT License](LICENSE)
