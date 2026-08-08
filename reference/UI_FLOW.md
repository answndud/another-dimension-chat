# Another Dimension daemon UI 흐름 계약

> **상태: 현재 daemon-owned UI 계약.** 브라우저는 화면·사용자 승인·입력만
> 담당한다. 프로필, 개인키, OpenMLS 상태, 대화 기록, 복구 자료는 daemon의
> 암호화 저장소가 소유한다. 삭제된 browser-owned profile/IndexedDB/Olm 화면은
> 현재 제품 흐름이 아니다.

## 제품 원칙

- 전화번호·이메일·글로벌 계정·검색 가능한 username·중앙 contact discovery를
  사용하지 않는다.
- 계정은 Account Root Key에서 파생되고, 기기는 별도 Device Key와 root-signed
  certificate를 사용한다.
- 연결은 일회성 초대 코드로 시작한다. 코드 자체는 인증·복호화·기기 추가
  권한이 아니다.
- 안전 번호 확인과 연락처 승인은 별도 단계다. 안전 번호만 확인해도 메시지
  입력을 활성화하지 않는다.
- 브라우저는 daemon이 발급한 one-time fragment URL로만 세션을 얻고, 교환
  직후 fragment를 제거한다. private key·ratchet state·raw store는 API로
  반환하지 않는다.
- 직접 HTTPS/VPN/LAN은 anonymity가 아닌 제한된 전송 경로다. 고위험 모드는
  독립 검토·운영 신뢰·release evidence 전까지 비활성화한다.

## 주요 화면 상태

| 상태 | 진입 조건 | 보여줄 것 | 허용 액션 | 차단 액션 |
| --- | --- | --- | --- | --- |
| `daemon-gate` | bootstrap URL 없음/실패/잠금 | daemon 재실행 안내와 오류 원인 | 터미널에서 daemon 재실행 | 초대·메시지·개인키 작업 |
| `connected-conversation` | bootstrap 교환·세션 인증 완료 | 연락처, 초대 코드, 연결 상태 | 초대 생성/입력, 연락처 선택 | 승인 전 메시지 전송 |
| `pairing-received` | 상대 초대 코드 검증 완료 | 상대 account/device와 안전 번호 | 안전 번호 비교, 거절 | 승인 전 메시지 전송 |
| `safety-verified` | 사용자가 전체 안전 번호를 별도 채널로 대조 | 확인 결과와 연락처 승인 버튼 | 연락처 승인, 재확인 | `established` 전 메시지 전송 |
| `established` | 안전 번호 확인·연락처 승인·세션 준비 완료 | 대화와 전송 상태 | 텍스트/첨부 전송, 동기화 | identity·capability 변경 후 전송 |
| `devices` | 기기 메뉴 선택 | 현재/등록/폐기 기기와 이벤트 | 새 기기 승인, 비현재 기기 폐기 | 현재 기기 폐기 |
| `security` | 보안과 복구 메뉴 선택 | relay pin, 복구, wipe 경계 | pin 저장, 백업, 복구 예약, wipe | 검증 전 원격 relay 사용 |
| `status` | 상태 메뉴 선택 | daemon 세션·저장소·계정·보안 판정 | 상태 확인 | 고위험 사용 허용 주장 |

## 최초 사용 workflow

프로필 생성은 브라우저가 아니라 설치된 daemon CLI가 수행한다.

```text
release gate 확인
  → another-dimension init --display-name NAME --data-dir PATH
  → 암호문구는 stdin으로만 전달
  → another-dimension serve --open
  → 출력된 one-time URL을 같은 Mac의 Chromium에서 열기
```

암호문구는 URL, argv, 브라우저 입력, 로그에 넣지 않는다. 현재 CLI는 생성·해제
시 암호문구를 stdin에서 읽으며, 운영 제품에서는 password manager/OS key store
정책과 독립 검토 결과가 함께 필요하다. 사용자가 암호문구를 잊으면 daemon은
복구 우회나 서버 복호화를 제공하지 않는다.

## 초대·연결 workflow

