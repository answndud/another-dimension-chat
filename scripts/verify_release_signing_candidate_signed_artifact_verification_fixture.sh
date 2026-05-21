#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_FIXTURE.md"

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

write_signed_artifact_record() {
  local path="$1"
  local commit="$2"
  local tag="$3"
  local manifest_path="$4"
  local manifest_sha="$5"
  local sha256sums_path="$6"
  local sha256sums_sha="$7"
  local sig_path="$8"
  local sig_sha="$9"
  local fingerprint="${10}"
  local signature_transcript="${11-fixture-signature-transcript}"
  local hash_transcript="${12-fixture-hash-transcript}"
  local failure_transcript="${13-fixture-failure-transcript}"
  local classification="${14-fixture-filled-not-release-evidence}"
  local blocker_status="${15-none-for-fixture}"

  {
    printf 'gate=%s\n' 'signed-artifact'
    printf 'candidate_commit=%s\n' "$commit"
    printf 'release_tag=%s\n' "$tag"
    printf 'artifact_manifest=%s\n' "$manifest_path"
    printf 'artifact_manifest_sha256=%s\n' "$manifest_sha"
    printf 'sha256sums_path=%s\n' "$sha256sums_path"
    printf 'sha256sums_sha256=%s\n' "$sha256sums_sha"
    printf 'sha256sums_sig_path=%s\n' "$sig_path"
    printf 'sha256sums_sig_sha256=%s\n' "$sig_sha"
    printf 'public_key_fingerprint=%s\n' "$fingerprint"
    printf 'key_ceremony_record=%s\n' 'records/key-ceremony.record'
    printf 'signature_verification_command=%s\n' 'fixture-openssl-verify-command'
    printf 'signature_verification_transcript=%s\n' "$signature_transcript"
    printf 'artifact_hash_verification_command=%s\n' 'fixture-shasum-check-command'
    printf 'artifact_hash_verification_transcript=%s\n' "$hash_transcript"
    printf 'failure_transcript=%s\n' "$failure_transcript"
    printf 'reviewer=%s\n' 'fixture-reviewer'
    printf 'review_timestamp=%s\n' '2026-05-21T00:00:00Z'
    printf 'classification=%s\n' "$classification"
    printf 'blocker_status=%s\n' "$blocker_status"
  } >"$path"
}

write_valid_signed_artifact_fixture_package() {
  local package_dir="$1"
  mkdir -p "$package_dir/records"

  {
    printf 'artifact another-dimension-fixture.tar.gz sha256-fixture-archive\n'
    printf 'artifact SHA256SUMS sha256-fixture-checksums\n'
    printf 'artifact SHA256SUMS.sig sha256-fixture-signature\n'
  } >"$package_dir/ARTIFACT_MANIFEST"

  {
    printf 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  another-dimension-fixture.tar.gz\n'
  } >"$package_dir/SHA256SUMS"

  printf 'fixture detached signature bytes\n' >"$package_dir/SHA256SUMS.sig"

  local manifest_sha sha256sums_sha sig_sha
  manifest_sha="$(sha256_file "$package_dir/ARTIFACT_MANIFEST")"
  sha256sums_sha="$(sha256_file "$package_dir/SHA256SUMS")"
  sig_sha="$(sha256_file "$package_dir/SHA256SUMS.sig")"

  {
    printf 'candidate_commit=%s\n' 'fixture-commit'
    printf 'release_tag=%s\n' 'fixture-v0.1.0'
    printf 'artifact_manifest=%s\n' 'ARTIFACT_MANIFEST'
    printf 'artifact_manifest_sha256=%s\n' "$manifest_sha"
    printf 'classification=%s\n' 'fixture-filled-not-release-evidence'
    printf 'blocker_status=%s\n' 'none-for-fixture'
    printf 'record=%s\n' 'records/key-ceremony.record'
    printf 'record=%s\n' 'records/signed-artifact.record'
  } >"$package_dir/CANDIDATE_EVIDENCE_INDEX"

  {
    printf 'gate=%s\n' 'key-ceremony'
    printf 'candidate_commit=%s\n' 'fixture-commit'
    printf 'release_tag=%s\n' 'fixture-v0.1.0'
    printf 'public_key_fingerprint=%s\n' 'fixture-fingerprint'
    printf 'classification=%s\n' 'fixture-filled-not-release-evidence'
    printf 'blocker_status=%s\n' 'none-for-fixture'
  } >"$package_dir/records/key-ceremony.record"

  write_signed_artifact_record \
    "$package_dir/records/signed-artifact.record" \
    fixture-commit \
    fixture-v0.1.0 \
    ARTIFACT_MANIFEST \
    "$manifest_sha" \
    SHA256SUMS \
    "$sha256sums_sha" \
    SHA256SUMS.sig \
    "$sig_sha" \
    fixture-fingerprint
}

