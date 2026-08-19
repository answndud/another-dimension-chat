#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DAEMON="$ROOT/bin/another-dimension-daemon"
DATA_DIR=${AD_CLIENT_DATA_DIR:-"$HOME/.local/share/another-dimension/client-data"}
UI_DIR="$ROOT/apps/web/dist"
PASSPHRASE_FILE=${AD_CLIENT_PASSPHRASE_FILE:-"$HOME/Library/Application Support/Another Dimension/profile-passphrase.txt"}
usage() { echo "사용법: $0 {init|start|status|stop|doctor|recovery-export|recovery-import}" >&2; exit 2; }
[ -x "$DAEMON" ] || { echo "client daemon이 없습니다." >&2; exit 1; }
mkdir -p "$DATA_DIR"; chmod 700 "$DATA_DIR"
prompt_display_name() {
  if [ -n "${1:-}" ]; then printf '%s' "$1"; return; fi
  [ -r /dev/tty ] || { echo "표시 이름을 입력할 대화형 터미널이 필요합니다." >&2; exit 1; }
  printf '표시 이름: ' >/dev/tty
  IFS= read -r value </dev/tty
  [ -n "$value" ] || { echo "표시 이름은 비워 둘 수 없습니다." >&2; exit 1; }
  printf '%s' "$value"
}
case "${1:-help}" in
  init)
    shift
    display_name=$(prompt_display_name "${1:-}")
    [ "$#" -le 1 ] || usage
    mkdir -p "$(dirname "$PASSPHRASE_FILE")"
    umask 077
    "$DAEMON" init --display-name "$display_name" --data-dir "$DATA_DIR" --passphrase-output "$PASSPHRASE_FILE"
    chmod 600 "$PASSPHRASE_FILE"
    echo "프로필 생성 완료."
    echo "복구용 암호문구: $PASSPHRASE_FILE"
    echo "이 파일을 Mac 밖의 암호화된 오프라인 매체에 옮겨 보관하세요." ;;
  start)
    shift; [ -d "$UI_DIR" ] || { echo "웹 UI가 없습니다. 운영자에게 설치 상태를 확인해 달라고 요청하세요." >&2; exit 1; }
    if ! "$DAEMON" serve --data-dir "$DATA_DIR" --ui-dir "$UI_DIR" --keychain --open "$@"; then
      echo "client를 시작하지 못했습니다. 이 client package는 relay 설정이 사전에 제공된 경우에만 대화할 수 있습니다." >&2
      echo "relay를 직접 입력하지 말고 통합 배포본을 운영자에게 요청하세요." >&2
      exit 1
    fi ;;
  status) "$DAEMON" status --data-dir "$DATA_DIR" ;;
  stop) "$DAEMON" stop --data-dir "$DATA_DIR" ;;
  doctor) "$DAEMON" doctor --data-dir "$DATA_DIR" ;;
  recovery-export) [ -n "${2:-}" ] || usage; "$DAEMON" recovery export --data-dir "$DATA_DIR" --output "$2" ;;
  recovery-import) [ -n "${2:-}" ] || usage; "$DAEMON" recovery import --data-dir "$DATA_DIR" --input "$2" ;;
  help|-h|--help)
    echo "Another Dimension Chat client"
    echo "사용법: $0 {init|start|status|stop|doctor|recovery-export|recovery-import}"
    echo "일반 사용자는 통합 배포본 launcher를 사용하세요. client-only package는 운영자용입니다." >&2
    exit 0 ;;
  *) usage ;;
esac
