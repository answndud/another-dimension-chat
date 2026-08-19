# Public Threat Model

> **상태: 현재 daemon-first 제품의 public-safe 위협 모델.** 이 문서는
> 보안 인증서나 독립 audit 결과가 아니다. 현재 `highRiskAllowed=false`이며,
> 아래의 부분 구현·외부 evidence blocker를 이유로 민감한 통신을 승인하지 않는다.

## 제품 경계

```text
human approval
    │
    ▼
Chromium UI (untrusted renderer)
    │ one-time bootstrap + Origin/Host/version/CSRF
    ▼
local Rust daemon (identity/session/encrypted-store owner)
    │ opaque bounded envelopes
    ▼
user-owned relay (untrusted delivery service)
```

전화번호·이메일·글로벌 계정·username 검색·중앙 contact discovery·중앙 메시지
서버·push·클라우드 백업은 v0.1 범위가 아니다. relay는 계정 authority나 복호화
서비스가 아니다. 삭제된 Tauri/native/browser Olm/WASM 경로는 현재 제품 증거가
아니다.

## 위협과 현재 판정

| ID | 위협/자산 | 현재 방어 | 현재 판정 |
| --- | --- | --- | --- |
| `TM-01` | relay 운영자가 plaintext/private key를 읽음 | daemon E2EE, opaque bounded envelope, capability 분리 | 구현 경계 있음; 운영·독립 검토 없음 |
| `TM-02` | hostile origin/stale UI가 local daemon을 호출 | loopback-only, one-time fragment, Origin/Host/UI-version/CSRF | focused evidence 있음; clean Chromium evidence 없음 |
| `TM-03` | release archive/UI/daemon 변조 | manifest, signature/trust/revocation/rollback gate | 운영 signing trust 없음; blocked |
| `TM-04` | invite/device 사칭·replay | root-signed device certificate, signed invite, safety number, single-use | 구현·fixture evidence; 독립 검토 없음 |
| `TM-05` | 로컬 DB·복구 자료 탈취 | Argon2id/AES-GCM encrypted store, recovery conflict checks | secure deletion·압수 대응은 non-claim |
| `TM-06` | relay abuse/queue/blob 고갈 | bounds, TTL, capability, rate/size controls | 운영 relay evidence 없음 |
| `TM-07` | IP·시간·크기·빈도 관계 추론 | metadata를 숨긴다고 주장하지 않음 | anonymity/traffic analysis non-claim |
| `TM-08` | malware, extension, keylogger, screenshot | endpoint를 신뢰 경계 밖으로 명시 | non-claim |

## 자산 소유 규칙

- Account Root Key와 Device Key는 daemon 암호화 저장소에만 있다.
- browser API는 public identity summary, bounded status, ciphertext/result만
  받으며 seed, raw DB, ratchet/session state, private capability를 받지 않는다.
- 표시 이름, 초대 코드, relay origin, safety number, mailbox capability는
  신원 대체물이 아니다.
- 초대 코드 유출은 짧은 rendezvous 범위의 위험을 만들 수 있지만 개인키
  export·profile unlock·device addition·message decryption 권한이 아니다.
- 로그·보고서·evidence에는 passphrase, plaintext, invite/capability, private
  URL, raw log, key material, 실제 사용자 데이터가 없어야 한다.

## 현재 구현 경계

- daemon bridge는 exact loopback origin/host와 UI version을 확인하고, 성공한
  one-time bootstrap만 session cookie와 CSRF를 발급한다.
- state-changing route는 CSRF가 없거나 세션이 만료·재시작되면 실패한다.
- root-signed device certificate는 foreign/duplicate/expired/revoked 상태를
  거부한다.
- pairing은 invite 검증 → safety-number 확인 → contact approval → established
  session 순서이며 safety 확인만으로 전송을 허용하지 않는다.
- relay는 암호문 전달·TTL·bounds를 담당하고 daemon이 replay/identity/session
  상태를 소유한다. relay HTTP 본문·inbox·invite·blob 상태에는 각각 상한이
  있으며 요청 빈도도 제한한다. 한도를 넘거나 손상된 영속 상태로는 시작하지
  않는다.
- release gate는 high-risk flag, missing signature/trust/review/support evidence
  를 통과시키지 않는다.

이 항목들은 focused implementation evidence이며 독립 cryptographic audit,
실제 운영 signing ceremony, clean signed archive, 정확한 Chromium version의
전체 사용자 여정 evidence를 대신하지 않는다.

## 명시적 비보장

다음은 현재 제품이 보호한다고 말하지 않는다.

- anonymity, Tor/onion, censorship resistance, global traffic correlation 방어
- compromised OS/browser, extension, malware, keylogger, screenshot
- coercion resistance, panic wipe, secure deletion from storage media
- IP/시간/크기/빈도/relay destination metadata 은닉
- 완전한 relay availability 또는 중앙 장애 방지
- independent audit, production-ready/high-risk approval
- 다른 OS/browser 조합 또는 정확한 Chromium evidence가 없는 support claim

## 공개 문구 규칙

자동 테스트가 통과해도 위협 모델의 blocker가 해소되는 것은 아니다. 운영
signing/bootstrap receipt, 독립 reviewer signed result, 동일 source revision의
clean signed archive와 Apple Silicon macOS + 정확한 Chromium evidence가 모두
없으면 제품은 experimental/limited candidate로만 설명하고 `highRiskAllowed=false`
를 유지한다.
