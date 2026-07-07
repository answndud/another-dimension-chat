#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden macOS credential evidence pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCHEMA="reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"
VALIDATOR="scripts/validate_macos_release_credential_evidence.mjs"
COLLECTOR="scripts/collect_macos_release_credential_evidence.sh"
CREDENTIAL_GATE="reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
BLOCKER_PLAN="reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"

for file in "$SCHEMA" "$VALIDATOR" "$COLLECTOR" "$CREDENTIAL_GATE" "$BLOCKER_PLAN" "$MATRIX" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing M100-1 credential evidence input: $file"
done

for flag in \
  "macos_release_credential_evidence_schema_available=true" \
  "macos_release_credential_evidence_validator_available=true" \
  "macos_release_credential_evidence_collector_available=true" \
  "macos_release_credential_evidence_collector_source_ready=true" \
  "macos_release_credential_evidence_intake_ready=true" \
  "macos_release_credential_evidence_current_head_bound=true" \
  "macos_release_credential_evidence_private_docs_path_bound=true" \
  "macos_release_credential_evidence_private_docs_required=true" \
  "macos_release_credential_evidence_secret_redaction_required=true" \
  "m100_1_release_credential_evidence_candidate=false" \
  "m100_1_release_credentials_ready=false" \
  "developer_id_signing_available=false" \
  "apple_developer_team_id_recorded=false" \
  "notarization_credential_available=false" \
  "notarytool_credential_validated=false" \
  "release_upload_authorized=false" \
  "dmg_rebuild_authorized=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$SCHEMA" "$flag"
done

must_contain "$SCHEMA" "docs/macos-release-credential-evidence/"
must_contain "$SCHEMA" "scripts/validate_macos_release_credential_evidence.mjs"
must_contain "$SCHEMA" "scripts/collect_macos_release_credential_evidence.sh"
must_contain "$SCHEMA" "scripts/macos_release_credential_evidence_once.sh"
must_contain "$VALIDATOR" "status=macos-release-credential-evidence-candidate-requires-live-verifier"
must_contain "$VALIDATOR" "AD_REQUIRE_CURRENT_HEAD"
must_contain "$VALIDATOR" "AD_REQUIRE_PRIVATE_DOCS_PATH"
must_contain "$VALIDATOR" "source-commit-not-current-head"
must_contain "$VALIDATOR" "evidence-file-outside-private-docs"
must_contain "$COLLECTOR" "AD_MACOS_CREDENTIAL_EVIDENCE_DRY_RUN"
must_contain "$COLLECTOR" "xcrun notarytool history"
must_contain "$COLLECTOR" "secret_material_included=false"
must_contain "$COLLECTOR" "xcode_path_redacted=true"
must_contain "$COLLECTOR" "release_mutation_authorized=false"
must_contain "$CREDENTIAL_GATE" "MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"
must_contain "$CREDENTIAL_GATE" "scripts/collect_macos_release_credential_evidence.sh"
must_contain "$BLOCKER_PLAN" "MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"
must_contain "$MATRIX" "MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"
must_contain "README.md" "reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"
must_contain "SECURITY.md" "reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"

for file in "$SCHEMA" "$CREDENTIAL_GATE" "$BLOCKER_PLAN" "$MATRIX" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "m100_1_release_credentials_ready=true"
  must_not_match "$file" "developer_id_signing_available=true"
  must_not_match "$file" "notarization_credential_available=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

empty_output="$(node "$VALIDATOR" "$ROOT/docs/macos-release-credential-evidence")"
printf '%s\n' "$empty_output" | grep -Fq "credential_evidence_files_found=0" || fail "empty credential evidence run did not report zero files"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-macos-release-credential-evidence" || fail "empty credential evidence run did not wait"

tmp_dir="$(mktemp -d)"
private_tmp_dir="$ROOT/docs/macos-release-credential-evidence/.verifier-$$"
mkdir -p "$private_tmp_dir"
trap 'rm -rf "$tmp_dir" "$private_tmp_dir"' EXIT

