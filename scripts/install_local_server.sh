#!/bin/sh
set -eu

usage() {
  cat <<'EOF'
사용법: install_local_server.sh --archive DIR --public-key PEM [--destination DIR] [--data-dir DIR]

Rust release 디렉터리의 서명과 파일 목록을 확인한 뒤 설치합니다.
Node.js/npm/runtime 디렉터리는 요구하지 않습니다.
EOF
}

archive=
destination="${AD_INSTALL_DIR:-$HOME/.local/share/another-dimension/server}"
data_dir="${AD_DATA_DIR:-$HOME/.local/share/another-dimension/data}"
public_key=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --archive) archive=${2:?--archive requires a directory}; shift 2 ;;
    --destination) destination=${2:?--destination requires a directory}; shift 2 ;;
    --data-dir) data_dir=${2:?--data-dir requires a directory}; shift 2 ;;
    --public-key) public_key=${2:?--public-key requires a file}; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "알 수 없는 옵션: $1" >&2; usage >&2; exit 2 ;;
  esac
done
[ -n "$archive" ] || { usage >&2; exit 2; }
[ -n "$public_key" ] || { echo "--public-key가 필요합니다." >&2; exit 2; }
archive=$(CDPATH= cd -- "$archive" && pwd)
mkdir -p "$(dirname -- "$destination")"
destination_parent=$(CDPATH= cd -- "$(dirname -- "$destination")" && pwd)
destination="$destination_parent/$(basename -- "$destination")"
case "$destination" in "$archive"|"$archive"/*) echo "설치 대상은 release 원본 안쪽일 수 없습니다." >&2; exit 2;; esac
[ ! -e "$destination" ] && [ ! -L "$destination" ] || { echo "설치 대상이 이미 존재합니다: $destination" >&2; exit 2; }

TOOLS="$archive/bin/another-dimension-tools"
[ -x "$TOOLS" ] || { echo "Rust release 도구가 없습니다: $TOOLS" >&2; exit 1; }
[ -x "$archive/bin/another-dimension-daemon" ] || { echo "daemon 바이너리가 없습니다." >&2; exit 1; }
[ -x "$archive/bin/another-dimension-relay" ] || { echo "relay 바이너리가 없습니다." >&2; exit 1; }
"$TOOLS" release-manifest verify --root "$archive" --public-key "$public_key"
"$TOOLS" release-manifest hygiene --root "$archive"

umask 077
stage=$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-install.XXXXXX")
trap 'rm -rf "$stage"' EXIT INT TERM
mkdir -p "$stage"
cp -RP "$archive"/. "$stage"/
chmod 700 "$stage/bin" "$stage/scripts"
chmod 700 "$stage/bin/another-dimension-daemon" "$stage/bin/another-dimension-relay" "$stage/bin/another-dimension-tools"
mkdir -p "$data_dir"
chmod 700 "$data_dir"
cp "$stage/scripts/installed_launcher.sh" "$stage/another-dimension"
chmod 700 "$stage/another-dimension"
mv "$stage" "$destination"
trap - EXIT INT TERM
echo "설치 완료: $destination/another-dimension"
echo "데이터 위치(자동 삭제하지 않음): $data_dir"
