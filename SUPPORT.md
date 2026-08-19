# 지원 범위

현재 목표 지원 범위는 Apple Silicon macOS와 Chromium 계열 브라우저입니다.

## 실행 구성

- Rust daemon과 Rust relay 바이너리
- daemon이 제공하는 loopback 브라우저 UI
- 정적 UI와 Rust release tools
- Node.js/npm/별도 서버 런타임 없음

## 확인 명령

```sh
scripts/verify_light.sh
scripts/verify_full.sh --release
```

이 명령은 소스·빌드 경계와 Rust relay release 경로를 확인하지만, 다른 OS,
다른 브라우저, 독립 보안 감사 또는 고위험 사용 승인을 의미하지 않습니다.

relay 운영자는 IP, 시각, 빈도와 크기 메타데이터를 볼 수 있습니다. 익명성이나
검열 저항성은 제공하지 않습니다.

## 설치 후 기본 흐름

서명된 server archive를 검증한 뒤 `another-dimension` launcher 하나만 사용합니다.
launcher는 daemon과 Rust relay를 함께 관리하며 Node.js/npm을 실행하지 않습니다.

```sh
another-dimension init "내 표시 이름"
another-dimension start
another-dimension status
another-dimension doctor
another-dimension stop
```

`init`은 운영체제 난수로 프로필 암호문구를 생성합니다. 화면에 표시된 값을
owner-only 오프라인 파일이나 별도 보안 매체에 보관하고, `start`가 요구할 때
stdin으로 입력합니다. 암호문구를 명령행 인자·로그·지원 요청에 넣지 않습니다.

복구와 삭제는 다음처럼 수행합니다.

```sh
another-dimension recovery-export /Volumes/OFFLINE/profile.adrecovery
another-dimension recovery-import /Volumes/OFFLINE/profile.adrecovery
another-dimension restart
another-dimension uninstall
```

복구 import는 다음 시작 때 적용하도록 예약하며 현재 저장소를 즉시 덮어쓰지
않습니다. `uninstall`은 실행 파일만 제거하고 데이터 디렉터리는 보존합니다.
데이터까지 폐기하려면 먼저 필요한 복구 백업을 만들고, 표시된 데이터 경로를
확인한 뒤 별도 명시 명령으로 삭제합니다. 포트 충돌은 기존 프로세스를 임의로
종료하지 않고 오류로 중단하므로 `status`와 `relay-status`로 원인을 확인합니다.
