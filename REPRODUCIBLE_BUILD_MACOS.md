# macOS 재현 빌드 메모

현재 제품은 Tauri 앱이 아니라 Rust daemon, 정적 웹 UI, Node relay로 구성됩니다.

## 고정해야 하는 입력

- source commit
- `Cargo.lock`
- `apps/web/package-lock.json`
- `apps/server/package-lock.json`
- Rust toolchain과 macOS/Xcode Command Line Tools 버전
- Node.js 20 runtime 버전
- `AD_RELEASE_SOURCE_DATE_EPOCH`

## 빌드

```sh
CARGO_BUILD_JOBS=2 cargo build -p another-dimension-daemon --release --locked
npm ci --prefix apps/web --workspaces=false
npm ci --prefix apps/server --workspaces=false
npm --prefix apps/web run build --workspaces=false
```

완성 아카이브는 daemon binary와 Node runtime을 명시적으로 전달해 생성합니다.

```sh
AD_DAEMON_BINARY="$PWD/.build-cache/cargo-target/release/another-dimension-daemon" \
AD_NODE_RUNTIME="$(command -v node)" \
AD_RELEASE_SOURCE_DATE_EPOCH=0 \
scripts/build_release.sh
```

## 현재 비보장

이 절차는 입력을 고정하고 manifest·SBOM·provenance를 생성하지만 서로 다른 Mac에서
byte-for-byte 동일한 daemon binary가 나온다는 증거는 아닙니다. 공개 배포 승인은
별도의 clean-builder 비교, signing key 신뢰 경로, 서명 검증이 필요합니다.
