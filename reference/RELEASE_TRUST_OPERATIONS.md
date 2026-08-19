# Release trust 운영 절차

이 문서는 Rust release manifest와 외부 운영 trust를 연결하는 절차의 경계를
기록한다. 저장소의 검증 도구는 서명·파일 hash·trust manifest의 형식을 검증할 수
있지만, 운영자가 실제로 어떤 키를 보관하는지나 두 채널이 독립적인지는 증명하지
못한다. 따라서 아래의 rehearsal 결과를 production trust 증거로 사용하지 않는다.

## 역할 분리

- bootstrap 보관자: trust manifest 서명키를 오프라인으로 보관한다.
- release 운영자: release signing key로 archive를 만든다.
- 검증자: 별도 채널로 받은 fingerprint와 archive를 검증한다.
- relay 운영자: relay receipt key와 relay data를 관리하며 release key를 보관하지
  않는다.

bootstrap private key와 release private key를 같은 장치·계정·온라인 저장소·백업에
두지 않는다. private key를 저장소, 이슈, 메신저, 일반 클라우드에 넣지 않는다.

## 신규 키와 trust manifest

운영자는 승인된 오프라인 Ed25519 도구로 bootstrap key와 release key를 생성한다.
이 저장소는 키 생성 ceremony를 대신하지 않는다. 생성 후에는 다음 값을 별도 신뢰
채널 두 곳에서 byte 단위로 대조한다.

- bootstrap public key fingerprint
- release public key fingerprint와 key ID
- 허용된 최소 release version
- key 유효 시작·종료 버전

trust manifest의 형식 예시는 [`release-trust.example.json`](release-trust.example.json)
을 사용한다. 저장소의 Rust 도구로 형식과 서명을 만들 수 있지만, 실제 manifest는
오프라인 bootstrap key ceremony를 거쳐야 하며 예시 파일의 placeholder를 운영
trust로 사용하지 않는다.

```sh
another-dimension-tools release-trust create \
  --bootstrap-private-key /secure/trust/bootstrap-private.pem \
  --release-public-key /secure/release/release-public.pem \
  --minimum-release-version 0.1.0 \
  --output /secure/trust/release-trust.json
```

이 명령은 기존 파일을 덮어쓰지 않고, release public key의 key ID를 자동으로
계산하며, bootstrap private key로 manifest를 서명한다. bootstrap private key를
생성하거나 운영 보관하는 작업 자체는 이 명령이 대신하지 않는다.

기존 manifest에서 release key를 폐기할 때는 먼저 현재 manifest의 bootstrap 서명을
검증한 뒤 새 파일로 재서명한다. 원본을 덮어쓰지 않으므로 검증자가 비교할 수 있는
기존 자료를 보존한다.

먼저 새 release key를 추가해 교체 후보를 만든다.

```sh
another-dimension-tools release-trust add-key \
  --input /secure/trust/release-trust.json \
  --output /secure/trust/release-trust-with-next-key.json \
  --bootstrap-private-key /secure/trust/bootstrap-private.pem \
  --release-public-key /secure/release/next-release-public.pem \
  --valid-from-version 0.2.0
```

새 archive의 서명과 설치 gate를 별도 검증한 뒤에만 이전 key를 폐기한다.

```sh
another-dimension-tools release-trust revoke \
  --input /secure/trust/release-trust.json \
  --output /secure/trust/release-trust-revoked.json \
  --bootstrap-private-key /secure/trust/bootstrap-private.pem \
  --key-id 0123456789abcdef0123456789abcdef
```

알 수 없는 key ID, 이미 폐기된 key, bootstrap 서명이 맞지 않는 manifest는
거부된다. 명령은 교체 파일을 만들 뿐이며, 새 key의 실제 보관·승인·두 채널
대조는 운영자가 별도로 수행해야 한다.

## Rust release 검증 흐름

release 운영자는 Rust 도구로 archive의 파일 목록과 서명을 만든다.

