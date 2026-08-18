# 공개 배포·고위험 전환 요구사항

이 문서는 PLAN.md P9의 전환 요구사항을 실행 가능한 항목으로 정리한다.
`private-trusted` 배포(P8)를 완료해도 아래 항목 없이는 `public` 릴리스나
`high-risk-disabled` 모드로 전환하지 않는다. 이 문서의 항목은 대부분 외부
증거(실제 검토·운영 키·실제 배포)를 요구하므로, 로컬 테스트 결과로
완료로 표시하지 않는다.

요구사항 register(`reference/SECURITY_REQUIREMENTS.md`)에서 `blocked`인
`CRYPTO-04`, `RELEASE-01`, `RELEASE-03`, `AUDIT-01`이 이 전환의 핵심
게이트다. `blocked`가 남아 있는 동안 high-risk 주장은 불가능하다.

## P9.1 외부 검토

독립 보안 검토자는 다음 범위를 검토하고 서명된 sign-off를 남긴다. 게이트는
`verify_security_review_bundle.mjs`·`verify_security_review_handoff.mjs`·
`verify_security_review_signoff.mjs`가 이미 구현했으며, 실제 외부 보고서·
검토자 신원·서명이 없으면 `AUDIT-01`은 `blocked`를 유지한다.

| 요구사항 | 필요 산출물 | 완료 조건 |
| --- | --- | --- |
| 독립 검토자와 범위 확정 | 검토 계약·범위 문서 | 검토자 신원 기록과 범위 확정 기록 |
| 깨끗한 소스 revision 제공 | 검토용 소스 bundle(`verify_security_review_bundle.mjs`가 형식 고정) | source inventory와 hash 검증 통과 |
| daemon·web·relay·release·recovery 전체 검토 | 검토 보고서 | `scopeCovered`에 6개 영역 포함 |
| 암호 구성과 key lifecycle 검토 | 암호 구성 검토 절 | `CRYPTO-04` 전환에 필요한 composition review 포함 |
| 리뷰어 신원과 서명 결과 기록 | Ed25519 서명된 sign-off | `verify_security_review_signoff.mjs` 검증 통과 |
| 발견 사항 수정 후 재검토 | 수정 목록·재검토 sign-off | sourceRevision이 수정 후 revision과 일치 |

## P9.2 공개 릴리스 신뢰

| 요구사항 | 필요 산출물 | 완료 조건 |
| --- | --- | --- |
| Developer ID 서명·macOS notarization 검토 | notarization 증명 | 외부 신뢰 경로 확보(로컬 불가) |
| 공개 release signing key 운영 | `RELEASE_TRUST_OPERATIONS.md` 절차 + 운영 키 | `verify_release_trust.mjs --fixture`·`verify_release_trust_receipt.mjs --fixture` 통과 + 실제 키 bootstrap |
| 키 rotation·revocation | revoked key list·trust manifest | `RELEASE-02` 완료(현재 `partial`) |
| 공개 SBOM·provenance | `SBOM.cyclonedx.json`·`RELEASE-PROVENANCE.json` | `build_release.sh` 산출물 검증 통과 |
| 깨끗한 builder에서 재현성 검증 | clean build 기록 | `verify_all.sh --release` 통과(`RELEASE-03`) |
| 취약점 공개·보안 업데이트 정책 | 공개 정책 문서 | `SECURITY.md` 신고 절차와 일치 |
| 광범위한 지원 환경 매트릭스 | `SUPPORT_MATRIX.json` 확장 | 실제 외부 기기·사용자 증거 |

## P9.3 고위험 통신 모델

현재 direct HTTPS relay는 다음을 보호하지 않는다(비주장 유지).

- IP 은닉
- 접속 시각 은닉
- 메시지 크기·빈도 은닉
- 검열 우회
- 네트워크 감시자의 traffic analysis
- 감염된 endpoint

`high-risk-disabled` 모드를 주장하려면 별도의 설계와 독립 검토가 필요하다.

| 요구사항 | 필요 산출물 | 상태 |
| --- | --- | --- |
| metadata 최소화·padding·timing 정책 | 설계 문서 + 구현 + 검토 | 미계획 |
| 익명 transport 설계 | 설계 문서 | 미계획 |
| Tor 또는 별도 프록시 모델 안전성 검토 | 검토 보고서 | 미계획 |
| key transparency 또는 동등한 directory 검증 | 설계·구현·검토 | 미계획 |
| 침해 후 복구·장치 탈취 모델 | 설계 문서 | 미계획 |
| 악성 업데이트·공급망 공격 모델 | 설계 문서 | 미계획 |

## 전환 게이트

public/high-risk 전환 판정 전에 다음을 모두 실행한다.

```sh
scripts/verify_all.sh --release   # release/compliance 전용 게이트(부정 테스트 포함)
node scripts/verify_security_requirements.mjs  # blocked 항목이 0인지 확인
node scripts/verify_release_readiness.mjs      # private-trusted 판정 게이트(전환 후에도 유지)
```

`verify_all.sh --release`가 통과하고 `verify_security_requirements.mjs`에서
`CRYPTO-04`, `RELEASE-01`, `RELEASE-03`, `AUDIT-01`이 모두 `implemented`로
바뀌어야 high-risk 주장을 고려할 수 있다. 그 전에는 이 문서의 항목을
"준비된 양식"으로만 간주하고 완료로 표시하지 않는다.
