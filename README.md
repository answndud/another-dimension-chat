# Another Dimension

Another Dimension은 전화번호·이메일·중앙 계정 없이, 각 사용자의 Mac에서 암호화
상태를 보관하는 보안 채팅 도구입니다. 1:1 대화와 **다중 멤버 그룹 채팅**을 지원하며,
Chromium 화면에서 초대 코드를 교환하고 안전번호를 확인한 뒤 **실시간으로** 메시지를
주고받을 수 있습니다.

> 현재 제품은 `high-risk-disabled` 상태입니다. 독립 보안 검토, 실제 운영 키 신뢰,
> 서명·공증된 배포 증거가 확보되지 않았으므로 기자·취재원·활동가의 고위험 통신에
> 사용하지 마세요. 구현되어 있다는 사실만으로 익명성, 검열 저항성 또는 고위험 통신
> 안전성을 보증하지 않습니다.

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
│      │   ├─ WebSocket 실시간 push          │
│      │   └─ 초대·안전번호·복구             │
│      └─ React + TypeScript UI (Chromium)  │
└──────────────────┬───────────────────────┘
                   │ 암호화된 불투명 봉투
                   ▼
             사용자 소유 Rust relay
```

- **웹 UI**: React 19 + TypeScript + Vite. 컴포넌트 기반 구조로 타입 안전을 보장합니다.
- **실시간 수신**: daemon이 `/local-api/events` WebSocket으로 새 메시지를 즉시 push합니다.
  연결 끊김 시 자동 재연결(3초)하고 놓친 메시지를 복구합니다.
- **그룹 채팅**: 여러 멤버의 key package를 batch add-member로 MLS 그룹에 추가하고,
  각 멤버에게 welcome을 relay를 통해 전달합니다.
- 브라우저는 화면과 입력만 담당하며 장기 개인키, OpenMLS 상태, 데이터베이스 키를
  보관하지 않습니다.
- daemon은 loopback에 인증된 로컬 화면을 열고, 키·세션·메시지 저장을 소유합니다.
- relay는 평문과 개인키를 보지 못하고 암호문과 전달에 필요한 최소 정보를 취급합니다.
- relay 운영자는 IP 주소, 접속 시각, 접속 빈도, 메시지 크기 등 메타데이터를 볼 수
  있습니다. 이 프로젝트는 익명 네트워크가 아닙니다.
- 전화번호, 이메일, 전역 사용자 검색, 중앙 연락처 탐색, 푸시 알림, 클라우드 백업은
  제품 범위에 포함하지 않습니다.

## 현재 지원 범위와 상태

| 항목 | 상태 |
|---|---|
| 플랫폼 | Apple Silicon macOS (arm64), macOS 12+ |
| 브라우저 | Chromium 계열 (Chrome, Edge, Brave). Safari/Firefox 미지원 |
| 웹 UI | React 19 + TypeScript 5.8 + Vite 6 |
| 실시간 수신 | WebSocket push (`/local-api/events`) — polling 없음 |
| 채팅 | 초대 코드, 서명 검증, 만료·일회성 확인, 안전번호 확인 |
| 대화 유형 | 1:1 및 다중 멤버 그룹 (batch MLS add-member) |
| 첨부파일 | 청크 단위 암호화, 최대 32 MiB |
| 저장 | Mac의 AES-256-GCM 암호화 로컬 저장소와 macOS Keychain |
| 릴리스 모드 | `development`, `private-trusted` |
| 공개 배포·고위험 사용 | 독립 검토·운영 증거 생기기 전까지 차단 |

## 일반 사용법

터미널, Rust, 포트, `data-dir`, manifest를 직접 다루지 않습니다. 운영자에게서 받은
검증된 배포본을 기준으로 다음만 수행합니다.

1. `Another Dimension.app`을 더블클릭하면 relay와 daemon이 자동 시작되고
   Chromium 화면이 열립니다.
2. 화면에서 표시 이름을 입력하고 **내 계정 만들기**를 누릅니다.
3. **복구 파일 다운로드**를 눌러 암호화된 오프라인 매체(USB)에 보관합니다.
4. 한 사람이 **초대 코드 만들기**를 클릭하고 코드를 별도 신뢰 채널(전화, 대면)로
   전달합니다.
5. 상대방은 **초대 참여하기**에 코드를 입력합니다.
6. 양쪽이 화면에 표시된 **안전번호**를 대조한 후 **승인**합니다.
7. 메시지를 입력하고 **보내기**를 누르면 상대방 화면에 실시간으로 나타납니다.

### 그룹 채팅 시작하기

1:1 대화가 연결되면 **그룹 초대** 섹션에서 추가할 멤버를 선택하고 **그룹에 추가**를
클릭합니다. 멤버들이 welcome을 받으면 자동으로 그룹에 합류합니다.

### 실시간 연결 상태

상단 배너로 현재 상태를 확인할 수 있습니다:

| 배너 | 의미 |
|---|---|
| 🟢 실시간 수신 대기 중 | 정상. 새 메시지 자동 표시 |
| 🟡 재시도 중 | WebSocket 끊김, 3초마다 재연결 중 |

초대 코드·안전번호·복구 파일·local URL을 메신저나 지원 요청에 보내지 마세요.

## 개발자 가이드

### 사전 요구사항

| 도구 | 버전 | 용도 |
|---|---|---|
| Rust | stable (rustup 권장) | daemon, relay, tools 컴파일 |
| Node.js | 18 LTS 이상 | 웹 UI 빌드 (Vite) |
| npm | 9+ | 패키지 관리 |

> Xcode Command Line Tools는 macOS에서 Rust 컴파일에 필요할 수 있습니다:
> `xcode-select --install`

### 빌드

```sh
# 1. 웹 UI 빌드 (React + TypeScript + Vite)
cd apps/web
npm install
npm run build    # tsc && vite build
cd ../..

