# Another Dimension

Another Dimension은 전화번호·이메일·중앙 계정 서버 없이 사용하는 1:1 보안
메신저를 목표로 합니다. 사용자의 Mac에서 로컬 보안 daemon을 실행하고,
Chromium 브라우저는 daemon이 제공하는 인증된 화면만 표시합니다. 메시지 전달은
사용자가 직접 운영하거나 신뢰 경로를 확인한 relay를 사용합니다.

> 현재 릴리스 정책상 고위험 통신은 차단되어 있습니다. 구현이 존재한다는 사실은
> 독립 보안 검토, 익명성, 검열 저항성 또는 기자·취재원 보호 승인을 뜻하지
> 않습니다. 민감한 실제 통신에는 아직 사용하지 마세요.

## 현재 제품 구조

```text
Chromium UI (표시·입력)
        │ loopback 인증 세션
        ▼
로컬 Rust daemon
  - 계정·기기 신원
  - 초대와 안전 번호
  - OpenMLS 암복호화
  - 암호화 로컬 저장소
  - 첨부파일·전달 상태
        │ HTTPS + 인증서 pin
        ▼
사용자 소유 relay
  - 일회성 초대 중계
  - 불투명 ADENV1 봉투
  - 암호화 첨부 blob
```

보안 경계의 핵심은 다음과 같습니다.

- 브라우저는 장기 개인키, OpenMLS 상태, 데이터베이스 키를 소유하지 않습니다.
- daemon은 `127.0.0.1`에만 UI를 열고 일회성 bootstrap, HttpOnly cookie,
  CSRF, Origin 검사를 사용합니다.
- relay는 평문, 개인키, 표시 이름, 연락처 목록을 받지 않습니다.
- 원격 relay는 HTTPS와 명시적으로 확인된 SHA-256 인증서 pin이 필요합니다.
- 전화번호, 이메일, 사용자 검색, 중앙 연락처 탐색, 푸시 알림, 클라우드 백업은
  v0.1 제품 범위가 아닙니다.

## 지원 환경

현재 지원 대상으로 고정한 환경은 다음과 같습니다.

- Apple Silicon macOS
- Chromium 계열 브라우저
- 로컬 daemon 실행이 가능한 터미널
- Node.js 20 이상은 소스 개발과 relay 실행에만 필요
- 일반 배포본은 daemon binary와 Node runtime을 함께 포함해야 함

## 개발 환경에서 빠르게 실행하기

### 1. 의존성 준비

```sh
npm ci --prefix apps/web --workspaces=false
npm ci --prefix apps/server --workspaces=false
```

Rust 의존성은 저장소의 `Cargo.lock`으로 고정되어 있습니다.

### 2. 웹 UI 빌드

```sh
npm --prefix apps/web run build --workspaces=false
```

### 3. 로컬 프로필 초기화

daemon은 암호문구를 명령행 인자로 받지 않습니다. 터미널 입력 또는 표준입력만
사용합니다. 최소 12자 이상을 사용하고 비밀번호 관리자에 보관하세요.

```sh
read -s AD_PASSPHRASE
printf '%s' "$AD_PASSPHRASE" | cargo run -p another-dimension-daemon -- \
  init --display-name "내 표시 이름" --data-dir .local/alice
unset AD_PASSPHRASE
```

기존 browser Olm/Tauri 프로토타입의 키와 세션은 OpenMLS 신원으로 변환하지
않습니다. 암호 프로토콜 상태를 억지로 변환하면 신원 연속성을 거짓으로 보일 수
있기 때문에 새 daemon 프로필을 생성해야 합니다.

### 4. 개발 relay 실행

```sh
AD_SERVER_DATA_DIR=.local/relay \
AD_PORT=1422 \
node apps/server/server.mjs
```

relay는 기본적으로 API만 제공합니다. `AD_SERVE_UI=1`은 로컬 개발 편의
기능이며 공개 배포 경계로 사용하면 안 됩니다.

relay를 시작하면 private local UI URL과 capability는 데이터 디렉터리의
owner-only 파일에 저장됩니다. 해당 값을 로그, 화면 공유, 이슈에 올리지 마세요.

### 5. daemon UI 실행

실제 relay가 발급한 inbox URL과 relay 공개키·인증서 pin을 사용해야 합니다.
loopback 개발 중에는 필요한 값을 relay의 private info API에서 확인할 수
있습니다.

