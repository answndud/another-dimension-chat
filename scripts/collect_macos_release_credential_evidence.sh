#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

blocked() {
  echo "status=macos-release-credential-evidence-collector-blocked"
  fail "$*"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VALIDATOR="scripts/validate_macos_release_credential_evidence.mjs"
[ -f "$VALIDATOR" ] || fail "missing validator: $VALIDATOR"

OUTPUT="${1:-${AD_MACOS_CREDENTIAL_EVIDENCE_OUT:-docs/macos-release-credential-evidence/MACOS-CRED-0001.properties}}"
case "$OUTPUT" in
  docs/macos-release-credential-evidence/*) ;;
  *) fail "credential evidence output must stay under docs/macos-release-credential-evidence/" ;;
esac

DRY_RUN="${AD_MACOS_CREDENTIAL_EVIDENCE_DRY_RUN:-0}"

command -v git >/dev/null 2>&1 || fail "git is required"
command -v security >/dev/null 2>&1 || blocked "macOS security CLI is required"
command -v xcode-select >/dev/null 2>&1 || blocked "xcode-select is required"
command -v xcrun >/dev/null 2>&1 || blocked "xcrun is required"
command -v openssl >/dev/null 2>&1 || blocked "openssl is required"
command -v node >/dev/null 2>&1 || fail "node is required"

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[ "$BRANCH" = "main" ] || blocked "credential evidence must be collected from main"
SOURCE_COMMIT="$(git rev-parse HEAD 2>/dev/null || true)"
printf '%s' "$SOURCE_COMMIT" | grep -Eq '^[0-9a-f]{7,40}$' || fail "invalid source commit"

XCODE_PATH="$(xcode-select -p 2>/dev/null || true)"
[ -n "$XCODE_PATH" ] || blocked "Xcode developer directory is unavailable"

NOTARYTOOL_PATH="$(xcrun --find notarytool 2>/dev/null || true)"
[ -n "$NOTARYTOOL_PATH" ] || blocked "notarytool is unavailable"
NOTARYTOOL_VERSION="$(xcrun notarytool --version 2>/dev/null | sed -E 's/[^0-9]*([0-9]+(\.[0-9]+)*)( \([0-9]+\))?.*/\1\3/' || true)"
printf '%s' "$NOTARYTOOL_VERSION" | grep -Eq '^[0-9]+(\.[0-9]+)*( \([0-9]+\))?$' ||
  blocked "notarytool version is unavailable"

IDENTITY_OUTPUT="$(security find-identity -v -p codesigning 2>&1 || true)"
IDENTITY_LINE="$(
  printf '%s\n' "$IDENTITY_OUTPUT" |
    grep -E 'Developer ID Application: .+ \([A-Z0-9]{10}\)' |
    head -n 1 || true
)"
[ -n "$IDENTITY_LINE" ] || blocked "Developer ID Application identity is unavailable"

DEVELOPER_ID_SHA1="$(printf '%s\n' "$IDENTITY_LINE" | sed -E 's/^[[:space:]]*[0-9]+\) ([0-9A-Fa-f]{40}) .*/\1/' | tr 'A-F' 'a-f')"
printf '%s' "$DEVELOPER_ID_SHA1" | grep -Eq '^[0-9a-f]{40}$' ||
  blocked "Developer ID SHA-1 fingerprint is unavailable"

DEVELOPER_ID_COMMON_NAME="$(
  printf '%s\n' "$IDENTITY_LINE" |
    sed -E 's/^[[:space:]]*[0-9]+\) [0-9A-Fa-f]{40} "(.+)".*/\1/'
)"
APPLE_TEAM_ID="$(printf '%s\n' "$DEVELOPER_ID_COMMON_NAME" | sed -E 's/.*\(([A-Z0-9]{10})\).*/\1/')"
printf '%s' "$APPLE_TEAM_ID" | grep -Eq '^[A-Z0-9]{10}$' ||
  blocked "Apple Developer Team ID is unavailable"
REDACTED_COMMON_NAME="Developer ID Application: Redacted Owner ($APPLE_TEAM_ID)"

DEVELOPER_ID_CERT_PEM="$(security find-certificate -c "$DEVELOPER_ID_COMMON_NAME" -p 2>/dev/null || true)"
[ -n "$DEVELOPER_ID_CERT_PEM" ] || blocked "Developer ID certificate is unavailable"
DEVELOPER_ID_NOT_AFTER_RAW="$(
  printf '%s\n' "$DEVELOPER_ID_CERT_PEM" |
    openssl x509 -noout -enddate 2>/dev/null |
    sed 's/^notAfter=//' || true
)"
[ -n "$DEVELOPER_ID_NOT_AFTER_RAW" ] || blocked "Developer ID certificate expiry is unavailable"

