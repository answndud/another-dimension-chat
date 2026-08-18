# Relay 운영 절차

이 문서는 v0.1 `private-trusted` 배포에서 relay를 운영하는 단일 공식 흐름을 정한다.
transport 경계와 metadata 노출의 상세는
[`TRANSPORT_DECISION.md`](TRANSPORT_DECISION.md), 릴리스·relay receipt signing key의
신뢰 경로는 [`RELEASE_TRUST_OPERATIONS.md`](RELEASE_TRUST_OPERATIONS.md), 사고 대응
순서는 [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md)를 따른다.

## P2.1 단일 topology 결정

v0.1은 **신뢰하는 소규모 그룹이 함께 운영하는 사설 HTTPS relay 하나**만 공식
topology로 지원한다.

- 그룹 구성원 모두가 같은 relay origin과 inbox URL을 사용한다.
- relay는 암호문 envelope와 암호화 blob만 전달하며, 실제 계정·개인키·평문·복호화된
  파일을 저장하지 않는다.
- 각자 relay를 따로 운영하는 방식은 daemon이 어떤 inbox URL이든 수용하므로 기술적으로
  가능하지만, v0.1 문서·UI·acceptance의 기본 흐름은 공유 사설 relay다. 두 방식을
  섞어 안내하지 않는다.
- 초대코드는 relay origin을 담고, 소비자는 그 origin과 pin으로만 relay에 접속한다.
  초대코드의 relay 정보와 daemon의 `--relay-origin`·`--relay-tls-pin` 설정이 다르면
  소비가 거부된다.
- 중앙 서비스, 검색 가능한 공개 relay directory, 푸시 서비스, 클라우드 백업은 v0.1
  범위가 아니다.

### 운영자가 보는 정보

공유 relay 운영자는 다음 metadata를 볼 수 있다. 이는 한계이지 프라이버시 보장이
아니다.

- 접속 IP와 접속 시각
- 요청 빈도와 시각 패턴
- envelope·blob의 크기
- inbox URL(capability) 사용 여부와 TTL 만료 시점

운영자는 평문, 파일명, 대화 내용, 사용자 이름, 계정 식별자를 보지 못한다. relay 로그는
capability·invite·envelope·token·peer 식별자를 기록하지 않으며
`scripts/verify_relay_logs.mjs`가 이를 고정한다.

### relay 중단 시 동작

- relay가 중단되면 daemon의 전송은 `relay_unavailable`/`retryable`로 실패하고,
  delivery ledger가 큐에 보관한다. 메시지는 사라지지 않고 relay 복구 후
  자동 retry·sync로 전달된다.
- relay 복구 후에는 TTL·queue·capability 상태가 재시작 전과 일관되게 복원된다.
  만료된 envelope은 purge되고, capability가 회전됐으면 이전 capability 경로는 410을
  반환한다.
- relay를 새 data directory로 교체하면 기존 큐는 복사되지 않는다. 유출 가능성이
  있으므로 기존 큐를 새 서버로 옮기지 않는다(`INCIDENT_RESPONSE.md` capability 유출).

## P2.2 운영 relay trust와 HTTPS

### production 모드 게이트

운영 relay는 반드시 `AD_RELAY_RECEIPT_SIGNING_KEY`로 별도 보관한 receipt signing key를
주입한다. `AD_RELAY_PRODUCTION=1`로 시작하면:

- receipt signing key가 설정되지 않은 상태(자동 생성된 `generated-development` 키)에서는
  **시작하지 않는다**.
- 설정 파일(`server-config.json`의 `production: true`)로도 같은 게이트가 적용된다.
- 개발 실행은 `AD_RELAY_PRODUCTION` 없이 자동 생성 키를 쓸 수 있지만, 시작 로그에
  `generated-development` 경고를 출력하고 `/api/v1/info`의 `relayReceiptKeySource`가
  `generated-development`로 표시된다. 이 값을 외부 신뢰 자료로 사용하지 않는다.

### 운영 시작 절차

1. offline 장치에서 relay receipt key pair를 만들고, private PEM을 relay 호스트의
   0600 파일로 설치한다(`RELEASE_TRUST_OPERATIONS.md` relay receipt signing key 운영).
2. relay data directory는 0700, capability·key·SQLite 파일은 0600으로 강제된다.
   서버가 시작 시 권한을 다시 확인·재적용한다.
