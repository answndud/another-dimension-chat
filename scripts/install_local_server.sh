#!/bin/sh
set -eu

# Installs a verified release packet. A public packet must contain runtime/node;
# source checkouts deliberately do not use this path.
usage() {
  cat <<'EOF'
사용법: install_local_server.sh --archive DIR --public-key PEM --trust-manifest JSON --trust-manifest-key PEM --review-bundle DIR --review-signoff JSON --reviewer-public-key PEM [--min-version VERSION]
  [--destination DIR] [--data-dir DIR]

DIR은 verify_public_release_gate.mjs가 통과한 release 디렉터리입니다.
공개 설치물은 DIR/runtime/node를 포함해야 하며 npm이나 별도 Node 설치를 요구하지 않습니다.
EOF
}

archive=
destination="${AD_INSTALL_DIR:-$HOME/.local/share/another-dimension/server}"
data_dir="${AD_DATA_DIR:-$HOME/.local/share/another-dimension/data}"
public_key=
trust_manifest=
trust_manifest_key=
review_bundle=
review_signoff=
reviewer_public_key=
min_version=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --archive) archive=${2:?--archive requires a directory}; shift 2 ;;
    --destination) destination=${2:?--destination requires a directory}; shift 2 ;;
    --data-dir) data_dir=${2:?--data-dir requires a directory}; shift 2 ;;
    --public-key) public_key=${2:?--public-key requires a file}; shift 2 ;;
    --trust-manifest) trust_manifest=${2:?--trust-manifest requires a file}; shift 2 ;;
    --trust-manifest-key) trust_manifest_key=${2:?--trust-manifest-key requires a file}; shift 2 ;;
    --review-bundle) review_bundle=${2:?--review-bundle requires a directory}; shift 2 ;;
    --review-signoff) review_signoff=${2:?--review-signoff requires a file}; shift 2 ;;
    --reviewer-public-key) reviewer_public_key=${2:?--reviewer-public-key requires a file}; shift 2 ;;
    --min-version) min_version=${2:?--min-version requires a version}; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "알 수 없는 옵션: $1" >&2; usage >&2; exit 2 ;;
  esac
done
[ -n "$archive" ] || { usage >&2; exit 2; }
[ -n "$public_key" ] || { echo "공개 release 설치에는 --public-key가 필요합니다." >&2; usage >&2; exit 2; }
[ -n "$trust_manifest" ] && [ -n "$trust_manifest_key" ] || { echo "공개 release 설치에는 --trust-manifest와 --trust-manifest-key가 모두 필요합니다." >&2; usage >&2; exit 2; }
[ -n "$review_bundle" ] && [ -n "$review_signoff" ] && [ -n "$reviewer_public_key" ] || { echo "공개 release 설치에는 review bundle, 독립 보안 검토 sign-off와 reviewer public key가 모두 필요합니다." >&2; usage >&2; exit 2; }
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
  "$archive/runtime/node" "$archive/scripts/verify_public_release_gate.mjs" "$archive" --public-key "$public_key" --trust-manifest "$trust_manifest" --trust-manifest-key "$trust_manifest_key" --review-bundle "$review_bundle" --review-signoff "$review_signoff" --reviewer-public-key "$reviewer_public_key" --min-version "$min_version" >/dev/null
else
  "$archive/runtime/node" "$archive/scripts/verify_public_release_gate.mjs" "$archive" --public-key "$public_key" --trust-manifest "$trust_manifest" --trust-manifest-key "$trust_manifest_key" --review-bundle "$review_bundle" --review-signoff "$review_signoff" --reviewer-public-key "$reviewer_public_key" >/dev/null
fi

umask 077
mkdir -p "$data_dir"
chmod 700 "$data_dir"
stage=$(mktemp -d "$destination.staging.XXXXXX")
trap 'rm -rf "$stage"' EXIT INT TERM
for item in apps bin scripts README.md README.ko.md SECURITY.md SUPPORT.md RELEASE-PROVENANCE.json SBOM.cyclonedx.json release-manifest.json; do
  [ -e "$archive/$item" ] || continue
  mkdir -p "$stage/$(dirname "$item")"
  cp -RP "$archive/$item" "$stage/$item"
done
cp -P "$archive/runtime/node" "$stage/runtime-node"
chmod 700 "$stage/runtime-node"
"$stage/runtime-node" -e 'const fs=require("node:fs"),path=require("node:path"); const [file,dataRoot,distDir]=process.argv.slice(1); fs.writeFileSync(file, JSON.stringify({daemonDataDir:path.join(dataRoot,"daemon"),relayDataDir:path.join(dataRoot,"relay"),dataDir:path.join(dataRoot,"relay"),distDir,serveStatic:false,bindHost:"127.0.0.1",daemonPort:1420,port:1422})+"\n")' "$stage/server-config.json" "$data_dir" "$destination/apps/web/dist"
chmod 600 "$stage/server-config.json"
"$stage/runtime-node" -e 'const fs=require("node:fs"),crypto=require("node:crypto"); const [root,manifestFile,markerFile]=process.argv.slice(1); const m=JSON.parse(fs.readFileSync(manifestFile)); const h=crypto.createHash("sha256").update(fs.readFileSync(manifestFile)).digest("hex"); fs.writeFileSync(markerFile, JSON.stringify({format:"another-dimension-install",version:1,releaseVersion:m.releaseVersion,manifestSha256:h})+"\n")' "$stage" "$stage/release-manifest.json" "$stage/.another-dimension-install.json"
chmod 600 "$stage/.another-dimension-install.json"
cp "$stage/scripts/installed_launcher.sh" "$stage/another-dimension"
chmod 700 "$stage/another-dimension"
"$stage/runtime-node" "$stage/scripts/verify_install_state.mjs" "$stage"
mv "$stage" "$destination"
trap - EXIT INT TERM
"$destination/runtime-node" "$destination/scripts/verify_install_state.mjs" "$destination"

"$destination/runtime-node" "$destination/scripts/verify_install_state.mjs" "$destination"
echo "설치 완료: $destination/another-dimension"
echo "데이터 보존 위치(자동 삭제하지 않음): $data_dir"