verify_signed_artifact_fixture_dir() {
  local package_dir="$1"
  local index_file="$package_dir/CANDIDATE_EVIDENCE_INDEX"
  local record_file="$package_dir/records/signed-artifact.record"
  local key_record_file="$package_dir/records/key-ceremony.record"

  [[ -f "$index_file" ]] || return 1
  [[ -f "$record_file" ]] || return 1
  [[ -f "$key_record_file" ]] || return 1
  reject_if_unsafe_text "$index_file" || return 1
  reject_if_unsafe_text "$record_file" || return 1
  reject_if_unsafe_text "$key_record_file" || return 1

  local expected_commit expected_tag expected_manifest expected_manifest_sha
  expected_commit="$(field_value "$index_file" candidate_commit)"
  expected_tag="$(field_value "$index_file" release_tag)"
  expected_manifest="$(field_value "$index_file" artifact_manifest)"
  expected_manifest_sha="$(field_value "$index_file" artifact_manifest_sha256)"

  [[ "$expected_commit" = "fixture-commit" ]] || return 1
  [[ "$expected_tag" = "fixture-v0.1.0" ]] || return 1
  [[ "$expected_manifest" = "ARTIFACT_MANIFEST" ]] || return 1
  [[ "$expected_manifest_sha" = "$(sha256_file "$package_dir/$expected_manifest")" ]] || return 1

  [[ "$(field_value "$record_file" candidate_commit)" = "$expected_commit" ]] || return 1
  [[ "$(field_value "$record_file" release_tag)" = "$expected_tag" ]] || return 1
  [[ "$(field_value "$record_file" artifact_manifest)" = "$expected_manifest" ]] || return 1
  [[ "$(field_value "$record_file" artifact_manifest_sha256)" = "$expected_manifest_sha" ]] || return 1

  local sha256sums_path sig_path
  sha256sums_path="$(field_value "$record_file" sha256sums_path)"
  sig_path="$(field_value "$record_file" sha256sums_sig_path)"
  [[ -s "$package_dir/$sha256sums_path" ]] || return 1
  [[ -s "$package_dir/$sig_path" ]] || return 1
  [[ "$(field_value "$record_file" sha256sums_sha256)" = "$(sha256_file "$package_dir/$sha256sums_path")" ]] || return 1
  [[ "$(field_value "$record_file" sha256sums_sig_sha256)" = "$(sha256_file "$package_dir/$sig_path")" ]] || return 1
  [[ "$(field_value "$record_file" public_key_fingerprint)" = "$(field_value "$key_record_file" public_key_fingerprint)" ]] || return 1
  [[ -n "$(field_value "$record_file" signature_verification_transcript)" ]] || return 1
  [[ -n "$(field_value "$record_file" artifact_hash_verification_transcript)" ]] || return 1
  [[ -n "$(field_value "$record_file" failure_transcript)" ]] || return 1
  [[ "$(field_value "$record_file" classification)" = "fixture-filled-not-release-evidence" ]] || return 1
  [[ -n "$(field_value "$record_file" blocker_status)" ]] || return 1
}

expect_rejects() {
  local name="$1"
  shift

  if "$@"; then
    echo "signed-artifact verification fixture unexpectedly accepted: $name" >&2
    return 1
  fi
}

test -f "$DOC"

grep -q 'Fixture status: signed-artifact verification fixture only, not signed artifact verification evidence' "$DOC"
grep -q 'SHA256SUMS' "$DOC"
grep -q 'SHA256SUMS.sig' "$DOC"
grep -q 'public key fingerprint' "$DOC"
grep -q 'signature_verification_transcript' "$DOC"
grep -q 'artifact_hash_verification_transcript' "$DOC"
grep -q 'failure_transcript' "$DOC"
grep -q 'missing signed-artifact verification record' "$DOC"
grep -q 'missing `SHA256SUMS`' "$DOC"
grep -q 'missing `SHA256SUMS.sig`' "$DOC"
grep -q 'missing public key fingerprint' "$DOC"
grep -q 'mismatched record candidate commit' "$DOC"
grep -q 'mismatched record release tag' "$DOC"
grep -q 'mismatched record artifact manifest' "$DOC"
grep -q 'mismatched record artifact manifest digest' "$DOC"
grep -q 'stale `SHA256SUMS` digest' "$DOC"
grep -q 'stale `SHA256SUMS.sig` digest' "$DOC"
grep -q 'key ceremony fingerprint mismatch' "$DOC"
grep -q 'missing signature verification transcript' "$DOC"
grep -q 'missing artifact hash verification transcript' "$DOC"
grep -q 'missing failure transcript' "$DOC"
grep -q 'template-only evidence' "$DOC"
grep -q 'placeholder evidence' "$DOC"
grep -q 'empty blocker status' "$DOC"
grep -q 'does not verify detached signatures' "$DOC"
grep -q 'does not prove artifact authenticity' "$DOC"
grep -q 'does not collect candidate-specific release evidence' "$DOC"
grep -q 'does not approve release signing' "$DOC"
grep -q 'does not make Another Dimension Chat release-ready or v0.1-security-ready' "$DOC"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

