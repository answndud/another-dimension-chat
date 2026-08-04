# ADR.md

## ADR-0001 - 사용자별 로컬 서버를 메시지 전달 경계로 사용

- 상태: superseded by ADR-0006
- 날짜: 2026-07-31
- 근거 유형: explicit

### Context

사용자는 ChatGPT Sites나 중앙 hosting에 의존하지 않고, 각 사용자가 자신의
기기에서 서버를 실행한 뒤 상대가 그 서버에 접속하는 구조를 원한다. 기존
웹 prototype은 브라우저 IndexedDB와 수동 envelope 복사만 제공한다.

브라우저만으로는 다른 기기의 inbound 연결을 받을 수 없다. 또한 `localhost`는
서버를 실행한 기기에서만 접근되므로, 원격 연결에는 LAN 주소·VPN·포트 공개 중
하나가 사용자가 직접 선택해야 한다.

### Decision

각 사용자의 로컬 서버가 사용자 소유 opaque-envelope inbox를 제공한다. 초기
prototype에서는 정적 웹 UI도 함께 제공했지만, UI 코드 공급망과 relay를 같은
신뢰 경계에 두는 문제 때문에 그 부분은 ADR-0006으로 대체한다. 서버는 중앙
discovery나 신뢰된 메시지 저장소가 아니며, 평문·private key·passphrase를 받지
않는다. 메시지 본문은 브라우저에서 암호화된 envelope로 서버에 도착한다.

초기 서버 경계는 다음으로 제한한다.

- 기본 bind는 `127.0.0.1`이며 LAN·VPN·공개 bind는 명시적인 사용자 설정으로만 연다.
- 서버마다 추측하기 어려운 inbox capability path를 생성하고, 사용자가 교환하는
  signed invite에 그 endpoint를 선택적으로 포함한다.
- inbox에는 크기 제한이 있는 opaque envelope만 저장하고, 만료·중복·ack 정책을
  적용한다.
- 서버 간 연결 자동화, UPnP/포트포워딩, 공용 relay, Tor/WebRTC는 이 slice에 넣지 않는다.
- 외부 접속 가능성은 사용자의 네트워크와 TLS/VPN 구성에 달려 있으며 서버가
  anonymity나 availability를 보장하지 않는다.
- 개발 환경에서는 localhost UI가 통제된 LAN의 HTTP inbox를 호출할 수 있지만,
  capability와 metadata 노출·opaque traffic 주입/삭제 위험 때문에 운영 경로로
  취급하지 않는다.

### Alternatives

- **ChatGPT Sites/Vercel 중앙 정적 hosting** — UI 배포에는 쓸 수 있지만 사용자별
  서버 경계와 직접 접속 모델을 대체하지 못한다. 사용자가 선택하지 않았다.
- **중앙 relay/store-and-forward 서버** — availability는 좋아지지만 no central
  trusted server 목표와 metadata 위험이 커진다.
- **브라우저끼리 WebRTC** — signaling, IP 노출, NAT traversal이 별도 결정이므로
  첫 구현에서 제외한다.

### Consequences

- 사용자는 서버를 직접 실행하고 endpoint를 직접 교환해야 한다.
- 서버가 꺼져 있거나 네트워크에서 도달 불가능하면 자동 전달되지 않는다.
- envelope signature 검증은 서버가 ciphertext를 바꾸거나 잘못 전달하는 경우를
  감지하기 위해 필요하다.
- 브라우저 UI는 서버 없는 수동 모드도 계속 지원해야 한다.

### Evidence

- `AGENTS.md`: 중앙 trusted server, central message server, push, contact discovery를
  v0.1 범위에서 제외한다.
- `apps/web/src/web-runtime.js`: signed invite의 선택적 capability endpoint와
  sealed envelope 전송·수신·ack·서명/replay 검증을 구현한다.
- 사용자 요청: 각 사용자가 본인의 기기에서 서버를 켜고 상대가 접속하는 방식을 선택했다.

