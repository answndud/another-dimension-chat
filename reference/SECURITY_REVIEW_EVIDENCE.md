# 독립 보안 검토 Evidence Index

> **상태: 현재 daemon-first 검토 evidence index.** 아래의 legacy/browser
> prototype 언급은 역사적 범위를 명시하기 위한 것이며 현재 release evidence가
> 아니다. 현재 검토 패킷은 `scripts/prepare_security_review.mjs`로 clean Git
> revision에서 생성하고, source/review 해시는
> `verify_security_review_bundle.mjs`와 public handoff gate에서 검증합니다.
> 이 자동화는 실제 독립 검토자의 판단·서명·신원 확인을 대신하지 않습니다.

이 문서는 자동 검증 결과와 독립 보안 검토의 경계를 고정하는 인덱스다.
테스트가 통과해도 reviewer의 판단·서명·감사 보고서를 대신하지 않는다.
`blocked` 항목이 남아 있는 동안 이 프로젝트는 실험용 저위험 제품이며,
기자·활동가·생명안전용 또는 production-ready 보안 제품으로 승인하지 않는다.

## 검토 입력물

검토 시 아래 자료를 동일한 source revision에서 함께 보관한다.

| 입력물 | 위치/생성 방법 | 검토자가 확인할 점 |
| --- | --- | --- |
| 소스와 lockfile | git revision, `Cargo.lock`, `apps/web/package-lock.json` | 실제 검토 대상과 빌드 입력이 고정됐는가 |
| daemon·bridge·web 경계 | `apps/daemon/src/bridge.rs`, `apps/daemon/src/bridge_http.rs`, `apps/web/src/daemon-bridge.js` | loopback bootstrap, Origin/Host/version/CSRF, least-privilege API가 일치하는가 |
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
| protocol composition | `apps/daemon/src/mls_session.rs`, `apps/daemon/src/protocol_gate.rs`, `reference/PROTOCOL_STATE_MACHINE.md` | `CARGO_BUILD_JOBS=2 cargo check -p another-dimension-daemon --locked`, daemon focused acceptance | daemon-owned session/persistence/replay boundary and protocol admission gate | selected composition의 독립 암호 검토 없음 |
| browser integration | `apps/web/src/main.js`, `apps/web/src/daemon-bridge.js`, `apps/web/src/daemon-view.js` | `npm --prefix apps/web test --workspaces=false`, `node scripts/verify_web_artifact.mjs apps/web/dist`, `node scripts/verify_daemon_ui_artifact.mjs --daemon-ui-artifact`, `node scripts/verify_web_exposure.mjs` | daemon 인증 경계, 브라우저 비밀 저장 금지, console/DOM/title/clipboard 노출 스캔, 정적 자산 검증, 영속 service worker 부재 | macOS Chromium 이외 실제 OS/browser matrix 없음 |
| storage/backup/wipe | `apps/daemon/src/storage.rs`, `apps/daemon/src/cli.rs`, `apps/daemon/src/authority_routes.rs` | daemon focused storage/recovery fixtures, local release acceptance | encrypted daemon store, recovery conflict checks, lock/wipe boundary, redacted failure codes | secure deletion·seizure/coercion 방어·OS matrix는 non-claim 또는 미검증 |
| relay/capability | `apps/server/server.mjs`, `scripts/verify_relay_logs.mjs` | `node --test apps/server/server.test.mjs`, `node scripts/smoke_user_owned_servers.mjs` | bounds, rotation, restart, redacted log scan | relay 운영자·traffic metadata를 제거하지 않음 |
| release supply chain | `scripts/build_release.sh`, `scripts/verify_public_release_gate.mjs`, `scripts/verify_release_trust_receipt.mjs` | `./scripts/verify_all.sh --release`, `node scripts/acceptance_release_local_only.mjs` | signed archive, manifest, SBOM, provenance, runtime, no legacy surface, no-Node install/update fixture | 최초 trusted-key 전달·clean OS matrix는 운영 절차와 현재 host 범위를 벗어남 |
| transport/anonymity | `apps/daemon/src/relay_http.rs`, `apps/server/server.mjs`, `reference/product_boundary.json` | `node scripts/verify_transport_boundary.mjs` | `highRiskAllowed:false`, unsafe transport rejection, visible metadata non-claim | anonymity·traffic padding·metadata 보호를 제공하지 않음 |

