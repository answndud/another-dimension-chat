#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

write_manifest() {
  local fixture_dir="$1"
  local manifest_file="$fixture_dir/BINARY_MANIFEST"
  local build_inputs_file="$fixture_dir/BUILD_INPUTS"

  {
    printf 'source_commit=%s\n' 'fixture-commit'
    printf 'build_profile=%s\n' 'fixture-release'
    printf 'target_platform=%s\n' 'fixture-platform'
    printf 'toolchain=%s\n' 'fixture-toolchain'
    printf 'build_inputs_sha256=%s\n' "$(sha256_file "$build_inputs_file")"
    printf 'artifact %s %s\n' \
      "$(sha256_file "$fixture_dir/another-dimension-fixture-binary")" \
      'another-dimension-fixture-binary'
  } >"$manifest_file"
}

verify_manifest_fixture_dir() {
  local fixture_dir="$1"
  local manifest_file="$fixture_dir/BINARY_MANIFEST"
  local build_inputs_file="$fixture_dir/BUILD_INPUTS"

  [[ -f "$manifest_file" ]] || return 1
  [[ -f "$build_inputs_file" ]] || return 1

  local recorded_inputs_hash
  recorded_inputs_hash="$(awk -F= '$1 == "build_inputs_sha256" {print $2}' "$manifest_file")"
  [[ -n "$recorded_inputs_hash" ]] || return 1
  [[ "$(sha256_file "$build_inputs_file")" = "$recorded_inputs_hash" ]] || return 1

  local recorded_artifacts
  recorded_artifacts="$(mktemp)"
  awk '$1 == "artifact" {print $3}' "$manifest_file" | sort >"$recorded_artifacts"
  [[ -s "$recorded_artifacts" ]] || return 1

  while read -r marker expected_hash artifact_name; do
    [[ "$marker" = "artifact" ]] || continue
    [[ -n "$expected_hash" ]] || return 1
    [[ -n "$artifact_name" ]] || return 1

    case "$artifact_name" in
      /* | *..* | *" "* | "")
        echo "invalid artifact path in binary manifest fixture: $artifact_name" >&2
        return 1
        ;;
    esac

    local artifact_path="$fixture_dir/$artifact_name"
    [[ -f "$artifact_path" ]] || return 1
    [[ "$(sha256_file "$artifact_path")" = "$expected_hash" ]] || return 1
  done <"$manifest_file"

  local present_artifacts
  present_artifacts="$(mktemp)"
  find "$fixture_dir" -type f \
    ! -name 'BINARY_MANIFEST' \
    ! -name 'BUILD_INPUTS' \
    -exec basename {} \; | sort >"$present_artifacts"

  cmp -s "$recorded_artifacts" "$present_artifacts" || return 1
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "binary manifest fixture unexpectedly accepted: $name" >&2
    return 1
  fi
}

grep -q 'fixture-only manifest verifier' "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"
grep -q 'missing artifacts, extra artifacts, checksum mismatches, and unrecorded build-input changes' \
  "$ROOT_DIR/RELEASE_BINARY_VERIFICATION_PLAN.md"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_fixture="$tmp_root/valid"
mkdir -p "$valid_fixture"
printf 'fixture lockfiles and toolchain\n' >"$valid_fixture/BUILD_INPUTS"
printf 'fixture binary bytes\n' >"$valid_fixture/another-dimension-fixture-binary"
write_manifest "$valid_fixture"
verify_manifest_fixture_dir "$valid_fixture"

missing_artifact="$tmp_root/missing-artifact"
cp -R "$valid_fixture" "$missing_artifact"
rm "$missing_artifact/another-dimension-fixture-binary"
expect_rejects "missing artifact" verify_manifest_fixture_dir "$missing_artifact"

extra_artifact="$tmp_root/extra-artifact"
cp -R "$valid_fixture" "$extra_artifact"
printf 'unrecorded binary\n' >"$extra_artifact/another-dimension-extra-binary"
expect_rejects "extra artifact" verify_manifest_fixture_dir "$extra_artifact"

checksum_mismatch="$tmp_root/checksum-mismatch"
cp -R "$valid_fixture" "$checksum_mismatch"
printf 'changed fixture binary bytes\n' >"$checksum_mismatch/another-dimension-fixture-binary"
expect_rejects "checksum mismatch" verify_manifest_fixture_dir "$checksum_mismatch"

changed_inputs="$tmp_root/changed-inputs"
cp -R "$valid_fixture" "$changed_inputs"
printf 'changed lockfiles and toolchain\n' >"$changed_inputs/BUILD_INPUTS"
expect_rejects "unrecorded build-input change" verify_manifest_fixture_dir "$changed_inputs"

printf 'binary manifest fixture rejects missing/extra/checksum/input drift states\n'
