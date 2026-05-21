#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

write_dry_run_signature() {
  local checksums_file="$1"
  local signature_file="$2"

  printf 'dryrun-sha256:%s\n' "$(sha256_file "$checksums_file")" >"$signature_file"
}

verify_dry_run_release_dir() {
  local release_dir="$1"
  local checksums_file="$release_dir/SHA256SUMS"
  local signature_file="$release_dir/SHA256SUMS.dryrun-signature"

  [[ -f "$checksums_file" ]] || return 1
  [[ -f "$signature_file" ]] || return 1

  local expected_signature
  expected_signature="dryrun-sha256:$(sha256_file "$checksums_file")"
  [[ "$(cat "$signature_file")" = "$expected_signature" ]] || return 1

  local signed_paths
  signed_paths="$(mktemp)"
  awk '{print $2}' "$checksums_file" | sort >"$signed_paths"

  while read -r expected_hash artifact_name; do
    [[ -n "$expected_hash" ]] || return 1
    [[ -n "$artifact_name" ]] || return 1

    case "$artifact_name" in
      /* | *..* | *" "* | "")
        echo "invalid artifact path in dry-run checksum file: $artifact_name" >&2
        return 1
        ;;
    esac

    local artifact_path="$release_dir/$artifact_name"
    [[ -f "$artifact_path" ]] || return 1
    [[ "$(sha256_file "$artifact_path")" = "$expected_hash" ]] || return 1
  done <"$checksums_file"

  local present_paths
  present_paths="$(mktemp)"
  find "$release_dir" -type f \
    ! -name 'SHA256SUMS' \
    ! -name 'SHA256SUMS.dryrun-signature' \
    -exec basename {} \; | sort >"$present_paths"

  cmp -s "$signed_paths" "$present_paths" || return 1
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "dry-run release verification unexpectedly accepted: $name" >&2
    return 1
  fi
}

grep -q 'dry-run release using disposable test keys' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'missing signatures, stale checksums, stale detached signature markers, and unsigned artifacts' \
  "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_release="$tmp_root/valid"
mkdir -p "$valid_release"
printf 'another-dimension dry-run artifact\n' >"$valid_release/another-dimension-test-artifact.txt"
(
  cd "$valid_release"
  printf '%s  %s\n' \
    "$(sha256_file another-dimension-test-artifact.txt)" \
    'another-dimension-test-artifact.txt' >SHA256SUMS
)
write_dry_run_signature "$valid_release/SHA256SUMS" "$valid_release/SHA256SUMS.dryrun-signature"
verify_dry_run_release_dir "$valid_release"

missing_signature="$tmp_root/missing-signature"
cp -R "$valid_release" "$missing_signature"
rm "$missing_signature/SHA256SUMS.dryrun-signature"
expect_rejects "missing detached signature" verify_dry_run_release_dir "$missing_signature"

stale_checksum="$tmp_root/stale-checksum"
cp -R "$valid_release" "$stale_checksum"
printf 'tampered artifact body\n' >"$stale_checksum/another-dimension-test-artifact.txt"
expect_rejects "stale checksum" verify_dry_run_release_dir "$stale_checksum"

unsigned_artifact="$tmp_root/unsigned-artifact"
cp -R "$valid_release" "$unsigned_artifact"
printf 'unlisted artifact\n' >"$unsigned_artifact/another-dimension-extra-artifact.txt"
expect_rejects "unsigned artifact" verify_dry_run_release_dir "$unsigned_artifact"

stale_signature="$tmp_root/stale-signature"
cp -R "$valid_release" "$stale_signature"
printf '%s  %s\n' \
  "$(sha256_file "$stale_signature/another-dimension-test-artifact.txt")" \
  'another-dimension-test-artifact.txt' >"$stale_signature/SHA256SUMS"
printf '%s  %s\n' \
  "$(sha256_file "$stale_signature/another-dimension-test-artifact.txt")" \
  'another-dimension-test-artifact-copy.txt' >>"$stale_signature/SHA256SUMS"
expect_rejects "stale detached signature" verify_dry_run_release_dir "$stale_signature"

printf 'release signing dry-run verification rejects missing/stale/unsigned fixture states\n'