valid_package="$tmp_root/valid"
write_valid_signed_artifact_fixture_package "$valid_package"
verify_signed_artifact_fixture_dir "$valid_package"

missing_record="$tmp_root/missing-record"
cp -R "$valid_package" "$missing_record"
rm "$missing_record/records/signed-artifact.record"
expect_rejects "missing signed-artifact verification record" verify_signed_artifact_fixture_dir "$missing_record"

missing_sha256sums="$tmp_root/missing-sha256sums"
cp -R "$valid_package" "$missing_sha256sums"
rm "$missing_sha256sums/SHA256SUMS"
expect_rejects "missing SHA256SUMS" verify_signed_artifact_fixture_dir "$missing_sha256sums"

missing_sig="$tmp_root/missing-sig"
cp -R "$valid_package" "$missing_sig"
rm "$missing_sig/SHA256SUMS.sig"
expect_rejects "missing SHA256SUMS.sig" verify_signed_artifact_fixture_dir "$missing_sig"

missing_fingerprint="$tmp_root/missing-fingerprint"
cp -R "$valid_package" "$missing_fingerprint"
awk -F= '$1 != "public_key_fingerprint" {print}' "$missing_fingerprint/records/signed-artifact.record" >"$missing_fingerprint/record.tmp"
mv "$missing_fingerprint/record.tmp" "$missing_fingerprint/records/signed-artifact.record"
expect_rejects "missing public key fingerprint" verify_signed_artifact_fixture_dir "$missing_fingerprint"

mismatched_commit="$tmp_root/mismatched-commit"
cp -R "$valid_package" "$mismatched_commit"
manifest_sha="$(sha256_file "$mismatched_commit/ARTIFACT_MANIFEST")"
sha256sums_sha="$(sha256_file "$mismatched_commit/SHA256SUMS")"
sig_sha="$(sha256_file "$mismatched_commit/SHA256SUMS.sig")"
write_signed_artifact_record "$mismatched_commit/records/signed-artifact.record" other-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha" SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint
expect_rejects "mismatched record candidate commit" verify_signed_artifact_fixture_dir "$mismatched_commit"

mismatched_tag="$tmp_root/mismatched-tag"
cp -R "$valid_package" "$mismatched_tag"
manifest_sha="$(sha256_file "$mismatched_tag/ARTIFACT_MANIFEST")"
sha256sums_sha="$(sha256_file "$mismatched_tag/SHA256SUMS")"
sig_sha="$(sha256_file "$mismatched_tag/SHA256SUMS.sig")"
write_signed_artifact_record "$mismatched_tag/records/signed-artifact.record" fixture-commit other-tag ARTIFACT_MANIFEST "$manifest_sha" SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint
expect_rejects "mismatched record release tag" verify_signed_artifact_fixture_dir "$mismatched_tag"

mismatched_manifest="$tmp_root/mismatched-manifest"
cp -R "$valid_package" "$mismatched_manifest"
manifest_sha="$(sha256_file "$mismatched_manifest/ARTIFACT_MANIFEST")"
sha256sums_sha="$(sha256_file "$mismatched_manifest/SHA256SUMS")"
sig_sha="$(sha256_file "$mismatched_manifest/SHA256SUMS.sig")"
write_signed_artifact_record "$mismatched_manifest/records/signed-artifact.record" fixture-commit fixture-v0.1.0 OTHER_MANIFEST "$manifest_sha" SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint
expect_rejects "mismatched record artifact manifest" verify_signed_artifact_fixture_dir "$mismatched_manifest"

mismatched_manifest_digest="$tmp_root/mismatched-manifest-digest"
cp -R "$valid_package" "$mismatched_manifest_digest"
sha256sums_sha="$(sha256_file "$mismatched_manifest_digest/SHA256SUMS")"
sig_sha="$(sha256_file "$mismatched_manifest_digest/SHA256SUMS.sig")"
write_signed_artifact_record "$mismatched_manifest_digest/records/signed-artifact.record" fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST stale-manifest-sha SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint
expect_rejects "mismatched record artifact manifest digest" verify_signed_artifact_fixture_dir "$mismatched_manifest_digest"

stale_sha256sums="$tmp_root/stale-sha256sums"
cp -R "$valid_package" "$stale_sha256sums"
printf 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb  changed\n' >>"$stale_sha256sums/SHA256SUMS"
expect_rejects "stale SHA256SUMS digest" verify_signed_artifact_fixture_dir "$stale_sha256sums"

