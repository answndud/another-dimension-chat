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
발급, 인증, anonymity를 제공하지 않는다.

### Consequences

- endpoint 교환만으로 원격 도달성이 생긴다고 약속하지 않는다.
- VPN과 reverse proxy의 TLS·접근 제어·방화벽 정책은 사용자가 운영한다.
- 각 경로는 capability URL과 envelope 암호화 경계를 유지하지만 metadata와
  네트워크 노출은 경로에 따라 달라진다.

### Evidence

- `apps/server/server.mjs`: loopback default, explicit bind/public URL
- `README.md`, `README.ko.md`: LAN/VPN/HTTPS 선택지와 비자동 보장 명시
- `SECURITY.md`: user-owned inbox와 non-claims
