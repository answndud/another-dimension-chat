#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DAEMON="$ROOT/bin/another-dimension-daemon"
RELAY="$ROOT/bin/another-dimension-relay"
DATA_DIR=${AD_DATA_DIR:-"$HOME/.local/share/another-dimension/data"}
DAEMON_DATA="$DATA_DIR/daemon"
RELAY_DATA="$DATA_DIR/relay"
DAEMON_PORT=${AD_DAEMON_PORT:-1420}
RELAY_PORT=${AD_RELAY_PORT:-1422}
RELAY_PIDFILE="$RELAY_DATA/relay.pid"

[ -x "$DAEMON" ] && [ -x "$RELAY" ] || { echo "설치가 손상되었습니다: Rust 실행 파일이 없습니다." >&2; exit 1; }
mkdir -p "$DAEMON_DATA" "$RELAY_DATA"
chmod 700 "$DATA_DIR" "$DAEMON_DATA" "$RELAY_DATA"

prompt_secret() {
  [ -r /dev/tty ] || { echo "대화형 터미널이 필요합니다." >&2; exit 1; }
  printf '%s: ' "$1" >/dev/tty
  stty -echo </dev/tty
  trap 'stty echo </dev/tty 2>/dev/null || true' EXIT INT TERM
  IFS= read -r SECRET </dev/tty
  stty echo </dev/tty
  trap - EXIT INT TERM
  printf '\n' >/dev/tty
  [ -n "$SECRET" ] || { echo "빈 암호문구는 사용할 수 없습니다." >&2; exit 1; }
}

relay_pid_is_ours() {
  [ -f "$RELAY_PIDFILE" ] || return 1
  pid=$(cat "$RELAY_PIDFILE")
  case "$pid" in *[!0-9]*|"") return 1;; esac
  kill -0 "$pid" 2>/dev/null || return 1
  ps -p "$pid" -o command= 2>/dev/null | grep -F -- "$RELAY" >/dev/null
}

start_relay() {
  if relay_pid_is_ours; then echo "relay already running pid=$(cat "$RELAY_PIDFILE")"; return; fi
  rm -f "$RELAY_PIDFILE"
  umask 077
  AD_RELAY_BIND_HOST=${AD_RELAY_BIND_HOST:-127.0.0.1} \
  AD_RELAY_PORT="$RELAY_PORT" \
  AD_RELAY_DATA_DIR="$RELAY_DATA" \
  nohup "$RELAY" >"$RELAY_DATA/relay.log" 2>&1 &
  pid=$!
  printf '%s\n' "$pid" >"$RELAY_PIDFILE"
  chmod 600 "$RELAY_PIDFILE"
  sleep 0.2
  relay_pid_is_ours || { echo "Rust relay 시작 실패; relay.log를 확인하세요." >&2; rm -f "$RELAY_PIDFILE"; exit 1; }
  echo "relay started pid=$pid · http://127.0.0.1:$RELAY_PORT"
}

prepare_local_relay() {
  start_relay >/dev/null
  RELAY_ORIGIN="http://127.0.0.1:$RELAY_PORT"
  RELAY_CAPABILITY=$(tr -d '\r\n' < "$RELAY_DATA/inbox-capability")
  RELAY_INFO=$(curl -fsS "$RELAY_ORIGIN/api/v1/info") || {
    echo "Rust relay info를 읽지 못했습니다." >&2
    exit 1
  }
  RELAY_PUBLIC_KEY=$(printf '%s' "$RELAY_INFO" | sed -n 's/.*"relayReceiptPublicKey":"\([0-9a-f]\{64\}\)".*/\1/p')
  RELAY_FINGERPRINT=$(printf '%s' "$RELAY_INFO" | sed -n 's/.*"relayReceiptPublicKeyFingerprint":"\([0-9a-f]\{64\}\)".*/\1/p')
  [ "${#RELAY_CAPABILITY}" -eq 43 ] && [ "${#RELAY_PUBLIC_KEY}" -eq 64 ] && [ "${#RELAY_FINGERPRINT}" -eq 64 ] || {
    echo "relay info 형식이 올바르지 않습니다." >&2
    exit 1
  }
}