### Open Questions

- 최종 배포 binary가 필요한 시점에 Node 실행 요구사항을 Rust/desktop wrapper로
  대체할지는 별도 ADR로 결정한다.

## ADR-0002 - 사용자 소유 서버의 초기 실행 단위를 Node 정적 서버로 고정

- 상태: superseded by ADR-0006
- 날짜: 2026-07-31
- 근거 유형: explicit

### Context

제품은 중앙 hosting 계정 없이 각 사용자의 기기에서 서버를 시작할 수 있어야
한다. 현재 브라우저 bundle과 opaque inbox를 함께 제공하는 구현은 Node 내장
HTTP API만으로 동작하며, Rust/Tauri 전체 native build는 CPU와 배포 복잡도가
크고 아직 서버 경계와 통합되지 않았다.

### Decision

v0.1의 재현 가능한 실행 단위는 `apps/server/server.mjs`와 빌드된
`apps/web/dist`를 Node.js로 실행하는 방식으로 한다. 사용자는
`scripts/start_local_server.sh` 또는 `npm --prefix apps/server start
--workspaces=false`로 시작한다. Rust CLI와 Tauri는 현재 서버를 대체하지 않는
선택적 wrapper로 유지하며, native binary 전환은 별도 결정으로 남긴다.

### Consequences

- Node.js가 설치된 새 기기에서 bundle build → server start → browser open을
  재현할 수 있다.
- signed release, notarization, 자동 업데이트, OS 서비스 등록은 아직 제공하지
  않는다.
- Node runtime 자체의 보안 업데이트와 사용자 운영 책임이 생긴다.

### Evidence

- `apps/server/server.mjs`: static UI, health, capability inbox, bounded storage
- `scripts/start_local_server.sh`: bundle 존재를 확인하는 단일 시작 명령
- `apps/server/server.test.mjs`: health, malformed request, TTL, restart recovery

## ADR-0003 - 원격 도달성은 사용자가 선택한 네트워크 경로로 분리

- 상태: accepted
- 날짜: 2026-07-31
- 근거 유형: explicit

### Context

loopback 서버는 같은 기기에서만 접근된다. 다른 기기와 직접 통신하려면 LAN,
사용자 관리 VPN, 또는 사용자 관리 HTTPS reverse proxy 중 하나가 필요하다.
앱이 UPnP, port forwarding, TLS, anonymity를 자동으로 보장한다고 설명하면
사용자가 도달성과 보안 보장을 혼동할 수 있다.

### Decision

loopback을 기본값으로 유지하고, README에 LAN·Tailscale/WireGuard·사용자 관리
HTTPS reverse proxy를 별도 선택지로 문서화한다. `AD_PUBLIC_URL`은 상대가 실제로
접근 가능한 origin으로 사용자가 설정한다. 앱은 자동 port forwarding, 인증서
발급, 인증, anonymity를 제공하지 않는다. 다만 사용자가 PEM key/certificate를
제공하면 Node 서버가 직접 HTTPS를 종료할 수 있으며, 공개 운영에는 reverse
proxy를 권장한다. `AD_PUBLIC_URL`은 path나 credential이 없는 HTTP(S) origin으로
검증하고, wildcard bind에는 필수로 요구한다. 서버 info는 listener TLS와
외부에 광고된 HTTPS를 분리해 reverse proxy 설정을 직접 TLS로 오인하지 않게 한다.
공개 root에서 inbox capability가 노출되지 않도록 server info는 시작 시 생성한
별도 local-access capability를 제시한 browser에만 반환한다.
invite에 포함되는 inbox capability는 POST 전용으로 제한하고, queue GET과 ack는
local-access capability를 함께 제시한 소유자 browser에만 허용한다.
사용자가 환경변수를 직접 조합하지 않도록 guided startup이 local,
reverse-proxy/Tailscale Serve, direct-TLS 중 하나를 검증해 owner-only JSON
설정으로 저장하고 이후 실행에서 자동 재사용한다.

