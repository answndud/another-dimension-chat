# Storage Decision

> **상태: 현재 daemon-owned storage 계약.** browser IndexedDB, Olm pickle,
> SQLCipher spike, Tauri/native 파일 형식은 현재 제품 저장소나 migration
> 경로가 아니다.

## 결정

장기 private state는 Rust daemon이 소유하는 파일 기반 `EncryptedStore`에만
저장한다. 브라우저는 localStorage/IndexedDB/Cache에 계정 키·메시지·ratchet
state를 저장하지 않는다. relay는 ciphertext envelope와 제한된 delivery
metadata만 보관한다.

```text
profile passphrase from stdin
        │ Argon2id + per-store salt
        ▼
database encryption key
        │ AES-256-GCM + record-class associated data
        ▼
atomic encrypted record files + monotonic revision marker
```

## 저장 경계

| 분류 | 소유자 | 규칙 |
| --- | --- | --- |
| Account Root Key / Device Key | daemon | encrypted record only; browser/relay 반환 금지 |
| Device registry/certificates | daemon | public certificate와 revocation state만 API로 요약 |
| OpenMLS/session/replay state | daemon | protocol namespace와 atomic revision 안에서만 저장 |
| Message/attachment local state | daemon | ciphertext/descriptor를 encrypted record로 저장; UI는 결과만 수신 |
| Recovery artifact | 사용자 파일 + daemon import | `ADRECOVERY2`, version/revision/conflict 검증, active state overwrite 금지 |
| Relay queue/blob | user-owned relay | bounded opaque data, TTL, capability scope; plaintext/key 금지 |
| Browser state | 브라우저 | bridge cookie/CSRF와 일시적 표시 상태만; 장기 secret 금지 |

## 실패 규칙

- Argon2id 파라미터, record tag, nonce, authentication tag, revision이 맞지
  않으면 열지 않는다.
- corrupt/old/ambiguous snapshot은 진단용 읽기조차 private state로 승격하지
  않으며, 메시지 송신·session admission을 중단한다.
- atomic write 중 실패하면 기존 유효 revision을 유지한다.
- recovery import는 현재 profile/data를 덮어쓰지 않고 충돌·버전·서명·hash를
  먼저 확인한다.
- key-store/unlock 경계가 사용 불가능하면 plaintext fallback을 하지 않는다.
- wipe는 삭제 시도일 뿐 secure deletion, swap/crash dump 제거, 압수 대응이
  아니다.

## 백업과 복구

현재 복구 artifact는 profile/root recovery를 기본 범위로 한다. relay 운영
데이터, 브라우저 session cookie, live capability, plaintext transcript는
자동 cloud backup에 포함되지 않는다. 복구 후에는 identity/device continuity와
신뢰 상태를 다시 확인하며, 모호한 상태를 자동으로 이어가지 않는다.

백업 파일·명령 출력·로그에는 passphrase, private key, plaintext, invite,
capability, 실제 사용자 데이터가 없어야 한다. 백업 복구가 실패하면 기존
데이터를 보존하고 실패 원인과 다음 조치만 표시한다.

## 현재 증거와 미해결 범위

- daemon storage focused checks와 local release acceptance는 암호화 저장,
  wrong passphrase, corrupt/old recovery, overwrite 방지 경계를 확인한다.
- OS별 Keychain/Secret Service 통합, secure deletion, crash dump/swap 제거,
  실제 private-mode/quota matrix, 압수·강요 저항은 아직 보장하지 않는다.
- storage/protocol composition의 독립 보안 검토가 끝나기 전에는
  `highRiskAllowed=false`를 유지한다.

## 금지 사항

- browser storage를 daemon private-state의 장기 owner로 되돌리지 않는다.
- JSON/SQLite/plaintext 파일에 root/device/session/replay/message state를
  직접 저장하지 않는다.
- 복호화 키를 CLI argv, URL, 로그, relay 요청 body, 브라우저 DOM에 넣지 않는다.
- legacy browser/Tauri/native 형식을 cryptographic migration 없이 import하지 않는다.