# 2. Rust 바이너리 빌드
CARGO_BUILD_JOBS=4 cargo build \
  -p another-dimension-daemon \
  -p another-dimension-relay \
  --release
```

빌드 산출물: `.build-cache/cargo-target/release/another-dimension-{daemon,relay}`

### 개발 실행

```sh
# 1. relay 시작
export AD_RELAY_BIND_HOST=127.0.0.1 AD_RELAY_PORT=19540 AD_RELAY_DATA_DIR=.local/relay
.build-cache/cargo-target/release/another-dimension-relay &

# 2. daemon 시작
mkdir -p .local/alice
.build-cache/cargo-target/release/another-dimension-daemon init \
  --display-name Alice --data-dir .local/alice \
  --passphrase-output .local/alice/passphrase.txt

cat .local/alice/passphrase.txt | \
.build-cache/cargo-target/release/another-dimension-daemon serve \
  --data-dir .local/alice --port 1420 \
  --ui-dir apps/web/dist \
  --relay-origin http://127.0.0.1:19540 \
  --inbox-url "http://127.0.0.1:19540/api/v1/inbox/$(cat .local/relay/inbox-capability)" \
  --relay-public-key "$(curl -s http://127.0.0.1:19540/api/v1/info | jq -r .relayReceiptPublicKey)" \
  --relay-public-key-fingerprint "$(curl -s http://127.0.0.1:19540/api/v1/info | jq -r .relayReceiptPublicKeyFingerprint)"
```

터미널에 출력되는 `open once:` URL을 Chrome에서 열면 됩니다.

### 테스트

```sh
# daemon 전체 테스트
cargo test -p another-dimension-daemon

# focused test
cargo test -p another-dimension-daemon websocket
cargo test -p another-dimension-daemon mls_session
cargo test -p another-dimension-daemon pairing

# web 타입 검사 + 빌드
cd apps/web && npx tsc && npx vite build

# E2E smoke (3인 그룹 포함)
bash scripts/smoke_p0.sh
```

### 릴리스 만들기

```sh
CARGO_BUILD_JOBS=2 cargo build --release --locked --offline
AD_RELEASE_SIGNING_KEY=/secure/release/release-private.pem \
AD_RELEASE_PUBLIC_KEY=/secure/release/release-public.pem \
scripts/private_release.sh build
```

생성된 archive에는 Rust 바이너리, Vite로 빌드된 정적 UI, `.app`, launcher가 포함됩니다.
Node.js runtime과 `node_modules`는 포함되지 않습니다.

### 경량화와 검증

```sh
scripts/clean_build_artifacts.sh          # dry-run
scripts/clean_build_artifacts.sh --apply  # cache 삭제
scripts/verify_light.sh                  # 짧은 기본 검증
```

릴리스 후보에서만:

```sh
CARGO_BUILD_JOBS=2 scripts/verify_full.sh --release
```

## 보안 한계

이 도구는 다음을 해결하지 않습니다.

- 감염된 Mac, 키로거, 악성 브라우저 확장, 화면 캡처
- 상대방이 메시지를 복사하거나 촬영하는 행위
- IP·접속 시각·트래픽 크기 분석
- OS 백업·crash dump·swap·압수된 기기의 잔존 데이터
- 독립적인 암호 구현 감사가 없는 상태에서의 프로토콜 안전성 인증

## 저장소 구조

```text
apps/
  daemon/       로컬 신원·암호화·저장소·HTTP bridge·WebSocket push
  relay/        Rust 기반 불투명 전달 relay (다중 rendezvous responses)
  tools/        release manifest·trust 도구
  web/          React 19 + TypeScript + Vite 웹 UI
docs2/          private 설계·운영 문서 (개편 후 기준)
reference/      제품 경계·위협 모델·릴리스 참고 문서
scripts/        빌드·실행·릴리스·검증 스크립트
```

기여 전에는 `SECURITY.md`와 제품 경계를 먼저 읽고, 실제 비밀·복구 파일·사용자
대화 데이터를 저장소나 이슈에 올리지 마세요.