### Consequences

- endpoint 교환만으로 원격 도달성이 생긴다고 약속하지 않는다.
- VPN과 reverse proxy의 TLS·접근 제어·방화벽 정책은 사용자가 운영한다.
- 각 경로는 capability URL과 envelope 암호화 경계를 유지하지만 metadata와
  네트워크 노출은 경로에 따라 달라진다.

### Evidence

- `apps/server/server.mjs`: loopback default, explicit bind/public URL
- `apps/server/server.mjs`: optional paired TLS key/certificate termination
- `scripts/configure_local_server.mjs`, `scripts/start_local_server.sh`: guided
  config 생성, 권한 제한, 자동 재사용
- `README.md`, `README.ko.md`: LAN/VPN/HTTPS 선택지와 비자동 보장 명시
- `SECURITY.md`: user-owned inbox와 non-claims

## ADR-0004 - 브라우저 메시지 암호화를 기존 Rust Noise XX 경계로 통합

- 상태: superseded by ADR-0005
- 날짜: 2026-07-31
- 근거 유형: explicit + inferred

### Context

초기 web prototype의 브라우저 전용 P-256 ECDH/HKDF/AES-GCM 조합은 저장소의
Rust 암호 경계와 분리되어 있었고, nested JSON을 완전히 서명하지 않는
canonicalization 오류도 있었다. 사용자는 시연 가능한 완성품을 요구하면서
필요하면 아키텍처를 교체하도록 명시했다. `reference/CRYPTO_DECISION.md`는
직접 암호 구성을 만들지 않고 기존 `snow` Noise XX 경계를 확장하는 방향을
정한다.

### Decision

`crates/crypto`의 `Noise_XX_25519_ChaChaPoly_BLAKE2s` 구현을 얇은
`crates/web-crypto-wasm` adapter로 브라우저에 제공한다. ECDSA P-256은
invite, handshake control, message envelope의 identity signature에만 사용하고,
Noise XX가 session setup과 message encryption을 담당한다.

- protocol v2는 nested object 전체를 재귀적으로 정렬한 canonical JSON에
  서명한다.
- 네 단계 signed control envelope(`init`, `reply`, `finish`, `ready`)로 양쪽이
  동일한 peer static key와 session 완료를 확인한다.
- Noise private key, handshake 복구 자료, send/receive nonce와 pending control
  envelope는 passphrase-wrapped profile material에 저장한다.
- protocol v1 IndexedDB는 삭제하지 않고 별도 v2 database를 사용한다. 자동
  migration은 하지 않으며 사용자는 새 profile로 다시 pairing한다.
- 생성된 WASM은 release에 포함하고, crypto source 변경 시에만 명시적으로
  재생성한다.

### Alternatives

- **브라우저 전용 custom ECDH/HKDF/AES-GCM 유지** — Rust 보안 경계와 중복되고
  protocol review surface가 커져 폐기한다.
- **Signal Double Ratchet을 즉시 직접 구현** — 검토된 구현과 lifecycle 설계 없이
  직접 만드는 것은 현재 crypto 원칙에 어긋난다.
- **서버에서 암복호화** — 서버에 trusted key boundary를 만들므로 제품 방향과
  충돌한다.

### Consequences

- 최초 pairing에 네 번의 control-envelope 전달이 필요하고 browser bundle에
  약 143 KiB의 WASM이 추가된다.
- session state는 lock/reload 후 복구되지만, persisted handshake material로
  transport key를 재구성하므로 ratchet, full forward secrecy,
  post-compromise recovery를 제공하지 않는다.
- Noise 사용은 보안 감사나 Signal 수준 보장을 뜻하지 않는다.
- v1 profile은 보존되지만 v2 runtime에서 표시되지 않으며 다시 pairing해야 한다.

### Evidence

