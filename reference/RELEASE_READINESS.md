# private-trusted 배포 완료 판정

이 문서는 PLAN.md P8의 `private-trusted` 배포 판정 기준을 실제 검증 명령과
연결한다. 판정은 "신뢰하는 사람 사이의 제한적 private use" 판정일 뿐, 고위험
기자용 승인이나 독립 보안 감사의 대체가 아니다.

## 판정 조건과 검증

각 조건의 판정은 `scripts/verify_release_readiness.mjs`가 고정한다. 조건별
근거 명령은 아래와 같다.

| # | 조건 | 근거 검증 |
| --- | --- | --- |
| 1 | `private` release profile 존재 | `build_release.sh`의 `AD_RELEASE_PROFILE=private` 분기, `scripts/acceptance_private_release.mjs` |
| 2 | development archive와 private archive 분리 | `build_release.sh` profile 분기(미서명 development / 서명 private) |
| 3 | 릴리스 서명·manifest·SHA-256 검증 동작 | `verify_private_release_gate.mjs`(fingerprint·hash·trust manifest), `verify_release_manifest.mjs` |
| 4 | 릴리스 공개키 fingerprint를 별도 채널에서 확인 가능 | `RELEASE_TRUST_OPERATIONS.md`의 fingerprint 대조 절차 — 외부 채널 행위는 로컬에서 해결 불가, 절차만 문서화 |
| 5 | bundled Node로 설치·실행 | `install_local_server.sh`의 no-Node contract, `acceptance_private_release.mjs` 설치 단계 |
| 6 | 운영 relay key 없이 production relay 시작 불가 | `acceptance_relay_operations.mjs` production 게이트, `server.mjs` `AD_RELAY_PRODUCTION` |
| 7 | HTTPS와 relay trust 검증 | `verify_transport_boundary.mjs`, `acceptance_daemon_repair.mjs` TLS/pin 경로 |
| 8 | 두 로컬 profile invite·safety number·승인 흐름 | `acceptance_daemon_repair.mjs` pairing/safety/approve |
| 9 | 텍스트·첨부·오프라인 큐·재시작·재동기화 | `acceptance_daemon_repair.mjs`, `acceptance_delivery_consistency.mjs` |
| 10 | device revoke 동작 | `acceptance_daemon_repair.mjs`(revoke 후 차단), `cli.rs` device revoke 테스트 |
| 11 | recovery export/import 동작 | `acceptance_daemon_repair.mjs`(export→import→send), `cli.rs` recovery 테스트 |
| 12 | relay backup/restore 동작 | `acceptance_relay_operations.mjs`(백업→복구→재시작→전달) |
| 13 | update/rollback 동작 | `acceptance_private_release.mjs`(update·실패 update·rollback·uninstall) |
| 14 | 로그·DOM·네트워크에 비밀값·평문 부재 | `verify_web_exposure.mjs`(console/DOM/clipboard/storage), `verify_relay_logs.mjs`(relay redaction) |
| 15 | 설치자·relay 운영자·사고 대응 문서가 명령과 일치 | `verify_docs_claims.mjs`(README 설치 경로·INCIDENT_RESPONSE 섹션·RELAY_OPERATIONS 마커) |
| 16 | 지원 환경 macOS arm64 + Chromium 제한 | `acceptance_os_matrix.mjs --current-host`, `verify_support_matrix.mjs`, `verify_product_boundary.mjs` |
| 17 | high-risk 기능·주장 비활성화 유지 | `verify_daemon_boundary.mjs`(high-risk disabled 마커), `verify_product_boundary.mjs` |

## 판정 절차

```sh
scripts/verify_full.sh                          # 전체 pre-release 검증(대표 flow 포함)
node scripts/acceptance_representative_flow.mjs # 대표 flow + evidence 재생성 + matrix 승격
node scripts/verify_release_readiness.mjs       # 판정 게이트: 위 17개 조건의 근거 고정
```

`verify_release_readiness.mjs`가 모든 조건에서 `passed`를 출력하면 이 문서의
판정 기준을 충족한다. 판정은 위 검증이 실제 실행된 시점·revision에만 유효하며,
실행하지 않은 절차나 외부 증거(독립 채널 fingerprint 확인, 운영 key 보관)를
완료로 표시하지 않는다.

## 비판정 항목

다음은 이 판정의 범위가 아니다(PLAN.md 섹션 4).

- 실제 운영 relay signing private key의 안전 보관 행위
- 릴리스 공개키 fingerprint를 수신자가 독립 채널로 확인하는 행위
- Developer ID 인증서·notarization 계정 사용
- 독립 보안 검토자의 실제 검토와 서명
- 실제 외부 사용자의 조직·기기·네트워크 환경 검증
- 감시 환경에서의 익명성·검열 저항 검증

이 항목들은 `private-trusted` 판정에 필요하지 않으며, public/high-risk 판정
(P9)에서 별도로 요구된다.
