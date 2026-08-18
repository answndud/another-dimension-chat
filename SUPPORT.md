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
| 운영체제 | Apple Silicon macOS(arm64) | 다른 OS·Intel macOS는 development-only이며 배포 대상이 아님 |
| UI | daemon이 loopback에서 제공하는 Chromium UI | Safari·Firefox·모바일 브라우저는 지원하지 않으며, 접속하면 지원 범위 안내 화면만 표시함 |
| 보안 코어 | 로컬 Rust daemon의 신원·OpenMLS·암호화 저장소 | 브라우저는 장기 키나 메시지 상태를 저장하지 않음 |
| 전달 | 사용자 소유 relay | 중앙 운영 relay, 익명 네트워크, traffic hiding을 제공하지 않음 |
| 배포 | 서명 manifest로 검증되는 daemon·UI·bundled Node relay archive | 운영 signing key의 외부 신뢰 경로가 별도로 필요 |

판정 원본은 [`reference/SUPPORT_MATRIX.json`](reference/SUPPORT_MATRIX.json)입니다.
`verified-local`은 적힌 범위의 로컬 자동 검증만 뜻하며 공개 보안 승인이 아닙니다.
`unverified` 항목은 지원한다고 주장하지 않습니다.

`verified-local`로 올릴 수 있는 evidence는 단순히 “명령이 통과했다”는 로그가
아닙니다. 다음 필드를 가진 redacted JSON이어야 합니다.

```json
{
  "status": "verified-local",
  "sourceRevision": "40자 이상인 실제 Git revision",
  "archiveSha256": "서명된 release archive의 SHA-256 64자리",
  "recordedAt": "2026-08-08T00:00:00Z",
  "host": { "platform": "matrix의 정확한 platform", "browserVersion": "Chromium 정확한 버전" },
  "runtime": "관찰한 daemon/runtime 버전",
  "scope": "검증 범위를 제한적으로 설명",
  "observations": { "steps": ["관찰한 단계"], "initializationErrorShown": false },
  "redaction": { "passed": true }
}
```

archive hash, source revision, host/browser version이 하나라도 빠지거나 실제
서명 archive와 연결되지 않으면 `unverified`로 남깁니다.

```sh
node scripts/acceptance_representative_flow.mjs   # P6.2 대표 flow 실행 + evidence 생성 + matrix 승격
node scripts/verify_support_matrix.mjs
node scripts/verify_daemon_ui_artifact.mjs --daemon-ui-artifact
node scripts/acceptance_os_matrix.mjs --current-host
```

`reference/evidence/*.json`은 위 대표 flow가 생성하는 redacted 로컬 증거이며,
현재 호스트·source revision·검증한 archive hash에만 유효합니다. 다른
revision·호스트에서 재검증하지 않는 한 더 넓은 지원을 주장하지 않습니다.

## 지원 환경 고정

`private-trusted` 배포의 공식 지원 범위는 **Apple Silicon macOS(arm64) +
Chromium 계열 브라우저**로 고정합니다. 정확한 Chromium 버전은 evidence에 기록해야
`verified-local`로 올릴 수 있으며, 그 전까지 브라우저 항목은 `unverified` 상태를
유지합니다.

지원하지 않는 환경(다른 OS, Intel macOS, 다른 브라우저)에서 daemon을 실행하면
`doctor`가 `unsupported` 항목을 표시하고 `serve`가 development-only 경고를
출력합니다. 이들 환경은 개발용 빌드로만 동작하며 배포 대상이 아닙니다.

## 데이터 위치와 수명

