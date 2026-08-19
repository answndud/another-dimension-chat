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
