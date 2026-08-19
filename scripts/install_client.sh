#!/bin/sh
set -eu

usage() { echo "사용법: install_client.sh --archive DIR --destination DIR --public-key PEM --trust-manifest JSON --trust-manifest-key PEM" >&2; exit 2; }
archive= destination= public_key= trust_manifest= trust_manifest_key=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --archive) archive=${2:?}; shift 2;;
    --destination) destination=${2:?}; shift 2;;
    --public-key) public_key=${2:?}; shift 2;;
    --trust-manifest) trust_manifest=${2:?}; shift 2;;
    --trust-manifest-key) trust_manifest_key=${2:?}; shift 2;;
    *) usage;;
  esac
done
[ -n "$archive" ] && [ -n "$destination" ] && [ -n "$public_key" ] && [ -n "$trust_manifest" ] && [ -n "$trust_manifest_key" ] || usage
[ -x "$archive/bin/another-dimension-daemon" ] || { echo "client daemon이 없습니다." >&2; exit 1; }
[ -d "$archive/apps/web/dist" ] || { echo "client web UI가 없습니다." >&2; exit 1; }
"$archive/bin/another-dimension-daemon" verify-client-release --root "$archive" --public-key "$public_key" --trust-manifest "$trust_manifest" --trust-manifest-key "$trust_manifest_key"
[ ! -e "$destination" ] || { echo "설치 대상이 이미 존재합니다." >&2; exit 1; }
umask 077
mkdir -p "$(dirname "$destination")"
cp -R "$archive" "$destination"
chmod 700 "$destination" "$destination/bin/another-dimension-daemon" "$destination/scripts/client_launcher.sh"
echo "client 설치 완료: $destination"
echo "주의: 이 client-only package는 relay 설정이 사전에 제공된 경우에만 대화할 수 있습니다."
echo "일반 사용자에게는 relay가 포함된 통합 배포본을 전달하세요."