stale_sig="$tmp_root/stale-sig"
cp -R "$valid_package" "$stale_sig"
printf 'changed signature bytes\n' >>"$stale_sig/SHA256SUMS.sig"
expect_rejects "stale SHA256SUMS.sig digest" verify_signed_artifact_fixture_dir "$stale_sig"

mismatched_fingerprint="$tmp_root/mismatched-fingerprint"
cp -R "$valid_package" "$mismatched_fingerprint"
printf 'public_key_fingerprint=other-fingerprint\n' >>"$mismatched_fingerprint/records/key-ceremony.record"
expect_rejects "key ceremony fingerprint mismatch" verify_signed_artifact_fixture_dir "$mismatched_fingerprint"

missing_signature_transcript="$tmp_root/missing-signature-transcript"
cp -R "$valid_package" "$missing_signature_transcript"
manifest_sha="$(sha256_file "$missing_signature_transcript/ARTIFACT_MANIFEST")"
sha256sums_sha="$(sha256_file "$missing_signature_transcript/SHA256SUMS")"
sig_sha="$(sha256_file "$missing_signature_transcript/SHA256SUMS.sig")"
write_signed_artifact_record "$missing_signature_transcript/records/signed-artifact.record" fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha" SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint '' fixture-hash-transcript fixture-failure-transcript
expect_rejects "missing signature verification transcript" verify_signed_artifact_fixture_dir "$missing_signature_transcript"

missing_hash_transcript="$tmp_root/missing-hash-transcript"
cp -R "$valid_package" "$missing_hash_transcript"
manifest_sha="$(sha256_file "$missing_hash_transcript/ARTIFACT_MANIFEST")"
sha256sums_sha="$(sha256_file "$missing_hash_transcript/SHA256SUMS")"
sig_sha="$(sha256_file "$missing_hash_transcript/SHA256SUMS.sig")"
write_signed_artifact_record "$missing_hash_transcript/records/signed-artifact.record" fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha" SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint fixture-signature-transcript '' fixture-failure-transcript
expect_rejects "missing artifact hash verification transcript" verify_signed_artifact_fixture_dir "$missing_hash_transcript"

missing_failure_transcript="$tmp_root/missing-failure-transcript"
cp -R "$valid_package" "$missing_failure_transcript"
manifest_sha="$(sha256_file "$missing_failure_transcript/ARTIFACT_MANIFEST")"
sha256sums_sha="$(sha256_file "$missing_failure_transcript/SHA256SUMS")"
sig_sha="$(sha256_file "$missing_failure_transcript/SHA256SUMS.sig")"
write_signed_artifact_record "$missing_failure_transcript/records/signed-artifact.record" fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha" SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint fixture-signature-transcript fixture-hash-transcript ''
expect_rejects "missing failure transcript" verify_signed_artifact_fixture_dir "$missing_failure_transcript"

template_only="$tmp_root/template-only"
cp -R "$valid_package" "$template_only"
manifest_sha="$(sha256_file "$template_only/ARTIFACT_MANIFEST")"
sha256sums_sha="$(sha256_file "$template_only/SHA256SUMS")"
sig_sha="$(sha256_file "$template_only/SHA256SUMS.sig")"
write_signed_artifact_record "$template_only/records/signed-artifact.record" fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha" SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint fixture-signature-transcript fixture-hash-transcript fixture-failure-transcript template-only
expect_rejects "template-only evidence" verify_signed_artifact_fixture_dir "$template_only"

placeholder="$tmp_root/placeholder"
cp -R "$valid_package" "$placeholder"
printf 'signature_verification_transcript=TODO-SIGNATURE\n' >>"$placeholder/records/signed-artifact.record"
expect_rejects "placeholder evidence" verify_signed_artifact_fixture_dir "$placeholder"

empty_blocker="$tmp_root/empty-blocker"
cp -R "$valid_package" "$empty_blocker"
manifest_sha="$(sha256_file "$empty_blocker/ARTIFACT_MANIFEST")"
sha256sums_sha="$(sha256_file "$empty_blocker/SHA256SUMS")"
sig_sha="$(sha256_file "$empty_blocker/SHA256SUMS.sig")"
write_signed_artifact_record "$empty_blocker/records/signed-artifact.record" fixture-commit fixture-v0.1.0 ARTIFACT_MANIFEST "$manifest_sha" SHA256SUMS "$sha256sums_sha" SHA256SUMS.sig "$sig_sha" fixture-fingerprint fixture-signature-transcript fixture-hash-transcript fixture-failure-transcript fixture-filled-not-release-evidence ''
expect_rejects "empty blocker status" verify_signed_artifact_fixture_dir "$empty_blocker"

printf 'release signing candidate signed-artifact verification fixture rejects missing/stale/mismatch states\n'
