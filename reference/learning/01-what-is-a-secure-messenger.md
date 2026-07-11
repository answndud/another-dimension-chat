# 01. What Is A Secure Messenger?

## 이 글에서 배울 것

이 글은 "보안 메신저"라는 표현이 왜 조심스러운지 설명한다.

초보자는 보통 보안 메신저를 "메시지를 암호화하는 앱"으로 이해한다. 하지만 실제로는 훨씬 넓다.

보안 메신저를 말하려면 최소한 다음 질문을 나눠서 봐야 한다.

- 메시지 내용은 누가 읽을 수 있는가?
- 상대방이 정말 내가 생각한 사람인가?
- 서버는 어떤 metadata를 알 수 있는가?
- message replay나 tampering을 막는가?
- 내 device에 저장된 data는 어떻게 보호되는가?
- backup, push, contact discovery가 어떤 정보를 중앙에 맡기는가?
- 앱 release file이 정말 maintainer가 배포한 것인가?
- 독립적인 review나 audit가 있는가?

Another Dimension Chat은 이 모든 질문을 한 번에 "해결했다"고 말하지 않는다. 현재는 그 질문들을 분리하고, 구현된 부분과 아직 claim하지 않는 부분을 명확히 하는 프로젝트다.

## 초보자용 비유

친구에게 비밀 편지를 보낸다고 생각해보자.

편지지를 암호로 썼다고 해서 모든 문제가 끝나는 것은 아니다.

- 편지를 받은 사람이 정말 친구인지 확인해야 한다.
- 누가 언제 누구에게 편지를 보냈는지 우체국이 알 수 있다.
- 누군가 예전 편지를 복사해서 다시 보낼 수 있다.
- 집 안 서랍에 보관한 편지가 안전한지도 봐야 한다.
- 편지를 배달하는 사람을 신뢰해야 할 수도 있다.
- "이 편지 시스템은 완벽히 안전하다"고 말하려면 외부 검토가 필요하다.

보안 메신저도 비슷하다. message encryption은 중요한 한 조각이지만, 전체 시스템의 전부가 아니다.

## 정확한 기술 개념

### 1. Confidentiality

Confidentiality는 내용을 읽을 수 있는 사람을 제한하는 성질이다.

메시지 본문을 암호화하면 confidentiality에 가까워진다. 하지만 암호화가 있어도 metadata는 남을 수 있다.

### 2. Integrity

Integrity는 데이터가 중간에 바뀌지 않았음을 확인하는 성질이다.

예를 들어 signature나 authentication tag를 통해 payload가 변경되지 않았는지 확인할 수 있다.

### 3. Authentication

Authentication은 "이 상대가 정말 그 상대인가"를 확인하는 성질이다.

메신저에서는 account login만으로 충분하지 않을 수 있다. pairwise public key와 safety verification 같은 절차가 필요하다.

### 4. Forward Secrecy

Forward secrecy는 나중에 어떤 key가 유출되어도 과거 메시지를 모두 읽을 수 없게 하는 성질이다.

이것은 단순 storage encryption과 다르다. session protocol 설계와 key rotation이 필요하다.

### 5. Metadata Protection

Metadata protection은 메시지 내용 외의 정보 노출을 줄이는 것이다.

예를 들어 누가 누구와 연락하는지, 언제 online인지, 메시지 크기가 어떤지, 어떤 network endpoint를 쓰는지 같은 정보가 metadata다.

### 6. Availability

Availability는 필요할 때 시스템을 사용할 수 있는 성질이다.

central server를 줄이면 중앙 장애나 중앙 정책의 영향을 줄일 수 있지만, offline delivery나 sync UX는 어려워진다.

### 7. Auditability

Auditability는 외부 reviewer가 설계와 구현을 검토할 수 있는 상태다.

코드가 있다고 audit가 끝난 것은 아니다. threat model, test, build, release, external review evidence가 필요하다.

## 이 프로젝트에서는 어떻게 쓰는가

Another Dimension Chat은 현재 "secure messenger" claim을 하지 않는다. 대신 아래 boundary를 구현하고 문서화한다.

