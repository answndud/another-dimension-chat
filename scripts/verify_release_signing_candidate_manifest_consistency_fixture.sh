#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_MANIFEST_CONSISTENCY_FIXTURE.md"

required_records=(
  key-ceremony.record
  signed-artifact.record
  verification-ux.record
  binary-verification.record
  dependency-review.record
  signoff.record
  external-review.record
  update-integrity.record
)

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

write_record() {
  local path="$1"
  local gate="$2"
  local commit="$3"
  local tag="$4"
  local manifest_sha="$5"
  local classification="${6:-fixture-filled-not-release-evidence}"

  {
    printf 'gate=%s\n' "$gate"
    printf 'candidate_commit=%s\n' "$commit"
    printf 'release_tag=%s\n' "$tag"
    printf 'artifact_manifest_sha256=%s\n' "$manifest_sha"
    printf 'classification=%s\n' "$classification"
  } >"$path"
}

write_valid_manifest_fixture_package() {
  local package_dir="$1"
  mkdir -p "$package_dir/records"

  {
    printf 'artifact another-dimension-fixture.tar.gz sha256-fixture-archive\n'
    printf 'artifact SHA256SUMS sha256-fixture-checksums\n'
    printf 'artifact SHA256SUMS.sig sha256-fixture-signature\n'
  } >"$package_dir/ARTIFACT_MANIFEST"

  local manifest_sha
  manifest_sha="$(sha256_file "$package_dir/ARTIFACT_MANIFEST")"

  {
    printf 'candidate_commit=%s\n' 'fixture-commit'
    printf 'release_tag=%s\n' 'fixture-v0.1.0'
    printf 'artifact_manifest_sha256=%s\n' "$manifest_sha"
    printf 'classification=%s\n' 'fixture-filled-not-release-evidence'
    for record in "${required_records[@]}"; do
      printf 'record=%s\n' "records/$record"
    done
  } >"$package_dir/CANDIDATE_EVIDENCE_INDEX"

  write_record "$package_dir/records/key-ceremony.record" key-ceremony fixture-commit fixture-v0.1.0 "$manifest_sha"
  write_record "$package_dir/records/signed-artifact.record" signed-artifact fixture-commit fixture-v0.1.0 "$manifest_sha"
  write_record "$package_dir/records/verification-ux.record" verification-ux fixture-commit fixture-v0.1.0 "$manifest_sha"
  write_record "$package_dir/records/binary-verification.record" binary-verification fixture-commit fixture-v0.1.0 "$manifest_sha"
  write_record "$package_dir/records/dependency-review.record" dependency-review fixture-commit fixture-v0.1.0 "$manifest_sha"
  write_record "$package_dir/records/signoff.record" signoff fixture-commit fixture-v0.1.0 "$manifest_sha"
  write_record "$package_dir/records/external-review.record" external-review fixture-commit fixture-v0.1.0 "$manifest_sha"
  write_record "$package_dir/records/update-integrity.record" update-integrity fixture-commit fixture-v0.1.0 "$manifest_sha"
}

field_value() {
  local file="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key {print $2}' "$file"
}

reject_if_unsafe_record_text() {
  local file="$1"

  if grep -E 'TODO|template-only|dry-run-only|requirements-only|placeholder' "$file" >/dev/null; then
    return 1
  fi
}

verify_manifest_consistency_fixture_dir() {
  local package_dir="$1"
  local manifest_file="$package_dir/ARTIFACT_MANIFEST"
  local index_file="$package_dir/CANDIDATE_EVIDENCE_INDEX"

  [[ -s "$manifest_file" ]] || return 1
  [[ -f "$index_file" ]] || return 1
  reject_if_unsafe_record_text "$index_file" || return 1

  local expected_commit expected_tag expected_manifest_sha actual_manifest_sha
  expected_commit="$(field_value "$index_file" candidate_commit)"
  expected_tag="$(field_value "$index_file" release_tag)"
  expected_manifest_sha="$(field_value "$index_file" artifact_manifest_sha256)"
  actual_manifest_sha="$(sha256_file "$manifest_file")"

  [[ "$expected_commit" = "fixture-commit" ]] || return 1
  [[ "$expected_tag" = "fixture-v0.1.0" ]] || return 1
  [[ "$expected_manifest_sha" = "$actual_manifest_sha" ]] || return 1

  local record
  for record in "${required_records[@]}"; do
    local record_file="$package_dir/records/$record"
    [[ -f "$record_file" ]] || return 1
    reject_if_unsafe_record_text "$record_file" || return 1
    [[ "$(field_value "$record_file" candidate_commit)" = "$expected_commit" ]] || return 1
    [[ "$(field_value "$record_file" release_tag)" = "$expected_tag" ]] || return 1
    [[ "$(field_value "$record_file" artifact_manifest_sha256)" = "$expected_manifest_sha" ]] || return 1
    [[ "$(field_value "$record_file" classification)" = "fixture-filled-not-release-evidence" ]] || return 1
  done
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "manifest consistency fixture unexpectedly accepted: $name" >&2
    return 1
  fi
}

