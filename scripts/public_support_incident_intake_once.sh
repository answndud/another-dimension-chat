#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing public support incident intake text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden public support incident intake text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_INTAKE="$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
PUBLIC_TRIAGE="$ROOT_DIR/reference/PUBLIC_SUPPORT_TRIAGE.md"
SECURITY="$ROOT_DIR/SECURITY.md"
PUBLIC_TEMPLATE="$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml"
SECURITY_TEMPLATE="$ROOT_DIR/.github/ISSUE_TEMPLATE/security_contact_request.yml"
DESKTOP_STATE="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js"
DESKTOP_STATE_TEST="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js"
PREFLIGHT="$ROOT_DIR/scripts/public_release_readiness_preflight.sh"

ALLOWED_FIELDS="app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness"
FORBIDDEN_FIELDS="raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"

for file in \
  "$PUBLIC_INTAKE" \
  "$PUBLIC_TRIAGE" \
  "$SECURITY" \
  "$PUBLIC_TEMPLATE" \
  "$SECURITY_TEMPLATE" \
  "$DESKTOP_STATE" \
  "$DESKTOP_STATE_TEST" \
  "$PREFLIGHT"; do
  if [ ! -f "$file" ]; then
    echo "FAIL missing public support incident intake input: $file" >&2
    exit 1
  fi
done

require_text "$PUBLIC_INTAKE" "Allowed Public Intake"
require_text "$PUBLIC_INTAKE" "app status"
require_text "$PUBLIC_INTAKE" "checksum result"
require_text "$PUBLIC_INTAKE" "release class readiness"
require_text "$PUBLIC_INTAKE" "Forbidden Public Intake"
require_text "$PUBLIC_INTAKE" "support bundles"
require_text "$PUBLIC_INTAKE" "Ask only for a private contact path."
require_text "$PUBLIC_INTAKE" "Use GitHub private vulnerability reporting when available."
require_text "$PUBLIC_INTAKE" "Public reports may include only:"
require_text "$PUBLIC_INTAKE" "Do not post:"

require_text "$PUBLIC_TRIAGE" "Ask for public support diagnostics only."
require_text "$PUBLIC_TRIAGE" "Do not ask for raw logs"
require_text "$PUBLIC_TRIAGE" "support bundles"
require_text "$PUBLIC_TRIAGE" "private vulnerability reporting"
require_text "$PUBLIC_TRIAGE" "Do not request"
require_text "$PUBLIC_TRIAGE" "exploit details"
require_text "$PUBLIC_TRIAGE" "payload samples"
require_text "$PUBLIC_TRIAGE" "endpoint details"
require_text "$PUBLIC_TRIAGE" "Do not request support bundles or crash artifacts in public issues."
require_text "$PUBLIC_TRIAGE" "needs-private-security-contact"

require_text "$SECURITY" "redacted public support diagnostics"
require_text "$SECURITY" "minimal public issue"
require_text "$SECURITY" "ask only for a private contact path"
require_text "$SECURITY" "support bundles"
require_text "$SECURITY" "release class readiness"
require_text "$SECURITY" "must not request"

require_text "$PUBLIC_TEMPLATE" "Public diagnostics only"
require_text "$PUBLIC_TEMPLATE" "screenshots of private room data"
require_text "$PUBLIC_TEMPLATE" "support bundles"
require_text "$PUBLIC_TEMPLATE" "private security contact request"
require_text "$SECURITY_TEMPLATE" "private contact path"
require_text "$SECURITY_TEMPLATE" "support bundles"

require_text "$DESKTOP_STATE" "PUBLIC_SUPPORT_DIAGNOSTICS_ALLOWED_FIELDS"
require_text "$DESKTOP_STATE" "PUBLIC_SUPPORT_DIAGNOSTICS_FORBIDDEN_FIELDS"
require_text "$DESKTOP_STATE_TEST" "allowed_public_intake_fields=$ALLOWED_FIELDS"
require_text "$DESKTOP_STATE_TEST" "forbidden_public_intake_fields=$FORBIDDEN_FIELDS"
require_text "$PREFLIGHT" "real_user_test_allowed_fields=$ALLOWED_FIELDS"
require_text "$PREFLIGHT" "real_user_test_forbidden_fields=$FORBIDDEN_FIELDS"

reject_text "$PUBLIC_INTAKE" "paste raw logs"
reject_text "$PUBLIC_TRIAGE" "send crash dump"
reject_text "$PUBLIC_TEMPLATE" "Attach logs"
reject_text "$SECURITY_TEMPLATE" "Paste exploit details"

printf '%s\n' "status=public-support-incident-intake-ready"
printf '%s\n' "public_issue_intake=redacted-diagnostics-only"
printf '%s\n' "private_vulnerability_intake=private-reporting-or-minimal-contact-request"
printf '%s\n' "public_support_allowed_fields=$ALLOWED_FIELDS"
printf '%s\n' "public_support_forbidden_fields=$FORBIDDEN_FIELDS"
printf '%s\n' "raw_logs_requested=false"
printf '%s\n' "crash_dumps_requested=false"
printf '%s\n' "screenshots_requested=false"
printf '%s\n' "support_bundles_requested=false"
printf '%s\n' "production_ready_claim_allowed=false"
