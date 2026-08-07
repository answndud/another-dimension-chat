# 지원과 문제 대응

Another Dimension의 현재 제품 경로는 **macOS에서 실행되는 Rust 보안 daemon +
daemon이 제공하는 Chromium UI + 사용자가 소유하는 relay**입니다. 과거 Tauri,
browser Olm, IndexedDB 키 저장소는 제품과 릴리스에서 제거되었으며 지원 대상이
아닙니다.

> 고위험 통신 승인은 아직 비활성화되어 있습니다. 자동 검증 통과는 독립 보안
> 감사, 익명성, 검열 저항성 또는 감염된 기기에서의 보호를 뜻하지 않습니다.

## 현재 지원 범위

| 구분 | 현재 선언 | 제한 |
| --- | --- | --- |
| 운영체제 | Apple Silicon macOS | 다른 OS는 지원하지 않음 |
| UI | daemon이 loopback에서 제공하는 Chromium UI | 정확한 Chromium 버전의 전체 사용자 여정 증거는 아직 `unverified` |
| 보안 코어 | 로컬 Rust daemon의 신원·OpenMLS·암호화 저장소 | 브라우저는 장기 키나 메시지 상태를 저장하지 않음 |
| 전달 | 사용자 소유 relay | 중앙 운영 relay, 익명 네트워크, traffic hiding을 제공하지 않음 |
| 배포 | 서명 manifest로 검증되는 daemon·UI·bundled Node relay archive | 운영 signing key의 외부 신뢰 경로가 별도로 필요 |

판정 원본은 [`reference/SUPPORT_MATRIX.json`](reference/SUPPORT_MATRIX.json)입니다.
`verified-local`은 적힌 범위의 로컬 자동 검증만 뜻하며 공개 보안 승인이 아닙니다.
`unverified` 항목은 지원한다고 주장하지 않습니다.

```sh
node scripts/verify_support_matrix.mjs
node scripts/verify_daemon_ui_artifact.mjs --daemon-ui-artifact
node scripts/acceptance_os_matrix.mjs --current-host
```

## 지원 요청에 포함할 정보

다음 정보만 민감값을 제거한 뒤 전달하세요.

- 앱 버전 또는 commit
- macOS와 Chromium의 정확한 버전
- 실패한 단계: 설치, 초기화, 시작, 초대, 검증, 전송, 복구, 잠금 중 하나
- 화면에 표시된 일반 오류 코드
- `another-dimension doctor`의 성공·실패 항목(경로와 식별자는 제거)
- 문제 직전 업데이트 여부

다음 값은 일부라도 공개 이슈, 메신저, 이메일, 화면 공유에 넣지 마세요.

- 프로필 암호문구와 복구 파일
- bootstrap URL, 쿠키, CSRF 토큰, private local UI URL
- 초대 코드, 안전 번호, account/device ID
- relay inbox URL, capability, 인증서 pin, 공개키 원문
- 메시지, 첨부파일, 암호문 봉투
- 원본 로그, crash dump, 데이터 디렉터리, 로컬 절대 경로

## 오류가 났을 때

| 증상 | 먼저 할 일 | 하지 말아야 할 일 |
| --- | --- | --- |
| 암호문구 거부 | 입력을 중단하고 저장한 암호문구를 확인 | 반복 추측, 셸 기록에 암호 입력 |
| daemon 연결 실패 | `status`, `doctor` 확인 후 daemon을 한 번 재시작 | 인증 없는 별도 웹 서버로 UI 열기 |
| 초대·신원 변경 | 전송 중단 후 별도 채널에서 새 초대와 안전 번호 전체 재확인 | 경고 무시, 이전 신원을 자동 신뢰 |
| relay timeout | relay 상태와 TLS pin을 확인하고 재시도 | 새 인증서 pin을 확인 없이 수락 |
| 저장소·복구 오류 | 원본 복구 파일과 데이터 디렉터리를 보존 | 기존 프로필 덮어쓰기, 손상 파일 반복 import |
| release 검증 실패 | 설치·업데이트 중단 후 신뢰 가능한 fingerprint 재확인 | archive 내부 공개키만 믿고 강제 설치 |

전송 실패는 전달 성공으로 기록하지 않습니다. relay capability가 노출되었거나
account/device/relay binding이 바뀌면 기존 연결을 신뢰하지 말고 새 초대와 안전
번호로 다시 연결해야 합니다.

## 복구와 삭제의 경계

현재 복구 형식은 daemon이 만드는 인증된 `ADRECOVERY2`입니다. 과거
`ADBACKUP1`, `ADSESSION1`, `ADTRANSCRIPT1`은 자동 변환하지 않습니다. 다른 암호
프로토콜의 세션을 변환해 신원 연속성을 가장하지 않기 위해 새 프로필과 새 pairing이
필요합니다.

복구 파일을 가져오기 전 원본을 별도 오프라인 매체에 보존하고 `recovery inspect`로
형식을 확인하세요. `wipe`는 daemon 데이터 제거를 시도하지만 SSD 잔여 데이터,
Time Machine, 별도 백업, relay의 만료 전 암호문까지 안전 삭제한다고 보장하지
않습니다.

## 사고 대응 순서

1. daemon과 relay를 중지하고 민감한 대화를 재개하지 않습니다.
2. 초대·capability·기기가 노출되었다면 기존 binding을 폐기하고 깨끗한 프로필에서
   새 초대와 안전 번호를 확인합니다.
3. release hash, signing fingerprint, daemon binary 또는 UI bundle이 달라졌다면
   업데이트를 중단하고 별도 신뢰 채널로 확인합니다.
4. 기기 감염이 의심되면 해당 기기의 잠금·삭제 버튼을 신뢰하지 말고 깨끗한 기기로
   이동한 뒤 기존 기기를 폐기합니다.
5. 보안 취약점은 GitHub private vulnerability reporting으로 민감값 없이
   신고합니다. 비공개 채널이 없다면 공개 이슈에는 연락 경로 요청만 남깁니다.

자동 테스트 결과만으로 보안 승인을 주장하지 않습니다. 운영 배포, signing key
침해, rollback 또는 capability 유출 대응은
[`reference/INCIDENT_RESPONSE.md`](reference/INCIDENT_RESPONSE.md)를 함께 따릅니다.
