#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CONFIG="$ROOT/server-config.json"
RELAY_PIDFILE="$ROOT/relay.pid"

verify() { "$ROOT/runtime-node" "$ROOT/scripts/verify_install_state.mjs" "$ROOT"; }
config_value() {
  "$ROOT/runtime-node" -e 'const c=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")); const v=c[process.argv[2]]; if (v === undefined) process.exit(2); process.stdout.write(String(v))' "$CONFIG" "$1"
}
daemon_data() { config_value daemonDataDir; }
relay_data() { config_value relayDataDir; }
daemon_port() { config_value daemonPort; }
ui_dir() { config_value distDir; }

prompt_secret() {
  label=$1
  [ -r /dev/tty ] || { echo "$label 입력에는 대화형 터미널이 필요합니다." >&2; exit 1; }
  printf '%s' "$label: " >/dev/tty
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
  RELAY_PID=$(cat "$RELAY_PIDFILE")
  case "$RELAY_PID" in *[!0-9]*|"") return 1;; esac
  kill -0 "$RELAY_PID" 2>/dev/null || return 1
  ps -p "$RELAY_PID" -o command= 2>/dev/null | grep -F -- "$ROOT/apps/server/server.mjs" >/dev/null
}

case "${1:-help}" in
  init)
    shift
    display_name=${1:-}
    [ -n "$display_name" ] || { echo "사용법: $0 init '표시 이름'" >&2; exit 2; }
    shift
    passphrase_output=
    if [ "${1:-}" = "--passphrase-output" ]; then
      [ -n "${2:-}" ] || { echo "사용법: $0 init '표시 이름' [--passphrase-output FILE]" >&2; exit 2; }
      passphrase_output=$2
      shift 2
    fi
    [ "$#" -eq 0 ] || { echo "사용법: $0 init '표시 이름' [--passphrase-output FILE]" >&2; exit 2; }
    verify >/dev/null
    if [ -n "$passphrase_output" ]; then
      "$ROOT/bin/another-dimension-daemon" init --display-name "$display_name" --data-dir "$(daemon_data)" --passphrase-output "$passphrase_output"
    else
      "$ROOT/bin/another-dimension-daemon" init --display-name "$display_name" --data-dir "$(daemon_data)"
    fi ;;
  start)
    shift
    verify >/dev/null
    prompt_secret "프로필 암호문구"
    printf '%s' "$SECRET" | "$ROOT/bin/another-dimension-daemon" serve --data-dir "$(daemon_data)" --port "$(daemon_port)" --ui-dir "$(ui_dir)" --open "$@"
    unset SECRET ;;
  status)
    verify >/dev/null
    "$ROOT/bin/another-dimension-daemon" status --data-dir "$(daemon_data)" ;;
  stop)
    "$ROOT/bin/another-dimension-daemon" stop --data-dir "$(daemon_data)" ;;
  restart)
    shift
    "$ROOT/bin/another-dimension-daemon" stop --data-dir "$(daemon_data)"
    verify >/dev/null
    prompt_secret "프로필 암호문구"
    printf '%s' "$SECRET" | "$ROOT/bin/another-dimension-daemon" serve --data-dir "$(daemon_data)" --port "$(daemon_port)" --ui-dir "$(ui_dir)" --open "$@"
    unset SECRET ;;
  doctor)
    verify
    "$ROOT/bin/another-dimension-daemon" doctor --data-dir "$(daemon_data)" ;;
  recovery-export)
    [ -n "${2:-}" ] || { echo "사용법: $0 recovery-export FILE" >&2; exit 2; }
    "$ROOT/bin/another-dimension-daemon" recovery export --data-dir "$(daemon_data)" --output "$2" ;;
  recovery-import)
    [ -n "${2:-}" ] || { echo "사용법: $0 recovery-import FILE" >&2; exit 2; }
    "$ROOT/bin/another-dimension-daemon" recovery import --data-dir "$(daemon_data)" --input "$2" ;;
  relay-start)
    verify >/dev/null
    if relay_pid_is_ours; then echo "relay already running pid=$(cat "$RELAY_PIDFILE")"; exit 0; fi
    if [ -f "$RELAY_PIDFILE" ]; then
      stale_pid=$(cat "$RELAY_PIDFILE")
      case "$stale_pid" in *[!0-9]*|"") rm -f "$RELAY_PIDFILE";;
        *) if kill -0 "$stale_pid" 2>/dev/null; then echo "relay PID file points to another process; refusing to start" >&2; exit 1; else rm -f "$RELAY_PIDFILE"; fi;;
      esac
    fi
    umask 077
    # server-config.json carries launcher-only fields (daemonDataDir,
    # relayDataDir, daemonPort). The relay server rejects unknown fields, so
    # derive a server-only config for the relay process.
    "$ROOT/runtime-node" -e 'const fs=require("node:fs"); const [file,dest]=process.argv.slice(1); const c=JSON.parse(fs.readFileSync(file,"utf8")); const allowed=new Set(["bindHost","port","dataDir","distDir","serveStatic","publicUrl","corsOrigins","trustProxy","ttlMs","tlsKeyFile","tlsCertFile","production"]); const serverConfig={}; for (const key of allowed) if (c[key] !== undefined) serverConfig[key]=c[key]; fs.writeFileSync(dest, JSON.stringify(serverConfig)+"\n")' "$CONFIG" "$ROOT/relay-server-config.json"
    chmod 600 "$ROOT/relay-server-config.json"
    nohup "$ROOT/runtime-node" "$ROOT/apps/server/server.mjs" --config "$ROOT/relay-server-config.json" >"$ROOT/relay.log" 2>&1 &
    RELAY_PID=$!; printf '%s\n' "$RELAY_PID" >"$RELAY_PIDFILE"; chmod 600 "$RELAY_PIDFILE"
    sleep 0.2
    relay_pid_is_ours || { echo "relay 시작 실패; relay.log를 외부에 공유하지 말고 확인하세요." >&2; rm -f "$RELAY_PIDFILE"; exit 1; }
    echo "relay started pid=$RELAY_PID · data=$(relay_data)" ;;
  relay-stop)
    if relay_pid_is_ours; then kill "$(cat "$RELAY_PIDFILE")" 2>/dev/null || true; fi
    rm -f "$RELAY_PIDFILE"; echo "relay stopped" ;;
  relay-status)
    if relay_pid_is_ours; then echo "relay running pid=$(cat "$RELAY_PIDFILE") · data=$(relay_data)"; else echo "relay stopped · data=$(relay_data)"; exit 1; fi ;;
  relay-backup)
    [ -n "${2:-}" ] || { echo "사용법: $0 relay-backup FILE (암호문구는 stdin)" >&2; exit 2; }
    relay_pid_is_ours && { echo "백업 전 relay-stop을 실행하세요." >&2; exit 1; }
    exec "$ROOT/runtime-node" "$ROOT/scripts/relay_backup.mjs" backup --data-dir "$(relay_data)" --file "$2" ;;
  relay-restore)
    [ -n "${2:-}" ] || { echo "사용법: $0 relay-restore FILE (암호문구는 stdin)" >&2; exit 2; }
    relay_pid_is_ours && { echo "복원 전 relay-stop을 실행하세요." >&2; exit 1; }
    exec "$ROOT/runtime-node" "$ROOT/scripts/relay_backup.mjs" restore --data-dir "$(relay_data)" --file "$2" ;;
  update) shift; exec sh "$ROOT/scripts/update_local_server.sh" --install-root "$ROOT" "$@" ;;
  rollback) exec sh "$ROOT/scripts/update_local_server.sh" --install-root "$ROOT" --rollback ;;
  uninstall)
    verify >/dev/null
    "$0" relay-stop >/dev/null 2>&1 || true
    case "$ROOT" in /|"$HOME"|"$HOME"/|*..*) echo "unsafe installation path; refusing uninstall" >&2; exit 1;; esac
    daemon_data=$(daemon_data)
    relay_data=$(relay_data)
    echo "다음을 삭제합니다: $ROOT (설치 코드·실행 파일)"
    echo "다음은 삭제하지 않습니다: $daemon_data (daemon 프로필), $relay_data (relay 데이터)"
    rm -rf "$ROOT"
    echo "설치 코드와 실행 파일만 제거했습니다. daemon/relay 데이터는 보존됩니다." ;;
  help|-h|--help)
    echo "사용법: $0 {init DISPLAY_NAME [--passphrase-output FILE]|start|status|stop|restart|doctor|recovery-export|recovery-import|relay-start|relay-stop|relay-status|relay-backup|relay-restore|update|rollback|uninstall}" ;;
  *) echo "알 수 없는 명령입니다. $0 help" >&2; exit 2 ;;
esac