grep -q 'Fixture status: manifest consistency fixture only, not candidate evidence' "$DOC"
grep -q 'ARTIFACT_MANIFEST' "$DOC"
grep -q 'artifact_manifest_sha256' "$DOC"
grep -q 'stale index manifest digest' "$DOC"
grep -q 'mismatched record candidate commit' "$DOC"
grep -q 'mismatched record release tag' "$DOC"
grep -q 'mismatched record manifest digest' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not verify signed release artifacts' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_package="$tmp_root/valid"
write_valid_manifest_fixture_package "$valid_package"
verify_manifest_consistency_fixture_dir "$valid_package"

missing_manifest="$tmp_root/missing-manifest"
cp -R "$valid_package" "$missing_manifest"
rm "$missing_manifest/ARTIFACT_MANIFEST"
expect_rejects "missing artifact manifest" verify_manifest_consistency_fixture_dir "$missing_manifest"

empty_manifest="$tmp_root/empty-manifest"
cp -R "$valid_package" "$empty_manifest"
: >"$empty_manifest/ARTIFACT_MANIFEST"
expect_rejects "empty artifact manifest" verify_manifest_consistency_fixture_dir "$empty_manifest"

stale_index="$tmp_root/stale-index"
cp -R "$valid_package" "$stale_index"
printf 'artifact changed sha256-changed\n' >>"$stale_index/ARTIFACT_MANIFEST"
expect_rejects "stale index manifest digest" verify_manifest_consistency_fixture_dir "$stale_index"

mismatched_commit="$tmp_root/mismatched-commit"
cp -R "$valid_package" "$mismatched_commit"
manifest_sha="$(sha256_file "$mismatched_commit/ARTIFACT_MANIFEST")"
write_record "$mismatched_commit/records/signed-artifact.record" signed-artifact other-commit fixture-v0.1.0 "$manifest_sha"
expect_rejects "mismatched record candidate commit" verify_manifest_consistency_fixture_dir "$mismatched_commit"

mismatched_tag="$tmp_root/mismatched-tag"
cp -R "$valid_package" "$mismatched_tag"
manifest_sha="$(sha256_file "$mismatched_tag/ARTIFACT_MANIFEST")"
write_record "$mismatched_tag/records/verification-ux.record" verification-ux fixture-commit other-tag "$manifest_sha"
expect_rejects "mismatched record release tag" verify_manifest_consistency_fixture_dir "$mismatched_tag"

mismatched_manifest="$tmp_root/mismatched-manifest"
cp -R "$valid_package" "$mismatched_manifest"
write_record "$mismatched_manifest/records/binary-verification.record" binary-verification fixture-commit fixture-v0.1.0 other-manifest-sha
expect_rejects "mismatched record manifest digest" verify_manifest_consistency_fixture_dir "$mismatched_manifest"

template_only="$tmp_root/template-only"
cp -R "$valid_package" "$template_only"
manifest_sha="$(sha256_file "$template_only/ARTIFACT_MANIFEST")"
write_record "$template_only/records/dependency-review.record" dependency-review fixture-commit fixture-v0.1.0 "$manifest_sha" template-only
expect_rejects "template-only evidence" verify_manifest_consistency_fixture_dir "$template_only"

placeholder="$tmp_root/placeholder"
cp -R "$valid_package" "$placeholder"
printf 'artifact_manifest_sha256=TODO-ARTIFACT-MANIFEST\n' >>"$placeholder/records/signoff.record"
expect_rejects "placeholder evidence" verify_manifest_consistency_fixture_dir "$placeholder"

printf 'release signing candidate manifest consistency fixture rejects drift/template states\n'
