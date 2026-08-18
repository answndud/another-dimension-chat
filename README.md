# Another Dimension

Another Dimension은 전화번호·이메일·중앙 trusted server 없이 사용하는 1:1 보안
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
- relay는 평문, 개인키, 표시 이름, 연락처 목록을 받지 않습니다. 단, relay
  운영자는 클라이언트 IP, 접속 시각, 트래픽 크기 같은 메타데이터를 볼 수
  있습니다. 평문을 보지 못하는 것과 메타데이터를 보호하는 것은 별개의 문제이며,
  이 제품은 메타데이터 보호(익명성)를 제공하지 않습니다.
- 원격 relay는 HTTPS와 명시적으로 확인된 SHA-256 인증서 pin이 필요합니다.
- 전화번호, 이메일, 사용자 검색, 중앙 연락처 탐색, 푸시 알림, 클라우드 백업은
  v0.1 제품 범위가 아닙니다.

## 지원 환경

현재 지원 대상으로 고정한 환경은 다음과 같습니다.

- Apple Silicon macOS(arm64)
- Chromium 계열 브라우저(정확한 버전은 지원 evidence에 기록)
- 로컬 daemon 실행이 가능한 터미널
- Node.js 20 이상은 소스 개발과 relay 실행에만 필요
- 일반 배포본은 daemon binary와 Node runtime을 함께 포함해야 함
- 지원하지 않는 환경(다른 OS·Intel macOS·다른 브라우저)은 development-only이며
  `doctor`가 `unsupported` 항목을 표시하고 `serve`가 경고를 출력합니다.
  상세 지원 범위는 [SUPPORT.md](SUPPORT.md)를 참고하세요.

## 릴리스 배포 모드

배포 산출물과 문서는 다음 네 가지 모드를 같은 이름으로 구분합니다.

| 모드 | 목적 | 허용 주장 |
| --- | --- | --- |
| `development` | 개발자 로컬 실행 | 기능 개발용이며 배포 금지 |
| `private-trusted` | 본인·신뢰하는 지인 간 제한 배포 | 암호문 전달과 로컬 키 소유 모델을 설명할 수 있음 |
| `public` | 불특정 다수 공개 배포 | 독립 검토와 운영 증거가 있어야 함 |
| `high-risk-disabled` | 고위험 사용자 보호 | 현재 항상 비활성화 |

현재 이 저장소는 `development` 모드로 개발 중이며 `private-trusted` 제한 배포를
준비합니다. `public` 배포와 `high-risk-disabled` 전환은 독립 보안 검토, 운영
signing key 신뢰, 실제 배포 증거가 확보되기 전에는 승인하지 않습니다.
`highRiskAllowed` 릴리스 플래그를 켜는 우회 방법은 없으며, 어떤 문서도 이를
안내하지 않습니다.

`private-trusted`라고 해도 relay 운영자는 IP, 접속 시각, 트래픽 크기 같은
메타데이터를 볼 수 있습니다. 상대방 기기가 악성코드에 감염됐거나 상대방이
화면을 촬영하는 상황도 방어하지 않습니다.

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

daemon은 프로필 초기화 때 사용자가 암호문구를 직접 만들도록 요구하지 않습니다.
운영체제 난수로 생성된 256비트 값을 화면에서 한 번 복사하거나, owner-only
파일로 저장하도록 명시할 수 있습니다.

```sh
cargo run -p another-dimension-daemon -- \
  init --display-name "내 표시 이름" \
  --data-dir .local/alice \
  --passphrase-output /secure/offline/alice.passphrase
```

생성된 값을 별도 보안 매체에 보관하세요. `serve`, `identity`, `device`, `wipe`는
생성된 값을 stdin으로만 받아 복호화하며 명령행 인자로는 받지 않습니다.

Apple Silicon macOS에서는 초기화 시 프로필 비밀값을 macOS Keychain에도 등록합니다.
Keychain 자동 잠금 해제를 명시적으로 사용할 때만 `--keychain`을 붙입니다.

```sh
cargo run -p another-dimension-daemon -- \
  identity show --data-dir .local/alice --keychain
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
printf '%s' "$(cat /secure/offline/alice.passphrase)" | cargo run -p another-dimension-daemon -- \
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
터미널에서 `Ctrl-C`를 누릅니다. 이미 실행 중인 daemon은 `restart`로 중지 후 같은
터미널에서 다시 시작할 수 있습니다. `restart`는 daemon만 재시작하며 relay는
`relay-stop` 후 `relay-start`로 별도 관리합니다. 원격 relay를 사용할 때는 README의
TLS pin과 relay 공개키 옵션을 `start` 뒤에 그대로 붙일 수 있습니다. relay는 daemon과
별도 프로세스이므로 상태와 종료 명령도 분리됩니다.

```sh
"$AD" status
"$AD" doctor
"$AD" stop
"$AD" restart
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
another-dimension-daemon recovery rotate --data-dir PATH [--passphrase-output PATH]
another-dimension-daemon keychain enroll --data-dir PATH
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

