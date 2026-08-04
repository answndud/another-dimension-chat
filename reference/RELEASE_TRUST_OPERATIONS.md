# 운영 release trust 절차

이 문서는 운영 signing key의 실제 신뢰 경로를 정한다. `reference/release-trust.example.json`은
형식 예시일 뿐이며, placeholder나 archive 안의 공개키만으로는 신뢰를 만들 수 없다.
이 절차를 끝내기 전에는 배포물을 `verified`라고 표시하지 않는다.

## 역할과 원칙

- **bootstrap 보관자**: offline 장치에서 trust manifest를 서명하는 최상위 Ed25519
  private key를 보관한다.
- **release 운영자**: archive를 서명하는 release private key를 사용하지만 bootstrap
  private key에는 접근하지 않는다.
- **검증자**: 별도 보관한 bootstrap public key와 trust manifest로 검증한다. archive
  내부 공개키를 trust root로 채택하지 않는다.
- **수신자**: 두 개의 독립 채널에서 bootstrap fingerprint와 release fingerprint를
  확인한 뒤에만 passphrase를 입력한다.

private key·passphrase·원본 trust manifest·capability·private UI URL은 저장소, archive,
CI 로그, issue, 공개 채널에 넣지 않는다. fingerprint와 version만 redacted 운영 기록에
남긴다.

## 최초 bootstrap

1. bootstrap 보관자는 네트워크가 차단된 장치에서 Ed25519 key pair를 만든다. private key는
   암호화된 offline 저장 매체 두 곳에 분리 보관하고, 저장소에는 복사하지 않는다.
2. bootstrap public key의 SHA-256 SPKI fingerprint와 key ID를 계산한다. 표기 규칙을
   정한 뒤 두 값 모두를 운영 기록에 남긴다.
3. 별도의 release key pair를 만들고, trust manifest에 release public key, `keyId`,
   `validFromVersion`, 선택적 `validUntilVersion`, 최소 release version, revoked key ID를
   넣은 뒤 bootstrap private key로 서명한다.
4. archive 외부의 bootstrap public key와 release public key로 다음을 검증한다.

   ```sh
   node scripts/verify_release_trust.mjs \
     /secure/trust/release-trust.json \
     /secure/trust/bootstrap-public.pem \
     0.1.0 \
     /secure/release/release-public.pem
   ```

   실패하면 archive를 실행·설치하지 않는다. `release-public.pem`은 archive 내부에서
   추출한 값이 아니라 별도 신뢰 채널로 전달받은 값이어야 한다.
5. bootstrap fingerprint와 첫 release fingerprint를 서로 독립된 두 채널로 전달한다.
   같은 계정·같은 메신저·같은 웹사이트에 두 값을 함께 게시하면 독립 채널이 아니다.
6. 수신자는 두 채널의 값이 byte 단위로 일치하는지 대조한다. 불일치·누락·갑작스러운
   변경이면 중지한다. 수령 기록에는 fingerprint·key ID·version 범위만 남긴다.

최초 fingerprint를 독립 채널로 전달하고 수신자가 대조했다는 외부 증거가 없으면 자동
fixture가 통과해도 운영 신뢰 상태는 `blocked`다.

## release 서명과 검증

운영 release는 release private key로만 서명하고, public gate에는 bootstrap public key와
trust manifest를 함께 전달한다.

```sh
AD_RELEASE_PROFILE=public \
AD_RELEASE_SIGNING_KEY=/secure/release/release-private.pem \
AD_RELEASE_PUBLIC_KEY=/secure/release/release-public.pem \
AD_RELEASE_TRUST_MANIFEST=/secure/trust/release-trust.json \
AD_RELEASE_TRUST_MANIFEST_KEY=/secure/trust/bootstrap-public.pem \
AD_NODE_RUNTIME=/secure/runtime/node \
./scripts/build_release.sh
```

수신자는 archive를 실행하기 전에 archive 외부의 trust 자료로 gate를 다시 실행한다.

```sh
node scripts/verify_public_release_gate.mjs ./another-dimension-0.1.0 \
  --public-key /secure/release/release-public.pem \
  --trust-manifest /secure/trust/release-trust.json \
  --trust-manifest-key /secure/trust/bootstrap-public.pem \
  --min-version 0.1.0
```

