# Another Dimension

Another Dimension은 전화번호·이메일·중앙 계정 없이, 각 사용자의 Mac에서
암호화 상태를 보관하는 1:1 보안 채팅 도구입니다. 사용자는 Chromium 화면에서
초대 코드를 교환하고 안전번호를 확인한 뒤 대화합니다.

> 현재 제품은 `high-risk-disabled` 상태입니다. 독립 보안 검토, 실제 운영 키
> 신뢰, 서명·공증된 배포 증거가 확보되지 않았으므로 기자·취재원·활동가의
> 고위험 통신에 사용하지 마세요. 구현되어 있다는 사실만으로 익명성, 검열
> 저항성 또는 고위험 통신 안전성을 보증하지 않습니다.

## 이 프로젝트가 하는 일

```text
사용자 Mac
┌──────────────────────────────────────────┐
│ Another Dimension.app                    │
│  └─ Rust launcher                         │
│      ├─ 로컬 Rust daemon                  │
│      │   ├─ 계정·기기 신원                │
│      │   ├─ OpenMLS 세션과 암복호화        │
│      │   ├─ 암호화 로컬 저장소             │
│      │   └─ 초대·안전번호·복구             │
│      └─ 사용자의 Chromium UI              │
└──────────────────┬───────────────────────┘
                   │ 암호화된 불투명 봉투
                   ▼
             사용자 소유 Rust relay
```

- 브라우저는 화면과 입력만 담당하며 장기 개인키, OpenMLS 상태, 데이터베이스 키를
  보관하지 않습니다.
- daemon은 loopback에 인증된 로컬 화면을 열고, 키·세션·메시지 저장을 소유합니다.
- relay는 평문과 개인키를 보지 못하고 암호문과 전달에 필요한 최소 정보를 취급합니다.
- relay 운영자는 IP 주소, 접속 시각, 접속 빈도, 메시지 크기 등 메타데이터를 볼 수
  있습니다. 이 프로젝트는 익명 네트워크가 아닙니다.
- 전화번호, 이메일, 전역 사용자 검색, 중앙 연락처 탐색, 푸시 알림, 클라우드 백업은
  제품 범위에 포함하지 않습니다.

## 현재 지원 범위와 상태

- 지원 대상: Apple Silicon macOS(arm64)와 명시된 Chromium 계열 브라우저
- 앱 사용: `Another Dimension.app` 더블클릭
- 런타임: Rust daemon과 Rust relay만 사용하며 Node.js/npm은 필요하지 않음
- 채팅: 초대 코드, 서명 검증, 만료·일회성 확인, 안전번호 확인 후 1:1 대화
- 저장: Mac의 암호화 로컬 저장소와 macOS Keychain
- 릴리스 모드: 개발용 `development`, 제한된 지인 배포용 `private-trusted`
- 공개 배포와 고위험 사용: 독립 검토·운영 증거가 생기기 전까지 차단

지원 환경과 보안 경계의 상세 기준은 [`SECURITY.md`](SECURITY.md)와
[`reference/SUPPORT_MATRIX.json`](reference/SUPPORT_MATRIX.json)을 확인하세요.

## 일반 사용법

일반 사용자는 터미널, Rust, 포트, `data-dir`, manifest, relay capability를
직접 다루지 않습니다. 운영자에게서 받은 검증된 통합 배포본을 기준으로 다음만
수행합니다.

1. `Another Dimension.app`을 응용 프로그램 폴더로 옮깁니다.
2. 앱을 더블클릭합니다. 처음 실행하면 로컬 relay와 보안 서비스가 준비되고
   Chromium 화면이 열립니다.
3. 화면에서 표시 이름을 입력하고 `내 계정 만들기`를 누릅니다. 암호화 키와
   계정 비밀은 daemon이 생성하며 브라우저 화면으로 노출하지 않습니다.
4. `복구 파일 저장`을 눌러 암호화 복구 파일을 저장합니다. Mac과 분리된 암호화
   오프라인 매체에 보관해야 채팅을 시작할 수 있습니다.
5. 한 사람이 `일회성 초대 만들기`를 선택하고 코드를 다른 신뢰 채널로 전달합니다.
6. 상대방은 `상대 초대에 참여하기`에 코드를 입력합니다.
7. 양쪽이 화면에 표시된 안전번호 전체를 전화·대면 등 별도 채널에서 비교합니다.
8. 번호가 일치할 때만 연결을 승인하고 메시지를 보냅니다.

초대 코드·안전번호·복구 파일·local URL·원본 로그를 메신저나 지원 요청에 보내지
마세요. 앱에 표시된 일반 오류 문구만 운영자에게 전달하세요.

### 앱 종료와 재실행

