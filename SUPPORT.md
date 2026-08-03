# Support

Another Dimension Chat is a web-first experimental prototype. It is not
audited, not production-ready, and sensitive communication is prohibited.
Each user may run the local server on their own device; local development uses
the Vite web runtime or the bundled static server. The old macOS DMG is a
legacy artifact, not the primary product path.

## Public support

Keep reports redacted and limited to:

- app version or commit
- browser and platform
- broad failure class
- recovery action reached
- whether the local web build loaded
- whether the local server health endpoint loaded
- whether the peer endpoint was loopback, LAN, VPN, or reverse-proxy HTTPS
- whether `scripts/check_https_endpoint.mjs` passed, without including its URL

Never post invite codes, sealed envelopes, message text, safety phrases,
profile names, passphrases, private keys, browser storage exports, raw logs,
local paths, crash dumps, private local UI URLs, or screenshots of private rooms.

백업도 목적별로 분리됩니다. `ADBACKUP1`은 프로필 전용이고 대화·Olm session을
포함하지 않습니다. `ADSESSION1`은 Olm/replay 상태, `ADTRANSCRIPT1`은 대화 기록입니다.
지원 문의에는 이 문자열이나 일부를 절대 붙이지 말고, import 실패 단계와 일반 오류만
기록하세요. 긴급 삭제는 브라우저/OS 백업과 SSD 영역까지 지운다고 보장하지 않습니다.

한국어 요약: 초대·봉투·안전 문구·프로필 이름·암호 문구·개인키·브라우저 백업·원본
로그·private UI 주소는 절대 공개하지 마세요. 지원 문의에는 버전, 운영체제·브라우저,
일반적인 오류 종류와 마지막으로 성공한 복구 단계만 적습니다.

## 지원 범위와 자동 검증 범위

현재 공개 지원 범위는 다음처럼 보수적으로 선언합니다.

| 구분 | 선언 | 근거/제한 |
| --- | --- | --- |
| 제품 | `apps/web` browser UI + 사용자 소유 API-only relay | `reference/PRODUCT_BOUNDARY.md` |
| release runtime | signed archive의 bundled Node.js 20 이상 | public release gate와 local-only acceptance |
| 개발 검증 runtime | Node.js 20.13.1, npm 10.5.2 | 현재 자동 acceptance 환경 |
| 브라우저 기능 | secure context, Web Crypto, IndexedDB, WebAssembly, Service Worker가 모두 필요 | Codex in-app browser에서 WASM 초기화·프로필 생성/잠금 해제·초대 검증·안전 문구·수동 핸드셰이크·암호화 메시지 왕복·다중 탭 단일 세션 교체·inline wipe까지 `verified-local`; Service Worker 런타임 업데이트/캐시 및 실제 브라우저 matrix는 `unverified` |
| 운영체제 | macOS ARM64에서 local-only 자동 검증 | Linux/Windows 및 실제 브라우저 matrix는 지원 선언하지 않음 |
| 네트워크 | loopback 기본, 검증된 HTTPS/VPN은 저위험 경로 | 익명성·traffic hiding·Tor는 제공하지 않음 |

`node scripts/acceptance_p3.mjs`는 deterministic seed, 30초 단계 timeout,
Node heap 256MB, worker 1개, redacted 임시 artifact 정책으로 실행됩니다.
`--release`는 production UI build뿐 아니라 임시 Ed25519 키를 사용한 signed
public release gate도 실행합니다. 이 임시 키는 배포용 신뢰 키가 아니며, 실제
사용자는 별도 신뢰 채널의 운영 fingerprint를 확인해야 합니다.
운영 bootstrap·rotation·revocation과 redacted 수령 기록 형식은
[`reference/RELEASE_TRUST_OPERATIONS.md`](reference/RELEASE_TRUST_OPERATIONS.md)를
따릅니다. archive 내부의 공개키만으로는 신뢰하지 않습니다.

실제 브라우저·OS 조합을 검증하지 않은 상태에서 특정 Chrome, Safari, Firefox,
Windows, Linux를 지원한다고 말하지 않습니다. 현장 사람·다른 기기 테스트가
없어도 되는 자동 fixture와, 자동화할 수 없어 `blocked`인 독립성·운영 신뢰를
구분합니다.