```sh
read -s AD_PASSPHRASE
printf '%s' "$AD_PASSPHRASE" | cargo run -p another-dimension-daemon -- \
  serve \
  --data-dir .local/alice \
  --port 1420 \
  --ui-dir apps/web/dist \
  --open
unset AD_PASSPHRASE
```

`--open`이 동작하지 않으면 daemon이 출력한 일회성 URL을 같은 Mac의 Chromium에
붙여 넣습니다. URL은 다른 사람에게 전송하지 마세요.

원격 HTTPS relay를 연결할 때는 다음 값이 추가로 필요합니다.

```text
--relay-origin https://relay.example
--inbox-url https://relay.example/api/v1/inbox/<capability>
--relay-tls-pin sha256:<certificate-der-sha256>
--relay-public-key <32-byte-ed25519-public-key-hex>
--relay-public-key-fingerprint <sha256-hex>
```

확인하지 않은 새 pin으로 자동 전환하지 않습니다. 인증서를 실제로 교체한 경우에만
새 pin과 `--relay-tls-retrust`를 함께 사용하세요.

## 사용자 워크플로우

1. 각 사용자가 자신의 Mac에서 daemon 프로필을 생성합니다.
2. 각 사용자가 접근 가능한 user-owned relay를 준비합니다.
3. 초대를 만드는 사용자가 UI에서 일회성 초대 코드를 생성합니다.
4. 코드는 별도의 신뢰 가능한 채널로 상대에게 전달합니다.
5. 상대가 코드를 입력하면 daemon이 서명, 만료, relay binding, protocol version을
   검증합니다.
6. 양쪽이 안전 번호 전체를 비교하고 확인합니다.
7. 확인이 끝난 뒤에만 연락처 승인과 OpenMLS 메시지 전송이 활성화됩니다.
8. account, device, relay binding이 바뀌면 전송은 중단되고 새로 검증해야 합니다.

초대 코드는 한 번만 사용할 수 있고 만료됩니다. 사용자명 검색이나 전화번호
연락처 동기화는 제공하지 않습니다.

## 릴리스 설치 후 명령

서명 검증을 거쳐 설치한 디렉터리의 `another-dimension` 실행 파일 하나를
사용합니다. 아래에서 `AD`는 그 절대 경로입니다.

```sh
AD="$HOME/.local/share/another-dimension/server/another-dimension"
"$AD" init "내 표시 이름"
"$AD" relay-start
"$AD" start
```

`start`는 daemon을 foreground에서 실행하고 Chromium을 엽니다. 종료하려면 해당
터미널에서 `Ctrl-C`를 누릅니다. 원격 relay를 사용할 때는 README의 TLS pin과 relay
공개키 옵션을 `start` 뒤에 그대로 붙일 수 있습니다. relay는 daemon과 별도
프로세스이므로 상태와 종료 명령도 분리됩니다.

```sh
"$AD" status
"$AD" doctor
"$AD" stop
"$AD" relay-status
"$AD" relay-stop
"$AD" recovery-export /Volumes/OFFLINE/profile.adrecovery
```

## 주요 daemon 명령

```text
another-dimension-daemon init --display-name NAME [--data-dir PATH]
another-dimension-daemon identity show [--data-dir PATH]
another-dimension-daemon status [--data-dir PATH]
another-dimension-daemon doctor [--data-dir PATH]
another-dimension-daemon serve [options]
another-dimension-daemon stop [--data-dir PATH]
another-dimension-daemon device list [--data-dir PATH]
another-dimension-daemon device revoke --id DEVICE_ID [--data-dir PATH]
another-dimension-daemon recovery export --output PATH [--data-dir PATH]
another-dimension-daemon recovery inspect --input PATH
another-dimension-daemon recovery import --input PATH [--data-dir PATH]
another-dimension-daemon recovery rotate --data-dir PATH
another-dimension-daemon wipe --data-dir PATH
```

`wipe`는 로컬 daemon 저장소를 제거하지만 SSD 잔여 데이터, relay blob, 별도
백업, 브라우저 캐시까지 안전 삭제한다고 주장하지 않습니다.

## 백업과 복구

암호화 복구 파일을 오프라인 매체에 내보냅니다.

```sh
cargo run -p another-dimension-daemon -- \
  recovery export --data-dir .local/alice --output /Volumes/OFFLINE/alice.adrecovery
```

복구 파일은 계정·기기·암호화 상태를 포함할 수 있는 민감한 자료입니다.

