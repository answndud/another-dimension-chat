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
case "$destination" in "$archive"|"$archive"/*) echo "설치 대상은 release 원본 안쪽일 수 없습니다." >&2; exit 2;; esac

if [ ! -f "$archive/release-manifest.json" ]; then
  echo "release-manifest.json이 없어 설치를 중단했습니다." >&2; exit 1
fi
if [ ! -x "$archive/runtime/node" ]; then
  echo "이 release는 runtime/node를 포함하지 않습니다. 소스 개발 아카이브는 일반 사용자 설치물로 사용할 수 없습니다." >&2
  exit 1
fi
verify_args="--require-signature --public-key $public_key"
[ -n "$min_version" ] && verify_args="$verify_args --min-version $min_version"
# shellcheck disable=SC2086
"$archive/runtime/node" "$archive/scripts/verify_release_manifest.mjs" "$archive" $verify_args >/dev/null

umask 077
mkdir -p "$destination" "$data_dir"
chmod 700 "$destination" "$data_dir"
for item in apps scripts README.md README.ko.md SECURITY.md SUPPORT.md RELEASE-PROVENANCE.json SBOM.cyclonedx.json release-manifest.json; do
  [ -e "$archive/$item" ] || continue
  mkdir -p "$destination/$(dirname "$item")"
  cp -R "$archive/$item" "$destination/$item"
done
cp "$archive/runtime/node" "$destination/runtime-node"
chmod 700 "$destination/runtime-node"
cat > "$destination/server-config.json" <<EOF
{"dataDir":"$data_dir","bindHost":"127.0.0.1","port":1422}
EOF
chmod 600 "$destination/server-config.json"

cat > "$destination/another-dimension-server" <<EOF
#!/bin/sh
set -eu
ROOT=\$(CDPATH= cd -- "\$(dirname -- "\$0")" && pwd)
PIDFILE="\$ROOT/server.pid"
CONFIG="\$ROOT/server-config.json"
case "\${1:-start}" in
  start)
    if [ -f "\$PIDFILE" ] && kill -0 "\$(cat "\$PIDFILE")" 2>/dev/null; then echo "already running"; exit 0; fi
    nohup "\$ROOT/runtime-node" "\$ROOT/apps/server/server.mjs" --config "\$CONFIG" >"\$ROOT/server.log" 2>&1 &
    echo \$! >"\$PIDFILE"; chmod 600 "\$PIDFILE"; echo "started" ;;
  stop)
    if [ -f "\$PIDFILE" ]; then kill "\$(cat "\$PIDFILE")" 2>/dev/null || true; rm -f "\$PIDFILE"; fi; echo "stopped" ;;
  restart) "\$0" stop; "\$0" start ;;
  status)
    if [ -f "\$PIDFILE" ] && kill -0 "\$(cat "\$PIDFILE")" 2>/dev/null; then echo "running pid=\$(cat "\$PIDFILE")"; else echo "stopped"; exit 1; fi ;;
  uninstall) "\$0" stop; rm -rf "\$ROOT"; echo "server installation removed; data directory retained: $data_dir" ;;
  *) echo "사용법: \$0 {start|stop|restart|status|uninstall}" >&2; exit 2 ;;
esac
EOF
chmod 700 "$destination/another-dimension-server"
echo "설치 완료: $destination/another-dimension-server"
echo "데이터 보존 위치(자동 삭제하지 않음): $data_dir"