- `crates/web-crypto-wasm/src/lib.rs`: browser-facing narrow Noise adapter
- `crates/crypto/src/lib.rs`: reviewed-library `snow` setup/transport boundary
- `apps/web/src/web-runtime.js`: deep canonical signature, persisted handshake,
  nonce/replay lifecycle
- `apps/web/src/web-runtime.test.js`: handshake, tamper, replay, persistence,
  protected inbox integration
- `reference/CRYPTO_DECISION.md`: existing Noise direction and implementation gate

## ADR-0005 - 브라우저 session을 vodozemac Olm Double Ratchet으로 교체

- 상태: accepted
- 날짜: 2026-07-31
- 근거 유형: explicit + inferred

### Context

ADR-0004의 stateless Noise transport는 lock/reload 복구를 위해 handshake 자료를
저장하고 매 메시지마다 동일한 transport key를 재구성했다. 따라서 persisted
state가 노출되면 과거 메시지 key도 재구성할 수 있고 post-compromise recovery를
위한 ratchet이 없었다. 고위험 1:1 messenger 목표에는 직접 만든 KDF/rekey가
아니라 유지보수되는 ratchet 구현이 필요하다.

검토한 후보 중 공식 Signal `libsignal`은 Double Ratchet을 제공하지만 AGPL과
전용 nightly/native build chain이 현재 MIT browser WASM 배포 경계에 맞지 않았다.
`snow`의 transport rekey는 application이 동기화를 책임져야 하고 state
serialization을 제공하지 않아 browser restart와 안전하게 결합할 수 없었다.

### Decision

browser protocol v3는 Apache-2.0 `vodozemac` 0.10의 고수준 Olm API를
WebAssembly adapter로 사용한다.

- Olm v2 full HMAC 설정과 3DH one-time key setup을 사용한다.
- signed invite가 P-256 identity, Olm Ed25519/Curve25519 identity,
  single-use one-time public key, endpoint를 재귀 canonical signature로 묶는다.
- deterministic initiator가 `olm-init` pre-key control envelope를 보내고,
  responder가 transcript를 복호화·검증한 뒤 `olm-ready` normal envelope로
  응답한다.
- account/session pickle은 passphrase-wrapped profile 안에 저장하고 성공한
  encrypt/decrypt마다 전진한 session pickle을 다음 작업 전에 저장한다.
- Olm 자체 out-of-order key 보관을 사용하며 application nonce/KDF/AEAD를
  추가하지 않는다.
- one-time key 재사용을 막기 위해 profile 하나를 peer 한 명에 고정한다.
- v1/v2 IndexedDB는 삭제하지 않고 별도 v3 database를 사용하며 자동 migration
  없이 새 profile과 re-pairing을 요구한다.

### Consequences

- handshake control envelope가 네 개에서 두 개로 줄고 offline initiator setup이
  가능해진다.
- 성공한 양방향 송수신이 Double Ratchet state를 전진시켜 forward secrecy와
  self-healing 기반을 제공한다.
- WASM asset은 약 467 KiB(gzip 약 197 KiB)로 증가한다.
- `vodozemac` 프로젝트의 외부 감사는 근거가 되지만 이 앱의 signature 조합,
  persistence, UI, transport를 감사한 것은 아니므로 production/Signal 수준을
  주장하지 않는다.
- Olm v2 session config는 crate의 `experimental-session-config` feature로
  노출되지만 v1의 8-byte truncated MAC 대신 full HMAC을 사용한다. dependency
  upgrade 시 이 경계를 재검증해야 한다.
- post-quantum 보안, multi-device session, backup recovery는 제공하지 않는다.

### Evidence

- `crates/web-crypto-wasm/src/lib.rs`: account/session pickle, 3DH setup,
  high-level Olm encrypt/decrypt adapter
- `apps/web/src/web-runtime.js`: protocol v3 transcript, signed controls,
  atomic ratchet persistence and single-peer profile lifecycle
- `apps/web/src/web-runtime.test.js`: bidirectional/out-of-order ratchet,
  persistence, tamper, replay, protected inbox
