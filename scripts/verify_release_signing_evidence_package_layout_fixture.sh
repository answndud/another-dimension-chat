#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_FIXTURE.md"

required_dirs=(
  release-signing
  binary-verification
  dependency-review
  signoff
  external-review
  update-integrity
  blockers
)

required_records=(
  release-signing/key-ceremony.record
  release-signing/signed-artifacts.record
  release-signing/verification-ux.record
  binary-verification/binary-verification.record
  dependency-review/dependency-review.record
  signoff/release-signoff.record
  external-review/external-review.record
  update-integrity/update-integrity.record
  blockers/unresolved-blockers.record
)

write_valid_layout_fixture() {
  local package_dir="$1"
  mkdir -p "$package_dir"
  printf 'fixture candidate index, not release evidence\n' >"$package_dir/CANDIDATE_EVIDENCE_INDEX"

  local dir
  for dir in "${required_dirs[@]}"; do
    mkdir -p "$package_dir/$dir"
  done

  local record
  for record in "${required_records[@]}"; do
    printf 'fixture record for %s, not release evidence\n' "$record" >"$package_dir/$record"
  done
}

verify_layout_fixture_dir() {
  local package_dir="$1"
  [[ -f "$package_dir/CANDIDATE_EVIDENCE_INDEX" ]] || return 1
  [[ -s "$package_dir/CANDIDATE_EVIDENCE_INDEX" ]] || return 1

  local expected_top
  expected_top="$(mktemp)"
  {
    printf 'CANDIDATE_EVIDENCE_INDEX\n'
    printf '%s\n' "${required_dirs[@]}"
  } | sort >"$expected_top"

  local actual_top
  actual_top="$(mktemp)"
  find "$package_dir" -mindepth 1 -maxdepth 1 -exec basename {} \; | sort >"$actual_top"
  cmp -s "$expected_top" "$actual_top" || return 1

  local dir
  for dir in "${required_dirs[@]}"; do
    [[ -d "$package_dir/$dir" ]] || return 1
  done

  local expected_records
  expected_records="$(mktemp)"
  printf '%s\n' "${required_records[@]}" | sort >"$expected_records"

  local actual_records
  actual_records="$(mktemp)"
  find "$package_dir" -mindepth 2 -type f \
    | sed "s#^$package_dir/##" \
    | sort >"$actual_records"
  cmp -s "$expected_records" "$actual_records" || return 1

  local record
  for record in "${required_records[@]}"; do
    [[ -s "$package_dir/$record" ]] || return 1
  done
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "evidence package layout fixture unexpectedly accepted: $name" >&2
    return 1
  fi
}

grep -q 'Fixture status: directory layout fixture only, not candidate evidence' "$DOC"
grep -q 'CANDIDATE_EVIDENCE_INDEX' "$DOC"
grep -q 'key-ceremony.record' "$DOC"
grep -q 'binary-verification.record' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not verify signed release artifacts' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_package="$tmp_root/valid"
write_valid_layout_fixture "$valid_package"
verify_layout_fixture_dir "$valid_package"

missing_index="$tmp_root/missing-index"
cp -R "$valid_package" "$missing_index"
rm "$missing_index/CANDIDATE_EVIDENCE_INDEX"
expect_rejects "missing candidate index" verify_layout_fixture_dir "$missing_index"

missing_dir="$tmp_root/missing-dir"
cp -R "$valid_package" "$missing_dir"
rm -rf "$missing_dir/release-signing"
expect_rejects "missing gate directory" verify_layout_fixture_dir "$missing_dir"

missing_record="$tmp_root/missing-record"
cp -R "$valid_package" "$missing_record"
rm "$missing_record/release-signing/signed-artifacts.record"
expect_rejects "missing required record" verify_layout_fixture_dir "$missing_record"

misplaced_root_record="$tmp_root/misplaced-root-record"
cp -R "$valid_package" "$misplaced_root_record"
mv "$misplaced_root_record/release-signing/key-ceremony.record" "$misplaced_root_record/key-ceremony.record"
expect_rejects "misplaced root record" verify_layout_fixture_dir "$misplaced_root_record"

unknown_top="$tmp_root/unknown-top"
cp -R "$valid_package" "$unknown_top"
mkdir -p "$unknown_top/approval"
expect_rejects "unknown top-level directory" verify_layout_fixture_dir "$unknown_top"

unknown_record="$tmp_root/unknown-record"
cp -R "$valid_package" "$unknown_record"
printf 'unexpected fixture record\n' >"$unknown_record/signoff/release-approval.record"
expect_rejects "unknown record inside gate directory" verify_layout_fixture_dir "$unknown_record"

empty_record="$tmp_root/empty-record"
cp -R "$valid_package" "$empty_record"
: >"$empty_record/blockers/unresolved-blockers.record"
expect_rejects "empty required record" verify_layout_fixture_dir "$empty_record"

printf 'release signing evidence package layout fixture rejects missing/misplaced/unknown states\n'