CERT_EXPIRY="$(
  node - "$DEVELOPER_ID_NOT_AFTER_RAW" <<'NODE'
const raw = process.argv[2];
const expiry = new Date(raw);
if (Number.isNaN(expiry.getTime())) process.exit(1);
const now = new Date();
const daysRemaining = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
const date = expiry.toISOString().slice(0, 10);
console.log(`${date} ${daysRemaining}`);
NODE
)" || blocked "Developer ID certificate expiry could not be parsed"
DEVELOPER_ID_NOT_AFTER="$(printf '%s\n' "$CERT_EXPIRY" | awk '{print $1}')"
DEVELOPER_ID_DAYS_REMAINING="$(printf '%s\n' "$CERT_EXPIRY" | awk '{print $2}')"
if [ "$DEVELOPER_ID_DAYS_REMAINING" -lt 30 ] 2>/dev/null; then
  blocked "Developer ID certificate expires in fewer than 30 days"
fi

NOTARY_PROFILE="${AD_RELEASE_NOTARYTOOL_PROFILE:-${NOTARYTOOL_PROFILE:-}}"
NOTARY_MODE=""
if [ -n "$NOTARY_PROFILE" ]; then
  NOTARY_MODE="keychain-profile"
  xcrun notarytool history \
    --keychain-profile "$NOTARY_PROFILE" \
    --output-format json \
    --no-progress >/dev/null 2>&1 ||
    blocked "notarytool keychain profile did not validate"
elif [ -n "${AD_RELEASE_NOTARY_KEY:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_KEY_ID:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_ISSUER:-}" ]; then
  NOTARY_MODE="app-store-connect-api-key"
  xcrun notarytool history \
    --key "${AD_RELEASE_NOTARY_KEY}" \
    --key-id "${AD_RELEASE_NOTARY_KEY_ID}" \
    --issuer "${AD_RELEASE_NOTARY_ISSUER}" \
    --output-format json \
    --no-progress >/dev/null 2>&1 ||
    blocked "notarytool App Store Connect API key did not validate"
elif [ -n "${AD_RELEASE_NOTARY_APPLE_ID:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_PASSWORD:-}" ] &&
  [ -n "${AD_RELEASE_APPLE_TEAM_ID:-}" ]; then
  NOTARY_MODE="apple-id-app-specific-password"
  xcrun notarytool history \
    --apple-id "${AD_RELEASE_NOTARY_APPLE_ID}" \
    --password "${AD_RELEASE_NOTARY_PASSWORD}" \
    --team-id "${AD_RELEASE_APPLE_TEAM_ID}" \
    --output-format json \
    --no-progress >/dev/null 2>&1 ||
    blocked "notarytool Apple ID credential did not validate"
else
  blocked "notarization credential marker is unavailable"
fi

CHECKED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

cat >"$tmp_file" <<EVIDENCE
schema_version=macos-release-credential-evidence-v1
evidence_id=MACOS-CRED-0001
evidence_subject=developer-id-and-notary-readiness
collection_scope=release-machine
repository=answndud/another-dimension-chat
branch=main
source_commit=$SOURCE_COMMIT
apple_team_id=$APPLE_TEAM_ID
developer_id_common_name=$REDACTED_COMMON_NAME
developer_id_team_id=$APPLE_TEAM_ID
developer_id_sha1=$DEVELOPER_ID_SHA1
developer_id_not_after=$DEVELOPER_ID_NOT_AFTER
developer_id_days_remaining=$DEVELOPER_ID_DAYS_REMAINING
codesigning_identity_observed=true
certificate_expiry_inspected=true
xcode_path_redacted=true
notarytool_version=$NOTARYTOOL_VERSION
notary_credential_mode=$NOTARY_MODE
notary_credential_label_redacted=true
notary_history_check=pass
notary_history_checked_at_utc=$CHECKED_AT
release_mutation_authorized=false
dmg_rebuild_authorized=false
secret_material_included=false
public_non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
EVIDENCE

node "$VALIDATOR" "$tmp_file" >/dev/null

if [ "$DRY_RUN" = "1" ]; then
  cat <<'STATUS'
status=macos-release-credential-evidence-collector-ready-dry-run
macos_release_credential_evidence_collector_ready=true
m100_1_release_credential_evidence_candidate=true
m100_1_release_credentials_ready=false
release_upload_authorized=false
dmg_rebuild_authorized=false
STATUS
  exit 0
fi

mkdir -p "$(dirname "$OUTPUT")"
umask 077
cp "$tmp_file" "$OUTPUT"

cat <<STATUS
status=macos-release-credential-evidence-collected
macos_release_credential_evidence_collector_ready=true
credential_evidence_output=$OUTPUT
m100_1_release_credential_evidence_candidate=true
m100_1_release_credentials_ready=false
release_upload_authorized=false
dmg_rebuild_authorized=false
STATUS