앱을 종료하면 daemon과 로컬 relay를 함께 종료합니다. 다시 앱을 더블클릭하면
같은 로컬 프로필을 Keychain으로 잠금 해제하고 Chromium 화면을 엽니다. 계정이
사라졌거나 복구가 필요한 화면이 나오면 새 계정을 만들지 말고 앱을 종료한 뒤
운영자에게 문의하세요.

### 복구와 로컬 삭제

- 복구 파일은 로컬 암호화 상태의 스냅샷입니다. 상대방 기기, relay에 이미 전달된
  자료, OS 백업, 화면 캡처까지 복원하거나 삭제하지 않습니다.
- `보안과 복구` 화면에서 암호화 복구 백업을 다운로드하고, 필요하면 검증 후 다음
  시작 때 적용하도록 예약할 수 있습니다.
- `이 기기의 모든 로컬 데이터 삭제`는 되돌릴 수 없습니다. 앱만 삭제하는 것은
  프로필·복구 파일·relay 데이터를 삭제하지 않습니다.

## 릴레이 운영 방식

통합 배포본은 각 사용자의 Mac에서 개발·개인용 Rust relay를 함께 시작합니다.
사용자 소유 relay를 별도 운영하려면 운영자가 Rust relay를 실행하고, 생성된
inbox URL·relay 공개키·인증서 pin을 daemon 설정에 넣어야 합니다. 이 작업은
일반 사용자에게 요구하지 않습니다.

### 개발용 로컬 relay

저장소 루트에서 다음 명령으로 개발 relay를 실행합니다. 기본값은 loopback
`127.0.0.1:1422`이며 외부 네트워크에 공개하지 않습니다.

```sh
AD_RELAY_DATA_DIR=.local/relay \
AD_RELAY_PORT=1422 \
scripts/start_local_server.sh
```

또는 Rust 바이너리를 직접 실행할 수 있습니다.

```sh
AD_RELAY_DATA_DIR=.local/relay \
AD_RELAY_PORT=1422 \
cargo run -p another-dimension-relay --offline
```

relay의 private info와 capability는 relay 데이터 디렉터리에 owner-only로
저장됩니다. 로그·화면 공유·이슈에 복사하지 마세요. `AD_SERVE_UI=1`은 개발 편의
기능일 뿐 공개 서비스용 UI가 아닙니다.

## 개발자가 로컬에서 실행하기

### 필요한 것

- Apple Silicon macOS
- Rust toolchain과 Cargo
- 지원 Chromium 브라우저
- 의존성은 `Cargo.lock`으로 고정되며 Node.js/npm은 필요하지 않습니다.

빌드 산출물은 `.build-cache/cargo-target`에만 두도록 설정되어 있습니다. `target/`,
`.build-cache/`, `apps/web/dist/`는 재생성 가능한 산출물이며 Git에 커밋하지 않습니다.

### 웹 UI 빌드

```sh
scripts/build_web_static.sh
```

### 프로필과 daemon을 직접 실행하는 개발 흐름

아래 흐름은 일반 사용자용이 아니라 daemon·bridge를 개발할 때만 사용합니다.

```sh
mkdir -p .local/alice
cargo run -p another-dimension-daemon -- \
  init \
  --display-name "Alice" \
  --data-dir .local/alice \
  --passphrase-output /secure/offline/alice.passphrase
```

암호문구는 운영체제 난수로 생성됩니다. 명령행 인자에 비밀값을 넣지 않으며,
생성된 파일은 owner-only 권한의 별도 암호화 매체에 보관합니다.

```sh
printf '%s' "$(cat /secure/offline/alice.passphrase)" | \
  cargo run -p another-dimension-daemon -- \
  serve \
  --data-dir .local/alice \
  --port 1420 \
  --ui-dir apps/web/dist \
  --relay-origin http://127.0.0.1:1422 \
  --inbox-url http://127.0.0.1:1422/api/v1/inbox/CAPABILITY \
  --relay-public-key RELAY_PUBLIC_KEY_HEX \
  --relay-public-key-fingerprint RELAY_FINGERPRINT_HEX \
  --open
```

원격 relay는 HTTPS, 사전에 확인한 SHA-256 인증서 pin, relay 공개키와 fingerprint를
모두 요구합니다. 확인하지 않은 새 pin으로 자동 전환하지 않습니다.

### daemon 주요 명령

```text
setup --data-dir PATH --port PORT --ui-dir PATH --open
init --display-name NAME [--data-dir PATH] [--passphrase-output PATH]
identity show [--data-dir PATH] [--keychain]
status [--data-dir PATH]
serve --data-dir PATH --relay-origin ORIGIN --inbox-url URL [옵션]
stop [--data-dir PATH]
device list|revoke|link-request|link-complete
doctor [--data-dir PATH]
keychain enroll --data-dir PATH
recovery export|inspect|rotate|import
wipe --data-dir PATH
```