| 데이터 | 위치 | 수명·처리 |
| --- | --- | --- |
| daemon 프로필 데이터 | `--data-dir`(설치형은 `server-config.json`의 `daemonDataDir`; 기본 `~/.local/share/another-dimension/data/daemon`) | AES-256-GCM 암호화 store + revision marker. `wipe`로 삭제를 시도하지만 SSD 잔여·백업·브라우저 캐시까지 삭제한다고 보장하지 않음 |
| relay 데이터 | `server-config.json`의 `relayDataDir` | SQLite queue, 암호화 blob, capability, receipt signing key. envelope은 기본 7일 TTL, blob은 최대 7일, capability는 30일 |
| 브라우저 임시 상태 | Chromium 쿠키·세션 저장소·캐시 | daemon 재시작 시 bootstrap URL·쿠키가 무효화됨. UI는 no-store로 제공되며 장기 키·메시지 상태를 저장하지 않음 |
| recovery 파일 | 사용자가 지정한 오프라인 매체 | 내보낸 시점의 암호화된 로컬 스냅샷. relay에 남은 blob·삭제된 데이터·상대 기기 상태는 복원하지 않음 |

제한값은 `reference/RESOURCE_LIMITS.json`과 `reference/TRANSPORT_DECISION.md`에
선언되어 있으며 relay 구현과 `scripts/verify_transport_boundary.mjs`로 대조합니다.

## relay 운영자가 보는 정보

| 볼 수 있음 | 볼 수 없음 |
| --- | --- |
| 클라이언트 IP, 접속 시각 | 평문 메시지·파일 내용 |
| 요청 시각·빈도·암호문 크기 | 개인키·암호문구·데이터베이스 키 |
| inbox에 제출된 불투명 envelope 수·도달 여부 | 표시 이름·연락처 목록·account/device ID |
| capability 유출 시 제출 결과(수신 확인은 별도 local capability 필요) | 파일 이름·MIME·복호화된 첨부파일 |

평문을 보지 못하는 것과 메타데이터를 보호하는 것은 별개입니다. 이 제품은
익명성·트래픽 분석 방어·검열 저항을 제공하지 않으며, `high-risk-disabled`
모드가 항상 비활성화되어 있습니다.

단일 topology 결정(신뢰하는 소규모 그룹의 사설 relay), production 모드 게이트,
reverse proxy·DNS·방화벽·TLS 갱신, 백업·복구·키 회전 절차는
`reference/RELAY_OPERATIONS.md`를 따릅니다. relay receipt signing key의 신뢰 경로는
`reference/RELEASE_TRUST_OPERATIONS.md`에 있습니다.

## macOS 설치와 quarantine/Gatekeeper

- 브라우저로 내려받은 archive에는 quarantine 속성이 붙을 수 있습니다.
  `xattr -l ARCHIVE.tar.gz`로 속성을 확인하고, 서명 fingerprint를 두 독립 채널에서
  대조하기 전에는 압축을 풀거나 실행하지 마세요.
- fingerprint·SHA-256·trust manifest minimum version을 확인한 뒤에도 Gatekeeper가
  막으면 macOS 문서의 승인 절차를 따르세요. 경고를 무시하고 강제 실행하거나,
  quarantine을 임의로 제거하지 않습니다.
- 설치 launcher(`another-dimension`), daemon binary, bundled Node runtime은
  설치 디렉터리 안에 0700 권한으로 고정됩니다. daemon/relay 데이터는 설치
  디렉터리 밖의 데이터 디렉터리(기본 `~/.local/share/another-dimension/data`)에
  보관되므로 uninstall해도 프로필·relay 데이터는 삭제되지 않습니다.

## 프로필 분리와 다중 프로필

- 프로필은 `--data-dir` 단위로 분리됩니다. 한 프로필의 store·revision·Keychain
  항목은 다른 프로필의 데이터 디렉터리에 접근하지 않습니다.
- 같은 기기에 여러 프로필을 만들면 각 프로필이 별도 데이터 디렉터리와 별도
  daemon 인스턴스(daemon.lock)를 사용합니다. 한 프로필의 복구 파일을 다른
  프로필 디렉터리에 import하면 형식·버전·identity 검증 후에도 기존 프로필을
  덮어쓰지 않습니다.
- daemon은 `127.0.0.1`에만 바인딩하며 다른 프로필이나 다른 사용자 계정의
  데이터를 자동으로 읽지 않습니다.

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
