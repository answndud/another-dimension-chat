# 독립 보안 검토 Evidence Index

이 문서는 자동 검증 결과와 독립 보안 검토의 경계를 고정하는 인덱스다.
테스트가 통과해도 reviewer의 판단·서명·감사 보고서를 대신하지 않는다.
`blocked` 항목이 남아 있는 동안 이 프로젝트는 실험용 저위험 제품이며,
기자·활동가·생명안전용 또는 production-ready 보안 제품으로 승인하지 않는다.

## 검토 입력물

검토 시 아래 자료를 동일한 source revision에서 함께 보관한다.

| 입력물 | 위치/생성 방법 | 검토자가 확인할 점 |
| --- | --- | --- |
| 소스와 lockfile | git revision, `Cargo.lock`, `apps/web/package-lock.json` | 실제 검토 대상과 빌드 입력이 고정됐는가 |
| 브라우저 암호 모듈 | `apps/web/src/generated/`, `scripts/verify_web_crypto_binding.mjs` | 생성물 hash·export가 source boundary와 일치하는가 |
| 프로토콜·위협 모델 | `reference/PROTOCOL_STATE_MACHINE.md`, `reference/PUBLIC_THREAT_MODEL.md` | 상태 전이·가정·non-claim이 코드와 일치하는가 |
| 자동 evidence | `./scripts/verify_all.sh --focused` 출력 | 재현 가능한 focused fixture가 실제 실패 경계를 증명하는가 |
| signed release evidence | `./scripts/verify_all.sh --release`, public archive, manifest, SBOM, provenance | 빌드 생략·변조·잘못된 키·rollback이 거부되는가 |
| 요구사항 register | `reference/SECURITY_REQUIREMENTS.md` | `implemented/partial/blocked/non-claim` 판정 근거가 연결되는가 |
| 운영 제한 | `reference/INCIDENT_RESPONSE.md`, `SECURITY.md`, `SUPPORT.md` | 사고 시 비밀값을 노출하지 않고 중지·회전·신고할 수 있는가 |

## 요구사항 evidence 매핑

아래 명령은 저장소 루트에서 실행한다. 경로·로그·fixture에는 초대,
capability, passphrase, plaintext, IP를 넣지 않는다.

| 범위 | source boundary | focused evidence | 산출물/판정 | 현재 제한 |
| --- | --- | --- | --- | --- |
| protocol composition | `apps/web/src/web-runtime.js`, `reference/PROTOCOL_STATE_MACHINE.md` | `npm --prefix apps/web test --workspaces=false` | fixed-seed vector, replay/tamper/identity rejection | 독립 암호 검토 없음 |
| browser integration | `apps/web/src/main.js`, `apps/web/src/web-runtime.js`, `apps/web/public/sw.js` | `npm --prefix apps/web test --workspaces=false`, `node scripts/verify_web_artifact.mjs apps/web/dist` | lock, wipe, storage, SRI, service-worker checks | 실제 OS/browser matrix 없음 |
| storage/backup/wipe | `apps/web/src/web-runtime.js`, `apps/web/src/main.js` | focused browser tests, quota-style storage failure, clipboard-unavailable fallback, local acceptance | passphrase-wrapped backup, quota-style fail-closed lock, clipboard failure with manual encrypted backup recovery, and fail-closed import evidence | secure deletion·actual quota/eviction/private-mode matrix는 non-claim 또는 미검증 |
| relay/capability | `apps/server/server.mjs`, `scripts/verify_relay_logs.mjs` | `node --test apps/server/server.test.mjs`, `node scripts/smoke_user_owned_servers.mjs` | bounds, rotation, restart, redacted log scan | relay 운영자·traffic metadata를 제거하지 않음 |
| release supply chain | `scripts/build_release.sh`, `scripts/verify_public_release_gate.mjs`, `scripts/verify_release_trust_receipt.mjs` | `./scripts/verify_all.sh --release`, `node scripts/acceptance_release_local_only.mjs` | signed archive, manifest, SBOM, provenance, runtime, no legacy surface, no-Node install/update fixture | 최초 trusted-key 전달·clean OS matrix는 운영 절차와 현재 host 범위를 벗어남 |
| transport/anonymity | `apps/server/server.mjs`, `apps/web/src/web-runtime.js`, `scripts/verify_transport_boundary.mjs` | `node scripts/verify_transport_boundary.mjs` | `highRiskAllowed:false`, onion/Tor rejection | anonymity·metadata 보호를 제공하지 않음 |

## Reviewer가 각 finding에 반드시 기록할 것

각 finding은 다음 형식을 사용한다.

1. `ID`, 영향을 받는 source revision/version, severity(`critical/high/medium/low`)
2. 공격자 가정과 공격 전제조건
3. 영향받는 자산과 confidentiality/integrity/availability 영향
4. 최소 재현 절차와 redacted fixture 입력
5. 자동 evidence가 놓친 이유 또는 자동 evidence가 증명하는 범위
6. 안전한 완화·회귀 테스트·배포 중지 여부
7. 잔여 위험, affected version, 수정 버전

## 독립 sign-off

아래 서명은 자동 테스트 출력과 별도로 reviewer가 직접 작성한다.

```text
Reviewer/organization:
Reviewed source revision:
Review date:
Scope covered:
Scope not covered:
Critical/high findings:
Residual risk accepted by:
Decision: reject | experimental-only | low-risk release | other
Signature or report reference:
```

서명란을 비워 둔 상태는 `independent review complete`가 아니다. 자동 테스트가
모두 통과해도 이 서명이 없으면 `AUDIT-01`은 `blocked`다.

Reviewer 결과 JSON은 [`SECURITY_REVIEW_RESULT_TEMPLATE.md`](SECURITY_REVIEW_RESULT_TEMPLATE.md)
형식으로 제출하고, 별도 전달받은 reviewer public key로 다음을 검증한다.

```sh
node scripts/verify_security_review_signoff.mjs \
  /secure/review/independent-review-signoff.json \
  /secure/review/reviewer-public.pem
```

review packet의 source revision과 reviewer 결과를 함께 대조하려면 다음 handoff gate를
사용한다. 세 입력물 중 하나라도 다른 revision이면 거부한다.

```sh
node scripts/verify_security_review_handoff.mjs \
  /secure/review/bundle \
  /secure/review/independent-review-signoff.json \
  /secure/review/reviewer-public.pem
```

이 명령은 source revision, scope, reviewer 서명, 서명 key fingerprint를 검증하지만
reviewer가 실제로 독립된 조직인지 또는 전달 채널이 신뢰되는지는 증명하지 않는다.
그 신원·독립성 확인 기록이 없으면 `AUDIT-01`은 계속 `blocked`다.

## 공개 판정 규칙

- `implemented`는 구현과 focused evidence가 있다는 뜻일 뿐 audit 통과가 아니다.
- `partial`은 범위가 제한된 동작만 공개할 수 있다.
- `blocked`는 해당 보안 수준·high-risk 승인·production-ready 주장을 금지한다.
- `non-claim`은 기능을 제공한다고 표현하거나 우회 안내를 만들지 않는다.
- 독립 검토 보고서가 없는 동안 공개 문구는 “experimental, not audited,
  not for sensitive communication”을 유지한다.
