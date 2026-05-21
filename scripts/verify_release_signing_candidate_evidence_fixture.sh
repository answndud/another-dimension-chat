#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE.md"

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

write_record() {
  local path="$1"
  local gate="$2"
  local commit="${3:-fixture-commit}"
  local tag="${4:-fixture-v0.1.0}"
  local manifest="${5:-fixture-artifact-manifest-v1}"
  local classification="${6:-fixture-filled-not-release-evidence}"
  local blocker="${7-none-for-fixture}"

  {
    printf 'gate=%s\n' "$gate"
    printf 'candidate_commit=%s\n' "$commit"
    printf 'release_tag=%s\n' "$tag"
    printf 'artifact_manifest=%s\n' "$manifest"
    printf 'classification=%s\n' "$classification"
    printf 'blocker_status=%s\n' "$blocker"
  } >"$path"
}

write_valid_fixture_package() {
  local package_dir="$1"
  mkdir -p "$package_dir/records"

  {
    printf 'candidate_commit=%s\n' 'fixture-commit'
    printf 'release_tag=%s\n' 'fixture-v0.1.0'
    printf 'artifact_manifest=%s\n' 'fixture-artifact-manifest-v1'
    printf 'classification=%s\n' 'fixture-filled-not-release-evidence'
    printf 'blocker_status=%s\n' 'none-for-fixture'
    for record in "${required_records[@]}"; do
      printf 'record=%s\n' "records/$record"
    done
  } >"$package_dir/CANDIDATE_EVIDENCE_INDEX"

  write_record "$package_dir/records/key-ceremony.record" key-ceremony
  write_record "$package_dir/records/signed-artifact.record" signed-artifact
  write_record "$package_dir/records/verification-ux.record" verification-ux
  write_record "$package_dir/records/binary-verification.record" binary-verification
  write_record "$package_dir/records/dependency-review.record" dependency-review
  write_record "$package_dir/records/signoff.record" signoff
  write_record "$package_dir/records/external-review.record" external-review
  write_record "$package_dir/records/update-integrity.record" update-integrity
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

verify_fixture_evidence_package_dir() {
  local package_dir="$1"
  local index_file="$package_dir/CANDIDATE_EVIDENCE_INDEX"

  [[ -f "$index_file" ]] || return 1
  reject_if_unsafe_record_text "$index_file" || return 1

  local expected_commit expected_tag expected_manifest index_classification blocker_status
  expected_commit="$(field_value "$index_file" candidate_commit)"
  expected_tag="$(field_value "$index_file" release_tag)"
  expected_manifest="$(field_value "$index_file" artifact_manifest)"
  index_classification="$(field_value "$index_file" classification)"
  blocker_status="$(field_value "$index_file" blocker_status)"

  [[ "$expected_commit" = "fixture-commit" ]] || return 1
  [[ "$expected_tag" = "fixture-v0.1.0" ]] || return 1
  [[ "$expected_manifest" = "fixture-artifact-manifest-v1" ]] || return 1
  [[ "$index_classification" = "fixture-filled-not-release-evidence" ]] || return 1
  [[ -n "$blocker_status" ]] || return 1

  local listed_records
  listed_records="$(mktemp)"
  awk -F= '$1 == "record" {print $2}' "$index_file" | sort >"$listed_records"

  local required_records_file
  required_records_file="$(mktemp)"
  printf 'records/%s\n' "${required_records[@]}" | sort >"$required_records_file"
  cmp -s "$listed_records" "$required_records_file" || return 1

  local record
  for record in "${required_records[@]}"; do
    local record_file="$package_dir/records/$record"
    [[ -f "$record_file" ]] || return 1
    reject_if_unsafe_record_text "$record_file" || return 1
    [[ "$(field_value "$record_file" candidate_commit)" = "$expected_commit" ]] || return 1
    [[ "$(field_value "$record_file" release_tag)" = "$expected_tag" ]] || return 1
    [[ "$(field_value "$record_file" artifact_manifest)" = "$expected_manifest" ]] || return 1
    [[ "$(field_value "$record_file" classification)" = "fixture-filled-not-release-evidence" ]] || return 1
    [[ -n "$(field_value "$record_file" blocker_status)" ]] || return 1
  done
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "candidate evidence package fixture unexpectedly accepted: $name" >&2
    return 1
  fi
}

grep -q 'Fixture status: disposable fixture only, not candidate evidence' "$DOC"
grep -q 'RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md' "$DOC"
grep -q 'RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md' "$DOC"
grep -q 'fixture-filled-not-release-evidence' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not verify signed release artifacts' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_package="$tmp_root/valid"
write_valid_fixture_package "$valid_package"
verify_fixture_evidence_package_dir "$valid_package"

missing_index="$tmp_root/missing-index"
cp -R "$valid_package" "$missing_index"
rm "$missing_index/CANDIDATE_EVIDENCE_INDEX"
expect_rejects "missing candidate index" verify_fixture_evidence_package_dir "$missing_index"

missing_record="$tmp_root/missing-record"
cp -R "$valid_package" "$missing_record"
rm "$missing_record/records/key-ceremony.record"
expect_rejects "missing key ceremony record" verify_fixture_evidence_package_dir "$missing_record"

mismatched_commit="$tmp_root/mismatched-commit"
cp -R "$valid_package" "$mismatched_commit"
write_record "$mismatched_commit/records/signed-artifact.record" signed-artifact other-commit
expect_rejects "mismatched candidate commit" verify_fixture_evidence_package_dir "$mismatched_commit"

mismatched_manifest="$tmp_root/mismatched-manifest"
cp -R "$valid_package" "$mismatched_manifest"
write_record "$mismatched_manifest/records/verification-ux.record" verification-ux fixture-commit fixture-v0.1.0 other-manifest
expect_rejects "mismatched artifact manifest" verify_fixture_evidence_package_dir "$mismatched_manifest"

template_only="$tmp_root/template-only"
cp -R "$valid_package" "$template_only"
write_record "$template_only/records/dependency-review.record" dependency-review fixture-commit fixture-v0.1.0 fixture-artifact-manifest-v1 template-only
expect_rejects "template-only evidence" verify_fixture_evidence_package_dir "$template_only"

placeholder="$tmp_root/placeholder"
cp -R "$valid_package" "$placeholder"
printf 'candidate_commit=TODO-CANDIDATE-COMMIT\n' >>"$placeholder/records/signoff.record"
expect_rejects "placeholder evidence" verify_fixture_evidence_package_dir "$placeholder"

empty_blocker="$tmp_root/empty-blocker"
cp -R "$valid_package" "$empty_blocker"
write_record "$empty_blocker/records/update-integrity.record" update-integrity fixture-commit fixture-v0.1.0 fixture-artifact-manifest-v1 fixture-filled-not-release-evidence ""
expect_rejects "empty blocker status" verify_fixture_evidence_package_dir "$empty_blocker"

printf 'release signing candidate evidence fixture rejects missing/template/mismatch states\n'
