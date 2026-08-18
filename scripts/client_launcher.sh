#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DAEMON="$ROOT/bin/another-dimension-daemon"
DATA_DIR=${AD_CLIENT_DATA_DIR:-"$HOME/.local/share/another-dimension/client-data"}
UI_DIR="$ROOT/apps/web/dist"
usage() { echo "사용법: $0 {init|start|status|stop|doctor|recovery-export|recovery-import}" >&2; exit 2; }
[ -x "$DAEMON" ] || { echo "client daemon이 없습니다." >&2; exit 1; }
mkdir -p "$DATA_DIR"; chmod 700 "$DATA_DIR"
case "${1:-help}" in
  init) shift; display_name=${1:-}; [ -n "$display_name" ] || usage; shift; [ "$#" -eq 0 ] || usage; "$DAEMON" init --display-name "$display_name" --data-dir "$DATA_DIR" ;;
  start)
    shift; [ -d "$UI_DIR" ] || { echo "웹 UI가 없습니다." >&2; exit 1; }
    printf '프로필 암호문구: ' >&2; stty -echo; IFS= read -r secret; stty echo; printf '\n' >&2
    printf '%s' "$secret" | "$DAEMON" serve --data-dir "$DATA_DIR" --ui-dir "$UI_DIR" --open "$@"; unset secret ;;
  status) "$DAEMON" status --data-dir "$DATA_DIR" ;;
  stop) "$DAEMON" stop --data-dir "$DATA_DIR" ;;
  doctor) "$DAEMON" doctor --data-dir "$DATA_DIR" ;;
  recovery-export) [ -n "${2:-}" ] || usage; "$DAEMON" recovery export --data-dir "$DATA_DIR" --output "$2" ;;
  recovery-import) [ -n "${2:-}" ] || usage; "$DAEMON" recovery import --data-dir "$DATA_DIR" --input "$2" ;;
  help|-h|--help) usage ;;
  *) usage ;;
esac