macOS `.app` 서명은 release manifest와 별개의 Apple trust 단계다. 운영 signing
identity를 명시적으로 제공할 때만 builder가 서명한다.

```sh
AD_MACOS_SIGNING_IDENTITY="Developer ID Application: Example (TEAMID)" \
AD_REQUIRE_MACOS_SIGNING=1 \
AD_RELEASE_SIGNING_KEY=/secure/release/release-private.pem \
scripts/build_release.sh
```

identity를 제공하지 않은 build는 의도적으로 unsigned rehearsal로만 취급한다.
`AD_REQUIRE_MACOS_SIGNING=1`이면 identity가 없거나 `codesign --verify`가 실패할
때 build가 중단된다.

notarization까지 필수로 묶을 때는 다음을 추가한다. 사전에 Apple notarization과
ticket stapling을 운영자가 완료해야 하며, builder가 제출이나 자격 증명 처리를
대신하지 않는다.

```sh
AD_REQUIRE_MACOS_NOTARIZED=1 \
AD_MACOS_SIGNING_IDENTITY="Developer ID Application: Example (TEAMID)" \
scripts/build_release.sh
```

이 옵션은 `spctl --assess --type execute`가 실패하면 archive 생성을 중지한다.

```sh
scripts/build_client_release.sh
scripts/private_release.sh verify RELEASE.tar.gz \
  --public-key /secure/release/release-public.pem
```

통합 macOS release는 `scripts/build_release.sh`가 bundle verifier를 자동으로
실행한다. signing identity가 있으면 서명 검증까지 포함하고, identity가 없으면
unsigned rehearsal로만 결과를 표시한다.

trust manifest까지 확인하는 client 설치 gate는 archive에 포함된 Rust daemon이
수행한다.

```sh
scripts/install_client.sh \
  --archive /secure/release/another-dimension-client-0.1.0 \
  --destination /secure/install/another-dimension-client-0.1.0 \
  --public-key /secure/release/release-public.pem \
  --trust-manifest /secure/trust/release-trust.json \
  --trust-manifest-key /secure/trust/bootstrap-public.pem
```

이 gate는 release 서명, 파일 hash, release key의 trust·유효기간·폐기 목록,
provenance 형식을 확인한다. 성공해도 독립 보안 검토, 키 보관, 두 채널 대조를
대신하지 않는다.

## 교체·폐기 rehearsal

production key를 사용하지 않고 격리된 임시 디렉터리에서 다음 순서를 연습한다.

1. 새 release key와 새 trust manifest를 준비한다.
2. 새 key ID를 trust manifest에 추가하고 최소 version과 유효 버전을 설정한다.
3. 새 archive를 빌드하고 Rust release manifest 검증을 수행한다.
4. 이전 key ID를 `revokedKeyIds`에 추가한 manifest를 서명한다.
5. 이전 key로 서명한 archive는 설치 gate에서 거부되는지 확인한다.
6. 새 key로 서명한 archive만 허용되는지 확인한다.
7. 새 bootstrap public key를 받지 못한 검증자는 업데이트를 중지하고 기존
   설치본을 유지한다.

rehearsal은 실제 운영 key custody나 사고 복구를 완료했다는 증거가 아니다. 실제
교체일에는 기존 key의 접근을 폐기하고, 두 채널 대조 receipt·검증자·승인자·source
revision·archive SHA-256을 redacted 운영 기록으로 남긴다.

## 실패 시 중단

- fingerprint, key ID, version, manifest signature가 하나라도 다르면 설치하지 않는다.
- release key가 폐기됐거나 유효기간 밖이면 자동 rollback하지 않는다.
- trust manifest를 받을 독립 채널이 없으면 배포하지 않는다.
- private key나 capability가 노출되면 해당 release와 relay를 계속 사용하지 말고
  `reference/INCIDENT_RESPONSE.md`의 사고 절차로 전환한다.

현재 저장소에는 실제 운영 key, 두 채널 대조 receipt, 독립 reviewer 서명이 없으므로
`high-risk-disabled`와 verified distribution 차단 상태를 유지한다.
