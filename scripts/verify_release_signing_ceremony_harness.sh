#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v openssl >/dev/null; then
  echo "openssl is required for the disposable signing ceremony harness" >&2
  exit 1
fi

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

write_ceremony_checksums() {
  local release_dir="$1"

  (
    cd "$release_dir"
    find . -type f \
      ! -name 'SHA256SUMS' \
      ! -name 'SHA256SUMS.sig' \
      ! -name 'fixture-private.pem' \
      ! -name 'fixture-public.pem' \
      ! -name 'fixture-fingerprint.txt' \
      | sed 's#^\./##' \
      | sort \
      | while read -r artifact_name; do
          case "$artifact_name" in
            /* | *..* | *" "* | "")
              echo "invalid artifact path in ceremony harness: $artifact_name" >&2
              return 1
              ;;
          esac
          printf '%s  %s\n' "$(sha256_file "$artifact_name")" "$artifact_name"
        done >SHA256SUMS
  )
}

run_disposable_ceremony() {
  local release_dir="$1"

  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 \
    -out "$release_dir/fixture-private.pem" >/dev/null 2>&1
  openssl pkey -in "$release_dir/fixture-private.pem" \
    -pubout \
    -out "$release_dir/fixture-public.pem" >/dev/null 2>&1
  openssl pkey -pubin -in "$release_dir/fixture-public.pem" \
    -outform DER 2>/dev/null \
    | shasum -a 256 \
    | awk '{print $1}' >"$release_dir/fixture-fingerprint.txt"
  write_ceremony_checksums "$release_dir"
  openssl dgst -sha256 \
    -sign "$release_dir/fixture-private.pem" \
    -out "$release_dir/SHA256SUMS.sig" \
    "$release_dir/SHA256SUMS"
}

verify_ceremony_release_dir() {
  local release_dir="$1"
  local checksums_file="$release_dir/SHA256SUMS"
  local signature_file="$release_dir/SHA256SUMS.sig"
  local public_key_file="$release_dir/fixture-public.pem"
  local fingerprint_file="$release_dir/fixture-fingerprint.txt"

  [[ -f "$checksums_file" ]] || return 1
  [[ -f "$signature_file" ]] || return 1
  [[ -f "$public_key_file" ]] || return 1
  [[ -f "$fingerprint_file" ]] || return 1

  local actual_fingerprint
  actual_fingerprint="$(
    openssl pkey -pubin -in "$public_key_file" -outform DER 2>/dev/null \
      | shasum -a 256 \
      | awk '{print $1}'
  )"
  [[ "$(cat "$fingerprint_file")" = "$actual_fingerprint" ]] || return 1

  openssl dgst -sha256 \
    -verify "$public_key_file" \
    -signature "$signature_file" \
    "$checksums_file" >/dev/null 2>&1 || return 1

  local signed_paths
  signed_paths="$(mktemp)"
  awk '{print $2}' "$checksums_file" | sort >"$signed_paths"

  while read -r expected_hash artifact_name; do
    [[ -n "$expected_hash" ]] || return 1
    [[ -n "$artifact_name" ]] || return 1

    case "$artifact_name" in
      /* | *..* | *" "* | "")
        echo "invalid artifact path in ceremony checksum file: $artifact_name" >&2
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
    ! -name 'fixture-fingerprint.txt' \
    -exec basename {} \; | sort >"$present_paths"

  cmp -s "$signed_paths" "$present_paths" || return 1
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "signing ceremony harness unexpectedly accepted: $name" >&2
    return 1
  fi
}

grep -q 'RELEASE_SIGNING_CEREMONY_DRY_RUN.md' "$ROOT_DIR/RELEASE_SIGNING_PLAN.md"
grep -q 'This dry-run sequence must use disposable keys only' \
  "$ROOT_DIR/RELEASE_SIGNING_CEREMONY_DRY_RUN.md"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_release="$tmp_root/valid"
mkdir -p "$valid_release"
printf 'another-dimension ceremony artifact\n' >"$valid_release/another-dimension-ceremony-artifact.txt"
run_disposable_ceremony "$valid_release"
verify_ceremony_release_dir "$valid_release"

missing_signature="$tmp_root/missing-signature"
cp -R "$valid_release" "$missing_signature"
rm "$missing_signature/SHA256SUMS.sig"
expect_rejects "missing detached signature" verify_ceremony_release_dir "$missing_signature"

stale_checksum="$tmp_root/stale-checksum"
cp -R "$valid_release" "$stale_checksum"
printf 'tampered ceremony artifact\n' >"$stale_checksum/another-dimension-ceremony-artifact.txt"
expect_rejects "stale checksum" verify_ceremony_release_dir "$stale_checksum"

stale_signature="$tmp_root/stale-signature"
cp -R "$valid_release" "$stale_signature"
printf '%s  %s\n' \
  "$(sha256_file "$stale_signature/another-dimension-ceremony-artifact.txt")" \
  'another-dimension-ceremony-artifact.txt' >"$stale_signature/SHA256SUMS"
printf '%s  %s\n' \
  "$(sha256_file "$stale_signature/another-dimension-ceremony-artifact.txt")" \
  'another-dimension-ceremony-copy.txt' >>"$stale_signature/SHA256SUMS"
expect_rejects "stale detached signature" verify_ceremony_release_dir "$stale_signature"

unsigned_artifact="$tmp_root/unsigned-artifact"
cp -R "$valid_release" "$unsigned_artifact"
printf 'unsigned ceremony artifact\n' >"$unsigned_artifact/another-dimension-extra-ceremony-artifact.txt"
expect_rejects "unsigned artifact" verify_ceremony_release_dir "$unsigned_artifact"

stale_fingerprint="$tmp_root/stale-fingerprint"
cp -R "$valid_release" "$stale_fingerprint"
printf 'not-the-public-key-fingerprint\n' >"$stale_fingerprint/fixture-fingerprint.txt"
expect_rejects "stale public-key fingerprint" verify_ceremony_release_dir "$stale_fingerprint"

printf 'release signing ceremony harness rejects missing/stale/unsigned fixture states\n'
