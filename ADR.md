# ADR.md

## ADR-0001 - 사용자별 로컬 서버를 메시지 전달 경계로 사용

- 상태: accepted
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

각 사용자의 로컬 서버가 정적 웹 UI와 사용자 소유 opaque-envelope inbox를
제공한다. 서버는 중앙 discovery나 신뢰된 메시지 저장소가 아니며, 평문·private
key·passphrase를 받지 않는다. 메시지 본문은 브라우저에서 암호화된 envelope로
서버에 도착한다.

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

- 상태: accepted
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