start_daemon() {
  prepare_local_relay
  shift
  prompt_secret "프로필 암호문구"
  printf '%s' "$SECRET" | "$DAEMON" serve \
    --data-dir "$DAEMON_DATA" \
    --port "$DAEMON_PORT" \
    --ui-dir "$ROOT/apps/web/dist" \
    --relay-origin "$RELAY_ORIGIN" \
    --inbox-url "$RELAY_ORIGIN/api/v1/inbox/$RELAY_CAPABILITY" \
    --relay-public-key "$RELAY_PUBLIC_KEY" \
    --relay-public-key-fingerprint "$RELAY_FINGERPRINT" \
    --open "$@"
  unset SECRET
}

case "${1:-help}" in
  init)
    shift
    display_name=${1:-}
    [ -n "$display_name" ] || { echo "사용법: $0 init '표시 이름' [--passphrase-output FILE]" >&2; exit 2; }
    shift
    if [ "${1:-}" = "--passphrase-output" ]; then
      [ -n "${2:-}" ] || { echo "암호문구 파일 경로가 필요합니다." >&2; exit 2; }
      "$DAEMON" init --display-name "$display_name" --data-dir "$DAEMON_DATA" --passphrase-output "$2"
      shift 2
    else
      "$DAEMON" init --display-name "$display_name" --data-dir "$DAEMON_DATA"
    fi
    [ "$#" -eq 0 ] || { echo "알 수 없는 init 옵션입니다." >&2; exit 2; } ;;
  start)
    start_daemon "$@" ;;
  status) "$DAEMON" status --data-dir "$DAEMON_DATA"; "$0" relay-status >/dev/null 2>&1 || true ;;
  stop) "$DAEMON" stop --data-dir "$DAEMON_DATA" 2>/dev/null || true; "$0" relay-stop >/dev/null 2>&1 || true ;;
  restart)
    "$DAEMON" stop --data-dir "$DAEMON_DATA" 2>/dev/null || true
    "$0" relay-stop >/dev/null 2>&1 || true
    start_daemon "$@" ;;
  doctor) "$DAEMON" doctor --data-dir "$DAEMON_DATA" ;;
  recovery-export) [ -n "${2:-}" ] || { echo "사용법: $0 recovery-export FILE" >&2; exit 2; }; "$DAEMON" recovery export --data-dir "$DAEMON_DATA" --output "$2" ;;
  recovery-import) [ -n "${2:-}" ] || { echo "사용법: $0 recovery-import FILE" >&2; exit 2; }; "$DAEMON" recovery import --data-dir "$DAEMON_DATA" --input "$2" ;;
  relay-start) start_relay ;;
  relay-stop)
    if relay_pid_is_ours; then kill "$(cat "$RELAY_PIDFILE")" 2>/dev/null || true; fi
    rm -f "$RELAY_PIDFILE"; echo "relay stopped" ;;
  relay-status)
    if relay_pid_is_ours; then echo "relay running pid=$(cat "$RELAY_PIDFILE")"; else echo "relay stopped"; exit 1; fi ;;
  uninstall)
    "$0" relay-stop >/dev/null 2>&1 || true
    case "$ROOT" in /|"$HOME"|"$HOME"/|*..*) echo "unsafe installation path; refusing uninstall" >&2; exit 1;; esac
    echo "설치 코드와 실행 파일만 삭제합니다. 데이터는 보존됩니다: $DATA_DIR"
    rm -rf "$ROOT" ;;
  help|-h|--help)
    echo "사용법: $0 {init DISPLAY_NAME|start|status|stop|restart|doctor|recovery-export FILE|recovery-import FILE|relay-start|relay-stop|relay-status|uninstall}" ;;
  *) echo "알 수 없는 명령입니다. $0 help" >&2; exit 2 ;;
esac
