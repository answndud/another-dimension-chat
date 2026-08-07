#!/bin/sh
set -eu

usage() {
  cat <<'EOF'
사용법:
  update_local_server.sh --install-root DIR --archive DIR --public-key PEM --trust-manifest JSON --trust-manifest-key PEM [--min-version VERSION] [--stop]
  update_local_server.sh --install-root DIR --rollback

실행 중인 서버를 자동으로 끄지 않습니다. update에서 --stop을 명시해야 합니다.
data directory는 설치 교체와 분리되어 보존됩니다.
EOF
}

install_root=
archive=
public_key=
trust_manifest=
trust_manifest_key=
min_version=
rollback=0
allow_stop=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --install-root) install_root=${2:?--install-root requires a directory}; shift 2 ;;
    --archive) archive=${2:?--archive requires a directory}; shift 2 ;;
    --public-key) public_key=${2:?--public-key requires a file}; shift 2 ;;
    --trust-manifest) trust_manifest=${2:?--trust-manifest requires a file}; shift 2 ;;
    --trust-manifest-key) trust_manifest_key=${2:?--trust-manifest-key requires a file}; shift 2 ;;
    --min-version) min_version=${2:?--min-version requires a version}; shift 2 ;;
    --rollback) rollback=1; shift ;;
    --stop) allow_stop=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "알 수 없는 옵션: $1" >&2; usage >&2; exit 2 ;;
  esac
done
[ -n "$install_root" ] || { usage >&2; exit 2; }
install_root=$(CDPATH= cd -- "$install_root" && pwd)
verify() { "$install_root/runtime-node" "$install_root/scripts/verify_install_state.mjs" "$install_root" >/dev/null; }
is_running() {
  daemon_data=$("$install_root/runtime-node" -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).daemonDataDir)' "$install_root/server-config.json")
  daemon_status=$("$install_root/bin/another-dimension-daemon" status --data-dir "$daemon_data" 2>/dev/null || true)
  printf '%s\n' "$daemon_status" | grep -Fq "daemon status: running" && return 0
  [ -f "$install_root/relay.pid" ] || return 1
  relay_pid=$(cat "$install_root/relay.pid")
  case "$relay_pid" in *[!0-9]*|"") return 1;; esac
  kill -0 "$relay_pid" 2>/dev/null
}

if [ "$rollback" -eq 1 ]; then
  verify
  previous="${install_root}.previous"
  [ -d "$previous" ] || { echo "검증된 이전 설치가 없어 rollback할 수 없습니다." >&2; exit 1; }
  if is_running; then echo "서버가 실행 중입니다. rollback 전에 stop을 실행하세요." >&2; exit 1; fi
  "$install_root/runtime-node" "$previous/scripts/verify_install_state.mjs" "$previous" >/dev/null
  failed="${install_root}.rollback-failed.$$.keep"
  mv "$install_root" "$failed"
  if mv "$previous" "$install_root" && verify; then
    echo "rollback 완료: $("$install_root/runtime-node" -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).releaseVersion)' "$install_root/.another-dimension-install.json")"
    echo "이전 설치는 복구를 위해 보존되었습니다: $failed"
    exit 0
  fi
  mv "$install_root" "$previous" 2>/dev/null || true
  mv "$failed" "$install_root" 2>/dev/null || true
  echo "rollback 검증에 실패하여 현재 설치를 유지했습니다." >&2
  exit 1
fi

[ -n "$archive" ] || { echo "update에는 --archive가 필요합니다." >&2; usage >&2; exit 2; }
[ -n "$public_key" ] || { echo "update에는 --public-key가 필요합니다." >&2; usage >&2; exit 2; }
[ -n "$trust_manifest" ] && [ -n "$trust_manifest_key" ] || { echo "update에는 --trust-manifest와 --trust-manifest-key가 모두 필요합니다." >&2; usage >&2; exit 2; }
verify
if is_running; then
  [ "$allow_stop" -eq 1 ] || { echo "서버가 실행 중입니다. --stop을 명시해야 atomic update를 진행합니다." >&2; exit 1; }
  "$install_root/another-dimension" stop >/dev/null 2>&1 || true
  "$install_root/another-dimension" relay-stop >/dev/null 2>&1 || true
fi
data_dir=$("$install_root/runtime-node" -e 'const path=require("node:path"),c=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")); console.log(path.dirname(c.daemonDataDir))' "$install_root/server-config.json")
parent=$(CDPATH= cd -- "$(dirname -- "$install_root")" && pwd)
stage="$parent/$(basename -- "$install_root").new.$$"
previous="$parent/$(basename -- "$install_root").previous"
failed="$parent/$(basename -- "$install_root").update-failed.$$.keep"
if [ -e "$stage" ] || [ -L "$stage" ]; then echo "staging 경로가 이미 존재하여 중단했습니다: $stage" >&2; exit 1; fi
if [ -e "$previous" ] || [ -L "$previous" ]; then
  "$install_root/runtime-node" "$previous/scripts/verify_install_state.mjs" "$previous" >/dev/null || { echo "기존 previous 설치가 손상되어 update를 중단했습니다." >&2; exit 1; }
  mv "$previous" "${previous}.$(date +%s).keep"
fi

if [ -n "$min_version" ]; then
  sh "$install_root/scripts/install_local_server.sh" --archive "$archive" --public-key "$public_key" --trust-manifest "$trust_manifest" --trust-manifest-key "$trust_manifest_key" --destination "$stage" --data-dir "$data_dir" --min-version "$min_version"
else
  sh "$install_root/scripts/install_local_server.sh" --archive "$archive" --public-key "$public_key" --trust-manifest "$trust_manifest" --trust-manifest-key "$trust_manifest_key" --destination "$stage" --data-dir "$data_dir"
fi
if ! "$stage/runtime-node" "$stage/scripts/verify_install_state.mjs" "$stage" >/dev/null; then
  echo "새 release staging 검증에 실패했습니다. 기존 설치는 변경되지 않았습니다." >&2
  rm -rf "$stage"
  exit 1
fi
mv "$install_root" "$previous"
if mv "$stage" "$install_root"; then
  "$install_root/runtime-node" -e 'const fs=require("node:fs"),path=require("node:path"); const [file,root]=process.argv.slice(1); const config=JSON.parse(fs.readFileSync(file,"utf8")); config.distDir=path.join(root,"apps/web/dist"); fs.writeFileSync(file, JSON.stringify(config)+"\n")' "$install_root/server-config.json" "$install_root"
fi
if [ -d "$install_root" ] && verify; then
  echo "atomic update 완료: $install_root"
  echo "rollback 가능 백업: $previous"
  exit 0
fi
mv "$install_root" "$failed" 2>/dev/null || true
mv "$previous" "$install_root" 2>/dev/null || true
echo "update 후 검증에 실패하여 이전 설치로 복구했습니다. 실패 release는 보존되었습니다: $failed" >&2
exit 1