cat >"$tmp_dir/valid.properties" <<'EVIDENCE'
schema_version=macos-release-credential-evidence-v1
evidence_id=MACOS-CRED-0001
evidence_subject=developer-id-and-notary-readiness
collection_scope=release-machine
repository=answndud/another-dimension-chat
branch=main
source_commit=abcdef1234567890
apple_team_id=ABCDE12345
developer_id_common_name=Developer ID Application: Redacted Owner (ABCDE12345)
developer_id_team_id=ABCDE12345
developer_id_sha1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
developer_id_not_after=2027-12-31
developer_id_days_remaining=365
codesigning_identity_observed=true
certificate_expiry_inspected=true
xcode_path_redacted=true
notarytool_version=1.1.2 (41)
notary_credential_mode=keychain-profile
notary_credential_label_redacted=true
notary_history_check=pass
notary_history_checked_at_utc=2026-06-13T12:00:00Z
release_mutation_authorized=false
dmg_rebuild_authorized=false
secret_material_included=false
public_non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
EVIDENCE

candidate_output="$(node "$VALIDATOR" "$tmp_dir/valid.properties")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_macos_release_credential_evidence=1" || fail "validator did not accept valid credential evidence"
printf '%s\n' "$candidate_output" | grep -Fq "m100_1_release_credential_evidence_candidate=true" || fail "valid evidence did not become a candidate"
printf '%s\n' "$candidate_output" | grep -Fq "m100_1_release_credentials_ready=false" || fail "evidence validator must not bypass live credential verifier"
printf '%s\n' "$candidate_output" | grep -Fq "status=macos-release-credential-evidence-candidate-requires-live-verifier" || fail "valid evidence did not require live verifier"

if AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" "$tmp_dir/valid.properties" >"$tmp_dir/stale.out" 2>&1; then
  fail "strict validator accepted stale source commit evidence"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale.out" || fail "strict validator did not report stale source commit"

current_head="$(git rev-parse HEAD)"
sed "s/^source_commit=.*/source_commit=$current_head/" "$tmp_dir/valid.properties" >"$tmp_dir/current.properties"
current_output="$(AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" "$tmp_dir/current.properties")"
printf '%s\n' "$current_output" | grep -Fq "credential_evidence_current_head_required=true" || fail "strict validator did not report current-head requirement"
printf '%s\n' "$current_output" | grep -Fq "accepted_macos_release_credential_evidence=1" || fail "strict validator did not accept current HEAD evidence"

if AD_REQUIRE_PRIVATE_DOCS_PATH=1 node "$VALIDATOR" "$tmp_dir/current.properties" >"$tmp_dir/path.out" 2>&1; then
  fail "strict validator accepted credential evidence outside private docs path"
fi
grep -Fq "evidence-file-outside-private-docs" "$tmp_dir/path.out" || fail "strict validator did not report outside private docs path"

cp "$tmp_dir/current.properties" "$private_tmp_dir/current.properties"
private_path_output="$(
  AD_REQUIRE_CURRENT_HEAD=1 AD_REQUIRE_PRIVATE_DOCS_PATH=1 node "$VALIDATOR" "$private_tmp_dir/current.properties"
)"
printf '%s\n' "$private_path_output" | grep -Fq "credential_evidence_private_docs_path_required=true" ||
  fail "strict validator did not report private docs path requirement"
printf '%s\n' "$private_path_output" | grep -Fq "accepted_macos_release_credential_evidence=1" ||
  fail "strict validator did not accept current HEAD evidence under private docs path"

collector_status=0
collector_output="$(AD_MACOS_CREDENTIAL_EVIDENCE_DRY_RUN=1 "$ROOT/scripts/collect_macos_release_credential_evidence.sh" 2>&1)" || collector_status=$?
if [ "$collector_status" -eq 0 ]; then
  printf '%s\n' "$collector_output" | grep -Fq "status=macos-release-credential-evidence-collector-ready-dry-run" ||
    fail "credential collector dry-run did not report ready status"
  printf '%s\n' "$collector_output" | grep -Fq "m100_1_release_credentials_ready=false" ||
    fail "credential collector must not bypass live release gate"
