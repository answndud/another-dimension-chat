# 보안 사고·릴리스 사고 대응 runbook

정상적인 signing key bootstrap·rotation·revocation 절차와 redacted 수령 기록은
[`RELEASE_TRUST_OPERATIONS.md`](RELEASE_TRUST_OPERATIONS.md)에 있다. 이 문서는 사고
발생 시 중지·격리·회전 순서를 우선한다.

이 runbook은 사용자가 비밀값을 공개하지 않고 로컬 daemon, relay와 브라우저 세션을
중지하는 절차다. 모든 사고에서 “조사 전에 더 실행해 보기”를 하지 않는다.
운영자나 reviewer가 실제 조치를 수행했는지 자동 테스트가 증명할 수 없으므로,
실행하지 않은 절차를 완료했다고 표시하지 않는다.

## 공통 즉시 조치

1. 브라우저 세션을 잠그고 private UI 탭을 닫는다.
2. daemon과 relay를 중지한다. capability URL, bootstrap URL, invite, envelope,
   passphrase, plaintext, safety material은 복사·게시·로그 수집을 하지 않는다.
3. 의심되는 daemon·relay data directory를 원본 보존용으로 별도 이동한다.
   원본을 덮어쓰거나 공개 업로드하지 않는다.
4. 새 verified release와 fresh pairing 없이는 메시지를 보내지 않는다.
5. 사건 ID, 시간대, version, commit, 일반적인 실패 분류만 기록한다.

## capability·invite 유출

1. 서버를 중지하고 기존 data directory를 보존한다.
2. 새 private data directory로 서버를 시작해 local-access와 inbox capability를
   모두 회전한다. 기존 큐를 새 서버에 복사하지 않는다.
3. 유출된 invite를 폐기하고 상대와 fresh invite 및 safety material을 별도
   신뢰 채널에서 다시 확인한다.
4. 공격자가 봉투를 제출했을 수 있으므로 전송 성공·수신 성공을 추정하지 않는다.

## 변조된 UI·daemon·manifest·runtime

1. `doctor` 또는 `verify_public_release_gate.mjs`가 실패하면 실행을 중지한다.
2. 해당 archive를 삭제하지 말고 hash와 source revision만 private incident record에
   적는다. archive 내용과 로그를 공개 issue에 붙이지 않는다.
3. 별도 trusted key 경로로 새 archive의 fingerprint와 manifest를 확인한다.
4. 변조된 release에서 unlock·pairing·메시지 입력을 했다면 endpoint compromise로
   간주하고 새 verified release에서 fresh profile/pairing을 시작한다.

## signing key compromise

1. 즉시 해당 key로 서명한 archive의 배포·설치를 중지한다. 자동 rollback으로
   같은 key의 이전 archive를 되살리지 않는다.
2. 영향을 받은 key ID를 revoked 목록에 추가하고, 새 key pair를 offline에서
   생성한 뒤 fingerprint를 별도 신뢰 채널로 전달한다.
3. 새 최소 허용 version을 올리고, 새 key로 signed archive·SBOM·provenance를
   다시 만든다. old key 서명물은 검증 성공 여부와 무관하게 배포하지 않는다.
4. 영향받은 version range, 발견 시각, 배포 채널, 회전 완료 시각을 기록한다.
5. key compromise를 해결했다고 공개하기 전 독립 reviewer에게 key bootstrap,
   revocation, rollback rejection evidence를 재검토받는다.

## CVE·취약점 신고·공개

- 공개 issue에는 exploit, capability, invite, plaintext, key, local path를 넣지
  않는다. GitHub private vulnerability reporting 등 private channel을 우선한다.
- 신고를 받으면 receipt ID와 redacted reproduction만 남기고, 영향 범위 확인 전
  공개 disclosure나 severity 축소를 하지 않는다.
- 재현 가능한 취약점은 영향을 받는 version, 공격 전제조건, 완화 가능 여부,
  수정 version, release gate 결과를 함께 기록한다.
- 수정 archive가 없거나 trusted key가 회전되지 않았으면 affected release의
  배포를 중지한다. 사용자는 새 verified archive가 나올 때까지 민감한 통신을
  하지 않는다.
- 공개 advisory에는 비밀값·운영자 식별정보·사용자 대화 내용을 포함하지 않는다.

## 분실·압수·브라우저 침해

분실한 기기의 unlock 상태, 브라우저 storage, clipboard history, swap, crash
dump가 노출됐다고 가정한다. panic wipe나 profile 삭제를 secure deletion 또는
강요 저항으로 표현하지 않는다. 새 verified release에서 새 profile, 새 invite,
새 safety 확인을 사용한다.

## 사고 종료 조건

사고는 다음을 모두 private record에 남긴 뒤에만 종료한다.

- 영향을 받은 version/key ID와 배포 중지 범위
- capability·invite·profile·signing key 회전 여부
- 재현 fixture와 회귀 검증 명령
- 공개 문구와 non-claim 변경 여부
- 독립 reviewer 검토가 필요한지와 남은 blocker