3. HTTPS를 구성한다. 두 방식 모두 `AD_PUBLIC_URL`은 HTTPS origin이어야 하고,
   `.onion` 주소와 credential이 포함된 URL은 거부된다.
   - **reverse-proxy 방식**: relay는 `127.0.0.1`에 바인딩하고, reverse proxy가
     `AD_PUBLIC_URL`로 TLS를 종료한다. `trustProxy: true`와 `AD_PUBLIC_URL`을 함께
     설정해야 한다.
   - **direct-tls 방식**: relay가 직접 TLS를 종료한다. `tlsKeyFile`/`tlsCertFile`과
     `AD_PUBLIC_URL`(https)을 함께 설정해야 하고, 인증서는 시작 시 유효 기간을
     검증한다.
4. relay를 시작하고 `/api/v1/info`에서 `relayReceiptKeySource=external-configured`와
   key fingerprint를 확인한다. daemon은 이 값만 보고 신뢰하지 않으며, 운영자가
   별도 채널로 전달받은 `--relay-public-key`·`--relay-public-key-fingerprint`를
   명시해야 한다.
5. daemon의 `doctor status`가 `relay trust: verified`를 출력해야 메시징을 시작한다.

### reverse proxy·DNS·방화벽·포트·TLS 갱신

- **reverse proxy**: Nginx/Caddy 등이 `AD_PUBLIC_URL`로 TLS를 종료하고 relay
  `127.0.0.1:PORT`로 프록시한다. relay는 proxy의 X-Forwarded 헤더를 신뢰하지
  않는다(rate-limit 키는 항상 실제 소켓 주소를 사용).
- **DNS**: `AD_PUBLIC_URL`의 호스트 이름은 relay 호스트의 공개 IP를 가리켜야 한다.
- **방화벽**: 외부에서 443(또는 선택한 HTTPS 포트)만 열고, relay 내부 포트는
  loopback으로 제한한다.
- **포트**: relay 내부 포트는 기본 1422이며 `AD_PORT`로 바꿀 수 있다. reverse proxy는
  그 포트를 upstream으로 지정한다.
- **TLS 갱신**: Let's Encrypt 등으로 인증서를 갱신한 뒤 relay를 재시작한다. 갱신
  전후 인증서 pin이 바뀌면(새 인증서) daemon은 pin 불일치로 전송을 거부한다.
  새 pin을 별도 채널로 전달하고 daemon에 `--relay-tls-pin`과 `--relay-tls-retrust`를
  함께 지정해 명시적으로 재신뢰해야 한다. pin 변경을 확인하지 않고 수락하지 않는다.

### relay URL·pin 변경 승인

- daemon은 저장된 pin과 다른 pin을 `--relay-tls-retrust` 없이 받으면
  `relay_retrust_required`로 거부한다.
- UI의 relay trust 저장 화면은 변경된 pin을 확인하는 체크박스를 요구한다.
- relay origin 변경은 초대 소비 시 `relay_origin` 검증으로 거부된다.

## P2.3 relay 데이터와 남용 방어

- 경계 값(envelope 96KiB, inbox 256개, blob 32MiB, blob TTL 7일, posts 30/분)은
  `reference/product_boundary.json`·`TRANSPORT_DECISION.md`에 선언되고
  `scripts/verify_transport_boundary.mjs`가 `apps/server/server.mjs` 상수와 대조한다.
- 오류 구분: 잘못된 envelope(`invalid_envelope`), queue full(`queue_full` 429),
  만료·회전된 capability(410), rate limit(429), 중복 envelope(202 재수락)이
  `apps/server/errors.mjs`와 `server.test.mjs`에 고정되어 있다.
- 디스크 부족 시 relay는 큐 write를 원자적으로 실패시키고 409/503으로 응답하며,
  내부 재시도 루프를 돌지 않는다. daemon은 bounded retry(틱당
  `automaticRetriesPerTick`)만 수행한다.
- rate-limit Map은 `MAX_RATE_LIMIT_BUCKETS`(4096)을 넘지 않도록 eviction한다.
- relay 로그는 capability·invite·envelope·token·peer를 기록하지 않는다
  (`scripts/verify_relay_logs.mjs`).
- 상태 확인: `/api/v1/health`, `/api/v1/info`(local access 필요)로 큐·blob 저장
  크기·레코드 수·TTL·capability 만료·receipt key source를 확인한다.

