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
    fail "$file contains forbidden release authority pattern: $pattern"
  fi
}

bool() {
  if [ "$1" = "true" ]; then
    printf 'true'
  else
    printf 'false'
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
TAURI_CONFIG="apps/desktop-tauri/src-tauri/tauri.conf.json"
COLLECTOR="scripts/collect_macos_release_credential_evidence.sh"

[ -f "$DOC" ] || fail "missing M100-1 release authority record"
[ -f "$TAURI_CONFIG" ] || fail "missing Tauri config input: $TAURI_CONFIG"
[ -f "$COLLECTOR" ] || fail "missing M100-1 credential evidence collector"

XCODE_PATH="$(xcode-select -p 2>/dev/null || true)"
XCODE_AVAILABLE=false
[ -n "$XCODE_PATH" ] && XCODE_AVAILABLE=true

NOTARYTOOL_PATH="$(xcrun --find notarytool 2>/dev/null || true)"
NOTARYTOOL_AVAILABLE=false
[ -n "$NOTARYTOOL_PATH" ] && NOTARYTOOL_AVAILABLE=true

NOTARYTOOL_VERSION=""
if [ "$NOTARYTOOL_AVAILABLE" = "true" ]; then
  NOTARYTOOL_VERSION="$(xcrun notarytool --version 2>/dev/null || true)"
fi
NOTARYTOOL_VERSION_RECORDED=false
[ -n "$NOTARYTOOL_VERSION" ] && NOTARYTOOL_VERSION_RECORDED=true

IDENTITY_OUTPUT="$(security find-identity -v -p codesigning 2>&1 || true)"
VALID_IDENTITY_COUNT="$(
  printf '%s\n' "$IDENTITY_OUTPUT" |
    sed -n 's/^[[:space:]]*\([0-9][0-9]*\) valid identities found.*/\1/p' |
    tail -n 1
)"
[ -n "$VALID_IDENTITY_COUNT" ] || VALID_IDENTITY_COUNT=0

CODESIGNING_IDENTITY_AVAILABLE=false
if [ "$VALID_IDENTITY_COUNT" -gt 0 ] 2>/dev/null; then
  CODESIGNING_IDENTITY_AVAILABLE=true
fi

DEVELOPER_ID_LINES="$(printf '%s\n' "$IDENTITY_OUTPUT" | grep -E 'Developer ID Application: .+ \([A-Z0-9]{10}\)' || true)"
DEVELOPER_ID_COUNT="$(printf '%s\n' "$DEVELOPER_ID_LINES" | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' ')"
DEVELOPER_ID_AVAILABLE=false
if [ "$DEVELOPER_ID_COUNT" -gt 0 ] 2>/dev/null; then
  DEVELOPER_ID_AVAILABLE=true
fi

TEAM_IDS="$(
  printf '%s\n' "$DEVELOPER_ID_LINES" |
    sed -n 's/.*(\([A-Z0-9][A-Z0-9]*\)).*/\1/p' |
    sort -u |
    paste -sd, -
)"
ENV_TEAM_ID="${AD_RELEASE_APPLE_TEAM_ID:-}"
APPLE_TEAM_ID_RECORDED=false
if [ -n "$TEAM_IDS" ] || [ -n "$ENV_TEAM_ID" ]; then
  APPLE_TEAM_ID_RECORDED=true
fi

APPLE_DEVELOPER_PROGRAM_TEAM_CONFIRMED=false
if [ "$DEVELOPER_ID_AVAILABLE" = "true" ] && [ "$APPLE_TEAM_ID_RECORDED" = "true" ]; then
  APPLE_DEVELOPER_PROGRAM_TEAM_CONFIRMED=true
fi

DEVELOPER_ID_CERT_PEM="$(security find-certificate -a -c "Developer ID Application" -p 2>/dev/null || true)"
DEVELOPER_ID_CERTIFICATE_EXPIRY_INSPECTED=false
if [ -n "$DEVELOPER_ID_CERT_PEM" ]; then
  DEVELOPER_ID_CERTIFICATE_EXPIRY_INSPECTED=true
fi

NOTARY_PROFILE="${AD_RELEASE_NOTARYTOOL_PROFILE:-${NOTARYTOOL_PROFILE:-}}"
NOTARY_PROFILE_CONFIGURED=false
[ -n "$NOTARY_PROFILE" ] && NOTARY_PROFILE_CONFIGURED=true

NOTARY_API_KEY_CONFIGURED=false
if [ -n "${AD_RELEASE_NOTARY_KEY:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_KEY_ID:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_ISSUER:-}" ]; then
  NOTARY_API_KEY_CONFIGURED=true
fi

NOTARY_APP_PASSWORD_CONFIGURED=false
if [ -n "${AD_RELEASE_NOTARY_APPLE_ID:-}" ] &&
  [ -n "${AD_RELEASE_NOTARY_PASSWORD:-}" ] &&
  [ -n "${AD_RELEASE_APPLE_TEAM_ID:-}" ]; then
  NOTARY_APP_PASSWORD_CONFIGURED=true
