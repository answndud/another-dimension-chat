#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/apps/desktop-tauri/README.md"
  "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
)

ISSUE_FILES=(
  "$ROOT_DIR/.github/ISSUE_TEMPLATE/public_beta_support.yml"
  "$ROOT_DIR/.github/ISSUE_TEMPLATE/security_contact_request.yml"
)

for file in \
  "${PUBLIC_FILES[@]}" \
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
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "Allowed Public Intake"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "Forbidden Public Intake"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "app version"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "build channel"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "build commit"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "platform"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "public support diagnostics copied from the app"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "failure class"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "redacted next action"

require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "failure_class="
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "recovery_next_action="
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "excluded_fields=codes,endpoints,messages,profiles,paths,logs,crash_dumps,screenshots,passphrases,key_material,private_planning_notes"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "public beta diagnostics keeps only support-safe status, build, failure class, and next action"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "excluded_fields=codes,endpoints,messages,profiles,paths,logs,crash_dumps,screenshots,passphrases,key_material,private_planning_notes"
require_text "$ROOT_DIR/apps/desktop-tauri/src/main.js" "public diagnostics generated failure_class="
require_text "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" "public diagnostics summary includes desktop completion without production claims"

require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_real_user_test_prep_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_prep=redacted-intake-ready"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_allowed_fields=app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#app-launch-network"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "real_user_test_forbidden_fields=raw-logs#endpoints#invite-codes#message-text#local-paths#payloads#passphrases#key-material#private-planning-notes"
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
echo "real_user_test_allowed_fields=app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#app-launch-network"
echo "real_user_test_forbidden_fields=raw-logs#endpoints#invite-codes#message-text#local-paths#payloads#passphrases#key-material#private-planning-notes"
echo "real_user_test_external_success_claim=false"
echo "real_user_test_production_ready_claim=false"
echo "real_user_test_sensitive_communication_allowed=false"
echo "real_user_test_hold_criteria=missing-redacted-diagnostics#forbidden-private-data#network-before-explicit-action#checksum-mismatch"
echo "real_user_test_abort_criteria=secrets-exposed#raw-logs-requested#external-success-claim-requested#sensitive-use-requested"
echo "next_development_axis=pairwise-onboarding-product-polish#default-practical-transport-boundary"