통과 메시지는 archive 서명·파일 hash·UI artifact·제품 경계와 trust manifest 정책을
확인했다는 뜻이다. 독립 audit, endpoint 안전성, 브라우저 무결성까지 증명하지 않는다.

## rotation

1. 새 release key pair를 offline에서 생성하고 fingerprint를 두 채널로 대조한다.
2. trust manifest에 새 key와 `validFromVersion`을 추가하고 bootstrap key로 서명한다.
3. 새 key로 signed archive·SBOM·provenance를 만들고 public gate와 update fixture를
   검증한다.
4. 새 fingerprint와 전환 version을 두 독립 채널로 공지하고, 수신자는 manifest를 먼저
   갱신한 뒤 archive를 검증한다.
5. overlap 종료 후 기존 key ID를 `revokedKeyIds`에 넣고 minimum version을 올린
   manifest에 다시 서명한다.
6. 폐기된 key로 서명된 archive를 rollback 대상으로 사용하지 않는다.

## relay receipt signing key 운영

릴레이 영수증 키는 release signing key와 별개다. 로컬 개발에서는 relay data directory의
`relay-receipt-signing-key.pem`을 자동 생성할 수 있지만, 운영 relay는 반드시 daemon 시작
전에 별도 보관한 키를 `AD_RELAY_RECEIPT_SIGNING_KEY`로 주입한다. 이 환경변수가 가리키는
파일이 없으면 relay는 시작하지 않는다. 자동 생성된 키의 `/api/v1/info` 값은
`generated-development`로 표시되며 외부 신뢰 자료로 사용하지 않는다.

운영 bootstrap 순서:

1. offline 장치에서 Ed25519 relay receipt key를 만들고 private PEM을 relay 호스트의
   권한 0600 파일에 설치한다. private PEM을 data archive, repository, 로그에 복사하지 않는다.
2. raw public key의 SHA-256을 `relayReceiptKeyId`/fingerprint로 계산해 daemon 운영자에게
   public key와 fingerprint를 서로 독립된 채널로 전달한다.
3. relay를 `AD_RELAY_RECEIPT_SIGNING_KEY=/secure/relay/receipt-key.pem`으로 시작하고,
   `/api/v1/info`의 `relayReceiptKeySource=external-configured`와 key ID를 확인한다.
4. daemon은 relay public key와 동일한 fingerprint를 `--relay-public-key` 및
   `--relay-public-key-fingerprint`로 명시하지 않으면 시작하지 않는다. `/api/v1/info`만
   보고 값을 복사해 넣는 자동화는 신뢰 bootstrap으로 인정하지 않는다.

회전·폐기 순서:

1. 새 키를 offline에서 만들고 새 public key/fingerprint를 두 독립 채널로 전달한다.
2. 모든 daemon을 새 fingerprint로 재구성한 뒤 새 receipt가 수락되는지 확인한다. receipt
   형식의 첫 key ID가 daemon이 bootstrap한 public key fingerprint와 다르면 거부된다.
3. 이전 키 파일과 fingerprint를 폐기 목록에 기록하고, 이전 키로 서명된 영수증·invite
   staging을 복구하지 않는다. 새 키가 확인되기 전에는 이전 키 파일을 삭제하지 말고
   사고 조사용으로 별도 격리한다.
4. 이전 키가 노출됐거나 신뢰할 수 없으면 즉시 relay를 중지하고 새 키로 재기동한다.
   daemon이 새 외부 fingerprint를 받기 전까지는 메시징을 재개하지 않는다.

daemon은 relay trust manifest도 직접 검증한다. 형식은
[`relay-trust.example`](relay-trust.example)의 고정 line format이며, bootstrap public key가
서명한 `bootstrap=`, `key=`, `revoked=`, `payload-end` 구간을 검증한다. daemon 시작 시
다음 두 옵션을 함께 지정한다.

```sh
another-dimension-daemon serve \
  --relay-public-key <raw-public-key-hex> \
  --relay-public-key-fingerprint <sha256-raw-key-hex> \
  --relay-trust-manifest /secure/trust/relay.trust \
  --relay-trust-bootstrap-key <raw-bootstrap-public-key-hex>
```