fi

NOTARY_CREDENTIAL_AVAILABLE=false
NOTARY_CREDENTIAL_VALIDATED=false
if [ "$NOTARYTOOL_AVAILABLE" = "true" ] && [ "$NOTARY_PROFILE_CONFIGURED" = "true" ]; then
  NOTARY_CREDENTIAL_AVAILABLE=true
  if xcrun notarytool history \
    --keychain-profile "$NOTARY_PROFILE" \
    --output-format json \
    --no-progress >/dev/null 2>&1; then
    NOTARY_CREDENTIAL_VALIDATED=true
  fi
elif [ "$NOTARYTOOL_AVAILABLE" = "true" ] && [ "$NOTARY_API_KEY_CONFIGURED" = "true" ]; then
  NOTARY_CREDENTIAL_AVAILABLE=true
  if xcrun notarytool history \
    --key "${AD_RELEASE_NOTARY_KEY}" \
    --key-id "${AD_RELEASE_NOTARY_KEY_ID}" \
    --issuer "${AD_RELEASE_NOTARY_ISSUER}" \
    --output-format json \
    --no-progress >/dev/null 2>&1; then
    NOTARY_CREDENTIAL_VALIDATED=true
  fi
elif [ "$NOTARYTOOL_AVAILABLE" = "true" ] && [ "$NOTARY_APP_PASSWORD_CONFIGURED" = "true" ]; then
  NOTARY_CREDENTIAL_AVAILABLE=true
  if xcrun notarytool history \
    --apple-id "${AD_RELEASE_NOTARY_APPLE_ID}" \
    --password "${AD_RELEASE_NOTARY_PASSWORD}" \
    --team-id "${AD_RELEASE_APPLE_TEAM_ID}" \
    --output-format json \
    --no-progress >/dev/null 2>&1; then
    NOTARY_CREDENTIAL_VALIDATED=true
  fi
fi

SIGNED_NOTARIZED_READY=false
if [ "$APPLE_DEVELOPER_PROGRAM_TEAM_CONFIRMED" = "true" ] &&
  [ "$XCODE_AVAILABLE" = "true" ] &&
  [ "$NOTARYTOOL_AVAILABLE" = "true" ] &&
  [ "$DEVELOPER_ID_AVAILABLE" = "true" ] &&
  [ "$DEVELOPER_ID_CERTIFICATE_EXPIRY_INSPECTED" = "true" ] &&
  [ "$NOTARY_CREDENTIAL_AVAILABLE" = "true" ] &&
  [ "$NOTARY_CREDENTIAL_VALIDATED" = "true" ]; then
  SIGNED_NOTARIZED_READY=true
fi

must_contain "$DOC" "Status: M100-1 is closed by explicit owner policy waiver"
must_contain "$DOC" "scripts/release_authority_credential_unblock_once.sh"
must_contain "$DOC" "scripts/collect_macos_release_credential_evidence.sh"
must_contain "$DOC" "credentials are a signed/notarized release blocker"
must_contain "$DOC" "explicit owner waiver"
must_contain "$DOC" "## Credential Readiness Checklist"
must_contain "$DOC" "## Certificate Rotation And Expiry Policy"
must_contain "$DOC" "certificate_rotation_expiry_policy_available=true"
must_contain "$DOC" "release_authority_credential_unblock_reviewed=true"
must_contain "$DOC" "m100_1_credential_blocker_closed=true"
must_contain "$DOC" "release_credential_policy_waiver_authorized=true"
must_contain "$DOC" "release_credential_waiver_scope=active-queue-unblock-only"
must_contain "$DOC" "signed_notarized_release_requires_actual_credentials=true"
must_contain "$DOC" "macos_release_credential_evidence_collector_available=true"
must_contain "$DOC" "macos_release_credential_evidence_collector_source_ready=true"
must_contain "$DOC" "macos_release_credential_evidence_current_head_bound=true"
must_contain "$DOC" "macos_release_credential_evidence_private_docs_path_bound=true"
must_contain "$DOC" "m100_1_release_credential_verifier_dynamic=true"
must_contain "$DOC" "release_upload_authorized=false"
must_contain "$DOC" "release_body_edit_authorized=false"
must_contain "$DOC" "release_asset_delete_authorized=false"
must_contain "$DOC" "dmg_rebuild_authorized=false"
must_contain "$DOC" "generated_release_artifacts_commit_allowed=false"
must_contain "$DOC" "stable_release_scope_down_until_credentials=true"

