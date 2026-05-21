#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX_CHECKSUM_FIXTURE.md"

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

field_value() {
  local file="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key {print $2}' "$file"
}

reject_if_unsafe_text() {
  local file="$1"

  if grep -E 'TODO|template-only|dry-run-only|requirements-only|placeholder' "$file" >/dev/null; then
    return 1
  fi
}

write_record() {
  local path="$1"
  local gate="$2"
  local commit="$3"
  local tag="$4"
  local manifest_path="$5"
  local manifest_sha="$6"
  local classification="${7-fixture-filled-not-release-evidence}"
  local blocker_status="${8-none-for-fixture}"

  {
    printf 'gate=%s\n' "$gate"
    printf 'candidate_commit=%s\n' "$commit"
    printf 'release_tag=%s\n' "$tag"
    printf 'artifact_manifest=%s\n' "$manifest_path"
    printf 'artifact_manifest_sha256=%s\n' "$manifest_sha"
    printf 'classification=%s\n' "$classification"
    printf 'blocker_status=%s\n' "$blocker_status"
  } >"$path"
}

write_valid_index_checksum_fixture_package() {
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
    printf 'artifact_manifest=%s\n' 'ARTIFACT_MANIFEST'
    printf 'artifact_manifest_sha256=%s\n' "$manifest_sha"
    printf 'classification=%s\n' 'fixture-filled-not-release-evidence'
    printf 'blocker_status=%s\n' 'none-for-fixture'
    for record in "${required_records[@]}"; do
      printf 'record=%s\n' "records/$record"
    done
  } >"$package_dir/CANDIDATE_EVIDENCE_INDEX"

  write_record "$package_dir/records/key-ceremony.record" key-ceremony fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
  write_record "$package_dir/records/signed-artifact.record" signed-artifact fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
  write_record "$package_dir/records/verification-ux.record" verification-ux fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
  write_record "$package_dir/records/binary-verification.record" binary-verification fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
  write_record "$package_dir/records/dependency-review.record" dependency-review fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
  write_record "$package_dir/records/signoff.record" signoff fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
  write_record "$package_dir/records/external-review.record" external-review fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
  write_record "$package_dir/records/update-integrity.record" update-integrity fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
}

verify_record_list() {
  local index_file="$1"
  local expected_file="$2"
  local actual_file="$3"

  : >"$expected_file"
  local record
  for record in "${required_records[@]}"; do
    printf 'records/%s\n' "$record" >>"$expected_file"
  done

  awk -F= '$1 == "record" {print $2}' "$index_file" | sort >"$actual_file"
  sort "$expected_file" -o "$expected_file"
  cmp -s "$expected_file" "$actual_file"
}

