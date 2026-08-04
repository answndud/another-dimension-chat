# Another Dimension UI 흐름 계약

이 문서는 현재 웹 제품의 화면 상태와 사용자 액션을 정의한다. 디자인 개편은 이 계약의
기능과 보안 경계를 보존해야 하며, 화면을 단순하게 보이게 하기 위해 안전 검증 단계를
생략해서는 안 된다.

## 제품 원칙

- 중앙 계정·전화번호·이메일·username 검색·그룹방을 제공하지 않는다.
- 연결은 일회성 초대 또는 수동 signed invite로 시작한다.
- 안전 문구 확인 전에는 메시지 전송을 열지 않는다.
- relay 자동 전달이 불가능하면 수동 암호화 봉투를 제공하되, 평문을 relay로 보내지 않는다.
- 브라우저 UI는 현재 prototype에서 암호화 저장소를 사용한다. daemon 전환 전까지 고위험
  통신을 허용하는 표현을 하지 않는다.
- daemon bootstrap 주소로 열린 경우에는 one-time fragment를 즉시 제거하고, 브라우저
  저장소·암호화·메시지 화면을 열지 않은 채 daemon session gate만 표시한다. 실제 daemon
  API가 준비되기 전에는 연결 성공이나 고위험 통신 가능으로 표시하지 않는다.
- 잠금·삭제·백업은 각각 다른 작업이며, 하나의 버튼이나 화면으로 합치지 않는다.

## 화면 상태

| 상태 | 진입 조건 | 보여줄 것 | 허용 액션 | 차단 액션 |
| --- | --- | --- | --- | --- |
| `locked` | 프로필 미선택, 잠금, 자동 잠금 | 프로필 선택, 암호 문구, 보안 경계 | 생성, 잠금 해제, 백업 가져오기 | 초대, 메시지, 복구 세션 |
| `profile-ready` | 프로필 잠금 해제 직후 | 내 프로필, 연결 없음, 다음 행동 | 초대 보기, 새 연결, 백업, 잠금 | 메시지 전송 |
| `invite-created` | 내 초대 생성 | 초대 상태, 만료/폐기, 공유 주의 | 복사, 새로 발급, 상대 초대 입력 | 메시지 전송 |
| `pairing` | 상대 초대 제출 | 상대 identity·relay·검증 결과 | 페어링, 취소, 새 초대 요청 | 메시지 전송 |
| `unverified` | peer 등록 후 안전 문구 미확인 | 전체 안전 문구, 별도 채널 확인 안내 | 안전 문구 확인 | 모든 메시지 전송 |
| `handshake-pending` | identity 확인 후 세션 준비 중 | handshake 상태, 수동 봉투 안내 | 자동 전달, 봉투 내보내기, 가져오기 | 일반 메시지 전송 |
| `ready` | 세션 준비 및 안전 문구 확인 | 대화, 상대 identity, 세션 상태 | 메시지 작성·전송, 동기화, 봉투 전송 | identity 변경 시 전송 |
| `manual-delivery` | relay가 없거나 HTTP endpoint | 암호화 봉투, 전달 대상, 재전송 주의 | 내보내기, 가져오기, 전달 확인 | 평문 전송 |
| `relay-unavailable` | 자동 전달 실패 | 실패 원인과 수동 전달 방법 | 재시도, 수동 봉투 | 성공으로 표시 |
| `storage-error` | IndexedDB·quota·private mode 오류 | 저장 실패와 데이터 보존 안내 | 백업 보존, 잠금, 환경 변경 | 암호화 작업 계속 |
| `backup-recovery` | 백업 생성·가져오기 선택 | profile/session/transcript 구분 | 생성, 가져오기, 수동 저장 | 자료 종류 혼용 |
| `wipe-confirm` | 긴급 삭제 선택 | 삭제 대상과 삭제 불가 한계 | 암호 문구 확인, 취소 | 즉시 삭제 |
| `session-locked` | 다른 탭 잠금, pagehide, inactivity | 잠금 이유와 재잠금 안내 | 다시 잠금 해제 | 기존 세션 사용 |
| `daemon-session-gate` | `ad_bootstrap` fragment로 daemon UI를 연 경우 | fragment 제거 결과, daemon session 상태, 브라우저 저장소 미사용 안내 | daemon 상태 확인, 세션 잠금, 연결 실패 시 데몬 재실행 | browser profile 생성·IndexedDB·메시지 전송 |

## 화면 구성

### 1. 시작 화면 (`locked`)

