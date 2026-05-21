#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v openssl >/dev/null; then
  echo "openssl is required for the disposable detached-signature fixture" >&2
  exit 1
fi

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

write_checksums() {
  local release_dir="$1"

  (
    cd "$release_dir"
    find . -type f \
      ! -name 'SHA256SUMS' \
      ! -name 'SHA256SUMS.sig' \
      ! -name 'fixture-private.pem' \
      ! -name 'fixture-public.pem' \
      | sed 's#^\./##' \
      | sort \
      | while read -r artifact_name; do
          printf '%s  %s\n' "$(sha256_file "$artifact_name")" "$artifact_name"
        done >SHA256SUMS
  )
}

verify_fixture_release_dir() {
  local release_dir="$1"
  local checksums_file="$release_dir/SHA256SUMS"
  local signature_file="$release_dir/SHA256SUMS.sig"
  local public_key_file="$release_dir/fixture-public.pem"

  [[ -f "$checksums_file" ]] || return 1
  [[ -f "$signature_file" ]] || return 1
  [[ -f "$public_key_file" ]] || return 1

  openssl dgst -sha256 -verify "$public_key_file" -signature "$signature_file" "$checksums_file" >/dev/null 2>&1 || return 1

  local signed_paths
  signed_paths="$(mktemp)"
  awk '{print $2}' "$checksums_file" | sort >"$signed_paths"

  while read -r expected_hash artifact_name; do
    [[ -n "$expected_hash" ]] || return 1
    [[ -n "$artifact_name" ]] || return 1

    case "$artifact_name" in
      /* | *..* | *" "* | "")
        echo "invalid artifact path in fixture checksum file: $artifact_name" >&2
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
    ! -name 'SHA256SUMS.sig' \
    ! -name 'fixture-private.pem' \
    ! -name 'fixture-public.pem' \
    -exec basename {} \; | sort >"$present_paths"

  cmp -s "$signed_paths" "$present_paths" || return 1
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "detached-signature fixture unexpectedly accepted: $name" >&2
    return 1
  fi
}

grep -q 'fixture-only detached-signature prototype' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'does not create release keys or verify real signed artifacts' "$ROOT_DIR/RELEASE_HARDENING.md"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_release="$tmp_root/valid"
mkdir -p "$valid_release"
printf 'another-dimension fixture artifact\n' >"$valid_release/another-dimension-fixture-artifact.txt"
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$valid_release/fixture-private.pem" >/dev/null 2>&1
openssl pkey -in "$valid_release/fixture-private.pem" -pubout -out "$valid_release/fixture-public.pem" >/dev/null 2>&1
write_checksums "$valid_release"
openssl dgst -sha256 -sign "$valid_release/fixture-private.pem" \
  -out "$valid_release/SHA256SUMS.sig" \
  "$valid_release/SHA256SUMS"
verify_fixture_release_dir "$valid_release"

missing_signature="$tmp_root/missing-signature"
cp -R "$valid_release" "$missing_signature"
rm "$missing_signature/SHA256SUMS.sig"
expect_rejects "missing detached signature" verify_fixture_release_dir "$missing_signature"

stale_checksum="$tmp_root/stale-checksum"
cp -R "$valid_release" "$stale_checksum"
printf 'tampered fixture artifact\n' >"$stale_checksum/another-dimension-fixture-artifact.txt"
expect_rejects "stale checksum" verify_fixture_release_dir "$stale_checksum"

stale_signature="$tmp_root/stale-signature"
cp -R "$valid_release" "$stale_signature"
printf '%s  %s\n' \
  "$(sha256_file "$stale_signature/another-dimension-fixture-artifact.txt")" \
  'another-dimension-fixture-artifact.txt' >"$stale_signature/SHA256SUMS"
printf '%s  %s\n' \
  "$(sha256_file "$stale_signature/another-dimension-fixture-artifact.txt")" \
  'another-dimension-fixture-artifact-copy.txt' >>"$stale_signature/SHA256SUMS"
expect_rejects "stale detached signature" verify_fixture_release_dir "$stale_signature"

unsigned_artifact="$tmp_root/unsigned-artifact"
cp -R "$valid_release" "$unsigned_artifact"
printf 'unlisted fixture artifact\n' >"$unsigned_artifact/another-dimension-extra-fixture-artifact.txt"
expect_rejects "unsigned artifact" verify_fixture_release_dir "$unsigned_artifact"

printf 'release detached-signature fixture rejects missing/stale/unsigned states\n'