verify_index_checksum_fixture_dir() {
  local package_dir="$1"
  local index_file="$package_dir/CANDIDATE_EVIDENCE_INDEX"

  [[ -f "$index_file" ]] || return 1
  reject_if_unsafe_text "$index_file" || return 1

  local expected_commit expected_tag expected_manifest expected_manifest_sha expected_classification expected_blocker
  expected_commit="$(field_value "$index_file" candidate_commit)"
  expected_tag="$(field_value "$index_file" release_tag)"
  expected_manifest="$(field_value "$index_file" artifact_manifest)"
  expected_manifest_sha="$(field_value "$index_file" artifact_manifest_sha256)"
  expected_classification="$(field_value "$index_file" classification)"
  expected_blocker="$(field_value "$index_file" blocker_status)"

  [[ "$expected_commit" = "fixture-commit" ]] || return 1
  [[ "$expected_tag" = "fixture-v0.1.0" ]] || return 1
  [[ "$expected_manifest" = "ARTIFACT_MANIFEST" ]] || return 1
  [[ -n "$expected_manifest_sha" ]] || return 1
  [[ "$expected_classification" = "fixture-filled-not-release-evidence" ]] || return 1
  [[ -n "$expected_blocker" ]] || return 1

  local manifest_file="$package_dir/$expected_manifest"
  [[ -s "$manifest_file" ]] || return 1
  [[ "$expected_manifest_sha" = "$(sha256_file "$manifest_file")" ]] || return 1

  verify_record_list "$index_file" "$package_dir/expected-records.sorted" "$package_dir/actual-records.sorted" || return 1

  local record
  for record in "${required_records[@]}"; do
    local record_file="$package_dir/records/$record"
    [[ -f "$record_file" ]] || return 1
    reject_if_unsafe_text "$record_file" || return 1
    [[ "$(field_value "$record_file" candidate_commit)" = "$expected_commit" ]] || return 1
    [[ "$(field_value "$record_file" release_tag)" = "$expected_tag" ]] || return 1
    [[ "$(field_value "$record_file" artifact_manifest)" = "$expected_manifest" ]] || return 1
    [[ "$(field_value "$record_file" artifact_manifest_sha256)" = "$expected_manifest_sha" ]] || return 1
    [[ "$(field_value "$record_file" classification)" = "$expected_classification" ]] || return 1
    [[ -n "$(field_value "$record_file" blocker_status)" ]] || return 1
  done
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "index checksum fixture unexpectedly accepted: $name" >&2
    return 1
  fi
}

test -f "$DOC"

grep -q 'Fixture status: index checksum binding fixture only, not candidate evidence' "$DOC"
grep -q 'CANDIDATE_EVIDENCE_INDEX' "$DOC"
grep -q 'ARTIFACT_MANIFEST' "$DOC"
grep -q 'candidate_commit' "$DOC"
grep -q 'release_tag' "$DOC"
grep -q 'artifact_manifest' "$DOC"
grep -q 'artifact_manifest_sha256' "$DOC"
grep -q 'classification' "$DOC"
grep -q 'blocker_status' "$DOC"
grep -q 'missing candidate index' "$DOC"
grep -q 'missing artifact manifest' "$DOC"
grep -q 'missing artifact manifest digest' "$DOC"
grep -q 'empty artifact manifest' "$DOC"
grep -q 'stale artifact manifest digest' "$DOC"
grep -q 'mismatched record candidate commit' "$DOC"
grep -q 'mismatched record release tag' "$DOC"
grep -q 'mismatched record artifact manifest' "$DOC"
grep -q 'mismatched record artifact manifest digest' "$DOC"
grep -q 'template-only evidence' "$DOC"
grep -q 'placeholder evidence' "$DOC"
grep -q 'empty blocker status' "$DOC"
grep -q 'does not checksum real release artifacts' "$DOC"
grep -q 'does not compare real release artifact hashes against `SHA256SUMS`' "$DOC"
grep -q 'does not verify detached signatures' "$DOC"
grep -q 'does not prove artifact authenticity' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not approve release signing' "$DOC"
grep -q 'does not satisfy release hardening gates' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_package="$tmp_root/valid"
write_valid_index_checksum_fixture_package "$valid_package"
verify_index_checksum_fixture_dir "$valid_package"

missing_index="$tmp_root/missing-index"
cp -R "$valid_package" "$missing_index"
rm "$missing_index/CANDIDATE_EVIDENCE_INDEX"
expect_rejects "missing candidate index" verify_index_checksum_fixture_dir "$missing_index"

missing_manifest="$tmp_root/missing-manifest"
cp -R "$valid_package" "$missing_manifest"
rm "$missing_manifest/ARTIFACT_MANIFEST"
expect_rejects "missing artifact manifest" verify_index_checksum_fixture_dir "$missing_manifest"

missing_manifest_digest="$tmp_root/missing-manifest-digest"
cp -R "$valid_package" "$missing_manifest_digest"
awk -F= '$1 != "artifact_manifest_sha256" {print}' "$missing_manifest_digest/CANDIDATE_EVIDENCE_INDEX" >"$missing_manifest_digest/index.tmp"
mv "$missing_manifest_digest/index.tmp" "$missing_manifest_digest/CANDIDATE_EVIDENCE_INDEX"
expect_rejects "missing artifact manifest digest" verify_index_checksum_fixture_dir "$missing_manifest_digest"

