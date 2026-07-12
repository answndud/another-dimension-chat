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

require_output_text() {
  local output="$1"
  local text="$2"
  if ! printf '%s\n' "$output" | grep -Fq -- "$text"; then
    echo "FAIL missing public support dry-run output: $text" >&2
    exit 1
  fi
}

reject_output_text() {
  local output="$1"
  local text="$2"
  if printf '%s\n' "$output" | grep -Fq -- "$text"; then
    echo "FAIL forbidden public support dry-run output: $text" >&2
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

ALLOWED_FIELDS="app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness#high-risk-runtime-evidence-source#high-risk-runtime-evidence-accepted#high-risk-runtime-primary-blocker#high-risk-runtime-failure-class#engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class#engine-sidecar-redacted-runtime-status"
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
require_text "$PUBLIC_INTAKE" "Public Issue Dry-Run Contract"
require_text "$PUBLIC_INTAKE" "desktop_acceptance_status"
require_text "$PUBLIC_INTAKE" "high_risk_runtime_evidence_accepted"
require_text "$PUBLIC_INTAKE" "engine_sidecar_status_failure_class"
require_text "$PUBLIC_INTAKE" "Forbidden Public Intake"
require_text "$PUBLIC_INTAKE" "support bundles"
require_text "$PUBLIC_INTAKE" "Ask only for a private contact path."
require_text "$PUBLIC_INTAKE" "Use GitHub private vulnerability reporting when available."
require_text "$PUBLIC_INTAKE" "Public reports may include only:"
require_text "$PUBLIC_INTAKE" "Do not post:"

require_text "$PUBLIC_TRIAGE" "Ask for public support diagnostics only."
require_text "$PUBLIC_TRIAGE" "Public Issue Dry-Run"
require_text "$PUBLIC_TRIAGE" "desktop_acceptance_status"
require_text "$PUBLIC_TRIAGE" "high_risk_runtime_evidence_accepted"
require_text "$PUBLIC_TRIAGE" "engine_sidecar_status_failure_class"
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
require_text "$PUBLIC_TEMPLATE" "desktop_acceptance_status=not-claimed"
require_text "$PUBLIC_TEMPLATE" "high_risk_runtime_evidence_accepted=false"
require_text "$PUBLIC_TEMPLATE" "engine_sidecar_status_failure_class=none"
require_text "$PUBLIC_TEMPLATE" "screenshots of private room data"
require_text "$PUBLIC_TEMPLATE" "support bundles"
require_text "$PUBLIC_TEMPLATE" "private security contact request"
require_text "$SECURITY_TEMPLATE" "private contact path"
require_text "$SECURITY_TEMPLATE" "support bundles"

require_text "$DESKTOP_STATE" "PUBLIC_SUPPORT_DIAGNOSTICS_ALLOWED_FIELDS"
require_text "$DESKTOP_STATE" "PUBLIC_SUPPORT_DIAGNOSTICS_FORBIDDEN_FIELDS"
require_text "$DESKTOP_STATE_TEST" "allowed_public_intake_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness"
require_text "$DESKTOP_STATE_TEST" "high_risk_runtime_evidence_accepted=false"
require_text "$DESKTOP_STATE_TEST" "engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class"
require_text "$DESKTOP_STATE_TEST" "forbidden_public_intake_fields=$FORBIDDEN_FIELDS"
require_text "$PREFLIGHT" "real_user_test_allowed_fields=$ALLOWED_FIELDS"
require_text "$PREFLIGHT" "real_user_test_forbidden_fields=$FORBIDDEN_FIELDS"

allowed_dry_run="$(
  cat <<'EOF'
app_status=running
app_version=0.1.0
build_channel=beta-onion
build_commit=redacted-short
platform=macOS Apple Silicon unsigned DMG
checksum_result=pass
failure_class=engine-sidecar-unavailable
recovery_next_action=stay-on-manual-envelope
desktop_acceptance_status=not-claimed
desktop_acceptance_blockers=external-peer-evidence#audit#production-ready
app_launch_network=false
release_class_readiness=unsigned-public-beta
high_risk_runtime_evidence_source=absent
high_risk_runtime_evidence_accepted=false
high_risk_runtime_primary_blocker=high-risk-transport-runtime
high_risk_runtime_failure_class=runtime-evidence-missing
engine_sidecar_status_failure_class=sidecar-unavailable
engine_sidecar_manual_self_test_failure_class=manual-self-test-not-run
engine_sidecar_redacted_runtime_status=redacted
public_issue_evidence_class=support-triage-only
accepted_usability_evidence=false
accepted_field_evidence=false
accepted_high_risk_evidence=false
EOF
)"