manifest 서명·bootstrap key·relay public key 중 하나라도 다르거나, receipt key가 allowlist에
없거나 revoked 목록에 있으면 daemon은 시작 또는 초대 staging을 거부한다. `/api/v1/info`는
이 값을 자동으로 신뢰하지 않는다.

manifest는 다음 도구로 생성한다. bootstrap private key와 relay public key는 외부 보안
경로에서 준비하고, 명령행에 private key 내용을 직접 넣지 않는다.

```sh
node scripts/relay_trust.mjs \
  --bootstrap-private-key /secure/trust/bootstrap-private.pem \
  --relay-public-key /secure/relay/receipt-public.pem \
  --output /secure/trust/relay.trust
```

daemon 시작 전 preflight만 실행하려면 `serve` 대신 다음을 사용한다.

```sh
another-dimension-daemon doctor \
  --relay-public-key <raw-public-key-hex> \
  --relay-public-key-fingerprint <sha256-raw-key-hex> \
  --relay-trust-manifest /secure/trust/relay.trust \
  --relay-trust-bootstrap-key <raw-bootstrap-public-key-hex>
```

`doctor status`가 `relay trust: verified`를 출력하지 않으면 daemon을 시작하지 않는다.

## compromise·revocation

1. private key 유출 가능성, bootstrap 장치 침해, 예기치 않은 fingerprint 변경이 있으면
   해당 key archive의 배포·설치·update·rollback을 즉시 중지한다.
2. 영향받은 key ID와 version 범위만 private incident record에 적는다. private key,
   archive, capability, 대화 내용은 기록하지 않는다.
3. 새 key를 offline에서 만들고 revoked 목록과 minimum version을 올린 trust manifest를
   서명한다. bootstrap key 자체가 의심되면 새 bootstrap fingerprint를 재부트스트랩한다.
4. 새 manifest와 release를 두 독립 채널로 전달·대조하고 old-key archive를 복구하지
   않는다. 수학적 서명 검증 성공만으로 재사용하지 않는다.
5. 독립 reviewer가 revocation·minimum-version·rollback 거부 evidence를 확인하기 전에는
   사고를 종료하거나 high-risk/production 상태로 승격하지 않는다.

## 수령 확인 기록 양식

아래 양식은 실제 fingerprint와 archive를 저장하지 않는 운영 기록용이다.

```text
record_type: release-trust-bootstrap-ack-v1
event_id: <무작위 내부 사건 ID>
recorded_at_utc: <UTC 시각>
bootstrap_key_id: <32 hex key ID>
bootstrap_spki_sha256: <정규화한 fingerprint>
release_key_id: <32 hex key ID>
release_spki_sha256: <정규화한 fingerprint>
trust_manifest_minimum_version: <MAJOR.MINOR.PATCH>
release_version_range: <허용 범위>
channel_a: <채널 종류와 외부 식별자만>
channel_b: <서로 독립된 채널 종류와 외부 식별자만>
matched_byte_for_byte: true|false
verifier_command: <비밀 경로를 제거한 명령 이름과 옵션>
verification_result: passed|blocked|revoked|mismatch
operator_initials: <운영 내부 식별자>
reviewer_required: true|false
external_evidence_reference: <외부 전달·대조 증거의 redacted 내부 식별자>
notes: <비밀값 없는 제한사항>
```

`matched_byte_for_byte`가 `false`이거나 결과가 `passed`가 아니면 archive를 실행하지
않는다. 이 기록은 외부 채널이 실제로 독립적이었다는 증거 자체는 아니며, 운영자가
확보한 외부 전달 증거와 함께 보관해야 한다.

형식과 명시된 외부 증거 참조가 있는지 확인하려면 다음 명령을 사용한다. 이 명령은
채널의 실제 독립성이나 외부 기록의 진위를 증명하지 않으므로, 통과해도 운영 trust
상태를 자동으로 `verified`로 승격하지 않는다.

```sh
node scripts/verify_release_trust_receipt.mjs /secure/trust/bootstrap-ack.txt
```