## Daemon-first traceability register

이 표는 P0 기준의 최소 추적 단위다. `blocked` 행은 아직 구현되지 않았거나
독립 검토가 없으므로 고위험 제품의 증거로 사용할 수 없다.

| 요구사항 | source boundary | focused test/command | redacted artifact | 남은 한계 |
| --- | --- | --- | --- | --- |
| `ARCH-04`, `BRIDGE-01` | `apps/daemon/src/bridge.rs`, `bridge_http.rs`, `http_server.rs`, `session_routes.rs` | bridge unit tests, `node scripts/verify_daemon_boundary.mjs`, `node scripts/verify_local_bridge.mjs`, local daemon bootstrap smoke | origin/token/version/CSRF/restart negative 결과; secret·credential 제거 | 실제 clean Chromium matrix와 독립 review는 없음 |
| `AUTH-03`, `AUTH-04` | `apps/daemon/src/identity.rs`, `device.rs`, `device_link.rs`, `authority.rs`, `apps/server/invite-code.mjs` | daemon device registry/link focused tests, `node scripts/verify_invite_code.mjs`, staged-invite relay-receipt test, local UI device smoke | root-signed certificate, duplicate/foreign/revoked rejection, invite expiry/single-use/owner revoke, public event fields | 독립 composition review와 운영 device lifecycle evidence는 없음 |
| `CRYPTO-04` | `apps/daemon/src/mls_session.rs`, `mls_routes.rs`, `protocol_gate.rs` | daemon session-focused checks and release acceptance | message IDs/epochs/verdict only; no private session state in UI response | protocol composition 및 독립 review 미완료 |
| `DATA-02`, `DATA-04`, `RECOVERY-01` | `apps/daemon/src/storage.rs`, `cli.rs`, `authority_routes.rs`, `apps/web/src/*.js` | daemon storage/recovery fixtures, `node scripts/verify_web_exposure.mjs`, local release acceptance | state transition·error code·hash만 포함한 recovery report; no-store UI + 브라우저 저장소 API 부재 | OS keychain integration·secure deletion·seizure/coercion 방어는 non-claim |
| `RELEASE-01`, `RELEASE-02`, `RELEASE-03` | daemon/web/relay release manifest and trust bootstrap | `scripts/verify_all.sh --release`, local acceptance and trust fixtures | artifact hashes, signer fingerprint, version, verdict only | 운영 신뢰 채널·clean OS matrix·실제 서명키는 외부 절차 |
| `ACT-09`/`ACT-10` non-claims | browser/OS boundary and diagnostics | static/log/DOM scans | redacted category counts only | 장악된 브라우저·OS·keylogger·화면 캡처는 보호하지 않음 |
| `ACT-11`/`ACT-12` non-claims | release trust and endpoint incident boundary | release negative fixtures; incident runbook fixture | version/fingerprint/event type only | coercion resistance와 완전한 공급망 신뢰는 주장하지 않음 |

CLI workflow evidence is intentionally limited to `node scripts/verify_cli_workflow.mjs`
and the daemon unit flow. It proves that passphrases are read from stdin, not
argv, and that local encrypted recovery refuses overwrite; it does not prove
terminal echo suppression, OS-wide keychain support, or a production update path.

`source boundary`가 현재 daemon 경로를 가리키는데 실제 파일이 없으면 해당 행은
자동으로 `blocked`로 취급한다. 삭제된 browser prototype이나 legacy/native 코드로
현재 daemon 행을 충족했다고 판정하지 않는다.

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