1. 대화 화면에서 `일회성 초대 만들기`를 선택한다.
2. 코드만 별도 신뢰 채널로 전달한다. 화면·로그·relay에 평문 초대나 개인키를
   남기지 않는다.
3. 상대 코드를 `초대 코드 확인`으로 입력한다.
4. daemon이 서명·만료·relay binding·single-use·capability를 검증한다.
5. 두 사용자가 안전 번호 전체를 별도 채널에서 비교한다.
6. 일치할 때만 연락처 승인을 누른다.
7. pairing state가 `established`가 된 뒤에만 대화 입력과 전송을 사용한다.

코드 복사 성공, 상대 표시 이름, relay 응답만으로 신원을 확인했다고 표시하지
않는다. 안전 번호 변경·기기 폐기·capability 변경은 일반 알림이 아니라 전송
차단과 재검증으로 처리한다.

## 메뉴별 액션 계약

### 대화

- `daemon-create-invite`: 새 일회성 초대 생성
- `daemon-copy-invite`: 코드만 클립보드로 복사
- `daemon-revoke-invite`: 초대 즉시 폐기
- `received-invite-code` / `daemon-consume-invite`: 상대 코드 확인
- `daemon-safety-confirmation` / `daemon-verify-safety`: 안전 번호 비교
- `daemon-approve-pairing`: 연락처 승인
- `daemon-message-send`: `established` 상태에서만 메시지 전송
- 첨부파일은 daemon이 암호화·청크 처리한 뒤 relay로 전달한다. 브라우저는
  평문 파일 키나 daemon store를 직접 다루지 않는다.

### 기기

- 현재 기기는 폐기할 수 없다.
- 새 기기 연결 요청과 별도 승인 코드를 함께 확인한다.
- 폐기된 기기는 이후 session/delivery admission에서 거부된다.
- 이벤트에는 공개 device id·종류·시각만 남기고 개인키·승인 비밀은 남기지 않는다.

### 보안과 복구

- remote relay는 정확한 TLS pin을 별도 채널로 확인한 뒤 저장한다.
- 복구 백업은 daemon이 생성하고 브라우저는 다운로드/파일 선택만 수행한다.
- 백업에는 relay 운영 데이터나 브라우저 세션이 포함되지 않는다는 경계를
  명시한다.
- `이 기기의 모든 로컬 데이터 삭제`는 삭제 시도일 뿐 secure deletion·압수
  대응이 아니다.

### 상태와 잠금

- `잠그기` 후 브라우저 세션 cookie/CSRF와 daemon active session을 폐기한다.
- 상태 화면의 `브라우저 저장소: 사용하지 않음`은 현재 daemon UI 계약의 핵심
  사실이다.
- 독립 검토 완료 전에는 항상 고위험 사용 금지 문구를 표시한다.

## 전역 표시 규칙

- `status`: 진행·연결 상태만 표시한다.
- `error`: 실패 원인, 사용자가 할 조치, 재시도/보안 영향을 함께 표시한다.
- `warning`: identity 변경, 안전 번호 불일치, 삭제 한계, 전송 차단을 상단에
  고정한다.
- `verified`: 외부 채널 대조와 daemon 검증이 모두 끝난 경우에만 사용한다.
- 안전 번호 확인만으로 “메시지 송신 허용”을 표시하지 않는다. `established`와
  연락처 승인 전에는 반드시 “연락처 승인 필요” 또는 세션 준비 상태를 표시한다.
- disabled 버튼은 가까운 설명으로 비활성 이유를 제공한다.

## 지원·비보장 경계

현재 자동·브라우저 evidence는 Apple Silicon macOS의 내장 Chromium smoke와
local-only release acceptance 범위다. 정확한 Chromium 버전이 기록된 clean
signed archive evidence가 없으면 `SUPPORT_MATRIX.json`은 `unverified`로
유지한다. 다른 OS/browser, anonymity, secure deletion, coercion resistance,
compromised-device protection, independent audit는 지원 주장에 포함하지 않는다.
