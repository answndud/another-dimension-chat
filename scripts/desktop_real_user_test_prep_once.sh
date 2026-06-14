#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALLOWED_PUBLIC_INTAKE_FIELDS="app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness#high-risk-runtime-evidence-source#high-risk-runtime-evidence-accepted#high-risk-runtime-primary-blocker#high-risk-runtime-failure-class#engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class#engine-sidecar-redacted-runtime-status"
FORBIDDEN_PUBLIC_INTAKE_FIELDS="raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"
PUBLIC_INTAKE_POLICY_ALIGNMENT="app-diagnostics#github-issue-template#reference-policy"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop real-user test prep input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop real-user test prep text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop real-user test prep text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_FILES=(
  "$ROOT_DIR/apps/desktop-tauri/README.md"
  "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
)
TRIAGE="$ROOT_DIR/reference/PUBLIC_SUPPORT_TRIAGE.md"

ISSUE_FILES=(
  "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml"
  "$ROOT_DIR/.github/ISSUE_TEMPLATE/security_contact_request.yml"
)

for file in \
  "${PUBLIC_FILES[@]}" \
  "$TRIAGE" \
  "${ISSUE_FILES[@]}" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/main.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" \
  "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" \
  "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" \
  "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"; do
  require_file "$file"
done

for file in "${PUBLIC_FILES[@]}"; do
  require_text "$file" "Desktop Real-User Test Preparation Boundary"
  require_text "$file" "redacted public support diagnostics"
  require_text "$file" "failure class"
  require_text "$file" "recovery next action"
  require_text "$file" "Hold criteria"
  require_text "$file" "Abort criteria"
  require_text "$file" "no external two-machine success claim"
  require_text "$file" "raw logs"
  require_text "$file" "onion endpoints"
  require_text "$file" "invite codes"
  require_text "$file" "message text"
  require_text "$file" "local paths"
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  reject_text "$file" "real-user test proves external onion delivery"
  reject_text "$file" "real-user test proves production readiness"
  reject_text "$file" "real-user test proves security readiness"
  reject_text "$file" "real-user test allows sensitive communication"
  require_text "$file" "PUBLIC_SUPPORT_TRIAGE.md"
done

for file in "${ISSUE_FILES[@]}"; do
  require_text "$file" "Do not post"
  require_text "$file" "onion endpoints"
  require_text "$file" "invite codes"
  require_text "$file" "message text"
  require_text "$file" "local paths"
  require_text "$file" "raw logs"
  require_text "$file" "passphrases"
  require_text "$file" "key material"
done

require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "Public diagnostics only"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "Redacted description"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "allowed_public_intake_fields=$ALLOWED_PUBLIC_INTAKE_FIELDS"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "forbidden_public_intake_fields=$FORBIDDEN_PUBLIC_INTAKE_FIELDS"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "public_intake_policy_alignment=$PUBLIC_INTAKE_POLICY_ALIGNMENT"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "PUBLIC_SUPPORT_TRIAGE.md"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "macos-manual-allow"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "malformed-payload"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "replay-rejected"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "lifecycle-confirmation-required"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "desktop-state-drift"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml" "private security contact request"
require_text "$ROOT_DIR/.github/ISSUE_TEMPLATE/security_contact_request.yml" "private contact path"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "Allowed Public Intake"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "Forbidden Public Intake"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "allowed_public_intake_fields=$ALLOWED_PUBLIC_INTAKE_FIELDS"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "forbidden_public_intake_fields=$FORBIDDEN_PUBLIC_INTAKE_FIELDS"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "public_intake_policy_alignment=$PUBLIC_INTAKE_POLICY_ALIGNMENT"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "app version"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "build channel"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "build commit"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "platform"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "public support diagnostics copied from the app"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "failure class"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "redacted next action"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "desktop local-private-flow acceptance status"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "desktop local-private-flow blocker summary"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "Public Recovery Vocabulary"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "macos-manual-allow"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "desktop-state-drift"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "macos-gui-human-rehearsal-not-run"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "Maintainer Triage"

