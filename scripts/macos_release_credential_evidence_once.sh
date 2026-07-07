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
CREDENTIAL_GATE="reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
BLOCKER_PLAN="reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"

for file in "$SCHEMA" "$VALIDATOR" "$CREDENTIAL_GATE" "$BLOCKER_PLAN" "$MATRIX" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing M100-1 credential evidence input: $file"
done

for flag in \
  "macos_release_credential_evidence_schema_available=true" \
  "macos_release_credential_evidence_validator_available=true" \
  "macos_release_credential_evidence_intake_ready=true" \
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
must_contain "$SCHEMA" "scripts/macos_release_credential_evidence_once.sh"
must_contain "$VALIDATOR" "status=macos-release-credential-evidence-candidate-requires-live-verifier"
must_contain "$CREDENTIAL_GATE" "MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"
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
trap 'rm -rf "$tmp_dir"' EXIT

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
macos_release_credential_evidence_intake_ready=true
m100_1_release_credential_evidence_candidate=false
m100_1_release_credentials_ready=false
release_upload_authorized=false
dmg_rebuild_authorized=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
next_required_phase=Phase-M100-1-macOS-Public-App-Distribution-Credential-Unblock
STATUS