empty_manifest="$tmp_root/empty-manifest"
cp -R "$valid_package" "$empty_manifest"
: >"$empty_manifest/ARTIFACT_MANIFEST"
expect_rejects "empty artifact manifest" verify_index_checksum_fixture_dir "$empty_manifest"

stale_manifest_digest="$tmp_root/stale-manifest-digest"
cp -R "$valid_package" "$stale_manifest_digest"
printf 'artifact changed sha256-changed\n' >>"$stale_manifest_digest/ARTIFACT_MANIFEST"
expect_rejects "stale artifact manifest digest" verify_index_checksum_fixture_dir "$stale_manifest_digest"

mismatched_commit="$tmp_root/mismatched-commit"
cp -R "$valid_package" "$mismatched_commit"
manifest_sha="$(sha256_file "$mismatched_commit/ARTIFACT_MANIFEST")"
write_record "$mismatched_commit/records/signed-artifact.record" signed-artifact other-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha"
expect_rejects "mismatched record candidate commit" verify_index_checksum_fixture_dir "$mismatched_commit"

mismatched_tag="$tmp_root/mismatched-tag"
cp -R "$valid_package" "$mismatched_tag"
manifest_sha="$(sha256_file "$mismatched_tag/ARTIFACT_MANIFEST")"
write_record "$mismatched_tag/records/verification-ux.record" verification-ux fixture-commit other-tag ARTIFACT_MANIFEST "$manifest_sha"
expect_rejects "mismatched record release tag" verify_index_checksum_fixture_dir "$mismatched_tag"

mismatched_manifest="$tmp_root/mismatched-manifest"
cp -R "$valid_package" "$mismatched_manifest"
manifest_sha="$(sha256_file "$mismatched_manifest/ARTIFACT_MANIFEST")"
write_record "$mismatched_manifest/records/binary-verification.record" binary-verification fixture-commit fixture-v0.1.0 OTHER_MANIFEST "$manifest_sha"
expect_rejects "mismatched record artifact manifest" verify_index_checksum_fixture_dir "$mismatched_manifest"

mismatched_manifest_digest="$tmp_root/mismatched-manifest-digest"
cp -R "$valid_package" "$mismatched_manifest_digest"
write_record "$mismatched_manifest_digest/records/dependency-review.record" dependency-review fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST other-manifest-sha
expect_rejects "mismatched record artifact manifest digest" verify_index_checksum_fixture_dir "$mismatched_manifest_digest"

template_only="$tmp_root/template-only"
cp -R "$valid_package" "$template_only"
manifest_sha="$(sha256_file "$template_only/ARTIFACT_MANIFEST")"
write_record "$template_only/records/signoff.record" signoff fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha" template-only
expect_rejects "template-only evidence" verify_index_checksum_fixture_dir "$template_only"

placeholder="$tmp_root/placeholder"
cp -R "$valid_package" "$placeholder"
printf 'artifact_manifest_sha256=TODO-ARTIFACT-MANIFEST\n' >>"$placeholder/records/external-review.record"
expect_rejects "placeholder evidence" verify_index_checksum_fixture_dir "$placeholder"

empty_blocker="$tmp_root/empty-blocker"
cp -R "$valid_package" "$empty_blocker"
manifest_sha="$(sha256_file "$empty_blocker/ARTIFACT_MANIFEST")"
write_record "$empty_blocker/records/update-integrity.record" update-integrity fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha" fixture-filled-not-release-evidence ''
expect_rejects "empty blocker status" verify_index_checksum_fixture_dir "$empty_blocker"

printf 'release signing candidate evidence index checksum fixture rejects missing/stale/mismatch states\n'
