#!/bin/sh
set -eu

usage() {
  echo "사용법: verify_macos_app.sh APP_PATH [--require-signed] [--require-notarized]" >&2
  exit 2
}

[ "$#" -ge 1 ] || usage
APP=$1
shift
REQUIRE_SIGNED=0
REQUIRE_NOTARIZED=0
for option in "$@"; do
  case "$option" in
    --require-signed) REQUIRE_SIGNED=1;;
    --require-notarized) REQUIRE_NOTARIZED=1;;
    *) usage;;
  esac
done
[ -d "$APP" ] || { echo "앱 bundle이 없습니다: $APP" >&2; exit 1; }
[ "${APP##*.}" = "app" ] || { echo ".app bundle이 필요합니다: $APP" >&2; exit 1; }

BIN="$APP/Contents/MacOS/Another Dimension"
INFO="$APP/Contents/Info.plist"
RESOURCES="$APP/Contents/Resources"
[ -x "$RESOURCES/bin/another-dimension-daemon" ] || { echo "daemon 실행 파일이 없습니다." >&2; exit 1; }
[ -x "$RESOURCES/bin/another-dimension-relay" ] || { echo "relay 실행 파일이 없습니다." >&2; exit 1; }
[ -x "$RESOURCES/bin/another-dimension-tools" ] || { echo "tools 실행 파일이 없습니다." >&2; exit 1; }
[ -x "$BIN" ] || { echo "앱 실행 파일이 없습니다." >&2; exit 1; }
[ -f "$INFO" ] || { echo "Info.plist가 없습니다." >&2; exit 1; }
[ -d "$RESOURCES/bin" ] && [ -d "$RESOURCES/apps/web" ] || {
  echo "필수 Resources가 없습니다." >&2
  exit 1
}

command -v file >/dev/null 2>&1 || { echo "file 명령이 필요합니다." >&2; exit 1; }
command -v plutil >/dev/null 2>&1 || { echo "plutil 명령이 필요합니다." >&2; exit 1; }

for RUNTIME in daemon relay tools; do
  case "$RUNTIME" in
    daemon) RUNTIME_BIN="$RESOURCES/bin/another-dimension-daemon" ;;
    relay) RUNTIME_BIN="$RESOURCES/bin/another-dimension-relay" ;;
    tools) RUNTIME_BIN="$RESOURCES/bin/another-dimension-tools" ;;
  esac
  ARCHITECTURE=$(file -b "$RUNTIME_BIN")
  case "$ARCHITECTURE" in
    *arm64*) ;;
    *) echo "Apple Silicon arm64 실행 파일이 아닙니다: $RUNTIME_BIN ($ARCHITECTURE)" >&2; exit 1;;
  esac
done

BUNDLE_ID=$(plutil -extract CFBundleIdentifier raw -o - "$INFO" 2>/dev/null || true)
[ "$BUNDLE_ID" = "chat.another-dimension.local" ] || {
  echo "예상하지 않은 bundle identifier입니다." >&2
  exit 1
}

if find "$APP" \( \
  -name target -o -name .build-cache -o -name .vite -o \
  -name '*.pem' -o -name '*.key' -o -name '*.passphrase' -o -name '*.log' -o \
  -name '*.sqlite' -o -name '*.adstore' -o -name '*.adrecovery' \
\) -print -quit | grep . >/dev/null 2>&1; then
  echo "개발 산출물 또는 민감 파일이 app bundle에 포함되어 있습니다." >&2
  exit 1
fi

if [ "$REQUIRE_SIGNED" -eq 1 ] || [ "$REQUIRE_NOTARIZED" -eq 1 ]; then
  command -v codesign >/dev/null 2>&1 || { echo "codesign 명령이 필요합니다." >&2; exit 1; }
  codesign --verify --deep --strict "$APP" >/dev/null 2>&1 || {
    echo "요구된 코드 서명 검증에 실패했습니다." >&2
    exit 1
  }
fi

if [ "$REQUIRE_NOTARIZED" -eq 1 ]; then
  command -v spctl >/dev/null 2>&1 || { echo "spctl 명령이 필요합니다." >&2; exit 1; }
  spctl --assess --type execute --verbose=2 "$APP" >/dev/null 2>&1 || {
    echo "요구된 macOS Gatekeeper/notarization 검증에 실패했습니다." >&2
    exit 1
  }
  echo "macOS app verification passed: arm64, signed, Gatekeeper-accepted, clean bundle"
elif [ "$REQUIRE_SIGNED" -eq 1 ]; then
  echo "macOS app verification passed: arm64, signed, clean bundle"
else
  echo "macOS app verification passed: arm64, clean bundle (signature not asserted)"
fi