- `vodozemac` 0.10 docs and repository: Double Ratchet, modern pickle,
  `js` feature, Apache-2.0, external audit record

## ADR-0006 - 검증된 로컬 UI와 원격 relay/API를 분리

- 상태: accepted
- 날짜: 2026-07-31
- 근거 유형: explicit + inferred

### Context

현재 `apps/server/server.mjs`는 한 프로세스에서 정적 browser UI와 사용자 소유
inbox API를 함께 제공한다. 이 구조는 설치와 same-origin fetch에는 단순하지만,
원격 reverse proxy·서버 운영자·변조된 release가 JavaScript/WASM을 바꾸면
암호화가 시작되기 전에 browser passphrase, plaintext, key material을 관찰할 수
있다. Double Ratchet은 이미 변조된 client code를 보호하지 못한다.

동시에 제품은 중앙 trusted message server 없이 각 사용자의 기기에서 서버를
운영하고 browser에서 사용하는 방향을 유지해야 한다. 따라서 web 사용을
포기하지 않으면서 app-code trust와 message relay trust를 분리해야 한다.

### Decision

고위험·검증된 실행 경로는 다음 두 표면을 분리한다.

1. **로컬 UI/runtime surface** — 사용자가 검증한 signed prebuilt server
   package가 immutable browser bundle을 포함하고, UI는 `127.0.0.1` 또는
   `localhost`에서만 제공한다. package와 embedded/sidecar bundle의 manifest
   hash·signature를 시작 시 검증하고, 실패하면 UI와 relay를 시작하지 않는다.
   사용자는 채팅용 desktop app을 설치하지 않고 browser를 사용하지만, 신뢰
   anchor가 되는 server runtime package는 설치·검증해야 한다.
2. **원격 relay/API surface** — 다른 기기에서 접근하는 public endpoint는
   opaque envelope POST와 소유자 inbox GET/ack 같은 API만 제공한다. 원격
   endpoint와 reverse proxy는 `index.html`, JavaScript, CSS, WASM을 제공하지
   않으며 path fallback도 하지 않는다. public `AD_PUBLIC_URL`은 relay API
   origin으로만 의미를 갖는다.
3. **개발 편의 모드** — 현재 Node 정적 서버는 local development와 manual
   smoke용 combined UI+relay 모드로 유지할 수 있다. 이 모드는 unsigned,
   unverified convenience mode로 표시하며 high-risk mode로 진입할 수 없게
   한다.
4. **브라우저 구성** — local UI는 자신의 local relay capability를 loopback
   API에서 받고, peer invite에는 peer의 relay API endpoint만 포함한다. UI
   배포 origin과 peer message endpoint를 같은 신뢰 대상으로 취급하지 않는다.
5. **배포 증거** — release에는 signed manifest, source/build provenance,
   dependency lock·SBOM, verification 명령과 공개 fingerprint를 포함한다.
   browser만으로 signature를 자동 검증할 수 없는 한계는 문서와 onboarding에
   표시하고, 검증이 끝나지 않은 bundle에는 high-risk label을 허용하지 않는다.

### Alternatives

- **현재 combined UI+relay 유지** — 사용은 가장 쉽지만 원격 서버·proxy가
  browser crypto code를 바꿀 수 있어 고위험 trust boundary를 충족하지 못한다.
- **중앙 trusted static hosting + 사용자 relay** — UI 배포는 쉬워지지만 중앙
  code origin을 새로운 trusted party로 추가한다. signed release 검증 없이
  고위험 경로의 단독 근거로 사용하지 않는다.
- **chat용 native desktop/mobile app으로 전환** — app-code integrity에는
  유리하지만 사용자가 browser에서 쓰기를 원한다는 제품 방향과 충돌한다. 현재는
  chat client가 아니라 검증 가능한 local server/runtime만 package화한다.
- **browser extension에 trust anchor를 넣기** — 강한 검증 경계를 만들 수
  있지만 지원 브라우저·배포·권한·유지 비용이 커서 별도 결정으로 남긴다.

