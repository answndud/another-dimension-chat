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
- `apps/web/src/web-runtime.js`: 현재 브라우저 로컬 암호화와 수동 envelope 경계를
  구현하지만 transport endpoint는 아직 없다.
- 사용자 요청: 각 사용자가 본인의 기기에서 서버를 켜고 상대가 접속하는 방식을 선택했다.

### Open Questions

- 원격 접속의 기본 경로를 LAN, Tailscale/WireGuard 같은 VPN, 사용자가 관리하는
  HTTPS reverse proxy 중 무엇으로 안내할지 결정해야 한다.
- 서버 binary를 Node prototype으로 시작할지 Rust/desktop binary에 통합할지 결정해야 한다.