`wipe`는 로컬 daemon 저장소 삭제 명령입니다. SSD 잔여 영역, OS 백업, relay blob,
브라우저 캐시와 상대방 기기의 사본까지 안전하게 삭제한다고 주장하지 않습니다.

## 제한된 지인용 릴리스 만들기

릴리스 운영자는 개인키를 저장소나 공개 채널에 넣지 않습니다. `private-trusted`
릴리스는 Rust daemon·Rust relay·Rust release tools·정적 UI를 포함한 통합 archive와
Finder에서 실행할 수 있는 `.app`을 생성합니다.

```sh
CARGO_BUILD_JOBS=2 cargo build --release --locked --offline
AD_RELEASE_SIGNING_KEY=/secure/release/release-private.pem \
AD_RELEASE_PUBLIC_KEY=/secure/release/release-public.pem \
scripts/private_release.sh build
```

운영 signing key가 없거나 안전하게 보관되지 않았다면 배포하지 않습니다. 생성된
archive는 운영자가 별도 채널에서 전달받은 공개키·trust 자료와 대조한 뒤 검증합니다.

```sh
scripts/private_release.sh verify another-dimension-0.1.0.tar.gz \
  --public-key /secure/release/release-public.pem
```

`release-manifest` 검증은 파일 목록·해시·서명을 확인합니다. 이것만으로 독립 보안
검토, 운영 키 custody, macOS 공증, 고위험 사용자 승인이 완료되는 것은 아닙니다.

### macOS 앱 게이트

릴리스 builder는 앱 내부에 daemon·relay·tools·웹 UI를 포함하고, 다음 경계를
자동 확인합니다.

```sh
scripts/verify_macos_app.sh \
  public-release/another-dimension-0.1.0/Another\ Dimension.app
```

운영 서명을 요구할 때는 `AD_MACOS_SIGNING_IDENTITY`와
`AD_REQUIRE_MACOS_SIGNING=1`을 설정합니다. Apple notarization과 Gatekeeper 검증을
요구할 때는 `AD_REQUIRE_MACOS_NOTARIZED=1`도 설정해야 합니다. ad-hoc 서명이나
로컬 rehearsal은 실제 운영 signing·notarization 증거가 아닙니다.

## 경량화와 검증

CPU·디스크 사용량을 제한하기 위해 개발·검증 명령은 기본적으로 `CARGO_BUILD_JOBS=2`,
`CARGO_INCREMENTAL=0`, offline 의존성을 사용합니다.

```sh
scripts/clean_build_artifacts.sh          # dry-run
scripts/clean_build_artifacts.sh --apply  # 재생성 가능한 cache 삭제
scripts/verify_light.sh                  # 짧은 기본 검증
```

릴리스 후보에서만 다음을 실행합니다. 동일 revision에서 반복 실행하지 않습니다.

```sh
CARGO_BUILD_JOBS=2 scripts/verify_full.sh --release
```

검증은 실제 소스·문서·private profile data를 삭제하지 않습니다. `target/`,
`.build-cache/cargo-target`, `public-release`, `apps/web/dist`만 재생성 가능한
정리 대상입니다.

## 보안 한계

이 도구는 다음을 해결하지 않습니다.

- 감염된 Mac, 키로거, 악성 브라우저 확장, 화면 캡처
- 상대방이 메시지를 복사하거나 촬영하는 행위
- IP·접속 시각·트래픽 크기 분석
- 악성 운영 relay가 전달을 지연·차단하거나 메타데이터를 기록하는 행위
- OS 백업·crash dump·swap·압수된 기기의 모든 잔존 데이터
- 독립적인 암호 구현 감사가 없는 상태에서의 프로토콜 안전성 인증

현재 `highRiskAllowed`를 활성화하는 우회 방법은 제공하지 않습니다. 고위험 사용
승인을 위해서는 독립 암호·프로토콜 검토, 실제 운영 signing/bootstrap key ceremony,
깨끗한 Apple Silicon·Chromium 배포 증거, 로컬 단말 hardening 증거가 별도로
필요합니다.

## 저장소 구조

```text
apps/daemon/   로컬 신원·암호화·저장소·HTTP bridge
apps/relay/    Rust 기반 불투명 전달 relay
apps/tools/    정적 UI·release manifest·release trust 도구
apps/web/      daemon 화면과 사용자 워크플로우
reference/     제품 경계·위협 모델·릴리스 운영 참고 문서
scripts/       빌드·실행·릴리스·경량 검증 스크립트
```

`docs/`는 공개 배포물에 포함하지 않는 private planning/security notes입니다.
기여 전에는 `SECURITY.md`와 제품 경계를 먼저 읽고, 실제 비밀·복구 파일·사용자
대화 데이터를 저장소나 이슈에 올리지 마세요.
