#!/bin/sh
set -eu

# Installs a verified release packet. A public packet must contain runtime/node;
# source checkouts deliberately do not use this path.
usage() {
  cat <<'EOF'
사용법: install_local_server.sh --archive DIR --public-key PEM [--min-version VERSION]
  [--destination DIR] [--data-dir DIR]

DIR은 verify_public_release_gate.mjs가 통과한 release 디렉터리입니다.
공개 설치물은 DIR/runtime/node를 포함해야 하며 npm이나 별도 Node 설치를 요구하지 않습니다.
EOF
}

archive=
destination="${AD_INSTALL_DIR:-$HOME/.local/share/another-dimension/server}"
data_dir="${AD_DATA_DIR:-$HOME/.local/share/another-dimension/data}"
public_key=
min_version=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --archive) archive=${2:?--archive requires a directory}; shift 2 ;;
    --destination) destination=${2:?--destination requires a directory}; shift 2 ;;
    --data-dir) data_dir=${2:?--data-dir requires a directory}; shift 2 ;;
    --public-key) public_key=${2:?--public-key requires a file}; shift 2 ;;
    --min-version) min_version=${2:?--min-version requires a version}; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "알 수 없는 옵션: $1" >&2; usage >&2; exit 2 ;;
  esac
done
[ -n "$archive" ] || { usage >&2; exit 2; }
[ -n "$public_key" ] || { echo "공개 release 설치에는 --public-key가 필요합니다." >&2; usage >&2; exit 2; }
archive=$(CDPATH= cd -- "$archive" && pwd)
destination_parent=$(CDPATH= cd -- "$(dirname -- "$destination")" && pwd)
destination="$destination_parent/$(basename -- "$destination")"
case "$destination" in "$archive"|"$archive"/*) echo "설치 대상은 release 원본 안쪽일 수 없습니다." >&2; exit 2;; esac
if [ -e "$destination" ] || [ -L "$destination" ]; then
  echo "설치 대상이 이미 존재합니다. 기존 설치는 update 또는 rollback 명령으로 처리하세요: $destination" >&2
  exit 2
fi
if [ -e "$data_dir" ] || [ -L "$data_dir" ]; then
  [ -d "$data_dir" ] && [ ! -L "$data_dir" ] || { echo "data directory는 실제 디렉터리여야 합니다." >&2; exit 2; }
  data_dir=$(CDPATH= cd -- "$data_dir" && pwd)
else
  data_parent=$(CDPATH= cd -- "$(dirname -- "$data_dir")" && pwd)
  data_dir="$data_parent/$(basename -- "$data_dir")"
fi
case "$data_dir" in "$destination"|"$destination"/*) echo "data directory는 code installation 바깥이어야 합니다." >&2; exit 2;; esac

if [ ! -f "$archive/release-manifest.json" ]; then
  echo "release-manifest.json이 없어 설치를 중단했습니다." >&2; exit 1
fi
if [ ! -x "$archive/runtime/node" ]; then
  echo "이 release는 runtime/node를 포함하지 않습니다. 소스 개발 아카이브는 일반 사용자 설치물로 사용할 수 없습니다." >&2
  exit 1
fi
"$archive/runtime/node" -e 'const major=Number(process.versions.node.split(".")[0]); if (major < 20) { console.error(`bundled runtime must be Node.js 20 or newer (found ${process.version})`); process.exit(1); }'
if [ -n "$min_version" ]; then
  "$archive/runtime/node" "$archive/scripts/verify_public_release_gate.mjs" "$archive" --public-key "$public_key" --min-version "$min_version" >/dev/null
else
  "$archive/runtime/node" "$archive/scripts/verify_public_release_gate.mjs" "$archive" --public-key "$public_key" >/dev/null
fi

umask 077
mkdir -p "$data_dir"
chmod 700 "$data_dir"
stage=$(mktemp -d "$destination.staging.XXXXXX")
trap 'rm -rf "$stage"' EXIT INT TERM
for item in apps scripts README.md README.ko.md SECURITY.md SUPPORT.md RELEASE-PROVENANCE.json SBOM.cyclonedx.json release-manifest.json; do
  [ -e "$archive/$item" ] || continue
  mkdir -p "$stage/$(dirname "$item")"
  cp -RP "$archive/$item" "$stage/$item"
done
cp -P "$archive/runtime/node" "$stage/runtime-node"
chmod 700 "$stage/runtime-node"
"$stage/runtime-node" -e 'const fs=require("node:fs"); const [file,dataDir,distDir]=process.argv.slice(1); fs.writeFileSync(file, JSON.stringify({dataDir,distDir,serveStatic:true,bindHost:"127.0.0.1",port:1422})+"\n")' "$stage/server-config.json" "$data_dir" "$destination/apps/web/dist"
chmod 600 "$stage/server-config.json"
"$stage/runtime-node" -e 'const fs=require("node:fs"),crypto=require("node:crypto"); const [root,manifestFile,markerFile]=process.argv.slice(1); const m=JSON.parse(fs.readFileSync(manifestFile)); const h=crypto.createHash("sha256").update(fs.readFileSync(manifestFile)).digest("hex"); fs.writeFileSync(markerFile, JSON.stringify({format:"another-dimension-install",version:1,releaseVersion:m.releaseVersion,manifestSha256:h})+"\n")' "$stage" "$stage/release-manifest.json" "$stage/.another-dimension-install.json"
chmod 600 "$stage/.another-dimension-install.json"
"$stage/runtime-node" "$stage/scripts/verify_install_state.mjs" "$stage"
mv "$stage" "$destination"
trap - EXIT INT TERM
"$destination/runtime-node" "$destination/scripts/verify_install_state.mjs" "$destination"

cat > "$destination/another-dimension-server" <<'EOF'
#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PIDFILE="$ROOT/server.pid"
CONFIG="$ROOT/server-config.json"
verify() { "$ROOT/runtime-node" "$ROOT/scripts/verify_install_state.mjs" "$ROOT"; }
pid_is_ours() {
  [ -f "$PIDFILE" ] || return 1
  PID=$(cat "$PIDFILE")
  case "$PID" in *[!0-9]*|"") return 1;; esac
  kill -0 "$PID" 2>/dev/null || return 1
  ps -p "$PID" -o command= 2>/dev/null | grep -F -- "$ROOT/runtime-node" >/dev/null
}
data_dir() { "$ROOT/runtime-node" -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).dataDir)' "$CONFIG"; }
case "${1:-start}" in
  start)
    verify >/dev/null
    if [ -f "$PIDFILE" ]; then
      if pid_is_ours; then echo "already running pid=$(cat "$PIDFILE")"; exit 0; fi
      if kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then echo "PID file points to another process; refusing to start" >&2; exit 1; fi
      rm -f "$PIDFILE"
    fi
    umask 077
    nohup "$ROOT/runtime-node" "$ROOT/apps/server/server.mjs" --config "$CONFIG" >"$ROOT/server.log" 2>&1 &
    PID=$!; printf '%s\n' "$PID" >"$PIDFILE"; chmod 600 "$PIDFILE"
    sleep 0.2
    if ! pid_is_ours; then echo "server failed to start; inspect server.log without sharing it" >&2; rm -f "$PIDFILE"; exit 1; fi
    echo "started pid=$PID · data=$(data_dir)" ;;
  stop)
    if [ -f "$PIDFILE" ]; then
      if pid_is_ours; then kill "$(cat "$PIDFILE")" 2>/dev/null || true; for _ in 1 2 3 4 5 6 7 8 9 10; do pid_is_ours || break; sleep 0.1; done; fi
      rm -f "$PIDFILE"
    fi; echo "stopped" ;;
  restart) "$0" stop; "$0" start ;;
  open-ui)
    URL_FILE="$(data_dir)/local-ui-url"
    if [ ! -r "$URL_FILE" ]; then echo "private UI URL is not available; start the server first" >&2; exit 1; fi
    URL=$(cat "$URL_FILE")
    if command -v open >/dev/null 2>&1; then open "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
    else echo "브라우저에서 다음 private UI URL을 여세요: $URL"; fi ;;
  status)
    verify >/dev/null
    if pid_is_ours; then echo "running pid=$(cat "$PIDFILE") · data=$(data_dir)"; else echo "stopped · data=$(data_dir)"; exit 1; fi ;;
  doctor) verify; node_info=$("$ROOT/runtime-node" -e 'const fs=require("node:fs"),crypto=require("node:crypto"),p=process.argv[1]; console.log(`runtime sha256=${crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")}`)' "$ROOT/runtime-node"); echo "$node_info · high-risk=disabled" ;;
  update) shift; exec sh "$ROOT/scripts/update_local_server.sh" --install-root "$ROOT" "$@" ;;
  rollback) exec sh "$ROOT/scripts/update_local_server.sh" --install-root "$ROOT" --rollback ;;
  uninstall)
    verify >/dev/null; "$0" stop; case "$ROOT" in /|"$HOME"|"$HOME"/|*..*) echo "unsafe installation path; refusing uninstall" >&2; exit 1;; esac
    rm -rf "$ROOT"; echo "server installation removed; data directory retained" ;;
  *) echo "사용법: $0 {start|open-ui|stop|restart|status|doctor|update|rollback|uninstall}" >&2; exit 2 ;;
esac
EOF
chmod 700 "$destination/another-dimension-server"
"$destination/runtime-node" "$destination/scripts/verify_install_state.mjs" "$destination"
echo "설치 완료: $destination/another-dimension-server"
echo "데이터 보존 위치(자동 삭제하지 않음): $data_dir"