- 메시지나 메신저로 보내지 마세요.
- 원본 기기와 분리된 암호화 매체에 보관하세요.
- 암호문구를 같은 위치에 보관하지 마세요.
- 가져오기는 기존 프로필을 덮어쓰지 않습니다.
- 가져오기 전에 `recovery inspect`로 형식과 버전을 확인하세요.

## 검증 명령

M1의 CPU 사용량을 과도하게 높이지 않는 기본 검증:

```sh
scripts/verify_light.sh
CARGO_BUILD_JOBS=2 cargo check -p another-dimension-daemon --offline
node scripts/verify_product_boundary.mjs
```

릴리스 전 전체 제품 검증:

```sh
CARGO_BUILD_JOBS=2 scripts/verify_full.sh
```

기본 검증은 현재 제품인 daemon, 웹 UI, relay만 다룹니다. 삭제된 Tauri/CLI
프로토타입의 성공 여부를 제품 증거로 사용하지 않습니다.

## 완전한 릴리스 아카이브 만들기

공개 아카이브에는 실행 가능한 daemon과 Node runtime이 반드시 포함되어야 합니다.
미서명 개발 아카이브도 두 파일이 없으면 생성하지 않습니다.

```sh
AD_DAEMON_BINARY=/absolute/path/another-dimension-daemon \
AD_NODE_RUNTIME="$(command -v node)" \
AD_RELEASE_VERSION=0.1.0 \
scripts/build_release.sh
```

공개 배포에는 추가로 Ed25519 release signing key, 외부 trust manifest,
bootstrap public key와 공개키 검증 절차가 필요합니다. 개인 signing key는
저장소나 릴리스 아카이브에 넣지 마세요. 자세한 공개 비주장은
[SECURITY.md](SECURITY.md)를 따릅니다.

## 저장 위치와 민감정보

기본 또는 지정한 daemon 데이터 디렉터리에는 암호화 저장소, rollback marker,
private UI bootstrap 자료가 들어갑니다. relay 데이터 디렉터리에는 SQLite queue,
암호화 blob, capability, receipt signing key가 들어갑니다.

다음 자료는 공개하면 안 됩니다.

- 초대 코드와 signed invite
- inbox/local UI capability
- 안전 번호와 연락처 식별자
- 메시지 평문·암호문
- 복구 파일과 암호문구
- daemon·relay 전체 로그
- private room 화면 캡처
- release signing private key

## 문제 해결

### UI 디렉터리가 없다고 나오는 경우

```sh
npm --prefix apps/web run build --workspaces=false
```

그 후 `serve --ui-dir apps/web/dist`로 다시 실행합니다.

### 프로필이 초기화되지 않았다고 나오는 경우

같은 `--data-dir`을 사용했는지 확인하고 먼저 `init`을 실행합니다. 기존 폴더를
임의로 덮어쓰지 마세요.

### HTTPS relay pin 오류

인증서가 예상과 다른 상태입니다. 네트워크 공격과 정상 인증서 교체를 UI만 보고
구분할 수 없습니다. relay 운영 경로에서 새 지문을 별도로 확인하기 전에는
`--relay-tls-retrust`를 사용하지 마세요.

### 브라우저가 daemon에 연결되지 않는 경우

- daemon 프로세스가 실행 중인지 확인합니다.
- daemon이 출력한 최신 일회성 URL을 사용합니다.
- 다른 origin에서 UI를 열지 않습니다.
- daemon 재시작 후에는 이전 cookie와 bootstrap URL을 재사용하지 않습니다.

## 명시적 비보장

현재 프로젝트는 다음을 보장하지 않습니다.

- 독립 보안 감사 완료
- 기자·취재원·활동가의 실제 고위험 통신 승인
- 익명성, IP 은닉, 트래픽 분석 방어
- 검열 저항 또는 Tor/onion 전달
- 악성코드·키로거·화면 캡처로 장악된 기기 보호
- 상대방의 복사·촬영 방지
- 강압 저항 또는 부인 가능성
- SSD 수준 secure deletion
- 다중 기기 완전 복구와 고가용성 relay

취약점을 발견하면 공개 이슈에 재현용 비밀이나 실제 대화 데이터를 넣지 말고
[SECURITY.md](SECURITY.md)의 비공개 신고 절차를 사용하세요.

## 라이선스

MIT License. 자세한 내용은 [LICENSE](LICENSE)를 확인하세요.
