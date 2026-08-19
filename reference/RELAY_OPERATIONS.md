# Rust relay 운영

릴레이는 `apps/relay`의 Rust 바이너리 하나로 실행합니다. Node.js, npm, 별도
런타임 또는 JavaScript 서버 코드는 필요하지 않습니다.

## 시작

```sh
export AD_RELAY_BIND_HOST=127.0.0.1
export AD_RELAY_PORT=1422
export AD_RELAY_DATA_DIR="$HOME/.local/share/another-dimension/data/relay"
cargo run --release --locked --offline -p another-dimension-relay
```

배포본에서는 `bin/another-dimension-relay`를 직접 실행합니다. 기본 바인딩은
loopback이며, 고위험 익명성·트래픽 은닉·메타데이터 보호를 주장하지 않습니다.

## 데이터와 제한

- 암호문 inbox, invite-code, receipt signing key, blob만 relay 데이터 디렉터리에 저장
- receipt signing key 파일은 생성 시 owner-only 권한
- inbox는 TTL·개수·봉투 크기 제한을 적용
- blob은 capability와 청크 offset을 확인하고 제한된 크기만 저장
- relay는 평문 메시지와 개인키를 처리하지 않음

## 확인

```sh
curl -fsS http://127.0.0.1:1422/api/v1/health
```

운영자가 볼 수 있는 IP, 시각, 빈도와 크기 메타데이터는 제거되지 않습니다.
실제 고위험 통신 승인이나 독립 보안 검토를 이 문서가 대신하지 않습니다.
