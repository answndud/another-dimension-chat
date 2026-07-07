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
    fail "$file contains forbidden claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROCESS="reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md"
TABLETOP="reference/INCIDENT_TABLETOP_RECORD.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
GATE="reference/PRODUCTION_READINESS_CLAIM_GATE.md"

for file in "$PROCESS" "$TABLETOP" "$PACKET" "$GATE" \
  "README.md" "SECURITY.md" \
  ".github/ISSUE_TEMPLATE/config.yml" \
  ".github/ISSUE_TEMPLATE/public_beta_support.yml" \
  ".github/ISSUE_TEMPLATE/security_contact_request.yml" \
  ".github/PULL_REQUEST_TEMPLATE.md" \
  "reference/PUBLIC_INTAKE_POLICY.md" \
  "reference/PUBLIC_SUPPORT_TRIAGE.md" \
  "reference/UPDATE_INTEGRITY.md" \
  "reference/SUPPLY_CHAIN_BASELINE.md" \
  "reference/DEPENDENCY_INVENTORY.md"; do
  [ -f "$file" ] || fail "missing required operational input: $file"
done

must_contain "$PROCESS" "operational_support_incident_process_reviewed=true"
must_contain "$PROCESS" "private_vulnerability_reporting_defined=true"
must_contain "$PROCESS" "public_support_intake_defined=true"
must_contain "$PROCESS" "incident_response_tabletop_completed=true"
must_contain "$PROCESS" "support_template_review_completed=true"
must_contain "$PROCESS" "emergency_release_update_path_defined=true"
must_contain "$PROCESS" "release_rollback_guidance_defined=true"
must_contain "$PROCESS" "dependency_vulnerability_triage_defined=true"
must_contain "$PROCESS" "key_compromise_guidance_defined=true"
must_contain "$PROCESS" "telemetry_default_upload_enabled=false"
must_contain "$PROCESS" "crash_upload_default_enabled=false"
must_contain "$PROCESS" "raw_log_request_allowed=false"
must_contain "$PROCESS" "production_operational_readiness_claim_allowed=false"
must_contain "$PROCESS" "security_ready_claimed=false"
must_contain "$PROCESS" "sensitive_communication_allowed=false"
must_contain "$PROCESS" "next_required_phase=OPS-10 stable macOS v1.0 release gate"

must_contain "$TABLETOP" "incident_tabletop_completed=true"
must_contain "$TABLETOP" "support_template_review_completed=true"
must_contain "$TABLETOP" "public_private_intake_split_verified=true"
must_contain "$TABLETOP" "private_data_publication_response_defined=true"
must_contain "$TABLETOP" "release_integrity_incident_response_defined=true"
must_contain "$TABLETOP" "dependency_vulnerability_response_defined=true"
must_contain "$TABLETOP" "key_compromise_response_defined=true"
must_contain "$TABLETOP" "claim_drift_response_defined=true"
must_contain "$TABLETOP" "telemetry_default_upload_enabled=false"
must_contain "$TABLETOP" "crash_upload_default_enabled=false"
must_contain "$TABLETOP" "raw_log_request_allowed=false"
must_contain "$TABLETOP" "production_operational_readiness_claim_allowed=false"

must_contain "README.md" "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md"
must_contain "README.md" "reference/INCIDENT_TABLETOP_RECORD.md"
must_contain "SECURITY.md" "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md"
must_contain "SECURITY.md" "reference/INCIDENT_TABLETOP_RECORD.md"
must_contain "$PACKET" "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md"
must_contain "$PACKET" "reference/INCIDENT_TABLETOP_RECORD.md"
must_contain "$GATE" "ops_9_operational_support_incident_process_reviewed=true"
must_contain "$GATE" "incident_response_tabletop_completed=true"
must_contain "$GATE" "support_template_review_completed=true"
must_contain "$GATE" "production_operational_readiness_claim_allowed=false"
must_contain "$GATE" "ops_10_stable_macos_v1_release_gate_reviewed=true"

must_contain ".github/ISSUE_TEMPLATE/config.yml" "private vulnerability reporting"
must_contain ".github/ISSUE_TEMPLATE/public_beta_support.yml" "Do not post bridge lines"
must_contain ".github/ISSUE_TEMPLATE/security_contact_request.yml" "private contact path"
must_contain ".github/PULL_REQUEST_TEMPLATE.md" "No external peer report or independent review evidence was fabricated."
must_contain "reference/PUBLIC_INTAKE_POLICY.md" "Use GitHub private vulnerability reporting when available."
must_contain "reference/PUBLIC_SUPPORT_TRIAGE.md" "Do not ask for raw logs"
must_contain "reference/UPDATE_INTEGRITY.md" "does not provide auto-update"
must_contain "reference/SUPPLY_CHAIN_BASELINE.md" "vulnerability triage signoff"
must_contain "reference/DEPENDENCY_INVENTORY.md" "Vulnerability triage signoff complete: false"

for file in "$PROCESS" "$TABLETOP" "$PACKET" "$GATE" "README.md" "SECURITY.md"; do
  must_not_match "$file" "telemetry_default_upload_enabled=true"
  must_not_match "$file" "crash_upload_default_enabled=true"
  must_not_match "$file" "raw_log_request_allowed=true"
  must_not_match "$file" "production_operational_readiness_claim_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
done

scripts/desktop_real_user_test_prep_once.sh >/dev/null

cat <<'STATUS'
status=operational-support-incident-process-ready
operational_support_incident_process_reviewed=true
private_vulnerability_reporting_defined=true
public_support_intake_defined=true
incident_response_tabletop_completed=true
support_template_review_completed=true
emergency_release_update_path_defined=true
release_rollback_guidance_defined=true
dependency_vulnerability_triage_defined=true
key_compromise_guidance_defined=true
telemetry_default_upload_enabled=false
crash_upload_default_enabled=false
raw_log_request_allowed=false
production_operational_readiness_claim_allowed=false
security_ready_claimed=false
sensitive_communication_allowed=false
next_required_phase=OPS-10-stable-macos-v1.0-release-gate
STATUS