| 영역 | 현재 방향 |
| --- | --- |
| Identity | phone/email/global account 없이 pairwise identity 방향 |
| Pairing | pairing payload, signature boundary, safety transcript |
| Protocol | message envelope, padding bucket, replay window |
| Storage | passphrase-first local encrypted storage boundary |
| Transport | default manual envelope exchange, advanced onion path는 explicit/fail-closed |
| Desktop | Tauri shell은 explicit action과 redacted status를 담당 |
| Release | unsigned beta, checksum verification, same-release asset authority |
| Public copy | not audited, not production-ready, sensitive-use prohibited 유지 |

## 작은 fake example

아래는 실제 message나 실제 key가 아니라 설명용 가짜 예시다.

| 상황 | 좋아 보이는 점 | 아직 남는 질문 |
| --- | --- | --- |
| `ciphertext=FAKE_CIPHERTEXT_01` | message body는 바로 읽히지 않는다 | 상대 key가 진짜 친구의 key인가? |
| `sender=FAKE_KEY_ALICE` | signature 검증이 가능하다 | 사용자가 safety material을 비교했는가? |
| `server_seen_at=2026-06-13T10:00Z` | message content는 숨겨질 수 있다 | server가 timing/relationship metadata를 아는가? |
| `local_store=encrypted` | device storage 보호가 있다 | wrong passphrase, rollback, deletion, backup은 어떤가? |
| `release_checksum=matches` | 받은 file이 expected artifact와 일치한다 | app protocol audit/production readiness는 별도 질문이다 |

이 표의 핵심은 한 줄짜리 "암호화됨" 표시만으로는 secure messenger claim이 열리지 않는다는 점이다.

## 관련 코드 파일

- [crates/identity/src/lib.rs](../../crates/identity/src/lib.rs)
- [crates/pairing/src/lib.rs](../../crates/pairing/src/lib.rs)
- [crates/protocol/src/lib.rs](../../crates/protocol/src/lib.rs)
- [crates/storage/src/lib.rs](../../crates/storage/src/lib.rs)
- [crates/transport/src/lib.rs](../../crates/transport/src/lib.rs)
- [crates/core/src/lib.rs](../../crates/core/src/lib.rs)
- [apps/desktop-tauri/src-tauri/src/lib.rs](../../apps/desktop-tauri/src-tauri/src/lib.rs)

초보자는 [crates/protocol/src/lib.rs](../../crates/protocol/src/lib.rs)부터 보는 것을 추천한다. envelope와 replay window가 비교적 작은 단위로 보이기 때문이다.

## 흔한 오해

### 오해 1. E2EE가 있으면 secure messenger다

아니다. E2EE는 중요한 부분이지만 identity verification, metadata, local device compromise, backup, release integrity, audit 문제가 남는다.

### 오해 2. Serverless면 privacy가 자동으로 좋아진다

아니다. "서버가 없다"는 표현은 모호하다. 실제로는 어떤 중앙 신뢰가 남아 있는지가 중요하다.

### 오해 3. Tor를 쓰면 익명성과 검열 저항이 보장된다

아니다. Tor/onion path가 있어도 bootstrap, bridge, descriptor, stream lifecycle, endpoint rotation, field evidence가 필요하다.

### 오해 4. Signed app이면 security가 증명된다

아니다. signing/notarization은 배포 integrity와 OS UX에 중요하지만, protocol이나 storage가 안전하다는 audit proof는 아니다.

## 아직 claim하지 않는 것

현재 프로젝트는 다음을 claim하지 않는다.

- secure messenger
- production-ready E2EE
- audited protocol
- sensitive communication allowed
- reliable external onion delivery
- censorship-resistant messaging
- secure deletion from storage media
- protection against endpoint compromise
- protection against malicious contacts
- protection against global traffic correlation

## 직접 확인해볼 파일/명령

```bash
sed -n '1,140p' README.md
sed -n '1,140p' SECURITY.md
rg -n "not audited|not production-ready|secure messenger|sensitive" README.md SECURITY.md SUPPORT.md
```

이 검색에서 강한 표현이 나오더라도 문맥이 "claim하지 않는다"인지 확인해야 한다.

## 요약

보안 메신저는 "암호화된 채팅 앱"보다 훨씬 넓은 개념이다. Another Dimension Chat은 아직 secure messenger라고 말하지 않는다. 대신 보안 메신저가 되기 전에 필요한 identity, pairing, protocol, storage, transport, release, public claim boundary를 하나씩 분리해 검토할 수 있게 만드는 프로젝트다.
