# Another Dimension Chat

[![Verify](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml/badge.svg)](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml)
[![Release](https://img.shields.io/badge/release-unsigned%20macOS%20beta-orange)](https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned)
[![Status](https://img.shields.io/badge/status-not%20production--ready-red)](SECURITY.md)

[English](README.md) | 한국어

Another Dimension Chat은 **중앙에서 신뢰해야 하는 서버가 없는** 고위험 1:1
메신저 방향을 실험하는 초기 Rust/Tauri 프로토타입입니다.

이 프로젝트는 일반적인 "서버 없는 채팅" 데모가 아닙니다. v0.1 기본 범위에서는
전화번호, 이메일, 글로벌 계정, 검색 가능한 사용자 이름, 중앙 연락처 검색,
중앙 메시지 서버, 푸시 알림, 클라우드 백업을 의도적으로 제외합니다.

현재 공개 빌드는 **서명되지 않은 실험적 macOS Apple Silicon 베타**입니다.
notarization을 받지 않았고, 외부 감사를 완료하지 않았으며, production-ready가
아닙니다. 민감한 실제 커뮤니케이션에는 사용하지 마세요.

![Another Dimension Chat first-run beta screen](reference/screenshots/macos-public-beta-first-run-desktop.png)

공개용 screenshot 목록은 [reference/screenshots/README.md](reference/screenshots/README.md)에
있습니다. private room data가 보이는 screenshot은 올리지 말고, 다른 앱 이미지를
게시하기 전에는 [reference/PUBLIC_SCREENSHOT_CHECKLIST.md](reference/PUBLIC_SCREENSHOT_CHECKLIST.md)를
확인하세요.

## 다운로드

현재 공개 앱 파일은 아래 GitHub Release에 첨부되어 있습니다.

<https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>

같은 release에서 아래 두 파일을 모두 받으세요.

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256`

DMG를 열기 전에 checksum을 확인하세요.

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

예상 SHA-256:

```text
7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a
```

이 빌드는 서명되지 않았기 때문에 macOS가 실행을 막을 수 있습니다. DMG를 열고
앱 실행을 한 번 시도한 뒤, checksum이 일치할 때만 시스템 설정 > 개인정보 보호
및 보안에서 차단된 앱을 허용하세요. 설치 단계로 터미널에서 quarantine을 제거하는
명령은 사용하지 마세요.

자세한 설치 문서: [reference/UNSIGNED_PUBLIC_BETA_INSTALL.md](reference/UNSIGNED_PUBLIC_BETA_INSTALL.md)

## 지금 테스트할 수 있는 것

v0.1 공개 베타는 현재 제품 경계와 로컬 desktop 흐름을 검토하기 위한 빌드입니다.

- 로컬 profile 생성 및 unlock
- invite-code room 생성 또는 참가
- room을 신뢰하기 전 safety material 비교
- 로컬 암호화 profile/session/message store 흐름 확인
- 수동 encrypted envelope export/import
- pending envelope 흐름 retry, cancel, recovery
- conversation, session, profile, app-owned data를 명시적 destructive action으로 삭제
- public support용 redacted diagnostics 복사
- 앱 시작 시 network/onion 작업이 자동으로 시작되지 않는지 확인

이 베타의 실용적인 기본 transport는 **수동 encrypted envelope exchange**입니다.
onion/Tor 경로는 기본 경로와 분리된 고위험 advanced 경로이며, 사용자의 명시적
액션 뒤에만 시도되고 실패 시 닫힌 상태로 멈춥니다. 이 베타는 real-network onion
delivery의 신뢰성을 claim하지 않습니다.

High-Risk Mode는 threat-model target일 뿐 보편적 안전 보장이 아닙니다. compromised
endpoint, coercion, full global traffic correlation은 보호하지 않으며, audited security,
production readiness, Briar/Cwtch equivalence, reliable external onion delivery,
sensitive-use safety를 claim하지 않습니다.

![Manual encrypted envelope flow](reference/screenshots/macos-public-beta-manual-envelope-desktop.png)

### 로컬 데이터 lifecycle

desktop beta는 로컬 destructive action을 분리합니다.

- conversation delete는 local message record를 제거하고 session record는 유지합니다.
- session delete는 local session resume record를 제거하고 message record는 유지합니다.
- profile delete는 정확한 local profile name 입력 후 해당 profile store를 제거합니다.
- full local wipe는 `WIPE LOCAL DATA` 입력 후 app-owned local data를 제거합니다.

이 기능들은 cloud backup recovery, cloud sync, rollback prevention, storage media
수준의 secure deletion을 제공하지 않습니다.

## 현재 제공하지 않는 것

이 저장소는 현재 secure messenger를 제공하지 않습니다.

현재 베타는 아래를 claim하지 않습니다.

- production secure messaging
- 감사 완료 또는 production-ready E2EE
- 민감한 커뮤니케이션에 대한 안전성
- reliable external Tor/onion delivery
- Briar/Cwtch와 동등한 privacy 또는 security
- bridge 또는 censorship-circumvention readiness
- Windows, Android, iOS 공개 release artifact
- signing, notarization, auto-update, reproducible build, supply-chain audit 완료 상태
- endpoint compromise, coercion, malicious contact, global traffic correlation 방어

전체 public security boundary는 [SECURITY.md](SECURITY.md)를 보세요.

## Source gate

- Desktop-only v0.1 acceptance matrix와 desktop local-private-flow acceptance blockers는
  `scripts/public_release_readiness_preflight.sh`에서 확인합니다.
- 현재 unsigned packet은 `scripts/prepare_unsigned_public_beta_release.sh`가 허용한
  pinned public-release source DMG 기준입니다. build channel `beta-onion`, commit
  `e8954df9`, SHA-256 `7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a`.
- 이 상태는 packaging readiness, audit readiness, release go signal이 아닙니다.
- production claim 제거는
  [reference/PRODUCTION_READINESS_CLAIM_GATE.md](reference/PRODUCTION_READINESS_CLAIM_GATE.md)와
  [reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md](reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md)가
  충족될 때까지 막혀 있습니다.

## 프로젝트 방향

핵심 원칙은 보안에 민감한 동작을 얇은 UI shell이 아니라 Rust core가 소유한다는
것입니다.

```text
crates/
  identity/    pairwise identity and contact types
  pairing/     pairing payloads and safety transcript logic
  crypto/      cryptographic boundary code and test fixtures
  protocol/    message envelopes, replay windows, and retention rules
  transport/   fail-closed transport policy, onion/runtime boundaries
  storage/     encrypted local storage and lifecycle policy boundary
  core/        profile, pairing, messaging, and orchestration

apps/
  cli/              development and boundary-check CLI
  desktop-tauri/    macOS desktop beta shell
  mobile/           source-only mobile shell candidates
```

UI shell은 redacted status를 요청하거나 사용자가 명시적으로 실행한 action을 호출할
수 있습니다. 별도의 protocol, storage, transport, pairing, contact discovery,
account, push notification, cloud backup semantics를 UI shell에서 새로 정의하면
안 됩니다.

## 현재 플랫폼 상태

| Platform | Status |
| --- | --- |
| macOS Apple Silicon | 현재 공개된 unsigned experimental public beta DMG |
| macOS Intel / Universal | claim 없음; 별도 artifact 작업 필요 |
| Windows | local build candidate only; 공개 artifact/installer 없음 |
| Android | source shell candidate only; APK/AAB/public artifact 없음 |
| iOS | source shell candidate only; IPA/TestFlight/App Store artifact 없음 |

Signing, notarization, app-store approval, SmartScreen reputation, Google Play,
TestFlight, APNs, FCM, iCloud, cloud backup은 나중에 distribution ergonomics에
영향을 줄 수 있습니다. 하지만 이 프로젝트 방향에서는 그런 요소들을 messenger의
trusted security boundary로 보지 않습니다.

## 소스에서 빌드

필요한 것:

- Rust stable toolchain
- `rustfmt`
- full verification용 `clippy`
- desktop Tauri shell용 Node.js 및 npm

Rust component 설치:

```bash
rustup component add rustfmt clippy
```

가벼운 repository verification:

```bash
scripts/verify_all.sh
```

위험한 cross-cutting 변경 전 heavy local engineering pass:

```bash
scripts/verify_full.sh
```

desktop dependency 설치:

```bash
cd apps/desktop-tauri
npm ci --workspaces=false
```

frontend preview 로컬 실행:

```bash
npm run dev
```

manual onion attempt feature를 compile한 local Tauri beta shell 실행:

```bash
npm run tauri:dev:beta-onion
```

local-only Tauri desktop artifact 빌드:

```bash
npm run tauri:build
```

이 generic local build output은 public release upload artifact가 아닙니다.

## CLI Boundary Check

기본 CLI 빌드는 boundary check만 노출합니다. 여기서 "production"은 deploy 가능한
보안 제품이 아니라 non-`dev-insecure` 기본 빌드 경계를 뜻합니다.

```bash
cargo run -q -- production self-test
cargo run -q -- production preflight
```

개발용 prototype command는 `dev-insecure` feature가 필요하며 실제 커뮤니케이션에
사용하면 안 됩니다.

```bash
cargo run -q --features dev-insecure -- demo local
scripts/demo_dev_cli.sh
scripts/smoke_dev_cli.sh
```

`dev-insecure` 빌드는 경고를 출력하며 실제 메시지에 사용하면 안 됩니다.

## Release Discipline

DMG의 release authority는 같은 GitHub Release에 첨부된 asset set입니다. `main`
branch에는 release 이후 문서나 소스 변경이 들어갈 수 있으므로, 다운로드한 앱
artifact를 branch file이나 GitHub source archive로 검증하지 마세요.

maintainer-only 공개 베타 staging command:

```bash
scripts/public_release_readiness_preflight.sh
scripts/prepare_unsigned_public_beta_release.sh
```

생성되는 release folder는 ignored 상태이며 commit하면 안 됩니다.

- `apps/desktop-tauri/beta-artifacts/`
- `apps/desktop-tauri/public-release/`

`docs/`, app data, bridge line, onion endpoint, invite code,
pairing/envelope/endpoint payload, safety phrase, plaintext message,
passphrase, private key, key material, raw log, crash dump, private room data가
보이는 screenshot, `target/`, `dist/`, `node_modules/`, generated beta artifact는
공개하거나 commit하지 마세요.

## Public Support

public issue는 redacted support report에만 사용하세요. broad failure class,
checksum result, platform, app version/build channel, recovery next action,
앱에서 복사한 diagnostics만 포함하세요.

raw log, local path, endpoint, invite code, payload, message text, passphrase,
private key, key material, private screenshot, private planning note를 공개
issue에 올리면 안 됩니다.

민감한 security report는 가능하면 GitHub private vulnerability reporting을
사용하세요. 사용할 수 없다면 exploit detail 없이 최소한의 public security-contact
request만 여세요.

[SUPPORT.md](SUPPORT.md)와 [reference/PUBLIC_INTAKE_POLICY.md](reference/PUBLIC_INTAKE_POLICY.md)를 참고하세요.

## Engineering Notes

공유용 public beta 소개글은 [blog/00-public-beta-launch.md](blog/00-public-beta-launch.md)에
있습니다. 왜 이 프로젝트를 만들었고 어떻게 설계했는지는 public-safe engineering
notes인 [blog/](blog/)에 정리되어 있습니다.

짧은 소개 문구:

> Another Dimension Chat은 중앙에서 신뢰해야 하는 계정/연락처 검색/메시지 서버 없이
> pairwise invite, safety material 비교, 수동 encrypted envelope exchange, local data
> ownership, redacted diagnostics를 실험하는 macOS Apple Silicon용 unsigned public
> beta입니다. 현재 공개 artifact는 GitHub Release의 unsigned macOS DMG이며,
> checksum 확인과 macOS Privacy & Security 수동 허용이 필요합니다.

이 프로젝트에 사용된 보안, 통신, 저장소, transport, release 개념을 초보자도
따라올 수 있게 설명한 guide는 [reference/learning/](reference/learning/)에
정리되어 있습니다.

public roadmap 및 boundary 문서:

- [reference/ROADMAP.md](reference/ROADMAP.md)
- [reference/PUBLIC_THREAT_MODEL.md](reference/PUBLIC_THREAT_MODEL.md)
- [reference/PRIVACY_MODEL_COMPARISON.md](reference/PRIVACY_MODEL_COMPARISON.md)
- [reference/COMPONENT_BOUNDARIES.md](reference/COMPONENT_BOUNDARIES.md)
- [reference/PRODUCTION_READINESS_CLAIM_GATE.md](reference/PRODUCTION_READINESS_CLAIM_GATE.md)
- [reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md](reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md)
- [reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md](reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md)
- [reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md](reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md)

production readiness claim gate가 실제 evidence로 충족되기 전까지는 beta,
non-production, non-audited, sensitive-use-prohibited 문구를 유지해야 합니다.

## Contributing

public issue나 pull request를 열기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)를
읽어 주세요.

요약:

- no-central-trusted-server 제품 방향 유지
- fake/development behavior는 `dev-insecure` 뒤에 유지
- private planning note는 public change에 포함하지 않기
- v0.1 기본값으로 central account, contact discovery, central relay, push
  notification dependency, telemetry, crash upload, auto-update, cloud backup을 추가하지 않기
- public docs는 실제 구현 evidence와 non-claim에 맞게 유지하기

## License

이 저장소는 현재 Rust workspace metadata에서 `UNLICENSED`로 표시되어 있습니다.