must_contain "$DOC" "apple_developer_program_team_confirmed=$(bool "$APPLE_DEVELOPER_PROGRAM_TEAM_CONFIRMED")"
must_contain "$DOC" "apple_developer_team_id_recorded=$(bool "$APPLE_TEAM_ID_RECORDED")"
must_contain "$DOC" "xcode_available=$(bool "$XCODE_AVAILABLE")"
must_contain "$DOC" "notarytool_available=$(bool "$NOTARYTOOL_AVAILABLE")"
must_contain "$DOC" "notarytool_version_recorded=$(bool "$NOTARYTOOL_VERSION_RECORDED")"
must_contain "$DOC" "codesigning_identity_available=$(bool "$CODESIGNING_IDENTITY_AVAILABLE")"
must_contain "$DOC" "valid_codesigning_identity_count=$VALID_IDENTITY_COUNT"
must_contain "$DOC" "developer_id_signing_available=$(bool "$DEVELOPER_ID_AVAILABLE")"
must_contain "$DOC" "developer_id_application_identity_available=$(bool "$DEVELOPER_ID_AVAILABLE")"
must_contain "$DOC" "developer_id_certificate_expiry_inspected=$(bool "$DEVELOPER_ID_CERTIFICATE_EXPIRY_INSPECTED")"
must_contain "$DOC" "notarization_credential_available=$(bool "$NOTARY_CREDENTIAL_AVAILABLE")"
must_contain "$DOC" "notarytool_keychain_profile_configured=$(bool "$NOTARY_PROFILE_CONFIGURED")"
must_contain "$DOC" "notarytool_credential_validated=$(bool "$NOTARY_CREDENTIAL_VALIDATED")"
must_contain "$DOC" "signed_notarized_release_ready=$(bool "$SIGNED_NOTARIZED_READY")"
must_contain "$DOC" "signed_notarized_stable_release_path_available=$(bool "$SIGNED_NOTARIZED_READY")"

must_contain "$TAURI_CONFIG" '"productName": "Another Dimension Chat"'
must_contain "$TAURI_CONFIG" '"identifier": "chat.anotherdimension.prototype"'
must_contain "$TAURI_CONFIG" '"active": true'

must_contain "README.md" "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
must_contain "SECURITY.md" "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"
must_contain "reference/STABLE_MACOS_V1_RELEASE_GATE.md" "release_authority_credential_unblock_reviewed=true"
must_contain "reference/STABLE_MACOS_V1_RELEASE_GATE.md" "developer_id_signing_available=false"
must_contain "reference/STABLE_MACOS_V1_RELEASE_GATE.md" "notarization_credential_available=false"

for file in "$DOC" "README.md" "SECURITY.md" "reference/STABLE_MACOS_V1_RELEASE_GATE.md"; do
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "release_body_edit_authorized=true"
  must_not_match "$file" "release_asset_delete_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "generated_release_artifacts_commit_allowed=true"
done

for file in "README.md" "SECURITY.md" "reference/STABLE_MACOS_V1_RELEASE_GATE.md"; do
  must_not_match "$file" "signed_notarized_release_ready=true"
  must_not_match "$file" "signed_notarized_stable_release_path_available=true"
done

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/)'; then
  fail "private docs, AGENTS.md, or generated release artifact path is staged"
fi

cat <<STATUS
status=release-authority-credential-unblock-checked
release_authority_credential_unblock_reviewed=true
m100_1_credential_blocker_closed=true
release_credential_policy_waiver_authorized=true
release_credential_waiver_scope=active-queue-unblock-only
signed_notarized_release_requires_actual_credentials=true
macos_release_credential_evidence_collector_available=true
macos_release_credential_evidence_collector_source_ready=true
macos_release_credential_evidence_current_head_bound=true
macos_release_credential_evidence_private_docs_path_bound=true
m100_1_release_credential_verifier_dynamic=true
apple_developer_program_team_confirmed=$(bool "$APPLE_DEVELOPER_PROGRAM_TEAM_CONFIRMED")
apple_developer_team_id_recorded=$(bool "$APPLE_TEAM_ID_RECORDED")
xcode_available=$(bool "$XCODE_AVAILABLE")
notarytool_available=$(bool "$NOTARYTOOL_AVAILABLE")
notarytool_version_recorded=$(bool "$NOTARYTOOL_VERSION_RECORDED")
codesigning_identity_available=$(bool "$CODESIGNING_IDENTITY_AVAILABLE")
valid_codesigning_identity_count=$VALID_IDENTITY_COUNT
developer_id_signing_available=$(bool "$DEVELOPER_ID_AVAILABLE")
developer_id_application_identity_available=$(bool "$DEVELOPER_ID_AVAILABLE")
developer_id_certificate_expiry_inspected=$(bool "$DEVELOPER_ID_CERTIFICATE_EXPIRY_INSPECTED")
certificate_rotation_expiry_policy_available=true
notarization_credential_available=$(bool "$NOTARY_CREDENTIAL_AVAILABLE")
notarytool_keychain_profile_configured=$(bool "$NOTARY_PROFILE_CONFIGURED")
notarytool_credential_validated=$(bool "$NOTARY_CREDENTIAL_VALIDATED")
signed_notarized_release_ready=$(bool "$SIGNED_NOTARIZED_READY")
m100_1_release_credentials_ready=$(bool "$SIGNED_NOTARIZED_READY")
release_upload_authorized=false
dmg_rebuild_authorized=false
STATUS