for text in \
  "recovery_next_action=stay-on-manual-envelope" \
  "desktop_acceptance_status=not-claimed" \
  "high_risk_runtime_evidence_source=absent" \
  "high_risk_runtime_evidence_accepted=false" \
  "high_risk_runtime_failure_class=runtime-evidence-missing" \
  "engine_sidecar_status_failure_class=sidecar-unavailable" \
  "engine_sidecar_manual_self_test_failure_class=manual-self-test-not-run" \
  "engine_sidecar_redacted_runtime_status=redacted" \
  "public_issue_evidence_class=support-triage-only" \
  "accepted_usability_evidence=false" \
  "accepted_field_evidence=false" \
  "accepted_high_risk_evidence=false"; do
  require_output_text "$allowed_dry_run" "$text"
done

for text in \
  "raw_logs=" \
  "crash_dump=" \
  "screenshot=" \
  "onion_endpoint=" \
  "invite_code=" \
  "pairing_payload=" \
  "envelope_payload=" \
  "message_text=" \
  "local_path=" \
  "safety_phrase=" \
  "passphrase=" \
  "private_key=" \
  "support_bundle="; do
  reject_output_text "$allowed_dry_run" "$text"
done

reject_text "$PUBLIC_INTAKE" "paste raw logs"
reject_text "$PUBLIC_TRIAGE" "send crash dump"
reject_text "$PUBLIC_TEMPLATE" "Attach logs"
reject_text "$SECURITY_TEMPLATE" "Paste exploit details"

printf '%s\n' "status=public-support-incident-intake-ready"
printf '%s\n' "public_issue_intake=redacted-diagnostics-only"
printf '%s\n' "public_issue_dry_run=redacted-support-triage-only"
printf '%s\n' "private_vulnerability_intake=private-reporting-or-minimal-contact-request"
printf '%s\n' "public_support_allowed_fields=$ALLOWED_FIELDS"
printf '%s\n' "public_support_forbidden_fields=$FORBIDDEN_FIELDS"
printf '%s\n' "dry_run_recovery_next_action=stay-on-manual-envelope"
printf '%s\n' "dry_run_desktop_acceptance_status=not-claimed"
printf '%s\n' "dry_run_high_risk_runtime_evidence_accepted=false"
printf '%s\n' "dry_run_high_risk_runtime_failure_class=runtime-evidence-missing"
printf '%s\n' "dry_run_engine_sidecar_status_failure_class=sidecar-unavailable"
printf '%s\n' "dry_run_engine_sidecar_manual_self_test_failure_class=manual-self-test-not-run"
printf '%s\n' "dry_run_engine_sidecar_redacted_runtime_status=redacted"
printf '%s\n' "public_issue_accepted_usability_evidence=false"
printf '%s\n' "public_issue_accepted_field_evidence=false"
printf '%s\n' "public_issue_accepted_high_risk_evidence=false"
printf '%s\n' "raw_logs_requested=false"
printf '%s\n' "crash_dumps_requested=false"
printf '%s\n' "screenshots_requested=false"
printf '%s\n' "support_bundles_requested=false"
printf '%s\n' "production_ready_claim_allowed=false"