require_text "$TRIAGE" "Triage Routing Matrix"
require_text "$TRIAGE" "checksum-install-failure"
require_text "$TRIAGE" "macos-manual-allow"
require_text "$TRIAGE" "profile-locked"
require_text "$TRIAGE" "malformed-payload"
require_text "$TRIAGE" "replay-rejected"
require_text "$TRIAGE" "transport-unavailable"
require_text "$TRIAGE" "policy-blocked"
require_text "$TRIAGE" "lifecycle-confirmation-required"
require_text "$TRIAGE" "desktop-state-drift"
require_text "$TRIAGE" "macos-gui-human-rehearsal-not-run"
require_text "$TRIAGE" "unknown-redacted"
require_text "$TRIAGE" "needs-checksum-retry"
require_text "$TRIAGE" "needs-gatekeeper-recovery"
require_text "$TRIAGE" "needs-profile-recovery"
require_text "$TRIAGE" "needs-payload-retry-cancel"
require_text "$TRIAGE" "needs-lifecycle-confirmation"
require_text "$TRIAGE" "needs-private-security-contact"
require_text "$TRIAGE" "Do not ask for raw logs"
require_text "$TRIAGE" "Do not ask for external two-machine success evidence"
require_text "$TRIAGE" "Do not claim that manual envelope exchange"
require_text "$TRIAGE" "Do not tell users this beta is safe for sensitive communication"

require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "PUBLIC_SUPPORT_DIAGNOSTICS_ALLOWED_FIELDS"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "PUBLIC_SUPPORT_DIAGNOSTICS_FORBIDDEN_FIELDS"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "PUBLIC_SUPPORT_DIAGNOSTICS_POLICY_VERSION"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "PUBLIC_SUPPORT_DIAGNOSTICS_POLICY_ALIGNMENT"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "public_intake_policy_fields_aligned=true"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "allowed_public_intake_fields=\${publicSupportDiagnosticsAllowedFieldsValue()}"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "forbidden_public_intake_fields=\${publicSupportDiagnosticsForbiddenFieldsValue()}"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "failure_class="
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "recovery_next_action="
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "excluded_fields=\${publicSupportDiagnosticsExcludedFieldsValue()}"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "allowed_public_intake_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "forbidden_public_intake_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "public beta diagnostics keeps only support-safe status, build, failure class, and next action"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "excluded_fields=codes,endpoints,messages,profiles,paths,logs,crash_dumps,screenshots,passphrases,private_keys,key_material,private_planning_notes,support_bundles"
require_text "$ROOT_DIR/apps/desktop-tauri/src/main.js" "public diagnostics generated failure_class="
require_text "$ROOT_DIR/apps/desktop-tauri/src/main.js" "public_intake_policy_fields_aligned="
require_text "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" "public diagnostics summary includes desktop completion without production claims"

require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_real_user_test_prep_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_prep=redacted-intake-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_allowed_fields=$ALLOWED_PUBLIC_INTAKE_FIELDS"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_forbidden_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_external_success_claim=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_hold_criteria=missing-redacted-diagnostics#forbidden-private-data#network-before-explicit-action#checksum-mismatch"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_abort_criteria=secrets-exposed#raw-logs-requested#external-success-claim-requested#sensitive-use-requested"
require_text "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" "desktop_real_user_test_prep_once.sh"
require_text "$ROOT_DIR/scripts/public_claim_acceptance_once.sh" "desktop_real_user_test_prep_once.sh"

bash -n "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
bash -n "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"

echo "status=desktop-real-user-test-prep-source-ready"
echo "real_user_test_prep=redacted-intake-ready"
echo "real_user_test_allowed_fields=$ALLOWED_PUBLIC_INTAKE_FIELDS"
echo "real_user_test_forbidden_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"
echo "real_user_test_external_success_claim=false"
echo "real_user_test_production_ready_claim=false"
echo "real_user_test_sensitive_communication_allowed=false"
echo "real_user_test_hold_criteria=missing-redacted-diagnostics#forbidden-private-data#network-before-explicit-action#checksum-mismatch"
echo "real_user_test_abort_criteria=secrets-exposed#raw-logs-requested#external-success-claim-requested#sensitive-use-requested"
echo "next_development_axis=pairwise-onboarding-product-polish#default-practical-transport-boundary"
