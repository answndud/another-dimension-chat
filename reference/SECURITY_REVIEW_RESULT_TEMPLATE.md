# 독립 보안 검토 결과 제출 양식

이 파일은 reviewer에게 전달하는 양식이다. reviewer는 자동 테스트 출력에 서명하는
것이 아니라, 고정된 source revision과 명시된 검토 범위에 대한 자신의 판단을 별도
결과 JSON으로 제출해야 한다. 이 저장소에 작성자의 자체 서명을 넣어 `complete`로
만들지 않는다.

제출 JSON은 `scripts/verify_security_review_signoff.mjs`로 검증한다.

필수 내용:

- reviewer가 조직과 독립 reviewer임을 확인한 주체·방법
- 실제 검토한 source revision과 날짜
- covered/excluded scope, 공격 전제조건, findings와 severity
- 재현 절차, remediation, residual risk
- 결정(`reject`, `experimental-only`, `low-risk-release`)
- reviewer public key와 fingerprint를 별도 채널로 확인한 기록
- 결과 payload에 대한 Ed25519 서명

`high-risk-release` 또는 `production-ready` 결정은 자동 게이트가 승인하지 않는다.
browser/OS, 운영 key bootstrap, 독립성 확인 등 별도 blocker가 남아 있기 때문이다.

## 제출 전 체크리스트

- [ ] source revision은 packet의 hash와 일치한다.
- [ ] 검토하지 않은 범위가 `excludedScope`에 명시되어 있다.
- [ ] 모든 critical/high finding에 재현·영향·완화·회귀 테스트가 있다.
- [ ] residual risk와 승인 주체가 기록되어 있다.
- [ ] reviewer public key fingerprint를 별도 신뢰 채널로 대조했다.
- [ ] 비밀값, capability, invite, passphrase, plaintext, private key, 원본 URL이 없다.
- [ ] JSON 서명 검증이 통과한다.