### Consequences

- 사용자는 high-risk mode에서 Node/npm과 임의 서버 UI를 신뢰하는 대신 signed
  server/runtime package를 한 번 검증해야 한다.
- 실제 web chat은 계속 browser에서 사용하지만, remote relay는 HTML/JS/WASM을
  제공하지 않는다.
- local UI와 remote API의 origin이 달라져 CORS, local capability bootstrap,
  endpoint configuration, service worker 범위를 다시 구현해야 한다.
- unsigned combined mode는 개발·시연용으로 남지만 security documentation과
  UI에서 production/high-risk 사용을 차단해야 한다.
- signed package, reproducible build, update/rollback verification은 아직
  구현되지 않았으며 이 ADR의 후속 작업이다.

### Evidence

- `apps/server/server.mjs`: 현재 static fallback과 inbox API가 한 request
  handler에 결합되어 있다.
- `apps/web/src/web-runtime.js`: local same-origin info와 peer inbox URL을
  현재 같은 browser runtime에서 처리한다.
- `scripts/build_release.sh`: 현재 release archive가 web bundle과 Node
  server를 함께 묶지만 signature·manifest 검증은 제공하지 않는다.
- `SECURITY.md`: 서버 또는 reverse proxy가 altered JavaScript/WASM을 제공하면
  client secrets가 노출될 수 있음을 명시한다.
- `docs/PLAN.md`: relay/API와 app-code distribution 분리를 P1.2 blocker로
  지정한다.

### Open Questions

- signed server package를 macOS·Windows·Linux에서 어떤 binary/signing channel로
  배포할지 결정한다.
- local UI가 relay endpoint를 안전하게 bootstrap하는 구체적인 config/QR/CLI
  절차를 결정한다.
- reverse proxy가 API-only surface를 보장하도록 어떤 route/header contract를
  강제할지 결정한다.

## ADR-0007 - 고위험 후보는 daemon-owned identity·storage와 user-owned relay로 고정

- 상태: accepted for the future production candidate; not implemented
- 날짜: 2026-08-04
- 근거 유형: explicit product boundary + security requirement register

### Context

현재 web prototype은 브라우저가 profile key, Olm account/session, IndexedDB
records를 소유한다. 이 구조는 개발·시연에는 유효하지만 hostile origin,
extension, stale bundle, local browser compromise를 daemon 경계로 격리하지
못한다. 기존 ADR들도 browser Olm, legacy native Noise, SQLCipher spike,
Node relay를 설명하지만 Account Root Key, Device Key, recovery와 rollback의
production ownership을 한 문서에서 고정하지 않았다.

### Decision

고위험 후보의 소유권과 흐름을 다음처럼 고정한다.

```text
Account Root Key (offline/explicit approval only)
  └─ signs Device Certificate and device revoke records
       └─ Device Key + protocol KeyPackage + session state
            └─ local encrypted daemon store
                 └─ opaque envelope → user-owned relay
```

1. **Identity:** Account Root Key는 계정의 장기 Ed25519 signing identity다.
   각 기기는 독립 Device Key를 만들고 root가 서명한 certificate를 가진다.
   표시 이름, invite code, relay origin, mailbox capability는 identity가 아니다.
   root는 routine message path나 browser API에 노출하지 않으며, 서명되지 않은
   device·revoked device·duplicate device는 session member가 될 수 없다.
2. **1:1 protocol:** daemon candidate는 Rust 기반 vetted MLS implementation을
   우선 후보로 채택한다. 1:1은 두 사용자의 승인된 device leaf로 구성된 MLS
   group으로 모델링하고, group 확장은 별도 slice로 잠근다. 현재 browser
   `vodozemac` Olm v2 path는 compatibility/legacy prototype evidence일 뿐
   daemon protocol의 보안 승인이나 migration source가 아니다. OpenMLS API,
   cipher suite, persistence, license, maintenance, independent composition
   review가 통과하기 전에는 daemon message implementation을 시작하지 않는다.