현재 Mac의 설치·runtime 경계는 다음 명령으로만 판정합니다. 이 명령은 현재 host가
macOS arm64인지와 Node.js 20+인지 확인한 뒤, 격리된 임시 archive에서 설치·doctor·권한·
변조·update·rollback·키/버전/revocation 거부를 실행합니다. 이 결과를 다른 OS의
호환성 증거로 확대 해석하지 않습니다.

```sh
node scripts/acceptance_os_matrix.mjs --current-host
```

현재 판정의 원본은 [`reference/SUPPORT_MATRIX.json`](reference/SUPPORT_MATRIX.json)입니다.
Codex 내장 브라우저의 `verified-local`은 production UI, 보안 헤더, WASM 초기화,
IndexedDB 프로필 생성/잠금 해제, 초대·안전 문구·수동 핸드셰이크·암호화 메시지 왕복과
다중 탭 단일 세션 교체와 inline wipe까지를 뜻합니다. Service Worker 런타임 업데이트/캐시와
실제 vendor/OS 조합은 아직 검증되지 않았습니다. 관찰 상세는
[`reference/browser-evidence/codex-in-app-browser.json`](reference/browser-evidence/codex-in-app-browser.json)에
있으며, 이 파일에는 비밀값이나 원본 URL을 기록하지 않습니다.

매트릭스와 production 산출물 경계는 다음처럼 짧게 검사합니다.

```sh
node scripts/acceptance_browser_matrix.mjs --in-app-browser
node scripts/verify_support_matrix.mjs
```

## Recovery boundary

## 오류가 났을 때의 순서

| 화면의 분류 | 먼저 할 일 | 보안상 금지할 일 |
| --- | --- | --- |
| 암호 문구·프로필 | 암호 문구를 한 번 확인하고, 필요하면 profile 전용 백업을 준비합니다. | site data를 지우거나 기존 profile을 덮어쓰지 않습니다. |
| 저장소·IndexedDB·quota | 현재 화면을 잠그고 백업을 보존한 뒤 일반 브라우저 창과 저장 공간을 확인합니다. | 저장소 오류를 성공으로 간주하거나 백업 없이 재설정하지 않습니다. |
| 초대·identity·안전 문구 | 전송을 멈추고 별도 신뢰 채널에서 전체 문구와 새 초대를 비교합니다. | 화면·QR·클립보드만으로 확인하지 않습니다. |
| endpoint·relay·timeout | 서버·HTTPS·capability 상태를 확인하고, 실패하면 준비된 봉투를 수동 전달합니다. | capability·private UI URL을 지원 채널에 붙이지 않습니다. |
| backup·integrity·rollback | profile/session/transcript 포맷을 구분하고 원본을 보존합니다. | 변조·오래된 백업을 반복 import하거나 기존 자료를 덮어쓰지 않습니다. |

- If the peer server is unreachable, use the prepared outgoing envelope in the
  manual copy/paste flow; a failed automatic send is not recorded as delivered.
- After a server restart or endpoint change, create and exchange a fresh signed
  invite. Existing queued envelopes remain available only when the same data
  directory is retained.
- If an inbox capability is exposed, stop the server and start with a new data
  directory. Retain the old queue privately only as long as recovery requires.

## Incident response order

1. Stop the local server and do not reopen the private UI URL.
2. If an invite or capability may have leaked, move the old data directory aside
   and start a new one; do not publish the old queue or logs.
3. Treat a changed release hash, signing key fingerprint, browser bundle, or
   safety phrase as a stop condition. Do not send a message until a separately
   verified release and fresh pairing are available.
4. For a lost device, assume its unlocked browser profile and local data are
   compromised. Rotate invites and pair again from a clean device; a wipe button
   cannot prove secure deletion from a hostile operating system.
5. Report only redacted facts through the private security channel.

## Security reports

Use GitHub private vulnerability reporting when available. If it is
unavailable, publish only a minimal redacted request for a private contact
path. Do not include exploit details or sensitive material in a public issue.
For leaked capabilities, altered releases, CVEs, signing-key compromise, or
rollback decisions, follow
[`reference/INCIDENT_RESPONSE.md`](reference/INCIDENT_RESPONSE.md). A passing
automated test is not a security sign-off.

## Legacy macOS artifacts

The repository contains historical macOS installation notes and release
artifacts. They are not the current product distribution route and do not
represent web hosting, production readiness, or a security guarantee.
