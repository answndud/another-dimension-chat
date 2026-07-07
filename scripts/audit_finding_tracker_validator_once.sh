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

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TRACKER="reference/AUDIT_FINDING_TRACKER.md"
VALIDATOR="scripts/validate_audit_finding_tracker.mjs"
RUNBOOK="reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md"

for file in "$TRACKER" "$VALIDATOR" "$RUNBOOK"; do
  [ -f "$file" ] || fail "missing audit finding tracker validator input: $file"
done

must_contain "$RUNBOOK" "external_review_intake_runbook_available=true"
must_contain "$RUNBOOK" "audit_finding_tracker_schema_machine_checkable=true"
must_contain "$RUNBOOK" "sensitive_finding_private_route_required=true"
must_contain "$TRACKER" "audit_finding_tracker_schema_machine_checkable=true"
must_contain "$TRACKER" "audit_finding_counts_machine_checked=true"
must_contain "$TRACKER" "external_review_completed=false"
must_contain "$TRACKER" "audit_completed=false"
must_contain "$TRACKER" "audited_claim_allowed=false"
must_contain "$TRACKER" "security_ready_claimed=false"
must_contain "$VALIDATOR" "status=audit-finding-tracker-valid"
must_contain "$VALIDATOR" "forbidden-content"
must_contain "$VALIDATOR" "count-mismatch"

current_output="$(node "$VALIDATOR" "$TRACKER")"
printf '%s\n' "$current_output" | grep -Fq "status=audit-finding-tracker-valid" || fail "current tracker did not validate"
printf '%s\n' "$current_output" | grep -Fq "critical_findings_open=0" || fail "current tracker critical count drift"
printf '%s\n' "$current_output" | grep -Fq "high_findings_open=0" || fail "current tracker high count drift"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cat >"$tmp_dir/open-high.md" <<'TRACKER'
# Audit Finding Tracker

## Finding Table

| ID | Severity | Area | Public-safe summary | Decision | Status | Public wording impact |
| --- | --- | --- | --- | --- | --- | --- |
| AR-0001 | high | storage | Redacted storage lifecycle blocker. | hold | open | Keep not audited, not production-ready, and sensitive communication prohibited. |

## Current Counts

- critical_findings_open=0
- high_findings_open=1
- medium_findings_open=0
- low_findings_open=0
- informational_findings_open=0
- findings_fixed=0
- findings_held=1
- findings_waived=0
- external_review_completed=false
- audit_completed=false
- audited_claim_allowed=false
- security_ready_claimed=false
TRACKER

open_output="$(node "$VALIDATOR" "$tmp_dir/open-high.md")"
printf '%s\n' "$open_output" | grep -Fq "high_findings_open=1" || fail "open high tracker count not detected"

cat >"$tmp_dir/mismatch.md" <<'TRACKER'
# Audit Finding Tracker

## Finding Table

| ID | Severity | Area | Public-safe summary | Decision | Status | Public wording impact |
| --- | --- | --- | --- | --- | --- | --- |
| AR-0001 | high | storage | Redacted storage lifecycle blocker. | hold | open | Keep not audited, not production-ready, and sensitive communication prohibited. |

## Current Counts

- critical_findings_open=0
- high_findings_open=0
- medium_findings_open=0
- low_findings_open=0
- informational_findings_open=0
- findings_fixed=0
- findings_held=1
- findings_waived=0
- external_review_completed=false
- audit_completed=false
- audited_claim_allowed=false
- security_ready_claimed=false
TRACKER

if node "$VALIDATOR" "$tmp_dir/mismatch.md" >/tmp/audit-tracker-mismatch.out 2>&1; then
  fail "validator accepted mismatched high finding count"
fi
grep -Fq "count-mismatch:high_findings_open" /tmp/audit-tracker-mismatch.out || fail "count mismatch was not reported"

cat >"$tmp_dir/forbidden.md" <<'TRACKER'
# Audit Finding Tracker

## Finding Table

| ID | Severity | Area | Public-safe summary | Decision | Status | Public wording impact |
| --- | --- | --- | --- | --- | --- | --- |
| AR-0001 | high | protocol | ADENVSECRET payload leaked. | hold | open | Keep not audited, not production-ready, and sensitive communication prohibited. |

## Current Counts

- critical_findings_open=0
- high_findings_open=1
- medium_findings_open=0
- low_findings_open=0
- informational_findings_open=0
- findings_fixed=0
- findings_held=1
- findings_waived=0
- external_review_completed=false
- audit_completed=false
- audited_claim_allowed=false
- security_ready_claimed=false
TRACKER

if node "$VALIDATOR" "$tmp_dir/forbidden.md" >/tmp/audit-tracker-forbidden.out 2>&1; then
  fail "validator accepted forbidden payload marker"
fi
grep -Fq "forbidden-content:envelope-payload" /tmp/audit-tracker-forbidden.out || fail "forbidden payload was not reported"

cat <<'STATUS'
status=audit-finding-tracker-validator-ready
audit_finding_tracker_schema_machine_checkable=true
audit_finding_counts_machine_checked=true
external_review_completed=false
audit_completed=false
audited_claim_allowed=false
security_ready_claimed=false
STATUS