복구 파일은 내보낸 시점의 암호화된 로컬 상태 스냅샷입니다. 이후에 relay에 남은
blob, 삭제된 로컬 데이터, 상대방 기기의 상태는 복원하지 않습니다. 복구는
클라우드 백업이나 완전 다중 기기 복구를 의미하지 않습니다.

`recovery rotate`는 기존 암호문구만 stdin으로 받고 새 암호문구는 랜덤 생성합니다.
`--passphrase-output`을 지정하지 않으면 화면에서 한 번 복사할 수 있고, 지정하면
0600 파일로 저장됩니다. 복구 import 후에는 원래 암호문구로 다음을 한 번 실행해
macOS Keychain 등록을 복원할 수 있습니다.

복구 파일을 새 디렉터리에 가져온 뒤 Keychain 자동 잠금 해제를 사용하려면 원래
암호문구를 stdin으로 한 번만 제공해 등록합니다.

```sh
printf '%s' "$(cat /secure/offline/alice.passphrase)" | \
  cargo run -p another-dimension-daemon -- \
  keychain enroll --data-dir .local/alice-restored
```

## 검증 명령

Rust 산출물은 `.cargo/config.toml`에 따라 `.build-cache/cargo-target`에만
생성됩니다. `target/`은 이전 실행에서 남은 legacy cache이며 제품 데이터나
로그가 아닙니다. debug/test incremental compilation은 비활성화되어 소스 변경별
incremental tree가 계속 쌓이지 않습니다.
이 cache는 실행·배포에 필수인 영구 데이터가 아니라 재컴파일 시간을 줄이는
임시 산출물이며, 검증 시작 시 기본 2GB를 넘으면 자동으로 비워집니다. 완전히
비우고 싶으면 아래 정리 명령을 사용하면 됩니다.

현재 build cache 용량 확인과 정리:

```sh
scripts/clean_build_artifacts.sh          # dry-run, 삭제하지 않음
scripts/clean_build_artifacts.sh --apply  # 명시적으로 재생성 가능한 cache 삭제
du -sh target .build-cache/cargo-target 2>/dev/null
```

릴리스 아카이브와 웹 배포 산출물은 별도 명령으로 관리합니다. 릴리스 증거를
보존해야 하는 경우에는 실행하지 마세요.

```sh
scripts/clean_release_artifacts.sh          # dry-run
scripts/clean_release_artifacts.sh --apply  # public-release와 web/dist 삭제
```

정리 후에는 검증 명령이 필요한 binary와 의존성을 자동으로 재생성합니다.
`target/`, `.build-cache/cargo-target`, `.git`, 소스, 문서, profile data가 아닌
경로를 직접 삭제 대상으로 지정하지 마세요.

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

검증 스크립트는 `CARGO_BUILD_JOBS=2`, `CARGO_INCREMENTAL=0`을 사용하고 동일
Cargo target을 공유합니다. 전체 검증에서도 clippy는 library target만 검사해
테스트·보조 target의 중복 컴파일을 피합니다. 기본 검증은 현재 제품인 daemon, 웹 UI, relay만
다룹니다. 삭제된 Tauri/CLI
프로토타입의 성공 여부를 제품 증거로 사용하지 않습니다.

`scripts/verify_all.sh`는 일반 개발 루프가 아니라 release/compliance 전용 게이트입니다.
정책 fixture, 릴리스 증거, 지원 환경 검사를 포함하므로 변경할 때마다 반복 실행하지
말고 릴리스 준비 시에만 `--focused` 또는 `--release`로 실행하세요.

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

| 데이터 | 위치 | 수명 |
| --- | --- | --- |
| daemon 프로필 | `--data-dir` | `wipe`로 삭제 시도. SSD 잔여·백업·브라우저 캐시 삭제는 보장하지 않음 |
| relay 데이터 | relay 데이터 디렉터리 | envelope 기본 7일·blob 최대 7일·capability 30일 TTL |
| 브라우저 임시 상태 | Chromium 쿠키·세션 저장소·캐시 | daemon 재시작 시 bootstrap URL·쿠키 무효화 |
| recovery 파일 | 사용자가 지정한 오프라인 매체 | 내보낸 시점의 암호화 스냅샷. relay blob·삭제 데이터는 미포함 |

프로필은 `--data-dir` 단위로 분리됩니다. 같은 기기의 여러 프로필은 별도
데이터 디렉터리와 별도 daemon 인스턴스를 사용하며 서로의 데이터에 접근하지
않습니다. relay 운영자가 보는 정보와 보지 못하는 정보는
[SUPPORT.md](SUPPORT.md)의 표를 참고하세요.

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