else
  printf '%s\n' "$collector_output" | grep -Fq "status=macos-release-credential-evidence-collector-blocked" ||
    fail "credential collector blocked status was not reported"
fi

cat >"$tmp_dir/secret.properties" <<'EVIDENCE'
schema_version=macos-release-credential-evidence-v1
evidence_id=MACOS-CRED-0002
evidence_subject=developer-id-and-notary-readiness
collection_scope=release-machine
repository=answndud/another-dimension-chat
branch=main
source_commit=abcdef1234567890
apple_team_id=ABCDE12345
developer_id_common_name=Developer ID Application: Redacted Owner (ABCDE12345)
developer_id_team_id=ABCDE12345
developer_id_sha1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
developer_id_not_after=2027-12-31
developer_id_days_remaining=365
codesigning_identity_observed=true
certificate_expiry_inspected=true
xcode_path_redacted=true
notarytool_version=1.1.2 (41)
notary_credential_mode=keychain-profile
notary_credential_label_redacted=true
notary_history_check=pass
notary_history_checked_at_utc=2026-06-13T12:00:00Z
release_mutation_authorized=false
dmg_rebuild_authorized=false
secret_material_included=false
public_non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
leak=-----BEGIN PRIVATE KEY-----
EVIDENCE

if node "$VALIDATOR" "$tmp_dir/secret.properties" >"$tmp_dir/secret.out" 2>&1; then
  fail "validator accepted private key material"
fi
grep -Fq "forbidden-content:private-debug-data" "$tmp_dir/secret.out" || fail "private key rejection was not reported"

cat >"$tmp_dir/expired.properties" <<'EVIDENCE'
schema_version=macos-release-credential-evidence-v1
evidence_id=MACOS-CRED-0003
evidence_subject=developer-id-and-notary-readiness
collection_scope=release-machine
repository=answndud/another-dimension-chat
branch=main
source_commit=abcdef1234567890
apple_team_id=ABCDE12345
developer_id_common_name=Developer ID Application: Redacted Owner (ABCDE12345)
developer_id_team_id=ABCDE12345
developer_id_sha1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
developer_id_not_after=2026-06-20
developer_id_days_remaining=7
codesigning_identity_observed=true
certificate_expiry_inspected=true
xcode_path_redacted=true
notarytool_version=1.1.2 (41)
notary_credential_mode=keychain-profile
notary_credential_label_redacted=true
notary_history_check=pass
notary_history_checked_at_utc=2026-06-13T12:00:00Z
release_mutation_authorized=false
dmg_rebuild_authorized=false
secret_material_included=false
public_non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
EVIDENCE

if node "$VALIDATOR" "$tmp_dir/expired.properties" >"$tmp_dir/expired.out" 2>&1; then
  fail "validator accepted certificate expiring in fewer than 30 days"
fi
grep -Fq "developer-id-expiry-too-soon" "$tmp_dir/expired.out" || fail "certificate expiry rejection was not reported"

cat <<'STATUS'
status=macos-release-credential-evidence-intake-ready
macos_release_credential_evidence_schema_available=true
macos_release_credential_evidence_validator_available=true
macos_release_credential_evidence_collector_available=true
macos_release_credential_evidence_collector_source_ready=true
macos_release_credential_evidence_intake_ready=true
macos_release_credential_evidence_current_head_bound=true
macos_release_credential_evidence_private_docs_path_bound=true
m100_1_release_credential_evidence_candidate=false
m100_1_release_credentials_ready=false
release_upload_authorized=false
dmg_rebuild_authorized=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
next_required_phase=Phase-M100-6-macOS-Representative-Usability-Evidence
STATUS