3. **Rendezvous/relay:** 각 사용자가 운영하는 relay는 code-to-signed-invite
   rendezvous와 bounded opaque envelope delivery만 담당한다. 중앙 directory,
   username search, global account lookup, server-side decryption은 만들지
   않는다. invite code는 hash-only·짧은 TTL·1회 소비 secret이며 identity,
   private key, message key가 아니다.
4. **Local bridge:** browser는 untrusted renderer다. daemon만 root/device key,
   protocol state, encrypted database와 recovery policy를 소유한다. UI는
   one-time bootstrap 이후 least-privilege API만 사용하고 raw key, DB file,
   ratchet/MLS state를 읽지 않는다.
5. **Recovery/rollback:** root backup은 사용자가 별도 passphrase로 암호화해
   수동 보관하는 profile-only artifact다. relay·중앙 서버 복구는 없다.
   session/transcript는 자동 복구하지 않으며, import는 version, monotonic
   revision, identity binding과 current-state conflict를 확인하고 실패 시
   현재 상태를 변경하지 않는다. release trust manifest의 minimum version과
   local monotonic marker가 불일치하면 update/rollback을 거부하지만, 이
   marker가 장악된 OS에서 rollback을 막는다고 주장하지 않는다.
6. **Transport:** direct HTTPS/VPN/LAN은 low-risk delivery only다. P2P,
   WebRTC, automatic port forwarding, Tor/onion, push와 metadata anonymity는
   이 ADR의 구현 범위가 아니며 별도 review 없이는 high-risk mode를 열지 않는다.

### Alternatives

- **Browser-local key ownership** — 현재 prototype에는 간단하지만 hostile
  origin/extension과 local DB 노출을 daemon 경계 밖에서 막지 못해 production
  candidate에서 거부한다.
- **vodozemac Olm as daemon protocol** — 현재 browser path와 연속성이 있지만
  multi-device/group lifecycle과 daemon ownership을 새로 조합해야 하므로
  legacy compatibility path로만 남긴다.
- **Signal/libsignal direct integration** — 1:1 성숙도는 매력적이지만 현재
  제품의 Rust/browser 배포·license·외부 API 유지 책임을 충족한다는 증거가
  없어 기본 결정으로 채택하지 않는다.
- **Central relay or account recovery service** — 가용성은 높이지만 중앙
  trusted server와 contact/metadata authority가 생기므로 제품 경계와 충돌한다.
- **Automatic cloud backup or panic recovery** — 사용자 안전을 보장하지 못하고
  복구 비밀·강요 저항에 대한 오해를 만들므로 제공하지 않는다.

### Consequences

- daemon workspace, bridge contract, identity lifecycle, storage and recovery
  must be implemented before the current browser flow can be called a candidate.
- existing web/Olm/IndexedDB/Node artifacts remain runnable prototype paths but
  cannot satisfy daemon requirements or release evidence.
- users must explicitly approve device changes and keep their own recovery
  material; loss of root material has no server-side reset path.
- independent protocol composition, storage, bridge, relay and release review
  remains a mandatory gate. This ADR does not grant production or high-risk
  approval.

### Evidence and implementation gate

- Threat and requirement mapping: `reference/PUBLIC_THREAT_MODEL.md`,
  `reference/SECURITY_REQUIREMENTS.md`, `reference/SECURITY_REVIEW_EVIDENCE.md`.
- Pairing/code boundary: `reference/PROTOCOL_STATE_MACHINE.md`,
  `apps/server/invite-code.mjs`, `scripts/verify_invite_code.mjs`.
- Current implementation exclusion: `reference/product_boundary.json` and the
  release boundary verifier.
- The ADR is complete as a design decision only when the daemon slices add
  fixed identity/protocol/storage/bridge/recovery evidence; until then the
  corresponding requirements remain `blocked`.