- 프로필 선택과 잠금 해제를 기본 작업으로 둔다.
- 새 프로필 만들기는 별도 단계로 열고 이름, 암호 문구, 실험용/고위험 사용 금지 동의를 받는다.
- 새 프로필의 암호 문구는 Web Crypto CSPRNG로 생성하며 직접 입력 기능은 제공하지 않는다.
  생성된 문구를 password manager에 보관한 뒤 프로필 생성을 완료한다.
- 생성 문구는 password manager 저장을 우선 권장한다. 복사 기능은 클립보드 기록·동기화
  삭제 경고를 표시하며, 평문 `.txt` 다운로드는 Downloads·백업·동기화에 남을 수 있다는
  확인 후에만 제공한다.
- 프로필 백업 가져오기는 잠금 해제와 분리한다.
- 브라우저 보안 상태는 짧은 상태 요약과 상세 설명으로 나눈다.
- 거대한 마케팅 문구, 기술 구현 목록, 대화 기능은 시작 화면에 노출하지 않는다.

### 2. 작업공간 (`profile-ready` 이후)

- 좌측 rail: 현재 프로필, 연결, 보안·복구, 설정, 잠금, 긴급 삭제.
- 연결 목록: 로컬에 저장된 상대만 표시한다. 검색은 이 목록 안에서만 동작한다.
- 현재 영역: 선택한 연결의 보안 상태 또는 대화를 표시한다.
- 좁은 화면에서는 rail → 목록 → 현재 영역을 단계별 화면으로 접는다.

### 3. 새 연결 (`invite-created`, `pairing`)

1. 내 초대 상태를 확인한다.
2. 초대를 안전한 별도 채널로 전달한다.
3. 상대 초대를 붙여 넣는다.
4. 서명·만료·relay·identity 결과를 확인한다.
5. 페어링한다.
6. 안전 문구를 외부 신뢰 채널로 대조한다.

초대 원문은 기본 화면에 상시 노출하지 않고, 사용자가 “공유 자료 보기”를 선택했을 때만
표시한다. 복사 성공은 identity 검증의 증거가 아니다.

### 4. 대화 (`ready`, `manual-delivery`)

- 헤더: 상대 표시 이름, account/device identity, 안전 문구 확인 상태, 세션 상태.
- 대화 본문: 로컬 transcript만 표시한다.
- 입력 영역: 현재 전송 가능 조건이 충족된 경우에만 활성화한다.
- 전송 방법 패널: 자동 relay, inbox 동기화, 수동 envelope, handshake 전달 확인을 담는다.
- identity 변경·안전 문구 불일치·세션 오류는 일반 toast가 아니라 대화 상단 차단 상태로 표시한다.

### 5. 보안·복구

- profile backup: identity와 private material 복구용.
- session backup: Olm session/replay 복구용.
- transcript export: 대화 기록 복구용.
- 긴급 삭제: 현재 브라우저 저장소 삭제 시도와 삭제 불가 영역을 함께 표시한다.
- 모든 자료는 서로 다른 종류임을 제목·설명·색상보다 텍스트로 명확히 표시한다.

## 현재 액션 매핑

| 현재 DOM/액션 | 새 영역 |
| --- | --- |
| `create-form`, `unlock-form` | 시작 화면 |
| `import-backup` | 시작 화면 / 보안·복구 |
| `lock`, `panic-wipe`, `wipe-confirm-form` | rail / 보안·복구 |
| `copy-invite`, `revoke-invite`, `pair`, `peer-invite` | 새 연결 |
| `safety-confirmation`, `confirm-safety` | 연결 보안 검증 |
| `confirm-handshake` | 전송 방법 |
| `message`, `send-envelope` | 대화 입력 |
| `sync-inbox` | 전송 방법 |
| `export-envelope`, `envelope`, `incoming`, `import-envelope` | 전송 방법 |
| `export-backup`, `make-session-backup`, `load-session-backup` | 보안·복구 |
| `make-transcript-export`, `load-transcript-export` | 보안·복구 |

## 전역 표시 규칙

- `notice`: 일반 진행 상태.
- `error`: 작업 실패와 원인·조치·보안 영향·재시도 정책.
- `warning`: 전송 차단, identity 변경, 삭제 한계 등 사용자의 결정을 요구하는 위험.
- `verified`: 외부 채널 대조가 완료된 경우에만 사용한다.
- disabled 버튼은 반드시 가까운 설명으로 비활성 이유를 제공한다.