## P2.4 백업·복구·키 회전

### 백업

```sh
node scripts/relay_backup.mjs backup --data-dir DIR --file /secure/backup.adrelaybackup
```

- 백업은 scrypt + AES-256-GCM으로 암호화되고 passphrase는 stdin으로만 받는다.
- SQLite queue, capability, local-access token, local UI URL, receipt signing key,
  blob 메타데이터·암호문이 포함된다. 백업 파일에 평문 envelope나 capability가
  노출되지 않는다.
- 백업 주기는 운영 정책으로 정한다. 백업 파일은 relay 호스트가 아닌 offline 매체에
  보관한다.

### 복구

```sh
node scripts/relay_backup.mjs restore --data-dir DIR --file /secure/backup.adrelaybackup
```

- restore는 **비어 있는** data directory에만 성공한다. 기존 state가 있으면
  fail-closed로 거부해 원본을 덮어쓰지 않는다.
- archive의 mode bit를 신뢰하지 않고 모든 복원 파일을 0600, 디렉터리를 0700으로
  강제한다.
- 복원 전에 SQLite integrity check를 수행하고, 실패하면 stage를 삭제하고 원본을
  건드리지 않는다.
- 원본이 있는 비어있지 않은 경우에는 원본을 `.before-restore-*`로 옮긴 뒤 stage를
  활성화하고, rename 실패 시 원본을 되돌린다.
- 손상된 백업·잘못된 passphrase·변조된 manifest는 복원되지 않는다.

정상 흐름: `backup → relay 중지 → restore(새 빈 dir) → relay 재시작 → 큐·TTL·
capability 상태 일관 → 메시지 전달`.

### capability 회전

- local access가 있는 호출로 `POST /api/v1/inbox/rotate`를 보내면 inbox capability가
  새 값으로 교체되고 이전 경로는 410을 반환한다.
- 유출이 의심되면 relay를 중지하고 새 data directory로 시작한다(기존 큐 복사 금지).
- 회전 후 모든 daemon은 새 inbox URL로 재구성돼야 한다. 이전 capability 경로로의
  sync는 410 → daemon `relay_capability_expired`로 실패한다.

### relay receipt signing key 회전·폐기

키 교체·폐기·유출 대응 순서는 `RELEASE_TRUST_OPERATIONS.md`의 relay receipt signing
key 운영 섹션을 따른다. 요약:

1. 새 키를 offline에서 만들고 public key/fingerprint를 두 독립 채널로 전달한다.
2. 모든 daemon을 새 fingerprint로 재구성한 뒤 새 receipt가 수락되는지 확인한다.
3. 이전 키 파일은 삭제하지 말고 사고 조사용으로 격리하고, 이전 키로 서명된
   영수증·staging을 복구하지 않는다.
4. 이전 키가 노출됐으면 relay를 중지하고 새 키로 재기동하며, daemon이 새 외부
   fingerprint를 받기 전까지 메시징을 재개하지 않는다.

키 생성은 저장소나 shell history에 private key를 남기지 않는 전용 명령을 사용한다.
기존 파일은 덮어쓰지 않으므로 회전 시 새 offline 디렉터리를 지정한다.

```sh
node scripts/relay_receipt_keygen.mjs --output-dir /secure/relay-key-2026-08
```

출력된 public key와 fingerprint만 두 독립 채널로 전달하고, 수신 대조가 끝난 뒤
relay를 새 private key로 재시작한다. 이전 private key는 즉시 삭제하지 말고 접근을
차단한 offline 사고 조사 매체에 격리한다.

## 검증 명령

```sh
node --test apps/server/server.test.mjs          # 게이트·오류 구분·재시작·회전·TTL
node scripts/smoke_user_owned_servers.mjs        # relay 재시작·capability smoke
node scripts/verify_transport_boundary.mjs       # 경계 값 대조
node scripts/verify_relay_logs.mjs               # 로그 redaction
node scripts/acceptance_relay_operations.mjs     # production 게이트·백업·복구 E2E
```

relay 운영 절차의 최종 판정은 이 자동 검증만으로 내리지 않는다. 실제 운영 key
보관·독립 채널 fingerprint 전달·인증서 갱신은 로컬에서 해결할 수 없는 항목이며,
실행하지 않은 절차를 완료로 표시하지 않는다.
