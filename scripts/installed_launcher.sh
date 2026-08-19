#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -x "$SCRIPT_DIR/../bin/another-dimension-daemon" ]; then
  ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
else
  ROOT="$SCRIPT_DIR"
fi
DAEMON="$ROOT/bin/another-dimension-daemon"
RELAY="$ROOT/bin/another-dimension-relay"
DATA_DIR=${AD_DATA_DIR:-"$HOME/.local/share/another-dimension/data"}
DAEMON_DATA="$DATA_DIR/daemon"
RELAY_DATA="$DATA_DIR/relay"
DAEMON_PORT=${AD_DAEMON_PORT:-1420}
RELAY_PORT=${AD_RELAY_PORT:-1422}
RELAY_PIDFILE="$RELAY_DATA/relay.pid"
DAEMON_PIDFILE="$DAEMON_DATA/daemon.lock"

[ -x "$DAEMON" ] && [ -x "$RELAY" ] || { echo "설치가 손상되었습니다: Rust 실행 파일이 없습니다." >&2; exit 1; }
mkdir -p "$DAEMON_DATA" "$RELAY_DATA"
chmod 700 "$DATA_DIR" "$DAEMON_DATA" "$RELAY_DATA"

relay_pid_is_ours() {
  [ -f "$RELAY_PIDFILE" ] || return 1
  pid=$(cat "$RELAY_PIDFILE")
  case "$pid" in *[!0-9]*|"") return 1;; esac
  kill -0 "$pid" 2>/dev/null || return 1
  ps -p "$pid" -o command= 2>/dev/null | grep -F -- "$RELAY" >/dev/null
}

daemon_pid_is_ours() {
  [ -f "$DAEMON_PIDFILE" ] || return 1
  pid=$(sed -n 's/^pid=//p' "$DAEMON_PIDFILE")
  case "$pid" in *[!0-9]*|"") return 1;; esac
  kill -0 "$pid" 2>/dev/null || return 1
  ps -p "$pid" -o command= 2>/dev/null | grep -F -- "$DAEMON" >/dev/null
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
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    [ -r "$RELAY_DATA/inbox-capability" ] && curl -fsS "$RELAY_ORIGIN/api/v1/info" >/dev/null 2>&1 && break
    sleep 0.1
  done
  [ -r "$RELAY_DATA/inbox-capability" ] || {
    echo "Rust relay가 준비되기 전에 capability를 만들지 못했습니다." >&2
    exit 1
  }
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
  if daemon_pid_is_ours; then
    echo "Another Dimension이 이미 실행 중입니다. 열려 있는 Chromium 보안 대화 화면을 사용하세요."
    return 0
  fi
  prepare_local_relay
  if [ ! -f "$DAEMON_DATA/store.adstore" ] || [ ! -f "$DAEMON_DATA/store.adstore.revision" ] || [ ! -f "$DAEMON_DATA/profile.id" ]; then
    echo "처음 실행입니다. 브라우저에서 표시 이름을 입력하면 계정을 자동으로 준비합니다."
    "$DAEMON" setup \
      --data-dir "$DAEMON_DATA" \
      --port "$DAEMON_PORT" \
      --ui-dir "$ROOT/apps/web/dist" \
      --open
  fi
  shift
  "$DAEMON" serve \
    --data-dir "$DAEMON_DATA" \
    --port "$DAEMON_PORT" \
    --ui-dir "$ROOT/apps/web/dist" \
    --relay-origin "$RELAY_ORIGIN" \
    --inbox-url "$RELAY_ORIGIN/api/v1/inbox/$RELAY_CAPABILITY" \
    --relay-public-key "$RELAY_PUBLIC_KEY" \
    --relay-public-key-fingerprint "$RELAY_FINGERPRINT" \
    --keychain \
    --open "$@"
}

case "${1:-help}" in
  init)
    shift
    display_name=${1:-}
    if [ -z "$display_name" ]; then
      [ -r /dev/tty ] || { echo "표시 이름을 입력할 대화형 터미널이 필요합니다." >&2; exit 1; }
      printf '표시 이름: ' >/dev/tty
      IFS= read -r display_name </dev/tty
    else
      shift
    fi
    [ -n "$display_name" ] || { echo "표시 이름은 비워 둘 수 없습니다." >&2; exit 2; }
    [ "$#" -eq 0 ] || { echo "init에는 표시 이름만 입력하세요." >&2; exit 2; }
    passphrase_file="$DATA_DIR/profile-passphrase.txt"
    "$DAEMON" init --display-name "$display_name" --data-dir "$DAEMON_DATA" --passphrase-output "$passphrase_file"
    chmod 600 "$passphrase_file"
    echo "프로필 생성 완료. 이후에는 '$0 start'만 실행하면 됩니다."
    echo "복구용 암호문구: $passphrase_file"
    echo "이 파일을 Mac 밖의 암호화된 오프라인 매체에 옮겨 보관하세요." ;;
  start)
    if ! start_daemon "$@"; then
      echo "Another Dimension을 시작하지 못했습니다. '$0 doctor'로 상태를 확인하거나 운영자에게 문의하세요." >&2
      exit 1
    fi ;;
  status) "$DAEMON" status --data-dir "$DAEMON_DATA"; "$0" relay-status >/dev/null 2>&1 || true ;;
  stop) "$DAEMON" stop --data-dir "$DAEMON_DATA" 2>/dev/null || true; "$0" relay-stop >/dev/null 2>&1 || true ;;
  restart)
    "$DAEMON" stop --data-dir "$DAEMON_DATA" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      daemon_pid_is_ours || break
      sleep 0.1
    done
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
    echo "사용법: $0 {init|start|status|stop|restart|doctor|recovery-export FILE|recovery-import FILE|relay-start|relay-stop|relay-status|uninstall}" ;;
  *) echo "알 수 없는 명령입니다. $0 help" >&2; exit 2 ;;
esac
